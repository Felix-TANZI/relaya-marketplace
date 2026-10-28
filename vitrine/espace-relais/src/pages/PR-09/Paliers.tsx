// PR-09 · Paliers (gérant seul ; aucune saisie). Structure du prototype gardée : échelle Starter · Confirmé · Premium
// (bande nuit) avec la position du relais, une carte par palier avec ce qu'elle apporte (« Votre palier »), règle anti
// va-et-vient. Règles : PAL-01 (seuil tenu PR-PAL-TENUE-J jours), PAL-02 (perte après PR-PAL-TENUE-J jours à
// PR-PAL-MARGE points sous le seuil, descente validée par une personne, contestable une fois), PAL-03 (Starter : petits,
// moyens et encombrants — DP-20 : le relais ne refuse jamais les encombrants —, versement le vendredi, accompagnement
// PR-ACCOMPAGNEMENT-J jours), PAL-04 (Confirmé : badge « Relais confirmé » au choix du relais, seul signe montré au
// client, ARL-14 ; proposé en premier ; capacité jusqu'à PR-PAL-CAPACITE-PCT validée à distance ; priorité pour les
// colis dès CODE-PORTEUR), PAL-05 (Premium : le bonus par colis, les étagères et la prime d'ambassadeur sont « après le
// lancement », masqués : ARL-16), PAL-06 / ARL-15 (alerte PR-TRUST-ALERTE points avant chaque seuil).
import { Link } from 'react-router-dom'
import { PLAFOND_PALIER } from '../../calculs/regles20'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { NomPalier, Palier, Trust } from '../../donnees/domaines/qualite'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { Chargement, EcranGerant, ErreurLecture, francs } from './commun'
import { P09, PR } from './parametres'

export default function Paliers() {
  const p = useLecture(() => source.qualite.paliers(), [])
  const tr = useLecture(() => source.qualite.trust(), [])
  const erreur = p.erreur ?? tr.erreur
  return (
    <EcranGerant route="paliers">
      {erreur ? (
        <ErreurLecture
          relire={() => {
            p.relire()
            tr.relire()
          }}
          erreur={erreur}
        />
      ) : !p.donnees || !tr.donnees ? (
        <Chargement lignes={3} />
      ) : (
        <Contenu paliers={p.donnees} d={tr.donnees} />
      )}
    </EcranGerant>
  )
}

/** Position sur l'échelle : Starter à gauche, Confirmé au milieu, Premium à droite (fraction de 0 à 1). */
function position(score: number, confirme: number, premium: number) {
  if (score <= confirme) return (0.5 * Math.max(score, 0)) / confirme
  return Math.min(1, 0.5 + (0.5 * (score - confirme)) / (premium - confirme))
}

function Contenu({ paliers, d }: { paliers: Palier[]; d: Trust }) {
  const { t, tf } = usePreferences()
  const actuel = paliers.find((x) => x.actuel)!
  const rang = paliers.indexOf(actuel)
  const suivant = paliers[rang + 1] ?? null
  const score = d.score
  const f = score === null ? 0 : position(score, PR.paliers.confirme, PR.paliers.premium)
  const repere = (x: Palier, k: number, classes: [string, string, string]) => {
    const [pos, rond, nom] = classes
    const marque = k < rang ? 'p-30m9tj' : k === rang ? 'p-30m9tj' : k === rang + 1 ? 'p-zkkpre' : 'p-to7bp5'
    const libelle = k <= rang ? 'p-j3kuze' : k === rang + 1 ? 'p-6kvdjj' : 'p-s3255x'
    return (
      <div className={pos} key={x.nom}>
        <span className={rond || marque} aria-hidden="true">
          {k === rang ? '●' : x.seuil || '✓'}
        </span>
        <span className={nom || libelle}>{t(x.nom)}</span>
      </div>
    )
  }
  const texte =
    score === null
      ? t('Pas encore de note : votre palier est Starter, dès l’activation.')
      : suivant
        ? d.tenue && score >= suivant.seuil
          ? tf('{s} aujourd’hui · encore {j} jours au-dessus de {seuil} pour passer {p}.', { s: score, j: Math.max(d.tenue.requis - d.tenue.jours, 0), seuil: suivant.seuil, p: t(suivant.nom) })
          : tf('{s} aujourd’hui · encore {e} points pour {p} ({seuil}), à tenir {j} jours.', { s: score, e: suivant.seuil - score, p: t(suivant.nom), seuil: suivant.seuil, j: P09.tenueJours })
        : tf('{s} aujourd’hui · palier le plus haut.', { s: score })
  const garde = actuel.seuil > 0 ? tf('{p} gardé tant que vous ne restez pas {j} jours sous {s}.', { p: t(actuel.nom), j: P09.tenueJours, s: actuel.seuil - P09.margePoints }) : null
  const AVANTAGES: Record<NomPalier, string[]> = {
    Starter: [tf('Colis gardés jusqu’à {v} de valeur', { v: francs(PLAFOND_PALIER.Starter) }), t('Colis petits, moyens et encombrants'), t('Versement chaque vendredi, sans minimum ; 1 % de frais Mobile Money'), tf('Accompagnement renforcé du support les {n} premiers jours', { n: P09.accompagnementJours })],
    Confirmé: [tf('Colis gardés jusqu’à {v} de valeur', { v: francs(PLAFOND_PALIER.Confirmé) }), t('Badge « Relais confirmé » visible au choix du relais (votre score, lui, n’est jamais montré)'), t('Proposé en premier aux clients de votre zone'), tf('Hausse de capacité jusqu’à +{n} % validée à distance, sans attendre une visite', { n: P09.capacitePct }), tf('Colis de plus de {v} orientés en priorité vers vous', { v: francs(PR.porteurPieceDes) })],
    Premium: [tf('Colis gardés jusqu’à {v} de valeur', { v: francs(PLAFOND_PALIER.Premium) }), t('Tous les avantages Confirmé'), t('D’autres avantages Premium seront annoncés après le lancement.')],
  }
  return (
    <div className="p-0hxmj8 r-pile">
      <div>
        <h1 className="p-bvhkrl">{t('Paliers')}</h1>
        <div className="p-t2u0o2">{t('Votre palier suit votre Trust Score, tenu dans la durée.')}</div>
      </div>
      <div className="p-26n637">
        <div className="p-ulwoc3" role="img" aria-label={score === null ? t('Palier Starter, pas encore de note') : tf('Palier {p}, Trust Score {s}', { p: t(actuel.nom), s: score })}>
          <div className="p-p0w3jt" />
          <div className="p-own2ns" style={{ width: `calc((100% - 36px) * ${f.toFixed(3)})` }} />
          {paliers.map((x, k) => repere(x, k, [['p-4ijpis', 'p-iuudl9', 'p-rcnre7'][k], '', '']))}
        </div>
        <div className="p-yz5dyd">
          {texte} {garde}
        </div>
      </div>
      {paliers.map((x, k) => (
        <div className={k === 2 ? 'p-b3ppq5' : 'p-9f8cs4'} key={x.nom}>
          <div className="p-9rmh6y">
            <div className="p-a81pfk">{t(x.nom)}</div>
            <span className={x.actuel ? 'p-rpzy79' : 'p-6z26dm'}>{x.actuel ? t('Votre palier') : x.seuil ? tf('≥ {s} tenu {j} jours', { s: x.seuil, j: P09.tenueJours }) : t('Dès l’activation')}</span>
          </div>
          {AVANTAGES[x.nom].map((a) => (
            <div className="p-gp5yk6" key={a}>
              <Icone nom="check" taille={16} className={k === 2 ? 'p-ejah56' : 'p-l3w6sx'} />
              <span>{a}</span>
            </div>
          ))}
        </div>
      ))}
      <div className="p-p73eax">
        <Icone nom="r-couches" taille={18} className="p-rd23br" />
        <div>{tf('Un palier ne se perd qu’après {j} jours sous le seuil, avec {m} points de marge, et la descente est validée par une personne : vous pouvez la contester une fois. Vous êtes alerté {a} points avant chaque seuil.', { j: P09.tenueJours, m: P09.margePoints, a: PR.alerteSeuilPoints })}</div>
      </div>
      <Link to={chemin('trust')} className="p-rbzobc">
        <Icone nom="r-graphique" taille={18} className="p-emic6i" />
        {t('Voir mon Trust Score')}
      </Link>
    </div>
  )
}
