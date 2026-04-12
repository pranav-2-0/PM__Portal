import axios, { AxiosInstance } from "axios";

const API_BASE_URL = "http://localhost:5001/api";

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" }
});

// Attach token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) {
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  signup: async (data: any) => {
    try {
      const res = await apiClient.post("/auth/signup", data);

      if (res.data.token) {
        localStorage.setItem("authToken", res.data.token);
      }
      if (res.data.user) {
        localStorage.setItem("user", JSON.stringify(res.data.user));
      }

      return res.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || "Signup failed");
    }
  },

  login: async (email: string, password: string) => {
    try {
      const res = await apiClient.post("/auth/login", { email, password });

      if (res.data.token) {
        localStorage.setItem("authToken", res.data.token);
      }
      if (res.data.user) {
        localStorage.setItem("user", JSON.stringify(res.data.user));
      }

      return res.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || "Login failed");
    }
  },

  logout: () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
  }
};