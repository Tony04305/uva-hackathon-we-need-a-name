# We Need a Name

A modular learning website with separate Differentiation and Economic shocks practice pages. Each module keeps its own level, question, and streak; both grow plants for one collection and contribute to the same leaderboard.

## Hackathon deliverables

This repository includes the application source, API worker, question banks, tests, deployment bundles, presentation artwork, and demo assets created for the hackathon.

- [Team 11 concept video](artifacts/ai-demo/Team11_concept_video.mp4): the 58-second UVA AI demo.
- [Application demo](artifacts/demo/We-Need-a-Name-Demo-57s.mp4): the 57-second overview, with [subtitles](artifacts/demo/We-Need-a-Name-Demo.srt).
- [Opening slide](artifacts/presentation/opening-slide-clean-logo.png).
- [Team credits](TEAM.md).

The video-production scripts and timeline files are historical production records. They reference local tools, paths, and source recordings and require adaptation to run on another computer; the finished videos are included above. Local dependencies, credentials, runtime databases, temporary files, unedited screen recordings and their review captures, and the private team contact PDF are excluded from the public repository.

## Pages

- `/`: We Need a Name module home.
- `/modules/differentiation`: dedicated differentiation practice with a math notation editor.
- `/modules/economics`: qualitative scenarios about supply, demand, trade, exchange rates, policy, and stock valuation, with typed or dictated explanations graded by UVA AI.
- A floating UVA AI helper knows the current question in both modules. It offers contextual hints and concepts before submission, then a full walkthrough after submission or explicit “I don’t know”. Sending a chat message resets the current streak to 0 / 3.
- Each randomized plant grows from seed (0 correct) to sprout (1), sapling (2), and its mature form (3). Incorrect answers and timeouts return it to the seed stage.
- The practice page shows the current level out of seven, its difficulty, and whether it is timed. Level maps and step-by-step dashboard strips are omitted.
- `/collection`: thirty collectible fantasy plants; undiscovered species appear as mystery cards.
- `/leaderboard`: a shared ranking by collection points, then highest level, then correct answers. Equal scores and tie-breakers share a rank.
- First-time visitors choose a name and receive a random four-digit tag. No email, password, or account signup is needed.
- Existing WNAM and Deriva progress migrate automatically without losing the current level. The internal storage key stays stable across the rename.

## Run

Use Node.js 20.19+ or 22.12+ and pnpm.

```sh
pnpm install
pnpm build
pnpm dev:full
```

The complete app runs at `http://localhost:8788` with a local D1 database, separate from production. For frontend development with live updates, keep `pnpm dev:full` running and start `pnpm dev` in a second terminal, then open `http://localhost:5173`. Vite forwards `/api` to the local server on port 8788, so both servers must be running for nickname creation, leaderboard updates, and the tutor. Rebuild and restart the full app server after worker changes. `pnpm build` creates the site plus a bundled Pages API worker in `dist/`. `pnpm test` checks answer validation, question derivatives, progression, and the guest API against SQLite (Node 22.13+ for the API tests).

## Deployment

- Cloudflare Pages project: `wnam`.
- Live site: https://wnam.pages.dev
- Deployed and verified on October 1, 2026: guest onboarding, shared leaderboard, AI-assisted hints, explicit solution reveal, next-question chat reset, the seven-level economics module with 28 scenarios, the larger math keyboard button, and the shared floating helper with streak reset. The latest release adds twenty plants for thirty total, removes the requested home/collection/leaderboard taglines, and names both helpers “UVA AI”. All 223 tests pass. The production collection, home page, shared rankings, and both helper labels were verified after deployment. Exotic rewards remain a 5% chance at level seven only; existing collections are preserved.
- The compact, icon-only keyboard control was deployed and verified on October 1, 2026. Its visible label and box are removed; opening the full keyboard was checked on the live site. The production build and desktop/mobile layout checks passed.
- Direct-upload bundle: `artifacts/wnam-deploy.zip` (production files from `dist/`, with `index.html` at the archive root). Rebuild and recreate the ZIP before uploading updates to the existing Pages project.
- Cloudflare Pages' default SPA fallback serves both practice routes; direct refreshes were verified on the deployed site.
- Production D1 binding: `LEADERBOARD_DB` → `wnam-leaderboard` in Pages Settings → Bindings. The database and binding are configured. `wrangler.jsonc` records the database ID. The worker initializes its schema automatically on first API use. Its legacy unique-plant counter remains capped at ten for compatibility; full collection totals and points come from species discovery rows, supporting all thirty plants without a table rebuild. Redeploy after binding changes.
- Workers AI binding: `AI`, configured in the Pages production dashboard. Contextual hint selection, generated walkthroughs, and economics grading call `@cf/meta/llama-3.1-8b-instruct-fp8` through that binding; no API key is shipped to the browser. See the [current model](https://developers.cloudflare.com/workers-ai/models/llama-3.1-8b-instruct-fp8/), [Cloudflare AI bindings](https://developers.cloudflare.com/workers-ai/configuration/bindings/), and [JSON mode](https://developers.cloudflare.com/workers-ai/features/json-mode/).
- The ZIP includes `_worker.js` and `_routes.json`; only `/api/*` requests invoke the worker. Do not upload a frontend-only build: onboarding and shared rankings need the API.

## Rules

- Levels: easy, easy timed, medium, medium timed, hard, hard timed, extreme.
- Three consecutive correct answers unlock the next level. A wrong answer or timeout resets the streak, preserving the current level.
- Timed levels allow 120 seconds per question. Progress, answers, and absolute timer deadlines persist on the current device using localStorage.
- An incomplete or unreadable expression does not count as an incorrect answer. The compact keyboard icon opens the full notation keyboard on desktop and mobile; its accessible label identifies it for screen readers.
- There are 46 questions, each with a derivative, explanation, and relevant domain information. Recently seen questions are avoided until a difficulty bank is exhausted.

## Plant collection

- Thirty original SVG species, each with four growth stages and a Latin-inspired name: eight Common, eight Uncommon, six Rare, four Epic, and four Exotic. The original ten species and their saved IDs are preserved.
- Three consecutive correct answers collect the active plant exactly once. A quiet corner notification links to the collection.
- Both modules contribute to one displayed collection. Their saved gardens stay separate, and specimen counts are added only when rendering the collection or syncing the combined leaderboard score. Repeated species count once toward unique discoveries.
- Advancing a level independently rolls a new plant. Discoveries are not guaranteed and duplicate species remain possible. Wrong answers and timeouts restart the same plant.
- Five rarity gates: Common at level 1, Uncommon at 2, Rare at 3, Epic at 5, and Exotic only at 7. Level 7 odds are 10% Common, 20% Uncommon, 40% Rare, 25% Epic, and 5% Exotic. The 5% Exotic probability is shared by the four Exotic species, chosen uniformly within that tier. A successful three-answer streak completes the plant; finishing level 7 does not guarantee an Exotic.
- Each distinct species earns collection points once across both modules: Common 1, Uncommon 3, Rare 10, Epic 30, Exotic 100. Repeats increase specimen counts but do not add collection points. Restarting practice preserves the collection. Both practice and collection save together on this device. Existing discoveries are preserved; ineligible pending plants are rerolled when restoring an older save.
- The logo uses a simple black tile with a white botanical mark, inspired by the restrained layout of the UvA identity. It is an original mark for this project.

## Shared AI helper

- Before submission, Workers AI chooses a relevant reviewed hint for the current question and the student's request. There are three hints per question (138 math and 84 economics); free-form model answers cannot enter the pre-submission response. Quick actions offer a hint, a concept explanation, or explicit surrender for a walkthrough.
- After submission or surrender, Workers AI generates three to five teaching steps grounded in the stored question and reviewed solution. Submitted work is included so the model can address a misconception. The final derivative or economics conclusion always comes from the checked question bank. Returned steps are validated and escaped; they remain AI-generated explanations, not independently verified proofs.
- If AI is unavailable, reviewed hints and walkthroughs remain usable and are labeled accordingly. Economics grading requires AI and leaves the answer and streak intact if it cannot grade. Local `pnpm dev:full` has no remote model; `pnpm dev:ai` enables Cloudflare AI for authenticated development and uses the account’s AI allowance. Rebuild and restart Wrangler when changing the worker.
- Hover over the UVA AI pill on desktop, or click/tap it, to open a compact nonmodal chat. Escape or the close button dismisses it. Enter sends; Shift+Enter adds a new line.
- The chat warns that sending a message resets the active module’s streak to 0 / 3. Opening the chat, blank messages, and duplicate sends while busy do not reset it. Questions, typed answers, timer deadlines, levels, earned plants, and completed level-ups are preserved; the reset survives reloading.
- Explicitly giving up resets the streak and unlocks the walkthrough without awarding score or a plant. It keeps the level, ends that question, and persists across reload. Timeouts reset the streak but do not reveal the answer automatically. Quoted, hypothetical, or negated surrender phrases do not unlock solutions.
- Chat history is kept only in memory for the current question; a new question starts fresh. Model requests include the current message, relevant question context, and submitted answer when reviewing. The app does not add the guest name or saved profile to model requests, and conversation text is not stored in D1.
- Tutor and grading requests share a limit of 10 AI requests per guest per minute in D1. Like the practice engine, the submission/review gate is a browser UX rule, not an examination security boundary.

## Economic shocks

The economics module contains 28 original scenarios across seven untimed levels. Each asks for two qualitative predictions and an explanation in the student's own words. Students type into a chat-style box or dictate an editable draft, then explicitly submit it to UVA AI.

AI grades three criteria out of two points each: identifying the shock, explaining the causal chain, and using the assumptions. Feedback shows the score out of six, criterion feedback, and a concrete improvement. A correct scenario requires both predictions to be correct and a reasoning grade of at least 5/6 with no zero-scored criterion. Three correct scenarios in a row collect a plant and advance the level. Incomplete answers and failed AI requests do not consume an attempt or change the streak. Giving up unlocks the walkthrough without awarding credit.

Voice input uses the browser's `SpeechRecognition`/`webkitSpeechRecognition` API and microphone permission. Availability and processing depend on the browser and its speech service; voice may require a network connection. Unsupported browsers, denied permission, or recognition errors leave typing available. Only the editable transcript is sent to the grading endpoint after submission; the app does not store audio. Voice stops on navigation or submission, and never submits an answer automatically.

| Level | Context | New moving parts |
| --- | --- | --- |
| 1 | Closed economy | One demand shock, with other conditions fixed |
| 2 | Closed economy | Production costs and supply shocks |
| 3 | Closed economy | Expected profits and stock discount rates |
| 4 | Open economy | International trade, with a fixed exchange rate |
| 5 | Open economy | Currency movements, imported costs, and export demand |
| 6 | Open economy | Policy responses and multiple transmission channels |
| 7 | Interacting shocks | Competing effects and outcomes that cannot be determined |

Each question states the horizon and assumptions, offers three reviewed hints, and reveals outcome-specific feedback and sources after submission or explicit giving up. Stock questions distinguish expected cash flows from discount rates and risk, rather than treating a macro shock as a guaranteed real-world price forecast. Both modules use the same floating UVA AI chat for the active question. AI grading is formative study feedback and may be imperfect; expected outcomes are checked separately against the scenario bank.

Economics progress is stored separately under `wnam-economics-v1`. Existing mathematics saves remain under `wnam-differentiation-v1`. Restarting either module preserves its lifetime totals and collected plants, without resetting the other module.

## Implementation

Vanilla JavaScript and Vite, MathLive for accessible mathematical editing, and Cortex Compute Engine for parsing and symbolic operations. The checker also compares numerical samples when symbolic equivalence is inconclusive; this practical fallback is not a mathematical proof and is intended for practice rather than secure examinations.

Question progress and plant collection are local to this browser and device. Public nickname, tag, discovered species IDs, and lifetime leaderboard counters are stored in Cloudflare D1. The server derives collection points from its checked plant catalog; supplied point totals are ignored. Existing collections acquire points on their next sync with the updated site. Guest identity uses a random HttpOnly, Secure, SameSite cookie; only its hash is stored in the database. Clearing the cookie or switching browsers creates a new guest identity; there is no cross-device account recovery. Restarting practice preserves the collection and lifetime score.

Scores are client-reported, validated for reasonable bounds, and updated monotonically to prevent stale browser tabs lowering them. This is a casual hackathon leaderboard, not a cheat-proof competition. Names are validated and escaped. The API rejects cross-origin writes and provides best-effort per-isolate signup throttling. Google Fonts are optional; the layout falls back to system fonts when unavailable.
