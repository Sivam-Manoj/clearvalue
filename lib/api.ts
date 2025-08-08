import axios, { AxiosRequestConfig } from "axios";
import { API_BASE } from "./config";
import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  clearTokens,
} from "./auth-storage";
import { deleteCookie } from "./cookies";

const API = axios.create({
  baseURL: API_BASE,
  timeout: 600000, // 10 minutes
});

API.interceptors.request.use(async (config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  (config.headers as any).Accept = (config.headers as any).Accept || "application/json";
  const method = (config.method || 'get').toUpperCase();
  const isForm = typeof FormData !== 'undefined' && config.data instanceof FormData;
  if (!isForm && (method !== 'GET' || config.data !== undefined)) {
    (config.headers as any)["Content-Type"] = (config.headers as any)["Content-Type"] || "application/json";
  }
  return config;
});

interface FailedRequest {
  resolve: (value: unknown) => void;
  reject: (reason?: any) => void;
}

let isRefreshing = false;
let failedQueue: FailedRequest[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

export type RetriableAxiosConfig = AxiosRequestConfig & { _retry?: boolean };

API.interceptors.response.use(
  (response) => response,
  async (error: any) => {
    const originalRequest: RetriableAxiosConfig = error.config || {};
    const status = error?.response?.status;

    if ((status === 401 || status === 403) && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            (originalRequest.headers as any) =
              (originalRequest.headers as any) || {};
            (originalRequest.headers as any)[
              "Authorization"
            ] = `Bearer ${token}`;
            return API(originalRequest as any);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const currentRefreshToken = getRefreshToken();
        if (!currentRefreshToken) {
          processQueue(error, null);
          clearTokens();
          try {
            deleteCookie("cv_auth");
          } catch {}
          return Promise.reject(error);
        }

        const { data } = await axios.post<{ accessToken?: string }>(
          `${API_BASE}/auth/refresh-token`,
          { token: currentRefreshToken }
        );

        const newAccessToken = data?.accessToken;
        if (!newAccessToken) {
          throw new Error("No access token returned from refresh");
        }

        setAccessToken(newAccessToken);
        API.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${newAccessToken}`;
        processQueue(null, newAccessToken);
        (originalRequest.headers as any) =
          (originalRequest.headers as any) || {};
        (originalRequest.headers as any)[
          "Authorization"
        ] = `Bearer ${newAccessToken}`;
        return API(originalRequest as any);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearTokens();
        try {
          deleteCookie("cv_auth");
        } catch {}
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default API;
