import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, Dimensions} from 'react-native';
import { useKeepAwake } from '@sayem314/react-native-keep-awake';
import { isIPad } from '../utilities/securestorage';
const ProgressBar = ({progress = 1, totalprogress = 100}) => {
  if (progress === 0 && totalprogress === 1) {
    return null;
  }

  const [progressPercentage, setProgressPercentage] = useState(0);

  useEffect(() => {
    const calculatedProgress = isNaN((progress / totalprogress) * 100)
      ? 0
      : (progress / totalprogress) * 100;
    setProgressPercentage(calculatedProgress);
  }, [progress, totalprogress]);
  useKeepAwake();
  return (
    <View style={styles.container}>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {width: `${progressPercentage}%`, backgroundColor: '#4258b6'},
          ]}
        />
      </View>
      <Text style={styles.progressText}>{progressPercentage.toFixed(2)}%</Text>
      <Text style={styles.progressPackageText}>
        Downloading {progress} out of {totalprogress} Packages
      </Text>
    </View>
  );
};
const ProgressBarSyncCheckouts = ({checkoutProgress, totalCheckouts}) => {
  // __DEV__ && console.log(
  //   'checkoutProgress, totalCheckouts',
  //   checkoutProgress,
  //   totalCheckouts,
  // );
  if (checkoutProgress === 0 && totalCheckouts === 0) {
    return null;
  }

  const [progressPercentage, setProgressPercentage] = useState(0);

  useEffect(() => {
    const calculatedProgress = isNaN((checkoutProgress / totalCheckouts) * 100)
      ? 0
      : (checkoutProgress / totalCheckouts) * 100;
    setProgressPercentage(calculatedProgress);
  }, [checkoutProgress, totalCheckouts]);

  return (
    <View style={styles.container}>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {width: `${progressPercentage}%`, backgroundColor: '#4258b6'},
          ]}
        />
      </View>
      <Text style={styles.progressText}>{progressPercentage.toFixed(2)}%</Text>
      <Text style={styles.progressPackageText}>
        Syncing {checkoutProgress || 1} out of {totalCheckouts} entries.
      </Text>
    </View>
  );
};

const {height, width} = Dimensions.get('screen');

const styles = StyleSheet.create({
  container: {
    // flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    position: 'absolute',
    zIndex: 1,
    backgroundColor: 'white',
    height,
    width,
  },
  progressBar: {
    width: '80%',
    height: 6,
    backgroundColor: '#d4d4ec',
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
  },
  progressText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 30,
  },
  progressPackageText: {
    fontSize: isIPad?27:23,
    color: '#333',
  },
  largerNumbers: {
    fontSize: isIPad ? 37 : 33,
    color: '#333',
    fontWeight: 'bold',
  },
});

export {ProgressBarSyncCheckouts, ProgressBar};
