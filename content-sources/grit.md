# Source material — Grit-S (Short Grit Scale, 8 items)

**Instrument id:** `grit`
**Construct:** Grit — two facets (Consistency of Interest, Perseverance of
Effort) rolling up into an overall grit score.

## Provenance

- **Primary citation:** Duckworth, A. L., & Quinn, P. D. (2009). Development and
  validation of the Short Grit Scale (Grit–S). *Journal of Personality
  Assessment, 91*(2), 166–174.
- **Verbatim item source (cross-checked):**
  - PsyToolkit survey library — https://www.psytoolkit.org/survey-library/grit-short.html
  - DMIDI (Decision Making Individual Differences Inventory) copy — https://sjdm.org/dmidi/files/Grit-8-item.pdf
  - (Search snippets independently confirmed items 5 and 6 verbatim.)
- **License:** © Angela Duckworth. The Grit-S is **not public domain**; it is
  made freely available by the author for **research and educational
  (non-commercial) use**. School/educational use is the intended case here, but
  see REVIEW.md → Layer-2 licensing note for DPO confirmation.

## Items (verbatim, 8)

5-point response. Anchors (low→high index as authored here):
`["Not like me at all", "Not much like me", "Somewhat like me", "Mostly like me", "Very much like me"]`
(index 0 = "Not like me at all" … index 4 = "Very much like me").

| # | Item (verbatim) | Facet | Reverse?* |
|---|-----------------|-------|-----------|
| 1 | New ideas and projects sometimes distract me from previous ones. | Consistency of Interest | **reverse** |
| 2 | Setbacks don't discourage me. | Perseverance of Effort | no |
| 3 | I have been obsessed with a certain idea or project for a short time but later lost interest. | Consistency of Interest | **reverse** |
| 4 | I am a hard worker. | Perseverance of Effort | no |
| 5 | I often set a goal but later choose to pursue a different one. | Consistency of Interest | **reverse** |
| 6 | I have difficulty maintaining my focus on projects that take more than a few months to complete. | Consistency of Interest | **reverse** |
| 7 | I finish whatever I begin. | Perseverance of Effort | no |
| 8 | I am diligent. | Perseverance of Effort | no |

## Keying convention (IMPORTANT — flag for Layer-2 content-fidelity)

Duckworth & Quinn's published scoring: Perseverance items (2, 4, 7, 8) are
scored "Very much like me" = 5 (highest grit); Consistency-of-Interest items
(1, 3, 5, 6) are reverse-scored ("Very much like me" = 1). Overall grit = mean
of all 8.

With the **anchor order authored above** (index 4 = "Very much like me"), the
correct mapping for `bigfive.json`-style scoring is therefore:
- **Perseverance items (2,4,7,8): `reverse: false`** — high index = gritty.
- **Consistency items (1,3,5,6): `reverse: true`** — endorsing distractibility
  lowers grit.

⚠️ Different published copies label the "reverse" set differently (some say
items 5–8, some say 2/4/7/8) purely because they number items in a different
order or code the anchors in the opposite direction. The mapping above is tied
to THIS file's item numbering and anchor order. **Human must confirm keying
direction during the content-fidelity check.**

## Scale groupings (for definition)

- `consistency_of_interest` — items 1, 3, 5, 6 (all reverse)
- `perseverance_of_effort` — items 2, 4, 7, 8 (all forward)
- `grit` (domain, parent of both facets) — overall grit
