import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import { FONTS } from '../assets';
import { isIPad } from '../utilities/securestorage';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const ReceiveFiltersModal: React.FC<any> = ({
  visible,
  onClose,
}) => {
  
  const filterOptions = [
    { id: '1', label: 'By Packages' },
    { id: '2', label: 'By Time Spent' },
    { id: '3', label: 'By Total Recieved' },
  ];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={() => onClose(false)} 
        />
        
        <View style={styles.sheetContainer}>
          <View style={styles.header}>
            <View style={{ width: 40 }} /> 
            <Text style={styles.headerTitle}>Filter by</Text>
            <TouchableOpacity 
              style={styles.closeCircle} 
              onPress={() => onClose(false)}
            >
              <Text style={styles.closeX}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.optionsList}>
            {filterOptions.map((item) => (
              <TouchableOpacity key={item.id} style={styles.dropdownItem}>
                <Text style={styles.itemText}>{item.label}</Text>
                <Text style={styles.chevron}>⌵</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity 
            style={styles.applyBtn} 
            onPress={() => onClose(true)}
          >
            <Text style={styles.applyBtnText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)', // Dimmed background
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 25,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 30,
    minHeight: SCREEN_HEIGHT * 0.45,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: isIPad ? 24 : 20,
    fontWeight: '800',
    color: '#002B45',
    fontFamily: FONTS.PoppinsSemiBold,
  },
  closeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F6F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeX: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
  },
  optionsList: {
    marginBottom: 20,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  itemText: {
    fontSize: 16,
    color: '#9E9E9E',
    fontFamily: FONTS.PoppinsRegular,
  },
  chevron: {
    fontSize: 18,
    color: '#333',
  },
  applyBtn: {
    backgroundColor: '#FFCC80', // Matching the orange/peach color from screenshot
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto', // Pushes button to bottom of sheet
    shadowColor: '#FFCC80',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: FONTS.PoppinsSemiBold,
  },
});

export default ReceiveFiltersModal;