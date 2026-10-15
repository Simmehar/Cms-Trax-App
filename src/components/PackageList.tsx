import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  Image,
  RefreshControl,
  DeviceEventEmitter,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { Checkbox } from './Checkbox';
import { FONTS, IMAGES } from '../assets';
import { CheckIpad, isIPad as defaultIsIpad } from '../utilities/securestorage';
import dayjs from 'dayjs';
import { sortTrackingNumber } from '../functions/SortTrackingNumber';
import { LoadImage } from './LoadImage';
import FastImage from 'react-native-fast-image';
import { useMode } from '../db/db.context';
import { useTranslation } from 'react-i18next';
import i18n from '../localization/i18n';

// Screen dimensions check for iPad + Android Tablets
const { width, height } = Dimensions.get('window');
const minDimension = Math.min(width, height);
const isTablet = (Platform.OS === 'ios' && Platform.isPad) || minDimension >= 600 || defaultIsIpad;

interface Ship {
  id: number;
  name: string;
  company_id: string;
  company_name: string;
}

interface User {
  id: number;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string;
  ship: string;
  ship_id: string;
  department_id: string;
  department_name: string;
  payable_amount: string;
  is_active: boolean;
}

export interface PackageType {
  id: number;
  name: string;
  price: string;
}

interface PackageTracking {
  id: number;
  current_status: string;
  created_at: string;
  done_by_user: string;
  log_type: string;
}

interface PackageImage {
  url: string;
  log_type: string;
}

export interface Package {
  id: number;
  tracking_no: string;
  carrier: string;
  tag_number: string;
  shelf: string;
  condition: string;
  current_status: string;
  date_received: string;
  date_delivered: string | null;
  is_paid: boolean;
  ship: Ship;
  user: User;
  port: any;
  package_type: PackageType;
  package_tracking: PackageTracking[];
  images: PackageImage[];
  isSelect: boolean;
  synced?: 0 | 1;
}

export interface department {
  id: number;
  name: string;
}

const getFormattedDate = (dateTime: any) => {
  return dayjs(dateTime, 'MMMM D,YYYY hh:mm A').format('MM/DD/YYYY');
};

interface PackageListProps {
  packages: Package[];
  onItemPress: any;
  onArrowClick: (value: Package) => void;
  onscoll?: any;
  isRecent: boolean;
  showLoader: any;
  refetching: boolean;
  showSync: boolean;
  refetchData?: any;
  loadMoreData?: any;
  totalItems: any;
  page: any;
}

const PAGE_SIZE = 5;

const PackageList = React.memo(({
  packages,
  onItemPress,
  onArrowClick,
  isRecent,
  showLoader,
  refetching,
  showSync,
  refetchData,
  onscoll,
  loadMoreData,
  totalItems,
  page,
}: PackageListProps) => {
  const flatListRef = useRef(null);
  const { isOnline } = useMode();
  const { t } = useTranslation();

  const renderItem = useCallback(({ item, index }: { item: Package; index: number }) => {
    const sortShipName = (str: string) => {
      if (!str) return '';
      if (str.length >= 22) {
        const start = str.substring(0, 11);
        const end = str.substring(str.length - 11);
        return `${start}...${end}`;
      }
      return str;
    };

    return (
      <View
        style={[
          styles.itemContainer,
          {
            backgroundColor: item?.isSelect ? '#EFF9FF' : '#FAFAFA',
            flex: isTablet ? 1 : undefined,
            marginHorizontal: isTablet ? 2.5 : 5,
          },
        ]}>
        <View style={styles.itemHeader}>
          <View style={styles.rowView}>
            <Image
              source={
                parseFloat(item?.user?.payable_amount) > 0
                  ? IMAGES.unpaidIcon$
                  : IMAGES.green$
              }
              style={styles.doller}
            />
            <Text
              style={[
                styles.itemName,
                { fontSize: isTablet ? 28 : 18 },
              ]}>{`${item?.user?.first_name} ${item?.user?.last_name}`}</Text>

            {!item?.user?.is_active && isTablet && (
              <View
                style={{
                  backgroundColor: '#FFAF4A',
                  borderRadius: 20,
                  marginLeft: 10,
                  marginVertical: 3,
                  alignSelf: 'flex-start',
                  paddingHorizontal: 5,
                }}>
                <Text
                  style={{
                    fontSize: isTablet ? 18 : 14,
                    color: 'white',
                    paddingHorizontal: 5,
                    paddingVertical: 3,
                    fontFamily: FONTS.RICORDOSemiBold,
                  }}>
                  {t('Inactive')}
                </Text>
              </View>
            )}
          </View>

          {onItemPress && (
            <TouchableOpacity
              style={[
                item?.isSelect ? styles.selectBox : styles.unSelectBox,
                { padding: 12 },
              ]}
              onPress={() => onItemPress(item, index)}>
              {item?.isSelect ? (
                <Image
                  source={IMAGES.check}
                  style={{ height: isTablet ? 13 : 9, width: isTablet ? 18 : 13, tintColor: 'white' }}
                />
              ) : null}
            </TouchableOpacity>
          )}
        </View>

        {!item?.user?.is_active && !isTablet && (
          <View
            style={{
              backgroundColor: '#FFAF4A',
              borderRadius: 20,
              marginRight: 10,
              marginVertical: 3,
              alignSelf: 'flex-start',
              paddingHorizontal: 5,
            }}>
            <Text
              style={{
                fontSize: 14,
                color: 'white',
                paddingHorizontal: 5,
                paddingVertical: 3,
                fontFamily: FONTS.RICORDOSemiBold,
              }}>
              {t('Inactive')}
            </Text>
          </View>
        )}

        <View style={{ flexDirection: isTablet ? 'row' : 'column' }}>
          <View style={{ width: isTablet ? '50%' : '100%' }}>
            <View style={styles.detailcontainer}>
              <Text style={[styles.label, { fontSize: isTablet ? 23 : 18 }]}>
                {t('Loc/Tag')}:
              </Text>
              <Text style={[styles.value, { fontSize: isTablet ? 23 : 18 }]}>
                {sortShipName(`${item?.shelf}/${item.tag_number}`)}
              </Text>
            </View>

            <View style={styles.detailcontainer}>
              <Text style={[styles.label, { fontSize: isTablet ? 23 : 18 }]}>
                {t('Tracking#')}:
              </Text>
              <Text style={styles.value}>
                {sortTrackingNumber(item.tracking_no || '')}
              </Text>
            </View>

            <View style={styles.detailcontainer}>
              <Text style={styles.label}>{t('Ship')}:</Text>
              <Text
                style={[
                  styles.value,
                  { width: isTablet ? '100%' : 'auto', fontSize: isTablet ? 23 : 18 },
                ]}
                numberOfLines={1}>
                {sortShipName(item?.ship?.name || (item as any)?.ship_name)}
              </Text>
            </View>
          </View>

          {/* iPad aur Android Tablet dono par image gallery render hogi */}
          {isTablet && (
            <View style={[styles.rowView, { marginTop: 0, width: '50%' }]}>
              {item?.images && item?.images.length > 0 ? (
                item.images.map((val: any, imgIndex: number) => {
                  let rawUrl = val?.local_url ? val?.local_url : val?.url;

                  // Android par local path ke aage 'file://' add karein
                  const formattedUrl =
                    rawUrl && !rawUrl.startsWith('http') && !rawUrl.startsWith('file://')
                      ? `file://${rawUrl}`
                      : rawUrl;

                  return (
                    <View key={imgIndex.toString()}>
                      <View
                        style={{
                          height: 70,
                          width: 70,
                          marginHorizontal: 5,
                        }}>
                        <FastImage
                          style={styles.imagView}
                          resizeMode={FastImage.resizeMode.cover}
                          source={{ uri: formattedUrl }}
                        />
                      </View>
                    </View>
                  );
                })
              ) : (
                <View>
                  <Text>No images available</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {isRecent && (
          <>
            <View style={styles.detailcontainer}>
              <Text style={styles.label}>Date Delivered:</Text>
              <Text style={styles.value}>{item.date_delivered}</Text>
            </View>
            <View style={styles.detailcontainer}>
              <Text style={styles.label}>Status:</Text>
              <Text style={styles.value}>{item?.current_status}</Text>
            </View>
            {showSync && (
              <View style={styles.detailcontainer}>
                <Text style={styles.label}>Synced:</Text>
                <Text style={styles.value}>
                  {item?.synced == 0 ? 'No' : 'Yes'}
                </Text>
              </View>
            )}
          </>
        )}

        <TouchableOpacity
          style={styles.arrowButton}
          onPress={() => onArrowClick(item)}>
          <Image source={IMAGES.right_yellow_arrow} style={styles.arrow} />
        </TouchableOpacity>
      </View>
    );
  }, [onItemPress, onArrowClick]);

  const renderEmptyList = () => (
    <View style={styles.emptyListContainer}>
      <Image
        source={
          i18n.language === 'en'
            ? IMAGES.package.packagesnotfound
            : IMAGES.package.packagesnotfoundspain
        }
        style={styles.emptyListImage}
      />
    </View>
  );

  return (
    <FlatList
      showsVerticalScrollIndicator={false}
      keyExtractor={(item, index) => (item.id ? item.id.toString() : index.toString())}
      key={'_'}
      style={{ marginTop: 15, marginHorizontal: isTablet ? 10 : 0 }}
      data={packages || []}
      onEndReached={loadMoreData}
      maxToRenderPerBatch={10}
      onEndReachedThreshold={0.5}
      removeClippedSubviews={true}
      ListFooterComponent={
        page * 10 < totalItems ? (
          <ActivityIndicator size="large" color="black" />
        ) : null
      }
      initialNumToRender={5}
      windowSize={10}
      numColumns={1}
      renderItem={renderItem}
      contentContainerStyle={{ paddingTop: 10 }}
      ListEmptyComponent={
        showLoader ? (
          <ActivityIndicator color={'black'} size={'large'} />
        ) : (
          renderEmptyList
        )
      }
      onScroll={onscoll}
      scrollEventThrottle={16}
      refreshing={refetching}
    />
  );
});

const styles = StyleSheet.create({
  itemContainer: {
    backgroundColor: '#FAFAFA',
    marginBottom: isTablet ? 15 : 5,
    marginHorizontal: 5,
    paddingHorizontal: isTablet ? 20 : 10,
    paddingVertical: isTablet ? 17 : 13,
    borderRadius: 16,
    paddingBottom: 25,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  rowView: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontFamily: FONTS.RICORDOBold,
    color: '#002B45',
  },
  label: {
    fontSize: isTablet ? 23 : 18,
    fontFamily: FONTS.RICORDOSemiBold,
    color: '#223890',
    fontWeight: '400',
  },
  value: {
    fontSize: isTablet ? 23 : 18,
    color: 'black',
    fontFamily: FONTS.RICORDOSemiBold,
    marginLeft: 5,
    fontWeight: '400',
  },
  arrowButton: {
    position: 'absolute',
    right: isTablet ? 15 : 10,
    top: '70%',
  },
  arrowText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: isTablet ? 25 : 18,
  },
  detailcontainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: isTablet ? 5 : 0,
  },
  emptyListContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyListImage: {
    width: 400,
    height: 500,
    marginBottom: 5,
  },
  emptyListText: {
    fontSize: isTablet ? 20 : 16,
    color: '#ccc',
  },
  doller: {
    height: isTablet ? 28 : 20,
    width: isTablet ? 28 : 20,
    marginRight: 8.5,
  },
  selectBox: {
    height: isTablet ? 35 : 22,
    width: isTablet ? 35 : 22,
    borderRadius: 4,
    backgroundColor: '#223890',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unSelectBox: {
    height: isTablet ? 35 : 22,
    width: isTablet ? 35 : 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D6D6D6',
    backgroundColor: 'white',
  },
  arrow: {
    height: isTablet ? 65 : 48,
    width: isTablet ? 65 : 48,
  },
  imagView: {
    height: '100%',
    width: '100%',
    marginRight: 10,
    borderRadius: 8,
  },
});

export { PackageList };