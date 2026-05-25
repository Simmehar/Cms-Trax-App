import React, {useEffect, useState,forwardRef} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {StackNavigator} from './navigation';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {WithSplashScreen} from './components/splash';
import {Platform, SafeAreaView, StatusBar, Text, View} from 'react-native';
import {
  AuthProvider,
  isValidLoginSession,
  useAuth,
} from './contexts/authcontext';
import {
  NavigationProvider,
  useNavigationContext,
} from './contexts/navigationcontext';
import {PackageProvider} from './contexts/packagecontext';
import FlashMessage from 'react-native-flash-message';
import {StripeProvider} from '@stripe/stripe-react-native';
import {OfflineModeProvider} from './db/db.context';

import SQLite from 'react-native-sqlite-storage';
import {SearchProvider} from './contexts/SearchContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// SQLite.DEBUG(true);
SQLite.enablePromise(false);

const Routes = () => {
  const {user} = useAuth();
  const [isAppReady, setIsAppReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  useEffect(() => {
    setIsAppReady(true);
  }, [user]);

  __DEV__ && __DEV__ && console.log('user', user)
  if (!isAppReady) {
    return <Text>Loading...</Text>;
  }

  return (
    <StripeProvider
      // publishableKey={'pk_test_yAct3RsTTDbBfQM6SpcAyjYN'}
      publishableKey={'pk_live_c6t4v7zq4t1oy1guwBpQaoF7'}
      merchantIdentifier="merchant.identifier" // required for Apple Pay
      urlScheme="your-url-scheme" // required for 3D Secure and bank redirects
    >
       <StatusBar
        barStyle={'dark-content'}
      />
      {/* <WithSplashScreen isAppReady={isAppReady}> */}
        <SafeAreaProvider>
          <SearchProvider>
            <OfflineModeProvider>
              <NavigationContainer>
                <StackNavigator isLoggedIn={isLoggedIn} />
                {/* {isLoggedIn ? (
            <StackNavigator isLoggedIn={isLoggedIn} />
          ) : (
            <StackNavigator isLoggedIn={isLoggedIn} />
          )} */}
              </NavigationContainer>
            </OfflineModeProvider>
          </SearchProvider>
        </SafeAreaProvider>
      {/* </WithSplashScreen> */}
    </StripeProvider>
  );
};

const MasterWrapper = forwardRef((props, ref) => {
  return (
    <GestureHandlerRootView style={{flex: 1}}> 
      <View style={{flex: 1}} ref={ref} {...props}> 
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
});

export {MasterWrapper as App};
