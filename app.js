const state = {
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
  notes: [
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
  ],
};
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const pitchNames = [
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
const isBlack = (pitch) => [1, 3, 6, 8, 10].includes(pitch % 12);
const pitchLabel = (pitch) =>
  `${pitchNames[pitch % 12]}${Math.floor(pitch / 12) - 1}`;

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toast.classList.remove("visible"), 2200);
}
function beginInspectorPointer(event, knob) {
  event.preventDefault();
  state.inspectorDrag = {
    knob,
    originY: event.clientY,
    value: Number(knob.dataset.value),
  };
  knob.setPointerCapture(event.pointerId);
}
function updateInspectorPointer(event) {
  const drag = state.inspectorDrag;
  if (!drag) return;
  const knob = drag.knob;
  const min = Number(knob.dataset.min);
  const max = Number(knob.dataset.max);
  const next = Math.max(
    min,
    Math.min(
      max,
      drag.value - ((event.clientY - drag.originY) * (max - min)) / 100,
    ),
  );
  knob.dataset.value = Math.round(next);
  const ratio = (next - min) / (max - min);
  knob.querySelector("span").style.transform =
    `rotate(${-135 + ratio * 270}deg)`;
  const value = Math.round(next);
  const suffix =
    knob.dataset.inspector === "attack"
      ? " ms"
      : knob.dataset.inspector === "release"
        ? " ms"
        : "%";
  $(`#${knob.dataset.inspector}Value`).textContent = `${value}${suffix}`;
}
function endInspectorPointer() {
  state.inspectorDrag = null;
}
function beginNotePointer(event, element, note, index, mode = "move") {
  if (state.tool !== "select") return;
  event.preventDefault();
  event.stopPropagation();
  state.selectedNote = index;
  state.noteDrag = {
    element,
    note,
    index,
    mode,
    originX: event.clientX,
    originY: event.clientY,
    start: note.start,
    pitch: note.pitch,
    length: note.length,
    moved: false,
  };
  element.setPointerCapture(event.pointerId);
  $$(".note").forEach((item) => item.classList.remove("selected"));
  element.classList.add("selected");
}
function updateNotePointer(event) {
  const drag = state.noteDrag;
  if (!drag) return;
  const pixelsPerBeat = (60 * state.zoom) / 100;
  const deltaX = event.clientX - drag.originX;
  const deltaY = event.clientY - drag.originY;
  if (Math.abs(deltaX) + Math.abs(deltaY) > 3) drag.moved = true;
  if (drag.mode === "resize") {
    drag.note.length = Math.max(
      state.grid,
      Math.min(
        16 - drag.note.start,
        Math.round((drag.length + deltaX / pixelsPerBeat) / state.grid) *
          state.grid,
      ),
    );
    drag.element.style.width = `${Math.max(drag.note.length * pixelsPerBeat - 4, 14)}px`;
  } else {
    drag.note.start = Math.max(
      0,
      Math.min(
        16 - state.grid,
        Math.round((drag.start + deltaX / pixelsPerBeat) / state.grid) *
          state.grid,
      ),
    );
    drag.note.pitch = Math.max(
      53,
      Math.min(84, drag.pitch - Math.round(deltaY / 30)),
    );
    drag.note.label = pitchLabel(drag.note.pitch);
    drag.element.style.left = `${drag.note.start * pixelsPerBeat + 2}px`;
    drag.element.style.top = `${(84 - drag.note.pitch) * 30 + 4}px`;
    drag.element.textContent = drag.note.label;
    drag.element.appendChild(drag.element.querySelector(".note-resize-handle"));
  }
}
function endNotePointer() {
  if (!state.noteDrag) return;
  const moved = state.noteDrag.moved;
  state.noteDrag = null;
  if (moved) renderNotes();
}
function renderKeyboard() {
  const keyboard = $("#keyboard");
  keyboard.innerHTML = "";
  for (let pitch = 84; pitch >= 53; pitch -= 1) {
    const key = document.createElement("div");
    key.className = `key-label ${isBlack(pitch) ? "black" : ""}`;
    key.textContent = pitchLabel(pitch);
    keyboard.appendChild(key);
  }
}
function renderTimeline() {
  const timeline = $("#timeline");
  timeline.innerHTML = "";
  for (let bar = 1; bar <= 4; bar += 1) {
    const label = document.createElement("span");
    label.className = "bar-label";
    label.style.left = `${(bar - 1) * 240 + 8}px`;
    label.textContent = String(bar).padStart(2, "0");
    timeline.appendChild(label);
  }
}
function renderNotes() {
  const roll = $("#pianoRoll");
  roll.querySelectorAll(".note").forEach((note) => note.remove());
  const pixelsPerBeat = (60 * state.zoom) / 100;
  state.notes.forEach((note, index) => {
    const element = document.createElement("div");
    element.className = `note ${isBlack(note.pitch) ? "black-key" : ""}`;
    element.dataset.index = index;
    element.textContent = note.label || pitchLabel(note.pitch);
    element.style.left = `${note.start * pixelsPerBeat + 2}px`;
    element.style.top = `${(84 - note.pitch) * 30 + 4}px`;
    element.style.width = `${Math.max(note.length * pixelsPerBeat - 4, 14)}px`;
    const resizeHandle = document.createElement("span");
    resizeHandle.className = "note-resize-handle";
    resizeHandle.title = "Drag to change note length";
    element.appendChild(resizeHandle);
    element.addEventListener("pointerdown", (event) =>
      beginNotePointer(event, element, note, index),
    );
    resizeHandle.addEventListener("pointerdown", (event) =>
      beginNotePointer(event, element, note, index, "resize"),
    );
    element.addEventListener("click", (event) => {
      event.stopPropagation();
      if (state.noteDrag?.moved) return;
      if (state.tool === "erase") {
        state.notes.splice(index, 1);
        state.selectedNote = -1;
        renderNotes();
      } else {
        state.selectedNote = index;
        $$(".note").forEach((item) => item.classList.remove("selected"));
        element.classList.add("selected");
        playTone(note.pitch, 0.2);
      }
    });
    roll.appendChild(element);
  });
  $("#noteSummary").textContent = `${state.notes.length} notes · 1 bar`;
  if ($("#staffPage")) renderStaff();
}
function renderStaff() {
  const staff = $("#staffPage");
  staff.innerHTML = "";
  for (let measureNumber = 0; measureNumber < 4; measureNumber += 1) {
    const measure = document.createElement("div");
    measure.className = "staff-measure";
    measure.innerHTML = `<span class="staff-number">${String(measureNumber + 1).padStart(2, "0")}</span>${measureNumber === 0 ? '<span class="staff-clef">𝄞</span>' : ""}<span class="staff-lyric">${measureNumber === 0 ? "main motif" : measureNumber === 3 ? "resolve" : " "}</span>`;
    state.notes
      .filter(
        (note) =>
          note.start >= measureNumber * 4 &&
          note.start < (measureNumber + 1) * 4,
      )
      .forEach((note) => {
        const notation = document.createElement("button");
        notation.className = `staff-note ${pitchNames[note.pitch % 12].includes("#") ? "sharp" : ""}`;
        notation.type = "button";
        notation.textContent = note.length >= 2 ? "𝅗𝅥" : "♪";
        notation.title = `${pitchLabel(note.pitch)} · beat ${Math.round(note.start % 4) + 1}`;
        notation.style.left = `${((note.start - measureNumber * 4) / 4) * 100}%`;
        notation.style.top = `${86 - (note.pitch - 72) * 7}px`;
        notation.addEventListener("click", () => {
          state.selectedNote = state.notes.indexOf(note);
          $$(".staff-note").forEach((item) =>
            item.classList.remove("selected"),
          );
          notation.classList.add("selected");
          playTone(note.pitch, 0.2);
        });
        measure.appendChild(notation);
      });
    staff.appendChild(measure);
  }
}
function renderAll() {
  renderKeyboard();
  renderTimeline();
  renderNotes();
  renderStaff();
}
function ensureAudio() {
  if (!state.audioContext)
    state.audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
  if (state.audioContext.state === "suspended") state.audioContext.resume();
  return state.audioContext;
}
function selectedInstrument() {
  return $(".track-card.selected")?.dataset.instrument || "piano";
}
function playTone(pitch, duration = 0.35, instrument = selectedInstrument()) {
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
  oscillator.type = wave;
  oscillator.frequency.setValueAtTime(frequency, now);
  if (instrument === "organ") oscillator.detune.setValueAtTime(12, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(
    instrument === "bass" ? 0.12 : 0.18,
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
function triggerNotesBetween(previousBeat, currentBeat) {
  state.notes.forEach((note) => {
    const wrapped = currentBeat < previousBeat;
    const started = wrapped
      ? note.start > previousBeat || note.start <= currentBeat
      : note.start > previousBeat && note.start <= currentBeat;
    if (started)
      playTone(note.pitch, Math.max(0.15, (note.length * 60) / state.tempo));
  });
}
function setPlaying(playing) {
  state.isPlaying = playing;
  $("#playButton").classList.toggle("playing", playing);
  $("#playIcon").innerHTML = playing ? "&#10074;&#10074;" : "&#9654;";
}
function updateTime() {
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
function startPlayback() {
  if (state.isPlaying) return;
  ensureAudio();
  setPlaying(true);
  if (state.recordedAudio) {
    state.recordedAudio.currentTime = (state.currentBeat * 60) / state.tempo;
    state.recordedAudio.play().catch(() => {});
  }
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
function stopPlayback() {
  setPlaying(false);
  cancelAnimationFrame(state.playTimer);
  if (state.recordedAudio) state.recordedAudio.pause();
}
function addNoteAt(event) {
  if (state.tool === "select" || state.tool === "erase") return;
  const roll = $("#pianoRoll").getBoundingClientRect();
  const pixelsPerBeat = (60 * state.zoom) / 100;
  const pitch = Math.max(
    53,
    Math.min(84, 84 - Math.floor((event.clientY - roll.top) / 30)),
  );
  const start = Math.max(
    0,
    Math.round((event.clientX - roll.left) / pixelsPerBeat / state.grid) *
      state.grid,
  );
  if (
    state.notes.some(
      (note) => note.pitch === pitch && Math.abs(note.start - start) < 0.01,
    )
  )
    return;
  state.notes.push({
    pitch,
    start,
    length: state.grid * 4,
    label: pitchLabel(pitch),
  });
  renderNotes();
}
function variableBytes(value) {
  const bytes = [value & 127];
  while ((value >>= 7)) bytes.unshift((value & 127) | 128);
  return bytes;
}
function exportMidi() {
  const ticks = 480;
  const events = [];
  state.notes.forEach((note) => {
    events.push({
      tick: Math.round(note.start * ticks),
      data: [0x90, note.pitch, 96],
    });
    events.push({
      tick: Math.round((note.start + note.length) * ticks),
      data: [0x80, note.pitch, 0],
    });
  });
  events.sort((a, b) => a.tick - b.tick);
  let previous = 0;
  const track = [];
  events.forEach((event) => {
    track.push(...variableBytes(event.tick - previous), ...event.data);
    previous = event.tick;
  });
  track.push(0, 0xff, 0x2f, 0);
  const header = [77, 84, 104, 100, 0, 0, 0, 6, 0, 0, 0, 1, 1, 224];
  const size = track.length;
  const bytes = [
    ...header,
    77,
    84,
    114,
    107,
    (size >>> 24) & 255,
    (size >>> 16) & 255,
    (size >>> 8) & 255,
    size & 255,
    ...track,
  ];
  const blob = new Blob([new Uint8Array(bytes)], { type: "audio/midi" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${$("#projectTitle").textContent.replace(/\s+/g, "-") || "untitled-session"}.mid`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("MIDI exported from Soft Keys");
}
function readVariable(bytes, cursor) {
  let value = 0;
  let byte;
  do {
    byte = bytes[cursor.index++];
    value = (value << 7) | (byte & 127);
  } while (byte & 128);
  return value;
}
function importMidi(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const bytes = new Uint8Array(reader.result);
    let offset = 0;
    while (
      offset < bytes.length - 3 &&
      String.fromCharCode(...bytes.slice(offset, offset + 4)) !== "MTrk"
    )
      offset += 1;
    if (offset >= bytes.length - 3)
      return showToast("Could not find a MIDI track");
    const length =
      (bytes[offset + 4] << 24) |
      (bytes[offset + 5] << 16) |
      (bytes[offset + 6] << 8) |
      bytes[offset + 7];
    const track = bytes.slice(offset + 8, offset + 8 + length);
    const cursor = { index: 0 };
    let tick = 0;
    let running = 0;
    const active = {};
    const imported = [];
    while (cursor.index < track.length) {
      tick += readVariable(track, cursor);
      let status = track[cursor.index++];
      if (status < 128) {
        cursor.index -= 1;
        status = running;
      } else running = status;
      if (status === 0xff) {
        cursor.index += 1;
        const metaLength = readVariable(track, cursor);
        cursor.index += metaLength;
        continue;
      }
      if ((status & 0xf0) === 0x90 || (status & 0xf0) === 0x80) {
        const pitch = track[cursor.index++];
        const velocity = track[cursor.index++];
        const key = `${pitch}`;
        if ((status & 0xf0) === 0x90 && velocity) active[key] = { pitch, tick };
        else if (active[key]) {
          const start = active[key];
          imported.push({
            pitch,
            start: start.tick / 480,
            length: Math.max((tick - start.tick) / 480, 0.25),
            label: pitchLabel(pitch),
          });
          delete active[key];
        }
      } else if ((status & 0xf0) === 0xc0 || (status & 0xf0) === 0xd0)
        cursor.index += 1;
      else cursor.index += 2;
    }
    if (imported.length) {
      state.notes = imported.slice(0, 120);
      renderNotes();
      showToast(`${state.notes.length} MIDI notes imported`);
    } else showToast("No playable notes found in MIDI");
  };
  reader.readAsArrayBuffer(file);
}

renderAll();
updateTime();
$("#playButton").addEventListener("click", () =>
  state.isPlaying ? stopPlayback() : startPlayback(),
);
$("#stopButton").addEventListener("click", () => {
  stopPlayback();
  state.currentBeat = 0;
  updateTime();
});
$("#rewind").addEventListener("click", () => {
  state.currentBeat = 0;
  updateTime();
});
$("#tempoDown").addEventListener("click", () => {
  state.tempo = Math.max(40, state.tempo - 1);
  $("#tempoValue").textContent = state.tempo;
});
$("#tempoUp").addEventListener("click", () => {
  state.tempo = Math.min(220, state.tempo + 1);
  $("#tempoValue").textContent = state.tempo;
});
$$(".mode-tab").forEach((tab) =>
  tab.addEventListener("click", () => {
    $$(".mode-tab").forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");
    $(".editor-panel").classList.toggle(
      "music-page-active",
      tab.dataset.view === "music-page",
    );
    if (tab.dataset.view === "music-page") renderStaff();
    showToast(
      tab.dataset.view === "music-page"
        ? "Music Page view: all notes visible"
        : "Arrangement view selected",
    );
  }),
);
$$(".tool-button").forEach((button) =>
  button.addEventListener("click", () => {
    state.tool = button.dataset.tool;
    $$(".tool-button").forEach((item) =>
      item.classList.toggle("active", item === button),
    );
  }),
);
$$(".small-control").forEach((button) =>
  button.addEventListener("click", () => {
    state.grid =
      button.dataset.grid === "1/4"
        ? 0.25
        : button.dataset.grid === "1/8"
          ? 0.125
          : 0.0625;
    $$(".small-control").forEach((item) =>
      item.classList.toggle("active", item === button),
    );
  }),
);
$("#pianoRoll").addEventListener("dblclick", addNoteAt);
$(".roll-scroll").addEventListener("scroll", () => {
  $("#keyboard").scrollTop = $(".roll-scroll").scrollTop;
});
$$(".knob[data-inspector]").forEach((knob) =>
  knob.addEventListener("pointerdown", (event) =>
    beginInspectorPointer(event, knob),
  ),
);
document.addEventListener("pointermove", updateNotePointer);
document.addEventListener("pointermove", updateInspectorPointer);
document.addEventListener("pointerup", endNotePointer);
document.addEventListener("pointerup", endInspectorPointer);
$("#zoomSlider").addEventListener("input", (event) => {
  state.zoom = Number(event.target.value);
  $("#zoomValue").textContent = `${state.zoom}%`;
  renderNotes();
});
$("#importMidiButton").addEventListener("click", () => $("#midiInput").click());
$("#midiInput").addEventListener(
  "change",
  (event) => event.target.files[0] && importMidi(event.target.files[0]),
);
$("#exportMidiButton").addEventListener("click", exportMidi);
$("#exportMidiTop").addEventListener("click", exportMidi);
function instrumentLabel(instrument) {
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
function escapeHtml(value) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        character
      ],
  );
}
function selectTrack(card) {
  $$(".track-card").forEach((item) => item.classList.remove("selected"));
  card.classList.add("selected");
  $("#editorTrackTitle").textContent = card.dataset.trackName;
  $("#editorInstrumentLabel").textContent =
    card.dataset.trackKind === "recording"
      ? "AUDIO RECORDER"
      : `${instrumentLabel(card.dataset.instrument)} · MIDI EDITOR`;
}
function renameTrack(card) {
  const currentName = card.dataset.trackName;
  const name = prompt("Rename track", currentName);
  if (!name || !name.trim()) return;
  card.dataset.trackName = name.trim();
  card.querySelector(".track-name").childNodes[0].textContent =
    `${name.trim()} `;
  if (card.classList.contains("selected"))
    $("#editorTrackTitle").textContent = name.trim();
  showToast(`Track renamed to ${name.trim()}`);
}
function deleteTrack(card) {
  if ($$(".track-card").length <= 1)
    return showToast("A session needs at least one track");
  const name = card.dataset.trackName;
  if (!confirm(`Delete ${name}?`)) return;
  const nextTrack = card.nextElementSibling || card.previousElementSibling;
  card.remove();
  if (nextTrack) selectTrack(nextTrack);
  showToast(`${name} deleted`);
}
async function toggleRecording(card, button) {
  if (state.recording?.card === card) {
    state.recording.recorder.stop();
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
    return showToast("Microphone recording is unavailable in this browser");
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    const chunks = [];
    recorder.addEventListener("dataavailable", (event) =>
      chunks.push(event.data),
    );
    recorder.addEventListener("stop", () => {
      stream.getTracks().forEach((track) => track.stop());
      state.recordedAudio = new Audio(
        URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType })),
      );
      state.recordedAudio.volume = 0.8;
      state.recording = null;
      button.classList.remove("active");
      showToast("Recording captured and ready to play");
    });
    recorder.start();
    state.recording = { card, recorder };
    button.classList.add("active");
    showToast("Recording microphone input");
  } catch (error) {
    showToast("Microphone permission was not granted");
  }
}
function bindTrackCard(card) {
  card.addEventListener("click", () => selectTrack(card));
  card.querySelector(".track-menu").addEventListener("click", (event) => {
    event.stopPropagation();
    const action = prompt(
      "Type RENAME to edit this track or DELETE to remove it",
      "RENAME",
    );
    if (action && action.toUpperCase() === "DELETE") deleteTrack(card);
    else if (action && action.toUpperCase() === "RENAME") renameTrack(card);
  });
  card.querySelector(".track-name").addEventListener("dblclick", (event) => {
    event.stopPropagation();
    renameTrack(card);
  });
  card.querySelectorAll("[data-action]").forEach((button) =>
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      if (
        button.dataset.action === "arm" &&
        card.dataset.trackKind === "recording"
      )
        toggleRecording(card, button);
      else button.classList.toggle("active");
    }),
  );
}
$$(".track-card").forEach(bindTrackCard);
function createTrack(kind, name, instrument) {
  const isRecording = kind === "recording";
  const safeName = escapeHtml(name);
  const track = document.createElement("div");
  track.className = "track-card";
  track.dataset.trackName = name;
  track.dataset.trackKind = kind;
  if (!isRecording) track.dataset.instrument = instrument;
  track.innerHTML = `<div class="track-color ${isRecording ? "orange" : "cyan"}"></div><div class="track-card-main"><div class="track-name">${safeName} <span class="track-type">${isRecording ? "AUDIO" : "MIDI"}</span></div><div class="track-meta">${isRecording ? "Microphone · 04" : `${instrumentLabel(instrument)} · 04`}</div></div><button class="track-menu" title="Edit or delete track">···</button><div class="track-buttons"><button class="track-toggle" data-action="mute">M</button><button class="track-toggle" data-action="solo">S</button><button class="track-arm" data-action="arm">REC</button></div>`;
  $("#trackList").appendChild(track);
  bindTrackCard(track);
  selectTrack(track);
  showToast(`${name} track added`);
}
function addTrack() {
  $$(".track-choice").forEach((item) =>
    item.classList.toggle("active", item.dataset.trackKind === "midi"),
  );
  $("#trackForm").dataset.kind = "midi";
  $("#instrumentPicker").style.display = "block";
  $("#recordingOptions").style.display = "none";
  $("#trackNameInput").value = "New MIDI Track";
  $("#trackDialog").showModal();
  $("#trackNameInput").focus();
}
$("#addTrack").addEventListener("click", addTrack);
$("#addTrackBottom").addEventListener("click", addTrack);
$("#trackForm").addEventListener("submit", (event) => {
  event.preventDefault();
  createTrack(
    $("#trackForm").dataset.kind || "midi",
    $("#trackNameInput").value.trim() || "New Track",
    $("#instrumentSelect").value,
  );
  $("#trackDialog").close();
});
$$(".track-choice").forEach((choice) =>
  choice.addEventListener("click", () => {
    $$(".track-choice").forEach((item) => item.classList.remove("active"));
    choice.classList.add("active");
    const recording = choice.dataset.trackKind === "recording";
    $("#trackForm").dataset.kind = choice.dataset.trackKind;
    $("#instrumentPicker").style.display = recording ? "none" : "block";
    $("#recordingOptions").style.display = recording ? "block" : "none";
    $("#trackNameInput").value = recording ? "Mic Recording" : "New MIDI Track";
  }),
);
$("#trackForm").dataset.kind = "midi";
$("#newProject").addEventListener("click", () => {
  state.notes = [];
  state.selectedNote = -1;
  renderNotes();
  $("#projectTitle").textContent = "untitled session";
  showToast("New session created");
});
$("#saveProject").addEventListener("click", () =>
  showToast("Session saved locally"),
);
$("#renameProject").addEventListener("click", () => {
  const name = prompt("Name this session", $("#projectTitle").textContent);
  if (name) $("#projectTitle").textContent = name;
});
function editSelectedNote(event) {
  if (state.selectedNote < 0 || !state.notes[state.selectedNote]) return;
  const note = state.notes[state.selectedNote];
  if (event.key === "ArrowUp") note.pitch = Math.min(96, note.pitch + 1);
  else if (event.key === "ArrowDown") note.pitch = Math.max(24, note.pitch - 1);
  else if (event.key === "ArrowLeft")
    note.start = Math.max(0, note.start - state.grid);
  else if (event.key === "ArrowRight")
    note.start = Math.min(15, note.start + state.grid);
  else if (event.key === "[")
    note.length = Math.max(state.grid, note.length - state.grid);
  else if (event.key === "]")
    note.length = Math.min(4, note.length + state.grid);
  else return false;
  note.label = pitchLabel(note.pitch);
  renderNotes();
  state.selectedNote = Math.min(state.selectedNote, state.notes.length - 1);
  return true;
}
document.addEventListener("keydown", (event) => {
  if (event.code === "Space" && event.target.tagName !== "INPUT") {
    event.preventDefault();
    state.isPlaying ? stopPlayback() : startPlayback();
  }
  if (
    ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "[", "]"].includes(
      event.key,
    ) &&
    event.target.tagName !== "INPUT"
  ) {
    event.preventDefault();
    editSelectedNote(event);
  }
  if (event.key === "Delete") {
    const selected = $(".note.selected");
    if (selected) {
      state.notes.splice(Number(selected.dataset.index), 1);
      state.selectedNote = -1;
      renderNotes();
    }
  }
});
