import React from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";

interface Action {
  key: string;
  name: string;
  image: any;
}

interface Props {
  actions: Action[];
  selected: string;
  onSelect: (key: string) => void;
}

const Tabs: React.FC<Props> = ({ actions, selected, onSelect }) => {
  const isIPad = Platform.OS === "ios" && Platform.isPad;

  return (
    <View style={[styles.wrapper, isIPad && styles.wrapperI]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabContainer}
        showsVerticalScrollIndicator={false}
        bounces={false}
        scrollEnabled={true}
        alwaysBounceHorizontal={false}
      >
        {actions.map((item) => {
          const isActive = selected === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.tab, isActive && styles.activeTab, isIPad && styles.tabI]}
              onPress={() => onSelect(item.key)}
            >
              <Image
                source={item.image}
                style={[styles.icon, isActive && styles.activeIcon, isIPad && styles.iconI]}
              />
              <Text style={[styles.tabText, isActive && styles.activeTabText, isIPad && styles.tabTextI]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default Tabs;

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 12,
    paddingVertical: 8,
    marginBottom: 20,
    width: '100%',
  },
  wrapperI: {
    paddingVertical: 12,
    borderRadius: 16,
  },
  tabContainer: {
    paddingHorizontal: 12,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 25,
    marginRight: 12,
    minWidth: 100,
    backgroundColor: "#F4F4F4",
  },
  tabI: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 30,
    minWidth: 120,
  },
  activeTab: {
    backgroundColor: "#008998",
  },

  icon: {
    width: 20,
    height: 20,
    marginRight: 8,
    tintColor: "#989898", 
    resizeMode: "contain",
  },

  iconI: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  activeIcon: {
    tintColor: "#fff", 
  },
  tabText: {
    fontSize: 14,
    color: "#989898",
    fontWeight: "600",
    textAlign: "center",
  },
  tabTextI: {
    fontSize: 18,
  },
  activeTabText: {
    color: "#fff", 
    fontWeight: "700",
  },
});
