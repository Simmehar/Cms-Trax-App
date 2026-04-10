import React, { useContext, useEffect, useReducer, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  DeviceEventEmitter,
  Alert,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  RefreshControl,
  StatusBar,
  Image,
  Modal,
} from 'react-native';
import { Header } from '../components/Header';
import { BottomDrawer } from '../components/BottomDrawer';
import { ShipDetails } from '../components/ShipDetails';
import { AddPackageModal, packageOption } from '../components/AddPackageModal';
import { FONTS, ICONS, IMAGES } from '../assets';
import SmartDocumentScanner, {
  GeminiExtractionResult,
  callCloudVision,
  callGeminiExtraction,
} from '../components/SmartDocumentScanner';
import { SvgXml } from 'react-native-svg';
import { BLURView } from '../components/BlurView';
import {
  CheckIpad,
  checkInternet,
  isIPad,
  showToast,
} from '../utilities/securestorage';
import { useNavigationContext } from '../contexts/navigationcontext';
import { OfflineMode } from '../components/OfflineMode';
import {
  DeparmentObj,
  PackageContext,
  RecipentObj,
  Ships,
  usePackageContext,
} from '../contexts/packagecontext';
import { useAuth } from '../contexts';
import {
  getCustomerList,
  getPackagesCount,
  getShipList,
  postPackage,
  sendEmail,
} from '../utilities/ApiCalls';
import { Helper } from '../utilities/Helper';
import SuccessPackageSubmitModal from '../components/SuccessPackageSubmitModal';
import { KeyboardScroll } from '../components/KeyboardScroll';
import axios from 'axios';
import SyncModal from '../components/SyncModal';
import { useMode } from '../db/db.context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getLoggedToday, getTotalReceived } from '../utilities/ApiCalls';
import { useNavigation } from '@react-navigation/native';
interface Package {
  id: number;
  track_id: string;
  loc: string;
}

interface SendObjType {
  user: string;
  package_type: string;
  ship: string;
  carrier: string;
  shelf: string;
  tracking_no: string;
  condition: string;
  custom_message: string;
  images: string[];
  selected_status: string;
}
let isPad = CheckIpad();

function countReducer(state: any, action: any) {
  return action;
}

const Home: React.FC = ({ navigation }: any) => {
  const { user } = useAuth();
  const { setIsInternet, setShowLoader } = useNavigationContext();

  const [isVisible, setIsVisible] = useState(false);
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [shipName, setShipName] = useState<Ships | null>(null);
  const [latestGemini, setLatestGemini] = useState<GeminiExtractionResult | null>(null);
  const [isBottomModal, setIsBottomModal] = useState(true);
  const [packages, setPackages] = useState<Package[]>([]);
  const [isBlur, setIsBlur] = useState(false);
  const [packageValue, setPackageValue] = useState<packageOption | null>(null);
  const [isRedView, setIsRedView] = useState(false);
  const [isNet, setIsNet] = useState(false);
  const { getShips, shipList } = usePackageContext();

  const [receipientName, setReceipientName] = useState<RecipentObj | null>(null);

  // ── OCR / Background processing state ────────────────────
  const [capturedImagePath, setCapturedImagePath] = useState<string | null>(null);
  const [isBackgroundProcessing, setIsBackgroundProcessing] = useState(false);
  const [backgroundExtracted, setBackgroundExtracted] = useState<GeminiExtractionResult | null>(null);
  const [ocrText, setOcrText] = useState('');

  console.log('packages-=------------', packages);
  console.log('shipName============', shipName);
  console.log('receipientName', receipientName);

  const { searchActive, setSearchActive } = useNavigationContext();
  const {
    isOnline: isInternet,
    modalVisible: dbModal,
    setModalVisible: setdbModal,
  } = useMode();

  useEffect(() => {
    isInternet && getShips();
  }, [isInternet]);

  const [submitLoading, setSubmitLoading] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [responseData, setResponseData] = useState([]);
  const [isNotify, setIsNotify] = useState(true);

  __DEV__ && console.log('isNotify', isNotify);

  // ─────────────────────────────────────────────────────────
  // ✅ Called immediately when scanner captures a photo
  //    — opens AddPackageModal right away
  //    — starts OCR + Gemini in background
  // ─────────────────────────────────────────────────────────
  const handleImageCaptured = async (imagePath: string) => {
    // 1. Close scanner immediately
    setIsScannerVisible(false);

    // 2. Set image path — AddPackageModal will upload it to slot 1 straight away
    setCapturedImagePath(imagePath);

    // 3. Open AddPackageModal
    setIsVisible(true);
    setIsBottomModal(false);

    // 4. Run OCR + Gemini in the background
    setIsBackgroundProcessing(true);
    try {
      __DEV__ && console.log('[Home] Starting background OCR…');
      const { text, confidence } = await callCloudVision(imagePath);
      __DEV__ && console.log('[Home] OCR complete, confidence:', confidence);

      setOcrText(text);

      __DEV__ && console.log('[Home] Starting background Gemini extraction…', shipList);
      const extracted = await callGeminiExtraction(text, shipList);
      __DEV__ && console.log('[Home] Gemini complete:', JSON.stringify(extracted));

      setLatestGemini(extracted);
      setBackgroundExtracted(extracted);
      // ✅ Auto-match Gemini extracted ship_name to context object
      if (extracted.ship_name && !shipName) {
        const matchedShip = shipList?.find(
          s => s.name.toLowerCase() === extracted.ship_name?.toLowerCase()
        );
        if (matchedShip) {
          __DEV__ && console.log('[Home] Auto-matched ship:', matchedShip.name);
          setShipName(matchedShip);
        }
      }

      // ✅ Auto-match Gemini extracted recipient_name to context object
      if (extracted.recipient_name && !receipientName) {
        // You may need to fetch recipients if not already loaded
        // For now, we'll pass the extracted name to AddPackageModal to display
        __DEV__ && console.log('[Home] Found recipient from Gemini:', extracted.recipient_name);
      }
    } catch (err) {
      console.error('[Home] Background processing error:', err);
    } finally {
      setIsBackgroundProcessing(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Add / close AddPackageModal (manual open via + button)
  // ─────────────────────────────────────────────────────────
  const onAddPackage = () => {
    __DEV__ && console.log('Add package');

    if (!isVisible) {
      // Opening manually — clear any previous scan data
      setCapturedImagePath(null);
      setBackgroundExtracted(null);
    }

    setIsBottomModal(!isBottomModal);
    setIsVisible(!isVisible);
  };

  const onSubmitPackage = (value: packageOption) => {
    __DEV__ && console.log('Valuee==', value.ocrText);
    if (value.ocrText && value.ocrText !== ocrText) {
      setOcrText(value.ocrText);
    }

    if (value?.id) {
      const findIndex = packages.findIndex(p => p.id === value.id);
      const newArr: any = packages;
      setPackages([]);
      newArr[findIndex] = { ...value, track_id: value.trackingId };
      setPackages(newArr);
    } else {
      let arr = [...packages];
      setPackageValue(null);
      if (value.trackingId) {
        let obj = {
          id: arr.length > 0 ? arr[arr.length - 1].id + 1 : 1,
          track_id: value.trackingId,
          loc: 'Flo / 254',
          ...value,
        };
        arr.push(obj);
      }
      __DEV__ && console.log('====arr==', arr);
      setPackages(arr);
    }
  };

  const onCreatePackage = async (val: any) => {
    setSubmitLoading(true);

    let response: any = [];

    for (let item of packages) {
      let sendObj: SendObjType = {
        user: receipientName.id.toString(),
        package_type: item?.type?.id?.toString(),
        ship: (val?.shipName?.id).toString(),
        carrier: item?.carrier?.id?.toString(),
        shelf: val?.location,
        tracking_no: item?.trackingId,
        condition: item?.condition?.name,
        custom_message: item?.message,
        selected_status: item?.status?.id,
        images: [
          item?.imagesObj?.image1,
          item?.imagesObj?.image2,
          item?.imagesObj?.image3,
        ].filter(image => image),
      };
      __DEV__ && console.log('sendObj :>> ', sendObj);
      try {
        const packageRes = await postPackage(user, sendObj);
        __DEV__ && console.log('packageRes', packageRes);
        setShowLoader(false);

        const mailData = {
          ids: [packageRes?.id],
          package_status: parseInt(item?.status?.id),
        };
        __DEV__ && console.log('mailData', mailData);

        if (isNotify) {
          const emailRes = await sendEmail(user, mailData);
          __DEV__ && console.log('emailRes', emailRes);
        }

        response.push(packageRes);
      } catch (error) {
        __DEV__ && console.log('=getPackageData =error==', error);
        setShowLoader(false);
        return error;
      }
    }

    setSubmitLoading(false);

    if (packages[0]?.trackingId == response[0]?.tracking_no) {
      setPackages([]);
      setSuccessModalVisible(true);
      setResponseData(response);
      DeviceEventEmitter.emit('add_package_success');
      setLatestGemini(null);
      setBackgroundExtracted(null);
      setCapturedImagePath(null);
      setOcrText('');
      setShipName(null);          // ✅ ADD THIS
      setReceipientName(null);    // (recommended)
      setLocation('');            // (recommended)

      fetchDashboard();
    }
  };

  const [dashboardData, setDashboardData] = useState({
    loggedToday: 0,
    totalReceived: 0,
  });

  const dashboardinfo = {
    scannedToday: dashboardData.loggedToday,
    todayCollection: dashboardData.totalReceived,
  };

  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async () => {
    try {
      if (!user?.token) return;

      const loggedRes = await getLoggedToday(user);
      const totalRes = await getTotalReceived(user);

      setDashboardData({
        loggedToday: loggedRes?.packages_logged || 0,
        totalReceived: totalRes?.total_packages || 0,
      });

    } catch (err) {
      console.log("Dashboard Error:", err);
    } finally {
      setRefreshing(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // ✅ Auto-search recipient when Gemini extraction completes
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!backgroundExtracted?.recipient_name || !user) return;

    const searchRecipient = async () => {
      try {
        const { recipientSearchApi } = await import('../utilities/ApiCalls');
        const cleanedName = backgroundExtracted.recipient_name
          .trim()
          .replace(/[^\w\s]/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        __DEV__ && console.log('[Home] Searching for recipient:', cleanedName);

        const results: RecipentObj[] = await recipientSearchApi(
          user,
          encodeURIComponent(cleanedName),
        );

        if (results?.length > 0) {
          // Use first result or best match
          setReceipientName(results[0]);
          __DEV__ && console.log('[Home] Recipient found:', results[0].first_name, results[0].last_name);
        } else {
          __DEV__ && console.log('[Home] No recipient found for:', cleanedName);
        }
      } catch (err) {
        console.error('[Home] Recipient search error:', err);
      }
    };

    searchRecipient();
  }, [backgroundExtracted, user]); // eslint-disable-line
  useEffect(() => {
    if (!isInternet) {
      setSearchActive(true);
      navigation.navigate('Search');
    } else {
      setSearchActive(false);
      navigation.navigate('Home');
      fetchDashboard();
    }
  }, [isInternet]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchDashboard();
    });
    return () => { unsubscribe(); };
  }, []);

  const insets = useSafeAreaInsets();

  const [divisionName, setDivisionName] = useState<DeparmentObj | null>(null);
  const [location, setLocation] = useState('');

  const [error, setError] = useState({
    isShipName: false,
    isRecipient: false,
    isLocation: false,
    isRecipientBelongsToShip: false,
  });

  const checkValidation = () => {
    if (!shipName?.name) {
      setError({ ...error, isShipName: true });
      return true;
    } else if (!receipientName) {
      setError({ ...error, isRecipient: true });
      return true;
    } else if (!location) {
      setError({ ...error, isLocation: true });
      return true;
    } else {
      return false;
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={{ flex: 1, paddingTop: isIPad ? 70 : 40, backgroundColor: 'white' }}>
        <StatusBar barStyle={'dark-content'} />

        <SuccessPackageSubmitModal
          isVisible={successModalVisible}
          setVisible={setSuccessModalVisible}
          responseData={responseData}
        />

        <SyncModal visible={dbModal} setModalVisible={setdbModal} />

        <View>
          <Header
            moreOption={() => { setIsBottomModal(!isBottomModal); setIsBlur(true); }}
            inputValue={''}
            onSearchText={() => { }}
            isOnline={isInternet}
            onClear={() => { }}
          />
        </View>

        {/* ── AddPackageModal — no scanner inside ─────────── */}
        <AddPackageModal
          isVisible={isVisible}
          onSetVisible={onAddPackage}
          onSubmitPackage={onSubmitPackage}
          packageValue={packageValue}
          setPackageValue={setPackageValue}
          onGeminiExtracted={setLatestGemini}
          capturedImagePath={capturedImagePath}
          isBackgroundProcessing={isBackgroundProcessing}
          backgroundExtracted={backgroundExtracted}
           shipName={shipName}
          receipientName={receipientName}
          location={location}
        
        />

        {/* ── Full-Screen Scanner Modal (managed by Home) ── */}
        <Modal
          visible={isScannerVisible}
          animationType="slide"
          statusBarTranslucent
          onRequestClose={() => setIsScannerVisible(false)}
        >
          <SmartDocumentScanner
            onImageCaptured={handleImageCaptured}
            onClose={() => setIsScannerVisible(false)}
          />
        </Modal>

        <KeyboardAwareScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchDashboard(); }}
            />
          }
        >
          <TouchableOpacity activeOpacity={1} style={{ flex: 1, justifyContent: 'space-between' }}>
            <Dashboard
              userName={user?.firstname || 'CMS'}
              dashboard={dashboardinfo}
              isInternet={isInternet}
              navigation={navigation}
            />

            <View>
              {/* ── OCR BUTTON (moved from AddPackageModal) ── */}
              {isInternet && (
                <TouchableOpacity
                  onPress={() => setIsScannerVisible(true)}
                  style={styles.ocrBtn}
                  activeOpacity={0.8}
                >
                  <Image
                    source={IMAGES.Ocr}
                    style={{ height: isIPad ? 50 : 30, width: isIPad ? 50 : 35, resizeMode: 'contain' }}
                  />
                  <Text style={styles.ocrTxt}>Capture Label - OCR</Text>
                </TouchableOpacity>
              )}

              <BottomDrawer
                isBottomModal={isBottomModal}
                packages={packages}
                oncloseBottomModal={() => setIsBottomModal(!isBottomModal)}
                children={[{ visible: true, element: <ShipDetails />, styles: {} }]}
                receipientName={receipientName}
                setReceipientName={setReceipientName}
                ocrText={ocrText}
                shipName={shipName}
                setShipName={setShipName}
                divisionName={divisionName}
                setDivisionName={setDivisionName}
                error={error}
                setError={setError}
                location={location}
                setLocation={setLocation}
                setIsNotify={setIsNotify}
                isNotify={isNotify}
                onAddPackage={onAddPackage}
                setPackageValue={setPackageValue}
                geminiExtracted={latestGemini}
              />

            </View>

          </TouchableOpacity>
        </KeyboardAwareScrollView>

        {isInternet && (
          <View style={[styles.drawerContainer, { paddingBottom: isIPad ? 50 : 30 }]}>
            <TouchableOpacity
              style={[isPad ? styles.buttonI : styles.button, { backgroundColor: '#1B77AC' }]}
              onPress={onAddPackage}
            >
              <Text style={isPad ? styles.buttonTextI : styles.buttonText}>
                {'+Add Package'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[isPad ? styles.buttonI : styles.button, { backgroundColor: '#FDBE6F' }]}
              disabled={submitLoading}
              onPress={() => {
                const val = { shipName, receipientName, divisionName, location };
                const isValid = checkValidation();
                if (!isValid) {
                  if (submitLoading) return;
                  if (packages.length === 0) {
                    showToast('Please add at least one Package information', '', 3000);
                    return;
                  } else if (val?.receipientName?.ship != val?.shipName?.name) {
                    Alert.alert(
                      'The recipient belongs to another ship.',
                      'Do you still want to proceed?',
                      [
                        { text: 'Cancel' },
                        { text: 'Yes', onPress: () => onCreatePackage(val) },
                      ],
                    );
                  } else {
                    onCreatePackage(val);
                  }
                }
              }}
            >
              <Text style={isPad ? styles.buttonTextI : styles.buttonText}>
                {submitLoading ? 'Processing...' : 'Submit'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {isBlur ? <BLURView onClose={() => setIsBlur(false)} /> : <></>}
      </View>
    </TouchableWithoutFeedback>
  );
};

// ─────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────
interface DashboardProps {
  userName: string;
  isInternet: boolean;
  dashboard: { scannedToday: number; todayCollection: number };
}

const Dashboard: React.FC<DashboardProps> = ({ userName, dashboard, isInternet, }) => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.greetingContainer}>
          <Text style={[styles.greeting, { fontSize: isPad ? 27 : 17 }]}>
            Welcome back,
          </Text>
          {userName.length > 0 && (
            <Text style={[styles.userName, { fontSize: isPad ? 50 : 32 }]}>
              {userName}!
            </Text>
          )}
        </View>
        <View style={{ marginRight: isIPad ? 20 : 10 }}>
          {isInternet
            ? <Image source={IMAGES.internet} style={styles.network} />
            : <Image source={IMAGES.Nointernet} style={styles.networkI} />
          }
        </View>
      </View>
      <View style={styles.statsContainer}>
        {/* <View style={isPad ? styles.statCardIpad : styles.statCard} > */}

        <TouchableOpacity style={isPad ? styles.statCardIpad : styles.statCard} onPress={() => { navigation.navigate('LoggedTodayScreen') }}>
          <Text style={[isPad ? styles.statNumberIpad : styles.statNumber, { fontFamily: 'OctoberCompressBold' }]}>
            {formatNumber(dashboard?.scannedToday || 0)}
          </Text>
          <Text style={[isPad ? styles.statLabelIpad : styles.statLabel, { fontFamily: 'OctoberCompressBold' }]}>
            Logged Today
          </Text>
        </TouchableOpacity>
        {/* </View> */}
        {/* <View style={isPad ? styles.statCardIpad : styles.statCard}> */}
        <TouchableOpacity style={isPad ? styles.statCardIpad : styles.statCard} onPress={() => { navigation.navigate('TotalReceive') }}>
          <Text style={[isPad ? styles.statNumberIpad : styles.statNumber, { fontFamily: 'OctoberCompressBold' }]}>
            {formatNumber(dashboard?.todayCollection || 0)}
          </Text>
          <Text style={[isPad ? styles.statLabelIpad : styles.statLabel, { fontFamily: 'OctoberCompressBold' }]}>
            Total Summary
          </Text>
        </TouchableOpacity>
        {/* </View> */}
      </View>
    </View>
  );
};

const formatNumber = (number: number) =>
  number?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

const styles = StyleSheet.create({
  container: { padding: 20 },
  // ── OCR Button ───────────────────────────────────────────
  ocrBtn: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 6,
    borderWidth: 1.5, borderColor: '#61B3E4', paddingVertical: 10, paddingHorizontal: 20,
    borderRadius: 14, marginBottom: 10, marginTop: 4, backgroundColor: '#EAF6FF',
    shadowColor: '#61B3E4', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
  },
  ocrTxt: {
    fontSize: isIPad ? 20 : 15, fontFamily: FONTS.PoppinsSemiBold, color: '#1B77AC',
  },
  // ── Dashboard ────────────────────────────────────────────
  header: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: isIPad ? 40 : 20, marginTop: isIPad ? 10 : 0,
    paddingHorizontal: isIPad ? 30 : 5,
  },
  greetingContainer: { flex: 1 },
  greeting: { fontSize: 17, fontFamily: FONTS.PoppinsRegular, color: '#1B77AC' },
  userName: { fontSize: 32, fontFamily: FONTS.PoppinsRegular, color: '#1B77AC', fontWeight: '600' },
  statsContainer: { flexDirection: 'row', justifyContent: isIPad ? 'space-around' : 'space-between' },
  statCard: {
    backgroundColor: '#1B77AC', borderRadius: 10, padding: 20,
    width: '45%', marginBottom: 10, alignItems: 'center', marginHorizontal: 5,
  },
  statCardIpad: {
    backgroundColor: '#1B77AC', borderRadius: 20, padding: 25, paddingVertical: 45,
    width: '45%', marginBottom: 10, alignItems: 'center', zIndex: 1,
  },
  statNumber: { fontSize: 26, fontFamily: FONTS.PoppinsMedium, color: '#fff' },
  statNumberIpad: { fontSize: 45, fontFamily: FONTS.PoppinsMedium, color: '#fff', fontWeight: '600' },
  statLabel: { fontSize: 15, color: '#fff', marginTop: 5, textAlign: 'center' },
  statLabelIpad: { fontSize: 25, color: '#fff', marginTop: 5, textAlign: 'center' },
  // ── Bottom bar ───────────────────────────────────────────
  drawerContainer: {
    width: '100%', flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: '#002B45', paddingVertical: isIPad ? 20 : 10,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  button: { flex: 1, marginHorizontal: 10, height: 50, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  buttonI: { flex: 1, marginHorizontal: 10, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontFamily: FONTS.PoppinsSemiBold },
  buttonTextI: { color: '#fff', fontSize: 25, fontFamily: FONTS.PoppinsSemiBold },
  network: { height: isIPad ? 55 : 30, width: isIPad ? 55 : 30, tintColor: 'green' },
  networkI: { height: isIPad ? 55 : 30, width: isIPad ? 55 : 30, tintColor: '#c93a3a' },
});

export { Home };