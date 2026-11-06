/**
 * @format
 */

import { AppRegistry, Platform } from 'react-native';
import { getApps } from '@react-native-firebase/app';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import {App} from './src/App';
import { displayLocalNotification } from './src/services/notification.service';
import { name as appName } from './app.json';

// Firebase Cloud Messaging: handle data-only / background messages. Must be
// registered outside of any React component, as early as possible.
// Notification messages are displayed by the OS itself while the app is in the
// background, so this handler only needs to do lightweight work (e.g. logging,
// updating local state). It is skipped when Firebase is not configured yet.
if (getApps().length > 0) {
  setBackgroundMessageHandler(getMessaging(), async remoteMessage => {
    __DEV__ && console.log('[Push] background message', remoteMessage);
    // Messages with a `notification` block are displayed by the OS itself.
    // Data-only messages are not: on Android post them as a system notification.
    if (Platform.OS === 'android' && !remoteMessage.notification) {
      await displayLocalNotification(remoteMessage);
    }
  });
}

AppRegistry.registerComponent(appName, () => App);
