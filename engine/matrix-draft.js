const RESPONSE_RE = /^[01]{20}$/;

export function normalizeMatrixDraft(value, definition, section) {
  if (!value || typeof value !== 'object') return null;
  if (value.instrument_id !== definition.id ||
      value.instrument_version !== definition.version ||
      typeof value.seed !== 'string') return null;

  const expectedLength = Math.min(section.form?.length || 28, section.items.length);
  const eligible = new Map(section.items
    .filter((item) => item.calibrated !== false && !(section.form?.practice_ids || []).includes(item.id))
    .map((item) => [item.id, item]));
  if (!Array.isArray(value.item_order) ||
      value.item_order.length !== expectedLength ||
      new Set(value.item_order).size !== expectedLength ||
      value.item_order.some((id) => !eligible.has(id))) return null;

  const answers = {};
  for (const [id, response] of Object.entries(value.answers || {})) {
    if (!eligible.has(id) || !RESPONSE_RE.test(response)) return null;
    answers[id] = response;
  }
  const current = Number(value.current);
  if (!Number.isInteger(current) || current < 0 || current >= expectedLength) return null;

  return {
    instrument_id: value.instrument_id,
    instrument_version: value.instrument_version,
    seed: value.seed,
    item_order: value.item_order.slice(),
    answers,
    skipped: Array.isArray(value.skipped)
      ? value.skipped.filter((id) => eligible.has(id) && answers[id] === '00000000000000000000')
      : [],
    current,
    elapsed_ms: Math.max(0, Number(value.elapsed_ms) || 0),
    interruptions: Math.max(0, Math.floor(Number(value.interruptions) || 0)),
    reused: Math.max(0, Math.floor(Number(value.reused) || 0)),
    saved_at: typeof value.saved_at === 'string' ? value.saved_at : '',
  };
}

export function createMatrixDraft({
  definition,
  form,
  answers,
  skipped,
  current,
  elapsedMs,
  interruptions,
}) {
  return {
    instrument_id: definition.id,
    instrument_version: definition.version,
    seed: form.seed,
    item_order: form.section.items.map((item) => item.id),
    answers: { ...answers },
    skipped: skipped.slice(),
    current,
    elapsed_ms: Math.max(0, Math.round(elapsedMs)),
    interruptions,
    reused: form.reused,
    saved_at: new Date().toISOString(),
  };
}
