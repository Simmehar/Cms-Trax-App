import { Alert } from 'react-native';
import dbInstance, { database } from '../db/db.service.crud';
import i18n from '../localization/i18n';

const clearCacheAndStorage = async (initializeDatabase) => {
  try {
    Alert.alert(
      i18n.t('Confirmation'),
      i18n.t('Are you sure you want to clear cache and storage?'),
      [
        {
          text: i18n.t('Cancel'),
          style: 'cancel',
        },
        {
          text: i18n.t('OK'),
          onPress: async () => {
            try {
              // Clear custom cache/storage if implemented
              if (
                dbInstance &&
                typeof dbInstance.clearCacheAndStorage === 'function'
              ) {
                await dbInstance.clearCacheAndStorage();
              }

              // Delete all database tables
              await database.deleteAllTables();

              // Reinitialize database
              if (typeof initializeDatabase === 'function') {
                await initializeDatabase();
              }

              Alert.alert(
                i18n.t('Cache and Storage Cleared'),
                i18n.t(
                  'The app cache and storage have been cleared successfully.'
                )
              );
            } catch (error) {
              console.error('Error clearing cache and storage:', error);

              Alert.alert(
                i18n.t('Error'),
                i18n.t(
                  'An error occurred while clearing cache and storage.'
                )
              );
            }
          },
        },
      ]
    );
  } catch (error) {
    console.error('Error displaying confirmation alert:', error);
  }
};

export default clearCacheAndStorage;