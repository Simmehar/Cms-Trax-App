import React, { useContext, useState, useRef, useEffect } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackHeader } from '../components/Header';
import { FONTS, IMAGES } from '../assets';
import { ShipListModal } from '../components/ShipListModal';
import { SuccessModal } from '../components/SuccessModal';
import { KeyboardScroll } from '../components/KeyboardScroll';
import { isIPad } from '../utilities/securestorage';
import axios from 'axios';
import { Backend_URL } from '../util/apiCalls';
import { AuthContext } from '../contexts';
import { useTranslation } from 'react-i18next';

const AddRecipient: React.FC = ({ navigation }: any) => {
  const { t } = useTranslation();
  const { user } = useContext(AuthContext);

  const [visible, setVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('');
  const [successVisible, setSuccessVisible] = useState(false);
  const [shipName, setShipName] = useState<any>(null);
  const [departmentName, setDepartmentName] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [idUnit, setIdUnit] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHospitality, setIsHospitality] = useState(false);
  const [name, setName] = useState({
    firstName: '',
    lastName: '',
  });

  const firstNameRef = useRef<TextInput>(null);
  const lastNameRef = useRef<TextInput>(null);
  const idUnitRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);

  useEffect(() => {
    fetchBusinessType();
  }, []);

  const fetchBusinessType = async () => {
    try {
      const storedType = await AsyncStorage.getItem('BUSINESS_TYPE');
      setIsHospitality(storedType === 'hotels-and-hospitality');
    } catch (e) {
      console.warn('Error reading BUSINESS_TYPE in AddRecipient', e);
    }
  };

  // Capitalize first letter of every word
  const capitalizeFirstLetter = (text: string) => {
    return text.replace(/(^|\s)\S/g, char => char.toUpperCase());
  };

  const validateEmail = (emailStr: string) => {
    return String(emailStr)
      .trim()
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
      );
  };

  const validateName = (nameStr: string) => {
    return String(nameStr)
      .trim()
      .toLowerCase()
      .match(/^[a-z][a-z,. '-]*$/i);
  };

  const submitHandler = () => {
    if (!name.firstName?.trim()) {
      Alert.alert(t('Please enter the first name'));
      return;
    }

    if (!validateName(name.firstName)) {
      Alert.alert(
        t(
          "Name should be alphabets and only space - . and ' are allowed and must start with an alphabet.",
        ),
      );
      return;
    }

    // Required field validation for non-hospitality
    if (!isHospitality) {
      if (!name.lastName?.trim()) {
        Alert.alert(t('Please enter the last name'));
        return;
      }

      if (!shipName?.name) {
        Alert.alert(t('Please select the ship!'));
        return;
      }

      if (!departmentName?.name) {
        Alert.alert(t('Please select the division!'));
        return;
      }

      // Email validation only for non-hospitality
      if (email && !validateEmail(email)) {
        Alert.alert(t('Please provide a valid email.'));
        return;
      }
    }

    // Validate last name if provided
    if (name.lastName && !validateName(name.lastName)) {
      Alert.alert(
        t(
          "Name should be alphabets and only space - . and ' are allowed and must start with an alphabet.",
        ),
      );
      return;
    }

    Keyboard?.dismiss();
    setIsLoading(true);

    // Build API payload conditionally
    const payload: any = {
      first_name: name.firstName,
      last_name: name.lastName || '',
      id_unit: idUnit,
    };

    if (!isHospitality) {
      payload.ship_id = shipName?.id;
      payload.dept = departmentName?.id;
      if (email.trim()) payload.email = email.trim();
    } else {
      if (shipName?.id) payload.ship_id = shipName.id;
      if (departmentName?.id) payload.dept = departmentName.id;
      if (phoneNumber.trim()) payload.phone = phoneNumber.trim();
    }
    console.log('payload=================', payload)
    console.log('Backend_URL',Backend_URL)
    axios
      .post(Backend_URL + '/create-customer', payload, {
        headers: { Authorization: 'Bearer ' + user?.token },
      })
      .then(response => {
        if (response?.data) {
          setSuccessVisible(true);
        }
      })
      .catch(error => {
        console.log('error.data', error?.response?.data?.data)
        if (
          error?.response?.data?.data?.email?.[0] ===
          'user with this email already exists.'
        ) {
          Alert.alert(t('User with this email already exists.'));
          return;
        }
        Alert.alert(t('Something went wrong!'), t('Please try again later.'));
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <View style={styles.mainView}>
      <BackHeader title={t(isHospitality ? 'Add Guest' : 'Add Recipient')} />

      <ShipListModal
        visible={visible}
        onClose={() => setVisible(false)}
        activeTab={activeTab}
        getValue={(val: any) => {
          if (activeTab === 'Ship') {
            setShipName(val);
          } else if (activeTab === 'Division') {
            setDepartmentName(val);
          }
        }}
      />

      {successVisible && (
        <SuccessModal
          visible={successVisible}
          content={{
            heading: t('GREAT WORK!'),
            middle: `${name.firstName} ${name.lastName}`.trim(),
            lable: t(isHospitality ? 'Guest added successfully.' : 'is added as recipient.'),
          }}
          onClose={() => {
            setSuccessVisible(false);
            navigation?.goBack?.();
          }}
        />
      )}

      {/* Input Fields Container */}
      <KeyboardScroll
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}>
        {/* First Name Field */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => firstNameRef.current?.focus()}
          style={[styles.inputContainer, { marginTop: 15 }]}>
          {name.firstName ? (
            <Text style={styles.floatingLabel}>{t('First Name*')}</Text>
          ) : null}
          <TextInput
            ref={firstNameRef}
            autoCapitalize="words"
            placeholder={t('First Name*')}
            placeholderTextColor="#000"
            style={styles.textInputField}
            value={name.firstName}
            onChangeText={val => {
              const formatted = capitalizeFirstLetter(val);
              setName(prev => ({ ...prev, firstName: formatted }));
            }}
          />
        </TouchableOpacity>

        {/* Last Name Field */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => lastNameRef.current?.focus()}
          style={styles.inputContainer}>
          {name.lastName ? (
            <Text style={styles.floatingLabel}>
              {t(isHospitality ? 'Last Name' : 'Last Name*')}
            </Text>
          ) : null}
          <TextInput
            ref={lastNameRef}
            autoCapitalize="words"
            placeholder={t(isHospitality ? 'Last Name' : 'Last Name*')}
            placeholderTextColor="#000"
            style={styles.textInputField}
            value={name.lastName}
            onChangeText={val => {
              const formatted = capitalizeFirstLetter(val);
              setName(prev => ({ ...prev, lastName: formatted }));
            }}
          />
        </TouchableOpacity>

        {/* Ship Selector (Visible only for non-hospitality) */}
        {!isHospitality && (
          <TouchableOpacity
            style={styles.pickerContainer}
            onPress={() => {
              setActiveTab('Ship');
              setVisible(true);
            }}>
            {shipName?.name ? (
              <View style={{ flex: 1 }}>
                <Text style={styles.floatingLabel}>
                  {t('Select Ship/building')}
                </Text>
                <Text style={styles.pickerValueText}>{shipName?.name}</Text>
              </View>
            ) : (
              <Text style={styles.pickerPlaceholderText}>
                {t('Select Ship/Building')}
              </Text>
            )}
            <Image
              source={IMAGES.down_arrow}
              style={[
                styles.arrowIcon,
                { marginTop: shipName?.name ? 8 : 0 },
              ]}
            />
          </TouchableOpacity>
        )}

        {/* Department Selector (Visible only for non-hospitality) */}
        {!isHospitality && (
          <TouchableOpacity
            style={styles.pickerContainer}
            onPress={() => {
              setActiveTab('Division');
              setVisible(true);
            }}>
            {departmentName?.name ? (
              <View style={{ flex: 1 }}>
                <Text style={styles.floatingLabel}>{t('Select Department*')}</Text>
                <Text style={styles.pickerValueText}>
                  {departmentName?.name}
                </Text>
              </View>
            ) : (
              <Text style={styles.pickerPlaceholderText}>
                {t('Select Department*')}
              </Text>
            )}
            <Image
              source={IMAGES.down_arrow}
              style={[
                styles.arrowIcon,
                { marginTop: departmentName?.name ? 8 : 0 },
              ]}
            />
          </TouchableOpacity>
        )}

        {/* ID Unit or Room Field */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => idUnitRef.current?.focus()}
          style={styles.inputContainer}>
          {idUnit ? (
            <Text style={styles.floatingLabel}>
              {t(isHospitality ? 'Room #' : 'ID #/ Unit #*')}
            </Text>
          ) : null}
          <TextInput
            ref={idUnitRef}
            autoCapitalize="words"
            placeholder={t(isHospitality ? 'Room #' : 'ID #/ Unit #*')}
            placeholderTextColor="#000"
            style={styles.textInputField}
            value={idUnit}
            onChangeText={setIdUnit}
          />
        </TouchableOpacity>

        {/* Phone Number Field (Hospitality only) */}
        {isHospitality && (
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => phoneRef.current?.focus()}
            style={styles.inputContainer}>
            {phoneNumber ? (
              <Text style={styles.floatingLabel}>{t('Phone Number')}</Text>
            ) : null}
            <TextInput
              ref={phoneRef}
              keyboardType="phone-pad"
              placeholder={t('Phone Number')}
              placeholderTextColor="#000"
              style={styles.textInputField}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
            />
          </TouchableOpacity>
        )}

        {/* Email Address Field (Non-hospitality only) */}
        {!isHospitality && (
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => emailRef.current?.focus()}
            style={styles.inputContainer}>
            {email ? (
              <Text style={styles.floatingLabel}>{t('Email Address')}</Text>
            ) : null}
            <TextInput
              ref={emailRef}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder={t('Email Address')}
              placeholderTextColor="#000"
              style={styles.textInputField}
              value={email}
              onChangeText={setEmail}
            />
          </TouchableOpacity>
        )}
      </KeyboardScroll>

      {/* Action Button */}
      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity
          style={styles.btnView}
          disabled={isLoading}
          onPress={submitHandler}>
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.btntxt}>
              {t(isHospitality ? 'Add Guest' : 'Add Recipient')}
            </Text>
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
  scrollContent: {
    paddingBottom: 30,
  },
  inputContainer: {
    marginHorizontal: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#98989850',
    paddingTop: isIPad ? 22 : 16,
    paddingBottom: Platform.OS === 'ios' ? 8 : 4,
    marginVertical: isIPad ? 12 : 6,
  },
  textInputField: {
    color: 'black',
    fontSize: isIPad ? 22 : 16,
    fontFamily: FONTS.PoppinsRegular,
    paddingVertical: Platform.OS === 'ios' ? 4 : 0,
    minHeight: 28,
  },
  floatingLabel: {
    fontSize: isIPad ? 16 : 12,
    fontFamily: FONTS.PoppinsRegular,
    color: '#223890',
    marginBottom: 2,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#98989850',
    paddingTop: isIPad ? 24 : 18,
    paddingBottom: isIPad ? 14 : 10,
    marginVertical: isIPad ? 12 : 6,
  },
  pickerPlaceholderText: {
    color: 'black',
    fontSize: isIPad ? 22 : 16,
    fontFamily: FONTS.PoppinsRegular,
    flex: 1,
  },
  pickerValueText: {
    color: 'black',
    fontSize: isIPad ? 22 : 16,
    fontFamily: FONTS.PoppinsRegular,
  },
  arrowIcon: {
    height: isIPad ? 18 : 12,
    width: isIPad ? 18 : 12,
    resizeMode: 'contain',
  },
  bottomButtonContainer: {
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    paddingTop: 10,
    backgroundColor: 'white',
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