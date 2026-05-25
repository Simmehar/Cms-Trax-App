import {
  Animated,
  Dimensions,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import React, {useState} from 'react';
import {
  Camera,
  useCameraDevice,
  useCodeScanner,
} from 'react-native-vision-camera';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {IMAGES} from '../assets';
import {CheckIpad} from '../utilities/securestorage';

// BlurView fully removed — no longer imported or used

const {width, height} = Dimensions.get('window');

let isIPad = CheckIpad();

const SCAN_AREA_SIZE = width * 0.7;

export default function ScanBarCodeModal({
  visible,
  setVisible,
  setInputValue,
  onChangeText,
}: any) {
  const device = useCameraDevice('back');

  const codeTypes: any = [
    'code-128',
    'codabar',
    'ean-13',
    'code-39',
    'code-93',
    'ean-8',
    'itf',
    'upc-e',
    'aztec',
    'data-matrix',
    'qr',
  ];

  const codeScanner = useCodeScanner({
    codeTypes: codeTypes,
    onCodeScanned: (codes, frames) => {
      const result = codes.filter(
        item =>
          !['sq', '{"'].includes(item.value?.slice(0, 2).toLocaleLowerCase()),
      );

      if (result?.[0]?.value) {
        const scannedValue = result[0].value;
        const scannedType = result[0].type;
        __DEV__ && console.log('scannedType :>> ', scannedType);

        if (
          scannedType === 'qr' &&
          (scannedValue.toLowerCase().startsWith('s') ||
            scannedValue.length === 3)
        ) {
          __DEV__ && console.log("Don't let scammers scan it");
          return;
        }

        setInputValue(result[0].value);
        onChangeText(result[0].value);
        setVisible(false);
      }
    },
  });

  return (
    <Modal transparent={true} visible={visible}>
      <SafeAreaView style={{flex: 1, alignItems: 'flex-end'}}>
        <TouchableOpacity
          style={[isIPad ? styles.crossViewI : styles.crossView]}
          onPress={() => setVisible(false)}>
          <Image
            source={IMAGES.close}
            style={isIPad ? styles.closeImgI : styles.closeImg}
          />
        </TouchableOpacity>

        <Camera
          codeScanner={codeScanner}
          device={device}
          style={StyleSheet.absoluteFill}
          isActive={true}
          frameProcessorFps={'max'}
        />

        {/* Scan overlay using plain Views — no BlurView needed */}
        <View style={styles.overlayContainer}>
          <View style={styles.layerTop} />
          <View style={styles.layerCenter}>
            <View style={styles.layerLeft} />
            <View style={styles.focused}>
              <Animated.View style={{flex: 1}}>
                <View
                  style={{
                    position: 'absolute',
                    borderLeftColor: 'red',
                    left: '50%',
                    height: '100%',
                  }}
                />
                <View
                  style={{
                    position: 'absolute',
                    borderTopColor: 'red',
                    top: '50%',
                    width: '90%',
                  }}
                />
              </Animated.View>
            </View>
            <View style={styles.layerRight} />
          </View>
          <View style={styles.layerBottom} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const QRCODE = {
  qrcodeTop: height / 3,
  qrcodeCenter: 200,
};

const styles = StyleSheet.create({
  crossView: {
    height: 48,
    width: 48,
    borderRadius: 48 / 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F4F4',
    alignSelf: 'flex-end',
    marginRight: 10,
    marginTop: 50,
    zIndex: 1,
  },
  crossViewI: {
    height: 60,
    width: 60,
    borderRadius: 60 / 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F4F4',
    alignSelf: 'flex-end',
    marginRight: 10,
    marginTop: 100,
    zIndex: 1,
  },
  closeImg: {
    height: 10,
    width: 10,
    tintColor: 'black',
  },
  closeImgI: {
    height: 14,
    width: 14,
    tintColor: 'black',
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    borderColor: 'white',
    backgroundColor: 'transparent',
  },
  transparentArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    borderColor: 'white',
    backgroundColor: 'transparent',
  },
  layerTop: {
    height: QRCODE?.qrcodeTop,
    backgroundColor: 'rgba(0, 0, 0, .6)',
    width: '100%',
  },
  layerCenter: {
    height: QRCODE?.qrcodeTop,
    flexDirection: 'row',
  },
  layerLeft: {},
  focused: {},
  layerRight: {},
  layerBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, .7)',
    width: '100%',
    marginTop: 16,
  },
  containerStyle: {
    position: 'absolute',
    left: -30,
    top: 5,
  },
  bgIdle: {},
  bgSuccess: {},
  bgFailed: {},
  zoomButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '70%',
  },
  slider: {
    flex: 1,
    marginHorizontal: 10,
  },
  zoomButtonText: {
    color: 'white',
    fontSize: 24,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
  boxContainer: {
    width: width * 0.8,
    height: 200,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});