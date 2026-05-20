// frontend/src/services/api/http.ts
// Helper HTTP avec refresh token automatique

// En production, on utilise une URL relative (chaîne vide) car tout passe par le même nginx
// En développement, on utilise l'URL complète du backend
const API_BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/api\/?$/, '');

interface RequestConfig extends RequestInit {
  headers?: Record<string, string>;
}

function isTransientNetworkError(error: unknown) {
  return error instanceof TypeError && /failed to fetch|network/i.test(error.message);
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function friendlyHttpError(status: number) {
  if (status === 401) return "Votre session a expiré. Reconnectez-vous pour continuer.";
  if (status === 403) return "Vous n'avez pas l'autorisation d'effectuer cette action.";
  if (status === 404) return "Cette ressource est momentanément indisponible.";
  if (status >= 500) return "Le service rencontre un problème. Réessayez dans un instant.";
  return "Impossible de terminer cette action pour le moment.";
}

async function fetchWithNetworkRetry(input: RequestInfo | URL, init?: RequestInit) {
  const delays = [450, 1200];
  let lastError: unknown;

  for (let attempt = 0; attempt <= delays.length; attempt += 1) {
    try {
      return await fetch(input, init);
    } catch (error) {
      lastError = error;
      if (!isTransientNetworkError(error) || attempt === delays.length) break;
      await wait(delays[attempt]);
    }
  }

  throw lastError;
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
    const response = await fetchWithNetworkRetry(`${API_BASE_URL}/api/auth/refresh/`, {
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
  // Si l'endpoint est une URL complète, l'utiliser directement
  // Sinon, construire l'URL avec la base (qui peut être vide en prod)
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `${API_BASE_URL}${endpoint}`;

  const isFormData = typeof FormData !== 'undefined' && config.body instanceof FormData;
  const headers: Record<string, string> = {
    ...config.headers,
  };

  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  // Ajouter le token si présent
  const token = localStorage.getItem('access_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetchWithNetworkRetry(url, {
      ...config,
      headers,
    });

    // Si 401 et qu'on a un refresh token, on tente de rafraîchir
    if (response.status === 401 && localStorage.getItem('refresh_token')) {
      const newToken = await refreshAccessToken();
      
      if (newToken) {
        // Retry la requête avec le nouveau token
        headers['Authorization'] = `Bearer ${newToken}`;
        const retryResponse = await fetchWithNetworkRetry(url, {
          ...config,
          headers,
        });

        if (!retryResponse.ok) {
          await retryResponse.text().catch(() => "");
          throw new Error(friendlyHttpError(retryResponse.status));
        }

        if (retryResponse.status === 204) {
          return undefined as T;
        }

        return retryResponse.json();
      }
    }

    if (!response.ok) {
      await response.text().catch(() => "");
      throw new Error(friendlyHttpError(response.status));
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  } catch (error) {
    if (isTransientNetworkError(error)) {
      throw new Error("Connexion interrompue. Vérifiez votre réseau puis réessayez.");
    }
    throw error;
  }
}
