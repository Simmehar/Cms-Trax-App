import axios from 'axios';
// import { REACT_APP_BASE_URL } from "@env";
import {Package} from '../components/PackageList';
import {StoredData} from './securestorage';
import {Alert} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Backend_URL } from '../util/apiCalls';
__DEV__ && console.log('Backend_URL=sdfdsfsdfsd====================', Backend_URL)

interface User {
  id: string;
  token: string;
  firstname: string;
}
interface SendObjType {
  user: string;
  package_type: string;
  ship: string;
  carrier: string;
  shelf: string;
  tracking_no: string;
  condition: string;
  custom_message: string;
  images: string[];
}

interface imgObj {
  name: string;
  type: string;
  uri: any;
}
export const getLoggedToday = async (user) => {
  try {
    const res = await axios.get(Backend_URL + "/logged-today-details", {
      headers: { Authorization: "Bearer " + user?.token },
    });
    __DEV__ && console.log("loggeddd todayyyy responseeeeeeee------", res.data);
    return res.data;
  } catch (error) {
    console.error("getLoggedToday error:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Get total received details with user statistics
 * @param {Object} user - User object with token
 * @returns {Promise} Object with total_packages and users array
 */
export const getTotalReceived = async (user) => {
  try {
    const res = await axios.get(Backend_URL + "/total-received-details", {
      headers: { Authorization: "Bearer " + user?.token },
    });
    __DEV__ && console.log("total received responseeeeeeee------", res.data);
    return res.data;
  } catch (error) {
    console.error("getTotalReceived error:", error.response?.data || error.message);
    throw error;
  }
};
export const getShipList = async (user: StoredData) => {
  __DEV__ && console.log('Userrrrr==', user);
  __DEV__ && console.log('==Backend_URL', Backend_URL);

  const res = await axios.get(Backend_URL + '/ships', {
    headers: {Authorization: 'Bearer ' + user?.token},
  });
 __DEV__ && console.log('res.data.results', res.data.results)
  const data = res.data.results;
  await AsyncStorage.setItem('shipList', JSON.stringify(data));
  return data;
};

export const getRecipient = async (user: StoredData) => {
  const res = await axios.get(Backend_URL + '/customers', {
    headers: {Authorization: 'Bearer ' + user?.token},
  });

  return res.data.results;
};

export const getcarriers = async (user: StoredData) => {
  const res = await axios.get(Backend_URL + '/carriers', {
    headers: {Authorization: 'Bearer ' + user?.token},
  });

  return res.data.results;
};

export const getConditions = async (user: StoredData) => {
  const res = await axios.get(Backend_URL + '/package_conditions', {
    headers: {Authorization: 'Bearer ' + user?.token},
  });

  return res.data.results;
};
export const getPackageTypes = async (user: StoredData) => {
  const res = await axios.get(Backend_URL + '/package_types', {
    headers: {Authorization: 'Bearer ' + user?.token},
  });
  console.log('typeeeeeeeeeeee', res.data.results)
  return res.data.results;
};

export const getPackageStatus = async (user: StoredData) => {
  const res = await axios.get(Backend_URL + '/package_status', {
    headers: {Authorization: 'Bearer ' + user?.token},
  });
__DEV__ && console.log('res.data', res.data)
  return res.data;
};
export const getDepartments = async (user: StoredData) => {
  const res = await axios.get(Backend_URL + '/departments', {
    headers: {Authorization: 'Bearer ' + user?.token},
  });

  return res.data.results;
};

export const postPackage = async (
  user: StoredData,
  packageData: SendObjType,
) => {
  __DEV__ && console.log('==SendObjType==', packageData);
  __DEV__ && console.log(' user?.token',  user?.token)

  try {
    const res = await axios.post(Backend_URL + '/create-package', packageData, {
      headers: {Authorization: 'Bearer ' + user?.token},
    });
    __DEV__ && console.log('respon of final data=====', res?.data);

    return res.data;
  } catch (error) {
    __DEV__ && console.log('create package error==', error);
    return `${error} "400"`;
  }
};

export const sendEmail = async (user, data) => {
  __DEV__ && console.log('user?.token', user?.token)
  __DEV__ && console.log('data', data)
  try {
    const res = await axios.post(Backend_URL + '/send_email', data, {
      headers: {Authorization: 'Bearer ' + user?.token},
    });

    __DEV__ && console.log('sendEmail res================================', res);

    return res;
  } catch (err) {
    __DEV__ && console.log('sendEmail err---------', err);
    return `${err} "400"`;
  }
};

export const getPackage = async (user: StoredData) => {
  // __DEV__ && console.log('= user?.token==,', user?.token);

  const res = await axios.get(Backend_URL + `/packages?&keyword=`, {
    headers: {Authorization: 'Bearer ' + user?.token},
  });
  // __DEV__ && console.log('==resres==', res);

  return res.data?.results;
};

export const getPackagesCount = async (user: StoredData) => {
  // __DEV__ && console.log('==SendObjType==', packageData);

  try {
    const res = await axios.get(Backend_URL + '/dashboard', {
      headers: {Authorization: 'Bearer ' + user?.token},
    });
    __DEV__ && console.log('respon of getPackagesCount=====', res?.data);

    return res?.data;
  } catch (error) {
    __DEV__ && console.log('getPackagesCount error==', error);
    return null;
  }
};

export const getRecentCheckoutPackages = async (user: StoredData,params:any) => {
  __DEV__ && console.log('= user?.token==,', user?.token);
__DEV__ && console.log('Backend_URL ', Backend_URL + `/recent_checkout_packages?`+ params)
  const res = await axios.get(Backend_URL + `/recent_checkout_packages?`+ params, {
    headers: {Authorization: 'Bearer ' + user?.token},
  });
  __DEV__ && console.log('==resres==', res.data?.results);

  return res.data?.results;
};

export const uploadImg = async (user: User, file: imgObj) => {
  try {
    const res = await axios.post(Backend_URL + '/upload-package-image', file, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: 'Bearer ' + user?.token,
      },
    });
    __DEV__ && console.log('Api res=', res?.data);

    return res.data;
  } catch (error) {
    __DEV__ && console.log('error', error);
    //Error Handling
    return '503';
  }
};

export const deleteImg = async (user: User, fileName) => {
  try {
    const res = await axios.delete(
      Backend_URL + `/delete-package-image?image_name=${fileName}`,
      {
        headers: {
          Authorization: 'Bearer ' + user?.token,
        },
      },
    );
    return res.data;
  } catch (error) {
    //Error Handling
  }
};

export const recipientSearchApi = async (user, keyword) => {
  __DEV__ && console.log('`${Backend_URL}/customers?keyword=${keyword}`', `${Backend_URL}/customers?keyword=${keyword}`)
  try {
    const res = await axios.get(`${Backend_URL}/customers?keyword=${keyword}`, {
      headers: {
        Authorization: 'Bearer ' + user?.token,
      },
    });
    return res.data.results;
  } catch (error) {
    //Error Handling
  }
};

// export const updatePackage = async (user, data) => {
//   try {
//     const res = await axios.post(Backend_URL + "/update-package", data, {
//       headers: { Authorization: "Bearer " + user?.token },
//     });

//     return res.data;
//   } catch (e) {
//     return "400";
//   }
// };

// export const filterSortPackages = async (user, params) => {
//   try {
//     const res = await axios.get(Backend_URL + "/packages" + params, {
//       headers: {
//         Authorization: "Bearer " + user?.token,
//       },
//     });
//     return res.data;
//   } catch (e) {
//     return "400";
//   }
// };

// export const getPackagesForDbSetup = async (user, shipId, limit = 10000) => {
//   try {
//     const params = `${shipId}&limit=${limit}`;
//     __DEV__ && console.log(`${Backend_URL}/packages${params}`);
//     const res = await axios.get(`${Backend_URL}/packages${params}`, {
//       headers: {
//         Authorization: `Bearer ${user?.token}`,
//       },
//     });
//     return res.data;
//   } catch (e) {
//     return "400";
//   }
// };

export const bulkPackageLogout = async (user, data) => {
  __DEV__ && console.log('data', data)
  try {
    const res = await axios.post(Backend_URL + '/bulk-package-logout', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: 'Bearer ' + user?.token,
      },
    });
__DEV__ && console.log('res.data :>> ', res.data);
    return res.data;
  } catch (e) {
    __DEV__ && console.log('e :>> ', e);
    __DEV__ && console.log('e :>> ', e?.response?.data);

    return '400';
  }
};

export const getCustomerList = async (user: any, customerId: any) => {
  try {
    const res = await axios.get(Backend_URL + '/customer/' + customerId + '/', {
      headers: {Authorization: 'Bearer ' + user?.token},
    });
    __DEV__ && console.log(' res.datasdasasa:>> ',res.data );
    return res.data;
  } catch (e) {
    return '400';
  }
};

export const cashReceivedDetails = async (user, data) => {
  __DEV__ && console.log('user', user)
  __DEV__ && console.log('data :>> ', data);
  try {
    const res = await axios.post(Backend_URL + '/payment-details-cash', data, {
      headers: {Authorization: 'Bearer ' + user?.token},
    });

    return res.data;
  } catch (e) {
    __DEV__ && console.log('e :>> ', e);
    __DEV__ && console.log('e?.response?.data of cash receive :>> ', e?.response?.data);
    return '400';
  }
};
export const customerListApiUpdate = async (user, id, data) => {
  try {
    const res = await axios.put(Backend_URL + '/customer/' + id + '/', data, {
      headers: {Authorization: 'Bearer ' + user?.token},
    });
    return res.data;
  } catch (e) {
    __DEV__ && console.log('e', e);
    return '400';
  }
};

export const cameraAlert = (alertMessage, Camera, Gallery, Cancel, cb) => {
  Alert.alert(
    'Crew Mail Services',
    alertMessage,
    [
      {
        text: Camera,
        onPress: () => {
          cb(Camera);
        },
      },
      {
        text: Gallery,
        onPress: () => {
          cb(Gallery);
        },
      },
      {
        text: Cancel,
        onPress: () => {
          cb(Cancel);
        },
        style: 'cancel',
      },
    ],
    {cancelable: false},
  );
};

export const permissionConfirm = (alertMessage, cb) => {
  Alert.alert(
    'Crew Mail Services',
    alertMessage,
    [
      {
        text: 'NOT NOW',
        onPress: () => {
          if (cb) cb(false);
        },
      },
      {
        text: 'SETTINGS',

        onPress: () => {
          if (cb) cb(true);
        },
        style: 'cancel',
      },
    ],
    {cancelable: false},
  );
};
