// Prise des fournisseurs d'identité (« Continuer avec Google », « Continuer avec Apple ») en mode API : obtient le jeton
// d'identité du fournisseur, que le serveur vérifie (POST /api/vendors/auth/provider, apps.client_accounts.identite).
// - Google Identity Services (https://accounts.google.com/gsi/client), identifiant VITE_GOOGLE_CLIENT_ID ;
// - Sign in with Apple JS (https://appleid.cdn-apple.com/…/appleid.auth.js), identifiant VITE_APPLE_CLIENT_ID.
// Sans identifiant (essai, développement) : null, et l'écran dit que la connexion par ce fournisseur est indisponible.
// Le vendeur qui ferme la fenêtre du fournisseur : null aussi (rien n'est envoyé).

type Fournisseur = 'google' | 'apple'

const SCRIPTS: Record<Fournisseur, string> = {
  google: 'https://accounts.google.com/gsi/client',
  apple: 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/fr_FR/appleid.auth.js',
}

const identifiant = (f: Fournisseur): string => {
  const v = (f === 'google' ? import.meta.env.VITE_GOOGLE_CLIENT_ID : import.meta.env.VITE_APPLE_CLIENT_ID) as string | undefined
  return (v ?? '').trim()
}

/** Le fournisseur est-il branché sur ce site (identifiant public configuré) ? */
export const fournisseurBranche = (f: Fournisseur): boolean => identifiant(f) !== ''

const charges = new Map<string, Promise<void>>()
function charger(src: string): Promise<void> {
  let p = charges.get(src)
  if (!p) {
    p = new Promise<void>((ok, ko) => {
      const s = document.createElement('script')
      s.src = src
      s.async = true
      s.onload = () => ok()
      s.onerror = () => (charges.delete(src), ko(new Error('script')))
      document.head.appendChild(s)
    })
    charges.set(src, p)
  }
  return p
}

interface FenetreFournisseurs {
  google?: { accounts: { id: { initialize(o: object): void; prompt(cb?: (n: { isNotDisplayed(): boolean; isSkippedMoment(): boolean }) => void): void } } }
  AppleID?: { auth: { init(o: object): void; signIn(): Promise<{ authorization: { id_token: string } }> } }
}

/** Jeton d'identité du fournisseur, ou null (non branché, refusé, fenêtre fermée, réseau). */
export async function jetonDuFournisseur(f: Fournisseur): Promise<string | null> {
  const id = identifiant(f)
  if (!id || typeof window === 'undefined') return null
  try {
    await charger(SCRIPTS[f])
  } catch {
    return null
  }
  const w = window as unknown as FenetreFournisseurs
  if (f === 'google') {
    const g = w.google?.accounts.id
    if (!g) return null
    return new Promise<string | null>((fin) => {
      g.initialize({ client_id: id, callback: (r: { credential?: string }) => fin(r.credential ?? null), cancel_on_tap_outside: true, use_fedcm_for_prompt: true })
      g.prompt((n) => {
        if (n.isNotDisplayed() || n.isSkippedMoment()) fin(null)
      })
    })
  }
  const a = w.AppleID?.auth
  if (!a) return null
  try {
    a.init({ clientId: id, scope: 'name email', redirectURI: window.location.origin + window.location.pathname, usePopup: true })
    return (await a.signIn()).authorization.id_token || null
  } catch {
    return null
  }
}
