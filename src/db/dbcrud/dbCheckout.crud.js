import { config } from "../db.config";
import { Checkout } from "../db.crud";
import dbInstance from "../db.service.crud";

const { checkoutUserDataTableName } = config;

const checkoutUserData = {
  createTable: async () => {
    return new Promise(async (resolve, reject) => {
      const query = `CREATE TABLE IF NOT EXISTS ${checkoutUserDataTableName}(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sign TEXT,
      packagesId TEXT,
      selectedStatus TEXT,
      notes TEXT,
      notification INTEGER,
      totalAmount REAL,
      cashReceived REAL,
      user_id INTEGER,
      Synced BOOLEAN,
      payment_method TEXT,
      direct_discount REAL,
      imageOne TEXT,
      imageTwo TEXT,
      imageThree TEXT,
      email TEXT
    );`;
      try {

        await dbInstance.transaction((tx) => {
          tx.executeSql(
            query,
            [],
            (_, result) => {
              resolve(result);
            },
            (_, error) => {
              console.error("Error creating checkout user data table:", error);
              reject(error);
            }
          );
        });
      } catch (error) {

        console.error("Transaction error:", error);
        reject(error);
      }
    });
  },

//   saveRecord: async (recordData) => {
//     return new Promise(async (resolve, reject) => {
//       const {
//         sign,
//         packagesId,
//         selectedStatus,
//         notes,
//         notification,
//         totalAmount,
//         cashReceived,
//         user_id,
//         Synced,
//         payment_method,
//         direct_discount,
//         imageOne,
//         imageTwo,
//         imageThree,
//         email,
//       } = recordData;
// __DEV__ && console.log('recordData', recordData)
//       const insertQuery = `
// INSERT INTO ${checkoutUserDataTableName} (
//   sign, packagesId, selectedStatus, notes, notification, totalAmount, cashReceived, user_id, Synced, payment_method, direct_discount, imageOne, imageTwo, imageThree, email
// ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
// `;

// try {
//   await dbInstance.transaction(async tx => {
//     tx.executeSql(
//       insertQuery,
//       [
//         sign,
//         packagesId,
//         selectedStatus,
//         notes,
//         notification,
//         totalAmount,
//         cashReceived,
//         user_id,
//         Synced,
//         payment_method,
//         direct_discount,
//         imageOne,
//         imageTwo,
//         imageThree,
//         email,
//       ],
//       (_, result) => {
//         __DEV__ && console.log("Record saved successfully!", { result });
//         resolve(result);
//       },
//       (_, error) => {
//         console.error('Error saving record:', error.message);
//         reject(error);
//       },
//     );
//   });
// } catch (error) {
//   console.error('Transaction error:', error);
//   reject(error);
// }
//     })
//       .then((res) => __DEV__ && console.log("objectresseresres)); :>> ", res))
//       .catch((err) => __DEV__ && console.log("errfkfjo;hfgfpiygouyfouf", err));
//   },
 saveRecord : async (recordData) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Pehle se saved records nikal lo
      const existingRecords = await Checkout.getAllRecords();
__DEV__ && console.log('existingRecords', existingRecords)
      // Pehle se saved packages ki IDs nikal lo
      const existingPackagesIds = existingRecords
        .flatMap(item => JSON.parse(item.packagesId))
        .map(id => Number(id));

      __DEV__ && console.log('Existing Package IDs:', existingPackagesIds);

      // Nayi IDs jo already present nahi hain unhe filter karo
      const newPackageIds = JSON.parse(recordData.packagesId).filter(
        id => !existingPackagesIds.includes(Number(id))
      );

      __DEV__ && console.log('New Package IDs:', newPackageIds);

      if (newPackageIds.length === 0) {
        __DEV__ && console.log('No new packages to save.');
        resolve(null); // Koi naya data save karne ki zaroorat nahi hai
        return;
      }

      // Nayi IDs ko recordData ke andar update karo
      recordData.packagesId = JSON.stringify(newPackageIds);

      const insertQuery = `
        INSERT INTO ${checkoutUserDataTableName} (
          sign, packagesId, selectedStatus, notes, notification, totalAmount, cashReceived, user_id, Synced, payment_method, direct_discount, imageOne, imageTwo, imageThree, email
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `;

      await dbInstance.transaction(async (tx) => {
        tx.executeSql(
          insertQuery,
          [
            recordData.sign,
            recordData.packagesId,
            recordData.selectedStatus,
            recordData.notes,
            recordData.notification,
            recordData.totalAmount,
            recordData.cashReceived,
            recordData.user_id,
            recordData.Synced,
            recordData.payment_method,
            recordData.direct_discount,
            recordData.imageOne,
            recordData.imageTwo,
            recordData.imageThree,
            recordData.email,
          ],
          (_, result) => {
            __DEV__ && console.log("Record saved successfully!", { result });
            resolve(result);
          },
          (_, error) => {
            console.error('Error saving record:', error.message);
            reject(error);
          }
        );
      });
    } catch (error) {
      console.error('Transaction error:', error);
      reject(error);
    }
  });
},

  getRecordById: async (recordId) => {
    return new Promise(async (resolve, reject) => {
      const selectQuery = `SELECT * FROM ${checkoutUserDataTableName} WHERE id = ?`;

      try {
        const result = await dbInstance.transaction(async (tx) => {
          const [txResult] = await tx.executeSql(selectQuery, [recordId]);
          return txResult;
        });

        const record = result[0];

        if (record) {
          const modifiedRecord = {
            id: record.id,
            sign: record.sign,
            packagesId: record.packagesId,
            selectedStatus: record.selectedStatus,
            notes: record.notes,
            notification: record.notification,
            totalAmount: record.totalAmount,
            cashReceived: record.cashReceived,
            user_id: record.user_id,
            Synced: record.Synced,
            imageOne: record.imageOne,
            imageTwo: record.imageTwo,
            imageThree: record.imageThree,
            email:record.email,
          };
__DEV__ && console.log('record89084905834584958foram', record)
          resolve(record);
        } else {
          resolve(null);
        }
      } catch (error) {
        console.error("Error retrieving record by ID:", error);
        reject(error);
      }
    });
  },

  getAllRecords: async () => {
    return new Promise(async (resolve, reject) => {
      const selectQuery = `SELECT * FROM ${checkoutUserDataTableName}`;

      try {
        await dbInstance.transaction(
          (tx) => {
            tx.executeSql(
              selectQuery,
              [],
              (_, results) => {
                // __DEV__ && console.log(results.rows);
                const rows = results.rows;
                const checkoutList = [];

                for (let i = 0; i < rows.length; i++) {
                  checkoutList.push(rows.item(i));
                }

                resolve(checkoutList);
              },
              (_, error) => {
                reject(error);
              }
            );
          },
          (transactionError) => {
            reject(transactionError);
          },
          () => {}
        );
      } catch (error) {
        reject(error);
      }
    });
  },

  deleteRecord: async (recordId) => {
    return new Promise(async (resolve, reject) => {
      const deleteQuery = `DELETE FROM ${checkoutUserDataTableName} WHERE id = ?`;

      try {
        await dbInstance.transaction(async (tx) => {
          tx.executeSql(
            deleteQuery,
            [recordId],
            (_, result) => {
              // __DEV__ && console.log("Record deleted successfully!");
              resolve(result);
            },
            (_, error) => {
              console.error("Error deleting record:", error);
              reject(error);
            }
          );
        });
      } catch (error) {
        console.error("Transaction error:", error);
        reject(error);
      }
    });
  },

  markRecordAsSynced: async (recordId) => {
    return new Promise(async (resolve, reject) => {
      const updateSyncedQuery = `
        UPDATE ${checkoutUserDataTableName} SET
        Synced = true
        WHERE id = ?;
      `;

      try {
        await dbInstance.transaction(async (tx) => {
          tx.executeSql(
            updateSyncedQuery,
            [recordId],
            (_, result) => {
              resolve(result);
            },
            (_, error) => {
              console.error("Error marking record as synced:", error.message);
              reject(error);
            }
          );
        });
      } catch (error) {
        console.error("Transaction error:", error);
        reject(error);
      }
    });
  },

  getUnsyncedRecords: async () => {
    return new Promise(async (resolve, reject) => {
      const selectQuery = `SELECT * FROM ${checkoutUserDataTableName} WHERE Synced = false`;

      try {
        await dbInstance.transaction(
          (tx) => {
            tx.executeSql(
              selectQuery,
              [],
              (_, results) => {
                const rows = results.rows;
                const checkoutList = [];

                for (let i = 0; i < rows.length; i++) {
                  const record = rows.item(i);
                  const modifiedRecord = {
                    id: record.id,
                    sign: record.sign,
                    packagesId: record.packagesId,
                    selectedStatus: record.selectedStatus,
                    notes: record.notes,
                    notification: record.notification,
                    totalAmount: record.totalAmount,
                    cashReceived: record.cashReceived,
                    user_id: record.user_id,
                    Synced: record.Synced,
                    imageOne: record.imageOne,
                    imageTwo: record.imageTwo,
                    imageThree: record.imageThree,
                    email:record.email,
                  };
                  checkoutList.push(record);
                }

                resolve(checkoutList);
              },
              (_, error) => {
                reject(error);
              }
            );
          },
          (transactionError) => {
            reject(transactionError);
          },
          () => {}
        );
      } catch (error) {
        console.error("Error retrieving unsynced records:", error);
        reject(error);
      }
    });
  },
};

export default checkoutUserData;
