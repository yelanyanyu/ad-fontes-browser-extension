# Repository Guidelines

## Project Structure & Module Organization
This repository is a Vite-based browser extension (Manifest V3).

- `src/popup/`: popup UI (`index.html`, `main.js`, `style.css`) and language strategies in `src/popup/languages/`.
- `src/options/`: options/settings page UI and logic.
- `public/manifest.json`: extension manifest; static icons in `public/icons/`.
- `scripts/`: release/version helpers (`bump-version.js`, `set-version.js`).
- `dist/`: build output to load as unpacked extension.
- `sample/` and `dev-resources/`: sample data and local development resources.

## Build, Test, and Development Commands
- `npm run dev`: start Vite dev server for local iteration.
- `npm run build`: create production build in `dist/`.
- `npm run preview`: preview built output locally.
- `npm run zip`: package `dist/` into `ad-fontes-extension.zip`.
- `npm run bump`: bump extension/package versions via script.
- `npm run set-version -- <version>`: set an explicit version.

Example workflow: `npm run build` then load `dist/` in `chrome://extensions` (Developer mode).

## Coding Style & Naming Conventions
- Language: vanilla JavaScript (ES modules), HTML, CSS.
- Use 2-space indentation and semicolons (match existing files).
- Prefer `const`/`let`; avoid `var`.
- Use descriptive camelCase for variables/functions (`saveSiteConfig`).
- Use PascalCase for class-like modules/strategies (`EnglishStrategy.js`).
- Keep DOM IDs/class names kebab-case in HTML/CSS where practical.

## Testing Guidelines
There is currently no automated test framework configured. Validate changes with:

1. `npm run build` (must succeed with no errors).
2. Manual checks in Chrome/Edge:
   - popup generation/copy flow
   - options page CRUD for prompts
   - storage persistence and site rule behavior

When adding non-trivial logic, include a short manual test checklist in the PR.

## Commit & Pull Request Guidelines
Recent history follows mostly Conventional Commits (`feat:`, `fix:`, `chore:`), sometimes with scope (`fix(popup): ...`). Continue this pattern.

- Commit format: `type(scope): concise summary` (English or Chinese is acceptable; be consistent).
- Keep commits focused and logically grouped.
- PRs should include:
  - change summary and motivation
  - linked issue/task (if available)
  - screenshots/GIFs for popup or options UI changes
  - manual verification steps performed

## Security & Configuration Tips
- Never commit secrets or personal browsing data.
- Keep extension permissions in `public/manifest.json` minimal.
- Ensure manifest version and `package.json` version stay in sync when releasing.
