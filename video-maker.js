const params = new URLSearchParams(location.search);
const canvas = document.querySelector("#film-canvas");
const ctx = canvas.getContext("2d", { alpha: false });
const titleBackdrop = new Image();
let titleBackdropReady = false;
const titleBackdropLoaded = new Promise(resolve => {
  titleBackdrop.onload = () => { titleBackdropReady = true; resolve(true); };
  titleBackdrop.onerror = () => resolve(false);
  titleBackdrop.src = "assets/images/wedding-title-backdrop.png";
});
const filmFontsReady = document.fonts
  ? Promise.all([document.fonts.load('700 48px "Playfair Display"'), document.fonts.load('500 12px "DM Mono"')])
  : Promise.resolve();
const SERIF = '"Playfair Display", Georgia, serif';
const MONO = '"DM Mono", "Courier New", monospace';
const statusLine = document.querySelector("#maker-status");
const progressFill = document.querySelector("#maker-progress-fill");
const createButton = document.querySelector("#create-film");
const downloadSection = document.querySelector("#maker-download");
const audioChoice = document.querySelector("#include-music");
const W = canvas.width;
const H = canvas.height;
const FPS = 30;
const INTRO_SECONDS = 7;
const DETAIL_SECONDS = 5;
const CLOSING_SECONDS = 4.5;
const codes = { j: "janeu", p: "sukhmani", h: "haldi", n: "sangeet", b: "baarat", r: "reception" };
const eventCodes = Object.fromEntries(Object.entries(codes).map(([code, key]) => [key, code]));
const PUBLIC_INVITATION_URL = "https://riawedsmanas.github.io/wedding-invite/";
const DEFAULT_PAATH_DATE = "19th November 2026";
const DEFAULT_PAATH_TIME = "5:30 PM onwards";
const DEFAULT_PAATH_VENUE = "At Our Residence (Civil Lines)";
const DEFAULT_PAATH_MAP_URL = "https://goo.gl/maps/ggq18AmDZNJyb4Kn8?g_st=aw";
const messageMaps = {
  janeu: "https://maps.google.com/?q=Rihayash+Apartment+Rajnagar+Nagpur",
  haldi: "https://maps.google.com/?q=Signature+Resorts+Surabardi+Road+Nagpur",
  sangeet: "https://maps.google.com/?q=Dublin+Nagpur",
  baarat: "https://maps.google.com/?q=Signature+Resorts+Surabardi+Road+Nagpur",
  reception: "https://maps.google.com/?q=Dublin+Nagpur",
};
const messageEmojis = { janeu: "🪔", sukhmani: "🙏", haldi: "🌼", sangeet: "🎶", baarat: "🐎", reception: "✨" };
const defaults = ["janeu", "haldi", "sangeet", "baarat", "reception"];
const brideDefaults = ["sukhmani", "haldi", "sangeet", "baarat", "reception"];
let side = params.get("s") === "b" || params.get("s") === "bride" ? "bride" : "groom";
const guestField = document.querySelector("#film-guest");
const sideGroom = document.querySelector("#film-side-groom");
const sideBride = document.querySelector("#film-side-bride");
const selectionPanel = document.querySelector("#video-selection");
const paathSchedule = document.querySelector("#film-paath-schedule");
const paathDateField = document.querySelector("#film-paath-date");
const paathTimeField = document.querySelector("#film-paath-time");
const paathVenueField = document.querySelector("#film-paath-venue");
const fields = {
  janeu: document.querySelector("#film-event-janeu"),
  sukhmani: document.querySelector("#film-event-sukhmani"),
  haldi: document.querySelector("#film-event-haldi"),
  sangeet: document.querySelector("#film-event-sangeet"),
  baarat: document.querySelector("#film-event-baarat"),
  reception: document.querySelector("#film-event-reception"),
};
const rawGuest = (params.get("g") || "").trim().slice(0, 100);
guestField.value = rawGuest === "Friends & Family" ? "" : rawGuest;
const requested = params.has("e") ? [...(params.get("e") || "")].map(code => codes[code]).filter(Boolean) : null;
const paathDate = params.get("d") || "19th November 2026";
const paathTime = params.get("t") || "5:30 PM onwards";
const paathVenue = params.get("v") || "At Our Residence (Civil Lines)";
paathDateField.value = paathDate;
paathTimeField.value = paathTime;
paathVenueField.value = paathVenue;
sideGroom.checked = side === "groom";
sideBride.checked = side === "bride";

const requestedKeys = requested === null
  ? new Set(side === "bride" ? brideDefaults : defaults)
  : new Set(requested);
for (const [key, field] of Object.entries(fields)) field.checked = requestedKeys.has(key);
if (side === "groom") fields.sukhmani.checked = false;
else fields.janeu.checked = false;

const events = {
  janeu: { title: "Janeu Ceremony", date: "19th November 2026", time: "10:00 AM onwards", venue: "Rihayash Apartment, Rajnagar, Nagpur", source: "assets/events/janeu.mp4", poster: "assets/events/janeu.jpg", tone: "A SACRED THREAD · A NEW CHAPTER" },
  sukhmani: { title: "Sukhmani Sahib Paath", date: paathDate, time: paathTime, venue: paathVenue, source: "assets/events/sukhmani-paath.mp4", poster: "assets/events/sukhmani-paath.png", tone: "A PRAYER FOR PEACE · A BLESSED BEGINNING" },
  haldi: { title: "Haldi Carnival", date: "20th November 2026", time: "11:00 AM onwards", venue: "Signature Resorts, Nagpur", source: "assets/events/haldi-carnival.mp4", poster: "assets/events/haldi-carnival.jpg", tone: "COLOUR, CHAOS & JOY" },
  sangeet: { title: "Sangeet Ceremony", date: "20th November 2026", time: "7:00 PM onwards", venue: "Dublin, Nagpur", source: "assets/events/sangeet.mp4", poster: "assets/events/sangeet.jpg", tone: "ONE FLOOR · ALL HEART" },
  baarat: { title: "Baarat", date: "21st November 2026", time: "10:00 AM onwards", venue: "Signature Resorts, Nagpur", source: "assets/events/baarat.mp4", poster: "assets/events/baarat.jpg", tone: "THE GRAND PROCESSION" },
  reception: { title: "Wedding Reception", date: "21st November 2026", time: "7:00 PM onwards", venue: "Dublin, Nagpur", source: "assets/events/reception.mp4", poster: "assets/events/reception.jpg", tone: "A NIGHT TO REMEMBER" },
};
let filmEvents = [];
let selectionVersion = 0;
let studioPreviewStarted = performance.now();
let filmIsRendering = false;
const eventPosterCache = new Map();
function resetStudioPreview() { studioPreviewStarted = performance.now(); }
function currentGuest() {
  return guestField.value.trim().replace(/\s+/g, " ") || "Friends & Family";
}

function updateGuestGreeting() {
  const guest = currentGuest();
  document.querySelector("#maker-greeting").textContent = guest === "Friends & Family"
    ? "A continuous invitation assembled from the selected celebration scenes."
    : `A continuous invitation created especially for ${guest}.`;
}

function updateSideControls() {
  document.querySelector('[data-side-option="groom"]').hidden = side !== "groom";
  document.querySelector('[data-side-option="bride"]').hidden = side !== "bride";
  paathSchedule.hidden = side !== "bride" || !fields.sukhmani.checked;
}

function selectedFilmEvents() {
  const date = paathDateField.value.trim() || "19th November 2026";
  const time = paathTimeField.value.trim() || "5:30 PM onwards";
  const venue = paathVenueField.value.trim() || "At Our Residence (Civil Lines)";
  return Object.entries(fields)
    .filter(([, field]) => field.checked)
    .map(([key]) => ({ key, ...events[key], ...(key === "sukhmani" ? { date, time, venue } : {}) }));
}

function renderEventList() {
  const eventList = document.querySelector("#maker-event-list");
  eventList.replaceChildren(...filmEvents.map(item => {
    const li = document.createElement("li");
    li.textContent = `${item.title} · ${item.date}`;
    return li;
  }));
}

function updatePaathDetails() {
  filmEvents = selectedFilmEvents();
  renderEventList();
  clearGeneratedVideo();
  updateWhatsAppMessage();
  if (clipsReady) statusLine.textContent = `Ready · ${filmEvents.length} function${filmEvents.length === 1 ? "" : "s"} selected · approximately ${formatDuration(totalDuration)}`;
}

function makeInvitationUrl() {
  const base = new URL(PUBLIC_INVITATION_URL);
  const destination = new URL("index.html", base);
  const guest = guestField.value.trim().replace(/\s+/g, " ");
  if (guest) destination.searchParams.set("g", guest);
  destination.searchParams.set("s", side === "bride" ? "b" : "g");
  destination.searchParams.set("e", filmEvents.map(event => eventCodes[event.key]).join(""));
  const paath = filmEvents.find(event => event.key === "sukhmani");
  if (paath) {
    if (paath.date !== DEFAULT_PAATH_DATE) destination.searchParams.set("d", paath.date);
    if (paath.time !== DEFAULT_PAATH_TIME) destination.searchParams.set("t", paath.time);
    if (paath.venue !== DEFAULT_PAATH_VENUE) destination.searchParams.set("v", paath.venue);
  }
  return destination.toString();
}

function mapUrlFor(event) {
  if (event.key !== "sukhmani") return messageMaps[event.key] || "";
  return event.venue === DEFAULT_PAATH_VENUE
    ? DEFAULT_PAATH_MAP_URL
    : `https://maps.google.com/?q=${encodeURIComponent(event.venue)}`;
}

function updateWhatsAppMessage() {
  const output = document.querySelector("#maker-message-text");
  const copyButton = document.querySelector("#copy-maker-message");
  const status = document.querySelector("#maker-message-status");
  if (!output || !copyButton || !status) return;
  if (!filmEvents.length) {
    output.value = "Select at least one function to generate the WhatsApp invitation.";
    copyButton.disabled = true;
    status.textContent = "Choose one or more functions above.";
    return;
  }
  const guest = currentGuest();
  const isGeneric = guest === "Friends & Family";
  const eventList = filmEvents.map(event => {
    const date = event.date.replace(/\s+2026$/, "");
    return `${messageEmojis[event.key] || "✨"} *${event.title}*\n📅 ${date} · ${event.time}\n📍 ${event.venue}\n🗺️ ${mapUrlFor(event)}`;
  }).join("\n\n");
  const heading = isGeneric ? "A wedding invitation for our family and friends" : `A personal invitation for ${guest}`;
  output.value = `${makeInvitationUrl()}\n\n💌 *${heading}*\n\n*Dear ${guest},*\n\nWith immense joy, we invite you to celebrate the beautiful beginning of *Ria & Manas’s* new journey together. Your presence, love, and blessings will make these special moments even more memorable.\n\n✨ *WEDDING CELEBRATIONS* ✨\n\n${eventList}\n\nWith love,\n*Ria & Manas*`;
  copyButton.disabled = false;
  status.textContent = "Ready to copy · invitation link first, with a map link for every selected function.";
}

updateGuestGreeting();
updateSideControls();
function formatDuration(seconds) {
  const rounded = Math.ceil(seconds);
  return rounded < 60 ? `${rounded} sec` : `${Math.floor(rounded / 60)} min ${rounded % 60} sec`;
}
document.querySelector("#estimate").textContent = formatDuration(INTRO_SECONDS * 2 + CLOSING_SECONDS + filmEvents.length * (6 + DETAIL_SECONDS));

const audio = new Audio();
audio.crossOrigin = "anonymous";
audio.src = "assets/audio/wedding-track.mp3";
audio.preload = "auto";
audio.loop = true;
let generatedObjectUrl = "";
let sharedAudioContext;
let sharedAudioSource;
const preparedClips = new Map();
let totalDuration = INTRO_SECONDS * 2 + CLOSING_SECONDS + filmEvents.length * (6 + DETAIL_SECONDS);
let clipsReady = false;

function paintCard(time = 0) {
  const t = time * 1000;
  if (titleBackdropReady) {
    ctx.drawImage(titleBackdrop, 0, 0, W, H);
    ctx.fillStyle = "rgba(24,12,25,.19)"; ctx.fillRect(0, 0, W, H);
  } else {
    const gradient = ctx.createLinearGradient(0, 0, W, H);
    gradient.addColorStop(0, "#342138"); gradient.addColorStop(.48, "#180f1c"); gradient.addColorStop(1, "#2b1925");
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, W, H);
    const glowX = W * (.5 + Math.sin(t * .00022) * .13);
    const glow = ctx.createRadialGradient(glowX, H * .4, 10, glowX, H * .43, H * .66);
    glow.addColorStop(0, "rgba(218,171,104,.19)"); glow.addColorStop(.45, "rgba(134,75,88,.08)"); glow.addColorStop(1, "rgba(205,160,92,0)");
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
  }

  // A few warm glints drift over the floral artwork.
  for (let i = 0; i < 17; i += 1) {
    const x = (i * 173 + Math.sin(t * .0007 + i * 4) * 25 + W) % W;
    const y = (i * 271 - t * (.012 + (i % 3) * .004) + H * 2) % H;
    const pulse = .12 + (Math.sin(t * .002 + i * 2) + 1) * .12;
    ctx.fillStyle = `rgba(247,220,167,${pulse})`;
    ctx.beginPath(); ctx.arc(x, y, i % 5 === 0 ? 2.1 : 1.15, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = "rgba(245,220,175,.45)"; ctx.lineWidth = 1; ctx.strokeRect(20, 20, W - 40, H - 40);
  ctx.strokeStyle = "rgba(245,220,175,.18)"; ctx.strokeRect(28, 28, W - 56, H - 56);
}

function centerText(text, y, font, color = "#f2dcaa", maxWidth = W - 120) {
  ctx.fillStyle = color; ctx.font = font; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(text, W / 2, y, maxWidth);
}

function coverCard(time = 0) {
  const guest = currentGuest();
  const t = Math.max(0, Math.min(1, time / 2.25));
  const eased = 1 - (1 - t) ** 3;
  paintCard(time);

  // The invitation rises from an illustrated envelope while its wax seal glows.
  const paperY = 650 - eased * 410;
  ctx.save(); ctx.shadowColor = "rgba(0,0,0,.42)"; ctx.shadowBlur = 34; ctx.shadowOffsetY = 18;
  ctx.fillStyle = "#f5eddc"; ctx.beginPath(); ctx.roundRect(76, paperY, W - 152, 640, 10); ctx.fill();
  ctx.restore();
  ctx.fillStyle = "rgba(127,91,70,.13)"; ctx.fillRect(102, paperY + 24, W - 204, 1);
  ctx.strokeStyle = "rgba(163,123,77,.28)"; ctx.lineWidth = 1; ctx.strokeRect(96, paperY + 17, W - 192, 606);

  // Envelope body and folding edges.
  ctx.fillStyle = "#d6b98e"; ctx.beginPath(); ctx.moveTo(67, 820); ctx.lineTo(W / 2, 1000); ctx.lineTo(W - 67, 820); ctx.lineTo(W - 67, 1112); ctx.quadraticCurveTo(W - 67, 1135, W - 91, 1135); ctx.lineTo(91, 1135); ctx.quadraticCurveTo(67, 1135, 67, 1112); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(112,73,70,.25)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(68, 1128); ctx.lineTo(W / 2, 952); ctx.lineTo(W - 68, 1128); ctx.stroke();
  const flapProgress = Math.min(1, time / 1.1);
  ctx.save(); ctx.translate(W / 2, 820); ctx.scale(1, Math.max(.03, Math.cos(flapProgress * Math.PI / 2)));
  ctx.fillStyle = "#ead4af"; ctx.beginPath(); ctx.moveTo(-W * .42, 0); ctx.lineTo(0, -180); ctx.lineTo(W * .42, 0); ctx.closePath(); ctx.fill(); ctx.restore();
  const sealAlpha = Math.min(1, Math.max(0, (time - .6) / .6));
  ctx.globalAlpha = sealAlpha; ctx.fillStyle = "#963f4c"; ctx.beginPath(); ctx.arc(W / 2, 905, 31, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#f5dfb5"; ctx.font = `700 18px ${SERIF}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("R✦M", W / 2, 905); ctx.globalAlpha = 1;

  const textAlpha = Math.min(1, Math.max(0, (time - .6) / .8));
  ctx.globalAlpha = textAlpha;
  centerText("R  ✦  M", paperY + 68, `500 25px ${SERIF}`, "#ad7b43");
  centerText("A CELEBRATION OF LOVE", paperY + 128, `500 14px ${MONO}`, "#987653");
  ctx.fillStyle = "rgba(159,119,70,.48)"; ctx.fillRect(W * .36, paperY + 158, W * .28, 1);
  centerText("Ria & Manas", paperY + 244, `700 66px ${SERIF}`, "#38233b", W - 200);
  centerText("invite you to celebrate", paperY + 310, `italic 25px ${SERIF}`, "#816d61");
  let guestSize = guest.length > 44 ? 16 : 21;
  let guestLines = wrapText(guest === "Friends & Family" ? "Dear Friends & Family" : `For ${guest}`, W - 190, `500 ${guestSize}px ${SERIF}`);
  while (guestLines.length > 3 && guestSize > 14) {
    guestSize -= 2;
    guestLines = wrapText(guest === "Friends & Family" ? "Dear Friends & Family" : `For ${guest}`, W - 190, `500 ${guestSize}px ${SERIF}`);
  }
  const guestStart = paperY + 397 - (guestLines.length - 1) * 13;
  guestLines.slice(0, 3).forEach((line, index) => centerText(line, guestStart + index * 26, `500 ${guestSize}px ${SERIF}`, "#49354a", W - 190));
  centerText("19 — 21 NOVEMBER 2026  ·  NAGPUR", paperY + 482, `500 14px ${MONO}`, "#a37845");
  ctx.globalAlpha = 1;
}

function introCard(time = 0) {
  paintCard(time);
  const progress = Math.max(0, time);
  centerText("THE WEDDING CELEBRATIONS", 132, `500 13px ${MONO}`, "#e6c487");
  centerText("Three days,", 242, `700 65px ${SERIF}`, "#fbf6ed");
  centerText("one beautiful story.", 316, `700 49px ${SERIF}`, "#fbf6ed");
  ctx.fillStyle = "rgba(236,204,150,.6)"; ctx.fillRect(W * .34, 384, W * .32, 1);
  centerText("19 — 21 NOVEMBER 2026   ·   NAGPUR", 430, `500 13px ${MONO}`, "#e6c487");
  const dates = { janeu: "19 NOV", sukhmani: "19 NOV", haldi: "20 NOV", sangeet: "20 NOV", baarat: "21 NOV", reception: "21 NOV" };
  const rowHeight = filmEvents.length > 5 ? 83 : 91;
  const startY = 510;
  filmEvents.forEach((event, index) => {
    const reveal = Math.max(0, Math.min(1, (progress - .28 - index * .34) / .48));
    if (!reveal) return;
    const ease = 1 - (1 - reveal) ** 3;
    const y = startY + index * rowHeight + (1 - ease) * 24;
    ctx.globalAlpha = ease;
    ctx.fillStyle = "rgba(250,241,222,.075)"; ctx.beginPath(); ctx.roundRect(83, y, W - 166, rowHeight - 10, 12); ctx.fill();
    ctx.strokeStyle = "rgba(236,204,150,.28)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(83, y, W - 166, rowHeight - 10, 12); ctx.stroke();
    ctx.fillStyle = "#e7c98e"; ctx.beginPath(); ctx.arc(128, y + (rowHeight - 10) / 2, 23, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#422a40"; ctx.font = `600 16px ${MONO}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(index + 1).padStart(2, "0"), 128, y + (rowHeight - 10) / 2);
    ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillStyle = "rgba(242,220,170,.8)"; ctx.font = `500 11px ${MONO}`; ctx.fillText(dates[event.key] || "NOV", 170, y + 26, W - 250);
    ctx.fillStyle = "#fbf6ed"; ctx.font = `600 22px ${SERIF}`; ctx.fillText(event.title, 170, y + 51, W - 250);
    ctx.textAlign = "right"; ctx.fillStyle = "rgba(242,220,170,.56)"; ctx.font = `500 10px ${MONO}`; ctx.fillText(String(index + 1).padStart(2, "0"), W - 104, y + (rowHeight - 10) / 2);
    ctx.globalAlpha = 1;
  });
  centerText("A CONTINUOUS CELEBRATION FILM  ✦", 1135, `500 12px ${MONO}`, "#e6c487");
}

function closingCard() {
  paintCard();
  centerText("WITH LOVE", 510, `500 16px ${MONO}`, "#e6c487");
  centerText("Ria & Manas", 625, `700 72px ${SERIF}`, "#fbf6ed");
  centerText("We cannot wait to celebrate with you.", 710, `500 24px ${SERIF}`, "#d6c6ad");
  centerText("19—21 NOVEMBER 2026  ·  NAGPUR", 840, `500 16px ${MONO}`, "#e6c487");
  centerText("✦", 970, `500 34px ${SERIF}`, "#e6c487");
}

function wrapText(text, maxWidth, font) {
  ctx.font = font;
  const words = text.split(/\s+/); const lines = []; let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) { lines.push(line); line = word; }
    else line = candidate;
  }
  if (line) lines.push(line);
  return lines;
}

function detailCard(event, index, time = 0) {
  paintEventBackdrop(event, time);
  drawEventMotif(event, time);
  const entry = Math.max(0, Math.min(1, time / 1.05));
  const ease = 1 - (1 - entry) ** 3;
  const number = String(index + 1).padStart(2, "0");
  const day = event.date.match(/\d{1,2}/)?.[0] || number;

  // Full-bleed artwork, an invitation arch and editorial type replace document-like panels.
  ctx.globalAlpha = .14;
  centerText(day, 510, `700 260px ${SERIF}`, "#f1d39c");
  ctx.globalAlpha = ease;
  centerText("RIA  ✦  MANAS", 143 + (1 - ease) * 15, `700 19px ${SERIF}`, "#f5dfb2");
  centerText(`CELEBRATION  ${number}  /  ${String(filmEvents.length).padStart(2, "0")}`, 197 + (1 - ease) * 15, `700 12px ${MONO}`, "rgba(255,242,213,.86)");
  centerText("INVITE YOU TO", 279 + (1 - ease) * 12, `700 12px ${MONO}`, "#f6d698");
  centerText(event.tone, 315 + (1 - ease) * 12, `700 15px ${SERIF}`, "#fff0cc", W - 100);

  const titleSize = event.title.length > 18 ? 54 : event.title.length > 14 ? 61 : 72;
  const titleFont = `700 ${titleSize}px ${SERIF}`;
  const titleLines = wrapText(event.title, W - 100, titleFont);
  const titleStart = 478 - ((titleLines.length - 1) * 34);
  ctx.shadowColor = "rgba(238,197,127,.48)"; ctx.shadowBlur = 24 * ease;
  titleLines.forEach((line, lineIndex) => centerText(line, titleStart + lineIndex * 68 + (1 - ease) * 24, titleFont, "#fffaf0", W - 100));
  ctx.shadowBlur = 0;

  const infoEase = Math.max(0, Math.min(1, (time - .55) / .85));
  ctx.globalAlpha = infoEase;
  const flourishY = 594 + (1 - infoEase) ** 3 * 27;
  ctx.strokeStyle = "rgba(255,226,177,.82)"; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(208, flourishY); ctx.lineTo(328, flourishY); ctx.moveTo(392, flourishY); ctx.lineTo(512, flourishY); ctx.stroke();
  ctx.fillStyle = "#ffe4ad"; ctx.save(); ctx.translate(W / 2, flourishY); ctx.rotate(Math.PI / 4); ctx.fillRect(-4, -4, 8, 8); ctx.restore();

  centerText(event.date.toUpperCase(), 690 + (1 - infoEase) * 30, `700 23px ${SERIF}`, "#ffe2af", W - 100);
  centerText(event.time.toUpperCase(), 745 + (1 - infoEase) * 30, `700 22px ${SERIF}`, "#fffaf0", W - 100);

  const venueEase = Math.max(0, Math.min(1, (time - .92) / .85));
  ctx.globalAlpha = venueEase;
  centerText("THE CELEBRATION", 848 + (1 - venueEase) * 24, `700 11px ${MONO}`, "rgba(255,233,194,.88)");
  let venueSize = event.venue.length > 34 ? 22 : 26;
  let venueLines = wrapText(event.venue, W - 120, `700 ${venueSize}px ${SERIF}`);
  while (venueLines.length > 2 && venueSize > 18) {
    venueSize -= 2;
    venueLines = wrapText(event.venue, W - 120, `700 ${venueSize}px ${SERIF}`);
  }
  venueLines.slice(0, 2).forEach((line, lineIndex) => centerText(line, 900 + (lineIndex - (Math.min(2, venueLines.length) - 1) / 2) * 34 + (1 - venueEase) * 24, `700 ${venueSize}px ${SERIF}`, "#fffaf1", W - 120));
  ctx.globalAlpha = 1;
  centerText("WITH LOVE  ·  NAGPUR", 1110, `700 12px ${MONO}`, "#f1d39c");
  centerText("19 — 21 NOVEMBER 2026", 1142, `700 10px ${MONO}`, "rgba(255,240,216,.76)");
}

function drawVideoFrame(video, label, elapsed, duration) {
  const vw = video.videoWidth || W; const vh = video.videoHeight || H;
  const scale = Math.max(W / vw, H / vh); const dw = vw * scale; const dh = vh * scale;
  const dx = (W - dw) / 2; const dy = (H - dh) / 2;
  ctx.fillStyle = "#120d14"; ctx.fillRect(0, 0, W, H);
  ctx.drawImage(video, dx, dy, dw, dh);
  const shade = ctx.createLinearGradient(0, 0, 0, H * .35);
  shade.addColorStop(0, "rgba(17,10,18,.66)"); shade.addColorStop(1, "rgba(17,10,18,0)");
  ctx.fillStyle = shade; ctx.fillRect(0, 0, W, H * .35);
  ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillStyle = "rgba(255,244,218,.92)"; ctx.font = `500 16px ${MONO}`;
  ctx.fillText(label.toUpperCase(), 58, 60, W - 116);
  ctx.fillStyle = "rgba(255,244,218,.64)"; ctx.textAlign = "right"; ctx.font = `500 14px ${MONO}`;
  ctx.fillText("RIA ✦ MANAS", W - 58, 62);
  // The recording contains no playback UI or progress controls.
}

function renderStatic(draw, durationSeconds, label, baseProgress, totalDuration) {
  return new Promise(resolve => {
    const start = performance.now();
    const tick = now => {
      const elapsed = (now - start) / 1000;
      draw(elapsed);
      progressFill.style.width = `${Math.min(100, ((baseProgress + elapsed) / totalDuration) * 100)}%`;
      statusLine.textContent = `${label} · ${Math.min(Math.round((elapsed / durationSeconds) * 100), 100)}%`;
      if (elapsed < durationSeconds) requestAnimationFrame(tick); else resolve();
    };
    requestAnimationFrame(tick);
  });
}

function prepareClip(event) {
  const cached = preparedClips.get(event.key);
  if (cached) return cached.ready.then(() => Math.min(cached.video.duration || 6, 9));
  const video = document.createElement("video");
  video.muted = true; video.playsInline = true; video.preload = "auto";
  const ready = new Promise((resolve, reject) => {
    const onReady = () => { cleanup(); resolve(); };
    const onError = () => { cleanup(); reject(new Error(`Could not load ${event.title} footage. Check your connection and try again.`)); };
    const cleanup = () => { video.removeEventListener("loadeddata", onReady); video.removeEventListener("error", onError); };
    video.addEventListener("loadeddata", onReady, { once: true });
    video.addEventListener("error", onError, { once: true });
    video.src = event.source; video.load();
  });
  preparedClips.set(event.key, { video, ready });
  return ready.then(
    () => Math.min(video.duration || 6, 9),
    error => {
      if (preparedClips.get(event.key)?.ready === ready) preparedClips.delete(event.key);
      throw error;
    },
  );
}

function prepareEventPoster(event) {
  const cached = eventPosterCache.get(event.key);
  if (cached) return cached.ready;
  const image = new Image();
  const entry = { image, loaded: false, ready: null };
  entry.ready = new Promise(resolve => {
    image.onload = () => { entry.loaded = true; resolve(true); };
    image.onerror = () => resolve(false);
    image.src = event.poster;
  });
  eventPosterCache.set(event.key, entry);
  return entry.ready;
}

function paintEventBackdrop(event, time) {
  const poster = eventPosterCache.get(event.key);
  if (!poster?.loaded) {
    paintCard(time);
    return;
  }
  const image = poster.image;
  const baseScale = Math.max(W / image.naturalWidth, H / image.naturalHeight);
  const scale = baseScale * (1.015 + Math.sin(time * .8) * .008);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  ctx.fillStyle = "#150d16"; ctx.fillRect(0, 0, W, H);
  ctx.drawImage(image, (W - width) / 2, (H - height) / 2, width, height);
  ctx.fillStyle = "rgba(15,8,17,.53)"; ctx.fillRect(0, 0, W, H);
  const shade = ctx.createLinearGradient(0, 0, 0, H);
  shade.addColorStop(0, "rgba(14,8,17,.45)"); shade.addColorStop(.38, "rgba(14,8,17,.08)"); shade.addColorStop(1, "rgba(14,8,17,.72)");
  ctx.fillStyle = shade; ctx.fillRect(0, 0, W, H);
  const accents = {
    janeu: "rgba(245,194,94,.18)", sukhmani: "rgba(255,211,139,.2)", haldi: "rgba(255,168,48,.2)",
    sangeet: "rgba(181,119,255,.2)", baarat: "rgba(255,181,83,.2)", reception: "rgba(255,221,160,.18)",
  };
  const glow = ctx.createRadialGradient(W / 2, H * .39, 8, W / 2, H * .4, H * .5);
  glow.addColorStop(0, accents[event.key] || "rgba(242,220,170,.14)"); glow.addColorStop(1, "rgba(20,12,19,0)");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(245,220,175,.44)"; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(50, 1112); ctx.lineTo(50, 486); ctx.bezierCurveTo(50, 285, 165, 208, W / 2, 208); ctx.bezierCurveTo(W - 165, 208, W - 50, 285, W - 50, 486); ctx.lineTo(W - 50, 1112); ctx.stroke();
  ctx.strokeStyle = "rgba(245,220,175,.18)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(63, 1100); ctx.lineTo(63, 491); ctx.bezierCurveTo(63, 300, 174, 224, W / 2, 224); ctx.bezierCurveTo(W - 174, 224, W - 63, 300, W - 63, 491); ctx.lineTo(W - 63, 1100); ctx.stroke();
}

function drawEventMotif(event, time) {
  const pulse = .55 + (Math.sin(time * 3.2) + 1) * .18;
  ctx.save();
  if (event.key === "janeu") {
    // A sacred thread makes a slow, luminous loop around the chapter title.
    ctx.globalAlpha = .54;
    ctx.strokeStyle = "rgba(255,220,143,.76)"; ctx.lineWidth = 2.4;
    ctx.setLineDash([8, 8]); ctx.lineDashOffset = -time * 22;
    ctx.beginPath(); ctx.moveTo(106, 354); ctx.bezierCurveTo(188, 294, 370, 320, 503, 352); ctx.bezierCurveTo(606, 378, 668, 344, 620, 328); ctx.stroke();
    ctx.setLineDash([]);
    const beadX = 106 + ((time * 84) % 500);
    const beadY = 354 + Math.sin(time * 1.4) * 17;
    ctx.fillStyle = `rgba(255,235,182,${pulse})`; ctx.shadowColor = "#ffd279"; ctx.shadowBlur = 17;
    ctx.beginPath(); ctx.arc(beadX, beadY, 4, 0, Math.PI * 2); ctx.fill();
  } else if (event.key === "sukhmani") {
    // A calm lotus of light grows and fades above the prayer details.
    const cx = W / 2; const cy = 410; const radius = 44 + Math.sin(time * 1.7) * 4;
    ctx.globalAlpha = .40;
    ctx.fillStyle = "rgba(255,226,166,.22)"; ctx.shadowColor = "#ffe2a6"; ctx.shadowBlur = 24;
    for (let petal = 0; petal < 8; petal += 1) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate((Math.PI * 2 * petal) / 8);
      ctx.beginPath(); ctx.ellipse(0, -radius * .48, 10, radius * .43, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.fill();
  } else if (event.key === "haldi") {
    // Haldi colour dust bursts along the lower edges so it never obscures the type.
    const colors = ["255,190,50", "255,111,70", "255,221,116", "239,91,134"];
    for (let puff = 0; puff < 28; puff += 1) {
      const side = puff % 2 ? 1 : -1;
      const phase = (time * (33 + (puff % 5) * 7) + puff * 67) % 280;
      const x = side < 0 ? 24 + phase * .56 : W - 24 - phase * .56;
      const y = 1110 - phase + Math.sin(time * 3 + puff) * 22;
      const alpha = .12 + (Math.sin(time * 4 + puff * 2) + 1) * .1;
      ctx.globalAlpha = alpha; ctx.fillStyle = `rgba(${colors[puff % colors.length]},${alpha})`;
      ctx.beginPath(); ctx.arc(x, y, 4 + (puff % 4) * 1.8, 0, Math.PI * 2); ctx.fill();
    }
  } else if (event.key === "sangeet") {
    // A small rotating disco ball throws restrained jewel-toned beams.
    const cx = W - 108; const cy = 364;
    ctx.globalAlpha = .31;
    const beamColors = ["rgba(111,205,255,.15)", "rgba(248,106,196,.14)", "rgba(255,216,119,.14)"];
    for (let beam = 0; beam < 3; beam += 1) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(time * .28 + beam * 2.1);
      ctx.fillStyle = beamColors[beam]; ctx.beginPath(); ctx.moveTo(-4, 14); ctx.lineTo(-96, 430); ctx.lineTo(96, 430); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    ctx.globalAlpha = .86; ctx.shadowColor = "#e8d8ff"; ctx.shadowBlur = 20;
    const gradient = ctx.createLinearGradient(cx - 27, cy - 25, cx + 27, cy + 25);
    gradient.addColorStop(0, "#fff3c9"); gradient.addColorStop(.5, "#cab9ed"); gradient.addColorStop(1, "#8d789f");
    ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(cx, cy, 27, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.72)"; ctx.lineWidth = 1;
    for (let stripe = -2; stripe <= 2; stripe += 1) {
      ctx.beginPath(); ctx.ellipse(cx, cy, 27, 5 + Math.abs(stripe) * 3, time * .6 + stripe * .12, 0, Math.PI * 2); ctx.stroke();
    }
  } else if (event.key === "baarat") {
    // Hoofbeat rings pulse beneath the ghodi illustration.
    for (let beat = 0; beat < 4; beat += 1) {
      const phase = (time * 1.8 + beat * .25) % 1;
      const radius = 16 + phase * 42;
      ctx.globalAlpha = (1 - phase) * .35;
      ctx.strokeStyle = "rgba(255,207,128,.9)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(W / 2 + (beat % 2 ? 122 : -122), 1090, radius, radius * .34, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = .8; ctx.fillStyle = "rgba(255,220,164,.92)";
    for (let hoof = 0; hoof < 4; hoof += 1) {
      const x = W / 2 - 132 + hoof * 88;
      const y = 1071 + Math.sin(time * 9 + hoof * 2) * 5;
      ctx.save(); ctx.translate(x, y); ctx.rotate(-.4 + Math.sin(time * 4 + hoof) * .13);
      ctx.beginPath(); ctx.ellipse(-4, 0, 5, 8, 0, Math.PI, Math.PI * 2); ctx.lineTo(1, 1); ctx.ellipse(4, 0, 5, 8, 0, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill(); ctx.restore();
    }
  } else if (event.key === "reception") {
    // Firework stars and falling confetti frame the reception portrait.
    const colors = ["255,218,141", "255,247,220", "242,167,190", "211,191,255"];
    for (let piece = 0; piece < 36; piece += 1) {
      const x = (piece * 137 + Math.sin(time * .8 + piece) * 17) % W;
      const y = (piece * 173 + time * (28 + (piece % 4) * 6)) % H;
      ctx.globalAlpha = .48; ctx.fillStyle = `rgba(${colors[piece % colors.length]},.78)`;
      ctx.save(); ctx.translate(x, y); ctx.rotate(time * 1.4 + piece);
      ctx.fillRect(-2, -5, piece % 3 ? 4 : 7, piece % 3 ? 10 : 4); ctx.restore();
    }
    for (let burst = 0; burst < 3; burst += 1) {
      const phase = (time * .55 + burst * .38) % 1;
      const cx = burst === 1 ? W - 95 : 90;
      const cy = 344 + burst * 47;
      ctx.globalAlpha = (1 - phase) * .55;
      ctx.strokeStyle = `rgba(${colors[burst]},${ctx.globalAlpha})`; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(cx, cy, 12 + phase * 37, 0, Math.PI * 2); ctx.stroke();
      for (let ray = 0; ray < 8; ray += 1) {
        const angle = ray * Math.PI / 4;
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(angle) * (16 + phase * 25), cy + Math.sin(angle) * (16 + phase * 25));
        ctx.lineTo(cx + Math.cos(angle) * (23 + phase * 37), cy + Math.sin(angle) * (23 + phase * 37)); ctx.stroke();
      }
    }
  }
  ctx.restore();
}

function clearGeneratedVideo() {
  if (generatedObjectUrl) URL.revokeObjectURL(generatedObjectUrl);
  generatedObjectUrl = "";
  downloadSection.replaceChildren();
  downloadSection.hidden = true;
}

function refreshSelection() {
  const version = ++selectionVersion;
  clipsReady = false;
  filmEvents = selectedFilmEvents();
  renderEventList();
  updateWhatsAppMessage();
  clearGeneratedVideo();
  resetStudioPreview();
  totalDuration = INTRO_SECONDS * 2 + CLOSING_SECONDS + filmEvents.length * (6 + DETAIL_SECONDS);
  document.querySelector("#estimate").textContent = formatDuration(totalDuration);
  progressFill.style.width = "0";
  createButton.disabled = true;
  if (!filmEvents.length) {
    statusLine.textContent = "Choose at least one function to make a video.";
    return;
  }

  statusLine.textContent = `Loading ${filmEvents.length} selected event clip${filmEvents.length === 1 ? "" : "s"}…`;
  Promise.all([
    ...filmEvents.map(prepareClip),
    ...filmEvents.map(prepareEventPoster),
  ]).then(results => {
    if (version !== selectionVersion) return;
    const durations = results.slice(0, filmEvents.length);
    totalDuration = INTRO_SECONDS * 2 + CLOSING_SECONDS + durations.reduce((sum, duration) => sum + duration + DETAIL_SECONDS, 0);
    document.querySelector("#estimate").textContent = formatDuration(totalDuration);
    clipsReady = true;
    createButton.disabled = false;
    statusLine.textContent = `Ready · ${filmEvents.length} function${filmEvents.length === 1 ? "" : "s"} selected · approximately ${formatDuration(totalDuration)}`;
  }).catch(error => {
    if (version !== selectionVersion) return;
    createButton.disabled = true;
    statusLine.textContent = error.message || "Some event footage could not be loaded.";
  });
}

sideGroom.addEventListener("change", () => {
  if (!sideGroom.checked) return;
  side = "groom";
  fields.janeu.checked = true;
  fields.sukhmani.checked = false;
  updateSideControls();
  refreshSelection();
});
sideBride.addEventListener("change", () => {
  if (!sideBride.checked) return;
  side = "bride";
  fields.janeu.checked = false;
  fields.sukhmani.checked = true;
  updateSideControls();
  refreshSelection();
});
for (const [key, field] of Object.entries(fields)) {
  field.addEventListener("change", () => {
    if (key === "janeu" && side !== "groom") field.checked = false;
    if (key === "sukhmani" && side !== "bride") field.checked = false;
    updateSideControls();
    refreshSelection();
  });
}
for (const field of [paathDateField, paathTimeField, paathVenueField]) {
  field.addEventListener("input", updatePaathDetails);
}
guestField.addEventListener("input", () => {
  updateGuestGreeting();
  updateWhatsAppMessage();
  clearGeneratedVideo();
  resetStudioPreview();
});

function supportedMime() {
  if (!window.MediaRecorder) return "";
  return ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]
    .find(type => MediaRecorder.isTypeSupported(type)) || "";
}

async function createFilm() {
  if (!filmEvents.length) throw new Error("No celebration clips were selected for this film.");
  if (!canvas.captureStream || !window.MediaRecorder) throw new Error("This browser cannot create downloadable videos. Open this page in a recent Safari or Chrome browser.");
  const mimeType = supportedMime();
  if (!mimeType) throw new Error("This browser does not offer a supported MP4 or WebM video encoder.");
  createButton.disabled = true;
  selectionPanel.disabled = true;
  guestField.disabled = true;
  audioChoice.disabled = true;
  statusLine.textContent = "Preparing the portrait wedding artwork…";
  await Promise.all([titleBackdropLoaded, filmFontsReady]);
  downloadSection.hidden = true;
  progressFill.style.width = "0";
  const canvasStream = canvas.captureStream(FPS);
  let audioDestination;
  if (audioChoice.checked) {
    sharedAudioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    sharedAudioSource ||= sharedAudioContext.createMediaElementSource(audio);
    audioDestination = sharedAudioContext.createMediaStreamDestination();
    sharedAudioSource.connect(sharedAudioContext.destination);
    sharedAudioSource.connect(audioDestination);
  }
  const combined = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...(audioDestination ? audioDestination.stream.getAudioTracks() : []),
  ]);
  const chunks = [];
  const recorder = new MediaRecorder(combined, { mimeType, videoBitsPerSecond: 5_000_000, audioBitsPerSecond: 160_000 });
  recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
  const finished = new Promise((resolve, reject) => {
    recorder.onstop = () => resolve();
    recorder.onerror = event => reject(event.error || new Error("Video encoding failed."));
  });
  let elapsedTotal = 0;
  recorder.start(1000);
  try {
    if (audioChoice.checked) {
      audio.currentTime = 0;
      const audioStarted = audio.play();
      const contextStarted = sharedAudioContext.resume();
      await Promise.all([audioStarted, contextStarted]);
    }
    await renderStatic(coverCard, INTRO_SECONDS, "Opening invitation", elapsedTotal, totalDuration); elapsedTotal += INTRO_SECONDS;
    await renderStatic(introCard, INTRO_SECONDS, "Celebration welcome", elapsedTotal, totalDuration); elapsedTotal += INTRO_SECONDS;
    for (let index = 0; index < filmEvents.length; index += 1) {
      const event = filmEvents[index];
      const clipVideo = preparedClips.get(event.key).video;
      await renderStatic(elapsed => detailCard(event, index, elapsed), DETAIL_SECONDS, `${event.title} lead-in`, elapsedTotal, totalDuration);
      elapsedTotal += DETAIL_SECONDS;
      clipVideo.currentTime = 0;
      const duration = Math.min(clipVideo.duration || 6, 9);
      await clipVideo.play();
      const clipStart = performance.now();
      await new Promise((resolve, reject) => {
        const tick = now => {
          if (clipVideo.error) { reject(new Error(`Playback failed for ${event.title}.`)); return; }
          const elapsed = (now - clipStart) / 1000;
          drawVideoFrame(clipVideo, event.title, elapsed, duration);
          progressFill.style.width = `${Math.min(100, ((elapsedTotal + elapsed) / totalDuration) * 100)}%`;
          statusLine.textContent = `${event.title} · stitching moving footage`;
          if (elapsed < duration) requestAnimationFrame(tick); else resolve();
        };
        requestAnimationFrame(tick);
      });
      clipVideo.pause();
      elapsedTotal += duration;
    }
    await renderStatic(closingCard, CLOSING_SECONDS, "Closing invitation", elapsedTotal, totalDuration);
    elapsedTotal += CLOSING_SECONDS;
    recorder.stop();
    await finished;
  } catch (error) {
    if (recorder.state !== "inactive") recorder.stop();
    await finished.catch(() => {});
    throw error;
  } finally {
    for (const { video } of preparedClips.values()) video.pause();
    if (audioChoice.checked) audio.pause();
    if (audioDestination && sharedAudioSource) sharedAudioSource.disconnect(audioDestination);
    canvasStream.getTracks().forEach(track => track.stop());
    combined.getTracks().forEach(track => track.stop());
    if (sharedAudioContext?.state === "running") await sharedAudioContext.suspend();
  }
  const ext = mimeType.startsWith("video/mp4") ? "mp4" : "webm";
  const blob = new Blob(chunks, { type: mimeType });
  if (generatedObjectUrl) URL.revokeObjectURL(generatedObjectUrl);
  generatedObjectUrl = URL.createObjectURL(blob);
  const preview = document.createElement("video");
  preview.src = generatedObjectUrl; preview.controls = true; preview.playsInline = true; preview.preload = "metadata";
  const download = document.createElement("a");
  const guest = currentGuest();
  const guestSlug = guest === "Friends & Family" ? "friends-and-family" : guest.normalize("NFKD").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
  download.href = generatedObjectUrl;
  download.download = `Ria-and-Manas-${guestSlug}-invitation.${ext}`;
  download.textContent = `DOWNLOAD ${ext.toUpperCase()} VIDEO ↓`;
  downloadSection.replaceChildren(preview, download);
  downloadSection.hidden = false;
  progressFill.style.width = "100%";
  statusLine.textContent = `Your ${ext.toUpperCase()} is ready · ${(blob.size / (1024 * 1024)).toFixed(1)} MB`;
}

function animateStudioPreview(now) {
  if (!filmIsRendering) {
    const introTime = ((now - studioPreviewStarted) / 1000) % (INTRO_SECONDS * 2);
    if (introTime < INTRO_SECONDS) coverCard(introTime);
    else introCard(introTime - INTRO_SECONDS);
  }
  requestAnimationFrame(animateStudioPreview);
}

refreshSelection();
requestAnimationFrame(animateStudioPreview);
document.querySelector("#copy-maker-message").addEventListener("click", async () => {
  const output = document.querySelector("#maker-message-text");
  const status = document.querySelector("#maker-message-status");
  if (!filmEvents.length || !output.value) return;
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(output.value);
    else {
      output.focus(); output.select();
      if (!document.execCommand("copy")) throw new Error("Clipboard unavailable");
    }
    status.textContent = "Complete WhatsApp invitation copied, including the selected function and map links.";
  } catch {
    output.focus(); output.select();
    status.textContent = "Message selected. Copy it to place it in WhatsApp.";
  }
});

createButton.addEventListener("click", async () => {
  filmIsRendering = true;
  try { await createFilm(); }
  catch (error) { statusLine.textContent = error.message || "The video could not be created. Please try again."; }
  finally {
    filmIsRendering = false;
    resetStudioPreview();
    selectionPanel.disabled = false;
    guestField.disabled = false;
    audioChoice.disabled = false;
    createButton.disabled = !clipsReady;
  }
});
