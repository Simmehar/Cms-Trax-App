import React, {cloneElement, useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  Image,
  Dimensions,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  DeviceEventEmitter,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {FONTS, ICONS, IMAGES} from '../assets';
import {SvgXml} from 'react-native-svg';
import {CheckIpad} from '../utilities/securestorage';
import {usePackageContext} from '../contexts/packagecontext';
import {Helper} from '../utilities/Helper';
import {recipientSearchApi} from '../utilities/ApiCalls';
import {useAuth} from '../contexts';
import {useNavigationContext} from '../contexts/navigationcontext';

/** Emitted by AddRecipient with the newly created guest/recipient object. */
export const RECIPIENT_ADDED_EVENT = 'recipient_added';

const {height, width} = Dimensions.get('screen');

let isPad = CheckIpad();
interface ShipListProps {
  visible: boolean;
  onClose: () => void;
  activeTab: string;
  getValue: any; //(val: string) => void
  //  onSave: () => void
  setInitialVals: any;
}
const ships = [
  'Adventure of the Seas',
  'Allure of the Seas',
  'Anthem of the Seas',
  'Apex',
  'Ascent',
  'Azamara Onward',
  'Azamara Quest',
  'Beyond',
  'Brilliance of the Seas',
];

const Departments = [
  'Cruise Devision',
  'Deck',
  'Engine',
  'Finance',
  'Food & Beverage',
  'Guest Services /Guest Relations',
  'Housekeeping',
  'Human Resources',
];

const Rceipient = ['Aric', 'JAde', 'John', 'Sim', 'Dov'];

// const Status = ['Dispatch', 'On the Way', 'Received', 'Canceled', 'Closed'];
const Status = [
  // {
  //   id: 10000,
  //   status: 'Received',
  // },
  // {
  //   id: 10210,
  //   status: 'Loaded for Delivery',
  // },

  // {
  //   id: 10220,
  //   name: 'On hold - Payment Due',
  // },
  {
    id: 10050,
    name: 'Picked up by recipient',
  },
  {
    id: 10060,
    name: 'Delivered to recipient',
  },
  {
    id: 10140,
    name: 'Logged out during audit process',
  },
  {
    id: 10090,
    name: 'Returning/ Forwarding package',
  },
  {
    id: 10270,
    name: 'Picked up by carrier',
  },
  {
    id: 10280,
    name: 'Provided to charity',
  },
];


const Types = [
  'Corrugated Boxes',
  'Plastic Wraps',
  'Cardboard Boxes',
  'Tetra Packs',
  'Plastic Containers',
];

interface shipListOj {
  company_id: string;
  company_name: string;
  id: number;
  name: string;
}
const ShipListModal: React.FC<ShipListProps> = ({
  visible,
  onClose,
  activeTab,
  getValue,
  setInitialVals,
}) => {
  const {user} = useAuth();
  const {t} = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const [searchQuery, setSearchQuery] = useState('');
  const [isShow, setIsShow] = useState(false);
  const [dataList, setDataList] = useState<any>([]);
  const [isHospitality, setIsHospitality] = useState(false);

  // True only while this picker sent the user to the Add Guest screen, so
  // that the guest created there is selected here and not in another picker.
  const awaitingNewRecipientRef = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem('BUSINESS_TYPE')
      .then(storedType => setIsHospitality(storedType === 'hotels-and-hospitality'))
      .catch(e => console.warn('Error reading BUSINESS_TYPE in ShipListModal', e));
  }, []);

  const getGroupedStatusList = () => {
  if (!packageStatus) return [];

  const loggedInList = Object.entries(packageStatus.logged_in).map(
    ([id, name]) => ({
      id: Number(id),
      name,
    })
  );

  const loggedOutList = Object.entries(packageStatus.logged_out).map(
    ([id, name]) => ({
      id: Number(id),
      name,
    })
  );

  return [
    { id: 1, name: 'Logged IN', isHeader: true },
    ...loggedInList,
    // { id: 2, name: 'Logged OUT', isHeader: true },
    // ...loggedOutList,
  ];
};


  const {
    shipList,
    recipientList,
    setRecipientList,
    departmentList,
    carriers,
    packageCondition,
    packageType,
    packageStatus,
  } = usePackageContext();

  // When a guest is created from this picker, select it and add it to the
  // cached list so it also shows up next time the picker opens.
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      RECIPIENT_ADDED_EVENT,
      (newRecipient: any) => {
        if (!newRecipient) return;
        setRecipientList?.((prev: any[]) => {
          const list = Array.isArray(prev) ? prev : [];
          // Every mounted picker receives the same object, so identity dedupes
          // even when the backend returned no id.
          const exists = list.some(
            r => r === newRecipient || (newRecipient.id != null && r?.id === newRecipient.id),
          );
          return exists ? list : [newRecipient, ...list];
        });
        if (awaitingNewRecipientRef.current) {
          awaitingNewRecipientRef.current = false;
          getValue(newRecipient);
        }
      },
    );
    return () => subscription.remove();
  }, [getValue, setRecipientList]);

  const onAddRecipientPress = () => {
    awaitingNewRecipientRef.current = true;
    Keyboard.dismiss();
    onClose();
    // returnTo brings the user straight back to this screen after saving.
    navigation.navigate('AddRecipient', {returnTo: route?.name || 'Home'});
  };
  console.log('departmentList',departmentList)
 
  useEffect(() => {
    setInitialVals?.setType &&
      !setInitialVals?.type &&
      setInitialVals?.setType(packageType?.[0] || '');

    setInitialVals?.setCondition &&
      !setInitialVals?.condition &&
      setInitialVals?.setCondition(packageCondition?.[0] || '');

    setInitialVals?.setStatus &&
      !setInitialVals?.status &&
      setInitialVals?.setStatus(getGroupedStatusList()[1] || null);


    // setInitialVals?.setCarrier &&
    //   !setInitialVals?.carrier &&
    //   setInitialVals?.setCarrier(carriers?.[0] || '');
  }, [activeTab]);
  const apiData =
    activeTab === 'Ship'
      ? shipList
      : activeTab === 'Status'
      ? getGroupedStatusList()
      : activeTab === 'CheckoutStatus'
      ? Object.entries(packageStatus?.logged_out || {}).map(([id, name]) => ({
        id: Number(id),
        name,
      }))
      : activeTab === 'Type'
      ? packageType
      : activeTab == 'Department'
      ? Departments
      : activeTab == 'Rceipient'
      ? recipientList
      : activeTab == 'Division'
      ? departmentList
      : activeTab == 'Condition'
      ? packageCondition
      : activeTab == 'Carrier'
      ? carriers
      : [];

  useEffect(() => {
    setDataList(apiData);
    setIsShow(true);
    setSearchQuery('');
  }, [activeTab, visible, shipList,recipientList,packageType]);

  const {showLoader} = useNavigationContext();

  const [isLoading, setIsLoading] = useState(false);
  const [searchTimer, setSearchTimer] = useState<any>();

  const textUpdateApi = async (text: any) => {
    if (text.length > 1) {
      const searchResult = await recipientSearchApi(user, text);
      __DEV__ && console.log('searchResultsearchResult', searchResult[0])
      setDataList(searchResult);
    } 
    else {
      setDataList(apiData);
    }
    setIsLoading(false);
  };

  const searchRecipientHandler = (text: any) => {
    if (activeTab == 'Rceipient') {
      setSearchQuery(text)
      setIsLoading(true);
      if (searchTimer) {
        clearTimeout(searchTimer);
      }
      setSearchTimer(
        setTimeout(() => {
          __DEV__ && console.log('texttexttexttexttexttexttexttexttexttexttexttext', text)
          textUpdateApi(text);
        }, 500),
      );
    }
  };
  // __DEV__ && console.log('dataList :>> ', dataList[3]);

  // useEffect(() => {
  //   if (searchQuery) {
  //     const filteredData = apiData.filter(item => {
  //       let searchKey =
  //         activeTab === 'Ship' ||
  //         activeTab == 'Status' ||
  //         activeTab == 'Type' ||
  //         activeTab === 'Division' ||
  //         activeTab == 'Carrier' ||
  //         activeTab == 'Condition'
  //           ? item?.name
  //           : activeTab === 'Rceipient'
  //           ? `${item?.first_name + ' ' + item?.last_name}`
  //           : item;
  //       return searchKey.toLowerCase().includes(searchQuery.toLowerCase());
  //     });
  //     // __DEV__ && console.log('==filteredData==', filteredData);

  //     setDataList(filteredData);
  //   } else {
  //     setDataList(apiData);
  //   }
  // }, [searchQuery]);

  return (
    <Modal visible={visible}  transparent={true}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.rowView}>
              {activeTab == 'Rceipient' ? (
                <View style={styles.searchView}>
                  <>
                    <SvgXml
                      xml={ICONS.header.search}
                      width={isPad ? 27 : '21.5'}
                      height={isPad ? 27 : '21.5'}
                      style={styles.icon}
                    />
                    <TextInput
                      style={[styles.input, {fontSize: isPad ? 20 : 16}]}
                      placeholder="Search"
                      placeholderTextColor="#919191"
                      value={searchQuery}
                      onChangeText={searchRecipientHandler}
                      autoCorrect={false}
                      // onChangeText={setSearchQuery}
                      //autoFocus={true}
                    />
                  </>
                </View>
              ) : (
                <View />
              )}
              <TouchableOpacity
                style={isPad ? styles.crossViewI : styles.crossView}
                onPress={() => {
                  onClose();
                }}>
                <Image source={IMAGES.close} style={styles.closeImg} />
              </TouchableOpacity>
            </View>

            {activeTab == 'Rceipient' && (
              <TouchableOpacity
                style={isPad ? styles.addBtnI : styles.addBtn}
                activeOpacity={0.7}
                onPress={onAddRecipientPress}>
                <Image source={IMAGES.add_receipent} style={isPad ? styles.addIconI : styles.addIcon} />
                <Text style={[styles.addBtnText, {fontSize: isPad ? 22 : 16}]}>
                  {t(isHospitality ? 'Add Guest' : 'Add Recipient')}
                </Text>
              </TouchableOpacity>
            )}

            {showLoader || isLoading || !dataList ? (
              <ActivityIndicator
                style={{
                  paddingVertical: 20,
                }}
              />
            ) : (
              <FlatList
                data={dataList}
                style={{marginTop: activeTab == 'Rceipient' ? 10 : 30}}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({item, index}) => {
                  // __DEV__ && console.log('-item-', item);

                  return (
                    <TouchableOpacity
                      disabled={
                        activeTab === 'Status' && (item.id == 1 || item.id == 2)
                      }
                      onPress={() => {
                        onClose(), getValue(item);
                      }}>
                      <Text
                        style={[
                          styles.itemText,
                          {fontSize: isPad ? 25 : 16},
                          activeTab === 'Status' &&
                          (item.id == 1 || item.id == 2)
                            ? {
                                // fontWeight:
                                fontFamily: FONTS.RICORDOBold,
                              }
                            : {},
                        ]}
                        // onPress={() => {
                        //   if (
                        //     activeTab === 'Status' &&
                        //     item.id != 1 &&
                        //     item.id != 2
                        //   ) {
                        //     onClose(), getValue(item);
                        //   }
                        //   __DEV__ && console.log('item', item);
                        // }}
                      >
                        {activeTab === 'Ship' ||
                        activeTab === 'Status' ||
                        activeTab === 'CheckoutStatus' ||
                        activeTab === 'Type' ||
                        activeTab == 'Division' ||
                        activeTab == 'Carrier' ||
                        activeTab == 'Condition'
                          ? item?.name
                          : activeTab === 'Rceipient'
                          ? `${item?.first_name + ' ' + item?.last_name}`
                          : item}
                      </Text>
                       {activeTab === 'Rceipient'&& <Text style={styles?.shipText}>{item?.email}</Text>}
                     {activeTab === 'Rceipient'&& <Text style={styles?.shipText}>{item?.ship}</Text>}
                      <View style={styles.lineView}></View>
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={<></>}
              />
            )}
          </View>
        </View>
      </TouchableWithoutFeedback>
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
    paddingVertical: 20,
    paddingHorizontal: 10,
    paddingBottom: 40,
    maxHeight: '75%',
    minHeight: '75%',
  },
  crossView: {
    height: 48,
    width: 48,
    borderRadius: 48 / 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F4F4',
    alignSelf: 'flex-end',
  },
  crossViewI: {
    height: 60,
    width: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F4F4',
    alignSelf: 'flex-end',
  },
  closeImg: {
    height: isPad?20:10,
    width:isPad?20:10,
    tintColor: 'black',
  },
  rowView: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchView: {
    flex: 1,
    height: 48,
    backgroundColor: '#F4F4F4',
    borderRadius: 24,
    paddingHorizontal: 13,
    marginRight: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    height: 21.5,
    width: 21.5,
  },
  input: {
    fontSize: 16,
    fontFamily: FONTS.RICORDORegular,
    color: 'black',
    marginLeft: 10,
    width: width * 0.5,
    height: 48,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 20,
    marginHorizontal: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#223890',
    backgroundColor: '#EEF1FA',
  },
  addBtnI: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 26,
    marginHorizontal: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#223890',
    backgroundColor: '#EEF1FA',
  },
  addIcon: {
    height: 18,
    width: 18,
    resizeMode: 'contain',
    marginRight: 8,
  },
  addIconI: {
    height: 26,
    width: 26,
    resizeMode: 'contain',
    marginRight: 10,
  },
  addBtnText: {
    color: '#223890',
    fontFamily: FONTS.RICORDOSemiBold,
  },
  itemText: {
    flex: 1,
    fontSize: 16,
    color: 'black',
    fontFamily: FONTS.RICORDORegular,
    marginHorizontal: 20,
  },
  shipText: {
    flex: 1,
    fontSize: 16,
    marginTop:2,
    color: 'grey',
    fontFamily: FONTS.RICORDORegular,
    marginHorizontal: 20,
  },
  lineView: {
    height: 1,
    backgroundColor: '#F4F4F4',
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom:15
  },
});

export {ShipListModal};
