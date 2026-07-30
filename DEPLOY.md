# DEPLOY.md — hosting the app on Azure Static Web Apps

The app is **pure static, no build step, relative paths** — it runs as-is on any
static host. Azure Static Web Apps (SWA) has a **Free tier** (free SSL, custom
domains, 100 GB/mo bandwidth) that is the recommended home. This guide assumes you
have access to the school's Azure tenant.

`staticwebapp.config.json` (in the repo root) is already set up: correct MIME types
(so the `import … with { type: 'json' }` definition loading works), no-store caching,
and basic security headers.

## The pages are `file://`-safe (open directly OR host)

Each page loads a single **classic** bundle (`app.bundle.js`) and an **inlined**
definition — no ES-module `import`, no `fetch`. So the HTML works when double-clicked
(`file://`) *and* on any host. (ES modules are blocked from `file://` by browser CORS;
that is why we bundle.)

**After editing anything in `engine/` or `definitions/`, run `npm run build`** — it
regenerates `app.bundle.js` and the instrument/viewer pages from the canonical
sources. The `page:sync` gate fails `npm test` if you forget.

## What actually needs to be served (the "app")

Only these are needed at runtime (all generated/static, no build on the host):

```
index.html
app.bundle.js
staticwebapp.config.json
instruments/    (the 6 generated .html pages + instrument.css)
viewer/viewer.html
```

NOT needed in production (sources / build / test only — safe to exclude):
`engine/`, `definitions/`, `instruments/instrument-page.js`, `build/`,
`content-sources/`, `test/`, `vendor/`, `node_modules/`, `.work/`, `*.md`,
`package.json`. (They're bundled into `app.bundle.js` / inlined into the pages.)

> The app holds **no data**. All answers live in the student's own storage
> (download now; OneDrive/SharePoint later). A public app + private data is the
> intended shape, so this can be a public site.

## Option A — GitHub + SWA (recommended; auto-deploys on every push)

1. Put this folder in a GitHub repo (it isn't a git repo yet):
   ```bash
   git init && git add -A && git commit -m "Personal Inventory app"
   gh repo create personal-inventory --private --source=. --push
   ```
2. In the **Azure Portal** → *Create resource* → **Static Web App**.
   - Plan type: **Free**.
   - Sign in to GitHub, pick the repo + branch (`main`).
   - **Build presets: Custom.** App location: `/`. Api location: *(blank)*.
     Output location: *(blank)* — there is no build step.
   - Create. Azure adds a GitHub Action that deploys on every push; first deploy
     takes ~1–2 min. You get a URL like `https://<name>.azurestaticapps.net`.
3. (Optional) Add a custom domain + free managed certificate under the SWA's
   *Custom domains* blade.

## Option B — no GitHub (deploy straight from this folder)

Use the SWA CLI with a deployment token:

1. Create the Static Web App once (Portal, or CLI):
   ```bash
   az staticwebapp create -n personal-inventory -g <resource-group> -l westeurope
   ```
2. Get its deployment token: Portal → the SWA → *Manage deployment token* (or
   `az staticwebapp secrets list -n personal-inventory -g <rg>`).
3. Deploy the current folder:
   ```bash
   npm i -g @azure/static-web-apps-cli
   swa deploy . --env production --deployment-token <TOKEN>
   ```
   Re-run `swa deploy` any time to publish changes.

## After it's live

- Open the URL on a phone and a laptop — every page should load and score with no
  network calls (check DevTools → Network: only same-origin static files).
- The "Save my result" button downloads a JSON file. Until Graph auto-save is wired
  (see REVIEW.md), students upload that file to their own OneDrive/SharePoint folder,
  and the Viewer reads those files back via its file picker.

## Tightening later (optional)

The config keeps headers minimal so the inline module scripts on each page work.
If you later want a Content-Security-Policy, add it in `staticwebapp.config.json`
with per-script hashes (the pages use small inline `<script type="module">` blocks),
or move those inline blocks to external `.js` files first.
