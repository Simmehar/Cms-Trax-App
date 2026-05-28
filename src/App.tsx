import React, {useEffect, useState} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {StackNavigator} from './navigation';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {StatusBar, Text, View} from 'react-native';

import {
  AuthProvider,
  useAuth,
} from './contexts/authcontext';

import {NavigationProvider} from './contexts/navigationcontext';
import {PackageProvider} from './contexts/packagecontext';

import FlashMessage from 'react-native-flash-message';
import {StripeProvider} from '@stripe/stripe-react-native';
import {OfflineModeProvider} from './db/db.context';

import SQLite from 'react-native-sqlite-storage';
import {SearchProvider} from './contexts/SearchContext';
import {GestureHandlerRootView} from 'react-native-gesture-handler';

import {loadBackendUrl} from './util/apiCalls';

SQLite.enablePromise(false);

const Routes = () => {
  const {user} = useAuth();

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
    <StripeProvider
      publishableKey={'pk_live_c6t4v7zq4t1oy1guwBpQaoF7'}
      merchantIdentifier="merchant.identifier"
      urlScheme="your-url-scheme">

      <StatusBar barStyle={'dark-content'} />

      <SafeAreaProvider>
        <SearchProvider>
          <OfflineModeProvider>
            <NavigationContainer>
              <StackNavigator isLoggedIn={isLoggedIn} />
            </NavigationContainer>
          </OfflineModeProvider>
        </SearchProvider>
      </SafeAreaProvider>

    </StripeProvider>
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