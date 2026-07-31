import AsyncStorage from "@react-native-async-storage/async-storage";

const CUSTOMER_KEY = "@customers";

const CustomersStorage = {
  saveCustomers: async (newCustomers) => {
    try {
      // Get existing customers
      const existingData = await AsyncStorage.getItem(CUSTOMER_KEY);
      const existingCustomers = existingData ? JSON.parse(existingData) : [];

      // Merge old + new
      const mergedCustomers = [...existingCustomers, ...newCustomers];

      // Remove duplicate customers by id
      const uniqueCustomers = Array.from(
        new Map(
          mergedCustomers.map(customer => [customer.id, customer])
        ).values()
      );

      await AsyncStorage.setItem(
        CUSTOMER_KEY,
        JSON.stringify(uniqueCustomers)
      );

      return true;
    } catch (error) {
      console.log("saveCustomers error:", error);
      return false;
    }
  },

  getAllCustomers: async () => {
    try {
      const data = await AsyncStorage.getItem(CUSTOMER_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.log("getAllCustomers error:", error);
      return [];
    }
  },

  clearCustomers: async () => {
    try {
      await AsyncStorage.removeItem(CUSTOMER_KEY);
    } catch (error) {
      console.log("clearCustomers error:", error);
    }
  },
};

export default CustomersStorage;