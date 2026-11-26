# AI Habit Coach: mobile app

React Native (Expo SDK 58, Expo Router, TypeScript 6, React Compiler) client for the AI Habit Coach backend. Android first; the code also handles iOS, but there is no iOS build yet (no bundle identifier).

Product behaviour is in `docs/FRONTEND_BRIEF.md`, visual design in `docs/DESIGN.md`, and the API contract in `api/openapi.json`. The backend lives in a separate repository (`ai-habit-coach`).

## Requirements

- Node.js 22.13 or newer (Expo SDK 58 needs it; CI uses Node 22)
- npm (the lockfile is `package-lock.json`)
- For device testing: Expo Go, or a development build (needed for push notifications)
- For builds: an Expo account and the EAS CLI (`npm install -g eas-cli`)

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

Push notifications need a **development build** on a physical device (not Expo Go): see `docs/PUSH_TESTING.md`. Everything else runs in Expo Go.

## Environment variables

| Name | Where | Purpose |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | `.env` locally; EAS environment variable for builds | Backend base URL. Required. Public (bundled into the app). |
| `GOOGLE_SERVICES_JSON` | EAS file variable (builds only) | Path to the Firebase `google-services.json` that EAS writes during a build. Locally, put the file next to `app.config.js` instead (it is gitignored). Without it, Android push is unavailable. |

Never put tokens or passwords in `.env`; `.env.example` lists every variable.

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Expo dev server |
| `npm run android` / `npm run ios` | Dev server, opening the emulator / simulator |
| `npm run lint` | ESLint through `expo lint` (also bans `borderWidth` and raw colours outside `src/theme/`) |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm test` | Jest (`jest-expo` + React Native Testing Library) |
| `npm run test:watch` | Jest in watch mode |
| `npm run test:coverage` | Jest with a coverage report |
| `npm run api:types` | Regenerates `src/api/schema.d.ts` from `api/openapi.json` |

## Checks and tests

CI (`.github/workflows/ci.yml`) runs on every push to `main` and every pull request: `npm ci`, lint, type-check, tests, and the API type drift check. Run the same locally before pushing:

```bash
npm run lint
npm run typecheck
npm test
```

Tests cover the logic, not the pixels: the API client (single-flight refresh, retry once, error mapping), the startup gate, optimistic log and undo with revert, plan generation errors, settings PATCH bodies, the time zone prompt, push registration, formatting helpers and the colour-contrast rules of the theme. They live in `src/__tests__/`.

If `npm run typecheck` complains about routes such as `/login` after pulling, run `npx expo start` once: it regenerates the typed-routes file (`.expo/types/router.d.ts`, gitignored).

## Regenerating API types

`src/api/schema.d.ts` is generated from `api/openapi.json` and committed. When the backend contract changes, replace `api/openapi.json` (never edit it by hand), then run:

```bash
npm run api:types
```

Commit the result. CI re-runs this command and fails if `src/api/schema.d.ts` changes, which catches stale types.

The generator is `openapi-typesafe`: `openapi-typescript` does not install with TypeScript 6 (its peer range is TypeScript 5). Both produce the `paths` type that `openapi-fetch` uses.

## Building with EAS

The app is not published to a store; builds are Android APKs you install directly. The EAS project id and owner are already in `app.json`, and the build number is managed remotely by EAS (`appVersionSource: remote`).

| Profile | Output | Use |
|---|---|---|
| `development` | Debug APK with the dev client | Day-to-day work on a phone, push testing. Connects to `npm start`. |
| `preview` | Release APK, internal distribution | Sharing a test build (install link from EAS). |
| `production` | Release APK, build number auto-incremented | The portfolio download. |

One-time setup (per EAS environment you build with):

```bash
eas login
eas env:create --environment preview --name EXPO_PUBLIC_API_URL --value https://ai-habit-coach-6vmk.onrender.com --visibility plaintext
eas env:create --environment preview --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --visibility secret
```

Repeat for `development` and `production` as needed. Android push also needs an FCM V1 key uploaded to EAS (`eas credentials`); see `docs/PUSH_TESTING.md`.

Build:

```bash
eas build --profile preview --platform android
eas build --profile production --platform android
eas build --profile development --platform android
```

When a build finishes, EAS shows a link and QR code to download the APK. On the phone, allow installs from that source when Android asks.

To build the APK on your own machine instead (Android Studio, JDK, Gradle, signing), see `docs/BUILDING.md`.

## App icon and splash

The logo is an "HC" monogram in the default Sage accent on the design system's light background. All its PNGs are drawn by a script (no dependencies), so change the colours or shape there and run it again:

```bash
node scripts/generate-brand-assets.js
```

| File | Size | Use |
|---|---|---|
| `assets/images/icon.png` | 1024 x 1024 | App icon, opaque (`#F7F5F2` background) |
| `assets/images/android-icon-foreground.png` | 1024 x 1024 | Adaptive icon foreground, inside the central 66% safe zone; background colour in `app.json` |
| `assets/images/android-icon-monochrome.png` | 1024 x 1024 | Android 13 themed icon (white, recoloured by the system) |
| `assets/images/splash-icon.png` / `splash-icon-dark.png` | 1024 x 1024 | Splash mark on `#F7F5F2` / `#141311` |
| `assets/images/notification-icon.png` | 96 x 96 | Status bar icon (white on transparent), tinted Sage by `expo-notifications` |

Icons and splash only change in a new native build (not in Expo Go or over the dev server).

## Layout

See "Implementation notes" at the end of `docs/FRONTEND_BRIEF.md` for the current folder structure, package decisions and milestone status.
