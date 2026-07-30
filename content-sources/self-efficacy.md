# Source material — General Self-Efficacy Scale (GSE), 10 items

**Instrument id:** `self-efficacy`
**Construct:** Generalized self-efficacy — the belief that one can cope with a
broad range of demands. Single scale, 10 items, no facets.

## Provenance

- **Primary citation:** Schwarzer, R., & Jerusalem, M. (1995). Generalized
  Self-Efficacy scale. In J. Weinman, S. Wright, & M. Johnston (Eds.),
  *Measures in health psychology: A user's portfolio. Causal and control
  beliefs* (pp. 35–37). Windsor, UK: NFER-NELSON.
- **Verbatim item source (cross-checked):**
  - PsyToolkit survey library — https://www.psytoolkit.org/survey-library/generalized-self-efficacy-gse.html
  - Author documentation — https://userpage.fu-berlin.de/~health/faq_gse.pdf
  - (Search snippets independently confirmed items 1–4 verbatim.)
- **License:** Made freely available by the authors for research and
  educational/practice (non-commercial) use. Not public domain — confirm current
  terms with the authors' site. See REVIEW.md → Layer-2 licensing note.

## Items (verbatim, 10) — single scale, NO reverse items

Response: 4-point. Anchors (low→high index):
`["Not at all true", "Hardly true", "Moderately true", "Exactly true"]`
(index 0 = "Not at all true" … index 3 = "Exactly true"). All items positively
worded; **no reverse scoring**. Official scoring sums the 10 items (1–4 → 10–40).
NB: this project's engine uses 0-based anchor indices, so its internal sum runs
0–30; bands are criterion-referenced over that range (display uses bands, not raw
points), so the convention difference does not affect the read-out.

Transcribed **exactly as returned by the PsyToolkit reproduction** (the source
actually retrieved). Not adjusted from memory.

| #  | Item (verbatim, as retrieved from PsyToolkit) |
|----|-----------------|
| 1  | I can always manage to solve difficult problems if I try hard enough. |
| 2  | If someone opposes me, I can find the means and ways to get what I want. |
| 3  | I am certain that I can accomplish my goals. |
| 4  | I am confident that I could deal efficiently with unexpected events. |
| 5  | Thanks to my resourcefulness, I can handle unforeseen situations. |
| 6  | I can solve most problems if I invest the necessary effort. |
| 7  | I can remain calm when facing difficulties because I can rely on my coping abilities. |
| 8  | When I am confronted with a problem, I can find several solutions. |
| 9  | If I am in trouble, I can think of a good solution. |
| 10 | I can handle whatever comes my way. |

> ⚠️ **Content-fidelity flag (must verify against primary source):** the
> canonical Schwarzer & Jerusalem (1995) GSE has slightly different wording for
> several items (e.g. item 3 canonical = "It is easy for me to stick to my aims
> and accomplish my goals"; item 5 = "…I know how to handle unforeseen
> situations"; items 8/9/10 include "usually"). The table above transcribes the
> **PsyToolkit reproduction that was actually retrieved**; it was NOT altered to
> match a remembered canonical version. **Human must confirm each item verbatim
> against the primary source (Schwarzer & Jerusalem, 1995 / authors' FU-Berlin
> documentation) and correct wording before launch.**

## Scale grouping (for definition)

- `self_efficacy` — all 10 items, forward-keyed, single scale (no facets/domain).
