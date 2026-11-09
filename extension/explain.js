// Linger AI helpers: meaning in context, easier words, translation and "Ask Linger".
// Loaded by background.js in the extension, and directly by test.html.
(() => {
  const MODEL = 'claude-haiku-5-5';
  const READ_MODEL = 'claude-sonnet-5-5'; // reading photos and PDFs needs the stronger model

  async function claude(key, system, messages, maxTokens = 700, model = MODEL) {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({ model, max_tokens: maxTokens, system, messages }),
    });
    if (!r.ok) throw new Error('AI ' + r.status + ': ' + (await r.text()).slice(0, 200));
    const j = await r.json();
    return (j.content || []).map((c) => c.text || '').join('').trim();
  }

  const EXPLAIN = `You are Linger, a reading helper for adult English learners.
Explain the selected text as it is used in this passage, in plain words a learner at about B1 level understands.
Reply with only a JSON object with these keys:
- "meaning": 1-2 short sentences on what it means here, in this context. Not a dictionary definition.
- "synonyms": up to 4 easier words or short phrases that could replace it here, easiest first. Empty array for a whole sentence.
- "plain": for a phrase or sentence, the whole sentence rewritten in plain English. Otherwise "".
- "parts": for a phrase or sentence, 2-4 short notes on how it is put together (idioms, unusual word order, what the subject is, what a tricky part refers to). Otherwise [].
- "translation": the selection translated into the requested translation language, or "" if none was requested.`;

  const ASK = `You are Linger, a reading helper for adult English learners.
Answer the reader's question about the text below in plain, short English (under 120 words).
Quote the text when it helps. If the text doesn't say (for example, whether a dish is spicy), you may use common knowledge,
but say clearly that it comes from general knowledge and not from the text.`;

  const READ = `You are Linger, a reading helper for adult English learners. The reader can't select the text in this
image or PDF (for example a photo of a restaurant menu), so write it out for them and help them understand it.
Reply with only a JSON object:
{"title": short name of what this is,
 "summary": 1-2 plain sentences on what it is and anything the reader must do (dates, amounts),
 "sections": [{"heading": section heading or "", "lines": [{"text": the exact words of one item or line, including its price,
   "note": a short plain-English explanation for an English learner (for a dish: what it is and main ingredients), or "" if it is already simple}]}]}
Keep the original words in "text". Read every item, top to bottom. If a dish is marked spicy (a chili icon, the word spicy, hot, etc.),
start its note with "🌶 Spicy (marked on the menu)." If it isn't marked but the dish is usually spicy, start the note with
"🌶 Usually spicy." If part of the page is cut off or unreadable, say so in the summary.`;

  async function explain({ text, kind, sentence, paragraph, lang, key }) {
    if (!key) return { noKey: true };
    const user = `Selected ${kind}: "${text}"\nSentence it is in: "${sentence}"\nSurrounding paragraph: "${String(paragraph || '').slice(0, 1500)}"${lang ? `\nTranslation language: ${lang}` : ''}`;
    const out = await claude(key, EXPLAIN, [{ role: 'user', content: user }]);
    const m = out.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('AI reply was not JSON');
    const j = JSON.parse(m[0]);
    const list = (v) => (Array.isArray(v) ? v.map(String).filter(Boolean) : []);
    return { meaning: String(j.meaning || ''), synonyms: list(j.synonyms), plain: String(j.plain || ''), parts: list(j.parts), translation: String(j.translation || '') };
  }

  async function ask({ question, context, history, key }) {
    if (!key) return { noKey: true };
    const system = ASK + '\n\nThe text:\n"""\n' + String(context || '').slice(0, 14000) + '\n"""';
    return { answer: await claude(key, system, [...(history || []), { role: 'user', content: question }], 500) };
  }

  // Without AI: synonyms from Datamuse (free, no key). Linger sorts them so the most common (easiest) come first.
  async function synonyms(word) {
    try {
      const r = await fetch('https://api.datamuse.com/words?max=12&rel_syn=' + encodeURIComponent(word));
      const j = r.ok ? await r.json() : [];
      return j.map((x) => x.word);
    } catch { return []; }
  }

  // Without AI: translation from MyMemory (free, no key). Only used when a language is chosen.
  async function translate(text, lang) {
    try {
      const r = await fetch(`https://api.mymemory.translated.net/get?langpair=en|${encodeURIComponent(lang)}&q=${encodeURIComponent(String(text).slice(0, 450))}`);
      const j = r.ok ? await r.json() : null;
      return (j && j.responseData && j.responseData.translatedText) || null;
    } catch { return null; }
  }

  // Read an image or a PDF (base64), for menus and other text Linger can't select.
  async function read({ image, mediaType, pdf, key }) {
    if (!key) return { noKey: true };
    const src = pdf
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdf } }
      : { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: image } };
    const out = await claude(key, READ, [{ role: 'user', content: [src, { type: 'text', text: 'Write this out and explain it for me.' }] }], 6000, READ_MODEL);
    const m = out.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('AI reply was not JSON');
    const j = JSON.parse(m[0]);
    const sections = (Array.isArray(j.sections) ? j.sections : []).map((s) => ({ heading: String(s.heading || ''), lines: (Array.isArray(s.lines) ? s.lines : []).map((l) => ({ text: String(l.text || ''), note: String(l.note || '') })).filter((l) => l.text) }));
    return { title: String(j.title || ''), summary: String(j.summary || ''), sections };
  }

  self.LingerAI = { explain, ask, read, synonyms, translate, MODEL };
})();
