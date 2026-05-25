import { config } from "../db.config";
import dbInstance from "../db.service.crud";

const { shipTableName: tableName } = config;

const Ship = {
  createTable: async () => {
    return new Promise(async (resolve, reject) => {
      const query = `CREATE TABLE IF NOT EXISTS ${tableName}(
        id INTEGER PRIMARY KEY,
        name TEXT UNIQUE,
        company_id INTEGER,
        company_name TEXT
      );`;

      try {
        await dbInstance.transaction(
          (tx) => {
            tx.executeSql(
              query,
              [],
              (_, results) => {
                resolve(results);
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
      } catch (error) {
        console.error("Error creating table:", error.message);
        reject(error);
      }
    });
  },
  saveShip: async (shipData) => {
    return new Promise(async (resolve, reject) => {
      const insertQuery = `INSERT INTO ${tableName} (id, name, company_id, company_name) VALUES (?, ?, ?, ?);`;

      const { id, name, company_id, company_name } = shipData;

      try {
        await dbInstance.transaction(
          (tx) => {
            tx.executeSql(
              insertQuery,
              [id, name, company_id, company_name],
              (_, results) => {
                __DEV__ && console.log("Ship saved successfully!");
                resolve(results);
              },
              (_, error) => {
                console.error("Error saving ship:", error);
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
        console.error("Error saving ship:", error.message);
        reject(error);
      }
    });
  },
  updateShip: async (shipID, updatedShip) => {
    return new Promise(async (resolve, reject) => {
      const updateQuery = `
        UPDATE ${tableName} SET
        name = ?,
        company_id = ?,
        company_name = ?
        WHERE id = ?;
      `;

      const { name, company_id, company_name } = updatedShip;

      try {
        await dbInstance.transaction(
          (tx) => {
            tx.executeSql(
              updateQuery,
              [name, company_id, company_name, shipID],
              (_, results) => {
                __DEV__ && console.log("Ship updated successfully!");
                resolve(results);
              },
              (_, error) => {
                console.error("Error updating ship:", error);
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
        console.error("Error updating ship:", error.message);
        reject(error);
      }
    });
  },
  getShipByID: async (shipID) => {
    return new Promise(async (resolve, reject) => {
      const selectQuery = `SELECT * FROM ${tableName} WHERE id = ?`;

      try {
        await dbInstance.transaction(
          (tx) => {
            tx.executeSql(
              selectQuery,
              [shipID],
              (_, results) => {
                const shipData = results.rows.item(0);
                resolve(shipData);
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
  getAllShips: async () => {
    return new Promise(async (resolve, reject) => {
      const selectQuery = `SELECT * FROM ${tableName}`;

      try {
        await dbInstance.transaction(
          (tx) => {
            tx.executeSql(
              selectQuery,
              [],
              (_, results) => {
                const rows = results.rows;
                const shipList = [];

                for (let i = 0; i < rows.length; i++) {
                  shipList.push(rows.item(i));
                }

                resolve(shipList);
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

  deleteShip: async (shipID) => {
    return new Promise(async (resolve, reject) => {
      const deleteQuery = `DELETE FROM ${tableName} WHERE id = ?`;

      try {
        await dbInstance.transaction(
          (tx) => {
            tx.executeSql(deleteQuery, [shipID]);
          },
          (transactionError) => {
            console.error("Transaction error:", transactionError);
            throw transactionError;
          },
          () => {}
        );
        __DEV__ && console.log("Ship deleted successfully!");
        resolve();
      } catch (error) {
        console.error("Error deleting ship:", error.message);
        reject(error);
      }
    });
  },
};

export default Ship;
