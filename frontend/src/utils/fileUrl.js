import { baseURL } from "../api/axiosClient";

// baseURL is like http://localhost:8000/api
const FILE_BASE = baseURL.replace(/\/api$/, "");

export const buildFileUrl = (pathOrUrl) => {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const p = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${FILE_BASE}${p}`;
};
