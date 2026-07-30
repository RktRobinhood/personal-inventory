/**
 * scoring.js — PURE scoring logic. Importable in both Node (tests) and the
 * browser (the app), so the fixtures test the exact code the app runs.
 * No DOM, no I/O, no side effects.
 *
 * Model (DESIGN.md / BUILD.md):
 *  - A response is the 0-based index into an item's anchors (0 = lowest anchor,
 *    points-1 = highest). Reverse-keyed items are flipped before summing.
 *  - A scale's raw score is the sum of its items' (reverse-keyed) values.
 *  - Facets roll up into a domain: the domain score/range is the sum of its
 *    child facets' scores/ranges (a domain is a scale named as some facet's
 *    `parent`, with no items of its own).
 *  - Bands are CRITERION-REFERENCED, not norm-referenced: the score is
 *    normalized into [0,1] over the scale's OWN min..max range, then mapped to a
 *    band via the section's fractional `band_thresholds.cuts`. A value exactly
 *    on a cut goes to the HIGHER band (>= boundary).
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

/**
 * Score an instrument definition against a response map.
 * Returns { scores, bands, details } keyed by scale id.
 *   scores[id]  -> summed raw score (facets and domains)
 *   bands[id]   -> assigned band id
 *   details[id] -> { score, min, max, normalized, band }
 * Throws on a missing or out-of-range response (a definition/fixture bug).
 */
export function scoreInstrument(definition, responses) {
  const leaves = {}; // scaleId -> { score, min, max, thresholds }  (scales with items)

  for (const section of definition.sections) {
    if (section.type === 'scored-matrix') {
      const thresholds = section.band_thresholds;
      for (const item of section.items) {
        if (!Object.prototype.hasOwnProperty.call(responses, item.id)) {
          throw new Error(`missing response for item "${item.id}"`);
        }
        const raw = responses[item.id];
        if (typeof raw !== 'string' || !/^[01]{20}$/.test(raw)) {
          throw new Error(`response "${item.id}" is not a 20-element construction`);
        }
        const leaf = leaves[item.scale] || (leaves[item.scale] = { score: 0, min: 0, max: 0, thresholds });
        leaf.score += raw === item.solution ? 1 : 0;
        leaf.max += 1;
      }
      continue;
    }
    if (section.type !== 'scored-likert') continue;
    const thresholds = section.band_thresholds;
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
      const leaf = leaves[item.scale] || (leaves[item.scale] = { score: 0, min: 0, max: 0, thresholds });
      leaf.score += value;
      leaf.max += item.points - 1; // min contribution is always 0
    });
  }

  // Domain rollups: a facet declares `parent`; the domain sums its facets.
  const domains = {}; // domainId -> { score, min, max, thresholds }
  for (const section of definition.sections) {
    if (!['scored-likert', 'scored-matrix'].includes(section.type)) continue;
    for (const scale of section.scales) {
      if (!scale.parent) continue;
      const leaf = leaves[scale.id];
      if (!leaf) continue; // a facet with no answered items
      const dom = domains[scale.parent] ||
        (domains[scale.parent] = { score: 0, min: 0, max: 0, thresholds: section.band_thresholds });
      dom.score += leaf.score;
      dom.min += leaf.min;
      dom.max += leaf.max;
    }
  }

  const scores = {};
  const bands = {};
  const details = {};
  const emit = (id, acc) => {
    const range = acc.max - acc.min;
    const normalized = range > 0 ? (acc.score - acc.min) / range : 0;
    const band = assignBand(normalized, acc.thresholds);
    scores[id] = acc.score;
    bands[id] = band;
    details[id] = { score: acc.score, min: acc.min, max: acc.max, normalized, band };
  };
  for (const [id, acc] of Object.entries(leaves)) emit(id, acc);
  for (const [id, acc] of Object.entries(domains)) emit(id, acc);

  return { scores, bands, details };
}
