// Erreurs de lecture du registre (même principe que le vendeur et moteurs/belivay_moteurs/registre.py) : une valeur
// absente ou de forme inattendue arrête la lecture au lieu de deviner un délai ou un montant.
export class ParametreAbsent extends Error {
  constructor(code: string) {
    super(`paramètre absent du registre : ${code}`)
    this.name = 'ParametreAbsent'
  }
}
export class ParametreIllisible extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ParametreIllisible'
  }
}
