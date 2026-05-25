import { config } from "../db.config";
import dbInstance from "../db.service.crud";

const { packageTypeTableName: tableName, packageTableName } = config;

const PackageType = {
  createTable: async () => {
    return new Promise(async (resolve, reject) => {
      const query = `CREATE TABLE IF NOT EXISTS ${tableName}(
        id INTEGER PRIMARY KEY,
        name TEXT,
        price REAL DEFAULT 0,
        package_id INTEGER,
        FOREIGN KEY (package_id) REFERENCES ${packageTableName}(id)
      );`;
      await dbInstance.transaction(
        (tx) => {
          tx.executeSql(
            query,
            [],
            (_, results) => {
              resolve(results.rowsAffected);
            },
            (_, error) => {
              console.error("Error creating table:", error);
              reject(error);
            }
          );
        },
        (transactionError) => {
          console.error("Transaction error:", transactionError);
          reject(transactionError);
        },
        () => {}
      );
    });
  },
  savePackageType: async (typeData) => {
    return new Promise(async (resolve, reject) => {
      const insertQuery = `
        INSERT INTO ${tableName} (
          name, price
        ) VALUES (?, ?);
      `;

      const { name, price } = typeData;

      try {
        await dbInstance.transaction(
          (tx) => {
            tx.executeSql(
              insertQuery,
              [name, price],
              (_, results) => {
                __DEV__ && console.log("Package type saved successfully!");
                resolve(results.insertId);
              },
              (_, error) => {
                console.error("Error saving package type:", error);
                reject(error);
              }
            );
          },
          (transactionError) => {
            console.error("Transaction error:", transactionError);
            reject(transactionError);
          },
          () => {}
        );
      } catch (error) {
        console.error("Error saving package type:", error.message);
        reject(error);
      }
    });
  },
  updatePackageType: async (typeId, updatedType) => {
    return new Promise(async (resolve, reject) => {
      const updateQuery = `
        UPDATE ${tableName} SET
        name = ?,
        price = ?
        WHERE id = ?;
      `;

      const { name, price } = updatedType;

      try {
        await dbInstance.transaction(
          (tx) => {
            tx.executeSql(
              updateQuery,
              [name, price, typeId],
              (_, results) => {
                resolve(results.rowsAffected);
              },
              (_, error) => {
                console.error("Error updating package type:", error);
                reject(error);
              }
            );
          },
          (transactionError) => {
            console.error("Transaction error:", transactionError);
            reject(transactionError);
          },
          () => {}
        );
      } catch (error) {
        console.error("Error updating package type:", error.message);
        reject(error);
      }
    });
  },
  getPackageTypeById: async (typeId) => {
    return new Promise(async (resolve, reject) => {
      const selectQuery = `SELECT * FROM ${tableName} WHERE id = ?`;

      try {
        await dbInstance.transaction(
          (tx) => {
            tx.executeSql(
              selectQuery,
              [typeId],
              (_, results) => {
                const packageType = results.rows._array;
                resolve(packageType);
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
  getAllPackageTypes: async () => {
    return new Promise(async (resolve, reject) => {
      const selectQuery = `SELECT * FROM ${tableName}`;

      try {
        await dbInstance.transaction(
          (tx) => {
            tx.executeSql(
              selectQuery,
              [],
              (_, results) => {
                const packageTypes = results.rows.raw();
                resolve(packageTypes);
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
  deletePackageType: async (typeId) => {
    const deleteQuery = `DELETE FROM ${tableName} WHERE id = ?`;

    try {
      await dbInstance.transaction(
        (tx) => {
          tx.executeSql(deleteQuery, [typeId]);
        },
        (transactionError) => {
          console.error("Transaction error:", transactionError);
          throw transactionError;
        },
        () => {}
      );
      __DEV__ && console.log("Package type deleted successfully!");
    } catch (error) {
      console.error("Error deleting package type:", error.message);
    }
  },
};

export default PackageType;
