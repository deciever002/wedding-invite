const cover = document.querySelector("#cover");
const envelopeScene = document.querySelector("#envelope-scene");
const openInvite = document.querySelector("#open-invite");
const journeyIntro = document.querySelector("#journey-intro");
const eventJourney = document.querySelector("#event-journey");
const chapters = [...document.querySelectorAll(".event-chapter")];
const counter = document.querySelector("#story-counter");
const progressFill = document.querySelector("#story-progress-fill");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const TRANSITION_MS = 2100;
const TRANSITION_FADE_MS = 500;
const FILM_FALLBACK_MS = 9500;
const DETAILS_DWELL_MS = 5500;
let savedRootOverflow = "";

const invitedGuest = new URLSearchParams(window.location.search).get("guest")?.trim().slice(0, 100);
if (invitedGuest) {
  document.querySelector("#guest-greeting").textContent = `Dear ${invitedGuest},`;
}

function revealLetter() {
  if (cover.classList.contains("is-open")) return;
  cover.classList.add("is-open");
  openInvite.setAttribute("aria-expanded", "true");
  window.setTimeout(() => {
    document.querySelector("#begin-journey").focus({ preventScroll: true });
  }, 1100);
}

openInvite.addEventListener("click", revealLetter);
envelopeScene.addEventListener("click", event => {
  if (!cover.classList.contains("is-open") && !event.target.closest("button")) revealLetter();
});

document.querySelector("#begin-journey").addEventListener("click", () => {
  journeyIntro.hidden = false;
  document.body.classList.add("story-started");
  journeyIntro.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "start" });
});

function updateStoryPosition(index) {
  counter.innerHTML = `${String(index + 1).padStart(2, "0")} <span>/</span> 05`;
  progressFill.style.width = `${((index + 1) / chapters.length) * 100}%`;
}

function clearChapterTimers(chapter) {
  window.clearTimeout(chapter.transitionTimer);
  window.clearTimeout(chapter.revealTimer);
  window.clearTimeout(chapter.advanceTimer);
}

function showDetails(chapter) {
  if (chapter.classList.contains("is-revealed")) return;
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
  video.pause();
  video.currentTime = Math.min(video.currentTime, video.duration || video.currentTime);

  // Keep each revealed event on screen for a moment before advancing automatically.
  if (Number(chapter.dataset.index) < chapters.length - 1) {
    chapter.advanceTimer = window.setTimeout(() => advanceChapter(chapter), DETAILS_DWELL_MS);
  }
}

function resetChapter(chapter) {
  clearChapterTimers(chapter);
  const video = chapter.querySelector("video");
  const art = chapter.querySelector(".chapter-art");
  video.pause();
  video.currentTime = 0;
  chapter.classList.remove("is-active", "is-revealed", "is-playing", "video-fallback");
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
  counter.innerHTML = `01 <span>/</span> 05`;
  window.scrollTo({ top: 0, behavior: reduceMotion.matches ? "auto" : "smooth" });
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
  if (reduceMotion.matches) {
    showDetails(chapter);
    return;
  }

  // Event-specific artwork plays as a transition splash before the clean event film.
  art.classList.add("is-transitioning");
  chapter.transitionTimer = window.setTimeout(() => {
    if (!chapter.classList.contains("is-active")) return;
    art.classList.remove("is-transitioning");
    chapter.transitionTimer = window.setTimeout(() => {
      if (!chapter.classList.contains("is-active")) return;
      chapter.classList.add("is-playing");
      art.classList.add("is-playing");
      chapter.revealTimer = window.setTimeout(() => showDetails(chapter), FILM_FALLBACK_MS);
      const playback = video.play();
      if (playback && typeof playback.catch === "function") {
        playback.catch(() => art.classList.add("video-fallback"));
      }
    }, TRANSITION_FADE_MS);
  }, TRANSITION_MS);
}

function advanceChapter(chapter) {
  if (!chapter.classList.contains("is-active")) return;
  const nextIndex = Number(chapter.dataset.index) + 1;
  if (nextIndex >= chapters.length) {
    exitJourney();
    return;
  }

  resetChapter(chapter);
  const nextChapter = chapters[nextIndex];
  nextChapter.classList.add("is-active");
  startChapter(nextChapter);
}

document.querySelector("#start-story").addEventListener("click", () => {
  chapters.forEach(resetChapter);
  chapters[0].classList.add("is-active");
  journeyIntro.hidden = true;
  eventJourney.hidden = false;
  eventJourney.classList.add("is-live");
  document.body.classList.add("event-mode");
  savedRootOverflow = document.documentElement.style.overflow;
  document.documentElement.style.overflow = "hidden";
  startChapter(chapters[0]);
});

for (const chapter of chapters) {
  const video = chapter.querySelector("video");
  const art = chapter.querySelector(".chapter-art");
  video.addEventListener("ended", () => showDetails(chapter));
  video.addEventListener("error", () => art.classList.add("video-fallback"));
  chapter.querySelector("[data-advance]").addEventListener("click", () => advanceChapter(chapter));
  chapter.querySelector("[data-replay]").addEventListener("click", () => startChapter(chapter, true));
}

document.querySelectorAll("[data-next]").forEach(button => {
  button.addEventListener("click", () => advanceChapter(button.closest(".event-chapter")));
});
document.querySelectorAll("[data-exit]").forEach(button => button.addEventListener("click", exitJourney));

// The supplied soundtrack loops only after a guest taps the sound control.
const audio = document.querySelector("#wedding-audio");
const soundToggle = document.querySelector("#sound-toggle");
const soundLabel = document.querySelector("#sound-label");
const soundtrackPath = "assets/audio/wedding-track.mp3";

fetch(soundtrackPath, { method: "HEAD", cache: "no-store" }).then(response => {
  if (!response.ok) return;
  audio.src = soundtrackPath;
  soundToggle.hidden = false;
}).catch(() => {});

soundToggle.addEventListener("click", async () => {
  if (audio.paused) {
    try {
      await audio.play();
      soundLabel.textContent = "SOUND ON";
      soundToggle.classList.add("is-on");
      soundToggle.setAttribute("aria-label", "Turn music off");
    } catch {
      soundLabel.textContent = "TAP TO PLAY";
    }
  } else {
    audio.pause();
    soundLabel.textContent = "SOUND OFF";
    soundToggle.classList.remove("is-on");
    soundToggle.setAttribute("aria-label", "Turn music on");
  }
});
