# Repository Guidelines

## Project Structure & Module Organization
This repo uses npm workspaces with `frontend/` (React TypeScript) and `backend/` (Express). `frontend/src/` contains components such as `VoiceApp.tsx`, styles in `*.css`, and static assets in `frontend/public/`. Backend servers live in `backend/` with `conversation-server.js` as the default entry, variants for GA and realtime, and shared data in `kalundborg-data.js`. Root HTML demos (`simple-test.html`, `voice-realtime.html`) provide quick integration checks.

## Build, Test, and Development Commands
Run `npm install` in the root to install both workspaces. `npm run dev` concurrently starts the backend on 3001 and the React client on 3000 with relaxed TLS for local certs. Use `npm run dev:backend` or `npm run dev:frontend` when iterating on a single service. Workspace shortcuts follow `npm --workspace <name> run <script>`, e.g. `npm --workspace frontend run build` for a production bundle or `npm --workspace backend start` for a single-server run.

## Coding Style & Naming Conventions
Use 2-space indentation for TypeScript, JSX, and Node files. Name React components in `PascalCase`, hooks and utilities in `camelCase`, and CSS files in `kebab-case`. Prefer functional components, React hooks, and top-level async helpers on the backend. CRA tooling runs ESLint during `npm start` and `npm run build`; resolve warnings before committing.

## Testing Guidelines
Front-end tests rely on Jest via `npm --workspace frontend test`; keep specs next to the component as `*.test.tsx` and avoid snapshot churn. Mock WebSocket and OpenAI calls with lightweight fixtures under `frontend/src/__mocks__/` when needed. Backend tests are not yet scaffolded—add them as `*.test.js` beside the module and wire a `test` script before merging. Document manual QA (e.g., `voice-realtime.html` trial) in the PR when automated coverage is absent.

## Commit & Pull Request Guidelines
Write imperative commit subjects ≤72 chars and include context in a short body when altering APIs or data flows. Reference issues in the footer (`Refs #123`) and squash if the branch contains WIP commits. PRs should explain the user-facing change, list verification steps with commands, and attach UI recordings or console transcripts when behaviour shifts.

## Security & Configuration Tips
Keep secrets in an untracked `.env`; at minimum set `OPENAI_API_KEY` for backend servers. Reset `NODE_TLS_REJECT_UNAUTHORIZED` to `1` outside local development and review CORS or WebSocket origin lists before shipping. Rotate API keys regularly and remove debug logging that could leak transcripts.
