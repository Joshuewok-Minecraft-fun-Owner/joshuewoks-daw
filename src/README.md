# Source Map

- `main.js` wires the editor UI, track actions, note editing, inspector controls, and transport buttons.
- `core.js` owns shared state, DOM helpers, pitch labels, notifications, and safe track-name text.
- `audio.js` owns Web Audio synthesis, note preview, playback scheduling, and recorded-audio playback.
- `midi.js` owns MIDI file import, export, and variable-length event parsing.
- `../styles/studio.css` owns the complete studio layout, Arrangement piano roll, Music Page, dialog, inspector, and responsive styling.

The app is loaded from `index.html` as an ES module, so changes to a source file are picked up after a browser refresh when served over localhost.
