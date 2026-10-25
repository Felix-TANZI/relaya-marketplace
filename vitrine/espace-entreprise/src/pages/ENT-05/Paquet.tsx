// ENT-P11 — Détail et acceptation d'un paquet, repris sur le prototype (route('paquet') et entB_detail : héros du
// compte à rebours avec Accepter / Ignorer, ou héros « à affecter » avec Affecter / Rendre ; à gauche « Itinéraire
// imposé » (carte, arrêts) et « Colis par arrêt » ; à droite « Rémunération ligne par ligne », « Délais et
// engagement », « Avant d'accepter » ou « Après l'acceptation » ; note de pied). Disponible : anneau, rémunération
// « si les preuves sont complètes », priorité, Accepter en un geste, Ignorer sans effet sur le score (ENT-P11R-02) ;
// déjà pris ou délai passé : message, retour à la liste (ENT-01-R17) ; accepté : Affecter ; Rendre avant tout
// ramassage (ENT-P11R-01, ENT-PUB-02). Quartiers avant l'acceptation, boutiques après (ENT-P10R-02) ; colis par arrêt
// (classe, valeur déclarée du colis, mentions ; plafond du palier par colis : ENT-02-R16) ; rémunération figée à
// l'acceptation (ENT-P09R-03, RG-R95) ; délais et marge restante (RG-R92) ; capacité et livreurs éligibles (RG-R93).
// Enrichi (ENRICHISSEMENTS.md, P11) : compte à rebours en direct dans le héros (accepter, affecter, livrer ; ambre au
// seuil réglé dans Prix et délais) et dans « Délais et engagement » ; bon de prise en vrai PDF (arrêts dans l'ordre
// imposé, colis, kit, échéances) après l'acceptation ; Accepter et Ignorer gardés hors connexion (geste) ; itinéraire :
// carte schématique et arrêts ordonnés (MapLibre/OSM à l'intégration, INTEGRATION.md 16) ; gestes au pouce.
import { CoucheMarqueurs, LegendeCarte, type PointMarqueur } from '@client/composants/carte/Marqueurs'
import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Feuille, useFeuille } from '@client/composants/Feuille'
import { sonner } from '../../composants/marque-sonore'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { NOM_PALIER } from '../../config/libelles'
import { chemin } from '../../config/pages'
import { source } from '../../donnees/source'
import type { Arret, DetailPaquet } from '../../donnees/domaines/paquets'
import type { LieuCarte, ZoneCarte } from '../../donnees/domaines/carte'
import { F } from '@client/i18n/format'
import { BarrePouce, type Colonne, exporterPdf, Hint, Li, Note, Panel, Pill, Px, Rebours, Table, Tete, Vide as VideP } from '../../composants/prototype'
import { usePreferences } from '../../preferences'
import { useHorloge, useMontantsVisibles, useSession } from '../../session'
import { geste } from '../../donnees/fileHorsLigne'
import type { LignePdf } from '../../donnees/exports'
import { Anneau, BandeauErreur, Chargement, Montant, NOM_GENRE, NOM_LIGNE, NOM_STATUT, Retour, classesEnTexte, nomArret, useDonnees, useDuree, useHeure, useJour, useSeuils } from './commun'
import { TEXTE_REFUS, nomZone } from './Paquets'
import { REGLES, marge, plusGrande, tonMarge, trancheTournee } from '../../calculs/livraison/regles-ecrans'

export const NOM_EVENEMENT: Record<string, string> = {
  publie: 'Publié par BelivaY',
  accepte: 'Accepté',
  affecte: 'Livreur affecté, vendeurs prévenus',
  reaffecte: 'Livreur remplacé, vendeurs prévenus',
  depart: 'Départ de la tournée',
  ramasse: 'Code de remise validé, colis sous la garde de l’entreprise',
  incident: 'Incident déclaré par le livreur',
  incident_valide: 'Incident validé',
  incident_refuse: 'Incident refusé, livreur rappelé',
  arret_retire: 'Arrêt retiré de la tournée',
  transfert: 'Transfert demandé à un autre livreur',
  remis: 'Remis',
  clos: 'Preuves complètes : mission close',
  ignore: 'Ignoré',
  rendu: 'Rendu à BelivaY avant ramassage',
  relance_preuves: 'Livreur relancé : preuves',
  relance_position: 'Livreur relancé : position',
  relance_depart: 'Livreur relancé : départ',
  relance_colis: 'Livreur relancé : colis',
  ordre: 'Ordre des arrêts changé par le livreur',
  retard: 'Retard prévu par le livreur',
  colis_laisse: 'Colis laissé chez le vendeur (pas prêt)',
  remise_tiers: 'Remis à un tiers qui avait le code',
}

/** Journal du paquet (liste datée, du plus récent au plus ancien). */
export function Journal({ p }: { p: Pick<DetailPaquet, 'journal'> }) {
  const { t } = usePreferences()
  const h = useHeure()
  return (
    <ol className="lv-journal">
      {[...p.journal].reverse().map((e, i) => (
        <li key={i}>
          <time>{h(e.le)}</time>
          <span>
            {t(NOM_EVENEMENT[e.quoi] ?? 'Événement')}
            {e.par && <span className="lv-s"> · {e.par}</span>}
          </span>
        </li>
      ))}
    </ol>
  )
}

/** entB_kv du prototype : clé à gauche, valeur en gras et précision dessous à droite. */
export const KvE = ({ k, v, d }: { k: ReactNode; v: ReactNode; d?: ReactNode }) => (
  <div className="entb-kv">
    <span className="k">{k}</span>
    <span className="v">
      <b>{v}</b>
      {d && <small>{d}</small>}
    </span>
  </div>
)

/** entB_cls : pastille de classe. */
export const Cls = ({ c }: { c: string }) => <span className={'entb-cls c' + c}>{c}</span>

/** Titre d'un arrêt : nom de la boutique après l'acceptation, quartier seulement avant (ENT-P10R-02). */
export function titreArret(a: Arret, t: (s: string) => string, tf: (s: string, v: Record<string, string | number>) => string): string {
  if (a.type === 'domicile') return tf('Client à {q}', { q: a.quartier })
  if (a.type === 'relais') return a.nom ?? tf('Relais à {q}', { q: a.quartier })
  return a.nom ? `${a.nom} · ${a.quartier}` : tf('Boutique à {q}', { q: a.quartier }) + (a.type === 'stockage' ? ` · ${t('Point de stockage')}` : '')
}

/**
 * Carte d'un paquet (entB_pqMap) : zones traversées (celle du paquet en avant), arrêts dans l'ordre imposé, relais de
 * dépôt ; avant l'acceptation les boutiques sont placées au quartier de leur zone (aucune adresse) ; le client n'apparaît
 * que par sa zone. Marqueurs communs des six applications (@client/composants/carte), numérotés dans l'ordre. Fond schématique (mêmes données que la carte de la flotte ; MapLibre en production, DP-49).
 */
export function CartePaquet({ p, zones, lieux }: { p: DetailPaquet; zones: ZoneCarte[]; lieux: LieuCarte[] }) {
  const { t, tf } = usePreferences()
  const duree = useDuree()
  const codes = new Set([p.zone, ...p.arrets.map((a) => a.zone)])
  const vues = zones.filter((z) => codes.has(z.code))
  if (!vues.length) return null
  const KM = 1 / 111
  const la0 = Math.min(...vues.map((z) => z.lat - z.rayonKm * KM))
  const la1 = Math.max(...vues.map((z) => z.lat + z.rayonKm * KM))
  const lo0 = Math.min(...vues.map((z) => z.lng - z.rayonKm * KM))
  const lo1 = Math.max(...vues.map((z) => z.lng + z.rayonKm * KM))
  const lat0 = la0 - (la1 - la0) * 0.12
  const lat1 = la1 + (la1 - la0) * 0.12
  const lng0 = lo0 - (lo1 - lo0) * 0.3
  const lng1 = lo1 + (lo1 - lo0) * 0.3
  const L = 640
  const H = Math.max(240, Math.min(420, Math.round((L * (lat1 - lat0)) / (lng1 - lng0))))
  const x = (lng: number) => ((lng - lng0) / (lng1 - lng0)) * L
  const y = (lat: number) => ((lat1 - lat) / (lat1 - lat0)) * H
  const r = (km: number) => (km * KM * L) / (lng1 - lng0)
  const pos = (a: Arret, i: number) => {
    const l = a.nom ? lieux.find((x) => x.nom === a.nom && x.zone === a.zone) : undefined
    if (l) return { lat: l.lat, lng: l.lng }
    // Une zone retirée depuis (ou pas encore déclarée) : l'arrêt se place dans la zone du paquet, sans faire tomber la carte.
    const z = zones.find((x) => x.code === a.zone) ?? vues[0]
    const ang = i * 2.1 + 0.6
    const d = a.type === 'domicile' ? 0 : z.rayonKm * 0.45 * KM
    return { lat: z.lat + Math.sin(ang) * d, lng: z.lng + Math.cos(ang) * d }
  }
  const pts = p.arrets.map((a, i) => ({ a, ...pos(a, i) }))
  return (
    <div className="mapbox entb-mapb lv-pmap">
      <svg viewBox={`0 0 ${L} ${H}`} role="img" aria-label={tf('Itinéraire imposé : {n} arrêts, {km} km', { n: p.arrets.length, km: String(p.distanceKm).replace('.', ',') })}>
        <rect width={L} height={H} className="lv-pm-fond" />
        {vues.map((z) => (
          <g key={z.code}>
            <path d={'M' + z.polygone.map(([la, lo]) => `${x(lo).toFixed(1)} ${y(la).toFixed(1)}`).join('L') + 'Z'} className={'lv-pm-zone' + (z.code === p.zone ? ' on' : '')} />
            <text x={x(z.lng)} y={y(z.lat) - 16} textAnchor="middle" className="lv-pm-zt">
              {z.code} {z.nom}
            </text>
          </g>
        ))}
        <polyline points={pts.map((q) => `${x(q.lng)},${y(q.lat)}`).join(' ')} className="lv-pm-route" />
        {pts.filter(({ a }) => a.type === 'domicile').map(({ a, lat, lng }) => (
          <circle key={'z' + a.ordre} cx={x(lng)} cy={y(lat)} r={r(0.5)} className="lv-pm-client" />
        ))}
        <CoucheMarqueurs
          regrouper={false}
          taille={28}
          points={pts.map(({ a, lat, lng }): PointMarqueur => ({
            id: 'arret-' + a.ordre,
            acteur: a.type === 'domicile' ? 'client' : a.type === 'relais' ? 'relais' : 'boutique',
            x: x(lng),
            y: y(lat),
            nom: tf('Arrêt {n} : {l}', { n: a.ordre, l: a.nom ?? t('Zone de remise') }),
            texte: String(a.ordre),
            classe: 'lv-pm-pt ' + a.type + (a.fait ? ' fait' : ''),
          }))}
        />
      </svg>
      <LegendeCarte
        acteurs={['boutique', ...(p.arrets.some((a) => a.type === 'relais') ? (['relais'] as const) : []), ...(p.arrets.some((a) => a.type === 'domicile') ? (['client'] as const) : [])]}
        libelles={{ relais: 'Relais de dépôt', client: 'Zone de remise (adresse transmise au livreur seulement)' }}
        autres={[['lv-pm-l route', tf('Ordre imposé · {km} km · {d}', { km: String(p.distanceKm).replace('.', ','), d: duree(p.dureeMin) })]]}
      />
    </div>
  )
}

/**
 * Bon de prise (M6) : un vrai PDF pour le livreur et le point de stockage, après l'acceptation (noms des boutiques
 * visibles) : paquet, entreprise, livreur, échéances, arrêts dans l'ordre imposé, colis (classe, étiquette, valeur
 * déclarée, mentions), kit, rappel du code de remise ; édité par qui et quand.
 */
export function useBonDePrise() {
  const { t, tf } = usePreferences()
  const h = useHeure()
  const jour = useJour()
  const duree = useDuree()
  const s = useSession()
  const n = useHorloge(60_000)
  return (p: DetailPaquet) => {
    const L: LignePdf[] = [
      { texte: t('BelivaY · Bon de prise'), taille: 16 },
      { texte: `${p.id} · ${t(NOM_GENRE[p.genre])} · ${p.zone}`, taille: 12, espace: 4 },
      { texte: s.entreprise?.nom ?? '' },
    ]
    if (p.accepteLe) L.push({ texte: p.acceptePar ? tf('Accepté à {h} par {u}', { h: h(p.accepteLe), u: p.acceptePar }) : tf('Accepté à {h}', { h: h(p.accepteLe) }) })
    L.push({ texte: p.livreur ? tf('Livreur : {n}', { n: p.livreur.nom }) : t('Livreur : à affecter') })
    if (p.ramassageAvant) L.push({ texte: tf('Ramassages terminés avant {h}', { h: h(p.ramassageAvant) }) })
    L.push({ texte: tf('Heure limite de livraison : {h}', { h: h(p.heureLimite) }) })
    L.push({ texte: tf('{km} km · {d}', { km: String(p.distanceKm).replace('.', ','), d: duree(p.dureeMin) }) })
    L.push({ texte: t('Arrêts dans l’ordre imposé'), taille: 12, espace: 10 })
    for (const a of p.arrets) L.push({ texte: `${a.ordre}. ${titreArret(a, t, tf)} · ${t(nomArret(a))} · ${tf('{n} colis', { n: a.colis })}` })
    L.push({ texte: t('Colis'), taille: 12, espace: 10 })
    p.colisDetail.forEach((c, i) => {
      const m = [c.fragile ? t('Fragile') : null, c.payableAuRetrait ? t('Payable au retrait') : null].filter(Boolean).join(', ')
      L.push({ texte: `${tf('Colis {n}', { n: i + 1 })} · ${tf('arrêt {n}', { n: c.arret })} · ${c.classe} · ${c.etiquette ?? t('étiquette posée au ramassage')}${c.valeurDeclaree !== null ? ' · ' + F(c.valeurDeclaree) + ' F' : ''}${m ? ' · ' + m : ''}` })
    })
    L.push({ texte: tf('Kit : {k}', { k: p.kit.map((k) => `${k.nombre} ${k.format}`).join(' · ') }), espace: 8 })
    L.push({ texte: t('Le vendeur donne son code de remise seulement au livreur affiché chez lui ; une photo à chaque changement de main.'), espace: 8 })
    L.push({ texte: tf('Édité le {d} à {h} par {u}', { d: jour(n), h: h(n), u: s.utilisateur ? `${s.utilisateur.prenom} ${s.utilisateur.nom}` : '' }), taille: 8, espace: 10 })
    exporterPdf(`bon-de-prise-${p.id}.pdf`, L)
  }
}

/** Corps du détail (entB_detail) : itinéraire et colis à gauche ; rémunération, délais, avant ou après l'acceptation à droite. */
function Detail({ p, tic }: { p: DetailPaquet; tic: number }) {
  const { t, tf } = usePreferences()
  const seuils = useSeuils()
  const h = useHeure()
  const duree = useDuree()
  const montants = useMontantsVisibles()
  const ent = useSession().entreprise
  const dispo = p.statut === 'publie'
  const fond = useDonnees(() => source.carte.fond())
  const zones = useDonnees(() => source.paquets.disponibles())
  const el = useDonnees(() => (['publie', 'accepte'].includes(p.statut) ? source.affectation.eligibles(p.id) : Promise.resolve(null)), [p.id, p.statut])
  const caps = zones.donnees?.capacites ?? []
  const capa = caps.find((c) => c.zone === p.zone)
  const libre = capa ? Math.max(0, capa.capacite - capa.acceptes) : null
  const mrg = marge(p.heureLimite, tic + p.dureeMin * 60_000)
  const mentions = (c: DetailPaquet['colisDetail'][number]) =>
    c.payableAuRetrait || c.fragile ? (
      <span className="lv-chips">
        {c.payableAuRetrait && (
          <Pill ton="or" sm icone="smartphone">
            {t('Payable au retrait')}
          </Pill>
        )}
        {c.fragile && (
          <Pill ton="amber" sm icone="triangle-alert">
            {t('Fragile')}
          </Pill>
        )}
      </span>
    ) : (
      <span className="c4">—</span>
    )
  const arretDe = (n: number) => p.arrets.find((a) => a.ordre === n)
  type Ligne = DetailPaquet['colisDetail'][number] & { i: number }
  const lignesColis: Ligne[] = p.colisDetail.map((c, i) => ({ ...c, i: i + 1 }))
  const cols: Colonne<Ligne>[] = [
    {
      k: 'n',
      t: t('Colis'),
      main: true,
      rendu: (c) => (
        <>
          <b>{tf('Colis {n}', { n: c.i })}</b>
          {c.etiquette ? <div className="t2 mono">{c.etiquette}</div> : <div className="t2">{t('étiquette posée au ramassage')}</div>}
        </>
      ),
    },
    {
      k: 'a',
      t: t('Arrêt'),
      rendu: (c) => {
        const a = arretDe(c.arret)
        return (
          <>
            <span className="c3">{c.arret} · </span>
            {a ? titreArret(a, t, tf) : '—'}
          </>
        )
      },
    },
    { k: 'cl', t: t('Classe'), rendu: (c) => <Cls c={c.classe} /> },
    { k: 'v', t: t('Valeur déclarée'), cls: 'r', rendu: (c) => <b>{c.valeurDeclaree !== null ? <Montant n={c.valeurDeclaree} /> : '—'}</b> },
    { k: 'm', t: t('Mention'), rendu: mentions },
  ]
  const kit = p.kit.map((k) => `${k.nombre} ${k.format}`).join(' · ')
  const tarif = p.genre === 'tournee_relais' ? trancheTournee(p.colis.nombre) : null

  return (
    <div className="g g21">
      <div>
        <Panel titre={t('Itinéraire imposé')} icone="route" droite={<Pill ton="ink" sm icone="navigation">{tf('{km} km · {d}', { km: String(p.distanceKm).replace('.', ','), d: duree(p.dureeMin) })}</Pill>}>
          {fond.donnees ? <CartePaquet p={p} zones={fond.donnees.zones} lieux={fond.donnees.lieux} /> : !fond.erreur && <Chargement n={1} hauteur={260} />}
          <div className="mt12">
            {p.arrets.map((a) => {
              const cl = p.colisDetail.filter((c) => c.arret === a.ordre).map((c) => c.classe)
              const sous =
                a.type === 'relais'
                  ? [tf('{n} colis', { n: a.colis }), t(nomArret(a)), dispo ? t('scan unique du QR de mission') : null]
                  : a.type === 'domicile'
                    ? [t('Adresse, prénom et repère transmis au livreur seulement, au moment de la course · appel masqué')]
                    : [tf('{n} colis', { n: a.colis }) + (cl.length ? ' · ' + cl.join(' ') : ''), t(nomArret(a)), a.zone !== p.zone ? tf('ramassage hors zone ({z})', { z: a.zone }) : null]
              if (a.fait) sous.push(tf('fait à {h}', { h: h(a.fait) }))
              return (
                <div key={a.ordre} className={'stop' + (a.fait ? ' done' : '')}>
                  <span className="sn">{a.fait ? <Icone nom="check" taille={15} trait={3} /> : a.ordre}</span>
                  <span className="grow">
                    <span className="st" style={{ display: 'block' }}>
                      {titreArret(a, t, tf)} {a.c4 && <Pill ton="amber" sm>{t('Audit C4')}</Pill>}
                    </span>
                    <span className="ss" style={{ display: 'block' }}>
                      {sous.filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  {a.type === 'relais' ? (
                    <Pill ton="blue" sm>
                      {t('Dépôt')}
                    </Pill>
                  ) : (
                    <Pill ton={a.zone === p.zone ? 'acc' : 'ink'} sm>
                      {a.zone}
                    </Pill>
                  )}
                </div>
              )
            })}
          </div>
        </Panel>

        <Panel titre={t('Colis par arrêt')} icone="package" droite={<Pill ton="ink" sm icone="package-open">{tf('Kit : {k}', { k: kit })}</Pill>} style={{ marginTop: 16 }}>
          <div className="entb-t">
            <Table
              cols={cols}
              rows={lignesColis}
              cle={(c) => String(c.i)}
              legende={t('Colis par arrêt')}
              pied={
                <>
                  <span>
                    {tf('{n} colis', { n: p.colis.nombre })} · {classesEnTexte(p.colis.classes)}
                    {p.colis.valeurMax !== null && (
                      <>
                        {' · '}
                        {t('valeur maximale')} <b><Montant n={p.colis.valeurMax} /></b>
                      </>
                    )}
                    {p.colis.valeurTotale !== null && (
                      <>
                        {' · '}
                        {t('valeur totale')} <Montant n={p.colis.valeurTotale} />
                      </>
                    )}
                  </span>
                  {ent && (
                    <span>
                      <Icone nom="shield-check" taille={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> {tf('Plafond {p} : {m} par colis', { p: t(NOM_PALIER[ent.palier]), m: ent.plafond === null ? t('sans plafond') : F(ent.plafond) + ' F' })}
                    </span>
                  )}
                </>
              }
            />
          </div>
          {p.colisDetail.some((c) => c.payableAuRetrait) && <Hint icone="smartphone">{t('Zéro espèce : le client paie sur son propre téléphone par Mobile Money, le livreur n’encaisse jamais.')}</Hint>}
        </Panel>
      </div>

      <div>
        {montants && (
          <Panel titre={t('Rémunération ligne par ligne')} icone="banknote" style={{ marginBottom: 16 }}>
            <div className="entb-pay-l">
              {p.lignes.map((x, i) => (
                <div className="entb-pl" key={i}>
                  <div className="grow">
                    <b>
                      {t(NOM_LIGNE[x.code])}
                      {x.classe && ` · ${x.classe}`}
                    </b>
                    <span>
                      {x.quantite} × {F(x.unitaire)} F
                      {x.ecrete && <> · {t('écrêté au plafond de la classe')}</>}
                    </span>
                  </div>
                  <div className="v">
                    <Montant n={x.montant} />
                  </div>
                </div>
              ))}
              {p.genre === 'domicile' ? (
                <>
                  <div className="entb-pl">
                    <div className="grow">
                      <b>{t('Ramassage, contrôle, emballage, scellé')}</b>
                      <span>{t('chez le vendeur')}</span>
                    </div>
                    <div className="v c3">{t('inclus')}</div>
                  </div>
                  <div className="entb-pl">
                    <div className="grow">
                      <b>{t('Remise au client')}</b>
                      <span>{t('code de livraison et photo')}</span>
                    </div>
                    <div className="v c3">{t('inclus')}</div>
                  </div>
                </>
              ) : (
                <>
                  {p.relais && (
                    <div className="entb-pl">
                      <div className="grow">
                        <b>{tf('Dépôt au {r}', { r: p.relais })}</b>
                        <span>{t('relais dans la zone de destination : sans supplément')}</span>
                      </div>
                      <div className="v c3">{t('inclus')}</div>
                    </div>
                  )}
                  <div className="entb-pl">
                    <div className="grow">
                      <b>{t('Contrôle, emballage, scellé')}</b>
                      <span>{t('chez le vendeur, colis par colis')}</span>
                    </div>
                    <div className="v c3">{t('inclus')}</div>
                  </div>
                </>
              )}
              <div className="entb-pl tot">
                <div className="grow">
                  <b>{t('Total si les preuves sont complètes')}</b>
                  <span>{tarif !== null && p.remuneration === p.colis.nombre * tarif ? tf('{n} × {m} par colis · grille {v}', { n: p.colis.nombre, m: F(tarif) + ' F', v: p.versionGrille }) : tf('grille {v}', { v: p.versionGrille })}</span>
                </div>
                <div className="v">
                  <Montant n={p.remuneration ?? 0} />
                </div>
              </div>
            </div>
            <div className="row wrap mt10" style={{ gap: 6 }}>
              <Pill ton="ink" sm icone="lock">
                {t('Fixé par BelivaY')}
              </Pill>
              <Pill ton="red" sm icone="trending-down">
                {tf('Au-delà de {h} h : −{p} % sur le colis en retard', { h: REGLES.livraisonH, p: REGLES.minorationPct })}
              </Pill>
            </div>
            <Hint icone="lock">{t('Figé à l’acceptation : une révision de la grille ne change jamais ce paquet. Seul un retard sans incident d’un tiers validé est minoré, colis par colis. La livraison offerte au client ne change rien pour votre entreprise.')}</Hint>
          </Panel>
        )}

        <Panel titre={t('Délais et engagement')} icone="timer">
          {dispo && <KvE k={t('Répondre avant')} v={h(p.accepterAvant)} d={tf('publié à {h} · {m} min pour accepter', { h: h(p.publieLe), m: REGLES.acceptationMin })} />}
          <KvE
            k={t('Ramassages terminés avant')}
            v={dispo ? h(tic + REGLES.ramassageMin * 60_000) : p.ramassageAvant ? h(p.ramassageAvant) : '—'}
            d={dispo ? tf('si vous acceptez maintenant (acceptation + {d})', { d: duree(REGLES.ramassageMin) }) : p.accepteLe ? tf('acceptation à {h} + {d}', { h: h(p.accepteLe), d: duree(REGLES.ramassageMin) }) : undefined}
          />
          <KvE k={t('Heure limite de livraison')} v={h(p.heureLimite)} d={tf('moins de {h} h depuis le plus ancien « C’est prêt »', { h: REGLES.livraisonH })} />
          {!dispo && p.ramassageAvant && !p.ramasse && ['accepte', 'affecte'].includes(p.statut) && (
            <KvE k={t('Temps pour ramasser')} v={<Rebours fin={p.ramassageAvant} urgent={seuils.ramassage} critique={seuils.critique} />} d={t('ambre au seuil réglé dans Prix et délais')} />
          )}
          {['accepte', 'affecte', 'en_cours', 'incident'].includes(p.statut) && <KvE k={t('Temps pour livrer')} v={<Rebours fin={p.heureLimite} critique={seuils.critique} />} />}
          {p.genre === 'domicile' ? (
            <KvE k={t('Remise au client')} v={`${p.arrets[p.arrets.length - 1]?.zone ?? p.zone} · ${p.arrets[p.arrets.length - 1]?.quartier ?? ''}`} d={t('adresse transmise au livreur seulement')} />
          ) : (
            p.relais && <KvE k={t('Relais de dépôt')} v={p.relais} d={tf('dépôt au plus tard {d} avant sa fermeture', { d: duree(REGLES.depotAvantFermetureMin) })} />
          )}
          {['publie', 'accepte', 'affecte'].includes(p.statut) && (
            <KvE
              k={t('Marge restante')}
              v={<span className={tonMarge(mrg) === 'ok' ? 'cg' : tonMarge(mrg) === 'ambre' ? 'ca' : 'cr'}>{mrg < 0 ? tf('{d} de retard', { d: duree(-mrg) }) : duree(mrg)}</span>}
              d={tf('heure limite − maintenant − {d} de tournée', { d: duree(p.dureeMin) })}
            />
          )}
        </Panel>

        <Panel titre={dispo ? t('Avant d’accepter') : t('Après l’acceptation')} icone="clipboard-check" style={{ marginTop: 16 }}>
          <KvE
            k={tf('Capacité libre {z}', { z: p.zone })}
            v={libre !== null ? tf('{n} colis', { n: libre }) : '—'}
            d={libre === null ? undefined : dispo ? tf('{n} colis après acceptation', { n: Math.max(0, libre - p.colis.nombre) }) : p.accepteLe ? tf('{n} colis décomptés à {h}', { n: p.colis.nombre, h: h(p.accepteLe) }) : undefined}
          />
          {el.donnees && <KvE k={t('Livreurs éligibles maintenant')} v={String(el.donnees.eligibles.length)} d={el.donnees.eligibles.map((x) => x.nom).join(' · ') || undefined} />}
          <KvE k={t('Plus grande classe')} v={plusGrande(p.colis.classes)} d={t('véhicule compatible exigé à l’affectation')} />
          <KvE k={t('Kit nécessaire')} v={kit} d={t('pochettes BelivaY, étiquettes pré-imprimées')} />
          {dispo && el.donnees && el.donnees.eligibles.length === 0 && (
            <Note ton="amber" icone="user-x" className="mt10">
              {t('Aucun livreur ne peut faire ce paquet maintenant : n’acceptez pas sans livreur disponible.')}
            </Note>
          )}
        </Panel>
      </div>
    </div>
  )
}

export default function Paquet() {
  const { t, tf } = usePreferences()
  const [params] = useSearchParams()
  const id = params.get('id') ?? ''
  const naviguer = useNavigate()
  const h = useHeure()
  const duree = useDuree()
  const ent = useSession().entreprise
  const tic = useHorloge(2500)
  const n = useHorloge(1000)
  const rendre = useFeuille('rendre')
  const seuils = useSeuils()
  const bonDePrise = useBonDePrise()
  // Enveloppé : « null » (paquet introuvable) est une réponse, pas un chargement sans fin.
  const l = useDonnees(() => (id ? source.paquets.paquet(id) : Promise.resolve(null)).then((x) => ({ x })), [id, Math.floor(tic / 2500)])
  const caps = useDonnees(() => source.paquets.disponibles())
  const [occupe, setOccupe] = useState(false)
  const [retour, setRetour] = useState<{ ton: 'ok' | 'rouge' | 'ambre'; texte: string } | null>(null)
  const p = l.donnees?.x ?? null

  if (!id) return <Liste />

  const faire = async (g: 'accepter' | 'ignorer' | 'rendre') => {
    if (g === 'rendre') return rendre.ouvrir()
    setOccupe(true)
    setRetour(null)
    if (g === 'accepter') {
      const x = await geste('Accepter un paquet', (s) => s.paquets.accepter(id), id)
      if (x.etat === 'en_file') setRetour({ ton: 'ambre', texte: tf('Hors connexion : l’acceptation de {id} est gardée sur cet appareil et sera envoyée au retour du réseau.', { id }) })
      else {
        const r = x.r
        sonner(r.ok ? 'paquetAccepte' : 'erreur')
        setRetour(r.ok ? { ton: 'ok', texte: t('Paquet accepté : la rémunération et la ligne de grille sont figées. Affectez votre livreur.') } : { ton: 'rouge', texte: t(TEXTE_REFUS[r.raison]) })
        l.relire()
      }
    } else {
      await geste('Ignorer un paquet', (s) => s.paquets.ignorer(id), id)
      naviguer(chemin('paquets'))
    }
    setOccupe(false)
  }
  const confirmerRendre = async () => {
    setOccupe(true)
    const r = await source.paquets.rendre(id)
    setOccupe(false)
    if (r.ok) {
      naviguer(chemin('paquets'), { replace: true }) // l'adresse sans « sheet » ferme aussi la feuille
    } else setRetour({ ton: 'rouge', texte: r.raison === 'deja_ramasse' ? t('Un colis est déjà ramassé : le paquet ne se rend plus, seul un transfert à un autre livreur reste possible.') : t('Ce paquet ne peut plus être rendu.') })
  }

  const zn = p ? nomZone(caps.donnees?.capacites ?? [], p.zone) : ''
  const fini = p && ['pris', 'expire', 'ignore', 'rendu'].includes(p.statut)
  const sous = !p
    ? undefined
    : p.statut === 'publie'
      ? tf('{g} · {z} · publié à {h}', { g: t(NOM_GENRE[p.genre]), z: zn, h: h(p.publieLe) })
      : `${t(NOM_GENRE[p.genre])} · ${zn} · ${tf('{n} colis', { n: p.colis.nombre })} · ${t(NOM_STATUT[p.statut]).toLowerCase()}`
  const prio = p?.statut === 'publie' && !!p.prioriteJusqua && p.prioriteJusqua > n
  const tarif = p?.genre === 'tournee_relais' ? trancheTournee(p.colis.nombre) : null
  const affecterAvant = p?.accepteLe ? p.accepteLe + REGLES.nonAffecteMin * 60_000 : null
  const dernier = (quoi: string) => [...(p?.journal ?? [])].reverse().find((e) => e.quoi === quoi)

  // Héros (orange : à accepter ; vert : accepté, affecté ou en route).
  const heros = !p || fini ? null : p.statut === 'publie' ? (
    <div className="hero orange entb-hero">
      <div className="entb-hero-g">
        <div className="row" style={{ gap: 16, alignItems: 'center' }}>
          <Anneau debut={p.publieLe} fin={p.accepterAvant} taille={74} texte={false} />
          <div>
            <div className="hk">{tf('Temps pour accepter · avant {h}', { h: h(p.accepterAvant) })}</div>
            <Rebours fin={p.accepterAvant} urgent={seuils.acceptation} critique={seuils.critique} echu={t('Délai d’acceptation passé')} />
            <div className="ht">{p.remuneration !== null ? tf('{m} si les preuves sont complètes', { m: F(p.remuneration) + ' F' }) : t(NOM_GENRE[p.genre])}</div>
            <div className="hs">
              {p.remuneration === null
                ? t('Montant visible du propriétaire') + ' · '
                : tarif !== null && p.remuneration === p.colis.nombre * tarif
                  ? `${p.colis.nombre} × ${F(tarif)} F · `
                  : p.genre === 'domicile'
                    ? t('Course à domicile tout compris') + ' · '
                    : ''}
              {t('limite')} <b>{h(p.heureLimite)}</b> · {String(p.distanceKm).replace('.', ',')} km · {duree(p.dureeMin)}. {tf('La rémunération affichée ne baisse jamais après acceptation, sauf retard au-delà de {h} h.', { h: REGLES.livraisonH })}
            </div>
            {prio && (
              <div className="entb-prio">
                <Icone nom="crown" taille={15} /> {tf('Premier rang : priorité réservée à votre entreprise jusqu’à {h}', { h: h(p.prioriteJusqua!) })}
              </div>
            )}
          </div>
        </div>
        <div className="entb-hero-act">
          <button type="button" className="btn primary" disabled={occupe} onClick={() => faire('accepter')}>
            <Icone nom="check" taille={18} />
            {t('Accepter')}
          </button>
          <button type="button" className="btn secondary" disabled={occupe} onClick={() => faire('ignorer')}>
            <Icone nom="eye-off" taille={18} />
            {t('Ignorer')}
          </button>
          <div className="t12 c3" style={{ lineHeight: 1.4 }}>
            {tf('Ignorer masque le paquet pour {e}, sans effet sur le score.', { e: ent?.nom ?? t('votre entreprise') })}
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div className="hero acc entb-hero">
      <div className="entb-hero-g">
        <div className="row" style={{ gap: 16, alignItems: 'center' }}>
          {p.statut === 'accepte' && p.accepteLe && affecterAvant ? <Anneau debut={p.accepteLe} fin={affecterAvant} taille={74} texte={false} /> : <span className="lv-av g" aria-hidden="true">{p.livreur?.initiales ?? <Icone nom="package-check" taille={30} />}</span>}
          <div>
            <div className="hk">{p.accepteLe && p.acceptePar ? tf('Accepté à {h} par {u}', { h: h(p.accepteLe), u: p.acceptePar }) : t(NOM_STATUT[p.statut])}</div>
            {p.statut === 'accepte' && affecterAvant ? (
              <Rebours fin={affecterAvant} urgent={seuils.acceptation} critique={seuils.critique} avant={<>{t('à affecter :')} </>} echu={t('Alerte « non affecté » partie')} />
            ) : (
              ['affecte', 'en_cours', 'incident'].includes(p.statut) && <Rebours fin={p.heureLimite} critique={seuils.critique} avant={<>{t('à livrer :')} </>} />
            )}
            <div className="ht">{p.statut === 'accepte' ? t('Paquet à affecter') : p.livreur ? tf('{s} · {n}', { s: t(NOM_STATUT[p.statut]), n: p.livreur.nom }) : t(NOM_STATUT[p.statut])}</div>
            <div className="hs">
              {p.statut === 'accepte' && affecterAvant && (
                <>
                  {t('Désignez un livreur avant')} <b>{h(affecterAvant)}</b> {t(': au-delà, une alerte part au répartiteur.')}{' '}
                </>
              )}
              {t('Engagement : ramassages terminés avant')} <b>{p.ramassageAvant ? h(p.ramassageAvant) : '—'}</b>, {t('livraison avant')} <b>{h(p.heureLimite)}</b>
              {p.remuneration !== null && <> ; {tf('{m} garantis si les preuves sont complètes', { m: F(p.remuneration) + ' F' })}</>}. {t('Les boutiques et leur adresse de ramassage sont maintenant visibles.')}
            </div>
          </div>
        </div>
        <div className="entb-hero-act">
          {(p.statut === 'accepte' || p.statut === 'affecte') && (
            <>
              <Link className="btn primary" to={chemin('affectation', { id: p.id })}>
                <Icone nom="user-check" taille={18} />
                {p.statut === 'accepte' ? t('Affecter un livreur') : t('Voir l’affectation')}
              </Link>
              {!p.ramasse && (
                <button type="button" className="btn secondary" disabled={occupe} onClick={() => faire('rendre')}>
                  <Icone nom="undo-2" taille={18} />
                  {t('Rendre le paquet')}
                </button>
              )}
              <button type="button" className="btn ghost" onClick={() => bonDePrise(p)}>
                <Icone nom="file-down" taille={18} />
                {t('Bon de prise (PDF)')}
              </button>
              <div className="t12 c3" style={{ lineHeight: 1.4 }}>
                {p.ramasse ? t('Un colis est déjà ramassé : seul un transfert à un autre livreur reste possible.') : t('Rendre est possible avant tout ramassage ; cela compte comme « paquet rendu » pour votre Trust Score.')}
              </div>
            </>
          )}
          {['en_cours', 'incident', 'depose', 'clos'].includes(p.statut) && (
            <>
              <Link className="btn primary" to={chemin('missions', { mission: 'MS-' + p.id.slice(3) })}>
                <Icone nom="map" taille={18} />
                {t('Suivre la mission')}
              </Link>
              <Link className="btn secondary" to={chemin('preuves', { paquet: p.id })}>
                <Icone nom="camera" taille={18} />
                {t('Preuves')}
              </Link>
              <button type="button" className="btn ghost" onClick={() => bonDePrise(p)}>
                <Icone nom="file-down" taille={18} />
                {t('Bon de prise (PDF)')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )

  const journal = p && p.statut !== 'publie' ? p.journal.map((e) => `${t(NOM_EVENEMENT[e.quoi] ?? 'Événement')}${e.par ? ' ' + tf('par {u}', { u: e.par }) : ''} ${tf('à {h}', { h: h(e.le) })}`).join(' · ') : ''
  const pris = dernier('accepte')

  return (
    <Ecran route="paquet" titre={p ? p.id : t('Détail du paquet')}>
      <Px>
        <Tete route="paquet" titre={p ? p.id : t('Détail du paquet')} sous={sous} />
        {l.erreur && <BandeauErreur erreur={l.erreur} relire={l.relire} derniere={l.derniere} echecs={l.echecs} />}
        {retour && <Retour ton={retour.ton}>{retour.texte}</Retour>}
        {!l.donnees && !l.erreur ? (
          <Chargement n={3} hauteur={180} />
        ) : !p ? (
          <Panel>
            <VideP icone="package-search" t={t('Paquet introuvable')} s={t('Ce paquet n’existe pas ou n’est pas proposé à votre entreprise (zone non déclarée, palier).')}>
              <div className="btns" style={{ maxWidth: 320, margin: '14px auto 0' }}>
                <Link className="btn secondary" to={chemin('paquets')}>
                  <Icone nom="arrow-left" taille={18} />
                  {t('Retour à la liste')}
                </Link>
              </div>
            </VideP>
          </Panel>
        ) : fini ? (
          <div className="g g21">
            <div>
              <Panel>
                <VideP
                  icone={p.statut === 'pris' ? 'hand' : 'clock-alert'}
                  t={t(p.statut === 'pris' ? 'Déjà pris' : p.statut === 'expire' ? 'Délai d’acceptation passé' : NOM_STATUT[p.statut])}
                  s={
                    p.statut === 'pris'
                      ? pris?.par
                        ? tf('{u} a accepté ce paquet à {h} : le premier « Accepter » reçu par le serveur l’emporte. Votre clic n’a rien engagé de plus.', { u: pris.par, h: h(pris.le) })
                        : t('Une autre entreprise ou un collègue l’a accepté avant vous : le premier « Accepter » reçu par le serveur l’emporte. Rien n’est retenu à votre entreprise.')
                      : p.statut === 'expire'
                        ? t('Le paquet est proposé à l’entreprise suivante, puis à l’opérateur de zone BelivaY. Ne pas répondre n’est jamais sanctionné en argent.')
                        : t('Ce paquet n’est plus dans votre liste.')
                  }
                >
                  <div className="btns" style={{ maxWidth: 320, margin: '14px auto 0' }}>
                    <Link className="btn primary" to={chemin('paquets')}>
                      <Icone nom="arrow-left" taille={18} />
                      {t('Retour à la liste')}
                    </Link>
                  </div>
                </VideP>
              </Panel>
              <div className="panel entb-ghost" style={{ marginTop: 16 }}>
                <div className="row" style={{ justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div className="kick acc">
                      {t(NOM_GENRE[p.genre])} · {zn}
                    </div>
                    <div className="entb-id">{p.id}</div>
                    <div className="t13 c3 mt4">
                      {tf('{n} colis', { n: p.colis.nombre })} · {classesEnTexte(p.colis.classes)} · {tf('limite {h}', { h: h(p.heureLimite) })}
                    </div>
                  </div>
                  {p.remuneration !== null && (
                    <div className="right">
                      <div className="t12 c3 b7">{t('Rémunération')}</div>
                      <div className="b8 t19">
                        <Montant n={p.remuneration} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div>
              <Panel titre={t('Qui voit quoi')} icone="info">
                <Li icone="users" ton="acc" t={t('Pris par votre équipe')} s={t('Le nom de votre collègue s’affiche et le paquet passe dans vos missions « À affecter ».')} />
                <Li icone="eye-off" ton="ink" t={t('Pris par une autre entreprise')} s={t('Son nom n’est jamais affiché ; le paquet disparaît de votre liste en quelques secondes.')} />
                <Li icone="shield-check" ton="green" t={t('Aucune conséquence')} s={t('Ne pas obtenir un paquet n’a aucun effet sur votre score ni sur votre argent.')} />
              </Panel>
            </div>
          </div>
        ) : (
          <>
            {heros}
            <Detail p={p} tic={tic} />
            <BarrePouce>
              {p.statut === 'publie' ? (
                <>
                  <button type="button" className="btn primary" disabled={occupe} onClick={() => faire('accepter')}>
                    <Icone nom="check" taille={18} />
                    <span>{t('Accepter')}</span>
                  </button>
                  <button type="button" className="btn secondary" disabled={occupe} onClick={() => faire('ignorer')}>
                    <Icone nom="eye-off" taille={18} />
                    <span>{t('Ignorer')}</span>
                  </button>
                </>
              ) : p.statut === 'accepte' || p.statut === 'affecte' ? (
                <>
                  <Link className="btn primary" to={chemin('affectation', { id: p.id })}>
                    <Icone nom="user-check" taille={18} />
                    <span>{p.statut === 'accepte' ? t('Affecter un livreur') : t('Voir l’affectation')}</span>
                  </Link>
                  <button type="button" className="btn secondary" onClick={() => bonDePrise(p)} aria-label={t('Bon de prise (PDF)')}>
                    <Icone nom="file-down" taille={18} />
                    <span>{t('Bon de prise')}</span>
                  </button>
                </>
              ) : (
                <Link className="btn primary" to={chemin('missions', { mission: 'MS-' + p.id.slice(3) })}>
                  <Icone nom="map" taille={18} />
                  <span>{t('Suivre la mission')}</span>
                </Link>
              )}
            </BarrePouce>
            {p.statut === 'publie' ? (
              <Hint icone="eye-off">{t('Avant l’acceptation : ni nom de client, ni adresse de remise, ni nom de boutique ; seulement la zone, le relais de dépôt et le quartier des boutiques.')}</Hint>
            ) : (
              <Hint icone="history">
                {t('Journal :')} {journal}. {t('Chaque action du portail est signée par son auteur.')}
              </Hint>
            )}
            <Feuille ouverte={rendre.ouverte} fermer={rendre.fermer} titre={t('Rendre le paquet')}>
              <div className="grab"></div>
              <h2 className="lv-h2">{tf('Rendre {id} à BelivaY ?', { id: p.id })}</h2>
              <p className="lv-s">{tf('Le paquet repart en publication pour les autres entreprises et la capacité de la zone est rendue. Le rendu compte au Trust Score de votre entreprise ; plus de {n} rendus en {j} jours retirent la fenêtre de priorité {p} jours.', { n: REGLES.rendus.max, j: REGLES.rendus.surJours, p: REGLES.rendus.perteJours })}</p>
              <div className="btns mt16">
                <button type="button" className="btn danger" disabled={occupe} onClick={confirmerRendre}>
                  <Icone nom="undo-2" taille={18} />
                  {t('Rendre le paquet')}
                </button>
                <button type="button" className="btn ghost" onClick={rendre.fermer}>
                  {t('Garder le paquet')}
                </button>
              </div>
            </Feuille>
          </>
        )}
      </Px>
    </Ecran>
  )
}

/** Sans identifiant : la liste (METHODE.md § 3.5). */
function Liste() {
  const naviguer = useNavigate()
  const { t } = usePreferences()
  return (
    <Ecran route="paquet">
      <Px>
        <Panel>
          <VideP icone="boxes" t={t('Choisissez un paquet')} s={t('Le détail s’ouvre depuis la liste des paquets disponibles ou depuis une mission.')}>
            <div className="btns" style={{ maxWidth: 320, margin: '14px auto 0' }}>
              <button type="button" className="btn primary" onClick={() => naviguer(chemin('paquets'), { replace: true })}>
                {t('Paquets disponibles')}
              </button>
            </div>
          </VideP>
        </Panel>
      </Px>
    </Ecran>
  )
}
