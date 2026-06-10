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

import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import RNFS from 'react-native-fs';
import { COLORS, FONTS, IMAGES } from '../assets';
import { InputPicker } from './InputPicker';
import { isIPad } from '../utilities/securestorage';
import { ShipListModal } from './ShipListModal';
import { open } from './CameraController';
import { PackageType } from './PackageList';
import {
  CarrierObj,
  PackageConditionType,
  PackageStatusObj,
  usePackageContext,
    Ships,
  RecipentObj,
} from '../contexts/packagecontext';
import { deleteImg, uploadImg } from '../utilities/ApiCalls';
import { useAuth } from '../contexts';
import tnv from 'tracking-number-validation';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { GeminiExtractionResult } from './SmartDocumentScanner';

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
  imagesObj: packageImages[];
  ocrText?: string;
  geminiData?: GeminiExtractionResult;
}

interface packageModalProps {
  isVisible: boolean;
  onSetVisible: () => void;
  onSubmitPackage: (value: packageOption) => void;
  packageValue: any;
  setPackageValue: (val: any) => void;
  onOcrTextReady?: (text: string) => void;
  onGeminiExtracted?: (data: GeminiExtractionResult) => void;
  /** Image path from scanner — triggers immediate upload to image slot 1 */
  capturedImagePath?: string | null;
  /** True while OCR + Gemini are running in background */
  isBackgroundProcessing?: boolean;
  /** Populated when background Gemini extraction completes */
  backgroundExtracted?: GeminiExtractionResult | null;
    /** Ship selected in Home */
  shipName?: Ships | null;
  /** Recipient selected in Home */
  receipientName?: RecipentObj | null;
  /** Location selected in Home */
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

  const [imagesObj, setImagesObj] = useState({
    image1: '', image2: '', image3: '',
    image1dummy: '', image2dummy: '', image3dummy: '',
  });
  const [imageLoading, setImageLoading] = useState(0);
  const [isImageUploading, setIsImageUploading] = useState(false);

  const [error, setError] = useState({
    isTrackingId: false, isStatus: false, isType: false,
    isCondition: false, isImages: false,
  });

  const { user } = useAuth();
  const { carriers } = usePackageContext();

  // ── Populate form when editing an existing package ────────
  useEffect(() => {
    if (packageValue?.trackingId) {
      const { carrier, condition, imagesObj, trackingId, type, status, message } = packageValue;
      setTrackingId(trackingId);
      setStatus(status);
      setType(type);
      setCondition(condition);
      setCarrier(carrier);
      setImagesObj(imagesObj);
      setMessage(message);
    } else {
      setTrackingId('');
      setImagesObj({
        image1: '', image2: '', image3: '',
        image1dummy: '', image2dummy: '', image3dummy: '',
      });
    }
  }, [packageValue]);

  // ── Auto-detect carrier from tracking ID (tnv fallback) ──
const detectCarrierFromId = (id: string): CarrierObj | undefined => {
    if (!id) return undefined;
    
    // 1. Get potential couriers from the validation library
    const courier = tnv.getCourier(id);
    let name = 'Other';

    // 2. Only map to a specific name if it's a high-confidence match 
    // found in your specific allowed list.
    if (courier && courier.length > 0) {
      const map: Record<string, string> = {
        fedex: 'FedEx',
        usps: 'US Postal Service',
        ups: 'UPS',
        dhl: 'DHL',
        // Removed 'amazon' from here so it defaults to 'Other'
      };
      
      // If the detected courier isn't in our strict map, it stays 'Other'
      name = map[courier[0]] ?? 'Other';
    }

    // 3. Find the actual Carrier object in your context list
    const found = carriers?.find(c => c.name === name);
    const other = carriers?.find(c => c.name === 'Other');

    return found || other || { id: 1, name: 'Other' };
  };

  useEffect(() => {
    if (trackingId.length > 0 && !geminiData?.carrier) {
      setCarrier(detectCarrierFromId(trackingId) ?? null);
    } else if (!trackingId) {
      if (!geminiData?.carrier) setCarrier(null);
    }
  }, [trackingId]); // eslint-disable-line

  // ─────────────────────────────────────────────────────────
  // ✅ Upload captured image IMMEDIATELY when path is received
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!capturedImagePath || !user) return;

    // Reset slot 1 first
    setImagesObj(prev => ({ ...prev, image1: '', image1dummy: '' }));

    const uploadCapturedImage = async () => {
      try {
        const formData = new FormData();
        formData.append('image', {
          name: 'ocr_scan.jpg',
          type: 'image/jpeg',
          uri: capturedImagePath,
        } as any);

        setIsImageUploading(true);
        setImageLoading(1);

        const imgRes = await uploadImg(user, formData);

        setImageLoading(0);
        setIsImageUploading(false);

        if (imgRes?.image_url) {
          setImagesObj(prev => ({
            ...prev,
            image1dummy: capturedImagePath,
            image1: imgRes.image_url,
          }));
          setError(prev => ({ ...prev, isImages: false }));
        }
      } catch (err) {
        setIsImageUploading(false);
        setImageLoading(0);
        console.warn('[AddPackageModal] image upload error:', err);
      }
    };

    uploadCapturedImage();
  }, [capturedImagePath]); // eslint-disable-line

  // ─────────────────────────────────────────────────────────
  // ✅ Populate fields when background Gemini extraction arrives
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!backgroundExtracted) return;

    setGeminiData(backgroundExtracted);

    // Notify parent
    if (onGeminiExtracted) onGeminiExtracted(backgroundExtracted);

    // Populate tracking number (only if empty)
   const rawTn = backgroundExtracted.tracking_number;
  const tn = rawTn ? rawTn.replace(/\s/g, '') : ''; 

  if (tn && !trackingId) {
    setTrackingId(tn);
    setError(prev => ({ ...prev, isTrackingId: false }));
    console.log('[AddPackageModal] Tracking from Gemini (cleaned):', tn);
  }

    // Populate carrier (only if empty)
   if (backgroundExtracted.carrier?.trim()) {
    const normalisedName = normaliseCarrierName(backgroundExtracted.carrier);
    
    // Look for the match in your context list
    const matchedCarrier = carriers?.find(
      c => c.name.toLowerCase() === normalisedName.toLowerCase(),
    );

    if (matchedCarrier) {
      setCarrier(matchedCarrier);
    } else {
      // 💡 DYNAMIC FIX: If Gemini found "SpeedX" but it's not in your list, 
      // find the "Other" object from your carriers context and set it.
      const otherObj = carriers?.find(c => c.name === 'Other') || { id: 1, name: 'Other' };
      setCarrier(otherObj);
    }
  }

    console.log('[AddPackageModal] Background Gemini extraction →', JSON.stringify(backgroundExtracted, null, 2));
  }, [backgroundExtracted,carriers]); // eslint-disable-line

  // ─────────────────────────────────────────────────────────
  // MANUAL IMAGE SELECTION
  // ─────────────────────────────────────────────────────────
  const selectMedia = async (key: number) => {
    open(async (response: any) => {
      if (!response.path) return;
      const formData = new FormData();
      formData.append('image', { name: 'image', type: 'image/jpeg', uri: response.path } as any);
      setIsImageUploading(true);
      setImageLoading(key);
      const imgRes = await uploadImg(user, formData);
      setImageLoading(0);
      if (imgRes?.image_url) setIsImageUploading(false);
      setError(prev => ({ ...prev, isImages: false }));
      if (key === 1) setImagesObj(prev => ({ ...prev, image1dummy: response.path, image1: imgRes?.image_url }));
      else if (key === 2) setImagesObj(prev => ({ ...prev, image2dummy: response.path, image2: imgRes?.image_url }));
      else if (key === 3) setImagesObj(prev => ({ ...prev, image3dummy: response.path, image3: imgRes?.image_url }));
    });
  };

  const onDeleteImg = async (img: string) => {
    await deleteImg(user, { image_name: img });
  };

  // ─────────────────────────────────────────────────────────
  // VALIDATION / SUBMIT
  // ─────────────────────────────────────────────────────────
  const checkValidation = (): boolean => {
    if (!trackingId) { setError(prev => ({ ...prev, isTrackingId: true })); return true; }
    if (!type?.name) { setError(prev => ({ ...prev, isType: true })); return true; }
    if (!status?.name) { setError(prev => ({ ...prev, isStatus: true })); return true; }
    if (!condition?.name) { setError(prev => ({ ...prev, isCondition: true })); return true; }
    if (!imagesObj.image1 && !imagesObj.image2 && !imagesObj.image3) {
      setError(prev => ({ ...prev, isImages: true })); return true;
    }
    return false;
  };

  const clearData = () => {
    setPickerType('');
    setType(null); setCondition(null); setCarrier(null); setStatus(null);
    setImagesObj({ image1: '', image2: '', image3: '', image1dummy: '', image2dummy: '', image3dummy: '' });
    setMessage(''); setOcrText(''); setGeminiData(null);
    setPackageValue(null);
    setError({ isTrackingId: false, isStatus: false, isType: false, isCondition: false, isImages: false });
  };

  // const onSubmit = async () => {
  //   if (!checkValidation()) {
  //     const obj: packageOption = packageValue?.id
  //       ? {
  //         trackingId, type: type!, status, condition: condition!,
  //         carrier: carrier!, message, imagesObj,
  //         id: packageValue.id, ocrText,
  //         geminiData: geminiData ?? undefined,
  //       }
  //       : {
  //         trackingId, type: type!, status, condition: condition!,
  //         carrier: carrier!, message, imagesObj, ocrText,
  //         geminiData: geminiData ?? undefined,
  //       };

  //     onSetVisible();
  //     setTrackingId('');
  //     setStatus(null); setCondition(null); setCarrier(null); setMessage('');
  //     setImagesObj({ image1: '', image2: '', image3: '', image1dummy: '', image2dummy: '', image3dummy: '' });
  //     onSubmitPackage(obj);
  //     clearData();
  //   }
  // };
const onSubmit = async () => {
  // 1. Ek array banayein jisme saare missing fields ke naam store honge
  const missingFields: string[] = [];

  if (!trackingId?.trim()) missingFields.push('Tracking ID');
  if (!type) missingFields.push('Type');
  if (!status) missingFields.push('Status');
  if (!condition) missingFields.push('Condition');
  if (!carrier) missingFields.push('Carrier');

  // 2. Agar koi field missing hai, to Alert dikhayein aur execution ko rokein
  if (missingFields.length > 0) {
    // fields ko comma se separate karke sundar message banayein
    Alert.alert(`Please select: ${missingFields.join(', ')}`);
    return; // Aage ka code execute nahi hoga
  }

  // 3. Agar saare validation pass ho jate hain, to aapka baki ka logic chalega
  const obj: packageOption = packageValue?.id
    ? {
      trackingId, type: type!, status, condition: condition!,
      carrier: carrier!, message, imagesObj,
      id: packageValue.id, ocrText,
      geminiData: geminiData ?? undefined,
    }
    : {
      trackingId, type: type!, status, condition: condition!,
      carrier: carrier!, message, imagesObj, ocrText,
      geminiData: geminiData ?? undefined,
    };

  onSetVisible();
  setTrackingId('');
  setStatus(null); 
  setCondition(null); 
  setCarrier(null); 
  setMessage('');
  setImagesObj({ image1: '', image2: '', image3: '', image1dummy: '', image2dummy: '', image3dummy: '' });
  onSubmitPackage(obj);
  clearData();
};
  const onPickerClick = (type: string) => {
    setModalVisible(true);
    setPickerType(type);
  };

  if (!isVisible) return null;

  return (
    <View style={styles.modalContainer}>
      <View style={styles.modalContent}>

        {/* Close */}
        <TouchableOpacity
          style={isIPad ? styles.crossViewI : styles.crossView}
          disabled={isImageUploading}
          onPress={() => { onSetVisible(); setPackageValue(null); clearData(); }}
        >
          <Image source={IMAGES.close} style={isIPad ? styles.closeImgI : styles.closeImg} />
        </TouchableOpacity>

                {/* ── SHIP & RECIPIENT INFO HEADER ─────────────────── */}
        <View style={styles.headerInfoContainer}>
          <View style={styles.headerInfoRow}>
            {/* SHIP */}
            <View style={styles.headerInfoBox}>
              <Text style={styles.headerLabel}>Ship</Text>
              <Text style={styles.headerValue}>
                {shipName?.name || 'Not selected'}
              </Text>
            </View>
            
            {/* RECIPIENT */}
            <View style={[styles.headerInfoBox, { marginLeft: 10 }]}>
              <Text style={styles.headerLabel}>Recipient</Text>
              <Text style={styles.headerValue}>
                {receipientName 
                  ? `${receipientName.first_name} ${receipientName.last_name}` 
                  : 'Not selected'}
              </Text>
            </View>
          </View>

          {/* LOCATION */}
          {location && (
            <View style={styles.locationBox}>
              <Text style={styles.headerLabel}>Location</Text>
              <Text style={styles.headerValue}>
                {location}
              </Text>
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
          setInitialVals={!packageValue?.trackingId && { type, setType, condition, setCondition, carrier, setCarrier, status, setStatus }}
        />

        <KeyboardAwareScrollView contentContainerStyle={{}}>
          <TouchableOpacity activeOpacity={1}>

            {/* ── Background processing banner ──────────────────── */}
            {isBackgroundProcessing && (
              <View style={styles.processingBanner}>
                <ActivityIndicator size="small" color="#223890" style={{ marginRight: 8 }} />
                <Text style={styles.processingTxt}>Extracting label data in background…</Text>
              </View>
            )}

            {/* Tracking ID */}
            <InputPicker
              isPicker={false} maxLength={30} isQrCode={true}
              placeholder={'Tracking ID*'} style={{}} onPickerClick={() => { }}
              pickerValue={trackingId}
              onChangeText={val => {
                // 💡 CHANGE: Replace .trimStart() with a global space removal
                setTrackingId(val.replace(/\s/g, ''));
                setError(prev => ({ ...prev, isTrackingId: false }));
              }}
            />

            {/* Type */}
            <InputPicker
              isPicker={true} isQrCode={false} placeholder={'Type'} style={{}}
              onPickerClick={() => { onPickerClick('Type'); setError(prev => ({ ...prev, isStatus: false })); }}
              pickerValue={type?.name} onChangeText={() => { }}
            />
            {error.isType && <Text style={styles.errorMsg}>Please Select Package Type</Text>}

            {/* Status */}
            <InputPicker
              isPicker={true} isQrCode={false} placeholder={'Status'} style={{}}
              onPickerClick={() => { onPickerClick('Status'); setError(prev => ({ ...prev, isStatus: false })); }}
              pickerValue={status?.name} onChangeText={() => { }}
            />
            {error.isStatus && <Text style={styles.errorMsg}>Please Select Package Status</Text>}

            {/* Condition */}
            <InputPicker
              isPicker={true} isQrCode={false} placeholder={'Condition'} style={{}}
              onPickerClick={() => onPickerClick('Condition')}
              pickerValue={condition?.name} onChangeText={() => { }}
            />
            {error.isCondition && <Text style={styles.errorMsg}>Please Select Package Condition</Text>}

            {/* Carrier */}
            <InputPicker
              isPicker={true} isQrCode={false} placeholder={'Carrier'} style={{}}
              onPickerClick={() => onPickerClick('Carrier')}
              pickerValue={carrier?.name} onChangeText={() => { }}
            />

            {/* Message */}
            <InputPicker
              isPicker={false} isQrCode={false} placeholder={'Message'} style={{}}
              onPickerClick={() => { }} pickerValue={message} onChangeText={val => setMessage(val)}
            />

            {error.isImages && (
              <Text style={[styles.errorMsg, { marginTop: 20 }]}>Add at least one photo.</Text>
            )}

            {/* Image Slots */}
            <View style={{ marginTop: isIPad ? 30 : 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly' }}>
              {[1, 2, 3].map(key => {
                const dummyKey = `image${key}dummy` as keyof typeof imagesObj;
                const imgKey = `image${key}` as keyof typeof imagesObj;
                const hasDummy = !!imagesObj[dummyKey];
                return (
                  <View key={key} style={key > 1 ? { marginLeft: 10 } : {}}>
                    <TouchableOpacity
                      style={{ opacity: isImageUploading ? 0.5 : 1 }}
                      onPress={() => selectMedia(key)}
                      disabled={isImageUploading}
                    >
                      {imageLoading === key ? (
                        <ActivityIndicator style={styles.imgGrey} size="small" color="#223890" />
                      ) : (
                        <Image
                          resizeMode="contain"
                          style={hasDummy ? styles.imgGrey : styles.imgGreyy}
                          source={hasDummy ? { uri: imagesObj[dummyKey] } : IMAGES.camera}
                        />
                      )}
                    </TouchableOpacity>
                    {hasDummy ? (
                      <TouchableOpacity
                        onPress={() => {
                          onDeleteImg(imagesObj[imgKey]);
                          setImagesObj(prev => ({ ...prev, [imgKey]: '', [dummyKey]: '' }));
                        }}
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
                        disabled={isImageUploading}
                        style={[styles.addView, { opacity: isImageUploading ? 0.5 : 1 }]}
                        onPress={() => selectMedia(key)}
                      >
                        <Text style={styles.addTxt}>Add Photo</Text>
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
            style={[isIPad ? styles.clearBtnI : styles.clearBtn, { opacity: isImageUploading ? 0.5 : 1 }]}
            disabled={isImageUploading}
            onPress={() => { setTrackingId(''); setPackageValue(null); clearData(); }}
          >
            <Text style={isIPad ? styles.btnTxtI : styles.btnTxt}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={isImageUploading}
            style={[isIPad ? styles.clearBtnI : styles.clearBtn, { backgroundColor: '#FDBE6F', marginLeft: 10, opacity: isImageUploading ? 0.5 : 1 }]}
            onPress={onSubmit}
          >
            <Text style={isIPad ? styles.btnTxtI : styles.btnTxt}>Save</Text>
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
  errorMsg: { fontSize: isIPad ? 20 : 14, fontFamily: FONTS.PoppinsRegular, color: 'red', marginLeft: 30 },
  processingBanner: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'center',
    backgroundColor: '#EAF6FF', borderWidth: 1, borderColor: '#223890',
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10,
    marginBottom: 10, marginTop: 4,
  },
  processingTxt: {
    fontSize: isIPad ? 16 : 12, fontFamily: FONTS.PoppinsRegular, color: '#223890',
  },
  modalContainer: {
    position: 'absolute', bottom: 0, width: '100%', zIndex: 1,
    height: '100%', justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    height: 'auto', paddingBottom: 10, maxHeight: '95%',
  },
  crossView: {
    height: 48, width: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F4F4F4', alignSelf: 'flex-end', marginRight: 10, marginTop: 10,
  },
  crossViewI: {
    height: 65, width: 65, borderRadius: 32, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F4F4F4', alignSelf: 'flex-end', marginRight: 10, marginTop: 10,
  },
  closeImg: { height: 10, width: 10, tintColor: 'black' },
  closeImgI: { height: 20, width: 20, tintColor: 'black' },
  direction: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 30, marginVertical: isIPad ? 30 : 16 },
  clearBtn: { height: 50, borderRadius: 26, backgroundColor: '#223890', justifyContent: 'center', alignItems: 'center', flex: 1 },
  clearBtnI: { height: 75, borderRadius: 40, backgroundColor: '#223890', justifyContent: 'center', alignItems: 'center', flex: 1 },
  imgGrey: { height: isIPad ? 200 : 100, width: isIPad ? 200 : 100, borderRadius: 20 },
  imgGreyy: { height: isIPad ? 200 : 50, width: isIPad ? 200 : 50, alignSelf: 'center', borderRadius: 20 },
  addView: { height: 32 },
  addTxt: { fontSize: isIPad ? 20 : 14, fontFamily: FONTS.PoppinsRegular, color: '#223890', textAlign: 'center', marginTop: 10 },
  btnTxt: { color: 'white', fontSize: 16, fontFamily: FONTS.RICORDOSemiBold },
  btnTxtI: { color: 'white', fontSize: isIPad ? 25 : 20, fontFamily: FONTS.RICORDOSemiBold },
});

export { AddPackageModal };