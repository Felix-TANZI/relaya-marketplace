// Publier et être payé · étapes 2 et 3 (VD-03, KYC-01 à 09, VD03-R08 à R14 ; DP-55, DP-56, DP-57 P-1 et S-2).
// L'écran suit le dossier d'ouverture (source.session.ouverture) :
// - pièces : CNI recto, verso, selfie vidéo avec la pièce, numéro Mobile Money de versement vérifié par code (au nom
//   du titulaire de la CNI) ; chaque élément s'envoie seul et dit son état ; le bouton plein nomme toujours l'élément
//   suivant, puis « Envoyer pour vérification » quand tout est fourni (KYC-06) ; une pièce refusée revient « À
//   reprendre » avec son motif écrit (VD03-R14) ; on peut partir ajouter des produits (KYC-08) ;
// - attente : réponse en moins de 15 minutes en général, date limite toujours affichée (48 h ouvrées, sans le
//   dimanche, VD03-R08) ; la démonstration donne la réponse du prestataire à la main ;
// - contrat : cinq lignes lues dans les paramètres en vigueur (VD03-R12), « Pourquoi ce montant ? » avec l'exemple
//   calculé comme « Vous gardez » (VD03-R13), offre de découverte en francs (DP-55 Q-03), RCCM et NIU seulement si
//   immatriculé (KYC-03), signature → Premier jour (VD03-R11) ;
// - signée : le récapitulatif (pièces vérifiées, contrat, documents) ; refusée pour de bon (3 refus) : motif,
//   décision humaine contestable une fois, brouillons jamais publiés (DP-57 S-2).
// L'accès Préparation n'a rien à faire ici (réservé au propriétaire : montants, contrat).
import { useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { Feuille } from '@client/composants/Feuille'
import { F } from '@client/i18n/format'
import exemple from '../../assets/prototype/32eb64e58d50.jpg'
import { Ecran } from '../../composants/coque'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { DossierOuverture, ElementKyc, EnvoiCode, PieceKyc } from '../../donnees/domaines/session'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { heure, jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useMontantsVisibles, useSession } from '../../session'
import { BoutonPlein, Chargement, CodeSMS, Comment, Demo, ErreurLecture, Etapes, HorsLigne, chiffresDe, espacer, numeroValide, operateur, useEnLigne } from './commun'

const NOMS: Record<PieceKyc | 'versement', string> = { recto: 'CNI · recto', verso: 'CNI · verso', selfie: 'Selfie vidéo avec votre pièce', versement: 'Numéro de versement' }
const MANQUE: Record<PieceKyc | 'versement', string> = { recto: 'CNI recto', verso: 'CNI verso', selfie: 'selfie', versement: 'numéro de versement' }
const ACTION: Record<PieceKyc | 'versement', [string, string]> = {
  recto: ['camera', 'Prendre le recto de la CNI'],
  verso: ['camera', 'Prendre le verso de la CNI'],
  selfie: ['scan-face', 'Commencer le selfie'],
  versement: ['smartphone', 'Vérifier le numéro de versement'],
}
const fourni = (e: ElementKyc) => e.etat === 'recu' || e.etat === 'verifie'

/** Lit une image prise par le téléphone, réduite (1 600 px au plus) pour l'envoi. */
function lireImage(f: File): Promise<string> {
  return new Promise((ok) => {
    if (!f.type.startsWith('image/')) return ok(URL.createObjectURL(f)) // vidéo du selfie : envoyée telle quelle
    const img = new Image()
    img.onload = () => {
      const k = Math.min(1, 1600 / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * k)
      c.height = Math.round(img.height * k)
      c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height)
      ok(c.toDataURL('image/jpeg', 0.85))
      URL.revokeObjectURL(img.src)
    }
    img.onerror = () => ok('')
    img.src = URL.createObjectURL(f)
  })
}

function Pill({ e }: { e: ElementKyc }) {
  const { t } = usePreferences()
  if (e.etat === 'verifie') return <span className="pill green">{t('Vérifié')}</span>
  if (e.etat === 'recu') return <span className="pill green">{t('Reçu')}</span>
  if (e.etat === 'refuse') return <span className="pill red">{t('À reprendre')}</span>
  return <span className="pill or">{t('À faire')}</span>
}

function Ligne({ quoi, e, detail, agir }: { quoi: PieceKyc | 'versement'; e: ElementKyc; detail: string; agir?: () => void }) {
  const { t } = usePreferences()
  const ic = quoi === 'selfie' ? 'scan-face' : quoi === 'versement' ? 'smartphone' : 'id-card'
  const contenu = (
    <>
      <span className={'ic ' + (e.etat === 'refuse' ? '' : fourni(e) ? 'green' : 'or')} style={e.etat === 'refuse' ? { background: 'var(--red-soft)', color: 'var(--red)' } : undefined}>
        <Icone nom={fourni(e) ? 'circle-check' : ic} taille={20} />
      </span>
      <span className="grow">
        <span className="lt" style={{ display: 'block' }}>
          {t(NOMS[quoi])}
        </span>
        <span className="ls" style={{ display: 'block' }}>
          {detail}
        </span>
      </span>
      <Pill e={e} />
    </>
  )
  return agir ? (
    <button type="button" className="li" onClick={agir} style={{ width: '100%', background: 'none', border: 0, textAlign: 'left', font: 'inherit', color: 'inherit', cursor: 'pointer' }}>
      {contenu}
    </button>
  ) : (
    <div className="li">{contenu}</div>
  )
}

// ── Numéro de versement (feuille) ──────────────────────────────────────────────────────────────────────────────────

function FeuilleVersement({ ouverte, fermer }: { ouverte: boolean; fermer: () => void }) {
  const { t, tf } = usePreferences()
  const enLigne = useEnLigne()
  const [n, setN] = useState('')
  const [vu, setVu] = useState(false)
  const [refus, setRefus] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState<EnvoiCode | null>(null)
  const fin = () => (setEnvoi(null), setN(''), setVu(false), setRefus(null), fermer())
  const demander = async () => {
    setVu(true)
    if (!numeroValide(n) || !enLigne) return
    const r = await source.session.demanderCodeVersement(n)
    if (r.ok) return setEnvoi(r.envoi)
    setRefus(r.raison === 'operateur' ? 'Seuls les numéros MTN Mobile Money et Orange Money reçoivent les versements.' : 'Un numéro du Cameroun a 9 chiffres et commence par 6.')
  }
  return (
    <Feuille ouverte={ouverte} fermer={fin} titre={t('Numéro de versement')}>
      <div style={{ fontWeight: '800', fontSize: '17px', margin: '2px 0 6px' }}>{t('Numéro de versement')}</div>
      <p className="t13 c2" style={{ margin: '0 0 6px', lineHeight: '1.45' }}>
        {t('Le numéro Mobile Money où BelivaY vous verse votre argent chaque vendredi. Il doit être à votre nom, comme sur votre CNI.')}
      </p>
      {!envoi ? (
        <>
          <div className="fld">
            <label htmlFor="kyc-num">{t('Numéro Mobile Money')}</label>
            <div className={'inp' + (vu && !numeroValide(n) ? ' err' : '')}>
              <span className="b8 c2 row" style={{ gap: '6px', paddingRight: '8px', borderRight: '1px solid var(--line-2)' }}>
                <Dessin id="81b1dee44510" />
                {t('+237')}
              </span>
              <input id="kyc-num" type="tel" inputMode="tel" placeholder="677 42 18 90" value={espacer(n)} onChange={(e) => (setN(chiffresDe(e.target.value)), setRefus(null))} />
              {operateur(n) && numeroValide(n) && <span className="suf">{t(operateur(n) === 'MTN' ? 'MTN MoMo' : 'Orange Money')}</span>}
            </div>
            {refus && <div className="hint err">{t(refus)}</div>}
          </div>
          {!enLigne && <HorsLigne texte="Le numéro de versement se vérifie seulement avec le réseau." />}
          <div className="mt12">
            <BoutonPlein icone="send" actif={enLigne} raison={t('Pas de connexion.')} onClick={() => void demander()}>
              {t('Recevoir le code')}
            </BoutonPlein>
          </div>
        </>
      ) : (
        <>
          <p className="t13 c2">{tf('Code envoyé par SMS au {n}.', { n: envoi.destination })}</p>
          <CodeSMS envoi={envoi} enLigne={enLigne} valider={(c) => source.session.validerCodeVersement(c)} reussi={fin} bouton="Vérifier ce numéro" />
        </>
      )}
    </Feuille>
  )
}

// ── États ──────────────────────────────────────────────────────────────────────────────────────────────────────────

function Pieces({ d }: { d: DossierOuverture }) {
  const { t, tf, langue } = usePreferences()
  const enLigne = useEnLigne()
  const fichier = useRef<HTMLInputElement>(null)
  const [cible, setCible] = useState<PieceKyc>('recto')
  const [versement, setVersement] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const elements: (PieceKyc | 'versement')[] = ['recto', 'verso', 'selfie', 'versement']
  const etat = (k: PieceKyc | 'versement') => (k === 'versement' ? d.versement : d.pieces[k])
  const manquants = elements.filter((k) => !fourni(etat(k)))
  const refusee = elements.find((k) => etat(k).etat === 'refuse') as PieceKyc | undefined
  const suivant = refusee ?? manquants[0]
  const prendre = (k: PieceKyc | 'versement') => {
    setErreur(null)
    if (k === 'versement') return setVersement(true)
    setCible(k)
    const el = fichier.current
    if (!el) return
    el.accept = k === 'selfie' ? 'video/*,image/*' : 'image/*'
    el.setAttribute('capture', k === 'selfie' ? 'user' : 'environment')
    el.click()
  }
  const envoyerImage = async (image: string, k = cible) => {
    const r = await source.session.envoyerPiece(k, image)
    if (r.ok) return jouer('code')
    jouer('erreur')
    setErreur(r.raison === 'visage' ? 'Nous n’avons pas pu vous reconnaître : réessayez à la lumière du jour.' : 'Photo difficile à lire : reprenez-la à plat, sans reflet.')
  }
  const envoyer = async () => {
    if (envoi || !enLigne) return
    setEnvoi(true)
    const r = await source.session.envoyerPourVerification()
    setEnvoi(false)
    if (r.ok) {
      jouer('fin')
      window.scrollTo({ top: 0 })
    } else setErreur('Il manque encore un élément.')
  }
  const detail = (k: PieceKyc | 'versement') => {
    const e = etat(k)
    if (k === 'versement' && e.etat === 'verifie') return tf('{op} {m} · à votre nom · vérifié par code', { op: d.versement.operateur ?? '', m: d.versement.masque ?? '' })
    if (e.etat === 'refuse') return tf('Refusée à {h} · {motif}', { h: heure(e.a ?? 0, langue), motif: t(e.motif ?? '') })
    if (e.a) return tf(e.etat === 'verifie' ? 'Vérifié à {h}' : 'Reçu à {h}', { h: heure(e.a, langue) })
    if (k === 'selfie') return t('Votre CNI à la main : tournez la tête quand on vous le demande.')
    if (k === 'versement') return t('Mobile Money à votre nom, vérifié par un code SMS.')
    return t('Carte à plat, sans reflet, à la lumière du jour.')
  }
  const listeManque = manquants.map((k) => t(MANQUE[k]))
  return (
    <>
      <Etapes cur={2} />
      <h1 className="pg-t" style={{ marginTop: '18px' }}>
        {t(refusee ? 'Une photo à reprendre' : 'Publier vos produits')}
      </h1>
      <p className="pg-s">
        {refusee
          ? t('Tout le reste est bon. Reprenez seulement l’élément refusé.')
          : d.brouillons
            ? tf('Envoyez trois éléments. Vos {n} produits en brouillon passent en ligne dès l’accord.', { n: d.brouillons })
            : t('Envoyez trois éléments. Vos produits en brouillon passent en ligne dès l’accord.')}
      </p>
      {refusee && (
        <div className="note red" role="alert">
          <Icone nom="circle-alert" taille={18} />
          <div>
            <b>{tf('{p} illisible', { p: t(NOMS[refusee]) })}</b>
            <div className="mt4">{tf('Motif écrit : {m}', { m: t(etat(refusee).motif ?? '') })}</div>
            {d.refus > 1 && <div className="mt4">{tf('Refus {n} sur {max} : au-delà, une personne décide.', { n: d.refus, max: d.refusMax })}</div>}
          </div>
        </div>
      )}
      <div className="card tight">
        {elements.map((k) => (
          <Ligne key={k} quoi={k} e={etat(k)} detail={detail(k)} agir={() => prendre(k)} />
        ))}
      </div>
      <div className="card">
        <div className="vx-idp">
          <img src={exemple} alt={t('Exemple : selfie avec la carte d’identité à la main')} />
          <p className="t13 c2" style={{ margin: '0', lineHeight: '1.45' }}>
            {t('Comme sur la photo : votre CNI à la main, le visage bien éclairé. Jamais montrée aux clients.')}
          </p>
        </div>
      </div>
      <input
        ref={fichier}
        type="file"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) await envoyerImage(await lireImage(f))
        }}
      />
      {erreur && (
        <div className="note red" role="alert">
          <Icone nom="circle-alert" taille={18} />
          <div>{t(erreur)}</div>
        </div>
      )}
      {!enLigne && <HorsLigne texte="Vos photos partent dès le retour du réseau ; la vérification attend la connexion." />}
      <div className="mt16">
        {suivant ? (
          <BoutonPlein icone={ACTION[suivant][0]} onClick={() => prendre(suivant)}>
            {t(ACTION[suivant][1])}
          </BoutonPlein>
        ) : (
          <BoutonPlein icone="send" actif={enLigne && !envoi} raison={t('Pas de connexion.')} onClick={() => void envoyer()}>
            {t(envoi ? 'Envoi…' : 'Envoyer pour vérification')}
          </BoutonPlein>
        )}
      </div>
      <p className="scrim-note" style={{ marginTop: '10px' }}>
        {manquants.length === 0
          ? t('Tout est prêt : envoyez pour vérification.')
          : manquants.length === 1
            ? tf('Encore 1 élément : {l}.', { l: listeManque[0] })
            : tf('Encore {n} éléments : {l}.', { n: manquants.length, l: listeManque.slice(0, -1).join(', ') + ' ' + t('et') + ' ' + listeManque[listeManque.length - 1] })}
      </p>
      <Comment>
        <p>{tf('Vérification automatique en moins de {n} minutes.', { n: d.delais.autoMinutes })}</p>
        <p>{tf('En cas de doute, une personne relit votre dossier sous {h} h ouvrées.', { h: d.delais.humainHeures })}</p>
        <p>{t('Aucune caution. Aucun RCCM demandé à un particulier.')}</p>
      </Comment>
      <p className="scrim-note" style={{ marginTop: '8px' }}>
        {t('Pas maintenant ? ')}
        <Link to={chemin('offre1')} className="t13 b8 cor" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px' }}>
          {t('Ajouter d’autres produits')}
        </Link>
      </p>
      {suivant && suivant !== 'versement' && (
        <Demo>
          {t('sans appareil photo, envoyez une photo d’exemple.')}{' '}
          <button type="button" className="vd03-lien" style={{ minHeight: '32px' }} onClick={() => void envoyerImage(exemple, suivant)}>
            {tf('Envoyer « {p} »', { p: t(NOMS[suivant]) })}
          </button>
        </Demo>
      )}
      <FeuilleVersement ouverte={versement} fermer={() => setVersement(false)} />
      <p className="hint center">{tf('Dossier {ref}', { ref: d.ref })}</p>
    </>
  )
}

function Attente({ d }: { d: DossierOuverture }) {
  const { t, tf, langue } = usePreferences()
  const [reponse, setReponse] = useState(false)
  const repondre = async (accord: boolean) => {
    setReponse(true)
    await source.session.reponseVerificationDemo(accord)
    jouer(accord ? 'fin' : 'notification')
    setReponse(false)
  }
  return (
    <>
      <Etapes cur={2} />
      <h1 className="pg-t" style={{ marginTop: '18px' }}>
        {t('Vérification en cours')}
      </h1>
      <p className="pg-s">{tf('En général, la réponse arrive en moins de {n} minutes.', { n: d.delais.autoMinutes })}</p>
      {d.reponseAvant && (
        <div className="hero night">
          <div className="hk row" style={{ gap: '6px' }}>
            <Icone nom="hourglass" taille={14} />
            {t('Réponse au plus tard')}
          </div>
          <div className="b8 mt8" style={{ fontSize: '24px', letterSpacing: '-.02em' }}>
            {tf('{jour} à {h}', { jour: jourLong(d.reponseAvant, langue).replace(/^\p{L}/u, (c) => c.toUpperCase()), h: heure(d.reponseAvant, langue) })}
          </div>
          <div className="hs">{tf('Si une personne relit votre dossier : {h} h ouvrées au plus. Vous êtes prévenu par SMS.', { h: d.delais.humainHeures })}</div>
        </div>
      )}
      <div className="card tight">
        <div className="li">
          <span className="ic green">
            <Icone nom="circle-check" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('Tout est envoyé')}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {tf('CNI recto et verso · selfie avec la pièce · {op} {m} vérifié', { op: d.versement.operateur ?? '', m: d.versement.masque ?? '' })}
            </span>
          </span>
        </div>
      </div>
      <div className="card">
        <div className="row">
          <span className="li" style={{ padding: '0', border: '0', minHeight: '0' }}>
            <span className="ic or">
              <Icone nom="package" taille={20} />
            </span>
          </span>
          <div className="grow">
            <div className="b8 t15">{d.brouillons ? tf(d.brouillons > 1 ? '{n} produits en brouillon' : '{n} produit en brouillon', { n: d.brouillons }) : t('Aucun produit en brouillon')}</div>
            <div className="t13 c3 mt4" style={{ lineHeight: '1.45' }}>
              {t(d.brouillons ? 'Ils passent en ligne dès l’accord, sans autre geste.' : 'Ajoutez-en maintenant : ils passeront en ligne dès l’accord.')}
            </div>
          </div>
        </div>
        <div className="mt14">
          <Link to={chemin('offre1')} className="btn primary">
            <Icone nom="plus" taille={18} />
            <span>{t('Ajouter d’autres produits')}</span>
          </Link>
        </div>
      </div>
      <Demo>
        {t('la réponse du prestataire de vérification.')}
        <div className="btns">
          <button type="button" className={'btn secondary' + (reponse ? ' off' : '')} onClick={() => void repondre(true)}>
            <Icone nom="circle-check" taille={18} />
            <span>{t('Accord')}</span>
          </button>
          <button type="button" className={'btn secondary' + (reponse ? ' off' : '')} onClick={() => void repondre(false)}>
            <Icone nom="circle-alert" taille={18} />
            <span>{t('Recto refusé')}</span>
          </button>
        </div>
      </Demo>
      <p className="hint center">{tf('Dossier {ref}', { ref: d.ref })}</p>
    </>
  )
}

function Contrat({ d }: { d: DossierOuverture }) {
  const { t, tf } = usePreferences()
  const naviguer = useNavigate()
  const enLigne = useEnLigne()
  const c = d.contrat
  const [immatricule, setImm] = useState(c.immatricule)
  const [rccm, setRccm] = useState(c.rccm)
  const [niu, setNiu] = useState(c.niu)
  const [refus, setRefus] = useState<'rccm' | 'niu' | null>(null)
  const [enCours, setEnCours] = useState(false)
  const F_ = (n: number) => t(`${F(n)} F`)
  const lignes: [string, ReactNode][] = [
    ['wallet', tf('Vous gardez de {min} à {max} % de chaque vente livrée, selon la catégorie, le prix et le palier ; minimum de {m} par commande sur les petits prix.', { min: c.gardeMinPourCent, max: c.gardeMaxPourCent, m: F_(c.minimumParCommande) })],
    ['banknote', t('Versement chaque vendredi, sans frais.')],
    ['gauge', tf('Plafond de démarrage : {p} par commande, jusqu’à {n} commandes livrées sans incident.', { p: F_(c.plafondDemarrage), n: c.commandesDemarrage })],
    ['calendar-x', tf('Résiliation avec {n} jours de préavis.', { n: c.preavisJours })],
    ['shield-check', t('Aucune caution, aucun dépôt.')],
  ]
  const signer = async () => {
    if (enCours || !enLigne) return
    setEnCours(true)
    const r = await source.session.signerContrat({ immatricule, rccm, niu })
    setEnCours(false)
    if (!r.ok) {
      jouer('erreur')
      return setRefus(r.raison === 'etape' ? null : r.raison)
    }
    jouer('fin')
    naviguer(chemin('premier_jour'), { replace: true })
  }
  return (
    <>
      <Etapes cur={3} />
      <h1 className="pg-t" style={{ marginTop: '18px' }}>
        {t('Votre contrat en cinq lignes')}
      </h1>
      <p className="pg-s">{d.enLigne ? tf('Pièces validées : vos {n} produits sont en ligne.', { n: d.enLigne }) : t('Pièces validées : vos produits passent en ligne dès que vous les ajoutez.')}</p>
      <div className="hero night">
        <div className="hk">{t('Contrat vendeur BelivaY')}</div>
        <div className="mt10">
          {lignes.map(([ic, texte]) => (
            <div key={ic} className="row" style={{ padding: '9px 0', borderTop: '1px solid rgba(255,255,255,.1)', alignItems: 'flex-start' }}>
              <Icone nom={ic} taille={18} style={{ color: 'var(--gold-l)', flexShrink: '0', marginTop: '1px' }} />
              <span className="t14" style={{ lineHeight: '1.45' }}>
                {texte}
              </span>
            </div>
          ))}
          <Link to={chemin('documents')} className="row" style={{ minHeight: '44px', borderTop: '1px solid rgba(255,255,255,.1)', color: '#fff', fontWeight: '800', fontSize: '14px' }}>
            <Icone nom="file-text" taille={18} style={{ color: 'var(--gold-l)', flexShrink: '0' }} />
            <span className="grow">{tf('Lire le contrat complet (version {v})', { v: c.version })}</span>
            <Icone nom="chevron-right" taille={18} style={{ opacity: '.7' }} />
          </Link>
        </div>
      </div>
      <Comment titre="Pourquoi ce montant ?">
        <p>
          {tf('Exemple : un {titre} vendu {prix}, vous gardez ', { titre: c.exemple.titre, prix: F_(c.exemple.prix) })}
          <b>{F_(c.exemple.garde)}</b>
          {t(', offre de découverte comprise.')}
        </p>
        <p>{t('La part gardée dépend de la catégorie et de votre palier. Le palier est votre niveau : Bronze, Argent, Or, Platine. Plus il est haut, plus vous gardez.')}</p>
        <p>{tf('Les {m} premiers mois, il suit vos produits en vente : Argent dès {a}, Or dès {o}, Platine dès {p}. Ensuite, votre Trust Score (note sur 100) décide.', { m: c.lancement.mois === 2 ? t('deux') : c.lancement.mois, a: c.lancement.argent, o: c.lancement.or, p: c.lancement.platine })}</p>
      </Comment>
      <div className="card" style={{ border: '1.5px solid var(--green-line)' }}>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <span className="li" style={{ padding: '0', border: '0', minHeight: '0' }}>
            <span className="ic green">
              <Icone nom="gift" taille={20} />
            </span>
          </span>
          <div className="grow">
            <div className="b8 t15">{t('Offre de découverte')}</div>
            <div className="t13 c2 mt4" style={{ lineHeight: '1.45' }}>
              {tf('Vous gardez {g} de plus sur un {titre} vendu {prix}.', { g: F_(c.exemple.gainDecouverte), titre: c.exemple.titre, prix: F_(c.exemple.prix) })}
            </div>
            <div className="t13 c3" style={{ lineHeight: '1.45' }}>
              {tf('Pendant {m} mois ou {n} commandes, dès la première commande payée.', { m: c.decouverte.mois, n: c.decouverte.commandes })}
            </div>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="kv">
          <span className="k">{t('Numéro de versement')}</span>
          <span className="v ">{tf('{op} {m} · à votre nom', { op: d.versement.operateur ?? '', m: d.versement.masque ?? '' })}</span>
        </div>
        <div className="hr"></div>
        <div className="row">
          <div className="grow">
            <div className="b8 t14" id="kyc-imm">
              {t('Je suis immatriculé')}
            </div>
            <div className="t12 c3 mt4" style={{ lineHeight: '1.4' }}>
              {t('Si oui, on vous demandera RCCM et NIU. Sinon, rien à faire.')}
            </div>
          </div>
          <button type="button" className={'tg' + (immatricule ? ' on' : '')} role="switch" aria-checked={immatricule} aria-labelledby="kyc-imm" onClick={() => (setImm((x) => !x), setRefus(null))}></button>
        </div>
        {immatricule && (
          <>
            <div className="fld">
              <label htmlFor="kyc-rccm">{t('RCCM')}</label>
              <div className={'inp' + (refus === 'rccm' ? ' err' : '')}>
                <input id="kyc-rccm" autoCapitalize="characters" placeholder="CM-YAO-2026-B-01234" value={rccm} onChange={(e) => (setRccm(e.target.value), setRefus(null))} />
              </div>
              {refus === 'rccm' && <div className="hint err">{t('Écrivez le RCCM comme sur votre registre : CM-YAO-2026-B-01234.')}</div>}
            </div>
            <div className="fld">
              <label htmlFor="kyc-niu">{t('NIU')}</label>
              <div className={'inp' + (refus === 'niu' ? ' err' : '')}>
                <input id="kyc-niu" autoCapitalize="characters" placeholder="M012345678901A" maxLength={14} value={niu} onChange={(e) => (setNiu(e.target.value), setRefus(null))} />
              </div>
              {refus === 'niu' && <div className="hint err">{t('Le NIU a 14 caractères : une lettre, 12 chiffres, une lettre.')}</div>}
            </div>
          </>
        )}
      </div>
      {!enLigne && <HorsLigne texte="La signature part seulement avec le réseau." />}
      <div className="mt16">
        <BoutonPlein icone="signature" actif={enLigne && !enCours} raison={t('Pas de connexion.')} onClick={() => void signer()}>
          {t(enCours ? 'Signature…' : 'Signer le contrat')}
        </BoutonPlein>
      </div>
      <p className="scrim-note">{t('Signature électronique. Votre premier versement part le vendredi qui suit la libération de votre première vente.')}</p>
      <p className="hint center">{tf('Dossier {ref}', { ref: d.ref })}</p>
    </>
  )
}

function Signee({ d }: { d: DossierOuverture }) {
  const { t, tf, langue } = usePreferences()
  const elements: (PieceKyc | 'versement')[] = ['recto', 'verso', 'selfie', 'versement']
  return (
    <>
      <Etapes cur={4} />
      <div className="card green center blv-succes" style={{ padding: '18px', marginTop: '18px' }}>
        <Icone nom="badge-check" taille={34} />
        <div className="b8 t17 mt8">{t('Votre boutique est vérifiée')}</div>
        <div className="t13 c2 mt4">{d.contrat.signeA ? tf('Contrat signé le {j}.', { j: jourLong(d.contrat.signeA, langue) }) : ''}</div>
      </div>
      <div className="card tight">
        {elements.map((k) => {
          const e = k === 'versement' ? d.versement : d.pieces[k]
          return <Ligne key={k} quoi={k} e={e} detail={k === 'versement' ? tf('{op} {m} · à votre nom', { op: d.versement.operateur ?? '', m: d.versement.masque ?? '' }) : e.a ? tf('Vérifié le {j}', { j: jourLong(e.a, langue) }) : ''} />
        })}
      </div>
      <div className="btns mt14">
        <Link to={chemin('documents')} className="btn secondary">
          <Icone nom="file-text" taille={18} />
          <span>{t('Contrat et documents')}</span>
        </Link>
        <Link to={chemin('accueil')} className="btn secondary">
          <Icone nom="store" taille={18} />
          <span>{t('Accueil')}</span>
        </Link>
      </div>
      <div className="hint-l">
        <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t('Changer de numéro de versement se fait dans Argent, avec deux codes et 7 jours de revue.')}</span>
      </div>
      <p className="hint center">{tf('Dossier {ref}', { ref: d.ref })}</p>
    </>
  )
}

function Refusee({ d }: { d: DossierOuverture }) {
  const { t, tf } = usePreferences()
  return (
    <>
      <Etapes cur={2} />
      <h1 className="pg-t" style={{ marginTop: '18px' }}>
        {t('Vérification refusée')}
      </h1>
      <p className="pg-s">{tf('Après {n} refus, une personne de BelivaY a pris la décision.', { n: d.refus })}</p>
      <div className="note red" role="alert">
        <Icone nom="circle-alert" taille={18} />
        <div>{tf('Motif écrit : {m}', { m: t(d.pieces.recto.motif ?? '') })}</div>
      </div>
      <div className="note ink">
        <Icone nom="package" taille={18} />
        <div>{t('Vos produits en brouillon ne sont jamais publiés. Ils sont effacés après 30 jours.')}</div>
      </div>
      <div className="mt16">
        <Link to={chemin('contester')} className="btn primary">
          <Icone nom="scale" taille={18} />
          <span>{t('Contester cette décision (une fois)')}</span>
        </Link>
      </div>
      <div className="mt8">
        <Link to={chemin('aide')} className="btn secondary">
          <Icone nom="message-circle" taille={18} />
          <span>{t('Écrire au support')}</span>
        </Link>
      </div>
      <p className="hint center">{tf('Dossier {ref}', { ref: d.ref })}</p>
    </>
  )
}

export default function Kyc() {
  const { t } = usePreferences()
  const s = useSession()
  const montants = useMontantsVisibles()
  const lecture = useLecture(async () => ({ d: await source.session.ouverture() }), [s.connecte, s.membre?.role])
  const d = lecture.donnees?.d ?? null
  let corps: ReactNode
  if (lecture.erreur) corps = <ErreurLecture relire={lecture.relire} />
  else if (!lecture.donnees) corps = <Chargement />
  else if (s.connecte && !montants)
    corps = (
      <div className="note ink" style={{ marginTop: '18px' }}>
        <Icone nom="lock" taille={18} />
        <div>{t('Les pièces et le contrat de la boutique sont réservés au propriétaire.')}</div>
      </div>
    )
  else if (!d || d.etape === 'ouvrir')
    corps = (
      <>
        <Etapes cur={1} />
        <div className="note ink" style={{ marginTop: '18px' }}>
          <Icone nom="info" taille={18} />
          <div>{t(d ? 'Votre numéro n’est pas encore vérifié : entrez le code reçu par SMS.' : 'Ouvrez d’abord votre boutique, ou connectez-vous.')}</div>
        </div>
        <div className="mt16">
          <Link to={chemin(d ? 'otp' : 'ouvrir')} className="btn primary">
            <Icone nom={d ? 'smartphone' : 'store'} taille={18} />
            <span>{t(d ? 'Entrer le code' : 'Ouvrir ma boutique')}</span>
          </Link>
        </div>
        {!d && (
          <div className="mt8">
            <Link to={chemin('connexion', { next: chemin('kyc') })} className="btn secondary">
              <Icone nom="log-in" taille={18} />
              <span>{t('Se connecter')}</span>
            </Link>
          </div>
        )}
      </>
    )
  else if (d.etape === 'pieces') corps = <Pieces d={d} />
  else if (d.etape === 'attente') corps = <Attente d={d} />
  else if (d.etape === 'contrat') corps = <Contrat d={d} />
  else if (d.etape === 'refusee') corps = <Refusee d={d} />
  else corps = <Signee d={d} />
  return (
    <Ecran route="kyc" retour={s.connecte ? chemin('accueil') : chemin('ouvrir')}>
      {corps}
    </Ecran>
  )
}
