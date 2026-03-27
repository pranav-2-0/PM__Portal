import React, { createContext, useContext, useEffect, useState } from "react";
import { authService } from "../services/authService";

interface AuthContextType {
  isAuthenticated: boolean;
  user: any | null;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    !!localStorage.getItem("authToken")
  );

  const [user, setUser] = useState<any | null>(null);

  // Load user automatically
  useEffect(() => {
    const loadUser = async () => {
      if (localStorage.getItem("authToken")) {
        try {
          const me = await authService.getCurrentUser();
          setUser(me);
        } catch (e) {
          console.log("User load failed");
        }
      }
    };
    loadUser();
  }, [isAuthenticated]);

  const login = () => setIsAuthenticated(true);

  const logout = () => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext)!;