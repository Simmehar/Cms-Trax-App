import React, {useEffect, useState} from 'react';
import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import {StackNavigator} from './navigation';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {DeviceEventEmitter, StatusBar, Text, TextInput, View} from 'react-native';

import {
  AuthProvider,
  useAuth,
} from './contexts/authcontext';

import {NavigationProvider} from './contexts/navigationcontext';
import {PackageProvider} from './contexts/packagecontext';

import FlashMessage from 'react-native-flash-message';
import {OfflineModeProvider} from './db/db.context';

import SQLite from 'react-native-sqlite-storage';
import {SearchProvider} from './contexts/SearchContext';
import {GestureHandlerRootView} from 'react-native-gesture-handler';

import {loadBackendUrl} from './util/apiCalls';
import { WithSplashScreen } from './components/splash';
import {usePushNotifications} from './hooks/usePushNotifications';
import {NOTIFICATIONS_CHANGED_EVENT} from './utilities/ApiCalls';
import './localization/i18n';
// App.tsx ya index.js ke starting me

interface TextWithDefaultProps extends Text {
  defaultProps?: { allowFontScaling?: boolean; maxFontSizeMultiplier?: number };
}

((Text as unknown) as TextWithDefaultProps).defaultProps =
  ((Text as unknown) as TextWithDefaultProps).defaultProps || {};
((Text as unknown) as TextWithDefaultProps).defaultProps!.allowFontScaling = false;

interface TextInputWithDefaultProps extends TextInput {
  defaultProps?: { allowFontScaling?: boolean; maxFontSizeMultiplier?: number };
}

((TextInput as unknown) as TextInputWithDefaultProps).defaultProps =
  ((TextInput as unknown) as TextInputWithDefaultProps).defaultProps || {};
((TextInput as unknown) as TextInputWithDefaultProps).defaultProps!.allowFontScaling = false;
SQLite.enablePromise(false);

export const navigationRef = createNavigationContainerRef<Record<string, undefined>>();
// Screens shown before sign-in; a push tap must not leave them.
const AUTH_ROUTES = ['BusinessSelect', 'Login'];

const Routes = () => {
  const {user} = useAuth();

  // Firebase push notifications: permission, token registration and listeners.
  usePushNotifications({
    // A push while the app is open: refresh the unread badge on Home.
    onForegroundMessage: () => DeviceEventEmitter.emit(NOTIFICATIONS_CHANGED_EVENT),
    // Tapping a push opens the in-app list, once the user is signed in.
    onNotificationOpened: () => {
      DeviceEventEmitter.emit(NOTIFICATIONS_CHANGED_EVENT);
      const current = navigationRef.isReady()
        ? navigationRef.getCurrentRoute()?.name
        : undefined;
      if (current && !AUTH_ROUTES.includes(current)) {
        navigationRef.navigate('Notifications');
      }
    },
  });

  const [isAppReady, setIsAppReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  useEffect(() => {
    initializeApp();
  }, [user]);

  const initializeApp = async () => {
    await loadBackendUrl();
    setIsAppReady(true);
  };

  __DEV__ && console.log('user =====>', user);

  if (!isAppReady) {
    return <Text>Loading...</Text>;
  }

  return (
    <>
      <StatusBar barStyle={'dark-content'} />
      <WithSplashScreen isAppReady={isAppReady}>
        <SafeAreaProvider>
          <SearchProvider>
            <OfflineModeProvider>
              <NavigationContainer ref={navigationRef}>
                <StackNavigator isLoggedIn={isLoggedIn} />
              </NavigationContainer>
            </OfflineModeProvider>
          </SearchProvider>
        </SafeAreaProvider>
      </WithSplashScreen>
    </>
  );
};

const App = () => {
  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <View style={{flex: 1}}>
        <AuthProvider>
          <NavigationProvider>
            <PackageProvider>
              <Routes />
              <FlashMessage position="top" />
            </PackageProvider>
          </NavigationProvider>
        </AuthProvider>
      </View>
    </GestureHandlerRootView>
  );
};

export {App};