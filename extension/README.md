# Linger for Chrome

Underlines hard English words on any website, explains them in plain words, and saves them to the Linger phone app. Optional webcam eye tracking notices when you're stuck on a line.

## Install (developer mode, for class testing)

1. Download `linger-extension.zip` from https://somohanty04.github.io/linger-prototype/linger-extension.zip and unzip it.
2. In Chrome, open `chrome://extensions` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and choose the unzipped `linger-extension` folder.
4. Pin Linger: click the puzzle-piece icon in the toolbar, then the pin next to Linger.
5. Reload any tabs that were already open.

## What it does

- **Underlines hard words** on every page with Linger's orange dotted line: words outside the ~10,000 most common English words, Linger's legal, lease and billing words, and local slang from the city guides. Names, acronyms, links, buttons and text boxes are skipped.
- **Click an underlined word** (or double-click any word) for a card: meaning, the sentence in plain English, local note for slang, 🔊 Hear it, ★ Save to Linger.
- **Explain this page** (toolbar menu): "What this page wants from you" with key dates and amounts. Select text first to explain only that part.
- **Save to Linger** keeps the word in the menu's Saved list and, once paired, sends it to the phone app's Words tab right away (Firebase).
- **Eye tracking** (toolbar menu, off by default): uses the webcam with WebGazer. Follow the dot through 16 spots (about 20 seconds); an accuracy check then says if it's ready. Reading normally won't trigger it: Linger looks at the last few seconds as a whole, and only asks "Stuck on …?" when your eyes stay in one place (no sweeping across or moving down) for the pause time, or go clearly back up to re-read. It keeps learning from your clicks and from every "Yes, explain". Options: **Show where I'm looking** (a light bar under the line it thinks you're reading) and **More space between lines** (easier for the webcam to tell lines apart). Answers are logged on this computer; the video never leaves the laptop.
- **Toolbar menu**: underline on/off, turn off for this site, bigger words, eye tracking with sensitivity and recalibrate, phone pairing, saved words.

## If eye tracking doesn't start

Linger now shows each step ("Starting the camera…", "Loading eye tracking…", "Looking for your face…") and a clear message if something blocks it:
- **Camera access is blocked**: click the camera icon at the right of the address bar → Always allow, then turn eye tracking on again. Also check macOS: System Settings → Privacy & Security → Camera → Google Chrome is on.
- **This website blocks the camera**: some sites (often Google and banking sites) don't allow cameras at all. Try the test page: https://somohanty04.github.io/linger-prototype/extension/test.html
- **The camera is busy**: close Zoom, FaceTime or other apps using it.
- **Loading takes a while** the first time (the face model downloads, 10–20 s).
The menu shows the last problem under Eye tracking.

## Pair with the phone

In the Linger phone app, open **Words → Turn on live sync** and type the 12-character code into the extension's **Your phone** box.

## Limits

- Doesn't run on Chrome's built-in PDF viewer, Google Docs (text is drawn, not real text) or Chrome's own pages.
- Eye tracking asks for camera permission on each website, and may not start on sites with strict security settings.
- Meanings come from Linger's word list and Wiktionary, not AI. "Explain this page" swaps formal words for plain ones in the important sentences.
- Common-word list: google-10000-english (Google Web Trillion Word Corpus), permitted for educational use.

## Files

- `manifest.json`: extension setup (Manifest V3)
- `content.js`: underlining, word card, Explain this page (runs on every page)
- `gaze.js` + `vendor/webgazer.js`: eye tracking, injected only when turned on
- `background.js`: Wiktionary lookups, saving, sending words to Firestore
- `popup.html/css/js`: the toolbar menu
- `words.js`: word data generated from the phone app; `cities.js`: city slang
- `test.html`, `gaze-sim.js`: test page and a noisy-gaze simulation (not included in the zip)
