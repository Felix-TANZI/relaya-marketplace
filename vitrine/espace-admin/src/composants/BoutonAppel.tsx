// Bouton « Appeler » de la console : appel masqué à un acteur (client, vendeur, livreur, relais, entreprise) pour une
// explication, une intervention ou un déblocage (DP-61 : aucun numéro affiché, ni le sien ni celui de l'employé).
// L'appel s'ouvre dans le panneau flottant commun (composants/AppelEnCours.tsx) : il ne bloque jamais la console, se
// réduit en bulle et suit l'employé de page en page. Journal d'audit : la fin de l'appel (qui, quoi, durée, jamais le
// contenu) et chaque note de l'employé.
import { lancerAppel, useAppel } from './AppelEnCours'
import { Icone } from './Icone'
import { source } from '../donnees/source'
import { usePreferences } from '../preferences'

export function BoutonAppel({ nom, qui, motif, objet, libelle, classe = 'btn secondary', petit, noter }: {
  nom: string
  qui: string
  motif: string
  objet: string
  libelle?: string
  classe?: string
  petit?: boolean
  /** Note propre à la page (un dossier de litige en fait une preuve) ; sinon, une ligne du journal d'audit. */
  noter?: (note: string) => Promise<void | string>
}) {
  const { t, tf } = usePreferences()
  const a = useAppel()
  const enCours = !!a && a.fin === null && a.demande.nom === nom
  const appeler = () =>
    lancerAppel({
      nom,
      qui,
      motif,
      raccrocher: (d) => void source.gouvernance.ecrire({ action: 'appel.masque', objet, motif, apres: tf('{d} s', { d }) }),
      noter: noter ?? ((note) => void source.gouvernance.ecrire({ action: 'appel.note', objet, motif: note })),
    })
  return (
    <button type="button" className={classe + (petit ? ' sm' : '')} onClick={appeler} aria-label={tf('Appeler {n} (appel masqué)', { n: nom })} aria-pressed={enCours || undefined}>
      <Icone nom="phone" taille={petit ? 16 : 18} />
      <span>{enCours ? t('Appel en cours') : (libelle ?? t('Appeler'))}</span>
    </button>
  )
}
