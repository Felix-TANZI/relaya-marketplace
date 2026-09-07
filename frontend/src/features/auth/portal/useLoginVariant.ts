import { useState } from 'react';

/**
 * Choix aleatoire du modele de page de connexion client.
 *
 * Trois maquettes existent pour /login cote client. On veut qu'un visiteur
 * tombe sur l'une ou l'autre sans regularite perceptible, mais JAMAIS pendant
 * qu'il remplit le formulaire. Trois garde-fous pour ca :
 *
 * 1. `sessionPick` — le tirage est fait une seule fois par chargement d'onglet
 *    et memorise dans le module. Aucun rendu, changement de theme, saisie,
 *    navigation SPA ou expiration de duree ne peut le modifier : la page ne
 *    change pas sous les doigts de l'utilisateur, et revenir sur /login dans
 *    la meme session affiche le meme modele.
 * 2. Une duree de vie aleatoire (25 min a 3 jours, tiree au hasard a chaque
 *    fois) est stockee avec le choix. Tant qu'elle court, un nouvel onglet
 *    reprend le meme modele ; passee cette duree, le prochain chargement
 *    retire. Le moment du changement n'est donc ni fixe ni devinable.
 * 3. `SURPRISE_RATE` — meme si la duree court encore, un chargement sur huit
 *    environ ignore le choix memorise et retire. C'est ce qui empeche de
 *    deduire une periodicite en observant le site.
 *
 * Le tirage exclut toujours le modele precedent : deux visites qui changent de
 * modele ne retombent pas sur le meme, ce qui rend la variete plus visible
 * qu'un tirage uniforme (ou l'on peut tirer trois fois d'affilee le meme).
 */

const STORAGE_KEY = 'belivay-login-hero';
const MIN_TTL_MS = 25 * 60 * 1000;
const MAX_TTL_MS = 3 * 24 * 60 * 60 * 1000;
const SURPRISE_RATE = 0.12;

/** Aleatoire cryptographique quand il est disponible (moins previsible que Math.random). */
function random(): number {
  const c = globalThis.crypto;
  if (c?.getRandomValues) {
    const buffer = new Uint32Array(1);
    c.getRandomValues(buffer);
    return buffer[0] / 2 ** 32;
  }
  return Math.random();
}

function pickOther<T>(options: readonly T[], exclude: T | null): T {
  const pool = options.length > 1 && exclude !== null
    ? options.filter((option) => option !== exclude)
    : options;
  return pool[Math.floor(random() * pool.length)] ?? options[0];
}

interface StoredPick<T> {
  key: T;
  until: number;
}

function readStored<T extends string>(keys: readonly T[]): StoredPick<T> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredPick<T>>;
    if (typeof parsed.key !== 'string' || !keys.includes(parsed.key as T)) return null;
    if (typeof parsed.until !== 'number') return null;
    return { key: parsed.key as T, until: parsed.until };
  } catch {
    // localStorage indisponible (navigation privee, quota) : on tire a chaque fois.
    return null;
  }
}

function writeStored<T extends string>(pick: StoredPick<T>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pick));
  } catch {
    /* sans stockage, le modele change simplement a chaque chargement */
  }
}

/** Tirage memorise pour toute la duree de vie de l'onglet. */
let sessionPick: string | null = null;

function resolve<T extends string>(keys: readonly T[]): T {
  if (sessionPick && keys.includes(sessionPick as T)) return sessionPick as T;

  const stored = readStored(keys);
  const now = Date.now();
  const keepStored = stored !== null && stored.until > now && random() > SURPRISE_RATE;

  const key = keepStored ? stored!.key : pickOther(keys, stored?.key ?? null);
  const until = keepStored
    ? stored!.until
    : now + MIN_TTL_MS + random() * (MAX_TTL_MS - MIN_TTL_MS);

  sessionPick = key;
  writeStored({ key, until });
  return key;
}

/**
 * Rend le modele tire au sort, stable pour toute la vie du composant.
 *
 * `useState` avec initialiseur paresseux : la fonction n'est evaluee qu'au
 * premier rendu, et le tirage reel est de toute facon memorise dans le module.
 */
export function useLoginVariant<T extends string>(keys: readonly T[]): T {
  const [key] = useState(() => resolve(keys));
  return key;
}
