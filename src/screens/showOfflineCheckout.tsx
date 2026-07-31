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
import CustomerList from '../db/dbcrud/dbcustomerList.crud';
import { OfflinePackageList } from '../components/OfflinePackageList';
import { Offlinepackageinfomodal } from '../components/Offlinepackageinfomodal';
import deletedPackage from '../db/dbcrud/dbDeletepackage.curd';
import { FONTS, ICONS } from '../assets';
import { SvgXml } from 'react-native-svg';
import { useTranslation } from 'react-i18next';


const ShowOfflineCheckout = ({ navigation }: any) => {
  const { user } = useContext(AuthContext);
  const [checkouts, setCheckouts] = useState([]);
  const [Copycheckouts, setCopyCheckouts] = useState([]);
const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
 const [searchInDB, setSearchInDB] = useState("");
  const { showLoader } = useNavigationContext();
     const [page, setPage] = useState(1);

  const fetchCheckouts = async () => {
    try {
      setIsLoading(true);

      const allRecords = await Checkout.getAllRecords();
      __DEV__ && console.log('allRecords', allRecords);

      const updatedRecords = await Promise.all(
        allRecords.length !== 0 &&
        allRecords.map(async (item: any, idx: any) => {
          const customerData = await CustomerList.getCustomerById(item?.user_id);
          __DEV__ && console.log('customerData in offline checkout', customerData);

          let updatedPackages = [];

          try {
            const packageIds = JSON.parse(item?.packagesId || '[]');

            if (Array.isArray(packageIds) && packageIds.length !== 0) {
              updatedPackages = await Promise.all(
                packageIds.map(async (packageId: any) => {
                  const deletedRecord = await deletedPackage.getDeletedPackageById(packageId);
                  __DEV__ && console.log('deletedRecord', deletedRecord)
                  // Map images to the desired format
                  const checkoutImages = [
                    item?.imageOne,
                    item?.imageTwo,
                    item?.imageThree,
                  ]
                    .filter(image => image)
                    .map(image => ({
                      image_url: image,
                    }));

                  return {
                    checkoutNo: idx,
                    first_name: customerData?.first_name,
                    last_name: customerData?.last_name,
                    is_active: customerData?.is_active,
                    payable_amount: customerData?.payable_amount,
                    ship_name: customerData?.ship_name,
                    carrier: deletedRecord?.carrier,
                    shelf: deletedRecord?.shelf || t('Bag # Not Found'),
                    tag_number: deletedRecord?.tag_number || t('Tag # Not Found'),
                    tracking_no: deletedRecord?.tracking_no,
                    department_name: customerData?.dept_name,
                    packageType: deletedRecord?.packageType,
                    condition: deletedRecord?.condition,
                    current_status: deletedRecord?.current_status,
                    custom_message: deletedRecord?.custom_message,
                    logInBy: deletedRecord?.logInBy,
                    notes: item.notes,
                    synced: item.Synced,
                    cashReceived: item.cashReceived,
                    totalAmount: item.totalAmount,
                    selectedStatus: item.selectedStatus,
                    checkout_images: checkoutImages,
                    Logout: deletedRecord.Logout,
                    local_url:deletedRecord?.local_url,
                    
                  };
                })
              );
            } else {
              console.warn('packagesId is not a valid array:', item.packagesId);
            }
          } catch (error) {
            console.warn('Invalid packagesId JSON or mapping error:', item.packagesId, error);
          }

          return updatedPackages.filter(pkg => pkg !== null);
        })
      );

      setCheckouts(updatedRecords.flat());
      setCopyCheckouts(updatedRecords.flat());
    } catch (error) {
      console.error('Error fetching checkouts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  __DEV__ && console.log('checkouts', checkouts)
  // const FilterPackages = (text) => {
  //   setSearchInDB(text);
  //   const filteredPackages = checkouts.filter((packageData) => {
  //     const trackingNo = packageData.tracking_no.toString().toLowerCase();

  //     const user = packageData;
  //     const firstName =
  //       user && user.first_name ? user.first_name.toString().toLowerCase() : "";
  //     const lastName =
  //       user && user.last_name ? user.last_name.toString().toLowerCase() : "";

  //     const fullName = `${firstName} ${lastName}`.trim();

  //     if (text !== "") {
  //       const searchValue = text.toLowerCase();
  //       if (
  //         trackingNo.includes(searchValue) ||
  //         firstName.includes(searchValue) ||
  //         lastName.includes(searchValue) ||
  //         fullName.includes(searchValue)
  //       ) {
  //         return true;
  //       }
  //     } else {
  //       return true;
  //     }
  //     return false;
  //   });
  //   setCheckouts(text !== "" ? filteredPackages : Copycheckouts);
  // };

  const [searchTimeout, setSearchTimeout] = useState(null);

  const FilterPackages = (text) => {
    setSearchInDB(text);
  
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
  
    const timeout = setTimeout(() => {
      const filteredPackages = Copycheckouts.filter((packageData) => {
        const trackingNo = packageData.tracking_no.toString().toLowerCase();
        const firstName = packageData.first_name?.toString().toLowerCase() || "";
        const lastName = packageData.last_name?.toString().toLowerCase() || "";
        const fullName = `${firstName} ${lastName}`.trim();
  
        const searchValue = text.toLowerCase();
        return (
          trackingNo.includes(searchValue) ||
          firstName.includes(searchValue) ||
          lastName.includes(searchValue) ||
          fullName.includes(searchValue)
        );
      });
  
      setCheckouts(text !== "" ? filteredPackages : Copycheckouts);
    }, 300); // 300ms delay, adjust as needed
  
    setSearchTimeout(timeout);
  };
  
  const filteredData = Array.isArray(checkouts)
    ? checkouts.filter((checkout: any) =>
      checkout.tracking_no.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : [];


  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchCheckouts();
    });

    return unsubscribe;
  }, [navigation]);

  const handleSearch = text => {
    setSearchQuery(text);
  };

  //   const filteredData = checkouts.flatMap((checkout: any) =>
  //     checkout.filter((item: any) =>
  //       item.tracking_no.toLowerCase().includes(searchQuery.toLowerCase()),
  //     ),
  //   );

  __DEV__ && console.log('filteredData', filteredData);

  const [refetching, setRefetching] = useState(false);

  const [packageItem, setPackageItem] = useState<Package | null>(null);
  const [isPackageInfo, setIsPackageInfo] = useState(false);

  const onArrowClick = (item: Package) => {
    __DEV__ && console.log('item==', item);
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

  return (
    <View style={styles.mainView}>
      <BackHeader title={t('Offline Checkouts')} />
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
        placeholder={t('Tracking or Name')}
        placeholderTextColor="#999"
        value={searchInDB}
        onChangeText={val => FilterPackages(val)}
        autoCorrect={false}
      //autoFocus={true}
      />
       </View>
      </View>
      {packageItem && isPackageInfo ? (
        <Offlinepackageinfomodal
          item={packageItem}
          visible={isPackageInfo}
          onClose={() => setIsPackageInfo(!isPackageInfo)}
          navigation={navigation}
        />
      ) : (
        <></>
      )}
    
      <OfflinePackageList
        isRecent={true}
        packages={paginatedData || []}
        onItemPress={null}
        onArrowClick={onArrowClick}
        showSync={true}
        showLoader={isLoading}
        refetching={showLoader || refetching}
        loadMoreData={loadMoreDataa}
        page={page}
        totalItems={filteredData.length}
      />
    </View>
  );
};

export default ShowOfflineCheckout;

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
      width:'95%',
      alignSelf:'center',
      height: isIPad ? 80 : 48,
      backgroundColor: '#F4F4F4',
      marginTop: isIPad ?20:10,
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
