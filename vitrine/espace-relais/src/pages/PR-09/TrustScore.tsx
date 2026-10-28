// PR-09 · Trust Score (gérant seul). Structure du prototype gardée : jauge demi-cercle (bleu vers l'accent), score sur
// 100, palier et variation de la semaine, tenue du seuil ; les cinq critères (poids PR-TRUST-POIDS, barre, valeur) et
// le moteur en une phrase (recalcul de nuit, baisse ≤ PR-TS-VARIATION-NUIT, gel après PR-TS-GEL-J jours, dossier en
// cours jamais pénalisé, journal rejouable) ; trois conseils ; alerte « événement grave » (enquête, sanction jamais
// automatique, contestable une fois) ; Avis clients et Paliers ; pas de plafond de valeur par colis (CODE-PORTEUR).
// Enrichi :
// - DP-42, ARL-14 : le score n'est JAMAIS montré au client (le prototype disait « Visible par les clients ») ; seul le
//   badge « Relais confirmé » l'est ;
// - ARL-15, PAL-06 : alerte « seuil proche » dans les deux sens, sans bouton « Contester » (rien n'est décidé) ;
// - TRU-06, TRU-07 : décision proposée ou validée encore contestable en tête, avec son délai ; derniers événements du
//   journal, et la page « Journal du Trust Score » (trust-journal) pour tout voir et contester une fois ;
// - VID-03 : relais neuf, note neutre et aucune note publique ; score gelé (30 jours sans activité, suspension).
import { Link } from 'react-router-dom'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { Trust } from '../../donnees/domaines/qualite'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { echeance, jourCourt, jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useHorloge } from '../../session'
import { CRITERES, Chargement, EcranGerant, ErreurLecture, NIVEAUX, aContester, francs } from './commun'
import { P09, PR } from './parametres'

/** Arc de la jauge : de (20, 100) à l'angle du score, rayon 80 (dessin du prototype). */
function arc(score: number) {
  const a = Math.PI * (1 - Math.min(Math.max(score, 0), 100) / 100)
  return `M20 100 A80 80 0 0 1 ${(100 + 80 * Math.cos(a)).toFixed(1)} ${(100 - 80 * Math.sin(a)).toFixed(1)}`
}

export default function TrustScore() {
  const lec = useLecture(() => source.qualite.trust(), [])
  return <EcranGerant route="trust">{lec.erreur ? <ErreurLecture relire={lec.relire} erreur={lec.erreur} /> : !lec.donnees ? <Chargement lignes={4} /> : <Contenu d={lec.donnees} />}</EcranGerant>
}

function Contenu({ d }: { d: Trust }) {
  const { t, tf, langue } = usePreferences()
  const maintenant = useHorloge()
  const neuf = d.score === null
  const score = d.score ?? 50
  const decisions = d.decisions.filter((x) => aContester(x, maintenant))
  const derniers = d.evenements.slice(0, 3)
  const tenue = d.tenue
  const fini = tenue ? maintenant + Math.max(tenue.requis - tenue.jours, 0) * 86_400_000 : 0
  return (
    <div className="p-0hxmj8 r-pile">
      <div className="p-yi6rkz">
        <div className="p-py0ju2">
          <svg width="240" height="136" viewBox="0 0 200 116" role="img" aria-label={neuf ? t('Trust Score : pas encore de note') : tf('Trust Score {s} sur 100', { s: score })}>
            <defs>
              <linearGradient id="TrustScore-tg" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" className="p-mq57g1" />
                <stop offset="1" className="p-sgynbu" />
              </linearGradient>
            </defs>
            <path d="M20 100 A80 80 0 0 1 180 100" fill="none" strokeWidth="16" strokeLinecap="round" className="p-4qrgzo" />
            {!neuf && <path d={arc(score)} fill="none" stroke="url(#TrustScore-tg)" strokeWidth="16" strokeLinecap="round" />}
            <text x="100" y="92" textAnchor="middle" fontSize="40" fontWeight="800" fontFamily="Plus Jakarta Sans, sans-serif" className="p-6nec68">
              {neuf ? '—' : score}
            </text>
            <text x="100" y="112" textAnchor="middle" fontSize="11" fontWeight="700" fontFamily="Plus Jakarta Sans, sans-serif" className="p-7jr3u4">
              {t('sur 100')}
            </text>
          </svg>
          <div className="p-8fv312">
            <span className="p-rpzy79">{t(d.palier)}</span>
            {!neuf && <span className={d.variationSemaine >= 0 ? 'p-nax3x4' : 'p-ekng8o'}>{tf(d.variationSemaine >= 0 ? '+{n} cette semaine' : '{n} cette semaine', { n: d.variationSemaine })}</span>}
            {d.gele && <span className="p-h4wlx0">{t('Gelé')}</span>}
          </div>
          <div className="p-dwg6gl">
            {t('Jamais montré aux clients : ils voient seulement le badge « Relais confirmé », dès le palier Confirmé.')}
            <br />
            {neuf
              ? t('Note neutre au démarrage : elle bouge avec vos premières remises.')
              : tenue && tenue.palierVise !== d.palier
                ? score >= tenue.seuil
                  ? tf('Au-dessus de {s} depuis {j} jours sur {n} : {p} le {jour}.', { s: tenue.seuil, j: tenue.jours, n: tenue.requis, p: t(tenue.palierVise), jour: jourCourt(fini, langue) })
                  : tf('{p} à {s} : encore {e} points, puis {n} jours de suite.', { p: t(tenue.palierVise), s: tenue.seuil, e: tenue.seuil - score, n: tenue.requis })
                : tenue
                  ? tf('Au-dessus de {s} depuis {j} jours de suite.', { s: tenue.seuil, j: tenue.jours })
                  : null}
          </div>
        </div>
      </div>

      {d.alerte && (
        <div className="p-fht1zk" role="status">
          <Icone nom="r-alerte" taille={18} className="p-lhsznn" />
          <div>
            <strong>{d.alerte.sens === 'descente' ? tf('À {e} points du seuil de {s}.', { e: d.alerte.ecart, s: d.alerte.seuil }) : tf('À {e} points de {s} : le palier suivant est proche.', { e: d.alerte.ecart, s: d.alerte.seuil })}</strong>{' '}
            {d.alerte.sens === 'descente'
              ? tf('Rien n’est décidé : un palier ne se perd qu’après {j} jours à {m} points sous le seuil, et une personne valide la descente.', { j: P09.tenueJours, m: P09.margePoints })
              : tf('Tenez-le {j} jours de suite pour passer au palier suivant.', { j: P09.tenueJours })}
          </div>
        </div>
      )}
      {d.gele && (
        <div className="p-fht1zk" role="status">
          <Icone nom="r-horloge" taille={18} className="p-lhsznn" />
          <div>{tf('Score gelé : il ne bouge plus pendant une suspension, ni après {j} jours sans activité.', { j: P09.gelJours })}</div>
        </div>
      )}

      {decisions.map((x) => (
        <div className={x.niveau && x.niveau >= 2 ? 'p-ga7sqw' : 'p-fht1zk'} role="alert" key={x.id}>
          <Icone nom="r-alerte" taille={18} className={x.niveau && x.niveau >= 2 ? 'p-woejqv' : 'p-lhsznn'} />
          <div className="r9-grandir">
            <strong>
              {x.type === 'descente_palier' ? t('Descente de palier') : tf('Sanction niveau {n} · {l}', { n: x.niveau ?? 1, l: t(NIVEAUX[x.niveau ?? 1]) })}
              {' · '}
              {x.etat === 'proposee' ? t('proposée par le calcul') : t('validée par une personne')}
            </strong>
            <div>{x.motif}</div>
            <div>
              {x.contestation
                ? tf('Contestation en examen : réponse {quand}.', { quand: echeance(x.contestation.reponseAvant, maintenant, langue) })
                : tf('Vous pouvez la contester une fois, jusqu’au {jour}.', { jour: jourLong(x.contestableJusqua!, langue) })}
            </div>
            {!x.contestation && (
              <Link to={chemin('trust-journal', { sheet: 'contester', cible: x.id })} className="p-rbzobc r9-dans-alerte">
                {t('Contester')}
              </Link>
            )}
          </div>
        </div>
      ))}

      <div className="p-yi6rkz">
        <div className="p-unncbq">
          <h2 className="p-9j1bbu">{t('Les 5 critères')}</h2>
        </div>
        {neuf ? (
          <div className="p-81u2s6">{t('Les cinq critères se mesurent dès vos premières remises.')}</div>
        ) : (
          d.criteres.map((c) => (
            <div className="p-jrtuf6" key={c.id}>
              <div>
                <div className="p-h6lji0">
                  <span className="p-dfc4i3">{t(CRITERES[c.id])}</span>
                  <span className="p-46lk2m">{tf('poids {p} %', { p: c.poids })}</span>
                </div>
                <div className="p-gxltj5">
                  <div className="p-47w5eb r9-barre" role="img" aria-label={tf('{c} : {v} sur 100', { c: t(CRITERES[c.id]), v: c.valeur })}>
                    <div className="p-7p6eal" style={{ width: c.valeur + '%' }} />
                  </div>
                </div>
              </div>
              <div className="p-pjprtz">{c.valeur}</div>
            </div>
          ))
        )}
        <div className="p-81u2s6">{t('Ponctualité : colis reçus à l’heure et remis sans attente. Sécurité : scellés contrôlés, photos de remise, aucun colis perdu. Satisfaction : vos avis. Ancienneté : monte avec le temps sans incident.')}</div>
        <div className="p-81u2s6">{tf('Recalcul chaque nuit, baisse de {n} points au plus par recalcul, score gelé après {j} jours sans activité. Un dossier en cours ne vous pénalise jamais. Chaque calcul et chaque décision restent dans un journal consultable.', { n: P09.variationNuit, j: P09.gelJours })}</div>
      </div>

      <div className="p-zmtdxo">
        <div className="p-vdxjav">
          <Icone nom="r-appareil-photo" taille={20} className="p-672m16" />
          <div className="p-zwf4r4">{t('Photo à chaque remise')}</div>
        </div>
        <div className="p-vdxjav">
          <Icone nom="r-horloge" taille={20} className="p-672m16" />
          <div className="p-zwf4r4">{t('Horaires tenus')}</div>
        </div>
        <div className="p-vdxjav">
          <Icone nom="r-message" taille={20} className="p-672m16" />
          <div className="p-zwf4r4">{t('Répondre vite à BelivaY')}</div>
        </div>
      </div>

      <div className="p-yi6rkz">
        <div className="p-unncbq">
          <h2 className="p-9j1bbu">{t('Derniers événements')}</h2>
        </div>
        {derniers.length === 0 && <div className="p-81u2s6">{t('Aucun événement pour l’instant : le journal se remplit avec vos remises.')}</div>}
        {derniers.map((e) => (
          <div className="p-br69f5" key={e.id}>
            <span className={'r9-effet ' + (e.effet > 0 ? 'r9-plus' : e.effet < 0 ? 'r9-moins' : 'r9-neutre')}>{e.effet > 0 ? '+' + e.effet : e.effet === 0 ? '0' : '−' + -e.effet}</span>
            <div className="p-lmo74g">
              <div className="p-dfc4i3">{e.libelle}</div>
              <div className="p-46lk2m">
                {jourCourt(e.le, langue)} · {t(CRITERES[e.critere])}
                {e.objet ? ' · ' : ''}
                {e.objet && <span className="r-ref">{e.objet}</span>}
              </div>
            </div>
          </div>
        ))}
        <Link to={chemin('trust-journal')} className="p-rbzobc">
          <Icone nom="r-historique" taille={18} className="p-emic6i" />
          {t('Tout le journal et contester')}
        </Link>
      </div>

      <div className="p-ga7sqw">
        <Icone nom="r-alerte" taille={18} className="p-woejqv" />
        <div>{t('Un colis perdu ou ouvert au relais ouvre une enquête. Une sanction n’est jamais automatique : proposée par le système, elle est validée par une personne, avec un motif écrit, et vous pouvez la contester une fois.')}</div>
      </div>
      <div className="p-0cipe3">
        <Link to={chemin('avis')} className="p-rbzobc">
          <Icone nom="r-etoile" taille={18} className="p-emic6i" />
          {t('Avis clients')}
        </Link>
        <Link to={chemin('paliers')} className="p-rbzobc">
          <Icone nom="r-couches" taille={18} className="p-emic6i" />
          {t('Paliers')}
        </Link>
      </div>
      <div className="p-gh7puf">
        <Icone nom="r-bouclier" taille={18} className="p-672m16" />
        <div>{tf('Pas de plafond de valeur par colis pour les relais : la protection vient des preuves photo, du PIN de remise et, dès {v}, du porteur nommé par le client avec pièce vérifiée.', { v: francs(PR.porteurPieceDes) })}</div>
      </div>
    </div>
  )
}
