// Pièces communes des pages AJ-A : celles des écrans repris (bouton, interrupteur, feuille du bas, lien texte, annonce
// brève : VD-11 ; toast « gardé » : VD-08), et les états de lecture dans la coque AJ-A (chargement sans chiffre
// inventé, erreur avec « Réessayer », accès réservé au propriétaire).
import type { ReactNode } from 'react'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { ReserveAuProprietaire } from '../../donnees/communs'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { EcranAJ } from './coque'
import { Bouton } from '../VD-11/communs'

export { Bouton, Feuille, Interrupteur, LienTexte, CHAMP, useAnnonce } from '../VD-11/communs'
export { useToast } from '../VD-08/commun'
export { useEnLigne } from '../../donnees/fileHorsLigne'

export interface Coque {
  route: string
  titre: string
  onglet?: string | null
}

/** Chargement : la coque et des cartes d'attente sobres. */
export function Chargement({ c }: { c: Coque }) {
  const { t } = usePreferences()
  return (
    <EcranAJ route={c.route} titre={c.titre} onglet={c.onglet}>
      <div className="card" style={{ marginTop: '18px', minHeight: '96px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-busy="true">
        <span className="t13 c3">{t('Chargement…')}</span>
      </div>
    </EcranAJ>
  )
}

/** Erreur de lecture : accès réservé au propriétaire (403 owner_only), ou réseau (« Réessayer »). */
export function Erreur({ c, erreur, relire, texteReserve }: { c: Coque; erreur: Error; relire: () => void; texteReserve: string }) {
  const { t, tf } = usePreferences()
  const s = useSession()
  const reserve = erreur instanceof ReserveAuProprietaire || erreur.name === 'ReserveAuProprietaire'
  return (
    <EcranAJ route={c.route} titre={c.titre} onglet={c.onglet}>
      <div className="card" style={{ marginTop: '18px' }}>
        <div className="empty">
          <div className="ei" style={reserve ? undefined : { background: 'var(--red-soft)', color: 'var(--red)' }}>
            <Icone nom={reserve ? 'lock' : 'cloud-off'} taille={24} />
          </div>
          <h3>{t(reserve ? 'Réservé au propriétaire' : 'Cette page ne s’affiche pas')}</h3>
          <p>{reserve ? (s.proprietaire ? tf(texteReserve, { nom: `${s.proprietaire.prenom} ${s.proprietaire.nom}` }) : t('Réservé au propriétaire de la boutique.')) : t('Vérifiez votre connexion, puis réessayez. Rien de ce que vous avez saisi n’est perdu.')}</p>
        </div>
        {reserve ? (
          <Bouton classe="secondary" icone="package" vers={chemin('stock')}>
            {t('Voir le stock')}
          </Bouton>
        ) : (
          <Bouton classe="secondary" icone="refresh-cw" onClick={relire}>
            {t('Réessayer')}
          </Bouton>
        )}
      </div>
    </EcranAJ>
  )
}

/** Indice discret (icône + phrase), comme .hint-l du prototype. */
export function Indice({ icone, children }: { icone: string; children: ReactNode }) {
  return (
    <div className="hint-l">
      <Icone nom={icone} taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
      <span>{children}</span>
    </div>
  )
}

/** Télécharge un texte (CSV) sur l'appareil. */
export function telecharger(nom: string, texte: string) {
  const url = URL.createObjectURL(new Blob(['﻿' + texte], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nom
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Sélecteur à 2-4 choix (.seg) : la pastille glisse (animations du client), clavier compris. */
export function Selecteur<T extends string>({ choix, valeur, changer, etiquette }: { choix: [T, string, number?][]; valeur: T; changer: (v: T) => void; etiquette: string }) {
  const { t } = usePreferences()
  return (
    <div className="seg" role="tablist" aria-label={t(etiquette)}>
      {choix.map(([id, nom, n]) => (
        <a
          key={id}
          role="tab"
          tabIndex={0}
          aria-selected={valeur === id}
          className={valeur === id ? 'on' : ''}
          onClick={() => changer(id)}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), changer(id))}
        >
          {t(nom)}
          {n !== undefined && n > 0 && <span className="n">{String(n)}</span>}
        </a>
      ))}
    </div>
  )
}
