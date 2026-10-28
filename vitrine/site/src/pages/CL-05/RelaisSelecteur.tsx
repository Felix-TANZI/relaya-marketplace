// Écran « Choisir le relais » (CL-05), forme d'origine du prototype rendue réelle (DP-54) : la feuille « Retirer à
// quel relais ? » posée sur la recherche (ses résultats pour ?q=, sinon son accueil) : les relais les plus proches
// de chez toi (distance, heure de fermeture du jour, produits retirables aujourd'hui depuis ce relais, jour de
// fermeture), le relais habituel en premier, « Voir les N relais ouverts » ; une recherche par quartier ou
// nom parcourt tous les relais ; un relais plein ou fermé aujourd'hui n'est pas proposé (leur nombre est dit) ; « Garder mon relais »
// referme. En choisir un en fait le
// relais habituel (prix livrés, distances et « retirable aujourd'hui » partent de lui) et ramène d'où l'on vient
// (?retour=…, sinon les résultats ou la recherche), où ce qui a été recalculé est rappelé ; le voile referme.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { fermeture, heureDe, norme, relaisFermeAujourdhui, retirableAujourdhui, useCatalogue } from '../../composants/Catalogue'
import { Ecran } from '../../composants/coque'
import { useDes } from '../../composants/ecran'
import { Feuille } from '../../composants/Feuille'
import { CartePosition, centreQuartier } from '../../composants/Position'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { source, type Relais } from '../../donnees/source'
import { usePreferences } from '../../preferences'
import { useMajSession } from '../../session'
import { AccueilRecherche, CorpsResultats, EnteteRecherche, resultatsDe } from './Commun'
import { FiltresEnPlace } from './PanneauFiltres'

const distance = (k: number) => (k < 1 ? `${Math.round(k * 1000)} m` : `${String(k).replace('.', ',')} km`)

export function RelaisSelecteur() {
  const { t, tf } = usePreferences()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const majSession = useMajSession()
  const [c, setC] = useCatalogue()
  const [cherche, setCherche] = useState('')
  const [tous, setTous] = useState(false)
  const pc = useDes('pc')
  const tabL = useDes('tab-l')
  const q = params.get('q') ?? ''
  const retour = params.get('retour')
  const versRetour = retour ? '/' + retour.replace(/^\//, '') : q ? chemin('recherche-resultats', { q }) : chemin('recherche')
  const fermer = () => naviguer(versRetour, { replace: true })
  const choisir = async (r: Relais) => {
    await source.choisirRelais(r.nom)
    majSession(await source.session())
    if (c) setC({ ...c, relais: r })
    naviguer(versRetour, { replace: true, state: { relaisChange: true } })
  }
  const proposes = c ? c.liste.filter((r) => !r.plein && !relaisFermeAujourdhui(r, c.maintenant)) : []
  const tries = [...proposes].sort((a, b) => Number(b.nom === c?.relais?.nom) - Number(a.nom === c?.relais?.nom) || a.km - b.km)
  const liste = cherche.trim() ? proposes.filter((r) => norme(r.nom + ' ' + r.quartier).includes(norme(cherche.trim()))) : tous ? tries : tries.slice(0, 4)
  const exclus = c ? c.liste.length - proposes.length : 0
  // Ce que chaque relais permet aujourd'hui : produits (de la recherche, sinon du catalogue) prêts avant sa fermeture.
  const base = c ? (q ? resultatsDe(c, new URLSearchParams({ q })).liste : c.tous) : []
  // Dès 1200 px (§ 5.3), une petite carte des relais au-dessus de la liste (Google ou OSM, comme ailleurs).
  const point = c?.relais ? centreQuartier(c.relais.quartier) : null
  const centre = point && c?.relais ? { ...point, libelle: t(c.relais.nom) } : null
  const carte =
    pc && c?.relais && centre ? (
      <CartePosition
        c={centre}
        nom={c.relais.nom}
        texte={tf('{r} · quartier {q}', { r: c.relais.nom, q: c.relais.quartier })}
        marqueurs={[
          { ...centre, nom: c.relais.nom, principal: true },
          ...tries
            .filter((r) => r.nom !== c.relais!.nom)
            .slice(0, 5)
            .flatMap((r) => {
              const x = centreQuartier(r.quartier)
              return x ? [{ lat: x.lat, lon: x.lon, nom: r.nom }] : []
            }),
        ]}
      />
    ) : null
  const retirables = (r: Relais) => (c ? base.filter((p) => retirableAujourdhui(p, { relais: r, boutiques: c.boutiques, maintenant: c.maintenant })).length : 0)
  return (
    <Ecran
      route="relais-selecteur"
      enteteSite
      largeur={q ? undefined : 'moyen'}
      gabarit={q ? 'catalogue' : undefined}
      gauche={q && tabL && c ? <FiltresEnPlace c={c} /> : undefined}
      etiquetteGauche={q && tabL && c ? 'Filtres' : undefined}
      avant={<EnteteRecherche c={c} q={q} />}
      fixes={
        <Feuille ouverte fermer={fermer} titre={t('Retirer à quel relais ?')} forme="tiroir">
          <div className="cl05-rs">
            <h3 className="t17 b8" style={{ margin: '0' }}>
              {t('Retirer à quel relais ?')}
            </h3>
            <p className="t13 c3" style={{ margin: '6px 0 0', lineHeight: '1.45' }}>
              {t('Distances, prix livrés et « retirable aujourd’hui » partent du relais choisi. Il devient ton relais habituel ; tes commandes en cours gardent le leur.')}
            </p>
            {carte && <div className="cl05-rs-carte">{carte}</div>}
            <div className="inp mt12">
              <Icone nom="search" taille={18} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
              <input type="search" aria-label={t('Chercher un relais')} placeholder={t('Quartier ou nom du relais')} value={cherche} onChange={(e) => setCherche(e.target.value)} />
            </div>
            {liste.map((r) => {
              const on = c?.relais?.nom === r.nom
              return (
                <a key={r.nom} href="#" className={'radio' + (on ? ' on' : '')} role="radio" aria-checked={on} onClick={(e) => (e.preventDefault(), choisir(r))}>
                  <span className="rd"></span>
                  <span className="grow">
                    <span className="rt" style={{ display: 'block' }}>
                      {t(r.nom)}
                      {on && (
                        <>
                          {' '}
                          <span className="pill or sm">{t('habituel')}</span>
                        </>
                      )}
                    </span>
                    <span className="rs" style={{ display: 'block' }}>
                      <span>{distance(r.km)}</span> <span>{t('de chez toi')}</span>
                      {t(' · ')}
                      <span>{tf('Ouvert jusqu’à {h}', { h: heureDe(fermeture(r.horaires)) })}</span>
                    </span>
                    <span className="rs" style={{ display: 'block' }}>
                      <span>{tf(retirables(r) > 1 ? '{n} produits retirables aujourd’hui' : '{n} produit retirable aujourd’hui', { n: retirables(r) })}</span>
                      {t(' · ')}
                      <span>{tf('fermé le {j}', { j: t(r.ferme) })}</span>
                    </span>
                  </span>
                </a>
              )
            })}
            {c && !liste.length && (
              <p className="t13 c3 mt12">
                {t('Aucun relais ne correspond.')}{' '}
                <a href="#" onClick={(e) => (e.preventDefault(), setCherche(''))}>
                  {t('Voir les relais proches')}
                </a>
              </p>
            )}
            {!cherche.trim() && tries.length > 4 && (
              <div className="btns mt12">
                <button type="button" className="btn ghost" onClick={() => setTous(!tous)}>
                  <span>{tous ? t('Voir seulement les plus proches') : tf('Voir les {n} relais ouverts', { n: tries.length })}</span>
                </button>
              </div>
            )}
            <div className="hint-l">
              <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
              <span>
                {t('Un relais plein ou fermé aujourd’hui n’est pas proposé.')}
                {exclus > 0 && tf(exclus > 1 ? ' {n} relais ne le sont pas en ce moment.' : ' {n} relais ne l’est pas en ce moment.', { n: exclus })}
              </span>
            </div>
            <div className="btns">
              <button type="button" className="btn secondary" onClick={fermer}>
                <span>{t('Garder mon relais')}</span>
              </button>
            </div>
          </div>
        </Feuille>
      }
    >
      {q ? c && <CorpsResultats c={c} /> : <AccueilRecherche c={c} colonnes />}
    </Ecran>
  )
}
