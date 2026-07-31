import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Image,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import { FONTS, ICONS, IMAGES } from '../assets';
import { isIPad } from '../utilities/securestorage';
import { useTranslation } from 'react-i18next';

interface SearchHeaderProps {
  onSelectAll: (value: string) => void;
  onSort: (value: string) => void;
  onFilter: (value: string) => void;
  selectAllChecked: boolean;
  count: number;
  onClear: () => void;
  isOnline: boolean;
  onShowOfflinePackage: () => void;
  onClickOfflineMenu: () => void;
  downloadCSV: () => void;
}

const SearchHeader: React.FC<SearchHeaderProps> = ({
  onSelectAll,
  onSort,
  onFilter,
  count,
  onClear,
  selectAllChecked,
  isOnline,
  onShowOfflinePackage,
  onClickOfflineMenu,
  downloadCSV,
}) => {
  const { t } = useTranslation();
  return (
    <View>
      {/* Count + Clear */}
      {count > 0 && (
        <View
          style={[
            styles.selectAllContainer,
            { marginHorizontal: isIPad ? 25 : 15, marginVertical: 20 },
          ]}>
          <Text style={[styles.countNu, { fontSize: isIPad ? 20 : 14 }]}>
            {count} {t('Selected')}
          </Text>
          <Text
            onPress={onClear}
            style={[styles.clear, { fontSize: isIPad ? 20 : 14 }]}>
            {t('Clear')}
          </Text>
        </View>
      )}

      <View style={styles.container}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
          {/* Sort + Filter (if Offline show only icons, if Online show with text) */}
          {!isOnline && <>
            <TouchableOpacity
              style={[
                isOnline ? (isIPad ? styles.actionButtonI : styles.actionButton) : {},
                !isOnline && { marginLeft: isIPad ? 10 : 10, width: isIPad ? 50 : 25 },
              ]}
              onPress={() => onSort('1')}>
              <SvgXml
                xml={ICONS.search.sort}
                width={isIPad ? '30' : '18'}
                height={isIPad ? '30' : '13'}
                style={{ marginRight: isOnline ? 8 : 0 }}
              />
              {isOnline && (
                <Text style={[styles.actionText, { fontSize: isIPad ? 20 : 13 }]}>
                  {t('Sort')}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                isOnline ? (isIPad ? styles.actionButtonI : styles.actionButton) : {},
                !isOnline && { marginLeft: isIPad ? 10 : 10, width: isIPad ? 50 : 30 },
              ]}
              onPress={() => onFilter('2')}>
              <SvgXml
                xml={ICONS.search.filter}
                width={isIPad ? '30' : '15'}
                height={isIPad ? '30' : '15'}
                style={{ marginRight: isOnline ? 8 : 0 }}
              />
              {isOnline && (
                <Text style={[styles.actionText, { fontSize: isIPad ? 20 : 13 }]}>
                  {t('Filter')}
                </Text>
              )}
            </TouchableOpacity></>}

          {/* Select All (Online only here, Offline shown below) */}
          {isOnline && (
            <TouchableOpacity
              activeOpacity={0.4}
              style={[styles.selectAllContainer, { marginLeft: 0 }]}
              onPress={() => onSelectAll(selectAllChecked ? 'Yes' : 'No')}>
              {selectAllChecked ? (
                <View style={isIPad ? styles.selectcheckboxI : styles.selectcheckbox}>
                  <Image
                    source={IMAGES.check}
                    style={isIPad ? styles.tickI : styles.tick}
                  />
                </View>
              ) : (
                <View style={isIPad ? styles.checkboxI : styles.checkbox} />
              )}
              <Text
                style={[styles.selectAllText, { fontSize: isIPad ? 20 : 12 }]}>
                {selectAllChecked
                  ? ` ${t('Deselect All')}`
                  : t('Select All')}
              </Text>
            </TouchableOpacity>
          )}
        </View>


        {/* Right side actions */}
        <View style={styles.actionsContainer}>
          <Image
            source={isOnline ? IMAGES.internet : IMAGES.Nointernet}
            style={isOnline ? styles.network : styles.networkI}
          />
          {isOnline && <>
            <TouchableOpacity
              style={[
                isOnline ? (isIPad ? styles.actionButtonI : styles.actionButton) : {},
                !isOnline && { marginLeft: isIPad ? 10 : 10, width: isIPad ? 50 : 25 },
              ]}
              onPress={() => onSort('1')}>
              <SvgXml
                xml={ICONS.search.sort}
                width={isIPad ? '30' : '18'}
                height={isIPad ? '30' : '13'}
                style={{ marginRight: isOnline ? 8 : 0 }}
              />
              {isOnline && (
                <Text style={[styles.actionText, { fontSize: isIPad ? 20 : 13 }]}>
                  {t('Sort')}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                isOnline ? (isIPad ? styles.actionButtonI : styles.actionButton) : {},
                !isOnline && { marginLeft: isIPad ? 10 : 10, width: isIPad ? 50 : 30 },
              ]}
              onPress={() => onFilter('2')}>
              <SvgXml
                xml={ICONS.search.filter}
                width={isIPad ? '30' : '15'}
                height={isIPad ? '30' : '15'}
                style={{ marginRight: isOnline ? 8 : 0 }}
              />
              {isOnline && (
                <Text style={[styles.actionText, { fontSize: isIPad ? 20 : 13 }]}>
                  {t('Filter')}
                </Text>
              )}
            </TouchableOpacity></>}

          {!isOnline && (
            <>
              <TouchableOpacity
                style={isIPad ? styles.actionButtonCheckI : styles.actionButtonCheck}
                onPress={onShowOfflinePackage}>
                <Text
                  style={{
                    fontSize: isIPad ? 22 : 12,
                    fontFamily: FONTS.RICORDORegular,
                    color: 'black',
                  }}>
                  {t('Checkouts')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={isIPad ? styles.actionButtonCheckI : styles.actionButtonCheck}
                onPress={onClickOfflineMenu}>
                <Text
                  style={{
                    fontSize: isIPad ? 22 : 12,
                    fontFamily: FONTS.RICORDORegular,
                    color: 'black',
                    marginLeft: isIPad ? 15 : 7,
                    backgroundColor: '#fff'
                  }}>
                  {t('Advanced')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  backgroundColor: "#223890",
                  padding: isIPad ? 14 : 7,
                  borderRadius: isIPad ? 14 : 8,
                  alignSelf: "center",
                }}
                onPress={downloadCSV}
              >
                <Image
                  source={IMAGES.downloadForm}
                  style={{
                    height: isIPad ? 32 : 18,
                    width: isIPad ? 32 : 18,
                    resizeMode: 'contain',
                  }}
                  tintColor={'white'}
                />

              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Offline Select All (separate row) */}
      {!isOnline && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 5 }}>
          <TouchableOpacity
            activeOpacity={0.4}
            style={[styles.selectAllContainer, { marginStart: isIPad ? 20 : 10 }]}
            onPress={() => onSelectAll(selectAllChecked ? 'Yes' : 'No')}>
            {selectAllChecked ? (
              <View style={isIPad ? styles.selectcheckboxI : styles.selectcheckbox}>
                <Image
                  source={IMAGES.check}
                  style={isIPad ? styles.tickI : styles.tick}
                />
              </View>
            ) : (
              <View style={isIPad ? styles.checkboxI : styles.checkbox} />
            )}
            <Text style={[styles.selectAllText, { fontSize: isIPad ? 20 : 12 }]}>
              {selectAllChecked
                ? ` ${t('Deselect All')}`
                : t('Select All')}
            </Text>
          </TouchableOpacity>


        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 15 },
  selectAllContainer: { flexDirection: 'row', alignItems: 'center' },
  checkbox: { width: 22, height: 22, borderWidth: 1, borderColor: '#D6D6D6', borderRadius: 4 },
  checkboxI: { width: 26, height: 26, borderWidth: 1, borderColor: '#D6D6D6', borderRadius: 4 },
  selectcheckbox: { width: 20, height: 20, backgroundColor: '#223890', borderRadius: 4, justifyContent: 'center', alignItems: 'center' },
  selectcheckboxI: { width: 28, height: 28, backgroundColor: '#223890', borderRadius: 4, justifyContent: 'center', alignItems: 'center' },
  selectAllText: { color: 'black', fontFamily: FONTS.RICORDORegular, marginLeft: 2, fontWeight: '600' },
  actionsContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  actionButton: { width: 90, height: 40, borderRadius: 20, marginRight: 5, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.25, shadowRadius: 1.84 },
  actionButtonI: { width: 180, height: 70, borderRadius: 40, marginRight: 10, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.25, shadowRadius: 1.84 },
  actionText: { fontSize: 14, color: 'black', fontFamily: FONTS.RICORDORegular },
  tick: { height: 9, width: 13, tintColor: 'white' },
  tickI: { height: 12, width: 17, tintColor: 'white' },
  countNu: { fontSize: 14, color: 'black', fontFamily: FONTS.RICORDOSemiBold, flex: 1 },
  clear: { fontSize: 14, color: '#223890', fontFamily: FONTS.RICORDORegular },
  network: { height: 25, width: 25, tintColor: 'green', marginRight: 10 },
  networkI: { height: isIPad ? 40 : 20, width: isIPad ? 40 : 20, tintColor: '#c93a3a', marginRight: 10 },
  actionButtonCheck: { paddingHorizontal: 10, height: 40, borderRadius: 30, marginEnd: 5, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.25, shadowRadius: 1.84 },
  actionButtonCheckI: { paddingHorizontal: 10, height: 70, borderRadius: 40, marginEnd: 15, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.25, shadowRadius: 1.84 },
});

export default SearchHeader;
