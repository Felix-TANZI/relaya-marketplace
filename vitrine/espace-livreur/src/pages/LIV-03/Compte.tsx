// LIV-P32 · États du compte : écran plein, sans barre ni bouton d'incident, montré à toute ouverture pour un compte non
// actif ou restreint (LIV-01-R013, LIV-03-R38). Pour chaque état : niveau et phrase-clé, décision (date, examen humain,
// auteur), durée, motif écrit par la personne qui a décidé (toujours), limites, ce qui reste possible (chaque ligne
// ouvre l'écran concerné), recours une fois dans les 7 jours (feuille ; la décision reste appliquée pendant l'examen),
// contacts (entreprise en appel masqué, support livreur en aide seulement). Couleur du héros selon la gravité :
// nuit, ambre, rouge, toujours doublée d'un texte (LIV-03-R39). Un compte actif y voit l'historique de ses décisions.
// Enrichissement : « Pourquoi ? » sous chaque limite (M14). Rattachement fermé par un départ (DP-66, DP-67) : « Mon kit »
// (constat, retenue, « Contester ») et « Mon dernier versement » (vendredi qui suit la clôture, versement fait), lus
// dans le profil même accès fermé.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { F } from '@client/i18n/format'
import { Feuille, useFeuille } from '@client/composants/Feuille'
import logo from '../../assets/logo-belivay.png'
import { Ecran } from '../../composants/coque'
import { Pourquoi } from '../../composants/enrichis'
import { Barre, Btn, Hint, Kv, Li, Note, Sec } from '../../composants/proto'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import type { Decision, EtatDetaille, EtatDuCompte } from '../../donnees/domaines/acces'
import { origine, useEnLigne } from '../../donnees/fileHorsLigne'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { FeuilleAppel, useAppel } from '../LIV-08/commun'
import { CarteKit, CarteVersement } from '../LIV-10/depart'
import { BasFixe, Chargement, ErreurLecture, NOMS_PIECES, Visage, jourAn } from './commun'
import './liv03.css'

const JOUR_MS = 24 * 3600 * 1000

/** Héros de chaque état (couleur doublée d'un texte : LIV-03-R39). */
const HEROS: Record<EtatDetaille, { ton: 'night' | 'amber' | 'red' | 'acc'; hk: string; ht: string }> = {
  actif: { ton: 'acc', hk: 'État du compte', ht: 'Accès actif' },
  en_activation: { ton: 'night', hk: 'État du compte', ht: 'En activation' },
  restreint: { ton: 'amber', hk: 'Accès restreint · niveau 2', ht: 'Vous travaillez dans des limites' },
  suspendu: { ton: 'red', hk: 'Accès suspendu · niveau 3', ht: 'Vous ne recevez plus de nouveau paquet' },
  rattachement_ferme: { ton: 'night', hk: 'Rattachement fermé', ht: 'Vous n’êtes plus rattaché à {entreprise}' },
  rattachement_suspendu: { ton: 'amber', hk: 'Rattachement suspendu', ht: '{entreprise} est suspendue par BelivaY' },
  retire: { ton: 'red', hk: 'Accès retiré · niveau 4', ht: 'Accès à BelivaY retiré définitivement' },
}
const COULEUR_HK = { red: '#FFB4AB', amber: '#FFD98A', night: undefined, acc: undefined }

export default function Compte() {
  const lecture = useLecture(() => source.acces.etatDuCompte(), [])
  const c = lecture.donnees
  return (
    <Ecran route="compte" proto fixes={c && <FeuilleRecours c={c} />}>
      <EnTeteCompacte />
      {lecture.erreur ? <ErreurLecture relire={lecture.relire} /> : !c ? <Chargement lignes={5} /> : <Contenu c={c} />}
    </Ecran>
  )
}

/** En-tête compacte des écrans pleins (livA_top) : logo, nom et entreprise, visage. */
function EnTeteCompacte() {
  const { t } = usePreferences()
  const s = useSession()
  const l = s.livreur
  return (
    <div className="row" style={{ justifyContent: 'space-between', paddingTop: 6, gap: 10 }}>
      <img src={logo} alt="BelivaY" style={{ height: 30, width: 'auto' }} />
      <span className="row" style={{ gap: 10, minWidth: 0 }}>
        <span className="right" style={{ minWidth: 0 }}>
          <span className="b8 t14" style={{ display: 'block' }}>
            {l ? `${l.prenom} ${l.nom}` : t('Espace livreur')}
          </span>
          {l && (
            <span className="t12 c3" style={{ display: 'block' }}>
              {l.entreprise} · {t(l.vehicule).toLowerCase()}
            </span>
          )}
        </span>
        <span className="l3-av42">
          <Visage photo={l?.photo} initiales={l?.initiales} />
        </span>
      </span>
    </div>
  )
}

function Contenu({ c }: { c: EtatDuCompte }) {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const h = HEROS[c.etat]
  const d = c.decision
  const ent = c.entreprise.nom
  if (c.etat === 'en_activation') return <EnActivation c={c} />
  const decide = d
    ? [
        tf('Décidé par BelivaY le {date} à {h}', { date: jourAn(d.le, langue), h: heure(d.le, langue) }) + (d.examenHumain ? t(', après examen humain') : '') + ' (' + t(d.auteur) + ').',
        d.finLe ? tf('Durée : {n} jours, jusqu’au {date}.', { n: Math.round((d.finLe - d.le) / JOUR_MS), date: jourAn(d.finLe, langue) }) : '',
      ]
    : []
  const phrase =
    c.etat === 'rattachement_ferme'
      ? c.entreprise.fermeLe
        ? tf('Fermé le {date} à {h}, après votre dernière mission en cours.', { date: jourAn(c.entreprise.fermeLe, langue), h: heure(c.entreprise.fermeLe, langue) })
        : t('Votre compte, votre historique et votre certification sont conservés.')
      : c.etat === 'rattachement_suspendu'
        ? t('Vous terminez les colis en cours ; aucun nouveau paquet ne vous est affecté tant que votre entreprise est suspendue.')
        : c.etat === 'actif'
          ? t('Vous pouvez recevoir des paquets de votre entreprise.')
          : null
  return (
    <>
      <div className={'hero ' + h.ton + (h.ton === 'acc' ? ' l3-acc' : '')}>
        <div className="hk" style={{ color: COULEUR_HK[h.ton] }}>
          {t(h.hk)}
        </div>
        <h1 className="ht" style={{ margin: '6px 0 0' }}>
          {tf(h.ht, { entreprise: ent })}
        </h1>
        <div className="hs">
          {phrase}
          {decide[0]}{' '}
          {decide[1] && <b>{decide[1]}</b>}
        </div>
      </div>

      {d && (
        <div className="card l3-motif">
          <div className="kick">{t('Motif')}</div>
          <div className="t15 b7 mt6 lh">{t(d.motif)}</div>
          <Details c={c} />
        </div>
      )}
      {c.etat === 'rattachement_ferme' && <CarteFerme c={c} />}
      {c.etat === 'rattachement_ferme' && <DepartFerme entreprise={ent} />}

      <Limites c={c} />
      <Possible c={c} />

      {d && d.recours.possibleJusqua !== null && <BlocRecours d={d} />}
      {c.etat === 'retire' && (
        <div className="card tight">
          <Li icone="download" ton="ink" t={t('Accès et export de vos données')} s={t('Loi n° 2024/017 · depuis Moi, tant que la loi l’exige')} vers={chemin('moi')} />
        </div>
      )}

      {c.historique.length > 0 && (
        <>
          <Sec titre={t('Décisions passées')} />
          <div className="card tight">
            {c.historique.map((x) => (
              <Li key={x.id} icone="file-text" ton="ink" t={x.niveau === 1 ? t('Avertissement · niveau 1') : x.niveau ? tf('Niveau {n}', { n: x.niveau }) : t('Décision')} s={`${jourAn(x.le, langue)} · ${t(x.motif)}`} />
            ))}
          </div>
        </>
      )}
      {c.etat === 'actif' && !d && c.historique.length === 0 && (
        <div className="mt12">
          <Note ton="green" icone="badge-check">
            {t('Aucune décision sur votre accès. Une alerte vous prévient toujours avant un seuil qui déclencherait une restriction.')}
          </Note>
        </div>
      )}

      <Contacts c={c} />
      {c.etat === 'restreint' || c.etat === 'suspendu' || c.etat === 'retire' || c.etat === 'actif' ? (
        <Hint icone="info">{tf('Une décision sur votre accès n’est jamais une sanction de travail : {entreprise} reste seule juge de votre contrat.', { entreprise: ent })}</Hint>
      ) : c.etat === 'rattachement_ferme' ? (
        <Hint icone="link-2-off">{t('Un livreur est rattaché à une seule entreprise à la fois ; aucun paquet ne peut vous être affecté sans rattachement actif.')}</Hint>
      ) : null}

      {(c.etat === 'actif' || c.etat === 'restreint') && s.connecte && (
        <BasFixe>
          <Btn kind="primary" icone="house" cls="xl" vers={chemin('aujourdhui')}>
            {t('Retour à ma journée')}
          </Btn>
        </BasFixe>
      )}
    </>
  )
}

/** Conséquences de la décision, en paires libellé / valeur (C.kv). */
function Details({ c }: { c: EtatDuCompte }) {
  const { t, tf } = usePreferences()
  const d = c.decision!
  const l: [string, string][] = []
  if (c.etat === 'suspendu') {
    if (d.scoreGeleSous !== null) l.push([t('Trust Score'), tf('gelé sous {n} pendant la suspension', { n: d.scoreGeleSous })])
    if (d.probationJours !== null) l.push([t('Au retour'), tf('période probatoire de {n} jours', { n: d.probationJours })])
  }
  if (c.etat === 'retire') {
    l.push([t('Certification'), t('retirée')])
    l.push([t('Liste noire'), t('pièce d’identité, téléphone, appareil')])
    l.push([t('Nouvelle invitation'), t('impossible, par toute entreprise')])
  }
  if (c.etat !== 'rattachement_suspendu') l.push([c.entreprise.nom, t('informée, niveau et motif visibles')])
  if (!l.length) return null
  return (
    <div className="mt10">
      {l.map(([k, v]) => (
        <Kv key={k} k={k} v={v} />
      ))}
    </div>
  )
}

function CarteFerme({ c }: { c: EtatDuCompte }) {
  const { t, tf } = usePreferences()
  const s = useSession()
  return (
    <div className="card">
      <Kv k={t('Ancienne entreprise')} v={c.entreprise.nom} />
      <Kv k={t('Historique conservé')} v={tf('{n} derniers jours consultables', { n: c.historiqueJours })} />
      <Kv k={t('Trust Score conservé')} v={s.trustScore === null ? '—' : String(Math.round(s.trustScore))} />
      <Kv k={t('Certification')} v={t('conservée')} />
    </div>
  )
}

/** Départ clôturé (DP-67) : kit et dernier versement, lisibles et contestables même accès fermé. */
function DepartFerme({ entreprise }: { entreprise: string }) {
  const p = useLecture(() => source.moi.profil(), [])
  const d = p.donnees?.depart
  if (!d || d.etat !== 'close') return null
  return (
    <>
      <CarteKit depart={d} entreprise={entreprise} relire={p.relire} />
      <CarteVersement depart={d} entreprise={entreprise} />
    </>
  )
}

function Limites({ c }: { c: EtatDuCompte }) {
  const { t, tf } = usePreferences()
  const d = c.decision
  if (c.etat !== 'restreint' || !d?.limites) return null
  const m = d.limites.modulesARefaire
  return (
    <>
      <Sec titre={t('Vos limites')} />
      <div className="card tight">
        {d.limites.plafondColis !== null && (
          <>
            <Li icone="shield-half" ton="amber" t={tf('Plafond de valeur réduit à {m} par colis', { m: F(d.limites.plafondColis) + ' F' })} s={t('Les paquets au-dessus ne vous sont plus affectés')} />
            <div className="l3-pq">
              <Pourquoi>{t('Le temps de la mesure, moins de valeur passe sous votre garde : moins de risque pour vous comme pour votre entreprise. Le plafond habituel revient à la fin de la mesure.')}</Pourquoi>
            </div>
          </>
        )}
        {!d.limites.domicile && (
          <>
            <Li icone="house" ton="amber" t={t('Pas de remise à domicile')} s={t('Tournées relais seulement')} />
            <div className="l3-pq">
              <Pourquoi fiche="domicile">{t('La remise à domicile demande le plus de confiance (code du client, adresse) : elle reprend à la fin de la mesure.')}</Pourquoi>
            </div>
          </>
        )}
        {m.length ? (
          <>
            <Li icone="graduation-cap" ton="amber" t={m.length === 1 ? t('Recertification : 1 module à revoir') : tf('Recertification : {n} modules à revoir', { n: m.length })} s={t('Avant le prochain paquet')} vers={chemin('certification')} />
            <div className="l3-pq">
              <Pourquoi>{t('Seuls les modules liés au manquement sont à revoir : ils rappellent le geste attendu avant que vous repreniez la route.')}</Pourquoi>
            </div>
          </>
        ) : (
          <Li icone="circle-check" ton="green" t={t('Modules revus : recertification faite')} />
        )}
      </div>
    </>
  )
}

function Possible({ c }: { c: EtatDuCompte }) {
  const { t, tf } = usePreferences()
  if (c.etat === 'actif' || c.etat === 'retire' || c.etat === 'restreint') return null
  const garde = c.colisSousGarde > 0
  const colis = c.colisSousGarde === 1 ? t('Terminer le colis sous votre garde') : tf('Terminer les {n} colis sous votre garde', { n: c.colisSousGarde })
  const lignes = (
    <>
      {garde && <Li icone="package-check" ton="acc" t={colis} s={t('Le dépôt prévu reste à faire ; rien de nouveau ne vous est affecté')} vers={chemin('tournee')} />}
      {c.etat === 'rattachement_suspendu' && <Li icone="user-round-check" ton="green" t={t('Votre compte reste valide')} s={t('Certification, historique et Trust Score ne changent pas')} />}
      {c.etat === 'rattachement_ferme' && <Li icone="mail-plus" ton="acc" t={t('Attendre une nouvelle invitation')} s={t('Une autre entreprise partenaire peut vous inviter : votre compte reste le même, sans perte d’historique')} />}
      {c.etat !== 'rattachement_suspendu' && <Li icone="history" ton="ink" t={t('Consulter votre historique et vos preuves')} s={c.etat === 'suspendu' ? t('Elles sont versées au dossier sans que vous ayez à les renvoyer') : tf('Missions et preuves des {n} derniers jours', { n: c.historiqueJours })} vers={chemin('historique')} />}
      {c.etat === 'rattachement_ferme' && <Li icone="graduation-cap" ton="ink" t={t('Se former')} s={t('Modules et fiches d’aide disponibles')} vers={chemin('certification')} />}
    </>
  )
  if (c.etat === 'rattachement_suspendu') return <div className="card tight">{lignes}</div>
  return (
    <>
      <Sec titre={t('Ce qui reste possible')} />
      <div className="card tight">{lignes}</div>
    </>
  )
}

function BlocRecours({ d }: { d: Decision }) {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const recours = useFeuille('recours')
  const r = d.recours
  if (r.deposeLe !== null)
    return (
      <div className="mt12">
        <Note ton="acc" icone="file-clock" role="status">
          <b>{tf('Recours déposé le {date}', { date: jourAn(r.deposeLe, langue) })}</b>
          <br />
          {r.reponseAvant ? tf('Réponse écrite d’une personne de BelivaY attendue avant le {date} à {h}. Votre entreprise est informée ; la décision reste appliquée pendant l’examen.', { date: jourAn(r.reponseAvant, langue), h: heure(r.reponseAvant, langue) }) : ''}
          {r.reponse ? ' ' + t(r.reponse) : ''}
        </Note>
      </div>
    )
  if (r.possibleJusqua! < s.maintenant)
    return (
      <div className="mt12">
        <Note ton="amber" icone="calendar-x">
          {tf('Le délai de recours a pris fin le {date}.', { date: jourAn(r.possibleJusqua!, langue) })}
        </Note>
      </div>
    )
  return (
    <button type="button" className="card row l3-recours" style={{ gap: 12, display: 'flex' }} onClick={recours.ouvrir}>
      <span className="li" style={{ border: 0, padding: 0, minHeight: 0 }}>
        <span className="ic or">
          <Icone nom="scale" taille={20} />
        </span>
      </span>
      <span className="grow">
        <span className="b8 t15" style={{ display: 'block' }}>
          {t('Faire un recours')}
        </span>
        <span className="t12 c3" style={{ display: 'block', marginTop: 2 }}>
          {tf('Une seule fois pour cette décision, jusqu’au {date} à {h}', { date: jourAn(r.possibleJusqua!, langue), h: heure(r.possibleJusqua!, langue) })}
        </span>
      </span>
      <Icone nom="chevron-right" taille={18} />
    </button>
  )
}

function Contacts({ c }: { c: EtatDuCompte }) {
  const { t, tf } = usePreferences()
  const enLigne = useEnLigne()
  const appel = useAppel()
  const s =
    c.etat === 'rattachement_suspendu'
      ? t('Votre entreprise vous dit la suite de votre travail')
      : c.etat === 'retire'
        ? tf('{entreprise} est informée ; votre contrat avec elle relève d’elle seule', { entreprise: c.entreprise.nom })
        : c.etat === 'en_activation'
          ? tf('{entreprise} voit ce qui manque, jamais le contenu de vos pièces', { entreprise: c.entreprise.nom })
          : t('Votre entreprise est informée de chaque décision')
  return (
    <div className="card tight">
      {c.etat !== 'rattachement_ferme' && <Li icone="phone" ton="acc" t={tf('Appeler {entreprise}', { entreprise: c.entreprise.nom })} s={enLigne ? s : t('L’appel demande le réseau')} onClick={enLigne ? () => void appel.appeler('entreprise') : undefined} cls="l3-li" />}
      <Li icone="life-buoy" ton="ink" t={t('Support livreur BelivaY')} s={t('Aide seulement : il ne valide rien et ne donne aucun code')} vers={chemin('aide')} />
      <FeuilleAppel a={appel} />
    </div>
  )
}

/** En activation : étapes restantes (chacune ouvre son écran), contacts ; « Compléter l'activation ». */
function EnActivation({ c }: { c: EtatDuCompte }) {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const act = useLecture(() => source.acces.activation(), [])
  const a = act.donnees
  const faites = a ? a.etapes.filter((e) => e.etat === 'fait').length : 0
  const n = a ? a.etapes.length : 5
  const restantes = n - faites
  const verifiees = a ? a.pieces.filter((p) => p.etat === 'verifiee').length : 0
  const enAttente = a?.pieces.find((p) => p.etat === 'en_verification')
  const rejetee = a?.pieces.find((p) => p.etat === 'rejetee')
  const etats = a ? Object.fromEntries(a.etapes.map((e) => [e.id, e.etat])) : {}
  const lignes = a
    ? [
        etats.charte !== 'fait' && { t: t('Charte d’accès à accepter'), s: t('Avant toute mission'), vers: chemin('activation') },
        (etats.pieces_envoyees !== 'fait' || etats.pieces_verifiees !== 'fait') && {
          t: tf('Pièces vérifiées · {x} sur {n}', { x: verifiees, n: a.pieces.length }),
          s: rejetee ? tf('{piece} rejetée : à renvoyer', { piece: t(NOMS_PIECES[rejetee.id]) }) : enAttente?.reponseAvant ? tf('Réponse avant le {date} à {h}', { date: jourAn(enAttente.reponseAvant, langue), h: heure(enAttente.reponseAvant, langue) }) : t('Pièces à photographier dans l’application'),
          vers: chemin('activation'),
        },
        etats.certification !== 'fait' && { t: tf('Certification · {x} modules sur {n}', { x: a.certification.modulesFaits, n: a.certification.modulesTotal }), s: t('Modules restants, puis le quiz final'), vers: chemin('certification') },
        etats.approbation !== 'fait' && { t: tf('Approbation de {entreprise}', { entreprise: a.entreprise.nom }), s: t('Puis activation de l’accès par BelivaY') },
      ].filter(Boolean)
    : []
  return (
    <>
      <div className="hero night">
        <div className="hk">{t('État du compte')}</div>
        <h1 className="ht" style={{ margin: '6px 0 0' }}>
          {t('En activation')}
        </h1>
        <div className="hs">{(restantes === 1 ? t('Encore 1 étape avant votre première mission.') : tf('Encore {n} étapes avant votre première mission.', { n: restantes })) + ' ' + t('Aucune mission n’est visible avant l’activation complète.')}</div>
        <div className="mt14">
          <Barre pct={(faites / n) * 100} ton="acc" label={t('Avancement de l’activation')} />
        </div>
        <div className="row mt8 t12" style={{ justifyContent: 'space-between', color: 'rgba(255,255,255,.85)' }}>
          <span>{faites <= 1 ? tf('{x} étape sur {n} faite', { x: faites, n }) : tf('{x} étapes sur {n} faites', { x: faites, n })}</span>
          <span>{jourAn(s.maintenant, langue)}</span>
        </div>
      </div>
      <Sec titre={t('Étapes restantes')} />
      <div className="card tight">
        {!a ? (
          <Chargement lignes={3} />
        ) : (
          (lignes as { t: string; s: string; vers?: string }[]).map((l, i) => {
            const dedans = (
              <>
                <span className="sn">{i + 1}</span>
                <span className="grow">
                  <span className="st" style={{ display: 'block' }}>
                    {l.t}
                  </span>
                  <span className="ss" style={{ display: 'block' }}>
                    {l.s}
                  </span>
                </span>
                {l.vers && <Icone nom="chevron-right" taille={18} />}
              </>
            )
            return l.vers ? (
              <Link key={i} className={'stop' + (i === 0 ? ' cur' : '')} to={l.vers} style={{ display: 'flex', color: 'inherit' }}>
                {dedans}
              </Link>
            ) : (
              <div key={i} className={'stop' + (i === 0 ? ' cur' : '')}>
                {dedans}
              </div>
            )
          })
        )}
      </div>
      <Contacts c={c} />
      <BasFixe>
        <Btn kind="primary" icone="list-checks" cls="xl" vers={chemin('activation')}>
          {t('Compléter l’activation')}
        </Btn>
      </BasFixe>
    </>
  )
}

// ---------- Feuille « Faire un recours » (LIV-03-R46) ----------

function FeuilleRecours({ c }: { c: EtatDuCompte }) {
  const { t, tf, langue } = usePreferences()
  const f = useFeuille('recours')
  const enLigne = useEnLigne()
  const s = useSession()
  const [texte, setTexte] = useState('')
  const [preuves, setPreuves] = useState<string[]>([])
  const [erreur, setErreur] = useState<string | null>(null)
  const [occupe, setOccupe] = useState(false)
  const d = c.decision
  if (!d) return null
  const min = c.recoursMinCaracteres
  const envoyer = async () => {
    setOccupe(true)
    const r = await source.acces.faireAppel(d.id, texte, preuves, origine(s.maintenant))
    setOccupe(false)
    if (r.ok) {
      signal('succes')
      setTexte('')
      setPreuves([])
      return f.fermer()
    }
    signal('erreur')
    setErreur(
      {
        hors_delai: t('Le délai de recours est dépassé.'),
        deja_fait: t('Un recours a déjà été déposé pour cette décision.'),
        sans_recours: t('Cette décision n’ouvre pas de recours.'),
        texte_trop_court: tf('Expliquez ce que vous contestez en {n} caractères au moins.', { n: min }),
        numero_interdit: t('Retirez le numéro de téléphone : aucun numéro ne s’écrit dans un recours.'),
      }[r.raison],
    )
  }
  return (
    <Feuille ouverte={f.ouverte} fermer={f.fermer} titre={t('Faire un recours')}>
      <div className="b8 t19">{t('Faire un recours')}</div>
      <div className="t13 c3 mt4">
        {d.recours.possibleJusqua ? tf('Une seule fois pour cette décision, jusqu’au {date}.', { date: jourAn(d.recours.possibleJusqua, langue) }) + ' ' : ''}
        {t('Une personne de BelivaY l’examine et répond par écrit.')}
      </div>
      <div className="fld">
        <label htmlFor="l3-rec">{t('Ce que vous contestez')}</label>
        <textarea
          id="l3-rec"
          className={'inp area l3-zone' + (erreur ? ' err' : '')}
          rows={5}
          value={texte}
          aria-invalid={!!erreur || undefined}
          aria-describedby="l3-rec-h"
          onChange={(e) => {
            setErreur(null)
            setTexte(e.target.value)
          }}
          placeholder={t('Les faits, avec vos mots : ce qui s’est passé, ce qui est inexact.')}
        />
        <div id="l3-rec-h" className={'hint' + (erreur ? ' err' : '')}>
          {tf('Écrivez les faits, sans numéro de téléphone · {n} caractères (au moins {min})', { n: texte.trim().length, min })}
        </div>
      </div>
      {c.dossier.length > 0 && (
        <fieldset className="l3-preuves">
          <legend>{t('Preuves de votre historique')}</legend>
          {c.dossier.map((p) => (
            <label key={p.id} className="l3-coche">
              <input type="checkbox" checked={preuves.includes(p.id)} onChange={(e) => setPreuves((l) => (e.target.checked ? [...l, p.id] : l.filter((x) => x !== p.id)))} />
              <span>
                {t(p.libelle)}
                <small>
                  {jourAn(p.quand, langue)} · {heure(p.quand, langue)}
                </small>
              </span>
            </label>
          ))}
        </fieldset>
      )}
      <Hint icone="info">{tf('{entreprise} est informée de votre recours. La décision reste appliquée pendant l’examen.', { entreprise: c.entreprise.nom })}</Hint>
      {!enLigne && <Hint icone="wifi-off">{t('Le recours part avec le réseau : reconnectez-vous pour l’envoyer.')}</Hint>}
      {erreur && (
        <div className="mt12">
          <Note ton="red" icone="circle-alert" role="alert">
            {erreur}
          </Note>
        </div>
      )}
      <div className="btns liva-col mt14">
        <Btn kind="primary" icone="send" cls="xl" off={occupe || !enLigne || texte.trim().length === 0} onClick={() => void envoyer()}>
          {t('Envoyer le recours')}
        </Btn>
      </div>
    </Feuille>
  )
}
