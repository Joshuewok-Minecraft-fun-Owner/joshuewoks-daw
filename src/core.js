const initialNotes = [
  { pitch: 72, start: 0, length: 1, label: "C5" },
  { pitch: 76, start: 1, length: 1, label: "E5" },
  { pitch: 79, start: 2, length: 1, label: "G5" },
  { pitch: 76, start: 3, length: 1, label: "E5" },
  { pitch: 74, start: 4, length: 1, label: "D5" },
  { pitch: 77, start: 5, length: 1, label: "F5" },
  { pitch: 81, start: 6, length: 2, label: "A5" },
  { pitch: 77, start: 8, length: 1, label: "F5" },
  { pitch: 72, start: 9, length: 1, label: "C5" },
  { pitch: 76, start: 10, length: 1, label: "E5" },
  { pitch: 79, start: 11, length: 1, label: "G5" },
  { pitch: 84, start: 12, length: 3, label: "C6" },
];
export const state = {
  tempo: 96,
  isPlaying: false,
  currentBeat: 0,
  tool: "select",
  grid: 1 / 16,
  zoom: 100,
  playTimer: 0,
  selectedNote: -1,
  noteDrag: null,
  inspectorDrag: null,
  audioContext: null,
  activeSources: [],
  recording: null,
  recordedAudioByTrack: {},
  selectedTrackId: "soft-keys",
  notes: initialNotes.map((note) => ({ ...note })),
  trackNotes: {
    "soft-keys": initialNotes.map((note) => ({ ...note })),
    "sub-pulse": [],
    "glass-texture": [],
  },
  trackClips: { "sub-pulse": 0, "glass-texture": 0 },
};
export const $ = (selector) => document.querySelector(selector);
export const $$ = (selector) => [...document.querySelectorAll(selector)];
export const pitchNames = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];
export const isBlack = (pitch) => [1, 3, 6, 8, 10].includes(pitch % 12);
export const pitchLabel = (pitch) =>
  `${pitchNames[pitch % 12]}${Math.floor(pitch / 12) - 1}`;
export function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toast.classList.remove("visible"), 2200);
}
export function instrumentLabel(instrument) {
  return (
    {
      piano: "Grand Piano",
      synth: "Bright Synth",
      bass: "Sub Bass",
      organ: "Warm Organ",
      pluck: "Digital Pluck",
    }[instrument] || "Grand Piano"
  );
}
export function escapeHtml(value) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        character
      ],
  );
}
