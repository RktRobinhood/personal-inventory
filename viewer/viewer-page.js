import { aggregateRecords, scaleChange } from './viewer.js';

const INSTRUMENT_NAMES = {
  bigfive: 'Big Five',
  grit: 'Grit',
  'growth-mindset': 'Growth Mindset',
  'learner-profile': 'Learner Profile',
  'self-efficacy': 'Self-Efficacy',
  strengths: 'Character Strengths',
};

export function mountPortraitViewer(ctx = {}) {
  const doc = ctx.doc || document;
  const input = doc.getElementById('files');
  const out = doc.getElementById('portrait');
  const pickLabel = doc.getElementById('file-summary');
  if (!input || !out) throw new Error('Portrait viewer shell is incomplete');

  input.addEventListener('change', async () => {
    const files = Array.from(input.files || []);
    if (pickLabel) pickLabel.textContent = files.length
      ? `${files.length} result file${files.length === 1 ? '' : 's'} selected`
      : 'Choose all the result files you want to compare';
    const records = (await Promise.all(files.map(readRecord))).filter(Boolean);
    render(aggregateRecords(records));
  });

  function render(portrait) {
    out.replaceChildren();
    if (portrait.total === 0) {
      out.appendChild(el('div', { class: 'pi-empty' }, [
        el('p', { text: 'No readable results yet. Choose one or more saved .json files above.' }),
      ]));
      return;
    }

    out.appendChild(el('header', { class: 'pi-portrait-summary' }, [
      el('p', { class: 'pi-eyebrow', text: 'Your collection' }),
      el('h2', { text: `${portrait.total} moment${portrait.total === 1 ? '' : 's'} of reflection` }),
      el('p', { text: `Across ${portrait.instruments.length} ${portrait.instruments.length === 1 ? 'lens' : 'different lenses'}. Read this as a changing record, not a fixed identity.` }),
    ]));

    const grid = el('div', { class: 'pi-portrait-grid' });
    for (const instrument of portrait.instruments) grid.appendChild(renderInstrument(instrument, portrait));
    out.appendChild(grid);

    if (portrait.snapshots.length) {
      const reflections = el('section', { class: 'pi-reflection-archive' }, [
        el('div', { class: 'pi-section-heading' }, [
          el('h2', { text: 'In your own words' }),
          el('p', { text: 'The interpretation you wrote at each sitting.' }),
        ]),
      ]);
      const notes = el('div', { class: 'pi-notes-grid' });
      for (const snapshot of portrait.snapshots) {
        notes.appendChild(el('blockquote', { class: 'pi-snapshot' }, [
          el('p', { text: snapshot.text }),
          el('footer', { text: `${nameFor(snapshot.instrument_id)} · ${datePart(snapshot.timestamp)}` }),
        ]));
      }
      reflections.appendChild(notes);
      out.appendChild(reflections);
    }
  }

  function renderInstrument(instrument, portrait) {
    const card = el('article', { class: 'pi-portrait-card' });
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
    const scales = Object.keys(instrument.longitudinal);
    const primaryIds = primaryScaleIds(instrument.latest);
    const visible = primaryIds.length ? scales.filter((id) => primaryIds.includes(id)) : scales;
    const details = primaryIds.length ? scales.filter((id) => !primaryIds.includes(id)) : [];
    card.appendChild(renderScaleList(visible, instrument.longitudinal, scaleNames));

    if (details.length) {
      card.appendChild(el('details', { class: 'pi-trajectory-details' }, [
        el('summary', { text: `Explore ${details.length} finer facets` }),
        renderScaleList(details, instrument.longitudinal, scaleNames),
      ]));
    }
    return card;
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
        el('span', { class: `pi-band pi-band--${latest.band || 'unknown'}`, text: latest.band || '—' }),
      ]);
      if (change) {
        const direction = change.delta > 0 ? '+' : '';
        row.appendChild(el('span', {
          class: 'pi-delta',
          text: `${direction}${change.delta}`,
          title: 'Change in raw score between the first and latest sitting',
        }));
      }
      list.appendChild(row);
    }
    return list;
  }

  function el(tag, attrs = {}, children = []) {
    const node = doc.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else node.setAttribute(key, value);
    }
    for (const child of children) if (child) node.appendChild(child);
    return node;
  }
}

async function readRecord(file) {
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
