// Litiges (CL-11) : ce que partagent la liste, le parcours et le suivi (DP-54).
import type { EtapeRetour, EtatLitige, Litige } from '../../donnees/source'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'

export const EN_COURS: EtatLitige[] = ['attente', 'conteste', 'silence', 'examen', 'arrangement']
export const enCours = (l: Litige) => EN_COURS.includes(l.etat)

// Étapes du dossier (Reçu, le vendeur répond, examen, décision) : combien sont faites.
export function etapes(l: Litige): number {
  if (l.etat === 'attente' || l.etat === 'arrangement') return 1
  if (l.etat === 'conteste' || l.etat === 'silence' || l.etat === 'examen') return 2
  return 4
}

const H = 3600 * 1000
// Délais décidés par le porteur (DP-35, DP-15, DP-27) : BelivaY tranche au plus 24 h après l'échéance du vendeur ;
// un recours, une fois, sous 48 h après la décision (l'argent reste bloqué) ; 5 jours pour répondre à un
// arrangement ; trajet retour 500 F à la charge de la partie en tort ; remplacement renvoyé sous 72 h ouvrées.
export const DECISION_H = 24
export const RECOURS_H = 48
export const ARRANGEMENT_J = 5
export const TRAJET_RETOUR = 500
export const decisionAvant = (l: Litige) => l.echeance + DECISION_H * H
export const finRecours = (l: Litige) => (l.decision ? l.decision.le + RECOURS_H * H : 0)
// Une décision contre le client se conteste une fois, sous 48 h.
export const contestable = (l: Litige, maintenant: number) => l.etat === 'refuse' && !!l.decision && !l.decision.conteste && maintenant < finRecours(l)

// Où va l'argent d'un remboursement (REMB-DESTINATION, DP-06, DP-17, DP-50) : payé par carte, sur la même carte ;
// sinon sur le Portefeuille BelivaY quand il est ouvert (FF-WALLET), crédité dès la décision et retirable vers
// Mobile Money sans frais ; portefeuille fermé : sur le moyen d'origine, sous 1 h (REMB-MOMO-H).
export const parCarte = (payePar: string | null) => !!payePar && /^carte|visa|mastercard/i.test(payePar)
export function useRemboursement(payePar: string | null) {
  const { t, tf } = usePreferences()
  const { interrupteurs } = useSession()
  const carte = parCarte(payePar)
  const portefeuille = !carte && interrupteurs['FF-WALLET']
  const ou = carte
    ? payePar
      ? tf('sur la carte qui a payé ({p})', { p: payePar })
      : t('sur la carte qui a payé')
    : portefeuille
      ? t('sur ton Portefeuille BelivaY')
      : payePar
        ? tf('sur ton {moyen}', { moyen: payePar })
        : t('sur le moyen qui a payé la commande')
  const quand = carte ? t('le délai d’affichage dépend de ta banque') : portefeuille ? t('dès la décision') : t('sous 1 h')
  const ensuite = carte ? null : portefeuille ? t('Tu paies une commande avec, ou tu le retires vers ton Mobile Money : sans frais pour un remboursement.') : null
  return { ou, quand, ensuite, carte, portefeuille }
}

export const heuresRestantes = (l: Litige, maintenant: number) => Math.max(0, Math.ceil((l.echeance - maintenant) / H))

// Libellé d'état (liste et suivi) et ton de la pastille.
export function libelle(l: Litige, maintenant: number): { texte: string; v?: Record<string, string | number>; ton: 'neu' | 'calm' | 'warn' | 'bad' } {
  switch (l.etat) {
    case 'attente':
      return { texte: `En litige · réponse sous ${heuresRestantes(l, maintenant)} h`, ton: 'neu' }
    case 'arrangement':
      return { texte: 'Arrangement proposé · à toi de répondre', ton: 'warn' }
    case 'conteste':
    case 'examen':
      return { texte: 'En examen par BelivaY', ton: 'neu' }
    case 'silence':
      return { texte: 'En examen · en priorité', ton: 'neu' }
    case 'accepte':
      return { texte: 'Le vendeur a accepté', ton: 'calm' }
    case 'rembourse':
      return { texte: 'Remboursé · {m}\u00A0F', v: { m: F(l.arrangement?.montant ?? l.montant) }, ton: 'calm' }
    case 'remplace':
      return { texte: 'Remplacement en route', ton: 'calm' }
    case 'refuse':
      return { texte: 'Refusé · motif écrit', ton: 'bad' }
    case 'signal':
      return { texte: 'Signalé · merci', ton: 'calm' }
    case 'retire':
      return { texte: 'Retiré par toi', ton: 'calm' }
  }
}

// Dossier introuvable ou sans suite (retour, remplacement, arrangement) : un écran clair, jamais une page vide.
export const ETAPES_RETOUR: { k: EtapeRetour; titre: string; sous: string }[] = [
  { k: 'depot', titre: 'Tu déposes le colis au relais', sous: 'Le gérant le scanne et le photographie' },
  { k: 'depose', titre: 'Le livreur le récupère', sous: 'dans sa tournée, sans course spéciale' },
  { k: 'collecte', titre: 'Le vendeur le reçoit et l’inspecte', sous: 'sous 48 h' },
  { k: 'inspection', titre: 'Dossier clos', sous: 'remboursement sur le moyen qui a payé' },
]
export const ORDRE_RETOUR: EtapeRetour[] = ['depot', 'depose', 'collecte', 'inspection', 'clos']
