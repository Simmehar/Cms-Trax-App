import React from "react";
import { View,TextInput,StyleSheet } from "react-native";

interface InputProps {
    placeholder : string ,
    placeholderTextColor : string,
    style : any
}

const Input : React.FC<InputProps> = (props) => {

    return(
        <View>
        <TextInput 
          placeholder={props?.placeholder}
          placeholderTextColor={props?.placeholderTextColor}
          style = {props?.style}
        />
        
        </View>
    )
}
export {Input}