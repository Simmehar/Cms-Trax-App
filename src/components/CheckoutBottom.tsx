import React, { useEffect } from 'react';
import { View, Image, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FONTS } from '../assets';
import { isIPad } from '../utilities/securestorage';
import { getCustomerList } from '../utilities/ApiCalls';
import LinearGradient from 'react-native-linear-gradient';
import { useTranslation } from 'react-i18next';

interface checkProps {
  nextClick: () => void;
  onAdDiscount: () => void;
  disValue: number;
  amountState: any;
  dispatch: any;
}

const CheckoutBottom: React.FC<checkProps> = ({
  nextClick,
  onAdDiscount,
  disValue,
  amountState,
  dispatch,
}) => {
  const {
    totalPayableAmount,
    payable_amount,
    unpaid_packages,
    other_purchases,
    credit,
  } = amountState;
  const { t } = useTranslation();
  __DEV__ && console.log('unpaid_packages :>> ', amountState);
  useEffect(() => {
    dispatch({
      ...amountState,
      totalPayableAmount: payable_amount - disValue,
    });
  }, [disValue]);


  const discountValue = (Number(disValue * 100) / payable_amount).toFixed(0);
  __DEV__ && console.log('disValue', disValue)

  return (
    <View style={styles.bottomView}>
      <>
        <View style={styles.greyView}>
          <View style={styles.rowView}>
            <Text style={styles.label}>{t('Unpaid Packages:')}</Text>
            <Text style={styles.amount}>
              {t('$')} {Number(unpaid_packages).toFixed(2)}
            </Text>
          </View>
          {/* <View style={[styles.rowView, { marginTop: 10 }]}>
            <Text style={styles.label}>Payable Amount:</Text>
            <Text style={styles.amount}>
              $ {Number(totalPayableAmount).toFixed(2)}
            </Text>
          </View> */}

          <View style={[styles.rowView, { marginTop: isIPad ? 10 : 10 }]}>
            <Text style={styles.label}>{t('Other Purchases:')}</Text>
            <Text style={styles.amount}>
              {t('$')} {Number(other_purchases).toFixed(2)}
            </Text>
          </View>
          <View style={[styles.rowView, { marginTop: isIPad ? 10 : 10 }]}>
            <Text style={styles.label}>{t('Credit')}:</Text>
            <Text style={styles.amount}>{t('$')} {Number(credit).toFixed(2)}</Text>
          </View>
          {payable_amount > 0 && <View style={[styles.rowView, { marginTop: isIPad ? 10 : 10 }]}>
            <Text style={styles.label}>
              {t('Discount:')}
              {disValue > 0 && (
                <Text style={styles.disTxt}>
                  {Number(discountValue) > 0 && `${discountValue}%`}
                </Text>
              )}
            </Text>
            <Text
              style={disValue && disValue > 0 || !isIPad ? styles.disTxt : styles.amount}
              onPress={!isIPad ? onAdDiscount : null}
            >
              {disValue && disValue > 0
                ? `${t('$')}${Number(disValue).toFixed(2)}`
                : isIPad
                  ? '-'
                  : t('Add Discount')}
            </Text>
          </View>}
        </View>
      </>
      <View style={styles.blueView}>
        {/* Gradient background for the bottom view */}
        <LinearGradient
          colors={['#1C2C5B', '#1F3C73', '#2B5DAA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, {
            borderTopLeftRadius: 15,
            borderTopRightRadius: 15
          }]}
        />

        <View style={styles.rowView}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.doller}>
              {t('$')} {Math.max(0, Number(totalPayableAmount)).toFixed(2)}
            </Text>
            <Text style={styles.total}> {t('Total')}</Text>
          </View>
          <TouchableOpacity style={styles.nextBtn} onPress={nextClick}>
            <Text style={styles.nxtTxt}>{t('Next')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomView: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    flex: 1,
    height: isIPad ? '33%' : 'none',
    justifyContent: 'flex-end'
  },
  greyView: {
    backgroundColor: '#F4F4F4',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 29,
    paddingVertical: 24,
  },
  rowView: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: isIPad ? 8 : 10,
  },
  label: {
    fontSize: isIPad ? 23 : 18,
    fontFamily: FONTS.RICORDORegular,
    color: 'black',
    flex: 1,
  },
  amount: {
    fontSize: isIPad ? 23 : 18,
    fontFamily: FONTS.RICORDOSemiBold,
    color: 'black',
  },
  disTxt: {
    fontSize: isIPad ? 23 : 18,
    fontFamily: FONTS.RICORDOSemiBold,
    color: '#223890',
  },
  blueView: {
    backgroundColor: '#00303E',
    paddingTop: isIPad ? 15 : 15,
    paddingBottom: isIPad ? 15 : 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopRightRadius: 15,
    borderTopLeftRadius: 15,
    // borderRadius: 15,
    paddingHorizontal: 15,
    bottom: 0
  },
  doller: {
    fontSize: isIPad ? 45 : 24,
    fontFamily: FONTS.RICORDOSemiBold,
    color: 'white',
    // flex: 1,
  },
  total: {
    fontSize: isIPad ? 25 : 18,
    fontFamily: FONTS.RICORDORegular,
    color: 'white',
    // marginLeft: 25,
  },
  nextBtn: {
    height: isIPad ? 65 : 50,
    width: isIPad ? 195 : 150,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FDBE6F',
    borderRadius: 36,
  },
  nxtTxt: {
    fontSize: isIPad ? 25 : 18,
    fontFamily: FONTS.RICORDOSemiBold,
    color: 'white',
  },
});

export { CheckoutBottom };
