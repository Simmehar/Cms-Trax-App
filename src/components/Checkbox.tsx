import React from 'react';
import {TouchableOpacity, StyleSheet, View} from 'react-native';

interface CheckboxProps {
  value: boolean;
  onValueChange: (newValue: boolean) => void;
}

const Checkbox: React.FC<CheckboxProps> = ({value, onValueChange}) => (
  <TouchableOpacity
    style={styles.checkboxContainer}
    onPress={() => onValueChange(!value)}>
    {value && <View style={styles.checkboxChecked} />}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  checkboxContainer: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    width: 10,
    height: 10,
    backgroundColor: '#007bff',
    borderRadius: 5,
  },
});

export  {Checkbox};
