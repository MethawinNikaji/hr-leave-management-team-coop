import axiosClient from "./axiosClient";

export const getAuditLogs = async ({
  q = "",
  category = "All",
  action = "",
  dateFrom = "",
  dateTo = "",
  role = "",
  page = 1,
  pageSize = 10,
} = {}) => {
  const { data } = await axiosClient.get("/audit", {
    params: {
      q,
      category,
      action,
      dateFrom,
      dateTo,
      role,
      page,
      pageSize,
    },
  });

  return data;
};
