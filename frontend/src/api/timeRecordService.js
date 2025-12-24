import axiosClient from "./axiosClient";

// Worker: get my time records with optional date range
export const getMyTimeRecords = ({ startDate, endDate } = {}) => {
  const params = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  return axiosClient.get("/timerecord/my", { params });
};

// Worker: late summary of current month
export const getMyLateSummary = () => axiosClient.get("/timerecord/late/summary");
