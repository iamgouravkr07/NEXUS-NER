import React, { createContext, useContext, useEffect, useState } from "react";

const API_URL = "http://127.0.0.1:8000";

export type UserRole = "ADMIN" | "CONTROL_OPERATOR" | "FIELD_OFFICER" | "DRIVER";

export type AuthUser = {
  id: number;
  username: string;
  email: string;
  role: UserRole | string;
  is_active: boolean;
};

type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  getAuthHeader: () => Record<string, string>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("nexus_token");
    const savedUser = localStorage.getItem("nexus_user");

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem("nexus_token");
        localStorage.removeItem("nexus_user");
      }
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return {
          success: false,
          error: data.detail || "Authentication failed. Please check your credentials.",
        };
      }

      const data = await res.json();
      const accessToken = data.access_token;
      const authUser: AuthUser = data.user;

      setToken(accessToken);
      setUser(authUser);
      localStorage.setItem("nexus_token", accessToken);
      localStorage.setItem("nexus_user", JSON.stringify(authUser));

      return { success: true };
    } catch {
      return {
        success: false,
        error: "Network error connecting to NEXUS-NER authentication service.",
      };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("nexus_token");
    localStorage.removeItem("nexus_user");
  };

  const getAuthHeader = (): Record<string, string> => {
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        loading,
        login,
        logout,
        getAuthHeader,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
