// Litiges et retours (VD-07) : ce que partagent les six écrans du groupe (même famille que les litiges du client,
// CL-11) — boutons du prototype (C.btn), frise à quatre étapes, blocs repliés « Comment ça marche », fil
// chronologique du dossier, photos horodatées avec « Ajouter » (appareil photo, photo allégée sur l'appareil),
// hors connexion, chargement et erreur de lecture, vide. Outils sans composant : outils.ts.
import { useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { reduirePhoto } from '@client/donnees/photo'
import { PhotoDessinee } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import type { PieceDossier } from '../../donnees/domaines/litiges'
import { usePreferences } from '../../preferences'
import { horodatage, libellePiece, useEnLigne } from './outils'

/** Bouton du prototype (C.btn) : un lien quand il mène ailleurs, un bouton quand c'est un geste. */
export function Bouton(p: { classe: string; icone?: string; vers?: string; onClick?: (e: MouseEvent) => void; style?: CSSProperties; desactive?: boolean; children: ReactNode }) {
  const contenu = (
    <>
      {p.icone && <Icone nom={p.icone} taille={18} />}
      <span>{p.children}</span>
    </>
  )
  return p.vers && !p.desactive ? (
    <Link to={p.vers} style={p.style} className={'btn ' + p.classe} onClick={p.onClick}>
      {contenu}
    </Link>
  ) : (
    <button type="button" style={p.style} className={'btn ' + p.classe} onClick={p.onClick} disabled={p.desactive}>
      {contenu}
    </button>
  )
}


// ── Frise à quatre étapes (prototype : Litige reçu → Votre réponse → Médiation → Décision) ─────────────────

const ROND: CSSProperties = { position: 'relative', zIndex: '1', width: '28px', height: '28px', borderRadius: '50%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '800' }
const TRAIT: CSSProperties = { position: 'absolute', top: '13px', right: '50%', width: '100%', height: '2px', zIndex: '0' }

/** `courante` : l'étape en cours (1 à 4) ; celles d'avant sont cochées en vert. */
export function Frise({ courante, etapes = ['Litige reçu', 'Votre réponse', 'Médiation', 'Décision'] }: { courante: number; etapes?: string[] }) {
  const { t } = usePreferences()
  return (
    <div className="row" style={{ gap: '0', marginTop: '12px', alignItems: 'flex-start' }} role="list" aria-label={t('Où en est votre litige')}>
      {etapes.map((e, i) => {
        const n = i + 1
        const fait = n < courante
        const cur = n === courante
        return (
          <div key={e} className="grow center" style={{ position: 'relative' }} role="listitem" aria-current={cur ? 'step' : undefined}>
            {i > 0 && <span style={{ ...TRAIT, background: n <= courante ? 'var(--green)' : 'var(--line-2)' }}></span>}
            <span style={{ ...ROND, ...(fait ? { background: 'var(--green-soft)', color: 'var(--green)', border: '2px solid var(--green)' } : cur ? { background: 'var(--or-soft)', color: 'var(--or-txt)', border: '2px solid var(--braise-1)' } : { background: 'var(--sand-2)', color: 'var(--ink-3)', border: '2px solid var(--line-2)' }) }}>
              {fait ? <Icone nom="check" taille={14} trait={3} /> : t(String(n))}
            </span>
            <div className="t12 b7 mt6" style={{ color: cur ? 'var(--or-txt)' : 'var(--ink-3)', lineHeight: '1.25' }}>
              {t(e)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Bloc replié du prototype (<details class="more">), fermé à l'ouverture sauf `ouvert`. */
export function Replier({ icone, titre, ouvert, plat, children }: { icone: string; titre: string; ouvert?: boolean; plat?: boolean; children: ReactNode }) {
  return (
    <details className={'more' + (plat ? ' flat' : '')} open={ouvert}>
      <summary>
        <Icone nom={icone} taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
        <span className="grow">{titre}</span>
        <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
      </summary>
      <div className="more-b">{children}</div>
    </details>
  )
}

/** Fil chronologique du dossier (classes .tl du prototype) : le plus ancien en haut, le dernier en cours. */
export function Fil({ lignes }: { lignes: { cle: string; titre: string; detail: string; etat: 'done' | 'cur' | '' }[] }) {
  return (
    <div className="tl" role="list">
      {lignes.map((l) => (
        <div key={l.cle} className={'ti ' + l.etat} role="listitem">
          <div className="tt">{l.titre}</div>
          <div className="td">{l.detail}</div>
        </div>
      ))}
    </div>
  )
}

// ── Photos horodatées et « Ajouter » ──────────────────────────────────────────────────────────────────────

const RETIRER: CSSProperties = { position: 'absolute', top: '4px', right: '4px', width: '30px', height: '30px', borderRadius: '50%', border: '0', background: 'rgba(0,0,0,.55)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }


/** Grille de photos du dossier ; « Ajouter » ouvre l'appareil photo (ou la galerie), la photo est allégée sur
 *  l'appareil puis versée au dossier avec son heure. Les photos ajoutées par la boutique se retirent tant qu'elles
 *  sont « retirables » (avant l'envoi). */
export function Photos(p: { pieces: PieceDossier[]; ajouter?: (photo: string) => Promise<void>; retirer?: (id: string) => void; classe?: string; legende?: (x: PieceDossier) => string }) {
  const { t, langue } = usePreferences()
  const champ = useRef<HTMLInputElement>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const choisi = async (f: File | undefined) => {
    if (!f || !p.ajouter) return
    setErreur(null)
    setEnvoi(true)
    try {
      const photo = await reduirePhoto(f)
      await p.ajouter(photo)
      jouer('copie')
    } catch (e) {
      const m = e instanceof Error ? e.message : ''
      setErreur(m === 'type' ? 'Choisissez une photo (JPG, PNG, WebP ou HEIC).' : m === 'taille' ? 'Photo trop lourde : 10 Mo au plus.' : 'Cette photo ne se lit pas. Reprenez-la.')
      jouer('erreur')
    } finally {
      setEnvoi(false)
      if (champ.current) champ.current.value = ''
    }
  }
  return (
    <>
      <div className={p.classe ?? 'photos'}>
        {p.pieces.map((x) => (
          <div key={x.id} style={{ position: 'relative' }}>
            <PhotoDessinee nom={x.photo} horodatage={`${t(p.legende ? p.legende(x) : libellePiece(x))} · ${horodatage(x.a, langue)}`} />
            {x.retirable && p.retirer && (
              <button type="button" style={RETIRER} aria-label={t('Retirer cette photo')} onClick={() => p.retirer!(x.id)}>
                <Icone nom="x" taille={14} trait={3} />
              </button>
            )}
          </div>
        ))}
        {p.ajouter && (
          <button type="button" className="addph" style={{ font: "inherit", cursor: "pointer" }} onClick={() => champ.current?.click()} disabled={envoi} aria-label={t('Ajouter une photo')}>
            <Icone nom="camera" taille={22} />
            <span>{t(envoi ? 'Envoi…' : 'Ajouter')}</span>
          </button>
        )}
      </div>
      {p.ajouter && <input ref={champ} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void choisi(e.target.files?.[0])} data-vd07-photo />}
      {erreur && (
        <div className="hint-l" role="alert" style={{ color: 'var(--red)' }}>
          <Icone nom="circle-alert" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t(erreur)}</span>
        </div>
      )}
    </>
  )
}

// ── États de lecture ──────────────────────────────────────────────────────────────────────────────────────

/** Chargement : cartes grises, le temps que la source réponde. */
export function Chargement() {
  const { t } = usePreferences()
  return (
    <div aria-busy="true" aria-label={t('Chargement…')}>
      {[0, 1].map((i) => (
        <div key={i} className="card">
          {['40%', '85%', '60%'].map((w) => (
            <div key={w} className="cl13-skel" style={{ width: w, height: '12px', borderRadius: '6px', background: 'var(--sand-3)', marginTop: '10px' }}></div>
          ))}
        </div>
      ))}
    </div>
  )
}

/** Erreur de lecture : « Pas de connexion » ou erreur, et « Réessayer » (états de REF-VD). */
export function ErreurLecture({ relire, erreur }: { relire: () => void; erreur?: Error | null }) {
  const { t } = usePreferences()
  const enLigne = useEnLigne()
  // Droits de l'accès employé (src/donnees/droits.ts) : un refus attendu, dit « Réservé », pas une panne.
  if (erreur?.name === 'ReserveAuProprietaire')
    return (
      <div className="card">
        <div className="empty">
          <div className="ei">
            <Icone nom="lock" taille={26} />
          </div>
          <h3>{t('Réservé')}</h3>
          <p>{t('Votre accès ne comprend pas cet écran : demandez-le au propriétaire de la boutique.')}</p>
        </div>
      </div>
    )
  return (
    <div className="card">
      <div className="empty">
        <div className="ei">
          <Icone nom={enLigne ? 'circle-alert' : 'wifi-off'} taille={26} />
        </div>
        <h3>{t(enLigne ? 'Lecture impossible pour l’instant' : 'Pas de connexion')}</h3>
        <p>{t(enLigne ? 'Le serveur n’a pas répondu. Vos données ne sont pas perdues.' : 'Vérifiez le réseau, puis réessayez.')}</p>
        <div className="mt12">
          <Bouton classe="secondary" icone="rotate-ccw" onClick={relire}>
            {t('Réessayer')}
          </Bouton>
        </div>
      </div>
    </div>
  )
}

/** Bandeau hors connexion (REP-04, VD07-R05, R24, R28). */
export function HorsLigne({ texte, sous }: { texte: string; sous?: string }) {
  const { t } = usePreferences()
  return (
    <div className="note red" role="status" data-hors-ligne="">
      <Icone nom="wifi-off" taille={18} />
      <div>
        <b>{t(texte)}</b>
        {sous && (
          <>
            <br />
            {t(sous)}
          </>
        )}
      </div>
    </div>
  )
}

/** Vide (aucun litige, aucun retour, filtre vide). */
export function Vide({ icone, titre, texte, action }: { icone: string; titre: string; texte?: string; action?: ReactNode }) {
  const { t } = usePreferences()
  return (
    <div className="card">
      <div className="empty">
        <div className="ei">
          <Icone nom={icone} taille={26} />
        </div>
        <h3>{t(titre)}</h3>
        {texte && <p>{t(texte)}</p>}
        {action && <div className="mt12">{action}</div>}
      </div>
    </div>
  )
}


/** Feuille posée dans #app (comme les éléments fixes de la coque), au-dessus de l'écran et de la barre du bas. */
export function DansApp({ children }: { children: ReactNode }) {
  // Lu au rendu : la feuille s'ouvre sur un geste, quand #app est déjà là.
  const hote = typeof document === 'undefined' ? null : document.getElementById('app')
  return hote ? createPortal(children, hote) : null
}
