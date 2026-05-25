import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  TextInput,
  View,
  Animated,
  Text,
} from "react-native";
import { isIPad } from "../utilities/securestorage";

interface Props {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: any;
  autoCapitalize?: any;
  secureTextEntry?: boolean;
  multiline?: boolean;
  numberofline?:Number;
  prefix?: string; // 👈 added for $ or other symbols
  editable?: boolean;
}

const CommonInput: React.FC<Props> = ({
  label,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize,
  secureTextEntry,
  prefix,
  multiline,
  numberofline,
  editable = true
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const animatedIsFocused = new Animated.Value(value || isFocused ? 1 : 0);

  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);

  useEffect(() => {
    Animated.timing(animatedIsFocused, {
      toValue: value || isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [value, isFocused]);

  const labelStyle = {
    position: "absolute" as const,
    left: prefix ? 15 : 0, // shift label if prefix exists
    top: animatedIsFocused.interpolate({
      inputRange: [0, 1],
      outputRange: [isIPad ? 20 : 14, isIPad ? -14 : -10],
    }),
    fontSize: animatedIsFocused.interpolate({
      inputRange: [0, 1],
      outputRange: [isIPad ? 20 : 14, isIPad ? 18 : 12],
    }),
    color: animatedIsFocused.interpolate({
      inputRange: [0, 1],
      outputRange: ["#999", "#223890"],
    }),
    fontWeight: "500" as const,
  };

  return (
    <View style={styles.container}>
      {label && <Animated.Text style={[styles.label, labelStyle]}>{label}</Animated.Text>}
      <View
        style={[
          styles.inputWrapper,
          {
            borderColor: isFocused || value ? "#223890" : "#ccc",
          },
        ]}
      >
        {prefix && <Text style={styles.prefix}>{prefix}</Text>}
        <TextInput
          style={styles.input}
          value={value}
          // numberOfLines={numberofline}
          multiline={multiline}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry}
          editable={editable}
        />
      </View>
    </View>
  );
};

export default CommonInput;

const styles = StyleSheet.create({
  container: {
    marginBottom: isIPad ? 24 : 18,
    position: "relative",
    paddingTop: 0,
  },
  label: {},
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    paddingVertical: isIPad ? 12 : 8,
  },
  prefix: {
    fontSize: isIPad ? 20 : 14,
    color: "#999",
    marginRight: 4,
    marginBottom:-10
  },
  input: {
    flex: 1,
    fontSize: isIPad ? 20 : 14,
    color: "#000",
    paddingVertical: 0,
  },
});
