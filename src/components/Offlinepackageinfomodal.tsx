import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  Text,
  LogBox,
  Modal,
  ScrollView,
} from 'react-native';
import { Package } from './PackageList';
import { FONTS, IMAGES } from '../assets';
import { LoadImage } from './LoadImage';
import { CheckIpad, isIPad } from '../utilities/securestorage';
import { useMode } from '../db/db.context';
import dayjs from 'dayjs';

import customParseFormat from 'dayjs/plugin/customParseFormat';
import { useAuth } from '../contexts';
import ImagePreview from '../screens/ImagePreview';

// Extend dayjs with the customParseFormat plugin
dayjs.extend(customParseFormat);

interface packaegInfo {
  item: Package;
  visible: boolean;
  onClose: () => void;
  navigation: any;
}
let isPad = CheckIpad();

const Status: any = [10050, 10060, 10140, 10090, 10270, 10280];

const Offlinepackageinfomodal: React.FC<packaegInfo> = ({
  item,
  visible,
  onClose,
  navigation,
}) => {
  const { isOnline } = useMode();

  const getFormattedDate = (dateTime: any) => {
    const formattedDate = dayjs(dateTime, 'MMMM D,YYYY hh:mm A').format(
      'MM/DD/YYYY',
    );

    return formattedDate;
  };

  const { user } = useAuth();
  __DEV__ && console.log('user', user)
  let logOutData: any = {
    logoutBy: '',
    logoutDate: '',
    note: '',
  };

  __DEV__ && console.log('item', item);
  const formatDateTime = dateTime => {
    if (!dateTime) return '-';
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    };
    return new Date(dateTime).toLocaleString('en-US', options);
  };


  if (item?.package_tracking?.length > 1) {
    const data = item?.package_tracking?.[item?.package_tracking?.length - 1];

    if (Status.includes(Number(data?.log_type))) {
      // __DEV__ && console.log('data', data);

      logOutData = {
        logoutBy: user?.firstname,
        logoutDate: data?.created_at,
        note: data?.notes,
      };
    }
  }
const [ShowImage, setShowImage] = useState([]);
  const [isVisible, setIsVisible] = useState(false)
  const images: any[] = item?.local_url
    ? item?.local_url.split(', ').map((val: string) => ({
      url: val.trim(),
    }))
    : [];
  const checkoutImages: any[] = item?.checkout_images?.map(val => {
    return {
      image_url: val?.local_url ? val?.local_url : val?.image_url,
    };
  });
  __DEV__ && console.log('checkoutImages', checkoutImages)

  // __DEV__ && console.log('itemmmm', item);

  return (
    <Modal visible={visible} transparent={true}>
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, { height: isIPad ? '90%' : 'none' }]}>
          <View style={styles.rowView}>
            <Text
              style={
                [styles.pakName, { fontSize: isIPad ? 27 : 18 }]
              }>{`${item?.first_name} ${item?.last_name}`}</Text>
            <TouchableOpacity style={styles.crossView} onPress={onClose}>
              <Image source={IMAGES.close} style={styles.closeImg} />
            </TouchableOpacity>
          </View>

          <View style={styles.oraView}>
            <Text style={styles.activeTxt}>
              {item?.is_active != 0 ? 'Active' : 'Inactive'}
            </Text>
          </View>
          <View style={{ marginVertical: 5 }}>
            <Text style={styles.leftTxt}>
            Logged-In Image(s):

            </Text>
          </View>
          <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{flexDirection:'row'}}>
              {images?.length > 0 ? (
                images?.map((i: any, index) => {
                  return (
                    <View key={index.toString()}>
                      <TouchableOpacity
                        onPress={() => {
                          if (!images || images.length === 0) {
                            console.warn('No checkout images available');
                            return;
                          }

                          // onClose();
                          setShowImage(images); // Ensure it's an array
                          setIsVisible(true);
                        }}
                        style={{
                          height: isOnline ? (isIPad ? 180 : 100) : isIPad ? 180 : 100,
                          width: isOnline ? (isIPad ? 200 : 100) : isIPad ? 200 : 100,
                          marginHorizontal: isIPad ? 20 : 10,
                          marginVertical: isIPad ? 20 : 10,
                          borderRadius: 10,
                        }}
                      >
                        <LoadImage
                          style={styles.imagView}
                          resizeMode={'cover'}
                          source={{
                            uri: i?.url,
                          }}
                        />
                      </TouchableOpacity>
                    </View>
                  );
                })
              ) : (
                <></>
              )}
            </View>
          </ScrollView>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={[styles.rowView, { marginTop: 15 }]}>
              <Text style={styles.leftTxt}>
                Tracking#:{' '}
                <Text style={styles.rightTxt}>{item?.tracking_no}</Text>{' '}
              </Text>
            </View>
            <View style={[styles.rowView, { marginTop: 10 }]}>
              <Text style={styles.leftTxt}>
                Ship:{' '}
                <Text style={styles.rightTxt}>
                  {item?.ship_name || item?.ship?.name}
                </Text>{' '}
              </Text>
            </View>
            <View style={[styles.rowView, { marginTop: 10 }]}>
              <Text style={styles.leftTxt}>
                Location: <Text style={styles.rightTxt}>{item?.shelf}</Text>{' '}
              </Text>
            </View>
            <View style={[styles.rowView, { marginTop: 10 }]}>
              <Text style={styles.leftTxt}>
                Tag#: <Text style={styles.rightTxt}>{item?.tag_number}</Text>{' '}
              </Text>
            </View>
            <View style={[styles.rowView, { marginTop: 10 }]}>
              <Text style={styles.leftTxt}>
                Division:{' '}
                <Text style={styles.rightTxt}>
                  {item?.department_name}
                </Text>{' '}
              </Text>
            </View>
            {/* <View style={[styles.rowView, {marginTop: 10}]}>
                <Text style={styles.leftTxt}>
                  Date Received:{' '}
                  <Text style={styles.rightTxt}>{item?.date_received}</Text>{' '}
                </Text>
              </View> */}
            <View style={[styles.rowView, { marginTop: 10 }]}>
              <Text style={styles.leftTxt}>
                Carrier: <Text style={styles.rightTxt}>{item?.carrier}</Text>{' '}
              </Text>
            </View>
            <View style={[styles.rowView, { marginTop: 10 }]}>
              <Text style={styles.leftTxt}>
                Status:{' '}
                <Text style={styles.rightTxt}>{item?.current_status}</Text>{' '}
              </Text>
            </View>
            {/* <View style={[styles.rowView, { marginTop: 10 }]}>
              <Text style={styles.leftTxt}>
                Log-In:{' '}
                <Text style={styles.rightTxt}>
                 
                  {item?.package_tracking?.[0]?.created_at || item?.logInDate}
                 
                </Text>{' '}
              </Text>
            </View> */}
            <View style={[styles.rowView, { marginTop: 10 }]}>
              <Text style={styles.leftTxt}>
                Log-In By:{' '}
                <Text style={styles.rightTxt}>
                  {item?.package_tracking?.[0]?.done_by_user || item?.logInBy}
                </Text>{' '}
              </Text>
            </View>

            <View>
              <View style={[styles.rowView, { marginTop: 10 }]}>
                <Text style={styles.leftTxt}>
                  Log-Out:{' '}
                  <Text style={styles.rightTxt}>
                    {formatDateTime(item?.Logout ? item?.Logout : '-')}
                  </Text>{' '}
                </Text>
              </View>

              <View style={[styles.rowView, { marginTop: 10 }]}>
                <Text style={styles.leftTxt}>
                  Log-Out By:{' '}
                  <Text style={styles.rightTxt}>
                    {user?.firstname ? user?.firstname : '-'}
                  </Text>{' '}
                </Text>
              </View>
            </View>
            <View style={[styles.rowView, { marginTop: 10 }]}>
              <Text style={styles.leftTxt}>
                Amount Paid:{' '}
                <Text style={styles.rightTxt}> ${item?.cashReceived}</Text>{' '}
              </Text>
            </View>

            <View style={[styles.rowView, { marginTop: 10 }]}>
              <Text style={styles.leftTxt}>
                Type:{' '}
                <Text style={styles.rightTxt}>
                  {item?.package_type?.name || item?.packageType}
                </Text>{' '}
              </Text>
            </View>
            <View style={[styles.rowView, { marginTop: 10 }]}>
              <Text style={styles.leftTxt}>
                Condition:{' '}
                <Text style={styles.rightTxt}>{item?.condition}</Text>{' '}
              </Text>
            </View>

            <View style={[styles.rowView, { marginTop: 10 }]}>
              <Text style={styles.leftTxt}>
                Message:{' '}
                <Text style={styles.rightTxt}>{item?.custom_message ? item?.custom_message : '-'}</Text>{' '}
              </Text>
            </View>
            <View style={[styles.rowView, { marginTop: 10 }]}>
              <Text style={styles.leftTxt}>
                Notes:{' '}
                <Text style={styles.rightTxt}>
                  {item?.notes ? item?.notes : '-'}
                </Text>{' '}
              </Text>
            </View>
            <View style={{ marginVertical: 15 }}>
              <Text style={styles.leftTxt}>
                Logged-Out Image(s):

              </Text>
            </View>
            <View style={[styles.rowView, { marginTop: isIPad ? 20 : 10 }]}>
              {checkoutImages?.length > 0 ? (
                checkoutImages?.map((i: any, index) => {
                  __DEV__ && console.log('iiiiiii==', i);

                  return (
                    <View key={index.toString()}>
                      <TouchableOpacity
                        onPress={() => {
                          if (!checkoutImages || checkoutImages.length === 0) {
                            console.warn('No checkout images available');
                            return;
                          }

                          // onClose();
                          setShowImage([...checkoutImages]); // Ensure it's an array
                          setIsVisible(true);
                        }} style={{ height: isIPad ? 200 : 100, width: isIPad ? 200 : 96, marginHorizontal: isIPad ? 20 : 10, marginVertical: isIPad ? 20 : 10 }}>
                        <LoadImage
                          style={styles.imagView}
                          resizeMode={'cover'}
                          source={{
                            uri: i?.image_url,
                          }}
                        />
                      </TouchableOpacity>


                    </View>
                  );
                })
              ) : (
                <></>
              )}
            </View>
          </ScrollView>
          {/* )} */}
        </View>
      </View>
      {isVisible && <ImagePreview
        isVisible={isVisible}
        image={ShowImage}
        onClose={() => setIsVisible(false)}
      />}
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
    maxHeight: '90%',
  },
  rowView: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: isIPad ? 10 : 0,
    // marginHorizontal: 10
  },
  pakName: {
    fontFamily: FONTS.RICORDOSemiBold,

    color: 'black',
    flex: 1,
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
  closeImg: {
    height: isIPad ? 25 : 10,
    width: isIPad ? 25 : 10,
    tintColor: 'black',
  },
  oraView: {
    height: isIPad ? 40 : 25,
    width: isIPad ? 100 : 74,
    backgroundColor: '#FFAF4A',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeTxt: {
    fontSize: isIPad ? 20 : 14,
    fontFamily: FONTS.RICORDOSemiBold,
    color: 'white',
    fontWeight: 'bold',
  },
  leftTxt: {
    fontSize: isIPad ? 25 : 16,
    fontFamily: FONTS.RICORDOSemiBold,
    color: '#223890',
  },
  rightTxt: {
    fontSize: isIPad ? 27 : 16,
    fontFamily: FONTS.RICORDOSemiBold,
    color: 'black',
  },
  imagView: {
    height: '100%',
    width: '100%',
    marginRight: 10,
    borderRadius: 10,
  },
});
export { Offlinepackageinfomodal };

