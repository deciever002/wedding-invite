const params = new URLSearchParams(location.search);
const canvas = document.querySelector("#film-canvas");
const ctx = canvas.getContext("2d", { alpha: false });
const statusLine = document.querySelector("#maker-status");
const progressFill = document.querySelector("#maker-progress-fill");
const createButton = document.querySelector("#create-film");
const downloadSection = document.querySelector("#maker-download");
const audioChoice = document.querySelector("#include-music");
const W = canvas.width;
const H = canvas.height;
const FPS = 30;
const INTRO_SECONDS = 7;
const DETAIL_SECONDS = 3.6;
const CLOSING_SECONDS = 4.5;
const codes = { j: "janeu", p: "sukhmani", h: "haldi", n: "sangeet", b: "baarat", r: "reception" };
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
  janeu: { title: "Janeu Ceremony", date: "19th November 2026", time: "10:00 AM onwards", venue: "Rihayash Apartment, Rajnagar, Nagpur", source: "assets/events/janeu.mp4", tone: "A SACRED THREAD · A NEW CHAPTER" },
  sukhmani: { title: "Sukhmani Sahib Paath", date: paathDate, time: paathTime, venue: paathVenue, source: "assets/events/sukhmani-paath.mp4", tone: "A PRAYER FOR PEACE · A BLESSED BEGINNING" },
  haldi: { title: "Haldi Carnival", date: "20th November 2026", time: "11:00 AM onwards", venue: "Signature Resorts, Nagpur", source: "assets/events/haldi-carnival.mp4", tone: "COLOUR, CHAOS & JOY" },
  sangeet: { title: "Sangeet Ceremony", date: "20th November 2026", time: "7:00 PM onwards", venue: "Dublin, Nagpur", source: "assets/events/sangeet.mp4", tone: "ONE FLOOR · ALL HEART" },
  baarat: { title: "Baarat", date: "21st November 2026", time: "10:00 AM onwards", venue: "Signature Resorts, Nagpur", source: "assets/events/baarat.mp4", tone: "THE GRAND PROCESSION" },
  reception: { title: "Wedding Reception", date: "21st November 2026", time: "7:00 PM onwards", venue: "Dublin, Nagpur", source: "assets/events/reception.mp4", tone: "A NIGHT TO REMEMBER" },
};
let filmEvents = [];
let selectionVersion = 0;
let studioPreviewStarted = performance.now();
let filmIsRendering = false;
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
  if (clipsReady) statusLine.textContent = `Ready · ${filmEvents.length} function${filmEvents.length === 1 ? "" : "s"} selected · approximately ${formatDuration(totalDuration)}`;
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
  const gradient = ctx.createLinearGradient(0, 0, W, H);
  gradient.addColorStop(0, "#342138"); gradient.addColorStop(.48, "#180f1c"); gradient.addColorStop(1, "#2b1925");
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, W, H);
  const glowX = W * (.5 + Math.sin(t * .00022) * .13);
  const glow = ctx.createRadialGradient(glowX, H * .4, 10, glowX, H * .43, H * .66);
  glow.addColorStop(0, "rgba(218,171,104,.19)"); glow.addColorStop(.45, "rgba(134,75,88,.08)"); glow.addColorStop(1, "rgba(205,160,92,0)");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

  // A slowly turning, fine-line mandala gives the title screens a little life.
  ctx.save(); ctx.translate(W / 2, H * .48); ctx.rotate(t * .000035);
  ctx.strokeStyle = "rgba(229,190,128,.075)"; ctx.lineWidth = 1;
  for (let ring = 0; ring < 3; ring += 1) {
    const radius = 246 + ring * 25;
    ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke();
  }
  for (let i = 0; i < 24; i += 1) {
    const angle = (i / 24) * Math.PI * 2;
    ctx.save(); ctx.rotate(angle); ctx.beginPath(); ctx.ellipse(0, -270, 9, 23, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  ctx.restore();

  // Champagne flecks drift around the frame as a subtle animated texture.
  for (let i = 0; i < 24; i += 1) {
    const x = (i * 173 + Math.sin(t * .0007 + i * 4) * 25 + W) % W;
    const y = (i * 271 - t * (.012 + (i % 3) * .004) + H * 2) % H;
    const pulse = .22 + (Math.sin(t * .002 + i * 2) + 1) * .23;
    ctx.fillStyle = `rgba(247,220,167,${pulse})`;
    ctx.beginPath(); ctx.arc(x, y, i % 5 === 0 ? 2.1 : 1.15, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = "rgba(236,204,150,.68)"; ctx.lineWidth = 1.5; ctx.strokeRect(34, 34, W - 68, H - 68);
  ctx.strokeStyle = "rgba(236,204,150,.23)"; ctx.lineWidth = 1; ctx.strokeRect(49, 49, W - 98, H - 98);
  ctx.fillStyle = "rgba(242,220,170,.8)"; ctx.font = "24px Georgia"; ctx.textAlign = "center";
  [[78, 92], [W - 78, 92], [78, H - 78], [W - 78, H - 78]].forEach(([x,y]) => ctx.fillText("✦", x, y));
  ctx.fillStyle = "rgba(236,204,150,.36)"; ctx.fillRect(74, H * .5, 1, 180); ctx.fillRect(W - 75, H * .5, 1, 180);
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
  const paperY = 690 - eased * 380;
  ctx.save(); ctx.shadowColor = "rgba(0,0,0,.42)"; ctx.shadowBlur = 34; ctx.shadowOffsetY = 18;
  ctx.fillStyle = "#f5eddc"; ctx.beginPath(); ctx.roundRect(92, paperY, W - 184, 505, 8); ctx.fill();
  ctx.restore();
  ctx.fillStyle = "rgba(127,91,70,.13)"; ctx.fillRect(117, paperY + 24, W - 234, 1);
  ctx.strokeStyle = "rgba(163,123,77,.28)"; ctx.lineWidth = 1; ctx.strokeRect(111, paperY + 17, W - 222, 471);

  // Envelope body and folding edges.
  ctx.fillStyle = "#d6b98e"; ctx.beginPath(); ctx.moveTo(67, 762); ctx.lineTo(W / 2, 1000); ctx.lineTo(W - 67, 762); ctx.lineTo(W - 67, 1092); ctx.quadraticCurveTo(W - 67, 1115, W - 91, 1115); ctx.lineTo(91, 1115); ctx.quadraticCurveTo(67, 1115, 67, 1092); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(112,73,70,.25)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(68, 1110); ctx.lineTo(W / 2, 938); ctx.lineTo(W - 68, 1110); ctx.stroke();
  const flapProgress = Math.min(1, time / 1.1);
  ctx.save(); ctx.translate(W / 2, 777); ctx.scale(1, Math.max(.03, Math.cos(flapProgress * Math.PI / 2)));
  ctx.fillStyle = "#ead4af"; ctx.beginPath(); ctx.moveTo(-W * .42, 0); ctx.lineTo(0, -208); ctx.lineTo(W * .42, 0); ctx.closePath(); ctx.fill(); ctx.restore();
  const sealAlpha = Math.min(1, Math.max(0, (time - .6) / .6));
  ctx.globalAlpha = sealAlpha; ctx.fillStyle = "#963f4c"; ctx.beginPath(); ctx.arc(W / 2, 875, 34, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#f5dfb5"; ctx.font = "20px Georgia"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("R✦M", W / 2, 875); ctx.globalAlpha = 1;

  const textAlpha = Math.min(1, Math.max(0, (time - .6) / .8));
  ctx.globalAlpha = textAlpha;
  centerText("R  ✦  M", paperY + 76, "500 27px Georgia", "#ad7b43");
  centerText("A CELEBRATION OF LOVE", paperY + 137, "13px monospace", "#987653");
  ctx.fillStyle = "rgba(159,119,70,.48)"; ctx.fillRect(W * .39, paperY + 170, W * .22, 1);
  centerText("Ria & Manas", paperY + 245, "500 62px Georgia", "#38233b");
  centerText("invite you to celebrate", paperY + 300, "italic 23px Georgia", "#816d61");
  centerText(guest === "Friends & Family" ? "Dear Friends & Family" : `For ${guest}`, paperY + 375, "500 21px Georgia", "#49354a");
  centerText("19 — 21 NOVEMBER 2026", paperY + 426, "13px monospace", "#a37845");
  ctx.globalAlpha = 1;
  centerText("NAGPUR  ·  WITH LOVE", 1180, "12px monospace", "rgba(242,220,170,.78)");
}

function introCard(time = 0) {
  paintCard(time);
  const progress = Math.max(0, time);
  centerText("THE WEDDING CELEBRATIONS", 132, "13px monospace", "#e6c487");
  centerText("Three days,", 242, "500 65px Georgia", "#fbf6ed");
  centerText("one beautiful story.", 316, "500 49px Georgia", "#fbf6ed");
  ctx.fillStyle = "rgba(236,204,150,.6)"; ctx.fillRect(W * .34, 384, W * .32, 1);
  centerText("19 — 21 NOVEMBER 2026   ·   NAGPUR", 430, "13px monospace", "#e6c487");
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
    ctx.fillStyle = "#422a40"; ctx.font = "600 16px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(index + 1).padStart(2, "0"), 128, y + (rowHeight - 10) / 2);
    ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillStyle = "rgba(242,220,170,.8)"; ctx.font = "11px monospace"; ctx.fillText(dates[event.key] || "NOV", 170, y + 26, W - 250);
    ctx.fillStyle = "#fbf6ed"; ctx.font = "500 22px Georgia"; ctx.fillText(event.title, 170, y + 51, W - 250);
    ctx.textAlign = "right"; ctx.fillStyle = "rgba(242,220,170,.56)"; ctx.font = "10px monospace"; ctx.fillText(String(index + 1).padStart(2, "0"), W - 104, y + (rowHeight - 10) / 2);
    ctx.globalAlpha = 1;
  });
  centerText("A CONTINUOUS CELEBRATION FILM  ✦", 1135, "12px monospace", "#e6c487");
}

function closingCard() {
  paintCard();
  centerText("WITH LOVE", 510, "16px monospace", "#e6c487");
  centerText("Ria & Manas", 625, "500 72px Georgia", "#fbf6ed");
  centerText("We cannot wait to celebrate with you.", 710, "24px Georgia", "#d6c6ad");
  centerText("19—21 NOVEMBER 2026  ·  NAGPUR", 840, "16px monospace", "#e6c487");
  centerText("✦", 970, "34px Georgia", "#e6c487");
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

function detailCard(event, index) {
  paintCard();
  centerText(`CELEBRATION  ${String(index + 1).padStart(2, "0")}`, 270, "17px monospace", "#e6c487");
  centerText(event.tone, 372, "14px monospace", "#cda975", W - 150);
  const titleLines = wrapText(event.title, W - 120, "500 58px Georgia");
  titleLines.forEach((line, lineIndex) => centerText(line, 520 + lineIndex * 72, "500 58px Georgia", "#fbf6ed"));
  ctx.fillStyle = "rgba(236,204,150,.62)"; ctx.fillRect(W * .36, 702, W * .28, 1);
  centerText(event.date.toUpperCase(), 800, "19px monospace", "#e6c487");
  centerText(event.time, 856, "27px Georgia", "#fbf6ed");
  const venueLines = wrapText(event.venue, W - 130, "25px Georgia");
  venueLines.forEach((line, lineIndex) => centerText(line, 946 + lineIndex * 38, "25px Georgia", "#d9cbb6"));
  centerText("RIA & MANAS  ·  NAGPUR", 1115, "16px monospace", "#e6c487");
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
  ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillStyle = "rgba(255,244,218,.92)"; ctx.font = "16px monospace";
  ctx.fillText(label.toUpperCase(), 58, 60, W - 116);
  ctx.fillStyle = "rgba(255,244,218,.64)"; ctx.textAlign = "right"; ctx.font = "14px monospace";
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
  Promise.all(filmEvents.map(prepareClip)).then(durations => {
    if (version !== selectionVersion) return;
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
      await renderStatic(() => detailCard(event, index), DETAIL_SECONDS, `${event.title} details`, elapsedTotal, totalDuration);
      elapsedTotal += DETAIL_SECONDS;
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
