import { create } from "axios";

/**
 * Project-agnostic HTTP defaults. There is deliberately no base URL and no
 * interceptors here: each project derives its own instance with
 * `axiosInstance.create({ baseURL })` and installs its own interceptors from
 * its slice, so one project's auth logic never touches another's requests.
 */
const axiosInstance = create({
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

export default axiosInstance;
