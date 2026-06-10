import React, {useState, useEffect} from 'react';
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
import {FONTS, ICONS, IMAGES} from '../assets';
import {useNavigation} from '@react-navigation/native';
import {isIPad} from '../utilities/securestorage';

interface SuccessProps {
  visible: boolean;
  onClose: () => void;
  onDone: () => void;
  setIsCredit?: (value: boolean) => void;
isCredit?: boolean;
  amountState: any;
  dispatch: any;
}

const DuePaymentModal: React.FC<SuccessProps> = ({
  visible,
  onClose,
  onDone,
  amountState,
  dispatch,
  setIsCredit,
  isCredit
}) => {
  
  let navigation = useNavigation<any>();

  // Removed unnecessary credit dispatch logic

  return (
    <Modal visible={visible}  transparent={true}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.crossView} onPress={onClose}>
            <Image source={IMAGES.close} style={styles.closeImg} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Payment Completed</Text>
          <View style={{marginTop: isIPad?34:14}}>
            <Image
              source={IMAGES.coins}
              style={styles.gifImg}
              resizeMode="contain"
            />
          </View>
          {Number(amountState.paidAmount) -
            Number(amountState.totalPayableAmount) >
            0 && (
            <Text style={styles.congrats}>
              ${' '}
              {Number(
                Number(amountState.paidAmount) -
                  Number(amountState.totalPayableAmount),
              ).toFixed(2)}{' '}
              CHANGE DUE
            </Text>
          )}

          {/* {Number(amountState.paidAmount) - Number(amountState.payable_amount) >
            0 && ( */}
          {Number(amountState.paidAmount) -
            Number(amountState.totalPayableAmount) >
          0 ? (
            <View style={styles.rowView}>
              {!isCredit ? (
                <TouchableOpacity
                  onPress={() => setIsCredit(true)}
                  style={styles.box}></TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.blueBox}
                  onPress={() => setIsCredit(false)}>
                  <Image style={styles.tick} source={IMAGES.check} />
                </TouchableOpacity>
              )}
              <Text style={styles.miLable}>Add to Credit</Text>
            </View>
          ) : (
            <></>
          )}

          <TouchableOpacity
            onPress={() => {
              onDone();
            }}
            style={styles.subBtn}>
            <Text style={styles.subTxt}>Next</Text>
          </TouchableOpacity>
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
    maxHeight: '75%',
  },
  crossView: {
    height: isIPad ? 80 : 48,
    width: isIPad ? 80 : 48,
    borderRadius: 60 / 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F4F4',
    alignSelf: 'flex-end',
  },
  closeImg: {
    height: isIPad ? 20 : 10,
    width: isIPad ? 20 : 10,
    tintColor: 'black',
  },
  gifImg: {
    height: isIPad?100:83,
    width: isIPad?130:97,
    resizeMode: 'cover',
    alignSelf: 'center',
  },
  topTitle: {
    fontSize: isIPad ? 30 : 22,
    fontFamily: FONTS.RICORDOSemiBold,
    color: '#FDBE6F',
    textAlign: 'center',
  },
  congrats: {
    fontSize: isIPad ? 35 : 26,
    fontFamily: FONTS.RICORDORegular,
    color: '#002B45',
    textAlign: 'center',
    marginTop: 26,
  },
  botTle: {
    fontSize: 16,
    fontFamily: FONTS.RICORDORegular,
    color: '#6F7884',
    textAlign: 'center',
  },
  miLable: {
    fontSize: isIPad ? 24 : 20,
    fontFamily: FONTS.RICORDORegular,
    color: 'black',
    marginLeft: 5,
  },
  rowView: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 35,
  },
  box: {
    height: isIPad ? 30 : 26,
    width: isIPad ? 30 : 26,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D6D6D6',
  },
  tick: {
    height: isIPad ? 12 : 9,
    width: isIPad ? 16 : 13,
    tintColor: 'white',
  },
  subBtn: {
    height: isIPad ? 65 : 60,
    // marginHorizontal : 16,
    backgroundColor: '#FDBE6F',
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
  },
  subTxt: {
    fontSize: isIPad ? 24 : 18,
    fontFamily: FONTS.RICORDOSemiBold,
    color: 'white',
  },
  blueBox: {
    height: isIPad ? 30 : 26,
    width: isIPad ? 30 : 26,
    backgroundColor: '#223890',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
});

export {DuePaymentModal};
