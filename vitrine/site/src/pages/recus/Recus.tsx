// Boîte « Reçus » (DP-54, consigne du porteur du 5 oct.) : `/recus`. Tout ce que des proches ont envoyé au client
// connecté, groupé par ce qu'il a à faire (à offrir, à payer, à rejoindre, à accepter, à retirer pour quelqu'un,
// parrainages et partages), à traiter d'abord, puis ce qui est déjà traité ; l'onglet « Envoyés » (?vue=envoyes) :
// ses propres envois et leurs réponses (merci, suivi). Chaque ligne ouvre la vue de réception (`/recu?id=`).
// Entrées : menu du compte (badge du nombre à traiter), Mon compte, notifications, espace diaspora.
// Dès 1024 px (DISPOSITION-ECRANS.md § 4.3) : maître-détail, la boîte à gauche (360), l'envoi choisi à droite
// (?id=, sinon le premier à traiter) ; la ligne choisie porte aria-current. Téléphone : deux écrans.
// Écran propre au site (absent du prototype).
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { useDes } from '../../composants/ecran'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { GROUPE_ENVOI, type DonneesRecus, type EnvoiRecu } from '../../donnees/source'
import { usePreferences } from '../../preferences'
import { useCompteDiaspora } from '../../session'
import { DetailRecu } from './RecuVue'
import { GROUPES, LigneRecu, useRecus } from './Commun'

export function Recus() {
  return <BoiteRecus route="recus" />
}

export function BoiteRecus({ route }: { route: 'recus' | 'recu' }) {
  const { t } = usePreferences()
  const [params] = useSearchParams()
  const [d] = useRecus()
  const tabL = useDes('tab-l')
  if (!d) return null
  const vue = params.get('vue') === 'envoyes' ? 'envoyes' : 'recus'
  const id = params.get('id')
  const tous = [...d.recus, ...d.envoyes]
  const dans = id ? tous.find((x) => x.id === id) : null
  // Maître-détail : l'onglet suit l'envoi choisi ; à défaut, le premier de l'onglet.
  const onglet = dans ? (d.recus.includes(dans) ? 'recus' : 'envoyes') : vue
  const choisi = tabL ? (dans ?? (onglet === 'recus' ? d.recus[0] : d.envoyes[0]) ?? null) : null
  const liste = <ListeRecus d={d} vue={onglet} choisi={choisi?.id ?? null} remplacer={tabL} />
  if (!tabL)
    return (
      <Ecran route={route} gabarit="compte">
        {liste}
      </Ecran>
    )
  return (
    <Ecran route={route} gabarit="compte">
      <div className="d13-md">
        <div className="d13-md-liste">{liste}</div>
        <div className="d13-md-detail" aria-live="polite">
          {choisi ? (
            <DetailRecu key={choisi.id} id={choisi.id} />
          ) : (
            <div className="card mt12">
              <div className="empty">
                <p>{t('Choisis un envoi dans la liste.')}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Ecran>
  )
}

function ListeRecus({ d, vue, choisi, remplacer }: { d: DonneesRecus; vue: 'recus' | 'envoyes'; choisi: string | null; remplacer: boolean }) {
  const { t, tf } = usePreferences()
  const diaspora = useCompteDiaspora()
  const aTraiter = d.recus.filter((x) => x.etat === 'a_traiter')
  const traites = d.recus.filter((x) => x.etat !== 'a_traiter')
  const ligne = (x: EnvoiRecu, sens: 'recu' | 'envoye') => <LigneRecu key={x.id} x={x} sens={sens} on={x.id === choisi} remplacer={remplacer} maintenant={d.maintenant} />
  return (
    <div className="blv-recus">
      <div className="seg mt12" role="tablist" aria-label={t('Reçus et envoyés')}>
        <Link to={chemin('recus')} replace role="tab" aria-selected={vue === 'recus'} className={vue === 'recus' ? 'on' : ''}>
          {d.aTraiter ? tf('Reçus ({n})', { n: d.aTraiter }) : t('Reçus')}
        </Link>
        <Link to={chemin('recus', { vue: 'envoyes' })} replace role="tab" aria-selected={vue === 'envoyes'} className={vue === 'envoyes' ? 'on' : ''}>
          {t('Envoyés')}
        </Link>
      </div>
      {vue === 'recus' ? (
        <>
          <p className="cl13-intro mt12">{t(aTraiter.length ? 'Ce que tes proches t’ont envoyé : offre, paie, participe ou accepte depuis ton compte, sans rien ressaisir.' : 'Rien à traiter pour l’instant. Quand un proche t’envoie une liste, un panier ou un colis, il arrive ici, avec une notification.')}</p>
          {GROUPES.map((g) => {
            const xs = aTraiter.filter((x) => GROUPE_ENVOI[x.type] === g.id)
            if (!xs.length) return null
            return (
              <section key={g.id} aria-label={t(g.titre)}>
                <div className="sec">
                  <h2>
                    <Icone nom={g.icone} taille={16} /> {t(g.titre)}
                  </h2>
                  <span className="cl13-cnt or">{xs.length}</span>
                </div>
                <p className="t12 c3">{t(g.aide)}</p>
                <div className="card tight">{xs.map((x) => ligne(x, 'recu'))}</div>
              </section>
            )
          })}
          {!d.recus.length && (
            <div className="card">
              <div className="empty">
                <div className="ei">
                  <Icone nom="inbox" taille={26} />
                </div>
                <h3>{t('Rien de reçu pour l’instant')}</h3>
                <p>{t('Les listes de mariage, d’anniversaire, les paniers à payer, les cotisations et les colis offerts par tes proches arrivent ici.')}</p>
              </div>
            </div>
          )}
          {traites.length > 0 && (
            <section aria-label={t('Déjà traités')}>
              <div className="sec">
                <h2>{t('Déjà traités')}</h2>
              </div>
              <div className="card tight">{traites.map((x) => ligne(x, 'recu'))}</div>
            </section>
          )}
        </>
      ) : (
        <>
          <p className="cl13-intro mt12">{t('Tes envois et leurs réponses. Un proche qui a un compte les reçoit dans son application ; sinon, il agit par le lien, sans compte.')}</p>
          {d.envoyes.length ? (
            <div className="card tight">{d.envoyes.map((x) => ligne(x, 'envoye'))}</div>
          ) : (
            <div className="card">
              <div className="empty">
                <div className="ei">
                  <Icone nom="send" taille={26} />
                </div>
                <h3>{t('Aucun envoi pour l’instant')}</h3>
              </div>
            </div>
          )}
          <div className="sec">
            <h2>{t('Envoyer à un proche')}</h2>
          </div>
          <div className="chips">
            <Link className="chip" to={chemin('listes')}>
              <Icone nom="gift" taille={14} /> {t('Une liste d’envies')}
            </Link>
            <Link className="chip" to={chemin('cotisation')}>
              <Icone nom="hand-coins" taille={14} /> {t('Une cotisation')}
            </Link>
            {!diaspora && (
              <Link className="chip" to={chemin('diaspora')}>
                <Icone nom="shopping-basket" taille={14} /> {t('Mon panier à payer')}
              </Link>
            )}
            <Link className="chip" to={chemin('abonnement-offrir')}>
              <Icone nom="gem" taille={14} /> {t('Un abonnement')}
            </Link>
            {!diaspora && (
              <Link className="chip" to={chemin('parrainage')}>
                <Icone nom="user-plus" taille={14} /> {t('Mon parrainage')}
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  )
}
