# Building a standalone Android APK

## Why the app "only works with Expo" today

| How you run it | What it is | Needs a computer running `npm start`? |
|---|---|---|
| Expo Go | Expo's own app runs your JavaScript | Yes |
| Development build (`eas build --profile development`) | Your own debug APK with the dev client; still loads JavaScript from Metro | Yes |
| **Release APK** (`preview` / `production`, or a local release build) | Native app with the JavaScript bundled inside | **No**: install it and it runs on its own |

A release APK is what you want to share. There are three ways to get one.

| Way | Runs on | You need |
|---|---|---|
| A. EAS cloud build | Expo's servers | An Expo account, `eas-cli` |
| B. `eas build --local` | Your machine, **macOS or Linux only** (on Windows: inside WSL2) | Everything in C, plus `eas-cli` |
| C. Prebuild + Gradle (fully manual) | Your Windows machine | Android Studio, JDK 17 |

## A. EAS cloud build (simplest)

```powershell
npm install -g eas-cli
eas login
eas env:create --environment production --name EXPO_PUBLIC_API_URL --value https://ai-habit-coach-6vmk.onrender.com --visibility plaintext
eas env:create --environment production --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --visibility secret
eas build --profile production --platform android
```

The first build asks to create an Android keystore; let EAS generate and keep it. When the build finishes, download the `.apk` from the link or QR code. `preview` works the same way.

## C. Fully local build on Windows (no Expo cloud)

### One-time setup

1. **Android Studio** (https://developer.android.com/studio). On first start, let the setup wizard install the Android SDK. Then open *More Actions > SDK Manager*:
   - *SDK Platforms*: the latest Android platform (Gradle installs the exact one the project needs on the first build if licences are accepted).
   - *SDK Tools*: Android SDK Build-Tools, Android SDK Platform-Tools, Android SDK Command-line Tools, NDK (Side by side) and CMake.
2. **JDK 17.** React Native's Android docs recommend JDK 17 (for example the Microsoft Build of OpenJDK 17). Android Studio's bundled JDK may be newer; if Gradle reports an unsupported Java version, point `JAVA_HOME` at JDK 17.
3. **Environment variables** (System Properties > Environment Variables, user variables):
   - `JAVA_HOME` = the JDK 17 folder, e.g. `C:\Program Files\Microsoft\jdk-17...`
   - `ANDROID_HOME` = `%LOCALAPPDATA%\Android\Sdk`
   - Add `%ANDROID_HOME%\platform-tools` to `Path` (for `adb`)

   Open a new terminal and check:

   ```powershell
   java -version
   ```

   ```powershell
   adb version
   ```

4. **Long paths.** Native builds create deep folders. If a build fails with a "path too long" or CMake error, enable Windows long paths (Local Group Policy, or the `LongPathsEnabled` registry value) or build from a shorter folder such as `C:\dev\hc`.

### Every build

1. Set the API the APK will talk to. `EXPO_PUBLIC_API_URL` is baked into the APK at build time, so use the public server, not `10.0.2.2` or a LAN address:

   ```
   EXPO_PUBLIC_API_URL=https://ai-habit-coach-6vmk.onrender.com
   ```

   in `.env`.

2. For push notifications, put `google-services.json` next to `app.config.js` (it is gitignored). Without it the app builds and works, only without Android push.

3. Generate the native Android project from `app.json` (icons, splash, plugins, package name). The `android/` folder is generated and gitignored; `--clean` recreates it from scratch, so never hand-edit it without a plan to redo the edit:

   ```powershell
   npx expo prebuild --platform android --clean
   ```

4. Build the release APK:

   ```powershell
   cd android
   ```

   ```powershell
   .\gradlew.bat assembleRelease
   ```

   The first build downloads Gradle, the NDK and dependencies and can take 15 to 30 minutes; later builds are much faster. The APK is at:

   ```
   android\app\build\outputs\apk\release\app-release.apk
   ```

   Alternative: with a phone connected over USB (USB debugging on), `npx expo run:android --variant release` builds and installs in one step.

5. Install it: copy the APK to the phone and open it (allow "Install unknown apps" for your file manager), or with USB:

   ```powershell
   adb install -r android\app\build\outputs\apk\release\app-release.apk
   ```

### Signing

Android only installs signed APKs. The generated project signs release builds with the **debug keystore** (`android/app/debug.keystore`) out of the box. That APK installs and runs fine, which is enough for a quick test. The catch: that debug key is the same public key in every React Native project, so it proves nothing about who built the APK. And an APK signed with it can't update one signed with any other key (an EAS build, for example), so you'd have to uninstall first.

For a stable key of your own:

1. Create it once and keep it **outside the repo** (`*.jks` is gitignored anyway), backed up. Losing it means you cannot ship updates over existing installs.

   ```powershell
   keytool -genkeypair -v -storetype PKCS12 -keystore C:\keys\habitcoach-release.jks -alias habitcoach -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Put the passwords in `%USERPROFILE%\.gradle\gradle.properties` (not in the project):

   ```
   HC_UPLOAD_STORE_FILE=C:/keys/habitcoach-release.jks
   HC_UPLOAD_KEY_ALIAS=habitcoach
   HC_UPLOAD_STORE_PASSWORD=...
   HC_UPLOAD_KEY_PASSWORD=...
   ```

3. After each `prebuild --clean`, edit `android/app/build.gradle`: add a `release` entry under `signingConfigs` that reads those four properties, and set `signingConfig signingConfigs.release` in `buildTypes.release`. (A small Expo config plugin can automate this so prebuild keeps it; not set up yet.)

If you also build with EAS, you can download the EAS-managed keystore with `eas credentials` and use that same file locally, so both kinds of build can update each other.

### Versions

`version` in `app.json` is the name users see. Local builds take the version code from `android.versionCode` in `app.json` (default 1); raise it for each APK you hand out, or Android may refuse the update. EAS builds manage the code remotely instead (`appVersionSource: remote`).

### Smaller APK (optional)

A release APK contains native code for four CPU types. Almost every current phone is `arm64-v8a`; to build only that, set `reactNativeArchitectures=arm64-v8a` in `android/gradle.properties` before `assembleRelease` (prebuild `--clean` resets it).

## B. `eas build --local`

Runs the same steps as the cloud build on your own machine and uses your EAS profiles, environment variables and credentials. It does not support Windows directly; use WSL2 with Ubuntu, and install Node, JDK 17 and the Android SDK (command-line tools) inside WSL. Then:

```powershell
eas build --profile production --platform android --local
```

On Windows, option C is usually less work than setting up WSL for this.
