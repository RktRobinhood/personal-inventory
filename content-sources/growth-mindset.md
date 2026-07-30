# Source material — Growth Mindset (3-item Implicit Theories of Intelligence)

**Instrument id:** `growth-mindset`
**Construct:** Implicit theory of intelligence (fixed ↔ growth). DESIGN's
"movable change-meter" — deliberately tiny, designed to shift; carries the
bookend before/after number.

## Provenance

- **Primary citation:** Dweck, C. S. (1999, 2006). *Self-theories / Mindset.*
  The brief 3-item growth-mindset measure derived from Dweck's Implicit
  Theories of Intelligence Scale.
- **Verbatim item source (cross-checked):**
  - SPARQtools (Stanford SPARQ) Growth Mindset Scale — https://sparqtools.org/mobility-measure/growth-mindset-scale/
  - (Search snippet independently confirmed item 3 verbatim.)
- **License:** Dweck's mindset items are widely reproduced and used freely for
  research and education; not formally public domain. Confirm terms — see
  REVIEW.md → Layer-2 licensing note.

## Items (verbatim, 3) — all FIXED-mindset (entity) statements

Response: 6-point. SPARQ coding: `1 = strongly agree … 6 = strongly disagree`.

| # | Item (verbatim) | Type |
|---|-----------------|------|
| 1 | You have a certain amount of intelligence, and you can't really do much to change it. | fixed/entity |
| 2 | Your intelligence is something about you that you can't change very much. | fixed/entity |
| 3 | You can learn new things, but you can't really change your basic intelligence. | fixed/entity |

## Scoring convention (IMPORTANT — flag for Layer-2)

All three items are **fixed-mindset** statements, so **disagreeing** with them
indicates a **growth** mindset. Higher scores = stronger growth mindset.

**Mapping for this project's engine** (0-based anchor index):
- Anchors authored low→high index as **agreement decreasing**:
  `["Strongly agree", "Agree", "Mostly agree", "Mostly disagree", "Disagree", "Strongly disagree"]`
  → index 0 = "Strongly agree" (most fixed) … index 5 = "Strongly disagree" (most growth).
- With this anchor order, **no reverse flag is needed**: a high index already
  means "disagrees with the fixed statement" = growth. Sum of the three items
  (0–15) → criterion-referenced bands (low = more fixed lean, high = more growth lean).

⚠️ This depends entirely on the anchor coding direction. Some reproductions code
`1 = strongly disagree … 6 = strongly agree`, which would invert everything.
This file follows **SPARQ's stated coding (1 = strongly agree)**. **Human must
confirm the anchor direction and keying during the content-fidelity check.**

## Scale grouping (for definition)

- `growth_mindset` — all 3 items, single scale (no facets), forward under the
  anchor order above (high = growth lean).
