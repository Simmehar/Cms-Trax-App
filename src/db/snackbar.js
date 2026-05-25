import React, { useState, useEffect } from "react";
import { Snackbar } from "react-native-paper";
import { View, StyleSheet, Text } from "react-native";
import { useMode } from "./db.context";
import { FontAwesome } from "@expo/vector-icons";

const ModeSnackbar = () => {
  const { isOnline } = useMode();
  const [visible, setVisible] = useState(!isOnline);

  useEffect(() => {
    setVisible(!isOnline);

    // Auto-dismiss the Snackbar after 5 seconds
    const timer = setTimeout(() => {
      setVisible(false);
    }, 5000);

    return () => {
      clearTimeout(timer);
    };
  }, [isOnline]);

  const handleDismiss = () => {
    setVisible(false);
  };

  return (
    <View style={styles.container}>
      <Snackbar
        visible={visible}
        onDismiss={handleDismiss}
        style={isOnline ? styles.onlineSnackbar : styles.offlineSnackbar}
      >
        <View style={styles.snackbarContent}>
          <FontAwesome
            name={isOnline ? "check-circle" : "times-circle"}
            size={24}
            color="white"
          />
          <Text style={styles.snackbarText}>
            {isOnline
              ? "Connected to the internet!"
              : "You are in offline mode"}
          </Text>
        </View>
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 100, // Adjust this value as needed to move the Snackbar up or down
    left: 0,
    right: 0,
    zIndex: 9999, // Ensure it appears on top of other content
  },
  onlineSnackbar: {
    backgroundColor: "green",
    // backgroundColor: "rgba(0, 128, 0, 0.9)", Transparent
  },
  offlineSnackbar: {
    backgroundColor: "red",
    // backgroundColor: "rgba(255, 0, 0, 0.9)", Transparent
  },
  snackbarContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  snackbarText: {
    marginLeft: 10,
    color: "white",
  },
});

export default ModeSnackbar;
