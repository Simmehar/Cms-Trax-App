import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { FONTS } from '../assets';
import { isIPad } from '../utilities/securestorage';

interface Props {
  visible: boolean;
  title?: string;
  message: string;
  buttonText?: string;
  onClose: () => void;
}

/**
 * Centered warning popup: amber triangle icon, title, message and one button.
 * A tap on the dimmed background also closes it.
 */
const WarningPopup: React.FC<Props> = ({
  visible,
  title,
  message,
  buttonText = 'OK',
  onClose,
}) => (
  <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
    <Pressable style={styles.overlay} onPress={onClose}>
      {/* Inner Pressable swallows taps inside the box */}
      <Pressable style={styles.box} onPress={() => {}}>
        <View style={styles.iconWrap}>
          <Svg width={isIPad ? 44 : 34} height={isIPad ? 44 : 34} viewBox="0 0 24 24">
            <Path d="M12 3.5 2.5 20h19L12 3.5z" fill="#F5A623" />
            <Path d="M12 9.5v4.5" stroke="#fff" strokeWidth={2} strokeLinecap="round" />
            <Circle cx="12" cy="17" r="1.2" fill="#fff" />
          </Svg>
        </View>
        {!!title && <Text style={styles.title}>{title}</Text>}
        <Text style={styles.message}>{message}</Text>
        <TouchableOpacity style={styles.button} onPress={onClose} activeOpacity={0.8}>
          <Text style={styles.buttonText}>{buttonText}</Text>
        </TouchableOpacity>
      </Pressable>
    </Pressable>
  </Modal>
);

export default WarningPopup;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  box: {
    width: '100%',
    maxWidth: isIPad ? 480 : 360,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
  },
  iconWrap: {
    width: isIPad ? 84 : 64,
    height: isIPad ? 84 : 64,
    borderRadius: isIPad ? 42 : 32,
    backgroundColor: '#FFF4E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: isIPad ? 26 : 20,
    fontFamily: FONTS.RICORDOSemiBold,
    fontWeight: 'bold',
    color: '#F5A623',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: isIPad ? 20 : 16,
    lineHeight: isIPad ? 28 : 22,
    fontFamily: FONTS.RICORDORegular,
    color: '#444',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    alignSelf: 'stretch',
    backgroundColor: '#223890',
    paddingVertical: isIPad ? 14 : 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: isIPad ? 20 : 16,
    fontFamily: FONTS.RICORDOSemiBold,
    fontWeight: '600',
    textAlign: 'center',
  },
});
