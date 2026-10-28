// ENT-P14 — Incidents à valider, reprise sur route('incidents') du prototype : tête datée, un bandeau (SOS, incident
// bloquant et son échéance, erreur), à gauche « À valider (n) » en cartes (compte à rebours, non bloquant, priorité
// absolue) puis « Traités aujourd'hui », et « Règles de décision » ; à droite le détail (entB_incDetail) : famille,
// bloquant, titre, lieu, anneau « avant HH h MM » ; livreur et paquet, heures d'origine et du serveur, distance à
// l'arrêt ; photos sans retouche et position ; note du livreur ; conséquence proposée par le système ; votre décision
// (motif, Valider, Refuser, Transférer ou Appeler). Bloquant : décision dans le délai du registre, sinon l'opérateur de
// zone BelivaY décide (ENT-P14R-01, décision tardive refusée) ; valider ne sanctionne rien (ENT-P14R-02) ; lire la
// preuve d'abord (RG-R111) ; refus avec motif d'au moins longueur_min_motif_refus caractères (RG-R113, RG-R114) ;
// transfert à un livreur éligible (rencontre → scan de chaque colis → garde transférée : ENT-P14R-03, DED-28) ; appel
// masqué (DP-61). Sécurité : passe devant tout, validé d'office, jamais refusé (RG-R109, RG-R112). Décidé : auteur,
// motif, tournée ajustée.
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Feuille, useFeuille } from '@client/composants/Feuille'
import { jouer } from '@client/composants/Sons'
import { sonner } from '../../composants/marque-sonore'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { AucunResultat, Banniere, BarrePouce, Choix, Compte, correspond, Divide, Hint, Li, Limite, Note, Panel, Pill, Puces, Px, Qui, Rebours, Recherche, St, Tete, Tri, useAnnuler } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import { source } from '../../donnees/source'
import type { GenreIncident, Incident, Transfert } from '../../donnees/domaines/incidents'
import { usePreferences } from '../../preferences'
import { useHorloge, useSession } from '../../session'
import { Anneau, BandeauErreur, Chargement, Retour, Vide, useDonnees, useHeure } from '../ENT-05/commun'
import { NOM_VEHICULE } from '../ENT-05/Affectation'
import { REGLES } from '../../calculs/livraison/regles-ecrans'
import { geste } from '../../donnees/fileHorsLigne'
import { FeuilleAppel } from './Appel'
import { Carte } from './Carte'
import { Photo } from './Photo'
import './missions.css'
import { TexteTraduisible } from '@client/traduction/Traduisible'

export const NOM_INCIDENT: Record<GenreIncident, string> = {
  client_absent: 'Client absent',
  boutique_fermee: 'Boutique fermée',
  colis_abime: 'Colis abîmé au ramassage',
  adresse: 'Lieu introuvable',
  panne: 'Panne du véhicule',
  accident: 'Accident',
  agression: 'Agression',
  non_conforme: 'Article non conforme',
}
const ICONE_INCIDENT: Record<GenreIncident, string> = {
  client_absent: 'user-x',
  boutique_fermee: 'store',
  colis_abime: 'package-x',
  adresse: 'map-pin',
  panne: 'bike',
  accident: 'shield-alert',
  agression: 'shield-alert',
  non_conforme: 'package-x',
}
const FAMILLE: Record<Incident['famille'], string> = { blocage: 'Arrêt bloqué', colis: 'Colis', vehicule: 'Véhicule', securite: 'Sécurité' }
const CONSEQUENCE: Record<Incident['consequence'], [string, string, string]> = {
  arret_retire: ['route', 'Dissocier l’arrêt', 'Arrêt retiré de la tournée ; déplacement payé à votre entreprise et imputé au vendeur ; les colis restent chez lui.'],
  nouvelle_tentative: ['rotate-cw', 'Nouvelle tentative', 'Nouvelle tentative dans la tournée ; le client est prévenu de la nouvelle heure.'],
  transfert: ['arrow-right-left', 'Transfert du paquet', 'Transfert du paquet à un autre livreur éligible.'],
  reserve: ['package-check', 'Colis pris avec réserve', 'Colis pris avec réserve : la photo protège votre entreprise en cas de litige.'],
  retour_relais: ['store', 'Retour au relais de la zone', 'Colis déposé au relais de la zone ; le client reçoit son code.'],
  aucune: ['route', 'La tournée continue', 'Aucun changement de tournée.'],
}
const STATUT: Record<Incident['statut'], [string, 'amber' | 'green' | 'red' | 'or']> = {
  a_valider: ['À valider', 'or'],
  valide: ['Validé', 'green'],
  refuse: ['Refusé, livreur rappelé', 'red'],
  escalade: ['Décidé par l’opérateur de zone', 'amber'],
  securite: ['Sécurité : validé d’office', 'red'],
}
type Motif = 'concordant' | 'insuffisant' | 'autre'
const MOTIFS: { id: Motif; t: string }[] = [
  { id: 'concordant', t: 'Photo et position concordantes' },
  { id: 'insuffisant', t: 'Preuve insuffisante' },
  { id: 'autre', t: 'Autre motif' },
]

/** entB_incCard : carte d'un incident (icône, titre, minutes restantes, livreur · paquet · heure). */
// Délai de réponse d'un incident bloquant : ambre sous la moitié du délai du registre, rouge sous 2 minutes.
const URGENT_MS = (REGLES.incidentMin * 60_000) / 2
const CRITIQUE_MS = 2 * 60_000

function CarteIncident({ i, choisi, choisir, envoi }: { i: Incident; choisi: boolean; choisir(): void; envoi?: boolean }) {
  const { t } = usePreferences()
  const h = useHeure()
  const secu = i.famille === 'securite'
  const droite = envoi ? (
    <Pill ton="acc" sm icone="send">
      {t('Décision en cours d’envoi')}
    </Pill>
  ) : i.statut !== 'a_valider' ? (
      <St t={i.decision ? `${t(STATUT[i.statut][0])} · ${h(i.decision.le)}` : t(STATUT[i.statut][0])} ton={STATUT[i.statut][1]} />
    ) : secu ? (
      <Pill ton="red" sm>
        {t('Priorité absolue')}
      </Pill>
    ) : i.bloquant && i.decideAvant ? (
      <Rebours fin={i.decideAvant} urgent={URGENT_MS} critique={CRITIQUE_MS} echu={t('Opérateur de zone')} />
    ) : (
      <Pill ton="ink" sm>
        {t('Non bloquant')}
      </Pill>
    )
  return (
    <button type="button" className={'entb-inc' + (choisi ? ' on' : '') + (secu ? ' secu' : '')} onClick={choisir} aria-current={choisi ? 'true' : undefined}>
      <span className={'ic ' + (secu ? 'red' : i.bloquant ? 'or' : 'amber')}>
        <Icone nom={ICONE_INCIDENT[i.genre]} taille={20} />
      </span>
      <span className="grow">
        <span className="row" style={{ gap: 6, justifyContent: 'space-between' }}>
          <b>{t(NOM_INCIDENT[i.genre])}</b>
          {droite}
        </span>
        <span className="t12 c3" style={{ display: 'block', marginTop: 3 }}>
          {i.livreur.nom} · {i.paquetId} · {h(i.recuLe)}
        </span>
      </span>
    </button>
  )
}

function FeuilleTransfert({ ouverte, fermer, paquetId }: { ouverte: boolean; fermer(): void; paquetId: string }) {
  const { t, tf } = usePreferences()
  const h = useHeure()
  const tic = useHorloge(5000)
  const el = useDonnees(() => (paquetId ? source.affectation.eligibles(paquetId) : Promise.resolve(null)), [paquetId])
  const tr = useDonnees(() => source.incidents.transferts(), [Math.floor(tic / 5000)])
  const [erreur, setErreur] = useState<string | null>(null)
  const [garde, setGarde] = useState(false)
  const [vers, setVers] = useState<string | null>(null)
  const courant = tr.donnees?.find((x) => x.paquetId === paquetId) ?? null
  // Réaffectation en cours de route : geste qui tient sans réseau (envoyé au retour, refus montré avec sa raison).
  const transferer = async (id: string) => {
    setErreur(null)
    const g = await geste('Transférer un paquet', (s) => s.incidents.transferer(paquetId, id), paquetId)
    if (g.etat === 'en_file') return setGarde(true)
    const r = g.r
    if (!r.ok) setErreur(t(r.raison === 'non_eligible' ? 'Ce livreur n’est pas éligible pour ce paquet.' : 'Ce paquet ne peut pas être transféré maintenant (pas en cours, ou un transfert est déjà engagé).'))
    else sonner('transfert')
    tr.relire()
  }
  const ETAPES: [Transfert['etape'], string][] = [
    ['rencontre', 'Rencontre'],
    ['scan', 'Scan de chaque colis'],
    ['transferee', 'Garde transférée'],
  ]
  const choisi = vers ?? el.donnees?.eligibles[0]?.id ?? null
  const nomChoisi = el.donnees?.eligibles.find((x) => x.id === choisi)?.nom ?? ''
  const cur = courant ? ETAPES.findIndex(([x]) => x === courant.etape) : 0
  return (
    <Feuille ouverte={ouverte} fermer={fermer} titre={tf('Transférer {p}', { p: paquetId })}>
      <div className="grab"></div>
      <Px>
        <h2 className="lv-h2">
          <Icone nom="arrow-right-left" taille={18} />
          {tf('Transférer {p}', { p: paquetId })}
        </h2>
        <p className="t13 c3" style={{ margin: '6px 0 12px' }}>
          {t('Les deux livreurs se rencontrent ; le nouveau livreur scanne chaque étiquette ; la garde change de main au scan de chaque colis, jamais sans. Pour le vendeur et le client, rien ne change.')}
        </p>
        {erreur && <Retour ton="rouge">{erreur}</Retour>}
        {garde && <Retour ton="ambre">{t('Transfert gardé sur cet appareil : il partira au retour du réseau ; les livreurs le verront à ce moment-là.')}</Retour>}
        {courant ? (
          <>
            <div className="entb-tsteps">
              <div className="stepper">
                {ETAPES.map(([e, n], k) => (
                  <div key={e} className={'st' + (k < cur || courant.etape === 'transferee' ? ' done' : k === cur ? ' cur' : '')}>
                    <b>{k < cur || courant.etape === 'transferee' ? <Icone nom="check" taille={14} /> : k + 1}</b>
                    <span>{t(n)}</span>
                  </div>
                ))}
              </div>
            </div>
            <Note ton="acc" icone="scan-line">
              {tf('{a} remet à {b} ; {b} scanne chaque étiquette.', { a: courant.de.nom, b: courant.vers.nom })}
            </Note>
            <ul className="lv-journal mt14">
              {courant.etiquettes.map((x) => (
                <li key={x.etiquette}>
                  <time>{x.scanneLe ? h(x.scanneLe) : '—'}</time>
                  <span>
                    <span className="lv-etq">{x.etiquette}</span> {x.scanneLe ? <span className="pill ok">{t('Scanné')}</span> : <span className="pill">{t('En attente du scan')}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : !el.donnees ? (
          <Chargement n={2} hauteur={56} />
        ) : el.donnees.eligibles.length === 0 ? (
          <Vide icone="user-x" titre={t('Aucun livreur éligible disponible')} raison={t('Le transfert exige un livreur de la zone, certifié, disponible et équipé du bon véhicule.')}>
            <Link className="btn secondary" to={chemin('flotte')}>
              {t('Voir la flotte')}
            </Link>
          </Vide>
        ) : (
          <>
            <div role="radiogroup" aria-label={t('Livreur qui reprend le paquet')}>
              {el.donnees.eligibles.map((x) => (
                <button key={x.id} type="button" role="radio" aria-checked={choisi === x.id} className={'radio' + (choisi === x.id ? ' on' : '')} onClick={() => setVers(x.id)} style={{ width: '100%', font: 'inherit', textAlign: 'left' }}>
                  <span className="rd"></span>
                  <span className="grow">
                    <span className="rt" style={{ display: 'block' }}>
                      {x.nom}
                    </span>
                    <span className="rs" style={{ display: 'block' }}>
                      {t(NOM_VEHICULE[x.vehicule])}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <div className="entb-tsteps">
              <div className="stepper">
                {ETAPES.map(([e, n], k) => (
                  <div key={e} className={'st' + (k === 0 ? ' cur' : '')}>
                    <b>{k + 1}</b>
                    <span>{t(n)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="btns" style={{ marginTop: 16 }}>
              <button type="button" className="btn secondary" onClick={fermer}>
                {t('Annuler')}
              </button>
              {choisi && (
                <button type="button" className="btn primary" onClick={() => transferer(choisi)}>
                  <Icone nom="arrow-right-left" taille={18} />
                  {tf('Transférer à {n}', { n: nomChoisi })}
                </button>
              )}
            </div>
          </>
        )}
        <Hint icone="lock">{t('Aucun colis ne change de main sans scan : un transfert sans scan est interdit.')}</Hint>
      </Px>
    </Feuille>
  )
}

/** C.stop du prototype : arrêt de la tournée (fait, en cours, retiré). */
function Arret({ n, st, t, s }: { n: number; st?: 'done' | 'cur' | 'bad'; t: string; s?: string }) {
  return (
    <div className={'stop ' + (st ?? '')}>
      <span className="sn">{st === 'done' ? <Icone nom="check" taille={15} /> : n}</span>
      <span className="grow">
        <span className="st" style={{ display: 'block' }}>
          {t}
        </span>
        {s && (
          <span className="ss" style={{ display: 'block' }}>
            {s}
          </span>
        )}
      </span>
    </div>
  )
}

/** Petite carte de l'incident : la position du livreur pendant la mission, dans sa zone. */
function MiniCarte({ i }: { i: Incident }) {
  const { tf } = usePreferences()
  const pos = useDonnees(() => source.carte.positions(), [])
  const fond = useDonnees(() => source.carte.fond(), [])
  const p = pos.donnees?.find((x) => x.missionId === i.missionId) ?? null
  const z = p && fond.donnees ? fond.donnees.zones.find((x) => x.code === p.zone) ?? null : null
  return (
    <div className="entb-imap">
      {p && z && fond.donnees && <Carte zones={[z]} lieux={fond.donnees.lieux.filter((l) => l.zone === z.code)} positions={[p]} traces={[]} selection={null} hauteur={220} legende={false} />}
      <div className="t12 c3 mt6">
        <Icone nom="map-pin" taille={13} /> {i.distanceArretM !== null ? tf('à {m} m de l’arrêt', { m: i.distanceArretM }) : i.lieu}
      </div>
    </div>
  )
}

type RetourGeste = { ton: 'ok' | 'rouge' | 'ambre'; texte: string } | null
type Differer = ReturnType<typeof useAnnuler>['differer']
function Detail({ i, garder, retour, setRetour, differer, envoi, relire }: { i: Incident; garder(): void; retour: RetourGeste; setRetour(r: RetourGeste): void; differer: Differer; envoi: boolean; relire(): void }) {
  const { t, tf } = usePreferences()
  const h = useHeure()
  const refus = useFeuille('refus')
  const appel = useFeuille('appel')
  const naviguer = useNavigate()
  const [motif, setMotif] = useState('')
  const [lu, setLu] = useState(false)
  const [choix, setChoix] = useState<Motif>('concordant')
  const [occupe, setOccupe] = useState(false)
  const mission = useDonnees(() => source.missions.mission(i.missionId), [i.missionId, i.statut])
  const maintenant = useHorloge(1000)
  // La décision part par la file hors connexion (gardée sans réseau) ; « Annuler » pendant 5 s avant l'envoi, sauf
  // si le délai d'un incident bloquant est trop proche pour attendre.
  const decider = (d: 'valider' | 'refuser') => {
    garder() // l'incident décidé reste affiché avec le résultat
    const m = d === 'refuser' ? motif : choix === 'concordant' ? t('Photo et position concordantes') : ''
    if (d === 'refuser' && m.trim().length < REGLES.motifRefusMin) return setRetour({ ton: 'rouge', texte: t('Le motif est trop court.') })
    if (refus.ouverte) refus.fermer()
    setMotif('')
    setRetour(null)
    const envoyer = async () => {
      setOccupe(true)
      const g = await geste(d === 'valider' ? 'Valider un incident' : 'Refuser un incident', (s) => s.incidents.decider(i.id, d, m), i.paquetId)
      setOccupe(false)
      if (g.etat === 'en_file') return setRetour({ ton: 'ambre', texte: t('Décision gardée sur cet appareil : elle partira au retour du réseau. Si le délai passe d’ici là, l’opérateur de zone BelivaY tranche.') })
      const r = g.r
      relire()
      if (r.ok) {
        jouer('valide')
        setRetour({ ton: 'ok', texte: t(d === 'valider' ? 'Incident validé : la tournée est ajustée et le livreur prévenu. Votre nom et l’heure sont au journal.' : 'Incident refusé : le motif est envoyé au livreur, qui reprend la tournée.') })
      } else setRetour({ ton: 'rouge', texte: t(r.raison === 'motif' ? 'Le motif est trop court.' : r.raison === 'securite' ? 'Un incident de sécurité ne se refuse jamais.' : 'Cet incident est déjà décidé (par vous, un collègue ou l’opérateur de zone).') })
    }
    if (i.bloquant && i.decideAvant && i.decideAvant - maintenant < 15_000) return void envoyer()
    differer('inc-' + i.id, tf(d === 'valider' ? 'Incident « {i} » validé' : 'Incident « {i} » refusé', { i: t(NOM_INCIDENT[i.genre]) }), envoyer)
  }
  const echu = !!(i.bloquant && i.decideAvant && i.decideAvant <= maintenant)
  const ouvrirRefus = () => {
    if (!motif && choix === 'insuffisant') setMotif(t('Preuve insuffisante : '))
    refus.ouvrir()
  }
  const securite = i.famille === 'securite'
  const ouvert = i.statut === 'a_valider' && !envoi
  const court = motif.trim().length < REGLES.motifRefusMin
  const prenom = i.livreur.nom.split(' ')[0]
  const [ic, titreCons, texteCons] = CONSEQUENCE[i.consequence]
  const m = mission.donnees
  return (
    <section className="panel entb-idp" aria-labelledby="in-detail">
      {retour && <Retour ton={retour.ton}>{retour.texte}</Retour>}
      {envoi && (
        <Note ton="acc" icone="send" className="mt14">
          {t('Décision prise : elle part dans quelques secondes. « Annuler » la reprend avant l’envoi.')}
        </Note>
      )}
      {i.decision && (
        <div className={'entb-dec ' + (i.statut === 'refuse' ? 'ko' : 'ok')} style={{ marginBottom: 16 }}>
          <Icone nom={i.statut === 'refuse' ? 'circle-x' : 'circle-check'} taille={22} />
          <div>
            <b>
              {tf(i.statut === 'refuse' ? 'Refusé par {p} à {h}' : 'Validé par {p} à {h}', { p: i.decision.par, h: h(i.decision.le) })}
              {i.decision.operateur && ' · ' + t('opérateur de zone BelivaY')}
            </b>
            {i.decision.motif && <div className="t13">{tf('Motif : « {m} »', { m: i.decision.motif })}</div>}
          </div>
        </div>
      )}
      <div className="entb-idh">
        <span className={'ic ' + (securite ? 'red' : 'or')}>
          <Icone nom={ICONE_INCIDENT[i.genre]} taille={24} />
        </span>
        <div className="grow">
          <div className="row wrap" style={{ gap: 6 }}>
            <Pill ton="ink" sm>
              {t(FAMILLE[i.famille])}
            </Pill>
            {securite ? (
              <Pill ton="red" sm icone="siren">
                {t('Priorité absolue')}
              </Pill>
            ) : i.bloquant ? (
              <Pill ton="or" sm>
                {t('Bloquant')}
              </Pill>
            ) : (
              <Pill ton="ink" sm>
                {t('Non bloquant · la tournée continue')}
              </Pill>
            )}
            {!ouvert && <St t={t(STATUT[i.statut][0])} ton={STATUT[i.statut][1]} />}
          </div>
          <h2 className="entb-it" id="in-detail">
            {t(NOM_INCIDENT[i.genre])}
          </h2>
          <div className="t13 c3">{i.lieu}</div>
        </div>
        {ouvert && i.bloquant && i.decideAvant && !securite && (
          <div className="entb-idr">
            <Anneau debut={i.recuLe} fin={i.decideAvant} taille={64} />
          </div>
        )}
      </div>
      <div className="entb-iwho">
        <Qui nom={i.livreur.nom} sous={t(NOM_VEHICULE[i.livreur.vehicule])} av={i.livreur.initiales} />
        <div className="entb-imeta">
          <Link to={chemin('paquet', { id: i.paquetId })} aria-label={tf('Paquet {p}', { p: i.paquetId })}>
            <Pill ton="acc" sm icone="boxes">
              {i.paquetId}
            </Pill>
          </Link>
          <span className="t12 c3">
            {tf('Déclaré à {o} (téléphone) · reçu à {s} (serveur)', { o: h(i.declareLe), s: h(i.recuLe) })}
            {i.distanceArretM !== null && ' · ' + tf('à {m} m de l’arrêt', { m: i.distanceArretM })}
          </span>
        </div>
      </div>
      {i.photos.length > 0 ? (
        <div className="entb-iph">
          <div>
            <div className="photos p2">
              {i.photos.map((p) => (
                <Photo key={p.id} sujet={p.sujet} le={p.le} recuLe={p.recuLe} lieu={i.lieu} />
              ))}
            </div>
            <div className="t12 c3 mt6">{t('Photos telles que reçues : aucune retouche ni recadrage n’est possible.')}</div>
          </div>
          <MiniCarte i={i} />
        </div>
      ) : (
        <Note ton="red" icone="shield-alert" className="mt14">
          {securite ? tf('Aucune photo exigée : la sécurité du livreur passe avant la preuve. Position partagée {m} minutes avec votre entreprise et le support BelivaY.', { m: REGLES.partageSosMin }) : t('Aucune photo jointe à cet incident.')}
        </Note>
      )}
      <div className="entb-inote">
        <span className="kick">{t('Note du livreur')}</span>
        <div>« <TexteTraduisible texte={i.note} /> »</div>
      </div>
      <Divide>{t('Conséquence proposée par le système')}</Divide>
      {securite ? (
        <>
          <Li icone="shield-check" ton="acc" t={t('Validation implicite')} s={tf('Aucune décision à prendre : la sécurité de {n} passe avant le colis.', { n: prenom })} />
          <Li icone="map-pin" ton="acc" t={tf('Position partagée {m} minutes', { m: REGLES.partageSosMin })} s={t('avec votre entreprise et le support BelivaY, puis arrêt automatique.')} />
          <Li icone="headset" ton="acc" t={t('La console BelivaY est prévenue')} s={t('Un dossier est ouvert ; l’opérateur de zone vous appelle.')} />
        </>
      ) : (
        <>
          <Li icone={ic} ton="acc" t={t(titreCons)} s={t(texteCons)} />
          <Li icone="gauge" ton="acc" t={t('Scores')} s={t('Incident déclaré avec preuve : aucune pénalité automatique pour le livreur.')} />
          <Li icone="banknote" ton="acc" t={t('Rémunération recalculée par le serveur')} s={t('selon les colis réellement remis et les suppléments de la grille ; jamais saisie ici.')} />
        </>
      )}
      {!ouvert && m && (
        <>
          <Divide>{t(i.statut === 'refuse' ? 'Le livreur est rappelé' : 'Tournée ajustée')}</Divide>
          {m.itineraire.map((a, k) => (
            <Arret key={k} n={k + 1} st={a.fait ? 'done' : k === m.itineraire.findIndex((x) => !x.fait) ? 'cur' : undefined} t={a.type === 'domicile' ? tf('Client à {q}', { q: a.nom }) : a.nom} />
          ))}
          <Li icone="history" ton="ink" t={t('Journal')} s={tf('Déclaré par {l} à {o} · décidé par {p} à {h}', { l: i.livreur.nom, o: h(i.declareLe), p: i.decision?.par ?? '—', h: i.decision ? h(i.decision.le) : '—' })} />
        </>
      )}
      {securite && (
        <>
          <div className="btns" style={{ marginTop: 14 }}>
            <button type="button" className="btn danger" onClick={appel.ouvrir}>
              <Icone nom="phone" taille={18} />
              {tf('Appeler {n}', { n: prenom })}
            </button>
            <button type="button" className="btn secondary" onClick={() => naviguer(chemin('missions', { mission: i.missionId, sheet: 'mission' }))}>
              <Icone nom="map" taille={18} />
              {t('Voir sur la carte')}
            </button>
            {ouvert && (
              <button type="button" className="btn ghost" disabled={occupe} onClick={() => decider('valider')}>
                <Icone nom="check" taille={18} />
                {t('Valider l’incident')}
              </button>
            )}
          </div>
          <Hint icone="lock">{t('Un incident de sécurité ne peut pas être refusé. Il est validé d’office ; appelez votre livreur.')}</Hint>
        </>
      )}
      {ouvert && !securite && (
        <>
          <Divide>{t('Votre décision')}</Divide>
          {i.bloquant && i.decideAvant ? (
            <Limite
              icone="timer"
              titre={tf('Délai de réponse : {m} minutes', { m: REGLES.incidentMin })}
              texte={
                <>
                  {tf('décision avant {h}', { h: h(i.decideAvant) })} · <Rebours fin={i.decideAvant} urgent={URGENT_MS} critique={CRITIQUE_MS} echu={t('Délai dépassé')} />
                </>
              }
              atteinte={echu ? t('Délai dépassé : l’opérateur de zone BelivaY décide à votre place ; une décision tardive est refusée.') : undefined}
            />
          ) : (
            <Limite icone="timer" titre={t('Non bloquant : aucun délai de réponse')} texte={t('la tournée continue ; votre décision est attendue avant la clôture de la mission.')} />
          )}
          <div className="t13 b7">{t('Motif (obligatoire)')}</div>
          <Choix forme="chips" aria={t('Motif de la décision')} actif={choix} choisir={setChoix} items={MOTIFS.map((x) => ({ id: x.id, t: t(x.t), icone: x.id === choix ? 'check' : undefined }))} />
          <div className="btns" style={{ marginTop: 14 }}>
            <button type="button" className="btn primary" disabled={occupe || choix === 'insuffisant'} onClick={() => decider('valider')}>
              <Icone nom="circle-check" taille={18} />
              {t('Valider l’incident')}
            </button>
            <button type="button" className="btn danger" disabled={occupe} onClick={ouvrirRefus}>
              <Icone nom="circle-x" taille={18} />
              {t('Refuser')}
            </button>
            {i.bloquant ? (
              <Link className="btn secondary" to={chemin('incidents', { id: i.id, transfert: i.paquetId })}>
                <Icone nom="arrow-right-left" taille={18} />
                {t('Transférer')}
              </Link>
            ) : (
              <button type="button" className="btn secondary" onClick={appel.ouvrir}>
                <Icone nom="phone" taille={18} />
                {tf('Appeler {n}', { n: prenom })}
              </button>
            )}
          </div>
          {i.bloquant && (
            <div className="btns" style={{ marginTop: 8 }}>
              <button type="button" className="btn ghost sm" onClick={appel.ouvrir}>
                <Icone nom="phone" taille={16} />
                {tf('Appeler {n}', { n: prenom })}
              </button>
            </div>
          )}
          <Hint icone="info">{t('Lisez la photo et la position avant de décider. Valider ne crée aucune sanction automatique ; chaque décision est journalisée avec son motif et votre nom.')}</Hint>
        </>
      )}
      <Feuille ouverte={refus.ouverte} fermer={refus.fermer} titre={tf('Refuser l’incident « {i} »', { i: t(NOM_INCIDENT[i.genre]) })}>
        <div className="grab"></div>
        <h2 className="lv-h2">{tf('Refuser l’incident « {i} »', { i: t(NOM_INCIDENT[i.genre]) })}</h2>
        <p className="lv-s">{tf('{n} est rappelé : il voit votre motif sur sa tournée. Le motif est obligatoire (au moins {m} caractères) et journalisé avec votre nom.', { n: i.livreur.nom, m: REGLES.motifRefusMin })}</p>
        <label className="champ">
          <span>{t('Motif du refus')}</span>
          <textarea className="lv-ta" value={motif} onChange={(e) => setMotif(e.target.value)} placeholder={t('Exemple : la boutique a confirmé être ouverte, repassez par l’entrée de côté.')} />
        </label>
        <p className={'lv-compteur-c' + (court ? '' : ' ok')} aria-live="polite">
          {tf('{n} / {m} caractères', { n: motif.trim().length, m: REGLES.motifRefusMin })}
        </p>
        <label className="lv-case mt10">
          <input type="checkbox" checked={lu} onChange={(e) => setLu(e.target.checked)} />
          <span>{i.distanceArretM !== null ? tf('J’ai lu les photos et la position (à {m} m de l’arrêt)', { m: i.distanceArretM }) : t('J’ai lu les photos et la position')}</span>
        </label>
        <div className="btns mt10">
          <button type="button" className="btn ghost" onClick={refus.fermer}>
            {t('Annuler')}
          </button>
          <button type="button" className="btn danger" disabled={court || !lu || occupe} onClick={() => decider('refuser')}>
            <Icone nom="circle-x" taille={18} />
            {t('Refuser et envoyer le motif')}
          </button>
        </div>
      </Feuille>
      <FeuilleAppel ouverte={appel.ouverte} fermer={appel.fermer} missionId={i.missionId} livreur={i.livreur.nom} />
    </section>
  )
}

type FiltreInc = 'tous' | 'a_valider' | 'bloquants' | 'securite' | 'traites'
type TriInc = 'echeance' | 'recents' | 'livreur'
const TRIS: { id: TriInc; t: string }[] = [
  { id: 'echeance', t: 'Échéance la plus proche' },
  { id: 'recents', t: 'Plus récents' },
  { id: 'livreur', t: 'Livreur (A → Z)' },
]

export default function Incidents() {
  const { t, tf } = usePreferences()
  const h = useHeure()
  const naviguer = useNavigate()
  const entreprise = useSession().entreprise?.nom ?? t('votre entreprise')
  const [params, setParams] = useSearchParams()
  const tic = useHorloge(5000)
  const l = useDonnees(() => source.incidents.liste(), [Math.floor(tic / 5000)])
  const transfert = params.get('transfert')
  const ouvrirTransfert = !!transfert && !params.get('sheet')
  // Résultat d'une décision, gardé par incident : il reste affiché quand la liste se relit.
  const [retours, setRetours] = useState<Record<string, RetourGeste>>({})
  const fermerTransfert = () => {
    const p = new URLSearchParams(params)
    p.delete('transfert')
    p.delete('sheet')
    setParams(p, { replace: true })
  }
  const { differer, enCours, vue } = useAnnuler()
  const tous = l.donnees ?? []
  const aValiderTous = tous.filter((i) => i.statut === 'a_valider')
  // Recherche (colis ou livreur), puces et tri gardés dans l'adresse (?q=, ?f=, ?tri=).
  const q = params.get('q') ?? ''
  const filtre = (['tous', 'a_valider', 'bloquants', 'securite', 'traites'].includes(params.get('f') ?? '') ? params.get('f') : 'tous') as FiltreInc
  const tri = (TRIS.find((x) => x.id === params.get('tri'))?.id ?? 'echeance') as TriInc
  const regler = (k: string, v: string, defaut: string) => {
    const p = new URLSearchParams(params)
    if (!v || v === defaut) p.delete(k)
    else p.set(k, v)
    setParams(p, { replace: true })
  }
  const effacer = () => {
    const p = new URLSearchParams(params)
    p.delete('q')
    p.delete('f')
    setParams(p, { replace: true })
  }
  const cherches = tous.filter((i) => correspond(q, i.paquetId, i.livreur.nom, i.lieu, t(NOM_INCIDENT[i.genre])))
  const passe: Record<FiltreInc, (i: Incident) => boolean> = {
    tous: () => true,
    a_valider: (i) => i.statut === 'a_valider',
    bloquants: (i) => i.statut === 'a_valider' && i.bloquant,
    securite: (i) => i.famille === 'securite',
    traites: (i) => i.statut !== 'a_valider',
  }
  const ordre = (a: Incident, b: Incident) =>
    tri === 'recents' ? b.recuLe - a.recuLe : tri === 'livreur' ? a.livreur.nom.localeCompare(b.livreur.nom) : Number(b.famille === 'securite') - Number(a.famille === 'securite') || (a.decideAvant ?? Infinity) - (b.decideAvant ?? Infinity) || b.recuLe - a.recuLe
  const vus = cherches.filter(passe[filtre]).sort(ordre)
  const aValider = vus.filter((i) => i.statut === 'a_valider')
  const traites = vus.filter((i) => i.statut !== 'a_valider')
  const id = params.get('id')
  const choisi = tous.find((i) => i.id === id) ?? aValider[0] ?? traites[0] ?? null
  // Son et annonce à l'arrivée d'un nouvel incident à valider (la liste se relit toutes les 5 s).
  const connus = useRef<Set<string> | null>(null)
  const [annonce, setAnnonce] = useState('')
  useEffect(() => {
    if (!l.donnees) return
    const ouverts = l.donnees.filter((i) => i.statut === 'a_valider')
    if (connus.current) {
      const nouveaux = ouverts.filter((i) => !connus.current!.has(i.id))
      if (nouveaux.length) {
        sonner(nouveaux.some((i) => i.famille === 'securite') ? 'incidentSecurite' : 'incident')
        setAnnonce(tf('Nouvel incident : {i} · {l} · {p}', { i: t(NOM_INCIDENT[nouveaux[0].genre]), l: nouveaux[0].livreur.nom, p: nouveaux[0].paquetId }))
      }
    }
    connus.current = new Set([...(connus.current ?? []), ...ouverts.map((i) => i.id)])
  }, [l.donnees, t, tf])
  const premier = [...aValiderTous].sort(ordre)[0] ?? null
  const allerAuPlusUrgent = () => {
    if (!premier) return
    choisir(premier.id)
    setTimeout(() => document.getElementById('in-detail')?.scrollIntoView({ block: 'start' }), 60)
  }
  const sos = aValiderTous.find((i) => i.famille === 'securite')
  const bloquants = aValiderTous.filter((i) => i.bloquant && i.decideAvant).sort((a, b) => a.decideAvant! - b.decideAvant!)
  const urgent = bloquants[0]
  const choisir = (x: string) => {
    const p = new URLSearchParams(params)
    p.set('id', x)
    setParams(p, { replace: true })
  }
  const appelerSos = (x: string) => {
    const p = new URLSearchParams(params)
    p.set('id', x)
    p.set('sheet', 'appel')
    naviguer({ search: p.toString() }, { state: { feuille: true } })
  }
  const bandeau = l.erreur ? (
    <BandeauErreur erreur={l.erreur} relire={l.relire} derniere={l.derniere} echecs={l.echecs} />
  ) : sos ? (
    <Banniere
      ton="red"
      icone="siren"
      role="alert"
      bouton={
        <span className="entb-bbtn">
          <button type="button" className="btn danger sm" onClick={() => appelerSos(sos.id)}>
            <Icone nom="phone" taille={16} />
            {tf('Appeler {n}', { n: sos.livreur.nom.split(' ')[0] })}
          </button>
        </span>
      }
    >
      <b>{tf('SOS de {n} à {h} · priorité absolue.', { n: sos.livreur.nom, h: h(sos.recuLe) })}</b> {tf('Validation implicite ; appelez-le maintenant. Position partagée {m} minutes avec votre entreprise et le support BelivaY ; la console BelivaY est prévenue.', { m: REGLES.partageSosMin })}
    </Banniere>
  ) : urgent ? (
    <Banniere ton="amber" icone="timer" role="status">
      <b>
        {bloquants.length === 1 ? tf('1 incident bloquant : décision avant {h}.', { h: h(urgent.decideAvant!) }) : tf('{n} incidents bloquants : première décision avant {h}.', { n: bloquants.length, h: h(urgent.decideAvant!) })}
      </b>{' '}
      <Rebours fin={urgent.decideAvant!} urgent={URGENT_MS} critique={CRITIQUE_MS} echu={t('Délai dépassé')} />{' '}
      {tf('{i} · {l}. Sans décision de {e}, l’opérateur de zone BelivaY tranche à votre place.', { i: t(NOM_INCIDENT[urgent.genre]), l: urgent.livreur.nom, e: entreprise })}
    </Banniere>
  ) : null
  return (
    <Ecran route="incidents">
      <Px>
        {bandeau}
        <Tete route="incidents" titre={t('Incidents à valider')} />
        <p className="vh" aria-live="assertive">
          {annonce}
        </p>
        {!l.donnees ? (
          <Chargement n={3} />
        ) : (
          <div className="g g12">
            <div>
              <Panel titre={tf('À valider ({n})', { n: aValiderTous.length })} icone="triangle-alert">
                {tous.length > 0 && (
                  <div className="lv-outils">
                    <Recherche q={q} setQ={(v) => regler('q', v, '')} placeholder={t('Colis, paquet ou livreur…')} aria={t('Rechercher un incident')} />
                    <Puces
                      aria={t('Filtrer les incidents')}
                      actif={filtre}
                      choisir={(v) => regler('f', v, 'tous')}
                      items={(['tous', 'a_valider', 'bloquants', 'securite', 'traites'] as FiltreInc[]).map((x) => ({ id: x, t: { tous: 'Tous', a_valider: 'À valider', bloquants: 'Bloquants', securite: 'Sécurité', traites: 'Traités' }[x], n: cherches.filter(passe[x]).length }))}
                    />
                    <Tri tri={tri} setTri={(v) => regler('tri', v, 'echeance')} options={TRIS} />
                    <Compte n={vus.length} total={tous.length} />
                  </div>
                )}
                {tous.length > 0 && vus.length === 0 ? (
                  <AucunResultat effacer={effacer} />
                ) : aValider.length === 0 ? (
                  filtre === 'traites' ? null : <Vide icone="circle-check" titre={t('Aucun incident à valider')} raison={t('Les livreurs déclarent leurs incidents dans leur application ; un incident bloquant arrive ici avec son compte à rebours.')} />
                ) : (
                  aValider.map((i) => <CarteIncident key={i.id} i={i} envoi={enCours.has('inc-' + i.id)} choisi={choisi?.id === i.id} choisir={() => choisir(i.id)} />)
                )}
                {traites.length > 0 && (
                  <>
                    <Divide>{t('Traités aujourd’hui')}</Divide>
                    {traites.map((i) => (
                      <CarteIncident key={i.id} i={i} choisi={choisi?.id === i.id} choisir={() => choisir(i.id)} />
                    ))}
                  </>
                )}
              </Panel>
              <Panel titre={t('Règles de décision')} icone="book-open" className="lv-etroit" style={{ marginTop: 16 }}>
                <Li icone="timer" ton="or" t={tf('{m} minutes pour un incident bloquant', { m: REGLES.incidentMin })} s={t('sinon l’opérateur de zone BelivaY valide ou refuse à votre place ; une décision tardive est refusée')} />
                <Li icone="shield-alert" ton="red" t={t('Sécurité : priorité absolue')} s={t('validation implicite, jamais de refus ; vous appelez le livreur')} />
                <Li icone="eye" ton="acc" t={t('Lire la preuve d’abord')} s={t('valider ne crée aucune sanction automatique')} />
                <Li icone="message-square-text" ton="ink" t={tf('Refus motivé : {n} caractères au moins', { n: REGLES.motifRefusMin })} s={t('le motif part au livreur avec votre nom')} />
                <Li icone="scale" ton="ink" t={t('Incident mensonger')} s={t('signalé à BelivaY : décision humaine motivée, avec recours')} />
              </Panel>
            </div>
            <div>
              {choisi ? (
                <Detail key={choisi.id} i={choisi} garder={() => choisir(choisi.id)} retour={retours[choisi.id] ?? null} setRetour={(r) => setRetours((x) => ({ ...x, [choisi.id]: r }))} differer={differer} envoi={enCours.has('inc-' + choisi.id)} relire={l.relire} />
              ) : (
                <div className="panel">
                  <Vide icone="triangle-alert" titre={t('Aucun incident aujourd’hui')} raison={t('Rien à décider pour le moment.')} />
                </div>
              )}
            </div>
          </div>
        )}
      </Px>
      {premier && (
        <BarrePouce>
          <button type="button" className="btn primary" onClick={allerAuPlusUrgent}>
            <Icone nom="timer" taille={18} />
            <span>{t('Décider')}</span>
          </button>
          <Link className="btn secondary" to={chemin('missions')}>
            <Icone nom="map" taille={18} />
            <span>{t('Missions')}</span>
          </Link>
        </BarrePouce>
      )}
      {vue}
      {transfert && <FeuilleTransfert ouverte={ouvrirTransfert} fermer={fermerTransfert} paquetId={transfert} />}
    </Ecran>
  )
}

