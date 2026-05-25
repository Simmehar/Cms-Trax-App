import * as Keychain from 'react-native-keychain';
import SQLite from 'react-native-sqlite-storage';
import NetInfo from '@react-native-community/netinfo';
import {Platform} from 'react-native';
import {showMessage} from 'react-native-flash-message';

export interface StoredData {
  token?: string;
  firstname?: string;
  id?: string;
}

SQLite.enablePromise(true);


const DATABASE_NAME = 'AppStorage.db';
const TABLE_NAME = 'Storage';

let db: SQLite.SQLiteDatabase | null = null;
(async () => {
  try {
    db = await SQLite.openDatabase({ name: DATABASE_NAME, location: 'default' });
    await db.executeSql(
      `CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
        key TEXT PRIMARY KEY,
        value TEXT
      );`
    );
    __DEV__ && console.log('Database initialized');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
})();
// async function saveData(key: string, value: StoredData): Promise<void> {
//   try {
//     const existingData = await getData(key);
//     const newData = {...existingData, ...value};
//     await Keychain.setGenericPassword(key, JSON.stringify(newData));
//     __DEV__ && console.log('Saved the value', newData);
//   } catch (error) {
//     console.warn('Could not save the value', error);
//   }
// }

async function saveData(key: string, value: StoredData): Promise<void> {
  try {
    if (!db) throw new Error('Database not initialized');
    const jsonValue = JSON.stringify(value);

    // Insert or replace the value
    await db.executeSql(
      `INSERT OR REPLACE INTO ${TABLE_NAME} (key, value) VALUES (?, ?)`,
      [key, jsonValue]
    );
    __DEV__ && console.log('Saved the value', value);
  } catch (error) {
    console.warn('Could not save the value', error);
  }
}
// async function getData(key: string): Promise<StoredData | null> {
//   try {
//     const credentials = await Keychain.getGenericPassword();
//     // __DEV__ && console.log('credentials', credentials, key);
//     if (credentials && credentials.username === key) {
//       return JSON.parse(credentials.password);
//     } else {
//       console.warn('No value found for the key');
//       return null;
//     }
//   } catch (error) {
//     __DEV__ && console.log('Could not retrieve the value', error);
//     return null;
//   }
// }

async function getData(key: string): Promise<StoredData | null> {
  try {
    if (!db) throw new Error('Database not initialized');

    const results = await db.executeSql(
      `SELECT value FROM ${TABLE_NAME} WHERE key = ?`,
      [key]
    );
    if (results[0].rows.length > 0) {
      const jsonValue = results[0].rows.item(0).value;
      return JSON.parse(jsonValue);
    } else {
      console.warn('No value found for the key');
      return null;
    }
  } catch (error) {
    // __DEV__ && console.log('Could not retrieve the value', error);
    return null;
  }
}

// async function deleteData(key: string): Promise<void> {
//   try {
//     const credentials = await Keychain.getGenericPassword();
//     if (credentials && credentials.username === key) {
//       __DEV__ && console.log('keyyy===', key);

//       await Keychain.resetGenericPassword();
//     } else {
//       console.warn('No value found for the key');
//     }
//   } catch (error) {
//     console.warn('Could not delete the key', error);
//   }
// }

async function deleteData(key: string): Promise<void> {
  try {
    if (!db) throw new Error('Database not initialized');

    await db.executeSql(`DELETE FROM ${TABLE_NAME} WHERE key = ?`, [key]);
    __DEV__ && console.log(`Deleted the value for key: ${key}`);
  } catch (error) {
    console.warn('Could not delete the key', error);
  }
}

async function checkInternet(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    __DEV__ && console.log('=state.isConnected', state.isConnected);

    return state.isConnected ?? false; // Use nullish coalescing to handle undefined values
  } catch (error) {
    console.warn('Could not check internet connection', error);
    return false; // Return false in case of an error
  }
}

function CheckIpad() {
  let isPad = Platform.isPad;

  return isPad;
}

let isIPad = CheckIpad();

function showToast(msg: string, status: string, time: number) {
  if (msg) {
    showMessage({
      position: 'top',
      message: 'CMS',
      // icon: "success",
      icon: status ? status : 'danger',
      description: msg,
      duration: time ? time : 3000,
      type: status ? status : 'danger',
      style: {paddingTop: Platform.OS == 'android' ? 25 : 5 },
      textStyle: {paddingRight: 15, fontSize:isIPad ? 25 :18 },
    });
  }
}
export {
  saveData,
  getData,
  deleteData,
  checkInternet,
  CheckIpad,
  isIPad,
  showToast,
};

