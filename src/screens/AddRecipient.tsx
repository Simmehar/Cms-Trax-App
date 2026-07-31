import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  Keyboard,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { BackHeader } from '../components/Header';
import { FONTS, IMAGES } from '../assets';
import { ShipListModal } from '../components/ShipListModal';
import { SuccessModal } from '../components/SuccessModal';
import { KeyboardScroll } from '../components/KeyboardScroll';
import { InputPicker } from '../components/InputPicker';
import { isIPad } from '../utilities/securestorage';
import axios from 'axios';
import { Backend_URL } from '../util/apiCalls';
import { AuthContext } from '../contexts';
import { useTranslation } from 'react-i18next';

const AddRecipient: React.FC = ({ navigation }: any) => {
  const [visible, setVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('');
  const [successVisible, setSuccessVisible] = useState(false);
  const [shipName, setShipName] = useState<any>();
  const [departmentName, setDepartmentName] = useState<any>();
  const [email, setEmail] = useState<any>();
  const [idUnit, setIdUnit] = useState<any>();
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation();
  const [name, setName] = useState({
    firstName: '',
    lastName: '',
  });

  const { user } = useContext(AuthContext);

  const validateEmail = (email: any) => {
    return String(email)
      .trim()
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
      );
  };

  const validateName = (name: any) => {
    return String(name)
      .trim()
      .toLowerCase()
      .match(/^[a-z][a-z,. '-]*$/i);
  };

  const submitHandler = () => {
    let obj: any = {};
    if (
      !name.firstName ||
      !name.lastName ||
      !shipName?.name ||
      !departmentName?.name
    ) {
      if (!name.firstName) {
        obj.firstName = 'This field is required!';
        Alert.alert(t('Please enter the first name'));
        return;
      }
      if (!name.lastName) {
        obj.lastName = 'This field is required!';
        Alert.alert(t('Please enter the last name'));
        return;
      }
      if (!shipName?.name) {
        obj.ship = 'This field is required!';
        Alert.alert(t('Please select the ship!'));
        return;
      }
      if (!departmentName?.name) {
        obj.department = 'This field is required!';
        Alert.alert(t('Please select the division!'));
        return;
      }

      return;
    }
    if (email && !validateEmail(email)) {
      obj.email = 'Please provide a valid email.';
      Alert.alert(t('Please provide a valid email.'));
    }
    if (name.firstName && !validateName(name.firstName)) {
      obj.firstName =
        "Name should be alphabets and only space - . and ' are allowed and must start with an alphabet.";
      Alert.alert(
        t("Name should be alphabets and only space - . and ' are allowed and must start with an alphabet.")
      );

      return;
    }
    if (name.lastName && !validateName(name.lastName)) {
      obj.lastName =
        "Name should be alphabets and only space - . and ' are allowed and must start with an alphabet.";
      Alert.alert(
  t("Name should be alphabets and only space - . and ' are allowed and must start with an alphabet.")
);
      return;
    }
    if (obj?.email || obj?.firstName || obj?.lastName) return;
    Keyboard?.dismiss();
    setIsLoading(true);

    axios
      .post(
        Backend_URL + '/create-customer',
        {
          first_name: name.firstName,
          last_name: name.lastName,
          ship_id: shipName.id,
          dept: departmentName.id,
          ...(email && { email: email }),
        },
        { headers: { Authorization: 'Bearer ' + user?.token } },
      )
      .then(response => {
        if (response?.data) {
          // Alert.alert(
          //   'Success!',
          //   response?.data?.data?.first_name +
          //     ' ' +
          //     response?.data?.data?.last_name +
          //     ' recipient has been added.',
          //   [
          //     {
          //       text: 'Ok',
          //       onPress: () => navigation.goBack(),
          //     },
          //   ],
          // );
          setSuccessVisible(true);
        }
      })
      .catch(error => {
        let obj = {};
        if (
          error?.response?.data?.data?.email?.[0] ==
          'user with this email already exists.'
        ) {
          obj.email = 'user with this email already exists.';
          Alert.alert(t('User with this email already exists.'));
          return;
        }
        if (
          error?.response?.data?.data?.first_name?.[0] ==
          'This field may not be blank.'
        ) {
          obj.firstName = 'This field may not be blank.';
        }
        if (
          error?.response?.data?.data?.last_name?.[0] ==
          'This field may not be blank.'
        ) {
          obj.lastName = 'This field may not be blank.';
        }
        Alert.alert(t('Something went wrong!'), t('Please try again later.'));
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <View style={styles.mainView}>
      <BackHeader title={t('Add Recipient')} />

      <ShipListModal
        visible={visible}
        onClose={() => {
          setVisible(false);
        }}
        activeTab={activeTab}
        getValue={(val: string) => {
          activeTab == 'Ship'
            ? setShipName(val)
            : activeTab == 'Division'
              ? setDepartmentName(val)
              : '';
        }}
      />

      {successVisible ? (
        <SuccessModal
          visible={successVisible}
          content={{
            heading: t('GREAT WORK!'),
            middle: name.firstName + ' ' + name.lastName,
            lable: t('is added as recipient.'),
          }}
          onClose={() => setSuccessVisible(!successVisible)}
        />
      ) : (
        <></>
      )}

      <KeyboardScroll contentContainerStyle={{}}>
        <InputPicker
          isPicker={false}
          autoCapitalize={'word'}
          isQrCode={false}
         placeholder={t('First Name*')}
          onPickerClick={() => { }}
          style={{ marginHorizontal: 0, marginTop: 28,paddingVertical:Platform.OS === 'ios' ? 10 : 0, }}
          pickerValue={name.firstName}
          onChangeText={val => {
            setName(prev => {
              return {
                firstName: val,
                lastName: prev.lastName,
              };
            });
          }}
        />

        <InputPicker
          isPicker={false}
          isQrCode={false}
          autoCapitalize={'word'}
          placeholder={t('Last Name*')}
          onPickerClick={() => { }}
          style={{marginHorizontal: 0, marginVertical: Platform.OS === 'ios' ? 10 : 0,}}
          pickerValue={name.lastName}
          onChangeText={val => {
            setName(prev => {
              return {
                firstName: prev.firstName,
                lastName: val,
              };
            });
          }}
        />
        <InputPicker
          isPicker={true}
          isQrCode={false}
          placeholder={t('Select Ship/department*')}
          style={{ paddingTop: isIPad ? 20 : 10 }}
          onPickerClick={() => {
            setVisible(true), setActiveTab('Ship');
          }}
          onChangeText={() => { }}
          pickerValue={shipName?.name}
        />
        {/* <View style={{marginTop:10}} /> */}
        <InputPicker
          isPicker={true}
          isQrCode={false}
          placeholder={t('Select Department*')}
          style={{ paddingTop: isIPad ? 20 : 10, }}
          onPickerClick={() => {
            setActiveTab('Division'), setVisible(true);
          }}
          pickerValue={departmentName?.name}
        />
        <InputPicker
          isPicker={false}
          autoCapitalize={'word'}
          isQrCode={false}
          style={{marginHorizontal: 0, marginVertical: Platform.OS === 'ios' ? 10 : 0,}}
          placeholder={t('ID #/ Unit #*')}
          onPickerClick={() => { }}
          pickerValue={idUnit}
          onChangeText={val => {
            setIdUnit(val);
          }}
        />
        <InputPicker
          isPicker={false}
          isQrCode={false}
          placeholder={t('Email Address')}
          onPickerClick={() => { }}
          style={{marginHorizontal: 0, marginVertical: Platform.OS === 'ios' ? 10 : 0,}}
          pickerValue={email}
          onChangeText={setEmail}
        />
      </KeyboardScroll>
      <View style={{ flex: 1, justifyContent: 'flex-end', marginBottom: 20 }}>
        <TouchableOpacity
          style={styles.btnView}
          disabled={isLoading}
          // onPress={() => setSuccessVisible(!successVisible)}>
          onPress={submitHandler}>
          {isLoading ? (
            <ActivityIndicator color={'white'} />
          ) : (
            <Text style={styles.btntxt}>Add Recipient</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainView: {
    flex: 1,
    backgroundColor: 'white',
    paddingTop: isIPad ? 80 : 50,
  },
  inPutView: {
    marginHorizontal: 30,
    // marginTop :40
  },
  input: {
    marginTop: 22.5,
    fontSize: 14,
    fontFamily: FONTS.PoppinsRegular,
    color: 'black',
    borderBottomWidth: 1,
    paddingBottom: 7.5,
    borderBottomColor: '#98989850',
  },
  rowView: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22.5,
    borderBottomWidth: 1,
    paddingBottom: 7.5,
    borderBottomColor: '#98989850',
  },
  label: {
    fontSize: 14,
    fontFamily: FONTS.PoppinsRegular,
    color: '#989898',
    flex: 1,
  },
  btnView: {
    height: isIPad ? 65 : 60,
    backgroundColor: '#FDBE6F',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 36,
    marginHorizontal: 30,
  },
  btntxt: {
    fontSize: isIPad ? 24 : 18,
    fontFamily: FONTS.PoppinsSemiBold,
    color: 'white',
  },
});
export { AddRecipient };
