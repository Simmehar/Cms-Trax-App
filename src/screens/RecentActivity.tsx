import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, DeviceEventEmitter, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackHeader } from '../components/Header';
import { Package, PackageList } from '../components/PackageList';
import { usePackageContext } from '../contexts/packagecontext';
import { PackageInfoModal } from '../components/PackageInfoModal';
import { useNavigationContext } from '../contexts/navigationcontext';
import { isIPad } from '../utilities/securestorage';
import { useFocusEffect } from '@react-navigation/native';
import { SvgXml } from 'react-native-svg';
import { FONTS, ICONS } from '../assets';
import { useTranslation } from 'react-i18next';

let searchTimeout: NodeJS.Timeout;

const RecentActivity: React.FC = ({ navigation }: any) => {
  const [packageListData, setPackageListData] = useState<Package[]>([]);
  const [inputValue, setInputValue] = useState('');
  const { showLoader } = useNavigationContext();
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [isHospitality, setIsHospitality] = useState(false);

  const { recentPackageList, getRecentCheckoutPackagesList } =
    usePackageContext();

  const [refetching, setRefetching] = useState(false);

  useEffect(() => {
    const fetchBusinessType = async () => {
      try {
        const storedType = await AsyncStorage.getItem('BUSINESS_TYPE');
        setIsHospitality(storedType === 'hotels-and-hospitality');
      } catch (e) {
        console.warn('Error reading BUSINESS_TYPE in RecentActivity', e);
      }
    };
    fetchBusinessType();
  }, []);

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
  const { t } = useTranslation();

  const [packageItem, setPackageItem] = useState<Package | null>(null);
  const [isPackageInfo, setIsPackageInfo] = useState(false);

  const onArrowClick = (item: Package) => {
    setPackageItem(item);
    setIsPackageInfo(!isPackageInfo);
  };

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('refetchPackages', () => {
      getRecentCheckoutPackagesList();
      setRefetching(true);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const itemsPerPage = 10;
  const paginatedData = packageListData?.slice(0, page * itemsPerPage);

  const loadMoreDataa = () => {
    if (page * itemsPerPage < packageListData?.length) {
      setPage(prevPage => prevPage + 1);
    }
  };

  return (
    <View style={styles.mainView}>
      <BackHeader title={t('Recent Checkouts')} />
      <View style={styles.inputContier}>
        <View style={[styles.iconsContainer, { flex: 1 }]}>
          <SvgXml
            xml={ICONS.header.search}
            width={isIPad ? 35 : '21.5'}
            height={isIPad ? 35 : '21.5'}
          />
          <TextInput
            style={[styles.input, { fontSize: isIPad ? 24 : 14 }]}
            placeholder={t(isHospitality ? 'ID or Name' : 'Tracking or Name')}
            placeholderTextColor="#999"
            value={inputValue}
            onChangeText={val => setInputValue(val)}
            autoCorrect={false}
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
        showLoader={loading}
        refetching={showLoader || refetching}
        refetchData={getRecentCheckoutPackagesList}
        loadMoreData={loadMoreDataa}
        page={page}
        totalItems={packageListData.length}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  mainView: {
    flex: 1,
    backgroundColor: 'white',
    paddingTop: isIPad ? 50 : 30,
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
    borderRadius: 24,
    paddingHorizontal: isIPad ? 10 : 10,
    marginHorizontal: 5,
  },
  iconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export { RecentActivity };