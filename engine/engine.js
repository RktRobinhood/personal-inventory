/**
 * engine.js — orchestrates a sitting.
 *
 * Read-out & reflection model (DESIGN.md, resolved "C"):
 *   1. The engine TEACHES, never pronounces: per scale it shows where the score
 *      sits on the spectrum, a neutral construct_explainer, and the light /
 *      shadow / one-thing-to-try copy — all in the definition's tendency
 *      language.
 *   2. The STUDENT authors the meaning: a free-reflection section captures their
 *      own synthesis, which becomes the record's student_snapshot. No
 *      machine-generated prose about the person is ever produced or stored.
 *
 * Where a section carries norms, the read-out is HIERARCHICAL: metatraits, then
 * each domain with its aspects and facets underneath it, each placed as a
 * percentile against a named comparison group with an explicit uncertainty
 * range. The engine's own strings are about the construct and the statistics —
 * never about the person — which is what keeps them inside the tone rule.
 *
 * The two pieces of real logic — buildReadout() and assembleRecord() — are PURE
 * and Node-testable. createEngine() is the browser glue (DOM only inside calls).
 */
import { h, getDoc } from './dom.js';
import { scoreInstrument, resolveNormGroup } from './scoring.js';
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

/** Index every scale across all scored sections, in declaration order. */
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

/** The section a scale was declared in (for its band vocabulary). */
function sectionOfScale(definition, scaleId) {
  for (const section of definition.sections) {
    if (!['scored-likert', 'scored-matrix'].includes(section.type)) continue;
    if (section.scales.some((s) => s.id === scaleId)) return section;
  }
  return null;
}

/**
 * PURE. Assemble the taught read-out from a definition + assigned bands (+ the
 * scoring details, when the section is norm-referenced). Returns an array of
 * entries matching the vault-record `readout` shape, in definition
 * scale-declaration order.
 */
export function buildReadout(definition, bands, details = {}) {
  const { byId, order } = scaleIndex(definition);
  const readout = [];
  for (const scaleId of order) {
    const bandId = bands[scaleId];
    if (bandId == null) continue;
    const scale = byId[scaleId];
    const detail = details[scaleId] || {};
    const copy = scale.bands[detail.copy_band] || scale.bands[bandId];
    if (!copy) continue;
    const entry = {
      scale: scaleId,
      scale_name: scale.name,
      band: bandId,
      construct_explainer: scale.construct_explainer,
      light: copy.light,
      shadow: copy.shadow,
      one_thing_to_try: copy.one_thing_to_try,
    };
    if (scale.level) entry.level = scale.level;
    if (scale.parent) entry.parent = scale.parent;
    if (scale.spectrum) entry.spectrum = { ...scale.spectrum };
    if (detail.percentile != null) {
      entry.percentile = round1(detail.percentile);
      entry.percentile_low = round1(detail.percentile_low);
      entry.percentile_high = round1(detail.percentile_high);
      entry.z = round2(detail.z);
      entry.score = detail.score;
    }
    readout.push(entry);
  }
  return readout;
}

const round1 = (n) => Math.round(n * 10) / 10;
const round2 = (n) => Math.round(n * 100) / 100;

/**
 * PURE. Build a vault record. `timestamp` is passed in by the client (DESIGN.md:
 * never generated server-side). `variant` 'full' includes raw_responses;
 * 'scores-only' omits them.
 */
export function assembleRecord(definition, { responses, scores, bands, readout, snapshot, timestamp, variant = 'full', normGroup }) {
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
  if (normGroup) record.norm_group = normGroup;
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

/** Display names for the seven norm-referenced bands (about the statistic, not the student). */
const BAND_LABEL = {
  'very-low': 'Very low',
  low: 'Low',
  'slightly-low': 'Slightly below middle',
  mid: 'Middle',
  'slightly-high': 'Slightly above middle',
  high: 'High',
  'very-high': 'Very high',
  balanced: 'Middle',
};

const LEVEL_LABEL = { metatrait: 'Metatrait', domain: 'Domain', aspect: 'Aspect', facet: 'Facet' };

const LEVEL_INTRO = {
  metatrait: 'The two broadest patterns in the model. Stability is what Neuroticism, Agreeableness and Conscientiousness share; Plasticity is what Extraversion and Openness share. These are the coarsest and most stable numbers here.',
  aspect: 'Each domain splits into two aspects — the halves that appear when its facets are factor-analysed. A domain score can hide a real gap between them.',
  facet: 'Thirty facets, four items each. These are the finest-grained and the least certain numbers in the read-out; read them as leads to check, not as findings.',
};

/**
 * createEngine(definition, ctx) -> controller.
 *   .el            the rendered <form> with all sections, in order
 *   .collect()     merge every section's read() -> { responses, snapshot, missing }
 *   .score(r, o)   run the pure scorer over a response map
 *   .buildReadout(bands, details)
 *   .renderReadout(readout, options)  -> DOM element teaching the read-out
 *   .normGroups()  the comparison groups available, or []
 *   .buildRecord({ timestamp, variant, normGroup })  collect -> score -> readout
 *                  -> record (throws if the sitting is incomplete)
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

  const normedSection = definition.sections.find((s) => s.type === 'scored-likert' && s.norms);

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

  const score = (responses, opts) => scoreInstrument(definition, responses, opts);
  const normGroups = () => (normedSection ? normedSection.norms.groups.map(({ id, label, short }) => ({ id, label, short })) : []);

  function renderReadout(readout, options = {}) {
    const wrap = h(doc, 'section', { class: 'pi-readout', 'aria-label': 'Your read-out' });
    const hasScores = readout.length > 0;
    const hierarchical = readout.some((entry) => entry.percentile != null);
    const groups = normGroups();
    const currentGroup = groups.find((g) => g.id === options.normGroup) || groups[0];

    wrap.appendChild(h(doc, 'header', { class: 'pi-readout__header' }, [
      h(doc, 'p', { class: 'pi-eyebrow', text: hasScores ? 'Your read-out' : 'Your direction' }),
      h(doc, 'h2', { text: hasScores ? 'A pattern, not a verdict.' : 'A commitment, not a score.' }),
      h(doc, 'p', {
        text: hasScores
          ? (hierarchical
            ? 'Every number below is a percentile: the share of the comparison group who answered lower. Start at the top of the hierarchy and read downward — the interesting part is usually where a domain and its facets disagree.'
            : 'Start with the broad patterns. Keep what feels useful, question what does not, and use the detail as material for reflection.')
          : 'You chose where you want to push. Put the commitment into your own words below so it becomes specific enough to act on.',
      }),
    ]));

    if (!hierarchical) {
      wrap.appendChild(flatGrid(readout));
      return wrap;
    }

    if (groups.length > 1) wrap.appendChild(normPicker(groups, currentGroup, options.onSelectNormGroup));
    wrap.appendChild(profileSummary(readout, currentGroup));

    const byLevel = (level) => readout.filter((entry) => entry.level === level);
    const metatraits = byLevel('metatrait');
    if (metatraits.length) {
      wrap.appendChild(levelBlock('Level 1 · Metatraits', LEVEL_INTRO.metatrait,
        h(doc, 'div', { class: 'pi-readout__grid' }, metatraits.map((entry) => card(entry, 'full')))));
      wrap.appendChild(h(doc, 'h4', { class: 'pi-sublevel pi-sublevel--major', text: 'Level 2–4 · Each domain, with its aspects and facets underneath' }));
      wrap.appendChild(h(doc, 'p', { class: 'pi-sublevel__intro', text: `${LEVEL_INTRO.aspect} ${LEVEL_INTRO.facet}` }));
    }

    for (const domain of byLevel('domain')) {
      const aspects = byLevel('aspect').filter((entry) => entry.parent === domain.scale);
      const facets = byLevel('facet').filter((entry) => entry.parent === domain.scale);
      const block = h(doc, 'section', { class: 'pi-domain-block' });
      block.appendChild(h(doc, 'div', { class: 'pi-readout__grid pi-readout__grid--single' }, [card(domain, 'full')]));
      const note = spreadNote(domain, aspects, facets);
      if (note) block.appendChild(h(doc, 'p', { class: 'pi-spread-note' }, note));
      // Everything below the domain goes inside an indented rail, so that "these
      // belong to the domain above" is visible rather than merely stated.
      if (aspects.length || facets.length) {
        const children = h(doc, 'div', { class: 'pi-children' });
        if (aspects.length) {
          children.appendChild(h(doc, 'h5', { class: 'pi-children__label' }, [
            h(doc, 'span', { class: 'pi-children__count', text: String(aspects.length) }),
            ` aspects of ${domain.scale_name}`,
          ]));
          children.appendChild(h(doc, 'div', { class: 'pi-readout__grid' }, aspects.map((entry) => card(entry, 'medium'))));
        }
        if (facets.length) {
          children.appendChild(h(doc, 'h5', { class: 'pi-children__label' }, [
            h(doc, 'span', { class: 'pi-children__count', text: String(facets.length) }),
            ` facets of ${domain.scale_name}`,
          ]));
          children.appendChild(h(doc, 'div', { class: 'pi-readout__grid pi-readout__grid--compact' }, facets.map((entry) => card(entry, 'compact'))));
        }
        block.appendChild(children);
      }
      wrap.appendChild(block);
    }

    wrap.appendChild(h(doc, 'p', { class: 'pi-readout__caveat', text: `Comparison group: ${currentGroup ? currentGroup.label : 'norm group'}. Percentiles come from published norms for the IPIP-NEO-120; the shaded band on each bar is one standard error of measurement either side of the score. Four-item facets carry the widest bands, so treat a single facet as a lead to check against how you actually behaved this term, not as a finding.` }));
    return wrap;

    function flatGrid(entries) {
      const { byId } = scaleIndex(definition);
      const primary = entries.filter((entry) => !byId[entry.scale]?.parent);
      const detail = entries.filter((entry) => byId[entry.scale]?.parent);
      const frag = h(doc, 'div', {});
      const primaryGrid = h(doc, 'div', { class: 'pi-readout__grid' });
      for (const entry of primary.length ? primary : entries) primaryGrid.appendChild(card(entry, 'full'));
      frag.appendChild(primaryGrid);
      if (detail.length) {
        const detailGrid = h(doc, 'div', { class: 'pi-readout__grid' });
        for (const entry of detail) detailGrid.appendChild(card(entry, 'medium'));
        frag.appendChild(h(doc, 'details', { class: 'pi-readout__details' }, [
          h(doc, 'summary', { text: `Explore the finer detail · ${detail.length} facets` }),
          detailGrid,
        ]));
      }
      return frag;
    }

    function levelBlock(title, intro, body) {
      return h(doc, 'section', { class: 'pi-domain-block' }, [
        h(doc, 'h4', { class: 'pi-sublevel', text: title }),
        h(doc, 'p', { class: 'pi-sublevel__intro', text: intro }),
        body,
      ]);
    }

    /**
     * One scale card. `density` drives how much of the teaching copy is open by
     * default, and the level drives the card's visual weight — a facet must not
     * look like a domain, or the hierarchy is invisible.
     *   full    — metatraits and domains: everything open
     *   medium  — aspects: explainer open, light/shadow/try behind a disclosure
     *   compact — facets: everything behind a disclosure
     */
    function card(entry, density) {
      const teaching = [
        readoutRow(doc, READOUT_LABELS.light, entry.light),
        readoutRow(doc, READOUT_LABELS.shadow, entry.shadow),
        readoutRow(doc, READOUT_LABELS.one_thing, entry.one_thing_to_try),
      ];
      const explainer = readoutRow(doc, READOUT_LABELS.explainer, entry.construct_explainer);
      const body = density === 'full'
        ? [explainer, ...teaching]
        : density === 'medium'
          ? [explainer, h(doc, 'details', { class: 'pi-readout__more' }, [
            h(doc, 'summary', { text: 'Light, shadow, and one thing to try' }),
            ...teaching,
          ])]
          : [h(doc, 'details', { class: 'pi-readout__more' }, [
            h(doc, 'summary', { text: 'What this measures, and what to do with it' }),
            explainer, ...teaching,
          ])];

      return h(doc, 'article', {
        class: `pi-readout__scale pi-readout__scale--${density}`,
        'data-band': entry.band,
        'data-level': entry.level || '',
      }, [
        h(doc, 'div', { class: 'pi-readout__scale-head' }, [
          h(doc, 'div', { class: 'pi-readout__scale-id' }, [
            entry.level ? h(doc, 'span', { class: 'pi-level-tag', text: LEVEL_LABEL[entry.level] || entry.level }) : null,
            h(doc, 'h3', { text: entry.scale_name || entry.scale }),
          ]),
          scoreBadge(entry),
        ]),
        spectrumBar(entry),
        h(doc, 'p', { class: 'pi-readout__band' }, [
          h(doc, 'strong', { class: `pi-band-chip pi-band-chip--${entry.band}`, text: BAND_LABEL[entry.band] || entry.band }),
          h(doc, 'span', { class: 'pi-readout__range', text: `likely ${Math.round(entry.percentile_low)}–${Math.round(entry.percentile_high)}` }),
        ]),
        ...body,
      ]);
    }

    /** The percentile as the loudest thing on the card, so a profile is scannable. */
    function scoreBadge(entry) {
      return h(doc, 'div', { class: 'pi-scale-score' }, [
        h(doc, 'span', { class: 'pi-scale-score__num', text: String(Math.round(entry.percentile)) }),
        h(doc, 'span', { class: 'pi-scale-score__sub', text: 'percentile' }),
      ]);
    }

    function spectrumBar(entry) {
      const pct = clamp(entry.percentile);
      const lo = clamp(entry.percentile_low);
      const hi = clamp(entry.percentile_high);
      return h(doc, 'div', { class: 'pi-spectrum' }, [
        entry.spectrum ? h(doc, 'div', { class: 'pi-spectrum__poles' }, [
          h(doc, 'span', { text: entry.spectrum.low_end }),
          h(doc, 'span', { text: entry.spectrum.high_end }),
        ]) : null,
        h(doc, 'div', {
          class: 'pi-spectrum__track',
          role: 'img',
          'aria-label': `${entry.scale_name}: ${ordinal(pct)} percentile, likely range ${Math.round(lo)} to ${Math.round(hi)}`,
        }, [
          // Quartile ticks give the eye something to measure against; the centre
          // line marks the middle of the comparison group.
          ...[25, 50, 75].map((at) => h(doc, 'span', {
            class: `pi-spectrum__tick${at === 50 ? ' pi-spectrum__tick--mid' : ''}`,
            style: `left:${at}%`, 'aria-hidden': 'true',
          })),
          h(doc, 'span', { class: 'pi-spectrum__range', style: `left:${lo}%;width:${Math.max(hi - lo, 1)}%`, 'aria-hidden': 'true' }),
          h(doc, 'span', { class: `pi-spectrum__marker pi-spectrum__marker--${entry.band}`, style: `left:${pct}%`, 'aria-hidden': 'true' }),
        ]),
      ]);
    }

    function normPicker(list, current, onSelect) {
      const picker = h(doc, 'div', { class: 'pi-normbar' }, [
        h(doc, 'p', { class: 'pi-normbar__label', text: 'Compared with' }),
        h(doc, 'div', { class: 'pi-normbar__options' }, list.map((group) => {
          const btn = h(doc, 'button', {
            type: 'button',
            class: `pi-normbar__btn${current && group.id === current.id ? ' is-current' : ''}`,
            'aria-pressed': current && group.id === current.id ? 'true' : 'false',
            text: group.short || group.label,
          });
          if (onSelect) btn.addEventListener('click', () => onSelect(group.id));
          return btn;
        })),
        h(doc, 'p', {
          class: 'pi-normbar__hint',
          text: 'A percentile only means something against a stated group. Switch the group and every number below moves — which is worth seeing at least once.',
        }),
      ]);
      return picker;
    }

    function profileSummary(entries, group) {
      const facets = entries.filter((entry) => entry.level === 'facet');
      const outside = facets.filter((entry) => entry.band !== 'mid');
      const sorted = facets.slice().sort((a, b) => Math.abs(b.percentile - 50) - Math.abs(a.percentile - 50));
      const distinctive = sorted.slice(0, 5);
      const domains = entries.filter((entry) => entry.level === 'domain');
      const widest = domains
        .map((domain) => {
          const kids = facets.filter((f) => f.parent === domain.scale).map((f) => f.percentile);
          return { domain, spread: kids.length ? Math.max(...kids) - Math.min(...kids) : 0 };
        })
        .sort((a, b) => b.spread - a.spread)[0];

      const tiles = h(doc, 'div', { class: 'pi-profile__tiles' }, [
        tile(`${outside.length} of ${facets.length}`, 'facets fall outside the middle band'),
        widest ? tile(`${Math.round(widest.spread)} points`, `widest facet spread inside one domain (${widest.domain.scale_name})`) : null,
        tile(group ? group.short || group.label : '—', 'comparison group'),
      ]);

      const list = h(doc, 'ol', { class: 'pi-profile__list' }, distinctive.map((entry) => h(doc, 'li', {}, [
        h(doc, 'strong', { text: entry.scale_name }),
        ` — ${ordinal(entry.percentile)} percentile, ${(BAND_LABEL[entry.band] || entry.band).toLowerCase()}`,
      ])));

      return h(doc, 'section', { class: 'pi-profile' }, [
        h(doc, 'h3', { text: 'Where the profile is least average' }),
        tiles,
        h(doc, 'p', { class: 'pi-profile__note', text: 'The five facets furthest from the middle in either direction. Distance from the middle is not quality — a facet far below the middle is as informative as one far above.' }),
        list,
      ]);
    }

    function tile(value, label) {
      return h(doc, 'div', { class: 'pi-profile__tile' }, [
        h(doc, 'span', { class: 'pi-profile__value', text: value }),
        h(doc, 'span', { class: 'pi-profile__label', text: label }),
      ]);
    }

    function spreadNote(domain, aspects, facets) {
      if (!facets.length) return null;
      const sorted = facets.slice().sort((a, b) => a.percentile - b.percentile);
      const lowest = sorted[0];
      const highest = sorted[sorted.length - 1];
      const spread = Math.round(highest.percentile - lowest.percentile);
      const parts = [
        h(doc, 'strong', { text: `${domain.scale_name}: ` }),
        `the domain sits at the ${ordinal(domain.percentile)} percentile, and underneath it the six facets run from ${lowest.scale_name} at the ${ordinal(lowest.percentile)} to ${highest.scale_name} at the ${ordinal(highest.percentile)} — a spread of ${spread} points.`,
      ];
      if (aspects.length === 2) {
        const gap = Math.round(Math.abs(aspects[0].percentile - aspects[1].percentile));
        const higher = aspects[0].percentile >= aspects[1].percentile ? aspects[0] : aspects[1];
        const lower = higher === aspects[0] ? aspects[1] : aspects[0];
        parts.push(gap >= 15
          ? ` The two aspects pull apart by ${gap} points, with ${higher.scale_name} above ${lower.scale_name} — worth more attention than the domain score itself.`
          : ` The two aspects are within ${gap} points of each other, so the domain score summarises them fairly well.`);
      }
      return parts;
    }
  }

  function buildRecord({ timestamp, variant, normGroup } = {}) {
    if (!timestamp) throw new Error('timestamp is required (passed in by the client, never generated here)');
    const { responses, snapshot, missing } = collect();
    if (missing.length) throw new Error(`sitting incomplete: ${missing.join(', ')}`);
    const scored = score(responses, { normGroup });
    const readout = buildReadout(definition, scored.bands, scored.details);
    return assembleRecord(definition, {
      responses, scores: scored.scores, bands: scored.bands, readout, snapshot, timestamp,
      variant: variant || defaultVariant, normGroup: scored.normGroup,
    });
  }

  return {
    el, collect, score, normGroups,
    buildReadout: (b, d) => buildReadout(definition, b, d),
    renderReadout, buildRecord, scoresOnly, views,
    defaultNormGroup: normedSection ? resolveNormGroup(normedSection)?.id : undefined,
  };
}

/** 1 -> "1st", 23 -> "23rd". Percentiles read as ranks, so they need rank suffixes. */
function ordinal(value) {
  const n = Math.round(Number(value) || 0);
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] || 'th'}`;
}

function clamp(value) {
  return Math.min(100, Math.max(0, Number(value) || 0));
}

function readoutRow(doc, label, value) {
  return h(doc, 'p', { class: 'pi-readout__row' }, [h(doc, 'strong', { text: label }), String(value)]);
}
