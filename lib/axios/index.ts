import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { apiRoutes, pageRoutes } from "@/lib/constants";
import { clearAccessToken, getAccessToken, setAccessToken } from "@/lib/axios/tokenStore";

export const Axios = axios.create({
    baseURL: "http://localhost:5000",
    withCredentials: true,
});

Axios.interceptors.request.use((config) => {
    const token = getAccessToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<string> | null = null;

const refreshAccessToken = () => {
    if (!refreshPromise) {
        refreshPromise = Axios.post(apiRoutes.refreshToken)
            .then((response) => {
                const token = response.data?.accessToken;
                setAccessToken(token);
                return token;
            })
            .finally(() => {
                refreshPromise = null;
            });
    }
    return refreshPromise;
};

Axios.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as RetriableConfig | undefined;
        const isRefreshCall = originalRequest?.url === apiRoutes.refreshToken;

        if (
            error.response?.status !== 401 ||
            !originalRequest ||
            originalRequest._retry ||
            isRefreshCall
        ) {
            return Promise.reject(error);
        }

        originalRequest._retry = true;

        try {
            const token = await refreshAccessToken();
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return Axios(originalRequest);
        } catch (refreshError) {
            clearAccessToken();
            if (typeof window !== "undefined") {
                window.location.href = pageRoutes.signin;
            }
            return Promise.reject(refreshError);
        }
    },
);