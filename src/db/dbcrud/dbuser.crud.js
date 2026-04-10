import {config} from '../db.config';
import dbInstance from '../db.service.crud';

const {userTableName: tableName, shipTableName} = config;

const User = {
  createTable: async () => {
    return new Promise(async (resolve, reject) => {
      const query = `CREATE TABLE IF NOT EXISTS ${tableName}(
  id INTEGER,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  email TEXT,
  ship TEXT,
  ship_id TEXT, 
  department_id TEXT,
  department_name TEXT,
  payable_amount TEXT,
  is_active BOOLEAN DEFAULT 0
);`;

      try {
        await dbInstance.transaction(tx => {
          tx.executeSql(
            query,
            [],
            (_, result) => {
              resolve(result);
            },
            (_, error) => {
              console.error('Error creating user table:', error);
              reject(error);
            },
          );
        });
      } catch (error) {
        console.error('Transaction error:', error);
        reject(error);
      }
    });
  },

  saveUser: async userData => {
    return new Promise(async (resolve, reject) => {
      const insertQuery = `
      INSERT INTO ${tableName} (
        id, first_name, last_name, phone, email, ship, ship_id,
        department_id, department_name, payable_amount, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;

      const {
        id,
        first_name,
        last_name,
        phone,
        email,
        ship,
        ship_id,
        department_id,
        department_name,
        payable_amount,
        is_active,
      } = userData;

      try {
        await dbInstance.transaction(tx => {
          tx.executeSql(
            insertQuery,
            [
              id,
              first_name,
              last_name,
              phone,
              email,
              ship,
              ship_id,
              department_id,
              department_name,
              payable_amount,
              is_active,
            ],
            (_, result) => {
              // __DEV__ && console.log("User saved successfully!");
              resolve(result);
            },
            (_, error) => {
              console.error('Error saving user:', error);
              reject(error);
            },
          );
        });
      } catch (error) {
        console.error('Transaction error:', error);
        reject(error);
      }
    });
  },

  updateUser: async (userId, updatedUser) => {
    return new Promise(async (resolve, reject) => {
      const updateQuery = `
      UPDATE ${tableName} SET
      first_name = ?,
      last_name = ?,
      phone = ?,
      email = ?,
      ship = ?,
      ship_id = ?,
      department_id = ?,
      department_name = ?,
      payable_amount = ?,
      is_active = ?
      WHERE id = ?;
    `;

      const {
        first_name,
        last_name,
        phone,
        email,
        ship,
        ship_id,
        department_id,
        department_name,
        payable_amount,
        is_active,
      } = updatedUser;

      try {
        await dbInstance.transaction(tx => {
          tx.executeSql(
            updateQuery,
            [
              first_name,
              last_name,
              phone,
              email,
              ship,
              ship_id,
              department_id,
              department_name,
              payable_amount,
              is_active,
              userId,
            ],
            (_, result) => {
              resolve(result);
            },
            (_, error) => {
              console.error('Error updating user:', error);
              reject(error);
            },
          );
        });
      } catch (error) {
        console.error('Transaction error:', error);
        reject(error);
      }
    });
  },

  getUserById: async userId => {
    return new Promise(async (resolve, reject) => {
      const selectQuery = `SELECT * FROM ${tableName} WHERE id = ?`;

      try {
        await dbInstance.transaction(async tx => {
          const txn = await tx.executeSql(
            selectQuery,
            [userId],
            (_, results) => {
              // __DEV__ && console.log('txResult', results.rows.item(0));

              // resolve(results.rows._array);
              resolve(results.rows.item(0));
            },
            (_, error) => {
              reject(error);
            },
          );
        });
      } catch (error) {
        console.error('Error retrieving user by ID:', error);
        reject(error);
      }
    });
  },

  getAllUsers: async () => {
    return new Promise(async (resolve, reject) => {
      const selectQuery = `SELECT * FROM ${tableName}`;

      try {
        const result = await dbInstance.transaction(async tx => {
          const [txResult] = await tx.executeSql(selectQuery);
          return txResult;
        });

        resolve(result);
      } catch (error) {
        console.error('Error retrieving all users:', error);
        reject(error);
      }
    });
  },

  deleteUser: async userId => {
    return new Promise(async (resolve, reject) => {
      const deleteQuery = `DELETE FROM ${tableName} WHERE id = ?`;

      try {
        await dbInstance.transaction(async tx => {
          tx.executeSql(
            deleteQuery,
            [userId],
            (_, result) => {
              __DEV__ && console.log('User deleted successfully!');
              resolve(result);
            },
            (_, error) => {
              console.error('Error deleting user:', error);
              reject(error);
            },
          );
        });
      } catch (error) {
        console.error('Transaction error:', error);
        reject(error);
      }
    });
  },
  updateUserPayableAmountById: async (userId, cashReceived) => {
    return new Promise(async (resolve, reject) => {
      // Retrieve the current payable amount for the user
      const user = await User.getUserById(userId);
      if (user.length === 0) {
        __DEV__ && console.log('User not found.');
        return;
      }
      __DEV__ && console.log('user', user);
      const currentPayableAmount = parseFloat(
        user.payable_amount || user[0].payable_amount,
      );

      // Calculate the new payable amount by subtracting the cash received
      const newPayableAmount = currentPayableAmount - parseFloat(cashReceived);

      const updateQuery = `
      UPDATE ${tableName} SET
      payable_amount = ?
      WHERE id = ?;
    `;

      try {
        await dbInstance.transaction(tx => {
          tx.executeSql(
            updateQuery,
            [newPayableAmount.toString(), userId],
            (_, result) => {
              __DEV__ && console.log("User's payable amount updated successfully!");
              resolve(result);
            },
            (_, error) => {
              console.error("Error updating user's payable amount:", error);
              reject(error);
            },
          );
        });
      } catch (error) {
        console.error('Transaction error:', error);
        reject(error);
      }
    });
  },
};

export default User;
