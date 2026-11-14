# Frontend brief: AI Habit Coach mobile app (React Native / Expo)

> **Status:** backend finished, tested and deployed (20 API operations). A copy of its contract lives in this repository at `api/openapi.json`. Updated 13 Nov 2026.
> **This file:** `docs/FRONTEND_BRIEF.md` in the `habitcoach-app` repository.

## Starting state and how to begin

- This repository (`habitcoach-app`) starts from a **basic Expo (React Native, native-only) scaffold created by the human**. It is the only code in your workspace. The backend is a **separate repository that you cannot see**, so everything you need to know about it is in `api/openapi.json` and in this brief.
- **Your first task is to audit, not rebuild.** Read the scaffold: Expo SDK version, template, router, TypeScript configuration, existing scripts and folders. Keep its choices. Do not regenerate the project, switch frameworks or change the Expo SDK without asking. Where the suggested stack below differs from what the scaffold uses, adapt to the scaffold and tell the human what differs.
- **The UI design document** is added by the human at `docs/UI_DESIGN.md` (assets in `docs/design/`) before screen work starts. It is the source of truth for visual design, layout, component styling, spacing, motion and copy tone.
  - Precedence: the design document wins on visuals and UX; this brief and the contract win on API behaviour and data rules. If they conflict on anything else, flag it.
  - If a screen is not covered by the design document, **stop and ask**. Do not invent a visual design.
  - Milestones 1 and 2 (foundation and auth plumbing) do not depend on the design document.

### Working agreement

- Work in vertical slices (the milestones below). Make small commits with clear messages. Finish one slice, show the result, and wait for confirmation before starting the next.
- Before reporting a slice as done: lint, type-check and tests must pass.
- Ask before adding a major dependency or restructuring the project.
- Never commit secrets or `.env` files. Keep `.env.example` current.
- Some things you cannot do yourself: test push on a physical device, log in to EAS, or know the EAS project id. For these, write the code plus a short manual test procedure for the human, and ask for the values. **Never invent IDs.**
- If the backend seems wrong or missing something, record it in `docs/BACKEND_REQUESTS.md` (what, why, suggested change). Then continue with a workaround, or stop if you are blocked. Do not try to recreate or modify the backend.

## Product summary

A habit and fitness coach. The user signs up, answers a short onboarding, and the app generates a personalised 7-day plan of workouts, meals and habits. Each day the user ticks items off a checklist, watches their streak and progress, and gets a push reminder at their chosen local time if they have not started the day.

Target platforms: **iOS and Android (native) only** for v1. No web target.

## Repository layout

```
habitcoach-app/
  api/openapi.json         copy of the backend contract (replaced by the human when the API changes)
  docs/
    FRONTEND_BRIEF.md      this file
    UI_DESIGN.md           provided by the human before screen work
    design/                design assets
    BACKEND_REQUESTS.md    created by you when needed
  ...                      app source and config: whatever the Expo scaffold provides
```

The source folder structure comes from the scaffold. Propose any reorganisation before doing it.

## Contract and tooling

- **Base URL:** from `EXPO_PUBLIC_API_URL`, never hardcoded. Production: `https://<your-service>.onrender.com`. Keep `.env.example` with the variable name and no secret values.
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

- Onboarding as one form or a step-by-step wizard (the design document may decide this).
- Chart library choice.
- Empty-state and error copy tone (the design document may decide this).
