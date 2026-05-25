import React, {useContext, useState} from 'react';
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
} from 'react-native';
import {FONTS, ICONS, IMAGES} from '../assets';
import {InputPicker} from './InputPicker';
import {KeyboardScroll} from './KeyboardScroll';
import {ShipListModal} from './ShipListModal';
import {isIPad} from '../utilities/securestorage';
import {sendEmail} from '../utilities/ApiCalls';
import {useAuth} from '../contexts';
import {updatePackage} from '../util/apiCalls';
import {SearchContext} from '../contexts/SearchContext';
import LottieModal from './SuccessPackageSubmitModal';

interface SignatureProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  selectedPackages: any;
  setSelectedPackages: any;
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
    const [message, setMessage]=useState('');
  const [email, setEmail] = useState(
      // customerData?.[0]?.email,
    );
  

  const [isLoading, setIsLoading] = useState(false);

  const {user} = useAuth();

  const {clearSelectedPackages} = useContext(SearchContext);

  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [updateResponse, setUpdateResponse] = useState([]);

  // __DEV__ && console.log('selectedPackages', selectedPackages);

  // const updateEventHandler = async () => {
  //   const uniqueIds = [...new Set(selectedPackages.map(p => p?.id))]; //remove duplicates
  //   if (!location && !shipName && !receipientName && !status && !type) {
  //     return Alert.alert('Please update at least one value');
  //   }

  //   // setInvalidFields(false);
    
  //   setIsLoading(true);
  //   const packagesData = {
  //     ids: uniqueIds,
  //     ship: shipName?.id,
  //     shelf: location,
  //     user_id: receipientName?.id,
  //     current_status: status?.id,
  //     package_type: type?.id,
  //   };

  //   const isSubmitted = await updatePackage(user, packagesData);
  //   if (isSubmitted == '400') {
  //     setIsLoading(false);
  //     // return setIsNetworkErr(true);
  //   }
  //   // setIsNetworkErr(false);
  //   setUpdateResponse([...selectedPackages]);
  //   onClear();
  //   clearSelectedPackages();
  //   setSuccessModalVisible(true);
  //   setIsLoading(false);

  //   let filteredStatus;

  //   if (status?.id == 10000) {
  //     filteredStatus = 'package_created';
  //   } else if (status?.id == 10240) {
  //     filteredStatus = 'pending_instruction';
  //   } else if (status?.id == 10250) {
  //     filteredStatus = 'pending_shipment_information';
  //   } else if (status?.id == 10220) {
  //     filteredStatus = 'payment_due';
  //   } else if (status?.id == 10260) {
  //     filteredStatus = 'payment_due_shipment';
  //   } else if (status?.id == 10230) {
  //     filteredStatus = 'returns';
  //   } else if (status?.id == 10050) {
  //     filteredStatus = 'picked_up_recipient';
  //   } else if (status?.id == 10060) {
  //     filteredStatus = 'package_delivered';
  //   } else if (status?.id == 10090) {
  //     filteredStatus = 'returning_forwarding';
  //   } else if (status?.id == 10270) {
  //     filteredStatus = 'picked_up_carrier';
  //   } else if (status?.id == 10280) {
  //     filteredStatus = 'provided_to_charity';
  //   } else {
  //     filteredStatus = null; // Handle the case when status?.id doesn't match any value
  //   }

  //   const mailData = {
  //     ids: uniqueIds,
  //     package_status: filteredStatus,
  //   };

  //   __DEV__ && console.log('mailData', mailData);

  //   if (
  //     isNotify
  //     // &&
  //     // (status?.id == 10000 ||
  //     //   status?.id == 10240 ||
  //     //   status?.id == 10250 ||
  //     //   status?.id == 10220 ||
  //     //   status?.id == 10260 ||
  //     //   status?.id == 10230 ||
  //     //   status?.id == 10050 ||
  //     //   status?.id == 10060 ||
  //     //   status?.id == 10090 ||
  //     //   status?.id == 10280 ||
  //     //   status?.id == 10270)
  //   ) {
  //     const emailRes = await sendEmail(user, mailData);

  //     __DEV__ && console.log('update packages emailRes', emailRes);
  //   }

  //   refetchData();
  // };

  const updateEventHandler = async () => {
    __DEV__ && console.log('efdsfdsfdsfdsfdsfdsfdsfdsfdsfds', )
    const uniqueIds = [...new Set(selectedPackages.map(p => p?.id))]; // Remove duplicates
  
    if (!location && !shipName && !receipientName && !status && !type && !message) {
      return Alert.alert('Please update at least one value');
    }
  
    // Show confirmation alert
    Alert.alert(
      'Are you sure you want to update?',
      '',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Yes',
          onPress: async () => {
            setIsLoading(true);
  
            const packagesData = {
              ids: uniqueIds,
              ship: shipName?.id,
              shelf: location,
              user_id: receipientName?.id,
              // current_status: status?.id,
              current_status: status?.id != null ? String(status?.id) : undefined,
              package_type: type?.id,
              custom_message:message
            };
  __DEV__ && console.log('packagesData', packagesData)
            const isSubmitted = await updatePackage(user, packagesData);
            __DEV__ && console.log('isSubmitted', isSubmitted)
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
          message={'Package/s Updated Successfully'}
          onCloseSuccessModal={() => {
            setVisible(false);
          }}
          updateData={{
            status,
            type,
            shipName,
            receipientName,
            message
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
            {/* <InputPicker
            isPicker={true}
            isQrCode={false}
            placeholder={'Select Recipient*'}
            style={{}}
            onPickerClick={() => {
              setDropdownActiveTab('Rceipient'), setIsDropdownVisible(true);
            }}
            pickerValue={receipientName}
          /> */}

            <InputPicker
              isPicker={true}
              isQrCode={false}
              placeholder={'Select Recipient*'}
              style={{marginHorizontal: 30, marginTop: 28}}
              onPickerClick={() => {
                setDropdownActiveTab('Rceipient'), setIsDropdownVisible(true);
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
              placeholder={'Select Status*'}
              style={{}}
              onPickerClick={() => {
                setDropdownActiveTab('Status'), setIsDropdownVisible(true);
              }}
              pickerValue={status?.name}
            />

            <InputPicker
              isPicker={true}
              isQrCode={false}
              placeholder={'Ship/Building*'}
              style={{marginHorizontal: 30, marginTop: 28}}
              onPickerClick={() => {
                setIsDropdownVisible(), setDropdownActiveTab('Ship');
              }}
              onChangeText={() => {}}
              pickerValue={shipName?.name}
            />
            <InputPicker
              isPicker={true}
              isQrCode={false}
              placeholder={'Select Type*'}
              style={{}}
              onPickerClick={() => {
                setDropdownActiveTab('Type'), setIsDropdownVisible(true);
              }}
              pickerValue={type?.name}
            />
            {/* <InputPicker
            isPicker={false}
            isQrCode={false}
            placeholder={'Location'}
            style={{}}
            onPickerClick={() => {}}
            pickerValue={''}
          /> */}

            <InputPicker
              isPicker={false}
              isQrCode={false}
              placeholder={'Location*'}
              style={{marginHorizontal: 0, marginTop: 0}}
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
              placeholder={'Message*'}
              style={{ marginHorizontal: 0, marginTop: 0 }}
              onPickerClick={() => { }}
              pickerValue={message}
              autoCapitalize={'words'}
              onChangeText={val => {
                setMessage(val.trimStart());
              }}
            />
            <View style={[styles.roView, {marginTop: 20}]}>
              <TouchableOpacity onPress={() => setIsNotify(!isNotify)}>
                {!isNotify ? (
                  <View style={styles.unSelBox}></View>
                ) : (
                  <View style={styles.selBox}>
                    <Image style={styles.tick} source={IMAGES.check} />
                  </View>
                )}
              </TouchableOpacity>
              <Text style={[styles.sendTxt, {fontSize: isIPad ? 20 : 14}]}>
                Send notification
              </Text>
            </View>
          </KeyboardScroll>

          <TouchableOpacity
            disabled={isLoading}
            style={styles.saveBtn}
            onPress={updateEventHandler}>
            <Text style={[styles.saveTxt, {fontSize: isIPad ? 20 : 18}]}>
              {isLoading ? 'Updating Packages... ' : ' Update Package'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    // flex: 1,
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
    //padding: 20,
    paddingBottom: 20,
    height:'100%',
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
    height: isIPad?20:10,
    width: isIPad?20:10,
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
export {UpdatePackageModal};
