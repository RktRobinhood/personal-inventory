# OMIB form design: evidence and implementation constraints

## Bottom line

The Open Matrices Item Bank (OMIB) supports a substantially larger,
low-exposure figural-reasoning assessment, but it does **not** support calling
the result an IQ score. The most defensible classroom implementation is an
untimed 28-item form drawn from the calibrated bank, with two practice items,
published 2PL parameters used for scoring, and a different balanced selection
on later sittings.

The validation study is:

Koch, M., Spinath, F. M., Greiff, S., & Becker, N. (2022). Development and
Validation of the Open Matrices Item Bank. *Journal of Intelligence, 10*(3),
41. [https://doi.org/10.3390/jintelligence10030041](https://doi.org/10.3390/jintelligence10030041).
The official item data, implementation example, and instructions are in the
[authors' OSF repository](https://osf.io/4km79/).

## What was actually validated

- The bank contains 220 items. All but one fitted the authors' two-parameter
  logistic (2PL) model; the published item parameters therefore put 219 items
  on a common scale. The study used 2,561 medical-school applicants aged
  15–45, not a representative Danish school norming sample.
- Participants completed **two practice items with corrective feedback**, then
  **28 scored items without feedback**.
- Each of ten forms contained 22 unique items plus six common anchor items. The
  22 unique items were deliberately balanced by rule count: 2 one-rule, 5
  two-rule, 8 three-rule, 5 four-rule, and 2 five-rule items. With the anchors,
  the 28-item study forms had 3, 6, 10, 6, and 3 items at those respective rule
  counts.
- Administration in the validation study was self-paced, unproctored, and
  **had no time limit**. Mean completion time for 28 items was 26.05 minutes
  (SD 7.07).
- Average internal consistency across the ten linked forms was high
  (Cronbach's alpha .92, SD .02). That statistic belongs to the study's
  28-item linked forms and should not be presented as evidence for the current
  22-item, anchor-free form.
- Raw difficulty differed significantly among the ten forms. Those differences
  disappeared after IRT calibration and anchor-based equating. The paper
  consequently warns against comparing raw means across different forms
  without equating.

These points come directly from the paper's Procedure, Item Development,
Results, and Discussion sections
([full primary-source article](https://pmc.ncbi.nlm.nih.gov/articles/PMC9326670/)).

## Timing recommendation

Do **not** make a countdown part of the default growth measure. The item
parameters were estimated under untimed conditions, and the authors identify
the absence of a time limit as a limitation that may have made items easier.
Adding a hard limit therefore changes the administration condition and can
change item difficulty; the existing untimed calibration cannot establish that
the new timed score is comparable.

The official OSF web example happens to default to 90 seconds per item, but its
instructions explicitly describe that value as changeable. That implementation
example is not the administration used to estimate the published parameters
([official OSF materials](https://osf.io/4km79/)).

Recommended behavior:

1. Default to an **untimed standard mode**, describe it as about 25–35 minutes,
   and record elapsed time as context rather than scoring it.
2. Pause the timer when the page is hidden and record interruptions so repeat
   reflections can distinguish ability evidence from testing conditions.
3. If a Mensa-like countdown is desired, label it a separate **Challenge
   mode**. Do not plot a timed result as a delta from an untimed result. A
   defensible time limit and score interpretation would require a new
   validation study under that exact rule.

## Form generation and repeat sittings

OMIB is an IRT item bank: the authors state that calibrated items can be
combined for different needs, and specifically recommend different items at
different longitudinal measurement occasions. They also note that a bank of
more than 200 construction items makes memorizing every solution unlikely.
Learning the underlying rules may still occur, so repeat results remain growth
evidence—not a pure change in latent ability.

Implement a seeded, auditable form generator:

1. Load the 219 items with usable published `a` (discrimination) and `b`
   (difficulty) parameters; exclude the misfitting item.
2. Reserve two non-scored practice items permanently. Give immediate corrective
   feedback only during practice, matching the validation procedure.
3. Select 28 scored items, initially targeting the validated rule-count shape:
   **3 / 6 / 10 / 6 / 3** items with one through five rules.
4. Within each rule-count stratum, sample across low, middle, and high published
   `b` values and prefer items with useful `a` values. Do not take a simple
   uniform random sample: it can accidentally create a much easier, harder, or
   less informative form.
5. Persist the random seed, selected item IDs, order, administration mode,
   elapsed time, responses, and item parameters in the local result record and
   export.
6. Prefer items the learner has never seen. Once necessary, choose the
   least-exposed items and never show the same item twice in one form. Imported
   history must participate in exposure tracking.
7. Randomize item order only **within narrow difficulty/rule strata**, then
   present the strata in a broadly progressive sequence. A completely free
   shuffle was not validated and can mix practice, fatigue, and order effects
   into the score.

The six anchors in the original study linked separate calibration samples.
They do not need to be repeated in every new learner form when scoring against
the already-published 2PL parameters. New anchors become necessary if this
project later recalibrates items on its own population or tries to establish
new parallel-form norms.

## Scoring different random forms

Raw correct totals are suitable only for a clearly labelled within-form
summary. They are not directly comparable when students receive different
item sets. For cross-form and repeat comparisons, estimate a 2PL ability value
(`theta`) from each administered item's published parameters:

`P(correct | theta) = 1 / (1 + exp(-a * (theta - b)))`

Report theta with an uncertainty indicator derived from test information, not
as an IQ or percentile. A practical first implementation can use bounded
maximum-likelihood or EAP estimation and calculate the standard error from:

`information(theta) = sum(a² * P * (1 - P))`

The published parameters were estimated in a selective German
medical-applicant sample and the paper reports little convergent,
discriminant, or predictive validity evidence. Therefore, even IRT theta should
be framed as an OMIB figural-reasoning estimate under the recorded conditions.
It is not a norm-referenced intelligence score.

## What may and may not be randomized

| Component | Recommendation | Reason |
|---|---|---|
| Item selection | Yes, stratified and seeded | This is the intended benefit of an IRT item bank. |
| Item order | Limited randomization within matched strata | Full order randomization was not evaluated; progression reduces avoidable early discouragement and fatigue confounding. |
| 20 construction elements | **Keep fixed** | They are not multiple-choice distractors. Their positions define the 20-bit response and were fixed in the validation interface. Shuffling them changes visual search and motor demands. |
| Matrix rows/cells/symbols | **Do not randomize** | Those features instantiate the item's construction rules and published difficulty. Changing them creates a new, uncalibrated item. |
| Practice items | Fixed, never scored | This gives every learner the same task understanding before random scored forms. |

Palette selections can still be stored by stable semantic element ID, but that
technical possibility does not make a shuffled palette psychometrically
equivalent. Anti-memorization should come from bank rotation, not from changing
the response interface.

## Evidence-aligned professional experience

A polished interface can feel high-stakes without making unsupported
psychometric claims:

- a quiet readiness screen explaining conditions, expected duration, and what
  the assessment does and does not measure;
- an interactive tutorial followed by two feedback practice items;
- one matrix at a time, a large high-contrast matrix, a fixed clearly grouped
  construction palette, visible selected-state preview, and an obvious
  continue action;
- autosave, a restrained progress indicator, keyboard access, and a responsive
  layout that preserves equal-sized visual elements;
- no correctness feedback during scored items;
- a results report that separates accuracy, calibrated estimate and
  uncertainty, testing conditions, and reflection;
- repeat comparisons only between compatible administration modes, with the
  number of repeated items disclosed.

This creates the professional feel the user is seeking while retaining the
OMIB construction format that the authors designed to reduce
response-elimination strategies.

## Validation work still required

Before treating dynamically generated forms as equivalent for consequential
decisions, pilot the exact implementation with the intended student
population. Check completion/dropout, device effects, item fit, differential
item functioning, reliability/information across theta, and whether theta
distributions or item parameters shift by form, order, or mode. The current
tool should remain reflective and low-stakes until that evidence exists.

