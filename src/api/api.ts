import axios from "axios";
import type { ApiError } from "../types/api";

export const TOKEN_KEY = "access_token";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

// Pega el token en cada petición
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Si el servidor dice 401 (sesión inválida) → avisamos al AuthContext
let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(fn: (() => void) | null) {
  onUnauthorized = fn;
}

api.interceptors.response.use(
  (res) => res,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

// Saca el error del backend con su formato
export function getApiError(e: unknown): ApiError | null {
  if (axios.isAxiosError<ApiError>(e) && e.response?.data) return e.response.data;
  return null;
}