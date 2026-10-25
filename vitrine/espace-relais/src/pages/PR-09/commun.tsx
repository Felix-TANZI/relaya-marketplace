// Éléments communs des écrans PR-09 (Argent et performance) : accès du gérant seul (VER-06, ARL-06 : l'employé reçoit
// « Accès réservé au gérant », même sur une route que config/droits.ts n'a pas encore déclarée), états de chargement,
// d'erreur et de réseau requis, origine des gestes, montants (F() du client) et libellés partagés.
import { useState, type ReactNode } from 'react'
import { F } from '@client/i18n/format'
import { AccesReserve } from '../../composants/AccesReserve'
import { usePeut, usePeutOuvrir } from '../../config/droits'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { origine } from '../../donnees/fileHorsLigne'
import type { ClasseColis } from '../../donnees/communs'
import type { LigneVersement } from '../../donnees/domaines/argent'
import type { Decision, IdCritere } from '../../donnees/domaines/qualite'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import './pr09.css'

/** Montant écrit comme dans le prototype : « 11 600 F », « −1 400 F ». */
export const francs = (n: number) => F(n) + ' F'

/** Le membre connecté voit-il l'argent et la performance du relais (droit « argent », gérant seul) ? */
export function useGerant(): boolean {
  return usePeut('voirMontantsRemuneration')
}

/** Écran du gérant seul (droit « argent » déclaré pour la route dans config/droits.ts ; la garde des routes refuse déjà
 * l'employé, ceci reste une seconde barrière) : « Accès réservé au gérant », dans la vraie coque de la route. */
export function EcranGerant(p: { route: string; titre?: string; fixes?: ReactNode; children: ReactNode }) {
  const peut = usePeutOuvrir(p.route)
  if (!peut) return <AccesReserve route={p.route} />
  return (
    <Ecran route={p.route} titre={p.titre} fixes={p.fixes}>
      {p.children}
    </Ecran>
  )
}

/** Origine d'un geste à l'heure du serveur (clé d'idempotence). */
export function useOrigine() {
  const s = useSession()
  const [decalage] = useState(() => s.maintenant - Date.now())
  return () => origine(Date.now() + decalage)
}

/** Chargement : la forme de l'écran en gris, annoncée aux lecteurs d'écran. */
export function Chargement({ lignes = 3 }: { lignes?: number }) {
  const { t } = usePreferences()
  return (
    <div className="p-0hxmj8 r-pile" role="status" aria-live="polite">
      <span className="r9-cache">{t('Chargement…')}</span>
      <div className="r9-squelette r9-squelette-haut" />
      {Array.from({ length: lignes }, (_, k) => (
        <div key={k} className="r9-squelette" />
      ))}
    </div>
  )
}

/** Lecture impossible (réseau, serveur) : jamais un écran faux ; « Réessayer » relit. */
export function ErreurLecture({ relire, erreur }: { relire: () => void; erreur: Error }) {
  const { t } = usePreferences()
  const reserve = /acces_reserve/.test(erreur.message)
  return (
    <div className="p-0hxmj8">
      <div className="r-vide" role="alert">
        <div className="r-vide-i r-rouge">
          <Icone nom={reserve ? 'r-cadenas' : 'r-reseau'} taille={28} />
        </div>
        <h2>{reserve ? t('Accès réservé au gérant') : t('Impossible de charger cet écran')}</h2>
        <p>{reserve ? t('Cet écran touche l’argent ou la gestion du relais. Demandez au gérant : il peut aussi vous donner ce droit depuis Mon équipe, quand la règle le permet.') : t('Le réseau ou le serveur ne répond pas. Vos données ne sont pas perdues : réessayez dans un instant.')}</p>
      </div>
      {!reserve && (
        <button type="button" className="r-btn r-second" onClick={relire}>
          <Icone nom="refresh-cw" taille={20} />
          <span>{t('Réessayer')}</span>
        </button>
      )}
    </div>
  )
}

/** Note « il faut du réseau » (changement de numéro MOM-06, paiement Mobile Money) : remplace le bandeau commun. */
export function ReseauRequis({ children }: { children: ReactNode }) {
  return (
    <div className="p-fht1zk" data-hors-ligne="" role="status">
      <Icone nom="r-reseau" taille={18} className="p-lhsznn" />
      <div>{children}</div>
    </div>
  )
}

/** Libellé d'une classe de colis (RELAIS-GAIN-COLIS : petit, moyen, encombrant). */
export const CLASSES: Record<ClasseColis, [string, string]> = {
  S: ['Petits colis remis', 'Retours déposés · petits'],
  M: ['Colis moyens', 'Retours déposés · moyens'],
  L: ['Encombrants', 'Retours déposés · encombrants'],
}

/** Libellé d'une ligne du relevé (texte français exact, traduit par t()). */
export function libelleLigne(l: LigneVersement): string {
  switch (l.type) {
    case 'colis':
      return CLASSES[l.classe!][0]
    case 'retour':
      return CLASSES[l.classe!][1]
    case 'jour_garde':
      return 'Jours de garde'
    case 'jour_offert_belivay':
      return '1er jour payé par BelivaY'
    case 'jour_paye_belivay':
      return 'Jours payés par BelivaY (renvois)'
    case 'especes_part_relais':
      return 'Espèces de garde : votre part, déjà en caisse'
    case 'especes_part_belivay':
      return 'Espèces de garde : part BelivaY'
    case 'bonus_comptoir':
      return 'Colis payés au comptoir'
    case 'frais_versement':
      return 'Frais Mobile Money du versement (1 %)'
    case 'retenue_fiscale':
      return 'Retenue fiscale'
    case 'report':
      return 'Report de la semaine précédente'
    case 'retenue_perte':
      return 'Retenue après arbitrage'
  }
}

export const ETATS_VERSEMENT: Record<string, [string, 'vert' | 'accent' | 'ambre' | 'rouge' | 'neutre']> = {
  prevu: ['prévu', 'accent'],
  envoye: ['envoyé', 'ambre'],
  credite: ['crédité', 'vert'],
  refuse: ['refusé', 'rouge'],
  suspendu: ['suspendu', 'rouge'],
}

export const CRITERES: Record<IdCritere, string> = {
  ponctualite: 'Ponctualité',
  stockage: 'Sécurité du stockage',
  satisfaction: 'Satisfaction',
  litiges: 'Litiges',
  anciennete: 'Ancienneté',
}
export const NIVEAUX: Record<number, string> = { 1: 'Avertissement', 2: 'Visibilité réduite', 3: 'Suspension', 4: 'Exclusion' }

/** Décision encore contestable (TRU-07) ou en examen : elle se montre en tête. */
export const aContester = (d: Decision, t: number) => (!d.contestation && d.contestableJusqua !== null && d.contestableJusqua > t) || d.contestation?.etat === 'en_examen'

