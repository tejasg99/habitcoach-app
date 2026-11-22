# Backend requests

Things the frontend noticed about the backend or its contract. Each entry: what, why, suggested change, and the
workaround in place.

## 1. Error responses missing from `openapi.json` (found in Milestone 2)

**What.** The contract does not list several error statuses the backend really returns (checked against
`backend/app/api/routes/*.py`):

| Operation | Returned by the code | Listed in the contract |
|---|---|---|
| `signup` | 409 "Email already registered" | 201, 422 |
| `refresh_tokens` | 401 "Invalid refresh token" | 200, 422 |
| `get_today_plan`, `get_week_plan` | 404 "No active plan" | 200 |
| every protected endpoint | 401 from the bearer dependency | not listed |

**Why it matters.** The generated client types the `error` of these calls as if those statuses cannot happen, so
the frontend cannot rely on the types for them, and anyone reading the contract misses part of the API.

**Suggested change.** Add `responses={409: {"model": ErrorDetail, ...}}` (and 401 / 404 where relevant) to those
route decorators, the same way `login` and `generate_weekly_plan` already do.

**Workaround.** None needed: the frontend maps errors by HTTP status in one place (`src/api/errors.ts`), not by the
generated error types.

## 2. Profile validation rules missing from `openapi.json` (found in Milestone 3)

**What.** `ProfileIn` / `ProfileUpdate` in the contract only say `equipment` is a string array with `maxItems: 20`
and `timezone` is a string. The real rules live in `backend/app/schemas/profile.py` (`_clean_equipment`,
`_validate_timezone`) and are not visible in the contract:

- each equipment item is trimmed and lowercased, blank items are dropped, then it must be at most 50 characters
  and match `[a-z0-9][a-z0-9 \-]*`
- `timezone` must be a real IANA zone name
- `PATCH /onboarding/me` lists 200 and 422 but not its 404 ("no profile yet")

**Why it matters.** The brief asks the client to validate equipment "to match the server". Without the rules in
the contract, the frontend had to copy them by reading backend code, and the copy can silently drift.

**Suggested change.** Declare the item type as
`Annotated[str, StringConstraints(strip_whitespace=True, to_lower=True, max_length=50, pattern=r"^[a-z0-9][a-z0-9 \-]*$")]`
(or add `json_schema_extra`) so `items` carries `maxLength` and `pattern` in the OpenAPI output, and add a short
`description` to `timezone` ("IANA time zone name"). Add `404` to the PATCH route's `responses`.

**Workaround.** The rules are mirrored by hand in `src/features/onboarding/schema.ts` (`equipmentItemSchema`) and
covered by tests. Server 422 messages are still shown next to the field if the two ever disagree.

## 3. The two 409s of `POST /plan/generate` differ only in their message (found in Milestone 4)

**What.** `generate_weekly_plan` returns 409 for two different reasons (`backend/app/api/routes/plan.py`):
"Complete onboarding before generating a plan" and "A plan generation just finished; try again". The response
has no machine-readable field to tell them apart.

**Why it matters.** The client must route to onboarding for the first and offer a retry for the second. Today it
matches the word "onboarding" in `detail`, so rewording the message would silently break the routing.

**Suggested change.** Add a stable code, e.g. `{"detail": "...", "code": "onboarding_incomplete"}` /
`"generation_in_progress"` (and declare it in `ErrorDetail`), or use a different status for one of them.

**Workaround.** `mapApiError` in `src/api/errors.ts` checks `/onboarding/i` on `detail`; covered by
`src/__tests__/plan-generate.test.ts` with the backend's current messages.

## 4. `GET /progress` does not say that `end_date` is today and `days` is oldest first (found in Milestone 6)

**What.** `ProgressRead` has `start_date`, `end_date` and `days` with no descriptions. The backend
(`backend/app/services/progress.py`, `get_progress`) sets `end_date` to the user's local today (profile time
zone) and returns exactly `days` entries, one per date from `start_date` to `end_date`, oldest first. None of
this is in the contract.

**Why it matters.** The brief forbids working out "today" on the client, so the Progress tab marks the entry whose
`day` equals `end_date` as "today, in progress" and lays the calendar out in the order received. If `end_date`
ever meant something else (yesterday, a UTC date), the wrong day would be marked without any error.

**Suggested change.** Add descriptions: `end_date` = "today in the profile's time zone (inclusive)", `days` = "one
entry per date from start_date to end_date, oldest first". Optionally add `is_today: bool` to `DayProgressRead`.

**Workaround.** `toChartData` in `src/features/progress/chartData.ts` treats `day === end_date` as today; covered
by `src/__tests__/progress-chart.test.ts`.
