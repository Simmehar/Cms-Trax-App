/**
 * Firebase Cloud Messaging (push notification) service.
 *
 * Wraps @react-native-firebase/messaging so the rest of the app only deals with
 * a few functions. Every call is safe when Firebase is not configured
 * (missing google-services.json / GoogleService-Info.plist): it logs and no-ops.
 *
 * Backend contract: the FCM token is not sent to a dedicated endpoint. It is
 * attached to the login request body as `device_token` + `device_type`
 * (see getDeviceTokenPayload() and screens/Login.tsx).
 */
import {NativeModules, PermissionsAndroid, Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {getApps} from '@react-native-firebase/app';
import {
  AuthorizationStatus,
  deleteToken,
  getInitialNotification,
  getMessaging,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  requestPermission,
  type FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';

export type RemoteMessage = FirebaseMessagingTypes.RemoteMessage;
export type DeviceType = 'ios' | 'android';

/** Device fields merged into the login request body. */
export interface DeviceTokenPayload {
  /** FCM registration token; omitted when none is available yet. */
  device_token?: string;
  device_type: DeviceType;
}

const FCM_TOKEN_KEY = 'FCM_TOKEN';
/** Max time the login flow waits for a fresh token before using the cached one. */
const TOKEN_TIMEOUT_MS = 5000;

const log = (...args: unknown[]) => __DEV__ && console.log('[Push]', ...args);

/** True when a Firebase app was initialised natively from the config file. */
export const isFirebaseConfigured = (): boolean => {
  try {
    return getApps().length > 0;
  } catch {
    return false;
  }
};

/** Value sent as `device_type` with the login request. */
export const getDeviceType = (): DeviceType =>
  Platform.OS === 'ios' ? 'ios' : 'android';

/**
 * Ask the user for notification permission.
 * iOS: UNUserNotificationCenter prompt (through Firebase).
 * Android 13+: POST_NOTIFICATIONS runtime permission. Older Android: always granted.
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'android') {
      if (Platform.Version < 33) {
        return true;
      }
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    }

    if (!isFirebaseConfigured()) {
      return false;
    }
    const status = await requestPermission(getMessaging());
    return (
      status === AuthorizationStatus.AUTHORIZED ||
      status === AuthorizationStatus.PROVISIONAL
    );
  } catch (error) {
    log('requestNotificationPermission error', error);
    return false;
  }
};

/** Fetch the FCM registration token for this device and cache it locally. */
export const getFcmToken = async (): Promise<string | null> => {
  if (!isFirebaseConfigured()) {
    log('Firebase is not configured - skipping getToken');
    return null;
  }
  try {
    const token = await getToken(getMessaging());
    if (token) {
      await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
    }
    log('FCM token', token);
    return token || null;
  } catch (error) {
    log('getFcmToken error', error);
    return null;
  }
};

export const getCachedFcmToken = (): Promise<string | null> =>
  AsyncStorage.getItem(FCM_TOKEN_KEY);

/**
 * Build the device fields for the login request body:
 * `{ device_token, device_type }`.
 *
 * Tries a fresh token first (bounded by TOKEN_TIMEOUT_MS), then the cached one.
 * When no token exists (Firebase not configured, iOS simulator, offline first
 * launch) `device_token` is left out so login itself is never blocked.
 */
export const getDeviceTokenPayload = async (): Promise<DeviceTokenPayload> => {
  let token: string | null = null;
  try {
    token = await Promise.race([
      getFcmToken(),
      new Promise<null>(resolve =>
        setTimeout(() => resolve(null), TOKEN_TIMEOUT_MS),
      ),
    ]);
    if (!token) {
      token = await getCachedFcmToken();
    }
  } catch (error) {
    log('getDeviceTokenPayload error', error);
  }

  const payload: DeviceTokenPayload = {device_type: getDeviceType()};
  if (token) {
    payload.device_token = token;
  }
  log('login device payload', payload);
  return payload;
};

/**
 * Forget this device's token on logout: clears the local cache and deletes the
 * FCM token, so the device stops receiving the previous user's pushes and the
 * next login sends a fresh `device_token`.
 */
export const clearDeviceToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(FCM_TOKEN_KEY);
    if (isFirebaseConfigured()) {
      await deleteToken(getMessaging());
    }
  } catch (error) {
    log('clearDeviceToken error', error);
  }
};

interface LocalNotificationNative {
  show(
    title: string | null,
    body: string | null,
    data: Record<string, string> | null,
  ): Promise<boolean>;
}

/** Android-only native module: android/app/src/main/java/com/cmstrax_1/LocalNotificationModule.kt */
const LocalNotification: LocalNotificationNative | undefined =
  Platform.OS === 'android' ? NativeModules.LocalNotification : undefined;

if (Platform.OS === 'android' && !LocalNotification) {
  log('LocalNotification native module missing - rebuild the Android app');
}

const messageDataAsStrings = (
  data: RemoteMessage['data'],
): Record<string, string> | null => {
  if (!data) {
    return null;
  }
  const result: Record<string, string> = {};
  Object.entries(data).forEach(([key, value]) => {
    result[key] = typeof value === 'string' ? value : JSON.stringify(value);
  });
  return result;
};

/**
 * Android only: post a system notification for a message that Android does not
 * display by itself, i.e. one received while the app is in the foreground, or a
 * data-only message (no `notification` block) in any state. iOS presents its own
 * foreground banner (firebase.json), so this is a no-op there.
 * Resolves false when notifications are disabled for the app.
 */
export const displayLocalNotification = async (
  message: RemoteMessage,
): Promise<boolean> => {
  if (!LocalNotification) {
    log(
      'NOT DISPLAYED: LocalNotification native module missing. The installed ' +
        'Android build predates it - rebuild and reinstall the app (npm run android).',
    );
    return false;
  }
  const title =
    message.notification?.title ??
    (message.data?.title as string | undefined) ??
    null;
  const body =
    message.notification?.body ??
    (message.data?.body as string | undefined) ??
    null;
  if (!title && !body) {
    return false;
  }
  try {
    const shown = await LocalNotification.show(
      title,
      body,
      messageDataAsStrings(message.data),
    );
    log('local notification', shown ? 'shown' : 'blocked: notifications disabled');
    return shown;
  } catch (error) {
    log('displayLocalNotification error', error);
    return false;
  }
};

export interface NotificationListeners {
  /** Message received while the app is in the foreground. */
  onForegroundMessage?: (message: RemoteMessage) => void;
  /** User tapped a notification (app in background or quit). */
  onNotificationOpened?: (message: RemoteMessage) => void;
  /** FCM rotated the token. It is cached here and sent with the next login. */
  onToken?: (token: string) => void;
}

/**
 * Attach the runtime listeners. Returns an unsubscribe function.
 */
export const subscribeToNotifications = (
  listeners: NotificationListeners,
): (() => void) => {
  if (!isFirebaseConfigured()) {
    return () => {};
  }
  const messaging = getMessaging();

  // iOS shows its own system banner for foreground messages (firebase.json
  // presentation options). Android shows nothing while the app is open, so post
  // a system notification there. Pass onForegroundMessage to react in-app too.
  const unsubscribeMessage = onMessage(messaging, async message => {
    log('Foreground message', message);
    if (Platform.OS === 'android') {
      await displayLocalNotification(message);
    }
    listeners.onForegroundMessage?.(message);
  });

  const unsubscribeOpened = onNotificationOpenedApp(messaging, message => {
    log('Notification opened app from background', message);
    listeners.onNotificationOpened?.(message);
  });

  // App was launched (from quit state) by tapping a notification.
  getInitialNotification(messaging)
    .then(message => {
      if (message) {
        log('Notification opened app from quit state', message);
        listeners.onNotificationOpened?.(message);
      }
    })
    .catch(error => log('getInitialNotification error', error));

  const unsubscribeToken = onTokenRefresh(messaging, async token => {
    log('Token refreshed', token);
    await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
    listeners.onToken?.(token);
  });

  return () => {
    unsubscribeMessage();
    unsubscribeOpened();
    unsubscribeToken();
  };
};
