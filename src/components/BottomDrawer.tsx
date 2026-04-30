/**
 * BottomDrawer.tsx
 *
 * Changes in this version:
 *  1. Ship is now derived from the matched recipient's `.ship` field
 *     instead of being detected from OCR tokens / Gemini output.
 *  2. OCR/Gemini ship-detection useEffect REMOVED entirely.
 *  3. New useEffect watches `receipientName` — as soon as a recipient
 *     is resolved it looks up the matching Ships object from shipList
 *     and calls setShipName automatically.
 *  4. All other behaviour (recipient search, location, render) UNCHANGED.
 */

import React, { ReactNode, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  Dimensions, DeviceEventEmitter,
} from 'react-native';
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
}) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('');
  const [visible, setVisible] = useState(false);
  const searchAbortRef = useRef<AbortController | null>(null);
  const { shipList, user } = usePackageContext();

  console.log('[BottomDrawer] ocrText received:', ocrText);
  console.log('[BottomDrawer] geminiExtracted:', geminiExtracted);

  // ── Clear fields on successful package submit ─────────────
  useEffect(() => {
    DeviceEventEmitter.addListener('add_package_success', () => {
      setShipName(null);
      setReceipientName(null);
      setDivisionName(null);
      setLocation('');
    });
  }, []);

  // ─────────────────────────────────────────────────────────
  // ✅ SHIP FROM RECIPIENT DATA
  //    Whenever receipientName changes (i.e. a recipient is
  //    resolved from OCR/Gemini search), we read their `.ship`
  //    field and look up the matching Ships object from shipList.
  //    This replaces the old OCR/Gemini token-based ship detection.
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!receipientName) {
      // Recipient was cleared — clear ship too
      setShipName(null);
      return;
    }

    const recipientShipName: string = receipientName.ship ?? '';

    if (!recipientShipName.trim()) {
      console.log('[BottomDrawer] Recipient has no ship field — skipping ship auto-fill');
      return;
    }

    if (!shipList?.length) {
      console.log('[BottomDrawer] shipList not loaded yet');
      return;
    }

    // 1. Try exact match first
    const exactMatch = shipList.find(
      s => s.name.toLowerCase() === recipientShipName.toLowerCase(),
    );

    if (exactMatch) {
      console.log('[BottomDrawer] ✅ Ship from recipient (exact):', exactMatch.name);
      setShipName(exactMatch);
      return;
    }

    // 2. Fuzzy fallback (handles minor OCR noise in stored recipient data)
    let bestScore = 0;
    let bestShip: Ships | null = null;

    for (const ship of shipList) {
      const score = editSimilarity(norm(ship.name), norm(recipientShipName));
      if (score > bestScore && score >= 0.80) {
        bestScore = score;
        bestShip = ship;
      }
    }

    if (bestShip) {
      console.log(
        `[BottomDrawer] ✅ Ship from recipient (fuzzy, score ${bestScore.toFixed(2)}):`,
        bestShip.name,
      );
      setShipName(bestShip);
    } else {
      // 3. Last resort: build a minimal Ships-like object from the string stored on the recipient
      console.log(
        '[BottomDrawer] ⚠️  No shipList match — using recipient.ship string directly:',
        recipientShipName,
      );
      setShipName({
        name: recipientShipName,
        id: receipientName.ship_id ?? null,
      } as Ships);
    }
  }, [receipientName, shipList]); // eslint-disable-line

  // ── Recipient search from OCR ─────────────────────────────
  useEffect(() => {
    if (!ocrText || !user) return;
    setReceipientName(null);

    const debounceTimer = setTimeout(() => {
      if (searchAbortRef.current) searchAbortRef.current.abort();
      searchAbortRef.current = new AbortController();

      const runSearch = async () => {
        try {
          // ──────────────────────────────────────────────────
          // PATH A: Gemini-powered direct search
          // ──────────────────────────────────────────────────
          const geminiName = geminiExtracted?.recipient_name?.trim() ?? '';
          if (geminiName.length >= 2) {
            const cleanedGeminiName = geminiName
              .trim()
              .replace(/[^\w\s]/g, '')
              .replace(/\s+/g, ' ')
              .trim();
            console.log(`🤖 Gemini recipient candidate: "${cleanedGeminiName}"`);

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
              console.log('   → Full name gave 0 results — trying individual words');
              const nameWords = cleanedGeminiName.split(/\s+/).filter(w => w.length >= 3);
              const wordSearches = await Promise.all(
                nameWords.map(async (word) => {
                  try {
                    console.log(`   → Trying word: "${word}"`);
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
              console.log(`   → Combined unique results: ${geminiResults.length}`);
            }

            if (geminiResults.length) {
              let bestMatch: { recipient: RecipentObj; score: number } | null = null;
              for (const rec of geminiResults) {
                const score = scoreRecipientAgainstOcr(rec, ocrText, cleanedGeminiName, 0.25);
                console.log(`   → "${rec.first_name} ${rec.last_name}" score: ${score.toFixed(2)}`);
                if (!bestMatch || score > bestMatch.score) bestMatch = { recipient: rec, score };
              }
              if (bestMatch && bestMatch.score >= 0.80) {
                console.log(
                  `✅ Gemini recipient: ${bestMatch.recipient.first_name} ${bestMatch.recipient.last_name} ` +
                  `(score ${bestMatch.score.toFixed(2)})`,
                );
                // ✅ Setting receipientName here triggers the ship useEffect above
                setReceipientName(bestMatch.recipient);
                return;
              }
              console.log(`⚠️  Gemini best score ${bestMatch?.score.toFixed(2)} below 0.80 — falling through`);
            } else {
              console.log('   → 0 results even after word split — falling through to OCR path');
            }
          }

          // ──────────────────────────────────────────────────
          // PATH B: OCR-candidate multi-search
          // ──────────────────────────────────────────────────
          const candidates = extractNameCandidates(ocrText);
          console.log('🔍 OCR name candidates:', candidates.length);

          if (!candidates.length) { console.log('❌ No name candidates'); return; }

          const sortedCandidates = [...candidates].sort((a, b) => b.split(/\s+/).length - a.split(/\s+/).length);
          const topCandidates = sortedCandidates.slice(0, 12);
          let bestOverall: { recipient: RecipentObj; score: number } | null = null;

          const searchPromises = topCandidates.map(async (candidate) => {
            if (candidate.replace(/\s/g, '').length < 3) return null;
            try {
              console.log(`🔎 OCR searching: "${candidate}"`);
              const results: RecipentObj[] = await recipientSearchApi(user, encodeURIComponent(candidate));
              if (!results?.length) { console.log(`   → 0 results`); return null; }
              console.log(`   → ${results.length} result(s)`);
              let bestForCandidate: { recipient: RecipentObj; score: number } | null = null;
              for (const rec of results) {
                const score = scoreRecipientAgainstOcr(rec, ocrText, candidate, 0);
                console.log(`   → "${rec.first_name} ${rec.last_name}" score: ${score.toFixed(2)}`);
                if (!bestForCandidate || score > bestForCandidate.score) bestForCandidate = { recipient: rec, score };
              }
              return bestForCandidate;
            } catch (err) {
              console.log(`   → API error for "${candidate}":`, err);
              return null;
            }
          });

          const candidateResults = await Promise.all(searchPromises);
          for (const result of candidateResults) {
            if (result && (!bestOverall || result.score > bestOverall.score)) bestOverall = result;
          }

          if (searchAbortRef.current?.signal.aborted) { console.log('⚠️  Search cancelled'); return; }

          if (bestOverall && bestOverall.score >= 0.90) {
            console.log(
              `✅ OCR Recipient: ${bestOverall.recipient.first_name} ${bestOverall.recipient.last_name} ` +
              `(score ${bestOverall.score.toFixed(2)})`,
            );
            // ✅ Setting receipientName here triggers the ship useEffect above
            setReceipientName(bestOverall.recipient);
          } else {
            console.log('❌ No recipient found (best score below 0.90)');
          }

        } catch (err) {
          console.error('Search error:', err);
        }
      };

      runSearch();
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [ocrText, geminiExtracted, user]); // eslint-disable-line

  // ── Division + ship-mismatch warning ─────────────────────
  useEffect(() => {
    if (receipientName && shipName) {
      setDivisionName({
        id: receipientName.department_id || 12,
        name: receipientName?.department_name || 'TBD',
      });
      if (receipientName.ship !== shipName.name) {
        setError({ ...error, isRecipientBelongsToShip: true });
      } else {
        setError({ ...error, isRecipientBelongsToShip: false });
      }
    } else {
      setError({ ...error, isRecipientBelongsToShip: false });
    }
  }, [receipientName, shipName]); // eslint-disable-line

  const checkValidation = () => {
    if (!shipName?.name) { setError({ ...error, isShipName: true }); return true; }
    if (!receipientName) { setError({ ...error, isRecipient: true }); return true; }
    if (!location) { setError({ ...error, isLocation: true }); return true; }
    return false;
  };

  // ── RENDER ────────────────────────────────────────────────
  return (
    <>
      <ShipListModal
        visible={visible}
        onClose={() => { oncloseBottomModal(); setVisible(false); }}
        activeTab={activeTab}
        getValue={val => {
          if (activeTab === 'Ship') { setShipName(val); setError({ ...error, isShipName: false }); }
          else if (activeTab === 'Rceipient') { setReceipientName(val); setError({ ...error, isRecipient: false }); }
          else if (activeTab === 'Division') { setDivisionName(val); }
        }}
      />
      <View style={styles.modalContainer}>
        <View style={styles.container}>
          <View style={styles.subContain}>

            <InputPicker
              isPicker={true} isQrCode={false} placeholder={'Ship/Building*'}
              style={{ marginHorizontal: 30, marginTop: 28 }}
              onPickerClick={() => { oncloseBottomModal(); setVisible(true); setActiveTab('Ship'); }}
              onChangeText={() => { }} pickerValue={shipName?.name}
            />
            {error?.isShipName && (
              <Text style={styles.errorMsg}>Please select Ship Name</Text>
            )}

            <InputPicker
              isPicker={true} isQrCode={false} placeholder={'Recipient*'}
              style={{ marginHorizontal: 30, marginTop: 28 }}
              onPickerClick={() => {
                oncloseBottomModal(); setVisible(true); setActiveTab('Rceipient');
                setError({ ...error, isRecipient: false });
              }}
              pickerValue={
                receipientName?.first_name
                  ? receipientName.first_name + ' ' + receipientName.last_name
                  : null
              }
              onChangeText={() => { }}
            />
            {error?.isRecipient && (
              <Text style={styles.errorMsg}>Please select Recipient Name</Text>
            )}
            {error?.isRecipientBelongsToShip && (
              <Text style={styles.errorMsg}>
                The recipient belongs to {receipientName?.ship}
              </Text>
            )}

            <InputPicker
              isPicker={true} disablePicker={true} isQrCode={false} placeholder={'Division'}
              style={{ marginHorizontal: 30, marginTop: 28 }}
              onPickerClick={() => { setVisible(true); setActiveTab('Division'); }}
              editable={'false'} pickerValue={divisionName?.name}
              onChangeText={() => { }} hideDropdownButton={true}
            />

            <InputPicker
              isPicker={false} isQrCode={false} placeholder={'Location*'}
              autoCapitalize={'words'} onPickerClick={() => { }}
              pickerValue={location}
              onChangeText={val => {
                setLocation(val);
                setError({ ...error, isLocation: false });
              }}
            />
            {error?.isLocation && (
              <Text style={styles.errorMsg}>Please enter Location</Text>
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
              <Text style={styles.sendTxt}>Send notification</Text>
            </View>

          </View>

          <View style={{ marginBottom: 10 }}>
            {packages?.length > 0 && packages.map(i => (
              <TouchableOpacity
                key={i.id}
                onPress={() => { setPackageValue(i); onAddPackage(); }}
                style={styles.packView}
              >
                <Text style={isPad ? styles.packTxtI : styles.packTxt}>Package {i.id}</Text>
                <View style={styles.rowView}>
                  <Text style={[styles.trTxt, { fontSize: isPad ? 21 : 14 }]}>
                    Tracking ID:{' '}
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
  errorMsg: { fontSize: isPad ? 18 : 14, fontFamily: FONTS.PoppinsRegular, color: 'red', marginLeft: 30, marginTop: 5 },
  scrollContent: { flexGrow: 1, backgroundColor: '#fff' },
  subContain: { marginHorizontal: 15, borderRadius: 11, marginTop: 20, paddingBottom: 10, marginBottom: 10 },
  packView: { marginHorizontal: isPad ? 15 : 15, marginTop: isPad ? 20 : 5, backgroundColor: '#F4F4F4', borderRadius: 11, padding: isPad ? 30 : 14 },
  modalContainer: { marginTop: isPad ? 30 : 0, flex: 1, backgroundColor: 'white', borderWidth: 0.2, borderBottomWidth: 0, borderColor: '#80808080', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  drawerContainer: { width: '100%', flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#002B45', paddingVertical: 10, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  packTxt: { color: 'black', fontSize: 16, fontFamily: FONTS.PoppinsSemiBold },
  packTxtI: { color: 'black', fontSize: 24, fontFamily: FONTS.PoppinsSemiBold },
  rowView: { flexDirection: 'row', alignItems: 'center' },
  trTxt: { flex: 1, color: '#223890', fontSize: 14, fontFamily: FONTS.PoppinsSemiBold },
  trId: { color: 'black', fontSize: 12, fontFamily: FONTS.PoppinsRegular },
  roView: { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginHorizontal: 30 },
  unSelBox: { height: isIPad ? 26 : 22, width: isIPad ? 26 : 22, borderRadius: 4, borderWidth: 1, borderColor: '#989898' },
  selBox: { height: isIPad ? 26 : 22, width: isIPad ? 26 : 22, borderRadius: 4, backgroundColor: '#223890', justifyContent: 'center', alignItems: 'center' },
  tick: { height: 9, width: 13, tintColor: 'white' },
  sendTxt: { fontSize: isIPad ? 20 : 16, fontFamily: FONTS.PoppinsRegular, color: 'black', marginLeft: 5 },
});

export { BottomDrawer };