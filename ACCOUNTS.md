# Linger accounts (milestone 1: phone app)

Sign in with email and password, and your saved words are kept in your account and synced both ways between every
device you sign in on. No pairing code needed. Pairing codes keep working for people without an account (and alongside
one). Built on the same Firebase project (`linger-f41a7`) and the same Firestore connection as the pairing sync.

**Where:** the phone app (`index.html`, `beta/`) and the Chrome extension (since 0.8.2). **Next:** the laptop Reader (it still uses pairing codes).

## Chrome extension

The Linger menu has a **Your Linger account** section: sign in or create an account with the same email and password as
the phone app. `extension/background.js` talks to Firebase over REST (no SDK): Identity Toolkit for sign-in, Secure
Token to refresh the ID token, and Firestore for `users/{uid}/words/{key}`, with the same fields as the phone app.

- **Signing in** uploads the extension's saved list. A word already in the account keeps the account's text and progress.
- **Saving a word** (the bookmark on a card) writes it to the account. Saving it again updates `w, m, s, p, place, date`
  and `updatedAt` only, so `status` and learning progress from the phone stay.
- A pairing code still works alongside an account.
- If the account is deleted or its password changed, the next save signs the extension out.
- Test against the emulators: `node tests/extension-account.test.mjs` (see Testing locally).

## Files

- `account.js` (new): Firebase Authentication (email + password), the account word store, two-way sync, and the
  account card (shown in the account sheet, opened from the profile picture at the top right of every screen), and the
  profile: `saveProfile()` and loading it on sign-in, for the onboarding answers and the profile picture.
- `sync.js`: shares its Firebase app with `account.js` (`LingerSync.firebase()`); optional `?emulator=1`.
- `app.js`: hooks that tell `account.js` when saved words change, show the account card in the account sheet, give
  `account.js` read/apply access to the saved words, and use the profile (onboarding answers, profile picture).
- `index.html`: loads `account.js`.
- `firestore.rules`: adds rules for `users/{uid}`. The pairing rules are unchanged.
- `firebase.json`: points the Firebase CLI at `firestore.rules` and sets the emulator ports.

## Data

```
users/{uid}                 { createdAt, schema: 1, prefs, photo }         profile
                            prefs: { reads, other, langs, lang, level, test, at }   onboarding answers (newest 'at' wins);
                                   test = the English check's result { cefr, level, right, total, agreed }
                            photo: 'data:image/jpeg;base64,…'              160×160 profile picture, a few KB
                            learn: { word: { n, r, x, s, c, w, k, h, lr, ll, u } }   learning progress (learn.js), newest 'u' wins per word
users/{uid}/words/{key}     { w, m, s, p, place, date, createdAt, updatedAt }
```

- `key` is the app's word key (lower-case word), so one word is one document: no duplicates.
- `w, m, s, p, place, date` are the same strings the pairing sync uses (word, meaning, sentence, plain English, where you
  saw it, date saved).
- **Room to grow:** later features add fields to the same document (`status: 'learning' | 'mastered'`, `lookups`,
  `familiarity`, `reviews`…). The phone app never overwrites fields it doesn't know, a missing `status` means
  "learning", and the rules allow up to 40 fields per word.

## How syncing stays safe

- **First sign-in on a device:** the two lists are merged by word. Words only on the device are uploaded, words only in
  the account are added to the device, and a word in both keeps the account's text, with any empty field filled in from
  the device. Nothing is deleted, and a copy of the device's words is kept first in `localStorage`
  (`linger.words.v1.backup.<uid>`).
- **Removing a word** deletes it from the account only when you remove it on a device (remembered across reloads, so it
  also works after being offline). A word that is merely missing on a device is never deleted from the account.
- **A word deleted on another device** disappears here too.
- **Signing out** removes the account's words from the device (they stay in the account and come back on sign-in), so the next person to sign in on that browser doesn't get them merged into their own account. Words saved while signed out stay. The pairing document isn't touched.
- **Pairing and an account at the same time:** words arriving through a pairing code are added to the account too.

## Deleting an account

Account sheet (the profile picture) → **Delete account and data**. The card lists what is deleted and what isn't, then
asks for the password again (Firebase only deletes a sign-in that was used recently, and this also confirms it's the
owner). In order: the profile document (reading setup, learning history, picture), every saved word, a check that
nothing is left, then the Firebase Authentication user. This device then forgets the account (its words, the
`linger.acct.<uid>.*` keys, the backup and the cached picture) and, if ticked, its own reading setup and learning
history, and reloads. Other devices still signed in see the profile and words disappear and sign out instead of
uploading their copy back.

Not deleted: pairing-code documents (`pairs/{code}`). They aren't tied to an account, and the rules don't allow
deleting them. The card says so. The extension's saved list stays on the laptop.

The current rules already allow it (owners can delete their own profile and words), so no deploy is needed for this.
Known gaps: another device that is still signed in could, for up to an hour (until its sign-in token expires), write
to the deleted account if it saves a word at that moment; and a future subcollection under `users/{uid}` would need
adding to the deletion. Both are closed for good by deleting server-side instead (a Cloud Function with the Admin SDK,
or the "Delete User Data" Firebase extension).

## Firebase console setup (one time, by a project owner)

1. **Turn on email sign-in:** Firebase console → `linger-f41a7` → **Authentication** → **Get started** (first time) →
   **Sign-in method** → **Email/Password** → Enable → Save. (Leave "Email link" off.)
2. **Allow the website:** Authentication → **Settings** → **Authorized domains** → add `somohanty04.github.io`.
   `localhost` is there by default.
3. **Deploy the security rules** (after reviewing `firestore.rules`). Either paste the file into Firestore → **Rules**
   → Publish, or with the Firebase CLI from the repo folder:
   ```bash
   firebase deploy --only firestore:rules
   ```
   This replaces the live rules with this file: the pairing rule is the same as now, plus the new `users` rules. Until
   it's deployed, signing in works but the words can't be saved ("security rules for accounts aren't deployed yet").

Nothing secret is added: `firebase-config.js` already holds the project's public web settings.

## Testing locally

Serve the repo folder (for example `python -m http.server 8000`, or any static server) and open `http://localhost:8000`.

**Without Firebase (quickest):** open `http://localhost:8000/?accounttest=1`. Sign-in and the account are faked in
this browser (`localStorage`), so you can try the whole flow without touching the real project. Turn it off with
`?accounttest=0`.
1. Save a few words from Lens or Local. Words → **Sign in or create account** → enter any email and a 6+ character
   password → **Create account**. The card says "Signed in as …" and how many words are in the account.
2. Open a second tab at the same address: it is signed in too. Save or remove a word in one tab; the other tab's Words
   list follows within a second.
3. Sign out, save a word, sign in again: the word is uploaded.

**With the Firebase emulators (real Firebase code, nothing touches the live project):** needs Java 11+ and Node.
```bash
npx firebase-tools@13 emulators:start --only auth,firestore --project linger-f41a7
```
Security-rule tests (24 checks: own data, other accounts, signed-out users, bad data, pairing), with the emulators running:
```bash
node tests/accounts.rules.test.mjs
```
Then open `http://localhost:8000/?emulator=1` (turn off with `?emulator=0`). For a second, independent session use `http://127.0.0.1:8000/?emulator=1`: a different address has its own storage and sign-in, like another device. The emulator UI at
`http://127.0.0.1:4000` shows the accounts and the `users/…/words` documents, and the emulator enforces
`firestore.rules`, so you can also check that one account can't read another's words.

**Against the real project:** after the console setup above, open the site normally, create an account, and sign in
with the same account on a second device or browser.
