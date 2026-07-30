# BUILD.md — Personal Inventory build plan (for the autonomous loop)

**Source of truth for *why*:** [`DESIGN.md`](DESIGN.md). Read it first. This file is the *what* and the *order*.
**Your terminal state:** all Layer-1 gates green + `REVIEW.md` generated. **You may NOT mark the project "done"** — a human closes it after Layer-2 review.

---

## 0. Operating rules (read every iteration)

1. **Contracts + tests first, then code.** Never write an instrument before the schema and fixtures it must satisfy exist.
2. **Instruments are data, not code.** All instrument-specific content lives in `definitions/*.json`. The only place logic lives is `engine/`. If you find yourself writing per-instrument JavaScript, stop — it belongs in the engine as a generic capability.
3. **Transcribe, never invent.** You do **not** author psychometric items from memory. You **may fetch** items from a citable public source via web search and save them to `content-sources/<id>.md` **with the exact source URL + citation + license** — fetching a source is allowed; fabricating from memory is not. If you cannot find a citable source for an instrument, that task is *blocked* — log it in `REVIEW.md` under "Needs human", do not fabricate. Strengths uses **IPIP public-domain strengths scales**, never VIA's proprietary items. Everything sourced this way is flagged in `REVIEW.md` for the human **content-fidelity** check.
4. **Tendency language only.** No copy may say "you are…". Use "your answers lean…", "people who lean this way tend to…". The linter enforces this; treat a lint failure as a hard stop.
5. **No network calls** anywhere in the app (the manual save path is local download). The Graph save path is a *stub* only (see Phase 4).
6. **No PII in record files.** The SharePoint folder is the identity.
7. **Small commits, one task at a time.** After each task: run the full gate suite (`npm test`). Green → next task. Red → fix before proceeding.
8. When a decision is genuinely ambiguous and not covered by `DESIGN.md`, **do not guess** — record it in `REVIEW.md` under "Needs human" and continue with other tasks.

---

## Tech constraints

- **App:** vanilla HTML/CSS/JS. **No framework, no build step.** Mobile-first, responsive, accessible (WCAG AA: labels, keyboard nav, contrast, focus states).
- **Scoring logic** lives in a pure module (`engine/scoring.js`) importable by **both** the browser and Node (so fixtures test the exact code the app runs). Use ES modules.
- **Test harness:** Node scripts (Node is available to you; the *app* stays no-build, the *tests* may use Node).
- **Schema validation:** vendor a standalone validator (e.g. Ajv standalone build) into `vendor/` — no install step required at runtime.
- All files UTF-8, LF line endings.

---

## Repo layout (create in Phase 0)

```
/engine
  engine.js            # renders sections, orchestrates a sitting, builds the record
  scoring.js           # PURE: responses + definition -> scores -> bands (browser+Node)
  sections/            # one renderer per section type
    info.js  scored-likert.js  self-rating.js  select-and-commit.js  free-reflection.js
  save-adapter.js      # manual (real) + graph (stub)
/schema
  vault-record.schema.json
  instrument-definition.schema.json
/definitions           # the instruments, as DATA
  bigfive.json  strengths.json  growth-mindset.json  grit.json  self-efficacy.json
  learner-profile.json
/content-sources        # cited raw material the definitions are built from (Phase 2 research)
/instruments            # thin per-instrument HTML pages that load engine + a definition
/viewer
  viewer.html  viewer.js  # reads a folder of records -> portrait + student-authored snapshot
/test
  fixtures/             # known responses -> expected scores/bands, per instrument
  run-gates.js          # runs ALL Layer-1 gates; exit nonzero on any failure
  lint-essence.js       # flags "you are…" patterns in all copy
/vendor                 # ajv standalone, etc.
index.html              # simple launcher linking the instruments + viewer
REVIEW.md               # YOU generate this at the end (Layer-2 checklist)
```

---

## Phase 0 — Contracts, harness, rails (do first, lock before anything else)

- [x] Scaffold repo layout above.
- [x] Write `schema/instrument-definition.schema.json`. A definition has: `id`, `version`, `title`, `source`, `citation`, `license`, `sections[]`. A `scored-likert` section declares `items[]` (each: `text`, `scale`, `reverse:bool`, `points`), `scales[]` (grouping → facets/domains), `band_thresholds` (criterion-referenced thirds of the scale's own range), and per-scale `construct_explainer` + per-band copy (`light`, `shadow`, `one_thing_to_try`). Aspirational section types (`info`, `select-and-commit`, `free-reflection`) declare no scoring.
- [x] Write `schema/vault-record.schema.json`. A record has: `instrument_id`, `instrument_version`, `timestamp` (passed in, not generated server-side), `raw_responses`, `scores`, `bands`, `readout`, `student_snapshot` (the student-authored text). **No PII fields.** Include a `scores-only` variant (omits `raw_responses`) toggled by an engine flag.
- [x] Write `test/lint-essence.js` — fails on forbidden essence-language patterns in any definition copy.
- [x] Define the fixture format and write `test/run-gates.js` to run: schema validation (all definitions + a sample record), scoring fixtures, essence linter, citation/license presence, a headless render smoke check, network-call check (assert none), PII check on records.
- [x] `npm test` runs `run-gates.js`. **Gate suite must be green on an empty/sample setup before Phase 1.**

## Phase 1 — Engine

- [x] `engine/scoring.js` (pure): reverse-keying, summing to scales/facets, criterion-referenced band assignment. Importable in Node.
- [x] `engine/sections/*` renderers for all five section types.
- [x] `engine/engine.js`: loads a definition, renders sections in order, runs the **read-out & reflection model** (DESIGN.md): teach (band + `construct_explainer` + light/shadow/one-thing-to-try, tendency language) → prompt the student to author their own synthesis → assemble the record (incl. `student_snapshot`).
- [x] `engine/save-adapter.js`: **manual** path (generate record file → download; + "copy to clipboard for OneNote" + confirmation), and a **graph** path that is a clearly-marked stub throwing "wire in setup session".
- [x] Engine carries `scores-only` flag.
- **Acceptance:** a hand-written toy definition runs end-to-end in a browser smoke test; scoring fixtures for the toy pass; no network calls; record validates.

## Phase 2 — Instrument definitions (CONTENT — highest care)

> Per Operating Rule 3: build each from cited material in `content-sources/`. If a source is missing, block it in `REVIEW.md`, don't fabricate. Strengths uses **IPIP public-domain strengths scales**, NOT VIA's proprietary items.

For each of `bigfive` (IPIP-NEO-120, facet-level), `strengths` (IPIP strengths), `growth-mindset` (Dweck), `grit` (Grit-S), `self-efficacy` (GSE), `learner-profile` (aspirational/unscored, subversive-then-constructive, each reframe mapped to its official IB attribute):
- [x] Place cited source material in `content-sources/<id>.md` (item wording, reverse-key map, scale groupings, citation, license). _(All 6 sourced. bigfive + strengths recorded provenance only — items not autonomously transcribable; BLOCKED in REVIEW.)_
- [x] Author `definitions/<id>.json` from it (transcription only). Write `construct_explainer` + band copy grounded in established findings, tendency language. _(Done: grit, self-efficacy, growth-mindset, learner-profile. bigfive + strengths BLOCKED — not fabricated.)_
- [x] Hand-derive a scoring fixture into `test/fixtures/<id>.json` (known responses → expected scores/bands). _(Done for the 3 scored instruments; learner-profile is unscored (n/a); bigfive + strengths blocked.)_
- [x] Build the thin `instruments/<id>.html` page. _(Done: grit, self-efficacy, growth-mindset, learner-profile. bigfive + strengths blocked.)_
- **Acceptance per instrument:** definition validates, fixtures pass, essence linter clean, citation present, page renders mobile. _(Met for all 4 built instruments at Layer-1; on-device render = Layer-2.)_

## Phase 3 — Viewer

- [x] `viewer/` reads a folder of record files → renders the accumulated portrait over time + surfaces each `student_snapshot`. Aspirational modules shown as commitments, not scores.
- [x] Handles 0..N records, mixed instruments, multiple sittings of the same instrument (longitudinal view for the bookend re-measure).
- **Acceptance:** aggregates a test folder of fixture-derived records correctly; no network; no PII surfaced beyond what the student authored. _(Met: viewer:aggregate gate over 5 sample records; viewer.html loads via local FileReader — net:none clean; portrait surfaces only scores/bands + student-authored snapshots/commitments.)_

## Phase 4 — Integration + launcher + final gates

- [x] `index.html` launcher linking instruments + viewer.
- [x] Full `npm test` green across ALL instruments. _(9 gates green; 18 scoring-fixture cases across the 3 scored instruments; 4 definitions; bigfive + strengths blocked, not live.)_
- [x] Generate **`REVIEW.md`** (Layer-2 handoff) — see below. **Stop here.**

---

## REVIEW.md (you generate this; it is your last action)

A checklist for the human, listing for **each instrument**:
- Source + citation + license used; a diff-style "transcribe-check" pointer (definition item ↔ `content-sources` line) so a human can verify fidelity fast.
- Any "Needs human" items you hit (missing sources, ambiguities, blocked tasks).
- Confirmation of which Layer-1 gates pass.
- The Layer-2 list the human still must do: **content fidelity spot-check, psychology/tone review, subversive-voice check, DPO privacy/GDPR sign-off, and the live Graph + Azure + SharePoint setup session.**

---

## Definition of done (loop)

ALL true: every Layer-1 gate green for every instrument; no `definitions/*.json` without source+citation+license; essence linter clean; zero network calls; no PII in records; `REVIEW.md` generated. → **Hand off to human. Do not self-declare finished.**
