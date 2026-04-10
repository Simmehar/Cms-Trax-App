import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  Alert,
} from 'react-native';
import Signature from 'react-native-signature-canvas';
import {IMAGES} from '../assets';
import {isIPad} from '../utilities/securestorage';

interface SignatureProps {
  visible: boolean;
  onClose: () => void;
  onSave: (signature: string) => void;
}

const SignatureModal: React.FC<SignatureProps> = ({
  visible,
  onClose,
  onSave,
}) => {
  const [signature, setSignature] = useState<string | null>(null);
  const signatureRef = useRef<any>(null);

  const handleOK = (signatureData: string) => {
    __DEV__ && console.log('Signature captured');
    setSignature(signatureData);
    onSave(signatureData);
    // __DEV__ && console.log('signature', signature);
  };

  const handleClear = () => {
    __DEV__ && console.log('Signature cleared');
    setSignature(null);
  };

  const handleSave = () => {
    if (signatureRef.current) {
      signatureRef.current.readSignature();
    } else {
      __DEV__ && console.log('No signature ref available');
      Alert.alert('Error', 'Unable to save signature. Please try again.');
    }
  };

  const handleSignature = (signature: string) => {
    __DEV__ && console.log('Signature: ', signature);
    if (signature) {
      setSignature(signature);
      onSave(signature);
    } else {
      __DEV__ && console.log('No signature to save');
      Alert.alert('Error', 'No signature to save. Please sign before saving.');
    }
  };

  const style = `
  .m-signature-pad--footer {
    display: none; /* Hide the default footer */
    margin: 0px;
  }
  .m-signature-pad--body {
    border: none;
    margin: 0;
    padding: 0;
    height: 100%; /* Use full height */
    width: 100%; /* Use full width */
  }
  .m-signature-pad {
    box-shadow: none;
    margin: 0;
    padding: 0;
    height: 100%; /* Ensure it fills the parent */
    width: 100%; /* Ensure it fills the parent */
  }
  body, html {
    margin: 0;
    padding: 0;
    height: 100%; /* Set body and html to full height */
    width: 100%; /* Set body and html to full width */
  }
`;


  return (
    <Modal visible={visible}  transparent={true}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.crossView} onPress={onClose}>
            <Image source={IMAGES.close} style={styles.closeImg} />
          </TouchableOpacity>

          <View style={styles.signatureView}>
            <Signature
            // style={{height:300,backgroundColor:'red'}}
              ref={signatureRef}
              onOK={handleOK}
              onClear={handleClear}
              descriptionText="Sign here"
              webStyle={style}
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.clearButton]}
              onPress={() => signatureRef.current?.clearSignature()}>
              <Text style={styles.buttonText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}>
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
          </View>

          {/* {signature && (
            <View style={styles.signaturePreview}>
              <Text>Signature Preview:</Text>
              <Image source={{uri: signature}} style={styles.signatureImage} />
            </View>
          )} */}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    height:'50%',
    maxHeight: '75%',
  },
  crossView: {
    height: isIPad ? 60 : 48,
    width: isIPad ? 60 : 48,
    borderRadius: 60 / 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F4F4',
    alignSelf: 'flex-end',
  },
  closeImg: {
    height: isIPad ? 14 : 10,
    width: isIPad ? 14 : 10,
    tintColor: 'black',
  },
  signatureView: {
    height: isIPad ? 300 : 150, // Dynamic height based on device
    marginHorizontal: 30, // Keep or adjust margin as needed
    borderWidth: 1,
    borderColor: '#D8D8D8',
    marginTop: 20, // You can set this to 0 if you don't need extra space
    borderStyle: 'dashed',
    overflow: 'hidden', // Ensure no content overflows the boundaries
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: isIPad ? 50 : 20,
  },
  button: {
    paddingVertical: isIPad ? 20 : 10,
    paddingHorizontal: isIPad ? 80 : 20,
    borderRadius: 5,
  },
  clearButton: {
    backgroundColor: '#F4F4F4',
  },
  saveButton: {
    backgroundColor: '#FDBE6F',
  },
  buttonText: {
    fontSize: isIPad ? 25 : 16,
    fontFamily: 'PoppinsSemiBold',
    color: 'black',
  },
  signaturePreview: {
    marginTop: 20,
    alignItems: 'center',
  },
  signatureImage: {
    width: 200,
    height: 100,
    borderColor: '#D8D8D8',
    borderWidth: 1,
    marginTop: 10,
  },
});

export {SignatureModal};
