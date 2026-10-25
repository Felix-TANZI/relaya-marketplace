// ENT-P16 — Preuves, reprise sur route('preuves') du prototype : tête datée ; à gauche « Missions du jour » (état du
// dossier : complet, en cours, en attente, illisible), « File de revue » (illisible, manquante, en attente au-delà du
// seuil du registre, échéance d'expiration : ENT-P16R-02) et « Preuves complètes par livreur » (RG-R124) ; à droite la
// galerie d'un paquet : en-tête (genre, zone, identifiant, état), gestes (exporter le dossier en PDF journalisé,
// signaler une preuve défectueuse, relancer le livreur), puis la chaîne dans l'ordre (C1 par vendeur, transport, C2
// ou remise à domicile, clôture : ENT-RG-R10, RG-R123), maillon vert / ambre / rouge / gris, paires de photos produit /
// scellé avec étiquette, horodatages du téléphone et du serveur et lieu, heure de validation des codes (jamais leur
// valeur : ENT-02-R08). Une photo à chaque changement de main (DP-63). Joindre un complément (photos seulement) ;
// jamais supprimer, remplacer ni retoucher (ENT-P16R-01, RG-R121) ; rien par WhatsApp (RG-R122).
import { useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Feuille, useFeuille } from '@client/composants/Feuille'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { AucunResultat, Barre, BarrePouce, Compte, correspond, exporterCsv, Hint, Li, Note, Panel, Puces, Px, Recherche, St, Tete, type Ton, useAnnuler } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import { source } from '../../donnees/source'
import type { DossierPreuves, Maillon, Preuve } from '../../donnees/domaines/preuves'
import { usePreferences } from '../../preferences'
import { useHorloge } from '../../session'
import { Avatar, BandeauErreur, Chargement, NOM_GENRE, Retour, Vide, useDonnees, useHeure, useJour } from '../ENT-05/commun'
import { REGLES } from '../../calculs/livraison/regles-ecrans'
import { PARAMETRES } from '../../calculs/registre'
import { Photo, type SujetPhoto } from './Photo'
import { empreinte, pdf, telecharger, type LignePdf } from '../../donnees/exports'
import { geste as faireGeste } from '../../donnees/fileHorsLigne'
import { Visionneuse, type PhotoVue } from './Visionneuse'
import './missions.css'

const ETAT: Record<DossierPreuves['etat'], [string, Ton]> = { complet: ['Complet', 'green'], en_cours: ['En cours', 'acc'], attente: ['En attente', 'amber'], illisible: ['Illisible', 'red'] }
const MAILLON: Record<Maillon['code'], string> = { C1: 'C1 · ramassage', transport: 'Transport', C2: 'C2 · dépôt', domicile: 'Remise à domicile', cloture: 'Clôture' }
const ETAT_MAILLON: Record<Maillon['etat'], [string, string, string]> = { complet: ['Complet', '', 'check'], attente: ['En attente', 'pend', 'cloud-upload'], probleme: ['À revoir', 'bad', 'image-off'], a_venir: ['À venir', 'wait', 'clock'] }
const GENRE: Record<Preuve['genre'], string> = {
  photo_produit: 'Article à découvert',
  photo_scelle: 'Colis scellé et étiqueté',
  code: 'Code validé',
  position: 'Positions de la tournée',
  photo_incident: 'Photo d’incident',
  scan_depot: 'Scan de dépôt',
  photo_remise: 'Photo de remise',
  confirmation: 'Confirmation',
}
const RAISON: Record<string, string> = { illisible: 'Illisible', manquante: 'Manquante', attente_longue: 'En attente trop longtemps' }
const SUJET: Partial<Record<Preuve['genre'], SujetPhoto>> = { photo_produit: 'produit', photo_scelle: 'scelle', photo_incident: 'lieu', photo_remise: 'remise' }
const RESULTAT: Record<string, [string, string]> = { controle: ['Contrôlé', 'ok'], reserve: ['Reçu avec réserve', 'ambre'], refuse: ['Refusé', 'rouge'], absent: ['Absent', 'rouge'] }

function etatPhoto(p: Preuve): 'ok' | 'attente' | 'probleme' | 'avenir' {
  return p.statut === 'rejetee' || p.statut === 'expiree' ? 'probleme' : p.statut === 'en_file' ? 'attente' : p.statut === 'attendue' ? 'avenir' : 'ok'
}
const initiales = (n: string) =>
  n
    .split(' ')
    .map((x) => x[0])
    .slice(0, 2)
    .join('')

/** entB_link : un maillon de la chaîne (pastille, titre, résumé, contenu). */
/** Photo que la visionneuse peut ouvrir : reçue par le serveur (ni attendue, ni encore en file sur le téléphone). */
const visible = (p: Preuve) => !!SUJET[p.genre] && p.statut !== 'attendue' && p.statut !== 'en_file'

function MaillonVue({ m, faire, relancer, livreur, voir }: { m: Maillon; faire(g: 'signaler' | 'completer', p: Preuve | null): void; relancer(): void; livreur: string | null; voir(p: Preuve): void }) {
  const { t, tf } = usePreferences()
  const h = useHeure()
  const jour = useJour()
  const [, cls, ic] = ETAT_MAILLON[m.etat]
  const photos = m.preuves.filter((p) => SUJET[p.genre])
  const autres = m.preuves.filter((p) => !SUJET[p.genre])
  // Paires produit / scellé par étiquette (entB_pairs), puis les autres photos (remise, incident).
  const etiquettes = [...new Set(photos.filter((p) => (p.genre === 'photo_produit' || p.genre === 'photo_scelle') && p.etiquette).map((p) => p.etiquette!))]
  const seules = photos.filter((p) => !(p.genre === 'photo_produit' || p.genre === 'photo_scelle') || !p.etiquette)
  const heures = m.preuves.map((p) => p.le).filter((x): x is number => x !== null)
  const code = m.preuves.find((p) => p.genre === 'code' && p.le)
  const depot = m.preuves.filter((p) => p.genre === 'scan_depot')
  const controles = depot.filter((p) => p.resultat === 'controle').length
  const enFile = m.preuves.filter((p) => p.statut === 'en_file').length
  const parts: string[] = []
  if (m.etat === 'a_venir') parts.push(t('à venir'))
  if (code) parts.push(tf('code validé à {h}', { h: h(code.le!) }))
  if (depot.length) parts.push(tf('{k}/{n} colis contrôlés', { k: controles, n: depot.length }))
  if (etiquettes.length) parts.push(etiquettes.length === 1 ? t('1 colis') : tf('{n} colis', { n: etiquettes.length }))
  if (m.code === 'transport' && heures.length) parts.push(heures.length > 1 ? tf('positions de mission de {a} à {b}', { a: h(Math.min(...heures)), b: h(Math.max(...heures)) }) : tf('positions de mission depuis {a}', { a: h(heures[0]) }))
  else if (photos.length && heures.length > 1) parts.push(tf('photos de {a} à {b}', { a: h(Math.min(...heures)), b: h(Math.max(...heures)) }))
  if (enFile) parts.push(enFile === 1 ? t('1 preuve en file sur le téléphone du livreur') : tf('{n} preuves en file sur le téléphone du livreur', { n: enFile }))
  const probleme = m.preuves.find((p) => p.statut === 'rejetee' || p.statut === 'expiree') ?? null
  const notes = m.preuves.filter((p) => p.signalement || p.complements.length)
  const contenu = etiquettes.length > 0 || seules.length > 0 || autres.length > 0 || probleme || m.etat === 'attente' || notes.length > 0
  return (
    <div className={'entb-chain ' + cls}>
      <div className="entb-ch">
        <span className="dot">
          <Icone nom={ic} taille={15} />
        </span>
        <div className="grow">
          <b>
            {t(MAILLON[m.code])} · {m.lieu}
          </b>
          <div className="t12 c3">{parts.join(' · ')}</div>
        </div>
        {m.etat !== 'complet' && <St t={t(ETAT_MAILLON[m.etat][0])} ton={m.etat === 'probleme' ? 'red' : m.etat === 'attente' ? 'amber' : 'ink'} />}
      </div>
      {contenu && (
        <div className="entb-cb">
          {etiquettes.length > 0 && (
            <div className="entb-pairs">
              {etiquettes.map((e, k) => {
                const prod = photos.find((p) => p.etiquette === e && p.genre === 'photo_produit')
                const sc = photos.find((p) => p.etiquette === e && p.genre === 'photo_scelle')
                return (
                  <div className="entb-pair" key={e}>
                    <div className="photos p2">
                      {prod && <Photo sujet="produit" le={prod.le} recuLe={prod.recuLe} lieu={m.lieu} etiquette={e} etat={etatPhoto(prod)} court={prod.lieu} ouvrir={visible(prod) ? () => voir(prod) : undefined} />}
                      {sc && <Photo sujet="scelle" le={sc.le} recuLe={sc.recuLe} lieu={m.lieu} etiquette={e} etat={etatPhoto(sc)} court={t('scellé')} ouvrir={visible(sc) ? () => voir(sc) : undefined} />}
                    </div>
                    <div className="entb-pcap">
                      <b>{tf('Colis {n}', { n: k + 1 })}</b> · <span className="mono">{e}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {seules.length > 0 && (
            <div className="photos entb-p4" style={etiquettes.length ? { marginTop: 10 } : undefined}>
              {seules.map((p) => (
                <Photo key={p.id} sujet={SUJET[p.genre]!} le={p.le} recuLe={p.recuLe} lieu={m.lieu} etiquette={p.etiquette} etat={etatPhoto(p)} court={p.lieu} ouvrir={visible(p) ? () => voir(p) : undefined} />
              ))}
            </div>
          )}
          {autres.length > 0 && (
            <div className="lv-checks">
              {autres.map((p) => (
                <div className="check" key={p.id}>
                  <span className={'cbx' + (p.statut === 'synchronisee' ? ' on' : p.statut === 'rejetee' || p.statut === 'expiree' ? ' bad' : '')}>{p.statut === 'synchronisee' ? <Icone nom="check" taille={14} /> : p.statut === 'rejetee' || p.statut === 'expiree' ? <Icone nom="x" taille={14} /> : null}</span>
                  <span className="grow">
                    {t(GENRE[p.genre])}
                    {p.etiquette && p.genre !== 'photo_incident' && <span className="mono"> {p.etiquette}</span>}
                    {p.le ? <span className="c3"> · {tf('à {h}', { h: h(p.le) })}</span> : <span className="c3"> · {t('à venir')}</span>}
                    {p.genre === 'code' && p.le && <span className="c3"> · {t('valeur jamais montrée')}</span>}
                    {p.resultat && (
                      <>
                        {' '}
                        <span className={'pill sm ' + RESULTAT[p.resultat][1]}>{t(RESULTAT[p.resultat][0])}</span>
                      </>
                    )}
                    {p.statut === 'en_file' && <span className="pill sm ambre"> {t('En file')}</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
          {notes.map((p) => (
            <div key={'n' + p.id} className="t12 c3 mt6">
              {p.signalement && (
                <div>
                  <Icone nom="flag" taille={13} /> {tf('{g} {e} signalée par {p} le {j} : « {c} »', { g: t(GENRE[p.genre]), e: p.etiquette ?? '', p: p.signalement.par, j: jour(p.signalement.le), c: p.signalement.commentaire })}
                </div>
              )}
              {p.complements.map((c, i) => (
                <div key={i}>
                  <Icone nom="paperclip" taille={13} /> {tf('Complément de {p} ({n} photos) : « {c} »', { p: c.par, n: c.photos, c: c.commentaire })}
                </div>
              ))}
            </div>
          ))}
          {m.etat === 'attente' && (
            <Note ton="amber" icone="wifi-off" className="mt14">
              {tf('Des preuves attendent le réseau du téléphone du livreur ; elles partiront dans l’ordre, avec l’heure et la position d’origine. Au-delà de {r} heures elles passent en revue ; au-delà de {x} heures en file, elles sont expirées : preuve absente.', { r: REGLES.preuveRevueH, x: REGLES.preuveExpireH })}
            </Note>
          )}
          {probleme && (
            <>
              <Note ton="red" icone="image-off" className="mt14">
                <b>{t('Preuve rejetée : illisible.')}</b> {t('Votre entreprise ne peut ni supprimer ni remplacer une photo ; joignez un complément (commentaire et photos) au dossier. Sans complément, la responsabilité suit la règle de la preuve absente.')}
              </Note>
              <div className="btns mt10" style={{ maxWidth: 520 }}>
                <button type="button" className="btn primary" onClick={() => faire('completer', probleme)}>
                  <Icone nom="paperclip" taille={18} />
                  {t('Joindre un complément')}
                </button>
                {livreur && (
                  <button type="button" className="btn secondary" onClick={relancer}>
                    <Icone nom="bell-ring" taille={18} />
                    {tf('Relancer {n}', { n: livreur })}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function Preuves() {
  const { t, tf } = usePreferences()
  const h = useHeure()
  const jour = useJour()
  const [params, setParams] = useSearchParams()
  const tic = useHorloge(30_000)
  const resume = useDonnees(() => source.preuves.resume(), [Math.floor(tic / 30_000)])
  const paquet = params.get('paquet') ?? resume.donnees?.missions[0]?.paquetId ?? ''
  const dossier = useDonnees(() => (paquet ? source.preuves.dossier(paquet) : Promise.resolve(null)), [paquet, Math.floor(tic / 30_000)])
  const feuille = useFeuille('preuve')
  const [geste, setGeste] = useState<'signaler' | 'completer'>('signaler')
  const [cibleId, setCibleId] = useState<string>('')
  const [texte, setTexte] = useState('')
  const [photos, setPhotos] = useState(0)
  const [retour, setRetour] = useState<{ ton: 'ok' | 'rouge' | 'ambre'; texte: string } | null>(null)
  const { differer, enCours, vue } = useAnnuler()
  const [photoVue, setPhotoVue] = useState<string | null>(null)
  // Missions du jour : recherche et filtre « preuves manquantes », gardés dans l'adresse (?q=, ?f=).
  const q = params.get('q') ?? ''
  const filtre = (['toutes', 'manquantes', 'completes'].includes(params.get('f') ?? '') ? params.get('f') : 'toutes') as 'toutes' | 'manquantes' | 'completes'
  const regler = (k: string, v: string, defaut: string) => {
    const p = new URLSearchParams(params)
    if (!v || v === defaut) p.delete(k)
    else p.set(k, v)
    setParams(p, { replace: true })
  }
  const [erreurTexte, setErreurTexte] = useState(false)
  const fichier = useRef<HTMLInputElement>(null)
  const d = dossier.donnees
  const photosDossier = d ? d.maillons.flatMap((m) => m.preuves).filter((p) => SUJET[p.genre] && p.statut !== 'attendue') : []
  const cible = photosDossier.find((p) => p.id === cibleId) ?? photosDossier.find((p) => p.statut === 'rejetee' || p.statut === 'expiree') ?? photosDossier[0] ?? null
  const choisir = (id: string) => {
    const p = new URLSearchParams(params)
    p.set('paquet', id)
    setParams(p, { replace: true })
    // Au téléphone, la galerie est sous la liste : on l'amène à l'écran.
    if (!window.matchMedia('(min-width: 768px)').matches) setTimeout(() => document.getElementById('pr-galerie')?.scrollIntoView({ block: 'start' }), 60)
  }
  const faire = (g: 'signaler' | 'completer', p: Preuve | null) => {
    setGeste(g)
    setCibleId(p?.id ?? '')
    setTexte('')
    setPhotos(0)
    setErreurTexte(false)
    setHorsLignePhotos(false)
    feuille.ouvrir()
  }
  // Gestes de revue : vérifiés ici, montrés faits tout de suite, envoyés après 5 s sauf « Annuler », par la file hors
  // connexion (gardés sans réseau). Des photos jointes ne peuvent pas attendre le réseau : elles exigent la connexion.
  const [horsLignePhotos, setHorsLignePhotos] = useState(false)
  const envoyer = () => {
    if (!cible || !d) return
    if (texte.trim().length < PARAMETRES.saisies.preuveCommentaireMin) return setErreurTexte(true)
    if (geste === 'completer' && photos > 0 && !navigator.onLine) return setHorsLignePhotos(true)
    const id = cible.id
    const g = geste
    const commentaire = texte
    const n = photos
    const paquetId = d.paquetId
    feuille.fermer()
    setRetour(null)
    differer(['pr', g, paquetId, id].join('|'), t(g === 'signaler' ? 'Preuve signalée' : 'Complément joint au dossier'), async () => {
      const r = await faireGeste(g === 'signaler' ? 'Signaler une preuve' : 'Joindre un complément', (s) => (g === 'signaler' ? s.preuves.signaler(id, commentaire) : s.preuves.completer(id, commentaire, n)), paquetId)
      if (r.etat === 'en_file') return setRetour({ ton: 'ambre', texte: t(g === 'signaler' ? 'Signalement gardé sur cet appareil : il partira au retour du réseau.' : 'Complément gardé sur cet appareil : il partira au retour du réseau.') })
      if (!r.r.ok) return setRetour({ ton: 'rouge', texte: tf('Écrivez au moins {n} caractères.', { n: PARAMETRES.saisies.preuveCommentaireMin }) })
      setRetour({ ton: 'ok', texte: t(g === 'signaler' ? 'Preuve signalée : BelivaY la revoit. La preuve d’origine reste intacte.' : 'Complément joint au dossier, à côté de la preuve d’origine.') })
      dossier.relire()
      resume.relire()
    })
  }
  const exporter = async () => {
    if (!d) return
    const e = await source.preuves.exporter(d.paquetId)
    const lignes: LignePdf[] = [
      { texte: tf('Dossier de preuves {p}', { p: d.paquetId }), taille: 15 },
      { texte: tf('{g} · zone {z} · livreur {l}', { g: t(NOM_GENRE[d.genre]), z: d.zone, l: d.livreur?.nom ?? '—' }), espace: 4 },
      { texte: tf('Exporté par {p} le {j} à {h} (export journalisé). Conservé {n} jours.', { p: e.par, j: jour(e.le), h: h(e.le), n: REGLES.conservationPreuvesJ }), espace: 2 },
    ]
    for (const m of d.maillons) {
      lignes.push({ texte: `${t(MAILLON[m.code])} · ${m.lieu} · ${t(ETAT_MAILLON[m.etat][0])}`, taille: 11, espace: 10 })
      for (const p of m.preuves) {
        const sha = p.le ? await empreinte(`${p.id}|${p.le}|${p.lieu}`) : '—'
        lignes.push({ texte: `${t(GENRE[p.genre])}${p.etiquette ? ' ' + p.etiquette : ''} · ${p.le ? tf('téléphone {h}', { h: h(p.le) }) : t('à venir')}${p.recuLe ? ' · ' + tf('serveur {h}', { h: h(p.recuLe) }) : ''} · SHA-256 ${sha}`, taille: 8, espace: 1 })
      }
    }
    lignes.push({ texte: t('Aucune donnée du client. Les valeurs des codes ne figurent jamais dans ce dossier.'), espace: 10 })
    telecharger(pdf(lignes), `dossier-preuves-${d.paquetId}.pdf`)
    setRetour({ ton: 'ok', texte: t('Dossier exporté en PDF ; l’export est noté au journal.') })
  }
  const exporterTableau = async () => {
    if (!d) return
    await source.preuves.exporter(d.paquetId) // l'export est journalisé comme celui du PDF
    const lignes = d.maillons.flatMap((m) => m.preuves.map((p) => [t(MAILLON[m.code]), m.lieu, t(GENRE[p.genre]), p.etiquette ?? '', p.le ? h(p.le) : '', p.recuLe ? h(p.recuLe) : '', p.lieu, p.statut === 'synchronisee' ? t('Reçue') : p.statut === 'en_file' ? t('En file') : p.statut === 'attendue' ? t('À venir') : t('À revoir'), p.signalement ? t('Oui') : '', p.complements.length]))
    exporterCsv(`dossier-preuves-${d.paquetId}.csv`, [t('Maillon'), t('Lieu du maillon'), t('Preuve'), t('Étiquette'), t('Heure du téléphone'), t('Heure du serveur'), t('Lieu'), t('État'), t('Signalée'), t('Compléments')], lignes)
    setRetour({ ton: 'ok', texte: t('Dossier exporté en CSV ; l’export est noté au journal.') })
    dossier.relire()
  }
  const relancer = async () => {
    if (!d) return
    const r = await faireGeste('Relancer le livreur', (s) => s.preuves.relancer(d.paquetId), d.paquetId)
    if (r.etat === 'en_file') return setRetour({ ton: 'ambre', texte: t('Relance gardée sur cet appareil : elle partira au retour du réseau.') })
    setRetour({ ton: 'ok', texte: tf('{n} est relancé à {h} : « Vos preuves ne sont pas encore envoyées. »', { n: d.livreur?.nom ?? '', h: h(r.r.envoyeLe) }) })
  }
  const vues: PhotoVue[] = d
    ? d.maillons.flatMap((m) =>
        m.preuves.filter(visible).map((p) => ({ id: p.id, sujet: SUJET[p.genre]!, titre: `${t(GENRE[p.genre])} · ${t(MAILLON[m.code])}`, le: p.le, recuLe: p.recuLe, lieu: p.lieu || m.lieu, etiquette: p.etiquette, etat: etatPhoto(p) === 'probleme' ? ('probleme' as const) : ('ok' as const) })),
      )
    : []
  const erreur = resume.erreur ?? dossier.erreur
  const aRevoir = new Set(resume.donnees?.revue.map((r) => r.preuve.paquetId) ?? [])
  const manque = (m: { paquetId: string; etat: DossierPreuves['etat'] }) => m.etat === 'attente' || m.etat === 'illisible' || aRevoir.has(m.paquetId)
  const touchees = new Set([...enCours].map((c) => c.split('|')[2]))
  const nColis = d ? new Set(d.maillons.flatMap((m) => m.preuves).map((p) => p.etiquette).filter(Boolean)).size : 0
  const R = resume.donnees
  const cherchees = (R?.missions ?? []).filter((m) => correspond(q, m.paquetId, m.livreur))
  const missionsVues = cherchees.filter((m) => (filtre === 'manquantes' ? manque(m) : filtre === 'completes' ? m.etat === 'complet' : true))
  const nManque = (R?.missions ?? []).filter(manque).length
  const effacerFiltres = () => {
    const p = new URLSearchParams(params)
    p.delete('q')
    p.delete('f')
    setParams(p, { replace: true })
  }
  const versRevue = () => {
    regler('f', 'manquantes', 'toutes')
    setTimeout(() => document.getElementById('pr-missions')?.scrollIntoView({ block: 'start' }), 60)
  }
  return (
    <Ecran route="preuves">
      <Px>
        {erreur && <BandeauErreur erreur={erreur} relire={() => (resume.relire(), dossier.relire())} derniere={resume.derniere} echecs={resume.echecs} />}
        <Tete route="preuves" titre={t('Preuves')} />
        {retour && <Retour ton={retour.ton}>{retour.texte}</Retour>}
        {!R ? (
          <Chargement n={3} />
        ) : (
          <div className="g g12">
            <div>
              <Panel titre={t('Missions du jour')} icone="list-checks" id="pr-missions">
                {R.missions.length > 0 && (
                  <div className="lv-outils">
                    <Recherche q={q} setQ={(v) => regler('q', v, '')} placeholder={t('Paquet ou livreur…')} aria={t('Rechercher une mission')} />
                    <Puces
                      aria={t('Filtrer les dossiers de preuves')}
                      actif={filtre}
                      choisir={(v) => regler('f', v, 'toutes')}
                      items={[
                        { id: 'toutes' as const, t: 'Toutes', n: cherchees.length },
                        { id: 'manquantes' as const, t: 'Preuves manquantes', n: cherchees.filter(manque).length },
                        { id: 'completes' as const, t: 'Complètes', n: cherchees.filter((m) => m.etat === 'complet').length },
                      ]}
                    />
                    <Compte n={missionsVues.length} total={R.missions.length} />
                  </div>
                )}
                {R.missions.length === 0 ? (
                  <Vide icone="list-checks" titre={t('Aucune mission aujourd’hui')} raison={t('Les dossiers de preuves s’ouvrent dès l’affectation d’un livreur.')} />
                ) : missionsVues.length === 0 ? (
                  <AucunResultat effacer={effacerFiltres} texte={filtre === 'manquantes' && !q ? t('Aucune preuve manquante : chaque dossier du jour est complet ou en cours.') : undefined} />
                ) : (
                  missionsVues.map((m) => (
                    <button key={m.paquetId} type="button" className={'entb-mis' + (m.paquetId === paquet ? ' on' : '')} onClick={() => choisir(m.paquetId)} aria-current={m.paquetId === paquet ? 'true' : undefined}>
                      {m.livreur ? <Avatar initiales={initiales(m.livreur)} /> : <Avatar initiales="—" />}
                      <span className="grow">
                        <b className="mono">{m.paquetId}</b>
                        <span>{m.livreur ?? t('Livreur à affecter')}</span>
                      </span>
                      <St t={touchees.has(m.paquetId) ? t('Envoi en cours') : t(ETAT[m.etat][0])} ton={touchees.has(m.paquetId) ? 'acc' : ETAT[m.etat][1]} />
                    </button>
                  ))
                )}
              </Panel>
              <Panel titre={t('File de revue')} icone="search" className="lv-etroit" style={{ marginTop: 16 }} aria="pr-revue">
                <div id="pr-revue">
                  {R.revue.length === 0 ? (
                    <Li icone="circle-check" ton="green" t={t('Aucune preuve à revoir')} s={tf('ni illisible, ni manquante, ni en attente depuis plus de {n} heures', { n: REGLES.preuveRevueH })} />
                  ) : (
                    R.revue.map((r) => (
                      <Li
                        key={r.preuve.id}
                        icone={r.raison === 'attente_longue' ? 'cloud-upload' : 'image-off'}
                        ton={r.raison === 'attente_longue' ? 'amber' : 'red'}
                        t={`${r.preuve.paquetId} · ${t(GENRE[r.preuve.genre]).toLowerCase()} ${t(RAISON[r.raison]).toLowerCase()}`}
                        s={[r.preuve.etiquette, r.preuve.lieu, r.expireLe ? tf('expire le {j} à {h}', { j: jour(r.expireLe), h: h(r.expireLe) }) : null].filter(Boolean).join(' · ')}
                        onClick={() => choisir(r.preuve.paquetId)}
                      />
                    ))
                  )}
                </div>
                <Hint icone="scale">{t('Sans preuve, la responsabilité reste à l’acteur qui tenait le colis ; une preuve jamais synchronisée crée un événement au Trust Score du livreur.')}</Hint>
              </Panel>
              <Panel titre={t('Preuves complètes par livreur')} icone="gauge" style={{ marginTop: 16 }}>
                {R.taux.map((x) => {
                  const p = x.attendues ? Math.round((x.completes / x.attendues) * 100) : null
                  return (
                    <div className="entb-rate" key={x.livreur.id}>
                      <Avatar initiales={x.livreur.initiales} />
                      <div className="grow">
                        <div className="row" style={{ justifyContent: 'space-between' }}>
                          <b>{x.livreur.nom}</b>
                          <b className={p === null ? 'c3' : p === 100 ? 'cg' : p === 0 ? 'cr' : 'ca'}>{p === null ? '—' : tf('{p} %', { p })}</b>
                        </div>
                        {p === null ? (
                          <div className="t12 c3">{t('aucune mission aujourd’hui')}</div>
                        ) : (
                          <>
                            <Barre pct={p} ton={p === 100 ? 'green' : p === 0 ? 'red' : ''} aria={tf('{p} %', { p })} />
                            <div className="t12 c3 mt4">{x.attendues === 1 ? tf('{c} mission complète sur 1', { c: x.completes }) : tf('{c} missions complètes sur {n}', { c: x.completes, n: x.attendues })}</div>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
                <Hint icone="calendar-clock">{t('Aujourd’hui, provisoire : le taux est arrêté en fin de journée.')}</Hint>
              </Panel>
            </div>
            <div>
              <section className="panel entb-galp" aria-labelledby="pr-galerie">
                {!d ? (
                  dossier.donnees === null && paquet && !dossier.erreur ? (
                    <Vide icone="camera-off" titre={t('Aucun dossier pour ce paquet')} raison={t('Les preuves existent dès l’affectation d’un livreur et sont conservées le temps du registre.')}>
                      <Link className="btn secondary" to={chemin('missions')}>
                        {t('Missions et carte')}
                      </Link>
                    </Vide>
                  ) : (
                    <Chargement n={2} />
                  )
                ) : (
                  <div id="pr-galerie">
                    <div className="entb-gh">
                      <div className="grow">
                        <div className="kick acc">
                          {t(NOM_GENRE[d.genre])} · {d.zone}
                        </div>
                        <h2 className="entb-id">{d.paquetId}</h2>
                        <div className="t13 c3 mt4">
                          {[d.livreur?.nom ?? null, nColis ? (nColis === 1 ? t('1 colis') : tf('{n} colis', { n: nColis })) : null, t('preuves dans l’ordre de la chaîne · horodatage serveur et d’origine, position')].filter(Boolean).join(' · ')}
                          {d.exports[0] && ' · ' + tf('dernier export par {p} à {h}', { p: d.exports[0].par, h: h(d.exports[0].le) })}
                        </div>
                      </div>
                      <St t={t(ETAT[d.etat][0])} ton={ETAT[d.etat][1]} />
                    </div>
                    <div className="btns entb-gb">
                      <button type="button" className="btn secondary sm" onClick={exporter}>
                        <Icone nom="file-down" taille={16} />
                        {t('Exporter le dossier (PDF)')}
                      </button>
                      <button type="button" className="btn secondary sm" onClick={exporterTableau}>
                        <Icone nom="file-spreadsheet" taille={16} />
                        {t('Exporter le dossier (CSV)')}
                      </button>
                      {photosDossier.length > 0 && (
                        <button type="button" className="btn secondary sm" onClick={() => faire('signaler', null)}>
                          <Icone nom="flag" taille={16} />
                          {t('Signaler une preuve défectueuse')}
                        </button>
                      )}
                      {d.livreur && d.etat !== 'complet' && (
                        <button type="button" className="btn primary sm" onClick={relancer}>
                          <Icone nom="bell-ring" taille={16} />
                          {tf('Relancer {n}', { n: d.livreur.nom })}
                        </button>
                      )}
                      <Link className="btn ghost sm" to={chemin('paquet', { id: d.paquetId })}>
                        {t('Détail du paquet')}
                      </Link>
                    </div>
                    {d.maillons.map((m) => (
                      <MaillonVue key={m.code + m.lieu} m={m} faire={faire} relancer={relancer} livreur={d.livreur?.nom ?? null} voir={(p) => setPhotoVue(p.id)} />
                    ))}
                    <Hint icone="lock">{tf('Aucune preuve ne peut être supprimée, remplacée, retouchée ni recadrée ; aucune ne passe par WhatsApp. Une photo hors ligne garde l’heure et la position du téléphone. Conservation {n} jours, export pour un dossier.', { n: REGLES.conservationPreuvesJ })}</Hint>
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </Px>
      <Feuille ouverte={feuille.ouverte && !!cible} fermer={feuille.fermer} titre={t(geste === 'completer' ? 'Joindre un complément' : 'Signaler une preuve défectueuse')}>
        <div className="grab"></div>
        {cible && (
          <>
            <h2 className="lv-h2">{t(geste === 'completer' ? 'Joindre un complément' : 'Signaler une preuve défectueuse')}</h2>
            <p className="lv-s">{t(geste === 'completer' ? 'Le complément s’ajoute au dossier sans rien changer à la preuve d’origine. Photos seulement.' : 'BelivaY revoit la preuve avec votre commentaire. Elle n’est jamais supprimée ni remplacée.')}</p>
            <label className="champ">
              <span>{t('Preuve concernée')}</span>
              <select className="lv-ta" style={{ minHeight: 44 }} value={cible.id} onChange={(e) => setCibleId(e.target.value)}>
                {photosDossier.map((p) => (
                  <option key={p.id} value={p.id}>
                    {`${t(GENRE[p.genre])}${p.etiquette ? ' · ' + p.etiquette : ''} · ${p.lieu}${p.le ? ' · ' + h(p.le) : ''}`}
                  </option>
                ))}
              </select>
            </label>
            <label className="champ">
              <span>{t('Commentaire')}</span>
              <textarea className="lv-ta" value={texte} onChange={(e) => (setTexte(e.target.value), setErreurTexte(false))} />
            </label>
            {erreurTexte && <p className="lv-champ-err">{tf('Écrivez au moins {n} caractères.', { n: PARAMETRES.saisies.preuveCommentaireMin })}</p>}
            {horsLignePhotos && <p className="lv-champ-err">{t('Hors connexion, des photos ne peuvent pas attendre le réseau : envoyez le complément une fois connecté, ou retirez les photos pour garder le commentaire seul.')}</p>}
            {geste === 'completer' && (
              <div className="mt10">
                <input ref={fichier} type="file" accept="image/*" multiple hidden onChange={(e) => (setPhotos(e.target.files?.length ?? 0), setHorsLignePhotos(false))} />
                <button type="button" className="btn ghost" onClick={() => fichier.current?.click()}>
                  <Icone nom="image-plus" taille={18} />
                  {photos ? tf('{n} photos choisies', { n: photos }) : t('Ajouter des photos')}
                </button>
                {photos > 0 && (
                  <button type="button" className="btn ghost sm" onClick={() => (setPhotos(0), setHorsLignePhotos(false), fichier.current && (fichier.current.value = ''))}>
                    {t('Retirer les photos')}
                  </button>
                )}
              </div>
            )}
            <div className="btns mt16">
              <button type="button" className="btn primary" onClick={envoyer}>
                {t(geste === 'completer' ? 'Joindre au dossier' : 'Signaler')}
              </button>
              <button type="button" className="btn ghost" onClick={feuille.fermer}>
                {t('Annuler')}
              </button>
            </div>
          </>
        )}
      </Feuille>
      {photoVue && vues.length > 0 && <Visionneuse photos={vues} id={photoVue} aller={setPhotoVue} fermer={() => setPhotoVue(null)} />}
      {vue}
      {R && (
        <BarrePouce>
          <button type="button" className="btn primary" onClick={versRevue}>
            <Icone nom="image-off" taille={18} />
            <span>{nManque > 0 ? tf('À revoir ({n})', { n: nManque }) : t('À revoir')}</span>
          </button>
          {d && (
            <button type="button" className="btn secondary" onClick={exporter}>
              <Icone nom="file-down" taille={18} />
              <span>{t('PDF')}</span>
            </button>
          )}
        </BarrePouce>
      )}
    </Ecran>
  )
}
