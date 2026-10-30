// Ma zone sur la carte (page ajoutée à PR-10, ouverte depuis Paramètres et le Menu ; à tout membre : l'employé aussi
// doit savoir où sont les clients du relais et quand il ouvre). Trois blocs, dans le style des cartes du prototype :
// 1. la carte : les douze zones BelivaY de Yaoundé (logique-metier/livraison/zones-yaounde.geo.json, les mêmes que le
//    livreur et l'entreprise), la zone du relais en orange, la position du relais relevée à la visite d'ouverture
//    (annexe 3) ; fond OpenStreetMap en ligne (composants/CarteOsm.tsx), plan schématique hors connexion ; vue « Ma
//    zone » ou « Toute la ville » ; marqueur commun des six applications (@client/composants/carte) ;
// 2. la zone couverte : code, nom, superficie, quartiers ; les clients de ces quartiers se voient proposer le relais
//    (REF-D01.A02 : le choix du relais ne propose que les relais de la zone) ;
// 3. les horaires en vigueur jour par jour (pause comprise), l'état du moment (ouvert, fermé, pause) et les fermetures
//    à venir. Changer la position ou l'adresse demande une nouvelle visite (Aide) ; les horaires se demandent dans
//    « Capacité et horaires » (gérant, ARL-121).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { aHeure, jourDe, jourSemaine } from '../../calculs/temps'
import { ZONES_YAOUNDE, boite } from '../../calculs/zones'
import { MentionOsm, TuilesOsm, cadrer, useFondOsm } from '../../composants/CarteOsm'
import { CoucheMarqueurs, LegendeCarte } from '@client/composants/carte/Marqueurs'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { peutOuvrir } from '../../config/droits'
import { chemin } from '../../config/pages'
import type { FicheRelais } from '../../donnees/domaines/relais'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { creneau, heure, jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { Chargement, ErreurLecture } from './commun'
import '../../composants/carte-osm.css'

const JOURS_LONGS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const LARGEUR = 360

export default function Zone() {
  const lecture = useLecture(() => Promise.all([source.relais.relais(), source.fermeture.fermetures()]), [])
  if (!lecture.donnees) return <Ecran route="zone">{lecture.erreur ? <ErreurLecture relire={lecture.relire} /> : <Chargement />}</Ecran>
  const [f, fermetures] = lecture.donnees
  return <Contenu f={f} fermetures={fermetures.filter((x) => x.statut === 'prevue' || x.statut === 'en_cours')} />
}

function Contenu({ f, fermetures }: { f: FicheRelais; fermetures: Awaited<ReturnType<typeof source.fermeture.fermetures>> }) {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const [vue, setVue] = useState<'zone' | 'ville'>('zone')
  const fond = useFondOsm()
  const zone = ZONES_YAOUNDE.find((z) => z.code === f.zoneCode)
  const cadre = cadrer(boite(vue === 'zone' && zone ? [zone.polygone] : ZONES_YAOUNDE.map((z) => z.polygone), vue === 'zone' ? 0.12 : 0.03), LARGEUR)
  const chemins = (p: [number, number][]) => 'M' + p.map(([la, lo]) => cadre.point(la, lo).map((v) => v.toFixed(1)).join(',')).join('L') + 'Z'
  const pos = f.position
  const [rx, ry] = pos ? cadre.point(pos.lat, pos.lng) : [0, 0]
  const r = s.relais
  const aujourdhui = jourSemaine(jourDe(s.maintenant))
  const etat = !r ? '' : r.ouvertMaintenant ? tf('Ouvert maintenant · ferme à {h}', { h: heure(r.fermeA ?? '', langue) }) : r.rouvreLe ? tf('Fermé maintenant · rouvre {quand}', { quand: `${jourLong(r.rouvreLe, langue)}, ${heure(r.rouvreLe, langue)}` }) : t('Fermé maintenant')
  const osm = pos ? `https://www.openstreetmap.org/?mlat=${pos.lat}&mlon=${pos.lng}#map=17/${pos.lat}/${pos.lng}` : null

  return (
    <Ecran route="zone">
      <div className="p-0hxmj8 r-pile">
        <section className="p-yi6rkz" aria-labelledby="p10-carte">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu" id="p10-carte">
              {t('Ma zone sur la carte')}
            </h2>
          </div>
          <div className="p10-onglets" role="radiogroup" aria-label={t('Étendue de la carte')}>
            {(
              [
                ['zone', 'Ma zone'],
                ['ville', 'Toute la ville'],
              ] as const
            ).map(([v, l]) => (
              <button key={v} type="button" role="radio" aria-checked={vue === v} className="p10-onglet" onClick={() => setVue(v)}>
                {t(l)}
              </button>
            ))}
          </div>
          <div className="p10-carte">
            <svg viewBox={`0 0 ${cadre.l} ${cadre.h}`} role="img" aria-label={tf('Carte de Yaoundé : zone {code} {nom} et position du relais {relais}', { code: f.zoneCode, nom: zone?.nom ?? '', relais: f.nom })} data-vue={vue} data-fond={fond.etat}>
              <rect width={cadre.l} height={cadre.h} className="p10-carte-fond" />
              {fond.etat === 'osm' && <TuilesOsm cadre={cadre} echouer={fond.echouer} />}
              {ZONES_YAOUNDE.map((z) => (
                <path key={z.code} d={chemins(z.polygone)} className={z.code === f.zoneCode ? 'p10-zone-relais' : 'p10-zone-autre'} data-zone={z.code} />
              ))}
              {ZONES_YAOUNDE.map((z) => {
                if (vue === 'zone' && z.code !== f.zoneCode) return null
                const [x, y] = cadre.point(z.etiquette[0], z.etiquette[1])
                return (
                  <text key={z.code} x={x} y={vue === 'zone' ? y + 38 : y} className={z.code === f.zoneCode ? 'p10-zone-nom p10-zone-nom-relais' : 'p10-zone-nom'} textAnchor="middle">
                    {vue === 'ville' ? z.code : `${z.code} · ${z.nom}`}
                  </text>
                )
              })}
              {pos && (
                <g data-test="relais-pin">
                  <CoucheMarqueurs points={[{ id: 'relais', acteur: 'relais', x: rx, y: ry, nom: t('Votre relais'), etiquette: t('Votre relais'), classe: 'p10-relais-pin' }]} taille={34} />
                </g>
              )}
            </svg>
            <MentionOsm etat={fond.etat} demander={fond.demander} />
          </div>
          <LegendeCarte acteurs={['relais']} libelles={{ relais: 'Votre relais' }} autres={[['p10-leg-zone', 'Zone couverte']]} />
          <p className="p-81u2s6 p10-txt">{fond.etat === 'plan' ? t('Plan des zones BelivaY (fond de carte indisponible sans réseau).') : t('Fond de carte OpenStreetMap ; les limites des zones sont celles de BelivaY.')}</p>
        </section>

        <section className="p-yi6rkz" aria-labelledby="p10-zone">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu" id="p10-zone">
              {t('Zone couverte')}
            </h2>
          </div>
          {(
            [
              ['Zone', zone ? `${zone.code} · ${zone.nomComplet}` : f.zone],
              ['Superficie', zone ? tf('{n} km²', { n: zone.superficieKm2.toLocaleString(langue === 'fr' ? 'fr-FR' : 'en-GB') }) : '—'],
              ['Adresse', `${f.repere} · ${f.quartier}, ${f.ville}`],
              ['Position relevée à la visite', pos ? `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}` : t('Pas encore relevée : la visite d’ouverture la note.')],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="p-mqmvkk">
              <span className="p-ytl255">{t(k)}</span>
              <span className="p-2vq92h">{v}</span>
            </div>
          ))}
          {zone && (
            <>
              <div className="p-yscrc8">{t('QUARTIERS DE LA ZONE')}</div>
              <ul className="p10-quartiers">
                {zone.quartiers.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </>
          )}
          <p className="p-81u2s6 p10-txt">{t('Les clients de ces quartiers voient votre relais quand ils choisissent où retirer. La position et l’adresse ne changent qu’après une nouvelle visite de BelivaY : écrivez-lui depuis l’Aide.')}</p>
          {osm && (
            <a className="p-rbzobc" href={osm} target="_blank" rel="noreferrer">
              <Icone nom="map-pin" taille={18} className="p-emic6i" />
              {t('Ouvrir dans OpenStreetMap')}
            </a>
          )}
        </section>

        <section className="p-yi6rkz" aria-labelledby="p10-semaine">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu" id="p10-semaine">
              {t('Horaires en vigueur')}
            </h2>
            {r && <span className={r.ouvertMaintenant ? 'p-nax3x4' : 'r-pill r-ton-ambre'}>{'● ' + t(r.ouvertMaintenant ? 'Ouvert' : 'Fermé')}</span>}
          </div>
          {etat && (
            <div className="p-81u2s6" role="status">
              {etat}
            </div>
          )}
          <ul className="p10-semaine" aria-label={t('Horaires de la semaine')}>
            {f.horaires.semaine.map((p, k) => (
              <li key={k} className={k === aujourdhui ? 'p10-auj' : undefined} aria-current={k === aujourdhui ? 'date' : undefined}>
                <span>{t(JOURS_LONGS[k])}</span>
                <span>
                  {p.ferme ? t('Fermé') : creneau([p.ouverture!, p.fermeture!], langue)}
                  {!p.ferme && p.pause && <small>{' · ' + tf('pause {h}', { h: creneau([p.pause.de, p.pause.a], langue) })}</small>}
                </span>
              </li>
            ))}
          </ul>
          {fermetures.length > 0 && (
            <>
              <div className="p-yscrc8">{t('FERMETURES À VENIR')}</div>
              {fermetures.map((x) => (
                <div key={x.id} className="p-mqmvkk">
                  <span className="p-ytl255">{t(x.motif === 'conge' ? 'Congé' : x.type === 'imprevue_jour' ? 'Fermeture du jour' : 'Fermeture exceptionnelle')}</span>
                  <span className="p-2vq92h">{x.du === x.au ? jourLong(aHeure(x.du, 720), langue) : tf('du {du} au {au}', { du: jourLong(aHeure(x.du, 720), langue), au: jourLong(aHeure(x.au, 720), langue) })}</span>
                </div>
              ))}
            </>
          )}
          {f.horaires.demandeEnCours && <div className="p10-demande">{t('Nouveaux horaires demandés : ceux-ci restent en vigueur jusqu’à l’accord de BelivaY.')}</div>}
          {peutOuvrir(s.membre, 'capacite') ? (
            <Link to={chemin('capacite') + '#horaires'} className="p-rbzobc">
              <Icone nom="r-horloge" taille={18} className="p-emic6i" />
              {t('Demander un changement d’horaires')}
            </Link>
          ) : (
            <p className="p-81u2s6 p10-txt">{t('Les horaires se changent par le gérant, avec l’accord de BelivaY.')}</p>
          )}
        </section>
      </div>
    </Ecran>
  )
}
