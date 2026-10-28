// DONNÉES DE DÉMONSTRATION — domaine « colis » (ENT-P15), lu dans les paquets (DED-01) : un colis est dans une seule
// file (RG-R117) — à ramasser tant que son arrêt n'est pas fait, sous garde de l'entreprise du code de remise du
// vendeur jusqu'au dépôt ou à la remise (ENT-RG-R26), remis ensuite (historique_remis jours). Garde longue au-delà
// d'ENT-GARDE-ALERTE heures. Étiquette pré-imprimée et QR uniques par colis, posés au ramassage (C1). Aucune identité
// client : le quartier seul pour un domicile (DED-13). Valeur déclarée : propriétaire et répartiteur (ENT-P15R-03).
import type { Colis, DomaineColis, FileColis } from '../donnees/domaines/colis'
import { HEURE, JOUR } from '../calculs/temps'
import { REGLES } from '../calculs/livraison/regles-ecrans'
import { maintenant } from './horloge'
import { exiger, roleCourant } from './acces'
import { LIEUX, livreurDe, nomUtilisateur, paquetsDemo } from './paquets'
import { idMission } from './carte'
import { repondre } from './stockage'

const ACTIFS = ['accepte', 'affecte', 'en_cours', 'incident']

function tous(t = maintenant()): Colis[] {
  const r: Colis[] = []
  for (const p of paquetsDemo.lire().paquets) {
    const actif = ACTIFS.includes(p.statut)
    const remis = p.statut === 'depose' || p.statut === 'clos'
    if (!actif && !remis) continue
    if (remis && p.deposeLe && p.deposeLe < t - REGLES.historiqueRemisJ * JOUR) continue
    const fin = LIEUX[p.arrets[p.arrets.length - 1].lieu]
    const destination = { type: fin.type === 'domicile' ? ('domicile' as const) : fin.type === 'boutique' ? ('vendeur' as const) : ('relais' as const), nom: fin.type === 'domicile' ? null : fin.nom, zone: fin.zone, quartier: fin.quartier }
    for (const c of p.colis) {
      const a = p.arrets[c.arret]
      const depart = LIEUX[a.lieu]
      const file: FileColis = remis ? 'remis' : a.fait ? 'sous_garde' : 'a_ramasser'
      const depuis = file === 'a_ramasser' ? (p.accepteLe ?? p.publieLe) : file === 'sous_garde' ? a.fait! : p.deposeLe!
      r.push({
        etiquette: c.etiquette,
        posee: !!a.fait,
        qr: `BLV:${c.etiquette.replace(/\s/g, '')}:${p.id}`,
        paquetId: p.id,
        missionId: p.livreurId ? idMission(p.id) : null,
        classe: c.classe,
        file,
        livreur: livreurDe(p, t),
        boutique: depart.nom,
        quartier: depart.quartier,
        destination,
        remisVendeurLe: a.fait,
        depuis,
        remisLe: remis ? p.deposeLe : null,
        valeurDeclaree: c.valeur,
        fragile: !!c.fragile,
        payableAuRetrait: !!c.payable,
        alerte: file === 'sous_garde' && t - depuis > REGLES.gardeH * HEURE ? 'garde_longue' : null,
      })
    }
  }
  return r
}

export const demoColis: DomaineColis = {
  // Lecture des files : l'écran Colis est fermé au comptable (ENT-02-R67) ; le tableau de bord (ENT-03) en lit le
  // nombre pour tous les rôles : la valeur déclarée n'est alors jamais envoyée au comptable (ENT-P15R-03).
  async file(file) {
    const valeur = roleCourant() !== 'comptable'
    return repondre(tous().map((c) => (valeur ? c : { ...c, valeurDeclaree: null })).filter((c) => c.file === file).sort((a, b) => (file === 'remis' ? b.depuis - a.depuis : a.depuis - b.depuis)))
  },
  async compteurs() {
    const ts = tous()
    return repondre({ a_ramasser: ts.filter((c) => c.file === 'a_ramasser').length, sous_garde: ts.filter((c) => c.file === 'sous_garde').length, remis: ts.filter((c) => c.file === 'remis').length })
  },
  async relancer(cle) {
    exiger(['proprietaire', 'repartiteur'], 'Relancer un livreur')
    const t = maintenant()
    const par = nomUtilisateur()
    paquetsDemo.ecrire((s) => {
      const p = s.paquets.find((x) => x.id === cle || x.colis.some((c) => c.etiquette === cle))
      if (!p) return
      p.relances.push({ le: t, sujet: 'colis' })
      p.journal.push({ le: t, quoi: 'relance_colis', par })
    })
    return repondre({ envoyeLe: t })
  },
}
