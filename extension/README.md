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
- **Eye tracking** (toolbar menu, off by default): uses the webcam with WebGazer. Follow the dot for about 15 seconds, then read. If you stay on a line for a few seconds (adjustable) or go back to re-read it, Linger asks "Stuck on …?" and opens the card. Answers are logged on this computer so the team can see how often it was right. The video never leaves the laptop.
- **Toolbar menu**: underline on/off, turn off for this site, bigger words, eye tracking with sensitivity and recalibrate, phone pairing, saved words.

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
- `test.html`: a test page that loads `content.js` without Chrome extension features
