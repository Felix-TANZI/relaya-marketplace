// Retrait par le client (PR-05, Guichet 2), refait pour le comptoir réel (file de clients, mains occupées, téléphone
// posé) : SCAN D'ABORD (l'appareil photo s'ouvre ; repli « Saisir le code », gros pavé vérifié au 6e chiffre), puis la
// FICHE du colis (emplacement en grand), la photo de remise et « Remis » (le PIN signe ensuite, ARL-42 gardé par
// DP-69). L'étape suit l'adresse (?remise=<id>&etat=colis|done) : un rechargement ou une coupure reprennent là où le
// gérant en était. Règles :
// - code par colis, jamais vu par le gérant (R66, ARL-01, PR-RC-21) ; 3 codes faux : bloqué 24 h (DP-26) ;
// - garde en espèces, calculée par le serveur, encaissée en une fois au retrait ; remise bloquée tant que
//   l'encaissement n'est pas confirmé (R36) ; billets reçus en touchers rapides, monnaie à rendre en grand ;
//   la carte n'existe pas quand rien n'est dû ;
// - commande à payer au comptoir : articles par Mobile Money seulement, jamais hors ligne (R42, OFF-02) ; le relais
//   n'encaisse jamais le prix d'un article ;
// - « Tout est en ordre » : la demande part d'elle-même dans l'application du client, qui seul confirme (DP-28) ; elle
//   ne bloque pas la remise (sans réponse, la fenêtre de retour reste ouverte) ; « Le client conteste » ouvre un constat
//   au comptoir, déballage photographié (ARL-17, D15) ;
// - photo de remise obligatoire (R66, D15) ; retrait par une autre personne selon R89 EXACTEMENT : nom et numéro saisis
//   par le gérant, client averti dans son application ; pas de pièce, pas de code nominatif.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Feuille, useFeuille } from '@client/composants/Feuille'
import { F } from '@client/i18n/format'
import { Ecran } from '../../composants/coque'
import { PaveCode } from '../../composants/comptoir/PaveCode'
import { ScanComptoir } from '../../composants/comptoir/ScanComptoir'
import '../../composants/comptoir/comptoir.css'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { usePeut } from '../../config/droits'
import { chemin } from '../../config/pages'
import { precharger } from '../../config/routes'
import type { MotifConstat } from '../../donnees/domaines/colis'
import type { RefusRetrait, Remise } from '../../donnees/domaines/retrait'
import { ReseauRequis, geste, origine, useEnLigne } from '../../donnees/fileHorsLigne'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { BandeauCapacite, CasDuComptoir } from './Cas'
import { CLASSES, CarteErreur, ErreurRefus, PrisePhoto, Vignette, arrive, lignesGarde, useRelire } from './commun'
import { REGLES } from './regles'

type Etape = 'colis' | 'done'
const VOISINS = ['pin-remise', 'erreurs', 'litiges', 'messagerie', 'historique', 'stock', 'notifications', 'parametres', 'capacite', 'trust', 'menu', 'accueil', 'reception', 'file', 'fermeture']
const DEMO = import.meta.env.VITE_SOURCE !== 'api'
/** Billets et pièce reçus le plus souvent au comptoir (FCFA). */
const BILLETS = [500, 1000, 2000, 5000, 10000]
interface Refus {
  raison: Parameters<typeof ErreurRefus>[0]['raison']
  detail?: string
}

/** Vérifie un code ou un QR présenté par le client ; ouvre ou complète la remise. */
function useVerifier(remiseId: string | null, ok: (r: Remise) => void) {
  const s = useSession()
  const [refus, setRefus] = useState<Refus | null>(null)
  const [occupe, setOccupe] = useState(false)
  const verifier = async (methode: 'code' | 'qr', valeur: string): Promise<boolean> => {
    setOccupe(true)
    setRefus(null)
    try {
      const r = await source.retrait.verifierCode({ methode, valeur }, remiseId, origine(s.maintenant))
      if (r.ok) {
        signal('codeValide')
        ok(r.remise)
        return true
      }
      signal('codeFaux')
      setRefus({ raison: r.raison, detail: r.detail })
    } catch {
      signal('erreur')
      setRefus({ raison: 'reseau' })
    } finally {
      setOccupe(false)
    }
    return false
  }
  return { refus, setRefus, occupe, verifier }
}

/** Scanner + pavé + erreurs : la saisie du code de retrait, partout la même. */
function BlocCode(p: { remiseId: string | null; ok: (r: Remise) => void; lu?: string | null; consigne?: string; arret?: boolean }) {
  const { t, tf } = usePreferences()
  const s = useSession()
  const [code, setCode] = useState('')
  const v = useVerifier(p.remiseId, (r) => (setCode(''), p.ok(r)))
  const [clients, setClients] = useState<{ colis: string; client: string; classe: 'S' | 'M' | 'L' }[]>([])
  useEffect(() => {
    if (DEMO) void source.retrait.presentables().then(setClients)
  }, [p.remiseId])
  // Code lu par l'appareil photo commun ou la file du comptoir (« retrait?scan= ») : vérifié une fois.
  const dejaLu = useRef<string | null>(null)
  useEffect(() => {
    if (!p.lu || dejaLu.current === p.lu) return
    dejaLu.current = p.lu
    const chiffres = new RegExp(`^\\d{${REGLES.codeLongueur}}$`).test(p.lu)
    void v.verifier(chiffres ? 'code' : 'qr', p.lu)
  }, [p.lu, v])
  const lu = (x: string) => void v.verifier(new RegExp(`^\\d{${REGLES.codeLongueur}}$`).test(x) ? 'code' : 'qr', x)
  return (
    <>
      <ScanComptoir
        arret={p.arret}
        consigne={p.consigne ?? t('Visez le QR que le client montre')}
        lu={lu}
        pave={<PaveCode longueur={REGLES.codeLongueur} valeur={code} changer={(x) => (setCode(x), v.refus && v.setRefus(null))} complet={(x) => void v.verifier('code', x).then((ok) => !ok && setCode(''))} libelle={t('Code de retrait présenté par le client')} occupe={v.occupe} erreur={!!v.refus && v.refus.raison === 'code_faux'} />}
        demo={
          DEMO && clients.length > 0 ? (
            <details className="cpt-repli">
              <summary>{t('Démonstration : le client présente son QR')}</summary>
              <div className="cpt-repli-c">
                {clients.map((c) => (
                  <button
                    key={c.colis}
                    type="button"
                    className="cpt-motif"
                    onClick={async () => {
                      signal('toucher')
                      const q = await source.retrait.simulerPresentation(c.colis)
                      if (q) void v.verifier('qr', q.valeur)
                    }}
                  >
                    <Icone nom="r-qr" taille={18} />
                    <span className="r-grow">{tf('{client} · colis {classe}', { client: c.client, classe: t(CLASSES[c.classe]) })}</span>
                    <span className="cpt-ref pr05-discret">{c.colis}</span>
                  </button>
                ))}
              </div>
            </details>
          ) : undefined
        }
      />
      {v.refus && <ErreurRefus raison={v.refus.raison} detail={v.refus.detail} ressaisir={() => (v.setRefus(null), setCode(''))} maintenant={s.maintenant} />}
    </>
  )
}

// ── Étape 1 : scan ─────────────────────────────────────────────────────────────────────────────────────────────
function EtapeScan({ aller, scan, colis }: { aller: (r: Remise, e: Etape) => void; scan: string | null; colis: string | null }) {
  const { t, tf } = usePreferences()
  // « retrait?ref=BLV-… » (fiche colis) : une commande à payer au comptoir s'ouvre par sa référence (R42).
  const [sansCode, setSansCode] = useState<'cherche' | 'non' | null>(colis ? 'cherche' : null)
  useEffect(() => {
    if (!colis) return
    let vivant = true
    source.retrait
      .rechercher({ reference: colis })
      .then((r) => vivant && (r ? aller(r, 'colis') : setSansCode('non')))
      .catch(() => vivant && setSansCode('non'))
    return () => void (vivant = false)
  }, [colis, aller])
  return (
    <>
      <h1 className="p-bvhkrl">{t('Retrait')}</h1>
      <BandeauCapacite />
      {colis && sansCode === 'non' && <div className="cpt-attente">{tf('Colis {c} : le client présente son code de retrait.', { c: colis })}</div>}
      <div className="cpt-fiche">
        <BlocCode remiseId={null} lu={scan} ok={(r) => aller(r, 'colis')} />
      </div>
      <div className="cpt-pastilles">
        <Link to={chemin('file')} className="cpt-pastille acc">
          <Icone nom="r-pile" taille={16} />
          {t('File du comptoir')}
        </Link>
        <Link to={chemin('litiges', { onglet: 'retour' })} className="cpt-pastille vert">
          <Icone nom="r-annuler" taille={16} />
          {t('Retour déposé')}
        </Link>
      </div>
      <CasDuComptoir />
    </>
  )
}

// ── Fiche du colis (étape 2) ───────────────────────────────────────────────────────────────────────────────────
function Fiche({ r, maintenant }: { r: Remise; maintenant: number }) {
  const prefs = usePreferences()
  const { t, tf } = prefs
  const emplacements = [...new Set(r.colis.map((c) => c.emplacement).filter(Boolean))] as string[]
  return (
    <div className="cpt-fiche">
      <div className="cpt-emp">
        <div>
          <div className="cpt-emp-l">{emplacements.length > 1 ? t('Emplacements') : t('Emplacement')}</div>
          <div className="cpt-emp-v">{emplacements.join(' · ') || t('Comptoir')}</div>
        </div>
        <span className="r-grow" />
        <span className="cpt-pastille vert">{t('Au relais')}</span>
      </div>
      <div className="cpt-ligne-info">
        <strong>{tf('Pour {client}', { client: r.client.prenomInitiale })}</strong>
        <span>·</span>
        <span>{r.colis.length === 1 ? tf('1 colis {classe}', { classe: t(CLASSES[r.colis[0].classe]) }) : tf('{n} colis', { n: r.colis.length })}</span>
        <span>·</span>
        <span>{arrive(prefs, Math.max(...r.colis.map((c) => c.arriveLe ?? 0)) || null, maintenant)}</span>
      </div>
      <div className="cpt-ligne-info">
        {r.colis.map((c) => (
          <span key={c.id} className="cpt-ref">
            {c.id}
            {r.colis.length > 1 ? (c.codeVerifie ? ' ✓' : ' · ' + t('code à présenter')) : ''}
          </span>
        ))}
        {r.colis.some((c) => c.fragile) && <span className="cpt-pastille ambre">{t('Fragile')}</span>}
      </div>
      {r.colis.every((c) => c.codeVerifie) && <span className="p-nax3x4">{t('✓ Code correct')}</span>}
    </div>
  )
}

/** Commande à payer au comptoir (R42) : les articles par Mobile Money, sur le téléphone du client. */
function CartePaiement({ r, relire }: { r: Remise; relire: () => void }) {
  const { t, tf } = usePreferences()
  const s = useSession()
  const enLigne = useEnLigne()
  const [occupe, setOccupe] = useState(false)
  const pay = r.paiement!
  useRelire(pay.etat === 'demande_envoyee', relire)
  useEffect(() => {
    if (pay.etat === 'confirme') signal('encaissement')
  }, [pay.etat])
  const demander = async () => {
    setOccupe(true)
    try {
      const x = await geste(enLigne, 'remise', r.id, origine(s.maintenant), (src) => src.retrait.demanderPaiement(r.id, origine(s.maintenant)), { reseauRequis: true })
      signal(x.r.ok ? 'toucher' : 'erreur')
    } catch (e) {
      if (e instanceof ReseauRequis) signal('erreur')
    } finally {
      setOccupe(false)
      relire()
    }
  }
  const annuler = async () => {
    await source.retrait.annulerPaiement(r.id, origine(s.maintenant))
    relire()
  }
  if (pay.etat === 'confirme')
    return (
      <div className="cpt-ok" role="status">
        <Icone nom="check" taille={18} />
        {tf('Articles payés par Mobile Money · {ref}', { ref: pay.reference ?? '' })}
      </div>
    )
  return (
    <div className="p-yi6rkz">
      <div className="p-unncbq">
        <h2 className="p-9j1bbu">{tf('Articles : {m} F en Mobile Money', { m: F(pay.montant) })}</h2>
      </div>
      <div className="p-ug5qrn">{t('Le client paie sur son téléphone. Jamais d’espèces pour un article.')}</div>
      {!enLigne ? (
        <ErreurRefus raison="reseau_requis" maintenant={s.maintenant} />
      ) : pay.etat === 'a_payer' ? (
        <button type="button" className="cpt-action" disabled={occupe} onClick={() => void demander()}>
          <Icone nom="send" taille={18} />
          {t('Envoyer la demande de paiement')}
        </button>
      ) : pay.etat === 'demande_envoyee' ? (
        <>
          <div className="cpt-attente" role="status">
            <Icone nom="r-telephone" taille={18} />
            {tf('Demande envoyée · {op} MoMo · en attente…', { op: pay.operateur ?? 'MTN' })}
          </div>
          <button type="button" className="cpt-second" onClick={() => void annuler()}>
            {t('Annuler la demande')}
          </button>
          {DEMO && (
            <button type="button" className="cpt-lien" onClick={() => void source.retrait.simulerRefusPaiement(r.id).then(relire)}>
              {t('Démonstration : le client refuse le paiement')}
            </button>
          )}
        </>
      ) : (
        <CarteErreur
          ton="ambre"
          icone="r-carte-paiement"
          titre={pay.etat === 'expire' ? t('Paiement non reçu · renvoyer la demande') : t('Paiement non abouti')}
          actions={
            <div className="p-0cipe3">
              <button type="button" className="p-rbzobc" onClick={() => void annuler()}>
                {t('Annuler')}
              </button>
              <button type="button" className="p-ncx7qc" disabled={occupe} onClick={() => void demander()}>
                {t('Renvoyer la demande')}
              </button>
            </div>
          }
        >
          {tf('Rien n’a été débité. Délai de {n} minutes dépassé ou solde insuffisant.', { n: REGLES.paiementDelaiMin })}
        </CarteErreur>
      )}
    </div>
  )
}

/** Garde en espèces (R36) : montant calculé par le serveur, billets touchés, monnaie à rendre en grand. N'existe pas
 * quand rien n'est dû. */
function CarteGarde({ r, relire }: { r: Remise; relire: () => void }) {
  const prefs = usePreferences()
  const { t, tf, langue } = prefs
  const s = useSession()
  const enLigne = useEnLigne()
  const peut = usePeut('encaisserGarde')
  const [recu, setRecu] = useState(0)
  const [refus, setRefus] = useState<RefusRetrait | null>(null)
  const e = r.garde.encaissement
  const du = r.garde.du
  const rang = Math.max(0, ...r.colis.map((c) => c.rang ?? 0))
  const confirmer = async (valeur: number | null) => {
    setRefus(null)
    const x = await geste(enLigne, 'encaissement', r.id, origine(s.maintenant), (src) => src.retrait.confirmerEncaissement(r.id, valeur, origine(s.maintenant)), { local: true })
    if (x.r.ok) signal('encaissement')
    else (signal('erreur'), setRefus(x.r.raison))
    relire()
  }
  if (e)
    return (
      <div className="cpt-ok" role="status">
        <Icone nom="banknote" taille={18} />
        <span>
          {tf('Garde {m} F encaissée · {par} à {h}', { m: F(e.montant), par: e.par, h: heure(e.le, langue) })}
          {e.recu !== null && e.monnaie > 0 ? ' · ' + tf('monnaie rendue {m} F', { m: F(e.monnaie) }) : ''}
        </span>
      </div>
    )
  const manque = recu > 0 && recu < du
  return (
    <section className="cpt-garde" aria-labelledby="cpt-garde-t">
      <div className="cpt-garde-du">
        <div>
          <div className="cpt-etiquette" id="cpt-garde-t">
            {t('Garde à encaisser en espèces')}
          </div>
          <div className="cpt-garde-m">{F(du)} F</div>
        </div>
        {rang > 0 && <span className="cpt-pastille ambre">{r.colis.length > 1 ? tf('Jour {n} · {c} colis', { n: rang, c: r.colis.length }) : tf('Jour {n} de garde', { n: rang })}</span>}
      </div>
      {!peut ? (
        <p className="cpt-note">{t('Votre compte n’a pas le droit d’encaisser : demandez au gérant.')}</p>
      ) : (
        <>
          <div className="cpt-billets" role="group" aria-label={t('Billets reçus')}>
            <button type="button" className="cpt-billet exact" onClick={() => (signal('toucher'), void confirmer(null))}>
              {t('Compte juste')}
            </button>
            {BILLETS.map((b) => (
              <button key={b} type="button" className="cpt-billet" aria-label={tf('Reçu un billet de {m} F', { m: F(b) })} onClick={() => (signal('toucher'), setRecu((x) => x + b))}>
                +{F(b)}
              </button>
            ))}
          </div>
          {recu > 0 && (
            <>
              <div className="cpt-recu">
                <span>{tf('Reçu : {m} F', { m: F(recu) })}</span>
                <button type="button" className="cpt-lien" onClick={() => setRecu(0)}>
                  {t('Effacer')}
                </button>
              </div>
              <div className={'cpt-monnaie' + (manque ? ' manque' : '')} role="status">
                <span className="cpt-monnaie-l">{manque ? t('Il manque') : t('Monnaie à rendre')}</span>
                <span className="cpt-monnaie-m">{F(manque ? du - recu : recu - du)} F</span>
              </div>
              <button type="button" className="cpt-action vert" disabled={manque} onClick={() => void confirmer(recu)}>
                <Icone nom="banknote" taille={20} />
                {manque ? t('Demandez le complément') : tf('Encaissé · rendre {m} F', { m: F(recu - du) })}
              </button>
            </>
          )}
        </>
      )}
      {!r.garde.dejaReglee && r.garde.detail.length > 0 && (
        <details className="cpt-repli">
          <summary>{t('Détail des jours')}</summary>
          <div className="cpt-repli-c">
            {lignesGarde(prefs, r.garde.detail).map((l, i) => (
              <div key={i} className="cpt-recu">
                <span>{l.libelle}</span>
                <span>{l.valeur}</span>
              </div>
            ))}
            <p className="cpt-note">{t('Garde par colis, jamais plus que sa valeur. Les jours de fermeture déclarée ne comptent pas.')}</p>
          </div>
        </details>
      )}
      {refus && <ErreurRefus raison={refus} maintenant={s.maintenant} />}
    </section>
  )
}

/** Le client renonce : colis en stock, espèces rendues (contre-écriture, PR-RC-31). */
function AnnulerRemise({ r, apres }: { r: Remise; apres: () => void }) {
  const { t, tf } = usePreferences()
  const s = useSession()
  const enLigne = useEnLigne()
  return (
    <>
      <p className="cpt-note">{r.garde.encaissement?.montant ? tf('Rendez {m} F au client. Les colis restent en stock.', { m: F(r.garde.encaissement.montant) }) : t('Les colis restent en stock ; le client peut revenir avec ses codes.')}</p>
      <button type="button" className="cpt-second pr05-danger" onClick={async () => (await geste(enLigne, 'remise', r.id, origine(s.maintenant), (src) => src.retrait.abandonner(r.id, 'abandon', null, origine(s.maintenant)), { local: true }), signal('alerte'), apres())}>
        {t('Annuler la remise')}
      </button>
    </>
  )
}

/** Commande à payer au comptoir refusée sans motif, avant paiement (R42, DP-24) : annulée, signée du PIN. */
function RefusSansMotif({ r, apres }: { r: Remise; apres: () => void }) {
  const { t, tf } = usePreferences()
  const s = useSession()
  const enLigne = useEnLigne()
  const [pin, setPin] = useState('')
  const [faux, setFaux] = useState(false)
  const annuler = async (p: string) => {
    const o = origine(s.maintenant)
    const x = await geste(enLigne, 'remise', r.id, o, (src) => src.retrait.refusSansMotif(r.id, p, o), { local: true })
    if (!x.r.ok) return void (signal('erreur'), setFaux(true), setPin(''))
    signal('alerte')
    apres()
  }
  return (
    <>
      <p className="cpt-note">{tf('La commande est annulée et repart au vendeur ; la livraison payée d’avance n’est pas remboursée. Après {n} refus, le client paie d’avance.', { n: REGLES.refusAvantAvance })}</p>
      {faux && (
        <div className="pr05-alerte" role="alert">
          {t('PIN incorrect')}
        </div>
      )}
      <PaveCode longueur={REGLES.pinLongueur} valeur={pin} changer={(x) => (setPin(x), setFaux(false))} complet={(x) => void annuler(x)} libelle={t('Votre PIN pour annuler la commande')} masque erreur={faux} />
    </>
  )
}

const MOTIFS: { id: MotifConstat; libelle: string }[] = [
  { id: 'non_conforme', libelle: 'Non conforme à la commande' },
  { id: 'abime', libelle: 'Abîmé' },
  { id: 'contrefacon', libelle: 'Contrefaçon' },
]

/** Contestation au comptoir (RET-10, ARL-17, D15) : motif, déballage photographié devant le client, PIN ; pas de remise. */
function Constat({ r, fini }: { r: Remise; fini: () => void }) {
  const { t, tf } = usePreferences()
  const s = useSession()
  const enLigne = useEnLigne()
  const [colis, setColis] = useState<string[]>(r.colis.length === 1 ? [r.colis[0].id] : [])
  const [motif, setMotif] = useState<MotifConstat | null>(null)
  const [photos, setPhotos] = useState<string[]>([])
  const [pin, setPin] = useState('')
  const [refus, setRefus] = useState<string | null>(null)
  const [occupe, setOccupe] = useState(false)
  const pret = colis.length > 0 && !!motif && photos.length >= REGLES.constatPhotos
  const ouvrir = async (p: string) => {
    if (!pret) return
    setOccupe(true)
    setRefus(null)
    let constat: string | null = null
    for (const c of colis) {
      const o = origine(s.maintenant)
      const x = await geste(enLigne, 'constat', c, o, (src) => src.incidents.ouvrirConstat({ colis: c, motif, photos, note: null, devantLeClient: true, pin: p }, o), { local: true, photos: photos.length })
      if (!x.r.ok) {
        signal('erreur')
        setRefus(x.r.raison === 'pin_faux' ? t('PIN incorrect : le constat n’est pas ouvert.') : x.r.raison === 'bloque' ? t('Trop de PIN faux : votre PIN est bloqué un moment. Le colis reste en stock.') : x.r.raison === 'non_constatable' ? t('Ce colis n’est plus en garde : il ne se constate pas au comptoir.') : t('Le constat n’a pas pu être ouvert : réessayez.'))
        setPin('')
        setOccupe(false)
        return
      }
      constat ??= 'id' in x.r ? (x.r.id as string) : null
    }
    await geste(enLigne, 'remise', r.id, origine(s.maintenant), (src) => src.retrait.abandonner(r.id, 'probleme', constat, origine(s.maintenant)), { local: true })
    signal('alerte')
    setOccupe(false)
    fini()
  }
  return (
    <>
      <p className="cpt-note">{t('On ne remet pas. Le colis reste chez vous sans frais, la garde s’arrête jusqu’à la décision de BelivaY.')}</p>
      {r.colis.length > 1 && (
        <div className="cpt-motifs" role="group" aria-label={t('Colis concernés')}>
          {r.colis.map((c) => (
            <button key={c.id} type="button" className="cpt-motif" aria-pressed={colis.includes(c.id)} onClick={() => setColis((l) => (l.includes(c.id) ? l.filter((x) => x !== c.id) : [...l, c.id]))}>
              <span className="cpt-ref">{c.emplacement ?? '—'}</span> {c.id}
            </button>
          ))}
        </div>
      )}
      <div className="cpt-motifs" role="radiogroup" aria-label={t('Motif')}>
        {MOTIFS.map((m) => (
          <button key={m.id} type="button" role="radio" aria-checked={motif === m.id} aria-pressed={motif === m.id} className="cpt-motif" onClick={() => setMotif(m.id)}>
            {t(m.libelle)}
          </button>
        ))}
      </div>
      <div className="pr05-photos pr05">
        {photos.map((p, i) => (
          <Vignette key={p} id={p} libelle={tf('Photo du déballage {n}', { n: i + 1 })} />
        ))}
        <PrisePhoto libelle={t('Photographier le déballage')} classe="cpt-photo" multiple prise={(p) => setPhotos((l) => [...l, p])}>
          <Icone nom="r-appareil-photo" taille={22} />
          {tf('Déballage · {n} sur {min}', { n: photos.length, min: REGLES.constatPhotos })}
        </PrisePhoto>
      </div>
      {refus && (
        <div className="pr05-alerte" role="alert">
          {refus}
        </div>
      )}
      {pret ? <PaveCode longueur={REGLES.pinLongueur} valeur={pin} changer={setPin} complet={(x) => void ouvrir(x)} libelle={t('Votre PIN ouvre le constat')} masque occupe={occupe} erreur={!!refus} /> : <p className="cpt-raison">{t('Choisissez le motif et photographiez le déballage.')}</p>}
    </>
  )
}

/** Une feuille du retrait (« Le client conteste », « Le client renonce », « Refus sans motif », code suivant). */
function FeuilleRetrait({ nom, titre, children }: { nom: string; titre: string; children: (fermer: () => void) => ReactNode }) {
  const f = useFeuille(nom)
  return (
    <Feuille ouverte={f.ouverte} fermer={f.fermer} titre={titre}>
      <div className="cpt-feuille">
        <h2>{titre}</h2>
        {f.ouverte && children(f.fermer)}
      </div>
    </Feuille>
  )
}

function EtapeFiche({ r, relire }: { r: Remise; relire: () => void }) {
  const { t, tf } = usePreferences()
  const s = useSession()
  const enLigne = useEnLigne()
  const aller = useNavigate()
  const [params] = useSearchParams()
  const [photo, setPhoto] = useState<string | null>(r.preuve?.photo ?? null)
  const [nom, setNom] = useState(r.preuve?.nomPorteur ?? '')
  const [tel, setTel] = useState(r.preuve?.telephonePorteur ?? '')
  const [autre, setAutre] = useState(!!r.preuve && r.preuve.porteur !== 'client')
  const [refus, setRefus] = useState<RefusRetrait | null>(null)
  const scanAutre = useFeuille('code-suivant')
  const conteste = useFeuille('conteste')
  const renonce = useFeuille('renonce')
  const refusFeuille = useFeuille('refus-sans-motif')
  // « Tout est en ordre » (DP-28) : la demande part d'elle-même dans l'application du client ; elle ne bloque rien.
  const invite = useRef(false)
  const codesOk = r.colis.every((c) => c.codeVerifie)
  const payeOk = !r.paiement || r.paiement.etat === 'confirme'
  useEffect(() => {
    if (invite.current || !enLigne || r.controle || !codesOk || !payeOk) return
    invite.current = true
    void source.retrait
      .inviterControle(r.id, origine(s.maintenant))
      .then(relire)
      .catch(() => undefined)
  }, [enLigne, r.controle, r.id, codesOk, payeOk, s.maintenant, relire])
  useRelire(r.controle === 'attente_client', relire)
  // Lien ancien « etat=ordre&constat=1 » : la feuille de contestation s'ouvre.
  useEffect(() => {
    if (params.get('constat') === '1' && !conteste.ouverte) conteste.ouvrir()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const especesOk = r.garde.du === 0 || !!r.garde.encaissement
  const tiersOk = !autre || (nom.trim().length >= 2 && tel.replace(/\D/g, '').length >= 8)
  const raison = !payeOk ? t('Le paiement Mobile Money doit être confirmé.') : !codesOk ? t('Chaque colis exige son code.') : !especesOk ? t('Encaissez d’abord la garde.') : !photo ? t('Prenez la photo du colis remis.') : !tiersOk ? t('Saisissez le nom et le numéro de la personne.') : null
  const remettre = async () => {
    if (raison || !photo) return
    setRefus(null)
    const x = await geste(enLigne, 'photo', r.id, origine(s.maintenant), (src) => src.retrait.poserPreuve(r.id, { photo, porteur: autre ? 'tiers' : 'client', nomPorteur: autre ? nom.trim() : null, telephonePorteur: autre ? tel.trim() : null, pieceVerifiee: false }, origine(s.maintenant)), { local: true, photos: 1 })
    if (!x.r.ok) return void (signal('erreur'), setRefus(x.r.raison))
    signal('toucher')
    aller(chemin('pin-remise', { remise: r.id }))
  }
  const manquants = r.colis.filter((c) => !c.codeVerifie).length
  return (
    <>
      <div className="cpt-deux">
        <div className="cpt-feuille">
          <Fiche r={r} maintenant={s.maintenant} />
          {r.paiement && <CartePaiement r={r} relire={relire} />}
          {(manquants > 0 && payeOk) || r.autresColis.length > 0 ? (
            <button type="button" className="cpt-second" onClick={() => (signal('toucher'), scanAutre.ouvrir())}>
              <Icone nom="r-qr" taille={18} />
              {manquants > 0 ? tf('Scanner le code du colis qui manque ({n})', { n: manquants }) : r.autresColis.length === 1 ? tf('1 autre colis pour ce client ({e}) : scanner son code', { e: r.autresColis[0].emplacement ?? '—' }) : tf('{n} autres colis pour ce client : scanner leur code', { n: r.autresColis.length })}
            </button>
          ) : null}
          {(r.garde.du > 0 || r.garde.encaissement) && <CarteGarde r={r} relire={relire} />}
        </div>
        <div className="cpt-feuille">
          {photo ? (
            <div className="pr05-prise pr05">
              <Vignette id={photo} libelle={t('Photo du colis remis')} />
              <div className="r-grow p-ife3a2">{t('Photo du colis remis · prise')}</div>
              <PrisePhoto libelle={t('Reprendre la photo')} classe="p-rbzobc pr05-court" prise={setPhoto}>
                {t('Reprendre')}
              </PrisePhoto>
            </div>
          ) : (
            <PrisePhoto libelle={t('Photo de remise')} classe="cpt-photo" prise={setPhoto}>
              <Icone nom="r-appareil-photo" taille={24} />
              {t('Photo de remise')}
            </PrisePhoto>
          )}
          <details className="cpt-repli" open={autre} onToggle={(e) => setAutre((e.target as HTMLDetailsElement).open)}>
            <summary>
              <Icone nom="r-personne" taille={18} />
              {t('Quelqu’un vient à sa place')}
            </summary>
            <div className="cpt-repli-c">
              <label className="cpt-etiquette" htmlFor="cpt-tiers-nom">
                {t('Nom de la personne')}
              </label>
              <input id="cpt-tiers-nom" className="cpt-champ" value={nom} onChange={(e) => setNom(e.target.value)} autoComplete="off" maxLength={80} />
              <label className="cpt-etiquette" htmlFor="cpt-tiers-tel">
                {t('Son numéro')}
              </label>
              <input id="cpt-tiers-tel" className="cpt-champ" value={tel} onChange={(e) => setTel(e.target.value.replace(/[^\d\s+]/g, ''))} inputMode="tel" autoComplete="off" placeholder="6XX XX XX XX" maxLength={20} />
              <p className="cpt-note">{t('Elle présente le code du client. Le client est averti dans son application.')}</p>
            </div>
          </details>
          {r.controle === 'en_ordre' ? (
            <div className="cpt-ok" role="status">
              <Icone nom="check" taille={18} />
              {t('Le client a confirmé : tout est en ordre')}
            </div>
          ) : r.controle === 'attente_client' ? (
            <div className="cpt-attente" role="status">
              <Icone nom="smartphone" taille={18} />
              {t('Le client peut confirmer « Tout est en ordre » dans son application')}
            </div>
          ) : null}
          <button type="button" className="cpt-action" disabled={!!raison} aria-describedby={raison ? 'cpt-raison' : undefined} onClick={() => void remettre()}>
            <Icone nom="check" taille={22} />
            {t('Remis')}
          </button>
          {raison && (
            <p className="cpt-raison" id="cpt-raison">
              {raison}
            </p>
          )}
          {refus && <ErreurRefus raison={refus} maintenant={s.maintenant} />}
          {!enLigne && r.paiement && r.paiement.etat !== 'confirme' && <ErreurRefus raison="reseau_requis" maintenant={s.maintenant} />}
          <div className="cpt-pastilles">
            <button type="button" className="cpt-pastille ambre" onClick={() => conteste.ouvrir()}>
              <Icone nom="r-balance" taille={16} />
              {t('Le client conteste')}
            </button>
            <button type="button" className="cpt-pastille" onClick={() => renonce.ouvrir()}>
              <Icone nom="r-annuler" taille={16} />
              {t('Le client renonce')}
            </button>
            {r.paiement && r.paiement.etat !== 'confirme' && (
              <button type="button" className="cpt-pastille rouge" onClick={() => refusFeuille.ouvrir()}>
                <Icone nom="r-fermer" taille={16} />
                {t('Refus sans motif')}
              </button>
            )}
          </div>
        </div>
      </div>
      <FeuilleRetrait nom="code-suivant" titre={t('Code du colis suivant')}>
        {(fermer) => <BlocCode remiseId={r.id} ok={() => (fermer(), relire())} consigne={t('Visez le QR du colis suivant')} />}
      </FeuilleRetrait>
      <FeuilleRetrait nom="conteste" titre={t('Le client conteste')}>
        {(fermer) => <Constat r={r} fini={() => (fermer(), setTimeout(relire, 0))} />}
      </FeuilleRetrait>
      <FeuilleRetrait nom="renonce" titre={t('Le client renonce')}>
        {(fermer) => <AnnulerRemise r={r} apres={() => (fermer(), setTimeout(relire, 0))} />}
      </FeuilleRetrait>
      <FeuilleRetrait nom="refus-sans-motif" titre={t('Refus sans motif')}>
        {(fermer) => <RefusSansMotif r={r} apres={() => (fermer(), setTimeout(relire, 0))} />}
      </FeuilleRetrait>
    </>
  )
}

// ── Fin : retiré, ou remise annulée ────────────────────────────────────────────────────────────────────────────
function EtapeFin({ r, suivant }: { r: Remise; suivant: () => void }) {
  const { t, tf } = usePreferences()
  const emplacements = [...new Set(r.colis.map((c) => c.emplacement).filter(Boolean))].join(', ')
  const a = r.annulee
  useEffect(() => {
    signal(a ? 'alerte' : 'succes')
  }, [a])
  return (
    <>
      <div className="p-c1r1yj" role="status">
        <div className={a ? 'p-vhxw8h pr05-rouge' : 'p-vhxw8h'}>
          <Icone nom={a ? 'r-fermer' : 'check'} taille={32} trait={2.6} className={a ? 'p-woejqv' : 'p-q7qjlz'} />
        </div>
        <div className="p-fdt7cn">{a ? t(a.motif === 'probleme' ? 'Constat ouvert : pas de remise' : a.motif === 'pin' ? 'Remise annulée : PIN faux' : a.motif === 'refus' ? 'Commande refusée et annulée' : 'Remise annulée') : r.colis.length > 1 ? tf('{n} colis retirés', { n: r.colis.length }) : t('Colis retiré')}</div>
        <div className="p-uzhe04">
          {a ? (
            <>
              {a.motif === 'refus' ? t('Le colis passe dans « À faire partir » vers le vendeur.') : a.motif === 'probleme' ? t('Le colis reste chez vous, sans frais, jusqu’à la décision de BelivaY.') : tf('Les colis restent en stock ({liste}).', { liste: emplacements || '—' })}{' '}
              {a.especesRendues > 0 ? tf('Rendez {m} F au client.', { m: F(a.especesRendues) }) : ''}
            </>
          ) : (
            <>
              {tf('{emplacements} est libre.', { emplacements: emplacements || '—' })} {r.preuve?.porteur === 'tiers' ? t('Le client est averti dans son application.') : ''}
              {r.gain ? ' ' + (r.gain.garde > 0 ? tf('Vous touchez {c} F + {g} F de garde.', { c: F(r.gain.colis), g: F(r.gain.garde) }) : tf('Vous touchez {c} F.', { c: F(r.gain.colis) })) : ''}
            </>
          )}
        </div>
        {a?.constat && (
          <Link className="p-rbzobc" to={chemin('dossier-litige', { id: a.constat })}>
            {tf('Voir le dossier {id}', { id: a.constat })}
          </Link>
        )}
        <button type="button" className="cpt-action" onClick={suivant}>
          <Icone nom="r-qr" taille={20} />
          {t('Retrait suivant')}
        </button>
      </div>
    </>
  )
}

// ── Écran ──────────────────────────────────────────────────────────────────────────────────────────────────────
export default function Retrait() {
  const { t } = usePreferences()
  const [params, setParams] = useSearchParams()
  const id = params.get('remise')
  const lecture = useLecture(async () => ({ r: id ? await source.retrait.remise(id) : null }), [id])
  const relire = lecture.relire
  const r = lecture.donnees?.r ?? null
  const charge = lecture.donnees !== null
  const allerA = useCallback((x: Remise, e: Etape) => setParams({ remise: x.id, etat: e }), [setParams])
  const suivant = useCallback(() => setParams({}), [setParams])
  // Les écrans que le guichet ouvre se chargent d'avance : une remise hors ligne (ARL-03) doit aller jusqu'au bout.
  useEffect(() => {
    for (const v of VOISINS) void precharger(v)
  }, [])

  let contenu: ReactNode
  if (!id) contenu = <EtapeScan aller={allerA} scan={params.get('scan')} colis={params.get('ref')} />
  else if (lecture.erreur)
    contenu = (
      <CarteErreur ton="ambre" icone="r-reseau" titre={t('Remise impossible à lire')} actions={<button type="button" className="p-v96i0s" onClick={relire}>{t('Réessayer')}</button>}>
        {t('Le téléphone n’arrive pas à joindre le serveur. Vos opérations en attente sont gardées.')}
      </CarteErreur>
    )
  else if (!charge)
    contenu = (
      <div className="p-yi6rkz pr05-chargement" role="status" aria-busy="true">
        {t('Chargement de la remise…')}
      </div>
    )
  else if (!r)
    contenu = (
      <>
        <div className="r-vide" role="status">
          <div className="r-vide-i">
            <Icone nom="package-search" taille={28} />
          </div>
          <h2>{t('Cette remise n’existe plus')}</h2>
          <p>{t('Elle a été terminée ou annulée. Recommencez par le code du client.')}</p>
        </div>
        <button type="button" className="cpt-action" onClick={suivant}>
          {t('Retrait suivant')}
        </button>
      </>
    )
  else if (r.remiseA || r.annulee) contenu = <EtapeFin r={r} suivant={suivant} />
  else contenu = <EtapeFiche r={r} relire={relire} />
  return (
    <Ecran route="retrait">
      <div className="p-0hxmj8 pr05 cpt-feuille">{contenu}</div>
    </Ecran>
  )
}
