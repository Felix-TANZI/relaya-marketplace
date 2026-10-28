// DONNÉES DE DÉMONSTRATION — domaine « messages » (ENT-P22) : fils avec BelivaY (accueil du pilote, support rattaché au
// litige LT-031), avec les livreurs, note d'incident IN-121. Masquage des coordonnées à l'enregistrement
// (src/calculs/ent08.ts, comme le serveur) ; fil fermé : envoi refusé ; nouveau fil du support rattaché à un dossier.
import type { DomaineMessages, Fil, Message } from '../donnees/domaines/messages'
import { masquer } from '../calculs/ent08'
import { maintenant } from './horloge'
import { T, UTILISATEURS } from './jeu-essai'
import { sessionDemo } from './acces'
import { J } from './prestations'
import { magasin, repondre } from './stockage'

const m = (id: string, de: Message['de'], auteur: string, texte: string, le: number): Message => ({ id, de, auteur, texte, le, masque: false, piece: null })

export const messagesDemo = magasin('messages', () => ({
  fils: [
    {
      id: 'FI-2',
      groupe: 'livreurs',
      titre: 'Hugo M.',
      dossier: { genre: 'incident', ref: 'IN-121', route: 'incidents', params: { id: 'IN-121' } },
      dernier: 'La boutique est fermée, j’attends la décision.',
      le: T(-6),
      nonLus: 1,
      ferme: false,
      messages: [
        m('M-21', 'moi', 'Serge M.', 'Hugo, tu passes chez Tech Bastos avant 14 h, le vendeur a confirmé.', T(-48)),
        m('M-22', 'livreur', 'Hugo M.', 'Bien reçu, j’y suis dans 20 minutes.', T(-45)),
        m('M-23', 'systeme', 'BelivaY', 'Incident IN-121 déclaré : boutique fermée (2 photos).', T(-6)),
        m('M-24', 'livreur', 'Hugo M.', 'La boutique est fermée, j’attends la décision.', T(-6)),
      ],
    },
    {
      id: 'FI-3',
      groupe: 'belivay',
      titre: 'Support · Litige LT-031',
      dossier: { genre: 'litige', ref: 'LT-031', route: 'litiges', params: { id: 'LT-031' } },
      dernier: 'Vous pouvez joindre la déclaration du livreur à votre réponse.',
      le: J(-1, 17, 30),
      nonLus: 0,
      ferme: false,
      messages: [
        m('M-31', 'systeme', 'BelivaY', 'Fil ouvert avec le dossier LT-031 : preuves de la chaîne jointes d’office.', J(-1, 17, 5)),
        m('M-32', 'moi', 'Gaëlle W.', 'Bonjour, faut-il une déclaration écrite du livreur ?', J(-1, 17, 21)),
        m('M-33', 'belivay', 'Équipe partenaires BelivaY', 'Vous pouvez joindre la déclaration du livreur à votre réponse.', J(-1, 17, 30)),
      ],
    },
    {
      id: 'FI-1',
      groupe: 'belivay',
      titre: 'Équipe partenaires BelivaY',
      dossier: { genre: 'compte', ref: 'Pilote', route: 'etat', params: {} },
      dernier: 'Point à mi-parcours : votre bilan du pilote est prévu au jour 30.',
      le: J(-3, 10, 15),
      nonLus: 1,
      ferme: false,
      messages: [
        m('M-11', 'belivay', 'Équipe partenaires BelivaY', 'Bienvenue dans le pilote : votre bilan est prévu au jour 30.', J(-22, 13, 10)),
        m('M-12', 'belivay', 'Équipe partenaires BelivaY', 'Point à mi-parcours : votre bilan du pilote est prévu au jour 30.', J(-3, 10, 15)),
      ],
    },
    {
      id: 'FI-4',
      groupe: 'incidents',
      titre: 'Incident IN-121 · Boutique fermée',
      dossier: { genre: 'incident', ref: 'IN-121', route: 'incidents', params: { id: 'IN-121' } },
      dernier: 'Décision attendue du répartiteur.',
      le: T(-6),
      nonLus: 0,
      ferme: false,
      messages: [m('M-41', 'systeme', 'BelivaY', 'Décision attendue du répartiteur.', T(-6))],
    },
    {
      id: 'FI-5',
      groupe: 'livreurs',
      titre: 'Paul E.',
      dossier: { genre: 'paquet', ref: 'PQ-Z1-261013-002', route: 'paquet', params: { id: 'PQ-Z1-261013-002' } },
      dernier: 'Tournée Melen terminée, 5 colis déposés.',
      le: J(-1, 15, 24),
      nonLus: 0,
      ferme: true,
      messages: [m('M-51', 'livreur', 'Paul E.', 'Tournée Melen terminée, 5 colis déposés.', J(-1, 15, 24))],
    },
  ] as Fil[],
}))

const moi = () => {
  const u = UTILISATEURS.find((x) => x.id === sessionDemo.lire().utilisateurId)!
  return `${u.prenom} ${u.nom.charAt(0)}.`
}

export const demoMessages: DomaineMessages = {
  async fils(groupe) {
    return repondre(messagesDemo.lire().fils.filter((f) => !groupe || f.groupe === groupe).sort((a, b) => b.le - a.le))
  },
  async lire(id) {
    if (!messagesDemo.lire().fils.find((f) => f.id === id)?.nonLus) return
    messagesDemo.ecrire((s) => void (s.fils.find((f) => f.id === id)!.nonLus = 0))
  },
  async envoyer(id, texte, piece) {
    const f = messagesDemo.lire().fils.find((x) => x.id === id)
    if (!f) return repondre({ ok: false as const, raison: 'vide' as const })
    if (f.ferme) return repondre({ ok: false as const, raison: 'ferme' as const })
    if (!texte.trim() && !piece) return repondre({ ok: false as const, raison: 'vide' as const })
    const x = masquer(texte.trim())
    const t = maintenant()
    messagesDemo.ecrire((s) => {
      const g = s.fils.find((y) => y.id === id)!
      g.messages.push({ id: 'M-' + t, de: 'moi', auteur: moi(), texte: x.texte, le: t, masque: x.masque, piece })
      g.dernier = x.texte || (piece?.nom ?? '')
      g.le = t
    })
    return repondre({ ok: true as const, masque: x.masque })
  },
  async nouveauSupport(sujet, ref, texte) {
    if (!ref.trim()) return repondre({ ok: false as const, raison: 'ref' as const })
    if (!texte.trim()) return repondre({ ok: false as const, raison: 'vide' as const })
    const t = maintenant()
    const id = 'FI-' + t
    const x = masquer(texte.trim())
    const route = { litige: ['litiges', { id: ref }], paquet: ['paquet', { id: ref }], versement: ['reglements', {}], releve: ['releves', {}], compte: ['etat', {}] }[sujet] as [string, Record<string, string>]
    messagesDemo.ecrire((s) =>
      s.fils.unshift({
        id,
        groupe: 'belivay',
        titre: `Support · ${ref.trim()}`,
        dossier: { genre: sujet, ref: ref.trim(), route: route[0], params: route[1] },
        dernier: x.texte,
        le: t,
        nonLus: 0,
        ferme: false,
        messages: [m('S-' + t, 'systeme', 'BelivaY', `Fil ouvert avec le dossier ${ref.trim()}.`, t), { ...m('M-' + t, 'moi', moi(), x.texte, t + 1), masque: x.masque }],
      }),
    )
    return repondre({ ok: true as const, id })
  },
}
