import { assembleRecord, buildReadout } from '../engine/engine.js';
import { scoreInstrument } from '../engine/scoring.js';
import { drawCode, drawElement } from '../engine/sections/scored-matrix.js';
import { createMatrixForm, randomSeed } from '../engine/matrix-form.js';
import { estimate2pl } from '../engine/irt.js';
import { manualDownload } from '../engine/save-adapter.js';
import {
  archiveFilename,
  formatBytes,
  loadLibrary,
  saveLibrary,
  serializeArchive,
  upsertRecord,
} from '../engine/local-store.js';
import { mountMotion } from '../engine/motion.js';

const EMPTY_RESPONSE = '00000000000000000000';

export function mountMatrixAssessment(definition, opts = {}) {
  const doc = opts.doc || document;
  const win = doc.defaultView || window;
  const root = doc.querySelector(opts.root || '#app');
  if (!root) throw new Error('Matrix assessment root not found');

  const sourceSection = definition.sections.find((section) => section.type === 'scored-matrix');
  if (!sourceSection) throw new Error('Matrix assessment has no item bank');
  const library = loadLibrary();
  const seenIds = library.state.records
    .filter((record) => record.instrument_id === definition.id)
    .flatMap((record) => Object.keys(record.raw_responses || {}))
    .filter((id) => id.startsWith('omib-'));
  const form = createMatrixForm(sourceSection, {
    seed: randomSeed(win.crypto),
    excludeIds: seenIds,
  });
  const formDefinition = {
    ...definition,
    sections: definition.sections.map((section) =>
      section.type === 'scored-matrix' ? form.section : section),
  };
  const answers = {};
  const skipped = [];
  let current = -1;
  let timer = 0;
  let phase = 'welcome';
  let active = false;
  let accumulatedTime = 0;
  let resumedAt = 0;
  let interruptions = 0;
  let record = null;

  doc.body.classList.add('pi-matrix-exam-page');
  const sitebar = makeSitebar();
  doc.body.insertBefore(sitebar, doc.body.firstChild);
  renderWelcome();
  mountMotion(doc);

  win.addEventListener('beforeunload', (event) => {
    if (!active) return;
    event.preventDefault();
    event.returnValue = '';
  });
  win.addEventListener('pagehide', () => {
    if (record) persistRecord();
  });
  doc.addEventListener('visibilitychange', () => {
    if (!active) return;
    if (doc.hidden) {
      accumulatedTime += Date.now() - resumedAt;
      resumedAt = 0;
      interruptions++;
    } else {
      resumedAt = Date.now();
    }
  });

  function renderWelcome() {
    root.replaceChildren();
    const hero = el('section', { class: 'pi-exam-welcome pi-reveal' }, [
      el('div', { class: 'pi-exam-welcome__copy' }, [
        el('p', { class: 'pi-eyebrow', text: 'Calibrated reasoning lab' }),
        el('h1', { text: 'Read the pattern. Build the missing piece.' }),
        el('p', {
          class: 'pi-exam-welcome__lead',
          text: `${form.section.items.length} scored puzzles have been drawn from the complete ${form.bankSize}-item bank, preceded by two guided practice puzzles.`,
        }),
        el('div', { class: 'pi-exam-specs' }, [
          spec(String(form.section.items.length), 'balanced scored puzzles'),
          spec('Untimed', 'standard administration'),
          spec('220', 'calibrated item bank'),
          spec(form.reused ? String(form.reused) : '0', 'previously seen'),
        ]),
      ]),
      renderWelcomeArt(),
    ]);
    const briefing = el('section', { class: 'pi-exam-briefing pi-reveal' }, [
      el('div', {}, [
        el('p', { class: 'pi-kicker', text: 'Before the clock starts' }),
        el('h2', { text: 'One clean attempt' }),
      ]),
      el('ol', { class: 'pi-exam-rules' }, [
        rule('01', 'Work independently', 'No search, calculator, screenshots, or outside help.'),
        rule('02', 'Build the whole tile', 'Select every element that belongs in the missing square.'),
        rule('03', 'Keep moving', 'You cannot return after submitting or skipping a scored puzzle.'),
        rule('04', 'Read the result carefully', 'This measures figural reasoning—not full-scale IQ or fixed potential.'),
      ]),
      el('div', { class: 'pi-exam-start' }, [
        el('p', {
          text: 'Choose a quiet moment. Elapsed time pauses when this page is hidden and is recorded only as context.',
        }),
        button('Start guided practice', 'pi-btn pi-btn--primary pi-btn--large', startPractice),
      ]),
    ]);
    root.append(hero, briefing);
  }

  function startPractice() {
    phase = 'practice';
    active = false;
    current = 0;
    renderExamShell();
    showItem();
  }

  function startScored() {
    phase = 'scored';
    active = true;
    accumulatedTime = 0;
    resumedAt = Date.now();
    current = 0;
    renderExamShell();
    showItem();
  }

  function renderExamShell() {
    root.replaceChildren();
    const shell = el('section', { class: 'pi-exam-shell' });
    shell.innerHTML = `
      <header class="pi-exam-toolbar">
        <div>
          <span class="pi-exam-toolbar__label">FIGURAL REASONING</span>
          <strong id="exam-count">Practice 1 / ${form.practiceItems.length}</strong>
        </div>
        <div class="pi-exam-timer" role="timer" aria-label="Time remaining">
          <svg viewBox="0 0 44 44" aria-hidden="true">
            <circle class="pi-exam-timer__base" cx="22" cy="22" r="18"></circle>
            <circle id="exam-timer-ring" class="pi-exam-timer__ring" cx="22" cy="22" r="18"></circle>
          </svg>
          <span id="exam-time">PRACTICE</span>
        </div>
      </header>
      <div class="pi-exam-progress"><span id="exam-progress-fill"></span></div>
      <div id="exam-stage" class="pi-exam-stage" tabindex="-1"></div>
      <footer class="pi-exam-footer">
        <p id="exam-status" role="status" aria-live="polite">Select the elements that complete the matrix.</p>
        <div class="pi-exam-footer__actions">
          <button id="exam-skip" type="button" class="pi-btn pi-btn--quiet">Skip / not sure</button>
          <button id="exam-next" type="button" class="pi-btn pi-btn--primary" disabled>Check practice answer →</button>
        </div>
      </footer>`;
    root.appendChild(shell);
    doc.getElementById('exam-next').addEventListener('click', submitCurrent);
    doc.getElementById('exam-skip').addEventListener('click', () => {
      if (phase === 'practice') {
        doc.getElementById('exam-status').textContent = 'Try selecting at least one element during practice.';
        return;
      }
      const item = form.section.items[current];
      answers[item.id] = EMPTY_RESPONSE;
      skipped.push(item.id);
      advanceScored();
    });
  }

  function showItem() {
    clearInterval(timer);
    const items = phase === 'practice' ? form.practiceItems : form.section.items;
    const item = items[current];
    const stage = doc.getElementById('exam-stage');
    stage.replaceChildren();
    stage.className = 'pi-exam-stage';
    void stage.offsetWidth;
    stage.classList.add('is-entering');

    const matrix = el('div', {
      class: 'pi-exam-matrix',
      role: 'img',
      'aria-label': `Matrix puzzle ${current + 1}`,
    });
    item.item_code.split(',').slice(0, 8)
      .forEach((code) => matrix.appendChild(drawCode(doc, code, 'pi-exam-matrix__cell')));
    matrix.appendChild(el('div', { class: 'pi-exam-matrix__cell pi-exam-matrix__missing', text: '?' }));

    const selected = new Set();
    let preview = drawCode(doc, EMPTY_RESPONSE, 'pi-exam-answer-preview__svg');
    const palette = el('div', {
      class: 'pi-exam-palette',
      role: 'group',
      'aria-label': 'Construction elements',
    });
    for (const elementIndex of form.paletteOrder) {
      const choice = button('', 'pi-exam-element', () => {
        choice.classList.toggle('is-selected');
        if (selected.has(elementIndex)) selected.delete(elementIndex);
        else selected.add(elementIndex);
        choice.setAttribute('aria-pressed', selected.has(elementIndex) ? 'true' : 'false');
        const bits = bitsFrom(selected);
        const nextPreview = drawCode(doc, bits, 'pi-exam-answer-preview__svg');
        preview.replaceWith(nextPreview);
        preview = nextPreview;
        doc.getElementById('exam-next').disabled = selected.size === 0;
        doc.getElementById('exam-status').textContent = selected.size
          ? `${selected.size} element${selected.size === 1 ? '' : 's'} selected`
          : 'Select the elements that complete the matrix.';
      });
      choice.setAttribute('aria-label', `Toggle construction element ${elementIndex + 1}`);
      choice.setAttribute('aria-pressed', 'false');
      choice.appendChild(drawElement(doc, elementIndex, 'pi-exam-element__svg'));
      palette.appendChild(choice);
    }

    stage.append(
      el('div', { class: 'pi-exam-workbench' }, [
        el('div', { class: 'pi-exam-puzzle' }, [
          el('p', {
            class: 'pi-exam-overline',
            text: phase === 'practice'
              ? `Guided practice ${current + 1}`
              : `Pattern ${String(current + 1).padStart(2, '0')}`,
          }),
          matrix,
        ]),
        el('div', { class: 'pi-exam-construction' }, [
          el('div', { class: 'pi-exam-construction__heading' }, [
            el('div', {}, [
              el('p', { class: 'pi-exam-overline', text: 'Your construction' }),
              el('h2', { text: 'Build the missing tile' }),
            ]),
            el('div', { class: 'pi-exam-answer-preview' }, [preview]),
          ]),
          palette,
          el('p', {
            class: 'pi-hint',
            text: 'The construction elements stay in the validated fixed arrangement throughout.',
          }),
        ]),
      ]),
    );
    stage._selected = selected;
    doc.getElementById('exam-count').textContent = phase === 'practice'
      ? `Practice ${current + 1} / ${form.practiceItems.length}`
      : `Puzzle ${current + 1} / ${form.section.items.length}`;
    doc.getElementById('exam-progress-fill').style.width =
      phase === 'practice'
        ? `${((current + 1) / form.practiceItems.length) * 100}%`
        : `${(current / form.section.items.length) * 100}%`;
    doc.getElementById('exam-next').disabled = true;
    doc.getElementById('exam-next').textContent =
      phase === 'practice' ? 'Check practice answer →' : 'Lock answer →';
    doc.getElementById('exam-skip').hidden = phase === 'practice';
    updateElapsed();
    clearInterval(timer);
    timer = win.setInterval(updateElapsed, 500);
    stage.focus({ preventScroll: true });
  }

  function updateElapsed() {
    const time = doc.getElementById('exam-time');
    if (!time) return;
    time.textContent = phase === 'practice' ? 'PRACTICE' : formatClock(elapsedSeconds());
  }

  function submitCurrent() {
    const stage = doc.getElementById('exam-stage');
    if (phase === 'practice' && stage._practiceReviewed) {
      if (current >= form.practiceItems.length - 1) startScored();
      else {
        current++;
        showItem();
      }
      return;
    }
    const selected = stage._selected;
    if (!selected?.size) return;
    const item = (phase === 'practice' ? form.practiceItems : form.section.items)[current];
    const response = bitsFrom(selected);
    if (phase === 'practice') {
      showPracticeFeedback(item, response);
      return;
    }
    answers[item.id] = response;
    advanceScored();
  }

  function showPracticeFeedback(item, response) {
    const stage = doc.getElementById('exam-stage');
    stage._practiceReviewed = true;
    const correct = response === item.solution;
    stage.appendChild(el('aside', {
      class: `pi-exam-feedback ${correct ? 'is-correct' : 'is-learning'}`,
    }, [
      el('div', {}, [
        el('p', { class: 'pi-kicker', text: correct ? 'Correct construction' : 'Compare the construction' }),
        el('h3', {
          text: correct
            ? 'You selected the complete missing tile.'
            : 'The highlighted tile shows every element required.',
        }),
      ]),
      el('div', { class: 'pi-exam-feedback__answer' }, [
        drawCode(doc, item.solution, 'pi-exam-answer-preview__svg'),
      ]),
    ]));
    doc.getElementById('exam-status').textContent =
      'Practice is the only place where correctness feedback is shown.';
    const next = doc.getElementById('exam-next');
    next.disabled = false;
    next.textContent = current >= form.practiceItems.length - 1
      ? 'Begin scored form →'
      : 'Next practice puzzle →';
  }

  function advanceScored() {
    clearInterval(timer);
    if (current >= form.section.items.length - 1) {
      finish();
      return;
    }
    current++;
    showItem();
  }

  function finish() {
    active = false;
    clearInterval(timer);
    const timestamp = new Date().toISOString();
    if (resumedAt) {
      accumulatedTime += Date.now() - resumedAt;
      resumedAt = 0;
    }
    const workingSeconds = Math.round(accumulatedTime / 1000);
    const scored = scoreInstrument(formDefinition, answers);
    const irt = estimate2pl(form.section.items, answers);
    const readout = buildReadout(formDefinition, scored.bands);
    record = assembleRecord(formDefinition, {
      responses: answers,
      scores: { 'figural-reasoning': Number(irt.theta.toFixed(3)) },
      bands: scored.bands,
      readout,
      snapshot: '',
      timestamp,
    });
    record.administration = {
      mode: 'standard-untimed',
      form_seed: form.seed,
      bank_size: form.bankSize,
      form_length: form.section.items.length,
      elapsed_seconds: workingSeconds,
      interruptions,
      skipped_items: skipped.slice(),
      palette_order: form.paletteOrder.slice(),
      item_order: form.section.items.map((item) => item.id),
      item_parameters: Object.fromEntries(form.section.items.map((item) => [
        item.id,
        { difficulty: item.difficulty, discrimination: item.discrimination, rules: item.rules },
      ])),
      reused_items: form.reused,
      raw_correct: irt.correct,
      theta: Number(irt.theta.toFixed(3)),
      theta_standard_error: Number(irt.standardError.toFixed(3)),
      test_information: Number(irt.information.toFixed(3)),
    };
    persistRecord();
    renderResult(scored, irt, workingSeconds);
  }

  function renderResult(scored, irt, workingSeconds) {
    root.replaceChildren();
    const score = scored.scores['figural-reasoning'];
    const total = form.section.items.length;
    const ruleStats = form.section.items.map((item) => ({
      rules: item.rules,
      correct: answers[item.id] === item.solution,
    }));
    const panel = el('section', { class: 'pi-exam-result pi-reveal' }, [
      el('header', { class: 'pi-exam-result__hero' }, [
        el('div', {}, [
          el('p', { class: 'pi-eyebrow', text: 'Sitting complete' }),
          el('h1', { text: 'Your reasoning snapshot' }),
          el('p', {
            text: 'A calibrated, self-paced attempt—not an IQ number, diagnosis, or ceiling on what you can learn.',
          }),
        ]),
        el('div', {
          class: 'pi-exam-score',
          role: 'img',
          'aria-label': `${score} correct out of ${total}`,
        }, [
          el('strong', { text: String(score) }),
          el('span', { text: `/ ${total}` }),
          el('small', { text: 'exact constructions' }),
        ]),
      ]),
      el('div', { class: 'pi-exam-result__stats' }, [
        resultStat(formatClock(workingSeconds), 'active working time'),
        resultStat(String(skipped.length), 'skipped'),
        resultStat(String(total - form.reused), 'new-to-you items'),
        resultStat(`${form.bankSize}`, 'items in bank'),
      ]),
      el('section', { class: 'pi-exam-calibration' }, [
        el('div', {}, [
          el('p', { class: 'pi-kicker', text: 'Cross-form estimate' }),
          el('h2', { text: `${irt.theta >= 0 ? '+' : ''}${irt.theta.toFixed(2)} θ` }),
          el('p', {
            text: `Uncertainty ±${irt.standardError.toFixed(2)}. This uses the published OMIB item parameters so different random forms can be compared more honestly than raw totals.`,
          }),
        ]),
        el('p', {
          class: 'pi-hint',
          text: 'Theta is an item-bank scale—not IQ, a percentile, or a population norm. Smaller uncertainty means this form was more informative near this estimate.',
        }),
      ]),
      renderRuleProfile(ruleStats),
      renderInterpretation(readout[0]),
      renderResultReflection(),
      renderSaveActions(),
    ]);
    root.appendChild(panel);
    mountMotion(doc);
  }

  function renderRuleProfile(stats) {
    const section = el('section', { class: 'pi-exam-analysis' }, [
      el('div', {}, [
        el('p', { class: 'pi-kicker', text: 'Complexity profile' }),
        el('h2', { text: 'How the rule load changed the challenge' }),
        el('p', {
          text: 'More rules usually means more relationships to hold and test. This is descriptive of this sitting, not a percentile.',
        }),
      ]),
    ]);
    const chart = el('div', { class: 'pi-exam-rule-chart' });
    for (let rules = 1; rules <= 5; rules++) {
      const group = stats.filter((item) => item.rules === rules);
      const correct = group.filter((item) => item.correct).length;
      const percent = group.length ? Math.round((correct / group.length) * 100) : 0;
      chart.appendChild(el('div', { class: 'pi-exam-rule-row' }, [
        el('span', { text: `${rules} rule${rules === 1 ? '' : 's'}` }),
        el('div', { class: 'pi-exam-rule-track' }, [
          el('span', { style: `width:${percent}%` }),
        ]),
        el('strong', { text: `${correct}/${group.length}` }),
      ]));
    }
    section.appendChild(chart);
    return section;
  }

  function renderInterpretation(entry) {
    if (!entry) return el('div');
    return el('section', { class: 'pi-exam-interpretation' }, [
      el('p', { class: 'pi-kicker', text: humanize(entry.band) }),
      el('h2', { text: 'Read the conditions as well as the score.' }),
      el('div', { class: 'pi-exam-interpretation__grid' }, [
        interpretation('What this attempt showed', entry.light),
        interpretation('What it cannot establish', entry.shadow),
        interpretation('One useful experiment', entry.one_thing_to_try),
      ]),
    ]);
  }

  function renderResultReflection() {
    const textarea = el('textarea', {
      class: 'pi-textarea',
      rows: '5',
      placeholder: 'What strategy helped? Where did time pressure change your approach? What would you test differently next time?',
      'aria-label': 'Reflection on this reasoning sitting',
    });
    let saveDelay = 0;
    const status = el('p', { class: 'pi-hint', text: 'Saved with this sitting as you type.' });
    textarea.addEventListener('input', () => {
      record = { ...record, student_snapshot: textarea.value };
      library.state = upsertRecord(library.state, record);
      clearTimeout(saveDelay);
      saveDelay = win.setTimeout(() => {
        const saved = persistRecord();
        status.textContent = saved ? 'Reflection saved locally ✓' : 'Local save unavailable—download your result.';
      }, 250);
    });
    return el('section', { class: 'pi-exam-reflection' }, [
      el('p', { class: 'pi-kicker', text: 'Your interpretation' }),
      el('h2', { text: 'What happened while you were solving?' }),
      textarea,
      status,
    ]);
  }

  function renderSaveActions() {
    const status = el('p', {
      class: 'pi-local-status',
      text: library.available
        ? `Saved locally · ${library.state.records.length} sittings · ${formatBytes(library.bytes)}`
        : 'Local saving unavailable—download now.',
    });
    const backup = button('Download complete backup', 'pi-btn pi-btn--primary', () => {
      persistRecord();
      const exportedAt = new Date().toISOString();
      downloadText(serializeArchive(library.state, exportedAt), archiveFilename(exportedAt));
    });
    const individual = button('Download this result', 'pi-btn', () => manualDownload(record, { doc }));
    const retake = button('Draw a fresh form', 'pi-btn', () => {
      persistRecord();
      win.location.reload();
    });
    return el('section', { class: 'pi-exam-save' }, [
      el('div', {}, [
        el('p', { class: 'pi-kicker', text: 'Protect the history' }),
        el('h2', { text: 'Keep a copy beyond this browser.' }),
        el('p', {
          text: 'Download the complete backup and place it in OneDrive, Google Drive, iCloud Drive, SharePoint, or another trusted cloud folder.',
        }),
        status,
      ]),
      el('div', { class: 'pi-exam-save__actions' }, [
        backup,
        individual,
        el('a', { class: 'pi-btn', href: '../viewer/viewer.html', text: 'Open my portrait' }),
        retake,
        el('a', { class: 'pi-btn pi-btn--quiet', href: '../index.html', text: 'Return to inventory menu' }),
      ]),
    ]);
  }

  function makeSitebar() {
    return el('nav', { class: 'pi-sitebar pi-exam-sitebar', 'aria-label': 'Personal Inventory' }, [
      el('a', { class: 'pi-brand', href: '../index.html#assessments' }, [
        el('span', { class: 'pi-brand__mark', 'aria-hidden': 'true' }),
        el('span', { text: '← Assessments' }),
      ]),
      el('div', { class: 'pi-sitebar__actions' }, [
        el('a', { class: 'pi-portrait-nav', href: '../viewer/viewer.html', 'aria-label': 'Open my portrait' }, [
          el('span', { class: 'pi-portrait-avatar', 'aria-hidden': 'true' }, [el('span')]),
          el('span', { class: 'pi-portrait-nav__copy' }, [
            el('strong', { text: 'My portrait' }),
            el('small', { text: 'Saved results' }),
          ]),
        ]),
        el('span', { class: 'pi-exam-sitebar__mode', text: 'REASONING LAB / LOCAL' }),
      ]),
    ]);
  }

  function renderWelcomeArt() {
    const art = el('div', { class: 'pi-exam-welcome__art', 'aria-hidden': 'true' });
    for (const code of form.section.items[0].item_code.split(',').slice(0, 5)) {
      art.appendChild(drawCode(doc, code, 'pi-exam-welcome__tile'));
    }
    art.appendChild(el('div', { class: 'pi-exam-welcome__tile pi-exam-welcome__tile--missing', text: '?' }));
    return art;
  }

  function spec(value, label) {
    return el('div', {}, [el('strong', { text: value }), el('span', { text: label })]);
  }

  function rule(number, title, copy) {
    return el('li', {}, [
      el('span', { text: number }),
      el('div', {}, [el('strong', { text: title }), el('p', { text: copy })]),
    ]);
  }

  function resultStat(value, label) {
    return el('div', {}, [el('strong', { text: value }), el('span', { text: label })]);
  }

  function interpretation(title, copy) {
    return el('article', {}, [el('h3', { text: title }), el('p', { text: copy })]);
  }

  function bitsFrom(selected) {
    return Array.from({ length: 20 }, (_, index) => selected.has(index) ? '1' : '0').join('');
  }

  function persistRecord() {
    if (!record) return false;
    library.state = upsertRecord(library.state, record);
    const saved = saveLibrary(library.state);
    library.available = saved.saved;
    library.bytes = saved.bytes;
    return saved.saved;
  }

  function formatClock(totalSeconds) {
    const seconds = Math.max(0, Math.round(totalSeconds));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }

  function elapsedSeconds() {
    const live = active && resumedAt ? Date.now() - resumedAt : 0;
    return Math.round((accumulatedTime + live) / 1000);
  }

  function humanize(value) {
    return String(value).replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
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

  function button(text, className, onClick) {
    const node = el('button', { type: 'button', class: className, text });
    node.addEventListener('click', onClick);
    return node;
  }

  function el(tag, attrs = {}, children = []) {
    const node = doc.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key === 'style') node.setAttribute('style', value);
      else node.setAttribute(key, value);
    }
    for (const child of children) if (child) node.appendChild(child);
    return node;
  }
}
