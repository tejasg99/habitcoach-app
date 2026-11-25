# Push notifications: setup and manual test

Push cannot be tested in Expo Go or on an emulator for this app. You need an Android phone (Android 13 or newer shows
every step) and a development build. iOS is skipped for now: it needs `ios.bundleIdentifier` in `app.json` and a paid
Apple Developer account.

## 1. One-time setup

### 1.1 Already in the repo

- `app.json`: EAS project id, owner, Android package `com.aihabitcoach`, the `expo-notifications` plugin
- `eas.json`: profiles `development`, `preview`, `production`

### 1.2 google-services.json (tells the app which Firebase project to use)

Kept out of git. It sits next to `app.json` locally, and EAS gets it as a file variable. `app.config.js` picks whichever
is there.

```
npx eas-cli login
```

```
npx eas-cli env:set --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --visibility secret --scope project --environment development --environment preview --environment production
```

Check with `npx eas-cli env:list development`: GOOGLE_SERVICES_JSON should be listed. Running `env:set` again replaces
the file.

### 1.3 FCM V1 key (lets Expo send through Firebase)

A different file: a service account key. **It is a secret.** Save it outside this folder and never commit it.

1. Firebase console, gear icon, Project settings, **Service accounts**, **Generate new private key**, **Generate key**.
2. On expo.dev open the project, then Project settings, **Credentials**, Android. Select `com.aihabitcoach`, or
   **Add application identifier** and enter it.
3. Under Service credentials, **FCM V1 service account key**, choose **Add a service account key**, upload the JSON, Save.
   (Not the Google Play submissions key.)

| Problem | Fix |
|---|---|
| "Key creation is not allowed on this service account" | A Google organization policy (`iam.disableServiceAccountKeyCreation`) blocks it. Easiest: create the Firebase project with a personal Google account outside an organization, then replace `google-services.json` and run `env:set` again |
| No permission to generate a key | Use the Google account that owns the Firebase project |
| Expo rejects the file | It is probably `google-services.json`. The right one contains `"type": "service_account"` |
| Receipt says `InvalidCredentials` or permission denied | In Google Cloud, enable "Firebase Cloud Messaging API" for this project; or the key is from another project |

### 1.4 Development build

```
npx eas-cli build --profile development --platform android
```

Do 1.2 and 1.3 first. The first build asks to create a keystore; let EAS do it. Install the APK from the link or QR code on the phone.
Build again after any change to `app.json`, `google-services.json` or native packages. JavaScript changes don't need it.

### 1.5 Run it

1. Set `EXPO_PUBLIC_API_URL` in `.env` to something the phone can reach: the production URL, or
   `http://<computer-LAN-IP>:8000` on the same Wi-Fi.
2. Start the server and open the project from the installed app:

   ```
   npx expo start --dev-client -c
   ```

## 2. Sending a test notification

1. In the app: Settings, at the bottom, **Copy push token** (development builds only). "No push token yet" means
   registration has not worked: see section 4.
2. Open <https://expo.dev/notifications> and fill in:
   - Recipient: the copied token
   - Title: `Ready for today's plan?`
   - Body: `One activity is enough to get started.`
   - Data (JSON): `{"screen":"today"}`
   - Channel ID: leave empty (the app's default channel is used, as with the real server)
3. Send it. The page also shows the receipt, which contains the delivery error if there is one.

## 3. Test cases

Start with a fresh install (uninstalling resets the permission).

| # | Do this | Expected |
|---|---|---|
| 1 | Sign up and finish onboarding with reminders **on** | The tabs open, then "One nudge on quiet days" with your reminder time |
| 2 | Tap **Not now**, then close and reopen the app | Today opens; the screen does not come back by itself |
| 3 | Settings | Note "Notifications aren't set up on this phone" with **Set up notifications** |
| 4 | Tap it, then **Continue** | The phone's own dialog. After Allow: back in Settings, the note is gone |
| 5 | System settings, Apps, ai-habit-coach, Notifications | A category "Daily reminders" exists |
| 6 | Copy push token | "Push token copied"; it looks like `ExponentPushToken[...]`. `push_tokens` in the database has one row for your user |
| 7 | Close and reopen the app twice | Still one row for this token |
| 8 | App in the **background**, send a test | A notification with sound under "Daily reminders" |
| 9 | Open the Plan tab, go to the home screen, send, **tap it** | The app opens on **Today**, not Plan |
| 10 | Open the design gallery from Settings, go to the home screen, send, tap | Today opens; Android back does not return to the gallery |
| 11 | **Kill** the app (swipe it away in recents, not Force stop), send, tap | Splash, then Today |
| 12 | Kill it again and open it from its **icon** | Opens normally |
| 13 | App **open**, send a test | It appears silently in the notification list; the screen does not change. Tapping it opens Today |
| 14 | Send with data `{"screen":"settings"}` or no data, tap | The app opens; no navigation, no error |
| 15 | Settings, switch the reminder **off**, then on | Permission already given, so no explanation screen |
| 16 | Turn notifications off in system settings, return to the app | Settings note "Notifications are off on this phone" with **Open system settings** |
| 17 | Turn them on there and return | The note disappears |
| 18 | Fresh install, onboarding with reminders **off** | No explanation screen. Turning the switch on in Settings opens it |
| 19 | **Log out** (online, server awake), then send to the copied token | The row is gone from `push_tokens`, so the server sends nothing. The Expo tool **still delivers**: it bypasses our server, which is expected |
| 20 | Log in again, as the same or another account | The row is back, for the account now logged in |
| 21 | **Delete the account** | Login screen; no row left for that user |
| 22 | Deny twice on the phone's dialog | Settings note points to system settings; no dialog appears any more |
| 23 | Turn on airplane mode, start the app, turn it off, leave and return to the app | Registration happens then (check the row, after removing it or on a fresh install) |
| 24 | Explanation screen in light and dark, two accents, 130% font | Nothing clipped; both buttons visible |

### The real reminder

1. Have a plan for today with **nothing checked off**, and reminders on.
2. Set the reminder time to a few minutes ago (the server sends within the 2 hours after it, once a day).
3. Wait for the server's job (about every 15 minutes), or run the reminder job of your local backend.
4. Expected: one reminder; tapping it opens Today. Check an item off on another day before the time: no reminder.

Force stop in Android settings blocks all push until the app is opened again. That is Android, not a bug.

## 4. If it does not work

| Symptom | Likely cause |
|---|---|
| "No push token yet" although notifications are allowed | `GOOGLE_SERVICES_JSON` was not set on EAS when the app was **built**, no internet, or the app runs in Expo Go or an emulator |
| Token exists, receipt says `InvalidCredentials` | The FCM V1 key is missing in EAS, or belongs to another Firebase project |
| Receipt `MismatchSenderId` | The key and `google-services.json` come from different Firebase projects |
| Receipt `DeviceNotRegistered` | The app was uninstalled; open a fresh install and copy the new token |
| Receipt fine, nothing arrives | Battery saver, Force stop, or the "Daily reminders" category is off |
| Token exists but no database row | The app cannot reach the API: check `EXPO_PUBLIC_API_URL`, then leave and return to the app |
