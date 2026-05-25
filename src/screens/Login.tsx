import React, { useContext, useEffect, useState } from 'react';
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
  Alert,
  StatusBar,
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
  const [isLoading, setIsLoading] = useState(false);
  const [sendData, setSendData] = useState({
    // username: 'simran',
    // password: 'Crew1029!',
    username: '',
    password: '',
  });
  const [error, setError] = useState({
    username: '',
    password: '',
  });

  const { user, logout } = useContext(AuthContext);

  const [tokenExpired, setTokenExpired] = useState(false);

  let isLoggingOut = false;

  axios.interceptors.response.use(
    response => response,
    async error => {
      const status = error.response?.status || 500;
      const code = error?.response?.data?.detail;

      __DEV__ && console.log('Status in login screen:', status);
      __DEV__ && console.log('Code:', code);

      // Handle token expiration only once
      if (status === 401 && (code === 'Session expired due to inactivity.' || code === 'Invalid token.')) {
        if (!isLoggingOut) {
          isLoggingOut = true;
          __DEV__ && console.log('Logging out due to session expiration...');

          // Call logout first, then restart if needed
          await logout();
          setTokenExpired(true);

          // Restart after logout completes
          // setTimeout(() => {
          RNRestart.restart();
          // }, 500);
        }
        return Promise.reject(error);
      } else {
        return Promise.reject(error);
      }
    }
  );


  // __DEV__ && console.log('tokenExpired', tokenExpired)
  useEffect(() => {
    const checkNavigation = async () => {

      const key = 'user.data';
      const data = await getData(key);
      // __DEV__ && console.log('data on login screen', data)
      if (!data?.token || data == null || data?.token == "expired") {
        // navigation.navigate('Login');
      } else {
        setUser(data);
        navigation.replace('Home');
      }
    };
    checkNavigation();
  }, []);

  const onLogin = async () => {
    if (!sendData.username) {
      setError({ ...error, username: 'Username is required' });
      return;
    } else if (!sendData.password) {
      setError({ ...error, password: 'Password is required' });
      return;
    }

    __DEV__ && console.log('sendData', sendData)
    try {
      setShowLoader(true);
      Keyboard.dismiss();
      const response = await api
        .post('/login', sendData, {
          headers: { 'Content-Type': 'application/json' },
        })
        .catch(err => {
          __DEV__ && console.log('err', err);
          Alert.alert('Email or password is incorrect', 'Please try again');
        });

      if (response?.data) {
        login(response?.data);
        setShowLoader(false);
        const data = {
          id: response?.data?.user?.id,
          token: response?.data?.token,
          firstname: response?.data?.user?.first_name,
        };
        await saveData('user.data', data);
        setUser(data);
        setSendData({ username: '', password: '' });
        navigation.replace('Home');
      } else {
      }
      // setError('');
    } catch (error: any) {
      __DEV__ && console.log('errorr==', error);
      setShowLoader(false);
      if (
        error?.response &&
        error?.response?.data?.error === 'Invalid Credentials'
      ) {
        //setError('Incorrect password');
      } else if (error?.response) {
        setError(error?.response?.data?.error);
      }
    } finally {
      setShowLoader(false);
    }
  };

  // useEffect(() => {
  //   const timer = setTimeout(() => {
  //     // Log out user after 10 seconds
  //     __DEV__ && console.log('User logged out after 10 seconds of inactivity');
  //     logout();
  //     navigation.navigate('Login');
  //   }, 7200000); // 10 seconds = 10000 ms

  //   // Cleanup timeout if component unmounts or user logs in before timeout
  //   return () => clearTimeout(timer);

  // }, []);
  const [securePassword, setSecurePassword] = useState(true);

  return (
    <KeyboardScroll contentContainerStyle={{ flexGrow: 1 }}>
      <StatusBar
        barStyle={'light-content'}
      />
      {/* <ImageBackground source={IMAGES.background.bg} style={styles.background}> */}
      <LinearGradient
        colors={['#1C2C5B', '#1F3C73', '#2B5DAA']} // gradient colors
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.background}
      >
      <View style={styles.container}>
        <Image style={isPad ? styles.logoIPad : styles.logo} source={IMAGES.logos.logo} />
        <Image style={isPad ? styles.logoIwave : styles.logowave} source={IMAGES.line} tintColor={'#FDBE6F'} />
        <View style={styles.inputGroup}>
          <View style={isPad ? styles.iPadInput : styles.inputI}>
            <TextInput
              style={isPad ? styles.input : styles.inputIPad}
              placeholder="Username"
              placeholderTextColor={COLORS.label}
              textAlignVertical="center"
              value={sendData.username}
              autoCapitalize="none"
              onChangeText={newUsername => {
                setError({ username: '', password: '' });
                setSendData(prevValue => {
                  return { ...prevValue, username: newUsername };
                });
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
              placeholder="Password"
              placeholderTextColor={COLORS.label}
              textAlignVertical="center"
              value={sendData.password}
              secureTextEntry={securePassword}
              onChangeText={newPass => {
                setError({ username: '', password: '' });
                setSendData(prevValue => {
                  return { ...prevValue, password: newPass };
                });
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
                style={{
                  width: isPad ? 35 : 25,
                  height: isPad ? 35 : 25,
                  resizeMode: 'contain',
                }}
              // tintColor={'red'}
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
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              onLogin();
            }}>
            {isLoading ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={isPad ? styles.padText : styles.buttonText}>Login</Text>
            )}
          </TouchableOpacity>
        </View>


      </View>
      <Text
        style={{
          // marginTop: 50,
          color: 'white',
          fontSize: isPad ? 25 : 18,
          fontWeight: 'bold',
          bottom: isPad ? 90 : 70,
          alignSelf: 'center'
        }}>
        v1.0.3
      </Text>
      </LinearGradient>
    {/* </ImageBackground> */}
    </KeyboardScroll >
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
    marginTop: isPad ? '0%' : '7%',
    // justifyContent: 'center',
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
    // marginBottom: 20,
    // marginVertical:10,
    resizeMode: 'contain',
    // backgroundColor:'green'
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

    // justifyContent: 'flex-start',
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
    alignItems: 'center'
  },
  inputContainer: {
    marginBottom: 20,
    position: 'relative',
  },
  input: {
    color: 'black',
    fontFamily: FONTS.PoppinsRegular,
    fontSize: 23,
    paddingHorizontal: 20,
    width: '80%',
    paddingStart: 50
    // paddingTop: 20,
    // backgroundColor:'red',
  },
  inputIPad: {
    color: 'black',
    fontFamily: FONTS.PoppinsRegular,
    fontSize: 16,
    paddingHorizontal: 30,
    width: width * 0.7,
    // paddingTop: 20,
  },
  inputI: {
    borderWidth: 1,
    height: 60,
    width: '100%',
    justifyContent: 'space-between',
    paddingRight: 20,
    borderRadius: 30,
    borderColor: COLORS.white,
    // paddingHorizontal: 20,
    backgroundColor: COLORS.white,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIbtn: {
    borderWidth: 1,
    // height: 60,
    justifyContent: 'center',
    borderRadius: 30,
    borderColor: COLORS.white,
    // paddingHorizontal: 20,
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
    fontFamily: FONTS.PoppinsSemiBold,
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
    //...FONTS.fontLg,
    color: COLORS.white,
    fontSize: isPad ? 25 : 22,
    fontFamily: FONTS.PoppinsSemiBold,
  },
  padText: {
    color: COLORS.white,
    fontSize: isPad ? 32 : 32,
    fontFamily: FONTS.PoppinsSemiBold,
  },
  errorText: {
    color: 'yellow',
    fontSize: isPad ? 25 : 16,
    marginTop: isPad ? 5 : 0,
    textAlign: 'center',
    width: 520,
    marginStart: 5,
  },
  eye: { width: '20%', alignItems: 'center', justifyContent: 'center' }
});
