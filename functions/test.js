// Checks the request/answer handling without calling Claude: node test.js
import assert from 'node:assert/strict';
import { readInput, buildRequest, readResult, MODEL } from './explain.js';

assert.ok(readInput({ mode: 'other', text: 'x' }).error);
assert.ok(readInput({ mode: 'word', text: '  ' }).error);
const inp = readInput({ mode: 'phrase', text: '  must   remit payment ', context: 'Tenants must remit payment no later than December 1.' });
assert.deepEqual(inp, { mode: 'phrase', text: 'must remit payment', context: 'Tenants must remit payment no later than December 1.' });
assert.equal(readInput({ mode: 'word', text: 'a'.repeat(5000) }).text.length, 700);

const req = buildRequest(inp);
assert.equal(req.model, MODEL);
assert.equal(req.fallbacks, MODEL.startsWith('claude-haiku') ? undefined : 'default');
assert.equal(req.output_config.format.type, 'json_schema');
assert.ok(req.messages[0].content.includes('<highlight>must remit payment</highlight>'));
assert.ok(buildRequest(readInput({ mode: 'word', text: 'turnout', context: '' })).messages[0].content.includes('<context>(none)</context>'));

const text = (o) => ({ stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: JSON.stringify(o) }] });
assert.deepEqual(readResult(text({ meaning: 'You have to pay.', plain: 'must pay', hardWords: [{ word: 'remit', meaning: 'send money', easier: 'pay' }] })),
  { meaning: 'You have to pay.', plain: 'must pay', hardWords: [{ word: 'remit', meaning: 'send money', easier: 'pay' }] });
assert.deepEqual(readResult(text({ meaning: 'How many people came.', synonyms: ['attendance', 'crowd', 'number of people', 'extra'], plainSentence: 'x' })),
  { meaning: 'How many people came.', synonyms: ['attendance', 'crowd', 'number of people'], plainSentence: 'x' });
assert.deepEqual(readResult({ stop_reason: 'refusal', content: [] }), { error: 'refused' });
assert.deepEqual(readResult({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'not json' }] }), { error: 'bad answer' });
// Page assistant
assert.ok(readInput({ mode: 'ask', question: '  ' }).error);
const ask = readInput({ mode: 'ask', question: 'Should I pay now?', page: 'Notice\n\n\nPay   by Dec 1.', title: 'Bill "A"', site: 'city.gov',
  history: [{ q: 'What is this?', a: 'A bill.' }, { q: '', a: 'x' }, 'junk'] });
assert.equal(ask.page, 'Notice\nPay by Dec 1.');
assert.deepEqual(ask.history, [{ q: 'What is this?', a: 'A bill.' }]);
const ar = buildRequest(ask);
assert.deepEqual(ar.messages.map((m) => m.role), ['user', 'assistant', 'user']);
assert.ok(ar.messages[0].content[0].text.includes('Pay by Dec 1.'));
assert.deepEqual(ar.messages[0].content[0].cache_control, { type: 'ephemeral' });
assert.equal(ar.messages[0].content[1].text, 'What is this?');
assert.equal(ar.messages[2].content, 'Should I pay now?');
const first = buildRequest(readInput({ mode: 'ask', question: 'What is this?', page: 'x', focus: 'remit payment' }));
assert.equal(first.messages.length, 1);
assert.ok(first.messages[0].content[1].text.includes('<highlight>remit payment</highlight>'));
assert.deepEqual(readResult({ stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: 'Pay by Dec 1.' }] }, true), { answer: 'Pay by Dec 1.' });
console.log('ok');
