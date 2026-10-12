// Pièces communes des écrans VD-03 (accès et ouverture de la boutique) :
// - Etapes : la barre des trois étapes (OnboardingSteps, OUV-05) — passée = coche verte, en cours = orange, à venir = gris ;
// - CodeSMS : six cases, clavier du prototype, vrai champ (collage, remplissage automatique one-time-code), bouton
//   actif au 6e chiffre, code faux en rouge et cases vidées, essais restants, blocage daté, compte à rebours de renvoi,
//   envois restants dans l'heure (CNX-04, CNX-06 ; OTP-* du registre ; même famille que SaisieCode du client) ;
// - CartePoint : le point de la boutique (GPS du téléphone, ou posé à la main sur la carte), zone calculée par la
//   source, lien OpenStreetMap (DP-49, VD03-R06, VD03-R07) ;
// - useEnLigne, HorsLigne : hors connexion, ce qui attend le réseau le dit (OFF-03) ;
// - Chargement, ErreurLecture, Comment (bloc « Comment ça marche » fermé par défaut), Demo (mode démonstration).
import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { jouer } from '@client/composants/Sons'
import { mouvementLibre } from '@client/composants/Animations'
import { lienOsm } from '@client/connecteurs/cartes'
import { env } from '@client/config/env'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import type { EnvoiCode, PointBoutique, ResultatCode, ResultatRenvoi, Zone } from '../../donnees/domaines/session'
import { source } from '../../donnees/source'
import { heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import './vd03.css'

// ── Étapes ─────────────────────────────────────────────────────────────────────────────────────────────────────────

const ETAPES: [string, string][] = [
  ['Ouvrir', 'Produits en brouillon'],
  ['Publier', 'Mise en ligne'],
  ['Être payé', 'Premier versement'],
]
/** cur : étape en cours (1 à 3) ; toutes faites : cur = 4. */
export function Etapes({ cur }: { cur: number }) {
  const { t, tf } = usePreferences()
  return (
    <div className="row vd03-etapes" aria-label={tf('Étape {n} sur 3', { n: Math.min(cur, 3) })} style={{ gap: '8px', alignItems: 'flex-start', marginTop: '14px' }}>
      {ETAPES.map(([nom, debloque], i) => {
        const n = i + 1
        const faite = n < cur
        const enCours = n === cur
        return (
          <div className="grow" key={nom}>
            <i style={{ display: 'block', height: '6px', borderRadius: '999px', background: faite || enCours ? 'linear-gradient(90deg,var(--gold),var(--braise-1))' : 'var(--sand-3)' }}></i>
            <div className="row mt8" style={{ gap: '5px', color: faite ? 'var(--green)' : enCours ? 'var(--or-txt)' : 'var(--ink-3)' }}>
              {faite ? (
                <span className="vd03-faite" style={{ display: 'inline-flex' }}>
                  <Icone nom="circle-check" taille={17} trait={2.2} />
                </span>
              ) : (
                <span
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: '800',
                    flexShrink: '0',
                    ...(enCours ? { background: 'var(--or-soft)', border: '1px solid var(--or-line)' } : { border: '1.5px solid var(--line-2)' }),
                  }}
                >
                  {t(String(n))}
                </span>
              )}
              <span className="t13 b8">{t(nom)}</span>
            </div>
            <div className="t12 c3" style={{ marginTop: '2px', lineHeight: '1.3' }}>
              {t(debloque)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── En ligne ───────────────────────────────────────────────────────────────────────────────────────────────────────

export function useEnLigne(): boolean {
  const [en, setEn] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  useEffect(() => {
    const maj = () => setEn(navigator.onLine)
    window.addEventListener('online', maj)
    window.addEventListener('offline', maj)
    return () => (window.removeEventListener('online', maj), window.removeEventListener('offline', maj))
  }, [])
  return en
}

/** Hors connexion : ce geste attend le réseau (OFF-03 : numéro de versement, publication, connexion). */
export function HorsLigne({ texte }: { texte: string }) {
  const { t } = usePreferences()
  return (
    <div className="note amber" role="status" data-hors-ligne="">
      <Icone nom="wifi-off" taille={18} />
      <div>
        <b>{t('Pas de connexion.')}</b> {t(texte)}
      </div>
    </div>
  )
}

export function Chargement() {
  const { t } = usePreferences()
  return (
    <div className="hint-l" role="status" aria-live="polite" style={{ marginTop: '24px', justifyContent: 'center' }}>
      <Icone nom="clock" taille={15} />
      <span>{t('Chargement…')}</span>
    </div>
  )
}

export function ErreurLecture({ relire }: { relire: () => void }) {
  const { t } = usePreferences()
  return (
    <>
      <div className="note red" role="alert">
        <Icone nom="circle-alert" taille={18} />
        <div>
          <b>{t('Pas de connexion.')}</b> {t('Rien n’est perdu : réessayez dans un instant.')}
        </div>
      </div>
      <div className="mt12">
        <button type="button" className="btn secondary" onClick={relire}>
          <Icone nom="rotate-cw" taille={18} />
          <span>{t('Réessayer')}</span>
        </button>
      </div>
    </>
  )
}

export function Comment({ titre = 'Comment ça marche', children }: { titre?: string; children: ReactNode }) {
  const { t } = usePreferences()
  return (
    <details className="more">
      <summary>
        <Icone nom="info" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
        <span className="grow">{t(titre)}</span>
        <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
      </summary>
      <div className="more-b">{children}</div>
    </details>
  )
}

/** Mode démonstration : ce que le serveur ferait seul (code reçu par SMS, réponse du prestataire). Jamais avec le
 *  serveur (VITE_SOURCE=api) : ces aides n'existent que pour essayer la démonstration. */
export function Demo({ children }: { children: ReactNode }) {
  const { t } = usePreferences()
  if (env.source !== 'demo') return null
  return (
    <div className="vd03-demo" data-demo="">
      <b>{t('Démonstration')}</b> · {children}
    </div>
  )
}

/** Bouton du prototype : inactif (raison dite au lecteur d'écran) tant que la saisie n'est pas complète. */
export function BoutonPlein(p: { icone: string; actif?: boolean; raison?: string; onClick: () => void; classe?: string; children: ReactNode }) {
  const actif = p.actif ?? true
  return (
    <button type="button" className={'btn ' + (p.classe ?? 'primary') + (actif ? '' : ' off')} aria-disabled={actif ? undefined : 'true'} title={actif ? undefined : p.raison} onClick={() => actif && p.onClick()}>
      <Icone nom={p.icone} taille={18} />
      <span>{p.children}</span>
    </button>
  )
}

// ── Code à 6 chiffres ──────────────────────────────────────────────────────────────────────────────────────────────

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export function CodeSMS(p: {
  envoi: EnvoiCode
  valider: (code: string) => Promise<ResultatCode>
  renvoyer?: () => Promise<ResultatRenvoi>
  reussi: () => void
  bouton?: string
  aCoteDuRenvoi?: ReactNode // « Changer de numéro », « Recevoir par SMS »
  sousLesCases?: string // « Le code se remplit tout seul quand le message arrive. »
  bloque?: (jusqua: number) => void // trop d'essais : l'écran peut proposer un autre chemin
  enLigne?: boolean
}) {
  const { t, tf, langue } = usePreferences()
  const [code, setCode] = useState('')
  const [envoi, setEnvoi] = useState(p.envoi)
  const [reste, setReste] = useState(p.envoi.renvoiSecondes)
  const [erreur, setErreur] = useState<string | null>(null)
  const [bloqueJusqua, setBloque] = useState(0)
  const [enCours, setEnCours] = useState(false)
  const champ = useRef<HTMLInputElement>(null)
  const enLigne = p.enLigne ?? true
  useEffect(() => {
    setEnvoi(p.envoi)
    setReste(p.envoi.renvoiSecondes)
  }, [p.envoi])
  useEffect(() => {
    if (reste <= 0) return
    const id = setTimeout(() => setReste((r) => r - 1), 1000)
    return () => clearTimeout(id)
  }, [reste])
  useEffect(() => {
    if (!bloqueJusqua) return
    const id = setTimeout(() => (setBloque(0), setErreur(null)), Math.max(0, Math.min(bloqueJusqua - Date.now(), 2 ** 31 - 1)))
    return () => clearTimeout(id)
  }, [bloqueJusqua])
  const estBloque = bloqueJusqua > 0
  const pret = code.length === 6 && !enCours && !estBloque && enLigne

  const saisir = useCallback((v: string) => {
    setCode(v.replace(/\D/g, '').slice(0, 6))
    setErreur((e) => (e && !estBloque ? null : e))
  }, [estBloque])
  const valider = async (c = code) => {
    if (c.length !== 6 || enCours || estBloque || !enLigne) return
    setEnCours(true)
    const r = await p.valider(c)
    setEnCours(false)
    if (r.ok) {
      jouer('code')
      return p.reussi()
    }
    jouer('erreur')
    navigator.vibrate?.(60)
    setCode('')
    if (r.raison === 'bloque') {
      setBloque(r.jusqua)
      setErreur(tf('Trop d’essais. Nouveau code possible à {h}.', { h: heure(r.jusqua, langue) }))
      p.bloque?.(r.jusqua)
    } else if (r.raison === 'expire') setErreur(t('Ce code a expiré : demandez-en un nouveau.'))
    else setErreur(r.essaisRestants > 1 ? tf('Code incorrect · encore {n} essais', { n: r.essaisRestants }) : t('Code incorrect · dernier essai'))
    champ.current?.focus({ preventScroll: true })
  }
  const renvoyer = async () => {
    if (!p.renvoyer || reste > 0 || !enLigne) return
    const r = await p.renvoyer()
    if (r.ok) {
      setEnvoi(r.envoi)
      setReste(r.envoi.renvoiSecondes || 60)
      setCode('')
      setErreur(null)
      jouer('notification')
    } else if (r.raison === 'trop_tot') setReste(r.secondes)
    else setErreur(tf('Trois codes envoyés en une heure. Nouveau code possible à {h}.', { h: heure(r.jusqua, langue) }))
  }
  // Clavier de l'ordinateur : chiffres, effacement, Entrée, quand aucun autre champ n'a le focus.
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement
      if (cible !== document.body && cible !== champ.current && cible.closest('input, textarea, select, [contenteditable]')) return
      if (cible === champ.current) return
      if (/^\d$/.test(e.key)) setCode((c) => (c + e.key).slice(0, 6))
      else if (e.key === 'Backspace') setCode((c) => c.slice(0, -1))
      else return
      setErreur(null)
    }
    window.addEventListener('keydown', touche)
    return () => window.removeEventListener('keydown', touche)
  }, [])
  const touche = (k: string) => {
    if (estBloque) return
    navigator.vibrate?.(8)
    if (k === '⌫') setCode((c) => c.slice(0, -1))
    else setCode((c) => (c + k).slice(0, 6))
    setErreur(null)
  }
  const cle = (k: string, label?: string) => (
    <span
      key={k}
      role="button"
      tabIndex={0}
      aria-label={label ?? k}
      onClick={() => touche(k)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), touche(k))}
    >
      {t(k)}
    </span>
  )
  return (
    <>
      <div className={'otp-saisie vd03-otp' + (erreur && !estBloque && code === '' ? ' err' : '') + (estBloque ? ' err' : '')}>
        <div className="otp" aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className={i < code.length ? 'f' : i === code.length && !estBloque ? 'cur' : ''}>
              {code[i] ?? ''}
            </span>
          ))}
        </div>
        <input
          ref={champ}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          aria-label={t('Code à 6 chiffres')}
          aria-invalid={erreur ? 'true' : undefined}
          disabled={estBloque}
          value={code}
          onChange={(e) => {
            saisir(e.target.value)
            const v = e.target.value.replace(/\D/g, '')
            // Collé ou rempli par le téléphone : validé tout seul.
            if (v.length === 6 && code.length < 5) void valider(v.slice(0, 6))
          }}
          onKeyDown={(e) => e.key === 'Enter' && void valider()}
        />
      </div>
      {p.sousLesCases && !erreur && <div className="t12 c3 center mt10">{t(p.sousLesCases)}</div>}
      <div className={'vd03-otpm' + (erreur ? ' err' : '')} role={erreur ? 'alert' : undefined}>
        {erreur ? (
          <span>{erreur}</span>
        ) : p.renvoyer ? (
          envoi.renvoisRestants <= 0 && reste <= 0 ? (
            <span>{t('Plus de nouveau code possible pour l’instant.')}</span>
          ) : reste > 0 ? (
            <span className="vd03-cd">{tf('Renvoyer le code dans {d}', { d: mmss(reste) })}</span>
          ) : (
            <button type="button" className="vd03-lien" onClick={renvoyer}>
              {t('Renvoyer le code')}
            </button>
          )
        ) : null}
        {p.aCoteDuRenvoi}
      </div>
      <div className="keypad" style={{ marginTop: '12px' }}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => cle(k))}
        <span className="k0" style={{ background: 'transparent', boxShadow: 'none' }} aria-hidden="true"></span>
        {cle('0')}
        {cle('⌫', t('Effacer'))}
      </div>
      <div className="mt16">
        <BoutonPlein icone="arrow-right" actif={pret} raison={t(estBloque ? 'Trop d’essais : attendez l’heure indiquée.' : !enLigne ? 'Pas de connexion.' : 'Tapez les 6 chiffres du code.')} onClick={() => void valider()}>
          {t(enCours ? 'Vérification…' : (p.bouton ?? 'Valider le code'))}
        </BoutonPlein>
      </div>
      <div className="hint-l">
        <Icone nom="clock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{tf('Le code vaut {n} minutes.', { n: envoi.valideMinutes })}</span>
      </div>
      {envoi.codeDemo && (
        <Demo>
          {tf('le code envoyé est {c}.', { c: envoi.codeDemo })}{' '}
          <button type="button" className="vd03-lien" style={{ minHeight: '32px' }} onClick={() => setCode(envoi.codeDemo!)}>
            {t('Le remplir')}
          </button>
        </Demo>
      )}
    </>
  )
}

// ── Point de la boutique ───────────────────────────────────────────────────────────────────────────────────────────

// Carte dessinée (sans marque) couvrant Yaoundé ; un toucher pose le point (repère : centre-ville, ± 3 km).
const CENTRE = { lat: 3.865, lon: 11.515 }
const ETENDUE = { lat: 0.06, lon: 0.08 }
const versPoint = (x: number, y: number): PointBoutique => ({ lat: +(CENTRE.lat + (0.5 - y) * ETENDUE.lat).toFixed(5), lon: +(CENTRE.lon + (x - 0.5) * ETENDUE.lon).toFixed(5), precision: 0 })
const versEcran = (p: { lat: number; lon: number }) => ({ x: Math.min(0.97, Math.max(0.03, 0.5 + (p.lon - CENTRE.lon) / ETENDUE.lon)), y: Math.min(0.95, Math.max(0.08, 0.5 - (p.lat - CENTRE.lat) / ETENDUE.lat)) })

export type EtatLocalisation = 'attente' | 'recherche' | 'refus' | 'indisponible'

export function CartePoint(p: { point: PointBoutique | null; zone: Zone | null; changer: (pt: PointBoutique) => void; dessin: string; hauteur: number; erreur?: string | null }) {
  const { t, tf } = usePreferences()
  const [loc, setLoc] = useState<EtatLocalisation>('attente')
  const localiser = () => {
    if (!navigator.geolocation) return setLoc('indisponible')
    setLoc('recherche')
    navigator.geolocation.getCurrentPosition(
      (g) => {
        setLoc('attente')
        p.changer({ lat: +g.coords.latitude.toFixed(5), lon: +g.coords.longitude.toFixed(5), precision: Math.round(g.coords.accuracy) })
      },
      (e) => setLoc(e.code === 1 ? 'refus' : 'indisponible'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    )
  }
  const poser = (e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest('button')) return
    const r = e.currentTarget.getBoundingClientRect()
    p.changer(versPoint((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height))
    if (mouvementLibre()) navigator.vibrate?.(10)
  }
  const ou = p.point ? versEcran(p.point) : null
  return (
    <>
      <div
        className={'map vd03-carte' + (p.erreur ? ' err' : '')}
        style={{ height: p.hauteur + 'px', marginTop: '0', ...(p.erreur ? { boxShadow: 'inset 0 0 0 2px var(--red)' } : {}) }}
        onClick={poser}
        role="application"
        aria-label={t('Carte : touchez l’endroit de votre boutique pour poser le point')}
      >
        <Dessin id={p.dessin} />
        {ou && (
          <span key={`${p.point!.lat},${p.point!.lon}`} className="vd03-pin" style={{ left: ou.x * 100 + '%', top: ou.y * 100 + '%' }}>
            <Icone nom="map-pin" taille={34} trait={2.2} />
          </span>
        )}
        {!p.point && (
          <span className="vd03-carte-a">
            <Icone nom="map-pin" taille={14} />
            {t('Touchez la carte')}
          </span>
        )}
        <button
          type="button"
          onClick={localiser}
          style={{ position: 'absolute', right: '10px', bottom: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px', minHeight: '44px', padding: '0 14px', borderRadius: '12px', border: '1px solid var(--line-2)', background: 'var(--card)', color: 'var(--or-txt)', fontSize: '13.5px', fontWeight: '800', boxShadow: 'var(--shadow-card)' }}
        >
          <Icone nom="locate-fixed" taille={16} />
          {t(loc === 'recherche' ? 'Recherche…' : 'Me localiser')}
        </button>
      </div>
      {p.point && (
        <div className="row mt8" style={{ gap: '6px' }}>
          <Icone nom="map-pin" taille={16} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
          <span className="t13 b7 grow">{p.zone ? `${p.zone.code} · ${p.zone.quartiers}` : t('Hors des zones servies')}</span>
          <a href={lienOsm(p.point)} target="_blank" rel="noopener noreferrer" className="t13 b8 cor" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px' }}>
            {t('Voir sur la carte')}
          </a>
        </div>
      )}
      {p.point && (
        <div className="hint">
          {p.point.precision ? tf('Position du téléphone, à {m} m près.', { m: p.point.precision }) : t('Point posé à la main. Touchez ailleurs pour le déplacer.')}
        </div>
      )}
      {(loc === 'refus' || loc === 'indisponible') && (
        <div className="hint err" role="alert">
          {t('Posez le point à la main sur la carte.')}
        </div>
      )}
      {p.erreur && (
        <div className="hint err" role="alert">
          {t(p.erreur)}
        </div>
      )}
    </>
  )
}

/** Zone du point, demandée à la source (le serveur la calcule). */
export function useZone(point: PointBoutique | null): Zone | null {
  const [z, setZ] = useState<Zone | null>(null)
  useEffect(() => {
    let vivant = true
    if (!point) return setZ(null)
    void source.session.zoneDuPoint(point).then((x) => vivant && setZ(x))
    return () => {
      vivant = false
    }
  }, [point])
  return z
}

// ── Numéro camerounais ─────────────────────────────────────────────────────────────────────────────────────────────

export const chiffresDe = (v: string) => v.replace(/\D/g, '').replace(/^237(?=6\d{8}$)/, '').slice(0, 9)
/** « 677421890 » → « 677 42 18 90 ». */
export const espacer = (n: string) => [n.slice(0, 3), n.slice(3, 5), n.slice(5, 7), n.slice(7, 9)].filter(Boolean).join(' ')
export const numeroValide = (n: string) => /^6\d{8}$/.test(n)
export function operateur(n: string): 'MTN' | 'Orange' | null {
  if (!/^6\d{2}/.test(n)) return null
  const p2 = Number(n.slice(0, 2))
  const p3 = Number(n.slice(0, 3))
  if (p2 === 67 || (p3 >= 650 && p3 <= 654) || (p3 >= 680 && p3 <= 683)) return 'MTN'
  if (p2 === 69 || (p3 >= 655 && p3 <= 659)) return 'Orange'
  return null
}
