// Réception EN CONTINU d'un lot (PR-04 REC-02 à REC-07, REC-10, REC-13 ; DP-20, DP-62 ; ARL-11 ; PR-RC-04, PR-RC-08) :
// le livreur pose ses colis, le gérant les scanne à la suite SANS QUITTER L'ÉCRAN (viseur ouvert, lecture continue ;
// repli : la référence tapée au gros pavé, « BLV-00008-1 » = 0 0 0 0 8 1). Chaque colis scanné s'ajoute en tête de la
// liste avec l'emplacement proposé selon sa taille. On ne touche que les EXCEPTIONS, dans une feuille : abîmé (gardé
// avec réserve, 1 photo), refusé (2 photos, repart avec le livreur), absent du lot ; un colis inattendu (non annoncé)
// ou d'un autre relais se signale tout seul au scan. « Terminer » récapitule : les colis scannés sans exception passent
// « scellé intact », les non scannés « absents » ; photo du lot, puis le PIN signe le dépôt (vérifié au dernier
// chiffre) ; le livreur confirme ensuite sur son téléphone (REC-07).
import { useState } from 'react'
import { Feuille, useFeuille } from '@client/composants/Feuille'
import { PaveCode } from '../../composants/comptoir/PaveCode'
import { ScanComptoir } from '../../composants/comptoir/ScanComptoir'
import '../../composants/comptoir/comptoir.css'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import type { ClasseColis } from '../../donnees/communs'
import type { ColisRelais, MotifConstat } from '../../donnees/domaines/colis'
import type { Lot, ReglesReception, ResultatColis } from '../../donnees/domaines/reception'
import { geste, origine } from '../../donnees/fileHorsLigne'
import { source } from '../../donnees/source'
import { usePreferences } from '../../preferences'
import { PrisePhoto, Vignette } from '../PR-05/commun'

const CLASSES: Record<ClasseColis, string> = { S: 'petit', M: 'moyen', L: 'encombrant' }
const RESERVES = [
  { id: 'angle', texte: 'Angle enfoncé', motif: 'abime' as MotifConstat },
  { id: 'etiquette', texte: 'Étiquette abîmée', motif: 'abime' as MotifConstat },
  { id: 'carton', texte: 'Carton marqué ou taché', motif: 'abime' as MotifConstat },
]
const REFUS = [
  { id: 'scelle', texte: 'Scellé du livreur cassé (ou film d’un encombrant)', motif: 'emballage_ouvert' as MotifConstat, scelle: 'casse' as const },
  { id: 'mouille', texte: 'Colis mouillé', motif: 'abime' as MotifConstat, scelle: 'intact' as const },
  { id: 'ouvert', texte: 'Colis ouvert', motif: 'emballage_ouvert' as MotifConstat, scelle: 'casse' as const },
]
type Ton = 'vert' | 'rouge' | 'ambre'

/** « 000081 » → « BLV-00008-1 » ; un QR ou une référence lue passe telle quelle (majuscules). */
export const referenceDe = (v: string) => (/^\d{6}$/.test(v) ? `BLV-${v.slice(0, 5)}-${v.slice(5)}` : v.trim().toUpperCase())

export function ControleContinu(p: { l: Lot; regles: ReglesReception; enLigne: boolean; maintenant: number; relire: () => void; valide: (lot: string, enFile: boolean) => void }) {
  const { t, tf } = usePreferences()
  const { l, regles, enLigne } = p
  const [annonce, setAnnonce] = useState<{ ton: Ton; texte: string } | null>(null)
  const [ordre, setOrdre] = useState<string[]>([])
  const [saisie, setSaisie] = useState('')
  const [choisi, setChoisi] = useState<string | null>(null)
  const [trop, setTrop] = useState('')
  const fExc = useFeuille('exception')
  const fTrop = useFeuille('en-trop')
  const fFin = useFeuille('terminer')
  const o = () => origine(p.maintenant)
  const dire = (ton: Ton, texte: string) => setAnnonce({ ton, texte })

  const annonces = l.colisDuLot.filter((c) => !l.enTrop.includes(c.id))
  const vu = (c: ColisRelais) => c.etat !== 'attendu' || !!l.details[c.id]?.scanne
  const vus = annonces.filter(vu)
  const restants = annonces.filter((c) => !vu(c))
  const tries = [...vus].sort((a, b) => ordre.indexOf(b.id) - ordre.indexOf(a.id))
  const enTrop = l.colisDuLot.filter((c) => l.enTrop.includes(c.id))

  async function lire(v: string) {
    const ref = referenceDe(v)
    const r = await source.reception.scannerEtiquette(l.lot, ref, o())
    setSaisie('')
    if (r.issue === 'dans_le_lot') {
      signal('colisRecu')
      setOrdre((x) => [...x.filter((y) => y !== r.colis), r.colis])
      const place = l.details[r.colis]?.emplacementPropose
      dire('vert', place ? tf('{ref} → rangez en {place}', { ref: r.colis, place }) : tf('{ref} → rangez au comptoir', { ref: r.colis }))
    } else if (r.issue === 'deja_scanne') dire('ambre', tf('{ref} est déjà dans la liste.', { ref: r.colis }))
    else if (r.issue === 'pas_pour_ce_relais') {
      signal('scanRefuse')
      dire('rouge', tf('Pas pour votre relais ({relais}) : rendez-le au livreur.', { relais: r.relais }))
    } else if (r.issue === 'en_trop') {
      signal('alerteCapacite')
      setTrop(r.colis)
      dire('ambre', tf('{ref} n’est pas annoncé dans ce lot.', { ref: r.colis }))
      fTrop.ouvrir()
    } else {
      signal('erreur')
      dire('rouge', t('Étiquette illisible : tapez les chiffres de la référence.'))
    }
    p.relire()
  }

  async function poser(colis: string, r: ResultatColis) {
    const x = o()
    try {
      const { r: res } = await geste(enLigne, 'reception', colis, x, (s) => s.reception.resultat(l.lot, colis, r, x), { local: true, photos: r.photos.length })
      if (res.ok) return true
      signal('erreur')
      dire('rouge', res.raison === 'photo_manquante' ? t('Photo manquante : l’étape reste bloquée tant qu’elle n’est pas prise.') : t('Ce résultat n’a pas pu être enregistré.'))
    } catch {
      dire('rouge', t('Ce résultat n’a pas pu être enregistré.'))
    }
    return false
  }

  const c = choisi ? l.colisDuLot.find((x) => x.id === choisi) ?? null : null
  const etat = (x: ColisRelais) => {
    const res = x.arrivee.resultat
    return res === 'reserve' ? t('gardé avec réserve') : res === 'refus' ? t('refusé · repart avec le livreur') : res === 'absent' ? t('absent du lot') : res === 'ok' ? t('scellé intact') : vu(x) ? t('scanné') : t('à scanner')
  }
  const classeLigne = (x: ColisRelais) => (x.arrivee.resultat === 'refus' || x.arrivee.resultat === 'absent' ? ' refus' : x.arrivee.resultat === 'reserve' ? ' exception' : ordre[ordre.length - 1] === x.id ? ' nouveau' : '')
  const ligne = (x: ColisRelais) => (
    <li key={x.id}>
      <button type="button" id={'r4-colis-' + x.id} className={'cpt-recu-l' + classeLigne(x)} onClick={() => (setChoisi(x.id), fExc.ouvrir())}>
        <span className="cpt-recu-t">
          <b>{x.id}</b>
          <small>{[t(CLASSES[x.classe]), x.fragile ? t('fragile') : null, l.details[x.id]?.remplacement ? t('remplacement') : null, etat(x)].filter(Boolean).join(' · ')}</small>
        </span>
        {x.arrivee.resultat === 'refus' || x.arrivee.resultat === 'absent' ? <span className="cpt-pastille rouge">{t(x.arrivee.resultat === 'refus' ? 'Repart' : 'Absent')}</span> : vu(x) ? <span className="cpt-place">{l.details[x.id]?.emplacementPropose ?? t('Comptoir')}</span> : null}
      </button>
    </li>
  )

  return (
    <>
      <div className="cpt-deux">
        <div className="cpt-fiche">
          <div className="cpt-compteur" role="status">
            <b>{vus.length}</b>
            <span>{tf('sur {n} colis scannés', { n: annonces.length })}</span>
          </div>
          <ScanComptoir
            continu
            consigne={t('Scannez chaque colis : il s’ajoute à la liste')}
            lu={(v) => void lire(v)}
            libelleSaisie={t('Saisir la référence')}
            pave={<PaveCode longueur={6} valeur={saisie} changer={setSaisie} complet={(v) => void lire(v)} libelle={t('Référence de l’étiquette')} prefixe="BLV-" tiretAvant={1} />}
          />
          {annonce && (
            <div className={'cpt-annonce ' + annonce.ton} role={annonce.ton === 'rouge' ? 'alert' : 'status'}>
              <Icone nom={annonce.ton === 'vert' ? 'check' : 'r-alerte'} taille={18} />
              <span>{annonce.texte}</span>
            </div>
          )}
        </div>
        <div className="cpt-feuille">
          {tries.length > 0 && (
            <ul className="cpt-recus" aria-label={t('Colis scannés')}>
              {tries.map(ligne)}
            </ul>
          )}
          {enTrop.length > 0 && (
            <ul className="cpt-recus" aria-label={t('Colis inattendus')}>
              {enTrop.map((x) => (
                <li key={x.id}>
                  <div className="cpt-recu-l exception">
                    <span className="cpt-recu-t">
                      <b>{x.id}</b>
                      <small>{t('inattendu · signalé avec photo')}</small>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {restants.length > 0 && (
            <details className="cpt-repli">
              <summary>{tf('Encore à scanner ({n})', { n: restants.length })}</summary>
              <div className="cpt-repli-c">
                <ul className="cpt-recus">{restants.map(ligne)}</ul>
                {import.meta.env.VITE_SOURCE !== 'api' && (
                  <div className="cpt-pastilles">
                    {restants.map((x) => (
                      <button key={x.id} type="button" className="cpt-pastille" onClick={() => void lire(x.id)}>
                        <Icone nom="r-qr" taille={16} />
                        {tf('Démonstration : scanner {ref}', { ref: x.id })}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </details>
          )}
          <button type="button" className="cpt-action" disabled={vus.length === 0 && enTrop.length === 0} onClick={() => (signal('toucher'), fFin.ouvrir())}>
            <Icone nom="check" taille={22} />
            {t('Terminer')}
          </button>
          <p className="cpt-raison">{t('Touchez un colis seulement s’il y a un problème.')}</p>
        </div>
      </div>

      <Feuille ouverte={fExc.ouverte} fermer={fExc.fermer} titre={t('Un problème avec ce colis')}>
        {c && <Exception c={c} regles={regles} fermer={fExc.fermer} poser={poser} dire={dire} relire={p.relire} />}
      </Feuille>
      <Feuille ouverte={fTrop.ouverte} fermer={fTrop.fermer} titre={t('Colis inattendu')}>
        <EnTrop lot={l.lot} reference={trop} regles={regles} enLigne={enLigne} maintenant={p.maintenant} fermer={fTrop.fermer} dire={dire} relire={p.relire} />
      </Feuille>
      <Feuille ouverte={fFin.ouverte} fermer={fFin.fermer} titre={t('Terminer le dépôt')}>
        {fFin.ouverte && <Terminer l={l} regles={regles} enLigne={enLigne} maintenant={p.maintenant} vus={vus} restants={restants} enTrop={enTrop.length} poser={poser} valide={p.valide} />}
      </Feuille>
    </>
  )
}

/** Feuille d'exception d'un colis : abîmé (réserve), refusé, absent. */
function Exception(p: { c: ColisRelais; regles: ReglesReception; fermer: () => void; poser: (colis: string, r: ResultatColis) => Promise<boolean>; dire: (ton: Ton, texte: string) => void; relire: () => void }) {
  const { t, tf } = usePreferences()
  const { c } = p
  const [type, setType] = useState<'reserve' | 'refus' | null>(null)
  const [motif, setMotif] = useState<string | null>(null)
  const [photos, setPhotos] = useState<string[]>([])
  const fait = c.etat !== 'attendu'
  const besoin = type === 'refus' ? p.regles.photosRefus : p.regles.photosReserve
  const liste = type === 'refus' ? REFUS : RESERVES
  const enregistrer = async () => {
    const m = liste.find((x) => x.id === motif)
    const ok = await p.poser(c.id, { resultat: type!, scelle: type === 'refus' ? (REFUS.find((x) => x.id === motif)?.scelle ?? 'casse') : 'intact', photos, note: m ? t(m.texte) : null, motif: m?.motif ?? null })
    if (!ok) return
    signal('succes')
    p.dire(type === 'refus' ? 'rouge' : 'ambre', type === 'refus' ? tf('{ref} refusé : il repart avec le livreur.', { ref: c.id }) : tf('{ref} gardé avec réserve, photo jointe.', { ref: c.id }))
    p.relire()
    p.fermer()
  }
  const absent = async () => {
    if (await p.poser(c.id, { resultat: 'absent', scelle: null, photos: [], note: null, motif: null })) {
      p.dire('ambre', tf('{ref} signalé absent du lot.', { ref: c.id }))
      p.relire()
      p.fermer()
    }
  }
  return (
    <div className="cpt-feuille">
      <h2>{c.id}</h2>
      {fait ? (
        <p className="cpt-note">{t('Ce colis a déjà son résultat. Le livreur le verra en confirmant le dépôt.')}</p>
      ) : !type ? (
        <div className="cpt-motifs">
          <button type="button" className="cpt-motif" onClick={() => (setType('reserve'), setMotif(RESERVES[0].id))}>
            <Icone nom="r-alerte" taille={18} />
            {t('Abîmé · je le garde avec réserve')}
          </button>
          <button type="button" className="cpt-motif" onClick={() => (setType('refus'), setMotif(REFUS[0].id))}>
            <Icone nom="r-fermer" taille={18} />
            {t('Je le refuse · il repart avec le livreur')}
          </button>
          {c.etat === 'attendu' && !c.arrivee.resultat && (
            <button type="button" className="cpt-motif" onClick={() => void absent()}>
              <Icone nom="package-search" taille={18} />
              {t('Absent du lot')}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="cpt-motifs" role="radiogroup" aria-label={t('Ce que vous constatez')}>
            {liste.map((m) => (
              <button key={m.id} type="button" role="radio" aria-checked={motif === m.id} aria-pressed={motif === m.id} className="cpt-motif" onClick={() => setMotif(m.id)}>
                {t(m.texte)}
              </button>
            ))}
          </div>
          <div className="pr05 pr05-photos">
            {photos.map((x, i) => (
              <Vignette key={x} id={x} libelle={tf('Photo {n}', { n: i + 1 })} />
            ))}
            {photos.length < besoin && (
              <PrisePhoto libelle={tf('Prendre la photo {n} sur {total}', { n: photos.length + 1, total: besoin })} classe="cpt-photo" prise={(x) => setPhotos((l) => [...l, x])}>
                <Icone nom="r-appareil-photo" taille={22} />
                {tf('Photo {n} sur {total}', { n: photos.length + 1, total: besoin })}
              </PrisePhoto>
            )}
          </div>
          <button type="button" className="cpt-action" disabled={photos.length < besoin || !motif} onClick={() => void enregistrer()}>
            {type === 'refus' ? t('Refuser ce colis') : t('Garder avec réserve')}
          </button>
          <button type="button" className="cpt-lien" onClick={() => (setType(null), setPhotos([]))}>
            {t('Changer de choix')}
          </button>
        </>
      )}
    </div>
  )
}

/** Colis inattendu (non annoncé, pour ce relais) : sa taille et une photo ; le livreur en répond. */
function EnTrop(p: { lot: string; reference: string; regles: ReglesReception; enLigne: boolean; maintenant: number; fermer: () => void; dire: (ton: Ton, texte: string) => void; relire: () => void }) {
  const { t, tf } = usePreferences()
  const [classe, setClasse] = useState<ClasseColis>('S')
  const [photos, setPhotos] = useState<string[]>([])
  const signaler = async () => {
    const x = origine(p.maintenant)
    const { r } = await geste(p.enLigne, 'reception', p.reference, x, (s) => s.reception.colisEnTrop(p.lot, p.reference, classe, photos, x), { local: true, photos: photos.length })
    if (!r.ok) return p.dire('rouge', t('Photo manquante : l’étape reste bloquée tant qu’elle n’est pas prise.'))
    signal('succes')
    p.dire('ambre', tf('{ref} signalé inattendu : le livreur en répond, pas vous.', { ref: p.reference }))
    p.relire()
    p.fermer()
  }
  return (
    <div className="cpt-feuille">
      <h2>{tf('{ref} : colis inattendu', { ref: p.reference || '—' })}</h2>
      <p className="cpt-note">{t('Il n’est pas annoncé dans ce lot. Gardez-le à part ; une photo suffit.')}</p>
      <div className="cpt-pastilles" role="radiogroup" aria-label={t('Taille')}>
        {(['S', 'M', 'L'] as ClasseColis[]).map((k) => (
          <button key={k} type="button" role="radio" aria-checked={classe === k} className={'cpt-pastille' + (classe === k ? ' acc' : '')} onClick={() => setClasse(k)}>
            {t(CLASSES[k])}
          </button>
        ))}
      </div>
      <div className="pr05 pr05-photos">
        {photos.map((x, i) => (
          <Vignette key={x} id={x} libelle={tf('Photo {n}', { n: i + 1 })} />
        ))}
        {photos.length < p.regles.photosEnTrop && (
          <PrisePhoto libelle={t('Photo du colis inattendu')} classe="cpt-photo" prise={(x) => setPhotos((l) => [...l, x])}>
            <Icone nom="r-appareil-photo" taille={22} />
            {t('Photo du colis')}
          </PrisePhoto>
        )}
      </div>
      <button type="button" className="cpt-action" disabled={photos.length < p.regles.photosEnTrop || !p.reference} onClick={() => void signaler()}>
        {t('Signaler le colis inattendu')}
      </button>
    </div>
  )
}

/** « Terminer » : récapitulatif, photo du lot, PIN (vérifié au dernier chiffre) ; signe le dépôt. */
function Terminer(p: { l: Lot; regles: ReglesReception; enLigne: boolean; maintenant: number; vus: ColisRelais[]; restants: ColisRelais[]; enTrop: number; poser: (colis: string, r: ResultatColis) => Promise<boolean>; valide: (lot: string, enFile: boolean) => void }) {
  const { t, tf } = usePreferences()
  const [photo, setPhoto] = useState<string | null>(null)
  const [pin, setPin] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [occupe, setOccupe] = useState(false)
  const intacts = p.vus.filter((c) => c.etat === 'attendu' || c.arrivee.resultat === 'ok').length
  const reserves = p.vus.filter((c) => c.arrivee.resultat === 'reserve').length
  const refus = p.vus.filter((c) => c.arrivee.resultat === 'refus').length
  const absents = p.restants.length + p.vus.filter((c) => c.arrivee.resultat === 'absent').length
  const signer = async (code: string) => {
    if (!photo) return
    setOccupe(true)
    setErreur(null)
    // Les colis scannés sans exception : scellé intact ; les autres : absents du lot (REC-02 : chacun a un résultat).
    for (const c of p.vus.filter((x) => x.etat === 'attendu')) await p.poser(c.id, { resultat: 'ok', scelle: 'intact', photos: [], note: null, motif: null })
    for (const c of p.restants) await p.poser(c.id, { resultat: 'absent', scelle: null, photos: [], note: null, motif: null })
    const x = origine(p.maintenant)
    try {
      const { r, etat } = await geste(p.enLigne, 'validation_lot', p.l.lot, x, (s) => s.reception.validerLot(p.l.lot, photo, code, x), { local: true, photos: 1 })
      if (r.ok) {
        signal('lotValide')
        p.valide(p.l.lot, etat === 'en_file')
        return
      }
      signal('erreur')
      setPin('')
      setErreur(r.raison === 'pin_faux' ? t('PIN incorrect. Réessayez.') : r.raison === 'pin_requis' ? tf('PIN bloqué après trop d’essais : réessayez dans {n} minutes.', { n: p.regles.pinBlocageMin }) : r.raison === 'photo_manquante' ? t('Photo manquante.') : t('Le lot n’a pas pu être validé.'))
    } finally {
      setOccupe(false)
    }
  }
  const ligne = (n: number, texte: string, ton?: string) =>
    n > 0 && (
      <div className="cpt-recu">
        <span>{texte}</span>
        <span className={ton}>{n}</span>
      </div>
    )
  return (
    <div className="cpt-feuille">
      <h2>{tf('Lot {lot}', { lot: p.l.lot })}</h2>
      <div>
        {ligne(intacts, t('Reçus, scellé intact'))}
        {ligne(reserves, t('Gardés avec réserve'))}
        {ligne(refus, t('Refusés, repartent avec le livreur'))}
        {ligne(p.enTrop, t('Inattendus, signalés'))}
        {ligne(absents, t('Absents du lot'))}
      </div>
      {p.restants.length > 0 && <p className="cpt-note">{tf('Non scannés : {liste}. Ils seront signalés absents.', { liste: p.restants.map((c) => c.id).join(', ') })}</p>}
      {photo ? (
        <div className="pr05-prise pr05">
          <Vignette id={photo} libelle={t('Photo du lot')} />
          <div className="r-grow p-ife3a2">{t('Photo du lot prise')}</div>
          <PrisePhoto libelle={t('Reprendre la photo du lot')} classe="p-rbzobc pr05-court" prise={setPhoto}>
            {t('Reprendre')}
          </PrisePhoto>
        </div>
      ) : (
        <PrisePhoto libelle={t('Photo du lot')} classe="cpt-photo" prise={setPhoto}>
          <Icone nom="r-appareil-photo" taille={24} />
          {t('Photo du lot · tous les colis visibles')}
        </PrisePhoto>
      )}
      {erreur && (
        <div className="cpt-annonce rouge" role="alert">
          {erreur}
        </div>
      )}
      {photo ? <PaveCode longueur={p.regles.pinLongueur} valeur={pin} changer={(v) => (setPin(v), setErreur(null))} complet={(v) => void signer(v)} libelle={t('Votre PIN signe le dépôt')} masque occupe={occupe} erreur={!!erreur} /> : <p className="cpt-raison">{t('Prenez la photo du lot, puis votre PIN signe le dépôt.')}</p>}
    </div>
  )
}
