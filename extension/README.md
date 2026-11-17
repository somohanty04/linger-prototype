# Linger for Chrome

Underlines hard English words on any website, explains them in plain words, and saves them to the Linger phone app. Optional webcam eye tracking offers help when you pause on a line.

## Install (developer mode, for class testing)

1. Download `linger-extension.zip` from https://somohanty04.github.io/linger-prototype/linger-extension.zip and unzip it.
2. In Chrome, open `chrome://extensions` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and choose the unzipped `linger-extension` folder.
4. Pin Linger: click the puzzle-piece icon in the toolbar, then the pin next to Linger.
5. Reload any tabs that were already open.

## What it does

- **Underlines hard words** (turn on **Underline hard words** in the Linger menu; it starts off, so a new install doesn't change any page until you ask) on every page with Linger's orange dotted line: words outside the ~10,000 most common English words, Linger's legal, lease and billing words, and local slang from the city guides. Names, acronyms, links, buttons and text boxes are skipped.
- **Hard words show as** (Linger menu, or **Alt+Shift+L** on any page to cycle): the original words, **easier English**, or **your language**, swapped right in the text with a green underline (hover to see the original; click for the original word's card). Linger's own plain-word list answers many words instantly, Chrome's on-device translator does your language when it can, and the rest go to Claude in batches of 60 words, what's on screen first. Answers are remembered, so the next page is faster.
- **Highlight any word, phrase or sentence** (works with underlines on or off) and click the **✦ Explain** button that appears. One word opens the word card below. A phrase or sentence opens the same card with the text in plain words (Linger's phrase rules and easy-word swaps), the sentence it came from with the highlight in bold, and each hard word in it with its meaning and an easier word when there is one. The speaker reads it aloud and the bookmark saves it to the phone app.
- **AI explanations (Claude):** off until you allow them. The first word card or highlight asks "Explain this with AI?" and says what is sent (the selected text and the sentence around it) before anything goes to Claude; "Not now" keeps the dictionary-only cards, and the choice is remembered (`aiConsent` in chrome.storage, kept apart from the `aiOn` switch, so an older `aiOn: true` doesn't count as consent). The AI explanations switch in the menu asks the same question when turned on. Every AI request, including hover prefetch, eye tracking, word swaps, translation and Ask Linger, is checked in `background.js` (`aiAllowed`). With the Linger AI server running (see `functions/README.md`), cards also ask Claude what the text means *where it appears*. The word card's meaning becomes the meaning in that sentence, with easier words that fit there. The phrase card gets "What it means here", a plain-English version, and hard words explained in context. Until the answer arrives (or if AI is off or unreachable), the cards show Linger's dictionary version. To keep cards fast, Linger starts the lookup while your pointer rests on an underlined word (and when eye tracking asks "Want help with this word?"), and keeps the last 500 AI answers on the laptop, so words you've met before open instantly. Only the highlighted text and its sentence or paragraph are sent. Turn it off with **AI explanations** in the Linger menu.
- **In your language:** with **My language** set, the Linger menu and the Ask Linger panel show their buttons and messages in that language (translated once, then remembered), and Ask Linger answers in that language, giving the page's key English words in brackets so you can find them.
- **Ask Linger (page assistant):** a small ✦ button in the bottom-right corner opens a chat about the page. People can ask anything, tap a suggestion ("What is this page about?", "What do I need to do, and by when?", "Help me decide what to do"), and follow up. If they highlight text before opening it, the highlight becomes the topic. Claude answers in plain English from the page's text only, lays out choices, deadlines and what happens if you do nothing, leaves the decision to the reader, and suggests who to ask for legal, money or medical decisions. Each answer has a Read aloud button. Turn the button off with **Ask Linger button** in the Linger menu (it's also hidden when AI explanations are off or Linger is off for the site).
- **Click an underlined word** (or double-click any word) for a card (Linger design system word card): meaning, the word in a sentence (from the page, or a dictionary example when the page only has a heading or label), the same sentence with an easier synonym when there is one (Linger's own word list, or a thesaurus word that the meaning also uses, so it's the right sense), a local note for slang, the speaker icon to hear the word, and the bookmark icon to save it. Words with no dictionary entry get a short red card that says "Not in the dictionary yet." (you can still hear and save them).
- **Translation** (toolbar menu → Translation): pick **My language** (40+ languages, including Arabic, Dari, Pashto, Somali, Tigrinya, Haitian Creole, Karen and Burmese). Every word and highlight card also has a **🌐 language menu**, so you can pick or switch the language right on the card (it becomes your My language too). Word cards and highlight cards then add an **In <your language>** box: the word and its sentence (or the highlighted text) translated. **Translate this page** swaps the page's text for your language and puts a **Show original** bar at the top; underlines come off while it's translated and come back after. If the page is already in your language, it translates into English instead. Translation uses Chrome's built-in translator (Chrome 138+): it runs on the laptop, is free, and nothing is sent anywhere. The first time you use a language Chrome downloads it (a few seconds; the menu shows progress). When Chrome's translator can't do a language here, Claude translates instead (only when **AI explanations** is on): cards one at a time, whole pages in batches. Claude also explains idioms and official terms. **Highlight text in any language** (a page Linger translated, or one written in another language) and press **✦ Explain**: the card shows it in English, the original English from the page when Linger translated it, and what it means, also in your language.
- **Explain this page** (toolbar menu): "What this page wants from you" with key dates and amounts. Select text first to explain only that part.
- **The bookmark (Save to Linger)** keeps the word in the menu's Saved list and, once paired, sends it to the phone app's Words tab right away (Firebase).
- **Eye tracking** (toolbar menu, off by default): uses the webcam with Google's MediaPipe face and iris model. It runs **once for the whole browser**, so it works on every tab and website (even ones that block cameras), and you set it up only once. The first time, a setup page opens: check your face and lighting, then follow a dot full screen through 20 spots, plus 5 green check spots that measure accuracy (about 35 seconds). It measures where the iris sits inside each eye *and* how your head is turned and positioned, so small head movements don't throw it off. Reading normally won't trigger it: Linger looks at the last few seconds as a whole, and only asks "Want help with this word?" when your eyes stay in one place (no sweeping across or moving down) for the pause time, or go clearly back up to re-read. It keeps learning: every click (people look at what they click) corrects drift right away and improves the model, and so does every "Yes, explain". The chip at the bottom left says when it can't see your eyes or when you've moved far from where you sat during setup. **Hand swipes**: while it asks "Want help with this word?", swipe your hand to your right for *Yes, explain* or to your left for *No* (the hand tracker only runs while the question is open). Options: **Answer with a hand swipe**, **Show where I'm looking** (a soft dot where it thinks you’re looking) and **More space between lines**. The video never leaves the laptop.
- **Toolbar menu**: the main **Linger** switch (off on every website: no underlines, swapped words, ✦ button or eye tracking, the camera turns off, and the toolbar icon shows OFF), underline on/off, translation language and Translate this page, turn off for this site, bigger words, eye tracking with sensitivity and recalibrate, phone pairing, saved words.

## If eye tracking doesn't start

- **Camera access was blocked** (on the setup page): click the camera icon in the address bar → Allow, then press Turn on camera again. On a Mac, also check System Settings → Privacy & Security → Camera → Google Chrome.
- **The camera is busy**: close Zoom, FaceTime or other apps using it.
- **"Linger couldn't see your eyes well enough"**: add light in front of you (a window or lamp), sit about an arm's length away, and calibrate again.
- **"Sit like you did when you set it up"**: you've moved a lot closer, farther or to the side. Move back, or press Recalibrate.
The menu shows the last problem under Eye tracking.

## If Linger stops working on a page

- **After installing or updating Linger**, it now adds itself to tabs that were already open, so you don't have to reload them. If a page still shows **"Linger was updated. Reload this page"**, press Reload.
- **"Linger AI didn't answer this time"** on a card: the AI server was busy or the connection dropped (Linger already retried once). The card shows the dictionary meaning instead. Click the word again to retry.
- **Turning Linger off everywhere**: use the **Linger** switch at the top of the menu. **On this site** only turns it off for the site you're on, so Linger comes back on other sites.
- **Turning Linger off** on `chrome://extensions` now also clears it from tabs that were already open within a couple of seconds (underlines, swapped words and the ✦ button), instead of the old copy carrying on.
- **No ✦ Ask Linger button**: it only shows when **AI explanations**, **Ask Linger button** and **On this site** are all on. The Linger menu now says which one is off. If a site removes the button, Linger puts it back within a couple of seconds. If the menu says **Reload this page to use the new version**, that tab still runs an older copy.

## Pair with the phone

In the Linger phone app, open **Words → Turn on live sync** and type the 12-character code into the extension's **Your phone** box.

## Limits

- Doesn't run on Chrome's built-in PDF viewer, Google Docs (text is drawn, not real text) or Chrome's own pages.
- Webcam eye tracking is about as accurate as a finger pointing: good enough to tell which line you're on with normal text, not which letter. More space between lines helps.
- Meanings come from Linger's word list and Wiktionary, synonyms from Linger's list and the Datamuse thesaurus, not AI. "Explain this page" swaps formal words for plain ones in the important sentences.
- Whole-page translation translates each piece of text separately, so a sentence split by a link or bold word can read a little choppy, and content a page adds after translating (infinite scroll, new emails) stays in the original language. Chrome's translator picks one meaning for a single word; the translated sentence under it shows the sense used here.
- Common-word list: google-10000-english (Google Web Trillion Word Corpus), permitted for educational use.

## Files

- `manifest.json`: extension setup (Manifest V3)
- `content.js`: underlining, word card, Explain this page (runs on every page)
- `tracker.html/js`: the eye tracker (camera + MediaPipe face/iris model), one hidden page for the whole browser
- `calibrate.html/css/js`: the eye tracking setup page
- `gazemodel.mjs`: the gaze math (features, calibration fit, smoothing)
- `gaze.js`: on every page; turns the gaze point into "Want help with this word?" prompts and answers them on a hand swipe
- `gestures.mjs`: spots left/right hand swipes from MediaPipe hand landmarks
- `vendor/mediapipe/`: MediaPipe Tasks Vision 0.10.35 and the face and hand landmarker models (Apache 2.0)
- `background.js`: Wiktionary lookups, Datamuse synonyms, saving, sending words to Firestore
- `dict.js`: picks a short meaning and an example sentence from a Wiktionary entry
- `popup.html/css/js`: the toolbar menu
- `langs.js`: the languages Linger can translate into (shared by the menu and the page script)
- `words.js`: word data generated from the phone app; `cities.js`: city slang
- `test.html`, `gaze-sim.js`: test page and a noisy-gaze simulation (not included in the zip)
