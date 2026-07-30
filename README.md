# Personal Inventory

A private, offline-first collection of self-knowledge and reflection instruments for students. The site helps students notice patterns in how they learn, respond to challenges, and understand themselves across a course.

## Included instruments

- Big Five
- Grit
- Self-Efficacy
- Growth Mindset
- Character Strengths
- Learner Profile

Students complete each instrument in their browser. Nothing is uploaded, no account is required, and saved result files remain under the student's control. Those files can later be combined in the Portrait view to reflect on change over time.

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

See [DESIGN.md](DESIGN.md) for the product model and [REVIEW.md](REVIEW.md) for assessment sources, licensing, and review notes.
