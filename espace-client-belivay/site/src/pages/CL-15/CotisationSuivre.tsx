// Écran « Suivre la cotisation » (CL-15 ; EX-02), forme d'origine du prototype rendue réelle (DP-54) : pour
// l'organisateur (?id=…) : réuni, ce qui manque (barre), la date limite et les jours restants ; relancer en
// partageant le lien ; participer soi-même ; chaque participant (montant, date, mot ; « participation discrète »
// sans nom) ; le cadeau au prix figé et le relais ; ce qui se passe à la date limite (commande toute seule, ou
// remboursement de chacun le lendemain). Atteinte ou échue : la page de son état.
// Échanges (DP-54) : qui paie la livraison ; la liste d'envies d'où vient la cotisation ; la jauge qui se remplit.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Aside, Colonne } from '../../composants/Gabarits'
import { useDes } from '../../composants/ecran'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { INTERRUPTEURS_DU_LANCEMENT } from '../../config/interrupteurs'
import { chemin } from '../../config/pages'
import { F } from '../../i18n/format'
import { jourSeul } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { reuni, useCotisations } from './Commun'

export function CotisationSuivre() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const [d] = useCotisations()
  // Dès 1024 px : les participants et le cadeau à gauche ; ce qui est réuni, la date limite et la relance à droite (§ 5.13).
  const grand = useDes('tab-l')
  if (!d) return null
  const c = d.liste.find((x) => x.id === params.get('id')) ?? d.liste.find((x) => x.etat === 'ouverte')
  if (!c) return <Navigate to={chemin('cotisation')} replace />
  if (c.etat !== 'ouverte') return <Navigate to={chemin(c.etat === 'atteinte' || c.etat === 'hausse' ? 'cotisation-atteinte' : 'cotisation-echue', { id: c.id })} replace />
  const r = reuni(c)
  const jours = Math.max(0, Math.ceil((c.jusqua - d.maintenant) / 864e5))
  const progression = (
    <>
    <div className="card cl15-pc">
      <div className="cl15-pb">
        <b>
          {F(r)}
          <small>{t('F')}</small>
        </b>
        <span>
          {tf('sur {o} F · ', { o: F(c.objectif) })}
          <b>{tf('il manque {m} F', { m: F(Math.max(0, c.objectif - r)) })}</b>
        </span>
      </div>
      <div className="bar cl15-bar">
        <i style={{ width: `${Math.min(100, Math.round((r / c.objectif) * 100))}%` }}></i>
      </div>
      <div className="note amber">
        <Icone nom="clock" taille={18} />
        <div>
          {t('Date limite le ')}
          <b>{jourSeul(c.jusqua, langue)}</b>
          {tf(jours > 1 ? ', dans {n} jours' : jours === 1 ? ', dans {n} jour' : ', aujourd’hui', { n: jours })}
        </div>
      </div>
    </div>
    <div className="btns">
      <Link to={chemin('cotisation-partager', { id: c.id })} className="btn primary">
        <Icone nom="share" taille={18} />
        <span>{t('Relancer : partager le lien')}</span>
      </Link>
    </div>
    <div className="links cl15-lk">
      <Link to={chemin('cotisation-participer', { c: c.code })}>{t('Participer moi aussi')}</Link>
    </div>
    </>
  )
  return (
    <Ecran gabarit="colonnes" route="cotisation-suivre" sousTitre={c.nom}>
      <Colonne>
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
      {!grand && progression}
      <div className="sec">
        <h2>{tf('Participants · {n}', { n: c.participations.length })}</h2>
      </div>
      <div className="card tight">
        {c.participations.map((p) => (
          <div key={p.id} className="li">
            <span className={'ic ' + (p.discret ? '' : 'or')}>
              <Icone nom={p.discret ? 'eye-off' : 'user-round'} taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {p.discret ? t('Participation discrète') : p.organisateur ? tf('{p} (toi)', { p: p.prenom }) : p.prenom}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {jourSeul(p.le, langue)}
                {p.discret ? ' · ' + t('nom caché à tous') : p.mot ? ` · « ${p.mot} »` : ''}
              </span>
            </span>
            <span className="rv">{F(p.montant)} F</span>
          </div>
        ))}
        {!c.participations.length && (
          <div className="li">
            <span className="ic ">
              <Icone nom="users" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t('Personne n’a encore participé : partage le lien.')}
              </span>
            </span>
          </div>
        )}
      </div>
      <div className="card ">
        <div className="row">
          <Link to={chemin('fiche', { p: c.p })} className="thumb" style={{ width: '56px', height: '56px', borderRadius: '14px' }} aria-label={t(c.titre)}>
            <Dessin id={c.dessin} />
          </Link>
          <div className="grow">
            <div className="t15 b8" style={{ lineHeight: '1.3' }}>
              {t(c.titre)}
            </div>
            <div className="t13 c3 mt4">{tf('Prix livré figé : {m} F · {r}', { m: F(c.prixLivre), r: t(c.relais) })}</div>
          </div>
        </div>
        <div className="kv mt8">
          <span className="k">{t('Livraison')}</span>
          <span className="v ">{c.qui === 'destinataire' ? tf('{b} la paie au retrait ({m} F)', { b: c.beneficiaire, m: F(c.frais ?? 0) }) : t('dans l’objectif')}</span>
        </div>
        {c.liste && (
          <div className="links">
            <Link to={chemin('liste-publique', { l: c.liste.code })}>{tf('Voir la liste de {b}', { b: c.beneficiaire })}</Link>
          </div>
        )}
      </div>
      <div className="sec">
        <h2>{t('À la date limite')}</h2>
      </div>
      <div className="card tight">
        <div className="li">
          <span className="ic green">
            <Icone nom="gift" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('Objectif atteint')}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {tf('La commande part toute seule, au prix figé, vers le {r}', { r: t(c.relais) })}
            </span>
          </span>
        </div>
        <div className="li">
          <span className="ic ">
            <Icone nom="undo-2" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('Objectif non atteint')}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {tf('Chacun est remboursé le {d}, sans frais, jamais en espèces', { d: jourSeul(c.jusqua + 864e5, langue) })}
            </span>
          </span>
        </div>
      </div>
      </Colonne>
      {grand && (
        <Aside titre="Ce qui est réuni">
          {progression}
        </Aside>
      )}
    </Ecran>
  )
}
