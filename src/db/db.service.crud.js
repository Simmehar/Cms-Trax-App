import {openDatabase} from 'react-native-sqlite-storage';
import {config} from './db.config';

let instance;

class Database {
  constructor() {
    if (!instance) {
      instance = openDatabase('crew-mail.db');
    }
  }

  getInstance() {
    return instance;
  }
  // ssh -i "crewmail-dev.pem" ubuntu@ec2-3-134-35-22.us-east-2.compute.amazonaws.com
  async deleteAllTables() {
    try {
      const tables = Object.values(config).filter(
        tableName => typeof tableName === 'string',
      );
      await Promise.all(
        tables.map(async table => {
          await dropTable(instance, table); // Pass 'instance' as a parameter
        }),
      );
      __DEV__ && console.log('All tables deleted successfully.');
    } catch (error) {
      console.error('Error deleting tables:', error);
    }
  }
}

export const database = new Database();
const dbInstance = database.getInstance();

export default dbInstance;

const dropTable = async (db, tableName) => {
  // Receive 'db' as a parameter
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      // Use 'db' instead of 'this.db'
      tx.executeSql(
        `DROP TABLE IF EXISTS ${tableName};`,
        [],
        () => {
          __DEV__ && console.log(`Table ${tableName} dropped successfully.`);
          resolve();
        },
        (_, error) => {
          console.error(`Error dropping table ${tableName}:`, error);
          reject(error);
        },
      );
    });
  });
};
