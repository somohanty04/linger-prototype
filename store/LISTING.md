# Chrome Web Store listing: Linger 0.9.0

Upload `linger-chrome-web-store-0.9.0.zip` from this folder. Paste each section below into the matching field in the Developer Dashboard.

---

## Store listing tab

**Name** (from the manifest): Linger

**Summary** (from the manifest, 129 of 132 characters):
Explains hard English words on any website in plain words, translates them into your language, and saves them to your Linger app.

**Category:** Education

**Language:** English (United States)

**Description:**

```
Linger helps adults who are learning English read the web with confidence. Highlight anything you don't understand, and Linger explains it in plain, simple English.

EXPLAIN ANY TEXT
Highlight a word, phrase or sentence on any website and click ✦ Explain. Linger tells you what it means in that sentence, gives easier words you could use instead, and reads it out loud.

WORD CARDS
Double-click any word for its meaning, an example sentence, an easier word and local slang notes. Save words with the bookmark.

IN YOUR LANGUAGE
Pick your language from 40+ choices, including Arabic, Dari, Pashto, Somali, Tigrinya, Haitian Creole, Karen and Burmese. Cards add a translation, and you can translate a whole page with one click.

UNDERLINE HARD WORDS (OPTIONAL)
Turn on underlines to mark words outside the most common 10,000, plus legal, lease and billing words. Choose how many words to underline.

ASK LINGER
Click the ✦ button on any page to ask questions about it: "What is this page about?", "What do I need to do, and by when?" or "Help me decide what to do." Answers are in plain English, or in your language.

EXPLAIN THIS PAGE
Get a short summary of what a letter, bill or form wants from you, with key dates and amounts.

SAVE TO YOUR PHONE
Sign in with your Linger account, and words you save show up in the Linger iPhone app to review and practice.

YOU'RE IN CONTROL
AI explanations are off until you allow them, and Linger tells you exactly what it sends. Turn Linger off for one site or for every site with one switch. No ads and no tracking.

Linger doesn't run in Chrome's PDF viewer, Google Docs or Chrome's own pages.
```

**Graphics you need to make:**

- Store icon: 128×128. Use `extension/icons/icon-128.png`.
- Screenshots: at least 1, up to 5, each **1280×800** (or 640×400). Suggested shots:
  1. A word card open on a news article
  2. A highlighted sentence with its ✦ Explain card
  3. A card with the "In your language" box
  4. The Ask Linger chat on a letter or bill page
  5. The Linger menu
- Small promo tile: **440×280**. The Linger logo and name on your brand color works.

**Website:** https://somohanty04.github.io/linger-prototype/

**Support URL:** https://somohanty04.github.io/linger-prototype/ (or a team email)

---

## Privacy tab

**Single purpose:**

```
Linger helps people learning English understand hard words and text on the websites they read, by explaining them in plain English or translating them into their language.
```

**Permission justifications:**

`storage`
```
Saves the user's settings (language, underline preferences, AI consent), their saved words, and recent explanations so cards open quickly.
```

`scripting`
```
Adds Linger to tabs that were already open when the extension is installed or updated, so users don't have to reload every page.
```

`activeTab`
```
Lets Explain this page and the Linger menu read the text of the page the user is on when they ask for it.
```

Host permission (`<all_urls>`)
```
Linger's core feature is explaining hard words on whatever website the user is reading: news, government sites, bills, leases, job applications. It can't know in advance which sites those are, so it needs to run on all of them. Users can turn Linger off for a single site, or for every site, from the menu.
```

**Remote code:** No, I am not using remote code. (All JavaScript is in the package. Network requests return data only.)

**Data usage.** Tick these boxes:

- **Personally identifiable information:** yes. Email address, only if the user signs in to sync with the phone app.
- **Authentication information:** yes. Sign-in to the user's Linger account (Firebase Authentication).
- **Website content:** yes. The text the user highlights, with the sentence or paragraph around it, and page text when they use Ask Linger, Explain this page or page translation. It's only sent after they turn on AI explanations.
- **User activity:** no.
- **Web history:** no. A site name is only sent if the user chooses to report a site with "Not working on this site?".
- Leave the rest unticked: health, financial and payment, personal communications and location.

Then tick all three certifications:

- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL:** https://somohanty04.github.io/linger-prototype/privacy.html

---

## Before you submit: publish the privacy policy

`privacy.html` now covers everything this version of the extension sends: Datamuse lookups, "Not working on this site?" reports, and page translation through Claude. It also says the extension doesn't use the webcam. Push it to the website before submitting, because reviewers open the live URL.

---

## Distribution tab

- **Visibility:** **Public** shows up in search. Pick **Unlisted** if you only want people with the link to find it. It goes through the same review.
- **Regions:** All regions.
- **Pricing:** Free.
