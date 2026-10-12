// Menu sous l'avatar (prototype du 1er oct., V11 : « ?pop=profil ») : carte du membre connecté, Ma boutique, Mon argent
// (montant à verser : propriétaire seulement), Messagerie et Notifications (non lus), Paramètres, Sécurité, Aide,
// Se déconnecter (la session se ferme vraiment, puis la connexion). Le voile ou Échap le referme.
// AJ-B (DP-58) : la carte du membre et « Mon profil » mènent à la page Mon profil ; « Rechercher partout ».
import { useEffect, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { badge, F } from '@client/i18n/format'
import { chemin } from '../config/pages'
import { source } from '../donnees/source'
import { useLecture } from '../donnees/useLecture'
import { ECHELLES, usePreferences } from '../preferences'
import { useMontantsVisibles, useSession } from '../session'
import { Icone } from './Icone'
import { useMonVisuel } from '../donnees/visuelProfil'

export function MenuProfil() {
  const { t, tf, soldeMasque, echelle, setEchelle } = usePreferences()
  const ie = ECHELLES.indexOf(echelle)
  const s = useSession()
  const lieu = useLocation()
  const naviguer = useNavigate()
  const montants = useMontantsVisibles()
  const argent = useLecture(() => (montants ? source.argent.resume() : Promise.resolve(null)), [montants])
  const sans = (() => {
    const p = new URLSearchParams(lieu.search)
    p.delete('pop')
    const q = p.toString()
    return lieu.pathname + (q ? '?' + q : '')
  })()
  useEffect(() => {
    const echap = (e: KeyboardEvent) => e.key === 'Escape' && naviguer(sans, { replace: true })
    window.addEventListener('keydown', echap)
    return () => window.removeEventListener('keydown', echap)
  }, [naviguer, sans])
  const prep = s.membre?.role === 'preparation'
  const messages = badge(s.badges.messages)
  const notifs = badge(s.badges.notifications)
  const deconnecter = async () => {
    await source.session.deconnecter()
    naviguer(chemin('connexion'), { replace: true })
  }
  // Une entrée touchée referme d'abord le menu (l'adresse « ?pop=profil » est remplacée), puis ouvre la page : le
  // retour de cette page ramène à la page d'où le menu a été ouvert, menu fermé.
  const aller = (vers: string) => (e: React.MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    naviguer(sans, { replace: true })
    naviguer(chemin(vers))
  }
  const visuel = useMonVisuel()
  const ligne = (vers: string, icone: string, libelle: string, droite?: ReactNode) => (
    <Link className="r " to={chemin(vers)} onClick={aller(vers)}>
      <Icone nom={icone} taille={19} />
      <span className="g">{t(libelle)}</span>
      {droite}
    </Link>
  )
  return (
    <>
      <Link className="pm-veil" to={sans} replace aria-label={t('Fermer le menu')}></Link>
      <div className="pm" role="menu" aria-label={t('Menu du profil')}>
        {/* AJ-B (DP-58) : la carte du membre ouvre « Mon profil » ; « Rechercher partout » juste dessous. */}
        <Link className="ph" to={chemin('profil')} onClick={aller('profil')} style={{ color: 'inherit', textDecoration: 'none' }} aria-label={t('Mon profil')}>
          <span className={'avatar' + (visuel.photo ? ' a-photo' : '')}>{visuel.photo ? <img src={visuel.photo} alt="" /> : s.membre?.initiales}</span>
          <div>
            <b>{prep ? `${s.membre!.prenom} ${s.membre!.nom}` : s.boutique?.nom}</b>
            <span>{prep ? t('Accès Préparation') : tf('{nom} · propriétaire', { nom: `${s.proprietaire?.prenom} ${s.proprietaire?.nom}` })}</span>
          </div>
        </Link>
        {ligne('profil', 'circle-user-round', 'Mon profil')}
        {ligne('recherche', 'search', 'Rechercher partout')}
        <div className="gt">{t('Ma boutique')}</div>
        {ligne('boutique', 'store', 'Ma boutique')}
        {!prep && ligne('argent', 'wallet', 'Mon argent', argent.donnees && <span className="v cg">{tf('{montant} F à verser', { montant: soldeMasque ? '•• •••' : F(argent.donnees.aVerser) })}</span>)}
        {ligne('messages', 'messages-square', 'Messagerie', messages && <span className="badge-num">{messages}</span>)}
        {ligne('notifications', 'bell', 'Notifications', notifs && <span className="badge-num">{notifs}</span>)}
        <div className="gt">{t('Mon compte')}</div>
        {ligne('parametres', 'settings', 'Paramètres')}
        {ligne('securite', 'shield-check', 'Sécurité et appareils')}
        {ligne('aide', 'circle-help', 'Aide')}
        {/* Taille du texte, comme le menu du compte du client : plus petit, normal, plus grand (8 paliers, 85 à 140 %). */}
        <div className="r" role="group" aria-label={t('Taille du texte')} style={{ cursor: 'default' }}>
          <Icone nom="zoom-in" taille={19} />
          <span className="g">{t('Taille du texte')}</span>
          <span className="pp-choix">
            <button type="button" aria-label={t('Texte plus petit')} disabled={ie <= 0} onClick={() => setEchelle(ECHELLES[Math.max(0, ie - 1)])}>
              A−
            </button>
            <button type="button" aria-label={t('Taille normale')} aria-pressed={echelle === 100} className={echelle === 100 ? 'on' : undefined} onClick={() => setEchelle(100)}>
              A
            </button>
            <button type="button" aria-label={t('Texte plus grand')} disabled={ie >= ECHELLES.length - 1} onClick={() => setEchelle(ECHELLES[Math.min(ECHELLES.length - 1, ie + 1)])}>
              A+
            </button>
          </span>
        </div>
        <Link
          className="r out"
          to={chemin('connexion')}
          onClick={(e) => {
            e.preventDefault()
            void deconnecter()
          }}
        >
          <Icone nom="log-out" taille={19} />
          <span className="g">{t('Se déconnecter')}</span>
        </Link>
      </div>
    </>
  )
}
