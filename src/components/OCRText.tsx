import React, { useState } from 'react';
import {
  View,
  Text,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Alert,
} from 'react-native';
import ImageCropPicker from 'react-native-image-crop-picker';
import MlkitOcr from 'react-native-mlkit-ocr';

interface OCRTextProps {
  onOCRComplete?: (text: string) => void;
}

export default function OCRText({ onOCRComplete }: OCRTextProps) {
  const [ocrResult, setOcrResult] = useState<string>('');

  // Ask for camera permission (Android only)
  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'App needs access to your camera for OCR scanning',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  // Capture image & run OCR
  const scanOCR = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Camera permission is required for OCR scanning');
      return;
    }

    try {
      const image = await ImageCropPicker.openCamera({
        cropping: false,
        mediaType: 'photo',
        compressImageQuality: 0.8,
      });

      console.log('📷 ImagePicker result:', image);

      // Run OCR on captured image
      await handleOCR(image.path);
    } catch (error) {
      console.error('Camera Error:', error);
    }
  };

  // OCR detection
  const handleOCR = async (path: string) => {
    if (!path) {
      console.error('No image path provided to OCR');
      return;
    }

    let finalPath = path;

    // iOS may require "file://" prefix
    if (Platform.OS === 'ios' && !path.startsWith('file://')) {
      finalPath = `file://${path}`;
    }

    try {
      const blocks = await MlkitOcr.detectFromUri(finalPath);
      console.log('📝 OCR Result:', blocks);
      
      // Extract text from all blocks and combine
      const extractedText = blocks.map((block: any) => block.text).join(' ');
      setOcrResult(extractedText);
      
      // Call the callback if provided
      if (onOCRComplete) {
        onOCRComplete(extractedText);
      }
    } catch (error) {
      console.error('OCR Error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{ocrResult}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  text: {
    fontSize: 14,
  },
});
