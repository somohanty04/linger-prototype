// Linger AI server: a Firebase Cloud Function the extension calls to explain words, phrases and sentences.
// The Anthropic API key lives here as a Firebase secret, never in the extension (anyone who installs an
// extension can read everything inside it).
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import Anthropic from '@anthropic-ai/sdk';
import { readInput, buildRequest, readResult } from './explain.js';

const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');

// The URL is public, so keep any one person (or script) from running up the bill: 30 explanations a minute per
// address, per server instance. Also set a monthly spend limit in the Claude Console.
const PER_MINUTE = 30;
const recent = new Map();
function tooMany(ip) {
  const now = Date.now(), list = (recent.get(ip) || []).filter((t) => now - t < 60000);
  list.push(now); recent.set(ip, list);
  if (recent.size > 5000) recent.clear();
  return list.length > PER_MINUTE;
}

let client = null;

export const explain = onRequest(
  { secrets: [ANTHROPIC_API_KEY], cors: true, region: 'us-central1', maxInstances: 5, timeoutSeconds: 60, memory: '256MiB' },
  async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    if (tooMany(req.ip || 'unknown')) return res.status(429).json({ error: 'Too many requests. Try again in a minute.' });
    const input = readInput(req.body);
    if (input.error) return res.status(400).json(input);
    client = client || new Anthropic({ apiKey: ANTHROPIC_API_KEY.value(), maxRetries: 1, timeout: 45000 });
    try {
      const response = await client.beta.messages.create(buildRequest(input));
      const out = readResult(response);
      return res.status(out.error ? 502 : 200).json(out);
    } catch (e) {
      if (e instanceof Anthropic.RateLimitError) return res.status(429).json({ error: 'busy' });
      if (e instanceof Anthropic.AuthenticationError) { console.error('Anthropic API key was rejected'); return res.status(500).json({ error: 'server key' }); }
      if (e instanceof Anthropic.APIError) { console.error('Anthropic API error', e.status, e.message); return res.status(502).json({ error: 'ai error' }); }
      console.error(e);
      return res.status(500).json({ error: 'server error' });
    }
  }
);
