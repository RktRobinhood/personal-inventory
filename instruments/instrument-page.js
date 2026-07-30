/**
 * Shared browser flow for every instrument page.
 * All work stays on the device: no network calls. Unfinished answers are
 * ephemeral; completed sittings accumulate in the browser-local library.
 */
import { createEngine } from '../engine/engine.js';
import { manualDownload, copyForOneNote } from '../engine/save-adapter.js';
import { archiveFilename, formatBytes, loadLibrary, saveLibrary, serializeArchive, upsertRecord } from '../engine/local-store.js';
import { mountMotion } from '../engine/motion.js';

export function mountInstrument(definition, opts = {}) {
  const doc = document;
  const ctx = { doc };
  const root = doc.querySelector(opts.root || '#app');
  if (!root) throw new Error(`mountInstrument: root "${opts.root || '#app'}" not found`);

  const engine = createEngine(definition, ctx, { scoresOnly: opts.scoresOnly === true });
  const pageControllers = [];
  let currentTimestamp = '';
  let completed = false;
  let dirty = false;
  let library = loadLibrary();

  const sitebar = el('nav', { class: 'pi-sitebar', 'aria-label': 'Personal Inventory' });
  const brand = el('a', { class: 'pi-brand', href: '../index.html' });
  brand.append(el('span', { class: 'pi-brand__mark', 'aria-hidden': 'true' }), el('span', { text: 'Personal Inventory' }));
  const privacy = el('span', { class: 'pi-privacy' });
  privacy.appendChild(el('span', { text: 'Offline & private' }));
  sitebar.append(brand, privacy);
  doc.body.insertBefore(sitebar, doc.body.firstChild);

  const formWrap = doc.createElement('div');
  formWrap.appendChild(engine.el);
  root.appendChild(formWrap);
  engine.el.addEventListener('change', () => { dirty = true; });

  addProgress();
  paginateLongBatteries();

  // Snapshot prompts belong after the result, where students have something
  // concrete to react to.
  const reflectionViews = engine.views.filter(
    ({ section }) => section.type === 'free-reflection' && section.is_snapshot,
  );
  const reflectionWrap = el('div');
  reflectionWrap.hidden = true;
  for (const { view } of reflectionViews) reflectionWrap.appendChild(view.el);

  const readoutBtn = el('button', {
    type: 'button',
    class: 'pi-btn pi-btn--primary',
    text: 'Reveal my read-out →',
  });
  const formStatus = el('p', { class: 'pi-hint', role: 'status', 'aria-live': 'polite' });
  const readoutEl = el('div', { 'aria-live': 'polite' });
  root.append(readoutBtn, formStatus, readoutEl, reflectionWrap);

  const saveZone = el('div', { class: 'pi-save-panel' });
  saveZone.hidden = true;
  const localStatus = el('div', { class: 'pi-local-status', role: 'status', 'aria-live': 'polite' });
  saveZone.appendChild(el('p', {
    class: 'pi-hint',
    text: 'This sitting is now in this browser’s local library. Browser data can be cleared or lost with the device, so download a backup and place it in OneDrive, Google Drive, iCloud Drive, SharePoint, or another cloud folder you trust.',
  }));
  saveZone.appendChild(localStatus);
  const saveControls = el('div', { class: 'pi-save' });
  const saveStatus = el('p', { class: 'pi-save__status', role: 'status', 'aria-live': 'polite' });
  const saveBtn = el('button', { type: 'button', class: 'pi-save__btn', text: 'Download this result' });
  const backupBtn = el('button', { type: 'button', class: 'pi-save__btn pi-save__btn--primary', text: 'Download complete backup' });
  const copyBtn = el('button', { type: 'button', class: 'pi-save__btn', text: 'Copy reflection for OneNote' });
  saveControls.append(backupBtn, saveBtn, copyBtn, saveStatus);
  saveZone.appendChild(saveControls);
  const resultActions = el('nav', { class: 'pi-result-actions', 'aria-label': 'What next' });
  const portraitLink = el('a', { class: 'pi-btn pi-btn--primary', href: '../viewer/viewer.html', text: 'Explore my full portrait →' });
  const homeLink = el('a', { class: 'pi-btn', href: '../index.html', text: 'Return to inventory menu' });
  const restartBtn = el('button', { class: 'pi-btn', type: 'button', text: 'Start a new sitting' });
  resultActions.append(portraitLink, homeLink, restartBtn);
  saveZone.appendChild(resultActions);
  root.appendChild(saveZone);

  readoutBtn.addEventListener('click', () => {
    const { responses, missing } = engine.collect();
    if (missing.length) {
      formStatus.textContent = `Almost there — ${missing.length} required response${missing.length === 1 ? '' : 's'} still need attention.`;
      const firstMissing = engine.el.querySelector('.pi-item:not(.is-answered)');
      const controller = pageControllers.find(({ items }) => items.includes(firstMissing));
      if (controller) controller.showPage(controller.pageOf(firstMissing), false);
      firstMissing?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    formStatus.textContent = '';
    currentTimestamp = new Date().toISOString();
    const { bands } = engine.score(responses);
    readoutEl.replaceChildren(engine.renderReadout(engine.buildReadout(bands)));
    reflectionWrap.hidden = false;
    saveZone.hidden = false;
    readoutBtn.hidden = true;
    completed = true;
    dirty = false;
    persistCurrent();
    mountMotion(doc);
    readoutEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  const buildFresh = () => engine.buildRecord({
    timestamp: currentTimestamp || new Date().toISOString(),
  });

  reflectionWrap.addEventListener('input', () => {
    if (!completed) return;
    clearTimeout(reflectionWrap._saveTimer);
    reflectionWrap._saveTimer = setTimeout(persistCurrent, 250);
  });

  saveBtn.addEventListener('click', () => {
    try {
      const { filename } = manualDownload(buildFresh(), ctx);
      persistCurrent();
      saveStatus.textContent = `Downloaded “${filename}”. Keep it in a cloud folder if you want an individual copy.`;
    } catch (err) {
      saveStatus.textContent = `Could not save: ${err.message}`;
    }
  });

  backupBtn.addEventListener('click', () => {
    persistCurrent();
    const exportedAt = new Date().toISOString();
    downloadText(serializeArchive(library.state, exportedAt), archiveFilename(exportedAt));
    saveStatus.textContent = 'Complete backup downloaded. Move it to a cloud folder so a cleared browser or lost device cannot erase your history.';
  });

  copyBtn.addEventListener('click', async () => {
    try {
      const ok = await copyForOneNote(buildFresh(), ctx);
      saveStatus.textContent = ok ? 'Copied — paste it into OneNote.' : 'Clipboard unavailable — use “Save my result”.';
    } catch (err) {
      saveStatus.textContent = `Could not copy: ${err.message}`;
    }
  });

  restartBtn.addEventListener('click', () => {
    if (confirm('Start a fresh sitting? Your completed result is safe in the local library, but the answers currently on this page will be reset.')) {
      location.reload();
    }
  });

  addKeyboardShortcuts();
  mountMotion(doc);

  addEventListener('beforeunload', (event) => {
    if (completed) persistCurrent();
    if (!dirty || completed) return;
    event.preventDefault();
    event.returnValue = '';
  });
  addEventListener('pagehide', () => {
    if (completed) persistCurrent();
  });

  return engine;

  function addProgress() {
    const questionGroups = Array.from(engine.el.querySelectorAll('.pi-item'));
    if (!questionGroups.length) return;

    const progress = el('aside', { class: 'pi-progress', 'aria-label': 'Assessment progress' });
    const progressCopy = el('div', { class: 'pi-progress__copy' });
    const progressCount = el('span', { text: `0 of ${questionGroups.length}` });
    const track = el('div', { class: 'pi-progress__track' });
    const fill = el('div', { class: 'pi-progress__fill' });
    const progressStage = el('span', { class: 'pi-progress__stage', text: 'Your progress' });
    progressCopy.append(progressStage, progressCount);
    track.appendChild(fill);
    progress.append(progressCopy, track, el('p', {
      class: 'pi-progress__shortcut',
      text: 'Keyboard: press 1–5 to answer the next visible question',
    }));
    engine.el.insertBefore(progress, engine.el.querySelector('.pi-section'));

    const update = () => {
      let answered = 0;
      for (const fieldset of questionGroups) {
        const complete = Boolean(fieldset.querySelector('input:checked'));
        fieldset.classList.toggle('is-answered', complete);
        if (complete) answered++;
      }
      fill.style.width = `${Math.round((answered / questionGroups.length) * 100)}%`;
      progressCount.textContent = answered === questionGroups.length
        ? 'Complete — ready for your read-out'
        : `${answered} of ${questionGroups.length}`;
    };
    engine.el.addEventListener('change', update);
    update();
  }

  function paginateLongBatteries() {
    for (const battery of engine.el.querySelectorAll('.pi-scored-likert, .pi-scored-matrix')) {
      const items = Array.from(battery.querySelectorAll(':scope > .pi-item'));
      if (items.length <= 12) continue;

      const pageSize = battery.classList.contains('pi-scored-matrix') ? 2 : 10;
      const pages = [];
      for (let i = 0; i < items.length; i += pageSize) pages.push(items.slice(i, i + pageSize));
      let page = 0;
      const pager = el('div', { class: 'pi-pager' });
      const back = el('button', { type: 'button', class: 'pi-btn', text: '← Back' });
      const status = el('p', { class: 'pi-pager__status' });
      const next = el('button', { type: 'button', class: 'pi-btn pi-btn--primary', text: 'Continue →' });
      const error = el('p', { class: 'pi-pager__error', role: 'status', 'aria-live': 'polite' });
      pager.append(back, status, next);
      battery.append(error, pager);

      const showPage = (index, shouldScroll = false) => {
        page = Math.max(0, Math.min(index, pages.length - 1));
        pages.forEach((group, groupIndex) => {
          for (const item of group) item.hidden = groupIndex !== page;
        });
        back.disabled = page === 0;
        next.textContent = page === pages.length - 1 ? 'Questions complete ✓' : 'Continue →';
        next.disabled = page === pages.length - 1;
        status.textContent = `Part ${page + 1} of ${pages.length} · questions ${page * pageSize + 1}–${Math.min((page + 1) * pageSize, items.length)}`;
        const topStage = engine.el.querySelector('.pi-progress__stage');
        if (topStage) topStage.textContent = `Part ${page + 1} of ${pages.length}`;
        error.textContent = '';
        if (shouldScroll) battery.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
      pageControllers.push({
        items,
        showPage,
        pageOf: (item) => pages.findIndex((group) => group.includes(item)),
      });

      back.addEventListener('click', () => showPage(page - 1, true));
      next.addEventListener('click', () => {
        const incomplete = pages[page].find((item) => !item.querySelector('input:checked'));
        if (incomplete) {
          error.textContent = 'Answer the remaining questions in this part to continue.';
          incomplete.scrollIntoView({ behavior: 'smooth', block: 'center' });
          incomplete.querySelector('input')?.focus({ preventScroll: true });
          return;
        }
        showPage(page + 1, true);
      });
      showPage(0);
    }
  }

  function persistCurrent() {
    if (!completed) return;
    const record = buildFresh();
    library.state = upsertRecord(library.state, record);
    const result = saveLibrary(library.state);
    library = { ...library, ...result, available: result.saved };
    updateLocalStatus();
  }

  function updateLocalStatus() {
    if (!library.available) {
      localStatus.textContent = '⚠ Local saving is unavailable in this browser. Download your result now.';
      localStatus.className = 'pi-local-status pi-local-status--warning';
      return;
    }
    const count = library.state.records.length;
    localStatus.textContent = `✓ Saved locally · ${count} completed sitting${count === 1 ? '' : 's'} · ${formatBytes(library.bytes)}`;
    localStatus.className = 'pi-local-status';
  }

  function downloadText(text, filename) {
    const blob = new Blob([text], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = el('a', { href, download: filename });
    link.hidden = true;
    doc.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
  }

  function addKeyboardShortcuts() {
    doc.addEventListener('keydown', (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(event.target?.tagName)) return;
      const option = Number(event.key);
      if (!Number.isInteger(option) || option < 1 || option > 9) return;
      const visible = Array.from(engine.el.querySelectorAll('.pi-item:not([hidden])'));
      const target = visible.find((item) => !item.querySelector('input:checked')) || visible[0];
      const inputs = target ? Array.from(target.querySelectorAll('input:not(:disabled)')) : [];
      if (!inputs[option - 1]) return;
      inputs[option - 1].click();
      event.preventDefault();
    });
  }

  function el(tag, attrs = {}) {
    const node = doc.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else node.setAttribute(k, v);
    }
    return node;
  }
}
