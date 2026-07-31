import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  Dimensions,
  FlatList,
  ScrollView,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { FONTS, IMAGES } from '../assets';
import { sortTrackingNumber } from '../functions/SortTrackingNumber';
import { isIPad } from '../utilities/securestorage';
const { width } = Dimensions.get('screen');
import {useTranslation} from 'react-i18next';
const LottieModal = ({
  isVisible,
  setVisible,
  responseData,
  message,
  onCloseSuccessModal,
  updateData,
}: any) => {
  //   const [isVisible, setVisible] = useState(true);

  // __DEV__ && console.log('responseData', responseData);

  const [showInitialPart, setShowInitialPart] = useState(true);
  useEffect(() => {
    if (isVisible) {
      // Show the initial part for 2 seconds
      const timer = setTimeout(() => {
        setShowInitialPart(false);
      }, 2000);

      // Cleanup the timer when the modal is closed
      return () => clearTimeout(timer);
    }
  }, [isVisible]);
  const icon = require('../assets/images/correct.png');
  const data = [
    {
      descTitle: 'Testsim',
      descValue: '42',
    },

    {
      descTitle: 'Testsim',
      descValue: '42',
    },
    {
      descTitle: 'Testsim',
      descValue: '42',
    },
  ];

  const sortedResponse = responseData;
  // .sort(
  //   (a: any, b: any) => Number(a.tag_number) - Number(b.tag_number),
  // );
const {t} = useTranslation();
  return (
    <Modal visible={isVisible} animationType="fade" transparent>
      <View style={styles.modalBackground}>
        <View style={styles.container}>
          <TouchableOpacity
            style={styles.crossView}
            onPress={() => setVisible(false)}>
            <Image source={IMAGES.close} style={styles.closeImg} />
          </TouchableOpacity>
          {showInitialPart ? <>
            <LottieView
              style={styles.icon}
              source={require('../assets/animations/LottieAnimation.json')}
              autoPlay
              loop
            />

            {!message && <Text style={styles.title}>{t('GREAT WORK!')}</Text>}

            <Text
              style={[
                styles.message,
                {
                  color: '#6F7884',
                  marginBottom: isIPad ? 40 : 20,
                  width: width * 0.8,
                },
              ]}>
              {message || t('You have successfully submitted packages.')}
            </Text></> :
            <ScrollView contentContainerStyle={{ alignItems: 'center' }}>

              <Text style={styles.simTitle}>
                {responseData?.[0]?.recipient_name}
              </Text>
              <Text style={styles.ascentMessage}>
                {responseData?.[0]?.ship_name}
              </Text>
              {!message && (
                <Text style={styles.message}>
                  {responseData?.[0]?.department
                    ? responseData?.[0]?.department
                     : `${t('Department')} : ${t('N/A')}`}
                </Text>
              )}

              <ShowUpdateData
                isVisible={updateData?.receipientName}
                title={t('Recipient')}
                value={`${updateData?.receipientName?.first_name} ${updateData?.receipientName?.last_name}`}
              />

              <ShowUpdateData
                isVisible={updateData?.shipName}
                title={t('Ship')}
                value={`${updateData?.shipName?.name}`}
              />

              <ShowUpdateData
                isVisible={updateData?.status}
                title={t('Status')}
                value={`${updateData?.status?.name}`}
              />

              <ShowUpdateData
                isVisible={updateData?.type}
                title={t('Type')}
                value={`${updateData?.type?.name}`}
              />

              <View style={styles.locationView}>
                <Text style={styles.locationMessage}>{t('Location')}:</Text>
                <Text style={styles.message}>{responseData?.[0]?.shelf}</Text>
              </View>
               <View style={styles.locationView}>
                <Text style={styles.locationMessage}>{t('Message')}:</Text>
                <Text style={styles.message}>{updateData?.message}</Text>
              </View>

              <View style={styles.trackBorder}>
                <View style={styles.row}>
                  <View style={styles.headerview}>
                  <Text style={styles.heading}>{t('Tracking#')}</Text>
                  </View>
                  <View style={styles.headerview}>
                  <Text
                    style={[
                      styles.heading,
                      {
                        borderLeftWidth: 0.3,
                      },
                    ]}>
                     {t('Tag#')}
                  </Text>
                  </View>
                </View>

                <FlatList
                  data={sortedResponse}
                  scrollEnabled={false}
                  renderItem={({ item }) => {
                    return <TrackingValue item={item} />;
                  }}
                />
              </View>

              <TouchableOpacity
                style={styles.buttonTextStyle}
                onPress={() => {
                  setVisible(false);
                  onCloseSuccessModal && onCloseSuccessModal();
                }}>
                <Text style={styles.successButtonText}>{t('OK')}</Text>
              </TouchableOpacity>
            </ScrollView>}
        </View>
      </View>
    </Modal>
  );
};

const ShowUpdateData = ({ isVisible, title, value }: any) => {
  if (isVisible) {
    return (
      <View style={styles.locationView}>
        <Text style={styles.locationMessage}>{title}:</Text>
        <Text style={styles.message}>{value}</Text>
      </View>
    );
  } else {
    return <></>;
  }
};

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: 'white',
    paddingVertical: 10,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    width,
    maxHeight: '80%',
  },
  iconContainer: {
    marginVertical: 10,

  },
  trackBorder: {
    // backgroundColor: 'red',
    width,
    marginVertical: isIPad ? 20 : 10,
    padding: 15,
    paddingHorizontal:isIPad ? 50 : 0,
    borderRadius: 20,
  },
  icon: {
    width: width * 0.4,
    height: width * 0.4,
    marginHorizontal: 5,
  },
  title: {
    fontSize: isIPad ? 35 : 20,
    fontFamily: 'OpenSans-Bold',
    marginBottom: isIPad ? 10 : 5,
    color: 'black',
  },
  simTitle: {
    fontSize: isIPad ? 35 : 20,
    color: '#223890',
    fontFamily: FONTS.RICORDOSemiBold,

  },
  locationView: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    fontSize: isIPad ? 25 : 18,
    textAlign: 'center',
    marginVertical: 5,
    fontFamily: FONTS.RICORDORegular,
    color: 'black',

  },
  locationMessage: {
    fontSize: isIPad ? 25 : 16,
    textAlign: 'center',
    marginVertical: isIPad ? 10 : 3,
    color: '#223890',
    marginHorizontal: 10,
    fontFamily: FONTS.RICORDOSemiBold,
  },
  ascentMessage: {
    fontSize: isIPad ? 25 : 14,
    textAlign: 'center',
    color: 'black',
    marginHorizontal: 10,
    fontFamily: FONTS.RICORDOSemiBold,
    marginVertical: isIPad ? 10 : 0
  },

  buttonTextStyle: {
    borderRadius: 40,
    backgroundColor: '#FDBE6F',
    padding:  isIPad ? 25 :15,
    marginVertical:  isIPad ? 25 :10,
    width: width * 0.8,
  },
  successButtonText: {
    color: 'white',
    fontSize:  isIPad ? 25 :20,
    fontWeight: '700',
    alignSelf: 'center',
  },
  heading: {
    fontSize: isIPad ? 25 : 18,
    color: 'black',
    paddingVertical: 15,
    textAlign: 'center',
   
    padding: 10,
    fontFamily: FONTS.RICORDOSemiBold,
  },
  rowOrder: {
    backgroundColor: '#F4F4F4',
    flexDirection: 'row',
    alignItems: 'center',
  },
  descTitle: {
    fontSize: isIPad ? 21 : 18,
    color: 'black',
    textAlign: 'center',

    fontFamily: FONTS.RICORDORegular,
  },
  descVal: {
    fontSize: isIPad ? 21 : 18,
    color: 'black',
    textAlign: 'center',
    borderLeftColor: 'grey',
    padding: 10,
    width: '50%',
    fontFamily: FONTS.RICORDOSemiBold,
  },
  row: {
    backgroundColor: '#F4F4F4',
    flexDirection: 'row',
    alignItems: 'center',
  },
  crossView: {
    height: width * 0.12,
    width: width * 0.12,
    borderRadius: (width * 0.12) / 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F4F4',
    alignSelf: 'flex-end',
    marginRight: 10,
  },
  closeImg: {
    height: isIPad ? 20 : 10,
    width: isIPad ? 20 : 10,
    tintColor: 'black',
  },
  headerview:{ borderBottomWidth: 1,
    borderColor: 'lightgrey',
    width: '50%',alignItems:'center',justifyContent:'center',}
});
export default LottieModal;

const TrackingValue = ({ item }: any) => {
  return (
    <View style={styles.rowOrder}>
      <View style={{
        borderRightColor: 'lightgrey', borderRightWidth: 1,
        padding: 10,
        width: '50%'
      }}>
        <Text style={styles.descTitle}>
          {/* {item.tracking_no} */}
          {sortTrackingNumber(item?.tracking_no|| '')}
        </Text>
      </View>
      <Text style={[styles.descVal, { borderLeftWidth: 0.3 }]}>
        {item.tag_number}
      </Text>
    </View>
  );
};

