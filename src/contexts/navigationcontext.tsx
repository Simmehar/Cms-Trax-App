import React, {createContext, useState, ReactNode, FC, useContext} from 'react';

interface NavigationContextType {
  searchActive: boolean;
  setSearchActive: (isActive: boolean) => void;
  isInternet: boolean;
  setIsInternet: (isNet: boolean) => void;
  showLoader: boolean;
  setShowLoader: (isShow: boolean) => void;
  refNavigation: any;
  setRefNavigation: (fun: any) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(
  undefined,
);

interface NavigationProviderProps {
  children: ReactNode;
}

const NavigationProvider: FC<NavigationProviderProps> = ({children}) => {
  const [searchActive, setSearchActive] = useState<boolean>(false);
  const [isInternet, setIsInternet] = useState<boolean>(false);
  const [showLoader, setShowLoader] = useState<boolean>(false);
  const [refNavigation, setRefNavigation] = useState<any>('');

  return (
    <NavigationContext.Provider
      value={{
        searchActive,
        isInternet,
        showLoader,
        refNavigation,
        setSearchActive,
        setIsInternet,
        setRefNavigation,
        setShowLoader,
      }}>
      {children}
    </NavigationContext.Provider>
  );
};

const useNavigationContext = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error(
      'useNavigationContext must be used within a NavigationProvider',
    );
  }
  return context;
};

export {NavigationContext, NavigationProvider, useNavigationContext};
