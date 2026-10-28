// « Changer de compte » : les comptes déjà utilisés sur cet appareil (photo, nom, Cameroun ou Diaspora), un toucher
// pour basculer, « Ajouter un compte », « Se déconnecter ». Le compte choisi devient celui de l'appareil : il se
// rouvre après un rechargement ; tout ce qui dépend du compte (panier, favoris, adresses, devise) est relu (session.tsx).
// Depuis le compte (feuille) et depuis l'écran de connexion (liste). Couleurs : jetons communs, clair comme sombre.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { chemin } from '../config/pages'
import { garderSuite, lireSuite, versApresConnexion } from '../donnees/connexion'
import { source, type CompteAppareil } from '../donnees/source'
import { usePreferences } from '../preferences'
import { useMajSession } from '../session'
import { Feuille } from './Feuille'
import { Icone } from './Icone'

const STYLE = `
.cpt-l{display:flex;flex-direction:column}
.cpt-r{display:flex;align-items:center;gap:12px;width:100%;min-height:60px;padding:10px 0;border:0;border-top:1px solid var(--line);background:none;color:inherit;font:inherit;text-align:left;cursor:pointer}
.cpt-r:first-of-type{border-top:0}
.cpt-r[aria-busy=true]{opacity:.6}
.cpt-a{flex:none;width:40px;height:40px;border-radius:50%;overflow:hidden;display:grid;place-items:center;font-size:14px;font-weight:800;background:var(--or-soft);color:var(--or-txt)}
.cpt-a img{width:100%;height:100%;object-fit:cover;display:block}
.cpt-n{flex:1;min-width:0}
.cpt-n b{display:block;font-size:15px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cpt-n span{display:block;font-size:13px;color:var(--ink-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cpt-ok{flex:none;color:var(--green)}
.cpt-ch{flex:none;color:var(--ink-4)}
`

const initiales = (c: CompteAppareil) =>
  c.nomComplet
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0])
    .join('')
    .toUpperCase() || '·'

/** Les comptes de l'appareil (null tant qu'ils ne sont pas lus). */
export function useComptesAppareil(lire = true): CompteAppareil[] | null {
  const [comptes, setComptes] = useState<CompteAppareil[] | null>(null)
  useEffect(() => {
    if (!lire) return
    let vivant = true
    source.comptesAppareil().then((c) => vivant && setComptes(c))
    return () => {
      vivant = false
    }
  }, [lire])
  return comptes
}

/**
 * Basculer vers un compte : il s'ouvre et l'écran demandé (ou l'accueil, l'espace diaspora pour un compte
 * diaspora) s'affiche ; un compte que l'appareil ne retient pas passe par son mot de passe, adresse préremplie.
 */
export function useBasculer(suite?: string) {
  const majSession = useMajSession()
  const naviguer = useNavigate()
  const [enCours, setEnCours] = useState<string | null>(null)
  const basculer = async (cle: string) => {
    if (enCours) return
    setEnCours(cle)
    try {
      const r = await source.basculerCompte(cle)
      if (!r.ok) return naviguer(chemin('connexion-email', { email: r.email }))
      const vers = versApresConnexion(r.session, suite ?? lireSuite())
      garderSuite(null)
      naviguer(vers, { replace: true })
      majSession(r.session)
    } finally {
      setEnCours(null)
    }
  }
  return { basculer, enCours }
}

/** La liste des comptes : un toucher pour basculer (le compte ouvert est coché). */
export function ListeComptes({ comptes, choisir, enCours }: { comptes: CompteAppareil[]; choisir: (c: CompteAppareil) => void; enCours: string | null }) {
  const { t, tf } = usePreferences()
  return (
    <div className="cpt-l">
      <style>{STYLE}</style>
      {comptes.map((c) => (
        <button
          key={c.cle}
          type="button"
          className="cpt-r"
          aria-busy={enCours === c.cle}
          aria-current={c.ouvert || undefined}
          aria-label={tf(c.ouvert ? '{n}, compte ouvert' : 'Passer au compte de {n}', { n: c.nomComplet })}
          onClick={() => choisir(c)}
        >
          <span className="cpt-a" aria-hidden="true">
            {c.photo ? <img src={c.photo} alt="" /> : initiales(c)}
          </span>
          <span className="cpt-n">
            <b>{c.nomComplet}</b>
            <span>{c.type === 'diaspora' ? (c.pays ? tf('Diaspora · {p}', { p: t(c.pays) }) : t('Diaspora')) + ' · ' + c.emailMasque : t('Cameroun') + ' · ' + c.emailMasque}</span>
          </span>
          <span className={c.ouvert ? 'cpt-ok' : 'cpt-ch'} aria-hidden="true">
            <Icone nom={c.ouvert ? 'circle-check' : 'chevron-right'} taille={c.ouvert ? 20 : 18} />
          </span>
        </button>
      ))}
    </div>
  )
}

/** Feuille « Changer de compte » (depuis le compte et le menu du profil). */
export function FeuilleComptes({ ouverte, fermer }: { ouverte: boolean; fermer: () => void }) {
  const { t } = usePreferences()
  const naviguer = useNavigate()
  const comptes = useComptesAppareil(ouverte)
  const { basculer, enCours } = useBasculer(chemin('accueil'))
  const deconnecter = async () => {
    await source.deconnecter()
    // Comme « Se déconnecter » du compte : le site repart en visiteur, sans rien garder en mémoire du compte.
    window.location.assign(chemin('accueil'))
  }
  return (
    <Feuille ouverte={ouverte} fermer={fermer} titre={t('Changer de compte')}>
      <h2 className="pg-t" style={{ fontSize: 19 }}>
        {t('Changer de compte')}
      </h2>
      <p className="pg-s">{t('Les comptes déjà utilisés sur cet appareil. Chacun garde son panier, ses favoris et ses adresses.')}</p>
      <div className="card tight mt12">{comptes && <ListeComptes comptes={comptes} enCours={enCours} choisir={(c) => (c.ouvert ? fermer() : void basculer(c.cle))} />}</div>
      <div className="mt12">
        <button type="button" className="btn secondary" onClick={() => naviguer(chemin('connexion', { ajout: '1' }))}>
          <Icone nom="user-plus" taille={18} />
          <span>{t('Ajouter un compte')}</span>
        </button>
      </div>
      <div className="mt10">
        <button type="button" className="btn ghost" onClick={deconnecter}>
          <Icone nom="log-out" taille={18} />
          <span>{t('Se déconnecter')}</span>
        </button>
      </div>
    </Feuille>
  )
}
