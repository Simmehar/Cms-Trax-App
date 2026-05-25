import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
  DeviceEventEmitter,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { BackHeader } from '../components/Header';
import { Input } from '../components/Input';
import { FONTS, IMAGES } from '../assets';
import { SignatureModal } from '../components/SignatureModal';
import { SuccessModal } from '../components/SuccessModal';
import { DuePaymentModal } from '../components/DuePaymentModal';
import { InputPicker } from '../components/InputPicker';
import { KeyboardScroll } from '../components/KeyboardScroll';
import { isIPad } from '../utilities/securestorage';
import { ShipListModal } from '../components/ShipListModal';
import { PackageType } from '../components/PackageList';
import {
  bulkPackageLogout,
  cashReceivedDetails,
  customerListApiUpdate,
  sendEmail,
  uploadImg,
  deleteImg
} from '../utilities/ApiCalls';
import { useAuth } from '../contexts';
import { Package, PackageImage, User } from '../db/db.crud';
import CustomerList from '../db/dbcrud/dbcustomerList.crud';
import checkoutUserData from '../db/dbcrud/dbCheckout.crud';
import { useMode } from '../db/db.context';
import { open } from '../components/CameraController';
import deletedPackage from '../db/dbcrud/dbDeletepackage.curd';
import { MaskedInput } from '../components/Maskedmail';
import { getCustomerList } from '../util/apiCalls';
import LinearGradient from 'react-native-linear-gradient';

const CheckoutData: React.FC = ({ navigation, route }: any) => {
  const { user } = useAuth();
  const { isOnline, initializeDatabase } = useMode();

  const [isNotify, setIsNotify] = useState(true);
  const [visible, setVisible] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [isSign, setIsSign] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [signImg, setSignImg] = useState(null);

  const onSave = (signatureData: any) => {
    // __DEV__ && console.log('signatureData :>> ', signatureData);
    setVisible(!visible);
    setIsSign(true);
    setSignImg(signatureData);
  };

  const { amountState, packages, customerData, discount, isCredit, selectAmount } = route.params;
  // __DEV__ && console.log('isCredit', isCredit)
  // __DEV__ && console.log('amountamountStateState', amountState)
  // __DEV__ && console.log('selectAmount', selectAmount)

  // __DEV__ && console.log('discount', discount);
  const [imagesObj, setImagesObj] = useState({
    image1: '',
    image2: '',
    image3: '',
    image1dummy: '',
    image2dummy: '',
    image3dummy: '',
  });
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [status, setStatus] = useState<PackageType | any>({
    id: 10050,
    name: 'Picked up by recipient',
  });
  const maskEmail = (email) => {
    if (!email || !email.includes('@')) return email;

    const [user, domain] = email.split('@');
    const visibleUser = user.slice(0, 3);
    const maskedPart = '*'.repeat(Math.max(3, user.length - 3));
    return `${visibleUser}${maskedPart}@${domain}`;
  };
  const [email, setEmail] = useState(
    customerData?.[0]?.email,
  );


  __DEV__ && console.log('email,maskedemail', email)
  const [notes, setNotes] = useState('');

  // __DEV__ && console.log('email,notes', email, notes);

  const [apiLoading, setApiLoading] = useState(false);

  /**
   *
   * @returns This function is for when we make checkout request online
   */
  const CheckoutHandlerOnline = async () => {
    setApiLoading(true);

    try {
      const packagesId = packages.map(val => val.id);

      const imgData = new FormData();
      signImg &&
        imgData.append('signature', {
          name: 'image',
          type: 'image/jpeg',
          uri: signImg,
        });
      imgData.append('ids', packagesId);
      imgData.append('current_status', status?.id);
      imgData.append('notes', notes);
      imgData.append('notification', isNotify);
      const validImages = [
        imagesObj?.image1,
        imagesObj?.image2,
        imagesObj?.image3,
      ].filter(image => image);
      if (validImages.length > 0) {
        imgData.append('images', validImages);
      }

      const logoutResponse = await bulkPackageLogout(user, imgData);
      if (logoutResponse == '400') {
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

      // Credit covers all: send totalDebt so backend adds then immediately deducts from wallet
      // Credit doesn't cover: use previous cash logic
      const creditCoversAll = credit >= totalDebt && paidAmount === 0 && totalDebt > 0;

      const totalAmount = Math.max(
        isCredit
          ? Number(selectAmount ?? 0)
          : creditCoversAll
            ? 0   // ✅ send $0 — backend just deducts $24 from existing $456 → $432
            : paidAmount > 0
              ? (paidAmount - totalPayableAmount > 0 ? totalPayableAmount : paidAmount)
              : totalDebt,
        0
      );
      const payment = {
        amount: totalAmount,
        user_id: packages[0].user.id,
        payment_method: amountState.payment_method, // keep as-is, no credit type exists
        direct_discount: discount,
      };

      const hasPendingPackages = totalDebt > 0;
      const hasCashPayment = paidAmount > 0;

      if (hasCashPayment || hasPendingPackages) {
        const paymentDetailsRes = await cashReceivedDetails(user, payment);
        __DEV__ && console.log('paymentDetailsRes', paymentDetailsRes);
      }

      if (email) {
        const userList = { ...customerData };
        userList[0].email = email;
        await customerListApiUpdate(user, userList[0].id, { email: email });
      }

      const { id } = status;
      let filterIds = packagesId;
      if (id == 10050 || id == 10060) {
        filterIds = [logoutResponse.data[0].package_id];
      }

      const mailData = { ids: filterIds, package_status: id };
      if (isNotify) {
        const emailRes = await sendEmail(user, mailData);
        __DEV__ && console.log('emailRes', emailRes);
      }

      setApiLoading(false);
      setSuccessVisible(true);
      DeviceEventEmitter.emit('refetchPackages');

    } catch (err) {
      __DEV__ && console.log('err', err);
      setApiLoading(false);
      Alert.alert('Please try again');
    }
  };
  const CheckoutHandlerOffline = async () => {
    setApiLoading(true);

    try {
      const packagesId = packages.map(val => val.id);

      for (const packageId of packagesId) {
        const existingPackage = await Package.getPackageById(packageId);
        const existingPackageImage =
          await PackageImage.getPackageImagesByPackageId(packageId);
        __DEV__ && console.log('existingPackageImage', existingPackageImage)
        __DEV__ && console.log('existingPackage', existingPackage)
        if (existingPackage) {
          const safeValue = value => (value === undefined || value === null ? '' : value);
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
            local_url: existingPackageImage?.map(img => img.local_url).join(', ') || ''
          };
          __DEV__ && console.log('packageData', packageData)

          try {
            await deletedPackage.saveDeletedPackage(packageData);
            __DEV__ && console.log('Deleted package saved successfully:', packageData);
          } catch (error) {
            console.error('Error saving deleted package:', error);
          }
        }
      }

      // const totalAmount = Math.max(
      //   isCredit
      //     ? Number(selectAmount ?? 0) // Use `selectAmount` when isCredit is true
      //     : Number(amountState?.paidAmount ?? 0),
      //   0
      // );

      const totalAmount = Math.max(
        isCredit
          ? Number(selectAmount ?? 0) // Use `selectAmount` when isCredit is true
          : (
            Number(amountState?.paidAmount ?? 0) - Number(amountState?.totalPayableAmount) > 0
              ? Number(amountState?.totalPayableAmount) // If paidAmount is greater than totalPayableAmount, use totalPayableAmount
              : Number(amountState?.paidAmount ?? 0) // Otherwise, use paidAmount
          ),
        0
      );



      const recordData = {
        sign: signImg || null, // Ensure signImg is not undefined
        packagesId: JSON.stringify(packagesId) || "[]",
        selectedStatus: status?.id?.toString() || "0",
        notes: notes || "",
        notification: isNotify ? 1 : 0, // Convert boolean to integer
        totalAmount: isNaN(totalAmount) ? 0 : totalAmount, // Default to 0 if NaN
        cashReceived: isNaN(Number(amountState.paidAmount)) ? 0 : Number(amountState.paidAmount),
        user_id: packages[0]?.user?.id || 0,
        Synced: false,
        payment_method: amountState.payment_method || "",
        direct_discount: isNaN(Number(discount)) ? 0 : Number(discount),
        imageOne: imagesObj?.image1 || '',
        imageTwo: imagesObj?.image2 || '',
        imageThree: imagesObj?.image3 || '',
        email: email || '',
      };
      // __DEV__ && console.log('recordData :>> ', recordData);


      // Perform database operations
      User.updateUserPayableAmountById(
        packages[0].user.id,
        Number(amountState.paidAmount),
      );
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


  // const CheckoutHandlerOffline = async () => {
  //   setApiLoading(true);

  //   try {
  //     const packagesId = packages.map(val => val.id);

  //     const packageDataArray = await Promise.all(
  //       packagesId.map(async (packageId) => {
  //         const [existingPackage, existingPackageImage] = await Promise.all([
  //           Package.getPackageById(packageId),
  //           PackageImage.getPackageImagesByPackageId(packageId),
  //         ]);

  //         if (!existingPackage) return null;

  //         const safeValue = (value) => (value === undefined || value === null ? '' : value);

  //         return {
  //           id: existingPackage.id,
  //           tracking_no: safeValue(existingPackage.tracking_no),
  //           carrier: safeValue(existingPackage.carrier),
  //           tag_number: safeValue(existingPackage.tag_number),
  //           shelf: safeValue(existingPackage.shelf),
  //           condition: safeValue(existingPackage.condition),
  //           current_status: safeValue(existingPackage.current_status),
  //           is_paid: existingPackage.is_paid ? 1 : 0,
  //           port: safeValue(existingPackage.port),
  //           ship_id: existingPackage.ship_id,
  //           user_id: existingPackage.user_id,
  //           packageType: safeValue(existingPackage.packageType),
  //           custom_message: safeValue(existingPackage.custom_message),
  //           logInBy: safeValue(existingPackage.logInBy),
  //           Logout: new Date().toISOString(),
  //           local_url: existingPackageImage?.map(img => img.local_url).join(', ') || '',
  //         };
  //       })
  //     );

  //     await Promise.all(
  //       packageDataArray.filter(Boolean).map(pkg =>
  //         deletedPackage.saveDeletedPackage(pkg)
  //       )
  //     );

  //     const totalAmount = Math.max(
  //       isCredit
  //         ? Number(selectAmount ?? 0)
  //         : (
  //           Number(amountState?.paidAmount ?? 0) - Number(amountState?.totalPayableAmount) > 0
  //             ? Number(amountState?.totalPayableAmount)
  //             : Number(amountState?.paidAmount ?? 0)
  //         ),
  //       0
  //     );

  //     const recordData = {
  //       sign: signImg || null,
  //       packagesId: JSON.stringify(packagesId) || "[]",
  //       selectedStatus: status?.id?.toString() || "0",
  //       notes: notes || "",
  //       notification: isNotify ? 1 : 0,
  //       totalAmount: isNaN(totalAmount) ? 0 : totalAmount,
  //       cashReceived: isNaN(Number(amountState.paidAmount)) ? 0 : Number(amountState.paidAmount),
  //       user_id: packages[0]?.user?.id || 0,
  //       Synced: false,
  //       payment_method: amountState.payment_method || "",
  //       direct_discount: isNaN(Number(discount)) ? 0 : Number(discount),
  //       imageOne: imagesObj?.image1 || '',
  //       imageTwo: imagesObj?.image2 || '',
  //       imageThree: imagesObj?.image3 || '',
  //       email: email || '',
  //     };

  //     // Update DB and delete packages
  //     User.updateUserPayableAmountById(
  //       packages[0].user.id,
  //       Number(amountState.paidAmount),
  //     );
  //     await checkoutUserData.saveRecord(recordData);
  //     await CustomerList.updateCustomerPayable(
  //       packages[0].user.id,
  //       Number(amountState.paidAmount),
  //     );
  //     await Package.deletePackages(packagesId);

  //     await initializeDatabase();

  //     setApiLoading(false);
  //     setSuccessVisible(true);
  //     DeviceEventEmitter.emit('refetchPackages');

  //   } catch (error) {
  //     console.error('Error saving data:', error);
  //     setApiLoading(false);
  //     setSuccessVisible(true);
  //   }
  // };



  const onSubmit = async () => {
    if (isOnline) {
      await CheckoutHandlerOnline();
    } else {
      await CheckoutHandlerOffline();
    }
  };

  // useEffect(() => {
  //   // onSubmit();
  // }, []);

  const [data, setData] = useState(packages || []);

  const [error, setError] = useState({
    isTrackingId: false,
    isStatus: false,
    isType: false,
    isCondition: false,
    isImages: false,
  });

  const [imageLoading, setImageLoading] = useState(0);
  // __DEV__ && console.log('imagesObj :>> ', imagesObj);
  const selectMedia = async (key: number) => {
    open(async (response: any) => {
      // __DEV__ && console.log('Responsee==>', response);

      // key == 1
      //   ? setImagesObj({...imagesObj, image1: response.path})
      //   : key == 2
      //   ? setImagesObj({...imagesObj, image2: response.path})
      //   : key == 3
      //   ? setImagesObj({...imagesObj, image3: response.path})
      //   : '';

      if (response.path) {
        let imgData = new FormData();
        imgData.append('image', {
          name: 'image',
          type: 'image/jpeg',
          uri: response.path,
        });

        setImageLoading(key);
        const imgRes = await uploadImg(user, imgData);
        setImageLoading(0);
        // __DEV__ && console.log('image ress==', imgRes);
        setError({ ...error, isImages: false });
        key == 1
          ? // ? setImagesObj({...imagesObj, image1: imgRes?.image_url})
          setImagesObj(prev => {
            return {
              ...prev,
              image1dummy: response.path,
              image1: imgRes?.image_url,
            };
          })
          : key == 2
            ? setImagesObj(prev => {
              return {
                ...prev,
                image2dummy: response.path,
                image2: imgRes?.image_url,
              };
            })
            : key == 3
              ? setImagesObj(prev => {
                return {
                  ...prev,
                  image3dummy: response.path,
                  image3: imgRes?.image_url,
                };
              })
              : '';
        // setIsUserImg(response.path);
      }
    });
  };

  const offlineselectMedia = async (key: number) => {
    open(async (response: any) => {
      // __DEV__ && console.log('Responseeofflineeeeeeeeeeeee==>', response);

      // key == 1
      //   ? setImagesObj({...imagesObj, image1: response.path})
      //   : key == 2
      //   ? setImagesObj({...imagesObj, image2: response.path})
      //   : key == 3
      //   ? setImagesObj({...imagesObj, image3: response.path})
      //   : '';

      if (response.path) {
        // let imgData = new FormData();
        // imgData.append('image', {
        //   name: 'image',
        //   type: 'image/jpeg',
        //   uri: response.path,
        // });

        setImageLoading(key);
        // const imgRes = await uploadImg(user, imgData);
        setImageLoading(0);
        // __DEV__ && console.log('image ress==', imgRes);
        setError({ ...error, isImages: false });
        key == 1
          ? // ? setImagesObj({...imagesObj, image1: imgRes?.image_url})
          setImagesObj(prev => {
            return {
              ...prev,
              image1dummy: response.path,
              image1: response.path,
            };
          })
          : key == 2
            ? setImagesObj(prev => {
              return {
                ...prev,
                image2dummy: response.path,
                image2: response.path,
              };
            })
            : key == 3
              ? setImagesObj(prev => {
                return {
                  ...prev,
                  image3dummy: response.path,
                  image3: response.path,
                };
              })
              : '';
        // setIsUserImg(response.path);
      }
    });
  };
  const onDeleteImg = async (img: string) => {
    let data = { image_name: img };
    const deleteRes = await deleteImg(user, data);
    // __DEV__ && console.log('deleteResdeleteRes', deleteRes);
  };

  return (
    <View style={styles.mainView}>
      <BackHeader title="Checkout" />

      <SignatureModal
        visible={visible}
        onClose={() => setVisible(!visible)}
        onSave={onSave}
      />

      {successVisible ? (
        <SuccessModal
          visible={successVisible}
          content={{
            heading: 'SUCCESS!',
            middle: '',
            lable: 'Your checkout was successful.',
          }}
          onClose={() => setSuccessVisible(!successVisible)}
          isOnline={isOnline}
        />
      ) : (
        <></>
      )}

      <View style={{ flexDirection: 'row', height: '45%', width: '100%', marginTop: isIPad ? 20 : 0 }}>
        {isIPad && <View style={[styles.blueView, { flex: 1, height: '100%', width: '45%' }]}>
          <Text style={styles.shipNem}> {data[0].user.first_name + ' ' + data[0].user.last_name}</Text>
          <FlatList
            data={data}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => {
              return (
                <TouchableOpacity
                  key={index}
                  style={styles.packageView}
                  onPress={() => { }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tagTxt}>Tag# {item.tag_number}</Text>
                    <Text style={styles.bluTxt}>
                      Tracking ID:{' '}
                      <Text style={styles.numTxt}>{item.tracking_no}</Text>{' '}
                    </Text>
                  </View>
                  {/* <Image style={styles.delete} source={IMAGES.delete} /> */}
                </TouchableOpacity>
              );
            }}
          />
        </View>}
        <View style={{ width: isIPad ? '50%' : '100%' }}>
          <KeyboardScroll contentContainerStyle={{}}>
            {/* <InputPicker
          isPicker={false}
          isQrCode={false}
          placeholder={'Status*'}
          style={{}}
          onPickerClick={() => {}}
          pickerValue={''}
        /> */}

            <InputPicker
              isPicker={true}
              isQrCode={false}
              placeholder={'Status'}
              style={{}}
              onPickerClick={() => {
                setStatusModalVisible(true);
              }}
              pickerValue={status?.name}
            // onChangeText={() => {}}
            />

            <View>
              {!showInput ? (
                <TouchableOpacity
                  onPress={() => setShowInput(true)}
                  style={styles.displayView}
                >
                  {email == null || email == '' ?
                    <View style={styles.nomailmasked}>
                      <Text style={styles.nomailtext}>Email</Text></View> : <View><Text style={styles.label}>Email</Text>
                      <Text style={styles.masked}>{maskEmail(email)}</Text></View>}
                </TouchableOpacity>
              ) : (
                <MaskedInput
                  pickerValue={email}
                  placeholder="Email"
                  onChangeText={(text) => { setEmail(text) }}
                  editable={true}
                  placeholderTextColor="white"
                  style={email && email !== null && email !== '' ? styles.invalidInputStyle : styles.inputStyle}
                  onBlur={() => setShowInput(false)}
                />
              )}
            </View>

            {(!email || email == null) &&
              <Text
                style={{ color: 'red', marginHorizontal: 30, fontSize: 16, fontWeight: 'bold' }}>
                Please add email address
              </Text>
            }

            <InputPicker
              isPicker={false}
              isQrCode={false}
              placeholder={'Notes'}
              style={{}}
              // onPickerClick={setNotes}
              onChangeText={setNotes}
              editable={true}
            />
            <View style={[styles.roView, { marginTop: isIPad ? 10 : 10 }]}>
              <TouchableOpacity onPress={() => setIsNotify(!isNotify)}>
                {!isNotify ? (
                  <View style={styles.unSelBox}></View>
                ) : (
                  <View style={styles.selBox}>
                    <Image style={styles.tick} source={IMAGES.check} />
                  </View>
                )}
              </TouchableOpacity>
              <Text style={styles.sendTxt}>Send notification</Text>
            </View>

            {error?.isImages ? (
              <Text
                style={[styles.errorMsg, { marginBottom: -25, marginTop: 10 }]}>
                Add at least one photo.
              </Text>
            ) : (
              <></>
            )}

            <View
              // showsHorizontalScrollIndicator={false}
              // horizontal
              style={{
                marginTop: isIPad ? 30 : 20,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-evenly',
                width: '98%'
              }}>
              <View style={styles.imagecontainer}>
                <TouchableOpacity onPress={() => isOnline ? selectMedia(1) : offlineselectMedia(1)}>
                  {imageLoading == 1 ? (
                    <ActivityIndicator
                      style={styles.imgGrey}
                      size={'small'}
                      color={'#223890'}
                    />
                  ) : (
                    <Image
                      // tintColor={'#989898'}
                      resizeMode={'stretch'}
                      style={imagesObj.image1dummy ? styles.imgGrey : styles.imagereal}
                      source={
                        imagesObj.image1dummy
                          ? { uri: imagesObj.image1dummy }
                          : IMAGES.camera
                      }
                    />
                  )}
                </TouchableOpacity>
                {imagesObj.image1dummy ? (
                  <TouchableOpacity
                    onPress={() => {
                      onDeleteImg(imagesObj?.image1);
                      setImagesObj({
                        ...imagesObj,
                        image1: '',
                        image1dummy: '',
                      });
                    }}
                    style={{ alignSelf: 'center', marginTop: 10 }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Image
                      style={{ height: isIPad ? 20 : 10, width: isIPad ? 20 : 10 }}
                      source={IMAGES.delete}
                    />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.addView}
                    onPress={() => {
                      isOnline ? selectMedia(1) : offlineselectMedia(1);
                    }}>
                    <Text style={styles.addTxt}>Add Photo</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.imagecontainer}>
                <TouchableOpacity onPress={() => isOnline ? selectMedia(2) : offlineselectMedia(2)}>
                  {imageLoading == 2 ? (
                    <ActivityIndicator
                      style={styles.imgGrey}
                      size={'small'}
                      color={'#223890'}
                    />
                  ) : (
                    <Image
                      // tintColor={'#989898'}
                      resizeMode={'stretch'}
                      style={imagesObj.image2dummy ? styles.imgGrey : styles.imagereal}
                      source={
                        imagesObj.image2dummy
                          ? { uri: imagesObj.image2dummy }
                          : IMAGES.camera
                      }
                    />
                  )}
                </TouchableOpacity>
                {imagesObj.image2dummy ? (
                  <TouchableOpacity
                    onPress={() => {
                      onDeleteImg(imagesObj?.image2);
                      setImagesObj({
                        ...imagesObj,
                        image2: '',
                        image2dummy: '',
                      });
                    }}
                    style={{ alignSelf: 'center', marginTop: 10 }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Image
                      style={{ height: isIPad ? 20 : 10, width: isIPad ? 20 : 10 }}
                      source={IMAGES.delete}
                    />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.addView}
                    onPress={() => {
                      isOnline ? selectMedia(2) : offlineselectMedia(2)
                    }}>
                    <Text style={styles.addTxt}>Add Photo</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.imagecontainer}>
                <TouchableOpacity onPress={() => isOnline ? selectMedia(3) : offlineselectMedia(3)}>
                  {imageLoading == 3 ? (
                    <ActivityIndicator
                      style={styles.imgGrey}
                      size={'small'}
                      color={'#223890'}
                    />
                  ) : (
                    <Image
                      // tintColor={'#989898'}
                      resizeMode={'stretch'}
                      style={imagesObj.image3dummy ? styles.imgGrey : styles.imagereal}
                      source={
                        imagesObj.image3dummy
                          ? { uri: imagesObj.image3dummy }
                          : IMAGES.camera
                      }
                    />
                  )}
                </TouchableOpacity>
                {imagesObj.image3dummy ? (
                  <TouchableOpacity
                    onPress={() => {
                      onDeleteImg(imagesObj?.image3);
                      setImagesObj({
                        ...imagesObj,
                        image3: '',
                        image3dummy: '',
                      });
                    }}
                    style={{ alignSelf: 'center', marginTop: 10 }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Image
                      style={{ height: isIPad ? 20 : 10, width: isIPad ? 20 : 10 }}
                      source={IMAGES.delete}
                    />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.addView}
                    onPress={() => {
                      isOnline ? selectMedia(3) : offlineselectMedia(3)
                    }}>
                    <Text style={styles.addTxt}>Add Photo</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

          </KeyboardScroll>
        </View>
      </View>
      <Text style={styles.topTitle}>Payment Completed</Text>
      <Text style={styles.congrats}>
        {`$${Math.max(
          isCredit ? Number(selectAmount ?? 0) : Number(amountState?.paidAmount ?? 0) - Number(amountState.totalPayableAmount) > 0
            ? Number(amountState.totalPayableAmount)
            : Number(amountState?.paidAmount ?? 0),
          0,
          0
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
            overflow: 'hidden', // Ensures the gradient follows the border radius
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <LinearGradient
            colors={['#1C2C5B', '#1F3C73', '#2B5DAA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.singTxt}>
            Add Signature
          </Text>
        </TouchableOpacity>
      )}
      <View style={styles.bottmView}>
        {/* Gradient background with rounded corners */}
        <LinearGradient
          colors={['#1C2C5B', '#1F3C73', '#2B5DAA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, {
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24
          }]}
        />

        <TouchableOpacity
          style={styles.btnView}
          onPress={() => {
            onSubmit();
          }}
          disabled={apiLoading}>
          <Text style={styles.txch}>
            {apiLoading ? 'Processing...' : 'Checkout'}
          </Text>
        </TouchableOpacity>
      </View>

      <ShipListModal
        visible={statusModalVisible}
        onClose={() => {
          setStatusModalVisible(false);
        }}
        activeTab={'CheckoutStatus'}
        getValue={(val) => {
          __DEV__ && console.log('vaaall==', val);
          setStatus(val);
        }}
      // setType={setType}
      // setInitialVals={{
      //   status,
      //   setStatus,
      // }}
      />
    </View>
  );
};
const styles = StyleSheet.create({
  mainView: {
    flex: 1,
    backgroundColor: 'white',
    paddingTop: isIPad ? 50 : 30
  },
  roView: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginHorizontal: 30,
  },
  input: {
    fontSize: 16,
    fontFamily: FONTS.PoppinsRegular,
    color: 'black',
    flex: 1,
  },
  lineView: {
    height: 1,
    backgroundColor: '#F4F4F4',
    marginVertical: 7,
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
    marginTop: isIPad ? 20 : 20,
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
    fontFamily: FONTS.PoppinsRegular,
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
    fontFamily: FONTS.PoppinsRegular,
    color: 'white',
    textAlign: 'center',
  },
  inputNote: {
    fontSize: 14,
    fontFamily: FONTS.PoppinsRegular,
    color: 'black',
    height: 72,
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
    fontFamily: FONTS.PoppinsSemiBold,
    color: 'white',
  },

  signaturePreview: {
    marginTop: 20,
    alignItems: 'center',
  },
  signatureImage: {
    width: isIPad ? 400 : 170,
    height: isIPad ? 200 : 100,
    resizeMode: 'stretch'
  },
  blueView: {
    marginHorizontal: 5,
    backgroundColor: '#EFF9FF',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginTop: 15,
    flex: 1,
    // height: height * 0.3,
  },
  shipNem: {
    fontFamily: FONTS.PoppinsSemiBold,
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
    fontFamily: FONTS.PoppinsSemiBold,
    color: 'black',
  },
  bluTxt: {
    fontSize: isIPad ? 21 : 14,
    fontFamily: FONTS.PoppinsMedium,
    color: '#223890',
    marginTop: isIPad ? 10 : '0%'
  },
  numTxt: {
    fontSize: isIPad ? 21 : 14,
    fontFamily: FONTS.PoppinsRegular,
    color: 'black',
  },
  imgSel: {
    height: 80,
    width: 80,
    borderRadius: 11,
  },
  imgGrey: {
    height: isIPad ? 100 : 50,
    width: isIPad ? 100 : 50,
  },
  imagereal: {
    height: isIPad ? 60 : 35,
    width: isIPad ? 60 : 40,
  },
  imgDel: {
    height: 21,
    width: 20,
    resizeMode: 'contain',
    marginTop: 10,
  },
  addView: {
    height: 32,
  },
  addTxt: {
    fontSize: isIPad ? 16 : 14,
    fontFamily: FONTS.PoppinsRegular,
    color: '#223890',
    textAlign: 'center',
    marginTop: 10,
  },
  imagecontainer: {
    alignItems: 'center', justifyContent: 'center', width: isIPad ? 120 : 100, height: isIPad ? 130 : 90, borderWidth: 2,
    borderColor: 'lightgrey',
    borderStyle: 'dotted',
  },
  topTitle: {
    fontSize: isIPad ? 30 : 18,
    fontFamily: FONTS.PoppinsSemiBold,
    color: '#FDBE6F',
    textAlign: 'center',
    marginTop: isIPad ? 20 : 10,
  },
  congrats: {
    fontSize: isIPad ? 35 : 22,
    fontFamily: FONTS.PoppinsRegular,
    color: '#002B45',
    textAlign: 'center',
    marginTop: isIPad ? 10 : 10,
  },
  inputStyle: {
    borderWidth: 0.8,
    borderColor: '#FDBE6F',
    borderBottomWidth: 0.8,
    borderBottomColor: '#FDBE6F',
    padding: 12,
    borderRadius: 6,
    backgroundColor: '#FDBE6F'
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
    backgroundColor: '#FDBE6F'
  },
  nomailtext: {
    fontSize: isIPad ? 24 : 16,
    color: 'white',
    // paddingBottom:  4
  }
});
export { CheckoutData };

