/**
 * Construction-based figural matrix items.
 * Each response is a 20-bit string representing the selected construction
 * elements. This mirrors the Open Matrices Item Bank response format.
 */
import { getDoc, h } from '../dom.js';

export function render(section, ctx) {
  const doc = getDoc(ctx);
  const children = [];
  if (section.title) children.push(h(doc, 'h2', { class: 'pi-section__title', text: section.title }));
  if (section.intro) children.push(h(doc, 'p', { class: 'pi-intro', text: section.intro }));
  const inputsById = {};

  section.items.forEach((item, index) => {
    const codes = item.item_code.split(',');
    const boxes = [];
    const matrix = h(doc, 'div', { class: 'pi-matrix-grid', role: 'img', 'aria-label': `Matrix puzzle ${index + 1}` });
    codes.slice(0, 8).forEach((code) => matrix.appendChild(drawCode(doc, code, 'pi-matrix-cell')));
    matrix.appendChild(h(doc, 'div', { class: 'pi-matrix-cell pi-matrix-cell--missing', text: '?' }));

    const palette = h(doc, 'div', { class: 'pi-matrix-palette', role: 'group', 'aria-label': 'Construction elements' });
    for (let element = 0; element < 20; element++) {
      const id = `${section.id}-${item.id}-${element}`;
      const input = h(doc, 'input', { type: 'checkbox', id, name: item.id, value: String(element) });
      const label = h(doc, 'label', { for: id, 'aria-label': `Toggle element ${element + 1}` }, [
        drawElement(doc, element, 'pi-matrix-symbol'),
      ]);
      const choice = h(doc, 'span', { class: 'pi-matrix-choice' }, [input, label]);
      boxes.push(input);
      palette.appendChild(choice);
    }
    inputsById[item.id] = boxes;

    children.push(h(doc, 'fieldset', { class: 'pi-item pi-matrix-item', 'data-question': String(index + 1) }, [
      h(doc, 'legend', { text: `Matrix ${index + 1}` }),
      h(doc, 'p', { class: 'pi-matrix-instruction', text: 'Build the missing tile. Select every element that belongs in it, then continue.' }),
      matrix,
      palette,
    ]));
  });

  const el = h(doc, 'section', { class: 'pi-section pi-scored-matrix', 'data-section-id': section.id }, children);
  const read = () => {
    const responses = {};
    const missing = [];
    for (const [id, boxes] of Object.entries(inputsById)) {
      const bits = boxes.map((box) => box.checked ? '1' : '0').join('');
      responses[id] = bits;
      if (!boxes.some((box) => box.checked)) missing.push(id);
    }
    return { responses, missing };
  };
  return { el, read };
}

export function drawCode(doc, code, className) {
  const svg = svgNode(doc, 'svg', { viewBox: '0 0 100 100', class: className, 'aria-hidden': 'true' });
  [...code].forEach((bit, index) => {
    if (bit === '1') drawInto(doc, svg, index);
  });
  return svg;
}

export function drawElement(doc, index, className) {
  const svg = svgNode(doc, 'svg', { viewBox: '0 0 100 100', class: className, 'aria-hidden': 'true' });
  drawInto(doc, svg, index);
  return svg;
}

function drawInto(doc, svg, index) {
  const polygon = (points, filled = true) => svg.appendChild(svgNode(doc, 'polygon', {
    points,
    fill: filled ? 'currentColor' : 'none',
    stroke: 'currentColor',
    'stroke-width': '3',
  }));
  if (index < 4) {
    polygon(['0,0 25,0 0,25', '25,100 0,100 0,75', '100,75 100,100 75,100', '75,0 100,0 100,25'][index]);
  } else if (index < 8) {
    polygon(['12.5,50 50,12.5', '12.5,50 50,87.5', '50,87.5 87.5,50', '50,12.5 87.5,50'][index - 4], false);
  } else if (index < 12) {
    polygon([
      '37.5,0 62.5,0 62.5,12.5 37.5,12.5',
      '0,37.5 0,62.5 12.5,62.5 12.5,37.5',
      '37.5,87.5 62.5,87.5 62.5,100 37.5,100',
      '87.5,37.5 87.5,62.5 100,62.5 100,37.5',
    ][index - 8], false);
  } else if (index === 12 || index === 13) {
    svg.appendChild(svgNode(doc, 'rect', {
      x: '40', y: '40', width: '20', height: '20',
      fill: index === 12 ? 'currentColor' : 'none',
      stroke: 'currentColor', 'stroke-width': '3',
    }));
  } else if (index === 14 || index === 15) {
    svg.appendChild(svgNode(doc, 'circle', {
      cx: '50', cy: '50', r: '10',
      fill: index === 14 ? 'currentColor' : 'none',
      stroke: 'currentColor', 'stroke-width': '3',
    }));
  } else {
    polygon([
      '50,12.5 37.5,25 62.5,25',
      '12.5,50 25,37.5 25,62.5',
      '50,87.5 37.5,75 62.5,75',
      '87.5,50 75,37.5 75,62.5',
    ][index - 16], false);
  }
}

function svgNode(doc, tag, attrs) {
  const node = doc.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}
