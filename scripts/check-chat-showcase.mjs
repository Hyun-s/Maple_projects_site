import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pages = ['index.html', 'chat/index.html', 'character-translation/index.html',
  'character-translation/additional-experiments/index.html',
  'character-translation/additional-experiments/checkpoint-visualization/index.html'];
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;')
  .replace(/ +$/gm, value => '&#32;'.repeat(value.length));
for (const page of pages) {
  const html = readFileSync(resolve(root, page), 'utf8');
  const hero = html.match(/<section\b[^>]*class="[^"]*\bhero\b[^"]*"[^>]*>[\s\S]*?<\/section>/)?.[0];
  assert.ok(hero, `Missing hero: ${page}`);
  assert.ok(!/publication-authors|publication-institution|publication-links/.test(hero), `Unremoved hero attribution/buttons: ${page}`);
}
const html = readFileSync(resolve(root, 'chat/index.html'), 'utf8');
for (const id of ['requirements', 'pipeline', 'knowledge', 'examples', 'results']) {
  assert.ok(html.includes(`id="${id}"`), `Missing content section ${id}`);
}
assert.ok(!/Qwen 2\.5|150 community domain queries|98\.7%|24\.6%|guarantees consistent|eliminates hallucination/.test(html), 'Stale or unsupported chatbot claim');
const evidencePath = resolve(root, 'chat/static/data/live-examples-2026-11-17.json');
assert.ok(existsSync(evidencePath), 'Missing real chatbot evidence');
const data = JSON.parse(readFileSync(evidencePath, 'utf8'));
assert.equal(data.runs.length, 4);
assert.equal(new Set(data.runs.map(x => x.id)).size, 4);
assert.equal(data.discord_delivery_tested, false);
assert.ok(data.runs.some(x => x.tool_calls.some(t => t.name === 'search_community')), 'No observed retrieval example');
assert.ok(data.runs.some(x => x.tool_calls.some(t => t.name === 'query_knowledge_graph')), 'No observed KG example');
for (const run of data.runs) {
  assert.ok(run.question && run.answer, `Empty Q&A ${run.id}`);
  assert.ok(Number.isFinite(run.wall_seconds) && run.wall_seconds > 0);
  assert.ok(Number.isInteger(run.model_calls) && run.model_calls > 0);
  assert.ok(html.includes(escape(run.question)), `Question not verbatim: ${run.id}`);
  assert.ok(html.includes(escape(run.answer)), `Answer not verbatim: ${run.id}`);
  assert.ok(html.includes(`data-sample-id="${run.id}"`), `Missing visible sample ${run.id}`);
}
assert.ok(html.includes('lang="ko"'), 'Korean samples need language markup');
assert.ok(html.includes('href="../"'), 'Body hub navigation must remain');
console.log(`Chat showcase checks passed: ${pages.length} headers, ${data.runs.length} verbatim live examples.`);
