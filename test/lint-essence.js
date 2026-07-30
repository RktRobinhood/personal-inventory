#!/usr/bin/env node
/**
 * lint-essence.js — the essence-language linter (Layer-1 gate).
 *
 * Enforces the single most important tone rule in DESIGN.md / BUILD.md
 * (Operating Rule 4): no copy may pronounce a verdict about WHO THE STUDENT IS.
 * Tendency language only — "your answers lean…", "people who lean this way
 * tend to…" — never essence language ("you are…", "the real you", "defines you").
 *
 * The instrument teaches; it never pronounces. A hit here is a HARD STOP.
 *
 * Scope: every human-facing string in every definitions/*.json. Psychometric
 * item wording is first-person ("I am the life of the party", IPIP style), so
 * scanning it is safe — the forbidden patterns are second-person verdicts.
 *
 * Usage:
 *   node test/lint-essence.js            # scan ./definitions, exit 1 on any hit
 *   import { lintDefinitions, scanString, ESSENCE_PATTERNS } from './lint-essence.js'
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFINITIONS_DIR = resolve(__dirname, '..', 'definitions');

/**
 * Forbidden second-person essence/verdict patterns. Case-insensitive.
 * Each entry: { label (why it's forbidden), re (global regex) }.
 * Apostrophes match both straight (') and curly (’).
 */
export const ESSENCE_PATTERNS = [
  { label: 'essence verdict "you are"', re: /\byou\s+are\b/gi },
  { label: 'essence verdict "you’re"', re: /\byou['’]re\b/gi },
  { label: 'fixed-identity "you have always been"', re: /\byou['’]?ve?\s+always\s+been\b/gi },
  { label: 'fixed-identity "you will always be"', re: /\byou['’]?ll?\s+always\b/gi },
  { label: 'fixed-identity "you were born"', re: /\byou\s+were\s+born\b/gi },
  { label: 'labelling "you are a/the (type of) person"', re: /\byou\s+are\s+(?:a|an|the)\b/gi },
  { label: 'reification "defines you"', re: /\bdefines\s+you\b/gi },
  { label: 'reification "the real you"', re: /\bthe\s+real\s+you\b/gi },
  { label: 'reification "your true self"', re: /\byour\s+true\s+self\b/gi },
  { label: 'reification "who you really are"', re: /\bwho\s+you\s+really\s+are\b/gi },
  { label: 'labelling "that’s just who you are"', re: /\bjust\s+who\s+you\s+are\b/gi },
];

/** Scan a single string; return array of { label, match } for every hit. */
export function scanString(str) {
  if (typeof str !== 'string') return [];
  const hits = [];
  for (const { label, re } of ESSENCE_PATTERNS) {
    re.lastIndex = 0; // regexes are global+stateful; reset before reuse
    let m;
    while ((m = re.exec(str)) !== null) {
      hits.push({ label, match: m[0] });
      if (m.index === re.lastIndex) re.lastIndex++; // guard against zero-width
    }
  }
  return hits;
}

/** Recursively walk a parsed JSON value, scanning every string. */
function walk(node, path, violations) {
  if (typeof node === 'string') {
    for (const hit of scanString(node)) {
      violations.push({ path, ...hit, context: snippet(node, hit.match) });
    }
  } else if (Array.isArray(node)) {
    node.forEach((v, i) => walk(v, `${path}[${i}]`, violations));
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) walk(v, path ? `${path}.${k}` : k, violations);
  }
}

function snippet(str, match) {
  const i = str.toLowerCase().indexOf(match.toLowerCase());
  if (i < 0) return str.slice(0, 80);
  const start = Math.max(0, i - 25);
  const end = Math.min(str.length, i + match.length + 25);
  return (start > 0 ? '…' : '') + str.slice(start, end) + (end < str.length ? '…' : '');
}

/**
 * Lint every definitions/*.json in `dir`. Returns a flat array of violations:
 * { file, path, label, match, context }. Empty array = clean.
 */
export function lintDefinitions(dir = DEFINITIONS_DIR) {
  const violations = [];
  if (!existsSync(dir)) return violations;
  const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  for (const file of files) {
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    } catch (e) {
      violations.push({ file, path: '<root>', label: 'invalid JSON', match: '', context: String(e.message) });
      continue;
    }
    const fileViolations = [];
    walk(parsed, '', fileViolations);
    for (const v of fileViolations) violations.push({ file, ...v });
  }
  return violations;
}

// ---- CLI ----
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const violations = lintDefinitions();
  if (violations.length === 0) {
    const dirExists = existsSync(DEFINITIONS_DIR);
    const count = dirExists ? readdirSync(DEFINITIONS_DIR).filter((f) => f.endsWith('.json')).length : 0;
    console.log(`[lint-essence] clean — scanned ${count} definition file(s), no essence-language hits.`);
    process.exit(0);
  }
  console.error(`[lint-essence] FAILED — ${violations.length} essence-language hit(s):`);
  for (const v of violations) {
    console.error(`  ${v.file} @ ${v.path}\n    ${v.label}: "${v.match}"  in  ${v.context}`);
  }
  process.exit(1);
}
