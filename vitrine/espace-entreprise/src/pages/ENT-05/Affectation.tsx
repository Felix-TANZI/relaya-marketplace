// ENT-P12 — Affecter un livreur, repris sur le prototype (route('affectation') : bandeau « À affecter avant », tête
// datée, suggestion de l'assistant, tableau des livreurs éligibles, « Non proposés », « Ce que le portail vérifie »,
// « Le paquet » (entB_pqSummary), « Créneau annoncé aux vendeurs » ; aucun éligible : vide, livreurs écartés et leurs
// corrections, « BelivaY n'affecte jamais un livreur », « Alertes prévues » ; affecté : héros, ce que voient les
// vendeurs, journal, « Si … ne peut plus faire la tournée »). DP-63 : seule l'entreprise affecte ; BelivaY publie le
// paquet et n'affecte jamais. Éligibles : actif, certifié, disponible, zone, véhicule adapté à la plus grande classe
// (ENT-AFF-01), trajet et kit (manque en ambre, à prendre au stockage : O-09) ; suggestion de l'assistant
// qui n'affecte jamais seule (VAGUE n° 6 : zone, charge du jour, Trust Score puis distance, validée d'un clic, aussi
// depuis la liste des paquets à affecter) ; écartés et leurs raisons, avec la correction (ENT-02-R26) ; alerte « non
// affecté » après le délai du registre (ENT-P12R-01) ; créneau annoncé au vendeur (ENT-P12R-03) ; ce que voient les
// vendeurs (prénom, photo, entreprise, créneau : ENT-AFF-02) ; réaffectation libre avant le premier code de remise,
// transfert ensuite (DED-28) ; rendre le paquet avant ramassage. Propriétaire et répartiteur.
// Enrichi (ENRICHISSEMENTS.md, P12) : recherche d'un livreur (« / ») et tri distance, charge du jour ou Trust Score
// (?q=, ?tri=) — la suggestion de l'assistant reste une proposition, l'entreprise choisit (DP-63) ; « Affecter » montré
// tout de suite avec « Annuler » pendant 5 s, puis envoyé par geste() (gardé hors connexion) ; limites écrites là où
// elles écartent un livreur (une mission à la fois, certification valide, véhicule, kit) ; compte à rebours « à
// affecter avant » en direct ; « Affecter la suggestion » au pouce.
// DP-67 : un livreur en préavis de départ reçoit des paquets jusqu'à la veille du dernier jour (repère « paquets
// jusqu'au … »), puis il est écarté (raison « preavis ») ; une nouvelle photo pas validée dans le délai l'écarte aussi
// (raison « photo ») jusqu'à la validation.
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { sonner } from '../../composants/marque-sonore'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { source } from '../../donnees/source'
import type { Eligible, Eligibilite, RaisonNonEligible } from '../../donnees/domaines/affectation'
import type { DetailPaquet } from '../../donnees/domaines/paquets'
import { AucunResultat, Banniere, BarrePouce, type Colonne, Compte, correspond, Frise, Hint, Li, Limite, Note, Panel, Pill, Px, Qui, Rebours, Recherche, Table, Tete, type Ton, Tri, useAnnuler, Vide as VideP } from '../../composants/prototype'
import { usePreferences } from '../../preferences'
import { useHorloge, useSession } from '../../session'
import { Avatar, BandeauErreur, Chargement, Montant, NOM_GENRE, Retour, classesEnTexte, useDonnees, useDuree, useHeure, useJour, useSeuils } from './commun'
import { geste, useFile } from '../../donnees/fileHorsLigne'
import { PARAMETRES_FLOTTE } from '../../calculs/flotte'
import { JOUR, jourDe } from '../../calculs/temps'
import { KvE, NOM_EVENEMENT, titreArret } from './Paquet'
import { PORTEE, REGLES, creneau } from '../../calculs/livraison/regles-ecrans'

export const NOM_VEHICULE: Record<string, string> = { moto: 'Moto', tricycle: 'Tricycle', voiture: 'Voiture', camionnette: 'Camionnette', velo: 'Vélo' }
// Raison : texte, geste de correction, page de la correction, pastille courte, ton de la pastille.
const RAISON: Record<RaisonNonEligible, [string, string, string, string, Ton]> = {
  zone: ['Hors de ses zones', 'Rattacher le livreur à la zone', 'livreur', 'Zone', 'ink'],
  vehicule: ['Véhicule trop petit pour la plus grande classe', 'Voir les véhicules', 'vehicules', 'Véhicule', 'red'],
  certification: ['Certification absente ou expirée', 'Voir sa fiche', 'livreur', 'Certification', 'amber'],
  activation: ['En activation : pièces ou quiz à terminer', 'Voir sa fiche', 'livreur', 'Non activé', 'amber'],
  suspendu: ['Suspendu', 'Voir sa fiche', 'livreur', 'Suspendu', 'red'],
  en_mission: ['Déjà en mission ou affecté', 'Voir les missions', 'missions', 'Non disponible', 'ink'],
  preavis: ['Dernier jour de son préavis de départ : plus de nouveau paquet', 'Voir son départ', 'livreur', 'Fin de préavis', 'amber'],
  photo: ['Nouvelle photo pas validée dans le délai : plus de nouvelle mission', 'Voir ses pièces', 'pieces', 'Photo à valider', 'red'],
}
const lienRaison = (r: RaisonNonEligible, id: string) => (RAISON[r][2] === 'livreur' ? chemin('livreur', { id }) : r === 'photo' ? chemin('pieces', { id }) : chemin(RAISON[r][2]))

/** Critères de la suggestion (VAGUE n° 6) : zone, charge du jour, Trust Score, distance, en mots. */
function criteresSuggestion(x: Eligible, zonePrincipale: boolean, zone: string, t: (s: string) => string, tf: (s: string, v: Record<string, string | number>) => string): string[] {
  return [
    zonePrincipale ? tf('Zone {z}, sa zone principale', { z: zone }) : tf('Rattaché à {z}', { z: zone }),
    x.missionsDuJour === 0 ? t('Aucune mission aujourd’hui') : tf('{n} mission(s) aujourd’hui', { n: x.missionsDuJour }),
    x.trustScore === null ? t('Trust Score à venir') : tf('Trust Score {s}', { s: x.trustScore }),
    x.distanceKm === null ? t('Position inconnue') : tf('{km} km du premier arrêt', { km: String(x.distanceKm).replace('.', ',') }),
  ]
}

/** Sans identifiant : les paquets acceptés qui attendent un livreur, chacun avec sa suggestion, validée d'un clic. */
function AAffecter() {
  const { t, tf } = usePreferences()
  const h = useHeure()
  const l = useDonnees(() => source.missions.liste('a_affecter'))
  const ids = (l.donnees ?? []).map((m) => m.paquetId).join(',')
  const el = useDonnees(() => Promise.all((l.donnees ?? []).map((m) => source.affectation.eligibles(m.paquetId))), [ids])
  const { differer, vue: avisAnnuler } = useAnnuler()
  const [retour, setRetour] = useState<{ ton: 'ok' | 'rouge' | 'ambre'; texte: string } | null>(null)
  // Valider la suggestion d'un clic : montrée tout de suite avec « Annuler » (5 s), puis envoyée (gardée hors connexion).
  const valider = (paquetId: string, x: Eligible) => {
    setRetour(null)
    differer('affecter-' + paquetId, tf('Affectation de {n} à {id}', { n: x.nom, id: paquetId }), async () => {
      const g = await geste('Affecter un livreur', (s) => s.affectation.affecter(paquetId, x.id), paquetId)
      if (g.etat === 'en_file') return setRetour({ ton: 'ambre', texte: tf('Hors connexion : l’affectation de {n} est gardée sur cet appareil et sera envoyée au retour du réseau.', { n: x.nom }) })
      jouer(g.r.ok ? 'paiement' : 'erreur')
      setRetour(g.r.ok ? { ton: 'ok', texte: tf('{n} est affecté à {id}.', { n: x.nom, id: paquetId }) } : { ton: 'rouge', texte: t('Ce livreur n’est plus éligible : la liste est à jour.') })
      l.relire()
    })
  }
  return (
    <Ecran route="affectation">
      <Px>
        <Tete route="affectation" titre={t('Affecter un livreur')} />
        {l.erreur && <BandeauErreur erreur={l.erreur} relire={l.relire} derniere={l.derniere} echecs={l.echecs} />}
        {avisAnnuler}
        {retour && (
          <Note ton={retour.ton === 'ok' ? 'green' : retour.ton === 'rouge' ? 'red' : 'amber'} icone={retour.ton === 'ok' ? 'circle-check' : 'triangle-alert'}>
            {retour.texte}
          </Note>
        )}
        {!l.donnees ? (
          <Chargement n={2} />
        ) : l.donnees.length === 0 ? (
          <Panel>
            <VideP icone="user-check" t={t('Aucun paquet à affecter')} s={t('Chaque paquet accepté a son livreur. Les prochains apparaîtront ici dès leur acceptation.')}>
              <div className="btns" style={{ maxWidth: 320, margin: '14px auto 0' }}>
                <Link className="btn secondary" to={chemin('paquets')}>
                  {t('Paquets disponibles')}
                </Link>
              </div>
            </VideP>
          </Panel>
        ) : (
          <Panel titre={l.donnees.length === 1 ? t('1 paquet attend un livreur') : tf('{n} paquets attendent un livreur', { n: l.donnees.length })} icone="user-plus">
            {l.donnees.map((m, i) => {
              const e = el.donnees?.[i]
              const x = e?.eligibles.find((y) => y.id === e.suggere) ?? null
              return (
                <div key={m.id} className="entb-aaf" data-paquet={m.paquetId}>
                  <Li icone="user-plus" ton="or" to={chemin('affectation', { id: m.paquetId })} t={<span className="entb-pqid">{m.paquetId}</span>} s={`${t(NOM_GENRE[m.genre])} · ${m.zone} · ${tf('heure limite {h}', { h: h(m.heureLimite) })}`} />
                  {e && (
                    <div className="entb-aaf-s">
                      {x ? (
                        <>
                          <span className="grow">
                            <span className="t13 b7" style={{ display: 'block' }}>
                              <Icone nom="sparkles" taille={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> {tf('Suggéré : {n}', { n: x.nom })}
                              {e.suggestion && <span className="c3"> · {tf('{p}/100', { p: e.suggestion.note })}</span>}
                            </span>
                            <span className="t12 c3">{criteresSuggestion(x, !!e.suggestion?.zonePrincipale, m.zone, t, tf).join(' · ')}</span>
                          </span>
                          <button type="button" className="btn primary" onClick={() => valider(m.paquetId, x)} aria-label={tf('Valider : affecter {n} à {id}', { n: x.nom, id: m.paquetId })}>
                            <Icone nom="user-check" taille={16} />
                            {tf('Affecter {p}', { p: x.nom.split(' ')[0] })}
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="grow t12 c3">{t('Aucun livreur éligible pour l’instant : ouvrez le paquet pour voir les raisons.')}</span>
                          <Link className="btn secondary" to={chemin('affectation', { id: m.paquetId })} aria-label={tf('Choisir un livreur pour {id}', { id: m.paquetId })}>
                            <Icone nom="users" taille={16} />
                            {t('Choisir un livreur')}
                          </Link>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </Panel>
        )}
      </Px>
    </Ecran>
  )
}

/** entB_pqSummary : le paquet (identifiant, arrêts nommés, plus grande classe, kit, échéances). */
function LePaquet({ p, e }: { p: DetailPaquet; e: Eligibilite }) {
  const { t, tf } = usePreferences()
  const h = useHeure()
  const duree = useDuree()
  return (
    <Panel
      titre={t('Le paquet')}
      icone="package"
      droite={
        p.remuneration !== null ? (
          <Pill ton="or" sm>
            <Montant n={p.remuneration} />
          </Pill>
        ) : undefined
      }
    >
      <Link className="entb-id" style={{ marginTop: -4 }} to={chemin('paquet', { id: p.id })} aria-label={tf('Détail de {id}', { id: p.id })}>
        {p.id}
      </Link>
      <div className="t13 c3 mt4">
        {t(NOM_GENRE[p.genre])} · {p.zone} · {String(p.distanceKm).replace('.', ',')} km · {duree(p.dureeMin)}
      </div>
      <div className="mt10">
        {p.arrets.map((a) => {
          const cl = p.colisDetail.filter((c) => c.arret === a.ordre).map((c) => c.classe)
          return (
            <div key={a.ordre} className={'stop' + (a.fait ? ' done' : '')}>
              <span className="sn">{a.fait ? <Icone nom="check" taille={15} trait={3} /> : a.ordre}</span>
              <span className="grow">
                <span className="st" style={{ display: 'block' }}>
                  {titreArret(a, t, tf)}
                </span>
                <span className="ss" style={{ display: 'block' }}>
                  {a.type === 'relais' ? tf('dépôt des {n} colis', { n: a.colis }) : a.type === 'domicile' ? t('adresse transmise au livreur au moment de la course') : tf('{n} colis', { n: a.colis }) + (cl.length ? ' · ' + cl.join(' ') : '')}
                </span>
              </span>
            </div>
          )
        })}
      </div>
      <KvE k={t('Plus grande classe')} v={e.plusGrandeClasse} />
      <KvE k={t('Kit nécessaire')} v={p.kit.map((k) => `${k.nombre} ${k.format}`).join(' · ')} />
      <KvE k={t('Ramassages terminés avant')} v={p.ramassageAvant ? h(p.ramassageAvant) : '—'} d={p.accepteLe ? tf('acceptation à {h} + {d}', { h: h(p.accepteLe), d: duree(REGLES.ramassageMin) }) : undefined} />
      <KvE k={t('Heure limite')} v={h(p.heureLimite)} />
    </Panel>
  )
}

export default function Affectation() {
  const { t, tf } = usePreferences()
  const [params, setParams] = useSearchParams()
  const id = params.get('id') ?? ''
  const h = useHeure()
  const jour = useJour()
  const duree = useDuree()
  const tic = useHorloge(5000)
  const seuils = useSeuils()
  const file = useFile()
  const { differer, enCours: aEnvoyer, vue: avisAnnuler } = useAnnuler()
  const q = params.get('q') ?? ''
  const tri = (params.get('tri') ?? 'distance') as 'distance' | 'charge' | 'score'
  const poser = (k: string, v: string, defaut: string) =>
    setParams(
      (x) => {
        const n = new URLSearchParams(x)
        if (v && v !== defaut) n.set(k, v)
        else n.delete(k)
        return n
      },
      { replace: true },
    )
  const entreprise = useSession().entreprise
  const el = useDonnees(() => (id ? source.affectation.eligibles(id) : Promise.resolve(null)), [id])
  const pq = useDonnees(() => (id ? source.paquets.paquet(id) : Promise.resolve(null)), [id])
  // DP-66 : un livreur qui a demandé à partir finit ses missions pendant le préavis ; l'entreprise peut lui en confier
  // moins (repère « Départ demandé »). Une absence prévenue aujourd'hui est signalée de même.
  const demandes = useDonnees(() => (id ? Promise.all([source.livreurs.departs(), source.livreurs.absences()]).then(([d, a]) => ({ d, a })) : Promise.resolve(null)), [id])
  const [occupe, setOccupe] = useState(false)
  const [retour, setRetour] = useState<{ ton: 'ok' | 'rouge' | 'ambre'; texte: string } | null>(null)
  const [changer, setChanger] = useState(false)
  const vehiculeDe = (x: { vehicule: string }) => t(NOM_VEHICULE[x.vehicule] ?? x.vehicule)
  // Recherche et tri (choix d'affichage : la suggestion de l'assistant ne change pas, l'entreprise décide, DP-63).
  const rangs = useMemo(() => {
    const l = (el.donnees?.eligibles ?? []).filter((x) => correspond(q, x.nom, vehiculeDe(x), ...x.zones))
    const loin = (x: Eligible) => x.distanceKm ?? Infinity
    if (tri === 'charge') return [...l].sort((a, b) => a.missionsDuJour - b.missionsDuJour || loin(a) - loin(b))
    if (tri === 'score') return [...l].sort((a, b) => (b.trustScore ?? -1) - (a.trustScore ?? -1) || loin(a) - loin(b))
    return l // ordre du serveur : distance connue d'abord, la plus courte en tête
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [el.donnees, q, tri, t])
  if (!id) return <AAffecter />
  const e = el.donnees
  const p = pq.donnees
  const aujourdhui = jourDe(tic)
  const garde = file.gestes.some((g) => g.objet === id && (g.libelle === 'Affecter un livreur' || g.libelle === 'Réaffecter un livreur'))
  const attente = aEnvoyer.size > 0 || garde

  // Affecter : montré tout de suite avec « Annuler » (5 s), puis envoyé ; sans réseau, gardé et envoyé au retour.
  const affecter = (x: Eligible) => {
    setRetour(null)
    const re = changer
    differer('affecter-' + id, tf('Affectation de {n} à {id}', { n: x.nom, id }), async () => {
      setOccupe(true)
      const g = await geste(re ? 'Réaffecter un livreur' : 'Affecter un livreur', (s) => s.affectation.affecter(id, x.id), id)
      setOccupe(false)
      if (g.etat === 'en_file') {
        setRetour({ ton: 'ambre', texte: tf('Hors connexion : l’affectation de {n} est gardée sur cet appareil et sera envoyée au retour du réseau.', { n: x.nom }) })
        return
      }
      el.relire()
      apresEnvoi(g.r, x)
    })
  }
  const apresEnvoi = (r: Awaited<ReturnType<typeof source.affectation.affecter>>, x: Eligible) => {
    if (r.ok) {
      sonner('paquetAffecte')
      setChanger(false)
      pq.relire()
      setRetour({ ton: 'ok', texte: r.creneau ? tf('{n} est affecté. Les vendeurs voient son prénom, sa photo et le créneau {d} – {f}.', { n: x.nom, d: h(r.creneau.debut), f: h(r.creneau.fin) }) : tf('{n} est affecté. Le créneau sera annoncé aux vendeurs dès sa première position.', { n: x.nom }) })
    } else {
      jouer('erreur')
      setRetour({ ton: 'rouge', texte: t(r.raison === 'non_eligible' ? 'Ce livreur n’est plus éligible : la liste est à jour.' : r.raison === 'deja_ramasse' ? 'Un colis est déjà ramassé : passez par un transfert (rencontre et scan de chaque colis).' : 'Le paquet a changé d’état : la page est à jour.') })
    }
  }
  const erreur = el.erreur ?? pq.erreur
  const affecte = e?.affecte
  const enRetard = !!e?.affecterAvant && e.affecterAvant < tic && e.statut === 'accepte'
  const sugg = e?.eligibles.find((x) => x.id === e.suggere)
  const prevu = sugg ? creneau(tic, sugg.trajetMin) : null
  const montrerListe = !!e && (e.statut === 'accepte' || (e.statut === 'affecte' && changer && !e.ramasse))
  const vueAffecte = !!affecte && !montrerListe
  const libelle = t(changer ? 'Réaffecter' : 'Affecter')
  const boutiques = p ? p.arrets.filter((a) => a.type === 'boutique' && a.nom) : []
  const parAffectation = p ? [...p.journal].reverse().find((j) => j.quoi === 'affecte' || j.quoi === 'reaffecte')?.par : null
  const vehicule = vehiculeDe
  const titre = vueAffecte && e?.statut === 'affecte' ? t('Livreur affecté') : t('Affecter un livreur')
  const sous = p && e ? `${p.id} · ${t(NOM_GENRE[p.genre]).toLowerCase()} · ${tf('{n} colis', { n: p.colis.nombre })} · ${tf('plus grande classe {c}', { c: e.plusGrandeClasse })}${p.accepteLe && p.acceptePar ? ' · ' + tf('accepté à {h} par {u}', { h: h(p.accepteLe), u: p.acceptePar }) : ''}` : undefined

  const boutonAffecter = (x: Eligible, principal: boolean, texte?: string) => (
    <button type="button" className={'btn sm ' + (principal ? 'primary' : 'secondary')} disabled={occupe || attente} onClick={() => affecter(x)} aria-label={tf('{a} {n}', { a: libelle, n: x.nom })}>
      <Icone nom="user-check" taille={16} />
      {texte ?? libelle}
    </button>
  )
  const kitTexte = (x: Eligible) =>
    x.kitManque.length > 0 ? (
      <b className="ca">{tf('Kit : manque {k}, à prendre au point de stockage avant le départ', { k: x.kitManque.map((k) => `${k.nombre} ${k.format}`).join(', ') })}</b>
    ) : (
      <span className="cg b7">{t('Kit suffisant')}</span>
    )
  const distance = (x: Eligible) =>
    x.distanceKm === null ? (
      <>
        <b>{t('Position inconnue')}</b>
        <div className="t2">{t('position non suivie hors mission')}</div>
      </>
    ) : (
      <>
        <b>{tf('{km} km · {d}', { km: String(x.distanceKm).replace('.', ','), d: duree(x.trajetMin ?? 0) })}</b>
        <div className="t2">{t('jusqu’au premier arrêt')}</div>
      </>
    )

  const colsEl: Colonne<Eligible>[] = [
    {
      k: 'w',
      t: t('Livreur'),
      main: true,
      rendu: (x) => {
        const dep = demandes.donnees?.d.find((d) => d.livreur.id === x.id && d.etat === 'demande')
        const abs = demandes.donnees?.a.find((a) => a.livreur.id === x.id && a.du <= aujourdhui && a.au >= aujourdhui)
        return (
          <>
            <Qui nom={x.nom} av={x.initiales} sous={x.trustScore === null ? t('Trust Score à venir') : tf('Trust Score {s}', { s: x.trustScore })} />
            {dep && (
              <Pill ton="amber" sm icone="log-out" className="mt4">
                {tf('Départ demandé · paquets jusqu’au {d}', { d: jour(dep.affectationJusqua - 1) })}
              </Pill>
            )}
            {abs && (
              <Pill ton="amber" sm icone="calendar-x" className="mt4">
                {t('Absence prévenue aujourd’hui')}
              </Pill>
            )}
          </>
        )
      },
    },
    {
      k: 'v',
      t: t('Véhicule'),
      rendu: (x) => (
        <>
          <b>{vehicule(x)}</b>
          <div className="t2">{tf('porte jusqu’à {c}', { c: PORTEE[x.vehicule] ?? 'S' })}</div>
        </>
      ),
    },
    {
      k: 'c',
      t: t('Certification'),
      rendu: (x) => {
        const bientot = x.certifieJusqua !== null && x.certifieJusqua - tic <= PARAMETRES_FLOTTE.alerteCertificationJours * JOUR
        return (
          <>
            <Pill ton={bientot ? 'amber' : 'green'} sm icone={bientot ? 'badge-alert' : 'badge-check'}>
              {t(bientot ? 'Expire bientôt' : 'Valide')}
            </Pill>
            {x.certifieJusqua !== null && <div className="t2">{tf('jusqu’au {d}', { d: jour(x.certifieJusqua) })}</div>}
          </>
        )
      },
    },
    { k: 'h', t: t('Charge du jour'), rendu: (x) => <span className="nw">{tf('{n} mission(s)', { n: x.missionsDuJour })}</span> },
    { k: 'k', t: t('Kit'), rendu: kitTexte },
    { k: 'd', t: t('Au premier arrêt'), rendu: distance },
    { k: 'a', t: '', l: '', cls: 'r', rendu: (x) => boutonAffecter(x, x.id === e?.suggere) },
  ]
  type Ecarte = Eligibilite['nonEligibles'][number]
  const colsNon: Colonne<Ecarte>[] = [
    { k: 'w', t: t('Livreur'), main: true, rendu: (x) => <Qui nom={x.nom} av={x.initiales} /> },
    {
      k: 'r',
      t: t('Raison'),
      rendu: (x) => (
        <span className="lv-chips">
          {x.raisons.map((r) => (
            <Pill key={r} ton={RAISON[r][4]} sm>
              {t(RAISON[r][3])}
            </Pill>
          ))}
        </span>
      ),
    },
    { k: 'd', t: t('Détail'), rendu: (x) => x.raisons.map((r) => t(RAISON[r][0])).join(' · ') },
    {
      k: 'c',
      t: t('Corriger'),
      cls: 'r',
      rendu: (x) => (
        <Link className="btn secondary sm" to={lienRaison(x.raisons[0], x.id)}>
          {t(RAISON[x.raisons[0]][1])}
        </Link>
      ),
    },
  ]

  return (
    <Ecran route="affectation" titre={titre} retour={chemin('paquet', { id })}>
      <Px>
        {e?.statut === 'accepte' && e.affecterAvant && (
          <Banniere ton={enRetard ? 'red' : 'amber'} icone="timer" role="status">
            {enRetard ? (
              <b>{tf('Non affecté depuis l’acceptation à {a} : l’alerte est partie à {h}. Affectez maintenant.', { a: h(e.accepteLe!), h: h(e.affecterAvant) })}</b>
            ) : (
              <>
                <b>{tf('À affecter avant {h}.', { h: h(e.affecterAvant) })}</b> <Rebours fin={e.affecterAvant} urgent={seuils.acceptation} critique={seuils.critique} /> {tf('Au-delà de {m} minutes après l’acceptation, une alerte part au répartiteur. Seuls les livreurs qui peuvent réellement faire ce paquet sont proposés.', { m: REGLES.nonAffecteMin })}
              </>
            )}
          </Banniere>
        )}
        <Tete route="affectation" titre={titre} sous={sous} />
        {avisAnnuler}
        {erreur && <BandeauErreur erreur={erreur} relire={() => (el.relire(), pq.relire())} derniere={el.derniere} echecs={el.echecs} />}
        {retour && <Retour ton={retour.ton}>{retour.texte}</Retour>}
        {!e || !p ? (
          !erreur && <Chargement n={3} />
        ) : e.statut === 'autre' && !affecte ? (
          <Panel>
            <VideP icone="package-search" t={t('Rien à affecter sur ce paquet')} s={t('Il n’est pas accepté par votre entreprise, ou il a été rendu.')}>
              <div className="btns" style={{ maxWidth: 320, margin: '14px auto 0' }}>
                <Link className="btn secondary" to={chemin('paquet', { id })}>
                  {t('Voir le paquet')}
                </Link>
              </div>
            </VideP>
          </Panel>
        ) : vueAffecte && affecte ? (
          <>
            {/* Affecté : héros, ce que voient les vendeurs, journal ; le paquet, et si le livreur ne peut plus. */}
            <div className="hero acc entb-hero">
              <div className="entb-hero-g">
                <div className="row" style={{ gap: 16, alignItems: 'center' }}>
                  <span className="lv-av g" aria-hidden="true">
                    {affecte.initiales}
                  </span>
                  <div>
                    <div className="hk">{parAffectation ? tf('Affecté à {h} par {u}', { h: h(affecte.affecteLe), u: parAffectation }) : tf('Affecté à {h}', { h: h(affecte.affecteLe) })}</div>
                    <div className="ht">
                      {affecte.nom} · {vehicule(affecte)}
                    </div>
                    <div className="hs">
                      {affecte.creneau ? (
                        <>
                          {t('Créneau de passage annoncé aux vendeurs :')} <b>{`${h(affecte.creneau.debut)} – ${h(affecte.creneau.fin)}`}</b>.{' '}
                        </>
                      ) : (
                        <>{t('Le créneau sera annoncé aux vendeurs dès sa première position.')} </>
                      )}
                      {boutiques.length === 1 && tf('{b} voit dès maintenant son nom et sa photo ; la boutique ne donnera son code de remise qu’à lui.', { b: boutiques[0].nom! })}
                      {boutiques.length > 1 && tf('{b} voient dès maintenant son nom et sa photo ; ils ne donneront leur code de remise qu’à lui.', { b: boutiques.map((b) => b.nom).join(' ' + t('et') + ' ') })}
                      {e.ramasse && <> {t('Un colis est déjà sous sa garde.')}</>}
                    </div>
                  </div>
                </div>
                <div className="entb-hero-act">
                  <Link className="btn primary" to={chemin('missions', { mission: 'MS-' + id.slice(3) })}>
                    <Icone nom="map" taille={18} />
                    {t('Voir les missions')}
                  </Link>
                  {e.statut === 'affecte' && !e.ramasse ? (
                    <button type="button" className="btn secondary" onClick={() => setChanger(true)}>
                      <Icone nom="arrow-right-left" taille={18} />
                      {t('Réaffecter')}
                    </button>
                  ) : (
                    <Link className="btn secondary" to={chemin('incidents', { transfert: id })}>
                      <Icone nom="arrow-left-right" taille={18} />
                      {t('Transférer le paquet')}
                    </Link>
                  )}
                  <Link className="btn ghost" to={chemin('livreur', { id: affecte.id })}>
                    <Icone nom="user-round" taille={18} />
                    {tf('Fiche de {n}', { n: affecte.nom })}
                  </Link>
                  <div className="t12 c3" style={{ lineHeight: 1.4 }}>
                    {t('Réaffectation libre tant qu’aucun colis n’est ramassé ; ensuite, transfert avec scan.')}
                  </div>
                </div>
              </div>
            </div>
            <div className="g g21">
              <div>
                <Panel titre={t('Ce que voient les vendeurs, immédiatement')} icone="store">
                  {boutiques.length === 0 ? (
                    <p className="t13 c3">{t('Aucune boutique sur ce paquet : le client voit le prénom et la photo du livreur au moment de la remise.')}</p>
                  ) : (
                    <div className="entb-vend">
                      {boutiques.map((b) => (
                        <div className="entb-vcard" key={b.ordre}>
                          <div className="kick">{tf('Espace vendeur · {b}', { b: `${b.nom} · ${b.quartier}` })}</div>
                          <div className="row mt10" style={{ gap: 12, flexWrap: 'wrap' }}>
                            <Avatar initiales={affecte.initiales} />
                            <div className="grow">
                              <div className="b8 t15">{tf('Votre livreur : {p}', { p: affecte.nom.split(' ')[0] })}</div>
                              <div className="t13 c3">
                                {entreprise?.nom ?? ''} · {vehicule(affecte)}
                              </div>
                            </div>
                            {affecte.creneau && (
                              <Pill ton="acc" sm icone="clock">
                                {`${h(affecte.creneau.debut)} – ${h(affecte.creneau.fin)}`}
                              </Pill>
                            )}
                          </div>
                          <div className="t12 c3 mt10">{tf('{n} colis à remettre · donnez votre code de remise seulement à la personne affichée', { n: b.colis })}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <Hint icone="key-round">{t('Le vendeur ne donne son code de remise qu’au livreur dont le nom et la photo s’affichent chez lui. Votre entreprise ne voit jamais ce code.')}</Hint>
                </Panel>
                <Panel titre={t('Journal du paquet')} icone="history" style={{ marginTop: 16 }}>
                  <Frise
                    items={[
                      ...p.journal.map((j) => ({ t: `${h(j.le)} · ${t(NOM_EVENEMENT[j.quoi] ?? 'Événement')}${j.par ? ' ' + tf('par {u}', { u: j.par }) : ''}`, st: 'done' as const })),
                      ...(!e.ramasse && boutiques[0]
                        ? [{ t: tf('Prochaine étape · arrivée chez {b}', { b: boutiques[0].nom! }), d: p.ramassageAvant ? tf('Le paquet passe « En cours » au premier ramassage validé ; ramassages terminés avant {h}', { h: h(p.ramassageAvant) }) : undefined, st: 'cur' as const }]
                        : []),
                    ]}
                  />
                </Panel>
              </div>
              <div>
                <LePaquet p={p} e={e} />
                <Panel titre={tf('Si {n} ne peut plus faire la tournée', { n: affecte.nom })} icone="info" style={{ marginTop: 16 }}>
                  <Li icone="arrow-right-left" ton="acc" t={t('Avant le premier ramassage')} s={t('Réaffectation libre ; les vendeurs voient le nouveau livreur, sa photo et le nouveau créneau ; l’ancien code est refusé.')} />
                  <Li icone="scan-line" ton="acc" t={t('Après un ramassage')} s={t('Transfert seulement : rencontre des deux livreurs et scan de chaque colis par le second.')} />
                  <Li icone="bell-ring" ton="or" t={tf('Ramassage non commencé {d} après l’acceptation', { d: duree(REGLES.ramassageMin) })} s={tf('Alerte à {e} et à l’opérateur de zone ; les vendeurs reçoivent le nouveau créneau.', { e: entreprise?.nom ?? t('votre entreprise') })} />
                </Panel>
              </div>
            </div>
          </>
        ) : e.eligibles.length === 0 ? (
          <>
            {/* Aucun livreur éligible : pourquoi, et comment corriger. */}
            <div className="g g21">
              <div>
                <Panel>
                  <VideP icone="user-x" t={t('Aucun livreur éligible pour ce paquet')} s={tf('{g} · {c}. Voici pourquoi chaque livreur est écarté : corrigez ce qui peut l’être, ou rendez le paquet avant tout ramassage.', { g: t(NOM_GENRE[p.genre]), c: classesEnTexte(p.colis.classes) })}>
                    <div className="btns" style={{ maxWidth: 520, margin: '14px auto 0' }}>
                      {!e.ramasse && (
                        <Link className="btn danger" to={chemin('paquet', { id })}>
                          <Icone nom="undo-2" taille={18} />
                          {t('Rendre le paquet')}
                        </Link>
                      )}
                      <Link className="btn secondary" to={chemin('zones')}>
                        <Icone nom="map-pinned" taille={18} />
                        {tf('Rattacher un livreur à {z}', { z: p.zone })}
                      </Link>
                    </div>
                  </VideP>
                </Panel>
                <Note ton="amber" icone="undo-2" className="mt16">
                  <b>{t('Rendre le paquet')}</b> {tf('est possible tant qu’aucun colis n’est ramassé. Il compte comme « paquet rendu » pour votre Trust Score ; plus de {n} paquets rendus sur {j} jours font perdre la fenêtre de priorité pendant {p} jours.', { n: REGLES.rendus.max, j: REGLES.rendus.surJours, p: REGLES.rendus.perteJours })}
                </Note>
                <Hint icone="rotate-ccw">{t('Un livreur qui ne peut pas faire son paquet avant le premier ramassage vous le rend depuis son application (panne, santé ou sécurité) : le paquet revient ici « À affecter », motif joint, sans effet sur son Trust Score. Après un ramassage, il déclare un incident et vous organisez le transfert, colis par colis.')}</Hint>
              </div>
              <div>
                <LePaquet p={p} e={e} />
              </div>
            </div>
            {e.nonEligibles.length > 0 && (
              <div className="entb-t" style={{ marginTop: 16 }}>
                <Table
                  cols={colsNon}
                  rows={e.nonEligibles}
                  cle={(x) => x.id}
                  legende={t('Livreurs écartés')}
                  outils={
                    <>
                      <span className="b8 t14">{tf('Livreurs écartés ({n})', { n: e.nonEligibles.length })}</span>
                      <span className="sp"></span>
                      <span className="lock">
                        <Icone nom="bike" taille={15} /> {t('Raisons : zone, véhicule, certification, activation, disponibilité')}
                      </span>
                    </>
                  }
                />
              </div>
            )}
            <div className="g g2">
              <Panel titre={t('BelivaY n’affecte jamais un livreur')} icone="info">
                <Li icone="ban" ton="ink" t={t('L’opérateur de zone ne choisit pas à votre place')} s={tf('Il peut vous appeler ; seul un utilisateur de {e} appuie sur « Affecter ».', { e: entreprise?.nom ?? t('votre entreprise') })} />
                <Li icone="user-plus" ton="acc" t={t('Corriger, puis affecter')} s={t('Dès que la raison est levée (zone rattachée, véhicule remis en service, activation terminée), le livreur réapparaît dans la liste des éligibles.')} />
              </Panel>
              <Panel titre={t('Alertes prévues')} icone="bell">
                {e.affecterAvant && <Li icone="bell-ring" ton="or" t={tf('{h} · alerte au répartiteur', { h: h(e.affecterAvant) })} s={tf('{m} minutes après l’acceptation si le paquet n’est toujours pas affecté', { m: REGLES.nonAffecteMin })} />}
                {p.ramassageAvant && <Li icone="siren" ton="red" t={tf('{h} · ramassage non commencé', { h: h(p.ramassageAvant) })} s={tf('Alerte à {e} et à l’opérateur de zone ; le vendeur est prévenu du nouveau créneau', { e: entreprise?.nom ?? t('votre entreprise') })} />}
              </Panel>
            </div>
          </>
        ) : (
          <>
            {/* Suggestion de l'assistant (jamais d'affectation seule), livreurs éligibles. */}
            {sugg && (
              <Panel className="entb-sugp">
                <div className="entb-sug">
                  <div className="row" style={{ gap: 14, alignItems: 'center' }}>
                    <span className="lv-av m" aria-hidden="true">
                      {sugg.initiales}
                    </span>
                    <div className="grow">
                      <div className="row wrap" style={{ gap: 8 }}>
                        <Pill ton="acc" sm icone="sparkles">
                          {t('Suggestion de l’assistant')}
                        </Pill>
                        <Pill ton="green" sm dot>
                          {t('Zone, charge et Trust Score')}
                        </Pill>
                        {e.suggestion && (
                          <Pill ton="ink" sm>
                            {tf('{p}/100', { p: e.suggestion.note })}
                          </Pill>
                        )}
                      </div>
                      <div className="b8 t19 mt6">{sugg.nom}</div>
                      <div className="t13 c3">{[vehicule(sugg), ...criteresSuggestion(sugg, !!e.suggestion?.zonePrincipale, p?.zone ?? '', t, tf)].join(' · ')}</div>
                      {sugg.kitManque.length > 0 && <div className="t13 mt4">{kitTexte(sugg)}</div>}
                    </div>
                    <div className="entb-sug-a">{boutonAffecter(sugg, true, tf('Valider : {a} {p}', { a: libelle.toLowerCase(), p: sugg.nom.split(' ')[0] }))}</div>
                  </div>
                  <div className="t12 c3 mt10">
                    <Icone nom="info" taille={13} style={{ display: 'inline', verticalAlign: '-2px' }} /> {t('L’assistant pèse la zone, la charge du jour et le Trust Score, puis la distance au premier arrêt ; il propose, vous validez d’un clic : rien n’est affecté sans vous.')}
                    {prevu && (
                      <>
                        {' '}
                        {tf('Créneau annoncé aux vendeurs si vous affectez {n} :', { n: sugg.nom })} <b>{`${h(prevu.debut)} – ${h(prevu.fin)}`}</b>.
                      </>
                    )}
                  </div>
                </div>
              </Panel>
            )}
            <div className="panel lv-aff-outils" role="search" style={{ marginTop: 16 }}>
              <Recherche q={q} setQ={(v) => poser('q', v, '')} placeholder={t('Livreur, véhicule, zone…')} aria={t('Rechercher un livreur')} />
              <Tri
                tri={tri}
                setTri={(v) => poser('tri', v, 'distance')}
                options={[
                  { id: 'distance', t: 'Tri : distance au premier arrêt' },
                  { id: 'charge', t: 'Tri : charge du jour' },
                  { id: 'score', t: 'Tri : Trust Score' },
                ]}
              />
              <Compte n={rangs.length} total={e.eligibles.length} />
            </div>
            {tri !== 'distance' && sugg && <p className="t12 c3 mt8">{tf('Tri choisi par vous : la suggestion reste {n} (zone, charge et Trust Score). Vous affectez qui vous voulez parmi les éligibles.', { n: sugg.nom })}</p>}
            {rangs.length === 0 ? (
              <AucunResultat effacer={() => poser('q', '', '')} texte={t('Aucun livreur éligible ne correspond à cette recherche.')} />
            ) : (
            <div className="entb-t" style={{ marginTop: 16 }}>
              <Table
                cols={colsEl}
                rows={rangs}
                cle={(x) => x.id}
                ligneCls={(x) => (x.id === e.suggere ? 'sel' : undefined)}
                legende={t('Livreurs éligibles')}
                outils={
                  <>
                    <span className="b8 t14">{tf('Livreurs éligibles ({n})', { n: e.eligibles.length })}</span>
                    <span className="sp"></span>
                    <span className="lock">
                      <Icone nom="filter" taille={15} /> {tf('Actifs · certifiés · disponibles · {z} · véhicule pour {c}', { z: p.zone, c: e.plusGrandeClasse })}
                    </span>
                    {changer && (
                      <button type="button" className="btn ghost sm" onClick={() => setChanger(false)}>
                        {t('Garder le livreur actuel')}
                      </button>
                    )}
                  </>
                }
              />
            </div>
            )}
            <div className="lv-limites">
              <Limite icone="route" titre={t('Une mission à la fois')} texte={tf('{n} livreur(s) écarté(s) : déjà en mission ou affecté(s)', { n: e.nonEligibles.filter((x) => x.raisons.includes('en_mission')).length })} />
              <Limite
                icone="badge-check"
                titre={t('Certification valide exigée')}
                texte={[
                  tf('{n} livreur(s) écarté(s) : certification ou activation', { n: e.nonEligibles.filter((x) => x.raisons.includes('certification') || x.raisons.includes('activation')).length }),
                  ...e.eligibles.filter((x) => x.certifieJusqua !== null && x.certifieJusqua - tic <= PARAMETRES_FLOTTE.alerteCertificationJours * JOUR).map((x) => tf('{n} : expire le {d}', { n: x.nom, d: jour(x.certifieJusqua!) })),
                ].join(' · ')}
              />
              {e.nonEligibles.some((x) => x.raisons.includes('preavis') || x.raisons.includes('photo')) && (
                <Limite icone="log-out" titre={t('Préavis et nouvelle photo')} texte={tf('{n} livreur(s) écarté(s) : dernier jour d’un préavis de départ, ou nouvelle photo pas validée dans le délai', { n: e.nonEligibles.filter((x) => x.raisons.includes('preavis') || x.raisons.includes('photo')).length })} />
              )}
              <Limite icone="bike" titre={tf('Véhicule qui porte {c}', { c: e.plusGrandeClasse })} texte={tf('{n} livreur(s) écarté(s) : véhicule trop petit', { n: e.nonEligibles.filter((x) => x.raisons.includes('vehicule')).length })} />
              <Limite icone="package-open" titre={t('Kit : un manque n’écarte pas')} texte={tf('{n} livreur(s) à compléter au point de stockage avant le départ', { n: e.eligibles.filter((x) => x.kitManque.length > 0).length })} />
            </div>
            <div className="g g2">
              <div>
                <Panel titre={tf('Non proposés ({n})', { n: e.nonEligibles.length })} icone="user-x">
                  {e.nonEligibles.length === 0 ? (
                    <p className="t13 c3">{t('Tous vos livreurs actifs peuvent faire ce paquet.')}</p>
                  ) : (
                    e.nonEligibles.map((x) => (
                      <Li
                        key={x.id}
                        className="lv-non"
                        gauche={<Avatar initiales={x.initiales} />}
                        t={x.nom}
                        s={x.raisons.map((r) => t(RAISON[r][0])).join(' · ')}
                        droite={
                          <Pill ton={RAISON[x.raisons[0]][4]} sm>
                            {t(RAISON[x.raisons[0]][3])}
                          </Pill>
                        }
                        to={lienRaison(x.raisons[0], x.id)}
                        aria={`${x.nom} · ${x.raisons.map((r) => t(RAISON[r][0])).join(' · ')} · ${t(RAISON[x.raisons[0]][1])}`}
                      />
                    ))
                  )}
                </Panel>
                <Panel titre={t('Ce que le portail vérifie')} icone="shield-check" style={{ marginTop: 16 }}>
                  {['Actif, pièces valides, pas suspendu', 'Pas au dernier jour d’un préavis de départ ; nouvelle photo validée dans le délai demandé', 'Certifié (quiz réussi, certification en cours de validité)', 'Disponible : aucune autre mission en cours ou affectée', 'Rattaché à la zone du paquet', 'Véhicule qui porte la plus grande classe (moto jusqu’à L ; XL en tricycle ou voiture)'].map((x) => (
                    <div className="check" key={x}>
                      <span className="cbx on">
                        <Icone nom="check" taille={14} trait={3} />
                      </span>
                      <span className="grow">{t(x)}</span>
                    </div>
                  ))}
                  <div className="check">
                    <span className="cbx bad">
                      <Icone nom="x" taille={14} trait={3} />
                    </span>
                    <span className="grow">{t('Interdit : laisser un livreur sous-traiter la tournée à une autre personne.')}</span>
                  </div>
                </Panel>
              </div>
              <div>
                <LePaquet p={p} e={e} />
                <Panel titre={t('Créneau annoncé aux vendeurs')} icone="clock" style={{ marginTop: 16 }}>
                  {sugg && prevu && sugg.trajetMin !== null && (
                    <>
                      <KvE k={tf('Trajet de {n} au premier arrêt', { n: sugg.nom })} v={duree(sugg.trajetMin)} d={sugg.distanceKm !== null ? tf('{km} km', { km: String(sugg.distanceKm).replace('.', ',') }) : undefined} />
                      <KvE k={t('Préparation avant départ')} v={duree(REGLES.preparationMin)} d={t('paramètre du registre')} />
                      <KvE k={t('Début du créneau')} v={h(prevu.debut)} d={tf('maintenant + {m}, arrondi à la demi-heure suivante', { m: duree(sugg.trajetMin + REGLES.preparationMin) })} />
                      <KvE k={t('Créneau annoncé')} v={`${h(prevu.debut)} – ${h(prevu.fin)}`} d={boutiques.length ? tf('envoyé à {b}', { b: boutiques.map((b) => b.nom).join(' ' + t('et') + ' ') }) : undefined} />
                    </>
                  )}
                  <Hint icone="calculator">{t('Calculé à partir de la position du livreur et de l’ordre des arrêts. Pour un livreur sans position (hors mission), le créneau est calculé dès que son application envoie sa position, après l’affectation.')}</Hint>
                </Panel>
              </div>
            </div>
          </>
        )}
        {e && p && sugg && montrerListe && e.eligibles.length > 0 && (
          <BarrePouce>
            {boutonAffecter(sugg, true, tf('{a} {p}', { a: libelle, p: sugg.nom.split(' ')[0] }))}
          </BarrePouce>
        )}
      </Px>
    </Ecran>
  )
}
