// LIV-P09 · Navigation et carte — itinéraire vers l'ARRÊT EN COURS seulement : carte OpenStreetMap (tuiles, trajet
// précalculé, arrêts, position GPS du téléphone), durée · distance · heure d'arrivée (LIV-05-R15), point incertain
// (cercle, repère écrit tel quel, Plus Code), ouverture dans une autre application avec les seules coordonnées
// (geo:lat,lng, sans libellé ni nom), appel masqué et repère demandé par message à domicile, route coupée signalée
// (visible des livreurs de la zone pendant ROUTE-COUPEE-H, remontée en console), carte hors connexion.
// Domicile : la position de remise n'est servie que pendant l'arrêt en cours et disparaît après la remise
// (LIV-P09R-01) ; capture d'écran à bloquer côté téléphone (LIV-DON-04). Position suivie pendant la mission seulement.
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Feuille } from '@client/composants/Feuille'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { heure } from '../../i18n/temps'
import { usePreferences, type AppliNavigation } from '../../preferences'
import { useArrivee } from '../../composants/livraison/arrivee'
import { CarteZone } from '../../composants/livraison/CarteZone'
import { ICONE_ARRET, TYPES_ARRET, useArret } from '../../composants/livraison/contexte'
import { Chargement, Erreur, Message, RienIci, distanceTexte, minutesTexte, useAgir, usePositionMission } from '../../composants/livraison/outils'
import { Choix, Hint, HorsConnexion, Li, Lvp, Note, Pill, Sec } from '../../composants/proto'

const POSE_PAR = { vendeur: 'point posé par le vendeur', client: 'point posé par la cliente', relais: 'point posé par le relais', systeme: 'point calculé par BelivaY' }

/** Niveau de batterie (si le navigateur le dit) : sous 10 %, carte simplifiée (LIV-01-R050). */
function useBatterieFaible() {
  const [faible, setFaible] = useState(false)
  useEffect(() => {
    const n = navigator as unknown as { getBattery?: () => Promise<{ level: number; charging: boolean; addEventListener(e: string, f: () => void): void }> }
    let vivant = true
    n.getBattery?.().then(
      (b) => {
        const maj = () => vivant && setFaible(b.level < 0.1 && !b.charging)
        maj()
        b.addEventListener('levelchange', maj)
      },
      () => undefined,
    )
    return () => void (vivant = false)
  }, [])
  return faible
}

const MOTIFS_ROUTE = [
  ['Route inondée', 'Pluie forte, passage impossible à moto'],
  ['Travaux', 'Chaussée fermée'],
  ['Accident ou blocage', 'Circulation arrêtée'],
  ['Autre', 'Décrit en quelques mots'],
] as const

export default function Navigation() {
  const { t, tf, langue, appliNavigation } = usePreferences()
  const [params] = useSearchParams()
  const vueCartes = params.get('vue') === 'cartes'
  const { lecture, tournee, regles, arret } = useArret(['ramassage', 'relais', 'collecte', 'domicile', 'retour'])
  const { agir, occupe, enLigne, maintenant } = useAgir()
  const enCours = !!arret && arret.id === tournee?.enCours
  const gps = usePositionMission(enCours)
  const iti = useLecture(() => (arret && enCours ? source.tournee.itineraire(arret.id) : Promise.resolve(null)), [arret?.id, arret?.phase, enCours]).donnees
  const { arriver, refus, feuille } = useArrivee()
  const [route, setRoute] = useState(params.get('signaler') === '1') // « Un problème ? » → Route coupée
  const [motif, setMotif] = useState<number>(0)
  const [note, setNote] = useState('')
  const [signale, setSignale] = useState<number | null>(null)
  const [erreurRoute, setErreurRoute] = useState(false)
  const eco = useBatterieFaible()

  const envoyerRoute = async () => {
    // Le motif choisi précède ce que le livreur a écrit : la console et les livreurs de la zone lisent les deux.
    const texte = MOTIFS_ROUTE[motif][0] + ' — ' + note.trim()
    const res = await agir('route', 'route', (o, s) => s.tournee.signalerRoute(texte, o))
    if (res?.r.ok) {
      signal('succes')
      setSignale(res.r.jusqua)
      setRoute(false)
      setNote('')
    } else {
      signal('erreur')
      setErreurRoute(true)
    }
  }

  const titre = vueCartes ? t('Cartes hors connexion') : arret ? tf('Itinéraire · arrêt {n}', { n: arret.ordre }) : undefined
  const contenu = () => {
    if (lecture.erreur) return <Erreur relire={lecture.relire} />
    if (!lecture.charge || !regles) return <Chargement />
    if (vueCartes && tournee) return <CartesHorsLigne />
    if (!tournee || !arret || !enCours) return <RienIci titre="Aucun itinéraire à afficher" texte="L’itinéraire et la position d’un arrêt ne sont servis que pendant l’arrêt en cours. Revenez à la tournée." icone="navigation" />
    const l = arret.lieu
    const proche = gps.pos && l && Math.abs(l.lat - gps.pos.lat) < 0.2 && Math.abs(l.lng - gps.pos.lng) < 0.2
    const position = proche && gps.pos ? gps.pos : tournee.position
    const incertain = l && l.precisionM > regles.ecartArriveeM / 2
    const domicile = arret.type === 'domicile'
    const [icone, teinte] = ICONE_ARRET[arret.type]
    const paquet = tournee.paquets.find((p) => p.id === arret.paquetId)
    const zones = [...new Set(tournee.arrets.map((a) => a.zone))]
    const sous = [
      domicile ? t('Prénom et quartier seulement') : arret.quartier,
      arret.colis === 1 ? t('1 colis') : tf('{n} colis', { n: arret.colis }),
      ...(arret.type === 'ramassage' && arret.pretDepuis ? [tf('prêt depuis {h}', { h: heure(arret.pretDepuis, langue) })] : []),
    ].join(' · ')
    return (
      <>
        {!enLigne && (
          <HorsConnexion>
            <b>{t('Hors connexion')}</b> · {tf('La carte de la zone et le trajet calculé au départ restent disponibles (téléchargés à {h}).', { h: heure(tournee.telechargeeA, langue) })}
          </HorsConnexion>
        )}
        {eco && (
          <Note ton="amber" icone="battery-low" role="alert">
            {t('Batterie sous 10 % : carte simplifiée. Branchez la batterie externe.')}
          </Note>
        )}
        <div className="liva-mapwrap">
          <div className="mapbox">
            <CarteZone
              titre="Carte de l’itinéraire vers l’arrêt en cours"
              trajet={iti?.trajet ?? []}
              reperes={tournee.arrets.filter((a) => a.lieu).map((a) => ({ id: a.id, ordre: a.ordre, type: a.type, etat: a.etat, courant: a.id === arret.id, lat: a.lieu!.lat, lng: a.lieu!.lng }))}
              position={position}
              incertitude={incertain && l ? { lat: l.lat, lng: l.lng, rayonM: l.precisionM } : null}
              cadre={[...(iti?.trajet ?? []), ...(l ? [l] : []), position]}
              zones={tournee.zones}
              hauteur={eco ? 220 : 300}
            />
          </div>
          <div className="liva-eta glass lv-cartouche" role="status">
            <Icone nom={incertain ? 'locate' : 'navigation'} taille={16} style={{ color: incertain ? 'var(--amber)' : 'var(--acc-txt)' }} />
            {arret.phase === 'sur_place' ? (
              <span>{t('Vous êtes sur place')}</span>
            ) : incertain && l ? (
              <span>{tf('Position incertaine · rayon d’environ {m} m', { m: l.precisionM })}</span>
            ) : iti ? (
              <>
                <span>{tf('{duree} · {distance}', { duree: minutesTexte(iti.dureeS / 60, langue), distance: distanceTexte(iti.distanceM, langue) })}</span>
                <small>{tf('arrivée vers {h}', { h: heure(maintenant + iti.dureeS * 1000, langue) })}</small>
              </>
            ) : (
              <span>{t('Calcul de l’itinéraire…')}</span>
            )}
          </div>
        </div>
        {gps.pos && proche && (
            <p className="t12 c3 mt8" role="status">
              <Icone nom="locate" taille={13} /> {tf('Votre position à {h} · précision {m} m', { h: heure(gps.pos.a, langue), m: gps.pos.precisionM })}
              {!enLigne && ' · ' + t('carte gardée sur le téléphone')}
            </p>
          )}

        <div className="card">
          {domicile ? (
            <div className="kick acc">
              {t('Course domicile')} · {paquet?.id}
            </div>
          ) : (
            <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', rowGap: 6 }}>
              <span className="kick acc">{tf('Arrêt {i} sur {n} · {type}', { i: arret.ordre, n: tournee.arrets.length, type: t(TYPES_ARRET[arret.type]) })}</span>
              <Pill ton="ink" sm>
                {arret.zone}
              </Pill>
            </div>
          )}
          <div className="row mt8" style={{ gap: 12 }}>
            <span className="li" style={{ border: 0, padding: 0, minHeight: 0 }}>
              <span className={'ic ' + teinte} style={{ width: 46, height: 46 }}>
                <Icone nom={icone} taille={22} />
              </span>
            </span>
            <div className="grow">
              <h2 className="b8 t19" style={{ letterSpacing: '-.015em', margin: 0 }}>
                {domicile ? tf('{prenom} · {quartier}', { prenom: arret.nom, quartier: arret.quartier }) : arret.nom}
              </h2>
              <div className="t13 c3 mt4">{sous}</div>
            </div>
          </div>
          {l && (
            <>
              <div className="kick mt14">{t(l.posePar === 'client' ? 'Repère écrit par la cliente' : l.posePar === 'relais' ? 'Repère écrit par le relais' : 'Repère écrit par le vendeur')}</div>
              {l.repere ? <div className="liva-quote">{l.repere}</div> : <div className="t13 c3 mt8">{t('Aucun repère écrit')}</div>}
              <div className="row mt12" style={{ gap: 10, flexWrap: 'wrap' }}>
                {l.plusCode && (
                  <span className="liva-pc" translate="no">
                    <Icone nom="grid-3x3" taille={15} />
                    {l.plusCode}
                  </span>
                )}
                <span className="t12 c3">
                  {l.plusCode ? t('Plus Code') + ' · ' : ''}
                  {t(POSE_PAR[l.posePar])}
                </span>
              </div>
            </>
          )}
          {refus && (
            <div className="mt12">
              <Message ton="erreur">{refus}</Message>
            </div>
          )}
          <div className="btns liva-col mt14">
            {arret.phase !== 'sur_place' && (
              <button type="button" className="btn primary xl" onClick={() => void arriver(arret)}>
                <Icone nom="map-pin-check" taille={18} />
                <span>{t(arret.type === 'relais' ? 'Je suis au relais' : 'Je suis arrivé')}</span>
              </button>
            )}
            {domicile && (
              <>
                <Link className="btn acc" to={chemin('appel', { avec: 'client', a: arret.id })}>
                  <Icone nom="phone" taille={18} />
                  <span>{t('Appeler · numéro masqué')}</span>
                </Link>
                <Link className="btn acc-soft" to={chemin('messages')}>
                  <Icone nom="message-square-text" taille={18} />
                  <span>{t('Demander le repère')}</span>
                </Link>
              </>
            )}
            {l && (
              // Application choisie dans Réglages (CONF-LIV-NAV) ; seulement le point de l'arrêt, jamais un nom.
              <a className="btn secondary" href={lienItineraire(appliNavigation, l.lat, l.lng)} target={appliNavigation === 'google' || appliNavigation === 'waze' ? '_blank' : undefined} rel="noreferrer">
                <Icone nom="external-link" taille={18} />
                <span>{t(appliNavigation === 'google' ? 'Ouvrir dans Google Maps' : appliNavigation === 'waze' ? 'Ouvrir dans Waze' : 'Ouvrir dans une autre application')}</span>
              </a>
            )}
          </div>
        </div>
        {domicile && (
          <Note ton="amber" icone="eye-off">
            {tf('Cette position n’apparaît que pendant la course en cours et disparaît {n} minutes après la remise. Ne photographiez pas la maison en dehors de la photo de remise.', { n: regles.positionClienteEffaceeMin })}
          </Note>
        )}

        {signale && (
          <Note ton="green" icone="circle-check" role="status">
            {tf('Route coupée signalée : visible des livreurs de la zone jusqu’à {h}, remontée à la console.', { h: heure(signale, langue) })}
          </Note>
        )}
        <div className="card tight">
          <Li
            icone={enLigne ? 'download' : 'wifi-off'}
            ton="green"
            t={t(enLigne ? 'Carte hors connexion prête' : 'Navigation sans réseau')}
            s={tf('{zones} téléchargées à {h}', { zones: zones.join(', '), h: heure(tournee.telechargeeA, langue) })}
            vers={chemin('navigation', { a: arret.id, vue: 'cartes' })}
          />
          <Li icone="construction" ton="red" t={t('Signaler une route coupée')} s={tf('Pluie, travaux, accident : visible des livreurs de la zone pendant {n} heures', { n: regles.routeCoupeeH })} onClick={() => setRoute(true)} />
        </div>
        <Hint icone="shield-check">{t('Votre position n’est suivie que pendant une mission active ; ne la partagez jamais hors de l’application.')}</Hint>
      </>
    )
  }
  return (
    <Ecran proto
      route="navigation"
      titre={titre}
      retour={vueCartes ? chemin('navigation', arret ? { a: arret.id } : undefined) : undefined}
      fixes={
        <>
          {feuille}
          <Feuille ouverte={route} fermer={() => setRoute(false)} titre={t('Signaler une route coupée')}>
            <Lvp>
              <h2 className="b8 t19" style={{ margin: 0 }}>
                {t('Signaler une route coupée')}
              </h2>
              <div className="t13 c3 mt4">
                {arret ? tf('Position : ici, sur le trajet vers {lieu} · {h}', { lieu: arret.type === 'domicile' ? t('la remise à domicile') : arret.nom, h: heure(maintenant, langue) }) : tf('Position : ici · {h}', { h: heure(maintenant, langue) })}
              </div>
              <div role="radiogroup" aria-label={t('Motif')}>
                {MOTIFS_ROUTE.map(([m, d], i) => (
                  <Choix key={m} on={motif === i} titre={t(m)} sous={t(d)} onClick={() => setMotif(i)} />
                ))}
              </div>
              <label className="fld mt12" style={{ display: 'block' }}>
                <span className="b7 t13">{t('Ce que vous voyez')}</span>
                <textarea className="inp area" style={{ width: '100%', minHeight: 88, font: 'inherit', marginTop: 6 }} value={note} onChange={(e) => (setNote(e.target.value), setErreurRoute(false))} maxLength={400} />
                <span className={'t12 ' + (regles && note.trim().length >= regles.noteMin ? 'cg' : 'c3')}>{tf('{n} caractères sur {min} au moins', { n: note.trim().length, min: regles?.noteMin ?? 0 })}</span>
              </label>
              {erreurRoute && (
                <div className="mt12">
                  <Message ton="erreur">{t('Le signalement n’a pas pu partir. Écrivez au moins le nombre de caractères demandé.')}</Message>
                </div>
              )}
              <Hint icone="users">{tf('Le signalement reste visible des autres livreurs de la zone pendant {n} heures et remonte à la console. Le trajet est recalculé si besoin.', { n: regles?.routeCoupeeH ?? 0 })}</Hint>
              <div className="btns liva-col mt14">
                <button type="button" className="btn primary xl" disabled={occupe || !regles || note.trim().length < regles.noteMin} onClick={() => void envoyerRoute()}>
                  <Icone nom="send" taille={18} />
                  <span>{t('Envoyer le signalement')}</span>
                </button>
              </div>
            </Lvp>
          </Feuille>
        </>
      }
    >
      <Lvp>{contenu()}</Lvp>
    </Ecran>
  )
}

/** « Cartes hors connexion » (état du prototype navigation?s=cartes) : zones des arrêts du jour et itinéraire du
 * paquet, téléchargés avec la tournée (tuiles BelivaY, trajet OSRM calculé au départ). */
function CartesHorsLigne() {
  const { t, tf, langue } = usePreferences()
  const { tournee } = useArret(['ramassage', 'relais', 'collecte', 'domicile', 'retour'])
  if (!tournee) return null
  const zones = [...new Set(tournee.arrets.map((a) => a.zone))]
  const h = heure(tournee.telechargeeA, langue)
  return (
    <>
      <div className="liva-mapwrap">
        <div className="mapbox">
          <CarteZone
            titre="Zones téléchargées : arrêts de la journée"
            trajet={tournee.trajet}
            reperes={tournee.arrets.filter((a) => a.lieu).map((a) => ({ id: a.id, ordre: a.ordre, type: a.type, etat: a.etat, courant: a.id === tournee.enCours, lat: a.lieu!.lat, lng: a.lieu!.lng }))}
            position={null}
            zones={tournee.zones}
            hauteur={260}
            sansCommandes
          />
        </div>
      </div>
      <Sec titre={t('Cartes hors connexion')} />
      <div className="card tight">
        {zones.map((z) => (
          <Li key={z} icone="map" ton="green" t={z} s={tf('Téléchargée à {h} · à jour', { h })} droite={<Pill ton="green" sm icone="check">{t('Prête')}</Pill>} />
        ))}
        {tournee.paquets.map((p) => (
          <Li key={p.id} icone="route" ton="acc" t={tf('Itinéraire du paquet {id}', { id: p.id })} s={tf('Calculé au départ · téléchargé à {h}', { h })} droite={<Pill ton="green" sm icone="check">{t('Prêt')}</Pill>} />
        ))}
      </div>
      <Note ton="acc" icone="wifi-off">
        {t('Les tuiles des zones de vos paquets sont sur le téléphone : la carte, votre position et le trajet fonctionnent en mode avion.')}
      </Note>
      <Hint>{t('Tuiles hébergées par BelivaY ; mise à jour automatique au Wi-Fi ou à la première connexion du jour.')}</Hint>
    </>
  )
}

/** Lien d'itinéraire vers l'application choisie (CONF-LIV-NAV) : coordonnées seules. */
function lienItineraire(a: AppliNavigation, lat: number, lng: number): string {
  const p = `${lat.toFixed(6)},${lng.toFixed(6)}`
  if (a === 'google') return `https://www.google.com/maps/dir/?api=1&destination=${p}`
  if (a === 'waze') return `https://waze.com/ul?ll=${p}&navigate=yes`
  return `geo:${p}`
}
