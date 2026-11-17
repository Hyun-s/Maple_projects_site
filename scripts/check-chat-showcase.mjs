import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
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
  const hero = html.match(/<section\b[^>]*class="[^"]*\bhero\b[^\"]*"[^>]*>[\s\S]*?<\/section>/)?.[0];
  assert.ok(hero, `Missing hero: ${page}`);
  assert.ok(!/publication-authors|publication-institution|publication-links/.test(hero), `Unremoved hero attribution/buttons: ${page}`);
}
const html = readFileSync(resolve(root, 'chat/index.html'), 'utf8');
for (const id of ['requirements', 'pipeline', 'knowledge', 'discord-usage', 'examples', 'results']) {
  assert.ok(html.includes(`id="${id}"`), `Missing content section ${id}`);
}
assert.ok(!/Qwen 2\.5|150 community domain queries|98\.7%|24\.6%|guarantees consistent|eliminates hallucination|Verbatim answer opening|Execution Measurements|data-sample-id="(?:source-discovery|xenon-classes|destiny-meanings|equipment-evidence)"/.test(html), 'Stale demonstration or unsupported claim');
const evidencePath = resolve(root, 'chat/static/data/historical-issues.json');
assert.ok(existsSync(evidencePath), 'Missing historical issue evidence');
const data = JSON.parse(readFileSync(evidencePath, 'utf8'));
assert.equal(data.record_type, 'historical_issue_excerpts');
assert.equal(data.new_model_runs, false);
assert.equal(data.complete_original_conversations, false);
assert.equal(data.controlled_ablation, false);
assert.deepEqual(data.issues.map(x => x.id), ['SQ-2026-08-24-001', 'SQ-2026-08-24-002']);
let quoteCount = 0;
for (const issue of data.issues) {
  assert.equal(issue.status, 'monitoring');
  assert.ok(html.includes(`data-sample-id="${issue.id}"`), `Missing visible issue ${issue.id}`);
  assert.match(issue.source_url, /^https:\/\/github\.com\/Hyun-s\/Maple_Chat\/blob\/[a-f0-9]{40}\/docs\/service-quality-log\.md#L\d+-L\d+$/);
  assert.ok(html.includes(issue.source_url));
  assert.ok(issue.quotes.length > 0);
  for (const quote of issue.quotes) {
    assert.ok(quote.id && quote.text && Number.isInteger(quote.line_start));
    assert.equal(createHash('sha256').update(quote.text).digest('hex'), quote.sha256, `Quote hash mismatch ${quote.id}`);
    assert.ok(html.includes(`data-record-id="${quote.id}"`), `Missing quote ${quote.id}`);
    assert.ok(html.includes(escape(quote.text)), `Recorded excerpt not verbatim ${quote.id}`);
    quoteCount++;
  }
}
assert.equal(new Set(data.issues.flatMap(x => x.quotes.map(q => q.id))).size, quoteCount);
const primary = data.discord_usage.commands.slice(0, 3);
assert.deepEqual(primary.map(x => [x.flags, x.uses_evidence, x.uses_knowledge]), [
  ['--qa --no-rag', false, false], ['--qa --rag-mode naive', true, false], ['--qa --rag-mode mix', true, true],
]);
for (const command of data.discord_usage.commands) assert.ok(html.includes(escape(command.flags)), `Missing command ${command.flags}`);
assert.ok(html.includes('not a controlled no-RAG versus RAG ablation'));
assert.ok(html.includes('not complete original Discord transcripts'));
assert.ok(html.includes('lang="ko"'));
assert.ok(html.includes('href="../"'));
const old = JSON.parse(readFileSync(resolve(root, 'chat/static/data/live-examples-2026-11-17.json'), 'utf8'));
assert.equal(old.status, 'withdrawn');
assert.equal(old.replacement, 'historical-issues.json');
assert.ok(!old.runs, 'Old generated demonstrations must not remain in the public record');
console.log(`Chat showcase checks passed: ${pages.length} headers, ${data.issues.length} historical issues, ${quoteCount} exact excerpts, ${data.discord_usage.commands.length} documented commands.`);
