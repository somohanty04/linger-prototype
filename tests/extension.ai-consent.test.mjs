// Extension AI consent: loads extension/background.js with a fake chrome + fetch (node tests/extension.ai-consent.test.mjs)
// Checks that no request reaches the AI server unless aiConsent === 'yes' AND aiOn === true, for every AI entry point (askAI modes and Ask Linger).
import fs from 'fs';
import vm from 'vm';
const src = fs.readFileSync(new URL('../extension/background.js', import.meta.url), 'utf8');
let pass = 0, fail = 0;
async function scenario(name, storage, expectSent) {
  const store = { ...storage };
  let aiCalls = 0, listener = null;
  const chrome = {
    storage: { local: { get: async (d) => { const o = {}; for (const [k, v] of Object.entries(typeof d === 'string' ? { [d]: undefined } : d)) o[k] = k in store ? store[k] : v; return o; }, set: async (o) => Object.assign(store, o) }, session: { get: async (d) => d, set: async () => {} }, onChanged: { addListener() {} } },
    runtime: { onStartup: { addListener() {} }, onInstalled: { addListener() {} }, onMessage: { addListener: (f) => { listener = f; } }, getManifest: () => ({ content_scripts: [{ js: [] }] }), getContexts: async () => [] },
    action: { setBadgeText: async () => {}, setBadgeBackgroundColor: async () => {} },
    tabs: { query: async () => [] }, offscreen: {}, scripting: {}
  };
  const fetch = async (url) => { if (String(url).includes('cloudfunctions')) aiCalls++; return { ok: true, status: 200, json: async () => ({ meaning: 'x' }) }; };
  const ctx = { chrome, fetch, importScripts() {}, self: { lingerDictEntry: () => ({}) }, console, setTimeout, clearTimeout, crypto: globalThis.crypto, AbortController, URL, JSON, Promise, Map, Set, Date, Math, String, Number, Object, Array, encodeURIComponent };
  vm.createContext(ctx); vm.runInContext(src, ctx);
  const send = (msg) => new Promise((res) => listener(msg, {}, res));
  await send({ type: 'ai', mode: 'word', text: 'remit', context: 'Tenants must remit payment.' });
  await send({ type: 'ai', mode: 'translate-many', lang: 'es', texts: ['Hello'] });
  await send({ type: 'ai', mode: 'swap-many', lang: 'es', items: [] });
  const ask = await send({ type: 'ai-ask', body: { question: 'What is this?' } });
  const sent = aiCalls > 0, ok = sent === expectSent && (expectSent || ask.error === 'off');
  console.log(`${ok ? '✓' : '✗'} ${name}: ${aiCalls} AI requests${expectSent ? '' : ', Ask Linger → ' + JSON.stringify(ask)}`);
  ok ? pass++ : fail++;
}
await scenario('new install (nothing stored)', {}, false);
await scenario('existing user, aiOn: true, never consented', { aiOn: true }, false);
await scenario('declined (aiConsent: no)', { aiOn: false, aiConsent: 'no' }, false);
await scenario('consented but switched off', { aiOn: false, aiConsent: 'yes' }, false);
await scenario('consent value tampered (aiConsent: true)', { aiOn: true, aiConsent: true }, false);
await scenario('consented and on', { aiOn: true, aiConsent: 'yes' }, true);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
