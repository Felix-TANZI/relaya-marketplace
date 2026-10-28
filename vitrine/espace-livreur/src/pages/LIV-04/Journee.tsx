// Corps de l'écran Aujourd'hui (LIV-P04), partagé par trois adresses : /aujourdhui, /statut et /kit. Comme dans le
// prototype, « Mon statut » (LIV-P05) et « Mon kit d'emballage » (LIV-P07) sont des FEUILLES DU BAS posées sur la page
// Aujourd'hui (en-tête racine) : leur route garde son adresse et rend ce corps, la feuille par-dessus.
// Ordre du prototype (livA_today), fixé par les règles (LIV-01-R024, LIV-P04R-01, LIV-RG-R57) : salutation et résumé,
// interrupteur de statut (une touche ouvre la feuille sur le choix touché, LIV-04-R15), bandeau hors connexion, carte
// « Maintenant » (seul héros, moitié haute : nuit si un paquet est en cours, orange s'il vient d'être affecté, vide
// expliquée sinon, verte si la journée est clôturée, rouge si l'accès est suspendu), paquets du jour (heures limites,
// puis terminés), tuiles (paquets, colis remis, missions validées ; « Vous êtes payé par <entreprise> »), alertes
// calculées (batterie lue sur le téléphone, kit, pièces, certification), « Je ne peux pas faire ce paquet » et
// « Clôturer ma journée », pied (connexion). Jamais d'information commerciale ni de classement (LIV-P04R-04) ; rien à
// accepter : l'entreprise affecte (LIV-P04R-02).
// Enrichissements : chiffres du jour qui défilent (M9) ; sous une heure avant la limite du paquet en cours, le compte à
// rebours à la seconde, ambre puis rouge sous 10 min (M17) ; « Mon planning » est au Menu (accueil allégé).
import { useRelief } from '@client/vie/vie'
import type { MouseEvent, ReactNode } from 'react'
import { Link, useLocation, useNavigate, useNavigationType } from 'react-router-dom'
import { F } from '@client/i18n/format'
import { joursRestants } from '../../calculs/absence'
import { Compteur, Rebours, useRebours } from '../../composants/enrichis'
import { Icone } from '../../composants/Icone'
import { Barre, Btn, Foot, HorsConnexion, Li, Note, Pill, Sec, Vide, type Ton } from '../../composants/proto'
import { chemin } from '../../config/pages'
import type { Disponibilite, TypeArret } from '../../donnees/communs'
import type { Alerte, Journee, Maintenant, PaquetDuJour } from '../../donnees/domaines/aujourdhui'
import type { IdPiece } from '../../donnees/domaines/acces'
import { enAttente, useEnLigne, useFile } from '../../donnees/fileHorsLigne'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { duree, heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { STATUTS, statutEnFile } from './ChoixStatut'
import { useMaintenant as useHorloge } from '../LIV-08/commun'
import { Chargement, ErreurLecture, TYPES_PAQUET, jourAn, nomFormat, useBatterie, useMaintenant } from './commun'
import './liv04.css'

const PIECES: Record<IdPiece, string> = {
  cni_recto: 'CNI',
  cni_verso: 'CNI',
  selfie: 'selfie',
  permis: 'permis de conduire',
  carte_grise: 'carte grise',
  vehicule: 'photo du véhicule',
  assurance: 'assurance du véhicule',
  profil: 'photo de profil',
}

/** Ouvre une feuille posée sur Aujourd'hui (statut, kit) : l'entrée est marquée pour que la fermeture y revienne. */
export function useOuvrirFeuille() {
  const naviguer = useNavigate()
  return (vers: string) => (e?: MouseEvent) => {
    e?.preventDefault()
    naviguer(vers, { state: { feuille: true } })
  }
}

/** Ferme une feuille posée sur Aujourd'hui : retour à l'entrée d'avant si on venait de l'accueil, sinon l'accueil. */
export function useFermerFeuille() {
  const naviguer = useNavigate()
  const lieu = useLocation()
  const type = useNavigationType()
  return () => {
    if ((lieu.state as { feuille?: boolean } | null)?.feuille && type !== 'POP') naviguer(-1)
    else naviguer(chemin('aujourdhui'), { replace: true })
  }
}

/** Le corps d'Aujourd'hui, lu à la source. */
export function CorpsAujourdhui() {
  const lecture = useLecture(() => source.aujourdhui.journee(), [])
  const s = useSession()
  if (lecture.erreur) return <ErreurLecture relire={lecture.relire} />
  if (!lecture.donnees) return <Chargement lignes={6} />
  return <Contenu j={lecture.donnees} serveur={s.maintenant} />
}

const VERBE: Record<TypeArret, string> = { ramassage: 'Ramassage chez {n}', relais: 'Dépôt au {n}', domicile: 'Remise à domicile', collecte: 'Collecte au {n}', retour: 'Retour chez {n}' }

function Contenu({ j, serveur }: { j: Journee; serveur: number }) {
  const { t, tf, langue } = usePreferences()
  const maintenant = useMaintenant(serveur)
  const ouvrir = useOuvrirFeuille()
  const actif = j.compte.etat === 'actif' || j.compte.etat === 'restreint'
  const duJour = j.paquets.filter((p) => p.etat !== 'retire' && p.etat !== 'rendu').length
  const termines = j.tuiles.paquetsTermines
  const resume = !actif
    ? j.compte.etat === 'en_activation'
      ? t('activation en cours')
      : t('accès au compte limité')
    : j.cloturee
      ? t('journée clôturée')
      : j.maintenant?.ton === 'nouveau'
        ? t('un nouveau paquet vous est affecté')
        : duJour > 0
          ? (duJour === 1 ? t('1 paquet aujourd’hui') : tf('{n} paquets aujourd’hui', { n: duJour })) + (termines ? ', ' + (termines === 1 ? t('1 terminé') : tf('{n} terminés', { n: termines })) : '')
          : t('aucun paquet pour l’instant')
  const enCours = j.maintenant?.ton === 'en_cours'
  const jeNePeuxPas = j.maintenant ? chemin('statut', { paquet: j.maintenant.paquetId }) : null
  return (
    <>
      <div className="pg">
        <h1 className="pg-t">{tf('Bonjour {prenom}', { prenom: j.prenom })}</h1>
        <p className="pg-s">
          {jourAn(maintenant, langue)} · {resume}
        </p>
      </div>
      {actif && <Interrupteur />}
      <BandeauHorsLigne j={j} />

      {j.compte.etat === 'en_activation' ? (
        <div className="card">
          <Vide icone="lock" t={t('Vous ne pouvez pas encore recevoir de missions')} s={t('Terminez votre activation : charte, pièces, certification, puis l’approbation de votre entreprise.')}>
            <div className="btns">
              <Btn kind="primary" icone="list-checks" vers={chemin('activation')}>
                {t('Voir ce qui manque')}
              </Btn>
            </div>
          </Vide>
        </div>
      ) : !actif ? (
        <CompteNonActif j={j} />
      ) : j.cloturee ? (
        <div className="hero acc">
          <div className="hk">{t('Journée clôturée')}</div>
          <div className="ht">{termines === 1 ? tf('1 paquet, {c} colis remis', { c: j.tuiles.colisRemis }) : tf('{n} paquets, {c} colis remis', { n: termines, c: j.tuiles.colisRemis })}</div>
          <div className="hs">{tf('Aucun colis sur vous. Le bilan est transmis à {entreprise} ; votre position n’est plus enregistrée.', { entreprise: j.entreprise })}</div>
        </div>
      ) : j.maintenant ? (
        j.maintenant.ton === 'nouveau' ? (
          <HerosNouveau m={j.maintenant} j={j} />
        ) : (
          <HerosEnCours m={j.maintenant} maintenant={maintenant} />
        )
      ) : (
        <div className="card">
          <Vide icone="package" t={t('Pas de paquet pour l’instant')} s={tf('Restez disponible : {entreprise} vous affecte un paquet dès qu’elle l’accepte. Une notification vous prévient ; vous n’avez rien à accepter.', { entreprise: j.entreprise })}>
            <div className="btns liva-col">
              <Btn kind="secondary" icone="boxes" vers={chemin('kit')} onClick={ouvrir(chemin('kit'))}>
                {t('Vérifier mon kit')}
              </Btn>
              <Btn kind="acc-soft" icone="toggle-right" vers={chemin('statut')} onClick={ouvrir(chemin('statut'))}>
                {t('Mon statut')}
              </Btn>
            </div>
          </Vide>
        </div>
      )}

      {j.compte.etat === 'restreint' && (
        <Note ton="amber" icone="shield-half">
          <b>{t('Accès restreint · niveau 2')}</b>{' '}
          {[j.compte.plafondColis !== null ? tf('plafond {m} par colis', { m: t(F(j.compte.plafondColis) + ' F') }) : null, !j.compte.domicile ? t('pas de remise à domicile') : null].filter(Boolean).join(' · ')}{' '}
          <Link className="l4-lien" to={chemin('compte')}>
            {t('Voir le motif')}
          </Link>
        </Note>
      )}

      {actif && <NouvellePhoto />}

      {j.paquets.length > 0 && actif && <PaquetsDuJour j={j} />}
      {actif && <Tuiles j={j} />}
      <Alertes j={j} actif={actif} enCours={enCours} />

      {actif && !j.cloturee && (
        <div className="card tight">
          {jeNePeuxPas && (
            <Li
              icone="hand"
              ton="red"
              t={t('Je ne peux pas faire ce paquet')}
              s={
                j.maintenant!.colisRamasses > 0
                  ? tf('Panne, santé, sécurité : jamais de refus silencieux · {n} colis déjà ramassés', { n: j.maintenant!.colisRamasses })
                  : tf('Panne, santé, sécurité : le paquet retourne à {entreprise}, jamais de refus silencieux', { entreprise: j.entreprise })
              }
              vers={jeNePeuxPas}
              onClick={ouvrir(jeNePeuxPas)}
            />
          )}
          <Li
            icone="moon-star"
            ton="ink"
            t={t('Clôturer ma journée')}
            s={j.colisSousGarde === 0 ? t('Bilan du jour, emballages rendus, passage hors service') : j.colisSousGarde === 1 ? t('Impossible tant que 1 colis est sous votre garde') : tf('Impossible tant que {n} colis sont sous votre garde', { n: j.colisSousGarde })}
            vers={chemin('cloture')}
          />
        </div>
      )}
      <Pied j={j} />
    </>
  )
}

/** Nouvelle photo demandée par l'entreprise (DP-67) : délai PHOTO-REVERIF-J en cours (il travaille), ou passé (plus de
 * nouvelle mission jusqu'à la validation) ; dit là où il attend ses paquets, avec le chemin vers Moi. */
function NouvellePhoto() {
  const { t, tf, langue } = usePreferences()
  const p = useLecture(() => source.moi.profil(), []).donnees
  const s = useSession()
  const selfie = p?.pieces.find((x) => x.id === 'selfie')
  if (!p || !selfie?.demandee || selfie.demandee.jusqua === null) return null
  const jusqua = selfie.demandee.jusqua
  if (p.photoBloquee)
    return (
      <Note ton="red" icone="scan-face" role="alert">
        <b>{t('Plus de nouvelle mission')}</b> · {selfie.etat === 'en_verification' ? t('votre nouvelle photo est en vérification : les missions reprennent dès sa validation.') : t('le délai pour votre nouvelle photo est passé. Envoyez-la : les missions reprennent dès sa validation.')}{' '}
        <Link className="l4-lien" to={chemin('moi')}>
          {t('Voir dans Moi')}
        </Link>
      </Note>
    )
  if (selfie.etat !== 'reverification') return null
  const n = joursRestants(jusqua, s.maintenant)
  return (
    <Note ton="amber" icone="scan-face">
      <b>{t('Nouvelle photo demandée')}</b> · {n <= 1 ? t('encore 1 jour') : tf('encore {n} jours', { n })}, {tf('avant le {d}. Vous continuez à travailler d’ici là.', { d: jourAn(jusqua, langue) })}{' '}
      <Link className="l4-lien" to={chemin('moi')}>
        {t('Prendre le selfie')}
      </Link>
    </Note>
  )
}

/** Interrupteur à trois positions (livA_seg) : une touche ouvre la feuille « Mon statut » sur le choix touché. */
function Interrupteur() {
  const { t } = usePreferences()
  const s = useSession()
  const file = useFile()
  const ouvrir = useOuvrirFeuille()
  const attente = enAttente(file, 'disponibilite')
  const actuel: Disponibilite = attente.length ? statutEnFile(attente[attente.length - 1].objet).statut : s.disponibilite
  const point: Record<Disponibilite, string> = { disponible: 'g', en_pause: 'a', hors_service: 'x' }
  return (
    <nav className="seg liva-seg" aria-label={t('Mon statut')}>
      {STATUTS.map((x) => {
        const verrou = x.id === 'hors_service' && s.colisSousGarde > 0
        const vers = chemin('statut', { choix: x.id === 'disponible' ? undefined : x.id })
        return (
          <Link key={x.id} to={vers} onClick={ouvrir(vers)} className={(actuel === x.id ? 'on' : '') + (verrou ? ' lk' : '')} aria-current={actuel === x.id ? 'true' : undefined}>
            {verrou ? <Icone nom="lock" taille={14} /> : <i className={'liva-dot ' + point[x.id]} />}
            {t(x.mot)}
          </Link>
        )
      })}
    </nav>
  )
}

function BandeauHorsLigne({ j }: { j: Journee }) {
  const { t, tf, langue } = usePreferences()
  const enLigne = useEnLigne()
  const file = useFile()
  if (enLigne) return null
  const n = enAttente(file).length
  return (
    <Link to={chemin('synchronisation')} className="l4-hl-l">
      <HorsConnexion>
        <b>{t('Hors connexion')}</b> · {n === 0 ? t('aucune preuve en attente.') : n === 1 ? t('1 preuve en attente d’envoi.') : tf('{n} preuves en attente d’envoi.', { n })} {t('La tournée continue ; un nouveau paquet arrivera au retour du réseau.')}
        {j.derniereSynchronisation ? ' ' + tf('Dernière synchronisation à {h}.', { h: heure(j.derniereSynchronisation, langue) }) : ''}
      </HorsConnexion>
    </Link>
  )
}

function HerosEnCours({ m, maintenant }: { m: Maintenant; maintenant: number }) {
  const { t, tf, langue } = usePreferences()
  // Bloc principal de la journée : relief léger (vie, site/src/vie) ; aucun effet sur le contraste.
  const relief = useRelief()
  const reste = m.heureLimite - maintenant
  const secondes = useRebours(m.heureLimite, useHorloge())
  const pc = m.colisTotal ? (m.colisRamasses / m.colisTotal) * 100 : 0
  return (
    <section className={'hero night' + relief.className} onPointerMove={relief.onPointerMove} onPointerLeave={relief.onPointerLeave} onPointerDown={relief.onPointerDown} onPointerUp={relief.onPointerUp} aria-labelledby="l4-m-t">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="hk">
          {t('Maintenant')} · {t(TYPES_PAQUET[m.type])}
        </span>
        <Pill ton="dk" icone="clock">
          {tf('Limite {h}', { h: heure(m.heureLimite, langue) })}
        </Pill>
      </div>
      <div className="row mt10" style={{ gap: 14, alignItems: 'flex-end' }}>
        {m.arret && (
          <div className="bigN" aria-label={tf('Arrêt {x} sur {n}', { x: m.arret.rang, n: m.arret.total })}>
            {m.arret.rang}
            <small style={{ fontSize: 22, opacity: 0.7 }}>/{m.arret.total}</small>
          </div>
        )}
        <div className="grow">
          <h2 className="ht" id="l4-m-t" style={{ margin: 0 }}>
            {m.arret ? tf(VERBE[m.arret.type], { n: m.arret.nom }) : m.paquetId}
          </h2>
          {m.arret && (
            <div className="hs" style={{ marginTop: 2 }}>
              {[tf('Arrêt {x} sur {n}', { x: m.arret.rang, n: m.arret.total }), m.arret.quartier, m.arret.pretDepuis ? tf('prêt depuis {h}', { h: heure(m.arret.pretDepuis, langue) }) : null].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
      </div>
      <div className="mt14">
        <Barre pct={pc} ton="acc" label={tf('{a} colis ramassés sur {b}', { a: m.colisRamasses, b: m.colisTotal })} />
      </div>
      <div className="row mt8 t12 l4-hero-l" style={{ justifyContent: 'space-between' }}>
        <span className="no-tr">{m.paquetId}</span>
        <span>{tf('{a} colis sur vous · {b} à ramasser', { a: m.colisSurVous, b: m.aRamasser })}</span>
      </div>
      <div className="btns" style={{ marginTop: 14 }}>
        <Btn kind="primary" icone="navigation" cls="xl" vers={chemin('tournee')}>
          {t('Reprendre la tournée')}
        </Btn>
      </div>
      <div className="row mt10 t13 l4-hero-l" style={{ justifyContent: 'space-between' }}>
        <span className={reste < 0 ? 'l4-depasse' : ''}>
          <Icone nom="timer" taille={15} /> {reste >= 0 ? tf('reste {d} avant la limite', { d: duree(reste, langue) }) : tf('limite dépassée de {d}', { d: duree(-reste, langue) })}
        </span>
        {secondes !== null && secondes > 0 && secondes < 3600 && <Rebours secondes={secondes} libelle={t('Temps avant la limite')} />}
        <Link to={chemin('paquet', { id: m.paquetId })} className="l4-hero-a">
          {t('Détail du paquet')} ›
        </Link>
      </div>
    </section>
  )
}

function HerosNouveau({ m, j }: { m: Maintenant; j: Journee }) {
  const { t, tf, langue } = usePreferences()
  const relief = useRelief()
  const paquet = j.paquets.find((p) => p.id === m.paquetId)
  return (
    <section className={'hero orange' + relief.className} onPointerMove={relief.onPointerMove} onPointerLeave={relief.onPointerLeave} onPointerDown={relief.onPointerDown} onPointerUp={relief.onPointerUp} aria-labelledby="l4-m-t">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="hk">
          {t('Maintenant')} · {t('nouveau paquet')}
        </span>
        <Pill ton="dk" icone="clock">
          {tf('Limite {h}', { h: heure(m.heureLimite, langue) })}
        </Pill>
      </div>
      <h2 className="ht" id="l4-m-t">
        {t(TYPES_PAQUET[m.type])}
        {paquet ? ' · ' + paquet.zone : ''}
      </h2>
      <div className="hs">
        <span className="no-tr">{m.paquetId}</span> · {[m.arret ? (m.arret.total === 1 ? t('1 arrêt') : tf('{n} arrêts', { n: m.arret.total })) : null, m.colisTotal === 1 ? t('1 colis') : tf('{n} colis', { n: m.colisTotal }), paquet ? t(paquet.destination) : null].filter(Boolean).join(', ')}
      </div>
      <div className="hline" />
      <div className="row t13" style={{ gap: 8, alignItems: 'flex-start' }}>
        <Icone nom="building-2" taille={16} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>{tf('Rien à accepter : {entreprise} a accepté ce paquet à {a} et vous l’a affecté à {b}.', { entreprise: j.entreprise, a: heure(m.accepteA, langue), b: heure(m.affecteA, langue) })}</span>
      </div>
      <div className="btns" style={{ marginTop: 14 }}>
        <Btn kind="white" icone="package-search" cls="xl" vers={chemin('paquet', { id: m.paquetId })}>
          {t('Voir le paquet et le kit')}
        </Btn>
      </div>
    </section>
  )
}

function CompteNonActif({ j }: { j: Journee }) {
  const { t, tf, langue } = usePreferences()
  const titres: Record<string, string> = {
    suspendu: 'Accès suspendu',
    retire: 'Accès retiré',
    rattachement_ferme: 'Rattachement fermé',
    rattachement_suspendu: 'Rattachement suspendu',
  }
  const rouge = j.compte.etat === 'suspendu' || j.compte.etat === 'retire'
  return (
    <>
      <div className={'hero ' + (rouge ? 'red' : 'night')}>
        <div className="hk l4-hk-rouge">
          {t(titres[j.compte.etat] ?? 'Compte non actif')}
          {j.compte.niveau ? ' · ' + tf('niveau {n}', { n: j.compte.niveau }) : ''}
        </div>
        <div className="ht">{t('Vous ne recevez plus de nouveau paquet')}</div>
        <div className="hs">
          {j.compte.finLe ? tf('Jusqu’au {date}.', { date: jourAn(j.compte.finLe, langue) }) + ' ' : ''}
          {t('Le motif et le recours sont dans l’état de votre compte.')}
        </div>
        <div className="btns">
          <Btn kind="white" icone="scale" vers={chemin('compte')}>
            {t('Voir le motif et le recours')}
          </Btn>
        </div>
      </div>
      {j.colisSousGarde > 0 && (
        <>
          <Sec titre={t('Terminez les colis sous votre garde')} />
          <div className="card">
            <p className="t13 c3" style={{ margin: 0 }}>
              {j.colisSousGarde === 1 ? t('1 colis est sous votre garde : déposez-le avant de quitter la tournée.') : tf('{n} colis sont sous votre garde : déposez-les avant de quitter la tournée.', { n: j.colisSousGarde })}
            </p>
          </div>
          <div className="btns liva-col mt12">
            <Btn kind="primary" icone="navigation" cls="xl" vers={chemin('tournee')}>
              {j.colisSousGarde === 1 ? t('Déposer mon colis') : tf('Déposer mes {n} colis', { n: j.colisSousGarde })}
            </Btn>
          </div>
        </>
      )}
      <div className="card tight">
        <Li icone="phone" ton="acc" t={tf('Appeler {entreprise}', { entreprise: j.entreprise })} s={t('Votre entreprise voit la décision et son motif')} vers={chemin('appel', { avec: 'entreprise' })} />
        <Li icone="life-buoy" ton="ink" t={t('Support livreur BelivaY')} s={t('Aide seulement')} vers={chemin('aide')} />
      </div>
    </>
  )
}

const ETATS: Record<PaquetDuJour['etat'], [string, Ton, string]> = {
  en_cours: ['En cours', 'or', 'route'],
  affecte: ['À démarrer', 'or', 'route'],
  modifie: ['Modifié', 'amber', 'refresh-cw'],
  bloque: ['Bloqué', 'red', 'ban'],
  termine: ['Terminé', 'green', 'circle-check'],
  clos: ['Terminé', 'green', 'circle-check'],
  rendu: ['Rendu', 'ink', 'undo-2'],
  retire: ['Retiré', 'ink', 'undo-2'],
}

/** Paquets du jour : les trois prochains à faire en tête ; les autres (et les terminés) repliés, une touche les
 * déplie. Le livreur voit d'abord ce qu'il va faire, sans faire défiler toute la journée. */
const EN_TETE = 3
function PaquetsDuJour({ j }: { j: Journee }) {
  const { t, tf, langue } = usePreferences()
  const ligne = (p: Journee['paquets'][number]) => {
    const fini = p.etat === 'termine' || p.etat === 'clos'
    const [mot, ton, icone] = ETATS[p.etat]
    const vers = fini ? chemin('historique') : p.etat === 'rendu' || p.etat === 'retire' ? undefined : chemin('paquet', { id: p.id })
    const details = [t(TYPES_PAQUET[p.type]), p.zone, t(p.destination), p.arrets === 1 ? t('1 arrêt') : tf('{n} arrêts', { n: p.arrets }), p.colis === 1 ? t('1 colis') : tf('{n} colis', { n: p.colis }), fini && p.termineA ? tf('terminé à {h}', { h: heure(p.termineA, langue) }) : tf('limite {h}', { h: heure(p.heureLimite, langue) })]
    return (
      <Li
        key={p.id}
        cls="l4-pq"
        icone={icone}
        ton={ton === 'or' ? 'or' : ton === 'green' ? 'green' : ton}
        t={
          <>
            <span className="no-tr">{p.id}</span> · {t(mot).toLowerCase()}
          </>
        }
        s={[...new Set(details)].join(' · ')}
        droite={
          <Pill ton={ton} sm>
            {t(mot)}
          </Pill>
        }
        vers={vers}
      />
    )
  }
  const tete = j.paquets.slice(0, EN_TETE)
  const reste = j.paquets.slice(EN_TETE)
  const finis = reste.filter((p) => p.etat === 'termine' || p.etat === 'clos').length
  return (
    <section aria-labelledby="l4-pq">
      <Sec id="l4-pq" titre={t('Paquets du jour')} lien={t('Historique')} vers={chemin('historique')} />
      <div className="card tight">
        {tete.map(ligne)}
        {reste.length > 0 && (
          <details className="l4-plus">
            <summary className="li">
              <span className="ic">
                <Icone nom="layers" taille={18} />
              </span>
              <span className="grow">
                <span className="lt">{reste.length === 1 ? t('1 autre paquet') : tf('{n} autres paquets', { n: reste.length })}</span>
                {finis > 0 && <span className="ls">{finis === 1 ? t('dont 1 terminé') : tf('dont {n} terminés', { n: finis })}</span>}
              </span>
              <Icone nom="chevron-down" taille={18} />
            </summary>
            {reste.map(ligne)}
          </details>
        )}
      </div>
    </section>
  )
}

function Tuiles({ j }: { j: Journee }) {
  const { t, tf } = usePreferences()
  const x = j.tuiles
  return (
    <section aria-labelledby="l4-tu">
      <Sec id="l4-tu" titre={t('Aujourd’hui')} />
      <div className="tiles t3">
        <div className="tile">
          <div className="tk">{t('Paquets')}</div>
          <div className="tv">
            <Compteur valeur={x.paquetsTermines} />
            <small>/{x.paquetsTotal}</small>
          </div>
          <div className="ts">{t('terminés')}</div>
        </div>
        <div className="tile acc">
          <div className="tk">{t('Colis remis')}</div>
          <div className="tv">
            <Compteur valeur={x.colisRemis} />
          </div>
          <div className="ts">{[x.colisRelais ? tf('{n} au relais', { n: x.colisRelais }) : null, x.colisDomicile ? tf('{n} à domicile', { n: x.colisDomicile }) : null].filter(Boolean).join(' · ') || t('relais et domicile')}</div>
        </div>
        <div className="tile">
          <div className="tk">{x.gains !== null ? t('Gains') : t('Missions')}</div>
          <div className="tv">{x.gains !== null ? <Compteur valeur={x.gains} rendu={F} /> : <Compteur valeur={x.missionsValidees} />}</div>
          <div className="ts">{x.gains !== null ? t('francs CFA') : x.enRevue > 0 ? tf('validées · {n} en revue', { n: x.enRevue }) : t('validées')}</div>
        </div>
      </div>
      <div className="hint-l">
        <Icone nom="building-2" taille={15} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>{x.gains !== null ? tf('Vous êtes payé par {entreprise}, selon votre accord avec elle ; gains selon son tarif par mission.', { entreprise: j.entreprise }) : tf('Vous êtes payé par {entreprise}, selon votre accord avec elle. {entreprise} affiche un compteur de missions, pas de montant.', { entreprise: j.entreprise })}</span>
      </div>
    </section>
  )
}

type LigneAlerte = { id: string; ton: Ton; icone: string; titre: string; detail: ReactNode; vers: string | null }

function Alertes({ j, actif, enCours }: { j: Journee; actif: boolean; enCours: boolean }) {
  const { t, tf, langue } = usePreferences()
  const bat = useBatterie()
  const ouvrir = useOuvrirFeuille()
  const liste: LigneAlerte[] = []
  // Batterie : lue sur le téléphone, seulement avec un paquet en cours ; jamais transmise (LIV-P04R-05).
  if (bat && !bat.enCharge && enCours && bat.pourcent < j.regles.batterieAlertePourcent)
    liste.push({
      id: 'batterie',
      ton: bat.pourcent < j.regles.batterieEconomiePourcent ? 'red' : 'amber',
      icone: 'battery-low',
      titre: tf('Batterie à {p} %', { p: bat.pourcent }),
      detail:
        bat.pourcent < j.regles.batterieEconomiePourcent
          ? t('Mode économie de la tournée : carte simplifiée, photos compressées. Branchez la batterie externe du kit.')
          : tf('Branchez la batterie externe : sous {p} %, la tournée passe en mode économie (carte simplifiée, photos compressées).', { p: j.regles.batterieEconomiePourcent }),
      vers: null,
    })
  for (const a of j.alertes) liste.push(texteAlerte(a, t, tf, langue))
  // Rien à signaler pour les pièces et la certification : le prototype le dit en vert (lien vers le profil).
  if (actif && !j.alertes.some((a) => a.type === 'piece' || a.type === 'certification'))
    liste.push({ id: 'pieces-ok', ton: 'green', icone: 'badge-check', titre: t('Pièces et certification à jour'), detail: t('Aucune pièce ni badge n’expire dans les 30 jours'), vers: chemin('moi') })
  if (!liste.length) return null
  return (
    <section aria-labelledby="l4-al">
      <Sec id="l4-al" titre={t('Alertes')} />
      <div className="card tight">
        {liste.map((a) => (
          <Li key={a.id} cls="l4-alerte" icone={a.icone} ton={a.ton} t={a.titre} s={a.detail} vers={a.vers ?? undefined} onClick={a.vers?.startsWith('/kit') ? ouvrir(a.vers) : undefined} />
        ))}
      </div>
    </section>
  )
}

type T = (s: string) => string
type TF = (s: string, v: Record<string, string | number>) => string
function texteAlerte(a: Alerte, t: T, tf: TF, langue: 'fr' | 'en'): LigneAlerte {
  const ton: Ton = a.niveau === 'urgent' ? 'red' : 'amber'
  switch (a.type) {
    case 'kit_insuffisant':
      return {
        id: a.id,
        ton: 'red',
        icone: 'package-x',
        titre: tf('Kit insuffisant pour {id}', { id: a.paquetId }),
        detail: tf('Il manque {liste} · prévenez votre entreprise ou passez au point de stockage.', {
          liste: Object.entries(a.manque)
            .map(([f, n]) => `${n} ${t(nomFormat(f as 'S', n!))}`)
            .join(', '),
        }),
        vers: chemin('paquet', { id: a.paquetId }),
      }
    case 'kit_bas':
      return { id: a.id, ton: 'amber', icone: 'package-open', titre: a.stock === 0 ? tf('Kit : plus de {f}', { f: t(nomFormat(a.format, 1)) }) : a.stock === 1 ? tf('Kit : 1 {f} restante', { f: t(nomFormat(a.format, 1)) }) : tf('Kit : {n} {f} restantes', { n: a.stock, f: t(nomFormat(a.format, a.stock)) }), detail: tf('Sous le seuil de {s} · réassort au point de stockage de votre entreprise', { s: a.seuil }), vers: chemin('kit') }
    case 'piece':
      return {
        id: a.id,
        ton,
        icone: 'id-card',
        titre: a.niveau === 'urgent' ? tf('Pièce expirée : {p}', { p: t(PIECES[a.piece]) }) : tf('{p} : expire le {date}', { p: t(PIECES[a.piece]), date: jourAn(a.expireLe, langue) }),
        detail: a.niveau === 'urgent' ? t('Plus de nouveau paquet jusqu’à la vérification de la nouvelle pièce. Ce n’est pas une sanction.') : t('Renouvelez-la avant l’expiration pour continuer à recevoir des paquets.'),
        vers: chemin(a.route),
      }
    case 'certification':
      return { id: a.id, ton, icone: 'graduation-cap', titre: a.niveau === 'urgent' ? t('Certification expirée') : tf('Certification à refaire avant le {date}', { date: jourAn(a.expireLe, langue) }), detail: t('Sans badge valide, aucun nouveau paquet ne vous est affecté.'), vers: chemin(a.route) }
    case 'modules':
      return { id: a.id, ton: 'amber', icone: 'book-open', titre: t('Modules à revoir avant le prochain paquet'), detail: null, vers: chemin(a.route) }
  }
}

function Pied({ j }: { j: Journee }) {
  const { t, tf, langue } = usePreferences()
  const enLigne = useEnLigne()
  const file = useFile()
  const n = enAttente(file).length
  const h = j.derniereSynchronisation ? heure(j.derniereSynchronisation, langue) : null
  return (
    <Link className="l4-foot" to={chemin('synchronisation')}>
      <Foot icone={enLigne ? 'wifi' : 'wifi-off'}>
        {enLigne
          ? (h ? tf('Connecté · synchronisé à {h}', { h }) : t('Connecté')) + ' · ' + (n === 0 ? t('aucune preuve en attente') : n === 1 ? t('1 preuve en attente') : tf('{n} preuves en attente', { n }))
          : h
            ? tf('Hors connexion · dernière synchronisation à {h}', { h })
            : t('Hors connexion')}
      </Foot>
    </Link>
  )
}
