const params = new URLSearchParams(location.search);
const canvas = document.querySelector("#film-canvas");
const OUTPUT_SCALE = 1.5;
const W = 720;
const H = 1280;
canvas.width = W * OUTPUT_SCALE;
canvas.height = H * OUTPUT_SCALE;
const ctx = canvas.getContext("2d", { alpha: false });
ctx.scale(OUTPUT_SCALE, OUTPUT_SCALE);
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
const FPS = 30;
const INTRO_SECONDS = 7;
const DETAIL_SECONDS = 5;
const CLOSING_SECONDS = 4.5;
const codes = { j: "janeu", p: "sukhmani", h: "haldi", n: "sangeet", b: "baarat", r: "reception" };
const eventCodes = Object.fromEntries(Object.entries(codes).map(([code, key]) => [key, code]));
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
  janeu: { title: "Janeu Ceremony", date: "19th November 2026", time: "10:00 AM onwards", venue: "Rihayash Apartment, Rajnagar, Nagpur", source: "assets/events/janeu.mp4", poster: "assets/events/invite-bg-janeu.jpg", tone: "A SACRED THREAD · A NEW CHAPTER" },
  sukhmani: { title: "Sukhmani Sahib Paath", date: paathDate, time: paathTime, venue: paathVenue, source: "assets/events/sukhmani-paath.mp4", poster: "assets/events/invite-bg-sukhmani.jpg", tone: "A PRAYER FOR PEACE · A BLESSED BEGINNING" },
  haldi: { title: "Haldi Carnival", date: "20th November 2026", time: "11:00 AM onwards", venue: "Signature Resorts, Nagpur", source: "assets/events/haldi-carnival.mp4", poster: "assets/events/invite-bg-haldi.jpg", tone: "COLOUR, CHAOS & JOY" },
  sangeet: { title: "Sangeet Ceremony", date: "20th November 2026", time: "7:00 PM onwards", venue: "Dublin, Nagpur", source: "assets/events/sangeet.mp4", poster: "assets/events/invite-bg-sangeet.jpg", tone: "ONE FLOOR · ALL HEART" },
  baarat: { title: "Baarat", date: "21st November 2026", time: "10:00 AM onwards", venue: "Signature Resorts, Nagpur", source: "assets/events/baarat.mp4", poster: "assets/events/invite-bg-baarat.jpg", tone: "THE GRAND PROCESSION" },
  reception: { title: "Wedding Reception", date: "21st November 2026", time: "7:00 PM onwards", venue: "Dublin, Nagpur", source: "assets/events/reception.mp4", poster: "assets/events/invite-bg-reception.jpg", tone: "A NIGHT TO REMEMBER" },
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

function hostedStudioUrl() {
  const destination = new URL("video-studio.html", "https://riawedsmanas.github.io/wedding-invite/");
  destination.searchParams.set("s", side === "bride" ? "b" : "g");
  destination.searchParams.set("e", filmEvents.map(event => eventCodes[event.key]).join(""));
  const guest = currentGuest();
  if (guest !== "Friends & Family") destination.searchParams.set("g", guest);
  const paath = filmEvents.find(event => event.key === "sukhmani");
  if (paath) {
    destination.searchParams.set("d", paath.date);
    destination.searchParams.set("t", paath.time);
    destination.searchParams.set("v", paath.venue);
  }
  return destination.href;
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

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function calendarDateFor(value) {
  const match = String(value).match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)(?:\s*,?\s+(\d{4}))?/i);
  if (!match) return null;
  const month = monthNames.findIndex(name => name.toLowerCase() === match[2].toLowerCase());
  if (month < 0) return null;
  return { day: Number(match[1]), month, year: Number(match[3] || 2026) };
}
function uniqueFilmDates(list = filmEvents) {
  const dates = [];
  const seen = new Set();
  for (const event of list) {
    const parsed = calendarDateFor(event.date);
    const key = parsed ? `${parsed.year}-${parsed.month}-${parsed.day}` : String(event.date).trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    dates.push({ parsed, raw: event.date });
  }
  dates.sort((a, b) => {
    if (a.parsed && b.parsed) return Date.UTC(a.parsed.year, a.parsed.month, a.parsed.day) - Date.UTC(b.parsed.year, b.parsed.month, b.parsed.day);
    return a.parsed ? -1 : b.parsed ? 1 : 0;
  });
  return dates;
}
function selectedDateLabel(list = filmEvents) {
  const dates = uniqueFilmDates(list);
  if (!dates.length) return "";
  if (dates.length === 1) {
    const { parsed, raw } = dates[0];
    return parsed ? `${parsed.day} ${monthNames[parsed.month].toUpperCase()} ${parsed.year}` : String(raw).toUpperCase();
  }
  if (dates.every(date => date.parsed)) {
    const first = dates[0].parsed;
    const last = dates.at(-1).parsed;
    if (first.year === last.year && first.month === last.month) return `${first.day} — ${last.day} ${monthNames[last.month].toUpperCase()} ${last.year}`;
    const firstLabel = `${first.day} ${monthNames[first.month].toUpperCase()}${first.year === last.year ? "" : ` ${first.year}`}`;
    return `${firstLabel} — ${last.day} ${monthNames[last.month].toUpperCase()} ${last.year}`;
  }
  return `${String(dates[0].raw).toUpperCase()} — ${String(dates.at(-1).raw).toUpperCase()}`;
}
function numberWord(value) {
  return ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"][value] || String(value);
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
  output.value = `💌 *${heading}*\n\n*Dear ${guest},*\n\nWith immense joy, we invite you to celebrate the beautiful beginning of *Ria & Manas’s* new journey together. Your presence, love, and blessings will make these special moments even more memorable.\n\n✨ *WEDDING CELEBRATIONS* ✨\n\n${eventList}\n\nWith love,\n*Ria & Manas*`;
  copyButton.disabled = false;
  status.textContent = "Ready to copy · includes selected event details and map links.";
}

updateGuestGreeting();
updateSideControls();
function formatDuration(seconds) {
  const rounded = Math.ceil(seconds);
  return rounded < 60 ? `${rounded} sec` : `${Math.floor(rounded / 60)} min ${rounded % 60} sec`;
}

function tagPlaybackError(error, stage, eventTitle = "") {
  if (error?.name !== "NotAllowedError") return error;
  const tagged = new Error(error.message || "Media playback was blocked.");
  tagged.name = error.name;
  tagged.mediaStage = stage;
  tagged.eventTitle = eventTitle;
  return tagged;
}
document.querySelector("#estimate").textContent = formatDuration(INTRO_SECONDS * 2 + CLOSING_SECONDS + filmEvents.length * (6 + DETAIL_SECONDS));

const audio = new Audio();
audio.crossOrigin = "anonymous";
audio.src = "assets/audio/wedding_final_audio.mp3";
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

function fittedText(text, x, y, font, color, maxWidth, align = "left") {
  ctx.font = font;
  const match = font.match(/(\d+(?:\.\d+)?)px/);
  const size = match ? Number(match[1]) : 24;
  if (ctx.measureText(text).width > maxWidth) ctx.font = font.replace(match[0], `${Math.max(16, size * maxWidth / ctx.measureText(text).width)}px`);
  ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = "middle";
  ctx.fillText(text, x, y, maxWidth);
}

function coverCard(time = 0) {
  const guest = currentGuest();
  const t = Math.max(0, Math.min(1, time / 2.3));
  const eased = 1 - (1 - t) ** 3;
  paintCard(time);
  const envelopeY = 480;
  ctx.save(); ctx.shadowColor = "rgba(0,0,0,.42)"; ctx.shadowBlur = 38; ctx.shadowOffsetY = 22;
  const envelopeGradient = ctx.createLinearGradient(80, envelopeY, W - 80, 1050);
  envelopeGradient.addColorStop(0, "#56344c"); envelopeGradient.addColorStop(.54, "#321c35"); envelopeGradient.addColorStop(1, "#241726");
  ctx.fillStyle = envelopeGradient; ctx.beginPath(); ctx.roundRect(70, envelopeY, W - 140, 560, 14); ctx.fill(); ctx.restore();
  ctx.strokeStyle = "rgba(240,211,158,.58)"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.roundRect(80, envelopeY + 10, W - 160, 540, 10); ctx.stroke();
  ctx.strokeStyle = "rgba(240,211,158,.3)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(80, envelopeY + 22); ctx.lineTo(W / 2, envelopeY + 242); ctx.lineTo(W - 80, envelopeY + 22); ctx.stroke();
  const sealAlpha = Math.max(0, 1 - time / 1.2);
  ctx.globalAlpha = sealAlpha; ctx.fillStyle = "#a5785d"; ctx.beginPath(); ctx.arc(W / 2, envelopeY + 275, 28, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(255,235,196,.72)"; ctx.beginPath(); ctx.arc(W / 2, envelopeY + 275, 22, 0, Math.PI * 2); ctx.stroke();
  fittedText("R ✦ M", W / 2, envelopeY + 275, `700 16px ${SERIF}`, "#fff0cc", 52, "center");
  ctx.globalAlpha = 1;

  // The closed monogram envelope gives way to an editorial letter card.
  const reveal = Math.max(0, Math.min(1, (time - .42) / 1.35));
  const cardEase = 1 - (1 - reveal) ** 3;
  const paperY = 560 - cardEase * 348;
  ctx.save(); ctx.globalAlpha = reveal; ctx.shadowColor = "rgba(0,0,0,.46)"; ctx.shadowBlur = 36; ctx.shadowOffsetY = 18;
  ctx.fillStyle = "#f7f0e4"; ctx.beginPath(); ctx.roundRect(58, paperY, W - 116, 835, 8); ctx.fill(); ctx.restore();
  ctx.globalAlpha = reveal;
  ctx.strokeStyle = "rgba(143,104,68,.4)"; ctx.lineWidth = 1; ctx.strokeRect(73, paperY + 14, W - 146, 807);
  ctx.fillStyle = "#9a714a"; ctx.font = `700 21px ${SERIF}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("R  ✦  M", W / 2, paperY + 61);
  ctx.fillStyle = "#795b48"; ctx.font = `600 16px ${MONO}`;
  ctx.fillText("WITH THE BLESSINGS OF OUR FAMILIES", W / 2, paperY + 117);
  ctx.fillStyle = "rgba(160,119,70,.46)"; ctx.fillRect(W * .33, paperY + 148, W * .34, 1);
  fittedText("Ria & Manas", W / 2, paperY + 226, `700 78px ${SERIF}`, "#38233b", W - 190, "center");
  fittedText("invite you to celebrate", W / 2, paperY + 290, `italic 29px ${SERIF}`, "#816d61", W - 190, "center");
  const greeting = guest === "Friends & Family" ? "Dear Friends & Family," : `Dear ${guest},`;
  let greetingSize = 25;
  let greetingLines = wrapText(greeting, W - 190, `500 ${greetingSize}px ${SERIF}`);
  while (greetingLines.length > 2 && greetingSize > 19) { greetingSize -= 1; greetingLines = wrapText(greeting, W - 190, `500 ${greetingSize}px ${SERIF}`); }
  greetingLines.forEach((line, lineIndex) => fittedText(line, W / 2, paperY + 361 + lineIndex * 30, `500 ${greetingSize}px ${SERIF}`, "#49354a", W - 190, "center"));
  const messageLines = ["With immense joy, we invite you to share", "the beautiful beginning of our new journey.", "Your presence and blessings mean the world."];
  messageLines.forEach((line, lineIndex) => fittedText(line, W / 2, paperY + 435 + lineIndex * 35, `500 22px ${SERIF}`, "#695b56", W - 178, "center"));
  ctx.strokeStyle = "rgba(151,112,73,.42)"; ctx.beginPath(); ctx.moveTo(W * .25, paperY + 558); ctx.lineTo(W * .75, paperY + 558); ctx.stroke();
  fittedText(selectedDateLabel(), W / 2, paperY + 607, `700 20px ${MONO}`, "#77583f", W - 145, "center");
  fittedText("NAGPUR  ·  INDIA", W / 2, paperY + 643, `600 16px ${MONO}`, "#a37845", W - 145, "center");
  fittedText("A CONTINUOUS CELEBRATION FILM", W / 2, paperY + 748, `600 14px ${MONO}`, "#866c54", W - 150, "center");
  ctx.globalAlpha = 1;
}

function introCard(time = 0) {
  paintCard(time);
  const progress = Math.max(0, time);
  const dayCount = uniqueFilmDates().length;
  const heading = dayCount <= 1
    ? (filmEvents.length === 1 ? "One day, one moment." : "One day, many moments.")
    : `${numberWord(dayCount)} days, one story.`;
  centerText(filmEvents.length === 1 ? "A CELEBRATION FOR RIA & MANAS" : "THE CELEBRATIONS OF RIA & MANAS", 130, `600 16px ${MONO}`, "#f0d198");
  centerText(heading, 232, `700 61px ${SERIF}`, "#fff8ea", W - 86);
  centerText(`${selectedDateLabel()}  ·  NAGPUR`, 300, `600 16px ${MONO}`, "#e6c487");
  ctx.strokeStyle = "rgba(236,204,150,.52)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(92, 350); ctx.lineTo(W - 92, 350); ctx.stroke();
  const rowHeight = filmEvents.length > 5 ? 118 : 132;
  const startY = filmEvents.length > 5 ? 390 : 416;
  const dateColors = { janeu: "#f3d28c", sukhmani: "#d8d2af", haldi: "#ffd84d", sangeet: "#e5baff", baarat: "#ffcf82", reception: "#ebd29b" };
  filmEvents.forEach((event, index) => {
    const reveal = Math.max(0, Math.min(1, (progress - .12 - index * .28) / .44));
    if (!reveal) return;
    const ease = 1 - (1 - reveal) ** 3;
    const y = startY + index * rowHeight + (1 - ease) * 18;
    ctx.globalAlpha = ease;
    const poster = eventPosterCache.get(event.key);
    if (poster?.loaded) {
      ctx.save(); ctx.beginPath(); ctx.roundRect(82, y, 82, rowHeight - 20, 8); ctx.clip();
      ctx.drawImage(poster.image, 82, y, 82, rowHeight - 20); ctx.restore();
      ctx.strokeStyle = `${dateColors[event.key]}99`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(82, y, 82, rowHeight - 20, 8); ctx.stroke();
    }
    ctx.fillStyle = "rgba(12,8,16,.58)"; ctx.beginPath(); ctx.roundRect(180, y + 7, W - 262, 34, 8); ctx.fill();
    ctx.strokeStyle = `${dateColors[event.key] || "#e6c487"}88`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(180, y + 7, W - 262, 34, 8); ctx.stroke();
    fittedText(event.date.toUpperCase(), 194, y + 24, `700 18px ${MONO}`, dateColors[event.key] || "#e6c487", W - 290);
    fittedText(event.title, 190, y + 57, `700 31px ${SERIF}`, "#fffaf1", W - 245);
    fittedText(event.venue, 190, y + 87, `500 22px ${SERIF}`, "rgba(255,246,225,.85)", W - 250);
    ctx.strokeStyle = "rgba(242,220,170,.23)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(190, y + rowHeight - 10); ctx.lineTo(W - 82, y + rowHeight - 10); ctx.stroke();
    ctx.globalAlpha = 1;
  });
  centerText(filmEvents.length === 1 ? "LET THIS MOMENT UNFOLD  ✦" : "LET THE CELEBRATIONS UNFOLD  ✦", 1173, `600 14px ${MONO}`, "#e6c487");
}

function closingCard() {
  paintCard();
  centerText("WITH LOVE", 510, `500 20px ${MONO}`, "#e6c487");
  centerText("Ria & Manas", 625, `700 82px ${SERIF}`, "#fbf6ed");
  centerText("We cannot wait to celebrate with you.", 710, `500 29px ${SERIF}`, "#d6c6ad");
  centerText(`${selectedDateLabel()}  ·  NAGPUR`, 840, `500 20px ${MONO}`, "#e6c487");
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
  const infoEase = Math.max(0, Math.min(1, (time - .28) / .72));
  const rise = (1 - ease) * 21;
  const ink = "#fff8ea";
  const gold = "#ffe0a0";
  const pale = "rgba(255,244,218,.84)";
  const alignLeft = event.key === "haldi" || event.key === "sangeet" || event.key === "baarat";
  const leftX = 76;
  const textX = alignLeft ? leftX : W / 2;
  const textAlign = alignLeft ? "left" : "center";
  const textWidth = alignLeft ? 480 : 600;
  const labelY = event.key === "sukhmani" ? 193 : 172;
  const colors = { janeu: "#f4d58e", sukhmani: "#e5d8b5", haldi: "#ffdd50", sangeet: "#e8c3ff", baarat: "#ffd28b", reception: "#f1d39c" };
  const accent = colors[event.key] || gold;
  ctx.globalAlpha = ease;
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,240,213,.9)"; ctx.font = `700 18px ${MONO}`;
  ctx.fillText(`RIA  ✦  MANAS`, 58, 88 + rise);
  ctx.textAlign = "right"; ctx.fillStyle = accent; ctx.font = `700 18px ${MONO}`;
  ctx.fillText(`${number}  /  ${String(filmEvents.length).padStart(2, "0")}`, W - 58, 88 + rise);
  ctx.textAlign = textAlign;
  ctx.fillStyle = accent; ctx.font = `700 20px ${MONO}`;
  ctx.fillText(event.tone, textX, labelY + rise, textWidth);

  const titleLines = {
    janeu: ["Janeu", "Ceremony"],
    sukhmani: ["Sukhmani Sahib", "Paath"],
    haldi: ["Haldi", "Carnival"],
    sangeet: ["Sangeet", "Ceremony"],
    baarat: ["Baarat"],
    reception: ["Wedding", "Reception"],
  }[event.key] || wrapText(event.title, textWidth, `700 64px ${SERIF}`);
  const titleY = { janeu: 377, sukhmani: 365, haldi: 376, sangeet: 385, baarat: 410, reception: 378 }[event.key];
  const titleSize = { janeu: 84, sukhmani: 70, haldi: 92, sangeet: 82, baarat: 106, reception: 78 }[event.key];
  const titleLineHeight = titleSize * 1.08;
  ctx.globalAlpha = ease;
  ctx.shadowColor = `rgba(12,6,15,${.7 * ease})`; ctx.shadowBlur = 22 * ease; ctx.fillStyle = ink;
  ctx.font = `700 ${titleSize}px ${SERIF}`; ctx.textAlign = textAlign; ctx.textBaseline = "middle";
  titleLines.forEach((line, lineIndex) => {
    fittedText(line, textX, titleY + lineIndex * titleLineHeight + rise, `700 ${titleSize}px ${SERIF}`, ink, textWidth, textAlign);
  });
  ctx.shadowBlur = 0;

  ctx.globalAlpha = infoEase;
  const detailY = { janeu: 677, sukhmani: 690, haldi: 680, sangeet: 697, baarat: 690, reception: 694 }[event.key];
  const ruleX = alignLeft ? leftX : 146;
  const ruleW = alignLeft ? 330 : 428;
  ctx.strokeStyle = `${accent}b8`; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(ruleX, detailY - 25 + rise); ctx.lineTo(ruleX + ruleW, detailY - 25 + rise); ctx.stroke();

  if (event.key === "haldi") {
    // A bright festival ticket carries the date and time, followed by the venue.
    ctx.fillStyle = "rgba(52,29,13,.37)"; ctx.beginPath(); ctx.roundRect(leftX, detailY + 2 + rise, 385, 106, 15); ctx.fill();
    ctx.strokeStyle = "rgba(255,221,80,.63)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(leftX, detailY + 2 + rise, 385, 106, 15); ctx.stroke();
    fittedText(event.date.toUpperCase(), leftX + 22, detailY + 34 + rise, `700 26px ${MONO}`, gold, 340);
    fittedText(event.time.toUpperCase(), leftX + 22, detailY + 75 + rise, `700 28px ${SERIF}`, ink, 340);
    fittedText("THE CARNIVAL", leftX, 860 + rise, `700 17px ${MONO}`, "rgba(255,230,151,.88)", 360);
    fittedText(event.venue, leftX, 903 + rise, `700 31px ${SERIF}`, ink, 430);
  } else if (event.key === "sangeet") {
    fittedText("THE NIGHT OF", leftX, detailY + rise, `700 16px ${MONO}`, "rgba(255,231,197,.84)", 300);
    ctx.fillStyle = "rgba(20,9,28,.62)"; ctx.beginPath(); ctx.roundRect(leftX - 10, detailY + 19 + rise, 390, 82, 12); ctx.fill();
    ctx.strokeStyle = "rgba(232,195,255,.56)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(leftX - 10, detailY + 19 + rise, 390, 82, 12); ctx.stroke();
    fittedText(event.date.toUpperCase(), leftX + 12, detailY + 43 + rise, `700 28px ${SERIF}`, gold, 355);
    fittedText(event.time, leftX + 12, detailY + 82 + rise, `700 29px ${SERIF}`, ink, 355);
    ctx.strokeStyle = "rgba(232,195,255,.66)"; ctx.beginPath(); ctx.moveTo(leftX, 840 + rise); ctx.lineTo(leftX + 63, 840 + rise); ctx.stroke();
    fittedText(event.venue, leftX, 884 + rise, `700 31px ${SERIF}`, ink, 410);
  } else if (event.key === "baarat") {
    ctx.fillStyle = "rgba(6,17,38,.42)"; ctx.fillRect(leftX - 14, detailY - 2 + rise, 390, 132);
    ctx.fillStyle = accent; ctx.fillRect(leftX - 14, detailY - 2 + rise, 3, 132);
    fittedText(event.date.toUpperCase(), leftX + 10, detailY + 31 + rise, `700 26px ${MONO}`, gold, 350);
    fittedText(event.time, leftX + 10, detailY + 76 + rise, `700 29px ${SERIF}`, ink, 350);
    fittedText("THE PROCESSION", leftX, 875 + rise, `700 16px ${MONO}`, "rgba(255,229,183,.86)", 300);
    fittedText(event.venue, leftX, 920 + rise, `700 29px ${SERIF}`, ink, 400);
  } else {
    // Ritual and reception cards use a centered invitation dedication with generous rules.
    ctx.fillStyle = "rgba(17,10,18,.55)"; ctx.beginPath(); ctx.roundRect(W / 2 - 260, detailY - 13 + rise, 520, 87, 13); ctx.fill();
    ctx.strokeStyle = `${accent}88`; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(W / 2 - 260, detailY - 13 + rise, 520, 87, 13); ctx.stroke();
    fittedText(event.date.toUpperCase(), textX, detailY + 7 + rise, `700 30px ${SERIF}`, gold, textWidth, textAlign);
    fittedText(event.time.toUpperCase(), textX, detailY + 49 + rise, `700 27px ${SERIF}`, ink, textWidth, textAlign);
    const venueY = event.key === "sukhmani" ? 875 : 864;
    const venueMax = 590;
    const venueLines = wrapText(event.venue, venueMax, `600 30px ${SERIF}`).slice(0, 2);
    const venueAlign = "center";
    venueLines.forEach((line, lineIndex) => fittedText(line, W / 2, venueY + lineIndex * 39 + rise, `600 30px ${SERIF}`, pale, venueMax, venueAlign));
    const markY = venueY + venueLines.length * 35 + 42;
    ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(W / 2, markY + rise, 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
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
  ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillStyle = "rgba(255,244,218,.92)"; ctx.font = `600 20px ${MONO}`;
  ctx.fillText(label.toUpperCase(), 58, 60, W - 116);
  ctx.fillStyle = "rgba(255,244,218,.82)"; ctx.textAlign = "right"; ctx.font = `600 18px ${MONO}`;
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
  const scale = baseScale * (1.035 + Math.sin(time * .52) * .012);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  ctx.fillStyle = "#150d16"; ctx.fillRect(0, 0, W, H);
  const pan = Math.sin(time * .31) * 8;
  ctx.drawImage(image, (W - width) / 2 + pan, (H - height) / 2, width, height);
  const overlays = {
    janeu: [[0,"rgba(29,8,27,.18)"],[.36,"rgba(24,9,22,.07)"],[1,"rgba(21,8,17,.48)" ]],
    sukhmani: [[0,"rgba(7,19,42,.32)"],[.45,"rgba(7,19,42,.06)"],[1,"rgba(7,19,42,.44)" ]],
    haldi: [[0,"rgba(7,18,31,.51)"],[.5,"rgba(7,18,31,.22)"],[1,"rgba(7,18,31,.07)" ]],
    sangeet: [[0,"rgba(24,7,32,.57)"],[.5,"rgba(24,7,32,.24)"],[1,"rgba(24,7,32,.06)" ]],
    baarat: [[0,"rgba(4,14,36,.63)"],[.48,"rgba(4,14,36,.24)"],[1,"rgba(4,14,36,.05)" ]],
    reception: [[0,"rgba(4,22,18,.25)"],[.43,"rgba(4,22,18,.08)"],[1,"rgba(4,22,18,.5)" ]],
  };
  const shade = ctx.createLinearGradient(0, 0, event.key === "haldi" || event.key === "sangeet" || event.key === "baarat" ? W : 0, event.key === "haldi" || event.key === "sangeet" || event.key === "baarat" ? 0 : H);
  for (const [stop, color] of overlays[event.key] || overlays.janeu) shade.addColorStop(stop, color);
  ctx.fillStyle = shade; ctx.fillRect(0, 0, W, H);
  if (event.key === "janeu" || event.key === "sukhmani" || event.key === "reception") {
    ctx.strokeStyle = event.key === "sukhmani" ? "rgba(230,222,190,.38)" : "rgba(245,220,175,.35)";
    ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(54, 1160); ctx.lineTo(54, 342); ctx.bezierCurveTo(54, 180, 180, 104, W / 2, 104); ctx.bezierCurveTo(W - 180, 104, W - 54, 180, W - 54, 342); ctx.lineTo(W - 54, 1160); ctx.stroke();
  } else if (event.key === "haldi") {
    ctx.strokeStyle = "rgba(255,219,99,.55)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(60, 170); ctx.lineTo(60, 640); ctx.stroke();
  } else if (event.key === "sangeet") {
    ctx.strokeStyle = "rgba(235,194,255,.58)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(64, 178); ctx.lineTo(64, 300); ctx.lineTo(96, 300); ctx.stroke();
  } else if (event.key === "baarat") {
    ctx.strokeStyle = "rgba(248,207,133,.62)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(65, 170); ctx.lineTo(65, 620); ctx.stroke();
  }
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
  let audioDestination;
  if (audioChoice.checked) {
    try {
      sharedAudioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      if (!sharedAudioSource) {
        sharedAudioSource = sharedAudioContext.createMediaElementSource(audio);
        sharedAudioSource.connect(sharedAudioContext.destination);
      }
      audioDestination = sharedAudioContext.createMediaStreamDestination();
      sharedAudioSource.connect(audioDestination);
      audio.currentTime = 0;
      // Start both playback and the audio context synchronously from the button
      // gesture, before waiting on image/font promises. Safari blocks a delayed play().
      const audioStart = audio.play();
      const contextStart = sharedAudioContext.resume();
      await Promise.all([titleBackdropLoaded, filmFontsReady, audioStart, contextStart]);
    } catch (error) {
      audio.pause();
      if (audioDestination && sharedAudioSource) sharedAudioSource.disconnect(audioDestination);
      audioDestination?.stream.getTracks().forEach(track => track.stop());
      if (sharedAudioContext?.state === "running") await sharedAudioContext.suspend().catch(() => {});
      throw tagPlaybackError(error, "soundtrack");
    }
  } else {
    await Promise.all([titleBackdropLoaded, filmFontsReady]);
  }
  downloadSection.hidden = true;
  progressFill.style.width = "0";
  const canvasStream = canvas.captureStream(FPS);
  const combined = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...(audioDestination ? audioDestination.stream.getAudioTracks() : []),
  ]);
  const chunks = [];
  const recorder = new MediaRecorder(combined, { mimeType, videoBitsPerSecond: 8_000_000, audioBitsPerSecond: 160_000 });
  recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
  const finished = new Promise((resolve, reject) => {
    recorder.onstop = () => resolve();
    recorder.onerror = event => reject(event.error || new Error("Video encoding failed."));
  });
  let elapsedTotal = 0;
  recorder.start(1000);
  try {
    await renderStatic(coverCard, INTRO_SECONDS, "Opening invitation", elapsedTotal, totalDuration); elapsedTotal += INTRO_SECONDS;
    await renderStatic(introCard, INTRO_SECONDS, "Celebration welcome", elapsedTotal, totalDuration); elapsedTotal += INTRO_SECONDS;
    for (let index = 0; index < filmEvents.length; index += 1) {
      const event = filmEvents[index];
      const clipVideo = preparedClips.get(event.key).video;
      await renderStatic(elapsed => detailCard(event, index, elapsed), DETAIL_SECONDS, `${event.title} lead-in`, elapsedTotal, totalDuration);
      elapsedTotal += DETAIL_SECONDS;
      clipVideo.currentTime = 0;
      const duration = Math.min(clipVideo.duration || 6, 9);
      try {
        await clipVideo.play();
      } catch (error) {
        throw tagPlaybackError(error, "event-video", event.title);
      }
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
  catch (error) {
    if (error?.name === "NotAllowedError" && location.protocol === "file:") {
      statusLine.replaceChildren(document.createTextNode("This local file could not start media playback. Open the hosted studio to generate your video with the same selections: "));
      const hostedLink = document.createElement("a");
      hostedLink.href = hostedStudioUrl();
      hostedLink.target = "_blank";
      hostedLink.rel = "noopener noreferrer";
      hostedLink.textContent = "Open the HTTPS Video Studio";
      statusLine.append(hostedLink);
    } else if (error?.name === "NotAllowedError" && error.mediaStage === "event-video") {
      statusLine.textContent = `Your browser blocked ${error.eventTitle || "an event clip"} from playing. Reload the Video Studio and try again with the page open in the foreground.`;
    } else if (error?.name === "NotAllowedError" && error.mediaStage === "soundtrack") {
      statusLine.textContent = "The browser blocked soundtrack playback. Turn off Include Music and retry to create a silent video.";
    } else if (error?.name === "NotAllowedError") {
      statusLine.textContent = "Your browser blocked media playback. Reload the Video Studio and try again with the page open in the foreground.";
    } else {
      statusLine.textContent = error.message || "The video could not be created. Please try again.";
    }
  }
  finally {
    filmIsRendering = false;
    resetStudioPreview();
    selectionPanel.disabled = false;
    guestField.disabled = false;
    audioChoice.disabled = false;
    createButton.disabled = !clipsReady;
  }
});
