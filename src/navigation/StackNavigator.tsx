import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {Login} from '../screens/Login';
import {Home} from '../screens/Home';
import {Search} from '../screens/Search';
import Checkout from '../screens/Checkout';
import {CheckoutData} from '../screens/CheckoutData';
import {AddRecipient} from '../screens/AddRecipient';
import {RecentActivity} from '../screens/RecentActivity';
import ScannerView from '../components/ScannerView';
import OfflineCheckout from '../screens/OfflineCheckout';
import ShowOfflineCheckout from '../screens/showOfflineCheckout';
import AdvancedForms from '../screens/advancedForms';
import LoggedTodayScreen from '../screens/LoggedTodayScreen';
import TotalReceive from '../screens/TotalReceive';

// import { ScanCamera } from '../components/ScanCamera';

const Stack = createNativeStackNavigator();



const StackNavigatorLoggedIn = () => {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
      }}>
      <Stack.Screen name="Home" component={Home} />
      <Stack.Screen name="Login" component={Login} />
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

      {/* <Stack.Screen name="ScanCamera" component={ScanCamera} /> */}
    </Stack.Navigator>
  );
};


interface StackNavigatorProps {
  isLoggedIn: boolean;
}

const StackNavigator: React.FC<StackNavigatorProps> = ({isLoggedIn}) => {
  return (
    <>
      <StackNavigatorLoggedIn />
    </>
  );
};

export {StackNavigator};
