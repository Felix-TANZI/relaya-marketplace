// Compte suspendu (VD-04, route « suspendu ») — balisage du prototype, branché sur la source (GET /account/status) :
// - carte clé rouge : niveau, « Vos nouvelles commandes sont arrêtées », date, qui a décidé, motif écrit, Trust Score
//   gelé sous le seuil (SUS-02, VD04-R15) ; « Contester cette décision », SEUL bouton plein, dans la carte, avec
//   « Une seule fois · un humain vous répond par écrit sous 72 h ouvrées » ; il disparaît quand une contestation
//   existe (SUS-03) ;
// - ce que le vendeur peut encore faire (préparer les commandes déjà reçues, voir son argent : propriétaire) et ce qui
//   est bloqué (SUS-01) ; « Comment ça marche » : période probatoire (DP-57 L-1), niveaux de sanction ;
// - l'accueil montre ce corps tant que la suspension dure ; la démonstration le montre sur un exemple (la boutique du
//   jeu d'essai n'est pas suspendue), l'en-tête suit alors l'exemple du prototype (pastilles « Compte suspendu »).
import { Link } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { Suspension } from '../../donnees/domaines/accueil'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { heure, jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useMontantsVisibles, useSession } from '../../session'
import { Bouton } from './boutique'
import { ErreurLecture, Squelette } from './commun'

export function CorpsSuspendu({ x }: { x: Suspension }) {
  const { t, tf, langue } = usePreferences()
  const montants = useMontantsVisibles()
  return (
    <>
      <div className="hero red">
        <div className="otop">
          <span className="hk" style={{ color: 'rgba(255,255,255,.85)' }}>
            {tf('Compte suspendu · niveau {n}', { n: x.niveau })}
          </span>
          <Icone nom="shield-alert" taille={20} style={{ color: 'rgba(255,255,255,.85)' }} />
        </div>
        <div className="b8 mt8" style={{ fontSize: '24px', letterSpacing: '-.02em', lineHeight: '1.2' }}>
          {t('Vos nouvelles commandes sont arrêtées')}
        </div>
        <div className="hs">{tf('Depuis le {jour} à {h}.', { jour: jourLong(x.depuis, langue), h: heure(x.depuis, langue) })}</div>
        <div className="hs" style={{ marginTop: '2px' }}>
          {t('Proposée par le système, validée par un membre de l’équipe BelivaY.')}
        </div>
        <div className="hline"></div>
        <div className="t12" style={{ color: 'rgba(255,255,255,.75)', fontWeight: '800', letterSpacing: '.06em', textTransform: 'uppercase' }}>
          {t('Motif écrit')}
        </div>
        <div className="t14 mt6" style={{ lineHeight: '1.5' }}>
          {`${t(x.motif)} ${tf('Votre Trust Score (note de confiance sur 100) est gelé sous {n} pendant la suspension.', { n: x.scoreGeleSous })}`}
        </div>
        {x.contestation ? (
          <div className="t13 mt14 b7" role="status" style={{ padding: '10px 12px', borderRadius: '12px', background: 'rgba(255,255,255,.14)', lineHeight: '1.45' }}>
            {tf('Contestation envoyée le {jour} · un humain vous répond par écrit sous {h} h ouvrées', { jour: jourLong(x.contestation.envoyeeLe, langue), h: x.reponseHeuresOuvrees })}
          </div>
        ) : (
          <>
            <div className="mt14">
              <Bouton classe="white" icone="gavel" vers={chemin('contester', { d: x.decision, depuis: 'suspendu' })}>
                {t('Contester cette décision')}
              </Bouton>
            </div>
            <div className="t13 mt10 center" style={{ color: 'rgba(255,255,255,.85)', lineHeight: '1.45' }}>
              {tf('Une seule fois · un humain vous répond par écrit sous {h} h ouvrées', { h: x.reponseHeuresOuvrees })}
            </div>
          </>
        )}
      </div>
      <div className="card">
        <h3>{t('Ce que vous pouvez encore faire')}</h3>
        <div className="mt8">
          <Link to={chemin('commandes', { f: 'prep' })} className="li">
            <span className="ic green">
              <Icone nom="package-check" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t('Préparer les commandes en cours')}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {x.preparerEnCours === 0
                  ? t('Aucune commande à préparer pour l’instant')
                  : tf(x.preparerEnCours > 1 ? '{n} commandes déjà reçues restent à préparer' : '{n} commande déjà reçue reste à préparer', { n: x.preparerEnCours })}
              </span>
            </span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
          {montants && (
            <Link to={chemin('argent')} className="li">
              <span className="ic green">
                <Icone nom="wallet" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ display: 'block' }}>
                  {t('Voir votre argent')}
                </span>
                <span className="ls" style={{ display: 'block' }}>
                  {t('Votre argent libéré est versé le vendredi, comme d’habitude')}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
          )}
          <Link to={chemin('messages', { fil: 'support' })} className="li">
            <span className="ic green">
              <Icone nom="message-circle" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t('Écrire au support')}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {t('Une question sur la suspension : le fil « Support BelivaY »')}
              </span>
            </span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
        </div>
      </div>
      <div className="card">
        <h3>{t('Ce qui est bloqué')}</h3>
        <div className="mt8">
          {(
            [
              ['Recevoir de nouvelles commandes', 'Vos offres ne sont plus proposées aux clients'],
              ['Publier ou modifier une offre', 'Vos fiches restent en brouillon'],
            ] as const
          ).map(([a, b]) => (
            <div key={a} className="li">
              <span className="ic red">
                <Icone nom="ban" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ display: 'block' }}>
                  {t(a)}
                </span>
                <span className="ls" style={{ display: 'block' }}>
                  {t(b)}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
      <details className="more">
        <summary>
          <Icone nom="info" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">{t('Comment ça marche')}</span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b">
          <p>{tf('Pour revenir : une période probatoire. Le livreur contrôle alors 100 % de vos {n} commandes suivantes au ramassage.', { n: x.controleProbatoire })}</p>
          <p>{t('Il y a 4 niveaux de sanction : avertissement, visibilité réduite, suspension (niveau 3), exclusion.')}</p>
          <p>
            <Link to={chemin('sanctions')} className="b8 cor" style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', minHeight: '44px' }}>
              {t('Voir les niveaux de sanction')}
              <Icone nom="chevron-right" taille={16} />
            </Link>
          </p>
        </div>
      </details>
      {x.exemple && (
        <div className="note ink">
          <Icone nom="info" taille={18} />
          <div>{t('Cet écran remplace l’accueil tant que la suspension dure. Il est montré ici sur un exemple : la boutique du jeu d’essai n’est pas suspendue.')}</div>
        </div>
      )}
    </>
  )
}

export default function Suspendu() {
  const { t } = usePreferences()
  const s = useSession()
  const lecture = useLecture(() => source.accueil.suspension({ exemple: true }).then((x) => ({ x })), [s.membre?.role])
  const x = lecture.donnees?.x ?? null
  return (
    <Ecran route="suspendu" parEtat={!!x?.exemple}>
      {lecture.erreur ? (
        <ErreurLecture erreur={lecture.erreur} relire={lecture.relire} />
      ) : !lecture.donnees ? (
        <Squelette cartes={3} />
      ) : x ? (
        <CorpsSuspendu x={x} />
      ) : (
        <div className="empty" style={{ marginTop: '24px' }}>
          <div className="ei">
            <Icone nom="shield-check" taille={26} />
          </div>
          <h3>{t('Votre compte n’est pas suspendu')}</h3>
          <p>{t('Vos offres sont proposées aux clients et vos commandes arrivent normalement.')}</p>
          <div style={{ maxWidth: '260px', margin: '12px auto 0' }}>
            <Link to={chemin('accueil')} className="btn secondary" style={{ height: '44px' }}>
              <Icone nom="layout-grid" taille={18} />
              <span>{t('Aller à l’accueil')}</span>
            </Link>
          </div>
        </div>
      )}
    </Ecran>
  )
}
