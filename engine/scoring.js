/**
 * scoring.js — PURE scoring logic. Importable in both Node (tests) and the
 * browser (the app), so the fixtures test the exact code the app runs.
 * No DOM, no I/O, no side effects.
 *
 * Model (DESIGN.md / BUILD.md):
 *  - A response is the 0-based index into an item's anchors (0 = lowest anchor,
 *    points-1 = highest). Reverse-keyed items are flipped before summing.
 *  - A scale's raw score is the sum of its items' (reverse-keyed) values.
 *  - COMPOSITES. A scale with no items is computed from other scales. Either it
 *    declares `members: [{ scale, sign }]` (the signed sum — this is how the Big
 *    Five hierarchy builds facets -> aspects -> domains -> metatraits), or, in
 *    the legacy shape, it is simply named as some scale's `parent` and sums its
 *    children. Composites may nest; they are resolved in dependency order.
 *  - BANDS come in two modes, chosen per section by `band_thresholds.mode`:
 *      criterion-referenced (default) — the score is normalized into [0,1] over
 *        the scale's OWN min..max range and mapped through the fractional
 *        `cuts`. Honest when no norms exist; it says "where on the instrument",
 *        not "where among people".
 *      norm-referenced — the score is converted to a z against the chosen norm
 *        group's mean/SD for that scale, then to a percentile; `cuts` are read
 *        as percentile fractions. This is what stops nearly everyone landing in
 *        the middle band: the middle now means "like most people", not "near the
 *        midpoint of the answer scale".
 *    A value exactly on a cut goes to the HIGHER band (>= boundary) in both.
 *  - UNCERTAINTY. In norm-referenced mode every scale also reports a percentile
 *    interval of one standard error of measurement either side of the observed
 *    score (sem = sd * sqrt(1 - reliability)). A four-item facet is a rough
 *    measure and the read-out has to show that.
 */

/** Flip a 0-based response for a reverse-keyed item. */
export function reverseKey(raw, points) {
  return (points - 1) - raw;
}

/** The response-map key for an item: its id, else "<sectionId>#<itemIndex>". */
export function responseKey(section, item, index) {
  return item.id || `${section.id}#${index}`;
}

/**
 * Map a normalized value in [0,1] to a band id.
 * thresholds = { bands: [lowest..highest], cuts: [ascending fractions] },
 * with cuts.length === bands.length - 1. `>= cut` moves up a band.
 */
export function assignBand(normalized, thresholds) {
  const { bands, cuts } = thresholds;
  let idx = 0;
  for (const c of cuts) if (normalized >= c) idx++;
  if (idx > bands.length - 1) idx = bands.length - 1;
  return bands[idx];
}

/** The authored-copy key a band id uses (seven display bands share three poles). */
export function copyPole(bandId, thresholds) {
  return thresholds?.copy_poles?.[bandId] || bandId;
}

/**
 * Standard normal CDF. Zelen & Severo (1964) rational approximation of the
 * error function; absolute error < 7.5e-8, far finer than a percentile needs.
 */
export function normalCdf(z) {
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}

/** Percentile (0..100) of a score against a normal norm, clamped away from the impossible ends. */
export function percentileOf(score, mean, sd) {
  if (!(sd > 0)) return 50;
  return clampPercentile(normalCdf((score - mean) / sd) * 100);
}

function clampPercentile(p) {
  return Math.min(99, Math.max(1, p));
}

/** Which norm group a section is scored against. */
export function resolveNormGroup(section, requestedId) {
  const norms = section?.norms;
  if (!norms) return null;
  const wanted = requestedId || norms.default_group;
  return norms.groups.find((g) => g.id === wanted) || norms.groups.find((g) => g.id === norms.default_group) || norms.groups[0];
}

/**
 * Score an instrument definition against a response map.
 * Returns { scores, bands, details, normGroup } keyed by scale id.
 *   scores[id]  -> summed raw score (every level of the hierarchy)
 *   bands[id]   -> assigned band id
 *   details[id] -> { score, min, max, normalized, band, level, copy_band,
 *                    and in norm-referenced mode: mean, sd, reliability, z,
 *                    percentile, percentile_low, percentile_high, sem }
 * options.normGroup selects the comparison group for norm-referenced sections.
 * Throws on a missing or out-of-range response (a definition/fixture bug).
 */
export function scoreInstrument(definition, responses, options = {}) {
  const leaves = {}; // scaleId -> { score, min, max, section } (scales with items)
  const sectionOf = {}; // scaleId -> its section, for every declared scale

  for (const section of definition.sections) {
    if (!['scored-likert', 'scored-matrix'].includes(section.type)) continue;
    for (const scale of section.scales) sectionOf[scale.id] = section;
  }

  for (const section of definition.sections) {
    if (section.type === 'scored-matrix') {
      for (const item of section.items) {
        if (!Object.prototype.hasOwnProperty.call(responses, item.id)) {
          throw new Error(`missing response for item "${item.id}"`);
        }
        const raw = responses[item.id];
        if (typeof raw !== 'string' || !/^[01]{20}$/.test(raw)) {
          throw new Error(`response "${item.id}" is not a 20-element construction`);
        }
        const leaf = leaves[item.scale] || (leaves[item.scale] = { score: 0, min: 0, max: 0, section });
        leaf.score += raw === item.solution ? 1 : 0;
        leaf.max += 1;
      }
      continue;
    }
    if (section.type !== 'scored-likert') continue;
    section.items.forEach((item, i) => {
      const key = responseKey(section, item, i);
      if (!Object.prototype.hasOwnProperty.call(responses, key)) {
        throw new Error(`missing response for item "${key}"`);
      }
      const raw = responses[key];
      if (!Number.isInteger(raw) || raw < 0 || raw > item.points - 1) {
        throw new Error(`response "${key}"=${JSON.stringify(raw)} out of range 0..${item.points - 1}`);
      }
      const value = item.reverse ? reverseKey(raw, item.points) : raw;
      const leaf = leaves[item.scale] || (leaves[item.scale] = { score: 0, min: 0, max: 0, section });
      leaf.score += value;
      leaf.max += item.points - 1; // min contribution is always 0
    });
  }

  const acc = { ...leaves };

  // Composites, resolved in dependency order. A scale is composite when it
  // declares `members`, or (legacy shape) when it owns no items but is named as
  // some scale's `parent`.
  const pending = [];
  for (const section of definition.sections) {
    if (!['scored-likert', 'scored-matrix'].includes(section.type)) continue;
    for (const scale of section.scales) {
      if (acc[scale.id]) continue; // has items of its own
      const members = compositeMembers(scale, section);
      if (members.length) pending.push({ scale, section, members });
    }
  }
  let remaining = pending;
  while (remaining.length) {
    const next = [];
    for (const entry of remaining) {
      if (!entry.members.every((m) => acc[m.scale] || !isKnownScale(m.scale, sectionOf))) {
        next.push(entry);
        continue;
      }
      const sum = { score: 0, min: 0, max: 0, section: entry.section };
      let contributed = false;
      for (const { scale: id, sign } of entry.members) {
        const member = acc[id];
        if (!member) continue; // a member with no answered items
        contributed = true;
        sum.score += sign * member.score;
        sum.min += sign > 0 ? member.min : -member.max;
        sum.max += sign > 0 ? member.max : -member.min;
      }
      if (contributed) acc[entry.scale.id] = sum;
    }
    if (next.length === remaining.length) break; // unresolvable cycle or dangling refs
    remaining = next;
  }

  const scores = {};
  const bands = {};
  const details = {};
  for (const [id, entry] of Object.entries(acc)) {
    const section = entry.section;
    const thresholds = section.band_thresholds;
    const scale = section.scales.find((s) => s.id === id);
    const group = resolveNormGroup(section, options.normGroup);
    const norm = thresholds?.mode === 'norm-referenced' ? group?.scales?.[id] : null;

    const detail = { score: entry.score, min: entry.min, max: entry.max };
    if (scale?.level) detail.level = scale.level;

    if (norm) {
      const reliability = norm.reliability ?? scale?.reliability ?? 1;
      const sem = norm.sd * Math.sqrt(Math.max(0, 1 - reliability));
      detail.mean = norm.mean;
      detail.sd = norm.sd;
      detail.reliability = reliability;
      detail.sem = sem;
      detail.z = (entry.score - norm.mean) / norm.sd;
      detail.percentile = percentileOf(entry.score, norm.mean, norm.sd);
      detail.percentile_low = percentileOf(entry.score - sem, norm.mean, norm.sd);
      detail.percentile_high = percentileOf(entry.score + sem, norm.mean, norm.sd);
      detail.normalized = detail.percentile / 100;
    } else {
      const range = entry.max - entry.min;
      detail.normalized = range > 0 ? (entry.score - entry.min) / range : 0;
    }

    detail.band = assignBand(detail.normalized, thresholds);
    detail.copy_band = copyPole(detail.band, thresholds);
    scores[id] = entry.score;
    bands[id] = detail.band;
    details[id] = detail;
  }

  const likert = definition.sections.find((s) => s.type === 'scored-likert' && s.norms);
  const normGroup = likert ? resolveNormGroup(likert, options.normGroup)?.id : undefined;
  return { scores, bands, details, ...(normGroup ? { normGroup } : {}) };
}

/** Explicit `members`, else the legacy "children point at me via parent" shape. */
function compositeMembers(scale, section) {
  if (Array.isArray(scale.members) && scale.members.length) {
    return scale.members.map((m) => ({ scale: m.scale, sign: m.sign === -1 ? -1 : 1 }));
  }
  return section.scales
    .filter((child) => child.parent === scale.id && !Array.isArray(child.members))
    .map((child) => ({ scale: child.id, sign: 1 }));
}

function isKnownScale(id, sectionOf) {
  return Boolean(sectionOf[id]);
}
