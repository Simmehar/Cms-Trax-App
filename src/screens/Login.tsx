import React, { cloneElement, useContext, useEffect, useState } from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
  Image,
  ImageBackground,
  Keyboard,
  ActivityIndicator,
  GestureResponderEvent,
  Dimensions,
  StatusBar,
  Modal,
  Linking,
} from 'react-native';
import * as Yup from 'yup';
import { useFormik } from 'formik';
import { COLORS, FONTS, IMAGES } from '../assets';
import {
  AuthContext,
  isValidLoginSession,
  useAuth,
} from '../contexts/authcontext';
import { api } from '../services/api.service';
import { KeyboardScroll } from '../components/KeyboardScroll';
import { CheckIpad, getData, saveData } from '../utilities/securestorage';
import { useNavigationContext } from '../contexts/navigationcontext';
import RNRestart from 'react-native-restart';
import LinearGradient from 'react-native-linear-gradient';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../localization/i18n';
import { useTranslation } from 'react-i18next';

let isPad = CheckIpad();
const LoginSchema = Yup.object().shape({
  username: Yup.string().required('Username is required'),
  password: Yup.string().required('Password is required'),
});

interface LoginProps {
  navigation: any;
}

const { height, width } = Dimensions.get('screen');

const Login: React.FC<LoginProps> = ({ navigation }) => {
  const { login, setUser } = useAuth();

  const { showLoader, setShowLoader } = useNavigationContext();
  const [language, setLanguage] = useState('en');
  const [isLoading, setIsLoading] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  const [sendData, setSendData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState({
    username: '',
    password: '',
  });

  // Dynamic Custom Modal State
  const [modalConfig, setModalConfig] = useState<{
    visible: boolean;
    type: 'maintenance' | 'error' | 'subscription';
    title: string;
    message: string;
    subMessage?: string;
    supportEmail?: string;
  }>({
    visible: false,
    type: 'error',
    title: '',
    message: '',
    subMessage: '',
    supportEmail: 'support@cmstrax.com',
  });

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
  const changeLanguage = async (lang: 'en' | 'es') => {
    setLanguage(lang);
    await AsyncStorage.setItem('language', lang);
    await i18n.changeLanguage(lang);
  };

  useEffect(() => {
    loadLanguage();

    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      },
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      },
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  const loadLanguage = async () => {
    const lang = await AsyncStorage.getItem('language');
    if (lang) {
      setLanguage(lang);
      await i18n.changeLanguage(lang);
    }
  };
  const { user, logout } = useContext(AuthContext);

  const [tokenExpired, setTokenExpired] = useState(false);
  const { t } = useTranslation();

  let isLoggingOut = false;

  axios.interceptors.response.use(
    response => response,
    async error => {
      const status = error.response?.status || 500;
      const code = error?.response?.data?.detail;

      __DEV__ && console.log('Status in login screen:', status);
      __DEV__ && console.log('Code:', code);

      if (
        status === 401 &&
        (code === 'Session expired due to inactivity.' ||
          code === 'Invalid token.')
      ) {
        if (!isLoggingOut) {
          isLoggingOut = true;
          __DEV__ && console.log('Logging out due to session expiration...');
          await logout();
          setTokenExpired(true);
          RNRestart.restart();
        }
        return Promise.reject(error);
      } else {
        return Promise.reject(error);
      }
    },
  );

  useEffect(() => {
    const checkNavigation = async () => {
      const key = 'user.data';
      const data = await getData(key);
      if (!data?.token || data == null || data?.token == 'expired') {
        // Stay on Login
      } else {
        setUser(data);
        navigation.replace('Home');
      }
    };
    checkNavigation();
  }, []);

  const onLogin = async () => {
    if (!sendData.username) {
      setError({ ...error, username: t('Username is required') });
      return;
    } else if (!sendData.password) {
      setError({ ...error, password: t('password is required') });
      return;
    }

    __DEV__ && console.log('sendData', sendData);
    try {
      setShowLoader(true);
      Keyboard.dismiss();

      const response = await api.post('/login', sendData, {
        headers: { 'Content-Type': 'application/json' },
      });

      console.log('response.data=========>', response?.data);
      if (response?.data) {
        const stripeKey = response?.data?.stripe_publishable_key;
        if (stripeKey) {
          await AsyncStorage.setItem('STRIPE_PUBLISHABLE_KEY', stripeKey);
          console.log('Stripe Key Stored Successfully:', stripeKey);
        }
        login(response?.data);
        const data = {
          id: response?.data?.user?.id,
          token: response?.data?.token,
          firstname: response?.data?.user?.first_name,
          currentplan: response?.data?.current_plan?.name,
        };
        await saveData('user.data', data);
        setUser(data);
        setSendData({ username: '', password: '' });
        navigation.replace('Home');
      }
    } catch (err: any) {
      __DEV__ && console.log('errorr==', err);

      const status = err?.response?.status;
      const errorCode = err?.response?.data?.error || err?.response?.data?.detail;
      const errorMsg =
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        '';

      const isServerDown =
        !err?.response ||
        err?.message === 'Network Error' ||
        err?.code === 'ECONNABORTED' ||
        errorCode === 'service_unavailable' ||
        (status && status >= 500);

      const isSubscriptionExpired =
        status === 403 ||
        errorCode === 'subscription_expired' ||
        errorMsg.toLowerCase().includes('subscription') ||
        errorMsg.toLowerCase().includes('expired');

      if (isSubscriptionExpired) {
        setModalConfig({
          visible: true,
          type: 'subscription',
          title: t('Access Restricted'),
          message: t(
            'Your subscription has expired.\nPlease contact your Superuser\nor Admin for assistance.',
          ),
          supportEmail: 'support@cmstrax.com',
        });
      } else if (isServerDown) {
        setModalConfig({
          visible: true,
          type: 'maintenance',
          title: t('Our system is\nunder maintenance'),
          message: t(
            'We’re making some improvements to provide you with a better experience.',
          ),
          subMessage: t('Please try again in a few minutes.'),
        });
      } else {
        const finalErrorMessage =
          errorMsg || t('Email or password is incorrect. Please try again.');

        setModalConfig({
          visible: true,
          type: 'error',
          title: t('Authentication Failed'),
          message: finalErrorMessage,
          subMessage: '',
        });
      }
    } finally {
      setShowLoader(false);
    }
  };

  const [securePassword, setSecurePassword] = useState(true);

  return (
    <KeyboardScroll contentContainerStyle={{ flexGrow: 1 }}>
      <StatusBar barStyle={'light-content'} />

      {/* Language Picker Modal */}
      <Modal
        visible={showLanguagePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguagePicker(false)}>
        <TouchableOpacity
          style={styles.modalContainer}
          activeOpacity={1}
          onPress={() => setShowLanguagePicker(false)}>
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

      <LinearGradient
        colors={['#1C2C5B', '#1F3C73', '#2B5DAA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.background}>
        <View style={styles.container}>
          <Image
            style={isPad ? styles.logoIPad : styles.logo}
            source={IMAGES.logos.logo}
          />
          <TouchableOpacity
            style={styles.languageSelector}
            activeOpacity={0.8}
            onPress={() => setShowLanguagePicker(true)}>
            <View style={styles.languageRow}>
              <Image
                source={languages.find(x => x.value === language)?.flag}
                style={styles.flag}
                resizeMode="contain"
              />
              <Text style={styles.languageText}>
                {languages.find(x => x.value === language)?.label}
              </Text>
            </View>
            <Text style={styles.arrow}>▼</Text>
          </TouchableOpacity>

          <View style={styles.inputGroup}>
            <View style={isPad ? styles.iPadInput : styles.inputI}>
              <TextInput
                style={isPad ? styles.input : styles.inputIPad}
                placeholder={t('Username')}
                placeholderTextColor={COLORS.label}
                textAlignVertical="center"
                value={sendData.username}
                autoCapitalize="none"
                onChangeText={newUsername => {
                  setError({ username: '', password: '' });
                  setSendData(prevValue => ({
                    ...prevValue,
                    username: newUsername,
                  }));
                }}
              />
            </View>
            <Text style={styles.errorText}>
              {error?.password == 'Not a valid user'
                ? error?.password
                : error.username}
            </Text>
            <View style={isPad ? styles.iPadInput : styles.inputI}>
              <TextInput
                style={isPad ? styles.input : styles.inputIPad}
                placeholder={t('Password')}
                placeholderTextColor={COLORS.label}
                textAlignVertical="center"
                value={sendData.password}
                secureTextEntry={securePassword}
                onChangeText={newPass => {
                  setError({ username: '', password: '' });
                  setSendData(prevValue => ({
                    ...prevValue,
                    password: newPass,
                  }));
                }}
              />
              <TouchableOpacity
                onPress={() => setSecurePassword(!securePassword)}
                style={styles.eye}>
                <Image
                  source={
                    securePassword
                      ? require('../assets/images/eyeclose.png')
                      : require('../assets/images/eyeopen.png')
                  }
                  tintColor={'grey'}
                  style={{
                    width: isPad ? 35 : 25,
                    height: isPad ? 35 : 25,
                    resizeMode: 'contain',
                  }}
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.errorText}>
              {error?.password != 'Not a valid user' && error?.password}
            </Text>
          </View>

          <View
            style={[
              isPad ? styles.iPadInputBtn : styles.inputIbtn,
              { backgroundColor: '#FDBE6F' },
            ]}>
            <TouchableOpacity style={styles.button} onPress={onLogin}>
              {isLoading ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={isPad ? styles.padText : styles.buttonText}>
                  {t('Login')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {!isKeyboardVisible && (
          <Text
            style={{
              color: COLORS.white,
              fontSize: isPad ? 20 : 14,
              opacity: 0.7,
              fontFamily: FONTS.RICORDORegular,
              marginBottom: isPad ? 35 : 20,
              alignSelf: 'center',
            }}>
            v1.17
          </Text>
        )}

        {/* Dynamic Custom Popup Modal */}
        <Modal
          visible={modalConfig.visible}
          transparent={true}
          animationType="fade"
          onRequestClose={() =>
            setModalConfig(prev => ({ ...prev, visible: false }))
          }>
          <TouchableOpacity
            style={styles.errorModalOverlay}
            activeOpacity={1}
            onPress={() =>
              setModalConfig(prev => ({ ...prev, visible: false }))
            }>
            <TouchableOpacity
              activeOpacity={1}
              style={styles.errorModalCard}
              onPress={() => {}}>
              {/* Top-Right Close Button */}
              <TouchableOpacity
                style={styles.modalCloseButton}
                activeOpacity={0.7}
                onPress={() =>
                  setModalConfig(prev => ({ ...prev, visible: false }))
                }>
                <Text style={styles.modalCloseButtonText}>✕</Text>
              </TouchableOpacity>

              {/* Scrollable Content Container */}
              <ScrollView
                style={styles.modalScrollView}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
                bounces={false}>
                {/* Icon Container */}
                <View
                  style={[
                    styles.errorModalIconContainer,
                    modalConfig.type === 'subscription' &&
                      styles.subscriptionIconContainer,
                    modalConfig.type === 'error' &&
                      styles.errorModalErrorIconContainer,
                  ]}>
                  <Image
                    source={
                      modalConfig.type === 'subscription'
                        ? IMAGES.Subscription
                        : IMAGES.Setting
                    }
                    style={styles.modalIconImage}
                    resizeMode="contain"
                  />
                </View>

                {/* Title */}
                <Text style={styles.errorModalTitle}>{modalConfig.title}</Text>

                {/* Message */}
                <Text style={styles.errorModalSubtitle}>
                  {modalConfig.message}
                </Text>

                {modalConfig.subMessage ? (
                  <Text style={styles.errorModalDetail}>
                    {modalConfig.subMessage}
                  </Text>
                ) : null}

                {/* Subscription Special Contact Support Row */}
                {modalConfig.type === 'subscription' && (
                  <>
                    <View style={styles.subscriptionDivider} />
                    <TouchableOpacity
                      style={styles.supportContainer}
                      activeOpacity={0.8}
                      onPress={() => {
                        if (modalConfig.supportEmail) {
                          Linking.openURL(`mailto:${modalConfig.supportEmail}`);
                        }
                      }}>
                      <View style={styles.emailIconWrapper}>
                        <Text style={{ fontSize: 18 }}>✉️</Text>
                      </View>
                      <View style={styles.supportTextWrapper}>
                        <Text style={styles.supportPromptText}>
                          {t('For additional support, contact us at')}
                        </Text>
                        <Text
                          style={styles.supportEmailText}
                          numberOfLines={1}
                          ellipsizeMode="tail">
                          {modalConfig.supportEmail || 'support@cmstrax.com'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>

              {/* Bottom OK Button */}
              <View style={styles.errorModalDivider} />
              <TouchableOpacity
                style={styles.errorModalOkButton}
                activeOpacity={0.7}
                onPress={() =>
                  setModalConfig(prev => ({ ...prev, visible: false }))
                }>
                <Text style={styles.errorModalOkText}>{t('OK')}</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </LinearGradient>
    </KeyboardScroll>
  );
};

export { Login };

const styles = StyleSheet.create({
  background: {
    flex: 1,
    height: '100%',
    width: '100%',
    resizeMode: 'stretch',
  },
  container: {
    flex: 1,
    padding: '5%',
    width: '100%',
    marginTop: isPad ? '0%' : '15%',
    alignItems: 'center',
  },
  logo: {
    height: 150,
    width: 200,
    marginBottom: 20,
    resizeMode: 'contain',
  },
  logoIPad: {
    width: '38%',
    height: '25%',
    resizeMode: 'contain',
    marginBottom: height * 0.02,
  },
  logowave: {
    height: 20,
    width: 100,
    resizeMode: 'contain',
  },
  logoIwave: {
    width: '30%',
    height: '3%',
    resizeMode: 'contain',
    marginVertical: 20,
  },
  iPadInput: {
    height: height * 0.08,
    width: '70%',
    borderRadius: 55,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D0D0D0',
    alignSelf: 'center',
    marginTop: 10,
    flexDirection: 'row',
  },
  iPadInputBtn: {
    height: height * 0.08,
    width: '70%',
    justifyContent: 'center',
    borderRadius: 55,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#FDBE6F',
    alignSelf: 'center',
    marginTop: 20,
  },
  inputGroup: {
    width: '100%',
    marginTop: isPad ? 20 : 10,
    alignItems: 'center',
  },
  inputContainer: {
    marginBottom: 20,
    position: 'relative',
  },
  input: {
    color: 'black',
    fontFamily: FONTS.RICORDORegular,
    fontSize: 23,
    paddingHorizontal: 20,
    width: '80%',
    paddingStart: 50,
  },
  inputIPad: {
    color: 'black',
    fontFamily: FONTS.RICORDORegular,
    fontSize: 16,
    paddingHorizontal: 30,
    width: width * 0.7,
  },
  inputI: {
    borderWidth: 1,
    minHeight: 60,
    width: '100%',
    justifyContent: 'space-between',
    paddingRight: 20,
    borderRadius: 30,
    borderColor: COLORS.white,
    backgroundColor: COLORS.white,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIbtn: {
    minHeight: 56,
    borderWidth: 1,
    justifyContent: 'center',
    borderRadius: 30,
    borderColor: COLORS.white,
    backgroundColor: COLORS.white,
    marginTop: isPad ? 12 : 8,
    width: '100%',
  },
  forgotContainer: {
    position: 'absolute',
    right: 25,
    top: 17,
  },
  forgotText: {
    ...FONTS.fontSm,
    color: COLORS.primary,
    fontFamily: FONTS.RICORDOSemiBold,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
  },
  button: {
    width: '100%',
    padding: 15,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: isPad ? 25 : 22,
    fontFamily: FONTS.RICORDOSemiBold,
  },
  padText: {
    color: COLORS.white,
    fontSize: isPad ? 32 : 32,
    fontFamily: FONTS.RICORDOSemiBold,
  },
  errorText: {
    color: '#FDBE6F',
    fontSize: isPad ? 25 : 16,
    marginTop: isPad ? 5 : 0,
    textAlign: 'center',
    width: 520,
    marginStart: 5,
    fontFamily: FONTS.RICORDOSemiBold,
  },
  eye: { width: '20%', alignItems: 'center', justifyContent: 'center' },
  languageSelector: {
    width: isPad ? '35%' : '50%',
    minHeight: 45,
    backgroundColor: '#fff',
    borderRadius: 30,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flag: {
    width: 30,
    height: 22,
    marginRight: 10,
  },
  languageText: {
    color: '#1C2C5B',
    fontSize: isPad ? 22 : 18,
    fontFamily: FONTS.RICORDOSemiBold,
  },
  arrow: {
    color: '#1C2C5B',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdown: {
    width: isPad ? '40%' : '70%',
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
  dropdownText: {
    color: '#000',
    fontSize: 18,
    fontFamily: FONTS.RICORDORegular,
  },

  /* Custom Popup Modal Styles */
  errorModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 14,
    right: 18,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalCloseButtonText: {
    fontSize: 18,
    color: '#8E9BAE',
    fontWeight: 'bold',
  },
  errorModalIconContainer: {
    width: 85,
    height: 85,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  subscriptionIconContainer: {
    width: 80,
    height: 80,
  },
  errorModalErrorIconContainer: {
    width: 85,
    height: 85,
  },
  errorModalIconPlaceholder: {
    fontSize: 38,
  },
  errorModalOkButton: {
    width: '100%',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorModalOkText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0066CC',
    fontFamily: FONTS.RICORDOSemiBold,
  },
  subscriptionDivider: {
    width: '88%',
    height: 1,
    backgroundColor: '#EAEFF5',
    marginVertical: 14,
  },
  emailIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalIconImage: {
    width: '100%',
    height: '100%',
  },
  errorModalCard: {
    width: isPad ? 460 : '90%',
    maxWidth: 380,
    maxHeight: height * 0.8,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingTop: 26,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 10,
    overflow: 'hidden',
  },
  modalScrollView: {
    width: '100%',
  },
  modalScrollContent: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  errorModalTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: '#0F1E36',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 10,
    width: '100%',
    fontFamily: FONTS.RICORDOSemiBold,
  },
  errorModalSubtitle: {
    fontSize: 14.5,
    color: '#55657E',
    textAlign: 'center',
    lineHeight: 21,
    width: '100%',
    marginBottom: 8,
    fontFamily: FONTS.RICORDORegular,
  },
  errorModalDetail: {
    fontSize: 13.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    width: '100%',
    marginBottom: 12,
    fontFamily: FONTS.RICORDORegular,
  },
  supportContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  supportTextWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  supportPromptText: {
    fontSize: 13.5,
    color: '#55657E',
    fontFamily: FONTS.RICORDORegular,
    flexWrap: 'wrap',
  },
  supportEmailText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0052CC',
    fontFamily: FONTS.RICORDOSemiBold,
  },
  errorModalDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#E2E8F0',
    marginTop: 8,
  },
});