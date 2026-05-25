import ImageCropPicker from 'react-native-image-crop-picker';
import {Platform} from 'react-native';

import {
  check,
  request,
  requestMultiple,
  PERMISSIONS,
  openSettings,
} from 'react-native-permissions';
import {cameraAlert, permissionConfirm} from '../utilities/ApiCalls';

export const open = async (cb, isCrop, mediaType) => {
  checkPremission(
    PERMISSIONS.ANDROID.CAMERA,
    PERMISSIONS.IOS.CAMERA,
    cb,
    isCrop,
    'Camera',
    mediaType,
  );
  return;
  cameraAlert('Select image from...', 'Camera', 'Gallery', 'Cancel', status => {
    if (status == 'Camera') {
      checkPremission(
        PERMISSIONS.ANDROID.CAMERA,
        PERMISSIONS.IOS.CAMERA,
        cb,
        isCrop,
        'Camera',
        mediaType,
      );
    } else if (status == 'Gallery') {
      checkPremission(
        Platform.Version >= 33
          ? PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE &&
              PERMISSIONS.ANDROID.READ_MEDIA_IMAGES
          : PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE,
        PERMISSIONS.IOS.PHOTO_LIBRARY,
        cb,
        isCrop,
        'Gallery',
        mediaType,
      );
    }
  });
};

export const checkPremission = async (
  androidType,
  iosType,
  cb,
  isCrop,
  launchType,
  mediaType,
) => {
  __DEV__ && console.log('androidType', androidType)
  await check(
    Platform.select({
      android: androidType,
      ios: iosType,
    }),
  ).then(result => {__DEV__ && console.log('result', result)
    if (result === 'granted' || result === 'limited') {
      selecteImage(cb, isCrop, launchType, mediaType);
      return;
    }
    if (result === 'blocked' || result === 'unavailable') {
      permissionConfirm(
        'Access to the camera has been prohibited please enable it in the Settings app to continue.',
        status => {
          if (status) {
            openSettings().catch(() => {
              console.warn('cannot open settings');
            });
          }
        },
      );
      return;
    }
    request(
      Platform.select({
        android: androidType,
        ios: iosType,
      }),
    ).then(status => {
      if (status === 'granted' || status === 'limited') {
        selecteImage(cb, isCrop, launchType, mediaType);
      } else {
      }
    });
  });
};

export const selecteImage = (cb, isCrop, launchType, mediaType) => {
  if (launchType === 'Camera') {
    if (isCrop) {
      ImageCropPicker.openCamera({
        width: 480,
        height: 480,
        cropping: true,
        compressImageQuality: 0.1,
        loadingLabelText: 'Uploading, please wait...',
        mediaType: 'photo',
      })
        .then(response => {
          response.mediaType = response.duration ? 'video' : 'image';
          cb(response);
        })
        .catch(e => {
          if (e.message === 'Cannot find image data') {
            //  Helper.showToast("Please select a valid file.");
          }
        });
    } else {
      ImageCropPicker.openCamera({
        mediaType: 'photo',
        compressImageQuality: 0.1,
        loadingLabelText: 'Uploading, please wait...',
      })
        .then(response => {
          response.mediaType = 'image';
          cb(response);
        })
        .catch(e => {
          if (e.message === 'Cannot find image data') {
            //  Helper.showToast("Please select a valid file.");
          }
        });
    }
  } else {
    if (isCrop) {
      ImageCropPicker.openPicker({
        width: 480,
        height: 480,
        cropping: true,
        loadingLabelText: 'Uploading, please wait...',
        mediaType: 'photo',
        compressImageQuality: 0.1,
      })
        .then(response => {
          response.mediaType = 'image';
          cb(response);
        })
        .catch(e => {
          if (e.message === 'Cannot find image data') {
            //Helper.showToast("Please select a valid file.");
          }
        });
    } else {
      ImageCropPicker.openPicker({
        mediaType: 'photo',
        compressImageQuality: 0.1,
        loadingLabelText: 'Uploading, please wait...',
      })
        .then(response => {
          response.mediaType = 'image';
          cb(response);
        })
        .catch(e => {
          if (e.message === 'Cannot find image data') {
            //  Helper.showToast("Please select a valid file.");
          }
        });
    }
  }
};
