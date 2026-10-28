// Fonction Vercel unique des comptes réels (un seul fichier : le plan gratuit de Vercel limite le nombre de
// fonctions). vercel.json réécrit /api/<chemin> vers /api/comptes?chemin=<chemin> ; le routeur (serveur/routeur.js)
// décide. Base : Neon Postgres (DATABASE_URL ou POSTGRES_URL, ajoutés par Vercel Storage) ; sans elle, les routes
// répondent 503 « base_absente » et les applications gardent le compte de démonstration (site/COMPTES-REELS.md).
import { adresseBase, baseNeon } from '../serveur/base.js'
import { envoyeurDeLEnvironnement } from '../serveur/envoyeur.js'
import { creerRouteur } from '../serveur/routeur.js'

const traiter = creerRouteur({
  base: async () => {
    const url = adresseBase()
    return url ? baseNeon(url) : null
  },
  envoyeur: envoyeurDeLEnvironnement(),
})

export const GET = traiter
export const POST = traiter
export const PATCH = traiter
export const DELETE = traiter
