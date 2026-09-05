# JOSHUEWOKS Studio

Personal, no-admin browser DAW MVP. It is a static app with no build step or account requirement.

## Run

Open `index.html` directly in a browser, or serve this folder locally:

```sh
python3 -m http.server 4173
```

Then visit `http://localhost:4173`.

## Included

- Transport controls with tempo, playhead, beat counter, and keyboard Space shortcut.
- Track list with add, select, mute, solo, and record-arm states.
- Track creation dialog with MIDI instrument tracks or microphone recording tracks.
- MIDI instrument choices: Grand Piano, Bright Synth, Sub Bass, Warm Organ, and Digital Pluck.
- Web Audio playback and note preview directly in the browser; microphone recordings can be played back with the transport.
- Music Page view with treble-clef sheet music, five-line staff systems, measure bars, and note placement from MIDI timing and pitch.
- Select, pencil, and erase tools with 1/16, 1/8, and 1/4 grid options. Select a note and use arrow keys to transpose or move it; `[` and `]` change its length.
- In Arrangement, drag notes to move them and drag the right edge to resize them. Pitch labels stay aligned while the piano roll scrolls.
- Each MIDI track keeps its own notes. Select a track, draw or import notes, then select another track to edit a different part. Playback schedules all unmuted tracks together using each track's instrument.
- Audio clips in audio track cards can be dragged horizontally to move their start beat.
- Track `M` and `S` buttons now control mute and solo during playback; mixer faders change synthesized channel and master volume.
- Inspector knobs are draggable and session notes use a multiline textarea that preserves spaces.
- Transport and note-editing keyboard shortcuts pause while typing in Session Notes or other form fields.
- Standard MIDI file import for note tracks and MIDI export from the current piano roll.
- Local session naming, save feedback, zoom, inspector controls, mixer faders, and session notes.

## Code Layout

- `src/main.js` wires the UI and editor behavior.
- `src/core.js` contains shared state and helpers.
- `src/audio.js` contains browser audio playback.
- `src/midi.js` contains MIDI import/export.
- `styles/studio.css` contains the visual system.

See `src/README.md` for the source map.
