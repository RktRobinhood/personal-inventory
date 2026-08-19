# REVIEW.md — handoff

Build is **code-complete: all Layer-1 gates green**, all seven instruments built.
Big Five is at **v2.0.0** — norm-referenced hierarchy (see "Big Five v2.0.0" below).
Run `npm test` any time. Deployment steps are in [`DEPLOY.md`](DEPLOY.md).

This is deliberately short: most of what used to be "human checklist" is now either
**automated in the gate suite** or **owned by you / your IT person**. Only the
genuinely human-judgment items remain.

---

## Layer-1 status (automated — all green, 14 gates)

`schema:definitions` (7) · `schema:records` (9) · `scoring:fixtures` (26 cases /
6 files) · `lint:essence` (tendency-language enforced) · `citation:license` (7) ·
**`content:fidelity` (354 Likert items verified verbatim against their cited sources)** ·
`render:smoke` (9 pages / 15 engine modules) · `bundle:runtime` · `net:none` (30 files, zero
network) · `pii:none` · `page:sync` · **`norms:hierarchy` (47 scales: composite
membership, copy-pole coverage, and norm arithmetic)** · `viewer:aggregate` ·
`library:local` · `matrix:scoring` · `matrix:forms`.

The **content:fidelity** gate is the automated transcription check for the 354
Likert prompts: every prompt must appear verbatim in its
`content-sources/<id>.md`. The construction-format assessment is covered
separately by `matrix:scoring`, which exact-matches all 220 published solution
keys, and `matrix:forms`, which checks bank size, calibration flags, form
balance, exposure control, fixed palette order, and 2PL estimation. Any future
drift that breaks scoring fails the build.

---

## Instruments (all 7 built, gate-green)

| Instrument | Structure | Source | Provenance confidence |
|------------|-----------|--------|------------------------|
| Big Five | 120 items → 30 facets → 10 aspects → 5 domains → 2 metatraits | IPIP-NEO-120 (public domain) + DeYoung et al. (2007) aspects + Johnson norms | **High** for items — cross-checked across 2 independent repos (119/120 identical). Scoring model documented in `content-sources/bigfive.md` Part 2 |
| Character Strengths | 213 items → 24 strengths → 6 virtues | IPIP-VIA (public domain) | **Good** — single source (ipip.ori.org); item counts match the source exactly; gate-locked |
| Grit | 8 → 2 facets | Grit-S (Duckworth & Quinn 2009) | verbatim, cross-checked |
| Self-Efficacy | 10, 1 scale | GSE (Schwarzer & Jerusalem 1995) | verbatim (PsyToolkit) |
| Growth Mindset | 3, 1 scale | Dweck (SPARQtools) | verbatim |
| Learner Profile | aspirational, unscored | IB Learner Profile + in-house reframes | framework sourced; copy authored |
| Figural Reasoning | complete 220-item bank; 2 practice + balanced 28-item scored forms | Open Matrices Item Bank | **High for figural reasoning** — 219 items carry published 2PL calibration; not normed here as an IQ score |

The cognitive instrument is intentionally narrower than a full IQ battery. OMIB
contains 220 openly available figural-matrix items, 219 with usable published
2PL parameters. This site draws exposure-aware, balanced 28-item forms and
reports both exact constructions and a calibrated theta estimate with
uncertainty. It does not convert the result to an IQ number because no
age-specific Danish norming study, supervised standardisation, or multi-domain
battery is present. See
`content-sources/cognitive-ability.md` and `THIRD_PARTY_NOTICES.md`.

---

## Big Five v2.0.0 — what changed and what needs your eye

**Why.** The first classroom run reported "balanced" for nearly every student on
nearly every scale. That was not the students; it was the scoring. Criterion-
referenced thirds divide the raw sum by the maximum possible sum, and because
people answer well above the midpoint of a Likert scale, almost everyone lands in
the middle third. The instrument was measuring 30 facets and reporting almost
nothing.

**What changed.**

1. **Norm-referenced percentiles** against Johnson's published IPIP-NEO-120
   age/sex norms, defaulting to the **under-21** group. The middle band now means
   "like most people your age", not "near the midpoint of the answer scale".
2. **Seven bands instead of three** (very low / low / slightly below / middle /
   slightly above / high / very high), sharing three sets of authored copy via
   `copy_poles`, so the interpretive text stays reviewable.
3. **The full published hierarchy**, 47 scales from the same 120 answers:
   2 metatraits (Stability, Plasticity) → 5 domains → **10 aspects** (DeYoung,
   Quilty & Peterson, 2007) → 30 facets.
4. **Read-out rebuilt to be instructive**: a spectrum bar per scale with both
   poles labelled and the result placed on it; an uncertainty range of ±1 SEM;
   a per-domain note naming the highest and lowest facet and the size of the
   split; an aspect-divergence note; and a top-of-page summary of the five
   facets furthest from the middle.
5. **A switchable comparison group** (under 21 all / male / female / adults
   21–40). Switching re-scores the same answers — deliberately, so students see
   that a percentile is meaningless without a stated group.
6. **New gate `norms:hierarchy`** checks composite membership, copy-pole
   coverage, and that every composite mean is exactly the signed sum of its
   members' means.

**What needs a psychologist's eye (Layer 2), in priority order.**

- **The aspect membership rule.** A facet marks an aspect when its DeYoung
  et al. (2007) Table 3 loading is ≥ .50 *and* higher than on the sibling aspect.
  Every loading and the resulting assignment are tabulated in
  `content-sources/bigfive.md` §2.1. Three consequences worth agreeing with:
  *Intellect* and *Orderliness* rest on a **single facet** each; *Compassion* is
  weak (DeYoung et al. state the NEO has no good Compassion markers); and four
  facets (Excitement-Seeking, Liberalism, Trust, Modesty) mark **neither** aspect.
- **Two derived quantities.** Aspect SDs use an average within-domain facet
  correlation *back-solved from the norm table itself* (no outside assumption).
  Metatrait SDs use an **assumed** average domain intercorrelation of .25/.24 —
  the only genuinely imported number, and the reason the two metatrait
  percentiles are the softest figures in the read-out. Both are derived in §2.3.
- **Conservative facet reliabilities.** Johnson publishes facet alpha *ranges*
  per domain, not per facet; each facet takes the **low end** of its domain's
  range, which widens the uncertainty bands. Reconstructing the domain alphas
  from that floor reproduces the published values within ~.03.
- **The new interpretive copy**: 12 new scales (2 metatraits + 10 aspects) with
  explainer + light/shadow/one-thing-to-try per pole, plus **94 spectrum pole
  labels** across all 47 scales. Same standing as the copy note below.
- **Norms are adult-leaning, English-language, and self-selected internet
  respondents.** The under-21 group is the closest available fit for DP1
  students, not a Danish adolescent standardisation. The read-out says so; you
  may want to say it out loud as well.

---

## The one real human task before launch: read the authored copy

The **items** are transcribed and gate-verified. The **interpretive band copy is
loop-authored** — for ~65 scales (Big Five's 30 facets + 5 domains, Strengths' 24
strengths + 6 virtues), each with a construct explainer and low/balanced/high
light / shadow / one-thing-to-try, plus the Learner-Profile reframes. The essence
linter guarantees the *tone rule* (no "you are…" verdicts) but not that the
psychology is *right*. A teacher/psych read-through of this copy is the substantive
sign-off. It reads as tendencies and follows "no trait is bad / every strength has
a shadow," but it is first-draft and yours to correct in the `definitions/*.json`.

(Lower-stakes: a verbatim spot-check of the Strengths items vs ipip.ori.org, since
that set is single-source. Counts already match and the gate locks drift.)

---

## Decisions already made (no action needed unless you disagree)

- **Strengths** uses the full original 213-item IPIP-VIA (≈20 min), grouped under
  the 6 VIA virtues as parent scales. (The shorter 96-item IPIP-VIA-R exists if you
  ever want a faster form.)
- **Big Five** uses the full IPIP-NEO-120 facet-level form (typically 18–25 min here).
- **Band cuts** `[0.3333, 0.6667]` across all scored instruments *except Big Five*;
  a score exactly at 2/3 lands in the middle band (consistent everywhere,
  reflected in fixtures). **Big Five moved to norm-referenced percentile cuts**
  `[.10 .25 .40 .60 .75 .90]` in v2.0.0 — see below.

## Owned elsewhere (not in this handoff)

- **Privacy/GDPR/licensing** — going to your on-site IT person.
- **Azure hosting** — see [`DEPLOY.md`](DEPLOY.md); Free-tier Static Web Apps, the
  `staticwebapp.config.json` is ready. Once it's on HTTPS, the iOS `file://` issue is
  moot, so there's no separate on-device-hosting caveat.
- **Microsoft Graph auto-save** — still a deliberate stub in
  [`engine/save-adapter.js`](engine/save-adapter.js) (`graphSave` throws). Needs app
  registration + admin consent in the setup session. The manual download + "copy for
  OneNote" path is fully built and tested as the production fallback.

**DONE — awaiting your read-through of the authored copy and of the Big Five
v2.0.0 scoring decisions above.**
