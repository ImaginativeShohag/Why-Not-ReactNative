import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "https://fakestoreapi.com", // Replace with your API base URL
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Optional: interceptors for auth tokens or error handling
axiosInstance.interceptors.request.use(
  (config) => {
    // Example: attach token
    // const token = await SecureStore.getItemAsync("token");
    // if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

export default axiosInstance;
