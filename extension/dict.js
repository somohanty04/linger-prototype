// Linger dictionary helpers, shared by the background worker and the page script.
// dictEntry: a Wiktionary definition response → { meaning, example } (short plain text, or null).
(() => {
  const strip = (h) => String(h || '')
    .replace(/<style[\s\S]*?<\/style>/g, '').replace(/<sup[\s\S]*?<\/sup>/g, '').replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
  const cap = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);
  self.lingerDictEntry = (j, word) => {
    const defs = (j && j.en) || [];
    const meanings = defs.flatMap((x) => x.definitions || []).map((d) => strip(d.definition))
      .filter((t) => t && !/^(obsolete|archaic|plural of|alternative)/i.test(t));
    const meaning = meanings.find((t) => t.length <= 140) || meanings[0] || null;
    // An example sentence: a real sentence (4+ words) that uses the word, not too long, from the first senses first.
    const stem = new RegExp('\\b' + String(word).slice(0, Math.max(4, String(word).length - 3)), 'i');
    let example = null;
    for (const d of defs.flatMap((x) => x.definitions || [])) {
      const exs = [...(d.parsedExamples || []).map((e) => e.example), ...(d.examples || [])].map(strip);
      example = exs.find((t) => stem.test(t) && t.split(/\s+/).length >= 4 && t.length <= 160 && !/^[a-z]/.test(t)) || null;
      if (example) break;
    }
    return { meaning: meaning ? cap(meaning) : null, example };
  };
})();
