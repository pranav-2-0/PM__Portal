import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { authService } from "../services/authService";

interface AuthContextType {
  isAuthenticated: boolean;
  user: any | null;
  selectedDepartment: number | null;
  login: (user: any) => void;
  logout: () => void;
  setSelectedDepartment: (departmentId: number | null) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem("authToken"));
  const [user, setUser] = useState<any | null>(
    JSON.parse(localStorage.getItem("user") || "null")
  );
  const [isLoading, setIsLoading] = useState(!localStorage.getItem("authToken"));
  const [selectedDepartment, setSelectedDepartment] = useState<number | null>(
    user?.role === "Super Admin" ? JSON.parse(localStorage.getItem("selectedDepartment") || "null") : null
  );

  // Auto-login with demo account on first load if not authenticated
  useEffect(() => {
    if (!localStorage.getItem("authToken")) {
      const demoLogin = async () => {
        try {
          const response = await fetch('/api/auth/demo-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          if (response.ok) {
            const data = await response.json();
            if (data.token && data.user) {
              localStorage.setItem("authToken", data.token);
              localStorage.setItem("user", JSON.stringify(data.user));
              setIsAuthenticated(true);
              setUser(data.user);
            }
          } else {
            console.warn('Demo login failed with status:', response.status);
          }
        } catch (error) {
          console.warn('Demo login failed:', error);
        } finally {
          setIsLoading(false);
        }
      };
      demoLogin();
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback((userData: any) => {
    setIsAuthenticated(true);
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
    
    // For Super Admin, initialize with first department if available
    if (userData?.role === "Super Admin" && userData?.departments?.length > 0) {
      const firstDept = userData.departments[0]?.id || userData.departments[0];
      setSelectedDepartment(firstDept);
      localStorage.setItem("selectedDepartment", JSON.stringify(firstDept));
    }
  }, []);

  const handleSetSelectedDepartment = useCallback((departmentId: number | null) => {
    if (user?.role === "Super Admin") {
      setSelectedDepartment(departmentId);
      localStorage.setItem("selectedDepartment", JSON.stringify(departmentId));
    }
  }, [user?.role]);

  const logout = useCallback(() => {
    authService.logout();
    setIsAuthenticated(false);
    setUser(null);
    setSelectedDepartment(null);
    localStorage.removeItem("selectedDepartment");
  }, []);

  return (
    <AuthContext.Provider 
      value={{ 
        isAuthenticated, 
        user, 
        selectedDepartment,
        login, 
        logout,
        setSelectedDepartment: handleSetSelectedDepartment,
        isLoading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};