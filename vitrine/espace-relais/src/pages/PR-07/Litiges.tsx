// Constats et retours (PR-07 § 1, prototype « Litiges », états constat · dépôt de retour · dossiers). Le litige se
// règle au comptoir, colis en main, le gérant comme témoin : LE RELAIS CONSTATE, BELIVAY DÉCIDE (GEN-06).
// - Constat : colis scanné (en garde au relais ; un colis remis se signale par le client depuis son application),
//   motif ARL-17 (non conforme, abîmé, contrefaçon ; « défaut caché » oriente vers le client, DP-27/28), photos prises
//   par l'application (PR-CONSTAT-PHOTOS-MIN ; déballage devant le client, v6 D15), PIN ; garde et renvoi suspendus ;
//   hors connexion, le constat part au retour du réseau, les délais partent de sa réception (OFF-01).
// - Dépôt de retour : étiquette scannée ; un retour non validé se refuse (« Retour non validé : ne le prenez pas »,
//   LIT-05) ; scellé + PR-RETOUR-PHOTOS-MIN photos, PIN ; hors capacité, jamais facturé, payé comme une remise (ARL-39).
// - Dossiers : 5 étapes et échéance (DP-35), demande de BelivaY, clos du mois, règles lues au registre.
// Onglet choisi par « ?onglet=constat|retour|dossiers » ; « ?colis= » (Retrait « Un problème », fiche colis) et
// « ?retour= » préremplissent la référence.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { F } from '@client/i18n/format'
import { PARAMETRES } from '../../calculs/registre'
import { jourDe } from '../../calculs/temps'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { usePeut } from '../../config/droits'
import { chemin } from '../../config/pages'
import type { Photo } from '../../donnees/communs'
import type { MotifConstat } from '../../donnees/domaines/colis'
import { ETAPES, MOTIFS_COMPTOIR, type ColisPourConstat, type Dossier, type RetourVu } from '../../donnees/domaines/incidents'
import { enAttente, useFile } from '../../donnees/fileHorsLigne'
import { source } from '../../donnees/source'
import { useLecture, type Lecture } from '../../donnees/useLecture'
import { echeance, jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { Avis, CLASSE_LIBELLE, Chargement, ErreurLecture, FeuillePin, MOTIF_LIBELLE, PrisePhoto, Scanner, Vignette, dateCourte, useGeste, usePinRefus } from './commun'
import { REGLES as R } from './regles'
import './pr07.css'

type Onglet = 'constat' | 'retour' | 'dossiers'
const ONGLETS: Onglet[] = ['constat', 'retour', 'dossiers']
const ICONE_MOTIF: Record<string, string> = { non_conforme: 'r-etiquette', abime: 'r-alerte', contrefacon: 'r-bouclier' }

export default function Litiges() {
  const { t, tf } = usePreferences()
  const [params, setParams] = useSearchParams()
  // « ?etat=r|d » : états du prototype (dépôt de retour, dossiers), gardés comme liens profonds.
  const etat = params.get('etat')
  const onglet: Onglet = (ONGLETS as string[]).includes(params.get('onglet') ?? '') ? (params.get('onglet') as Onglet) : params.get('retour') || etat === 'r' ? 'retour' : etat === 'd' ? 'dossiers' : 'constat'
  const dossiers = useLecture(() => source.incidents.dossiers(), [])
  const ouverts = dossiers.donnees?.filter((d) => d.etape !== 'clos') ?? []
  const aller = (o: Onglet, extra?: Record<string, string>) => {
    const p = new URLSearchParams(params)
    p.set('onglet', o)
    for (const k of ['colis', 'retour', 'nouveau', 'etat']) p.delete(k)
    for (const [k, v] of Object.entries(extra ?? {})) p.set(k, v)
    setParams(p, { replace: true })
    window.scrollTo({ top: 0 })
  }
  const libelles: Record<Onglet, string> = { constat: t('Constat'), retour: t('Dépôt de retour'), dossiers: ouverts.length ? tf('Dossiers {n}', { n: ouverts.length }) : t('Dossiers') }
  return (
    <Ecran route="litiges">
      <div className="p-0hxmj8 r-pile r7">
        <div>
          <h1 className="p-bvhkrl">{t('Constats et retours')}</h1>
          <div className="p-t2u0o2">{t('Le litige se règle au comptoir, colis en main, vous comme témoin.')}</div>
        </div>
        <div className="p-lvzt0c" role="tablist" aria-label={t('Constats et retours')}>
          {ONGLETS.map((o) => (
            <button key={o} type="button" role="tab" id={'r7-t-' + o} aria-controls="r7-panneau" aria-selected={onglet === o} className={onglet === o ? 'p-h01hlk' : 'p-bq7aiq'} onClick={() => aller(o)}>
              {libelles[o]}
            </button>
          ))}
        </div>
        <div id="r7-panneau" role="tabpanel" aria-labelledby={'r7-t-' + onglet} className="r7-panneau">
          {onglet === 'constat' && <OngletConstat initial={params.get('ref') ?? ''} ouvert={(id) => aller('dossiers', { nouveau: id })} />}
          {onglet === 'retour' && <OngletRetour initial={params.get('retour') ?? ''} />}
          {onglet === 'dossiers' && <OngletDossiers lecture={dossiers} nouveau={params.get('nouveau')} />}
        </div>
      </div>
    </Ecran>
  )
}

// ───────────────────────────────────────── Constat ─────────────────────────────────────────
function OngletConstat({ initial, ouvert }: { initial: string; ouvert: (id: string) => void }) {
  const { t, tf } = usePreferences()
  const { maintenant } = useSession()
  const peut = usePeut('ouvrirConstat')
  const { faire, occupe, enLigne } = useGeste()
  const pinRefus = usePinRefus()
  const champ = useRef<HTMLInputElement>(null)
  const [ref, setRef] = useState(initial)
  const [cherche, setCherche] = useState(initial.trim())
  const [scan, setScan] = useState(false)
  const [motif, setMotif] = useState<MotifConstat | null>(null)
  const [defautCache, setDefautCache] = useState(false)
  const [devant, setDevant] = useState(true)
  const [photos, setPhotos] = useState<(Photo | null)[]>(() => Array(R.photosConstat).fill(null))
  const [camera, setCamera] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [pin, setPin] = useState(false)
  const [refus, setRefus] = useState<string | null>(null)
  const [erreurPin, setErreurPin] = useState<string | null>(null)
  // { r } : la réponse arrivée (r à null : aucun colis) ; null : pas encore arrivée.
  const lecture = useLecture(async () => (cherche ? { pour: cherche, r: await source.incidents.colisPourConstat(cherche) } : null), [cherche])
  const arrivee = lecture.donnees && lecture.donnees.pour === cherche ? lecture.donnees : null
  const c = arrivee?.r ?? null
  const charge = !!cherche && !arrivee && !lecture.erreur
  const prises = photos.filter((p): p is Photo => !!p)
  const manque = !c?.constatable ? t('Scannez un colis en garde au relais.') : !motif ? t('Choisissez le motif.') : prises.length < R.photosConstat ? tf('Prenez les {n} photos.', { n: R.photosConstat }) : null
  const legendes = [t('Le colis'), devant ? t('Le déballage') : t('Le problème')]

  useEffect(() => {
    setRefus(null)
  }, [cherche])

  const chercher = () => setCherche(ref.trim())
  const lu = useCallback((v: string) => {
    setRef(v)
    setCherche(v)
  }, [])

  const signer = async (code: string) => {
    if (!c || !motif) return
    setErreurPin(null)
    const x = await faire('constat', c.colis, (s, o) => s.incidents.ouvrirConstat({ colis: c.colis, motif, photos: prises, note: note.trim() || null, devantLeClient: devant, pin: code }, o), { photos: prises.length })
    if (!x) return
    if (!x.r.ok) {
      const p = pinRefus(x.r.raison)
      if (p) return setErreurPin(p)
      setPin(false)
      return setRefus(x.r.raison === 'non_constatable' ? t('Ce colis n’est plus en garde : constat impossible.') : x.r.raison === 'photo_manquante' ? tf('Prenez les {n} photos.', { n: R.photosConstat }) : x.r.raison === 'motif_requis' ? t('Choisissez le motif.') : t('Constat refusé par le serveur. Réessayez ou écrivez au support.'))
    }
    setPin(false)
    ouvert(x.etat === 'en_file' ? 'file' : x.r.id)
  }

  return (
    <>
      <div className="p-yi6rkz">
        <div className="p-yscrc8">{t('1 · SCANNEZ LE COLIS')}</div>
        <form
          className="p-mm2ujz"
          onSubmit={(e) => {
            e.preventDefault()
            chercher()
          }}
        >
          <input ref={champ} type="text" value={ref} onChange={(e) => setRef(e.target.value.toUpperCase())} onBlur={chercher} placeholder="BLV-00000-0" autoCapitalize="characters" spellCheck={false} aria-label={t('Référence du colis')} className="p-py2cpj" />
          <button type="button" aria-label={t('Scanner')} className="p-2xyesk" onClick={() => setScan(true)}>
            <Icone nom="r-qr" taille={20} className="p-7dsggt" />
          </button>
        </form>
        <div aria-live="polite">
          {!cherche ? (
            <div className="p-are0kx r7-neutre">{t('Scannez l’étiquette ou tapez la référence du colis en garde.')}</div>
          ) : lecture.erreur ? (
            <ErreurLecture relire={lecture.relire} />
          ) : charge ? (
            <Chargement texte={t('Recherche du colis…')} />
          ) : (
            <EtatColis c={c} maintenant={maintenant} />
          )}
        </div>
      </div>

      <div className="p-yi6rkz">
        <div className="p-yscrc8" id="r7-motif">{t('2 · QUE SE PASSE-T-IL ?')}</div>
        <div className="p-0cipe3" role="radiogroup" aria-labelledby="r7-motif">
          {MOTIFS_COMPTOIR.map((m) => (
            <button key={m} type="button" role="radio" aria-checked={motif === m} className={motif === m ? 'p-hziafi' : 'p-kvvfz2'} onClick={() => (setMotif(m), setDefautCache(false))}>
              <Icone nom={ICONE_MOTIF[m]} taille={22} className="p-672m16" />
              <span className="p-dfc4i3">{t(MOTIF_LIBELLE[m])}</span>
            </button>
          ))}
          <button type="button" className="p-kvvfz2 r7-tuile-info" aria-expanded={defautCache} aria-controls={defautCache ? 'r7-defaut' : undefined} onClick={() => setDefautCache((x) => !x)}>
            <Icone nom="r-oeil" taille={22} className="p-672m16" />
            <span className="p-dfc4i3">{t('Défaut caché')}</span>
          </button>
        </div>
        {defautCache && (
          <div id="r7-defaut" className="p-gh7puf">
            <Icone nom="r-aide" taille={18} className="p-672m16" />
            <div>{tf('Le défaut caché ne se constate pas au comptoir : le client le déclare lui-même depuis son application, avec ses photos ({h} h après le retrait ; vice caché : {j} jours). Vous n’avez rien à faire.', { h: R.defautH, j: R.viceJ })}</div>
          </div>
        )}
      </div>

      <div className="p-yi6rkz">
        <div className="p-yscrc8">{R.photosConstat === 2 ? t('3 · DEUX PHOTOS') : tf('3 · {n} PHOTOS', { n: R.photosConstat })}</div>
        <button type="button" role="switch" aria-checked={devant} className="r7-interrupteur" onClick={() => setDevant((x) => !x)}>
          <span className="r7-int" aria-hidden="true" />
          <span>{t('Le client est au comptoir : photographiez le déballage devant lui')}</span>
        </button>
        <div className="p-0cipe3">
          {photos.map((p, i) =>
            p ? (
              <button key={i} type="button" className="p-08e163 r7-prise" onClick={() => setCamera(i)} aria-label={tf('{l} · prise. Reprendre la photo', { l: legendes[i] ?? tf('Photo {n}', { n: i + 1 }) })}>
                <Vignette photo={p} legende={legendes[i] ?? ''} />
                <span>
                  <Icone nom="check" taille={18} className="p-id53ve" /> {tf('{l} · prise', { l: legendes[i] ?? tf('Photo {n}', { n: i + 1 }) })}
                </span>
              </button>
            ) : (
              <button key={i} type="button" className="p-big7gg" onClick={() => setCamera(i)}>
                <Icone nom="r-appareil-photo" taille={22} className="p-672m16" />
                {legendes[i] ?? tf('Photo {n}', { n: i + 1 })}
              </button>
            ),
          )}
        </div>
        <label className="r7-champ-l" htmlFor="r7-note">
          {t('Ce que vous voyez (facultatif)')}
        </label>
        <textarea id="r7-note" className="r7-champ r7-zone" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      <div className="p-gh7puf">
        <Icone nom="r-bouclier" taille={18} className="p-672m16" />
        <div>
          {t('Le colis reste chez vous')} <strong>{t('sans frais de garde')}</strong>{' '}
          {tf('jusqu’à la décision. Vous constatez ; le vendeur répond sous {h} h, puis la médiation BelivaY tranche sur les photos. Constat possible hors connexion.', { h: R.vendeurH })}
        </div>
      </div>
      {!peut && <Avis ton="ambre">{t('Votre accès ne permet pas d’ouvrir un constat : demandez au gérant.')}</Avis>}
      {refus && <Avis ton="rouge">{refus}</Avis>}
      {!enLigne && <Avis ton="ambre">{t('Hors connexion : le constat sera gardé sur le téléphone et envoyé au retour du réseau ; les délais partiront de sa réception.')}</Avis>}
      <button type="button" className="p-ncx7qc r7-action" disabled={!!manque || !peut || occupe} aria-describedby="r7-manque" onClick={() => (setErreurPin(null), setPin(true))}>
        <Icone nom="r-envoyer" taille={18} className="p-7dsggt" />
        {t('Envoyer le constat')}
      </button>
      {manque && peut && (
        <p id="r7-manque" className="r7-manque">
          {manque}
        </p>
      )}

      <Scanner ouvert={scan} fermer={() => setScan(false)} consigne={t('Visez l’étiquette du colis')} lu={lu} saisir={() => champ.current?.focus()} />
      <PrisePhoto ouverte={camera !== null} fermer={() => setCamera(null)} consigne={camera !== null ? (legendes[camera] ?? tf('Photo {n}', { n: camera + 1 })) : ''} prise={(ph) => setPhotos((l) => l.map((x, i) => (i === camera ? ph : x)))} />
      <FeuillePin
        ouverte={pin}
        fermer={() => setPin(false)}
        titre={t('Signer le constat')}
        detail={c && motif ? tf('{colis} · {motif} · {n} photos. Le colis reste au relais, sans frais, jusqu’à la décision de BelivaY.', { colis: c.colis, motif: t(MOTIF_LIBELLE[motif]), n: prises.length }) : ''}
        erreur={erreurPin}
        occupe={occupe}
        signer={signer}
      />
    </>
  )
}

/** Ce que l'écran dit du colis scanné (dans la fenêtre, déjà en constat, remis, pas en garde, inconnu). */
function EtatColis({ c, maintenant }: { c: ColisPourConstat | null; maintenant: number }) {
  const { t, tf, langue } = usePreferences()
  if (!c) return <div className="p-are0kx r7-alerte">{t('Aucun colis au relais avec cette référence. Vérifiez l’étiquette.')}</div>
  if (c.constatable)
    return (
      <div className="p-are0kx">
        {tf('{colis} · en garde, {n}e jour · emplacement {e}. Garde et renvoi suspendus dès l’envoi du constat.', { colis: c.colis, n: c.rangGarde ?? 1, e: c.emplacement ?? '—' })}
      </div>
    )
  if (c.raison === 'en_constat')
    return (
      <div className="p-are0kx r7-ambre">
        {t('Ce colis est déjà en constat.')}{' '}
        {c.dossier && (
          <Link className="r7-lien" to={chemin('dossier-litige', { id: c.dossier })}>
            {t('Voir le dossier')}
          </Link>
        )}
      </div>
    )
  if (c.raison === 'remis' && c.remisLe)
    return (
      <div className="p-are0kx r7-ambre">
        {(c.fenetreJusqua ?? 0) > maintenant
          ? tf('Remis {quand}, dans la fenêtre de {n} jours : le client signale lui-même depuis son application, jusqu’au {fin}. Si BelivaY valide un retour, il le dépose ici avec son étiquette.', { quand: jourLong(c.remisLe, langue), n: R.fenetreJ, fin: jourLong(c.fenetreJusqua!, langue) })
          : tf('Remis {quand} : la fenêtre de {n} jours est fermée. Un vice caché se déclare par le client depuis son application.', { quand: jourLong(c.remisLe, langue), n: R.fenetreJ })}
      </div>
    )
  if (c.raison === 'pas_arrive') return <div className="p-are0kx r7-ambre">{t('Colis pas encore reçu : un problème à l’arrivée se note dans Réception (réserve ou refus).')}</div>
  return <div className="p-are0kx r7-ambre">{t('Ce colis n’est pas en garde (à faire partir, retour, groupage) : pas de constat au comptoir.')}</div>
}

// ───────────────────────────────────────── Dépôt de retour ─────────────────────────────────────────
function OngletRetour({ initial }: { initial: string }) {
  const { t, tf, langue } = usePreferences()
  const { maintenant } = useSession()
  const peut = usePeut('deposerRetour')
  const voitMontants = usePeut('voirMontantsRemuneration')
  const { faire, occupe } = useGeste()
  const pinRefus = usePinRefus()
  const champ = useRef<HTMLInputElement>(null)
  const [ref, setRef] = useState(initial)
  const [cherche, setCherche] = useState(initial.trim())
  const [scan, setScan] = useState(false)
  const [scelle, setScelle] = useState(false)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [camera, setCamera] = useState(false)
  const [pin, setPin] = useState(false)
  const [erreurPin, setErreurPin] = useState<string | null>(null)
  const [fait, setFait] = useState<{ ref: string; emplacement: string | null; file: boolean } | null>(null)
  const lectureVerif = useLecture(async () => (cherche ? { pour: cherche, v: await source.incidents.verifierRetour(cherche) } : null), [cherche])
  const verif = { erreur: lectureVerif.erreur, relire: lectureVerif.relire, donnees: lectureVerif.donnees && lectureVerif.donnees.pour === cherche ? lectureVerif.donnees.v : null }
  const retours = useLecture(() => source.incidents.retours(), [])
  const r = verif.donnees && verif.donnees.ok ? verif.donnees.retour : null
  const attendus = retours.donnees?.filter((x) => x.valide && !x.deposeA) ?? []
  const lu = useCallback((v: string) => {
    setRef(v)
    setCherche(v)
  }, [])
  useEffect(() => {
    setScelle(false)
    setPhotos([])
  }, [cherche])
  const manque = !r ? t('Scannez un retour validé.') : !scelle ? t('Posez le scellé du retour.') : photos.length < R.photosRetour ? tf('Prenez les {n} photos.', { n: R.photosRetour }) : null
  const g = PARAMETRES.relais.gainColis

  const signer = async (code: string) => {
    if (!r) return
    setErreurPin(null)
    const x = await faire('retour', r.reference, (s, o) => s.incidents.deposerRetour({ reference: r.reference, scelle: 'intact', photos, pin: code }, o), { photos: photos.length })
    if (!x) return
    if (!x.r.ok) {
      const p = pinRefus(x.r.raison)
      if (p) return setErreurPin(p)
      setPin(false)
      return setErreurPin(null)
    }
    setPin(false)
    setFait({ ref: r.reference, emplacement: x.r.emplacement ?? r.emplacement, file: x.etat === 'en_file' })
    setRef('')
    setCherche('')
  }

  return (
    <>
      <div className="p-26n637">
        <div className="p-xmy0fy">{t('DÉPÔT D’UN RETOUR VALIDÉ')}</div>
        <div className="p-glnjxu">{t('Seul un retour déjà accepté par BelivaY se dépose. Scannez l’étiquette que le client a reçue : si le motif n’est pas validé, le dépôt est refusé.')}</div>
        <form
          className="p-mm2ujz"
          onSubmit={(e) => {
            e.preventDefault()
            setCherche(ref.trim())
          }}
        >
          <input ref={champ} type="text" value={ref} onChange={(e) => setRef(e.target.value.toUpperCase())} onBlur={() => setCherche(ref.trim())} placeholder="RT-0000" autoCapitalize="characters" spellCheck={false} aria-label={t('Numéro du retour')} className="p-ryg5iy" />
          <button type="button" aria-label={t('Scanner l’étiquette')} className="p-dmjvf6" onClick={() => setScan(true)}>
            <Icone nom="r-qr" taille={20} className="p-gqbtfa" />
          </button>
        </form>
      </div>

      {fait && (
        <Avis ton={fait.file ? 'ambre' : 'vert'}>
          {fait.file
            ? tf('{ref} gardé sur le téléphone : le dépôt part au retour du réseau. Rangez-le en {e}.', { ref: fait.ref, e: fait.emplacement ?? '—' })
            : tf('{ref} déposé et scellé. Rangez-le en {e} : il part avec la prochaine collecte vers le vendeur.', { ref: fait.ref, e: fait.emplacement ?? '—' })}
        </Avis>
      )}

      <div aria-live="polite">
        {cherche && verif.erreur ? (
          <ErreurLecture relire={verif.relire} />
        ) : cherche && verif.donnees === null ? (
          <Chargement texte={t('Vérification de l’étiquette…')} />
        ) : verif.donnees && !verif.donnees.ok ? (
          verif.donnees.raison === 'non_valide' ? (
            <div className="r7-refus" role="alert">
              <Icone nom="r-annuler" taille={22} />
              <div>
                <strong>{t('Retour non validé : ne le prenez pas')}</strong>
                <p>{t('Le client doit d’abord faire valider son retour, avec un motif, depuis son application. Ne gardez pas le colis.')}</p>
              </div>
            </div>
          ) : (
            <Avis ton="ambre">{verif.donnees.raison === 'deja_depose' ? t('Ce retour est déjà déposé au relais.') : t('Étiquette inconnue : vérifiez la référence (RT-…).')}</Avis>
          )
        ) : null}
      </div>

      {r && (
        <div className="p-yi6rkz">
          <div className="p-9rmh6y">
            <div className="p-unncbq">
              <h2 className="p-9j1bbu r-ref">{r.reference}</h2>
            </div>
            <span className="p-nax3x4">{t('Motif validé')}</span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">{t('Motif')}</span>
            <span className="p-2vq92h">{r.motif}</span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">{t('Taille')}</span>
            <span className="p-2vq92h">{tf('{taille} · hors capacité', { taille: t(CLASSE_LIBELLE[r.classe]) })}</span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">{t('Ranger en')}</span>
            <span className="p-imse89 r-ref">{r.emplacement ?? '—'}</span>
          </div>
          {r.destination && (
            <div className="p-mqmvkk">
              <span className="p-ytl255">{t('Repart vers')}</span>
              <span className="p-2vq92h">{r.destination}</span>
            </div>
          )}
          <button type="button" role="checkbox" aria-checked={scelle} className="r7-interrupteur" onClick={() => setScelle((x) => !x)}>
            <span className="r7-case" aria-hidden="true">{scelle && <Icone nom="check" taille={16} />}</span>
            <span>{t('J’ai posé le scellé du retour sur le colis')}</span>
          </button>
          <button type="button" className="p-keaeoe" onClick={() => setCamera(true)} disabled={!scelle || photos.length >= R.photosRetour} data-raison={!scelle ? t('Posez d’abord le scellé du retour') : t('Photos prises')}>
            <Icone nom={photos.length >= R.photosRetour ? 'check' : 'r-appareil-photo'} taille={20} className="p-gqd75s" />
            {photos.length >= R.photosRetour ? tf('Scellé posé · {n} photos prises', { n: photos.length }) : tf('Scellé du retour posé · {n} photos obligatoires ({p} prises)', { n: R.photosRetour, p: photos.length })}
          </button>
          {photos.length > 0 && (
            <div className="r7-vignettes">
              {photos.map((p, i) => (
                <Vignette key={p} photo={p} legende={tf('Photo {n} du retour', { n: i + 1 })} />
              ))}
            </div>
          )}
          <button type="button" className="p-ncx7qc r7-action" disabled={!!manque || !peut || occupe} aria-describedby="r7-manque-r" onClick={() => (setErreurPin(null), setPin(true))}>
            <Icone nom="check" taille={18} className="p-7dsggt" />
            {t('Enregistrer le dépôt')}
          </button>
          {manque && (
            <p id="r7-manque-r" className="r7-manque">
              {manque}
            </p>
          )}
          <div className="p-81u2s6">
            {tf('Jamais facturé, hors capacité. Il part avec la prochaine collecte vers le vendeur, qui l’inspecte sous {h} h ; le trajet ({trajet} F) est payé par la partie en tort, jamais par vous.', { h: R.inspectionH, trajet: F(R.trajet) })}{' '}
            {voitMontants ? tf('Vous touchez comme un colis remis : {s} F petit, {m} F moyen, {l} F encombrant.', { s: F(g.S), m: F(g.M), l: F(g.L) }) : t('Le relais est payé comme pour un colis remis.')}
          </div>
        </div>
      )}

      <div className="p-yi6rkz">
        <div className="p-unncbq">
          <h2 className="p-9j1bbu">{t('Retours attendus')}</h2>
        </div>
        {retours.erreur ? (
          <ErreurLecture relire={retours.relire} />
        ) : !retours.donnees ? (
          <Chargement />
        ) : !attendus.length ? (
          <p className="r7-note">{t('Aucun retour validé n’est attendu au relais.')}</p>
        ) : (
          attendus.map((x: RetourVu) => (
            <button key={x.reference} type="button" className="p-o24hsm r7-ligne" onClick={() => (setRef(x.reference), setCherche(x.reference), setFait(null))}>
              <div className="p-tc472u">
                <Icone nom="r-colis" taille={20} className="p-q7qjlz" />
              </div>
              <div className="p-rnqj8n">
                <div className="p-ife3a2">{x.reference}</div>
                <div className="p-dfa05r">{x.attenduAvant ? tf('{taille} · attendu avant {quand}', { taille: t(CLASSE_LIBELLE[x.classe]), quand: echeance(x.attenduAvant, maintenant, langue) }) : t(CLASSE_LIBELLE[x.classe])}</div>
              </div>
              <Icone nom="r-chevron-droite" taille={18} />
            </button>
          ))
        )}
      </div>

      <Scanner ouvert={scan} fermer={() => setScan(false)} consigne={t('Visez l’étiquette du retour')} lu={lu} saisir={() => champ.current?.focus()} />
      <PrisePhoto ouverte={camera} fermer={() => setCamera(false)} consigne={tf('Retour scellé · photo {n} sur {t}', { n: photos.length + 1, t: R.photosRetour })} prise={(ph) => setPhotos((l) => [...l, ph])} />
      <FeuillePin ouverte={pin} fermer={() => setPin(false)} titre={t('Signer le dépôt')} detail={r ? tf('{ref} · scellé posé · {n} photos. Le retour part avec la prochaine collecte.', { ref: r.reference, n: photos.length }) : ''} erreur={erreurPin} occupe={occupe} signer={signer} />
    </>
  )
}

// ───────────────────────────────────────── Dossiers ─────────────────────────────────────────
const ETAPE_LIBELLE: Record<string, string> = { constat: 'Constat', reponse_vendeur: 'Vendeur {h} h', mediation: 'Médiation', decision: 'Décision', recours: 'Recours' }

/** Barre des 5 étapes (LIT-08) : faites, en cours, à venir. */
export function BarreEtapes({ d }: { d: Dossier }) {
  const { t, tf } = usePreferences()
  const i = d.etape === 'clos' ? ETAPES.length : ETAPES.indexOf(d.etape)
  const libelle = (e: string) => (e === 'reponse_vendeur' ? tf(ETAPE_LIBELLE[e], { h: R.vendeurH }) : t(ETAPE_LIBELLE[e]))
  return (
    <>
      <div className="p-txcw5t" role="img" aria-label={d.etape === 'clos' ? t('Dossier clos') : tf('Étape {n} sur {t} : {e}', { n: i + 1, t: ETAPES.length, e: libelle(ETAPES[i]) })}>
        {ETAPES.map((e, k) => (
          <span key={e} className={k < i ? 'p-028mkx' : k === i ? 'p-k5ae91' : 'p-rr4m5k'} />
        ))}
      </div>
      <div className="p-yryqru" aria-hidden="true">
        {ETAPES.map((e) => (
          <span key={e}>{libelle(e)}</span>
        ))}
      </div>
    </>
  )
}

/** Échéance de l'étape en cours, en mots. */
export function useEcheance() {
  const { t, tf, langue } = usePreferences()
  const { maintenant } = useSession()
  return (d: Dossier): string | null => {
    if (!d.recuServeurA) return t('Constat en attente d’envoi : les délais partiront de sa réception par BelivaY.')
    if (!d.echeance) return null
    const q = echeance(d.echeance, maintenant, langue)
    return d.etape === 'reponse_vendeur' ? tf('Le vendeur a jusqu’à {q} pour répondre.', { q }) : d.etape === 'mediation' ? tf('BelivaY décide au plus tard {q}.', { q }) : d.etape === 'recours' ? tf('Recours possible jusqu’à {q}.', { q }) : null
  }
}

function OngletDossiers({ lecture, nouveau }: { lecture: Lecture<Dossier[]>; nouveau: string | null }) {
  const { t, tf, langue } = usePreferences()
  const { maintenant } = useSession()
  const texteEcheance = useEcheance()
  const file = useFile()
  const enFile = enAttente(file, 'constat')
  if (lecture.erreur) return <ErreurLecture relire={lecture.relire} />
  if (!lecture.donnees) return <Chargement texte={t('Chargement des dossiers…')} />
  const mois = (ms: number) => jourDe(ms).slice(0, 7) === jourDe(maintenant).slice(0, 7)
  const ouverts = lecture.donnees.filter((d) => d.etape !== 'clos')
  const clos = lecture.donnees.filter((d) => d.etape === 'clos' && d.closA && mois(d.closA))
  const pill = (d: Dossier) =>
    enFile.some((a) => a.objet === d.colis)
      ? [t('En attente d’envoi'), 'p-h4wlx0']
      : d.demande && !d.demande.faiteA
        ? [t('À compléter'), 'p-h4wlx0']
        : d.decision?.relaisEnCause && !d.decision.contestation && (d.decision.contestableJusqua ?? 0) > maintenant
          ? [t('Contestable'), 'p-h4wlx0']
          : d.decision
            ? [t('Décidé'), 'p-nax3x4']
            : [t('En cours'), 'p-rpzy79']
  return (
    <>
      {nouveau && (
        <Avis ton={nouveau === 'file' ? 'ambre' : 'vert'}>
          {nouveau === 'file' ? t('Constat gardé sur le téléphone : il part au retour du réseau ; les délais partiront de sa réception.') : t('Constat envoyé : le colis reste chez vous sans frais jusqu’à la décision de BelivaY.')}
        </Avis>
      )}
      {!ouverts.length && (
        <div className="p-yi6rkz r-vide">
          <div className="r-vide-i">
            <Icone nom="r-balance" taille={28} />
          </div>
          <h2>{t('Aucun dossier en cours')}</h2>
          <p>{t('Un constat envoyé ouvre un dossier ici, avec ses étapes et ses échéances.')}</p>
        </div>
      )}
      {ouverts.map((d) => {
        const [p, cl] = pill(d)
        const ech = texteEcheance(d)
        return (
          <div className="p-yi6rkz" key={d.id}>
            <Link to={chemin('dossier-litige', { id: d.id })} className="p-o24hsm">
              <div className="p-9exjl6">
                <Icone nom="r-balance" taille={20} className="p-lhsznn" />
              </div>
              <div className="p-rnqj8n">
                <div className="p-ife3a2">{`${d.litige ?? d.id} · ${d.colis}`}</div>
                <div className="p-dfa05r">{tf(d.origine === 'client' ? '{motif} · signalé par le client le {date}' : '{motif} · constat du {date}', { motif: t(MOTIF_LIBELLE[d.motif]), date: dateCourte(d.ouvertA, langue) })}</div>
              </div>
              <span className={cl}>{p}</span>
            </Link>
            <BarreEtapes d={d} />
            {(d.demande && !d.demande.faiteA) || ech ? (
              <div className="p-fht1zk">
                <Icone nom={d.demande && !d.demande.faiteA ? 'r-appareil-photo' : 'r-horloge'} taille={18} className="p-lhsznn" />
                <div>
                  {d.demande && !d.demande.faiteA && <>{tf('BelivaY demande : « {q} » Répondez depuis le dossier.', { q: t(d.demande.texte) })} </>}
                  {ech}
                </div>
              </div>
            ) : null}
          </div>
        )
      })}
      <div className="p-yi6rkz">
        <div className="p-unncbq">
          <h2 className="p-9j1bbu">{t('Clos ce mois')}</h2>
        </div>
        {!clos.length ? (
          <p className="r7-note">{t('Aucun dossier clos ce mois.')}</p>
        ) : (
          clos.map((d) => (
            <Link key={d.id} to={chemin('dossier-litige', { id: d.id })} className="p-o24hsm">
              <div className="p-tc472u">
                <Icone nom="check" taille={20} className="p-q7qjlz" />
              </div>
              <div className="p-rnqj8n">
                <div className="p-ife3a2">{`${d.litige ?? d.id} · ${d.colis}`}</div>
                <div className="p-dfa05r">{`${t(MOTIF_LIBELLE[d.motif])} · ${d.decision ? t(d.decision.texte) : ''}`}</div>
              </div>
              <span className="p-nax3x4">{t('Clos')}</span>
            </Link>
          ))
        )}
      </div>
      <div className="p-yi6rkz">
        <div className="p-unncbq">
          <h2 className="p-9j1bbu">{t('Les règles')}</h2>
        </div>
        {[
          [t('Le client peut signaler'), tf('{n} jours après le retrait', { n: R.fenetreJ })],
          [t('Défaut caché · vice caché'), tf('{h} h · {j} jours', { h: R.defautH, j: R.viceJ })],
          [t('Pendant le dossier'), t('ni garde ni renvoi')],
          [t('Votre rôle'), t('constater, garder, remettre')],
          [t('Réponse du vendeur'), tf('{h} h, sinon BelivaY décide', { h: R.vendeurH })],
          [t('Médiation BelivaY'), tf('décision au plus {h} h après le vendeur', { h: R.decisionH })],
          [t('Recours'), tf('un seul, sous {h} h, autre médiateur', { h: R.recoursH })],
          [t('Arrangement sans réponse'), tf('{j} jours : retour en examen', { j: R.arrangementJ })],
          [t('Décision qui vous met en cause'), tf('contestable une fois, sous {h} h ouvrées', { h: R.contestationH })],
          [t('Fil du dossier'), tf('fermé à la clôture, lisible {j} jours', { j: R.conservationJ })],
        ].map(([a, b]) => (
          <div className="p-mqmvkk" key={a}>
            <span className="p-ytl255">{a}</span>
            <span className="p-2vq92h">{b}</span>
          </div>
        ))}
      </div>
    </>
  )
}
