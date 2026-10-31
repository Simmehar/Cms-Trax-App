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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Package } from './PackageList';
import { FONTS, IMAGES } from '../assets';
import { LoadImage } from './LoadImage';
import { CheckIpad, isIPad } from '../utilities/securestorage';
import { useMode } from '../db/db.context';
import dayjs from 'dayjs';

import customParseFormat from 'dayjs/plugin/customParseFormat';
import { BackHeader } from './Header';
import ImageViewer from 'react-native-image-zoom-viewer';
import ImagePreview from '../screens/ImagePreview';
import { useTranslation } from 'react-i18next';

// Extend dayjs with the customParseFormat plugin
dayjs.extend(customParseFormat);

interface packaegInfo {
  item: Package;
  visible: boolean;
  onClose: () => void;
  navigation: any;
  showPaid: boolean;
}
let isPad = CheckIpad();

const Status: any = [10050, 10060, 10140, 10090, 10270, 10280];

const PackageInfoModal: React.FC<packaegInfo> = ({
  item,
  visible,
  onClose,
  navigation,
  showPaid,
}) => {
  const { isOnline } = useMode();
  const { t, i18n } = useTranslation();
  const [isHospitality, setIsHospitality] = useState(false);
  console.log('item=====================', item)
  useEffect(() => {
    const fetchBusinessType = async () => {
      try {
        const storedType = await AsyncStorage.getItem('BUSINESS_TYPE');
        setIsHospitality(storedType === 'hotels-and-hospitality');
      } catch (e) {
        console.warn('Error reading BUSINESS_TYPE in PackageInfoModal', e);
      }
    };

    if (visible) {
      fetchBusinessType();
    }
  }, [visible]);

  const [ShowImage, setShowImage] = useState([]);
  const [isVisible, setIsVisible] = useState(false);

  let logOutData: any = {
    logoutBy: '',
    logoutDate: '',
    note: '',
  };

  if (item?.package_tracking?.length > 1) {
    const data = item?.package_tracking?.[item?.package_tracking?.length - 1];

    if (Status.includes(Number(data?.log_type))) {
      logOutData = {
        logoutBy: data?.done_by_user,
        logoutDate: data?.created_at,
        note: data?.notes,
      };
    }
  }

  const images: any[] = Array.isArray(item?.images)
    ? item?.images.map(val => ({
      url: val?.local_url ? val?.local_url : val?.url,
    }))
    : [];

  const checkoutImages: any[] = Array.isArray(item?.checkout_images)
    ? item?.checkout_images.map(val => ({
      image_url: val?.local_url ? val?.local_url : val?.image_url,
    }))
    : [];
  const formatLastUpdateTime = (dateString?: string | null): string => {
    if (!dateString) return '-';

    const date = dayjs(
      dateString,
      ['MMMM D,YYYY hh:mm A', 'MMMM DD,YYYY hh:mm A'],
      true,
    );

    return date.isValid() ? date.format('h:mm A') : '-';
  };

  return (
    <Modal visible={visible} transparent={true}>
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, { height: isIPad ? '90%' : 'none' }]}>
          <View style={styles.rowView}>
            <Text
              style={[
                styles.pakName,
                { fontSize: isIPad ? 27 : 18 },
              ]}>{`${item?.user?.first_name} ${item?.user?.last_name}`}</Text>
            <TouchableOpacity style={styles.crossView} onPress={onClose}>
              <Image source={IMAGES.close} style={styles.closeImg} />
            </TouchableOpacity>
          </View>

          <View style={styles.oraView}>
            <Text style={styles.activeTxt}>
              {item?.user?.is_active ? t('Active') : t('Inactive')}
            </Text>
          </View>

          <View style={{ marginVertical: 5 }}>
            <Text style={styles.leftTxt}>{t(isHospitality ? 'Checked-In Image(s):' : 'Logged-In Image(s):')}</Text>
          </View>

          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row' }}>
                {images?.length > 0 ? (
                  images?.map((i: any, index) => (
                    <View key={index.toString()}>
                      <TouchableOpacity
                        onPress={() => {
                          if (!images || images.length === 0) return;
                          setShowImage(images);
                          setIsVisible(true);
                        }}
                        style={{
                          height: isIPad ? 180 : 100,
                          width: isIPad ? 200 : 100,
                          marginHorizontal: isIPad ? 20 : 10,
                          borderRadius: 10,
                        }}>
                        <LoadImage
                          style={styles.imagView}
                          resizeMode={'cover'}
                          source={{ uri: i?.url }}
                        />
                      </TouchableOpacity>
                    </View>
                  ))
                ) : null}
              </View>
            </ScrollView>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* 1. Type */}
            <View style={[styles.rowView, { marginTop: 15 }]}>
              <Text style={styles.leftTxt}>
                {t('Type')}:{' '}
                <Text style={styles.rightTxt}>
                  {item?.package_type?.name || item?.packageType}
                </Text>
              </Text>
            </View>

            {/* 2. ID / Tracking# */}
            <View style={[styles.rowView, { marginTop: 10 }]}>
              <Text style={styles.leftTxt}>
                {isHospitality ? `${t('ID')}: ` : `${t('Tracking')}#: `}
                <Text style={styles.rightTxt}>{item?.tracking_no}</Text>
              </Text>
            </View>

            {/* Non-hospitality only: Ship/Hotel */}
            {!isHospitality && (
              <View style={[styles.rowView, { marginTop: 10 }]}>
                <Text style={styles.leftTxt}>
                  {t('Ship')}:{' '}
                  <Text style={styles.rightTxt}>
                    {item?.ship_name || item?.ship?.name}
                  </Text>
                </Text>
              </View>
            )}

            {/* 3. Status */}
            <View style={[styles.rowView, { marginTop: 10 }]}>
              <Text style={styles.leftTxt}>
                {t('Status')}:{' '}
                <Text style={styles.rightTxt}>{item?.current_status}</Text>
              </Text>
            </View>

            {/* 4. Location */}
            <View style={[styles.rowView, { marginTop: 10 }]}>
              <Text style={styles.leftTxt}>
                {t('Location')}:{' '}
                <Text style={styles.rightTxt}>{item?.shelf}</Text>
              </Text>
            </View>

            {/* 5. Tag# */}
            <View style={[styles.rowView, { marginTop: 10 }]}>
              <Text style={styles.leftTxt}>
                {t('Tag#')}{' '}
                <Text style={styles.rightTxt}>{item?.tag_number}</Text>
              </Text>
            </View>

            {/* Non-hospitality only: Division */}
            {!isHospitality && (
              <View style={[styles.rowView, { marginTop: 10 }]}>
                <Text style={styles.leftTxt}>
                  {t('Division')}:{' '}
                  <Text style={styles.rightTxt}>
                    {item?.user?.department_name}
                  </Text>
                </Text>
              </View>
            )}

            {/* Non-hospitality only: Carrier */}
            {!isHospitality && (
              <View style={[styles.rowView, { marginTop: 10 }]}>
                <Text style={styles.leftTxt}>
                  {t('Carrier')}:{' '}
                  <Text style={styles.rightTxt}>{item?.carrier}</Text>
                </Text>
              </View>
            )}

            {/* 6. Condition */}
            <View style={[styles.rowView, { marginTop: 10 }]}>
              <Text style={styles.leftTxt}>
                {t('Condition')}:{' '}
                <Text style={styles.rightTxt}>{item?.condition}</Text>
              </Text>
            </View>

            {/* 7. Date/Time (Log-In) */}
            <View style={[styles.rowView, { marginTop: 10 }]}>
              <Text style={styles.leftTxt}>
                {t(isHospitality ? 'Check-In' : 'Log-In')}{' '}
                <Text style={styles.rightTxt}>
                  {item?.package_tracking?.[0]?.created_at || item?.logInDate}
                </Text>
              </Text>
            </View>


            {/* 8. Logged in by who (Log-In By) */}
            <View style={[styles.rowView, { marginTop: 10 }]}>
              <Text style={styles.leftTxt}>
                {t(isHospitality ? 'Check-In By' : 'Log-In By')}{' '}
                <Text style={styles.rightTxt}>
                  {item?.package_tracking?.[0]?.done_by_user || item?.logInBy}
                </Text>
              </Text>
            </View>

            <View style={[styles.rowView, { marginTop: 10 }]}>
              <Text style={styles.leftTxt}>
                {t('Last Update')}:{' '}
                <Text style={styles.rightTxt}>
                  {formatLastUpdateTime(item?.updated_at)}
                </Text>
              </Text>
            </View>


            {/* Non-hospitality only: Log-Out / Log-Out By */}
            {!isHospitality && isOnline && showPaid && (
              <View>
                <View style={[styles.rowView, { marginTop: 10 }]}>
                  <Text style={styles.leftTxt}>
                    {t('Log-Out')}:{' '}
                    <Text style={styles.rightTxt}>
                      {logOutData?.logoutDate ? logOutData?.logoutDate : '-'}
                    </Text>
                  </Text>
                </View>

                <View style={[styles.rowView, { marginTop: 10 }]}>
                  <Text style={styles.leftTxt}>
                    {t('Log-Out By')}:{' '}
                    <Text style={styles.rightTxt}>
                      {logOutData?.logoutBy ? logOutData?.logoutBy : '-'}
                    </Text>
                  </Text>
                </View>
              </View>
            )}

            {/* Non-hospitality only: Amount Paid */}
            {!isHospitality && showPaid && (
              <View style={[styles.rowView, { marginTop: 10 }]}>
                <Text style={styles.leftTxt}>
                  {t('Amount Paid')}:{' '}
                  <Text style={styles.rightTxt}> ${item?.price}</Text>
                </Text>
              </View>
            )}

            {/* 9. Notes */}
            <View style={[styles.rowView, { marginTop: 10 }]}>
              <Text style={styles.leftTxt}>
                {t('Notes')}:{' '}
                <Text style={styles.rightTxt}>
                  {logOutData?.note ? logOutData?.note : '-'}
                </Text>
              </Text>
            </View>

            {/* 10. Messages */}
            <View style={[styles.rowView, { marginTop: 10 }]}>
              <Text style={styles.leftTxt}>
                {t('Message')}:{' '}
                <Text style={styles.rightTxt}>
                  {item?.custom_message ? item?.custom_message : '-'}
                </Text>
              </Text>
            </View>

            <View style={{ marginVertical: 15 }}>
              <Text style={styles.leftTxt}>{t(isHospitality ? 'Received Image(s)' : 'Logged-Out Image(s)')}</Text>
            </View>
            <View style={[styles.rowView, { marginTop: isIPad ? 20 : 10 }]}>
              {checkoutImages?.length > 0 ? (
                checkoutImages?.map((i: any, index) => (
                  <View key={index.toString()}>
                    <TouchableOpacity
                      onPress={() => {
                        if (!checkoutImages || checkoutImages.length === 0) return;
                        setShowImage([...checkoutImages]);
                        setIsVisible(true);
                      }}
                      style={{
                        height: isIPad ? 200 : 100,
                        width: isIPad ? 200 : 96,
                        marginHorizontal: isIPad ? 20 : 10,
                        marginVertical: isIPad ? 20 : 10,
                      }}>
                      <LoadImage
                        style={styles.imagView}
                        resizeMode={'cover'}
                        source={{ uri: i?.image_url }}
                      />
                    </TouchableOpacity>
                  </View>
                ))
              ) : null}
            </View>
          </ScrollView>
        </View>
      </View>
      {isVisible && (
        <ImagePreview
          isVisible={isVisible}
          image={ShowImage}
          onClose={() => setIsVisible(false)}
        />
      )}
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
    fontFamily: FONTS.RICORDORegular,
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
    fontFamily: FONTS.RICORDORegular,
    color: 'black',
  },
  imagView: {
    height: '100%',
    width: '100%',
    marginRight: 10,
    borderRadius: 10,
  },
});

export { PackageInfoModal };