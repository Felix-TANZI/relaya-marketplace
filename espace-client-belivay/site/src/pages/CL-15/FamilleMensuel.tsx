// Écran « Panier chaque mois » (CL-15 ; EX-05), forme d'origine du prototype rendue réelle (DP-54) : le panier
// (?panier=…) : le prochain débit (date, annonce 3 jours avant, montant au prix du jour ≈ en euros) ; dans les 3 jours
// qui précèdent le débit, l'annonce reçue (notification) et le récapitulatif du débit ; suspendu : aucun débit, panier
// et carte gardés ; pour qui et à quel relais, la carte (3-D Secure à chaque débit), le contenu (modifiable jusqu'au
// débit) ; suspendre ou réactiver en un geste ; l'historique et la preuve de chaque retrait.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { Link, useSearchParams } from 'react-router-dom'
import logo from '../../assets/prototype/0718fddbf299.png'
import { Ecran } from '../../composants/coque'
import { Aside, Colonne } from '../../composants/Gabarits'
import { useDes } from '../../composants/ecran'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { chemin } from '../../config/pages'
import { calculFamille, FAMILLE } from '../../donnees/famille'
import { source } from '../../donnees/source'
import { F } from '../../i18n/format'
import { dateA, heureSeule, jourSeul } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { EURO } from '../CL-12/Diaspora'
import { useFamille } from './Commun'
import { FfFamille, kg } from './Famille'

function prochainDebit(jour: number, maintenant: number): number {
  const d = new Date(maintenant)
  let x = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), jour, 7)
  if (x <= maintenant) x = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, jour, 7)
  return x
}
const JOUR = 864e5

export function FamilleMensuel() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const [d, recharger] = useFamille()
  // Dès 1024 px : l’échéance et l’historique à gauche ; qui retire, la carte, le colis et les gestes à droite (§ 5.13).
  const grand = useDes('tab-l')
  if (!d) return null
  const p = d.paniers.find((x) => x.id === params.get('panier')) ?? d.paniers.find((x) => x.historique.length)
  if (!p)
    return (
      <Ecran route="famille-mensuel">
        <Styles id="ddcb0e469a" />
        <div className="card mt12">
          <div className="empty">
            <h3>{t('Aucun panier famille')}</h3>
            <div className="btns">
              <Link to={chemin('famille')} className="btn primary">
                <span>{t('Composer un panier')}</span>
              </Link>
            </div>
          </div>
        </div>
      </Ecran>
    )
  const c = calculFamille(d.articles, p.articles)
  const frais = Math.round(c.total * FAMILLE.fraisCarte)
  const montant = c.total + frais
  const euros = (m: number) => (m / EURO).toFixed(2).replace('.', ',') + ' €'
  const dernier = p.historique[0]?.montant ?? montant
  const debit = prochainDebit(p.jour, d.maintenant)
  const annonce = debit - 3 * JOUR
  // L'annonce est faite : les trois jours avant le débit.
  const preavis = p.mensuel && !p.suspendu && d.maintenant >= annonce
  const ecart = montant - dernier
  const ecartTexte = (ecart > 0 ? '+' : '−') + F(Math.abs(ecart)) + ' F'
  const nArticles = c.lignes.reduce((a, x) => a + x.qte, 0)
  const ligne = (ic: string, couleur: string, a: string, b: string) => (
    <div className="li">
      <span className={'ic ' + couleur}>
        <Icone nom={ic} taille={20} />
      </span>
      <span className="grow">
        <span className="lt" style={{ display: 'block' }}>
          {a}
        </span>
        <span className="ls" style={{ display: 'block' }}>
          {b}
        </span>
      </span>
    </div>
  )
  const gestion = (
    <>
    <div className="card tight">
      {p.destinataire && ligne('user-round', 'or', tf('Pour {p}', { p: p.destinataire.prenom }), tf('{r} · elle reçoit le code', { r: t(p.destinataire.relais) }))}
      {ligne('credit-card', '', p.carte ?? t('Carte à saisir au paiement'), t('3-D Secure à chaque débit'))}
      {ligne('package', '', tf('{n} articles · {k} kg · 1 colis {c}', { n: nArticles, k: kg(c.poids), c: c.classe }), t('Modifiable jusqu’au débit'))}
    </div>
    {p.mensuel && (
      <div className="btns">
        <button type="button" className={'btn ' + (p.suspendu ? 'primary' : 'secondary')} onClick={async () => (await source.suspendrePanierFamille(p.id, !p.suspendu), recharger())}>
          <Icone nom={p.suspendu ? 'rotate-ccw' : 'circle-pause'} taille={18} />
          <span>{t(p.suspendu ? 'Réactiver le panier' : 'Suspendre en un geste')}</span>
        </button>
      </div>
    )}
    {!p.suspendu && (
      <div className="links cl15-lk">
        <Link to={chemin('famille', { panier: p.id })}>{t('Modifier les articles')}</Link>
        <Link to={chemin('famille-destinataire', { panier: p.id })}>{t('Changer qui retire')}</Link>
        {!p.mensuel && <Link to={chemin('famille-payer', { panier: p.id })}>{t('Payer à nouveau')}</Link>}
      </div>
    )}
    </>
  )
  return (
    <Ecran gabarit="colonnes" route="famille-mensuel">
      <Colonne>
      <Styles id="ddcb0e469a" />
      <FfFamille />
      {preavis ? (
        <>
          <div className="lock mt12">
            <div className="t12 b7" style={{ opacity: '.8' }}>
              {jourSeul(annonce, langue)} · {heureSeule(annonce, langue)}
            </div>
            <div className="push">
              <span className="pi">
                <img src={logo} alt="" />
              </span>
              <div className="grow">
                <div className="pt">{tf('BelivaY · {n}', { n: t(p.nom) })}</div>
                <div className="pb">
                  {ecart ? tf('Le {d}, ton panier coûtera {m} F ({e}). Suspends-le si besoin.', { d: jourSeul(debit, langue), m: F(montant), e: ecartTexte }) : tf('Le {d}, ton panier coûtera {m} F, comme le mois dernier. Suspends-le si besoin.', { d: jourSeul(debit, langue), m: F(montant) })}
                </div>
              </div>
            </div>
          </div>
          <div className="card cl15-sum">
            <div className="cl15-k o">{t('Récapitulatif')}</div>
            <div className="cl15-r">
              <span className="lb">{tf('Articles · {n}', { n: nArticles })}</span>
              <span className="v">{F(c.sousTotal)}&nbsp;F</span>
            </div>
            {c.supplement > 0 && (
              <div className="cl15-r">
                <span className="lb">{tf('Remise du colis {c}, non couverte', { c: c.classe })}</span>
                <span className="v">{F(c.supplement)}&nbsp;F</span>
              </div>
            )}
            <div className="cl15-r">
              <span className="lb">{t('Frais de service carte (2 %)')}</span>
              <span className="v">{F(frais)}&nbsp;F</span>
            </div>
            <div className="cl15-tot">
              <span className="l">{tf('Débit du {d}', { d: jourSeul(debit, langue) })}</span>
              <span className="rt">
                <span className="price">
                  {F(montant)}
                  <small>{t(' F')}</small>
                </span>
                <small className="eur">≈ {euros(montant)}</small>
              </span>
            </div>
            <div className="hint-l">
              <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
              <span>{t('Les prix sont recalculés à chaque renouvellement ; toute hausse t’est annoncée avant le débit.')}</span>
            </div>
          </div>
        </>
      ) : p.suspendu ? (
        <div className="card cl15-pc">
          <div className="cl15-now">
            <span className="cl15-k" style={{ color: 'var(--ink-3)' }}>
              <Icone nom="circle-pause" taille={16} />
              {tf('{n} · suspendu', { n: t(p.nom) })}
            </span>
          </div>
          <div className="cl15-t">{tf('Aucun débit le {d}', { d: jourSeul(debit, langue) })}</div>
          <p className="cl15-p">{t('Ton panier et ta carte sont gardés. Tu le réactives quand tu veux.')}</p>
        </div>
      ) : p.mensuel ? (
        <div className="card or cl15-pc">
          <div className="cl15-now">
            <span className="cl15-k">
              <Icone nom="calendar-sync" taille={16} />
              {tf('{n} · chaque mois', { n: t(p.nom) })}
            </span>
          </div>
          <div className="cl15-t">{tf('Prochain panier le {d}', { d: jourSeul(debit, langue) })}</div>
          <p className="cl15-p">
            {t('Annoncé le ')}
            <b>{jourSeul(annonce, langue)}</b>
            {t(' avec le prix du jour. Montant actuel : ')}
            <b>{F(montant)}&nbsp;F</b> ({euros(montant)}).
            {ecart !== 0 && ' ' + tf('({e} F par rapport au dernier débit)', { e: (ecart > 0 ? '+' : '−') + F(Math.abs(ecart)) })}
          </p>
        </div>
      ) : (
        <div className="card cl15-pc">
          <div className="cl15-now">
            <span className="cl15-k">
              <Icone nom="package" taille={16} />
              {tf('{n} · une fois', { n: t(p.nom) })}
            </span>
          </div>
          <div className="cl15-t">{p.historique[0] ? tf('Payé le {d}', { d: jourSeul(p.historique[0].le, langue) }) : t('Pas encore payé')}</div>
          <p className="cl15-p">
            {t('Montant actuel : ')}
            <b>{F(montant)}&nbsp;F</b> ({euros(montant)}).
          </p>
        </div>
      )}
      {!grand && gestion}
      {p.historique.length > 0 && (
        <>
          <div className="sec">
            <h2>{t('Historique')}</h2>
          </div>
          <div className="card tight">
            {p.historique.map((h) => (
              <Link key={h.ref} to={chemin('famille-preuve', { panier: p.id, ref: h.ref })} className="li">
                <span className={'ic ' + (h.retireLe ? 'green' : '')}>
                  <Icone nom={h.retireLe ? 'package-check' : 'truck'} taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ display: 'block' }}>
                    {jourSeul(h.le, langue)} · {F(h.montant)}&nbsp;F
                  </span>
                  <span className="ls" style={{ display: 'block' }}>
                    {h.retireLe ? tf('Retiré par {p} le {d}', { p: p.destinataire?.prenom ?? '', d: dateA(h.retireLe, langue) }) : tf('{ref} · en route vers le relais', { ref: h.ref })}
                  </span>
                </span>
                <span className="chev">
                  <Icone nom="chevron-right" taille={18} />
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
      {/* DP-54 : un problème avec un panier reçu : la même protection que toute commande. */}
      <div className="card tight mt12">
        <Link to={chemin('fil', { id: 'support', st: 'nouveau' })} className="li">
          <span className="ic">
            <Icone nom="messages-square" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('Un problème avec un panier')}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {t('Article manquant ou abîmé : signalé sous 7 jours, remboursé sur la carte qui a payé')}
            </span>
          </span>
          <span className="chev">
            <Icone nom="chevron-right" taille={18} />
          </span>
        </Link>
      </div>
      {!preavis && <div className="cl15-fine">{t('Les prix sont recalculés à chaque renouvellement ; toute hausse t’est annoncée avant le débit.')}</div>}
      </Colonne>
      {grand && (
        <Aside titre="Ce panier">
          {gestion}
        </Aside>
      )}
    </Ecran>
  )
}
