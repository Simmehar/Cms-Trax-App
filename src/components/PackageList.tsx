import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  Platform,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FONTS, IMAGES } from '../assets';
import { isIPad as defaultIsIpad } from '../utilities/securestorage';
import dayjs from 'dayjs';
import { sortTrackingNumber } from '../functions/SortTrackingNumber';
import FastImage from 'react-native-fast-image';
import { useMode } from '../db/db.context';
import { useTranslation } from 'react-i18next';
import i18n from '../localization/i18n';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { LoadImage } from './LoadImage';

const { width, height } = Dimensions.get('window');
const minDimension = Math.min(width, height);
const isTablet = (Platform.OS === 'ios' && Platform.isPad) || minDimension >= 600 || defaultIsIpad;
dayjs.extend(customParseFormat);

interface Ship {
  id: number;
  name: string;
  company_id: string;
  company_name: string;
}

interface User {
  id: number;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string;
  ship: string;
  ship_id: string;
  department_id: string;
  department_name: string;
  payable_amount: string;
  is_active: boolean;
  crewid?: string;
}

export interface PackageType {
  id: number;
  name: string;
  price: string;
}

interface PackageTracking {
  id: number;
  current_status: string;
  created_at: string;
  done_by_user: string;
  log_type: string;
}

interface PackageImage {
  url: string;
  local_url?: string;
  log_type: string;
}

export interface Package {
  id: number;
  tracking_no: string;
  carrier: string;
  tag_number: string;
  shelf: string;
  condition: string;
  current_status: string;
  date_received: string;
  date_delivered: string | null;
  is_paid: boolean;
  ship: Ship;
  user: User;
  port: any;
  package_type: PackageType;
  package_tracking: PackageTracking[];
  images: PackageImage[];
  isSelect: boolean;
  synced?: 0 | 1;
  updated_at?: string;
}

interface PackageListProps {
  packages: Package[];
  onItemPress: (item: Package, index: number) => void;
  onArrowClick: (value: Package) => void;
  onscoll?: any;
  isRecent: boolean;
  showLoader: any;
  refetching: boolean;
  showSync: boolean;
  refetchData?: any;
  loadMoreData?: any;
  totalItems: any;
  page: any;
}

const PackageList = React.memo(({
  packages,
  onItemPress,
  onArrowClick,
  isRecent,
  showLoader,
  refetching,
  showSync,
  loadMoreData,
  totalItems,
  page,
  onscoll,
}: PackageListProps) => {
  const { t } = useTranslation();
  const [isHospitality, setIsHospitality] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchBusinessType = async () => {
      try {
        const storedType = await AsyncStorage.getItem('BUSINESS_TYPE');
        setIsHospitality(storedType === 'hotels-and-hospitality');
      } catch (e) {
        console.warn('Error reading BUSINESS_TYPE in PackageList', e);
      }
    };
    fetchBusinessType();
  }, []);

  const formatUpdatedAt = (
    dateString?: string | null,
  ): { date: string; time: string } => {
    if (!dateString) {
      return { date: '--', time: '' };
    }

    const formats = [
      'MMMM D,YYYY hh:mm A',
      'MMMM DD,YYYY hh:mm A',
      'MMMM D, YYYY hh:mm A',
      'MMMM DD, YYYY hh:mm A',
      'MMMM D,YYYY',
      'MMMM DD,YYYY',
      'MMMM D, YYYY',
      'MMMM DD, YYYY',
      'YYYY-MM-DD HH:mm:ss',
    ];

    const date = dayjs(dateString.trim(), formats, true);

    if (!date.isValid()) {
      return { date: dateString, time: '' };
    }

    return {
      date: date.format('MMM D,YYYY'),
      time: dateString.match(/\d{1,2}:\d{2}\s*(AM|PM)/i)
        ? date.format('hh:mm A')
        : '',
    };
  };

  const sortShipName = (str: string) => {
    if (!str) return '';
    if (str.length >= 22) {
      const start = str.substring(0, 11);
      const end = str.substring(str.length - 11);
      return `${start}...${end}`;
    }
    return str;
  };

  // --- NAYA HOSPITALITY CARD DESIGN (Fully Responsive) ---
  const renderHospitalityCard = (item: Package, index: number) => {
    const firstImg = item?.images?.[0];
    let rawUrl = firstImg?.local_url || firstImg?.url;
    const formattedUrl =
      rawUrl && !rawUrl.startsWith('http') && !rawUrl.startsWith('file://')
        ? `file://${rawUrl}`
        : rawUrl;

    const updatedDateTime = formatUpdatedAt(item?.updated_at);
    const isActive = item?.user?.is_active ?? true;

    return (
      <View
        key={item.id?.toString() || index.toString()}
        style={[
          hStyles.cardContainer,
          item?.isSelect && hStyles.cardSelectedBorder,
        ]}>

        {/* Top Header Row */}
        <View style={hStyles.topSection}>
          {/* Item Image with Click to Zoom using LoadImage */}
          <TouchableOpacity
            style={hStyles.imageWrapper}
            activeOpacity={formattedUrl ? 0.7 : 1}
            disabled={!formattedUrl}
            onPress={() => formattedUrl && setSelectedImageUrl(formattedUrl)}>
            {formattedUrl ? (
              <LoadImage
                source={{ uri: formattedUrl }}
                style={hStyles.thumbImage}
                resizeMode={FastImage.resizeMode.cover}
              />
            ) : (
              <View style={[hStyles.thumbImage, hStyles.imagePlaceholder]}>
                <Image source={IMAGES.box || IMAGES.check} style={hStyles.placeholderIcon} />
              </View>
            )}
          </TouchableOpacity>

          {/* User Name & Status */}
          <View style={hStyles.userInfo}>
            <Text
              style={hStyles.userName}
              numberOfLines={2}
              maxFontSizeMultiplier={1.2}>
              {`${item?.user?.first_name || ''} ${item?.user?.last_name || ''}`.trim() || 'No Name'} / {item?.user?.crewid || ''}
            </Text>

            {/* <View style={hStyles.badgeRow}>
              {isActive ? (
                <View style={hStyles.activeBadge}>
                  <Text style={hStyles.dollarPrefix} maxFontSizeMultiplier={1.2}>$</Text>
                  <Text style={hStyles.activeBadgeText} maxFontSizeMultiplier={1.2}>{t('Active')}</Text>
                </View>
              ) : (
                <View style={hStyles.inactiveBadge}>
                  <Text style={hStyles.inactiveBadgeText} maxFontSizeMultiplier={1.2}>{t('Inactive')}</Text>
                </View>
              )}
            </View> */}
          </View>

          {/* Checkbox */}
          <TouchableOpacity
            style={[hStyles.checkbox, item?.isSelect && hStyles.checkboxActive]}
            onPress={() => onItemPress && onItemPress(item, index)}
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            {item?.isSelect && (
              <Image source={IMAGES.check} style={hStyles.checkIcon} />
            )}
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={hStyles.divider} />

        {/* Bottom Details Row */}
        <View style={hStyles.bottomSection}>
          {/* Location */}
          <View style={hStyles.locColumn}>
            <Text
              style={hStyles.metaLabel}
              numberOfLines={1}
              maxFontSizeMultiplier={1.15}>
              {t('Location')}
            </Text>
            <Text
              style={hStyles.metaValue}
              numberOfLines={1}
              ellipsizeMode="tail"
              maxFontSizeMultiplier={1.2}>
              {`${item?.shelf || '-'}`}
            </Text>
          </View>

          {/* ID */}
          <TouchableOpacity
            style={hStyles.idColumn}
            onPress={() => onArrowClick(item)}
            activeOpacity={0.65}
            accessibilityRole="link"
            accessibilityLabel={`${t('ID')} ${sortTrackingNumber(item?.tracking_no || '')}`}>
            <Text
              style={[hStyles.metaLabel, hStyles.textCenter]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.15}>
              {t('ID')}
            </Text>
            <Text
              style={hStyles.metaValueLink}
              numberOfLines={1}
              ellipsizeMode="middle"
              maxFontSizeMultiplier={1.2}>
              {sortTrackingNumber(item?.tracking_no || '') || '-'}
            </Text>
          </TouchableOpacity>

          {/* Last Updated */}
          <View style={hStyles.dateColumn}>
            <Text
              style={[hStyles.metaLabel, hStyles.textRight]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.15}>
              {t('Last updated')}
            </Text>
            <Text
              style={hStyles.metaValueDate}
              numberOfLines={1}
              maxFontSizeMultiplier={1.2}>
              {updatedDateTime.date}
            </Text>
            {!!updatedDateTime.time && (
              <Text
                style={hStyles.metaValueTime}
                numberOfLines={1}
                maxFontSizeMultiplier={1.2}>
                {updatedDateTime.time}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  // --- DEFAULT CARD DESIGN ---
  const renderDefaultCard = (item: Package, index: number) => {
    return (
      <View
        style={[
          styles.itemContainer,
          {
            backgroundColor: item?.isSelect ? '#EFF9FF' : '#FAFAFA',
            flex: isTablet ? 1 : undefined,
            marginHorizontal: isTablet ? 2.5 : 5,
          },
        ]}>
        <View style={styles.itemHeader}>
          <View style={styles.rowView}>
            <Image
              source={
                parseFloat(item?.user?.payable_amount) > 0
                  ? IMAGES.unpaidIcon$
                  : IMAGES.green$
              }
              style={styles.doller}
            />
            <Text
              style={[
                styles.itemName,
                { fontSize: isTablet ? 28 : 18 },
              ]}>{`${item?.user?.first_name} ${item?.user?.last_name}`}</Text>

            {!item?.user?.is_active && isTablet && (
              <View style={styles.inactiveTag}>
                <Text style={styles.inactiveTagText}>{t('Inactive')}</Text>
              </View>
            )}
          </View>

          {onItemPress && (
            <TouchableOpacity
              style={[
                item?.isSelect ? styles.selectBox : styles.unSelectBox,
                { padding: 12 },
              ]}
              onPress={() => onItemPress(item, index)}>
              {item?.isSelect ? (
                <Image
                  source={IMAGES.check}
                  style={{ height: isTablet ? 13 : 9, width: isTablet ? 18 : 13, tintColor: 'white' }}
                />
              ) : null}
            </TouchableOpacity>
          )}
        </View>

        {!item?.user?.is_active && !isTablet && (
          <View style={styles.inactiveTagMobile}>
            <Text style={styles.inactiveTagMobileText}>{t('Inactive')}</Text>
          </View>
        )}

        <View style={{ flexDirection: isTablet ? 'row' : 'column' }}>
          <View style={{ width: isTablet ? '50%' : '100%' }}>
            <View style={styles.detailcontainer}>
              <Text style={[styles.label, { fontSize: isTablet ? 23 : 18 }]}>
                {t('Loc/Tag')}:
              </Text>
              <Text style={[styles.value, { fontSize: isTablet ? 23 : 18 }]}>
                {sortShipName(`${item?.shelf}/${item.tag_number}`)}
              </Text>
            </View>

            <View style={styles.detailcontainer}>
              <Text style={[styles.label, { fontSize: isTablet ? 23 : 18 }]}>
                {t('Tracking#')}:
              </Text>
              <Text style={styles.value}>
                {sortTrackingNumber(item.tracking_no || '')}
              </Text>
            </View>

            <View style={styles.detailcontainer}>
              <Text style={styles.label}>{t('Ship')}:</Text>
              <Text
                style={[
                  styles.value,
                  { width: isTablet ? '100%' : 'auto', fontSize: isTablet ? 23 : 18 },
                ]}
                numberOfLines={1}>
                {sortShipName(item?.ship?.name || (item as any)?.ship_name)}
              </Text>
            </View>
          </View>

          {isTablet && (
            <View style={[styles.rowView, { marginTop: 0, width: '50%' }]}>
              {item?.images && item?.images.length > 0 ? (
                item.images.map((val: any, imgIndex: number) => {
                  let rawUrl = val?.local_url ? val?.local_url : val?.url;
                  const formattedUrl =
                    rawUrl && !rawUrl.startsWith('http') && !rawUrl.startsWith('file://')
                      ? `file://${rawUrl}`
                      : rawUrl;

                  return (
                    <TouchableOpacity
                      key={imgIndex.toString()}
                      activeOpacity={formattedUrl ? 0.7 : 1}
                      disabled={!formattedUrl}
                      onPress={() => formattedUrl && setSelectedImageUrl(formattedUrl)}>
                      <View style={{ height: 70, width: 70, marginHorizontal: 5 }}>
                        {formattedUrl ? (
                          <LoadImage
                            source={{ uri: formattedUrl }}
                            style={styles.imagView}
                            resizeMode={FastImage.resizeMode.cover}
                          />
                        ) : (
                          <View style={[styles.imagView, hStyles.imagePlaceholder]}>
                            <Image source={IMAGES.box} style={hStyles.placeholderIcon} />
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View>
                  <Text>No images available</Text>
                </View>
              )}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.arrowButton}
          onPress={() => onArrowClick(item)}>
          <Image source={IMAGES.right_yellow_arrow} style={styles.arrow} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderItem = useCallback(
    ({ item, index }: { item: Package; index: number }) => {
      return isHospitality
        ? renderHospitalityCard(item, index)
        : renderDefaultCard(item, index);
    },
    [isHospitality, onItemPress, onArrowClick],
  );

  const renderEmptyList = () => (
    <View style={styles.emptyListContainer}>
      <Image
        source={
          isHospitality
            ? IMAGES.package.servicenotfound
            : i18n.language === 'en'
              ? IMAGES.package.packagesnotfound
              : IMAGES.package.packagesnotfoundspain
        }
        style={styles.emptyListImage}
      />
    </View>
  );

  return (
    <>
      <FlatList
        showsVerticalScrollIndicator={false}
        keyExtractor={(item, index) => (item?.id ? item.id.toString() : index.toString())}
        key={'_'}
        style={{ marginTop: 15, marginHorizontal: isTablet ? 10 : 0 }}
        data={packages || []}
        onEndReached={loadMoreData}
        maxToRenderPerBatch={10}
        onEndReachedThreshold={0.5}
        removeClippedSubviews={true}
        ListFooterComponent={
          page * 10 < totalItems ? (
            <ActivityIndicator size="large" color="black" />
          ) : null
        }
        initialNumToRender={5}
        windowSize={10}
        numColumns={1}
        renderItem={renderItem}
        contentContainerStyle={{ paddingTop: 10, paddingBottom: 20 }}
        ListEmptyComponent={
          showLoader ? (
            <ActivityIndicator color={'black'} size={'large'} />
          ) : (
            renderEmptyList
          )
        }
        onScroll={onscoll}
        scrollEventThrottle={16}
        refreshing={refetching}
      />

      {/* FULL PREVIEW MODAL */}
      <Modal
        visible={!!selectedImageUrl}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImageUrl(null)}>
        <View style={modalStyles.modalOverlay}>
          <TouchableOpacity
            style={modalStyles.backdropTouchable}
            activeOpacity={1}
            onPress={() => setSelectedImageUrl(null)}
          />

          <TouchableOpacity
            style={modalStyles.closeButton}
            onPress={() => setSelectedImageUrl(null)}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
            <Text style={modalStyles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          {selectedImageUrl && (
            <LoadImage
              source={{ uri: selectedImageUrl }}
              style={modalStyles.fullImage}
              resizeMode={FastImage.resizeMode.contain}
            />
          )}
        </View>
      </Modal>
    </>
  );
});

// --- MODAL STYLES ---
const modalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdropTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 24,
    right: 20,
    zIndex: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  fullImage: {
    width: width * 0.92,
    height: height * 0.75,
  },
});

// --- HOSPITALITY CARD STYLES ---
const hStyles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 12,
    borderWidth: 1.2,
    borderColor: '#ECEEF5',
    shadowColor: '#2B3B61',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardSelectedBorder: {
    borderColor: '#5B4EF0',
    backgroundColor: '#F9F8FF',
  },
  topSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    marginRight: 10,
    flexShrink: 0,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    width: 22,
    height: 22,
    tintColor: '#9CA3AF',
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 8,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 3,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  dollarPrefix: {
    color: '#16A34A',
    fontSize: 11,
    fontWeight: '700',
    marginRight: 2,
  },
  activeBadgeText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '600',
  },
  inactiveBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  inactiveBadgeText: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '500',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#D4D7E2',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  checkboxActive: {
    backgroundColor: '#5B4EF0',
    borderColor: '#5B4EF0',
  },
  checkIcon: {
    width: 11,
    height: 8,
    tintColor: '#FFFFFF',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F8',
    marginVertical: 10,
  },
  bottomSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
  },
  locColumn: {
    flex: 0.9,
    alignItems: 'flex-start',
    paddingRight: 4,
  },
  idColumn: {
    flex: 0.9,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  dateColumn: {
    flex: 1.25,
    alignItems: 'flex-end',
    paddingLeft: 4,
  },
  metaLabel: {
    fontSize: 11,
    color: '#223890',
    marginBottom: 3,
    fontWeight: '500',
  },
  textCenter: {
    textAlign: 'center',
  },
  textRight: {
    textAlign: 'right',
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  metaValueLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2456C5',
    textDecorationLine: 'underline',
    textAlign: 'center',
    maxWidth: '100%',
  },
  metaValueDate: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'right',
  },
  metaValueTime: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'right',
  },
});

// --- PURANE DEFAULT STYLES ---
const styles = StyleSheet.create({
  itemContainer: {
    backgroundColor: '#FAFAFA',
    marginBottom: isTablet ? 15 : 5,
    marginHorizontal: 5,
    paddingHorizontal: isTablet ? 20 : 10,
    paddingVertical: isTablet ? 17 : 13,
    borderRadius: 16,
    paddingBottom: 25,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  rowView: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontFamily: FONTS.RICORDOBold,
    color: '#002B45',
  },
  inactiveTag: {
    backgroundColor: '#FFAF4A',
    borderRadius: 20,
    marginLeft: 10,
    marginVertical: 3,
    alignSelf: 'flex-start',
    paddingHorizontal: 5,
  },
  inactiveTagText: {
    fontSize: isTablet ? 18 : 14,
    color: 'white',
    paddingHorizontal: 5,
    paddingVertical: 3,
    fontFamily: FONTS.RICORDOSemiBold,
  },
  inactiveTagMobile: {
    backgroundColor: '#FFAF4A',
    borderRadius: 20,
    marginRight: 10,
    marginVertical: 3,
    alignSelf: 'flex-start',
    paddingHorizontal: 5,
  },
  inactiveTagMobileText: {
    fontSize: 14,
    color: 'white',
    paddingHorizontal: 5,
    paddingVertical: 3,
    fontFamily: FONTS.RICORDOSemiBold,
  },
  label: {
    fontSize: isTablet ? 23 : 18,
    fontFamily: FONTS.RICORDOSemiBold,
    color: '#223890',
    fontWeight: '400',
  },
  value: {
    fontSize: isTablet ? 23 : 18,
    color: 'black',
    fontFamily: FONTS.RICORDOSemiBold,
    marginLeft: 5,
    fontWeight: '400',
  },
  arrowButton: {
    position: 'absolute',
    right: isTablet ? 15 : 10,
    top: '70%',
  },
  arrowText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: isTablet ? 25 : 18,
  },
  detailcontainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: isTablet ? 5 : 0,
  },
  emptyListContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyListImage: {
    width: 400,
    height: 500,
    marginBottom: 5,
  },
  doller: {
    height: isTablet ? 28 : 20,
    width: isTablet ? 28 : 20,
    marginRight: 8.5,
  },
  selectBox: {
    height: isTablet ? 35 : 22,
    width: isTablet ? 35 : 22,
    borderRadius: 4,
    backgroundColor: '#223890',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unSelectBox: {
    height: isTablet ? 35 : 22,
    width: isTablet ? 35 : 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D6D6D6',
    backgroundColor: 'white',
  },
  arrow: {
    height: isTablet ? 65 : 48,
    width: isTablet ? 65 : 48,
  },
  imagView: {
    height: '100%',
    width: '100%',
    marginRight: 10,
    borderRadius: 8,
  },
});

export { PackageList };