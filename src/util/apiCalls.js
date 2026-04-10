import axios from "axios";
// import { REACT_APP_BASE_URL } from "@env";

export var Backend_URL =
  'https://app.crewmailservices.com/api';
  // "https://stage-app.crewmailservices.com/api";

__DEV__ && console.log({ Backend_URL });

export const getShipList = async (user) => {
  const res = await axios.get(Backend_URL + "/ships", {
    headers: { Authorization: "Bearer " + user?.token },
  });

  return res.data.results;
};

export const getRecipient = async (user) => {
  const res = await axios.get(Backend_URL + "/customers", {
    headers: { Authorization: "Bearer " + user?.token },
  });

  return res.data.results;
};

export const getcarriers = async (user) => {
  const res = await axios.get(Backend_URL + "/carriers", {
    headers: { Authorization: "Bearer " + user?.token },
  });

  return res.data.results;
};

export const getConditions = async (user) => {
  const res = await axios.get(Backend_URL + "/package_conditions", {
    headers: { Authorization: "Bearer " + user?.token },
  });

  return res.data.results;
};

export const getPackageTypes = async (user) => {
  const res = await axios.get(Backend_URL + "/package_types", {
    headers: { Authorization: "Bearer " + user?.token },
  });

  return res.data.results;
};

export const getDepartments = async (user) => {
  const res = await axios.get(Backend_URL + "/departments", {
    headers: { Authorization: "Bearer " + user?.token },
  });

  return res.data.results;
};

export const postPackage = async (user, packages) => {
  const res = await axios.post(Backend_URL + "/create-package", packages, {
    headers: { Authorization: "Bearer " + user?.token },
  });

  return res.data;
};

export const uploadImg = async (user, file) => {
  __DEV__ && console.log("Uploading image...");

  if (!user?.token) {
    console.error("Error: Missing user token");
    throw new Error("Authentication error: Missing user token");
  }

  if (!file) {
    console.error("Error: Missing file data");
    throw new Error("File upload error: No file data provided");
  }

  try {
    __DEV__ && console.log("user:", user);
    __DEV__ && console.log("file:", file);

    const res = await axios.post(`${Backend_URL}/upload-package-image`, file, {
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${user.token}`,
      },
    });

    __DEV__ && console.log("Image uploaded successfully:", res.data);
    return res.data;
  } catch (error) {
    if (error.response) {
      // Server responded with a status outside of the 2xx range
      console.error("Server Error:", error.response.data);
      console.error("Status Code:", error.response.status);
      console.error("Headers:", error.response.headers);
    } else if (error.request) {
      // Request was made, but no response received
      console.error("No response received from server:", error.request);
    } else {
      // Something else caused the error
      console.error("Error during image upload:", error.message);
    }

    console.error("Error configuration:", error.config);
    throw new Error(
      "Failed to upload image. Please check the logs for details.",
    );
  }
};

export const deleteImg = async (user, fileName) => {
  try {
    const res = await axios.delete(
      Backend_URL + `/delete-package-image?image_name=${fileName}`,
      {
        headers: {
          Authorization: "Bearer " + user?.token,
        },
      },
    );
    return res.data;
  } catch (error) {
    //Error Handling
  }
};

export const recipientSearchApi = async (user, keyword) => {
  try {
    const res = await axios.get(`${Backend_URL}/customers?keyword=${keyword}`, {
      headers: {
        Authorization: "Bearer " + user?.token,
      },
    });
    return res.data.results;
  } catch (error) {
    //Error Handling
  }
};

export const updatePackage = async (user, data) => {
  __DEV__ && console.log("user", user);
  try {
    const res = await axios.post(Backend_URL + "/update-package", data, {
      headers: { Authorization: "Bearer " + user?.token },
    });

    return res.data;
  } catch (e) {
    return "400";
  }
};

export const filterSortPackages = async (user, params) => {
  __DEV__ &&
    console.log(
      "saqsas filrer serch packagesss==============",
      Backend_URL + "/packages" + params,
    );
  __DEV__ && console.log("user?.token", user?.token);
  try {
    const res = await axios.get(Backend_URL + "/packages" + params, {
      headers: {
        Authorization: "Bearer " + user?.token,
      },
    });
    return res.data;
  } catch (e) {
    return "400";
  }
};

export const getPackagesForDbSetup = async (
  user,
  shipId,
  current_status,
  limit = 1000,
) => {
  console.log("current_status", current_status);
  try {
    const params = `${shipId}&limit=${limit}&&current_status=${current_status}`;
    console.log("`Bearer ${user?.token}`", `Bearer ${user?.token}`);
    __DEV__ &&
      console.log(
        "loded for delhiveryyyyyyy------------------------",
        `${Backend_URL}/packages${params}`,
      );
    const res = await axios.get(`${Backend_URL}/packages${params}`, {
      headers: {
        Authorization: `Bearer ${user?.token}`,
      },
    });
    return res.data;
  } catch (e) {
    return "400";
  }
};

export const bulkPackageLogout = async (user, data) => {
  try {
    const res = await axios.post(Backend_URL + "/bulk-package-logout", data, {
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: "Bearer " + user?.token,
      },
    });

    return res.data;
  } catch (e) {
    return "400";
  }
};

export const getCustomerList = async (user, customerId) => {
  try {
    const res = await axios.get(Backend_URL + "/customer/" + customerId + "/", {
      headers: { Authorization: "Bearer " + user?.token },
    });
    return res.data;
  } catch (e) {
    return "400";
  }
};

export const cashReceivedDetails = async (user, data) => {
  try {
    const res = await axios.post(Backend_URL + "/payment-details-cash", data, {
      headers: { Authorization: "Bearer " + user?.token },
    });

    return res.data;
  } catch (e) {
    return "400";
  }
};

export const customerListApiUpdate = async (user, id, data) => {
  try {
    const res = await axios.put(Backend_URL + "/customer/" + id + "/", data, {
      headers: { Authorization: "Bearer " + user?.token },
    });
    return res.data;
  } catch (e) {
    return "400";
  }
};

export const sendEmail = async (user, data) => {
  __DEV__ && console.log("user?.token", user?.token);
  __DEV__ && console.log("data", data);
  try {
    const res = await axios.post(Backend_URL + "/send_email", data, {
      headers: { Authorization: "Bearer " + user?.token },
    });

    __DEV__ && console.log("sendEmail res", res);

    return res;
  } catch (err) {
    __DEV__ && console.log("sendEmail err", err);
    return `${err} "400"`;
  }
};

export const formSync = async (user, data) => {
  __DEV__ && console.log("user", user);
  __DEV__ && console.log("data", data);
  __DEV__ && console.log("Backend_URL", Backend_URL);
  try {
    const res = await axios.post(Backend_URL + "/form-sync/", data, {
      headers: {
        Authorization: "Bearer " + user?.token,
        "Content-Type": "application/json",
      },
    });

    return res.data;
  } catch (e) {
    console.error("formSync error:", e.response?.data || e.message);
    return "400";
  }
};

/**
 * Get logged today details with packages
 * @param {Object} user - User object with token
 * @returns {Promise} Object with time_spent, time_range, packages_logged, and packages array
 */
export const getLoggedToday = async (user) => {
  try {
    const res = await axios.get(Backend_URL + "/logged-today-details", {
      headers: { Authorization: "Bearer " + user?.token },
    });
    __DEV__ && console.log("loggeddd todayyyy responseeeeeeee------", res.data);
    return res.data;
  } catch (error) {
    console.error("getLoggedToday error:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Get total received details with user statistics
 * @param {Object} user - User object with token
 * @returns {Promise} Object with total_packages and users array
 */
export const getTotalReceived = async (user) => {
  try {
    const res = await axios.get(Backend_URL + "/total-received-details", {
      headers: { Authorization: "Bearer " + user?.token },
    });
    __DEV__ && console.log("total received responseeeeeeee------", res.data);
    return res.data;
  } catch (error) {
    console.error("getTotalReceived error:", error.response?.data || error.message);
    throw error;
  }
};