# Linger

**Your pause is the search bar.**

Linger is a concept for smart glasses and a companion app for people who are new somewhere: a new country, city, school or job. The glasses track your eyes and notice when you pause on a word or re-read it. Linger then asks if you want the meaning, explains what the word means in that sentence and how people use it locally, and saves it to your phone with the place you saw it.

This repository is a clickable prototype of the phone app. It runs entirely in the browser with sample content set in Pittsburgh.

## What you can try

- **Lens (home screen)**: two big buttons, **Scan with camera** (full-screen camera with a framing guide; the photo is cropped, cleaned up and read in the browser, then the plain-English summary opens automatically) and **Text it to Linger** (the WhatsApp helper). Below them, tap a word on the lease letter or café sign. Tapping stands in for your eyes pausing on it. Linger asks first, then shows the meaning in context and a local note. Hard words are underlined and explained automatically.
  - **Explain this letter**: a plain-English summary of what the letter or sign wants from you, with key dates.
  - **Read aloud**: reads the text with the browser's built-in voice and highlights each word as it is read.
  - **📷 Camera**: point your phone at any letter, sign or bill (or upload a photo). Tesseract.js reads the text inside the browser, hard words are underlined, Explain builds a plain-English summary with dates and amounts, and words you tap are looked up on Wiktionary. Without an AI backend the summary is made by swapping formal words for plain ones.
- **Use Linger in any app (Share menu)**: the app is installable (web app manifest + service worker) and registers as a share target. On Android, install it from Chrome, then select text in any app → Share → Linger. On iPhone, which doesn't allow websites in the Share menu, a free Shortcut ("Explain with Linger") opens `…/linger-prototype/?text=<selected text>`; the setup steps are in the app (Lens → "Use Linger in any app"). Shared text opens straight into the plain-English summary; a single shared word opens its meaning. **Paste text** on the Lens screen does the same without sharing.
- **WhatsApp helper (simulated)**: from Lens, tap "Prefer texting?". Send a photo or try a sample letter and Linger replies with a summary, key dates, a voice note, and the hard words it saved to Words. Type one word to get its meaning, or paste a whole message or email to get it explained. A real WhatsApp number would need a small server (for example Twilio's WhatsApp sandbox).
- **Words**: your saved words, with the sentence, place and date you met each one. **Start Activity** opens Fill in the story.
- **Local (city guide)**: a teal-themed guide, styled differently from Words. Pick a city from the dropdown (Pittsburgh, New York, Philadelphia, Chicago, Boston, Houston, Los Angeles) or tap **Use my location** to jump to the nearest one. Each city has quick essentials (911, 311, the transit card, tipping), **Slang** with pronunciation and a 🔊 button, **Customs**, **Getting around**, a **Pause map** (sample data) and an easy small-talk starter. Saved slang goes to Words with the city as the place. City content lives in `cities.js`, so it's easy to add more.
- **Review**: practice activities.
  - **Fill in the story**: put your saved words back into three short stories, then see which ones you got right.
  - **Flashcards**: quiz yourself with the real sentence where you first saw each word.

## Laptop pause test

`reader.html` tests whether a laptop webcam (WebGazer.js) can tell when you are stuck on a line of a landlord letter. It calibrates in about 15 seconds, asks "Stuck on this line?" after a long look or a re-read, and logs whether each prompt was right.

**Send words to your phone:** when the Reader explains a line, tap **＋ Save** on a word (or **Save all to phone**). The **Words for your phone** list keeps them in the browser. **Send to my phone** shows a QR code: scan it with the phone camera and the words are added to the phone app's Words tab (and Flashcards), with the sentence and "Laptop · Linger Reader" as where you met them. Nothing goes through a server; the words travel inside the link. The phone app now keeps saved words between visits (localStorage).

## Live sync between laptop and phone (Firebase)

With Firebase set up, the phone app's **Words** tab shows **Turn on live sync** and a 12-character code. Enter the code in the Reader's **Words for your phone** card (or open the Reader link from the phone) and words saved or removed on either side appear on the other right away. Until Firebase is set up, live sync is hidden and the QR code still works.

Setup (about 5 minutes, free Spark plan):
1. Go to console.firebase.google.com → **Add project** (Analytics can be off).
2. **Build → Firestore Database → Create database** (production mode, a US location).
3. In Firestore's **Rules** tab, paste the contents of `firestore.rules` and **Publish**.
4. **Project settings → General → Your apps → Web (</>)**, register an app, and copy the `firebaseConfig` values into `firebase-config.js` as `window.LINGER_FIREBASE = { … }`. Commit and push.

Testing without Firebase: open `index.html?synctest=1` and `reader.html` in two tabs of the same browser; they sync through localStorage.

## Glasses simulation

`glasses.html` shows what the wearer sees through the glasses. Press **Play demo** to watch a scripted reader: the eye-tracking meter fills when they pause on a word, re-reading counts as a pause, hard words are explained right away, and a temple tap saves the word to the phone. Or rest your cursor on a word (tap on a phone) to stand in for your own eyes.

What is simulated today: eye tracking (cursor, tap or script), the glasses display (drawn on screen), nod and temple-tap controls (buttons), and the meanings (written for these two samples). The final prototype needs real eye tracking and a real AI lookup.

## Run it locally

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```
