import { $, $$, state } from "./core.js";

export function ensureAudio() {
  if (!state.audioContext)
    state.audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
  if (state.audioContext.state === "suspended") state.audioContext.resume();
  return state.audioContext;
}
export function selectedInstrument() {
  return $(".track-card.selected")?.dataset.instrument || "piano";
}
function activeTrackCards() {
  const cards = $$(".track-card");
  const soloed = cards.some((card) =>
    card.querySelector('[data-action="solo"].active'),
  );
  return cards.filter(
    (card) =>
      !card.querySelector('[data-action="mute"].active') &&
      (!soloed || card.querySelector('[data-action="solo"].active')),
  );
}
export function playTone(
  pitch,
  duration = 0.35,
  instrument = selectedInstrument(),
) {
  const context = ensureAudio();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const now = context.currentTime;
  const frequency = 440 * Math.pow(2, (pitch - 69) / 12);
  const wave =
    instrument === "synth"
      ? "sawtooth"
      : instrument === "bass"
        ? "square"
        : instrument === "pluck"
          ? "triangle"
          : "sine";
  const channelLevel =
    Number($(".mixer-channel:not(.master) .fader")?.value || 74) / 100;
  const masterLevel =
    Number($(".mixer-channel.master .fader")?.value || 82) / 100;
  oscillator.type = wave;
  oscillator.frequency.setValueAtTime(frequency, now);
  if (instrument === "organ") oscillator.detune.setValueAtTime(12, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(
    (instrument === "bass" ? 0.12 : 0.18) * channelLevel * masterLevel,
    now + 0.015,
  );
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.03);
  state.activeSources.push(oscillator);
  oscillator.addEventListener("ended", () => {
    state.activeSources = state.activeSources.filter(
      (source) => source !== oscillator,
    );
  });
}
export function triggerNotesBetween(previousBeat, currentBeat) {
  activeTrackCards().forEach((card) => {
    const notes = state.trackNotes[card.dataset.trackId] || [];
    notes.forEach((note) => {
      const wrapped = currentBeat < previousBeat;
      const started = wrapped
        ? note.start > previousBeat || note.start <= currentBeat
        : note.start > previousBeat && note.start <= currentBeat;
      if (started)
        playTone(
          note.pitch,
          Math.max(0.15, (note.length * 60) / state.tempo),
          card.dataset.instrument || "piano",
        );
    });
  });
}
export function setPlaying(playing) {
  state.isPlaying = playing;
  $("#playButton").classList.toggle("playing", playing);
  $("#playIcon").innerHTML = playing ? "&#10074;&#10074;" : "&#9654;";
}
export function updateTime() {
  const seconds = (state.currentBeat * 60) / state.tempo;
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  $("#currentTime").textContent = `00:${mins}:${secs}`;
  $("#beatCounter").textContent =
    `${Math.floor(state.currentBeat / 4) + 1}.${Math.floor(state.currentBeat % 4) + 1}`;
  $("#playhead").style.left =
    `${(state.currentBeat * 60 * state.zoom) / 100}px`;
}
export function startPlayback() {
  if (state.isPlaying) return;
  ensureAudio();
  setPlaying(true);
  Object.values(state.recordedAudioByTrack).forEach((audio) => {
    audio.currentTime = (state.currentBeat * 60) / state.tempo;
    audio.play().catch(() => {});
  });
  let previousBeat = state.currentBeat - 0.05;
  triggerNotesBetween(previousBeat, state.currentBeat);
  const tick = () => {
    if (!state.isPlaying) return;
    const nextBeat =
      state.currentBeat + 0.05 >= 16 ? 0 : state.currentBeat + 0.05;
    triggerNotesBetween(previousBeat, nextBeat);
    previousBeat = state.currentBeat;
    state.currentBeat = nextBeat;
    updateTime();
    state.playTimer = requestAnimationFrame(tick);
  };
  state.playTimer = requestAnimationFrame(tick);
}
export function stopPlayback() {
  setPlaying(false);
  cancelAnimationFrame(state.playTimer);
  Object.values(state.recordedAudioByTrack).forEach((audio) => audio.pause());
}
