// Envoi des e-mails des comptes (lien de mot de passe oublié, invitation). Une interface `Envoyeur` ; un seul
// adaptateur réel : Resend, quand RESEND_API_KEY est défini. Sans clé, AUCUN envoi n'est simulé : les parcours disent
// qu'il faut contacter le support (mot de passe oublié) ou donnent le lien à l'invitant pour qu'il le transmette.

/** @typedef {{ a: string, sujet: string, texte: string }} Message */
/** @typedef {{ envoyer: (m: Message) => Promise<boolean> }} Envoyeur */

/** @returns {Envoyeur | null} */
export function envoyeurDeLEnvironnement(envir = process.env) {
  const cle = envir.RESEND_API_KEY
  if (!cle) return null
  const de = envir.EMAIL_EXPEDITEUR || 'BelivaY <onboarding@resend.dev>'
  return {
    async envoyer(m) {
      try {
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: de, to: [m.a], subject: m.sujet, text: m.texte }),
          signal: AbortSignal.timeout(8000),
        })
        // Jamais l'adresse dans le journal : seulement le statut.
        if (!r.ok) console.warn('[comptes] envoi e-mail refusé', r.status)
        return r.ok
      } catch {
        console.warn('[comptes] envoi e-mail impossible')
        return false
      }
    },
  }
}

/** Envoyeur des tests : garde les messages en mémoire. */
export function envoyeurMemoire() {
  /** @type {Message[]} */
  const boite = []
  return { boite, envoyer: async (/** @type {Message} */ m) => (boite.push(m), true) }
}
