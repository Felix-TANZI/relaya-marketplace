// Menu de l'espace livreur (« ☰ » de l'en-tête racine) : page DISTINCTE du profil (« Moi », ouvert par l'avatar),
// comme les menus des prototypes point relais et vendeur et le menu par défaut du moteur des prototypes (defaultMenu :
// titre de groupe « divider-t », carte « tight » de lignes « li », pied « foot ») :
// - carte nuit du livreur (photo vérifiée, entreprise, véhicule, zone, état) qui ouvre son profil ;
// - pas de recherche globale (DP-66 : retirée ; l'historique garde sa propre recherche) ;
// - navigation groupée (config/navigation.ts), raccourcis seulement (Menu ≠ Moi) dans l'ordre de la route : la journée, la route, les résultats, le compte ;
//   un compteur n'apparaît que s'il y a quelque chose à voir (notifications non lues, arrêts restants, messages) ;
// - affichage : langue FR / EN (la langue ne se change pas dans l'en-tête, APP.hdLang = false), thème (le sombre pour
//   la nuit, ou automatique), taille du texte (8 paliers, comme le client) ;
// - « Verrouiller » (LIV-03-R16 : la session se ferme, le téléphone reste lié, le PIN est redemandé) ;
// - pied : version lue dans la construction, entreprise.
import { Link } from 'react-router-dom'
import { badge } from '@client/i18n/format'
import { Ecran, usePastilles } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { BadgeNum, Foot, Li, Pill } from '../../composants/proto'
import { chemin } from '../../config/pages'
import { NAVIGATION } from '../../config/navigation'
import { source } from '../../donnees/source'
import { ECHELLES, usePreferences, type ChoixTheme } from '../../preferences'
import { useSession } from '../../session'
import '../../composants/enrichis.css'
import './liv10.css'

const VERSION = (import.meta.env.VITE_VERSION_LIVREUR as string | undefined) ?? ''

export default function Menu() {
  const { t, tf, langue, setLangue, choixTheme, setTheme, echelle, setEchelle } = usePreferences()
  const ie = ECHELLES.indexOf(echelle)
  const s = useSession()
  const pastilles = usePastilles()
  const l = s.livreur
  const compte = (route: string) => {
    const n = route === 'notifications' ? s.badges.notifications : route === 'tournee' ? s.badges.tournee : route === 'messages' ? s.badges.messages : 0
    const b = badge(n)
    return b ? <BadgeNum n={b} ton={route === 'tournee' ? 'acc' : ''} /> : null
  }
  // Verrouiller : la session se ferme (le téléphone reste lié), puis l'application repart de la connexion, qui demande
  // le PIN (rechargée : rien de la session ne reste en mémoire, la page quittée n'est pas proposée comme suite).
  const verrouiller = async () => {
    await source.session.deconnecter()
    location.replace(import.meta.env.BASE_URL.replace(/\/$/, '') + chemin('connexion'))
  }
  const choix = <T extends string>(valeur: T, actuel: T, poser: (v: T) => void, libelle: string, icone?: string) => (
    <button type="button" role="radio" aria-checked={valeur === actuel} className={valeur === actuel ? 'on' : undefined} onClick={() => poser(valeur)} aria-label={icone ? t(libelle) : undefined}>
      {icone ? <Icone nom={icone} taille={18} /> : t(libelle)}
    </button>
  )
  return (
    <Ecran route="menu" proto>
      <Link className="hero night lm-carte" to={chemin('moi')} aria-label={l ? tf('Mon profil : {nom}', { nom: `${l.prenom} ${l.nom}` }) : t('Mon profil')}>
        <div className="row">
          <span className={'l-avatar l-avatar-g' + (l?.photo ? ' a-photo' : '')}>{l?.photo ? <img src={l.photo} alt="" /> : l?.initiales}</span>
          <div className="grow">
            <div className="hk">{t('Livreur partenaire')}</div>
            <div className="ht" style={{ marginTop: 2 }}>
              {l ? `${l.prenom} ${l.nom}` : t('Espace livreur')}
            </div>
            {l && <div className="hs" style={{ marginTop: 2 }}>{`${l.entreprise} · ${t(l.vehicule)} · ${l.zone}`}</div>}
          </div>
          <Icone nom="chevron-right" taille={20} />
        </div>
        <div className="row wrap" style={{ gap: 6, marginTop: 12 }}>
          {pastilles.map((p) => (
            <Pill key={p.vers + p.texte} ton="dk" point={p.point} icone={p.icone}>
              {p.texte}
            </Pill>
          ))}
        </div>
      </Link>
      {NAVIGATION.map((g) => (
        <section key={g.titre} aria-label={t(g.titre)}>
          <div className="divider-t">{t(g.titre)}</div>
          <div className="card tight">
            {g.entrees
              .filter((e) => e.route !== 'moi')
              .map((e) => (
                <Li key={e.route} icone={e.icone} ton={e.route === 'incident' ? 'red' : 'acc'} t={t(e.titre)} vers={chemin(e.route)} droite={compte(e.route)} />
              ))}
          </div>
        </section>
      ))}
      <section aria-label={t('Affichage')}>
        <div className="divider-t">{t('Affichage')}</div>
        <div className="card tight">
          <div className="li">
            <span className="ic acc">
              <Icone nom="languages" taille={20} />
            </span>
            <span className="grow lt">{t('Langue')}</span>
            <span className="l-choix" role="radiogroup" aria-label={t('Langue')}>
              {choix('fr', langue, setLangue, 'FR')}
              {choix('en', langue, setLangue, 'EN')}
            </span>
          </div>
          <div className="li">
            <span className="ic acc">
              <Icone nom="sun-moon" taille={20} />
            </span>
            <span className="grow lt">{t('Thème')}</span>
            <span className="l-choix" role="radiogroup" aria-label={t('Thème')}>
              {choix<ChoixTheme>('light', choixTheme, setTheme, 'Clair', 'sun')}
              {choix<ChoixTheme>('dark', choixTheme, setTheme, 'Sombre', 'moon')}
              {choix<ChoixTheme>('auto', choixTheme, setTheme, 'Automatique', 'smartphone')}
            </span>
          </div>
          <div className="li" role="group" aria-label={t('Taille du texte')}>
            <span className="ic acc">
              <Icone nom="text" taille={20} />
            </span>
            <span className="grow lt">{t('Taille du texte')}</span>
            <span className="l-choix">
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
          <Li icone="sliders-horizontal" ton="ink" t={t('Tous les réglages')} s={t('Lecture vocale, sons, mode une main, données')} vers={chemin('reglages')} />
        </div>
      </section>
      <div className="card tight">
        <Li icone="lock" ton="ink" t={t('Verrouiller')} s={t('Votre code PIN à la prochaine ouverture')} onClick={() => void verrouiller()} cls="lm-sortie" />
      </div>
      <Foot icone="shield-check">{l ? tf('BelivaY livreur · version {v} · {entreprise}', { v: VERSION, entreprise: l.entreprise }) : tf('BelivaY livreur · version {v}', { v: VERSION })}</Foot>
    </Ecran>
  )
}
