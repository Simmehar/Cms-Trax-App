import React, {useState} from 'react';
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
import {SvgXml} from 'react-native-svg';
import {FONTS, ICONS, IMAGES} from '../assets';
import {useNavigation} from '@react-navigation/native';
import {useAuth} from '../contexts';
import {useNavigationContext} from '../contexts/navigationcontext';
import {isIPad} from '../utilities/securestorage';
import clearCacheAndStorage from '../functions/CacheClear';
import {useMode} from '../db/db.context';
import {useKeepAwake} from '@sayem314/react-native-keep-awake';

interface BlurProps {
  onClose: () => void;
}

const BLURView: React.FC<BlurProps> = ({onClose}) => {
  useKeepAwake();
  const {searchActive, setSearchActive} = useNavigationContext();
  const {logout} = useAuth();
  const {isOnline, SyncUnsynched, CheckoutProgressBar, initializeDatabase} =
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
    Alert.alert('Join Crew Mail WiFi', '', [
      {
        text: 'OK',
        onPress: async () => {
          __DEV__ && console.log('OK Pressed');
          await SyncUnsynched(setIsProgressEnabled);
        },
      },
    ]);
  };

  const menuContent = (
    <View style={styles.topView}>
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
        <Text style={styles.label}>All Packages</Text>
      </TouchableOpacity>

      <TouchableOpacity
        disabled={isProgressEnabled}
        style={[styles.cardView, {opacity: isProgressEnabled ? 0.5 : 1}]}
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
          {isProgressEnabled ? 'Please wait, data is syncing' : 'Sync Data'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cardView}
        onPress={() => onItemPress('AddRecipient')}>
        <Image source={IMAGES.add_receipent} style={styles.iconImg} />
        <Text style={styles.label}>Add Recipient</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cardView}
        onPress={() => onItemPress('RecentActivity')}>
        <Image source={IMAGES.notepad} style={styles.iconImg} />
        <Text style={styles.label}>Recent Checkouts</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cardView}
        onPress={() => {
          onItemPress('OfflineCheckout');
        }}>
        <Image source={IMAGES.secure} style={styles.iconImg} />
        <Text style={styles.label}>Offline Checkout</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cardView}
        onPress={async () => {
          await clearCacheAndStorage(initializeDatabase);
        }}>
        <Image source={IMAGES.black_delete} style={styles.iconImg} />
        <Text style={styles.label}>Clear Cache</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cardView}
        onPress={() => {
          logout();
          onItemPress('Login');
        }}>
        <Image source={IMAGES.red_power} style={styles.iconImg} />
        <Text style={styles.label}>Logout</Text>
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

const {height, width} = Dimensions.get('screen');

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
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginRight: 12,
    borderWidth:1,
    borderColor:'lightgrey',
  },
  iconImg: {
    height: isIPad ? 35 : 20,
    width: isIPad ? 35 : 20,
    resizeMode: 'contain',
    marginLeft: isIPad ? 25 : 20,
  },
  label: {
    fontSize: isIPad ? 25 : 18,
    fontFamily: FONTS.PoppinsRegular,
    color: 'black',
    marginLeft: isIPad ? 15 : 7,
  },
});

export {BLURView};