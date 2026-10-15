import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import {FONTS} from '../assets';
import {useNavigation} from '@react-navigation/native';
import {useNavigationContext} from '../contexts/navigationcontext';
import {isIPad} from '../utilities/securestorage';
import LottieView from 'lottie-react-native';
import {useTranslation} from 'react-i18next';

interface SuccessProps {
  visible: boolean;
  onClose: () => void;
  content: {
    heading: string;
    middle: string;
    lable: string;
  };
  isOnline?: boolean;
}

const SuccessModal: React.FC<SuccessProps> = ({
  visible,
  onClose,
  content,
  isOnline,
}) => {
  const navigation = useNavigation<any>();
  const {setSearchActive} = useNavigationContext();
  const {t} = useTranslation();

  const {width, height} = useWindowDimensions();

  // Detect current orientation dynamically
  const isLandscape = width > height;

  const onPress = () => {
    onClose();

    setSearchActive(true);
    navigation.navigate('Search');
  };

  /*
   * Responsive sizes
   */
  const modalWidth = isIPad
    ? isLandscape
      ? width * 0.6
      : width * 0.85
    : '100%';

  const modalHeight = isIPad
    ? isLandscape
      ? height * 0.88
      : height * 0.6
    : isLandscape
    ? height * 0.75
    : height * 0.6;

  const lottieSize = isIPad
    ? isLandscape
      ? Math.min(width * 0.18, height * 0.45)
      : Math.min(width * 0.35, height * 0.3)
    : isLandscape
    ? Math.min(width * 0.25, height * 0.4)
    : width * 0.4;

  const headingFontSize = isIPad
    ? isLandscape
      ? 32
      : 40
    : isLandscape
    ? 26
    : 30;

  const middleFontSize = isIPad
    ? isLandscape
      ? 22
      : 25
    : isLandscape
    ? 14
    : 16;

  const bottomFontSize = isIPad
    ? isLandscape
      ? 22
      : 30
    : isLandscape
    ? 14
    : 16;

  const buttonWidth = isIPad
    ? isLandscape
      ? width * 0.35
      : width * 0.65
    : isLandscape
    ? width * 0.45
    : width * 0.7;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      supportedOrientations={[
        'portrait',
        'portrait-upside-down',
        'landscape',
        'landscape-left',
        'landscape-right',
      ]}>
      <View style={styles.modalContainer}>
        <View
          style={[
            styles.modalContent,
            {
              width: modalWidth,
              height: modalHeight,
              paddingHorizontal: isIPad ? 30 : 20,
              paddingVertical: isLandscape ? 20 : 30,
            },
          ]}>
          
          {/* Success Animation */}
          <LottieView
            style={{
              width: lottieSize,
              height: lottieSize,
            }}
            source={require('../assets/animations/LottieAnimation.json')}
            autoPlay
            loop
          />

          {/* Heading */}
          <Text
            style={[
              styles.congrats,
              {
                fontSize: headingFontSize,
                marginTop: isLandscape ? 5 : 15,
              },
            ]}>
            {t(content?.heading)}
          </Text>

          {/* Middle Label */}
          {content?.middle ? (
            <Text
              style={[
                styles.miLable,
                {
                  fontSize: middleFontSize,
                  marginVertical: isLandscape ? 5 : 10,
                },
              ]}>
              {t(content?.middle)}
            </Text>
          ) : null}

          {/* Bottom Label */}
          <Text
            style={[
              styles.botTle,
              {
                fontSize: bottomFontSize,
                marginVertical: isLandscape ? 5 : 10,
              },
            ]}>
            {t(content?.lable)}
          </Text>

          {/* OK Button */}
          <TouchableOpacity
            onPress={onPress}
            style={[
              styles.okButton,
              {
                width: buttonWidth,
                paddingVertical: isLandscape ? 8 : 10,
              },
            ]}>
            <Text
              style={[
                styles.okText,
                {
                  fontSize: isIPad
                    ? isLandscape
                      ? 22
                      : 30
                    : 16,
                },
              ]}>
              {t('Ok')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },

  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,

    justifyContent: 'space-evenly',
    alignItems: 'center',

    paddingBottom: 30,
  },

  congrats: {
    fontFamily: FONTS.OpenSansMedium,
    color: 'black',
    textAlign: 'center',
    marginHorizontal: 20,
  },

  miLable: {
    fontFamily: FONTS.RICORDOSemiBold,
    color: '#FDBE6F',
    textAlign: 'center',
    marginHorizontal: 20,
  },

  botTle: {
    fontFamily: FONTS.RICORDORegular,
    color: '#6F7884',
    textAlign: 'center',
    marginHorizontal: 20,
  },

  okButton: {
    alignSelf: 'center',
    backgroundColor: '#FDBE6F',
    borderRadius: 10,
  },

  okText: {
    textAlign: 'center',
    fontWeight: 'bold',
    color: 'white',
  },
});

export {SuccessModal};