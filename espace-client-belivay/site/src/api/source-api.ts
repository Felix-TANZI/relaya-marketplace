// Source « api » : la même interface que la démonstration (src/donnees/source.ts), servie par le vrai serveur
// (relaya-marketplace, avec les applications du kit backend-kit/apps). Choisie par VITE_SOURCE=api ; les pages ne
// changent pas.
//
// - Méthodes branchées : une fabrique par domaine (src/api/domaines/<domaine>.ts : appel du contrat
//   backend-kit/openapi.yaml ou route existante de relaya, adaptateur, refus attendus), assemblées ici. Aucune
//   méthode n'est écrite dans ce fichier : chacune a une seule implémentation, dans son domaine
//   (tests/connecteurs.spec.ts vérifie qu'aucune méthode n'est définie par deux domaines).
// - Méthodes sans route côté serveur : lèvent NonDisponible('methode', 'route attendue'), route lue dans le
//   registre src/api/routes.ts (aussi la source du tableau de CONNECTEURS.md).
// Le type de `branchees` et de la fabrique garantit à la compilation que chaque méthode de Source est soit
// branchée, soit déclarée manquante : une méthode ajoutée à Source sans connecteur ne compile pas.
import type { EtatInterrupteurs } from '../config/interrupteurs'
import type { Source } from '../donnees/source'
import type { ClientApi } from './client'
import { NonDisponible } from './erreurs'
import { CONNECTEURS, type MethodeSource } from './routes'
import { domaineArgent } from './domaines/argent'
import { domaineCatalogue } from './domaines/catalogue'
import { domaineCommandes } from './domaines/commandes'
import { domaineContenus } from './domaines/contenus'
import { domaineCotisations } from './domaines/cotisations'
import { domaineDiaspora } from './domaines/diaspora'
import { domaineEchanges } from './domaines/echanges'
import { domaineFlash } from './domaines/flash'
import { domaineLegal } from './domaines/legal'
import { domaineListes } from './domaines/listes'
import { domaineLitiges } from './domaines/litiges'
import { domaineMessages } from './domaines/messages'
import { domaineModulesCl15 } from './domaines/modules-cl15'
import { domaineNotifications } from './domaines/notifications'
import { domainePaiement } from './domaines/paiement'
import { domainePanier } from './domaines/panier'
import { domainePrime } from './domaines/prime'
import { domaineProfil } from './domaines/profil'
import { domaineRelais } from './domaines/relais'
import { domaineSecurite } from './domaines/securite'
import { domaineSession } from './domaines/session'

export interface OptionsSourceApi {
  /** Interrupteurs du lancement (interrupteurs.json), à défaut de GET /api/config/flags (CAP-13). */
  interrupteurs: EtatInterrupteurs
}

/** Les fabriques de domaines, nommées (src/api/domaines/*.ts). Une méthode de Source n'apparaît que dans une seule. */
export function domainesApi(api: ClientApi, o: OptionsSourceApi) {
  return {
    session: domaineSession(api, o),
    profil: domaineProfil(api),
    securite: domaineSecurite(api),
    relais: domaineRelais(api),
    catalogue: domaineCatalogue(api),
    panier: domainePanier(api),
    paiement: domainePaiement(api),
    argent: domaineArgent(api),
    commandes: domaineCommandes(api),
    contenus: domaineContenus(api),
    litiges: domaineLitiges(api),
    messages: domaineMessages(api),
    legal: domaineLegal(api),
    notifications: domaineNotifications(api),
    prime: domainePrime(api),
    flash: domaineFlash(api),
    listes: domaineListes(api),
    echanges: domaineEchanges(api),
    cotisations: domaineCotisations(api),
    diaspora: domaineDiaspora(api),
    modulesCl15: domaineModulesCl15(api),
  }
}

export function creerSourceApi(api: ClientApi, o: OptionsSourceApi): Source {
  const d = domainesApi(api, o)
  // Méthodes branchées (appel réel). `satisfies` : chaque clé est une méthode de Source, au bon type.
  const branchees = {
    ...d.session,
    ...d.profil,
    ...d.securite,
    ...d.relais,
    ...d.catalogue,
    ...d.panier,
    ...d.paiement,
    ...d.argent,
    ...d.commandes,
    ...d.contenus,
    ...d.litiges,
    ...d.messages,
    ...d.legal,
    ...d.notifications,
    ...d.prime,
    ...d.flash,
    ...d.listes,
    ...d.echanges,
    ...d.cotisations,
    ...d.diaspora,
    ...d.modulesCl15,
    nom: 'api',
  } satisfies Partial<Source>

  // Toutes les autres méthodes : NonDisponible, avec la route attendue (src/api/routes.ts).
  type Manquante = Exclude<MethodeSource, keyof typeof branchees>
  const manquantes = Object.fromEntries(
    (Object.keys(CONNECTEURS) as MethodeSource[])
      .filter((m) => !(m in branchees))
      .map((m) => [m, () => Promise.reject(new NonDisponible(m, CONNECTEURS[m].route))]),
  ) as unknown as Pick<Source, Manquante>

  return { ...manquantes, ...branchees }
}
