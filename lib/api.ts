import { Platform } from "react-native";

const API_PORT = 8080;

export const API_BASE_URL =
  Platform.select({
    android: `http://192.168.31.57:8080/api/v1`,
    ios: `http://localhost:${API_PORT}/api/v1`,
    default: `http://localhost:${API_PORT}/api/v1`,
  }) ?? `http://localhost:${API_PORT}/api/v1`;

export const API_SOCKET_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, "");

type ApiErrorResponse = {
  message?: string;
};

const request = async <T>(
  path: string,
  options: RequestInit = {},
): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    const message =
      (payload as ApiErrorResponse | null)?.message ?? "Request failed.";
    throw new Error(message);
  }

  return payload as T;
};

export const api = {
  get: <T>(path: string, options: RequestInit = {}) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body: unknown, options: RequestInit = {}) =>
    request<T>(path, { ...options, method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown, options: RequestInit = {}) =>
    request<T>(path, { ...options, method: "PATCH", body: JSON.stringify(body) }),
  del: <T>(path: string, options: RequestInit = {}) =>
    request<T>(path, { ...options, method: "DELETE" }),
};
