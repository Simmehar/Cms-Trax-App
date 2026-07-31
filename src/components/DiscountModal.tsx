import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  Image,
} from 'react-native';
import { FONTS, ICONS, IMAGES } from '../assets';
import { InputPicker } from './InputPicker';
import { KeyboardScroll } from './KeyboardScroll';
import { isIPad } from '../utilities/securestorage';
import { useTranslation } from 'react-i18next';
interface SignatureProps {
  visible: boolean;
  onClose: () => void;
  onSave: (val: number) => void;
  payableAmount: any;
}

const DiscountModal: React.FC<SignatureProps> = ({
  visible,
  onClose,
  onSave,
  payableAmount,
}) => {
  const [selectAmount, setSelectAmount] = useState('');

  const onPercentageChange = (val: any) => {
    const discount = (payableAmount * Number(val)) / 100;
    if (discount && discount != NaN) {
      setSelectAmount(String(discount));
    }
  };

  useEffect(() => {
    onPercentageChange('0');
  }, []);

  const [selectedDiscount, setSelectedDiscount] = useState(-1);



  const handleNumberPress = number => {
    setSelectAmount(selectAmount + number)
  };

  const handleDeletePress = () => {
    if (selectAmount.length > 0) {
      setSelectAmount(selectAmount.slice(0, -1));
    }
  };

  const NumberButton = ({ number, onPress }) => (
    <TouchableOpacity
      style={styles.numberButton}
      onPress={() => onPress(number.toString())}>
      <Text style={styles.numberText}>{number}</Text>
    </TouchableOpacity>
  );
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent={true}>
      <View style={styles.modalContainer}>
        <KeyboardScroll
          contentContainerStyle={{ flex: 1, justifyContent: 'flex-end' }}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.crossView} onPress={onClose}>
              <Image source={IMAGES.close} style={styles.closeImg} />
            </TouchableOpacity>

            <View
              style={{
                // flex: 1,
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginVertical: isIPad ? 20 : 10,
                zIndex: 1,
              }}>
              <TouchableOpacity
                style={
                  selectedDiscount == 0 ? styles.amountView : styles.amountLView
                }
                onPress={() => {
                  onPercentageChange('10');
                  setSelectedDiscount(0);
                }}>
                <Text
                  style={
                    selectedDiscount == 0 ? styles.amountTxt : styles.amountWTxt
                  }>
                  10%
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={
                  selectedDiscount == 1 ? styles.amountView : styles.amountLView
                }
                onPress={() => {
                  onPercentageChange('20');
                  setSelectedDiscount(1);
                }}>
                <Text
                  style={
                    selectedDiscount == 1 ? styles.amountTxt : styles.amountWTxt
                  }>
                  20%
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={
                  selectedDiscount == 2 ? styles.amountView : styles.amountLView
                }
                onPress={() => {
                  onPercentageChange('50');
                  setSelectedDiscount(2);
                }}>
                <Text
                  style={
                    selectedDiscount == 2 ? styles.amountTxt : styles.amountWTxt
                  }>
                  50%
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={
                  selectedDiscount == 3 ? styles.amountView : styles.amountLView
                }
                onPress={() => {
                  onPercentageChange('100');
                  setSelectedDiscount(3);
                }}>
                <Text
                  style={
                    selectedDiscount == 3 ? styles.amountTxt : styles.amountWTxt
                  }>
                  100%
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ margin: isIPad ? 30 : '2%', borderBottomWidth: 1, borderColor: 'lightgrey', marginBottom: 20 }}>
              <Text style={styles.pinDisplay}>
                {selectAmount || t('Discount Amount ($)')}
              </Text>
            </View>

            <View style={styles.container}>

              <View style={styles.numberPad}>
                <View style={styles.row}>
                  {[1, 2, 3].map(num => (
                    <NumberButton key={num} number={num} onPress={handleNumberPress} />
                  ))}
                </View>


                <View style={styles.row}>
                  {[4, 5, 6].map(num => (
                    <NumberButton key={num} number={num} onPress={handleNumberPress} />
                  ))}
                </View>

                <View style={styles.row}>
                  {[7, 8, 9].map(num => (
                    <NumberButton key={num} number={num} onPress={handleNumberPress} />
                  ))}
                </View>

                <View style={styles.lastRow}>
                  <TouchableOpacity
                    style={styles.doubleButton}
                    onPress={() => setSelectAmount(selectAmount + '.')}>
                    <Text style={styles.numberText}>.</Text>
                  </TouchableOpacity>

                  <NumberButton number={0} onPress={handleNumberPress} />

                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={handleDeletePress}>
                    <Image
                      source={IMAGES.Back}
                      style={styles.deleteIcon}
                      tintColor={'grey'}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={() => onSave(selectAmount)}>
              <Text style={styles.saveTxt}>{t('Submit')}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardScroll>
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
    paddingBottom: isIPad ? 40 : 20,
    height: '80%',
    maxHeight: '75%',
  },
  saveBtn: {
    height: isIPad ? 80 : 60,
    backgroundColor: '#FDBE6F',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  saveTxt: {
    fontSize: isIPad ? 25 : 18,
    fontFamily: FONTS.RICORDOSemiBold,
    color: 'white',
  },
  crossView: {
    height: isIPad ? 60 : 40,
    width: isIPad ? 60 : 40,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F4F4',
    alignSelf: 'flex-end',
    marginVertical: isIPad ? 20 : 0
  },
  closeImg: {
    height: isIPad ? 20 : 10,
    width: isIPad ? 20 : 10,
    tintColor: 'black',
  },
  signatureView: {
    height: 150,
    marginHorizontal: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D8D8D8',
    marginTop: 20,
    borderStyle: 'dashed',
  },
  ClearTxt: {
    fontSize: 16,
    fontFamily: FONTS.RICORDORegular,
    color: '#223890',
    textAlign: 'center',
    marginTop: 22,
  },
  amountView: {
    height: isIPad ? 100 : 50,
    flex: 1,
    backgroundColor: '#223890',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
    marginRight: 5,
  },
  amountLView: {
    height: isIPad ? 100 : 50,
    flex: 1,
    borderColor: '#223890',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
    marginRight: 5,
    borderWidth: 1,
  },
  amountTxt: {
    fontSize: isIPad ? 30 : 19,
    fontFamily: FONTS.RICORDORegular,
    color: 'white',
    fontWeight: '700'
  },
  amountWTxt: {
    fontSize: isIPad ? 30 : 19,
    fontFamily: FONTS.RICORDORegular,
    color: '#223890',
    fontWeight: '700'
  },
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinDisplay: {
    fontSize: isIPad ? 50 : 30,
    marginBottom: 12,
    color: 'grey',
    alignSelf: 'flex-start',
  },
  numberPad: {
    width: '100%',
    maxWidth: isIPad ? '50%' : '70%',
  },
  row: {
    marginBottom: isIPad ? 20 : 20,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  numberButton: {
    width: isIPad ? 70 : 40,
    height: isIPad ? 60 : 40,
    marginHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderRadius: 6,
    borderColor: 'lightgrey'
  },
  numberText: {
    color: 'grey',
    fontSize: isIPad ? 30 : 20,
    fontWeight: '700',
  },
  lastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  doubleButton: {
    width: isIPad ? 90 : 50,
    height: isIPad ? 90 : 50,
    alignItems: 'center',
    marginHorizontal: 5,
    justifyContent: 'center',
  },
  deleteButton: {
    width: isIPad ? 90 : 50,
    height: isIPad ? 90 : 50,
    alignItems: 'center',

    justifyContent: 'center',
  },
  deleteIcon: {
    width: isIPad ? 35 : 24,
    height: isIPad ? 35 : 24,
    tintColor: 'grey'
  },
});
export { DiscountModal };
