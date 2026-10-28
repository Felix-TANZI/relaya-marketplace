// Promotions de la plateforme (onglet « Plateforme » des Promotions) : BelivaY lance, programme ou arrête une
// promotion financée par son budget de croissance (jamais déduite du net vendeur) : titre, remise (au plus la limite
// de générosité, ou livraison offerte), début (maintenant ou programmé), fin, cible (tout le catalogue, une catégorie,
// une zone, des vitrines). Direction : créer, lancer ; Service client : arrêter (contrôle). Chaque geste est motivé,
// journalisé et publié au site client et aux vendeurs (pont : promotion).
import { useState } from 'react'
import { DecisionMotivee } from '../../composants/DecisionMotivee'
import { Icone } from '../../composants/Icone'
import { Champ, Panel, Pill, Table, Vide, type Ton } from '../../composants/prototype'
import { JOUR, jourDe, yaounde } from '../../calculs/temps'
import type { CiblePromotion, DemandePromotion, EtatPromotion, PromotionPlateforme, VuePromotionsPlateforme } from '../../donnees/domaines/pilotage'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useHorloge } from '../../session'
import { useDates } from '../ADM-11/commun-s5'
import './surveiller.css'

const ETAT: Record<EtatPromotion, [string, Ton]> = { programmee: ['Programmée', 'blue'], en_cours: ['En cours', 'or'], terminee: ['Terminée', 'green'], arretee: ['Arrêtée', 'red'] }
const REFUS: Record<string, string> = {
  titre: 'Titre de 3 à 60 caractères.',
  dates: 'La fin doit suivre le début, et le début ne peut pas être passé.',
  remise: 'Remise hors limite de générosité.',
  cible: 'Choisissez une cible valable.',
  etat: 'La promotion n’est plus dans cet état.',
  inconnu: 'Promotion introuvable.',
}
const instant = (jour: string, heure: string) => {
  const [a, m, j] = jour.split('-').map(Number)
  const [h, mi] = heure.split(':').map(Number)
  return a && m && j ? yaounde(a, m, j, h || 0, mi || 0) : NaN
}

export function PromotionsPlateforme() {
  const { t, tf } = usePreferences()
  const l = useLecture(() => source.pilotage.promotionsPlateforme(), [])
  const v = l.donnees
  const [action, setAction] = useState<{ genre: 'lancer' | 'arreter'; p: PromotionPlateforme } | null>(null)
  if (!v) return null
  const actives = v.promotions.filter((p) => p.etat === 'en_cours' || p.etat === 'programmee').length
  return (
    <>
      <p className="t13 c3 mt16">{tf('{n} promotion(s) en cours ou programmée(s) · financées par BelivaY (budget de croissance), jamais déduites du net vendeur · remise au plus {r} %.', { n: actives, r: v.remiseMaxPct })}</p>
      {v.peutCreer && <Creation v={v} relire={l.relire} />}
      <Table
        className="mt16"
        legende={t('Promotions de la plateforme')}
        rows={v.promotions}
        cle={(p) => p.id}
        vide={<Vide icone="megaphone" t={t('Aucune promotion de la plateforme')} s={t('Les promotions lancées par BelivaY apparaissent ici.')} />}
        cols={[
          { k: 't', t: t('Promotion'), main: true, rendu: (p) => <><b>{p.titre}</b><div className="t2">{`${p.id} · ${t(p.cibleLibelle)}`}</div></> },
          { k: 'r', t: t('Remise'), rendu: (p) => (p.remise.genre === 'livraison' ? t('Livraison offerte') : `−${p.remise.pct} %`) },
          { k: 'p', t: t('Période'), hideM: true, rendu: (p) => <Periode p={p} /> },
          { k: 'e', t: t('État'), rendu: (p) => <Pill ton={ETAT[p.etat][1]} sm>{t(ETAT[p.etat][0])}</Pill> },
          {
            k: 'a',
            t: t('Gestes'),
            rendu: (p) => (
              <div className="sv-promo-actes">
                {p.etat === 'programmee' && v.peutCreer && (
                  <button type="button" className="btn secondary sm" onClick={() => setAction({ genre: 'lancer', p })}>
                    <Icone nom="play" taille={16} />
                    <span>{t('Lancer maintenant')}</span>
                  </button>
                )}
                {(p.etat === 'programmee' || p.etat === 'en_cours') && v.peutArreter && (
                  <button type="button" className="btn ghost sm" onClick={() => setAction({ genre: 'arreter', p })}>
                    <Icone nom="circle-stop" taille={16} />
                    <span>{t('Arrêter')}</span>
                  </button>
                )}
                {p.arret && <span className="t12 c3">{p.arret.motif}</span>}
              </div>
            ),
          },
        ]}
      />
      <DecisionMotivee
        ouverte={action?.genre === 'lancer'}
        fermer={() => setAction(null)}
        titre={tf('Lancer maintenant {id}', { id: action?.p.id ?? '' })}
        resume={t('Le début devient l’instant présent ; la fin ne change pas. Le site client et les vendeurs concernés la voient aussitôt.')}
        libelle="Lancer maintenant"
        icone="play"
        refus={(r) => t(REFUS[r] ?? 'La décision n’a pas pu être enregistrée.')}
        envoyer={async (m) => {
          const r = await source.pilotage.lancerPromotion(action!.p.id, m)
          l.relire()
          return r
        }}
      />
      <DecisionMotivee
        ouverte={action?.genre === 'arreter'}
        fermer={() => setAction(null)}
        titre={tf('Arrêter la promotion {id}', { id: action?.p.id ?? '' })}
        resume={t('Elle disparaît aussitôt du site ; les commandes déjà payées gardent leur prix. Le motif est journalisé.')}
        libelle="Arrêter la promotion"
        icone="circle-stop"
        danger
        refus={(r) => t(REFUS[r] ?? 'La décision n’a pas pu être enregistrée.')}
        envoyer={async (m) => {
          const r = await source.pilotage.arreterPromotion(action!.p.id, m)
          l.relire()
          return r
        }}
      />
    </>
  )
}

function Periode({ p }: { p: PromotionPlateforme }) {
  const d = useDates()
  return <span className="t13">{`${d.court(p.debut)} ${d.heure(p.debut)} → ${d.court(p.fin)} ${d.heure(p.fin)}`}</span>
}

function Creation({ v, relire }: { v: VuePromotionsPlateforme; relire: () => void }) {
  const { t, tf } = usePreferences()
  const n = useHorloge()
  const demain = jourDe(n + JOUR)
  const [titre, setTitre] = useState('')
  const [genreRemise, setGenreRemise] = useState<'pourcentage' | 'livraison'>('pourcentage')
  const [pct, setPct] = useState('10')
  const [quand, setQuand] = useState<'maintenant' | 'programmer'>('programmer')
  const [jourDebut, setJourDebut] = useState(demain)
  const [heureDebut, setHeureDebut] = useState('08:00')
  const [jourFin, setJourFin] = useState(jourDe(n + 8 * JOUR))
  const [heureFin, setHeureFin] = useState('20:00')
  const [genreCible, setGenreCible] = useState<CiblePromotion['genre']>('toutes')
  const [valeur, setValeur] = useState('')
  const [vitrines, setVitrines] = useState<string[]>([])
  const [ouverte, setOuverte] = useState(false)
  const [fait, setFait] = useState<string | null>(null)
  const cible: CiblePromotion = genreCible === 'toutes' ? { genre: 'toutes' } : genreCible === 'vitrines' ? { genre: 'vitrines', ids: vitrines } : { genre: genreCible, id: valeur || (genreCible === 'categorie' ? v.categories[0]?.id : v.zones[0]?.id) || '' }
  const demande: DemandePromotion = {
    titre,
    remise: genreRemise === 'livraison' ? { genre: 'livraison' } : { genre: 'pourcentage', pct: Math.round(Number(pct)) },
    debut: quand === 'maintenant' ? null : instant(jourDebut, heureDebut),
    fin: instant(jourFin, heureFin),
    cible,
  }
  const pret = titre.trim().length >= 3 && (genreCible !== 'vitrines' || vitrines.length > 0)
  const options = genreCible === 'categorie' ? v.categories : v.zones
  return (
    <Panel titre={t('Nouvelle promotion de la plateforme')} icone="calendar-plus" className="mt16">
      <div className="sv-form">
        <Champ t={t('Titre affiché au client')} className="plein">
          <input value={titre} maxLength={60} onChange={(e) => setTitre(e.target.value)} placeholder={t('Paie de fin de mois')} />
        </Champ>
        <Champ t={t('Remise')}>
          <select value={genreRemise} onChange={(e) => setGenreRemise(e.target.value as 'pourcentage' | 'livraison')}>
            <option value="pourcentage">{t('Pourcentage')}</option>
            <option value="livraison">{t('Livraison offerte')}</option>
          </select>
        </Champ>
        {genreRemise === 'pourcentage' ? (
          <Champ t={tf('Remise en % (1 à {m})', { m: v.remiseMaxPct })}>
            <input type="number" min={1} max={v.remiseMaxPct} value={pct} onChange={(e) => setPct(e.target.value)} />
          </Champ>
        ) : (
          <div />
        )}
        <Champ t={t('Début')}>
          <select value={quand} onChange={(e) => setQuand(e.target.value as 'maintenant' | 'programmer')}>
            <option value="programmer">{t('Programmer')}</option>
            <option value="maintenant">{t('Maintenant')}</option>
          </select>
        </Champ>
        {quand === 'programmer' ? (
          <Champ t={t('Date et heure de début')} bloc>
            <span className="sv-heures">
              <span className="inp"><input type="date" aria-label={t('Date de début')} min={jourDe(n)} value={jourDebut} onChange={(e) => setJourDebut(e.target.value)} /></span>
              <span className="inp"><input type="time" aria-label={t('Heure de début')} value={heureDebut} onChange={(e) => setHeureDebut(e.target.value)} /></span>
            </span>
          </Champ>
        ) : (
          <div />
        )}
        <Champ t={t('Date et heure de fin')} bloc>
          <span className="sv-heures">
            <span className="inp"><input type="date" aria-label={t('Date de fin')} min={jourDe(n)} value={jourFin} onChange={(e) => setJourFin(e.target.value)} /></span>
            <span className="inp"><input type="time" aria-label={t('Heure de fin')} value={heureFin} onChange={(e) => setHeureFin(e.target.value)} /></span>
          </span>
        </Champ>
        <Champ t={t('Cible')}>
          <select value={genreCible} onChange={(e) => (setGenreCible(e.target.value as CiblePromotion['genre']), setValeur(''))}>
            <option value="toutes">{t('Tout le catalogue')}</option>
            <option value="categorie">{t('Une catégorie')}</option>
            <option value="zone">{t('Une zone')}</option>
            <option value="vitrines">{t('Des vitrines')}</option>
          </select>
        </Champ>
        {(genreCible === 'categorie' || genreCible === 'zone') && (
          <Champ t={genreCible === 'categorie' ? t('Catégorie') : t('Zone')} className="plein">
            <select value={valeur || options[0]?.id} onChange={(e) => setValeur(e.target.value)}>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {t(o.titre)}
                </option>
              ))}
            </select>
          </Champ>
        )}
        {genreCible === 'vitrines' && (
          <Champ t={tf('Vitrines ({n} choisie(s))', { n: vitrines.length })} bloc className="plein">
            <span className="sv-vitrines" role="group" aria-label={t('Vitrines')}>
              {v.vitrines.map((x) => {
                const on = vitrines.includes(x.id)
                return (
                  <button key={x.id} type="button" className={'chip' + (on ? ' on' : '')} aria-pressed={on} onClick={() => setVitrines(on ? vitrines.filter((y) => y !== x.id) : [...vitrines, x.id])}>
                    {x.titre}
                  </button>
                )
              })}
            </span>
          </Champ>
        )}
      </div>
      <div className="btns mt12">
        <button type="button" className="btn primary" disabled={!pret} onClick={() => (setFait(null), setOuverte(true))}>
          <Icone nom={quand === 'maintenant' ? 'play' : 'calendar-plus'} taille={18} />
          <span>{quand === 'maintenant' ? t('Lancer maintenant') : t('Programmer la promotion')}</span>
        </button>
      </div>
      {fait && (
        <p className="t13 c2 mt8" role="status">
          {fait}
        </p>
      )}
      <DecisionMotivee
        ouverte={ouverte}
        fermer={() => setOuverte(false)}
        titre={quand === 'maintenant' ? tf('Lancer « {t} »', { t: titre.trim() }) : tf('Programmer « {t} »', { t: titre.trim() })}
        resume={t('Financée par BelivaY ; visible sur le site client pendant sa période, et par les vendeurs ciblés. Arrêt possible à tout moment, motivé.')}
        libelle={quand === 'maintenant' ? 'Lancer maintenant' : 'Programmer la promotion'}
        icone={quand === 'maintenant' ? 'play' : 'calendar-plus'}
        refus={(r) => t(REFUS[r] ?? 'La décision n’a pas pu être enregistrée.')}
        envoyer={async (m) => {
          const r = await source.pilotage.creerPromotion(demande, m)
          if (r.ok) {
            setFait(tf('{id} enregistrée.', { id: r.id }))
            setTitre('')
            relire()
          }
          return r
        }}
      />
    </Panel>
  )
}
