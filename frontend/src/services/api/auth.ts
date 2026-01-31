// frontend/src/services/api/auth.ts
// Service API pour l'authentification des utilisateurs
// Fournit des fonctions pour l'inscription, la connexion, le rafraîchissement des tokens et la récupération des informations utilisateur

import { api } from './client';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  date_joined: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  password2: string;
  first_name?: string;
  last_name?: string;
}

export interface LoginData {
  username: string;
  password: string;
}

export interface TokenResponse {
  access: string;
  refresh: string;
}

export const authApi = {
  // Register
  register: async (data: RegisterData): Promise<User> => {
    return api.post<User>('/auth/register/', data);
  },

  // Login
  login: async (data: LoginData): Promise<TokenResponse> => {
    return api.post<TokenResponse>('/auth/login/', data);
  },

  // Refresh token
  refresh: async (refreshToken: string): Promise<{ access: string }> => {
    return api.post<{ access: string }>('/auth/refresh/', { refresh: refreshToken });
  },

  // Get current user
  me: async (): Promise<User> => {
    return api.get<User>('/auth/me/');
  },
};