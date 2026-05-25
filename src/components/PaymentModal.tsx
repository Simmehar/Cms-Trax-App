import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { FONTS, ICONS, IMAGES } from '../assets';
import { SvgXml } from 'react-native-svg';
import { KeyboardScroll } from './KeyboardScroll';
import { CheckIpad, isIPad } from '../utilities/securestorage';
import axios from 'axios';
import { useAuth } from '../contexts';
import { useStripe } from '@stripe/stripe-react-native';
import { Backend_URL } from '../util/apiCalls';
interface PaymentProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (
    type: string,
    disValue: any,
    selectAmount: number,
    payment_method: string,
  ) => void;
  isIpad: boolean;
  amountState: any;
  onAdDiscount: () => void;
}

const { height, width } = Dimensions.get('screen');

const PaymentModal: React.FC<PaymentProps> = ({
  visible,
  onClose,
  onSubmit,
  isIpad,
  onAdDiscount,
  amountState,
  isOnline,
  disValue
}) => {
  const [payType, setPayType] = useState('cash');
  const { user } = useAuth();

  const [selectAllChecked, setSelectedAllChecked] = useState(false);

  __DEV__ && console.log('selectAllChecked', selectAllChecked);

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
  // 'https://app.crewmailservices.com/api/payment-sheet/',
  // 'https://stage-app.crewmailservices.com/api/payment-sheet/',

  const [loading, setLoading] = useState(false);
  __DEV__ && console.log('Backend_URL :>> ', Backend_URL);
  const onTestPress = async () => {
    setLoading(true);
    __DEV__ && console.log('Number(selectAmount)', Number(selectAmount));


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
        __DEV__ && console.log('res', res?.data?.paymentIntent);

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
      __DEV__ && console.log(
        'presentPaymentSheet success',
        selectAmount,
        amountState.totalPayableAmount,
      );
      if (selectAmount > 0) {
        setLoading(false);
        onSubmit(payType, Number(selectAmount), '5');
      }

      // success
    }
  };

  const [selectAmount, setSelectAmount] = useState('');
  console.log('selectAmount', selectAmount)

  const onPercentageChange = (val: any) => {
    const discount = (amountState?.payable_amount * Number(val)) / 100;
    if (discount && discount != NaN) {
      setSelectAmount(String(discount));
    }
  };

  useEffect(() => {
    onPercentageChange('0');
  }, []);

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
  __DEV__ && console.log('amountState', amountState)
  const renderPaymentView = () => {
    return (
      <View style={[styles.modalContent, { marginTop: -25 }]}>
        <ScrollView style={{ height: '80%', borderBottomColor: 'lightgrey', borderBottomWidth: 1 }} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={styles.cashView}
            onPress={() =>
              payType == 'cash' ? setPayType('') : setPayType('cash')
            }>
            <View style={styles.rowView}>
              <Image source={IMAGES.cash} style={styles.cashImg} />
              <Text style={styles.cashTxt}>Cash</Text>
            </View>
            <View style={styles.rightView}>
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
            </View>
          </TouchableOpacity>
          {payType == 'cash' ? (
            <>
              <View
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginHorizontal: 15,
                  marginTop: 40,
                  marginBottom: 50,
                }}>
                <TouchableOpacity
                  style={
                    selectAmount == 10 ? styles.amountView : styles.amountLView
                  }
                  onPress={() => setSelectAmount(10)}>
                  <Text
                    style={
                      selectAmount == 10 ? styles.amountTxt : styles.amountWTxt
                    }>
                    $ 10.00
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={
                    selectAmount == 20 ? styles.amountView : styles.amountLView
                  }
                  onPress={() => setSelectAmount(20)}>
                  <Text
                    style={
                      selectAmount == 20 ? styles.amountTxt : styles.amountWTxt
                    }>
                    $ 20.00
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={
                    selectAmount == 100 ? styles.amountView : styles.amountLView
                  }
                  onPress={() => setSelectAmount(100)}>
                  <Text
                    style={
                      selectAmount == 100 ? styles.amountTxt : styles.amountWTxt
                    }>
                    $ 100.00
                  </Text>
                </TouchableOpacity>
              </View>
              {/* <View style={styles.inputView}>
            <TextInput
              style={styles.input}
              placeholder="Custom Amount"
              placeholderTextColor={'#989898'}
            />
            <View style={styles.lineView}></View>
          </View> */}
              <View style={{ margin: 20, borderBottomWidth: 1, borderColor: 'lightgrey' }}>
                <Text style={styles.pinDisplay}>{selectAmount || 'Amount Received'}</Text>
              </View>
              {__DEV__ && console.log('amountState?.totalPayableAmount', amountState)}
              {Number(selectAmount) < amountState?.payable_amount && (
                <View
                  style={{
                    marginLeft: 24,
                    marginVertical: 20,
                  }}>
                  <Text
                    style={{
                      color: '#db6363',
                      fontSize: isIPad ? 30 : 23,
                      fontFamily: 'OctoberCompressRegular',
                      fontWeight: '600'
                    }}>
                    Balance due is ${' '}
                    {Number(
                      amountState?.payable_amount - selectAmount,
                    ).toFixed(1)}
                  </Text>
                </View>
              )}



              <View style={{ alignItems: 'center', justifyContent: 'center' }}>

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
                      onPress={() => setSelectAmount('.')}>
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

              {amountState?.totalPayableAmount >= 0 && !isOnline && (
                <TouchableOpacity
                  style={styles.cashView}
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
                      style={{ height: 46, width: 49, marginLeft: 15 }}
                    />
                    <Text style={[styles.cashTxt]}>POS</Text>
                  </View>
                </TouchableOpacity>
              )}

            </>
          ) : (
            <></>
          )}


          {/* {amountState?.totalPayableAmount > 0 || isOnline && ( */}
          <TouchableOpacity
            style={styles.cashView}
            disabled={loading}
            onPress={() => {
              // checkout();
              if (Number(selectAmount) > 0) {
                onTestPress();
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
                    style={{ height: isIPad ? 46 : 40, width: isIPad ? 49 : 40 }}
                  />
                  <Text style={[styles.cashTxt]}>Card</Text>
                </View>
                <View style={[styles.rightView]}>
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
                </View>
              </>
            )}
          </TouchableOpacity>
          {/* )} */}
        </ScrollView>
        {__DEV__ && console.log('disValue', disValue)}
        <TouchableOpacity
          style={styles.cashView}
          onPress={onAdDiscount}>
          <Text
            style={
              selectAmount == 100 ? styles.amountTxt : styles.amountWTxt
            }>
            {disValue && disValue > 0
              ? `Discount:=${disValue}%`
              : 'Add Discount'}
          </Text>
        </TouchableOpacity>

      </View>
    );
  };
  const renderPaymetnModal = () => {
    return (
      <Modal visible={visible} transparent={true}>
        <View style={styles.modalContainer}>
          <KeyboardScroll
            contentContainerStyle={{ flex: 1, justifyContent: 'flex-end' }}>
            <View style={styles.modalContent}>
              <View
                style={{
                  marginTop: 10,
                }}>
                <Text
                  style={{
                    color: '#db6363',
                    fontSize: isIPad ? 30 : 20,
                    textAlign: 'center',
                    fontFamily: 'OctoberCompressRegular',
                    fontWeight: '600'
                  }}>
                  Total due ${' '}
                  {Number(amountState?.totalPayableAmount).toFixed(2)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.crossView}
                onPress={() => {
                  setPayType(''), onClose();
                }}>
                <Image source={IMAGES.close} style={styles.closeImg} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cashView}
                onPress={() =>
                  payType == 'cash' ? setPayType('') : setPayType('cash')
                }>
                <View style={styles.rowView}>
                  <Image source={IMAGES.cash} style={styles.cashImg} />
                  <Text style={styles.cashTxt}>Cash</Text>
                </View>
                <View style={[styles.radioButton, payType == 'cash' && styles.radioButtonSelected]}>
                  {payType == 'cash' && <View style={styles.radioButtonInner} />}
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

                  {/* <View
                    style={[
                      styles.inputView,
                      { flexDirection: 'row', alignItems: 'center',marginVertical:10 },
                    ]}>
                    <Text
                      style={{
                        fontSize: isIPad ? 40 : 30,
                      }}>
                      $
                    </Text>
                    <TextInput
                      style={[styles.input, { paddingLeft: 5, width: '75%' }]}
                      placeholder="Amount"
                      placeholderTextColor={'#989898'}
                      onChangeText={setSelectAmount}
                      keyboardType={'decimal-pad'}
                      value={selectAmount.toString()}
                    />
                    <View style={styles.lineView}></View>
                  </View> */}
                  <View style={{ margin: isIPad ? 25 : 10, borderBottomWidth: 0.5, borderColor: 'lightgrey', marginHorizontal: 30 }}>
                    <Text style={styles.pinDisplay}>{selectAmount || 'Amount ($)'}</Text>
                  </View>
                  <View style={{ alignItems: 'center', justifyContent: 'center' }}>

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

                  <View
                    style={{
                      marginLeft: 24,
                      marginTop: 20,
                    }}>
                    {Number(selectAmount) < amountState?.totalPayableAmount && (
                      <Text
                        style={{
                          color: '#db6363',
                          fontSize: isIPad ? 30 : 23,
                          fontFamily: 'OctoberCompressRegular',
                          fontWeight: '600'
                        }}>
                        Balance due is ${' '}
                        {Number(
                          amountState?.totalPayableAmount - selectAmount,
                        ).toFixed(2)}
                      </Text>
                    )}
                  </View>

                  {amountState?.totalPayableAmount >= 0 && !isOnline && (
                    <TouchableOpacity
                      style={[styles.cashView, { marginTop: Number(selectAmount) > amountState?.totalPayableAmount ? 39.5 : 12, }]}
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
                          style={{ height: isIPad ? 46 : 40, width: isIPad ? 49 : 40, marginLeft: 15 }}
                        />
                        <Text style={[styles.cashTxt]}>POS</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <></>
              )}
              {amountState?.totalPayableAmount > 0 && isOnline && (
                <TouchableOpacity
                  style={[styles.cashView, { marginTop: Number(selectAmount) > amountState?.totalPayableAmount ? 39.5 : 12, }]}
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
                          style={{ height: isIPad ? 46 : 40, width: isIPad ? 49 : 40 }}
                          resizeMode='contain'
                        />
                        <Text style={[styles.cashTxt]}>Card</Text>
                      </View>
                      <View style={[styles.radioButton, payType == 'card' && styles.radioButtonSelected]}>
                        {payType == 'card' && <View style={styles.radioButtonInner} />}
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
              )}


              {payType ? (
                <TouchableOpacity
                  style={styles.subMitBtn}
                  onPress={() => {
                    const amount = Number(selectAmount);

                    if (!selectAmount || selectAmount.trim() === '') {
                      Alert.alert('Please enter some amount');
                    } else if (isNaN(amount)) {
                      Alert.alert('Please enter amount greater than 0');
                    } else {
                      onSubmit(
                        payType,
                        amount,
                        selectAllChecked ? '4' : '1',
                      );
                    }
                  }}>
                  <Text style={styles.submitTxt}>Submit</Text>
                </TouchableOpacity>
              ) : (
                <></>
              )}
            </View>
          </KeyboardScroll>
        </View>
      </Modal>
    );
  };


  return isIpad ? renderPaymentView() : renderPaymetnModal();
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: isIPad ? 40 : 20,
    paddingBottom: isIPad ? 40 : 20,
    maxHeight: "100%",
  },
  crossView: {
    height: isIPad ? 48 : 30,
    width: isIPad ? 48 : 30,
    borderRadius: 48 / 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F4F4',
    alignSelf: 'flex-end',
    marginRight: 20,
  },
  closeImg: {
    height: isIPad ? 25 : 10,
    width: isIPad ? 25 : 10,
    tintColor: 'black',
  },
  cashView: {
    marginHorizontal: 18,
    backgroundColor: '#F9F9F9',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 12,
  },
  rowView: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cashImg: {
    height: isIPad ? 50 : 40,
    width: isIPad ? 50 : 40,
    resizeMode: 'contain',
  },
  cashTxt: {
    fontSize: isIPad ? 25 : 15,
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
    height: isIPad ? 55 : 40,
    width: isIPad ? 55 : 40,
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
    fontSize: isIPad ? 40 : 30,
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
    marginTop: isIPad ? 40 : 20,
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
    fontSize: 30,
    marginVertical: 5,
    color: 'grey',
    alignSelf: 'flex-start',
  },
  numberPad: {
    width: '100%',
    maxWidth: '60%',
  },
  row: {
    marginBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  numberButton: {
    width: 55,
    height: 55,
    // marginHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderRadius: 6,
    borderColor: 'lightgrey'
  },
  numberText: {
    color: 'grey',
    fontSize: isIPad ? 30 : 20,
    fontWeight: '700',
  },
  lastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  doubleButton: {
    width: 55,
    height: 55,
    alignItems: 'center',
    // marginHorizontal: 5,
    justifyContent: 'center',
  },
  deleteButton: {
    width: 55,
    height: 55,
    alignItems: 'center',

    justifyContent: 'center',
  },
  deleteIcon: {
    width: isIPad ? 35 : 24,
    height: isIPad ? 35 : 24,
    tintColor: 'grey'
  },
  radioButton: {
    width: isIPad ? 34 : 24,
    height: isIPad ? 34 : 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3e74b0', // Custom border color
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: '#3e74b0', // Custom border color when selected
  },
  radioButtonInner: {
    width: isIPad ? 17 : 12,
    height: isIPad ? 17 : 12,
    borderRadius: 6,
    backgroundColor: '#3e74b0', // Inner circle color
  },

});
export { PaymentModal };
