import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  DeviceEventEmitter,
  BackHandler,
  StatusBar,
  Dimensions,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { Package, PackageList } from '../components/PackageList';
import { Header } from '../components/Header';
import { FONTS, IMAGES } from '../assets';
import SearchHeader from '../components/SearchHeader';
import FiltersModal from '../components/Filters';
import { PackageInfoModal } from '../components/PackageInfoModal';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { UpdatePackageModal } from '../components/UpdatePackageModal';
import { SuccessModal } from '../components/SuccessModal';
import { isIPad } from '../utilities/securestorage';
import { useAuth } from '../contexts';
import { useNavigationContext } from '../contexts/navigationcontext';
import { usePackageContext } from '../contexts/packagecontext';
import { useMode } from '../db/db.context';
import { filterSortPackages } from '../util/apiCalls';
import SyncModal from '../components/SyncModal';
import { OfflineMode } from '../components/OfflineMode';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from "react-native-fs";
import { AdvancedForms as AdvancedFormsDB } from '../db/db.crud';
import { useRoute } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { useTranslation } from 'react-i18next';


const Search = () => {
  const navigation = useNavigation<any>();
 const { t, i18n } = useTranslation();
  const [isModalVisible, setModalVisible] = useState(false);
  const [visible, setVisible] = useState(false);
  const { user } = useAuth();
  const { expire } = useAuth();

  const { packageList, getPackageData } = usePackageContext();

  const { setShowLoader, showLoader, isInternet, setIsInternet } =
    useNavigationContext();
  const [isNet, setIsNet] = useState(isInternet);

  const [packageListData, setPackageListData] = useState<Package[]>([]);
  const [selectAllChecked, setSelectAllChecked] = useState(false);
  const [selectCount, setSelectCount] = useState(0);
  const [selectedArr, setSelectedArr] = useState<Package[]>([]);
  const [filterType, setFilterType] = useState('');
  const [isPackageInfo, setIsPackageInfo] = useState(false);
  const [packageItem, setPackageItem] = useState<Package | null>(null);
  const [successVisible, setSuccessVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [page, setPage] = useState(1);
  // __DEV__ && console.log('selectedArr', selectedArr.length);

  const [disableCheck, setDisableCheck] = useState(false);
  const route = useRoute<any>();
  const user_id = route?.params?.user_id;
  const [todayOnly, setTodayonly] = useState(route?.params?.today_only)
  console.log('todayOnly', todayOnly)
  const [selectedShip, setSelectedShip] = useState(null); // To store selected ship
  const [selectedRecipient, setSelectedRecipient] = useState(null); // To store selected recipient
  const [selectedSortOption, setSelectedSortOption] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<any>(null);
  const [selectedPackageType, setSelectedPackageType] = useState<any>(null);
  // __DEV__ && console.log('packageListData', packageListData);
  const [isIncreasing, setIsIncreasing] = useState(true); // Assuming you need this state for sorting order
  const [loading, setLoading] = useState(false);
  const [refetching, setRefetching] = useState(false);
  const [flatListData, setFlatListData] = useState<any>([]);
  const [showWarningmessage, setShowWarningMessage] = useState(false);
  const [showOfflineAlert, setShowOfflineAlert] = useState(false);
  const openModal = (value: string) => {
    setFilterType(value);
    setModalVisible(true);
  };

  const closeModal = (type: boolean) => {
    setModalVisible(false);
    // if (type) {
    //   setSuccessVisible(!successVisible)
    // }
  };
  __DEV__ && console.log('user_id from route:', route?.params?.user_id);
  console.log('selectedStatus=======================', selectedStatus)
  console.log('selectedPackageType==========', selectedPackageType)
  const handleSort = () => {
    // Sorting logic
  };

  const handleFilter = () => {
    // Filtering logic
  };

  const {
    isOnline,
    ProgressBar,
    dbPackages,
    sortPackagesByFirstName,
    checkedOutPackages,
    modalVisible: dbModal,
    setModalVisible: setdbModal,
    FilterPackages,
    sortingOrder,
    setSortingOrder,
    setSelectedShipIdDB,
  } = useMode();
  console.log('dbPackages==========',dbPackages)
  const handleSelectAll = (value: string) => {

    setSelectAllChecked(!selectAllChecked);
    let arr = isOnline ? flatListData : dbPackages;
    let count = 0;

    if (value == 'Yes') {
      count = selectCount;

      setSelectedArr([]);

      arr.map(i => {
        count = count - 1;
        i.isSelect = false;
      });
    } else {
      arr.map(i => {
        count = count + 1;
        i.isSelect = true;
      });

      setSelectedArr(arr);
    }

    // setPackageListData(arr);
    // setSelectCount(count);

    // __DEV__ && console.log('arr', arr.length);

    setPackageListData(arr);
    setFlatListData(arr);
    setSelectCount(count);
  };

  // __DEV__ && console.log('dbPackages', dbPackages);

  // __DEV__ && console.log('checkedOutPackages', checkedOutPackages);


  useEffect(() => {
    onClear();
  }, [isOnline]);

  useEffect(() => {
    // __DEV__ && console.log('sortingOrder', sortingOrder)
    const newData = isOnline
      ? packageListData
      : dbPackages
        ? checkedOutPackages
          ?
          sortPackagesByFirstName(
            dbPackages.filter(pkg => !checkedOutPackages.includes(pkg.id)), true
          )
          : sortPackagesByFirstName(dbPackages, !sortingOrder)
        : [];
    setFlatListData(newData);
    // setPage(1);
  }, [isOnline, packageList, dbPackages, packageListData, sortingOrder]);

  useEffect(() => {

    setPage(1);
  }, [packageList, dbPackages, sortingOrder]);


  const onItemPress = (item: Package, index: number) => {
    // Pure item object ko safety ke sath naye reference ke sath copy karein
    let arr = flatListData.map((pkg: Package, idx: number) =>
      idx === index ? { ...pkg, isSelect: !pkg.isSelect } : pkg
    );

    let selectArr = [...selectedArr];
    let count = selectCount;

    if (!flatListData[index].isSelect) { // Checked logic state safely
      if (!selectArr.some(i => i.id === item.id)) {
        selectArr.push({ ...item, isSelect: true });
        count += 1;
      }
    } else {
      let dex = selectArr.findIndex(i => i.id === item.id);
      if (dex > -1) {
        selectArr.splice(dex, 1);
        count = Math.max(0, count - 1);
      }
    }

    setPackageListData(arr);
    setFlatListData(arr);
    setSelectedArr(selectArr);
    setSelectCount(count);
  };


  // __DEV__ && console.log('selectArr', selectedArr);

  const [disabledCheckout, setDisabledCheckout] = useState(false);

  useEffect(() => {
    if (selectedArr.length > 0) {
      const firstUserId = selectedArr[0].user.id;
      const allSameUser = selectedArr.every(
        item => item.user.id === firstUserId,
      );
      const howManySameData = flatListData.filter(item => item.user.id === firstUserId).length;


      if (allSameUser) {

        setDisabledCheckout(false);
        if (selectedArr.length !== howManySameData) {
          setShowWarningMessage(true);
        } else {
          setShowWarningMessage(false);
        }
      } else {
        setDisabledCheckout(true);
      }
    } else {
      setDisabledCheckout(true);
    }
  }, [selectedArr]);

  const onClear = () => {
    let baseArr = isOnline ? packageListData : dbPackages;
    // Create a brand new array reference with reset elements
    let clearedArr = baseArr?.map(i => ({ ...i, isSelect: false })) || [];

    setSelectCount(0);
    setPackageListData(clearedArr);
    setFlatListData(clearedArr); // Flatlist state also cleared cleanly
    setSelectAllChecked(false);
    setSelectedArr([]);
    setSelectedShip(null);
    setSelectedShipIdDB();
    setSortingOrder(false);
  };


  const onArrowClick = (item: Package) => {
    // __DEV__ && console.log('item==', item);
    setPackageItem(item);
    setIsPackageInfo(!isPackageInfo);
  };

  const onUpdatePackage = () => {
    setVisible(!visible);
  };

  const onShowPackage = () => {
    navigation.navigate('ShowOfflineCheckout'); ``
  };

  const onclickMenu = () => {
    navigation.navigate('ShowAdvancedForms');
  };


  useEffect(() => {
    const backAction = () => {
      __DEV__ && console.log('backpressed');
      // onClear();

      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );

    return () => backHandler.remove();
  }, []);

  const [isProgressOn, setIsProgressOn] = useState(false);

  // __DEV__ && console.log('dbPackages', dbPackages);

  // const constructParams = (inputValue: any) => {
  //   let params = '';
  //   let sortParam = selectedSortOption
  //     ? `&sort_by=${isIncreasing ? selectedSortOption : '-' + selectedSortOption}`
  //     : '';

  //   if (inputValue) {
  //     params += `?keyword=${inputValue}`;
  //   }

  //   if (selectedShip) {
  //     params += params ? `&ship=${selectedShip}` : `?ship=${selectedShip}`;
  //   }

  //   if (selectedRecipient) {
  //     params += params ? `&user=${selectedRecipient}` : `?user=${selectedRecipient}`;
  //   }

  //   if (user_id) {
  //     params += params ? `&user_id=${user_id}` : `?user_id=${user_id}`;
  //   }
  //   if(todayOnly == true){
  //      params += params ? `&today_only=${todayOnly}` : `?today_only=${todayOnly}`;
  //   }

  //   // ✅ ADDED STATUS FILTER
  //   if (selectedStatus) {
  //     params += params ? `&current_status=${selectedStatus}` : `?current_status=${selectedStatus}`;
  //   }

  //   // ✅ ADDED PACKAGE TYPE FILTER
  //   if (selectedPackageType) {
  //     params += params ? `&package_type=${selectedPackageType}` : `?package_type=${selectedPackageType}`;
  //   }

  //   if (sortParam) {
  //     params += params.includes('?') ? sortParam : `?${sortParam.slice(1)}`;
  //   }
  // console.log('params====================================', params)
  //   return params;
  // };

  const constructParams = (inputValue: any) => {
    let params = [];

    // Sabhi filters ko array mein push karein
    if (inputValue) params.push(`keyword=${inputValue}`);
    if (selectedShip) params.push(`ship=${selectedShip}`);
    if (selectedRecipient) params.push(`user=${selectedRecipient}`);
    if (user_id) params.push(`user_id=${user_id}`);
    if (todayOnly) params.push(`today_only=true`);
    if (selectedStatus) params.push(`current_status=${selectedStatus}`);
    if (selectedPackageType) params.push(`package_type=${selectedPackageType}`);

    // Sort Logic: Agar isIncreasing false hai toh '-' prefix lagao
    if (selectedSortOption) {
      const sortValue = isIncreasing ? selectedSortOption : `-${selectedSortOption}`;
      params.push(`sort_by=${sortValue}`);
    }

    // Join karke '?' prefix lagao
    const finalQuery = params.length > 0 ? `?${params.join('&')}` : '';

    console.log('Final API Params:', finalQuery);
    return finalQuery;
  };
  const [newData, setNewData] = useState<any>({});

  const fetchData = async (inputVal: any) => {
    __DEV__ && console.log('inputVal============', inputVal);
    if (user) {
      let arr = isOnline ? packageListData : dbPackages;
      arr?.map(i => (i.isSelect = false));

      setLoading(true); // start loading
      setPackageListData([]);
      setFlatListData([]);

      try {
        const result = await filterSortPackages(
          user,
          constructParams(inputVal) || '',
        );

        setNewData({ data: result.results, inputVal });
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      } finally {
        // setLoading(false); // end loading
      }
    }
  };

  const fetchOfflineData = () => { };

  useEffect(() => {
    __DEV__ && console.log('call3');
    if (isOnline) {
      if (packageList?.length == 0) {
        fetchData(inputValue);
      } else if (packageListData?.length > 0) {
        setRefetching(false);
        setSelectedArr([]);
        setPackageListData([]);
        setPackageListData(packageListData);
      }
    }
  }, [packageList]);

  useEffect(() => {
    fetchData(inputValue);
  }, [
    selectedShip,
    selectedRecipient,
    selectedSortOption,
    selectedStatus,       // Added listener
    selectedPackageType,  // Added listener
    inputValue,
    user,
    isIncreasing,
  ]);

  const refetchData = () => {
    setRefetching(true);
    fetchData(inputValue);
  };

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('refetchPackages', () => {
      refetchData();
      onClear();
    });

    return () => {
      subscription.remove(); // Unmount hote hi memory clean up
    };
  }, []);


  const loadMoreData = () => {
    if (!loading && hasMoreData) {
      fetchData(inputValue, page + 1);
    }
  };

  useEffect(() => {
    if (newData.inputVal == inputValue) {
      setPackageListData(newData.data);
      setLoading(false);
      setRefetching(false);
    }
  }, [newData]);

  // useEffect(() => {
  //   const handleNetworkChange = async () => {
  //     if (isInternet) {
  //       setIsNet(true);
  //     } else {
  //       const hasShownOfflineMode = await AsyncStorage.getItem('hasShownOfflineMode');
  //       __DEV__ && console.log('hasShownOfflineMode', hasShownOfflineMode)
  //       if (hasShownOfflineMode !== 'true') {
  //         setIsNet(false);
  //       }
  //     }
  //   };

  //   handleNetworkChange();

  // }, [isInternet]);


  // const handleCloseOfflineMode = async () => {
  //   setIsNet(true);

  //   await AsyncStorage.setItem('hasShownOfflineMode', 'true');
  // };
  // const debounced = React.useCallback(debounce(fetchData, 500), []);

  // useEffect(() => {
  //   debounced(inputValue, 1000);
  // }, [inputValue]);
  console.log('setShowOfflineAlert', setShowOfflineAlert)
  useEffect(() => {
    const handleNetworkChange = async () => {
      // Network status abhi load nahi hua
      if (isInternet === null || isInternet === undefined) {
        return;
      }

      if (isInternet) {
        setIsNet(true);
        setShowOfflineAlert(false);
      } else {
        setIsNet(false);

        const hasShown = await AsyncStorage.getItem('hasShownOfflineMode');

        if (hasShown !== 'true') {
          setShowOfflineAlert(true);
        }
      }
    };

    handleNetworkChange();
  }, [isInternet]);
  useEffect(() => {
    console.log('isInternet:=========', isInternet);
  }, [isInternet]);

  const handleCloseOfflineMode = async () => {
    setShowOfflineAlert(false); // Modal hide karein
    await AsyncStorage.setItem('hasShownOfflineMode', 'true'); // Save karein taaki dobara na dikhe
  };
  useEffect(() => {
    navigation.addListener('focus', () => {
      if (packageItem) {
        setIsPackageInfo(true);
      }
    });
  }, []);

  if (isProgressOn) {
    return <ProgressBar />;
  }
  const { height, width } = Dimensions.get('screen');

  const itemsPerPage = 10;
  const paginatedData = flatListData?.slice(0, page * itemsPerPage);


  const loadMoreDataa = () => {
    if (page * itemsPerPage < flatListData?.length) {
      setPage(prevPage => prevPage + 1);
    }
  };





  //   here fetch all data from AdvancedFormsDB
  const CSV_SCHEMA = [
    "id", "category", "timestamp",
    "name", "email", "ship_name",
    "amount", "trackingNo", "type", "notes", "synced",
    "senderPaidFull", "payment_received",
    "packageType", "contents", "value", "country",
    "address1", "address2", "city", "state", "zip",
    "internationalNotes", "domesticNotes",
    "crewMemberName", "crewMemberEmail", "ship_to",
    "phone", "total", "returnDate",
    "reason", "paymentMethod", "refund_method",
  ];

  const packageTypes = [
    { id: 1, name: "Standard: <15lbs, <45in" },
    { id: 2, name: "Large: 16-25lbs, 46-60in" },
    { id: 3, name: "X-Large: 26-40lbs, 61-75in" },
    { id: 4, name: "XX-Large: 41-60lbs, 76-90in" },
    { id: 6, name: "Pickup/ Dropoff Local" },
  ];

  const packageTypeMap = packageTypes.reduce((acc, item) => {
    acc[item.id] = item.name;
    return acc;
  }, {} as Record<number, string>);

  const escapeCSV = (value: any) => {
    if (value === null || value === undefined) return "";
    if (typeof value === "boolean") return value ? "YES" : "NO";
    return `"${String(value).replace(/"/g, '""')}"`;
  };

  const convertToCSV = (records: any[]) => {
    const headers = CSV_SCHEMA.join(",");

    const rows = records.map(record => {
      const row: any = {};
      CSV_SCHEMA.forEach(k => (row[k] = ""));

      row.id = record.id ?? "";
      row.category = record.category ?? "";
      row.timestamp = record.timestamp ?? "";

      if (record.data) {
        Object.entries(record.data).forEach(([key, value]: any) => {
          if (key === "type") row.type = packageTypeMap[value] ?? value;
          else row[key] = value;
        });
      }

      if (record.category === "storage") {
        const months = parseFloat(row.total) || 0;
        row.amount = `$${30 * months}`;
      } else if (row.amount) {
        row.amount = `$${row.amount}`;
      }

      return CSV_SCHEMA.map(k => escapeCSV(row[k])).join(",");
    });

    return [headers, ...rows].join("\n");
  };

  const downloadCSV = async () => {
    try {
      const records = await AdvancedFormsDB.getAllRecords();

      if (!records || records.length === 0) {
        Alert.alert(
          t('No Data'),
          t('No offline records found.')
        );
        return;
      }

      const csv = convertToCSV(records);

      const path =
        Platform.OS === "ios"
          ? `${RNFS.DocumentDirectoryPath}/advanced_forms.csv`
          : `${RNFS.DownloadDirectoryPath || RNFS.ExternalDirectoryPath}/advanced_forms.csv`;

      await RNFS.writeFile(path, csv, "utf8");

      // Alert.alert(
      //   "Success",
      //   Platform.OS === "ios"
      //     ? "CSV saved successfully!\n\nFiles → On My iPhone → advanced_forms.csv"
      //     : "CSV saved successfully!\n\nInternal Storage → Download → advanced_forms.csv"
      // );
      Alert.alert(
        t('Success'),
        Platform.OS === 'ios'
          ? t('CSV saved successfully on your iPhone.')
          : t('CSV saved successfully in the Download folder.')
      );
    } catch (error) {
      console.error("CSV Export Error:", error);
      Alert.alert(
        t('Error'),
        t('CSV export failed.')
      );
    }
  };


  return (
    <View style={[styles.container]}>

      <SyncModal visible={dbModal} setModalVisible={setdbModal} />
      {showOfflineAlert && (
        <OfflineMode
          onRedView={() => { }}
          isRedView={false}
          onClose={handleCloseOfflineMode}
        />
      )}
      <View style={{ marginTop: 20 }}>
        <Header
          moreOption={val => {
            // setInputValue(val);
            // debounced();
          }}
          inputValue={inputValue}
          onSearchText={val => {
            if (isOnline) {
              setInputValue(val);
            } else {
              FilterPackages(val);
              // FilterPackages(text);
            }
          }}
          // onSearchText={val => {}}
          onClear={onClear}
          isOnline={isOnline}
        />
      </View>


      <SearchHeader
        onSelectAll={handleSelectAll}
        onSort={(value) => {
          if (isOnline) {
            __DEV__ && console.log('isOnline', isOnline)
            __DEV__ && console.log('calllllllllllllllllllllllllllllllllllllllll', value)
            openModal(value);  // Open the modal if online
          }
          else {
            setSortingOrder(!sortingOrder);  // Toggle sorting order if offline
            setModalVisible(false);  // Close the modal in both cases
          }

        }}
        onShowOfflinePackage={onShowPackage}
        onClickOfflineMenu={onclickMenu}
        onFilter={openModal}
        selectAllChecked={selectAllChecked}
        count={selectCount}
        onClear={onClear}
        isOnline={isOnline}
        downloadCSV={downloadCSV}
      />

      {successVisible ? (
        <SuccessModal
          visible={successVisible}
          content={{ heading: t('Download Successfully!'), middle: '', lable: '' }}
          onClose={() => setSuccessVisible(!successVisible)}
        />
      ) : (
        <></>
      )}

      {/* <FiltersModal
        filterType={filterType}
        visible={isModalVisible}
        onClose={closeModal}
      /> */}


      <FiltersModal
        filterType={filterType}
        visible={isModalVisible}
        setModalVisible={setModalVisible}
        onClose={closeModal}
        packages={packageListData}
        selectedShip={selectedShip}
        setSelectedShip={setSelectedShip}
        selectedRecipient={selectedRecipient}
        setSelectedRecipient={setSelectedRecipient}
        selectedSortOption={selectedSortOption}
        setSelectedSortOption={setSelectedSortOption}
        isIncreasing={isIncreasing}
        setIsIncreasing={setIsIncreasing}
        setIsProgressOn={setIsProgressOn}
        isOnline={isOnline}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        selectedPackageType={selectedPackageType}
        setSelectedPackageType={setSelectedPackageType}
      />

      <PackageList
        isRecent={false}

        packages={paginatedData}
        onItemPress={onItemPress}
        onArrowClick={onArrowClick}
        showLoader={loading || refetching}
        refetching={false}
        refetchData={refetchData}
        loadMoreData={loadMoreDataa}
        page={page}
        totalItems={flatListData?.length}
      />

      {packageItem && isPackageInfo ? (
        <PackageInfoModal
          item={packageItem}
          showPaid={false}
          visible={isPackageInfo}
          onClose={() => setIsPackageInfo(!isPackageInfo)}
          navigation={navigation}
        />
      ) : (
        <></>
      )}
      {visible ? (
        <UpdatePackageModal
          visible={visible}
          onClose={() => setVisible(!visible)}
          onSave={onUpdatePackage}
          selectedPackages={selectedArr}
          setSelectedPackages={setSelectedArr}
          onClear={onClear}
          setVisible={setVisible}
          refetchData={refetchData}
        />
      ) : (
        <></>
      )}

      <View style={styles.drawerContainer}>
        {/* Gradient background for the whole footer area */}
        <LinearGradient
          colors={['#1C2C5B', '#1F3C73', '#2B5DAA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, {
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20
          }]}
        />

        {isOnline && (
          <TouchableOpacity
            disabled={selectedArr.length == 0}
            style={[
              isIPad ? styles.buttonI : styles.button,
              {
                opacity: selectedArr.length <= 0 ? 0.5 : 1,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.2)' // Optional: halka border for depth
              },
            ]}
            onPress={() => setVisible(!visible)}>
            <LinearGradient
              colors={['#1C2C5B', '#1F3C73', '#2B5DAA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={[styles.buttonText, { fontSize: isIPad ? 27 : 16 }]}>
              {t('Update Package')}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            isIPad ? styles.buttonI : styles.button,
            { backgroundColor: !disabledCheckout ? '#FDBE6F' : '#A19165' },
          ]}
          disabled={disabledCheckout}
          onPress={() =>
            navigation.navigate('Checkout', {
              arr: selectedArr,
              msg: showWarningmessage,
            })
          }>
          <Text style={[styles.buttonText, { fontSize: isIPad ? 27 : 16 }]}>
            {t('Checkout')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: isIPad ? 50 : 20,
    backgroundColor: 'white'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    justifyContent: 'space-between',
  },
  selectall: {
    justifyContent: 'flex-start',
  },
  fitlers: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  headerText: {
    fontSize: 13,
    color: '#000',
  },
  iconButton: {
    padding: 10,
  },
  iconButtonText: {
    fontSize: 13,
    color: '#000',
  },
  drawerContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#002B45',
    paddingVertical: isIPad ? 20 : 10,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: isIPad ? 40 : 30
  },
  button: {
    flex: 1,
    marginHorizontal: 10,
    borderRadius: 25,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonI: {
    flex: 1,
    marginHorizontal: 10,
    borderRadius: 40,
    height: isIPad ? 75 : 65,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: FONTS.RICORDOSemiBold,
  },
  actionButton: {
    width: 200,
    height: 50,
    borderRadius: 30,
    alignSelf: 'flex-end',
    marginBottom: 10,
    marginEnd: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    // Android drop shadow
    elevation: 3,
    // iOS drop shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 1.84,
  },
  actionButtonI: {
    width: 300,
    height: 70,
    borderRadius: 40,
    justifyContent: 'center',
    alignSelf: 'flex-end',
    marginBottom: 10,
    marginEnd: 25,
    alignItems: 'center',
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    // Android drop shadow
    elevation: 3,
    // iOS drop shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 1.84,
  },
});

export { Search };
