import React, {createContext, useState, ReactNode, FC, useContext} from 'react';
import {
  saveData,
  getData,
  deleteData,
  StoredData,
} from '../utilities/securestorage';
import {api} from '../services/api.service';

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
    await deleteData(key);
    setUser({token: '', firstname: '', id: '',currentplan:''});
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
