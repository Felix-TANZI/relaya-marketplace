// frontend/src/services/api/client.ts
// Client API pour interagir avec le backend Relaya Marketplace

// Configuration du client API
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options;
  
  // Construire l'URL avec les query params (FILTRER les undefined/null)
  let url = `${API_BASE_URL}${endpoint}`;
  if (params) {
    // Filtrer les valeurs undefined, null ou vides
    const cleanParams = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null && value !== '') // CHANGÉ: [, value] au lieu de [_, value]
      .map(([key, value]) => [key, String(value)]);
    
    if (cleanParams.length > 0) {
      const queryString = new URLSearchParams(cleanParams).toString();
      url += `?${queryString}`;
    }
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...fetchOptions.headers,
    },
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