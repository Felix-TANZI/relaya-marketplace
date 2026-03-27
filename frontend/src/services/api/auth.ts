// frontend/src/services/api/auth.ts
// Service API pour l'authentification et la gestion du profil utilisateur

import { http } from './http';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  date_joined: string;
  is_vendor?: boolean;
  phone?: string | null;
  avatar_url?: string | null;
  newsletter_subscribed?: boolean;
  sms_notifications?: boolean;
  loyalty_points?: number;
  loyalty_tier?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  password2?: string;
  first_name?: string;
  last_name?: string;
}

export interface TokenResponse {
  access: string;
  refresh: string;
}

export interface UpdateProfileData {
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string | null;
  bio?: string | null;
  newsletter_subscribed?: boolean;
  sms_notifications?: boolean;
}

export const authApi = {
  /**
   * Connexion utilisateur
   */
  login: async (credentials: LoginCredentials): Promise<TokenResponse> => {
    return http<TokenResponse>('/api/auth/login/', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  /**
   * Inscription utilisateur
   */
  register: async (data: RegisterData): Promise<User> => {
    return http<User>('/api/auth/register/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Récupérer les infos de l'utilisateur connecté
   */
  me: async (): Promise<User> => {
    const token = localStorage.getItem('access_token');
    return http<User>('/api/auth/me/', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  /**
   * Récupérer le profil complet
   */
  getProfile: async (): Promise<User> => {
    const token = localStorage.getItem('access_token');
    return http<User>('/api/auth/profile/', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  /**
   * Mettre à jour le profil
   */
  updateProfile: async (data: UpdateProfileData): Promise<User> => {
    const token = localStorage.getItem('access_token');
    return http<User>('/api/auth/profile/update/', {
      method: 'PATCH',
      body: JSON.stringify(data),
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  uploadAvatar: async (file: File): Promise<User> => {
    const token = localStorage.getItem('access_token');
    const body = new FormData();
    body.append('avatar', file);

    return http<User>('/api/auth/profile/avatar/', {
      method: 'POST',
      body,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  removeAvatar: async (): Promise<User> => {
    const token = localStorage.getItem('access_token');
    return http<User>('/api/auth/profile/avatar/', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};
