// Page ajoutée (consigne du porteur, 12 oct. 2026) : CONTRÔLE DES PIÈCES des livreurs, liée depuis la flotte et la
// fiche du livreur. Sans identifiant : la file de toute la flotte (pièces à contrôler, expirées, refusées en attente
// de renvoi, manquantes, qui expirent avant l'alerte du registre). Avec ?id= : les pièces d'un livreur (pièce
// d'identité recto et verso, selfie, permis), son véhicule (assurance, carte grise, photo de la plaque) et sa
// certification. Chaque pièce s'ouvre dans une feuille (lien signé de quelques minutes, image en filigrane, consultation
// journalisée) ; on la valide (date d'expiration lue sur la pièce, exigée pour la pièce d'identité et le permis) ou on
// la refuse avec un motif écrit, envoyé au livreur ; on relance le livreur pour une pièce manquante, refusée, expirée
// ou bientôt. Remplace ENT-P06R-03 (« statut et date seulement »). Propriétaire et répartiteur (le comptable n'y a
// pas accès : ENT-02-R61). DP-66 : la photo (selfie) est l'identité vérifiée du livreur ; il ne la change pas lui-même :
// l'entreprise demande une nouvelle vérification (motif exigé, envoyé au livreur), il reprend alors son selfie.
// DP-67 : statut dédié « nouvelle vérification demandée » (pas « refusée »), échéance PHOTO-REVERIF-J pendant laquelle
// il travaille ; passé ce délai, plus de nouvelle mission jusqu'à la validation ; doute réel sur l'identité : suspendre.
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Feuille } from '@client/composants/Feuille'
import { jouer } from '@client/composants/Sons'
import { JOUR, yaounde } from '../../calculs/temps'
import { PARAMETRES_FLOTTE } from '../../calculs/flotte'
import { Icone } from '../../composants/Icone'
import { AucunResultat, Champ, Kv, Li, Panel, Pill, Puces, type Ton, Vide } from '../../composants/prototype'
import { Ecran } from '../../composants/coque'
import { chemin } from '../../config/pages'
import type { FicheLivreur, PieceAControler, PieceLivreur, RaisonControle, StatutPiece, TypePiece, VuePiece } from '../../donnees/domaines/livreurs'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useHorloge, usePeut } from '../../session'
import { Chargement, ErreurLecture, NOM_VEHICULE, useDates, useFeuilleParams } from '../ENT-03/outils'
import { NOM_STATUT } from './Flotte'
import './pieces.css'

const P = PARAMETRES_FLOTTE
export const NOM_PIECE: Record<TypePiece, string> = { identite: 'Pièce d’identité', selfie: 'Selfie (preuve de vie)', permis: 'Permis de conduire' }
const ICONE_PIECE: Record<TypePiece, string> = { identite: 'id-card', selfie: 'scan-face', permis: 'id-card-lanyard' }
export const STATUT_PIECE: Record<StatutPiece, [string, Ton]> = { valide: ['Validée', 'green'], en_revue: ['À contrôler', 'amber'], refusee: ['Refusée', 'red'], expiree: ['Expirée', 'red'], manquante: ['Manquante', 'ink'], reverification: ['Nouvelle vérification demandée', 'amber'] }
const RAISON: Record<RaisonControle, [string, Ton]> = { a_controler: ['À contrôler', 'amber'], reverification: ['Nouvelle photo demandée', 'amber'], expiree: ['Expirée', 'red'], refusee: ['Refusée, à renvoyer', 'red'], manquante: ['Manquante', 'ink'], expire_bientot: ['Expire bientôt', 'amber'] }
const FACE: Record<string, string> = { recto: 'Recto', verso: 'Verso', photo: 'Photo' }
// Motifs fréquents (le texte reste libre et modifiable avant l'envoi).
const MOTIFS_PHOTO = ['Votre apparence a changé : reprenez une photo nette, de face, sans lunettes ni casquette.', 'La photo actuelle est floue ou sombre.', 'Contrôle périodique de l’identité demandé par l’entreprise.']
const MOTIFS = ['Photo floue ou illisible : reprenez-la à plat, sans reflet.', 'Pièce expirée : envoyez une pièce en cours de validité.', 'Le nom ne correspond pas à celui du compte.', 'Catégorie de permis incohérente avec le véhicule déclaré.', 'Le selfie ne correspond pas à la photo de la pièce d’identité.']

/** Relance permise : pièce manquante, refusée, expirée ou qui expire avant l'alerte du registre. */
export const relancable = (p: PieceLivreur, t: number) => ['manquante', 'refusee', 'expiree', 'reverification'].includes(p.statut) || (p.expireLe !== null && p.expireLe - t <= P.alertePieceLivreurJours * JOUR)

export default function Pieces() {
  const [params] = useSearchParams()
  const id = params.get('id')
  return id ? <PiecesDuLivreur id={id} /> : <FileDesPieces />
}

// ── File de la flotte ─────────────────────────────────────────────────────────────────────────────────────────────

function FileDesPieces() {
  const { t, tf } = usePreferences()
  const { date } = useDates()
  const maintenant = useHorloge()
  const [params, setParams] = useSearchParams()
  const filtre = (params.get('raison') ?? 'tout') as RaisonControle | 'tout'
  const file = useLecture(() => source.livreurs.controles())
  const ls = file.donnees
  const choisir = (r: RaisonControle | 'tout') => {
    const p = new URLSearchParams(params)
    if (r === 'tout') p.delete('raison')
    else p.set('raison', r)
    setParams(p, { replace: true })
  }
  const n = (r: RaisonControle) => (ls ?? []).filter((x) => x.raison === r).length
  const visibles = (ls ?? []).filter((x) => filtre === 'tout' || x.raison === filtre)
  const detail = (x: PieceAControler) => {
    const p = x.piece
    if (x.raison === 'a_controler') return p.envoyeeLe ? tf('envoyée le {d}', { d: date(p.envoyeeLe) }) : t('envoyée')
    if (x.raison === 'reverification' && p.reverification)
      return p.reverification.bloque ? tf('délai passé le {d} : plus de nouvelle mission jusqu’à la validation', { d: date(p.reverification.jusqua) }) : tf('à envoyer avant le {d} · encore {n} jour(s)', { d: date(p.reverification.jusqua), n: Math.max(0, Math.ceil((p.reverification.jusqua - maintenant) / JOUR)) })
    if (x.raison === 'refusee') return p.motif ? `« ${p.motif} »` : t('refusée')
    if (x.raison === 'manquante') return t('pas encore envoyée par le livreur')
    if (x.raison === 'expiree') return p.expireLe ? tf('expirée le {d}', { d: date(p.expireLe, true) }) : t('expirée')
    return p.expireLe ? tf('expire le {d} · dans {n} jour(s)', { d: date(p.expireLe, true), n: Math.max(0, Math.ceil((p.expireLe - maintenant) / JOUR)) }) : ''
  }
  return (
    <Ecran route="pieces">
      {file.erreur && <ErreurLecture erreur={file.erreur} relire={file.relire} lu={ls ? maintenant : null} />}
      {!ls ? (
        !file.erreur && <Chargement lignes={5} />
      ) : (
        <>
          <Puces
            aria={t('Filtrer les pièces')}
            actif={filtre}
            choisir={choisir}
            items={[
              { id: 'tout', t: 'Toutes', n: ls.length },
              { id: 'a_controler', t: 'À contrôler', n: n('a_controler') },
              { id: 'reverification', t: 'Nouvelles photos', n: n('reverification') },
              { id: 'expiree', t: 'Expirées', n: n('expiree') },
              { id: 'refusee', t: 'Refusées', n: n('refusee') },
              { id: 'manquante', t: 'Manquantes', n: n('manquante') },
              { id: 'expire_bientot', t: 'Expirent bientôt', n: n('expire_bientot') },
            ]}
          />
          {!ls.length ? (
            <Panel>
              <Vide icone="shield-check" t={t('Toutes les pièces sont à jour')} s={t('Aucune pièce à contrôler, à renvoyer ni à renouveler dans votre flotte.')} />
            </Panel>
          ) : !visibles.length ? (
            <AucunResultat effacer={() => choisir('tout')} />
          ) : (
            <div className="card tight mt10">
              {visibles.map((x) => (
                <Li
                  key={x.livreur.id + x.piece.type}
                  gauche={<span className="e-av-l">{x.livreur.initiales}</span>}
                  t={`${x.livreur.nom} · ${t(NOM_PIECE[x.piece.type])}`}
                  s={`${t(NOM_STATUT[x.livreur.statut])} · ${detail(x)}`}
                  droite={
                    <Pill ton={RAISON[x.raison][1]} dot sm>
                      {t(RAISON[x.raison][0])}
                    </Pill>
                  }
                  to={x.raison === 'a_controler' ? chemin('pieces', { id: x.livreur.id, sheet: 'voir', piece: x.piece.type }) : chemin('pieces', { id: x.livreur.id })}
                />
              ))}
            </div>
          )}
          <p className="t12 c3 mt10 lh">
            {tf('Une pièce qui expire est signalée {n} jours avant ; expirée, le livreur ne reçoit plus de nouveau paquet jusqu’à son renouvellement.', { n: P.alertePieceLivreurJours })}
          </p>
        </>
      )}
    </Ecran>
  )
}

// ── Pièces d'un livreur ───────────────────────────────────────────────────────────────────────────────────────────

function PiecesDuLivreur({ id }: { id: string }) {
  const { t, tf } = usePreferences()
  const { date, heure } = useDates()
  const maintenant = useHorloge()
  const peut = usePeut(['proprietaire', 'repartiteur'])
  const fiche = useLecture(() => source.livreurs.fiche(id).then((f) => ({ f })), [id])
  const vehicules = useLecture(() => source.vehicules.liste())
  const voir = useFeuilleParams('voir', ['piece'])
  const photo = useFeuilleParams('photo')
  const [message, setMessage] = useState<string | null>(null)
  const l = fiche.donnees?.f
  if (fiche.erreur && !fiche.donnees)
    return (
      <Ecran route="pieces">
        <ErreurLecture erreur={fiche.erreur} relire={fiche.relire} />
      </Ecran>
    )
  if (!fiche.donnees)
    return (
      <Ecran route="pieces">
        <Chargement lignes={4} />
      </Ecran>
    )
  if (!l)
    return (
      <Ecran route="pieces">
        <Panel>
          <Vide icone="user-x" t={t('Ce livreur n’est plus rattaché')} s={t('Il a été retiré de votre flotte ou le lien est ancien.')} action={<Link className="btn primary" to={chemin('pieces')}>{t('Toutes les pièces')}</Link>} />
        </Panel>
      </Ecran>
    )
  const v = (vehicules.donnees ?? []).find((x) => x.id === l.vehiculeId) ?? null
  const ouverte = l.pieces.find((p) => p.type === voir.param('piece')) ?? null
  const validees = l.pieces.filter((p) => p.statut === 'valide').length
  const pret = l.statut === 'en_activation' && validees === l.pieces.length && !!l.charteLe && (l.certification?.quiz ?? 0) >= P.quizMin
  const relancer = async (p: PieceLivreur) => {
    const r = await source.livreurs.relancerPiece(l.id, p.type)
    jouer(r.ok ? 'envoi' : 'erreur')
    setMessage(r.ok ? tf('{nom} est relancé pour sa pièce : {p}.', { nom: l.nom, p: t(NOM_PIECE[p.type]).toLowerCase() }) : t('Cette pièce ne demande pas de relance.'))
  }
  const approuver = async () => {
    const r = await source.livreurs.approuver(l.id)
    jouer(r.ok ? 'valide' : 'erreur')
    setMessage(r.ok ? t('Approuvé : BelivaY a activé son accès.') : t('Pas encore prêt : pièces vérifiées et certification réussie d’abord.'))
  }
  const selfieValide = l.pieces.some((p) => p.type === 'selfie' && p.statut === 'valide')
  const certifBientot = l.certifieJusqua !== null && l.certifieJusqua - maintenant <= 30 * JOUR
  return (
    <Ecran
      route="pieces"
      titre={tf('Pièces de {nom}', { nom: l.nom })}
      sous={tf('{s} · {v} pièce(s) validée(s) sur {n}', { s: t(NOM_STATUT[l.statut]), v: validees, n: l.pieces.length })}
      fixes={
        <>
          <Feuille ouverte={voir.ouverte && !!ouverte && peut} fermer={voir.fermer} titre={ouverte ? t(NOM_PIECE[ouverte.type]) : t('Pièce')}>
            {ouverte && <Visionneuse l={l} p={ouverte} fermer={voir.fermer} dire={setMessage} />}
          </Feuille>
          <Feuille ouverte={photo.ouverte && peut && selfieValide} fermer={photo.fermer} titre={t('Nouvelle photo')}>
            <DemandePhoto l={l} fermer={photo.fermer} dire={setMessage} />
          </Feuille>
        </>
      }
    >
      {fiche.erreur && <ErreurLecture erreur={fiche.erreur} relire={fiche.relire} lu={maintenant} />}
      <div className="row" style={{ marginBottom: 12, justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <Link className="entA-link" to={chemin('livreur', { id: l.id })}>
          <Icone nom="chevron-left" taille={16} />
          {tf('Fiche de {nom}', { nom: l.nom })}
        </Link>
        <Link className="entA-link" to={chemin('pieces')}>
          {t('Toutes les pièces de la flotte')}
          <Icone nom="chevron-right" taille={16} />
        </Link>
      </div>
      {message && (
        <div className="dk-banner acc" role="status">
          <Icone nom="info" taille={20} />
          <div className="grow">{message}</div>
        </div>
      )}
      {l.statut === 'en_activation' && (
        <div className={'dk-banner ' + (pret ? 'acc' : 'amber')} role="status">
          <Icone nom={pret ? 'user-check' : 'hourglass'} taille={20} />
          <div className="grow">
            {pret
              ? t('Pièces validées, charte acceptée et certification réussie : vous pouvez approuver ce livreur.')
              : tf('En activation : {v} pièce(s) validée(s) sur {n} ; certification {f} module(s) sur {m}{q}.', { v: validees, n: l.pieces.length, f: l.certification?.modulesFaits ?? 0, m: l.certification?.modules ?? 0, q: l.certification?.quiz != null ? ' · ' + tf('quiz {q}/{s}', { q: l.certification.quiz, s: P.quizSur }) : '' })}
          </div>
          {pret && peut && (
            <button type="button" className="btn primary" onClick={() => void approuver()}>
              <Icone nom="user-check" taille={18} />
              <span>{t('Approuver')}</span>
            </button>
          )}
        </div>
      )}
      <div className="g g2 e-pieces" style={{ alignItems: 'start' }}>
        {l.pieces.map((p) => (
          <CartePiece key={p.type} p={p} peut={peut} ouvrir={() => voir.ouvrir({ piece: p.type })} relancer={() => void relancer(p)} nouvellePhoto={() => photo.ouvrir()} />
        ))}
        <Panel titre={t('Véhicule et ses documents')} icone="bike" a={v ? { t: t('Gérer le véhicule'), to: chemin('vehicules', { id: v.id }) } : undefined}>
          {v ? (
            <>
              <Kv k={t('Véhicule')} v={`${t(NOM_VEHICULE[v.type])} · ${v.plaque}`} />
              <Kv k={t('Assurance')} v={v.assuranceJusqua ? (v.assuranceJusqua < maintenant ? tf('expirée le {d}', { d: date(v.assuranceJusqua, true) }) : tf('jusqu’au {d}', { d: date(v.assuranceJusqua, true) })) : t('non fournie')} />
              <Kv k={t('Carte grise')} v={v.carteGrise?.statut === 'valide' ? t('Vérifiée') : v.carteGrise?.statut === 'en_revue' ? t('À vérifier') : t('Manquante')} />
              <Kv k={t('Photo avec la plaque')} v={v.photos?.plaque ? tf('prise le {d}', { d: date(v.photos.plaque) }) : t('manquante')} />
              <Kv k={t('Affectation')} v={v.proposable ? t('Proposé à l’affectation') : t('Non proposé à l’affectation')} />
            </>
          ) : (
            <p className="t13 c3">{t('Aucun véhicule affecté : il ne peut pas recevoir de paquet.')}</p>
          )}
          {peut && (
            <div className="btns mt10">
              <Link className="btn sm secondary" to={chemin('livreur', { id: l.id, sheet: 'modifier' })}>
                <Icone nom="refresh-cw" taille={16} />
                <span>{v ? t('Changer de véhicule') : t('Affecter un véhicule')}</span>
              </Link>
            </div>
          )}
        </Panel>
        <Panel titre={t('Certification')} icone="graduation-cap">
          <Kv k={t('Modules')} v={tf('{f} sur {n}', { f: l.certification?.modulesFaits ?? 0, n: l.certification?.modules ?? 0 })} />
          <Kv k={t('Quiz')} v={l.certification?.quiz != null ? `${l.certification.quiz} / ${P.quizSur}` + (l.certification.quiz >= P.quizMin ? '' : ' · ' + t('sous le seuil')) : t('pas encore passé')} />
          <Kv k={t('Valable jusqu’au')} v={l.certifieJusqua ? date(l.certifieJusqua, true) : '—'} />
          <Kv k={t('Charte acceptée')} v={l.charteLe ? `${date(l.charteLe, true)} · ${heure(l.charteLe)}` : t('pas encore')} />
          {peut && (certifBientot || (l.statut === 'en_activation' && (l.certification?.quiz ?? 0) < P.quizMin)) && (
            <div className="btns mt10">
              <button type="button" className="btn sm secondary" onClick={() => void source.livreurs.prevenir(l.id, 'certification').then(() => (jouer('envoi'), setMessage(tf('{nom} est prévenu.', { nom: l.nom }))))}>
                <Icone nom="send" taille={16} />
                <span>{t('Relancer pour la certification')}</span>
              </button>
            </div>
          )}
        </Panel>
      </div>
      <p className="t12 c3 mt10 lh">
        <Icone nom="lock" taille={13} /> {t('Chaque pièce ouverte l’est par un lien de quelques minutes, en filigrane à votre nom ; chaque consultation, validation, refus et relance est inscrit au journal de la fiche. Ne copiez ni ne partagez jamais une pièce.')}
      </p>
    </Ecran>
  )
}

function CartePiece({ p, peut, ouvrir, relancer, nouvellePhoto }: { p: PieceLivreur; peut: boolean; ouvrir: () => void; relancer: () => void; nouvellePhoto: () => void }) {
  const { t, tf } = usePreferences()
  const { date, dateHeure } = useDates()
  const maintenant = useHorloge()
  const bientot = p.statut === 'valide' && p.expireLe !== null && p.expireLe - maintenant <= P.alertePieceLivreurJours * JOUR
  const [libelle, ton] = bientot ? ['Expire bientôt', 'amber' as Ton] : STATUT_PIECE[p.statut]
  return (
    <Panel titre={t(NOM_PIECE[p.type])} icone={ICONE_PIECE[p.type]} tonIcone={ton} droite={<Pill ton={ton} dot sm>{t(libelle)}</Pill>} id={'piece-' + p.type}>
      <Kv k={t('Numéro')} v={p.numero ?? '—'} />
      <Kv k={t('Envoyée le')} v={p.envoyeeLe ? dateHeure(p.envoyeeLe) : t('pas encore envoyée')} />
      {p.type !== 'selfie' && <Kv k={p.statut === 'en_revue' ? t('Expire le (déclarée)') : t('Expire le')} v={p.expireLe ? (p.expireLe > maintenant ? tf('{d} · dans {n} jour(s)', { d: date(p.expireLe, true), n: Math.ceil((p.expireLe - maintenant) / JOUR) }) : tf('{d} · expirée', { d: date(p.expireLe, true) })) : '—'} />}
      {p.controle && <Kv k={p.statut === 'refusee' ? t('Refusée par') : p.statut === 'reverification' ? t('Demandée par') : t('Contrôlée par')} v={`${p.controle.par} · ${dateHeure(p.controle.le)}`} />}
      {p.motif && <Kv k={t('Motif du refus')} v={`« ${p.motif} »`} />}
      {p.reverification && (
        <>
          <Kv k={t('Nouvelle photo demandée le')} v={dateHeure(p.reverification.le)} />
          <Kv k={t('Motif de la demande')} v={`« ${p.reverification.motif} »`} />
          <Kv k={t('À envoyer avant le')} v={p.reverification.jusqua > maintenant ? tf('{d} · encore {n} jour(s)', { d: dateHeure(p.reverification.jusqua), n: Math.ceil((p.reverification.jusqua - maintenant) / JOUR) }) : dateHeure(p.reverification.jusqua)} />
          {p.reverification.bloque ? (
            <div className="dk-banner red mt10" role="status">
              <Icone nom="ban" taille={20} />
              <div className="grow">{t('Délai passé : plus aucune nouvelle mission jusqu’à la validation de sa nouvelle photo.')}</div>
            </div>
          ) : (
            <p className="t12 c3 mt6 lh">{t('Il travaille normalement d’ici là ; sa photo actuelle reste son identité.')}</p>
          )}
        </>
      )}
      {p.relances.length > 0 && <Kv k={t('Relances')} v={tf('{n} · la dernière {d}', { n: p.relances.length, d: dateHeure(p.relances[0]) })} />}
      {peut && (
        <div className="btns mt10">
          {p.faces.length > 0 && (
            <button type="button" className={'btn sm ' + (p.statut === 'en_revue' ? 'primary' : 'secondary')} onClick={ouvrir}>
              <Icone nom="eye" taille={16} />
              <span>{p.statut === 'en_revue' ? t('Ouvrir et contrôler') : t('Voir la pièce')}</span>
            </button>
          )}
          {relancable(p, maintenant) && (
            <button type="button" className="btn sm secondary" onClick={relancer}>
              <Icone nom="send" taille={16} />
              <span>{t('Relancer le livreur')}</span>
            </button>
          )}
          {p.type === 'selfie' && p.statut === 'valide' && (
            <button type="button" className="btn sm secondary" onClick={nouvellePhoto}>
              <Icone nom="scan-face" taille={16} />
              <span>{t('Demander une nouvelle photo')}</span>
            </button>
          )}
        </div>
      )}
      {p.type === 'selfie' && <p className="t12 c3 mt6 lh">{t('La photo est l’identité vérifiée du livreur : il ne la change pas lui-même ; elle ne change que par une nouvelle vérification que vous demandez. En cas de doute réel sur son identité, suspendez-le plutôt.')}</p>}
    </Panel>
  )
}

/** Nouvelle vérification de la photo (selfie) : motif exigé, envoyé au livreur, qui reprend son selfie. */
function DemandePhoto({ l, fermer, dire }: { l: FicheLivreur; fermer: () => void; dire: (m: string) => void }) {
  const { t, tf } = usePreferences()
  const [motif, setMotif] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [encours, setEncours] = useState(false)
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        if (!motif.trim() || encours) return
        setEncours(true)
        const r = await source.livreurs.demanderPhoto(l.id, motif)
        setEncours(false)
        jouer(r.ok ? 'envoi' : 'erreur')
        if (!r.ok) return setErreur(t(r.raison === 'motif' ? 'Écrivez le motif : le livreur le lit.' : 'La photo n’est pas validée : contrôlez-la d’abord.'))
        dire(tf('Nouvelle photo demandée : {nom} a {n} jours pour reprendre son selfie depuis son application ; vous la contrôlerez ici.', { nom: l.nom, n: P.photoReverifJours }))
        fermer()
      }}
    >
      <h2 className="card-t">{tf('Demander une nouvelle photo à {nom}', { nom: l.nom })}</h2>
      <p className="card-s">{tf('Sa photo actuelle reste son identité jusqu’à la nouvelle vérification ; il reçoit votre motif et a {n} jours pour reprendre son selfie, en continuant de travailler. Passé ce délai, il ne reçoit plus de nouvelle mission jusqu’à ce que vous validiez la photo.', { n: P.photoReverifJours })}</p>
      <div className="dk-banner amber mt10" role="note">
        <Icone nom="shield-alert" taille={20} />
        <div className="grow">{t('Doute réel sur son identité (ce n’est peut-être pas lui qui roule) ? Ne demandez pas une photo : suspendez-le depuis sa fiche, avec un motif.')}</div>
        <Link className="btn sm secondary" to={chemin('livreur', { id: l.id })}>
          {t('Sa fiche')}
        </Link>
      </div>
      <div className="chips" role="group" aria-label={t('Motifs fréquents')}>
        {MOTIFS_PHOTO.map((m) => (
          <button key={m} type="button" className={'chip' + (motif === t(m) ? ' on' : '')} aria-pressed={motif === t(m)} onClick={() => setMotif(t(m))}>
            {t(m)}
          </button>
        ))}
      </div>
      <Champ t={t('Motif écrit, envoyé au livreur')} className="mt10">
        <textarea rows={3} value={motif} onChange={(e) => setMotif(e.target.value)} />
      </Champ>
      {erreur && (
        <p className="err mt10" role="alert">
          {erreur}
        </p>
      )}
      <div className="btns mt10">
        <button type="submit" className="btn primary" disabled={!motif.trim() || encours}>
          <Icone nom="send" taille={18} />
          <span>{t('Demander la nouvelle photo')}</span>
        </button>
        <button type="button" className="btn ghost" onClick={fermer}>
          {t('Annuler')}
        </button>
      </div>
    </form>
  )
}

/** Fin du jour choisi (date d'expiration lue sur la pièce), heure de Yaoundé. */
const finDuJour = (s: string) => {
  const [a, m, j] = s.split('-').map(Number)
  return yaounde(a, m, j, 23, 59)
}

function Visionneuse({ l, p, fermer, dire }: { l: FicheLivreur; p: PieceLivreur; fermer: () => void; dire: (m: string) => void }) {
  const { t, tf } = usePreferences()
  const { heure } = useDates()
  const maintenant = useHorloge()
  const [vue, setVue] = useState<VuePiece | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [mode, setMode] = useState<'voir' | 'valider' | 'refuser'>('voir')
  // Date déclarée par le livreur à l'envoi, à confirmer sur la pièce.
  const [expire, setExpire] = useState(() => (p.expireLe ? new Date(p.expireLe + 3_600_000).toISOString().slice(0, 10) : ''))
  const [motif, setMotif] = useState('')
  const [encours, setEncours] = useState(false)
  const [n, setN] = useState(0) // rouvrir après expiration du lien
  useEffect(() => {
    let vivant = true
    setVue(null)
    source.livreurs.voirPiece(l.id, p.type).then(
      (r) => vivant && (r.ok ? setVue(r) : setErreur(t('Cette pièce n’a pas encore été envoyée.'))),
      () => vivant && setErreur(t('La pièce n’a pas pu s’ouvrir. Réessayez.')),
    )
    return () => {
      vivant = false
    }
  }, [l.id, p.type, n, t])
  const echu = !!vue && vue.valableJusqua <= maintenant
  const aujourdhui = useMemo(() => new Date(maintenant + 3_600_000).toISOString().slice(0, 10), [maintenant])
  const envoyer = async () => {
    if (encours) return
    const d = mode === 'valider' ? { decision: 'valide' as const, expireLe: p.type === 'selfie' ? null : expire ? finDuJour(expire) : null } : { decision: 'refusee' as const, motif }
    setEncours(true)
    const r = await source.livreurs.controlerPiece(l.id, p.type, d)
    setEncours(false)
    jouer(r.ok ? 'interrupteur' : 'erreur')
    if (r.ok) {
      dire(mode === 'valider' ? tf('Pièce validée : {nom} est prévenu.', { nom: l.nom }) : tf('Pièce refusée : {nom} reçoit le motif et peut la renvoyer.', { nom: l.nom }))
      fermer()
    } else setErreur(t(r.raison === 'date' ? 'Indiquez une date d’expiration à venir, lue sur la pièce.' : r.raison === 'motif' ? 'Écrivez le motif du refus : le livreur le lit.' : 'Cette pièce a déjà été contrôlée.'))
  }
  const dateOk = p.type === 'selfie' || (!!expire && expire > aujourdhui)
  return (
    <div className="e-visionneuse">
      <p className="card-s">{tf('{nom} · {p} · numéro {n}', { nom: l.nom, p: t(NOM_PIECE[p.type]), n: p.numero ?? '—' })}</p>
      {erreur && (
        <p className="err" role="alert">
          {erreur}
        </p>
      )}
      {!vue ? (
        !erreur && <Chargement lignes={3} />
      ) : echu ? (
        <div className="vide">
          <p>{t('Le lien de consultation a expiré : rouvrez la pièce pour la revoir.')}</p>
          <button type="button" className="btn sm secondary" onClick={() => setN((x) => x + 1)}>
            <Icone nom="refresh-cw" taille={16} />
            <span>{t('Rouvrir la pièce')}</span>
          </button>
        </div>
      ) : (
        <>
          <div className="e-faces">
            {vue.faces.map((f) => (
              <figure key={f.face} className="e-face" onContextMenu={(e) => e.preventDefault()}>
                <img src={f.url} alt={tf('{p} de {nom}, {f}', { p: t(NOM_PIECE[p.type]), nom: l.nom, f: t(FACE[f.face]) })} draggable={false} />
                <span className="e-filigrane" aria-hidden="true">
                  {Array.from({ length: 6 }, () => vue.filigrane).join('   ·   ')}
                </span>
                <figcaption>{t(FACE[f.face])}</figcaption>
              </figure>
            ))}
          </div>
          <p className="t12 c3 mt6">
            <Icone nom="clock" taille={13} /> {tf('Lien de consultation valable jusqu’à {h}, à votre nom.', { h: heure(vue.valableJusqua) })}
          </p>
        </>
      )}
      {vue && !echu && (
        <>
          {mode === 'voir' && (
            <div className="btns mt16">
              {p.statut === 'en_revue' && (
                <button type="button" className="btn primary" onClick={() => setMode('valider')}>
                  <Icone nom="check" taille={18} />
                  <span>{t('Valider')}</span>
                </button>
              )}
              {(p.statut === 'en_revue' || p.statut === 'valide') && (
                <button type="button" className={'btn ' + (p.statut === 'en_revue' ? 'danger' : 'secondary')} onClick={() => setMode('refuser')}>
                  <Icone nom="x" taille={18} />
                  <span>{p.statut === 'valide' ? t('Retirer la validation') : t('Refuser')}</span>
                </button>
              )}
              <button type="button" className="btn ghost" onClick={fermer}>
                {t('Fermer')}
              </button>
            </div>
          )}
          {mode === 'valider' && (
            <form
              className="mt16"
              onSubmit={(e) => {
                e.preventDefault()
                if (dateOk) void envoyer()
              }}
            >
              {p.type !== 'selfie' && (
                <Champ t={t('Date d’expiration lue sur la pièce')}>
                  <input type="date" value={expire} min={aujourdhui} onChange={(e) => setExpire(e.target.value)} required aria-invalid={!!expire && !dateOk} />
                </Champ>
              )}
              <p className="t12 c3 mt6">{p.type === 'selfie' ? t('Le visage correspond à la photo de la pièce d’identité, sans filtre ni capture d’écran.') : t('Nom identique au compte, photo nette, pièce en cours de validité.')}</p>
              <div className="btns mt10">
                <button type="submit" className="btn primary" disabled={!dateOk || encours}>
                  <Icone nom="check" taille={18} />
                  <span>{t('Valider la pièce')}</span>
                </button>
                <button type="button" className="btn ghost" onClick={() => setMode('voir')}>
                  {t('Retour')}
                </button>
              </div>
            </form>
          )}
          {mode === 'refuser' && (
            <form
              className="mt16"
              onSubmit={(e) => {
                e.preventDefault()
                if (motif.trim()) void envoyer()
              }}
            >
              <div className="chips" role="group" aria-label={t('Motifs fréquents')}>
                {MOTIFS.map((m) => (
                  <button key={m} type="button" className={'chip' + (motif === t(m) ? ' on' : '')} aria-pressed={motif === t(m)} onClick={() => setMotif(t(m))}>
                    {t(m)}
                  </button>
                ))}
              </div>
              <Champ t={t('Motif écrit, envoyé au livreur')} className="mt10">
                <textarea rows={3} value={motif} onChange={(e) => setMotif(e.target.value)} />
              </Champ>
              <div className="btns mt10">
                <button type="submit" className="btn danger" disabled={!motif.trim() || encours}>
                  <Icone nom="x" taille={18} />
                  <span>{t('Refuser et prévenir le livreur')}</span>
                </button>
                <button type="button" className="btn ghost" onClick={() => setMode('voir')}>
                  {t('Retour')}
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  )
}
