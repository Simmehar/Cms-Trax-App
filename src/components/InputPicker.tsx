import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  DeviceEventEmitter,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { FONTS, ICONS, IMAGES } from '../assets';
import { SvgXml } from 'react-native-svg';
import { CheckIpad } from '../utilities/securestorage';
import { useNavigation } from '@react-navigation/native';
import ScanBarCodeModal from './ScanBarCodeModal';
import { usePackageContext } from '../contexts/packagecontext';

interface inputProps {
  isPicker: boolean;
  style: {};
  inputView: {};
  onPickerClick: () => void;
  pickerValue: string;
  placeholder: string;
  autoCapitalize?: string;
  isQrCode: boolean;
  onChangeText: (val: string) => void;
  selectAmount: any;
  setSelectAmount: any;
  editable: boolean;
  disablePicker: boolean;
  hideDropdownButton: boolean;
  placeholderTextColor: any;
  maxLength: any;
  placeholerstyle: any;
}

let isPad = CheckIpad();

const InputPicker: React.FC<inputProps> = ({
  isQrCode,
  isPicker,
  style,
  inputView,
  onPickerClick,
  pickerValue,
  placeholder,
  onChangeText,
  selectAmount,
  setSelectAmount,
  editable,
  disablePicker,
  hideDropdownButton,
  autoCapitalize,
  placeholderTextColor,
  maxLength,
  placeholerstyle
}) => {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    setInputValue(pickerValue || '');
  }, [pickerValue]);

  const navigation = useNavigation<any>();
  const inputRef = React.useRef<TextInput>(null);

  const [barCodeModalVisible, setBarCodeModalVisible] = useState(false);

  useEffect(() => {
    DeviceEventEmitter.addListener('add_package_success', () => {
      setInputValue('');
    });
  }, []);

  return (
    <View style={{ backgroundColor: null }}>
      {isPicker ? (
        <TouchableOpacity
          onPress={onPickerClick}
          style={[styles.pickerView]}
          disabled={disablePicker || false}>
          {pickerValue ? (
            <View style={{ flex: 1 }}>
              <Text style={[styles.blueTxt, { fontSize: isPad ? 20 : 14 }]}>
                {placeholder}
              </Text>
              <Text style={[styles.valTxt, { fontSize: isPad ? 25 : 16, marginTop: isPad ? 5 : 'none' }]}>
                {pickerValue ? pickerValue : ''}
              </Text>
            </View>
          ) : (
            <Text
              style={[
                styles.trckId,
                { fontSize: isPad ? 24 : 16 },
                placeholerstyle,
              ]}>
              {placeholder}
            </Text>
          )}
          {!hideDropdownButton && (
            <TouchableOpacity onPress={onPickerClick}>
              <Image
                source={IMAGES.down_arrow}
                style={{ height: isPad ? 20 : 12, width: isPad ? 20 : 12, marginTop: pickerValue ? 18 : 0 }}
              />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      ) : (

        <TouchableOpacity
          activeOpacity={1} // Click hone par flash na ho
          onPress={() => inputRef.current?.focus()} // Area par click hote hi keyboard khule
          style={[styles.inputView,inputView]}
        >
          {inputValue ? (
            <Text style={[styles.blueTxt, { fontSize: isPad ? 20 : 14 }]}>
              {placeholder}
            </Text>
          ) : null}

          <View style={isQrCode ? styles.qrView : { flexDirection: 'row', alignItems: 'center' }}>
            <TextInput
              ref={inputRef} // Ref assign karein
              autoCapitalize={autoCapitalize || 'none'}
              placeholder={placeholder}
              maxLength={maxLength ? maxLength : null}
              placeholderTextColor={placeholderTextColor || 'black'}
              style={[
                styles.input,
                style,
                {
                  // paddingBottom: isQrCode ? 8 : 4,
                  fontSize: isPad ? 24 : 16,
                  borderBottomWidth: 0, // Border main container (inputView) par shift kar sakte hain
                },
              ]}
              value={inputValue}
              onChangeText={val => {
                onChangeText(val);
                setInputValue(val);
              }}
              editable={editable !== undefined ? editable : true}
            />

            {isQrCode && (
              <TouchableOpacity
                style={{ marginBottom: 10 }}
                onPress={() => setBarCodeModalVisible(true)}>
                <SvgXml
                  xml={ICONS.header.scan}
                  width={isPad ? 35 : 25}
                  height={isPad ? 35 : 25}
                />
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      )}

      {barCodeModalVisible && (
        <ScanBarCodeModal
          visible={barCodeModalVisible}
          setVisible={setBarCodeModalVisible}
          setInputValue={setInputValue}
          onChangeText={onChangeText}
        />
      )}
    </View>
  );
};

export { InputPicker };

const styles = StyleSheet.create({
  mainView: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  blueTxt: {
    fontSize: 14,
    fontFamily: FONTS.RICORDORegular,
    color: '#223890',
  },
  trckId: {
    color: 'black',
    fontSize: 16,
    fontFamily: FONTS.RICORDORegular,
    flex: 1,
  },
  codeImg: {
    height: 21.5,
    width: 21.5,
  },
  valTxt: {
    color: 'black',
    fontSize: 16,
    fontFamily: FONTS.RICORDORegular,
    // flex: 1,
  },
  // pickerView: {
  //   // flex: 1,
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   // paddingVertical: isPad?20:10,
  //   paddingTop: isPad?20:10,
  //   paddingBottom: isPad?10:5,
  //   marginBottom: isPad?20:10,
  //   borderBottomWidth: 1,
  //   borderBottomColor: '#98989850',
  //   marginHorizontal: 30,
  //   // backgroundColor:'red'
  // },
  // input: {
  //   flex: 1,
  //   borderBottomWidth: 1,
  //   borderBottomColor: '#98989850',
  //   color: 'black',
  //   fontSize: 16,
  //   fontFamily: FONTS.PoppinsRegular,
  //   // minHeight: 40,
  //   backgroundColor:'yellow'
  // },
  // inputView: {
  //   paddingVertical: isPad?20:10,
  //   marginHorizontal: 30,
  //   backgroundColor:'green',
  // },
  qrView: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    //  paddingVertical: 8,
    ///  marginTop: 20,
    ///  marginHorizontal: 30,
  },
  pickerView: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: isPad ? 20 : 10,
    paddingBottom: isPad ? 10 : 10,
    // marginBottom: isPad ? 20 : 10,
    borderBottomWidth: 1,
    borderBottomColor: '#98989850',
    marginHorizontal: 30,
    // backgroundColor:'red'
  },
  inputView: {
    // Isse pickerView ke exact match banayein
    borderBottomWidth: 1,
    borderBottomColor: '#98989850',
    // paddingTop: isPad ? 20 : 10,
    // paddingBottom: isPad ? 10 : 5,
    marginHorizontal: 30,
    // marginBottom: isPad ? 20 : 10,
    // marginTop:isPad?12:8,
  },
  input: {
    flex: 1,
    color: 'black',
    fontSize: 15,
    fontFamily: FONTS.RICORDORegular,
    // borderBottomWidth: 0, // Yaha border zero kardein kyuki container mein de di hai
  },
});
