# Personal Inventory — Design Decisions

*A start-of-year (and across-the-DP) self-knowledge instrument for IB students. Output of a grilling session. This is the "shared understanding" doc — the spec we build from.*

---

## North star

A **private mirror**, not a teacher metric. The whole thing is *a gift of insight* the student gives themselves — to know their raw material, name who they want to become, and take an active (non-passive) role in their own education. Nothing here is graded. The moment it feels evaluative, honesty dies.

**Trait philosophy (the tone rule for every word the instruments print):**
> No trait is "bad." Every trait has a light side and a shadow. The profile both *explains your proclivities* ("this is why you tend to…") and *invites you to challenge them* ("…and here's where you might push against it"). It celebrates your uniqueness, grounded in what psychology actually understands.

---

## The three payloads (kept deliberately distinct)

1. **Inward — psychological self-portrait:** Big Five (temperament), VIA-style character strengths (values/character), growth scales.
2. **Aspirational — "who you want to be":** the eulogy, the IB learner profile / ATLs as a virtue project.
3. **Frame — education-agency manifesto:** "what is a good education, and what's *your* role in it?" School as an unnatural space; CAS as the outlet to use skills for real. *This absorbs the "lifelong learner / technical skills" goal — it was never a separate feature, it's the frame.*

---

## Recurrence model (resolved: "Model B")

- **Full baseline** at the start of DP1.
- **Qualitative revisiting is embedded in structures that already exist** — CAS check-ins/progress and the TOK virtue/Stoic strand — *not* a standalone re-survey. This kills survey fatigue at the root: you give a *lens to re-read existing work through*, you don't re-administer a questionnaire.
- **Bookend re-measure:** the short movable scale(s) are re-taken only at the **end of DP2** → one honest before/after number, emotionally earned at graduation.
- **Capstone:** at the end of DP2 the student re-reads (and re-writes, cold) their DP1 eulogy. This is the two-year emotional payoff; design toward it.

## Modular kit

Each touchpoint is a *configuration* of modules: some one-time (Big Five, VIA), some recurrent (Growth Mindset), some rotating qualitative prompts. The fixed quantitative spine stays byte-for-byte identical for comparability; the qualitative shell rotates to stay fresh.

---

## Media split

- **Paper / by hand = the soul.** Reflective writing (eulogy, strengths/weaknesses, aspiration). Slow, private, unperformative. This is where honesty lives.
- **Self-built mobile-friendly HTML = the arithmetic.** Instrument administration + *client-side* scoring. Built in-house from public-domain item pools — no third-party apps, no paid services, no logins. Scored on-device, student-owned, never sent to a server you control.
- "Score together" = the app computes; **you and the student read and discuss the output together** (this is where the anti-reification framing is delivered live, by a human).

---

## Instruments

| Instrument | Role | Cadence | Notes |
|---|---|---|---|
| **Big Five (facet-level)** | Temperament — "your raw material" | One-time baseline | Facet detail requires the long (IPIP-NEO-derived) item set. Output **re-architected** (see below). |
| **VIA-style character strengths** | Character / values — virtue lens | Baseline | Use a **public-domain analog** — VIA's exact items are proprietary. Harmonizes with the TOK virtue/Stoic strand. |
| **Growth Mindset** | The movable change-meter | **Recurrent / bookend** | Tiny, designed to shift — carries the "see how you changed" number. |
| **Grit, Self-Efficacy** | Additional lenses | Distributed across CAS/TOK touchpoints | Watch for redundancy/fatigue. |

**Big Five output is rebuilt from "scored profile" into "self-design handles":** each scale ships as *tendency → when it helps → when it hurts → one thing to try*; timestamped ("In August of DP1, I tended toward…"); student-owned; delivered by a human, not a bare printout.

> **Superseded (v2.0.0, August 2026) — the band decision.** The original rule was three criterion-referenced bands (low/balanced/high), *not* percentiles, on the grounds that the instrument's real resolution is coarse and its norms are adult and English. First classroom run showed the cost: because the average person answers well above the midpoint of a Likert scale, criterion-referenced thirds put nearly every student in "balanced" on nearly every scale, so the read-out was uninformative — and a mid-range *domain* score is almost never a mid-range set of *facets*, which the old output could not show at all.
>
> v2.0.0 therefore reports **norm-referenced percentiles across the published hierarchy** — 2 metatraits, 5 domains, 10 aspects, 30 facets — against Johnson's under-21 norms, in seven bands rather than three. The original honesty concern is met in a better way than by throwing resolution away: every score carries a **±1 SEM uncertainty range**, the **comparison group is named and switchable** on the results page, and the read-out says which numbers (single-facet aspects, the derived metatraits) are the least certain. Derivations, assumptions and limitations are documented in `content-sources/bigfive.md` Part 2.

---

## Launch arc — 3 lessons (~60 usable min each)

0. **Opener — "What is a good education, and what's your role in it?"** Socratic; perspective-taking (teacher's vs student's "good education"); school-as-unnatural-space; CAS-as-outlet. *Placement deferred to prep* — either start-of-year orientation time, or a lean ~15 min opening Lesson 1 with eulogy drafting finished as homework.
1. **Soul** — strengths/weaknesses + eulogy. **Paper, no tech.**
2. **Instrument** — Big Five + growth scale(s), HTML-scored; begin interpretation.
3. **Mirror + Aspiration** — discuss the profile, *then* learner-profile / ATLs — deliberately after they've seen their raw material, so "who you want to be" lands against "who you tend to be."

---

## Storage / the vault

- **Central** so files don't get lost; **GDPR retention-scheduled**; **student-accessible.**
- **Recommended:** Microsoft-native (you already own it) — a **SharePoint document library**, one **per-student folder** (unique permissions), governed by **Microsoft Purview retention labels** (e.g. delete X years after graduation). ⚠️ Automated Purview retention may need an **A3/A5** education tenant — IT must confirm.
- Open-source alternative if you ever want data off Microsoft / true teacher-inaccessibility: **Nextcloud** (self/EU-hosted; ongoing maintenance cost).
- **Privacy model (resolved: "B"):** the vault is **private-by-policy** (centrally governed; you *can* access but commit not to unless the student shares); **the eulogy is private-by-physics** — paper-only, sealed-envelope custody (you hold it, you don't read it), returned at the DP2 capstone.
- **Mechanism:** HTML scores client-side → student saves the read-out into their folder. The save is a deliberate ownership moment.
- **GDPR:** this is sensitive personal data on minors. **DPO sign-off required before launch** (lawful basis, retention period, access policy).

---

## Scope

Full implementation targeted before launch (months available). **Paper is a permanent first-class option**, not a fallback — eulogy is paper by design; any student who prefers paper for the rest may use it.

---

## Architecture (build spec — for the autonomous build loop)

**Pattern:** a suite of independent single-file HTML instruments, driven by a shared engine + declarative definitions. No build step.

**Frozen contracts (build these first, lock them):**
- `engine.js` — the shared layer. Given an instrument definition, it does *all* generic work: renders Likert items, handles reverse-keying, sums to scales/facets, maps scores to bands, renders the "tendency → light → shadow → one-thing-to-try" read-out (enforcing the "no trait is bad" framing), builds the timestamped record, triggers export. The backend lives here once, never replicated.
- `vault-schema.json` — the record contract.
- `instrument-definition.schema.json` — the definition contract.

**Per instrument** = a thin HTML page that loads `engine.js` + a **declarative definition file** (`bigfive.json`, etc.): item texts, reverse-key flags, scale/facet groupings, band thresholds, per-band copy. *Instruments are data, not code* — which is what makes the build loopable and the content human-reviewable line-by-line.

**Vault persistence:**
- **Append-only folder of per-record files** (e.g. `bigfive_2026-08-20.json`), one per instrument-sitting. No load/merge/re-save — purely additive. The student's SharePoint folder *is* the vault. (Chosen over a single merged file because the merge dance is too fragile for teenagers over two years.)
- A separate **`viewer.html`** reads all records in the folder → renders the accumulated portrait + the snapshot digest.
- Each record stores: instrument id + version, timestamp, scored scales, assigned bands, generated read-out, **and raw item responses** (enables later re-scoring/longitudinal analysis; justified because it's the student's own access-controlled, retention-scheduled, private vault). Engine has a `scores-only` escape hatch if the DPO requires it.
- **No PII inside record files** — the folder location is the identity; files stay anonymous (data-minimisation).

**Read-out & reflection model (resolved — "C"):**
1. **Engine teaches, never pronounces.** Per scale/facet it renders: the band, a neutral `construct_explainer` (what the trait *is* + what psychology understands about it), and the light/shadow/one-thing-to-try copy. **Tendency language only** ("your answers lean…", "people who lean this way tend to…") — *never* essence language ("you are…"). This is how the student "understands their results" without being handed a verdict.
2. **Student authors the meaning.** After the taught read-out, the engine prompts the student to write their own synthesis (which fits / which doesn't / what they'll do). That **student-authored text** is stored as the snapshot and is what accumulates in the vault. No machine-generated interpretive prose about the person is ever produced or stored.
   - ⇒ each definition file needs a `construct_explainer` field per scale/facet, separate from the per-band copy.

**Engine section types (modest generalization):** the engine supports a small fixed set of section/item types — `info/teaching block`, `scored-likert`, `self-rating`, `select-and-commit`, `free-reflection` — all emitting the same record format. Psychometric *and* aspirational modules run through the one engine. Future modules = new definition files composed of these types.

**Learner-profile / ATL module (resolved):** aspirational, **unscored, no bands** (scoring virtues would reify exactly the attributes we want students reaching for). Composed of `info/teaching` + `select-and-commit` + `free-reflection` sections. Framing = **"full subversive, then constructive"**: each IB attribute opens with how you get *controlled/minimised* if you lack it (e.g. *Open-minded → "A mind that won't change is the easiest one to use"*), then pivots to the empowered version + one concrete move. Each edgy reframe is **mapped back to its official IB attribute** in the data so it stays defensible to colleagues/parents.

**Content-safety rule:** the loop *transcribes and assembles validated psychological material* into definition files, and writes `construct_explainer`/band copy **grounded in established findings, in tendency language**. It does **not** invent items or psychology from scratch. Every definition file carries `source` + `citation` + `license`, and requires human (teacher / psych colleague) sign-off before use. Strengths lens uses **IPIP public-domain strengths scales**, not VIA's proprietary items.

## QA / definition of done (for the AFK loop)

The loop runs **unattended** and may **not self-declare the project finished**. Its terminal state is "**code-complete: all Layer-1 gates green + `REVIEW.md` generated**." The human does Layer 2 at the end.

**Layer 1 — automated gates the loop must pass every iteration (write these FIRST, alongside the frozen schemas):**
- **Scoring fixtures** — per instrument, known response-sets → hand-verified expected scores/bands. Catches reverse-keying/summing bugs. *Highest-value QA artifact.*
- **Schema validation** — every definition file ↔ `instrument-definition.schema.json`; every record ↔ `vault-schema.json`.
- **Essence-language linter** — flags forbidden "you are…" patterns in all copy (enforces tendency-language rule).
- **Citation/license presence** — no definition ships without `source` + `citation` + `license`.
- **Render/offline/PII** — loads on a phone viewport, makes **zero network calls**, viewer aggregates a test record folder, record files contain no PII.

**Layer 2 — human sign-off at the end (loop CANNOT self-verify these — it stops and lists them in `REVIEW.md`):**
- **Content fidelity** — items actually match their cited source (spot-check vs primary source).
- **Psychology + tone** — construct copy accurate, "no trait is bad" honored, subversive learner-profile voice right for 16-year-olds.
- **Privacy/GDPR** — DPO sign-off on lawful basis + retention.

## Hosting & deployment

The Apple/iOS limitation is the **`file://` problem** — locally-opened HTML is crippled on iOS Safari. Fix: **serve over HTTPS**, don't distribute files. This splits "backend" into two homes:

- **App (engine + instruments + viewer)** → **built host-agnostic** (pure static, relative paths) so GitHub Pages ↔ Azure is a deploy detail, not a rebuild. Host decided at build time (likely **Azure Static Web Apps** once tested; GitHub Pages fine for prototyping). **Not SharePoint** (won't reliably serve live interactive HTML). *App may be public — it holds no data; all answers live in SharePoint. Public app + private data is the correct shape.*
- **Data (vault records)** → **SharePoint** document library, per-student folders, Purview retention.
- **Save flow:** behind a thin **`save adapter` seam**.
  - **Production target = Microsoft Graph auto-save** (writes to the student's own OneDrive) — chosen for **student ease / fewest errors**. Wired + live-tested in the setup session (needs app registration, client IDs, redirect URIs, admin consent — only testable with a live tenant).
  - **Manual download→upload = verified fallback** — the path the AFK loop fully builds and tests; also the graceful fallback in production. Low-error UX required: one unmissable "Save my result" button + "copy to clipboard for OneNote" option + confirmation.
  - AFK loop ships manual (verified) + the adapter seam + Graph spec/stub; Graph implementation is a Layer-2 / setup-session task.

**Setup task (do together at build time, not now):** provision Azure Static Web Apps; create SharePoint library + per-student permissions + Purview retention labels (confirm A3/A5 licensing). Needs DPO sign-off before launch.

## Still open (to resolve before/while building)

- **Opener placement** — teacher to feel out in prep.
- **Instrument → touchpoint mapping** — which scale surfaces at which CAS LO / TOK lesson across two years. *(Pedagogy/scheduling — does NOT gate the build.)*
- **The build itself** — the HTML instruments + the SharePoint/Purview backend. *Future implementation task, to do together.*
