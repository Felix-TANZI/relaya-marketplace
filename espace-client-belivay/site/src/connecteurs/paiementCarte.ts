// Paiement par carte : tokenisation dans le navigateur (CAP-24, PCI DSS). Le numéro complet et le code au dos
// (CVC) ne quittent jamais le navigateur vers BelivaY et n'entrent jamais dans la source (src/donnees/source.ts) :
// les écrans appellent tokeniser() au moment de payer ou d'enregistrer, puis ne transmettent que le résultat
// (CarteJeton : jeton du prestataire, marque, 4 derniers chiffres, expiration, BIN de 6 à 8 chiffres pour le
// contrôle de cohérence diaspora, pays d'émission quand le prestataire le donne).
//
// Fournisseur (VITE_CARTE_FOURNISSEUR, src/config/env.ts) :
// - « demo » (défaut) : jeton simulé « tok_demo_… », calculé ici (empreinte non réversible du numéro et de
//   l'expiration : la même carte donne le même jeton, ce qui permet de reconnaître une carte déjà enregistrée) ;
// - « cinetpay » ou « flutterwave » : SDK du prestataire chargé à la demande (premier paiement par carte), avec la
//   clé PUBLIABLE VITE_CARTE_CLE_PUBLIQUE. L'appel de tokenisation propre au SDK reste à brancher avec le compte
//   marchand (voir CONNECTEURS.md) : en attendant, tokeniser() lève ErreurCarte('indisponible') et l'écran le dit.
// Apple Pay et Google Pay : jetonExpress() donne le jeton du portefeuille du téléphone (démonstration : simulé).
import { connecteurs } from '../config/env'
import type { CarteBancaire, CarteJeton } from '../donnees/source'
import { signalerErreur } from './suivi'

/** Ce que le client tape. Reste dans le navigateur : seul tokeniser() le lit. */
export interface SaisieCarte {
  numero: string // chiffres, espaces permis
  expire: string // « MM/AA »
  cvc: string
}

export type RaisonCarte = 'invalide' | 'refusee' | 'indisponible'
export class ErreurCarte extends Error {
  readonly raison: RaisonCarte
  constructor(raison: RaisonCarte, message?: string) {
    super(message ?? `Carte : ${raison}`)
    this.name = 'ErreurCarte'
    this.raison = raison
  }
}

// Message montré au client quand la tokenisation échoue (rien n'est débité, rien n'est envoyé).
export const MESSAGE_CARTE: Record<RaisonCarte, string> = {
  invalide: 'Ce numéro de carte semble mal tapé.',
  refusee: 'Ta carte a été refusée par le prestataire de paiement : rien n’a été débité.',
  indisponible: 'Le paiement par carte est momentanément indisponible : rien n’a été débité. Réessaie dans un instant.',
}
export const messageCarte = (e: unknown) => MESSAGE_CARTE[e instanceof ErreurCarte ? e.raison : 'indisponible']

const marqueDe = (n: string): 'Visa' | 'Mastercard' | null => (/^4/.test(n) ? 'Visa' : /^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(n) ? 'Mastercard' : null)

// BIN permis par PCI DSS : 8 premiers chiffres pour un numéro de 16 chiffres ou plus, sinon 6.
export const binDe = (n: string) => n.slice(0, n.length >= 16 ? 8 : 6)

// Empreinte FNV-1a 64 bits (démonstration seulement) : non réversible, stable pour une même carte.
function empreinte(t: string): string {
  let h = 0xcbf29ce484222325n
  for (let i = 0; i < t.length; i++) h = BigInt.asUintN(64, (h ^ BigInt(t.charCodeAt(i))) * 0x100000001b3n)
  return h.toString(36)
}

// ——— Prestataires réels : SDK chargé une seule fois, à la demande ———
interface Prestataire {
  sdk: string
  tokeniser: (cle: string, s: SaisieCarte) => Promise<{ jeton: string; pays?: string }>
}
const aBrancher = (nom: string) => async (): Promise<never> => {
  throw new ErreurCarte('indisponible', `${nom} : tokenisation à brancher avec le compte marchand (CONNECTEURS.md)`)
}
const PRESTATAIRES: Record<'cinetpay' | 'flutterwave', Prestataire> = {
  cinetpay: { sdk: 'https://cdn.cinetpay.com/seamless/main.js', tokeniser: aBrancher('CinetPay') },
  flutterwave: { sdk: 'https://checkout.flutterwave.com/v3.js', tokeniser: aBrancher('Flutterwave') },
}
const sdkCharges: Record<string, Promise<void>> = {}
function chargerSdk(url: string): Promise<void> {
  return (sdkCharges[url] ??= new Promise<void>((ok, ko) => {
    const s = document.createElement('script')
    s.src = url
    s.async = true
    const delai = setTimeout(() => ko(new ErreurCarte('indisponible', 'SDK carte : délai dépassé')), 15_000)
    s.onload = () => (clearTimeout(delai), ok())
    s.onerror = () => (clearTimeout(delai), ko(new ErreurCarte('indisponible', 'SDK carte : script non chargé')))
    document.head.appendChild(s)
  }).catch((e: unknown) => {
    delete sdkCharges[url]
    throw e
  }))
}

/** Tokenise la carte saisie : seul ce résultat sort du formulaire. */
export async function tokeniser(s: SaisieCarte): Promise<CarteBancaire> {
  const n = s.numero.replace(/\D/g, '')
  const marque = marqueDe(n)
  if (!marque || n.length < 13 || !/^\d{2}\/\d{2}$/.test(s.expire) || !/^\d{3,4}$/.test(s.cvc)) throw new ErreurCarte('invalide')
  const base = { marque, derniers: n.slice(-4), expire: s.expire, bin: binDe(n) }
  const { fournisseur, clePublique } = connecteurs.carte
  if (fournisseur === 'demo' || !clePublique) return { ...base, jeton: 'tok_demo_' + empreinte(n + '|' + s.expire) }
  const p = PRESTATAIRES[fournisseur]
  try {
    await chargerSdk(p.sdk)
    const r = await p.tokeniser(clePublique, s)
    return { ...base, jeton: r.jeton, ...(r.pays ? { pays: r.pays } : {}) }
  } catch (e) {
    signalerErreur(e, 'connecteur', { connecteur: 'carte', fournisseur })
    throw e instanceof ErreurCarte ? e : new ErreurCarte('indisponible')
  }
}

/** Apple Pay, Google Pay : jeton du portefeuille du téléphone (démonstration : simulé, stable par portefeuille). */
export async function jetonExpress(m: 'apple' | 'google'): Promise<CarteJeton> {
  const marque = m === 'apple' ? 'Apple Pay' : 'Google Pay'
  if (connecteurs.carte.fournisseur !== 'demo') throw new ErreurCarte('indisponible', `${marque} : à brancher avec le prestataire (CONNECTEURS.md)`)
  return { jeton: `tok_demo_${m}`, marque, derniers: '', expire: '', bin: '' }
}
