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
- Music Page view with a labeled piano roll showing every MIDI note.
- Select, pencil, and erase tools with 1/16, 1/8, and 1/4 grid options.
- Standard MIDI file import for note tracks and MIDI export from the current piano roll.
- Local session naming, save feedback, zoom, inspector controls, mixer faders, and session notes.
