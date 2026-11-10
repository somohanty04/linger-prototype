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
- **Highlight any word, phrase or sentence** and click the **✦ Explain** button that appears. One word opens the word card below. A phrase or sentence opens the same card with the text in plain words (Linger's phrase rules and easy-word swaps), the sentence it came from with the highlight in bold, and each hard word in it with its meaning and an easier word when there is one. The speaker reads it aloud and the bookmark saves it to the phone app.
- **AI explanations (Claude):** with the Linger AI server running (see `functions/README.md`), cards also ask Claude what the text means *where it appears*. The word card's meaning becomes the meaning in that sentence, with easier words that fit there. The phrase card gets "What it means here", a plain-English version, and hard words explained in context. Until the answer arrives (or if AI is off or unreachable), the cards show Linger's dictionary version. Only the highlighted text and its sentence or paragraph are sent. Turn it off with **AI explanations** in the Linger menu.
- **Ask Linger (page assistant):** a small ✦ button in the bottom-right corner opens a chat about the page. People can ask anything, tap a suggestion ("What is this page about?", "What do I need to do, and by when?", "Help me decide what to do"), and follow up. If they highlight text before opening it, the highlight becomes the topic. Claude answers in plain English from the page's text only, lays out choices, deadlines and what happens if you do nothing, leaves the decision to the reader, and suggests who to ask for legal, money or medical decisions. Each answer has a Read aloud button. Turn the button off with **Ask Linger button** in the Linger menu (it's also hidden when AI explanations are off or Linger is off for the site).
- **Click an underlined word** (or double-click any word) for a card (Linger design system word card): meaning, the word in a sentence (from the page, or a dictionary example when the page only has a heading or label), the same sentence with an easier synonym when there is one (Linger's own word list, or a thesaurus word that the meaning also uses, so it's the right sense), a local note for slang, the speaker icon to hear the word, and the bookmark icon to save it. Words with no dictionary entry get a short red card that says "Not in the dictionary yet." (you can still hear and save them).
- **Explain this page** (toolbar menu): "What this page wants from you" with key dates and amounts. Select text first to explain only that part.
- **The bookmark (Save to Linger)** keeps the word in the menu's Saved list and, once paired, sends it to the phone app's Words tab right away (Firebase).
- **Eye tracking** (toolbar menu, off by default): uses the webcam with Google's MediaPipe face and iris model. It runs **once for the whole browser**, so it works on every tab and website (even ones that block cameras), and you set it up only once. The first time, a setup page opens: check your face and lighting, then follow a dot full screen through 20 spots, plus 5 green check spots that measure accuracy (about 35 seconds). It measures where the iris sits inside each eye *and* how your head is turned and positioned, so small head movements don't throw it off. Reading normally won't trigger it: Linger looks at the last few seconds as a whole, and only asks "Stuck on …?" when your eyes stay in one place (no sweeping across or moving down) for the pause time, or go clearly back up to re-read. It keeps learning: every click (people look at what they click) corrects drift right away and improves the model, and so does every "Yes, explain". The chip at the bottom left says when it can't see your eyes or when you've moved far from where you sat during setup. **Hand swipes**: while it asks "Stuck on …?", swipe your hand to your right for *Yes, explain* or to your left for *No* (the hand tracker only runs while the question is open). Options: **Answer with a hand swipe**, **Show where I'm looking** (a soft dot where it thinks you’re looking) and **More space between lines**. The video never leaves the laptop.
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
- Meanings come from Linger's word list and Wiktionary, synonyms from Linger's list and the Datamuse thesaurus, not AI. "Explain this page" swaps formal words for plain ones in the important sentences.
- Common-word list: google-10000-english (Google Web Trillion Word Corpus), permitted for educational use.

## Files

- `manifest.json`: extension setup (Manifest V3)
- `content.js`: underlining, word card, Explain this page (runs on every page)
- `tracker.html/js`: the eye tracker (camera + MediaPipe face/iris model), one hidden page for the whole browser
- `calibrate.html/css/js`: the eye tracking setup page
- `gazemodel.mjs`: the gaze math (features, calibration fit, smoothing)
- `gaze.js`: on every page; turns the gaze point into "Stuck on …?" prompts and answers them on a hand swipe
- `gestures.mjs`: spots left/right hand swipes from MediaPipe hand landmarks
- `vendor/mediapipe/`: MediaPipe Tasks Vision 0.10.35 and the face and hand landmarker models (Apache 2.0)
- `background.js`: Wiktionary lookups, Datamuse synonyms, saving, sending words to Firestore
- `dict.js`: picks a short meaning and an example sentence from a Wiktionary entry
- `popup.html/css/js`: the toolbar menu
- `words.js`: word data generated from the phone app; `cities.js`: city slang
- `test.html`, `gaze-sim.js`: test page and a noisy-gaze simulation (not included in the zip)
