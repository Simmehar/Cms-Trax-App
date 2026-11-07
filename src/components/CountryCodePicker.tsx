import React, { useState } from "react";
import Svg, { Circle, Line } from "react-native-svg";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  FlatList,
  StyleProp,
  ViewStyle,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from "react-native";
import { isIPad } from "../utilities/securestorage";

interface Country {
  name: string;
  code: string;
  /** Digits in the national number (without the country code): exact or [min, max]. */
  digits: number | [number, number];
  flag: string;
}

interface Props {
  value: string; // selected country code
  onSelect: (code: string) => void;
  style?: StyleProp<ViewStyle>; // optional override for the trigger button
}

// List of countries with codes, national-number lengths and flags
const countries: Country[] = [
   { name: "United States", code: "+1", digits: 10, flag: "🇺🇸" },
   { name: "Afghanistan", code: "+93", digits: 9, flag: "🇦🇫" },
   { name: "Albania", code: "+355", digits: [8, 9], flag: "🇦🇱" },
   { name: "Algeria", code: "+213", digits: 9, flag: "🇩🇿" },
   { name: "Andorra", code: "+376", digits: [6, 9], flag: "🇦🇩" },
   { name: "Angola", code: "+244", digits: 9, flag: "🇦🇴" },
   { name: "Argentina", code: "+54", digits: 10, flag: "🇦🇷" },
   { name: "Armenia", code: "+374", digits: 8, flag: "🇦🇲" },
   { name: "Australia", code: "+61", digits: 9, flag: "🇦🇺" },
   { name: "Austria", code: "+43", digits: [8, 13], flag: "🇦🇹" },
   { name: "Azerbaijan", code: "+994", digits: 9, flag: "🇦🇿" },
   { name: "Bahamas", code: "+1-242", digits: 7, flag: "🇧🇸" },
   { name: "Bahrain", code: "+973", digits: 8, flag: "🇧🇭" },
   { name: "Bangladesh", code: "+880", digits: 10, flag: "🇧🇩" },
   { name: "Barbados", code: "+1-246", digits: 7, flag: "🇧🇧" },
   { name: "Belarus", code: "+375", digits: 9, flag: "🇧🇾" },
   { name: "Belgium", code: "+32", digits: [8, 9], flag: "🇧🇪" },
   { name: "Belize", code: "+501", digits: 7, flag: "🇧🇿" },
   { name: "Benin", code: "+229", digits: [8, 10], flag: "🇧🇯" },
   { name: "Bhutan", code: "+975", digits: 8, flag: "🇧🇹" },
   { name: "Bolivia", code: "+591", digits: 8, flag: "🇧🇴" },
   { name: "Bosnia & Herzegovina", code: "+387", digits: [8, 9], flag: "🇧🇦" },
   { name: "Botswana", code: "+267", digits: [7, 8], flag: "🇧🇼" },
   { name: "Brazil", code: "+55", digits: [10, 11], flag: "🇧🇷" },
   { name: "Brunei", code: "+673", digits: 7, flag: "🇧🇳" },
   { name: "Bulgaria", code: "+359", digits: [8, 9], flag: "🇧🇬" },
   { name: "Burkina Faso", code: "+226", digits: 8, flag: "🇧🇫" },
   { name: "Burundi", code: "+257", digits: 8, flag: "🇧🇮" },
   { name: "Cambodia", code: "+855", digits: [8, 9], flag: "🇰🇭" },
   { name: "Cameroon", code: "+237", digits: 9, flag: "🇨🇲" },
   { name: "Canada", code: "+1", digits: 10, flag: "🇨🇦" },
  { name: "Cape Verde", code: "+238", digits: 7, flag: "🇨🇻" },
  { name: "Central African Republic", code: "+236", digits: 8, flag: "🇨🇫" },
  { name: "Chad", code: "+235", digits: 8, flag: "🇹🇩" },
  { name: "Chile", code: "+56", digits: 9, flag: "🇨🇱" },
  { name: "China", code: "+86", digits: [10, 11], flag: "🇨🇳" },
  { name: "Colombia", code: "+57", digits: 10, flag: "🇨🇴" },
  { name: "Comoros", code: "+269", digits: 7, flag: "🇰🇲" },
  { name: "Costa Rica", code: "+506", digits: 8, flag: "🇨🇷" },
  { name: "Croatia", code: "+385", digits: [8, 9], flag: "🇭🇷" },
  { name: "Cuba", code: "+53", digits: [6, 8], flag: "🇨🇺" },
  { name: "Cyprus", code: "+357", digits: 8, flag: "🇨🇾" },
  { name: "Czech Republic", code: "+420", digits: 9, flag: "🇨🇿" },
  { name: "Denmark", code: "+45", digits: 8, flag: "🇩🇰" },
  { name: "Djibouti", code: "+253", digits: 8, flag: "🇩🇯" },
  { name: "Dominica", code: "+1-767", digits: 7, flag: "🇩🇲" },
  { name: "Dominican Republic", code: "+1-809", digits: 7, flag: "🇩🇴" },
  { name: "Ecuador", code: "+593", digits: 9, flag: "🇪🇨" },
  { name: "Egypt", code: "+20", digits: 10, flag: "🇪🇬" },
  { name: "El Salvador", code: "+503", digits: 8, flag: "🇸🇻" },
  { name: "Estonia", code: "+372", digits: [7, 8], flag: "🇪🇪" },
  { name: "Eswatini", code: "+268", digits: 8, flag: "🇸🇿" },
  { name: "Ethiopia", code: "+251", digits: 9, flag: "🇪🇹" },
  { name: "Fiji", code: "+679", digits: 7, flag: "🇫🇯" },
  { name: "Finland", code: "+358", digits: [6, 12], flag: "🇫🇮" },
  { name: "France", code: "+33", digits: 9, flag: "🇫🇷" },
  { name: "Gabon", code: "+241", digits: [7, 8], flag: "🇬🇦" },
  { name: "Georgia", code: "+995", digits: 9, flag: "🇬🇪" },
  { name: "Germany", code: "+49", digits: [6, 13], flag: "🇩🇪" },
  { name: "Ghana", code: "+233", digits: 9, flag: "🇬🇭" },
  { name: "Greece", code: "+30", digits: 10, flag: "🇬🇷" },
  { name: "Guatemala", code: "+502", digits: 8, flag: "🇬🇹" },
  { name: "Guinea", code: "+224", digits: 9, flag: "🇬🇳" },
  { name: "Haiti", code: "+509", digits: 8, flag: "🇭🇹" },
  { name: "Honduras", code: "+504", digits: 8, flag: "🇭🇳" },
  { name: "Hungary", code: "+36", digits: [8, 9], flag: "🇭🇺" },
  { name: "Iceland", code: "+354", digits: 7, flag: "🇮🇸" },
  { name: "India", code: "+91", digits: 10, flag: "🇮🇳" },
  { name: "Indonesia", code: "+62", digits: [9, 12], flag: "🇮🇩" },
  { name: "Iran", code: "+98", digits: 10, flag: "🇮🇷" },
  { name: "Iraq", code: "+964", digits: 10, flag: "🇮🇶" },
  { name: "Ireland", code: "+353", digits: [7, 9], flag: "🇮🇪" },
  { name: "Israel", code: "+972", digits: [8, 9], flag: "🇮🇱" },
  { name: "Italy", code: "+39", digits: [6, 11], flag: "🇮🇹" },
  { name: "Jamaica", code: "+1-876", digits: 7, flag: "🇯🇲" },
  { name: "Japan", code: "+81", digits: [9, 10], flag: "🇯🇵" },
  { name: "Jordan", code: "+962", digits: 9, flag: "🇯🇴" },
  { name: "Kazakhstan", code: "+7", digits: 10, flag: "🇰🇿" },
  { name: "Kenya", code: "+254", digits: 9, flag: "🇰🇪" },
  { name: "Kiribati", code: "+686", digits: [5, 8], flag: "🇰🇮" },
  { name: "Kuwait", code: "+965", digits: 8, flag: "🇰🇼" },
  { name: "Kyrgyzstan", code: "+996", digits: 9, flag: "🇰🇬" },
  { name: "Laos", code: "+856", digits: [8, 10], flag: "🇱🇦" },
  { name: "Latvia", code: "+371", digits: 8, flag: "🇱🇻" },
  { name: "Lebanon", code: "+961", digits: [7, 8], flag: "🇱🇧" },
  { name: "Lesotho", code: "+266", digits: 8, flag: "🇱🇸" },
  { name: "Liberia", code: "+231", digits: [7, 9], flag: "🇱🇷" },
  { name: "Libya", code: "+218", digits: 9, flag: "🇱🇾" },
  { name: "Liechtenstein", code: "+423", digits: 7, flag: "🇱🇮" },
  { name: "Lithuania", code: "+370", digits: 8, flag: "🇱🇹" },
  { name: "Luxembourg", code: "+352", digits: [6, 9], flag: "🇱🇺" },
  { name: "Madagascar", code: "+261", digits: 9, flag: "🇲🇬" },
  { name: "Malawi", code: "+265", digits: [7, 9], flag: "🇲🇼" },
  { name: "Malaysia", code: "+60", digits: [9, 10], flag: "🇲🇾" },
  { name: "Maldives", code: "+960", digits: 7, flag: "🇲🇻" },
  { name: "Mali", code: "+223", digits: 8, flag: "🇲🇱" },
  { name: "Malta", code: "+356", digits: 8, flag: "🇲🇹" },
  { name: "Mauritania", code: "+222", digits: 8, flag: "🇲🇷" },
  { name: "Mauritius", code: "+230", digits: [7, 8], flag: "🇲🇺" },
  { name: "Mexico", code: "+52", digits: 10, flag: "🇲🇽" },
  { name: "Moldova", code: "+373", digits: 8, flag: "🇲🇩" },
  { name: "Monaco", code: "+377", digits: [8, 9], flag: "🇲🇨" },
  { name: "Mongolia", code: "+976", digits: 8, flag: "🇲🇳" },
  { name: "Montenegro", code: "+382", digits: 8, flag: "🇲🇪" },
  { name: "Morocco", code: "+212", digits: 9, flag: "🇲🇦" },
  { name: "Mozambique", code: "+258", digits: 9, flag: "🇲🇿" },
  { name: "Myanmar", code: "+95", digits: [7, 10], flag: "🇲🇲" },
  { name: "Namibia", code: "+264", digits: 9, flag: "🇳🇦" },
  { name: "Nauru", code: "+674", digits: 7, flag: "🇳🇷" },
  { name: "Nepal", code: "+977", digits: 10, flag: "🇳🇵" },
  { name: "Netherlands", code: "+31", digits: 9, flag: "🇳🇱" },
  { name: "New Zealand", code: "+64", digits: [8, 10], flag: "🇳🇿" },
  { name: "Nicaragua", code: "+505", digits: 8, flag: "🇳🇮" },
  { name: "Niger", code: "+227", digits: 8, flag: "🇳🇪" },
  { name: "Nigeria", code: "+234", digits: 10, flag: "🇳🇬" },
  { name: "North Korea", code: "+850", digits: [8, 10], flag: "🇰🇵" },
  { name: "North Macedonia", code: "+389", digits: 8, flag: "🇲🇰" },
  { name: "Norway", code: "+47", digits: 8, flag: "🇳🇴" },
  { name: "Oman", code: "+968", digits: 8, flag: "🇴🇲" },
  { name: "Pakistan", code: "+92", digits: 10, flag: "🇵🇰" },
  { name: "Panama", code: "+507", digits: 8, flag: "🇵🇦" },
  { name: "Papua New Guinea", code: "+675", digits: [7, 8], flag: "🇵🇬" },
  { name: "Paraguay", code: "+595", digits: 9, flag: "🇵🇾" },
  { name: "Peru", code: "+51", digits: 9, flag: "🇵🇪" },
  { name: "Philippines", code: "+63", digits: 10, flag: "🇵🇭" },
  { name: "Poland", code: "+48", digits: 9, flag: "🇵🇱" },
  { name: "Portugal", code: "+351", digits: 9, flag: "🇵🇹" },
  { name: "Qatar", code: "+974", digits: 8, flag: "🇶🇦" },
  { name: "Romania", code: "+40", digits: 9, flag: "🇷🇴" },
  { name: "Russia", code: "+7", digits: 10, flag: "🇷🇺" },
  { name: "Rwanda", code: "+250", digits: 9, flag: "🇷🇼" },
  { name: "Saudi Arabia", code: "+966", digits: 9, flag: "🇸🇦" },
  { name: "Senegal", code: "+221", digits: 9, flag: "🇸🇳" },
  { name: "Serbia", code: "+381", digits: [8, 9], flag: "🇷🇸" },
  { name: "Singapore", code: "+65", digits: 8, flag: "🇸🇬" },
  { name: "Slovakia", code: "+421", digits: 9, flag: "🇸🇰" },
  { name: "Slovenia", code: "+386", digits: 8, flag: "🇸🇮" },
  { name: "Somalia", code: "+252", digits: [7, 9], flag: "🇸🇴" },
  { name: "South Africa", code: "+27", digits: 9, flag: "🇿🇦" },
  { name: "South Korea", code: "+82", digits: [9, 10], flag: "🇰🇷" },
  { name: "Spain", code: "+34", digits: 9, flag: "🇪🇸" },
  { name: "Sri Lanka", code: "+94", digits: 9, flag: "🇱🇰" },
  { name: "Sudan", code: "+249", digits: 9, flag: "🇸🇩" },
  { name: "Sweden", code: "+46", digits: [7, 10], flag: "🇸🇪" },
  { name: "Switzerland", code: "+41", digits: 9, flag: "🇨🇭" },
  { name: "Syria", code: "+963", digits: 9, flag: "🇸🇾" },
  { name: "Taiwan", code: "+886", digits: 9, flag: "🇹🇼" },
  { name: "Tajikistan", code: "+992", digits: 9, flag: "🇹🇯" },
  { name: "Tanzania", code: "+255", digits: 9, flag: "🇹🇿" },
  { name: "Thailand", code: "+66", digits: 9, flag: "🇹🇭" },
  { name: "Togo", code: "+228", digits: 8, flag: "🇹🇬" },
  { name: "Tonga", code: "+676", digits: [5, 7], flag: "🇹🇴" },
  { name: "Tunisia", code: "+216", digits: 8, flag: "🇹🇳" },
  { name: "Turkey", code: "+90", digits: 10, flag: "🇹🇷" },
  { name: "Turkmenistan", code: "+993", digits: 8, flag: "🇹🇲" },
  { name: "Uganda", code: "+256", digits: 9, flag: "🇺🇬" },
  { name: "Ukraine", code: "+380", digits: 9, flag: "🇺🇦" },
  { name: "United Arab Emirates", code: "+971", digits: 9, flag: "🇦🇪" },
  { name: "United Kingdom", code: "+44", digits: 10, flag: "🇬🇧" },
  { name: "United States", code: "+1", digits: 10, flag: "🇺🇸" },
  { name: "Uruguay", code: "+598", digits: 8, flag: "🇺🇾" },
  { name: "Uzbekistan", code: "+998", digits: 9, flag: "🇺🇿" },
  { name: "Venezuela", code: "+58", digits: 10, flag: "🇻🇪" },
  { name: "Vietnam", code: "+84", digits: 9, flag: "🇻🇳" },
  { name: "Yemen", code: "+967", digits: 9, flag: "🇾🇪" },
  { name: "Zambia", code: "+260", digits: 9, flag: "🇿🇲" },
  { name: "Zimbabwe", code: "+263", digits: 9, flag: "🇿🇼" },
];

/** Allowed digit count of the national number for a country code. */
export const getPhoneDigits = (code: string): { min: number; max: number } => {
  const country = countries.find((c) => c.code === code);
  if (!country) return { min: 4, max: 15 };
  const d = country.digits;
  return Array.isArray(d) ? { min: d[0], max: d[1] } : { min: d, max: d };
};

const CountryCodePicker: React.FC<Props> = ({ value, onSelect, style }) => {
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState("");
  const { height: windowHeight } = useWindowDimensions();

  const open = () => setVisible(true);

  const close = () => {
    setVisible(false);
    setSearch("");
  };

  const query = search.trim().toLowerCase();
  const queryDigits = query.replace(/[^0-9]/g, "");
  const filtered = query
    ? countries.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          (queryDigits.length > 0 &&
            c.code.replace(/[^0-9]/g, "").includes(queryDigits))
      )
    : countries;

  return (
    <>
      {/* Trigger Button */}
      <TouchableOpacity
        style={[styles.container, style]}
        onPress={open}
      >
        <Text style={styles.flag}>{countries.find(c => c.code === value)?.flag}</Text>
        <Text style={styles.code}>{value}</Text>
      </TouchableOpacity>

      {/* Centered popup */}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        {/* Light translucent backdrop: a tap anywhere outside the box closes
            the popup. The inner Pressable swallows taps inside the box. */}
        <Pressable style={styles.backdrop} onPress={close}>
          <KeyboardAvoidingView
            style={styles.centerWrap}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <Pressable style={styles.modalBox} onPress={() => {}}>
              <Text style={styles.modalTitle}>Select Country</Text>

              <View style={styles.searchBox}>
                <Svg width={18} height={18} viewBox="0 0 24 24">
                  <Circle cx="10.5" cy="10.5" r="7" stroke="#8E8E93" strokeWidth="2" fill="none" />
                  <Line x1="16" y1="16" x2="21" y2="21" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round" />
                </Svg>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search country or code"
                  placeholderTextColor="#8E8E93"
                  value={search}
                  onChangeText={setSearch}
                  autoCorrect={false}
                  autoCapitalize="none"
                  clearButtonMode="while-editing"
                  returnKeyType="search"
                />
              </View>

              {/* Fixed height so the popup keeps its size while searching */}
              <FlatList
                data={filtered}
                style={{ height: windowHeight * 0.4 }}
                keyExtractor={(item, index) => item.code + index}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No countries found</Text>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.item}
                    onPress={() => {
                      onSelect(item.code);
                      close();
                    }}
                  >
                    <Text style={styles.flag}>{item.flag}</Text>
                    <Text style={styles.itemText}>
                      {item.name} ({item.code})
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </>
  );
};

export default CountryCodePicker;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#ccc",
    // paddingTop: isIPad ? 12 : 0,
    paddingRight: 10,
    marginRight: 10,
    // backgroundColor:'red',
    marginBottom:8
  },
  flag: {
    fontSize: 20,
  },
  code: {
    fontSize: isIPad ? 20 : 14,
    marginLeft: 5,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  centerWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalBox: {
    width: "100%",
    maxWidth: isIPad ? 520 : 400,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    height: isIPad ? 50 : 44,
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    paddingVertical: 0,
    fontSize: isIPad ? 18 : 16,
    color: "#000",
    includeFontPadding: false,
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyText: {
    textAlign: "center",
    color: "#999",
    paddingVertical: 20,
    fontSize: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 15,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  itemText: {
    fontSize: 16,
    marginLeft: 10,
  },
  closeBtn: {
    marginTop: 20,
    alignSelf: "center",
  },
  closeText: {
    fontSize: 16,
    color: "red",
  },
});