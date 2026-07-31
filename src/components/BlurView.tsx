import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import { FONTS, ICONS, IMAGES } from '../assets';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts';
import { useNavigationContext } from '../contexts/navigationcontext';
import { isIPad } from '../utilities/securestorage';
import clearCacheAndStorage from '../functions/CacheClear';
import { useMode } from '../db/db.context';
import { useKeepAwake } from '@sayem314/react-native-keep-awake';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../localization/i18n';
import { Modal } from 'react-native';
interface BlurProps {
  onClose: () => void;
}

const BLURView: React.FC<BlurProps> = ({ onClose }) => {
  useKeepAwake();
  const [language, setLanguage] = useState('en');
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const languages = [
    {
      label: 'USA',
      value: 'en',
      flag: IMAGES.US,
    },
    {
      label: 'Spain',
      value: 'es',
      flag: IMAGES.Spain,
    },
  ];
  React.useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    const lang = await AsyncStorage.getItem('language');

    if (lang) {
      setLanguage(lang);
      await i18n.changeLanguage(lang);
    }
  };
  const changeLanguage = async (lang: 'en' | 'es') => {
    setLanguage(lang);

    await AsyncStorage.setItem('language', lang);

    await i18n.changeLanguage(lang);
  };



  const { t } = useTranslation();
  const { searchActive, setSearchActive } = useNavigationContext();
  const { user, logout } = useAuth();
  console.log('user', user);

  const { isOnline, SyncUnsynched, CheckoutProgressBar, initializeDatabase } =
    useMode();

  const [isProgressEnabled, setIsProgressEnabled] = useState(false);

  const navigation = useNavigation<any>();

  const onItemPress = (key: string) => {
    onClose();
    let isCross = true;
    navigation.navigate(key, isCross);
  };

  if (isProgressEnabled) {
    return <CheckoutProgressBar />;
  }




  const handlePress = () => {
    Alert.alert(t('Join Crew Mail WiFi'), '', [
      {
        text: t('OK'),
        onPress: async () => {
          await SyncUnsynched(setIsProgressEnabled);
        },
      },
    ]);
  };

  const menuContent = (
    <View style={styles.topView}>
      <Modal
        visible={showLanguagePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguagePicker(false)}>

        <TouchableOpacity
          style={styles.modalContainer}
          activeOpacity={1}
          onPress={() => { setShowLanguagePicker(false) }}>

          <View style={styles.dropdown}>
            {languages.map(item => (
              <TouchableOpacity
                key={item.value}
                style={styles.dropdownItem}
                onPress={() => {
                  changeLanguage(item.value as 'en' | 'es');
                  setShowLanguagePicker(false);
                }}>

                <Image
                  source={item.flag}
                  style={styles.flag}
                  resizeMode="contain"
                />

                <Text
                  style={[
                    styles.dropdownText,
                    language === item.value && {
                      color: '#FDBE6F',
                      fontFamily: FONTS.RICORDOSemiBold,
                    },
                  ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
      <TouchableOpacity style={styles.SearchIconCircle} onPress={onClose}>
        <SvgXml
          xml={ICONS.header.cross}
          width={isIPad ? '40' : '20'}
          height={isIPad ? '40' : '20'}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cardView}
        onPress={() => {
          setSearchActive(true);
          onItemPress('Search');
        }}>
        <Image source={IMAGES.packageIcon} style={styles.iconImg} />
        <Text style={styles.label}>{t('All Packages')}</Text>
      </TouchableOpacity>
      {(user.currentplan && user.currentplan != 'Basic') && <TouchableOpacity
        disabled={isProgressEnabled}
        style={[styles.cardView, { opacity: isProgressEnabled ? 0.5 : 1 }]}
        onPress={async () => {
          await SyncUnsynched(setIsProgressEnabled);
        }}>
        <Image source={IMAGES.sync} style={styles.iconImg} />
        <Text
          style={[
            styles.label,
            {
              fontSize: isProgressEnabled ? 24 : isIPad ? 25 : 18,
            },
          ]}>
          {isProgressEnabled
            ? t('Please wait, data is syncing')
            : t('Sync Data')}
        </Text>
      </TouchableOpacity>}

      <TouchableOpacity
        style={styles.cardView}
        onPress={() => onItemPress('AddRecipient')}>
        <Image source={IMAGES.add_receipent} style={styles.iconImg} />
        <Text style={styles.label}>{t('Add Recipient')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cardView}
        onPress={() => onItemPress('RecentActivity')}>
        <Image source={IMAGES.notepad} style={styles.iconImg} />
        <Text style={styles.label}>{t('Recent Checkouts')}</Text>
      </TouchableOpacity>

      {user?.currentplan !== 'Basic' && <TouchableOpacity
        style={styles.cardView}
        onPress={() => {
          onItemPress('OfflineCheckout');
        }}>
        <Image source={IMAGES.secure} style={styles.iconImg} />
        <Text style={styles.label}>{t('Offline Checkout')}</Text>
      </TouchableOpacity>}

      <TouchableOpacity
        style={styles.cardView}
        onPress={() => setShowLanguagePicker(true)}>
        <Image source={languages.find(x => x.value === language)?.flag} style={styles.iconImg} />
        <Text style={styles.label}>
          {t(languages.find(x => x.value === language)?.label)}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.cardView}
        onPress={async () => {
          await clearCacheAndStorage(initializeDatabase);
        }}>
        <Image source={IMAGES.black_delete} style={styles.iconImg} />
        <Text style={styles.label}>{t('Clear Cache')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cardView}
        onPress={() => {
          logout();
          onItemPress('Login');
        }}>
        <Image source={IMAGES.red_power} style={styles.iconImg} />
        <Text style={styles.label}>{t('Logout')}</Text>
      </TouchableOpacity>

    </View>
  );

  // On iOS: frosted-glass effect using rgba white overlay
  // On Android: solid white background (same as before)
  return (
    <View
      style={[
        styles.absolute,
        {
          backgroundColor:
            Platform.OS === 'ios'
              ? 'rgba(255, 255, 255,0.9)'
              : 'rgba(255, 255, 255, 1)',
        },
      ]}>
      {menuContent}
    </View>
  );
};

const { height, width } = Dimensions.get('screen');

const styles = StyleSheet.create({
  absolute: {
    position: 'absolute',
    top: isIPad ? 50 : 30,
    left: 0,
    bottom: 0,
    right: 0,
    zIndex: 1,
  },
  SearchIconCircle: {
    width: isIPad ? 75 : 48,
    height: isIPad ? 75 : 48,
    borderRadius: isIPad ? 60 : 24,
    justifyContent: 'center',
    backgroundColor: '#223890',
    alignItems: 'center',
  },
  icon: {
    height: 21.5,
    width: 21.5,
  },
  topView: {
    alignItems: 'flex-end',
    marginRight: 15,
    marginTop: 20,
  },
  cardView: {
    height: isIPad ? 70 : 38,
    width: isIPad ? width * 0.4 : width * 0.7,
    alignItems: 'center',
    flexDirection: 'row',
    backgroundColor: 'white',
    marginTop: isIPad ? 20 : 12,
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'lightgrey',
  },
  iconImg: {
    height: isIPad ? 35 : 20,
    width: isIPad ? 35 : 20,
    resizeMode: 'contain',
    marginLeft: isIPad ? 25 : 20,
  },
  label: {
    fontSize: isIPad ? 25 : 18,
    fontFamily: FONTS.RICORDORegular,
    color: 'black',
    marginLeft: isIPad ? 15 : 7,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  dropdown: {
    width: isIPad ? '40%' : '70%',
    backgroundColor: '#fff',
    borderRadius: 15,
    overflow: 'hidden',
  },

  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
  },

  flag: {
    width: 30,
    height: 22,
    marginRight: 10,
  },

  dropdownText: {
    color: '#000',
    fontSize: 18,
    fontFamily: FONTS.RICORDORegular,
  },
});

export { BLURView };
