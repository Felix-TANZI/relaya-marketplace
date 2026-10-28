// ENT-P23 · Notifications, reprises sur le prototype (route('notifications')) : tête datée ; grille g21 = colonne de
// panneaux « À traiter · n non lues » (ou état vide « Rien de nouveau »), « Plus tôt aujourd'hui », « Hier », « Plus
// ancien », et à droite « Canaux et réglages ». Domaine src/donnees/domaines/notifications.ts : non lues par priorité
// (critique, maintenant, à valider, info) ; chaque ligne ouvre l'écran concerné et se marque lue ; « Tout marquer comme
// lu » inactif sans non-lu. Canaux lus au registre : portail, push et e-mail par défaut ; SMS seulement pour les types du
// registre, alertes verrouillées ; aucune promotion par SMS ; aucun code dans une notification.
// Enrichi (M5, M7, M8, M15, M16) : recherche « / », puces lues / non lues et par type (?q=, ?etat=, ?type=), zéro
// résultat ; « Tout marquer comme lu » montré fait, envoyé après 5 s sauf « Annuler » ; liste gardée sur l'appareil et
// montrée hors connexion avec son heure ; dans « Canaux et réglages » : plage calme réglable (enregistrée par geste,
// gardée hors connexion), Web Push demandé seulement au geste de la personne, message d'essai.
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { geste } from '../../donnees/fileHorsLigne'
import type { PreferencesNotifications } from '../../donnees/domaines/parametres'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { Notification } from '../../donnees/domaines/notifications'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { jourDe, JOUR } from '../../calculs/temps'
import { OUTILS, type Canal, type TypeAlerte } from '../../calculs/ent08'
import { NOM_ALERTE, NOM_CANAL } from './libelles'
import { usePreferences } from '../../preferences'
import { useHorloge, useRouteOuverte } from '../../session'
import { AucunResultat, BarrePouce, Compte, correspond, Hint, Kv, Note, Panel, Pill, Puces, Px, Recherche, Tete, Tg, type Ton, useAnnuler, useLarge, Vide } from '../../composants/prototype'
import { Chargement, ErreurLecture, useAnnonce, useDates, useEnLigne } from '../ENT-07/commun'
import './ent08.css'
import { Ecran } from '../../composants/coque'
import { appliquerPlageCalme } from '../../composants/sons'

const ORDRE: Notification['priorite'][] = ['critique', 'maintenant', 'a_valider', 'info']
const PRIORITE: Record<Notification['priorite'], { ton: Ton; t: string | null }> = {
  critique: { ton: 'red', t: 'Critique' },
  maintenant: { ton: 'or', t: 'Maintenant' },
  a_valider: { ton: 'amber', t: 'À valider' },
  info: { ton: 'acc', t: null },
}
const ICONE: Record<TypeAlerte, string> = { paquet: 'boxes', non_affecte: 'user-x', depart: 'clock-alert', incident: 'triangle-alert', litige: 'scale', versement_refuse: 'banknote', vente_flash: 'zap', document: 'file-warning' }
const CANAUX: Canal[] = ['portail', 'push', 'email', 'sms']
const TYPES: TypeAlerte[] = ['paquet', 'non_affecte', 'depart', 'incident', 'litige', 'versement_refuse', 'vente_flash', 'document']
type Etat = 'toutes' | 'nonlues' | 'lues'
// Liste gardée sur l'appareil (M7) : montrée hors connexion avec l'heure à laquelle elle a été lue.
const CACHE = 'blv_e_notifs'
function lireCache(): { le: number; liste: Notification[] } | null {
  try {
    const v = JSON.parse(localStorage.getItem(CACHE) ?? 'null') as { le: number; liste: Notification[] } | null
    return v && Array.isArray(v.liste) ? v : null
  } catch {
    return null
  }
}
/** Vrai si l'heure h (0-23) tombe dans la plage calme de → a (qui peut passer minuit). */
export const dansPlage = (h: number, p: { de: number; a: number }) => (p.de < p.a ? h >= p.de && h < p.a : h >= p.de || h < p.a)

/** Ligne de notification (C.li du prototype, bouton : ouvre l'écran et marque lue). */
function Ligne({ n, ouvrir }: { n: Notification; ouvrir: (n: Notification) => void }) {
  const { t } = usePreferences()
  const d = useDates()
  const maintenant = useHorloge()
  const large = useLarge()
  const ouverte = useRouteOuverte()
  const p = PRIORITE[n.priorite]
  const pastille = !n.lue && p.t ? (
    <Pill ton={p.ton} sm dot>
      {t(p.t)}
    </Pill>
  ) : null
  return (
    <button type="button" className={'li ec8-n' + (n.lue ? '' : ' nonlue')} onClick={() => ouvrir(n)} data-notification={n.id} aria-label={ouverte(n.route) ? undefined : `${t(n.titre)} · ${t('réservé à un autre rôle')}`}>
      <span className={'ic ' + p.ton}>
        <Icone nom={ICONE[n.type]} taille={20} />
      </span>
      <span className="grow">
        <span className="lt" style={{ display: 'block' }}>
          {t(n.titre)}
        </span>
        <span className="ls" style={{ display: 'block' }}>
          {t(n.texte)} · {d.quand(n.le, maintenant)}
          <span className="row" style={{ gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
            {!large && pastille}
            {CANAUX.filter((c) => n.canaux.includes(c)).map((c) => (
              <Pill key={c} ton="ink" sm>
                {t(NOM_CANAL[c])}
              </Pill>
            ))}
          </span>
        </span>
      </span>
      {large && pastille}
      <span className="chev">
        <Icone nom="chevron-right" taille={18} />
      </span>
    </button>
  )
}

export default function Notifications() {
  const { t, tf } = usePreferences()
  const large = useLarge()
  const maintenant = useHorloge()
  const naviguer = useNavigate()
  const lecture = useLecture(() => source.notifications.liste(), [])
  const enLigne = useEnLigne()
  const d = useDates()
  const annuler = useAnnuler()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const etat = (['nonlues', 'lues'].includes(params.get('etat') ?? '') ? params.get('etat') : 'toutes') as Etat
  const type = (TYPES.includes(params.get('type') as TypeAlerte) ? params.get('type') : 'tous') as TypeAlerte | 'tous'
  const regler = (k: string, v: string, defaut: string) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p)
        if (v && v !== defaut) n.set(k, v)
        else n.delete(k)
        return n
      },
      { replace: true },
    )
  const effacer = () => setParams((p) => (p.delete('q'), p.delete('etat'), p.delete('type'), p), { replace: true })
  // En ligne : la liste lue est gardée sur l'appareil ; hors connexion : la liste gardée, avec son heure.
  useEffect(() => {
    if (!lecture.donnees || !navigator.onLine) return
    try {
      localStorage.setItem(CACHE, JSON.stringify({ le: Date.now(), liste: lecture.donnees }))
    } catch {
      /* stockage refusé */
    }
  }, [lecture.donnees])
  const cache = !enLigne || lecture.erreur ? lireCache() : null
  const toutLu = annuler.enCours.has('tout-lu')
  const brutes = cache?.liste ?? lecture.donnees
  const toutes = brutes?.map((n) => (toutLu ? { ...n, lue: true } : n)) ?? null
  const ns = toutes?.filter((n) => (etat === 'nonlues' ? !n.lue : etat === 'lues' ? n.lue : true) && (type === 'tous' || n.type === type) && correspond(q, t(n.titre), t(n.texte), t(NOM_ALERTE[n.type]))) ?? null
  const nTypes = TYPES.filter((x) => toutes?.some((n) => n.type === x))
  const aTraiter = (ns ?? []).filter((n) => !n.lue).sort((a, b) => ORDRE.indexOf(a.priorite) - ORDRE.indexOf(b.priorite) || b.le - a.le)
  const lues = (ns ?? []).filter((n) => n.lue).sort((a, b) => b.le - a.le)
  const auj = jourDe(maintenant)
  const hier = jourDe(maintenant - JOUR)
  const sections: { titre: string; icone: string; l: Notification[] }[] = [
    { titre: 'Plus tôt aujourd’hui', icone: 'clock', l: lues.filter((n) => jourDe(n.le) === auj) },
    { titre: 'Hier', icone: 'history', l: lues.filter((n) => jourDe(n.le) === hier) },
    { titre: 'Plus ancien', icone: 'archive', l: lues.filter((n) => jourDe(n.le) < hier) },
  ]
  const ouvrir = async (n: Notification) => {
    await geste('Marquer comme lu', (s) => s.notifications.lire(n.id), t(n.titre))
    naviguer(chemin(n.route, n.params))
  }
  const nonLues = (toutes ?? []).filter((n) => !n.lue).length
  const acts = (
    <button
      type="button"
      className="btn secondary sm"
      disabled={!nonLues}
      onClick={() => annuler.differer('tout-lu', tf('{n} notification(s) marquée(s) comme lue(s).', { n: nonLues }), () => void geste('Tout marquer comme lu', (s) => s.notifications.marquerLues()))}
    >
      <Icone nom="check-check" taille={16} />
      <span>{t('Tout marquer comme lu')}</span>
    </button>
  )
  const parDefaut = (c: Canal) => (c === 'portail' ? t('toujours') : OUTILS.canauxParDefaut.includes(c) ? t('gratuit, par défaut') : t('sur demande'))
  return (
    <Ecran route="notifications" actions={large ? acts : undefined}>
      <Px>
        <Tete route="notifications" titre={t('Notifications')} />
        {cache ? (
          <div className="bandeau ambre" role="status" data-notifs-gardees>
            <Icone nom="wifi-off" taille={18} />
            <span className="grow">{tf('Hors connexion : liste gardée sur cet appareil, lue le {j} à {h}.', { j: d.jour(jourDe(cache.le)), h: d.heure(cache.le) })}</span>
          </div>
        ) : (
          <ErreurLecture erreur={lecture.erreur} relire={lecture.relire} />
        )}
        {annuler.vue}
        {toutes && (
          <div className="e8-outils-n">
            <div className="e8-q"><Recherche q={q} setQ={(v) => regler('q', v, '')} placeholder={t('Paquet, litige, livreur…')} aria={t('Rechercher dans les notifications')} /></div>
            <Puces
              aria={t('Lues ou non lues')}
              actif={etat}
              choisir={(v) => regler('etat', v, 'toutes')}
              items={[
                { id: 'toutes', t: 'Toutes', n: toutes.length },
                { id: 'nonlues', t: 'Non lues', n: toutes.filter((n) => !n.lue).length },
                { id: 'lues', t: 'Lues', n: toutes.filter((n) => n.lue).length },
              ]}
            />
            <Puces aria={t('Type de notification')} actif={type} choisir={(v) => regler('type', v, 'tous')} items={[{ id: 'tous' as const, t: 'Tous les types' }, ...nTypes.map((x) => ({ id: x, t: NOM_ALERTE[x], n: toutes.filter((n) => n.type === x).length }))]} />
            {ns && <Compte n={ns.length} total={toutes.length} />}
          </div>
        )}
        {!ns ? (
          !lecture.erreur && <Chargement />
        ) : (
          <div className="g g21">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
              {ns.length === 0 && (q || etat !== 'toutes' || type !== 'tous') ? (
                <Panel titre={t('À traiter')} icone="bell">
                  <AucunResultat effacer={effacer} />
                </Panel>
              ) : aTraiter.length ? (
                <Panel titre={tf('À traiter · {n} non lues', { n: aTraiter.length })} icone="bell-ring">
                  {aTraiter.map((n) => (
                    <Ligne key={n.id} n={n} ouvrir={(x) => void ouvrir(x)} />
                  ))}
                </Panel>
              ) : (
                <Panel titre={t('À traiter')} icone="bell">
                  <Vide icone="bell" t={t('Rien de nouveau')} s={t('Vous êtes à jour. Les nouveaux paquets de vos zones, les incidents, les litiges et les versements arriveront ici et sur votre téléphone.')} />
                </Panel>
              )}
              {sections
                .filter((s) => s.l.length)
                .map((s) => (
                  <Panel key={s.titre} titre={t(s.titre)} icone={s.icone}>
                    {s.l.map((n) => (
                      <Ligne key={n.id} n={n} ouvrir={(x) => void ouvrir(x)} />
                    ))}
                  </Panel>
                ))}
            </div>
            <Panel titre={t('Canaux et réglages')} icone="sliders-horizontal">
              {CANAUX.filter((c) => c !== 'sms').map((c) => (
                <Kv key={c} k={t(c === 'portail' ? 'Dans le portail' : c === 'push' ? 'Push de l’application mobile' : 'E-mail')} v={parDefaut(c)} />
              ))}
              <Kv k={t('SMS')} v={tf('{l} seulement', { l: OUTILS.typesSms.map((x) => t(NOM_ALERTE[x]).toLowerCase()).join(', ') })} />
              <Note ton="red" icone="lock">
                <b>{t('Non désactivables')}</b> : {OUTILS.alertesVerrouillees.map((x) => t(NOM_ALERTE[x]).toLowerCase()).join(', ')}.
              </Note>
              <Note ton="ink" icone="map-pinned">
                {t('Un paquet publié dans vos zones est notifié immédiatement aux utilisateurs habilités, avec son délai d’acceptation. Un utilisateur sans zone ne reçoit que les notifications d’argent ou de compte de son rôle.')}
              </Note>
              <ReglagesRapides />
              <div className="btns ec-btns">
                <Link className="btn secondary" to={chemin('parametres') + '#notifications'}>
                  <Icone nom="sliders-horizontal" taille={18} />
                  {t('Régler mes notifications')}
                </Link>
              </div>
              <Hint icone="info">{t('Aucune promotion par SMS, aucun code dans une notification. Chaque notification ouvre l’écran concerné.')}</Hint>
            </Panel>
          </div>
        )}
        <BarrePouce>{acts}</BarrePouce>
      </Px>
    </Ecran>
  )
}

/** Réglages de « Canaux et réglages » (M15) : plage calme, Web Push sur cet appareil, message d'essai. */
function ReglagesRapides() {
  const { t, tf } = usePreferences()
  const maintenant = useHorloge(60_000)
  const lecture = useLecture(() => source.parametres.notifications(), [])
  const { annoncer, vue } = useAnnonce()
  const [p, setP] = useState<PreferencesNotifications | null>(null)
  useEffect(() => {
    if (lecture.donnees) setP(lecture.donnees)
  }, [lecture.donnees])
  const pris = typeof window !== 'undefined' && 'Notification' in window
  const [permission, setPermission] = useState<NotificationPermission | 'absent'>(pris ? Notification.permission : 'absent')
  const heure = new Date(maintenant + 3_600_000).getUTCHours() // heure de Yaoundé (UTC+1)
  const calme = !!p?.plageCalme && dansPlage(heure, p.plageCalme)
  const enregistrer = async (x: PreferencesNotifications) => {
    setP(x)
    appliquerPlageCalme(x.plageCalme)
    const r = await geste('Enregistrer la plage calme', (s) => s.parametres.reglerNotifications(x))
    if (r.etat === 'en_file') return annoncer(true, t('Hors connexion : réglage gardé, envoyé au retour du réseau.'))
    annoncer(r.r.ok, r.r.ok ? t('Plage calme enregistrée.') : t('Plage calme : deux heures différentes, de 0 h à 23 h.'))
  }
  const demander = async () => {
    if (!pris) return
    const r = await Notification.requestPermission()
    setPermission(r)
    annoncer(r === 'granted', r === 'granted' ? t('Notifications activées sur cet appareil.') : t('Notifications refusées : réactivez-les dans les réglages du navigateur.'))
  }
  const essai = () => {
    const titre = t('Essai BelivaY')
    const corps = t('Ceci est un message d’essai : vos notifications arrivent bien.')
    if (permission === 'granted' && !calme) {
      try {
        new Notification(titre, { body: corps, tag: 'blv-essai' })
      } catch {
        /* Navigateur qui exige un service worker : l'essai reste dans le portail. */
      }
    }
    jouer('notification')
    annoncer(true, calme ? t('Essai reçu dans le portail ; plage calme en cours : pas de push.') : permission === 'granted' ? t('Essai envoyé : regardez la notification de votre appareil.') : t('Essai reçu dans le portail. Activez le push pour le recevoir aussi sur cet appareil.'))
  }
  const heures = [...Array(24).keys()]
  return (
    <div className="e8-reglages-n" data-reglages-notifications>
      <div className="e8-confort">
        <span className="grow t13">
          <b>{t('Plage calme')}</b> · {t('pas de push, hors alertes obligatoires et incidents bloquants')}
          {calme && <span className="c3"> · {t('en cours')}</span>}
        </span>
        <Tg on={!!p?.plageCalme} libelle={t('Plage calme')} changer={(v) => p && void enregistrer({ ...p, plageCalme: v ? (p.plageCalme ?? { de: 21, a: 7 }) : null })} />
      </div>
      {p?.plageCalme && (
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <label className="flt on">
            <span>{t('De')}</span>
            <select aria-label={t('Début de la plage calme')} value={p.plageCalme.de} onChange={(e) => void enregistrer({ ...p, plageCalme: { ...p.plageCalme!, de: Number(e.target.value) } })}>
              {heures.map((h) => (
                <option key={h} value={h}>{tf('{h} h', { h })}</option>
              ))}
            </select>
          </label>
          <label className="flt on">
            <span>{t('À')}</span>
            <select aria-label={t('Fin de la plage calme')} value={p.plageCalme.a} onChange={(e) => void enregistrer({ ...p, plageCalme: { ...p.plageCalme!, a: Number(e.target.value) } })}>
              {heures.map((h) => (
                <option key={h} value={h}>{tf('{h} h', { h })}</option>
              ))}
            </select>
          </label>
        </div>
      )}
      <div className="e8-confort">
        <span className="grow t13">
          <b>{t('Push sur cet appareil')}</b> ·{' '}
          {permission === 'granted' ? t('activé') : permission === 'denied' ? t('refusé dans le navigateur') : permission === 'absent' ? t('non pris en charge par ce navigateur') : t('demandé seulement quand vous le choisissez')}
        </span>
        {permission === 'default' && (
          <button type="button" className="btn secondary sm" onClick={() => void demander()}>
            <Icone nom="bell-ring" taille={16} />
            {t('Activer')}
          </button>
        )}
      </div>
      <div className="e8-confort">
        <span className="grow t13">
          <b>{t('Message d’essai')}</b> · {t('vérifier que tout arrive')}
        </span>
        <button type="button" className="btn secondary sm" onClick={essai}>
          <Icone nom="send" taille={16} />
          {t('Envoyer un essai')}
        </button>
      </div>
      {vue}
    </div>
  )
}
