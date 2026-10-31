import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  Image,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  DeviceEventEmitter,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FONTS, ICONS, IMAGES } from '../assets';
import { InputPicker } from './InputPicker';
import { KeyboardScroll } from './KeyboardScroll';
import { ShipListModal } from './ShipListModal';
import { isIPad } from '../utilities/securestorage';
import { sendEmail } from '../utilities/ApiCalls';
import { useAuth } from '../contexts';
import { updatePackage } from '../util/apiCalls';
import { SearchContext } from '../contexts/SearchContext';
import LottieModal from './SuccessPackageSubmitModal';
import { useTranslation } from 'react-i18next';

interface SignatureProps {
  visible: boolean;
  setVisible?: any;
  onClose: () => void;
  onSave?: () => void;
  selectedPackages: any;
  setSelectedPackages?: any;
  onClear: () => void;
  refetchData: any;
}

const UpdatePackageModal: React.FC<SignatureProps> = ({
  visible,
  setVisible,
  onClose,
  onSave,
  selectedPackages,
  setSelectedPackages,
  onClear,
  refetchData,
}) => {
  const [isNotify, setIsNotify] = useState(true);
  const [activeDropdownTab, setDropdownActiveTab] = useState('');
  const [dropdownVisible, setIsDropdownVisible] = useState(false);
  const [shipName, setShipName] = useState<any>();
  const [receipientName, setReceipientName] = useState<any>();
  const [status, setStatus] = useState<any>();
  const [type, setType] = useState<any>();
  const [location, setLocation] = useState<any>();
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState();
  const [isHospitality, setIsHospitality] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  const { user } = useAuth();
  const { t } = useTranslation();
  const { clearSelectedPackages } = useContext(SearchContext);

  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [updateResponse, setUpdateResponse] = useState([]);

  useEffect(() => {
    const fetchBusinessType = async () => {
      try {
        const storedType = await AsyncStorage.getItem('BUSINESS_TYPE');
        setIsHospitality(storedType === 'hotels-and-hospitality');
      } catch (e) {
        console.warn('Error reading BUSINESS_TYPE in UpdatePackageModal', e);
      }
    };

    if (visible) {
      fetchBusinessType();
    }
  }, [visible]);

  const updateEventHandler = async () => {
    __DEV__ && console.log('efdsfdsfdsfdsfdsfdsfdsfdsfdsfds');
    const uniqueIds = [...new Set(selectedPackages.map(p => p?.id))];

    if (!location && !shipName && !receipientName && !status && !type && !message) {
      return Alert.alert(t('Please update at least one value'));
    }

    Alert.alert(
      t('Are you sure you want to update?'),
      '',
      [
        {
          text: t('Cancel'),
          style: 'cancel',
        },
        {
          text: t('Yes'),
          onPress: async () => {
            setIsLoading(true);

            const packagesData = {
              ids: uniqueIds,
              ship: shipName?.id,
              shelf: location,
              user_id: receipientName?.id,
              current_status: status?.id != null ? String(status?.id) : undefined,
              package_type: type?.id,
              custom_message: message,
            };
            __DEV__ && console.log('packagesData', packagesData);
            const isSubmitted = await updatePackage(user, packagesData);
            __DEV__ && console.log('isSubmitted', isSubmitted);
            if (isSubmitted == '400') {
              setIsLoading(false);
              return;
            }

            setUpdateResponse([...selectedPackages]);
            onClear();
            clearSelectedPackages();
            setSuccessModalVisible(true);
            setIsLoading(false);

            const mailData = {
              ids: uniqueIds,
              package_status: status?.id,
            };

            __DEV__ && console.log('mailData', mailData);

            if (isNotify) {
              const emailRes = await sendEmail(user, mailData);
              __DEV__ && console.log('update packages emailRes', emailRes);
            }

            refetchData();
          },
        },
      ]
    );
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.modalContainer}>
        <LottieModal
          isVisible={successModalVisible}
          setVisible={setSuccessModalVisible}
          responseData={updateResponse}
          message={t(
            isHospitality
              ? 'Service/s Updated Successfully'
              : 'Package/s Updated Successfully'
          )}
          onCloseSuccessModal={() => {
            setVisible(false);
          }}
          updateData={{
            status,
            type,
            shipName,
            receipientName,
            message,
            location,
          }}
        />
        <View style={styles.modalContent}>
          <ShipListModal
            visible={dropdownVisible}
            onClose={() => {
              setIsDropdownVisible(false);
            }}
            activeTab={activeDropdownTab}
            getValue={(val: string) => {
              activeDropdownTab == 'Rceipient'
                ? setReceipientName(val)
                : activeDropdownTab == 'Ship'
                ? setShipName(val)
                : activeDropdownTab == 'Status'
                ? setStatus(val)
                : activeDropdownTab == 'Type'
                ? setType(val)
                : setReceipientName(val);
            }}
          />
          <TouchableOpacity
            style={isIPad ? styles.crossViewI : styles.crossView}
            onPress={onClose}>
            <Image source={IMAGES.close} style={styles.closeImg} />
          </TouchableOpacity>
          <KeyboardScroll contentContainerStyle={{}}>
            {/* Dynamic: Select Guest vs Select Recipient */}
            <InputPicker
              isPicker={true}
              isQrCode={false}
              placeholder={t(isHospitality ? 'Select Guest' : 'Select Recipient')}
              style={{ marginHorizontal: 30, marginTop: 28 }}
              onPickerClick={() => {
                setDropdownActiveTab('Rceipient');
                setIsDropdownVisible(true);
              }}
              pickerValue={
                receipientName?.first_name
                  ? receipientName?.first_name + ' ' + receipientName?.last_name
                  : null
              }
              onChangeText={() => {}}
            />
            <InputPicker
              isPicker={true}
              isQrCode={false}
              placeholder={t('Select Status')}
              style={{}}
              onPickerClick={() => {
                setDropdownActiveTab('Status');
                setIsDropdownVisible(true);
              }}
              pickerValue={status?.name}
            />

            <InputPicker
              isPicker={true}
              isQrCode={false}
              placeholder={t(isHospitality ? 'Hotel':'Ship/Building')}
              style={{ marginHorizontal: 30, marginTop: 28 }}
              onPickerClick={() => {
                setIsDropdownVisible(true);
                setDropdownActiveTab('Ship');
              }}
              onChangeText={() => {}}
              pickerValue={shipName?.name}
            />
            <InputPicker
              isPicker={true}
              isQrCode={false}
              placeholder={t('Select Type')}
              style={{}}
              onPickerClick={() => {
                setDropdownActiveTab('Type');
                setIsDropdownVisible(true);
              }}
              pickerValue={type?.name}
            />

            <InputPicker
              isPicker={false}
              isQrCode={false}
              placeholder={t('Location')}
              style={{ marginVertical: Platform.OS === 'ios' ? 10 : 0 }}
              onPickerClick={() => {}}
              pickerValue={location}
              autoCapitalize={'words'}
              onChangeText={val => {
                setLocation(val.trimStart());
              }}
            />

            <InputPicker
              isPicker={false}
              isQrCode={false}
              placeholder={t('Message')}
              style={{ marginVertical: Platform.OS === 'ios' ? 10 : 0 }}
              onPickerClick={() => {}}
              pickerValue={message}
              autoCapitalize={'words'}
              onChangeText={val => {
                setMessage(val.trimStart());
              }}
            />
            <View style={[styles.roView, { marginTop: 20 }]}>
              <TouchableOpacity onPress={() => setIsNotify(!isNotify)}>
                {!isNotify ? (
                  <View style={styles.unSelBox}></View>
                ) : (
                  <View style={styles.selBox}>
                    <Image style={styles.tick} source={IMAGES.check} />
                  </View>
                )}
              </TouchableOpacity>
              <Text style={[styles.sendTxt, { fontSize: isIPad ? 20 : 14 }]}>
                {t('Send notification')}
              </Text>
            </View>
          </KeyboardScroll>

          {/* Dynamic Button Labels */}
          <TouchableOpacity
            disabled={isLoading}
            style={styles.saveBtn}
            onPress={updateEventHandler}>
            <Text style={[styles.saveTxt, { fontSize: isIPad ? 20 : 18 }]}>
              {isLoading
                ? t(isHospitality ? 'Updating...' : 'Updating Packages...')
                : t(isHospitality ? 'Update' : 'Update Package')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    zIndex: 1,
    height: '110%',
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    height: '100%',
    maxHeight: '75%',
  },
  saveBtn: {
    height: 60,
    backgroundColor: '#FDBE6F',
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginHorizontal: 17,
  },
  saveTxt: {
    fontSize: 18,
    fontFamily: FONTS.PoppinsSemiBold,
    color: 'white',
  },
  crossView: {
    height: 48,
    width: 48,
    borderRadius: 48 / 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F4F4',
    alignSelf: 'flex-end',
    marginRight: 20,
    marginTop: 20,
  },
  crossViewI: {
    height: 65,
    width: 65,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F4F4',
    alignSelf: 'flex-end',
    marginRight: 20,
    marginTop: 20,
  },
  closeImg: {
    height: isIPad ? 20 : 10,
    width: isIPad ? 20 : 10,
    tintColor: 'black',
  },
  roView: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginHorizontal: 30,
  },
  unSelBox: {
    height: 22,
    width: 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#989898',
  },
  selBox: {
    height: 22,
    width: 22,
    borderRadius: 4,
    backgroundColor: '#223890',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendTxt: {
    fontSize: 14,
    fontFamily: FONTS.PoppinsRegular,
    color: 'black',
    marginLeft: 5,
  },
  tick: {
    height: 9,
    width: 13,
    tintColor: 'white',
  },
});

export { UpdatePackageModal };