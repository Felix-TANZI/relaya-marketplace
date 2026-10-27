// Numéro de versement (VD-09) : repris du prototype (route('numero_versement'), étapes ?s=code et ?s=ok), branché sur
// la source (POST /payout-number/codes, PUT /payout-number). Q-19 : deux codes, sept jours de revue.
// - Étape 1 (VD09-R34) : numéro actuel (marque, masqué, titulaire, vérifié le…, « Actif ») ; avertissement AVANT le
//   formulaire ; opérateur (choix en liste, préfixes écrits en clair, lus dans la source : paramètres du pays, Q-94) ;
//   nouveau numéro (+237) contrôlé avant l'envoi (VD09-R31) : bon opérateur dit en clair, préfixe incohérent en erreur
//   avec l'opérateur juste, « Recevoir le code » inactif ; sans réseau, inactif et dit pourquoi (NUM-03) ;
// - Étape 2 (VD09-R37, NUM-06, NUM-07) : deux codes de 6 chiffres (registre OTP-*), l'un au nouveau numéro, l'autre par
//   SMS au téléphone personnel (jamais par e-mail) ; clavier du prototype et clavier du téléphone ; « Renvoyer » après le
//   délai (compte à rebours) ; code faux : message sous le code concerné et essais restants ; trop d'essais : blocage
//   avec l'heure de reprise ; code expiré : retour à l'étape 1 (VD09-R33) ;
// - Étape 3 (VD09-R32, R35) : en revue 7 jours, dates de reprise et du premier versement calculées (finDeRevue,
//   vendrediDeVersement), versement en attente « pas perdu », nouveau « En revue », ancien « Désactivé », « Ce n'est
//   pas vous ? » vers le support (NUM-05) ;
// - Accès Préparation verrouillé (ARG-04).
import { useEffect, useRef, useState, type RefObject } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { Ecran } from '../../composants/coque'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { NumeroVersement as DonneesNumero, Operateur } from '../../donnees/domaines/versements'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useHorloge } from '../../session'
import { AvecDonnees, CommentCaMarche, Aide, dateLongue, jourLongMois, jourMois, jourMoisLong, numeroLisible, useEnLigne, useMontant } from './commun'

const BLOC = { display: 'block' } as const

/** « 67, 68, ou 650 à 654 » : préfixes à deux chiffres, puis la plage à trois chiffres. */
function prefixesEnClair(p: string[], ou: string, a: string): string {
  const deux = p.filter((x) => x.length === 2)
  const trois = p.filter((x) => x.length === 3).sort()
  const morceaux = [...deux]
  if (trois.length) morceaux.push(trois.length > 1 ? `${trois[0]} ${a} ${trois[trois.length - 1]}` : trois[0])
  return morceaux.length > 1 ? morceaux.slice(0, -1).join(', ') + `, ${ou} ` + morceaux[morceaux.length - 1] : morceaux[0]
}
const groupe = (n: string) => n.replace(/^(\d{3})(\d{0,2})(\d{0,2})(\d{0,2}).*$/, (_, a, b, c, d) => [a, b, c, d].filter(Boolean).join(' '))
const nomOperateur = (d: DonneesNumero, o: Operateur) => d.operateurs.find((x) => x.nom === o)!.libelle

function Etapes({ n }: { n: 1 | 2 | 3 }) {
  const { t } = usePreferences()
  const libelle = ['Étape 1 sur 3 · le nouveau numéro', 'Étape 2 sur 3 · les codes', 'Étape 3 sur 3 · la revue'][n - 1]
  return (
    <>
      <div className="steps" role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={n} aria-label={t(libelle)}>
        {[1, 2, 3].map((i) => (
          <i key={i} className={i <= n ? 'on' : ''}></i>
        ))}
      </div>
      <div className="t12 b8 c3 mt8">{t(libelle)}</div>
    </>
  )
}

// ── Étape 1 ─────────────────────────────────────────────────────────────────────────────────────────────────────

function Saisie({ d, envoye }: { d: DonneesNumero; envoye: (e: { destination: string; renvoiSecondes: number; codeDemo?: string }) => void }) {
  const { t, tf, langue } = usePreferences()
  const enLigne = useEnLigne()
  const [op, setOp] = useState<Operateur | null>(null)
  const [numero, setNumero] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)
  const chiffres = numero.replace(/\D/g, '')
  const vrai = d.operateurs.find((o) => o.prefixes.some((p) => chiffres.startsWith(p)))?.nom ?? null
  const complet = chiffres.length === d.longueur
  const prefixeLu = chiffres.slice(0, chiffres.startsWith('65') ? 3 : 2)
  const etat: 'vide' | 'court' | 'inconnu' | 'autre' | 'ok' = !chiffres ? 'vide' : chiffres.length >= 2 && !vrai && !(chiffres === '6' || chiffres === '65') ? 'inconnu' : !complet ? 'court' : !vrai ? 'inconnu' : op && vrai !== op ? 'autre' : 'ok'
  const pret = complet && etat === 'ok' && !!op && enLigne && !enCours
  const indice =
    erreur ??
    (etat === 'inconnu'
      ? tf('{p} : ce préfixe n’est ni MTN ni Orange. Vérifiez le numéro.', { p: prefixeLu })
      : etat === 'autre'
        ? tf('{p} est un numéro {vrai}, pas {choisi}. Choisissez {vrai} ou corrigez le numéro.', { p: prefixeLu, vrai: nomOperateur(d, vrai!), choisi: nomOperateur(d, op!) })
        : etat === 'ok' && op
          ? tf('{p} : c’est bien {op}. Un préfixe qui ne correspond pas est refusé avant l’envoi.', { p: prefixeLu, op: nomOperateur(d, op) })
          : etat === 'ok'
            ? tf('{p} : un numéro {vrai}. Choisissez l’opérateur ci-dessus.', { p: prefixeLu, vrai: nomOperateur(d, vrai!) })
            : tf('{n} chiffres, sans l’indicatif.', { n: d.longueur }))
  const envoyer = async () => {
    if (!pret || !op) return
    setEnCours(true)
    const r = await source.versements.demanderCodes(op, chiffres)
    setEnCours(false)
    if (r.ok) {
      jouer('code')
      return envoye(r)
    }
    jouer('erreur')
    setErreur(
      r.raison === 'meme_numero'
        ? t('C’est déjà votre numéro de versement.')
        : r.raison === 'operateur'
          ? tf('Ce numéro est un numéro {op}.', { op: nomOperateur(d, r.detail as Operateur) })
          : r.raison === 'longueur'
            ? tf('{n} chiffres, sans l’indicatif.', { n: d.longueur })
            : t('Ce préfixe n’est ni MTN ni Orange.'),
    )
  }
  const a = d.actuel
  return (
    <>
      <div className="pg">
        <h1 className="pg-t">{t('Numéro de versement')}</h1>
        <p className="pg-s">{t('Le seul numéro où BelivaY vous paie. Toujours à votre nom.')}</p>
      </div>
      <div className="card">
        <div className="kick" style={{ fontSize: '12px' }}>
          {t('Numéro actuel')}
        </div>
        <div className="row mt10">
          <span style={{ width: '44px', height: '44px', borderRadius: '12px', background: a.operateur === 'MTN' ? '#FFCB05' : '#FF7900', color: a.operateur === 'MTN' ? '#1A1A1A' : '#FFFFFF', fontWeight: '800', fontSize: a.operateur === 'MTN' ? '12px' : '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: '0' }}>
            {t(a.operateur)}
          </span>
          <div className="grow">
            <div className="b8 t15">{`${a.operateur} ${numeroLisible(a.masque)}`}</div>
            <div className="t13 c3 mt4">{tf('Au nom de {nom} · vérifié le {jour}', { nom: a.titulaire, jour: jourMoisLong(a.verifieLe, langue) })}</div>
          </div>
          <span className="pill green">
            <Icone nom="circle-check" taille={13} />
            {t('Actif')}
          </span>
        </div>
      </div>
      <div className="sec">
        <h2>{t('Changer de numéro')}</h2>
      </div>
      <Etapes n={1} />
      <div className="note amber">
        <Icone nom="triangle-alert" taille={18} />
        <div>
          <b>{t('Avant de changer :')}</b>
          {tf(' vos versements s’arrêtent {n} jours, le temps qu’une personne vérifie. Rien n’est perdu. Le numéro doit être à votre nom.', { n: d.revueJours })}
        </div>
      </div>
      <div className="fld">
        <label id="vd9-op">{t('Opérateur')}</label>
      </div>
      <div role="radiogroup" aria-labelledby="vd9-op">
        {d.operateurs.map((o) => (
          <button
            key={o.nom}
            type="button"
            role="radio"
            aria-checked={op === o.nom}
            className={'radio' + (op === o.nom ? ' on' : '')}
            onClick={() => {
              setOp(o.nom)
              setErreur(null)
              jouer('interrupteur')
            }}
            style={{ width: '100%', textAlign: 'left', font: 'inherit', color: 'inherit', cursor: 'pointer' }}
          >
            <span className="rd"></span>
            <span className="grow">
              <span className="rt" style={BLOC}>
                {t(o.libelle)}
              </span>
              <span className="rs" style={BLOC}>
                {tf('Numéros en {liste}', { liste: prefixesEnClair(o.prefixes, t('ou'), t('à')) })}
              </span>
            </span>
          </button>
        ))}
      </div>
      <div className="fld">
        <label htmlFor="vd9-numero">{t('Nouveau numéro')}</label>
        <div className={'inp' + (etat === 'ok' && op ? ' ok' : etat === 'inconnu' || etat === 'autre' || erreur ? ' err' : '')}>
          <span className="b8 c2 row" style={{ gap: '6px', paddingRight: '8px', borderRight: '1px solid var(--line-2)' }}>
            <Dessin id="81b1dee44510" />
            {d.indicatif}
          </span>
          <input
            id="vd9-numero"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder={t('6XX XX XX XX')}
            value={groupe(chiffres)}
            maxLength={d.longueur + 3}
            aria-invalid={etat === 'inconnu' || etat === 'autre' || !!erreur}
            aria-describedby="vd9-numero-aide"
            onChange={(e) => {
              setNumero(e.target.value.replace(/\D/g, '').replace(/^237(?=\d{9})/, '').slice(0, d.longueur))
              setErreur(null)
            }}
            onKeyDown={(e) => e.key === 'Enter' && void envoyer()}
          />
          {etat === 'ok' && op && (
            <span className="suf">
              <span className="cg">
                <Icone nom="circle-check" taille={18} />
              </span>
            </span>
          )}
        </div>
        <div id="vd9-numero-aide" className="hint" style={etat === 'inconnu' || etat === 'autre' || erreur ? { color: 'var(--red)' } : undefined} role={erreur ? 'alert' : undefined}>
          {indice}
        </div>
      </div>
      <div className="mt16">
        <button type="button" className="btn primary" disabled={!pret} aria-disabled={!pret} onClick={() => void envoyer()} style={!pret ? { opacity: 0.5 } : undefined}>
          <Icone nom="send" taille={18} />
          <span>{t(enCours ? 'Envoi…' : 'Recevoir le code')}</span>
        </button>
      </div>
      {!enLigne && (
        <div className="hint-l" style={{ color: 'var(--red)' }} role="status">
          <Icone nom="wifi-off" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('Sans réseau, le code ne peut pas partir : « Recevoir le code » attend la connexion.')}</span>
        </div>
      )}
      <Aide icone="message-square">{t('Vous recevrez deux codes par SMS : un au nouveau numéro, un à votre téléphone personnel.')}</Aide>
      <CommentCaMarche>
        <div className="tl" style={{ marginTop: '4px' }}>
          <div className="ti">
            <div className="tt">{t('1 · Le nouveau numéro')}</div>
            <div className="td">{t('Le préfixe est contrôlé avant l’envoi du code.')}</div>
          </div>
          <div className="ti">
            <div className="tt">{t('2 · Deux codes')}</div>
            <div className="td">{tf('Un par SMS au nouveau numéro : il prouve qu’il est à vous. L’autre par SMS au {tel}, votre téléphone personnel : c’est le second facteur.', { tel: d.telephonePersonnel })}</div>
          </div>
          <div className="ti">
            <div className="tt">{tf('3 · La revue, {n} jours', { n: d.revueJours })}</div>
            <div className="td">{t('Une personne vérifie. L’ancien numéro est désactivé : un seul actif à la fois. Le versement suivant part le vendredi qui suit la revue.')}</div>
          </div>
        </div>
        <p>{t('Un numéro au nom d’une autre personne est refusé, avec un motif écrit.')}</p>
      </CommentCaMarche>
      <div className="note green">
        <Icone nom="shield-check" taille={18} />
        <div>{t('BelivaY ne vous demande jamais votre code secret Mobile Money. Un message qui le demande est une fraude.')}</div>
      </div>
    </>
  )
}

// ── Étape 2 ─────────────────────────────────────────────────────────────────────────────────────────────────────

function Cases({ valeur, longueur, actif, erreur, etiquette, toucher, saisir, champ }: { valeur: string; longueur: number; actif: boolean; erreur: boolean; etiquette: string; toucher: () => void; saisir: (v: string) => void; champ: RefObject<HTMLInputElement | null> }) {
  return (
    <div className="otp-saisie" onClick={toucher}>
      <div className={'otp' + (erreur ? ' cl03-err' : '')} aria-hidden="true">
        {Array.from({ length: longueur }, (_, i) => (
          <span key={i} className={i < valeur.length ? 'f' : actif && i === valeur.length ? 'cur' : ''}>
            {valeur[i] ?? ''}
          </span>
        ))}
      </div>
      <input ref={champ} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={longueur} aria-label={etiquette} aria-invalid={erreur} value={valeur} onFocus={toucher} onChange={(e) => saisir(e.target.value)} />
    </div>
  )
}

function Renvoi({ quel, secondes }: { quel: 'nouveau' | 'personnel'; secondes: number }) {
  const { t } = usePreferences()
  const [reste, setReste] = useState(secondes)
  const [envoye, setEnvoye] = useState(false)
  useEffect(() => {
    if (reste <= 0) return
    const id = setTimeout(() => setReste((r) => r - 1), 1000)
    return () => clearTimeout(id)
  }, [reste])
  if (reste > 0)
    return (
      <div className="t13 c3 center mt10" aria-live="off">
        {t('Pas reçu ? Renvoyer dans ') + `${Math.floor(reste / 60)}:${String(reste % 60).padStart(2, '0')}`}
      </div>
    )
  return (
    <div className="center mt6">
      <button
        type="button"
        className="vd9-lien"
        onClick={async () => {
          const r = await source.versements.renvoyerCode(quel)
          if (r.ok) {
            jouer('code')
            setEnvoye(true)
            setReste(r.renvoiSecondes)
          }
        }}
      >
        <Icone nom="refresh-cw" taille={15} />
        {t(envoye ? 'Renvoyer encore' : 'Renvoyer le code')}
      </button>
    </div>
  )
}

function Codes({ d, envoi, retour, valide }: { d: DonneesNumero; envoi: { destination: string; renvoiSecondes: number; codeDemo?: string }; retour: (m?: string) => void; valide: () => void }) {
  const { t, tf, langue } = usePreferences()
  const L = d.code.longueur
  const [c1, setC1] = useState('')
  const [c2, setC2] = useState('')
  const [actif, setActif] = useState<1 | 2>(1)
  const [err, setErr] = useState<{ champ: 1 | 2 | 0; texte: string } | null>(null)
  const [enCours, setEnCours] = useState(false)
  const champ1 = useRef<HTMLInputElement>(null)
  const champ2 = useRef<HTMLInputElement>(null)
  useEffect(() => champ1.current?.focus(), [])
  const saisir = (n: 1 | 2, v: string) => {
    const x = v.replace(/\D/g, '').slice(0, L)
    if (n === 1) setC1(x)
    else setC2(x)
    if (err && err.champ !== 0) setErr(null)
    if (n === 1 && x.length === L) {
      setActif(2)
      champ2.current?.focus()
    }
  }
  const touche = (k: string) => {
    const v = actif === 1 ? c1 : c2
    if (k === '⌫') {
      if (!v && actif === 2) return setActif(1)
      return saisir(actif, v.slice(0, -1))
    }
    saisir(actif, v + k)
  }
  const pret = c1.length === L && c2.length === L && !enCours && err?.champ !== 0
  const valider = async () => {
    if (!pret) return
    setEnCours(true)
    const r = await source.versements.confirmerNumero(c1, c2)
    setEnCours(false)
    if (r.ok) {
      jouer('fin')
      return valide()
    }
    jouer('erreur')
    if (r.raison === 'expire') return retour(t('Les codes ont expiré : demandez-en de nouveaux.'))
    if (r.raison === 'bloque') return setErr({ champ: 0, texte: tf('Trop d’essais. Réessayez à {h}.', { h: heure(r.bloqueJusqua!, langue) }) })
    const n = r.raison === 'code_nouveau' ? 1 : 2
    if (n === 1) setC1('')
    else setC2('')
    setActif(n)
    ;(n === 1 ? champ1 : champ2).current?.focus()
    setErr({ champ: n, texte: r.essaisRestants! > 1 ? tf('Ce code ne correspond pas. Encore {n} essais.', { n: r.essaisRestants! }) : t('Ce code ne correspond pas. Dernier essai.') })
  }
  const carte = (n: 1 | 2) => (
    <div className="card">
      <div className="kick" style={{ fontSize: '12px' }}>
        {n === 1 ? tf('1 · Code reçu par SMS au {dest}', { dest: envoi.destination }) : tf('2 · Code reçu par SMS au {tel}', { tel: d.telephonePersonnel })}
        <span style={{ display: 'block', marginTop: '3px', color: 'var(--or-txt)' }}>{t(n === 1 ? 'Votre nouveau numéro' : 'Votre second facteur')}</span>
      </div>
      <Cases
        valeur={n === 1 ? c1 : c2}
        longueur={L}
        actif={actif === n}
        erreur={err?.champ === n}
        etiquette={t(n === 1 ? 'Code reçu au nouveau numéro' : 'Code reçu au téléphone personnel')}
        toucher={() => setActif(n)}
        saisir={(v) => saisir(n, v)}
        champ={n === 1 ? champ1 : champ2}
      />
      {err?.champ === n ? (
        <div className="t13 center mt10 b7" style={{ color: 'var(--red)' }} role="alert">
          {err.texte}
        </div>
      ) : (
        <Renvoi quel={n === 1 ? 'nouveau' : 'personnel'} secondes={envoi.renvoiSecondes} />
      )}
      <Aide icone={n === 1 ? 'smartphone' : 'shield-check'}>{t(n === 1 ? 'Il prouve que ce numéro est bien à vous.' : 'Votre téléphone personnel : une deuxième preuve que c’est bien vous.')}</Aide>
    </div>
  )
  return (
    <>
      <div className="pg">
        <h1 className="pg-t">{t('Vérifier le nouveau numéro')}</h1>
        <p className="pg-s">{t('Deux codes par SMS, pour être sûr que c’est bien vous.')}</p>
      </div>
      <Etapes n={2} />
      {carte(1)}
      {carte(2)}
      {envoi.codeDemo && (
        <div className="note amber">
          <Icone nom="info" taille={18} />
          <div>{tf('Démonstration : les deux codes sont {code}.', { code: envoi.codeDemo })}</div>
        </div>
      )}
      <div className="keypad" role="group" aria-label={t('Clavier')}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k, i) =>
          k ? (
            <button key={i} type="button" onClick={() => touche(k)} aria-label={k === '⌫' ? t('Effacer') : k} style={{ height: '50px', borderRadius: '14px', border: 0, background: 'var(--card)', boxShadow: 'var(--shadow-card)', fontSize: '21px', fontWeight: '700', color: 'var(--ink)', cursor: 'pointer' }}>
              {k}
            </button>
          ) : (
            <span key={i} className="k0" style={{ boxShadow: 'none' }}></span>
          ),
        )}
      </div>
      {err?.champ === 0 && (
        <div className="note red" role="alert">
          <Icone nom="lock" taille={18} />
          <div>{err.texte}</div>
        </div>
      )}
      <div className="mt16">
        <button type="button" className="btn primary" disabled={!pret} aria-disabled={!pret} onClick={() => void valider()} style={!pret ? { opacity: 0.5 } : undefined}>
          <Icone nom="shield-check" taille={18} />
          <span>{t(enCours ? 'Vérification…' : 'Valider le numéro')}</span>
        </button>
      </div>
      <div className="center">
        <button type="button" className="vd9-lien" onClick={() => retour()}>
          <Icone nom="pencil" taille={15} />
          {t('Modifier le numéro')}
        </button>
      </div>
      <p className="scrim-note">{t('Sans les deux codes, rien ne change : le numéro reste bloqué.')}</p>
    </>
  )
}

// ── Étape 3 ─────────────────────────────────────────────────────────────────────────────────────────────────────

function Revue({ d, celebrer }: { d: DonneesNumero; celebrer: boolean }) {
  const { t, tf, langue } = usePreferences()
  const m = useMontant()
  const maintenant = useHorloge()
  const r = d.enRevue!
  const joursRestants = Math.max(0, Math.ceil((r.jusqua - maintenant) / 864e5))
  return (
    <>
      <div className="center" style={{ paddingTop: '18px' }}>
        <div className={celebrer ? 'blv-succes' : undefined} style={{ width: '72px', height: '72px', borderRadius: '50%', margin: '0 auto', background: 'var(--amber-soft)', border: '1px solid var(--amber-line)', color: 'var(--amber)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icone nom="shield-check" taille={34} />
        </div>
        <h1 className="pg-t" style={{ marginTop: '14px' }}>
          {t('Numéro enregistré, en revue')}
        </h1>
        <p className="pg-s">{tf('{op} {numero} · au nom de {nom}', { op: nomOperateur(d, r.operateur), numero: numeroLisible(r.masque), nom: d.actuel.titulaire })}</p>
      </div>
      <Etapes n={3} />
      <div className="hero night">
        <div className="hk">{tf('Versements suspendus {n} jours', { n: d.revueJours })}</div>
        <div className="b8 mt8" style={{ fontSize: '22px', letterSpacing: '-.02em' }}>
          {tf('Jusqu’au {jour}', { jour: dateLongue(r.jusqua, langue).replace(/^./, (x) => (langue === 'fr' ? x.toLowerCase() : x)) })}
        </div>
        <div className="hs">{t('Une personne de BelivaY vérifie le changement. Cela protège votre argent si quelqu’un a pris votre téléphone.')}</div>
        <div className="hline"></div>
        <div className="t14" style={{ lineHeight: '1.5' }}>
          {r.enAttente ? (
            <>
              {tf('Votre versement du {jour} ({montant}) ', { jour: jourMois(r.enAttente.vendredi, langue), montant: m.f(r.enAttente.montant) })}
              <b>{t('n’est pas perdu')}</b>
              {tf('. Il part {jour}, après la revue.', { jour: jourLongMois(r.premierVersement, langue) })}
            </>
          ) : (
            tf('Le premier versement vers ce numéro part {jour}, après la revue.', { jour: jourLongMois(r.premierVersement, langue) })
          )}
        </div>
        <div className="t12 mt8" style={{ color: 'rgba(255,255,255,.74)' }}>
          {tf(joursRestants > 1 ? 'Encore {n} jours de revue' : 'Encore {n} jour de revue', { n: joursRestants })}
        </div>
      </div>
      <div className="card tight">
        <div className="li">
          <span className="ic amber">
            <Icone nom="smartphone" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={BLOC}>
              {`${r.operateur} ${numeroLisible(r.masque)}`}
            </span>
            <span className="ls" style={BLOC}>
              {t('Nouveau numéro')}
            </span>
          </span>
          <span className="pill amber">{t('En revue')}</span>
        </div>
        <div className="li">
          <span className="ic ">
            <Icone nom="smartphone" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={BLOC}>
              {`${r.ancien.operateur} ${numeroLisible(r.ancien.masque)}`}
            </span>
            <span className="ls" style={BLOC}>
              {t('Ancien numéro')}
            </span>
          </span>
          <span className="pill ink">{t('Désactivé')}</span>
        </div>
      </div>
      <Aide>{t('Un seul numéro actif à la fois.')}</Aide>
      <div className="mt16">
        <Link to={chemin('versements')} className="btn primary">
          <Icone nom="arrow-left" taille={18} />
          <span>{t('Retour aux versements')}</span>
        </Link>
      </div>
      <Link to={chemin('messages', { fil: 'support', sujet: 'numero_versement' })} className="row t14 b8 cor" style={{ justifyContent: 'center', minHeight: '44px', marginTop: '6px', gap: '6px' }}>
        <Icone nom="shield-alert" taille={16} />
        {t('Ce n’est pas vous ? Écrire au support')}
      </Link>
    </>
  )
}

function Contenu({ d }: { d: DonneesNumero }) {
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const [envoi, setEnvoi] = useState<{ destination: string; renvoiSecondes: number; codeDemo?: string } | null>(() =>
    d.attente && params.get('s') !== null ? { destination: d.attente.numeroMasque, renvoiSecondes: 0, codeDemo: undefined } : null,
  )
  const [celebrer, setCelebrer] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  if (d.enRevue) return <Revue d={d} celebrer={celebrer} />
  if (envoi)
    return (
      <Codes
        d={d}
        envoi={envoi}
        retour={(m) => {
          void source.versements.annulerSaisie()
          setEnvoi(null)
          setMessage(m ?? null)
          naviguer(chemin('numero_versement'), { replace: true })
        }}
        valide={() => {
          setCelebrer(true)
          naviguer(chemin('numero_versement', { s: 'ok' }), { replace: true })
        }}
      />
    )
  return (
    <>
      {message && (
        <div className="note amber" role="alert" style={{ marginTop: '14px' }}>
          <Icone nom="info" taille={18} />
          <div>{message}</div>
        </div>
      )}
      <Saisie
        d={d}
        envoye={(e) => {
          setEnvoi(e)
          naviguer(chemin('numero_versement', { s: 'code' }), { replace: true })
        }}
      />
    </>
  )
}

export default function NumeroVersement() {
  const lecture = useLecture(() => source.versements.numero())
  return (
    <AvecDonnees route="numero_versement" lecture={lecture}>
      {(d) => (
        <Ecran route="numero_versement">
          <Contenu d={d} />
        </Ecran>
      )}
    </AvecDonnees>
  )
}
