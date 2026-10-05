// « Numéro et connexion » (DP-53) : tout ce qui sert à entrer dans le compte et à le protéger, au même endroit :
// numéro vérifié, façons de se connecter (Google, Apple, e-mail et mot de passe ; au moins une gardée), mot de
// passe, appareils connectés, dernières connexions, biométrie avant d'afficher un code, déconnexion.
// Ce qu'il faut au client (DP-54) : un compte Google ou Apple déjà pris refusé en clair, le mot de passe visible à
// la demande et ses deux règles cochées pendant la saisie (DP-04), l'alerte à chaque nouvelle connexion, le
// nombre d'appareils, et « Signaler au support » une connexion inconnue.
import { useEffect, useState } from 'react'
import { Feuille } from '../../composants/Feuille'
import { Icone } from '../../composants/Icone'
import { Aide, Bouton, Interrupteur, Ligne, Note, Section } from '../../composants/socle'
import { Styles } from '../../composants/Styles'
import { chemin } from '../../config/pages'
import { source, type DonneesSecurite, type MethodeConnexion } from '../../donnees/source'
import { F } from '../../i18n/format'
import { dateA, dateLongue } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { Bloc, EcranCompte } from '../CL-13/Larges'

const NOMS: Record<MethodeConnexion, string> = { google: 'Google', apple: 'Apple', email: 'E-mail et mot de passe' }

export function Securite() {
  const { t, tf, langue } = usePreferences()
  const [d, setD] = useState<DonneesSecurite | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [delier, setDelier] = useState<MethodeConnexion | null>(null)
  const [mdp, setMdp] = useState(false)
  const [ancien, setAncien] = useState('')
  const [nouveau, setNouveau] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [voir, setVoir] = useState(false) // mots de passe affichés en clair
  const charger = () => source.securite().then(setD)
  useEffect(() => {
    charger()
  }, [])
  if (!d) return null
  const m = d.methodes
  const dire = (texte: string) => (setMessage(texte), charger())

  const confirmerDelier = async () => {
    if (!delier) return
    const r = await source.delierMethode(delier)
    setDelier(null)
    dire(r.ok ? tf('{nom} ne sert plus à te connecter.', { nom: t(NOMS[delier]) }) : t('Garde au moins une façon de te connecter.'))
  }
  const enregistrerMdp = async () => {
    const r = await source.changerMotDePasse(m.motDePasse ? ancien : null, nouveau)
    if (!r.ok) return setErreur(r.raison === 'ancien' ? 'Ton mot de passe actuel ne correspond pas.' : 'Ton mot de passe : 8 caractères au moins, dont un chiffre.')
    setMdp(false)
    setVoir(false)
    setAncien('')
    setNouveau('')
    dire(t('Mot de passe enregistré. Tes autres appareils sont déconnectés.'))
  }

  const methode = (cle: 'google' | 'apple', icone: string) => {
    const lie = m[cle]
    return (
      <Ligne
        icone={icone}
        ton={lie ? 'green' : ''}
        titre={t(NOMS[cle])}
        sous={lie ? lie + (d.methodeActuelle === cle ? ' · ' + t('utilisé ici') : '') : t('Pas lié')}
        droite={
          <button type="button" className="btn ghost sm" style={{ width: 'auto' }} onClick={() =>
              lie
                ? setDelier(cle)
                : source
                    .lierMethode(cle)
                    .then((r) => dire(r.ok ? tf('Ton compte {nom} est lié.', { nom: NOMS[cle] }) : tf('Ce compte {nom} est déjà lié à un autre compte BelivaY.', { nom: NOMS[cle] })))
            }
          >
            {t(lie ? 'Délier' : 'Lier')}
          </button>
        }
      />
    )
  }

  const fixes = (
    <>
      <Feuille ouverte={delier !== null} fermer={() => setDelier(null)} titre={t('Délier')}>
        <h2 className="pg-t" style={{ fontSize: 19 }}>
          {tf('Ne plus te connecter avec {nom} ?', { nom: t(NOMS[delier ?? 'google']) })}
        </h2>
        <p className="pg-s">{t('Tes commandes et ton argent ne bougent pas. Tu pourras le lier de nouveau.')}</p>
        <div className="mt16">
          <Bouton genre="danger" onClick={confirmerDelier}>
            {t('Délier')}
          </Bouton>
        </div>
        <div className="mt10">
          <Bouton genre="ghost" onClick={() => setDelier(null)}>
            {t('Annuler')}
          </Bouton>
        </div>
      </Feuille>
      <Feuille ouverte={mdp} fermer={() => setMdp(false)} titre={t('Mot de passe')}>
        <h2 className="pg-t" style={{ fontSize: 19 }}>
          {t(m.motDePasse ? 'Changer mon mot de passe' : 'Créer un mot de passe')}
        </h2>
        <p className="pg-s">{t('Pour te connecter avec ton e-mail, sur un autre appareil.')}</p>
        {m.motDePasse && (
          <div className="fld">
            <label htmlFor="sec-ancien">{t('Mot de passe actuel')}</label>
            <div className="inp">
              <Icone nom="lock" taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
              <input id="sec-ancien" type={voir ? 'text' : 'password'} autoComplete="current-password" value={ancien} onChange={(e) => (setAncien(e.target.value), setErreur(null))} />
            </div>
          </div>
        )}
        <div className="fld">
          <label htmlFor="sec-nouveau">{t('Nouveau mot de passe')}</label>
          <div className={'inp' + (erreur ? ' err' : '')}>
            <Icone nom="key-round" taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
            <input id="sec-nouveau" type={voir ? 'text' : 'password'} autoComplete="new-password" value={nouveau} onChange={(e) => (setNouveau(e.target.value), setErreur(null))} />
            <button type="button" className="suf" aria-label={t(voir ? 'Masquer les mots de passe' : 'Afficher les mots de passe')} aria-pressed={voir} onClick={() => setVoir(!voir)} style={{ background: 'none', border: 0, color: 'var(--ink-3)' }}>
              <Icone nom={voir ? 'eye-off' : 'eye'} taille={18} />
            </button>
          </div>
          <div className="hint" role={erreur ? 'alert' : undefined} style={erreur ? { color: 'var(--red)' } : undefined}>
            {t(erreur ?? '8 caractères au moins, dont un chiffre.')}
          </div>
          {!erreur && nouveau && (
            <div className="hint">
              {[
                [nouveau.length >= 8, '8 caractères'],
                [/\d/.test(nouveau), 'un chiffre'],
              ].map(([ok, x]) => (
                <span key={x as string} style={{ color: ok ? 'var(--green)' : 'var(--ink-3)', marginRight: 10 }}>
                  <Icone nom={ok ? 'circle-check' : 'circle'} taille={13} style={{ verticalAlign: '-2px', marginRight: 3 }} />
                  {t(x as string)}
                </span>
              ))}
            </div>
          )}
        </div>
        {d.appareils.length > 1 && (
          <div className="hint-l">
            <Icone nom="log-out" taille={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{t('Une fois enregistré, tes autres appareils sont déconnectés.')}</span>
          </div>
        )}
        <div className="mt16">
          <Bouton icone="check" onClick={enregistrerMdp}>
            {t('Enregistrer')}
          </Bouton>
        </div>
        <div className="mt10">
          <Bouton genre="ghost" vers={chemin('mdp-oublie')}>
            {t('Mot de passe oublié ?')}
          </Bouton>
        </div>
      </Feuille>
    </>
  )

  return (
    <EcranCompte route="securite" fixes={fixes}>
      <Styles id="f16ded0d4c" />
      {message && (
        <Note ton="green" icone="circle-check">
          {message}
        </Note>
      )}
      <Bloc classe="c13-g2">
      <Bloc classe="c13-k">
      <Section titre={t('Ton numéro')} />
      <div className="card tight">
        <Ligne
          icone="smartphone"
          ton={d.numero.verifie ? 'green' : 'amber'}
          titre={d.numero.masque + ' · ' + d.numero.operateur}
          sous={
            d.numero.verifie
              ? d.numero.verifieLe
                ? tf('Vérifié le {d}', { d: dateLongue(d.numero.verifieLe, langue) })
                : t('Vérifié')
              : t('Pas encore vérifié : aucun SMS ne part')
          }
        />
        <Ligne icone="pencil" titre={t(d.numero.verifie ? 'Changer de numéro' : 'Vérifier mon numéro')} vers={chemin(d.numero.verifie ? 'numero-changer' : 'numero')} />
      </div>
      <Aide icone="shield-check">{t('Il sert à te connecter par code, à recevoir ton code de retrait et les SMS importants. Personne ne le voit : ni les vendeurs, ni les livreurs.')}</Aide>

      <Section titre={t('Comment tu te connectes')} />
      <div className="card tight">
        {methode('google', 'cl03-google')}
        {methode('apple', 'apple')}
        <Ligne
          icone="mail"
          ton={m.motDePasse ? 'green' : ''}
          titre={t(NOMS.email)}
          sous={d.email + ' · ' + t(m.motDePasse ? 'mot de passe défini' : 'aucun mot de passe')}
          droite={
            <button type="button" className="btn ghost sm" style={{ width: 'auto' }} onClick={() => setMdp(true)}>
              {t(m.motDePasse ? 'Changer' : 'Créer')}
            </button>
          }
        />
        {m.motDePasse && (
          <Ligne
            icone="key-round"
            titre={t('Ne plus utiliser de mot de passe')}
            droite={
              <button type="button" className="btn ghost sm" style={{ width: 'auto' }} onClick={() => setDelier('email')}>
                {t('Retirer')}
              </button>
            }
          />
        )}
      </div>
      <Aide>{t('Garde au moins une façon de te connecter. Une adresse e-mail, un seul compte.')}</Aide>

      <Section titre={d.appareils.length > 1 ? tf('Appareils connectés ({n})', { n: d.appareils.length }) : t('Appareils connectés')} />
      <div className="card tight">
        {d.appareils.map((a) => (
          <Ligne
            key={a.id}
            icone={a.nom.includes('ordinateur') ? 'monitor' : 'smartphone'}
            titre={a.nom}
            sous={(a.actuel ? t('Cet appareil') + ' · ' : '') + a.lieu + ' · ' + dateA(a.derniere, langue)}
            droite={
              !a.actuel && (
                <button type="button" className="btn ghost sm" style={{ width: 'auto' }} onClick={() => source.deconnecterAppareil(a.id).then(() => dire(tf('{nom} est déconnecté.', { nom: a.nom })))}>
                  {t('Déconnecter')}
                </button>
              )
            }
          />
        ))}
      </div>
      {d.appareils.length > 1 && (
        <div className="mt10">
          <Bouton genre="secondary" icone="log-out" onClick={() => source.deconnecterAutres().then(() => dire(t('Tes autres appareils sont déconnectés.')))}>
            {t('Déconnecter tous les autres appareils')}
          </Bouton>
        </div>
      )}

      </Bloc>
      <Bloc classe="c13-k">
      <Section titre={t('Sécurité du code de retrait')} />
      <div className="card tight">
        <Ligne
          icone="scan-face"
          titre={t('Face ID ou empreinte')}
          sous={tf('Demandés avant d’afficher le code d’une commande de {m} ou plus.', { m: F(d.seuilBiometrie) + ' F' })}
          droite={<Interrupteur actif={d.biometrie} aria={t('Face ID ou empreinte')} onClick={() => source.reglerBiometrie(!d.biometrie).then(charger)} />}
        />
      </div>

      <Section titre={t('Alertes')} />
      <div className="card tight">
        <Ligne
          icone="bell-ring"
          titre={t('Prévenir à chaque nouvelle connexion')}
          sous={tf('Un message au {n} quand ton compte s’ouvre sur un autre appareil.', { n: d.numero.masque })}
          droite={
            <Interrupteur
              actif={d.alerteConnexion}
              aria={t('Prévenir à chaque nouvelle connexion')}
              onClick={() => source.reglerAlerteConnexion(!d.alerteConnexion).then(() => dire(t(d.alerteConnexion ? 'Alerte de connexion éteinte.' : 'Alerte de connexion allumée.')))}
            />
          }
        />
      </div>

      <Section titre={t('Dernières connexions')} />
      <div className="card tight">
        {d.historique.length === 0 && <Ligne icone="history" titre={t('Aucune connexion enregistrée')} />}
        {d.historique.slice(0, 5).map((h) => (
          <Ligne key={h.le + h.appareil} icone="log-in" titre={t(NOMS[h.methode])} sous={h.appareil + ' · ' + h.lieu + ' · ' + dateA(h.le, langue)} />
        ))}
      </div>
      <Aide icone="circle-alert">{t('Une connexion que tu ne reconnais pas ? Change ton mot de passe et déconnecte tes autres appareils, puis écris au support.')}</Aide>
      <div className="mt10">
        <Bouton genre="ghost" icone="messages-square" vers={chemin('fil', { id: 'support', st: 'nouveau' })}>
          {t('Signaler une connexion au support')}
        </Bouton>
      </div>

      </Bloc>
      </Bloc>
      <div className="mt16">
        <Bouton
          genre="secondary"
          icone="log-out"
          onClick={async () => {
            await source.deconnecter()
            window.location.assign(chemin('accueil'))
          }}
        >
          {t('Me déconnecter de cet appareil')}
        </Bouton>
      </div>
      <Aide icone="shield-alert">{t('BelivaY ne te demande jamais ton mot de passe ni un code par téléphone.')}</Aide>
    </EcranCompte>
  )
}
