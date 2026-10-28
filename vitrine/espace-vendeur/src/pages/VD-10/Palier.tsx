// Mon palier (VD-10, fig. 1) : repris du prototype (route('palier')), branché sur GET /tiers (domaine paliers), l'état
// du compte (domaine trust) et ce qu'il y a à faire aujourd'hui (domaine accueil). L'écran ne calcule rien (VD10-R08).
// - Où j'en suis et le prochain geste d'abord (TRU-05) : carte nuit (médaille, palier, score qui monte, jauge vers le
//   seuil, phrase en gestes concrets TRU-01, gain en francs TRU-02, un seul bouton plein) ; montée en attente des
//   14 jours (VD10-R04) ; descente proposée (note ambre, motif, date d'effet, « Contester » une fois : VD10-R05).
// - Conditions du palier suivant avec ce qui manque (VD10-R11) ; projection et litiges repliés (VD10-R07).
// - Ajouts : « Vos prochains gestes » (conseils concrets tirés des commandes, des litiges et du critère le plus
//   faible), palier de lancement, alerte avant un seuil, bandeau hors connexion (dernier score et son heure).
// - Règles corrigées par les décisions : descente sous le seuil du palier 14 jours (DP-21, A-5, au lieu de « seuil
//   moins 5 ») ; support en 2 h pour tous (DP-56 Q-47) ; montants calculés (gain sur l'iPhone sans M06 : VD-D03.A01).
// - Accès Préparation : aucun montant (la source n'en donne pas), le travail reste le même.
import { useLocation } from 'react-router-dom'
import { Ecran, nomPalier } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { MonPalier } from '../../donnees/domaines/paliers'
import type { Aujourdhui } from '../../donnees/domaines/accueil'
import type { Score, StatutCompte } from '../../donnees/domaines/trust'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useMontantsVisibles, useSession } from '../../session'
import { Attente, Bouton, dateCourte, dateEtHeure, HorsLigne, Ligne, Plus, Segments, SEG_TRUST, useCompteur, useEnLigne, useMontant } from './commun'
import { conseils, Conseils } from './conseils'

const EN_LETTRES = ['Aucune', 'Une', 'Deux', 'Trois', 'Quatre', 'Cinq']
const MEDAILLE: Record<string, string> = { Bronze: 'bronze', Argent: 'argent', Or: 'or', Platine: 'platine' }

function CarteNuit({ d }: { d: MonPalier }) {
  const { t, tf, langue } = usePreferences()
  const montant = useMontant()
  const score = useCompteur(d.score)
  const suivant = d.suivant ? nomPalier(d.suivant, langue) : null
  const phrase = !d.suivant
    ? t('Vous êtes au plus haut palier. Gardez votre score au-dessus du seuil.')
    : d.montee
      ? tf('{palier} le {date} si vous tenez ce niveau.', { palier: suivant!, date: dateCourte(d.montee.date, langue) })
      : d.commandesAFaire === 1
        ? tf('Plus qu’une commande livrée sans incident pour passer {palier}.', { palier: suivant! })
        : tf('Plus que {n} commandes livrées sans incident pour passer {palier}.', { n: d.commandesAFaire ?? 0, palier: suivant! })
  return (
    <div className="hero night">
      <div className="row">
        <span className={'medal ' + MEDAILLE[d.palier]}>
          <Icone nom="award" taille={22} />
        </span>
        <div className="grow">
          <div className="hk">{t('Votre palier')}</div>
          <div className="b8" style={{ fontSize: '24px', lineHeight: '1.2' }}>
            {nomPalier(d.palier, langue)}
          </div>
        </div>
        <div className="right">
          <div className="big" style={{ margin: '0', fontSize: '38px' }} aria-label={String(Math.round(d.score))}>
            {String(Math.round(score))}
          </div>
          <div className="t12" style={{ color: 'rgba(255,255,255,.75)' }}>
            {t('Trust Score / 100')}
          </div>
        </div>
      </div>
      <div className="bar mt14" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(d.score)} aria-label={t('Trust Score / 100')}>
        <i style={{ width: `${Math.min(100, d.score)}%` }}></i>
      </div>
      {d.suivant && d.seuilSuivant !== null && (
        <div className="t12 mt6 right" style={{ color: 'rgba(255,255,255,.75)' }}>
          {tf('{palier} à {seuil}', { palier: suivant!, seuil: d.seuilSuivant })}
        </div>
      )}
      <div className="hline"></div>
      <div className="b8" style={{ fontSize: '18px', lineHeight: '1.3', letterSpacing: '-.01em' }}>
        {phrase}
      </div>
      {d.reference && d.reference.suivant !== null && (
        <div className="hs">{tf('Vous garderez alors {gain} de plus par {titre}.', { gain: montant(d.reference.suivant - d.reference.actuel), titre: d.reference.titre.split(' ')[0] })}</div>
      )}
      <div className="mt14">
        <Bouton classe="primary" icone="package-check" vers={chemin('commandes')}>
          {t('Voir mes commandes à préparer')}
        </Bouton>
      </div>
    </div>
  )
}

function Descente({ d }: { d: NonNullable<MonPalier['descente']> }) {
  const { t, tf, langue } = usePreferences()
  return (
    <div className="card" style={{ border: '1.5px solid var(--amber-line)', background: 'var(--amber-soft)', boxShadow: 'none' }}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <Icone nom="triangle-alert" taille={22} style={{ color: 'var(--amber)', flexShrink: '0' }} />
        <div className="grow">
          <div className="b8 t15">{tf('Descente proposée vers {palier}', { palier: nomPalier(d.vers, langue) })}</div>
          <div className="t13 c2 mt4" style={{ lineHeight: '1.45' }}>
            {t('Validée par une personne, avec un motif écrit. Vous pouvez la contester une fois.')}
          </div>
          <div className="t13 c2 mt4">{tf('Motif : « {motif} »', { motif: t(d.motif) })}</div>
          <div className="t13 c3 mt4">{tf('Prend effet {quand}. Votre palier reste le même jusque-là.', { quand: dateEtHeure(d.effetA, langue) })}</div>
        </div>
      </div>
      <div className="mt12">
        {d.contestee ? (
          <div className="note green" style={{ marginTop: '0' }}>
            <Icone nom="circle-check" taille={18} />
            <div>{d.reponseAvant ? tf('Contestation envoyée · réponse avant {quand}', { quand: dateEtHeure(d.reponseAvant, langue) }) : t('Contestation envoyée · réponse sous 72 h ouvrées')}</div>
          </div>
        ) : (
          <Bouton classe="secondary" icone="gavel" vers={chemin('contester', { d: d.decisionId, depuis: 'palier' })} style={{ height: '44px' }}>
            {t('Contester')}
          </Bouton>
        )}
      </div>
    </div>
  )
}

function Conditions({ d }: { d: MonPalier }) {
  const { t, tf, langue } = usePreferences()
  if (!d.suivant) return null
  const n = d.conditions.length
  return (
    <div className="card">
      <h3>{tf('Pour passer {palier}', { palier: nomPalier(d.suivant, langue) })}</h3>
      <p className="t13 c3" style={{ margin: '6px 0 4px' }}>
        {n >= 1 && n <= 5 ? tf('{n} conditions, à tenir {j} jours.', { n: t(EN_LETTRES[n]), j: d.montee14 }) : tf('{n} conditions, à tenir {j} jours.', { n, j: d.montee14 })}
      </p>
      {d.conditions.map((c) => (
        <div key={c.cle} className="li" style={{ minHeight: '0', padding: '11px 0' }}>
          <span className={'ic ' + (c.tenue ? 'green' : 'or')} style={{ width: '34px', height: '34px', borderRadius: '50%' }}>
            <Icone nom={c.tenue ? 'check' : 'arrow-up-right'} taille={17} trait={2.4} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block', fontSize: '14px' }}>
              {t(c.libelle)}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {tf('Vous : {v}', { v: t(c.valeur) })}
            </span>
          </span>
          {c.tenue ? <span className="b8 t14 cg">{t('acquis')}</span> : c.manque ? <span className="b8 t14 cor">{c.manque}</span> : <span className="t12 b7 c3">{t('par l’agent de zone')}</span>}
        </div>
      ))}
      {d.projection && (
        <Plus plat icone="circle-help" titre={d.projection.commandes === 1 ? t('Pourquoi une commande ?') : tf('Pourquoi {n} commandes ?', { n: d.projection.commandes })}>
          <p>
            {tf('{n} commandes livrées sans incident de plus : votre score monte vers {s} environ, et vous atteignez {c} commandes livrées.', {
              n: d.projection.commandes,
              s: d.projection.scoreApres,
              c: d.conditions.find((c) => c.cle === 'livrees') ? Number(d.conditions.find((c) => c.cle === 'livrees')!.valeur) + d.projection.commandes : d.projection.commandes,
            })}
          </p>
          {d.projection.litigesEnCours > 0 && d.projection.siGagnes !== null && (
            <p>
              {d.projection.litigesEnCours === 1
                ? tf('Votre litige en cours ne compte qu’une fois tranché. Gagné, votre score serait de {g} ; perdu, de {p}.', { g: d.projection.siGagnes, p: d.projection.siPerdus ?? '' })
                : tf('Vos {n} litiges en cours ne comptent qu’une fois tranchés. Gagnés, votre score serait de {g} ; perdus, de {p}.', { n: d.projection.litigesEnCours, g: d.projection.siGagnes, p: d.projection.siPerdus ?? '' })}
            </p>
          )}
          <p>{t('Une commande annulée par le client avant le ramassage ne compte pas.')}</p>
        </Plus>
      )}
    </div>
  )
}

function Gains({ d }: { d: MonPalier }) {
  const { t, tf, langue } = usePreferences()
  const montant = useMontant()
  if (!d.suivant || !d.reference || d.reference.suivant === null) return null
  return (
    <div className="card">
      <h3>{tf('Ce que vous gagnez avec {palier}', { palier: nomPalier(d.suivant, langue) })}</h3>
      <div className="keep">
        <span className="kl">{tf('Vous garderez par {titre}', { titre: d.reference.titre.split(' ')[0] })}</span>
        <span className="kv2">{montant(d.reference.suivant)}</span>
      </div>
      <p className="t13 c3" style={{ margin: '6px 2px 8px' }}>
        {tf('Au lieu de {m} aujourd’hui.', { m: montant(d.reference.actuel) })}
      </p>
      {d.exemple && (
        <div className="kv">
          <span className="k">{tf('Sur un {titre} à {prix}', { titre: d.exemple.titre.replace(/ Pro Max$/, ''), prix: montant(d.exemple.prix) })}</span>
          <span className="v ">{tf('{m} de plus', { m: montant(d.exemple.gain) })}</span>
        </div>
      )}
      <div className="kv">
        <span className="k">{t('Argent libéré')}</span>
        <span className="v ">
          {d.liberationJours.suivant !== null && d.liberationJours.suivant < d.liberationJours.actuel
            ? tf('en {n} jour, au lieu de {a}', { n: d.liberationJours.suivant, a: d.liberationJours.actuel })
            : tf('en {n} jours, comme aujourd’hui', { n: d.liberationJours.actuel })}
        </span>
      </div>
      <div className="kv">
        <span className="k">{t('Support')}</span>
        <span className="v ">{d.suivant === 'Platine' ? t('Un responsable de compte') : tf('En {n} h, de 7 h à 21 h', { n: d.supportHeures })}</span>
      </div>
    </div>
  )
}

function Contenu({ d, score, statut, jour }: { d: MonPalier; score: Score | null; statut: StatutCompte | null; jour: Aujourdhui | null }) {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const montants = useMontantsVisibles()
  const enLigne = useEnLigne()
  const rang = ['Bronze', 'Argent', 'Or', 'Platine']
  const lancement = d.lancement && rang.indexOf(d.lancement.palier) > rang.indexOf(d.palier) ? d.lancement : null
  const etatCompte = statut?.enCours
    ? statut.enCours.type === 'descente'
      ? t('Une descente de palier proposée')
      : tf('{type} en cours', { type: t(statut.enCours.type === 'avertissement' ? 'Avertissement' : statut.enCours.type === 'visibilite_reduite' ? 'Visibilité réduite' : statut.enCours.type === 'suspension' ? 'Suspension' : 'Exclusion') })
    : t('Aucune sanction en cours')
  return (
    <Ecran route="palier">
      <div className="pg">
        <h1 className="pg-t">{t('Mon palier')}</h1>
      </div>
      <Segments items={SEG_TRUST} actif="palier" />
      {!enLigne && <HorsLigne depuis={d.calculeA} />}
      {d.descente && <Descente d={d.descente} />}
      <CarteNuit d={d} />
      {d.alerte && d.alerte.sens === 'descente' && (
        <div className="note amber">
          <Icone nom="triangle-alert" taille={18} />
          <div>
            <b>{tf('Votre score est à {n} points du seuil de {palier}.', { n: d.alerte.points, palier: nomPalier(d.palier, langue) })}</b> {tf('Sous {seuil} pendant {j} jours, une descente serait proposée.', { seuil: d.alerte.seuil, j: d.descente14 })}
          </div>
        </div>
      )}
      {/* Chantier F, point 6 : un seul score (la carte de nuit), puis trois conseils, avant les conditions détaillées. */}
      {score && <Conseils liste={conseils(score, jour, 3)} titre={t('Vos prochains gestes')} />}
      <Conditions d={d} />
      {montants ? (
        <Gains d={d} />
      ) : (
        s.proprietaire && (
          <div className="hint-l">
            <Icone nom="lock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{tf('Les montants et les versements sont réservés à {nom}, propriétaire.', { nom: `${s.proprietaire.prenom} ${s.proprietaire.nom}` })}</span>
          </div>
        )
      )}
      {lancement && (
        <div className="note or">
          <Icone nom="rocket" taille={18} />
          <div>
            <b>{tf('Palier de lancement : {palier}.', { palier: nomPalier(lancement.palier, langue) })}</b> {tf('Avec {n} produits actifs, vous gardez comme un vendeur {palier} jusqu’au {date}. La libération de l’argent suit votre Trust Score.', { n: lancement.produitsActifs, palier: nomPalier(lancement.palier, langue), date: dateCourte(lancement.jusqua, langue) })}
          </div>
        </div>
      )}
      <Plus titre={t('Comment ça marche')}>
        <p>
          <b>{t('Recalculé chaque nuit.')}</b>
          {tf(' Votre score exact est {s} ; il s’affiche arrondi.', { s: d.score.toFixed(1).replace('.', langue === 'en' ? '.' : ',') })}
        </p>
        <p>
          <b>{t('On monte')}</b>
          {tf(' quand toutes les conditions sont tenues {j} jours de suite.', { j: d.montee14 })}
        </p>
        <p>
          <b>{t('On descend')}</b>
          {tf(' si le score reste sous le seuil de votre palier {j} jours de suite. Une personne valide la descente, avec un motif. Vous pouvez contester une fois.', { j: d.descente14 })}
        </p>
        <p>
          <b>{t('Vous êtes prévenu.')}</b>
          {t(' Une alerte arrive quand votre score passe à 3 points d’un seuil, une fois par semaine au plus.')}
        </p>
        {d.decouverte && (
          <p>
            <b>{t('Offre de découverte.')}</b>
            {tf(' Ces montants la comprennent : {n} commandes sur {max}, jusqu’au {date} au plus tard.', { n: d.decouverte.commandes, max: d.decouverte.max, date: dateCourte(d.decouverte.fin, langue) })}
          </p>
        )}
      </Plus>
      <div className="card tight">
        <Ligne vers={chemin('sanctions')} icone={statut?.enCours ? 'shield-alert' : 'shield-check'} ton={statut?.enCours ? 'amber' : 'green'} titre={t('Sanctions et contrôle')} sous={statut ? `${etatCompte} · ${tf('contrôle {c}', { c: statut.controle.sur === 1 ? t('de toutes les commandes') : tf('1 commande sur {n}', { n: statut.controle.sur }) })}` : etatCompte} />
        <Ligne vers={chemin('score')} icone="gauge" ton="or" titre={t('Voir mon score')} sous={t('Les six critères et ce qui les fait bouger')} />
      </div>
    </Ecran>
  )
}

export default function Palier() {
  const s = useSession()
  const { search } = useLocation()
  const lecture = useLecture(() => source.paliers.monPalier(), [s.membre?.role, search])
  const score = useLecture(() => source.trust.score(), [])
  const statut = useLecture(() => source.trust.statut(), [search])
  const jour = useLecture(() => source.accueil.aujourdhui(), [s.membre?.role])
  return <Attente route="palier" lecture={lecture}>{(d) => <Contenu d={d} score={score.donnees} statut={statut.donnees} jour={jour.donnees} />}</Attente>
}
