import { StyleSheet, Text, TextInput, View } from 'react-native';
import React, { useContext, useEffect, useState } from 'react';
import { BackHeader } from '../components/Header';
import { Backend_URL } from '../util/apiCalls';
import { Checkout } from '../db/db.crud';
import axios from 'axios';
import { AuthContext } from '../contexts';
import { Package, PackageList } from '../components/PackageList';
import { PackageInfoModal } from '../components/PackageInfoModal';
import { useNavigationContext } from '../contexts/navigationcontext';
import { isIPad } from '../utilities/securestorage';
import { FONTS, ICONS } from '../assets';
import { SvgXml } from 'react-native-svg';

const OfflineCheckout = ({ navigation }: any) => {
  const { user } = useContext(AuthContext);
  const [checkouts, setCheckouts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [Copycheckouts, setCopyCheckouts] = useState([]);
  const [searchInDB, setSearchInDB] = useState("");
  const [page, setPage] = useState(1);

  const { showLoader } = useNavigationContext();

  const fetchCheckouts = async () => {
    try {
      setIsLoading(true);

      const allRecords = await Checkout.getAllRecords();
      const updatedRecords = await Promise.all(
        allRecords.map(async (item: any, idx: any) => {
          const updatedPackages = await Promise.all(
            JSON.parse(item.packagesId).map(async (packageId: any) => {
              try {
                const response = await axios.get(
                  Backend_URL + '/single-package?id=' + packageId,
                  {
                    headers: {
                      Authorization: 'Bearer ' + user?.token,
                    },
                  },
                );
                const res = response.data;
                const pckgStatus = res?.status || 'Status Not Found';
                const sorted_package_statuses =
                  res?.sorted_package_statuses ||
                  'Sorted Package Statuses Not Found';

                return {
                  ...res,
                  checkoutNo: idx,
                  user: res.user,
                  tracking_no: res.tracking_no,
                  package_type: res.package_type,
                  bag: res?.shelf || 'Bag # Not Found',
                  tag: res?.tag_number || 'Tag # Not Found',
                  date_received:
                    res?.date_received || 'Date Received Not Found',
                  sorted_package_statuses,
                  packageStatus: pckgStatus,
                  notes: item.notes,
                  synced: item.Synced,
                  cashReceived: item.cashReceived,
                  totalAmount: item.totalAmount,
                  selectedStatus: item.selectedStatus,
                };
              } catch (error) {
                console.error('Error fetching package:', error);
                return null;
              }
            }),
          );

          return updatedPackages.filter(pkg => pkg !== null);
        }),
      );
      setCheckouts(updatedRecords);
      setCopyCheckouts(updatedRecords);
      setIsLoading(false);
      setPage(1);
    } catch (error) {
      console.error('Error fetching checkouts:', error);
      setIsLoading(false);
    }
  };

  const [searchTimeout, setSearchTimeout] = useState(null);
  const FilterPackages = (text) => {
    __DEV__ && console.log('text=============', text);
    __DEV__ && console.log('Copycheckouts', Copycheckouts);
  
    setSearchInDB(text);
  
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
  
    const timeout = setTimeout(() => {
      try {
        // Flatten the checkouts array if it contains nested arrays
        const allCheckouts = Copycheckouts.flat();
  
        const filteredPackages = allCheckouts.filter((packageData) => {
          const trackingNo = packageData.tracking_no.toString().toLowerCase();
          const user = packageData?.user;
          const firstName =
            user && user.first_name ? user.first_name.toString().toLowerCase() : "";
          const lastName =
            user && user.last_name ? user.last_name.toString().toLowerCase() : "";
  
          const fullName = `${firstName} ${lastName}`.trim();
          const searchValue = text.toLowerCase();
          
          // Filter based on tracking number, first name, last name, or full name
          return (
            trackingNo.includes(searchValue) ||
            firstName.includes(searchValue) ||
            lastName.includes(searchValue) ||
            fullName.includes(searchValue)
          );
        });
  
        __DEV__ && console.log('filteredPackages', filteredPackages);
        setCheckouts(text !== "" ? filteredPackages : Copycheckouts);
        setPage(1);
      } catch (error) {
        console.error('Error in FilterPackages:', error);
      }
    }, 300); // 300ms delay, adjust as needed
  
    setSearchTimeout(timeout);
  };
  

  
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchCheckouts();
    });

    return unsubscribe;
  }, [navigation]);

  const handleSearch = text => {
    setSearchQuery(text);
  };

  const filteredData = checkouts.flatMap((checkout: any) => {
    // Check if `checkout` is an array or an object
    if (Array.isArray(checkout)) {
      return checkout.filter((item: any) =>
        item.tracking_no.toLowerCase().includes(searchQuery.toLowerCase())
      );
    } else {
      // If `checkout` is not an array, handle filtering by the `tracking_no` directly on the object
      return checkout.tracking_no.toLowerCase().includes(searchQuery.toLowerCase())
        ? [checkout] // Wrap the filtered `checkout` in an array to maintain flat structure
        : []; // If no match, return an empty array
    }
  });

  // __DEV__ && console.log('filteredData', filteredData);

  const [refetching, setRefetching] = useState(false);

  const [packageItem, setPackageItem] = useState<Package | null>(null);
  const [isPackageInfo, setIsPackageInfo] = useState(false);

  const onArrowClick = (item: Package) => {
    // __DEV__ && console.log('item==', item);
    setPackageItem(item);
    setIsPackageInfo(!isPackageInfo);
  };
  const itemsPerPage = 10;
  const paginatedData =filteredData?.slice(0, page * itemsPerPage);


  const loadMoreDataa = () => {
  if (page * itemsPerPage < filteredData?.length) {
    setPage(prevPage => prevPage + 1);
  }
};
  __DEV__ && console.log('paginatedData', paginatedData);

  return (
    <View style={styles.mainView}>
      <BackHeader title="Offline Checkouts" />
      {/* <Text>OfflineCheckout</Text> */}
      <View style={styles.inputContier}>
        <View style={[styles.iconsContainer, { flex: 1 }]}>
          <SvgXml
            xml={ICONS.header.search}
            width={isIPad ? 35 : '21.5'}
            height={isIPad ? 35 : '21.5'}
          // style={styles.icon}
          />
          <TextInput
            style={[styles.input, { fontSize: isIPad ? 24 : 14, }]}
            placeholder="Tracking or Name"
            placeholderTextColor="#999"
            value={searchInDB}
            onChangeText={val => FilterPackages(val)}
            autoCorrect={false}
          //autoFocus={true}
          />
        </View>
      </View>
      {packageItem && isPackageInfo ? (
        <PackageInfoModal
          item={packageItem}
          showPaid={true}
          visible={isPackageInfo}
          onClose={() => setIsPackageInfo(!isPackageInfo)}
          navigation={navigation}
        />
      ) : (
        <></>
      )}
      <PackageList
        isRecent={true}
        packages={paginatedData || []}
        onItemPress={null}
        onArrowClick={onArrowClick}
        showSync={true}
        showLoader={isLoading}
        refetching={showLoader || refetching}
        refetchData={fetchCheckouts}
        loadMoreData={loadMoreDataa}
        page={page}
        totalItems={filteredData.length}
      />
    </View>
  );
};

export default OfflineCheckout;

const styles = StyleSheet.create({
  mainView: {
    flex: 1,
    backgroundColor: 'white',
    paddingTop: isIPad ? 50 : 30
  },
  input: {
    fontSize: 14,
    fontFamily: FONTS.PoppinsRegular,
    color: 'black',
    marginLeft: 10,
    flex: 1,
  },
  inputContier: {
    alignItems: 'center',
    width: '95%',
    alignSelf: 'center',
    height: isIPad ? 80 : 48,
    backgroundColor: '#F4F4F4',
    marginTop: isIPad ? 20 : 10,
    // backgroundColor:'green',
    borderRadius: 24,
    paddingHorizontal: isIPad ? 10 : 10,
    marginHorizontal: 5,
    // flex: 1,

  },
  iconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
