// frontend/src/context/AuthContext.tsx
// Gestion de l'authentification (login, 2FA, register, logout).

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, type User, type RegisterData } from '@/services/api/auth';

type LoginOutcome =
  | { twoFactorRequired: false }
  | { twoFactorRequired: true; userId: number; email: string };

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<LoginOutcome>;
  verify2FA: (userId: number, code: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try { setUser(await authApi.me()); }
        catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  const applyTokens = async (access: string, refresh: string) => {
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    setUser(await authApi.me());
  };

  const login = async (username: string, password: string): Promise<LoginOutcome> => {
    const response = await authApi.login({ username, password });
    if ('2fa_required' in response) {
      return { twoFactorRequired: true, userId: response.user_id, email: response.email };
    }
    await applyTokens(response.access, response.refresh);
    return { twoFactorRequired: false };
  };

  const verify2FA = async (userId: number, code: string): Promise<void> => {
    const tokens = await authApi.verify2FALogin(userId, code);
    await applyTokens(tokens.access, tokens.refresh);
  };

  const register = async (data: RegisterData) => {
    await authApi.register(data);
    await login(data.username, data.password); // nouveau compte → jamais de 2FA
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('belivay_favorite_product_ids');
    localStorage.removeItem('belivay_notif_count');
    localStorage.removeItem('belivay-profile-avatar');
    setUser(null);
    window.dispatchEvent(new Event('belivay-favorites-updated'));
    window.dispatchEvent(new Event('belivay-avatar-updated'));
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, verify2FA, register, logout, isAuthenticated: !!user }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}