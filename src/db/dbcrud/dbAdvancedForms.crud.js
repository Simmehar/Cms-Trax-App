import { config } from "../db.config";
import dbInstance from "../db.service.crud";

const { advancedFormsTableName } = config;

const advancedForms = {
  createTable: async () => {
    return new Promise(async (resolve, reject) => {
      const query = `CREATE TABLE IF NOT EXISTS ${advancedFormsTableName}(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT,
        data TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
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
              console.error("Error creating advanced forms table:", error);
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

  saveRecord: async (recordData) => {
    return new Promise(async (resolve, reject) => {
      const { category, data } = recordData;
      const insertQuery = `
        INSERT INTO ${advancedFormsTableName} (category, data) VALUES (?, ?);
      `;

      try {
        await dbInstance.transaction(async (tx) => {
          tx.executeSql(
            insertQuery,
            [category, JSON.stringify(data)],
            (_, result) => {
              __DEV__ && console.log("Advanced form record saved successfully!", { result });
              resolve(result);
            },
            (_, error) => {
              console.error('Error saving advanced form record:', error.message);
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

  getRecordsByCategory: async (category) => {
    return new Promise(async (resolve, reject) => {
      const selectQuery = `SELECT * FROM ${advancedFormsTableName} WHERE category = ? ORDER BY timestamp DESC`;

      try {
        await dbInstance.transaction(
          (tx) => {
            tx.executeSql(
              selectQuery,
              [category],
              (_, results) => {
                const rows = results.rows;
                const records = [];

                for (let i = 0; i < rows.length; i++) {
                  const record = rows.item(i);
                  records.push({
                    id: record.id,
                    category: record.category,
                    data: JSON.parse(record.data),
                    timestamp: record.timestamp,
                  });
                }

                resolve(records);
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

  getAllRecords: async () => {
    return new Promise(async (resolve, reject) => {
      const selectQuery = `SELECT * FROM ${advancedFormsTableName} ORDER BY timestamp DESC`;

      try {
        await dbInstance.transaction(
          (tx) => {
            tx.executeSql(
              selectQuery,
              [],
              (_, results) => {
                const rows = results.rows;
                const records = [];

                for (let i = 0; i < rows.length; i++) {
                  const record = rows.item(i);
                  records.push({
                    id: record.id,
                    category: record.category,
                    data: JSON.parse(record.data),
                    timestamp: record.timestamp,
                  });
                }

                resolve(records);
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

  markRecordAsSynced: async (recordId) => {
    return new Promise(async (resolve, reject) => {
      const selectQuery = `SELECT * FROM ${advancedFormsTableName} WHERE id = ?`;
      try {
        await dbInstance.transaction(async (tx) => {
          tx.executeSql(
            selectQuery,
            [recordId],
            async (_, results) => {
              const rows = results.rows;
              if (rows.length === 0) {
                reject(new Error("Record not found"));
                return;
              }
              const record = rows.item(0);
              const updatedData = { ...JSON.parse(record.data), synced: true };
              const updateQuery = `
                UPDATE ${advancedFormsTableName} SET
                data = ?
                WHERE id = ?;
              `;
              tx.executeSql(
                updateQuery,
                [JSON.stringify(updatedData), recordId],
                (_, result) => {
                  resolve(result);
                },
                (_, error) => {
                  console.error("Error marking record as synced:", error.message);
                  reject(error);
                }
              );
            },
            (_, error) => {
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

  deleteRecord: async (recordId) => {
    return new Promise(async (resolve, reject) => {
      const deleteQuery = `DELETE FROM ${advancedFormsTableName} WHERE id = ?`;

      try {
        await dbInstance.transaction(async (tx) => {
          tx.executeSql(
            deleteQuery,
            [recordId],
            (_, result) => {
              resolve(result);
            },
            (_, error) => {
              console.error("Error deleting advanced form record:", error);
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

  deleteSyncedRecords: async () => {
    return new Promise(async (resolve, reject) => {
      const deleteQuery = `DELETE FROM ${advancedFormsTableName} WHERE json_extract(data, '$.synced') = true`;

      try {
        await dbInstance.transaction(async (tx) => {
          tx.executeSql(
            deleteQuery,
            [],
            (_, result) => {
              __DEV__ && console.log("Synced advanced form records deleted successfully!");
              resolve(result);
            },
            (_, error) => {
              console.error("Error deleting synced advanced form records:", error);
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
};

export default advancedForms;