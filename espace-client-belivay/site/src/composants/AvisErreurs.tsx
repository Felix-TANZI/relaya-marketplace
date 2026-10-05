// Message bref quand une action échoue sans que l'écran l'ait prévu (erreur non attrapée venue du serveur) :
// fonction pas encore branchée côté serveur (NonDisponible, voir CONNECTEURS.md), réseau, délai, serveur occupé,
// session expirée. Le client sait toujours ce qui se passe au lieu d'un bouton qui ne répond pas.
// Aussi : les réponses spéciales du serveur (src/api/reponses-speciales.ts), quel que soit l'écran qui appelle :
// - session perdue (401) : la session de l'interface se ferme ; sur une page du compte ou du paiement, reconnexion
//   puis retour à la page où le client était (ailleurs, le message seul : la page publique reste lisible) ;
// - prix changé au paiement (409 price_changed) : l'écran « Un prix a changé », qui relit le panier vérifié ;
// - 3-D Secure ou vérification renforcée (422 action_requise) : la page de la banque ;
// - trop de requêtes (429) : « Réessaie dans X s » (en minutes au-delà de deux minutes).
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { ErreurApi, ErreurTropDeRequetes, GenreErreur } from '../api/erreurs'
import { EVENEMENT_ACTION_REQUISE, EVENEMENT_PRIX_CHANGE, EVENEMENT_SESSION_PERDUE } from '../api/reponses-speciales'
import { EXIGE_COMPTE, chemin } from '../config/pages'
import { source } from '../donnees/source'
import { Toast } from '../pages/CL-05/Commun'
import { usePreferences } from '../preferences'
import { useMajSession } from '../session'

const TEXTES: Partial<Record<GenreErreur, string>> = {
  non_disponible: 'Cette fonction arrive bientôt. Réessaie plus tard ou écris au support.',
  reseau: 'Pas de connexion. Vérifie ton réseau puis réessaie.',
  delai: 'Le réseau est lent : rien n’a été fait, réessaie.',
  serveur: 'Le service est momentanément indisponible. Réessaie dans un instant.',
  trop_de_requetes: 'Trop de demandes d’un coup : attends quelques secondes.',
  non_authentifie: 'Ta session a expiré : reconnecte-toi.',
  interdit: 'Cette action ne t’est pas permise.',
}

// Pages qui demandent la session : une session perdue y renvoie vers la connexion (puis ici).
const AVEC_SESSION = (route: string) => EXIGE_COMPTE.has(route) || route.startsWith('paiement') || route === 'validee' || route === 'confirmee'

export function AvisErreurs() {
  const { t, tf } = usePreferences()
  const naviguer = useNavigate()
  const lieu = useLocation()
  const majSession = useMajSession()
  const [texte, setTexte] = useState<string | null>(null)
  const ici = useRef('')
  ici.current = lieu.pathname + lieu.search

  useEffect(() => {
    let minuteur = 0
    const montrer = (m: string) => {
      setTexte(m)
      window.clearTimeout(minuteur)
      minuteur = window.setTimeout(() => setTexte(null), 3500)
    }
    const ecouter = (ev: PromiseRejectionEvent) => {
      // Reconnue par son genre plutôt que par sa classe : une erreur venue d'une autre copie du module (rechargement
      // à chaud, morceau chargé à part) reste comprise.
      const r = ev.reason as Partial<ErreurApi & ErreurTropDeRequetes> | null
      if (!r || typeof r !== 'object' || typeof r.genre !== 'string') return
      if (r.genre === 'trop_de_requetes' && r.reessayerDans) {
        const s = Math.ceil(r.reessayerDans)
        return montrer(s < 120 ? tf('Trop de demandes : réessaie dans {s} s.', { s }) : tf('Trop de demandes : réessaie dans {m} min.', { m: Math.ceil(s / 60) }))
      }
      const m = TEXTES[r.genre]
      if (m) montrer(t(m))
    }
    const sessionPerdue = () => {
      montrer(t('Ta session a expiré : reconnecte-toi.'))
      source.session().then(majSession, () => undefined)
      const page = ici.current
      if (AVEC_SESSION(page.split('?')[0].replace(/^\/+/, ''))) naviguer(chemin('connexion', { next: page }), { replace: true })
    }
    const prixChange = () => naviguer(chemin('prix-change'), { replace: true })
    const actionRequise = (ev: Event) => {
      const u = (ev as CustomEvent<{ redirection: string | null }>).detail?.redirection
      if (u) window.location.assign(u)
      else montrer(t('Ta banque demande une confirmation : réessaie dans un instant.'))
    }
    window.addEventListener('unhandledrejection', ecouter)
    window.addEventListener(EVENEMENT_SESSION_PERDUE, sessionPerdue)
    window.addEventListener(EVENEMENT_PRIX_CHANGE, prixChange)
    window.addEventListener(EVENEMENT_ACTION_REQUISE, actionRequise)
    return () => {
      window.removeEventListener('unhandledrejection', ecouter)
      window.removeEventListener(EVENEMENT_SESSION_PERDUE, sessionPerdue)
      window.removeEventListener(EVENEMENT_PRIX_CHANGE, prixChange)
      window.removeEventListener(EVENEMENT_ACTION_REQUISE, actionRequise)
      window.clearTimeout(minuteur)
    }
  }, [t, tf, naviguer, majSession])
  return <Toast texte={texte} />
}
