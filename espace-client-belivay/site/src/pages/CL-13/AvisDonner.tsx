// Écran « Donner mon avis » (CL-13 ; AVIS-FENETRE, DP-35), balisage du prototype du 1er octobre, repris à la
// main et rendu logique (DP-53). L'état vient de la commande (?ref=…) :
// - pas encore retirée : « Pas encore de note possible » ; fenêtre passée (7 jours après le retrait) :
//   « Notation fermée » ; avis déjà envoyé : le récapitulatif, modifiable tant que la fenêtre court ;
// - sinon le formulaire : une note par vendeur (un par colis) et une pour le relais, en touchant une étoile ;
//   commentaire et photo facultatifs ; « Envoyer mes notes » quand toutes les notes sont données ;
// - une note de vendeur de 2 ou moins : après l'envoi, la feuille « Tes notes sont envoyées » propose de
//   signaler un problème (écran avis-bas, AvisBas.tsx) ; la note part telle quelle.
// DP-54 : le compteur du commentaire, ce qui sera visible (sans ton nom) et les formats de photo acceptés.
// Les états du prototype restent ouverts par leur adresse (?st=bas, envoye, modifier, ferme, non).
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Dessin } from '../../composants/Dessin'
import { Feuille } from '../../composants/Feuille'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { reduirePhoto } from '../../donnees/photo'
import { source, type AvisEnvoye, type DonneesAvis } from '../../donnees/source'
import { dateA, jourSeul, quand } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { EcranCompte } from './Larges'

const LIBELLES = ['', 'Très mauvais', 'Mauvais', 'Moyen', 'Bien', 'Excellent']
const JOUR = 24 * 3600 * 1000

// Démonstration des états du prototype (« ?st=… » sans avis enregistré).
const EXEMPLES: Record<string, Omit<AvisEnvoye, 'envoyeLe'> & { envoyeLe?: number }> = {
  bas: { notes: [2, 5], commentaire: 'Le son grésille à gauche.', photo: null },
  envoye: { notes: [4, 5], commentaire: 'Son clair, bonne batterie. Chargeur conforme à la photo.', photo: 'exemple', envoyeLe: Date.UTC(2026, 8, 22, 8, 0) },
  modifier: { notes: [4, 5], commentaire: 'Son clair, bonne batterie. Chargeur conforme à la photo.', photo: 'exemple', envoyeLe: Date.UTC(2026, 8, 22, 8, 0) },
}

// Référence de la commande : celle de l'adresse ; sans, celle du prototype (fermée : BLV-51388 ; pas
// retirée : BLV-52107 ; sinon BLV-51702).
const refDe = (params: URLSearchParams) =>
  params.get('ref') ?? (params.get('st') === 'ferme' ? 'BLV-51388' : params.get('st') === 'non' ? 'BLV-52107' : 'BLV-51702')

function Etoiles({ note, choisir, aria }: { note: number; choisir?: (n: number) => void; aria: string }) {
  const { t } = usePreferences()
  return (
    <>
      <div className="cl13-st" role="radiogroup" aria-label={aria}>
        {[1, 2, 3, 4, 5].map((n) => (
          <a
            key={n}
            role="radio"
            aria-checked={note === n ? 'true' : 'false'}
            aria-label={`${n} sur 5`}
            className={n <= note ? 'on' : ''}
            href={choisir ? '#' : undefined}
            onClick={choisir ? (e) => (e.preventDefault(), choisir(n)) : undefined}
          >
            <Icone nom="star" taille={32} trait={1.3} />
          </a>
        ))}
      </div>
      <div className="cl13-stl">{t(note ? `${note} sur 5 · ${LIBELLES[note]}` : 'Touche une étoile')}</div>
    </>
  )
}

// Titre de la carte d'un vendeur ; avec plusieurs colis, la vignette du produit à côté.
function TitreVendeur({ d, i }: { d: DonneesAvis; i: number }) {
  const { t } = usePreferences()
  const c = d.commande
  const titre = <h3>{t(c.colis.length > 1 ? `Le vendeur du colis ${i + 1}` : 'Le vendeur')}</h3>
  const sous = <span className="s">{t((c.colis[i].produit ? c.colis[i].produit + ' · ' : '') + 'le produit, l’emballage, la conformité')}</span>
  if (c.colis.length < 2)
    return (
      <>
        {titre}
        {sous}
      </>
    )
  return (
    <div className="row" style={{ gap: '12px' }}>
      <span className="thumb" style={{ width: '44px', height: '44px', borderRadius: '12px' }}>
        {c.colis[i].dessin && <Dessin id={c.colis[i].dessin!} />}
      </span>
      <span className="grow">
        {titre}
        {sous}
      </span>
    </div>
  )
}

function Entete({ d }: { d: DonneesAvis }) {
  const { t, tf, langue } = usePreferences()
  const c = d.commande
  const ferme = !!c.retireeLe && d.maintenant > c.retireeLe + d.fenetreJours * JOUR
  const statut = !c.retireeLe
    ? tf('Payée {d} · pas encore retirée', { d: quand(c.payeeLe, d.maintenant, langue) })
    : ferme
      ? tf('Retirée le {d} · ', { d: jourSeul(c.retireeLe, langue) })
      : tf('Retirée {d} · ', { d: quand(c.retireeLe, d.maintenant, langue) })
  return (
    <>
      <div className="seg">
        <Link to={chemin('avis', { p: c.produit })} className="">
          {t('Lire les avis')}
        </Link>
        <Link to={chemin('avis-donner', { ref: c.ref })} className="on">
          {t('Donner mon avis')}
        </Link>
      </div>
      <div className="card">
        <div className="row" style={{ gap: '14px' }}>
          <span className="thumb" style={{ width: '60px', height: '60px', borderRadius: '14px' }}>
            {c.dessin && <Dessin id={c.dessin} />}
          </span>
          <span className="grow">
            <b className="t15 b8" style={{ display: 'block', lineHeight: '1.3', fontSize: '16px' }}>
              {t(c.titre)}
            </b>
            <span className="t13 c3" style={{ display: 'block', marginTop: '3px', lineHeight: '1.4' }}>
              {statut}
              {c.retireeLe && <span className="nw">{t(c.relais)}</span>}
            </span>
            <span className="t12 b7 c3" style={{ display: 'block', marginTop: '3px' }}>
              {t(c.ref)}
            </span>
          </span>
        </div>
      </div>
    </>
  )
}

// Le formulaire (nouvel avis, avis à modifier, exemple « bas » du prototype).
function Formulaire({ d, depart, modifier, envoye }: { d: DonneesAvis; depart: Omit<AvisEnvoye, 'envoyeLe'> & { envoyeLe?: number } | null; modifier: boolean; envoye: (bas: boolean) => void }) {
  const { t, tf, langue } = usePreferences()
  const c = d.commande
  const n = c.colis.length + 1
  const [notes, setNotes] = useState<number[]>(depart?.notes ?? Array(n).fill(0))
  const [commentaire, setCommentaire] = useState(depart?.commentaire ?? '')
  const [photo, setPhoto] = useState<string | null>(depart?.photo === 'exemple' ? null : (depart?.photo ?? null))
  const [exemplePhoto, setExemplePhoto] = useState(depart?.photo === 'exemple') // photo de démonstration du prototype
  const [erreurPhoto, setErreurPhoto] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)
  const [incomplet, setIncomplet] = useState(false) // « Envoyer » touché avant d'avoir tout noté
  const fichier = useRef<HTMLInputElement>(null)
  const limite = c.retireeLe! + d.fenetreJours * JOUR
  const complet = notes.every((x) => x > 0)
  const noter = (i: number, v: number) => setNotes((x) => x.map((y, k) => (k === i ? v : y)))
  const choisirPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      setPhoto(await reduirePhoto(f))
      setErreurPhoto(null)
    } catch {
      setErreurPhoto('Cette image ne passe pas : choisis une photo JPG, PNG ou WebP de 10 Mo au plus.')
    }
  }
  const envoyer = async () => {
    if (!complet) return setIncomplet(true)
    if (enCours) return
    setEnCours(true)
    const r = await source.envoyerAvis(c.ref, { notes, commentaire: commentaire.trim(), photo: photo ?? (exemplePhoto ? 'exemple' : null) })
    setEnCours(false)
    if (r.ok) envoye(notes.slice(0, -1).some((x) => x <= 2))
  }
  const blocVendeur = (i: number): ReactNode => (
    <div key={i} className="card cl13-rt">
      <TitreVendeur d={d} i={i} />
      <Etoiles note={notes[i]} choisir={(v) => noter(i, v)} aria={t('Note du vendeur')} />
      {notes[i] > 0 && notes[i] <= 2 && (
        <div className="note or">
          <Icone nom="circle-help" taille={18} />
          <div>{tf('Un problème avec l’article ? Tu peux le signaler jusqu’au {d}. Ta note part telle quelle : rien n’en dépend.', { d: jourSeul(limite, langue) })}</div>
        </div>
      )}
    </div>
  )
  return (
    <>
      {modifier && depart?.envoyeLe && (
        <div className="note green">
          <Icone nom="check" taille={18} />
          <div>
            {tf('Notes envoyées le {le} · modifiables jusqu’au ', { le: jourSeul(depart.envoyeLe, langue) })}
            <b>{dateA(limite, langue)}</b>
            {t('.')}
          </div>
        </div>
      )}
      {c.colis.map((_, i) => blocVendeur(i))}
      <div className="card cl13-rt">
        <h3>
          {t(c.gerant + ' · ')}
          <span className="nw">{t(c.relais)}</span>
        </h3>
        <span className="s">{t('l’accueil, l’attente, la propreté du point')}</span>
        <Etoiles note={notes[n - 1]} choisir={(v) => noter(n - 1, v)} aria={t('Note du relais')} />
      </div>
      <div className="card">
        <div className="kick" style={{ margin: '0 0 10px' }}>
          {t('Commentaire — facultatif')}
        </div>
        <div className={'inp area' + (commentaire ? '' : ' ph')}>
          <textarea
            aria-label={t('Commentaire')}
            value={depart && commentaire === depart.commentaire ? t(commentaire) : commentaire}
            maxLength={500}
            rows={3}
            placeholder={t('Dis ce qui t’a plu ou déplu')}
            onChange={(e) => setCommentaire(e.target.value)}
          />
        </div>
        <div className="hint">{tf('{n} caractères sur 500', { n: commentaire.length })}</div>
        <div className="cl13-phs">
          {(photo || exemplePhoto) && (
            <div className="photo" role="button" tabIndex={0} aria-label={t('Retirer la photo')} onClick={() => (setPhoto(null), setExemplePhoto(false))} style={{ cursor: 'pointer' }}>
              {photo ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <Dessin id="47c0b20d4e26" />}
            </div>
          )}
          <button type="button" className="cl13-phb" onClick={() => fichier.current?.click()}>
            <Icone nom="camera" taille={19} />
            <span>{t('Ajouter une photo')}</span>
          </button>
          <input ref={fichier} type="file" accept="image/*" hidden onChange={choisirPhoto} />
        </div>
        {erreurPhoto && (
          <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
            {t(erreurPhoto)}
          </div>
        )}
      </div>
      {incomplet && !complet && (
        <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
          {t('Donne d’abord une note à chaque point, de 1 à 5 étoiles.')}
        </div>
      )}
      <div className="btns mt16">
        <button type="button" className={'btn primary' + (complet && !enCours ? '' : ' off')} onClick={envoyer}>
          <Icone nom="send" taille={18} />
          <span>{t(modifier ? 'Enregistrer les changements' : 'Envoyer mes notes')}</span>
        </button>
      </div>
      <p className="scrim-note">{t('La note seule suffit. Un avis ne peut pas être retiré contre un remboursement.')}</p>
      <div className="hint-l">
        <Icone nom="eye" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t('Ton commentaire et ta photo s’affichent sur la fiche du produit, sans ton nom. N’y mets ni numéro, ni lien, ni code. Photo : JPG, PNG ou WebP, 10 Mo au plus.')}</span>
      </div>
      {!modifier && !depart && (
        <>
          <div className="hint-l">
            <Icone nom="clock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{tf('Tu peux noter jusqu’au {d}, 7\u00A0jours après ton retrait.', { d: dateA(limite, langue) })}</span>
          </div>
          <details className="more">
            <summary>
              <Icone nom="circle-help" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
              <span className="grow">{t('Pourquoi deux notes ?')}</span>
              <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
            </summary>
            <div className="more-b">
              <p>{t('Le vendeur et le relais ne font pas le même travail. Une seule note punirait un relais impeccable pour un article décevant.')}</p>
            </div>
          </details>
        </>
      )}
    </>
  )
}

// Récapitulatif d'un avis envoyé.
function Envoye({ d, avis }: { d: DonneesAvis; avis: AvisEnvoye | (typeof EXEMPLES)['envoye'] }) {
  const { t, tf, langue } = usePreferences()
  const c = d.commande
  const limite = c.retireeLe! + d.fenetreJours * JOUR
  const avec = avis.commentaire && avis.photo ? 'Oui' : avis.commentaire ? 'Commentaire seulement' : avis.photo ? 'Photo seulement' : 'Non'
  return (
    <>
      <div className="card center" style={{ padding: '22px 18px' }}>
        <div className="empty" style={{ padding: '4px 0 0' }}>
          <div className="ei" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}>
            <Icone nom="check" taille={28} trait={2.6} />
          </div>
          <h3>{tf('Merci {prenom}, tes {n} notes sont envoyées', { prenom: d.prenom, n: avis.notes.length })}</h3>
          <p>{t('Elles aident les prochains clients à choisir, et BelivaY à suivre le vendeur et le relais.')}</p>
        </div>
      </div>
      <div className="card tight">
        {c.colis.map((_, i) => (
          <div key={i} className="kv">
            <span className="k">{t(c.colis.length > 1 ? `Le vendeur du colis ${i + 1}` : 'Le vendeur')}</span>
            <span className="v ">{t(`${avis.notes[i]} sur 5 · ${LIBELLES[avis.notes[i]]}`)}</span>
          </div>
        ))}
        <div className="kv">
          <span className="k">{t(c.gerant)}</span>
          <span className="v ">{t(`${avis.notes[avis.notes.length - 1]} sur 5 · ${LIBELLES[avis.notes[avis.notes.length - 1]]}`)}</span>
        </div>
        <div className="kv">
          <span className="k">{t('Commentaire et photo')}</span>
          <span className="v ">{t(avec)}</span>
        </div>
      </div>
      <div className="hint-l">
        <Icone nom="eye" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{tf('Ton commentaire et ta photo s’affichent sur la fiche du produit. Le vendeur et {gerant} ne voient jamais ton nom.', { gerant: t(c.gerant) })}</span>
      </div>
      <div className="btns mt16">
        <Link to={chemin('commandes')} className="btn primary">
          <span>{t('Retour à mes commandes')}</span>
        </Link>
      </div>
      {d.maintenant <= limite && (
        <>
          <div className="links">
            <Link to={chemin('avis-donner', { ref: c.ref, st: 'modifier' })}>{t('Modifier mes notes')}</Link>
          </div>
          <p className="scrim-note" style={{ marginTop: '4px' }}>
            {tf('Modifiables jusqu’au {d}', { d: dateA(limite, langue) })}
          </p>
        </>
      )}
    </>
  )
}

// Feuille « Tes notes sont envoyées » après une note basse (écran avis-bas).
function FeuilleBas({ d, avis }: { d: DonneesAvis; avis: Pick<AvisEnvoye, 'notes'> }) {
  const { t, tf, langue } = usePreferences()
  const naviguer = useNavigate()
  const c = d.commande
  const limite = c.retireeLe! + d.fenetreJours * JOUR
  const resume = [
    ...c.colis.map((_, i) => tf(c.colis.length > 1 ? 'Le vendeur du colis {i}\u00A0: {n} sur 5' : 'Le vendeur\u00A0: {n} sur 5', { i: i + 1, n: avis.notes[i] })),
    tf('{gerant}\u00A0: {n} sur 5', { gerant: t(c.gerant), n: avis.notes[avis.notes.length - 1] }),
  ].join(' · ')
  return (
    <Feuille ouverte fermer={() => naviguer(chemin('avis-donner', { ref: c.ref, st: 'envoye' }), { replace: true })} titre={t('Tes notes sont envoyées')}>
      <div className="row">
        <span className="ic-sq or">
          <Icone nom="check" taille={22} trait={2.4} />
        </span>
        <span className="grow">
          <b className="t17 b8" style={{ display: 'block' }}>
            {t('Tes notes sont envoyées')}
          </b>
          <span className="t13 c3">{resume}</span>
        </span>
      </div>
      <p className="t15 b7" style={{ margin: '16px 0 0', lineHeight: '1.45' }}>
        {tf('Un problème avec l’article\u00A0? Tu peux le signaler jusqu’au {d}.', { d: jourSeul(limite, langue) })}
      </p>
      <p className="t13 c3" style={{ margin: '6px 0 0', lineHeight: '1.45' }}>
        {t('Ton argent reste bloqué pendant l’examen\u00A0: le vendeur n’est pas encore payé.')}
      </p>
      <div className="btns mt16">
        <Link to={chemin('litige', { etape: '2', ref: c.ref })} className="btn primary">
          <Icone nom="circle-help" taille={18} />
          <span>{t('Signaler un problème')}</span>
        </Link>
      </div>
      <div className="btns">
        <Link to={chemin('avis-donner', { ref: c.ref, st: 'envoye' })} className="btn secondary" replace>
          <span>{t('Non merci')}</span>
        </Link>
      </div>
      <div className="hint-l">
        <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t('Ta note ne change rien à un litige, et un litige ne change rien à ta note.')}</span>
      </div>
    </Feuille>
  )
}

export function PageAvis({ bas = false }: { bas?: boolean }) {
  const naviguer = useNavigate()
  const [params] = useSearchParams()
  const st = params.get('st')
  const ref = refDe(params)
  const [d, setD] = useState<DonneesAvis | null>(null)
  useEffect(() => {
    let vivant = true
    source.avis(ref).then((x) => vivant && setD(x))
    return () => {
      vivant = false
    }
  }, [ref, st])
  if (!d) return null
  const c = d.commande
  const fenetre = !!c.retireeLe && d.maintenant <= c.retireeLe + d.fenetreJours * JOUR
  const route = bas ? 'avis-bas' : 'avis-donner'

  // L'écran que les données décident (l'adresse d'un état du prototype le montre en démonstration).
  const etatProto = (s: string) => `${route}?ref=BLV-51702&st=${s}`
  let corps: ReactNode
  let etat: string
  if (!c.retireeLe || st === 'non') {
    etat = 'avis-donner?st=non'
    corps = <Vide icone="package" titre="Pas encore de note possible" texte="Seuls les clients qui ont payé et retiré leur colis peuvent noter : c’est ce qui rend les avis fiables." vers={chemin('commande', { ref: c.ref })} bouton="Suivre ma commande" />
  } else if (!fenetre || st === 'ferme') {
    etat = 'avis-donner?st=ferme'
    corps = <Ferme d={d} />
  } else if (bas) {
    etat = 'avis-bas?ref=BLV-51702'
    corps = <NotesLues d={d} notes={(c.avis ?? EXEMPLES.bas).notes} />
  } else if (st === 'modifier') {
    etat = etatProto('modifier')
    corps = <Formulaire key="modifier" d={d} depart={c.avis ?? EXEMPLES.modifier} modifier envoye={() => naviguer(chemin('avis-donner', { ref: c.ref, st: 'envoye' }), { replace: true })} />
  } else if (st === 'envoye' || c.avis) {
    etat = etatProto('envoye')
    corps = <Envoye d={d} avis={c.avis ?? EXEMPLES.envoye} />
  } else {
    etat = st === 'bas' ? etatProto('bas') : c.ref === 'BLV-52018' ? 'avis-donner?ref=BLV-52018' : 'avis-donner?from=compte&ref=BLV-51702'
    corps = (
      <Formulaire
        key={c.ref + (st ?? '')}
        d={d}
        depart={st === 'bas' ? EXEMPLES.bas : null}
        modifier={false}
        envoye={(basse) => naviguer(chemin(basse ? 'avis-bas' : 'avis-donner', basse ? { ref: c.ref } : { ref: c.ref, st: 'envoye' }), { replace: true })}
      />
    )
  }
  return (
    <EcranCompte colonne={640} route={route} parEtat etat={etat} fixes={bas ? <FeuilleBas d={d} avis={c.avis ?? EXEMPLES.bas} /> : null}>
      <Entete d={d} />
      {corps}
    </EcranCompte>
  )
}

// Les notes envoyées, en lecture (derrière la feuille « Tes notes sont envoyées »).
function NotesLues({ d, notes }: { d: DonneesAvis; notes: number[] }) {
  const { t } = usePreferences()
  const c = d.commande
  return (
    <>
      {c.colis.map((_, i) => (
        <div key={i} className="card cl13-rt">
          <TitreVendeur d={d} i={i} />
          <Etoiles note={notes[i]} aria={t('Note du vendeur')} />
        </div>
      ))}
      <div className="card cl13-rt">
        <h3>
          {t(c.gerant + ' · ')}
          <span className="nw">{t(c.relais)}</span>
        </h3>
        <span className="s">{t('l’accueil, l’attente, la propreté du point')}</span>
        <Etoiles note={notes[notes.length - 1]} aria={t('Note du relais')} />
      </div>
    </>
  )
}

function Ferme({ d }: { d: DonneesAvis }) {
  const { langue, tf } = usePreferences()
  const c = d.commande
  return (
    <Vide
      icone="clock"
      titre="Notation fermée"
      texte={tf('On note pendant 7 jours après le retrait. Pour cette commande, c’était jusqu’au {d}.', { d: jourSeul(c.retireeLe! + d.fenetreJours * JOUR, langue) })}
      vers={chemin('avis', { p: c.produit })}
      bouton="Lire les avis"
      traduit
    />
  )
}

function Vide(p: { icone: string; titre: string; texte: string; vers: string; bouton: string; traduit?: boolean }) {
  const { t } = usePreferences()
  return (
    <div className="card ">
      <div className="empty">
        <div className="ei">
          <Icone nom={p.icone} taille={26} />
        </div>
        <h3>{t(p.titre)}</h3>
        <p>{p.traduit ? p.texte : t(p.texte)}</p>
        <div className="btns">
          <Link to={p.vers} className="btn secondary">
            <span>{t(p.bouton)}</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

export function AvisDonner() {
  return <PageAvis />
}
