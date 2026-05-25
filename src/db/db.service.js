import {getCustomerList} from '../util/apiCalls';
import {
  Checkout,
  Package,
  PackageImage,
  PackageTracking,
  PackageType,
  Ship,
  User,
} from './db.crud';
import CustomerList from './dbcrud/dbcustomerList.crud';

const syncPackages = async (packageDataArray, progress, setProgress, user) => {
  try {
    if (!Array.isArray(packageDataArray) || packageDataArray.length === 0) {
      throw new Error('packageDataArray is empty or invalid');
    }
    const allRecords = await Checkout.getAllRecords();
    const existingPackageIds = allRecords
    .flatMap(record => JSON.parse(record.packagesId))
    .map(id => Number(id));

  __DEV__ && console.log('Existing Package IDs:', existingPackageIds);
    const firstPackageData = packageDataArray[0];

    if (!firstPackageData?.ship?.id) {
      throw new Error('Missing ship information in the first package data');
    }
    const existingShip = await Ship.getShipByID(packageDataArray[0].ship.id);
    if (typeof existingShip !== 'undefined') {
      await Ship.updateShip(
        packageDataArray[0].ship.id,
        packageDataArray[0].ship,
      );
    } else {
      await Ship.saveShip(packageDataArray[0].ship);
    }
    for (const [index, packageData] of packageDataArray.entries()) {
      if (existingPackageIds.includes(Number(packageData.id))) {
        __DEV__ && console.log(`Skipping package ${packageData.id} as it already exists`);
        continue; 
      }
      const existingUser = await User.getUserById(packageData.user.id);

      if (existingUser && existingUser.length > 0) {
        await User.updateUser(packageData.user.id, packageData.user);
      } else {
        await User.saveUser(packageData.user);
      }
      const customerData = await getCustomerList(user, packageData.user.id);
      __DEV__ && console.log({customerData: customerData});
      const existingCustomer = await CustomerList.getCustomerById(
        packageData.user.id,
      );
      __DEV__ && console.log({existingCustomer: existingCustomer});

      if (existingCustomer && existingCustomer?.id) {
        const response = await CustomerList.updateCustomer(
          packageData.user.id,
          customerData[0],
        );
        __DEV__ && console.log({updateCustomerResponse: response});
      } else {
        if (customerData[0]) {
          __DEV__ && console.log('customerData', customerData);
          const response = await CustomerList.saveCustomer(customerData[0]);
          __DEV__ && console.log({saveCustomerResponse: response});
        }
      }

      const existingPackageType = await PackageType.getPackageTypeById(
        packageData.package_type.id,
      );

      if (existingPackageType && existingPackageType.length > 0) {
        await PackageType.updatePackageType(
          packageData.package_type.id,
          packageData.package_type,
        );
      } else {
        await PackageType.savePackageType(packageData.package_type);
      }

      for (const trackingData of packageData.package_tracking) {
        trackingData.package_id = packageData.id;

        const existingPackageTracking =
          await PackageTracking.getPackageTrackingByPackageIdAndCreatedAt(
            trackingData.id,
            trackingData.created_at,
          );
        if (!existingPackageTracking) {
          await PackageTracking.savePackageTracking(trackingData);
        }
      }

      for (const imageData of packageData.images) {
        __DEV__ && console.log('imageData', imageData)
        imageData.package_id = packageData.id;

        const existingPackageImage =
          await PackageImage.getPackageImageByIdAndUrl(imageData.url,packageData?.id);

        if (!existingPackageImage) {
          await PackageImage.savePackageImage(imageData);
        }
      }

      const existingPackage = await Package.getPackageById(packageData?.id);
      const newPackage = {
        id: packageData.id,
        tracking_no: packageData.tracking_no,
        carrier: packageData.carrier,
        tag_number: packageData.tag_number,
        shelf: packageData.shelf,
        condition: packageData.condition,
        current_status: packageData.current_status,
        date_received: packageData.date_received,
        date_delivered: packageData.date_delivered,
        is_paid: packageData.is_paid,
        port: packageData.port,
        ship: packageData.ship?.id,
        user: packageData.user?.id,
        packageType: packageData.package_type.name,
        logInBy: packageData.package_tracking?.[0]?.done_by_user,
        logInDate: packageData?.package_tracking?.[0]?.created_at,
        custom_message: packageData?.custom_message,
      };

      if (existingPackage && existingPackage.length > 0) {
        await Package.updatePackage(packageData.id, newPackage);
      } else {
        await Package.savePackage(newPackage);
      }
      setProgress(index + 1);
    }
  } catch (error) {
    console.error('Error download packages:', error);
  }
};

const fetchDbPackages = async shipId => {
  return await Package.getPackagesByShipId(shipId);
};

const fetchdbShipsAvailable = async () => {
  return await Ship.getAllShips();
};

export {syncPackages, fetchDbPackages, fetchdbShipsAvailable};
