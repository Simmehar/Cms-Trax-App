import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, DeviceEventEmitter, TextInput } from 'react-native';
import { BackHeader } from '../components/Header';
import { Package, PackageList } from '../components/PackageList';
import { usePackageContext } from '../contexts/packagecontext';
import { PackageInfoModal } from '../components/PackageInfoModal';
import { useNavigationContext } from '../contexts/navigationcontext';
import { isIPad } from '../utilities/securestorage';
import { useFocusEffect } from '@react-navigation/native';
import { SvgXml } from 'react-native-svg';
import { FONTS, ICONS } from '../assets';

let searchTimeout: NodeJS.Timeout;
const RecentActivity: React.FC = ({ navigation }: any) => {
  // const [packageList, setPackageList] = useState<Package[]>(Packages);

  const [packageListData, setPackageListData] = useState<Package[]>([]);
  const [inputValue, setInputValue] = useState('');
  const { showLoader } = useNavigationContext();
   const [loading, setLoading] = useState(true);
     const [page, setPage] = useState(1);
   
  const { recentPackageList, getRecentCheckoutPackagesList } =
    usePackageContext();

  // __DEV__ && console.log('recentPackageList', showLoader);
  const [refetching, setRefetching] = useState(false);
// __DEV__ && console.log('packageListData :>> ', packageListData);
useEffect(() => {
  if (recentPackageList?.length > 0) {
    setRefetching(false);
    setLoading(false);
    setPackageListData(recentPackageList);
    setPage(1);
  }
}, [recentPackageList]);

useEffect(() => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    getRecentCheckoutPackagesList(constructParams(inputValue));
  }, 600);
  return () => clearTimeout(searchTimeout);
}, [inputValue]);

const constructParams = (value: string) => (value ? `keyword=${value}` : '');

  const [packageItem, setPackageItem] = useState<Package | null>(null);
  const [isPackageInfo, setIsPackageInfo] = useState(false);

  const onArrowClick = (item: Package) => {
    // __DEV__ && console.log('item==', item);
    setPackageItem(item);
    setIsPackageInfo(!isPackageInfo);
  };

  useEffect(() => {
    DeviceEventEmitter.addListener('refetchPackages', () => {
      getRecentCheckoutPackagesList();
      setRefetching(true);
    });
  }, []);

  const itemsPerPage = 10;
  const paginatedData =packageListData?.slice(0, page * itemsPerPage);


  const loadMoreDataa = () => {
  if (page * itemsPerPage < packageListData?.length) {
    setPage(prevPage => prevPage + 1);
  }
};
 
  // useFocusEffect(
  //     useCallback(() => {
  //       getRecentCheckoutPackagesList();
  //       setLoading(true);
  //       setRefetching(true);
  //     }, [navigation]),
  //   );
  return (
    <View style={styles.mainView}>
      <BackHeader title="Recent Checkouts" />
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
            value={inputValue}
            onChangeText={val => setInputValue(val)}
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
      {/* {packageListData?.length > 0 &&  */}
      <PackageList
        isRecent={true}
       
        packages={paginatedData || []}
        onItemPress={null}
        onArrowClick={onArrowClick}
        showLoader={loading}
        refetching={showLoader || refetching}
        refetchData={getRecentCheckoutPackagesList}
        loadMoreData={loadMoreDataa}
        page={page}
        totalItems={packageListData.length}
      />
      {/* } */}
    </View>
  );
};

const styles = StyleSheet.create({
  mainView: {
    flex: 1,
    backgroundColor: 'white',
    paddingTop: isIPad ? 50 : 30
  },
  input: {
      fontSize: 14,
      fontFamily: FONTS.RICORDORegular,
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

export { RecentActivity };
