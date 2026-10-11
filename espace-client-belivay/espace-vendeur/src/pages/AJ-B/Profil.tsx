// Mon profil (AJ-B, DP-58) : la PERSONNE connectée, distincte de la boutique (Ma boutique) et des réglages de
// l'application (Paramètres). On y arrive par l'avatar de l'en-tête (menu du profil) et par le Menu.
// - Photo rognée au cercle, enregistrée avec un code SMS (DP-52, comme le client) ; retirer la photo aussi.
// - Prénom et nom : le TITULAIRE (propriétaire) suit sa pièce d'identité, il change par une demande au support
//   (PAR-01, VD11-R09) ; un employé change son propre nom avec un code SMS.
// - Téléphone personnel (deux codes : ancien puis nouveau numéro) et e-mail (code SMS puis code à la nouvelle
//   adresse), REFVD-R297 ; ce n'est jamais le numéro de versement ni un numéro connu des clients.
// - Langue (FR / EN, DP-13 : pas de pidgin), rôle et ce qu'il permet (Q-18 : l'accès Préparation ne voit aucun
//   montant, n'achète rien), appareils connectés (ville, jamais l'adresse IP, SEC-01) avec le lien vers Sécurité pour
//   les déconnecter, et « Se déconnecter » qui ferme vraiment la session.
// Ces gestes vivaient dans Paramètres (VD-11) : ils sont DÉPLACÉS ici, Paramètres n'en garde qu'un lien (pas de doublon).
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { Ecran, nomPalier } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useHorloge, useSession } from '../../session'
import { BandeauHorsLigne, Bouton, CHAMP, CodeSms, ErreurLecture, Feuille, LienTexte, ZONE, ilYa, useAnnonce, useFeuilleAdresse, usePhoto } from '../VD-11/communs'
import { publierVisuel } from '../../donnees/visuelProfil'
import { BIO_MAX, donneesAJB } from './donnees-ajb'
import './ajb.css'

type Changement = 'photo' | 'couverture' | 'nom' | 'email' | 'tel'

const masquerEmail = (e: string | null) => {
  if (!e) return null
  const [a, d] = e.split('@')
  return `${a[0]}•••••@${d}`
}
const masquerTel = (t: string) => {
  const n = t.replace(/\D/g, '').replace(/^237/, '')
  return `${n[0]}•• •• •• ${n.slice(-2)}`
}

// Ce que chaque rôle permet (VD-02 p8, Q-17, Q-18) : écrit une fois, lu par l'écran.
const DROITS: Record<'proprietaire' | 'preparation', { oui: string[]; non: string[] }> = {
  proprietaire: {
    oui: ['Commandes, remise au livreur, litiges et retours', 'Argent, versements, documents', 'Offres, prix, plans et visibilité', 'Équipe : donner ou retirer un accès'],
    non: [],
  },
  preparation: {
    oui: ['Préparer les commandes et les remettre au livreur', 'Ajouter des preuves à un litige ou un retour', 'Changer le stock, « Fermer aujourd’hui »', 'Écrire aux clients, au nom de la boutique'],
    non: ['Aucun montant visible, rien à acheter', 'Pas de réponse à un litige : le propriétaire décide'],
  },
}

const ICONE_APPAREIL = { telephone: 'smartphone', ordinateur: 'monitor', tablette: 'laptop' } as const

export default function Profil() {
  const p = usePreferences()
  const { t, tf, langue } = p
  const s = useSession()
  const naviguer = useNavigate()
  const maintenant = useHorloge()
  const prep = s.membre?.role === 'preparation'
  const profil = useLecture(() => source.compte.profil(), [s.membre?.role])
  const securite = useLecture(() => source.compte.securite(), [s.membre?.role])
  const appareils = useLecture(() => source.compte.appareils(), [])
  const [annonce, dire] = useAnnonce()
  const feuille = useFeuilleAdresse('changer', 'x')
  const [quoi, setQuoi] = useState<Changement | null>(null)
  const [etape, setEtape] = useState<'saisie' | 'code1' | 'code2'>('saisie')
  const [valeur, setValeur] = useState('')
  const [nomEd, setNomEd] = useState({ prenom: '', nom: '' })
  const [photo, setPhoto] = useState<string | null>(null)
  const [code1, setCode1] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [masque, setMasque] = useState('')
  const pr = profil.donnees
  useEffect(() => {
    if (!feuille.ouverte) setQuoi(null)
  }, [feuille.ouverte])
  // Présentation courte (réelle : « Bio », facultative) : gardée par membre ; le champ suit ce qui est enregistré.
  const idMembre = s.membre?.id ?? ''
  const bio = useLecture(() => donneesAJB.bio.lire(idMembre), [idMembre])
  const [bioEd, setBioEd] = useState<string | null>(null)
  const [erreurBio, setErreurBio] = useState<string | null>(null)
  const texteBio = bioEd ?? bio.donnees ?? ''
  const enregistrerBio = async () => {
    const r = await donneesAJB.bio.ecrire(idMembre, texteBio)
    if (!r.ok) return setErreurBio(t(r.raison === 'long' ? 'Présentation trop longue.' : 'Pas de numéro, d’e-mail ni de lien dans la présentation.'))
    setErreurBio(null)
    setBioEd(null)
    jouer('code')
    dire(t('Présentation enregistrée.'))
  }

  const commencer = (q: Changement) => {
    setQuoi(q)
    setEtape('saisie')
    setValeur('')
    setErreur(null)
    setCode1('')
    if (pr) setNomEd({ prenom: pr.prenom, nom: pr.nom })
    feuille.ouvrir()
  }
  const envoyerCode = async (motif: 'profil' | 'email' | 'telephone') => {
    const r = await source.compte.demanderCode(motif)
    setMasque(r.ok ? r.masque : (securite.donnees?.telephoneMasque ?? ''))
  }
  const photoChoisie = usePhoto({
    rogner: true,
    utiliser: async (ph) => {
      setPhoto(ph)
      setQuoi('photo')
      setEtape('code1')
      setErreur(null)
      await envoyerCode('profil')
      feuille.ouvrir()
    },
    erreur: (e) => dire(e, 'erreur'),
  })
  // Photo de couverture (bandeau 3:1) : même parcours que la photo (recadrage, code SMS), visible aussitôt dans le
  // Menu, la barre latérale et ici.
  const couvertureChoisie = usePhoto({
    rogner: true,
    forme: 'couverture',
    utiliser: async (ph) => {
      setPhoto(ph)
      setQuoi('couverture')
      setEtape('code1')
      setErreur(null)
      await envoyerCode('profil')
      feuille.ouvrir()
    },
    erreur: (e) => dire(e, 'erreur'),
  })
  const suite = async () => {
    setErreur(null)
    if (quoi === 'nom') {
      if (!nomEd.prenom.trim() || !nomEd.nom.trim()) return setErreur(t('Le prénom et le nom sont obligatoires.'))
      await envoyerCode('profil')
      return setEtape('code1')
    }
    if (quoi === 'email') {
      const r = await source.compte.demanderCodeEmail(valeur)
      if (!r.ok) return setErreur(t(r.raison === 'email' ? 'Vérifiez l’adresse e-mail' : r.raison === 'meme' ? 'C’est déjà votre adresse.' : 'Cette adresse a déjà un compte BelivaY.'))
      await envoyerCode('email')
      return setEtape('code1')
    }
    if (quoi === 'tel') {
      const r = await source.compte.demanderCodesNumero(valeur)
      if (!r.ok) return setErreur(t(r.raison === 'prefixe' ? 'Numéro camerounais à 9 chiffres, qui commence par 6.' : r.raison === 'meme' ? 'C’est déjà votre numéro.' : 'Ce numéro a déjà un compte BelivaY'))
      await envoyerCode('telephone')
      return setEtape('code1')
    }
  }
  const fini = (texte: string) => {
    jouer('code')
    dire(t(texte))
    feuille.fermer()
    setPhoto(null)
  }

  const titreFeuille = quoi === 'photo' ? (photo ? 'Nouvelle photo de profil' : 'Retirer la photo de profil') : quoi === 'couverture' ? (photo ? 'Nouvelle photo de couverture' : 'Retirer la photo de couverture') : quoi === 'nom' ? 'Changer mon nom' : quoi === 'email' ? 'Changer mon e-mail' : 'Changer mon téléphone personnel'
  const contenuFeuille = !quoi ? null : etape === 'saisie' ? (
    <>
      {quoi === 'nom' ? (
        <div className="split2">
          <div className="fld" style={{ minWidth: 0 }}>
            <label htmlFor="p-prenom">{t('Prénom')}</label>
            <div className="inp">
              <input id="p-prenom" value={nomEd.prenom} onChange={(e) => setNomEd((x) => ({ ...x, prenom: e.target.value }))} style={CHAMP} autoComplete="given-name" />
            </div>
          </div>
          <div className="fld" style={{ minWidth: 0 }}>
            <label htmlFor="p-nom">{t('Nom')}</label>
            <div className="inp">
              <input id="p-nom" value={nomEd.nom} onChange={(e) => setNomEd((x) => ({ ...x, nom: e.target.value }))} style={CHAMP} autoComplete="family-name" />
            </div>
          </div>
        </div>
      ) : (
        <div className="fld">
          <label htmlFor="p-valeur">{t(quoi === 'email' ? 'Nouvelle adresse e-mail' : 'Nouveau numéro')}</label>
          <div className="inp" style={{ borderColor: erreur ? 'var(--red)' : undefined }}>
            {quoi === 'tel' && <span className="b7 c3">+237</span>}
            <input id="p-valeur" type={quoi === 'email' ? 'email' : 'tel'} inputMode={quoi === 'email' ? 'email' : 'tel'} autoComplete={quoi === 'email' ? 'email' : 'tel-national'} value={valeur} onChange={(e) => (setValeur(e.target.value), setErreur(null))} placeholder={quoi === 'email' ? 'nom@exemple.cm' : '677 12 34 56'} style={CHAMP} />
          </div>
        </div>
      )}
      {erreur && (
        <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
          {erreur}
        </div>
      )}
      <div className="hint-l">
        <Icone nom="shield-check" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t(quoi === 'email' ? 'Deux codes : un par SMS à votre téléphone personnel, puis un à la nouvelle adresse.' : quoi === 'tel' ? 'Deux codes : un à l’ancien numéro, puis un au nouveau. Ce n’est pas votre numéro de versement.' : 'Un code par SMS confirme le changement.')}</span>
      </div>
      <div className="mt14">
        <Bouton icone="arrow-right" onClick={() => void suite()}>
          {t('Recevoir le code')}
        </Bouton>
      </div>
      <div className="mt8">
        <Bouton classe="ghost" onClick={feuille.fermer}>
          {t('Annuler')}
        </Bouton>
      </div>
    </>
  ) : (
    <>
      {quoi === 'photo' && photo && <img src={photo} alt="" className="ajb-apercu" />}
      {quoi === 'couverture' && photo && <img src={photo} alt="" className="ajb-apercu-couv" />}
      {(quoi === 'email' || quoi === 'tel') && <div className="kick mt8">{t(etape === 'code1' ? (quoi === 'email' ? 'Étape 1 sur 2 · code par SMS' : 'Étape 1 sur 2 · code à l’ancien numéro') : quoi === 'email' ? 'Étape 2 sur 2 · code reçu à la nouvelle adresse' : 'Étape 2 sur 2 · code au nouveau numéro')}</div>}
      <CodeSms
        key={etape}
        masque={etape === 'code2' ? (quoi === 'email' ? valeur.trim() : `${valeur.replace(/\D/g, '')[0] ?? '6'}•• •• •• ${valeur.replace(/\D/g, '').slice(-2)}`) : masque}
        bouton={quoi === 'photo' || quoi === 'couverture' ? (photo ? 'Enregistrer la photo' : 'Retirer la photo') : etape === 'code1' && quoi !== 'nom' ? 'Continuer' : 'Confirmer'}
        renvoyer={async () => void (await source.compte.demanderCode(quoi === 'email' ? 'email' : quoi === 'tel' ? 'telephone' : 'profil'))}
        annuler={feuille.fermer}
        valider={async (code) => {
          if (quoi === 'photo' || quoi === 'couverture' || quoi === 'nom') {
            const r = await source.compte.modifierProfil(quoi === 'photo' ? { photo } : quoi === 'couverture' ? { couverture: photo } : { prenom: nomEd.prenom, nom: nomEd.nom }, code)
            if (!r.ok) return t(r.raison === 'code' ? 'Ce code ne correspond pas.' : r.raison === 'titulaire' ? 'Le nom du titulaire change par une demande au support.' : 'Le prénom et le nom sont obligatoires.')
            publierVisuel(r.profil)
            profil.relire()
            fini(quoi === 'photo' ? (photo ? 'Photo de profil enregistrée.' : 'Photo de profil retirée.') : quoi === 'couverture' ? (photo ? 'Photo de couverture enregistrée.' : 'Photo de couverture retirée.') : 'Nom enregistré.')
            return null
          }
          if (etape === 'code1') {
            setCode1(code)
            setEtape('code2')
            return null
          }
          const r = quoi === 'email' ? await source.compte.confirmerEmail(code1, code) : await source.compte.confirmerNumero(code1, code)
          if (!r.ok) {
            setEtape('code1')
            return t('Un des deux codes ne correspond pas : recommencez.')
          }
          fini(quoi === 'email' ? 'Adresse e-mail changée.' : 'Téléphone personnel changé.')
          return null
        }}
      />
    </>
  )

  const droits = DROITS[prep ? 'preparation' : 'proprietaire']
  const liste = appareils.donnees ?? []
  const deconnecter = () => void source.session.deconnecter().then(() => naviguer(chemin('connexion'), { replace: true }))
  return (
    <Ecran
      route="profil"
      fixes={
        <>
          {annonce}
          {photoChoisie.feuille}
          {couvertureChoisie.feuille}
          <Feuille ouverte={feuille.ouverte && !!quoi} fermer={feuille.fermer} titre={titreFeuille}>
            <h3 style={{ margin: '0', fontSize: '19px', fontWeight: '800' }}>{t(titreFeuille)}</h3>
            {contenuFeuille}
          </Feuille>
        </>
      }
    >
      <BandeauHorsLigne texte="Hors connexion : votre profil s’affiche tel qu’il était ; les changements attendent le retour du réseau." />
      {profil.erreur && <ErreurLecture erreur={profil.erreur} relire={profil.relire} />}
      <div className={'hero night ajb-tete' + (pr?.couverture ? ' a-couv' : '')} style={pr?.couverture ? { backgroundImage: `linear-gradient(180deg,rgba(20,12,6,.35),rgba(20,12,6,.88) 62%),url(${pr.couverture})` } : undefined}>
        <div className="ajb-portrait">
          <span className="avatar ajb-avatar">{pr?.photo ? <img src={pr.photo} alt={t('Photo de profil')} /> : s.membre?.initiales}</span>
        </div>
        <div className="b8 ajb-nom">{pr ? `${pr.prenom} ${pr.nom}` : `${s.membre?.prenom ?? ''} ${s.membre?.nom ?? ''}`}</div>
        <div className="t13 ajb-sous">{pr ? `${pr.identifiant} · ${s.boutique?.nom ?? ''}` : ''}</div>
        <div className="meta" style={{ justifyContent: 'center' }}>
          <span className="pill dk sm">
            <Icone nom={prep ? 'user-round' : 'badge-check'} taille={13} />
            {t(prep ? 'Accès Préparation' : 'Propriétaire · identité vérifiée')}
          </span>
          {s.boutique && <span className="pill dk sm">{`${nomPalier(s.boutique.palier, langue)} · ${Math.round(s.boutique.trustScore)}`}</span>}
        </div>
        <div className="row ajb-actions">
          {photoChoisie.bouton(pr?.photo ? 'Changer la photo' : 'Ajouter une photo', 'secondary sm', 'camera')}
          {pr?.photo && (
            <Bouton
              classe="secondary sm"
              icone="trash-2"
              onClick={() => {
                setPhoto(null)
                setQuoi('photo')
                setEtape('code1')
                void envoyerCode('profil').then(feuille.ouvrir)
              }}
            >
              {t('Retirer')}
            </Bouton>
          )}
        </div>
        <div className="row ajb-actions ajb-couv-act">
          {couvertureChoisie.bouton(pr?.couverture ? 'Changer la couverture' : 'Ajouter une couverture', 'secondary sm', 'image')}
          {pr?.couverture && (
            <Bouton
              classe="secondary sm"
              icone="trash-2"
              onClick={() => {
                setPhoto(null)
                setQuoi('couverture')
                setEtape('code1')
                void envoyerCode('profil').then(feuille.ouvrir)
              }}
            >
              {t('Retirer la couverture')}
            </Bouton>
          )}
        </div>
      </div>
      <p className="t12 c3 center" style={{ margin: '8px 0 0' }}>
        {t('Votre photo et votre couverture se voient dans votre espace et par votre équipe. Les clients ne les voient jamais.')}
      </p>

      <div className="ajb-grille">
        <div className="card">
          <h3>{t('Identité')}</h3>
          <div className="li" style={{ minHeight: '56px' }}>
            <span className="ic">
              <Icone nom="user-round" taille={19} />
            </span>
            <span className="grow">
              <span className="ls" style={{ display: 'block' }}>
                {t('Prénom et nom')}
              </span>
              <span className="lt" style={{ display: 'block' }}>
                {pr ? `${pr.prenom} ${pr.nom}` : ''}
              </span>
            </span>
            {prep ? (
              <LienTexte onClick={() => commencer('nom')} etiquette={t('Changer mon nom')}>
                {t('Changer')}
              </LienTexte>
            ) : (
              <Icone nom="lock" taille={16} style={{ color: 'var(--ink-3)' }} />
            )}
          </div>
          <div className="li" style={{ minHeight: '56px' }}>
            <span className="ic">
              <Icone nom="id-card" taille={19} />
            </span>
            <span className="grow">
              <span className="ls" style={{ display: 'block' }}>
                {t('Identifiant')}
              </span>
              <span className="lt" style={{ display: 'block' }}>
                {pr?.identifiant ?? ''}
              </span>
            </span>
            <Icone nom="lock" taille={16} style={{ color: 'var(--ink-3)' }} />
          </div>
          <div className="hint-l">
            <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>
              {t(prep ? 'L’identifiant ne change jamais. Votre nom se change avec un code SMS.' : 'L’identifiant ne change jamais. Le nom suit votre pièce d’identité.')}
              {!prep && (
                <>
                  {' '}
                  <Link to={chemin('boutique', { modif: 1 })} className="b8 cor">
                    {t('Demander une modification')}
                  </Link>
                </>
              )}
            </span>
          </div>
        </div>

        <div className="card">
          <h3>{t('Pour vous joindre')}</h3>
          <div className="fld">
            <label>{t('Téléphone personnel')}</label>
            <div className="inp">
              <span className="b7 c3">+237</span>
              <span className="grow">{pr ? masquerTel(pr.telephone) : ''}</span>
              <LienTexte onClick={() => commencer('tel')} etiquette={t('Changer mon téléphone personnel')}>
                {t('Changer')}
              </LienTexte>
            </div>
            <div className="hint">{t('Pour que le support vous joigne et pour vos codes. Ce n’est pas votre numéro de versement.')}</div>
          </div>
          <div className="fld">
            <label>{t('E-mail')}</label>
            <div className="inp">
              <span className="grow">{masquerEmail(pr?.email ?? null) ?? t('Pas encore d’e-mail (facultatif)')}</span>
              <LienTexte onClick={() => commencer('email')} etiquette={t('Changer mon e-mail')}>
                {t(pr?.email ? 'Changer' : 'Ajouter')}
              </LienTexte>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>{t('Présentation')}</h3>
          <label htmlFor="p-bio" className="t13 c3" style={{ display: 'block', margin: '4px 0 8px' }}>
            {t('Facultatif · vue par votre équipe et l’agent BelivaY de votre zone, jamais par les clients.')}
          </label>
          <textarea id="p-bio" value={texteBio} maxLength={BIO_MAX + 40} onChange={(e) => (setBioEd(e.target.value), setErreurBio(null))} placeholder={t('Présentez-vous en une phrase : ce que vous vendez, depuis quand…')} style={{ ...ZONE, minHeight: '76px', borderColor: erreurBio ? 'var(--red)' : undefined }} />
          <div className="row" style={{ marginTop: '4px' }}>
            <span className={'grow t12 ' + (erreurBio ? 'cr' : 'c3')} role={erreurBio ? 'alert' : undefined}>
              {erreurBio ?? ''}
            </span>
            <span className={'t12 ' + (texteBio.trim().length > BIO_MAX ? 'cr' : 'c3')}>{`${texteBio.trim().length} / ${BIO_MAX}`}</span>
          </div>
          {bioEd !== null && bioEd !== (bio.donnees ?? '') && (
            <div className="row mt8" style={{ gap: '8px' }}>
              <Bouton classe="primary sm" icone="check" onClick={() => void enregistrerBio()}>
                {t('Enregistrer la présentation')}
              </Bouton>
              <Bouton classe="ghost sm" onClick={() => (setBioEd(null), setErreurBio(null))}>
                {t('Annuler')}
              </Bouton>
            </div>
          )}
        </div>

        <div className="card">
          <h3>{t('Langue')}</h3>
          <p className="t13 c3" style={{ margin: '4px 0 0' }}>
            {t('L’application et les notifications ; les SMS restent en français.')}
          </p>
          <div className="seg" role="radiogroup" aria-label={t('Langue')} style={{ margin: '10px 0 0', width: '100%' }}>
            {(
              [
                ['fr', 'Français'],
                ['en', 'English'],
              ] as const
            ).map(([v, l]) => (
              <a key={v} role="radio" tabIndex={0} aria-checked={v === langue} className={v === langue ? 'on' : ''} style={{ height: '44px' }} onClick={() => p.setLangue(v)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), p.setLangue(v))}>
                {l}
              </a>
            ))}
          </div>
        </div>

        <div className="card">
          <h3>{t('Mon rôle')}</h3>
          <div className="row mt6" style={{ gap: '10px' }}>
            <span className={'ajb-pastille ' + (prep ? 'prep' : 'proprio')}>
              <Icone nom={prep ? 'package-check' : 'crown'} taille={18} />
            </span>
            <span className="grow">
              <span className="b8 t15" style={{ display: 'block' }}>
                {t(prep ? 'Accès Préparation' : 'Propriétaire de la boutique')}
              </span>
              <span className="t13 c3">{prep ? tf('Donné par {nom}', { nom: `${s.proprietaire?.prenom ?? ''} ${s.proprietaire?.nom ?? ''}`.trim() }) : t('Tous les droits sur la boutique')}</span>
            </span>
          </div>
          <ul className="ajb-droits">
            {droits.oui.map((d) => (
              <li key={d}>
                <Icone nom="check" taille={15} style={{ color: 'var(--green)', flexShrink: 0 }} />
                <span>{t(d)}</span>
              </li>
            ))}
            {droits.non.map((d) => (
              <li key={d} className="non">
                <Icone nom="x" taille={15} style={{ flexShrink: 0 }} />
                <span>{t(d)}</span>
              </li>
            ))}
          </ul>
          {!prep && (
            <Link to={chemin('equipe')} className="li" style={{ minHeight: '52px' }}>
              <span className="ic">
                <Icone nom="users" taille={19} />
              </span>
              <span className="grow lt">{t('Mon équipe et ses accès')}</span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
          )}
        </div>

        <div className="card">
          <h3>{t('Appareils connectés')}</h3>
          {appareils.erreur && <ErreurLecture erreur={appareils.erreur} relire={appareils.relire} />}
          <div className="mt4">
            {liste.map((a) => (
              <div key={a.id} className="li" style={{ minHeight: '56px' }}>
                <span className="ic">
                  <Icone nom={ICONE_APPAREIL[a.type]} taille={19} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ display: 'block' }}>
                    {a.nom}
                  </span>
                  <span className="ls" style={{ display: 'block' }}>
                    {a.actuel ? tf('{lieu} · actif maintenant', { lieu: a.lieu }) : `${a.lieu} · ${ilYa(a.vuA, maintenant, langue)}`}
                  </span>
                </span>
                {a.actuel && <span className="pill green sm">{t('Cet appareil')}</span>}
              </div>
            ))}
          </div>
          <Link to={chemin('securite')} className="li" style={{ minHeight: '52px' }}>
            <span className="ic">
              <Icone nom="shield-check" taille={19} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t('Sécurité, appareils et données')}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {t('Déconnecter un appareil, mot de passe, Face ID, export')}
              </span>
            </span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
        </div>

        <div className="card tight">
          <Link to={chemin('parametres')} className="li" style={{ minHeight: '52px' }}>
            <span className="ic">
              <Icone nom="settings" taille={19} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t('Paramètres')}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {t('Taille du texte, thème, notifications, sons')}
              </span>
            </span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
          <Link to={chemin('apprendre')} className="li" style={{ minHeight: '52px' }}>
            <span className="ic">
              <Icone nom="graduation-cap" taille={19} />
            </span>
            <span className="grow lt">{t('Apprendre à mieux vendre')}</span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
        </div>
      </div>

      <div className="mt16">
        <Bouton classe="danger" icone="log-out" onClick={deconnecter}>
          {t('Se déconnecter')}
        </Bouton>
      </div>
      <p className="t12 c3 center" style={{ margin: '10px 0 0' }}>
        {t('Vos commandes continuent : un autre membre de l’équipe peut les préparer.')}
      </p>
    </Ecran>
  )
}
