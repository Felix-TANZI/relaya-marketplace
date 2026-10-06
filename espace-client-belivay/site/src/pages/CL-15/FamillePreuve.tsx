// Écran « Preuve de retrait » (CL-15 ; EX-05), forme d'origine du prototype rendue réelle (DP-54) : le retrait d'un
// panier famille (?panier=…&ref=…) : la notification reçue par le payeur, qui a retiré, quand (heure de Yaoundé) et
// où, contre son code ; le panier, le colis, ce qui a été payé ; la même preuve par e-mail ; le code n'est jamais
// envoyé au payeur. Pas encore retiré : le panier en route vers le relais.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { Link, useSearchParams } from 'react-router-dom'
import logo from '../../assets/prototype/0718fddbf299.png'
import { Ecran } from '../../composants/coque'
import { Aside, Colonne } from '../../composants/Gabarits'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { chemin } from '../../config/pages'
import { calculFamille } from '../../donnees/famille'
import { F } from '../../i18n/format'
import { dateA, heureSeule, jourSeul, quand } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { useFamille } from './Commun'
import { FfFamille, kg } from './Famille'

// « e•••••@orange.fr » : l'adresse de la preuve, masquée.
const masquer = (e: string) => e.replace(/^(.)[^@]*(@.*)$/, '$1•••••$2')

export function FamillePreuve() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const [d] = useFamille()
  if (!d) return null
  const p = d.paniers.find((x) => x.id === params.get('panier')) ?? d.paniers.find((x) => x.historique.length)
  const h = p?.historique.find((x) => x.ref === params.get('ref')) ?? p?.historique[0]
  if (!p || !h)
    return (
      <Ecran route="famille-preuve">
        <Styles id="ddcb0e469a" />
        <div className="card mt12">
          <div className="empty">
            <h3>{t('Aucune preuve pour l’instant')}</h3>
            <div className="btns">
              <Link to={chemin('famille')} className="btn primary">
                <span>{t('Panier famille')}</span>
              </Link>
            </div>
          </div>
        </div>
      </Ecran>
    )
  const qui = p.destinataire?.prenom ?? ''
  const relais = t(p.destinataire?.relais ?? '')
  const c = calculFamille(d.articles, p.articles)
  return (
    <Ecran gabarit="colonnes" route="famille-preuve" sousTitre={h.ref}>
      <Colonne>
      <Styles id="ddcb0e469a" />
      <FfFamille />
      {h.retireLe && (
        <div className="lock mt12">
          <div className="t12 b7" style={{ opacity: '.8' }}>
            {jourSeul(h.retireLe, langue)} · {heureSeule(h.retireLe, langue)}
          </div>
          <div className="push">
            <span className="pi">
              <img src={logo} alt="" />
            </span>
            <div className="grow">
              <div className="pt">{tf('BelivaY · {n}', { n: t(p.nom) })}</div>
              <div className="pb">{tf('{p} a retiré le panier au {r}, {d}.', { p: qui.split(' ')[0], r: relais, d: quand(h.retireLe, d.maintenant, langue) })}</div>
            </div>
          </div>
        </div>
      )}
      <div className={'card cl15-dn' + (h.retireLe ? '' : ' mt12')}>
        <div className="cl15-dh">
          <span className={'cl15-di ' + (h.retireLe ? 'green' : 'amber')}>
            <Icone nom={h.retireLe ? 'package-check' : 'truck'} taille={30} trait={2.2} />
          </span>
          <h2>{h.retireLe ? tf('{p} a retiré le panier', { p: qui }) : tf('Le panier part vers {p}', { p: qui })}</h2>
          <div className="s">{tf(h.retireLe ? 'Retiré · {ref}' : 'En route · {ref}', { ref: h.ref })}</div>
          <p className="cl15-p">
            {h.retireLe
              ? tf('{d} (heure de Yaoundé) au {r}, remis contre son code.', { d: dateA(h.retireLe, langue), r: relais })
              : tf('Préparé, puis livré au {r}. Tu reçois la preuve dès que {p} le retire.', { r: relais, p: qui })}
          </p>
        </div>
        <div className="cl15-db">
          <div className="cl15-kv">
            <span className="k">{t('Panier')}</span>
            <span className="v">{tf('{n} · {a} articles', { n: t(p.nom), a: c.lignes.reduce((n, x) => n + x.qte, 0) })}</span>
          </div>
          <div className="cl15-kv">
            <span className="k">{t('Colis')}</span>
            <span className="v">{t(h.retireLe ? '1 sur 1 remis' : '1 colis en route')}</span>
          </div>
          <div className="cl15-kv">
            <span className="k">{t('Poids')}</span>
            <span className="v">{tf('{p} kg · colis {c}', { p: kg(c.poids), c: c.classe })}</span>
          </div>
          <div className="cl15-kv">
            <span className="k">{t('Relais')}</span>
            <span className="v">{relais}</span>
          </div>
          <div className="cl15-kv">
            <span className="k">{t('Payé')}</span>
            <span className="v">{p.carte ? tf('{m} F · {c}', { m: F(h.montant), c: p.carte }) : F(h.montant) + ' F'}</span>
          </div>
        </div>
      </div>
      </Colonne>
      <Aside titre="La suite">
      {p.email && (
        <div className="cl15-inf">
          <Icone nom="mail" taille={17} />
          <span>{tf('Notification non ouverte ? La même preuve part par e-mail à {e}.', { e: masquer(p.email) })}</span>
        </div>
      )}
      <div className="hint-l">
        <Icone nom="lock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t('Le code de retrait n’est jamais envoyé au payeur.')}</span>
      </div>
      {!h.retireLe && (
        <div className="hint-l">
          <Icone nom="clock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{tf('Une fois au relais, {p} a 7 jours pour le retirer ; le premier jour est sans frais de garde.', { p: qui.split(' ')[0] })}</span>
        </div>
      )}
      {/* DP-54 : un article manquant ou abîmé : signalé sous 7 jours après le retrait, remboursé sur la carte. */}
      <div className="card tight mt12">
        <Link to={chemin('fil', { id: 'support', st: 'nouveau' })} className="li">
          <span className="ic">
            <Icone nom="messages-square" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('Un problème avec ce panier')}
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
      <div className="btns">
        <Link to={chemin('famille-mensuel', { panier: p.id })} className="btn secondary">
          <span>{t('Voir le panier du mois')}</span>
        </Link>
      </div>
      </Aside>
    </Ecran>
  )
}
