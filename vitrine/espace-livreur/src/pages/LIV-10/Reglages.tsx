// LIV-P31 · Réglages (LIV-10-R44 à R52, LIV-P31R-01 à R04, LIV-01-R048, DED-33, RNF-04).
// Structure du prototype (livc_reglages : en-tête secondaire, Langue, Affichage, Tournée, Envoi des photos, « Ce
// qu'aucun réglage ne coupe », Compte, pied) :
// - langue : français, anglais ; pidgin (s=pidgin) pas encore livré (DP-13 / RNF-04) : l'application reste en
//   français ; mémorisée sur le compte (au retour du réseau hors connexion) ;
// - affichage : thème clair / sombre / automatique, taille du texte LIBRE sur toute l'échelle avec aperçu, mémorisés
//   sur le téléphone, appliqués sans redémarrer ;
// - tournée : lecture vocale ; notifications de tournée verrouillées tant que le livreur est disponible ;
// - sons et confort (DP-66, ancienne page ajoutée « confort », ?voir=confort) : sons, vibrations, animations, données,
//   mode une main, heures calmes, notifications du téléphone et essai, gains masqués, application d'itinéraire ;
// - envoi des photos : immédiat ou Wi-Fi seulement, jamais pour une preuve de colis sous garde ;
// - compte = sécurité et appareil (DP-66, ancienne page ajoutée « securite », ?voir=securite) : ce téléphone, code PIN,
//   empreinte, verrouiller, se déconnecter (feuille s=deconnexion : contrôles réels), dernières connexions.
// La demande de départ est dans « Moi », tout en bas (« Demander à quitter », DP-66) : l'ancienne feuille s=quitter y
// mène. L'ancien paramètre ?sheet=… reste accepté.
import { LiensLegaux } from '@client/composants/LiensLegaux'
import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Feuille } from '@client/composants/Feuille'
import { Ecran } from '../../composants/coque'
import { TailleDuTexte } from '../../composants/TailleDuTexte'
import { Btn, Carte, Coche, Foot, Hint, HorsConnexion, Note, Sec } from '../../composants/proto'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import { enAttente, geste, useEnLigne, useFile } from '../../donnees/fileHorsLigne'
import type { PreferencesCompte } from '../../donnees/domaines/moi'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { heure } from '../../i18n/temps'
import { usePreferences, type ChoixTheme } from '../../preferences'
import { useSession } from '../../session'
import { useOrigine } from '../LIV-08/commun'
import { LivcIc, LivcSh, Radio, Seg3, Tg } from './livc'
import { SectionConfort } from './reglages-confort'
import { SectionSecurite } from './reglages-compte'
import './liv10.css'

/** livc_set : ligne de réglage (icône, titre, explication, interrupteur). */
function LivcSet({ icone, ton, t, s, children }: { icone: string; ton: string; t: string; s: string; children: ReactNode }) {
  return (
    <div className="livc-set">
      <LivcIc icone={icone} ton={ton} taille={40} />
      <div className="grow">
        <div className="st">{t}</div>
        <div className="ss">{s}</div>
      </div>
      {children}
    </div>
  )
}

export default function Reglages() {
  const p = usePreferences()
  const { t, tf, langue: lg } = p
  const s = useSession()
  const en = useEnLigne()
  const o = useOrigine()
  const file = useFile()
  const naviguer = useNavigate()
  const [params, setParams] = useSearchParams()
  const compte = useLecture(() => source.moi.preferences(), [])
  const regles = useLecture(() => source.horsligne.regles(), [])
  const [compris, setCompris] = useState(false)
  const etat = params.get('s') ?? params.get('sheet') ?? ''
  const voir = params.get('voir')
  // Ancienne adresse (/securite, /confort) ou lien précis : la section voulue vient sous les yeux.
  useEffect(() => {
    if (!voir) return
    const id = requestAnimationFrame(() => document.getElementById('l10-voir-' + voir)?.scrollIntoView({ block: 'start' }))
    return () => cancelAnimationFrame(id)
  }, [voir])
  // L'ancienne feuille « Quitter l'entreprise » : la demande de départ est dans Moi (DP-66).
  useEffect(() => {
    if (etat === 'quitter') naviguer(chemin('moi', { sheet: 'depart' }), { replace: true })
  }, [etat, naviguer])
  const ouvrir = (x: string) => naviguer(chemin('reglages', { s: x }), { state: { feuille: true } })
  const fermer = () => {
    const n = new URLSearchParams(params)
    n.delete('s')
    n.delete('sheet')
    setParams(n, { replace: true })
    setCompris(false)
  }
  const regler = async (x: Partial<PreferencesCompte>) => {
    const og = o()
    // Hors connexion : réglée sur le téléphone et mise en file avec sa charge (rejouée au retour du réseau).
    await geste(en, 'preference', Object.keys(x).join(','), og, (src) => src.moi.reglerPreference(x, og, en), true)
    compte.relire()
    signal('toucher')
  }
  const langue = (l: 'fr' | 'en') => {
    p.setLangue(l)
    void regler({ langue: l })
    if (etat === 'pidgin') fermer()
  }
  const pendant = enAttente(file).length
  const disponible = s.disponibilite === 'disponible'
  const deconnecter = async () => {
    await source.session.deconnecter()
    location.replace(import.meta.env.BASE_URL.replace(/\/$/, '') + chemin('connexion'))
  }
  const risque = pendant > 0 || s.colisSousGarde > 0
  const envoi = compte.donnees?.envoiPhotos ?? 'immediat'
  const depuis = file?.horsLigneDepuis ?? null
  const VERSION = (import.meta.env.VITE_VERSION_LIVREUR as string | undefined) ?? ''
  return (
    <Ecran
      route="reglages"
      proto
      action="sos"
      fixes={
        <>
          <Feuille ouverte={etat === 'deconnexion'} fermer={fermer} titre={t('Se déconnecter')} classe="livc-sheet">
            <LivcSh titre={t('Se déconnecter ?')} sous={t(s.disponibilite === 'hors_service' ? 'Journée clôturée, hors service' : 'Journée pas encore clôturée')} icone="log-out" ton="ink" fermer={fermer} />
            <div className="card flat" style={{ marginTop: 14 }}>
              <Coche on={s.colisSousGarde === 0} bad={s.colisSousGarde > 0}>
                <b>{s.colisSousGarde > 0 ? tf('{n} colis encore sous votre garde', { n: s.colisSousGarde }) : t('Aucun colis sous votre garde')}</b>
              </Coche>
              <Coche on={pendant === 0} bad={pendant > 0}>
                <b>{pendant > 0 ? tf('{n} gestes encore dans la file d’envoi', { n: pendant }) : t('File d’envoi vide')}</b> · {t(pendant > 0 ? 'ils repartent à la reconnexion' : 'rien ne sera perdu')}
              </Coche>
              <Coche on={s.disponibilite === 'hors_service'} bad={s.disponibilite !== 'hors_service'}>
                <b>{t(s.disponibilite === 'hors_service' ? 'Journée clôturée' : 'Journée pas encore clôturée')}</b> · {t(s.disponibilite === 'hors_service' ? 'statut hors service' : 'pensez à clôturer avant de partir')}
              </Coche>
            </div>
            <Note ton="ink" icone="key-round">
              {t('À la prochaine ouverture : votre code PIN à 6 chiffres. Ce téléphone reste lié à votre seul compte.')}
            </Note>
            {risque && (
              <>
                <Note ton="amber" icone="triangle-alert">
                  {t('Vos colis restent sous votre garde et la file reste chiffrée sur ce téléphone : elle repart à la reconnexion. Ne désinstallez pas l’application.')}
                </Note>
                <label className="check l10-compris">
                  <input type="checkbox" checked={compris} onChange={(e) => setCompris(e.target.checked)} />
                  <span className="grow">{t('J’ai compris : je me reconnecte sur ce même téléphone.')}</span>
                </label>
              </>
            )}
            <div className="btns" style={{ marginTop: 14 }}>
              <Btn kind="dark" icone="log-out" off={risque && !compris} onClick={() => void deconnecter()} cls="l10-deco">
                {t('Se déconnecter')}
              </Btn>
            </div>
            <div className="btns">
              <Btn kind="ghost" onClick={fermer}>
                {t('Annuler')}
              </Btn>
            </div>
          </Feuille>
        </>
      }
    >
      {!en && (
        <HorsConnexion>
          <b>{t('Hors connexion')}</b> · {t('les réglages s’appliquent tout de suite sur ce téléphone ; la langue est enregistrée sur votre compte au retour du réseau.')}
        </HorsConnexion>
      )}
      <Sec titre={t('Langue')} />
      <Carte>
        <Seg3<'fr' | 'en' | 'pcm'>
          label={t('Langue')}
          actuel={etat === 'pidgin' ? 'pcm' : lg}
          poser={(v) => v !== 'pcm' && langue(v)}
          items={[
            { v: 'fr', t: 'Français' },
            { v: 'en', t: 'English' },
            { v: 'pcm', t: 'Pidgin', vers: () => setParams({ s: 'pidgin' }, { replace: true }) },
          ]}
        />
        {etat === 'pidgin' && (
          <Note ton="amber" icone="languages">
            <b>{t('La traduction en pidgin n’est pas encore livrée.')}</b> {t('L’application, les consignes vocales et les messages rapides restent dans la langue choisie jusqu’à sa livraison.')}
          </Note>
        )}
        <Hint icone="languages">{t('La langue s’applique aussi aux consignes vocales et aux messages rapides. Les messages reçus d’un tiers ne sont pas traduits. Mémorisée sur votre compte.')}</Hint>
      </Carte>
      <Sec titre={t('Affichage')} />
      <Carte>
        <div className="t13 b7 c2">{t('Thème')}</div>
        <Seg3<ChoixTheme>
          label={t('Thème')}
          actuel={p.choixTheme}
          poser={p.setTheme}
          items={[
            { v: 'light', t: t('Clair'), icone: 'sun' },
            { v: 'dark', t: t('Sombre'), icone: 'moon' },
            { v: 'auto', t: t('Automatique'), icone: 'sun-moon' },
          ]}
        />
        <div className="t13 b7 c2 mt14">{t('Taille du texte')}</div>
        <div className="mt6">
          <TailleDuTexte />
        </div>
        <div className="row mt10 l10-aa" style={{ gap: 14, alignItems: 'flex-end', color: 'var(--ink-2)' }}>
          <span aria-hidden="true" style={{ fontSize: 15, fontWeight: 800 }}>
            Aa
          </span>
          <span aria-hidden="true" style={{ fontSize: 18, fontWeight: 800 }}>
            Aa
          </span>
          <span aria-hidden="true" style={{ fontSize: 21, fontWeight: 800 }}>
            Aa
          </span>
          <span className="t12 c3 grow">{t('Thème et taille mémorisés sur ce téléphone, appliqués sans redémarrer.')}</span>
        </div>
      </Carte>
      <Sec titre={t('Tournée')} />
      <Carte cls="tight">
        <LivcSet icone="volume-2" ton="acc" t={t('Lecture vocale des consignes')} s={t('Dans la langue choisie, même sans réseau · seule présence de l’assistant IA dans l’application livreur')}>
          <Tg on={compte.donnees?.lectureVocale ?? true} changer={(v) => void regler({ lectureVocale: v })} label={t('Lecture vocale des consignes')} />
        </LivcSet>
        <LivcSet icone="bell-ring" ton="or" t={t('Notifications de tournée')} s={t(disponible ? 'Toujours actives quand vous êtes disponible.' : 'Hors service : aucune notification de tournée ; compte et messages restent.')}>
          <Tg on={disponible} verrou label={t('Notifications de tournée')} />
        </LivcSet>
      </Carte>
      <SectionConfort />
      <Sec titre={t('Envoi des photos')} />
      <div role="radiogroup" aria-label={t('Envoi des photos')}>
        <Radio on={envoi === 'immediat'} t={t('Envoi immédiat')} s={t('Dès que le réseau le permet')} choisir={() => void regler({ envoiPhotos: 'immediat' })} />
        <Radio on={envoi === 'wifi'} t={t('Wi-Fi seulement')} s={regles.donnees ? tf('Attente de {h} h au plus, puis envoi par les données mobiles', { h: regles.donnees.wifiAttenteMaxH }) : t('Attente limitée, puis envoi par les données mobiles')} choisir={() => void regler({ envoiPhotos: 'wifi' })} />
      </div>
      <Note ton="acc" icone="shield-check">
        {t('« Wi-Fi seulement » ne s’applique')} <b>{t('jamais')}</b> {t('aux photos de preuve d’un colis sous votre garde : elles partent dès que le réseau le permet.')}
      </Note>
      <div className="card l10-jamais2" style={{ marginTop: 14 }}>
        <div className="row" style={{ gap: 10 }}>
          <LivcIc icone="lock-keyhole" ton="night" taille={40} />
          <div className="grow">
            <div className="b8 t14">{t('Ce qu’aucun réglage ne coupe')}</div>
            <div className="t13 c3 mt4">{t('Les étapes de preuve, les contrôles, l’appel masqué, les alertes de sécurité, les incidents bloquants et les échéances.')}</div>
          </div>
        </div>
      </div>
      <SectionSecurite deconnexion={() => ouvrir('deconnexion')} />
      <Hint icone="smartphone">{t('Ce téléphone est réservé à votre compte : aucun réglage n’ouvre l’accès à un autre utilisateur.')}</Hint>
      <Foot icone={en ? 'settings' : 'wifi-off'}>{en ? tf('BelivaY livreur · version {v}', { v: VERSION }) : depuis !== null ? tf('Hors connexion · dernière synchronisation à {h}', { h: heure(depuis, lg) }) : t('Hors connexion')}</Foot>
      <LiensLegaux />
      {etat === 'deconnexion' ? <div className="l10-cta-place" aria-hidden="true"></div> : null}
    </Ecran>
  )
}
