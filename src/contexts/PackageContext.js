import {
  createContext,
  React,
  useContext,
  useEffect,
  useReducer,
  useState,
} from 'react';
import {
  getcarriers,
  getConditions,
  getDepartments,
  getPackageTypes,
  getRecipient,
  getShipList,
  postPackage,
  sendEmail,
} from '../util/apiCalls';
import {AuthContext} from './authcontext';

export const PackageContext = createContext({
  package: [],
  shipList: [],
  recipientList: [],
  carriers: [],
  packageType: [],
  packageCondition: [],
  setPackageValues1: () => {},
  setPackageValues2: () => {},
  validValues: () => {},
  addPackage: () => {},
  getShips: () => {},
  submitPackage: () => {},
  deletePackage: () => {},
  resetPackage: () => {},
  checkValid: () => {},
  setupShips: () => {},
  // setScanned: () => {}
});

const initialPackage = [
  {
    uid: 1,
    // package_type: selectedPackageType,
    // condition: selectedPackageCondition,
    // carrier: selectedCarriers,
    // custom_message: msg,
    // images: selectedImgs
  },
];

const packageReducers = (state, action) => {
  switch (action.type) {
    case 'ADD':
      return [action.payload, ...state];
    case 'UPDATE':
      const updateableExpenseIndex = state.findIndex(
        expense => expense.uid == action.payload.uid,
      );
      const updateableExpense = state[updateableExpenseIndex];
      const updatedItem = {...updateableExpense, ...action.payload.data};
      const updatedExpense = [...state];
      updatedExpense[updateableExpenseIndex] = updatedItem[0];
      return updatedExpense;

    case 'DELETE':
      const deleted = state.filter(val => val.uid !== action.payload);
      return deleted;
    case 'RESET':
      // const resetValues = state.filter((val) => val.uid == action.payload);
      const resetValues = [{uid: 1}];
      return resetValues;
    // return state
    default:
      state;
  }
};

export default function PackageProvider({children}) {
  const [packageState, dispatch] = useReducer(packageReducers, initialPackage);
  const [shipList, setShipList] = useState();
  const [recipientList, setRecipientList] = useState();
  const [carriers, setCarrierList] = useState();
  const [packageType, setPackageType] = useState();
  const [packageCondition, setPackageCondition] = useState();
  const {user, logout} = useContext(AuthContext);
  const [packageValues1, setPackageValues1] = useState();
  const [packageValues2, setPackageValues2] = useState();
  // const [listPackageValues2, setListPackageValues2]= useState([{tracking_no: "1011"}])
  const [isFetching, setIsFetching] = useState();
  const [clearInputs, setClearInput] = useState(false);
  const [uid, setUid] = useState(2);
  const [addInvalid, setAddInvalid] = useState(false);
  const [validValues, setValidValues] = useState();
  const [saveCall, setSaveCall] = useState(false);
  const [isClear, setIsClear] = useState(false);
  const [departmentList, setDepartmentList] = useState();
  const [scanIsNotify, setScanIsNotify] = useState(true);
  // const [response, setResponse] = useState([])

  useEffect(() => {
    // let id = packageValues2[0].uid;
    if (packageValues2) {
      let id = packageValues2[0]?.uid;
      dispatch({type: 'UPDATE', payload: {uid: id, data: packageValues2}});
    }
  }, [packageValues2]);

  const setupShips = async () => {
    setIsFetching(true);
    const ships = await getShipList(user);
    setShipList(ships);
    setIsFetching(false);
  };

  const getShips = async () => {
    try {
      setIsFetching(true);
      1;
      const ships = await getShipList(user);
      const recipient = await getRecipient(user);
      const carriers = await getcarriers(user);
      const packageType = await getPackageTypes(user);
      const packageCondition = await getConditions(user);
      const departments = await getDepartments(user);
      setShipList(ships);
      setRecipientList(recipient);
      setCarrierList(carriers);
      setPackageCondition(packageCondition);
      setPackageType(packageType);
      setDepartmentList(departments);
      setIsFetching(false);
    } catch (error) {
      //Error Handling
      console.error('error', error);
    }
  };

  const checkValid = async () => {
    const validValues = packageState
      ?.slice(0)
      .reverse()
      .filter((val, index) => {
        if (index == packageState?.length - 1) {
          return val;
        }
      });

    if (
      !validValues[0]?.tracking_no ||
      !validValues[0]?.images.length ||
      !validValues[0]?.isSave
    ) {
      // if (!validValues?.tracking_no || !validValues?.images.length) {
      setAddInvalid(true);
      return false;
    }

    return true;
  };

  const addPackage = async () => {
    // const validValues = packageValues2?.slice(-1)[0]

    const isValid = await checkValid();

    if (isValid == false) {
      return;
    }

    let newId = uid;
    newId++;
    setUid(newId);
    const newPackage = {
      uid: uid,
    };
    dispatch({type: 'ADD', payload: newPackage});
    return newPackage;
  };

  const deletePackage = id => {
    dispatch({type: 'DELETE', payload: id});
  };

  const resetPackage = () => {
    setUid(2);
    dispatch({type: 'RESET', payload: 1});
  };

  const submitPackage = async () => {
    try {
      // const packageValuesArray = [...packageValues1, ...packageValues2];

      const res = await Promise.all(
        packageState.map(async val => {
          let obj = {...val};
          const packageValuesArray = [...packageValues1, obj];
          const packageValues = packageValuesArray.reduce(function (
            result,
            current,
          ) {
            return Object.assign(result, current);
          },
          {});
          const respond = await postPackage(user, packageValues);
          // setResponse((curr) => [...curr, respond])

       
          // send Email Api
          const mailData = {
            ids: [respond?.id],
            package_status: packageValues?.selected_status,
          };
__DEV__ && console.log('mailData', mailData,scanIsNotify)
          if (
            scanIsNotify 
          ) {
            const emailRes = await sendEmail(user, mailData);
            __DEV__ && console.log('emailRes', emailRes)
          }
          return respond;
        }),
      );
      return res;
    } catch (error) {
      return '400';
    }
  };

  const value = {
    package: packageState,
    shipList,
    recipientList,
    carriers,
    packageCondition,
    packageType,
    setPackageValues1,
    packageValues2,
    setPackageValues2,
    addPackage,
    getShips,
    submitPackage,
    isFetching,
    setIsFetching,
    setClearInput,
    clearInputs,
    deletePackage,
    resetPackage,
    addInvalid,
    setAddInvalid,
    validValues,
    setValidValues,
    saveCall,
    setSaveCall,
    checkValid,
    isClear,
    setIsClear,
    departmentList,
    setScanIsNotify,
    setupShips,
    // response,
    // setScanned,
    // scannedBarcode
  };

  return (
    <PackageContext.Provider value={value}>{children}</PackageContext.Provider>
  );
}

export const usePackage = () => {
  const packageContext = useContext(PackageContext);

  if (!packageContext) {
    throw new Error('usePackage must be used within a PackageProvider');
  }

  return packageContext;
};
