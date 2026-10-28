// Réglages (LIV-P31), bloc « Sons et confort », fusionné dans les Réglages (DP-66 : une page par besoin ; l'ancienne
// adresse /confort y mène, ?voir=confort) : sons, vibrations, animations, économie de données, mode une main
// (CONF-LIV-UNE-MAIN) ; notifications : heures calmes (21 h → 6 h : messages et compte sans son ; la tournée sonne
// toujours), notifications du téléphone (autorisation demandée ici, au bon moment), notification d'essai ;
// confidentialité : gains masqués jusqu'au toucher ; application d'itinéraire (CONF-LIV-NAV). Préférences d'appareil,
// mémorisées sur ce téléphone et appliquées tout de suite. Même balisage que les réglages (livc-set).
import { useState } from 'react'
import { Btn, Carte, Hint, Note, Sec } from '../../composants/proto'
import { ApercuSons } from '@client/composants/ApercuSons'
import { signal } from '../../composants/signaux'
import { HEURES_CALMES, usePreferences, type AppliNavigation } from '../../preferences'
import { LivcIc, Radio, Tg } from './livc'

const ITINERAIRE: [AppliNavigation, string, string][] = [
  ['integree', 'Carte intégrée', 'OpenStreetMap, marche hors connexion'],
  ['google', 'Google Maps', 'Reçoit seulement le point de l’arrêt'],
  ['waze', 'Waze', 'Reçoit seulement le point de l’arrêt'],
  ['telephone', 'Application du téléphone', 'Celle que le téléphone propose'],
]

type Autorisation = NotificationPermission | 'absente'
const autorisation = (): Autorisation => (typeof Notification === 'undefined' ? 'absente' : Notification.permission)

export function SectionConfort() {
  const p = usePreferences()
  const { t, tf } = p
  const [permis, setPermis] = useState<Autorisation>(autorisation)
  const [essai, setEssai] = useState(false)
  const autoriser = async () => {
    if (typeof Notification === 'undefined') return
    setPermis(await Notification.requestPermission())
  }
  const essayer = () => {
    signal('nouveau')
    if (permis === 'granted')
      try {
        new Notification(t('BelivaY livreur'), { body: t('Notification d’essai : tout fonctionne.') })
      } catch {
        /* notification refusée par le téléphone : le son et la vibration suffisent */
      }
    setEssai(true)
  }
  const etatPermis = permis === 'granted' ? 'Autorisées sur ce téléphone' : permis === 'denied' ? 'Bloquées : à autoriser dans les réglages du téléphone' : permis === 'absente' ? 'Ce navigateur ne les gère pas : l’application sonne quand elle est ouverte' : 'Pas encore autorisées'
  const lignes: [string, string, string, string, boolean, (v: boolean) => void][] = [
    ['volume-2', 'acc', 'Sons', 'Arrivée d’un paquet, validation, alerte', p.sons, p.setSons],
    ['smartphone-nfc', 'acc', 'Vibrations', 'Sentir un nouvel événement, téléphone en poche', p.vibrations, p.setVibrations],
    ['sparkles', 'ink', 'Animations réduites', 'Moins de mouvements à l’écran', p.animationsReduites, p.setAnimationsReduites],
    ['wifi', 'ink', 'Économie de données', 'Cartes de zone téléchargées une fois, images allégées', p.donneesEconomes, p.setDonneesEconomes],
    ['smartphone', 'ink', 'Mode une main', 'Les boutons d’action restent en bas de l’écran, à portée du pouce', p.uneMain, p.setUneMain],
  ]
  return (
    <>
      <Sec titre={t('Sons et confort')} id="l10-voir-confort" />
      <Carte cls="tight">
        {lignes.map(([icone, ton, titre, sous, on, poser]) => (
          <div key={titre} className="livc-set">
            <LivcIc icone={icone} ton={ton} taille={40} />
            <div className="grow">
              <div className="st">{t(titre)}</div>
              <div className="ss">{t(sous)}</div>
            </div>
            <Tg on={on} changer={poser} label={t(titre)} />
          </div>
        ))}
        <div className="livc-set">
          <LivcIc icone="moon-star" ton="ink" taille={40} />
          <div className="grow">
            <div className="st">{t('Heures calmes')}</div>
            <div className="ss">{tf('De {de} h à {a} h, les messages et le compte arrivent sans son ni vibration. La tournée et la sécurité sonnent toujours.', { de: HEURES_CALMES[0], a: HEURES_CALMES[1] })}</div>
          </div>
          <Tg on={p.heuresCalmes} changer={p.setHeuresCalmes} label={t('Heures calmes')} />
        </div>
        <div className="livc-set">
          <LivcIc icone="bell-ring" ton="acc" taille={40} />
          <div className="grow">
            <div className="st">{t('Notifications du téléphone')}</div>
            <div className="ss">{t(etatPermis)}</div>
          </div>
        </div>
        <div className="livc-set">
          <LivcIc icone="eye-off" ton="ink" taille={40} />
          <div className="grow">
            <div className="st">{t('Masquer mes gains')}</div>
            <div className="ss">{t('Les montants restent cachés jusqu’à un toucher, utile quand quelqu’un regarde votre écran.')}</div>
          </div>
          <Tg on={p.soldeMasque} changer={p.setSoldeMasque} label={t('Masquer mes gains')} />
        </div>
        <ApercuSons />
      </Carte>
      <div className="btns">
        {permis === 'default' && (
          <Btn kind="secondary" icone="bell" onClick={() => void autoriser()}>
            {t('Autoriser les notifications')}
          </Btn>
        )}
        <Btn kind="secondary" icone="volume-2" onClick={essayer}>
          {t('Recevoir une notification d’essai')}
        </Btn>
      </div>
      {essai && (
        <Note ton="acc" icone="circle-check" role="status">
          {t(p.sons || p.vibrations ? 'Essai envoyé : vous avez dû entendre un son ou sentir une vibration.' : 'Essai envoyé, sans son ni vibration : ils sont coupés plus haut.')}
        </Note>
      )}
      <Sec titre={t('Ouvrir l’itinéraire dans')} />
      <div role="radiogroup" aria-label={t('Ouvrir l’itinéraire dans')}>
        {ITINERAIRE.map(([v, titre, sous]) => (
          <Radio key={v} on={p.appliNavigation === v} t={t(titre)} s={t(sous)} choisir={() => p.setAppliNavigation(v)} />
        ))}
      </div>
      <Hint icone="shield-check">{t('Une autre application reçoit seulement le point de l’arrêt, jamais le nom ni le numéro du client.')}</Hint>
    </>
  )
}
