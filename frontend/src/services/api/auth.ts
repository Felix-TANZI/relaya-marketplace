// frontend/src/services/api/auth.ts
// Service API pour l'authentification et la gestion du profil utilisateur

import { http } from './http';

export interface User {
  id:                     number;
  username:               string;
  email:                  string;
  first_name:             string;
  last_name:              string;
  date_joined:            string;
  // Rôles — retournés par /api/auth/me/
  is_staff?:              boolean;   // true = accès espace admin
  is_superuser?:          boolean;   // true = super-administrateur
  is_vendor?:             boolean;   // true = compte vendeur actif
  // Profil étendu
  is_courier?: boolean;
  is_delivery_organization?: boolean;
  is_relay_point?: boolean;
  courier_status?: "not_applied" | "pending" | "approved";
  courier_profile?: CourierProfile | null;
  delivery_organization_profile?: DeliveryOrganizationProfile | null;
  relay_point_profile?: RelayPointProfile | null;
  phone?:                 string | null;
  bio?:                   string | null;
  avatar_url?:            string | null;
  newsletter_subscribed?: boolean;
  sms_notifications?:     boolean;
  // Fidélité client
  loyalty_points?:        number;
  loyalty_tier?:          string;
}

export interface CourierProfile {
  id: number;
  delivery_organization?: number | null;
  delivery_organization_name?: string | null;
  phone: string;
  city: string;
  zones: string[];
  vehicle_type: "MOTORBIKE" | "CAR" | "BIKE" | "TRICYCLE" | "VAN";
  id_card: string;
  preferred_language?: "fr" | "en";
  gps_permission_granted?: boolean;
  camera_permission_granted?: boolean;
  is_active: boolean;
  is_approved: boolean;
  is_online: boolean;
  created_at: string;
  updated_at: string;
}

export interface DeliveryOrganizationProfile {
  id: number;
  company_name: string;
  manager_name: string;
  phone: string;
  city: string;
  zones: string[];
  address: string;
  contract_reference: string;
  status: "PENDING" | "APPROVED" | "SUSPENDED";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RelayPointProfile {
  id: number;
  name: string;
  manager_name: string;
  phone: string;
  city: string;
  zones: string[];
  address: string;
  relay_code: string;
  opening_hours: string;
  storage_capacity: number;
  status: "PENDING" | "APPROVED" | "SUSPENDED";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CourierApplicationPayload {
  phone: string;
  city: string;
  zones: string[];
  vehicle_type: "MOTORBIKE" | "CAR" | "BIKE" | "TRICYCLE" | "VAN";
  id_card: string;
}

export interface CourierApplicationResponse {
  application: CourierProfile | null;
  status: "not_applied" | "pending" | "approved";
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
    return http<User>('/api/auth/me/');
  },

  /**
   * Récupérer le profil complet
   */
  getProfile: async (): Promise<User> => {
    return http<User>('/api/auth/profile/');
  },

  /**
   * Mettre à jour le profil
   */
  updateProfile: async (data: UpdateProfileData): Promise<User> => {
    return http<User>('/api/auth/profile/update/', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  uploadAvatar: async (file: File): Promise<User> => {
    const body = new FormData();
    body.append('avatar', file);

    return http<User>('/api/auth/profile/avatar/', {
      method: 'POST',
      body,
    });
  },

  removeAvatar: async (): Promise<User> => {
    return http<User>('/api/auth/profile/avatar/', {
      method: 'DELETE',
    });
  },

  getCourierApplication: async (): Promise<CourierApplicationResponse> => {
    return http<CourierApplicationResponse>('/api/auth/courier/application/');
  },

  applyCourier: async (data: CourierApplicationPayload): Promise<CourierApplicationResponse> => {
    return http<CourierApplicationResponse>('/api/auth/courier/application/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateCourierApplication: async (data: Partial<CourierApplicationPayload>): Promise<CourierApplicationResponse> => {
    return http<CourierApplicationResponse>('/api/auth/courier/application/', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};
