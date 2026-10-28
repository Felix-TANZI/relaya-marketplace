// Mon score (VD-10, fig. 2) : repris du prototype (route('score')), branché sur GET /score (domaine trust) : valeur
// exacte du service Scores (Q-37), six critères, journal des événements, barème (même table que le moteur, SCO-06).
// - Carte clé : anneau qui se dessine, score qui monte, ce qui le fait monter ou baisser (VD10-R20).
// - « Pourquoi 63 ? » : critère, note, part, points, total exact et arrondi (VD-D11.A07) ; codes g1/g2/g3 jamais
//   montrés : les effets se disent en mots (SCO-05).
// - Ajouts : courbe du score sur 30 jours avec le seuil du palier suivant ; journal des événements filtrable par
//   critère, chaque événement ouvre sa commande ; conseils concrets classés par ce qu'ils peuvent rapporter ; score
//   gelé (inactivité, suspension) ; bandeau hors connexion avec l'heure du dernier calcul.
// - Aucun montant sur cet écran : identique pour l'accès Préparation.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Ecran, nomPalier } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { Aujourdhui } from '../../donnees/domaines/accueil'
import type { MonPalier } from '../../donnees/domaines/paliers'
import type { CleCritere, EffetEvenement, Score as DonneesScore } from '../../donnees/domaines/trust'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { Anneau, Attente, Courbe, dateCourte, dateCourteDe, dateEtHeure, HorsLigne, Plus, Segments, SEG_TRUST, useCompteur, useEnLigne, virgule } from './commun'
import { conseils, Conseils } from './conseils'

const EFFET: Record<EffetEvenement | 'grave_sanction' | 'documents_zero', [string, string]> = {
  succes: ['Succès', 'cg'],
  neutre: ['Neutre', 'c3'],
  aucun: ['Aucun effet', 'c3'],
  leger: ['Échec léger', 'ca'],
  moyen: ['Échec moyen', 'cr'],
  grave: ['Échec grave', 'cr'],
  grave_sanction: ['Échec grave + sanction niveau 2', 'cr'],
  documents_zero: ['Documents à zéro jusqu’au renouvellement', 'cr'],
}

function Journal({ s }: { s: DonneesScore }) {
  const { t, langue } = usePreferences()
  const [filtre, setFiltre] = useState<CleCritere | null>(null)
  const criteres = s.criteres.filter((c) => s.evenements.some((e) => e.critere === c.cle))
  const liste = s.evenements.filter((e) => !filtre || e.critere === filtre)
  return (
    <div className="card">
      <h3>{t('Ce qui a compté')}</h3>
      <p className="t13 c3" style={{ margin: '6px 0 4px' }}>
        {t('Chaque commande, retour ou avis, le plus récent d’abord. Le journal ne change jamais après coup.')}
      </p>
      <div className="vd10-filtres" role="group" aria-label={t('Filtrer par critère')}>
        <button type="button" className={'chip' + (filtre === null ? ' on' : '')} aria-pressed={filtre === null} onClick={() => setFiltre(null)}>
          {t('Tout')}
        </button>
        {criteres.map((c) => (
          <button key={c.cle} type="button" className={'chip' + (filtre === c.cle ? ' on' : '')} aria-pressed={filtre === c.cle} onClick={() => setFiltre(c.cle)}>
            {t(c.nom)}
          </button>
        ))}
      </div>
      <div className="mt8">
        {liste.length === 0 && <p className="t13 c3">{t('Rien pour ce critère sur la période.')}</p>}
        {liste.map((e, i) => {
          const [libelle, ton] = EFFET[e.effet]
          const corps = (
            <>
              <span className="grow">
                <span className="lt" style={{ display: 'block', fontSize: '14px' }}>
                  {e.ref ? `${e.ref} · ${t(e.libelle)}` : t(e.libelle)}
                </span>
                <span className="ls" style={{ display: 'block' }}>
                  {dateCourteDe(e.a, langue)}
                </span>
              </span>
              <span className={'t12 b8 nw ' + ton}>{t(libelle)}</span>
            </>
          )
          return e.ref ? (
            <Link key={i} to={chemin('commande', { ref: e.ref })} className="li" style={{ minHeight: '56px' }}>
              {corps}
            </Link>
          ) : (
            <div key={i} className="li" style={{ minHeight: '56px' }}>
              {corps}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Contenu({ s, palier, jour }: { s: DonneesScore; palier: MonPalier | null; jour: Aujourdhui | null }) {
  const { t, tf, langue } = usePreferences()
  const enLigne = useEnLigne()
  const v = useCompteur(s.total)
  const debut = s.historique[0]
  const ecart = debut ? Math.round((s.total - debut.score) * 10) / 10 : 0
  return (
    <Ecran route="score">
      <div className="pg">
        <h1 className="pg-t">{t('Mon score')}</h1>
        <p className="pg-s">{t('Six critères font votre Trust Score. Voici ce qui le fait bouger.')}</p>
      </div>
      <Segments items={SEG_TRUST} actif="score" />
      {!enLigne && <HorsLigne depuis={s.calculeA} />}
      {s.gele && (
        <div className="note ink">
          <Icone nom="lock" taille={18} />
          <div>
            <b>{t('Score gelé.')}</b> {t('Il ne bouge plus jusqu’à la décision ; BelivaY le revoit avec vous.')}
          </div>
        </div>
      )}
      <div className="card">
        <div className="row">
          <Anneau valeur={s.total} texte={String(Math.round(v))} />
          <div className="grow">
            <div className="b8" style={{ fontSize: '20px' }}>
              {t('Votre Trust Score')}
            </div>
            <div className="t13 c3 mt4">{t('Sur 100 · recalculé chaque nuit')}</div>
            <div className="t12 c3 mt4">{tf('Dernier calcul : {quand}', { quand: dateEtHeure(s.calculeA, langue) })}</div>
          </div>
        </div>
        <div className="mt12"></div>
        <div className="li">
          <span className="ic green">
            <Icone nom="trending-up" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('Ce qui le fait monter')}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {t('Commandes prêtes à l’heure, sans retour ni litige. Avis de 4 ou 5 ★.')}
            </span>
          </span>
        </div>
        <div className="li">
          <span className="ic red">
            <Icone nom="arrow-down-right" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('Ce qui le fait baisser')}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {t('Retard, commande non préparée, retour non conforme, litige perdu. Avis de 1 ou 2 ★.')}
            </span>
          </span>
        </div>
      </div>
      {s.historique.length > 1 && (
        <div className="card">
          <div className="row">
            <h3 className="grow">{t('Votre score sur 30 jours')}</h3>
            <span className={'b8 t14 ' + (ecart >= 0 ? 'cg' : 'cr')}>{t(`${ecart >= 0 ? '+' : '−'}${virgule(Math.abs(ecart))}`)}</span>
          </div>
          <Courbe valeurs={s.historique.map((h) => h.score)} seuil={palier?.seuilSuivant ?? null} legende={[dateCourte(s.historique[0].jour, langue), t('aujourd’hui')]} />
          {palier?.suivant && palier.seuilSuivant !== null && (
            <div className="t12 c3 mt6">
              <span aria-hidden="true" style={{ display: 'inline-block', width: '16px', borderTop: '2px dashed var(--green)', verticalAlign: 'middle', marginRight: '6px' }}></span>{tf('{palier} à {seuil}', { palier: nomPalier(palier.suivant, langue), seuil: palier.seuilSuivant })}
            </div>
          )}
        </div>
      )}
      <div className="card">
        <h3>{t('Vos six critères')}</h3>
        <p className="t13 c3" style={{ margin: '6px 0 4px' }}>
          {t('Chacun a une note sur 100 et compte pour une part du score.')}
        </p>
        {s.criteres.map((c) => (
          <div key={c.cle} style={{ padding: '12px 0', borderTop: '1px solid var(--line)' }}>
            <div className="row">
              <span className="grow">
                <span className="b8 t14">{t(c.nom)}</span>{' '}
                <span className="c3 b6 t12">{t(`· ${c.poids} %`)}</span>
              </span>
              <span className="b8 t15">{t(c.note % 1 ? virgule(c.note) : String(c.note))}</span>
            </div>
            <div className="bar mt8" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={c.note} aria-label={t(c.nom)}>
              <i style={{ width: `${c.note}%` }}></i>
            </div>
            <div className="t12 c3 mt6">{t(c.detail)}</div>
          </div>
        ))}
        <Plus plat icone="circle-help" titre={tf('Pourquoi {n} ?', { n: Math.round(s.total) })}>
          <table className="tbl">
            <tbody>
              <tr>
                <th style={{ fontSize: '12px' }}>{t('Critère')}</th>
                <th className="r" style={{ fontSize: '12px' }}>
                  {t('Note')}
                </th>
                <th className="r" style={{ fontSize: '12px' }}>
                  {t('Part')}
                </th>
                <th className="r" style={{ fontSize: '12px' }}>
                  {t('Points')}
                </th>
              </tr>
              {s.criteres.map((c) => (
                <tr key={c.cle}>
                  <td>{t(c.nom)}</td>
                  <td className="r">{t(c.note % 1 ? virgule(c.note) : String(c.note))}</td>
                  <td className="r">{t(`${c.poids} %`)}</td>
                  <td className="r b8">{t(virgule(c.points))}</td>
                </tr>
              ))}
              <tr>
                <td className="b8">{t('Total')}</td>
                <td></td>
                <td className="r">{t(`${s.criteres.reduce((x, c) => x + c.poids, 0)} %`)}</td>
                <td className="r b8">{t(virgule(s.total))}</td>
              </tr>
            </tbody>
          </table>
          <p className="mt8">{tf('Note × part = points. Le total, {exact}, s’affiche arrondi : {arrondi}.', { exact: virgule(s.total), arrondi: Math.round(s.total) })}</p>
        </Plus>
      </div>
      <Conseils liste={conseils(s, jour, 4)} titre={t('Ce qui fera monter votre score')} sous={t('Le critère qui peut vous rapporter le plus vient en premier.')} />
      <Journal s={s} />
      <Plus titre={t('Comment ça marche')}>
        <p>{t('Chaque commande, retour ou avis compte comme un succès, un échec ou rien.')}</p>
        <table className="tbl" style={{ margin: '4px 0 10px' }}>
          <tbody>
            <tr>
              <th style={{ fontSize: '12px' }}>{t('Événement')}</th>
              <th className="r" style={{ fontSize: '12px' }}>
                {t('Effet')}
              </th>
            </tr>
            {s.bareme.map((b) => (
              <tr key={b.evenement}>
                <td>{t(b.evenement)}</td>
                <td className={'r b8 ' + EFFET[b.effet][1]}>{t(EFFET[b.effet][0])}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>{t('Un succès pèse 1. Un échec léger pèse 1, moyen 2, grave 4. Chaque événement perd la moitié de son poids en 90 jours.')}</p>
        <p>{t('Un litige en cours ne compte pas ; gagné, il est neutre.')}</p>
        <p>{t('Sans activité pendant 30 jours, vos critères sont gelés ; BelivaY les revoit à 90 jours.')}</p>
        <p>{t('Votre score baisse de 8 points au plus par recalcul. Il n’est jamais modifié à la main, et chaque calcul peut être rejoué.')}</p>
      </Plus>
    </Ecran>
  )
}

export default function Score() {
  const s = useSession()
  const lecture = useLecture(() => source.trust.score(), [])
  const palier = useLecture(() => source.paliers.monPalier(), [s.membre?.role])
  const jour = useLecture(() => source.accueil.aujourdhui(), [s.membre?.role])
  return <Attente route="score" lecture={lecture}>{(d) => <Contenu s={d} palier={palier.donnees} jour={jour.donnees} />}</Attente>
}
