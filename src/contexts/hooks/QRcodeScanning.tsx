import {useState, useEffect, useCallback} from 'react';
import {useSharedValue} from 'react-native-reanimated';
import {useNavigation, useRoute} from '@react-navigation/native';
import {getTracking, TrackingNumber} from 'ts-tracking-number';

interface QRCodeScanningHook {
  addBarcodes: (codes: {value: string}[]) => void;
  barcodeScanned: any;
  setIsActive: React.Dispatch<React.SetStateAction<boolean>>;
}

const useQRCodeScanning = (): QRCodeScanningHook => {
  const [barcodes, setBarcodes] = useState<string[]>([]);
  const [allBarcodes, setAllBarcodes] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const barcodeScanned = useSharedValue(false);
  const navigation: any = useNavigation();
  const route: any = useRoute();

  useEffect(() => {
    setBarcodes([]);
    setAllBarcodes([]);
    barcodeScanned.value = false;
  }, [route, navigation]);

  useEffect(() => {
    let uniqueCodes = allBarcodes?.filter(c => !barcodes?.includes(c));

    if (uniqueCodes?.length === 0) return setIsActive(true);

    if (route.params?.scan && uniqueCodes?.length !== 0) {
      barcodeScanned.value = true;
      let trackingId = uniqueCodes[0];
      const carrier: TrackingNumber | undefined = getTracking(trackingId);

      if (carrier?.name === 'usps') {
        trackingId = trackingId.split(String.fromCharCode(29))[1];
      }

      navigation.navigate('ScanScreen', {
        scannedId: trackingId,
        id: route.params?.id,
        key: 'unique-route',
      });
      setIsActive(true);
    }
  }, [allBarcodes]);

  const addBarcodes = useCallback(
    (codes: {value: string}[]) => {
      if (!isActive || codes?.length === 0) return;
      setIsActive(false);
      let uniqueCodes = [...new Set(codes.map(item => item.value))];
      setAllBarcodes(prev => [...prev, ...uniqueCodes]);
    },
    [isActive],
  );

  return {addBarcodes, barcodeScanned, setIsActive};
};

export {useQRCodeScanning};
