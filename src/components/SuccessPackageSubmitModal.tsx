import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  Dimensions,
  FlatList,
  ScrollView,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { FONTS, IMAGES } from '../assets';
import { sortTrackingNumber } from '../functions/SortTrackingNumber';
import { isIPad } from '../utilities/securestorage';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('screen');

const LottieModal = ({
  isVisible,
  setVisible,
  responseData,
  message,
  onCloseSuccessModal,
  updateData,
}: any) => {
  const [showInitialPart, setShowInitialPart] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        setShowInitialPart(false);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  const sortedResponse = responseData;

  return (
    <Modal visible={isVisible} animationType="fade" transparent>
      <View style={styles.modalBackground}>
        <View style={styles.container}>
          {/* Close Button Top Right */}
          <TouchableOpacity
            style={isIPad ? styles.crossViewPad : styles.crossViewPhone}
            onPress={() => setVisible(false)}>
            <Image source={IMAGES.close} style={styles.closeImg} />
          </TouchableOpacity>

          {showInitialPart ? (
            <View style={styles.initialContainer}>
              <LottieView
                style={styles.icon}
                source={require('../assets/animations/LottieAnimation.json')}
                autoPlay
                loop
              />

              {!message && <Text style={styles.title}>{t('GREAT WORK!')}</Text>}

              <Text
                style={[
                  styles.messageText,
                  {
                    color: '#6F7884',
                    marginBottom: isIPad ? 40 : 20,
                    width: width * 0.8,
                    textAlign: 'center',
                  },
                ]}>
                {message || t('You have successfully submitted packages.')}
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}>
              {/* Header Info */}
              {responseData?.[0]?.recipient_name ? (
                <Text style={styles.simTitle}>
                  {responseData?.[0]?.recipient_name}
                </Text>
              ) : null}

              {responseData?.[0]?.ship_name ? (
                <Text style={styles.ascentMessage}>
                  {responseData?.[0]?.ship_name}
                </Text>
              ) : null}

              {!message && responseData?.[0]?.department ? (
                <Text style={styles.deptMessage}>
                  {`${t('Department')} : ${responseData?.[0]?.department}`}
                </Text>
              ) : null}

              {/* Tracking Table Card (Pehle code jaisa layout) */}
              {sortedResponse && sortedResponse.length > 0 ? (
                <View style={styles.cardContainer}>
                  <View style={styles.tableHeaderRow}>
                    <View style={styles.headerCell}>
                      <Text style={styles.headerText}>{t('Tracking#')}</Text>
                    </View>
                    <View style={styles.headerCell}>
                      <Text style={styles.headerText}>{t('Tag#')}</Text>
                    </View>
                  </View>

                  <FlatList
                    data={sortedResponse}
                    scrollEnabled={false}
                    keyExtractor={(_, index) => index.toString()}
                    renderItem={({ item, index }) => (
                      <TrackingValue
                        item={item}
                        isLast={index === (sortedResponse?.length || 0) - 1}
                      />
                    )}
                  />
                </View>
              ) : null}

              {/* Form / Location Cards (Pehle code jaisa individual card style) */}
              <View style={styles.infoSection}>
                <ShowUpdateData
                  isVisible={updateData?.receipientName}
                  title={`${t('Recipient')}:`}
                  value={`${updateData?.receipientName?.first_name || ''} ${
                    updateData?.receipientName?.last_name || ''
                  }`.trim()}
                />

                <ShowUpdateData
                  isVisible={updateData?.shipName}
                  title={`${t('Ship')}:`}
                  value={updateData?.shipName?.name}
                />

                <ShowUpdateData
                  isVisible={updateData?.status}
                  title={`${t('Status')}:`}
                  value={updateData?.status?.name}
                />

                <ShowUpdateData
                  isVisible={updateData?.type}
                  title={`${t('Type')}:`}
                  value={updateData?.type?.name}
                />

                <ShowUpdateData
                  isVisible={!!updateData?.location || !!responseData?.[0]?.shelf}
                  title={`${t('Location')}:`}
                  value={updateData?.location || responseData?.[0]?.shelf}
                />

                <ShowUpdateData
                  isVisible={!!updateData?.message}
                  title={`${t('Message')}:`}
                  value={updateData?.message}
                />
              </View>

              {/* Submit / OK Button */}
              <TouchableOpacity
                style={styles.buttonTextStyle}
                onPress={() => {
                  setVisible(false);
                  onCloseSuccessModal && onCloseSuccessModal();
                }}>
                <Text style={styles.successButtonText}>{t('OK')}</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const ShowUpdateData = ({ isVisible, title, value }: any) => {
  if (!isVisible || !value) return null;
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoCell}>
        <Text numberOfLines={1} style={styles.infoTitle}>
          {title}
        </Text>
      </View>
      <View style={styles.infoCell}>
        <Text numberOfLines={1} style={styles.infoValue}>
          {value}
        </Text>
      </View>
    </View>
  );
};

const TrackingValue = ({ item, isLast }: any) => {
  return (
    <View style={[styles.rowOrder, isLast && styles.noBorderBottom]}>
      <View style={styles.trackingCell}>
        <Text
          numberOfLines={1}
          ellipsizeMode="middle"
          style={styles.descTitle}>
          {sortTrackingNumber(item?.tracking_no || '')}
        </Text>
      </View>
      <View style={styles.tagCell}>
        <Text numberOfLines={1} style={styles.descVal}>
          {item?.tag_number || '-'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderTopLeftRadius: isIPad ? 30 : 20,
    borderTopRightRadius: isIPad ? 30 : 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    width: '100%',
    maxHeight: isIPad ? '85%' : '80%',
  },
  initialContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    width: '100%',
  },
  scrollView: {
    width: '100%',
  },
  scrollContent: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: isIPad ? 35 : 20,
    paddingBottom: 20,
  },
  crossViewPhone: {
    height: 44,
    width: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F4F4',
    alignSelf: 'flex-end',
    marginRight: 15,
    marginTop: 5,
  },
  crossViewPad: {
    height: 60,
    width: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F4F4',
    alignSelf: 'flex-end',
    marginRight: 30,
    marginTop: 10,
  },
  closeImg: {
    height: isIPad ? 18 : 12,
    width: isIPad ? 18 : 12,
    tintColor: '#000000',
  },
  simTitle: {
    fontSize: isIPad ? 32 : 20,
    color: '#223890',
    fontFamily: FONTS.RICORDOSemiBold,
    textAlign: 'center',
    marginTop: 5,
  },
  ascentMessage: {
    fontSize: isIPad ? 24 : 15,
    textAlign: 'center',
    color: '#000000',
    fontFamily: FONTS.RICORDOSemiBold,
    marginVertical: isIPad ? 8 : 2,
  },
  deptMessage: {
    fontSize: isIPad ? 20 : 14,
    textAlign: 'center',
    color: '#6F7884',
    fontFamily: FONTS.RICORDORegular,
    marginBottom: 15,
  },
  cardContainer: {
    width: '100%',
    backgroundColor: '#F4F4F4',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    fontSize: isIPad ? 22 : 16,
    color: '#000000',
    textAlign: 'center',
    fontFamily: FONTS.RICORDOSemiBold,
  },
  rowOrder: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  noBorderBottom: {
    borderBottomWidth: 0,
  },
  trackingCell: {
    flex: 1,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagCell: {
    flex: 1,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  descTitle: {
    fontSize: isIPad ? 20 : 15,
    color: '#000000',
    textAlign: 'center',
    fontFamily: FONTS.RICORDORegular,
  },
  descVal: {
    fontSize: isIPad ? 20 : 15,
    color: '#000000',
    textAlign: 'center',
    fontFamily: FONTS.RICORDOSemiBold,
  },
  infoSection: {
    width: '100%',
  },
  infoCard: {
    width: '100%',
    backgroundColor: '#F4F4F4',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  infoCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  infoTitle: {
    fontSize: isIPad ? 20 : 15,
    color: '#223890',
    fontFamily: FONTS.RICORDOSemiBold,
    textAlign: 'center',
  },
  infoValue: {
    fontSize: isIPad ? 20 : 15,
    color: '#000000',
    fontFamily: FONTS.RICORDORegular,
    textAlign: 'center',
  },
  buttonTextStyle: {
    borderRadius: 40,
    backgroundColor: '#FDBE6F',
    paddingVertical: isIPad ? 20 : 14,
    marginVertical: isIPad ? 20 : 12,
    width: isIPad ? width * 0.7 : width * 0.85,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successButtonText: {
    color: '#FFFFFF',
    fontSize: isIPad ? 24 : 18,
    fontFamily: FONTS.RICORDOSemiBold,
  },
  icon: {
    width: isIPad ? width * 0.3 : width * 0.4,
    height: isIPad ? width * 0.3 : width * 0.4,
    marginHorizontal: 5,
  },
  title: {
    fontSize: isIPad ? 35 : 20,
    fontFamily: 'OpenSans-Bold',
    marginBottom: isIPad ? 10 : 5,
    color: '#000000',
    textAlign: 'center',
  },
  messageText: {
    fontSize: isIPad ? 22 : 16,
    fontFamily: FONTS.RICORDORegular,
    color: '#000000',
    textAlign: 'center',
  },
});

export default LottieModal;