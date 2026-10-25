// LIV-P08 · La tournée — l'écran où le livreur passe sa journée (LIV-UIX-01). Ordre des arrêts calculé et IMPOSÉ par le
// système (« Ordre imposé — ne pas intervertir » : une seule action possible, celle de l'arrêt en cours, LIV-01-R002) ;
// avancement du paquet, colis sous garde et heure limite (ambre, puis rouge, LIV-P08R-06) ; un seul bouton principal
// selon l'étape (LIV-05-R08) ; « Itinéraire » et « Un problème ici ? » de même taille (LIV-UIX-03) ; tournée bloquée
// pendant la validation d'un incident ; tournée terminée ; hors connexion utilisable (paquet téléchargé, LIV-P08R-05) ;
// changements du serveur annoncés (LIV-02-R080). Jamais : contenu, valeur ou prix d'un colis (classe et plafond
// seulement, LIV-P08R-07), identité d'un client pour une tournée relais, numéro de téléphone.
// Liens : « Je suis arrivé » prévient le vendeur (« Votre livreur est là ») ou le relais ; l'entreprise voit la
// position pendant la mission (ENT-P13) ; le client « En route » suit l'heure estimée (DP-61).
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Glisser } from '@client/composants/Glisser'
import { FCFA } from '@client/i18n/format'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { Arret, ReglesLivreur, Tournee as TourneeT } from '../../donnees/domaines/tournee'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { heure } from '../../i18n/temps'
import { duree } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { NATURES, tonReste } from '../../composants/livraison/Avancement'
import { CarteZone } from '../../composants/livraison/CarteZone'
import { useArrivee } from '../../composants/livraison/arrivee'
import { AideDemo, BandeauModification, ICONE_ARRET, TYPES_ARRET, partPaquet } from '../../composants/livraison/contexte'
import { Chargement, Erreur, Message, distanceTexte, useAgir, usePositionMission, useRegles, useTournee } from '../../composants/livraison/outils'
import { Recherche, Rebours, normer } from '../../composants/livraison/enrichi'
import { BoutonProbleme, ContactArret } from '../../composants/livraison/terrain'
import { signal } from '../../composants/signaux'
import { Arret as ArretLigne, Barre, BarreAction, Chips, Foot, Hint, Lvp, Mini, Note, Pill, Sec, Stepper, Vide } from '../../composants/proto'

/** Bouton principal de l'arrêt en cours (LIV-05-R08) : une seule action, celle de l'étape. */
export function actionArret(a: Arret): { texte: string; route: string; icone: string } | null {
  if (a.phase !== 'sur_place') return null
  if (a.type === 'ramassage') {
    if (a.etape <= 1) return { texte: 'Récupérer les colis', route: 'arrivee', icone: 'package-check' }
    if (a.etape === 2) return { texte: 'Emballer et sceller', route: 'emballage', icone: 'package' }
    return { texte: 'Demander le code', route: 'code-remise', icone: 'key-round' }
  }
  if (a.type === 'relais') return { texte: 'Présenter le QR de dépôt', route: 'depot-relais', icone: 'scan' }
  if (a.type === 'collecte') return { texte: 'Collecter les départs', route: 'collecte', icone: 'package-plus' }
  if (a.type === 'domicile') return { texte: 'Continuer la remise', route: 'domicile', icone: 'house' }
  return { texte: 'Remettre les retours', route: 'retour-vendeur', icone: 'undo-2' }
}

const PILLS_ARRET: Partial<Record<Arret['type'], string>> = { relais: 'Dépôt', collecte: 'Collecte', domicile: 'Domicile', retour: 'Retour vendeur' }

/** Nom affiché d'un arrêt : à domicile, prénom et quartier seulement quand il est l'arrêt en cours (LIV-P08R-07). */
function nomArret(a: Arret, enCours: boolean, tf: (k: string, v: Record<string, string | number>) => string): string {
  if (a.type === 'domicile') return enCours ? tf('{prenom} · {quartier}', { prenom: a.nom, quartier: a.quartier }) : tf('Remise à domicile · {quartier}', { quartier: a.quartier })
  return a.nom + ' · ' + a.quartier
}

export type FiltreArrets = 'tous' | 'a_faire' | 'faits' | 'echecs'
const DANS_FILTRE: Record<FiltreArrets, (a: Arret) => boolean> = {
  tous: () => true,
  a_faire: (a) => a.etat === 'a_faire' || a.etat === 'en_cours',
  faits: (a) => a.etat === 'fait',
  echecs: (a) => a.etat === 'echec' || a.etat === 'dissocie',
}
/** Correspondant joignable pendant l'arrêt en cours (appel masqué, LIV-P33). */
const AVEC: Record<Arret['type'], string> = { ramassage: 'vendeur', retour: 'vendeur', relais: 'relais', collecte: 'relais', domicile: 'client' }

/** Texte cherché d'un arrêt : seulement ce qui est affiché (le prénom d'un client n'est cherchable qu'à son arrêt). */
const texteArret = (a: Arret, cour: boolean, t: (k: string) => string, tf: (k: string, v: Record<string, string | number>) => string) => normer([a.ordre, nomArret(a, cour, tf), t(TYPES_ARRET[a.type]), a.zone].join(' '))

/** « Arrêts suivants » : lignes C.stop du prototype, paquet par paquet, dans l'ordre imposé ; filtre et recherche (M5) ;
 * l'arrêt en cours se glisse : à droite l'itinéraire, à gauche l'appel masqué (M9 ; ses boutons restent sur la carte). */
function ListeArrets({ t: tour, filtre = 'tous', q = '', effacer }: { t: TourneeT; filtre?: FiltreArrets; q?: string; effacer?: () => void }) {
  const { t, tf, langue } = usePreferences()
  const aller = useNavigate()
  const { agir, occupe } = useAgir()
  const [ouvert, setOuvert] = useState<string | null>(null)
  const [refusOrdre, setRefusOrdre] = useState<{ id: string; texte: string } | null>(null)
  // « Faire cet arrêt d'abord » (embouteillage) : refusé si un dépôt précède son ramassage ; sinon l'ordre change et
  // l'entreprise est prévenue. Jamais de glisser-déposer, jamais sauter un arrêt.
  const dabord = async (a: Arret) => {
    const res = await agir('route', a.id, (o, s) => s.tournee.prioriser(a.id, o))
    if (!res) return
    if (res.r.ok) {
      signal('succes')
      setOuvert(null)
      setRefusOrdre(null)
      window.scrollTo(0, 0)
      return
    }
    signal('erreur')
    const avant = 'avant' in res.r && res.r.avant ? res.r.avant : ''
    setRefusOrdre({
      id: a.id,
      texte:
        res.r.raison === 'ramassage_avant'
          ? tf('Impossible : les colis sont encore chez {lieu}. Faites ce ramassage avant.', { lieu: avant })
          : res.r.raison === 'sur_place'
            ? tf('Impossible : vous êtes sur place chez {lieu}. Terminez cet arrêt d’abord.', { lieu: avant })
            : t('Cet arrêt ne peut plus changer de place.'),
    })
  }
  const cherche = normer(q)
  const garde = (a: Arret) => DANS_FILTRE[filtre](a) && (!cherche || texteArret(a, a.id === tour.enCours, t, tf).includes(cherche))
  if (!tour.arrets.some(garde))
    return (
      <div className="card tight lv-liste">
        <div className="lve-zero" role="status">
          <b>{t('Aucun arrêt ne correspond')}</b>
          {cherche ? tf('Rien pour « {q} » dans ce filtre.', { q: q.trim() }) : t('Aucun arrêt dans ce filtre pour l’instant.')}
          {effacer && (
            <div>
              <button type="button" className="btn secondary sm" onClick={effacer}>
                <span>{t('Voir tous les arrêts')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    )
  const ETATS: Record<Arret['etat'], string> = { a_faire: '', en_cours: 'en cours', fait: '', echec: 'en incident', dissocie: 'retiré par le système' }
  return (
    <div className="card tight lv-liste">
      {tour.paquets.filter((p) => tour.arrets.some((a) => a.paquetId === p.id && garde(a))).map((p, ip) => (
        <div key={p.id}>
          {tour.paquets.length > 1 && (
            <div className="kick acc lv-paquet-k" style={ip ? { borderTop: '1px solid var(--line)' } : undefined}>
              {p.id} · {t(NATURES[p.nature])} · {tf('avant {h}', { h: heure(p.heureLimite, langue) })}
            </div>
          )}
          {tour.arrets
            .filter((a) => a.paquetId === p.id && garde(a))
            .map((a) => {
              const cour = a.id === tour.enCours
              const bloque = tour.etat === 'bloquee' && tour.incident?.arretId === a.id
              const detail = bloque
                ? tf('Incident « {titre} » · en validation', { titre: t(tour.incident!.titre) })
                : a.etat === 'fait'
                  ? tf('{n} · fait', { n: a.colis === 1 ? t('1 colis') : tf('{n} colis', { n: a.colis }) })
                  : [t(TYPES_ARRET[a.type]), a.colis === 1 ? t('1 colis') : tf('{n} colis', { n: a.colis }), cour || ETATS[a.etat] ? t(ETATS[cour ? 'en_cours' : a.etat]) : tf('avant {h}', { h: heure(a.avant, langue) })].join(' · ')
              const ligne = (
                <ArretLigne
                  key={a.id}
                  n={a.ordre}
                  etat={a.etat === 'fait' ? 'done' : bloque || a.etat === 'echec' || a.etat === 'dissocie' ? 'bad' : cour ? 'cur' : ''}
                  titre={nomArret(a, cour, tf)}
                  sous={detail}
                  droite={PILLS_ARRET[a.type] ? <Pill ton={a.type === 'domicile' ? 'acc' : a.type === 'retour' ? 'violet' : 'blue'} sm>{t(PILLS_ARRET[a.type]!)}</Pill> : undefined}
                />
              )
              if (!cour && a.etat === 'a_faire' && tour.etat === 'en_cours')
                return (
                  <div key={a.id} className="lvt-ligne">
                    <div
                      role="button"
                      tabIndex={0}
                      aria-expanded={ouvert === a.id}
                      onClick={() => (setOuvert(ouvert === a.id ? null : a.id), setRefusOrdre(null))}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setOuvert(ouvert === a.id ? null : a.id))}
                    >
                      {ligne}
                    </div>
                    {ouvert === a.id && (
                      <>
                        <button type="button" className="lvt-dabord" disabled={occupe} onClick={() => void dabord(a)}>
                          <Icone nom="arrow-right" taille={16} />
                          {t('Faire cet arrêt d’abord')}
                        </button>
                        {refusOrdre?.id === a.id && (
                          <div className="lvt-refus" role="alert">
                            {refusOrdre.texte}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )
              if (!cour || tour.etat !== 'en_cours') return ligne
              return (
                <Glisser
                  key={a.id}
                  gauche={{ libelle: t('Itinéraire'), icone: 'navigation', ton: 'marque', son: 'notification', agir: () => aller(chemin('navigation', { a: a.id })) }}
                  droite={{ libelle: t('Appeler'), icone: 'phone', ton: 'marque', son: 'notification', agir: () => aller(chemin('appel', { avec: AVEC[a.type] })) }}
                >
                  {ligne}
                </Glisser>
              )
            })}
        </div>
      ))}
    </div>
  )
}

/** Carte d'avancement du paquet (prototype : kicker, étape, colis sur vous / colis du paquet, barre, heure limite). */
function Progression({ tour, enCours, maintenant, regles }: { tour: TourneeT; enCours: Arret | null; maintenant: number; regles: ReglesLivreur }) {
  const { t, tf, langue } = usePreferences()
  const paquet = tour.paquets.find((p) => p.id === (enCours?.paquetId ?? tour.paquetId)) ?? tour.paquets[0]
  if (!paquet) return null
  const fin = tour.etat === 'terminee'
  // Un seul compteur, numéroté comme la liste « Arrêts suivants » (ordre global de la tournée) ; les colis sur vous
  // sont dans la pastille de l'en-tête, pas ici (pas de doublon).
  const titre = fin || !enCours ? t('Tournée terminée') : tf('Arrêt {i} sur {n}', { i: enCours.ordre, n: tour.arrets.length })
  const reste = paquet.heureLimite - maintenant
  const ton = tonReste(reste, regles)
  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div className="row">
        <div className="grow">
          <div className="kick acc">
            {paquet.id} · {t(NATURES[paquet.nature])}
          </div>
          <div className="b8 t17 mt4">{titre}</div>
        </div>
      </div>
      <div className="mt10">
        <Barre pct={(fin ? 1 : partPaquet(tour, paquet.id)) * 100} label={t('Avancement du paquet')} />
      </div>
      {!fin && (
        <div className="row mt8 t12 c3" style={{ justifyContent: 'space-between', flexWrap: 'wrap', rowGap: 6 }}>
          <span>
            <Icone nom="clock" taille={13} /> {tf('Heure limite {h}', { h: heure(paquet.heureLimite, langue) })}
          </span>
          {ton === 'vert' ? (
            <span className="liva-cd lv-reste">
              <Icone nom="timer" taille={13} />
              {tf('reste {d}', { d: duree(reste, langue) })}
            </span>
          ) : (
            <Rebours fin={paquet.heureLimite} maintenant={maintenant} libelle={t('reste')} fini={t('dépassée')} ambreMs={regles.resteAmbreMin * 60000} rougeMs={regles.resteRougeMin * 60000} />
          )}
        </div>
      )}
    </div>
  )
}

export default function Tournee() {
  const { t, tf, langue } = usePreferences()
  const session = useSession()
  const { tournee: tour, charge, erreur, relire } = useTournee()
  const regles = useRegles()
  const { enLigne, maintenant } = useAgir()
  const actif = !!tour && tour.etat !== 'terminee'
  const gps = usePositionMission(actif)
  const enCours = tour?.arrets.find((a) => a.id === tour.enCours) ?? null
  const iti = useLecture(() => (enCours ? source.tournee.itineraire(enCours.id) : Promise.resolve(null)), [enCours?.id, enCours?.phase]).donnees
  const { arriver, refus, feuille } = useArrivee()
  const [filtre, setFiltre] = useState<FiltreArrets>('tous')
  const [q, setQ] = useState('')

  // Compte non actif : cadenas, et ce qui manque, chaque ligne vers l'activation (LIV-P02R-03) ; restreint : il travaille.
  if (session.etatCompte !== 'actif' && session.etatCompte !== 'restreint') return <TourneeVerrouillee etat={session.etatCompte} />

  const contenu = () => {
    if (erreur) return <Erreur relire={relire} />
    if (!charge || !regles) return <Chargement />
    if (!tour) return null
    const action = enCours ? actionArret(enCours) : null
    const proche = gps.pos && tour.arrets.some((a) => a.lieu && Math.abs(a.lieu.lat - gps.pos!.lat) < 0.2 && Math.abs(a.lieu.lng - gps.pos!.lng) < 0.2)
    const position = proche && gps.pos ? gps.pos : tour.position
    const surPlace = enCours?.phase === 'sur_place'
    const [icone, teinte] = enCours ? ICONE_ARRET[enCours.type] : ['route', 'acc' as const]
    const classes = enCours ? Object.keys(enCours.classes).join(' ') : ''
    const pied =
      !enLigne
        ? tf('Hors connexion · tournée téléchargée à {h}', { h: heure(tour.telechargeeA, langue) })
        : gps.etat === 'refus'
          ? t('Position refusée : autorisez-la pendant la tournée, elle prouve vos passages. Elle n’est jamais suivie hors mission.')
          : gps.etat === 'ok'
            ? tf('Connecté · position suivie pendant la tournée seulement · précision {m} m', { m: gps.pos?.precisionM ?? 0 })
            : t('Connecté · position suivie pendant la tournée seulement')

    if (tour.etat === 'terminee') {
      // Résumé simple : ce qui est fait, ce qui reste sur vous, et la seule suite (clôturer).
      const faits = tour.arrets.filter((a) => a.etat === 'fait').length
      const echecs = tour.arrets.filter((a) => a.etat === 'echec' || a.etat === 'dissocie').length
      return (
        <>
          <div className="hero acc" role="status">
            <div className="hk">{t('Tournée terminée')}</div>
            <div className="ht">{tour.colisSousGarde > 0 ? tf('Il reste {n} colis sur vous', { n: tour.colisSousGarde }) : t('Aucun colis sur vous.')}</div>
            <div className="hs">{t(tour.colisSousGarde > 0 ? 'Déposez-les au relais ou au point de stockage avant de clôturer votre journée.' : 'Votre journée peut être clôturée.')}</div>
            <div className="lvt-resume">
              <div>
                <b>
                  {faits}/{tour.arrets.length}
                </b>
                <span>{t('arrêts faits')}</span>
              </div>
              <div>
                <b>{tour.jour.colisRemis}</b>
                <span>{t('colis remis aujourd’hui')}</span>
              </div>
            </div>
          </div>
          {echecs > 0 && (
            <Note ton="ink" icone="info">
              {echecs === 1 ? t('1 arrêt retiré ou en échec : la suite est décidée par le système.') : tf('{n} arrêts retirés ou en échec : la suite est décidée par le système.', { n: echecs })}
            </Note>
          )}
          <div className="btns liva-col mt12">
            <Link className="btn secondary" to={chemin('aujourdhui')}>
              <Icone nom="house" taille={18} />
              <span>{t('Retour à Aujourd’hui')}</span>
            </Link>
          </div>
          <BarreAction aide={tour.colisSousGarde > 0 ? t('Déposez d’abord les colis encore sur vous.') : undefined}>
            <Link className="btn primary xl" to={chemin('cloture')}>
              <Icone nom="flag" taille={18} />
              <span>{t('Clôturer ma journée')}</span>
            </Link>
          </BarreAction>
        </>
      )
    }

    return (
      <>
        <BandeauModification tournee={tour} />
        <Progression tour={tour} enCours={enCours} maintenant={maintenant} regles={regles} />

        {tour.etat === 'bloquee' && tour.incident && (
          <>
            <div className="hero amber" role="status">
              <div className="hk" style={{ color: '#FFD98A' }}>
                {t('En attente de validation de l’incident')}
              </div>
              <div className="ht">{t(tour.incident.titre)}</div>
              <div className="hs">
                {tf('déclaré à {h}', { h: heure(tour.incident.depuis, langue) })} · {tf(tour.incident.consequence.texte, tour.incident.consequence.valeurs)}
              </div>
              <div className="btns liva-col">
                <Link className="btn white" to={chemin('appel', { avec: 'entreprise' })}>
                  <Icone nom="phone" taille={18} />
                  <span>{tf('Appeler {entreprise}', { entreprise: tour.entreprise })}</span>
                </Link>
                <Link className="btn white" to={chemin('incident', { id: tour.incident.id })}>
                  <Icone nom="file-clock" taille={18} />
                  <span>{t('Suivre l’incident')}</span>
                </Link>
              </div>
            </div>
            <Note ton="ink" icone="info">
              {t('Restez sur place, à l’abri. Aucun incident ne vous pénalise automatiquement.')}
            </Note>
            <AideDemo titre="l’entreprise">
              <button type="button" onClick={() => void source.tournee.simulerValidationIncident?.()}>
                {tf('{entreprise} valide l’incident', { entreprise: tour.entreprise })}
              </button>
            </AideDemo>
          </>
        )}

        {enCours && tour.etat === 'en_cours' && (
          <section className="card acc lv-arret" style={{ padding: 16 }} aria-labelledby="lv-arret-nom">
            <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', rowGap: 6 }}>
              <Pill ton="acc" sm icone="route">
                {t('Ordre calculé')}
              </Pill>
            </div>
            <div className="row mt12" style={{ alignItems: 'flex-start' }}>
              <span className="li" style={{ border: 0, padding: 0, minHeight: 0 }}>
                <span className={'ic ' + teinte} style={{ width: 46, height: 46 }}>
                  <Icone nom={icone} taille={22} />
                </span>
              </span>
              <div className="grow">
                <h2 id="lv-arret-nom" className="b8 t19" style={{ letterSpacing: '-.015em', margin: 0 }}>
                  {enCours.type === 'domicile' ? tf('{prenom} · {quartier}', { prenom: enCours.nom, quartier: enCours.quartier }) : enCours.nom}
                </h2>
                <div className="t13 c3 mt4">
                  {t(TYPES_ARRET[enCours.type])} · {enCours.zone}
                  {enCours.lieu?.repere ? ' · ' : ''}
                  {enCours.lieu?.repere && <q>{enCours.lieu.repere}</q>}
                </div>
              </div>
            </div>
            <div className="split3 mt12">
              <Mini k={t('Distance')} v={surPlace || !iti || iti.distanceM <= regles.ecartArriveeM ? t('Sur place') : distanceTexte(iti.distanceM, langue)} />
              <Mini k={t('Colis')} v={enCours.colis + (classes ? ' · ' + classes : '')} />
              {enCours.type === 'ramassage' && enCours.pretDepuis ? (
                <Mini k={t('Prêt depuis')} v={heure(enCours.pretDepuis, langue)} />
              ) : (
                <Mini k={t(surPlace ? 'Arrivé à' : 'Arrivée')} v={surPlace && enCours.arriveeA ? heure(enCours.arriveeA, langue) : iti ? tf('vers {h}', { h: heure(maintenant + iti.dureeS * 1000, langue) }) : '—'} />
              )}
            </div>
            {surPlace && enCours.type === 'ramassage' && (
              <div className="mt14">
                <Stepper etapes={['Arrivé', 'Contrôle · photo 1', 'Emballage · photo 2', 'Code du vendeur'].map((e) => t(e))} cur={enCours.etape} />
              </div>
            )}
            {surPlace ? (
              enCours.type === 'ramassage' && (
                <Hint icone="user-round-check">{tf('{vendeur} a reçu « Votre livreur est là » avec votre photo. Montrez votre écran.', { vendeur: enCours.nom })}</Hint>
              )
            ) : (
              <Hint icone="calendar-clock">
                {tf(enCours.type === 'ramassage' ? 'Créneau annoncé au vendeur : avant {h}' : 'Prévu avant {h}', { h: heure(enCours.avant, langue) })}
                {iti ? ' · ' + tf('arrivée prévue vers {h}', { h: heure(maintenant + iti.dureeS * 1000, langue) }) : ''}
              </Hint>
            )}
            {refus && (
              <div className="mt12">
                <Message ton="erreur">{refus}</Message>
              </div>
            )}
            <div className="btns">
              {!surPlace && (
                <Link className="btn acc-soft" to={chemin('navigation', { a: enCours.id })}>
                  <Icone nom="navigation" taille={18} />
                  <span>{t('Itinéraire')}</span>
                </Link>
              )}
              <BoutonProbleme arret={enCours} />
            </div>
            <ContactArret a={enCours} tournee={tour} />
          </section>
        )}

        {!surPlace && (
          <Link className="liva-mini-map" to={chemin('navigation', enCours ? { a: enCours.id } : undefined)} aria-label={t('Carte et itinéraire')}>
            <div className="mapbox">
              <CarteZone
                titre="Carte de la tournée : trajet, arrêts et votre position"
                trajet={tour.trajet}
                reperes={tour.arrets.filter((a) => a.lieu).map((a) => ({ id: a.id, ordre: a.ordre, type: a.type, etat: a.etat, courant: a.id === tour.enCours, lat: a.lieu!.lat, lng: a.lieu!.lng }))}
                position={position}
                zones={tour.zones}
                // Vignette : l'arrêt en cours et les deux suivants (avec la position), lisibles d'un coup d'œil.
                cadre={[
                  ...tour.arrets
                    .filter((a) => a.lieu && (a.etat === 'en_cours' || a.etat === 'a_faire'))
                    .slice(0, 3)
                    .map((a) => a.lieu!),
                  ...(position ? [position] : []),
                ]}
                hauteur={200}
                sansCommandes
              />
            </div>
            <span className="go glass">
              <Icone nom="navigation" taille={15} />
              {t('Carte et itinéraire')}
            </span>
          </Link>
        )}

        <Sec titre={t('Arrêts suivants')} droite={tour.arrets.length === 1 ? t('1 arrêt') : tf('{n} arrêts', { n: tour.arrets.length })} />
        <Chips
          scroll
          items={(
            [
              ['tous', 'Tous'],
              ['a_faire', 'À faire'],
              ['faits', 'Faits'],
              ['echecs', 'Échecs'],
            ] as const
          ).map(([f, l]) => ({ t: t(l), n: tour.arrets.filter(DANS_FILTRE[f]).length, on: filtre === f, onClick: () => setFiltre(f) }))}
        />
        <Recherche valeur={q} changer={setQ} libelle="Chercher un arrêt" exemple="Boutique, quartier, numéro d’arrêt" />
        <ListeArrets t={tour} filtre={filtre} q={q} effacer={() => (setFiltre('tous'), setQ(''))} />
        {enCours && tour.etat === 'en_cours' && <Hint icone="hand">{t('Touchez un arrêt à venir pour le faire d’abord (embouteillage, détour).')}</Hint>}

        <Note ton="acc" icone="eye-off">
          {tf('Classe et plafond seulement ({plafond} F par colis chez {entreprise}) : jamais le contenu, le prix ni la valeur d’un colis.', { plafond: FCFA(tour.plafondColis), entreprise: tour.entreprise })}{' '}
          {t('Le prénom et le quartier d’un client n’apparaissent qu’à domicile, jamais son numéro : les appels passent par BelivaY, numéro masqué.')}
        </Note>
        <Foot icone={enLigne ? (gps.etat === 'refus' ? 'locate' : 'wifi') : 'wifi-off'}>{pied}</Foot>
        {enCours && tour.etat === 'en_cours' && (
          <BarreAction>
            {action ? (
              <Link className="btn primary xl" to={chemin(action.route, { a: enCours.id })}>
                <Icone nom={action.icone} taille={20} />
                <span>{t(action.texte)}</span>
              </Link>
            ) : (
              <button type="button" className="btn primary xl" onClick={() => void arriver(enCours)}>
                <Icone nom="map-pin-check" taille={20} />
                <span>{t(enCours.type === 'relais' ? 'Je suis au relais' : 'Je suis arrivé')}</span>
              </button>
            )}
          </BarreAction>
        )}
      </>
    )
  }

  const contenuRendu = contenu()
  return (
    <Ecran proto route="tournee" fixes={feuille}>
      <Lvp>
        {contenuRendu ?? (
          <div className="card">
            <Vide icone="route" t={t('Aucune tournée pour l’instant')} s={t('Votre entreprise vous affecte les paquets : ils arrivent ici, dans l’ordre imposé, avec une notification.')}>
              <Link className="btn primary" to={chemin('aujourdhui')}>
                <span>{t('Retour à Aujourd’hui')}</span>
              </Link>
            </Vide>
          </div>
        )}
      </Lvp>
    </Ecran>
  )
}

const ETAPES_ACTIVATION: Record<string, string> = {
  charte: 'Accepter la charte',
  pieces_envoyees: 'Envoyer vos pièces',
  pieces_verifiees: 'Pièces en vérification',
  certification: 'Réussir la certification',
  approbation: 'Approbation de votre entreprise',
}

function TourneeVerrouillee({ etat }: { etat: string }) {
  const { t } = usePreferences()
  const activation = etat.startsWith('en_')
  const a = useLecture(() => (activation ? source.acces.activation() : Promise.resolve(null)), [activation]).donnees
  const manque = a?.etapes.filter((e) => e.etat !== 'fait') ?? []
  return (
    <Ecran proto route="tournee">
      <section className="l-carte l-vide">
        <div className="l-vide-i">
          <Icone nom="lock" taille={28} />
        </div>
        <h1>{t('Vous ne pouvez pas encore recevoir de missions')}</h1>
        <p>{activation ? t('Votre compte n’est pas encore actif : terminez votre activation. Aucune mission n’est visible avant.') : t('Votre compte ne reçoit pas de missions pour l’instant : voyez ce qui a été décidé et ce qui reste possible.')}</p>
        {manque.length > 0 && (
          <ul className="lv-manque">
            {manque.map((e) => (
              <li key={e.id}>
                <Link to={chemin('activation')}>
                  <Icone nom={e.etat === 'refuse' ? 'circle-x' : e.etat === 'en_cours' ? 'clock' : 'circle'} taille={18} />
                  <span className="l-grow">{t(ETAPES_ACTIVATION[e.id] ?? e.id)}</span>
                  <Icone nom="chevron-right" taille={18} />
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link className="l-btn l-principal lv-mt" to={chemin(activation ? 'activation' : 'compte')}>
          {t(activation ? 'Voir ce qui manque' : 'Voir l’état du compte')}
        </Link>
      </section>
    </Ecran>
  )
}
