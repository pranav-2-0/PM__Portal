import React, { createContext, useContext, useState, useCallback } from "react";
import { authService } from "../services/authService";

interface AuthContextType {
  isAuthenticated: boolean;
  user: any | null;
  selectedDepartment: number | null;
  login: (user: any) => void;
  logout: () => void;
  setSelectedDepartment: (departmentId: number | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem("authToken"));
  const [user, setUser] = useState<any | null>(
    JSON.parse(localStorage.getItem("user") || "null")
  );
  const [selectedDepartment, setSelectedDepartment] = useState<number | null>(() => {
    if (user?.role === "Super Admin") {
      const stored = localStorage.getItem("selectedDepartment");
      if (stored && stored !== "null") {
        return JSON.parse(stored);
      }
      // Default to first department (CCA-FS = 1) if no stored value
      return 1;
    }
    return null;
  });

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
        setSelectedDepartment: handleSetSelectedDepartment
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