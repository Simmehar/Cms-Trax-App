import React from "react";
import { View, StyleSheet, ActivityIndicator, Dimensions } from "react-native";
import { useNavigationContext } from "../contexts/navigationcontext";

interface loaderProps {
   
}

const LoaderView :  React.FC<loaderProps> = ({}) => {
    const {showLoader, setShowLoader} = useNavigationContext();
   __DEV__ && console.log("==showLoader==",showLoader);
   
  return showLoader ? (
    <View style={styles.container}>
      <ActivityIndicator size={"large"} color={"#0095FF"} />
    </View>
  ) : (
    <View />
  );
};

export default LoaderView;

const styles = StyleSheet.create({
  container: {
    // flex: 1,
    position: "absolute",
    height: Dimensions.get('window').height,
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
});
