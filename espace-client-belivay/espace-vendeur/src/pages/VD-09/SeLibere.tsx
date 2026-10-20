// Se libère — quand (VD-09) : repris du prototype (route('se_libere')), branché sur la source (GET /money/releasing).
// - Une carte nuit par commande (LIB-01, VD09-R14) : temps restant vivant (heure du serveur), barre réelle
//   (progressionPourCent de src/calculs : (maintenant − fermeture) ÷ (libération − fermeture), VD09-R12, REFVD-R67),
//   « Confirmée … » et « Libérée … » en mots simples (VD09-R13), « Vous gardez » et le vendredi du versement ; à
//   l'heure de la libération, l'écran relit la source : la somme passe « à verser » ;
// - Le délai du palier en une ligne (LIB-03, lu dans les paramètres), la grille complète dans « Comment ça marche » ;
// - En cours (payée, pas encore retirée) vers la commande ; règle du gel en rouge (LIB-02) ;
// - Œil des montants (DP-52), hors connexion, accès Préparation verrouillé (ARG-04).
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTirerPourActualiser } from '@client/composants/Animations'
import { jouer } from '@client/composants/Sons'
import { Chiffres } from '@client/composants/Chrono'
import { Ecran, nomPalier } from '../../composants/coque'
import { Vignette } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { SeLibere as DonneesSeLibere } from '../../donnees/domaines/argent'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { progressionPourCent } from '../../calculs/versements'
import { heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useHorloge } from '../../session'
import { Aide, AvecDonnees, BandeauHorsLigne, CommentCaMarche, Oeil, Onglets, jourCourtMois, jourLongMois, numeroLisible, quand, reste, useMontant } from './commun'

const jours = (n: number, tf: (m: string, v: Record<string, string | number>) => string) => tf(n > 1 ? '{n} jours' : '{n} jour', { n })

function Contenu({ d, relire }: { d: DonneesSeLibere; relire: () => void }) {
  const { t, tf, langue } = usePreferences()
  const maintenant = useHorloge(15_000)
  const m = useMontant()
  useTirerPourActualiser(relire)
  // À l'heure exacte de la prochaine libération, la source est relue : la somme passe « à verser ».
  const prochaine = d.cartes[0]?.liberation
  useEffect(() => {
    if (!prochaine) return
    const dans = prochaine - maintenant
    if (dans <= 0 || dans > 2 ** 31 - 1) return
    const id = setTimeout(() => {
      jouer('retrait')
      relire()
    }, dans + 500)
    return () => clearTimeout(id)
  }, [prochaine, maintenant, relire])
  const numero = `${d.numero.operateur} ${numeroLisible(d.numero.masque)}`
  const delai = d.palier === 'Or' || d.palier === 'Platine' ? d.delais.or : d.delais.standard
  return (
    <>
      {d.cartes.length === 0 && (
        <div className="card">
          <div className="empty" style={{ padding: '18px 4px 4px' }}>
            <div className="ei">
              <Icone nom="hourglass" taille={26} />
            </div>
            <h3>{t('Rien ne se libère en ce moment')}</h3>
            <p>{t('Dès qu’un client confirme « Tout est en ordre », ou 7 jours après le retrait, la vente apparaît ici avec son compte à rebours.')}</p>
          </div>
        </div>
      )}
      {d.cartes.map((c, i) => {
        const pc = progressionPourCent(c.fermeture, c.liberation, maintenant)
        const fini = c.liberation <= maintenant
        return (
          <div key={c.ref} className="hero night" data-ref={c.ref}>
            <div className="otop">
              <div className="hk">{`${c.ref} · ${c.article.titre}`}</div>
              {i === 0 && <Oeil clair style={{ margin: '-10px -10px -10px 0' }} />}
            </div>
            <div className="big" role="timer" aria-live="off">
              {fini ? t('Libérée') : <Chiffres texte={reste(c.liberation - maintenant, langue)} />}
              {!fini && <small>{t('restantes')}</small>}
            </div>
            <div className="bar mt10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pc} aria-label={t('Délai de sécurité écoulé')}>
              <i style={{ width: pc + '%' }}></i>
            </div>
            <div className="row t12 mt6" style={{ color: 'rgba(255,255,255,.74)', gap: '8px', flexWrap: 'wrap' }}>
              <span className="grow">{tf('Confirmée {jour}, {h}', { jour: jourCourtMois(c.fermeture, langue), h: heure(c.fermeture, langue) })}</span>
              <span>{tf('Libérée {quand}', { quand: quand(c.liberation, maintenant, langue, true) })}</span>
            </div>
            <div className="hline"></div>
            <div className="row" style={{ alignItems: 'flex-end' }}>
              <div className="grow">
                <div className="t12 b8" style={{ letterSpacing: '.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,.74)' }}>
                  {t('Vous gardez')}
                </div>
                <div className="t13 mt4" style={{ color: 'rgba(255,255,255,.86)', lineHeight: '1.4' }}>
                  {tf('Versé {jour} sur {numero}', { jour: jourLongMois(c.vendredi, langue), numero })}
                </div>
              </div>
              <div className="b8 nw" style={{ fontSize: '22px', letterSpacing: '-.02em' }}>
                {m.f(c.garde)}
              </div>
            </div>
            {c.carte && (
              <div className="t12 mt8" style={{ color: 'rgba(255,255,255,.74)' }}>
                {tf('Paiement par carte : libéré {n} après la confirmation.', { n: jours(d.delais.carte, tf) })}
              </div>
            )}
            <Link to={chemin('commande', { ref: c.ref })} className="row t14 b8" style={{ color: 'var(--gold-l)', minHeight: '44px', marginTop: '4px', gap: '4px' }}>
              {t('Voir la commande ')}
              <Icone nom="chevron-right" taille={16} />
            </Link>
          </div>
        )
      })}
      <Aide icone="award">{tf('Votre palier {palier} : libéré {n} après la confirmation du client.', { palier: nomPalier(d.palier, langue), n: jours(delai, tf) })}</Aide>
      {d.enCours.length > 0 && (
        <>
          <div className="sec">
            <h2>{t('En cours')}</h2>
          </div>
          <div className="card tight">
            {d.enCours.map((c) => (
              <Link key={c.ref} to={chemin('commande', { ref: c.ref })} className="li">
                <Vignette nom={c.article.dessin} taille={40} />
                <span className="grow">
                  <span className="lt" style={{ display: 'block' }}>
                    {`${c.ref} · ${c.article.titre}`}
                  </span>
                  <span className="ls" style={{ display: 'block' }}>
                    {t('Pas encore retirée : le délai n’a pas commencé.')}
                  </span>
                </span>
                <span className="rv">{m.f(c.garde)}</span>
                <span className="chev">
                  <Icone nom="chevron-right" taille={18} />
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
      <div className="note red">
        <Icone nom="lock" taille={18} />
        <div>
          {t('Un litige ou un retour ouvert gèle la somme aussitôt, même pendant le délai.')}{' '}
          <Link to={chemin('gele')} className="b8" style={{ color: 'inherit', textDecoration: 'underline' }}>
            {t('Voir ce qui est gelé')}
          </Link>
        </div>
      </div>
      <CommentCaMarche>
        <div className="tl" style={{ marginTop: '4px' }}>
          {[
            ['1 · Le client paie', t('BelivaY met l’argent de côté : vous êtes couvert, même si le colis se perd.')],
            ['2 · Le client retire', t('Au relais ou à domicile.')],
            ['3 · Le droit de retour se ferme', tf('Le client confirme « Tout est en ordre », ou {n} passent sans problème signalé.', { n: jours(d.fenetreRetourJours, tf) })],
            ['4 · L’argent se libère', tf('{s} pour Bronze et Argent, {o} pour Or et Platine, {c} pour un paiement par carte.', { s: jours(d.delais.standard, tf), o: jours(d.delais.or, tf), c: jours(d.delais.carte, tf) })],
            ['5 · Versement', t('Le vendredi qui suit, avant 12 h, sur votre numéro de versement.')],
          ].map(([titre, texte], i) => (
            <div key={titre} className={'ti' + (i < 3 ? ' done' : i === 3 ? ' cur' : '')}>
              <div className="tt">{t(titre)}</div>
              <div className="td">{texte}</div>
            </div>
          ))}
        </div>
      </CommentCaMarche>
    </>
  )
}

export default function SeLibere() {
  const { t } = usePreferences()
  const lecture = useLecture(() => source.argent.seLibere())
  return (
    <AvecDonnees route="se_libere" lecture={lecture}>
      {(d) => (
        <Ecran route="se_libere">
          <div className="pg">
            <h1 className="pg-t">{t('Se libère')}</h1>
            <p className="pg-s">{t('Le délai de sécurité après la confirmation du client.')}</p>
          </div>
          <Onglets actif="se_libere" />
          <BandeauHorsLigne />
          <Contenu d={d} relire={lecture.relire} />
        </Ecran>
      )}
    </AvecDonnees>
  )
}
