import React, { useState, useEffect, cloneElement } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  Image,
  Alert,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import { FONTS, ICONS, IMAGES } from '../assets';
import { isIPad } from '../utilities/securestorage';
import { Ships, usePackageContext } from '../contexts/packagecontext';
import { useMode } from '../db/db.context';
import { useAuth } from '../contexts';
import { Package } from '../db/db.crud';
import { recipientSearchApi } from '../utilities/ApiCalls';
import { useKeepAwake } from '@sayem314/react-native-keep-awake';
import LinearGradient from 'react-native-linear-gradient';
import { useTranslation } from 'react-i18next';

const sortList = [
  'Ship',
  'Recipient Name',
  'Package Type',
  'Location',
  'Tag Number',
  'Date Received',
];

const offlineSortList = ['Recipient Name'];

interface FiltersModalProps {
  visible: boolean;
  onClose: (type: boolean, selectedData?: any[]) => void;
  filterType: string;
  packages: Package[];
  setModalVisible: any;
  selectedShip: any;
  setSelectedShip: any;
  selectedRecipient: any;
  setSelectedRecipient: any;
  selectedSortOption: any;
  setSelectedSortOption: any;
  setIsIncreasing: any;
  isIncreasing: any;
  setIsProgressOn: any;
  isOnline: boolean;
  // Added props for new filters
  selectedStatus: any;
  setSelectedStatus: any;
  selectedPackageType: any;
  setSelectedPackageType: any;
}

const FiltersModal: React.FC<FiltersModalProps> = ({
  visible,
  setModalVisible,
  onClose,
  filterType,
  packages,
  selectedShip,
  setSelectedShip,
  selectedRecipient,
  setSelectedRecipient,
  selectedSortOption,
  setSelectedSortOption,
  setIsIncreasing,
  isIncreasing,
  setIsProgressOn,
  isOnline,
  selectedStatus,
  setSelectedStatus,
  selectedPackageType,
  setSelectedPackageType,
}) => {
  const { shipList, recipientList, packageStatus, packageType } = usePackageContext();

  const [activeTab, setActiveTab] = useState('Ship');
  const [searchQuery, setSearchQuery] = useState('');
  const [shipsArr, setShipsArr] = useState<Ships[]>([]);
  const [recipientArr, setRecipientArr] = useState([]);
  const [statusArr, setStatusArr] = useState([]);
  const [typeArr, setTypeArr] = useState([]);

  const [selectedItem, setSelectedItem] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<any[]>([]);
  console.log('selectedItem========', selectedItem)
  useKeepAwake();
  console.log('filterType', filterType)
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const handleTabSwitch = (tab: string) => {
    setActiveTab(tab);
    setSearchQuery('');
  };

  // Process Status and Type data when context or tab changes
  useEffect(() => {
    if (packageStatus?.logged_in) {
      const formattedStatus = Object.entries(packageStatus.logged_in).map(([id, name]) => ({
        id,
        name: name as string,
        isSelect: selectedStatus === id,
      }));
      setStatusArr(formattedStatus);
    }

    if (packageType) {
      const formattedTypes = packageType.map((item: any) => ({
        id: item.id,
        name: item.name,
        isSelect: selectedPackageType === item.id,
      }));
      setTypeArr(formattedTypes);
    }
  }, [packageStatus, packageType, selectedStatus, selectedPackageType]);

  const [timeOut, setTimeOut] = useState<any>();

  const updateRecipientSearch = async (text: any) => {
    if (text.length > 1) {
      const searchResult = await recipientSearchApi(user, text);
      setRecipientArr(searchResult);
    }
    setIsLoading(false);
  };

  const recipientSearch = async text => {
    setIsLoading(true);
    if (timeOut) clearTimeout(timeOut);
    setTimeOut(setTimeout(() => updateRecipientSearch(text), 700));
  };

  // Check karega ki current tab item select hai ya nahi
  const checkIsSelected = (item: any) => {
    if (activeTab === 'Ship') return selectedShip === item.id;
    if (activeTab === 'Recipient') return selectedRecipient === item.id;
    if (activeTab === 'Status') return selectedStatus === item.id;
    if (activeTab === 'Type') return selectedPackageType === item.id;
    return false;
  };
  useEffect(() => {
    let data = [];
    if (activeTab === 'Ship') data = isOnline ? shipList : dbShips;
    else if (activeTab === 'Recipient') data = recipientList;
    else if (activeTab === 'Status') data = statusArr;
    else if (activeTab === 'Type') data = typeArr;

    if (searchQuery) {
      const filteredData = data.filter(item => {
        let searchKey = item?.name || (item?.first_name ? `${item.first_name} ${item.last_name}` : '');
        return searchKey.toLowerCase().includes(searchQuery.toLowerCase());
      });

      if (activeTab === 'Ship') setShipsArr(filteredData);
      else if (activeTab === 'Recipient') recipientSearch(searchQuery);
      else if (activeTab === 'Status') setStatusArr(filteredData);
      else if (activeTab === 'Type') setTypeArr(filteredData);
    } else {
      if (activeTab === 'Ship') setShipsArr(isOnline ? shipList : dbShips);
      else if (activeTab === 'Recipient') setRecipientArr(recipientList);
      // Status and Type are handled by the other useEffect, but kept for consistency
    }
  }, [searchQuery, activeTab, shipList, recipientList, isOnline]);

  const {
    setupDBPackages,
    dbShips,
    sortingOrder,
    setSortingOrder,
  } = useMode();

  // const onItemClick = (item: any) => {
  //   const id = item.id;
  //   setSelectedItem(id);

  //   if (activeTab === 'Ship') {
  //     setShipsArr(prev => prev.map(s => ({ ...s, isSelect: s.id === id ? !s.isSelect : false })));
  //     setSelectedShip(prev => (prev === id ? null : id));
  //   } else if (activeTab === 'Recipient') {
  //     setRecipientArr(prev => prev.map(r => ({ ...r, isSelect: r.id === id ? !r.isSelect : false })));
  //     setSelectedRecipient(prev => (prev === id ? null : id));
  //   } else if (activeTab === 'Status') {
  //     setStatusArr(prev => prev.map(s => ({ ...s, isSelect: s.id === id ? !s.isSelect : false })));
  //     setSelectedStatus(prev => (prev === id ? null : id));
  //   } else if (activeTab === 'Type') {
  //     setTypeArr(prev => prev.map(t => ({ ...t, isSelect: t.id === id ? !t.isSelect : false })));
  //     setSelectedPackageType(prev => (prev === id ? null : id));
  //   }

  //   setSelectedOptions(prev => {
  //     const isAlreadySelected = prev.some(opt => opt.id === id);
  //     return isAlreadySelected ? prev.filter(opt => opt.id !== id) : [...prev, item];
  //   });
  // };

  const onItemClick = (item: any) => {
    const id = item.id;
    setSelectedItem(id);

    if (activeTab === 'Ship') {
      setSelectedShip(prev => (prev === id ? null : id));
    } else if (activeTab === 'Recipient') {
      setSelectedRecipient(prev => (prev === id ? null : id));
    } else if (activeTab === 'Status') {
      setSelectedStatus(prev => (prev === id ? null : id));
    } else if (activeTab === 'Type') {
      setSelectedPackageType(prev => (prev === id ? null : id));
    }

    setSelectedOptions(prev => {
      const isAlreadySelected = prev.some(opt => opt.id === id);
      return isAlreadySelected ? prev.filter(opt => opt.id !== id) : [...prev, item];
    });
  };
  const onApply = () => {
    onClose(true, selectedOptions);
  };

  const onClear = () => {
    // Reset selected IDs
    setSelectedShip(null);
    setSelectedRecipient(null);
    setSelectedStatus(null);
    setSelectedPackageType(null);

    setSelectedItem('');
    setSelectedOptions([]);

    // Reset UI selection (isSelect false for all)

    setShipsArr(prev => prev.map(item => ({ ...item, isSelect: false })));
    setRecipientArr(prev => prev.map(item => ({ ...item, isSelect: false })));
    setStatusArr(prev => prev.map(item => ({ ...item, isSelect: false })));
    setTypeArr(prev => prev.map(item => ({ ...item, isSelect: false })));

    // Optional: clear search also
    setSearchQuery('');
    onClose(true);
  };
  const { user } = useAuth();
  console.log('user===========', user)
  const onDownloadPress = async ({ user, shipId }: any) => {
    if (shipId) {
      await setupDBPackages(user, `?ship=${shipId}`, setIsProgressOn, setIsLoadingData, shipId);
    }
  };

  // const handleSortApply = (sortBy: string) => {
  //   let field: string;
  //   switch (sortBy) {
  //     case 'Ship': field = 'ship'; break;
  //     case 'Recipient Name': field = 'user__first_name'; break;
  //     case 'Package Type': field = 'package_type'; break;
  //     case 'Location': field = 'shelf'; break;
  //     case 'Tag Number': field = 'tag_number'; break;
  //     case 'Date Received': field = 'date_received'; break;
  //     default: field = '';
  //   }

  //   let sortedData = [...selectedOptions];
  //   if (field) {
  //     sortedData.sort((a, b) => {
  //       if (field === 'date_received') {
  //         const dateA = new Date(a[field]).getTime();
  //         const dateB = new Date(b[field]).getTime();
  //         return isIncreasing ? dateA - dateB : dateB - dateA;
  //       } else {
  //         const valueA = a[field] || '';
  //         const valueB = b[field] || '';
  //         if (valueA < valueB) return isIncreasing ? -1 : 1;
  //         if (valueA > valueB) return isIncreasing ? 1 : -1;
  //         return 0;
  //       }
  //     });
  //   }

  //   setSelectedSortOption(field);
  //   onClose(true, sortedData);
  // };


  const handleSortApply = (sortBy: string) => {
    let field: string;
    switch (sortBy) {
      case 'Ship': field = 'ship'; break;
      case 'Recipient Name': field = 'user__first_name'; break;
      case 'Package Type': field = 'package_type'; break;
      case 'Location': field = 'shelf'; break;
      case 'Tag Number': field = 'tag_number'; break;
      case 'Date Received': field = 'date_received'; break;
      default: field = '';
    }

    if (field) {
      // Agar wahi same field pehle se selected hai, toh order toggle karo
      if (field === selectedSortOption) {
        setIsIncreasing(!isIncreasing);
      } else {
        // Agar naya field hai, toh default Ascending (true) set karo
        setSelectedSortOption(field);
        setIsIncreasing(true);
      }
    }

    // Kyunki hum API se data fetch kar rahe hain (fetchData), 
    // isliye yahan manual sortedData.sort() karne ki zarurat nahi hai.
    // Hum bas modal close karenge, parent ka useEffect khud API call kar lega.
    onClose(true);
  };
  const getCurrentData = () => {
    switch (activeTab) {
      case 'Ship': return shipsArr;
      case 'Recipient': return recipientArr;
      case 'Status': return statusArr;
      case 'Type': return typeArr;
      default: return [];
    }
  };
  const { t } = useTranslation();
  return (
    <Modal visible={visible} statusBarTranslucent transparent={true}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={[styles.rowView, { alignSelf: filterType === '1' ? 'flex-end' : 'auto' }]}>
            {filterType === '2' ? (
              <View style={[styles.shipView, { flex: 1, marginRight: isIPad ? 20 : 10, }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', padding: 5 }}>
                  {[
                    { key: 'Ship', label: t('Ship') },
                    { key: 'Recipient', label: t('Recipient') },
                    { key: 'Status', label: t('Status') },
                    { key: 'Type', label: t('Type') },
                  ].map((tab) => (
                    (tab.key === 'Ship' || isOnline) && (
                      <TouchableOpacity
                        key={tab.key}
                        style={activeTab === tab.key ? styles.activeView : styles.inActiveView}
                        onPress={() => handleTabSwitch(tab.key)}>
                        <Text style={[styles.shipTxt, { marginHorizontal: 15 }]}>
                          {tab.label}
                        </Text>
                      </TouchableOpacity>
                    )
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <TouchableOpacity
              style={[isIPad ? styles.crossViewI : styles.crossView]}
              onPress={() => onClose(false)}>
              <Image source={IMAGES.close} style={isIPad ? styles.closeImgI : styles.closeImg} />
            </TouchableOpacity>
          </View>

          {filterType === '2' ? (
            <View style={styles.searchInput}>
              <SvgXml xml={ICONS.header.search} width={isIPad ? 32 : '20'} height={isIPad ? 32 : '20'} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder={t('Search')}
                placeholderTextColor={'#919191'}
                value={searchQuery}
                onChangeText={item => setSearchQuery(item)}
              />
            </View>
          ) : null}

          {filterType === '1' ? (
            <>
              <TouchableOpacity style={styles.clear} onPress={() => { setSelectedSortOption(''), onClose(true); }}><Text>{t('Clear')}</Text></TouchableOpacity>
              <FlatList
                data={isOnline ? sortList : offlineSortList}
                style={{ marginTop: 20 }}
                showsVerticalScrollIndicator={false}
                keyExtractor={item => item}
                renderItem={({ item }) => (
                  <>
                    <TouchableOpacity
                      style={styles.itemContainer}
                      onPress={() => {
                        if (isOnline) handleSortApply(item);
                        else {
                          setSortingOrder(!sortingOrder);
                          setModalVisible(false);
                        }
                      }}>
                      <Text style={isIPad ? styles.itemTextI : styles.itemText}> {t(item)}</Text>
                      <Image source={IMAGES.sort} style={isIPad ? styles.sorIconI : styles.sorIcon} />
                    </TouchableOpacity>
                    <View style={styles.lineView}></View>
                  </>
                )}
              />
            </>
          ) : (
            <>
              {!isLoadingData ? (
                // <FlatList
                //   data={getCurrentData()}
                //   keyExtractor={item => item.id.toString()}
                //   showsVerticalScrollIndicator={false}
                //   renderItem={({ item }) => {
                //     console.log('Item0:=========', item);
                //     return (

                //       <>
                //         <TouchableOpacity
                //           style={{ flexDirection: 'row', alignItems: 'center' }}
                //           onPress={() => onItemClick(item)}>
                //           <Text style={[styles.itemText, { color: item?.isSelect ? '#223890' : 'black' }]}>
                //             {activeTab === 'Recipient' ? `${item?.first_name} ${item?.last_name}` : item?.name}
                //           </Text>
                //           <TouchableOpacity style={styles.radioButton} onPress={() => onItemClick(item)}>
                //             {item?.isSelect && <View style={styles.radioButtonSelected} />}
                //           </TouchableOpacity>
                //         </TouchableOpacity>
                //         <View style={styles.lineView}></View>
                //       </>
                //     )
                //   }}
                //   ListHeaderComponent={isLoading ? <ActivityIndicator color={'black'} /> : <></>}
                // />
                <FlatList
                  data={getCurrentData()}
                  keyExtractor={item => item.id.toString()}
                  showsVerticalScrollIndicator={false}
                  // extraData pass karne se FlatList ko pata chalega kab re-render hona hai
                  extraData={[selectedShip, selectedRecipient, selectedStatus, selectedPackageType]}
                  renderItem={({ item }) => {
                    const isSelected = checkIsSelected(item);

                    return (
                      <>
                        <TouchableOpacity
                          style={{ flexDirection: 'row', alignItems: 'center' }}
                          onPress={() => onItemClick(item)}>
                          <Text style={[styles.itemText, { color: isSelected ? '#223890' : 'black' }]}>
                            {activeTab === 'Recipient' ? `${item?.first_name} ${item?.last_name}` : item?.name}
                          </Text>
                          <TouchableOpacity style={styles.radioButton} onPress={() => onItemClick(item)}>
                            {isSelected && <View style={styles.radioButtonSelected} />}
                          </TouchableOpacity>
                        </TouchableOpacity>
                        <View style={styles.lineView} />
                      </>
                    );
                  }}
                  ListHeaderComponent={isLoading ? <ActivityIndicator color={'black'} /> : null}
                />
              ) : (
                <View style={{ justifyContent: 'center', alignItems: 'center', zIndex: 1111, position: 'absolute', alignSelf: 'center', top: '50%' }}>
                  <ActivityIndicator size="large" color="#223890" />
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#000', marginTop: 12 }}> {t('Please wait, data is loading...')}</Text>
                </View>
              )}
            </>
          )}

          {!isLoadingData && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {filterType === '2' && activeTab === 'Ship' && isOnline &&
                user?.currentplan !== 'Basic' ? (
                <TouchableOpacity
                  disabled={isLoadingData || selectedItem == ''}
                  style={[
                    styles.applyButton,
                    {
                      // Background color hata diya hai
                      opacity: isLoadingData || selectedItem == '' ? 0.5 : 1,
                      overflow: 'hidden'
                    }
                  ]}
                  onPress={() => onDownloadPress({ user, shipId: selectedShip })}>

                  {/* Gradient Background */}
                  <LinearGradient
                    colors={['#1C2C5B', '#1F3C73', '#2B5DAA']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />

                  <Text style={styles.applyButtonText}>{t('Download')}</Text>
                </TouchableOpacity>
              ) : null}

              {filterType !== '1' &&
                !(filterType === '2' && activeTab === 'Ship' && isOnline) ? (
                <TouchableOpacity style={styles.clearButton} onPress={onClear}>
                  <Text style={styles.clearButtonText}>{t('Clear')}</Text>
                </TouchableOpacity>
              ) : null}

              {/* Apply */}
              {filterType !== '1' ? (
                <TouchableOpacity style={styles.applyButton} onPress={onApply}>
                  <Text style={styles.applyButtonText}>{t('Apply')}</Text>
                </TouchableOpacity>
              ) : null}

            </View>
          )}
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
    minHeight: '75%',
  },
  searchInput: {
    height: isIPad ? 68 : 48,
    backgroundColor: '#F4F4F4',
    borderRadius: 24,
    paddingHorizontal: 13,
    marginBottom: isIPad ? 30 : 20,
    marginTop: isIPad ? 30 : 17,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    height: 21.5,
    width: 21.5,
  },
  input: {
    fontSize: isIPad ? 22 : 16,
    fontFamily: FONTS.RICORDORegular,
    color: 'black',
    marginLeft: 10,
    width: '70%',
  },
  activeView: {
    backgroundColor: 'white',
    borderRadius: isIPad ? 35 : 24,
    height: isIPad ? 68 : 38,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 3,
  },
  inActiveView: {
    height: isIPad ? 68 : 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shipView: {
    backgroundColor: '#F6F7F8',
    borderRadius: 24,
    height: isIPad ? 60 : 48,
    flexDirection: 'row',
    alignItems: 'center',
  },
  shipTxt: {
    fontSize: isIPad ? 22 : 14,
    fontFamily: FONTS.RICORDORegular,
    color: 'black',
  },
  crossViewI: {
    height: 60,
    width: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F4F4',
  },
  itemText: {
    flex: 1,
    fontSize: isIPad ? 25 : 17,
    color: 'black',
    fontFamily: FONTS.RICORDORegular,
  },
  itemTextI: {
    flex: 1,
    fontSize: 25,
    color: 'black',
    fontFamily: FONTS.RICORDORegular,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  lineView: {
    marginVertical: 16.5,
    height: 1,
    backgroundColor: '#E8E8E8',
  },
  clearButton: {
    height: isIPad ? 75 : 60,
    borderWidth: 1,
    borderColor: '#FDBE6F',
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    marginRight: 5,
  },

  clearButtonText: {
    color: '#FDBE6F',
    fontSize: isIPad ? 25 : 18,
    fontFamily: FONTS.RICORDOSemiBold,
  },

  applyButton: {
    height: isIPad ? 75 : 60,
    backgroundColor: '#FDBE6F',
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1, // 👈 same kar diya
    marginLeft: 5,
  },

  applyButtonText: {
    color: 'white',
    fontSize: isIPad ? 25 : 18,
    fontFamily: FONTS.RICORDOSemiBold,
  },
  rowView: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: isIPad ? 10 : 0,
  },
  crossView: {
    height: 48,
    width: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F4F4',
  },
  sorIcon: {
    height: 13.5,
    width: 15,
    resizeMode: 'contain',
  },
  sorIconI: {
    height: 25,
    width: 25,
    resizeMode: 'contain',
  },
  closeImg: {
    height: 10,
    width: 10,
    tintColor: 'black',
  },
  closeImgI: {
    height: 20,
    width: 20,
    tintColor: 'black',
  },
  radioButton: {
    height: isIPad ? 30 : 20,
    width: isIPad ? 30 : 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#223890',
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: isIPad ? 15 : 0
  },
  radioButtonSelected: {
    height: isIPad ? 20 : 12,
    width: isIPad ? 20 : 12,
    borderRadius: 10,
    backgroundColor: '#223890',
  },
  clear: { width: '20%', borderColor: 'grey', borderWidth: 2, alignItems: 'center', padding: 5, borderRadius: 5 }
});

export default FiltersModal;