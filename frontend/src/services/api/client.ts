// frontend/src/services/api/client.ts
// Client API pour interagir avec le backend Relaya Marketplace

// Configuration du client API
const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000")
  .replace(/\/api\/?$/, "")
  .replace(/\/$/, "");

function normalizeEndpoint(endpoint: string): string {
  if (endpoint.startsWith("http")) {
    return endpoint;
  }

  if (endpoint.startsWith("/api/")) {
    return endpoint;
  }

  if (endpoint.startsWith("/")) {
    return `/api${endpoint}`;
  }

  return `/api/${endpoint}`;
}

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
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

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return null;

  try {
    const response = await fetchWithNetworkRetry(`${API_BASE_URL}/api/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      return null;
    }

    const data = await response.json();
    localStorage.setItem('access_token', data.access);
    return data.access;
  } catch {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    return null;
  }
}

async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options;
  
  // Construire l'URL avec les query params
  let url = `${API_BASE_URL}${normalizeEndpoint(endpoint)}`;
  if (params) {
    const cleanParams = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => [key, String(value)]);
    
    if (cleanParams.length > 0) {
      const queryString = new URLSearchParams(cleanParams).toString();
      url += `?${queryString}`;
    }
  }

  // Récupérer le token d'authentification depuis le stockage local
const isFormData = typeof FormData !== 'undefined' && fetchOptions.body instanceof FormData;
const headers: Record<string, string> = {};

// Ajouter les headers personnalisés
if (fetchOptions.headers) {
  Object.assign(headers, fetchOptions.headers);
}

if (!isFormData && !headers['Content-Type']) {
  headers['Content-Type'] = 'application/json';
}

const token = localStorage.getItem('access_token');
if (token) headers['Authorization'] = `Bearer ${token}`;

let response: Response;
try {
  response = await fetchWithNetworkRetry(url, {
    ...fetchOptions,
    headers,
  });
} catch (error) {
  if (isTransientNetworkError(error)) {
    throw new Error("Connexion interrompue. Vérifiez votre réseau puis réessayez.");
  }
  throw error;
}

  if (response.status === 401 && localStorage.getItem('refresh_token')) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      try {
        response = await fetchWithNetworkRetry(url, {
          ...fetchOptions,
          headers,
        });
      } catch (error) {
        if (isTransientNetworkError(error)) {
          throw new Error("Connexion interrompue. Vérifiez votre réseau puis réessayez.");
        }
        throw error;
      }
    }
  }

  if (!response.ok) {
    await response.text().catch(() => "");
    throw new Error(friendlyHttpError(response.status));
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string, options?: FetchOptions) =>
    apiFetch<T>(endpoint, { ...options, method: "GET" }),
  
  post: <T>(endpoint: string, data?: unknown, options?: FetchOptions) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(data),
    }),
  
  put: <T>(endpoint: string, data?: unknown, options?: FetchOptions) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: "PUT",
      body: JSON.stringify(data),
    }),
  
  delete: <T>(endpoint: string, options?: FetchOptions) =>
    apiFetch<T>(endpoint, { ...options, method: "DELETE" }),
};
