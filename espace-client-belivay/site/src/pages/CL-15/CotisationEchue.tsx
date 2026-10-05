// Écran « Objectif non atteint » (CL-15 ; EX-02), forme d'origine du prototype rendue réelle (DP-54) : la date
// limite passée (ou le remboursement choisi après une hausse de prix), la date du remboursement, ce qui avait été
// réuni, chaque remboursement sur son moyen (frais de carte rendus), le total rendu, jamais en espèces ; créer une
// nouvelle cotisation pour le même cadeau.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { INTERRUPTEURS_DU_LANCEMENT } from '../../config/interrupteurs'
import { chemin } from '../../config/pages'
import { F } from '../../i18n/format'
import { jourSeul } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { reuni, useCotisations } from './Commun'

export function CotisationEchue() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const [d] = useCotisations()
  if (!d) return null
  const c = d.liste.find((x) => x.id === params.get('id')) ?? d.liste.find((x) => x.etat === 'echue' || x.etat === 'remboursee')
  if (!c) return <Navigate to={chemin('cotisation')} replace />
  if (c.etat === 'ouverte') return <Navigate to={chemin('cotisation-suivre', { id: c.id })} replace />
  if (c.etat === 'atteinte' || c.etat === 'hausse') return <Navigate to={chemin('cotisation-atteinte', { id: c.id })} replace />
  const rendu = c.participations.reduce((n, p) => n + p.montant + p.frais, 0)
  return (
    <Ecran route="cotisation-echue" gabarit="centre" sousTitre={c.nom}>
      <Styles id="ddcb0e469a" />
      {!INTERRUPTEURS_DU_LANCEMENT['FF-EX02'] && (
        <div className="cl15-ff">
          <span className="cl15-pill">
            <Icone nom="lock" taille={13} />
            {t('Après le lancement · interrupteur fermé')}
          </span>
          <span className="cl15-ex">{t('EX-02')}</span>
        </div>
      )}
      <div className="card cl15-dn">
        <div className="cl15-dh">
          <span className="cl15-di amber">
            <Icone nom="undo-2" taille={30} trait={2.2} />
          </span>
          <h2>{t(c.etat === 'echue' ? 'Objectif non atteint' : 'Cotisation remboursée')}</h2>
          <div className="s">{c.etat === 'echue' ? tf('Date limite dépassée · {d}', { d: jourSeul(c.jusqua, langue) }) : t('Remboursement choisi')}</div>
          <p className="cl15-p">
            {t('Chacun a été remboursé le ')}
            <b>{jourSeul(c.fin ?? c.jusqua, langue)}</b>
            {t(' sur son moyen de paiement, sans frais. Rien à faire.')}
          </p>
        </div>
        <div className="cl15-db">
          <div className="cl15-kv">
            <span className="k">{t('Réuni')}</span>
            <span className="v">{tf('{r} F sur {o} F', { r: F(reuni(c)), o: F(c.objectif) })}</span>
          </div>
        </div>
      </div>
      <div className="sec">
        <h2>{tf('Remboursements · {n}', { n: c.participations.length })}</h2>
      </div>
      <div className="card tight">
        {c.participations.map((p) => (
          <div key={p.id} className="li">
            <span className="ic green">
              <Icone nom="undo-2" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {p.discret ? t('Participation discrète') : p.organisateur ? tf('{p} (toi)', { p: p.prenom }) : p.prenom}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {tf('Remboursé · {m}', { m: t(p.moyen) })}
                {p.frais ? ' · ' + t('frais de carte rendus') : ''}
              </span>
            </span>
            <span className="rv">{F(p.montant + p.frais)} F</span>
          </div>
        ))}
      </div>
      <div className="card cl15-sum">
        <div className="cl15-tot solo">
          <span className="l">{t('Total rendu')}</span>
          <span className="rt">
            <span className="price">
              {F(rendu)}
              <small>{t(' F')}</small>
            </span>
          </span>
        </div>
      </div>
      <div className="cl15-inf">
        <Icone nom="banknote" taille={17} />
        <span>{t('Aucune somme ne sort en espèces : l’argent revient là d’où il est parti.')}</span>
      </div>
      <div className="btns">
        <Link to={chemin('cotisation', { p: c.p })} className="btn secondary">
          <span>{t('Créer une nouvelle cotisation')}</span>
        </Link>
      </div>
    </Ecran>
  )
}
