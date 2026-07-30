/**
 * viewer.js — PURE aggregation of a folder of vault records into a portrait.
 * No DOM, no I/O (importable in Node + browser). The browser shell (viewer.html)
 * loads the record files locally (file input — no network) and renders this.
 *
 * Handles 0..N records, mixed instruments, and multiple sittings of the same
 * instrument (longitudinal — the bookend re-measure). Scored instruments show a
 * per-scale trajectory; aspirational instruments surface as COMMITMENTS, not
 * scores. Every student_snapshot is surfaced verbatim. No machine prose about
 * the person is generated here.
 */

/** Stable chronological compare on ISO timestamps. */
function byTime(a, b) {
  return String(a.timestamp).localeCompare(String(b.timestamp));
}

/**
 * aggregateRecords(records) -> portrait
 *   instruments: [{ instrument_id, scored, sittings, first, latest,
 *                   longitudinal: { scaleId: [{timestamp, score, band}] } }]
 *   snapshots:   [{ instrument_id, timestamp, text }]   (student-authored, chronological)
 *   commitments: [{ instrument_id, timestamp, section, choices }]  (aspirational selections)
 *   total: number
 */
export function aggregateRecords(records) {
  const list = Array.isArray(records) ? records.slice() : [];
  const byId = new Map();
  for (const r of list) {
    if (!byId.has(r.instrument_id)) byId.set(r.instrument_id, []);
    byId.get(r.instrument_id).push(r);
  }

  const instruments = [];
  const snapshots = [];
  const commitments = [];

  for (const [id, recsRaw] of byId) {
    const recs = recsRaw.slice().sort(byTime);
    const scored = recs.some((r) => r.scores && Object.keys(r.scores).length > 0);

    const longitudinal = {};
    for (const r of recs) {
      for (const [scale, score] of Object.entries(r.scores || {})) {
        (longitudinal[scale] = longitudinal[scale] || []).push({
          timestamp: r.timestamp,
          score,
          band: (r.bands || {})[scale],
        });
      }
      if (typeof r.student_snapshot === 'string' && r.student_snapshot.trim() !== '') {
        snapshots.push({ instrument_id: id, timestamp: r.timestamp, text: r.student_snapshot });
      }
      // Aspirational commitments: array-valued raw_responses (select-and-commit).
      for (const [section, value] of Object.entries(r.raw_responses || {})) {
        if (Array.isArray(value) && value.length) {
          commitments.push({ instrument_id: id, timestamp: r.timestamp, section, choices: value.slice() });
        }
      }
    }

    instruments.push({
      instrument_id: id,
      scored,
      sittings: recs.length,
      first: recs[0],
      latest: recs[recs.length - 1],
      longitudinal,
    });
  }

  instruments.sort((a, b) => a.instrument_id.localeCompare(b.instrument_id));
  snapshots.sort(byTime);
  commitments.sort(byTime);

  return { instruments, snapshots, commitments, total: list.length };
}

/**
 * For a scored scale's longitudinal series, the change between first and last
 * sitting (the "bookend" number). Returns null if fewer than 2 sittings.
 */
export function scaleChange(series) {
  if (!Array.isArray(series) || series.length < 2) return null;
  const first = series[0];
  const last = series[series.length - 1];
  return {
    from: { timestamp: first.timestamp, score: first.score, band: first.band },
    to: { timestamp: last.timestamp, score: last.score, band: last.band },
    delta: last.score - first.score,
  };
}
