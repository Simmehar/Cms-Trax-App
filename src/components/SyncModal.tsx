import React from 'react';
import {Modal, Text, View, StyleSheet, TouchableOpacity} from 'react-native';
import {Checkout, AdvancedForms} from '../db/db.crud';
// import { Checkout } from "../processors/db/db.crud";

const SyncModal = ({visible, setModalVisible, navigation}: any) => {
  const [showModal, setShowModal] = React.useState(false);
  const handleClose = () => {
    if (setModalVisible) {
      setModalVisible(false);
    }
  };

  React.useEffect(() => {
    const fetchUnsyncedData = async () => {
      const allRecords = await Checkout.getAllRecords();
      const unsyncedCheckouts = allRecords.filter(
        (record: any) => record.Synced === 'false' || record.Synced === 0,
      );

      const allAdvancedRecords = await AdvancedForms.getAllRecords();
      const unsyncedAdvanced = allAdvancedRecords.filter(
        (record: any) => record.data.synced === false,
      );

      if (unsyncedCheckouts.length > 0 || unsyncedAdvanced.length > 0) {
        setShowModal(true);
      } else {
        setShowModal(false);
      }
    };

    if (visible) {
      fetchUnsyncedData();
    }
  }, [visible, navigation]);

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible && showModal}
      onRequestClose={handleClose}>
      <View style={styles.modalBackground}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>Sync Data</Text>
          <Text style={styles.message}>
            Please synchronize data before proceeding from the top-right menu.
          </Text>
          <TouchableOpacity onPress={handleClose} style={styles.button}>
            <Text style={styles.buttonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    elevation: 5,
    width: '80%',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  buttonText: {
    fontSize: 12,
    color: 'white',
    fontWeight: 'bold',
  },
});

export default SyncModal;
