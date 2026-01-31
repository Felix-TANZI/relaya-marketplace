// frontend/src/services/api/client.ts
// Client API pour interagir avec le backend Relaya Marketplace

// Configuration du client API
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options;
  
  // Construire l'URL avec les query params
  let url = `${API_BASE_URL}${endpoint}`;
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
const token = localStorage.getItem('access_token');
const headers: Record<string, string> = {
  "Content-Type": "application/json",
};

// Ajouter les headers personnalisés
if (fetchOptions.headers) {
  Object.assign(headers, fetchOptions.headers);
}

// Ajouter le token si présent
if (token) {
  headers['Authorization'] = `Bearer ${token}`;
}

const response = await fetch(url, {
  ...fetchOptions,
  headers,
});

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    console.error('API Error Details:', errorData);
    throw new Error(`API Error: ${response.status} ${response.statusText}${errorData ? ` - ${JSON.stringify(errorData)}` : ''}`);
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