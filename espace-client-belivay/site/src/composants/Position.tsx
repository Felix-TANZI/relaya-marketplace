// Position réelle du téléphone (DP-53 ; DP-49 : OpenStreetMap) : GPS du navigateur, précision, quartier servi le
// plus proche, carte avec le point, ouverture dans une application de cartes, partage, lieu le plus proche
// (géocodage inverse) et recherche d'un lieu (carrefour, école, église…) quand le GPS manque.
// La carte et la recherche passent par le connecteur des cartes (src/connecteurs/cartes.ts) : OpenStreetMap par
// défaut, Google Maps si la configuration le demande, avec repli sur OpenStreetMap.
import { useCallback, useEffect, useRef, useState } from 'react'
import { usePreferences } from '../preferences'
import { Icone } from './Icone'
import { CENTRES, distance } from '../donnees/geo'
import { EVENEMENT_REPLI, afficherCarte, fournisseur, geocoderInverse, lienCarte as lienDuFournisseur, rechercherAdresse, srcOsm, type Marqueur, type Proposition } from '../connecteurs/cartes'

export interface Coordonnees {
  lat: number
  lon: number
  precision: number // mètres ; 0 : point posé (centre d'un quartier, lieu cherché)
  libelle?: string // lieu cherché (« Carrefour Emana »), quand le point vient de la recherche
  quartier?: string // quartier donné par le fournisseur de cartes pour ce lieu, s'il le connaît
}

// Centre d'un quartier servi (carte d'un relais), s'il est connu.
export const centreQuartier = (q: string): Coordonnees | null => (CENTRES[q] ? { lat: CENTRES[q][0], lon: CENTRES[q][1], precision: 0 } : null)

// Distance géodésique (haversine), en mètres : la règle commune de src/donnees/geo.ts.
export { distance }

// Quartier servi le plus proche, s'il est à moins de 2,5 km ; sinon null (hors zone). Un lieu cherché dont le
// fournisseur de cartes donne le quartier, servi, garde ce quartier-là.
export function quartierProche(c: { lat: number; lon: number; quartier?: string }, zones: string[]): { quartier: string; metres: number } | null {
  const nomme = c.quartier && zones.find((z) => z.toLowerCase() === c.quartier!.toLowerCase())
  if (nomme && CENTRES[nomme]) return { quartier: nomme, metres: distance(c, { lat: CENTRES[nomme][0], lon: CENTRES[nomme][1] }) }
  let mieux: { quartier: string; metres: number } | null = null
  for (const z of zones) {
    const centre = CENTRES[z]
    if (!centre) continue
    const m = distance(c, { lat: centre[0], lon: centre[1] })
    if (!mieux || m < mieux.metres) mieux = { quartier: z, metres: m }
  }
  return mieux && mieux.metres <= 2500 ? mieux : null
}

export type EtatPosition = 'attente' | 'recherche' | 'ok' | 'refus' | 'indisponible'

export function useMaPosition() {
  const [etat, setEtat] = useState<EtatPosition>('attente')
  const [coords, setCoords] = useState<Coordonnees | null>(null)
  const demander = useCallback(() => {
    if (!navigator.geolocation) return setEtat('indisponible')
    setEtat('recherche')
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setCoords({ lat: p.coords.latitude, lon: p.coords.longitude, precision: Math.round(p.coords.accuracy) })
        setEtat('ok')
      },
      (e) => setEtat(e.code === e.PERMISSION_DENIED ? 'refus' : 'indisponible'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    )
  }, [])
  return { etat, coords, setCoords, demander }
}

// Lien de la carte dans le navigateur : celui du fournisseur (OpenStreetMap par défaut).
export const lienCarte = (c: { lat: number; lon: number }) => lienDuFournisseur(c)
// geo: ouvre l'application de cartes du téléphone (Android) ; ailleurs, la carte du fournisseur.
export const lienAppli = (c: { lat: number; lon: number }, nom: string) =>
  /Android/i.test(navigator.userAgent) ? `geo:${c.lat},${c.lon}?q=${c.lat},${c.lon}(${encodeURIComponent(nom)})` : lienCarte(c)

// Fournisseur en cours ; il repasse à OpenStreetMap si Google ne répond pas (clé refusée, réseau).
function useFournisseur() {
  const [nom, setNom] = useState(() => fournisseur().nom)
  useEffect(() => {
    const repli = () => setNom(fournisseur().nom)
    window.addEventListener(EVENEMENT_REPLI, repli)
    return () => window.removeEventListener(EVENEMENT_REPLI, repli)
  }, [])
  return nom
}

// Carte Google Maps (seulement quand elle est configurée) : posée par le connecteur dans ce bloc.
function CarteGoogle({ c, titre, marqueurs, choisir }: { c: Coordonnees; titre: string; marqueurs?: Marqueur[]; choisir?: (nom: string) => void }) {
  const el = useRef<HTMLDivElement>(null)
  // Le choix au clic sur un repère suit le dernier rendu, sans redessiner la carte.
  const refChoisir = useRef(choisir)
  useEffect(() => {
    refChoisir.current = choisir
  })
  const cle = JSON.stringify([c.lat, c.lon, marqueurs?.map((m) => [m.lat, m.lon, m.nom])])
  useEffect(() => {
    if (!el.current) return
    let retirer: (() => void) | null = null
    let fini = false
    afficherCarte(el.current, { centre: c, titre, marqueurs, choisir: choisir ? (m) => refChoisir.current?.(m.nom) : undefined }).then((f) => (fini ? f() : (retirer = f)))
    return () => {
      fini = true
      retirer?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle, titre, !!choisir])
  return <div ref={el} style={{ width: '100%', height: 180, borderRadius: 16, overflow: 'hidden', background: 'var(--map-bg)' }} />
}

// Lieu le plus proche du point GPS (géocodage inverse) : « Près de … ».
function useLieuProche(c: Coordonnees) {
  const [lieu, setLieu] = useState<string | null>(null)
  useEffect(() => {
    setLieu(null)
    if (!c.precision || c.libelle) return
    const a = new AbortController()
    geocoderInverse(c, a.signal).then(
      (l) => !a.signal.aborted && setLieu(l?.libelle ?? null),
      () => undefined, // hors ligne : la position seule suffit
    )
    return () => a.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.lat, c.lon, c.precision, c.libelle])
  return lieu
}

// Carte avec le point (vraie position), et ses actions. Avec des marqueurs (relais) : Google Maps les montre tous ;
// la carte intégrée OpenStreetMap montre le principal.
// choisir : clic sur le repère d'un relais (Google Maps) ; avec OpenStreetMap, l'écran garde sa liste cliquable.
export function CartePosition({ c, nom, texte, marqueurs, choisir }: { c: Coordonnees; nom: string; texte?: string; marqueurs?: Marqueur[]; choisir?: (nom: string) => void }) {
  const { t, tf } = usePreferences()
  const [copie, setCopie] = useState(false)
  const fourni = useFournisseur()
  const lieu = useLieuProche(c)
  const partager = async () => {
    const lien = lienCarte(c)
    try {
      if (navigator.share) await navigator.share({ title: nom, text: texte ?? nom, url: lien })
      else {
        await navigator.clipboard.writeText(lien)
        setCopie(true)
      }
    } catch {
      // Partage annulé.
    }
  }
  return (
    <>
      {fourni === 'google' ? (
        <CarteGoogle c={c} titre={t('Carte de ta position')} marqueurs={marqueurs} choisir={choisir} />
      ) : (
        <iframe
          title={t('Carte de ta position')}
          src={srcOsm(c)}
          style={{ display: 'block', width: '100%', height: 180, border: 0, borderRadius: 16 }}
          loading="lazy"
        />
      )}
      <div className="hint">
        {c.libelle
          ? tf('Point posé sur « {l} » · {lat}, {lon}', { l: c.libelle, lat: c.lat.toFixed(5), lon: c.lon.toFixed(5) })
          : tf('Position précise à {m} m près · {lat}, {lon}', { m: c.precision, lat: c.lat.toFixed(5), lon: c.lon.toFixed(5) })}
      </div>
      {lieu && <div className="hint">{tf('Près de : {l}', { l: lieu })}</div>}
      <div className="links" style={{ justifyContent: 'flex-start', gap: 16 }}>
        <a href={lienAppli(c, nom)} target="_blank" rel="noopener noreferrer">
          <Icone nom="map" taille={15} /> {t('Ouvrir dans les cartes')}
        </a>
        <a href={lienCarte(c)} onClick={(e) => (e.preventDefault(), partager())}>
          <Icone nom="share" taille={15} /> {t(copie ? 'Lien copié' : 'Partager')}
        </a>
      </div>
    </>
  )
}

// Recherche d'un lieu (sans GPS, ou GPS imprécis) : carrefour, école, église, commerce… Le lieu choisi pose le point.
export function RechercheLieu({ id, choisir }: { id: string; choisir: (c: Coordonnees) => void }) {
  const { t } = usePreferences()
  const [q, setQ] = useState('')
  const [props, setProps] = useState<Proposition[] | null>(null)
  const [etat, setEtat] = useState<'attente' | 'recherche' | 'erreur'>('attente')
  useEffect(() => {
    const texte = q.trim()
    setProps(null)
    if (texte.length < 3) return setEtat('attente')
    const a = new AbortController()
    const minuteur = setTimeout(() => {
      setEtat('recherche')
      rechercherAdresse(texte, a.signal).then(
        (r) => !a.signal.aborted && (setProps(r), setEtat('attente')),
        () => !a.signal.aborted && setEtat('erreur'),
      )
    }, 600)
    return () => (clearTimeout(minuteur), a.abort())
  }, [q])
  const prendre = async (p: Proposition) => {
    const l = await p.resoudre().catch(() => null)
    if (!l) return setEtat('erreur')
    choisir({ lat: l.lat, lon: l.lon, precision: 0, libelle: p.libelle, quartier: l.quartier })
    setQ('')
  }
  return (
    <>
      <div className="inp mt10">
        <Icone nom="search" taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
        <input
          id={id}
          className="grow"
          type="search"
          autoComplete="off"
          aria-label={t('Chercher un lieu proche')}
          placeholder={t('Ou cherche un lieu proche : carrefour, école, église…')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {etat === 'recherche' && <div className="hint">{t('Recherche du lieu…')}</div>}
      {etat === 'erreur' && (
        <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
          {t('Recherche impossible pour le moment : vérifie ta connexion, ou écris tes repères.')}
        </div>
      )}
      {props && props.length === 0 && <div className="hint">{t('Aucun lieu trouvé : essaie un autre nom, ou écris tes repères.')}</div>}
      {props && props.length > 0 && (
        <div className="card tight" role="listbox" aria-label={t('Lieux trouvés')}>
          {props.map((p) => (
            <button key={p.id} type="button" role="option" aria-selected="false" className="li" onClick={() => prendre(p)} style={{ width: '100%', background: 'none', border: 0, textAlign: 'left', font: 'inherit', color: 'inherit' }}>
              <span className="ic">
                <Icone nom="map-pin" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ display: 'block' }}>
                  {p.libelle}
                </span>
                {p.detail && <span className="ls">{p.detail}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </>
  )
}

// Bouton « Utiliser ma position » et ce qu'il dit (recherche, refus, indisponible).
export function MessagePosition({ etat }: { etat: EtatPosition }) {
  const { t } = usePreferences()
  if (etat === 'refus')
    return (
      <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
        {t('Position refusée : autorise la localisation pour BelivaY dans les réglages du téléphone, ou touche la carte pour poser le point.')}
      </div>
    )
  if (etat === 'indisponible')
    return (
      <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
        {t('Position introuvable ici : active la localisation, ou touche la carte pour poser le point.')}
      </div>
    )
  return null
}
