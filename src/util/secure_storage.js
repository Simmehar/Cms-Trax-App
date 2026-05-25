import * as SecureStore from 'expo-secure-store';

async function save(key, value) {
  await SecureStore.setItemAsync(key, value);
}

async function getValueFor(key) {
  let result = await SecureStore.getItemAsync(key);
  if (result) {
    return result;
  } else {
    //Error Handling
  }
}
async function deleteKey(key){
    await SecureStore.deleteItemAsync(key);
}


export { save, getValueFor, deleteKey}