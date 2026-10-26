# Linger

**Your pause is the search bar.**

Linger is a concept for smart glasses and a companion app for people who are new somewhere: a new country, city, school or job. The glasses track your eyes and notice when you pause on a word or re-read it. Linger then asks if you want the meaning, explains what the word means in that sentence and how people use it locally, and saves it to your phone with the place you saw it.

This repository is a clickable prototype of the phone app. It runs entirely in the browser with sample content set in Pittsburgh.

## What you can try

- **Lens**: tap a word on the café sign or lease letter. Tapping stands in for your eyes pausing on it. Linger asks first, then shows the meaning in context and a local note. Hard words are underlined and explained automatically.
- **Words**: your saved words, with the sentence, place and date you met each one.
- **Local**: Pittsburgh slang, local customs, and a "pause map" of where newcomers get stuck (sample data).
- **Review**: flashcards that quiz you with the real sentence where you first saw each word.

## Glasses simulation

`glasses.html` shows what the wearer sees through the glasses. Press **Play demo** to watch a scripted reader: the eye-tracking meter fills when they pause on a word, re-reading counts as a pause, hard words are explained right away, and a temple tap saves the word to the phone. Or rest your cursor on a word (tap on a phone) to stand in for your own eyes.

What is simulated today: eye tracking (cursor, tap or script), the glasses display (drawn on screen), nod and temple-tap controls (buttons), and the meanings (written for these two samples). The final prototype needs real eye tracking and a real AI lookup.

## Run it locally

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```
