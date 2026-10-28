// Capacité et horaires (PR-10 Fig. 2 ; CAP-01 à CAP-08, CAL-20, CAL-21, PAL-04, STK-06, PR-RC-05, REF-CL-R01 ; DP-20,
// DP-66 appliquée au relais ; ARL-120, ARL-121). Gérant seul (CAP-05 : la route l'exige, config/droits.ts).
// Structure du prototype : titre, carte « Places de stockage » (− / + , places déclarées · occupées, barre
// d'occupation, équivalences par classe, règle du seuil, encombrants), carte « Horaires d'ouverture » (barre 6 h – 22 h
// par jour, interrupteur, jour courant surligné), carte « Pause déjeuner », action principale, « Fermer
// exceptionnellement ».
// Le contractuel passe par BelivaY : les places déclarées (hausse comme baisse, jamais sous les places occupées) et
// les horaires déclarés sont des DEMANDES, appliquées après accord (une hausse est vérifiée à une visite, ou à distance
// au palier Confirmé dans la limite PR-PAL-CAPACITE-PCT ; une baisse est revue à distance). Une demande en cours se
// voit et s'annule ; tant qu'elle attend, la valeur demandée s'affiche et ne se modifie pas.
// Effet sur le choix des clients (CAL-21, PR-RC-05) : au seuil PR-SATURATION, le relais n'est plus proposé aux nouveaux
// clients ; les retours déposés ne comptent jamais (CAP-08). DP-20 : plus d'interrupteur « Accepter les
// encombrants » : un relais ne refuse jamais un colis S, M ou L.
import { useState } from 'react'
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { Feuille } from '@client/composants/Feuille'
import { jourDe, jourSemaine, minutesDe } from '../../calculs/temps'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { FicheRelais, PlageJour } from '../../donnees/domaines/relais'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { creneau, heure, jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { Annonce, Chargement, ErreurLecture, Interrupteur, useGesteRelais } from './commun'

const JOURS = ['Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.', 'Dim.']
const JOURS_LONGS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
// Échelle de la barre horaire du prototype (6 h – 22 h) : un dessin, pas une règle (un horaire hors de l'échelle est
// permis, sa barre est seulement rognée).
const ECHELLE = { de: 6 * 60, a: 22 * 60 }
const GRADUATIONS = ['06:00', '12:00', '18:00', '22:00']

const memePlage = (a: PlageJour, b: PlageJour) => JSON.stringify(a) === JSON.stringify(b)

/** Démonstration seulement : la console de BelivaY n'existe pas encore, son accord se simule ici. */
const DEMO = import.meta.env.VITE_SOURCE !== 'api'

export default function Capacite() {
  const lecture = useLecture(() => source.relais.relais(), [])
  const g = useGesteRelais()
  const f = lecture.donnees
  if (!f) return <Ecran route="capacite">{lecture.erreur ? <ErreurLecture relire={lecture.relire} /> : <Chargement />}</Ecran>
  // Après une demande envoyée ou annulée, le brouillon repart de ce que dit le serveur.
  const cle = JSON.stringify([f.capacite.placesDeclarees, f.capacite.demandeEnCours, f.horaires])
  return <Contenu key={cle} f={f} g={g} />
}

function Contenu({ f, g }: { f: FicheRelais; g: ReturnType<typeof useGesteRelais> }) {
  const { t, tf, langue } = usePreferences()
  const naviguer = useNavigate()
  const lieu = useLocation()
  const [params] = useSearchParams()
  const cap = f.capacite
  const dC = cap.demandeEnCours
  const dH = f.horaires.demandeEnCours
  const [places, setPlaces] = useState(dC?.places ?? cap.placesDeclarees)
  const [semaine, setSemaine] = useState<PlageJour[]>(dH?.semaine ?? f.horaires.semaine)
  const aujourdhui = jourSemaine(jourDe(g.maintenant))

  // Feuilles : ?sheet=jour&jour=n (horaire d'un jour), ?sheet=pause.
  const feuille = params.get('sheet')
  const jourOuvert = Number(params.get('jour'))
  const ouvrir = (nom: string, jour?: number) => naviguer({ search: '?sheet=' + nom + (jour !== undefined ? '&jour=' + jour : '') }, { state: { feuille: true } })
  const fermer = () => ((lieu.state as { feuille?: boolean } | null)?.feuille ? naviguer(-1) : naviguer({ search: '' }, { replace: true }))

  const occ = cap.occupees
  const sature = occ * 100 >= cap.seuilPct * places
  const seuilPlaces = Math.ceil((cap.seuilPct * places) / 100)
  const tauxActuel = cap.placesDeclarees > 0 ? Math.round((occ / cap.placesDeclarees) * 100) : 100
  const placesChangees = !dC && places !== cap.placesDeclarees
  const horairesChanges = !dH && semaine.some((p, k) => !memePlage(p, f.horaires.semaine[k]))
  const hausseDistance = cap.hausseADistancePct !== null ? Math.floor(cap.placesDeclarees * (1 + cap.hausseADistancePct / 100)) : null
  const avecPause = semaine.some((p) => !p.ferme && p.pause)
  const pauseVue = semaine.find((p) => !p.ferme && p.pause)?.pause ?? null

  const changerJour = (k: number, p: PlageJour) => setSemaine((s) => s.map((x, i) => (i === k ? p : x)))
  const basculerJour = (k: number, ouvert: boolean) => {
    const avant = f.horaires.semaine[k]
    if (!ouvert) return changerJour(k, { ...semaine[k], ferme: true, ouverture: null, fermeture: null, pause: null })
    // Rouvrir un jour : ses heures d'avant, sinon on les choisit.
    if (!avant.ferme) return changerJour(k, avant)
    ouvrir('jour', k)
  }
  const basculerPause = (on: boolean) => {
    if (on) return ouvrir('pause')
    setSemaine((s) => s.map((p) => ({ ...p, pause: null })))
  }
  // La pause vaut pour les jours ouverts qui en ont une (tous les jours ouverts s'il n'y en avait aucune).
  const poserPause = (x: { de: string; a: string }) => {
    setSemaine((s) => s.map((p) => (p.ferme ? p : !avecPause || p.pause ? { ...p, pause: x } : p)))
    fermer()
  }
  const envoyer = async () => {
    if (placesChangees)
      await g.faire('reglage', 'capacite', (s, o) => s.relais.demanderCapacite(places, o), { ok: places > cap.placesDeclarees ? 'Demande de hausse envoyée à BelivaY.' : 'Demande de baisse envoyée à BelivaY.', file: 'Hors connexion : la demande partira au retour du réseau.' })
    if (horairesChanges) await g.faire('reglage', 'horaires', (s, o) => s.relais.demanderHoraires(semaine, o), { ok: 'Demande de nouveaux horaires envoyée à BelivaY.', file: 'Hors connexion : la demande partira au retour du réseau.' })
  }
  const rien = !placesChangees && !horairesChanges
  const verifTexte = (v: 'visite' | 'distance') => t(v === 'visite' ? 'vérifiée lors d’une visite BelivaY' : 'revue à distance par BelivaY')

  return (
    <Ecran
      route="capacite"
      fixes={
        <>
          {feuille === 'jour' && jourOuvert >= 0 && jourOuvert < 7 && <FeuilleJour key={jourOuvert} jour={jourOuvert} plage={semaine[jourOuvert]} fermer={fermer} poser={(p) => (changerJour(jourOuvert, p), fermer())} />}
          {feuille === 'pause' && <FeuillePause pause={pauseVue ?? f.horaires.semaine.find((p) => p.pause)?.pause ?? null} semaine={semaine} fermer={fermer} poser={poserPause} />}
        </>
      }
    >
      <div className="p-0hxmj8 r-pile">
        <div>
          <h1 className="p-bvhkrl">{t('Capacité et horaires')}</h1>
          <div className="p-t2u0o2">{t('Ce que vous déclarez ici décide des colis qu’on vous envoie. Chaque changement est une demande validée par BelivaY.')}</div>
        </div>
        <section className="p-tfhltl" aria-labelledby="p10-places">
          <div className="p-yscrc8" id="p10-places">
            {t('PLACES DE STOCKAGE')}
          </div>
          <div className="p-wxow1i">
            <button
              type="button"
              aria-label={t('Retirer une place')}
              className="p-ou1yyg"
              aria-disabled={!!dC || places <= occ || undefined}
              data-raison={dC ? t('Une demande est en attente de BelivaY.') : places <= occ ? t('Impossible de descendre sous les places occupées.') : undefined}
              onClick={() => !dC && places > occ && setPlaces(places - 1)}
            >
              <Icone nom="minus" taille={22} className="p-emic6i" />
            </button>
            <div className="p-txto41" aria-live="polite">
              <div className={'p-nu35xx' + (places !== cap.placesDeclarees ? ' p10-propose' : '')}>{places}</div>
              <div className="p-nyatr2">{places === cap.placesDeclarees ? tf('places déclarées · {n} occupées', { n: occ }) : tf('places demandées · {d} déclarées · {n} occupées', { d: cap.placesDeclarees, n: occ })}</div>
            </div>
            <button type="button" aria-label={t('Ajouter une place')} className="p-n18gp0" aria-disabled={!!dC || undefined} data-raison={dC ? t('Une demande est en attente de BelivaY.') : undefined} onClick={() => !dC && setPlaces(places + 1)}>
              <Icone nom="r-plus" taille={22} className="p-gqbtfa" />
            </button>
          </div>
          <div className="p-47w5eb" role="meter" aria-valuemin={0} aria-valuemax={places} aria-valuenow={occ} aria-label={tf('{n} places occupées sur {total}', { n: occ, total: places })}>
            <span className={'p10-barre' + (sature ? ' p10-sature' : '')} style={{ width: Math.min(100, places > 0 ? (occ / places) * 100 : 100) + '%' }} />
          </div>
          <div className="p-0jgkhm">
            {(['S', 'M', 'L'] as const).map((c) => (
              <div key={c} className="p-xc7iv4">
                <div className="p-egexjc">{cap.placesParClasse[c]}</div>
                <div className="p-own8v2">{t(c === 'S' ? 'petit (S)' : c === 'M' ? 'moyen (M)' : 'encombrant (L)')}</div>
              </div>
            ))}
            <div className="p-ysppsz">
              <div className="p-kxt3jo" aria-hidden="true">
                {'✕'}
              </div>
              <div className="p-own8v2">{t('XL, hors gabarit')}</div>
            </div>
          </div>
          <div className="p-81u2s6">
            {tf('Au-delà de {p} %, les nouveaux clients sont orientés vers un autre relais. Les retours déposés ne comptent pas dans vos places ({n} en ce moment).', { p: cap.seuilPct, n: cap.retoursDeposes })}{' '}
            {hausseDistance !== null ? tf('Une hausse jusqu’à {n} places est revue à distance (palier Confirmé) ; au-delà, elle est vérifiée lors d’une visite.', { n: hausseDistance }) : t('Toute hausse de places est vérifiée lors d’une visite.')}{' '}
            {t('Une baisse est revue à distance.')}
          </div>
          <div className={sature ? 'p-fht1zk' : 'p10-demande'} role="note">
            <Icone nom={sature ? 'r-alerte' : 'r-personne'} taille={18} />
            <div>
              {sature
                ? tf('Avec {n} places, vous n’êtes plus proposé aux nouveaux clients : {o} places occupées, seuil de {p} % atteint. Les colis déjà en route arrivent quand même.', { n: places, o: occ, p: cap.seuilPct })
                : tf('Avec {n} places, vous restez proposé aux nouveaux clients jusqu’à {k} places occupées ({p} %). Aujourd’hui : {o} occupées ({taux} %).', { n: places, k: seuilPlaces, p: cap.seuilPct, o: occ, taux: tauxActuel })}
            </div>
          </div>
          {dC && (
            <div className="p10-demande" role="status">
              <Icone nom="hourglass" taille={18} />
              <div>
                <b>{tf('Demande du {date} : {n} places', { date: jourLong(dC.le, langue), n: dC.places })}</b> · {t(dC.sens === 'hausse' ? 'hausse' : 'baisse')}, {verifTexte(dC.verification)}. {t('Vos places déclarées restent celles d’aujourd’hui jusqu’à la réponse.')}
                <div>
                  <button type="button" className="p10-lien" onClick={() => void g.faire('reglage', 'capacite', (s, o) => s.relais.annulerDemandeCapacite(o), { ok: 'Demande de places annulée.' })}>
                    {t('Annuler la demande de places')}
                  </button>
                  {DEMO && (
                    <button type="button" className="p10-lien" onClick={() => void source.relais.simulerAccord('capacite').then(() => g.setMessage({ ton: 'ok', texte: t('BelivaY a accepté vos nouvelles places.') }))}>
                      {t('Démonstration : BelivaY accepte les places')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-colis" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">{t('Encombrants (L) acceptés')}</div>
              <div className="p-dfa05r">{t('Un relais ne refuse jamais un colis petit, moyen ou encombrant ; les colis XL et hors gabarit vont à domicile.')}</div>
            </div>
            <span className="p-nax3x4">{t('Toujours')}</span>
          </div>
        </section>
        <section className="p-yi6rkz" id="horaires" aria-labelledby="p10-horaires">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu" id="p10-horaires">
              {t('Horaires d’ouverture')}
            </h2>
          </div>
          <div className="p-lxynlg" aria-hidden="true">
            <span />
            <div className="p-h6lji0">
              {GRADUATIONS.map((x) => (
                <span key={x}>{heure(x, langue)}</span>
              ))}
            </div>
          </div>
          {semaine.map((p, k) => {
            const ici = k === aujourdhui
            const change = !dH && !memePlage(p, f.horaires.semaine[k])
            const de = p.ouverture ? minutesDe(p.ouverture) : 0
            const a = p.fermeture ? minutesDe(p.fermeture) : 0
            const gauche = Math.max(0, ((de - ECHELLE.de) / (ECHELLE.a - ECHELLE.de)) * 100)
            const largeur = Math.max(4, Math.min(100 - gauche, ((Math.min(a, ECHELLE.a) - Math.max(de, ECHELLE.de)) / (ECHELLE.a - ECHELLE.de)) * 100))
            const texte = p.ferme ? t('Fermé') : creneau([p.ouverture!, p.fermeture!], langue)
            return (
              <div key={k} className={ici ? 'p-aobem4' : 'p-ryy194'} aria-current={ici ? 'date' : undefined}>
                <span className={ici ? 'p-t8bz1l' : 'p-m4p7pl'}>
                  {t(JOURS[k])}
                  {change && <span className="p10-change p10-sr">{t('modifié')}</span>}
                </span>
                {p.ferme ? (
                  <div className="p-hvhy64">
                    <span className="p-rkvtp4">{t('Fermé')}</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="p10-jour"
                    aria-label={tf('{jour} : {h}, changer', { jour: t(JOURS_LONGS[k]), h: texte }) + (p.pause ? ' · ' + tf('pause {h}', { h: creneau([p.pause.de, p.pause.a], langue) }) : '')}
                    aria-disabled={!!dH || undefined}
                    data-raison={dH ? t('Une demande d’horaires est en attente de BelivaY.') : undefined}
                    onClick={() => !dH && ouvrir('jour', k)}
                  >
                    <div className="p-hvhy64">
                      <div className={k === 5 ? 'p-ctu1jq' : 'p-s1houk'} style={{ left: gauche + '%', width: largeur + '%' }}>
                        {texte}
                      </div>
                    </div>
                  </button>
                )}
                <Interrupteur on={!p.ferme} label={tf('{jour} : ouvert', { jour: t(JOURS_LONGS[k]) })} changer={dH ? undefined : (v) => basculerJour(k, v)} raison={t('Une demande d’horaires est en attente de BelivaY.')} />
              </div>
            )
          })}
          <div className="p-81u2s6">{t('Ces horaires s’affichent quand les clients choisissent leur relais, et les livreurs planifient dessus. Un jour fermé disparaît des créneaux des clients et n’est jamais facturé. Un écart constaté fait baisser la Ponctualité.')}</div>
          {dH && (
            <div className="p10-demande" role="status">
              <Icone nom="hourglass" taille={18} />
              <div>
                <b>{tf('Nouveaux horaires demandés le {date}', { date: jourLong(dH.le, langue) })}</b> · {t('les clients et les livreurs voient vos horaires actuels jusqu’à l’accord de BelivaY.')}
                <div>
                  <button type="button" className="p10-lien" onClick={() => void g.faire('reglage', 'horaires', (s, o) => s.relais.annulerDemandeHoraires(o), { ok: 'Demande d’horaires annulée.' })}>
                    {t('Annuler la demande d’horaires')}
                  </button>
                  {DEMO && (
                    <button type="button" className="p10-lien" onClick={() => void source.relais.simulerAccord('horaires').then(() => g.setMessage({ ton: 'ok', texte: t('BelivaY a accepté vos nouveaux horaires : ils sont en vigueur.') }))}>
                      {t('Démonstration : BelivaY accepte les horaires')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
        <section className="p-yi6rkz" aria-labelledby="p10-pause">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu" id="p10-pause">
              {t('Pause déjeuner')}
            </h2>
          </div>
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-horloge" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              {avecPause && pauseVue ? (
                <button type="button" className="p10-lien p-ife3a2" aria-disabled={!!dH || undefined} data-raison={dH ? t('Une demande d’horaires est en attente de BelivaY.') : undefined} onClick={() => !dH && ouvrir('pause')} aria-label={tf('Pause {h}, changer', { h: creneau([pauseVue.de, pauseVue.a], langue) })}>
                  {creneau([pauseVue.de, pauseVue.a], langue)}
                </button>
              ) : (
                <div className="p-ife3a2">{t('Sans pause')}</div>
              )}
              <div className="p-dfa05r">{avecPause ? tf('Les clients la voient ; aucun livreur n’est envoyé à ce moment · {jours}', { jours: semaine.flatMap((p, k) => (p.pause && !p.ferme ? [t(JOURS[k])] : [])).join(' ') }) : t('Ouvert sans interruption les jours ouverts')}</div>
            </div>
            <Interrupteur on={avecPause} label={t('Pause déjeuner')} changer={dH ? undefined : basculerPause} raison={t('Une demande d’horaires est en attente de BelivaY.')} />
          </div>
        </section>
        <Annonce message={g.message} />
        <button type="button" className="p-ncx7qc" aria-disabled={rien || g.enCours || undefined} data-raison={rien ? t('Rien à demander : changez vos places ou vos horaires.') : undefined} onClick={() => !rien && !g.enCours && void envoyer()}>
          <Icone nom="check" taille={18} className="p-7dsggt" />
          {t('Demander ces changements')}
        </button>
        <Link to={chemin('fermeture')} className="p-rbzobc">
          <Icone nom="r-fermeture" taille={18} className="p-emic6i" />
          {t('Fermer exceptionnellement')}
        </Link>
      </div>
    </Ecran>
  )
}

/** Horaire d'un jour : ouverture et fermeture (la pause se règle à part). */
function FeuilleJour(p: { jour: number; plage: PlageJour | undefined; fermer: () => void; poser: (x: PlageJour) => void }) {
  const { t, tf } = usePreferences()
  const [ouv, setOuv] = useState(p.plage?.ouverture ?? '')
  const [fer, setFer] = useState(p.plage?.fermeture ?? '')
  if (!p.plage) return null
  const pause = p.plage.pause
  const valide = !!ouv && !!fer && ouv < fer && (!pause || (ouv < pause.de && pause.a < fer))
  return (
    <Feuille ouverte fermer={p.fermer} titre={tf('Horaires du {jour}', { jour: t(JOURS_LONGS[p.jour]).toLowerCase() })} classe="p10-feuille">
      <h2>{t(JOURS_LONGS[p.jour])}</h2>
      <form
        className="p10-col"
        onSubmit={(e) => {
          e.preventDefault()
          if (valide) p.poser({ ...p.plage!, ferme: false, ouverture: ouv, fermeture: fer })
        }}
      >
        <div className="p10-heures">
          <label className="p-ky12xr">
            {t('OUVERTURE')}
            <input type="time" className="p-afs6hh" value={ouv} onChange={(e) => setOuv(e.target.value)} required />
          </label>
          <label className="p-ky12xr">
            {t('FERMETURE')}
            <input type="time" className="p-afs6hh" value={fer} onChange={(e) => setFer(e.target.value)} required />
          </label>
        </div>
        {!valide && ouv && fer && <p className="p-81u2s6 p10-txt" role="alert">{t(pause ? 'La fermeture doit suivre l’ouverture, et la pause tenir entre les deux.' : 'La fermeture doit suivre l’ouverture.')}</p>}
        <p className="p-81u2s6 p10-txt">{t('Ce changement rejoint votre demande ; il s’applique après l’accord de BelivaY.')}</p>
        <button type="submit" className="p-ncx7qc" disabled={!valide}>
          {t('Garder ces heures')}
        </button>
        <button type="button" className="p-rbzobc" onClick={p.fermer}>
          {t('Annuler')}
        </button>
      </form>
    </Feuille>
  )
}

/** Pause déjeuner : mêmes heures pour les jours qui en ont une (tous les jours ouverts s'il n'y en avait aucune). */
function FeuillePause(p: { pause: { de: string; a: string } | null; semaine: PlageJour[]; fermer: () => void; poser: (x: { de: string; a: string }) => void }) {
  const { t } = usePreferences()
  const [de, setDe] = useState(p.pause?.de ?? '')
  const [a, setA] = useState(p.pause?.a ?? '')
  const valide = !!de && !!a && de < a && p.semaine.every((x) => x.ferme || !x.ouverture || (x.ouverture < de && a < x.fermeture!))
  return (
    <Feuille ouverte fermer={p.fermer} titre={t('Pause déjeuner')} classe="p10-feuille">
      <h2>{t('Pause déjeuner')}</h2>
      <form
        className="p10-col"
        onSubmit={(e) => {
          e.preventDefault()
          if (valide) p.poser({ de, a })
        }}
      >
        <div className="p10-heures">
          <label className="p-ky12xr">
            {t('DÉBUT')}
            <input type="time" className="p-afs6hh" value={de} onChange={(e) => setDe(e.target.value)} required />
          </label>
          <label className="p-ky12xr">
            {t('FIN')}
            <input type="time" className="p-afs6hh" value={a} onChange={(e) => setA(e.target.value)} required />
          </label>
        </div>
        {!valide && de && a && <p className="p-81u2s6 p10-txt" role="alert">{t('La pause doit finir après son début et tenir dans les heures d’ouverture.')}</p>}
        <p className="p-81u2s6 p10-txt">{t('Les clients la voient ; aucun livreur n’est envoyé pendant la pause.')}</p>
        <button type="submit" className="p-ncx7qc" disabled={!valide}>
          {t('Garder cette pause')}
        </button>
        <button type="button" className="p-rbzobc" onClick={p.fermer}>
          {t('Annuler')}
        </button>
      </form>
    </Feuille>
  )
}
