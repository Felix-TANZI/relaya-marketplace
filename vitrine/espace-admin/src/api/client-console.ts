// Client HTTP de la console en mode API (VITE_SOURCE=api), partagé par la source (src/api/source-api.ts) et « Mon compte »
// (src/donnees/mon-compte.ts) : un seul client, donc un seul rafraîchissement de jeton à la fois. Aussi : l'identifiant
// opaque de l'appareil (envoyé dans le corps des routes de connexion : l'en-tête X-Device-Id n'est pas permis d'une autre
// origine) et le jeton de l'étape 1 de la connexion (mot de passe ou lien par e-mail), gardé en mémoire de l'onglet
// jusqu'au second facteur.
import { clientDeLEnvironnement, cleIdempotence, type ClientApi } from '@client/api/client'

let client: ClientApi | null | undefined

/** Le client de l'environnement (null en démonstration : pas de serveur). */
export function clientConsole(): ClientApi | null {
  if (client === undefined) client = clientDeLEnvironnement()
  return client
}

const CLE_APPAREIL = 'blv_appareil'
let appareilMemoire: string | null = null

/** Identifiant opaque de cet appareil (le même que celui du client, « blv_appareil »), tiré une fois. */
export function appareilConsole(): string {
  try {
    let id = localStorage.getItem(CLE_APPAREIL)
    if (!id) {
      id = cleIdempotence()
      localStorage.setItem(CLE_APPAREIL, id)
    }
    return id
  } catch {
    return (appareilMemoire ??= cleIdempotence())
  }
}

const CLE_ETAPE = 'blv_a_etape'
let etapeMemoire: string | null = null

/** Jeton de l'étape 1 réussie (il attend le second facteur) ; dans l'onglet seulement. */
export const etapeConnexion = {
  lire(): string | null {
    try {
      return sessionStorage.getItem(CLE_ETAPE) ?? etapeMemoire
    } catch {
      return etapeMemoire
    }
  },
  ecrire(jeton: string | null) {
    etapeMemoire = jeton
    try {
      if (jeton) sessionStorage.setItem(CLE_ETAPE, jeton)
      else sessionStorage.removeItem(CLE_ETAPE)
    } catch {
      /* stockage bloqué : la mémoire de la page suffit */
    }
  },
}
