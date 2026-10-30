// Règles pures de l'accès au relais (PR-03 : invitation, candidature, connexion), sur PARAMETRES.acces : lues par les
// écrans (pages/PR-03) et par la démonstration du serveur (demo/acces, demo/session).
import { PARAMETRES } from './registre'

const ACCES = PARAMETRES.acces

/** Le numéro (9 chiffres, sans +237) correspond-il à l'opérateur ? Préfixe à 2 chiffres (« 67 ») ou 3 (« 650 »). */
export function prefixeValide(operateur: 'mtn' | 'orange', numero: string): boolean {
  const n = numero.replace(/\D/g, '').replace(/^237/, '')
  if (!/^6\d{8}$/.test(n)) return false
  return ACCES.prefixes[operateur].some((p) => n.startsWith(p))
}

/** Numéro camerounais de 9 chiffres commençant par 6 (téléphone mobile). */
export const numeroValide = (numero: string) => /^6\d{8}$/.test(numero.replace(/\D/g, '').replace(/^237/, ''))

/** PIN trop simple (INV-02) : une seule répétition (000000), une suite montante ou descendante (123456, 654321). */
export function pinTropSimple(pin: string): boolean {
  if (/^(\d)\1+$/.test(pin)) return true
  const monte = '0123456789012'
  const descend = '9876543210987'
  return monte.includes(pin) || descend.includes(pin)
}
