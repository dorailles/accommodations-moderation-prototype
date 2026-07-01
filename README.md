# Accommodations & Moderation prototype

A standalone InstUI React prototype of the New Quizzes accommodations and moderation
experience: a course-wide accommodations page, a per-quiz Moderate view, and the
accommodation tray that adjusts time and attempts.

## Run locally

```bash
npm install
npm run dev
```

Then open the printed local URL.

## Build

```bash
npm run build      # type-checks (tsc -b) and builds to dist/
npm run preview    # serve the production build locally
```

## Deploy (GitHub Pages)

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the app and
publishes `dist/` to the `gh-pages` branch. In the repo's **Settings → Pages**, set the
source to the `gh-pages` branch (root). The app then serves at
`https://<owner>.github.io/<repo>/`.

## Structure

- `src/App.tsx` — mounts the prototype under the InstUI theme provider with a light/dark toggle.
- `src/designs/accommodations-moderation/` — the prototype: `index.tsx` (UI), `model.ts` (types + seed data), `handoff.ts`.
- `src/registry.ts` — the minimal `PrototypeProps` contract the prototype expects from its host.
