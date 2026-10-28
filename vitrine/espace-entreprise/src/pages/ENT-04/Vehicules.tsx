// ENT-P08 · Véhicules. Indicateurs (véhicules, proposés à l'affectation, en vérification, documents à renouveler ou
// expirés), tableau (type et plaque, classes, capacité, livreur habituel, assurance, documents, état), classes par type
// et règles d'affectation en lecture seule (classes_par_type_vehicule : jamais de XL sur une moto, ENT-RG-R76).
// Fiche (adresse « ?id= ») : photos horodatées, documents, gestes (rattacher à un livreur, mettre à jour l'assurance ou
// la carte grise → retour à l'affectation, déclarer indisponible en cas de panne : ENT-RG-R75). Déclarer : type,
// plaque unique (409 PLATE_DUPLICATE), capacité, classes qui suivent le type, livreur habituel, fin d'assurance
// (exigée pour tout véhicule motorisé), carte grise, photo avec la plaque obligatoire (ENT-RG-R77). Assurance expirée :
// plus proposé à l'affectation (ENT-P08R-02), alertes à 30, 7 et 1 jours. Droits : propriétaire et répartiteur.
import { useState } from 'react'
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { Feuille } from '@client/composants/Feuille'
import { jouer } from '@client/composants/Sons'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { ClasseColis } from '../../donnees/communs'
import type { RefusVehicule, Vehicule } from '../../donnees/domaines/vehicules'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { ORDRE_CLASSES, PARAMETRES_FLOTTE, TYPES_VEHICULE, type TypeVehicule } from '../../calculs/flotte'
import { yaounde } from '../../calculs/temps'
import { usePreferences } from '../../preferences'
import { useHorloge, usePeut } from '../../session'
import { Av, Champ, Kpi, Panel, Pill, Rangee, Table, Verrou, Vide, type Ton, Note, Sec } from '../../composants/prototype'
import { Chargement, ErreurLecture, ICONE_VEHICULE, NOM_CLASSE, NOM_VEHICULE, useDates, useFeuilleParams } from '../ENT-03/outils'
import { ChoixFichier, type Fichier } from '../ENT-03/ChoixFichier'
import { Ecran } from '../../composants/coque'

const P = PARAMETRES_FLOTTE
const JOUR = 86_400_000
const ETAT: Record<Vehicule['statut'], [string, Ton]> = { actif: ['Proposé à l’affectation', 'green'], a_verifier: ['En vérification', 'amber'], hors_service: ['Indisponible', 'ink'], expire: ['Document expiré', 'red'] }
const REFUS: Record<RefusVehicule, string> = {
  plaque: 'Plaque invalide (ex. : CE 412 AB).',
  doublon: 'Cette plaque est déjà déclarée dans BelivaY : la console est prévenue et vérifiera.',
  photo: 'La photo du véhicule avec sa plaque lisible est obligatoire.',
  assurance: 'Date de fin d’assurance obligatoire, dans le futur.',
  classes: 'Classes impossibles pour ce type de véhicule.',
  capacite: 'Capacité : un nombre entier de colis, au moins 1.',
}
/** « AAAA-MM-JJ » (champ date) → fin de ce jour à Yaoundé. */
const finDuJour = (v: string) => {
  const [a, m, j] = v.split('-').map(Number)
  return yaounde(a, m, j, 23, 59)
}

function FormDeclarer({ fermer }: { fermer: () => void }) {
  const { t, tf } = usePreferences()
  const livreurs = useLecture(() => source.livreurs.liste())
  const [type, setType] = useState<TypeVehicule>('moto')
  const [plaque, setPlaque] = useState('')
  const [capacite, setCapacite] = useState('')
  const [classes, setClasses] = useState<ClasseColis[]>(P.classes.moto)
  const [livreurId, setLivreurId] = useState('')
  const [assurance, setAssurance] = useState('')
  const [photo, setPhoto] = useState<Fichier | null>(null)
  const [carte, setCarte] = useState<Fichier | null>(null)
  const [refus, setRefus] = useState<RefusVehicule | null>(null)
  const n = Number(capacite)
  const valide = plaque.trim().length >= 5 && Number.isInteger(n) && n >= 1 && classes.length > 0 && !!assurance && !!photo?.lisible
  const changerType = (v: TypeVehicule) => {
    setType(v)
    setClasses(P.classes[v])
  }
  const envoyer = async () => {
    const r = await source.vehicules.declarer({ type, plaque, capacite: n, classes, livreurId: livreurId || null, assuranceJusqua: assurance ? finDuJour(assurance) : null, photoPlaque: !!photo?.lisible, carteGrise: !!carte?.lisible })
    if (!r.ok) {
      setRefus(r.raison)
      jouer('erreur')
      return
    }
    jouer('interrupteur')
    fermer()
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (valide) void envoyer()
      }}
    >
      <h2 className="card-t">{t('Déclarer un véhicule')}</h2>
      <div className="g g2">
        <Champ t={t('Type')}>
          <select value={type} onChange={(e) => changerType(e.target.value as TypeVehicule)}>
            {TYPES_VEHICULE.map((v) => (
              <option key={v} value={v}>
                {t(NOM_VEHICULE[v])}
              </option>
            ))}
          </select>
        </Champ>
        <Champ t={t('Plaque')}>
          <input value={plaque} onChange={(e) => setPlaque(e.target.value.toUpperCase())} placeholder="CE 412 AB" autoComplete="off" />
        </Champ>
      </div>
      <Champ t={t('Classes transportables (suivent le type)')} groupe>
        <div className="entA-chk">
          {ORDRE_CLASSES.map((c) => {
            const permise = P.classes[type].includes(c)
            return (
              <label key={c}>
                <input type="checkbox" disabled={!permise} checked={classes.includes(c)} onChange={(e) => setClasses((x) => (e.target.checked ? [...x, c] : x.filter((y) => y !== c)))} />
                {t(NOM_CLASSE[c])}
              </label>
            )
          })}
        </div>
        {type === 'camionnette' && <span className="aide">{t('Hors gabarit : deux personnes à bord.')}</span>}
      </Champ>
      <div className="g g2">
        <Champ t={t('Capacité par tournée (colis)')}>
          <input type="number" inputMode="numeric" min={1} value={capacite} onChange={(e) => setCapacite(e.target.value)} />
        </Champ>
        <Champ t={t('Livreur habituel')}>
          <select value={livreurId} onChange={(e) => setLivreurId(e.target.value)}>
            <option value="">{t('Aucun pour l’instant')}</option>
            {(livreurs.donnees ?? []).map((l) => (
              <option key={l.id} value={l.id}>
                {l.nom}
              </option>
            ))}
          </select>
        </Champ>
      </div>
      <Champ t={t('Fin de l’assurance')}>
        <input type="date" value={assurance} onChange={(e) => setAssurance(e.target.value)} />
        <span className="aide">{t('Exigée pour tout véhicule motorisé ; rappels avant l’échéance.')}</span>
      </Champ>
      <Champ t={t('Photo du véhicule avec la plaque (obligatoire)')} bloc>
        <ChoixFichier accepte="image/*" fichier={photo} choisir={setPhoto} libelle={t('Choisir la photo')} />
      </Champ>
      <Champ t={t('Carte grise')} bloc>
        <ChoixFichier accepte="image/*,application/pdf" fichier={carte} choisir={setCarte} libelle={t('Choisir la carte grise')} />
      </Champ>
      {refus && (
        <p className="err mt10" role="alert">
          {t(REFUS[refus])}
        </p>
      )}
      <p className="aide mt10">{tf('Le véhicule est vérifié par BelivaY avant d’être proposé à l’affectation (vérification automatique en moins de {n} min quand c’est possible).', { n: P.verifAutoMin })}</p>
      <div className="btns mt16">
        <button type="submit" className="btn primary" disabled={!valide}>
          <Icone nom="plus" taille={18} />
          <span>{t('Déclarer le véhicule')}</span>
        </button>
        <button type="button" className="btn ghost" onClick={fermer}>
          {t('Annuler')}
        </button>
      </div>
    </form>
  )
}

function Fiche({ v, peut }: { v: Vehicule; peut: boolean }) {
  const { t, tf } = usePreferences()
  const { date, dateHeure } = useDates()
  const maintenant = useHorloge()
  const livreurs = useLecture(() => source.livreurs.liste())
  const [assurance, setAssurance] = useState('')
  const [attestation, setAttestation] = useState<Fichier | null>(null)
  const [carte, setCarte] = useState<Fichier | null>(null)
  const [motif, setMotif] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const l = livreurs.donnees?.find((x) => x.id === v.livreurId)
  const fait = (ok: boolean, texte: string) => {
    jouer(ok ? 'interrupteur' : 'erreur')
    setMsg(ok ? texte : t('Ce geste n’a pas pu être enregistré.'))
  }
  const reste = v.assuranceJusqua ? Math.ceil((v.assuranceJusqua - maintenant) / JOUR) : null
  return (
    <div>
      <p className="kick">{t('Fiche du véhicule')}</p>
      <h2 className="card-t mt10 row wrap">
        <Icone nom={ICONE_VEHICULE[v.type]} taille={20} />
        {`${t(NOM_VEHICULE[v.type])} · ${v.plaque}`}
      </h2>
      <div className="e-pills mt10">
        <Pill ton={ETAT[v.statut][1]} dot sm>{t(ETAT[v.statut][0])}</Pill>
      </div>
      {v.statut === 'hors_service' && v.motifIndisponible && <Note ton="ink" icone="info" className="mt10">{tf('Indisponible : {m}', { m: v.motifIndisponible })}</Note>}
      <div className="g g2 mt14">
        {(['vehicule', 'plaque'] as const).map((k) => (
          <div key={k} className="e-fichier" style={{ alignItems: 'center', textAlign: 'center' }}>
            <Icone nom={k === 'plaque' ? 'scan-line' : 'camera'} taille={28} />
            <b>{t(k === 'plaque' ? 'Photo de la plaque' : 'Photo du véhicule')}</b>
            <span className="aide">{v.photos?.[k] ? tf('prise le {d}', { d: dateHeure(v.photos[k]!) }) : t('manquante')}</span>
          </div>
        ))}
      </div>
      <div className="mt14">
        <div className="kv"><span className="k">{t('Classes')}</span><span className="v">{v.classes.map((c) => t(NOM_CLASSE[c])).join(', ')}</span></div>
        <div className="kv"><span className="k">{t('Capacité')}</span><span className="v">{tf('{n} colis par tournée', { n: v.capacite ?? 0 })}</span></div>
        <div className="kv"><span className="k">{t('Assurance')}</span><span className="v">{v.assuranceJusqua ? (reste! < 0 ? tf('expirée le {d}', { d: date(v.assuranceJusqua, true) }) : tf('jusqu’au {d} ({n} j)', { d: date(v.assuranceJusqua, true), n: reste! })) : t('manquante')}</span></div>
        <div className="kv"><span className="k">{t('Carte grise')}</span><span className="v">{t(v.carteGrise?.statut === 'valide' ? 'Vérifiée' : v.carteGrise?.statut === 'en_revue' ? 'En vérification' : 'Manquante')}</span></div>
        <div className="kv"><span className="k">{t('Livreur habituel')}</span><span className="v">{l ? <Link to={chemin('livreur', { id: l.id })}>{l.nom}</Link> : t('Aucun')}</span></div>
      </div>
      {peut && (
        <>
          <Champ t={t('Rattacher à un livreur')}>
          <select
            value={v.livreurId ?? ''}
            aria-label={t('Livreur habituel')}
            onChange={async (e) => fait((await source.vehicules.rattacher(v.id, e.target.value || null)).ok, t('Livreur habituel enregistré.'))}
          >
            <option value="">{t('Aucun')}</option>
            {(livreurs.donnees ?? []).map((x) => (
              <option key={x.id} value={x.id}>
                {x.nom}
              </option>
            ))}
          </select>
          </Champ>
          <Sec t={t('Mettre à jour l’assurance')} />
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (!assurance || !attestation?.lisible) return
              const r = await source.vehicules.mettreAJour(v.id, 'assurance', finDuJour(assurance))
              fait(r.ok, t('Assurance mise à jour : le véhicule revient à l’affectation.'))
              if (r.ok) {
                setAssurance('')
                setAttestation(null)
              }
            }}
          >
            <Champ t={t('Nouvelle date de fin')}>
              <input type="date" value={assurance} onChange={(e) => setAssurance(e.target.value)} />
            </Champ>
            <Champ t={t('Attestation d’assurance')} bloc>
              <ChoixFichier accepte="image/*,application/pdf" fichier={attestation} choisir={setAttestation} libelle={t('Choisir l’attestation')} />
            </Champ>
            <button type="submit" className="btn secondary mt10" disabled={!assurance || !attestation?.lisible}>
              {t('Enregistrer l’assurance')}
            </button>
          </form>
          {v.carteGrise?.statut !== 'valide' && (
            <>
              <Sec t={t('Carte grise')} />
              <ChoixFichier accepte="image/*,application/pdf" fichier={carte} choisir={setCarte} libelle={t('Choisir la carte grise')} />
              <button type="button" className="btn secondary mt10" disabled={!carte?.lisible} onClick={async () => fait((await source.vehicules.mettreAJour(v.id, 'carte_grise', null)).ok, t('Carte grise envoyée.'))}>
                {t('Envoyer la carte grise')}
              </button>
            </>
          )}
          <Sec t={t('Disponibilité')} />
          {v.statut === 'hors_service' ? (
            <button type="button" className="btn secondary" onClick={async () => fait((await source.vehicules.indisponible(v.id, false)).ok, t('Véhicule remis en service.'))}>
              {t('Remettre en service')}
            </button>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                if (!motif.trim()) return
                fait((await source.vehicules.indisponible(v.id, true, motif)).ok, t('Véhicule déclaré indisponible : ses livreurs ne sont plus proposés pour ses classes.'))
                setMotif('')
              }}
            >
              <Champ t={t('Motif (panne, accident…)')}>
                <input value={motif} onChange={(e) => setMotif(e.target.value)} />
              </Champ>
              <button type="submit" className="btn ghost mt10" disabled={!motif.trim()}>
                {t('Déclarer indisponible')}
              </button>
            </form>
          )}
          {msg && (
            <p className="bandeau mt14" role="status">
              <Icone nom="info" taille={18} />
              <span className="grow">{msg}</span>
            </p>
          )}
        </>
      )}
    </div>
  )
}

export default function Vehicules() {
  const { t, tf } = usePreferences()
  const { date } = useDates()
  const maintenant = useHorloge()
  const peut = usePeut(['proprietaire', 'repartiteur'])
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const lieu = useLocation()
  const vehicules = useLecture(() => source.vehicules.liste())
  const livreurs = useLecture(() => source.livreurs.liste())
  const declarer = useFeuilleParams('declarer')
  const id = params.get('id')
  const vs = vehicules.donnees
  const choisi = vs?.find((v) => v.id === id)
  const ouvrirFiche = (vid: string) => {
    const p = new URLSearchParams(params)
    p.set('id', vid)
    naviguer({ search: p.toString() }, { state: { feuille: true } })
  }
  const fermerFiche = () => {
    if ((lieu.state as { feuille?: boolean } | null)?.feuille) return naviguer(-1)
    const p = new URLSearchParams(params)
    p.delete('id')
    naviguer({ search: p.toString() }, { replace: true })
  }
  const aRenouveler = (vs ?? []).filter((v) => v.statut === 'expire' || (v.assuranceJusqua !== null && v.assuranceJusqua - maintenant <= P.alerteAssuranceJours * JOUR) || v.carteGrise?.statut === 'manquante')
  const expires = (vs ?? []).filter((v) => v.statut === 'expire')
  const nomLivreur = (lid: string | null) => livreurs.donnees?.find((l) => l.id === lid)
  const [cherche, setCherche] = useState('')
  const [typeF, setTypeF] = useState('')
  const [etatF, setEtatF] = useState('')
  // Filtre des documents (M5) : assurance expirée, à renouveler (sous le seuil d'alerte), carte grise manquante.
  const [docF, setDocF] = useState<'' | 'assurance_expiree' | 'assurance_bientot' | 'carte_grise'>('')
  const docOk = (v: Vehicule) => {
    const reste = v.assuranceJusqua === null ? null : v.assuranceJusqua - maintenant
    if (docF === 'assurance_expiree') return reste === null || reste < 0
    if (docF === 'assurance_bientot') return reste !== null && reste >= 0 && reste <= P.alerteAssuranceJours * JOUR
    if (docF === 'carte_grise') return v.carteGrise?.statut !== 'valide'
    return true
  }
  const PILL_ETAT: Record<Vehicule['statut'], Ton> = { actif: 'green', a_verifier: 'amber', hors_service: 'ink', expire: 'red' }
  const visibles = (vs ?? []).filter(
    (v) =>
      (!typeF || v.type === typeF) &&
      (!etatF || v.statut === etatF) &&
      docOk(v) &&
      (!cherche || [v.plaque, nomLivreur(v.livreurId)?.nom ?? ''].some((x) => x.toLowerCase().replace(/\s/g, '').includes(cherche.toLowerCase().replace(/\s/g, '')))),
  )
  const parType = TYPES_VEHICULE.map((ty) => [ty, (vs ?? []).filter((v) => v.type === ty).length] as const).filter(([, n]) => n > 0)
  const actions = peut ? (
    <button type="button" className="btn primary" onClick={() => declarer.ouvrir()}>
      <Icone nom="plus" taille={18} />
      <span>{t('Déclarer un véhicule')}</span>
    </button>
  ) : null
  const classesPanel = (
    <Panel titre={t('Classes transportables par type')} icone="package">
      {TYPES_VEHICULE.map((ty) => (
        <div key={ty} className="entA-row">
          <span className="entA-veh">
            <span className="vi">
              <Icone nom={ICONE_VEHICULE[ty]} taille={24} />
            </span>
          </span>
          <span className="grow">
            <span className="t" style={{ display: 'block' }}>
              {t(NOM_VEHICULE[ty])}
            </span>
            {ty === 'moto' && (
              <span className="s" style={{ display: 'block' }}>
                {t('Jamais de XL ni de hors gabarit')}
              </span>
            )}
          </span>
          <span className="r">
            <b>{P.classes[ty].map((c) => t(NOM_CLASSE[c])).join(', ')}</b>
          </span>
        </div>
      ))}
      <div className="mt8">
        <Verrou>{t('Fixé par BelivaY · l’affectation ne propose que les véhicules compatibles avec la plus grande classe du paquet')}</Verrou>
      </div>
    </Panel>
  )

  return (
    <Ecran
      route="vehicules"
      actions={actions}
      fixes={
        <>
          <Feuille ouverte={declarer.ouverte && peut} fermer={declarer.fermer} titre={t('Déclarer un véhicule')}>
            <FormDeclarer fermer={declarer.fermer} />
          </Feuille>
          <Feuille ouverte={!!choisi} fermer={fermerFiche} titre={choisi ? choisi.plaque : ''} forme="tiroir">
            {choisi && <Fiche v={choisi} peut={peut} />}
          </Feuille>
        </>
      }
    >
      {vehicules.erreur ? (
        <ErreurLecture erreur={vehicules.erreur} relire={vehicules.relire} lu={vs ? maintenant : null} />
      ) : expires.length ? (
        <div className="dk-banner red" role="status">
          <Icone nom="shield-off" taille={20} />
          <div className="grow">
            <b>{tf('{n} véhicule(s) avec une assurance expirée : plus proposé(s) à l’affectation.', { n: expires.length })}</b> {t('Téléversez la nouvelle attestation pour le remettre en service ; ses zones peuvent être bloquées d’ici là.')}
          </div>
          {peut && (
            <button type="button" className="btn primary" onClick={() => ouvrirFiche(expires[0].id)}>
              <Icone nom="upload" taille={18} />
              <span>{t('Mettre à jour')}</span>
            </button>
          )}
        </div>
      ) : aRenouveler.length ? (
        <div className="dk-banner amber" role="status">
          <Icone nom="car" taille={20} />
          <div className="grow">
            <b>{tf('{n} document(s) à renouveler bientôt.', { n: aRenouveler.length })}</b> {t('Sans nouvelle attestation, le véhicule sera retiré de l’affectation le jour de l’expiration.')}
          </div>
          {peut && (
            <button type="button" className="btn secondary" onClick={() => ouvrirFiche(aRenouveler[0].id)}>
              <Icone nom="upload" taille={18} />
              <span>{t('Mettre à jour')}</span>
            </button>
          )}
        </div>
      ) : null}
      {!vs ? (
        !vehicules.erreur && <Chargement lignes={4} />
      ) : vs.length === 0 ? (
        <div className="g g21" style={{ alignItems: 'start' }}>
          <Panel>
            <Vide
              icone="bike"
              t={t('Déclarez votre premier véhicule')}
              s={t('Type, plaque, classes transportables, capacité en colis, livreur habituel, date d’assurance et photo du véhicule avec la plaque : sans cette photo, le véhicule ne peut pas être enregistré.')}
              action={
                peut ? (
                  <button type="button" className="btn primary" onClick={() => declarer.ouvrir()}>
                    <Icone nom="plus" taille={18} />
                    <span>{t('Déclarer un véhicule')}</span>
                  </button>
                ) : undefined
              }
            />
          </Panel>
          {classesPanel}
        </div>
      ) : (
        <>
          <div className="g g4">
            <Kpi icone="bike" ton="night" k={t('Véhicules')} v={vs.length} s={parType.map(([ty, n]) => `${n} ${t(NOM_VEHICULE[ty]).toLowerCase()}`).join(' · ')} />
            <Kpi icone="circle-check" iton="green" k={t('Proposés à l’affectation')} v={vs.filter((v) => v.proposable).length} s={t('Documents à jour, livreur actif')} />
            <Kpi icone="hourglass" iton={vs.some((v) => v.statut === 'a_verifier') ? 'amber' : undefined} k={t('En vérification')} v={vs.filter((v) => v.statut === 'a_verifier').length} s={vs.filter((v) => v.statut === 'a_verifier').map((v) => v.plaque).join(' · ') || t('aucun')} />
            <Kpi icone="file-warning" iton={expires.length ? 'red' : aRenouveler.length ? 'amber' : undefined} k={expires.length ? t('Documents expirés') : t('Documents à renouveler')} v={aRenouveler.length} s={aRenouveler.map((v) => v.plaque).join(' · ') || t('aucun')} />
          </div>
          <div style={{ marginTop: 16 }}>
            <Table
              legende={t('Véhicules')}
              outils={
                <>
                  <label className="srch">
                    <Icone nom="search" taille={16} />
                    <input type="search" value={cherche} onChange={(e) => setCherche(e.target.value)} placeholder={t('Plaque, livreur…')} aria-label={t('Chercher un véhicule par plaque ou livreur')} />
                  </label>
                  <label className={'flt' + (typeF ? ' on' : '')}>
                    <Icone nom="bike" taille={15} />
                    <select value={typeF} onChange={(e) => setTypeF(e.target.value)} aria-label={t('Type')}>
                      <option value="">{t('Type : tous')}</option>
                      {TYPES_VEHICULE.map((ty) => (
                        <option key={ty} value={ty}>
                          {t(NOM_VEHICULE[ty])}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={'flt' + (etatF ? ' on' : '')}>
                    <Icone nom="circle-dot" taille={15} />
                    <select value={etatF} onChange={(e) => setEtatF(e.target.value)} aria-label={t('État')}>
                      <option value="">{t('État : tous')}</option>
                      {(Object.keys(ETAT) as Vehicule['statut'][]).map((k) => (
                        <option key={k} value={k}>
                          {t(ETAT[k][0])}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={'flt' + (docF ? ' on' : '')}>
                    <Icone nom="file-warning" taille={15} />
                    <select value={docF} onChange={(e) => setDocF(e.target.value as typeof docF)} aria-label={t('Documents')}>
                      <option value="">{t('Documents : tous')}</option>
                      <option value="assurance_expiree">{t('Assurance expirée ou manquante')}</option>
                      <option value="assurance_bientot">{tf('Assurance à renouveler ({n} j)', { n: P.alerteAssuranceJours })}</option>
                      <option value="carte_grise">{t('Carte grise à vérifier')}</option>
                    </select>
                  </label>
                  <span className="sp"></span>
                  <span className="lock">
                    <Icone nom="fingerprint" taille={14} />
                    {t('Plaque unique dans BelivaY')}
                  </span>
                </>
              }
              pied={
                <>
                  <span>{tf('{n} véhicule(s) · {d}', { n: vs.length, d: parType.map(([ty, n]) => `${n} ${t(NOM_VEHICULE[ty]).toLowerCase()}`).join(', ') })}</span>
                  <span>{t('Un doublon de plaque entre deux entreprises est signalé à la console')}</span>
                </>
              }
              cle={(v) => v.id}
              ligneCls={(v) => {
                const reste = v.assuranceJusqua ? Math.ceil((v.assuranceJusqua - maintenant) / JOUR) : null
                return v.statut === 'expire' ? 'bad' : reste !== null && reste <= P.alerteAssuranceJours ? 'warn' : ''
              }}
              rows={visibles}
              cols={[
                {
                  k: 'veh',
                  t: t('Véhicule'),
                  main: true,
                  rendu: (v) => (
                    <span className="entA-veh">
                      <span className="vi">
                        <Icone nom={ICONE_VEHICULE[v.type]} taille={24} />
                      </span>
                      <span>
                        <b style={{ display: 'block', fontSize: '.84rem' }}>{t(NOM_VEHICULE[v.type])}</b>
                        <span className="t12 c3 mono" style={{ display: 'block', whiteSpace: 'nowrap' }}>
                          {v.plaque}
                        </span>
                      </span>
                    </span>
                  ),
                },
                { k: 'cls', t: t('Classes'), rendu: (v) => <b>{v.classes.map((c) => t(NOM_CLASSE[c])).join(', ')}</b> },
                {
                  k: 'cap',
                  t: t('Capacité'),
                  rendu: (v) => (
                    <div className="entA-c">
                      <b>{v.capacite ?? 0}</b> <span className="t12 c3">{t('colis')}</span>
                    </div>
                  ),
                },
                {
                  k: 'liv',
                  t: t('Livreur habituel'),
                  rendu: (v) => {
                    const l = nomLivreur(v.livreurId)
                    return l ? (
                      <span className="row" style={{ gap: 8 }}>
                        <Av initiales={l.initiales} taille={28} />
                        <span className="t13 b7">{l.nom}</span>
                      </span>
                    ) : (
                      <span className="t12 c3">{t('Aucun')}</span>
                    )
                  },
                },
                {
                  k: 'ins',
                  t: t('Assurance'),
                  rendu: (v) => {
                    const reste = v.assuranceJusqua ? Math.ceil((v.assuranceJusqua - maintenant) / JOUR) : null
                    return (
                      <div className="entA-c">
                        <span className={'t13' + (v.statut === 'expire' ? ' b8' : reste !== null && reste <= P.alerteAssuranceJours ? ' b8' : '')} style={v.statut === 'expire' ? { color: 'var(--red)' } : reste !== null && reste <= P.alerteAssuranceJours ? { color: 'var(--amber)' } : undefined}>
                          {v.assuranceJusqua ? (reste !== null && reste < 0 ? tf('Expirée le {d}', { d: date(v.assuranceJusqua, true) }) : tf('Valide jusqu’au {d}', { d: date(v.assuranceJusqua, true) })) : '—'}
                        </span>
                        {reste !== null && reste >= 0 && reste <= P.alerteAssuranceJours && <div className="t12" style={{ color: 'var(--amber)' }}>{tf('dans {n} j · alerte envoyée', { n: reste })}</div>}
                      </div>
                    )
                  },
                },
                {
                  k: 'cg',
                  t: t('Documents du véhicule'),
                  rendu: (v) => (
                    <div className="col entA-c" style={{ gap: 4, alignItems: 'flex-start' }}>
                      <Pill ton={v.carteGrise?.statut === 'valide' ? 'green' : v.carteGrise?.statut === 'en_revue' ? 'amber' : 'red'} icone={v.carteGrise?.statut === 'valide' ? 'check' : undefined} dot={v.carteGrise?.statut !== 'valide'} sm>
                        {t(v.carteGrise?.statut === 'valide' ? 'Carte grise vérifiée' : v.carteGrise?.statut === 'en_revue' ? 'Carte grise en vérification' : 'Carte grise manquante')}
                      </Pill>
                      <Pill ton={v.photos?.plaque ? 'green' : 'red'} icone="camera" sm>
                        {t(v.photos?.plaque ? 'Photo et plaque reçues' : 'Photo de plaque manquante')}
                      </Pill>
                    </div>
                  ),
                },
                {
                  k: 'st',
                  t: t('État'),
                  rendu: (v) => (
                    <Pill ton={PILL_ETAT[v.statut]} dot sm>
                      {t(ETAT[v.statut][0])}
                    </Pill>
                  ),
                },
                {
                  k: 'go',
                  t: <span className="vh">{t('Fiche')}</span>,
                  l: t('Fiche'),
                  rendu: (v) =>
                    v.statut === 'expire' && peut ? (
                      <button type="button" className="btn sm primary" onClick={() => ouvrirFiche(v.id)} aria-label={tf('Fiche du véhicule {p}', { p: v.plaque })}>
                        <Icone nom="upload" taille={18} />
                        <span>{t('Mettre à jour')}</span>
                      </button>
                    ) : (
                      <button type="button" className="btn sm secondary" onClick={() => ouvrirFiche(v.id)} aria-label={tf('Fiche du véhicule {p}', { p: v.plaque })}>
                        <Icone nom="chevron-right" taille={18} />
                      </button>
                    ),
                },
              ]}
            />
            {visibles.length === 0 && <Vide icone="search-x" t={t('Aucun véhicule ne correspond')} s={t('Changez la recherche ou les filtres.')} />}
          </div>
          <div className="g g2">
            {classesPanel}
            <Panel titre={t('Règles d’affectation des véhicules')} icone="scale">
              <Rangee icone="shield-off" ton="red" titre={t('Assurance ou carte grise expirée')} sous={tf('Le véhicule est retiré de l’affectation le jour même, jusqu’à la mise à jour. Rappels {r} jours avant.', { r: P.rappelsAssurance.join(', ') })} />
              <Rangee icone="wrench" ton="amber" titre={t('Véhicule en panne')} sous={t('Statut « indisponible » : ses livreurs ne sont plus proposés pour les classes qu’il portait.')} />
              <Rangee icone="ban" ton="red" titre={t('Jamais de XL sur une moto')} sous={t('Le portail refuse l’affectation ; une plaque est unique dans BelivaY et la photo de la plaque est obligatoire.')} />
              <div className="btns">
                <Link className="btn secondary" to={chemin('flotte')}>
                  <Icone nom="users" taille={18} />
                  <span>{t('Voir les livreurs')}</span>
                </Link>
              </div>
            </Panel>
          </div>
        </>
      )}
    </Ecran>
  )
}
