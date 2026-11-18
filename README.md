# AI Habit Coach: mobile app

React Native (Expo SDK 58, Expo Router, TypeScript) client for the AI Habit Coach backend. iOS and Android only.

Product behaviour is in `docs/FRONTEND_BRIEF.md`, visual design in `docs/DESIGN.md`, and the API contract in `api/openapi.json`.

## Run it

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your env file and set the API URL:

   ```bash
   cp .env.example .env
   ```

   Open `.env` and set `EXPO_PUBLIC_API_URL` (no trailing slash):

   | Where the app runs | Value |
   |---|---|
   | Android emulator, backend on this computer | `http://10.0.2.2:8000` |
   | iOS simulator, backend on this computer | `http://localhost:8000` |
   | Physical device on the same Wi-Fi | `http://<computer-LAN-IP>:8000` |
   | Production (Render, may take ~90 s to wake up) | `https://ai-habit-coach-6vmk.onrender.com` |

   The app throws at startup with a clear message if the variable is missing or not an `http(s)` URL. There is no fallback. The value is bundled into the app at build time, so it is not secret; restart with `npx expo start -c` after changing it.

3. Start the dev server:

   ```bash
   npm start        # then press a (Android) or i (iOS), or scan the QR code in Expo Go
   ```

Push notifications will need a **development build** (not Expo Go) once they are added in a later milestone.

## Checks

CI runs the same commands.

```bash
npm run lint        # ESLint (expo lint)
npm run typecheck   # tsc --noEmit
npm test            # Jest (jest-expo + React Native Testing Library)
```

## Regenerating API types

`src/api/schema.d.ts` is generated from `api/openapi.json` and committed. When the backend contract changes, replace `api/openapi.json` (never edit it by hand), then run:

```bash
npm run api:types
```

Commit the result. CI re-runs this command and fails if `src/api/schema.d.ts` changes, which catches stale types.

The generator is `openapi-typesafe`: `openapi-typescript` does not install with TypeScript 6 (its peer range is TypeScript 5). Both produce the `paths` type that `openapi-fetch` uses.

## Layout

See "Implementation notes" at the end of `docs/FRONTEND_BRIEF.md` for the current folder structure, package decisions and milestone status.
