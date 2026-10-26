# Linger

**Your pause is the search bar.**

Linger is a concept for smart glasses and a companion app for people who are new somewhere: a new country, city, school or job. The glasses track your eyes and notice when you pause on a word or re-read it. Linger then asks if you want the meaning, explains what the word means in that sentence and how people use it locally, and saves it to your phone with the place you saw it.

This repository is a clickable prototype of the phone app. It runs entirely in the browser with sample content set in Pittsburgh.

## What you can try

- **Lens**: tap a word on the café sign or lease letter. Tapping stands in for your eyes pausing on it. Linger asks first, then shows the meaning in context and a local note. Hard words are underlined and explained automatically.
- **Words**: your saved words, with the sentence, place and date you met each one.
- **Local**: Pittsburgh slang, local customs, and a "pause map" of where newcomers get stuck (sample data).
- **Review**: flashcards that quiz you with the real sentence where you first saw each word.

## Run it locally

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```
