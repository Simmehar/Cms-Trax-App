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
import { useStripe } from '@stripe/stripe-react-native';
import { GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';

let isPad = CheckIpad();

function amountReducer(state, action) {
  return action;
}

const Checkout: React.FC = ({ route }: any) => {
  // __DEV__ && console.log('route.params', route.params);

  const { arr, msg } = route.params;

  const { isOnline, initializeDatabase } = useMode();
  // const  isOnline=false;
  // __DEV__ && console.log('isOnline', isOnline);

  const [data, setData] = useState(arr || []);
  // __DEV__ && console.log('route.params', JSON.stringify(arr[0].package_type.name));

  const [isModalVisible, setModalVisible] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [isCredit, setIsCredit] = useState(false);
  const [visible, setVisible] = useState(false);
  const [disValue, setDisValue] = useState(0);
  const navigation = useNavigation<any>();

  // let data = ['1', '2', '3'];

  const onAdDiscount = () => {
    // __DEV__ && console.log('call')
    setVisible(!visible);
  };

  const onSave = (val: number) => {
    __DEV__ && console.log('val=================================================', val)
    setVisible(!visible);
    setDisValue(val);
  };

  const { user } = useAuth();

  const selectedUserId = arr;

  const [payableAmount, setPayableAmount] = useState(
    selectedUserId[0].user?.payable_amount,
  );

  // __DEV__ && console.log('selectedUserId', payableAmount);

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
    // const customerData = await getCustomerList(
    //   user,
    //   selectedUserId[0].user?.id,
    // );

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
      totalPayableAmount: Math.max(payable_amount).toFixed(2),
      payable_amount: Math.max(payable_amount).toFixed(2),
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

  // __DEV__ && console.log('selectAllChecked', selectAllChecked);

  useEffect(() => {
    setPayType('cash');
  }, [visible]);

  // const {
  //   totalPayableAmount,
  //   payable_amount,
  //   unpaid_packages,
  //   other_purchases,
  //   credit,
  // } = amountState;

  // const [] = useState();

  const [loading, setLoading] = useState(false);

  const onTestPress = async () => {
    setLoading(true);
    // __DEV__ && console.log('Number(selectAmount)', Number(selectAmount));

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
        // __DEV__ && console.log('res', res?.data?.paymentIntent);

        const paymentIntent = res?.data?.paymentIntent;

        setup(paymentIntent);
        setLoading(false);
      })
      .catch(err => {
        __DEV__ && console.log('err', err);
        setLoading(false);
        Alert.alert('Server error', 'Please try again later!');
      });
  };

  // useEffect(() => {
  //   if (Number(selectAmount) > 0) {
  //     onTestPress();
  //   }
  // }, [amountState]);

  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const setup = async (paymentIntent: any) => {
    const { error } = await initPaymentSheet({
      merchantDisplayName: 'Example, Inc.',
      paymentIntentClientSecret: paymentIntent, // retrieve this from your server
      returnURL: 'http://google.com',
    });
    if (error) {
      // handle error
      Alert.alert('Error while making payment with card.', 'Please try again');

      __DEV__ && console.log('error', error);
    } else {
      checkout();
    }
  };

  const checkout = async () => {
    const { error } = await presentPaymentSheet();

    if (error) {
      __DEV__ && console.log('presentPaymentSheet error', error);
      // handle error
    } else {
      // __DEV__ && console.log(
      //   'presentPaymentSheet success',
      //   selectAmount,
      //   amountState.totalPayableAmount,
      // );
      if (selectAmount > 0) {
        setLoading(false);
        handleOnSubmit(payType, Number(selectAmount), '5');
      }

      // success
    }
  };
  const [popupVisible, setPopupVisible] = useState(false);
  const [selectAmount, setSelectAmount] = useState('');
  const [discountValue, setDiscountValues] = useState();
  const onPercentageChange = (val: any) => {
    const discount = (amountState?.payable_amount * Number(val)) / 100;
    if (discount && discount != NaN) {
      setSelectAmount(String(discount));
    }
    let discountValueeee = (Number(disValue * 100) / amountState?.payable_amount).toFixed(0);
    setDiscountValues(discountValueeee);
  };

  // __DEV__ && console.log('seleselectAmountselectAmountctAmount', selectAmount)

  useEffect(() => {
    onPercentageChange('0');
  }, []);
  useEffect(() => {
    // __DEV__ && console.log('data?.length  :>> ', msg);
    if (msg && msg == true) {
      setPopupVisible(true)
    }
  }, [msg]);

  const [selectedDiscount, setSelectedDiscount] = useState(-1);



  const handleNumberPress = number => {
    setSelectAmount(selectAmount + number)
  };

  const handleDeletePress = () => {
    if (selectAmount.length > 0) {
      setSelectAmount(selectAmount.slice(0, -1));
    }
  };

  const NumberButton = ({ number, onPress }) => (
    <TouchableOpacity
      style={styles.numberButton}
      onPress={() => onPress(number.toString())}>
      <Text style={styles.numberText}>{number}</Text>
    </TouchableOpacity>
  );

  const renderPaymentView = () => {
    return (
      <View style={[styles.modalContent, { height: modalHeight }]}>
        <View style={{ height: '90%', borderBottomColor: 'lightgrey', borderBottomWidth: 1 }} showsVerticalScrollIndicator={false}>

          <View style={{ height: payType == 'cash' ? '85%' : 'auto' }}>
            <TouchableOpacity
              style={styles.cashView}
              onPress={() =>
                payType == 'cash' ? setPayType('') : setPayType('cash')
              }>
              <View style={styles.rowView}>
                <Image source={IMAGES.cash} style={styles.cashImg} />
                <Text style={styles.cashTxt}>Cash</Text>
              </View>
              <View style={[styles.radioButton,  payType == 'cash' && styles.radioButtonSelected]}>
                      { payType == 'cash' && <View style={styles.radioButtonInner} />}
                    </View>
              {/* <View style={styles.rightView}>
                <Image
                  source={IMAGES.left_arrow}
                  style={[
                    styles.arrow,
                    {
                      transform: [
                        { rotate: payType == 'cash' ? '270deg' : '180deg' },
                      ],
                    },
                  ]}
                />
              </View> */}
            </TouchableOpacity>
            {payType == 'cash' ? (
              <>

                <View style={{ height: '30%' }}>
                  <View
                    style={{
                      marginTop: '1%',
                    }}>
                    <Text
                      style={{
                        color: '#db6363',
                        fontSize: isIPad ? 22 : 20,
                        textAlign: 'center',
                        fontFamily: 'OctoberCompressRegular',
                        fontWeight: '600'
                      }}>
                      Total due ${' '}
                      {Number(amountState?.totalPayableAmount).toFixed(2)}
                    </Text>
                  </View>
                  <View style={{ margin: 5, borderBottomWidth: 1, borderColor: 'lightgrey' }}>
                    <Text style={styles.pinDisplay}>{selectAmount || 'Amount Received'}</Text>
                  </View>

                  {Number(selectAmount) < amountState?.payable_amount && (
                    <View
                      style={{
                        marginLeft: 24,
                        marginBottom: 10,
                      }}>
                      <Text
                        style={{
                          color: '#db6363',
                          fontSize: isIPad ? 25 : 23,
                          fontFamily: 'OctoberCompressRegular',
                        }}>
                        Balance due is ${' '}
                        {Math.max(
                          Number(Number(amountState?.totalPayableAmount - selectAmount).toFixed(2)),
                          0
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
            ) : (
              <></>
            )}
          </View>

          {amountState?.totalPayableAmount >= 0 && !isOnline && payType == 'cash' && (
            <View style={{ height: '10%' }}>
              <TouchableOpacity
                style={[styles.cashView]}
                onPress={() => setSelectedAllChecked(!selectAllChecked)}>
                <View style={styles.rowView}>
                  {selectAllChecked ? (
                    <View
                      style={
                        isIPad
                          ? styles.selectcheckboxI
                          : styles.selectcheckbox
                      }>
                      <Image
                        source={IMAGES.check}
                        style={isIPad ? styles.tickI : styles.tick}
                      />
                    </View>
                  ) : (
                    <View
                      style={
                        isIPad ? styles.checkboxI : styles.checkbox
                      }></View>
                  )}
                  <Image
                    source={IMAGES.card}
                    style={{ height: 46, width: 49, marginLeft: isIPad ? 35 : 15 }}
                  />
                  <Text style={[styles.cashTxt]}>POS</Text>
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
                  // checkout();
                  if (Number(selectAmount) > 0) {
                    onTestPress();
                    setPayType('card');
                  } else {
                    Alert.alert('Please enter some amount.');
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
                      <Text style={[styles.cashTxt]}>Card</Text>
                    </View>
                    <View style={[styles.radioButton,  payType == 'card' && styles.radioButtonSelected]}>
                            { payType == 'card' && <View style={styles.radioButtonInner} />}
                          </View>
                    {/* <View style={[styles.rightView]}>
                      <Image
                        source={IMAGES.left_arrow}
                        style={[
                          styles.arrow,
                          {
                            transform: [
                              {
                                rotate:
                                  payType == 'card' ? '270deg' : '180deg',
                              },
                            ],
                          },
                        ]}
                      />
                    </View> */}
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
              style={
                {
                  fontSize: isIPad ? 23 : 20,
                  fontFamily: FONTS.OpenSansMedium,
                  color: '#223890',
                  fontWeight: '700'
                }
              }>
              {disValue && disValue > 0
                ? `Discount:($${Number(disValue).toFixed(1)})`
                : 'Add Discount'}
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
      // credit:
      //   Number(selectAmount) > Number(amountState.payable_amount)
      //     ? Number(selectAmount) - Number(amountState.payable_amount)
      //     : 0,
      payment_method,
    });
    setModalVisible(false);
    setSuccessVisible(true);


  };
  const { height: screenHeight } = Dimensions.get('window');

  // Assume bottomViewHeight corresponds to the height taken by the CheckoutBottom component
  const bottomViewHeight = screenHeight * 0.4; // 0.4 based on your original setup
  const modalHeight = screenHeight - bottomViewHeight - 50;

  const [cmsdata, setCmsData] = useState([
    { name: 'VELVET CAVIAR compatible with Magsafe Wallet - Magnetic Card', isReceived: true, price: '$10.00' },
    { name: 'Neutrogena Hydro Boost Hydrating Mask and By Terry Hydrating Sheet Mask and Pixi Vitamin C Sheet Mask and Perricone MD Cold Plasma Treatment Sheet Mask', isReceived: false, price: '$15.00' },
    { name: 'I Pen', isReceived: true, price: '$20.00' },
  ]);

  return (
    <View style={styles.mainView}>
      <GestureHandlerRootView>
        <View style={{ marginVertical: isPad ? 10 : 'noun', justifyContent: 'flex-end', backgroundColor: null }}>

          <BackHeader title="Review" />

          <View
            style={{ position: 'absolute', right: 25, alignSelf: 'center', bottom: 10 }}>
            {isOnline ?
              <Image
                source={IMAGES.internet}
                style={styles.network}
              /> :
              <Image
                source={IMAGES.Nointernet}
                style={styles.networkI}
              />
            }
          </View>
        </View>
        {isPad ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              flex: 1,
              marginHorizontal: 15,
              paddingBottom: 50
            }}>
            <View style={[styles.blueView, { flex: 1, height: '95%' }]}>
              <Text style={styles.shipNem}> {data[0].user.first_name + ' ' + data[0].user.last_name}</Text>
              {/* {data.length > 0 &&
                data.map(i => (
                  <TouchableOpacity style={styles.packageView} onPress={() => { }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tagTxt}>Tag# {item.tag_number}</Text>
                      <Text style={styles.bluTxt}>
                        Tracking ID:{' '}
                        <Text style={styles.numTxt}>1LSCXON0032MHY5</Text>{' '}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))} */}
              <FlatList
                data={data}
                showsVerticalScrollIndicator={false}
                ListFooterComponent={() => <View style={{ height: 60 }} />}
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
            </View>
            {amountState?.totalPayableAmount > 0 &&
              <View style={{ flex: 1, height: '95%' }}>
                {renderPaymentView()}
              </View>
            }
          </View>
        ) : (
          <View style={styles.blueView}>
            <Text style={styles.shipNem}>
              {data[0].user.first_name + ' ' + data[0].user.last_name}
            </Text>

            <FlatList
              data={data}
              showsVerticalScrollIndicator={false}
              ListFooterComponent={() => <View style={{ height: 90 }} />}
              renderItem={({ item, index }) => {
                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.packageView}
                    onPress={() => { }}>
                    <View style={{ flex: 1, flexDirection: 'column' }}>
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

            {/* {data.length > 0 &&
            data.map((item: Package, index: any) => (
              <TouchableOpacity
                key={index}
                style={styles.packageView}
                onPress={() => {}}>
                <View style={{flex: 1}}>
                  <Text style={styles.tagTxt}>Tag# {item.tag_number}</Text>
                  <Text style={styles.bluTxt}>
                    Tracking ID:{' '}
                    <Text style={styles.numTxt}>{item.tracking_no}</Text>{' '}
                  </Text>
                </View>
                <Image style={styles.delete} source={IMAGES.delete} />
              </TouchableOpacity>
            ))} */}
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
              selectAmount: amountState?.paidAmount
            });
          }}
          amountState={amountState}
          dispatch={dispatch}
        />

        {!isPad && <PaymentModal
          visible={isModalVisible}
          isIpad={false}
          onClose={() => setModalVisible(false)}
          onSubmit={handleOnSubmit}
          amountState={amountState}
          disValue={disValue || 0}
          isOnline={isOnline}
        />
        }
        {/* { isPad ? renderPaymentView():null} */}
        {/* {__DEV__ && console.log('amountState?.totalPayableAmount >= 0 :>> ', amountState?.totalPayableAmount >= 0)} */}
        <View style={{ flex: isIPad ? 0.45 : 0.3 }} >
          <CheckoutBottom
            nextClick={() => {

              if (amountState?.totalPayableAmount <= 0) {
                const payment_method = selectAllChecked ? '4' : '1';
                dispatch({
                  ...amountState,
                  paidAmount: selectAmount,
                  // credit:
                  //   Number(selectAmount) > Number(amountState.payable_amount)
                  //     ? Number(selectAmount) - Number(amountState.payable_amount)
                  //     : 0,
                  payment_method,
                });
                navigation.navigate('CheckoutData', {
                  amountState,
                  packages: data,
                  customerData,
                  discount: disValue,
                  isCredit: isCredit,
                  selectAmount: selectAmount
                });

              } else {
                if (isPad) {
                  if (
                    selectAmount
                  ) {
                    handleOnSubmit(
                      payType,
                      Number(selectAmount),
                      selectAllChecked ? '4' : '1',
                    );
                  } else {
                    Alert.alert('Please enter some amount');
                  }
                }
                else {
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
            <View style={{ backgroundColor: 'white', paddingBottom: '5%', paddingTop: '3%', width: '80%', borderRadius: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: '5%' }}>
              <TouchableOpacity style={styles.crossView} onPress={() => { setPopupVisible(false) }}>
                <Image source={IMAGES.close} style={styles.closeImg} />
              </TouchableOpacity>
              <Text style={{
                color: '#db6363',
                fontSize: isIPad ? 30 : 20,
                textAlign: 'center',
                fontFamily: 'OctoberCompressRegular',
                fontWeight: '600'
              }}>Warning!!</Text>
              <Text style={{
                fontSize: isIPad ? 25 : 15,
                marginTop: isIPad ? 30 : 20,
                color: 'grey',
                textAlign: 'center',
              }}>There are 1 or more packages NOT selected !</Text>
            </View>

          </View>
        </Modal>
      </GestureHandlerRootView>
    </View>
  );
};

const { height, width } = Dimensions.get('screen');

const styles = StyleSheet.create({
  mainView: {
    flex: 1,
    backgroundColor: 'white',
    paddingTop: isPad ? 50 : 30
  },
  blueView: {
    marginHorizontal: 5,
    backgroundColor: '#e3eff6',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginTop: 15,
    flex: 1,
    // height: height * 0.3,
  },
  shipNem: {
    fontFamily: FONTS.PoppinsSemiBold,
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
    fontFamily: FONTS.PoppinsSemiBold,
    color: 'black',
  },
  bluTxt: {
    fontSize: isPad ? 21 : 14,
    fontFamily: FONTS.PoppinsMedium,
    color: '#223890',
    marginTop: isPad ? 10 : 'none'
  },
  numTxt: {
    fontSize: isPad ? 21 : 14,
    fontFamily: FONTS.PoppinsRegular,
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
    fontFamily: FONTS.PoppinsSemiBold,
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
    // flex: 1,
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
    // flex: 1,
    borderColor: '#223890',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
    marginRight: 5,
    borderWidth: 1,
  },
  amountTxt: {
    // fontSize: 19,
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
    textDecorationLine: 'underline'
  },
  lineView: {
    height: 1,
    backgroundColor: '#98989830', //'#F9F9F9',
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
    fontFamily: FONTS.PoppinsSemiBold,
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
    borderColor: 'lightgrey'
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
    // marginHorizontal: 3,
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
    alignItems: 'center'
  },
  modalContent: {
    // backgroundColor: '#FFFFFF',
    // backgroundColor: 'yellow',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,

    // paddingVertical: 20,
    // paddingBottom: 40,
    // maxHeight: "75%",
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
    // backgroundColor: '#F9FAFB',
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
  paddingRight:isIPad?60:20,
  },
  price: {
    color: '#666',
    fontSize: isIPad ? 22 : 15,
  },
  radioButton: {
    width: isIPad?34:24,
    height: isIPad?34:24,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#3e74b0', // Custom border color
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: '#3e74b0', // Custom border color when selected
  },
  radioButtonInner: {
    width: isIPad?17:12,
    height: isIPad?17:12,
    borderRadius: 12,
    backgroundColor: '#3e74b0', // Inner circle color
  },
});

export default Checkout;
