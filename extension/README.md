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
- **Eye tracking** (toolbar menu, off by default): uses the webcam with Google's MediaPipe face and iris model. It runs **once for the whole browser**, so it works on every tab and website (even ones that block cameras), and you set it up only once. The first time, a setup page opens: check your face and lighting, then follow a dot full screen through 20 spots, plus 5 green check spots that measure accuracy (about 35 seconds). It measures where the iris sits inside each eye *and* how your head is turned and positioned, so small head movements don't throw it off. Reading normally won't trigger it: Linger looks at the last few seconds as a whole, and only asks "Stuck on …?" when your eyes stay in one place (no sweeping across or moving down) for the pause time, or go clearly back up to re-read. It keeps learning: every click (people look at what they click) corrects drift right away and improves the model, and so does every "Yes, explain". The chip at the bottom left says when it can't see your eyes or when you've moved far from where you sat during setup. Options: **Show where I'm looking** (a light bar under the line it thinks you're reading) and **More space between lines**. The video never leaves the laptop.
- **Toolbar menu**: underline on/off, turn off for this site, bigger words, eye tracking with sensitivity and recalibrate, phone pairing, saved words.

## If eye tracking doesn't start

- **Camera access was blocked** (on the setup page): click the camera icon in the address bar → Allow, then press Turn on camera again. On a Mac, also check System Settings → Privacy & Security → Camera → Google Chrome.
- **The camera is busy**: close Zoom, FaceTime or other apps using it.
- **"Linger couldn't see your eyes well enough"**: add light in front of you (a window or lamp), sit about an arm's length away, and calibrate again.
- **"Sit like you did when you set it up"**: you've moved a lot closer, farther or to the side. Move back, or press Recalibrate.
The menu shows the last problem under Eye tracking.

## Pair with the phone

In the Linger phone app, open **Words → Turn on live sync** and type the 12-character code into the extension's **Your phone** box.

## Limits

- Doesn't run on Chrome's built-in PDF viewer, Google Docs (text is drawn, not real text) or Chrome's own pages.
- Webcam eye tracking is about as accurate as a finger pointing: good enough to tell which line you're on with normal text, not which letter. More space between lines helps.
- Meanings come from Linger's word list and Wiktionary, not AI. "Explain this page" swaps formal words for plain ones in the important sentences.
- Common-word list: google-10000-english (Google Web Trillion Word Corpus), permitted for educational use.

## Files

- `manifest.json`: extension setup (Manifest V3)
- `content.js`: underlining, word card, Explain this page (runs on every page)
- `tracker.html/js`: the eye tracker (camera + MediaPipe face/iris model), one hidden page for the whole browser
- `calibrate.html/css/js`: the eye tracking setup page
- `gazemodel.mjs`: the gaze math (features, calibration fit, smoothing)
- `gaze.js`: on every page; turns the gaze point into "Stuck on …?" prompts
- `vendor/mediapipe/`: MediaPipe Tasks Vision 0.10.35 and the face landmarker model (Apache 2.0)
- `background.js`: Wiktionary lookups, saving, sending words to Firestore
- `popup.html/css/js`: the toolbar menu
- `words.js`: word data generated from the phone app; `cities.js`: city slang
- `test.html`, `gaze-sim.js`: test page and a noisy-gaze simulation (not included in the zip)
