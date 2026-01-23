// src/auth/AuthContext.js
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

      // ✅ keep this log (you can remove later)
      console.log("ME FROM API:", user);

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

  const roleName = me?.role?.name || "guest";
  const verified = me?.verified_badge === true || me?.verified_badge === 1 || me?.verified_badge === "true";

  const value = useMemo(
    () => ({
      loading,
      me,
      role: roleName,
      verified, // ✅ expose verified explicitly
      isLoggedIn: !!me,
      login,
      logout,
      refresh,
    }),
    [loading, me, roleName, verified]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
