// Commun aux écrans du ramassage (LIV-06) : le ramassage de l'arrêt visé, le colis visé (« ?c= », sinon le premier
// qui attend un geste), l'écran suivant de la chaîne de preuves (contrôle → audit → emballage → code), le brouillon
// d'une étape (coches et photos gardées le temps de l'onglet : quitter une étape de preuve ne perd rien, LIV-UIX-08),
// et le balisage du prototype propre au ramassage (livRam_* : avancement, pastilles, articles, fiche, cases, photos).
import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Feuille } from '@client/composants/Feuille'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { TypeAction } from '../../donnees/domaines/horsligne'
import type { ArticleFiche, ControleColis, Ramassage } from '../../donnees/domaines/ramassage'
import type { Arret, PaquetTournee, ReglesLivreur, Tournee } from '../../donnees/domaines/tournee'
import { enAttente, useFile } from '../../donnees/fileHorsLigne'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { duree, heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { tonReste } from '../../composants/livraison/Avancement'
import { Camera, apercu, type Photo } from '../../composants/livraison/Camera'
import { useArret } from '../../composants/livraison/contexte'
import { VignettePreuve } from '../../composants/livraison/enrichi'
import { HorsConnexion, Li, Lvp, Pill, Sec, Stepper, Vide } from '../../composants/proto'
import '../../composants/livraison/outils'

export const ETAPES_RAMASSAGE = ['Arrivé', 'Contrôle · photo 1', 'Emballage · photo 2', 'Code du vendeur']

const actif = (c: ControleColis) => c.etat !== 'refuse' && c.etat !== 'retire'

/** Écran qui attend le prochain geste du ramassage. */
export function suite(r: Ramassage): { route: string; c?: string } {
  const audit = r.colis.find((c) => c.etat === 'audit' && c.audit?.resultat !== 'attente_console')
  if (audit) return { route: 'audit', c: audit.colisId }
  const aControler = r.colis.find((c) => c.etat === 'attendu')
  if (aControler) return { route: 'controle', c: aControler.colisId }
  const aEmballer = r.colis.find((c) => c.etat === 'controle')
  if (aEmballer) return { route: 'emballage', c: aEmballer.colisId }
  if (r.colis.some((c) => c.etat === 'emballe')) return { route: 'code-remise' }
  return { route: 'tournee' }
}

export function useRamassage(etats?: ControleColis['etat'][]) {
  const [params] = useSearchParams()
  const ctx = useArret(['ramassage'])
  const lecture = useLecture(() => (ctx.arret ? source.ramassage.ramassage(ctx.arret.id) : Promise.resolve(null)), [ctx.arret?.id])
  const r = lecture.donnees
  const voulu = params.get('c')
  const colis = r ? (r.colis.find((c) => c.colisId === voulu) ?? (etats ? r.colis.find((c) => etats.includes(c.etat)) : null) ?? null) : null
  const actifs = r ? r.colis.filter(actif) : []
  return { ...ctx, ramassage: r, lectureR: lecture, colis, rang: colis && r ? r.colis.indexOf(colis) + 1 : 0, actifs, charge: ctx.lecture.charge && (!ctx.arret || lecture.donnees !== null || !!lecture.erreur) }
}

/** Brouillon d'une étape de preuve (onglet seulement) : coches et identifiants de photos, jamais l'image. */
export function useBrouillon<T>(cle: string, initial: T): [T, (f: (x: T) => T) => void, () => void] {
  const lire = (): T => {
    try {
      const v = sessionStorage.getItem('blv_l_brouillon_' + cle)
      return v ? { ...initial, ...(JSON.parse(v) as T) } : initial
    } catch {
      return initial
    }
  }
  const [v, setV] = useState<T>(lire)
  useEffect(() => setV(lire()), [cle]) // eslint-disable-line react-hooks/exhaustive-deps
  const maj = (f: (x: T) => T) =>
    setV((x) => {
      const n = f(x)
      try {
        sessionStorage.setItem('blv_l_brouillon_' + cle, JSON.stringify(n))
      } catch {
        /* rien */
      }
      return n
    })
  const oublier = () => {
    try {
      sessionStorage.removeItem('blv_l_brouillon_' + cle)
    } catch {
      /* rien */
    }
  }
  return [v, maj, oublier]
}

// ---------- Balisage du prototype (06_ramassage.js : livRam_*) ----------

/** Rang de l'arrêt dans la tournée (« Arrêt 2 sur 7 · ramassage »). */
export function rangArret(tour: Tournee, a: Arret): { i: number; n: number } {
  // Numérotation de la tournée entière, la même que la liste « Arrêts suivants » (« Arrêt 2 sur 7 »).
  return { i: a.ordre, n: tour.arrets.length }
}

/** Numéro de commande d'un colis (« BLV-00011-1 » → « BLV-00011 ») : plusieurs colis peuvent venir d'une commande. */
export const commandes = (r: Ramassage) => new Set(r.colis.map((c) => c.colisId.replace(/-\d+$/, ''))).size

/** Écran de preuve qui attend ce colis (sur place seulement) ; sinon null : sa fiche s'ouvre en feuille. */
function etapeDuColis(c: ControleColis, enPlace: boolean): string | null {
  if (!enPlace) return null
  if (c.etat === 'attendu') return 'controle'
  if (c.etat === 'audit' && c.audit?.resultat !== 'attente_console') return 'audit'
  if (c.etat === 'controle') return 'emballage'
  return null
}

/** Toucher un colis (pastille ou article) : son étape de preuve en cours, sinon sa fiche (feuille), jamais rien. */
function useToucherColis(r: Ramassage, enPlace: boolean) {
  const naviguer = useNavigate()
  const [fiche, setFiche] = useState<ControleColis | null>(null)
  const toucher = (c: ControleColis) => {
    const route = etapeDuColis(c, enPlace)
    if (route) naviguer(chemin(route, { a: r.arretId, c: c.colisId }))
    else setFiche(c)
  }
  const app = typeof document !== 'undefined' ? document.querySelector('#app') : null
  const feuille = app && fiche ? createPortal(<FeuilleColis c={fiche} fermer={() => setFiche(null)} />, app) : null
  return { toucher, feuille }
}

const ETAT_COLIS: Record<ControleColis['etat'], [string, 'acc' | 'green' | 'red' | 'amber']> = {
  attendu: ['à contrôler', 'acc'],
  controle: ['contrôlé · à emballer', 'acc'],
  audit: ['audit C4', 'amber'],
  emballe: ['emballé et scellé', 'green'],
  remis: ['remis au livreur', 'green'],
  refuse: ['refusé', 'red'],
  retire: ['retiré', 'red'],
}

function FeuilleColis({ c, fermer }: { c: ControleColis; fermer: () => void }) {
  const { t } = usePreferences()
  const [libelle, ton] = ETAT_COLIS[c.etat] ?? ['', 'acc']
  return (
    <Feuille ouverte fermer={fermer} titre={c.article.nom}>
      <Lvp>
        <div className="row">
          <div className="lr-sheet-h grow">
            {c.colisId}
            {c.etiquette ? ' · ' + c.etiquette : ''}
          </div>
          <Pill ton={ton} sm>
            {t(libelle)}
          </Pill>
        </div>
        <div className="mt12">
          <FicheControle c={c} />
        </div>
        <div className="btns lr-col" style={{ marginTop: 14 }}>
          <button type="button" className="btn secondary" onClick={fermer}>
            <span>{t('Fermer')}</span>
          </button>
        </div>
      </Lvp>
    </Feuille>
  )
}

/** livRam_pk : pastilles des colis de l'arrêt (en cours, emballés ✓, refusés ou retirés ✗), numéro et classe. Chaque
 * pastille autre que celle de l'écran ouvre le colis : son étape en cours, sinon sa fiche. */
export function Pastilles({ r, courant, enPlace }: { r: Ramassage; courant: string | null; enPlace: boolean }) {
  const { t, tf } = usePreferences()
  const { toucher, feuille } = useToucherColis(r, enPlace)
  return (
    <div className="lr-pk" role="list" aria-label={t('Colis de l’arrêt')}>
      {r.colis.map((c, i) => {
        const ok = c.etat === 'emballe' || c.etat === 'remis'
        const ko = !actif(c)
        const cour = c.colisId === courant
        const contenu = (
          <>
            {ok && !cour ? <Icone nom="check" taille={13} trait={3} /> : ko && !cour ? <Icone nom="x" taille={13} trait={3} /> : i + 1} {c.classe}
          </>
        )
        return (
          <span key={c.colisId} role="listitem" className={cour ? 'on' : ok ? 'ok' : ko ? 'ko' : ''} aria-current={cour ? 'true' : undefined} title={c.colisId}>
            {cour ? (
              contenu
            ) : (
              <button type="button" aria-label={tf('Colis {n} · {nom}', { n: i + 1, nom: c.article.nom })} onClick={() => toucher(c)}>
                {contenu}
              </button>
            )}
          </span>
        )
      })}
      {feuille}
    </div>
  )
}

/**
 * livRam_prog : carte d'avancement compacte du ramassage — « Arrêt i sur n · ramassage », boutique · quartier, paquet
 * et heure de prêt, colis sur vous / colis du paquet, étapes de l'arrêt, pastilles des colis. L'heure limite du paquet
 * n'apparaît que lorsqu'elle presse (ambre sous TOURNEE-AMBRE-MIN, rouge sous TOURNEE-ROUGE-MIN : LIV-P08R-06).
 */
export function Avancement(p: { tournee: Tournee; arret: Arret; paquet: PaquetTournee | null; r: Ramassage | null; regles: ReglesLivreur; maintenant: number; etape: number | null; courant?: string | null; pastilles?: boolean; titre?: string; sous?: string }) {
  const { t, tf, langue } = usePreferences()
  const { i, n } = rangArret(p.tournee, p.arret)
  const reste = p.paquet ? p.paquet.heureLimite - p.maintenant : null
  const ton = reste === null ? 'vert' : tonReste(reste, p.regles)
  const sous = [p.paquet?.id, p.arret.pretDepuis ? tf('prêt à {h}', { h: heure(p.arret.pretDepuis, langue) }) : null].filter(Boolean).join(' · ')
  return (
    <div className="card lr-prog">
      <div className="row">
        <div className="grow">
          <div className="kick acc">{tf('Arrêt {i} sur {n} · ramassage', { i, n })}</div>
          <div className="b8 t17 mt4">{p.titre ?? (p.r?.vendeur ?? p.arret.nom) + ' · ' + (p.r?.quartier ?? p.arret.quartier)}</div>
          <div className="t12 c3 mt4">{p.sous ?? sous}</div>
        </div>
        {p.paquet && (
          <div className="right" aria-label={tf('{n} colis sur vous', { n: p.tournee.colisSousGarde })}>
            <div className="lr-n">
              {p.tournee.colisSousGarde}
              <span>/{p.paquet.colisTotal}</span>
            </div>
            <div className="t12 c3">{t('colis sur vous')}</div>
          </div>
        )}
      </div>
      {reste !== null && ton !== 'vert' && p.paquet && (
        <div className="row mt8 t12">
          <span className={'liva-cd lv-reste' + (ton === 'rouge' ? ' r' : ' a')}>
            <Icone nom="timer" taille={13} />
            {reste > 0 ? tf('avant {h} · reste {d}', { h: heure(p.paquet.heureLimite, langue), d: duree(reste, langue) }) : tf('heure limite {h} dépassée', { h: heure(p.paquet.heureLimite, langue) })}
            <span className="lv-sr">{t(ton === 'rouge' ? 'urgent' : 'bientôt')}</span>
          </span>
        </div>
      )}
      {p.etape !== null && <Stepper etapes={ETAPES_RAMASSAGE.map((e) => t(e))} cur={p.etape} />}
      {p.pastilles && p.r && <Pastilles r={p.r} courant={p.courant ?? null} enPlace={p.arret.phase === 'sur_place'} />}
    </div>
  )
}

const ICONE_CATEGORIE: Record<ArticleFiche['categorie'], string> = { electronique: 'smartphone', mode: 'tag', maison: 'home', beaute: 'sparkles', autre: 'package' }

/** Vignette de l'article (livRam_thumb) : la catégorie de la fiche, jamais une photo du vendeur ni un prix. */
export function Vignette({ a, taille = 44 }: { a: ArticleFiche; taille?: number }) {
  return (
    <span className="thumb" aria-hidden="true" style={{ width: taille, height: taille, borderRadius: Math.round(taille / 4), overflow: 'hidden', display: 'inline-flex', flexShrink: 0, alignItems: 'center', justifyContent: 'center', background: 'var(--thumb-bg)', color: 'var(--ink-3)' }}>
      <Icone nom={ICONE_CATEGORIE[a.categorie]} taille={Math.round(taille / 2.2)} />
    </span>
  )
}

/** « Neuf · quantité 1 » (livRam_qtyTxt). */
export function quantiteTexte(a: ArticleFiche, t: (k: string) => string, tf: (k: string, v: Record<string, string | number>) => string) {
  return a.etat + ' · ' + (a.quantite === 1 ? t('quantité 1') : tf('quantité {n}', { n: a.quantite }))
}

/** livRam_items : les articles à ramasser, tels que la fiche les décrit (classe à droite, état du colis s'il a bougé).
 * Toucher un article ouvre son contrôle (sur place), sinon sa fiche. */
export function Articles({ r, enPlace = false }: { r: Ramassage; enPlace?: boolean }) {
  const { t, tf } = usePreferences()
  const { toucher, feuille } = useToucherColis(r, enPlace)
  return (
    <div className="card tight">
      {r.colis.map((c) => (
        <button type="button" key={c.colisId} className="li" onClick={() => toucher(c)}>
          <Vignette a={c.article} />
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {c.article.nom}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {c.article.variante} · {quantiteTexte(c.article, t, tf)}
            </span>
          </span>
          {c.etat === 'refuse' || c.etat === 'retire' ? (
            <Pill ton="red" sm>
              {t(c.etat === 'refuse' ? 'refusé' : 'retiré')}
            </Pill>
          ) : c.etat === 'emballe' || c.etat === 'remis' ? (
            <Pill ton="green" sm icone="check">
              {c.classe}
            </Pill>
          ) : (
            <Pill ton="acc" sm>
              {c.classe}
            </Pill>
          )}
          <Icone nom="chevron-right" taille={16} />
        </button>
      ))}
      {feuille}
    </div>
  )
}

const FILE_LIBELLES: Partial<Record<TypeAction, [string, string]>> = {
  arrivee: ['map-pin-check', 'Arrivée chez {vendeur}'],
  controle: ['clipboard-check', 'Contrôle et photo 1'],
  audit: ['search', 'Audit par échantillon'],
  etiquette: ['tag', 'Étiquette liée'],
  emballage: ['package-check', 'Emballage et photo 2'],
  code_remise: ['key-round', 'Code de remise'],
  refus: ['ban', 'Refus d’un colis'],
  incident: ['triangle-alert', 'Incident déclaré'],
  photo: ['camera', 'Photo de preuve'],
}

/** livRam_off : bandeau hors connexion des étapes de preuve. */
export function HorsLigneRamassage({ quoi }: { quoi: string }) {
  const { t } = usePreferences()
  return (
    <HorsConnexion>
      <b>{t('Hors connexion')}</b> · {t(quoi)} {t('Tout part au retour du réseau, avec l’heure et la position d’origine.')}
    </HorsConnexion>
  )
}

/** livRam_queue : gestes de cet arrêt en file d'attente (hors connexion), avec leur heure d'origine. */
export function FileArret({ r }: { r: Ramassage }) {
  const { t, tf, langue } = usePreferences()
  const file = useFile()
  const objets = new Set([r.arretId, ...r.colis.map((c) => c.colisId)])
  const liste = enAttente(file).filter((a) => objets.has(a.objet))
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
              t={tf(lib, { vendeur: r.vendeur })}
              s={heure(a.origine.heure, langue) + (a.objet !== r.arretId ? ' · ' + a.objet : '')}
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

/**
 * Photo de preuve exigée : vide → livRam_shot (emplacement en pointillés qui ouvre l'appareil photo de l'application ;
 * verrouillé tant que l'étape d'avant n'est pas faite) ; prise → livRam_taken (vignette horodatée, légende, « Reprendre »).
 */
export function PhotoPreuve(p: { titre: string; sous: string; consigne: string; nature: string; objet: string; type?: TypeAction; id: string | null; heure?: number | null; enFile?: boolean; prise: (ph: Photo) => void; verrou?: string | null; legende?: string; extra?: ReactNode; carte?: boolean }) {
  const { t, langue } = usePreferences()
  const [ouverte, setOuverte] = useState(false)
  const url = apercu(p.id)
  return (
    <>
      {p.id ? (
        <div className={p.carte ? 'card' : undefined}>
        <div className="lr-ph" style={p.carte ? { marginTop: 0 } : undefined}>
          <div className="photo">
            {url ? (
              <VignettePreuve url={url} titre={p.titre} quand={p.heure}>
                <img src={url} alt={t(p.titre)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </VignettePreuve>
            ) : <span className="lv-photo-vide" style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)' }}><Icone nom="image" taille={30} /></span>}
            <span className="ok">
              <Icone nom="check" taille={14} trait={3} />
            </span>
            {p.heure ? <span className="ts">{heure(p.heure, langue)}</span> : null}
          </div>
          <div>
            <div className="t">{t(p.titre)}</div>
            <div className="s">{p.enFile ? t('Enregistrée sur le téléphone : elle part au retour du réseau, avec son heure et sa position.') : (p.legende ?? t('Prise avec l’appareil photo de l’application ; heure et position enregistrées.'))}</div>
            <button type="button" className="btn secondary sm mt8" onClick={() => setOuverte(true)} aria-label={t('Reprendre la photo') + ' · ' + t(p.titre)}>
              <Icone nom="camera" taille={16} />
              <span>{t('Reprendre')}</span>
            </button>
          </div>
        </div>
        {p.extra}
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

/** Anneau du prototype (C.ring) : avancement d'une attente, libellé au centre. */
export function Anneau({ v, max, couleur, taille = 64, libelle }: { v: number; max: number; couleur: string; taille?: number; libelle: string }) {
  const r = (taille - 8) / 2
  const c = 2 * Math.PI * r
  const f = (c * Math.max(0, Math.min(v, max))) / max
  return (
    <div className="ring" style={{ width: taille, height: taille }} aria-hidden="true">
      <svg width={taille} height={taille}>
        <circle cx={taille / 2} cy={taille / 2} r={r} fill="none" stroke="var(--sand-3)" strokeWidth={6} />
        <circle cx={taille / 2} cy={taille / 2} r={r} fill="none" stroke={couleur} strokeWidth={6} strokeLinecap="round" strokeDasharray={f.toFixed(1) + ' ' + c.toFixed(1)} />
      </svg>
      <b style={taille > 80 ? { fontSize: Math.round(taille / 3.4) / 16 + 'rem' } : undefined}>{libelle}</b>
    </div>
  )
}

/** livRam_chk : case de vérification (cochée, en écart, en attente) ; bouton quand le livreur la coche. */
export function CaseVerif(p: { etat: '' | 'on' | 'ko' | 'wait'; titre: string; sous?: string; droite?: ReactNode; basculer?: () => void; desactive?: boolean }) {
  const corps = (
    <>
      <span className="bx">{p.etat === 'on' ? <Icone nom="check" taille={17} trait={3} /> : p.etat === 'ko' ? <Icone nom="x" taille={17} trait={3} /> : null}</span>
      <span className="grow">
        <span className="t" style={{ display: 'block' }}>
          {p.titre}
        </span>
        {p.sous && (
          <span className="s" style={{ display: 'block' }}>
            {p.sous}
          </span>
        )}
      </span>
      {p.droite && <span className="r">{p.droite}</span>}
    </>
  )
  return p.basculer ? (
    <button type="button" role="checkbox" aria-checked={p.etat === 'on'} className={'lr-chk ' + p.etat} onClick={p.basculer} disabled={p.desactive}>
      {corps}
    </button>
  ) : (
    <div className={'lr-chk ' + p.etat}>{corps}</div>
  )
}

/** livRam_fiche : fiche de contrôle du colis telle que le vendeur l'a décrite (jamais un prix). */
export function FicheControle({ c, audit }: { c: ControleColis; audit?: boolean }) {
  const { t, tf } = usePreferences()
  const a = c.article
  return (
    <div className="card">
      <div className="lr-fiche">
        <Vignette a={a} taille={64} />
        <div className="grow">
          <div className="kick">{t('Fiche de contrôle')}</div>
          <div className="b8 t17 mt4">{a.nom}</div>
          <div className="t13 c3 mt4">{audit ? t('Contrôle approfondi C4 demandé') : tf('Classe déclarée par le vendeur : {classe}', { classe: c.classe })}</div>
        </div>
      </div>
      <div className="lr-kv">
        <span className="k">{t('Variante')}</span>
        <span className="v">{a.variante}</span>
        <span className="k">{t('État déclaré')}</span>
        <span className="v">{a.etat}</span>
        <span className="k">{t('Quantité')}</span>
        <span className="v">{a.quantite}</span>
        <span className="k">{t('Accessoires annoncés')}</span>
        <span className="v">{a.accessoires ?? t('Aucun')}</span>
        <span className="k">{t('Numéro de série')}</span>
        <span className="v">{a.serie ? t('Attendu sur la photo 1') : t('Sans numéro de série')}</span>
        {c.fragile && (
          <>
            <span className="k">{t('Manipulation')}</span>
            <span className="v">{t('Fragile')}</span>
          </>
        )}
      </div>
    </div>
  )
}

/** Ce que le livreur regarde pour « Aucun dommage visible », selon la catégorie de la fiche. */
export const DOMMAGES: Record<ArticleFiche['categorie'], string> = {
  electronique: 'Produit, boîte, câbles',
  mode: 'Tissu, coutures, finitions',
  maison: 'Produit, angles, surfaces',
  beaute: 'Flacon, bouchon, emballage',
  autre: 'Rayure, trou, tache, casse',
}

/** Rien à faire sur cet écran maintenant (C.empty dans une carte) : un seul bouton, vers la suite. */
export function RienIciProto({ icone, titre, texte, vers = 'tournee', libelle = 'Revenir à la tournée', params }: { icone: string; titre: string; texte: string; vers?: string; libelle?: string; params?: Record<string, string> }) {
  const { t } = usePreferences()
  return (
    <div className="card">
      <Vide icone={icone} t={t(titre)} s={t(texte)}>
        <Link className="btn primary" to={chemin(vers, params)}>
          <Icone nom={vers === 'tournee' ? 'route' : 'arrow-right'} taille={18} />
          <span>{t(libelle)}</span>
        </Link>
      </Vide>
    </div>
  )
}

/** Écran suivant de la chaîne de preuves, au balisage du prototype (bouton principal). */
export function Suite({ r, texte, xl = true }: { r: Ramassage; texte?: string; xl?: boolean }) {
  const { t } = usePreferences()
  const s = suite(r)
  const libelles: Record<string, string> = { controle: 'Colis suivant : contrôler', audit: 'Colis suivant : audit', emballage: 'Colis suivant : emballer', 'code-remise': 'Demander le code', tournee: 'Continuer la tournée' }
  return (
    <Link className={'btn primary' + (xl ? ' xl' : '')} to={chemin(s.route, s.route === 'tournee' ? undefined : { a: r.arretId, c: s.c })}>
      <Icone nom={s.route === 'tournee' ? 'route' : s.route === 'code-remise' ? 'key-round' : 'arrow-right'} taille={18} />
      <span>{t(texte ?? libelles[s.route])}</span>
    </Link>
  )
}
