import { aggregateRecords, scaleChange } from './viewer.js';
import { archiveFilename, clearLibrary, formatBytes, importData, loadLibrary, saveLibrary, serializeArchive, updateReflection } from '../engine/local-store.js';
import { mountMotion } from '../engine/motion.js';

const INSTRUMENT_NAMES = {
  bigfive: 'Big Five',
  grit: 'Grit',
  'growth-mindset': 'Growth Mindset',
  'learner-profile': 'Learner Profile',
  'self-efficacy': 'Self-Efficacy',
  strengths: 'Character Strengths',
  'cognitive-ability': 'Figural Reasoning',
};
const INSTRUMENT_ORDER = Object.keys(INSTRUMENT_NAMES);
const INSTRUMENT_PATHS = Object.fromEntries(
  INSTRUMENT_ORDER.map((id) => [id, `../instruments/${id}.html`]),
);
const BAND_POSITION = {
  low: 16.667,
  'building-range': 16.667,
  balanced: 50,
  'middle-range': 50,
  high: 83.333,
  'higher-range': 83.333,
};

export function mountPortraitViewer(ctx = {}) {
  const doc = ctx.doc || document;
  const input = doc.getElementById('files');
  const out = doc.getElementById('portrait');
  const pickLabel = doc.getElementById('file-summary');
  const storageStatus = doc.getElementById('storage-status');
  const exportButton = doc.getElementById('export-library');
  const clearButton = doc.getElementById('clear-library');
  if (!input || !out) throw new Error('Portrait viewer shell is incomplete');

  let library = loadLibrary();
  renderCurrent();

  input.addEventListener('change', async () => {
    const files = Array.from(input.files || []);
    let added = 0;
    let recognized = 0;
    for (const file of files) {
      const data = await readJson(file);
      const imported = importData(library.state, data);
      library.state = imported.state;
      added += imported.added;
      recognized += imported.recognized;
    }
    const saved = saveLibrary(library.state);
    library = { ...library, ...saved, available: saved.saved };
    if (pickLabel) {
      pickLabel.textContent = recognized
        ? `Imported ${added} new sitting${added === 1 ? '' : 's'} · ${recognized - added} already in your library`
        : 'No readable Personal Inventory results were found in those files';
    }
    input.value = '';
    renderCurrent();
  });

  exportButton?.addEventListener('click', () => {
    const exportedAt = new Date().toISOString();
    downloadText(serializeArchive(library.state, exportedAt), archiveFilename(exportedAt));
    exportButton.textContent = 'Backup downloaded ✓';
    setTimeout(() => { exportButton.textContent = 'Download complete backup'; }, 2400);
  });

  clearButton?.addEventListener('click', () => {
    if (!confirm('Clear every locally stored Personal Inventory result and portrait reflection from this browser? Download a backup first if you may want them later.')) return;
    if (clearLibrary()) {
      library = loadLibrary();
      renderCurrent();
    }
  });

  function renderCurrent() {
    updateStorageStatus();
    render(aggregateRecords(library.state.records));
    mountMotion(doc);
  }

  function updateStorageStatus() {
    if (!storageStatus) return;
    if (!library.available) {
      storageStatus.className = 'pi-storage-meter pi-storage-meter--warning';
      storageStatus.textContent = 'Local storage unavailable — use downloaded backups';
      return;
    }
    const count = library.state.records.length;
    storageStatus.className = 'pi-storage-meter';
    storageStatus.textContent = `Saved in this browser · ${count} sitting${count === 1 ? '' : 's'} · ${formatBytes(library.bytes)}`;
  }

  function render(portrait) {
    out.replaceChildren();
    if (portrait.total === 0) {
      out.appendChild(renderEmptyState());
      out.appendChild(el('div', { class: 'pi-section-heading pi-reveal' }, [
        el('div', {}, [
          el('p', { class: 'pi-kicker', text: 'The seven lenses' }),
          el('h2', { text: 'Your complete inventory map' }),
        ]),
        el('p', { text: 'Every inventory has a place here. Start with any lens and this map will fill in automatically.' }),
      ]));
      out.appendChild(renderInstrumentGrid(portrait));
      return;
    }

    out.appendChild(renderOverview(portrait));
    out.appendChild(renderReflectionLab());

    const heading = el('div', { class: 'pi-section-heading pi-reveal' }, [
      el('div', {}, [
        el('p', { class: 'pi-kicker', text: 'The individual lenses' }),
        el('h2', { text: 'Patterns and movement' }),
      ]),
      el('p', { text: 'Dots show where each result band sits. When you repeat an inventory under compatible scoring conditions, the line connects the first and latest result and the comparable-score change appears beside it.' }),
    ]);
    out.appendChild(heading);

    out.appendChild(renderInstrumentGrid(portrait));

    if (portrait.snapshots.length) out.appendChild(renderReflectionArchive(portrait.snapshots));
  }

  function renderInstrumentGrid(portrait) {
    const grid = el('div', { class: 'pi-portrait-grid' });
    const instrumentsById = new Map(
      portrait.instruments.map((instrument) => [instrument.instrument_id, instrument]),
    );
    for (const id of INSTRUMENT_ORDER) {
      const instrument = instrumentsById.get(id);
      grid.appendChild(instrument
        ? renderInstrument(instrument, portrait)
        : renderMissingInstrument(id));
    }
    for (const instrument of portrait.instruments) {
      if (!INSTRUMENT_ORDER.includes(instrument.instrument_id)) {
        grid.appendChild(renderInstrument(instrument, portrait));
      }
    }
    return grid;
  }

  function renderEmptyState() {
    return el('section', { class: 'pi-empty-state' }, [
      el('div', { class: 'pi-empty-state__art', 'aria-hidden': 'true' }, [
        el('span', { text: '✦' }),
        el('span', { text: '○' }),
        el('span', { text: '↗' }),
      ]),
      el('p', { class: 'pi-kicker', text: 'Your portrait starts with one sitting' }),
      el('h2', { text: 'Nothing is stored here yet.' }),
      el('p', { text: 'Complete an inventory and its result will appear automatically. If you completed tests before local saving was added—or on another device—bring in the individual result files or a complete backup above.' }),
      el('div', { class: 'pi-empty-state__steps' }, [
        el('span', { text: '1 · Complete a lens' }),
        el('span', { text: '2 · Reflect here' }),
        el('span', { text: '3 · Back up to cloud storage' }),
      ]),
      el('a', { class: 'pi-btn pi-btn--primary', href: '../index.html', text: 'Choose an inventory →' }),
    ]);
  }

  function renderOverview(portrait) {
    const completed = new Set(portrait.instruments.map((item) => item.instrument_id));
    const completion = Math.round((completed.size / INSTRUMENT_ORDER.length) * 100);
    const repeats = portrait.instruments.filter((item) => item.sittings > 1).length;
    const firstDate = portrait.instruments.reduce((value, item) => {
      return !value || item.first.timestamp < value ? item.first.timestamp : value;
    }, '');
    const latestDate = portrait.instruments.reduce((value, item) => {
      return !value || item.latest.timestamp > value ? item.latest.timestamp : value;
    }, '');

    const overview = el('section', { class: 'pi-dashboard pi-reveal' });
    const copy = el('div', { class: 'pi-dashboard__copy' }, [
      el('p', { class: 'pi-eyebrow', text: 'Your living inventory' }),
      el('h2', { text: `${portrait.total} captured moment${portrait.total === 1 ? '' : 's'}` }),
      el('p', { text: repeats
        ? `${repeats} ${repeats === 1 ? 'lens has' : 'lenses have'} repeat data, so change is now visible. Look for movement, then ask what was happening around each sitting.`
        : 'This is a baseline, not a conclusion. Repeat a useful lens later to turn a snapshot into evidence of movement.' }),
      el('div', { class: 'pi-dashboard__dates' }, [
        el('span', { text: `First · ${datePart(firstDate)}` }),
        el('span', { text: `Latest · ${datePart(latestDate)}` }),
      ]),
    ]);
    const ring = el('div', {
      class: 'pi-completion-ring',
      style: `--completion:${completion * 3.6}deg`,
      role: 'img',
      'aria-label': `${completed.size} of ${INSTRUMENT_ORDER.length} inventories completed`,
    }, [
      el('strong', { text: `${completed.size}/${INSTRUMENT_ORDER.length}` }),
      el('span', { text: 'lenses' }),
    ]);
    overview.append(copy, ring);

    const checklist = el('div', { class: 'pi-lens-checklist' });
    for (const id of INSTRUMENT_ORDER) {
      checklist.appendChild(el('span', {
        class: completed.has(id) ? 'is-complete' : '',
        text: `${completed.has(id) ? '✓' : '○'} ${INSTRUMENT_NAMES[id]}`,
      }));
    }
    overview.appendChild(checklist);
    return overview;
  }

  function renderReflectionLab() {
    const section = el('section', { class: 'pi-reflection-lab pi-reveal' }, [
      el('div', { class: 'pi-section-heading' }, [
        el('div', {}, [
          el('p', { class: 'pi-kicker', text: 'Make the data yours' }),
          el('h2', { text: 'Reflection lab' }),
        ]),
        el('p', { text: 'Scores cannot know your context. These notes stay in this browser and are included in your complete backup.' }),
      ]),
    ]);
    const prompts = [
      ['pattern', 'What pattern keeps showing up?', 'Across the different lenses, I notice…'],
      ['shift', 'What has shifted—or surprised you?', 'Compared with an earlier result or expectation…'],
      ['experiment', 'What will you test next?', 'For the next few weeks, I will try…'],
    ];
    const grid = el('div', { class: 'pi-reflection-prompts' });
    for (const [key, label, placeholder] of prompts) {
      const textarea = el('textarea', {
        class: 'pi-textarea',
        rows: '5',
        placeholder,
        'data-reflection-key': key,
        'aria-label': label,
      });
      textarea.value = library.state.reflection[key] || '';
      textarea.addEventListener('input', () => {
        library.state = updateReflection(library.state, { [key]: textarea.value });
        const saved = saveLibrary(library.state);
        library = { ...library, ...saved, available: saved.saved };
        updateStorageStatus();
      });
      grid.appendChild(el('label', { class: 'pi-reflection-prompt' }, [
        el('span', { text: label }),
        textarea,
      ]));
    }
    section.appendChild(grid);
    return section;
  }

  function renderInstrument(instrument, portrait) {
    const card = el('article', { class: 'pi-portrait-card pi-reveal' });
    card.appendChild(el('header', { class: 'pi-portrait-card__header' }, [
      el('div', {}, [
        el('p', { class: 'pi-card__number', text: `${instrument.sittings} ${instrument.sittings === 1 ? 'SITTING' : 'SITTINGS'}` }),
        el('h2', { text: nameFor(instrument.instrument_id) }),
      ]),
      el('span', { class: 'pi-portrait-card__date', text: datePart(instrument.latest.timestamp) }),
    ]));

    if (!instrument.scored) {
      const commitments = portrait.commitments.filter((item) => item.instrument_id === instrument.instrument_id);
      card.appendChild(el('p', { class: 'pi-hint', text: 'Your chosen commitments' }));
      for (const commitment of commitments) {
        card.appendChild(el('div', { class: 'pi-commitment' }, [
          el('span', { text: datePart(commitment.timestamp) }),
          el('strong', { text: commitment.choices.map(humanize).join(', ') }),
        ]));
      }
      return card;
    }

    const scaleNames = scaleNameMap(instrument.latest);
    const comparableLongitudinal = Object.fromEntries(
      Object.entries(instrument.longitudinal)
        .map(([id, series]) => [id, currentVersionSeries(
          series,
          instrument.latest.instrument_version,
          instrument.latest.administration?.mode || 'legacy',
        )])
        .filter(([, series]) => series.length),
    );
    const scales = Object.keys(comparableLongitudinal);
    const primaryIds = primaryScaleIds(instrument.latest);
    const visible = primaryIds.length ? scales.filter((id) => primaryIds.includes(id)) : scales;
    const details = primaryIds.length ? scales.filter((id) => !primaryIds.includes(id)) : [];

    const hasComparableRepeat = Object.values(comparableLongitudinal).some((series) => series.length > 1);
    if (hasComparableRepeat) {
      card.appendChild(el('div', { class: 'pi-change-banner' }, [
        el('span', { text: '↗' }),
        el('p', { text: `Change view · ${datePart(instrument.first.timestamp)} to ${datePart(instrument.latest.timestamp)}` }),
      ]));
    }
    if ((instrument.versions || []).length > 1) {
      card.appendChild(el('p', {
        class: 'pi-hint',
        text: 'Scoring changed between versions, so graphs and deltas use only sittings from the latest version.',
      }));
    }
    card.appendChild(renderBandGraph(visible, comparableLongitudinal, scaleNames));
    card.appendChild(renderScaleList(visible, comparableLongitudinal, scaleNames));

    if (details.length) {
      card.appendChild(el('details', { class: 'pi-trajectory-details' }, [
        el('summary', { text: `Explore ${details.length} finer facets` }),
        renderBandGraph(details, comparableLongitudinal, scaleNames),
        renderScaleList(details, comparableLongitudinal, scaleNames),
      ]));
    }
    return card;
  }

  function renderMissingInstrument(id) {
    return el('article', { class: 'pi-portrait-card pi-portrait-card--missing pi-reveal' }, [
      el('header', { class: 'pi-portrait-card__header' }, [
        el('div', {}, [
          el('p', { class: 'pi-card__number', text: 'NOT COMPLETED' }),
          el('h2', { text: nameFor(id) }),
        ]),
        el('span', { class: 'pi-portrait-card__empty-mark', 'aria-hidden': 'true', text: '○' }),
      ]),
      el('div', { class: 'pi-portrait-card__empty-copy' }, [
        el('p', {
          text: id === 'learner-profile'
            ? 'Your selected learner attributes and commitment will appear here after the reflection.'
            : 'Complete this lens to add its pattern to the portrait. Repeat it later to make change visible.',
        }),
        el('a', {
          class: 'pi-btn',
          href: INSTRUMENT_PATHS[id],
          text: `Start ${nameFor(id)} →`,
        }),
      ]),
    ]);
  }

  function renderBandGraph(ids, longitudinal, names) {
    const graph = el('div', { class: 'pi-band-graph' });
    graph.appendChild(el('div', { class: 'pi-band-graph__axis', 'aria-hidden': 'true' }, [
      el('span', { text: 'Lower lean' }),
      el('span', { text: 'Balanced' }),
      el('span', { text: 'Higher lean' }),
    ]));
    for (const id of ids) {
      const series = longitudinal[id];
      const first = series[0];
      const latest = series[series.length - 1];
      const from = BAND_POSITION[first.band] ?? 50;
      const to = BAND_POSITION[latest.band] ?? 50;
      const row = el('div', { class: 'pi-band-graph__row' }, [
        el('span', { class: 'pi-band-graph__label', text: names[id] || humanize(id) }),
        el('div', {
          class: `pi-band-graph__track${series.length > 1 ? ' has-history' : ''}`,
          style: `--from:${from}%;--to:${to}%`,
          role: 'img',
          'aria-label': `${names[id] || humanize(id)}: ${first.band}${series.length > 1 ? ` to ${latest.band}` : ''}`,
        }, [
          el('span', { class: 'pi-band-graph__line' }),
          el('span', { class: 'pi-band-graph__dot pi-band-graph__dot--first' }),
          el('span', { class: 'pi-band-graph__dot pi-band-graph__dot--latest' }),
        ]),
      ]);
      const change = scaleChange(series);
      row.appendChild(el('span', {
        class: `pi-graph-delta${change && change.delta !== 0 ? ' has-change' : ''}`,
        text: change ? `${change.delta > 0 ? '+' : ''}${change.delta}` : '',
        title: change
          ? (series[0]?.metric === 'theta'
            ? 'Calibrated OMIB theta change from first to latest compatible sitting'
            : 'Raw-score change from first to latest compatible sitting')
          : '',
      }));
      graph.appendChild(row);
    }
    return graph;
  }

  function renderScaleList(ids, longitudinal, names) {
    const list = el('div', { class: 'pi-trajectory-list' });
    for (const id of ids) {
      const series = longitudinal[id];
      const latest = series[series.length - 1];
      const change = scaleChange(series);
      const row = el('div', { class: 'pi-trajectory' }, [
        el('div', { class: 'pi-trajectory__name' }, [
          el('strong', { text: names[id] || humanize(id) }),
          el('span', { text: change
            ? `${datePart(change.from.timestamp)} → ${datePart(change.to.timestamp)}`
            : datePart(latest.timestamp) }),
        ]),
        series.length > 1 ? renderSparkline(series, names[id] || humanize(id)) : null,
        el('span', {
          class: `pi-band pi-band--${latest.band || 'unknown'}`,
          text: latest.band ? humanize(latest.band) : '—',
        }),
      ]);
      if (change) {
        row.appendChild(el('span', {
          class: 'pi-delta',
          text: `${change.delta > 0 ? '+' : ''}${change.delta}`,
          title: series[0]?.metric === 'theta'
            ? 'Change in calibrated OMIB theta between compatible sittings'
            : 'Change in raw score between compatible sittings',
        }));
      }
      list.appendChild(row);
    }
    return list;
  }

  function renderSparkline(series, name) {
    const svg = el('svg', {
      class: 'pi-sparkline',
      viewBox: '0 0 120 38',
      role: 'img',
      'aria-label': `${name} raw-score trend across ${series.length} sittings`,
    });
    const scores = series.map((point) => Number(point.score));
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const range = Math.max(1, max - min);
    const points = scores.map((score, index) => {
      const x = series.length === 1 ? 60 : 5 + (index / (series.length - 1)) * 110;
      const y = 33 - ((score - min) / range) * 28;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    svg.appendChild(el('polyline', { points: points.join(' '), fill: 'none' }));
    for (const point of points) {
      const [cx, cy] = point.split(',');
      svg.appendChild(el('circle', { cx, cy, r: '2.8' }));
    }
    return svg;
  }

  function renderReflectionArchive(snapshots) {
    const reflections = el('section', { class: 'pi-reflection-archive pi-reveal' }, [
      el('div', { class: 'pi-section-heading' }, [
        el('div', {}, [
          el('p', { class: 'pi-kicker', text: 'Your earlier voice' }),
          el('h2', { text: 'Reflection archive' }),
        ]),
        el('p', { text: 'The interpretation you wrote at each sitting, in chronological order.' }),
      ]),
    ]);
    const notes = el('div', { class: 'pi-notes-grid' });
    for (const snapshot of snapshots) {
      notes.appendChild(el('blockquote', { class: 'pi-snapshot' }, [
        el('p', { text: snapshot.text }),
        el('footer', { text: `${nameFor(snapshot.instrument_id)} · ${datePart(snapshot.timestamp)}` }),
      ]));
    }
    reflections.appendChild(notes);
    return reflections;
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

  function el(tag, attrs = {}, children = []) {
    const node = doc.createElementNS(tag === 'svg' || tag === 'polyline' || tag === 'circle'
      ? 'http://www.w3.org/2000/svg'
      : 'http://www.w3.org/1999/xhtml', tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'class') node.setAttribute('class', value);
      else if (key === 'text') node.textContent = value;
      else node.setAttribute(key, value);
    }
    for (const child of children) if (child) node.appendChild(child);
    return node;
  }
}

async function readJson(file) {
  try {
    return JSON.parse(await file.text());
  } catch {
    return null;
  }
}

function datePart(timestamp) {
  const raw = String(timestamp).slice(0, 10);
  const [year, month, day] = raw.split('-').map(Number);
  if (!year || !month || !day) return raw;
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(year, month - 1, day));
}

function nameFor(id) {
  return INSTRUMENT_NAMES[id] || humanize(id);
}

function humanize(value) {
  return String(value).replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function scaleNameMap(record) {
  const map = {};
  for (const entry of record.readout || []) map[entry.scale] = entry.scale_name || humanize(entry.scale);
  return map;
}

function primaryScaleIds(record) {
  const all = (record.readout || []).map((entry) => entry.scale);
  if (record.instrument_id === 'bigfive') {
    return ['neuroticism', 'extraversion', 'openness', 'agreeableness', 'conscientiousness'];
  }
  if (record.instrument_id === 'strengths') {
    return ['wisdom-knowledge', 'courage', 'humanity', 'justice', 'temperance', 'transcendence'].filter((id) => all.includes(id));
  }
  if (record.instrument_id === 'grit') return ['grit'].filter((id) => all.includes(id));
  return all;
}

function currentVersionSeries(series, version, mode) {
  if (!Array.isArray(series) || !series.length) return [];
  return series.filter((point) =>
    point.instrument_version === version && point.administration_mode === mode);
}
