import React, {useState, useEffect} from 'react';
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
} from 'react-native';
import {SvgXml} from 'react-native-svg';
import {FONTS, ICONS, IMAGES} from '../assets';
import {isIPad} from '../utilities/securestorage';
import {Ships, usePackageContext} from '../contexts/packagecontext';

const sortList = [
  'Ship',
  'Recipient Name',
  'Package Type',
  'Location',
  'Tag Number',
  'Date Received',
];
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

const recipients = [
  'John Doe',
  'Jane Smith',
  'Sam Wilson',
  'Tony Stark',
  'Bruce Wayne',
  'Clark Kent',
  'Diana Prince',
  'Barry Allen',
];

interface FiltersModalProps {
  visible: boolean;
  onClose: (type: boolean) => void;
  filterType: string;
}

const FiltersModal: React.FC<FiltersModalProps> = ({
  visible,
  onClose,
  filterType,
}) => {
  const {shipList, recipientList} = usePackageContext();
  const [activeTab, setActiveTab] = useState('Ship');
  const [searchQuery, setSearchQuery] = useState('');
  const [shipsArr, setShipsArr] = useState<Ships[]>([]);
  const [recipientArr, setRecipientArr] = useState([]);

  const handleTabSwitch = (tab: string) => {
    setActiveTab(tab);
    setSearchQuery('');
  };

  useEffect(() => {
    if (filterType == '2') {
      activeTab === 'Ship'
        ? setShipsArr(shipList)
        : setRecipientArr(recipientList);
    }
  }, [activeTab]);

  useEffect(() => {
    const data = activeTab === 'Ship' ? shipList : recipientList;
    if (searchQuery) {
      const filteredData = data.filter(item => {
        let searchKey =
          activeTab === 'Ship'
            ? item?.name
            : activeTab === 'Rceipient'
            ? `${item?.first_name + ' ' + item?.last_name}`
            : '';
        return searchKey.toLowerCase().includes(searchQuery.toLowerCase());
      });
      __DEV__ && console.log('===filteredData===', filteredData);

      activeTab === 'Ship'
        ? setShipsArr(filteredData)
        : setRecipientArr(filteredData);
    } else {
      activeTab === 'Ship' ? setShipsArr(data) : setRecipientArr(data);
    }
  }, [searchQuery]);

  // const filteredData = data.filter(item => {
  //   let searchKey = activeTab === 'Ship' ? item?.name : `${item?.first_name + " " + item?.last_name}`
  //   searchKey.toLowerCase().includes(searchQuery.toLowerCase())
  // })

  const onItemClick = (index: number) => {
    let arr = [...shipsArr];
    arr[index].isSelect = !arr[index].isSelect;
    setShipsArr(arr);
  };

  return (
    <Modal visible={visible}  transparent={true}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.rowView}>
            {filterType == '2' ? (
              <View style={styles.shipView}>
                <TouchableOpacity
                  style={
                    activeTab == 'Ship'
                      ? styles.activeView
                      : styles.inActiveView
                  }
                  hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}
                  onPress={() => handleTabSwitch('Ship')}>
                  <Text style={styles.shipTxt}>Ship</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={
                    activeTab == 'Ship'
                      ? styles.inActiveView
                      : styles.activeView
                  }
                  hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}
                  onPress={() => handleTabSwitch('Recipient')}>
                  <Text style={styles.shipTxt}>Recipient</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View />
            )}
            <TouchableOpacity
              style={[
                isIPad ? styles.crossViewI : styles.crossView,
                {top: filterType == '1' ? -5 : 0},
              ]}
              onPress={() => onClose(false)}>
              <Image
                source={IMAGES.close}
                style={isIPad ? styles.closeImgI : styles.closeImg}
              />
            </TouchableOpacity>
          </View>

          {filterType == '2' ? (
            <View style={styles.searchInput}>
              <SvgXml
                xml={ICONS.header.search}
                width="20"
                height="20"
                style={styles.icon}
              />
              <TextInput
                style={styles.input}
                placeholder="Search"
                placeholderTextColor={'#919191'}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          ) : (
            <></>
          )}
          {filterType == '1' ? (
            <FlatList
              data={sortList}
              style={{marginTop: 55}}
              keyExtractor={item => item}
              renderItem={({item, index}) => (
                <>
                  <Pressable
                    style={styles.itemContainer}
                    onPress={() => onClose(true)}>
                    <Text style={isIPad ? styles.itemTextI : styles.itemText}>
                      {item}
                    </Text>
                    <Image
                      source={IMAGES.sort}
                      style={isIPad ? styles.sorIconI : styles.sorIcon}
                    />
                  </Pressable>
                  <View style={styles.lineView}></View>
                </>
              )}
            />
          ) : (
            <FlatList
              data={activeTab === 'Ship' ? shipsArr : recipientArr}
              style={{marginTop: 15}}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({item, index}) => (
                <>
                  <TouchableOpacity
                    style={{flexDirection: 'row', alignItems: 'center'}}
                    onPress={() => onItemClick(index)}>
                    <Text
                      style={[
                        styles.itemText,
                        {color: item?.isSelect ? '#61B3E4' : 'black'},
                      ]}>
                      {activeTab === 'Ship'
                        ? item?.name
                        : `${item?.first_name + ' ' + item?.last_name}`}
                    </Text>
                    {/* {activeTab === 'Ship' ? <View style={{ height: 20, width: 20, borderWidth: 1, borderColor: '#808080' }}></View> : <></>}  */}
                    {activeTab === 'Ship' &&
                      (!item?.isSelect ? (
                        <TouchableOpacity
                          onPress={() => onItemClick(index)}
                          style={styles.box}></TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={styles.blueBox}
                          onPress={() => onItemClick(index)}>
                          <Image style={styles.tick} source={IMAGES.check} />
                        </TouchableOpacity>
                      ))}
                  </TouchableOpacity>
                  <View style={styles.lineView}></View>
                </>
              )}
            />
          )}
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            {activeTab === 'Ship' && filterType == '2' ? (
              <TouchableOpacity
                style={[styles.applyButton, {backgroundColor: '#1B77AC'}]}
                onPress={() => {
                  onClose(true);
                  Alert.alert('', 'Download Successfully', [
                    {text: 'OK', onPress: () => __DEV__ && console.log('OK Pressed')},
                  ]);
                }}>
                <Text style={styles.applyButtonText}>Download</Text>
              </TouchableOpacity>
            ) : (
              <></>
            )}

            {filterType != '1' ? (
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => onClose(false)}>
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            ) : (
              <></>
            )}
          </View>
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
  box: {
    height: isIPad ? 26 : 22,
    width: isIPad ? 26 : 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#80808070',
  },
  tick: {
    height: isIPad ? 12 : 9,
    width: isIPad ? 16 : 13,
    tintColor: 'white',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  input: {
    fontSize: 16,
    fontFamily: FONTS.PoppinsRegular,
    color: 'black',
    marginLeft: 10,
  },
  icon: {
    height: 21.5,
    width: 21.5,
  },
  blueBox: {
    height: isIPad ? 26 : 22,
    width: isIPad ? 26 : 22,
    backgroundColor: '#61B3E4',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  closeImg: {
    height: 10,
    width: 10,
    tintColor: 'black',
  },
  closeImgI: {
    height: 15,
    width: 15,
    tintColor: 'black',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#1B77AC',
  },
  tabText: {
    fontSize: 16,
    color: '#333333',
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    padding: 10,
  },
  searchInput: {
    height: 48,
    backgroundColor: '#F4F4F4',
    //borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 13,
    marginBottom: 20,
    marginTop: 17,
    flexDirection: 'row',
    alignItems: 'center',
  },
  lineView: {
    marginVertical: 16.5,
    height: 1,
    backgroundColor: '#E8E8E8',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    // paddingVertical: 10,
  },
  itemText: {
    flex: 1,
    fontSize: 17,
    color: 'black',
    fontFamily: FONTS.PoppinsRegular,
  },
  itemTextI: {
    flex: 1,
    fontSize: 20,
    color: 'black',
    fontFamily: FONTS.PoppinsRegular,
  },
  applyButton: {
    height: 60,
    backgroundColor: '#FDBE6F',
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    flex: 1,
    marginLeft: 5,
    marginRight: 5,
  },
  applyButtonText: {
    color: 'white',
    fontSize: 18,
    fontFamily: FONTS.PoppinsSemiBold,
  },
  crossView: {
    height: 48,
    width: 48,
    borderRadius: 48 / 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F4F4',
    // alignSelf: 'flex-end',
    position: 'absolute',
    right: -10,
  },
  crossViewI: {
    height: 60,
    width: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F4F4',
    // alignSelf: 'flex-end',
    position: 'absolute',
    right: -10,
  },
  sorIcon: {
    height: 13.5,
    width: 15,
    resizeMode: 'contain',
  },
  sorIconI: {
    height: 18,
    width: 18,
    resizeMode: 'contain',
  },
  rowView: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shipView: {
    backgroundColor: '#F6F7F8',
    borderRadius: 24,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0.5,
  },
  shipTxt: {
    fontSize: 14,
    fontFamily: FONTS.PoppinsRegular,
    color: 'black',
  },
  activeView: {
    backgroundColor: 'white',
    borderRadius: 24,
    flex: 1,
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  inActiveView: {
    flex: 1,
    alignItems: 'center',
  },
});

export default FiltersModal;
