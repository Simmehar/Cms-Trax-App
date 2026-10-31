/**
 * BottomDrawer.tsx
 *
 * Changes in this version:
 *  1. Honours `forceNonHospitality` from Home — critical for hospitality
 *     tenants using Packages / Internal Deliveries.
 *  2. All `setError({ ...error, … })` calls use the functional updater
 *     so stale closures can't wipe freshly-set flags.
 *  3. Recipient is only reset when the OCR text actually changes.
 *  4. Ship mismatch check guards against missing fields.
 */

import React, { ReactNode, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  Dimensions, DeviceEventEmitter,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONTS, IMAGES } from '../assets';
import { InputPicker } from './InputPicker';
import { ShipListModal } from './ShipListModal';
import { CheckIpad, isIPad } from '../utilities/securestorage';
import {
  DeparmentObj, RecipentObj, Ships, usePackageContext,
} from '../contexts/packagecontext';
import { sortTrackingNumber } from '../functions/SortTrackingNumber';
import { recipientSearchApi } from '../utilities/ApiCalls';
import { GeminiExtractionResult } from './SmartDocumentScanner';
import { useTranslation } from 'react-i18next';

let isPad = CheckIpad();
const screenhight = Dimensions.get('window').height;

// ─────────────────────────────────────────────────────────────
// FUZZY UTILITIES
// ─────────────────────────────────────────────────────────────
const levenshtein = (a: string, b: string): number => {
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) =>
      i === 0 ? j : j === 0 ? i : 0,
    ),
  );
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[a.length][b.length];
};

const editSimilarity = (a: string, b: string): number => {
  if (!a || !b) return 0;
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
};

const norm = (t: any): string =>
  t ? t.toLowerCase().replace(/[^a-z]/g, '') : '';

// ─────────────────────────────────────────────────────────────
// OCR TOKEN HELPERS
// ─────────────────────────────────────────────────────────────
const extractAllTokens = (ocrText: string): string[] => {
  const segments = ocrText.split(/[\n\/\|,;]+/).map(s => s.trim()).filter(Boolean);
  const allTokens: string[] = [];
  for (const seg of segments) {
    allTokens.push(seg);
    const words = seg.split(/\s+/).filter(Boolean);
    allTokens.push(...words);
    for (let i = 0; i < words.length - 1; i++) allTokens.push(`${words[i]} ${words[i + 1]}`);
    for (let i = 0; i < words.length - 2; i++) allTokens.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  }
  return [...new Set(allTokens)];
};

const JUNK_WORDS = new Set([
  'tracking', 'id', 'casino', 'cruise', 'ship', 'fort',
  'lauderdale', 'street', 'united', 'states', 'celebrity',
  'summit', 'beyond', 'amazon', 'amazoncom', 'tbadd', 'nw',
  'st', 'fl', 'ky', 'trace', 'th', 'llc', 'inc', 'corp',
  'oakland', 'park', 'lane', 'apt', 'suite', 'blvd', 'ave',
  'drive', 'road', 'way', 'place', 'court',
]);

const extractNameCandidates = (ocrText: string): string[] => {
  const preCleaned = ocrText.replace(/[()[\]{}<>]/g, ' ');
  const segments = preCleaned
    .split(/[\n\/\|;]+/)
    .map(s => s.trim())
    .filter(Boolean);

  const candidates: string[] = [];

  for (const seg of segments) {
    const commaSwapped = seg.replace(/^([A-Za-z]+),\s*([A-Za-z]+)/, '$2 $1');
    const words = commaSwapped
      .split(/\s+/)
      .filter(w => {
        const clean = w.replace(/[^a-zA-Z]/g, '');
        return (
          clean.length >= 3 &&
          !/\d/.test(w) &&
          !JUNK_WORDS.has(clean.toLowerCase())
        );
      })
      .map(w => w.replace(/[^a-zA-Z\s]/g, '').trim())
      .filter(Boolean);

    for (const word of words) if (word.length >= 3) candidates.push(word);
    for (let i = 0; i < words.length - 1; i++)   candidates.push(`${words[i]} ${words[i + 1]}`);
    for (let i = 0; i < words.length - 2; i++)   candidates.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  }

  return [...new Set(candidates)];
};

// ─────────────────────────────────────────────────────────────
// RECIPIENT SCORER
// ─────────────────────────────────────────────────────────────
function scoreRecipientAgainstOcr(
  rec: RecipentObj,
  ocrText: string,
  candidate: string,
  geminiBonus: number = 0,
): number {
  const normalize = (s: string) => (s ?? '').toLowerCase().replace(/[^a-z]/g, '');

  const candNorm = normalize(candidate);
  const firstNorm = normalize(rec.first_name);
  const lastNorm = normalize(rec.last_name);
  const fullFL = firstNorm + lastNorm;
  const fullLF = lastNorm + firstNorm;

  const candWords = candidate.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(Boolean);
  const recWords = [rec.first_name, rec.last_name]
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);

  let wordMatchCount = 0;
  for (const cw of candWords) {
    if (cw.length < 3) continue;
    const hit = recWords.some(rw => rw === cw || editSimilarity(cw, rw) >= 0.80);
    if (hit) wordMatchCount++;
  }
  const wordIntersection = candWords.length > 0 ? wordMatchCount / candWords.length : 0;

  const prefixBonus = fullFL.startsWith(candNorm) && candNorm.length >= 5 ? 0.20 : 0;
  const simFL = editSimilarity(candNorm, fullFL);
  const simLF = editSimilarity(candNorm, fullLF);
  const fullSimilarity = Math.max(simFL, simLF);

  let componentScore = 0;
  if (firstNorm && candNorm.includes(firstNorm)) componentScore += 0.12;
  if (lastNorm && candNorm.includes(lastNorm)) componentScore += 0.12;
  if (firstNorm && firstNorm.includes(candNorm)) componentScore += 0.08;
  if (lastNorm && lastNorm.includes(candNorm)) componentScore += 0.08;

  const ocrNorm = normalize(ocrText);
  let ocrScore = 0;
  if (firstNorm && ocrNorm.includes(firstNorm)) ocrScore += 0.05;
  if (lastNorm && ocrNorm.includes(lastNorm)) ocrScore += 0.05;

  const exactBonus = (candNorm === fullFL || candNorm === fullLF) ? 0.10 : 0;

  const score =
    fullSimilarity * 0.25 +
    wordIntersection * 0.35 +
    componentScore +
    prefixBonus +
    ocrScore +
    exactBonus +
    geminiBonus;

  return Math.min(score, 1);
}

// ─────────────────────────────────────────────────────────────
// LOCATION EXTRACTOR
// ─────────────────────────────────────────────────────────────
const extractLocation = (ocrText: string): string | null => {
  if (!ocrText) return null;
  const lines = ocrText.split(/\n/).map(l => l.trim()).filter(Boolean);
  const flat = ocrText.replace(/\n/g, ' ');

  const deckCabinCombo = flat.match(
    /\bDeck\s*[:#]?\s*([A-Z0-9]+)[,\s]+(?:Cabin|Stateroom|Room)\s*[:#]?\s*([A-Z0-9]+)/i,
  );
  if (deckCabinCombo) return `Deck ${deckCabinCombo[1]} Cabin ${deckCabinCombo[2]}`;

  const cabinMatch = flat.match(
    /(?:Cabin|Stateroom|Room|Cabin\s*#|Stateroom\s*#|Room\s*#)\s*[:#]?\s*([A-Z]?\d{1,5}[A-Z]?)/i,
  );
  if (cabinMatch) {
    const label = cabinMatch[0].match(/^(Cabin|Stateroom|Room)/i)?.[1] ?? 'Cabin';
    return `${label} ${cabinMatch[1]}`;
  }

  const deckMatch = flat.match(/\bDeck\s*[:#]?\s*([A-Z]?\d{1,3}[A-Z]?)\b/i);
  if (deckMatch) return `Deck ${deckMatch[1]}`;

  for (const line of lines) {
    const bareMatch = line.match(/^\s*([A-Z]?\d{4}[A-Z]?)\s*$/i);
    if (bareMatch) {
      const n = parseInt(bareMatch[1], 10);
      if (!isNaN(n) && (n < 1900 || n > 2100)) return `Cabin ${bareMatch[1]}`;
    }
  }

  return null;
};

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
interface BottomDrawerProps {
  packages: { id: number; track_id: string; loc: string }[];
  children?: { visible: boolean; element: ReactNode; styles: any }[];
  isBottomModal: boolean;
  oncloseBottomModal: () => void;
  receipientName: any;
  setReceipientName: any;
  shipName: any;
  setShipName: any;
  divisionName: any;
  setDivisionName: any;
  error: any;
  setError: any;
  location: any;
  setLocation: any;
  setIsNotify: any;
  isNotify: any;
  ocrText: any;
  onAddPackage: () => void;
  setPackageValue: (val: any) => void;
  geminiExtracted?: GeminiExtractionResult | null;
  /** When true, ignores stored hospitality and uses standard UI. */
  forceNonHospitality?: boolean;
}

// ─────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────
const BottomDrawer: React.FC<BottomDrawerProps> = ({
  children,
  packages,
  isBottomModal,
  oncloseBottomModal,
  receipientName,
  setReceipientName,
  ocrText,
  shipName,
  setShipName,
  divisionName,
  setDivisionName,
  location,
  setLocation,
  setIsNotify,
  isNotify,
  error,
  setError,
  onAddPackage,
  setPackageValue,
  geminiExtracted,
  forceNonHospitality = false,
}) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('');
  const [visible, setVisible] = useState(false);

  // Stored business type + effective derived flag
  const [storedHospitality, setStoredHospitality] = useState(false);
  const isHospitality = storedHospitality && !forceNonHospitality;

  const searchAbortRef = useRef<AbortController | null>(null);
  // Track last OCR text we ran a search for so we don't wipe the
  // manually-selected recipient on unrelated re-renders.
  const lastSearchedOcrRef = useRef<string>('');
  const { shipList, user } = usePackageContext();
  const { t } = useTranslation();

  useEffect(() => {
    const fetchBusinessType = async () => {
      try {
        const storedType = await AsyncStorage.getItem('BUSINESS_TYPE');
        setStoredHospitality(storedType === 'hotels-and-hospitality');
      } catch (e) {
        console.warn('Error reading BUSINESS_TYPE in BottomDrawer', e);
      }
    };
    fetchBusinessType();
  }, []);

  // ── Clear fields on successful package submit ─────────────
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('add_package_success', () => {
      setShipName(null);
      setReceipientName(null);
      setDivisionName(null);
      setLocation('');
      lastSearchedOcrRef.current = '';
    });
    return () => {
      subscription.remove();
    };
  }, []);

  // ── Ship found from gemini data ───────────────────────────
  useEffect(() => {
    const geminiShip = geminiExtracted?.ship_name?.trim();

    if (!geminiShip) return;
    if (!shipList?.length) return;

    const exactMatch = shipList.find(
      ship =>
        ship.name.trim().toLowerCase() ===
        geminiShip.trim().toLowerCase(),
    );

    if (exactMatch) {
      setShipName(exactMatch);
      return;
    }

    let bestScore = 0;
    let bestShip: Ships | null = null;

    for (const ship of shipList) {
      const score = editSimilarity(norm(ship.name), norm(geminiShip));
      if (score > bestScore) {
        bestScore = score;
        bestShip = ship;
      }
    }

    if (bestShip && bestScore >= 0.75) {
      setShipName(bestShip);
    }
  }, [geminiExtracted?.ship_name, shipList]);

  // ── Recipient search from OCR ─────────────────────────────
  // Reset the recipient ONLY when the OCR text actually changes;
  // otherwise an unrelated re-render (e.g. geminiExtracted toggling)
  // would wipe a manually-picked recipient and block Submit.
 // ── Recipient search from OCR ─────────────────────────────
useEffect(() => {
  if (!ocrText || !user) return;

  const isNewOcr = ocrText !== lastSearchedOcrRef.current;
  if (isNewOcr) {
    lastSearchedOcrRef.current = ocrText;
    // NOTE: setReceipientName(null) ko yahan se hata diya gaya hai
    // taki user ya previous state ka selected recipient clear na ho.
  }

  const debounceTimer = setTimeout(() => {
    if (searchAbortRef.current) searchAbortRef.current.abort();
    searchAbortRef.current = new AbortController();

    const runSearch = async () => {
      try {
        // PATH A: Gemini-powered direct search
        const geminiName = geminiExtracted?.recipient_name?.trim() ?? '';
        if (geminiName.length >= 2) {
          const cleanedGeminiName = geminiName
            .trim()
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

          let geminiResults: RecipentObj[] = [];
          try {
            const res: RecipentObj[] = await recipientSearchApi(
              user,
              encodeURIComponent(cleanedGeminiName),
            );
            if (res?.length) geminiResults = res;
          } catch (err) {
            console.log('   → Full Gemini name API error:', err);
          }

          if (!geminiResults.length) {
            const nameWords = cleanedGeminiName.split(/\s+/).filter(w => w.length >= 3);
            const wordSearches = await Promise.all(
              nameWords.map(async (word) => {
                try {
                  const res: RecipentObj[] = await recipientSearchApi(user, encodeURIComponent(word));
                  return res ?? [];
                } catch { return []; }
              }),
            );
            const seen = new Set<number>();
            for (const batch of wordSearches) {
              for (const rec of batch) {
                if (!seen.has(rec.id)) { seen.add(rec.id); geminiResults.push(rec); }
              }
            }
          }

          if (geminiResults.length) {
            let bestMatch: { recipient: RecipentObj; score: number } | null = null;
            for (const rec of geminiResults) {
              const score = scoreRecipientAgainstOcr(rec, ocrText, cleanedGeminiName, 0.25);
              if (!bestMatch || score > bestMatch.score) bestMatch = { recipient: rec, score };
            }
            if (bestMatch && bestMatch.score >= 0.80) {
              setReceipientName(bestMatch.recipient);
              return;
            }
          }
        }

        // PATH B: OCR-candidate multi-search
        const candidates = extractNameCandidates(ocrText);
        if (!candidates.length) return;

        const sortedCandidates = [...candidates].sort((a, b) => b.split(/\s+/).length - a.split(/\s+/).length);
        const topCandidates = sortedCandidates.slice(0, 12);
        let bestOverall: { recipient: RecipentObj; score: number } | null = null;

        const searchPromises = topCandidates.map(async (candidate) => {
          if (candidate.replace(/\s/g, '').length < 3) return null;
          try {
            const results: RecipentObj[] = await recipientSearchApi(user, encodeURIComponent(candidate));
            if (!results?.length) return null;
            let bestForCandidate: { recipient: RecipentObj; score: number } | null = null;
            for (const rec of results) {
              const score = scoreRecipientAgainstOcr(rec, ocrText, candidate, 0);
              if (!bestForCandidate || score > bestForCandidate.score) bestForCandidate = { recipient: rec, score };
            }
            return bestForCandidate;
          } catch (err) {
            return null;
          }
        });

        const candidateResults = await Promise.all(searchPromises);
        for (const result of candidateResults) {
          if (result && (!bestOverall || result.score > bestOverall.score)) bestOverall = result;
        }

        if (searchAbortRef.current?.signal.aborted) return;

        if (bestOverall && bestOverall.score >= 0.90) {
          setReceipientName(bestOverall.recipient);
        }

      } catch (err) {
        console.error('Search error:', err);
      }
    };

    runSearch();
  }, 500);

  return () => clearTimeout(debounceTimer);
}, [ocrText, geminiExtracted, user]);

  // ── Division + ship-mismatch warning ─────────────────────
  // Uses functional setError so stale closures can't clobber flags.
  useEffect(() => {
    if (receipientName && shipName) {
      setDivisionName({
        id: receipientName.department_id || 12,
        name: receipientName?.department_name || 'TBD',
      });
      const mismatch =
        !!receipientName.ship &&
        !!shipName.name &&
        receipientName.ship !== shipName.name;
      setError((prev: any) => ({ ...prev, isRecipientBelongsToShip: mismatch }));
    } else {
      setError((prev: any) => ({ ...prev, isRecipientBelongsToShip: false }));
    }
  }, [receipientName, shipName]); // eslint-disable-line

  // ── RENDER ────────────────────────────────────────────────
  return (
    <>
      <ShipListModal
        visible={visible}
        onClose={() => { oncloseBottomModal(); setVisible(false); }}
        activeTab={activeTab}
        getValue={val => {
          if (activeTab === 'Ship') {
            setShipName(val);
            setError((prev: any) => ({ ...prev, isShipName: false }));
          } else if (activeTab === 'Rceipient') {
            setReceipientName(val);
            setError((prev: any) => ({ ...prev, isRecipient: false }));
          } else if (activeTab === 'Division') {
            setDivisionName(val);
          }
        }}
      />
      <View style={styles.modalContainer}>
        <View style={styles.container}>
          <View style={styles.subContain}>

            {!isHospitality && (
              <>
                <InputPicker
                  isPicker={true} isQrCode={false} placeholder={t('Ship/Building*')}
                  style={{ marginHorizontal: 30, marginTop: 28 }}
                  onPickerClick={() => { oncloseBottomModal(); setVisible(true); setActiveTab('Ship'); }}
                  onChangeText={() => { }} pickerValue={shipName?.name}
                />
                {error?.isShipName && (
                  <Text style={styles.errorMsg}>{t('Please select Ship Name')}</Text>
                )}
              </>
            )}

            {/* Dynamic: Recipient* vs Guest* */}
            <InputPicker
              isPicker={true} isQrCode={false}
              placeholder={t(isHospitality ? 'Guest*' : 'Recipient*')}
              style={{ marginHorizontal: 30, marginTop: 28 }}
              onPickerClick={() => {
                oncloseBottomModal(); setVisible(true); setActiveTab('Rceipient');
                setError((prev: any) => ({ ...prev, isRecipient: false }));
              }}
              pickerValue={
                receipientName?.first_name
                  ? receipientName.first_name + ' ' + receipientName.last_name
                  : null
              }
              onChangeText={() => { }}
            />
            {error?.isRecipient && (
              <Text style={styles.errorMsg}>
                {isHospitality ? t('Please select Guest Name') : t('Please select Recipient Name')}
              </Text>
            )}
            {error?.isRecipientBelongsToShip && (
              <Text style={styles.errorMsg}>
                {isHospitality
                  ? `${t('The guest')} ${t('belongs to')} ${receipientName?.ship}`
                  : `${t('The recipient')} ${t('belongs to')} ${receipientName?.ship}`}
              </Text>
            )}

            {!isHospitality && (
              <InputPicker
                isPicker={true} disablePicker={true} isQrCode={false} placeholder={t('Department')}
                placeholerstyle={{ fontFamily: FONTS.RICORDORegular }}
                style={{ marginHorizontal: 30, marginTop: 28 }}
                onPickerClick={() => { setVisible(true); setActiveTab('Division'); }}
                editable={'false'} pickerValue={divisionName?.name}
                onChangeText={() => { }} hideDropdownButton={true}
              />
            )}

            {/* Location hidden for hotels-and-hospitality */}
            {!isHospitality && (
              <>
                <InputPicker
                  isPicker={false} isQrCode={false} placeholder={t('Location*')}
                  placeholerstyle={{ fontFamily: FONTS.RICORDORegular }}
                  inputView={{
                    paddingTop: isPad ? 20 : 10,
                    paddingBottom: isPad ? 10 : 10,
                  }}
                  style={{ marginLeft: 0, padding: 0, margin: 0 }}
                  autoCapitalize={'words'} onPickerClick={() => { }}
                  pickerValue={location}
                  onChangeText={val => {
                    setLocation(val);
                    setError((prev: any) => ({ ...prev, isLocation: false }));
                  }}
                />
                {error?.isLocation && (
                  <Text style={styles.errorMsg}>{t('Please enter Location')}</Text>
                )}
              </>
            )}

            <View style={[styles.roView, { marginTop: isIPad ? 10 : 10 }]}>
              <TouchableOpacity onPress={() => setIsNotify(!isNotify)}>
                {!isNotify
                  ? <View style={styles.unSelBox} />
                  : <View style={styles.selBox}>
                    <Image style={styles.tick} source={IMAGES.check} />
                  </View>
                }
              </TouchableOpacity>
              <Text style={styles.sendTxt}>{t('Send notification')}</Text>
            </View>

          </View>

          <View style={{ marginBottom: 10 }}>
            {packages?.length > 0 && packages.map(i => (
              <TouchableOpacity
                key={i.id}
                onPress={() => { setPackageValue(i); onAddPackage(); }}
                style={styles.packView}
              >
                {/* Dynamic: Asset vs Package */}
                <Text style={isPad ? styles.packTxtI : styles.packTxt}>
                  {isHospitality ? t('Service') : t('Package')} {i.id}
                </Text>
                <View style={styles.rowView}>
                  <Text style={[styles.trTxt, { fontSize: isPad ? 21 : 14 }]}>
                    {isHospitality ? t('ID:') : t('Tracking ID:')}{' '}
                    <Text style={[styles.trId, { fontSize: isPad ? 21 : 14 }]}>
                      {sortTrackingNumber(i?.track_id || '')}
                    </Text>
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </>
  );
};

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between' },
  errorMsg: { fontSize: isPad ? 18 : 14, fontFamily: FONTS.RICORDORegular, color: 'red', marginLeft: 30, marginTop: 5 },
  scrollContent: { flexGrow: 1, backgroundColor: '#fff' },
  subContain: { marginHorizontal: 15, borderRadius: 11, marginTop: 20, paddingBottom: 10, marginBottom: 10 },
  packView: { marginHorizontal: isPad ? 15 : 15, marginTop: isPad ? 20 : 5, backgroundColor: '#F4F4F4', borderRadius: 11, padding: isPad ? 30 : 14 },
  modalContainer: { marginTop: isPad ? 30 : 0, flex: 1, backgroundColor: 'white', borderWidth: 0.2, borderBottomWidth: 0, borderColor: '#80808080', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  drawerContainer: { width: '100%', flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#002B45', paddingVertical: 10, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  packTxt: { color: 'black', fontSize: 16, fontFamily: FONTS.RICORDOSemiBold },
  packTxtI: { color: 'black', fontSize: 24, fontFamily: FONTS.RICORDOSemiBold },
  rowView: { flexDirection: 'row', alignItems: 'center' },
  trTxt: { flex: 1, color: '#223890', fontSize: 14, fontFamily: FONTS.RICORDOSemiBold },
  trId: { color: 'black', fontSize: 12, fontFamily: FONTS.RICORDORegular },
  roView: { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginHorizontal: 30 },
  unSelBox: { height: isIPad ? 26 : 22, width: isIPad ? 26 : 22, borderRadius: 4, borderWidth: 1, borderColor: '#989898' },
  selBox: { height: isIPad ? 26 : 22, width: isIPad ? 26 : 22, borderRadius: 4, backgroundColor: '#223890', justifyContent: 'center', alignItems: 'center' },
  tick: { height: 9, width: 13, tintColor: 'white' },
  sendTxt: { fontSize: isIPad ? 20 : 16, fontFamily: FONTS.RICORDORegular, color: 'black', marginLeft: 5 },
});

export { BottomDrawer };