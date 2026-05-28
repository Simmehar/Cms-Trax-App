import React, {useEffect, useState} from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Hamesha check karein ki aapke components Named export hain ya Default
import {Login} from '../screens/Login';
import {Home} from '../screens/Home';
import {Search} from '../screens/Search';
import Checkout from '../screens/Checkout'; // Check if default or named {}
import {CheckoutData} from '../screens/CheckoutData';
import {AddRecipient} from '../screens/AddRecipient';
import {RecentActivity} from '../screens/RecentActivity';
import ScannerView from '../components/ScannerView'; // Check if default or named {}
import OfflineCheckout from '../screens/OfflineCheckout';
import ShowOfflineCheckout from '../screens/showOfflineCheckout';
import AdvancedForms from '../screens/advancedForms';
import LoggedTodayScreen from '../screens/LoggedTodayScreen';
import TotalReceive from '../screens/TotalReceive';
import { BusinessSelect } from '../screens/BusinessSelection';

const Stack = createNativeStackNavigator();

interface StackNavigatorProps {
  isLoggedIn: boolean;
}

const StackNavigator: React.FC<StackNavigatorProps> = ({isLoggedIn}) => {
  const [loading, setLoading] = useState(true);
  const [businessSelected, setBusinessSelected] = useState(false);

  useEffect(() => {
    checkBusinessSelection();
  }, []);

  const checkBusinessSelection = async () => {
    try {
      const savedUrl = await AsyncStorage.getItem('BASE_URL');
      console.log('savedUrl =====>', savedUrl);

      if (savedUrl) {
        setBusinessSelected(true);
      } else {
        setBusinessSelected(false);
      }
    } catch (error) {
      console.log('checkBusinessSelection error =====>', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null; // Jab tak loading chal rahi hai, screen blank rahegi (ya activity indicator de sakte hain)
  }

  return (
    <Stack.Navigator
      initialRouteName={businessSelected ? 'Login' : 'BusinessSelect'}
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
      }}>
      
      {/* CONDITIONAL HATA DIYA HAI: 
        Screens ko hamesha stack mein rakhein, initialRouteName decide karega ki pehle kaun si dikhegi.
      */}
      <Stack.Screen name="BusinessSelect" component={BusinessSelect} />

      <Stack.Screen name="Login" component={Login} />

      <Stack.Screen name="Home" component={Home} />

      <Stack.Screen name="Search" component={Search} />

      <Stack.Screen name="Checkout" component={Checkout} />

      <Stack.Screen name="CheckoutData" component={CheckoutData} />

      <Stack.Screen name="AddRecipient" component={AddRecipient} />

      <Stack.Screen name="RecentActivity" component={RecentActivity} />

      <Stack.Screen name="OfflineCheckout" component={OfflineCheckout} />

      <Stack.Screen name="ShowAdvancedForms" component={AdvancedForms} />

      <Stack.Screen name="ShowOfflineCheckout" component={ShowOfflineCheckout} />

      <Stack.Screen name="ShowOfflineMenu" component={ShowOfflineCheckout} />

      <Stack.Screen name="ScannerView" component={ScannerView} />

      <Stack.Screen name="LoggedTodayScreen" component={LoggedTodayScreen} />

      <Stack.Screen name="TotalReceive" component={TotalReceive} />
    </Stack.Navigator>
  );
};

export {StackNavigator};