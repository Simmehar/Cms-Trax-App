import React, { useRef, useState } from 'react';
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
} from 'react-native';
import { Checkbox } from './Checkbox';
import { FONTS, IMAGES } from '../assets';
import { CheckIpad, isIPad } from '../utilities/securestorage';
import dayjs from 'dayjs';
import { sortTrackingNumber } from '../functions/SortTrackingNumber';
import { LoadImage } from './LoadImage';
import FastImage from 'react-native-fast-image';
import { useMode } from '../db/db.context';

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

let isPad = CheckIpad();
const getFormattedDate = (dateTime: any) => {
  const formattedDate = dayjs(dateTime, 'MMMM D,YYYY hh:mm A').format(
    'MM/DD/YYYY',
  );
  return formattedDate;
};

interface PackageListProps {
  packages: Package[];
  onItemPress: any;
  onArrowClick: (value: Package) => void;
  isRecent: boolean;
  showLoader: any;
  refetching: boolean;
  showSync: boolean;
  loadMoreData?:any;
  totalItems:any;
  page:any;
}
const PAGE_SIZE = 5;
const OfflinePackageList: React.FC<PackageListProps> = ({
  packages,
  onItemPress,
  onArrowClick,
  isRecent,
  showLoader,
  refetching,
  showSync,
  loadMoreData,
  totalItems,
  page,
}) => {
  const flatListRef = useRef(null);
  const { isOnline } = useMode();
  // const packages: any = [];
  const renderItem = ({ item, index }: { item: Package; index: number }) => {
    __DEV__ && console.log('item?.user', item);

    const sortShipName = str => {
      if (str?.length >= 22) {
        const start = str?.substring(0, 15); // First 10 characters
        const end = str?.substring(str.length - 15); // Last 10 characters
        return `${start}...${end}`;
      }

      return str;
    };
    const images: any[] = item?.local_url
    ? item?.local_url.split(', ').map((val: string) => ({
      url: val.trim(),
    }))
    : [];
    return (
      <View
        style={[
          styles.itemContainer,
          {
            backgroundColor: item?.isSelect ? '#EFF9FF' : '#FAFAFA',
            flex: isPad && 1,
            marginHorizontal: isPad ? 2.5 : 5,

          },
        ]}>
        <View style={styles.itemHeader}>
          <View style={styles.rowView}>
          <Image
              source={
                parseFloat(item?.payable_amount) > 0
                  ? IMAGES.unpaidIcon$
                  : IMAGES.green$
              }
              style={styles.doller}
            />
            <Text
              style={[
                styles.itemName,
                { fontSize: isIPad ? 28 : 18 },
              ]}>{`${item?.first_name} ${item?.last_name}`}</Text>
            
            {item?.is_active == 0 && isIPad && (
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
                    fontSize: isIPad ? 18 : 14,
                    color: 'white',
                    paddingHorizontal: 5,
                    paddingVertical: 3,
                    fontFamily: FONTS.RICORDOSemiBold,
                  }}>
                  Inactive
                </Text>
              </View>
            )}
          </View>

          {onItemPress && (
            <TouchableOpacity
              style={[
                item?.isSelect ? styles.selectBox : styles.unSelectBox,
                {
                  padding: 12,
                },
              ]}
              onPress={() => onItemPress(item, index)}>
              {item?.isSelect ? (
                <Image
                  source={IMAGES.check}
                  style={{ height: isIPad ? 13 : 9, width: isIPad ? 18 : 13, tintColor: 'white' }}
                />
              ) : (
                <></>
              )}
            </TouchableOpacity>
          )}
        </View>
        {item?.is_active == 0 && !isIPad && (
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
                fontSize: isIPad ? 18 : 14,
                color: 'white',
                paddingHorizontal: 5,
                paddingVertical: 3,
                fontFamily: FONTS.RICORDOSemiBold,
              }}>
              Inactive
            </Text>
          </View>
        )}
        <View style={{ flexDirection: isIPad ? 'row' : 'column' }}>
          <View style={{ width: '50%' }}>
            <View style={styles.detailcontainer}>
              <Text style={[styles.label, { fontSize: isIPad ? 23 : 18 }]}>
                Loc/Tag:
              </Text>
              <Text
                style={[
                  styles.value,
                  { fontFamily: FONTS.RICORDOSemiBold, fontSize: isIPad ? 23 : 18 },
                ]}>
                {sortShipName(`${item?.shelf}/${item.tag_number}`)}
              </Text>
            </View>

            <View style={styles.detailcontainer}>
              <Text style={[styles.label, { fontSize: isIPad ? 23 : 18 }]}>
                Tracking#:
              </Text>
              <Text style={styles.value}>
                {sortTrackingNumber(item.tracking_no || '')}
              </Text>
            </View>

            {/* <View style={{flexDirection:isIPad?'row':'column'}}> */}
            <View style={styles.detailcontainer}>
              <Text style={styles.label}>Ship:</Text>
              <Text style={[styles.value, { width: isIPad ? '100%' : 'auto', fontSize: isIPad ? 23 : 18 }]} numberOfLines={1}>
                {sortShipName(item?.ship?.name || item?.ship_name)}

              </Text>
            </View>
          </View>
          {/* for images  */}
          {isIPad && <View style={[styles.rowView, { marginTop: 0, width: '50%' }]}>

            {images && images.length > 0 ? (
              images.map((val: any, index: number) => {
                const imageUrl = val?.local_url ? val?.local_url : val?.url;

                return (
                  <View key={index.toString()}>
                    <View

                      style={{
                        height: isIPad  ? 95 : 50,
                        width: isIPad  ? 95 : 50,
                        marginHorizontal: isIPad ? 5 : 5,
                      }}
                    >
                      <Image
                        style={styles.imagView}
                        resizeMode="cover"
                        source={{
                          uri: imageUrl,
                        }}
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

          </View>}


        </View>


        <TouchableOpacity
          style={styles.arrowButton}
          onPress={() => onArrowClick(item)}>
          <Image source={IMAGES.right_yellow_arrow} style={styles.arrow} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyListContainer}>
      <Image
        source={IMAGES.package.packagesnotfound}
        style={styles.emptyListImage}
      />
    </View>
  );


  return (
    <>
    <FlatList
            showsVerticalScrollIndicator={false}
            keyExtractor={(item, index) => (item.id ? item.id.toString() : index.toString())}
            key={'_'}
            style={{marginTop: 15, marginHorizontal: isPad && 10}}
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
          
           
            contentContainerStyle={{
              paddingTop: 10,
            }}
            ListEmptyComponent={
              showLoader ? (
                <ActivityIndicator color={'black'} size={'large'} />
              ) : (
                renderEmptyList
              )
            }
            scrollEventThrottle={16}
           
            refreshing={refetching}
          />
    </>
  );
};

const styles = StyleSheet.create({
  itemContainer: {
    backgroundColor: '#FAFAFA',
    marginBottom: isIPad ? 15 : 5,
    marginHorizontal: 5,
    paddingHorizontal: isIPad ? 20 : 10,
    paddingVertical: isIPad ? 17 : 13,
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
    fontFamily: FONTS.RICORDOSemiBold,
    color: '#002B45',
  },
  label: {
    // fontSize: isIPad ? 20 : 16,
    fontSize: isIPad ? 23 : 18,
    fontFamily: FONTS.RICORDOSemiBold,
    color: '#223890',
    fontWeight: '500'
  },
  value: {
    // fontSize: isIPad ? 18 : 14,
    fontSize: isIPad ? 23 : 18,
    color: 'black',
    fontFamily: FONTS.RICORDORegular,
    marginLeft: 5,
    fontWeight: '500',
  },
  arrowButton: {
    position: 'absolute',
    right: isIPad ? 15 : 10,
    top: '70%',
  },
  arrowText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: isIPad ? 25 : 18,
  },
  detailcontainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: isIPad ? 5 : 0,
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
    fontSize: isIPad ? 20 : 16,
    color: '#ccc',
  },
  doller: {
    height: isIPad ? 28 : 20,
    width: isIPad ? 28 : 20,
    marginRight: 8.5,
  },
  selectBox: {
    height: isIPad ? 35 : 22,
    width: isIPad ? 35 : 22,
    borderRadius: 4,
    backgroundColor: '#223890',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unSelectBox: {
    height: isIPad ? 35 : 22,
    width: isIPad ? 35 : 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D6D6D6',
    backgroundColor: 'white',
  },
  arrow: {
    height: isIPad ? 65 : 48,
    width: isIPad ? 65 : 48,
  },
  imagView: {
    height: '100%',
    width: '100%',
    marginRight: 10,
    borderRadius: 8,
  },
});

export { OfflinePackageList };

