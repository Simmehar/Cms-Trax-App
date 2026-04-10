import {config} from '../db.config';
import dbInstance from '../db.service.crud';

const {
  packageTableName: tableName,
  shipTableName,
  userTableName,
  packageTypeTableName,
} = config;

const Package = {
  createTable: async () => {
    return new Promise(async (resolve, reject) => {
      const query = `CREATE TABLE IF NOT EXISTS ${tableName}(
          id INTEGER,
          tracking_no TEXT,
          carrier TEXT,
          tag_number INTEGER,
          shelf TEXT,
          condition TEXT,
          current_status TEXT,
          date_received DATETIME,
          date_delivered DATETIME,
          is_paid BOOLEAN DEFAULT 0,
          port INTEGER,
          ship_id INTEGER,
          user_id INTEGER, 
          product_id INTEGER,
          packageType TEXT,
          custom_message TEXT,
          logInBy TEXT,
          logInDate DATETIME,
          FOREIGN KEY (ship_id) REFERENCES ${shipTableName}(id),
          FOREIGN KEY (user_id) REFERENCES ${userTableName}(id)
      );`;

      await dbInstance.transaction(tx => {
        tx.executeSql(
          query,
          [],
          (_, results) => {
            // Log the success message
            resolve(results.rows.item(0));
          },
          (_, error) => {
            console.error('Error creating table:', error);
            reject(error);
          },
        );
      });
    });
  },

  savePackage: async packageData => {
    const {
      id,
      tracking_no,
      carrier,
      tag_number,
      shelf,
      condition,
      current_status,
      date_received,
      date_delivered,
      is_paid,
      port,
      ship,
      user,
      packageType,
      logInBy,
      logInDate,
      custom_message,
    } = packageData;

    // __DEV__ && console.log('Save Package Data ', packageData, typeof packageType);

    const insertQuery = `
    INSERT INTO ${tableName} (
    id, tracking_no, carrier, tag_number, shelf, condition, current_status, date_received, date_delivered, is_paid, port, ship_id, user_id,packageType, logInBy, logInDate,custom_message
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?,?);`;

    return new Promise(async (resolve, reject) => {
      try {
        await dbInstance.transaction(tx => {
          tx.executeSql(
            insertQuery,
            [
              id,
              tracking_no,
              carrier,
              tag_number,
              shelf,
              condition,
              current_status,
              date_received,
              date_delivered,
              is_paid,
              port,
              ship,
              user,
              packageType,
              logInBy,
              logInDate,
              custom_message,
            ],
            (_, results) => {
              __DEV__ && console.log('results', results);
              resolve(results.rowsAffected);
            },
            (_, error) => {
              __DEV__ && console.log('Error saving package:', error.message);
              reject(error);
            },
          );
        });
      } catch (error) {
        __DEV__ && console.log('Error saving package:', error.message);
        reject(error);
      }
    });
  },

  getPackageById: packageId => {
    return new Promise(async (resolve, reject) => {
      const selectQuery = `SELECT * FROM ${tableName} WHERE id = ?`;

      try {
        await dbInstance.transaction(tx => {
          tx.executeSql(
            selectQuery,
            [packageId],
            (_, results) => {
              resolve(results.rows.item(0));
              // resolve(results.rows._array);
            },
            (_, error) => {
              console.error('Error fetching package:', error.message);
              reject(error);
            },
          );
        });
      } catch (error) {
        console.error('Error fetching package:', error.message);
        reject(error);
      }
    });
  },

  getAllPackages: () => {
    return new Promise(async (resolve, reject) => {
      const selectQuery = `SELECT * FROM ${tableName}`;

      try {
        await dbInstance.transaction(tx => {
          tx.executeSql(
            selectQuery,
            [],
            (_, results) => {
              // __DEV__ && console.log('getAllPackages results', results.rows.item(1));
              // const rows = results.rows._array;
              // resolve(rows);
              var len = results.rows.length;
              let usersArray = [];
              if (len > 0) {
                for (let i = 0; i < len; i++) {
                  let row = results.rows.item(i);
                  usersArray.push(row);
                }
                // __DEV__ && console.log('Data retrieved successfully');
              }

              resolve(usersArray);
            },
            (_, error) => {
              console.error('Error fetching all packages:', error.message);
              reject(error);
            },
          );
        });
      } catch (error) {
        console.error('Error fetching all packages:', error.message);
        reject(error);
      }
    });
  },
  updatePackage: (packageId, updatedPackage) => {
    return new Promise(async (resolve, reject) => {
      const updateQuery = `
      UPDATE ${tableName} SET
        tracking_no = ?,
        carrier = ?,
        tag_number = ?,
        shelf = ?,
        condition = ?,
        current_status = ?,
        date_received = ?,
        date_delivered = ?,
        is_paid = ?,
        port = ?,
        ship_id = ?,
        user_id = ?,
        packagetype = ?
      WHERE id = ?;
    `;

      const {
        tracking_no,
        carrier,
        tag_number,
        shelf,
        condition,
        current_status,
        date_received,
        date_delivered,
        is_paid,
        port,
        ship,
        user,
        packagetype,
      } = updatedPackage;

      // __DEV__ && console.log("Update Package Data ", updatedPackage);

      try {
        await dbInstance.transaction(tx => {
          tx.executeSql(
            updateQuery,
            [
              tracking_no,
              carrier,
              tag_number,
              shelf,
              condition,
              current_status,
              date_received,
              date_delivered,
              is_paid,
              port,
              ship,
              user,
              packagetype,
              packageId,
            ],
            (_, results) => {
              __DEV__ && console.log('Package updated successfully!', results);
              resolve(results.rowsAffected);
            },
            (_, error) => {
              console.error('Error updating package:', error.message);
              reject(error);
            },
          );
        });
      } catch (error) {
        console.error('Error updating package:', error.message);
        reject(error);
      }
    });
  },

  getPackagesByShipId: shipId => {
    return new Promise(async (resolve, reject) => {
      const selectByShipIdQuery = `SELECT * FROM ${tableName} WHERE ship_id = ?`;

      try {
        await dbInstance.transaction(tx => {
          tx.executeSql(
            selectByShipIdQuery,
            [shipId],
            (_, results) => {
              var len = results.rows.length;
              let resultArray = [];
              if (len > 0) {
                for (let i = 0; i < len; i++) {
                  let row = results.rows.item(i);
                  resultArray.push(row);
                }
                // __DEV__ && console.log('Data retrieved successfully');
              }

              resolve(resultArray);
            },
            (_, error) => {
              console.error(
                'Error fetching packages by shipId:',
                error.message,
              );
              reject(error);
            },
          );
        });
      } catch (error) {
        console.error('Error fetching packages by shipId:', error.message);
        reject(error);
      }
    });
  },
  deletePackage: packageId => {
    return new Promise(async (resolve, reject) => {
      const deleteQuery = `DELETE FROM ${tableName} WHERE id = ?`;

      try {
        await dbInstance.transaction(tx => {
          tx.executeSql(
            deleteQuery,
            [packageId],
            (_, results) => {
              __DEV__ && console.log('Package deleted successfully!');
              resolve(results.rowsAffected);
            },
            (_, error) => {
              console.error('Error deleting package:', error.message);
              reject(error);
            },
          );
        });
      } catch (error) {
        console.error('Error deleting package:', error.message);
        reject(error);
      }
    });
  },
  deletePackages: packageIds => {
    return new Promise(async (resolve, reject) => {
      const deleteQuery = `DELETE FROM ${tableName} WHERE id IN (${packageIds
        .map(() => '?')
        .join(',')})`;

      try {
        await dbInstance.transaction(tx => {
          tx.executeSql(
            deleteQuery,
            packageIds,
            (_, results) => {
              resolve(results.rowsAffected);
            },
            (_, error) => {
              console.error('Error deleting packages:', error.message);
              reject(error);
            },
          );
        });
      } catch (error) {
        console.error('Error deleting packages:', error.message);
        reject(error);
      }
    });
  },
  deleteByShipId: shipId => {
    __DEV__ && console.log({shipId, type: typeof shipId});

    return new Promise(async (resolve, reject) => {
      __DEV__ && console.log(shipId);
      const deleteQuery = `DELETE FROM ${tableName} WHERE ship_id = ?`;
      try {
        await dbInstance.transaction(tx => {
          tx.executeSql(
            deleteQuery,
            [shipId],
            (_, results) => {
              __DEV__ && console.log('Packages deleted successfully!', results);
              resolve(results.rowsAffected);
            },
            (_, error) => {
              console.error('Error deleting package:', error.message);
              reject(error);
            },
          );
        });
      } catch (error) {
        console.error('Error deleting package:', error.message);
        reject(error);
      }
    });
  },
};

export default Package;
