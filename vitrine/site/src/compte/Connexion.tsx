// Connexion par e-mail du kit partagé (livreur, point relais ; le lien et la carte « compte reconnu » repris par le
// client et le vendeur) :
// - e-mail OU numéro, puis mot de passe (afficher/masquer) ; « Se souvenir de cet appareil » ;
// - appareil retenu : au retour, l'e-mail suffit — le compte est reconnu, sa photo affichée, « Continuer » ;
// - « Recevoir un lien de connexion par e-mail » : sans mot de passe ; en démonstration, le lien s'ouvre depuis la
//   feuille « Ouvrir l'e-mail » ;
// - « Mot de passe oublié ? » : code par e-mail ou par SMS, puis nouveau mot de passe (avis envoyé) ;
// - « Continuer avec Google » : possible une fois le compte Google associé (Mon compte), les deux restent synchronisés.
import { LogoGoogle } from './logos'
import { useState } from 'react'
import { env } from '../config/env'
import { AIDE_CONNEXION_KIT } from '../demo/valeurs-essai'
import { CODE_DEMO, aviser, chiffres, ecrireCompte, emailValide, identite, lireCompte, masquerEmail, masquerTel, mdpSolide, useCompteDemo, type AppCompte, type IdentiteDepart } from './etat'
import { Avatar, Champ, ChampCode, ChampMdp, Ic, Modale, Note, Ou, useTk } from './socle'

export type Par = 'mdp' | 'lien' | 'google' | 'retour'

/** Le compte que désigne un identifiant (e-mail du compte, e-mail Google associé, ou numéro). */
export function compteDe(app: AppCompte, depart: IdentiteDepart, saisi: string): boolean {
  const c = lireCompte(app)
  if (c.desactive === 'supprime') return false
  const id = identite(app, depart)
  const s = saisi.trim().toLowerCase()
  if (!s) return false
  if (s.includes('@')) return s === (id.email ?? '').toLowerCase() || s === (c.google?.email ?? '').toLowerCase()
  return chiffres(s) === chiffres(id.telephone)
}

/** Lien de connexion par e-mail : envoi, puis la feuille « Ouvrir l'e-mail » (démonstration) qui ouvre la session. */
/** Lien de connexion par e-mail servi par le serveur (mode api) : la demande part, la réponse est la même qu'un compte
 * existe ou non ; le lien arrive dans la vraie boîte de réception. */
export function LienServeur({ email, demander, pret }: { email: string; demander: (email: string) => Promise<{ destination: string; valideMinutes: number }>; pret?: () => string | null }) {
  const { tk, tkf } = useTk()
  const [envoye, setEnvoye] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const envoyer = async () => {
    const e = (pret?.() ?? email).trim()
    if (!emailValide(e)) return setErr('Écrivez d’abord votre adresse e-mail.')
    setErr(null)
    setEnvoi(true)
    try {
      setEnvoye((await demander(e)).destination)
    } finally {
      setEnvoi(false)
    }
  }
  return (
    <>
      {!envoye ? (
        <button type="button" className="ck-btn sec plein" data-ck="lien-magique" disabled={envoi} onClick={() => void envoyer()}>
          <Ic n="mail" />
          {tk('Recevoir un lien de connexion par e-mail')}
        </button>
      ) : (
        <div className="ck-card" role="status" data-ck="lien-envoye">
          <Note ton="ok" icone="mail">
            {tkf('Si un compte correspond, un lien de connexion part à {e}. Il vaut 15 minutes et ne sert qu’une fois.', { e: envoye })}
          </Note>
          <div className="ck-actions">
            <button type="button" className="ck-btn lien" onClick={() => setEnvoye(null)}>
              {tk('Changer d’adresse')}
            </button>
          </div>
        </div>
      )}
      {err && <Note ton="err">{tk(err)}</Note>}
    </>
  )
}

export function LienMagique({ app, depart, email, ouvrir, pret }: { app: AppCompte; depart: IdentiteDepart; email: string; ouvrir: () => void; pret?: () => string | null }) {
  const { tk, tkf } = useTk()
  const [envoye, setEnvoye] = useState<string | null>(null)
  const [boite, setBoite] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const connu = envoye ? compteDe(app, depart, envoye) : false
  const envoyer = () => {
    const e = (pret?.() ?? email).trim()
    if (!emailValide(e)) return setErr('Écrivez d’abord votre adresse e-mail.')
    setErr(null)
    setEnvoye(e.toLowerCase())
  }
  return (
    <>
      {!envoye ? (
        <button type="button" className="ck-btn sec plein" data-ck="lien-magique" onClick={envoyer}>
          <Ic n="mail" />
          {tk('Recevoir un lien de connexion par e-mail')}
        </button>
      ) : (
        <div className="ck-card" role="status" data-ck="lien-envoye">
          <Note ton="ok" icone="mail">
            {tkf('Si un compte correspond, un lien de connexion part à {e}. Il vaut 15 minutes et ne sert qu’une fois.', { e: masquerEmail(envoye) })}
          </Note>
          <div className="ck-actions">
            <button type="button" className="ck-btn" data-ck="ouvrir-email" onClick={() => setBoite(true)}>
              <Ic n="mail" />
              {tk('Ouvrir l’e-mail')}
            </button>
            <button type="button" className="ck-btn lien" onClick={() => setEnvoye(null)}>
              {tk('Changer d’adresse')}
            </button>
          </div>
        </div>
      )}
      {err && <Note ton="err">{tk(err)}</Note>}
      <Modale ouverte={boite} fermer={() => setBoite(false)} titre={tk('Boîte de réception')}>
        <h2>{tk('Boîte de réception')}</h2>
        <p className="ck-sous">{tkf('Démonstration : les e-mails reçus à {e}.', { e: masquerEmail(envoye ?? '') })}</p>
        {connu ? (
          <div className="ck-mail">
            <small>{tk('De : BelivaY · à l’instant')}</small>
            <b style={{ display: 'block', margin: '4px 0 6px' }}>{tk('Votre lien de connexion')}</b>
            <div className="ck-sous" style={{ marginBottom: 10 }}>
              {tk('Touchez le bouton pour vous connecter sur ce téléphone. Ce n’est pas vous ? Ignorez cet e-mail : rien ne change.')}
            </div>
            <button type="button" className="ck-btn plein" data-ck="me-connecter-lien" onClick={() => (setBoite(false), ouvrir())}>
              <Ic n="log-in" />
              {tk('Me connecter')}
            </button>
          </div>
        ) : (
          <Note>{tk('Aucun e-mail : cette adresse n’a pas de compte ici.')}</Note>
        )}
      </Modale>
    </>
  )
}

/** Mot de passe oublié : un code par e-mail ou par SMS, puis le nouveau mot de passe. */
export function FeuilleOubli({ app, depart, ouverte, fermer, fini }: { app: AppCompte; depart: IdentiteDepart; ouverte: boolean; fermer: () => void; fini: () => void }) {
  const { tk } = useTk()
  const id = identite(app, depart)
  const [canal, setCanal] = useState<'email' | 'sms' | null>(null)
  const [code, setCode] = useState('')
  const [codeOk, setCodeOk] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [nouveau, setNouveau] = useState('')
  const quitter = () => (setCanal(null), setCode(''), setCodeOk(false), setNouveau(''), setErr(null), fermer())
  const vers = canal === 'email' ? masquerEmail(id.email) : masquerTel(id.telephone)
  return (
    <Modale ouverte={ouverte} fermer={quitter} titre={tk('Mot de passe oublié')}>
      <h2>{tk('Mot de passe oublié')}</h2>
      {!canal ? (
        <>
          <p className="ck-sous">{tk('Recevez un code pour choisir un nouveau mot de passe.')}</p>
          {id.email && (
            <button type="button" className="ck-li" data-ck="oubli-email" onClick={() => setCanal('email')}>
              <Ic n="mail" s={20} />
              <span className="ck-t">
                {tk('Par e-mail')}
                <span className="ck-sous" style={{ display: 'block', fontWeight: 400 }}>
                  {masquerEmail(id.email)}
                </span>
              </span>
            </button>
          )}
          <button type="button" className="ck-li" data-ck="oubli-sms" onClick={() => setCanal('sms')}>
            <Ic n="message-square" s={20} />
            <span className="ck-t">
              {tk('Par SMS')}
              <span className="ck-sous" style={{ display: 'block', fontWeight: 400 }}>
                {masquerTel(id.telephone)}
              </span>
            </span>
          </button>
        </>
      ) : !codeOk ? (
        <>
          <ChampCode vers={vers} valeur={code} changer={(v) => (setCode(v), setErr(null))} err={err} />
          <button type="button" className="ck-btn plein" style={{ marginTop: 12 }} data-ck="oubli-valider" onClick={() => (code === CODE_DEMO ? setCodeOk(true) : setErr('Ce code ne correspond pas : vérifiez-le.'))}>
            {tk('Continuer')}
          </button>
        </>
      ) : (
        <>
          <ChampMdp label={tk('Nouveau mot de passe')} valeur={nouveau} changer={setNouveau} regles auto="new-password" nomTest="oubli-nouveau" />
          <button
            type="button"
            className="ck-btn plein"
            style={{ marginTop: 12 }}
            data-ck="oubli-enregistrer"
            aria-disabled={!mdpSolide(nouveau)}
            onClick={() => {
              if (!mdpSolide(nouveau)) return
              ecrireCompte(app, () => ({ motDePasse: nouveau }))
              aviser(app, 'Le mot de passe de votre compte a changé.')
              quitter()
              fini()
            }}
          >
            {tk('Enregistrer le mot de passe')}
          </button>
        </>
      )}
      <Note icone="shield-check">{tk('BelivaY ne vous demande jamais votre mot de passe ni un code par téléphone.')}</Note>
    </Modale>
  )
}

/** Carte « compte reconnu » : appareil retenu, l'e-mail saisi est celui du compte (photo affichée, « Continuer »). */
export function CompteReconnu({ app, depart, continuer, autre }: { app: AppCompte; depart: IdentiteDepart; continuer: () => void; autre?: () => void }) {
  const { tk, tkf } = useTk()
  const id = identite(app, depart)
  return (
    <div className="ck-card" data-ck="reconnu">
      <div className="ck-tete">
        <Avatar photo={id.photo} prenom={id.prenom} nom={id.nom} taille={56} label={tk('Photo de profil')} />
        <div style={{ minWidth: 0 }}>
          <div className="ck-nom">{tkf('Bon retour, {p}', { p: id.prenom })}</div>
          <div className="ck-sous">{masquerEmail(id.email)}</div>
        </div>
      </div>
      <div className="ck-pile" style={{ marginTop: 12 }}>
        <button type="button" className="ck-btn plein" data-ck="continuer-reconnu" onClick={continuer}>
          <Ic n="log-in" />
          {tk('Continuer')}
        </button>
        {autre && (
          <button type="button" className="ck-btn lien plein" onClick={autre}>
            {tk('Ce n’est pas moi')}
          </button>
        )}
      </div>
      <Note icone="shield-check">{tk('Cet appareil est retenu : votre e-mail suffit.')}</Note>
    </div>
  )
}

/** Bloc complet « Se connecter avec un e-mail ou un numéro ». */
export function ConnexionCompte({ app, depart, ouvrir }: { app: AppCompte; depart: IdentiteDepart; ouvrir: (par: Par) => void }) {
  const { tk } = useTk()
  const c = useCompteDemo(app)
  const id = identite(app, depart)
  const [saisi, setSaisi] = useState('')
  const [mdp, setMdp] = useState('')
  const [souvenir, setSouvenir] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [oubli, setOubli] = useState(false)
  const [google, setGoogle] = useState(false)
  const [pasMoi, setPasMoi] = useState(false)
  const reconnu = c.retenu && !pasMoi && c.desactive !== 'supprime' && saisi.includes('@') && compteDe(app, depart, saisi)
  const reprendre = () => c.desactive === 'desactive' && ecrireCompte(app, () => ({ desactive: null }))
  const fini = (par: Par) => {
    reprendre()
    if (par === 'mdp') ecrireCompte(app, () => ({ retenu: souvenir }))
    ouvrir(par)
  }
  const seConnecter = () => {
    if (!saisi.trim() || !mdp) return setErr('Écrivez votre e-mail ou votre numéro, puis votre mot de passe.')
    if (!compteDe(app, depart, saisi) || mdp !== c.motDePasse) return setErr('E-mail, numéro ou mot de passe incorrect.')
    fini('mdp')
  }
  return (
    <div data-ck="connexion">
      {c.retenu && !reconnu && !pasMoi && c.desactive !== 'supprime' && <Note icone="shield-check">{tk('Cet appareil est retenu : votre e-mail suffit.')}</Note>}
      <Champ label={tk('E-mail ou numéro')} valeur={saisi} changer={(v) => (setSaisi(v), setErr(null))} type="text" mode="email" auto="username" icone="user-round" nomTest="identifiant" err={!!err} />
      {reconnu ? (
        <CompteReconnu app={app} depart={depart} continuer={() => fini('retour')} autre={() => (setPasMoi(true), ecrireCompte(app, () => ({ retenu: false })))} />
      ) : (
        <>
          <ChampMdp label={tk('Mot de passe')} valeur={mdp} changer={(v) => (setMdp(v), setErr(null))} nomTest="mdp" err={!!err} />
          {err && <Note ton="err">{tk(err)}</Note>}
          {ok && <Note ton="ok">{tk(ok)}</Note>}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <label className="ck-chk">
              <input type="checkbox" checked={souvenir} data-ck="souvenir" onChange={(e) => setSouvenir(e.target.checked)} />
              {tk('Se souvenir de cet appareil')}
            </label>
            <button type="button" className="ck-btn lien" data-ck="oubli" onClick={() => setOubli(true)}>
              {tk('Mot de passe oublié ?')}
            </button>
          </div>
          <button type="button" className="ck-btn plein" style={{ marginTop: 12 }} data-ck="se-connecter" onClick={seConnecter}>
            <Ic n="log-in" />
            {tk('Se connecter')}
          </button>
          <Ou />
          <div className="ck-pile">
            <LienMagique app={app} depart={depart} email={saisi} ouvrir={() => fini('lien')} />
            <button type="button" className="ck-btn sec plein" data-ck="google" onClick={() => (c.google && c.desactive !== 'supprime' ? fini('google') : setGoogle(true))}>
              <span className="ck-g">
                <LogoGoogle taille={14} />
              </span>
              {tk('Continuer avec Google')}
            </button>
          </div>
          {/* Aide de la démonstration seulement (valeurs d'essai : src/demo/valeurs-essai.ts). */}
          {env.source !== 'api' && <Note>{tk(AIDE_CONNEXION_KIT) + (id.email ?? '') + tk(' ou numéro ') + masquerTel(id.telephone) + '.'}</Note>}
        </>
      )}
      <FeuilleOubli app={app} depart={depart} ouverte={oubli} fermer={() => setOubli(false)} fini={() => setOk('Mot de passe changé : connectez-vous avec le nouveau.')} />
      <Modale ouverte={google} fermer={() => setGoogle(false)} titre={tk('Continuer avec Google')}>
        <h2>{tk('Aucun compte associé')}</h2>
        <p className="ck-sous">{tk('Ce compte Google n’est encore associé à aucun compte ici. Connectez-vous avec votre e-mail ou votre numéro, puis associez-le dans Mon compte.')}</p>
        <button type="button" className="ck-btn plein" style={{ marginTop: 12 }} onClick={() => setGoogle(false)}>
          {tk('Compris')}
        </button>
      </Modale>
    </div>
  )
}
