// Écran « S'inscrire depuis l'étranger » (DP-54). En tête, le même choix que la connexion : Google, Apple (prénom,
// nom et e-mail repris du fournisseur, e-mail déjà vérifié : ni code e-mail ni mot de passe ; compte déjà ouvert
// avec cette adresse : s'y connecter, ou le passer en diaspora avec les mêmes contrôles), e-mail (formulaire
// ci-dessous) ou numéro étranger (code SMS tout de suite, e-mail facultatif). Puis l'étape commune et obligatoire.
// Moyen « e-mail » : un compte diaspora : prénom et nom (vus du proche qui reçoit),
// e-mail, date de naissance (majeur), pays et ville de résidence (un pays accepté ; Cameroun : compte normal ; autre
// pays : pas encore), numéro de ce pays vérifié par SMS (jamais +237), mot de passe, et l'engagement : majeur, vit
// hors du Cameroun, achète pour ses proches sans revente, carte à son nom, jamais d'argent liquide. Deux codes
// partent ensemble : un par SMS au numéro, un à l'e-mail (démonstration : SMS 503917, e-mail 284615, affichés à
// l'écran) ; chacun se renvoie à part, chaque code faux a son message ; le compte n'est créé qu'avec les deux codes
// justes, pour ce numéro et cette adresse. Le serveur refait les contrôles. Ensuite : relier un proche au Cameroun.
// Tout savoir : /diaspora-infos.
// Listes d'envies (DP-54) : « next » ramène à la page demandée (créer sa liste) ; après un cadeau offert par carte
// depuis l'étranger, le prénom, l'e-mail et le pays saisis sont repris (gardés dans ce navigateur, jamais dans
// l'adresse) : créer le compte est facultatif.
// Écran propre au site (absent du prototype).
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Dessin } from '../../composants/Dessin'
import { Feuille } from '../../composants/Feuille'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { RENVOI_TROP_TOT, useEnvoiCode } from '../../composants/SaisieCode'
import { chemin } from '../../config/pages'
import { chiffres } from '../../donnees/numeros'
import { AGE_DIASPORA, PAYS_DIASPORA, source, type EnvoiCode, type FournisseurDiaspora, type IdentiteFournisseur } from '../../donnees/source'
import { usePreferences } from '../../preferences'
import { Partage } from '../CL-03/Arrivee'
import { useMajSession } from '../../session'

export const PAYS = PAYS_DIASPORA
// Âge révolu à aujourd'hui (le serveur recontrôle avec son heure).
const age = (iso: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return -1
  const [a, m, j] = iso.split('-').map(Number)
  const d = new Date()
  return d.getFullYear() - a - (d.getMonth() + 1 < m || (d.getMonth() + 1 === m && d.getDate() < j) ? 1 : 0)
}

// Saisie reprise d'un cadeau offert depuis l'étranger (ListeOffert) : prénom, e-mail, pays.
export const CLE_REPRISE_DIASPORA = 'blv_reprise_diaspora'
function reprise(): { prenom?: string; email?: string; pays?: string } {
  try {
    return JSON.parse(sessionStorage.getItem(CLE_REPRISE_DIASPORA) ?? '{}') ?? {}
  } catch {
    return {}
  }
}

export function InscriptionDiaspora() {
  const { t, tf } = usePreferences()
  const naviguer = useNavigate()
  const majSession = useMajSession()
  const [params] = useSearchParams()
  const suite = params.get('next')
  const suiteSure = suite && suite.startsWith('/') && !suite.startsWith('//') ? suite : null
  const [r0] = useState(reprise)
  const [f, setF] = useState({ prenom: r0.prenom ?? '', nom: '', email: r0.email ?? '', naissance: '', ville: '', numero: '', motDePasse: '' })
  const [pays, setPays] = useState(r0.pays && PAYS_DIASPORA.some(([p]) => p === r0.pays) ? r0.pays : 'France')
  // Moyen d'inscription : choisi en tête ; une saisie reprise d'un cadeau (e-mail) ouvre directement le formulaire.
  const [moyen, setMoyen] = useState<FournisseurDiaspora | null>(r0.email ? 'email' : null)
  const [identite, setIdentite] = useState<IdentiteFournisseur | null>(null) // Google, Apple
  const [convertir, setConvertir] = useState(false) // compte Google ou Apple existant passé en diaspora
  const [feuille, setFeuille] = useState<'google' | 'apple' | null>(null)
  const [existant, setExistant] = useState<IdentiteFournisseur | null>(null) // adresse qui a déjà un compte
  const [connu, setConnu] = useState<{ prenom: string; nomComplet: string; emailMasque: string } | null>(null)
  const [attente, setAttente] = useState<string | null>(null)
  const [engage, setEngage] = useState(false)
  const [vu, setVu] = useState(false)
  const [code, setCode] = useState<string | null>(null) // null : formulaire ; sinon : saisie des codes
  const [codeEmail, setCodeEmail] = useState('')
  const [envois, setEnvois] = useState<{ sms: EnvoiCode; email: EnvoiCode | null } | null>(null)
  const [refus, setRefus] = useState<string | null>(null) // code SMS faux, ou refus général
  const [refusEmail, setRefusEmail] = useState<string | null>(null)
  const [general, setGeneral] = useState<string | null>(null) // refus qui ne tient pas aux codes (compte existant, âge…)
  const [renvoye, setRenvoye] = useState({ sms: false, email: false })
  // Moyen « numéro » : le code SMS est vérifié tout de suite, avant le reste.
  const [envoiNum, setEnvoiNum] = useState<EnvoiCode | null>(null)
  const [codeNum, setCodeNum] = useState('')
  const [refusNum, setRefusNum] = useState<string | null>(null)
  const [numVerifie, setNumVerifie] = useState<string | null>(null)
  const envoyerSms = useEnvoiCode()
  const envoyerEmail = useEnvoiCode()
  useEffect(() => {
    source.compteConnu().then(setConnu)
  }, [])
  const social = moyen === 'google' || moyen === 'apple'
  const accepte = PAYS.find((p) => p[0] === pays)
  const indicatif = accepte?.[1] ?? ''
  const n = chiffres(f.numero)
  const a = age(f.naissance)
  const verifie = moyen === 'numero' && !!numVerifie && numVerifie === chiffres(indicatif + f.numero)
  const emailValide = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(f.email.trim())
  const erreurs = {
    prenom: f.prenom.trim().length < 2 ? 'Indique ton prénom.' : null,
    nom: f.nom.trim().length < 2 ? 'Indique ton nom : ton proche voit qui paie.' : null,
    email: moyen === 'email' ? (!emailValide ? 'Indique une adresse e-mail valide.' : null) : moyen === 'numero' && f.email.trim() && !emailValide ? 'Indique une adresse e-mail valide, ou laisse ce champ vide.' : null,
    naissance: a < 0 || a > 120 ? 'Indique ta date de naissance.' : a < AGE_DIASPORA ? 'Le compte diaspora est réservé aux personnes majeures (18 ans ou plus).' : null,
    ville: f.ville.trim().length < 2 ? 'Indique ta ville.' : null,
    numero: /^\s*(\+|00)?\s*237/.test(f.numero)
      ? 'Un numéro camerounais ouvre un compte normal : indique ton numéro du pays où tu vis.'
      : n.length < 6 || n.length > 12
        ? 'Indique ton numéro de téléphone dans ce pays.'
        : moyen === 'numero' && !verifie
          ? 'Vérifie ce numéro avec le code reçu par SMS.'
          : null,
    motDePasse: moyen === 'email' && (f.motDePasse.length < 8 || !/\d/.test(f.motDePasse)) ? '8 caractères au moins, dont un chiffre.' : null,
    engage: !engage ? 'Coche l’engagement pour continuer.' : null,
    pays: !accepte ? 'Ce pays ne permet pas d’ouvrir un compte diaspora.' : null,
  }
  const champ = (k: keyof typeof f, label: string, type = 'text', aide?: string, max?: string) => (
    <div className="fld">
      <label htmlFor={'di-' + k}>{t(label)}</label>
      <div className={'inp' + (vu && erreurs[k] ? ' err' : '')}>
        {k === 'numero' && <b className="t15">{indicatif}</b>}
        <input id={'di-' + k} type={type} max={max} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
        {k === 'numero' && verifie && <Icone nom="circle-check" taille={18} style={{ color: 'var(--green)', flexShrink: 0 }} />}
      </div>
      {vu && erreurs[k] ? (
        <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
          {t(erreurs[k]!)}
        </div>
      ) : (
        aide && <div className="hint">{t(aide)}</div>
      )}
    </div>
  )
  const vers = { sms: `${indicatif} ${f.numero.trim()}`, email: f.email.trim() }
  // Après une connexion (compte existant) : l'espace diaspora pour un compte diaspora, sinon la page demandée.
  const seConnecter = async (m: 'google' | 'apple') => {
    setAttente('connexion')
    const s = await source.connecter(m)
    majSession(s)
    naviguer(s.typeCompte === 'diaspora' ? chemin('espace-diaspora') : (suiteSure ?? chemin('accueil')), { replace: true })
  }
  // Google ou Apple : l'identité (prénom, nom, e-mail vérifié) ; une adresse déjà inscrite propose ses choix.
  const choisirCompte = async (m: 'google' | 'apple', compte: 'appareil' | 'autre') => {
    setAttente(m)
    const id = await source.identiteFournisseur(m, compte)
    setAttente(null)
    if (id.compte) return (setExistant(id), setFeuille(m))
    prendre(id, m, false)
  }
  const prendre = (id: IdentiteFournisseur, m: 'google' | 'apple', conv: boolean) => {
    setIdentite(id)
    setConvertir(conv)
    setMoyen(m)
    setF((x) => ({ ...x, prenom: id.prenom || x.prenom, nom: id.nom || x.nom, email: id.email }))
    setFeuille(null)
    setExistant(null)
    setVu(false)
    setGeneral(null)
  }
  const changerMoyen = () => {
    setMoyen(null)
    setIdentite(null)
    setConvertir(false)
    setVu(false)
    setGeneral(null)
    setEnvoiNum(null)
    setCodeNum('')
    setNumVerifie(null)
    setF((x) => (social ? { ...x, email: r0.email ?? '' } : x))
  }
  // Moyen « numéro » : le code part au numéro étranger et se vérifie aussitôt.
  const envoyerNum = async (renvoi = false) => {
    if (!accepte || erreurs.numero !== 'Vérifie ce numéro avec le code reçu par SMS.') return setVu(true)
    const e = await envoyerSms(vers.sms, () => source.envoyerCodeDiaspora('sms', vers.sms), renvoi ? { renvoi: true } : undefined)
    if (!e) return renvoi && setRefusNum(RENVOI_TROP_TOT)
    setEnvoiNum(e)
    setCodeNum('')
    setRefusNum(null)
  }
  const verifierNum = async () => {
    const r = await source.verifierCodeDiaspora(vers.sms, codeNum)
    if (r.ok) (setNumVerifie(chiffres(indicatif + f.numero)), setEnvoiNum(null), setRefusNum(null))
    else setRefusNum('Ce code n’est pas le bon : regarde le dernier SMS reçu, ou renvoie le code.')
  }
  // Google, Apple : un code SMS au numéro ; e-mail : un code SMS et un code e-mail, ensemble ; numéro : déjà vérifié.
  const envoyer = async () => {
    setVu(true)
    if (Object.values(erreurs).some(Boolean)) return
    if (moyen === 'numero') return valider()
    const [sms, email] = await Promise.all([
      envoyerSms(vers.sms, () => source.envoyerCodeDiaspora('sms', vers.sms)),
      moyen === 'email' ? envoyerEmail(vers.email, () => source.envoyerCodeDiaspora('email', vers.email)) : Promise.resolve(null),
    ])
    if (!sms || (moyen === 'email' && !email)) return
    setEnvois({ sms, email })
    setRefus(null)
    setRefusEmail(null)
    setGeneral(null)
    setRenvoye({ sms: false, email: false })
    setCodeEmail('')
    setCode('')
  }
  const renvoyer = async (canal: 'sms' | 'email') => {
    // Un renvoi par geste, après le délai de renvoi seulement (le serveur répondrait 429 trop_tot).
    const e = await (canal === 'sms' ? envoyerSms : envoyerEmail)(vers[canal], () => source.envoyerCodeDiaspora(canal, vers[canal]), { renvoi: true })
    if (!e) return canal === 'sms' ? setRefus(RENVOI_TROP_TOT) : setRefusEmail(RENVOI_TROP_TOT)
    setEnvois((x) => (x ? { ...x, [canal]: e } : x))
    setRenvoye((x) => ({ ...x, [canal]: true }))
    if (canal === 'sms') (setCode(''), setRefus(null))
    else (setCodeEmail(''), setRefusEmail(null))
  }
  const valider = async (conv = convertir) => {
    if (!moyen) return
    const r = await source.inscrireDiaspora({
      fournisseur: moyen,
      jeton: identite?.jeton,
      convertir: social ? conv : undefined,
      prenom: f.prenom,
      nom: f.nom,
      email: social && identite ? identite.email : f.email.trim(),
      motDePasse: moyen === 'email' ? f.motDePasse : undefined,
      codeEmail: moyen === 'email' ? codeEmail : undefined,
      naissance: f.naissance,
      pays,
      ville: f.ville,
      indicatif,
      numero: f.numero,
      code: moyen === 'numero' ? codeNum : (code ?? ''),
    })
    setRefus(null)
    setRefusEmail(null)
    setGeneral(null)
    if (r.ok) {
      majSession(r.session)
      try {
        sessionStorage.removeItem(CLE_REPRISE_DIASPORA)
      } catch {
        // stockage indisponible
      }
      naviguer(suiteSure ?? chemin('proches'), { replace: true })
    } else if (r.raison === 'codeEmail') setRefusEmail('Ce code n’est pas le bon : regarde le dernier e-mail reçu (et tes indésirables), ou renvoie le code.')
    else if (r.raison === 'code') {
      if (moyen === 'numero') (setNumVerifie(null), setGeneral('Ce code n’est plus valable : vérifie à nouveau ton numéro.'))
      else setRefus('Ce code n’est pas le bon : regarde le dernier SMS reçu, ou renvoie le code.')
    } else if (r.raison === 'jeton') {
      changerMoyen()
      setGeneral('La réponse de Google ou d’Apple a expiré : choisis à nouveau ton compte.')
    } else
      setGeneral(
        r.raison === 'existe'
          ? social
            ? 'Un compte BelivaY existe déjà avec cette adresse.'
            : 'Un compte existe déjà avec cette adresse : connecte-toi.'
          : r.raison === 'age'
            ? 'Le compte diaspora est réservé aux personnes majeures (18 ans ou plus).'
            : r.raison === 'pays'
              ? 'Ce pays ne permet pas d’ouvrir un compte diaspora.'
              : r.raison === 'numero'
                ? 'Un numéro camerounais ouvre un compte normal : indique ton numéro du pays où tu vis.'
                : 'Vérifie les champs.',
      )
  }
  const majeurLe = (() => {
    const d = new Date()
    return `${d.getFullYear() - AGE_DIASPORA}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })()
  const noteGenerale = general && (
    <div className="note red" role="alert">
      <Icone nom="circle-alert" taille={18} />
      <div>
        {t(general)} {general.startsWith('Un compte existe') && <Link to={chemin('connexion')}>{t('Me connecter')}</Link>}
        {general.startsWith('Un compte BelivaY existe') && identite && (moyen === 'google' || moyen === 'apple') && (
          <>
            {' '}
            <a href="#" onClick={(e) => (e.preventDefault(), seConnecter(moyen))}>
              {t('Me connecter')}
            </a>
            {' · '}
            <a href="#" onClick={(e) => (e.preventDefault(), setConvertir(true), valider(true))}>
              {t('Passer ce compte en diaspora')}
            </a>
          </>
        )}
      </div>
    </div>
  )
  const nomFournisseur = feuille === 'apple' ? 'Apple' : 'Google'

  // Feuille des comptes Google (comme à la connexion) ; adresse déjà inscrite (Google ou Apple) : se connecter, ou
  // passer ce compte en diaspora.
  const feuilleComptes = (
    <Feuille ouverte={!!feuille} fermer={() => (setFeuille(null), setExistant(null))} titre={t(feuille === 'apple' ? 'Compte Apple' : 'Compte Google du téléphone')}>
      {existant ? (
        <>
          <div className="cl03-bigic green">
            <Icone nom="user-check" taille={34} />
          </div>
          <h2 className="cl03-sheet-t cl03-center mt12">{tf('Bon retour, {p}', { p: existant.prenom })}</h2>
          {existant.compte === 'diaspora' ? (
            <>
              <p className="cl03-sheet-s cl03-center">
                <span>{existant.email}</span> <span>{tf('a déjà un compte diaspora. {f} confirme qu’elle est à toi : connecte-toi, ton espace diaspora s’ouvre.', { f: nomFournisseur })}</span>
              </p>
              <div className="mt16">
                <a href="#" className={'btn primary' + (attente ? ' off' : '')} onClick={(e) => (e.preventDefault(), !attente && seConnecter(feuille ?? 'google'))}>
                  <Icone nom="arrow-right" taille={18} />
                  <span>{t(attente ? 'Ouverture…' : 'Ouvrir mon espace diaspora')}</span>
                </a>
              </div>
            </>
          ) : (
            <>
              <p className="cl03-sheet-s cl03-center">
                <span>{existant.email}</span> <span>{t('a déjà un compte BelivaY. Connecte-toi, ou passe ce compte en diaspora si tu vis désormais à l’étranger.')}</span>
              </p>
              <div className="mt16">
                <a href="#" className={'btn primary' + (attente ? ' off' : '')} onClick={(e) => (e.preventDefault(), !attente && seConnecter(feuille ?? 'google'))}>
                  <Icone nom="log-in" taille={18} />
                  <span>{t(attente ? 'Ouverture…' : 'Me connecter à ce compte')}</span>
                </a>
              </div>
              <div className="mt10">
                <a href="#" className="btn secondary" onClick={(e) => (e.preventDefault(), prendre(existant, feuille ?? 'google', true))}>
                  <Icone nom="globe" taille={18} />
                  <span>{t('Passer ce compte en diaspora')}</span>
                </a>
              </div>
              <div className="hint-l">
                <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
                <span>{t('Mêmes contrôles qu’une inscription : 18 ans ou plus, pays accepté, numéro de ce pays vérifié par SMS. Ensuite, le compte sert seulement à payer et faire livrer tes proches.')}</span>
              </div>
            </>
          )}
        </>
      ) : (
        <>
          <p className="t12 b8 c3" style={{ textTransform: 'uppercase', letterSpacing: '.08em', margin: '0' }}>
            <Icone nom="cl03-google" taille={14} style={{ verticalAlign: '-2px', marginRight: '4px' }} />
            {t('Compte Google du téléphone')}
          </p>
          <h2 className="cl03-sheet-t mt8">{t('Choisis un compte')}</h2>
          <p className="cl03-sheet-s">{t('pour ouvrir ton compte diaspora')}</p>
          {connu && (
            <a href="#" className="cl03-acct" onClick={(e) => (e.preventDefault(), !attente && choisirCompte('google', 'appareil'))}>
              <span className="portrait" style={{ width: '40px', height: '40px' }}>
                <Dessin id="84fd796ff40f" />
              </span>
              <span className="grow">
                <b className="t15 b8" style={{ display: 'block' }}>
                  {connu.nomComplet}
                </b>
                <span className="t13 c3">{connu.emailMasque}</span>
              </span>
              <Icone nom="chevron-right" taille={18} style={{ color: 'var(--ink-4)' }} />
            </a>
          )}
          <a href="#" className="cl03-acct" style={{ marginTop: '8px' }} onClick={(e) => (e.preventDefault(), !attente && choisirCompte('google', 'autre'))}>
            <span className="ic-sq" style={{ borderRadius: '50%', width: '40px', height: '40px' }}>
              <Icone nom="user-plus" taille={19} />
            </span>
            <span className="grow b7 t14">{t('Utiliser un autre compte')}</span>
          </a>
          <div className="hint-l">
            <Icone nom="shield-check" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{t('Google partage seulement ton nom, ton e-mail et ta photo.')}</span>
          </div>
        </>
      )}
    </Feuille>
  )

  const choixPays = (
    <>
      <div className="fld">
        <label htmlFor="di-pays">{t('Pays où tu vis')}</label>
        <div className="inp">
          <select id="di-pays" value={pays} onChange={(e) => setPays(e.target.value)} style={{ width: '100%', border: 0, background: 'transparent', font: 'inherit', color: 'inherit' }}>
            {PAYS.map(([p]) => (
              <option key={p} value={p}>
                {t(p)}
              </option>
            ))}
            <option value="Cameroun">{t('Cameroun')}</option>
            <option value="Autre">{t('Autre pays')}</option>
          </select>
        </div>
      </div>
      {!accepte && (
        <div className="note amber" role="alert">
          <Icone nom="triangle-alert" taille={18} />
          <div>
            {pays === 'Cameroun' ? (
              <>
                {t('Tu vis au Cameroun : ouvre un compte normal avec ton numéro +237. Un proche à l’étranger pourra commander ou payer pour toi.')} <Link to={chemin('connexion')}>{t('Créer mon compte')}</Link>
              </>
            ) : (
              <>
                {t('Ce pays n’est pas encore ouvert au compte diaspora (et jamais un pays sous sanctions). Ton proche au Cameroun peut t’envoyer son panier à payer par lien.')} <Link to={chemin('diaspora-infos')}>{t('Pays acceptés')}</Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
  // Moyen « numéro » : pays, numéro, code SMS vérifié tout de suite.
  const numeroVerifie = (
    <>
      {choixPays}
      {champ('numero', 'Ton numéro de téléphone', 'tel', verifie ? 'Numéro vérifié : il ouvre ton compte, sans mot de passe.' : 'Un code de vérification part par SMS.')}
      {!verifie &&
        (envoiNum ? (
          <div className="fld">
            <label htmlFor="di-code-num">{t('Code reçu par SMS')}</label>
            <div className={'inp' + (refusNum ? ' err' : '')}>
              <input id="di-code-num" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={codeNum} onChange={(e) => (setCodeNum(e.target.value.replace(/\D/g, '')), setRefusNum(null))} />
            </div>
            {refusNum ? (
              <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
                {t(refusNum)}
              </div>
            ) : (
              <div className="hint">{tf('Envoyé par SMS au {n}.', { n: envoiNum.destination })}</div>
            )}
            {envoiNum.codeDemo && <p className="t12 c3">{t('Démonstration : le code est ') + envoiNum.codeDemo + '.'}</p>}
            <div className="btns">
              <button type="button" className={'btn primary' + (codeNum.length === 6 ? '' : ' off')} onClick={() => codeNum.length === 6 && verifierNum()}>
                <span>{t('Valider mon numéro')}</span>
              </button>
            </div>
            <div className="links">
              <a href="#" onClick={(e) => (e.preventDefault(), envoyerNum(true))}>
                {t('Je n’ai rien reçu : renvoyer le SMS')}
              </a>
            </div>
          </div>
        ) : (
          <div className="btns">
            <button type="button" className={'btn secondary' + (accepte ? '' : ' off')} onClick={() => envoyerNum()}>
              <Icone nom="message-square-text" taille={18} />
              <span>{t('Recevoir mon code par SMS')}</span>
            </button>
          </div>
        ))}
    </>
  )
  const moyenLibelle = moyen === 'google' ? 'Avec Google' : moyen === 'apple' ? 'Avec Apple' : moyen === 'numero' ? 'Avec mon numéro (étranger)' : 'Avec mon e-mail'

  return (
    <Ecran route="inscription-diaspora" gabarit="arrivee" avant={<Styles id="e45eeaa1bc" />} fixes={feuilleComptes}>
      <Styles id="f16ded0d4c" />
      <Partage
        visuel={
          <div className="hero orange mt12">
            <div className="hk">{t('Diaspora')}</div>
            <div className="cl11-ht">{t('Fais tes courses pour ta famille au Cameroun')}</div>
            <div className="hs">{t('Tu paies par carte depuis l’étranger. Ton proche retire au relais avec son code. Tu ne vois jamais son numéro ni son adresse.')}</div>
          </div>
        }
      >
        {code !== null && envois ? (
          <div className="card vedette">
            <h3 className="cl11-k">{t(envois.email ? 'Vérifie ton numéro et ton e-mail' : 'Vérifie ton numéro')}</h3>
            <p className="t13 c2">
              {t(
                envois.email
                  ? 'Deux codes à 6 chiffres viennent de partir, valables 10 minutes. Ton compte n’est créé qu’avec les deux : ton numéro et ton e-mail sont alors vérifiés.'
                  : 'Un code à 6 chiffres vient de partir par SMS, valable 10 minutes. Ton e-mail est déjà vérifié par Google ou Apple : ton compte est créé avec ce code.',
              )}
            </p>
            {noteGenerale}
            <div className="fld">
              <label htmlFor="di-code">{t('Code reçu par SMS')}</label>
              <div className={'inp' + (refus ? ' err' : '')}>
                <input id="di-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
              </div>
              {refus ? (
                <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
                  {t(refus)}
                </div>
              ) : (
                <div className="hint">{tf(renvoye.sms ? 'Nouveau code envoyé par SMS au {n}.' : 'Envoyé par SMS au {n}.', { n: envois.sms.destination })}</div>
              )}
              {envois.sms.codeDemo && <p className="t12 c3">{t('Démonstration : le code est ') + envois.sms.codeDemo + '.'}</p>}
              <div className="links">
                <a href="#" onClick={(e) => (e.preventDefault(), renvoyer('sms'))}>
                  {t('Je n’ai rien reçu : renvoyer le SMS')}
                </a>
              </div>
            </div>
            {envois.email && (
              <div className="fld">
                <label htmlFor="di-code-email">{t('Code reçu par e-mail')}</label>
                <div className={'inp' + (refusEmail ? ' err' : '')}>
                  <input id="di-code-email" inputMode="numeric" maxLength={6} value={codeEmail} onChange={(e) => setCodeEmail(e.target.value.replace(/\D/g, ''))} />
                </div>
                {refusEmail ? (
                  <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
                    {t(refusEmail)}
                  </div>
                ) : (
                  <div className="hint">{tf(renvoye.email ? 'Nouveau code envoyé à {e}. Pense aux indésirables.' : 'Envoyé à {e}. Pense aux indésirables.', { e: envois.email.destination })}</div>
                )}
                {envois.email.codeDemo && <p className="t12 c3">{t('Démonstration : le code est ') + envois.email.codeDemo + '.'}</p>}
                <div className="links">
                  <a href="#" onClick={(e) => (e.preventDefault(), renvoyer('email'))}>
                    {t('Je n’ai rien reçu : renvoyer l’e-mail')}
                  </a>
                </div>
              </div>
            )}
            <div className="btns">
              {(() => {
                const pret = code.length === 6 && (!envois.email || codeEmail.length === 6)
                return (
                  <button type="button" className={'btn primary' + (pret ? '' : ' off')} onClick={() => pret && valider()}>
                    <span>{t(convertir ? 'Passer mon compte en diaspora' : 'Créer mon compte diaspora')}</span>
                  </button>
                )
              })()}
            </div>
            <div className="btns">
              <button type="button" className="btn secondary" onClick={() => setCode(null)}>
                <span>{t(envois.email ? 'Corriger mon numéro ou mon e-mail' : 'Corriger mon numéro')}</span>
              </button>
            </div>
            <p className="t12 c3">{t(envois.email ? 'Si tu corriges ton numéro ou ton e-mail, de nouveaux codes partent : les anciens ne valent plus.' : 'Si tu corriges ton numéro, un nouveau code part : l’ancien ne vaut plus.')}</p>
          </div>
        ) : moyen === null ? (
          <>
            {/* Le même choix qu'à la connexion : Google, Apple, e-mail, numéro (étranger). */}
            <h3 className="cl11-k" style={{ marginTop: 18 }}>{t('Ouvre ton compte diaspora')}</h3>
            {noteGenerale}
            <div className="mt8">
              <a href="#" className={'btn apple cl03-g' + (attente === 'google' ? ' off' : '')} onClick={(e) => (e.preventDefault(), setFeuille('google'))}>
                <span className="gg">
                  <Icone nom="gpay-g" taille={16} />
                </span>
                <span>{t('Continuer avec Google')}</span>
              </a>
              <Styles id="b472efbe3c" />
              <a
                href="#"
                className={'btn cx-apple' + (attente === 'apple' ? ' off' : '')}
                style={{ background: '#fff', color: '#000', boxShadow: 'inset 0 0 0 1.5px var(--line-2)' }}
                onClick={(e) => (e.preventDefault(), !attente && choisirCompte('apple', 'appareil'))}
              >
                <Icone nom="apple" taille={19} />
                <span>{t(attente === 'apple' ? 'Ouverture…' : 'Continuer avec Apple')}</span>
              </a>
            </div>
            {/* Une colonne : les libellés longs (« Avec mon numéro (étranger) ») ne tiennent pas à deux par ligne. */}
            <div className="cx-duo" style={{ gridTemplateColumns: '1fr' }}>
              <a href="#" className="btn secondary" onClick={(e) => (e.preventDefault(), setMoyen('email'))}>
                <Icone nom="mail" taille={18} />
                <span>{t('Avec mon e-mail')}</span>
              </a>
              <a href="#" className="btn secondary" onClick={(e) => (e.preventDefault(), setMoyen('numero'))}>
                <Icone nom="smartphone" taille={18} />
                <span>{t('Avec mon numéro (étranger)')}</span>
              </a>
            </div>
            <div className="card info cl03-info">
              <Icone nom="list-checks" taille={20} />
              <span>{t('Ensuite, pour tous : ton pays, ta ville, ta date de naissance et ton numéro du pays où tu vis, vérifié par SMS.')}</span>
            </div>
            <div className="card">
              <h3 className="cl11-k">{t('Avant de commencer')}</h3>
              {[
                t('Tu as 18 ans ou plus et tu vis hors du Cameroun.'),
                t('Un numéro de téléphone du pays où tu vis, pour le code SMS.'),
                t('Un compte Google ou Apple, ou une adresse e-mail à toi (facultative avec ton numéro) : tes reçus y arrivent.'),
                t('Une carte Visa ou Mastercard à ton nom, avec 3-D Secure.'),
                t('Tu achètes pour tes proches, jamais pour revendre.'),
              ].map((x) => (
                <div key={x} className="hint-l">
                  <Icone nom="circle-check" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
                  <span>{x}</span>
                </div>
              ))}
              <div className="links">
                <Link to={chemin('diaspora-infos')}>{t('Qui peut ouvrir un compte diaspora ?')}</Link>
              </div>
            </div>
            {/* DP-54 : le type de compte se décide ici, une fois pour toutes ; le site s'y adapte partout. */}
            <div className="card">
              <h3 className="cl11-k">{t('Un compte diaspora sert à')}</h3>
              {[
                ['circle-check', 'Payer et faire livrer tes proches reliés : au relais qu’ils ont choisi, ou chez eux s’ils l’acceptent.'],
                ['circle-check', 'Payer les paniers qu’ils t’envoient, depuis ton application.'],
                ['circle-check', 'Voir les prix en F CFA, en euros ou en dollars US (Réglages).'],
                ['circle-x', 'Pas de retrait pour toi, pas de paiement au comptoir, pas de Mobile Money ni de portefeuille : carte, Apple Pay ou Google Pay.'],
              ].map(([ic, x]) => (
                <div key={x} className="hint-l">
                  <Icone nom={ic} taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
                  <span>{t(x)}</span>
                </div>
              ))}
            </div>
            <p className="t12 c3">
              {t('En créant ton compte, tu acceptes nos conditions.')} <Link to={chemin('legal-doc', { d: 'cgu' })}>{t('Les lire')}</Link>
            </p>
            <div className="links">
              <Link to={chemin('connexion')}>{t('J’ai déjà un compte')}</Link>
              <Link to={chemin('diaspora-infos')}>{t('Comment ça marche')}</Link>
            </div>
          </>
        ) : (
          <>
            {/* Le moyen choisi, et le retour au choix. */}
            <div className="card row" style={{ gap: 10 }}>
              <Icone nom={moyen === 'google' ? 'gpay-g' : moyen === 'apple' ? 'apple' : moyen === 'numero' ? 'smartphone' : 'mail'} taille={20} style={{ flexShrink: 0 }} />
              <span className="grow">
                <b className="t14" style={{ display: 'block' }}>
                  {t(convertir ? 'Passer mon compte en diaspora' : moyenLibelle)}
                </b>
                <span className="t13 c3">
                  {social && identite
                    ? tf('{e} · e-mail vérifié par {f}', { e: identite.email, f: moyen === 'apple' ? 'Apple' : 'Google' })
                    : t(moyen === 'numero' ? 'Ton numéro ouvre ton compte : pas de mot de passe.' : 'Un mot de passe et deux codes : SMS et e-mail.')}
                </span>
              </span>
              <a href="#" className="t13 b7" onClick={(e) => (e.preventDefault(), changerMoyen())}>
                {t('Changer')}
              </a>
            </div>
            {noteGenerale}
            {moyen === 'numero' && numeroVerifie}
            {champ('prenom', 'Prénom')}
            {champ('nom', 'Nom', 'text', 'Ton proche voit qui lui envoie une commande.')}
            {moyen === 'email' && champ('email', 'E-mail', 'email', 'Un code de vérification y part ; ensuite, tes reçus et les preuves de retrait.')}
            {moyen === 'numero' && champ('email', 'E-mail (facultatif)', 'email', 'Pour recevoir tes reçus et les preuves de retrait. Sans e-mail, ils restent dans ton application.')}
            {moyen === 'email' && champ('motDePasse', 'Mot de passe', 'password')}
            {/* Étape diaspora commune et obligatoire, quel que soit le moyen. */}
            <h3 className="cl11-k" style={{ marginTop: 22 }}>{t('Ta vie à l’étranger')}</h3>
            <p className="t13 c2">{t('Obligatoire pour tout compte diaspora : le serveur refait ces contrôles.')}</p>
            {champ('naissance', 'Date de naissance', 'date', 'Le compte diaspora est réservé aux personnes majeures.', majeurLe)}
            {moyen !== 'numero' && choixPays}
            {champ('ville', 'Ville')}
            {moyen !== 'numero' && champ('numero', 'Ton numéro de téléphone', 'tel', 'Un code de vérification part par SMS.')}
            <a href="#" role="checkbox" aria-checked={engage} className="row" style={{ gap: 10, color: 'inherit', alignItems: 'flex-start' }} onClick={(e) => (e.preventDefault(), setEngage(!engage))}>
              <Icone nom={engage ? 'square-check' : 'square'} taille={20} style={engage ? { color: 'var(--or)', flexShrink: 0 } : { flexShrink: 0 }} />
              <span className="t13 c2">{t('J’ai 18 ans ou plus et je vis hors du Cameroun. J’achète pour mes proches, sans revente, et je paie avec une carte à mon nom. BelivaY ne transfère jamais d’argent liquide.')}</span>
            </a>
            {vu && erreurs.engage && (
              <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
                {t(erreurs.engage)}
              </div>
            )}
            <div className="btns mt16">
              <button type="button" className={'btn primary' + (accepte ? '' : ' off')} onClick={envoyer}>
                <span>{t(moyen === 'email' ? 'Recevoir mes codes (SMS et e-mail)' : moyen === 'numero' ? (convertir ? 'Passer mon compte en diaspora' : 'Créer mon compte diaspora') : 'Recevoir mon code SMS')}</span>
              </button>
            </div>
            <p className="t12 c3">
              {t('En créant ton compte, tu acceptes nos conditions.')} <Link to={chemin('legal-doc', { d: 'cgu' })}>{t('Les lire')}</Link>
            </p>
            <div className="links">
              <Link to={chemin('connexion')}>{t('J’ai déjà un compte')}</Link>
              <Link to={chemin('diaspora-infos')}>{t('Comment ça marche')}</Link>
            </div>
          </>
        )}
      </Partage>
    </Ecran>
  )
}
