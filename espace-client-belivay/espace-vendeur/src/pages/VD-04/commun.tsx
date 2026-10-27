// Pièces partagées par les écrans de l'accueil (VD-04) et de la remise (VD-06) :
// - réseau : useEnLigne, useReseau, geste(), envoyerLaFile (réexportés du module commun src/donnees/fileHorsLigne.ts ;
//   le bandeau « Pas de connexion. Données de 09 h 14… » est monté par la coque sur tous les écrans, VD04-R14) ;
// - états de lecture (Q-86, conventions du client) : Squelette pendant le chargement (jamais de chiffre inventé),
//   ErreurLecture (réseau : « Réessayer » ; accès Préparation sur un écran d'argent : « Réservé au propriétaire »).
import { Icone } from '../../composants/Icone'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import './vd04.css'

// Réseau et file hors connexion : module commun (src/donnees/fileHorsLigne.ts). La file est rejouée et l'heure des
// données notée une seule fois pour toute l'application (useReseauGlobal, App.tsx) ; le bandeau est monté par la coque.
export { envoyerLaFile, geste, useEnLigne } from '../../donnees/fileHorsLigne'
export { useEnLigne as useReseau } from '../../donnees/fileHorsLigne'

/** Chargement : la forme des cartes, sans aucun chiffre (VD04-R06 ; Q-86). */
export function Squelette({ cartes = 3 }: { cartes?: number }) {
  const { t } = usePreferences()
  return (
    <div className="vd4-sq" aria-busy="true" aria-label={t('Chargement…')}>
      <i style={{ height: '18px', width: '55%', marginTop: '18px' }} />
      <i style={{ height: '30px', width: '80%', marginTop: '14px' }} />
      {Array.from({ length: cartes }, (_, n) => (
        <i key={n} style={{ height: '128px', marginTop: '14px', borderRadius: '20px' }} />
      ))}
    </div>
  )
}

/** Erreur de lecture : jamais un écran faux. Accès réservé : le dire ; réseau : réessayer. */
export function ErreurLecture({ erreur, relire }: { erreur: Error; relire: () => void }) {
  const { t, tf } = usePreferences()
  const s = useSession()
  if (erreur.name === 'ReserveAuProprietaire')
    return (
      <div className="empty" style={{ marginTop: '24px' }}>
        <div className="ei">
          <Icone nom="lock" taille={26} />
        </div>
        <h3>{t('Réservé au propriétaire')}</h3>
        <p>{s.proprietaire ? tf('Les montants et les versements sont réservés à {nom}, propriétaire.', { nom: `${s.proprietaire.prenom} ${s.proprietaire.nom}` }) : t('Les montants sont réservés au propriétaire de la boutique.')}</p>
      </div>
    )
  return (
    <div className="empty" style={{ marginTop: '24px' }} role="alert">
      <div className="ei">
        <Icone nom="cloud-off" taille={26} />
      </div>
      <h3>{t('Impossible de charger cet écran')}</h3>
      <p>{t('Vérifiez votre connexion, puis réessayez. Ce que vous avez déjà fait est gardé.')}</p>
      <div className="mt12" style={{ maxWidth: '260px', margin: '12px auto 0' }}>
        <button type="button" className="btn secondary" onClick={relire} style={{ height: '44px' }}>
          <Icone nom="refresh-cw" taille={18} />
          <span>{t('Réessayer')}</span>
        </button>
      </div>
    </div>
  )
}

const LETTRES = {
  fr: ['Zéro', 'Un', 'Deux', 'Trois', 'Quatre', 'Cinq', 'Six', 'Sept', 'Huit', 'Neuf', 'Dix'],
  en: ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'],
}
/** Un petit nombre en lettres (« Trois codes faux… »), sinon en chiffres. */
export const enLettres = (n: number, langue: 'fr' | 'en') => LETTRES[langue][n] ?? String(n)
