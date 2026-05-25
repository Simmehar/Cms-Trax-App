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

            {!message && <Text style={styles.title}>GREAT WORK!</Text>}

            <Text
              style={[
                styles.message,
                {
                  color: '#6F7884',
                  marginBottom: isIPad ? 40 : 20,
                  width: width * 0.8,
                },
              ]}>
              {message || 'You have successfully submitted packages.'}
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
                    : `Department : N/A`}
                </Text>
              )}

              <ShowUpdateData
                isVisible={updateData?.receipientName}
                title={'Recipient'}
                value={`${updateData?.receipientName?.first_name} ${updateData?.receipientName?.last_name}`}
              />

              <ShowUpdateData
                isVisible={updateData?.shipName}
                title={'Ship'}
                value={`${updateData?.shipName?.name}`}
              />

              <ShowUpdateData
                isVisible={updateData?.status}
                title={'Status'}
                value={`${updateData?.status?.name}`}
              />

              <ShowUpdateData
                isVisible={updateData?.type}
                title={'Type'}
                value={`${updateData?.type?.name}`}
              />

              <View style={styles.locationView}>
                <Text style={styles.locationMessage}>Location:</Text>
                <Text style={styles.message}>{responseData?.[0]?.shelf}</Text>
              </View>
               <View style={styles.locationView}>
                <Text style={styles.locationMessage}>Message:</Text>
                <Text style={styles.message}>{updateData?.message}</Text>
              </View>

              <View style={styles.trackBorder}>
                <View style={styles.row}>
                  <View style={styles.headerview}>
                  <Text style={styles.heading}>Tracking#</Text>
                  </View>
                  <View style={styles.headerview}>
                  <Text
                    style={[
                      styles.heading,
                      {
                        borderLeftWidth: 0.3,
                      },
                    ]}>
                    Tag#
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
                <Text style={styles.successButtonText}>OK</Text>
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
    fontFamily: FONTS.PoppinsSemiBold,

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
    fontFamily: FONTS.PoppinsRegular,
    color: 'black',

  },
  locationMessage: {
    fontSize: isIPad ? 25 : 16,
    textAlign: 'center',
    marginVertical: isIPad ? 10 : 3,
    color: '#223890',
    marginHorizontal: 10,
    fontFamily: FONTS.PoppinsSemiBold,
  },
  ascentMessage: {
    fontSize: isIPad ? 25 : 14,
    textAlign: 'center',
    color: 'black',
    marginHorizontal: 10,
    fontFamily: FONTS.PoppinsMedium,
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
    fontFamily: FONTS.PoppinsSemiBold,
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

    fontFamily: FONTS.PoppinsRegular,
  },
  descVal: {
    fontSize: isIPad ? 21 : 18,
    color: 'black',
    textAlign: 'center',
    borderLeftColor: 'grey',
    padding: 10,
    width: '50%',
    fontFamily: FONTS.PoppinsSemiBold,
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

// import React, {useState} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   Image,
//   Modal,
//   Dimensions,
//   FlatList,
// } from 'react-native';

// const {width} = Dimensions.get('screen');

// const icon = require('../assets/images/correct.png');

// const SuccessPackageSubmitModal = ({
//   isVisible,
//   setVisible,
//   responseData,
// }: any) => {
//   //   const [isVisible, setVisible] = useState(true);

//   const data = [
//     {
//       descTitle: 'Wtjtjjr',
//       descValue: '54',
//     },

//     {
//       descTitle: 'Ascent',
//       descValue: '12',
//     },
//   ];

//   return (
//     <Modal visible={isVisible} animationType="fade" transparent>
//       <View style={styles.modalBackground}>
//         <View style={styles.container}>
//           <View style={styles.iconContainer}>
//             <Image source={icon} style={styles.icon} />
//             <Text style={styles.title}>Great Work!</Text>
//           </View>

//           <Text style={styles.message}>You have successfully logged in:</Text>
//           <Text style={styles.title}>{responseData?.[0]?.recipient_name}</Text>
//           <Text style={styles.message}>{responseData?.[0]?.ship_name}</Text>
//           <Text style={styles.message}>
//             {responseData?.[0]?.department
//               ? responseData?.[0]?.department
//               : `Department : N/A`}
//           </Text>
//           <Text style={styles.message}>
//             Location: {responseData?.[0]?.shelf}
//           </Text>
//           <View style={styles.row}>
//             <Text style={styles.heading}>Tracking#</Text>
//             <Text style={styles.heading}>Tag#</Text>
//           </View>

//           <FlatList
//             data={responseData.sort(
//               (a: any, b: any) => a.tag_number - b.tag_number,
//             )}
//             renderItem={({item}) => {
//               return <TrackingValue item={item} />;
//             }}
//           />

//           <TouchableOpacity
//             style={styles.buttonTextStyle}
//             onPress={() => setVisible(false)}>
//             <Text style={styles.successButtonText}>OK</Text>
//           </TouchableOpacity>
//         </View>
//       </View>
//     </Modal>
//   );
// };
// const styles = StyleSheet.create({
//   modalBackground: {
//     flex: 1,
//     backgroundColor: 'rgba(0, 0, 0, 0.5)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   container: {
//     backgroundColor: 'white',
//     paddingVertical: 10,
//     borderRadius: 10,
//     alignItems: 'center',
//     shadowColor: '#000',
//     shadowOffset: {width: 0, height: 2},
//     shadowOpacity: 0.2,
//     shadowRadius: 5,
//     elevation: 5,
//     width: width * 0.9,
//   },
//   iconContainer: {
//     flexDirection: 'row',
//     marginTop: 10,
//   },
//   icon: {
//     width: width * 0.075,
//     height: width * 0.075,
//     marginHorizontal: 5,
//   },
//   title: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     marginBottom: 5,
//     color: 'black',
//   },
//   message: {
//     fontSize: 18,
//     textAlign: 'center',
//     marginVertical: 3,
//     fontWeight: '400',
//     color: 'black',
//     marginHorizontal: 10,
//   },
//   Cancelbutton: {
//     backgroundColor: 'white',
//     paddingVertical: 10,
//     paddingHorizontal: 20,
//     borderRadius: 5,
//     marginHorizontal: 5,
//     borderWidth: 1,
//   },
//   buttonTextStyle: {
//     paddingVertical: 10,
//     paddingHorizontal: 20,
//     borderRadius: 5,
//     marginHorizontal: 5,
//     marginTop: 10,
//   },
//   errorButton: {
//     backgroundColor: 'red',
//     paddingVertical: 10,
//     paddingHorizontal: 20,
//     borderRadius: 5,
//     marginHorizontal: 5,
//   },
//   successButtonText: {
//     color: 'blue',
//     fontSize: 20,
//   },
//   cancelButtonText: {
//     // color: colors.PRIMARY,
//     fontSize: 16,
//     backgroundColor: 'red',
//   },
//   row: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     width: width * 0.9,
//     marginTop: 10,
//   },
//   heading: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     // marginBottom: 3,
//     color: 'black',
//     borderWidth: 0.5,
//     borderColor: 'grey',
//     padding: 10,
//     width: (width * 0.9) / 2,
//     textAlign: 'center',
//   },
//   rowOrder: {
//     flexDirection: 'row',
//     // justifyContent: 'space-between',
//     alignItems: 'center',
//     width: width * 0.9,
//   },
//   descTitle: {
//     fontSize: 18,
//     fontWeight: '400',
//     // marginBottom: 3,
//     color: 'black',
//     borderWidth: 0.5,
//     borderColor: 'grey',
//     padding: 10,
//     width: (width * 0.9) / 2,
//     textAlign: 'center',
//   },
// });
// export default SuccessPackageSubmitModal;

// const TrackingValue = ({item}: any) => {
//   return (
//     <View style={styles.rowOrder}>
//       <Text style={styles.descTitle}>
//         {item.tracking_no.length > 8 && '...'}
//         {item.tracking_no.length > 8
//           ? item.tracking_no.substr(item.tracking_no.length - 8)
//           : item.tracking_no}
//       </Text>
//       <Text style={styles.descTitle}>{item.tag_number}</Text>
//     </View>
//   );
// };
