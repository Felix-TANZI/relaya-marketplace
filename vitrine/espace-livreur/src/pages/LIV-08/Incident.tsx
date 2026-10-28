// LIV-P21 · Signaler un incident (LIV-08-R10 à R32, LIV-RG-R171 à R176, LIV-UIX-03, DED-25).
// Repris sur le prototype (route « incident ») : le prototype ouvre une FEUILLE au-dessus de la tournée ; l'application
// garde sa page (adresse, retour, liens des autres écrans et tests inchangés) et pose dans la page la surface de la
// feuille avec son balisage exact (livc-sh-h, aide, livc-fam, livc-sosbar, note…), sans redessiner la tournée dessous
// (elle est à un geste, par « Fermer » ou le retour).
// Trois vues dans la même adresse :
// - sans paramètre : « Un problème ici ? », les six familles (icône teintée, exemples, conséquence sous un trait),
//   la bande SOS (appui long : SOS ; toucher : fiche Sécurité), le rappel « aucun incident ne vous pénalise
//   automatiquement », puis les incidents du jour ;
// - ?famille=… : la déclaration (étapes, famille, type, « Ce qui va se passer si vous envoyez » avant l'envoi, photos
//   exigées par le type, note de LIV-INCIDENT-NOTE-MIN caractères, position jointe) ; « Envoyer » reste gris tant
//   qu'il manque quelque chose ; hors connexion, l'incident part en file (LIV-P22) et la tournée continue.
//   Famille Sécurité : « protégez-vous d'abord », grand SOS à appui long, numéros d'urgence du pays, puis la
//   déclaration (photos facultatives) ;
// - ?id=… : le suivi (en file, enregistré, en attente de validation avec son échéance, validé et tournée ajustée,
//   refusé avec le motif mot pour mot, transfert au remplaçant colis par colis), avec l'appel masqué à l'entreprise.
// « À domicile » mène à l'échec de remise (LIV-P18) ; ?arret=… rattache l'incident à cet arrêt.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Feuille, useFeuille } from '@client/composants/Feuille'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import { enAttente, geste, origine as origineDe, noterPosition, useEnLigne, useFile } from '../../donnees/fileHorsLigne'
import type { CatalogueIncidents, FamilleId, FamilleIncident, Incident } from '../../donnees/domaines/incidents'
import type { Arret as ArretT } from '../../donnees/domaines/tournee'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { heure } from '../../i18n/temps'
import { Ecran } from '../../composants/coque'
import { Arret as ArretLigne, Barre, Hint as AideL, HorsConnexion, Li, Lvp, Note, Pill, Sec, Stepper } from '../../composants/proto'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { Chargement, EnTeteFeuille, ErreurLecture, FeuilleAppel, Frise, HeroProto, IcTeinte, Lab, compresser, useAppel, useAppuiLong, useBattement, useMaintenant, useOrigine, type PhotoPrise } from './commun'
import './liv08.css'

/** Empreinte SHA-256 d'une photo, calculée sur le téléphone (le serveur la garde avec la preuve). */
async function empreinteDe(octets: Uint8Array): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', octets as unknown as ArrayBuffer)
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Liens préremplis des autres écrans (paquet, « je ne peux pas ») : famille et type de l'incident. */
const PREREMPLIS: Record<string, [string, string | null]> = {
  panne: ['route', 'panne'],
  sante: ['route', 'malaise'],
  securite: ['securite', null],
  emballage_manquant: ['colis', 'emballage_manquant'],
}

/** Icône et teinte de chaque famille (prototype, LIVC_FAM). */
const FAMILLE: Record<FamilleId, [string, string]> = {
  vendeur: ['store', 'or'],
  route: ['route', 'amber'],
  relais: ['package-check', 'blue'],
  domicile: ['house', 'acc'],
  colis: ['package-x', 'violet'],
  securite: ['siren', 'solid-red'],
}

export default function IncidentEcran() {
  const [p] = useSearchParams()
  const id = p.get('id')
  const type = p.get('type')
  const pre = type && (p.get('famille') === 'livreur' || !p.get('famille')) ? PREREMPLIS[type] : undefined
  const famille = pre ? pre[0] : p.get('famille')
  if (id) return <Suivi id={id} />
  if (famille) return <Declaration key={famille + (type ?? '')} famille={famille} arretId={p.get('arret')} typeInitial={pre ? pre[1] : type} />
  return <Familles arretId={p.get('arret')} />
}

/** Nom de l'entreprise du livreur (textes « {entreprise} »). */
function useEntreprise() {
  return useSession().livreur?.entreprise ?? ''
}

/** « Arrêt 2 · Élégance Bazin · Biyem-Assi · 14 h 11 » ; à domicile, jamais l'identité du client (quartier seulement). */
function useSousArret() {
  const { tf, langue } = usePreferences()
  return (a: ArretT | undefined, quand: number) =>
    a
      ? a.type === 'domicile'
        ? tf('Arrêt {n} · remise à domicile · {quartier} · {h}', { n: a.ordre, quartier: a.quartier, h: heure(quand, langue) })
        : tf('Arrêt {n} · {nom} · {quartier} · {h}', { n: a.ordre, nom: a.nom, quartier: a.quartier, h: heure(quand, langue) })
      : heure(quand, langue)
}

/** Surface de la feuille du prototype, posée dans la page. */
function Surface({ children }: { children: ReactNode }) {
  return <section className="l8-feuille livc-sheet">{children}</section>
}

// ── SOS : bande et grand bouton (appui long) ─────────────────────────────────────────────────────────────────

function useSos() {
  const o = useOrigine()
  const en = useEnLigne()
  const naviguer = useNavigate()
  return async () => {
    await source.aide.sos(o(), en)
    naviguer(chemin('aide'))
  }
}

/** livc_sosbar : maintenir déclenche le SOS ; un toucher bref ouvre la fiche Sécurité (prototype). */
function BandeSos({ appuiS, partageMin, arretId }: { appuiS: number; partageMin: number; arretId: string | null }) {
  const { t, tf } = usePreferences()
  const entreprise = useEntreprise()
  const naviguer = useNavigate()
  const sos = useSos()
  const a = useAppuiLong(appuiS, () => void sos(), () => naviguer(chemin('incident', { famille: 'securite', arret: arretId })))
  return (
    <button type="button" className={'livc-sosbar l8-appui' + (a.p > 0 ? ' appui' : '')} {...a.props} aria-label={tf('SOS : maintenir {s} secondes', { s: appuiS })}>
      <span className="l8-appui-p" aria-hidden="true"></span>
      <span className="ci">{t('SOS')}</span>
      <span className="grow">
        <b>{t('Danger immédiat ?')}</b>
        <span aria-live="polite">{a.p > 0 ? t('Relâchez pour annuler') : tf('Maintenez {s} secondes : {entreprise} puis le support BelivaY sont appelés, votre position est partagée {min} minutes.', { s: appuiS, entreprise, min: partageMin })}</span>
      </span>
      <Icone nom="chevron-right" taille={20} />
    </button>
  )
}

/** livc-sos : grand bouton rond, appui long sans autre confirmation. */
function GrandSos({ appuiS }: { appuiS: number }) {
  const { t, tf } = usePreferences()
  const entreprise = useEntreprise()
  const sos = useSos()
  const [astuce, setAstuce] = useState(false)
  const a = useAppuiLong(
    appuiS,
    () => void sos(),
    () => {
      setAstuce(true)
      signal('toucher')
      window.setTimeout(() => setAstuce(false), 2500)
    },
  )
  return (
    <div className="livc-sos mt16">
      <button type="button" className={'b l8-appui' + (a.p > 0 ? ' appui' : '')} {...a.props} aria-label={tf('SOS : maintenir {s} secondes', { s: appuiS })}>
        <span className="l8-appui-p" aria-hidden="true"></span>
        <b>{t('SOS')}</b>
        <span aria-live="polite">{a.p > 0 ? t('Relâchez pour annuler') : tf('Maintenir {s} s', { s: appuiS })}</span>
      </button>
      <div className="c">{astuce ? tf('Maintenez {s} secondes pour déclencher', { s: appuiS }) : tf('Un appui long de {s} secondes, sans autre confirmation. {entreprise} est appelée en premier, puis le support BelivaY.', { s: appuiS, entreprise })}</div>
    </div>
  )
}

// ── Les six familles ───────────────────────────────────────────────────────────────────────────────────────

function Familles({ arretId }: { arretId: string | null }) {
  const { t, tf } = usePreferences()
  const entreprise = useEntreprise()
  const m = useMaintenant()
  const sousArret = useSousArret()
  const cat = useLecture(() => source.incidents.catalogue(), [])
  const tour = useLecture(() => source.tournee.courante(), [])
  const liste = useLecture(() => source.incidents.liste(), [])
  const aide = useLecture(() => source.aide.aide(), [])
  const arret = tour.donnees?.arrets.find((a) => a.id === (arretId ?? tour.donnees?.enCours))
  if (cat.erreur)
    return (
      <Ecran proto route="incident">
        <ErreurLecture relire={cat.relire} />
      </Ecran>
    )
  return (
    <Ecran proto route="incident">
      <Lvp className="l8">
        <Surface>
          <EnTeteFeuille titre={t('Un problème ici ?')} sous={sousArret(arret, m())} icone="triangle-alert" ton="red" fermer={chemin('tournee')} />
          <AideL icone="info">{t('Choisissez une famille : chaque incident vous montre sa conséquence avant l’envoi. Deux touches suffisent.')}</AideL>
          {!cat.donnees ? (
            <Chargement />
          ) : (
            <div className="livc-fam">
              {cat.donnees.familles.map((f) => (
                <Link key={f.id} className={f.id === 'securite' ? 'red' : ''} to={f.route ? chemin(f.route, { arret: arret?.id }) : chemin('incident', { famille: f.id, arret: arretId })}>
                  <IcTeinte nom={FAMILLE[f.id][0]} ton={FAMILLE[f.id][1]} />
                  <span className="ft">{t(f.titre)}</span>
                  <span className="fx">{t(f.exemples)}</span>
                  <span className="fc">{tf(f.consequence, { entreprise })}</span>
                </Link>
              ))}
            </div>
          )}
          {aide.donnees && <BandeSos appuiS={aide.donnees.sos.appuiS} partageMin={aide.donnees.sos.partageMin} arretId={arretId} />}
          <Note ton="ink" icone="shield-check">
            <b>{t('Aucun incident ne vous pénalise automatiquement.')}</b> {t('Un incident fictif pour sauter un arrêt est une fraude : sanction de niveau 3 au moins.')}
          </Note>
        </Surface>
        {liste.donnees && liste.donnees.length > 0 && (
          <>
            <Sec titre={t('Vos incidents')} />
            <div className="card tight">
              {liste.donnees.map((i) => (
                <LigneIncident key={i.id} i={i} cat={cat.donnees} />
              ))}
            </div>
          </>
        )}
      </Lvp>
    </Ecran>
  )
}

const ETATS: Record<Incident['etat'], [string, 'amber' | 'acc' | 'green' | 'red']> = {
  en_file: ['En file', 'amber'],
  enregistre: ['Enregistré', 'acc'],
  en_attente: ['En attente', 'amber'],
  valide: ['Validé', 'green'],
  refuse: ['Refusé', 'red'],
}

function LigneIncident({ i, cat }: { i: Incident; cat: CatalogueIncidents | null }) {
  const { t, langue } = usePreferences()
  const f = cat?.familles.find((x) => x.id === i.famille)
  const ty = f?.types.find((x) => x.id === i.type)
  const [lib, ton] = ETATS[i.etat]
  return (
    <Li
      vers={chemin('incident', { id: i.id })}
      icone={FAMILLE[i.famille]?.[0] ?? 'triangle-alert'}
      ton={ton === 'red' ? 'red' : ton === 'amber' ? 'amber' : 'acc'}
      t={t(ty?.titre ?? i.type)}
      s={`${i.id} · ${heure(i.cree, langue)}`}
      droite={
        <Pill ton={ton} sm point={i.etat === 'en_file'}>
          {t(lib)}
        </Pill>
      }
    />
  )
}

// ── Photos (appareil de l'application) ──────────────────────────────────────────────────────────────────────

/** Grille .photos du prototype : photos prises (heure, poids), puis « Prendre la photo » / « Autre photo (facultatif) ». */
function Photos(p: { photos: PhotoPrise[]; changer: (x: PhotoPrise[]) => void; exigees: number; max: number; maxKo: number; maintenant: () => number }) {
  const { t, tf, langue } = usePreferences()
  const champ = useRef<HTMLInputElement>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [occupe, setOccupe] = useState(false)
  const prise = async (f: File | undefined) => {
    if (!f) return
    setErreur(null)
    setOccupe(true)
    try {
      const r = await compresser(f, p.maxKo)
      p.changer([...p.photos, { ...r, a: p.maintenant() }])
      signal('toucher')
    } catch (e) {
      setErreur(e instanceof Error && e.message === 'type' ? 'Ce fichier n’est pas une photo. Reprenez-la avec l’appareil photo.' : 'Cette photo ne se lit pas. Reprenez-la.')
      signal('erreur')
    } finally {
      setOccupe(false)
      if (champ.current) champ.current.value = ''
    }
  }
  const manque = p.photos.length < p.exigees
  return (
    <>
      <div className="photos">
        {p.photos.map((x, i) => (
          <div key={x.a + '-' + i} className="photo l8-photo">
            <img src={x.url} alt={tf('Photo {n}', { n: i + 1 })} />
            <span className="ok" aria-hidden="true">
              <Icone nom="check" taille={14} trait={3} />
            </span>
            <span className="ts">{tf('{h} · {ko} Ko', { h: heure(x.a, langue), ko: x.ko })}</span>
            <button type="button" className="l8-reprendre" aria-label={tf('Reprendre la photo {n}', { n: i + 1 })} onClick={() => p.changer(p.photos.filter((_, k) => k !== i))}>
              <Icone nom="rotate-ccw" taille={16} trait={2.4} />
            </button>
          </div>
        ))}
        {p.photos.length < p.max && (
          <button type="button" className="addph" disabled={occupe} onClick={() => champ.current?.click()}>
            <Icone nom="camera" taille={22} />
            {t(occupe ? 'Compression…' : manque ? (p.photos.length > 0 ? '2e photo' : 'Prendre la photo') : 'Autre photo (facultatif)')}
          </button>
        )}
      </div>
      <input ref={champ} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void prise(e.target.files?.[0])} data-lc-photo />
      <AideL icone="camera">{t('Appareil photo de l’application seulement : aucune image importée de la galerie.')}</AideL>
      {erreur && (
        <p className="hint err" role="alert">
          {t(erreur)}
        </p>
      )}
    </>
  )
}

// ── Déclaration ────────────────────────────────────────────────────────────────────────────────────────────

function Declaration({ famille, arretId, typeInitial }: { famille: string; arretId: string | null; typeInitial: string | null }) {
  const { t, tf, langue } = usePreferences()
  const entreprise = useEntreprise()
  const naviguer = useNavigate()
  const sousArret = useSousArret()
  const m = useMaintenant()
  const o = useOrigine()
  const en = useEnLigne()
  const cat = useLecture(() => source.incidents.catalogue(), [])
  const tour = useLecture(() => source.tournee.courante(), [])
  const aide = useLecture(() => source.aide.aide(), [])
  const f: FamilleIncident | undefined = cat.donnees?.familles.find((x) => x.id === famille)
  const [type, setType] = useState<string | null>(typeInitial)
  const [note, setNote] = useState('')
  const [photos, setPhotos] = useState<PhotoPrise[]>([])
  const [arret, setArret] = useState<string | null | undefined>(undefined)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [position, setPosition] = useState<'inconnue' | 'cherche' | 'refusee' | 'ok'>(() => (o().position ? 'ok' : 'inconnue'))
  const annuler = useFeuille('annuler')
  const enCours = tour.donnees?.arrets.find((a) => a.id === (arretId ?? tour.donnees?.enCours))
  const arretChoisi = arret === undefined ? (enCours?.id ?? null) : arret
  // Une famille réglée ailleurs (À domicile) ou inconnue : retour au choix.
  useEffect(() => {
    if (cat.donnees && (!f || f.route)) naviguer(f?.route ? chemin(f.route, { arret: arretId }) : chemin('incident'), { replace: true })
  }, [cat.donnees, f, arretId, naviguer])
  if (cat.erreur)
    return (
      <Ecran proto route="incident">
        <ErreurLecture relire={cat.relire} />
      </Ecran>
    )
  if (!cat.donnees || !f)
    return (
      <Ecran proto route="incident">
        <Chargement />
      </Ecran>
    )
  const c = cat.donnees
  const securite = f.id === 'securite'
  const [icone, ton] = FAMILLE[f.id]
  const ty = f.types.find((x) => x.id === type) ?? null
  const exigees = ty?.photos ?? 0
  const manque = !ty ? 'Choisissez ce qui se passe.' : photos.length < exigees ? (exigees > 1 ? 'Prenez les photos exigées.' : 'Prenez la photo exigée.') : note.trim().length < c.noteMin ? 'Écrivez une note un peu plus précise.' : null
  const pos = o().position
  const chercherPosition = () => {
    if (!navigator.geolocation) return setPosition('refusee')
    setPosition('cherche')
    navigator.geolocation.getCurrentPosition(
      (x) => (noterPosition({ lat: x.coords.latitude, lng: x.coords.longitude, precisionM: Math.round(x.coords.accuracy) }), setPosition('ok')),
      () => setPosition('refusee'),
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }
  const envoyer = async () => {
    if (manque || !ty) return
    setEnvoi(true)
    setErreur(null)
    // Les photos partent d'abord comme preuves (empreinte SHA-256, poids, origine) ; l'incident cite leurs identifiants
    // (le serveur exige les preuves, pas leur nombre). Hors connexion : en file, dans l'ordre, avec un identifiant
    // provisoire remplacé au rejeu.
    const ids: string[] = []
    for (const ph of photos) {
      const octets = Uint8Array.from(atob(ph.url.slice(ph.url.indexOf(',') + 1)), (x) => x.charCodeAt(0))
      const op = origineDe(ph.a)
      const p = { nature: 'incident', objet: arretChoisi ?? '', octets: octets.length, empreinte: await empreinteDe(octets), nette: true }
      const d = await geste(en, 'photo', p.objet, op, (s) => s.tournee.deposerPreuve(p, op), true).catch(() => null)
      if (!d || !d.r.ok) {
        setEnvoi(false)
        setErreur(d && !d.r.ok && d.r.raison === 'trop_lourde' ? 'Photo trop lourde : reprenez-la de plus près.' : 'La photo n’a pas pu être enregistrée. Reprenez-la.')
        signal('erreur')
        return
      }
      ids.push(d.r.id)
    }
    const r = await source.incidents.declarer({ famille: f.id, type: ty.id, note, photos: ids, arretId: arretChoisi }, o(), en)
    setEnvoi(false)
    if (!r.ok) {
      setErreur(r.raison === 'note_trop_courte' ? 'Écrivez une note un peu plus précise.' : r.raison === 'photos_manquantes' ? 'Prenez la photo exigée.' : 'Choisissez ce qui se passe.')
      signal('erreur')
      return
    }
    signal(en ? 'succes' : 'alerte')
    naviguer(chemin('incident', { id: r.id }), { replace: true })
  }
  const quitter = () => (photos.length > 0 || note.trim() ? annuler.ouvrir() : naviguer(chemin('incident', { arret: arretId })))
  // Étapes du prototype (Famille, Type, Preuves, Envoyer) : la famille est déjà choisie.
  const etape = !ty ? 1 : photos.length < exigees || note.trim().length < c.noteMin ? 2 : 3
  const noteOk = note.trim().length >= c.noteMin
  const types = (
    <div className="livc-types l8-types" role="radiogroup" aria-labelledby="l8-type">
      {f.types.map((x) => (
        <button key={x.id} type="button" role="radio" aria-checked={type === x.id} className={(securite ? 'red' : '') + (type === x.id ? ' on' : '')} onClick={() => (setType(x.id), signal('toucher'))}>
          {type === x.id && <Icone nom="check" taille={15} trait={3} />}
          {t(x.titre)}
          {x.bloquant && <Icone nom="hourglass" taille={14} />}
        </button>
      ))}
    </div>
  )
  const formulaire = (
    <>
      {tour.donnees && enCours && (
        <>
          <Lab id="l8-arret">{t('Arrêt concerné')}</Lab>
          <div className="livc-types l8-types" role="radiogroup" aria-labelledby="l8-arret">
            <button type="button" role="radio" aria-checked={arretChoisi === enCours.id} className={arretChoisi === enCours.id ? 'on' : ''} onClick={() => setArret(enCours.id)}>
              {arretChoisi === enCours.id && <Icone nom="check" taille={15} trait={3} />}
              {enCours.type === 'domicile' ? tf('Arrêt {n} · {quartier}', { n: enCours.ordre, quartier: enCours.quartier }) : tf('Arrêt {n} · {nom}', { n: enCours.ordre, nom: enCours.nom })}
            </button>
            <button type="button" role="radio" aria-checked={arretChoisi === null} className={arretChoisi === null ? 'on' : ''} onClick={() => setArret(null)}>
              {arretChoisi === null && <Icone nom="check" taille={15} trait={3} />}
              {t('Sur la route')}
            </button>
          </div>
        </>
      )}
      {!securite && (
        <>
          <Lab>{t('Ce qui va se passer si vous envoyez')}</Lab>
          <div className="livc-cq" aria-live="polite">
            <div className="r">
              <Icone nom="users" taille={18} />
              <div>
                <div className="k">{t('Qui est prévenu')}</div>
                <div className="v">{tf(f.prevenus, { entreprise, min: c.clientPrevenuMin })}</div>
              </div>
            </div>
            <div className="r">
              <Icone nom="route" taille={18} />
              <div>
                <div className="k">{t('Ce qui change dans la tournée')}</div>
                <div className="v">
                  {tf(f.tournee, { entreprise })}
                  {ty?.bloquant && ' ' + tf('Décision de {entreprise} sous {min} min ; sans réponse, l’opérateur de zone BelivaY décide.', { entreprise, min: c.validationMin })}
                </div>
              </div>
            </div>
            <div className="r">
              <Icone nom="shield-check" taille={18} />
              <div>
                <div className="k">{t('Effet sur les scores')}</div>
                <div className="v">{tf(f.scores, { entreprise })}</div>
              </div>
            </div>
          </div>
        </>
      )}
      <Lab
        droite={
          <span className={'cnt ' + (!ty ? 'c3' : photos.length >= exigees ? 'cg' : 'cr')}>
            {!ty && !securite ? t('Selon le type d’incident') : exigees > 1 ? tf('{n} photos · obligatoires', { n: exigees }) : exigees === 1 ? t('Une photo · obligatoire') : securite ? t('Aucune photo exigée : protégez-vous d’abord') : t('Facultatives, seulement si c’est sans danger')}
          </span>
        }
      >
        {t('Photos')}
      </Lab>
      <Photos photos={photos} changer={setPhotos} exigees={ty || securite ? exigees : 1} max={c.photosMax} maxKo={c.photoMaxKo} maintenant={m} />
      <div className="fld">
        <label htmlFor="l8-note">{tf('Note ({min} caractères au moins)', { min: c.noteMin })}</label>
        <div className={'inp area' + (noteOk ? ' ok' : '')}>
          <textarea id="l8-note" className="grow" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder={t('Décrivez ce que vous voyez…')} />
        </div>
        <div className="hint">{noteOk ? tf('{n} caractères · la note part avec la photo, l’heure et la position', { n: note.trim().length }) : tf('{n} sur {min} caractères au moins', { n: note.trim().length, min: c.noteMin })}</div>
      </div>
      <div className="row mt10 t13 c2 l8-pos">
        <Icone nom={pos ? 'map-pin' : 'locate'} taille={16} style={{ color: 'var(--acc-txt)', flexShrink: 0 }} />
        <span className="grow">
          {pos
            ? pos.precisionM !== null
              ? tf('Position jointe · précision {m} m · heure du téléphone {h}', { m: pos.precisionM, h: heure(m(), langue) })
              : tf('Position jointe · heure du téléphone {h}', { h: heure(m(), langue) })
            : position === 'refusee'
              ? t('Position indisponible : l’heure du téléphone part avec l’incident.')
              : t('Elle part avec l’incident dès qu’elle est connue.')}
        </span>
        {!pos && (
          <button type="button" className="btn secondary sm" onClick={chercherPosition} disabled={position === 'cherche'}>
            {t(position === 'cherche' ? 'Recherche…' : 'Joindre')}
          </button>
        )}
      </div>
      {!en && (
        <Note ton="amber" icone="cloud-off">
          <b>{t('Pas de réseau')}</b> · {t('L’incident et ses photos partent en file, avec leur heure et leur position ; la tournée continue.')}
        </Note>
      )}
      {erreur && (
        <Note ton="red" icone="circle-alert" role="alert">
          {t(erreur)}
        </Note>
      )}
      <div className="btns" style={{ marginTop: 16 }}>
        <button type="button" className="btn primary xl" disabled={!!manque || envoi} onClick={() => void envoyer()}>
          <Icone nom="send" taille={18} />
          <span>{t(envoi ? 'Envoi…' : en ? 'Envoyer l’incident' : 'Mettre l’incident en file')}</span>
        </button>
      </div>
      {manque && <AideL icone="info">{t(manque)}</AideL>}
      <div className="btns">
        <button type="button" className="btn ghost" onClick={quitter}>
          <span>{t('Annuler')}</span>
        </button>
      </div>
    </>
  )
  return (
    <Ecran proto
      route="incident"
      titre={t(f.titre)}
      retour={chemin('incident', { arret: arretId })}
      fixes={
        <Feuille ouverte={annuler.ouverte} fermer={annuler.fermer} titre={t('Abandonner la déclaration ?')}>
          <h2 className="lc-f-t">{t('Abandonner la déclaration ?')}</h2>
          <p className="lc-texte">{t('Les photos prises et la note seront perdues. Rien n’a été envoyé.')}</p>
          <div className="lc-f-actions">
            <button type="button" className="l-btn l-alerte" onClick={() => naviguer(chemin('incident', { arret: arretId }), { replace: true })}>
              {t('Abandonner')}
            </button>
            <button type="button" className="l-btn l-second" onClick={annuler.fermer}>
              {t('Continuer la déclaration')}
            </button>
          </div>
        </Feuille>
      }
    >
      <Lvp className="l8">
        <Surface>
          {securite ? (
            <>
              <EnTeteFeuille titre={t('Sécurité : protégez-vous d’abord')} sous={t(f.exemples)} icone="siren" ton="solid-red" fermer={quitter} />
              <span id="l8-type" className="lc-sr">
                {t('Ce qui se passe')}
              </span>
              {types}
              {aide.donnees && <GrandSos appuiS={aide.donnees.sos.appuiS} />}
              <Note ton="red" icone="shield-alert">
                <b>{t('Ne résistez jamais.')}</b> {tf('Aucun colis ne vaut votre sécurité : la perte est traitée entre BelivaY, {entreprise} et son assurance, jamais retenue sur vous.', { entreprise })}
              </Note>
              <div className="card flat" style={{ marginTop: 12, padding: '4px 14px' }}>
                <Li icone="map-pin" ton="acc" t={aide.donnees ? tf('Position partagée {min} minutes', { min: aide.donnees.sos.partageMin }) : t('Position partagée')} s={tf('Avec {entreprise} et le support, puis arrêt automatique', { entreprise })} />
                <Li icone="folder-open" ton="blue" t={t('Dossier ouvert à la console')} s={t('Déclaration, plainte avec votre entreprise')} />
                <Li icone="shield-check" ton="green" t={t('Aucune pénalité')} s={t('Aucune pression pour finir la tournée')} />
              </div>
              {aide.donnees && aide.donnees.urgences.length > 0 && (
                <>
                  <Lab>{t('Accident avec blessé : les secours d’abord')}</Lab>
                  <div className="livc-num">
                    {aide.donnees.urgences.map((u) => (
                      <a key={u.numero} href={`tel:${u.numero}`}>
                        <Icone nom="phone-call" taille={22} />
                        <span className="grow">
                          <b>{u.numero}</b>
                          <span>{t(u.service)}</span>
                        </span>
                      </a>
                    ))}
                  </div>
                </>
              )}
              <Lab>{t('Déclarer l’incident')}</Lab>
              {formulaire}
              <div className="btns" style={{ marginTop: 14 }}>
                <Link className="btn secondary" to={chemin('aide')}>
                  <Icone nom="life-buoy" taille={18} />
                  <span>{t('Fiches Aide et SOS')}</span>
                </Link>
              </div>
            </>
          ) : (
            <>
              <EnTeteFeuille titre={t('Déclarer un incident')} sous={sousArret(enCours, m())} icone={icone} ton={ton} fermer={quitter} />
              <Stepper etapes={[t('Famille'), t('Type'), t('Preuves'), t('Envoyer')]} cur={etape} />
              <Lab
                droite={
                  <Link className="cnt cacc l8-chg" to={chemin('incident', { arret: arretId })}>
                    {t('Changer')}
                  </Link>
                }
              >
                {t('Famille')}
              </Lab>
              <div className="row mt8" style={{ gap: 10 }}>
                <IcTeinte nom={icone} ton={ton} taille={36} />
                <span className="b8 t17">{t(f.titre)}</span>
              </div>
              <Lab id="l8-type">{t('Type d’incident')}</Lab>
              {types}
              {f.types.some((x) => x.bloquant) && <AideL icone="hourglass">{t('Attend une décision avant de continuer.')}</AideL>}
              {formulaire}
            </>
          )}
        </Surface>
      </Lvp>
    </Ecran>
  )
}

// ── Suivi ──────────────────────────────────────────────────────────────────────────────────────────────────

function Suivi({ id }: { id: string }) {
  const { t, tf, langue } = usePreferences()
  const entreprise = useEntreprise()
  const m = useMaintenant()
  const en = useEnLigne()
  const file = useFile()
  const battement = useBattement(5000)
  const i = useLecture(() => source.incidents.incident(id).then((v) => ({ v })), [id, battement])
  const cat = useLecture(() => source.incidents.catalogue(), [])
  const appel = useAppel()
  const x = i.donnees?.v ?? null
  const f = cat.donnees?.familles.find((y) => y.id === x?.famille)
  const ty = f?.types.find((y) => y.id === x?.type)
  const titre = ty ? t(ty.titre) : id
  if (i.erreur)
    return (
      <Ecran proto route="incident">
        <ErreurLecture relire={i.relire} />
      </Ecran>
    )
  if (!i.donnees)
    return (
      <Ecran proto route="incident">
        <Chargement />
      </Ecran>
    )
  if (!x)
    return (
      <Ecran proto route="incident" titre={id}>
        <Lvp className="l8">
          <div className="empty">
            <div className="ei">
              <Icone nom="search" taille={26} />
            </div>
            <h3>{t('Incident introuvable')}</h3>
            <p>{t('Il n’est plus sur ce téléphone. Vos incidents du jour sont dans la liste.')}</p>
            <Link className="btn secondary" to={chemin('incident')}>
              <span>{t('Voir mes incidents')}</span>
            </Link>
          </div>
        </Lvp>
      </Ecran>
    )
  const par = x.decision ? (x.decision.par === 'operateur' ? t('l’opérateur de zone BelivaY') : x.decision.nom) : ''
  const lieu = x.arret ? ' · ' + x.arret.nom : ''
  const transfert = x.transfert
  const repris = transfert ? transfert.colis.filter((c) => c.reprisA !== null).length : 0
  const [icF, tonF] = FAMILLE[x.famille] ?? ['triangle-alert', 'red']
  const hDecision = heure(x.decision?.a ?? x.cree, langue)
  // En-tête de la feuille selon l'état (prototype : attente, validé, refusé, hors connexion, transfert).
  const tete: { titre: string; sous: string; icone: string; ton: string } =
    x.etat === 'en_file'
      ? { titre: t('Incident enregistré hors connexion'), sous: `${titre}${lieu} · ${heure(x.cree, langue)}`, icone: 'cloud-off', ton: 'night' }
      : x.etat === 'enregistre'
        ? { titre: t('Incident enregistré'), sous: tf('{type}{lieu} · déclaré à {h}', { type: titre, lieu, h: heure(x.cree, langue) }), icone: 'circle-check', ton: 'green' }
        : x.etat === 'en_attente'
          ? { titre: t('En attente de validation'), sous: tf('{type}{lieu} · déclaré à {h}', { type: titre, lieu, h: heure(x.cree, langue) }), icone: 'hourglass', ton: 'amber' }
          : x.etat === 'refuse'
            ? { titre: t('Refusé : appelez votre entreprise'), sous: tf('{type}{lieu} · refusé à {h} par {par}', { type: titre, lieu, h: hDecision, par }), icone: 'circle-x', ton: 'red' }
            : transfert
              ? { titre: tf('{type} : vos colis passent à {prenom}', { type: titre, prenom: transfert.remplacant.prenom }), sous: tf('Déclaré à {h} · validé à {v} par {par}', { h: heure(x.cree, langue), v: hDecision, par }), icone: icF, ton: tonF }
              : { titre: t('Validé : la tournée est ajustée'), sous: tf('{type}{lieu} · validé à {h} par {par}', { type: titre, lieu, h: hDecision, par }), icone: 'circle-check', ton: 'green' }
  // Frise C.tl : faits, l'étape en cours (la première à venir), à venir ; la décision de refus en rouge.
  const premiereAVenir = x.chronologie.findIndex((e) => e.a === null)
  const dernierFait = x.chronologie.reduce((acc, e, k) => (e.a !== null ? k : acc), -1)
  const frise = (
    <div className="card flat" style={{ marginTop: 12 }}>
      <Frise
        items={x.chronologie.map((e, k): { t: string; d: string; st: '' | 'done' | 'cur' | 'bad' } => ({
          t: tf(e.texte, { entreprise }),
          d: e.a !== null ? heure(e.a, langue) : t('À venir'),
          st: e.a === null ? (k === premiereAVenir && x.etat !== 'refuse' ? 'cur' : '') : x.etat === 'refuse' && k === dernierFait ? 'bad' : 'done',
        })).concat(x.etat === 'refuse' ? [{ t: t('À faire maintenant'), d: tf('Appeler {entreprise}, puis reprendre l’arrêt : contrôle et photos', { entreprise }), st: 'cur' as const }] : [])}
      />
    </div>
  )
  // Les autres gestes en file (l'incident et ses photos mis à part).
  const autres = x.etat === 'en_file' ? Math.max(0, enAttente(file).length - 1 - x.photos) : 0
  const suivant = x.ajustement?.arrets.find((a) => a.etat !== 'retire')
  return (
    <Ecran proto route="incident" titre={`${titre} · ${x.id}`} retour={chemin('incident')} fixes={<FeuilleAppel a={appel} />}>
      <Lvp className="l8">
        <Surface>
          <EnTeteFeuille titre={tete.titre} sous={tete.sous} icone={tete.icone} ton={tete.ton} fermer={chemin('tournee')} />

          {x.etat === 'en_file' && (
            <>
              {!en ? (
                <HorsConnexion>
                  <b>{t('Hors connexion')}</b> · {t('envoi dès le retour du réseau, avec l’heure et la position d’origine.')}
                </HorsConnexion>
              ) : (
                <Note ton="amber" icone="cloud-upload" role="status">
                  {t('En file : part au retour du réseau')}
                </Note>
              )}
              <div className="card flat" style={{ marginTop: 12, padding: '4px 14px' }}>
                <div className="livc-q">
                  <IcTeinte nom="triangle-alert" ton="red" taille={44} />
                  <div className="grow">
                    <div className="qt">{tf('Incident « {type} »', { type: titre })}</div>
                    <div className="qs">{tf('Créé à {h} · note de {n} caractères', { h: heure(x.cree, langue), n: x.note.length })}</div>
                    <div className="qm">
                      <Pill ton="amber" sm point>
                        {t('En file')}
                      </Pill>
                    </div>
                  </div>
                </div>
                {x.photos > 0 && (
                  <div className="livc-q">
                    <IcTeinte nom="camera" ton="green" taille={44} />
                    <div className="grow">
                      <div className="qt">{x.photos === 1 ? t('1 photo') : tf('{n} photos', { n: x.photos })}</div>
                      <div className="qs">{tf('Prises à {h} · chiffrées sur le téléphone', { h: heure(x.cree, langue) })}</div>
                      <div className="qm">
                        <Pill ton="amber" sm point>
                          {t('En file')}
                        </Pill>
                      </div>
                    </div>
                  </div>
                )}
                {autres > 0 && (
                  <div className="livc-q">
                    <IcTeinte nom="cloud-upload" ton="ink" taille={44} />
                    <div className="grow">
                      <div className="qt">{autres === 1 ? t('1 autre élément en attente d’envoi') : tf('{n} autres éléments en attente d’envoi', { n: autres })}</div>
                      <div className="qs">{t('Envoyés dans l’ordre au retour du réseau')}</div>
                    </div>
                  </div>
                )}
              </div>
              {x.ajustement && <HeroProto ton="night" hk={t('Tournée ajustée sur votre téléphone')} ht={t(x.ajustement.texte)} hs={t('Le serveur confirmera ou corrigera à la reconnexion ; tout changement vous sera annoncé.')} />}
              <div className="btns" style={{ marginTop: 14 }}>
                <Link className="btn acc-soft" to={chemin('synchronisation')}>
                  <Icone nom="cloud-upload" taille={18} />
                  <span>{t('Voir la file d’envoi')}</span>
                </Link>
                <Link className="btn secondary" to={chemin('tournee')}>
                  <Icone nom="route" taille={18} />
                  <span>{t('Retour')}</span>
                </Link>
              </div>
            </>
          )}

          {x.etat === 'enregistre' && (
            <>
              <HeroProto ton="green" hk={t('Non bloquant')} ht={t('Incident enregistré')} hs={tf('{entreprise} est informée. Ce n’est pas bloquant : continuez la tournée.', { entreprise })} />
              {frise}
              <div className="btns" style={{ marginTop: 14 }}>
                <Link className="btn primary xl" to={chemin('tournee')}>
                  <Icone nom="route" taille={18} />
                  <span>{t('Continuer la tournée')}</span>
                </Link>
              </div>
            </>
          )}

          {x.etat === 'en_attente' && (
            <>
              <HeroProto
                ton="amber"
                hk={x.arret ? tf('Incident bloquant pour l’arrêt {n}', { n: x.arret.ordre }) : t('Incident bloquant')}
                ht={tf('{entreprise} valide votre déclaration', { entreprise })}
                hs={x.echeance ? tf('Sans réponse à {h} (dans {n} min au plus), l’opérateur de zone BelivaY décide à sa place. Restez sur place, à l’abri.', { h: heure(x.echeance, langue), n: Math.max(0, Math.ceil((x.echeance - m()) / 60_000)) }) : t('Restez sur place, à l’abri.')}
              />
              {frise}
              <div className="btns" style={{ marginTop: 14 }}>
                <button type="button" className="btn acc" onClick={() => void appel.appeler('entreprise')}>
                  <Icone nom="phone" taille={18} />
                  <span>{tf('Appeler {entreprise}', { entreprise })}</span>
                </button>
              </div>
              <div className="btns">
                <Link className="btn secondary" to={chemin('tournee')}>
                  <Icone nom="route" taille={18} />
                  <span>{t('Retour à la tournée')}</span>
                </Link>
              </div>
            </>
          )}

          {x.etat === 'refuse' && (
            <>
              <HeroProto ton="red" role="alert" hk={tf('Motif donné par {par}', { par })} ht={t('Votre déclaration n’est pas retenue')} hs={x.decision?.motif ? `« ${x.decision.motif} »` : undefined} />
              {frise}
              <Note ton="ink" icone="info">
                {t('Déclaration de bonne foi :')} <b>{t('aucune pénalité')}</b>. {t('Un incident fictif pour sauter un arrêt est une fraude : sanction de niveau 3 au moins.')}
              </Note>
              <div className="btns" style={{ marginTop: 14 }}>
                <button type="button" className="btn primary xl" onClick={() => void appel.appeler('entreprise')}>
                  <Icone nom="phone" taille={18} />
                  <span>{tf('Appeler {entreprise}', { entreprise })}</span>
                </button>
              </div>
              <div className="btns">
                <Link className="btn secondary" to={chemin('tournee')}>
                  <Icone nom="route" taille={18} />
                  <span>{t('Reprendre l’arrêt')}</span>
                </Link>
              </div>
            </>
          )}

          {x.etat === 'valide' && transfert && (
            <>
              <div className="card flat" style={{ marginTop: 14 }}>
                <div className="row" style={{ gap: 12 }}>
                  <span className="l-avatar l8-avatar">{transfert.remplacant.initiales}</span>
                  <div className="grow">
                    <div className="b8 t17">{transfert.remplacant.prenom}</div>
                    <div className="t13 c3">{tf('{vehicule} · désigné par {entreprise}', { vehicule: t(transfert.remplacant.vehicule), entreprise })}</div>
                  </div>
                  <Pill ton="acc" sm>
                    {t('Remplaçant')}
                  </Pill>
                </div>
                <div className="row mt12 t13" style={{ justifyContent: 'space-between', gap: 8 }}>
                  <span className="b8">{tf('{n} colis sur {total} repris', { n: repris, total: transfert.colis.length })}</span>
                  <span className="c3">{tf('{prenom} scanne chaque colis', { prenom: transfert.remplacant.prenom })}</span>
                </div>
                <div className="mt8">
                  <Barre pct={(repris / Math.max(1, transfert.colis.length)) * 100} label={t('Colis repris')} />
                </div>
              </div>
              {transfert.colis.map((c) => (
                <div key={c.id} className={'parcel' + (c.reprisA ? ' ok' : '')}>
                  <span className="pc">{c.reprisA ? <Icone nom="check" taille={16} trait={3} /> : <Icone nom="package" taille={16} />}</span>
                  <span className="grow">
                    <span className="b8 t14" style={{ display: 'block' }}>
                      {c.id}
                    </span>
                    <span className="t12 c3" style={{ display: 'block', marginTop: 1 }}>
                      {c.reprisA ? tf('Scanné par {prenom} à {h}', { prenom: transfert.remplacant.prenom, h: heure(c.reprisA, langue) }) : tf('À scanner par {prenom}', { prenom: transfert.remplacant.prenom })}
                    </span>
                  </span>
                  <Pill ton={c.reprisA ? 'green' : 'or'} sm>
                    {t(c.reprisA ? 'Repris' : 'Sur vous')}
                  </Pill>
                </div>
              ))}
              <Note ton="acc" icone="scan-line">
                {tf('La garde passe à {prenom} colis par colis, à chaque scan confirmé sur son téléphone. Rencontre en personne obligatoire : aucun colis n’est laissé à un tiers.', { prenom: transfert.remplacant.prenom })}
              </Note>
              <Note ton="ink" icone="circle-pause">
                {t('Vous restez « en pause » jusqu’à la fin du transfert. Incident validé : aucun effet sur votre Trust Score.')}
              </Note>
              <div className="btns" style={{ marginTop: 14 }}>
                {repris < transfert.colis.length ? (
                  <button type="button" className="btn primary xl" disabled>
                    <Icone nom="arrow-right-left" taille={18} />
                    <span>{tf('Transfert en cours · {n} / {total}', { n: repris, total: transfert.colis.length })}</span>
                  </button>
                ) : (
                  <Link className="btn primary xl" to={chemin('tournee')}>
                    <Icone nom="route" taille={18} />
                    <span>{t('Retour à la tournée')}</span>
                  </Link>
                )}
              </div>
            </>
          )}

          {x.etat === 'valide' && !transfert && (
            <>
              <HeroProto ton="acc" hk={t('Nouvelle tournée')} ht={t(x.ajustement ? 'Tournée ajustée par le système' : 'Tournée inchangée')} hs={x.ajustement ? t(x.ajustement.texte) : undefined} />
              {x.ajustement && x.ajustement.arrets.length > 0 && (
                <div className="card tight">
                  {x.ajustement.arrets.map((a) =>
                    a.etat === 'retire' ? (
                      <div key={a.ordre} className="livc-strike">
                        <ArretLigne
                          n={a.ordre}
                          etat="bad"
                          titre={a.nom}
                          sous={tf('Dissocié par le système à {h}', { h: hDecision })}
                          droite={
                            <Pill ton="red" sm>
                              {t('Dissocié')}
                            </Pill>
                          }
                        />
                      </div>
                    ) : (
                      <ArretLigne
                        key={a.ordre}
                        n={a.ordre}
                        etat={a === suivant ? 'cur' : ''}
                        titre={a.nom}
                        sous={tf('avant {h}', { h: heure(a.avant, langue) })}
                        droite={
                          a.etat === 'decale' ? (
                            <Pill ton="amber" sm>
                              {t('Décalé')}
                            </Pill>
                          ) : a === suivant ? (
                            <Pill ton="or" sm>
                              {t('Suivant')}
                            </Pill>
                          ) : undefined
                        }
                      />
                    ),
                  )}
                </div>
              )}
              <Note ton="green" icone="shield-check">
                <b>{t('Aucun effet sur votre Trust Score.')}</b>
              </Note>
              <div className="btns" style={{ marginTop: 14 }}>
                <Link className="btn primary xl" to={chemin('tournee')}>
                  <Icone nom="navigation" taille={18} />
                  <span>{t('Suivre la nouvelle tournée')}</span>
                </Link>
              </div>
            </>
          )}
        </Surface>

        <Sec titre={t('Votre déclaration')} />
        <div className="card flat" style={{ padding: '4px 14px' }}>
          {x.note && <Li icone="file-text" ton="ink" t={x.note} />}
          <Li icone="camera" ton="ink" t={x.photos === 0 ? t('Sans photo') : x.photos === 1 ? t('1 photo') : tf('{n} photos', { n: x.photos })} />
          <Li icone="map-pin" ton="ink" t={x.position ? (x.position.precisionM !== null ? tf('Position jointe · précision {m} m', { m: x.position.precisionM }) : t('Position jointe')) : t('Position indisponible')} />
          {x.arret && <Li icone="store" ton="ink" t={tf('Arrêt {n} · {nom}', { n: x.arret.ordre, nom: x.arret.nom })} />}
          {x.recu !== null && <Li icone="cloud-check" ton="ink" t={tf('Reçu par le serveur à {h}', { h: heure(x.recu, langue) })} />}
        </div>
      </Lvp>
    </Ecran>
  )
}
