const CACHE_PREFIX = "cache_";

type CacheEnvelope<T> = {
  data: T;
  storedAt: number;
  ttl: number;
};

export type OfflineCacheStats = {
  entries: number;
  oldest: Date | null;
  newest: Date | null;
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function getOfflineCacheTTL(key: string) {
  const normalized = key.toLowerCase();
  if (
    ["detail", "station", "booking_detail", "product/"].some((part) => normalized.includes(part))
    || /\/orders\/\d+\/?(?:\?|$)/.test(normalized)
  ) {
    return 4 * HOUR;
  }
  if (["dashboard", "trips_list", "bookings", "history", "orders", "reservations"].some((part) => normalized.includes(part))) {
    return 30 * MINUTE;
  }
  if (["profile", "classes", "subscription", "vehicles", "vendors/me"].some((part) => normalized.includes(part))) {
    return 7 * DAY;
  }
  return DAY;
}

function storageKey(key: string) {
  return `${CACHE_PREFIX}${key}`;
}

export function writeOfflineCache<T>(key: string, data: T) {
  try {
    const envelope: CacheEnvelope<T> = {
      data,
      storedAt: Date.now(),
      ttl: getOfflineCacheTTL(key),
    };
    localStorage.setItem(storageKey(key), JSON.stringify(envelope));
    window.dispatchEvent(new Event("belivay-cache-updated"));
  } catch {
    // Le quota ou le stockage privé ne doivent jamais bloquer l'appel API.
  }
}

export function readOfflineCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(storageKey(key));
    if (!raw) return null;
    const envelope = JSON.parse(raw) as CacheEnvelope<T>;
    if (!envelope || typeof envelope.storedAt !== "number" || typeof envelope.ttl !== "number") {
      localStorage.removeItem(storageKey(key));
      return null;
    }
    if (Date.now() - envelope.storedAt > envelope.ttl) {
      localStorage.removeItem(storageKey(key));
      return null;
    }
    return envelope.data;
  } catch {
    return null;
  }
}

export function clearOfflineCache() {
  Object.keys(localStorage)
    .filter((key) => key.startsWith(CACHE_PREFIX))
    .forEach((key) => localStorage.removeItem(key));
  window.dispatchEvent(new Event("belivay-cache-updated"));
}

export function getOfflineCacheStats(): OfflineCacheStats {
  const timestamps: number[] = [];
  let entries = 0;
  Object.keys(localStorage)
    .filter((key) => key.startsWith(CACHE_PREFIX))
    .forEach((key) => {
      try {
        const envelope = JSON.parse(localStorage.getItem(key) || "null") as CacheEnvelope<unknown> | null;
        if (envelope && typeof envelope.storedAt === "number") {
          entries += 1;
          timestamps.push(envelope.storedAt);
        }
      } catch {
        // Une entrée invalide n'est pas comptée.
      }
    });
  return {
    entries,
    oldest: timestamps.length ? new Date(Math.min(...timestamps)) : null,
    newest: timestamps.length ? new Date(Math.max(...timestamps)) : null,
  };
}

export function notifyOfflineFallback() {
  window.dispatchEvent(new Event("belivay-offline-fallback"));
}
