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
console.log('ok');
