# Frontend brief: AI Habit Coach mobile app (React Native / Expo)

> **Status:** backend finished, tested and deployed (20 API operations). A copy of its contract lives in this repository at `api/openapi.json`. Updated 13 Nov 2026.
> **This file:** `docs/FRONTEND_BRIEF.md` in the `habitcoach-app` repository.

## Starting state and how to begin

- This repository (`habitcoach-app`) starts from a **basic Expo (React Native, native-only) scaffold created by the human** in /frontend folder. The backend is a **separate repository you can see in /backend folder**.
- **Your first task is to audit, not rebuild.** Read the scaffold: Expo SDK version, template, router, TypeScript configuration, existing scripts and folders. Keep its choices. Do not regenerate the project, switch frameworks or change the Expo SDK without asking. Where the suggested stack below differs from what the scaffold uses, adapt to the scaffold and tell the human what differs.
- **The UI design document** is added by the human at `docs/DESIGN.md` before screen work starts. It is the source of truth for visual design, layout, component styling, spacing, motion and copy tone.
  - Precedence: the design document wins on visuals and UX; this brief and the contract win on API behaviour and data rules. If they conflict on anything else, flag it.
  - If a screen is not covered by the design document, **stop and ask**. Do not invent a visual design.
  - Milestones 1 and 2 (foundation and auth plumbing) do not depend on the design document.

### Working agreement

- Work in vertical slices (the milestones below). Make small commits with clear messages. Finish one slice, show the result, and wait for confirmation before starting the next.
- Before reporting a slice as done: lint, type-check and tests must pass.
- Ask before adding a major dependency or restructuring the project.
- Never commit secrets or `.env` files. Keep `.env.example` current.
- Some things you cannot do yourself: test push on a physical device, log in to EAS, or know the EAS project id. For these, write the code plus a short manual test procedure for the human, and ask for the values. **Never invent IDs.**
- If the backend seems wrong or missing something, record it in `docs/BACKEND_REQUESTS.md` (what, why, suggested change). Then continue with a workaround, or stop if you are blocked. Do not try to recreate or modify the backend. You will only work in the frontend folder.

## Product summary

A habit and fitness coach. The user signs up, answers a short onboarding, and the app generates a personalised 7-day plan of workouts, meals and habits. Each day the user ticks items off a checklist, watches their streak and progress, and gets a push reminder at their chosen local time if they have not started the day.

Target platforms: **iOS and Android (native) only** for v1. No web target.

## Repository layout

```
habitcoach-app/
  api/openapi.json         copy of the backend contract (replaced by the human when the API changes)
  docs/
    FRONTEND_BRIEF.md      this file
    DESIGN.md           provided by the human before screen work
    BACKEND_REQUESTS.md    created by you when needed
  ...                      app source and config: whatever the Expo scaffold provides
```

The source folder structure comes from the scaffold. Propose any reorganisation before doing it.

## Contract and tooling

- **Base URL:** from `EXPO_PUBLIC_API_URL`, never hardcoded. Production: `https://ai-habit-coach-6vmk.onrender.com`. Keep `.env.example` with the variable name and no secret values.
- **`api/openapi.json` is the source of truth for request and response shapes.** Never edit it by hand. The backend has a test that fails whenever its contract changes, so the human will tell you when to replace this copy.
- **Typed client:** generate types from the contract instead of writing them by hand. Add an npm script such as `api:types` that runs `openapi-typescript api/openapi.json -o src/api/schema.d.ts`, and use the `openapi-fetch` runtime (check each tool's current docs; CLI options change between versions). Commit the generated file. After the contract is replaced, re-run the script and let the TypeScript errors show what needs adapting.
- The live service also serves the same document at `<base>/openapi.json`. A script that downloads it is acceptable, but remember the server may be asleep, so allow a long timeout.
- **Local development:** the human runs the backend locally from its own repository when needed. Otherwise point `EXPO_PUBLIC_API_URL` at the deployed API. Android emulator reaching a backend on the same computer: `http://10.0.2.2:8000`. Physical phone: `http://<computer-LAN-IP>:8000`, on the same Wi-Fi.

## Suggested stack (adapt to the scaffold; explain any change)

- Expo (managed workflow) with **development builds** (needed for push), TypeScript, Expo Router if the scaffold uses it
- **TanStack Query** for server state (caching, refetch on focus, invalidation after mutations)
- `openapi-typescript` + `openapi-fetch` for the typed client
- `expo-secure-store` (tokens), `expo-notifications` and `expo-device` (push)
- A form library with schema validation for onboarding and settings
- One lightweight charting library for the progress chart (follow the design document if it specifies a style)
- ESLint, TypeScript strict mode, and a unit test runner with React Native Testing Library

## Conventions

- Everything is JSON **except login**, which is form-encoded (`application/x-www-form-urlencoded`) with fields `username` (put the **email** here) and `password`.
- Protected endpoints need `Authorization: Bearer <access_token>`.
- **Never send a user id or a date.** The server derives the user from the token and decides "today" from the user's saved timezone. Do not compute streaks, progress or "today" on the client.
- `timezone` is an IANA name: use the device's, `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- `reminder_time` is local wall-clock time as `"HH:MM:SS"`.
- `day_of_week` / `weekday`: 0 = Monday ... 6 = Sunday.
- Dates are ISO strings (`"2026-11-13"`); timestamps are ISO 8601 in UTC.
- Emails are lowercased by the server; equipment names are lowercased, de-duplicated and sorted by the server (display what comes back).
- Password: 8 to 128 characters. `display_name`: at most 100 characters; blank becomes `null`.

## API inventory (20 operations)

Operation IDs below are the expected names in the contract (they become the generated client's method names). The contract file is authoritative.

| Operation | Method and path | Auth | Notes |
|---|---|---|---|
| `health_check` | `GET /health` | No | Liveness. Use it as the warm-up ping. |
| `health_db` | `GET /health/db` | No | Database check. Do not poll. |
| `signup` | `POST /auth/signup` | No | 201 user. 409 email exists. 422 invalid. |
| `login` | `POST /auth/login` | No | Form-encoded. 200 tokens. 401 wrong credentials. 429 throttled. |
| `refresh_tokens` | `POST /auth/refresh` | No | Body `{refresh_token}`. 200 new token pair. 401 invalid. |
| `read_me` | `GET /users/me` | Yes | Current user. |
| `update_me` | `PATCH /users/me` | Yes | Only `display_name` is allowed (other fields give 422). |
| `delete_me` | `DELETE /users/me` | Yes | 204. Deletes all of the user's data. |
| `save_my_profile` | `PUT /onboarding/me` | Yes | Full profile, create or replace. |
| `read_my_profile` | `GET /onboarding/me` | Yes | 404 = onboarding not completed. |
| `update_my_profile` | `PATCH /onboarding/me` | Yes | Partial update. 404 if no profile yet. |
| `generate_weekly_plan` | `POST /plan/generate` | Yes | Slow. 201 plan. 409, 429, 502, 503. |
| `get_today_plan` | `GET /plan/today` | Yes | 404 = no active plan. |
| `get_week_plan` | `GET /plan/week` | Yes | 404 = no active plan. |
| `create_log` | `POST /logs` | Yes | 201 created, **200 already logged (also success)**. 404, 409. |
| `remove_log` | `DELETE /logs/{log_id}` | Yes | 204. 404, 409 (only today's can be undone). |
| `read_progress` | `GET /progress?days=N` | Yes | `days` is any integer 1 to 90, default 30 (otherwise 422). |
| `read_streak` | `GET /progress/streak` | Yes | Streak numbers only. |
| `register_push_token` | `POST /notifications/register-token` | Yes | 204. Idempotent. 422 if malformed. |
| `unregister_push_token` | `POST /notifications/unregister-token` | Yes | 204. Idempotent. |

## Response shapes (cheat sheet; the contract is authoritative)

```
TokenPair      { access_token, refresh_token, token_type: "bearer" }
User           { id, email, display_name | null, created_at }
Profile        { goal, fitness_level, dietary_pref, equipment: string[], timezone,
                 reminder_time: "HH:MM:SS", reminders_enabled: boolean,
                 onboarding_complete: boolean, updated_at }
Plan           { id, status: "active" | "archived", generated_at, items: PlanItem[] }
PlanItem       { id, day_of_week, position, type: "workout" | "meal" | "habit",
                 title, description, target_metric | null }
Today          { plan_id, local_date, weekday, items: (PlanItem & { completed: boolean, log_id | null })[] }
Log            { id, plan_item_id, log_date, completed_at, value | null }
Progress       { start_date, end_date, total_completed, active_days,
                 days: { day, planned, completed, completion_rate | null }[],
                 streak: Streak }
Streak         { current_streak, longest_streak, last_completed_date | null, completed_today }
```

Request bodies:
- **Signup:** `{ email, password, display_name? }`
- **Onboarding `PUT`:** requires `goal`, `fitness_level`, `dietary_pref`. Optional with defaults: `equipment` (`[]`), `timezone` (`"UTC"`), `reminder_time` (`"20:00:00"`), `reminders_enabled` (`true`).
- **Onboarding `PATCH`:** any subset of the same fields.
- **Log:** `{ plan_item_id, value? }` where `value` is an optional number from 0 to 100000 (for example weight or reps). No other fields are accepted.
- **Enums:**
  - `goal`: `lose_weight | build_muscle | stay_active | improve_endurance`
  - `fitness_level`: `beginner | intermediate | advanced`
  - `dietary_pref`: `non_vegetarian | eggetarian | vegetarian | vegan`
  - `equipment`: up to 20 free-text items; letters, numbers, spaces and hyphens only (otherwise 422)

## Behaviours that shape the UX

**Streak states.** A day counts if at least one item was logged. The streak stays alive until a whole day is missed.
- `current_streak == 0`: no streak.
- `current_streak > 0` and `completed_today`: safe.
- `current_streak > 0` and **not** `completed_today`: **at risk**. Prompt the user to log one item today.
- `longest_streak` is the "best streak".

**Today.** `GET /plan/today` returns the items scheduled for today's weekday in the user's saved timezone. Every plan day has at least one item, and one day per week is a rest or light day.

**Logging is idempotent.** Retries and double taps are safe (201 or 200 both mean "it is logged"). Only **today's** completions can be undone, and undo needs the `log_id` from the log response or from `/plan/today`. Use optimistic UI: mark the item done immediately, replace the temporary state when the response arrives, and revert on error. Disable undo until the log request has resolved.

**Regenerating a plan.** `POST /plan/generate` archives the current plan and creates a new one. Past progress and streaks are kept, but items already checked today on the old plan do **not** carry over to the new plan's Today list. Show a confirmation before regenerating. There is a limit of **5 generations per rolling 24 hours**, and the API does not report the remaining count, so show the limit message only when a 429 arrives.

**Progress.** For each day, `planned` comes from the plan that was active that day, so history is never rewritten. `completion_rate` is capped at 1.0 and is `null` when nothing was planned. Draw `null` days as empty, not 0%. Today is partial until the user finishes, so treat it as "in progress".

**PATCH semantics.**
- `PATCH /onboarding/me`: a `null` value means "no change" (it is ignored). To change a field, send a real value.
- `PATCH /users/me`: `display_name: null` or a blank string **clears** the name.
- `PUT /onboarding/me` replaces the whole profile: omitted optional fields return to defaults, **including turning reminders back on**. Use `PATCH` for single-field changes (reminders switch, reminder time, timezone).

**Timezone drives "today".** If the device timezone differs from `profile.timezone` when the app opens (the user travelled), offer a one-time prompt to update it with `PATCH /onboarding/me { timezone }`. Changing it shifts which day counts as "today".

**Reminders (server-driven).** The server sends a reminder when all of these hold: reminders are enabled, the user has a registered device, a plan exists for today, and **nothing has been logged today**. The send window is the 2 hours after `reminder_time` (the user's local time). Delivery runs on a scheduled job every ~15 minutes and can be late, so describe it as "around 7:30 pm", never "at". The app does not schedule local notifications. The notification's `data` is `{ "screen": "today" }`. Reminder text mentions the streak when it is 2 days or more.

**Switching reminders on or off** is the server flag `reminders_enabled`, separate from the OS notification permission. If the OS permission is denied, explain how to enable it in system settings.

**Tokens and logout.** Access tokens last about 30 minutes and refresh tokens about 30 days. Refreshing returns a new pair, and the old refresh token stays valid until it expires (there is no server-side revocation). So **logout is client-side**: unregister the push token, then delete the stored tokens. After `DELETE /users/me`, all existing tokens stop working (401), so clear storage immediately.

## App flow and navigation

**Startup decision tree** (a single gate component that runs once and on login):
1. Fire-and-forget `GET /health` (warms a sleeping server while the user sees the splash or login).
2. No stored tokens: show the auth stack (welcome, login, signup).
3. `GET /users/me` through the client with refresh handling. If refresh also fails: auth stack.
4. `GET /onboarding/me`: 404 means the onboarding flow.
5. `GET /plan/today`: 404 means the Today tab shows a "Generate my plan" empty state.
6. In the background: register the push token (if permission is granted) and run the timezone check.

**Main navigation:** four tabs (**Today** as home, **Week**, **Progress**, **Settings**) unless the design document says otherwise.

## Screens

Every screen needs explicit loading, empty and error states. Visual design comes from `docs/UI_DESIGN.md`.

| Screen | Calls | Notes |
|---|---|---|
| Sign up / log in | `signup`, `login` | Show field errors from 422. Show the throttle message on 429. |
| Onboarding | `save_my_profile` | Goal, level, diet, equipment, timezone (prefilled from device), reminder time, reminders on/off. |
| Generate plan | `generate_weekly_plan` | Long-running: progress state, disabled button, wellness disclaimer (below). |
| Today | `get_today_plan`, `create_log`, `remove_log` | Checklist grouped by type. Optimistic toggle. Streak banner with the at-risk state. |
| Week | `get_week_plan` | Group `items` by `day_of_week`, ordered by `position`. |
| Progress | `read_progress` | Range selector (7, 30, 90 days), planned vs completed per day, totals, streak and best streak. |
| Settings | `update_my_profile`, `update_me`, `delete_me` | Reminder time and switch, timezone, display name, logout, delete account (confirmation required). |

## Authentication flow

1. `POST /auth/signup` (JSON), then `POST /auth/login` (form). The response contains `access_token` and `refresh_token`.
2. Store both in `expo-secure-store` (never AsyncStorage, never logs).
3. When a protected call returns **401**: call `POST /auth/refresh` with `{ "refresh_token": ... }`, store the new pair, and retry the original request **once**. If several requests fail at the same moment, make **one** shared refresh call (single-flight), not one per request. If refresh itself returns 401, clear storage and go to the login screen.
4. Logout and account deletion: see "Tokens and logout" above.

## Error handling

| Status | Meaning | What the UI should do |
|---|---|---|
| 401 | Token missing, expired or invalid | Refresh flow above, otherwise log in again |
| 401 on `/auth/login` | Wrong email or password | Show "Incorrect email or password" (never say which) |
| 404 on `/onboarding/me` | Onboarding not completed | Go to onboarding |
| 404 on `/plan/today` or `/plan/week` | No active plan | Show the "Generate my plan" action |
| 404 on `/logs` | Plan item not found (stale screen) | Refresh the Today screen |
| 409 on `POST /plan/generate` | Onboarding incomplete, or another generation just finished | Route to onboarding, or retry once after a moment |
| 409 on `POST /logs` | Item is not scheduled for today | Refresh the Today screen |
| 409 on `DELETE /logs/{id}` | Only today's completions can be undone | Show a short message |
| 409 on `/auth/signup` | Email already registered | Offer to log in instead |
| 422 | Validation error. `detail` is a **list** of `{loc, msg, type}` (not a string) | Show messages next to the matching fields |
| 429 on `/plan/generate` | Daily generation limit reached | Tell the user to try tomorrow |
| 429 on `/auth/login` | Too many failed attempts for this email (5 in 15 minutes). `Retry-After` is in seconds. | Show "Too many attempts, try again later" |
| 502 | The generator produced no valid plan | Offer a retry button |
| 503 | Generator temporarily busy (`Retry-After` header) | Offer a retry after a short wait |
| Other 5xx / network error / timeout | Unexpected error, offline, or server waking up | Generic retry state. Do not assume the body is JSON. |

Every error body from the API is `{ "detail": "<message>" }`, except 422 (a list) and unexpected 5xx (may be plain text). Show friendly copy, never raw `detail` strings from 5xx.

## Latency and cold starts

- The API is on a free tier that **sleeps when idle**. The first request after a quiet period can take 60 to 90 seconds. Use a 90 s timeout for the first call, and if a request takes longer than about 5 seconds, show "Waking up the server..." instead of an error. The startup warm-up ping reduces how often users see this.
- `POST /plan/generate` calls an LLM and can take up to about a minute. Use a 120 s timeout, show a progress state, and **disable the button while it runs**. Do not auto-retry it on the client (the server already retries internally, and the daily limit is 5).

## Push notifications

- Real push needs a **physical device** and an Expo **development build** (Expo Go does not support remote push on Android from SDK 53; check the current Expo notification docs for the iOS requirements and for obtaining a token with your EAS project id). You cannot verify this yourself: write the code and a manual test procedure, and ask the human for the EAS project id.
- After login, once the user grants permission: get the Expo push token and call `POST /notifications/register-token {"token": "ExponentPushToken[...]"}`. It is idempotent, so call it on every app start. The server prunes dead tokens itself.
- On logout call `POST /notifications/unregister-token` with the same token.
- On notification tap, read `data.screen` and navigate to the Today screen.
- On Android, create a notification channel before requesting the token.

## Diagnostics

Every API response carries an `X-Request-ID` header. Keep the latest one with each failed request, and show it in a "Copy debug info" action on unexpected-error screens and in Settings. The app may also send its own `X-Request-ID` (8 to 64 characters from `A-Z a-z 0-9 _ -`); the server echoes it. Never log tokens, passwords or request bodies.

## Privacy, safety and accessibility

- The generated plan is general wellness information. Show a short disclaimer on the plan screens: "General wellness information, not medical advice."
- No analytics or crash-reporting SDKs that collect personal data in v1 (revisit later, deliberately).
- Minimum touch targets of 44 pt, labels for screen readers, support for system font scaling and light/dark mode where the design document allows, and sufficient colour contrast.

## Testing expectations

Test the logic-heavy parts, not every pixel:
- The API client wrapper: single-flight refresh, retry-once behaviour, and error mapping (the table above).
- The startup gate decision tree.
- Optimistic log and undo, including a failure that reverts the UI.
- Time-independent formatting helpers.

This repository has its own CI (GitHub Actions): lint, type-check and tests on every push and pull request.

## Milestones (vertical slices, each shippable)

1. **Foundation on the scaffold:** audit the scaffold, environment config, `api/openapi.json` plus the typed client script, lint, type-check and test tooling, CI, agreed folder structure. No design document needed.
2. **Auth:** login, signup, secure storage, single-flight refresh, guarded navigation, warm-up ping. No design document needed (use minimal placeholder UI).
3. **Onboarding:** form, device timezone, validation errors. *Design document required from here on.*
4. **Plan:** generation flow with all error states, Week view.
5. **Today:** checklist, optimistic log and undo, streak banner.
6. **Progress:** chart, range selector, empty days.
7. **Settings:** reminders, timezone sync, display name, logout, delete account.
8. **Push:** development build, token lifecycle, tap navigation (physical device, tested by the human).
9. **Polish and release:** empty and loading states, accessibility pass, icon and splash, EAS build.

## Do not

- Do not compute streaks, progress or today's date locally.
- Do not send `log_date`, `user_id` or any date to the API.
- Do not store passwords, and do not log tokens or request bodies that contain credentials.
- Do not poll aggressively. Refresh on screen focus and after user actions (invalidate Today, Progress and Streak after a log or undo).
- Do not hand-write request or response types, or URLs, that exist in the generated client.
- Do not edit `api/openapi.json`, and do not try to recreate or modify the backend.
- Do not invent visual design, IDs or credentials.

## Acceptance checklist

- [ ] The scaffold's structure and Expo SDK were kept (or deviations were agreed with the human)
- [ ] Typed client is generated from `api/openapi.json` and the script is documented in the README
- [ ] Sign up, log in, and restart the app without logging in again
- [ ] Onboarding saves, and the device timezone is sent
- [ ] Generate a plan with a clear loading state; every error status above shows a sensible message
- [ ] Check an item (a repeated tap never errors), undo it, and see the streak and progress update
- [ ] Streak at-risk state appears when nothing is logged today and a streak is active
- [ ] Progress chart renders days with no plan as empty, not 0%
- [ ] With the backend's `ACCESS_TOKEN_EXPIRE_MINUTES=1`, using the app after two minutes silently refreshes and the user notices nothing
- [ ] Cold-start message appears when the server is slow
- [ ] Push token registered after login, removed on logout; tapping a reminder opens Today
- [ ] Reminders can be switched off in Settings, independent of the OS permission
- [ ] Changing the device timezone prompts a one-time update
- [ ] Account deletion asks for confirmation, clears storage and returns to the login screen
- [ ] The wellness disclaimer is visible on the plan screens
- [ ] Every screen matches `docs/UI_DESIGN.md`
- [ ] CI (lint, type-check, tests) is green

## Open questions for the development plan

- Onboarding as one form or a step-by-step wizard (the design document may decide this). **Resolved: step-by-step wizard.**
- Chart library choice. **Resolved: Victory Native XL (`victory-native` + `@shopify/react-native-skia`).** **Changed in M6: custom charts with `react-native-svg`** (Victory Native 43.x needs a Skia package Expo SDK 58 does not bundle).
- Empty-state and error copy tone (the design document may decide this).

## Implementation notes (kept current by the agent)

### Local layout

```
Habit-coach/
  backend/    GitHub repo: ai-habit-coach (read-only context for this work)
  frontend/   GitHub repo: habitcoach-app (this repo; its root is this folder)
```

### Folder structure after Milestone 1

```
api/openapi.json          backend contract (replaced by the human, never edited)
docs/                     FRONTEND_BRIEF.md, DESIGN.md
src/
  api/                    schema.d.ts (generated), client.ts (typed openapi-fetch client, no auth yet)
  app/                    _layout.tsx (imports the env module), index.tsx (blank screen)
  lib/                    env.ts (parseApiUrl + env), storage.ts (SecureStore token helpers), formatting.ts
  __tests__/              env, client and formatting tests
  components/ features/ hooks/ theme/   empty placeholders (.gitkeep) for later milestones
.github/workflows/ci.yml  lint, typecheck, test, API types drift check
.env.example              EXPO_PUBLIC_API_URL only
```

### Folder structure added in Milestone 1b (design system)

```
src/theme/
  tokens.ts           every raw value (hex, sizes, radii, shadows, type scale); only place hex is allowed
  contrast.ts         WCAG contrast maths (used by the contrast test)
  preferences.ts      AsyncStorage load/save + validation of { mode, accent }; resolveMode()
  fonts.ts            useAppFonts(): DM Sans 400/500/600/700 via @expo-google-fonts
  ThemeProvider.tsx   ThemeProvider, useTheme(), useThemedStyles(); StatusBar / Appearance / SystemUI sync
  index.ts            public exports ('@/theme')
src/components/ui/    Text, Screen, Card, HeroCard, Button, Chip, IconButton, Input,
                      ProgressRing, ProgressBar, Skeleton, TabBar (+ useProgressAnimation.ts, index.ts)
src/app/gallery.tsx   DEV-ONLY design gallery (redirects to "/" when __DEV__ is false)
src/__tests__/        contrast.test.ts (WCAG, all modes and accents), theme-preferences.test.ts
```

Usage: `const t = useTheme()` gives resolved tokens (`t.colors`, `t.spacing`, `t.radius`, `t.shadows`, `t.type`), the
user's `modePreference` / `accent`, and setters. `useThemedStyles((t) => ({ ... }))` builds a memoised StyleSheet.
The root layout holds the splash screen until fonts and the saved theme are loaded.

### Folder structure added in Milestone 2 (auth)

```
src/api/
  client.ts           createApiClient({ baseUrl, tokens, onSessionExpired, fetch? }) + the shared `apiClient`
  transport.ts        fetch wrapper: 90 s timeout while the server is cold (no response yet, or none for 10 min),
                      30 s once warm; TimeoutError; marks requests slow after 5 s
  authMiddleware.ts   bearer token, X-Request-ID, single-flight refresh, retry once, session expiry
  errors.ts           ApiError, mapApiError() (the brief's error table), unwrap(operation, call), ERROR_COPY
  status.ts           stores: "server waking" (useServerWaking) and last failed request (getLastFailedRequest)
  events.ts           session-expired signal (middleware -> session store)
src/lib/startup.ts    runStartup(deps): the startup decision tree, pure and injectable
src/lib/debugInfo.ts  formatDebugInfo(): the "Copy debug info" text (request id, method, path, status, time, app version)
src/lib/storage.ts    + hasStoredTokens(), secureTokenStore
src/features/auth/
  api.ts              login() (form-encoded, email in `username`, saves tokens), signup(), formEncode()
  session.ts          session phase store + useSession(), launchSession(), sessionSignedIn(), retrySession(), signOut()
  routeGuards.ts      routeGuards(phase, isDev): which root route group is open in each phase
  forms.ts            zod schemas for login/signup, splitFieldErrors() (422 -> form fields)
  components/         AuthScaffold (login/signup frame), ChecklistPreview (welcome screen card)
src/components/layout/ Notice (danger / neutral message card), EmptyState, TabPlaceholder (+ TAB_BAR_CLEARANCE),
                      WakingToast ("Waking up the server..."), CopyDebugInfo (button, uses expo-clipboard)
src/app/
  _layout.tsx         ThemeProvider, splash, launches the gate, Stack.Protected per session phase, WakingToast
  starting.tsx        gate screen: holding state while checking, error card with Try again / Log out / Copy debug info
  (auth)/             _layout (Stack, initial route welcome), welcome, login, signup
  onboarding.tsx      placeholder (Milestone 3) with Log out (dev builds only)
  (tabs)/             _layout (Tabs + custom floating TabBar), index (Today), plan, progress, settings (placeholders;
                      Settings holds Copy debug info and, in dev builds only, the temporary Log out and gallery link)
src/__tests__/        client (middleware + transport), errors, startup, auth-api, routeGuards, debugInfo
docs/BACKEND_REQUESTS.md
```

How the pieces fit:

- **Calls:** `await unwrap('read_me', apiClient.GET('/users/me'))` returns the data or throws an `ApiError` with
  `kind`, `action` (`retry | login | onboarding | generatePlan | refreshToday | none`), friendly `message`,
  `fieldErrors` (422), `retryAfterSeconds`, `requestId`. Screens never interpret statuses themselves.
- **Refresh:** a 401 from a protected path triggers one shared refresh (a second, middleware-free client calls
  `/auth/refresh`), then the original request is retried once, straight through the transport. Public paths
  (`/auth/*`, `/health*`) never refresh. Refresh 401/422 or a retried 401 -> tokens cleared, `onSessionExpired`.
  Refresh 5xx/offline -> tokens kept, the caller gets the original 401. A late 401 for a request sent before
  another call refreshed is retried with the stored newer token instead of refreshing again.
- **Navigation:** session phases `booting | checking | error | signedOut | onboarding | ready`. The root layout
  enables exactly one route group per phase with `Stack.Protected` (`routeGuards.ts`); the router moves to the one
  open screen when the phase changes. Careful: when the current screen closes, Expo Router picks the first OPEN route
  by its own sort (groups first, then shorter names), not by JSX order. The dev gallery is therefore open only
  together with `(tabs)`; when it was open in every phase it beat `starting` and `onboarding` and swallowed them. The native splash stays up only while SecureStore is read (`booting`).
  **Since M3** every `Stack.Protected` also gets `redirectTo={phaseHref(phase, authEntry)}`, so a closing guard
  goes to a real URL instead of that fallback (see the M3 logout fix below).
- **Startup gate:** at launch, `/health` fire-and-forget, then tokens? -> `/users/me` -> `/onboarding/me` (404 or
  `onboarding_complete: false` -> onboarding) -> `/plan/today` (404 -> `hasPlan: false`, Today shows the
  "Generate my plan" empty state). Network/5xx on the first two -> error screen; the user stays logged in.
  Re-runs (without the warm-up) after login. Background-task hook is empty until M7/M8.

### Folder structure added in Milestone 3 (onboarding)

```
src/features/onboarding/
  labels.ts           THE display labels for goal / fitness_level / dietary_pref, typed Record<EnumFromContract, ...>;
                      GOALS / FITNESS_LEVELS / DIETARY_PREFS derived from them (enumValues); equipment suggestions
  schema.ts           zod onboardingSchema (enums, equipment rules mirrored from the server, HH:MM:SS, timezone),
                      equipmentItemSchema, addEquipmentItem(), defaultOnboardingValues()
  request.ts          toProfileRequest() (form values -> ProfileIn body), PROFILE_FIELD_MAP (422 loc -> form field)
  wizard.ts           ONBOARDING_STEPS (id, question, subtitle, fields), wizardReducer (next/back/goTo, clamped),
                      firstStepWithError()
  components/         ProgressDots, ChoiceList (radio cards), EquipmentStep (chips), ReminderStep (switch, time
                      picker, time zone note), FieldMessage (error line for non-text answers)
src/lib/timezone.ts   deviceTimeZone() (Intl, falls back to "UTC")
src/lib/startup.ts    + continueToTabs(): steps 5-6 of the gate on their own
src/features/auth/session.ts  + onboardingCompleted(): continues the gate after the profile is saved
src/app/onboarding.tsx        the wizard screen (replaces the placeholder)
src/__tests__/        onboarding-schema, onboarding-request, onboarding-wizard (+ continueToTabs in startup)
```

How it fits: one react-hook-form instance holds all answers; the reducer only picks the visible step, so Back
(button or Android back) keeps everything. Continue runs `trigger(step.fields)`. Finish setup sends
`PUT /onboarding/me` with every field (PUT resets omitted fields, so `reminders_enabled: false` is always sent
explicitly). A 422 is split onto fields with `splitFieldErrors(error, PROFILE_FIELD_MAP)` and the wizard jumps to
the first step with an error. Offline / timeout / 5xx show a danger Notice above the button (plus Copy debug info
for 5xx); pressing Finish setup again retries. A slow cold start shows the global waking toast while the button
keeps its spinner. On success `onboardingCompleted()` runs the plan check and flips the phase to `ready`; the
button keeps its spinner until the tabs open.

### Folder structure added in Milestone 4 (plan)

```
src/lib/queryClient.ts        the TanStack Query client (retry off, staleTime 30 s, no focus polling)
src/hooks/useRefetchOnFocus.ts refetch a screen's queries when it regains focus (skips the first focus)
src/api/transport.ts          + long requests: POST /plan/generate gets 120 s and no "waking" signal
src/features/plan/
  queries.ts          planKeys (['plan','today'], ['plan','week']), fetch/use hooks, isNoPlan(), PlanItem types
  generate.ts         THE generation flow, pure: describeGenerateFailure() (error table), canStart(),
                      secondsUntilRetry(), generatingCopy(), createPlanGenerator() (state machine + controller)
  generator.ts        the app's single planGenerator: real API call, cache updates, haptic, session hooks;
                      usePlanGenerator()
  useGenerateFlow.ts  React glue: 1 s tick while running/waiting, button label/disabled, dismiss on blur
  week.ts             itemsForDay(), groupByType(), dayGroups(), GROUP_LABELS, resolveSelectedDay()
  components/         GeneratePlanEmptyState, GenerationStatus (progress card / failure notice), DayChips,
                      DayPlan (groups + item rows), RegenerateSheet (confirmation), WellnessNote
src/features/auth/session.ts  + sessionNeedsOnboarding(), planBecameAvailable(), subscribeSession;
                      the gate's /plan/today goes through the query cache; cache cleared on logout/expiry
src/app/_layout.tsx   + QueryClientProvider
src/app/(tabs)/plan.tsx       the Week view (replaces the placeholder)
src/app/(tabs)/index.tsx      Today: real /plan/today query; 404 -> GeneratePlanEmptyState (checklist is M5)
src/__tests__/        plan-generate, plan-week (+ 120 s generate timeout in client.test.ts)
```

How it fits:

- **One generator for the app.** `planGenerator` is a module store (like the session store), so Today and Plan
  show the same run and two generations can never overlap. States: `idle | running | failed`. `start()` is
  ignored while running and while a retry has to wait. Nothing ever calls `start()` except a button press.
- **Status handling** (`describeGenerateFailure`): 201 -> the returned plan is written into the week cache,
  Today and `['progress']` are invalidated, success haptic. 409 onboarding -> `sessionNeedsOnboarding()`
  (the root layout opens onboarding). 409 "just finished" -> retry allowed after 5 s, only once; a second 409
  offers no retry. 429 -> "try again tomorrow", no retry. 502 -> retry now + Copy debug info. 503 -> retry
  after `Retry-After` seconds (now if missing); the button counts down ("Try again in 24 s"). Timeout and
  network -> retry now. After a 409 "just finished", a timeout or a network error the plan queries are
  refetched, because the server may have created the plan anyway; if it did, the plan replaces the empty state.
- **Failures are cleared when the screen loses focus**, so returning to the tab starts clean (this is also how a
  "no retry" state ends).
- **Today's highlight** comes from `GET /plan/today`'s `weekday` (server-computed in the profile's time
  zone, 0 = Monday, checked against `backend/app/services/plans.py`). The client never works out dates. If
  /plan/today fails, nothing is highlighted and the week opens on Monday.

### Folder structure added in Milestone 5 (Today)

```
src/features/progress/queries.ts  progressKeys (['progress'], ['progress','streak']), fetchStreak, useStreak, Streak
src/features/today/
  checklist.ts        todaySummary() (done/total/allDone from the items), todayGroups(), heroCopy()
  streak.ts           streakState() ('none' | 'safe' | 'atRisk' from the server's fields), streakCopy()
  logging.ts          THE log/undo flow: todayLogMutationOptions() (optimistic TanStack mutation), toggleTodayItem(),
                      isTodayItemBusy(), canUndo(), liveLogApi (POST /logs, DELETE /logs/{log_id})
  useTodayActions.ts  React glue: toggle, busyIds (useMutationState), notice for the toast, haptics
  components/         TodayHero (gradient + ring), StreakBanner, TodayChecklist, TodaySkeleton, TodayToast
src/components/ui/HabitRow.tsx    the design doc's core habit row (28 px check, spring + fade, checkbox a11y)
src/components/ui/Screen.tsx      + optional `refreshControl` (pull to refresh)
src/lib/formatting.ts             + formatTodayDate(weekday, local_date) -> "Sunday, 22 November" (string parsing, no Date)
src/app/(tabs)/index.tsx          the Today screen (replaces the placeholder)
src/__tests__/        today-logging, today-checklist (+ formatTodayDate in formatting.test.ts)
```

How it fits:

- **One tap = one mutation, keyed `['today','log']`.** `onMutate` cancels any Today fetch and patches only that item
  in the `['plan','today']` cache (log: `completed: true, log_id: null`; undo: `completed: false`), keeping the old
  values. `onSuccess` writes the real `log_id`. `onError` restores the old values and shows the mapped message
  (404/409 copy comes from `errors.ts`). `onSettled` invalidates Today and `['progress']` (progress and streak)
  once no other log/undo is in flight, so a refetch never lands in the middle of another item's optimistic state.
- **Busy items ignore taps.** "Busy" is read from TanStack's mutation cache (a mutation is marked pending
  synchronously when it starts), so double taps in one frame send one request. This also keeps undo disabled until
  the log has resolved, and stops a log racing an undo. Other rows stay tappable.
- **Mutations run through `MutationObserver`** (the primitive `useMutation` wraps) inside `toggleTodayItem`, so the
  tests drive the exact production logic with a real QueryClient and a fake API, without rendering.
- **Haptics:** light when an item is checked, success when that check completes the day (decided from the
  optimistic items). Haptics stay on with reduce motion; the row skips its spring and keeps only the fade.
- **Refresh:** on focus (`useRefetchOnFocus`, Today + streak), pull to refresh (own `refreshing` flag so focus
  refetches show no spinner), and after each log/undo. No polling.

### Folder structure added in Milestone 6 (Progress)

```
src/theme/tokens.ts               + dataViz tokens: chart tints (1 / 0.65 / 0.4 / 0.2) and heatmap steps (0.25..1), on `t.dataViz`
src/lib/formatting.ts             + formatShortDate('2026-11-22') -> "22 Nov", formatMonth() -> "November" (string parsing, no Date)
src/features/progress/
  range.ts            PROGRESS_RANGES [7, 30, 90], DEFAULT_PROGRESS_RANGE (7), isProgressRange, toProgressRange, labels
  queries.ts          + progressKeys.range(days) (['progress','range',N]), fetchProgress, useProgress (keepPreviousData)
  chartData.ts        THE response -> chart transform: toChartData() (status noPlan | planned | inProgress, bar ratios
                      on one shared scale), axisLabels(), chartSummary() (screen reader text), heatLevel(),
                      toHeatmapWeeks() (Monday-first calendar rows), weekMonthLabel(), heatmapSummary(),
                      isProgressEmpty(), weekdayOf()
  components/         RangeSelector (chips), ProgressHero (gradient), CompletionChart (react-native-svg bars),
                      StreakHeatmap (View squares), ProgressSkeleton
src/app/(tabs)/progress.tsx       the Progress screen (replaces the placeholder)
src/__tests__/progress-chart.test.ts
```

How it fits:

- **One query per range**, keyed `['progress','range',N]` under the shared `['progress']` prefix, so the existing
  invalidation after log / undo / new plan refreshes every range. Switching range keeps the previous range on
  screen, dimmed to 60%, until the new one arrives (`keepPreviousData` + `isPlaceholderData`); its labels keep
  saying the range the data really belongs to.
- **Today** is the entry whose `day` equals the server's `end_date` (the profile's local today, per
  `backend/app/services/progress.py`; contract gap logged as `BACKEND_REQUESTS.md` #4). It is drawn "in
  progress": done part at 65% tint plus the 4 px accent dot (the Plan tab's today mark) under its bar, and a dot in
  its calendar square.
- **Null days** (`completion_rate: null`) get no bar at all and a neutral calendar square. A planned day with
  nothing done shows its pale planned bar, so "nothing planned" and "0%" never look the same in the chart.
- **Heatmap levels** come from the server's rate: 0 or null -> `surfaceMuted`; then accent at 25 / 50 / 75 / 100%
  for rates up to 0.25 / 0.5 / 0.75 / 1. Missed days are neutral, never red.
- **Refresh:** on focus (`useRefetchOnFocus`), pull to refresh, and via invalidation. No polling.
- **Accessibility:** the chart and the calendar are each one accessible image with a text summary built from
  server values ("... 11 items completed, on 5 active days. 1 day had nothing planned. Today is in progress: 1 of
  4 done."); axis labels and legends are hidden from screen readers because the summary already covers them.

### Folder structure added in Milestone 7 (Settings)

```
src/components/ui/   Sheet (bottom sheet: scrim, grabber, keyboard, busy lock), SegmentedControl
src/features/settings/
  queries.ts          settingsKeys (['me'], ['profile']), fetchMe, fetchProfile, useMe, useProfile
  api.ts              patchProfile(change), patchDisplayName, deleteMe; toProfilePatch / toDisplayNamePatch (the PATCH bodies)
  mutations.ts        profileMutationOptions (optimistic, revert, one at a time), useSaveProfile, useSaveDisplayName,
                      saveErrorMessage
  displayName.ts      displayNameError (signup's 100 character rule)
  timezonePrompt.ts   timezoneOffer, checkTimezone, rememberTimezoneAnswer, parseTimezoneAnswer (pure)
  components/         AppearanceCard, RemindersCard, AccountCard, SupportCard, SettingsRow, TimezoneSheet,
                      TimezonePromptHost, DisplayNameSheet, DeleteAccountSheet
src/features/auth/accountCleanup.ts       runLogout, runDeleteAccount (injected steps); session.ts wires signOut / deleteAccount
src/features/notifications/
  pushToken.ts        unregisterStoredPushToken (M8 only has to call savePushToken after registering)
  permission.ts       readNotificationPermission, useNotificationPermission (read only)
src/hooks/useDeviceTimeZone.ts            the phone's zone, re-read on foreground
src/lib/timezone.ts   + detectDeviceTimeZone (null when unknown), sameTimeZone (old zone names)
src/lib/storage.ts    + push token and time zone answer (SecureStore)
src/api/status.ts     + latest X-Request-ID; debugInfo.ts and CopyDebugInfo.tsx include it
src/app/(tabs)/settings.tsx               the Settings screen (replaces the placeholder)
src/__tests__/        settings-patch, timezone-prompt, account-cleanup
```

How it fits:

- **One control = one PATCH with one field.** `ProfileChange` is a single `{ field, value }`, so a body can never hold
  more. Reminder changes are optimistic and revert only their own field; a time zone change waits for the server and
  then invalidates `['plan']` and `['progress']`. Saves run in series (`scope: 'profile'`).
- **The startup gate's `/users/me` and `/onboarding/me` reads go through the query cache**, so Settings and the time
  zone check reuse them. `onboardingCompleted()` drops the cached profile.
- **Time zone prompt:** `TimezonePromptHost` in the tabs layout checks on mount (launch, login) and on each return to
  the foreground, without extra requests. Accept and dismiss are both remembered as `{ userId, zone }`; only the last
  answer is kept. Settings keeps a "Change time zone" button while the two differ.
- **Logout:** unregister the push token (at most 5 s, then aborted), delete tokens and push token, clear the cache,
  login. **Delete:** `DELETE /users/me`, then tokens, push token, time zone answer and cache, login.
  Both keep the theme. A failed delete changes nothing locally. Storage failures never stop the remaining steps.
- **Refresh after logout:** the auth middleware ignores a refresh that finishes after its refresh token was removed or
  replaced, so it can neither restore a deleted session nor sign out a new one.

### Planned structure (folders are created when a milestone needs them)

```
src/api/        schema.d.ts, client.ts
src/app/        Expo Router routes: (auth)/, (tabs)/, onboarding/
src/components/ ui/, layout/
src/features/   auth, today, plan, progress, settings, notifications
src/theme/      tokens, typography, shadows, ThemeProvider, useTheme
src/lib/        env, storage, formatting, startup (pure, testable code)
src/hooks/
docs/
.github/workflows/ci.yml
```

### Package decisions

- **Types generator: `openapi-typesafe` stays.** `openapi-typescript` was tried first and `npm install` fails with ERESOLVE (it peers on `typescript@^5`, the project is on TypeScript 6). Not forced. `api:types` runs `openapi-typesafe`; its `paths` output type-checks against `openapi-fetch`'s `createClient<paths>` (see `src/api/client.ts` and `src/__tests__/client.test.ts`).
- **Charts:** ~~Victory Native XL~~ **custom charts with `react-native-svg`** (owner's decision in M6). Compatibility
  check on 2026-11-22: `victory-native` 43.x moved from `@shopify/react-native-skia` to the renamed unscoped
  `react-native-skia` (>= 2.15.5), while Expo SDK 58 bundles `@shopify/react-native-skia` 2.14.0, so 43.x would need a
  development build. 42.0.1 (the last release for the scoped package) would fit, but it is the end of that line.
  Nothing was installed.
- **Tabs:** Expo Router `Tabs` with a custom floating `tabBar` (not `NativeTabs` / `@expo/ui`).
- **TypeScript 6**, strict. Expo SDK 58, React Compiler and typed routes kept from the scaffold.
- **Tests:** `jest-expo` + `@testing-library/react-native` v14 with its built-in matchers (registered in `jest.setup.js`). The deprecated `@testing-library/jest-native` was removed.
- **Lint:** `eslint` + `eslint-config-expo` (flat config), run through `expo lint`.
- **CI:** Node 22 (Expo SDK 58 needs Node ^22.13 or newer), `npm ci` on the committed `package-lock.json`.
- **M1b: no new dependencies.** Everything needed was already installed (`@expo-google-fonts/dm-sans`, `expo-font`, `expo-linear-gradient`, `expo-haptics`, `react-native-svg`, `lucide-react-native`, `react-native-reanimated`, AsyncStorage, `expo-system-ui`). `expo-navigation-bar` was NOT added (not pre-approved); the Android navigation bar follows the resolved mode through `Appearance.setColorScheme` (see deviations).
- **Lint guard rails (M1b):** `eslint.config.js` forbids `borderWidth` (and per-side variants) anywhere in `src/`, and raw hex / `rgb()` / `hsl()` string literals outside `src/theme/` and `src/__tests__/`.
- **Jest:** AsyncStorage is mocked globally in `jest.setup.js`.
- **Removal candidates (installed, unused for now):** `@expo/ui`, `expo-glass-effect`, `expo-symbols`.
- **M2: no new dependencies.** Uses the already-installed `openapi-fetch`, `expo-secure-store`, `react-hook-form`,
  `zod`, `@hookform/resolvers`. TanStack Query is not wired yet (nothing needs caching until Milestone 3/4).
- **M2 follow-up: `expo-clipboard`** (approved by the owner, installed with `npx expo install`) for "Copy debug info".
- **M3: no new dependencies.** `@react-native-community/datetimepicker` (already installed, config plugin already
  in `app.json`), `react-hook-form`, `zod`, `@hookform/resolvers`, `expo-haptics`, Reanimated. TanStack Query is
  still not wired (onboarding is a single mutation; Plan and Today in M4/M5 need it).
- **M4: no new dependencies.** TanStack Query (`@tanstack/react-query`, already installed) is now wired with a
  `QueryClientProvider` in the root layout. `expo-haptics`, `lucide-react-native` and RN's `Modal` (for
  the bottom sheet) cover the rest.
- **M5: no new dependencies.** TanStack Query mutations, `expo-haptics`, Reanimated (`useReducedMotion`,
  `withSpring`, `withTiming`), `lucide-react-native`, RN `RefreshControl` and `AccessibilityInfo`.
- **M6: no new dependencies.** Charts use the already-installed `react-native-svg`; the heatmap is plain Views.

- **M7: no new dependencies.** The notification permission is read from `expo-notifications/build/NotificationPermissions`
  (a deep import): the package index also starts push-token listening, which Expo Go on Android does not support. M8
  can switch to the normal import once a development build is used.

### Deviations from the brief

- Design doc is `docs/DESIGN.md` (the brief says `UI_DESIGN.md`).
- Backend is visible locally in `../backend/` (read-only).
- `expo`, `expo-router`, `expo-web-browser` and `@expo/ui` were bumped to the SDK 58 patch versions `expo-doctor` expects.
- The X-Request-ID header was not added in M1; it belongs with the client middleware in Milestone 2.
- `EXPO_PUBLIC_API_URL` must be set (copy `.env.example` to `.env`); the app throws at startup otherwise.

### Deviations and additions in Milestone 1b

- **New tokens not in the design doc:** `accentText`, `successText`, `warningText`, `dangerText`, `successSoft` / `warningSoft` / `dangerSoft` (the doc's soft values, now named), `onHero`, `onHeroTrack`. Reason: the doc's light-mode `accent` is only about 4.0 to 4.4:1 on `accentSoft` / `surfaceMuted`, and the semantic colours reach only about 4.3:1 on their soft backgrounds, which misses the doc's own 4.5:1 text rule. `accentText` is `accentDeep` in light mode and `accent` in dark mode; `*Text` are darker shades in light mode. Fills still use the exact doc values. The design doc should be updated with these.
- **`textTertiary` is below 4.5:1** (light: about 3.2:1 on `bg`, 3.0:1 on `surfaceMuted`). Tokens kept exactly as specified. The test asserts 3:1 on `bg` / `surface` / `surfaceRaised` (hints, disabled, inactive icons) and Input placeholders use `textSecondary` instead.
- **`micro` is uppercase** per the type table, but the tab bar passes `uppercase={false}` so tab labels stay sentence case.
- **Hero glow omitted** (doc marks it optional): lightening the corner would drop white text under 4.5:1 on Coral.
- **Android navigation bar:** driven by `Appearance.setColorScheme('light' | 'dark' | 'auto')` plus `SystemUI.setBackgroundColorAsync`, instead of `expo-navigation-bar`. Needs a check on a real Android device.
- **Splash colours** in `app.json` changed from the scaffold blue to `#F7F5F2` (light) / `#141311` (dark) so there is no blue flash. The Android adaptive icon background is still the scaffold blue (icons are out of scope).
- `/gallery` is cast to `Href` in `src/app/index.tsx` because the generated typed-routes file is stale until the dev server regenerates it.
- The `unslop` skill was loaded, but `docs/DESIGN.md` is binding and fully specified, so it served as the direction; the skill's generic defaults (weights, tracking, no uppercase) did not override the doc.

### Deviations and additions in Milestone 2

- **Timeout rule:** "90 s for the first call" is implemented as "90 s while the server is cold": until any response
  arrives after launch, and again after 10 minutes without one (the free tier sleeps when idle). Otherwise 30 s.
  The 120 s timeout for `/plan/generate` is not added yet (Milestone 4).
- **Waking toast placement:** top of the screen under the status bar, not 16 above the tab bar (design doc,
  Toasts). It also shows on auth screens and the gate screen, where there is no tab bar, and at the bottom it
  would cover the primary button with the keyboard open.
- **Shared Notice / EmptyState / TabPlaceholder** live in `src/components/layout/` (built from the primitives and
  tokens) rather than `ui/`, since they compose primitives.
- **Input** now accepts a `ref` (React 19 ref-as-prop) and exports `InputHandle`, for "next field" focus.
- **Welcome screen copy and preview card are new:** the design doc only describes Auth generally (soft bg, title1,
  filled inputs, one primary button, no gradient). The welcome screen adds a static preview card of a day's
  checklist built from the habit-row anatomy. Please review the copy.
- **Signup logs in automatically** right after the account is created. If that login fails, the user lands on the
  login screen with the email filled in and a note.
- **Login 422 field mapping:** the API's `username` error is shown under Email.
- **Requests carry an `X-Request-ID`** generated by the app (16 chars, a-z0-9). For failed requests the store
  keeps the server's echoed id, method, path template (no ids or query) and status. "Copy debug info" copies it
  (plus app version and platform) from the gate's error screen and the Settings placeholder.
- **Logout** is the temporary client-side action on the Settings and onboarding placeholders, shown in
  development builds only until Milestone 7. The gate's error screen keeps Log out in all builds, as the way out
  of an account that cannot be loaded. Push unregister is added in Milestone 8.
- **KeyboardAvoidingView uses `behavior="padding"` on Android too** (edge-to-edge no longer resizes the window).
  Needs a check on a real Android device.
- **Contract gaps** (409 on signup, 401 on refresh, 404 on plan reads not documented) recorded in
  `docs/BACKEND_REQUESTS.md`.
- **Typed routes:** `.expo/types/router.d.ts` (gitignored) is regenerated by `npx expo start`. If `npm run
  typecheck` complains about `/login` etc. after pulling, start the dev server once.
- The `unslop` skill was applied to copy and restraint (no exclamation marks, sentence case, one primary action,
  one rich element per screen); `docs/DESIGN.md` stayed binding for every visual value.

### Deviations and additions in Milestone 3

- **Equipment item rules come from backend code, not the contract** (the contract only has `maxItems: 20`):
  trimmed + lowercased, 1 to 50 characters, `[a-z0-9][a-z0-9 -]*`. Mirrored in `schema.ts` and tested. Logged as
  `docs/BACKEND_REQUESTS.md` #2 (together with the PATCH 404 missing from the contract). The client also refuses
  duplicates and lowercases items as they are added, so chips show what the server will store.
- **Enum values:** TypeScript types only exist at compile time, so the runtime lists are derived from the label maps
  (typed `Record<Goal, ...>` etc. from `schema.d.ts`, which forces them to be complete) and a test compares them
  with `api/openapi.json`.
- **Time zone** is shown read-only on the reminders step ("Times follow this phone's time zone, ..."); there is no
  picker. Falls back to "UTC" if the runtime cannot tell. A server 422 for it shows under that line.
- **Reminder picker:** Android opens the system time dialog; iOS opens an inline spinner under the time row. Needs a
  check on both platforms on a device. With reminders off the time row is dimmed and disabled, but its value is
  still sent.
- **New copy** (please review): step questions and subtitles in `wizard.ts`, choice descriptions in `labels.ts`,
  equipment suggestions (dumbbells, resistance bands, yoga mat, pull-up bar, kettlebell), "Finish setup".
- **Equipment add button** sits under the field (soft, small) rather than beside it, so it stays aligned at 130% font
  size and when an error message shows under the field. Chips use the existing `Chip` with a leading X / + icon
  (the primitive has no trailing icon slot).
- **Choice cards** are a new onboarding-only component (surface card, `accentSoft` when selected, accent marker with
  a tick); the doc allows "chip or card choices". Selecting gives a selection haptic.
- **Steps fade in** (250 ms, Reanimated `FadeIn`, reduce motion respected). No slide transition between steps.
- **Dev Log out** sits in the wizard's top bar (development builds only), as on the old placeholder.
- **Logout fix (found on device in Expo Go):** logging out showed "Unmatched route" at `ai-habit-coach:///`. When a
  guard closes, Expo Router 58 redirects to the root navigator's fallback: the first open route, here the `(auth)`
  group, whose URL is "/" (groups are not part of URLs). "/" only exists as `(tabs)/index`, so nothing matched. Fix:
  `phaseHref()` in `routeGuards.ts` gives each phase's real screen (`/starting`, `/welcome` or `/login`,
  `/onboarding`, `/`), passed as `redirectTo` on every `Stack.Protected` in the root layout. The session state has a
  new optional `authEntry`: `'welcome'` for a fresh launch without tokens, `'login'` after logout, an expired
  session, or a gate re-run that ends signed out. Tested in `routeGuards.test.ts`.
- No OS notification permission is requested here; that stays with push (M8).
- The `unslop` skill was applied as direction (calm and plain copy, one primary action per step, the selected
  choice card as the one rich element, the progress dots as the signature); `docs/DESIGN.md` stayed binding for
  every visual value.

### Deviations and additions in Milestone 4

- **Groups follow the coach's order.** Inside a day, items are sorted by `position`, then grouped by `type`
  with groups in the order of their first item (a day starting with a meal shows Meals first), rather than a fixed
  Workouts / Meals / Habits order. One function in `week.ts` changes it if you prefer the fixed order.
  **Changed in M5 (owner's decision):** groups now use the fixed order Workouts, Meals, Habits (`GROUP_ORDER` in
  `week.ts`) on both tabs; `position` still orders items inside a group.
- **Plan details are shown inline, not in a sheet** (design doc 7 says "Plan details open in a sheet"): each row
  already shows the full description and target, so a sheet would repeat it. The sheet pattern is used for the
  regenerate confirmation instead.
- **Day chips are seven equal pills in one row**, not a horizontally scrolling strip, so the whole week is visible.
  Today gets a 4 px accent dot under its chip and a "Today" label chip next to the day name (screen readers hear
  "Monday, today").
- **"Make a new plan"** is a secondary button at the end of the day, not primary (it is not the screen's main
  action). After a failed run, "Try again" retries without asking again (the person already confirmed and the old
  plan is still in place).
- **Progress state copy changes with elapsed time** ("Reading your answers" -> "Planning 7 days" -> "Nearly there")
  and the bar is a rough estimate that never reaches the end; the API reports no real progress. The global
  "Waking up the server..." toast is suppressed for `/plan/generate` (its long wait is expected), so a very cold
  server plus generation could still hit the 120 s limit; the timeout copy then says the plan may still arrive and
  the plan queries are refetched.
- **429 and a second 409** disable the button until the person leaves and returns to the tab (the failure is
  dismissed on blur). There is no "remaining generations" display, as the brief says.
- **Two 409s are told apart by the `detail` text** ("onboarding"), as in M2. Logged as
  `docs/BACKEND_REQUESTS.md` #3.
- **New copy** (please review): empty state ("No plan yet", "Your coach builds 7 days of workouts, meals and habits
  from your answers. It takes about a minute."), progress stages, the regenerate sheet ("Make a new plan?" ... "Your
  progress and streak stay, but anything you checked off today won't carry over to the new plan."), the 409 and
  timeout messages in `GENERATE_COPY`.
- **Today tab** now shows the generate flow on 404 and a retry notice on other errors; the checklist is still the
  M5 placeholder. `session.hasPlan` is kept (set true after a generation) but screens read the query cache.
- The `unslop` skill was applied as direction: the selected day and its rows are the content, chrome stays
  neutral, no gradient on the Plan tab, no sparkle icon for "AI" (a calendar-plus icon instead), the today dot as
  the signature; `docs/DESIGN.md` stayed binding for every visual value.

### Deviations and additions in Milestone 5

- **No value input for `target_metric` items.** The design doc's habit row is a single tap target with no place
  for a number field, and nothing in the doc describes value entry (a sheet with an input would be new design).
  Logs are sent as `{ plan_item_id }` only. Easy to add later through a sheet if the doc gets a pattern for it.
- **Groups use a fixed order: Workouts, Meals, Habits** (owner's decision), shared with the Plan tab through
  `groupByType` / `GROUP_ORDER` in `week.ts`; items keep their `position` order inside a group. The design doc's
  "grouped by time of day" is not possible: items carry no time.
- **No "tomorrow" preview** (design doc 7, Today: "quiet tomorrow preview"). It would need the week plan plus
  working out tomorrow's weekday on the client. Owner's decision: left out for now.
- **Streak banner is a separate compact card under the hero**, not part of the gradient. All three states share
  one calm look (flame in `accentSoft`); at risk differs only in its words ("Check off one item today to keep it
  going"). No warning colour: the doc reserves red for errors and asks for no guilt. If the streak request fails
  the banner is simply left out; the checklist does not depend on it.
- **Hero copy and ring:** "3 of 5 done" (title1, tabular) + one line ("Start with whichever feels easiest",
  "2 left for today", "Everything for today is checked off"); the 72 px ring shows a tick when the day is done and
  is otherwise empty. The date line under the title comes from the server's `weekday` + `local_date` text.
- **Toast for log/undo failures** sits 16 above the tab bar as the doc specifies (the M2 waking toast stays at the
  top). It fades without moving, ignores touches, is announced to screen readers and hides after 3 s.
- **Row captions:** the target as the first caption line, the description cut to two lines as the second (full
  text on the Plan tab). Press feedback is a slight dim rather than the button scale.
- **The Today tab still reads `isNoPlan` first:** a 404 replaces even cached checklist data with the generate flow.
  A failed refetch with data already shown keeps the cached day without an error card.
- **`GROUP_ICONS` is now exported from `DayPlan.tsx`** so both tabs share the type icons.
- **New copy** (please review): hero lines above, streak copy in `streak.ts` ("No streak yet" / "Check off any item
  today to start one", "5-day streak" / "Today counts. Your best is 12 days." or "... This is your best run so
  far."), "Nothing planned today" / "Enjoy the rest. Your plan picks up again tomorrow."
- The `unslop` skill was applied as direction (product: a daily checklist from a personal coach; character: calm,
  steady, a little warm; the hero ring is the one rich element, the flame streak line the signature; chrome stays
  neutral; copy has no exclamation marks or guilt); `docs/DESIGN.md` stayed binding for every visual value.

### Deviations and additions in Milestone 6

- **Chart library:** custom `react-native-svg` charts instead of Victory Native XL (see Package decisions).
- **Default range is 7 days** (the design doc's "weekly chart"), not the API's default of 30. The request always
  sends `days`.
- **Hero shows total completed, current streak and best streak** (as the milestone asked), not a completion rate:
  the API gives no range-wide rate, and averaging the daily rates would be computing progress on the client.
- **Heatmap is a wall calendar** (rows = weeks, columns = Monday to Sunday, 28 px squares) rather than a
  GitHub-style strip, so 7 days is one tidy row; 90 days is about 14 rows (owner: fine). "Nothing planned" and
  "planned, none done" share the neutral square; the bar chart is where they differ.
- **Month boundaries in the calendar** (owner's request after review): the 1st of each month shows a small "1" in
  its square, and the week where a month starts gets the month name above it with 12 px of extra space, so each
  month reads as its own block. The first row always names the starting month ("November", or "November –
  December" when a month starts inside that row). Logic in `weekMonthLabel()` / `HeatCell.isMonthStart`, tested.
- **Default range of 7 days confirmed by the owner.**
- **Empty state** only when there has never been any activity (`total_completed` 0 and no current or best
  streak). Someone with past activity but none in the range sees the charts with planned bars only.
- **New token group `dataViz`** in `tokens.ts` (opacities, not colours) so chart tints are named once. The design
  doc could list it under 3.5.
- **No y-axis or grid lines**; exact numbers are in the screen reader summary. Bars are 2 to 24 px wide depending on
  the range.
- **New copy** (please review): "Day by day" / "What was planned and what got done", legend "Planned", "Done",
  "Today, in progress"; "Streak calendar" / "Darker days had more of the plan done", "Less ... More", "Today";
  hero "items checked off in the last 7 days", "Current streak", "Best streak"; empty state "No activity yet" /
  "Check off an item on Today and your days start filling in here." with "Go to Today".
- The `unslop` skill was applied as direction (product: a daily coach checklist, this tab shows how steadily you
  show up; character: calm, steady, a little warm; world: a paper wall calendar; the bar chart is the one rich
  element, the heatmap smaller and different in kind; signature: the 4 px today dot shared with the Plan tab);
  `docs/DESIGN.md` stayed binding for every visual value.

### Deviations and additions in Milestone 7

- **The time zone answer lives in SecureStore**, not AsyncStorage (reserved for theme preferences). It holds the
  account id and a zone name.
- **The time zone check is a component, not a gate background task**: it needs a sheet and also runs on foreground.
- **Old zone names** (such as Asia/Calcutta for Asia/Kolkata) count as the same zone; short hand-written list in
  `src/lib/timezone.ts`.
- **Deleting the account keeps the theme** (owner decision): it is a device preference, like on logout.
- **Display name is edited in a sheet**, so the keyboard and the floating tab bar never cover the field.
- **iOS reminder time is saved with a "Save time" button**; the spinner reports every tick. Android saves on the
  system dialog's OK.
- **Blocked notifications note** appears only while reminders are on. Android 13+ reports "denied" before the app has
  ever asked, so the note can show there until M8 asks for the permission; its advice still works.
- **Log out is a neutral button with red text** (owner decision; the design doc lists sign out as destructive): new
  `neutralDanger` Button variant. Delete account keeps the destructive button.
- **"Latest X-Request-ID" is the id of the last settled request, failed or not**; the copied text also keeps the last
  failed request's details.
- **Transport:** a signal that was already aborted now aborts the request (found by the logout tests).
- **Left as they are (focused diff):** `RegenerateSheet` could use the new `Sheet`; the `TabPlaceholder` component is
  now unused (only its `TAB_BAR_CLEARANCE` is); the dev Log out on onboarding stays.
- **New copy** (approved by the owner): all sheets and card texts, e.g. "Update your time zone?", "Notifications are off on
  this phone", "Around 8:00 pm, only if nothing is checked off yet", "Delete your account?".
- The `unslop` skill was applied as direction (product: the settings of a daily habit coach; character: calm, plain,
  a little warm; the accent swatches are the one colourful element, everything else neutral; the inset row from
  onboarding is the repeated detail); `docs/DESIGN.md` stayed binding for every visual value.

### Milestone status

| Milestone | Status |
|---|---|
| M1 Foundation | Done |
| M1b Design system | Done (visual review of the gallery on device pending) |
| M2 Auth | Done (manual device checks pending: signup, login, restart, expired token) |
| M3 Onboarding | Done (manual device checks pending: both pickers, 422 display, Android back, offline save) |
| M4 Plan | Done (manual device checks pending: real generation, each error status, sheet on iOS/Android, 130% text) |
| M5 Today | Done (tested on device in Expo Go by the owner) |
| M6 Progress | Done (tested on device by the owner; month markers in the calendar added afterwards, not yet seen on device) |
| M7 Settings | Done (tested on device by the owner; the neutral Log out button and keeping the theme after account deletion were changed afterwards, not yet seen on device) |
| M8 | Not started |
| M9 | Not started |
