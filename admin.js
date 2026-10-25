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
    title: "Janeu Ceremony",
    details: "19th November\n10:00 AM onwards · Rihayash, Rajnagar, Nagpur",
    map: "https://www.google.com/maps/search/?api=1&query=Rihayash+Rajnagar+Nagpur",
  },
  haldi: {
    title: "Haldi Carnival",
    details: "20th November\n11:00 AM onwards · Dublin, Nagpur",
    map: "https://www.google.com/maps/search/?api=1&query=Dublin+Nagpur",
  },
  sangeet: {
    title: "Sangeet Ceremony",
    details: "20th November\n7:00 PM onwards · Dublin, Nagpur",
    map: "https://www.google.com/maps/search/?api=1&query=Dublin+Nagpur",
  },
  baarat: {
    title: "Baarat",
    details: "21st November\n10:00 AM onwards · Signature Resorts, Nagpur",
    map: "https://www.google.com/maps/search/?api=1&query=Signature+Resorts+Surabardi+Road+Nagpur",
  },
  reception: {
    title: "Wedding Reception",
    details: "21st November\n7:00 PM onwards · Signature Resorts, Nagpur",
    map: "https://www.google.com/maps/search/?api=1&query=Signature+Resorts+Surabardi+Road+Nagpur",
  },
};

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
    destination.searchParams.set("guest", guest);
    destination.searchParams.set("side", side);
    destination.searchParams.set("events", eventKeys.join(","));

    const scheduleValues = {
      sukhmaniDate: document.querySelector("#sukhmani-date").value.trim(),
      sukhmaniTime: document.querySelector("#sukhmani-time").value.trim(),
      sukhmaniVenue: document.querySelector("#sukhmani-venue").value.trim(),
    };
    for (const [key, value] of Object.entries(scheduleValues)) {
      if (value) destination.searchParams.set(key, value);
      else destination.searchParams.delete(key);
    }
    inviteUrl = destination.toString();
  } catch {
    copyStatus.textContent = "Enter a valid invitation website URL first.";
    baseField.focus();
    return;
  }

  const chosen = eventKeys.map(key => {
    if (key !== "sukhmani") return celebrations[key];
    const date = document.querySelector("#sukhmani-date").value.trim() || "19th November 2026";
    const time = document.querySelector("#sukhmani-time").value.trim() || "Time to follow";
    const venue = document.querySelector("#sukhmani-venue").value.trim() || "Venue to follow";
    const map = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue === "Venue to follow" ? "Nagpur" : venue)}`;
    return { title: "Sukhmani Sahib Paath", details: `${date}\n${time} · ${venue}`, map };
  });

  const eventList = chosen.map(item => `${item.title}\n${item.details}\nMaps: ${item.map}`).join("\n\n");
  inviteMessage = `Dear ${guest},\n\nWith immense joy, we invite you to celebrate the beautiful beginning of Ria and Manas’s new journey together. Your presence, love, and blessings will make these special moments even more memorable.\n\nRIAANDMANAS WEDDING CELEBRATIONS\n\n${eventList}\n\nOpen your personal invitation: ${inviteUrl}\n\nWith love,\nRia & Manas`;
  linkOutput.href = inviteUrl;
  linkOutput.textContent = inviteUrl;
  document.querySelector("#open-link").href = inviteUrl;
  messageOutput.value = inviteMessage;
  result.hidden = false;
  copyStatus.textContent = "Personal invitation created with the selected celebrations.";
  result.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
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
    copyStatus.textContent = "Complete message and invitation link copied.";
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
