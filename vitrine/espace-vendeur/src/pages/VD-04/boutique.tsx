// Pièces de l'accueil partagées par ses états (accueil, rien à faire) : le bouton du prototype (C.btn) et la carte
// « Boutique ouverte / fermée aujourd'hui », dont le geste marche hors connexion (mis en file : Q-93).
import { type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { source } from '../../donnees/source'
import { echeance, heure } from '../../i18n/temps'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { geste } from './commun'

// Bouton du prototype (C.btn) : un lien quand il mène ailleurs, un bouton quand c'est un geste.
export function Bouton(p: { classe: string; icone?: string; vers?: string; onClick?: (e: MouseEvent) => void; style?: CSSProperties; children: ReactNode }) {
  const contenu = (
    <>
      {p.icone && <Icone nom={p.icone} taille={18} />}
      <span>{p.children}</span>
    </>
  )
  return p.vers ? (
    <Link to={p.vers} style={p.style} className={'btn ' + p.classe} onClick={p.onClick}>
      {contenu}
    </Link>
  ) : (
    <button type="button" style={p.style} className={'btn ' + p.classe} onClick={p.onClick}>
      {contenu}
    </button>
  )
}

/** « Fermer aujourd'hui » / « Rouvrir maintenant » : tout de suite en ligne, en file hors connexion. */
export function useFermer(enLigne: boolean, apres?: (fermee: boolean) => void) {
  return async (fermee: boolean) => {
    const fait = await geste(enLigne, fermee ? 'fermer' : 'rouvrir', fermee ? 'Fermer aujourd’hui' : 'Rouvrir maintenant', () => source.boutique.fermerAujourdhui(fermee))
    jouer('interrupteur')
    apres?.(fermee)
    return fait
  }
}

export function EtatBoutique({ fermee, aPreparer, rouvrir, fermer, enFile }: { fermee: boolean; aPreparer: number; rouvrir: () => void; fermer: () => void; enFile?: boolean }) {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  // « Fermer aujourd'hui » dure jusqu'à la prochaine ouverture réelle (Q-39) : l'heure vient de la boutique.
  const jusqua = useLecture(() => (fermee ? source.boutique.boutique().then((b) => b.fermeeJusqua) : Promise.resolve(null)), [fermee]).donnees ?? null
  if (fermee)
    return (
      <div className="card" style={{ border: '1.5px solid var(--red-line)', background: 'var(--red-soft)' }}>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <span style={{ width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: '0', background: 'var(--card)', color: 'var(--red)' }}>
            <Icone nom="calendar-x" taille={20} />
          </span>
          <div className="grow">
            <div className="b8 t15 cr">{t('Boutique fermée aujourd’hui')}</div>
            <div className="t13 c2 mt4" style={{ lineHeight: '1.45' }}>
              {jusqua !== null
                ? tf('Les nouvelles commandes vont à d’autres vendeurs jusqu’à {quand}.', { quand: echeance(jusqua, s.maintenant, langue) })
                : tf('Les nouvelles commandes vont à d’autres vendeurs jusqu’à demain {h}.', { h: heure('08:00', langue) })}
            </div>
            {aPreparer > 0 && (
              <div className="t13 c2 mt4" style={{ lineHeight: '1.45' }}>
                {aPreparer === 1 ? t('La commande déjà reçue reste à préparer.') : tf('Les {n} commandes déjà reçues restent à préparer.', { n: aPreparer })}
              </div>
            )}
          </div>
        </div>
        <div className="mt12">
          <Bouton classe="secondary" icone="store" onClick={rouvrir} style={{ height: '44px' }}>
            {t('Rouvrir maintenant')}
          </Bouton>
        </div>
      </div>
    )
  return (
    <div className="card" style={{ padding: '10px 12px 10px 16px' }}>
      <div className="row">
        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 0 4px var(--green-soft)', flexShrink: '0' }}></span>
        <div className="grow">
          <div className="b8 t15">{t('Boutique ouverte')}</div>
          <div className="t13 c3 mt4">{enFile ? t('Fermeture en attente d’envoi') : tf('Jusqu’à {h}', { h: heure(s.boutique?.fermeA ?? '18:00', langue) })}</div>
        </div>
        <Bouton classe="secondary sm" onClick={fermer} style={{ height: '44px' }}>
          {t('Fermer aujourd’hui')}
        </Bouton>
      </div>
    </div>
  )
}

/** Pied de l'accueil : connexion et actions en attente d'envoi (vers l'écran Hors connexion quand il y en a). */
export function PiedConnexion({ enLigne, enAttente }: { enLigne: boolean; enAttente: number }) {
  const { t, tf } = usePreferences()
  const texte = !enLigne
    ? tf('Connexion perdue · {n} action(s) en attente d’envoi', { n: enAttente })
    : enAttente
      ? tf('Connecté · {n} action(s) en attente d’envoi', { n: enAttente })
      : t('Connecté · aucune action en attente d’envoi')
  const contenu = (
    <>
      <Icone nom={enLigne ? 'wifi' : 'wifi-off'} taille={16} />
      <span>{texte}</span>
    </>
  )
  if (enLigne && !enAttente) return <div className="foot">{contenu}</div>
  return (
    <Link to={chemin('horsligne')} className="foot" style={{ minHeight: '44px' }}>
      {contenu}
    </Link>
  )
}
