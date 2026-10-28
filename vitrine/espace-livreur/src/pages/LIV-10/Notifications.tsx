// LIV-P28 · Notifications (LIV-10-R18 à R20, LIV-P28R-01 à R04, LIV-RG-R212 à R215, DED-32).
// Structure du prototype (route('notifications') : en-tête secondaire, « n non lues · Tout marquer comme lu », quatre
// rubriques numérotées dans un ordre fixe — 1 Sécurité et incidents, 2 Tournée, 3 Compte, 4 Messages — chacune en
// carte de lignes livc-nt, deux notes (push gratuit, pas de coupure ni de publicité), pied de connexion). Une rubrique
// sans notification dit qu'il n'y a rien (« Aucune alerte de sécurité », « Rien à signaler ») ; tout vide : « Rien de
// nouveau » (état s=vide). Chaque notification ouvre directement l'écran qui la règle (après le code PIN si le
// téléphone était verrouillé), porte « Lu à … » et « Rappelée à … ». État s=verrou : ce qu'affiche l'écran verrouillé
// (jamais un code, un numéro de client ni une adresse complète).
// Enrichissements : puces Toutes · Non lues · une par rubrique (M5) ; heures calmes, autorisation du téléphone et
// notification d'essai à un geste, dans « Sons et confort » (M15).
import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTirerPourActualiser } from '@client/composants/Animations'
import marque from '../../assets/marque-belivay.png'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Btn, Carte, Chips, Foot, Hint, HorsConnexion, Li, Note, Pill, Vide } from '../../composants/proto'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import { useEnLigne, useFile } from '../../donnees/fileHorsLigne'
import type { Notification, Rubrique } from '../../donnees/domaines/notifications'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { heure, jourCourt, jourLong } from '../../i18n/temps'
import { jourDe } from '../../calculs/temps'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { Chargement, ErreurLecture, useMaintenant } from '../LIV-08/commun'
import { LivcIc } from './livc'
import './liv10.css'

/* ---------- aides livc_ du prototype (LIV-P28) ---------- */

// Rubrique : titre, icône et teinte des lignes, ligne « rien » quand elle est vide (et l'écran qui la règle).
const RUBRIQUES: { r: Rubrique; titre: string; court: string; icone: string; ton: string; rien: [string, string, string, string] }[] = [
  { r: 'securite', court: 'Sécurité', titre: 'Sécurité et incidents', icone: 'shield-alert', ton: 'red', rien: ['shield-check', 'Aucune alerte de sécurité aujourd’hui', 'Aucun incident déclaré ni en attente de validation', 'incident'] },
  { r: 'tournee', court: 'Tournée', titre: 'Tournée', icone: 'package', ton: 'or', rien: ['package', 'Aucun paquet affecté pour l’instant', 'Les notifications de tournée arrivent dès que votre entreprise vous affecte un paquet', 'statut'] },
  { r: 'compte', court: 'Compte', titre: 'Compte : pièces et certification', icone: 'id-card', ton: 'ink', rien: ['id-card', 'Rien à signaler', 'Vos pièces sont rappelées 30 jours avant leur expiration', 'moi'] },
  { r: 'messages', court: 'Messages', titre: 'Messages', icone: 'message-circle', ton: 'acc', rien: ['message-circle', 'Aucun nouveau message', 'Vos fils restent lisibles dans Messages', 'messages'] },
]

/** livc_prio : intitulé de rubrique numéroté. */
const LivcPrio = ({ n, children }: { n: number; children: string }) => (
  <h2 className="livc-prio">
    <span className="n">{n}</span>
    {children}
  </h2>
)

/** livc_nt : ligne de notification (icône, titre, texte, pastilles, heure, point non lu). */
function LivcNt(p: { icone: string; ton: string; t: string; s: string; tm?: string; pills?: ReactNode; nonLue?: boolean; ouvrir?: () => void; vers?: string }) {
  const { t } = usePreferences()
  const dedans = (
    <>
      <LivcIc icone={p.icone} ton={p.ton} taille={42} />
      <span className="grow">
        <span className="nt" style={{ display: 'block' }}>
          {p.t}
        </span>
        <span className="ns" style={{ display: 'block' }}>
          {p.s}
        </span>
        {p.pills && <span className="nm">{p.pills}</span>}
      </span>
      <span className="col" style={{ alignItems: 'flex-end', gap: 6 }}>
        {p.tm && <span className="tm">{p.tm}</span>}
        {p.nonLue && <span className="livc-dot" role="img" aria-label={t('Non lue')}></span>}
      </span>
    </>
  )
  return p.vers ? (
    <Link className="livc-nt" to={p.vers}>
      {dedans}
    </Link>
  ) : (
    <button type="button" className="livc-nt l10-nt" onClick={p.ouvrir}>
      {dedans}
    </button>
  )
}

export default function Notifications() {
  const [p] = useSearchParams()
  return p.get('s') === 'verrou' ? <EcranVerrouille /> : <Liste />
}

function Liste() {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const naviguer = useNavigate()
  const en = useEnLigne()
  const file = useFile()
  const m = useMaintenant()
  const l = useLecture(() => source.notifications.liste(), [])
  const [vue, setVue] = useState<'toutes' | 'non_lues' | Rubrique>('toutes')
  useTirerPourActualiser(l.relire)
  if (l.erreur)
    return (
      <Ecran route="notifications" proto action="aucune">
        <ErreurLecture relire={l.relire} />
      </Ecran>
    )
  if (!l.donnees)
    return (
      <Ecran route="notifications" proto action="aucune">
        <Chargement lignes={3} />
      </Ecran>
    )
  const liste = [...l.donnees].sort((a, b) => b.quand - a.quand)
  const non = liste.filter((x) => !x.lue).length
  const quand = (q: number) => (jourDe(q) === jourDe(m()) ? heure(q, langue) : `${jourCourt(q, langue)} ${heure(q, langue)}`)
  const ouvrir = async (x: Notification) => {
    await source.notifications.marquerLue(x.id)
    signal('toucher')
    if (x.route) naviguer(chemin(x.route, x.params))
    else l.relire()
  }
  const toutLu = async () => {
    await source.notifications.toutMarquerLu()
    signal('succes')
    l.relire()
  }
  const entreprise = s.livreur?.entreprise ?? ''
  const disponible = s.disponibilite === 'disponible'
  const depuis = file?.horsLigneDepuis ?? null
  const pied = <Foot icone={en ? 'wifi' : 'wifi-off'}>{en ? t('Connecté · notifications à jour') : depuis !== null ? tf('Hors connexion · dernière synchronisation à {h}', { h: heure(depuis, langue) }) : t('Hors connexion')}</Foot>
  const verrou = (
    <Hint icone="lock">
      <Link className="l10-lien" to={chemin('notifications', { s: 'verrou' })}>
        {t('Ce qu’affiche l’écran verrouillé')}
      </Link>
    </Hint>
  )
  if (liste.length === 0)
    return (
      <Ecran route="notifications" proto action="aucune">
        <Carte style={{ marginTop: 12 }}>
          <Vide icone="bell" t={t('Rien de nouveau')} s={tf('{jour}, {h}. Les notifications de tournée arrivent dès que {entreprise} vous affecte un paquet.', { jour: jourLong(m(), langue), h: heure(m(), langue), entreprise })}>
            <div className="btns">
              <Btn kind="acc-soft" icone="toggle-right" vers={chemin('statut')}>
                {t('Mon statut')}
              </Btn>
              <Btn kind="secondary" icone="boxes" vers={chemin('kit')}>
                {t('Mon kit')}
              </Btn>
            </div>
          </Vide>
        </Carte>
        <Note ton="ink" icone="bell-ring">
          {t(disponible ? 'Vous êtes disponible : les notifications de tournée restent actives et ne peuvent pas être coupées.' : 'Hors service : aucune notification de tournée ; le compte et les messages restent.')}
        </Note>
        {verrou}
        {pied}
      </Ecran>
    )
  return (
    <Ecran route="notifications" proto action="aucune">
      {!en && (
        <HorsConnexion>
          <b>{t('Hors connexion')}</b> · {depuis !== null ? tf('dernières notifications reçues à {h}.', { h: heure(depuis, langue) }) : t('dernières notifications reçues.')} {t('Paquet affecté : un SMS de secours part si le push n’est pas délivré en 5 minutes.')}
        </HorsConnexion>
      )}
      <div className="row mt10 l10-nt-hd" style={{ justifyContent: 'space-between' }}>
        <span className="t14 b8" role="status">
          {non === 0 ? t('Tout est lu') : non > 1 ? tf('{n} non lues', { n: non }) : t('1 non lue')}
        </span>
        <button type="button" className="t13 b7 cor l10-toutlu" disabled={non === 0} onClick={() => void toutLu()}>
          {t('Tout marquer comme lu')}
        </button>
      </div>
      <Chips
        scroll
        items={[
          { t: t('Toutes'), on: vue === 'toutes', onClick: () => setVue('toutes') },
          { t: t('Non lues'), n: non, on: vue === 'non_lues', onClick: () => setVue('non_lues') },
          ...RUBRIQUES.map((R) => ({ t: t(R.court), n: liste.filter((x) => x.rubrique === R.r).length, on: vue === R.r, onClick: () => setVue(R.r) })),
        ]}
      />
      {vue === 'non_lues' && non === 0 && <Hint icone="check-check">{t('Aucune notification non lue.')}</Hint>}
      {RUBRIQUES.map((R, i) => {
        if (vue !== 'toutes' && vue !== 'non_lues' && vue !== R.r) return null
        const g = liste.filter((x) => x.rubrique === R.r && (vue !== 'non_lues' || !x.lue))
        if (vue === 'non_lues' && g.length === 0) return null
        return (
          <section key={R.r} aria-label={t(R.titre)}>
            <LivcPrio n={i + 1}>{t(R.titre)}</LivcPrio>
            <Carte cls="tight">
              {g.length === 0 ? (
                <LivcNt icone={R.rien[0]} ton={R.r === 'securite' ? 'green' : R.ton} t={t(R.rien[1])} s={t(R.rien[2])} vers={chemin(R.rien[3])} />
              ) : (
                g.map((x) => (
                  <LivcNt
                    key={x.id}
                    icone={R.icone}
                    ton={R.ton}
                    t={t(x.titre)}
                    s={t(x.texte)}
                    tm={quand(x.quand)}
                    nonLue={!x.lue}
                    ouvrir={() => void ouvrir(x)}
                    pills={
                      x.rappeleeA !== null || x.lueA !== null ? (
                        <>
                          {x.rappeleeA !== null && (
                            <Pill ton="amber" sm icone="bell-ring">
                              {tf('Rappelée à {h}', { h: heure(x.rappeleeA, langue) })}
                            </Pill>
                          )}
                          {x.lueA !== null && (
                            <Pill ton="green" sm icone="check-check">
                              {tf('Lu à {h}', { h: heure(x.lueA, langue) })}
                            </Pill>
                          )}
                        </>
                      ) : undefined
                    }
                  />
                ))
              )}
            </Carte>
          </section>
        )
      })}
      <Note ton="acc" icone="smartphone">
        {t('Toutes vos notifications passent par le')} <b>{t('push gratuit')}</b>. {t('Le SMS ne sert qu’au code de connexion, et à « paquet affecté » si le push n’arrive pas en 5 minutes.')}
      </Note>
      <Note ton="ink" icone="megaphone-off">
        {tf('Tant que vous êtes disponible, les notifications de tournée ne peuvent pas être coupées ; {entreprise} voit si elles sont lues. Aucune promotion, aucune publicité.', { entreprise })}
      </Note>
      <div className="card tight" style={{ marginTop: 12 }}>
        <Li icone="moon-star" ton="ink" t={t('Heures calmes et notification d’essai')} s={t('Sons, vibrations, autorisation du téléphone')} vers={chemin('reglages', { voir: 'confort' })} />
      </div>
      {verrou}
      {pied}
    </Ecran>
  )
}

/** État s=verrou : la notification telle que l'écran verrouillé l'affiche, et ce qu'il n'affiche jamais. */
function EcranVerrouille() {
  const { t, langue } = usePreferences()
  const m = useMaintenant()
  const l = useLecture(() => source.notifications.liste(), [])
  const derniere = (l.donnees ?? []).filter((x) => x.rubrique === 'tournee' || x.rubrique === 'securite').sort((a, b) => b.quand - a.quand)[0]
  return (
    <Ecran route="notifications" entete="aucun" titre={t('Écran verrouillé')} proto>
      <div className="livc-lock l10-lock">
        <div className="lk">
          <Icone nom="lock" taille={22} />
        </div>
        <div className="ld">{jourLong(m(), langue)}</div>
        <div className="lt">{heure(m(), langue)}</div>
        {derniere ? (
          <div className="livc-ln" style={{ marginTop: 34 }}>
            <div className="lh">
              <img src={marque} alt="" />
              <span>{t('BelivaY livreur')}</span>
              {heure(derniere.quand, langue)}
            </div>
            <div className="lb">{t(derniere.titre)}</div>
            <div className="ls">{t(derniere.texte)}</div>
          </div>
        ) : (
          <div className="livc-ln" style={{ marginTop: 34 }}>
            <div className="lb">{t('Rien de nouveau')}</div>
          </div>
        )}
        <div className="livc-lchk">
          {['Jamais sur l’écran verrouillé : un code, un numéro de client, une adresse complète.', 'Un appui ouvre directement l’écran concerné, après le code PIN.', 'Non lue en 5 minutes, une notification de tournée est rappelée une fois.'].map((x) => (
            <div key={x}>
              <Icone nom="shield-check" taille={15} />
              <span>{t(x)}</span>
            </div>
          ))}
        </div>
        <div className="btns" style={{ marginTop: 18 }}>
          <Btn kind="white" icone="chevron-left" vers={chemin('notifications')} remplacer>
            {t('Revenir aux notifications')}
          </Btn>
        </div>
      </div>
    </Ecran>
  )
}
