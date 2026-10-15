import React, { useEffect, useReducer, useState } from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { BackHeader } from '../components/Header';
import { FONTS, IMAGES } from '../assets';
import { CheckoutBottom } from '../components/CheckoutBottom';
import { useNavigation } from '@react-navigation/native';
import { PaymentModal } from '../components/PaymentModal';
import { DuePaymentModal } from '../components/DuePaymentModal';
import { SignatureModal } from '../components/SignatureModal';
import { DiscountModal } from '../components/DiscountModal';
import { CheckIpad, isIPad } from '../utilities/securestorage';
import { Package } from '../components/PackageList';
import { getCustomerList } from '../utilities/ApiCalls';
import { useAuth } from '../contexts';
import CustomerList from '../db/dbcrud/dbcustomerList.crud';
import { useMode } from '../db/db.context';
import axios from 'axios';
import { Backend_URL } from '../util/apiCalls';
import { GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { StripeProvider, useStripe } from '@stripe/stripe-react-native';

let isPad = CheckIpad();

function amountReducer(state, action) {
  return action;
}

// ==========================================
// 1. CHILD COMPONENT (useStripe Hook yahan chalega)
// ==========================================
const CheckoutContent: React.FC = ({ route }: any) => {
  const { arr, msg } = route.params;
  const { t } = useTranslation();
  const { isOnline, initializeDatabase } = useMode();

  const [data, setData] = useState(arr || []);
  const [isModalVisible, setModalVisible] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [isCredit, setIsCredit] = useState(false);
  const [visible, setVisible] = useState(false);
  const [disValue, setDisValue] = useState(0);
  const navigation = useNavigation<any>();

  const onAdDiscount = () => {
    setVisible(!visible);
  };

  const onSave = (val: number) => {
    setVisible(!visible);
    setDisValue(val);
  };

  const { user } = useAuth();
  const selectedUserId = arr;

  const [payableAmount, setPayableAmount] = useState(
    selectedUserId[0].user?.payable_amount,
  );

  const [amountState, dispatch] = useReducer(amountReducer, {
    totalPayableAmount: 0,
    payable_amount: 0,
    unpaid_packages: 0,
    other_purchases: 0,
    credit: 0,
    payment_method: '1',
  });

  const [customerData, setCustomerData] = useState<any>([]);

  const getCustomerData = async () => {
    const customerData = isOnline
      ? await getCustomerList(user, selectedUserId[0].user?.id)
      : await CustomerList.getCustomerById(selectedUserId[0].user?.id);

    if (isOnline) {
      var {
        payable_amount: {
          payable_amount,
          unpaid_packages,
          other_purchases,
          credit,
        },
      } = customerData[0];

      setCustomerData([...customerData]);
    } else {
      var { payable_amount, unpaid_packages, other_purchases, credit } =
        customerData;

      setCustomerData([customerData]);
    }

    dispatch({
      totalPayableAmount: Math.max(payable_amount, 0).toFixed(2),
      payable_amount: Math.max(payable_amount, 0).toFixed(2),
      unpaid_packages: Math.max(unpaid_packages, 0).toFixed(2),
      other_purchases: Math.max(other_purchases, 0).toFixed(2),
      credit: Math.max(credit, 0).toFixed(2),
    });
  };

  useEffect(() => {
    getCustomerData();
  }, []);
  
  const [payType, setPayType] = useState('cash');
  const [selectAllChecked, setSelectedAllChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPayType('cash');
  }, [visible]);

  const onTestPress = async () => {
    setLoading(true);

    await axios
      .post(
        `${Backend_URL}/payment-sheet/`,
        {
          amount: Number(selectAmount) * 100,
        },
        {
          headers: { Authorization: 'Bearer ' + user?.token },
        },
      )
      .then(res => {
        const paymentIntent = res?.data?.paymentIntent;
        setup(paymentIntent);
        setLoading(false);
      })
      .catch(err => {
        console.log('err', err);
        setLoading(false);
        Alert.alert(
          t('server_error'),
          t('please_try_again_later')
        );
      });
  };

  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const setup = async (paymentIntent: any) => {
    const { error } = await initPaymentSheet({
      merchantDisplayName: 'Example, Inc.',
      paymentIntentClientSecret: paymentIntent,
      returnURL: 'http://google.com',
    });
    if (error) {
      Alert.alert(t('payment_error'), t('please_try_again'));
      console.log('error', error);
    } else {
      checkout();
    }
  };

  const checkout = async () => {
    const { error } = await presentPaymentSheet();

    if (error) {
      console.log('presentPaymentSheet error', error);
    } else {
      if (selectAmount > 0) {
        setLoading(false);
        handleOnSubmit(payType, Number(selectAmount), '5');
      }
    }
  };

  const [popupVisible, setPopupVisible] = useState(false);
  const [selectAmount, setSelectAmount] = useState('');
  const [discountValue, setDiscountValues] = useState();

  const onPercentageChange = (val: any) => {
    const discount = (amountState?.payable_amount * Number(val)) / 100;
    if (discount && !isNaN(discount)) {
      setSelectAmount(String(discount));
    }
    let discountValueeee = (Number(disValue * 100) / amountState?.payable_amount).toFixed(0);
    setDiscountValues(discountValueeee);
  };

  useEffect(() => {
    onPercentageChange('0');
  }, []);

  useEffect(() => {
    if (msg && msg === true) {
      setPopupVisible(true);
    }
  }, [msg]);

  const [selectedDiscount, setSelectedDiscount] = useState(-1);

  const handleNumberPress = (number: any) => {
    setSelectAmount(selectAmount + number);
  };

  const handleDeletePress = () => {
    if (selectAmount.length > 0) {
      setSelectAmount(selectAmount.slice(0, -1));
    }
  };

  const NumberButton = ({ number, onPress }: any) => (
    <TouchableOpacity
      style={styles.numberButton}
      onPress={() => onPress(number.toString())}>
      <Text style={styles.numberText}>{number}</Text>
    </TouchableOpacity>
  );

  const renderPaymentView = () => {
    return (
      <View style={[styles.modalContent, { height: modalHeight }]}>
        <View style={{ height: '90%', borderBottomColor: 'lightgrey', borderBottomWidth: 1 }}>
          <View style={{ height: payType === 'cash' ? '85%' : 'auto' }}>
            <TouchableOpacity
              style={styles.cashView}
              onPress={() =>
                payType === 'cash' ? setPayType('') : setPayType('cash')
              }>
              <View style={styles.rowView}>
                <Image source={IMAGES.cash} style={styles.cashImg} />
                <Text style={styles.cashTxt}>{t('cash')}</Text>
              </View>
              <View style={[styles.radioButton, payType === 'cash' && styles.radioButtonSelected]}>
                {payType === 'cash' && <View style={styles.radioButtonInner} />}
              </View>
            </TouchableOpacity>
            {payType === 'cash' && (
              <>
                <View style={{ height: '30%' }}>
                  <View style={{ marginTop: '1%' }}>
                    <Text
                      style={{
                        color: '#db6363',
                        fontSize: isIPad ? 22 : 20,
                        textAlign: 'center',
                        fontFamily: 'OctoberCompressRegular',
                        fontWeight: '600',
                      }}>
                      {t('total_due')} {t('$')}
                      {Math.max(Number(amountState?.totalPayableAmount), 0).toFixed(2)}
                    </Text>
                  </View>
                  <View style={{ margin: 5, borderBottomWidth: 1, borderColor: 'lightgrey' }}>
                    <Text style={styles.pinDisplay}>{selectAmount || t('amount_received')}</Text>
                  </View>

                  {Number(selectAmount) > 0 &&
                    Number(selectAmount) < Number(amountState?.payable_amount) && (
                      <View style={{ marginLeft: 24, marginBottom: 10 }}>
                        <Text>
                          {t('balance_due')} {t('$')}
                          {Math.max(
                            Number((Number(amountState?.totalPayableAmount) - Number(selectAmount)).toFixed(2)),
                            0,
                          )}
                        </Text>
                      </View>
                    )}
                </View>

                <View style={{ alignItems: 'center', justifyContent: 'center', height: '55%' }}>
                  <View style={styles.numberPad}>
                    <View style={styles.row}>
                      {[1, 2, 3].map(num => (
                        <NumberButton key={num} number={num} onPress={handleNumberPress} />
                      ))}
                    </View>

                    <View style={styles.row}>
                      {[4, 5, 6].map(num => (
                        <NumberButton key={num} number={num} onPress={handleNumberPress} />
                      ))}
                    </View>

                    <View style={styles.row}>
                      {[7, 8, 9].map(num => (
                        <NumberButton key={num} number={num} onPress={handleNumberPress} />
                      ))}
                    </View>

                    <View style={styles.lastRow}>
                      <TouchableOpacity
                        style={styles.doubleButton}
                        onPress={() => setSelectAmount(selectAmount + '.')}>
                        <Text style={[styles.numberText]}>.</Text>
                      </TouchableOpacity>

                      <NumberButton number={0} onPress={handleNumberPress} />

                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={handleDeletePress}>
                        <Image
                          source={IMAGES.Back}
                          style={styles.deleteIcon}
                          tintColor={'grey'}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </>
            )}
          </View>

          {amountState?.totalPayableAmount >= 0 && !isOnline && payType === 'cash' && (
            <View style={{ height: '10%' }}>
              <TouchableOpacity
                style={[styles.cashView]}
                onPress={() => setSelectedAllChecked(!selectAllChecked)}>
                <View style={styles.rowView}>
                  {selectAllChecked ? (
                    <View style={isIPad ? styles.selectcheckboxI : styles.selectcheckbox}>
                      <Image source={IMAGES.check} style={isIPad ? styles.tickI : styles.tick} />
                    </View>
                  ) : (
                    <View style={isIPad ? styles.checkboxI : styles.checkbox} />
                  )}
                  <Image
                    source={IMAGES.card}
                    style={{ height: 46, width: 49, marginLeft: isIPad ? 35 : 15 }}
                  />
                  <Text style={[styles.cashTxt]}>{t('pos')}</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {amountState?.totalPayableAmount > 0 && isOnline && (
            <View style={{ height: '10%' }}>
              <TouchableOpacity
                style={styles.cashView}
                disabled={loading}
                onPress={() => {
                  if (Number(selectAmount) > 0) {
                    onTestPress();
                    setPayType('card');
                  } else {
                    Alert.alert(t('please_enter_some_amount'));
                  }
                }}>
                {loading ? (
                  <ActivityIndicator
                    color={'black'}
                    style={{ alignSelf: 'center', marginLeft: width * 0.35 }}
                    size={'large'}
                  />
                ) : (
                  <>
                    <View style={styles.rowView}>
                      <Image
                        source={IMAGES.card}
                        style={{ height: 50, width: 50, resizeMode: 'contain' }}
                      />
                      <Text style={[styles.cashTxt]}>{t('card')}</Text>
                    </View>
                    <View style={[styles.radioButton, payType === 'card' && styles.radioButtonSelected]}>
                      {payType === 'card' && <View style={styles.radioButtonInner} />}
                    </View>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
        <View style={{ height: '10%' }}>
          <TouchableOpacity
            style={[styles.cashView, { marginTop: 10, alignItems: 'center', justifyContent: 'center' }]}
            onPress={onAdDiscount}>
            <Text
              style={{
                fontSize: isIPad ? 23 : 20,
                fontFamily: FONTS.OpenSansMedium,
                color: '#223890',
                fontWeight: '700',
              }}>
              {disValue && disValue > 0
                ? `${t('discount')}: (${t('$')}${Number(disValue).toFixed(1)})`
                : t('add_discount')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const handleOnSubmit = (
    type: string,
    selectAmount: number,
    payment_method: string,
  ) => {
    dispatch({
      ...amountState,
      paidAmount: selectAmount,
      payment_method,
    });
    setModalVisible(false);
    setSuccessVisible(true);
  };

  const { height: screenHeight } = Dimensions.get('window');
  const bottomViewHeight = screenHeight * 0.4;
  const modalHeight = screenHeight - bottomViewHeight - 50;

  return (
    <View style={styles.mainView}>
      <GestureHandlerRootView>
        <View style={{ marginVertical: isPad ? 10 : 0, justifyContent: 'flex-end' }}>
          <BackHeader title={t('review')} />
          <View style={{ position: 'absolute', right: 25, alignSelf: 'center', bottom: 10 }}>
            {isOnline ? (
              <Image source={IMAGES.internet} style={styles.network} />
            ) : (
              <Image source={IMAGES.Nointernet} style={styles.networkI} />
            )}
          </View>
        </View>

        {isPad ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              flex: 1,
              marginHorizontal: 15,
              paddingBottom: 50,
            }}>
            <View style={[styles.blueView, { flex: 1, height: '95%' }]}>
              <Text style={styles.shipNem}>
                {data[0]?.user?.first_name + ' ' + data[0]?.user?.last_name}
              </Text>
              <FlatList
                data={data}
                showsVerticalScrollIndicator={false}
                ListFooterComponent={() => <View style={{ height: 60 }} />}
                renderItem={({ item, index }) => (
                  <TouchableOpacity key={index} style={styles.packageView}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tagTxt}>{t('tag')}# {item.tag_number}</Text>
                      <Text style={styles.bluTxt}>
                        {t('tracking_id')}: <Text style={styles.numTxt}>{item.tracking_no}</Text>
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            </View>
            {amountState?.totalPayableAmount > 0 && (
              <View style={{ flex: 1, height: '95%' }}>{renderPaymentView()}</View>
            )}
          </View>
        ) : (
          <View style={styles.blueView}>
            <Text style={styles.shipNem}>
              {data[0]?.user?.first_name + ' ' + data[0]?.user?.last_name}
            </Text>
            <FlatList
              data={data}
              showsVerticalScrollIndicator={false}
              ListFooterComponent={() => <View style={{ height: 90 }} />}
              renderItem={({ item, index }) => (
                <TouchableOpacity key={index} style={styles.packageView}>
                  <View style={{ flex: 1, flexDirection: 'column' }}>
                    <Text style={styles.tagTxt}>{t('Tag#')} {item.tag_number}</Text>
                    <Text style={styles.bluTxt}>
                      {t('Tracking ID')}: <Text style={styles.numTxt}>{item.tracking_no}</Text>
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        <DuePaymentModal
          visible={successVisible}
          onClose={() => setSuccessVisible(!successVisible)}
          setIsCredit={setIsCredit}
          isCredit={isCredit}
          onDone={() => {
            setSuccessVisible(!successVisible);
            navigation.navigate('CheckoutData', {
              amountState,
              packages: data,
              customerData,
              discount: disValue,
              isCredit: isCredit,
              selectAmount: amountState?.paidAmount,
            });
          }}
          amountState={amountState}
          dispatch={dispatch}
        />

        {!isPad && (
          <PaymentModal
            visible={isModalVisible}
            isIpad={false}
            onClose={() => setModalVisible(false)}
            onSubmit={handleOnSubmit}
            amountState={amountState}
            disValue={disValue || 0}
            isOnline={isOnline}
          />
        )}

        <View style={{ flex: isIPad ? 0.45 : 0.3 }}>
          <CheckoutBottom
            nextClick={() => {
              if (amountState?.totalPayableAmount <= 0) {
                const payment_method = selectAllChecked ? '4' : '1';
                dispatch({
                  ...amountState,
                  paidAmount: selectAmount,
                  payment_method,
                });
                navigation.navigate('CheckoutData', {
                  amountState,
                  packages: data,
                  customerData,
                  discount: disValue,
                  isCredit: isCredit,
                  selectAmount: selectAmount,
                });
              } else {
                if (isPad) {
                  if (selectAmount) {
                    handleOnSubmit(payType, Number(selectAmount), selectAllChecked ? '4' : '1');
                  } else {
                    Alert.alert(t('please_enter_some_amount'));
                  }
                } else {
                  setModalVisible(true);
                }
              }
            }}
            onAdDiscount={onAdDiscount}
            disValue={disValue}
            amountState={amountState}
            dispatch={dispatch}
            type={arr[0]?.package_type?.name}
          />
        </View>

        <DiscountModal
          visible={visible}
          onClose={() => setVisible(!visible)}
          onSave={onSave}
          payableAmount={amountState.payable_amount}
        />

        <Modal visible={popupVisible} transparent={true}>
          <View style={styles.modalContainer}>
            <View
              style={{
                backgroundColor: 'white',
                paddingBottom: '5%',
                paddingTop: '3%',
                width: '80%',
                borderRadius: 40,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: '5%',
              }}>
              <TouchableOpacity style={styles.crossView} onPress={() => setPopupVisible(false)}>
                <Image source={IMAGES.close} style={styles.closeImg} />
              </TouchableOpacity>
              <Text
                style={{
                  color: '#db6363',
                  fontSize: isIPad ? 30 : 20,
                  textAlign: 'center',
                  fontFamily: FONTS.RICORDOBold,
                  fontWeight: '600',
                }}>
                {t('warning')}
              </Text>
              <Text
                style={{
                  fontSize: isIPad ? 25 : 15,
                  marginTop: isIPad ? 30 : 20,
                  color: 'grey',
                  textAlign: 'center',
                  fontFamily: FONTS.RICORDORegular,
                }}>
                {t('packages_not_selected')}
              </Text>
            </View>
          </View>
        </Modal>
      </GestureHandlerRootView>
    </View>
  );
};

// ==========================================
// 2. MAIN EXPORT WRAPPER (Stripe Key Loader)
// ==========================================
const Checkout: React.FC = (props: any) => {
  const [stripeKey, setStripeKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
console.log('stripeKey========',stripeKey)
  useEffect(() => {
    loadStripeKey();
  }, []);

  const loadStripeKey = async () => {
    try {
      const key = await AsyncStorage.getItem('STRIPE_PUBLISHABLE_KEY');
      setStripeKey(key);
    } catch (e) {
      console.log('Error loading Stripe Key:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#223890" />
      </View>
    );
  }

  return (
    <StripeProvider
      publishableKey={stripeKey || 'pk_live_51T7IhYQesY9Hh8zgFg7vFERFzZPHIpn7gBEM4gn7vhs7TUZLc9lcmugiSh3j8gZCC4qmBBHSnPKj4hIQnkZ1daPU00nwHKEskU'}
      merchantIdentifier="merchant.identifier"
      urlScheme="your-url-scheme">
      <CheckoutContent {...props} />
    </StripeProvider>
  );
};

const { height, width } = Dimensions.get('screen');

const styles = StyleSheet.create({
  mainView: {
    flex: 1,
    backgroundColor: 'white',
    paddingTop: isPad ? 50 : 30,
  },
  blueView: {
    marginHorizontal: 5,
    backgroundColor: '#e3eff6',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginTop: 15,
    flex: 1,
  },
  shipNem: {
    fontFamily: FONTS.RICORDOSemiBold,
    fontSize: isPad ? 25 : 16,
    color: '#002B45',
    marginLeft: 16,
  },
  packageView: {
    padding: 14,
    backgroundColor: 'white',
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: isPad ? 20 : 10,
  },
  tagTxt: {
    fontSize: isPad ? 23 : 16,
    fontFamily: FONTS.RICORDOSemiBold,
    color: 'black',
  },
  bluTxt: {
    fontSize: isPad ? 21 : 14,
    fontFamily: FONTS.RICORDOSemiBold,
    color: '#223890',
    marginTop: isPad ? 10 : 0,
  },
  numTxt: {
    fontSize: isPad ? 21 : 14,
    fontFamily: FONTS.RICORDORegular,
    color: 'black',
  },
  delete: {
    height: isPad ? 35 : 17,
    width: isPad ? 35 : 14,
  },
  network: {
    height: isPad ? 38 : 20,
    width: isPad ? 38 : 20,
    tintColor: 'green',
  },
  networkI: {
    height: isPad ? 38 : 20,
    width: isPad ? 38 : 20,
    tintColor: '#c93a3a',
  },
  cashView: {
    marginHorizontal: 18,
    backgroundColor: '#F9F9F9',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: '1%',
    marginTop: 5,
  },
  rowView: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cashImg: {
    height: 50,
    width: 50,
    resizeMode: 'contain',
  },
  cashTxt: {
    fontSize: isIPad ? 23 : 18,
    fontFamily: FONTS.RICORDOSemiBold,
    color: 'black',
    marginLeft: 18,
  },
  arrow: {
    height: isIPad ? 20 : 12,
    width: isIPad ? 25 : 15,
    tintColor: 'white',
    transform: [{ rotate: '180deg' }],
  },
  rightView: {
    height: isIPad ? 50 : 48,
    width: isIPad ? 50 : 48,
    borderRadius: 30,
    backgroundColor: '#FDBE6F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  amountView: {
    height: 52,
    width: '20%',
    backgroundColor: '#223890',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
    marginRight: 5,
  },
  amountLView: {
    height: 52,
    width: '25%',
    borderColor: '#223890',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
    marginRight: 5,
    borderWidth: 1,
  },
  amountTxt: {
    fontFamily: FONTS.OpenSansMedium,
    color: 'white',
    fontSize: isIPad ? 25 : 20,
  },
  amountWTxt: {
    fontSize: isIPad ? 25 : 20,
    fontFamily: FONTS.OpenSansMedium,
    color: '#223890',
  },
  inputView: {
    marginHorizontal: 22,
  },
  input: {
    height: 50,
    fontSize: isIPad ? 25 : 20,
    fontFamily: FONTS.OpenSansMedium,
    color: 'black',
    textDecorationLine: 'underline',
  },
  lineView: {
    height: 1,
    backgroundColor: '#98989830',
    marginVertical: 10,
  },
  icon: {
    height: 21.5,
    width: 21.5,
  },
  subMitBtn: {
    height: 60,
    backgroundColor: '#FDBE6F',
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
    marginHorizontal: 16,
  },
  submitTxt: {
    fontSize: isIPad ? 25 : 18,
    fontFamily: FONTS.RICORDOSemiBold,
    color: 'white',
  },
  selectcheckbox: {
    width: 35,
    height: 35,
    backgroundColor: '#223890',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectcheckboxI: {
    width: 40,
    height: 40,
    backgroundColor: '#223890',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tick: {
    height: 13,
    width: 17,
    tintColor: 'white',
  },
  tickI: {
    height: 20,
    width: 24,
    tintColor: 'white',
  },
  checkbox: {
    width: 35,
    height: 35,
    borderWidth: 1,
    borderColor: '#D6D6D6',
    borderRadius: 4,
  },
  checkboxI: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: '#D6D6D6',
    borderRadius: 4,
  },
  pinDisplay: {
    fontSize: 28,
    marginVertical: 12,
    color: 'grey',
    alignSelf: 'flex-start',
  },
  numberPad: {
    width: '100%',
    maxWidth: '70%',
  },
  row: {
    marginBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  numberButton: {
    width: 57,
    height: 57,
    marginHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderRadius: 6,
    borderColor: 'lightgrey',
  },
  numberText: {
    color: 'grey',
    fontSize: isIPad ? 28 : 20,
    fontWeight: '700',
  },
  lastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  doubleButton: {
    width: 57,
    height: 57,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 57,
    height: 57,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIcon: {
    width: isIPad ? 35 : 24,
    height: isIPad ? 35 : 24,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  crossView: {
    height: isIPad ? 60 : 40,
    width: isIPad ? 60 : 40,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F4F4',
    alignSelf: 'flex-end',
  },
  closeImg: {
    height: isIPad ? 20 : 10,
    width: isIPad ? 20 : 10,
    tintColor: 'black',
  },
  container: {
    paddingVertical: isIPad ? 15 : 10,
  },
  selectBox: {
    height: isIPad ? 25 : 18,
    width: isIPad ? 25 : 18,
    borderRadius: 20,
    backgroundColor: '#34c35a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: isIPad ? 15 : 10,
    alignSelf: 'center',
  },
  unSelectBox: {
    height: isIPad ? 25 : 18,
    width: isIPad ? 25 : 18,
    borderRadius: 20,
    backgroundColor: '#db6363',
    marginRight: isIPad ? 15 : 10,
    alignSelf: 'center',
  },
  receivedText: {
    marginLeft: 8,
    fontSize: isIPad ? 22 : 15,
    color: '#223890',
    alignSelf: 'center',
  },
  name: {
    flex: 1,
    fontSize: isIPad ? 22 : 15,
    paddingRight: isIPad ? 60 : 20,
  },
  price: {
    color: '#666',
    fontSize: isIPad ? 22 : 15,
  },
  radioButton: {
    width: isIPad ? 34 : 24,
    height: isIPad ? 34 : 24,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#223890',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: '#223890',
  },
  radioButtonInner: {
    width: isIPad ? 17 : 12,
    height: isIPad ? 17 : 12,
    borderRadius: 12,
    backgroundColor: '#223890',
  },
});

export default Checkout;