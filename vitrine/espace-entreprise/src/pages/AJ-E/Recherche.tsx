// Rechercher partout (AJ-E, motif M4) : une seule barre qui cherche dans tout l'espace — paquets, missions, colis,
// livreurs, incidents, litiges, véhicules, zones et pages. Ouverte depuis la barre du haut (« Tout voir »), par ⌘K ou
// « / » au téléphone et à la tablette, depuis le Menu, et par toute adresse « ?q= » (lien profond).
// - Résultats groupés dans un ordre fixe, avec leur nombre ; un identifiant exact passe en tête.
// - Sans texte : recherches récentes (sur l'appareil, effaçables) et raccourcis vers les pages les plus utilisées.
// - Rôles (ENT-RG-R25) : une page fermée au rôle n'est ni lue ni proposée. Anonymat (GEN-01) : rien du client.
import './aje.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Li, Note, Pill, Sec, Vide } from '../../composants/prototype'
import { GENRES, adresseDirecte, chargerIndex, filtrer, oublierRecentes, recentes, retenir, type Resultat } from '../../composants/recherche'
import { chemin } from '../../config/pages'
import { usePreferences } from '../../preferences'
import { useRouteOuverte } from '../../session'

const RACCOURCIS = [
  { route: 'paquets', titre: 'Paquets disponibles', icone: 'boxes' },
  { route: 'missions', titre: 'Missions et carte', icone: 'map' },
  { route: 'flotte', titre: 'Livreurs', icone: 'users' },
  { route: 'incidents', titre: 'Incidents à valider', icone: 'triangle-alert' },
  { route: 'reglements', titre: 'Règlements', icone: 'banknote' },
  { route: 'apprendre', titre: 'Apprendre', icone: 'graduation-cap' },
]

export default function Recherche() {
  const { t, tf } = usePreferences()
  const [params, setParams] = useSearchParams()
  const naviguer = useNavigate()
  const ouverte = useRouteOuverte()
  const champ = useRef<HTMLInputElement>(null)
  const q = params.get('q') ?? ''
  const [saisie, setSaisie] = useState(q)
  const [index, setIndex] = useState<Resultat[] | null>(null)
  const [erreur, setErreur] = useState(false)
  const [rec, setRec] = useState(recentes)
  useEffect(() => setSaisie(q), [q])
  useEffect(() => {
    let vivant = true
    chargerIndex(ouverte, t).then(
      (i) => vivant && setIndex(i),
      () => vivant && setErreur(true),
    )
    return () => {
      vivant = false
    }
  }, [ouverte, t])
  useEffect(() => {
    champ.current?.focus({ preventScroll: true })
  }, [])
  // La saisie suit l'adresse (lien profond, retour arrière) sans empiler une entrée par lettre.
  const poser = (v: string) => {
    setSaisie(v)
    const p = new URLSearchParams(params)
    if (v.trim()) p.set('q', v)
    else p.delete('q')
    setParams(p, { replace: true })
  }
  const res = useMemo(() => (index ? filtrer(index, saisie, 200) : []), [index, saisie])
  const groupes = GENRES.map((g) => ({ ...g, lignes: res.filter((r) => r.genre === g.genre) })).filter((g) => g.lignes.length)
  const ouvrir = (vers: string) => {
    retenir(saisie)
    naviguer(vers)
  }
  return (
    <Ecran route="recherche">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          const d = adresseDirecte(saisie)
          if (d) ouvrir(d)
          else if (res[0]) ouvrir(res[0].vers)
        }}
      >
        <label className="fld fld-l" style={{ marginTop: 0 }}>
          <span className="vh">{t('Rechercher partout')}</span>
          <span className="inp">
            <Icone nom="search" taille={18} />
            <input ref={champ} type="search" value={saisie} onChange={(e) => poser(e.target.value)} placeholder={t('Paquet, colis, livreur…')} enterKeyHint="search" autoComplete="off" />
          </span>
        </label>
      </form>
      {erreur && (
        <Note ton="red" icone="cloud-off" className="mt10">
          {t('Une partie de la recherche n’a pas pu être chargée. Vérifiez la connexion, puis réessayez.')}
        </Note>
      )}
      {!saisie.trim() ? (
        <>
          {rec.length > 0 && (
            <>
              <div className="sec">
                <h2>{t('Recherches récentes')}</h2>
                <button
                  type="button"
                  className="a lien-b"
                  style={{ textDecoration: 'none' }}
                  onClick={() => {
                    oublierRecentes()
                    setRec([])
                  }}
                >
                  {t('Effacer')}
                </button>
              </div>
              <div className="card tight">
                {rec.map((r) => (
                  <Li key={r} icone="history" ton="ink" t={r} onClick={() => poser(r)} />
                ))}
              </div>
            </>
          )}
          <Sec t={t('Raccourcis')} />
          <div className="card tight">
            {RACCOURCIS.filter((r) => ouverte(r.route)).map((r) => (
              <Li key={r.route} icone={r.icone} ton="acc" t={t(r.titre)} to={chemin(r.route)} />
            ))}
          </div>
          <p className="t12 c3 mt12">{t('Astuce : ⌘K ou Ctrl+K cherche depuis n’importe quelle page ; « ? » liste les raccourcis du clavier.')}</p>
        </>
      ) : !index ? (
        <div aria-busy="true" aria-label={t('Chargement')} className="chargement mt14" />
      ) : groupes.length === 0 ? (
        <Vide icone="search-x" t={tf('Aucun résultat pour « {q} »', { q: saisie.trim() })} s={t('Vérifiez l’orthographe, cherchez un identifiant entier (PQ-…, MS-…, IN-…, LT-…) ou un nom de livreur.')} />
      ) : (
        <>
          <p className="t13 c3 mt12" role="status">
            {tf('{n} résultat(s)', { n: res.length })}
          </p>
          {groupes.map((g) => (
            <section key={g.genre} aria-label={t(g.titre)}>
              <div className="sec">
                <h2>{t(g.titre)}</h2>
                <Pill sm>{g.lignes.length}</Pill>
              </div>
              <div className="card tight">
                {g.lignes.map((r) => (
                  <Li key={r.genre + r.id} icone={r.icone} ton="acc" t={r.titre} s={r.sous} onClick={() => ouvrir(r.vers)} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </Ecran>
  )
}
