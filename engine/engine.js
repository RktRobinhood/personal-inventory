/**
 * engine.js — orchestrates a sitting.
 *
 * Read-out & reflection model (DESIGN.md, resolved "C"):
 *   1. The engine TEACHES, never pronounces: per scale it shows the band, a
 *      neutral construct_explainer, and the light / shadow / one-thing-to-try
 *      copy — all in the definition's tendency language.
 *   2. The STUDENT authors the meaning: a free-reflection section captures their
 *      own synthesis, which becomes the record's student_snapshot. No
 *      machine-generated prose about the person is ever produced or stored.
 *
 * The two pieces of real logic — buildReadout() and assembleRecord() — are PURE
 * and Node-testable. createEngine() is the browser glue (DOM only inside calls).
 */
import { h, getDoc } from './dom.js';
import { scoreInstrument } from './scoring.js';
import { render as info } from './sections/info.js';
import { render as scoredLikert } from './sections/scored-likert.js';
import { render as scoredMatrix } from './sections/scored-matrix.js';
import { render as selfRating } from './sections/self-rating.js';
import { render as selectAndCommit } from './sections/select-and-commit.js';
import { render as freeReflection } from './sections/free-reflection.js';

export const RENDERERS = {
  'info': info,
  'scored-likert': scoredLikert,
  'scored-matrix': scoredMatrix,
  'self-rating': selfRating,
  'select-and-commit': selectAndCommit,
  'free-reflection': freeReflection,
};

/** Index every scale across all scored-likert sections, in declaration order. */
function scaleIndex(definition) {
  const byId = {};
  const order = [];
  for (const section of definition.sections) {
    if (!['scored-likert', 'scored-matrix'].includes(section.type)) continue;
    for (const scale of section.scales) {
      byId[scale.id] = scale;
      order.push(scale.id);
    }
  }
  return { byId, order };
}

/**
 * PURE. Assemble the taught read-out from a definition + assigned bands.
 * Returns an array of entries matching the vault-record `readout` shape, in
 * definition scale-declaration order.
 */
export function buildReadout(definition, bands) {
  const { byId, order } = scaleIndex(definition);
  const readout = [];
  for (const scaleId of order) {
    const bandId = bands[scaleId];
    if (bandId == null) continue;
    const scale = byId[scaleId];
    const copy = scale.bands[bandId];
    readout.push({
      scale: scaleId,
      scale_name: scale.name,
      band: bandId,
      construct_explainer: scale.construct_explainer,
      light: copy.light,
      shadow: copy.shadow,
      one_thing_to_try: copy.one_thing_to_try,
    });
  }
  return readout;
}

/**
 * PURE. Build a vault record. `timestamp` is passed in by the client (DESIGN.md:
 * never generated server-side). `variant` 'full' includes raw_responses;
 * 'scores-only' omits them.
 */
export function assembleRecord(definition, { responses, scores, bands, readout, snapshot, timestamp, variant = 'full' }) {
  const record = {
    instrument_id: definition.id,
    instrument_version: definition.version,
    timestamp,
    variant,
    scores: scores || {},
    bands: bands || {},
    readout: readout || [],
    student_snapshot: snapshot || '',
  };
  if (variant === 'full') record.raw_responses = responses || {};
  return record;
}

/** UI labels for the taught read-out (engine copy — about the construct, never the person). */
const READOUT_LABELS = {
  band: 'Where your answers lean',
  explainer: 'What this measures',
  light: 'What this result can offer',
  shadow: 'What to keep in context',
  one_thing: 'One thing to try',
};

/**
 * createEngine(definition, ctx) -> controller.
 *   .el            the rendered <form> with all sections, in order
 *   .collect()     merge every section's read() -> { responses, snapshot, missing }
 *   .score(r)      run the pure scorer over a response map
 *   .buildReadout(bands)
 *   .renderReadout(readout)  -> DOM element teaching the read-out
 *   .buildRecord({ timestamp, variant })  collect -> score -> readout -> record
 *                  (throws if the sitting is incomplete)
 *   .scoresOnly    the carried scores-only flag (DESIGN.md DPO escape hatch)
 *
 * options.scoresOnly (default false): when true, the engine's DEFAULT record
 * variant is 'scores-only' (raw_responses omitted). buildRecord's explicit
 * `variant` still wins if passed, so a caller can override per record.
 */
export function createEngine(definition, ctx, options = {}) {
  const doc = getDoc(ctx);
  const scoresOnly = options.scoresOnly === true;
  const defaultVariant = scoresOnly ? 'scores-only' : 'full';
  const views = definition.sections.map((section) => {
    const renderer = RENDERERS[section.type];
    if (!renderer) throw new Error(`no renderer for section type "${section.type}"`);
    return { section, view: renderer(section, ctx) };
  });

  const el = h(doc, 'form', { class: 'pi-instrument', 'data-instrument': definition.id });
  const itemCount = definition.sections.reduce((total, section) => total + (section.items ? section.items.length : 0), 0);
  const scored = definition.sections.some((section) => ['scored-likert', 'scored-matrix'].includes(section.type));
  const duration = {
    bigfive: '18–25',
    grit: '2–4',
    'growth-mindset': '1–2',
    'learner-profile': '8–12',
    'self-efficacy': '2–4',
    strengths: '25–35',
    'cognitive-ability': '25–35',
  }[definition.id] || String(Math.max(2, Math.round(itemCount / 10)));
  const hero = h(doc, 'header', { class: 'pi-instrument__hero' }, [
    h(doc, 'p', { class: 'pi-eyebrow', text: scored ? 'A private self-check' : 'A guided reflection' }),
    definition.title ? h(doc, 'h1', { class: 'pi-instrument__title', text: definition.title }) : null,
    definition.intro ? h(doc, 'p', { class: 'pi-instrument__intro', text: definition.intro }) : null,
    h(doc, 'div', { class: 'pi-meta' }, [
      itemCount ? h(doc, 'span', { class: 'pi-meta__item', text: `${itemCount} questions` }) : null,
      h(doc, 'span', { class: 'pi-meta__item', text: `${duration} min · varies by pace` }),
      h(doc, 'span', { class: 'pi-meta__item', text: 'Private on this device' }),
    ]),
  ]);
  el.appendChild(hero);

  // Dense runs of teaching cards (the learner profile) become a scannable grid.
  let infoRun = [];
  const flushInfoRun = () => {
    if (infoRun.length > 3) {
      el.appendChild(h(doc, 'div', { class: 'pi-info-grid' }, infoRun.map(({ view }) => view.el)));
    } else {
      for (const { view } of infoRun) el.appendChild(view.el);
    }
    infoRun = [];
  };
  for (const entry of views) {
    if (entry.section.type === 'info' && entry.section.id !== 'intro') infoRun.push(entry);
    else {
      flushInfoRun();
      el.appendChild(entry.view.el);
    }
  }
  flushInfoRun();

  function collect() {
    const responses = {};
    let snapshot = '';
    const missing = [];
    for (const { view } of views) {
      const out = view.read();
      Object.assign(responses, out.responses || {});
      if (out.snapshot != null && out.snapshot !== '') snapshot = out.snapshot;
      if (out.missing) missing.push(...out.missing);
    }
    return { responses, snapshot, missing };
  }

  const score = (responses) => scoreInstrument(definition, responses);

  function renderReadout(readout) {
    const wrap = h(doc, 'section', { class: 'pi-readout', 'aria-label': 'Your read-out' });
    const hasScores = readout.length > 0;
    wrap.appendChild(h(doc, 'header', { class: 'pi-readout__header' }, [
      h(doc, 'p', { class: 'pi-eyebrow', text: hasScores ? 'Your read-out' : 'Your direction' }),
      h(doc, 'h2', { text: hasScores ? 'A pattern, not a verdict.' : 'A commitment, not a score.' }),
      h(doc, 'p', {
        text: hasScores
          ? 'Start with the broad patterns. Keep what feels useful, question what does not, and use the detail as material for reflection.'
          : 'You chose where you want to push. Put the commitment into your own words below so it becomes specific enough to act on.',
      }),
    ]));

    const { byId } = scaleIndex(definition);
    const primary = readout.filter((entry) => !byId[entry.scale]?.parent);
    const detail = readout.filter((entry) => byId[entry.scale]?.parent);
    const card = (entry) => h(doc, 'article', {
      class: 'pi-readout__scale',
      'data-band': entry.band,
    }, [
        h(doc, 'h3', { text: entry.scale_name || entry.scale }),
        h(doc, 'p', {
          class: 'pi-readout__band',
          text: `${READOUT_LABELS.band}: ${entry.band.replace(/[-_]/g, ' ')}`,
        }),
        readoutRow(doc, READOUT_LABELS.explainer, entry.construct_explainer),
        readoutRow(doc, READOUT_LABELS.light, entry.light),
        readoutRow(doc, READOUT_LABELS.shadow, entry.shadow),
        readoutRow(doc, READOUT_LABELS.one_thing, entry.one_thing_to_try),
      ]);

    if (hasScores) {
      const primaryGrid = h(doc, 'div', { class: 'pi-readout__grid' });
      for (const entry of primary.length ? primary : readout) primaryGrid.appendChild(card(entry));
      wrap.appendChild(primaryGrid);
    }

    if (detail.length) {
      const detailGrid = h(doc, 'div', { class: 'pi-readout__grid' });
      for (const entry of detail) detailGrid.appendChild(card(entry));
      wrap.appendChild(h(doc, 'details', { class: 'pi-readout__details' }, [
        h(doc, 'summary', { text: `Explore the finer detail · ${detail.length} facets` }),
        detailGrid,
      ]));
    }
    return wrap;
  }

  function buildRecord({ timestamp, variant } = {}) {
    if (!timestamp) throw new Error('timestamp is required (passed in by the client, never generated here)');
    const { responses, snapshot, missing } = collect();
    if (missing.length) throw new Error(`sitting incomplete: ${missing.join(', ')}`);
    const { scores, bands } = score(responses);
    const readout = buildReadout(definition, bands);
    return assembleRecord(definition, { responses, scores, bands, readout, snapshot, timestamp, variant: variant || defaultVariant });
  }

  return { el, collect, score, buildReadout: (b) => buildReadout(definition, b), renderReadout, buildRecord, scoresOnly, views };
}

function readoutRow(doc, label, value) {
  return h(doc, 'p', { class: 'pi-readout__row' }, [h(doc, 'strong', { text: label }), String(value)]);
}
