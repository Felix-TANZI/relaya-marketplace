// frontend/src/services/api/http.ts
// Helper HTTP avec refresh token automatique

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface RequestConfig extends RequestInit {
  headers?: Record<string, string>;
}

/**
 * Rafraîchir le token JWT automatiquement
 */
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refresh_token');
  
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) {
      // Refresh token invalide, déconnecter l'utilisateur
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
      return null;
    }

    const data = await response.json();
    localStorage.setItem('access_token', data.access);
    return data.access;
  } catch (error) {
    console.error('Error refreshing token:', error);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/login';
    return null;
  }
}

/**
 * Helper HTTP avec gestion automatique des tokens
 */
export async function http<T>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...config.headers,
  };

  // Ajouter le token si présent
  const token = localStorage.getItem('access_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...config,
      headers,
    });

    // Si 401 et qu'on a un refresh token, on tente de rafraîchir
    if (response.status === 401 && localStorage.getItem('refresh_token')) {
      const newToken = await refreshAccessToken();
      
      if (newToken) {
        // Retry la requête avec le nouveau token
        headers['Authorization'] = `Bearer ${newToken}`;
        const retryResponse = await fetch(url, {
          ...config,
          headers,
        });

        if (!retryResponse.ok) {
          const errorData = await retryResponse.text();
          throw new Error(`HTTP ${retryResponse.status} - ${errorData}`);
        }

        if (retryResponse.status === 204) {
          return undefined as T;
        }

        return retryResponse.json();
      }
    }

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`HTTP ${response.status} - ${errorData}`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  } catch (error) {
    console.error('HTTP Error:', error);
    throw error;
  }
}