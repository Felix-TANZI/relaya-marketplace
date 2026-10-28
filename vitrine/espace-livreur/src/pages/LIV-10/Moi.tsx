// LIV-P29 · Moi : le PROFIL du livreur (avatar de l'en-tête et onglet « Moi » ; le « ☰ » ouvre le Menu, page distincte).
// Structure du prototype (route('moi'), livc_moi) : héros d'alerte de pièce, héros nuit d'identité, « Véhicule et zones »,
// « Pièces », « Mon espace » en tuiles, barre SOS, carte du compte, pied. DP-66 (rôle du livreur : son employeur est
// l'entreprise ; il voit ou demande ce qui est contractuel, ne décide jamais), dans l'ordre :
// 1. ma fiche (lecture) : identité vérifiée (photo, nom, entreprise, numéro masqué, identifiant ; « Qui voit ma fiche ? »),
//    véhicule et zones (changés par l'entreprise : « Demander un changement » ouvre le fil) ;
// 2. mes pièces : état de chaque pièce et de la certification ; renvoi SEULEMENT si la pièce est refusée, demandée par
//    l'entreprise (relance, nouvelle vérification de la photo), expirée ou bientôt expirée ; la photo est l'identité
//    vérifiée, elle ne se change pas à volonté ;
// 3. à 6. mes gains, mon score, mes preuves (historique), prévenir d'une absence (planning, feuille), puis aide et
//    réglages (« Mon espace ») ; barre SOS ;
// 7. tout en bas : mes données personnelles (loi n° 2024/017) et « Demander à quitter » (feuille ?sheet=depart) : une
//    demande avec motif, sans effet immédiat, annulable tant qu'elle n'est pas close ; état « Départ demandé · préavis
//    jusqu'au … » avec les conditions de clôture (aucune mission, aucun colis sous garde, kit constaté par l'entreprise ;
//    les litiges suivent leur cours) ; l'entreprise clôture (même avant la fin du préavis, d'un commun accord), BelivaY
//    en secours après le préavis. DP-67 : il travaille normalement jusqu'à la veille du dernier jour du préavis, plus
//    aucune nouvelle mission ensuite ; « hors service » sans point de Trust Score perdu ; « Mon kit » (constat, retenue,
//    « Contester ») et « Mon dernier versement » (depart.tsx) ; nouvelle photo : « nouvelle vérification demandée » avec
//    le délai PHOTO-REVERIF-J (il continue de travailler), puis plus de nouvelle mission jusqu'à la validation.
// Règles : LIV-10-R23 à R32, LIV-P29R-01 à R03, LIV-ENT-03/04, DED-21, DED-31, DP-66 ; alerte J−LIV-PIECE-ALERTE-J ; une
// pièce expirée restreint automatiquement l'accès (ce n'est pas une sanction) ; préavis DEPART-PREAVIS-J.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Feuille, useFeuille } from '@client/composants/Feuille'
import { COORDONNEES } from '@client/config/coordonnees'
import { PARAMETRES } from '../../calculs/registre'
import { Pourquoi } from '../../composants/enrichis'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import { enAttente, useEnLigne, useFile } from '../../donnees/fileHorsLigne'
import { MOTIFS_DEPART, type Depart, type IdPiece, type MotifDepart, type Piece, type Profil } from '../../donnees/domaines/moi'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { heure, jourLong } from '../../i18n/temps'
import { joursRestants } from '../../calculs/absence'
import { debutDuJour, jourDe } from '../../calculs/temps'
import { Ecran } from '../../composants/coque'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { CarteDesZones, type EtatZone } from '../../composants/CarteDesZones'
import { BadgeNum, Btn, Chips, Coche, Foot, HorsConnexion, Hint, Li, Note, Pill, Sec, St, type Ton } from '../../composants/proto'
import { ChampPhotos, Chargement, Encadre, ErreurLecture, useMaintenant, useOrigine, type PhotoPrise } from '../LIV-08/commun'
import { CarteKit, CarteVersement } from './depart'
import { LivcSh } from './livc'
import './liv10.css'

const PIECES: Record<IdPiece, string> = {
  cni: 'Carte nationale d’identité',
  selfie: 'Selfie avec preuve de vie',
  permis: 'Permis de conduire',
  carte_grise: 'Carte grise',
  photo_vehicule: 'Photo du véhicule avec la plaque',
  assurance: 'Attestation d’assurance',
}
const ETATS: Record<Piece['etat'], [string, Ton]> = {
  a_jour: ['À jour', 'green'],
  expire_bientot: ['Expire bientôt', 'amber'],
  expiree: ['Expirée', 'red'],
  en_verification: ['En vérification', 'acc'],
  refusee: ['Refusée', 'red'],
  reverification: ['Nouvelle vérification demandée', 'amber'],
}
const ICONE_PIECE: Record<IdPiece, string> = { cni: 'id-card', selfie: 'scan-face', permis: 'id-card', carte_grise: 'file-text', photo_vehicule: 'bike', assurance: 'file-check' }
const TON_PIECE: Partial<Record<Ton, Ton>> = { green: 'acc', amber: 'amber', red: 'red', acc: 'acc', blue: 'blue', ink: 'ink', or: 'or', violet: 'violet', dk: 'ink', night: 'night', accs: 'acc', '': '' }
/** Motifs d'un départ (liste courte, moteurs/belivay_moteurs/depart.py). */
const MOTIFS: Record<MotifDepart, string> = {
  autre_emploi: 'Autre emploi',
  horaires: 'Horaires',
  remuneration: 'Rémunération',
  demenagement: 'Déménagement',
  sante: 'Santé',
  personnel: 'Raison personnelle',
  autre: 'Autre',
}
const VOIT: [string, string, string][] = [
  ['building-2', 'Votre entreprise', 'Nom, photo, statut, Trust Score, pièces (leur état, jamais leurs images), position pendant les missions.'],
  ['shield-check', 'BelivaY', 'Votre dossier complet, pour la sécurité, les litiges et la vérification des pièces.'],
  ['store', 'Vendeurs et gérants de relais', 'Votre prénom, votre nom et votre photo au moment de la remise, pour vous reconnaître.'],
  ['home', 'Clients', 'Votre position arrondie et l’heure estimée pendant une remise à domicile. Jamais votre numéro : les appels sont masqués.'],
]

// Véhicules dessinés du prototype (VEH) : le véhicule déclaré à l'entreprise, sans photo.
const VEHICULES: Record<string, string> = {
  moto: '<circle cx="14" cy="28" r="9" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="50" cy="28" r="9" fill="none" stroke="currentColor" stroke-width="3"/><path d="M14 28 L26 14 L40 15 L50 28" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><rect x="38" y="6" width="14" height="11" rx="2" fill="#EF6A00"/><path d="M26 14 L22 8 H16" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
  tricycle: '<circle cx="12" cy="30" r="7" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="46" cy="30" r="7" fill="none" stroke="currentColor" stroke-width="3"/><rect x="30" y="8" width="28" height="18" rx="2" fill="#EF6A00"/><path d="M12 30 L20 16 H30 M20 16 L16 8 H10" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
  voiture: '<path d="M6 26 L10 16 Q12 12 18 12 H40 Q46 12 50 17 L58 20 Q60 21 60 24 V28 H6Z" fill="currentColor"/><path d="M16 15 H28 V20 H13Z M31 15 H40 Q44 15 46 19 L31 20Z" fill="#9CC3DC"/><circle cx="18" cy="29" r="6" fill="#171310" stroke="#fff" stroke-width="2"/><circle cx="48" cy="29" r="6" fill="#171310" stroke="#fff" stroke-width="2"/>',
  camionnette: '<rect x="4" y="8" width="36" height="20" rx="2" fill="currentColor"/><path d="M40 13 H50 L58 20 V28 H40Z" fill="currentColor"/><path d="M43 15 H49 L54 20 H43Z" fill="#9CC3DC"/><rect x="8" y="14" width="18" height="4" fill="#EF6A00"/><circle cx="16" cy="30" r="5.5" fill="#171310" stroke="#fff" stroke-width="2"/><circle cx="48" cy="30" r="5.5" fill="#171310" stroke="#fff" stroke-width="2"/>',
}
const vehiculeDessin = (type: string) => VEHICULES[type.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()] ?? VEHICULES.moto

/** Tuile de « Mon espace » (livc_menuTile du prototype). */
function Tuile({ vers, icone, ton, t, s, badge }: { vers: string; icone: string; ton: string; t: string; s: string; badge?: React.ReactNode }) {
  return (
    <Link to={vers}>
      {badge && <span className="mb">{badge}</span>}
      <span className={'livc-ic ' + ton} style={{ width: 42, height: 42 }}>
        <Icone nom={icone} taille={21} />
      </span>
      <span className="mt">{t}</span>
      <span className="ms">{s}</span>
    </Link>
  )
}

export default function Moi() {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const en = useEnLigne()
  const m = useMaintenant()
  const file = useFile()
  const p = useLecture(() => source.moi.profil(), [])
  const tr = useLecture(() => source.trust.trust(), [])
  const act = useLecture(() => source.activite.activite('jour'), [])
  const aide = useLecture(() => source.aide.aide(), [])
  const planning = useLecture(() => source.disponibilite.planning(), [])
  const feuillePiece = useFeuille('piece')
  const feuilleDonnees = useFeuille('donnees')
  const feuilleDepart = useFeuille('depart')
  const [piece, setPiece] = useState<IdPiece | null>(null)
  if (p.erreur) return <Ecran route="moi" proto action="sos"><ErreurLecture relire={p.relire} /></Ecran>
  if (!p.donnees) return <Ecran route="moi" proto action="sos"><Chargement lignes={4} /></Ecran>
  const d: Profil = p.donnees
  const l = s.livreur
  const entreprise = l?.entreprise ?? ''
  const bientot = d.pieces.filter((x) => x.etat === 'expire_bientot')
  const expirees = d.pieces.filter((x) => x.etat === 'expiree')
  const demandees = d.pieces.filter((x) => x.demandee && x.renvoyable)
  const jours = (x: Piece) => (x.expireLe ? Math.max(0, Math.ceil((x.expireLe - m()) / 86_400_000)) : 0)
  const mettreAJour = (id: IdPiece) => (setPiece(id), feuillePiece.ouvrir())
  const selfie = d.pieces.find((x) => x.id === 'selfie')
  const aMettreAJour = expirees[0] ?? demandees[0] ?? bientot[0] ?? d.pieces.find((x) => x.etat === 'refusee') ?? null
  const attente = enAttente(file).length
  const palier = (x: string) => t(x === 'or' ? 'Or' : x === 'confirme' ? 'Confirmé' : 'Nouveau')
  const trust = tr.donnees ? tf('Trust {s} · {p}', { s: tr.donnees.score ?? '—', p: palier(tr.donnees.palier) }) : null
  const dispo = d.restreint ? t('Suspension automatique') : t(s.disponibilite === 'disponible' ? 'Disponible' : s.disponibilite === 'en_pause' ? 'En pause' : 'Hors service')
  const zones: Record<string, EtatZone> = {}
  for (const z of ['Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6', 'Z7', 'Z8', 'Z9', 'Z10', 'Z11', 'Z12']) zones[z] = 'sale'
  for (const z of d.zones) zones[z.code] = z.principale ? 'focus' : 'on'
  const depart = d.depart
  const absences = planning.donnees?.absences.length ?? 0
  return (
    <Ecran
      route="moi"
      proto
      action="sos"
      fixes={
        <>
          <FeuillePiece f={feuillePiece} id={piece} profil={d} />
          <FeuilleDonnees f={feuilleDonnees} profil={d} />
          <FeuilleDepart f={feuilleDepart} depart={depart} entreprise={entreprise} relire={p.relire} />
        </>
      }
    >
      {!en && (
        <HorsConnexion>
          <b>{t('Hors connexion')}</b> · {attente ? (attente > 1 ? tf('{n} gestes en attente d’envoi', { n: attente }) : t('1 geste en attente d’envoi')) : t('Rien en attente d’envoi.')}{' '}
          {file?.horsLigneDepuis ? tf('Dernières données téléchargées à {h}.', { h: heure(file.horsLigneDepuis, langue) }) : ''}
        </HorsConnexion>
      )}
      {expirees.length > 0 || d.restreint ? (
        <div className="hero red" role="alert">
          <div className="hk" style={{ color: '#FFB4AB' }}>{t('Suspension automatique · ce n’est pas une sanction')}</div>
          <div className="ht">{expirees.length ? tf('{p} expirée le {d}', { p: t(PIECES[expirees[0].id]), d: jourLong(expirees[0].expireLe ?? 0, langue) }) : t('Certification expirée')}</div>
          <div className="hs">{tf('Vous ne recevez plus de nouveau paquet jusqu’à la vérification de la nouvelle pièce, {h} h ouvrées au plus. Les missions déjà en cours se terminent.', { h: d.verification.revueH })}</div>
          {expirees.length > 0 && (
            <div className="btns">
              <button type="button" className="btn white" onClick={() => mettreAJour(expirees[0].id)}>
                <Icone nom="camera" taille={18} />
                <span>{t('Envoyer la nouvelle pièce')}</span>
              </button>
            </div>
          )}
        </div>
      ) : d.photoBloquee ? (
        <div className="hero red" role="alert">
          <div className="hk" style={{ color: '#FFB4AB' }}>{t('Nouvelle photo · délai passé')}</div>
          <div className="ht">{t('Plus de nouvelle mission jusqu’à la validation de votre photo')}</div>
          <div className="hs">
            {selfie?.etat === 'en_verification'
              ? tf('Photo envoyée, en vérification ({n} min au plus) : les nouvelles missions reprennent dès sa validation. Les missions en cours se terminent.', { n: d.verification.autoMin })
              : tf('{m} Envoyez le selfie maintenant : les nouvelles missions reprennent dès sa validation. Les missions en cours se terminent.', { m: selfie?.demandee?.motif ?? '' })}
          </div>
          {selfie?.renvoyable && (
            <div className="btns">
              <button type="button" className="btn white" onClick={() => mettreAJour('selfie')}>
                <Icone nom="scan-face" taille={18} />
                <span>{t('Prendre le selfie')}</span>
              </button>
            </div>
          )}
        </div>
      ) : demandees.length > 0 ? (
        <div className="hero amber">
          <div className="hk" style={{ color: '#FFD98A' }}>{tf('Demandée par {entreprise}', { entreprise })}</div>
          <div className="ht">{t(demandees[0].id === 'selfie' ? 'Nouvelle vérification de votre photo' : PIECES[demandees[0].id])}</div>
          <div className="hs">{demandees[0].demandee!.motif}</div>
          {demandees[0].demandee!.jusqua !== null && (
            <div className="hs" style={{ marginTop: 6 }}>
              <b>{joursRestants(demandees[0].demandee!.jusqua, m()) <= 1 ? t('Encore 1 jour') : tf('Encore {n} jours', { n: joursRestants(demandees[0].demandee!.jusqua, m()) })}</b> · {tf('à envoyer avant le {d} à {h}. Vous continuez à travailler d’ici là.', { d: jourLong(demandees[0].demandee!.jusqua, langue), h: heure(demandees[0].demandee!.jusqua, langue) })}
            </div>
          )}
          <div className="btns">
            <button type="button" className="btn white" onClick={() => mettreAJour(demandees[0].id)}>
              <Icone nom={demandees[0].id === 'selfie' ? 'scan-face' : 'camera'} taille={18} />
              <span>{t(demandees[0].id === 'selfie' ? 'Prendre le selfie' : 'Envoyer la pièce')}</span>
            </button>
          </div>
        </div>
      ) : bientot.length > 0 ? (
        <div className="hero amber">
          <div className="hk" style={{ color: '#FFD98A' }}>{tf('Pièce qui expire · dans {n} jours', { n: jours(bientot[0]) })}</div>
          <div className="ht">{tf('{p} : expire le {d}', { p: t(PIECES[bientot[0].id]), d: jourLong(bientot[0].expireLe ?? 0, langue) })}</div>
          <div className="hs">{t('Envoyez la nouvelle pièce avant cette date : une pièce expirée suspend automatiquement la réception de nouveaux paquets le jour même. Ce n’est pas une sanction.')}</div>
          <div className="btns">
            <button type="button" className="btn white" onClick={() => mettreAJour(bientot[0].id)}>
              <Icone nom="camera" taille={18} />
              <span>{t('Mettre à jour')}</span>
            </button>
          </div>
        </div>
      ) : null}
      {depart && (
        <Note ton={depart.etat === 'close' ? 'ink' : 'amber'} icone="door-open" role="status">
          <b>{depart.etat === 'close' ? t('Départ clôturé.') : depart.initiative === 'entreprise' ? tf('Fin de contrat décidée par {entreprise} · préavis jusqu’au {d}.', { entreprise, d: jourLong(depart.preavisJusqua, langue) }) : tf('Départ demandé · préavis jusqu’au {d}.', { d: jourLong(depart.preavisJusqua, langue) })}</b>{' '}
          {depart.etat === 'close'
            ? tf('Rattachement à {entreprise} fermé le {d}.', { entreprise, d: jourLong(depart.closLe ?? 0, langue) })
            : jourDe(m()) >= jourDe(depart.affectationJusqua)
              ? t('Dernier jour du préavis : plus aucune nouvelle mission.')
              : tf('Vous travaillez normalement jusqu’à la veille du {d}.', { d: jourLong(depart.affectationJusqua, langue) })}{' '}
          <button type="button" className="l10-lien" onClick={feuilleDepart.ouvrir}>
            {t('Voir')}
          </button>
        </Note>
      )}
      <div className="hero night">
        <div className="livc-idc">
          <span className="ph l10-ph">{l?.photo ? <img src={l.photo} alt="" /> : <span className="l10-init">{l?.initiales}</span>}</span>
          <div className="grow">
            <div className="hk">{t('Livreur partenaire')}</div>
            <div className="ht" style={{ marginTop: 2 }}>
              {l ? `${l.prenom} ${l.nom}` : ''}
            </div>
            <div className="hs" style={{ marginTop: 2 }}>
              {tf('{entreprise} · activé le {d}', { entreprise, d: jourLong(d.activeLe, langue) })}
            </div>
          </div>
        </div>
        <div className="row wrap" style={{ gap: 6, marginTop: 12 }}>
          <Pill ton="dk" icone="badge-check">
            {tf('Certifié · {n}', { n: d.certification.note.replace('/', ' sur ') })}
          </Pill>
          {trust && (
            <Pill ton="dk" icone="gauge">
              {trust}
            </Pill>
          )}
          <Pill ton="dk" point>
            {dispo}
          </Pill>
        </div>
        <div className="hs l10-ident" style={{ marginTop: 10 }}>
          <span className="no-tr">{d.numeroMasque}</span> · <span className="no-tr">{l?.id}</span>
        </div>
        <div className="hs" style={{ marginTop: 6 }}>
          {t('Montrez cet écran au vendeur et au gérant : votre nom et votre photo vous identifient, sans aucun signe BelivaY sur vous.')}
        </div>
      </div>
      <Pourquoi libelle="Qui voit ma fiche ?">
        <div className="card tight" style={{ marginTop: 6 }}>
          {VOIT.map(([icone, qui, quoi]) => (
            <Li key={qui} icone={icone} ton="ink" t={t(qui)} s={t(quoi)} />
          ))}
        </div>
        {t('Votre Trust Score n’est jamais montré aux clients, aux vendeurs ni aux relais. Votre nom et votre photo viennent de vos pièces vérifiées.')}
      </Pourquoi>
      <Sec titre={t('Véhicule et zones')} />
      <div className="card">
        <div className="livc-veh">
          <span className="vi">
            <svg viewBox="0 0 64 40" width="64" height="40" aria-hidden="true" dangerouslySetInnerHTML={{ __html: vehiculeDessin(d.vehicule.type) }} />
          </span>
          <div className="grow">
            <div className="b8 t17">
              {t(d.vehicule.type)} <span className="livc-plate">{d.vehicule.immatriculation}</span>
            </div>
            <div className="t13 c3 mt4">{tf('Classes transportées : {c} · jamais XL', { c: d.vehicule.classes.join(', ') })}</div>
            <div className="t13 c3">{t(d.vehicule.capacite)}</div>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <CarteDesZones zones={zones} cadre={d.zones.map((z) => z.code)} hauteur={200} label={tf('Vos zones : {z}', { z: d.zones.map((z) => `${z.code} ${z.nom}`).join(', ') })} />
        </div>
        <Chips items={d.zones.map((z) => ({ t: z.principale ? tf('{c} {n} · principale', { c: z.code, n: z.nom }) : `${z.code} ${z.nom}`, on: z.principale }))} />
        <Hint>{tf('Pour changer de véhicule ou de zones, demandez-le à {entreprise} : elle les met à jour dans son portail.', { entreprise })}</Hint>
        <Link className="btn secondary mt10" to={chemin('messages', { fil: 'F1' })}>
          <Icone nom="message-circle" taille={18} />
          <span>{tf('Demander un changement à {entreprise}', { entreprise })}</span>
        </Link>
      </div>
      <Sec titre={t('Pièces')} lien={aMettreAJour ? t('Mettre à jour') : undefined} onClick={aMettreAJour ? () => mettreAJour(aMettreAJour.id) : undefined} />
      <div className="card tight">
        {d.pieces.map((x) => {
          const [etat0, ton] = x.demandee && x.renvoyable && x.etat === 'a_jour' ? (['Demandée', 'amber'] as [string, Ton]) : ETATS[x.etat]
          const etat = x.etat === 'a_jour' && !x.demandee ? (x.expireLe ? 'Valide' : 'Vérifiée') : etat0
          return (
            <Li
              key={x.id}
              icone={ICONE_PIECE[x.id]}
              ton={TON_PIECE[ton]}
              t={t(PIECES[x.id])}
              s={
                x.etat === 'en_verification'
                  ? tf('Vérification automatique en {n} min au plus ; un doute est tranché par une personne sous {h} h ouvrées.', { n: d.verification.autoMin, h: d.verification.revueH })
                  : x.etat === 'refusee'
                    ? tf('Refusée : {m}', { m: x.motifRefus ?? '' })
                    : x.demandee && x.renvoyable
                      ? tf('Demandée par {entreprise} le {d} : {m}', { entreprise, d: jourLong(x.demandee.le, langue), m: x.demandee.motif }) + (x.demandee.jusqua !== null ? ' · ' + tf('à envoyer avant le {d}', { d: jourLong(x.demandee.jusqua, langue) }) : '')
                      : x.expireLe
                        ? x.etat === 'expire_bientot'
                          ? tf('Exigée par {entreprise} · expire le {d} · dans {n} jours', { entreprise, d: jourLong(x.expireLe, langue), n: jours(x) })
                          : x.etat === 'expiree'
                            ? tf('Expirée le {d} · suspension automatique', { d: jourLong(x.expireLe, langue) })
                            : tf('Valable jusqu’au {d}', { d: jourLong(x.expireLe, langue) })
                        : t('Vérifiée · sans date de validité')
              }
              droite={<St ton={ton}>{t(etat)}</St>}
              onClick={x.renvoyable ? () => mettreAJour(x.id) : undefined}
              aria={x.renvoyable ? tf('Mettre à jour : {p}', { p: t(PIECES[x.id]) }) : undefined}
            />
          )
        })}
        <Li icone="graduation-cap" ton="violet" t={t('Certification')} s={tf('Valable jusqu’au {d}', { d: jourLong(d.certification.valableJusqua, langue) })} droite={<St ton="green">{t('Réussie')}</St>} vers={chemin('certification')} />
      </div>
      <Hint icone="scan-face">{tf('Votre photo de profil se change dans Mon compte ; {entreprise} en est prévenue et peut demander une nouvelle vérification.', { entreprise })}</Hint>
      <Hint icone="eye-off">{tf('Alerte {n} jours avant l’expiration. {entreprise} voit le statut de vos pièces, jamais leurs images ni leurs numéros. Une pièce se renvoie quand elle est refusée, demandée ou proche de l’expiration.', { n: d.alerteJours, entreprise })}</Hint>
      <Sec titre={t('Mon espace')} />
      <div className="livc-menu">
        <Tuile vers={chemin('activite')} icone="chart-column" ton="acc" t={t('Mes gains')} s={act.donnees ? (act.donnees.totalMissions === 1 ? t('1 mission validée aujourd’hui') : tf('{n} missions validées aujourd’hui', { n: act.donnees.totalMissions })) : t('Jour, semaine, mois, relevés')} />
        <Tuile vers={chemin('trust')} icone="gauge" ton="acc" t={t('Mon score')} s={tr.donnees ? tf('{s} · {p}', { s: tr.donnees.score ?? '—', p: palier(tr.donnees.palier) }) : t('Note et événements')} badge={tr.donnees?.score != null ? <BadgeNum n={Math.round(tr.donnees.score)} ton="acc" /> : null} />
        <Tuile vers={chemin('historique')} icone="history" ton="blue" t={t('Mes preuves')} s={t('Historique · 180 jours de preuves')} />
        <Tuile vers={chemin('planning', { sheet: 'absence' })} icone="calendar-x" ton="or" t={t('Prévenir d’une absence')} s={absences === 0 ? t('Votre entreprise s’organise') : absences === 1 ? t('1 absence prévenue') : tf('{n} absences prévenues', { n: absences })} />
        <Tuile vers={chemin('aide')} icone="life-buoy" ton="red" t={t('Aide et SOS')} s={t('Fiches hors connexion')} />
        <Tuile vers={chemin('mon-compte')} icone="circle-user-round" ton="acc" t={t('Mon compte')} s={t('Photo, numéro, e-mail, mot de passe')} />
        <Tuile vers={chemin('reglages')} icone="settings" ton="ink" t={t('Réglages')} s={t('PIN, sons, langue, thème')} />
      </div>
      <Link className="livc-sosbar" to={chemin('aide', { s: 'sos' })}>
        <span className="ci">SOS</span>
        <span className="grow">
          <b>{t('Danger immédiat ?')}</b>
          <span>{aide.donnees ? tf('Maintenez {n} secondes : {entreprise} puis le support BelivaY sont appelés, votre position est partagée {m} minutes.', { n: aide.donnees.sos.appuiS, entreprise, m: aide.donnees.sos.partageMin }) : tf('Maintenez le bouton : {entreprise}, puis le support BelivaY.', { entreprise })}</span>
        </span>
        <Icone nom="chevron-right" taille={20} />
      </Link>
      <div className="card tight">
        <Li icone="file-down" ton="blue" t={t('Mes données personnelles')} s={t('Demander l’accès, l’export ou l’effacement (loi n° 2024/017)')} onClick={feuilleDonnees.ouvrir} />
        <Li icone="door-open" ton="red" t={t('Demander à quitter')} s={depart ? (depart.etat === 'close' ? t('Départ clôturé') : depart.initiative === 'entreprise' ? tf('Fin de contrat · préavis jusqu’au {d}', { d: jourLong(depart.preavisJusqua, langue) }) : tf('Départ demandé · préavis jusqu’au {d}', { d: jourLong(depart.preavisJusqua, langue) })) : tf('Une demande à {entreprise}, avec préavis', { entreprise })} onClick={feuilleDepart.ouvrir} />
      </div>
      <Foot icone={en ? 'shield-check' : 'wifi-off'}>
        {en ? tf('BelivaY livreur · version {v} · {entreprise}', { v: import.meta.env.VITE_VERSION_LIVREUR ?? '', entreprise }) : file?.horsLigneDepuis ? tf('Hors connexion · dernières données téléchargées à {h}', { h: heure(file.horsLigneDepuis, langue) }) : t('Hors connexion')}
      </Foot>
    </Ecran>
  )
}

type F = ReturnType<typeof useFeuille>

/** « Demander à quitter » (DP-66) : demande avec motif, état pendant le préavis et conditions, annulation, clôture. */
function FeuilleDepart({ f, depart, entreprise, relire }: { f: F; depart: Depart | null; entreprise: string; relire: () => void }) {
  const { t, tf, langue } = usePreferences()
  const o = useOrigine()
  const m = useMaintenant()
  const en = useEnLigne()
  const [motif, setMotif] = useState<MotifDepart | null>(null)
  const [texte, setTexte] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoyee, setEnvoyee] = useState(false)
  const preavis = PARAMETRES.livreur.departPreavisJours
  const fermer = () => (setMotif(null), setTexte(''), setErreur(null), setEnvoyee(false), f.fermer())
  const demander = async () => {
    if (!motif) return
    setEnvoi(true)
    const r = await source.moi.demanderDepart({ motif, texte: texte.trim() || null }, o())
    setEnvoi(false)
    if (!r.ok) {
      signal('erreur')
      return setErreur(r.raison === 'deja_demande' ? 'Une demande est déjà en cours.' : 'Choisissez un motif dans la liste.')
    }
    signal('succes')
    setEnvoyee(true)
    relire()
  }
  const annuler = async () => {
    setEnvoi(true)
    const r = await source.moi.annulerDepart(o())
    setEnvoi(false)
    signal(r.ok ? 'succes' : 'erreur')
    if (!r.ok) return setErreur(r.raison === 'deja_close' ? 'Le départ est déjà clôturé : il ne s’annule plus.' : 'Aucune demande en cours.')
    setEnvoyee(false)
    relire()
  }
  const donnees = (
    <Note ton="ink" icone="file-down">
      {tf('Après votre départ, vos preuves restent 180 jours (litiges). Vos données personnelles se demandent toujours à BelivaY, hors de l’application : {e} ou {tel}.', { e: COORDONNEES.email, tel: COORDONNEES.telephone })}
    </Note>
  )
  return (
    <Feuille ouverte={f.ouverte} fermer={fermer} titre={t('Demander à quitter')} classe="livc-sheet">
      <LivcSh titre={depart?.etat === 'close' ? t('Départ clôturé') : depart?.initiative === 'entreprise' ? t('Fin de contrat') : depart ? t('Départ demandé') : tf('Quitter {entreprise} ?', { entreprise })} sous={tf('Votre employeur est {entreprise}, pas BelivaY', { entreprise })} icone="door-open" ton="red" fermer={fermer} />
      {depart?.etat === 'close' ? (
        <>
          <div className="card flat" style={{ marginTop: 14 }}>
            <Li icone="calendar-check" ton="ink" t={tf('Clôturé le {d}', { d: jourLong(depart.closLe ?? 0, langue) })} s={depart.closPar === 'admin' ? tf('Par BelivaY, à la fin du préavis : {entreprise} ne l’avait pas fait.', { entreprise }) : tf('Par {entreprise}', { entreprise })} />
            {depart.versementLe && <Li icone="wallet" ton="acc" t={depart.versement.faitLe ? tf('Dernier versement fait le {d}', { d: jourLong(depart.versement.faitLe, langue) }) : tf('Dernier versement le {d}', { d: jourLong(depart.versementLe, langue) })} s={tf('En Mobile Money, par {entreprise}', { entreprise })} />}
          </div>
          <CarteKit depart={depart} entreprise={entreprise} relire={relire} />
          <CarteVersement depart={depart} entreprise={entreprise} />
          {donnees}
        </>
      ) : depart ? (
        <>
          <div className="hero amber" style={{ marginTop: 14 }} role="status">
            <div className="hk">{depart.initiative === 'entreprise' ? tf('Décidée par {entreprise} le {d}', { entreprise, d: jourLong(depart.demandeLe, langue) }) : tf('Demandé le {d}', { d: jourLong(depart.demandeLe, langue) })}</div>
            <div className="ht">{tf('Préavis jusqu’au {d}', { d: jourLong(depart.preavisJusqua, langue) })}</div>
            <div className="hs">
              {jourDe(m()) >= jourDe(depart.affectationJusqua)
                ? t('Dernier jour du préavis : plus aucune nouvelle mission. Vous terminez celles en cours.')
                : tf('Vous continuez à travailler normalement jusqu’à la veille du {d}. À partir de ce jour, plus aucune nouvelle mission.', { d: jourLong(depart.affectationJusqua, langue) })}
            </div>
          </div>
          {depart.initiative === 'entreprise' && depart.texte && (
            <Note ton="ink" icone="file-text">
              <b>{t('Motif écrit')}</b> · {depart.texte}
            </Note>
          )}
          <Note ton="acc" icone="moon-star">
            {t('Pendant le préavis, passer « hors service » ne vous coûte aucun point de Trust Score.')}
          </Note>
          {envoyee && donnees}
          <Sec titre={tf('Ce que {entreprise} vérifie avant de clôturer', { entreprise })} />
          <div className="card flat">
            <Coche on={!depart.conditions.missionEnCours} bad={depart.conditions.missionEnCours}>
              <b>{t(depart.conditions.missionEnCours ? 'Une mission est en cours' : 'Aucune mission en cours')}</b>
            </Coche>
            <Coche on={depart.conditions.colisSousGarde === 0} bad={depart.conditions.colisSousGarde > 0}>
              <b>{depart.conditions.colisSousGarde > 0 ? tf('{n} colis encore sous votre garde', { n: depart.conditions.colisSousGarde }) : t('Aucun colis sous votre garde')}</b>
            </Coche>
            <Coche on={depart.conditions.kitConstate}>
              <b>{t(depart.conditions.kitConstate ? 'Kit constaté par votre entreprise' : 'Kit à rendre à votre entreprise')}</b> · {t('elle constate son état')}
            </Coche>
            {depart.conditions.litigesOuverts > 0 && (
              <Coche>
                <b>{depart.conditions.litigesOuverts === 1 ? t('1 litige ouvert') : tf('{n} litiges ouverts', { n: depart.conditions.litigesOuverts })}</b> · {t('il suit son cours après votre départ, sans vous retenir')}
              </Coche>
            )}
          </div>
          <Hint icone="calendar-check">{tf('D’un commun accord, {entreprise} peut clôturer avant la fin du préavis, dès que tout est rempli.', { entreprise })}</Hint>
          <Hint icone="info">{tf('Si {entreprise} n’a pas clôturé à la fin du préavis et que tout est rempli, BelivaY clôture : personne ne vous retient.', { entreprise })}</Hint>
          <CarteKit depart={depart} entreprise={entreprise} relire={relire} />
          <CarteVersement depart={depart} entreprise={entreprise} />
          {erreur && (
            <Note ton="red" icone="circle-alert" role="alert">
              {t(erreur)}
            </Note>
          )}
          <div className="btns" style={{ marginTop: 14 }}>
            {depart.initiative !== 'entreprise' && (
              <Btn kind="secondary" icone="undo-2" off={!en || envoi} onClick={() => void annuler()}>
                {t('Annuler ma demande')}
              </Btn>
            )}
            <Btn kind="ghost" onClick={fermer}>
              {t('Fermer')}
            </Btn>
          </div>
        </>
      ) : (
        <>
          <p className="lc-texte" style={{ marginTop: 12 }}>
            {tf('Aucun effet immédiat : {entreprise} est prévenue et vous continuez à travailler normalement pendant un préavis de {n} jours, jusqu’à la veille du dernier jour ; vous rendez ensuite votre kit. Vous pouvez annuler tant que ce n’est pas clôturé.', { entreprise, n: preavis })}
          </p>
          <div className="lc-champ">
            <span className="lc-lib">{t('Motif')}</span>
            <div role="radiogroup" aria-label={t('Motif')}>
              {MOTIFS_DEPART.map((x) => (
                <button key={x} type="button" role="radio" aria-checked={motif === x} className={'radio' + (motif === x ? ' on' : '')} onClick={() => (setMotif(x), setErreur(null))}>
                  <span className="rd" />
                  <span className="grow">
                    <span className="rt" style={{ display: 'block' }}>
                      {t(MOTIFS[x])}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="lc-champ">
            <label htmlFor="l10-depart-texte">{t('Un mot pour votre entreprise (facultatif)')}</label>
            <textarea id="l10-depart-texte" maxLength={500} value={texte} onChange={(e) => setTexte(e.target.value)} />
          </div>
          <Note ton="amber" icone="triangle-alert">
            {t('Arrêter en pleine tournée n’est pas un départ : signalez un incident, votre entreprise reprend les colis.')}{' '}
            <Link className="l10-lien" to={chemin('incident')}>
              {t('Signaler un incident')}
            </Link>
          </Note>
          {erreur && (
            <Note ton="red" icone="circle-alert" role="alert">
              {t(erreur)}
            </Note>
          )}
          {!en && <Hint icone="wifi-off">{t('Il faut du réseau pour envoyer la demande.')}</Hint>}
          <div className="btns" style={{ marginTop: 14 }}>
            <Btn kind="red" icone="door-open" off={!en || !motif || envoi} onClick={() => void demander()}>
              {t('Envoyer ma demande')}
            </Btn>
            <Btn kind="ghost" onClick={fermer}>
              {t('Annuler')}
            </Btn>
          </div>
        </>
      )}
    </Feuille>
  )
}

function FeuillePiece({ f, id, profil }: { f: F; id: IdPiece | null; profil: Profil }) {
  const { t, tf } = usePreferences()
  const o = useOrigine()
  const m = useMaintenant()
  const regles = useLecture(() => source.horsligne.regles(), [])
  const [recto, setRecto] = useState<PhotoPrise[]>([])
  const [verso, setVerso] = useState<PhotoPrise[]>([])
  const [date, setDate] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [fait, setFait] = useState(false)
  const x = profil.pieces.find((y) => y.id === (id ?? profil.pieces.find((z) => z.renvoyable)?.id))
  const fermer = () => (setRecto([]), setVerso([]), setDate(''), setErreur(null), setFait(false), f.fermer())
  if (!x || (!x.renvoyable && !fait)) return null
  const avecDate = x.expireLe !== null
  const pret = recto.length > 0 && (!x.rectoVerso || verso.length > 0) && (!avecDate || !!date)
  const envoyer = async () => {
    const r = await source.moi.envoyerPiece(x.id, { recto: recto.length > 0, verso: verso.length > 0, expireLe: avecDate ? debutDuJour(date) : null }, o())
    if (!r.ok) {
      setErreur(r.raison === 'date_passee' ? 'Cette date est déjà passée : vérifiez la date d’expiration.' : r.raison === 'non_demandee' ? 'Cette pièce n’est pas à renvoyer : elle est à jour et votre entreprise ne l’a pas demandée.' : 'Prenez le recto et le verso.')
      signal('erreur')
      return
    }
    setFait(true)
    signal('succes')
  }
  return (
    <Feuille ouverte={f.ouverte} fermer={fermer} titre={t('Mettre à jour une pièce')}>
      {fait ? (
        <div className="lc-appel" role="status">
          <div className="lc-appel-i on blv-succes">
            <Icone nom="check" taille={30} />
          </div>
          <h2>{t('Pièce envoyée')}</h2>
          <p>{tf('Vérification automatique en {n} min au plus ; un doute est tranché par une personne sous {h} h ouvrées.', { n: profil.verification.autoMin, h: profil.verification.revueH })}</p>
          <button type="button" className="l-btn l-second" onClick={fermer}>
            {t('Fermer')}
          </button>
        </div>
      ) : (
        <div className="l10-feuille">
          <h2 className="lc-f-t">{t(PIECES[x.id])}</h2>
          {x.motifRefus && <Encadre ton="rouge" icone="circle-x" titre={t('Motif du refus')}>{x.motifRefus}</Encadre>}
          {x.demandee && <Encadre ton="ambre" icone="building-2" titre={t('Demandée par votre entreprise')}>{x.demandee.motif}</Encadre>}
          {x.id === 'selfie' && <p className="lc-texte">{t('C’est la photo que le vendeur et le gérant voient avant de vous remettre un colis : un selfie avec preuve de vie, comparé à votre pièce d’identité.')}</p>}
          <div className="lc-champ">
            <span className="lc-lib">{t(x.rectoVerso ? 'Recto' : 'Photo')}</span>
            {regles.donnees && <ChampPhotos photos={recto} changer={setRecto} exigees={1} max={1} maxKo={regles.donnees.photoMaxKo} maintenant={m} />}
          </div>
          {x.rectoVerso && (
            <div className="lc-champ">
              <span className="lc-lib">{t('Verso')}</span>
              {regles.donnees && <ChampPhotos photos={verso} changer={setVerso} exigees={1} max={1} maxKo={regles.donnees.photoMaxKo} maintenant={m} />}
            </div>
          )}
          {avecDate && (
            <div className="lc-champ">
              <label htmlFor="l10-date">{t('Date d’expiration lue sur la pièce')}</label>
              <input id="l10-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          )}
          {erreur && (
            <p className="lc-erreur" role="alert">
              {t(erreur)}
            </p>
          )}
          <div className="lc-f-actions">
            <button type="button" className="l-btn l-principal" disabled={!pret} onClick={() => void envoyer()}>
              <Icone nom="send" taille={20} />
              <span>{t('Envoyer la nouvelle pièce')}</span>
            </button>
            <button type="button" className="l-btn l-second" onClick={fermer}>
              {t('Annuler')}
            </button>
          </div>
        </div>
      )}
    </Feuille>
  )
}

function FeuilleDonnees({ f, profil }: { f: F; profil: Profil }) {
  const { t, tf, langue } = usePreferences()
  const o = useOrigine()
  const en = useEnLigne()
  const [type, setType] = useState<'export' | 'effacement'>('export')
  const [code, setCode] = useState('')
  const [envoye, setEnvoye] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const demander = async () => {
    const r = await source.moi.demanderCodeDonnees()
    if (r.ok) setEnvoye(true)
  }
  const confirmer = async () => {
    const r = await source.moi.demanderDonnees(type, code, o())
    if (!r.ok) {
      setErreur(r.raison === 'code_faux' ? 'Ce code ne correspond pas. Vérifiez le SMS.' : 'Cette demande est déjà en cours.')
      signal('erreur')
      return
    }
    setErreur(null)
    setCode('')
    setEnvoye(false)
    signal('succes')
  }
  return (
    <Feuille ouverte={f.ouverte} fermer={f.fermer} titre={t('Mes données personnelles')}>
      <div className="l10-feuille">
        <h2 className="lc-f-t">{t('Mes données personnelles')}</h2>
        <p className="lc-texte">{t('Loi n° 2024/017 : vous pouvez obtenir une copie de vos données (identité, pièces, missions, positions de mission, événements Trust Score) ou demander leur effacement.')}</p>
        <div className="lc-seg" role="radiogroup" aria-label={t('Demande')}>
          <button type="button" role="radio" aria-checked={type === 'export'} className={type === 'export' ? 'on' : ''} onClick={() => setType('export')}>
            {t('Exporter')}
          </button>
          <button type="button" role="radio" aria-checked={type === 'effacement'} className={type === 'effacement' ? 'on' : ''} onClick={() => setType('effacement')}>
            {t('Effacer')}
          </button>
        </div>
        {type === 'effacement' && (
          <Encadre ton="ambre" icone="info" titre={t('Ce qui est gardé')}>
            {t('Les preuves de vos missions restent 180 jours (litiges) et les écritures comptables 10 ans, comme la loi l’impose ; tout le reste est effacé.')}
          </Encadre>
        )}
        {profil.demandesDonnees.map((x) => (
          <p key={x.type} className="lc-aide">
            <Icone nom={x.etat === 'prete' ? 'file-check' : 'hourglass'} taille={15} />
            {tf(x.type === 'export' ? 'Export demandé le {d} : {e}' : 'Effacement demandé le {d} : {e}', { d: jourLong(x.le, langue), e: t(x.etat === 'prete' ? 'prêt dans Moi' : 'en préparation') })}
          </p>
        ))}
        {!envoye ? (
          <button type="button" className="l-btn l-principal" disabled={!en} onClick={() => void demander()}>
            <Icone nom="smartphone" taille={20} />
            <span>{t('Recevoir le code par SMS')}</span>
          </button>
        ) : (
          <div className="lc-champ">
            <label htmlFor="l10-code">{tf('Code reçu au {n}', { n: profil.numeroMasque })}</label>
            <input id="l10-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
            <button type="button" className="l-btn l-principal" disabled={code.length !== 6} onClick={() => void confirmer()}>
              {t(type === 'export' ? 'Demander l’export' : 'Demander l’effacement')}
            </button>
          </div>
        )}
        {!en && <p className="lc-aide">{t('Il faut du réseau pour recevoir le code.')}</p>}
        {erreur && (
          <p className="lc-erreur" role="alert">
            {t(erreur)}
          </p>
        )}
      </div>
    </Feuille>
  )
}
