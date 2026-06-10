import React, {cloneElement, useEffect, useState} from 'react';
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
} from 'react-native';
import {FONTS, ICONS, IMAGES} from '../assets';
import {SvgXml} from 'react-native-svg';
import {CheckIpad} from '../utilities/securestorage';
import {usePackageContext} from '../contexts/packagecontext';
import {Helper} from '../utilities/Helper';
import {recipientSearchApi} from '../utilities/ApiCalls';
import {useAuth} from '../contexts';
import {useNavigationContext} from '../contexts/navigationcontext';

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

  const [searchQuery, setSearchQuery] = useState('');
  const [isShow, setIsShow] = useState(false);
  const [dataList, setDataList] = useState<any>([]);

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
    { id: 2, name: 'Logged OUT', isHeader: true },
    ...loggedOutList,
  ];
};


  const {
    shipList,
    recipientList,
    departmentList,
    carriers,
    packageCondition,
    packageType,
    packageStatus,
  } = usePackageContext();
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

            {showLoader || isLoading || !dataList ? (
              <ActivityIndicator
                style={{
                  paddingVertical: 20,
                }}
              />
            ) : (
              <FlatList
                data={dataList}
                style={{marginTop: 30}}
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
