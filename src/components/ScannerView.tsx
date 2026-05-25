import React from 'react';
import {StyleSheet, Dimensions} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCodeScanner,
} from 'react-native-vision-camera';

function ScannerView({navigation, route}) {
  const device = useCameraDevice('back');

  const codeScanner = useCodeScanner({
    codeTypes: ['code-128'], // <-- ✅ We configure for 'upc-a' types
    onCodeScanned: (codes, frames) => {
      __DEV__ && console.log('trackingId', codes[0].value);
    },
  });

  return (
    <Camera
      // {...props}
      codeScanner={codeScanner}
      device={device}
      style={StyleSheet.absoluteFill}
      isActive={true}
      frameProcessorFps={'max'}
    />
  );
}

const styles = StyleSheet.create({
  centerText: {
    flex: 1,
    fontSize: 18,
    padding: 32,
    color: '#777',
  },
  textBold: {
    fontWeight: '500',
    color: '#000',
  },
  buttonText: {
    fontSize: 21,
    color: 'rgb(0,122,255)',
  },
  buttonTouchable: {
    padding: 16,
  },
});
export default ScannerView;
