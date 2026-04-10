import { config } from "../db.config";
import dbInstance from "../db.service.crud";

const {
  packageTrackingTableName: tableName,
  userTableName,
  packageTableName,
} = config;

const PackageTracking = {
  createTable: () => {
    return new Promise(async (resolve, reject) => {
      const query = `CREATE TABLE IF NOT EXISTS ${tableName}(
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          package_id INTEGER,
          log_type TEXT,
          created_at DATETIME,
          done_by_user_id INTEGER,
          notes TEXT,
          signature TEXT,
          FOREIGN KEY (package_id) REFERENCES ${packageTableName}(id),
          FOREIGN KEY (done_by_user_id) REFERENCES ${userTableName}(id)
        );`;

      try {
        await dbInstance.transaction((tx) => {
          tx.executeSql(
            query,
            [],
            (_, results) => {
              resolve(results.rowsAffected);
            },
            (_, error) => {
              console.error("Error creating table:", error.message);
              reject(error);
            }
          );
        });
      } catch (error) {
        console.error("Error creating table:", error.message);
        reject(error);
      }
    });
  },

  savePackageTracking: (trackingData) => {
    return new Promise(async (resolve, reject) => {
      const insertQuery = `
        INSERT INTO ${tableName} (
          package_id, log_type, created_at, done_by_user_id, notes, signature
        ) VALUES (?, ?, ?, ?, ?, ?);
      `;

      const {
        package_id,
        log_type,
        created_at,
        done_by_user_id,
        notes,
        signature,
      } = trackingData;

      try {
        await dbInstance.transaction((tx) => {
          tx.executeSql(
            insertQuery,
            [
              package_id,
              log_type,
              created_at,
              done_by_user_id,
              notes,
              signature,
            ],
            (_, results) => {
              resolve(results.rowsAffected);
            },
            (_, error) => {
              console.error("Error saving package tracking:", error.message);
              reject(error);
            }
          );
        });
      } catch (error) {
        console.error("Error saving package tracking:", error.message);
        reject(error);
      }
    });
  },

  updatePackageTracking: (trackingId, updatedTracking) => {
    return new Promise(async (resolve, reject) => {
      const updateQuery = `
        UPDATE ${tableName} SET
        package_id = ?,
        log_type = ?,
        created_at = ?,
        done_by_user_id = ?,
        notes = ?,
        signature = ?
        WHERE id = ?;
      `;

      const {
        package_id,
        log_type,
        created_at,
        done_by_user_id,
        notes,
        signature,
      } = updatedTracking;

      try {
        await dbInstance.transaction((tx) => {
          tx.executeSql(
            updateQuery,
            [
              package_id,
              log_type,
              created_at,
              done_by_user_id,
              notes,
              signature,
              trackingId,
            ],
            (_, results) => {
              __DEV__ && console.log("Package tracking updated successfully!");
              resolve(results.rowsAffected);
            },
            (_, error) => {
              console.error("Error updating package tracking:", error.message);
              reject(error);
            }
          );
        });
      } catch (error) {
        console.error("Error updating package tracking:", error.message);
        reject(error);
      }
    });
  },

  getPackageTrackingById: (trackingId) => {
    return new Promise(async (resolve, reject) => {
      const selectQuery = `SELECT * FROM ${tableName} WHERE id = ?`;

      try {
        await dbInstance.transaction((tx) => {
          tx.executeSql(
            selectQuery,
            [trackingId],
            (_, results) => {
              resolve(results.rows.item(0));
            },
            (_, error) => {
              console.error(
                "Error fetching package tracking by id:",
                error.message
              );
              reject(error);
            }
          );
        });
      } catch (error) {
        console.error("Error fetching package tracking by id:", error.message);
        reject(error);
      }
    });
  },

  getPackageTrackingByPackageIdAndCreatedAt: (packageId, createdAt) => {
    return new Promise(async (resolve, reject) => {
      const selectQuery = `SELECT * FROM ${tableName} WHERE package_id = ? AND created_at = ?`;

      try {
        await dbInstance.transaction((tx) => {
          tx.executeSql(
            selectQuery,
            [packageId, createdAt],
            (_, results) => {
              resolve(results.rows.item(0));
            },
            (_, error) => {
              console.error(
                "Error fetching package tracking by package ID and created_at:",
                error.message
              );
              reject(error);
            }
          );
        });
      } catch (error) {
        console.error(
          "Error fetching package tracking by package ID and created_at:",
          error.message
        );
        reject(error);
      }
    });
  },

  getAllPackageTracking: () => {
    return new Promise(async (resolve, reject) => {
      const selectQuery = `SELECT * FROM ${tableName}`;

      try {
        await dbInstance.transaction((tx) => {
          tx.executeSql(
            selectQuery,
            [],
            (_, results) => {
              resolve(results.rows.raw());
            },
            (_, error) => {
              console.error(
                "Error fetching all package tracking:",
                error.message
              );
              reject(error);
            }
          );
        });
      } catch (error) {
        console.error("Error fetching all package tracking:", error.message);
        reject(error);
      }
    });
  },

  deletePackageTracking: (trackingId) => {
    return new Promise(async (resolve, reject) => {
      const deleteQuery = `DELETE FROM ${tableName} WHERE id = ?`;

      try {
        await dbInstance.transaction((tx) => {
          tx.executeSql(
            deleteQuery,
            [trackingId],
            (_, results) => {
              __DEV__ && console.log("Package tracking deleted successfully!");
              resolve(results.rowsAffected);
            },
            (_, error) => {
              console.error("Error deleting package tracking:", error.message);
              reject(error);
            }
          );
        });
      } catch (error) {
        console.error("Error deleting package tracking:", error.message);
        reject(error);
      }
    });
  },
};

export default PackageTracking;
