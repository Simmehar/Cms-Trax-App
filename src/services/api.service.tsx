import axios, {AxiosInstance, AxiosResponse, AxiosRequestConfig} from 'axios';
import {getData, saveData} from '../utilities/securestorage';
import { Backend_URL } from '../util/apiCalls';
const baseURL =Backend_URL;
  __DEV__ && console.log('adsdadasdasdasdasdasdasdasdasdasd', baseURL)
const axiosInstance: AxiosInstance = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use((config: any) => {
  config.metadata = {startTime: new Date()};
  return config;
});

axiosInstance.interceptors.response.use(
  (response: any) => {
    // Log response time
    const endTime = new Date();
    const startTime = response.config.metadata?.startTime;
    if (startTime) {
      const elapsedTime = endTime.getTime() - startTime.getTime();
      console.table(`Request to ${response.config.url} took ${elapsedTime} ms`);
    }
    console.info('Response:', response);
    return response;
  },
  async error => {
    // Log error
    console.error('Error:', error);

    // Handle specific error status and code
    const status = error.response?.status || 500;
    const code = error.response?.data?.code;
    if (status === 401 && code === 'token_not_valid') {
      const key = 'user.data';
      const existingData = await getData(key);
      if (existingData) {
        existingData.token = 'expired';
        await saveData(key, existingData);
      }
    } else {
      return Promise.reject(error);
    }
  },
);

export const api = axiosInstance;

export async function authenticatedRequest<T>(
  config: AxiosRequestConfig,
): Promise<AxiosResponse<T>> {
  return await axiosInstance.request<T>(config);
}
