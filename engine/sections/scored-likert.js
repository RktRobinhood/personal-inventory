/**
 * scored-likert.js — a Likert item battery. Each item is a fieldset/legend with
 * one radio per anchor (native inputs => keyboard nav + screen-reader groups).
 * Responses are the 0-based anchor index, keyed via scoring.js's responseKey so
 * the render path and the scoring path agree byte-for-byte.
 * Contract: render(section, ctx) -> { el, read }.
 *   read() -> { responses: {key:index}, missing: [key,...] }
 */
import { h, getDoc } from '../dom.js';
import { responseKey } from '../scoring.js';

export function render(section, ctx) {
  const doc = getDoc(ctx);
  const children = [];
  if (section.title) children.push(h(doc, 'h2', { class: 'pi-section__title', text: section.title }));
  if (section.intro) children.push(h(doc, 'p', { class: 'pi-intro', text: section.intro }));

  const inputsByKey = {};
  section.items.forEach((item, i) => {
    const key = responseKey(section, item, i);
    const groupName = `${section.id}-${i}`;
    const choices = [];
    const radios = [];
    for (let a = 0; a < item.points; a++) {
      const id = `${groupName}-${a}`;
      const input = h(doc, 'input', { type: 'radio', name: groupName, id, value: String(a) });
      const label = h(doc, 'label', { for: id, text: section.anchors[a] != null ? section.anchors[a] : `Option ${a + 1}` });
      choices.push(h(doc, 'div', { class: 'pi-choice' }, [input, label]));
      radios.push(input);
    }
    inputsByKey[key] = radios;
    children.push(h(doc, 'fieldset', { class: 'pi-item', 'data-question': String(i + 1) }, [
      h(doc, 'legend', { text: item.text }),
      h(doc, 'div', { class: 'pi-choices', style: `--pi-choice-count:${item.points}` }, choices),
    ]));
  });

  const el = h(doc, 'section', { class: 'pi-section pi-scored-likert', 'data-section-id': section.id }, children);

  const read = () => {
    const responses = {};
    const missing = [];
    for (const [key, radios] of Object.entries(inputsByKey)) {
      const checked = radios.find((r) => r.checked);
      if (checked) responses[key] = parseInt(checked.value, 10);
      else missing.push(key);
    }
    return { responses, missing };
  };

  return { el, read };
}
