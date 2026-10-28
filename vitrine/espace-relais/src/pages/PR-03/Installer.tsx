// Installer l'application (PR-03 § 6 ; PWA-01 à 03, ARL-24 : PWA au lancement, magasins ensuite). Ouvert sans session
// (CNX-05) ; pas de barre du bas tant que le relais n'est pas actif (ARL-27).
// - l'onglet du téléphone est choisi d'office (iPhone : Safari ; sinon Android), l'autre reste à un toucher ;
// - iPhone : 4 étapes dans Safari, « Copier le lien » pour l'ouvrir dans Safari depuis un autre navigateur ;
// - Android : 2 étapes et « Installer » (invite beforeinstallprompt gardée par installation.ts ; sans invite : le
//   chemin du menu ⋮ de Chrome) ;
// - déjà installée : on le dit, et l'on va au guichet ;
// - pourquoi l'installer : hors connexion, notifications, poids sous PR-PWA-POIDS-MO.
// Structure du prototype (Installer, états defaut et and) : icône, titre, bascule iPhone / Android, carte d'étapes
// numérotées, carte « Pourquoi l'installer ».
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import marque from '../../assets/marque-belivay.png'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { ACCUEIL, chemin } from '../../config/pages'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { Note } from './commun'
import { plateforme, useInstallation, type Plateforme } from './installation'
import { ACCES } from './parametres'
import './pr03.css'

export default function Installer() {
  const { t, tf } = usePreferences()
  const session = useSession()
  const r = session.relais
  const actif = session.connecte && !!r && r.statut !== 'candidat' && r.statut !== 'en_configuration' && r.statut !== 'clos'
  const [os, setOs] = useState<Plateforme>(plateforme)
  const inst = useInstallation()
  const [msg, setMsg] = useState<{ ton: 'vert' | 'ambre' | 'accent'; texte: string } | null>(null)
  const premiere = useRef<HTMLDivElement>(null)
  const installer = async () => {
    const r = await inst.installer()
    if (r === 'acceptee') {
      signal('succes')
      return setMsg({ ton: 'vert', texte: t('C’est fait : l’icône BelivaY Relais est sur votre écran d’accueil.') })
    }
    if (r === 'refusee') return setMsg({ ton: 'ambre', texte: t('Installation annulée. Vous pourrez la refaire quand vous voulez.') })
    setMsg({ ton: 'accent', texte: t('Ce navigateur ne propose pas le bouton : ouvrez le menu ⋮ de Chrome, puis « Installer l’application » (ou « Ajouter à l’écran d’accueil »).') })
    premiere.current?.focus()
  }
  const copier = async () => {
    const lien = location.origin + import.meta.env.BASE_URL
    try {
      await navigator.clipboard.writeText(lien)
      setMsg({ ton: 'vert', texte: t('Lien copié : collez-le dans la barre d’adresse de Safari.') })
    } catch {
      setMsg({ ton: 'accent', texte: tf('Ouvrez Safari et tapez : {lien}', { lien }) })
    }
  }
  const etape = (n: number, titre: string, texte: string, ref?: React.Ref<HTMLDivElement>) => (
    <div className="p-ek1p8z" ref={ref} tabIndex={ref ? -1 : undefined}>
      <span className="p-mb8x3g" aria-hidden="true">
        {n}
      </span>
      <div>
        <div className="p-dfc4i3">
          <span className="pr3-sr">{tf('Étape {n} :', { n })} </span>
          {titre}
        </div>
        <div className="p-l750d6">{texte}</div>
      </div>
    </div>
  )
  return (
    <Ecran route="installer" barre={actif}>
      <div className="p-0hxmj8 r-pile pr3">
        <div className="p-908no5">
          <div className="p-78e8u1">
            <img src={marque} alt="" className="p-w1wmof" />
          </div>
          <h2 className="p-blzquz">{t('Installer BelivaY Relais')}</h2>
          <div className="p-ietgpj">{t('Une icône sur l’écran d’accueil, sans passer par un store')}</div>
        </div>
        {inst.installee ? (
          <div className="p-yi6rkz">
            <Note ton="vert">{t('L’application est déjà installée sur ce téléphone : ouvrez-la depuis son icône.')}</Note>
            <Link to={chemin(session.connecte ? ACCUEIL : 'connexion')} className="p-ncx7qc">
              {session.connecte ? t('Aller au guichet') : t('Se connecter')}
            </Link>
          </div>
        ) : (
          <>
            <div className="p-lvzt0c" role="tablist" aria-label={t('Votre téléphone')}>
              {(
                [
                  ['ios', 'iPhone'],
                  ['android', 'Android'],
                ] as [Plateforme, string][]
              ).map(([id, nom]) => (
                <button key={id} type="button" role="tab" aria-selected={os === id} className={os === id ? 'p-h01hlk' : 'p-bq7aiq'} onClick={() => (setOs(id), setMsg(null))}>
                  {t(nom)}
                </button>
              ))}
            </div>
            <div className="p-yi6rkz" role="tabpanel">
              {os === 'ios' ? (
                <>
                  {etape(1, t('Ouvrez ce lien dans Safari'), t('L’installation n’est possible que depuis Safari'))}
                  {etape(2, t('Touchez le bouton Partager'), t('Le carré avec une flèche, en bas de l’écran'))}
                  {etape(3, t('« Sur l’écran d’accueil »'), t('Faites défiler la liste si besoin'))}
                  {etape(4, t('Touchez « Ajouter »'), t('L’icône BelivaY apparaît sur votre écran'))}
                  <button type="button" className="p-rbzobc" onClick={() => void copier()}>
                    <Icone nom="copy" taille={18} className="p-emic6i" />
                    {t('Copier le lien pour Safari')}
                  </button>
                </>
              ) : (
                <>
                  {etape(1, t('Touchez « Installer » ci-dessous'), t('Ou le menu ⋮ de Chrome → « Installer l’application »'), premiere)}
                  {etape(2, t('Confirmez'), t('L’icône BelivaY apparaît dans vos applications'))}
                  <button type="button" className="p-ncx7qc" onClick={() => void installer()}>
                    <Icone nom="r-telecharger" taille={18} className="p-7dsggt" />
                    {t('Installer')}
                  </button>
                </>
              )}
              {msg && <Note ton={msg.ton}>{msg.texte}</Note>}
            </div>
          </>
        )}
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">{t('Pourquoi l’installer')}</h2>
          </div>
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-reseau" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">{t('Marche sans réseau')}</div>
              <div className="p-dfa05r">{t('Réceptions et remises enregistrées hors connexion')}</div>
            </div>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-cloche" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">{t('Notifications')}</div>
              <div className="p-dfa05r">{t('Livreur en approche, résumé du matin')}</div>
            </div>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-telecharger" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">{t('Léger')}</div>
              <div className="p-dfa05r">{tf('Moins de {n} Mo, peu de données consommées', { n: ACCES.pwaMo })}</div>
            </div>
          </div>
        </div>
      </div>
    </Ecran>
  )
}
