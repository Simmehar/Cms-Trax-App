import React, {useState} from 'react';
import {ActivityIndicator, StyleSheet, Image} from 'react-native';
import FastImage from 'react-native-fast-image';

interface imageProps {
  style: {};
  resizeMode: any;
  source: any;
}

const LoadImage: React.FC<imageProps> = props => {
  const [loading, setLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  return (
    <>
      <FastImage
        {...props}
        onLoadStart={() => {
          setLoading(true);
        }}
        onLoadEnd={() => {
          setLoading(false);
        }}
        resizeMode={props?.resizeMode}
        //  onError={() => error ? (setIsError(true), setLoading(false)) : false}
      />
      {loading ? (
        <ActivityIndicator
          style={styles.indicator}
          size={'small'}
          color={'#223890'}
        />
      ) : null}
    </>
  );
};

export {LoadImage};

const styles = StyleSheet.create({
  indicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
  },
  indicator1: {
    position: 'absolute',
    bottom: 0,
  },
});
