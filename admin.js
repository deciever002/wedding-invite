const form = document.querySelector("#invite-form");
const guestField = document.querySelector("#guest-name");
const baseField = document.querySelector("#base-url");
const result = document.querySelector("#invite-result");
const linkOutput = document.querySelector("#guest-link");
const messageOutput = document.querySelector("#invite-message");
const copyStatus = document.querySelector("#copy-status");
const groomSide = document.querySelector("#side-groom");
const brideSide = document.querySelector("#side-bride");
const schedule = document.querySelector("#sukhmani-schedule");
let inviteUrl = "";
let inviteMessage = "";

const fields = {
  janeu: document.querySelector("#event-janeu"),
  sukhmani: document.querySelector("#event-sukhmani"),
  haldi: document.querySelector("#event-haldi"),
  sangeet: document.querySelector("#event-sangeet"),
  baarat: document.querySelector("#event-baarat"),
  reception: document.querySelector("#event-reception"),
};

const celebrations = {
  janeu: {
    emoji: "🪔",
    title: "Janeu Ceremony",
    date: "19th November",
    time: "10:00 AM onwards",
    venue: "Rihayash Apartment, Rajnagar, Nagpur",
    mapUrl: "https://maps.google.com/?q=Rihayash+Apartment+Rajnagar+Nagpur",
  },
  haldi: {
    emoji: "🌼",
    title: "Haldi Carnival",
    date: "20th November",
    time: "11:00 AM onwards",
    venue: "Signature Resorts, Nagpur",
    mapUrl: "https://maps.google.com/?q=Signature+Resorts+Surabardi+Road+Nagpur",
  },
  sangeet: {
    emoji: "🎶",
    title: "Sangeet Ceremony",
    date: "20th November",
    time: "7:00 PM onwards",
    venue: "Dublin, Nagpur",
    mapUrl: "https://maps.google.com/?q=Dublin+Nagpur",
  },
  baarat: {
    emoji: "🐎",
    title: "Baarat",
    date: "21st November",
    time: "10:00 AM onwards",
    venue: "Signature Resorts, Nagpur",
    mapUrl: "https://maps.google.com/?q=Signature+Resorts+Surabardi+Road+Nagpur",
  },
  reception: {
    emoji: "✨",
    title: "Wedding Reception",
    date: "21st November",
    time: "7:00 PM onwards",
    venue: "Dublin, Nagpur",
    mapUrl: "https://maps.google.com/?q=Dublin+Nagpur",
  },
};

const eventCodes = { janeu: "j", sukhmani: "p", haldi: "h", sangeet: "n", baarat: "b", reception: "r" };
const DEFAULT_PAATH_DATE = "19th November 2026";
const DEFAULT_PAATH_TIME = "5:30 PM onwards";
const DEFAULT_PAATH_VENUE = "At Our Residence (Civil Lines)";
const DEFAULT_PAATH_MAP_URL = "https://goo.gl/maps/ggq18AmDZNJyb4Kn8?g_st=aw";

function videoBuilderUrl(base, guest, side, eventKeys) {
  const destination = new URL("video-studio.html", base);
  destination.searchParams.set("g", guest || "Friends & Family");
  destination.searchParams.set("s", side === "bride" ? "b" : "g");
  destination.searchParams.set("e", eventKeys.map(key => eventCodes[key]).join(""));
  if (eventKeys.includes("sukhmani")) {
    for (const [fieldId, param] of [["sukhmani-date", "d"], ["sukhmani-time", "t"], ["sukhmani-venue", "v"]]) {
      const value = document.querySelector(`#${fieldId}`).value.trim();
      if (value) destination.searchParams.set(param, value);
    }
  }
  return destination;
}

function setSide(side) {
  groomSide.checked = side === "groom";
  brideSide.checked = side === "bride";
  document.querySelector('[data-side-option="groom"]').hidden = side !== "groom";
  document.querySelector('[data-side-option="bride"]').hidden = side !== "bride";
  fields.janeu.checked = side === "groom";
  fields.sukhmani.checked = side === "bride";
  updateScheduleVisibility();
}

function currentSide() {
  return brideSide.checked ? "bride" : "groom";
}

function updateScheduleVisibility() {
  schedule.hidden = currentSide() !== "bride" || !fields.sukhmani.checked;
}

groomSide.addEventListener("change", () => {
  if (groomSide.checked) setSide("groom");
  else if (!brideSide.checked) setSide("groom");
});
brideSide.addEventListener("change", () => {
  if (brideSide.checked) setSide("bride");
  else if (!groomSide.checked) setSide("bride");
});
fields.sukhmani.addEventListener("change", updateScheduleVisibility);

form.addEventListener("submit", event => {
  event.preventDefault();
  const guest = guestField.value.trim().replace(/\s+/g, " ");
  if (!guest) {
    guestField.focus();
    return;
  }

  const side = currentSide();
  const eventKeys = Object.entries(fields).filter(([, field]) => field.checked).map(([key]) => key);
  if (!eventKeys.length) {
    copyStatus.textContent = "Select at least one celebration for this invitation.";
    return;
  }

  try {
    const destination = new URL(baseField.value.trim());
    for (const key of ["guest", "side", "events", "sukhmaniDate", "sukhmaniTime", "sukhmaniVenue", "g", "s", "e", "d", "t", "v"]) {
      destination.searchParams.delete(key);
    }
    destination.searchParams.set("g", guest);
    destination.searchParams.set("s", side === "bride" ? "b" : "g");
    destination.searchParams.set("e", eventKeys.map(key => eventCodes[key]).join(""));

    if (eventKeys.includes("sukhmani")) {
      const paathDate = document.querySelector("#sukhmani-date").value.trim();
      const paathTime = document.querySelector("#sukhmani-time").value.trim();
      const paathVenue = document.querySelector("#sukhmani-venue").value.trim();
      if (paathDate && paathDate !== DEFAULT_PAATH_DATE) destination.searchParams.set("d", paathDate);
      if (paathTime && paathTime !== DEFAULT_PAATH_TIME) destination.searchParams.set("t", paathTime);
      if (paathVenue && paathVenue !== DEFAULT_PAATH_VENUE) destination.searchParams.set("v", paathVenue);
    }
    inviteUrl = destination.toString();
    const videoDestination = videoBuilderUrl(destination, guest, side, eventKeys);
    document.querySelector("#video-builder-link").href = videoDestination.toString();
  } catch {
    copyStatus.textContent = "Enter a valid invitation website URL first.";
    baseField.focus();
    return;
  }

  const chosen = eventKeys.map(key => {
    if (key !== "sukhmani") return celebrations[key];
    const date = document.querySelector("#sukhmani-date").value.trim() || DEFAULT_PAATH_DATE;
    const time = document.querySelector("#sukhmani-time").value.trim() || DEFAULT_PAATH_TIME;
    const venue = document.querySelector("#sukhmani-venue").value.trim() || DEFAULT_PAATH_VENUE;
    const mapUrl = venue === DEFAULT_PAATH_VENUE ? DEFAULT_PAATH_MAP_URL : `https://maps.google.com/?q=${encodeURIComponent(venue)}`;
    return { emoji: "🙏", title: "Sukhmani Sahib Paath", date, time, venue, mapUrl };
  });

  const eventList = chosen.map(item => `${item.emoji} *${item.title}*\n📅 ${item.date} · ${item.time}\n📍 ${item.venue}\n🗺 ${item.mapUrl}`).join("\n\n");
  inviteMessage = `💌 *A personal invitation for ${guest}*\n\n*Dear ${guest},*\n\nWith immense joy, we invite you to celebrate the beautiful beginning of *Ria & Manas’s* new journey together. Your presence, love, and blessings will make these special moments even more memorable.\n\n✨ *WEDDING CELEBRATIONS* ✨\n\n${eventList}\n\nWith love,\n*Ria & Manas*`;
  linkOutput.href = inviteUrl;
  linkOutput.textContent = inviteUrl;
  document.querySelector("#open-link").href = inviteUrl;
  messageOutput.value = inviteMessage;
  result.hidden = false;
  copyStatus.textContent = "Personal invitation created with the selected celebrations.";
  result.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
});

document.querySelector("#standalone-video-link").addEventListener("click", event => {
  const videoStatus = document.querySelector("#video-status");
  const guest = guestField.value.trim().replace(/\s+/g, " ");
  const side = currentSide();
  const eventKeys = Object.entries(fields).filter(([, field]) => field.checked).map(([key]) => key);
  if (!eventKeys.length) {
    event.preventDefault();
    videoStatus.textContent = "Select at least one celebration for this video.";
    return;
  }
  try {
    const base = new URL(baseField.value.trim());
    event.currentTarget.href = videoBuilderUrl(base, guest, side, eventKeys).toString();
    videoStatus.textContent = `Opening a video studio for ${eventKeys.length} selected function${eventKeys.length === 1 ? "" : "s"}.`;
  } catch {
    event.preventDefault();
    videoStatus.textContent = "Enter a valid invitation website URL first.";
    baseField.focus();
  }
});

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  messageOutput.value = text;
  messageOutput.focus();
  messageOutput.select();
  if (!document.execCommand("copy")) throw new Error("Clipboard unavailable");
}

document.querySelector("#copy-message").addEventListener("click", async () => {
  if (!inviteMessage) return;
  try {
    await copyText(inviteMessage);
    copyStatus.textContent = "WhatsApp message copied. The invitation link is available separately above.";
  } catch {
    copyStatus.textContent = "Select the message above and copy it.";
  }
});

document.querySelector("#copy-link").addEventListener("click", async () => {
  if (!inviteUrl) return;
  try {
    await copyText(inviteUrl);
    copyStatus.textContent = "Invitation link copied.";
  } catch {
    copyStatus.textContent = "The link is shown above; select and copy it.";
  }
});
