# Linger for Chrome

Underlines hard English words on any website, explains them in plain words, translates them, and saves them to the Linger phone app.

## Install (developer mode)

1. Download and unzip https://somohanty04.github.io/linger-prototype/linger-extension.zip.
2. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and pick the unzipped folder.
3. Pin Linger from the puzzle-piece menu.

Tabs that were already open get Linger automatically.

## Features

- **Underlines hard words** (off until you turn it on): words outside the ~10,000 most common, Linger's legal/lease/billing words, and city slang. Names, acronyms, links, buttons and text boxes are skipped. **How many** picks Fewer, Normal or More.
- **Word cards**: click an underlined word (or double-click any word) for its meaning, an example sentence, an easier synonym, a local note for slang, read-aloud and save.
- **✦ Explain**: highlight any word, phrase or sentence for a card in plain words, with each hard word explained.
- **Hard words show as** (or **Alt+Shift+L**): the original, easier English, or your language, swapped into the text with a green underline.
- **AI explanations (Claude)**: off until you allow them. Cards then give the meaning *in that sentence*. Only the selected text and its paragraph are sent (plus page text for Ask Linger, page translation and swaps). Every request is checked in `background.js` (`aiAllowed`).
- **Ask Linger**: a ✦ button in the corner opens a chat about the page: what it's about, what to do and by when, help deciding.
- **Translation**: pick **My language** (40+ languages). Cards add a translated box, and **Translate this page** swaps the page text, with **Show original** to undo. Uses Chrome's on-device translator (Chrome 138+), falling back to Claude when AI is on.
- **Explain this page**: what the page wants from you, with key dates and amounts.
- **Save**: the bookmark keeps the word in the menu's Saved list and syncs it to the phone.
- **Menu**: the main Linger switch (off everywhere, toolbar shows OFF), On this site, Bigger words, and a **Not working on this site?** report.

## Sync with your phone

Sign in with your Linger app account, or tap **Use a code from the app instead** and enter the 12-character code (app → profile picture → Get a code). The menu explains bad codes (wrong length, letters codes never use: 0, O, 1, I, L) and offline errors.

## Troubleshooting

- **"Linger was updated. Reload this page"**: press Reload.
- **"Linger AI didn't answer this time"**: the card shows the dictionary meaning; click the word again to retry.
- **No ✦ button**: needs AI explanations, Ask Linger button and On this site all on. The menu says which is off.
- **PDFs**: Chrome's PDF viewer blocks extensions. The menu offers **Open Linger to paste the text**.
- **Updates**: the menu checks the published manifest at most every 6 hours and links to the new version.

## Limits

- Doesn't run in Chrome's PDF viewer, Google Docs or Chrome's own pages.
- Dictionary meanings come from Linger's word list and Wiktionary, synonyms from Datamuse.
- Page translation works piece by piece, so text split by links can read choppy, and content added later stays untranslated.
- Common-word list: google-10000-english, permitted for educational use.

## Files

- `manifest.json`: Manifest V3 setup
- `content.js`: underlines, word cards, Explain, Ask Linger and page translation (every page)
- `background.js`: Wiktionary, Datamuse, AI requests, saving and Firestore sync
- `popup.html/css/js`: the toolbar menu
- `dict.js`: picks a meaning and example from a Wiktionary entry
- `langs.js`: supported languages
- `words.js`, `cities.js`: word data and city slang from the phone app
- `test.html`: test page that loads `content.js` without extension features (not in the zip)
