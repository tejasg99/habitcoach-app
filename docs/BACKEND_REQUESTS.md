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
