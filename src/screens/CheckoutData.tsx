import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  DeviceEventEmitter,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { BackHeader } from '../components/Header';
import { FONTS, IMAGES } from '../assets';
import { SignatureModal } from '../components/SignatureModal';
import { SuccessModal } from '../components/SuccessModal';
import { InputPicker } from '../components/InputPicker';
import { KeyboardScroll } from '../components/KeyboardScroll';
import { isIPad } from '../utilities/securestorage';
import { PackageType } from '../components/PackageList';
import {
  bulkPackageLogout,
  cashReceivedDetails,
  customerListApiUpdate,
  sendEmail,
  uploadImg,
  deleteImg,
} from '../utilities/ApiCalls';
import { useAuth } from '../contexts';
import { Package, PackageImage, User } from '../db/db.crud';
import CustomerList from '../db/dbcrud/dbcustomerList.crud';
import checkoutUserData from '../db/dbcrud/dbCheckout.crud';
import { useMode } from '../db/db.context';
import { open } from '../components/CameraController';
import deletedPackage from '../db/dbcrud/dbDeletepackage.curd';
import { MaskedInput } from '../components/Maskedmail';
import LinearGradient from 'react-native-linear-gradient';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ShipListModal } from '../components/ShipListModal';

const CheckoutData: React.FC = ({ route }: any) => {
  const { user } = useAuth();
  const { isOnline, initializeDatabase } = useMode();
  const { t } = useTranslation();
  const [isNotify, setIsNotify] = useState(true);
  const [visible, setVisible] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [isSign, setIsSign] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [signImg, setSignImg] = useState<any>(null);
  const [isHospitality, setIsHospitality] = useState(false);

  const onSave = (signatureData: any) => {
    setVisible(!visible);
    setIsSign(true);
    setSignImg(signatureData);
  };

  useEffect(() => {
    fetchBusinessType();
  }, []);

  const fetchBusinessType = async () => {
    try {
      const storedType = await AsyncStorage.getItem('BUSINESS_TYPE');
      setIsHospitality(storedType === 'hotels-and-hospitality');
    } catch (e) {
      console.warn('Error reading BUSINESS_TYPE in BLURView', e);
    }
  };

  const { amountState, packages, customerData, discount, isCredit, selectAmount } = route.params;

  // Added image4 and image4dummy
  const [imagesObj, setImagesObj] = useState<{ [key: string]: string }>({
    image1: '',
    image2: '',
    image3: '',
    image4: '',
    image1dummy: '',
    image2dummy: '',
    image3dummy: '',
    image4dummy: '',
  });

  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [status, setStatus] = useState<PackageType | null>(null);

  const maskEmail = (emailStr: string) => {
    if (!emailStr || !emailStr.includes('@')) return emailStr;
    const [usr, domain] = emailStr.split('@');
    const visibleUser = usr.slice(0, 3);
    const maskedPart = '*'.repeat(Math.max(3, usr.length - 3));
    return `${visibleUser}${maskedPart}@${domain}`;
  };

  const [email, setEmail] = useState(customerData?.[0]?.email);
  const [notes, setNotes] = useState('');
  const [apiLoading, setApiLoading] = useState(false);

  const CheckoutHandlerOnline = async () => {
    setApiLoading(true);

    try {
      const packagesId = packages.map((val: any) => val.id);

      const imgData = new FormData();
      if (signImg) {
        imgData.append('signature', {
          name: 'image',
          type: 'image/jpeg',
          uri: signImg,
        });
      }
      imgData.append('ids', packagesId);
      imgData.append('current_status', status?.id);
      imgData.append('notes', notes);
      imgData.append('notification', isNotify);

      // 4th photo also included if available
      const imageKeys = isHospitality ? ['image1', 'image2', 'image3', 'image4'] : ['image1', 'image2', 'image3'];
      const validImages = imageKeys.map(k => imagesObj[k]).filter(Boolean);

      if (validImages.length > 0) {
        imgData.append('images', validImages);
      }

      const logoutResponse = await bulkPackageLogout(user, imgData);
      if (logoutResponse === '400') {
        return Alert.alert(
          "Couldn't Connect",
          'There may be a problem with the server.\n Please try again later.',
        );
      }

      const paidAmount = Number(amountState?.paidAmount ?? 0);
      const totalPayableAmount = Number(amountState?.totalPayableAmount ?? 0);
      const unpaidPackages = Number(amountState?.unpaid_packages ?? 0);
      const otherPurchases = Number(amountState?.other_purchases ?? 0);
      const credit = Number(amountState?.credit ?? 0);
      const totalDebt = unpaidPackages + otherPurchases;

      const creditCoversAll = credit >= totalDebt && paidAmount === 0 && totalDebt > 0;

      const totalAmount = Math.max(
        isCredit
          ? Number(selectAmount ?? 0)
          : creditCoversAll
            ? 0
            : paidAmount > 0
              ? (paidAmount - totalPayableAmount > 0 ? totalPayableAmount : paidAmount)
              : totalDebt,
        0,
      );

      const payment = {
        amount: totalAmount,
        user_id: packages[0].user.id,
        payment_method: amountState.payment_method,
        direct_discount: discount,
      };

      const hasPendingPackages = totalDebt > 0;
      const hasCashPayment = paidAmount > 0;

      if (hasCashPayment || hasPendingPackages) {
        await cashReceivedDetails(user, payment);
      }

      if (email) {
        const userList = { ...customerData };
        userList[0].email = email;
        await customerListApiUpdate(user, userList[0].id, { email: email });
      }

      const { id } = status;
      let filterIds = packagesId;
      if (id === 10050 || id === 10060) {
        filterIds = [logoutResponse.data[0].package_id];
      }

      const mailData = { ids: filterIds, package_status: id };
      if (isNotify) {
        await sendEmail(user, mailData);
      }

      setApiLoading(false);
      setSuccessVisible(true);
      DeviceEventEmitter.emit('refetchPackages');
    } catch (err) {
      setApiLoading(false);
      Alert.alert('Please try again');
    }
  };

  const CheckoutHandlerOffline = async () => {
    setApiLoading(true);

    try {
      const packagesId = packages.map((val: any) => val.id);

      for (const packageId of packagesId) {
        const existingPackage = await Package.getPackageById(packageId);
        const existingPackageImage = await PackageImage.getPackageImagesByPackageId(packageId);
        if (existingPackage) {
          const safeValue = (value: any) => (value === undefined || value === null ? '' : value);
          const packageData = {
            id: existingPackage.id,
            tracking_no: safeValue(existingPackage.tracking_no),
            carrier: safeValue(existingPackage.carrier),
            tag_number: safeValue(existingPackage.tag_number),
            shelf: safeValue(existingPackage.shelf),
            condition: safeValue(existingPackage.condition),
            current_status: safeValue(existingPackage.current_status),
            is_paid: existingPackage.is_paid ? 1 : 0,
            port: safeValue(existingPackage.port),
            ship_id: existingPackage.ship_id,
            user_id: existingPackage.user_id,
            packageType: safeValue(existingPackage.packageType),
            custom_message: safeValue(existingPackage.custom_message),
            logInBy: safeValue(existingPackage.logInBy),
            Logout: new Date().toISOString(),
            local_url: existingPackageImage?.map(img => img.local_url).join(', ') || '',
          };

          try {
            await deletedPackage.saveDeletedPackage(packageData);
          } catch (error) {
            console.error('Error saving deleted package:', error);
          }
        }
      }

      const totalAmount = Math.max(
        isCredit
          ? Number(selectAmount ?? 0)
          : Number(amountState?.paidAmount ?? 0) - Number(amountState?.totalPayableAmount) > 0
            ? Number(amountState?.totalPayableAmount)
            : Number(amountState?.paidAmount ?? 0),
        0,
      );

      const recordData = {
        sign: signImg || null,
        packagesId: JSON.stringify(packagesId) || '[]',
        selectedStatus: status?.id?.toString() || '0',
        notes: notes || '',
        notification: isNotify ? 1 : 0,
        totalAmount: isNaN(totalAmount) ? 0 : totalAmount,
        cashReceived: isNaN(Number(amountState.paidAmount)) ? 0 : Number(amountState.paidAmount),
        user_id: packages[0]?.user?.id || 0,
        Synced: false,
        payment_method: amountState.payment_method || '',
        direct_discount: isNaN(Number(discount)) ? 0 : Number(discount),
        imageOne: imagesObj?.image1 || '',
        imageTwo: imagesObj?.image2 || '',
        imageThree: imagesObj?.image3 || '',
        imageFour: imagesObj?.image4 || '',
        email: email || '',
      };

      User.updateUserPayableAmountById(packages[0].user.id, Number(amountState.paidAmount));
      await checkoutUserData.saveRecord(recordData);
      await CustomerList.updateCustomerPayable(
        packages[0].user.id,
        Number(amountState.paidAmount),
        isCredit,
      );
      await Package.deletePackages(packagesId);
      await initializeDatabase();

      setApiLoading(false);
      setSuccessVisible(true);
      DeviceEventEmitter.emit('refetchPackages');
    } catch (error) {
      console.error('Error saving data:', error);
      setApiLoading(false);
      setSuccessVisible(true);
    }
  };

  const onSubmit = async () => {
     if (!status?.id) {
    setError(prev => ({ ...prev, isStatus: true }));
    Alert.alert(t('Please select Status'));
    return;
  }
    if (isOnline) {
      await CheckoutHandlerOnline();
    } else {
      await CheckoutHandlerOffline();
    }
  };

  const [data] = useState(packages || []);
  const [error, setError] = useState({
    isTrackingId: false,
    isStatus: false,
    isType: false,
    isCondition: false,
    isImages: false,
  });

  const [imageLoading, setImageLoading] = useState(0);

  const selectMedia = async (key: number) => {
    open(async (response: any) => {
      if (response?.path) {
        let imgData = new FormData();
        imgData.append('image', {
          name: 'image',
          type: 'image/jpeg',
          uri: response.path,
        });

        setImageLoading(key);
        const imgRes = await uploadImg(user, imgData);
        setImageLoading(0);
        setError({ ...error, isImages: false });

        setImagesObj(prev => ({
          ...prev,
          [`image${key}dummy`]: response.path,
          [`image${key}`]: imgRes?.image_url || '',
        }));
      }
    });
  };

  const offlineselectMedia = async (key: number) => {
    open(async (response: any) => {
      if (response?.path) {
        setImageLoading(key);
        setImageLoading(0);
        setError({ ...error, isImages: false });

        setImagesObj(prev => ({
          ...prev,
          [`image${key}dummy`]: response.path,
          [`image${key}`]: response.path,
        }));
      }
    });
  };

  const onDeleteImg = async (key: number) => {
    const imgName = imagesObj[`image${key}`];
    if (imgName && isOnline) {
      deleteImg(user, { image_name: imgName });
    }
    setImagesObj(prev => ({
      ...prev,
      [`image${key}`]: '',
      [`image${key}dummy`]: '',
    }));
  };

  // Determine photo slots dynamically (4 for hospitality, 3 otherwise)
  const photoSlots = isHospitality ? [1, 2, 3, 4] : [1, 2, 3];

  return (
    <View style={styles.mainView}>
      <BackHeader title={t('Checkout')} />

      <SignatureModal
        visible={visible}
        onClose={() => setVisible(!visible)}
        onSave={onSave}
      />

      {successVisible ? (
        <SuccessModal
          visible={successVisible}
          content={{
            heading: t('SUCCESS'),
            middle: '',
            lable: t('Checkout Success'),
          }}
          onClose={() => setSuccessVisible(!successVisible)}
          isOnline={isOnline}
        />
      ) : null}

      <View style={{ flexDirection: 'row', height: '45%', width: '100%', marginTop: isIPad ? 20 : 0 }}>
        {isIPad && (
          <View style={[styles.blueView, { flex: 1, height: '100%', width: '45%' }]}>
            <Text style={styles.shipNem}>
              {`${data[0]?.user?.first_name || ''} ${data[0]?.user?.last_name || ''}`}
            </Text>
            <FlatList
              data={data}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => (
                <TouchableOpacity key={index} style={styles.packageView} onPress={() => {}}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tagTxt}>Tag# {item.tag_number}</Text>
                    <Text style={styles.bluTxt}>
                      {isHospitality ? 'ID' : 'Tracking ID:'}{' '}
                      <Text style={styles.numTxt}>{item.tracking_no}</Text>
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
        <View style={{ width: isIPad ? '50%' : '100%' }}>
          <KeyboardScroll contentContainerStyle={{}}>
            <InputPicker
              isPicker={true}
              isQrCode={false}
              placeholder={t('Status')}
              style={{}}
              onPickerClick={() => setStatusModalVisible(true)}
              pickerValue={status?.name}
            />

            <View>
              {!showInput ? (
                <TouchableOpacity onPress={() => setShowInput(true)} style={styles.displayView}>
                  {email == null || email === '' ? (
                    <View style={styles.nomailmasked}>
                      <Text style={styles.nomailtext}>Email</Text>
                    </View>
                  ) : (
                    <View>
                      <Text style={styles.label}>Email</Text>
                      <Text style={styles.masked}>{maskEmail(email)}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ) : (
                <MaskedInput
                  pickerValue={email}
                  placeholder={t('Email')}
                  onChangeText={(text: string) => setEmail(text)}
                  editable={true}
                  placeholderTextColor="white"
                  style={email && email !== '' ? styles.invalidInputStyle : styles.inputStyle}
                  onBlur={() => setShowInput(false)}
                />
              )}
            </View>

            {(!email || email == null) && (
              <Text style={{ color: 'red', marginHorizontal: 30, fontSize: 16, fontWeight: 'bold' }}>
                {t('Please add email address')}
              </Text>
            )}

            <InputPicker
              isPicker={false}
              isQrCode={false}
              placeholder={t('Notes')}
              style={{}}
              onChangeText={setNotes}
              editable={true}
            />

            <View style={[styles.roView, { marginTop: 10 }]}>
              <TouchableOpacity onPress={() => setIsNotify(!isNotify)}>
                {!isNotify ? (
                  <View style={styles.unSelBox} />
                ) : (
                  <View style={styles.selBox}>
                    <Image style={styles.tick} source={IMAGES.check} />
                  </View>
                )}
              </TouchableOpacity>
              <Text style={styles.sendTxt}> {t('Send notification')} </Text>
            </View>

            {error?.isImages && (
              <Text style={[styles.errorMsg, { marginBottom: -25, marginTop: 10 }]}>
                Add at least one photo.
              </Text>
            )}

            {/* DYNAMIC PHOTO SLOTS (3 or 4) */}
            <View
              style={{
                marginTop: isIPad ? 30 : 20,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-evenly',
                width: '100%',
                paddingHorizontal: 10,
              }}>
              {photoSlots.map(key => {
                const dummyImg = imagesObj[`image${key}dummy`];
                return (
                  <View
                    key={key}
                    style={[
                      styles.imagecontainer,
                      isHospitality && !isIPad ? styles.imageContainerCompact : undefined,
                    ]}>
                    <TouchableOpacity
                      onPress={() => (isOnline ? selectMedia(key) : offlineselectMedia(key))}>
                      {imageLoading === key ? (
                        <ActivityIndicator
                          style={styles.imgGrey}
                          size={'small'}
                          color={'#223890'}
                        />
                      ) : (
                        <Image
                          resizeMode={'stretch'}
                          style={dummyImg ? styles.imgGrey : styles.imagereal}
                          source={dummyImg ? { uri: dummyImg } : IMAGES.camera}
                        />
                      )}
                    </TouchableOpacity>
                    {dummyImg ? (
                      <TouchableOpacity
                        onPress={() => onDeleteImg(key)}
                        style={{ alignSelf: 'center', marginTop: 8 }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Image
                          style={{ height: isIPad ? 20 : 12, width: isIPad ? 20 : 12 }}
                          source={IMAGES.delete}
                        />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.addView}
                        onPress={() => (isOnline ? selectMedia(key) : offlineselectMedia(key))}>
                        <Text
                          style={[
                            styles.addTxt,
                            isHospitality && !isIPad ? { fontSize: 11 } : undefined,
                          ]}>
                          {t('Add Photo')}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          </KeyboardScroll>
        </View>
      </View>

      <Text style={styles.topTitle}>{t('Payment Completed')}</Text>
      <Text style={styles.congrats}>
        {`${t('$')}${Math.max(
          isCredit
            ? Number(selectAmount ?? 0)
            : Number(amountState?.paidAmount ?? 0) - Number(amountState?.totalPayableAmount) > 0
              ? Number(amountState?.totalPayableAmount)
              : Number(amountState?.paidAmount ?? 0),
          0,
        ).toFixed(2)}`}
      </Text>

      {isSign ? (
        <View style={styles.signatureView}>
          <Image source={{ uri: signImg }} style={styles.signatureImage} />
          <TouchableOpacity
            style={{ position: 'absolute', right: 20 }}
            onPress={() => setIsSign(false)}>
            <Image source={IMAGES.delete} style={{ height: isIPad ? 30 : 15, width: isIPad ? 30 : 15 }} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          onPress={() => setVisible(true)}
          style={{
            height: isIPad ? 80 : 50,
            width: isIPad ? 200 : 150,
            alignSelf: 'center',
            marginTop: isIPad ? 50 : 30,
            borderRadius: 20,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <LinearGradient
            colors={['#1C2C5B', '#1F3C73', '#2B5DAA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.singTxt}>{t('Add Signature')}</Text>
        </TouchableOpacity>
      )}

      <View style={styles.bottmView}>
        <LinearGradient
          colors={['#1C2C5B', '#1F3C73', '#2B5DAA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            StyleSheet.absoluteFill,
            {
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
            },
          ]}
        />

        <TouchableOpacity
          style={styles.btnView}
          onPress={() => onSubmit()}
          disabled={apiLoading}>
          <Text style={styles.txch}>
            {apiLoading ? t('Processing') : t('Checkout')}
          </Text>
        </TouchableOpacity>
      </View>

      <ShipListModal
        visible={statusModalVisible}
        onClose={() => setStatusModalVisible(false)}
        activeTab={'CheckoutStatus'}
        getValue={(val: any) => setStatus(val)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  mainView: {
    flex: 1,
    backgroundColor: 'white',
    paddingTop: isIPad ? 50 : 30,
  },
  roView: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginHorizontal: 30,
  },
  unSelBox: {
    height: isIPad ? 26 : 22,
    width: isIPad ? 26 : 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#989898',
  },
  signatureView: {
    height: isIPad ? 250 : 130,
    width: '70%',
    marginHorizontal: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D8D8D8',
    marginTop: 20,
    borderStyle: 'dashed',
    alignSelf: 'center',
  },
  selBox: {
    height: isIPad ? 20 : 22,
    width: isIPad ? 20 : 22,
    borderRadius: 4,
    backgroundColor: '#223890',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendTxt: {
    fontSize: isIPad ? 20 : 16,
    fontFamily: FONTS.RICORDORegular,
    color: 'black',
    marginLeft: 5,
  },
  tick: {
    height: 9,
    width: 13,
    tintColor: 'white',
  },
  singTxt: {
    fontSize: isIPad ? 24 : 14,
    fontFamily: FONTS.RICORDORegular,
    color: 'white',
    textAlign: 'center',
  },
  bottmView: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 100,
    justifyContent: 'center',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  btnView: {
    height: 60,
    backgroundColor: '#FDBE6F',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 36,
  },
  txch: {
    fontSize: isIPad ? 26 : 18,
    fontFamily: FONTS.RICORDOSemiBold,
    color: 'white',
  },
  signatureImage: {
    width: isIPad ? 400 : 170,
    height: isIPad ? 200 : 100,
    resizeMode: 'stretch',
  },
  blueView: {
    marginHorizontal: 5,
    backgroundColor: '#EFF9FF',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginTop: 15,
    flex: 1,
  },
  shipNem: {
    fontFamily: FONTS.RICORDOSemiBold,
    fontSize: isIPad ? 25 : 16,
    color: '#002B45',
    marginLeft: 16,
  },
  packageView: {
    padding: 14,
    backgroundColor: 'white',
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: isIPad ? 20 : 10,
  },
  tagTxt: {
    fontSize: isIPad ? 23 : 16,
    fontFamily: FONTS.RICORDOSemiBold,
    color: 'black',
  },
  bluTxt: {
    fontSize: isIPad ? 21 : 14,
    fontFamily: FONTS.RICORDOSemiBold,
    color: '#223890',
    marginTop: isIPad ? 10 : 0,
  },
  numTxt: {
    fontSize: isIPad ? 21 : 14,
    fontFamily: FONTS.RICORDORegular,
    color: 'black',
  },
  imgGrey: {
    height: isIPad ? 100 : 45,
    width: isIPad ? 100 : 45,
  },
  imagereal: {
    height: isIPad ? 60 : 30,
    width: isIPad ? 60 : 32,
  },
  addView: {
    height: 32,
  },
  addTxt: {
    fontSize: isIPad ? 16 : 13,
    fontFamily: FONTS.RICORDORegular,
    color: '#223890',
    textAlign: 'center',
    marginTop: 6,
  },
  imagecontainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: isIPad ? 120 : 96,
    height: isIPad ? 130 : 85,
    borderWidth: 1.5,
    borderColor: 'lightgrey',
    borderStyle: 'dotted',
    borderRadius: 8,
  },
  imageContainerCompact: {
    width: 75,
    height: 80,
  },
  topTitle: {
    fontSize: isIPad ? 30 : 18,
    fontFamily: FONTS.RICORDOSemiBold,
    color: '#FDBE6F',
    textAlign: 'center',
    marginTop: isIPad ? 20 : 10,
  },
  congrats: {
    fontSize: isIPad ? 35 : 22,
    fontFamily: FONTS.RICORDORegular,
    color: '#002B45',
    textAlign: 'center',
    marginTop: 10,
  },
  inputStyle: {
    borderWidth: 0.8,
    borderColor: '#FDBE6F',
    borderBottomWidth: 0.8,
    borderBottomColor: '#FDBE6F',
    padding: 12,
    borderRadius: 6,
    backgroundColor: '#FDBE6F',
  },
  invalidInputStyle: {
    borderWidth: 0,
    borderColor: 'transparent',
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
    padding: 0,
    borderRadius: 0,
  },
  displayView: {
    paddingVertical: 10,
    marginHorizontal: 30,
  },
  label: {
    fontSize: 14,
    color: '#223890',
    fontFamily: 'Poppins-Regular',
  },
  masked: {
    fontSize: 16,
    color: '#000',
    fontFamily: 'Poppins-Regular',
    marginTop: 4,
  },
  nomailmasked: {
    borderWidth: 0.8,
    borderColor: '#FDBE6F',
    borderBottomWidth: 0.8,
    borderBottomColor: '#FDBE6F',
    padding: 12,
    borderRadius: 6,
    backgroundColor: '#FDBE6F',
  },
  nomailtext: {
    fontSize: isIPad ? 24 : 16,
    color: 'white',
  },
  errorMsg: {
    color: 'red',
    marginHorizontal: 30,
    fontSize: 14,
  },
});

export { CheckoutData };