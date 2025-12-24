import axios from "axios";

const baseURL = (import.meta.env.VITE_API_URL || "http://localhost:8000/api").replace(/\/$/, "");

const axiosClient = axios.create({
  baseURL,
  timeout: 20000,
});

// แนบ token อัตโนมัติ
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// handle 401/403 แบบกลาง
axiosClient.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;

    if (status === 401) {
      // session หมดอายุ/ token ไม่ถูกต้อง
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // ยิง event ให้ AuthContext รู้
      window.dispatchEvent(new Event("auth:logout"));

      // redirect กันค้างหน้า
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
export { baseURL };
