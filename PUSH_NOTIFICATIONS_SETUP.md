# Push notifications (Firebase Cloud Messaging)

The app uses `@react-native-firebase/app` + `@react-native-firebase/messaging`.
All native wiring is done and both Firebase config files (project `cms-trax`)
are in the repo: `android/app/google-services.json` and
`ios/CMSTrax/GoogleService-Info.plist`. The remaining manual steps are the APNs
key upload (section 1, step 2), the Apple Push capability (section 3) and the
backend endpoint (section 4).

## 1. Firebase console

1. The Firebase project `cms-trax` already has both apps registered. Only if
   the project or the app ids ever change, re-add them and re-download:
   - **Android** package name `com.cmstrax` → download `google-services.json`
   - **iOS** bundle id `com.cmstrax.mobile` → download `GoogleService-Info.plist`
2. iOS only: in **Project settings → Cloud Messaging → Apple app configuration**
   upload your **APNs authentication key** (.p8, from developer.apple.com →
   Keys) with its Key ID and Team ID (`3GL35LC44F`). Without it iOS devices never
   receive pushes.

## 2. Config files in the project (done)

| File | Location | Status |
|------|----------|--------|
| `google-services.json` | `android/app/google-services.json` | added (package `com.cmstrax`) |
| `GoogleService-Info.plist` | `ios/CMSTrax/GoogleService-Info.plist` | added (bundle `com.cmstrax.mobile`) |

The iOS file is referenced in the Xcode target (Copy Bundle Resources) and the
Android Gradle plugin is applied automatically because the JSON file exists. If
you ever re-download the files from the console, overwrite them in place; no
other change is needed.

If the files are removed the apps still build and run; Firebase simply stays
disabled (a warning is logged at build / launch time).

Note: iOS **simulator** builds use the placeholder bundle id
`org.reactjs.native.example.CMSTrax` (the real id is set for `sdk=iphoneos*`
only), so Firebase logs a bundle-id mismatch warning on the simulator. It is
harmless: push notifications need a physical device anyway.

## 3. Apple Developer portal

- Enable the **Push Notifications** capability on the `com.cmstrax.mobile` App ID
  and regenerate the provisioning profiles (Xcode does this with automatic signing).
- `ios/CMSTrax/CMSTrax.entitlements` contains `aps-environment = development`;
  Xcode switches it to `production` automatically when archiving for TestFlight / App Store.
- Push does **not** work on the iOS simulator; use a real device.

## 3b. iOS build notes

- `@react-native-firebase` is pinned to **v26** (Firebase iOS SDK 12.x via CocoaPods).
  v27+ requires Firebase 13, which ships only through Swift Package Manager and
  needs `use_frameworks! :linkage => :dynamic`; that does not link against React
  Native 0.85's prebuilt core, so the project keeps its static linkage with
  `$RNFirebaseDisableSPM = true` / `$RNFirebaseAsStaticFramework = true` in `ios/Podfile`.
- Firebase 12 needs GoogleUtilities 8, so `react-native-mlkit-ocr` was moved from
  GoogleMLKit 2.6.0 to 9.0.0 (`patches/react-native-mlkit-ocr+0.3.0+002+googlemlkit9.patch`,
  applied automatically by `patch-package` on `npm install`). ML Kit 9 needs iOS 15.5+,
  so `ios/Podfile` now declares `platform :ios, '15.6'` (the app target already required 15.6).
  Re-test the Smart Scanner OCR after this upgrade.
- Run `cd ios && bundle exec pod install` after pulling these changes.

## 4. Backend contract

The FCM token travels **inside the login request**; there is no separate
endpoint. `src/screens/Login.tsx` merges the result of `getDeviceTokenPayload()`
(`src/services/notification.service.ts`) into the `/login` body:

```
POST {Backend_URL}/login
{
  "username": "...",
  "password": "...",
  "device_token": "<fcm token>",      // omitted when no token is available yet
  "device_type": "ios" | "android"
}
```

- `device_token` is left out (not sent as null or empty) when the device has no
  token yet: Firebase not configured, iOS simulator, or no network on first
  launch. Login must still succeed in that case.
- `device_type` is `Platform.OS` (`ios` / `android`); change `getDeviceType()`
  in the service if the backend expects other values.
- A token can rotate while the user stays logged in (`onTokenRefresh`); the new
  value is cached and reaches the backend at the next login. If that is too
  slow, add an endpoint and call it from the `onToken` listener wired in
  `src/hooks/usePushNotifications.ts`.
- On logout the app calls `POST {Backend_URL}/logout` (Bearer token) with
  `{ "device_token": "<fcm token>" }` (key omitted when the device has no
  token) so the backend can forget this device, then deletes its FCM token.
  Errors from that call are ignored; logout always completes locally.

### Sending from the backend (what must be true)

- Use the **FCM HTTP v1 API**:
  `POST https://fcm.googleapis.com/v1/projects/cms-trax/messages:send` with an
  OAuth2 bearer token obtained from a **service account of project `cms-trax`**
  (Firebase console → Project settings → Service accounts). The legacy endpoint
  `https://fcm.googleapis.com/fcm/send` with `Authorization: key=<server key>`
  was shut down by Google in 2024: it returns 404/401 or silently drops messages.
  Many older PHP / Node snippets still use it.
- Include a `notification` block (title + body). Only then do Android and iOS
  display the message themselves while the app is in the background or closed.
  A **data-only** message is displayed by the app on Android (local system
  notification) but never on iOS.
- Android: `android.notification.channel_id` = `cmstrax_default`,
  `android.priority` = `high`. iOS: `apns.headers.apns-priority` = `10`,
  `apns.headers.apns-push-type` = `alert`.
- `scripts/send-test-push.js` is a complete, dependency-free reference
  implementation of all of the above (service-account JWT → access token → v1 send).

Example message body:

```json
{
  "message": {
    "token": "<device fcm token>",
    "notification": { "title": "Package received", "body": "1 new package for John Doe" },
    "data": { "screen": "Home", "package_id": "123" },
    "android": {
      "priority": "high",
      "notification": { "channel_id": "cmstrax_default", "sound": "default" }
    },
    "apns": {
      "headers": { "apns-priority": "10", "apns-push-type": "alert" },
      "payload": { "aps": { "sound": "default" } }
    }
  }
}
```

## 5. Behaviour in the app

- Permission is requested on first launch (`usePushNotifications` in `src/App.tsx`).
  Android 13+ uses the `POST_NOTIFICATIONS` runtime permission.
- Foreground: iOS shows its normal system banner (`firebase.json` →
  `messaging_ios_foreground_presentation_options`). Android displays nothing by
  itself while the app is open, so the app posts a system notification through
  its own small native module (`android/.../LocalNotificationModule.kt`, exposed
  as `NativeModules.LocalNotification`) on the `cmstrax_default` channel. No
  in-app banner is shown on either platform. To also react in-app (e.g. refresh
  a list), pass `onForegroundMessage` to `subscribeToNotifications` in
  `src/services/notification.service.ts`.
- Background / quit-state notifications are displayed by the OS on the
  `cmstrax_default` channel (created in `MainApplication.kt`). The Android
  status-bar icon is `android/app/src/main/res/drawable/ic_notification.xml`.
- Taps on a notification are delivered to `onNotificationOpened` in
  `usePushNotifications` – pass a handler there to navigate using `message.data`.
- Data-only messages (no `notification` block) hit the handler registered in
  `index.js`; on Android it posts them as a system notification, on iOS they are
  not displayed.
- On logout the app posts `device_token` to `/logout`, then deletes the local
  FCM token; the backend gets a fresh `device_token` at the next login
  (see section 4).

## 6. Testing

1. Build and install the app again after the config files were added (they are
   read at build time; a Metro reload is not enough) and run it on a real device.
2. In Metro look for `[Push] status {firebaseConfigured, permissionGranted, hasToken}`.
   All three must be `true`. Copy the token from `[Push] FCM token …`.
3. Put the app in the background (that is the case the OS displays itself) and
   send a test message straight to the token, bypassing the backend:
   - Firebase console → **Messaging → New campaign → Send test message** → paste
     the token, or
   - `npm run push:test -- --key <service-account.json> --token <token>`
     (service-account JSON from Project settings → Service accounts; the file is
     git-ignored).
4. Log in; Metro prints `[Push] login device payload {...}`. Check the backend
   stored `device_token` / `device_type`, then send from the backend.

## 7. Troubleshooting: "backend sends, nothing shows"

Work through the first failing row:

| Check | If it fails |
|-------|-------------|
| `[Push] status` shows `firebaseConfigured: false` | The installed build predates the config files, or `GoogleService-Info.plist` is not in the iOS bundle. Rebuild from Xcode / Gradle. |
| `permissionGranted: false` | Enable notifications for CMSTrax in system settings (the prompt is shown only once) and restart the app. |
| `hasToken: false` on iOS | Push Notifications capability missing on the App ID / provisioning profile, or running on a simulator. The device log shows `No APNS token specified`. |
| `hasToken: false` on Android | No Google Play services (emulator without Google APIs) or no network. |
| Console / `push:test` accepted the message but nothing on the device | iOS: APNs auth key not uploaded for this app (FCM reports no error, device never receives it). Android: the installed build must contain the LocalNotification module (Metro logs `LocalNotification native module missing` otherwise: rebuild). Battery optimisation / restricted background on Xiaomi, Oppo, Vivo, Huawei. |
| `push:test` returns `UNREGISTERED` | Token belongs to an old install or was deleted at logout. The backend must use the token from the latest login. |
| `push:test` returns `SENDER_ID_MISMATCH` | Token was created with config files from another Firebase project. |
| `push:test` returns `THIRD_PARTY_AUTH_ERROR` | iOS APNs key missing or invalid in the Firebase console. |
| `push:test` works but the backend's send does not | Backend uses the dead legacy API / server key, a service account of another project, or data-only messages. Compare its request with `scripts/send-test-push.js`. |
| Metro logs `[Push] Foreground message` / `background message` but nothing is displayed | iOS: the message has no `notification` block (data-only); iOS never displays those, add the block on the backend. Android: `[Push] local notification blocked` means notifications are disabled for the app in system settings. |
