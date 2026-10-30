// Balisage du prototype commun aux remises (07_remises.js s'appuie sur les aides de 06_ramassage.js : livRam_* et
// livRem_*) : carte d'avancement compacte (livRam_prog), carte du relais (livRem_relay), code de dépôt (livRem_code),
// ligne de colis (C.parcel), pastille d'état (ST), photo de preuve (livRam_shot / livRam_taken), preuves (livRam_pf),
// gestes en file (livRam_queue). Textes passés déjà traduits ; données de la source seulement.
import { useState, type ReactNode } from 'react'
import { Icone } from '../../composants/Icone'
import type { TypeAction } from '../../donnees/domaines/horsligne'
import { enAttente, useFile } from '../../donnees/fileHorsLigne'
import type { ReglesLivreur } from '../../donnees/domaines/tournee'
import { duree, heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { tonReste } from '../../composants/livraison/Avancement'
import { Camera, apercu, type Photo } from '../../composants/livraison/Camera'
import { Rebours, VignettePreuve } from '../../composants/livraison/enrichi'
import { HorsConnexion, Li, Pill, Sec, Stepper, type Ton } from '../../composants/proto'

/** livRam_prog : kicker, titre, sous-titre, colis sur vous / total, étapes de l'arrêt. */
export function Prog(p: { k: ReactNode; titre: ReactNode; sous?: ReactNode; n?: number; sur?: number; nl?: string; etapes?: string[]; cur?: number; children?: ReactNode }) {
  const { t, tf } = usePreferences()
  return (
    <div className="card lr-prog">
      <div className="row">
        <div className="grow">
          <div className="kick acc">{p.k}</div>
          <div className="b8 t17 mt4">{p.titre}</div>
          {p.sous && <div className="t12 c3 mt4">{p.sous}</div>}
        </div>
        {p.n !== undefined && (
          <div className="right" aria-label={tf('{n} colis sur vous', { n: p.n })}>
            <div className="lr-n">
              {p.n}
              {p.sur !== undefined && <span>/{p.sur}</span>}
            </div>
            <div className="t12 c3">{p.nl ?? t('colis sur vous')}</div>
          </div>
        )}
      </div>
      {p.etapes && <Stepper etapes={p.etapes} cur={p.cur ?? 0} />}
      {p.children}
    </div>
  )
}

/** Vignette d'un lieu (la devanture n'est jamais une photo inventée : icône du lieu). */
export function Lieu({ icone, taille = 74 }: { icone: string; taille?: number }) {
  return (
    <div className="photo" aria-hidden="true" style={{ width: taille, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)' }}>
      <Icone nom={icone} taille={Math.round(taille / 2.6)} />
    </div>
  )
}

/** Pastille ronde d'une personne (initiale du prénom : jamais de photo d'un tiers inventée). */
export function Initiale({ prenom, taille = 28 }: { prenom: string; taille?: number }) {
  return (
    <span aria-hidden="true" style={{ width: taille, height: taille, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'var(--acc-soft)', color: 'var(--acc-txt)', fontWeight: 800, fontSize: Math.round(taille / 2.3) / 16 + 'rem', boxShadow: '0 0 0 2px var(--card)' }}>
      {prenom.slice(0, 1).toUpperCase()}
    </span>
  )
}

/** livRem_relay : carte du relais (vignette, kicker, nom, gérante inscrite, trois indicateurs). */
export function CarteRelais(p: { k: ReactNode; nom: ReactNode; gerant?: string; minis: [ReactNode, ReactNode][]; icone?: string }) {
  const { t } = usePreferences()
  return (
    <div className="card">
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <Lieu icone={p.icone ?? 'store'} />
        <div className="grow">
          <div className="kick acc">{p.k}</div>
          <div className="b8 t17 mt4">{p.nom}</div>
          {p.gerant && (
            <div className="row mt8" style={{ gap: 8 }}>
              <Initiale prenom={p.gerant} />
              <span className="t13 c2">
                <b>{p.gerant}</b> · {t('gérante')}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="split3 mt12">
        {p.minis.map(([k, v], i) => (
          <div key={i} className="mini">
            <div className="mk">{k}</div>
            <div className="mv">{v}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** livRem_code : code de dépôt en six cases (secours du scan). */
export function CodeDepot({ code, label }: { code: string; label: string }) {
  return (
    <div className="lr-code no-tr" role="img" aria-label={label + ' ' + code.split('').join(' ')}>
      {code.split('').map((x, i) => (
        <span key={i} style={{ display: 'contents' }}>
          {i === code.length / 2 && <span className="gap" />}
          <span>{x}</span>
        </span>
      ))}
    </div>
  )
}

/** ST du prototype : pastille d'état avec point. */
export const Etat = ({ ton, children }: { ton: Ton; children: ReactNode }) => (
  <Pill ton={ton} sm point>
    {children}
  </Pill>
)

/** C.parcel : ligne de colis (classe, ✓ ou ✗), titre, sous-titre, droite. */
export function Colis({ st, classe, titre, sous, droite }: { st?: 'ok' | 'bad' | ''; classe: string; titre: ReactNode; sous?: ReactNode; droite?: ReactNode }) {
  return (
    <div className={'parcel ' + (st ?? '')}>
      <span className="pc">{st === 'ok' ? <Icone nom="check" taille={16} trait={3} /> : st === 'bad' ? <Icone nom="x" taille={16} trait={3} /> : classe}</span>
      <span className="grow">
        <span className="b8 t14" style={{ display: 'block' }}>
          {titre}
        </span>
        {sous && (
          <span className="t12 c3" style={{ display: 'block', marginTop: 1 }}>
            {sous}
          </span>
        )}
      </span>
      {droite}
    </div>
  )
}

/** livRam_hk : kicker d'un héros, avec l'heure. */
export function Hk({ children, quand, couleur }: { children: ReactNode; quand?: ReactNode; couleur?: string }) {
  return (
    <div className="hk" style={couleur ? { color: couleur } : undefined}>
      {children}
      {quand ? <span className="lr-t"> · {quand}</span> : null}
    </div>
  )
}

/** livRam_pf : preuve réunie (pastille). */
export function Preuve({ icone, ko, children }: { icone: string; ko?: boolean; children: ReactNode }) {
  return (
    <span className={'lr-pf ' + (ko ? 'ko' : 'ok')}>
      <Icone nom={icone} taille={14} />
      {children}
    </span>
  )
}

/** Photo de preuve : vide → livRam_shot (ouvre l'appareil photo de l'application) ; prise → livRam_taken. */
export function PhotoPreuve(p: { titre: string; sous: string; consigne: string; nature: string; objet: string; type?: TypeAction; id: string | null; heure?: number | null; enFile?: boolean; prise: (ph: Photo) => void; verrou?: string | null; legende?: string; facultative?: boolean; fige?: boolean }) {
  const { t, langue } = usePreferences()
  const [ouverte, setOuverte] = useState(false)
  const url = apercu(p.id)
  return (
    <>
      {p.id ? (
        <div className="lr-ph">
          <div className="photo">
            {url ? (
              <VignettePreuve url={url} titre={p.titre} quand={p.heure}>
                <img src={url} alt={t(p.titre)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </VignettePreuve>
            ) : (
              <span style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)' }}>
                <Icone nom="image" taille={30} />
              </span>
            )}
            <span className="ok">
              <Icone nom="check" taille={14} trait={3} />
            </span>
            {p.heure ? <span className="ts">{heure(p.heure, langue)}</span> : null}
          </div>
          <div>
            <div className="t">{t(p.titre)}</div>
            <div className="s">{p.enFile ? t('Enregistrée sur le téléphone : elle part au retour du réseau, avec son heure et sa position.') : (p.legende ?? t('Prise avec l’appareil photo de l’application ; heure et position enregistrées.'))}</div>
            {!p.fige && (
              <button type="button" className="btn secondary sm mt8" onClick={() => setOuverte(true)} aria-label={t('Reprendre la photo') + ' · ' + t(p.titre)}>
                <Icone nom="camera" taille={16} />
                <span>{t('Reprendre')}</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <button type="button" className={'lr-shot' + (p.verrou ? ' lock' : '')} disabled={!!p.verrou} onClick={() => setOuverte(true)} aria-label={t('Prendre la photo') + ' · ' + t(p.titre)} style={{ width: '100%', textAlign: 'left', font: 'inherit', cursor: p.verrou ? 'default' : 'pointer' }}>
          <span className="ci">
            <Icone nom={p.verrou ? 'lock' : 'camera'} taille={24} />
          </span>
          <span className="grow">
            <span className="t" style={{ display: 'block' }}>
              {t(p.titre)}
            </span>
            <span className="s" style={{ display: 'block' }}>
              {p.verrou ? t(p.verrou) : t(p.sous)}
            </span>
          </span>
          {!p.verrou && <Icone nom="chevron-right" taille={20} style={{ color: 'var(--ink-4)' }} />}
        </button>
      )}
      <Camera ouverte={ouverte} fermer={() => setOuverte(false)} consigne={p.consigne} nature={p.nature} objet={p.objet} type={p.type} prise={p.prise} />
    </>
  )
}

/** livRam_chk : case de vérification ('on' cochée, 'ko', 'wait' en attente) ; cliquable quand `basculer` est donné. */
export function Chk({ st, titre, sous, droite, basculer }: { st: 'on' | 'ko' | 'wait' | ''; titre: ReactNode; sous?: ReactNode; droite?: ReactNode; basculer?: () => void }) {
  const corps = (
    <>
      <span className="bx">{st === 'on' ? <Icone nom="check" taille={17} trait={3} /> : st === 'ko' ? <Icone nom="x" taille={17} trait={3} /> : null}</span>
      <span className="grow">
        <span className="t" style={{ display: 'block' }}>
          {titre}
        </span>
        {sous && (
          <span className="s" style={{ display: 'block' }}>
            {sous}
          </span>
        )}
      </span>
      {droite && <span className="r">{droite}</span>}
    </>
  )
  return basculer ? (
    <button type="button" role="checkbox" aria-checked={st === 'on'} className={'lr-chk ' + st} onClick={basculer} style={{ width: '100%', textAlign: 'left', font: 'inherit', color: 'inherit', background: 'none', borderLeft: 0, borderRight: 0, borderBottom: 0, cursor: 'pointer' }}>
      {corps}
    </button>
  ) : (
    <div className={'lr-chk ' + st} role="checkbox" aria-checked={st === 'on'} aria-disabled="true">
      {corps}
    </div>
  )
}

const FILE_LIBELLES: Partial<Record<TypeAction, [string, string]>> = {
  arrivee: ['map-pin-check', 'Arrivée'],
  depot: ['package-check', 'Dépôt au relais'],
  collecte: ['package-plus', 'Sortie de colis confirmée'],
  domicile: ['house', 'Remise à domicile'],
  retour: ['undo-2', 'Retour au vendeur'],
  echec: ['circle-x', 'Échec de remise'],
  incident: ['triangle-alert', 'Incident déclaré'],
  photo: ['camera', 'Photo de preuve'],
}

/** livRam_off : bandeau hors connexion des remises. */
export function HorsLigneRemise({ quoi }: { quoi: string }) {
  const { t } = usePreferences()
  return (
    <HorsConnexion>
      <b>{t('Hors connexion')}</b> · {t(quoi)} {t('Tout part au retour du réseau, avec l’heure et la position d’origine.')}
    </HorsConnexion>
  )
}

/** livRam_queue : gestes de cet arrêt en attente d'envoi, avec leur heure d'origine. */
export function FileRemise({ objets }: { objets: string[] }) {
  const { t, langue } = usePreferences()
  const file = useFile()
  const set = new Set(objets)
  const liste = enAttente(file).filter((a) => set.has(a.objet))
  if (!liste.length) return null
  return (
    <>
      <Sec titre={t('En attente d’envoi')} />
      <div className="card tight">
        {liste.map((a) => {
          const [ic, lib] = FILE_LIBELLES[a.type] ?? ['cloud-upload', 'Geste']
          return (
            <Li
              key={a.origine.cle}
              icone={ic}
              ton="night"
              t={t(lib)}
              s={heure(a.origine.heure, langue) + ' · ' + a.objet}
              droite={
                <span className="lr-q">
                  <Icone nom="cloud-upload" taille={12} />
                  {t('En file')}
                </span>
              }
            />
          )
        })}
      </div>
    </>
  )
}

/** Majuscule initiale (« tournée relais » → « Tournée relais »). */
export const maj = (s: string) => s.replace(/^./, (c) => c.toUpperCase())

/** Heure limite du paquet, montrée dans la carte d'avancement seulement quand elle presse (ambre, rouge : LIV-P08R-06). */
export function ResteUrgent({ limite, maintenant, regles, toujours }: { limite: number | null | undefined; maintenant: number; regles: ReglesLivreur; toujours?: boolean }) {
  const { t, tf, langue } = usePreferences()
  if (!limite) return null
  const reste = limite - maintenant
  const ton = tonReste(reste, regles)
  if (ton === 'vert' && !toujours) return null
  // Vert : l'heure et la durée ; dès l'ambre, le compte à rebours en direct, à la seconde (M17).
  return (
    <div className="row mt8 t12">
      {ton === 'vert' ? (
        <span className="liva-cd lv-reste">
          <Icone nom="timer" taille={13} />
          {tf('avant {h} · reste {d}', { h: heure(limite, langue), d: duree(reste, langue) })}
        </span>
      ) : reste > 0 ? (
        <Rebours fin={limite} maintenant={maintenant} libelle={tf('avant {h} · reste', { h: heure(limite, langue) })} ambreMs={regles.resteAmbreMin * 60000} rougeMs={regles.resteRougeMin * 60000} />
      ) : (
        <span className="liva-cd lv-reste r">
          <Icone nom="timer" taille={13} />
          {tf('heure limite {h} dépassée', { h: heure(limite, langue) })}
          <span className="lv-sr">{t('urgent')}</span>
        </span>
      )}
    </div>
  )
}
