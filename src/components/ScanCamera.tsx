import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
} from 'react-native';
import {
  Camera, Code, CodeScannerFrame, CodeType,
  getCameraDevice, useCodeScanner,
} from 'react-native-vision-camera';
import { useQRCodeScanning } from '../contexts/hooks/QRcodeScanning';

const ScanCamera = () => {
  const devices = Camera.getAvailableCameraDevices();
  const device = getCameraDevice(devices, 'back');
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionRequested, setPermissionRequested] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(0);

  const camera = useRef<Camera>(null);
  const { addBarcodes, barcodeScanned } = useQRCodeScanning(); // barcodeScanned is now a ref
  const route: any = useRoute();
  const isFocused = useIsFocused();

  useEffect(() => {
    const checkPermission = async () => {
      const cameraPermission: string = await Camera.getCameraPermissionStatus();
      if (cameraPermission === 'not-determined' || cameraPermission === 'denied') {
        requestPermission();
      } else {
        setHasPermission(cameraPermission === 'granted');
        setPermissionRequested(true);
      }
    };

    const requestPermission = async () => {
      const status: string = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');
      setPermissionRequested(true);
      if (status !== 'authorized') {
        Alert.alert('Camera Permission',
          'Camera access is required to use this feature. Please enable it in your device settings.');
      }
    };

    if (!permissionRequested) checkPermission();
  }, [permissionRequested]);

  const handleRequestPermission = async () => {
    const status: string = await Camera.requestCameraPermission();
    setHasPermission(status === 'authorized');
    setPermissionRequested(true);
    if (status !== 'authorized') {
      Alert.alert('Camera Permission',
        'Camera access is required to use this feature. Please enable it in your device settings.');
    }
  };

  if (!device || (!hasPermission && permissionRequested)) {
    return (
      <View style={styles.container}>
        <Text>Camera access is required to use this feature.</Text>
        <TouchableOpacity onPress={handleRequestPermission} style={styles.button}>
          <Text style={styles.buttonText}>Grant Camera Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device || !hasPermission || !permissionRequested) {
    return <Text>Loading...</Text>;
  }

  const codeTypes: CodeType[] = [
    'code-128', 'codabar', 'ean-13', 'code-39', 'code-93',
    'ean-8', 'itf', 'upc-e', 'aztec', 'data-matrix', 'qr',
  ];

  const codeScanner = useCodeScanner({
    codeTypes,
    onCodeScanned: (codes: Code[] | any, frame: CodeScannerFrame) => {
      if (route.params?.scan && barcodeScanned.current) return; // ← .current instead of .value
      addBarcodes(codes);                                        // ← no runOnJS needed
    },
  });

  return (
    <View style={styles.container}>
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={cameraActive}
        codeScanner={codeScanner}
        zoom={zoomLevel}
        enableZoomGesture
        exposure={0}
      />
      <View style={styles.overlay}>
        <Text style={styles.instructionText}>Camera is active</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  overlay: {
    position: 'absolute', bottom: 20, alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 5,
  },
  instructionText: { color: '#fff', fontSize: 18 },
  button: { marginTop: 20, padding: 10, backgroundColor: '#007BFF', borderRadius: 5 },
  buttonText: { color: '#fff', fontSize: 16 },
});

export { ScanCamera };