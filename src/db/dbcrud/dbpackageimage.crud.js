import {config} from '../db.config';
import dbInstance from '../db.service.crud';
import * as FileSystem from 'react-native-fs';
import RNFS from 'react-native-fs';
const {packageImageTableName: tableName, packageTableName} = config;

const PackageImage = {
  createTable: () => {
    return new Promise(async (resolve, reject) => {
      const query = `CREATE TABLE IF NOT EXISTS ${tableName}(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        package_id INTEGER,
        url TEXT,
        local_url TEXT,
        log_type TEXT,
        image_preview TEXT,
        FOREIGN KEY (package_id) REFERENCES ${packageTableName}(id)
      );`;

      try {
        await dbInstance.transaction(tx => {
          tx.executeSql(
            query,
            [],
            (_, results) => {
              resolve(results);
            },
            (_, error) => {
              console.error('Error creating table:', error.message);
              reject(error);
            },
          );
        });
      } catch (error) {
        console.error('Error creating table:', error.message);
        reject(error);
      }
    });
  },
  savePackageImage: async imageData => {
    const {package_id, url, log_type,image_preview} = imageData;
__DEV__ && console.log('image_preview=================', image_preview)
    try {
      // Check if the image already exists
      const existingImage = await PackageImage.getPackageImageByIdAndUrl(image_preview,package_id);
      if (existingImage) {
        __DEV__ && console.log('Image already exists');
        return false; // Image already exists, return false
      }

      // Download the image to local storage
      const localImagePath = await downloadImageToLocal(image_preview, package_id.toString());

      __DEV__ && console.log('localImagePath, url', localImagePath);
      __DEV__ && console.log('image_previewodsdksdn', image_preview)

      // Insert the image data into the database
      await dbInstance.transaction(tx => {
        tx.executeSql(
          `
        INSERT INTO ${tableName} (
          package_id, url, local_url, log_type,image_preview
        ) VALUES (?, ?, ?, ?, ?)
      `,
          [package_id, url, localImagePath, log_type, image_preview],
          (_, results) => {
            __DEV__ && console.log('Image added successfully');
            return results.rowsAffected; // Return the number of rows affected
          },
          (_, error) => {
            console.error('Error saving package image:', error.message);
            // throw new Error(`Error saving package image: ${error.message}`);
          },
        );
      });

      return true; // Image saved successfully
    } catch (error) {
      console.error('Error saving package image:', error.message);
      // throw new Error(`Error saving package image: ${error.message}`);
    }
  },
  updatePackageImage: (imageId, updatedImage) => {
    return new Promise(async (resolve, reject) => {
      const updateQuery = `
        UPDATE ${tableName} SET
        package_id = ?,
        url = ?,
        log_type = ?
        WHERE id = ?;
      `;

      const {package_id, url, log_type} = updatedImage;

      try {
        await dbInstance.transaction(tx => {
          tx.executeSql(
            updateQuery,
            [package_id, url, log_type, imageId],
            (_, results) => {
              // __DEV__ && console.log("Package image updated successfully!");
              resolve(results.rowsAffected);
            },
            (_, error) => {
              console.error('Error updating package image:', error.message);
              reject(error);
            },
          );
        });
      } catch (error) {
        console.error('Error updating package image:', error.message);
        reject(error);
      }
    });
  },
  getPackageImageById: imageId => {
    return new Promise(async (resolve, reject) => {
      const selectQuery = `SELECT * FROM ${tableName} WHERE package_id = ?`;

      try {
        await dbInstance.transaction(tx => {
          tx.executeSql(
            selectQuery,
            [imageId],
            (_, results) => {
              resolve(results.rows.item(0));
            },
            (_, error) => {
              console.error(
                'Error fetching package image by id:',
                error.message,
              );
              reject(error);
            },
          );
        });
      } catch (error) {
        console.error('Error fetching package image by id:', error.message);
        reject(error);
      }
    });
  },
  getPackageImagesById: packageId => {
    return new Promise(async (resolve, reject) => {
      const selectQuery = `SELECT * FROM ${tableName} WHERE package_id = ?`;

      try {
        await dbInstance.transaction(tx => {
          tx.executeSql(
            selectQuery,
            [packageId],
            (_, results) => {
              const images = [];
              const rows = results.rows;

              for (let i = 0; i < rows.length; i++) {
                images.push(rows.item(i));
              }

              resolve(images);
            },
            (_, error) => {
              console.error(
                'Error fetching package images by id:',
                error.message,
              );
              reject(error);
            },
          );
        });
      } catch (error) {
        console.error('Error fetching package images by id:', error.message);
        reject(error);
      }
    });
  },
  getAllPackageImages: () => {
    return new Promise(async (resolve, reject) => {
      const selectQuery = `SELECT * FROM ${tableName}`;

      try {
        await dbInstance.transaction(tx => {
          tx.executeSql(
            selectQuery,
            [],
            (_, results) => {
              resolve(results.rows.raw());
            },
            (_, error) => {
              console.error(
                'Error fetching all package images:',
                error.message,
              );
              reject(error);
            },
          );
        });
      } catch (error) {
        console.error('Error fetching all package images:', error.message);
        reject(error);
      }
    });
  },
  getPackageImagesByPackageId: (packageId, downloadImages = false) => {
    return new Promise(async (resolve, reject) => {
      const selectByPackageIdQuery = `SELECT * FROM ${tableName} WHERE package_id = ?`;

      try {
        await dbInstance.transaction(async tx => {
          tx.executeSql(
            selectByPackageIdQuery,
            [packageId],
            async (_, results) => {
              const packageImages = [];

              for (let i = 0; i < results.rows.length; i++) {
                const item = results.rows.item(i);
                if (downloadImages) {
                  try {
                    const downloadedImageUrl = await downloadImageToLocal(
                      item.image_preview,
                      item.package_id.toString(),
                    );
                    item.downloadedImageUrl = downloadedImageUrl;
                  } catch (error) {
                    console.error(
                      `Error downloading image ${item.url}:`,
                      error,
                    );
                  }
                }
                packageImages.push(item);
              }

              resolve(packageImages);
            },
            (_, error) => {
              console.error(
                'Error fetching package images by packageId:',
                error.message,
              );
              reject(error);
            },
          );
        });
      } catch (error) {
        console.error(
          'Error fetching package images by packageId:',
          error.message,
        );
        reject(error);
      }
    });
  },
  getPackageImageByIdAndUrl: (url, packageId) => {
    return new Promise(async (resolve, reject) => {
      // const selectQuery = `SELECT * FROM ${tableName} WHERE url = ? AND package_id = ?`;
      const selectQuery = `SELECT * FROM ${tableName} WHERE image_preview = ? AND package_id = ?`;
      try {
        await dbInstance.transaction(tx => {
          tx.executeSql(
            selectQuery,
            [url, packageId],
            (_, results) => {
              resolve(results.rows.item(0));
            },
            (_, error) => {
              console.error(
                'Error fetching package image by id and url:',
                error.message,
              );
              reject(error);
            },
          );
        });
      } catch (error) {
        console.error(
          'Error fetching package image by id and url:',
          error.message,
        );
        reject(error);
      }
    });
  },
  deletePackageImage: imageId => {
    return new Promise(async (resolve, reject) => {
      const deleteQuery = `DELETE FROM ${tableName} WHERE id = ?`;

      try {
        await dbInstance.transaction(tx => {
          tx.executeSql(
            deleteQuery,
            [imageId],
            (_, results) => {
              // Log the success message
              // __DEV__ && console.log("Package image deleted successfully!");
              resolve(results.rowsAffected);
            },
            (_, error) => {
              console.error('Error deleting package image:', error.message);
              reject(error);
            },
          );
        });
      } catch (error) {
        console.error('Error deleting package image:', error.message);
        reject(error);
      }
    });
  },
};

const downloadImageToLocal = async (imageUrl, imageName) => {
  try {
    const localUri =
      FileSystem.DocumentDirectoryPath +
      '/' +
      Date.now() +
      '_' +
      imageName +
      '.jpg';

     FileSystem.downloadFile({
      fromUrl: imageUrl,
      toFile: localUri,
    });
  

    return localUri;
  } catch (error) {
    console.error(`Error downloading image ${imageUrl}:`, error);
    throw new Error(`Error downloading image ${imageUrl}: ${error.message}`);
  }
  
};
const deleteAllImages = async () => {
  try {
    const files = await FileSystem.readDir(FileSystem.DocumentDirectoryPath);

    // Iterate over each file and delete it
    for (const file of files) {
      await FileSystem.unlink(FileSystem.DocumentDirectoryPath + file);
    }

    __DEV__ && console.log('All images deleted successfully.');
  } catch (error) {
    console.error('Error deleting images:', error);
    throw new Error(`Error deleting images: ${error.message}`);
  }
};

export {deleteAllImages};
export default PackageImage;
