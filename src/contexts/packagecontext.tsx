import React, {createContext, useState, ReactNode, FC, useContext} from 'react';
import {
  getcarriers,
  getConditions,
  getDepartments,
  getPackage,
  getPackageStatus,
  getPackageTypes,
  getRecentCheckoutPackages,
  getRecipient,
  getShipList,
} from '../utilities/ApiCalls';
import {AuthContext, useAuth} from './authcontext';
import {useNavigationContext} from './navigationcontext';
import {department, Package, PackageType} from '../components/PackageList';

interface User {
  id: string;
  token: string;
  firstname: string;
}

export interface Ships {
  company_id: string;
  company_name: string;
  id: number;
  name: string;
  isSelect: boolean;
}

export interface RecipentObj {
  department_id: null;
  department_name: null;
  email: string;
  first_name: string;
  id: number;
  is_active: boolean;
  last_name: string;
  payable_amount: string;
  phone: null;
  ship: string;
  ship_id: string;
}

export interface DeparmentObj {
  id: number;
  name: string;
}

export interface CarrierObj {
  id: number;
  name: string;
}

export type PackageConditionType = {
  id: number;
  name: string;
};

export interface PackageStatuses {
  [code: string]: string;
}

export interface PackageStatus {
  logged_in: PackageStatuses;
  logged_out: PackageStatuses;
  results: PackageStatuses;
}

interface PackageContextType {
  addPackageModals: {modalindex: number; visible: boolean}[];
  setAddPackageModals: React.Dispatch<
    React.SetStateAction<{modalindex: number; visible: boolean}[]>
  >;
  shipList: Ships[];
  recipientList: RecipentObj[];
  packageList: Package[];
  departmentList: DeparmentObj[];
  carriers: CarrierObj[];
  packageType: PackageType[];
  packageStatus: PackageStatus | null;
  packageCondition: PackageConditionType[];
  setShipList: any;
  setPackageList: any;
  setDepartmentList: any;
  setCarrierList: any;
  setPackageCondition: any;
  setPackageType: any;
  setPackageStatus: any;
  getShips: () => void;
  getPackageData: () => void;
  getRecentCheckoutPackagesList: () => void;
  recentPackageList: any;
  setRecentPackageList: any;
  user: User;
  isDataLoaded: boolean;
}

const PackageContext = createContext<PackageContextType | undefined>(undefined);

interface PackageProviderProps {
  children: ReactNode;
}

const PackageProvider: FC<PackageProviderProps> = ({children}) => {
  const [addPackageModals, setAddPackageModals] = useState<
    {modalindex: number; visible: boolean}[]
  >([{modalindex: 1, visible: false}]);

  const {user} = useAuth();
  const {setShowLoader} = useNavigationContext();

  const [shipList, setShipList] = useState([]);
  const [packageList, setPackageList] = useState<Package[]>([]);
  const [recentPackageList, setRecentPackageList] = useState<Package[]>([]);
  const [recipientList, setRecipientList] = useState([]);
  const [carriers, setCarrierList] = useState([]);
  const [packageType, setPackageType] = useState([]);
  const [packageStatus, setPackageStatus] = useState(null);
  const [packageCondition, setPackageCondition] = useState<PackageConditionType[]>([]);
  const [departmentList, setDepartmentList] = useState([]);


  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const getShips = async () => {
    try {
      setIsDataLoaded(false);
      setShowLoader(true);

      const shipPromise = getShipList(user)
        .then(setShipList)
        .catch(error => console.error('Error fetching ships:', error));

      const recipientPromise = getRecipient(user)
        .then(setRecipientList)
        .catch(error => console.error('Error fetching recipients:', error));

      const carriersPromise = getcarriers(user)
        .then(setCarrierList)
        .catch(error => console.error('Error fetching carriers:', error));

      const packageTypePromise = getPackageTypes(user)
        .then(setPackageType)
        .catch(error => console.error('Error fetching package types:', error));

      const packageStatusPromise = getPackageStatus(user)
        .then(setPackageStatus)
        .catch(error => console.error('Error fetching package status:', error));

      const packageConditionPromise = getConditions(user)
        .then(packageCondition => {
          const newPackCondition = packageCondition.map(
            (item: string, index: number) => ({
              id: index + 1,
              name: item,
            }),
          );
          setPackageCondition(newPackCondition);
        })
        .catch(error =>
          console.error('Error fetching package conditions:', error),
        );

      const departmentsPromise = getDepartments(user)
        .then(setDepartmentList)
        .catch(error => console.error('Error fetching departments:', error));


      await Promise.allSettled([
        shipPromise,
        recipientPromise,
        carriersPromise,
        packageTypePromise,
        packageStatusPromise,
        packageConditionPromise,
        departmentsPromise,
      ]);


      setIsDataLoaded(true);
      __DEV__ && console.log('✅ All data loaded — isDataLoaded = true');

      setShowLoader(false);
    } catch (error) {

      setIsDataLoaded(true);
      console.error('Error in getShips:', error);
    }
  };

  const getPackageData = async () => {
    setShowLoader(true);
    try {
      const packages = await getPackage(user);
      setShowLoader(false);
      setPackageList(packages);
      return packages;
    } catch (error) {
      __DEV__ && console.log('=getPackageData =error==', error);
      setShowLoader(false);
    }
  };

  const getRecentCheckoutPackagesList = async (params: any) => {
    __DEV__ && console.log('params', params);
    setShowLoader(true);
    try {
      const packages = await getRecentCheckoutPackages(user, params);
      setShowLoader(false);
      setRecentPackageList(packages);
      return packages;
    } catch (error) {
      __DEV__ && console.log('=getRecentCheckoutPackagesList =error==', error);
      setShowLoader(false);
    }
  };

  const value = {
    addPackageModals,
    user,
    shipList,
    recipientList,
    carriers,
    packageType,
    packageStatus,
    packageCondition,
    getShips,
    setAddPackageModals,
    setShipList,
    setCarrierList,
    setPackageCondition,
    setPackageType,
    setPackageStatus,
    getPackageData,
    getRecentCheckoutPackagesList,
    packageList,
    setPackageList,
    recentPackageList,
    setRecentPackageList,
    departmentList,
    setDepartmentList,
    isDataLoaded,
  };

  return (
    <PackageContext.Provider value={value}>{children}</PackageContext.Provider>
  );
};

const usePackageContext = (): PackageContextType => {
  const context = useContext(PackageContext);

  if (!context) {
    throw new Error('usePackageContext must be used within a PackageProvider');
  }

  return context;
};

export {PackageContext, PackageProvider, usePackageContext};