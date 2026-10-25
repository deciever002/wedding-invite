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
const INTRO_SECONDS = 5.5;
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

function paintCard() {
  const gradient = ctx.createLinearGradient(0, 0, W, H);
  gradient.addColorStop(0, "#261427"); gradient.addColorStop(.55, "#160e19"); gradient.addColorStop(1, "#27151e");
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * .5, H * .36, 18, W * .5, H * .42, H * .58);
  glow.addColorStop(0, "rgba(205,160,92,.16)"); glow.addColorStop(1, "rgba(205,160,92,0)");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(236,204,150,.75)"; ctx.lineWidth = 2; ctx.strokeRect(34, 34, W - 68, H - 68);
  ctx.strokeStyle = "rgba(236,204,150,.24)"; ctx.lineWidth = 1; ctx.strokeRect(49, 49, W - 98, H - 98);
  ctx.fillStyle = "rgba(242,220,170,.65)"; ctx.font = "24px Georgia"; ctx.textAlign = "center";
  [[78, 92], [W - 78, 92], [78, H - 78], [W - 78, H - 78]].forEach(([x,y]) => ctx.fillText("✦", x, y));
}

function centerText(text, y, font, color = "#f2dcaa", maxWidth = W - 120) {
  ctx.fillStyle = color; ctx.font = font; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(text, W / 2, y, maxWidth);
}

function coverCard() {
  const guest = currentGuest();
  paintCard();
  centerText("R ✦ M", 268, "500 42px Georgia", "#e6c487");
  ctx.fillStyle = "rgba(236,204,150,.62)"; ctx.fillRect(W * .32, 343, W * .36, 1);
  centerText("WITH IMMENSE JOY & HAPPINESS", 426, "18px monospace", "#e6c487");
  centerText("Ria & Manas", 548, "500 76px Georgia", "#fbf6ed");
  centerText("invite you to celebrate", 626, "italic 28px Georgia", "#d6c6ad");
  centerText(guest === "Friends & Family" ? "Dear Friends & Family" : `For ${guest}`, 802, "500 30px Georgia", "#fbf6ed");
  centerText("A beautiful new journey begins", 864, "24px Georgia", "#d6c6ad");
  centerText("19—21 NOVEMBER 2026  ·  NAGPUR", 1002, "18px monospace", "#e6c487");
  centerText("A LITTLE FILM FOR OUR FAVOURITE PEOPLE", 1102, "14px monospace", "rgba(242,220,170,.65)");
}

function introCard() {
  paintCard();
  centerText("THREE DAYS  ·  CELEBRATION FILMS", 330, "16px monospace", "#e6c487");
  centerText("Let the", 520, "500 72px Georgia", "#fbf6ed");
  centerText("celebrations unfold.", 605, "500 62px Georgia", "#fbf6ed");
  ctx.fillStyle = "rgba(236,204,150,.62)"; ctx.fillRect(W * .38, 708, W * .24, 1);
  const names = filmEvents.map(item => item.title);
  names.slice(0, 5).forEach((name, index) => centerText(name.toUpperCase(), 785 + index * 48, "16px monospace", "#e5d7c0"));
  centerText("ONE CONTINUOUS CELEBRATION  ✦", 1095, "15px monospace", "#e6c487");
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
      draw();
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
  coverCard();
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
  coverCard();
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

coverCard();
refreshSelection();
createButton.addEventListener("click", async () => {
  try { await createFilm(); }
  catch (error) { statusLine.textContent = error.message || "The video could not be created. Please try again."; }
  finally {
    selectionPanel.disabled = false;
    guestField.disabled = false;
    audioChoice.disabled = false;
    createButton.disabled = !clipsReady;
  }
});
