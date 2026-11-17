# Linger

**Your pause is the search bar.**

Linger is a reading companion for people who read English as a second language and recently moved to the US. When you linger on a word you don't know, Linger offers to explain it: what it means in that sentence, easier words that fit, how people use it locally, and the same thing in your own language. It saves the word to your account so you can review it later on your phone or laptop.

Version 2 has two parts that share one account:

- **The Chrome extension** for reading websites, emails and online letters on a laptop. This is where the webcam eye tracking runs.
- **The phone web app** for scanning paper letters and signs, reviewing saved words, and the local city guide.

## How to open it

### Phone app

- **Open:** https://somohanty04.github.io/linger-prototype/
- **Device:** a phone, in Safari on iPhone or Chrome on Android. On a laptop the same link shows the app inside a phone-sized frame, which works for a demo but not for scanning.
- **First launch:** three setup questions (what you read, your languages, your English level, with an optional four-minute English check). Every question has **Skip**.
- **Optional:** add it to your home screen (Safari: Share → Add to Home Screen; Chrome: menu → Install app). On Android, installing also adds Linger to the Share menu of other apps.
- **Account:** tap the profile picture at the top right to sign in or create an account. Your words, setup and progress then follow you to other devices.

### Chrome extension

- **Device:** a laptop or desktop computer with Google Chrome (Mac, Windows or ChromeOS). Chrome on phones doesn't support extensions. Eye tracking needs a webcam. Translating into your language on the laptop itself needs Chrome 138 or newer.
- **Install:**
  1. Download [linger-extension.zip](https://somohanty04.github.io/linger-prototype/linger-extension.zip) and unzip it.
  2. In Chrome, open `chrome://extensions` and turn on **Developer mode** (top right).
  3. Click **Load unpacked** and choose the unzipped `linger-extension` folder.
  4. Pin Linger: click the puzzle-piece icon in the toolbar, then the pin next to Linger.
  5. Open any article or online letter. Click the Linger icon to turn things on.
- The prototype site also has a step-by-step guide: **Get the Chrome extension →** next to the phone.
- **Try first:** highlight a word or sentence and click **✦ Explain**. Then try **Underline hard words**, **My language**, **Ask Linger** (the ✦ button in the corner), and **Offer help when I pause** (eye tracking, with a one-time 35-second setup and a reading test; called "Notice when I'm stuck" in the older download).

More detail: [extension/README.md](extension/README.md).

### Run it on your own computer

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000 in a browser. Add `?accounttest=1` to try accounts without Firebase (a stand-in that keeps everything in this browser).

## What's real and what's still faked

| Part | Status |
|---|---|
| Eye tracking in the Chrome extension | **Real.** The webcam and Google's MediaPipe face and iris model run on the laptop; video never leaves it. It's accurate to about a line of text, not a single letter, so it uses the line you're on to guess the word, and always asks "Want help with this word?" before explaining. |
| Eye tracking on the phone | **Faked.** Tapping a word stands in for your eyes pausing on it. Phones don't let one app track your gaze while you read in another app. |
| Reading inside Instagram, TikTok or other phone apps | **Not possible on iPhone.** iOS doesn't let Linger draw over other apps or see which word you tap. Instead, share text to Linger, paste it, or scan a screenshot. |
| AI explanations, Ask Linger and translation | **Real.** Claude (Haiku 5.5) through Linger's server (`functions/`). The API key stays on the server. |
| The phone app's "Explain" summary of a letter | **Partly faked.** It's built by rules (swapping formal words for plain ones), not by AI. |
| Word meanings on the phone | Hand-written for the sample texts; other words come from Wiktionary. |
| Sample content | The lease letter, café sign, saved words and the seven city guides on Local are written by us. The **Pause map** on Local uses made-up data. |
| Accounts and sync | **Real** (Firebase) for the phone app. The extension still links to the phone with a 12-character pairing code, not the account. |
| Learning model and English check | **Real code, not yet validated.** The English check picked the right level 92% of the time in simulations, not with real learners. |

## Change log: v1 → v2

**v1** is the version we used in concept testing (P1–P6, November 2–4). **v2** is `main` as of November 16 (extension 0.7.6).

### Chrome extension

- **Word card redesigned:** synonym chips at the top, and a new, much simpler example sentence (never the page's own sentence). *Why:* P4 and P5 asked for synonyms, P3 wanted a different example each time, and the 11/10 critique asked for "synonyms at the top first as chips" and less text.
- **Highlight a phrase or sentence to explain it**, with a plain-English version and its hard words. *Why:* P1, P2 and P5 said the confusion is often the whole sentence, not one word.
- **AI meaning in context (Claude).** *Why:* P3 found dictionary definitions that "just restate the word", and P1 and P2 already paste whole sentences into AI. Explaining in place removes the copy-and-paste step they found inconvenient.
- **Ask Linger:** a chat about the page you're on, for "what does this letter want from me, and by when?" and help deciding what to do.
- **Translation:** pick **My language** (43 languages) for an "In your language" box on every card, **Translate this page**, and an option to show hard words in easier English or your language. *Why:* P5 and P6 asked for their own language; Dan suggested switching hard words into the reader's language.
- **Underlines start off.** Highlighting works without them. *Why:* in the critique, a reviewer said underlines would bother her the way Grammarly's do; P4 asked why words he knew were underlined.
- **Eye tracking:** typical error went from about 140px to 80px; blinks no longer throw the gaze off; a soft dot shows where it thinks you're looking; you can answer Linger's question with a hand swipe; and a reading test (Task A, read normally; Task B, pause on purpose) measures how often it's right. *Why:* our instructors questioned whether laptop eye tracking was good enough, and the critique suggested gestures.
- **A main Linger switch** turns it off on every website, and the menu is smaller and matches our Figma design system.

### Phone app

- **Onboarding** asks what you read, your languages and your English level, with an optional English check. Your level decides which words count as hard. *Why:* the critique suggested "a test at the beginning" and "more specific settings".
- **Accounts:** saved words, setup and progress sync between phone and laptop, with a profile picture. *Why:* the critique said "saving to phone" should be "save to account", and we kept hearing that people shouldn't start as a new user every time.
- **Learning model** (`learn.js`): repeated lookups, flashcard answers (**I knew it** / **Still learning**) and story results estimate which words you know. Words show Learning, Almost or Known, Review shows what's due, and Linger stops underlining words you know. *Why:* P2 wanted to mark words as known; Dan asked how Linger notices when someone keeps looking up the same word.
- **Lens redesigned:** one screen with a Scan / Upload a photo / Paste text switch. Uploading and pasting happen in the card instead of on separate pages, and the camera has a front/back switch. *Why:* the critique and P5 found v1 text-heavy and repetitive.
- **Scanning reads photos much better:** words read correctly went from 87% to 98% on a 1080p camera, and from 58% to 82% on a shadowed close-up. Junk words on the shadowed close-up dropped from 123 to 8.
- **Words, Local and Review share one layout:** a toggle switch for filters, fewer emojis, no side stripes or shadows on cards, and a sheet you can drag up to fill the screen. *Why:* the critique and P5 said there was too much text; Local felt busy and hard to scan.
- **Removed:** the WhatsApp helper and the smart-glasses demo. *Why:* P3 couldn't work out the glasses view or the laptop pause test, and they pulled attention from reading help.

### Ethical audit fixes (merged November 16)

From [pull request #19](https://github.com/somohanty04/linger-prototype/pull/19) and [pull request #20](https://github.com/somohanty04/linger-prototype/pull/20):

- AI explanations off until you allow them, with an accurate list of what's sent.
- Eye-tracking wording changed to "Offer help when I pause" and "Want help with this word?".
- A note about what syncing shares.
- **Delete account and data** in the phone app.
- WCAG 2.2 AA colour contrast and keyboard access across the app and extension.

The phone app changes are live. The extension changes are in `extension/`, but `linger-extension.zip` hasn't been rebuilt yet, so the download is still the older 0.7.6 (AI explanations on by default, "Notice when I'm stuck"). Until it's rebuilt, use **Load unpacked** on the `extension/` folder from this repository to get them.

## What we learned from the team-to-team critique (November 10)

Two reviewers each watched a demo and gave feedback.

**What landed:**
- The first reviewer said "wooo" when the definition pop-up appeared, liked the AI chatbot, and really liked the plain-English paraphrase.
- The second reacted to highlighting a phrase to explain it, the chatbot, uploading a photo and the word game.

**What they pushed on, and what we did:**

| Feedback | What we changed |
|---|---|
| Put synonyms first, as chips, in the definition pop-up. | Done: synonym chips sit right under the meaning. |
| Too much text; group it into sections or make it smaller. | New word card layout; cleaned up Lens, Local and Review. |
| Underlining would bother her, like Grammarly. | Underlines start off; highlight to explain works without them. |
| She might feel pressured to keep reading, or "called out" when Linger pops up on a word. | Eye tracking stays off unless you turn it on, the pause time is adjustable, and Linger asks before explaining. After the ethical audit the switch is called "Offer help when I pause" and the question is "Want help with this word?" |
| Set a level, maybe with a test at the beginning. | Onboarding with an English level and an optional English check. |
| It doesn't need to be an App Store app: one website for phone and laptop, with the computer as the focus, and "save to account" instead of "save to phone". | The phone app stays a web app, the extension became the main reading tool, and accounts sync across devices. |
| Eye tracking is hard; add gestures (finger pointing was seen as unstable). | Hand swipes to answer yes or no. Zoom and next-page gestures aren't built. |
| Most people already send PDFs and websites to AI, so where is Linger used day to day? Maybe email. | The extension works on webmail and any website, and Ask Linger answers questions about the page without copying it into another app. |
| No subtitles in the cinema: an audio transcript? | Not built; kept as a stretch idea. |

**What we decided not to change yet:** whether to keep eye tracking at all. The second reviewer wasn't sure she'd use it even if it worked well, and the first wanted gestures to make it steadier. We kept it, but optional and off by default, so Linger is useful by highlighting alone, and the reading test measures whether the webcam version is good enough to keep.

## Other parts of this repository

- `reader.html`: the original laptop pause test (WebGazer.js), with a QR code and live sync to send words to the phone.
- `mac/`: Linger for Mac, a menu-bar app that explains the word under the mouse in any Mac app. See [mac/README.md](mac/README.md).
- `functions/`: the AI server (Firebase Cloud Function calling Claude). See [functions/README.md](functions/README.md).
- [ACCOUNTS.md](ACCOUNTS.md): how accounts and sync work, and how to test them with the Firebase emulators.
- `cities.js`: the Local city guides. `entest.js`: the English check. `learn.js`: the learning model.
