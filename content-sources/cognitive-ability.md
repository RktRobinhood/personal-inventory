# Figural Reasoning — source and implementation notes

## Instrument selected

The implemented assessment uses the **Open Matrices Item Bank (OMIB)**:

Koch, M., Spinath, F. M., Greiff, S., & Becker, N. (2022). Development and
Validation of the Open Matrices Item Bank. *Journal of Intelligence, 10*(3), 41.
https://doi.org/10.3390/jintelligence10030041

Primary materials: https://osf.io/4km79/

OMIB was chosen because it is an openly available, empirically calibrated bank
with 220 original figural-matrix items and a construction response format. The
validation study administered the bank in ten linked test sets to 2,561
medical-school applicants aged 15–45. All but one item fit a two-parameter
logistic item-response model; the paper reports strong reliability for the
linked sets. The item bank and reference implementation are GPLv3.

The project also considered the International Cognitive Ability Resource
(ICAR), which is a respected public-domain approach. The official ICAR site
requires registration/contact to obtain test resources, so protected item
content was not copied into this public repository:
https://www.icar-project.org/

## What is implemented

- All 220 items in the authors' `Item Data.xlsx`, including exact 20-bit item
  codes and published solution keys.
- The published 2PL difficulty (`b`) and discrimination (`a`) parameters for
  the 219 fitting items. The one misfitting item is retained for complete
  provenance but excluded from scored forms.
- Two fixed, non-scored practice items with corrective feedback.
- A seeded 28-item scored form balanced by rule count and difficulty, with
  previously unseen items preferred across repeat sittings.
- The construction response format: students select every visual element that
  makes up the missing bottom-right tile.
- Exact-match item scoring plus a 2PL expected-a-posteriori estimate and
  uncertainty for cross-form comparison.

The six anchors in the source study linked the original calibration samples.
They are not required when scoring new forms against the already-published
parameters. The dynamically assembled classroom form is not claimed to
reproduce one of the original linked forms.

## Interpretation limits

This is a measure of **figural or matrix reasoning**, an important but narrow
part of cognitive ability. It is not a multi-domain intelligence battery.

The app therefore reports a raw-score range for reflection and repeat
comparison. It does **not** convert the score into an IQ number or percentile:

- there are no age-specific Danish norms for this exact self-administered form;
- administration is unsupervised and can vary by device, fatigue, vision,
  attention, prior matrix experience, and use of outside help;
- the published calibration sample was a selective group of medical-school
  applicants rather than a representative school population;
- repeated exposure can introduce practice effects.

Scores must not be used for diagnosis, selection, tracking, or claims about
fixed potential. A repeat result is useful as reflection evidence only when the
student also considers context and practice effects.

## License

OMIB materials and the reference implementation are licensed under GNU GPL
version 3. See `THIRD_PARTY_NOTICES.md`.
