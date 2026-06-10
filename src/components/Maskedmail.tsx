import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  DeviceEventEmitter,
} from 'react-native';
import { FONTS, IMAGES } from '../assets';
import { CheckIpad } from '../utilities/securestorage';

let isPad = CheckIpad();

interface InputProps {
  style?: object;
  pickerValue: string;
  placeholder: string;
  autoCapitalize?: string;
  isQrCode?: boolean;
  onChangeText: (val: string) => void;
  editable?: boolean;
  placeholderTextColor?: string;
  maxLength?: number;
  onBlur?: () => void;
}

const MaskedInput: React.FC<InputProps> = ({
  style,
  pickerValue,
  placeholder,
  onChangeText,
  autoCapitalize = 'none',
  isQrCode = false,
  editable = true,
  placeholderTextColor = 'black',
  maxLength,
  onBlur,
}) => {
  
  const [inputValue, setInputValue] = useState(pickerValue || '');

  useEffect(() => {
    setInputValue(pickerValue || '');
  }, [pickerValue]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('add_package_success', () => {
      setInputValue('');
    });
    return () => sub.remove();
  }, []);

  return (
    <View>
      <View style={styles.inputView}>
        {inputValue ? (
          <Text style={[styles.blueTxt, { fontSize: isPad ? 20 : 14 }]}>
            {placeholder}
          </Text>
        ) : null}

        <View style={isQrCode ? styles.qrView : {}}>
          <TextInput
            value={inputValue}
            onChangeText={(val) => {
              onChangeText(val);
              setInputValue(val);
            }}
            onBlur={onBlur}
            placeholder={placeholder}
            editable={editable}
            maxLength={maxLength || undefined}
            placeholderTextColor={placeholderTextColor}
            autoCapitalize={autoCapitalize}
            style={[
              styles.input,
              style,
              { paddingBottom: isQrCode ? 8 : 4, fontSize: isPad ? 24 : 16 },
            ]}
          />
        </View>
      </View>
    </View>
  );
};

export { MaskedInput };

const styles = StyleSheet.create({
  inputView: {
    paddingVertical: isPad ? 20 : 10,
    marginHorizontal: 30,
  },
  blueTxt: {
    fontSize: 14,
    fontFamily: FONTS.RICORDORegular,
    color: '#223890',
  },
  input: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#98989850',
    color: 'black',
    fontSize: 16,
    fontFamily: FONTS.RICORDORegular,
  },
  qrView: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
