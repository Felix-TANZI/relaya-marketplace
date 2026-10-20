// Écran « Notifications » (CL-10), forme d'origine du prototype rendue réelle (DP-54) : les notifications du compte
// (suivi, paiement, retrait, incident, messages), groupées par jour, non lues en tête de leur jour ; deux nouvelles
// d'une même commande à moins de 10 minutes n'en font qu'une (« 2 mises à jour », dépliable) ; envoyée aussi par
// SMS ; filtres ; ouvrir une notification la marque lue et mène au bon écran ; « Tout marquer comme lu » ; les
// deux derniers jours d'abord, puis les plus anciennes ; hors ligne : la liste enregistrée ; vide : avant la
// première commande. Aucune ligne ne montre le code de retrait. Gardées 12 mois.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTirerPourActualiser } from '../../composants/Animations'
import { Ecran } from '../../composants/coque'
import { Aside, Colonne, Gabarit } from '../../composants/Gabarits'
import { useDes } from '../../composants/ecran'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { source, type CommandeClient, type NotificationClient, type Relais } from '../../donnees/source'
import { F } from '../../i18n/format'
import { heureSeule, jourConversation, jourSeul } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { useMajSession } from '../../session'
import { echeancier, useEnLigne } from '../CL-09/Commun'
import { grouperNotifications, LigneNotification } from './LigneNotification'

const JOURS_RECENTS = 2 // jours montrés d'abord
const FILTRES_NOTIFS = [
  ['tout', 'Toutes'],
  ['nonlues', 'Non lues'],
  ['Retrait', 'Retrait'],
  ['Suivi', 'Suivi'],
  ['Paiement', 'Paiement'],
  ['Incident', 'Incident'],
  ['Messages', 'Messages'],
] as const

export function Notifications() {
  const { t, tf, langue } = usePreferences()
  const naviguer = useNavigate()
  const majSession = useMajSession()
  const enLigne = useEnLigne()
  const [d, setD] = useState<{ notifications: NotificationClient[]; maintenant: number } | null>(null)
  const [recu, setRecu] = useState(Date.now()) // heure où la liste a été enregistrée
  const [filtre, setFiltre] = useState<string>('tout')
  const [tout, setTout] = useState(false)
  const [deplie, setDeplie] = useState<string | null>(null)
  // Ce qui attend au relais (à retirer, montant dû, date limite) : la suite concrète des rappels de garde.
  const [aRetirer, setARetirer] = useState<CommandeClient[]>([])
  const [relais, setRelais] = useState<Relais[]>([])
  const colonnes = useDes('tab-l')
  const charger = async () => {
    setD(await source.notificationsClient())
    setRecu(Date.now())
    majSession(await source.session())
  }
  // Tirer la liste vers le bas l'actualise (Animations.tsx).
  useTirerPourActualiser(charger)
  useEffect(() => {
    source.notificationsClient().then((x) => (setD(x), setRecu(x.maintenant)))
    source.commandes().then((x) => setARetirer(x.commandes.filter((c) => c.etat === 'retirable' || c.etat === 'comptoir')))
    source.relaisListe().then((x) => setRelais(x.relais))
  }, [])
  if (!d) return null
  const nonLues = d.notifications.filter((n) => !n.lu).length
  if (!d.notifications.length)
    return (
      <Ecran route="notifications">
        <div className="empty">
          <div className="ei">
            <Icone nom="bell" taille={26} />
          </div>
          <h3>{t('Aucune notification pour l’instant')}</h3>
          <p>{t('Après ta première commande, tout arrivera ici : paiement, arrivée au relais, rappels de garde.')}</p>
          <div className="btns" style={{ marginTop: '16px' }}>
            <Link to={chemin('accueil')} className="btn primary">
              <Icone nom="search" taille={18} />
              <span>{t('Découvrir les produits')}</span>
            </Link>
          </div>
        </div>
        <div className="links cl10-lnk">
          <Link to={chemin('notifs-reglages', { from: 'notifications' })}>{t('Régler mes notifications')}</Link>
        </div>
      </Ecran>
    )
  const filtrees = d.notifications.filter((n) => filtre === 'tout' || (filtre === 'nonlues' ? !n.lu : n.type === filtre))
  const tousJours = [...new Set(filtrees.slice().sort((a, b) => b.le - a.le).map((n) => jourConversation(n.le, d.maintenant, langue)))]
  const jours = tout ? tousJours : tousJours.slice(0, JOURS_RECENTS)
  const ouvrir = async (n: NotificationClient[]) => {
    for (const x of n) await source.lireNotification(x.id)
    majSession(await source.session())
    naviguer(n[0].lien)
  }
  const carte = (g: NotificationClient[]) => <LigneNotification key={g[0].id} groupe={g} ouvert={deplie === g[0].id} ouvrir={ouvrir} deplier={setDeplie} />
  const bHorsLigne = (
    <>
      {!enLigne && (
        <div className="offline-banner">
          <Icone nom="wifi-off" taille={18} />
          <span>{tf('Hors ligne. Liste enregistrée à {h} : elle se met à jour au retour du réseau.', { h: heureSeule(recu, langue) })}</span>
        </div>
      )}
    </>
  )
  const bHaut = (
    <>
      <div className="cl10-top">
        <span className={'pill ' + (nonLues ? 'or' : 'ink')}>
          {nonLues > 0 && <i className="d"></i>}
          {nonLues ? tf(nonLues > 1 ? '{n} non lues' : '{n} non lue', { n: nonLues }) : t('Tout est lu')}
        </span>
        {nonLues > 0 && (
          <button type="button" className={'btn ghost sm' + (enLigne ? '' : ' off')} style={{ width: 'auto' }} disabled={!enLigne} onClick={() => source.lireNotification('toutes').then(charger)}>
            <Icone nom="check" taille={16} />
            <span>{t('Tout marquer comme lu')}</span>
          </button>
        )}
      </div>
    </>
  )
  const bFiltres = (
    <>
      <div className="chips" style={{ flexWrap: 'nowrap', overflowX: 'auto' }}>
        {FILTRES_NOTIFS.map(([k, x]) => (
          <a key={k} href={chemin('notifications')} className={'chip' + (filtre === k ? ' on' : '')} aria-pressed={filtre === k} onClick={(e) => (e.preventDefault(), setFiltre(k))}>
            {t(x)}
          </a>
        ))}
      </div>
    </>
  )
  const bARetirer = (
    <>
      {(filtre === 'tout' || filtre === 'Retrait') && aRetirer.length > 0 && (
        <div className="card tight">
          {aRetirer.map((c) => {
            const r = relais.find((x) => x.nom === c.lieu)
            const ech = c.garde ? echeancier(c, d.maintenant, r?.ferme ?? null) : null
            const du = (c.garde?.du ?? 0) + (c.comptoir?.du ?? 0)
            return (
              <Link key={c.ref} to={chemin(c.etat === 'comptoir' && c.comptoir?.du ? 'comptoir-payer' : 'code', { ref: c.ref })} className="li">
                <span className="ic">
                  <Icone nom={c.etat === 'comptoir' ? 'wallet' : 'package-check'} taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ display: 'block' }}>
                    {tf('{ref} · à retirer au {l}', { ref: c.ref, l: t(c.lieu) })}
                  </span>
                  <span className="ls" style={{ display: 'block' }}>
                    {[du ? tf('{m} F dus aujourd’hui', { m: F(du) }) : t('Rien à payer aujourd’hui'), ech ? tf('retrait avant {d} au soir', { d: jourSeul(ech.dernier.le, langue) }) : null, r ? t(r.horaires) : null].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span className="chev">
                  <Icone nom="chevron-right" taille={18} />
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
  const bVide = (
    <>
      {!filtrees.length && (
        <div className="empty">
          <div className="ei">
            <Icone nom="bell" taille={26} />
          </div>
          <h3>{t('Rien de nouveau')}</h3>
          <p>{t('Les nouvelles de tes commandes, de tes paiements et de tes messages arrivent ici.')}</p>
          {filtre !== 'tout' && (
            <div className="btns" style={{ marginTop: '16px' }}>
              <button type="button" className="btn secondary" onClick={() => setFiltre('tout')}>
                <span>{t('Voir toutes les notifications')}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
  const bJours = (
    <>
      {jours.map((j) => (
        <div key={j}>
          <div className="cl10-day">{t(j)}</div>
          {grouperNotifications(filtrees.filter((n) => jourConversation(n.le, d.maintenant, langue) === j)).map(carte)}
        </div>
      ))}
    </>
  )
  const bPlus = (
    <>
      {tousJours.length > jours.length && (
        <div className="btns mt16">
          <button type="button" className={'btn secondary' + (enLigne ? '' : ' off')} disabled={!enLigne} onClick={() => setTout(true)}>
            <Icone nom="file-clock" taille={18} />
            <span>{t('Voir les notifications plus anciennes')}</span>
          </button>
        </div>
      )}
    </>
  )
  const bNote = (
    <>
      <div className="hint-l">
        <Icone nom={enLigne ? 'lock' : 'wifi-off'} taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t(enLigne ? 'Tout reste ici 12 mois. Aucune ligne ne montre ton code de retrait.' : 'Ton code reste lisible hors ligne s’il a déjà été affiché. Sinon, il est dans ton SMS de retrait.')}</span>
      </div>
    </>
  )
  const bLiens = (
    <>
      <div className="links cl10-lnk">
        <Link to={chemin('notifs-reglages', { from: 'notifications' })}>{t('Régler mes notifications')}</Link>
        <Link to={chemin('sms')}>{t('Mes SMS BelivaY')}</Link>
      </div>
    </>
  )
  return (
    <Ecran route="notifications" largeur={colonnes ? 'moyen' : undefined}>
      {colonnes ? (
        // Grands écrans (§ 5.9) : à gauche les filtres avec leur nombre, « Tout marquer comme lu », « Régler mes
        // notifications » et « Mes SMS BelivaY » ; à droite la liste groupée par jour (760 au plus).
        <Gabarit forme="colonnes" inverse classe="cl10-g2">
          <Colonne>
            {bHorsLigne}
            {bARetirer}
            {bVide}
            {bJours}
            {bPlus}
            {bNote}
          </Colonne>
          <Aside titre={t('Filtrer')}>
            {bHaut}
            <nav className="cl10-filtres" aria-label={t('Filtrer')}>
              {FILTRES_NOTIFS.map(([k, x]) => (
                <a key={k} href={chemin('notifications')} className={filtre === k ? 'on' : ''} aria-pressed={filtre === k} onClick={(e) => (e.preventDefault(), setFiltre(k))}>
                  <span className="grow">{t(x)}</span>
                  <span className="n">{d.notifications.filter((n) => k === 'tout' || (k === 'nonlues' ? !n.lu : n.type === k)).length}</span>
                </a>
              ))}
            </nav>
            {bLiens}
          </Aside>
        </Gabarit>
      ) : (
        <>
          {bHorsLigne}
          {bHaut}
          {bFiltres}
          {bARetirer}
          {bVide}
          {bJours}
          {bPlus}
          {bNote}
          {bLiens}
        </>
      )}
    </Ecran>
  )
}
