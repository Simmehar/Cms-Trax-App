import React, { cloneElement, useCallback, useContext, useEffect, useReducer, useRef, useState } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Header } from '../components/Header';
import { BottomDrawer } from '../components/BottomDrawer';
import { ShipDetails } from '../components/ShipDetails';
import { AddPackageModal, packageOption } from '../components/AddPackageModal';
import { FONTS, ICONS, IMAGES } from '../assets';
import SmartDocumentScanner, {
  SmartDocumentScannerHandle,
  GeminiExtractionResult,
  EMPTY_EXTRACTION,
  callCloudVision,
  callGeminiExtraction,
} from '../components/SmartDocumentScanner';
import {
  ScannedCode,
  mergeCodeIntoExtraction,
} from '../utilities/codeParser';
import { resolveScanMode } from '../utilities/scanMode';
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
import {
  getLoggedToday,
  getTotalReceived,
  getUnreadNotificationCount,
  NOTIFICATIONS_CHANGED_EVENT,
} from '../utilities/ApiCalls';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { useTranslation } from 'react-i18next';

interface Package {
  id: number;
  track_id: string;
  loc: string;
  [key: string]: any;
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

// ─────────────────────────────────────────────────────────────
// HOSPITALITY GRID OPTIONS
// ─────────────────────────────────────────────────────────────
const HOSPITALITY_OPTIONS = [
  { id: 1, label: 'Packages', icon: IMAGES.Packages, color: '#ede3fc', bordercolor: '#5614e6' },
  { id: 2, label: 'Luggage', icon: IMAGES.Luggage, color: '#deecfd', bordercolor: '#006efd' },
  { id: 3, label: 'Valet', icon: IMAGES.Valet, color: '#eaecf1', bordercolor: '#16181b' },
  { id: 6, label: 'Lost & Found', icon: IMAGES.Concierge, color: '#fdf0d9', bordercolor: '#faa302' },
  { id: 4, label: 'Internal Deliveries', icon: IMAGES.Deliveries, color: '#dff7ea', bordercolor: '#018949' },
  { id: 5, label: 'Rentals', icon: IMAGES.Rentals, color: '#fee3e3', bordercolor: '#e81f13' },
];

const HOSPITALITY_OFF_TYPES = [1, 4];

const Home: React.FC = ({ navigation }: any) => {
  const { user } = useAuth();
  const { setIsInternet, setShowLoader } = useNavigationContext();

  const [isVisible, setIsVisible] = useState(false);
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const scannerRef = useRef<SmartDocumentScannerHandle>(null);
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

  const [isHospitality, setIsHospitality] = useState(false);
  const [selectedPackageType, setSelectedPackageType] = useState<number>(1);

  const scanMode = resolveScanMode(isHospitality, selectedPackageType);

  // isHospitalityMode is still used for scan extraction only (mergeCodeIntoExtraction).
  // Submit / validation now follow the same flag the UI uses: isHospitality.
  const isHospitalityMode =
    isHospitality && !HOSPITALITY_OFF_TYPES.includes(selectedPackageType);

  const [capturedImagePath, setCapturedImagePath] = useState<string | null>(null);
  const [isBackgroundProcessing, setIsBackgroundProcessing] = useState(false);
  const [backgroundExtracted, setBackgroundExtracted] = useState<GeminiExtractionResult | null>(null);
  const [ocrText, setOcrText] = useState('');
  const [showShipAlert, setShowShipAlert] = useState(false);

  const { searchActive, setSearchActive } = useNavigationContext();
  const {
    isOnline: isInternet,
    modalVisible: dbModal,
    setModalVisible: setdbModal,
  } = useMode();

  useEffect(() => {
    const fetchBusinessType = async () => {
      try {
        const storedType = await AsyncStorage.getItem('BUSINESS_TYPE');
        setIsHospitality(storedType === 'hotels-and-hospitality');
      } catch (e) {
        console.warn('Error reading BUSINESS_TYPE in Home', e);
      }
    };
    fetchBusinessType();
  }, []);

  useEffect(() => {
    isInternet && getShips();
  }, [isInternet]);

  const [submitLoading, setSubmitLoading] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [responseData, setResponseData] = useState([]);
  const [isNotify, setIsNotify] = useState(true);

  const handleImageCaptured = async (
    imagePath: string,
    consensusPlate?: string | null,
    scannedCode?: ScannedCode | null,
  ) => {
    setIsScannerVisible(false);
    setCapturedImagePath(imagePath);
    setIsVisible(true);
    setIsBottomModal(false);

    setIsBackgroundProcessing(true);
    try {
      const barcodeCarriesFullId =
        scannedCode?.confident &&
        !!scannedCode.value &&
        (scanMode === 'generic' || scanMode === 'plate');

      if (barcodeCarriesFullId) {
        __DEV__ &&
          console.log(
            '[Home] Barcode/QR carries full ID → skip OCR+Gemini:',
            scannedCode!.kind,
            scannedCode!.value,
          );
        const extracted = mergeCodeIntoExtraction(
          EMPTY_EXTRACTION,
          scannedCode!,
          isHospitalityMode,
        );
        setOcrText('');
        setLatestGemini(extracted);
        setBackgroundExtracted(extracted);
        return;
      }

      __DEV__ && console.log('[Home] Starting Google Vision OCR…');
      let ocrTextValue = '';
      try {
        const { text, confidence } = await callCloudVision(imagePath);
        ocrTextValue = text;
        __DEV__ && console.log('[Home] OCR complete, confidence:', confidence);
      } catch (ocrErr) {
        __DEV__ && console.warn('[Home] OCR failed, continuing:', ocrErr);
      }
      setOcrText(ocrTextValue);

      __DEV__ && scannedCode && console.log(
        '[Home] Scanned code:',
        scannedCode.kind,
        scannedCode.value,
        'confident=',
        scannedCode.confident,
      );

      __DEV__ && console.log('[Home] Starting Gemini extraction…');
      let extracted = await callGeminiExtraction(
        ocrTextValue,
        shipList,
        scanMode,
        consensusPlate,
        scannedCode ?? null,
      );

      if (scannedCode?.value) {
        extracted = mergeCodeIntoExtraction(extracted, scannedCode, isHospitalityMode);
      }

      __DEV__ && console.log('[Home] Gemini complete:', JSON.stringify(extracted));
      setLatestGemini(extracted);
      setBackgroundExtracted(extracted);

      if (!isHospitality && extracted.ship_name && !shipName) {
        const matchedShip = shipList?.find(
          s => s.name.toLowerCase() === extracted.ship_name?.toLowerCase(),
        );
        if (matchedShip) {
          __DEV__ && console.log('[Home] Auto-matched ship:', matchedShip.name);
          setShipName(matchedShip);
        }
      }
    } catch (err) {
      console.error('[Home] Background processing error:', err);
      if (scannedCode?.value) {
        const fallback = mergeCodeIntoExtraction(
          EMPTY_EXTRACTION,
          scannedCode,
          isHospitalityMode,
        );
        setLatestGemini(fallback);
        setBackgroundExtracted(fallback);
      }
    } finally {
      setIsBackgroundProcessing(false);
    }
  };

  const onAddPackage = () => {
    if (!isVisible) {
      setCapturedImagePath(null);
      setBackgroundExtracted(null);
    }
    setIsBottomModal(!isBottomModal);
    setIsVisible(!isVisible);
  };

  const onSubmitPackage = (value: packageOption) => {
    if (value.ocrText && value.ocrText !== ocrText) {
      setOcrText(value.ocrText);
    }

    if (value?.id) {
      const findIndex = packages.findIndex(p => p.id === value.id);
      const newArr: any = [...packages];
      newArr[findIndex] = {
        ...value,
        track_id: value.trackingId,
        loc: value.loc || newArr[findIndex]?.loc || '',
      };
      setPackages(newArr);
    } else {
      let arr = [...packages];
      setPackageValue(null);
      if (value.trackingId) {
        let obj: Package = {
          id: arr.length > 0 ? arr[arr.length - 1].id + 1 : 1,
          track_id: value.trackingId,
          // Hospitality items carry their own loc from the modal.
          loc: value.loc || (isHospitality ? '' : location || 'Flo / 254'),
          ...value,
        };
        arr.push(obj);
      }
      setPackages(arr);
    }
  };

  const onCreatePackage = async (val: any) => {
    if (submitLoading) return;

    setSubmitLoading(true);
    let response: any[] = [];

    try {
      for (let item of packages) {
        let sendObj: SendObjType = {
          user: receipientName?.id ? receipientName.id.toString() : '',
          package_type: isHospitality
            ? selectedPackageType.toString()
            : (item?.type?.id ? item.type.id.toString() : ''),
          ship: val?.shipName?.id ? val.shipName.id.toString() : '',
          carrier: item?.carrier?.id ? item.carrier.id.toString() : '',
          // Hospitality items get their location from the modal's Location field.
          shelf: isHospitality ? (item?.loc || '') : (val?.location || ''),
          tracking_no: item?.trackingId,
          condition: item?.condition?.name || '',
          custom_message: item?.message || '',
          selected_status: item?.status?.id || '',
          images: [
            item?.imagesObj?.image1,
            item?.imagesObj?.image2,
            item?.imagesObj?.image3,
            item?.imagesObj?.image4,
          ].filter(Boolean),
        };

        console.log('sendObj', sendObj);
        const packageRes = await postPackage(user, sendObj);
        console.log('packageRes=======', packageRes);

        if (!packageRes) {
          throw new Error('Empty response from server for tracking ' + sendObj.tracking_no);
        }

        const mailData = {
          ids: [packageRes?.id],
          package_status: parseInt(item?.status?.id || '0'),
        };

        if (isNotify) {
          await sendEmail(user, mailData);
        }

        response.push(packageRes);
      }

      if (response.length === 0) {
        throw new Error('No packages were created');
      }

      setPackages([]);
      setSuccessModalVisible(true);
      setResponseData(response);

      DeviceEventEmitter.emit('add_package_success');

      setLatestGemini(null);
      setBackgroundExtracted(null);
      setCapturedImagePath(null);
      setOcrText('');
      setShipName(null);
      setReceipientName(null);
      setLocation('');

      fetchDashboard();
    } catch (error: any) {
      let errorStr = '';
      try {
        errorStr = JSON.stringify(error, null, 2);
      } catch {
        errorStr = String(error?.message ?? error);
      }
      console.log('ERROR >>>', errorStr);

      setTimeout(() => {
        Alert.alert(
          t('Something went wrong'),
          t(
            isHospitality
            ? 'Service creation failed.'
            : 'Package creation failed.',
            errorStr,
          ),
        );
      }, 100);
    } finally {
      setSubmitLoading(false);
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
      console.log('Dashboard Error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const { t } = useTranslation();

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

        const results: RecipentObj[] = await recipientSearchApi(
          user,
          encodeURIComponent(cleanedName),
        );

        if (results?.length > 0) {
          // Hospitality: don't overwrite a guest that is already selected
          setReceipientName(prev => (isHospitality && prev ? prev : results[0]));
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

  // Unread notifications shown as a badge on the header bell
  const [unreadCount, setUnreadCount] = useState(0);
  const refreshUnreadCount = useCallback(async () => {
    if (!user?.token || user.token === 'expired') return;
    try {
      setUnreadCount(await getUnreadNotificationCount(user));
    } catch (e: any) {
      __DEV__ && console.log('unread count error', e?.response?.data || e?.message);
    }
  }, [user]);

  useEffect(() => {
    if (isInternet) refreshUnreadCount();
  }, [isInternet, refreshUnreadCount]);

  useEffect(() => {
    // Re-check when coming back to Home, when the Notifications screen marks
    // items read, and when a push arrives while the app is open.
    const unsubscribeFocus = navigation.addListener('focus', refreshUnreadCount);
    const changed = DeviceEventEmitter.addListener(NOTIFICATIONS_CHANGED_EVENT, refreshUnreadCount);
    return () => {
      unsubscribeFocus();
      changed.remove();
    };
  }, [navigation, refreshUnreadCount]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchDashboard();
      AsyncStorage.getItem('BUSINESS_TYPE').then(storedType => {
        setIsHospitality(storedType === 'hotels-and-hospitality');
      });
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

  // Validate only what the UI actually shows. Uses `isHospitality`
  // (the same flag BottomDrawer and AddPackageModal use) so the
  // required fields match the visible fields exactly.
  const isFormValid = (): boolean => {
    const errors = {
      isShipName: !isHospitality && !shipName?.name,
      isRecipient: !receipientName,
      isLocation: !isHospitality && !location,
      isRecipientBelongsToShip: false,
    };
    setError(errors);

    const missing: string[] = [];
    if (errors.isShipName) missing.push(t('Ship'));
    if (errors.isRecipient) missing.push(t('Recipient'));
    if (errors.isLocation) missing.push(t('Location'));

    if (missing.length > 0) {
      showToast(`${t('Please select')}: ${missing.join(', ')}`, '', 3000);
      return false;
    }
    return true;
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
            onNotificationPress={() => navigation.navigate('Notifications')}
            unreadCount={unreadCount}
          />
        </View>

        <Modal
          visible={showShipAlert}
          transparent
          animationType="fade"
          onRequestClose={() => setShowShipAlert(false)}
        >
          <View style={modalStyles.overlay}>
            <View style={modalStyles.container}>
              <Text style={modalStyles.title}>
                {t('belongs to another ship.')}
              </Text>

              <Text style={modalStyles.message}>
                {t('Do you still want to proceed?')}
              </Text>

              <View style={modalStyles.buttonRow}>
                <TouchableOpacity
                  style={[modalStyles.button, modalStyles.cancelBtn]}
                  onPress={() => setShowShipAlert(false)}
                >
                  <Text style={modalStyles.cancelText}> {t('Cancel')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[modalStyles.button, modalStyles.yesBtn]}
                  onPress={() => {
                    setShowShipAlert(false);
                    const submitData = {
                      shipName,
                      receipientName,
                      divisionName,
                      location,
                    };
                    onCreatePackage(submitData);
                  }}
                >
                  <Text style={modalStyles.yesText}> {t('Yes')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ── AddPackageModal — forceNonHospitality prop removed ── */}
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
          scanMode={scanMode}
        />

        {/* ── Full-Screen Scanner Modal ── */}
        <Modal
          visible={isScannerVisible}
          animationType="slide"
          statusBarTranslucent
          onRequestClose={() => {
            // Android back: stop the camera cleanly before the Modal unmounts it.
            if (scannerRef.current) scannerRef.current.requestClose();
            else setIsScannerVisible(false);
          }}
        >
          <SmartDocumentScanner
            ref={scannerRef}
            onImageCaptured={handleImageCaptured}
            onClose={() => setIsScannerVisible(false)}
            scanMode={scanMode}
          />
        </Modal>

        <KeyboardAwareScrollView
          enableOnAndroid={true}
          extraScrollHeight={Platform.OS === 'android' ? 120 : 60}
          extraHeight={150}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchDashboard(); }}
            />
          }
        >
          <TouchableOpacity activeOpacity={1} style={{ flex: 1 }}>
            <Dashboard
              userName={user?.firstname || t('CMS')}
              dashboard={dashboardinfo}
              isInternet={isInternet}
              navigation={navigation}
              isHospitality={isHospitality}
              selectedPackageType={selectedPackageType}
              setSelectedPackageType={setSelectedPackageType}
            />

            <View>
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
                  <Text style={styles.ocrTxt}>{t(isHospitality ? 'Smart Scan' : 'Capture Label - OCR')}</Text>
                </TouchableOpacity>
              )}

              {/* BottomDrawer — forceNonHospitality prop removed */}
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
          <View style={[styles.drawerContainer, { paddingBottom: isIPad ? 50 : 30, overflow: 'hidden' }]}>
            <LinearGradient
              colors={['#273c7a', '#1F3C73', '#2B5DAA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, {
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20
              }]}
            />

            <TouchableOpacity
              style={[isPad ? styles.buttonI : styles.button, { overflow: 'hidden' }]}
              onPress={onAddPackage}
            >
              <LinearGradient
                colors={['#1C2C5B', '#1F3C73', '#2B5DAA']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={isPad ? styles.buttonTextI : styles.buttonText}>
                {t(isHospitality ? '+Add' : '+Add Package')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[isPad ? styles.buttonI : styles.button, { backgroundColor: '#FDBE6F' }]}
              disabled={submitLoading}
              onPress={() => {
                console.log('[Submit] pressed', {
                  submitLoading,
                  packages: packages.length,
                  ship: shipName?.name,
                  recipient: receipientName?.id,
                  location,
                  isHospitality,
                  isHospitalityMode,
                  selectedPackageType,
                });
                if (submitLoading) return;

                const val = { shipName, receipientName, divisionName, location };

                if (!isFormValid()) return;

                if (packages.length === 0) {
                  showToast(
                    t(
                      isHospitality
                        ? 'Please add at least one Service information'
                        : 'Please add at least one Package information'
                    ),
                    '',
                    3000,
                  );
                  return;
                }

                const shipMismatch =
                  !isHospitality &&
                  !!val.receipientName?.ship &&
                  !!val.shipName?.name &&
                  val.receipientName.ship !== val.shipName.name;

                if (shipMismatch) {
                  setShowShipAlert(true);
                  return;
                }

                onCreatePackage(val);
              }}
            >
              <Text style={isPad ? styles.buttonTextI : styles.buttonText}>
                {submitLoading ? t('Processing') : t('Submit')}
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
// Dashboard (unchanged)
// ─────────────────────────────────────────────────────────────
interface DashboardProps {
  userName: string;
  isInternet: boolean;
  dashboard: { scannedToday: number; todayCollection: number };
  navigation: any;
  isHospitality?: boolean;
  selectedPackageType?: number;
  setSelectedPackageType?: (type: number) => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  userName,
  dashboard,
  isInternet,
  navigation,
  isHospitality = false,
  selectedPackageType = 1,
  setSelectedPackageType,
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.greetingContainer}>
          <Text style={[styles.greeting, { fontSize: isPad ? 27 : 17 }]}>
            {t('Welcome back')}
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

      {isHospitality ? (
        <View style={styles.hospitalityGrid}>
          {HOSPITALITY_OPTIONS.map((item) => {
            const isSelected = selectedPackageType === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.8}
                onPress={() => setSelectedPackageType?.(item.id)}
                style={[
                  styles.hospitalityCard,
                  isSelected && { borderColor: item?.bordercolor },
                  { backgroundColor: item.color },
                ]}
              >
                <Image
                  source={item.icon}
                  style={styles.hospitalityIcon}
                  resizeMode="contain"
                />

                <Text
                  numberOfLines={2}
                  style={[
                    styles.hospitalityLabel,
                    isSelected && styles.hospitalityLabelSelected,
                  ]}
                >
                  {t(item.label)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <View style={styles.statsContainer}>
          <TouchableOpacity
            style={[isPad ? styles.statCardIpad : styles.statCard, { overflow: 'hidden' }]}
            onPress={() => { navigation.navigate('LoggedTodayScreen'); }}
          >
            <LinearGradient
              colors={['#1C2C5B', '#1F3C73', '#2B5DAA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={[isPad ? styles.statNumberIpad : styles.statNumber, { fontFamily: FONTS.RICORDOBold }]}>
              {formatNumber(dashboard?.scannedToday || 0)}
            </Text>
            <Text style={[isPad ? styles.statLabelIpad : styles.statLabel, { fontFamily: FONTS.RICORDOBold }]}>
              {t('Logged Today')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[isPad ? styles.statCardIpad : styles.statCard, { overflow: 'hidden' }]}
            onPress={() => { navigation.navigate('TotalReceive'); }}
          >
            <LinearGradient
              colors={['#1C2C5B', '#1F3C73', '#2B5DAA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={[isPad ? styles.statNumberIpad : styles.statNumber, { fontFamily: FONTS.RICORDOBold }]}>
              {formatNumber(dashboard?.todayCollection || 0)}
            </Text>
            <Text style={[isPad ? styles.statLabelIpad : styles.statLabel, { fontFamily: FONTS.RICORDOBold }]}>
              {t('Total Summary')}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const formatNumber = (number: number) =>
  number?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

const styles = StyleSheet.create({
  container: { padding: 20 },
  ocrBtn: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 6,
    borderWidth: 1.5, borderColor: '#223890', paddingVertical: 10, paddingHorizontal: 20,
    borderRadius: 14, marginBottom: 10, marginTop: 4, backgroundColor: '#e3eff6',
    shadowColor: '#223890', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
  },
  ocrTxt: {
    fontSize: isIPad ? 20 : 15, fontFamily: FONTS.RICORDOBold, color: '#223890',
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: isIPad ? 40 : 20, marginTop: isIPad ? 10 : 0,
    paddingHorizontal: isIPad ? 30 : 5,
  },
  greetingContainer: { flex: 1 },
  greeting: { fontSize: 20, fontFamily: FONTS.RICORDOSemiBold, color: '#223890' },
  userName: { fontSize: 35, fontFamily: FONTS.RICORDORegular, color: '#223890', fontWeight: '600' },
  statsContainer: { flexDirection: 'row', justifyContent: isIPad ? 'space-around' : 'space-between' },
  statCard: {
    backgroundColor: '#223890', borderRadius: 10, padding: 20,
    width: '45%', marginBottom: 10, alignItems: 'center', marginHorizontal: 5,
  },
  statCardIpad: {
    backgroundColor: '#223890', borderRadius: 20, padding: 25, paddingVertical: 45,
    width: '45%', marginBottom: 10, alignItems: 'center', zIndex: 1,
  },
  statNumber: { fontSize: 26, fontFamily: FONTS.RICORDOSemiBold, color: '#fff' },
  statNumberIpad: { fontSize: 45, fontFamily: FONTS.RICORDOSemiBold, color: '#fff', fontWeight: '600' },
  statLabel: { fontSize: 15, color: '#fff', marginTop: 5, textAlign: 'center' },
  statLabelIpad: { fontSize: 25, color: '#fff', marginTop: 5, textAlign: 'center' },

  hospitalityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  hospitalityCard: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  hospitalityIcon: {
    width: isPad ? 50 : 42,
    height: isPad ? 50 : 42,
    marginBottom: 6,
  },
  hospitalityLabel: {
    fontSize: isPad ? 16 : 13,
    fontFamily: FONTS.RICORDOSemiBold,
    color: '#223890',
    textAlign: 'center',
  },
  hospitalityLabelSelected: {
    fontFamily: FONTS.RICORDOBold,
  },

  drawerContainer: {
    width: '100%', flexDirection: 'row', justifyContent: 'space-around', paddingVertical: isIPad ? 20 : 10,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  button: { flex: 1, marginHorizontal: 10, height: 50, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  buttonI: { flex: 1, marginHorizontal: 10, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontFamily: FONTS.RICORDOBold },
  buttonTextI: { color: '#fff', fontSize: 25, fontFamily: FONTS.RICORDOBold },
  network: { height: isIPad ? 55 : 30, width: isIPad ? 55 : 30, tintColor: 'green' },
  networkI: { height: isIPad ? 55 : 30, width: isIPad ? 55 : 30, tintColor: '#c93a3a' },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
  },
  title: {
    fontSize: 18,
    color: '#223890',
    textAlign: 'center',
    fontFamily: FONTS.RICORDOBold,
  },
  message: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
    fontFamily: FONTS.RICORDORegular,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: { backgroundColor: '#E5E7EB', marginRight: 8 },
  yesBtn: { backgroundColor: '#223890', marginLeft: 8 },
  cancelText: { color: '#333', fontSize: 15, fontFamily: FONTS.RICORDOSemiBold },
  yesText: { color: '#FFF', fontSize: 15, fontFamily: FONTS.RICORDOSemiBold },
});

export { Home };