// Briques communes aux écrans S6 (ADM-12, ADM-13 et les pages « Tâches planifiées » et « Conservation des données ») :
// états de lecture (chargement, erreur avec Réessayer et « Signaler en Santé du système », accès refusé rendu par la
// garde), date du serveur à l'heure de Yaoundé.
import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { dateHeure } from '@client/i18n/dates'
import { PARAMETRES } from '../../calculs/registre'
import { Icone } from '../../composants/Icone'
import { Banniere } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import type { Espace } from '../../donnees/communs'
import type { Lecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useRouteOuverte } from '../../session'
import './s6.css'

/** Nom d'un espace de l'écosystème. */
export const NOM_ESPACE: Record<Espace, string> = { client: 'Client', vendeur: 'Vendeur', relais: 'Point relais', entreprise: 'Entreprise de livraison', livreur: 'Livreur', admin: 'Console' }

/** Date et heure de Yaoundé, première lettre en capitale (« Mardi 13 octobre · 14 h 05 »). */
export function useDate(): (t: number) => string {
  const { langue } = usePreferences()
  return (t) => {
    const d = dateHeure(t, langue)
    return d.charAt(0).toUpperCase() + d.slice(1)
  }
}

/**
 * Lecture en cours ou en échec. Un refus de rôle (403) remonte à la garde (« Réservé à d'autres rôles ») ; une panne
 * garde les données déjà lues et propose Réessayer et le signalement en Santé du système (prototype : admeG_err).
 */
export function EtatLecture<T>({ l, quoi, children }: { l: Lecture<T>; quoi: string; children: (d: T) => ReactNode }) {
  const { t, tf } = usePreferences()
  const ouverte = useRouteOuverte()
  if (l.erreur?.name === 'AccesRefuse') throw l.erreur
  return (
    <>
      {l.erreur && (
        <Banniere
          ton="red"
          icone="cloud-off"
          role="alert"
          className="adme-ban"
          bouton={
            <span className="adme-bb">
              <button type="button" className="btn sm secondary" onClick={l.relire}>
                <Icone nom="rotate-cw" taille={16} />
                <span>{t('Réessayer')}</span>
              </button>
              {ouverte('sante') && (
                <Link className="btn sm soft" to={chemin('sante') + '?signal=' + encodeURIComponent(quoi)}>
                  <Icone nom="activity" taille={16} />
                  <span>{t('Signaler en Santé du système')}</span>
                </Link>
              )}
            </span>
          }
        >
          <b>{tf('Impossible de charger {quoi}.', { quoi: t(quoi) })}</b> {t('Rien de ce que vous avez saisi n’est perdu.')}
        </Banniere>
      )}
      {l.donnees === null ? (
        !l.erreur && (
          <div className="e-charge" aria-busy="true" role="status">
            <Icone nom="loader" taille={18} />
            <span>{t('Chargement…')}</span>
          </div>
        )
      ) : (
        children(l.donnees)
      )}
    </>
  )
}

/** Raison de refus de la source, en mots (« motif_court » → la longueur minimale du registre). */
export function useRaison(): (raison: string, textes?: Record<string, string>) => string {
  const { t, tf } = usePreferences()
  return (raison, textes = {}) => (raison === 'motif_court' ? tf('Le motif doit compter au moins {n} caractères.', { n: PARAMETRES.console.motifMin }) : t(textes[raison] ?? 'Le geste n’a pas pu être fait. Rien n’a été appliqué.'))
}

/** Libellé d'un indicateur avec sa définition écrite au survol (lue aussi par les lecteurs d'écran) : texte, pas une
 *  cible tactile (aucun focus), pour ne pas créer de petite cible dans une tuile. */
export function Def({ t: libelle, def }: { t: string; def: string }) {
  const { t } = usePreferences()
  return (
    <span className="e-def" title={t(def)} aria-description={t(def)}>
      {t(libelle)}
      <Icone nom="info" taille={13} />
    </span>
  )
}
