import React, { useState } from 'react';
import {
  View,
  Text,
  Button,
  Image,
  ScrollView,
  PermissionsAndroid,
  Platform,
  StyleSheet,
} from 'react-native';
import ImageCropPicker from 'react-native-image-crop-picker';
import MlkitOcr from 'react-native-mlkit-ocr';

export default function Ocrdemo() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<any[]>([]);

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
    return true; // iOS doesn't require manual permission request for camera
  };

  // Capture image & run OCR
  const openCameraAndScan = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      const image = await ImageCropPicker.openCamera({
        cropping: false,
        mediaType: 'photo',
        compressImageQuality: 0.8,
      });

      console.log('📷 ImagePicker result:', image);

      // Run OCR on captured image
      handleOCR(image.path);
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

    setImageUri(finalPath);

    try {
      const blocks = await MlkitOcr.detectFromUri(finalPath);
      console.log('📝 OCR Result:', blocks);
      setOcrResult(blocks);
    } catch (error) {
      console.error('OCR Error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Button title="📷 Open Camera & Scan" onPress={openCameraAndScan} />

      {imageUri && (
        <Image source={{ uri: imageUri }} style={styles.imagePreview} />
      )}

      <ScrollView style={styles.resultBox}>
        {ocrResult.length > 0 ? (
          ocrResult.map((block, index) => (
            <Text key={index} style={styles.textLine}>
              {block.text}
              {console.log(block.text)}
            </Text>
          ))
        ) : (
          <Text style={styles.placeholder}>No OCR result yet</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff',paddingTop:40 },
  imagePreview: {
    width: '100%',
    height: 250,
    marginTop: 16,
    borderRadius: 8,
  },
  resultBox: {
    flex: 1,
    marginTop: 16,
    padding: 10,
    backgroundColor: '#f4f4f4',
    borderRadius: 8,
  },
  textLine: {
    fontSize: 16,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
  placeholder: { color: '#888', fontSize: 14 },
});
