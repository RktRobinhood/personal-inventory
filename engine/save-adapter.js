/**
 * save-adapter.js — the save seam (DESIGN.md "save adapter").
 *
 * Two paths behind one interface:
 *   - MANUAL (real, fully built + tested): serialize the record, download it as
 *     a file for the student to upload into their SharePoint folder, plus a
 *     "copy to clipboard for OneNote" convenience. Low-error UX: one unmissable
 *     button + confirmation.
 *   - GRAPH (stub only): the production Microsoft Graph auto-save. Deliberately
 *     throws — it needs app registration / client IDs / admin consent and can
 *     only be wired and live-tested with a real tenant in the setup session.
 *
 * NO network calls anywhere here (Operating Rule 5). The clipboard API is not a
 * network call. The Graph path THROWS; it does not reach out.
 *
 * Importable in Node: no DOM / navigator / URL access at module load. The
 * browser globals are resolved (or injected via ctx) only inside functions.
 */
import { h, getDoc } from './dom.js';

export const SAVE_METHODS = { MANUAL: 'manual', GRAPH: 'graph' };

/** PURE. Canonical filename, e.g. "bigfive_2026-08-20.json". */
export function filenameFor(record) {
  const date = String(record && record.timestamp || '').slice(0, 10) || 'undated';
  const id = String(record && record.instrument_id || 'record').replace(/[^a-z0-9-]/gi, '-');
  return `${id}_${date}.json`;
}

/** PURE. Pretty-printed JSON for the record file (and the clipboard copy). */
export function serializeRecord(record) {
  return JSON.stringify(record, null, 2);
}

/**
 * MANUAL save: trigger a file download of the record. Returns { filename, bytes }.
 * Browser globals can be injected via ctx (ctx.doc, ctx.URL, ctx.Blob) for tests.
 */
export function manualDownload(record, ctx = {}) {
  const doc = getDoc(ctx);
  const URLObj = ctx.URL || (typeof URL !== 'undefined' ? URL : null);
  const BlobObj = ctx.Blob || (typeof Blob !== 'undefined' ? Blob : null);
  if (!URLObj || !BlobObj) throw new Error('manualDownload needs URL + Blob (inject via ctx outside a browser)');

  const filename = filenameFor(record);
  const json = serializeRecord(record);
  const blob = new BlobObj([json], { type: 'application/json' });
  const href = URLObj.createObjectURL(blob);
  const a = doc.createElement('a');
  a.href = href;
  a.download = filename;
  a.style && (a.style.display = 'none');
  (doc.body || doc.documentElement || doc).appendChild(a);
  a.click();
  if (typeof a.remove === 'function') a.remove();
  URLObj.revokeObjectURL(href);
  return { filename, bytes: json.length };
}

/**
 * "Copy to clipboard for OneNote." Returns a Promise<boolean> (true if copied).
 * navigator can be injected via ctx.navigator for tests.
 */
export async function copyForOneNote(record, ctx = {}) {
  const nav = ctx.navigator || (typeof navigator !== 'undefined' ? navigator : null);
  const text = serializeRecord(record);
  if (nav && nav.clipboard && typeof nav.clipboard.writeText === 'function') {
    await nav.clipboard.writeText(text);
    return true;
  }
  return false; // no clipboard available; the UI should fall back to the download
}

/**
 * GRAPH save: production Microsoft Graph auto-save to the student's OneDrive.
 * STUB — intentionally unbuilt. Wiring + live test happen in the setup session
 * (needs app registration, client IDs, redirect URIs, admin consent).
 */
export function graphSave(/* record, ctx */) {
  throw new Error('Graph auto-save is not implemented — wire in setup session (app registration + admin consent needed).');
}

/** Dispatch by method. MANUAL works now; GRAPH throws the stub error. */
export function save(method, record, ctx = {}) {
  switch (method) {
    case SAVE_METHODS.MANUAL: return manualDownload(record, ctx);
    case SAVE_METHODS.GRAPH: return graphSave(record, ctx);
    default: throw new Error(`unknown save method "${method}"`);
  }
}

/**
 * renderSaveControls(record, ctx, { onSaved }) -> DOM element.
 * One unmissable "Save my result" (download) button + "Copy for OneNote" + a
 * polite-live confirmation region. DOM only — built inside the call.
 */
export function renderSaveControls(record, ctx = {}, opts = {}) {
  const doc = getDoc(ctx);
  const status = h(doc, 'p', { class: 'pi-save__status', role: 'status', 'aria-live': 'polite' });

  const saveBtn = h(doc, 'button', {
    type: 'button', class: 'pi-save__btn pi-save__btn--primary',
    onClick: () => {
      const { filename } = manualDownload(record, ctx);
      status.textContent = `Saved “${filename}”. Upload it into your folder to keep it.`;
      if (typeof opts.onSaved === 'function') opts.onSaved(filename);
    },
  }, 'Save my result');

  const copyBtn = h(doc, 'button', {
    type: 'button', class: 'pi-save__btn',
    onClick: async () => {
      const ok = await copyForOneNote(record, ctx);
      status.textContent = ok ? 'Copied to your clipboard — paste it into OneNote.' : 'Clipboard unavailable — use “Save my result” instead.';
    },
  }, 'Copy for OneNote');

  return h(doc, 'section', { class: 'pi-save', 'aria-label': 'Save your result' }, [saveBtn, copyBtn, status]);
}
