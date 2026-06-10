import React, { createContext, useState, useEffect, useContext } from "react";
import NetInfo from "@react-native-community/netinfo";
import { syncPackages } from "./db.service";
import {
  bulkPackageLogout,
  cashReceivedDetails,
  customerListApiUpdate,
  filterSortPackages,
  getPackagesForDbSetup,
  getCustomerList,
  sendEmail,
  uploadImg,
  formSync,
} from "../util/apiCalls";
import { Alert } from "react-native";
import {
  Checkout,
  Package,
  PackageImage,
  PackageTracking,
  PackageType,
  Ship,
  User,
  AdvancedForms,
} from "./db.crud";
import { AuthContext } from "../contexts/authcontext";
import Status from "../util/Status";
import {
  ProgressBar as ProgressBarComponent,
  ProgressBarSyncCheckouts,
} from "../components/Progress";
import { SearchContext } from "../contexts/SearchContext";
import { PackageContext } from "../contexts/PackageContext";
import CustomerList from "./dbcrud/dbcustomerList.crud";
import deletedPackage from "./dbcrud/dbDeletepackage.curd";

const ModeContext = createContext();

export const OfflineModeProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(false);
  const [isDownloadEnabled, setIsDownloadEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dbPackages, setDbPackages] = useState();
  const [dbPackagesReset, setDbPackagesReset] = useState();
  const [dbShips, setDbShips] = useState();
  const [selectedShipIdDB, setSelectedShipIdDB] = useState();
  const [searchInDB, setSearchInDB] = useState("");
  const [totalProgress, setTotalProgress] = useState(0);
  const [progress, setProgress] = useState();
  const { user } = useContext(AuthContext);
  // Offline Select States
  const [selcetDbAllCheck, setSelectDbAllCheck] = useState(false);
  const [selcetDBAllSearchCheck, setSelectDBAllSearchCheck] = useState(false);
  const { getShips } = useContext(PackageContext);
  const [modalVisible, setModalVisible] = useState(false);
  const [initialOffline, setInitialOffline] = useState(false);
  const [sortingOrder, setSortingOrder] = useState(false);

  const {
    setSearchPhrase,
    setSearchedPackages,
    setSelectAllCheck,
    setSelectAllSearchCheck,
    selectedPackages,
    setSelectedPackages,
    setIsSearchListOn,
    checkedOutPackages,
    setPackages,
  } = useContext(SearchContext);

  const checkAllDbPackages = () => {
    const selectedPackageIds = selectedPackages?.map((p) => p.id) || [];

    const filteredCheckedOutPackages = checkedOutPackages
      ? checkedOutPackages.filter(
        (pkgId) => !selectedPackageIds.includes(pkgId)
      )
      : [];

    const newPackages = dbPackages.filter(
      (obj) =>
        !selectedPackageIds.includes(obj.id) &&
        !(
          filteredCheckedOutPackages &&
          filteredCheckedOutPackages.includes(obj.id)
        )
    );

    setSelectedPackages((prevSP) => [...prevSP, ...newPackages]);
  };

  const clearSelectedDbPackages = () => {
    setSelectedPackages([]);
    setSelectAllCheck(false);
    setSelectAllSearchCheck(false);
  };

  useEffect(() => {
    const resetState = async () => {
      setPackages([]);
      setSearchedPackages([]);
      setSelectAllCheck(false);
      setSelectAllSearchCheck(false);
      setSelectedShipIdDB();
      setSearchInDB("");
      setSearchPhrase("");
      setSelectedPackages([]);
      setIsSearchListOn(false);
      await initializeDatabase();
    };

    const checkNetworkStatus = async () => {
      try {
        const netInfoState = await NetInfo.fetch();
        const online =
          netInfoState.isConnected && netInfoState.isInternetReachable;
        __DEV__ && console.log('online+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++', online)
        setIsOnline(online);
        if (online) {
          if (!initialOffline) {
            await resetState();
            await checkForUnsyncedCheckouts();
          } else {
            setInitialOffline(false);
          }
        }
      } catch (error) {
        console.error("Error checking network status:", error);
      }
    };
    checkNetworkStatus();
    const checkForUnsyncedCheckouts = async () => {
      try {
        const allRecords = await Checkout.getAllRecords();
        const unsyncedCheckouts = allRecords.filter(
          (record) => record.Synced === "false" || record.Synced === 0
        );

        const allAdvancedRecords = await AdvancedForms.getAllRecords();

        const unsyncedAdvanced = allAdvancedRecords.filter((record) => {
          __DEV__ && console.log("record.data.synced:", record.data.synced);
          return record.data.synced === false;
        });
        if (unsyncedCheckouts.length > 0 || unsyncedAdvanced.length > 0) {
          showSyncPopup();
        }
      } catch (error) {
        console.error("Error checking unsynced checkouts:", error);
      }
    };

    const showSyncPopup = () => {
      setModalVisible(true);
    };


    const handleConnectivityChange = async (state) => {
      const online =
        state.isConnected === true &&
        state.isInternetReachable !== false;

      console.log(
        'isConnected:',
        state.isConnected,
        'isInternetReachable:',
        state.isInternetReachable,
        'online:',
        online
      );

      setIsOnline(online);
      await resetState();
      if (online) {
        if (!initialOffline) {
          await checkForUnsyncedCheckouts();
        } else {
          setInitialOffline(false);
        }
      } else {
        // Offline
        setInitialOffline(true); // Remember offline status
      }

      // Show modal if there are unsynced checkouts and coming back online
      if (online && initialOffline) {
        await checkForUnsyncedCheckouts();
      }
    };

    const unsubscribe = NetInfo.addEventListener(handleConnectivityChange);

    return () => {
      unsubscribe();
    };
  }, []);



  const SyncUnsynched = async (setIsProgressEnabled) => {
    const syncData = async () => {
      await Checkout.createTable();
      await AdvancedForms.createTable();
      const allRecords = await Checkout.getAllRecords();

      // __DEV__ && console.log(allRecords);

      // TODO Check returning int value instead of Boolean
      const unsyncedCheckouts = allRecords.filter(
        (record) => record.Synced === "false" || record.Synced === 0
      );

      const allAdvancedRecords = await AdvancedForms.getAllRecords();
      const unsyncedAdvanced = allAdvancedRecords.filter(
        (record) => record.data.synced === false
      );

      __DEV__ && console.log("dsdsdddd", unsyncedAdvanced);

      if (unsyncedCheckouts.length === 0 && unsyncedAdvanced.length === 0) {
        Alert.alert("No Data to sync", "", [
          {
            text: "Ok",
          },
        ]);
      } else {
        NetInfo.fetch().then((state) => {
          __DEV__ && console.log("state", state);
          const isHotspot = state.details?.isConnectionExpensive;
          const networkType = state.type;
          __DEV__ && console.log("networkType", networkType);

          if (state.type === "wifi") {
            const messageParts = [];
            if (unsyncedCheckouts.length > 0) {
              messageParts.push(`${unsyncedCheckouts.length} unsynced checkouts`);
            }
            if (unsyncedAdvanced.length > 0) {
              messageParts.push(`${unsyncedAdvanced.length} unsynced forms`);
            }
            const message = `Found ${messageParts.join(' and ')}.`;

            Alert.alert(
              "Unsynced Entries",
              message,
              [
                {
                  text: "Cancel",
                  style: "cancel",
                },
                {
                  text: "Sync Now",
                  onPress: async () => {
                    setTotalProgress(
                      unsyncedCheckouts.length + unsyncedAdvanced.length || 1
                    );
                    setIsProgressEnabled(true);

                    await syncToOnlineServer(
                      unsyncedCheckouts,
                      unsyncedAdvanced,
                      setIsProgressEnabled
                    );
                    await getShips();
                    setIsProgressEnabled(false);
                    setTotalProgress(1);
                  },
                },
              ]
            );
          } else {
            Alert.alert(
              "You are not connected with WiFi",
              "Join Crew Mail WiFi",
              [
                {
                  text: "OK",
                  onPress: async () => {
                    __DEV__ && console.log("OK Pressed");
                  },
                },
              ]
            );
          }
        });
      }
    };

    if (isOnline) {
      await syncData();
      __DEV__ && console.log("yessss no");
    }
  };



  const uploadImagesIfAny = async (user, images = []) => {
    const validImages = images.filter(img => img && img !== '');
    if (!validImages.length) return [];

    const uploadPromises = validImages.map(image => {
      const fd = new FormData();
      fd.append('image', {
        name: 'image',
        type: 'image/jpeg',
        uri: image,
      });
      return uploadImg(user, fd);
    });

    const responses = await Promise.all(uploadPromises);
    return responses.map(r => r.image_url);
  };

  const syncToOnlineServer = async (
    unsyncedCheckouts,
    unsyncedAdvanced,
    setIsProgressEnabled
  ) => {
    try {
      setIsProgressEnabled(true);

      const customerCache = {};
      let progressCount = 0;

      /* ===========================
         SYNC CHECKOUTS
      ============================ */
      for (const [index, checkout] of unsyncedCheckouts.entries()) {
        const {
          id,
          sign,
          packagesId,
          selectedStatus,
          notes,
          notification,
          totalAmount,
          cashReceived,
          user_id,
          payment_method,
          direct_discount,
          imageOne,
          imageTwo,
          imageThree,
          email,
        } = checkout;

        const parsedPackageIds = JSON.parse(packagesId);

        const imgData = new FormData();

        if (sign) {
          imgData.append('signature', {
            name: 'image',
            type: 'image/jpeg',
            uri: sign,
          });
        }

        imgData.append('ids', parsedPackageIds);
        imgData.append('current_status', parseInt(selectedStatus));
        imgData.append('notes', notes);
        imgData.append('notification', notification);

        const imageUrls = await uploadImagesIfAny(user, [
          imageOne,
          imageTwo,
          imageThree,
        ]);

        if (imageUrls.length) {
          imgData.append('images', imageUrls);
        }

        const logoutResponse = await bulkPackageLogout(user, imgData);

        if (logoutResponse === '400') {
          Alert.alert(
            "Couldn't Connect",
            'There may be a problem with the server.'
          );
          return;
        }

        if (cashReceived) {
          await cashReceivedDetails(user, {
            amount: totalAmount?.toString() || 0,
            user_id: parseInt(user_id),
            payment_method,
            direct_discount,
          });
        }

        if (!customerCache[user_id]) {
          customerCache[user_id] = await customerListApi(user_id);
        }

        if (email && customerCache[user_id]?.[0]) {
          await customerListApiUpdate(
            user,
            customerCache[user_id][0].id,
            { email }
          );
        }

        if (notification) {
          await sendEmail(user, {
            ids: parsedPackageIds,
            package_status: selectedStatus,
          });
        }

        await Checkout.markRecordAsSynced(id);

        progressCount++;
        if (progressCount % 3 === 0) {
          setProgress(progressCount);
        }
      }

      /* ===========================
         ADVANCED FORMS
      ============================ */
      const addCustomerForms = unsyncedAdvanced.filter(
        f => f.category === 'addCustomer'
      );
      const otherForms = unsyncedAdvanced.filter(
        f => f.category !== 'addCustomer'
      );

      // ---- ADD CUSTOMER FIRST ----
      for (const form of addCustomerForms) {
        const { id, data } = form;
        const payload = {
          form_type: 'add_customer',
          name: data.name,
          email: data.email,
          phone: data.phone,
          ship_name: data.ship_name,
        };

        const res = await formSync(user, payload);
        if (res !== '400') {
          await AdvancedForms.markRecordAsSynced(id);
          progressCount++;
          setProgress(progressCount);
        }
      }

      // ---- OTHER FORMS ----
      for (const form of otherForms) {
        const { id, category, data } = form;
        let payload = null;
        let imageUrls = [];

        switch (category) {
          case 'return':
            imageUrls = await uploadImagesIfAny(user, [
              data.image1,
              data.image2,
            ]);
            payload = {
              form_type: 'returns',
              email: data.email,
              customer_name: data.name,
              tracking_no: data.trackingNo,
              ship_name: data.ship_name,
              package_type: data.type.toString(),
              notes: data.notes,
              payment_received: data.payment_received,
              ...(imageUrls.length && { images: imageUrls }),
            };
            break;

          case 'deposit':
            imageUrls = await uploadImagesIfAny(user, [
              data.image1,
              data.image2,
            ]);
            payload = {
              form_type: 'deposit',
              email: data.email,
              customer_name: data.name,
              amount: parseInt(data.amount),
              ...(data.reason && { reason: data.reason }),
              ship_name: data.ship_name,
              ...(imageUrls.length && { images: imageUrls }),
            };
            break;

          case 'refund':
            payload = {
              form_type: 'refund',
              email: data.email,
              amount: parseInt(data.amount),
              ...(data.reason && { reason: data.reason }),
              refund_method: data.refund_method,
              ship_name: data.ship_name,
              ...(data.phone && { phone: data.phone }),
            };
            break;

          case 'storage':
            imageUrls = await uploadImagesIfAny(user, [
              data.image1,
              data.image2,
            ]);
            payload = {
              form_type: 'storage',
              customer_name: data.name,
              email: data.email,
              phone: data.phone,
              total_months: parseInt(data.total),
              pickup_return_date: data.returnDate?.split('T')[0],
              notes: data.notes,
              ship_name: data.ship_name,
              package_type: "10",
              tracking_no: data.trackingNo,
              ...(imageUrls.length && { images: imageUrls }),
            };
            break;

          case 'shipToShip':
            imageUrls = await uploadImagesIfAny(user, [
              data.image1,
              data.image2,
            ]);
            payload = {
              form_type: 'ship_to_ship',
              email: data.email,
              customer_name: data.name,
              tracking_no: data.trackingNo,
              crew_member_receiving: data.crewMemberEmail,
              recipient_name: data.crewMemberName,
              package_type: data.type.toString(),
              ship_name: data.ship_name,
              ship_to: data.ship_to,
              sender_paid_full: data.senderPaidFull,
              payment_method: '1',
              ...(data.paidAmount && { paid_amount: data.paidAmount }),
              ...(data.notes && { notes: data.notes }),
              ...(imageUrls.length && { images: imageUrls }),
            };
            break;

          case 'shipPackage':
            const imgs =
              data.packageType === 'international'
                ? [data.internationalImage1, data.internationalImage2]
                : [data.domesticImage1, data.domesticImage2];

            imageUrls = await uploadImagesIfAny(user, imgs);

            payload = {
              form_type:
                data.packageType === 'international'
                  ? 'ship_package_intl'
                  : 'ship_package_local',
              email: data.email,
              customer_name: data.name,
              tracking_no: data.trackingNo,
              ship_name: data.ship_name,
              package_type: parseInt(9),
              ...(imageUrls.length && { images: imageUrls }),
              package_details:
                data.packageType === 'international'
                  ? {
                    contents: data.contents,
                    value: data.value,
                    country_of_manufacture: data.country,
                  }
                  : {
                    address1: data.address1,
                    city: data.city,
                    state: data.state,
                    zip_code: data.zip,
                  },
              notes:
                data.packageType === 'international'
                  ? data.internationalNotes
                  : data.domesticNotes,
            };
            break;
        }

        if (payload) {
          const res = await formSync(user, payload);
          if (res !== '400') {
            await AdvancedForms.markRecordAsSynced(id);
            progressCount++;
            setProgress(progressCount);
          }
        }
      }

      await AdvancedForms.deleteSyncedRecords();

      Alert.alert('Sync Successful', 'Data synced successfully');
    } catch (error) {
      console.log('Sync Error:', error);
      Alert.alert('Sync Error', 'Please try again later.');
    } finally {
      setProgress(0);
      setTotalProgress();
      setIsProgressEnabled(false);
    }
  };

  const customerListApi = async (user_id) => {
    const customerList = await getCustomerList(user, user_id);
    __DEV__ && console.log('customerList', customerList)
    return customerList;
  };

  function getShipNameById(shipArray, shipId) {
    const foundShip = shipArray.find((ship) => ship.id === shipId);
    if (foundShip) {
      return foundShip.name;
    } else {
      return null;
    }
  }

  const initializeDatabase = async () => {
    setDbPackages([]);
    await Checkout.createTable();
    await Package.createTable();
    await PackageImage.createTable();
    await PackageTracking.createTable();
    await PackageType.createTable();
    await Ship.createTable();
    await User.createTable();
    await CustomerList.createTable();
    await deletedPackage.createTable();
    await AdvancedForms.createTable();

    const dbShipResponse = await Ship.getAllShips();

    let dbPackagesResponse;

    if (selectedShipIdDB) {
      dbPackagesResponse = await Package.getPackagesByShipId(
        selectedShipIdDB.id
      );

      // __DEV__ && console.log("dbPackagesResponse", dbPackagesResponse);
    } else {
      dbPackagesResponse = await Package.getAllPackages();
    }

    const packagesWithShipName = await Promise.all(
      dbPackagesResponse.map(async (packagedata) => {
        try {
          const shipName = await getShipNameById(
            dbShipResponse,
            packagedata.ship_id
          );
          const images = await PackageImage.getPackageImagesById(
            packagedata.id
          );

          const user = await User.getUserById(packagedata.user_id);
          const package_type = await PackageType.getPackageTypeById(
            packagedata.packagetype
          );
          const _search = `${packagedata.tracking_no || ''} ${packagedata.carrier || ''} ${user?.first_name || ''} ${user?.last_name || ''} ${shipName || ''} ${package_type?.name || ''}`.toLowerCase();
          return {
            ...packagedata,
            ship_name: shipName,
            images,
            user,
            package_type,
            _search,
          };
        } catch (error) {
          console.error("Error processing package data:", error);
          throw error;
        }
      })
    );

    setDbPackages(packagesWithShipName);
    setDbPackagesReset(packagesWithShipName);
    setDbShips(dbShipResponse);
  };



  const sortPackagesByFirstName = (packages, sortingOrder = true) => {
    return [...packages].sort((a, b) => {
      const firstNameA = a?.user?.first_name?.toUpperCase() || ""; // Handle undefined/null values
      const firstNameB = b?.user?.first_name?.toUpperCase() || "";

      if (firstNameA > firstNameB) {
        return sortingOrder ? 1 : -1; // Ascending or Descending
      } else if (firstNameA < firstNameB) {
        return sortingOrder ? -1 : 1; // Ascending or Descending
      }
      return 0;
    });
  };

  useEffect(() => {
    initializeDatabase();
  }, [selectedShipIdDB, isOnline]);

  const FilterPackages = (text) => {
    setSearchInDB(text);

    if (text.trim() === "") {
      setDbPackages(dbPackagesReset);
    } else {
      const searchValue = text.toLowerCase();
      const filteredPackages = dbPackagesReset.filter((packageData) => {
        return packageData._search && packageData._search.includes(searchValue);
      });
      setDbPackages(filteredPackages);
    }
  };

  const setupDBPackages = async (
    user,
    shipId,
    setIsProgressOn,
    setIsLoadingData
  ) => {
    // Show confirmation alert
    Alert.alert(
      "Download Data",
      "Are you sure you want to download?",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => setIsProgressOn(false),
        },
        {
          text: "Yes",
          onPress: async () => {
            try {
              await deleteDataRelatedToShip(shipId);
              setIsLoadingData(true);
              const response = await getPackagesForDbSetup(user, shipId, 10210);

              if (!response?.results?.length) {
                Alert.alert("No packages available for download.");
                return;
              }
              setIsLoadingData(false);
              __DEV__ && console.log("response.results", response.results);
              setTotalProgress(response.results.length);
              await setIsProgressOn(true);
              await syncPackages(response.results, progress, setProgress, user);
              await setIsProgressOn(false);

              await initializeDatabase();

              Alert.alert("Success", "Download Completed");
            } catch (error) {
              __DEV__ && console.log("Error syncing packages:", error);
              Alert.alert("Download failed");
            } finally {
              setTotalProgress();
              setProgress(0);
              setIsProgressOn(false);
              setIsLoadingData(false);
            }
          },
        },
      ],
      { cancelable: false }
    );
  };

  const deleteDataRelatedToShip = async (shipId) => {
    try {
      const extractedShipId = shipId.replace(/\D/g, "");
      const allPackages = await Package.getAllPackages();

      if (allPackages) {
        const packageIdsToDelete = allPackages
          .filter((pkg) => pkg.ship_id.toString() === extractedShipId)
          .map((pkg) => pkg.id);
        for (const packageId of packageIdsToDelete) {
          await Package.deletePackage(packageId);
        }
      }

      return true;
    } catch (error) {
      console.error("Error deleting packages:", error);
      return false;
    }
  };

  const toggleMode = async () => {
    const netInfoState = await NetInfo.fetch();
    const online =
      netInfoState.isConnected === true &&
      netInfoState.isInternetReachable !== false;

      console.log('NetInfo State:', {
  isConnected: netInfoState.isConnected,
  isInternetReachable: netInfoState.isInternetReachable,
  type: netInfoState.type,
});
    if (online) {
      setIsOnline((prevMode) => !prevMode);

      const dbShipResponse = await Ship.getAllShips();
      let dbPackagesResponse;

      if (selectedShipIdDB) {
        dbPackagesResponse = await Package.getPackageById(selectedShipIdDB);
      } else {
        dbPackagesResponse = await Package.getAllPackages();
      }

      const packagesWithShipName = await Promise.all(
        dbPackagesResponse.map(async (packagedata) => {
          try {
            const shipName = await getShipNameById(
              dbShipResponse,
              packagedata.ship_id
            );
            const images = await PackageImage.getPackageImagesById(
              packagedata.id
            );
            const user = await User.getUserById(packagedata.user_id);
            const package_type = await PackageType.getPackageTypeById(
              packagedata.packagetype
            );
            const _search = `${packagedata.tracking_no || ''} ${packagedata.carrier || ''} ${user?.first_name || ''} ${user?.last_name || ''} ${shipName || ''} ${package_type?.name || ''}`.toLowerCase();
            return {
              ...packagedata,
              ship_name: shipName,
              images,
              user,
              package_type,
              _search,
            };
          } catch (error) {
            console.error("Error processing package data:", error);
            throw error;
          }
        })
      );
      setDbPackages(packagesWithShipName);
      setDbPackagesReset(packagesWithShipName);
      setDbShips(dbShipResponse);
      FilterPackages("");
      setSortingOrder("");
    } else {
      setIsOnline(false);
      Alert.alert(
        "Offline Mode",
        "Toggle is not possible because you are not online."
      );
    }
    await initializeDatabase();
  };

  const ProgressBar = () => (
    <ProgressBarComponent progress={progress} totalprogress={totalProgress} />
  );

  const CheckoutProgressBar = () => {
    return (
      <ProgressBarSyncCheckouts
        checkoutProgress={progress}
        totalCheckouts={totalProgress}
      />
    );
  };

  const contextValue = {
    isOnline,
    setIsOnline,
    toggleMode,
    setupDBPackages,
    loading,
    dbPackages,
    dbShips,
    selectedShipIdDB,
    setSelectedShipIdDB,
    searchInDB,
    setSearchInDB,
    FilterPackages,
    SyncUnsynched,
    initializeDatabase,
    isDownloadEnabled,
    setIsDownloadEnabled,
    totalProgress,
    progress,
    ProgressBar,
    checkAllDbPackages,
    clearSelectedDbPackages,
    selcetDbAllCheck,
    setSelectDbAllCheck,
    selcetDBAllSearchCheck,
    setSelectDBAllSearchCheck,
    sortPackagesByFirstName,
    modalVisible,
    setModalVisible,
    sortingOrder,
    setSortingOrder,
    CheckoutProgressBar,
  };

  return (
    <ModeContext.Provider value={contextValue}>{children}</ModeContext.Provider>
  );
};

export const useMode = () => {
  const context = useContext(ModeContext);
  if (!context) {
    throw new Error("useMode must be used within an OfflineModeProvider");
  }
  return context;
};


