# REVIEW.md — handoff

Build is **code-complete: all Layer-1 gates green**, all seven instruments built.
Run `npm test` any time. Deployment steps are in [`DEPLOY.md`](DEPLOY.md).

This is deliberately short: most of what used to be "human checklist" is now either
**automated in the gate suite** or **owned by you / your IT person**. Only the
genuinely human-judgment items remain.

---

## Layer-1 status (automated — all green, 14 gates)

`schema:definitions` (7) · `schema:records` (9) · `scoring:fixtures` (24 cases /
6 files) · `lint:essence` (tendency-language enforced) · `citation:license` (7) ·
**`content:fidelity` (354 Likert items verified verbatim against their cited sources)** ·
`render:smoke` (9 pages / 14 engine modules) · `net:none` (29 files, zero
network) · `pii:none` · `viewer:aggregate` · `library:local` ·
`matrix:scoring` · `matrix:forms`.

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
| Big Five | 120 items → 30 facets → 5 domains | IPIP-NEO-120 (public domain) | **High** — cross-checked across 2 independent repos (119/120 identical) |
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
- **Band cuts** `[0.3333, 0.6667]` across all scored instruments; a score exactly
  at 2/3 lands in the middle band (consistent everywhere, reflected in fixtures).

## Owned elsewhere (not in this handoff)

- **Privacy/GDPR/licensing** — going to your on-site IT person.
- **Azure hosting** — see [`DEPLOY.md`](DEPLOY.md); Free-tier Static Web Apps, the
  `staticwebapp.config.json` is ready. Once it's on HTTPS, the iOS `file://` issue is
  moot, so there's no separate on-device-hosting caveat.
- **Microsoft Graph auto-save** — still a deliberate stub in
  [`engine/save-adapter.js`](engine/save-adapter.js) (`graphSave` throws). Needs app
  registration + admin consent in the setup session. The manual download + "copy for
  OneNote" path is fully built and tested as the production fallback.

**DONE — awaiting your read-through of the authored copy.**
