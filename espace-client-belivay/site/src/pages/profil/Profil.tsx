// « Modifier mon profil » (DP-52, décision du porteur : le compte se modifie, avec un code de vérification ;
// remplace « ni formulaire de profil » de CCO-01). Écran enfant du compte, aux couleurs du prototype :
// - la photo (prendre, choisir, recadrer dans un cercle, retirer), le prénom (obligatoire : il salue et sert au livreur, CIN-22) et le
//   nom ; l'e-mail et le numéro ont chacun leur parcours à deux codes (« Changer d’e-mail », CIN-39) ;
// - « Enregistrer » envoie un code par SMS au numéro vérifié (?st=code) : sans le bon code, rien ne change ;
// - ?st=ok dit ce qui a changé. Le nom et la photo changent aussitôt partout (compte, menu, en-tête).
// Le brouillon tient dans la session de l'onglet : un retour ou un rechargement ne perd rien.
// Ce qu'il faut au client (DP-54) : ce qui va changer avant le code, « Annuler mes changements », l'état réel du
// numéro (vérifié ou non : sinon « Vérifier »), et les pages voisines (numéro et connexion, confidentialité).
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Dessin } from '../../composants/Dessin'
import { Feuille, useFeuille } from '../../composants/Feuille'
import { Icone } from '../../composants/Icone'
import { SaisieCode, useEnvoiCode } from '../../composants/SaisieCode'
import { Bouton, Note, Vide } from '../../composants/socle'
import { Styles } from '../../composants/Styles'
import { chemin } from '../../config/pages'
import { source, type ChangementProfil, type Client, type EnvoiCode } from '../../donnees/source'
import { usePreferences } from '../../preferences'
import { useMajClient, useSession } from '../../session'
import { ouvrirPhoto, TYPES_PHOTO } from '../../donnees/photo'
import { Rognage } from '../../composants/Rognage'
import { Bloc, EcranCompte } from '../CL-13/Larges'

const BROUILLON = 'blv_profil_brouillon'
const ENVOI = 'blv_profil_envoi'
const FAIT = 'blv_profil_fait'
const lire = <T,>(cle: string): T | null => {
  try {
    return JSON.parse(sessionStorage.getItem(cle) || 'null') as T | null
  } catch {
    return null
  }
}
const garder = (cle: string, v: unknown) => {
  try {
    if (v === null) sessionStorage.removeItem(cle)
    else sessionStorage.setItem(cle, JSON.stringify(v))
  } catch {
    // Stockage refusé : le brouillon vit le temps de l'écran.
  }
}

// Prénom et nom : lettres (accents compris), espaces, trait d'union, apostrophe ; 40 caractères au plus.
const NOM_VALIDE = /^[\p{L}][\p{L}\s'’-]{0,39}$/u
function erreurNom(v: string, obligatoire: boolean): string | null {
  const s = v.trim()
  if (!s) return obligatoire ? 'Ton prénom est demandé : il sert à te saluer et au livreur à domicile.' : null
  if (s.length > 40) return '40 caractères au plus.'
  if (!NOM_VALIDE.test(s)) return 'Des lettres seulement (accents, espace, trait d’union et apostrophe permis).'
  return null
}

const depuis = (c: Client): ChangementProfil => ({ prenom: c.prenom, nom: c.nom, photo: c.photo })
const changements = (avant: ChangementProfil, apres: ChangementProfil): string[] => [
  ...(avant.photo !== apres.photo ? [apres.photo ? 'Photo de profil' : 'Photo de profil retirée'] : []),
  ...(avant.prenom.trim() !== apres.prenom.trim() ? ['Prénom'] : []),
  ...(avant.nom.trim() !== apres.nom.trim() ? ['Nom'] : []),
]

export function Profil() {
  const { t } = usePreferences()
  const client = useSession().client!
  const majClient = useMajClient()
  const naviguer = useNavigate()
  const [params] = useSearchParams()
  const st = params.get('st')
  const [brouillon, setBrouillon] = useState<ChangementProfil>(() => lire<ChangementProfil>(BROUILLON) ?? depuis(client))
  const [envoi, setEnvoi] = useState<EnvoiCode | null>(() => lire<EnvoiCode>(ENVOI))
  const envoyerCode = useEnvoiCode()
  const [erreurPhoto, setErreurPhoto] = useState<string | null>(null)
  const [vu, setVu] = useState(false) // erreurs montrées après un premier essai d'enregistrement
  const [verifie, setVerifie] = useState<boolean | null>(null) // numéro vérifié (lu dans « Numéro et connexion »)
  const feuille = useFeuille('photo')
  const camera = useRef<HTMLInputElement>(null)
  const galerie = useRef<HTMLInputElement>(null)
  // Photo à recadrer (écran de rognage ouvert) et photo d'origine de ce passage, pour « Recadrer ma photo ».
  const [aRogner, setARogner] = useState<HTMLImageElement | null>(null)
  const origine = useRef<string | null>(null)
  useEffect(() => () => void (origine.current && URL.revokeObjectURL(origine.current)), [])

  useEffect(() => garder(BROUILLON, brouillon), [brouillon])
  useEffect(() => {
    source.securite().then((s) => setVerifie(s.numero.verifie))
  }, [])
  // Ouvert sur ?st=code sans code envoyé (lien gardé, onglet neuf) : retour au formulaire.
  useEffect(() => {
    if (st === 'code' && !envoi) naviguer(chemin('profil'), { replace: true })
  }, [st, envoi, naviguer])

  const avant = depuis(client)
  const liste = changements(avant, brouillon)
  const errPrenom = erreurNom(brouillon.prenom, true)
  const errNom = erreurNom(brouillon.nom, false)
  const valide = !errPrenom && !errNom

  const choisir = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    feuille.fermer()
    try {
      const { img, url } = await ouvrirPhoto(f)
      if (origine.current) URL.revokeObjectURL(origine.current)
      origine.current = url
      setErreurPhoto(null)
      setARogner(img)
    } catch (x) {
      const m = (x as Error).message
      setErreurPhoto(
        m === 'taille'
          ? 'Cette photo pèse plus de 10 Mo : choisis-en une plus légère.'
          : m === 'lecture'
            ? 'Cette photo ne s’ouvre pas sur ce téléphone : choisis-en une en JPG, PNG ou WebP.'
            : 'Ce fichier n’est pas une photo : choisis une image JPG, PNG, WebP ou HEIC.',
      )
    }
  }
  // Recadrer de nouveau : depuis la photo d'origine choisie à ce passage, sinon depuis la photo actuelle.
  const recadrer = () => {
    const src = origine.current ?? brouillon.photo
    feuille.fermer()
    if (!src) return
    const img = new Image()
    img.onload = () => setARogner(img)
    img.src = src
  }

  const enregistrer = async () => {
    setVu(true)
    if (!valide || !liste.length) return
    const e = await envoyerCode('profil', () => source.envoyerCode('profil'))
    if (!e) return
    setEnvoi(e)
    garder(ENVOI, e)
    naviguer(chemin('profil', { st: 'code' }))
  }

  // ── Code par SMS ─────────────────────────────────────────────────────────────────────────────────────
  if (st === 'code' && envoi)
    return (
      <EcranCompte route="profil" sousTitre="Confirmer avec un code">
        <Styles id="f16ded0d4c" />
        <Styles id="1c3d953197" />
        <div style={{ height: 14 }}></div>
        <SaisieCode
          titre="Entre le code reçu par SMS"
          envoi={envoi}
          modifier={
            <Link to={chemin('profil')} className="cl03-link">
              {t('Revoir mes changements')}
            </Link>
          }
          bouton="Enregistrer mon profil"
          valider={(code) => source.confirmerProfil(brouillon, code)}
          renvoyer={async () => {
            const e = await source.envoyerCode('profil')
            garder(ENVOI, e)
            return e
          }}
          reussi={(r) => {
            garder(FAIT, liste)
            garder(BROUILLON, null)
            garder(ENVOI, null)
            majClient(r.client)
            naviguer(chemin('profil', { st: 'ok' }), { replace: true })
          }}
        />
        <div className="hint-l">
          <Icone nom="shield-check" taille={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{t('Ce code prouve que c’est bien toi : sans lui, ton profil ne change pas.')}</span>
        </div>
      </EcranCompte>
    )

  // ── Profil enregistré ────────────────────────────────────────────────────────────────────────────────
  if (st === 'ok') {
    const fait = lire<string[]>(FAIT) ?? []
    return (
      <EcranCompte route="profil">
        <Styles id="0b0ccec1e3" />
        <Vide icone="check" titre={t('Ton profil est à jour')} texte={t('Ton nom et ta photo changent partout dans l’application, tout de suite.')} />
        {fait.length > 0 && (
          <div className="card tight">
            {fait.map((c) => (
              <div key={c} className="li">
                <span className="ic green">
                  <Icone nom="check" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ display: 'block' }}>
                    {t(c)}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="mt16">
          <Bouton vers={chemin('compte')} icone="user-round">
            {t('Retour à mon compte')}
          </Bouton>
        </div>
        <div className="mt10">
          <Bouton vers={chemin('profil')} genre="secondary">
            {t('Voir mon profil')}
          </Bouton>
        </div>
      </EcranCompte>
    )
  }

  // ── Formulaire ───────────────────────────────────────────────────────────────────────────────────────
  // Feuille de la photo : posée par-dessus l'écran (éléments fixes d'Ecran), pas dans le contenu qui défile.
  const feuillePhoto = (
  <Feuille ouverte={feuille.ouverte} fermer={feuille.fermer} titre={t('Photo de profil')}>
    <h2 className="pg-t" style={{ fontSize: 19 }}>
      {t('Photo de profil')}
    </h2>
    <p className="pg-s">{t('Elle se voit dans ton compte et ton menu. Les vendeurs ne la voient jamais.')}</p>
    <p className="pg-s">{t('JPG, PNG, WebP ou HEIC, 10 Mo au plus. Tu la recadres ensuite dans le cercle.')}</p>
    <div className="card tight mt16">
      <button type="button" className="li" onClick={() => camera.current?.click()} style={{ width: '100%', background: 'none', border: 0, textAlign: 'left' }}>
        <span className="ic">
          <Icone nom="camera" taille={20} />
        </span>
        <span className="grow">
          <span className="lt">{t('Prendre une photo')}</span>
        </span>
      </button>
      <button type="button" className="li" onClick={() => galerie.current?.click()} style={{ width: '100%', background: 'none', border: 0, textAlign: 'left' }}>
        <span className="ic">
          <Icone nom="image" taille={20} />
        </span>
        <span className="grow">
          <span className="lt">{t('Choisir dans ma galerie')}</span>
        </span>
      </button>
      {brouillon.photo && (
        <button type="button" className="li" onClick={recadrer} style={{ width: '100%', background: 'none', border: 0, textAlign: 'left' }}>
          <span className="ic">
            <Icone nom="scan-face" taille={20} />
          </span>
          <span className="grow">
            <span className="lt">{t('Recadrer ma photo')}</span>
          </span>
        </button>
      )}
      {brouillon.photo && (
        <button
          type="button"
          className="li"
          onClick={() => (setBrouillon((b) => ({ ...b, photo: null })), feuille.fermer())}
          style={{ width: '100%', background: 'none', border: 0, textAlign: 'left' }}
        >
          <span className="ic red">
            <Icone nom="trash-2" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ color: 'var(--red)' }}>
              {t('Retirer ma photo')}
            </span>
          </span>
        </button>
      )}
    </div>
    <div className="mt14">
      <Bouton genre="ghost" onClick={feuille.fermer}>
        {t('Annuler')}
      </Bouton>
    </div>
  </Feuille>
  )
  const rognage = aRogner && (
    <Rognage
      img={aRogner}
      annuler={() => setARogner(null)}
      utiliser={(photo) => (setBrouillon((b) => ({ ...b, photo })), setARogner(null))}
    />
  )
  return (
    <EcranCompte route="profil" fixes={<>{feuillePhoto}{rognage}</>}>
      <Styles id="f16ded0d4c" />
      <Styles id="0b0ccec1e3" />
      <Bloc classe="c13-pf2">
      <Bloc classe="c13-pfg">
      <div className="pf-photo">
        <button type="button" className="cadre" onClick={feuille.ouvrir} aria-label={t('Changer ma photo de profil')}>
          <span className="portrait">
            {brouillon.photo ? (
              <img src={brouillon.photo} alt="" style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Dessin id="ebb567019115" />
            )}
          </span>
          <span className="appareil">
            <Icone nom="camera" taille={17} />
          </span>
        </button>
        <button type="button" className="cl03-link" onClick={feuille.ouvrir} style={{ background: 'none', border: 0 }}>
          {t(brouillon.photo ? 'Changer ma photo' : 'Ajouter une photo')}
        </button>
      </div>
      {erreurPhoto && (
        <Note ton="red" icone="circle-alert">
          {t(erreurPhoto)}
        </Note>
      )}
      </Bloc>
      <Bloc classe="c13-pfd">

      <div className="fld">
        <label htmlFor="pf-prenom">{t('Prénom')}</label>
        <div className={'inp' + (vu && errPrenom ? ' err' : '')}>
          <Icone nom="user-round" taille={18} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
          <input
            id="pf-prenom"
            value={brouillon.prenom}
            autoComplete="given-name"
            maxLength={40}
            onChange={(e) => setBrouillon((b) => ({ ...b, prenom: e.target.value }))}
          />
        </div>
        <div className="hint" style={vu && errPrenom ? { color: 'var(--red)' } : undefined}>
          {t(vu && errPrenom ? errPrenom : 'Pour te saluer et pour le livreur à domicile. Rien d’autre.')}
        </div>
      </div>
      <div className="fld" style={{ marginTop: 14 }}>
        <label htmlFor="pf-nom">{t('Nom')}</label>
        <div className={'inp' + (vu && errNom ? ' err' : '')}>
          <Icone nom="user-round" taille={18} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
          <input
            id="pf-nom"
            value={brouillon.nom}
            autoComplete="family-name"
            maxLength={40}
            onChange={(e) => setBrouillon((b) => ({ ...b, nom: e.target.value }))}
          />
        </div>
        <div className="hint" style={vu && errNom ? { color: 'var(--red)' } : undefined}>
          {t(vu && errNom ? errNom : 'Jamais montré aux vendeurs (Boutique A, B…).')}
        </div>
      </div>

      <div className="card tight mt16 pf-ligne">
        <Link to={chemin('profil-email')} className="li">
          <span className="ic">
            <Icone nom="mail" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('E-mail')}
            </span>
            <span className="ls">{t(client.emailMasque + (client.connexion === 'google' ? ' · Google' : ''))}</span>
          </span>
          <span className="t13 b8" style={{ color: 'var(--or-txt)' }}>{t('Changer')}</span>
          <span className="chev">
            <Icone nom="chevron-right" taille={18} />
          </span>
        </Link>
        <Link to={chemin(verifie === false ? 'numero' : 'numero-changer')} className="li">
          <span className="ic">
            <Icone nom="smartphone" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('Numéro')}
            </span>
            <span className="ls">
              {client.numeroMasque}
              {verifie === false ? (
                <span style={{ color: 'var(--amber)', fontWeight: 700 }}>{t(' · pas encore vérifié')}</span>
              ) : (
                <span className="ok" style={{ color: 'var(--green)', fontWeight: 700 }}>
                  <Icone nom="check" taille={13} trait={3} style={{ verticalAlign: '-1px' }} />
                  {t(' Vérifié')}
                </span>
              )}
            </span>
          </span>
          <span className="t13 b8" style={{ color: 'var(--or-txt)' }}>{t(verifie === false ? 'Vérifier' : 'Changer')}</span>
          <span className="chev">
            <Icone nom="chevron-right" taille={18} />
          </span>
        </Link>
      </div>
      <div className="hint-l">
        <Icone nom="shield-check" taille={15} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>{t('L’e-mail et le numéro changent avec deux codes : un à l’ancien, un au nouveau.')}</span>
      </div>

      {liste.length > 0 && (
        <div className="hint-l" role="status">
          <Icone nom="pencil" taille={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{t('À enregistrer : ') + liste.map((c) => t(c)).join(', ') + '.'}</span>
        </div>
      )}
      <Bloc classe="c13-act">
      <div className="mt16">
        <Bouton icone="check" inactif={!liste.length || (vu && !valide)} onClick={enregistrer}>
          {t('Enregistrer')}
        </Bouton>
      </div>
      {liste.length > 0 && (
        <div className="mt10">
          <Bouton genre="ghost" onClick={() => (setBrouillon(avant), setVu(false), setErreurPhoto(null))}>
            {t('Annuler mes changements')}
          </Bouton>
        </div>
      )}
      </Bloc>
      <div className="hint-l">
        <Icone nom="message-square" taille={15} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>{t('Un code par SMS au ') + client.numeroMasque + t(' confirmera tes changements.')}</span>
      </div>

      <div className="card tight mt16">
        <Link to={chemin('securite')} className="li">
          <span className="ic">
            <Icone nom="shield-check" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('Numéro et connexion')}
            </span>
            <span className="ls">{t('Mot de passe, appareils connectés, Face ID')}</span>
          </span>
          <span className="chev">
            <Icone nom="chevron-right" taille={18} />
          </span>
        </Link>
        <Link to={chemin('confidentialite')} className="li">
          <span className="ic">
            <Icone nom="lock" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('Confidentialité et données')}
            </span>
            <span className="ls">{t('Qui voit quoi, nom donné au retrait, tes données')}</span>
          </span>
          <span className="chev">
            <Icone nom="chevron-right" taille={18} />
          </span>
        </Link>
      </div>

      </Bloc>
      </Bloc>
      <input ref={camera} type="file" accept="image/*" capture="user" hidden onChange={choisir} />
      <input ref={galerie} type="file" accept={TYPES_PHOTO.join(',')} hidden onChange={choisir} />
    </EcranCompte>
  )
}
