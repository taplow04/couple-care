import { createContext, useContext, useState, useEffect } from "react";

import { getCurrentUser } from "../services/auth.service";
import { logoutCurrentSession } from "../services/security.service";

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

  const login = async (user, token) => {
    localStorage.setItem("token", token);

    // Set immediately for snappy UX, then refetch the authoritative profile
    // (includes coupleConnected) so route guards can decide correctly.
    setUser(user);

    try {
      const res = await getCurrentUser();
      setUser(res.data);
    } catch {
      setUser(user);
    }
  };

  const logout = () => {
    // Clear the UI immediately for a snappy sign-out.
    setUser(null);

    // Best-effort: revoke THIS session server-side so the token can't be reused,
    // then drop it locally. We keep the token until the request settles so its
    // Authorization header is still attached; the interceptor removes it on a
    // 401 too, so this is safe either way.
    logoutCurrentSession()
      .catch(() => {})
      .finally(() => localStorage.removeItem("token"));
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
