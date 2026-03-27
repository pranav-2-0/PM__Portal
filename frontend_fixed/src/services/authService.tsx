import axios, { AxiosInstance } from "axios";

const API_BASE_URL = "http://localhost:5001/api";

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" }
});

// Attach token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) {
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  // ✅ SIGNUP
  signup: async (data: any) => {
    try {
      const res = await apiClient.post("/auth/signup", data);
      if (res.data.token) {
        localStorage.setItem("authToken", res.data.token);
      }
      return res.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || "Signup failed");
    }
  },

  // ✅ LOGIN
  login: async (email: string, password: string) => {
    try {
      const res = await apiClient.post("/auth/login", { email, password });
      if (res.data.token) {
        localStorage.setItem("authToken", res.data.token);
      }
      return res.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || "Login failed");
    }
  },

  // ✅ GET LOGGED-IN USER
  getCurrentUser: async () => {
    try {
      const res = await apiClient.get("/auth/me");
      return res.data.user || res.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || "Failed to fetch user");
    }
  },

  // ✅ LOGOUT
  logout: () => {
    localStorage.removeItem("authToken");
  },
};