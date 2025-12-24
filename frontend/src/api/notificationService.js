import axiosClient from "./axiosClient";

export const getMyNotifications = () => axiosClient.get("/notifications/my");
export const markRead = (id) => axiosClient.patch(`/notifications/${id}/read`);
export const markAllRead = () => axiosClient.patch("/notifications/read-all");
