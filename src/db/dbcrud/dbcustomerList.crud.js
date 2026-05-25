import {config} from '../db.config';
import dbInstance from '../db.service.crud';

const {customerListTableName: tableName} = config;

const CustomerList = {
  createTable: async () => {
    return new Promise(async (resolve, reject) => {
      const query = `CREATE TABLE IF NOT EXISTS ${tableName}(
        id INTEGER,
        first_name TEXT,
        last_name TEXT,
        phone TEXT,
        email TEXT,
        ship INTEGER,
        ship_name TEXT, 
        dept INTEGER,
        dept_name TEXT,
        payable_amount TEXT,
        credit TEXT,
        unpaid_packages TEXT,
        other_purchases TEXT,
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
  saveCustomer: async userData => {
    return new Promise(async (resolve, reject) => {
      const insertQuery = `INSERT INTO ${tableName} (
      id, first_name, last_name, phone, email, ship, ship_name,
      dept, dept_name, payable_amount, credit, unpaid_packages, other_purchases, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;

      const {
        id,
        first_name,
        last_name,
        phone,
        email,
        ship,
        ship_name,
        dept,
        dept_name,
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
              ship_name,
              dept,
              dept_name,
              payable_amount.payable_amount,
              payable_amount.credit,
              payable_amount.unpaid_packages,
              payable_amount.other_purchases,
              is_active,
            ],
            (_, result) => {
              // __DEV__ && console.log('User saved successfully!', _, 'yuyu', result);
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
  updateCustomer: async (userId, updatedUser) => {
    return new Promise(async (resolve, reject) => {
      const updateQuery = `
      UPDATE ${tableName} SET
      first_name = ?,
      last_name = ?,
      phone = ?,
      email = ?,
      ship = ?,
      ship_name = ?,
      dept = ?,
      dept_name = ?,
      payable_amount = ?,
      credit = ?,
      unpaid_packages = ?,
      other_purchases = ?,
      is_active = ?
      WHERE id = ?;
    `;

      const {
        first_name,
        last_name,
        phone,
        email,
        ship,
        ship_name,
        dept,
        dept_name,
        payable_amount,
        is_active,
      } = updatedUser;

      __DEV__ && console.log('payable_amount', payable_amount);

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
              ship_name,
              dept,
              dept_name,
              payable_amount.payable_amount,
              payable_amount.credit,
              payable_amount.unpaid_packages,
              payable_amount.other_purchases,
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
  getCustomerById: async userId => {
    return new Promise(async (resolve, reject) => {
      const selectQuery = `SELECT * FROM ${tableName} WHERE id = ?`;

      try {
        await dbInstance.transaction(async tx => {
          const txn = await tx.executeSql(
            selectQuery,
            [userId],
            (_, results) => {
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
  updateCustomerPayable: async (userId, cashReceived, addExcessToCredit = false) => {
    return new Promise(async (resolve, reject) => {
      const user = await CustomerList.getCustomerById(userId);
      if (user.length === 0) {
        return reject('User not found.');
      }
      // Extract data from the user object (assuming data is accessible)
      const currentPayables = user.payable_amount || user[0].payable_amount;
      const currentCredit = user.credit || user[0].credit;
      const currentUnpaidPackages =
        user.unpaid_packages || user[0].unpaid_packages;
      const currentOtherPurchases =
        user.other_purchases || user[0].other_purchases;

      // Parse all values to floats, default to 0 if NaN
      let newCashRecieved = parseFloat(cashReceived) || 0;
      let newCredit = parseFloat(currentCredit) || 0;
      let newUnpaidPackages = parseFloat(currentUnpaidPackages) || 0;
      let newPayables = parseFloat(currentPayables) || 0;
      let newOtherPurchases = parseFloat(currentOtherPurchases) || 0;

      __DEV__ && console.log(
        'newCredit1',
        newCashRecieved,
        newCredit,
        newUnpaidPackages,
        newPayables,
        newOtherPurchases,
      );

      // First, apply existing credit to payables
      if (newCredit >= newPayables) {
        newCredit -= newPayables;
        newPayables = 0;
        newUnpaidPackages = 0;
      } else {
        newPayables -= newCredit;
        newUnpaidPackages = newPayables;
        newCredit = 0;
      }

      // Now apply new cash received to payables
      let remainingCash = newCashRecieved;
      let payWithCash = Math.min(remainingCash, newPayables);
      newPayables -= payWithCash;
      newUnpaidPackages = newPayables;
      remainingCash -= payWithCash;

      // Add remaining cash to credit only if addExcessToCredit is true
      if (addExcessToCredit) {
        newCredit += remainingCash;
      }

      newOtherPurchases = 0;

      const updateQuery = `
          UPDATE ${tableName} SET
          payable_amount = ?,
          credit = ?,
          unpaid_packages = ?,
          other_purchases = ?
          WHERE id = ?;
      `;

      try {
        await dbInstance.transaction(tx => {
          tx.executeSql(
            updateQuery,
            [
              newPayables,
              newCredit,
              newUnpaidPackages,
              newOtherPurchases,
              userId,
            ],
            (_, result) => {
              __DEV__ && console.log(
                "User's payable amount and credit balance updated successfully!",
              );
              resolve(result);
            },
            (_, error) => {
              console.error(
                "Error updating user's payable amount and credit balance:",
                error,
              );
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

export default CustomerList;
