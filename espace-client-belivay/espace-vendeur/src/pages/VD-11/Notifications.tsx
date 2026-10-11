// Notifications (VD-11) : repris du prototype (route('notifications'), états ?f=urgent et ?f=argent), branché sur la
// source. Règles VD11-R39 à R55, VNO-01 à VNO-06, DP-33, I-2 :
// - filtres Tout · Urgent (commandes à préparer et litiges qui courent) · Argent, avec leur nombre réel ; ordre
//   strictement antéchronologique ; chaque ligne : icône du type, étiquette et canal (SMS ou notification), heure,
//   titre, conséquence ; toute la ligne mène à l'écran exact (et marque la notification lue) ;
// - sanction ou descente de palier : bouton « Contester » (VNO-04) ;
// - filtre vide : « Rien de nouveau ici » et « Voir toutes les notifications » ; hors connexion : la liste gardée ;
// - accès Préparation : ni filtre Argent ni montant (le domaine ne lui en donne pas).
// Ajouts : « Tout marquer comme lu », « Marquer non lue », regroupement par jour, tirer pour actualiser.
import { Link, useSearchParams } from 'react-router-dom'
import { useTirerPourActualiser } from '@client/composants/Animations'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { Notification, TypeNotification } from '../../donnees/domaines/notifications'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { jourDe } from '../../calculs/temps'
import { heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useHorloge, useSession } from '../../session'
import { BandeauHorsLigne, Bouton, Chargement, ErreurLecture, LienTexte, jourDate, useAnnonce, useEcrire } from './communs'

const TYPES: Record<TypeNotification, { icone: string; ic: string; tag: string; libelle: string }> = {
  preparer: { icone: 'package-check', ic: 'or', tag: 'cor', libelle: 'Préparer' },
  prix: { icone: 'trending-up', ic: 'or', tag: 'cor', libelle: 'Prix' },
  litige: { icone: 'scale', ic: 'red', tag: 'cr', libelle: 'Litige' },
  retour: { icone: 'undo-2', ic: 'amber', tag: 'ca', libelle: 'Retour' },
  palier: { icone: 'award', ic: 'or', tag: 'cor', libelle: 'Palier' },
  versement: { icone: 'banknote', ic: 'green', tag: 'cg', libelle: 'Versé' },
  avis: { icone: 'star', ic: 'or', tag: 'cor', libelle: 'Avis' },
  conseil: { icone: 'lightbulb', ic: 'green', tag: 'cg', libelle: 'Conseil' },
  sanction: { icone: 'shield-alert', ic: 'red', tag: 'cr', libelle: 'Sanction' },
  stock: { icone: 'package', ic: 'amber', tag: 'ca', libelle: 'Stock' },
  offre: { icone: 'badge-check', ic: 'green', tag: 'cg', libelle: 'Offre' },
  message: { icone: 'messages-square', ic: 'or', tag: 'cor', libelle: 'Message' },
  securite: { icone: 'shield', ic: 'red', tag: 'cr', libelle: 'Sécurité' },
}
type Filtre = 'tout' | 'urgent' | 'argent'

export default function Notifications() {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const maintenant = useHorloge()
  const ecrire = useEcrire()
  const [params] = useSearchParams()
  const prep = s.membre?.role === 'preparation'
  const f: Filtre = params.get('f') === 'urgent' ? 'urgent' : params.get('f') === 'argent' && !prep ? 'argent' : 'tout'
  const liste = useLecture(() => source.notifications.liste(f), [f, s.membre?.role])
  const compteurs = useLecture(() => source.notifications.compteurs(), [s.membre?.role])
  const [annonce, dire] = useAnnonce()
  useTirerPourActualiser(() => (liste.relire(), compteurs.relire()))
  const c = compteurs.donnees
  const quand = (a: number) => (jourDe(a) === jourDe(maintenant) ? heure(a, langue) : `${jourDate(a, langue).split(' ')[0]} ${heure(a, langue)}`)
  const groupe = (a: number) => (jourDe(a) === jourDe(maintenant) ? 'Aujourd’hui' : jourDe(a) === jourDe(maintenant - 86400000) ? 'Hier' : 'Plus tôt')

  const onglet = (v: Filtre, libelle: string, n: number | undefined) => (
    <Link to={v === 'tout' ? chemin('notifications') : chemin('notifications', { f: v })} replace className={f === v ? 'on' : ''} aria-current={f === v ? 'page' : undefined}>
      {t(libelle + ' ')}
      {n !== undefined && <span className="n">{n}</span>}
    </Link>
  )
  const ligne = (n: Notification) => {
    const ty = TYPES[n.type]
    const [route, q] = n.lien.split('?')
    return (
      <div key={n.id} style={{ position: 'relative' }}>
        <Link
          to={chemin(route) + (q ? '?' + q : '')}
          className="li"
          style={{ alignItems: 'flex-start', padding: '13px 0' }}
          onClick={() => {
            if (!n.lu) void source.notifications.marquerLue(n.id)
          }}
        >
          <span className={'ic ' + ty.ic} style={{ position: 'relative' }}>
            <Icone nom={ty.icone} taille={19} />
            {!n.lu && <span aria-label={t('Non lue')} style={{ position: 'absolute', top: '-2px', right: '-2px', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--braise-1)', boxShadow: '0 0 0 2px var(--card)' }}></span>}
          </span>
          <span className="grow">
            <span className="row" style={{ gap: '6px' }}>
              <span className={'qtag ' + ty.tag} style={{ fontSize: '12px' }}>
                {t(ty.libelle)}
              </span>
              <span className="t12 c3 b7">{t(n.canal === 'sms' ? '· SMS' : '· Notification')}</span>
              <span className="grow"></span>
              <span className="t12 c3 b7 nw">{quand(n.a)}</span>
            </span>
            <span className="lt" style={{ display: 'block', marginTop: '3px', fontWeight: n.lu ? 700 : 800 }}>
              {ecrire(n.titre, maintenant)}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {ecrire(n.texte, maintenant)}
            </span>
          </span>
        </Link>
        <div className="row" style={{ gap: '4px', margin: '-8px 0 6px 52px' }}>
          {n.contester && (
            <Bouton classe="secondary sm" icone="scale" vers={chemin(n.contester.split('?')[0]) + (n.contester.includes('?') ? '?' + n.contester.split('?')[1] : '')}>
              {t('Contester')}
            </Bouton>
          )}
          {n.lu && (
            <LienTexte classe="c3" style={{ fontSize: '12px', minHeight: '32px' }} onClick={() => void source.notifications.marquerLue(n.id, false).then(() => dire(t('Marquée non lue.')))}>
              {t('Marquer non lue')}
            </LienTexte>
          )}
        </div>
      </div>
    )
  }

  const d = liste.donnees
  const groupes: [string, Notification[]][] = []
  for (const n of d ?? []) {
    const g = groupe(n.a)
    const x = groupes.at(-1)
    if (x && x[0] === g) x[1].push(n)
    else groupes.push([g, [n]])
  }
  return (
    <Ecran route="notifications" fixes={annonce}>
      <div className="pg">
        <h1 className="pg-t">{t('Notifications')}</h1>
        <p className="pg-s">{t('Les plus récentes en haut. Touchez un message pour agir.')}</p>
      </div>
      <div className="seg">
        {onglet('tout', 'Tout', c?.tout)}
        {onglet('urgent', 'Urgent', c?.urgent)}
        {!prep && onglet('argent', 'Argent', c?.argent)}
      </div>
      <BandeauHorsLigne texte="Hors connexion : voici les notifications gardées sur le téléphone ; les nouvelles arriveront au retour du réseau." />
      {c && c.nonLues > 0 && (
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: '4px' }}>
          <LienTexte onClick={() => void source.notifications.toutMarquerLu().then(() => dire(t('Tout est marqué comme lu.')))}>{tf(c.nonLues > 1 ? 'Tout marquer comme lu ({n})' : 'Tout marquer comme lu ({n})', { n: c.nonLues })}</LienTexte>
        </div>
      )}
      {liste.erreur && <ErreurLecture erreur={liste.erreur} relire={liste.relire} />}
      {!d && !liste.erreur && <Chargement />}
      {d && d.length === 0 && (
        <div className="card" style={{ marginTop: '14px' }}>
          <div className="row" style={{ gap: '10px' }}>
            <Icone nom="bell-off" taille={20} style={{ color: 'var(--ink-3)' }} />
            <div className="b8 t15">{t('Rien de nouveau ici')}</div>
          </div>
          <p className="t13 c2" style={{ margin: '6px 0 0' }}>
            {t('Vous êtes prévenu dès qu’il y a quelque chose à faire')}
          </p>
          <div className="mt12">
            <Bouton classe="secondary" icone="bell" vers={chemin('notifications')}>
              {t('Voir toutes les notifications')}
            </Bouton>
          </div>
        </div>
      )}
      {groupes.map(([g, ns]) => (
        <div key={g}>
          <div className="divider-t">{t(g)}</div>
          <div className="card tight" style={{ marginTop: 0 }}>
            {ns.map(ligne)}
          </div>
        </div>
      ))}
      <div className="hint-l">
        <Icone nom="message-square" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t('SMS seulement pour une commande à préparer ou un litige. Le reste arrive en notification. Jamais de promotion par SMS.')}</span>
      </div>
      <div className="links">
        <Link to={chemin('parametres')} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', minHeight: '44px' }}>
          {t('Régler mes notifications')}
          <Icone nom="chevron-right" taille={16} />
        </Link>
      </div>
      <p className="t12 c3" style={{ margin: '8px 4px 0' }}>{t('Les notifications restent 12 mois, puis sont effacées.')}</p>
    </Ecran>
  )
}
