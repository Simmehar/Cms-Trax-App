import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import {Formik} from 'formik';
import * as Yup from 'yup';

const ShipDetails = () => {
  const validationSchema = Yup.object().shape({
    ship: Yup.string().required('Ship is required'),
    recipient: Yup.string().required('Recipient is required'),
    division: Yup.string(),
    location: Yup.string().required('Location is required'),
  });

  return (
    <View style={styles.mainContainer}>
      <Formik
        initialValues={{ship: '', recipient: '', division: '', location: ''}}
        validationSchema={validationSchema}
        onSubmit={values => {
          __DEV__ && console.log(values);
        }}>
        {({
          handleChange,
          handleBlur,
          handleSubmit,
          values,
          errors,
          touched,
        }) => (
          <View style={styles.cardContainer}>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Ship*</Text>
              <TextInput
                style={styles.input}
                onChangeText={handleChange('ship')}
                onBlur={handleBlur('ship')}
                value={values.ship}
              />
              {touched.ship && errors.ship && (
                <Text style={styles.errorText}>{errors.ship}</Text>
              )}
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Select Recipient*</Text>
              <TextInput
                style={styles.input}
                onChangeText={handleChange('recipient')}
                onBlur={handleBlur('recipient')}
                value={values.recipient}
              />
              {touched.recipient && errors.recipient && (
                <Text style={styles.errorText}>{errors.recipient}</Text>
              )}
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Division</Text>
              <TextInput
                style={styles.input}
                onChangeText={handleChange('division')}
                onBlur={handleBlur('division')}
                value={values.division}
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Location*</Text>
              <TextInput
                style={styles.input}
                onChangeText={handleChange('location')}
                onBlur={handleBlur('location')}
                value={values.location}
              />
              {touched.location && errors.location && (
                <Text style={styles.errorText}>{errors.location}</Text>
              )}
            </View>
          </View>
        )}
      </Formik>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {backgroundColor: 'white', padding: 12},
  cardContainer: {
    backgroundColor: '#F4F4F4',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: {width: 0, height: 2},
    shadowRadius: 10,
    elevation: 5,
    marginBottom: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    color: '#61B3E4',
    fontWeight: '600',
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    marginTop: 5,
  },
  submitButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export {ShipDetails};
