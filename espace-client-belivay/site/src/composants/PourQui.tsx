// « Pour qui ? » d'un compte diaspora (DP-54) : le proche actif, choisi parmi les proches reliés et mémorisé sur le
// compte (session.proche). Tout ce qui dépend du lieu part de SON relais : distances, « retirable aujourd'hui »,
// délais, frais, tri au plus proche. Le site n'en montre que le prénom et le quartier, jamais l'adresse ni le code.
// - useLieu() : les phrases « … ton relais » deviennent « … le relais d'Odile (Mvog-Ada) » pour un compte diaspora ;
//   pour tout autre compte, la phrase d'origine, telle quelle (rien ne change, au pixel).
// - PastillePourQui : une ligne discrète (en-tête large, menu, recherche, espace diaspora) qui ouvre le choix.
// - FeuillePourQui : la feuille du choix (?sheet=pour-qui), posée par l'écran pour un compte diaspora.
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { chemin } from '../config/pages'
import { source, type LienFamille, type ProcheActif } from '../donnees/source'
import { usePreferences } from '../preferences'
import { useMajSession, useSession } from '../session'
import { jouer } from './Sons'
import { Feuille, useFeuille } from './Feuille'
import { Icone } from './Icone'

// Ligne de la recherche (téléphone et grands écrans) : d'où partent les distances, pour un compte diaspora.
export function OrigineProche({ classe }: { classe: string }) {
  const { t, tf } = usePreferences()
  const { proche } = useLieu()
  const vers = useVersPourQui()
  return (
    <Link to={proche ? vers.to : chemin('proches')} state={proche ? vers.state : undefined} className={classe}>
      <Icone nom="users" taille={16} />
      <span className="nw">{proche ? <b>{proche.quartier ? tf('{p} · {q}', { p: proche.prenom, q: t(proche.quartier) }) : proche.prenom}</b> : t('Relier un proche')}</span>
      {proche && <Icone nom="chevron-down" taille={15} />}
      <span className="sm">{t(proche ? '— les distances partent de son relais' : '— les distances partiront de son relais')}</span>
    </Link>
  )
}

// Phrase d'origine → phrase d'un compte diaspora. {p} : le prénom du proche (« ton proche » sans proche relié) ;
// {pq} : « Odile (Mvog-Ada) ».
export const VARIANTES: Record<string, string> = {
  'Près de ton relais': 'Près du relais de {p}',
  'retrait au Relais Mvog-Ada': 'retrait au relais de {pq}',
  'Ton argent reste bloqué chez BelivaY jusqu’à ton retrait. MTN MoMo et Orange Money.': 'Ton argent reste bloqué chez BelivaY jusqu’au retrait par ton proche. Carte, Apple Pay ou Google Pay.',
  'Un relais près de chez toi dans 12 quartiers de Yaoundé. Le tien\u00A0: Relais Mvog-Ada, à 350\u00A0m.': 'Un relais près de chez tes proches dans 12 quartiers de Yaoundé. Celui de {pq}.',
  'Les derniers produits publiés, retirables à ton relais': 'Les derniers produits publiés, retirables au relais de {pq}',
  'À la une · près de ton relais': 'À la une · près du relais de {p}',
  '{k} de ton relais': '{k} du relais de {p}',
  'de ton relais': 'du relais de {p}',
  'à {k} km de ton relais ({r})': 'à {k} km du relais de {pq}',
  '{z} · {k} km de ton relais': '{z} · {k} km du relais de {p}',
  '{z} · à {k} km de ton relais': '{z} · à {k} km du relais de {p}',
  '{k} km de ton relais': '{k} km du relais de {p}',
  'Retirable aujourd’hui': 'Retirable aujourd’hui par {p}',
  'Produits triés sur le volet par l’équipe BelivaY, retirables à ton relais.': 'Produits triés sur le volet par l’équipe BelivaY, retirables au relais de {pq}.',
  'On démarche des vendeurs près de ton relais. En attendant, regarde l’univers entier ou cherche un produit précis.': 'On démarche des vendeurs près du relais de {p}. En attendant, regarde l’univers entier ou cherche un produit précis.',
  'Aucune vente flash pour ton relais en ce moment': 'Aucune vente flash pour le relais de {p} en ce moment',
  'Voici ce qui est livrable à ton relais :': 'Voici ce qui est livrable au relais de {pq} :',
  'Rien de livrable à ton relais pour « {q} » pour l’instant. Je peux t’en prévenir quand ça arrive.': 'Rien de livrable au relais de {p} pour « {q} » pour l’instant. Je peux t’en prévenir quand ça arrive.',
  'livrable à ton relais. Voici ce qui s’en approche le plus.': 'livrable au relais de {p}. Voici ce qui s’en approche le plus.',
  'livrable à ton relais. Aucun vendeur ne le propose pour l’instant : vérifie l’orthographe, ou essaie un mot plus simple.': 'livrable au relais de {p}. Aucun vendeur ne le propose pour l’instant : vérifie l’orthographe, ou essaie un mot plus simple.',
  'Un push gratuit, une seule fois, le jour où un produit correspondant est publié près de ton relais.': 'Un push gratuit, une seule fois, le jour où un produit correspondant est publié près du relais de {p}.',
}

export function useLieu() {
  const s = useSession()
  const { t, tf } = usePreferences()
  const diaspora = s.connecte && s.typeCompte === 'diaspora'
  const proche: ProcheActif | null = diaspora ? (s.proche ?? null) : null
  const p = proche ? proche.prenom : t('ton proche')
  const pq = proche ? (proche.quartier ? `${proche.prenom} (${t(proche.quartier)})` : proche.prenom) : t('ton proche')
  const r = (fr: string, v: Record<string, string | number> = {}) => {
    const d = diaspora ? VARIANTES[fr] : undefined
    if (d) return tf(d, { ...v, p, pq })
    return Object.keys(v).length ? tf(fr, v) : t(fr)
  }
  return { diaspora, proche, p, pq, r }
}

// Lien qui ouvre le choix « Pour qui ? » sur la page où l'on est (?sheet=pour-qui), comme ouvrir() d'une feuille.
export function useVersPourQui() {
  const lieu = useLocation()
  const q = new URLSearchParams(lieu.search)
  q.set('sheet', 'pour-qui')
  return { to: { pathname: lieu.pathname, search: q.toString() }, state: { feuille: true } }
}

// Une ligne : « Pour Odile · Mvog-Ada · Changer » (ouvre le choix), ou « Relier un proche » sans proche relié.
export function PastillePourQui({ classe = 'chip', court = false }: { classe?: string; court?: boolean }) {
  const { t, tf } = usePreferences()
  const { diaspora, proche } = useLieu()
  const vers = useVersPourQui()
  if (!diaspora) return null
  if (!proche)
    return (
      <Link className={classe} to={chemin('proches')}>
        <Icone nom="users" taille={16} />
        <span className="grow">{t('Relier un proche')}</span>
      </Link>
    )
  return (
    <Link className={classe} to={vers.to} state={vers.state} aria-label={tf('Pour qui : {p}. Changer', { p: proche.prenom })}>
      <Icone nom="users" taille={16} />
      <span className="grow">
        {tf('Pour {p}', { p: proche.prenom })}
        {proche.quartier && <b>{' · ' + t(proche.quartier)}</b>}
        {!court && <span className="c3">{t(' · Changer')}</span>}
      </span>
    </Link>
  )
}

export function FeuillePourQui() {
  const { t, tf } = usePreferences()
  const s = useSession()
  const majSession = useMajSession()
  const { ouverte, fermer } = useFeuille('pour-qui')
  const [liens, setLiens] = useState<LienFamille[] | null>(null)
  useEffect(() => {
    if (ouverte) source.liensFamille().then((r) => setLiens(r.liens.filter((l) => l.sens === 'diaspora' && l.etat === 'actif')))
  }, [ouverte])
  const choisir = async (id: string) => {
    const r = await source.choisirProche(id)
    fermer()
    if (r.ok) (jouer('interrupteur'), majSession(await source.session()))
  }
  return (
    <Feuille ouverte={ouverte} fermer={fermer} titre={t('Pour qui ?')}>
      <h3 className="t17 b8" style={{ margin: '4px 0 6px' }}>
        {t('Pour qui ?')}
      </h3>
      <p className="t13 c3" style={{ margin: '0 0 10px' }}>
        {t('Distances, délais, frais et « retirable aujourd’hui » partent du relais du proche choisi. Tu vois son prénom et son quartier, jamais son adresse ni son code.')}
      </p>
      {liens && (
        <div className="card tight" role="radiogroup" aria-label={t('Pour qui ?')}>
          {liens.map((l) => {
            const on = s.proche?.id === l.id
            return (
              <button key={l.id} type="button" role="radio" aria-checked={on} className="li" style={{ width: '100%', background: 'none', border: 0, textAlign: 'left', font: 'inherit', color: 'inherit' }} onClick={() => choisir(l.id)}>
                <span className="ic">
                  <Icone nom={on ? 'circle-check' : 'circle'} taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ display: 'block' }}>
                    {l.prenom}
                  </span>
                  <span className="ls" style={{ display: 'block' }}>
                    {l.relais ? tf('Relais de {q}', { q: t(l.relais.replace(/^Relais /, '')) }) : t('Relais pas encore choisi')}
                    {l.domicile ? ' · ' + t('livraison chez lui possible') : ''}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      )}
      <div className="links">
        <Link to={chemin('proches')}>
          {t('Relier un autre proche')}
        </Link>
      </div>
    </Feuille>
  )
}

// Pages qu'un compte diaspora n'utilise pas (DP-54 : ni retrait pour lui, ni comptoir, ni Mobile Money, ni
// portefeuille, ni vente ; ses commandes sont celles de ses proches). Leur adresse le ramène à son espace, avec la
// raison écrite (EspaceDiaspora : ?hors=route).
const POUR_SOI = 'Compte diaspora : pas de retrait pour toi. Tes proches retirent leurs colis avec leur propre code.'
const LITIGE = 'C’est ton proche qui signale un problème, au retrait ou dans les 7 jours ; un remboursement revient sur ta carte.'
const COMMANDE_MOMO = 'Compte diaspora : tu paies par carte, Apple Pay ou Google Pay dans « Commander pour un proche ».'
export const HORS_DIASPORA: Record<string, string> = {
  'relais-choix': 'Compte diaspora : pas de relais à toi. Les distances partent du relais de ton proche (« Pour qui ? »).',
  'premiere-commande': COMMANDE_MOMO,
  adresse: 'Compte diaspora : pas d’adresse à toi au Cameroun. Ton proche règle sa livraison dans son compte.',
  adresses: 'Compte diaspora : pas d’adresse à toi au Cameroun. Ton proche règle sa livraison dans son compte.',
  code: POUR_SOI,
  'code-partage': POUR_SOI,
  garde: POUR_SOI,
  comptoir: 'Compte diaspora : pas de paiement au comptoir.',
  'comptoir-payer': 'Compte diaspora : pas de paiement au comptoir.',
  wallet: 'Compte diaspora : pas de portefeuille BelivaY. Un remboursement revient sur ta carte.',
  cagnotte: 'Compte diaspora : pas de portefeuille BelivaY. Un remboursement revient sur ta carte.',
  'paiement-attente': COMMANDE_MOMO,
  'prix-change': COMMANDE_MOMO,
  'paiement-echec': COMMANDE_MOMO,
  confirmee: COMMANDE_MOMO,
  validee: COMMANDE_MOMO,
  modifier: 'Les commandes de tes proches se suivent dans « Mes commandes » ; ton proche règle son relais ou sa livraison.',
  annuler: 'Les commandes de tes proches se suivent dans « Mes commandes » ; ton proche peut refuser son colis tant qu’il n’est pas expédié.',
  'annuler-confirmer': 'Les commandes de tes proches se suivent dans « Mes commandes » ; ton proche peut refuser son colis tant qu’il n’est pas expédié.',
  'changer-relais': 'Ton proche règle son relais dans son compte.',
  'changer-adresse': 'Ton proche règle sa livraison dans son compte ; son adresse ne t’est jamais montrée.',
  litige: LITIGE,
  'litige-confirme': LITIGE,
  'litige-auto': LITIGE,
  'litige-comptoir': LITIGE,
  'litige-suivi': LITIGE,
  'litige-arrangement': LITIGE,
  litiges: LITIGE,
  retour: LITIGE,
  remplacement: LITIGE,
  payeur: 'Compte diaspora : les paniers de tes proches à payer sont dans ton espace.',
  'payeur-preuve': 'Compte diaspora : les paniers de tes proches à payer sont dans ton espace.',
  diaspora: 'Compte diaspora : les paniers de tes proches à payer sont dans ton espace.',
  'devenir-vendeur': 'Compte diaspora : pas de vente.',
  'abonnement-souscrire': 'Compte diaspora : l’abonnement sert aux retraits au Cameroun. Tu peux l’offrir à un proche.',
  'mon-abonnement': 'Compte diaspora : l’abonnement sert aux retraits au Cameroun. Tu peux l’offrir à un proche.',
  'abonnement-resilier': 'Compte diaspora : l’abonnement sert aux retraits au Cameroun. Tu peux l’offrir à un proche.',
  parrainage: 'Compte diaspora : le parrainage crédite un portefeuille BelivaY, que ton compte n’a pas.',
  cote: 'Compte diaspora : la mise de côté se paie en Mobile Money et se retire à ton relais.',
  'cote-plan': 'Compte diaspora : la mise de côté se paie en Mobile Money et se retire à ton relais.',
  'cote-suivre': 'Compte diaspora : la mise de côté se paie en Mobile Money et se retire à ton relais.',
  'cote-versement': 'Compte diaspora : la mise de côté se paie en Mobile Money et se retire à ton relais.',
  'cote-fini': 'Compte diaspora : la mise de côté se paie en Mobile Money et se retire à ton relais.',
  'cote-annuler': 'Compte diaspora : la mise de côté se paie en Mobile Money et se retire à ton relais.',
  troc: 'Compte diaspora : la reprise se dépose au relais, sur place.',
  'troc-offre': 'Compte diaspora : la reprise se dépose au relais, sur place.',
  'troc-depot': 'Compte diaspora : la reprise se dépose au relais, sur place.',
  'troc-inspection': 'Compte diaspora : la reprise se dépose au relais, sur place.',
  'troc-contre-offre': 'Compte diaspora : la reprise se dépose au relais, sur place.',
  'troc-payer': 'Compte diaspora : la reprise se dépose au relais, sur place.',
  'rentree-panier': 'Compte diaspora : la liste de rentrée se paie en Mobile Money. Ajoute ses articles au panier et commande pour ton proche.',
  'rentree-suivi': 'Compte diaspora : la liste de rentrée se paie en Mobile Money. Ajoute ses articles au panier et commande pour ton proche.',
  wa: 'Compte diaspora : la commande WhatsApp se paie en Mobile Money et se retire à ton relais.',
  'wa-proposition': 'Compte diaspora : la commande WhatsApp se paie en Mobile Money et se retire à ton relais.',
  'wa-confirmer': 'Compte diaspora : la commande WhatsApp se paie en Mobile Money et se retire à ton relais.',
  'wa-lien': 'Compte diaspora : la commande WhatsApp se paie en Mobile Money et se retire à ton relais.',
  'wa-suite': 'Compte diaspora : la commande WhatsApp se paie en Mobile Money et se retire à ton relais.',
}
