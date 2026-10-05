// Recherche « Chercher dans mon compte » (DP-54) : partagée par l'écran Mon compte et le menu du compte des grands
// écrans (composants/MenuCompte.tsx).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { Interrupteur } from '../../config/interrupteurs'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'

// DP-54 : tout trouver vite. Une recherche dans le compte : le client tape « code », « argent », « relais »… et
// la bonne page s'ouvre. Les modules fermés n'y sont pas.
type Entree = { r: string; titre: string; sous: string; mots: string; ic: string; ff?: Interrupteur; p?: Record<string, string> }
const ENTREES: Entree[] = [
  { r: 'commandes', titre: 'Mes commandes', sous: 'Suivi, code de retrait, annuler, modifier', mots: 'colis code retrait suivi livraison annuler relais commande', ic: 'package' },
  { r: 'litiges', titre: 'Litiges', sous: 'Signaler un problème, suivre un dossier', mots: 'probleme retour rembourser remboursement casse abime faux dossier', ic: 'scale' },
  { r: 'messagerie', titre: 'Messages', sous: 'Support, vendeurs, relais', mots: 'message support vendeur discuter ecrire', ic: 'messages-square' },
  { r: 'fil', p: { id: 'support', st: 'nouveau' }, titre: 'Écrire au support', sous: 'Réponse sous 2 h, de 7 h à 21 h', mots: 'aide support question contacter joindre plainte', ic: 'headset' },
  { r: 'wallet', titre: 'Portefeuille BelivaY', sous: 'Solde, recharger, retirer, historique', mots: 'argent solde wallet portefeuille recharger retirer momo orange remboursement cagnotte', ic: 'wallet', ff: 'FF-WALLET' },
  { r: 'factures', titre: 'Factures', sous: 'Une par commande retirée, en PDF', mots: 'facture recu pdf justificatif', ic: 'file-text' },
  { r: 'avis-donner', titre: 'Avis à donner', sous: 'Noter le vendeur et le relais', mots: 'avis note etoile', ic: 'star' },
  { r: 'sauvegardes', titre: 'Sauvegardés', sous: 'Les articles gardés pour plus tard', mots: 'favori sauvegarde coeur plus tard', ic: 'heart' },
  { r: 'listes', titre: 'Mes listes d’envies', sous: 'Créer, mettre en statut, se faire offrir', mots: 'liste envie envies wishlist cadeau cadeaux anniversaire mariage naissance statut offrir', ic: 'gift', ff: 'FF-LISTE-ENVIES' },
  { r: 'relais-choix', titre: 'Mon relais habituel', sous: 'Changer de point relais', mots: 'relais point quartier changer retrait', ic: 'map-pin' },
  { r: 'adresses', titre: 'Adresses', sous: 'Livraison à domicile, repères', mots: 'adresse domicile maison repere livraison', ic: 'house' },
  { r: 'moyens-paiement', titre: 'Moyens de paiement', sous: 'Numéros Mobile Money, carte', mots: 'paiement momo mtn orange carte visa numero', ic: 'credit-card' },
  { r: 'profil', titre: 'Mon profil', sous: 'Photo, nom et e-mail', mots: 'nom prenom photo email profil', ic: 'user-round' },
  { r: 'numero-changer', titre: 'Changer de numéro', sous: 'Un code à l’ancien, un code au nouveau', mots: 'numero telephone changer sim', ic: 'smartphone' },
  { r: 'securite', titre: 'Sécurité', sous: 'Face ID, empreinte, appareils connectés', mots: 'securite empreinte face id appareil connexion pirate vole', ic: 'shield-check' },
  { r: 'confidentialite', titre: 'Confidentialité et données', sous: 'Qui voit quoi, télécharger tes données', mots: 'donnees confidentialite vie privee telecharger', ic: 'lock' },
  { r: 'notifs-reglages', titre: 'Notifications', sous: 'Ce que tu reçois, SMS de secours', mots: 'notification sms alerte prevenir', ic: 'bell' },
  { r: 'reglages', titre: 'Réglages', sous: 'Langue, thème, taille du texte, données', mots: 'langue anglais english theme sombre texte donnees economie', ic: 'settings' },
  { r: 'aide', titre: 'Aide', sous: 'Questions fréquentes, WhatsApp, rappel', mots: 'aide faq question comment', ic: 'life-buoy' },
  { r: 'legal', titre: 'Pages légales', sous: 'Conditions, confidentialité, retours, diaspora', mots: 'conditions cgu cgv legal loi retour garde', ic: 'scroll-text' },
  { r: 'devenir-vendeur', titre: 'Devenir vendeur', sous: 'Ouvrir ma boutique', mots: 'vendre vendeur boutique', ic: 'store' },
  { r: 'espace-diaspora', titre: 'Espace diaspora', sous: 'Proches, paniers à payer, commandes envoyées, devise', mots: 'diaspora etranger proche famille payer devise euro dollar', ic: 'globe' },
  { r: 'paniers-proches', titre: 'À payer pour mes proches', sous: 'Les paniers envoyés entre proches reliés', mots: 'payer panier proche diaspora demande', ic: 'inbox' },
  { r: 'proches', titre: 'Mes proches', sous: 'Les proches reliés, à l’étranger ou au pays', mots: 'proche famille diaspora etranger lien', ic: 'users' },
  { r: 'famille', titre: 'Panier famille', sous: 'Un colis par mois pour un proche', mots: 'famille panier mensuel village colis', ic: 'users', ff: 'FF-EX05' },
  { r: 'mon-abonnement', titre: 'Premium', sous: 'Mon abonnement', mots: 'premium abonnement', ic: 'crown', ff: 'FF-ABONNEMENT' },
  { r: 'parrainage', titre: 'Parrainage', sous: 'Inviter un ami', mots: 'parrain inviter ami', ic: 'user-plus', ff: 'FF-ABONNEMENT' },
  { r: 'supprimer', titre: 'Supprimer mon compte', sous: 'Ce qui est effacé, ce qui est gardé', mots: 'supprimer fermer compte effacer quitter', ic: 'trash-2' },
]
const sansAccents = (x: string) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export function ChercherCompte() {
  const { t, tf } = usePreferences()
  const { interrupteurs } = useSession()
  const [q, setQ] = useState('')
  const mots = sansAccents(q.trim()).split(/\s+/).filter(Boolean)
  const trouves = mots.length
    ? ENTREES.filter((e) => (!e.ff || interrupteurs[e.ff]) && mots.every((m) => sansAccents(`${t(e.titre)} ${e.titre} ${e.sous} ${e.mots}`).includes(m)))
    : []
  return (
    <div className="fld" style={{ marginTop: 0, marginBottom: 12 }}>
      <div className={'inp' + (q ? ' focus' : '')}>
        <Icone nom="search" taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
        <input type="search" aria-label={t('Chercher dans mon compte')} placeholder={t('Chercher : code, argent, relais, facture…')} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {mots.length > 0 && (
        <div className="card tight mt8" role="list" aria-label={tf('{n} résultat(s)', { n: trouves.length })}>
          {trouves.map((e) => (
            <Link key={e.titre} to={chemin(e.r, e.p)} className="li" role="listitem">
              <span className="ic">
                <Icone nom={e.ic} taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ display: 'block' }}>
                  {t(e.titre)}
                </span>
                <span className="ls" style={{ display: 'block' }}>
                  {t(e.sous)}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
          ))}
          {!trouves.length && (
            <Link to={chemin('aide')} className="li" role="listitem">
              <span className="ic">
                <Icone nom="search-x" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ display: 'block' }}>
                  {t('Rien dans ton compte pour ce mot')}
                </span>
                <span className="ls" style={{ display: 'block' }}>
                  {t('Cherche dans l’aide ou écris au support')}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

