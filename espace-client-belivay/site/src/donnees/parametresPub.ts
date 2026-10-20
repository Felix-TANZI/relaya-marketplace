// Paramètres publicitaires lus dans le registre en vigueur (DP-59 : logique-metier/parametres-en-vigueur.json), pas
// dans des constantes : durée d'attribution d'une vente, durée d'une visite, produits de l'encart ordinateur.
import registre from '../../../logique-metier/parametres-en-vigueur.json'

const valeur = (code: string): string => (registre.parametres as { code: string; valeur: string }[]).find((p) => p.code === code)?.valeur ?? ''
const premierNombre = (code: string, defaut: number) => Number(/\d+/.exec(valeur(code))?.[0] ?? defaut)

export const JOUR_MS = 24 * 3600_000
/** VD-PUB-ATTRIBUTION : jours après le dernier clic pendant lesquels une vente est comptée à l'annonce. */
export const ATTRIBUTION_MS = premierNombre('VD-PUB-ATTRIBUTION', 7) * JOUR_MS
/** VD-PUB-VISITE : minutes sans activité qui terminent une visite (une impression comptée par visite). */
export const VISITE_MS = premierNombre('VD-PUB-VISITE', 30) * 60_000
/** VD-PUB-ENCART : produits de l'encart ordinateur permis (après le « ; »). */
export const ENCART_PERMIS = [...(valeur('VD-PUB-ENCART').split(';')[1] ?? '').matchAll(/\d+/g)].map((m) => Number(m[0]))
export const ENCART_DEFAUT = premierNombre('VD-PUB-ENCART', 4)
