// Écran « Devenir vendeur » (CL-13, 9.6), balisage et logique du prototype du 1er octobre (route devenir-vendeur),
// repris à la main et rendu logique (DP-53) :
// - sans boutique : nom (proposé d'après le prénom et la catégorie, modifiable ; 3 à 40 caractères, unique),
//   catégorie principale, particulier ou entreprise ; le numéro vérifié du compte sert aussi pour la boutique ;
//   « Ouvrir ma boutique » l'ouvre vraiment ;
// - avec une boutique : son nom, les étapes faites, l'état de la pièce d'identité (lu dans les données : aucune,
//   envoyée, vérifiée, refusée), le lien vendeur (copié pour de vrai) ; la pièce se donne dans l'espace vendeur ;
// - « ?st=envoyee|piece|verifiee|refusee|ouvrir » : les états du prototype (aperçus), avec la boutique du compte,
//   sinon celle du prototype.
// - DP-54 : ce qu'un futur vendeur doit savoir, sous l'en-tête : ce qu'il lui faut (numéro, pièce, photos, nom),
//   quand et comment il est payé (registre LIB-STD, LIB-OR, LIB-CARTE, VERSEMENT-JOUR ; CAL-29, CCY-10), et les
//   règles qui le touchent (anonymat, ramassage, rupture, notes). Le taux de commission ne s'affiche jamais côté
//   client : l'espace vendeur le montre sur chaque produit.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import img_32eb64e58d50_jpg from '../../assets/prototype/32eb64e58d50.jpg'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { chemin } from '../../config/pages'
import { source, type Boutique, type EtatPiece, type ResultatBoutique } from '../../donnees/source'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { Bloc, EcranCompte } from './Larges'

const CATEGORIES = [
  { nom: 'Mode femme', mot: 'Mode' },
  { nom: 'Beauté & santé', mot: 'Beauté' },
  { nom: 'Maison & cuisine', mot: 'Maison' },
  { nom: 'Téléphones', mot: 'Téléphones' },
]
// La boutique du prototype (aperçus sans boutique ouverte).
const EXEMPLE: Boutique = { nom: 'Carine Mode', categorie: 'Mode femme', type: 'particulier', code: 'KRN-4821', piece: 'aucune' }
const PIECES: Record<string, EtatPiece> = { envoyee: 'aucune', piece: 'envoyee', verifiee: 'verifiee', refusee: 'refusee' }
const REFUS: Record<Exclude<ResultatBoutique, { ok: true }>['raison'], string> = {
  'nom-court': 'Donne un nom d’au moins 3 caractères à ta boutique.',
  'nom-long': 'Le nom de ta boutique tient en 40 caractères au plus.',
  'nom-pris': 'Ce nom est déjà pris : choisis-en un autre.',
  numero: 'Vérifie d’abord ton numéro : il sert aussi pour ta boutique.',
}

const ETAPES = [
  { titre: 'Boutique ouverte', texte: 'Nom et catégorie : 1 minute, depuis ton compte client.' },
  { titre: 'Ajoute tes produits', texte: 'Dans ton espace vendeur : photos, prix, stock. Organise ta boutique comme tu veux.' },
  {
    titre: 'Vérifie ta pièce',
    texte: 'Quand tu es prête : carte d’identité recto et verso, puis un selfie vidéo avec ta pièce. Réponse en 15 minutes en général, 48 h ouvrées au plus.',
  },
  { titre: 'Tu vends', texte: 'Tes produits deviennent visibles et achetables par les clients.' },
]

// Libération et versement (registre, décidé) : argent libéré LIB-STD jours après la fermeture du retour (Or et
// Platine : LIB-OR ; client payé par carte : LIB-CARTE), versé automatiquement le vendredi ; le retour ferme
// RETOUR-JOURS après le retrait, ou plus tôt sur « Tout est en ordre » ; un litige suspend.
const LIB = { std: 3, or: 1, carte: 14 }
const RETOUR_JOURS = 7
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
// Exemple calculé : un colis retiré un lundi (jour 1) ; le versement tombe le premier vendredi après la libération.
function exempleVersement() {
  const retrait = 1
  const ferme = retrait + RETOUR_JOURS
  const libere = ferme + LIB.std
  const verse = libere + ((5 - (libere % 7) + 7) % 7)
  return { retrait: JOURS[retrait % 7], ferme: JOURS[ferme % 7], libere: JOURS[libere % 7], verse: JOURS[verse % 7], jours: verse - retrait }
}

// Ce qu'il faut, l'argent, les règles : les mêmes avant et après l'ouverture de la boutique.
function AConnaitre() {
  const { t, tf } = usePreferences()
  const x = exempleVersement()
  const ligne = (icone: string, titre: string, sous: string) => (
    <div className="li" key={titre}>
      <span className="ic">
        <Icone nom={icone} taille={20} />
      </span>
      <span className="grow">
        <span className="lt" style={{ display: 'block' }}>
          {t(titre)}
        </span>
        <span className="ls" style={{ display: 'block' }}>
          {t(sous)}
        </span>
      </span>
    </div>
  )
  const kv = (k: string, v: string) => (
    <div className="kv" key={k}>
      <span className="k">{t(k)}</span>
      <span className="v">{t(v)}</span>
    </div>
  )
  return (
    <>
      <div className="sec">
        <h2>{t('Ce qu’il te faut')}</h2>
      </div>
      <div className="card tight">
        {ligne('smartphone', 'Ton numéro vérifié', 'Celui de ton compte client : pas de nouveau mot de passe.')}
        {ligne('store', 'Un nom de boutique', 'De 3 à 40 caractères, pas déjà pris par une autre boutique.')}
        {ligne('camera', 'Des photos nettes de tes produits', 'Avec le prix et le stock réels : un produit en rupture fait perdre la vente.')}
        {ligne('id-card', 'Ta carte d’identité, avant ta première vente', 'Recto et verso, puis un selfie vidéo avec ta pièce. Réponse en 15 minutes en général, 48 h ouvrées au plus.')}
      </div>
      <div className="sec">
        <h2>{t('Ton argent')}</h2>
      </div>
      <div className="card">
        {kv('Ouvrir ta boutique', '0 F')}
        {kv('Commission', 'Sur chaque vente, selon la catégorie')}
        {kv('Argent libéré', tf('{n} jours après la fin du retour', { n: LIB.std }))}
        {kv('Vendeur Or ou Platine', tf('{n} jour après la fin du retour', { n: LIB.or }))}
        {kv('Client payé par carte', tf('{n} jours après la fin du retour', { n: LIB.carte }))}
        {kv('Versement', 'Chaque vendredi, automatique')}
        {kv('Frais de versement', 'Aucun, sans minimum')}
        <p className="t12 c3" style={{ margin: '8px 0 0', lineHeight: 1.45 }}>
          {tf('Fin du retour : {n} jours après le retrait, ou plus tôt si le client confirme « Tout est en ordre ». Un litige suspend l’argent de ce colis jusqu’à la décision.', { n: RETOUR_JOURS })}
        </p>
        <p className="t12 c3" style={{ margin: '6px 0 0', lineHeight: 1.45 }}>
          {tf('Exemple : colis retiré un {r}, retour fermé le {f} suivant, argent libéré le {l}, versé le {v} ({j} jours).', { r: t(x.retrait), f: t(x.ferme), l: t(x.libere), v: t(x.verse), j: x.jours })}
        </p>
        <p className="t12 c3" style={{ margin: '6px 0 0', lineHeight: 1.45 }}>
          {t('Le taux exact de ta catégorie s’affiche dans ton espace vendeur, sur chaque produit, avant sa mise en vente.')}
        </p>
      </div>
      <details className="more">
        <summary>
          <Icone nom="info" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">{t('Les règles à connaître')}</span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b">
          <p>{t('Le client paie d’abord à BelivaY : son argent est bloqué jusqu’au retrait, puis jusqu’à la fin du retour. Tu ne prends aucun risque d’impayé, et jamais d’espèces.')}</p>
          <p>{t('Un livreur BelivaY passe ramasser tes colis ; le client retire au relais avec son code. Tu n’as rien à livrer toi-même.')}</p>
          <p>{t('Ton numéro reste caché aux clients ; dans les avis et sur les factures, tu apparais comme « le vendeur ».')}</p>
          <p>{t('Produit en rupture après la commande : la commande passe à un autre vendeur, et la vente est perdue pour toi. Garde ton stock à jour.')}</p>
          <p>{t('Les notes des clients nourrissent ton Trust Score (Bronze, Argent, Or, Platine) : les vendeurs Or et Platine sont payés plus vite.')}</p>
          <p>{t('Les commandes de ta boutique se gèrent dans l’espace vendeur, une application à part, avec le même numéro.')}</p>
        </div>
      </details>
    </>
  )
}

// Les quatre étapes ; « faites » : combien sont faites, la suivante est en cours (aucune avant l'ouverture).
function Etapes({ faites }: { faites: number }) {
  const { t } = usePreferences()
  return (
    <div className="vd-tl">
      {ETAPES.map((e, i) => (
        <div key={e.titre} className={i < faites ? 'ok' : i === faites ? 'run' : ''}>
          <i>{i < faites ? <Icone nom="check" taille={15} trait={3} /> : t(String(i + 1))}</i>
          <p style={{ margin: '0' }}>
            <b>{t(e.titre)}</b>
            <span>{t(e.texte)}</span>
          </p>
        </div>
      ))}
    </div>
  )
}

function Formulaire({ ouverte }: { ouverte: (b: Boutique) => void }) {
  const { t } = usePreferences()
  const session = useSession()
  const [categorie, setCategorie] = useState(CATEGORIES[0].nom)
  const [type, setType] = useState<'particulier' | 'entreprise'>('particulier')
  const prenom = session.client?.prenom ?? ''
  const propose = (c: string) => [prenom, CATEGORIES.find((x) => x.nom === c)?.mot].filter(Boolean).join(' ')
  const [nom, setNom] = useState<string | null>(null) // null : le nom proposé, qui suit la catégorie
  const [refus, setRefus] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const valeur = nom ?? propose(categorie)
  const numero = session.client?.numeroMasque
  const ouvrir = async () => {
    if (envoi) return
    setEnvoi(true)
    const r = await source.ouvrirBoutique({ nom: valeur, categorie, type })
    setEnvoi(false)
    if (r.ok) ouverte(r.boutique)
    else setRefus(REFUS[r.raison])
  }
  const puce = (c: string) => (
    <a key={c} href="#" className={'chip' + (categorie === c ? ' on' : '')} aria-pressed={categorie === c} onClick={(e) => (e.preventDefault(), setCategorie(c))}>
      {t(c)}
    </a>
  )
  return (
    <>
      <section className="vd-hero">
        <span className="k">{t('ESPACE VENDEUR')}</span>
        <h1>{t('Vends sur BelivaY')}</h1>
        <p>{t('Ouvre ta boutique en 1 minute et ajoute tes produits tout de suite. Ta pièce d’identité, tu la donnes plus tard, avant de vendre.')}</p>
        <div className="vd-perks">
          <div>
            <b>{t('0 F')}</b>
            {t('pour ouvrir ta boutique')}
          </div>
          <div>
            <b>{t('Payé')}</b>
            {t('après chaque retrait, sans risque')}
          </div>
          <div>
            <b>{t('Relais')}</b>
            {t('qui remettent tes colis')}
          </div>
        </div>
      </section>
      <Bloc classe="c13-vd">
      <Bloc classe="c13-k">
      <div className="card mt12">
        <div className="kick">{t('Ta boutique')}</div>
        <div className="fld">
          <label htmlFor="vd-nom">{t('Nom de la boutique')}</label>
          <div className={'inp' + (refus && refus !== REFUS.numero ? ' err' : '')}>
            <Icone nom="store" taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
            <input id="vd-nom" value={valeur} maxLength={40} autoComplete="organization" onChange={(e) => (setNom(e.target.value), setRefus(null))} />
          </div>
          {refus && (
            <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
              {t(refus)}
            </div>
          )}
        </div>
        <div className="t13 b7 mt12">{t('Catégorie principale')}</div>
        <div className="chips">{CATEGORIES.map((c) => puce(c.nom))}</div>
        <div className="t13 b7 mt12">{t('Tu vends en tant que')}</div>
        <div className="seg">
          {(['particulier', 'entreprise'] as const).map((x) => (
            <a key={x} href="#" className={type === x ? 'on' : ''} aria-pressed={type === x} onClick={(e) => (e.preventDefault(), setType(x))}>
              {t(x === 'particulier' ? 'Particulier' : 'Entreprise')}
            </a>
          ))}
        </div>
        <div className="li" style={{ padding: '12px 0 0' }}>
          <span className="ic green">
            <Icone nom="smartphone" taille={19} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t((numero ?? '') + ' · vérifié')}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {t('Ton numéro client sert aussi pour ta boutique')}
            </span>
          </span>
        </div>
      </div>
      <div className="vd-idp mt12" style={{ padding: '12px', borderRadius: '18px', background: 'var(--card)', boxShadow: 'var(--shadow-card)' }}>
        <img src={img_32eb64e58d50_jpg} alt="" />
        <p className="t13 c3" style={{ margin: '0' }}>
          <b style={{ color: 'var(--ink)' }}>{t('Pas de pièce d’identité maintenant.')}</b>
          {t(' Tu la donneras depuis ton espace vendeur, avant ta première vente.')}
        </p>
      </div>
      <div className="btns mt16">
        <a href={chemin('devenir-vendeur', { st: 'envoyee' })} className="btn primary" aria-disabled={envoi || undefined} onClick={(e) => (e.preventDefault(), ouvrir())}>
          <Icone nom="store" taille={18} />
          <span>{t('Ouvrir ma boutique')}</span>
        </a>
      </div>
      <p className="cl03-legal" style={{ textAlign: 'center', fontSize: '12.5px', color: 'var(--ink-3)', lineHeight: '1.45', margin: '10px 8px 0' }}>
        {t('En ouvrant ta boutique, tu acceptes les ')}
        <Link to={chemin('legal')} className="cor b7">
          {t('conditions vendeur')}
        </Link>
        {t(' et la commission de BelivaY.')}
      </p>
      </Bloc>
      <Bloc classe="c13-k c13-vda">
      <div className="dx-h">
        <b>{t('Comment ça se passe')}</b>
      </div>
      <div className="card ">
        <Etapes faites={0} />
      </div>
      <AConnaitre />
      </Bloc>
      </Bloc>
    </>
  )
}

function MaBoutique({ b }: { b: Boutique }) {
  const { t, tf } = usePreferences()
  const [copie, setCopie] = useState(false)
  const lien = `vendeur.belivay.com/b/${b.code}`
  const copier = async () => {
    try {
      await navigator.clipboard.writeText('https://' + lien)
      setCopie(true)
      setTimeout(() => setCopie(false), 2000)
    } catch {
      // Presse-papiers refusé : le lien reste affiché, à sélectionner.
    }
  }
  const p = b.piece
  const note =
    p === 'aucune' ? (
      <div className="note green">
        <Icone nom="store" taille={18} />
        <div>
          <b>{tf('Ta boutique « {nom} » est ouverte.', { nom: b.nom })}</b>
          {t(' Ajoute tes produits dès maintenant dans ton espace vendeur.')}
        </div>
      </div>
    ) : p === 'envoyee' ? (
      <div className="note or">
        <Icone nom="clock" taille={18} />
        <div>
          <b>{t('Pièce envoyée.')}</b>
          {t(' Réponse en 15 minutes en général, 48 h ouvrées au plus. Tu continues d’ajouter tes produits en attendant.')}
        </div>
      </div>
    ) : p === 'verifiee' ? (
      <div className="note green">
        <Icone nom="badge-check" taille={18} />
        <div>
          <b>{t('Pièce vérifiée.')}</b>
          {t(' Tes produits sont maintenant en vente.')}
        </div>
      </div>
    ) : (
      <div className="note red">
        <Icone nom="circle-alert" taille={18} />
        <div>
          <b>{t('Photo de la pièce illisible.')}</b>
          {t(' Renvoie une photo nette du recto depuis ton espace vendeur : tes produits restent enregistrés.')}
        </div>
      </div>
    )
  const apercu = (st: string, icone: string, texte: string) => (
    <Link key={st} to={chemin('devenir-vendeur', { st })} className="li">
      <span className="ic ">
        <Icone nom={icone} taille={20} />
      </span>
      <span className="grow">
        <span className="lt" style={{ display: 'block' }}>
          {t(texte)}
        </span>
        <span className="ls" style={{ display: 'block' }}>
          {t('Aperçu du prototype')}
        </span>
      </span>
      <span className="chev">
        <Icone nom="chevron-right" taille={18} />
      </span>
    </Link>
  )
  return (
    <>
      {note}
      <div className="card mt12">
        <div className="kick">{tf('Ta boutique « {nom} »', { nom: b.nom })}</div>
        <Etapes faites={p === 'verifiee' ? 4 : 2} />
        <div className="t13 b7 mt12">{t('Ton lien vendeur')}</div>
        <div className="vd-link">
          <Icone nom="link" taille={16} />
          <code>{lien}</code>
          <button type="button" className="btn ghost sm" style={{ width: 'auto' }} onClick={copier}>
            {t(copie ? 'Copié' : 'Copier')}
          </button>
        </div>
      </div>
      <div className="btns mt14">
        <Link to={chemin('devenir-vendeur', { st: 'ouvrir' })} className="btn primary">
          <Icone nom="store" taille={18} />
          <span>{t('Ouvrir mon espace vendeur')}</span>
        </Link>
      </div>
      {(p === 'aucune' || p === 'refusee') && (
        <div className="btns">
          {/* La pièce se donne dans l'espace vendeur (recto, verso, selfie vidéo). */}
          <Link to={chemin('devenir-vendeur', { st: 'ouvrir' })} className="btn secondary">
            <Icone nom="id-card" taille={18} />
            <span>{t(p === 'refusee' ? 'Renvoyer la photo de ma pièce' : 'Vérifier ma pièce maintenant')}</span>
          </Link>
        </div>
      )}
      <div className="hint-l">
        <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>
          {t(p === 'verifiee' ? 'Les commandes de ta boutique arrivent dans ton espace vendeur, pas ici.' : 'Tes produits restent en brouillon, invisibles aux clients, tant que ta pièce n’est pas vérifiée.')}
        </span>
      </div>
      <AConnaitre />
      <div className="card tight">
        {apercu('piece', 'clock', 'Voir l’état « pièce envoyée »')}
        {apercu('verifiee', 'badge-check', 'Voir l’état « pièce vérifiée »')}
        {apercu('refusee', 'circle-alert', 'Voir l’état « pièce refusée »')}
      </div>
    </>
  )
}

export function DevenirVendeur() {
  const { t, tf } = usePreferences()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const st = params.get('st')
  const [b, setB] = useState<Boutique | null | undefined>(undefined)
  useEffect(() => {
    source.boutique().then(setB)
  }, [])
  if (b === undefined) return null
  // Aperçu d'un état du prototype : la boutique du compte (ou celle du prototype), avec l'état de pièce demandé.
  const montree = st && st in PIECES ? { ...(b ?? EXEMPLE), piece: PIECES[st] } : b
  const etat = st && (st in PIECES || st === 'ouvrir') ? `devenir-vendeur?st=${st}` : montree ? 'devenir-vendeur?st=envoyee' : 'devenir-vendeur'

  if (st === 'ouvrir') {
    const lien = `vendeur.belivay.com/b/${(b ?? EXEMPLE).code}`
    return (
      <EcranCompte route="devenir-vendeur" parEtat etat={etat}>
        <Styles id="0b0ccec1e3" />
        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <span className="vd-ban" style={{ display: 'inline-flex', margin: '0 auto' }}>
            <span className="i">
              <Icone nom="store" taille={26} />
            </span>
          </span>
          <h1 className="pg-t" style={{ marginTop: '14px' }}>
            {t('Ton espace vendeur s’ouvre')}
          </h1>
          <p className="pg-s">
            {tf('Sur {lien}, avec le même numéro, sans nouveau mot de passe. Ajoute tes produits et organise ta boutique ; la vente s’ouvre quand ta pièce est vérifiée.', { lien })}
          </p>
        </div>
        <div className="btns mt16">
          <Link to={chemin('devenir-vendeur', b ? undefined : { st: 'envoyee' })} className="btn secondary">
            <span>{t('Revenir à ma boutique')}</span>
          </Link>
        </div>
      </EcranCompte>
    )
  }

  return (
    <EcranCompte route="devenir-vendeur" parEtat etat={etat}>
      <Styles id="118b6d36f2" />
      <Styles id="0b0ccec1e3" />
      <Styles id="1c3d953197" />
      {montree ? (
        <MaBoutique b={montree} />
      ) : (
        <Formulaire
          ouverte={(x) => {
            setB(x)
            naviguer(chemin('devenir-vendeur'), { replace: true })
          }}
        />
      )}
    </EcranCompte>
  )
}
