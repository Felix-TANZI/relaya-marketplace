const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

function decodeJwtPayload(token: string): { exp?: number } | null {
  const [, payload] = token.split(".");
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    return JSON.parse(window.atob(padded));
  } catch {
    return null;
  }
}

function isExpiredJwt(token: string) {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  return Date.now() >= payload.exp * 1000 - 5000;
}

export function clearStoredAuthTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function getStoredAccessToken() {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) return null;

  if (isExpiredJwt(token)) {
    clearStoredAuthTokens();
    return null;
  }

  return token;
}

export function getStoredRefreshToken() {
  const token = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!token) return null;

  if (isExpiredJwt(token)) {
    clearStoredAuthTokens();
    return null;
  }

  return token;
}

export function hasValidAccessToken() {
  return Boolean(getStoredAccessToken());
}
