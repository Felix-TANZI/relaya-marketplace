// DONNÉES DE DÉMONSTRATION — compteurs de la coque, lus dans l'état RÉEL des domaines (aucun écrit) à chaque lecture de
// session : après un geste (une décision relit la session), le compteur suit. Filtrés par rôle et par zone : un rôle ne
// voit jamais le compteur d'une page qu'il n'ouvre pas.
import { pageOuverte } from '../config/droits'
import type { Badges } from '../donnees/domaines/session'
import { auPerimetre, dansPerimetre, roleCourant } from './acces'
import { kycARevoir, paliersAValider, sanctionsAOuvrir } from './acteurs'
import { lotsDuCycle, remboursementsVus } from './argent'
import { offresAModerer } from './catalogue'
import { critiquesNonDelivres, demandesSupport, incidentsActifs } from './communication'
import { fileDuRole } from './files'
import { aTraiterAcces } from './equipe'
import { alertesAInstruire, comptesAEquipe } from './gouvernance'
import { litigesOuverts } from './litiges'
import { etatsLogistique } from './logistique'
import { propositionsAContresigner } from './pilotage'
import { decisionsEnAttente } from './quatreyeux'

export function compteurs(): Badges {
  const r = roleCourant()
  const si = (route: string, n: () => number) => (pageOuverte(route, r) ? n() : 0)
  return {
    file: si('file', () => fileDuRole().length),
    litige: si('litige', () => auPerimetre(litigesOuverts().filter((l) => l.voir(r))).filter((l) => (r === 'support' ? l.niveau === 1 : r === 'mediation' ? l.niveau === 2 : true)).length),
    support: si('support', () => demandesSupport().length),
    remboursements: si('remboursements', () => remboursementsVus().filter((x) => x.etat === 'decide' || x.etat === 'a_contresigner' || x.etat === 'echoue').length),
    kyc: si('kyc', () => kycARevoir().length),
    paliers: si('paliers', () => paliersAValider().length),
    sanctions: si('sanctions', () => sanctionsAOuvrir().length),
    fraude: si('fraude', () => alertesAInstruire()),
    moderation: si('moderation', () => offresAModerer().length),
    paquets: si('paquets', () => etatsLogistique().paquets.filter((p) => dansPerimetre(p.zone) && (p.etat === 'en_retard' || p.etat === 'incident' || p.etat === 'sans_preneur')).length),
    quatreyeux: si('quatreyeux', () => decisionsEnAttente().filter((d) => d.rolesSecond.includes(r)).length),
    messagerie: si('messagerie', () => critiquesNonDelivres().length),
    panne: si('panne', () => incidentsActifs().filter((i) => i.zones.some((z) => dansPerimetre(z))).length),
    parametrage: si('parametrage', () => propositionsAContresigner().length),
    versements: si('versements', () => lotsDuCycle().filter((l) => ['controle_requis', 'a_contresigner', 'bloque', 'attente_kyc', 'relance'].includes(l.etat)).length),
    candidatures: si('candidatures', () => etatsLogistique().candidatures.filter((c) => dansPerimetre(c.zone) && (c.etat === 'nouvelle' || c.etat === 'complement')).length),
    equipe: si('roles', () => comptesAEquipe().length + (() => { const x = aTraiterAcces(); return x.demandes.length + x.alertes.length })()),
  }
}
