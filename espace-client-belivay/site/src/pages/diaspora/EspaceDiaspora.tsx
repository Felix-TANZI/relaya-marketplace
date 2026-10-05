// Écran « Espace diaspora » (DP-54) : la page centrale qui relie tout ce qu'un compte diaspora fait pour ses proches.
// - Compte diaspora : compte et plafonds restants (par paiement, ce mois-ci, proches reliés), devise d'affichage
//   (changée dans Réglages), « À payer pour mes proches » (paniers envoyés par un proche relié), mes proches (où
//   part leur colis : quartier du relais ou « chez X », jamais l'adresse) avec « Faire les courses pour X »,
//   commandes envoyées et leur étape (sans code ni adresse), relier un proche, tout savoir.
// - Compte au Cameroun : ses proches à l'étranger, envoyer son panier à l'un d'eux, ses paniers envoyés et leur
//   réponse, son code famille ; inviter un parent à ouvrir un compte diaspora.
// - Visiteur : ce que fait un compte diaspora, s'inscrire depuis l'étranger.
// Écran propre au site (absent du prototype).
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { useDes } from '../../composants/ecran'
import { Icone } from '../../composants/Icone'
import { HORS_DIASPORA, PastillePourQui } from '../../composants/PourQui'
import { chemin } from '../../config/pages'
import { PLAFONDS_DIASPORA, source, type CompteDiaspora, type DemandeProche, type LienFamille } from '../../donnees/source'
import { F, FCFA, PARITE_EURO, TAUX_DOLLAR_DEMO, deviseAffichee } from '../../i18n/format'
import { dateLongue } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { Pastille, Rangee, destination, etapeCommande } from './Commun'

type Liens = { compte: CompteDiaspora | null; liens: LienFamille[]; depensesMois: number; maintenant: number }
const NOM_DEVISE = { XAF: 'Franc CFA (F)', EUR: 'Euro (€)', USD: 'Dollar US ($)' } as const

const Ligne = ({ vers, icone, titre, sous, n }: { vers: string; icone: string; titre: string; sous: string; n?: number }) => (
  <Link to={vers} className="li">
    <span className="ic">
      <Icone nom={icone} taille={20} />
    </span>
    <span className="grow">
      <span className="lt" style={{ display: 'block' }}>
        {titre}
      </span>
      <span className="ls" style={{ display: 'block' }}>
        {sous}
      </span>
    </span>
    {n ? <span className="pill amber">{n}</span> : null}
    <span className="chev">
      <Icone nom="chevron-right" taille={18} />
    </span>
  </Link>
)

// Commandes envoyées, dès 1024 px : une vraie table (proche, relais ou domicile, étape, montant), § 5.14. Chaque
// ligne mène au suivi, comme la liste du téléphone.
function TableCommandes({ lignes, maintenant }: { lignes: { l: LienFamille; c: LienFamille['commandes'][number] }[]; maintenant: number }) {
  const { t, tf } = usePreferences()
  return (
    <div className="card tight d13-table">
      <table>
        <thead>
          <tr>
            <th scope="col">{t('Commande')}</th>
            <th scope="col">{t('Proche')}</th>
            <th scope="col">{t('Livraison')}</th>
            <th scope="col">{t('Étape')}</th>
            <th scope="col" className="num">
              {t('Montant')}
            </th>
          </tr>
        </thead>
        <tbody>
          {lignes.map(({ l, c }) => (
            <tr key={c.ref}>
              <td>
                <Link to={chemin('commander-pour', { suivi: c.ref })}>
                  <Icone nom={c.retireLe ? 'badge-check' : 'package'} taille={16} />
                  {c.ref}
                </Link>
              </td>
              <td>{l.prenom}</td>
              <td>{destination(l, c.livraison, t, tf)}</td>
              <td>{etapeCommande(c, maintenant, t, tf)}</td>
              <td className="num">{F(c.montant)} F</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function EspaceDiaspora() {
  const { t, tf, langue } = usePreferences()
  const session = useSession()
  const [d, setD] = useState<Liens | null>(null)
  const [demandes, setDemandes] = useState<DemandeProche[]>([])
  const [recus, setRecus] = useState(0)
  const tabL = useDes('tab-l')
  const hors = useSearchParams()[0].get('hors')
  useEffect(() => {
    if (!session.connecte) return
    source.liensFamille().then(setD)
    source.demandesProches().then((r) => setDemandes(r.demandes))
    source.recus().then((r) => setRecus(r.aTraiter)) // Reçus (DP-54) : envois à traiter
  }, [session.connecte])

  // Visiteur : ce qu'est un compte diaspora.
  if (!session.connecte)
    return (
      <Ecran route="espace-diaspora">
        <div className="hero orange mt12">
          <div className="hk">{t('Diaspora')}</div>
          <div className="cl11-ht">{t('Faire livrer tes proches au Cameroun')}</div>
          <div className="hs">{t('Depuis l’étranger, tu paies par carte, Apple Pay ou Google Pay ; ton proche retire au relais qu’il a choisi ou reçoit chez lui, avec son code.')}</div>
        </div>
        <div className="btns">
          <Link to={chemin('inscription-diaspora')} className="btn primary">
            <span>{t('Ouvrir un compte diaspora')}</span>
          </Link>
          <Link to={chemin('connexion', { next: chemin('espace-diaspora') })} className="btn secondary">
            <span>{t('J’ai déjà un compte')}</span>
          </Link>
        </div>
        <div className="links">
          <Link to={chemin('diaspora-infos')}>{t('Qui peut, comment, et la loi : tout savoir')}</Link>
        </div>
      </Ecran>
    )
  if (!d) return null
  const diaspora = !!d.compte
  const actifs = d.liens.filter((l) => l.etat === 'actif')
  const invites = d.liens.filter((l) => l.etat === 'invite')

  // Compte au Cameroun : l'autre côté du lien.
  if (!diaspora) {
    const envoyees = demandes.filter((x) => x.sens === 'envoyee')
    return (
      <Ecran route="espace-diaspora" gabarit="compte">
        <p className="cl13-intro mt12">{t('Tes proches à l’étranger peuvent payer tes courses : relie-les à ton compte, puis envoie-leur ton panier. Tu retires avec ton code, comme d’habitude.')}</p>
        <div className="card tight">
          <Ligne vers={chemin('proches')} icone="users" titre={t('Mes proches à l’étranger')} sous={actifs.length ? actifs.map((l) => tf('{p} · {c}', { p: l.prenom, c: t(l.pays ?? '') })).join(', ') : t('Ton code famille, ou le lien d’invitation de ton proche')} />
          <Ligne vers={chemin('diaspora')} icone="send" titre={t('Envoyer mon panier à mon proche à l’étranger')} sous={t('Il le paie dans son application, ou par un lien')} />
          <Ligne vers={chemin('recus')} icone="inbox" titre={t('Reçus')} sous={recus ? tf('{n} à traiter : listes, colis, invitations de tes proches', { n: recus }) : t('Ce que tes proches t’envoient, et tes envois')} n={recus} />
          <Ligne vers={chemin('paniers-proches')} icone="inbox" titre={t('Mes paniers envoyés')} sous={envoyees.length ? tf('{n} panier(s) · {a} en attente', { n: envoyees.length, a: envoyees.filter((x) => x.etat === 'attente').length }) : t('Aucun pour l’instant')} n={envoyees.filter((x) => x.etat === 'attente').length} />
          <Ligne vers={chemin('diaspora-infos')} icone="circle-help" titre={t('Comptes diaspora : tout savoir')} sous={t('Ce que voit ton proche, ce que tu paies (rien), tes droits')} />
        </div>
        <div className="note ink">
          <Icone nom="lock" taille={18} />
          <div>{t('Ton proche ne voit jamais ton numéro, ton adresse ni tes autres commandes ; seulement ton prénom, et le quartier de ton relais ou « chez toi » si tu l’acceptes.')}</div>
        </div>
      </Ecran>
    )
  }

  const recues = demandes.filter((x) => x.sens === 'recue')
  const aPayer = recues.filter((x) => x.etat === 'attente')
  const commandes = d.liens.flatMap((l) => l.commandes.map((c) => ({ l, c }))).sort((a, b) => b.c.le - a.c.le)
  const reste = Math.max(0, PLAFONDS_DIASPORA.mois - d.depensesMois)
  const devise = deviseAffichee()
  return (
    <Ecran route="espace-diaspora" gabarit="compte">
      {hors && HORS_DIASPORA[hors] && (
        <div className="note amber mt12" role="status">
          <Icone nom="info" taille={18} />
          <div>{t(HORS_DIASPORA[hors])}</div>
        </div>
      )}
      <div className="card vedette mt12 ed-compte">
        <div className="row" style={{ gap: 10 }}>
          <Icone nom="globe" taille={22} />
          <span className="grow">
            <b className="t15" style={{ display: 'block' }}>
              {tf('Compte diaspora · {v}, {p}', { v: d.compte!.ville, p: t(d.compte!.pays) })}
            </b>
            <span className="t12 c3">{t('Pour payer et faire livrer tes proches au Cameroun : pas de retrait pour toi, pas de comptoir ni de Mobile Money.')}</span>
          </span>
        </div>
        <div className="kv mt8">
          <span className="k">{t('Encore possible ce mois-ci')}</span>
          <span className="v">{F(reste)} F</span>
        </div>
        <div className="kv">
          <span className="k">{t('Par paiement')}</span>
          <span className="v">{tf('{m} F au plus', { m: F(PLAFONDS_DIASPORA.paiement) })}</span>
        </div>
        <div className="kv">
          <span className="k">{t('Proches reliés ou invités')}</span>
          <span className="v">{tf('{n} sur {p}', { n: actifs.length + invites.length, p: PLAFONDS_DIASPORA.liens })}</span>
        </div>
        <div className="kv">
          <span className="k">{t('Devise d’affichage')}</span>
          <span className="v">
            <Link to={chemin('reglages')}>{t(NOM_DEVISE[devise])}</Link>
          </span>
        </div>
        <div className="kv">
          <span className="k">{t('Pour qui ?')}</span>
          <span className="v">
            <PastillePourQui classe="lien-pq" court />
          </span>
        </div>
        {devise !== 'XAF' && <p className="t12 c3">{devise === 'EUR' ? tf('1 € = {t} F : parité fixe. Tu paies en francs CFA, ta banque débite l’équivalent.', { t: '655,957' }) : tf('1 $ ≈ {t} F : taux de démonstration ; le taux du jour est figé au moment du paiement.', { t: String(TAUX_DOLLAR_DEMO).replace('.', ',') })}</p>}
      </div>

      {/* Dès 1024 px : « À payer pour mes proches » et « Mes proches » côte à côte (6 et 6, § 5.14). */}
      <Rangee classe="d13-duo">
        <Rangee classe="d13-col">
          <h3 className="cl11-k">{t('À payer pour mes proches')}</h3>
          {recus > 0 && (
            <div className="card tight">
              <Ligne vers={chemin('recus')} icone="inbox" titre={t('Reçus')} sous={tf('{n} à traiter : paniers, listes et invitations de tes proches', { n: recus })} n={recus} />
            </div>
          )}
          {aPayer.length ? (
            <div className="card tight">
              {aPayer.map((x) => (
                <Ligne key={x.id} vers={chemin('paniers-proches', { id: x.id })} icone="shopping-basket" titre={tf('{p} t’a envoyé son panier', { p: x.prenom })} sous={tf('{n} article(s) · {m} F d’articles · {d}', { n: x.lignes.reduce((n, l) => n + l.qte, 0), m: F(x.sousTotal), d: dateLongue(x.creeLe, langue) })} n={1} />
              ))}
            </div>
          ) : (
            <p className="t13 c3">{t('Rien à payer : quand un proche relié t’envoie son panier, il arrive ici et tu reçois une notification.')}</p>
          )}
          {recues.length > aPayer.length && (
            <div className="links">
              <Link to={chemin('paniers-proches')}>{tf('Paniers déjà payés ou refusés ({n})', { n: recues.length - aPayer.length })}</Link>
            </div>
          )}
        </Rangee>
        <Rangee classe="d13-col">
          <h3 className="cl11-k">{t('Mes proches au Cameroun')}</h3>
          {actifs.map((l) => (
            <div key={l.id} className="card">
              <div className="row" style={{ gap: 12 }}>
                <Pastille prenom={l.prenom} />
                <span className="grow">
                  <b className="t15" style={{ display: 'block' }}>
                    {l.prenom}
                  </b>
                  <span className="t12 c3">
                    {destination(l, 'relais', t, tf)}
                    {l.domicile ? ' · ' + t('livraison à domicile possible') : ''}
                  </span>
                </span>
              </div>
              <div className="btns">
                <Link to={chemin('commander-pour', { lien: l.id })} className="btn primary">
                  <Icone nom="shopping-cart" taille={18} />
                  <span>{tf('Faire les courses pour {p}', { p: l.prenom })}</span>
                </Link>
              </div>
            </div>
          ))}
          {invites.map((l) => (
            <div key={l.id} className="kv">
              <span className="k">{l.prenom}</span>
              <span className="v">{t('Invitation en attente')}</span>
            </div>
          ))}
          {!actifs.length && (
            <div className="note ink">
              <Icone nom="info" taille={18} />
              <div>{t(invites.length ? 'Tu pourras commander dès qu’un proche aura accepté ton invitation.' : 'Pour commander, relie d’abord un proche : son code famille, ou une invitation qu’il accepte.')}</div>
            </div>
          )}
          <div className="btns">
            <Link to={chemin('proches')} className="btn secondary">
              <Icone nom="user-plus" taille={18} />
              <span>{t('Relier ou inviter un proche')}</span>
            </Link>
          </div>
        </Rangee>
      </Rangee>

      <h3 className="cl11-k">{t('Commandes envoyées')}</h3>
      {commandes.length && tabL ? (
        <TableCommandes lignes={commandes.slice(0, 5)} maintenant={d.maintenant} />
      ) : commandes.length ? (
        <div className="card tight">
          {commandes.slice(0, 5).map(({ l, c }) => (
            <Ligne key={c.ref} vers={chemin('commander-pour', { suivi: c.ref })} icone={c.retireLe ? 'badge-check' : 'package'} titre={tf('{ref} · pour {p} · {m} F', { ref: c.ref, p: l.prenom, m: F(c.montant) })} sous={etapeCommande(c, d.maintenant, t, tf) + ' · ' + destination(l, c.livraison, t, tf)} />
          ))}
        </div>
      ) : (
        <p className="t13 c3">{t('Aucune commande envoyée pour l’instant.')}</p>
      )}

      <div className="card tight">
        <Ligne vers={chemin('notifications')} icone="bell" titre={t('Notifications')} sous={t('Paniers reçus, paiements, colis prêts et remis')} />
        <Ligne vers={chemin('listes')} icone="gift" titre={t('Mes listes d’envies')} sous={t('Ta liste, livrée à un proche relié ou à toi au pays ; offrir sur celles de tes proches')} />
        <Ligne vers={chemin('reglages')} icone="banknote" titre={t('Devise d’affichage')} sous={tf('{d} · 1 € = {e} F', { d: t(NOM_DEVISE[devise]), e: String(PARITE_EURO).replace('.', ',') })} />
        <Ligne vers={chemin('diaspora-infos')} icone="circle-help" titre={t('Comptes diaspora : tout savoir')} sous={tf('Plafonds : {p} F par paiement, {m} F par mois', { p: FCFA(PLAFONDS_DIASPORA.paiement), m: FCFA(PLAFONDS_DIASPORA.mois) })} />
        <Ligne vers={chemin('aide')} icone="life-buoy" titre={t('Aide')} sous={t('Un souci avec une commande ou un paiement')} />
      </div>
    </Ecran>
  )
}
