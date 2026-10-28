// Mode API (VITE_SOURCE=api) : les gestes du kit « compte » (@client/compte) passent par le serveur. La démonstration
// garde le kit tel quel (son état vit sur l'appareil : boîte de réception simulée, compte Google du téléphone).
// - Lien de connexion par e-mail : POST /auth/email-link (même réponse que l'adresse ait une boutique ou non), puis le
//   lien reçu ouvre /vendeur/connexion?lien=… (POST /auth/email-link/verify, appareil inconnu : code SMS d'abord).
// - Appareil retenu (« Se souvenir de moi ») : après une connexion, le prénom, le nom, la photo et l'e-mail du compte
//   restent sur ce téléphone ; au retour, l'e-mail suffit (« Bon retour ») et « Continuer » envoie le lien.
// - Comptes associés (Mon profil) : Google ou Apple, associés par la fenêtre du fournisseur (src/api/identite.ts) et
//   vérifiés par le serveur ; sans fournisseur branché sur ce site, l'écran le dit.
import { useState } from 'react'
import { Avatar, Ic, Note } from '@client/compte/socle'
import type { FournisseurIdentite, IdentiteAssociee } from '../../donnees/domaines/compte'
import type { IdentiteDepart } from '@client/compte/etat'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'

const CLE_RETENU = 'blv_v_compte_retenu'

/** Le compte retenu sur ce téléphone (identité de départ du kit « compte ») ; null s'il n'y en a pas. */
export function compteRetenu(): IdentiteDepart | null {
  try {
    const v = JSON.parse(localStorage.getItem(CLE_RETENU) ?? 'null') as IdentiteDepart | null
    return v && typeof v.email === 'string' && v.email ? v : null
  } catch {
    return null
  }
}

/** Retient (ou oublie, avec null) le compte qui vient de se connecter sur ce téléphone. */
export function retenirCompte(c: IdentiteDepart | null): void {
  try {
    if (c && c.email) localStorage.setItem(CLE_RETENU, JSON.stringify(c))
    else localStorage.removeItem(CLE_RETENU)
  } catch {
    /* stockage refusé : rien n'est retenu */
  }
}

/** Après une connexion réussie : le profil du compte est lu, puis retenu (« Se souvenir de moi ») ou oublié. */
export async function apresConnexion(souvenir: boolean): Promise<void> {
  if (!souvenir) return retenirCompte(null)
  const p = await source.compte.profil().catch(() => null)
  if (p?.email) retenirCompte({ prenom: p.prenom, nom: p.nom, telephone: p.telephone.replace(/\D/g, '').slice(-9), email: p.email, photo: p.photo })
}

const masquer = (e: string) => {
  const [a, d] = e.split('@')
  return d ? `${a[0]}•••••@${d}` : e
}

/** « Recevoir un lien de connexion par e-mail » : le serveur l'envoie, l'écran dit où et combien de temps. */
export function LienParEmail({ email, souvenir }: { email: string; souvenir: boolean }) {
  const { t, tf } = usePreferences()
  const [envoye, setEnvoye] = useState<{ destination: string; minutes: number } | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)
  const envoyer = async () => {
    if (enCours) return
    setEnCours(true)
    const r = await source.session.demanderLienConnexion(email.trim()).catch(() => null)
    setEnCours(false)
    if (!r) return setErreur(t('Le lien n’a pas pu partir : vérifiez votre connexion, puis réessayez.'))
    if (!r.ok) return setErreur(t('Écrivez d’abord votre adresse e-mail.'))
    setErreur(null)
    setEnvoye({ destination: r.destination, minutes: r.valideMinutes })
    try {
      localStorage.setItem('blv_v_souvenir', souvenir ? 'oui' : 'non')
    } catch {
      /* rien */
    }
  }
  return (
    <>
      {!envoye ? (
        <button type="button" className="ck-btn sec plein" data-ck="lien-magique" onClick={() => void envoyer()} aria-disabled={enCours || undefined}>
          <Ic n="mail" />
          {t(enCours ? 'Envoi…' : 'Recevoir un lien de connexion par e-mail')}
        </button>
      ) : (
        <div className="ck-card" role="status" data-ck="lien-envoye">
          <Note ton="ok" icone="mail">
            {tf('Si une boutique correspond, un lien de connexion part à {e}. Il vaut {n} minutes et ne sert qu’une fois : ouvrez-le sur ce téléphone.', { e: envoye.destination, n: envoye.minutes })}
          </Note>
          <div className="ck-actions">
            <button type="button" className="ck-btn lien" onClick={() => setEnvoye(null)}>
              {t('Changer d’adresse')}
            </button>
          </div>
        </div>
      )}
      {erreur && <Note ton="err">{erreur}</Note>}
    </>
  )
}

/** Appareil retenu : « Bon retour, {prénom} » ; Continuer envoie le lien de connexion à l'adresse du compte. */
export function CompteReconnuApi({ compte, souvenir, autre }: { compte: IdentiteDepart; souvenir: boolean; autre: () => void }) {
  const { t, tf } = usePreferences()
  return (
    <div className="ck-card" data-ck="reconnu">
      <div className="ck-tete">
        <Avatar photo={compte.photo} prenom={compte.prenom} nom={compte.nom} taille={56} label={t('Photo de profil')} />
        <div style={{ minWidth: 0 }}>
          <div className="ck-nom">{tf('Bon retour, {p}', { p: compte.prenom })}</div>
          <div className="ck-sous">{masquer(compte.email ?? '')}</div>
        </div>
      </div>
      <div className="ck-pile" style={{ marginTop: 12 }}>
        <LienParEmail email={compte.email ?? ''} souvenir={souvenir} />
        <button type="button" className="ck-btn lien plein" onClick={autre}>
          {t('Ce n’est pas moi')}
        </button>
      </div>
      <Note icone="shield-check">{t('Cet appareil est retenu : votre e-mail suffit.')}</Note>
    </div>
  )
}

const NOMS: Record<FournisseurIdentite, string> = { google: 'Google', apple: 'Apple' }

/** Comptes associés (Mon profil) : Google et Apple, par le serveur. */
export function ComptesAssocies() {
  const { t, tf } = usePreferences()
  const liste = useLecture(() => source.compte.identites(), [])
  const [message, setMessage] = useState<{ ton: 'ok' | 'err'; texte: string } | null>(null)
  const [enCours, setEnCours] = useState<FournisseurIdentite | null>(null)
  const associees = liste.donnees ?? []
  const associer = async (f: FournisseurIdentite) => {
    setEnCours(f)
    const r = await source.compte.associer(f).catch(() => null)
    setEnCours(null)
    if (r?.ok) return setMessage({ ton: 'ok', texte: tf('Compte {f} associé : vous pourrez vous connecter avec lui.', { f: NOMS[f] }) })
    const raison = r ? r.raison : null
    setMessage({
      ton: 'err',
      texte:
        raison === 'pris'
          ? tf('Ce compte {f} est déjà associé à une autre boutique.', { f: NOMS[f] })
          : raison === 'refuse'
            ? tf('Ce compte {f} n’a pas pu être vérifié. Réessayez.', { f: NOMS[f] })
            : tf('Connexion avec {f} indisponible pour le moment.', { f: NOMS[f] }),
    })
  }
  const dissocier = async (f: FournisseurIdentite) => {
    setEnCours(f)
    const r = await source.compte.dissocier(f).catch(() => null)
    setEnCours(null)
    if (r?.ok) return setMessage({ ton: 'ok', texte: tf('Compte {f} dissocié : votre numéro et votre mot de passe restent.', { f: NOMS[f] }) })
    setMessage({ ton: 'err', texte: t('C’est votre dernière façon de vous connecter : ajoutez-en une autre avant.') })
  }
  const ligne = (f: FournisseurIdentite) => {
    const a: IdentiteAssociee | undefined = associees.find((x) => x.fournisseur === f)
    return (
      <div key={f} className="ck-actions" data-ck={'compte-' + f} style={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="ck-sous" style={{ minWidth: 0 }}>
          <b>{NOMS[f]}</b> · {a ? a.email : t('non associé')}
        </span>
        {a ? (
          <button type="button" className="ck-btn sec petit" aria-disabled={enCours === f || undefined} onClick={() => void dissocier(f)}>
            {t('Dissocier')}
          </button>
        ) : (
          <button type="button" className="ck-btn petit" aria-disabled={enCours === f || undefined} onClick={() => void associer(f)}>
            {tf('Associer {f}', { f: NOMS[f] })}
          </button>
        )}
      </div>
    )
  }
  return (
    <>
      <Note>{t('Associez votre compte Google ou Apple : vous vous connecterez d’un geste, sans mot de passe.')}</Note>
      {ligne('google')}
      {ligne('apple')}
      {message && <Note ton={message.ton}>{message.texte}</Note>}
    </>
  )
}
