// Le traducteur du contenu saisi par les gens, tel que les écrans l'emploient (détails et branchement du vrai
// fournisseur : traducteur.ts). Choisi par l'interrupteur unique VITE_SOURCE (config/env.ts) :
// - « api » : le serveur de BelivaY (POST {VITE_API_URL}/translate ; la clé du prestataire reste sur le serveur) ;
// - « demo » : le traducteur de démonstration (src/demo/traducteur-demo.ts).
// Retirer la démo : supprimer la ligne d'import ci-dessous et la branche `demo` (RETIRER-LA-DEMO.md).
import { env } from '../config/env'
import { traducteurDemo } from '../demo/traducteur-demo' // DÉMONSTRATION : à retirer avec src/demo
import { avecCache, traducteurServeur, type Traducteur } from './traducteur'

export * from './traducteur'

const choisi: Traducteur = env.source === 'api' && env.apiUrl ? traducteurServeur(env.apiUrl) : traducteurDemo
export const traducteur = avecCache(choisi)
