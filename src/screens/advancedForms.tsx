import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Image,
  FlatList,
  Alert,
  Animated,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import DatePicker from 'react-native-date-picker';
import { COLORS, FONTS, IMAGES } from "../assets";
import Tabs from "../components/Tabs";
import CommonInput from "../components/CommonInput";
import CountryCodePicker from "../components/CountryCodePicker";
import { open } from "../components/CameraController";
import ImagePickerField from "../components/ImagePickerField";
import { isIPad } from "../utilities/securestorage";
import { AdvancedForms as AdvancedFormsDB } from "../db/db.crud";

interface CustomerInfo {
  name: string;
  email: string;
  ship_name: string;
}

interface ReturnForm {
  amount: string;
  trackingNo: string;
  type: number;
  image1: string;
  image2: string;
  notes: string;
  senderPaidFull: boolean;
  synced: boolean;
}

interface ShipPackageForm {
  packageType: "international" | "domestic";
  contents: string;
  value: string;
  country: string;
  internationalImage1: string;
  internationalImage2: string;
  domesticImage1: string;
  domesticImage2: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  type: number;
  trackingNo: string;
  internationalNotes: string;
  domesticNotes: string;
  synced: boolean;
}

interface ShipToShipForm {

  crewMemberEmail: string;
  crewMemberName: string;
  amount: string;
  trackingNo: string;
  type: number;
  ship_to: string;
  image1: string;
  image2: string;
  notes: string;
  senderPaidFull: boolean;
  synced: boolean;
  paidAmount: string;
}

interface StorageForm {
  phone: string;
  total: string;
  returnDate: string;
  trackingNo: string;
  notes: string;
  image1: string;
  image2: string;
  synced: boolean;
}

interface DepositForm {
  amount: string;
  reason: string;

  image1: string;
  image2: string;
  synced: boolean;
}

interface RefundForm {
  amount: string;
  reason: string;
  phone: string;
  image1: string;
  image2: string;
  paymentMethod: "cash" | "credit";
  synced: boolean;
}

interface AddCustomerForm {
  ship: string;
  phone: string;
  countryCode: string;
  synced: boolean;
}

const packageTypes = [
  { "id": 1, "name": "Standard: <15lbs, <45in", "price": "6.00" },
  { "id": 2, "name": "Large: 16-25lbs, 46-60in", "price": "12.00" },
  { "id": 3, "name": "X-Large: 26-40lbs, 61-75in", "price": "18.00" },
  { "id": 4, "name": "XX-Large: 41-60lbs, 76-90in", "price": "24.00" },
];

const packageTypesReturn = [
  { "id": 1, "name": "Standard: <15lbs, <45in", "price": "6.00" },
  { "id": 2, "name": "Large: 16-25lbs, 46-60in", "price": "12.00" },
  { "id": 3, "name": "X-Large: 26-40lbs, 61-75in", "price": "18.00" },
  { "id": 4, "name": "XX-Large: 41-60lbs, 76-90in", "price": "24.00" },
  { "id": 6, "name": "Pickup/ Dropoff Local", "price": "15.00" }
];
const actions = [
  { key: "addCustomer", name: "Add Customer", image: IMAGES.AddCustomer },
  { key: "deposit", name: "Deposit", image: IMAGES.Deposit },
  { key: "return", name: "Return", image: IMAGES.Return },
  { key: "shipPackage", name: "Ship Package", image: IMAGES.ShipPackage },
  { key: "shipToShip", name: "Ship To Ship", image: IMAGES.ShipToShip },
  { key: "storage", name: "Storage", image: IMAGES.Storage },
  { key: "refund", name: "Refund", image: IMAGES.Refund },

];

const AdvancedForms = ({ navigation }: { navigation: any }) => {
  const [selected, setSelected] = useState("addCustomer");

  // Function to check if the current form has unsaved changes
  const hasUnsavedChanges = () => {
    switch (selected) {
      case "return":
        return (
          returnForm.amount.trim() ||
          returnForm.trackingNo.trim() ||
          returnForm.image1.trim() ||
          returnForm.image2.trim() ||
          returnForm.notes.trim()
        );

      case "shipPackage":
        return (
          shipPackageForm.contents.trim() ||
          shipPackageForm.value.trim() ||
          shipPackageForm.country.trim() ||
          shipPackageForm.internationalImage1.trim() ||
          shipPackageForm.internationalImage2.trim() ||
          shipPackageForm.domesticImage1.trim() ||
          shipPackageForm.domesticImage2.trim() ||
          shipPackageForm.address1.trim() ||
          shipPackageForm.address2.trim() ||
          shipPackageForm.city.trim() ||
          shipPackageForm.state.trim() ||
          shipPackageForm.zip.trim() ||
          shipPackageForm.internationalNotes.trim() ||
          shipPackageForm.domesticNotes.trim()
        );

      case "shipToShip":
        return (
          shipToShipForm.crewMemberEmail.trim() ||
          shipToShipForm.crewMemberName.trim() ||
          shipToShipForm.amount.trim() ||
          shipToShipForm.ship_to.trim() ||
          shipToShipForm.image1.trim() ||
          shipToShipForm.image2.trim() ||
          shipToShipForm.notes.trim()
        );

      case "storage":
        return (
          storageForm.phone.trim() ||
          storageForm.total.trim() ||
          storageForm.returnDate.trim() ||
          storageForm.trackingNo.trim() ||
          storageForm.notes.trim() ||
          storageForm.image1.trim() ||
          storageForm.image2.trim()
        );

      case "deposit":
        return (
          depositForm.amount.trim() ||
          depositForm.reason.trim() ||
          depositForm.image1.trim() ||
          depositForm.image2.trim()
        );

      case "refund":
        return (
          refundForm.amount.trim() ||
          refundForm.reason.trim() ||
          refundForm.phone.trim() ||
          refundForm.image1.trim() ||
          refundForm.image2.trim()
        );

      case "addCustomer":
        return (
          addCustomerForm.ship.trim() ||
          addCustomerForm.phone.trim()
        );

      default:
        return false;
    }
  };

  // Handle tab selection with confirmation if there are unsaved changes
  const handleTabSelect = (key: string) => {
    if (key !== selected && hasUnsavedChanges()) {
      Alert.alert(
        "Exit Confirmation",
        "Are you sure you want to exit? You have not submitted this form.",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Exit",
            style: "destructive",
            onPress: () => setSelected(key),
          },
        ]
      );
    } else {
      setSelected(key);
    }
  };

  const [imageLoading, setImageLoading] = useState(0);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [customAlert, setCustomAlert] = useState<{
    visible: boolean;
    type: "success" | "error";
    message: string;
  }>({
    visible: false,
    type: "success",
    message: "",
  });

  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: "",
    email: "",
    ship_name: "",
  });

  const [returnForm, setReturnForm] = useState<ReturnForm>({
    amount: "",
    trackingNo: "",
    type: 0,
    image1: "",
    image2: "",
    notes: "",
    senderPaidFull: false,
    synced: false,
  });

  const [shipPackageForm, setShipPackageForm] = useState<ShipPackageForm>({
    packageType: "international",
    contents: "",
    value: "",
    country: "",
    internationalImage1: "",
    internationalImage2: "",
    domesticImage1: "",
    domesticImage2: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    zip: "",
    type: 0,
    trackingNo: "TBD",
    internationalNotes: "",
    domesticNotes: "",
    synced: false,
  });

  const [shipToShipForm, setShipToShipForm] = useState<ShipToShipForm>({
    paidAmount: "",
    crewMemberEmail: "",
    crewMemberName: "",
    amount: "",
    ship_to: "",
    trackingNo: "N/A",
    type: 0,
    image1: "",
    image2: "",
    notes: "",
    senderPaidFull: false,
    synced: false,
  });

  const [storageForm, setStorageForm] = useState<StorageForm>({
    phone: "",
    total: "",
    returnDate: "",
    trackingNo: "",
    notes: "",
    image1: "",
    image2: "",
    synced: false,
  });

  const [depositForm, setDepositForm] = useState<DepositForm>({
    amount: "",
    reason: "",
    image1: "",
    image2: "",
    synced: false,
  });

  const [refundForm, setRefundForm] = useState<RefundForm>({
    amount: "",
    reason: "",
    phone: "",
    image1: "",
    image2: "",
    paymentMethod: "cash",
    synced: false,
  });

  const [addCustomerForm, setAddCustomerForm] = useState<AddCustomerForm>({
    ship: "",
    phone: "",
    countryCode: "+1",
    synced: false,
  });

  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showPackageTypeDropdown, setShowPackageTypeDropdown] = useState(false);
  const [showReturnTypeDropdown, setShowReturnTypeDropdown] = useState(false);
  const [showStorageTypeDropdown, setShowStorageTypeDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showShipDropdown, setShowShipDropdown] = useState(false);
  const [showShipToShipDropdown, setShowShipToShipDropdown] = useState(false);
  const [showReturnShipDropdown, setShowReturnShipDropdown] = useState(false);
  const [showCustomerShipDropdown, setShowCustomerShipDropdown] = useState(false);

  const [submittedData, setSubmittedData] = useState<any>({});
  const [tableData, setTableData] = useState<any[]>([]);
  const [shipList, setShipList] = useState<any>(null);

  useEffect(() => {
    fetchTableData("all"); // Always fetch all records
  }, [selected]);
  // __DEV__ && console.log('shipList', shipList)

  useEffect(() => {
    const getShipList = async () => {
      const storedData = await AsyncStorage.getItem('shipList');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        __DEV__ && console.log('ShipList from AsyncStorage:', parsedData);
        setShipList(parsedData);
      }
    };
    getShipList();
  }, []);

  // Auto-populate amount when type changes for return form
  useEffect(() => {
    if (returnForm.type) {
      const selectedType = packageTypesReturn.find(pt => pt.id === returnForm.type);
      if (selectedType) {
        setReturnForm(prev => ({ ...prev, amount: selectedType.price }));
      }
    }
  }, [returnForm.type]);

  // Auto-populate email from customer info for return form
  useEffect(() => {
    if (customerInfo.email) {
      setReturnForm(prev => ({ ...prev, email: customerInfo.email }));
    }
  }, [customerInfo.email]);

  // Auto-populate amount when type changes for shipToShip form
  useEffect(() => {
    if (shipToShipForm.type) {
      const selectedType = packageTypes.find(pt => pt.id === shipToShipForm.type);
      if (selectedType) {
        const basePrice = parseFloat(selectedType.price);
        const finalAmount = shipToShipForm.senderPaidFull ? basePrice * 2 : basePrice;
        setShipToShipForm(prev => ({ ...prev, amount: finalAmount.toString() }));
      }
    }
  }, [shipToShipForm.type, shipToShipForm.senderPaidFull]);

  __DEV__ && console.log('tableData', tableData)

  const handleFormSubmit = async (key: string, data: any) => {
    try {
      await AdvancedFormsDB.saveRecord({ category: key, data, Synced: false });
      setSubmittedData((prev: any) => ({ ...prev, [key]: data }));
      __DEV__ && console.log("Submitted:", { [key]: data });
      // Clear form data
      clearFormData(key);
      // Fetch updated data for all categories
      fetchTableData("all");
      // Show success message
      const formName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      // Alert.alert("Success", `${formName} form submitted successfully`);
      setCustomAlert({
        visible: true,
        type: "success",
        message: `${formName} form submitted successfully`,
      });
    } catch (error) {
      console.error("Error saving form data:", error);
    }
  };

  const clearFormData = (key: string) => {
    switch (key) {
      case "return":
        setReturnForm({
          amount: "",
          trackingNo: "",
          type: 0,
          image1: "",
          image2: "",
          notes: "",
          senderPaidFull: false,
          synced: false,
        });
        break;
      case "shipPackage":
        setShipPackageForm({
          packageType: "international",
          contents: "",
          value: "",
          country: "",
          internationalImage1: "",
          internationalImage2: "",
          domesticImage1: "",
          domesticImage2: "",
          address1: "",
          address2: "",
          city: "",
          state: "",
          zip: "",
          type: 0,
          trackingNo: "",
          internationalNotes: "",
          domesticNotes: "",
          synced: false,
        });
        break;
      case "shipToShip":
        setShipToShipForm({

          crewMemberEmail: "",
          crewMemberName: "",
          amount: "",
          ship_to: "",
          trackingNo: "",
          type: 0,
          image1: "",
          image2: "",
          notes: "",
          senderPaidFull: false,
          synced: false,
          paidAmount: "",
        });
        break;
      case "storage":
        setStorageForm({
          phone: "",
          total: "",
          returnDate: "",
          trackingNo: "",
          notes: "",
          image1: "",
          image2: "",
          synced: false,
        });
        break;
      case "deposit":
        setDepositForm({
          amount: "",
          reason: "",
          image1: "",
          image2: "",
          synced: false,
        });
        break;
      case "refund":
        setRefundForm({
          amount: "",
          reason: "",
          phone: "",
          image1: "",
          image2: "",
          paymentMethod: "cash",
          synced: false,
        });
        break;
      case "addCustomer":
        setAddCustomerForm({
          ship: "",
          phone: "",
          countryCode: "+1",
          synced: false,
        });
        break;
      default:
        break;
    }
  };

  const fetchTableData = async (category: string) => {
    try {
      if (category === "all") {
        // Fetch all records from all categories
        const records = await AdvancedFormsDB.getAllRecords();
        setTableData(records);
      } else {
        // Fetch records for specific category
        const records = await AdvancedFormsDB.getRecordsByCategory(category);
        setTableData(records);
      }
    } catch (error) {
      console.error("Error fetching table data:", error);
    }
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateAndSubmit = (key: string) => {
    // Check customerInfo
    if (!customerInfo.name.trim() || !customerInfo.email.trim() || !customerInfo.ship_name.trim()) {
      // Alert.alert("Error", "Customer info (Name, Email, and Ship Name) is required.");
      setCustomAlert({
        visible: true,
        type: "error",
        message: "Customer info (Name, Email, and Ship Name) is required.",
      });
      return;
    }
    if (!isValidEmail(customerInfo.email.trim())) {
      // Alert.alert("Error", "Please enter a valid email address.");
      setCustomAlert({
        visible: true,
        type: "error",
        message: "Please enter a valid email address.",
      });
      return;
    }

    let requiredFields: string[] = [];
    let formData: any;
    let requiresImages = false;
    let image1 = '', image2 = '';

    switch (key) {
      case "return":
        formData = returnForm;
        requiredFields = ["amount", "trackingNo"];
        requiresImages = true;
        image1 = returnForm.image1;
        image2 = returnForm.image2;
        break;
      case "shipPackage":
        formData = shipPackageForm;
        if (shipPackageForm.packageType === "international") {
          requiredFields = ["packageType", "contents", "value", "country", "trackingNo"];
          requiresImages = true;
          image1 = shipPackageForm.internationalImage1;
          image2 = shipPackageForm.internationalImage2;
        } else {
          requiredFields = ["packageType", "address1", "city", "state", "zip", "trackingNo"];
          requiresImages = true;
          image1 = shipPackageForm.domesticImage1;
          image2 = shipPackageForm.domesticImage2;
        }
        break;
      case "shipToShip":
        formData = shipToShipForm;
        requiredFields = ["crewMemberEmail", "crewMemberName", "trackingNo", "amount", "ship_to", "type", "notes"];
        // if (!shipToShipForm.senderPaidFull && !shipToShipForm.paidAmount.trim()) {
        //   Alert.alert("Error", "Please enter the amount the sender paid.");
        //   return;
        // }
        requiresImages = true;
        image1 = shipToShipForm.image1;
        image2 = shipToShipForm.image2;
        if (!isValidEmail(shipToShipForm.crewMemberEmail.trim())) {
          Alert.alert("Error", "Please enter a valid crew member email address.");
          return;
        }
        break;
      case "storage":
        formData = storageForm;
        requiredFields = ["phone", "total", "returnDate", "trackingNo", "notes"];
        requiresImages = true;
        image1 = storageForm.image1;
        image2 = storageForm.image2;
        break;
      case "deposit":
        formData = depositForm;
        requiredFields = ["amount"];
        requiresImages = false;
        break;
      case "refund":
        formData = refundForm;
        requiredFields = ["amount", "reason"];
        requiresImages = false;
        image1 = refundForm.image1;
        image2 = refundForm.image2;
        break;
      case "addCustomer":
        formData = addCustomerForm;
        requiredFields = ["phone"];
        requiresImages = false;
        // Combine country code with phone number
        const finalPhone = `${addCustomerForm.countryCode}${addCustomerForm.phone}`;
        formData = { ...addCustomerForm, phone: finalPhone };
        break;
      default:
        return;
    }

    // Check required fields
    for (const field of requiredFields) {
      if (!formData[field] || !formData[field].toString().trim()) {
        Alert.alert("Error", `Please fill all required fields for ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}.`);
        return;
      }
    }

    // Check images if required
    if (requiresImages) {
      if (!image1.trim() && !image2.trim()) {
        Alert.alert("Error", `At least one photo is required for ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}.`);
        return;
      }
    }


    // If all good, submit
    if (key === "return") {
      handleFormSubmit(key, { ...customerInfo, ...formData, payment_received: formData.senderPaidFull });
    } else if (key === "refund") {
      handleFormSubmit(key, { ...customerInfo, ...formData, refund_method: formData.paymentMethod });
    } else {
      handleFormSubmit(key, { ...customerInfo, ...formData });
    }
  };

  const offlineselectMedia = async (form: string, key: number) => {
    open(async (response: any) => {
      if (response.path) {
        setImageLoading(key);
        let path = response.path;
        if (Platform.OS === 'android' && !path.startsWith('file://')) {
          path = 'file://' + path;
        }
        const update = { [`image${key}`]: path };

        if (form === "return") {
          setReturnForm((prev) => ({ ...prev, ...update }));
        } else if (form === "shipPackage") {
          const field = shipPackageForm.packageType === "international" ? `internationalImage${key}` : `domesticImage${key}`;
          setShipPackageForm((prev) => ({ ...prev, [field]: path }));
        } else if (form === "shipToShip") {
          setShipToShipForm((prev) => ({ ...prev, ...update }));
        } else if (form === "storage") {
          setStorageForm((prev) => ({ ...prev, ...update }));
        } else if (form === "refund") {
          setRefundForm((prev) => ({ ...prev, ...update }));
        } else if (form === "deposit") {
          setDepositForm((prev) => ({ ...prev, ...update }));
        }
        setImageLoading(0);
      }
    });
  };

  const renderForm = () => {
    const currentAction = actions.find((a) => a.key === selected);
    switch (selected) {
      // ---------------- RETURN ----------------
      case "return":
        return (
          <View style={styles.formBox}>
            <View style={styles.titleContainer}>
              <Image source={currentAction!.image} style={styles.formIcon} />
              <Text style={styles.formTitle}>Return</Text>
            </View>
            <TouchableOpacity style={{ marginBottom: isIPad ? 24 : 18, position: "relative", paddingTop: 0 }} onPress={() => setShowReturnTypeDropdown(true)}>
              <Text style={{
                position: "absolute",
                left: 0,
                top: returnForm.type ? (isIPad ? -14 : -10) : (isIPad ? 20 : 14),
                fontSize: returnForm.type ? (isIPad ? 18 : 12) : (isIPad ? 20 : 14),
                color: returnForm.type ? "#223890" : "#999",
                fontWeight: "500",
              }}>Type</Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderBottomWidth: 1,
                  paddingVertical: isIPad ? 12 : 8,
                  borderColor: returnForm.type ? "#223890" : "#ccc",
                }}

              >
                <Text style={{ flex: 1, fontSize: isIPad ? 20 : 14, color: "#000", paddingBottom: 5 }}>{returnForm.type ? packageTypesReturn.find(pt => pt.id === returnForm.type)?.name : ''}</Text>
                <Image source={IMAGES.down_arrow} style={{ height: isIPad ? 20 : 12, width: isIPad ? 20 : 12 }} />
              </View>
            </TouchableOpacity>

            <CommonInput
              label={returnForm.amount ? "Amount" : "Amount*"}
              prefix="$"
              value={returnForm.amount}
              onChangeText={(t) => setReturnForm({ ...returnForm, amount: t })}
              keyboardType="numeric"
              editable={false}
            />
            <CommonInput
              label={returnForm.trackingNo ? "Tracking No." : "Tracking No.*"}
              value={returnForm.trackingNo}
              onChangeText={(t) => setReturnForm({ ...returnForm, trackingNo: t })}
            />
            <CommonInput
              label="Notes"
              value={returnForm.notes}
              multiline={true}
              onChangeText={(t) => setReturnForm({ ...returnForm, notes: t })}
            />
            <Text style={styles.sectionTitle}>Payment Was Received?</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={styles.radioOption}
                onPress={() =>
                  setReturnForm({
                    ...returnForm,
                    senderPaidFull: true,
                  })
                }
              >
                {returnForm.senderPaidFull ? (
                  <Image source={IMAGES.select} style={styles.radioCircle} />
                ) : (
                  <Image source={IMAGES.unSelect} style={styles.radioCircle} />
                )}
                <Text
                  style={[
                    styles.radioLabel,
                    returnForm.senderPaidFull &&
                    styles.radioLabelActive,
                  ]}
                >
                  Yes
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.radioOption}
                onPress={() =>
                  setReturnForm({
                    ...returnForm,
                    senderPaidFull: false,
                  })
                }
              >
                {!returnForm.senderPaidFull ? (
                  <Image source={IMAGES.select} style={styles.radioCircle} />
                ) : (
                  <Image source={IMAGES.unSelect} style={styles.radioCircle} />
                )}
                <Text
                  style={[
                    styles.radioLabel,
                    !returnForm.senderPaidFull &&
                    styles.radioLabelActive,
                  ]}
                >
                  No
                </Text>
              </TouchableOpacity>
            </View>

            <ImagePickerField
              images={{ image1: returnForm.image1, image2: returnForm.image2 }}
              setImages={(val) => setReturnForm({ ...returnForm, ...val })}
              imageLoading={imageLoading}
              isImageUploading={isImageUploading}
              offlineselectMedia={(key) => offlineselectMedia("return", key)}
            />
            {/* Submit button */}
            <TouchableOpacity
              style={styles.formSubmit}
              onPress={() => validateAndSubmit("return")}
            >
              <Text style={styles.formSubmitText}>Submit</Text>
            </TouchableOpacity>
          </View>
        );

      // ---------------- SHIP PACKAGE ----------------
      case "shipPackage":
        return (
          <View style={styles.formBox}>
            <View style={styles.titleContainer}>
              <Image source={currentAction!.image} style={styles.formIcon} />
              <Text style={styles.formTitle}>Ship Package</Text>
            </View>

            {/* Package Type Radio Buttons */}
            <Text style={styles.sectionTitle}>Package Type</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={styles.radioOption}
                onPress={() =>
                  setShipPackageForm({
                    ...shipPackageForm,
                    packageType: "international",
                  })
                }
              >
                {shipPackageForm.packageType === "international" ? (
                  <Image source={IMAGES.select} style={styles.radioCircle} />
                ) : (
                  <Image source={IMAGES.unSelect} style={styles.radioCircle} />
                )}
                <Text
                  style={[
                    styles.radioLabel,
                    shipPackageForm.packageType === "international" &&
                    styles.radioLabelActive,
                  ]}
                >
                  International
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.radioOption}
                onPress={() =>
                  setShipPackageForm({
                    ...shipPackageForm,
                    packageType: "domestic",
                  })
                }
              >
                {shipPackageForm.packageType === "domestic" ? (
                  <Image source={IMAGES.select} style={styles.radioCircle} />
                ) : (
                  <Image source={IMAGES.unSelect} style={styles.radioCircle} />
                )}
                <Text
                  style={[
                    styles.radioLabel,
                    shipPackageForm.packageType === "domestic" &&
                    styles.radioLabelActive,
                  ]}
                >
                  Domestic
                </Text>
              </TouchableOpacity>
            </View>

            {/* Conditional Fields */}
            {shipPackageForm.packageType === "international" && (
              <>
                <CommonInput
                  label={shipPackageForm.contents ? "Contents" : "Contents*"}
                  value={shipPackageForm.contents}
                  onChangeText={(t) =>
                    setShipPackageForm({ ...shipPackageForm, contents: t })
                  }
                />
                <CommonInput
                  label={shipPackageForm.value ? "Value" : "Value*"}
                  prefix="$"
                  value={shipPackageForm.value}
                  onChangeText={(t) =>
                    setShipPackageForm({ ...shipPackageForm, value: t })
                  }
                  keyboardType="numeric"
                />
                <CommonInput
                  label={shipPackageForm.country ? "Country of Manufacture" : "Country of Manufacture*"}
                  value={shipPackageForm.country}
                  onChangeText={(t) =>
                    setShipPackageForm({ ...shipPackageForm, country: t })
                  }
                />
                <CommonInput
                  label={shipPackageForm.trackingNo ? "Tracking No." : "Tracking No.*"}
                  value={shipPackageForm.trackingNo}
                  onChangeText={(t) =>
                    setShipPackageForm({ ...shipPackageForm, trackingNo: t })
                  }
                />
                {/* 
              <TouchableOpacity style={{marginBottom: isIPad ? 24 : 18, position: "relative", paddingTop: 0}}  onPress={() => setShowPackageTypeDropdown(true)}>
                <Text style={{
                  position: "absolute",
                  left: 0,
                  top: shipPackageForm.type ? (isIPad ? -14 : -10) : (isIPad ? 20 : 14),
                  fontSize: shipPackageForm.type ? (isIPad ? 18 : 12) : (isIPad ? 20 : 14),
                  color: shipPackageForm.type ? "#223890" : "#999",
                  fontWeight: "500",
                }}>Type</Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    borderBottomWidth: 1,
                    paddingVertical: isIPad ? 12 : 8,
                    borderColor: shipPackageForm.type ? "#223890" : "#ccc",
                  }}
                 
                >
                  <Text style={{flex: 1, fontSize: isIPad ? 20 : 14, color: "#000", paddingBottom: 5}}>{shipPackageForm.type ? packageTypes.find(pt => pt.id === shipPackageForm.type)?.name : ''}</Text>
                  <Image source={IMAGES.down_arrow} style={{height: isIPad ? 20 : 12, width: isIPad ? 20 : 12}} />
                </View>
              </TouchableOpacity>
            */}
                <CommonInput
                  label="Notes"
                  value={shipPackageForm.internationalNotes}
                  multiline={true}
                  onChangeText={(t) => setShipPackageForm({ ...shipPackageForm, internationalNotes: t })}
                />
                <ImagePickerField
                  images={{
                    image1: shipPackageForm.internationalImage1,
                    image2: shipPackageForm.internationalImage2,
                  }}
                  setImages={(val) => setShipPackageForm({ ...shipPackageForm, internationalImage1: val.image1 ?? shipPackageForm.internationalImage1, internationalImage2: val.image2 ?? shipPackageForm.internationalImage2 })}
                  imageLoading={imageLoading}
                  isImageUploading={isImageUploading}
                  offlineselectMedia={(key) =>
                    offlineselectMedia("shipPackage", key)
                  }
                />

              </>
            )}

            {shipPackageForm.packageType === "domestic" && (
              <>
                <CommonInput
                  label={shipPackageForm.address1 ? "Address 1" : "Address 1*"}
                  value={shipPackageForm.address1}
                  onChangeText={(t) =>
                    setShipPackageForm({ ...shipPackageForm, address1: t })
                  }
                />
                <CommonInput
                  label={shipPackageForm.address2 ? "Address 2" : "Address 2*"}
                  value={shipPackageForm.address2}
                  onChangeText={(t) =>
                    setShipPackageForm({ ...shipPackageForm, address2: t })
                  }
                />
                <CommonInput
                  label={shipPackageForm.city ? "City" : "City*"}
                  value={shipPackageForm.city}
                  onChangeText={(t) =>
                    setShipPackageForm({ ...shipPackageForm, city: t })
                  }
                />
                <CommonInput
                  label={shipPackageForm.state ? "State" : "State*"}
                  value={shipPackageForm.state}
                  onChangeText={(t) =>
                    setShipPackageForm({ ...shipPackageForm, state: t })
                  }
                />
                <CommonInput
                  label={shipPackageForm.zip ? "Zip Code" : "Zip Code*"}
                  value={shipPackageForm.zip}
                  onChangeText={(t) =>
                    setShipPackageForm({ ...shipPackageForm, zip: t })
                  }
                />
                <CommonInput
                  label={shipPackageForm.trackingNo ? "Tracking No." : "Tracking No.*"}
                  value={shipPackageForm.trackingNo}
                  onChangeText={(t) =>
                    setShipPackageForm({ ...shipPackageForm, trackingNo: t })
                  }
                />
                {/*  
              <TouchableOpacity style={{marginBottom: isIPad ? 24 : 18, position: "relative", paddingTop: 0}}  onPress={() => setShowPackageTypeDropdown(true)}>
                <Text style={{
                  position: "absolute",
                  left: 0,
                  top: shipPackageForm.type ? (isIPad ? -14 : -10) : (isIPad ? 20 : 14),
                  fontSize: shipPackageForm.type ? (isIPad ? 18 : 12) : (isIPad ? 20 : 14),
                  color: shipPackageForm.type ? "#223890" : "#999",
                  fontWeight: "500",
                }}>Type</Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    borderBottomWidth: 1,
                    paddingVertical: isIPad ? 12 : 8,
                    borderColor: shipPackageForm.type ? "#223890" : "#ccc",
                  }}
                 
                >
                  <Text style={{flex: 1, fontSize: isIPad ? 20 : 14, color: "#000", paddingBottom: 5}}>{shipPackageForm.type ? packageTypes.find(pt => pt.id === shipPackageForm.type)?.name : ''}</Text>
                  <Image source={IMAGES.down_arrow} style={{height: isIPad ? 20 : 12, width: isIPad ? 20 : 12}} />
                </View>
              </TouchableOpacity>
              */}
                <CommonInput
                  label="Notes"
                  value={shipPackageForm.domesticNotes}
                  multiline={true}
                  onChangeText={(t) => setShipPackageForm({ ...shipPackageForm, domesticNotes: t })}
                />
                <ImagePickerField
                  images={{
                    image1: shipPackageForm.domesticImage1,
                    image2: shipPackageForm.domesticImage2,
                  }}
                  setImages={(val) => setShipPackageForm({ ...shipPackageForm, domesticImage1: val.image1 ?? shipPackageForm.domesticImage1, domesticImage2: val.image2 ?? shipPackageForm.domesticImage2 })}
                  imageLoading={imageLoading}
                  isImageUploading={isImageUploading}
                  offlineselectMedia={(key) =>
                    offlineselectMedia("shipPackage", key)
                  }
                />

              </>
            )}

            {/* Submit button */}
            <TouchableOpacity
              style={styles.formSubmit}
              onPress={() => validateAndSubmit("shipPackage")}
            >
              <Text style={styles.formSubmitText}>Submit</Text>
            </TouchableOpacity>
          </View>
        );

      // ---------------- SHIP TO SHIP ----------------
      case "shipToShip":
        return (
          <View style={styles.formBox}>
            <View style={styles.titleContainer}>
              <Image source={currentAction!.image} style={styles.formIcon} />
              <Text style={styles.formTitle}>Ship To Ship</Text>
            </View>



            <CommonInput
              label={shipToShipForm.trackingNo ? "Tracking No." : "Tracking No.*"}
              value={shipToShipForm.trackingNo}
              onChangeText={(t) => setShipToShipForm({ ...shipToShipForm, trackingNo: t })}
            />

            <CommonInput
              label={shipToShipForm.crewMemberEmail ? "Recipient Email" : "Recipient Email*"}
              value={shipToShipForm.crewMemberEmail}
              onChangeText={(t) => setShipToShipForm({ ...shipToShipForm, crewMemberEmail: t })}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <CommonInput
              label={shipToShipForm.crewMemberName ? "Recipient Name" : "Recipient Name*"}
              value={shipToShipForm.crewMemberName}
              onChangeText={(t) => setShipToShipForm({ ...shipToShipForm, crewMemberName: t })}

            />
            <View style={{ marginBottom: isIPad ? 24 : 18, position: "relative", paddingTop: 0 }}>
              <Text style={{
                position: "absolute",
                left: 0,
                top: shipToShipForm.type ? (isIPad ? -14 : -10) : (isIPad ? 20 : 14),
                fontSize: shipToShipForm.type ? (isIPad ? 18 : 12) : (isIPad ? 20 : 14),
                color: shipToShipForm.type ? "#223890" : "#999",
                fontWeight: "500",
              }}>{shipToShipForm.type ? "Type" : "Type*"}</Text>
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderBottomWidth: 1,
                  paddingVertical: isIPad ? 12 : 8,
                  borderColor: shipToShipForm.type ? "#223890" : "#ccc",
                }}
                onPress={() => setShowTypeDropdown(true)}
              >
                <Text style={{ flex: 1, fontSize: isIPad ? 20 : 14, color: "#000", paddingBottom: 0 }}>{shipToShipForm.type ? packageTypes.find(pt => pt.id === shipToShipForm.type)?.name : ''}</Text>
                <Image source={IMAGES.down_arrow} style={{ height: isIPad ? 20 : 12, width: isIPad ? 20 : 12 }} />
              </TouchableOpacity>
            </View>
            <CommonInput
              label={shipToShipForm.amount ? "Amount" : "Amount*"}
              prefix="$"
              value={shipToShipForm.amount}
              onChangeText={(t) => setShipToShipForm({ ...shipToShipForm, amount: t })}
              keyboardType="numeric"
              editable={false}
            />
            <TouchableOpacity style={{ marginBottom: isIPad ? 24 : 18, position: "relative", paddingTop: 0 }} onPress={() => setShowShipToShipDropdown(true)}>
              <Text style={{
                position: "absolute",
                left: 0,
                top: shipToShipForm.ship_to ? (isIPad ? -14 : -10) : (isIPad ? 20 : 14),
                fontSize: shipToShipForm.ship_to ? (isIPad ? 18 : 12) : (isIPad ? 20 : 14),
                color: shipToShipForm.ship_to ? "#223890" : "#999",
                fontWeight: "500",
              }}>Ship Name{shipToShipForm.ship_to ? "" : "*"}</Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderBottomWidth: 1,
                  paddingVertical: isIPad ? 12 : 8,
                  borderColor: shipToShipForm.ship_to ? "#223890" : "#ccc",
                }}

              >
                <Text style={{ flex: 1, fontSize: isIPad ? 20 : 14, color: "#000", paddingBottom: 5 }}>{shipToShipForm.ship_to || ''}</Text>
                <Image source={IMAGES.down_arrow} style={{ height: isIPad ? 20 : 12, width: isIPad ? 20 : 12 }} />
              </View>
            </TouchableOpacity>



            <CommonInput
              label={shipToShipForm.notes ? "Notes" : "Notes*"}
              value={shipToShipForm.notes}
              multiline={true}
              onChangeText={(t) => setShipToShipForm({ ...shipToShipForm, notes: t })}
            />

            <Text style={styles.sectionTitle}>Has Sender Paid in Full?</Text>
            <View style={styles.radioGroup}>
              {/* YES OPTION */}
              <TouchableOpacity
                style={styles.radioOption}
                onPress={() =>
                  setShipToShipForm({
                    ...shipToShipForm,
                    senderPaidFull: true,
                    paidAmount: "" // Clear paidAmount if they change to "Yes"
                  })
                }
              >
                <Image
                  source={shipToShipForm.senderPaidFull ? IMAGES.select : IMAGES.unSelect}
                  style={styles.radioCircle}
                />
                <Text style={[styles.radioLabel, shipToShipForm.senderPaidFull && styles.radioLabelActive]}>
                  Yes
                </Text>
              </TouchableOpacity>

              {/* NO OPTION */}
              <TouchableOpacity
                style={styles.radioOption}
                onPress={() =>
                  setShipToShipForm({
                    ...shipToShipForm,
                    senderPaidFull: false,
                  })
                }
              >
                <Image
                  source={!shipToShipForm.senderPaidFull ? IMAGES.select : IMAGES.unSelect}
                  style={styles.radioCircle}
                />
                <Text style={[styles.radioLabel, !shipToShipForm.senderPaidFull && styles.radioLabelActive]}>
                  No
                </Text>
              </TouchableOpacity>
            </View>

            {/* Conditional Amount Field */}
            {!shipToShipForm.senderPaidFull && (
              <CommonInput
                label={shipToShipForm.paidAmount ? "Enter Paid Amount" : "Enter Paid Amount*"}
                prefix="$"
                value={shipToShipForm.paidAmount}
                onChangeText={(t) => setShipToShipForm({ ...shipToShipForm, paidAmount: t })}
                keyboardType="numeric"
              />
            )}

            <ImagePickerField
              images={{
                image1: shipToShipForm.image1,
                image2: shipToShipForm.image2,
              }}
              setImages={(val) => setShipToShipForm({ ...shipToShipForm, ...val })}
              imageLoading={imageLoading}
              isImageUploading={isImageUploading}
              offlineselectMedia={(key) => offlineselectMedia("shipToShip", key)}
            />

            <TouchableOpacity
              style={styles.formSubmit}
              onPress={() => validateAndSubmit("shipToShip")}
            >
              <Text style={styles.formSubmitText}>Submit</Text>
            </TouchableOpacity>
          </View>
        );

      // ---------------- STORAGE ----------------
      case "storage":
        return (
          <View style={styles.formBox}>
            <View style={styles.titleContainer}>
              <Image source={currentAction!.image} style={styles.formIcon} />
              <Text style={styles.formTitle}>Storage</Text>
            </View>

            <CommonInput
              label={storageForm.phone ? "Phone Number" : "Phone Number*"}
              value={storageForm.phone}
              onChangeText={(t) => setStorageForm({ ...storageForm, phone: t })}
              keyboardType="numeric"
            />
            <CommonInput
              label={storageForm.total ? "Total Months" : "Total Months*"}
              value={storageForm.total}
              onChangeText={(t) => setStorageForm({ ...storageForm, total: t })}
              keyboardType="numeric"
            />
            <CommonInput
              label={storageForm.trackingNo ? "Tracking No." : "Tracking No.*"}
              value={storageForm.trackingNo}
              onChangeText={(t) => setStorageForm({ ...storageForm, trackingNo: t })}
            />
            <TouchableOpacity
              style={{ marginBottom: isIPad ? 24 : 18, position: "relative", paddingTop: 0 }}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={{
                position: "absolute",
                left: 0,
                top: storageForm.returnDate ? (isIPad ? -14 : -10) : (isIPad ? 20 : 14),
                fontSize: storageForm.returnDate ? (isIPad ? 18 : 12) : (isIPad ? 20 : 14),
                color: storageForm.returnDate ? "#223890" : "#999",
                fontWeight: "500",
              }}>Return Date</Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderBottomWidth: 1,
                  paddingVertical: isIPad ? 12 : 8,
                  borderColor: storageForm.returnDate ? "#223890" : "#ccc",
                }}
              >
                <Text style={{ flex: 1, fontSize: isIPad ? 20 : 14, color: "#000", paddingBottom: 5 }}>
                  {storageForm.returnDate ? new Date(storageForm.returnDate).toLocaleDateString() : ''}
                </Text>
                <Image source={IMAGES.down_arrow} style={{ height: isIPad ? 20 : 12, width: isIPad ? 20 : 12 }} />
              </View>
            </TouchableOpacity>
            <CommonInput
              label={storageForm.notes ? "Notes" : "Notes*"}
              value={storageForm.notes}
              onChangeText={(t) => setStorageForm({ ...storageForm, notes: t })}
            />

            <ImagePickerField
              images={{ image1: storageForm.image1, image2: storageForm.image2 }}
              setImages={(val) => setStorageForm({ ...storageForm, ...val })}
              imageLoading={imageLoading}
              isImageUploading={isImageUploading}
              offlineselectMedia={(key) => offlineselectMedia("storage", key)}
            />

            <TouchableOpacity
              style={styles.formSubmit}
              onPress={() => validateAndSubmit("storage")}
            >
              <Text style={styles.formSubmitText}>Submit</Text>
            </TouchableOpacity>
          </View>
        );

      // ---------------- DEPOSIT ----------------
      case "deposit":
        return (
          <View style={styles.formBox}>
            <View style={styles.titleContainer}>
              <Image source={currentAction!.image} style={styles.formIcon} />
              <Text style={styles.formTitle}>Deposit</Text>
            </View>

            <CommonInput
              label={depositForm.amount ? "Deposit Amount" : "Deposit Amount*"}
              prefix="$"
              value={depositForm.amount}
              onChangeText={(t) => setDepositForm({ ...depositForm, amount: t })}
              keyboardType="numeric"
            />

            <CommonInput
              label={"Reason (Notes)"}
              value={depositForm.reason}
              multiline={true}
              onChangeText={(t) => setDepositForm({ ...depositForm, reason: t })}
            />

            <ImagePickerField
              images={{ image1: depositForm.image1, image2: depositForm.image2 }}
              setImages={(val) => setDepositForm({ ...depositForm, ...val })}
              imageLoading={imageLoading}
              isImageUploading={isImageUploading}
              offlineselectMedia={(key) => offlineselectMedia("deposit", key)}
            />

            <TouchableOpacity
              style={styles.formSubmit}
              onPress={() => validateAndSubmit("deposit")}
            >
              <Text style={styles.formSubmitText}>Submit</Text>
            </TouchableOpacity>
          </View>
        );

      // ---------------- REFUND ----------------
      case "refund":
        return (
          <View style={styles.formBox}>
            <View style={styles.titleContainer}>
              <Image source={currentAction!.image} style={styles.formIcon} />
              <Text style={styles.formTitle}>Refund</Text>
            </View>

            <CommonInput
              label={refundForm.amount ? "Refund Amount" : "Refund Amount*"}
              prefix="$"
              value={refundForm.amount}
              onChangeText={(t) => setRefundForm({ ...refundForm, amount: t })}
              keyboardType="numeric"
            />
            <CommonInput
              label={refundForm.reason ? "Reason (Notes)" : "Reason (Notes)*"}
              value={refundForm.reason}
              multiline={true}
              onChangeText={(t) => setRefundForm({ ...refundForm, reason: t })}
            />
            <CommonInput
              label={"Phone Number"}
              value={refundForm.phone}
              onChangeText={(t) => setRefundForm({ ...refundForm, phone: t })}
              keyboardType="numeric"
            />

            <Text style={styles.sectionTitle}>Payment Method</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={styles.radioOption}
                onPress={() =>
                  setRefundForm({
                    ...refundForm,
                    paymentMethod: "cash",
                  })
                }
              >
                {refundForm.paymentMethod === "cash" ? (
                  <Image source={IMAGES.select} style={styles.radioCircle} />
                ) : (
                  <Image source={IMAGES.unSelect} style={styles.radioCircle} />
                )}
                <Text
                  style={[
                    styles.radioLabel,
                    refundForm.paymentMethod === "cash" &&
                    styles.radioLabelActive,
                  ]}
                >
                  Cash
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.radioOption}
                onPress={() =>
                  setRefundForm({
                    ...refundForm,
                    paymentMethod: "credit",
                  })
                }
              >
                {refundForm.paymentMethod === "credit" ? (
                  <Image source={IMAGES.select} style={styles.radioCircle} />
                ) : (
                  <Image source={IMAGES.unSelect} style={styles.radioCircle} />
                )}
                <Text
                  style={[
                    styles.radioLabel,
                    refundForm.paymentMethod === "credit" &&
                    styles.radioLabelActive,
                  ]}
                >
                  Credit
                </Text>
              </TouchableOpacity>
            </View>

            {/* <ImagePickerField
            images={{ image1: refundForm.image1, image2: refundForm.image2 }}
            setImages={(val) => setRefundForm({ ...refundForm, ...val })}
            imageLoading={imageLoading}
            isImageUploading={isImageUploading}
            offlineselectMedia={(key) => offlineselectMedia("refund", key)}
          /> */}

            <TouchableOpacity
              style={styles.formSubmit}
              onPress={() => validateAndSubmit("refund")}
            >
              <Text style={styles.formSubmitText}>Submit</Text>
            </TouchableOpacity>
          </View>
        );

      // ---------------- ADD CUSTOMER ----------------
      case "addCustomer":
        return (
          <View style={styles.formBox}>
            <View style={styles.titleContainer}>
              <Image source={currentAction!.image} style={styles.formIcon} />
              <Text style={styles.formTitle}>Add Customer</Text>
            </View>


            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: isIPad ? 24 : 18 }}>
              <CountryCodePicker
                value={addCustomerForm.countryCode}
                onSelect={(code) => setAddCustomerForm({ ...addCustomerForm, countryCode: code })}
              />
              <View style={{ flex: 1 }}>
                <CommonInput
                  label={addCustomerForm.phone ? "Phone Number" : "Phone Number*"}
                  value={addCustomerForm.phone}
                  onChangeText={(t) =>
                    setAddCustomerForm({ ...addCustomerForm, phone: t.replace(/[^0-9]/g, "") })
                  }
                  keyboardType="numeric"
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.formSubmit}
              onPress={() => validateAndSubmit("addCustomer")}
            >
              <Text style={styles.formSubmitText}>Submit</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };


  return (
    <View style={styles.container}>
      {/* Watermark Logo */}
      <Image source={IMAGES.bgLogo} style={styles.bgLogo} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
        <View style={styles.innercontainer}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backView}
                onPress={() => navigation.goBack(null)}
              >
                <Image
                  source={IMAGES.left_arrow}
                  style={styles.backIcon}
                />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Advanced Forms</Text>
            </View>

            {/* Customer Info */}
            <View style={styles.customerInfoBox}>
              <Text style={styles.sectionTitle}>Customer Info</Text>
              <CommonInput
                label={selected === "shipToShip"
                  ? (customerInfo.name ? "Sender Name" : "Sender Name*")
                  : (customerInfo.name ? "Name" : "Name*")
                }
                value={customerInfo.name}
                onChangeText={(t) => setCustomerInfo({ ...customerInfo, name: t })}
                autoCapitalize="words" // Example of using new props
              />
              <CommonInput
                label={selected === "shipToShip"
                  ? (customerInfo.email ? "Sender Email Address" : "Sender Email Address*")
                  : (customerInfo.email ? "Email Address" : "Email Address*")
                }
                value={customerInfo.email}
                onChangeText={(t) => setCustomerInfo({ ...customerInfo, email: t })}
                keyboardType="email-address" // Example of using new props
                autoCapitalize="none"
              />
              <TouchableOpacity style={{ marginBottom: isIPad ? 24 : 18, position: "relative", paddingTop: 0 }} onPress={() => setShowCustomerShipDropdown(true)}>
                <Text style={{
                  position: "absolute",
                  left: 0,
                  top: customerInfo.ship_name ? (isIPad ? -14 : -10) : (isIPad ? 20 : 14),
                  fontSize: customerInfo.ship_name ? (isIPad ? 18 : 12) : (isIPad ? 20 : 14),
                  color: customerInfo.ship_name ? "#223890" : "#999",
                  fontWeight: "500",
                }}>Ship Name{customerInfo.ship_name ? "" : "*"}</Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    borderBottomWidth: 1,
                    paddingVertical: isIPad ? 12 : 8,
                    borderColor: customerInfo.ship_name ? "#223890" : "#ccc",
                  }}

                >
                  <Text style={{ flex: 1, fontSize: isIPad ? 20 : 14, color: "#000", paddingBottom: 5 }}>{customerInfo.ship_name || ''}</Text>
                  <Image source={IMAGES.down_arrow} style={{ height: isIPad ? 20 : 12, width: isIPad ? 20 : 12 }} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            <Tabs actions={actions} selected={selected} onSelect={handleTabSelect} />

            {/* Dynamic Form */}
            {renderForm()}

            {/* Modals for dropdowns */}
            <Modal
              visible={showTypeDropdown}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setShowTypeDropdown(false)}
            >
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowTypeDropdown(false)}
              >
                <View style={styles.dropdownContainer}>
                  <Text style={styles.dropdownTitle}>Select Type</Text>
                  {packageTypes.map(option => (
                    <TouchableOpacity
                      key={option.id}
                      onPress={() => {
                        setShipToShipForm({ ...shipToShipForm, type: option.id });
                        setShowTypeDropdown(false);
                      }}
                      style={styles.dropdownOption}
                    >
                      <Text style={styles.dropdownOptionText}>{option.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableOpacity>
            </Modal>
            <Modal
              visible={showReturnTypeDropdown}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setShowReturnTypeDropdown(false)}
            >
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowReturnTypeDropdown(false)}
              >
                <View style={styles.dropdownContainer}>
                  <Text style={styles.dropdownTitle}>Select Type</Text>
                  {packageTypesReturn.map(option => (
                    <TouchableOpacity
                      key={option.id}
                      onPress={() => {
                        setReturnForm({ ...returnForm, type: option.id });
                        setShowReturnTypeDropdown(false);
                      }}
                      style={styles.dropdownOption}
                    >
                      <Text style={styles.dropdownOptionText}>{option.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableOpacity>
            </Modal>
            <Modal
              visible={showPackageTypeDropdown}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setShowPackageTypeDropdown(false)}
            >
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowPackageTypeDropdown(false)}
              >
                <View style={styles.dropdownContainer}>
                  <Text style={styles.dropdownTitle}>Select Type</Text>
                  {packageTypes.map(option => (
                    <TouchableOpacity
                      key={option.id}
                      onPress={() => {
                        setShipPackageForm({ ...shipPackageForm, type: option.id });
                        setShowPackageTypeDropdown(false);
                      }}
                      style={styles.dropdownOption}
                    >
                      <Text style={styles.dropdownOptionText}>{option.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableOpacity>
            </Modal>
            <Modal
              visible={showStorageTypeDropdown}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setShowStorageTypeDropdown(false)}
            >
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowStorageTypeDropdown(false)}
              >
                <View style={styles.dropdownContainer}>
                  <Text style={styles.dropdownTitle}>Select Type</Text>
                  {packageTypes.map(option => (
                    <TouchableOpacity
                      key={option.id}
                      onPress={() => {
                        setShowStorageTypeDropdown(false);
                      }}
                      style={styles.dropdownOption}
                    >
                      <Text style={styles.dropdownOptionText}>{option.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableOpacity>
            </Modal>
            <Modal
              visible={showShipDropdown}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setShowShipDropdown(false)}
            >
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowShipDropdown(false)}
              >
                <ScrollView style={styles.dropdownContainer}>
                  <Text style={styles.dropdownTitle}>Select Ship</Text>
                  {shipList && shipList.map((ship: any) => (
                    <TouchableOpacity
                      key={ship.id}
                      onPress={() => {
                        setAddCustomerForm({ ...addCustomerForm, ship: ship.name });
                        setShowShipDropdown(false);
                      }}
                      style={styles.dropdownOption}
                    >
                      <Text style={styles.dropdownOptionText}>{ship.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </TouchableOpacity>
            </Modal>
            <Modal
              visible={showShipToShipDropdown}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setShowShipToShipDropdown(false)}
            >
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowShipToShipDropdown(false)}
              >
                <ScrollView style={styles.dropdownContainer}>
                  <Text style={styles.dropdownTitle}>Select Ship</Text>
                  {shipList && shipList.map((ship: any) => (
                    <TouchableOpacity
                      key={ship.id}
                      onPress={() => {
                        setShipToShipForm({ ...shipToShipForm, ship_to: ship.name });
                        setShowShipToShipDropdown(false);
                      }}
                      style={styles.dropdownOption}
                    >
                      <Text style={styles.dropdownOptionText}>{ship.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </TouchableOpacity>
            </Modal>
            <Modal
              visible={showReturnShipDropdown}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setShowReturnShipDropdown(false)}
            >
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowReturnShipDropdown(false)}
              >
                <ScrollView style={styles.dropdownContainer}>
                  <Text style={styles.dropdownTitle}>Select Ship</Text>
                  {shipList && shipList.map((ship: any) => (
                    <TouchableOpacity
                      key={ship.id}
                      onPress={() => {
                        setReturnForm({ ...returnForm, ship_name: ship.name });
                        setShowReturnShipDropdown(false);
                      }}
                      style={styles.dropdownOption}
                    >
                      <Text style={styles.dropdownOptionText}>{ship.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </TouchableOpacity>
            </Modal>
            <Modal
              visible={showCustomerShipDropdown}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setShowCustomerShipDropdown(false)}
            >
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowCustomerShipDropdown(false)}
              >
                <ScrollView style={styles.dropdownContainer}>
                  <Text style={styles.dropdownTitle}>Select Ship</Text>
                  {shipList && shipList.map((ship: any) => (
                    <TouchableOpacity
                      key={ship.id}
                      onPress={() => {
                        setCustomerInfo({ ...customerInfo, ship_name: ship.name });
                        setShowCustomerShipDropdown(false);
                      }}
                      style={styles.dropdownOption}
                    >
                      <Text style={styles.dropdownOptionText}>{ship.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </TouchableOpacity>
            </Modal>
            <DatePicker
              modal
              open={showDatePicker}
              mode="date"
              date={storageForm.returnDate ? new Date(storageForm.returnDate) : new Date()}
              onConfirm={(date) => {
                setStorageForm({ ...storageForm, returnDate: date.toISOString() });
                setShowDatePicker(false);
              }}
              onCancel={() => {
                setShowDatePicker(false);
              }}
            />

          </ScrollView>
        </View>
      </KeyboardAvoidingView>
      <Modal
        transparent
        visible={customAlert.visible}
        animationType="fade"
      >
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
            <Text
              style={[
                styles.alertTitle,
                {
                  color:
                    customAlert.type === "error" ? "#FF3B30" : "#34C759",
                },
              ]}
            >
              {customAlert.type === "error" ? "Error" : "Success"}
            </Text>

            <Text style={styles.alertMessage}>
              {customAlert.message}
            </Text>

            <TouchableOpacity
              style={styles.alertButton}
              onPress={() =>
                setCustomAlert({ ...customAlert, visible: false })
              }
            >
              <Text style={styles.alertButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
};

export default AdvancedForms;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    overflow: "visible",
  },
  innercontainer: {
    top: isIPad ? 30 : 20,
  },
  scrollContent: {
    flexGrow: 1,
    padding: isIPad ? 24 : 16,
    paddingBottom: isIPad ? 140 : 100,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: isIPad ? 30 : 20,
    paddingTop: isIPad ? 20 : 10,
  },
  backView: {
    padding: isIPad ? 16 : 10,
    backgroundColor: '#F4F4F4',
    borderRadius: isIPad ? 40 : 30,
  },
  backIcon: {
    width: isIPad ? 28 : 18,
    height: isIPad ? 28 : 18,
    tintColor: "#000",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: isIPad ? 24 : 18,
    fontWeight: "700",
    color: "#00303E",
    marginRight: isIPad ? 60 : 40, // balance spacing
  },
  customerInfoBox: {
    borderRadius: isIPad ? 18 : 12,
    padding: isIPad ? 16 : 10,
    marginBottom: isIPad ? 28 : 20,
  },
  sectionTitle: {
    fontSize: isIPad ? 20 : 14,
    fontWeight: "600",
    marginBottom: isIPad ? 20 : 16,
    color: "#0009",
  },
  formBox: {
    backgroundColor: "#F4F4F4",
    borderRadius: isIPad ? 18 : 12,
    padding: isIPad ? 24 : 16,
    marginBottom: isIPad ? 28 : 20,
  },
  formTitle: {
    fontSize: isIPad ? 22 : 17,
    fontWeight: "700",
    color: "#223890",
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: isIPad ? 20 : 16,
  },
  formIcon: {
    width: isIPad ? 32 : 24,
    height: isIPad ? 32 : 24,
    marginRight: isIPad ? 12 : 8,
    tintColor: "#223890",
  },
  formSubmit: {
    marginTop: isIPad ? 28 : 20,
    backgroundColor: "#FDBE6F",
    borderRadius: isIPad ? 35 : 25,
    height: isIPad ? 60 : 50,
    justifyContent: "center",
    alignItems: "center",
  },
  formSubmitText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: isIPad ? 20 : 16,
  },
  radioGroup: {
    flexDirection: "row",
    marginBottom: isIPad ? 20 : 16,
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: isIPad ? 30 : 20,
  },
  radioCircle: {
    height: isIPad ? 28 : 20,
    width: isIPad ? 28 : 20,
    borderRadius: isIPad ? 14 : 9,
    marginRight: isIPad ? 12 : 8,
  },
  radioLabel: {
    fontSize: isIPad ? 18 : 14,
    color: "#999",
  },
  radioLabelActive: {
    color: "#223890",
    fontWeight: "600",
  },
  tableContainer: {
    marginTop: isIPad ? 28 : 20,
    borderRadius: isIPad ? 12 : 8,
    backgroundColor: "#F9F9F9",
    padding: isIPad ? 16 : 12,
  },
  tableTitle: {
    fontSize: isIPad ? 20 : 16,
    fontWeight: "700",
    color: "#223890",
    marginBottom: isIPad ? 16 : 12,
  },
  tableRow: {
    backgroundColor: "#FFF",
    borderRadius: isIPad ? 8 : 6,
    padding: isIPad ? 12 : 8,
    marginBottom: isIPad ? 8 : 6,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  tableText: {
    fontSize: isIPad ? 14 : 12,
    color: "#333",
    marginBottom: isIPad ? 4 : 2,
  },
  bgLogo: {
    position: "absolute",
    right: 0,
    width: isIPad ? '65%' : '70%',
    height: isIPad ? '60%' : '50%',
    zIndex: -1,
    resizeMode: 'contain',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderRadius: isIPad ? 12 : 8,
    padding: isIPad ? 20 : 16,
    width: '80%',
    maxWidth: 300,
    maxHeight: '60%',
    paddingBottom: 20
  },
  dropdownTitle: {
    fontSize: isIPad ? 20 : 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: isIPad ? 16 : 12,
    textAlign: 'center',
  },
  dropdownOption: {
    paddingVertical: isIPad ? 12 : 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownOptionText: {
    fontSize: isIPad ? 18 : 16,
    color: '#000',
    textAlign: 'center',
  },
  alertOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  alertBox: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  alertMessage: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  alertButton: {
    backgroundColor: "#223890",
    paddingVertical: 10,
    borderRadius: 8,
  },
  alertButtonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
  },

});

