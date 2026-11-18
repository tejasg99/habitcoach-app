# habitcoach-app: AI Habit Coach mobile client (Expo / React Native)

You are working in the frontend repo (GitHub: habitcoach-app). On my machine this folder is `Habit-coach/frontend/`. The sibling `../backend/` is a separate repo (GitHub: ai-habit-coach).

## Sources of truth

- `docs/FRONTEND_BRIEF.md`: behaviour, flows, error handling, milestones, "Do not" list. Its **Implementation notes** section (end of file) records the current folder structure, package decisions and milestone status. Read that section first in every session.
- `docs/DESIGN.md`: all visual design. (The brief calls it `UI_DESIGN.md`; it is the same document.)
- `api/openapi.json`: request and response shapes. Never edit it by hand. I replace it when the backend changes.
- Precedence: the design doc wins on visuals and UX; the brief and the contract win on API behaviour. Flag any other conflict.
- Tabs are named Today, Plan, Progress, Settings (design doc). The Plan tab holds the Week view from the brief.

## Hard boundaries

- Work ONLY inside this folder. Never edit anything outside it.
- `../backend` is read-only context for verifying behaviour. Never read, print or copy its `.env` or any secret. If the backend seems wrong or missing something, add an entry to `docs/BACKEND_REQUESTS.md` (what, why, suggested change) and continue with a workaround, or stop if blocked.
- Do NOT commit, push, create branches, stash or reset. I review `git diff` and commit myself. Read-only git commands (status, diff, log) are fine. Keep diffs focused: no unrelated reformatting or renames.
- Do NOT run PowerShell commands or `.ps1` scripts. Use `npm`, `npx`, `node` and `git` only, one command per call. If something needs automation, write it as a Node script.
- Do not rename this folder or restructure the project without asking. Keep the scaffold's choices: Expo SDK 58, Expo Router, TypeScript 6, React Compiler, typed routes. Do not change the Expo SDK.
- Install Expo-managed packages with `npx expo install`. Never use `--force` or `--legacy-peer-deps` without asking.
- Never commit or print secrets. Keep `.env.example` current. Never invent IDs, URLs, credentials, bundle identifiers or EAS values: ask me.
- Things you can't do (physical-device push testing, EAS login): write the code plus a short manual test procedure and ask me.

## Dependency pre-approvals

Approved without asking: everything in the brief's suggested stack, plus `expo-linear-gradient`, `expo-haptics`, `react-native-svg`, `lucide-react-native`, `@expo-google-fonts/dm-sans`, `react-hook-form`, `zod`, `@hookform/resolvers`, `@react-native-async-storage/async-storage` (ONLY for theme preferences; tokens stay in `expo-secure-store`), `@react-native-community/datetimepicker`, and for charts `victory-native` with `@shopify/react-native-skia` (check compatibility with the installed SDK, React Native and Reanimated versions before installing). Anything else: ask first.

## Decisions already made

- App `name`, `slug` and `scheme` in `app.json`: `ai-habit-coach`.
- Types package: try `openapi-typescript`. Use it only if it installs without any error, generates the schema, and the project type-checks. If it errors (TypeScript 6 compatibility), keep `openapi-typesafe` as the workaround. Never use `--force` or `--legacy-peer-deps` to make it install.
- Chart library: Victory Native XL (Option A).
- Tab bar: Expo Router `Tabs` with a custom floating `tabBar` per the design doc (not `NativeTabs` / `@expo/ui`).
- Onboarding is a step-by-step wizard. Navigation labels and copy follow the design doc.
- `example/` is a gitignored reference scaffold. Do not import from it or modify it.
- Web target is out of scope (leave existing web config alone).

## Code and UI rules

- Strict TypeScript. Do not hand-write request/response types or URLs that exist in the generated client.
- Never compute streaks, progress or "today" on the client. Never send dates or user ids to the API. Never log tokens, passwords or request bodies. No analytics or crash-reporting SDKs.
- Design doc is binding: no borders (no `borderWidth`), theme tokens only (no hex colors in components), no purple or harsh blue, at most one gradient per screen. Check light and dark mode with at least two accents.
- **Comment all style and theme code thoroughly** (`StyleSheet`, tokens, theme files, layout code): explain what each style group does and why, in plain language, because I am reading and learning from it.
- For major UI work (new screens, new component families, visual refactors), use the `unslop` skill if it is available in this environment, before writing the UI. If it is not available, say so once and continue following `docs/DESIGN.md`.
- Tests focus on logic: API client (single-flight refresh, retry-once, error mapping), the startup gate, optimistic log/undo with revert, formatting helpers.

## Workflow

- One milestone per session. Do only the milestone I ask for, then stop.
- Before saying a slice is done: lint, type-check and tests must pass. Run them and show the results. Avoid re-running slow commands needlessly.
- At the end of each milestone, update the **Implementation notes** section at the end of `docs/FRONTEND_BRIEF.md` (folder structure, package decisions, milestone status, deviations). Do not alter the rest of the brief, except to annotate resolved open questions inline.
- Report in this format, then stop:
  1. What was built (short)
  2. Files and dependencies added or changed
  3. How to run and manually verify it (exact steps)
  4. Lint / type-check / test results
  5. Deviations from the brief or design doc, and anything added to `BACKEND_REQUESTS.md`
  6. Questions for me
