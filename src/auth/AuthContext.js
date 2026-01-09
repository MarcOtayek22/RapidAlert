import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getMe, login as apiLogin, logout as apiLogout } from "../api/directus";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);

  async function refresh() {
    setLoading(true);
    try {
      const user = await getMe();
      setMe(user);
    } catch (e) {
      console.log("getMe failed:", e?.message);
      setMe(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function login(email, password) {
    await apiLogin(email, password);
    await refresh();
  }

  async function logout() {
    await apiLogout();
    setMe(null);
  }

  // ✅ Role is now a readable string ("user" / "volunteer")
  const roleName = me?.role?.name || "guest";

  const value = useMemo(
    () => ({
      loading,
      me,
      role: roleName,
      isLoggedIn: !!me,
      login,
      logout,
      refresh,
    }),
    [loading, me, roleName]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
 