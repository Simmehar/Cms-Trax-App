import React, {cloneElement, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';

import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

import {COLORS, FONTS, IMAGES} from '../assets';
import {KeyboardScroll} from '../components/KeyboardScroll';
import {CheckIpad, isIPad} from '../utilities/securestorage';
import { setBackendUrl } from '../util/apiCalls';

const {width, height} = Dimensions.get('window');
const isPad = CheckIpad();

interface Props {
  navigation: any;
}

const BusinessSelect: React.FC<Props> = ({navigation}) => {
  const [businessEmail, setBusinessEmail] = useState('');
  const [loading, setLoading] = useState(false);

  // =========================
  // API CALL FUNCTION
  // =========================
const handleContinue = async () => {
  try {
    if (!businessEmail?.trim()) {
      Alert.alert('Please enter business email');
      return;
    }

    setLoading(true);

    const response = await axios.post(
      'https://cmslogistics.app.cmstrax.com/api/billing/validate-business-id/',
      {
        business_email: businessEmail,
      },
    );

    console.log('response =====>', response?.data);

    // ==========================
    // INVALID BUSINESS EMAIL
    // ==========================

    if (
      response?.data?.success === false ||
      response?.data?.valid === false
    ) {
      setLoading(false);

      Alert.alert(
        'Business email not found. Please verify your email and try again.'
      );

      return;
    }

    // ==========================
    // VALID BUSINESS EMAIL
    // ==========================

    const tenantDomain = response?.data?.tenant_domain;

    await setBackendUrl(tenantDomain);

    await AsyncStorage.setItem('BUSINESS_SELECTED', 'true');

    setLoading(false);

    navigation.replace('Login');

  } catch (error: any) {
    console.log('Business email not found. Please verify your email and try again.');

    setLoading(false);

    // ==========================
    // API ERROR MESSAGE
    // ==========================
    Alert.alert('Business email not found. Please verify your email and try again.');
  }
};

 return (
  <LinearGradient
    colors={['#13254C', '#1D4178', '#2E67B8']}
    start={{x: 0, y: 0}}
    end={{x: 1, y: 1}}
    style={styles.gradientContainer}>

    <StatusBar
      translucent
      backgroundColor="transparent"
      barStyle="light-content"
    />

    <KeyboardAvoidingView
      style={{flex: 1}}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        <View style={styles.contentContainer}>
          <Image
            source={IMAGES.logos.logo}
            style={isPad ? styles.logoIpad : styles.logo}
          />

          {/* <Image
            source={IMAGES.line}
            tintColor={'#FDBE6F'}
            style={isPad ? styles.waveIpad : styles.wave}
          /> */}

          <Text style={styles.title}>Business Setup</Text>

          <Text style={styles.subTitle}>
            Enter your business Email to continue
          </Text>

          <View style={styles.inputWrapper}>
            <TextInput
              placeholder="Enter Business Email"
              placeholderTextColor="#7A7A7A"
              autoCapitalize="none"
              value={businessEmail}
              onChangeText={setBusinessEmail}
              style={styles.input}
            />
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.button}
            onPress={handleContinue}
            disabled={loading}>

            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Continue to Login</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>v1.0.4</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  </LinearGradient>
);
};

export {BusinessSelect};

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },

  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'space-between', 
    paddingBottom: 35, 
  },

  contentContainer: {
    width: '88%',
   paddingTop: isPad ? 80 : 120,
    alignItems: 'center',
  },

  logo: {
    width: 220,
    height: 150,
    resizeMode: 'contain',
  },

  logoIpad: {
    width: width * 0.35,
    height: height * 0.2,
    resizeMode: 'contain',
  },

  wave: {
    width: 110,
    height: 20,
    resizeMode: 'contain',
    marginTop: 5,
    marginBottom: 25,
  },

  waveIpad: {
    width: width * 0.18,
    height: 25,
    resizeMode: 'contain',
    marginBottom: 30,
  },

  title: {
    color: COLORS.white,
    fontSize: isPad ? 34 : 28,
    fontFamily: FONTS.PoppinsSemiBold,
    marginTop:20
  },

  subTitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: isPad ? 20 : 14,
    marginTop: 8,
    marginBottom: 35,
    fontFamily: FONTS.PoppinsRegular,
    textAlign: 'center',
  },

  inputWrapper: {
    width: '100%',
    height: isPad ? 80 : 58,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  input: {
    color: '#111111',
    fontSize: isPad ? 24 : 16,
    fontFamily: FONTS.PoppinsRegular,
  },

  button: {
    width: '100%',
    height: isPad ? 80 : 58,
    backgroundColor: '#FDBE6F',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },

  buttonText: {
    color: COLORS.white,
    fontSize: isPad ? 24 : 17,
    fontFamily: FONTS.PoppinsSemiBold,
  },

  versionText: {
    color: COLORS.white,
    fontSize: isPad ? 20 : 14,
    opacity: 0.7,
    fontFamily: FONTS.PoppinsMedium,
    marginTop: 20, // Safe margin agar screen choti ho toh content se na chipke
  },
});