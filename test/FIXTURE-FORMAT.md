# Scoring fixture format

The highest-value QA artifact (DESIGN.md): per-instrument, known response-sets with
**hand-verified** expected scores and bands. Catches reverse-keying and summing bugs.

One file per scored instrument: `test/fixtures/<instrument_id>.json`.

```json
{
  "instrument": "bigfive",
  "definition": "definitions/bigfive.json",
  "cases": [
    {
      "name": "orderliness-all-high",
      "responses": { "<response-key>": <integer 0..points-1>, "...": 0 },
      "expect": {
        "scores": { "<scaleId>": <number> },
        "bands":  { "<scaleId>": "<bandId>" }
      }
    }
  ]
}
```

## Rules

- **Response value** is the **0-based index into the item's `anchors`** (0 = lowest anchor
  … `points-1` = highest). The engine applies reverse-keying — fixtures record the
  student's *raw* selection, never the reverse-keyed value.
- **Response key**: the item's `id` if it declares one; otherwise the synthesized key
  `"<sectionId>#<itemIndex>"` (0-based index within that section's `items`). `scoring.js`
  and the harness agree on this key, so fixtures stay stable even for unlabelled items.
- **`expect.scores`** are the summed (reverse-keyed) raw scores per scale, hand-derived.
- **`expect.bands`** are the criterion-referenced bands the engine must assign for those
  scores, given the scale's range and the section's `band_thresholds`.
- A fixture **must** be hand-derived from the definition — not copied from engine output.
  That is the whole point: the fixture is the independent check on the engine.
- Cover at least: one all-low, one all-high, one mixed/boundary case per scale where feasible.

## How the gate runs it

`test/run-gates.js` loads each fixture, loads its definition, runs the **pure**
`engine/scoring.js` over `responses`, and asserts the computed scores/bands deep-equal
`expect`. Until `engine/scoring.js` exists (Phase 1), the scoring gate reports SKIP.
