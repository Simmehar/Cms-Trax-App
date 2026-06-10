import React, {useEffect, useRef, useState} from 'react';
import {Animated, AppState, AppStateStatus, StyleSheet} from 'react-native';
import {IMAGES, VIDEOS} from '../assets';
import Video from 'react-native-video';
import {checkInternet} from '../utilities/securestorage';
import { useNavigationContext } from '../contexts/navigationcontext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';

export function WithSplashScreen({
  children,
  isAppReady,
}: {
  isAppReady: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      {isAppReady && children}

      <Splash isAppReady={isAppReady} />
    </>
  );
}

const LOADING_IMAGE = 'Loading image';
const FADE_IN_IMAGE = 'Fade in image';
const WAIT_FOR_APP_TO_BE_READY = 'Wait for app to be ready';
const FADE_OUT = 'Fade out';
const HIDDEN = 'Hidden';

export const Splash = ({isAppReady}: {isAppReady: boolean}) => {
  const {isInternet, setIsInternet } = useNavigationContext();
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const imageOpacity = useRef(new Animated.Value(0)).current;
  const [appState, setAppState] = useState<AppStateStatus>(
    AppState.currentState,
  );

  const [state, setState] = useState<
    | typeof LOADING_IMAGE
    | typeof FADE_IN_IMAGE
    | typeof WAIT_FOR_APP_TO_BE_READY
    | typeof FADE_OUT
    | typeof HIDDEN
  >(LOADING_IMAGE);

  useEffect(() => {
    if (state === FADE_IN_IMAGE) {
      Animated.timing(imageOpacity, {
        toValue: 1,
        duration: 1000, // Fade in duration
        useNativeDriver: true,
      }).start(() => {
        setState(WAIT_FOR_APP_TO_BE_READY);
      });
    }
  }, [imageOpacity, state]);

  useEffect(() => {
    if (state === WAIT_FOR_APP_TO_BE_READY) {
      if (isAppReady) {
        setState(FADE_OUT);
      }
    }
  }, [isAppReady, state]);

  useEffect(() => {
    if (state === FADE_OUT) {
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 1000, // Fade out duration
        delay: 1000, // Minimum time the logo will stay visible
        useNativeDriver: true,
      }).start(() => {
        setState(HIDDEN);
      });
    }
  }, [containerOpacity, state]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        __DEV__ && console.log('App has come to the foreground!');
       checkInternet().then(status => {__DEV__ && console.log('status==active3', status)
        setIsInternet(status)
        if (status ==true){
          AsyncStorage.setItem('hasShownOfflineMode', 'false');
       }
       });
      
      } else if (nextAppState === 'background') {
        __DEV__ && console.log('App has gone to the background!');
        checkInternet().then(status => {__DEV__ && console.log('status==background2', status)
          setIsInternet(status)
          if (status ==true){
            AsyncStorage.setItem('hasShownOfflineMode', 'false');
         }
        });
      }
      setAppState(nextAppState);
    };

    // Add the event listener
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    checkInternet().then(status => {
      // __DEV__ && console.log('status==1', status)
      if (status ==true){
         AsyncStorage.setItem('hasShownOfflineMode', 'false');
      }
      setIsInternet(status)
    });

    // Clean up the event listener on component unmount
    return () => {
      subscription.remove();
    };

    
  }, []);

  if (state === HIDDEN) return null;

  return (
  //  <Animated.View
  //     collapsable={false}
  //     style={[style.container, {opacity: containerOpacity}]}>
      
  //     {/* The LinearGradient fills the animated container */}
  //     <LinearGradient
  //       colors={['#1C2C5B', '#1F3C73', '#2B5DAA']}
  //       start={{x: 0, y: 0}}
  //       end={{x: 1, y: 1}}
  //       style={StyleSheet.absoluteFillObject} 
  //     >
  //       <Animated.View style={style.centeredContent}>
  //         <Animated.Image
  //           source={IMAGES.logos.logo}
  //           fadeDuration={0}
  //           onLoad={() => {
  //             setState('Fade in image');
  //           }}
  //           style={[style.image, {opacity: imageOpacity}]}
  //           resizeMode="contain"
  //         />
  //       </Animated.View>
  //     </LinearGradient>
  //   </Animated.View>
  <></>
  );
};

const style = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
   
  },
  centeredContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: 250,
    height: 250,
  },
});
