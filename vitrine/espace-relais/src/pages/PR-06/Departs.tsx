// PR-06 · « À faire partir » : préparer et remettre au livreur tout ce qui quitte le relais, et suivre les collectes.
// Structure du prototype (Departs) intacte : titre, carte nuit bleue « Prochaine collecte », onglets À remettre ·
// Collectes · Partis, liste « Scannez en sortie » (case, emplacement, référence, motif → destination, étiquette),
// compteur « n / N », « Valider la sortie », tableau « Pourquoi un colis part ».
// Enrichi, en miroir de la réception (PR-D07.A09) : scan de l'étiquette ou toucher du colis tendu au livreur, colis
// « absent » avec motif (DEP-02), photo de sortie et PIN du membre (v6 D15, GEN-09), attente puis confirmation du
// livreur sur son téléphone (DEP-03 : la garde lui passe, les places se libèrent alors), colis sans collecte prévue,
// renvoi en retard au-delà de PR-DEP-ALERTE-H (DEP-05), renvoi le premier jour ouvert après le 7e (ARL-08), transfert
// payé dans l'application du client (ARL-23, PR-RC-23). Hors connexion : scans et validation partent en file.
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Feuille } from '@client/composants/Feuille'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import type { MotifSortie } from '../../donnees/domaines/colis'
import type { Collecte, LigneDepart, MotifAbsence, RefusDepart, ReglesDeparts } from '../../donnees/domaines/departs'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { PARAMETRES } from '../../calculs/registre'
import { heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { Annonce, ChampPin, Chargement, ErreurLecture, PrisePhoto, Vide, francs, quand, useAgir, useAnnonce, useMaintenant } from './commun'

type Onglet = 'remettre' | 'collectes' | 'partis'
const ETAT_PROTOTYPE: Record<string, Onglet> = { plan: 'collectes', done: 'partis' }

const MOTIF: Record<MotifSortie, { libelle: string; pill: string; sens: string }> = {
  renvoi: { libelle: 'Renvoi', pill: 'p-ekng8o', sens: 'non retiré en 7 jours' },
  retour: { libelle: 'Retour', pill: 'p-nax3x4', sens: 'retour scellé' },
  transfert: { libelle: 'Transfert', pill: 'p-rpzy79', sens: 'le client a changé de relais' },
  refus: { libelle: 'Refus', pill: 'p-h4wlx0', sens: 'refusé au comptoir' },
  fermeture: { libelle: 'Fermeture', pill: 'r6-pill-neutre', sens: 'fermeture déclarée' },
}
const ABSENCES: { id: MotifAbsence; libelle: string; sous: string }[] = [
  { id: 'introuvable', libelle: 'Introuvable', sous: 'Pas à sa place ni ailleurs : BelivaY est alerté.' },
  { id: 'abime', libelle: 'Scellé abîmé', sous: 'Le colis reste ici : ouvrez un constat avec photos.' },
  { id: 'pas_de_place', libelle: 'Le livreur n’a plus de place', sous: 'Il part avec la collecte suivante.' },
]
const REFUS: Record<RefusDepart, string> = {
  introuvable: 'Colis inconnu de cette collecte.',
  pas_a_faire_partir: 'Ce colis n’est pas à faire partir.',
  pas_dans_la_collecte: 'Ce colis n’est pas prévu à cette collecte : il part avec la suivante.',
  photo_manquante: 'La photo de sortie est obligatoire.',
  pin_requis: 'PIN incorrect. Réessayez.',
  rien_a_valider: 'Aucun colis tendu au livreur.',
  colis_non_traites: 'Chaque colis prévu doit être scanné ou marqué absent.',
  deja_validee: 'Sortie déjà validée : on attend la confirmation du livreur.',
  deja_partie: 'Cette collecte est déjà partie.',
}

function useDestination() {
  const { t, tf } = usePreferences()
  return (l: LigneDepart) => tf('{motif} → {dest}', { motif: t(MOTIF[l.motif].sens), dest: l.destination ?? t(l.motif === 'transfert' || l.motif === 'fermeture' ? 'autre relais' : 'vendeur') })
}

function Valider({ col, regles, ouverte, fermer, fait }: { col: Collecte; regles: ReglesDeparts; ouverte: boolean; fermer: () => void; fait: (enFile: boolean) => void }) {
  const { t, tf } = usePreferences()
  const { agir, occupe, enLigne } = useAgir()
  const [photo, setPhoto] = useState<string | null>(null)
  const [pin, setPin] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  useEffect(() => {
    if (ouverte) {
      setPin('')
      setErreur(null)
    }
  }, [ouverte])
  const pret = !!photo && pin.length === regles.pinLongueur
  const valider = async () => {
    if (!pret || !photo) return
    const r = await agir('sortie', col.id, (o, s) => s.departs.valider(col.id, photo, pin, o), { photos: 1 })
    if (!r) return
    if (r.r.ok) {
      signal('succes')
      setPhoto(null)
      fait(r.etat === 'en_file')
    } else {
      signal('erreur')
      setPin('')
      setErreur(REFUS[r.r.raison as RefusDepart] ?? 'Validation refusée.')
    }
  }
  return (
    <Feuille ouverte={ouverte} fermer={fermer} titre={t('Valider la sortie')}>
      <div className="r6-feuille">
        <h2>{t('Valider la sortie')}</h2>
        <div className="r6-resume">
          <span>
            <b>{col.presentes.length > 1 ? tf('{n} colis tendus', { n: col.presentes.length }) : t('1 colis tendu')}</b> {tf('à {livreur} ({entreprise})', { livreur: col.livreur, entreprise: col.entreprise })}
          </span>
          {col.absents.length > 0 && <span>{col.absents.length > 1 ? tf('{n} colis absents : ils restent ici, en tête de liste', { n: col.absents.length }) : t('1 colis absent : il reste ici, en tête de liste')}</span>}
          <span>{t('Le livreur confirme chaque colis sur son téléphone : la garde lui passe alors, et les places se libèrent.')}</span>
        </div>
        <PrisePhoto consigne="Photo des colis remis au livreur" photo={photo} prise={setPhoto} maxKo={PARAMETRES.relais.photoMaxKo} />
        <ChampPin id="r6-pin-sortie" longueur={regles.pinLongueur} valeur={pin} changer={setPin} erreur={erreur} valider={() => void valider()} />
        {!enLigne && <p className="r6-alerte">{t('Hors ligne : la sortie est enregistrée sur le téléphone avec son heure, et part au retour du réseau.')}</p>}
        <button type="button" className="r-btn r-principal" disabled={!pret || occupe} onClick={() => void valider()}>
          <Icone nom="check" taille={20} />
          <span>{t('Valider la sortie')}</span>
        </button>
      </div>
    </Feuille>
  )
}

function Absent({ colis, ouverte, fermer, choisir }: { colis: string | null; ouverte: boolean; fermer: () => void; choisir: (m: MotifAbsence) => void }) {
  const { t, tf } = usePreferences()
  const premier = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (ouverte) requestAnimationFrame(() => premier.current?.focus())
  }, [ouverte])
  return (
    <Feuille ouverte={ouverte && !!colis} fermer={fermer} titre={t('Colis absent')}>
      <div className="r6-feuille">
        <h2>{tf('{ref} ne part pas', { ref: colis ?? '' })}</h2>
        <p>{t('Dites pourquoi : le colis reste au relais, en tête de liste, pour la prochaine collecte.')}</p>
        <div className="r6-choix">
          {ABSENCES.map((a, i) => (
            <button key={a.id} ref={i === 0 ? premier : undefined} type="button" onClick={() => choisir(a.id)}>
              <Icone nom={a.id === 'introuvable' ? 'package-search' : a.id === 'abime' ? 'package-x' : 'truck'} taille={20} />
              <span>
                <b style={{ display: 'block' }}>{t(a.libelle)}</b>
                <span className="p-46lk2m">{t(a.sous)}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </Feuille>
  )
}

export default function Departs() {
  const { t, tf, langue } = usePreferences()
  const [params, setParams] = useSearchParams()
  const [onglet, setOnglet] = useState<Onglet>(() => (params.get('onglet') as Onglet | null) ?? ETAT_PROTOTYPE[params.get('etat') ?? ''] ?? 'remettre')
  const lecture = useLecture(() => source.departs.departs(), [])
  const regles = useLecture(() => source.departs.regles(), []).donnees
  const { agir, occupe } = useAgir()
  const maintenant = useMaintenant()
  const destination = useDestination()
  const { avis, annoncer } = useAnnonce()
  const [scan, setScan] = useState('')
  const [feuille, setFeuille] = useState<'valider' | 'absent' | null>(null)
  const [absent, setAbsent] = useState<string | null>(null)
  const d = lecture.donnees

  // La confirmation du livreur arrive par le serveur : on relit tant qu'une sortie validée l'attend.
  const attente = d?.collectes.some((c) => c.valideeA && !c.termineeA)
  useEffect(() => {
    if (!attente) return
    const id = setInterval(lecture.relire, 1500)
    return () => clearInterval(id)
  }, [attente, lecture.relire])
  const confirmee = useRef<string | null>(null)
  useEffect(() => {
    const fin = d?.partis[0]
    if (!fin) return
    if (confirmee.current && confirmee.current !== fin.collecte + fin.le) {
      signal('succes')
      annoncer({ ton: 'ok', texte: tf('Sortie confirmée par le livreur · {n} places libérées', { n: fin.placesLiberees }) })
    }
    confirmee.current = fin.collecte + fin.le
  }, [d?.partis, annoncer, tf])

  const choisir = (o: Onglet) => {
    setOnglet(o)
    const p = new URLSearchParams(params)
    p.set('onglet', o)
    p.delete('etat')
    setParams(p, { replace: true })
    signal('toucher')
  }

  const contenu = () => {
    if (lecture.erreur) return <ErreurLecture erreur={lecture.erreur} relire={lecture.relire} />
    if (!d || !regles) return <Chargement lignes={6} titre="Chargement des départs…" />
    const ouvertes = d.collectes.filter((c) => !c.termineeA && c.colis.length).sort((a, b) => a.heurePrevue - b.heurePrevue)
    const col = ouvertes[0] ?? null
    const ligneDe = (id: string) => d.lignes.find((l) => l.colis.id === id)
    const prevues = col ? col.colis.map(ligneDe).filter((l): l is LigneDepart => !!l) : []
    const sansCollecte = d.lignes.filter((l) => !col || !col.colis.includes(l.colis.id))
    const traites = col ? col.presentes.length + col.absents.length : 0

    const geste = async (type: 'scan' | 'annuler' | 'absent' | 'retrouve', id: string, motif?: MotifAbsence) => {
      if (!col) return
      const r = await agir('sortie', id, (o, s) =>
        type === 'scan' ? s.departs.scanner(col.id, id, o) : type === 'annuler' ? s.departs.annulerScan(col.id, id, o) : type === 'absent' ? s.departs.marquerAbsent(col.id, id, motif!, o) : s.departs.annulerAbsent(col.id, id, o),
      )
      if (!r) return
      if (r.r.ok) {
        signal(type === 'absent' ? 'alerte' : type === 'scan' ? 'succes' : 'toucher')
        if (r.etat === 'en_file') annoncer({ ton: 'file', texte: t('Enregistré sur le téléphone : envoi au retour du réseau.') })
        else if (type === 'absent' && motif === 'introuvable') annoncer({ ton: 'erreur', texte: tf('{ref} introuvable : BelivaY est alerté.', { ref: id }) })
      } else {
        signal('erreur')
        annoncer({ ton: 'erreur', texte: t(REFUS[r.r.raison as RefusDepart] ?? 'Geste refusé.') })
      }
      lecture.relire()
    }
    const scanner = () => {
      const q = scan.trim().toUpperCase().replace(/\s+/g, '')
      if (!q || !col) return
      const l = prevues.find((x) => x.colis.id === q || x.colis.retour?.reference === q)
      setScan('')
      if (!l) {
        signal('erreur')
        annoncer({ ton: 'erreur', texte: d.lignes.some((x) => x.colis.id === q || x.colis.retour?.reference === q) ? t(REFUS.pas_dans_la_collecte) : tf('{ref} n’est pas à faire partir.', { ref: q }) })
        return
      }
      if (col.presentes.includes(l.colis.id)) {
        signal('toucher')
        annoncer({ ton: 'ok', texte: tf('{ref} est déjà tendu au livreur.', { ref: l.colis.id }) })
        return
      }
      void geste('scan', l.colis.id)
    }

    const carte = (
      <div className="p-tybbfp">
        <div className="p-1qyup6">
          <Icone nom="r-camion" taille={26} className="p-v08d0o" />
        </div>
        <div className="p-lmo74g">
          <div className="p-ch33fq">{t('PROCHAINE COLLECTE')}</div>
          <div className="p-fdt7cn">{col ? quand(col.heurePrevue, maintenant(), langue, t) : t('Pas encore prévue')}</div>
          <div className="p-yz5dyd">
            {col
              ? tf('{entreprise} · {livreur} · {n} à remettre', { entreprise: col.entreprise, livreur: col.livreur, n: col.colis.length - col.confirmes.length })
              : d.lignes.length
                ? t('BelivaY groupe vos départs avec le prochain passage d’un livreur.')
                : t('Rien à faire partir pour l’instant.')}
          </div>
        </div>
      </div>
    )

    const remettre = () => (
      <>
        {col ? (
          <div className="p-yi6rkz r6-depart">
            <div className="p-9rmh6y">
              <div className="p-unncbq">
                <h2 className="p-9j1bbu">{t('Scannez en sortie')}</h2>
              </div>
              <span className="p-t8bz1l" aria-label={tf('{n} sur {total} traités', { n: traites, total: col.colis.length })}>
                {tf('{n} / {total}', { n: traites, total: col.colis.length })}
              </span>
            </div>
            {col.valideeA ? (
              <div className="r6-alerte r6-info" role="status">
                <Icone nom="loader-circle" taille={20} />
                <span>{tf('Sortie validée à {h} : {livreur} confirme chaque colis sur son téléphone. Les colis restent au stock jusqu’à sa confirmation.', { h: heure(col.valideeA, langue), livreur: col.livreur })}</span>
              </div>
            ) : (
              <div className="r6-scan">
                <div className="r6-recherche">
                  <Icone nom="scan-barcode" taille={20} />
                  <label htmlFor="r6-scan" className="r6-cache">
                    {t('Étiquette du colis')}
                  </label>
                  <input id="r6-scan" className="r-ref" value={scan} placeholder={t('BLV-… ou RT-…')} autoComplete="off" autoCapitalize="characters" enterKeyHint="done" onChange={(e) => setScan(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && scanner()} />
                </div>
                <button type="button" className="r-btn r-second" onClick={scanner} disabled={!scan.trim() || occupe}>
                  {t('Scanner')}
                </button>
              </div>
            )}
            {prevues.map((l, i) => {
              const fait = col.presentes.includes(l.colis.id)
              const abs = col.absents.find((a) => a.colis === l.colis.id)
              const verrou = !!col.valideeA
              return (
                <div key={l.colis.id} className={abs ? 'r6-absent' : undefined}>
                  {i > 0 && <div className="p-92xvtp" />}
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={fait}
                    aria-disabled={verrou || !!abs ? 'true' : undefined}
                    className="p-2i75mg"
                    onClick={() => (verrou || abs ? signal('erreur') : void geste(fait ? 'annuler' : 'scan', l.colis.id))}
                  >
                    {fait ? (
                      <div className="p-hwk5jv">
                        <Icone nom="check" taille={18} trait={2.4} className="p-q7qjlz" />
                      </div>
                    ) : (
                      <div className="p-a38490" />
                    )}
                    <div className="p-j419vo">{l.colis.emplacement ?? '—'}</div>
                    <div>
                      <div className="p-sj6gna r-ref">{l.colis.retour?.reference ?? l.colis.id}</div>
                      <div className="p-46lk2m">{abs ? tf('Absent · {motif}', { motif: t(ABSENCES.find((a) => a.id === abs.motif)?.libelle ?? '') }) : destination(l)}</div>
                    </div>
                    <span className={MOTIF[l.motif].pill}>{t(MOTIF[l.motif].libelle)}</span>
                  </button>
                  {!verrou && !fait && (
                    <div className="r6-depart-b">
                      {abs ? (
                        <button type="button" className="r6-lien" onClick={() => void geste('retrouve', l.colis.id)}>
                          {tf('Retrouvé : remettre {ref} dans la liste', { ref: l.colis.id })}
                        </button>
                      ) : (
                        <button type="button" className="r6-lien" aria-haspopup="dialog" onClick={() => (setAbsent(l.colis.id), setFeuille('absent'))}>
                          {tf('{ref} absent ?', { ref: l.colis.id })}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            <div className="p-81u2s6">{t('Touchez chaque colis en le tendant au livreur, ou scannez son étiquette. Il confirme sur son téléphone : la garde lui passe.')}</div>
            {!col.valideeA && (
              <div className="r6-cta">
                <button type="button" className="p-ncx7qc" aria-haspopup="dialog" disabled={traites < col.colis.length || !col.presentes.length} aria-describedby="r6-cta-r" onClick={() => (signal('toucher'), setFeuille('valider'))}>
                  <Icone nom="check" taille={18} className="p-7dsggt" />
                  {t('Valider la sortie')}
                </button>
                <span id="r6-cta-r" className="p-81u2s6">
                  {traites < col.colis.length ? tf('Encore {n} colis à scanner ou à marquer absent.', { n: col.colis.length - traites }) : !col.presentes.length ? t('Aucun colis tendu au livreur.') : t('Photo de sortie et PIN demandés.')}
                </span>
              </div>
            )}
          </div>
        ) : null}
        {sansCollecte.length > 0 && (
          <div className="p-yi6rkz">
            <div className="p-unncbq">
              <h2 className="p-9j1bbu">{col ? t('En attente d’une collecte') : t('À faire partir')}</h2>
            </div>
            {sansCollecte.map((l, i) => (
              <div key={l.colis.id}>
                {i > 0 && <div className="p-92xvtp" />}
                <Link to={chemin('colis', { ref: l.colis.id })} className="p-bqlgt9">
                  <div className="p-utsv4v">{l.colis.emplacement ?? '—'}</div>
                  <div className="p-lmo74g">
                    <div className="p-hz5rr5">{l.colis.retour?.reference ?? l.colis.id}</div>
                    <div className="p-t1lapd">
                      {[destination(l), l.depuis ? tf('depuis {d}', { d: quand(l.depuis, maintenant(), langue, t) }) : null, l.enRetard ? tf('en retard (plus de {h} h) : support alerté', { h: regles.alerteH }) : null].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <span className={l.enRetard ? 'p-ekng8o' : MOTIF[l.motif].pill}>{t(l.enRetard ? 'En retard' : MOTIF[l.motif].libelle)}</span>
                </Link>
              </div>
            ))}
            <div className="p-81u2s6">{t('BelivaY les ajoute au prochain passage d’un livreur ; ils restent en tête de liste jusqu’à leur départ.')}</div>
          </div>
        )}
        {!col && !sansCollecte.length && <Vide icone="circle-check" titre="Rien à faire partir" texte={t('Les renvois, retours et transferts paraissent ici dès qu’ils doivent partir.')} />}
      </>
    )

    const collectes = () => (
      <div className="p-yi6rkz">
        <div className="p-unncbq">
          <h2 className="p-9j1bbu">{t('Collectes et livraisons prévues')}</h2>
        </div>
        {d.passages.length ? (
          d.passages.map((p, i) => (
            <div key={p.heure + (p.lot ?? '')}>
              {i > 0 && <div className="p-92xvtp" />}
              <div className="p-o24hsm">
                <div className="p-toppw8">
                  <Icone nom="r-camion" taille={20} className="p-672m16" />
                </div>
                <div className="p-rnqj8n">
                  <div className="p-ife3a2">{tf('{quand} · {entreprise}', { quand: quand(p.heure, maintenant(), langue, t), entreprise: p.entreprise })}</div>
                  <div className="p-dfa05r">{[p.depose ? tf('Dépose {n} colis', { n: p.depose }) : null, p.reprend ? tf('reprend {n} colis', { n: p.reprend }) : null].filter(Boolean).join(' · ')}</div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <Vide icone="r-camion" titre="Aucun passage prévu" texte={t('Les entreprises de livraison choisissent leurs tournées ; les passages paraissent ici dès qu’ils sont prévus.')} />
        )}
        <div className="p-gh7puf">
          <Icone nom="r-couches" taille={18} className="p-672m16" />
          <div>{t('Les entreprises de livraison choisissent leurs tournées ; BelivaY groupe les colis pour qu’un passage serve à la fois à déposer et à reprendre.')}</div>
        </div>
      </div>
    )

    const partis = () => (
      <div className="p-yi6rkz">
        <div className="p-unncbq">
          <h2 className="p-9j1bbu">{t('Partis cette semaine')}</h2>
        </div>
        {d.partis.length ? (
          d.partis.map((p, i) => (
            <div key={p.collecte}>
              {i > 0 && <div className="p-92xvtp" />}
              <div className="p-o24hsm">
                <div className="p-tc472u">
                  <Icone nom="check" taille={20} className="p-q7qjlz" />
                </div>
                <div className="p-rnqj8n">
                  <div className="p-ife3a2">{tf('{quand} · {n} colis', { quand: quand(p.le, maintenant(), langue, t), n: p.colis.length })}</div>
                  <div className="p-dfa05r">
                    {[p.colis.map((c) => `${c.reference} ${t(MOTIF[c.motif].libelle).toLowerCase()}`).join(' · '), tf('confirmés par {livreur}', { livreur: p.livreur }), p.placesLiberees ? tf('{n} places libérées', { n: p.placesLiberees }) : null].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <span className="p-nax3x4">{t('Signé')}</span>
              </div>
            </div>
          ))
        ) : (
          <Vide icone="package-check" titre="Aucun départ cette semaine" texte={t('Les sorties confirmées par le livreur paraissent ici, avec leur motif.')} />
        )}
      </div>
    )

    const transfertS = regles.transfert.S
    const transfertL = regles.transfert.L
    return (
      <>
        <div>
          <h1 className="p-bvhkrl">{t('À faire partir')}</h1>
          <div className="p-t2u0o2">{t('Ce que le livreur emporte : renvois, retours, transferts, refus.')}</div>
        </div>
        {carte}
        <div className="p-lvzt0c" role="tablist" aria-label={t('Départs')}>
          {(
            [
              ['remettre', tf('À remettre {n}', { n: d.lignes.length })],
              ['collectes', t('Collectes')],
              ['partis', t('Partis')],
            ] as [Onglet, string][]
          ).map(([id, libelle]) => (
            <button key={id} id={'r6-d-' + id} type="button" role="tab" aria-selected={onglet === id} aria-controls="r6-d-panneau" className={(onglet === id ? 'p-h01hlk' : 'p-bq7aiq') + ' r6-onglet'} onClick={() => choisir(id)}>
              {libelle}
            </button>
          ))}
        </div>
        <div role="tabpanel" id="r6-d-panneau" aria-labelledby={'r6-d-' + onglet} className="r6-panneau">
          {onglet === 'remettre' ? remettre() : onglet === 'collectes' ? collectes() : partis()}
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">{t('Pourquoi un colis part')}</h2>
          </div>
          {(
            [
              [t('Non retiré en 7 jours'), tf('renvoi le 1er jour ouvert après ; garde retenue ({m} au plus)', { m: francs(regles.gardeRenvoi) })],
              [t('Retour validé déposé'), t('vers le vendeur')],
              [t('Client change de relais'), transfertS === transfertL ? tf('transfert, {m} payés dans son appli', { m: francs(transfertS) }) : tf('transfert, {s} ({l} encombrant) payés dans son appli', { s: francs(transfertS), l: francs(transfertL) })],
              [t('Refus au comptoir'), t('après constat ou annulation')],
              [t('Fermeture déclarée'), t('vers le relais voisin')],
            ] as [string, string][]
          ).map(([a, b]) => (
            <div key={a} className="p-mqmvkk">
              <span className="p-ytl255">{a}</span>
              <span className="p-2vq92h">{b}</span>
            </div>
          ))}
        </div>
        {col && <Valider col={col} regles={regles} ouverte={feuille === 'valider'} fermer={() => setFeuille(null)} fait={(enFile) => (setFeuille(null), annoncer({ ton: enFile ? 'file' : 'ok', texte: enFile ? t('Sortie enregistrée sur le téléphone : envoi au retour du réseau.') : tf('Sortie validée : {livreur} confirme sur son téléphone.', { livreur: col.livreur }) }), lecture.relire())} />}
        <Absent
          colis={absent}
          ouverte={feuille === 'absent'}
          fermer={() => setFeuille(null)}
          choisir={(m) => {
            const id = absent
            setFeuille(null)
            if (id) void geste('absent', id, m)
          }}
        />
      </>
    )
  }
  return (
    <Ecran route="departs" fixes={<Annonce avis={avis} />}>
      <div className="p-0hxmj8 r-pile">{contenu()}</div>
    </Ecran>
  )
}
