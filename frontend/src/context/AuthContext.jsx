import { createContext, useContext, useState, useEffect } from "react";

import { getCurrentUser } from "../services/auth.service";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setLoading(false);

      return;
    }

    try {
      const res = await getCurrentUser();

      setUser(res.data);
    } catch (error) {
      localStorage.removeItem("token");
    }

    setLoading(false);
  };

  useEffect(() => {
    loadUser();
  }, []);

  const login = (user, token) => {
    localStorage.setItem("token", token);

    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem("token");

    setUser(null);
  };

  const updateUser = (patch) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        loadUser,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
