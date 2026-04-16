import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  Image,
  Dimensions,
} from 'react-native';
import {FONTS, ICONS, IMAGES} from '../assets';
import {useNavigation} from '@react-navigation/native';
import {useNavigationContext} from '../contexts/navigationcontext';
import {isIPad} from '../utilities/securestorage';
import LottieView from 'lottie-react-native';

interface SuccessProps {
  visible: boolean;
  onClose: () => void;
  content: {heading: string; middle: string; lable: string};
}

const SuccessModal: React.FC<SuccessProps> = ({
  visible,
  onClose,
  content,
  isOnline,
}) => {
  let navigation = useNavigation<any>();
  const {searchActive, setSearchActive} = useNavigationContext();

  const onPress = () => {
    onClose();

    if (isOnline) {
      // setSearchActive(false);
      // navigation.navigate('Home');
       setSearchActive(true);
      navigation.navigate('Search');
    } else {
       setSearchActive(true);
      navigation.navigate('Search');
    }
  };

  // useEffect(() => {
  //   let timer = setTimeout(() => {
  //     onClose();

  //     if (isOnline) {
  //       setSearchActive(false);
  //       navigation.navigate('Home');
  //     } else {
  //       navigation.navigate('Search');
  //     }
  //   }, 2200);

  //   return () => {
  //     //timer.clarTIme
  //   };
  // }, []);

  return (
    <Modal visible={visible}  transparent={true}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {/* <TouchableOpacity style={styles.crossView}
                        onPress={onClose} >
                        <Image source={IMAGES.close} style={styles.closeImg} />
                    </TouchableOpacity> */}
          {/* <View style={styles.gifImg}>
            <Image source={IMAGES.greenCheck} style={styles.gifImg} />
          </View> */}
           <LottieView
                        style={styles.icon}
                        source={require('../assets/animations/LottieAnimation.json')}
                        autoPlay
                        loop
                      />
          <Text style={styles.congrats}>{content?.heading} </Text>
          {content?.middle ? (
            <Text style={styles.miLable}>{content?.middle}</Text>
          ) : (
            <></>
          )}
          <Text style={styles.botTle}>{content.lable}</Text>

          <TouchableOpacity
            onPress={onPress}
            style={{
              alignSelf: 'center',
              backgroundColor: '#FDBE6F',
              width: width * 0.7,
              paddingVertical: 10,
              borderRadius: 10,
            }}>
            <Text
              style={{
                textAlign: 'center',
                fontSize: isIPad ? 30 :16,
                fontWeight: 'bold',
                color: 'white',
              }}>
              Ok
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const {height, width} = Dimensions.get('screen');

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    // flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    // maxHeight: '75%',
    height: height * 0.6,
    justifyContent: 'space-around',
    alignItems:'center'
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
    height: 10,
    width: 10,
    tintColor: 'black',
  },
  gifImg: {
    height: isIPad ? 250:170,
    width: isIPad ? 250 :170,
    resizeMode: 'contain',
    alignSelf: 'center',
  },
  congrats: {
    fontSize: isIPad ? 40 :30,
    fontFamily: FONTS.OpenSansMedium,
    color: 'black',
    textAlign: 'center',
    marginTop: 20,
  },
  botTle: {
    fontSize: isIPad ? 30 : 16,
    fontFamily: FONTS.PoppinsRegular,
    color: '#6F7884',
    textAlign: 'center',
    marginVertical:isIPad?10:10,
  },
  miLable: {
    fontSize: isIPad ? 25 : 16,
    fontFamily: FONTS.PoppinsSemiBold,
    marginVertical:isIPad?10:10,
    color: '#FDBE6F',
    textAlign: 'center',
  },
   icon: {
    width: width * 0.4,
    height: width * 0.4,
    marginHorizontal: 5,
  },
});

export {SuccessModal};
