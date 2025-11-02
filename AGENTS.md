# Repository Guidelines

## Project Structure & Module Organization
The slideshow logic lives in `src/main.ts` and is bundled to `build/app.js` (generated). Supporting HTML/CSS remain at the repo root (`index.html`, `css/`). Runtime worker assets are staged into `build/pdf.worker.mjs` and `build/cmaps/`, and the controller stylesheet is copied to `build/css/vendor-pdf-slide.css`; the TypeScript bundle lives in `build/app.js`. All generated artifacts should not be edited manually. All generated artifacts are recreated by the build step and should not be hand-edited. Legacy Mocha fixtures remain under `test/` but no automated specs currently run.

## Build, Test, and Development Commands
- `npm install` – install all runtime and dev dependencies.
- `npm run build` – esbuild the bundle and copy pdf.js worker and cmaps into `build/`.
- `npm run watch` – esbuild in watch mode for iterative development.
- `npm run start` – run the full build and launch `static-server` (defaults to port 9080).
- `npm test` – placeholder (prints a notice); update if formal tests are added.

## Coding Style & Naming Conventions
Author TypeScript in ES2020 style with two-space indentation, single quotes, and `camelCase` identifiers. Keep modules cohesive (e.g., navigation helpers in `main.ts`). Prefer modern browser APIs (`URLSearchParams`, `async/await`) and avoid introducing new CommonJS `require` calls—imports should remain ESM-friendly so esbuild can tree-shake.

## Testing Guidelines
No automated tests are configured. When contributing, validate behaviour manually: `npm run build`, open `index.html` (via `npm run start`), confirm navigation, resize handling, and swipe gestures still function, and verify the URL hash/page indicator update correctly. If you add automated specs, place them under `test/` and wire a real `npm test` command before requiring others to run it.

## Commit & Pull Request Guidelines
Use imperative, present-tense commit subjects (e.g., `Add swipe navigation debounce`). Each change-set should include regenerated build artifacts by running `npm run build`. Pull requests should describe the change, detail manual verification steps, and call out any asset or dependency updates. Reference related issues with `Fixes #123` and attach before/after screenshots or clips when UX is affected.

## Configuration Tips
`index.html` relies on an import map that points to `node_modules/pdfjs-dist/...`; keep those paths in sync with `scripts/copy-assets.js` (which stages the worker, controller CSS, and CMap assets). When upgrading `@zonuexe/pdf.js-controller` or `pdfjs-dist`, verify the copy script succeeds and that GitHub Pages serves the referenced modules. For third-party scripts such as `fingers.js`, continue loading the distributed UMD build before `build/app.js` to expose the expected globals.

## Speaker View Specification

### Current Behaviour
- The `Speaker` control opens `speaker.html` in a popup with query params `slide`, `speaker=1`, and a handshake token that authenticates the child window.
- The speaker window waits until its required DOM nodes are present before posting `speaker-ready`. The host replies with `speaker-ack`, emits periodic `speaker-ping`, and pushes `speaker-navigation-update` messages containing current/next page numbers, total page count, and the slide URL.
- The speaker view loads the PDF on its own via PDF.js and renders current/next previews locally, honouring `window.devicePixelRatio` so high-DPI displays remain crisp. Rendering relies on the default `intent: 'display'`, and worker/CMap assets are resolved with the same relative paths used by the main viewer.
- A clock and channel indicator update continuously. The child sends `speaker-pong`/`speaker-log` telemetry back to the host, and forwards navigation key presses as `speaker-keydown` so the main window can reuse its existing navigation handlers.
- The host now acts as a thin controller: it no longer draws into the popup canvas, but simply propagates navigation state and reacts to handshake/heartbeat messages.

### Desired Behaviour
- Speaker popup should remain open reliably once launched, with graceful handling if popups are blocked or if the host closes/unloads.
- Both windows should stay in sync on page navigation, keyboard shortcuts, swipe gestures, and URL hash updates, including edge cases (first/last slide).
- Preview canvases should render text crisply with the same fonts as the main viewer, including CMap-backed glyphs and retina scaling.
- The channel indicator should confirm connection, surface errors (e.g., lost communication, missing assets), and recover automatically when possible.
- Clock and page labels should update in real time; if rendering fails, fallbacks should show clear status (e.g., “loading…”, “next: end”).
- Future enhancements should consider presenter notes, timers, or remote-control integrations without breaking existing workflows.
