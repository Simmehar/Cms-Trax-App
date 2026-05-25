import { config } from '../db.config';
import dbInstance from '../db.service.crud';

const { deletedPackageTableName: tableName } = config;

const deletedPackage = {
  createTable: async () => {
    const query = `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id INTEGER PRIMARY KEY,
        tracking_no TEXT,
        carrier TEXT,
        tag_number INTEGER,
        shelf TEXT,
        condition TEXT,
        current_status TEXT,
        is_paid BOOLEAN DEFAULT 0,
        port INTEGER,
        ship_id INTEGER,
        user_id INTEGER, 
        packageType TEXT,
        custom_message TEXT,
        logInBy TEXT,
        Logout TEXT,
        local_url TEXT
      );
    `;

    // __DEV__ && console.log('query:', query);

    await dbInstance.transaction(tx => {
      tx.executeSql(
        query,
        [],
        (_, results) => {
          __DEV__ && console.log(`${tableName} table created successfully!`);
        },
        (_, error) => {
          console.error(`Error creating ${tableName} table:`, error);
        }
      );
    });
  },

  saveDeletedPackage: async packageData => {
    __DEV__ && console.log('deletedPackage:', packageData);
  
    const {
      id, tracking_no, carrier, tag_number, shelf, condition,
      current_status, is_paid,
      port, ship_id, user_id, packageType, custom_message, 
      logInBy, Logout, local_url = new Date().toISOString()
    } = packageData;
  
    const query = `
      INSERT INTO ${tableName} (
        id, tracking_no, carrier, tag_number, shelf, condition,
        current_status, is_paid,
        port, ship_id, user_id, packageType, custom_message, 
        logInBy, Logout, local_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
  
    __DEV__ && console.log('Executing SQL:', query);
    __DEV__ && console.log('Values to insert:', [
      id, tracking_no, carrier, tag_number, shelf, condition,
      current_status, is_paid,
      port, ship_id, user_id, packageType, custom_message,
      logInBy, Logout, local_url
    ]);
  
    return new Promise((resolve, reject) => {
      dbInstance.transaction(tx => {
        tx.executeSql(
          query,
          [
            id, tracking_no, carrier, tag_number, shelf, condition,
            current_status, is_paid,
            port, ship_id, user_id, packageType, custom_message, 
            logInBy, Logout, local_url
          ],
          (_, results) => {
            // __DEV__ && console.log('Deleted package saved successfully');
            resolve(results.rowsAffected);
          },
          (_, error) => {
            console.error('Error saving deleted package:', error);
            reject(error);
          }
        );
      });
    });
  },
  

  getDeletedPackageById: async packageId => {
    const selectQuery = `SELECT * FROM ${tableName} WHERE id = ?`;

    return new Promise((resolve, reject) => {
      dbInstance.transaction(tx => {
        tx.executeSql(
          selectQuery,
          [packageId],
          (_, results) => {
            resolve(results.rows.item(0));
          },
          (_, error) => {
            console.error('Error fetching deleted package by ID:', error.message);
            reject(error);
          }
        );
      });
    });
  }
};

export default deletedPackage;
