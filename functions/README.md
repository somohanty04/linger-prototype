# Linger AI server

A small Firebase Cloud Function (`explain`) that the Chrome extension calls for **meaning in context**: what a word, phrase or sentence means where it appears, easier words, and a plain-English version. It calls Claude with your Anthropic API key, which stays here as a Firebase secret. The key never goes in the extension, because anyone who installs an extension can read its files.

- `explain.js`: the prompt, the answer format (JSON schema) and the model (`MODEL`, currently `claude-haiku-5-5`; change it to `claude-opus-5-5` for more careful explanations at about 40x the cost, then deploy again).
- `index.js`: the web endpoint, with a limit of 30 requests a minute per address.
- `test.js`: checks the request and answer handling without calling Claude (`npm test`).

## One-time setup

1. **Get an API key.** Sign in at <https://platform.claude.com> (the Claude Console), add a payment method and some credit, then create a key under **API keys**. A Claude Pro/Max subscription doesn't include API use; it's billed separately.
2. **Set a spend limit** in the Console (**Billing → Limits**), for example $20 a month, so a leaked URL can't run up a big bill.
3. **Upgrade the Firebase project to the Blaze (pay as you go) plan.** Cloud Functions need it. At this traffic it stays inside the free tier (2 million calls a month).
4. **Install the Firebase CLI and sign in:**
   ```bash
   npm install -g firebase-tools
   firebase login
   ```
5. **Store the key as a secret** (from the repo folder; it asks you to paste the key):
   ```bash
   firebase functions:secrets:set ANTHROPIC_API_KEY
   ```
6. **Deploy:**
   ```bash
   cd functions && npm install && cd .. && firebase deploy --only functions
   ```
   The deploy prints the function's URL. The extension uses `https://us-central1-linger-f41a7.cloudfunctions.net/explain` (`AI_URL` in `extension/background.js`). If the printed URL is different, paste it there.
7. Reload the extension in `chrome://extensions`.

## Try it

```bash
curl -s -X POST https://us-central1-linger-f41a7.cloudfunctions.net/explain -H 'Content-Type: application/json' -d '{"mode":"word","text":"turnout","context":"Organizers said the turnout was unprecedented."}'
```

## Cost

Each explanation is about 600–900 input tokens and 150–400 output tokens (including Claude's short thinking at low effort). Prices are per million tokens (input / output):

| Model | Price | Per explanation | 1,000 explanations |
|---|---|---|---|
| Claude Haiku 5.5 (current) | $0.10 / $0.50 | ~$0.0002 | ~$0.20 |
| Claude Opus 5.5 | $4 / $20 | ~$0.005–0.01 | ~$5–10 |

The extension remembers answers while the browser is open, so opening the same card twice doesn't cost twice. The **AI explanations** switch in the Linger menu turns AI off, for example for a study condition without it. The cards then use the dictionary only.
