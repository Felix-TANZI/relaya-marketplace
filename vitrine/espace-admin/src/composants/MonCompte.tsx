// Mon compte (Profil) : photo de profil (galerie ou appareil photo, recadrée au cercle, ≤ 300 Ko ; changer, retirer,
// ou la photo du compte Google), nom, téléphone, e-mail, mot de passe, compte Google associé, alertes de sécurité.
// Changement sensible : un code (SMS au numéro du compte pour le nom ; code au NOUVEAU numéro ou à la NOUVELLE adresse)
// ou le mot de passe actuel, puis une notification à l'ancien canal. Mêmes libellés dans les six applications.
// Démonstration : src/donnees/mon-compte.ts (code 123456).
import { useState, type ReactNode } from 'react'
import { Feuille } from '@client/composants/Feuille'
import { ouvrirPhoto } from '@client/donnees/photo'
import { env } from '@client/config/env'
import { CODE_DEMO_COMPTE, associerGoogle, changerNom, changerPhoto, confirmerCode, demanderCode, demanderCodeNom, dissocierGoogle, estGoogle, masquerEmail, masquerTelephone, photoGoogleDemo, synchroniserGoogle, useCompte, type Issue, type RefusCompte } from '../donnees/mon-compte'
import { usePreferences } from '../preferences'
import { Icone } from './Icone'
import { Rognage, type FormeRognage } from './Rognage'

type Quoi = 'nom' | 'telephone' | 'email' | 'mdp' | 'google'

const REFUS: Record<RefusCompte, string> = {
  code: 'Code incorrect. Vérifiez les 6 chiffres reçus.',
  valeur: 'Saisie invalide : vérifiez le format.',
  mot_de_passe: 'Mot de passe actuel incorrect.',
  faible: '8 caractères au moins, dont un chiffre.',
  meme: 'C’est déjà la valeur actuelle.',
  essais: 'Trois codes incorrects : demandez un nouveau code.',
  lourde: 'Photo trop lourde : 300 Ko au plus après recadrage.',
  indisponible: 'La connexion avec Google n’est pas encore disponible.',
}

/** Bouton « choisir une photo » (galerie ou appareil photo) puis recadrage. */
export function useChoixPhoto(forme: FormeRognage, utiliser: (photo: string) => void, erreur: (e: string) => void) {
  const { t } = usePreferences()
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const choisir = async (f: File | undefined) => {
    if (!f) return
    try {
      setImg((await ouvrirPhoto(f)).img)
    } catch (e) {
      const m = e instanceof Error ? e.message : ''
      erreur(t(m === 'type' ? 'Photo refusée : JPG, PNG ou WebP seulement.' : m === 'taille' ? 'Photo trop lourde : 10 Mo au plus.' : 'Photo illisible : essayez-en une autre.'))
    }
  }
  const bouton = (libelle: string, classe = 'secondary sm', icone = 'camera') => (
    <label className={'btn ' + classe} style={{ cursor: 'pointer', position: 'relative' }}>
      <Icone nom={icone} taille={18} />
      <span>{t(libelle)}</span>
      <input type="file" accept="image/*" aria-label={t(libelle)} onChange={(e) => (void choisir(e.target.files?.[0]), (e.target.value = ''))} style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} />
    </label>
  )
  const feuille = img ? (
    <Rognage
      img={img}
      forme={forme}
      annuler={() => setImg(null)}
      utiliser={(p) => {
        setImg(null)
        utiliser(p)
      }}
    />
  ) : null
  return { bouton, feuille }
}

function ChampSecret({ libelle, valeur, changer, auto }: { libelle: string; valeur: string; changer: (v: string) => void; auto: string }) {
  const { t } = usePreferences()
  const [voir, setVoir] = useState(false)
  return (
    <label className="champ mc-secret">
      <span>{t(libelle)}</span>
      <span className="mc-secret-l">
        <input type={voir ? 'text' : 'password'} value={valeur} onChange={(e) => changer(e.target.value)} autoComplete={auto} />
        <button type="button" className="btn ghost sm" aria-label={voir ? t('Masquer le mot de passe') : t('Afficher le mot de passe')} aria-pressed={voir} onClick={() => setVoir(!voir)}>
          <Icone nom={voir ? 'eye-off' : 'eye'} taille={18} />
        </button>
      </span>
    </label>
  )
}

function Ligne({ k, v, action }: { k: string; v: ReactNode; action: ReactNode }) {
  return (
    <div className="mc-l">
      <span className="grow">
        <span className="mc-k">{k}</span>
        <span className="mc-v">{v}</span>
      </span>
      {action}
    </div>
  )
}

/**
 * id : la personne connectée ; base : ce que dit la session (nom, téléphone, e-mail) ; changerMotDePasse : la source
 * de l'espace (l'ancien est vérifié par elle) ; motDePasseLe : dernier changement connu (« modifié le … »).
 */
export function MonCompte({ id, base, changerMotDePasse }: { id: string; base: { prenom: string; nom: string; telephone: string; email: string }; changerMotDePasse: (ancien: string, nouveau: string) => Promise<Issue> }) {
  const { t, tf } = usePreferences()
  const c = useCompte(id, base)
  const [quoi, setQuoi] = useState<Quoi | null>(null)
  const [etape, setEtape] = useState<'saisie' | 'code'>('saisie')
  const [valeur, setValeur] = useState('')
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [code, setCode] = useState('')
  const [ancien, setAncien] = useState('')
  const [nouveau, setNouveau] = useState('')
  const [vers, setVers] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const photo = useChoixPhoto(
    'rond',
    (p) =>
      void changerPhoto(id, p).then((r) => {
        setInfo(r.ok ? t('Photo de profil enregistrée.') : t(REFUS[r.raison]))
      }),
    setInfo,
  )
  const ouvrir = (q: Quoi) => {
    setQuoi(q)
    setEtape('saisie')
    setValeur('')
    setCode('')
    setAncien('')
    setNouveau('')
    setErreur(null)
    setPrenom(c.prenom)
    setNom(c.nom)
  }
  const fermer = () => setQuoi(null)
  const fini = (texte: string) => {
    fermer()
    setInfo(texte)
  }
  const issue = (r: Issue, texte: string) => (r.ok ? fini(texte) : setErreur(t(REFUS[r.raison])))
  const google = c.google
  // Démonstration : un portrait dessiné pour une adresse Gmail ; avec le kit, la photo du compte Google seulement.
  const photoGoogle = google?.photo || (env.source !== 'api' && estGoogle(c.email) ? photoGoogleDemo(`${c.prenom} ${c.nom}`) : null)

  const suite = async () => {
    setErreur(null)
    if (quoi === 'nom') {
      if (etape === 'saisie') {
        if (!prenom.trim() || !nom.trim()) return setErreur(t('Le prénom et le nom sont obligatoires.'))
        // Kit : le code part par SMS au numéro du compte (à son e-mail s'il n'a pas de numéro).
        const r = await demanderCodeNom()
        if (!r.ok) return setErreur(t(REFUS[r.raison]))
        setVers(r.vers ?? c.telephone)
        return setEtape('code')
      }
      return issue(await changerNom(id, prenom, nom, code, c.email), t('Nom enregistré.'))
    }
    if (quoi === 'telephone' || quoi === 'email') {
      if (etape === 'saisie') {
        const r = await demanderCode(id, quoi, valeur, quoi === 'email' ? c.email : c.telephone)
        if (!r.ok) return setErreur(t(REFUS[r.raison]))
        setVers(r.vers)
        return setEtape('code')
      }
      const r = await confirmerCode(id, quoi, code, quoi === 'email' ? c.email : c.telephone)
      if (!r.ok && r.raison === 'essais') setEtape('saisie')
      return issue(r, quoi === 'email' ? t('E-mail changé : utilisez la nouvelle adresse pour vous connecter.') : t('Téléphone changé.'))
    }
    if (quoi === 'mdp') return issue(await changerMotDePasse(ancien, nouveau), t('Mot de passe changé ; vos autres appareils sont déconnectés.'))
    if (quoi === 'google') return issue(await associerGoogle(id, valeur, `${c.prenom} ${c.nom}`, c.email), t('Compte Google associé.'))
  }
  const titre: Record<Quoi, string> = { nom: 'Changer mon nom', telephone: 'Changer mon téléphone', email: 'Changer mon e-mail', mdp: 'Changer le mot de passe', google: 'Associer mon compte Google' }
  const pret =
    etape === 'code'
      ? code.length === 6
      : quoi === 'nom'
        ? !!prenom.trim() && !!nom.trim()
        : quoi === 'mdp'
          ? !!ancien && !!nouveau
          : !!valeur.trim()

  return (
    <section className="card mc" aria-label={t('Mon compte')}>
      {photo.feuille}
      <div className="mc-photo">
        <span className="avatar mc-av" aria-hidden="true">
          {c.photo ? <img className="portrait" src={c.photo} alt="" /> : c.initiales}
        </span>
        <div className="grow">
          <div className="mc-k">{t('Photo de profil')}</div>
          <div className="mc-btns">
            {photo.bouton(c.photo ? 'Changer la photo' : 'Ajouter une photo')}
            {c.photo && (
              <button type="button" className="btn ghost sm" onClick={() => void changerPhoto(id, null).then(() => setInfo(t('Photo de profil retirée.')))}>
                <Icone nom="trash-2" taille={16} />
                <span>{t('Retirer la photo')}</span>
              </button>
            )}
            {photoGoogle && c.photo !== photoGoogle && (
              <button type="button" className="btn ghost sm" onClick={() => void changerPhoto(id, photoGoogle).then(() => setInfo(t('Photo de profil enregistrée.')))}>
                <Icone nom="user-round" taille={16} />
                <span>{t('Utiliser la photo de votre compte Google')}</span>
              </button>
            )}
          </div>
          <div className="t12 c3">{t('Recadrée en cercle, 300 Ko au plus. Sans photo, vos initiales s’affichent.')}</div>
        </div>
      </div>

      <Ligne k={t('Nom')} v={`${c.prenom} ${c.nom}`} action={<button type="button" className="btn ghost sm" onClick={() => ouvrir('nom')}>{t('Modifier')}</button>} />
      <Ligne k={t('Téléphone')} v={c.telephone.includes('•') ? c.telephone : masquerTelephone(c.telephone)} action={<button type="button" className="btn ghost sm" onClick={() => ouvrir('telephone')}>{t('Modifier')}</button>} />
      <Ligne k={t('E-mail')} v={c.email} action={<button type="button" className="btn ghost sm" onClick={() => ouvrir('email')}>{t('Modifier')}</button>} />
      <Ligne k={t('Mot de passe')} v={c.motDePasseLe ? tf('modifié le {d}', { d: new Date(c.motDePasseLe).toLocaleDateString('fr-FR') }) : '••••••••'} action={<button type="button" className="btn ghost sm" onClick={() => ouvrir('mdp')}>{t('Modifier')}</button>} />
      <Ligne
        k={t('Compte Google')}
        v={google ? tf('Associé · {e}', { e: google.email }) : t('Aucun compte associé')}
        action={
          google ? (
            <span className="mc-btns">
              <button type="button" className="btn ghost sm" onClick={() => void synchroniserGoogle(id).then(() => setInfo(t('Nom et photo repris du compte Google.')))}>
                {t('Synchroniser')}
              </button>
              <button type="button" className="btn ghost sm" onClick={() => void dissocierGoogle(id, c.email).then(() => setInfo(t('Compte Google dissocié.')))}>
                {t('Dissocier')}
              </button>
            </span>
          ) : (
            <button type="button" className="btn secondary sm" onClick={() => ouvrir('google')}>
              {t('Associer mon compte Google')}
            </button>
          )
        }
      />
      {info && (
        <p className="mc-info" role="status">
          <Icone nom="circle-check" taille={16} />
          {info}
        </p>
      )}
      {c.alertes.length > 0 && (
        <details className="drt mt10">
          <summary>
            <span className="drt-res">
              <span>
                <Icone nom="bell-ring" taille={14} />
                {tf('{n} alertes de sécurité envoyées', { n: c.alertes.length })}
              </span>
            </span>
            <span className="drt-voir">{t('Détail')}</span>
            <Icone nom="chevron-down" taille={18} />
          </summary>
          <ul className="drt-c mc-alertes">
            {c.alertes.map((a) => (
              <li key={a.id}>
                <b>{t(a.quoi)}</b>
                <span className="t12 c3">{tf('Notification envoyée à {v} · {d}', { v: a.vers, d: new Date(a.le).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) })}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <Feuille ouverte={quoi !== null} fermer={fermer} titre={quoi ? t(titre[quoi]) : ''}>
        {quoi && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void suite()
            }}
          >
            <h2 className="card-t">{t(titre[quoi])}</h2>
            {etape === 'saisie' && quoi === 'nom' && (
              <>
                <label className="champ">
                  <span>{t('Prénom')}</span>
                  <input value={prenom} onChange={(e) => setPrenom(e.target.value)} autoComplete="given-name" />
                </label>
                <label className="champ">
                  <span>{t('Nom')}</span>
                  <input value={nom} onChange={(e) => setNom(e.target.value)} autoComplete="family-name" />
                </label>
              </>
            )}
            {etape === 'saisie' && quoi === 'telephone' && (
              <label className="champ">
                <span>{t('Nouveau numéro (+237)')}</span>
                <input value={valeur} onChange={(e) => setValeur(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="6 77 00 00 00" />
              </label>
            )}
            {etape === 'saisie' && quoi === 'email' && (
              <label className="champ">
                <span>{t('Nouvelle adresse e-mail')}</span>
                <input type="email" value={valeur} onChange={(e) => setValeur(e.target.value)} autoComplete="email" />
              </label>
            )}
            {etape === 'saisie' && quoi === 'google' && (
              <>
                <p className="t13 c2">{t('Votre nom, votre photo et votre e-mail Google pourront être repris ici ; l’e-mail Google sert aussi à vous connecter.')}</p>
                <label className="champ">
                  <span>{t('Adresse Gmail')}</span>
                  <input type="email" value={valeur} onChange={(e) => setValeur(e.target.value)} autoComplete="email" placeholder="prenom@gmail.com" />
                </label>
              </>
            )}
            {quoi === 'mdp' && (
              <>
                <ChampSecret libelle="Mot de passe actuel" valeur={ancien} changer={setAncien} auto="current-password" />
                <ChampSecret libelle="Nouveau mot de passe" valeur={nouveau} changer={setNouveau} auto="new-password" />
                <p className="t12 c3 mt6">{t('8 caractères au moins, dont un chiffre. Vos autres appareils seront déconnectés.')}</p>
              </>
            )}
            {etape === 'code' && (
              <>
                <p className="t13 c2 mt10">{quoi === 'email' ? tf('Code envoyé à la nouvelle adresse {v}.', { v: vers }) : quoi === 'telephone' ? tf('Code envoyé par SMS au nouveau numéro {v}.', { v: vers }) : tf('Code envoyé par SMS au {v}.', { v: vers.includes('•') ? vers : masquerTelephone(vers) })}</p>
                <label className="champ">
                  <span>{t('Code à 6 chiffres')}</span>
                  <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus />
                </label>
                {CODE_DEMO_COMPTE && <p className="t12 c3 mt6">{tf('Démonstration : le code est {c}.', { c: CODE_DEMO_COMPTE })}</p>}
              </>
            )}
            {erreur && (
              <p className="note red mt10" role="alert">
                {erreur}
              </p>
            )}
            <p className="t12 c3 mt10">
              <Icone nom="bell-ring" taille={13} style={{ verticalAlign: -2 }} /> {tf('Une notification part à {v} après le changement.', { v: masquerEmail(c.email) })}
            </p>
            <button type="submit" className="btn primary bloc mt10" disabled={!pret}>
              {etape === 'saisie' && quoi !== 'mdp' && quoi !== 'google' ? t('Recevoir le code') : t('Confirmer')}
            </button>
          </form>
        )}
      </Feuille>
    </section>
  )
}
