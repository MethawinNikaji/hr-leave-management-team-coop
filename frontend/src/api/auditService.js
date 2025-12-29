import axiosClient from "./axiosClient";

// axiosClient baseURL = http://localhost:8000/api (มี /api อยู่แล้ว)
export const getAuditLogs = async () => {
  const { data } = await axiosClient.get("/audit");
  return data;
};
