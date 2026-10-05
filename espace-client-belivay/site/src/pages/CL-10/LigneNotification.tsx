// Une ligne de notification (CL-10) : type, heure, non lue, titre, texte, mises à jour regroupées (dépliables),
// envoyée aussi par SMS. Rendu commun à l'écran Notifications et au panneau de la cloche de l'en-tête de site
// (grands écrans, DISPOSITION-ECRANS.md § 3.8). Aucune ligne ne montre le code de retrait.
import { Icone } from '../../composants/Icone'
import type { NotificationClient } from '../../donnees/source'
import { heureSeule } from '../../i18n/dates'
import { usePreferences } from '../../preferences'

const ICONES: Record<string, string> = { Suivi: 'truck', Paiement: 'shield-check', Retrait: 'map-pin', Incident: 'scale', Messages: 'messages-square', Promotions: 'tag' }
const GROUPE_MIN = 10
const refDe = (n: NotificationClient) => /ref=([A-Z]+-\d+)/.exec(n.lien)?.[1] ?? /(BLV-\d+)/.exec(n.titre)?.[1] ?? n.id

// Regroupe les nouvelles d'une même commande à moins de 10 minutes (la plus récente en tête), non lues d'abord.
export function grouperNotifications(liste: NotificationClient[]): NotificationClient[][] {
  const g: NotificationClient[][] = []
  for (const n of liste.slice().sort((a, b) => Number(a.lu) - Number(b.lu) || b.le - a.le)) {
    const x = g.find((y) => refDe(y[0]) === refDe(n) && y[0].lu === n.lu && Math.abs(y[y.length - 1].le - n.le) < GROUPE_MIN * 60e3)
    if (x) x.push(n)
    else g.push([n])
  }
  return g
}

export function LigneNotification(p: { groupe: NotificationClient[]; ouvert: boolean; ouvrir: (g: NotificationClient[]) => void; deplier: (id: string | null) => void }) {
  const { t, tf, langue } = usePreferences()
  const g = p.groupe
  const n = g[0]
  const ouvert = p.ouvert
  return (
    <a href={n.lien} className={'card cl10-nc' + (n.lu ? '' : ' un')} onClick={(e) => (e.preventDefault(), p.ouvrir(g))}>
      <span className="cl10-k">
        <Icone nom={n.type === 'Retrait' && n.titre.startsWith('Rappel') ? 'hourglass' : ICONES[n.type]} taille={16} />
        <span className="grow">{t(n.type)}</span>
        <span className="tm">{heureSeule(n.le, langue)}</span>
        {!n.lu && <i className="nd" aria-label={t('Non lue')}></i>}
      </span>
      <span className="nt">{t(n.titre)}</span>
      <span className="nb">{t(n.texte)}</span>
      {ouvert && g.length > 1 && (
        <span className="cl10-sub">
          {g
            .slice()
            .reverse()
            .map((x) => (
              <span key={x.id} style={{ display: 'block' }}>
                <b>{heureSeule(x.le, langue)}</b> {t(x.titre)}
              </span>
            ))}
        </span>
      )}
      {(g.length > 1 || n.sms) && (
        <span className="nm">
          {g.length > 1 && (
            <span
              className={'cl10-tag' + (ouvert ? ' or' : '')}
              role="button"
              tabIndex={0}
              aria-expanded={ouvert}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                p.deplier(ouvert ? null : n.id)
              }}
            >
              <Icone nom="layers" taille={13} />
              <span>{tf('{n} mises à jour', { n: g.length })}</span>
            </span>
          )}
          {n.sms && (
            <span className="cl10-tag">
              <Icone nom="message-square-text" taille={13} />
              <span>{t('Envoyé par SMS')}</span>
            </span>
          )}
        </span>
      )}
    </a>
  )
}
