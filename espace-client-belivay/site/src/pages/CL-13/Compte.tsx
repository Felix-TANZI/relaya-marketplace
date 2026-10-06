// Écran « Mon compte » (CL-13), balisage du prototype du 1er octobre (deux variantes : compte de référence,
// compte neuf), repris à la main et rendu logique (DP-52, DP-53) : tout vient des données du compte
// (source.compte()) — compteurs (masqués à 0, CNV-07), solde, avantages du palier écrits en clair (CCO-02),
// relais habituel, adresse principale, moyens de paiement, avis à donner, messages non lus. La variante suit
// les données (numéro pas encore vérifié = compte neuf) ; l'adresse « ?st=nouveau » la montre en démonstration.
// « Se déconnecter » ferme la session après confirmation ; « Mon profil » ouvre la modification du profil.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { BanniereVendeur } from '../../composants/BanniereVendeur'
import { Link } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Module } from '../../composants/Module'
import { Dessin } from '../../composants/Dessin'
import { Feuille, useFeuille } from '../../composants/Feuille'
import { Icone } from '../../composants/Icone'
import { Bouton } from '../../composants/socle'
import { Styles } from '../../composants/Styles'
import { chemin } from '../../config/pages'
import { useEtat } from '../../config/etats'
import { source, type DonneesCompte } from '../../donnees/source'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'
import { Montant, OeilSolde, PhotoClient } from '../../composants/Profil'
import { useCompteDiaspora, useSession } from '../../session'
import { ChercherCompte } from './ChercherCompte'
import { Bloc } from './Larges'
import { useDes } from '../../composants/ecran'

// « 1 message non lu », « 3 messages non lus », « Aucun message non lu ».
const nonLus = (n: number) => (n === 0 ? 'Aucun message non lu' : n === 1 ? '1 message non lu' : `${n} messages non lus`)

// Compte diaspora (DP-54) : à la place du portefeuille (qu'il n'a pas), l'accès à son espace et ce qui l'attend.
function EncartDiaspora() {
  const { t, tf } = usePreferences()
  const [n, setN] = useState<{ aPayer: number; proches: number } | null>(null)
  useEffect(() => {
    Promise.all([source.demandesProches(), source.liensFamille()]).then(([d, l]) => setN({ aPayer: d.demandes.filter((x) => x.sens === 'recue' && x.etat === 'attente').length, proches: l.liens.filter((x) => x.etat === 'actif').length }))
  }, [])
  return (
    <div className="card tight">
      <Link to={chemin('espace-diaspora')} className="li">
        <span className="ic or">
          <Icone nom="globe" taille={20} />
        </span>
        <span className="grow">
          <span className="lt" style={{ display: 'block' }}>
            {t('Espace diaspora')}
          </span>
          <span className="ls" style={{ display: 'block' }}>
            {n ? tf('{p} proche(s) relié(s) · {a} panier(s) à payer', { p: n.proches, a: n.aPayer }) : t('Proches, paniers à payer, commandes envoyées, devise')}
          </span>
        </span>
        {n && n.aPayer > 0 && <span className="cl13-cnt or">{n.aPayer}</span>}
        <span className="chev">
          <Icone nom="chevron-right" taille={18} />
        </span>
      </Link>
      <Link to={chemin('paniers-proches')} className="li">
        <span className="ic">
          <Icone nom="inbox" taille={20} />
        </span>
        <span className="grow">
          <span className="lt" style={{ display: 'block' }}>
            {t('À payer pour mes proches')}
          </span>
          <span className="ls" style={{ display: 'block' }}>
            {t('Carte, Apple Pay ou Google Pay · pas de portefeuille ni de Mobile Money')}
          </span>
        </span>
        <span className="chev">
          <Icone nom="chevron-right" taille={18} />
        </span>
      </Link>
    </div>
  )
}

export function Compte() {
  const session = useSession()
  const diaspora = useCompteDiaspora()
  const client = session.client
  const { t, tf, theme, taille } = usePreferences()
  const etat = useEtat('compte')
  const scenario = etat === 'compte?st=nouveau' ? 'nouveau' : undefined
  const [d, setD] = useState<DonneesCompte | null>(null)
  useEffect(() => {
    let vivant = true
    source.compte(scenario).then((x) => vivant && setD(x))
    return () => {
      vivant = false
    }
  }, [scenario])
  const sortie = useFeuille('deconnexion')
  const [recusATraiter, setRecusATraiter] = useState(0)
  useEffect(() => {
    let vivant = true
    source.recus().then((r) => vivant && setRecusATraiter(scenario ? 0 : r.aTraiter))
    return () => {
      vivant = false
    }
  }, [scenario])
  // Dès 1024 px, la recherche du compte est en tête du menu du compte (gabarit « compte ») : pas de doublon.
  const large = useDes('tab-l')
  // Résumé des réglages d'affichage, comme le prototype (le thème et la taille suivent les préférences).
  const affichage = 'Français · thème ' + (theme === 'dark' ? 'sombre' : 'clair') + ' · texte ' + (taille === 'normale' ? 'normal' : taille === 'grande' ? 'grand' : 'très grand')
  // Sans session, le compte n'existe pas sur cet appareil : la connexion s'ouvre (CAC-29).
  if (!session.connecte || !client) return null // la garde des pages du compte ouvre la connexion (App)
  if (!d) return null
  // Déconnexion : la session se ferme, puis le site se recharge sur l'accueil (visiteur), sans rien garder
  // en mémoire du compte (CAC-29 : le panier reste sur l'appareil).
  const deconnecter = async () => {
    await source.deconnecter()
    window.location.assign(chemin('accueil'))
  }
  const moyens = d.moyens.length
    ? [...d.moyens].sort((a, b) => Number(b.parDefaut) - Number(a.parDefaut)).map((m, i) => (i === 0 && m.parDefaut ? m.operateur + ' par défaut' : m.operateur)).join(' · ')
    : 'Ton numéro vérifié sera proposé'
  const avis = d.avisADonner[0]
  const feuilleSortie = (
    <Feuille ouverte={sortie.ouverte} fermer={sortie.fermer} titre={t('Se déconnecter')}>
      <h2 className="pg-t" style={{ fontSize: 19 }}>
        {t('Se déconnecter de cet appareil ?')}
      </h2>
      <p className="pg-s">{t('Tes commandes, ton argent et tes codes de retrait restent sur ton compte. Tu te reconnectes avec Google ou ton e-mail.')}</p>
      <div className="mt16">
        <Bouton icone="log-out" onClick={deconnecter}>
          {t('Se déconnecter')}
        </Bouton>
      </div>
      <div className="mt10">
        <Bouton genre="ghost" onClick={sortie.fermer}>
          {t('Annuler')}
        </Bouton>
      </div>
    </Feuille>
  )
  switch (d.numeroVerifie ? "compte" : "compte?st=nouveau") {
    case "compte":
    default:
      return (
        <Ecran route="compte" parEtat gabarit="compte" fixes={feuilleSortie} avant={
          <>
            <Styles id="1c3d953197" />
          </>
        }>
        <div className="cl13-pf">
          <span className="av">
            <span className="portrait" style={{ "width": "56px", "height": "56px" }}>
              <PhotoClient>
                <Dessin id="ebb567019115" />
              </PhotoClient>
            </span>
          </span>
          <span className="grow" style={{ "minWidth": "0" }}>
            <h1>
              {t(client.nomComplet)}
            </h1>
            <span className="l">
              <span className="nw">
                {t(client.numeroMasque)}
              </span>
              {t(" · ")}
              <span className="ok">
                <Icone nom="check" taille={13} trait={3} style={{ "verticalAlign": "-1px" }} />
                {t(" Vérifié")}
              </span>
            </span>
            <span className="l">
              {t(client.emailMasque + (client.connexion === 'google' ? ' · Google' : ''))}
            </span>
          </span>
          <Link to="/profil" className="cl13-sq" aria-label="Modifier mon profil">
            <Icone nom="pencil" taille={18} />
          </Link>
        </div>
        <div className="cl13-tiles">
          <Link to="/commandes" className="cl13-tile">
            <span className="ti">
              <Icone nom="package" taille={21} />
              {d.compteurs.commandes > 0 && <span className="n">{d.compteurs.commandes}</span>}
            </span>
            <span className="tt">
              {t("Commandes")}
            </span>
          </Link>
          {diaspora ? (
          <Link to="/proches" className="cl13-tile">
            <span className="ti">
              <Icone nom="users" taille={21} />
            </span>
            <span className="tt">
              {t("Proches")}
            </span>
          </Link>
          ) : (
          <Link to="/litiges" className="cl13-tile">
            <span className="ti">
              <Icone nom="scale" taille={21} />
              {d.compteurs.litiges > 0 && <span className="n">{d.compteurs.litiges}</span>}
            </span>
            <span className="tt">
              {t("Litiges")}
            </span>
          </Link>
          )}
          <Link to="/messagerie" className="cl13-tile">
            <span className="ti">
              <Icone nom="messages-square" taille={21} />
              {d.compteurs.messagesNonLus > 0 && <span className="n">{d.compteurs.messagesNonLus}</span>}
            </span>
            <span className="tt">
              {t("Messages")}
            </span>
          </Link>
          <Link to="/sauvegardes" className="cl13-tile">
            <span className="ti">
              <Icone nom="heart" taille={21} />
              {d.compteurs.sauvegardes > 0 && <span className="n">{d.compteurs.sauvegardes}</span>}
            </span>
            <span className="tt">
              {t("Sauvegardés")}
            </span>
          </Link>
        </div>
        {!large && <ChercherCompte />}
        <Bloc classe="c13-ov">
        <Styles id="0b0ccec1e3" />
        {diaspora ? <EncartDiaspora /> : (
        <Module ff="FF-WALLET">
        <section className="wl-card">
          <span className="ring"></span>
          <div className="wl-h">
            <Icone nom="wallet" taille={16} />
            <span className="grow">
              {t("Wallet BelivaY")}
            </span>
            <OeilSolde />
          </div>
          <div className="wl-bal">
            <Montant solde>{t(F(d.portefeuille.solde))}</Montant>
            <small>
              {t("F")}
            </small>
          </div>
          <div className="wl-sub">
            <Montant>{tf('Disponible · cagnotte en attente {m} F', { m: F(d.portefeuille.cagnotteEnAttente) })}</Montant>
          </div>
          <div className="wl-act">
            <Link to="/wallet?st=recharger">
              <span className="i">
                <Icone nom="plus" taille={20} />
              </span>
              {t("Recharger")}
            </Link>
            <Link to="/panier">
              <span className="i">
                <Icone nom="shopping-cart" taille={19} />
              </span>
              {t("Payer")}
            </Link>
            <Link to="/wallet?st=retirer">
              <span className="i">
                <Icone nom="arrow-up-right" taille={19} />
              </span>
              {t("Retirer")}
            </Link>
            <Link to="/wallet">
              <span className="i">
                <Icone nom="list" taille={19} />
              </span>
              {t("Historique")}
            </Link>
          </div>
        </section>
        </Module>
        )}
        {/* Boutique ouverte : la bannière y mène, avec l'état de la pièce d'identité (DP-53). Compte diaspora : il ne
            vend pas, ne retire pas et ne paie pas au comptoir (DP-54) : bannière, avantages et relais masqués. */}
        {!diaspora && (<>
        <BanniereVendeur
          ouverte={!!d.boutique}
          titre={d.boutique ? tf('Ma boutique «\u00A0{nom}\u00A0»', { nom: d.boutique.nom }) : t("Deviens vendeur")}
          sous={t(
                !d.boutique
                  ? 'Ouvre ta boutique en 1 minute, ajoute tes produits tout de suite. Pièce d’identité avant de vendre.'
                  : d.boutique.piece === 'verifiee'
                    ? 'Pièce vérifiée : tes produits sont en vente.'
                    : d.boutique.piece === 'envoyee'
                      ? 'Pièce envoyée : réponse en 48 h ouvrées au plus.'
                      : d.boutique.piece === 'refusee'
                        ? 'Pièce à renvoyer depuis ton espace vendeur.'
                        : 'Ajoute tes produits ; ta pièce avant de vendre.',
              )}
          action={t(d.boutique ? 'Voir' : "Commencer")}
        />
        <div className="card green cl13-advc">
          <div className="kick">
            {t("Tes avantages actifs")}
          </div>
          <div className="cl13-adv">
            <Icone nom="check" taille={17} trait={2.6} />
            <span className="grow">
              <b>
                {t(`Remboursement immédiat jusqu’à ${F(d.palier.remboursementImmediat)} F`)}
              </b>
              <span>
                {t("Un petit problème\u00A0: remboursé tout de suite.")}
              </span>
            </span>
          </div>
          <div className="cl13-adv">
            <Icone nom="check" taille={17} trait={2.6} />
            <span className="grow">
              <b>
                {t(`Paiement au comptoir jusqu’à ${F(d.palier.comptoir)} F`)}
              </b>
              <span>
                {d.palier.suivant && t(`${F(d.palier.suivant.comptoir)} F après ${d.palier.suivant.commandes} commandes sans incident.`)}
              </span>
            </span>
          </div>
        </div>
        <div className="card cl13-relc">
          <div className="kick">
            {t("Mon relais habituel")}
          </div>
          <div className="cl13-rel">
            <span className="portrait" style={{ "width": "44px", "height": "44px" }}>
              <Dessin id="ea693eb4e364" />
            </span>
            <span className="grow" style={{ "minWidth": "0" }}>
              <b className="n">
                <span className="nw">
                  {t(d.relais?.nom ?? '')}
                </span>
              </b>
              <span className="s">
                {t((d.relais?.gerant ?? '') + ' · ')}
                <span className="nw">
                  {t(d.relais?.horaires ?? '')}
                </span>
              </span>
            </span>
            <Link to="/relais-choix" className="btn secondary sm">
              <span>
                {t("Changer")}
              </span>
            </Link>
          </div>
          <p className="cl13-foot">
            {t(`Présélectionné à chaque commande · ${d.relais?.acces}.`)}
          </p>
        </div>
        </>)}
        <Bloc classe="c13-k c13-achats">
        <div className="kick cl13-gk">
          {t("Mes achats")}
        </div>
        <div className="card tight cl13-list">
          {/* Reçus (DP-54) : ce que des proches m'ont envoyé (listes, paniers, cotisations, colis) et mes envois. */}
          <Link to={chemin('recus')} className="li">
            <span className="ic or">
              <Icone nom="inbox" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ "display": "block" }}>
                {t("Reçus")}
              </span>
              <span className="ls" style={{ "display": "block" }}>
                {t(recusATraiter ? 'Listes, paniers, cotisations et colis envoyés par tes proches' : 'Rien à traiter · tes envois et leurs réponses')}
              </span>
            </span>
            {recusATraiter > 0 && <span className="cl13-cnt or">{recusATraiter}</span>}
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
          <Link to="/factures" className="li">
            <span className="ic ">
              <Icone nom="file-text" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ "display": "block" }}>
                {t("Factures")}
              </span>
              <span className="ls" style={{ "display": "block" }}>
                {t(d.compteurs.factures ? 'Une par commande retirée' : 'Aucune facture pour l’instant')}
              </span>
            </span>
            {d.compteurs.factures > 0 && <span className="cl13-cnt">{d.compteurs.factures}</span>}
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
          <Link to={avis ? `/avis-donner?ref=${avis.ref}&from=compte` : '/avis-donner'} className="li">
            <span className="ic or">
              <Icone nom="star" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ "display": "block" }}>
                {t("Avis à donner")}
              </span>
              <span className="ls" style={{ "display": "block" }}>
                {t(avis ? `${avis.article} · jusqu’au ${avis.jusqua}` : 'Rien à noter pour l’instant')}
              </span>
            </span>
            {d.avisADonner.length > 0 && <span className="cl13-cnt or">{d.avisADonner.length}</span>}
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
        </div>
        </Bloc>
        </Bloc>
        <Styles id="118b6d36f2" />
        <Bloc classe="c13-k c13-svc">
        <div className="kick cl13-gk">
          {t("Mes services BelivaY")}
        </div>
        <div className="dx-svc">
          <Module ff="FF-ABONNEMENT">
          <Link to={diaspora ? '/abonnement-offrir' : '/mon-abonnement'}>
            <span className="i v">
              <Icone nom="crown" taille={20} />
            </span>
            {t(diaspora ? 'Offrir Premium' : 'Premium')}
          </Link>
          </Module>
          {!diaspora && (
          <Module ff="FF-ABONNEMENT">
          <Link to="/cagnotte">
            <span className="i ">
              <Icone nom="piggy-bank" taille={20} />
            </span>
            {t("Cagnotte")}
          </Link>
          </Module>
          )}
          {!diaspora && (
          <Module ff="FF-ABONNEMENT">
          <Link to="/parrainage">
            <span className="i g">
              <Icone nom="user-plus" taille={20} />
            </span>
            {t("Parrainage")}
          </Link>
          </Module>
          )}
          <Link to={diaspora ? '/espace-diaspora' : '/diaspora'}>
            <span className="i b">
              <Icone nom="globe" taille={20} />
            </span>
            {t(diaspora ? 'Espace diaspora' : 'Diaspora')}
          </Link>
          <Link to="/proches">
            <span className="i g">
              <Icone nom="users" taille={20} />
            </span>
            {t("Mes proches")}
          </Link>
          <Link to="/diaspora-infos">
            <span className="i v">
              <Icone nom="circle-help" taille={20} />
            </span>
            {t("Diaspora : tout savoir")}
          </Link>
          <Module ff="FF-EX05">
          <Link to="/famille">
            <span className="i b">
              <Icone nom="users" taille={20} />
            </span>
            {t("Panier famille")}
          </Link>
          </Module>
          <Module ff="FF-LISTE-ENVIES">
          <Link to="/listes">
            <span className="i ">
              <Icone nom="gift" taille={20} />
            </span>
            {t("Listes cadeaux")}
          </Link>
          </Module>
          <Module ff="FF-EX02">
          <Link to="/cotisation">
            <span className="i a">
              <Icone nom="coins" taille={20} />
            </span>
            {t("Cotisation")}
          </Link>
          </Module>
          {!diaspora && (
          <Module ff="FF-EX03">
          <Link to="/cote">
            <span className="i a">
              <Icone nom="hand-coins" taille={20} />
            </span>
            {t("Mise de côté")}
          </Link>
          </Module>
          )}
          {!diaspora && (
          <Module ff="FF-EX04">
          <Link to="/troc">
            <span className="i g">
              <Icone nom="repeat" taille={20} />
            </span>
            {t("Troc")}
          </Link>
          </Module>
          )}
          <Module ff="FF-EX01">
          <Link to="/rentree">
            <span className="i v">
              <Icone nom="graduation-cap" taille={20} />
            </span>
            {t("Rentrée")}
          </Link>
          </Module>
          <Module ff="FF-IA">
          <Link to="/assistant">
            <span className="i ">
              <Icone nom="bot" taille={20} />
            </span>
            {t("Assistant")}
          </Link>
          </Module>
          {!diaspora && (
          <Module ff="FF-EX06">
          <Link to="/wa">
            <span className="i g">
              <Icone nom="message-circle" taille={20} />
            </span>
            {t("WhatsApp")}
          </Link>
          </Module>
          )}
        </div>
        <Module ff={['FF-ABONNEMENT', 'FF-EX05', 'FF-LISTE-ENVIES', 'FF-EX02', 'FF-EX03', 'FF-EX04', 'FF-EX01', 'FF-IA', 'FF-EX06']}>
        <p className="dx-note">
          <Icone nom="lock" taille={12} style={{ "verticalAlign": "-1px" }} />
          {t(" Prévus après le lancement\u00A0: ils s’ouvrent au fur et à mesure.")}
        </p>
        </Module>
        </Bloc>
        <Bloc classe="c13-g2 c13-g2a">
        <Bloc classe="c13-k">
        <div className="kick cl13-gk">
          {t("Mon compte et sécurité")}
        </div>
        <div className="card tight cl13-list">
          <Link to="/profil" className="li">
            <span className="ic ">
              <Icone nom="user-round" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ "display": "block" }}>
                {t("Mon profil")}
              </span>
              <span className="ls" style={{ "display": "block" }}>
                {t("Photo, nom et e-mail")}
              </span>
            </span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
          <Link to="/securite" className="li">
            <span className="ic ">
              <Icone nom="smartphone" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ "display": "block" }}>
                {t("Numéro et connexion")}
              </span>
              <span className="ls" style={{ "display": "block" }}>
                {t('Numéro vérifié · connexion ' + (client.connexion === 'google' ? 'Google' : 'e-mail'))}
              </span>
            </span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
          {!diaspora && (
          <Link to="/adresses" className="li">
            <span className="ic ">
              <Icone nom="house" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ "display": "block" }}>
                {t("Adresses de livraison")}
              </span>
              <span className="ls" style={{ "display": "block" }}>
                {t(d.adressePrincipale ? d.adressePrincipale.nom + ' · ' + d.adressePrincipale.reperes : 'Seulement pour la livraison à domicile')}
              </span>
            </span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
          )}
          <Link to="/moyens-paiement" className="li">
            <span className="ic ">
              <Icone nom="wallet" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ "display": "block" }}>
                {t("Moyens de paiement")}
              </span>
              <span className="ls" style={{ "display": "block" }}>
                {t(diaspora ? 'Carte à ton nom, Apple Pay, Google Pay' : moyens)}
              </span>
            </span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
          <Link to="/confidentialite" className="li">
            <span className="ic ">
              <Icone nom="shield-check" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ "display": "block" }}>
                {t("Confidentialité et données")}
              </span>
              <span className="ls" style={{ "display": "block" }}>
                {t("Télécharger ou supprimer mes données")}
              </span>
            </span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
        </div>
        </Bloc>
        <Bloc classe="c13-k">
        <div className="kick cl13-gk">
          {t("Préférences")}
        </div>
        <div className="card tight cl13-list">
          <Link to="/notifs-reglages" className="li">
            <span className="ic ">
              <Icone nom="bell" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ "display": "block" }}>
                {t("Notifications")}
              </span>
              <span className="ls" style={{ "display": "block" }}>
                {t("Ce que tu reçois, SMS de repli")}
              </span>
            </span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
          <Link to="/reglages" className="li">
            <span className="ic ">
              <Icone nom="settings" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ "display": "block" }}>
                {t("Langue et affichage")}
              </span>
              <span className="ls" style={{ "display": "block" }}>
                {t(affichage)}
              </span>
            </span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
        </div>
        </Bloc>
        <Bloc classe="c13-k">
        <div className="kick cl13-gk">
          {t("Aide")}
        </div>
        <div className="card tight cl13-list">
          <Link to="/aide" className="li">
            <span className="ic ">
              <Icone nom="headset" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ "display": "block" }}>
                {t("Aide et support")}
              </span>
              <span className="ls" style={{ "display": "block" }}>
                {t("Questions fréquentes · de 7\u00A0h à 21\u00A0h")}
              </span>
            </span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
          <Link to="/messagerie" className="li">
            <span className="ic ">
              <Icone nom="messages-square" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ "display": "block" }}>
                {t("Messagerie")}
              </span>
              <span className="ls" style={{ "display": "block" }}>
                {t(nonLus(d.compteurs.messagesNonLus))}
              </span>
            </span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
          <Link to="/legal" className="li">
            <span className="ic ">
              <Icone nom="scroll-text" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ "display": "block" }}>
                {t("Pages légales")}
              </span>
              <span className="ls" style={{ "display": "block" }}>
                {t("Conditions, confidentialité, retours")}
              </span>
            </span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
        </div>
        </Bloc>
        </Bloc>
        <div className="btns mt16">
          <button type="button" className="btn secondary" onClick={sortie.ouvrir}>
            <Icone nom="log-out" taille={18} />
            <span>
              {t("Se déconnecter")}
            </span>
          </button>
        </div>
        <div className="cl13-del">
          <Link to="/supprimer">
            {t("Supprimer mon compte")}
          </Link>
          <p>
            {t("Impossible tant qu’une commande ou un litige est en cours.")}
          </p>
        </div>
        </Ecran>
      )
    case "compte?st=nouveau":
      return (
        <Ecran route="compte" parEtat gabarit="compte" fixes={feuilleSortie} avant={
          <>
            <Styles id="1c3d953197" />
          </>
        }>
        <div className="cl13-pf">
          <span className="av">
            <span className="portrait" style={{ "width": "56px", "height": "56px" }}>
              <PhotoClient>
                <Dessin id="ebb567019115" />
              </PhotoClient>
            </span>
          </span>
          <span className="grow" style={{ "minWidth": "0" }}>
            <h1>
              {t(client.nomComplet)}
            </h1>
            <span className="l todo">
              {t("Numéro à vérifier avant ta première commande")}
            </span>
            <span className="l">
              {t(client.emailMasque + (client.connexion === 'google' ? ' · Google' : ''))}
            </span>
          </span>
        </div>
        {large ? (
          <div className="card c13-afaire">
            <span className="ic or">
              <Icone nom="smartphone" taille={20} />
            </span>
            <span className="grow lt">{t("Numéro à vérifier avant ta première commande")}</span>
            <Link to="/numero" className="btn primary">
              <Icone nom="smartphone" taille={18} />
              <span>{t("Vérifier mon numéro")}</span>
            </Link>
          </div>
        ) : (
        <div className="btns" style={{ "margin": "0 0 12px" }}>
          <Link to="/numero" className="btn primary">
            <Icone nom="smartphone" taille={18} />
            <span>
              {t("Vérifier mon numéro")}
            </span>
          </Link>
        </div>
        )}
        <div className="cl13-tiles">
          <Link to="/commandes?st=vide" className="cl13-tile">
            <span className="ti">
              <Icone nom="package" taille={21} />
            </span>
            <span className="tt">
              {t("Commandes")}
            </span>
          </Link>
          <Link to="/litiges?st=vide" className="cl13-tile">
            <span className="ti">
              <Icone nom="scale" taille={21} />
            </span>
            <span className="tt">
              {t("Litiges")}
            </span>
          </Link>
          <Link to="/messagerie?st=vide" className="cl13-tile">
            <span className="ti">
              <Icone nom="messages-square" taille={21} />
            </span>
            <span className="tt">
              {t("Messages")}
            </span>
          </Link>
          <Link to="/sauvegardes?st=vide" className="cl13-tile">
            <span className="ti">
              <Icone nom="heart" taille={21} />
            </span>
            <span className="tt">
              {t("Sauvegardés")}
            </span>
          </Link>
        </div>
        {!large && <ChercherCompte />}
        <Bloc classe="c13-ov c13-ov2">
        <div className="card green cl13-advc">
          <div className="kick">
            {t("Tes avantages actifs")}
          </div>
          <div className="cl13-adv">
            <Icone nom="check" taille={17} trait={2.6} />
            <span className="grow">
              <b>
                {t(`Remboursement immédiat jusqu’à ${F(d.palier.remboursementImmediat)} F`)}
              </b>
              <span>
                {t("Un petit problème\u00A0: remboursé tout de suite.")}
              </span>
            </span>
          </div>
          <div className="cl13-adv">
            <Icone nom="check" taille={17} trait={2.6} />
            <span className="grow">
              <b>
                {t(`Paiement au comptoir jusqu’à ${F(d.palier.comptoir)} F`)}
              </b>
              <span>
                {d.palier.suivant && t(`Puis ${F(d.palier.prochain ?? 0)} F, et ${F(d.palier.suivant.comptoir)} F après ${d.palier.suivant.commandes} commandes sans incident.`)}
              </span>
            </span>
          </div>
        </div>
        <div className="card cl13-relc">
          <div className="kick">
            {t("Mon relais habituel")}
          </div>
          <div className="cl13-rel">
            <span className="ic-sq">
              <Icone nom="map-pin" taille={20} />
            </span>
            <span className="grow">
              <b className="n">
                {t("Choisi à ta première commande")}
              </b>
              <span className="s">
                {t("Le plus proche de toi.")}
              </span>
            </span>
          </div>
        </div>
        </Bloc>
        <Bloc classe="c13-g2 c13-g2b">
        <Bloc classe="c13-k">
        <div className="kick cl13-gk">
          {t("Mes achats")}
        </div>
        <div className="card tight cl13-list">
          <Link to="/factures?st=vide" className="li">
            <span className="ic ">
              <Icone nom="file-text" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ "display": "block" }}>
                {t("Factures")}
              </span>
              <span className="ls" style={{ "display": "block" }}>
                {t("Aucune facture pour l’instant")}
              </span>
            </span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
        </div>
        </Bloc>
        <Bloc classe="c13-k">
        <div className="kick cl13-gk">
          {t("Mes informations")}
        </div>
        <div className="card tight cl13-list">
          <Link to="/adresses?st=vide" className="li">
            <span className="ic ">
              <Icone nom="house" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ "display": "block" }}>
                {t("Adresses de livraison")}
              </span>
              <span className="ls" style={{ "display": "block" }}>
                {t("Seulement pour la livraison à domicile")}
              </span>
            </span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
          <Link to="/moyens-paiement" className="li">
            <span className="ic ">
              <Icone nom="wallet" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ "display": "block" }}>
                {t("Moyens de paiement")}
              </span>
              <span className="ls" style={{ "display": "block" }}>
                {t("Ton numéro vérifié sera proposé")}
              </span>
            </span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
          <Link to="/notifs-reglages" className="li">
            <span className="ic ">
              <Icone nom="bell" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ "display": "block" }}>
                {t("Notifications")}
              </span>
              <span className="ls" style={{ "display": "block" }}>
                {t("Proposées après ta première commande")}
              </span>
            </span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
        </div>
        </Bloc>
        <Bloc classe="c13-k">
        <div className="kick cl13-gk">
          {t("Aide et réglages")}
        </div>
        <div className="card tight cl13-list">
          <Link to="/aide" className="li">
            <span className="ic ">
              <Icone nom="headset" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ "display": "block" }}>
                {t("Aide et support")}
              </span>
              <span className="ls" style={{ "display": "block" }}>
                {t("Questions, support de 7\u00A0h à 21\u00A0h")}
              </span>
            </span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
          <Link to="/reglages" className="li">
            <span className="ic ">
              <Icone nom="settings" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ "display": "block" }}>
                {t("Réglages")}
              </span>
              <span className="ls" style={{ "display": "block" }}>
                {t("Langue, thème, texte, connexion")}
              </span>
            </span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
          <Link to="/legal" className="li">
            <span className="ic ">
              <Icone nom="scroll-text" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ "display": "block" }}>
                {t("Pages légales")}
              </span>
              <span className="ls" style={{ "display": "block" }}>
                {t("Conditions, confidentialité, retours")}
              </span>
            </span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
        </div>
        </Bloc>
        </Bloc>
        <div className="btns mt16">
          <button type="button" className="btn secondary" onClick={sortie.ouvrir}>
            <Icone nom="log-out" taille={18} />
            <span>
              {t("Se déconnecter")}
            </span>
          </button>
        </div>
        <div className="cl13-del">
          <Link to="/supprimer">
            {t("Supprimer mon compte")}
          </Link>
          <p>
            {t("Impossible tant qu’une commande ou un litige est en cours.")}
          </p>
        </div>
        </Ecran>
      )
  }
}
