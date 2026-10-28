// LIV-P02 · Première connexion et activation. Le livreur sait à tout moment ce qui lui manque pour travailler
// (LIV-RG-R46) : un seul héros selon l'état (bouton vers l'action du moment), l'invitation de l'entreprise en lecture
// seule, la liste d'activation en 5 étapes cochées par le serveur (barre x sur 5, croix rouge si rejet), les pièces
// une à une (statut, motif en clair si rejet, « Renvoyer »), la charte versionnée (acceptation horodatée par le
// serveur). Activation complète ⇔ charte ∧ pièces vérifiées ∧ certification ∧ approbation de l'entreprise ∧
// entreprise active (LIV-03-R17). L'entreprise voit le statut des pièces, jamais leur image (rappel d'anonymat).
// Un compte actif y retrouve son activation et la validité de ses pièces ; « Passer disponible » le mène à sa journée.
// Enrichissements : avancement gardé sur le téléphone (lu sans réseau, avec son heure : M8) ; « Quelles pièces, et
// pourquoi ? » sous la liste des pièces (M14).
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Feuille, useFeuille } from '@client/composants/Feuille'
import { Ecran } from '../../composants/coque'
import { Barre, Btn, Coche, Hint, Kv, Li, Note, Pill, Sec, St, Steps, type Ton } from '../../composants/proto'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import type { Activation as A, IdEtape, IdPiece, PieceKyc } from '../../donnees/domaines/acces'
import { origine, useEnLigne } from '../../donnees/fileHorsLigne'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { Camera } from './Camera'
import { Pourquoi } from '../../composants/enrichis'
import { HorsConnexion } from '../../composants/proto'
import { BasFixe, Chargement, ErreurLecture, NOMS_PIECES, Visage, jourAn } from './commun'
import './liv03.css'

const ICONES_PIECES: Record<IdPiece, string> = { cni_recto: 'id-card', cni_verso: 'id-card', selfie: 'scan-face', permis: 'id-card', carte_grise: 'file-text', vehicule: 'bike', assurance: 'file-check', profil: 'circle-user-round' }

/** Appareil photo ouvert par l'adresse (?photo=<pièce>) : le retour du téléphone le ferme d'abord (LIV-UIX-08). */
function usePhoto() {
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const lieu = useLocation()
  const id = params.get('photo') as IdPiece | null
  const ouvrir = (p: IdPiece) => {
    const q = new URLSearchParams(params)
    q.set('photo', p)
    naviguer({ search: q.toString() }, { state: { feuille: true } })
  }
  const fermer = () => {
    if ((lieu.state as { feuille?: boolean } | null)?.feuille) return naviguer(-1)
    const q = new URLSearchParams(params)
    q.delete('photo')
    naviguer({ search: q.toString() }, { replace: true })
  }
  return { id, ouvrir, fermer }
}

/** Dernier avancement reçu, gardé sur le téléphone : l'activation se relit sans réseau (heure de la donnée). */
const CLE_AVANCEMENT = 'blv_l_activation'
function useAvancementGarde(a: A | null): { a: A; le: number } | null {
  useEffect(() => {
    if (!a) return
    try {
      localStorage.setItem(CLE_AVANCEMENT, JSON.stringify({ a, le: Date.now() }))
    } catch {
      /* stockage indisponible : rien de gardé */
    }
  }, [a])
  try {
    const v = JSON.parse(localStorage.getItem(CLE_AVANCEMENT) ?? 'null') as { a: A; le: number } | null
    return v && v.a && Array.isArray(v.a.pieces) ? v : null
  } catch {
    return null
  }
}

export default function Activation() {
  const lecture = useLecture(() => source.acces.activation(), [])
  const garde = useAvancementGarde(lecture.donnees ?? null)
  const a = lecture.donnees ?? (lecture.erreur ? (garde?.a ?? null) : null)
  const photo = usePhoto()
  const { t } = usePreferences()
  const session = useSession()
  const enCours = a && photo.id ? a.pieces.find((p) => p.id === photo.id) : null
  return (
    <Ecran
      route="activation"
      proto
      action="aucune"
      fixes={
        a && (
          <>
            <FeuilleCharte a={a} />
            {enCours && (
              <Camera
                piece={enCours}
                rang={a.pieces.indexOf(enCours) + 1}
                total={a.pieces.length}
                titre={t(NOMS_PIECES[enCours.id])}
                photoMaxKo={a.regles.photoMaxKo}
                fermer={photo.fermer}
                envoyer={async (octets) => {
                  const r = await source.acces.envoyerPiece(enCours.id, { octets, controles: true }, origine(session.maintenant))
                  if (r.ok) {
                    signal('succes')
                    return null
                  }
                  signal('erreur')
                  return { qualite: t('La photo n’a pas passé le contrôle de qualité. Reprenez-la.'), trop_lourde: t('Photo trop lourde. Reprenez-la.'), deja_verifiee: t('Cette pièce est déjà vérifiée.') }[r.raison]
                }}
              />
            )}
          </>
        )
      }
    >
      {lecture.erreur && !a ? (
        <ErreurLecture relire={lecture.relire} />
      ) : !a ? (
        <Chargement lignes={6} />
      ) : (
        <>
          {lecture.erreur && garde && <AvancementGarde le={garde.le} relire={lecture.relire} />}
          <Contenu a={a} photo={photo.ouvrir} />
        </>
      )}
    </Ecran>
  )
}

function AvancementGarde({ le, relire }: { le: number; relire: () => void }) {
  const { t, tf, langue } = usePreferences()
  return (
    <button type="button" className="l3-garde" onClick={relire}>
      <HorsConnexion>
        <b>{t('Sans réseau')}</b> · {tf('avancement du {h}, gardé sur ce téléphone. Touchez pour le relire.', { h: heure(le, langue) })}
      </HorsConnexion>
    </button>
  )
}

type Mode = 'premiere' | 'rejet' | 'verification' | 'certification' | 'approbation' | 'entreprise' | 'autre_etat'

/** L'état du moment, lu dans les données : il choisit le bloc du haut (comme les états du prototype). */
function modeDe(a: A): Mode {
  const e = (id: IdEtape) => a.etapes.find((x) => x.id === id)!.etat
  if (a.etat !== 'en_activation') return 'autre_etat'
  if (!a.entreprise.active) return 'entreprise'
  if (a.pieces.some((p) => p.etat === 'rejetee')) return 'rejet'
  if (e('charte') !== 'fait' || a.pieces.some((p) => p.etat === 'a_envoyer')) return 'premiere'
  if (a.pieces.some((p) => p.etat === 'en_verification')) return 'verification'
  if (e('certification') !== 'fait') return 'certification'
  return 'approbation'
}

function Contenu({ a, photo }: { a: A; photo: (p: IdPiece) => void }) {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const charte = useFeuille('charte')
  if (a.etat === 'actif' || a.etat === 'restreint') return <Active a={a} photo={photo} />
  const mode = modeDe(a)
  const restantes = a.etapes.filter((e) => e.etat !== 'fait').length
  const aEnvoyer = a.pieces.filter((p) => p.etat === 'a_envoyer')
  const suivante = aEnvoyer[0]
  const charteFaite = a.etapes.find((e) => e.id === 'charte')!.etat === 'fait'
  return (
    <>
      <div className="pg">
        <div className="pg-k">{mode === 'premiere' && !charteFaite ? t('Première connexion') : t('Activation de votre compte')}</div>
        <h1 className="pg-t">{mode === 'premiere' && !charteFaite ? tf('Bienvenue {prenom}', { prenom: a.prenom }) : tf('Bonjour {prenom}', { prenom: a.prenom })}</h1>
        <p className="pg-s">
          {jourAn(s.maintenant, langue)} · {mode === 'rejet' ? t('une pièce est à renvoyer') : restantes === 1 ? t('encore 1 étape') : tf('encore {n} étapes', { n: restantes })}
        </p>
      </div>
      {mode === 'premiere' ? <Invitation a={a} /> : <Heros a={a} mode={mode} photo={photo} />}

      <Sec titre={t('Liste d’activation')} />
      <Liste a={a} />

      <Sec titre={aEnvoyer.length ? tf('Vos pièces · {n} à envoyer', { n: aEnvoyer.length }) : t('Vos pièces')} />
      <div className="card tight" id="l3-pieces">
        {a.pieces.map((p) => (
          <Piece key={p.id} p={p} a={a} photo={photo} envoi={mode !== 'premiere'} />
        ))}
      </div>
      <Hint icone="camera">{tf('Vérification automatique en moins de {m} minutes ; en cas de doute, une personne de BelivaY vérifie sous {h} heures ouvrées. Photos prises par l’application seulement, jamais depuis la galerie.', { m: a.regles.verificationAutoMin, h: a.regles.revueHumaineH })}</Hint>
      <Pourquoi libelle="Quelles pièces, et pourquoi ?">
        {tf('{entreprise} exige : {pieces}.', { entreprise: a.entreprise.nom, pieces: a.pieces.map((p) => t(NOMS_PIECES[p.id])).join(', ') })}{' '}
        {t('Elles prouvent qui vous êtes et que votre véhicule peut rouler assuré. Votre entreprise voit leur statut, jamais leurs images ni leurs numéros.')}
      </Pourquoi>
      {mode === 'premiere' && (
        <div className="btns liva-col mt12">
          {!charteFaite ? (
            <Btn kind="primary" icone="file-text" cls="xl" onClick={charte.ouvrir}>
              {t('Lire et accepter la charte')}
            </Btn>
          ) : (
            suivante && (
              <Btn kind="primary" icone="camera" cls="xl" onClick={() => photo(suivante.id)}>
                {tf('Photographier : {piece}', { piece: t(NOMS_PIECES[suivante.id]) })}
              </Btn>
            )
          )}
        </div>
      )}
      <div className="mt12">
        <Note ton="ink" icone="eye-off">
          {tf('{entreprise} voit ce qui vous manque, jamais le contenu de vos pièces ni votre selfie.', { entreprise: a.entreprise.nom })}
        </Note>
      </div>
    </>
  )
}

/** Carte d'identité de l'invitation (première connexion) : données saisies par l'entreprise, en lecture seule. */
function Invitation({ a }: { a: A }) {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const l = s.livreur
  return (
    <div className="card acc">
      <div className="row" style={{ gap: 14 }}>
        <span className="l3-av52">
          <Visage photo={l?.photo} initiales={l?.initiales} />
        </span>
        <div className="grow">
          <div className="b8 t17">{l ? `${l.prenom} ${l.nom}` : a.prenom}</div>
          <div className="t13 c3 mt4">{tf('Livreur partenaire · invité par {entreprise}', { entreprise: a.entreprise.nom })}</div>
        </div>
      </div>
      <div className="mt12">
        <Kv k={t('Zone déclarée')} v={a.zone} />
        <Kv k={t('Véhicule')} v={t(a.vehicule)} />
        <Kv k={t('Invitation')} v={tf('{date} à {h}', { date: jourAn(a.inviteLe, langue), h: heure(a.inviteLe, langue) })} />
      </div>
      <Hint icone="info">{tf('Zones et véhicule sont déclarés par {entreprise} ; vous ne les modifiez pas. Demandez-lui une correction s’ils sont inexacts.', { entreprise: a.entreprise.nom })}</Hint>
    </div>
  )
}

/** Liste d'activation : cinq cases cochées par le serveur, croix rouge si une pièce est rejetée, traits d'avancement. */
function Liste({ a, dates }: { a: A; dates?: boolean }) {
  const { t, tf, langue } = usePreferences()
  const charte = useFeuille('charte')
  const e = (id: IdEtape) => a.etapes.find((x) => x.id === id)!.etat
  const n = a.pieces.length
  const envoyees = a.pieces.filter((p) => p.etat !== 'a_envoyer').length
  const verifiees = a.pieces.filter((p) => p.etat === 'verifiee').length
  const rejetees = a.pieces.filter((p) => p.etat === 'rejetee').length
  const enVerif = a.pieces.filter((p) => p.etat === 'en_verification').length
  const reste = a.pieces.filter((p) => p.etat === 'a_envoyer')
  const c = a.certification
  const faites = a.etapes.filter((x) => x.etat === 'fait').length
  const quand = (ms: number | null) => (ms ? tf('{date} à {h}', { date: jourAn(ms, langue), h: heure(ms, langue) }) : '')
  const detailVerif = [tf('{x} sur {n}', { x: verifiees, n }), rejetees ? (rejetees === 1 ? t('1 rejetée') : tf('{n} rejetées', { n: rejetees })) : '', enVerif ? tf('{n} en vérification', { n: enVerif }) : ''].filter(Boolean).join(' · ')
  return (
    <div className="card">
      <Coche on={e('charte') === 'fait'}>
        {e('charte') === 'fait' ? (
          <>
            <b>{t('Charte d’accès acceptée')}</b> · {quand(a.charte.accepteeLe)} · {tf('version {v}', { v: a.charte.version })}{' '}
          </>
        ) : (
          <>
            <b>{t('Charte d’accès')}</b> · {t('à lire et accepter, avant toute mission')}{' '}
          </>
        )}
        <button type="button" className="l3-lien-in" onClick={charte.ouvrir}>
          {e('charte') === 'fait' ? t('Relire la charte') : t('Lire la charte')}
        </button>
      </Coche>
      <Coche on={e('pieces_envoyees') === 'fait'}>
        <b>{t('Pièces envoyées')}</b> · {tf('{x} sur {n}', { x: envoyees, n })}
        {reste.length === 1 ? ' · ' + tf('{piece} à faire', { piece: t(NOMS_PIECES[reste[0].id]) }) : ''}
      </Coche>
      <Coche on={e('pieces_verifiees') === 'fait'} bad={rejetees > 0}>
        <b>{t('Pièces vérifiées')}</b> · {envoyees === 0 ? tf('automatique en moins de {m} minutes ; en cas de doute, revue humaine sous {h} h ouvrées', { m: a.regles.verificationAutoMin, h: a.regles.revueHumaineH }) : detailVerif}
      </Coche>
      <Coche on={e('certification') === 'fait'}>
        <Link className="l3-lien-in l3-lien-b" to={chemin('certification')}>
          <b>{t('Certification réussie')}</b>
        </Link>{' '}
        · {c.reussie ? t('badge actif') : c.modulesFaits === 0 ? tf('{n} modules et un quiz, dans l’application', { n: c.modulesTotal }) : tf('{x} modules sur {n}', { x: c.modulesFaits, n: c.modulesTotal })}
      </Coche>
      <Coche on={e('approbation') === 'fait'}>
        <b>{tf('Approbation de {entreprise}', { entreprise: a.entreprise.nom })}</b> · {e('approbation') === 'fait' ? quand(a.approbation.le) : t('puis activation par BelivaY')}
      </Coche>
      {dates && a.activeLe && (
        <Coche on>
          <b>{t('Activation par BelivaY')}</b> · {quand(a.activeLe)}
        </Coche>
      )}
      <div className="mt8" role="progressbar" aria-valuemin={0} aria-valuemax={a.etapes.length} aria-valuenow={faites} aria-label={t('Avancement de l’activation')}>
        <Steps n={a.etapes.length} cur={faites} />
      </div>
    </div>
  )
}

function Heros({ a, mode, photo }: { a: A; mode: Mode; photo: (p: IdPiece) => void }) {
  const { t, tf, langue } = usePreferences()
  const rejetee = a.pieces.find((p) => p.etat === 'rejetee')
  const enVerif = a.pieces.filter((p) => p.etat === 'en_verification')
  const verifiees = a.pieces.filter((p) => p.etat === 'verifiee').length
  const c = a.certification
  const versCertif = (
    <div className="btns" style={{ marginTop: 14 }}>
      <Btn kind="primary" icone="graduation-cap" cls="xl" vers={chemin('certification')}>
        {c.modulesFaits < c.modulesTotal ? tf('Continuer la certification · module {n}', { n: c.modulesFaits + 1 }) : t('Passer le quiz de certification')}
      </Btn>
    </div>
  )
  if (mode === 'autre_etat')
    return (
      <div className="hero amber">
        <div className="hk">{t('Compte non actif')}</div>
        <div className="ht">{t('Votre compte a changé d’état')}</div>
        <div className="hs">{t('Voyez le motif, la durée et ce qui reste possible.')}</div>
        <div className="btns" style={{ marginTop: 14 }}>
          <Btn kind="white" icone="shield-alert" vers={chemin('compte')}>
            {t('Voir l’état du compte')}
          </Btn>
        </div>
      </div>
    )
  if (mode === 'entreprise')
    return (
      <div className="hero amber">
        <div className="hk">{t('En attente de l’entreprise')}</div>
        <div className="ht">{tf('{entreprise} n’est pas active sur BelivaY', { entreprise: a.entreprise.nom })}</div>
        <div className="hs">{t('Votre activation reprendra dès son retour ; rien de ce que vous avez envoyé n’est perdu.')}</div>
      </div>
    )
  if (mode === 'rejet' && rejetee)
    return (
      <div className="hero red" role="alert">
        <div className="hk" style={{ color: '#FFB4AB' }}>
          {t('Pièce rejetée')}
        </div>
        <div className="ht">{t(NOMS_PIECES[rejetee.id])}</div>
        <div className="hs">
          {t('Motif')} : <b>{t(rejetee.motif ?? '')}</b>
        </div>
        <div className="btns" style={{ marginTop: 14 }}>
          <Btn kind="white" icone="camera" onClick={() => photo(rejetee.id)}>
            {tf('Renvoyer : {piece}', { piece: t(NOMS_PIECES[rejetee.id]) })}
          </Btn>
        </div>
      </div>
    )
  if (mode === 'verification') {
    const p = enVerif[0]
    return (
      <div className="hero night">
        <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
          <span className="hk">{t('Vérification en cours')}</span>
          <Pill ton="dk" icone="file-check">
            {tf('{x} sur {n}', { x: verifiees, n: a.pieces.length })}
          </Pill>
        </div>
        <div className="ht">{tf('Réponse sous {h} h ouvrées au plus', { h: a.regles.revueHumaineH })}</div>
        <div className="hs">
          {p && p.reponseAvant
            ? p.revueHumaine
              ? tf('{piece} : revue par une personne de BelivaY, réponse au plus tard le {date} à {h}.', { piece: t(NOMS_PIECES[p.id]), date: jourAn(p.reponseAvant, langue), h: heure(p.reponseAvant, langue) })
              : tf('{piece} : vérification automatique, réponse avant {h}.', { piece: t(NOMS_PIECES[p.id]), h: heure(p.reponseAvant, langue) })
            : t('Vos pièces sont en vérification.')}{' '}
          {c.reussie ? '' : t('Vous pouvez suivre les modules en attendant.')}
        </div>
        <div className="mt14">
          <Barre pct={(verifiees / a.pieces.length) * 100} ton="acc" label={t('Pièces vérifiées')} />
        </div>
        {!c.reussie && versCertif}
      </div>
    )
  }
  if (mode === 'certification')
    return (
      <div className="hero night">
        <div className="hk">{t('Pièces vérifiées')}</div>
        <div className="ht">{tf('Il reste la certification · {x} modules sur {n}', { x: c.modulesFaits, n: c.modulesTotal })}</div>
        <div className="hs">{t('Des modules courts illustrés, puis le quiz final, dans l’application.')}</div>
        <div className="mt14">
          <Barre pct={(c.modulesFaits / c.modulesTotal) * 100} ton="acc" label={t('Modules faits')} />
        </div>
        {versCertif}
      </div>
    )
  return (
    <div className="hero night">
      <div className="hk">{t('En attente de l’approbation')}</div>
      <div className="ht">{t('Tout est prêt de votre côté')}</div>
      <div className="hs">{tf('{entreprise} approuve, puis BelivaY active votre accès : vous serez prévenu.', { entreprise: a.entreprise.nom })}</div>
    </div>
  )
}

/** Compte activé (ou restreint) : bienvenue, badge, liste cochée datée ; « Passer disponible » mène à la journée. */
function Active({ a, photo }: { a: A; photo: (p: IdPiece) => void }) {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const enLigne = useEnLigne()
  const naviguer = useNavigate()
  const cert = useLecture(() => source.acces.certification(), [])
  const [msg, setMsg] = useState<string | null>(null)
  const l = s.livreur
  const c = cert.donnees
  const dernier = c?.quiz.dernier
  const aFaire = a.pieces.filter((p) => p.etat === 'rejetee' || p.etat === 'a_envoyer' || (p.etat === 'verifiee' && p.expireLe !== null && p.expireLe - s.maintenant <= a.regles.pieceAlerteJours * 24 * 3600 * 1000))
  const passer = async () => {
    const r = await source.disponibilite.changer('disponible', origine(s.maintenant))
    if (r.ok) {
      signal('succes')
      naviguer(chemin('aujourdhui'))
    } else setMsg(t('Impossible de passer disponible pour le moment.'))
  }
  return (
    <>
      <div className="hero acc l3-acc" style={{ textAlign: 'center' }}>
        <div className="hk">{a.etat === 'restreint' ? t('Compte activé · accès restreint') : t('Compte activé')}</div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
          <span className="l3-av92">
            <Visage photo={l?.photo} initiales={l?.initiales} />
          </span>
        </div>
        <div className="ht">{tf('Bienvenue, {prenom}', { prenom: a.prenom })}</div>
        <div className="hs">{a.activeLe ? tf('{entreprise} a approuvé votre compte ; BelivaY l’a activé le {date} à {h}.', { entreprise: a.entreprise.nom, date: jourAn(a.activeLe, langue), h: heure(a.activeLe, langue) }) : t('Votre accès est actif.')}</div>
        {c?.badge && (
          <>
            <div className="liva-badge mt14" aria-hidden="true">
              <div className="m">
                <Icone nom="badge-check" taille={52} />
              </div>
              <div className="rb">
                <i></i>
                <i></i>
              </div>
            </div>
            <div className="b8 t17 mt8">{t('Certifié BelivaY')}</div>
            <div className="hs" style={{ marginTop: 2 }}>
              {dernier && dernier.reussi ? tf('{x} sur {n}', { x: dernier.bonnes, n: dernier.sur }) + ' · ' : ''}
              {tf('le {a} · valable jusqu’au {b}', { a: jourAn(c.badge.obtenuLe, langue), b: jourAn(c.badge.expireLe, langue) })}
            </div>
          </>
        )}
      </div>
      <Liste a={a} dates />
      {aFaire.length > 0 && (
        <>
          <Sec titre={t('Pièces à reprendre')} />
          <div className="card tight">
            {aFaire.map((p) => (
              <Piece key={p.id} p={p} a={a} photo={photo} envoi />
            ))}
          </div>
        </>
      )}
      <div className="mt12">
        <Note ton="acc" icone="eye">
          {t('Le vendeur et le gérant du relais voient votre nom et votre photo avant de vous remettre un colis : c’est votre seule identification, aucune tenue BelivaY n’est exigée.')}
        </Note>
      </div>
      {msg && (
        <div className="mt12">
          <Note ton="red" icone="circle-alert" role="alert">
            {msg}
          </Note>
        </div>
      )}
      <BasFixe>
        {s.disponibilite !== 'disponible' ? (
          <Btn kind="primary" icone="toggle-right" cls="xl" onClick={() => void passer()} off={!enLigne}>
            {t('Passer disponible')}
          </Btn>
        ) : (
          <Btn kind="primary" icone="house" cls="xl" vers={chemin('aujourdhui')}>
            {t('Retour à ma journée')}
          </Btn>
        )}
      </BasFixe>
    </>
  )
}

/** Ligne de pièce (livA_doc) ; `envoi` : bouton « Photographier » sur une pièce à envoyer (quand le bas de page ne le porte pas). */
function Piece({ p, a, photo, envoi }: { p: PieceKyc; a: A; photo: (p: IdPiece) => void; envoi?: boolean }) {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const expire = p.expireLe !== null && p.expireLe - s.maintenant <= a.regles.pieceAlerteJours * 24 * 3600 * 1000
  const statut: [string, Ton] = {
    a_envoyer: ['À envoyer', 'ink'] as [string, Ton],
    en_verification: ['En vérification', 'amber'] as [string, Ton],
    verifiee: [expire ? 'À renouveler' : 'Vérifiée', expire ? 'amber' : 'green'] as [string, Ton],
    rejetee: ['Rejetée', 'red'] as [string, Ton],
  }[p.etat]
  const detail =
    p.etat === 'rejetee'
      ? tf('Rejetée : {motif}', { motif: t(p.motif ?? '') })
      : p.etat === 'en_verification'
        ? [p.envoyeeLe ? tf('Envoyée le {date} à {h}', { date: jourAn(p.envoyeeLe, langue), h: heure(p.envoyeeLe, langue) }) : '', p.revueHumaine && p.reponseAvant ? tf('revue humaine avant le {date} à {h}', { date: jourAn(p.reponseAvant, langue), h: heure(p.reponseAvant, langue) }) : p.reponseAvant ? tf('réponse avant {h}', { h: heure(p.reponseAvant, langue) }) : ''].filter(Boolean).join(' · ')
        : p.etat === 'verifiee'
          ? p.expireLe
            ? tf('Valable jusqu’au {date}', { date: jourAn(p.expireLe, langue) })
            : p.verifieeLe
              ? tf('Vérifiée le {date} à {h}', { date: jourAn(p.verifieeLe, langue), h: heure(p.verifieeLe, langue) })
              : t('Vérifiée')
          : p.video
            ? t('Courte vidéo : tournez lentement la tête (preuve de vie)')
            : p.gabarit === 'carte'
              ? t('Carte entière dans le cadre, sans reflet')
              : p.gabarit === 'vehicule'
                ? t('Plaque lisible')
                : p.gabarit === 'visage'
                  ? t('Visage net, sans lunettes de soleil ni casque')
                  : t('Document entier, date d’expiration lisible')
  const action = p.etat === 'rejetee' ? 'Renvoyer' : p.etat === 'verifiee' && expire ? 'Renouveler' : p.etat === 'a_envoyer' && envoi ? 'Photographier' : null
  return (
    <div className="liva-doc">
      <span className="th">
        <Icone nom={ICONES_PIECES[p.id]} taille={22} />
      </span>
      <span className="grow">
        <span className="t" style={{ display: 'block' }}>
          {t(NOMS_PIECES[p.id])}
        </span>
        <span className={'s' + (p.etat === 'rejetee' ? ' err' : '')} style={{ display: 'block' }}>
          {detail}
        </span>
        {action && a.etat !== 'retire' && (
          <button type="button" className="btn soft sm mt8" onClick={() => photo(p.id)} aria-label={`${t(action)} : ${t(NOMS_PIECES[p.id])}`}>
            <Icone nom="camera" taille={16} />
            <span>{t(action)}</span>
          </button>
        )}
      </span>
      <St ton={statut[1]}>{t(statut[0])}</St>
    </div>
  )
}

function FeuilleCharte({ a }: { a: A }) {
  const { t, tf, langue } = usePreferences()
  const f = useFeuille('charte')
  const enLigne = useEnLigne()
  const s = useSession()
  const [lu, setLu] = useState(false)
  const accepte = a.charte.versionAcceptee === a.charte.version
  const accepter = async () => {
    const r = await source.acces.accepterCharte(a.charte.version, origine(s.maintenant))
    if (r.ok) {
      signal('succes')
      f.fermer()
    } else signal('erreur')
  }
  return (
    <Feuille ouverte={f.ouverte} fermer={f.fermer} titre={t('Charte d’accès du livreur')} forme="large">
      <div className="kick acc">{tf('Version {v}', { v: a.charte.version })}</div>
      <div className="b8 t19 mt4">{t('Charte d’accès du livreur')}</div>
      <div className="t13 c3 mt4">{t('BelivaY vous donne accès à la plateforme ; votre entreprise reste votre employeur. Ce qui suit est interdit, sans exception :')}</div>
      <div className="mt12">
        {a.charte.interdits.map((x) => (
          <Li key={x} icone="ban" ton="red" t={t(x)} />
        ))}
      </div>
      {accepte ? (
        <div className="mt12">
          <Note ton="green" icone="file-check" role="status">
            {tf('Charte acceptée le {date} à {h}.', { date: jourAn(a.charte.accepteeLe!, langue), h: heure(a.charte.accepteeLe!, langue) })}
          </Note>
        </div>
      ) : (
        <>
          <label className="l3-coche mt12">
            <input type="checkbox" checked={lu} onChange={(e) => setLu(e.target.checked)} />
            <span>{t('J’ai lu la charte et je m’engage à la respecter.')}</span>
          </label>
          <Hint icone="info">{t('Votre acceptation est horodatée et liée à cette version ; une nouvelle version devra être acceptée avant la mission suivante.')}</Hint>
          {!enLigne && <Hint icone="wifi-off">{t('L’acceptation part avec le réseau.')}</Hint>}
          <div className="btns liva-col mt14">
            <Btn kind="primary" icone="file-signature" cls="xl" off={!lu || !enLigne} onClick={() => void accepter()}>
              {t('J’accepte la charte')}
            </Btn>
          </div>
        </>
      )}
    </Feuille>
  )
}
