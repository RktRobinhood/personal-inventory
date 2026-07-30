/**
 * self-rating.js — student rates themselves on named dimensions. Aspirational/
 * qualitative: NO psychometric scales, NO bands. Responses stored verbatim.
 * Rendered as a radio scale 1..max per item (optional anchor labels at the ends).
 * Contract: render(section, ctx) -> { el, read }.
 *   read() -> { responses: {itemId: rating}, missing: [itemId,...] }
 */
import { h, getDoc } from '../dom.js';

export function render(section, ctx) {
  const doc = getDoc(ctx);
  const children = [];
  if (section.title) children.push(h(doc, 'h2', { class: 'pi-section__title', text: section.title }));
  if (section.intro) children.push(h(doc, 'p', { class: 'pi-intro', text: section.intro }));

  const inputsById = {};
  section.items.forEach((item) => {
    const radios = [];
    const choices = [];
    for (let r = 1; r <= item.max; r++) {
      const id = `${item.id}-${r}`;
      const input = h(doc, 'input', { type: 'radio', name: item.id, id, value: String(r) });
      const labelText = item.anchors && item.anchors[r - 1] != null ? item.anchors[r - 1] : String(r);
      choices.push(h(doc, 'div', { class: 'pi-choice' }, [input, h(doc, 'label', { for: id, text: labelText })]));
      radios.push(input);
    }
    inputsById[item.id] = radios;
    children.push(h(doc, 'fieldset', { class: 'pi-item' }, [
      h(doc, 'legend', { text: item.text }),
      h(doc, 'div', { class: 'pi-choices', style: `--pi-choice-count:${item.max}` }, choices),
    ]));
  });

  const el = h(doc, 'section', { class: 'pi-section pi-self-rating' }, children);

  const read = () => {
    const responses = {};
    const missing = [];
    for (const [id, radios] of Object.entries(inputsById)) {
      const checked = radios.find((r) => r.checked);
      if (checked) responses[id] = parseInt(checked.value, 10);
      else missing.push(id);
    }
    return { responses, missing };
  };

  return { el, read };
}
