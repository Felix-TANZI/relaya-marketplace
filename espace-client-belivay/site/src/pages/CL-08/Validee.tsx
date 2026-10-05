// Écran « Commande validée — paiement au comptoir » (CL-08), forme d'origine du prototype rendue réelle (DP-54) :
// le reçu de la commande (?ref=…) dont la livraison est payée d'avance : numéro, montant payé, moyen, date,
// articles, montant dû au retrait ; le reste se paie au retrait, en Mobile Money sur le téléphone, jamais en
// espèces ; le relais (gérant, horaires, jour de fermeture), le jour du retrait et les colis ; suivre la
// commande ; « Comment ça marche » : garde et refus au comptoir (DP-24).
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { useDes } from '../../composants/ecran'
import { Aside, Colonne } from '../../composants/Gabarits'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { F } from '../../i18n/format'
import { dateHeure, heureSeule, jourSeul } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { BlocRetrait, CommandeIntrouvable, LigneMoyen, LiensRecu, useRecu } from './Confirmee'

export function Validee() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const { c, suivi, relais } = useRecu(params.get('ref'))
  // Dès 1024 px (§ 5.7) : le reçu à gauche ; le relais, l'heure où c'est prêt et « Suivre ma commande » dans l'aside.
  const tabL = useDes('tab-l')
  if (c === undefined) return null
  if (!c) return <CommandeIntrouvable route="validee" />
  const pret = suivi?.commande.pretLe ?? null
  const gerant = relais?.gerant ?? t('Le gérant')
  const retrait = (
    <BlocRetrait
      c={c}
      relais={relais}
      detail={relais ? tf('t’attend au {l} · ouvert {h}, fermé le {f}', { l: t(relais.nom), h: t(relais.horaires), f: t(relais.ferme) }) : undefined}
      colis={c.colis > 1 ? tf('{n} colis', { n: c.colis }) : t('1 colis')}
      quandBloc={
        <div className="cl08-when">
          <span className="k">
            {t('Retrait possible le')}
            {pret && <small>{tf('dès {h}', { h: heureSeule(pret, langue) })}</small>}
          </span>
          <span className="cl08-cd">{pret ? jourSeul(pret, langue) : '—'}</span>
        </div>
      }
    />
  )
  const suivre = (
    <div className="btns mt14">
      <Link to={chemin('suivi', { ref: c.ref })} className="btn primary">
        <span>{t('Suivre ma commande')}</span>
      </Link>
    </div>
  )
  return (
    <Ecran route="validee" gabarit="colonnes">
      <Colonne>
        <div className="card cl08-rc">
          <Link to={chemin('accueil')} className="cl08-x" aria-label={t('Fermer')}>
            <Icone nom="x" taille={22} />
          </Link>
          <div className="cl08-rh">
            <div className="cl08-sq or">
              <Icone nom="check" taille={30} trait={2.6} />
            </div>
            <h1>{t('Commande validée')}</h1>
            <div className="s">
              <b>{tf('{m} F payés', { m: F(c.montant) })}</b>
              {t(' · le reste se paie au retrait en Mobile Money')}
            </div>
            <div className="s">
              {t('Commande n° ')}
              <b>{c.ref}</b>
            </div>
          </div>
          <div className="cl08-dash"></div>
          <div className="cl08-ln">
            <span className="k">{t('Livraison payée d’avance')}</span>
            <span className="v">{F(c.montant)}&nbsp;F</span>
          </div>
          <LigneMoyen c={c} />
          <div className="cl08-ln">
            <span className="k">{t('Date')}</span>
            <span className="v">{dateHeure(c.le, langue)}</span>
          </div>
          {c.lignes.map((l, i) => (
            <div key={i} className="cl08-ln">
              <span className="k">{c.lignes.length > 1 ? tf('Article {n}', { n: i + 1 }) : t('Article')}</span>
              <span className="v">
                {t(l.titre)}
                {l.qte > 1 ? ' × ' + l.qte : ''}
              </span>
            </div>
          ))}
          <div className="cl08-ln">
            <span className="k">{t('Montant dû au retrait')}</span>
            <span className="v">
              <span className="cl08-amt">{F(c.dueAuRetrait)}&nbsp;F</span>
            </span>
          </div>
          <div className="note ink">
            <Icone nom="lock" taille={18} />
            <div>
              {t('Au comptoir, tu paies ce montant sur ton téléphone. ')}
              <b>{t('Ton code de retrait se débloque dès ce paiement.')}</b>
            </div>
          </div>
          {!tabL && retrait}
        </div>
        {!tabL && suivre}
        <details className="more">
          <summary>
            <Icone nom="info" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
            <span className="grow">{t('Comment ça marche')}</span>
            <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
          </summary>
          <div className="more-b">
            <p>
              <b>{t('Zéro espèce.')}</b>
              {tf(' Au comptoir, la demande de paiement arrive sur ton téléphone. {g} n’encaisse rien.', { g: gerant })}
            </p>
            <p>
              <b>{t('Garde.')}</b>
              {t(' Gratuite le jour de l’arrivée ; puis 100 F par jour aux 2e, 3e et 4e jours, 200 F le 5e, 500 F le 6e et 1 000 F le 7e. Elle s’ajoute au montant dû.')}
            </p>
            <p>
              <b>{t('Refus au comptoir.')}</b>
              {tf(' Le colis repart chez le vendeur. Les {m} F de livraison ne sont pas remboursés ; la garde déjà comptée est prise sur ces {m} F, jamais au-delà.', { m: F(c.montant) })}
            </p>
            <p>
              <b>{t('Après deux refus')}</b>
              {t(' au comptoir, tes commandes se paient d’avance, définitivement.')}
            </p>
            <p>
              <b>{t('Le vendeur')}</b>
              {t(' prépare comme d’habitude. Ton argent est protégé dès ton paiement sur place : le vendeur n’est payé qu’après ton retrait.')}
            </p>
          </div>
        </details>
        <div className="card cl08-help mt14">
          <div className="cl08-kl">{t('Le jour du retrait')}</div>
          <ul className="cl08-dots">
            <li>{tf('Viens avec ton téléphone : la demande de {m} F arrive sur ton compte Mobile Money, au comptoir.', { m: F(c.dueAuRetrait) })}</li>
            <li>{tf('Vérifie avant de venir que ton solde couvre {m} F, plus la garde si tu passes après le jour de l’arrivée.', { m: F(c.dueAuRetrait) })}</li>
            <li>{t('Ton code de retrait se débloque dès ce paiement validé : le gérant te remet alors tes colis.')}</li>
            <li>{t('Après le retrait, tu as 7 jours pour signaler un problème : ton argent reste bloqué pendant ce temps.')}</li>
          </ul>
        </div>
        <LiensRecu c={c} />
        <div className="links">
          <Link to={chemin('accueil')}>{t('Continuer mes achats')}</Link>
        </div>
      </Colonne>
      {tabL && (
        <Aside titre="Retrait" classe="cf-aside">
          <div className="card">{retrait}</div>
          {suivre}
        </Aside>
      )}
    </Ecran>
  )
}
