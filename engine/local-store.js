/**
 * Versioned, browser-local library for completed sittings.
 * Pure state transforms are separated from the storage adapter so the data
 * model is testable in Node and resilient to unavailable/quota-limited storage.
 */

export const LIBRARY_KEY = 'personal-inventory.library.v1';
export const ARCHIVE_FORMAT = 'personal-inventory-archive';
export const LIBRARY_VERSION = 1;

const EMPTY_REFLECTION = Object.freeze({ pattern: '', shift: '', experiment: '' });

export function emptyState() {
  return { version: LIBRARY_VERSION, records: [], reflection: { ...EMPTY_REFLECTION } };
}

export function recordKey(record) {
  return [
    String(record?.instrument_id || ''),
    String(record?.instrument_version || ''),
    String(record?.timestamp || ''),
  ].join('|');
}

export function isRecord(value) {
  return Boolean(
    isPlainObject(value) &&
    /^[a-z0-9][a-z0-9-]*$/.test(value.instrument_id || '') &&
    /^\d+\.\d+\.\d+$/.test(value.instrument_version || '') &&
    typeof value.timestamp === 'string' && value.timestamp.length > 0 &&
    ['full', 'scores-only'].includes(value.variant) &&
    isNumberMap(value.scores) &&
    isStringMap(value.bands) &&
    Array.isArray(value.readout) && value.readout.every(isReadoutEntry) &&
    typeof value.student_snapshot === 'string' &&
    (value.variant === 'full' ? isPlainObject(value.raw_responses) : value.raw_responses == null),
  );
}

function isPlainObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isNumberMap(value) {
  return isPlainObject(value) &&
    Object.values(value).every((entry) => typeof entry === 'number' && Number.isFinite(entry));
}

function isStringMap(value) {
  return isPlainObject(value) && Object.values(value).every((entry) => typeof entry === 'string');
}

function isReadoutEntry(value) {
  return isPlainObject(value) &&
    ['scale', 'band', 'construct_explainer', 'light', 'shadow', 'one_thing_to_try']
      .every((key) => typeof value[key] === 'string');
}

export function normalizeState(value) {
  if (!value || typeof value !== 'object') return emptyState();
  const records = [];
  const seen = new Set();
  for (const record of Array.isArray(value.records) ? value.records : []) {
    if (!isRecord(record)) continue;
    const key = recordKey(record);
    if (seen.has(key)) continue;
    seen.add(key);
    records.push(record);
  }
  records.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  const sourceReflection = value.reflection && typeof value.reflection === 'object'
    ? value.reflection
    : {};
  const reflection = {};
  for (const key of Object.keys(EMPTY_REFLECTION)) {
    reflection[key] = typeof sourceReflection[key] === 'string' ? sourceReflection[key] : '';
  }
  return { version: LIBRARY_VERSION, records, reflection };
}

export function upsertRecord(state, record) {
  const base = normalizeState(state);
  if (!isRecord(record)) return base;
  const key = recordKey(record);
  const records = base.records.filter((item) => recordKey(item) !== key);
  records.push(record);
  records.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  return { ...base, records };
}

export function updateReflection(state, patch) {
  const base = normalizeState(state);
  const reflection = { ...base.reflection };
  for (const key of Object.keys(EMPTY_REFLECTION)) {
    if (patch && typeof patch[key] === 'string') reflection[key] = patch[key];
  }
  return { ...base, reflection };
}

export function importData(state, data) {
  let base = normalizeState(state);
  let incoming = [];
  let reflection = null;
  if (isRecord(data)) incoming = [data];
  else if (Array.isArray(data)) incoming = data.filter(isRecord);
  else if (data && typeof data === 'object' && data.format === ARCHIVE_FORMAT) {
    incoming = Array.isArray(data.records) ? data.records.filter(isRecord) : [];
    reflection = data.portrait_reflection;
  } else if (data && typeof data === 'object' && Array.isArray(data.records)) {
    incoming = data.records.filter(isRecord);
    reflection = data.reflection;
  }

  const before = new Set(base.records.map(recordKey));
  for (const record of incoming) base = upsertRecord(base, record);
  if (reflection) base = updateReflection(base, reflection);
  const added = base.records.filter((record) => !before.has(recordKey(record))).length;
  return { state: base, added, recognized: incoming.length };
}

export function serializeArchive(state, exportedAt = new Date().toISOString()) {
  const normalized = normalizeState(state);
  return JSON.stringify({
    format: ARCHIVE_FORMAT,
    version: LIBRARY_VERSION,
    exported_at: exportedAt,
    records: normalized.records,
    portrait_reflection: normalized.reflection,
  }, null, 2);
}

export function archiveFilename(exportedAt = new Date().toISOString()) {
  return `personal-inventory_backup_${String(exportedAt).slice(0, 10)}.json`;
}

export function loadLibrary(storage = resolveStorage()) {
  if (!storage) return { state: emptyState(), available: false, bytes: 0, error: null };
  try {
    const raw = storage.getItem(LIBRARY_KEY);
    return {
      state: raw ? normalizeState(JSON.parse(raw)) : emptyState(),
      available: true,
      bytes: raw ? raw.length : 0,
      error: null,
    };
  } catch (error) {
    return { state: emptyState(), available: false, bytes: 0, error };
  }
}

export function saveLibrary(state, storage = resolveStorage()) {
  if (!storage) return { saved: false, bytes: 0, error: new Error('Local storage is unavailable') };
  try {
    const raw = JSON.stringify(normalizeState(state));
    storage.setItem(LIBRARY_KEY, raw);
    return { saved: true, bytes: raw.length, error: null };
  } catch (error) {
    return { saved: false, bytes: 0, error };
  }
}

export function clearLibrary(storage = resolveStorage()) {
  if (!storage) return false;
  try {
    storage.removeItem(LIBRARY_KEY);
    return true;
  } catch {
    return false;
  }
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024) return '<1 KB';
  return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`;
}

function resolveStorage() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}
