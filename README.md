# Linger

Linger is an AI reading helper for adults who are learning English and new to the US. It turns hard English into plain English: confusing words, local slang, and official letters, bills and forms.

You can use it in several ways:

- **Highlight** any word, phrase or sentence, and Linger explains what it means in that context, in simple words, with easier words you could use instead.
- **Ask** the AI assistant questions about a whole page, or get help deciding what to do (for example, how to respond to a letter from a landlord).
- **Scan** anything with words with your phone camera, and Linger reads it and explains it.
- **Translate:** see meanings in your own language, or translate a whole page.
- **Listen:** Linger can read text and answers out loud.
- **Save and practice** the words you meet. Your words, setup and progress stay in your account, so they're the same on your phone and laptop.

There are two parts: a phone web app and a Chrome extension.

## 1. Phone app

**How to open it:** go to https://somohanty04.github.io/linger-prototype/

**Which device:** best on a phone, in Safari or Chrome. On a laptop, the app shows inside a phone frame. That works for a demo, but not for scanning.

**What to try:**

- **Set up:** tap the profile picture at the top right. Linger asks what you read, your languages and your English level. If you're not sure of your level, take the four-minute English check. You can skip any question.
- **Account:** sign in from the same place to keep your words on every device. You can also delete your account and data there.
- **Lens:** scan with the camera, upload a photo, or paste text. Tap any word for its meaning, what it means in that sentence, easier words and an example (Linger AI); press and drag across words to explain a whole phrase. Switch the card, or the whole text, into your language. On a photo or screenshot you tap the words right on the picture (switch to **Text** for plain text).
- **Explain this letter:** a plain-English summary of what the letter wants from you, with key dates. It can read the summary out loud.
- **Words:** the words you save, each marked Learning, Almost or Known. The week at the top works like a calendar: swipe it or use the arrows to move between weeks, tap a day to see the words you saved that day (days with a dot have words), or tap the calendar icon for a month view.
- **Local:** a city guide with slang, customs, getting around and common mix-ups for 18 U.S. cities, including San Diego. Search for any other U.S. city and Linger AI writes a guide for it.
- **Profile** (the picture at the top right): your progress toward the next level, words known/almost/learning, your streak and best scores, your account, and connecting the Chrome extension (it syncs by itself when you're signed in to the same account; a code is the backup).
- **Settings:** text size, display zoom, light/dark mode, high contrast, color filters and reduce motion.
- **Review:** Flashcards, then games: Fill in the story, Match up, Bubble catch, Unscramble, Say it (pronunciation) and a quiz on your city. Before a word game, pick the words or tap **Surprise me**.

## Phone beta (for testers)

**Link to send testers:** https://somohanty04.github.io/linger-prototype/beta/

It's the same app as the phone prototype, set up for real use on a phone:

- Opens full screen from the Home Screen, like an app (iPhone: Safari → Share → **Add to Home Screen**; Android: Chrome → ⋮ → **Install app**). The app offers this once, and it's also in Settings.
- A **Beta** label, and the version in **Settings → Beta**.
- **Send feedback** in Settings: testers pick "Something broke", "An idea" or "Something else", and can leave an email. Each message is saved in Firestore under `feedback`, with the app version and phone type. Only you can read it, in the Firebase console. If the phone is offline, the message waits and sends later.
- Works offline for screens already opened (AI explanations still need the internet).

The beta's files are `beta/index.html`, `beta/manifest.webmanifest` and `beta.js`. Everything else is shared with the prototype, so a change to the app shows up in both. To release a new beta version, change `version` in `beta/index.html` and bump the `?v=` numbers.

**Before testers use feedback**, deploy the new Firestore rule once: `firebase deploy --only firestore:rules`.

## 2. Chrome extension

**How to open it:** on the website above, click **Get the Chrome extension** and follow the steps: download, unzip, then in `chrome://extensions` turn on Developer mode and click **Load unpacked**.

**Which device:** a laptop or desktop computer with Google Chrome.

**What to try:**

- Highlight any word or sentence and click **✦ Explain**. The first time, Linger asks before it sends anything to AI.
- Pick **My language** in the Linger menu to see an "In your language" box on every card. You can also translate the whole page.
- Turn on **Underline hard words** to mark hard words on any page. Click one to see what it means in that sentence.
- Click the ✦ button in the corner to ask questions about the page.
- Sign in under **Sync with your phone** in the Linger menu (the same account as the phone app). Then click the bookmark on a card, and the word shows up in Words on your phone.

## What's real and what's faked

**Real (working):**

- AI explanations, translation and the ✦ assistant. They use Claude through a small server we set up.
- Reading text from camera photos.
- Accounts: your words, setup and progress sync between devices.
- Saving words from the laptop to the phone.

**Faked or simplified:**

- **Eye tracking on the phone:** tapping a word stands in for it.
- **Reading inside other apps:** iPhone doesn't let Linger read inside apps like Instagram, so share, paste or screenshot the text instead.
- **Letter summaries in the phone app** are made by simple rules, not AI.
- **Sample content:** it's set in Pittsburgh.
- **Learning model and English check:** they work, but they haven't been tested with real learners yet.

## What changed since v1

**Chrome extension**

- **Word card:** synonyms come first, as chips, with a shorter, simpler example sentence. *Why:* the critique asked for "synonyms at the top first as chips" and less text.
- **Underlines start off.** Highlighting works without them. *Why:* a reviewer said underlines would bother her, the way Grammarly's do.
- **Translation in 43 languages:**
  - an "In your language" box under the English meaning
  - optional whole-page translation
  - hard words switched into easier English or your language

  *Why:* P5 and P6 asked for their own language. The English stays on the card, so Linger still helps you learn English.
- **A main on/off switch** turns Linger off on every website, and it stays off. *Why:* it used to turn itself back on.
- **Hand gestures**, separate from eye tracking: point at a word with your finger and hold to get help, swipe to answer or scroll, and pinch to zoom. *Why:* the critique suggested gestures for zooming, the next page and pointing at a word with a finger.

**Phone app**

- **Set up:** what you read, your languages and your English level, with an optional English check. Your level decides which words are underlined. You can change it later, and it adjusts as you use Linger. *Why:* the critique suggested "a test at the beginning" and "more specific settings".
- **Accounts with a profile picture:** your words, setup and progress follow you between phone and laptop. *Why:* the critique said "save to account", not "save to phone", and people shouldn't start as a new user every time.
- **Learning model:** lookups, repeat lookups, saves and review answers estimate which words you know. Words show Learning, Almost or Known, Review shows what's due, and known words stop being underlined. *Why:* our iteration plan aimed to notice the words someone keeps looking up and practice them more.
- **Meanings and letter summaries in your language.** *Why:* the same reason as translation in the extension.
- **A calmer layout:**
  - Lens puts scan, upload and paste in one card.
  - Words, Local and Review share one layout, with fewer emojis and less text.

  *Why:* the critique and P5 found v1 text-heavy.
- **Removed the smart-glasses demo.** *Why:* it pulled attention away from reading help, and P3 couldn't work out how to use it.

**Ethical audit fixes**

- **AI explanations are off until you allow them**, and Linger says exactly what it sends. *Why:* informed consent. People read private emails and bills with Linger.
- **Neutral eye-tracking wording:** "Offer help when I pause" and "Want help with this word?" replace "Notice when I'm stuck". *Why:* pausing or rereading doesn't always mean someone is struggling.
- **Pairing explains what syncs** between devices. *Why:* transparency about personal information.
- **Delete account and data** in the phone app. *Why:* people should be able to remove their information.
- **WCAG 2.2 AA contrast and keyboard access:**
  - buttons
  - the local slang tag
  - header text
  - underlines

  *Why:* low vision and reduced contrast sensitivity.

## Team-to-team critique (November 10)

**What landed:** the definition pop-up got a "wooo". Reviewers also liked the plain-English paraphrase, highlighting a phrase to explain it, the AI chatbot, uploading a photo and the word game.

**What it changed:**

| Feedback | What we changed |
|---|---|
| Put synonyms first, as chips. | Synonym chips sit at the top of the word card. |
| Too much text. | A shorter word card and a calmer layout on every phone screen. |
| Underlining would bother her, like Grammarly. | Underlines start off. |
| She might feel "called out" when Linger pops up on a word. | Neutral wording, and eye tracking stays optional. |
| Set a level, maybe with a test at the beginning. | Setup with an English level and an optional English check. |
| Add gestures: zoom, next page, pointing at a word with a finger. | Hand gestures: point and hold on a word, swipe to scroll, pinch to zoom. |
| One website for phone and laptop, and "save to account" instead of "save to phone". | We kept the phone app as a website instead of an App Store app, and added accounts that sync. |

## For developers

- Run it locally with `python3 -m http.server 8000`, then open http://localhost:8000. Add `?accounttest=1` to try accounts without Firebase.
- More detail:
  - [extension/README.md](extension/README.md): the extension
  - [ACCOUNTS.md](ACCOUNTS.md): accounts and sync
  - [ACCESSIBILITY.md](ACCESSIBILITY.md): colour and keyboard rules
  - [functions/README.md](functions/README.md): the AI server
  - [mac/README.md](mac/README.md): Linger for Mac
