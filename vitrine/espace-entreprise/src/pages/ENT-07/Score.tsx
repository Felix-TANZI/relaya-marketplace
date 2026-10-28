// ENT-P20 · Score qualité, repris sur le prototype (route('score') ; domaine src/donnees/domaines/score.ts ; moteur
// src/calculs/ent07.ts). Fixé par BelivaY, lecture seule (ENT-UIX-06). g21 : héros nuit (anneau du score, palier et
// plafond, progression vers le palier suivant ou seuil de descente) | Paliers (onglet Entreprise) ou Décomposition du
// score (autres onglets). Onglets Entreprise · Livreurs · Zones · Événements : Décomposition + Indicateurs du pilote
// (ou Ce qui tire le score vers le bas en alerte) ; comparatif par livreur (ligne ambre sous le seuil Confirmé, fiche
// du livreur) ; par zone ; événements (chacun ouvre son paquet). Aucune mission close : état « Nouveau », aucun score
// fictif (ENT-P20R-01). Une alerte précède toute descente, qui exige une validation humaine. Tous les rôles internes.
// Enrichissements (ENRICHISSEMENTS.md P20) : fiche « Comment monter » ouverte depuis chaque critère de la
// décomposition (feuille ?sheet=monter&fiche=…, règles lues dans le registre) ; évolution animée du score (du calcul
// précédent au score actuel, anneau et barre ; coupée en mouvement réduit) ; échelle des paliers avec leurs seuils.
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Feuille, useFeuille } from '@client/composants/Feuille'
import { Icone } from '../../composants/Icone'
import { NOM_PALIER } from '../../config/libelles'
import { chemin } from '../../config/pages'
import type { PalierEntreprise } from '../../donnees/communs'
import type { EvenementScore, ScoreEntreprise, ScoreLivreur, ScoreZone } from '../../donnees/domaines/score'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { Banniere, Barre, Choix, type Colonne, Hint, Kv, Li, Note, Panel, Pill, Px, Table, Tete, type Ton, useLarge, Vide } from '../../composants/prototype'
import { ECHECS, lireTrust } from '../../calculs/ent07'
import { JOUR } from '../../calculs/temps'
import { PARAMETRES } from '../../calculs/registre'
import { usePreferences } from '../../preferences'
import { useHorloge, useMontantsVisibles, useSession } from '../../session'
import { Chargement, useDates, useF, useOnglet } from './commun'
import { Anneau, Col, ErreurPx } from './px'
import { Ecran } from '../../composants/coque'
import { lireLitigesDp35 } from '../../calculs/ent07'

const P = lireTrust()
const ONGLETS = ['entreprise', 'livreurs', 'zones', 'evenements'] as const
const GRAVITE: Record<EvenementScore['gravite'], [Ton, string]> = { succes: ['green', 'Succès'], g1: ['amber', 'Gravité 1'], g2: ['amber', 'Gravité 2'], g3: ['red', 'Gravité 3'], veto: ['red', 'Veto'] }

// Critères de la décomposition, chacun avec sa fiche « Comment monter ».
const CRITERES = ['delai', 'manquements', 'propres', 'veto'] as const
type Critere = (typeof CRITERES)[number]
const TITRE_CRITERE: Record<Critere, string> = { delai: 'Remises dans le délai', manquements: 'Manquements des livreurs', propres: 'Événements de l’entreprise', veto: 'Veto' }
const SOUS_CRITERE: Record<Critere, string> = { delai: 'succès', manquements: '', propres: 'rendus, délais, pertes', veto: '' }
const compter = (c: Critere, ev: EvenementScore[]) =>
  ev.filter((e) => (c === 'delai' ? e.gravite === 'succes' : c === 'manquements' ? e.gravite !== 'succes' && !e.propre : c === 'propres' ? e.propre : e.gravite === 'veto')).length
const L = lireLitigesDp35()

/** Ouvre la fiche d'un critère (feuille ?sheet=monter&fiche=…, fermée par le retour). */
function useOuvrirFiche() {
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  return (c: Critere) => {
    const p = new URLSearchParams(params)
    p.set('sheet', 'monter')
    p.set('fiche', c)
    naviguer({ search: p.toString() }, { state: { feuille: true } })
  }
}

/** Moyenne pondérée par les missions (valeurs connues seulement). */
function moyenne(xs: { v: number | null; n: number }[]): number | null {
  const ok = xs.filter((x) => x.v !== null && x.n > 0)
  const n = ok.reduce((a, x) => a + x.n, 0)
  return n ? Math.round(ok.reduce((a, x) => a + x.v! * x.n, 0) / n) : null
}

export default function Score() {
  const { t, tf, langue } = usePreferences()
  const nb = (x: number) => (langue === 'fr' ? String(x).replace('.', ',') : String(x))
  const d = useDates()
  const f = useF()
  const large = useLarge()
  const maintenant = useHorloge()
  const voir = useMontantsVisibles()
  const nom = useSession().entreprise?.nom ?? t('votre entreprise')
  const lecture = useLecture(() => source.score.score(), [])
  const [onglet, choisir] = useOnglet(ONGLETS, 'entreprise')
  const s = lecture.donnees
  const plafondTexte = (x: number | null) => (x === null ? t('sans plafond') : voir ? f(x) : t('plafond du palier'))
  const paliers: { p: PalierEntreprise; seuil: number | null; plafond: number | null }[] = [
    { p: 'Nouveau', seuil: null, plafond: PARAMETRES.paliers.plafonds.Nouveau },
    { p: 'Confirme', seuil: P.seuils.Confirme, plafond: PARAMETRES.paliers.plafonds.Confirme },
    { p: 'Or', seuil: P.seuils.Or, plafond: null },
  ]
  const acts = (
    <Link className="btn secondary sm" to={chemin('flotte')}>
      <Icone nom="users" taille={16} />
      <span>{t('Livreurs')}</span>
    </Link>
  )
  const panneauPaliers = (
    <Panel titre={t('Paliers')} icone="award">
      {paliers.map((x) => (
        <Kv
          key={x.p}
          k={
            <>
              {t(NOM_PALIER[x.p])}
              {s?.palier === x.p && (
                <>
                  {' '}
                  <Pill ton="acc" sm>
                    {t('Votre palier')}
                  </Pill>
                </>
              )}
            </>
          }
          v={`${x.seuil === null ? t('à l’activation') : x.p === 'Or' ? tf('{s}, assurance, visite', { s: x.seuil }) : tf('{s} tenu {j} jours', { s: x.seuil, j: P.tenueJours })} · ${plafondTexte(x.plafond)}`}
        />
      ))}
      <Hint icone="shield-alert">{t('Assurance expirée au palier Or : plafond ramené à celui de Confirmé, palier affiché inchangé.')}</Hint>
      <Hint icone="trending-down">{tf('Descente : {e} points sous le seuil pendant {j} jours, puis validation humaine motivée ; contestation une fois. Jamais automatique.', { e: P.ecartDescente, j: P.tenueJours })}</Hint>
    </Panel>
  )
  const items = [
    { id: 'entreprise' as const, t: t('Entreprise'), icone: large ? 'building-2' : undefined },
    { id: 'livreurs' as const, t: t('Livreurs'), n: large && s ? s.livreurs.length : undefined, icone: large ? 'users' : undefined },
    { id: 'zones' as const, t: t('Zones'), n: large && s ? s.zones.length : undefined, icone: large ? 'map-pinned' : undefined },
    { id: 'evenements' as const, t: t('Événements'), icone: large ? 'history' : undefined },
  ]
  return (
    <Ecran route="score" actions={large ? acts : undefined}>
      <Px>
        <Tete route="score" titre={t('Score qualité')} actes={acts} />
        <ErreurPx erreur={lecture.erreur} relire={lecture.relire} quoi="le score qualité" />
        {s?.alerteDescente && s.score !== null && (
          <Banniere
            ton="amber"
            icone="triangle-alert"
            className="ec-bn"
            role="status"
            bouton={
              <Link className="btn primary sm" to={s.alerteDescente.livreur ? chemin('livreur', { id: s.alerteDescente.livreur.id }) : chemin('flotte')}>
                <Icone nom="wrench" taille={16} />
                <span>{t('Corriger')}</span>
              </Link>
            }
          >
            <b>{t('Alerte de descente.')}</b> {tf('Trust Score {s}, sous le seuil de {seuil} depuis {q}. S’il y reste jusqu’au {fin}, BelivaY propose une descente de palier ; un humain valide avec un motif écrit.', { s: nb(s.score), seuil: s.alerteDescente.seuil, q: d.quand(s.alerteDescente.sousDepuis, maintenant), fin: d.jourLong(s.alerteDescente.echeance) })}
          </Banniere>
        )}
        {!s ? (
          !lecture.erreur && <Chargement />
        ) : s.missionsCloses === 0 || s.score === null ? (
          <>
            <Choix forme="tabs" aria={t('Vues du score')} actif="entreprise" items={[items[0]]} />
            <div className="g g21">
              <Panel>
                <Vide icone="gauge" t={t('Votre score apparaîtra après vos premières missions')} s={tf('Aucun score n’est affiché avant la première mission validée : pas de note fictive. Tout le monde part au neutre ({mu} sur 100), puis le score se calcule à chaque événement, avec le même barème que vos livreurs.', { mu: P.mu })}>
                  <div className="btns ec-btns" style={{ maxWidth: 420, margin: '12px auto 0' }}>
                    <Link className="btn primary" to={chemin('missions')}>
                      <Icone nom="map" taille={18} />
                      <span>{t('Suivre les premières missions')}</span>
                    </Link>
                  </div>
                </Vide>
              </Panel>
              <Col>
                <Panel titre={t('Palier de départ')} icone="award">
                  <div className="row" style={{ gap: 12 }}>
                    <span className="medal bronze">
                      <Icone nom="award" taille={20} />
                    </span>
                    <div className="grow">
                      <div className="b8 t17">{t(NOM_PALIER[s.palier])}</div>
                      <div className="t13 c3">{tf('plafond de {m} par colis', { m: plafondTexte(s.plafond) })}</div>
                    </div>
                    <Pill ton="ink" sm icone="lock">
                      {t('Fixé par BelivaY')}
                    </Pill>
                  </div>
                  {paliers.slice(1).map((x) => (
                    <Kv key={x.p} k={t(NOM_PALIER[x.p])} v={`${tf('{s} tenu {j} jours', { s: x.seuil!, j: P.tenueJours })} · ${plafondTexte(x.plafond)}`} />
                  ))}
                </Panel>
                <Panel titre={t('Ce qui comptera')} icone="list-checks">
                  <Comment />
                  <Hint icone="info">{t('Plus vos propres événements : paquets rendus, délais d’acceptation et de ramassage, pertes non imputables à un livreur précis.')}</Hint>
                </Panel>
              </Col>
            </div>
          </>
        ) : (
          <>
            <div className="g g21">
              <Heros s={s} nom={nom} plafondTexte={plafondTexte} nb={nb} />
              {onglet === 'entreprise' ? panneauPaliers : <Decomposition s={s} nb={nb} />}
            </div>
            <div style={{ marginTop: 8 }}>
              <Choix forme="tabs" aria={t('Vues du score')} actif={onglet} choisir={choisir} items={items} />
            </div>
            <div style={{ marginTop: 14 }}>
              {onglet === 'entreprise' && (
                <>
                  <div className="g g2" style={{ marginTop: 0 }}>
                    <Decomposition s={s} nb={nb} />
                    {s.alerteDescente ? <VersLeBas s={s} nb={nb} /> : <Indicateurs s={s} />}
                  </div>
                  <Note ton="ink" icone="bell-ring">
                    {t('Une alerte précède chaque seuil de descente de palier ; la descente exige une validation humaine motivée.')}
                  </Note>
                </>
              )}
              {onglet === 'livreurs' && <Livreurs s={s} nb={nb} />}
              {onglet === 'zones' && <Zones zones={s.zones} nb={nb} />}
              {onglet === 'evenements' && <Evenements evenements={s.evenements} />}
            </div>
          </>
        )}
      </Px>
      {s && <FicheMonter s={s} />}
    </Ecran>
  )
}

/** Valeur qui défile de `de` à `a` (≈ 0,9 s, ralentie à la fin) ; immédiate en mouvement réduit. */
function useDefile(de: number, a: number, duree = 900): number {
  const { animationsReduites } = usePreferences()
  const reduit = animationsReduites || (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [v, setV] = useState(reduit ? a : de)
  useEffect(() => {
    if (reduit) return void setV(a)
    let debut: number | null = null
    let id = 0
    const pas = (ts: number) => {
      debut ??= ts
      const x = Math.min(1, (ts - debut) / duree)
      setV(de + (a - de) * (1 - (1 - x) ** 3))
      if (x < 1) id = requestAnimationFrame(pas)
    }
    id = requestAnimationFrame(pas)
    return () => cancelAnimationFrame(id)
  }, [de, a, duree, reduit])
  return v
}

/** Échelle des paliers (0 à 100) : seuils de Confirmé et d'Or, plafond du veto, position du score. */
function EchellePaliers({ score, nb }: { score: number; nb: (x: number) => string }) {
  const { t, tf } = usePreferences()
  const c = P.seuils.Confirme
  const o = P.seuils.Or
  return (
    <div className="e7-echelle" data-echelle>
      <div className="e7-echelle-piste" role="img" aria-label={tf('Score {s} sur 100 ; Confirmé à partir de {c}, Or à partir de {o}', { s: nb(score), c, o })}>
        <span className="z nouveau" style={{ width: c + '%' }} />
        <span className="z confirme" style={{ width: o - c + '%' }} />
        <span className="z or" style={{ width: 100 - o + '%' }} />
        <span className="veto" style={{ left: P.veto + '%' }} />
        <span className="pointe" style={{ left: Math.max(0, Math.min(100, score)) + '%' }} />
      </div>
      <div className="e7-echelle-n" aria-hidden="true">
        <span style={{ left: '0%' }}>0</span>
        <span style={{ left: c + '%' }}>{c}</span>
        <span style={{ left: o + '%' }}>{o}</span>
        <span style={{ left: '100%' }}>100</span>
      </div>
      <ul className="e7-echelle-l">
        <li>
          <i className="nouveau" />
          {tf('{p} : sous {s}', { p: t(NOM_PALIER.Nouveau), s: c })}
        </li>
        <li>
          <i className="confirme" />
          {tf('{p} : {s} tenu {j} jours', { p: t(NOM_PALIER.Confirme), s: c, j: P.tenueJours })}
        </li>
        <li>
          <i className="or" />
          {tf('{p} : {s} tenu {j} jours', { p: t(NOM_PALIER.Or), s: o, j: P.tenueJours })}
        </li>
        <li>
          <i className="veto" />
          {tf('Veto : score plafonné à {v}', { v: P.veto })}
        </li>
      </ul>
    </div>
  )
}

/** Héros : anneau, palier et plafond ; vers le palier suivant, ou seuil de descente en alerte. */
function Heros({ s, nom, plafondTexte, nb }: { s: ScoreEntreprise; nom: string; plafondTexte: (x: number | null) => string; nb: (x: number) => string }) {
  const { t, tf } = usePreferences()
  const d = useDates()
  const maintenant = useHorloge()
  const score = s.score!
  // Évolution animée : du calcul précédent (ou du neutre au premier calcul) au score actuel.
  const affiche = useDefile(s.precedent ?? P.mu, score)
  const suivant = s.palier === 'Nouveau' ? { p: 'Confirme' as const, seuil: P.seuils.Confirme } : s.palier === 'Confirme' ? { p: 'Or' as const, seuil: P.seuils.Or } : null
  const al = s.alerteDescente
  const ecoule = al ? Math.max(0, Math.floor((maintenant - al.sousDepuis) / JOUR)) : 0
  return (
    <div className="hero night" data-heros="score">
      <div className="row" style={{ gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="ec7-rw">
          <Anneau v={affiche} couleur="var(--gold-l)" taille={112} libelle={Math.round(affiche)} aria={tf('{s} sur 100', { s: nb(score) })} />
        </span>
        <div className="grow" style={{ minWidth: 220 }}>
          <div className="row" style={{ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <span className="hk">{tf('Trust Score de {n}', { n: nom })}</span>
            <Pill ton="ink" sm icone="lock">
              {t('Fixé par BelivaY')}
            </Pill>
          </div>
          <div className="ht">{tf('Palier {p} · {m} par colis', { p: t(NOM_PALIER[s.palier]), m: plafondTexte(s.plafond) })}</div>
          <div className="hs">
            {tf('Calculé par BelivaY à partir des {n} missions de vos livreurs et de vos propres événements ; même barème que vos livreurs.', { n: s.missionsCloses })}{' '}
            {s.precedent === null ? t('Premier calcul.') : tf('{d} point(s) depuis le dernier calcul ({q}).', { d: `${score - s.precedent >= 0 ? '+' : '−'}${nb(Math.abs(Math.round(10 * (score - s.precedent)) / 10))}`, q: d.quand(s.calculeLe, maintenant) })}
          </div>
        </div>
      </div>
      <EchellePaliers score={affiche} nb={nb} />
      <div className="hline"></div>
      {al ? (
        <>
          <div className="row" style={{ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <b>{tf('Seuil de descente : sous {s} pendant {j} jours', { s: al.seuil, j: P.tenueJours })}</b>
            <span className="t12 c3">{tf('{n} jour(s) sur {j} · échéance {fin}', { n: ecoule, j: P.tenueJours, fin: d.jourLong(al.echeance) })}</span>
          </div>
          <div className="mt8">
            <Barre pct={(100 * ecoule) / P.tenueJours} ton="red" />
          </div>
          <div className="hs mt8">{t('Aucune descente automatique : BelivaY propose, un humain valide avec un motif écrit ; contestation possible une fois.')}</div>
        </>
      ) : suivant ? (
        <>
          <div className="row" style={{ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <b>{tf('Vers {p} : {s} tenu {j} jours', { p: t(NOM_PALIER[suivant.p]), s: suivant.seuil, j: P.tenueJours })}</b>
            <span className="t12 c3">{score >= suivant.seuil ? t('seuil atteint : il reste à le tenir') : tf('encore {n} point(s)', { n: Math.max(0, Math.ceil(suivant.seuil - score)) })}</span>
          </div>
          <div className="mt8">
            <Barre pct={(100 * affiche) / suivant.seuil} />
          </div>
          <div className="hs mt8">
            {suivant.p === 'Confirme'
              ? tf('Confirmé : plafond relevé et priorité sur les paquets de vos zones. Or : {s} tenu {j} jours, assurance marchandises et visite de l’agence, sans plafond.', { s: P.seuils.Or, j: P.tenueJours })
              : t('Or : assurance marchandises et visite de l’agence en plus, sans plafond.')}
          </div>
        </>
      ) : (
        <div className="hs">{t('Palier le plus haut atteint : sans plafond tant que l’assurance marchandises est valide.')}</div>
      )}
    </div>
  )
}

/** Ce qui compose le score : succès, échecs pondérés par gravité, événements propres (barème du moteur). */
function Decomposition({ s, nb }: { s: ScoreEntreprise; nb: (x: number) => string }) {
  const { t, tf } = usePreferences()
  const ev = s.evenements
  const n = ev.length || 1
  const ouvrirFiche = useOuvrirFiche()
  const lignes: { id: Critere; l: string; sous: string; v: number; ton?: 'acc' | 'red' | 'green' }[] = CRITERES.map((id) => ({ id, l: t(TITRE_CRITERE[id]), sous: id === 'manquements' ? tf('g1 = {a}, g2 = {b}, g3 = {c} échecs', { a: ECHECS.g1, b: ECHECS.g2, c: ECHECS.g3 }) : id === 'veto' ? tf('plafonne le score à {v}', { v: P.veto }) : t(SOUS_CRITERE[id]), v: compter(id, ev), ton: id === 'delai' ? 'green' : id === 'propres' ? undefined : 'red' }))
  return (
    <Panel titre={t('Décomposition du score')} icone="chart-bar">
      {lignes.map((x) => (
        <div className="ec7-crit" key={x.l} data-critere={x.id}>
          <span className="l">
            {x.l}
            <small>{x.sous}</small>
            <button type="button" className="e7-monter" onClick={() => ouvrirFiche(x.id)} aria-label={tf('Comment monter : {c}', { c: x.l })}>
              <Icone nom="trending-up" taille={14} />
              {t('Comment monter')}
            </button>
          </span>
          <Barre pct={(100 * x.v) / n} ton={x.ton === 'red' ? 'red' : x.ton === 'green' ? 'green' : 'acc'} />
          <span className="r">{tf('{v} / {n}', { v: x.v, n: ev.length })}</span>
        </div>
      ))}
      <div className="ec7-crit tot">
        <span className="l">{t('Total')}</span>
        <span></span>
        <span className="r">{tf('{s} / 100', { s: nb(s.score!) })}</span>
      </div>
      <Hint icone="info">{tf('Un litige en cours ne compte pas ; un litige gagné n’a aucun effet. Baisse de {n} points au plus par recalcul.', { n: P.baisseMax })}</Hint>
    </Panel>
  )
}

/** Indicateurs du pilote (tuiles), lus des comparatifs. */
function Indicateurs({ s }: { s: ScoreEntreprise }) {
  const { t } = usePreferences()
  const delai = moyenne(s.livreurs.map((l) => ({ v: l.dansLeDelai, n: l.missions })))
  const preuves = moyenne(s.livreurs.map((l) => ({ v: l.preuvesCompletes, n: l.missions })))
  const manques = s.evenements.filter((e) => e.gravite !== 'succes' && !e.propre).length
  const propres = s.evenements.filter((e) => e.propre).length
  const notes = s.livreurs.filter((l) => l.score !== null).length
  const tuile = (k: string, v: string | number, u: string | null, sous: string, cls = '') => (
    <div className={'tile ' + cls} key={k}>
      <div className="tk">{k}</div>
      <div className="tv">
        {v}
        {u && <small>{u}</small>}
      </div>
      <div className="ts">{sous}</div>
    </div>
  )
  return (
    <Panel titre={t('Indicateurs du pilote')} icone="activity">
      <div className="tiles t3" style={{ marginTop: 0 }}>
        {tuile(t('Missions'), s.missionsCloses, null, t('closes et comptées'))}
        {tuile(t('Délai tenu'), delai ?? '—', delai === null ? null : '%', t('moyenne pondérée des livreurs'))}
        {tuile(t('Manquements'), manques, null, t('des livreurs, pondérés par gravité'))}
        {tuile(t('Preuves'), preuves ?? '—', preuves === null ? null : '%', t('colis aux preuves complètes'), 'acc')}
        {tuile(t('Événements'), propres, null, t('propres à l’entreprise'))}
        {tuile(t('Livreurs notés'), `${notes}/${s.livreurs.length}`, null, t('les autres attendent leur première mission'))}
      </div>
      <Comment />
      <Hint icone="info">{t('Mêmes définitions que la console de BelivaY.')}</Hint>
    </Panel>
  )
}

/** Règles du calcul (registre). */
function Comment() {
  const { t, tf } = usePreferences()
  return (
    <>
      <Kv k={t('Départ au neutre')} v={tf('{mu} sur 100, comme {k} missions moyennes', { mu: P.mu, k: P.k })} />
      <Kv k={t('Ancienneté d’un événement')} v={tf('compte deux fois moins tous les {j} jours', { j: P.demiVieJours })} />
      <Kv k={t('Gravités')} v={tf('{a}, {b} ou {c} échec(s) ; un veto plafonne à {v}', { a: ECHECS.g1, b: ECHECS.g2, c: ECHECS.g3, v: P.veto })} />
      <Kv k={t('Baisse maximale')} v={tf('{n} points par calcul', { n: P.baisseMax })} />
    </>
  )
}

/** En alerte : ce qui tire le score vers le bas. */
function VersLeBas({ s, nb }: { s: ScoreEntreprise; nb: (x: number) => string }) {
  const { t, tf } = usePreferences()
  const notes = s.livreurs.filter((l) => l.score !== null)
  const pire = notes.length ? notes.reduce((a, b) => (b.score! < a.score! ? b : a)) : null
  const autres = notes.filter((l) => l !== pire).map((l) => l.score!)
  return (
    <Panel titre={t('Ce qui tire le score vers le bas')} icone="trending-down">
      {pire && (
        <Li
          icone="user-x"
          ton="red"
          t={`${pire.livreur.nom} · ${nb(pire.score!)}`}
          s={autres.length ? tf('{d} % dans le délai · les autres livreurs sont entre {a} et {b}', { d: pire.dansLeDelai ?? '—', a: nb(Math.min(...autres)), b: nb(Math.max(...autres)) }) : tf('{d} % dans le délai', { d: pire.dansLeDelai ?? '—' })}
          droite={
            <Link className="btn secondary sm" to={chemin('livreur', { id: pire.livreur.id })}>
              <Icone nom="user" taille={16} />
              <span>{t('Voir la fiche')}</span>
            </Link>
          }
        />
      )}
      <Note ton="acc" icone="user-check">
        {t('Un seul livreur tire le score vers le bas : formez-le ou retirez-le. BelivaY ne sanctionne pas l’entreprise pour un cas isolé.')}
      </Note>
    </Panel>
  )
}

function Livreurs({ s, nb }: { s: ScoreEntreprise; nb: (x: number) => string }) {
  const { t, tf } = usePreferences()
  const d = useDates()
  const maintenant = useHorloge()
  const notes = s.livreurs.filter((l) => l.score !== null)
  const pire = notes.length ? notes.reduce((a, b) => (b.score! < a.score! ? b : a)) : null
  const bas = pire && s.score !== null && pire.score! < s.score ? pire.livreur.id : null
  const dernier = (id: string) => s.evenements.filter((e) => e.livreur?.id === id).sort((a, b) => b.le - a.le)[0]
  const cols: Colonne<ScoreLivreur>[] = [
    {
      k: 'w',
      t: t('Livreur'),
      main: true,
      rendu: (l) => (
        <span data-livreur={l.livreur.id}>
          <Link className="b8" to={chemin('livreur', { id: l.livreur.id })}>
            {l.livreur.nom}
          </Link>
          {l.livreur.id === bas && <div className="t2 cr b7">{t('Tire le score vers le bas')}</div>}
        </span>
      ),
    },
    { k: 'sc', t: t('Trust Score'), rendu: (l) => (l.score === null ? <span className="c3">{t('Pas encore')}</span> : <Anneau v={l.score} taille={40} couleur={l.score < P.seuils.Confirme ? 'var(--amber)' : 'var(--acc)'} libelle={Math.round(l.score)} aria={tf('{s} sur 100', { s: nb(l.score) })} />) },
    { k: 'mi', t: t('Missions'), cls: 'r', rendu: (l) => l.missions },
    { k: 'dl', t: t('Dans le délai'), cls: 'r', rendu: (l) => (l.dansLeDelai === null ? '—' : `${l.dansLeDelai} %`) },
    { k: 'pr', t: t('Preuves complètes'), cls: 'r', rendu: (l) => (l.preuvesCompletes === null ? '—' : `${l.preuvesCompletes} %`) },
    {
      k: 'ev',
      t: t('Dernier événement'),
      rendu: (l) => {
        const e = dernier(l.livreur.id)
        return e ? <span className="t13">{`${t(e.libelle)} · ${d.quand(e.le, maintenant)}`}</span> : <span className="t13 c3">{t('Aucun événement')}</span>
      },
    },
  ]
  return (
    <>
      <div className="ec-tb">
        <Table
          cols={cols}
          rows={s.livreurs}
          cle={(l) => l.livreur.id}
          legende={t('Comparatif par livreur')}
          ligneCls={(l) => (l.score !== null && l.score < P.seuils.Confirme ? 'warn' : undefined)}
          vide={<Vide icone="users" t={t('Aucun livreur rattaché')} s={t('Le comparatif apparaît avec les premiers livreurs actifs.')} />}
          pied={
            <>
              <span>{tf('Ligne ambre : livreur sous {s}. Chaque ligne ouvre la fiche du livreur.', { s: P.seuils.Confirme })}</span>
              <span>{t('Aucun score avant la première mission')}</span>
            </>
          }
        />
      </div>
      <Note ton="acc" icone="user-check">
        <b>{t('Score tiré vers le bas par un seul livreur ?')}</b> {t('Ce comparatif le montre : formez-le ou retirez-le de la flotte. BelivaY ne sanctionne pas l’entreprise pour un cas isolé.')}
      </Note>
      <Note ton="red" icone="ban">
        <b>{t('Interdit')}</b> : {t('faire noter ses livreurs par des proches (faux avis).')}
      </Note>
    </>
  )
}

function Zones({ zones, nb }: { zones: ScoreZone[]; nb: (x: number) => string }) {
  const { t } = usePreferences()
  const cols: Colonne<ScoreZone>[] = [
    {
      k: 'z',
      t: t('Zone'),
      main: true,
      rendu: (z) => (
        <>
          <b>{z.zone}</b> {z.nom}
        </>
      ),
    },
    { k: 'mi', t: t('Missions'), cls: 'r', rendu: (z) => z.missions },
    { k: 'sc', t: t('Score'), cls: 'r', rendu: (z) => (z.score === null ? '—' : nb(z.score)) },
    { k: 'dl', t: t('Délai tenu'), cls: 'r', rendu: (z) => (z.dansLeDelai === null ? '—' : `${z.dansLeDelai} %`) },
  ]
  return (
    <>
      <div className="ec-tb">
        <Table
          cols={cols}
          rows={zones}
          cle={(z) => z.zone}
          legende={t('Comparatif par zone')}
          ligneCls={(z) => (z.score !== null && z.score < P.seuils.Confirme ? 'warn' : undefined)}
          vide={<Vide icone="map-pinned" t={t('Aucune zone servie')} s={t('Les zones apparaissent avec les premières missions.')} />}
          pied={
            <>
              <span>{t('Mêmes définitions que la console et le Trust Score')}</span>
              <Link className="cor" to={chemin('zones')}>
                {t('Zones et capacité')}
              </Link>
            </>
          }
        />
      </div>
      <Hint icone="eye-off">{t('Un colis au-dessus du plafond de votre palier reste invisible pour votre entreprise ; il attend une entreprise d’un palier suffisant.')}</Hint>
    </>
  )
}

function Evenements({ evenements }: { evenements: EvenementScore[] }) {
  const { t } = usePreferences()
  const d = useDates()
  const maintenant = useHorloge()
  return (
    <Panel titre={t('Événements récents · chacun renvoie à sa mission')} icone="history">
      {evenements.length === 0 ? (
        <Vide icone="history" t={t('Aucun événement')} s={t('Chaque mission close ajoute ses événements ici.')} />
      ) : (
        <div className="ec7-evt">
          {evenements.map((e) => {
            const [ton, lib] = GRAVITE[e.gravite]
            return (
              <Li
                key={e.id}
                icone={e.gravite === 'succes' ? 'circle-check' : e.propre ? 'building-2' : 'triangle-alert'}
                ton={e.gravite === 'succes' ? 'green' : ton}
                t={t(e.libelle)}
                s={[d.quand(e.le, maintenant), e.zone, e.livreur?.nom ?? t('Entreprise'), e.paquetId].filter(Boolean).join(' · ')}
                droite={
                  <Pill ton={ton} sm>
                    {t(lib)}
                  </Pill>
                }
                to={e.paquetId ? chemin('paquet', { id: e.paquetId }) : undefined}
              />
            )
          })}
        </div>
      )}
      <div className="ec7-legend">
        <Pill ton="green" sm>
          {t('Succès')}
        </Pill>
        <Pill ton="amber" sm>
          {`g1 · ${ECHECS.g1} ${t('échec')}`}
        </Pill>
        <Pill ton="amber" sm>
          {`g2 · ${ECHECS.g2} ${t('échecs')}`}
        </Pill>
        <Pill ton="red" sm>
          {`g3 · ${ECHECS.g3} ${t('échecs')}`}
        </Pill>
        <Pill ton="red" sm>
          {`${t('Veto')} · ${t('score plafonné à')} ${P.veto}`}
        </Pill>
      </div>
    </Panel>
  )
}

/** Fiche « Comment monter » d'un critère : ce qui compte (règles du registre), où vous en êtes, quoi faire, où aller. */
function FicheMonter({ s }: { s: ScoreEntreprise }) {
  const { t, tf } = usePreferences()
  const { ouverte, fermer } = useFeuille('monter')
  const [params] = useSearchParams()
  const fp = params.get('fiche') as Critere | null
  const c: Critere = fp && CRITERES.includes(fp) ? fp : 'delai'
  const v = compter(c, s.evenements)
  const regle: Record<Critere, string> = {
    delai: tf('Chaque remise avant la promesse est un succès. Départ au neutre : {mu} sur 100, comme {k} missions moyennes ; un événement compte deux fois moins tous les {j} jours.', { mu: P.mu, k: P.k, j: P.demiVieJours }),
    manquements: tf('Un manquement compte {a}, {b} ou {c} échec(s) selon sa gravité (g1, g2, g3). Un litige en cours ne compte pas ; un litige gagné n’a aucun effet.', { a: ECHECS.g1, b: ECHECS.g2, c: ECHECS.g3 }),
    propres: t('Vos propres événements : paquets rendus après acceptation, délais d’acceptation et de ramassage dépassés, pertes non imputables à un livreur précis.'),
    veto: tf('Un veto (fraude, faux avis, arrangement en espèces) plafonne le score à {v}, quel que soit le reste.', { v: P.veto }),
  }
  const etapes: Record<Critere, string[]> = {
    delai: [t('N’acceptez que les paquets que vos livreurs peuvent remettre avant la promesse : réglez la capacité de vos zones.'), t('Affectez tôt : un ramassage rapide laisse de la marge au trajet.'), t('Suivez les missions en retard et prévenez avant l’échéance.')],
    manquements: [t('Ouvrez l’onglet Livreurs : formez ou retirez celui qui tire le score vers le bas.'), t('Exigez des preuves complètes à chaque changement de main : elles gagnent les litiges.'), tf('Répondez aux litiges dans les {h} heures, preuves à l’appui.', { h: L.reponseH })],
    propres: [t('Acceptez ou refusez vite : un délai d’acceptation dépassé compte contre l’entreprise.'), t('Ne rendez pas un paquet accepté : refusez-le plutôt à l’offre.'), t('Ramassez dans les délais promis au vendeur.')],
    veto: [t('Jamais d’arrangement en argent liquide, jamais de contact direct avec le client.'), t('Ne faites jamais noter vos livreurs par des proches (faux avis).'), t('Tout se règle dans le dossier du litige.')],
  }
  const liens: Record<Critere, { t: string; to: string; icone: string }[]> = {
    delai: [{ t: 'Missions', to: chemin('missions'), icone: 'map' }, { t: 'Zones et capacité', to: chemin('zones'), icone: 'map-pinned' }],
    manquements: [{ t: 'Livreurs', to: chemin('score', { onglet: 'livreurs' }), icone: 'users' }, { t: 'Preuves', to: chemin('preuves'), icone: 'camera' }, { t: 'Litiges', to: chemin('litiges'), icone: 'scale' }],
    propres: [{ t: 'Paquets', to: chemin('paquets'), icone: 'package' }, { t: 'Missions', to: chemin('missions'), icone: 'map' }],
    veto: [{ t: 'Litiges', to: chemin('litiges'), icone: 'scale' }],
  }
  const suivant = s.palier === 'Nouveau' ? P.seuils.Confirme : s.palier === 'Confirme' ? P.seuils.Or : null
  return (
    <Feuille ouverte={ouverte} fermer={fermer} titre={tf('Comment monter : {c}', { c: t(TITRE_CRITERE[c]) })}>
      <div className="e7-fiche" data-fiche={c}>
        <div className="kick">{t('Comment monter')}</div>
        <h2 className="card-t">{t(TITRE_CRITERE[c])}</h2>
        <Kv k={t('Ce qui compte')} v={regle[c]} />
        <Kv k={t('Chez vous')} v={tf('{v} événement(s) sur {n} pris en compte', { v, n: s.evenements.length })} />
        <Kv k={t('Seuils')} v={suivant !== null ? tf('prochain palier à {s}, tenu {j} jours ; baisse de {b} points au plus par calcul', { s: suivant, j: P.tenueJours, b: P.baisseMax }) : tf('palier le plus haut ; descente {e} points sous le seuil pendant {j} jours, jamais automatique', { e: P.ecartDescente, j: P.tenueJours })} />
        <ol className="e7-etapes">
          {etapes[c].map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ol>
        <div className="btns ec-btns">
          {liens[c].map((x) => (
            <Link key={x.t} className="btn secondary" to={x.to}>
              <Icone nom={x.icone} taille={18} />
              <span>{t(x.t)}</span>
            </Link>
          ))}
        </div>
        <Hint icone="lock">{t('Score fixé par BelivaY : il se recalcule à chaque événement, rien ne se négocie.')}</Hint>
      </div>
    </Feuille>
  )
}
