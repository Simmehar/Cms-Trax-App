import {useEffect} from 'react';
import {
  getFcmToken,
  isFirebaseConfigured,
  requestNotificationPermission,
  subscribeToNotifications,
  type RemoteMessage,
} from '../services/notification.service';

interface Options {
  /** Called when the user taps a notification (background or quit state). */
  onNotificationOpened?: (message: RemoteMessage) => void;
  /** Called for a message received while the app is in the foreground. */
  onForegroundMessage?: (message: RemoteMessage) => void;
}

/**
 * Wires Firebase push notifications into the app:
 *  - asks for permission and pre-fetches the FCM token on first mount, so it is
 *    ready to be sent as `device_token` / `device_type` with the login request
 *  - listens for foreground messages, token refreshes and notification taps
 *
 * The token reaches the backend only through the login request (Login.tsx uses
 * getDeviceTokenPayload()); a refreshed token is cached and sent at the next login.
 */
export const usePushNotifications = ({
  onNotificationOpened,
  onForegroundMessage,
}: Options = {}) => {
  useEffect(() => {
    const setup = async () => {
      const granted = await requestNotificationPermission();
      const token = await getFcmToken();
      // One-line push health check; read it in Metro when a notification does
      // not show up (all three must be true for a push to be displayed).
      __DEV__ &&
        console.log('[Push] status', {
          firebaseConfigured: isFirebaseConfigured(),
          permissionGranted: granted,
          hasToken: !!token,
        });
    };
    setup();

    const unsubscribe = subscribeToNotifications({
      onNotificationOpened,
      onForegroundMessage,
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
