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
  DeviceEventEmitter,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackHeader } from '../components/Header';
import { FONTS, IMAGES } from '../assets';
import { ShipListModal, RECIPIENT_ADDED_EVENT } from '../components/ShipListModal';
import { recipientSearchApi } from '../utilities/ApiCalls';
import { SuccessModal } from '../components/SuccessModal';
import { KeyboardScroll } from '../components/KeyboardScroll';
import CountryCodePicker, { getPhoneDigits } from '../components/CountryCodePicker';
import WarningPopup from '../components/WarningPopup';
import { isIPad } from '../utilities/securestorage';
import axios from 'axios';
import { Backend_URL } from '../util/apiCalls';
import { AuthContext } from '../contexts';
import { useTranslation } from 'react-i18next';

const AddRecipient: React.FC = ({ navigation, route }: any) => {
  const { t } = useTranslation();
  const { user } = useContext(AuthContext);
  // Set when opened from a guest picker: go back to that screen (e.g. Home)
  // after saving instead of the default Search screen.
  const returnTo: string | undefined = route?.params?.returnTo;

  const [visible, setVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('');
  const [successVisible, setSuccessVisible] = useState(false);
  const [shipName, setShipName] = useState<any>(null);
  const [departmentName, setDepartmentName] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  const phoneDigits = getPhoneDigits(countryCode);
  // Validation warning popup: message plus the field to focus after OK
  const [warning, setWarning] = useState<{ message: string; focus?: () => void } | null>(null);
  const showWarning = (message: string, focus?: () => void) => {
    Keyboard?.dismiss();
    setWarning({ message, focus });
  };
  const handleCountryCode = (code: string) => {
    setCountryCode(code);
    // Drop digits that no longer fit the new country's number length
    setPhoneNumber(prev => prev.slice(0, getPhoneDigits(code).max));
  };
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

  /**
   * Builds a recipient object (same shape as the /customers list) for the
   * guest that was just created, so pickers can select it right away.
   * Falls back to a name search when the create response has no id.
   */
  const buildCreatedRecipient = async (responseData: any) => {
    const created =
      responseData?.data ?? responseData?.customer ?? responseData ?? {};
    const firstName = name.firstName.trim();
    const lastName = (name.lastName || '').trim();

    let recipient: any = {
      id: created?.id,
      first_name: created?.first_name ?? firstName,
      last_name: created?.last_name ?? lastName,
      email: created?.email ?? (email.trim() || null),
      phone:
        created?.phone_number ??
        created?.phone ??
        (phoneNumber.trim() ? `${countryCode}${phoneNumber.trim()}` : null),
      ship: created?.ship ?? shipName?.name ?? null,
      ship_id: created?.ship_id ?? shipName?.id ?? null,
      department_id: created?.department_id ?? departmentName?.id ?? null,
      department_name: created?.department_name ?? departmentName?.name ?? null,
      is_active: created?.is_active ?? true,
      payable_amount: created?.payable_amount ?? '0',
    };

    if (recipient.id == null) {
      try {
        const results: any[] =
          (await recipientSearchApi(
            user,
            encodeURIComponent(`${firstName} ${lastName}`.trim()),
          )) || [];
        const matches = results.filter(
          r =>
            (r?.first_name || '').trim().toLowerCase() === firstName.toLowerCase() &&
            (r?.last_name || '').trim().toLowerCase() === lastName.toLowerCase(),
        );
        // Newest record (highest id) is the one just created.
        const match = matches.sort((a, b) => (b?.id ?? 0) - (a?.id ?? 0))[0];
        if (match) recipient = { ...recipient, ...match };
      } catch (e) {
        console.warn('Could not resolve newly created recipient', e);
      }
    }

    return recipient;
  };

  const submitHandler = () => {
    if (!name.firstName?.trim()) {
      showWarning(t('Please enter the first name'), () => firstNameRef.current?.focus());
      return;
    }

    if (!validateName(name.firstName)) {
      showWarning(
        t(
          "Name should be alphabets and only space - . and ' are allowed and must start with an alphabet.",
        ),
        () => firstNameRef.current?.focus(),
      );
      return;
    }

    // Required field validation for non-hospitality
    if (!isHospitality) {
      if (!name.lastName?.trim()) {
        showWarning(t('Please enter the last name'), () => lastNameRef.current?.focus());
        return;
      }

      if (!shipName?.name) {
        showWarning(t('Please select the ship!'));
        return;
      }

      if (!departmentName?.name) {
        showWarning(t('Please select the division!'));
        return;
      }

      // Email validation only for non-hospitality
      if (email && !validateEmail(email)) {
        showWarning(t('Please provide a valid email.'), () => emailRef.current?.focus());
        return;
      }
    }

    // Validate last name if provided
    if (name.lastName && !validateName(name.lastName)) {
      showWarning(
        t(
          "Name should be alphabets and only space - . and ' are allowed and must start with an alphabet.",
        ),
        () => lastNameRef.current?.focus(),
      );
      return;
    }

    // Phone is required and its length must match the selected country code
    if (isHospitality && !phoneNumber.trim()) {
      showWarning(t('Please enter the phone number'), () => phoneRef.current?.focus());
      return;
    }
    if (isHospitality && phoneNumber.trim()) {
      const len = phoneNumber.trim().length;
      if (len < phoneDigits.min || len > phoneDigits.max) {
        showWarning(
          phoneDigits.min === phoneDigits.max
            ? t('Phone number must be {{digits}} digits.', { digits: phoneDigits.min })
            : t('Phone number must be between {{min}} and {{max}} digits.', {
                min: phoneDigits.min,
                max: phoneDigits.max,
              }),
          () => phoneRef.current?.focus(),
        );
        return;
      }
    }

    Keyboard?.dismiss();
    setIsLoading(true);

    // Build API payload conditionally
    const payload: any = {
      first_name: name.firstName,
      last_name: name.lastName || '',
      id_unit: idUnit,
      crewid: idUnit,
    };

    if (!isHospitality) {
      payload.ship_id = shipName?.id;
      payload.dept = departmentName?.id;
      if (email.trim()) payload.email = email.trim();
    } else {
      if (shipName?.id) payload.ship_id = shipName.id;
      if (departmentName?.id) payload.dept = departmentName.id;
      if (phoneNumber.trim()) payload.phone_number = `${countryCode}${phoneNumber.trim()}`;
    }
    console.log('payload=================', payload)
    console.log('Backend_URL',Backend_URL)
    axios
      .post(Backend_URL + '/create-customer', payload, {
        headers: { Authorization: 'Bearer ' + user?.token },
      })
      .then(async response => {
        if (response?.data) {
          const newRecipient = await buildCreatedRecipient(response.data);
          // Lets the picker that opened this screen select the new guest.
          DeviceEventEmitter.emit(RECIPIENT_ADDED_EVENT, newRecipient);
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
          navigateToSearch={!returnTo}
          onClose={() => {
            setSuccessVisible(false);
            if (returnTo && typeof navigation?.popTo === 'function') {
              // React Navigation 7: navigate() would push a fresh copy of the
              // screen; popTo() returns to the existing one with its state.
              navigation.popTo(returnTo);
            } else {
              navigation?.goBack?.();
            }
          }}
        />
      )}

      {/* Validation warning (required fields, name format, phone digits) */}
      <WarningPopup
        visible={!!warning}
        title={t('Warning')}
        message={warning?.message ?? ''}
        buttonText={t('OK')}
        onClose={() => {
          const focus = warning?.focus;
          setWarning(null);
          focus?.();
        }}
      />

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
              <Text style={styles.floatingLabel}>{t('Phone Number*')}</Text>
            ) : null}
            <View style={styles.phoneRow}>
              <CountryCodePicker
                value={countryCode}
                onSelect={handleCountryCode}
                style={styles.countryCodePicker}
              />
              <TextInput
                ref={phoneRef}
                keyboardType="phone-pad"
                placeholder={t('Phone Number*')}
                placeholderTextColor="#000"
                style={[styles.textInputField, styles.phoneInput]}
                value={phoneNumber}
                maxLength={phoneDigits.max}
                onChangeText={text => setPhoneNumber(text.replace(/[^0-9]/g, ''))}
              />
            </View>
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
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryCodePicker: {
    borderBottomWidth: 0,
    marginBottom: 0,
    paddingRight: 8,
    marginRight: 8,
    borderRightWidth: 1,
    borderRightColor: '#98989850',
  },
  phoneInput: {
    flex: 1,
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