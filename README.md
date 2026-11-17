# Linger

Linger is an AI reading helper for adults who are learning English and new to the US. It turns hard English into plain English: confusing words, local slang, and official letters, bills and forms.

You can use it in several ways:

- **Highlight** any word, phrase or sentence, and Linger explains what it means in that context, in simple words, with easier words you could use instead.
- **Ask** the AI assistant questions about a whole page, or get help deciding what to do (for example, how to respond to a letter from a landlord).
- **Scan** anything with words with your phone camera, and Linger reads it and explains it.
- **Translate:** see meanings in your own language, or translate a whole page.
- **Listen:** Linger can read text and answers out loud.
- **Save and practice** the words you meet. Your words, setup and progress stay in your account, so they're the same on your phone and laptop.
- **Eye tracking (optional):** Linger notices when you pause on a line and asks "Want help with this word?". You can answer with a hand swipe.

There are two parts: a phone web app and a Chrome extension.

## 1. Phone app

**How to open it:** go to https://somohanty04.github.io/linger-prototype/

**Which device:** best on a phone, in Safari or Chrome. On a laptop, the app shows inside a phone frame. That works for a demo, but not for scanning.

**What to try:**

- **Set up:** tap the profile picture at the top right. Linger asks what you read, your languages and your English level. If you're not sure of your level, take the four-minute English check. You can skip any question.
- **Account:** sign in from the same place to keep your words on every device. You can also delete your account and data there.
- **Lens:** scan with the camera, upload a photo, or paste text. Hard words for your level get a dotted underline. Tap one to see what it means.
- **Explain this letter:** a plain-English summary of what the letter wants from you, with key dates. It can read the summary out loud.
- **Words:** the words you save, each marked Learning, Almost or Known.
- **Local:** a city guide with slang, customs and getting around.
- **Review:** practice with Fill in the story and Flashcards. Your answers tell Linger which words you know.

## 2. Chrome extension

**How to open it:** on the website above, click **Get the Chrome extension** and follow the steps: download, unzip, then in `chrome://extensions` turn on Developer mode and click **Load unpacked**.

**Which device:** a laptop or desktop computer with Google Chrome. Eye tracking also needs a webcam.

**What to try:**

- Highlight any word or sentence and click **✦ Explain**. The first time, Linger asks before it sends anything to AI.
- Pick **My language** in the Linger menu to see an "In your language" box on every card. You can also translate the whole page.
- Turn on **Underline hard words** to mark hard words on any page. Click one to see what it means in that sentence.
- Click the ✦ button in the corner to ask questions about the page.
- Click the bookmark on a card to save the word to the phone app.
- **Eye tracking (optional):** turn on **Offer help when I pause**. After a short setup, Linger uses the webcam to notice when you pause on a line, and asks if you want help.

## What's real and what's faked

**Real (working):**

- Webcam eye tracking in the extension. The video stays on the laptop.
- AI explanations, translation and the ✦ assistant. They use Claude through a small server we set up.
- Reading text from camera photos.
- Accounts: your words, setup and progress sync between devices.
- Saving words from the laptop to the phone.

**Faked or simplified:**

- **Eye tracking on the phone:** tapping a word stands in for it.
- **Reading inside other apps:** iPhone doesn't let Linger read inside apps like Instagram, so share, paste or screenshot the text instead.
- **Letter summaries in the phone app** are made by simple rules, not AI.
- **Sample content:** it's set in Pittsburgh, and the Pause map in Local uses made-up data.
- **Laptop to phone:** the extension connects to the phone with a pairing code, not your account yet.
- **Learning model and English check:** they work, but they haven't been tested with real learners yet.

**Known issues:**

- **Eye tracking accuracy:** it works, but it isn't always accurate. A normal webcam can't see your eyes as precisely as a real eye tracker. It works best in good lighting, sitting still, with the laptop at eye level. If it drifts, click Recalibrate in the Linger menu.
- **The extension download is older.** It doesn't have the ethical audit changes yet: AI is on by default, and the eye-tracking switch is still called "Notice when I'm stuck". To get the new version, use **Load unpacked** on the `extension/` folder in this repository.

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
| One website for phone and laptop, and "save to account" instead of "save to phone". | We kept the phone app as a website instead of an App Store app, and added accounts that sync. |

## For developers

- Run it locally with `python3 -m http.server 8000`, then open http://localhost:8000. Add `?accounttest=1` to try accounts without Firebase.
- More detail:
  - [extension/README.md](extension/README.md): the extension
  - [ACCOUNTS.md](ACCOUNTS.md): accounts and sync
  - [ACCESSIBILITY.md](ACCESSIBILITY.md): colour and keyboard rules
  - [functions/README.md](functions/README.md): the AI server
  - [mac/README.md](mac/README.md): Linger for Mac
