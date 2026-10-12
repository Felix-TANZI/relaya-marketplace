// Les paliers (VD-10, fig. 3) : repris du prototype (route('paliers')), branché sur GET /tiers (domaine paliers).
// - Une carte, un palier par ligne (TierRow, PAL-04) : médaille, nom, « Vous », conditions (registre VD-PAL-*, un palier
//   demande aussi celles d'en dessous : A-6), argent libéré (VD-LIB-*), support ; montant gardé en vert et gain sur le
//   palier actuel, calculés par le service de commission ; la ligne du palier suivant dit ce qui manque et ouvre Mon
//   palier.
// - Ajouts : choix de l'article (ITEL AC52 ou iPhone : les gains selon le prix), barre de position vers le palier
//   suivant, « Comment ça marche » corrigé par les décisions (descente au seuil du palier, DP-21, A-5 ; « Platine tenu
//   6 mois » remplacé par les 14 jours ; support en 2 h pour tous, Q-47).
// - Accès Préparation : conditions et libération sans aucun montant.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Ecran, nomPalier } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { MonPalier } from '../../donnees/domaines/paliers'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useMontantsVisibles, useSession } from '../../session'
import { Attente, HorsLigne, Plus, Segments, SEG_TRUST, useEnLigne, useMontant } from './commun'

const MEDAILLE: Record<string, string> = { Bronze: 'bronze', Argent: 'argent', Or: 'or', Platine: 'platine' }

function Contenu({ d }: { d: MonPalier }) {
  const { t, tf, langue } = usePreferences()
  const montant = useMontant()
  const montants = useMontantsVisibles() && !!d.reference
  const enLigne = useEnLigne()
  const [article, setArticle] = useState<'reference' | 'exemple'>('reference')
  const ex = article === 'exemple' && d.exemple
  const titre = ex ? d.exemple!.titre : d.reference?.titre
  const prix = ex ? d.exemple!.prix : d.reference?.prix
  const actuelGarde = d.paliers.find((p) => p.vous)
  return (
    <Ecran route="paliers">
      <div className="pg">
        <h1 className="pg-t">{t('Les paliers')}</h1>
        <p className="pg-s">{t('Plus votre palier est haut, plus vous gardez sur chaque vente.')}</p>
      </div>
      <Segments items={SEG_TRUST} actif="paliers" />
      {!enLigne && <HorsLigne depuis={d.calculeA} />}
      {montants && d.exemple && (
        <div className="vd10-filtres" role="group" aria-label={t('Article de l’exemple')}>
          <button type="button" className={'chip' + (article === 'reference' ? ' on' : '')} aria-pressed={article === 'reference'} onClick={() => setArticle('reference')}>
            {d.reference!.titre}
          </button>
          <button type="button" className={'chip' + (article === 'exemple' ? ' on' : '')} aria-pressed={article === 'exemple'} onClick={() => setArticle('exemple')}>
            {d.exemple.titre}
          </button>
        </div>
      )}
      <div className="card">
        {montants && titre && prix !== undefined && (
          <div className="row t12 c3 b7" style={{ paddingBottom: '8px' }}>
            <span className="grow">{tf('Pour un {titre} vendu {prix}', { titre, prix: montant(prix) })}</span>
            <span>{t('Vous gardez')}</span>
          </div>
        )}
        {d.paliers.map((p) => {
          const garde = ex ? p.gardeExemple : p.garde
          const gain = garde !== null && actuelGarde && p.gainSurActuel ? garde - ((ex ? actuelGarde.gardeExemple : actuelGarde.garde) ?? 0) : 0
          return (
            <div key={p.palier} className="li" style={{ alignItems: 'flex-start', padding: '14px 0' }}>
              <span className={'medal ' + MEDAILLE[p.palier]}>
                <Icone nom="award" taille={22} />
              </span>
              <span className="grow">
                <span className="row" style={{ gap: '8px' }}>
                  <span className="b8 t17">{nomPalier(p.palier, langue)}</span>
                  {p.vous && <span className="pill or">{t('Vous')}</span>}
                </span>
                <span className="ls" style={{ display: 'block', fontSize: '13px' }}>
                  {t(p.conditions)}
                </span>
                <span className="t12 c3" style={{ display: 'block', marginTop: '5px' }}>
                  {p.liberationJours === 1 ? t('Argent libéré en 1 jour') : tf('Argent libéré en {n} jours', { n: p.liberationJours })}
                  {' · '}
                  {p.responsableDeCompte ? t('un responsable de compte') : tf('support en {n} h', { n: d.supportHeures })}
                </span>
                {p.vous && d.suivant && d.seuilSuivant !== null && (
                  <span className="bar" style={{ display: 'block', marginTop: '8px', height: '6px' }} role="progressbar" aria-valuemin={0} aria-valuemax={d.seuilSuivant} aria-valuenow={Math.round(d.score)} aria-label={tf('{palier} à {seuil}', { palier: nomPalier(d.suivant, langue), seuil: d.seuilSuivant })}>
                    <i style={{ width: `${Math.min(100, (d.score / d.seuilSuivant) * 100).toFixed(1)}%` }}></i>
                  </span>
                )}
                {p.manque && (
                  <Link to={chemin('palier')} className="t13 b8 cor" style={{ display: 'block', padding: '8px 0 4px', lineHeight: '1.4' }}>
                    {t(p.manque) + ' '}
                    <Icone nom="chevron-right" taille={15} style={{ verticalAlign: '-3px' }} />
                  </Link>
                )}
              </span>
              {montants && garde !== null && (
                <span className="right" style={{ flexShrink: '0' }}>
                  <span className="b8 t15 cg nw" style={{ display: 'block' }}>
                    {montant(garde)}
                  </span>
                  {gain > 0 && (
                    <span className="t12 b7 cg nw" style={{ display: 'block', marginTop: '2px' }}>
                      {t(`+${montant(gain)}`)}
                    </span>
                  )}
                </span>
              )}
            </div>
          )
        })}
      </div>
      <Plus titre={t('Comment ça marche')}>
        <p>
          <b>{t('On monte')}</b>
          {tf(' quand toutes les conditions sont tenues {j} jours de suite. Un palier demande aussi les conditions de ceux d’en dessous.', { j: d.montee14 })}
        </p>
        <p>
          <b>{t('On descend')}</b>
          {tf(' si le score reste sous le seuil de votre palier {j} jours de suite. Une personne valide, avec un motif. Vous pouvez contester une fois.', { j: d.descente14 })}
        </p>
        <p>
          <b>{t('Vendeur de remplacement.')}</b>
          {tf(' Quand un autre vendeur est en rupture, seuls ceux à {n} et plus reprennent sa commande.', { n: d.remplacementMin })}
        </p>
        <p>
          <b>{t('Visite et audit.')}</b>
          {t(' L’agent de zone passe en boutique pour l’Or ; le Platine est audité chaque trimestre.')}
        </p>
        <p>{t('Le palier fixe, avec la catégorie, ce que vous gardez et la vitesse de libération. Montants calculés par BelivaY, offre de découverte comprise.')}</p>
      </Plus>
    </Ecran>
  )
}

export default function Paliers() {
  const s = useSession()
  const lecture = useLecture(() => source.paliers.monPalier(), [s.membre?.role])
  return <Attente route="paliers" lecture={lecture}>{(d) => <Contenu d={d} />}</Attente>
}
