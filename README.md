# Personal Inventory

A private, offline-first collection of self-knowledge and reflection instruments for students. The site helps students notice patterns in how they learn, respond to challenges, and understand themselves across a course.

## Included instruments

- Big Five
- Grit
- Self-Efficacy
- Growth Mindset
- Character Strengths
- Figural Reasoning
- Learner Profile

Students complete each instrument in their browser. Nothing is uploaded and no
account is required. Completed sittings accumulate in a browser-local library;
students can export a complete JSON backup for cloud storage and import it on
another device. The Portrait view turns repeated sittings into timelines,
first-to-latest deltas, and structured reflection.

Figural Reasoning uses 22 calibrated construction-format items from the Open
Matrices Item Bank. It measures one aspect of cognitive ability (figural
reasoning); it is deliberately not labelled or converted into an IQ score
because this self-administered form has no population norms.

## Open the site

The public site is deployed through GitHub Pages:

**https://rktrobinhood.github.io/personal-inventory/**

The generated pages are also safe to open directly from `index.html` without running a local server.

## Development

The project uses vanilla HTML, CSS, and JavaScript with no runtime dependencies.

```bash
npm run build
npm test
```

`npm run build` regenerates the classic offline-safe bundle and the instrument pages from the canonical definitions. `npm test` validates definitions and records, scoring fixtures, source fidelity, privacy constraints, offline operation, and generated-page synchronization.

## Privacy and assessment integrity

- No network requests are made by the application.
- No personally identifying information is stored in result records.
- Instrument definitions include their source, citation, and license.
- Scored item wording is checked against the corresponding files in `content-sources/`.
- Results are framed as tendencies for student reflection, not diagnoses or fixed identities.
- Browser storage is convenient, not durable; the interface explicitly prompts
  students to keep the downloadable backup in a trusted cloud folder.

See [DESIGN.md](DESIGN.md) for the product model, [REVIEW.md](REVIEW.md) for
assessment sources and review notes, and
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for licensing.
