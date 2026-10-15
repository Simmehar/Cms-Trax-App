/**
 * AddPackageModal.tsx
 *
 * Changes in this version:
 *  • OCR button and Scanner Modal REMOVED — scanner now lives in Home screen
 *  • capturedImagePath prop: when set, image uploads immediately to slot 1
 *  • backgroundExtracted prop: when Gemini finishes in background, fields auto-populate
 *  • isBackgroundProcessing prop: shows subtle loading indicator on form
 *  • All other behaviour (validation, image slots, ShipListModal, etc.) UNCHANGED
 */

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, FONTS, IMAGES } from '../assets';
import { InputPicker } from './InputPicker';
import { isIPad } from '../utilities/securestorage';
import { ShipListModal } from './ShipListModal';
import { open } from './CameraController';
import { PackageType } from './PackageList';
import {
  CarrierObj,
  PackageConditionType,
  usePackageContext,
  Ships,
  RecipentObj,
} from '../contexts/packagecontext';
import { deleteImg, uploadImg } from '../utilities/ApiCalls';
import { useAuth } from '../contexts';
import tnv from 'tracking-number-validation';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { GeminiExtractionResult } from './SmartDocumentScanner';
import { useTranslation } from 'react-i18next';

// ─────────────────────────────────────────────────────────────
// CARRIER NAME NORMALISER
// ─────────────────────────────────────────────────────────────
const CARRIER_ALIASES: Record<string, string> = {
  amazon: 'Amazon',
  'amazon.com': 'Amazon',
  fedex: 'FedEx',
  'fed ex': 'FedEx',
  ups: 'UPS',
  usps: 'US Postal Service',
  'us postal': 'US Postal Service',
  'united states postal': 'US Postal Service',
  dhl: 'DHL',
};

function normaliseCarrierName(raw: string): string {
  if (!raw) return '';
  const key = raw.toLowerCase().trim();
  for (const [alias, canonical] of Object.entries(CARRIER_ALIASES)) {
    if (key.includes(alias)) return canonical;
  }
  return raw;
}

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
interface packageImages {
  image1: string;
  image2: string;
  image3: string;
}

export interface packageOption {
  trackingId: string;
  type: PackageType;
  condition: PackageConditionType;
  carrier: CarrierObj;
  message: string;
  imagesObj: packageImages;
  ocrText?: string;
  geminiData?: GeminiExtractionResult;
  id?: string | number;
}

interface ImageSlot {
  localUri: string;  // Local file path for immediate UI preview
  remoteUrl: string; // Server URL after uploading on Save
}

interface packageModalProps {
  isVisible: boolean;
  onSetVisible: () => void;
  onSubmitPackage: (value: packageOption) => void;
  packageValue: any;
  setPackageValue: (val: any) => void;
  onOcrTextReady?: (text: string) => void;
  onGeminiExtracted?: (data: GeminiExtractionResult) => void;
  capturedImagePath?: string | null;
  isBackgroundProcessing?: boolean;
  backgroundExtracted?: GeminiExtractionResult | null;
  shipName?: Ships | null;
  receipientName?: RecipentObj | null;
  location?: string;
}

// ─────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────
const AddPackageModal: React.FC<packageModalProps> = ({
  isVisible,
  onSetVisible,
  onSubmitPackage,
  packageValue,
  setPackageValue,
  onOcrTextReady,
  onGeminiExtracted,
  capturedImagePath,
  isBackgroundProcessing,
  backgroundExtracted,
  shipName,
  receipientName,
  location,
}) => {
  const [isModalVisible, setModalVisible] = useState(false);
  const [pickerType, setPickerType] = useState('');

  const [trackingId, setTrackingId] = useState('');
  const [status, setStatus] = useState<PackageType | null>(null);
  const [type, setType] = useState<PackageType | null>(null);
  const [condition, setCondition] = useState<PackageConditionType | null>(null);
  const [carrier, setCarrier] = useState<CarrierObj | null>(null);
  const [message, setMessage] = useState('');
  const [ocrText, setOcrText] = useState('');
  const [geminiData, setGeminiData] = useState<GeminiExtractionResult | null>(null);

  // Staged images state (slots 1, 2, 3)
  const [images, setImages] = useState<Record<number, ImageSlot>>({
    1: { localUri: '', remoteUrl: '' },
    2: { localUri: '', remoteUrl: '' },
    3: { localUri: '', remoteUrl: '' },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user } = useAuth();
  const { carriers } = usePackageContext();
  const { t } = useTranslation();

  // ── Populate form when editing an existing package ────────
  useEffect(() => {
    if (packageValue?.trackingId) {
      const { carrier, condition, imagesObj, trackingId, type, status, message } = packageValue;
      setTrackingId(trackingId);
      setStatus(status);
      setType(type);
      setCondition(condition);
      setCarrier(carrier);
      setMessage(message);

      // Populate remote URLs into state for existing packages
      setImages({
        1: { localUri: imagesObj?.image1 || '', remoteUrl: imagesObj?.image1 || '' },
        2: { localUri: imagesObj?.image2 || '', remoteUrl: imagesObj?.image2 || '' },
        3: { localUri: imagesObj?.image3 || '', remoteUrl: imagesObj?.image3 || '' },
      });
    } else {
      clearData();
    }
  }, [packageValue]);

  // ── Auto-detect carrier from tracking ID ──
  const detectCarrierFromId = (id: string): CarrierObj | undefined => {
    if (!id) return undefined;
    const courier = tnv.getCourier(id);
    let name = 'Other';

    if (courier && courier.length > 0) {
      const map: Record<string, string> = {
        fedex: 'FedEx',
        usps: 'US Postal Service',
        ups: 'UPS',
        dhl: 'DHL',
      };
      name = map[courier[0]] ?? 'Other';
    }

    const found = carriers?.find(c => c.name === name);
    const other = carriers?.find(c => c.name === 'Other');
    return found || other || { id: 1, name: 'Other' };
  };

  useEffect(() => {
    if (trackingId.length > 0 && !geminiData?.carrier) {
      setCarrier(detectCarrierFromId(trackingId) ?? null);
    } else if (!trackingId && !geminiData?.carrier) {
      setCarrier(null);
    }
  }, [trackingId]); // eslint-disable-line

  // ─────────────────────────────────────────────────────────
  // ✅ Instantly stage captured image to Slot 1 locally
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (capturedImagePath) {
      setImages(prev => ({
        ...prev,
        1: { localUri: capturedImagePath, remoteUrl: '' },
      }));
    }
  }, [capturedImagePath]);

  // ─────────────────────────────────────────────────────────
  // ✅ Populate fields when background Gemini extraction arrives
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!backgroundExtracted) return;

    setGeminiData(backgroundExtracted);
    if (onGeminiExtracted) onGeminiExtracted(backgroundExtracted);

    const rawTn = backgroundExtracted.tracking_number;
    const tn = rawTn ? rawTn.replace(/\s/g, '') : '';

    if (tn && !trackingId) {
      setTrackingId(tn);
    }

    if (backgroundExtracted.carrier?.trim()) {
      const normalisedName = normaliseCarrierName(backgroundExtracted.carrier);
      const matchedCarrier = carriers?.find(
        c => c.name.toLowerCase() === normalisedName.toLowerCase(),
      );

      if (matchedCarrier) {
        setCarrier(matchedCarrier);
      } else {
        const otherObj = carriers?.find(c => c.name === 'Other') || { id: 1, name: 'Other' };
        setCarrier(otherObj);
      }
    }
  }, [backgroundExtracted, carriers]); // eslint-disable-line

  // ─────────────────────────────────────────────────────────
  // LOCAL IMAGE SELECTION (NO IMMEDIATE API UPLOAD)
  // ─────────────────────────────────────────────────────────
  const selectMedia = (key: number) => {
    open((response: any) => {
      if (!response.path) return;

      // Update local URI immediately for instant preview display
      setImages(prev => ({
        ...prev,
        [key]: { localUri: response.path, remoteUrl: '' },
      }));
    });
  };

  const onDeleteImg = async (key: number) => {
    const slot = images[key];
    // If it was an already uploaded remote image, clean it up on server
    if (slot?.remoteUrl && user) {
      deleteImg(user, { image_name: slot.remoteUrl }).catch(err =>
        console.warn('Failed to delete remote image:', err)
      );
    }
    // Clear slot locally
    setImages(prev => ({
      ...prev,
      [key]: { localUri: '', remoteUrl: '' },
    }));
  };

  // ─────────────────────────────────────────────────────────
  // CLEAR DATA
  // ─────────────────────────────────────────────────────────
  const clearData = () => {
    setPickerType('');
    setTrackingId('');
    setType(null);
    setCondition(null);
    setCarrier(null);
    setStatus(null);
    setMessage('');
    setOcrText('');
    setGeminiData(null);
    setPackageValue(null);
    setImages({
      1: { localUri: '', remoteUrl: '' },
      2: { localUri: '', remoteUrl: '' },
      3: { localUri: '', remoteUrl: '' },
    });
  };

  // ─────────────────────────────────────────────────────────
  // SUBMIT WITH PARALLEL UPLOAD ON SAVE
  // ─────────────────────────────────────────────────────────
  const onSubmit = async () => {
    // 1. Field Validations
    const missingFields: string[] = [];
    if (!trackingId?.trim()) missingFields.push('Tracking ID');
    if (!type) missingFields.push('Type');
    if (!status) missingFields.push('Status');
    if (!condition) missingFields.push('Condition');
    if (!carrier) missingFields.push('Carrier');

    const hasAnyImage = Boolean(images[1].localUri || images[2].localUri || images[3].localUri);
    if (!hasAnyImage) missingFields.push('Image (at least 1)');

    if (missingFields.length > 0) {
      Alert.alert(
        t('Please select'),
        missingFields.map(field => t(field)).join(', ')
      );
      return;
    }

    try {
      setIsSubmitting(true);

      // 2. Upload pending local images in parallel
      const uploadPromises = [1, 2, 3].map(async key => {
        const slot = images[key];

        // If no image in this slot, return empty string
        if (!slot.localUri) return { key, url: '' };

        // If image is already uploaded remotely, reuse existing URL
        if (slot.remoteUrl) return { key, url: slot.remoteUrl };

        // Upload local file to server
        const formData = new FormData();
        formData.append('image', {
          name: `package_img_${key}.jpg`,
          type: 'image/jpeg',
          uri: slot.localUri,
        } as any);

        const imgRes = await uploadImg(user, formData);
        return { key, url: imgRes?.image_url || '' };
      });

      const uploadResults = await Promise.all(uploadPromises);

      // 3. Construct final image URLs payload
      const finalImagesObj: packageImages = {
        image1: uploadResults.find(r => r.key === 1)?.url || '',
        image2: uploadResults.find(r => r.key === 2)?.url || '',
        image3: uploadResults.find(r => r.key === 3)?.url || '',
      };

      // 4. Construct Final Object & Send to Parent
      const obj: packageOption = packageValue?.id
        ? {
            trackingId,
            type: type!,
            status,
            condition: condition!,
            carrier: carrier!,
            message,
            imagesObj: finalImagesObj,
            id: packageValue.id,
            ocrText,
            geminiData: geminiData ?? undefined,
          }
        : {
            trackingId,
            type: type!,
            status,
            condition: condition!,
            carrier: carrier!,
            message,
            imagesObj: finalImagesObj,
            ocrText,
            geminiData: geminiData ?? undefined,
          };

      setIsSubmitting(false);
      onSetVisible();
      onSubmitPackage(obj);
      clearData();
    } catch (err) {
      setIsSubmitting(false);
      console.error('[AddPackageModal] Submit Error:', err);
      Alert.alert(t('Error'), t('Failed to upload package images. Please try again.'));
    }
  };

  const onPickerClick = (typeStr: string) => {
    setModalVisible(true);
    setPickerType(typeStr);
  };

  if (!isVisible) return null;

  return (
    <View style={styles.modalContainer}>
      <View style={styles.modalContent}>
        {/* Close Button */}
        <TouchableOpacity
          style={isIPad ? styles.crossViewI : styles.crossView}
          disabled={isSubmitting}
          onPress={() => {
            onSetVisible();
            setPackageValue(null);
            clearData();
          }}
        >
          <Image source={IMAGES.close} style={isIPad ? styles.closeImgI : styles.closeImg} />
        </TouchableOpacity>

        {/* Header Info */}
        <View style={styles.headerInfoContainer}>
          <View style={styles.headerInfoRow}>
            <View style={styles.headerInfoBox}>
              <Text style={styles.headerLabel}>{t('Ship')}</Text>
              <Text style={styles.headerValue}>{shipName?.name || t('Not selected')}</Text>
            </View>

            <View style={[styles.headerInfoBox, { marginLeft: 10 }]}>
              <Text style={styles.headerLabel}>{t('Recipient')}</Text>
              <Text style={styles.headerValue}>
                {receipientName
                  ? `${receipientName.first_name} ${receipientName.last_name}`
                  : t('Not selected')}
              </Text>
            </View>
          </View>

          {location && (
            <View style={styles.locationBox}>
              <Text style={styles.headerLabel}>{t('Location')}</Text>
              <Text style={styles.headerValue}>{location}</Text>
            </View>
          )}
        </View>

        <ShipListModal
          visible={isModalVisible}
          onClose={() => setModalVisible(false)}
          activeTab={pickerType}
          getValue={(val: any) => {
            if (pickerType === 'Type') setType(val);
            else if (pickerType === 'Status') setStatus(val);
            else if (pickerType === 'Condition') setCondition(val);
            else if (pickerType === 'Carrier') setCarrier(val);
          }}
          setInitialVals={
            !packageValue?.trackingId && {
              type,
              setType,
              condition,
              setCondition,
              carrier,
              setCarrier,
              status,
              setStatus,
            }
          }
        />

        <KeyboardAwareScrollView>
          <TouchableOpacity activeOpacity={1}>
            {/* Processing banner */}
            {isBackgroundProcessing && (
              <View style={styles.processingBanner}>
                <ActivityIndicator size="small" color="#223890" style={{ marginRight: 8 }} />
                <Text style={styles.processingTxt}>
                  {t('Extracting label data in background...')}
                </Text>
              </View>
            )}

            {/* Inputs */}
            <InputPicker
              isPicker={false}
              maxLength={30}
              isQrCode={true}
              placeholder={t('Tracking ID*')}
              style={{}}
              onPickerClick={() => {}}
              pickerValue={trackingId}
              onChangeText={val => setTrackingId(val.replace(/\s/g, ''))}
            />

            <InputPicker
              isPicker={true}
              isQrCode={false}
              placeholder={t('Type')}
              style={{}}
              onPickerClick={() => onPickerClick('Type')}
              pickerValue={type?.name}
              onChangeText={() => {}}
            />

            <InputPicker
              isPicker={true}
              isQrCode={false}
              placeholder={t('Status')}
              style={{}}
              onPickerClick={() => onPickerClick('Status')}
              pickerValue={status?.name}
              onChangeText={() => {}}
            />

            <InputPicker
              isPicker={true}
              isQrCode={false}
              placeholder={t('Condition')}
              style={{}}
              onPickerClick={() => onPickerClick('Condition')}
              pickerValue={condition?.name}
              onChangeText={() => {}}
            />

            <InputPicker
              isPicker={true}
              isQrCode={false}
              placeholder={t('Carrier')}
              style={{}}
              onPickerClick={() => onPickerClick('Carrier')}
              pickerValue={carrier?.name}
              onChangeText={() => {}}
            />

            <InputPicker
              isPicker={false}
              isQrCode={false}
              placeholder={t('Message')}
              style={{ paddingVertical: 10 }}
              onPickerClick={() => {}}
              pickerValue={message}
              onChangeText={val => setMessage(val)}
            />

            {/* Image Slots Preview */}
            <View
              style={{
                marginTop: isIPad ? 30 : 10,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent:'space-evenly'
              }}
            >
              {[1, 2, 3].map(key => {
                const slot = images[key];
                const hasLocalImage = Boolean(slot?.localUri);

                return (
                  <View key={key} style={key > 1 ? { marginLeft: 10 } : {}}>
                    <TouchableOpacity
                      style={{ opacity: isSubmitting ? 0.5 : 1 }}
                      onPress={() => selectMedia(key)}
                      disabled={isSubmitting}
                    >
                      <Image
                        resizeMode="contain"
                        style={hasLocalImage ? styles.imgGrey : styles.imgGreyy}
                        source={hasLocalImage ? { uri: slot.localUri } : IMAGES.camera}
                      />
                    </TouchableOpacity>

                    {hasLocalImage ? (
                      <TouchableOpacity
                        onPress={() => onDeleteImg(key)}
                        disabled={isSubmitting}
                        style={{ alignSelf: 'center', marginTop: 10 }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Image
                          style={{ height: isIPad ? 35 : 17, width: isIPad ? 35 : 17 }}
                          source={IMAGES.delete}
                        />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        disabled={isSubmitting}
                        style={[styles.addView, { opacity: isSubmitting ? 0.5 : 1 }]}
                        onPress={() => selectMedia(key)}
                      >
                        <Text style={styles.addTxt}>{t('Add Photo')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          </TouchableOpacity>
        </KeyboardAwareScrollView>

        {/* Action Buttons */}
        <View style={[styles.direction, { justifyContent: 'space-between' }]}>
          <TouchableOpacity
            style={[isIPad ? styles.clearBtnI : styles.clearBtn, { opacity: isSubmitting ? 0.5 : 1 }]}
            disabled={isSubmitting}
            onPress={() => clearData()}
          >
            <Text style={isIPad ? styles.btnTxtI : styles.btnTxt}>{t('Clear')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={isSubmitting}
            style={[
              isIPad ? styles.clearBtnI : styles.clearBtn,
              { backgroundColor: '#FDBE6F', marginLeft: 10, opacity: isSubmitting ? 0.5 : 1 },
            ]}
            onPress={onSubmit}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={isIPad ? styles.btnTxtI : styles.btnTxt}>{t('Save')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  headerInfoContainer: {
    backgroundColor: '#F0F8FF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingHorizontal: isIPad ? 25 : 16,
    paddingVertical: isIPad ? 16 : 12,
    marginBottom: 12,
  },
  headerInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerInfoBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: isIPad ? 12 : 8,
    padding: isIPad ? 12 : 10,
    borderWidth: 1,
    borderColor: '#D0E8F2',
  },
  locationBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: isIPad ? 12 : 8,
    padding: isIPad ? 12 : 10,
    borderWidth: 1,
    borderColor: '#D0E8F2',
    marginTop: 8,
  },
  headerLabel: {
    fontSize: isIPad ? 14 : 11,
    fontFamily: FONTS.PoppinsRegular,
    color: '#666666',
    marginBottom: 4,
  },
  headerValue: {
    fontSize: isIPad ? 20 : 17,
    fontFamily: FONTS.PoppinsSemiBold,
    color: '#223890',
  },
  processingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#EAF6FF',
    borderWidth: 1,
    borderColor: '#223890',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    marginBottom: 10,
    marginTop: 4,
  },
  processingTxt: {
    fontSize: isIPad ? 16 : 12,
    fontFamily: FONTS.PoppinsRegular,
    color: '#223890',
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    zIndex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: 'auto',
    paddingBottom: 10,
    maxHeight: '95%',
  },
  crossView: {
    height: 48,
    width: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F4F4',
    alignSelf: 'flex-end',
    marginRight: 10,
    marginTop: 10,
  },
  crossViewI: {
    height: 65,
    width: 65,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F4F4',
    alignSelf: 'flex-end',
    marginRight: 10,
    marginTop: 10,
  },
  closeImg: { height: 10, width: 10, tintColor: 'black' },
  closeImgI: { height: 20, width: 20, tintColor: 'black' },
  direction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 30,
    marginVertical: isIPad ? 30 : 16,
  },
  clearBtn: {
    height: 50,
    borderRadius: 26,
    backgroundColor: '#223890',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  clearBtnI: {
    height: 75,
    borderRadius: 40,
    backgroundColor: '#223890',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  imgGrey: { height: isIPad ? 200 : 100, width: isIPad ? 200 : 100, borderRadius: 20 },
  imgGreyy: { height: isIPad ? 200 : 50, width: isIPad ? 200 : 50, alignSelf: 'center', borderRadius: 20 },
  addView: { height: 32 },
  addTxt: {
    fontSize: isIPad ? 20 : 14,
    fontFamily: FONTS.RICORDORegular,
    color: '#223890',
    textAlign: 'center',
    marginTop: 10,
  },
  btnTxt: { color: 'white', fontSize: 16, fontFamily: FONTS.RICORDOSemiBold },
  btnTxtI: { color: 'white', fontSize: isIPad ? 25 : 20, fontFamily: FONTS.RICORDOSemiBold },
});

export { AddPackageModal };
