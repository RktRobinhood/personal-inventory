/**
 * Pure, deterministic form construction for a large calibrated matrix bank.
 * A seed reproduces the same form; exclusions reduce repeat exposure until the
 * bank is exhausted. Items are sampled across rule-count and difficulty strata.
 */

export function createMatrixForm(section, options = {}) {
  const config = section.form || {};
  const practiceIds = new Set(config.practice_ids || []);
  const eligibleItems = section.items.filter((item) =>
    item.calibrated !== false && !practiceIds.has(item.id));
  const length = Math.min(config.length || 28, eligibleItems.length);
  const seed = String(options.seed || 'personal-inventory');
  const random = seededRandom(seed);
  const exposureCounts = options.exposureCounts || {};
  const excluded = new Set([
    ...(options.excludeIds || []),
    ...Object.keys(exposureCounts).filter((id) => Number(exposureCounts[id]) > 0),
  ]);
  const targets = normalizedTargets(config.rule_targets, length);
  const selected = [];

  for (const [ruleText, target] of Object.entries(targets)) {
    const rules = Number(ruleText);
    const group = eligibleItems.filter((item) => item.rules === rules);
    const fresh = group.filter((item) => !excluded.has(item.id));
    const old = group
      .filter((item) => excluded.has(item.id))
      .sort((a, b) => exposureFor(a) - exposureFor(b));
    selected.push(...difficultySample(fresh, Math.min(target, fresh.length), random));
    if (selected.filter((item) => item.rules === rules).length < target) {
      const used = new Set(selected.map((item) => item.id));
      const fallback = leastExposed(old.filter((item) => !used.has(item.id)));
      const needed = target - selected.filter((item) => item.rules === rules).length;
      selected.push(...difficultySample(fallback, needed, random));
    }
  }

  if (selected.length < length) {
    const used = new Set(selected.map((item) => item.id));
    const remaining = eligibleItems.filter((item) => !used.has(item.id));
    selected.push(...difficultySample(
      remaining.filter((item) => !excluded.has(item.id)),
      length - selected.length,
      random,
    ));
  }
  if (selected.length < length) {
    const used = new Set(selected.map((item) => item.id));
    selected.push(...difficultySample(
      leastExposed(eligibleItems.filter((item) => !used.has(item.id))),
      length - selected.length,
      random,
    ));
  }

  // Preserve a broad easy-to-hard arc, but randomize within five difficulty
  // blocks. This prevents a memorisable order without front-loading the hardest
  // problems and distorting the experience.
  const ordered = selected.slice(0, length).sort((a, b) => a.difficulty - b.difficulty);
  const blockSize = Math.ceil(ordered.length / 5);
  const items = [];
  for (let index = 0; index < ordered.length; index += blockSize) {
    items.push(...shuffle(ordered.slice(index, index + blockSize), random));
  }

  // The construction elements are not multiple-choice answers. Their fixed
  // semantic/spatial order is part of the validated response interface.
  const paletteOrder = Array.from({ length: 20 }, (_, index) => index);
  return {
    section: { ...section, items },
    practiceItems: section.items.filter((item) => practiceIds.has(item.id)),
    seed,
    paletteOrder,
    bankSize: section.items.length,
    eligibleSize: eligibleItems.length,
    reused: items.filter((item) => excluded.has(item.id)).length,
  };

  function exposureFor(item) {
    return Number(exposureCounts[item.id]) || (excluded.has(item.id) ? 1 : 0);
  }

  function leastExposed(items) {
    if (!items.length) return items;
    const minimum = Math.min(...items.map(exposureFor));
    return items.filter((item) => exposureFor(item) === minimum);
  }
}

export function randomSeed(cryptoApi = globalThis.crypto) {
  if (cryptoApi?.getRandomValues) {
    const values = new Uint32Array(4);
    cryptoApi.getRandomValues(values);
    return Array.from(values, (value) => value.toString(16).padStart(8, '0')).join('');
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function normalizedTargets(input, length) {
  const source = input && typeof input === 'object'
    ? Object.fromEntries(Object.entries(input).map(([key, value]) => [key, Number(value)]))
    : { 1: 3, 2: 6, 3: 10, 4: 6, 5: 3 };
  const sum = Object.values(source).reduce((total, value) => total + value, 0);
  if (sum === length) return source;
  const scaled = Object.entries(source).map(([key, value]) => ({
    key,
    exact: (value / sum) * length,
  }));
  const result = Object.fromEntries(scaled.map(({ key, exact }) => [key, Math.floor(exact)]));
  let left = length - Object.values(result).reduce((total, value) => total + value, 0);
  for (const { key } of scaled.sort((a, b) => (b.exact % 1) - (a.exact % 1))) {
    if (left-- <= 0) break;
    result[key]++;
  }
  return result;
}

function difficultySample(items, count, random) {
  if (count <= 0 || !items.length) return [];
  const ordered = items.slice().sort((a, b) => a.difficulty - b.difficulty);
  const result = [];
  for (let index = 0; index < count; index++) {
    const start = Math.floor((index / count) * ordered.length);
    const end = Math.max(start + 1, Math.floor(((index + 1) / count) * ordered.length));
    const candidates = ordered.slice(start, end).filter((item) => !result.includes(item));
    const pool = candidates.length ? candidates : ordered.filter((item) => !result.includes(item));
    if (!pool.length) break;
    result.push(pool[Math.floor(random() * pool.length)]);
  }
  return result;
}

function shuffle(values, random) {
  const result = values.slice();
  for (let index = result.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

function seededRandom(seed) {
  let state = 2166136261;
  for (const char of seed) {
    state ^= char.charCodeAt(0);
    state = Math.imul(state, 16777619);
  }
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
