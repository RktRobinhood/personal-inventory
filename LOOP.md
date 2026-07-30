# LOOP.md — how to run the AFK build loop

This project is built by an autonomous loop that works through [`BUILD.md`](BUILD.md) (the *what/order*) against [`DESIGN.md`](DESIGN.md) (the *why*), one task per iteration, until it reaches the definition of done and stops for human review.

## How to start it

`/loop` needs a task **as its argument** — running bare `/loop` does nothing. From this project directory, paste this **short one-liner** (self-paced — the model re-runs itself and stops when done):

```
/loop Continue the Personal Inventory build. Read LOOP.md, DESIGN.md, BUILD.md, and PROGRESS.md. Do the next unchecked BUILD.md task following the KICKOFF PROMPT rules in LOOP.md, run `npm test` until green, check the task off, and append to PROGRESS.md. When the Definition of Done is met, generate REVIEW.md and stop with: DONE — awaiting human Layer-2 review.
```

That's all you need — it tells the loop to read the full KICKOFF PROMPT (below) off disk and follow it. The loop is stateless between runs; all progress lives in `BUILD.md` checkboxes + `PROGRESS.md`.

(Alternatively, paste the full **KICKOFF PROMPT** block below after `/loop`, or just send it as a normal message and re-send each time.)

**Prerequisite:** a `package.json` with `"test": "node test/run-gates.js"` is created by Phase 0, so `npm test` works from iteration one. Node must be installed (it is, on this machine).

**To stop early:** interrupt the loop. To resume: just start it again — it reads progress and continues.

---

## KICKOFF PROMPT (copy everything between the lines)

---
You are building the **Personal Inventory** project. The working directory contains `DESIGN.md` (the rationale — source of truth for *why*) and `BUILD.md` (the plan — source of truth for *what* and *order*). Read both, plus `PROGRESS.md` (create it if missing), at the start of every run.

Do **one focused unit of work** per run:

1. Determine the next incomplete task: the first unchecked `[ ]` item in `BUILD.md`, respecting phase order (0 → 1 → 2 → 3 → 4) and the **Operating rules** at the top of `BUILD.md`.
2. Do exactly that task. Follow the tech constraints (vanilla HTML/CSS/JS, **no build step**, **no network calls in the app**, mobile-first, accessible, ES modules, pure `scoring.js` usable in Node + browser).
3. **Content tasks (Phase 2):** fetch instrument items from a **citable public source via web search**, save to `content-sources/<id>.md` with the **exact URL + citation + license**, then transcribe into `definitions/<id>.json`. **Never write items or psychology from memory.** Strengths = **IPIP** scales, never VIA. All copy in **tendency language** ("your answers lean…"), never "you are…". Hand-derive the scoring fixture for that instrument.
4. Run `npm test` (the full Layer-1 gate suite). If red, fix until green before doing anything else. Never leave the tree red.
5. Check off the task in `BUILD.md` and append one line to `PROGRESS.md`: date-stamp omitted, just `- <task> — done (gates green)`.
6. **Ambiguity:** if something isn't settled by `DESIGN.md`/`BUILD.md`, do **not** guess — add it to `REVIEW.md` under "Needs human" and move to the next unblocked task.
7. **Done condition:** when every `BUILD.md` task is checked, all Layer-1 gates are green for every instrument, and the Definition of Done holds, generate `REVIEW.md` (the Layer-2 human checklist per `BUILD.md`), then **STOP** and output exactly: `DONE — awaiting human Layer-2 review`. You may **not** declare the project finished beyond that line; a human closes it out.

Keep changes small and committed per task. Prefer correctness over speed. When in doubt, re-read the Operating rules in `BUILD.md`.
---

## When it stops

You'll see `DONE — awaiting human Layer-2 review`. Then:
1. Read the lessons / open the instruments and **test the HTML** on a phone.
2. Work through `REVIEW.md`: **content-fidelity spot-check** (items vs cited sources), psychology/tone review, subversive learner-profile voice check.
3. Get **DPO sign-off** (GDPR lawful basis + retention).
4. Book the **setup session** (Azure hosting + SharePoint vault + Purview retention + wire/live-test Graph save) — that part needs a live tenant and can't be done AFK.
