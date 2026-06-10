import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import { FONTS, ICONS, IMAGES } from '../assets';
import { useNavigationContext } from '../contexts/navigationcontext';
import { useNavigation } from '@react-navigation/native';
import { CheckIpad, isIPad } from '../utilities/securestorage';
import ScanBarCodeModal from './ScanBarCodeModal';

let isPad = CheckIpad();
interface headProps {
  moreOption: (val: string) => void;
  inputValue: string;
  onSearchText: (val: string) => void;
  onClear: () => void;
}

const Header: React.FC<headProps> = ({
  moreOption,
  inputValue,
  onSearchText,
  onClear,
  isOnline,
}) => {
  const { searchActive, setSearchActive } = useNavigationContext();
  const [barCodeModalVisible, setBarCodeModalVisible] = useState(false);
  const navigation = useNavigation<any>();
  const [showvalue, setshowvalue] = useState();
  const handleSearchPress = () => {
    setSearchActive(true);
    navigation.navigate('Search');
  };

  const handleCancelSearch = () => {
    if (isOnline) {
      setSearchActive(false);
      onClear();
      // navigation.goBack();
      navigation.replace('Home');
    }
  };

  const [searchTimer, setSearchTimer] = useState<any>();

  const searchRecipientHandler = (text: any) => {
    setshowvalue(text);
    moreOption(text);
    if (isOnline) {
      if (searchTimer) {
        clearTimeout(searchTimer);
      }
      setSearchTimer(
        setTimeout(() => {
          onSearchText(text);
        }, 700),
      );
    } else {
      onSearchText(text);
    }
  };

  return (
    <View style={styles.container}>
      {barCodeModalVisible && (
        <ScanBarCodeModal
          visible={barCodeModalVisible}
          setVisible={setBarCodeModalVisible}
          setInputValue={val => { }}
          onChangeText={onSearchText}
        />
      )}

      <View style={styles.iconsContainer}>
        {searchActive ? (
          <>
            <View style={styles.searchIconsContainer}>
              {isOnline && <TouchableOpacity
                style={
                  isPad ? styles.BackIconCircleI : styles.BackIconCircle
                }
                onPress={handleCancelSearch}>
                <Image source={IMAGES.left_arrow} style={styles.backImg} />
              </TouchableOpacity> }
              <View style={styles.inputContier}>
                <View style={[styles.iconsContainer, { flex: 1 }]}>
                  <SvgXml
                    xml={ICONS.header.search}
                    width={isPad ? 35 : '21.5'}
                    height={isPad ? 35 : '21.5'}
                  // style={styles.icon}
                  />
                  <TextInput
                    style={[styles.input, { fontSize: isPad ? 24 : 14, }]}
                    placeholder="Tracking or Name"
                    placeholderTextColor="#999"
                    value={showvalue}
                    onChangeText={val => searchRecipientHandler(val)}
                    autoCorrect={false}
                  //autoFocus={true}
                  />
                </View>
                <TouchableOpacity
                  style={
                    isPad ? styles.SearchIconCircleI : styles.SearchIconCircle
                  }
                  onPress={() => searchRecipientHandler('')}>
                  <SvgXml
                    xml={ICONS.header.cross}
                    width={isPad ? 40 : '21.5'}
                    height={isPad ? 40 : '21.5'}
                    style={styles.icon}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  // onPress={() => navigation.navigate('ScanCamera')}>
                  onPress={() => {

                    setBarCodeModalVisible(true);

                  }}>
                  <SvgXml
                    xml={ICONS.header.scan}
                    width={isPad ? 37 : 25}
                    height={isPad ? 37 : 25}
                    style={styles.icon}
                  />
                </TouchableOpacity>
              </View>


            </View>
          </>
        ) : (
          <View style={{ flexDirection: 'row',justifyContent:'space-between',flex:1}}>
          <>
            <Image style={isPad ? styles.logoiPad : styles.logo} source={IMAGES.header.traxlogo} />
            {/* <Text style={[styles.title, { fontSize: isPad ? 26 : 16 }]}>
              Crew Mail Services
            </Text> */}
            </>
            <View style={{flexDirection:'row'}}>
            <TouchableOpacity
              style={isPad ? styles.iconCircleI : styles.iconCircle}
              onPress={handleSearchPress}>
              <SvgXml
                xml={ICONS.header.search}
                width={isPad ? 32 : '21.5'}
                height={isPad ? 32 : '21.5'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={isPad ? styles.iconCircleI : styles.iconCircle}
              onPress={moreOption}>
              <SvgXml
                xml={ICONS.header.menu}
                width={isPad ? 30 : '21.5'}
                height={isPad ? 30 : '21.5'}
              />
            </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

interface headerProps {
  title: string;
}
const BackHeader: React.FC<headerProps> = ({ title }) => {
  const navigation = useNavigation<any>();
  return (
    <View style={styles.headRow}>
      <TouchableOpacity
        style={styles.backView}
        onPress={() => navigation.goBack(null)}>
        <Image source={IMAGES.left_arrow} style={styles.backImg} />
      </TouchableOpacity>
      <Text style={styles.titleTxt}>{title}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    //  borderBottomWidth: 1,
    // borderBottomColor: '#ccc',
    backgroundColor: 'white',
    paddingTop: 15,
    paddingBottom: 10,
    paddingHorizontal: isPad ? 20 : 10,
  },
  logo: {
  width: 150,
  height: undefined,
  aspectRatio: 3, // adjust based on your logo (e.g. 3:1, 4:1)
  marginLeft: 10,
  resizeMode: 'contain',
},

logoiPad: {
  width: 350,
  height: undefined,
  aspectRatio: 3,
  marginLeft: 10,
  resizeMode: 'contain',
},
  title: {
    fontSize: 16,
    fontFamily: FONTS.PoppinsRegular,
    flex: 1,
    marginLeft: 10,
  },
  iconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F4F4F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  iconCircleI: {
    width: 65,
    height: 65,
    borderRadius: 30,
    backgroundColor: '#F4F4F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  SearchIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 24,
    justifyContent: 'center',
    backgroundColor: '#223890',
    alignItems: 'center',
    marginEnd: 10
  },
  SearchIconCircleI: {
    width: 45,
    height: 45,
    borderRadius: 40,
    justifyContent: 'center',
    backgroundColor: '#223890',
    alignItems: 'center',
    marginEnd: 30
  },
  BackIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    backgroundColor: '#F4F4F4',
    alignItems: 'center',
  },
  BackIconCircleI: {
    width: 75,
    height: 75,
    borderRadius: 40,
    justifyContent: 'center',
    backgroundColor: '#F4F4F4',
    alignItems: 'center',
  },
  crossIconCircle: {
    width: isPad ? 48 : 20,
    height: isPad ? 48 : 20,
    borderRadius: 24,
    justifyContent: 'center',
    backgroundColor: ' #223890',
    alignItems: 'center',
  },

  icon: {
    height: 21.5,
    width: 21.5,
  },
  iconI: {
    height: 28,
    width: 28,
  },
  input: {
    fontSize: 14,
    fontFamily: FONTS.RICORDORegular,
    color: 'black',
    marginLeft: 10,
    flex: 1,
  },
  inputSearch: {
    marginRight: 10,
  },
  searchIconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputContier: {
    flexDirection: 'row',
    alignItems: 'center',
    height: isPad ? 80 : 48,
    backgroundColor: '#F4F4F4',
    borderRadius: 24,
    paddingHorizontal: isPad ? 10 : 10,
    marginHorizontal: 5,
    flex: 1,

  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 15,
    marginTop: 15,
  },
  backView: {
    height: isPad ? 60 : 48,
    width: isPad ? 60 : 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F4F4',
    borderRadius: isPad ? 30 : 24,
  },
  backImg: {
    height: isPad ? 30 : 13.5,
    width: isPad ? 30 : 15,
    resizeMode: 'contain',
  },
  titleTxt: {
    fontSize: isPad ? 30 : 20,
    fontFamily: FONTS.PoppinsSemiBold,
    color: '#6F7884',
    flex: 1,
    textAlign: 'center',
    marginRight: 50,
    // marginLeft : -50
  },
  network: {
    height: isIPad ? 38 : 25,
    width: isIPad ? 38 : 25,
    tintColor: 'green',
  },
  networkI: {
    height: isIPad ? 38 : 25,
    width: isIPad ? 38 : 25,
    tintColor: '#c93a3a',
  },
});

export { Header, BackHeader };
