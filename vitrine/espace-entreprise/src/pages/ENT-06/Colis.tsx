// ENT-P15 — Colis, reprise sur route('colis') du prototype : tête datée, onglets à ramasser / sous garde / remis (une
// seule file par colis, RG-R117), encadré « qui répond » de la file, tableau (outils : recherche, zone, livreur,
// classe ; pied : nombre, valeur déclarée, plafond), puis trois panneaux : qui répond du colis, alertes et
// incompatibilités, la nuit. Un seul responsable à chaque instant (RG-R119, ENT-RG-R26). Étiquette pré-imprimée et QR
// uniques par colis (DP-63, ENT-PRV-08 : prévue en pointillés, posée au ramassage), classe, valeur déclarée
// (propriétaire et répartiteur : ENT-P15R-03), mentions, boutique, destination (relais, ou quartier du client : aucune
// identité client, RG-R118), livreur, heure du code de remise (jamais le code), durée de garde. Alertes : garde longue
// (ENT-P15R-01), introuvable (ENT-P15R-04), aucun colis chez un livreur la nuit (DED-26, point de stockage).
import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Feuille, useFeuille } from '@client/composants/Feuille'
import { F } from '@client/i18n/format'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { AucunResultat, BarrePouce, Choix, type Colonne, correspond, exporterCsv, Exports, Frise, Hint, Li, normaliser, Panel, Px, Qui, Recherche, Table, Tete, useLarge, Vide } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import { source } from '../../donnees/source'
import type { Colis as UnColis, FileColis } from '../../donnees/domaines/colis'
import { usePreferences } from '../../preferences'
import { useHorloge, useSession } from '../../session'
import { BandeauErreur, Chargement, Montant, Qr, Retour, useDonnees, useDuree, useHeure, useJour } from '../ENT-05/commun'
import { NOM_VEHICULE } from '../ENT-05/Affectation'
import { REGLES } from '../../calculs/livraison/regles-ecrans'
import { geste } from '../../donnees/fileHorsLigne'
import { FeuilleScan, scanPossible } from './Scan'
import './missions.css'

const FILES: { id: FileColis; titre: string; icone: string }[] = [
  { id: 'a_ramasser', titre: 'À ramasser', icone: 'store' },
  { id: 'sous_garde', titre: 'Sous garde', icone: 'shield' },
  { id: 'remis', titre: 'Remis', icone: 'package-check' },
]
// Encadré de la file (entb-resp) : icône, teinte, phrase en gras, suite.
const RESPONSABLE: Record<FileColis, [string, string, string, string]> = {
  a_ramasser: ['store', 'acc', 'Colis des paquets affectés, encore chez le vendeur.', 'Le vendeur en répond jusqu’au code de remise et aux deux photos du livreur ; avant, un colis abîmé ou non conforme est refusé au contrôle, avec photo.'],
  sous_garde: ['shield', 'or', 'Votre entreprise répond de ces colis depuis leur remise par le vendeur', '(code de remise validé), jusqu’au scan de dépôt du gérant ou à la remise au client ; perdu ou abîmé : la valeur payée au vendeur est retenue sur le versement, dans la limite du plafond.'],
  remis: ['package-check', 'green', 'Responsabilité close au dépôt ou à la remise.', 'Au relais, la garde passe au gérant au scan de dépôt confirmé ; à domicile, au code de livraison du client et à la photo de remise. Votre entreprise ne facture ni ne touche jamais de garde au relais.'],
}

function Etiquette({ c }: { c: UnColis }) {
  const { t } = usePreferences()
  return <span className={'entb-lab lv-etq' + (c.posee ? '' : ' entb-plan prevue')} title={c.posee ? undefined : t('Étiquette prévue, posée au ramassage')}>{c.etiquette}</span>
}

function Destination({ c }: { c: UnColis }) {
  const { t, tf } = usePreferences()
  return <>{c.destination.type === 'domicile' ? tf('Client à {q}', { q: c.destination.quartier }) : c.destination.type === 'vendeur' ? tf('Retour à {n}', { n: c.destination.nom ?? '' }) : (c.destination.nom ?? t('Relais'))}</>
}

/** Numéro d'étiquette masqué : seuls les deux derniers chiffres restent lisibles (« BV •• ••01 »). */
const masquer = (e: string) => e.replace(/\d(?=(?:\D*\d){2})/g, '•')

/** QR et code du colis masqués jusqu'au toucher (M20), masqués de nouveau après 30 s ou à la fermeture. */
function QrMasque({ c }: { c: UnColis }) {
  const { t, tf } = usePreferences()
  const [vu, setVu] = useState(false)
  useEffect(() => {
    setVu(false)
  }, [c.etiquette])
  useEffect(() => {
    if (!vu) return
    const m = window.setTimeout(() => setVu(false), 30_000)
    return () => window.clearTimeout(m)
  }, [vu])
  return vu ? (
    <>
      <Qr texte={c.qr} taille={200} libelle={tf('QR unique du colis {e}', { e: c.etiquette })} />
      <p className="lv-etq" style={{ fontSize: '1.25rem' }}>
        {c.etiquette}
      </p>
      <button type="button" className="btn ghost sm" onClick={() => setVu(false)}>
        <Icone nom="eye-off" taille={16} />
        {t('Masquer')}
      </button>
    </>
  ) : (
    <>
      <button type="button" className="lv-qr-masque" onClick={() => setVu(true)}>
        <Icone nom="eye" taille={28} />
        <b>{t('Afficher le QR et le code')}</b>
        <span>{t('Masqués tant que vous ne touchez pas : à ne montrer qu’à la personne qui scanne.')}</span>
      </button>
      <p className="lv-etq" style={{ fontSize: '1.25rem' }} aria-label={t('Numéro masqué')}>
        {masquer(c.etiquette)}
      </p>
    </>
  )
}

export default function Colis() {
  const { t, tf } = usePreferences()
  const h = useHeure()
  const jour = useJour()
  const duree = useDuree()
  const large = useLarge()
  const [params, setParams] = useSearchParams()
  const file = (FILES.find((f) => f.id === params.get('file'))?.id ?? 'sous_garde') as FileColis
  const tic = useHorloge(30_000)
  const l = useDonnees(() => source.colis.file(file), [file, Math.floor(tic / 30_000)])
  const n = useDonnees(() => source.colis.compteurs(), [Math.floor(tic / 30_000)])
  const entreprise = useSession().entreprise
  const nom = entreprise?.nom ?? t('votre entreprise')
  const qr = useFeuille('qr')
  const [choisi, setChoisi] = useState<UnColis | null>(null)
  const [retour, setRetour] = useState<{ ton: 'ok' | 'ambre'; texte: string } | null>(null)
  // Recherche gardée dans l'adresse (?q=) : un scan peut ouvrir la bonne file avec le colis cherché.
  const q = params.get('q') ?? ''
  const setQ = (v: string) => {
    const p = new URLSearchParams(params)
    if (v) p.set('q', v)
    else p.delete('q')
    setParams(p, { replace: true })
  }
  const scan = useFeuille('scan')
  const [zone, setZone] = useState('')
  const [qui, setQui] = useState('')
  const [classe, setClasse] = useState('')
  const versFile = (f: FileColis) => {
    const p = new URLSearchParams(params)
    p.set('file', f)
    p.delete('sheet')
    return '?' + p.toString()
  }
  const relancer = async (c: UnColis) => {
    const g = await geste('Relancer le livreur', (x) => x.colis.relancer(c.etiquette), c.etiquette)
    if (g.etat === 'en_file') return setRetour({ ton: 'ambre', texte: tf('Relance pour {e} gardée sur cet appareil : elle partira au retour du réseau.', { e: c.etiquette }) })
    setRetour({ ton: 'ok', texte: tf('{n} est relancé pour {e} à {h}.', { n: c.livreur?.nom ?? '', e: c.etiquette, h: h(g.r.envoyeLe) }) })
  }
  // Code lu par la caméra ou saisi : le colis est cherché dans les trois files, la bonne s'ouvre avec lui.
  const compact = (x: string) => normaliser(x).replace(/\s/g, '')
  const lu = useCallback(
    async (code: string) => {
      // La feuille se ferme en remplaçant l'entrée courante (sans « sheet ») : pas de retour arrière concurrent.
      const k = compact(code)
      for (const f of FILES) {
        const c = (await source.colis.file(f.id)).find((x) => x.qr === code || compact(x.etiquette) === k || k.includes(compact(x.etiquette)))
        if (c) {
          const p = new URLSearchParams(params)
          p.set('file', f.id)
          p.set('q', c.etiquette)
          p.delete('sheet')
          setParams(p, { replace: true })
          return
        }
      }
      const p = new URLSearchParams(params)
      p.set('q', code)
      p.delete('sheet')
      setParams(p, { replace: true })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [params],
  )
  const voirQr = (c: UnColis) => (setChoisi(c), qr.ouvrir())
  const tous = l.donnees ?? []
  const s = compact(q)
  const liste = tous.filter(
    (c) =>
      (!zone || c.destination.zone === zone) &&
      (!qui || c.livreur?.id === qui) &&
      (!classe || c.classe === classe) &&
      (!s || [c.etiquette, c.paquetId, c.boutique, c.quartier, c.livreur?.nom ?? ''].some((x) => compact(x).includes(s)) || correspond(q, c.etiquette, c.paquetId, c.boutique, c.quartier, c.livreur?.nom)),
  )
  const effacer = () => {
    setZone('')
    setQui('')
    setClasse('')
    setQ('')
  }
  const exporter = () =>
    exporterCsv(
      `colis-${file}-${new Date(tic).toISOString().slice(0, 10)}.csv`,
      [t('Étiquette'), t('Paquet'), t('File'), t('Classe'), t('Valeur déclarée (F)'), t('Boutique'), t('Quartier'), t('Destination'), t('Livreur'), t('Entré dans la file à'), t('Remis à')],
      liste.map((c) => [c.etiquette, c.paquetId, t(FILES.find((f) => f.id === c.file)?.titre ?? c.file), c.classe, c.valeurDeclaree ?? '', c.boutique, c.quartier, c.destination.type === 'domicile' ? tf('Client à {q}', { q: c.destination.quartier }) : (c.destination.nom ?? ''), c.livreur?.nom ?? '', h(c.depuis), c.remisLe ? h(c.remisLe) : '']),
    )
  const zones = [...new Set(tous.map((c) => c.destination.zone))].sort()
  const livreurs = [...new Map(tous.filter((c) => c.livreur).map((c) => [c.livreur!.id, c.livreur!.nom])).entries()]
  const classes = [...new Set(tous.map((c) => c.classe))]
  const alertes = tous.filter((c) => c.alerte)
  const longues = alertes.filter((c) => c.alerte === 'garde_longue')
  const perdus = alertes.filter((c) => c.alerte === 'introuvable')
  const valeur = liste.reduce((x, c) => x + (c.valeurDeclaree ?? 0), 0)
  const valeurVue = liste.some((c) => c.valeurDeclaree !== null)
  const soir = new Date(tic + 3_600_000).getUTCHours() >= REGLES.controleSoirH
  const plafond = entreprise?.plafond ? `${F(entreprise.plafond)} F` : null

  const acts = (
    <Link className="btn secondary sm" to={chemin('missions')}>
      <Icone nom="map" taille={16} />
      {t('Missions et carte')}
    </Link>
  )
  const outils = (
    <>
      <Recherche q={q} setQ={setQ} placeholder={t('Étiquette, paquet, boutique…')} aria={t('Rechercher un colis')} />
      <button type="button" className="btn secondary sm lv-scan-b" onClick={scan.ouvrir} aria-label={t(scanPossible() ? 'Scanner une étiquette' : 'Saisir une étiquette')}>
        <Icone nom="scan-line" taille={16} />
        {t('Scanner')}
      </button>
      <label className={'flt' + (zone ? ' on' : '')}>
        <Icone nom="map-pin" taille={15} />
        <select value={zone} onChange={(e) => setZone(e.target.value)} aria-label={t('Zone')}>
          <option value="">{t('Zone : toutes')}</option>
          {zones.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
      </label>
      <label className={'flt' + (qui ? ' on' : '')}>
        <select value={qui} onChange={(e) => setQui(e.target.value)} aria-label={t('Livreur')}>
          <option value="">{t('Livreur')}</option>
          {livreurs.map(([id, x]) => (
            <option key={id} value={id}>
              {x}
            </option>
          ))}
        </select>
      </label>
      {file !== 'remis' && (
        <label className={'flt' + (classe ? ' on' : '')}>
          <select value={classe} onChange={(e) => setClasse(e.target.value)} aria-label={t('Classe')}>
            <option value="">{t('Classe')}</option>
            {classes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      )}
      <span className="sp"></span>
      <Exports csv={exporter} desactive={liste.length === 0} libelle={t('Exporter les colis de la file')} />
      <span className="lock">
        <Icone nom="eye-off" taille={15} /> {t('Aucune identité client')}
      </span>
    </>
  )
  const actions = (c: UnColis) => (
    <span className="lv-actions">
      {c.missionId && (
        <Link className="lv-act" to={chemin('missions', { mission: c.missionId, sheet: 'mission' })} aria-label={tf('Suivre la mission du colis {e}', { e: c.etiquette })}>
          <Icone nom="map" taille={14} />
          {t('Suivre')}
        </Link>
      )}
      {file === 'sous_garde' && c.livreur && (
        <button type="button" className="lv-act" onClick={() => relancer(c)} aria-label={tf('Relancer le livreur du colis {e}', { e: c.etiquette })}>
          <Icone nom="bell-ring" taille={14} />
          {t('Relancer')}
        </button>
      )}
    </span>
  )
  const cols: Colonne<UnColis>[] = [
    {
      k: 'e',
      t: t('Étiquette'),
      main: true,
      rendu: (c) => (
        <>
          <button type="button" className="lien-pq" onClick={() => voirQr(c)} aria-label={tf('QR du colis {e}', { e: c.etiquette })}>
            <Etiquette c={c} />
          </button>
          <div className="t2">{c.posee ? t('posée et scellée au ramassage') : t('étiquette prévue, posée au ramassage')}</div>
          {c.alerte && <div className="t2 cr b8">{t(c.alerte === 'garde_longue' ? 'Garde longue' : 'Introuvable')}</div>}
        </>
      ),
    },
    { k: 'c', t: t('Classe'), rendu: (c) => <span className={'entb-cls c' + c.classe}>{c.classe}</span> },
    {
      k: 'v',
      t: t('Valeur déclarée'),
      cls: 'r',
      rendu: (c) => (
        <span>
          <b>{c.valeurDeclaree !== null ? <Montant n={c.valeurDeclaree} /> : '—'}</b>
          {c.payableAuRetrait && <div className="t2 cor">{t('payable au retrait')}</div>}
          {c.fragile && <div className="t2 ca">{t('fragile')}</div>}
        </span>
      ),
    },
    {
      k: 'b',
      t: t('Boutique et quartier'),
      rendu: (c) => (
        <span>
          <b>{c.boutique}</b>
          <div className="t2">{c.quartier}</div>
        </span>
      ),
    },
    { k: 'd', t: t('Destination'), rendu: (c) => <Destination c={c} /> },
    { k: 'l', t: t('Livreur'), rendu: (c) => (c.livreur ? <Qui nom={c.livreur.nom} sous={t(NOM_VEHICULE[c.livreur.vehicule])} av={c.livreur.initiales} /> : <span className="pill or sm">{t('À affecter')}</span>) },
    {
      k: 'h',
      t: file === 'sous_garde' ? t('Remis par le vendeur') : t('Chez le vendeur'),
      rendu: (c) => (
        <span>
          {file === 'sous_garde' ? (
            <>
              <b>{c.remisVendeurLe ? h(c.remisVendeurLe) : '—'}</b>
              <div className="t2">{tf('sous garde depuis {d}', { d: duree((tic - c.depuis) / 60_000) })}</div>
            </>
          ) : (
            <>
              <b>{tf('Prêt depuis {h}', { h: h(c.depuis) })}</b>
              <div className="t2">{t('code de remise au ramassage')}</div>
            </>
          )}
          {actions(c)}
        </span>
      ),
    },
    {
      k: 'p',
      t: t('Paquet'),
      hideM: true,
      rendu: (c) => (
        <Link className="entb-pqid sm" to={chemin('preuves', { paquet: c.paquetId })} aria-label={tf('Preuves du paquet {p}', { p: c.paquetId })}>
          {c.paquetId}
        </Link>
      ),
    },
  ]

  // Remis : une ligne par paquet (colis, étiquettes, où, heure, livreur, preuve).
  const paquets = file === 'remis' ? [...new Set(liste.map((c) => c.paquetId))].map((p) => liste.filter((c) => c.paquetId === p)) : []
  const colsRemis: Colonne<UnColis[]>[] = [
    {
      k: 'p',
      t: t('Paquet'),
      main: true,
      rendu: (g) => (
        <>
          <Link className="entb-pqid" to={chemin('preuves', { paquet: g[0].paquetId })}>
            {g[0].paquetId}
          </Link>
          <div className="t2">{g[0].destination.type === 'domicile' ? t('Course domicile') : t('Tournée relais')}</div>
        </>
      ),
    },
    { k: 'n', t: t('Colis'), rendu: (g) => (g.length === 1 ? t('1 colis') : tf('{n} colis', { n: g.length })) },
    {
      k: 'e',
      t: t('Étiquettes'),
      rendu: (g) => (
        <span className="lv-etqs">
          {g.map((c) => (
            <button key={c.etiquette} type="button" className="lien-pq" onClick={() => voirQr(c)} aria-label={tf('QR du colis {e}', { e: c.etiquette })}>
              <Etiquette c={c} />
            </button>
          ))}
        </span>
      ),
    },
    {
      k: 'w',
      t: t('Remis où'),
      rendu: (g) => (
        <span>
          <b>
            <Destination c={g[0]} />
          </b>
          <div className="t2">{g[0].destination.type === 'domicile' ? t('code de livraison et photo') : t('scan de dépôt confirmé par le gérant')}</div>
        </span>
      ),
    },
    {
      k: 'h',
      t: t('Heure'),
      rendu: (g) => (
        <span>
          <b>{g[0].remisLe ? h(g[0].remisLe) : '—'}</b>
          {g[0].remisLe && <div className="t2">{jour(g[0].remisLe)}</div>}
        </span>
      ),
    },
    { k: 'l', t: t('Livreur'), rendu: (g) => (g[0].livreur ? <Qui nom={g[0].livreur.nom} sous={t(NOM_VEHICULE[g[0].livreur.vehicule])} av={g[0].livreur.initiales} /> : '—') },
    {
      k: 'v',
      t: t('Preuve'),
      cls: 'r',
      rendu: (g) => (
        <Link className="btn secondary sm" to={chemin('preuves', { paquet: g[0].paquetId })}>
          <Icone nom="camera" taille={16} />
          {t('Voir la preuve')}
        </Link>
      ),
    },
  ]
  const [ic, ton, gras, suite] = RESPONSABLE[file]
  const filtre = !!(s || zone || qui || classe)
  const vide = filtre && tous.length > 0 ? (
    <AucunResultat effacer={effacer} texte={q ? tf('Aucun colis ne répond à « {q} » dans cette file.', { q }) : undefined} />
  ) : (
    <Vide icone="package" t={t('Aucun colis dans cette file')} s={t(s || zone || qui || classe ? 'Aucun colis ne répond à ces filtres.' : file === 'sous_garde' ? 'Aucun colis n’est sous la garde de vos livreurs en ce moment.' : file === 'a_ramasser' ? 'Aucun colis n’attend un ramassage : acceptez des paquets pour en recevoir.' : 'Aucun colis remis sur la période.')}>
      <div className="btns" style={{ maxWidth: 420, margin: '12px auto 0' }}>
        <Link className="btn secondary" to={chemin('missions')}>
          <Icone nom="map" taille={18} />
          {t('Missions et carte')}
        </Link>
      </div>
    </Vide>
  )
  const nb = liste.length
  return (
    <Ecran route="colis" actions={large ? acts : undefined}>
      <Px>
        {l.erreur && <BandeauErreur erreur={l.erreur} relire={l.relire} derniere={l.derniere} echecs={l.echecs} />}
        <Tete route="colis" titre={t('Colis')} actes={acts} />
        {retour && <Retour ton={retour.ton}>{retour.texte}</Retour>}
        <Choix forme="tabs" aria={t('Files de colis')} actif={file} items={FILES.map((f) => ({ id: f.id, t: t(f.titre), icone: f.icone, n: (n.donnees?.[f.id] ?? 0) > 0 ? n.donnees![f.id] : null, to: versFile(f.id) }))} />
        <div className="entb-resp">
          <span className={'ic ' + ton}>
            <Icone nom={ic} taille={20} />
          </span>
          <div>
            <b>{t(gras)}</b> {t(suite)}
          </div>
        </div>
        <div className="entb-t" style={{ marginTop: 14 }}>
          {!l.donnees ? (
            <div className="dt-wrap" style={{ padding: 16 }}>
              <Chargement n={3} hauteur={56} />
            </div>
          ) : file === 'remis' ? (
            <Table
              cols={colsRemis}
              rows={paquets}
              cle={(g) => g[0].paquetId}
              legende={t('Colis remis')}
              outils={outils}
              vide={vide}
              pied={
                nb > 0 ? (
                  <>
                    <span>{tf('{n} colis remis · historique de la période', { n: nb })}</span>
                    <span>{tf('Preuves conservées {n} jours', { n: REGLES.conservationPreuvesJ })}</span>
                  </>
                ) : undefined
              }
            />
          ) : (
            <Table
              cols={cols}
              rows={liste}
              cle={(c) => c.etiquette}
              ligneCls={(c) => (c.alerte ? 'bad' : undefined)}
              legende={t(FILES.find((f) => f.id === file)!.titre)}
              outils={outils}
              vide={vide}
              pied={
                nb > 0 ? (
                  <>
                    <span>
                      <b>{file === 'sous_garde' ? tf('{n} colis sous la garde de {e}', { n: nb, e: nom }) : tf('{n} colis à ramasser', { n: nb })}</b>
                      {valeurVue && <> · {tf('valeur déclarée totale {v} F', { v: F(valeur) })}</>}
                      {file === 'sous_garde' ? <> · {plafond ? tf('chacun sous le plafond de {p}', { p: plafond }) : t('sans plafond par colis')}</> : <> · {t('responsabilité du vendeur jusqu’au code de remise')}</>}
                    </span>
                    <span>{file === 'sous_garde' ? t('Un seul responsable par colis à chaque instant') : t('Temps réel')}</span>
                  </>
                ) : undefined
              }
            />
          )}
        </div>
        <div className="g g3">
          <Panel titre={t('Qui répond du colis')} icone="shield-check">
            <Frise
              items={[
                { t: t('Vendeur'), d: t('jusqu’au code de remise et aux 2 photos du contrôle'), st: file === 'a_ramasser' ? 'cur' : 'done' },
                { t: nom, d: t('du code de remise au scan de dépôt ou au code de livraison'), st: file === 'sous_garde' ? 'cur' : file === 'remis' ? 'done' : '' },
                { t: t('Relais ou client'), d: t('garde au relais (scan de dépôt confirmé) ou remise au client (code de livraison et photo)'), st: file === 'remis' ? 'cur' : '' },
              ]}
            />
            <Hint icone="camera">{t('Chaque changement de main exige une photo : sans elle, l’étape reste bloquée et la responsabilité reste à celui qui tenait le colis.')}</Hint>
          </Panel>
          <Panel titre={t('Alertes et incompatibilités')} icone="bell" className="lv-etroit">
            <Li
              icone="clock"
              ton={longues.length ? 'red' : 'green'}
              t={tf('Sous garde depuis plus de {h} h', { h: REGLES.gardeH })}
              s={longues.length ? `${longues.map((c) => c.etiquette).join(', ')} · ${t('signalé à votre entreprise et à l’opérateur de zone')}` : t('aucun colis · signalé à votre entreprise et à l’opérateur de zone')}
            />
            <Li
              icone="search"
              ton={perdus.length ? 'red' : 'green'}
              t={tf('Introuvable depuis plus de {h} h', { h: REGLES.introuvableH })}
              s={perdus.length ? `${perdus.map((c) => c.etiquette).join(', ')} · ${t('enquête ouverte : dernière preuve, dernière position')}` : t('aucun colis · sinon enquête : dernière preuve, dernière position')}
            />
            <Li icone="ruler" ton="green" t={t('Classe, plafond, véhicule')} s={t('XL et hors gabarit ne vont jamais au relais ; aucun colis ne change de main sans scan')} />
          </Panel>
          <Panel titre={t('La nuit')} icone="moon" className="lv-etroit">
            <Li icone="warehouse" ton="acc" t={t('Point de stockage déclaré')} s={REGLES.pointStockage} />
            <Li icone="moon" ton="ink" t={t('Jamais chez un livreur')} s={tf('à {h} h, chaque colis encore sous garde est au point de stockage ou au relais', { h: REGLES.controleSoirH })} />
            {soir && (n.donnees?.sous_garde ?? 0) > 0 && <Retour ton="ambre">{tf('{n} colis encore sous garde après {h} h : déposez-les au point de stockage.', { n: n.donnees!.sous_garde, h: REGLES.controleSoirH })}</Retour>}
          </Panel>
        </div>
      </Px>
      <Feuille ouverte={qr.ouverte && !!choisi} fermer={qr.fermer} titre={t('Code et QR du colis')}>
        <div className="grab"></div>
        {choisi && (
          <div style={{ display: 'grid', justifyItems: 'center', gap: 10, textAlign: 'center' }}>
            <h2 className="lv-h2">{t('Code et QR du colis')}</h2>
            <QrMasque c={choisi} />
            <p className="lv-s">{t(choisi.posee ? 'Posé et scellé au ramassage, lié à une seule commande pour toujours. Scanné à chaque changement de main.' : 'Étiquette prévue : elle sera posée et scellée devant le vendeur au ramassage.')}</p>
            <div className="btns">
              {choisi.posee && (
                <Link className="btn secondary" to={chemin('preuves', { paquet: choisi.paquetId })}>
                  <Icone nom="camera" taille={18} />
                  {t('Preuve')}
                </Link>
              )}
            </div>
            <p className="lv-note">
              <Icone nom="key-round" taille={16} />
              <span>{t('Les codes de remise, de dépôt et de livraison ne sont jamais montrés à l’entreprise : seule l’heure de leur validation l’est.')}</span>
            </p>
          </div>
        )}
      </Feuille>
      <FeuilleScan ouverte={scan.ouverte} fermer={scan.fermer} lu={lu} />
      <BarrePouce>
        <button type="button" className="btn primary" onClick={scan.ouvrir}>
          <Icone nom="scan-line" taille={18} />
          <span>{t('Scanner')}</span>
        </button>
        <Link className="btn secondary" to={chemin('missions')}>
          <Icone nom="map" taille={18} />
          <span>{t('Missions')}</span>
        </Link>
      </BarrePouce>
    </Ecran>
  )
}
