#!/usr/bin/env node
/**
 * run-gates.js — the Layer-1 gate suite (BUILD.md Phase 0).
 *
 * Runs every automated gate the AFK loop must pass each iteration. Exits nonzero
 * on ANY failure. Designed to be GREEN on an empty/sample setup (acceptance bar
 * for the Phase 0 harness task) — each gate degrades to PASS or SKIP when the
 * artifacts it checks don't exist yet, while still exercising its own logic via
 * built-in sample data where possible.
 *
 * Gates:
 *   1. schema:definitions   every definitions/*.json validates against the definition schema
 *   2. schema:records       built-in sample records + test/records/*.json validate against the record schema
 *   3. scoring:fixtures     run engine/scoring.js over each test/fixtures/*.json (SKIP until scoring.js exists)
 *   4. lint:essence         no forbidden essence-language in definition copy
 *   5. citation:license     every definition carries non-empty source + citation + license
 *   6. render:smoke         instrument/index HTML reference the engine + declare a mobile viewport; engine modules import cleanly
 *   7. net:none             no network primitives anywhere in app code (engine/ instruments/ viewer/ index.html)
 *   8. pii:none             no PII in any record (sample + on-disk)
 *
 * Network-mention escape hatch: a source line containing the token
 * `gate-allow:network-mention` is exempt from gate 7 (for prose/comments).
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { validate } from '../vendor/jsonschema.js';
import { lintDefinitions } from './lint-essence.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const p = (...s) => join(ROOT, ...s);

const defSchema = readJSON(p('schema', 'instrument-definition.schema.json'));
const recSchema = readJSON(p('schema', 'vault-record.schema.json'));

function readJSON(path) { return JSON.parse(readFileSync(path, 'utf8')); }
function listJSON(dir) {
  return existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')).sort() : [];
}
function walkFiles(dir, exts) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walkFiles(full, exts));
    else if (exts.includes(extname(entry))) out.push(full);
  }
  return out;
}

/* Built-in sample records — exercise the record schema + PII gate even on empty setup. */
const SAMPLE_RECORDS = [
  { instrument_id: 'sample', instrument_version: '1.0.0', timestamp: '2026-08-20T09:00:00Z',
    variant: 'full', raw_responses: { 'main#0': 2, 'main#1': 0 }, scores: { order: 4 },
    bands: { order: 'high' },
    readout: [{ scale: 'order', scale_name: 'Orderliness', band: 'high', construct_explainer: 'x', light: 'a', shadow: 'b', one_thing_to_try: 'c' }],
    student_snapshot: 'This mostly fits; I will try one thing.' },
  { instrument_id: 'sample', instrument_version: '1.0.0', timestamp: '2026-08-20T09:00:00Z',
    variant: 'scores-only', scores: { order: 4 }, bands: { order: 'high' }, readout: [], student_snapshot: '' },
  { instrument_id: 'learner-profile', instrument_version: '1.0.0', timestamp: '2026-08-20T09:00:00Z',
    variant: 'full', raw_responses: { commit: ['open-minded'] }, scores: {}, bands: {}, readout: [], student_snapshot: 'My commitment for the year.' },
  { instrument_id: 'cognitive-ability', instrument_version: '2.0.0', timestamp: '2026-08-20T10:00:00Z',
    variant: 'full', raw_responses: { 'omib-3': '00001010000000000000' },
    scores: { 'figural-reasoning': 0.314 }, bands: {}, readout: [],
    student_snapshot: '',
    administration: { mode: 'standard-untimed', form_seed: 'fixture', bank_size: 220,
      form_length: 28, elapsed_seconds: 1440, interruptions: 1, skipped_items: [],
      palette_order: Array.from({ length: 20 }, (_, index) => index),
      item_order: ['omib-3'],
      item_parameters: { 'omib-3': { difficulty: 1.43, discrimination: 1.14, rules: 1 } },
      reused_items: 0,
      raw_correct: 16, theta: 0.314, theta_standard_error: 0.28, test_information: 12.7 } },
];

const NETWORK_PATTERNS = [
  { label: 'fetch()', re: /\bfetch\s*\(/ },
  { label: 'XMLHttpRequest', re: /\bXMLHttpRequest\b/ },
  { label: 'WebSocket', re: /\bnew\s+WebSocket\b/ },
  { label: 'sendBeacon', re: /navigator\s*\.\s*sendBeacon/ },
  { label: 'EventSource', re: /\bnew\s+EventSource\b/ },
  { label: 'dynamic import of URL', re: /\bimport\s*\(\s*['"`]https?:\/\// },
  { label: 'absolute http(s) src/href', re: /(?:src|href)\s*=\s*['"]https?:\/\//i },
];

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;

/**
 * Identity-key detector. Tokenizes the key (underscores/camelCase/digits are
 * separators) so compound keys like "student_name" are caught, while legitimate
 * record fields like "scale_name" and "instrument_id" are NOT. Bare "name" is
 * deliberately not flagged (too generic — scale_name is fine); identity is only
 * inferred from specific tokens or compounds.
 */
function isPiiKey(key) {
  const norm = String(key).toLowerCase();
  const compact = norm.replace(/[^a-z]/g, '');
  const tokens = norm.split(/[^a-z]+/).filter(Boolean);
  const SINGLE = new Set(['email', 'surname', 'phone', 'ssn', 'dob', 'birthdate', 'birthday']);
  const COMPACT = new Set([
    'studentname', 'firstname', 'lastname', 'fullname', 'givenname', 'familyname',
    'studentid', 'dateofbirth', 'emailaddress', 'phonenumber', 'homeaddress',
    'username', 'userid',
  ]);
  if (tokens.some((t) => SINGLE.has(t))) return true;
  if (COMPACT.has(compact)) return true;
  if (tokens.includes('student') && (tokens.includes('name') || tokens.includes('id'))) return true;
  return false;
}

/* ---- gate runner ---- */
const results = [];
async function gate(name, fn) {
  try {
    const r = await fn();
    results.push({ name, status: r?.skip ? 'SKIP' : 'PASS', detail: r?.detail || '' });
  } catch (e) {
    results.push({ name, status: 'FAIL', detail: e.message });
  }
}
function fail(msg) { throw new Error(msg); }

/* 1. definition schema */
await gate('schema:definitions', () => {
  const files = listJSON(p('definitions'));
  for (const f of files) {
    const { valid, errors } = validate(defSchema, readJSON(p('definitions', f)));
    if (!valid) fail(`${f}: ${errors.slice(0, 4).map((e) => `${e.path} ${e.message}`).join(' | ')}`);
  }
  return { detail: `${files.length} definition(s) valid`, skip: files.length === 0 ? false : false };
});

/* 2. record schema (samples + on-disk) */
await gate('schema:records', () => {
  let n = 0;
  for (const rec of SAMPLE_RECORDS) {
    const { valid, errors } = validate(recSchema, rec);
    if (!valid) fail(`sample record (${rec.variant}): ${errors.slice(0, 4).map((e) => `${e.path} ${e.message}`).join(' | ')}`);
    n++;
  }
  for (const f of listJSON(p('test', 'records'))) {
    const { valid, errors } = validate(recSchema, readJSON(p('test', 'records', f)));
    if (!valid) fail(`${f}: ${errors.slice(0, 4).map((e) => `${e.path} ${e.message}`).join(' | ')}`);
    n++;
  }
  return { detail: `${n} record(s) valid` };
});

/* 3. scoring fixtures — run engine/scoring.js over each fixture's cases */
await gate('scoring:fixtures', async () => {
  const fixtures = listJSON(p('test', 'fixtures'));
  if (!existsSync(p('engine', 'scoring.js'))) return { skip: true, detail: 'engine/scoring.js not built yet' };
  if (fixtures.length === 0) return { skip: true, detail: 'no fixtures yet' };
  const { scoreInstrument } = await import(pathToFileURL(p('engine', 'scoring.js')).href);
  let cases = 0;
  let skippedDefs = 0;
  for (const f of fixtures) {
    const fx = readJSON(p('test', 'fixtures', f));
    const defPath = fx.definition ? p(...fx.definition.split('/')) : p('definitions', `${fx.instrument}.json`);
    if (!existsSync(defPath)) { skippedDefs++; continue; } // instrument not built yet (Phase 2)
    const def = readJSON(defPath);
    for (const c of fx.cases) {
      const { scores, bands } = scoreInstrument(def, c.responses);
      if (!deepEqualObj(scores, c.expect.scores)) {
        fail(`${f}/${c.name}: scores ${JSON.stringify(scores)} != expected ${JSON.stringify(c.expect.scores)}`);
      }
      if (!deepEqualObj(bands, c.expect.bands)) {
        fail(`${f}/${c.name}: bands ${JSON.stringify(bands)} != expected ${JSON.stringify(c.expect.bands)}`);
      }
      cases++;
    }
  }
  const note = skippedDefs ? ` (${skippedDefs} fixture(s) skipped — definition not built yet)` : '';
  if (cases === 0 && skippedDefs > 0) return { skip: true, detail: `definitions not built yet for ${skippedDefs} fixture(s)` };
  return { detail: `${cases} fixture case(s) passed across ${fixtures.length} file(s)${note}` };
});

function deepEqualObj(a, b) {
  const ka = Object.keys(a).sort();
  const kb = Object.keys(b).sort();
  if (ka.length !== kb.length || !ka.every((k, i) => k === kb[i])) return false;
  return ka.every((k) => a[k] === b[k]);
}

/* 4. essence linter */
await gate('lint:essence', () => {
  const v = lintDefinitions(p('definitions'));
  if (v.length) fail(`${v.length} essence hit(s): ` + v.slice(0, 3).map((x) => `${x.file}@${x.path} "${x.match}"`).join(' | '));
  return { detail: 'no essence-language hits' };
});

/* 5. citation/license presence */
await gate('citation:license', () => {
  const files = listJSON(p('definitions'));
  for (const f of files) {
    const d = readJSON(p('definitions', f));
    for (const k of ['source', 'citation', 'license']) {
      if (typeof d[k] !== 'string' || d[k].trim() === '') fail(`${f}: missing/empty "${k}"`);
    }
  }
  return { detail: `${files.length} definition(s) carry source+citation+license` };
});

/* 5b. content fidelity — every scored item text must appear verbatim in its content-source.
   This is the automated transcribe-check: it catches any drift between a definition's
   psychometric items and the cited source file they were transcribed from. */
await gate('content:fidelity', () => {
  const norm = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase();
  const files = listJSON(p('definitions'));
  let checkedItems = 0;
  let checkedDefs = 0;
  const misses = [];
  for (const f of files) {
    const id = f.replace(/\.json$/, '');
    const srcPath = p('content-sources', `${id}.md`);
    if (!existsSync(srcPath)) continue; // aspirational/no-source defs skip
    const def = readJSON(p('definitions', f));
    const md = norm(readFileSync(srcPath, 'utf8'));
    let itemsHere = 0;
    for (const section of def.sections) {
      if (section.type !== 'scored-likert') continue;
      for (const it of section.items) {
        itemsHere++;
        if (!md.includes(norm(it.text))) misses.push(`${f}: "${it.text.slice(0, 60)}…"`);
      }
    }
    if (itemsHere > 0) { checkedDefs++; checkedItems += itemsHere; }
  }
  if (misses.length) fail(`${misses.length} item(s) not found verbatim in content-source: ` + misses.slice(0, 5).join(' | '));
  return { detail: `${checkedItems} item(s) across ${checkedDefs} instrument(s) match their cited source verbatim` };
});

/* 6. render smoke */
await gate('render:smoke', async () => {
  const htmls = [
    ...walkFiles(p('instruments'), ['.html']),
    ...walkFiles(p('viewer'), ['.html']),
    ...(existsSync(p('index.html')) ? [p('index.html')] : []),
  ];
  for (const h of htmls) {
    const src = readFileSync(h, 'utf8');
    if (!/<meta[^>]+name=["']viewport["']/i.test(src)) fail(`${h}: missing mobile viewport meta`);
  }
  // engine modules must import cleanly in Node (no top-level DOM access)
  const engineFiles = walkFiles(p('engine'), ['.js']);
  for (const e of engineFiles) {
    try { await import(pathToFileURL(e).href); }
    catch (err) { fail(`engine module ${e} failed to import in Node: ${err.message}`); }
  }
  if (htmls.length === 0 && engineFiles.length === 0) return { skip: true, detail: 'no app files yet' };
  return { detail: `${htmls.length} HTML page(s) + ${engineFiles.length} engine module(s) ok` };
});

/* 7. no network primitives */
await gate('net:none', () => {
  const files = [
    ...walkFiles(p('engine'), ['.js']),
    ...walkFiles(p('instruments'), ['.html', '.js']),
    ...walkFiles(p('viewer'), ['.html', '.js']),
    ...(existsSync(p('index.html')) ? [p('index.html')] : []),
    ...(existsSync(p('app.bundle.js')) ? [p('app.bundle.js')] : []),
  ];
  const hits = [];
  for (const f of files) {
    const lines = readFileSync(f, 'utf8').split(/\r?\n/);
    lines.forEach((line, i) => {
      if (line.includes('gate-allow:network-mention')) return;
      for (const { label, re } of NETWORK_PATTERNS) {
        if (re.test(line)) hits.push(`${f}:${i + 1} ${label}`);
      }
    });
  }
  if (hits.length) fail(`network primitive(s) found: ` + hits.slice(0, 5).join(' | '));
  return { detail: `${files.length} app file(s) clean of network calls` };
});

/* 8. no PII in records */
await gate('pii:none', () => {
  const records = [
    ...SAMPLE_RECORDS.map((r) => ({ label: `sample:${r.variant}`, data: r })),
    ...listJSON(p('test', 'records')).map((f) => ({ label: f, data: readJSON(p('test', 'records', f)) })),
  ];
  const hits = [];
  for (const { label, data } of records) scanPII(data, '', label, hits);
  if (hits.length) fail(`PII signal(s): ` + hits.slice(0, 5).join(' | '));
  return { detail: `${records.length} record(s) free of PII` };
});

/* 8b. page sync — each instrument page's inlined definition must equal its definitions/*.json.
   Catches a page left stale after a definition edit without `npm run build`. */
await gate('page:sync', () => {
  const htmls = walkFiles(p('instruments'), ['.html']);
  let checked = 0;
  const stale = [];
  for (const h of htmls) {
    const src = readFileSync(h, 'utf8');
    const m = src.match(/<script type="application\/json" id="pi-def">([\s\S]*?)<\/script>/);
    if (!m) continue; // a page without an inlined definition (none expected, but skip safely)
    let inline;
    try { inline = JSON.parse(m[1]); } catch (e) { fail(`${h}: inlined definition is not valid JSON`); continue; }
    const defPath = p('definitions', `${inline.id}.json`);
    if (!existsSync(defPath)) { fail(`${h}: no definitions/${inline.id}.json for inlined def`); continue; }
    const onDisk = readJSON(defPath);
    if (JSON.stringify(inline) !== JSON.stringify(onDisk)) stale.push(`${inline.id} (run \`npm run build\`)`);
    checked++;
  }
  if (stale.length) fail(`stale page definition(s): ${stale.join(', ')}`);
  if (checked === 0) return { skip: true, detail: 'no inlined-definition pages yet' };
  return { detail: `${checked} page(s) in sync with their definition` };
});

/* 9. viewer aggregation — the viewer aggregates the test record folder correctly */
await gate('viewer:aggregate', async () => {
  if (!existsSync(p('viewer', 'viewer.js'))) return { skip: true, detail: 'viewer not built yet' };
  const { aggregateRecords, scaleChange } = await import(pathToFileURL(p('viewer', 'viewer.js')).href);
  const files = listJSON(p('test', 'records'));
  const records = files.map((f) => readJSON(p('test', 'records', f)));
  const portrait = aggregateRecords(records);
  if (portrait.total !== records.length) fail(`portrait.total ${portrait.total} != ${records.length} records`);
  const sittingSum = portrait.instruments.reduce((n, i) => n + i.sittings, 0);
  if (sittingSum !== records.length) fail(`sittings sum ${sittingSum} != ${records.length}`);
  // 0-record case must not throw and must be empty
  const empty = aggregateRecords([]);
  if (empty.total !== 0 || empty.instruments.length !== 0) fail('aggregate([]) is not empty');
  if (scaleChange([
    { timestamp: '2026-01-01', score: 3, instrument_version: '1.0.0' },
    { timestamp: '2027-01-01', score: 8, instrument_version: '2.0.0' },
  ]) !== null) fail('scaleChange compared incompatible instrument versions');
  return { detail: `${records.length} record(s) -> ${portrait.instruments.length} instrument(s), ${portrait.snapshots.length} snapshot(s), ${portrait.commitments.length} commitment(s)` };
});

/* 10. local library — completed sittings accumulate, replace by identity, and
   round-trip through the portable archive format without needing a browser. */
await gate('library:local', async () => {
  const modulePath = p('engine', 'local-store.js');
  if (!existsSync(modulePath)) return { skip: true, detail: 'engine/local-store.js not built yet' };
  const { emptyState, upsertRecord, importData, serializeArchive } =
    await import(pathToFileURL(modulePath).href);
  const first = SAMPLE_RECORDS[0];
  const later = { ...SAMPLE_RECORDS[0], timestamp: '2027-08-20T09:00:00Z', scores: { order: 5 } };
  const revisedFirst = { ...first, student_snapshot: 'Updated reflection.' };

  let state = emptyState();
  state = upsertRecord(state, first);
  state = upsertRecord(state, later);
  state = upsertRecord(state, revisedFirst);
  if (state.records.length !== 2) fail(`upsert should keep 2 unique sittings, got ${state.records.length}`);
  if (state.records[0].student_snapshot !== 'Updated reflection.') fail('upsert did not replace the matching sitting');

  const archive = JSON.parse(serializeArchive({
    ...state,
    reflection: { pattern: 'I notice a pattern.', shift: '', experiment: '' },
  }, '2028-01-02T00:00:00Z'));
  if (archive.format !== 'personal-inventory-archive' || archive.records.length !== 2) {
    fail('archive shape or record count is wrong');
  }
  const imported = importData(emptyState(), archive);
  if (imported.state.records.length !== 2 || imported.state.reflection.pattern !== 'I notice a pattern.') {
    fail('archive did not round-trip records and portrait reflection');
  }
  const duplicate = importData(imported.state, first);
  if (duplicate.state.records.length !== 2) fail('single-record import created a duplicate');
  const malformed = importData(imported.state, {
    ...first,
    readout: { not: 'an array' },
  });
  if (malformed.recognized !== 0 || malformed.state.records.length !== 2) {
    fail('malformed record was accepted into the local library');
  }
  return { detail: 'upsert, validation, deduplication, reflection, and archive round-trip passed' };
});

/* 11. matrix scoring — every published key scores full credit, while an
   impossible all-empty construction scores zero. This catches response-format
   and exact-match regressions in the cognitive reasoning instrument. */
await gate('matrix:scoring', async () => {
  const definition = readJSON(p('definitions', 'cognitive-ability.json'));
  const { scoreInstrument } = await import(pathToFileURL(p('engine', 'scoring.js')).href);
  const section = definition.sections.find((entry) => entry.type === 'scored-matrix');
  if (!section) fail('cognitive-ability has no scored-matrix section');

  const correct = Object.fromEntries(section.items.map((item) => [item.id, item.solution]));
  const wrong = Object.fromEntries(section.items.map((item) => [item.id, '00000000000000000000']));
  const full = scoreInstrument(definition, correct);
  const zero = scoreInstrument(definition, wrong);
  if (full.scores['figural-reasoning'] !== section.items.length) {
    fail(`published keys scored ${full.scores['figural-reasoning']} / ${section.items.length}`);
  }
  if (zero.scores['figural-reasoning'] !== 0) {
    fail(`empty constructions should score 0, got ${zero.scores['figural-reasoning']}`);
  }
  return { detail: `${section.items.length} published solutions exact-matched correctly` };
});

await gate('matrix:forms', async () => {
  const definition = readJSON(p('definitions', 'cognitive-ability.json'));
  const section = definition.sections.find((entry) => entry.type === 'scored-matrix');
  const { createMatrixForm } = await import(pathToFileURL(p('engine', 'matrix-form.js')).href);
  const { estimate2pl } = await import(pathToFileURL(p('engine', 'irt.js')).href);
  if (section.items.length !== 220) fail(`expected complete 220-item bank, got ${section.items.length}`);
  if (section.items.filter((item) => item.calibrated !== false).length !== 219) {
    fail('expected 219 calibrated items and one retained misfitting item');
  }
  const bankFields = section.items.map(({
    id, item_code, solution, difficulty, discrimination, calibrated, rules,
  }) => ({ id, item_code, solution, difficulty, discrimination, calibrated, rules }));
  const bankHash = createHash('sha256').update(JSON.stringify(bankFields)).digest('hex');
  if (bankHash !== 'b4ddf7801df897a8c8bd1a1e39999fcf9a7d05e42bdcb063f05a931fe00afae2') {
    fail(`embedded item bank drifted from the imported official workbook (${bankHash})`);
  }

  const first = createMatrixForm(section, { seed: 'repeatable-form' });
  const repeated = createMatrixForm(section, { seed: 'repeatable-form' });
  const ids = first.section.items.map((item) => item.id);
  if (first.section.items.length !== 28) fail(`expected 28 scored items, got ${first.section.items.length}`);
  if (first.practiceItems.length !== 2) fail(`expected two practice items, got ${first.practiceItems.length}`);
  if (ids.join('|') !== repeated.section.items.map((item) => item.id).join('|')) {
    fail('same seed did not reproduce the same form');
  }
  const counts = Object.fromEntries([1, 2, 3, 4, 5].map((rules) => [
    rules,
    first.section.items.filter((item) => item.rules === rules).length,
  ]));
  if (JSON.stringify(counts) !== JSON.stringify({ 1: 3, 2: 6, 3: 10, 4: 6, 5: 3 })) {
    fail(`rule-count balance is wrong: ${JSON.stringify(counts)}`);
  }
  const next = createMatrixForm(section, { seed: 'fresh-form', excludeIds: ids });
  const overlap = next.section.items.filter((item) => ids.includes(item.id)).length;
  if (overlap !== 0) fail(`fresh form reused ${overlap} item(s) before necessary`);
  const exposureCounts = Object.fromEntries(section.items.map((item) => [item.id, 1]));
  for (const id of ids) exposureCounts[id] = 20;
  const leastExposed = createMatrixForm(section, { seed: 'repeatable-form', exposureCounts });
  const overexposed = leastExposed.section.items.filter((item) => ids.includes(item.id)).length;
  if (overexposed !== 0) fail(`least-exposed fallback selected ${overexposed} overexposed item(s)`);
  if (first.paletteOrder.some((value, index) => value !== index)) {
    fail('validated construction palette order was changed');
  }

  const { createMatrixDraft, normalizeMatrixDraft } =
    await import(pathToFileURL(p('engine', 'matrix-draft.js')).href);
  const draftValue = createMatrixDraft({
    definition,
    form: first,
    answers: { [ids[0]]: first.section.items[0].solution },
    skipped: [],
    current: 1,
    elapsedMs: 65432,
    interruptions: 2,
  });
  const restoredDraft = normalizeMatrixDraft(draftValue, definition, section);
  if (!restoredDraft || restoredDraft.current !== 1 ||
      restoredDraft.item_order.join('|') !== ids.join('|') ||
      restoredDraft.elapsed_ms !== 65432) {
    fail('matrix checkpoint did not validate and round-trip');
  }
  if (normalizeMatrixDraft({ ...draftValue, instrument_version: 'stale' }, definition, section)) {
    fail('stale matrix checkpoint was accepted');
  }

  const correct = Object.fromEntries(first.section.items.map((item) => [item.id, item.solution]));
  const incorrect = Object.fromEntries(first.section.items.map((item) => [item.id, '00000000000000000000']));
  const high = estimate2pl(first.section.items, correct);
  const low = estimate2pl(first.section.items, incorrect);
  if (!(high.theta > 0 && low.theta < 0 && high.standardError > 0 && low.standardError > 0)) {
    fail('2PL estimator did not separate all-correct and all-incorrect response patterns');
  }
  return { detail: '220-item bank, balanced 28-item forms, exposure control, and 2PL estimate passed' };
});

function scanPII(node, path, label, hits) {
  if (typeof node === 'string') {
    if (EMAIL_RE.test(node)) hits.push(`${label}@${path}: email-like value`);
  } else if (Array.isArray(node)) {
    node.forEach((v, i) => scanPII(v, `${path}[${i}]`, label, hits));
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if (isPiiKey(k)) hits.push(`${label}@${path}: PII-like key "${k}"`);
      scanPII(v, path ? `${path}.${k}` : k, label, hits);
    }
  }
}

/* ---- report + exit ---- */
const failed = results.filter((r) => r.status === 'FAIL');
console.log('\n[run-gates] Layer-1 gate suite\n');
for (const r of results) {
  const mark = r.status === 'PASS' ? '✓' : r.status === 'SKIP' ? '·' : '✗';
  console.log(`  ${mark} ${r.status.padEnd(4)} ${r.name.padEnd(20)} ${r.detail}`);
}
console.log('');
if (failed.length) {
  console.error(`[run-gates] FAILED — ${failed.length} gate(s) red.`);
  process.exit(1);
}
console.log(`[run-gates] all gates green (${results.filter((r) => r.status === 'SKIP').length} skipped pending later phases).`);
process.exit(0);
