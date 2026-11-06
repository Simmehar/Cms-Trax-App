import React, {createContext, useState, ReactNode, FC, useContext} from 'react';
import {
  saveData,
  getData,
  deleteData,
  StoredData,
} from '../utilities/securestorage';
import axios from 'axios';
import {api} from '../services/api.service';
import {
  clearDeviceToken,
  getCachedFcmToken,
} from '../services/notification.service';
import {Backend_URL} from '../util/apiCalls';

interface User {
  id: string;
  token: string;
  firstname: string;
}

interface AuthContextType {
  user: User;
  setUser: any;
  login: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  expire: () => Promise<void>;
  isLoggedIn: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Dedicated client: the global axios interceptors (session-expiry handling in
// Login.tsx) must not turn a failed logout request into another logout.
const logoutClient = axios.create({timeout: 5000});

/**
 * POST {Backend_URL}/logout with this device's push token, so the backend can
 * end the session and stop sending notifications to this device.
 * Never throws: logout has to complete locally even when the network or the
 * session is already gone.
 */
const logoutFromBackend = async (
  authToken: string | undefined,
  deviceToken: string | null,
): Promise<void> => {
  if (!authToken || !Backend_URL) {
    return;
  }
  try {
    await logoutClient.post(
      Backend_URL + '/logout',
      deviceToken ? {device_token: deviceToken} : {},
      {
        headers: {
          Authorization: 'Bearer ' + authToken,
          'Content-Type': 'application/json',
        },
      },
    );
    __DEV__ && console.log('[Auth] backend logout ok');
  } catch (error: any) {
    __DEV__ &&
      console.log(
        '[Auth] backend logout failed',
        error?.response?.status,
        error?.response?.data || error?.message,
      );
  }
};

interface AuthProviderProps {
  children: ReactNode;
}

const AuthProvider: FC<AuthProviderProps> = ({children}) => {
  const [user, setUser] = useState<User>({id: '', token: '', firstname: '',currentplan:''});

  const login = async (data: any) => {
    const key = 'user.data';
    const value: StoredData = {};

    if (data?.token) {
      setUser(prev => ({...prev, token: data.token}));
      value.token = data.token;
    }
    if (data?.user?.firstname) {
      setUser(prev => ({...prev, firstname: data.user.firstname}));
      value.firstname = data.user.firstname;
    }
    if (data?.user?.id) {
      setUser(prev => ({...prev, id: data.user.id}));
      value.id = data.user.id.toString();
    }
     if (data?.user?.currentplan) {
      setUser(prev => ({...prev, currentplan: data.user.currentplan}));
      value.currentplan = data.user.currentplan.toString();
    }
    __DEV__ && console.log(user);
    // await saveData(key, value);
  };

  const logout = async () => {
    const key = 'user.data';
    const authToken =
      user?.token && user.token !== 'expired' ? user.token : undefined;

    // 1. Local session first, before any other async work, and resolve right
    //    after it: the Logout button navigates to Login as soon as this
    //    resolves, and Login bounces back to Home if it still finds a session.
    await deleteData(key);
    setUser({token: '', firstname: '', id: '', currentplan: ''});

    // 2. Best-effort cleanup that must not hold up the UI: tell the backend
    //    (POST /logout with device_token) and drop this device's push token so
    //    it stops receiving the previous user's notifications. The next login
    //    sends a fresh device_token.
    const cleanup = async () => {
      const deviceToken = await getCachedFcmToken();
      await logoutFromBackend(authToken, deviceToken);
      await clearDeviceToken();
    };
    cleanup().catch(
      error => __DEV__ && console.log('[Auth] logout cleanup failed', error),
    );
  };

  const expire = async () => {
    __DEV__ && console.log('expire :>> ');
    const key = 'user.data';
    const existingData = await getData(key);
    __DEV__ && console.log('existingData', existingData)
    if (existingData) {
      existingData.token = 'expired';
      await saveData(key, existingData);
      setUser(prev => ({...prev, token: 'expired'}));
    }
  };

  const isLoggedIn = async (): Promise<boolean> => {
    const key = 'user.data';
    const data = await getData(key);
    return !!data?.token;
  };

  return (
    <AuthContext.Provider
      value={{user, login, logout, expire, setUser, isLoggedIn}}>
      {children}
    </AuthContext.Provider>
  );
};

const isValidLoginSession = async (): Promise<boolean> => {
  const key = 'user.data';
  const data = await getData(key);
  if (!data?.token) return false;
  else return true;
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export {AuthContext, AuthProvider, useAuth, isValidLoginSession};
