/**
 * @format
 */

if (!__DEV__) {
  const noop = () => {};
  console.log = noop;
  console.warn = noop;
  console.error = noop;
  console.info = noop;
  console.debug = noop;
}

import {AppRegistry} from 'react-native';
import {App} from './src/App';
import {name as appName} from './app.json';
import Ocrdemo from './ocrdemo';

AppRegistry.registerComponent(appName, () => App);
