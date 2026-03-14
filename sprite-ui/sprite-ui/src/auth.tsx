import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiLogin, apiLogout, apiMe, apiRegister, Me } from './api';

type AuthCtx = {
  user: Me | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>(null as any);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { setUser(await apiMe()); } catch { setUser(null); } finally { setLoading(false); }
    })();
  }, []);

  const login = async (email: string, password: string) => { await apiLogin(email, password); setUser(await apiMe()); };
  const register = async (email: string, password: string, name: string) => { await apiRegister(email, password, name); setUser(await apiMe()); };
  const logout = async () => { await apiLogout(); setUser(null); };
  const refresh = async () => { setUser(await apiMe()); };

  return <Ctx.Provider value={{ user, loading, login, register, logout, refresh }}>{children}</Ctx.Provider>;
}
