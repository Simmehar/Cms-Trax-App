import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Image} from 'react-native';
import {SvgXml} from 'react-native-svg';
import {FONTS, ICONS, IMAGES} from '../assets';
import {useNavigation} from '@react-navigation/native';
import {useAuth} from '../contexts';
import {useNavigationContext} from '../contexts/navigationcontext';

interface OffProps {
  onClose: () => void;
  isRedView: boolean;
  onRedView: () => void;
}

const OfflineMode: React.FC<OffProps> = ({onClose, isRedView, onRedView}) => {
  const navigation = useNavigation<any>();

  const onOKPress = (key: string) => {
    let isCross = true;
    navigation.navigate(key, isCross);
  };

  return (
    <>
      {!isRedView ? (
        // Replaced BlurView with a semi-transparent overlay View
        <View style={styles.absolute}>
          <View style={styles.topView}>
            <TouchableOpacity onPress={onClose} style={styles.crossView}>
              <Image style={styles.xImg} source={IMAGES.close} />
            </TouchableOpacity>
            <Image style={styles.animteImg} source={IMAGES.OffLineImg} />
            <Text style={styles.ofline}>OFFLINE</Text>
            <Text style={styles.content}>
              You are in offline mode, no internet connection available.
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.btnView}>
              <Text style={styles.okTxt}>Ok</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        // Replaced BlurView with a semi-transparent overlay View
        <View style={styles.absoluteend}>
          <View style={styles.redView}>
            <Text style={styles.uhTxt}>Uh Oh!</Text>
            <View style={styles.rowView}>
              <Text style={styles.label}>
                Please save the package details to avoid duplicate records.
              </Text>
              <TouchableOpacity onPress={onRedView} style={styles.xView}>
                <Image style={styles.xImg} source={IMAGES.close} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  absolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    zIndex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // Simulates blur overlay without the native BlurView
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
  },
  absoluteend: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    zIndex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  crossView: {
    height: 48,
    width: 48,
    backgroundColor: '#F4F4F4',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
    alignSelf: 'flex-end',
    marginRight: 10,
    marginTop: -20,
  },
  xImg: {
    height: 10,
    width: 10,
    tintColor: 'black',
    resizeMode: 'contain',
  },
  topView: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    paddingVertical: 30,
  },
  ofline: {
    fontSize: 26,
    fontFamily: FONTS.PoppinsRegular,
    color: 'black',
    textAlign: 'center',
  },
  animteImg: {
    height: 100,
    width: 113,
  },
  content: {
    fontSize: 18,
    fontFamily: FONTS.PoppinsRegular,
    color: '#6F7884',
    textAlign: 'center',
    marginTop: 16,
    marginHorizontal: 50,
  },
  btnView: {
    height: 50,
    width: 300,
    backgroundColor: '#FDBE6F',
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 35,
  },
  okTxt: {
    fontSize: 16,
    fontFamily: FONTS.PoppinsSemiBold,
    color: 'white',
  },
  redView: {
    backgroundColor: '#DB6363',
    height: 100,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  uhTxt: {
    fontSize: 18,
    fontFamily: FONTS.PoppinsSemiBold,
    color: 'white',
  },
  rowView: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  label: {
    fontSize: 18,
    flex: 1,
    fontFamily: FONTS.PoppinsRegular,
    color: 'white',
    marginRight: 20,
  },
  xView: {
    height: 30,
    width: 30,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    marginRight: 10,
  },
});

export {OfflineMode};