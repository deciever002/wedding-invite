const cover = document.querySelector("#cover");
const envelopeScene = document.querySelector("#envelope-scene");
const openInvite = document.querySelector("#open-invite");
const journeyIntro = document.querySelector("#journey-intro");
const eventJourney = document.querySelector("#event-journey");
const allChapters = [...document.querySelectorAll(".event-chapter")];
const counter = document.querySelector("#story-counter");
const progressFill = document.querySelector("#story-progress-fill");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const audio = document.querySelector("#wedding-audio");
const soundToggle = document.querySelector("#sound-toggle");
const soundLabel = document.querySelector("#sound-label");
const query = new URLSearchParams(window.location.search);
const invitedGuest = (query.get("g") ?? query.get("guest"))?.trim().slice(0, 100);
const sideValue = query.get("s") ?? query.get("side");
const side = sideValue === "b" || sideValue === "bride" ? "bride" : "groom";
const compactEventNames = { j: "janeu", p: "sukhmani", h: "haldi", n: "sangeet", b: "baarat", r: "reception" };
const requestedEvents = query.has("e")
  ? new Set([...(query.get("e") || "")].map(code => compactEventNames[code]).filter(Boolean))
  : query.has("events")
    ? new Set((query.get("events") || "").split(",").map(event => event.trim()).filter(Boolean))
    : null;
const sideEvent = side === "bride" ? "sukhmani" : "janeu";
const commonEvents = ["haldi", "sangeet", "baarat", "reception"];
const defaults = [sideEvent, ...commonEvents];
const inviteBackgrounds = {
  janeu: "assets/events/invite-bg-janeu.jpg",
  sukhmani: "assets/events/invite-bg-sukhmani.jpg",
  haldi: "assets/events/invite-bg-haldi.jpg",
  sangeet: "assets/events/invite-bg-sangeet.jpg",
  baarat: "assets/events/invite-bg-baarat.jpg",
  reception: "assets/events/invite-bg-reception.jpg"
};
const eventDates = {
  janeu: "19th November 2026",
  sukhmani: "19th November 2026",
  haldi: "20th November 2026",
  sangeet: "20th November 2026",
  baarat: "21st November 2026",
  reception: "21st November 2026"
};
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function calendarDateFor(value) {
  const match = String(value).match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)(?:\s*,?\s+(\d{4}))?/i);
  if (!match) return null;
  const month = monthNames.findIndex(name => name.toLowerCase() === match[2].toLowerCase());
  if (month < 0) return null;
  return { day: Number(match[1]), month, year: Number(match[3] || 2026) };
}
function uniqueDates(values) {
  const dates = [];
  const seen = new Set();
  for (const value of values) {
    const parsed = calendarDateFor(value);
    const key = parsed ? `${parsed.year}-${parsed.month}-${parsed.day}` : String(value).trim().toLowerCase();
    if (!seen.has(key)) { seen.add(key); dates.push({ parsed, raw: value }); }
  }
  dates.sort((a, b) => a.parsed && b.parsed
    ? Date.UTC(a.parsed.year, a.parsed.month, a.parsed.day) - Date.UTC(b.parsed.year, b.parsed.month, b.parsed.day)
    : a.parsed ? -1 : b.parsed ? 1 : 0);
  return dates;
}
function selectedDateLabel(values) {
  const dates = uniqueDates(values);
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
let chapters = [];
let soundtrackManuallyDisabled = false;
let savedRootOverflow = "";
let autoIntroTimer;
let autoStartTimer;
const DETAILS_DWELL_MS = 4600;
const SCENE_EFFECT_MS = reduceMotion.matches ? 0 : 2100;
const COVER_ENVELOPE_DWELL_MS = 1500;
const COVER_LETTER_DWELL_MS = 5500;

function configureInvitation() {
  const selected = requestedEvents?.size ? requestedEvents : new Set(defaults);
  for (const chapter of allChapters) {
    const key = chapter.dataset.event;
    const belongsToOtherSide = (key === "janeu" || key === "sukhmani") && key !== sideEvent;
    chapter.hidden = belongsToOtherSide || !selected.has(key);
  }
  chapters = allChapters.filter(chapter => !chapter.hidden);
  if (!chapters.length) {
    for (const chapter of allChapters) chapter.hidden = !defaults.includes(chapter.dataset.event);
    chapters = allChapters.filter(chapter => !chapter.hidden);
  }

  chapters.forEach((chapter, index) => {
    chapter.dataset.index = String(index);
    chapter.style.setProperty("--invite-background", `url("${inviteBackgrounds[chapter.dataset.event]}")`);
    const act = chapter.querySelector(".chapter-meta span");
    if (act) act.textContent = `ACT ${String(index + 1).padStart(2, "0")}`;
    const watermark = chapter.querySelector(".info-watermark");
    if (watermark) watermark.textContent = String(index + 1).padStart(2, "0");
    const reveal = chapter.querySelector(".event-reveal");
    const sceneEffects = chapter.querySelector(".chapter-art .event-effects");
    if (reveal && sceneEffects && !reveal.querySelector(".details-motif")) {
      const detailMotif = sceneEffects.cloneNode(true);
      detailMotif.classList.add("details-motif");
      detailMotif.setAttribute("aria-hidden", "true");
      reveal.prepend(detailMotif);
    }
  });

  chapters.forEach((chapter, index) => {
    const next = chapters[index + 1];
    const nextLabel = chapter.querySelector(".next-event:not(.next-event--end)");
    if (nextLabel && next) {
      nextLabel.innerHTML = `<span>UP NEXT</span> ${next.querySelector(".chapter-info h3").textContent.toUpperCase()} <i aria-hidden="true">↓</i>`;
    } else if (nextLabel) {
      nextLabel.hidden = true;
    }
  });

  const total = String(chapters.length).padStart(2, "0");
  document.querySelector("#film-count-label").textContent = `${total === "01" ? "ONE FILM" : `${total} FILMS`}`;
  counter.innerHTML = `01 <span>/</span> ${total}`;
  const singleFilm = chapters.length === 1;
  const journeyTitle = document.querySelector("#journey-title");
  const journeyCopy = document.querySelector("#journey-intro-copy");
  const continuousLabel = document.querySelector("#continuous-label");
  const activityLabel = document.querySelector("#selected-activity-label");
  if (journeyTitle && singleFilm) journeyTitle.innerHTML = "Let this moment<br>unfold.";
  if (journeyCopy && singleFilm) journeyCopy.innerHTML = "This moment has a story of its own.<br>Stay with us; let it unfold.";
  if (continuousLabel && singleFilm) continuousLabel.textContent = "ONE CONTINUOUS FILM";
  if (activityLabel && singleFilm) activityLabel.textContent = "ONE CELEBRATION FILM";

  const date = (query.get("d") ?? query.get("sukhmaniDate"))?.trim() || "19th November 2026";
  const time = (query.get("t") ?? query.get("sukhmaniTime"))?.trim() || "5:30 PM onwards";
  const defaultVenue = "At Our Residence (Civil Lines)";
  const defaultVenueMapUrl = "https://goo.gl/maps/ggq18AmDZNJyb4Kn8?g_st=aw";
  const venue = (query.get("v") ?? query.get("sukhmaniVenue"))?.trim() || defaultVenue;
  const when = document.querySelector("[data-sukhmani-when]");
  const where = document.querySelector("[data-sukhmani-where]");
  const filmDate = document.querySelector("[data-sukhmani-film-date]");
  const map = document.querySelector("[data-sukhmani-map]");
  if (when) when.textContent = [date, time].join("\n");
  eventDates.sukhmani = date;
  const venueMapUrl = venue === defaultVenue ? defaultVenueMapUrl : `https://maps.google.com/?q=${encodeURIComponent(venue)}`;
  if (where) {
    where.textContent = venue;
    where.href = venueMapUrl;
  }
  if (filmDate) filmDate.textContent = date.toUpperCase();
  if (map) {
    map.href = venueMapUrl;
  }

  const selectedDates = chapters.map(chapter => eventDates[chapter.dataset.event]).filter(Boolean);
  const days = uniqueDates(selectedDates).length;
  const dateLabel = selectedDateLabel(selectedDates);
  const durationLabel = days === 1 ? "ONE DAY" : `${numberWord(days).toUpperCase()} DAYS`;
  const coverDateCopy = document.querySelector("#cover-date-copy");
  const letterDateCopy = document.querySelector("#letter-date-copy");
  const selectedDayCount = document.querySelector("#selected-day-count");
  const selectedMomentCount = document.querySelector("#selected-moment-count");
  const footerDateCopy = document.querySelector("#footer-date-copy");
  if (coverDateCopy) coverDateCopy.textContent = `NAGPUR · ${dateLabel}`;
  if (letterDateCopy) letterDateCopy.textContent = `${dateLabel} · NAGPUR`;
  if (selectedDayCount) selectedDayCount.textContent = durationLabel;
  if (selectedMomentCount) selectedMomentCount.textContent = `${numberWord(chapters.length)} ${chapters.length === 1 ? "moment." : "moments."}`;
  if (footerDateCopy) footerDateCopy.textContent = dateLabel;
  const description = document.querySelector('meta[name="description"]');
  if (description) description.content = `Ria and Manas invite you to celebrate in Nagpur, ${dateLabel}.`;
}

configureInvitation();

if (invitedGuest) document.querySelector("#guest-greeting").textContent = `Dear ${invitedGuest},`;

function setSoundControl(isPlaying, blocked = false) {
  soundToggle.classList.toggle("is-on", isPlaying);
  soundLabel.textContent = isPlaying ? "SOUND ON" : blocked ? "TAP FOR SOUND" : "SOUND OFF";
  soundToggle.setAttribute("aria-label", isPlaying ? "Turn music off" : "Start invitation music");
}

async function startSoundtrack() {
  if (soundtrackManuallyDisabled) return false;
  try {
    await audio.play();
    setSoundControl(true);
    return true;
  } catch {
    setSoundControl(false, true);
    return false;
  }
}

soundToggle.hidden = false;
audio.autoplay = true;
audio.defaultMuted = false;
audio.muted = false;
audio.loop = true;
audio.preload = "auto";
audio.volume = 1;
void startSoundtrack();

// If the browser blocks audio on page load, resume it on the first visitor
// interaction. Browsers still require a gesture before playing sound in some cases.
function resumeSoundtrackOnInteraction(event) {
  if (event.target instanceof Element && event.target.closest("#sound-toggle")) return;
  if (!soundtrackManuallyDisabled && audio.paused) void startSoundtrack();
}
document.addEventListener("pointerdown", resumeSoundtrackOnInteraction, { passive: true });
document.addEventListener("keydown", resumeSoundtrackOnInteraction);

function revealLetter() {
  if (cover.classList.contains("is-open")) return;
  void startSoundtrack();
  cover.classList.add("is-opening");
  cover.classList.add("is-open");
  window.setTimeout(() => cover.classList.remove("is-opening"), 1800);
  openInvite.setAttribute("aria-expanded", "true");
  window.clearTimeout(autoIntroTimer);
  autoIntroTimer = window.setTimeout(beginJourney, COVER_LETTER_DWELL_MS);
}

function beginJourney() {
  if (eventJourney.classList.contains("is-live")) return;
  window.clearTimeout(autoStartTimer);
  journeyIntro.hidden = false;
  document.body.classList.add("story-started");
  journeyIntro.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "start" });
  autoStartTimer = window.setTimeout(startStory, COVER_LETTER_DWELL_MS);
}

openInvite.addEventListener("click", revealLetter);
envelopeScene.addEventListener("click", event => {
  if (!cover.classList.contains("is-open") && !event.target.closest("button")) revealLetter();
});
document.querySelector("#begin-journey").addEventListener("click", beginJourney);

function updateStoryPosition(index) {
  counter.innerHTML = `${String(index + 1).padStart(2, "0")} <span>/</span> ${String(chapters.length).padStart(2, "0")}`;
  progressFill.style.width = `${((index + 1) / chapters.length) * 100}%`;
}

function clearChapterTimers(chapter) {
  window.clearTimeout(chapter.effectTimer);
  window.clearTimeout(chapter.revealTimer);
  window.clearTimeout(chapter.advanceTimer);
}

function showDetails(chapter) {
  if (chapter.classList.contains("is-revealed") || !chapter.classList.contains("is-active")) return;
  const video = chapter.querySelector("video");
  const art = chapter.querySelector(".chapter-art");
  clearChapterTimers(chapter);
  chapter.classList.remove("is-playing");
  art.classList.remove("is-playing", "is-transitioning");
  art.classList.add("is-revealed");
  chapter.classList.add("is-revealed");
  const info = chapter.querySelector(".chapter-info");
  info.classList.add("is-revealed");
  info.querySelector(".event-reveal").removeAttribute("aria-hidden");
  info.querySelector(".waiting-copy").setAttribute("aria-hidden", "true");
  if (video) {
    video.pause();
    if (Number.isFinite(video.duration)) video.currentTime = Math.min(video.currentTime, video.duration);
  }

  if (Number(chapter.dataset.index) < chapters.length - 1) {
    chapter.advanceTimer = window.setTimeout(() => advanceChapter(chapter), DETAILS_DWELL_MS);
  }
}

function resetChapter(chapter) {
  clearChapterTimers(chapter);
  const video = chapter.querySelector("video");
  const art = chapter.querySelector(".chapter-art");
  if (video) {
    video.pause();
    try { video.currentTime = 0; } catch { /* Media metadata may not be ready yet. */ }
  }
  chapter.classList.remove("is-active", "is-exiting", "is-revealed", "is-playing", "video-fallback");
  art.classList.remove("is-revealed", "is-playing", "is-transitioning", "video-fallback");
  const info = chapter.querySelector(".chapter-info");
  info.classList.remove("is-revealed");
  info.querySelector(".event-reveal").setAttribute("aria-hidden", "true");
  info.querySelector(".waiting-copy").removeAttribute("aria-hidden");
  chapter.dataset.started = "";
}

function exitJourney() {
  chapters.forEach(resetChapter);
  eventJourney.classList.remove("is-live");
  eventJourney.hidden = true;
  journeyIntro.hidden = false;
  document.body.classList.remove("event-mode", "story-started");
  document.documentElement.style.overflow = savedRootOverflow;
  progressFill.style.width = "0";
  counter.innerHTML = `01 <span>/</span> ${String(chapters.length).padStart(2, "0")}`;
  window.scrollTo({ top: 0, behavior: reduceMotion.matches ? "auto" : "smooth" });
}

function warmNextClip(chapter) {
  const nextIndex = Number(chapter.dataset.index) + 1;
  const nextVideo = chapters[nextIndex]?.querySelector("video");
  if (nextVideo && nextVideo.preload !== "auto") {
    nextVideo.preload = "auto";
    nextVideo.load();
  }
}

function startChapter(chapter, restart = false) {
  const video = chapter.querySelector("video");
  const art = chapter.querySelector(".chapter-art");
  if (restart) {
    const isActive = chapter.classList.contains("is-active");
    resetChapter(chapter);
    if (isActive) chapter.classList.add("is-active");
  }
  if (!chapter.classList.contains("is-active") || chapter.dataset.started === "true") return;

  chapter.dataset.started = "true";
  updateStoryPosition(Number(chapter.dataset.index));
  chapter.classList.add("is-playing");
  art.classList.add("is-playing", "is-transitioning");
  chapter.effectTimer = window.setTimeout(() => art.classList.remove("is-transitioning"), SCENE_EFFECT_MS);
  warmNextClip(chapter);

  if (!video) {
    chapter.revealTimer = window.setTimeout(() => showDetails(chapter), chapter.querySelector(".chapter-illustration") ? 6000 : 7800);
    return;
  }

  video.preload = "auto";
  const setClipProgress = () => {
    if (Number.isFinite(video.duration) && video.duration > 0) {
      chapter.querySelector(".film-progress span").style.setProperty("--clip-duration", `${video.duration}s`);
    }
  };
  video.addEventListener("loadedmetadata", setClipProgress, { once: true });
  setClipProgress();
  const playback = video.play();
  if (playback?.catch) {
    playback.catch(() => {
      if (!chapter.classList.contains("is-active")) return;
      art.classList.add("video-fallback");
      chapter.revealTimer = window.setTimeout(() => showDetails(chapter), 6500);
    });
  }
  chapter.revealTimer = window.setTimeout(() => {
    if (video.paused || !video.duration || video.readyState < 2) {
      art.classList.add("video-fallback");
      showDetails(chapter);
    }
  }, 16000);
}

function advanceChapter(chapter) {
  if (!chapter.classList.contains("is-active")) return;
  const next = chapters[Number(chapter.dataset.index) + 1];
  if (!next) return;

  clearChapterTimers(chapter);
  chapter.classList.add("is-exiting");
  chapter.classList.remove("is-active");
  const oldVideo = chapter.querySelector("video");
  if (oldVideo) oldVideo.pause();
  next.classList.add("is-active");
  startChapter(next);
  window.setTimeout(() => resetChapter(chapter), reduceMotion.matches ? 0 : 460);
}

function startStory() {
  window.clearTimeout(autoStartTimer);
  if (!chapters.length || eventJourney.classList.contains("is-live")) return;
  void startSoundtrack();
  chapters.forEach(resetChapter);
  chapters[0].classList.add("is-active");
  journeyIntro.hidden = true;
  eventJourney.hidden = false;
  eventJourney.classList.add("is-live");
  document.body.classList.add("event-mode");
  savedRootOverflow = document.documentElement.style.overflow;
  document.documentElement.style.overflow = "hidden";
  startChapter(chapters[0]);
}

for (const chapter of allChapters) {
  const video = chapter.querySelector("video");
  const art = chapter.querySelector(".chapter-art");
  if (video) {
    video.addEventListener("ended", () => showDetails(chapter));
    video.addEventListener("error", () => {
      art.classList.add("video-fallback");
      if (chapter.classList.contains("is-active")) chapter.revealTimer = window.setTimeout(() => showDetails(chapter), 6500);
    });
  }
  chapter.querySelector("[data-advance]")?.addEventListener("click", () => advanceChapter(chapter));
  chapter.querySelector("[data-replay]")?.addEventListener("click", () => startChapter(chapter, true));
}

document.querySelectorAll("[data-next]").forEach(button => {
  button.addEventListener("click", () => advanceChapter(button.closest(".event-chapter")));
});
document.querySelectorAll("[data-exit]").forEach(button => button.addEventListener("click", exitJourney));
document.querySelector("#start-story").addEventListener("click", startStory);

soundToggle.addEventListener("click", async () => {
  if (audio.paused) {
    soundtrackManuallyDisabled = false;
    await startSoundtrack();
  } else {
    soundtrackManuallyDisabled = true;
    audio.pause();
    setSoundControl(false);
  }
});

// The letter is the opening splash; the film starts on its own after the brief title card.
window.setTimeout(revealLetter, COVER_ENVELOPE_DWELL_MS);
