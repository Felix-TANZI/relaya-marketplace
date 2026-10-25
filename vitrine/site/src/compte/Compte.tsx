// « Mon compte » du kit partagé (livreur, point relais ; pièces reprises par le client et le vendeur) : en haut, la
// photo (et la couverture là où elle a du sens) avec les actions principales ; puis des sections compactes et
// repliables : nom, numéro (code à 6 chiffres), e-mail (code envoyé à la nouvelle adresse), mot de passe (l'ancien et
// le nouveau), compte Google associé, cet appareil ; enfin, discrète, la désactivation ou la suppression (ou, pour le
// livreur, la demande de départ à son entreprise). Chaque changement sensible demande le mot de passe ou un code et
// envoie un avis. Démonstration : src/compte/etat.ts (aucune vraie donnée).
import { useState, type ReactNode } from 'react'
import { LogoGoogle } from './logos'
import { CODE_DEMO, aviser, chiffres, ecrireCompte, emailValide, googleDuTelephone, identite, lireCompte, masquerEmail, masquerTel, mdpSolide, telValide, useCompteDemo, type AppCompte, type IdentiteDepart } from './etat'
import { Avatar, Champ, ChampCode, ChampMdp, Ic, Modale, Note, Recadrage, Repli, useChoixImage, useTk, type Forme } from './socle'

export interface OptionsCompte {
  app: AppCompte
  depart: IdentiteDepart
  /** Couverture (boutique, point relais) : son titre et où elle se voit. */
  couverture?: { aide: string }
  /** Nom fixé ailleurs (pièce d'identité) : la phrase qui le dit ; le nom ne se change pas ici. */
  nomFixe?: string
  /** Fin du compte : suppression, désactivation, ou demande de départ (livreur : lien vers la demande). */
  fin: { genre: 'supprimer' | 'desactiver'; consequence: string } | { genre: 'depart'; vers: () => void; texte: string }
  /** Photo enregistrée par l'application elle-même (sinon : gardée dans le compte de démonstration). */
  enregistrerPhoto?: (photo: string | null) => Promise<void> | void
  /** Après la fin du compte (désactivé ou supprimé) : retour à la connexion. */
  apresFin?: () => void
  /** Ce que voient les autres de la photo (une ligne). */
  photoVuePar: string
}

type Etape = { quoi: 'tel' | 'email'; valeur: string; code: string; err: string | null } | null

export function SectionsCompte(o: OptionsCompte) {
  const { tk } = useTk()
  const c = useCompteDemo(o.app)
  const id = identite(o.app, o.depart)
  const nomComplet = [id.prenom, id.nom].filter(Boolean).join(' ')
  const [ouvert, setOuvert] = useState<string | null>(null)
  const [dit, setDit] = useState<string | null>(null)
  const [feuille, setFeuille] = useState<'photo' | 'couverture' | 'fin' | null>(null)
  const [aRogner, setARogner] = useState<{ img: HTMLImageElement; forme: Forme } | null>(null)
  const [formeChoisie, setFormeChoisie] = useState<Forme>('rond')
  const choix = useChoixImage((img) => (setFeuille(null), setARogner({ img, forme: formeChoisie })))
  // Champs des sections
  const [prenom, setPrenom] = useState(id.prenom)
  const [nom, setNom] = useState(id.nom)
  const [mdpNom, setMdpNom] = useState('')
  const [tel, setTel] = useState('')
  const [email, setEmail] = useState('')
  const [mdpEmail, setMdpEmail] = useState('')
  const [etape, setEtape] = useState<Etape>(null)
  const [ancien, setAncien] = useState('')
  const [nouveau, setNouveau] = useState('')
  const [mdpFin, setMdpFin] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const google = c.google
  const photoGoogle = google?.photo ?? (id.email && /@gmail\.com$/i.test(id.email) ? googleDuTelephone(id.prenom, id.nom, id.email).photo : null)

  const dire = (texte: string, avis?: string) => {
    setDit(texte)
    setErreur(null)
    if (avis) aviser(o.app, avis)
  }
  const basculer = (cle: string) => (v: boolean) => (setOuvert(v ? cle : null), setErreur(null), setEtape(null))
  const mettrePhoto = async (photo: string | null) => {
    setFeuille(null)
    setARogner(null)
    if (o.enregistrerPhoto) await o.enregistrerPhoto(photo)
    else ecrireCompte(o.app, () => ({ photo }))
    dire(tk(photo ? 'Photo de profil enregistrée : elle se voit partout.' : 'Photo retirée : vos initiales s’affichent.'))
  }
  const mettreCouverture = (couverture: string | null) => {
    setFeuille(null)
    setARogner(null)
    ecrireCompte(o.app, () => ({ couverture }))
    dire(tk(couverture ? 'Couverture enregistrée.' : 'Couverture retirée.'))
  }
  const ouvrirChoix = (forme: Forme, f: () => void) => (setFormeChoisie(forme), f())

  // ── Nom (mot de passe demandé) ──
  const enregistrerNom = () => {
    if (!prenom.trim()) return setErreur('Le prénom est demandé.')
    if (mdpNom !== c.motDePasse) return setErreur('Mot de passe incorrect.')
    ecrireCompte(o.app, () => ({ prenom: prenom.trim(), nom: nom.trim() }))
    setMdpNom('')
    setOuvert(null)
    dire(tk('Nom enregistré.'), 'Le nom de votre compte a changé.')
  }
  // ── Numéro et e-mail : code à 6 chiffres envoyé au nouveau numéro, à la nouvelle adresse ──
  const envoyer = (quoi: 'tel' | 'email') => {
    if (quoi === 'tel') {
      if (!telValide(tel)) return setErreur('Un numéro du Cameroun a 9 chiffres et commence par 6.')
      if (chiffres(tel) === chiffres(id.telephone)) return setErreur('C’est déjà le numéro du compte.')
      setEtape({ quoi, valeur: chiffres(tel), code: '', err: null })
    } else {
      if (!emailValide(email)) return setErreur('Cette adresse e-mail ne semble pas complète.')
      if (email.trim().toLowerCase() === (id.email ?? '').toLowerCase()) return setErreur('C’est déjà l’adresse du compte.')
      if (mdpEmail !== c.motDePasse) return setErreur('Mot de passe incorrect.')
      setEtape({ quoi, valeur: email.trim().toLowerCase(), code: '', err: null })
    }
    setErreur(null)
  }
  const confirmer = () => {
    if (!etape) return
    if (etape.code !== CODE_DEMO) return setEtape({ ...etape, err: 'Ce code ne correspond pas : vérifiez-le.' })
    if (etape.quoi === 'tel') {
      ecrireCompte(o.app, () => ({ telephone: etape.valeur }))
      dire(tk('Numéro vérifié et enregistré.'), 'Le numéro de votre compte a changé.')
      setTel('')
    } else {
      ecrireCompte(o.app, () => ({ email: etape.valeur }))
      dire(tk('Adresse e-mail confirmée et enregistrée.'), 'L’adresse e-mail de votre compte a changé.')
      setEmail('')
      setMdpEmail('')
    }
    setEtape(null)
    setOuvert(null)
  }
  // ── Mot de passe ──
  const changerMdp = () => {
    if (ancien !== c.motDePasse) return setErreur('Votre mot de passe actuel ne correspond pas.')
    if (!mdpSolide(nouveau)) return setErreur('Le nouveau mot de passe ne suit pas encore les règles.')
    ecrireCompte(o.app, () => ({ motDePasse: nouveau }))
    setAncien('')
    setNouveau('')
    setOuvert(null)
    dire(tk('Mot de passe changé. Vos autres appareils sont déconnectés.'), 'Le mot de passe de votre compte a changé.')
  }
  // ── Fin du compte ──
  const finir = () => {
    if (o.fin.genre === 'depart') return
    if (mdpFin !== c.motDePasse) return setErreur('Mot de passe incorrect.')
    ecrireCompte(o.app, () => ({ desactive: o.fin.genre === 'supprimer' ? 'supprime' : 'desactive', retenu: false }))
    setMdpFin('')
    setFeuille(null)
    o.apresFin?.()
  }

  const ligne = (icone: string, texte: string, faire: () => void, rouge?: boolean, test?: string) => (
    <button type="button" className="ck-li" data-ck={test} onClick={faire} style={rouge ? { color: 'var(--ck-red)' } : undefined}>
      <Ic n={icone} s={20} />
      <span className="ck-t">{texte}</span>
    </button>
  )
  const err = erreur && (
    <Note ton="err">
      {tk(erreur)}
    </Note>
  )
  const codeEnCours = (quoi: 'tel' | 'email'): ReactNode =>
    etape?.quoi === quoi && (
      <>
        <ChampCode vers={quoi === 'tel' ? masquerTel(etape.valeur) : etape.valeur} valeur={etape.code} changer={(v) => setEtape({ ...etape, code: v, err: null })} err={etape.err} />
        <div className="ck-actions">
          <button type="button" className="ck-btn" data-ck="confirmer-code" onClick={confirmer}>
            <Ic n="check" />
            {tk('Confirmer')}
          </button>
          <button type="button" className="ck-btn sec" onClick={() => setEtape(null)}>
            {tk('Modifier')}
          </button>
        </div>
      </>
    )

  return (
    <>
      {/* En-tête : photo (et couverture), actions principales */}
      <div className="ck-card" data-ck="tete">
        {o.couverture && <div className="ck-couv">{id.couverture && <img src={id.couverture} alt={tk('Photo de couverture')} />}</div>}
        <div className="ck-tete">
          <Avatar photo={id.photo} prenom={id.prenom} nom={id.nom} taille={72} label={tk('Photo de profil')} />
          <div style={{ minWidth: 0 }}>
            <div className="ck-nom">{nomComplet}</div>
            <div className="ck-sous">{[masquerTel(id.telephone), id.email ? masquerEmail(id.email) : null].filter(Boolean).join(' · ')}</div>
            {google && (
              <div className="ck-sous" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <span className="ck-g">
                <LogoGoogle taille={14} />
              </span>
                {tk('Associé à Google')}
              </div>
            )}
          </div>
        </div>
        <div className="ck-actions">
          <button type="button" className="ck-btn petit" data-ck="changer-photo" onClick={() => setFeuille('photo')}>
            <Ic n="camera" s={17} />
            {tk(id.photo ? 'Changer la photo' : 'Ajouter une photo')}
          </button>
          {o.couverture && (
            <button type="button" className="ck-btn sec petit" data-ck="changer-couverture" onClick={() => setFeuille('couverture')}>
              <Ic n="image" s={17} />
              {tk(id.couverture ? 'Changer la couverture' : 'Ajouter une couverture')}
            </button>
          )}
        </div>
        <Note icone="eye">{tk(o.photoVuePar)}</Note>
        {choix.erreur && <Note ton="err">{tk(choix.erreur)}</Note>}
        {dit && (
          <Note ton="ok">
            {dit}
          </Note>
        )}
      </div>

      <div className="ck-card" style={{ paddingTop: 4, paddingBottom: 4 }}>
        <Repli id="nom" icone="user-round" titre={tk('Nom')} sous={nomComplet} ouvert={ouvert === 'nom'} basculer={basculer('nom')}>
          {o.nomFixe ? (
            <Note>{tk(o.nomFixe)}</Note>
          ) : (
            <>
              <Champ label={tk('Prénom')} valeur={prenom} changer={setPrenom} auto="given-name" nomTest="prenom" />
              <Champ label={tk('Nom')} valeur={nom} changer={setNom} auto="family-name" nomTest="nom" />
              <ChampMdp label={tk('Votre mot de passe, pour confirmer')} valeur={mdpNom} changer={setMdpNom} nomTest="mdp-confirmer" />
              {err}
              <div className="ck-actions">
                <button type="button" className="ck-btn" data-ck="enregistrer-nom" onClick={enregistrerNom}>
                  {tk('Enregistrer')}
                </button>
              </div>
            </>
          )}
        </Repli>
        <Repli id="tel" icone="smartphone" titre={tk('Numéro de téléphone')} sous={masquerTel(id.telephone)} ouvert={ouvert === 'tel'} basculer={basculer('tel')}>
          {etape?.quoi === 'tel' ? (
            codeEnCours('tel')
          ) : (
            <>
              <Champ label={tk('Nouveau numéro')} valeur={tel} changer={setTel} type="tel" mode="tel" auto="tel-national" prefixe="+237" nomTest="tel" />
              {err}
              <div className="ck-actions">
                <button type="button" className="ck-btn" data-ck="envoyer-code-tel" onClick={() => envoyer('tel')}>
                  {tk('Recevoir un code par SMS')}
                </button>
              </div>
              <Note>{tk('Le code part au nouveau numéro : il prouve qu’il est à vous.')}</Note>
            </>
          )}
        </Repli>
        <Repli id="email" icone="mail" titre={tk('E-mail')} sous={id.email ? masquerEmail(id.email) : tk('Pas encore d’e-mail')} ouvert={ouvert === 'email'} basculer={basculer('email')}>
          {etape?.quoi === 'email' ? (
            codeEnCours('email')
          ) : (
            <>
              <Champ label={tk('Nouvelle adresse e-mail')} valeur={email} changer={setEmail} type="email" mode="email" auto="email" nomTest="email" />
              <ChampMdp label={tk('Votre mot de passe, pour confirmer')} valeur={mdpEmail} changer={setMdpEmail} nomTest="mdp-email" />
              {err}
              <div className="ck-actions">
                <button type="button" className="ck-btn" data-ck="envoyer-code-email" onClick={() => envoyer('email')}>
                  {tk('Recevoir un code à cette adresse')}
                </button>
              </div>
              {google && <Note>{tk('Associé à Google : la nouvelle adresse vaut aussi pour la connexion avec Google.')}</Note>}
            </>
          )}
        </Repli>
        <Repli id="mdp" icone="key-round" titre={tk('Mot de passe')} sous={tk('Pour vous connecter avec votre e-mail ou votre numéro')} ouvert={ouvert === 'mdp'} basculer={basculer('mdp')}>
          <ChampMdp label={tk('Mot de passe actuel')} valeur={ancien} changer={setAncien} nomTest="mdp-ancien" />
          <ChampMdp label={tk('Nouveau mot de passe')} valeur={nouveau} changer={setNouveau} regles auto="new-password" nomTest="mdp-nouveau" />
          {err}
          <div className="ck-actions">
            <button type="button" className="ck-btn" data-ck="changer-mdp" aria-disabled={!mdpSolide(nouveau) || !ancien} onClick={changerMdp}>
              {tk('Changer le mot de passe')}
            </button>
          </div>
        </Repli>
        <Repli id="google" icone="link" titre={tk('Compte Google')} sous={google ? google.email : tk('Pas associé')} ouvert={ouvert === 'google'} basculer={basculer('google')}>
          <BlocGoogle app={o.app} depart={o.depart} enregistrerPhoto={o.enregistrerPhoto} dire={dire} />
        </Repli>
        <Repli id="appareil" icone="shield-check" titre={tk('Cet appareil')} sous={tk(c.retenu ? 'Retenu : l’e-mail suffit au retour' : 'Pas retenu')} ouvert={ouvert === 'appareil'} basculer={basculer('appareil')}>
          <label className="ck-chk">
            <input type="checkbox" checked={c.retenu} onChange={(e) => ecrireCompte(o.app, () => ({ retenu: e.target.checked }))} />
            {tk('Se souvenir de cet appareil')}
          </label>
          <Note>{tk('Au retour, votre e-mail suffit : le compte est reconnu et sa photo affichée. À éviter sur un téléphone partagé.')}</Note>
        </Repli>
      </div>

      {c.avis.length > 0 && (
        <div className="ck-card" aria-label={tk('Avis envoyés')} style={{ paddingTop: 8, paddingBottom: 8 }}>
          <div className="ck-sous" style={{ fontWeight: 700, marginBottom: 2 }}>
            {tk('Derniers avis envoyés')}
          </div>
          {c.avis.slice(0, 3).map((a) => (
            <div key={a.id} className="ck-avis">
              <Ic n="bell" s={15} />
              <span>{tk(a.texte)}</span>
            </div>
          ))}
        </div>
      )}

      {o.fin.genre === 'depart' ? (
        <button type="button" className="ck-discret" data-ck="fin" onClick={o.fin.vers}>
          {tk(o.fin.texte)}
        </button>
      ) : (
        <button type="button" className="ck-discret" data-ck="fin" onClick={() => (setErreur(null), setFeuille('fin'))}>
          {tk(o.fin.genre === 'supprimer' ? 'Supprimer mon compte' : 'Désactiver mon compte')}
        </button>
      )}

      {/* Feuilles */}
      <Modale ouverte={feuille === 'photo' || feuille === 'couverture'} fermer={() => setFeuille(null)} titre={tk(feuille === 'couverture' ? 'Photo de couverture' : 'Photo de profil')}>
        <h2>{tk(feuille === 'couverture' ? 'Photo de couverture' : 'Photo de profil')}</h2>
        <p className="ck-sous">{tk(feuille === 'couverture' ? o.couverture?.aide ?? '' : 'Recadrée dans un cercle, allégée sur ce téléphone.')}</p>
        <div style={{ marginTop: 8 }}>
          {ligne('camera', tk('Prendre une photo'), () => ouvrirChoix(feuille === 'couverture' ? 'couverture' : 'rond', choix.camera), false, 'prendre')}
          {ligne('image', tk('Choisir dans la galerie'), () => ouvrirChoix(feuille === 'couverture' ? 'couverture' : 'rond', choix.galerie), false, 'galerie')}
          {feuille === 'photo' && photoGoogle && (
            <button type="button" className="ck-li" data-ck="photo-google" onClick={() => void mettrePhoto(photoGoogle)}>
              <span className="ck-g">
                <LogoGoogle taille={14} />
              </span>
              <span className="ck-t">{tk('Utiliser la photo de votre compte Google')}</span>
            </button>
          )}
          {feuille === 'photo' && id.photo && ligne('trash-2', tk('Retirer la photo'), () => void mettrePhoto(null), true, 'retirer-photo')}
          {feuille === 'couverture' && id.couverture && ligne('trash-2', tk('Retirer la couverture'), () => mettreCouverture(null), true, 'retirer-couverture')}
        </div>
        <button type="button" className="ck-btn sec plein" style={{ marginTop: 12 }} onClick={() => setFeuille(null)}>
          {tk('Annuler')}
        </button>
      </Modale>
      <Modale ouverte={!!aRogner} fermer={() => setARogner(null)} titre={tk('Recadrer')}>
        {aRogner && <Recadrage img={aRogner.img} forme={aRogner.forme} annuler={() => setARogner(null)} utiliser={(u) => (aRogner.forme === 'couverture' ? mettreCouverture(u) : void mettrePhoto(u))} />}
      </Modale>
      <Modale ouverte={feuille === 'fin'} fermer={() => setFeuille(null)} titre={tk('Fin du compte')}>
        <h2>{tk(o.fin.genre === 'supprimer' ? 'Supprimer votre compte ?' : 'Désactiver votre compte ?')}</h2>
        <p className="ck-sous">{o.fin.genre !== 'depart' ? tk(o.fin.consequence) : ''}</p>
        <ChampMdp label={tk('Votre mot de passe, pour confirmer')} valeur={mdpFin} changer={setMdpFin} nomTest="mdp-fin" />
        {err}
        <div className="ck-pile" style={{ marginTop: 14 }}>
          <button type="button" className="ck-btn rouge plein" data-ck="confirmer-fin" onClick={finir}>
            {tk(o.fin.genre === 'supprimer' ? 'Supprimer définitivement' : 'Désactiver')}
          </button>
          <button type="button" className="ck-btn sec plein" onClick={() => setFeuille(null)}>
            {tk('Annuler')}
          </button>
        </div>
      </Modale>
      {choix.entrees}
    </>
  )
}

/**
 * Compte Google : « Associer mon compte Google » (choix du compte du téléphone, photo reprise si on le veut), puis
 * connexion possible des deux façons, nom, photo et e-mail synchronisés ; « Dissocier » avec le mot de passe.
 * Utilisé seul par le vendeur (Mon profil) ; `enregistrerPhoto` : la photo passe par l'application ; `sansPhoto` :
 * l'application reprend la photo par son propre parcours (code SMS), pas ici.
 */
export function BlocGoogle({ app, depart, enregistrerPhoto, sansPhoto, dire }: { app: AppCompte; depart: IdentiteDepart; enregistrerPhoto?: (p: string | null) => Promise<void> | void; sansPhoto?: boolean; dire?: (texte: string, avis?: string) => void }) {
  const { tk, tkf } = useTk()
  const c = useCompteDemo(app)
  const id = identite(app, depart)
  const google = c.google
  const [feuille, setFeuille] = useState<'associer' | 'dissocier' | null>(null)
  const [reprendre, setReprendre] = useState(!sansPhoto)
  const [mdp, setMdp] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [dit, setDit] = useState<string | null>(null)
  const annoncer = (texte: string, avis: string) => (dire ? dire(texte, avis) : (setDit(texte), aviser(app, avis)))
  const gTel = googleDuTelephone(id.prenom, id.nom, id.email)
  const associer = () => {
    ecrireCompte(app, () => ({ google: gTel, email: id.email ?? gTel.email, ...(reprendre && !sansPhoto && !enregistrerPhoto ? { photo: gTel.photo } : {}) }))
    if (reprendre && !sansPhoto && enregistrerPhoto) void enregistrerPhoto(gTel.photo)
    setFeuille(null)
    annoncer(tk('Compte Google associé : vous vous connectez avec Google ou avec votre e-mail.'), 'Un compte Google a été associé à votre compte.')
  }
  const dissocier = () => {
    if (mdp !== c.motDePasse) return setErreur('Mot de passe incorrect.')
    ecrireCompte(app, () => ({ google: null }))
    setMdp('')
    setFeuille(null)
    annoncer(tk('Compte Google dissocié : votre e-mail et votre mot de passe restent.'), 'Le compte Google a été dissocié de votre compte.')
  }
  return (
    <>
      {google ? (
        <>
          <Note ton="ok">{tk('Connexion possible avec Google ou avec votre e-mail et mot de passe. Nom, photo et e-mail restent les mêmes des deux côtés.')}</Note>
          <div className="ck-sous" style={{ marginTop: 6 }}>
            {google.email}
          </div>
          <div className="ck-actions">
            <button type="button" className="ck-btn sec petit" data-ck="dissocier-google" onClick={() => (setErreur(null), setFeuille('dissocier'))}>
              {tk('Dissocier')}
            </button>
          </div>
        </>
      ) : (
        <>
          <Note>{tk('Associez votre compte Google : vous vous connecterez d’un geste, et votre nom, votre photo et votre e-mail resteront synchronisés.')}</Note>
          <div className="ck-actions">
            <button type="button" className="ck-btn" data-ck="associer-google" onClick={() => setFeuille('associer')}>
              <span className="ck-g">
                <LogoGoogle taille={14} />
              </span>
              {tk('Associer mon compte Google')}
            </button>
          </div>
        </>
      )}
      {dit && <Note ton="ok">{dit}</Note>}
      <Modale ouverte={feuille === 'associer'} fermer={() => setFeuille(null)} titre={tk('Compte Google du téléphone')}>
        <h2>{tk('Choisissez un compte Google')}</h2>
        <p className="ck-sous">{tk('Google partage seulement votre nom, votre e-mail et votre photo.')}</p>
        <button type="button" className="ck-li" data-ck="google-compte" onClick={associer}>
          <Avatar photo={gTel.photo} prenom={id.prenom} nom={id.nom} taille={40} />
          <span className="ck-t">
            {gTel.nom}
            <span className="ck-sous" style={{ display: 'block', fontWeight: 400 }}>
              {gTel.email}
            </span>
          </span>
        </button>
        {!sansPhoto && (
          <label className="ck-chk">
            <input type="checkbox" checked={reprendre} onChange={(e) => setReprendre(e.target.checked)} />
            {tk('Utiliser la photo de mon compte Google')}
          </label>
        )}
        <Note>{tkf('Démonstration : compte Google dessiné, aucune vraie personne ({e}).', { e: gTel.email })}</Note>
      </Modale>
      <Modale ouverte={feuille === 'dissocier'} fermer={() => setFeuille(null)} titre={tk('Dissocier Google')}>
        <h2>{tk('Dissocier votre compte Google ?')}</h2>
        <p className="ck-sous">{tk('Vous vous connecterez avec votre e-mail ou votre numéro et votre mot de passe.')}</p>
        <ChampMdp label={tk('Votre mot de passe, pour confirmer')} valeur={mdp} changer={setMdp} nomTest="mdp-dissocier" />
        {erreur && <Note ton="err">{tk(erreur)}</Note>}
        <div className="ck-pile" style={{ marginTop: 14 }}>
          <button type="button" className="ck-btn rouge plein" data-ck="confirmer-dissocier" onClick={dissocier}>
            {tk('Dissocier')}
          </button>
          <button type="button" className="ck-btn sec plein" onClick={() => setFeuille(null)}>
            {tk('Annuler')}
          </button>
        </div>
      </Modale>
    </>
  )
}

/** Photo du compte Google associé (ou du compte Google de l'adresse Gmail) : null s'il n'y en a pas. */
export function photoGoogleDe(app: AppCompte, depart: IdentiteDepart): string | null {
  const c = lireCompte(app)
  const id = identite(app, depart)
  return c.google?.photo ?? (id.email && /@gmail\.com$/i.test(id.email) ? googleDuTelephone(id.prenom, id.nom, id.email).photo : null)
}
