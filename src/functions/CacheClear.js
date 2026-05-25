import {Alert, Platform} from 'react-native';
import dbInstance, {database} from '../db/db.service.crud';
// import dbInstance, { database } from "../processors/db/db.service.crud";
// import { deleteAllImages } from "../processors/db/decury/dbpackageimage.crud";

const clearCacheAndStorage = async initializeDatabase => {
  try {
    // Confirmation alert before clearing cache and storage
    Alert.alert(
      'Confirmation',
      'Are you sure you want to clear cache and storage?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'OK',
          onPress: async () => {
            try {
              // Clear cache
              // await FileSystem.deleteAsync(FileSystem.cacheDirectory);

              // Clear AsyncStorage
              // await AsyncStorage.clear();

              // Clear storage using dbInstance if implemented
              if (dbInstance && dbInstance.clearCacheAndStorage) {
                await dbInstance.clearCacheAndStorage();
              }

              await database.deleteAllTables();
              await initializeDatabase();
              // await deleteAllImages();

              Alert.alert(
                'Cache and Storage Cleared',
                'The app cache and storage have been cleared successfully.',
                // [
                //   {
                //     text: "OK",
                //     onPress: () => {
                //       Alert.alert(
                //         "Restart Required",
                //         "Please restart the application to apply changes."
                //       );
                //     },
                //   },
                // ]
              );
            } catch (error) {
              console.error('Error clearing cache and storage:', error);
              Alert.alert(
                'Error',
                'An error occurred while clearing cache and storage.',
              );
            }
          },
        },
      ],
    );
  } catch (error) {
    console.error('Error displaying confirmation alert:', error);
  }
};

export default clearCacheAndStorage;
