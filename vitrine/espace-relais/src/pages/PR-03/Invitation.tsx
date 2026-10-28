// Invitation d'un membre (PR-03 § 2) : ce que voit la personne invitée par le gérant depuis « Mon équipe », du lien SMS
// (« invitation?jeton=… », valable PR-INVITATION-H, INV-01) à sa première journée :
// 1. Bienvenue : qui invite, au relais de qui, ce qu'elle pourra faire selon les droits donnés (recevoir, remettre et
//    encaisser la garde, faire partir, fermeture imprévue du jour : INV-04, INV-07, ARL-06) et ce qu'elle ne verra pas
//    (l'argent du relais, les réglages : DRO-03) ; « Accepter l'invitation » ;
// 2. Code PIN personnel à PIN-LONGUEUR chiffres, deux saisies, codes trop simples refusés (INV-02, ARL-12) ;
// 3. Formation obligatoire : PR-FORMATION-MODULES modules avant la première remise (DRO-01, INV-03) ;
// 4. Prêt : au guichet (la remise reste fermée tant que la formation n'est pas finie, avec le motif).
// Lien expiré : « Demander une nouvelle invitation » (le gérant est prévenu, critère 1) ; lien déjà utilisé : se
// connecter avec son numéro et son PIN. Sans réseau : l'invitation s'accepte avec le réseau (lien vérifié).
// Structure du prototype (Invitation, états defaut, s2, s3, ok) : barre en 4 segments, héros « INVITATION », carte
// « Ce que vous pourrez faire », points et pavé du PIN, carte « Formation obligatoire », carte « Vous êtes prêt·e ».
// Présentation : cadre d'accès commun (compte/acces.tsx), ouvert depuis le lien discret de la connexion ou le SMS ;
// accroche et photo à la première étape, puis mode compact au téléphone. Retour vers la connexion.
// Comptes réels (source « hybride », site/COMPTES-REELS.md) : le même parcours, lu et activé sur le serveur par
// l'adaptateur (session-hybride.ts : accesHybride) ; « Accepter l'invitation » demande en plus le consentement explicite
// aux conditions et à la confidentialité (envoyé avec le PIN choisi).
import { useCallback, useState } from 'react'
import { hybride } from '@client/comptes-reels/hybride'
import { AccesConsentement } from '@client/compte/acces-reel'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Acces, AccesCadre, AccesTitre } from '@client/compte/acces'
import logo from '../../assets/logo-belivay.png'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { ACCUEIL, chemin } from '../../config/pages'
import type { Invitation as InvitationVue } from '../../donnees/domaines/acces'
import type { Droit } from '../../donnees/domaines/session'
import { origine, useEnLigne } from '../../donnees/fileHorsLigne'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { echeance } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useRelireSession, useSession } from '../../session'
import { Chargement, ErreurLecture, Note, Pave, PiedRelais, Points, Progression, useMaintenant, useSaisie } from './commun'
import { ACCES, CONNEXION, RELAIS_P } from './parametres'
import './pr03.css'

export default function Invitation() {
  const prefs = usePreferences()
  const { t } = prefs
  const [params, setParams] = useSearchParams()
  const jeton = params.get('jeton')
  const lecture = useLecture(() => (jeton ? source.acces.invitation(jeton) : Promise.resolve(null)).then((inv) => ({ inv })), [jeton])
  const [etape, setEtape] = useState<1 | 2 | 3 | 4>(1)
  const session = useSession()
  const [acceptee, setAcceptee] = useState(false)
  const etapes = [t('Bienvenue'), t('Code PIN'), t('Formation'), t('Prêt')]
  const inv = lecture.donnees?.inv ?? null

  // Invitation acceptée sur CE téléphone : la suite (formation, prêt) se lit dans la session.
  const accepteeIci = inv?.etat === 'utilisee' && (acceptee || session.membre?.prenom === inv.prenom)
  const vue = accepteeIci && etape < 3 ? 3 : etape

  // Première étape (code à taper, bienvenue) : l'accroche et la photo ; ensuite, le formulaire d'abord.
  const debut = !jeton || !inv || inv.etat !== 'valide' || vue === 1
  return (
    <Ecran route="invitation" entete="aucun">
      <AccesCadre
        acteur="relais"
        logo={logo}
        espace={t('Espace point relais')}
        reglages={prefs}
        compact={!debut}
        pied={<PiedRelais />}
        debut={
          <Link to={chemin('connexion')} className="axc-retour" aria-label={t('Revenir')}>
            <Icone nom="r-chevron-gauche" taille={24} trait={2.2} />
          </Link>
        }
      >
      <Acces>
      <div className="pr3 pr3-pile">
        <AccesTitre titre={t('Rejoindre un relais')} />
        {!jeton ? (
          <SansJeton ouvrir={(j) => setParams({ jeton: j })} />
        ) : lecture.erreur ? (
          <ErreurLecture relire={lecture.relire} />
        ) : !lecture.donnees ? (
          <Chargement />
        ) : !inv ? (
          <Introuvable />
        ) : (
          <>
            <Progression etapes={etapes} actuelle={inv.etat === 'valide' || accepteeIci ? vue : 1} />
            {inv.etat === 'expiree' ? (
              <Expiree inv={inv} jeton={jeton} relire={lecture.relire} />
            ) : inv.etat === 'retiree' ? (
              <Note ton="rouge">{t('Cette invitation a été retirée par le gérant.')}</Note>
            ) : inv.etat === 'utilisee' && !accepteeIci ? (
              <DejaUtilisee />
            ) : vue === 1 ? (
              <Bienvenue inv={inv} suite={() => setEtape(2)} />
            ) : vue === 2 ? (
              <CreerPin jeton={jeton} relire={lecture.relire} retour={() => setEtape(1)} accepte={() => (setAcceptee(true), setEtape(3))} />
            ) : vue === 3 ? (
              <Formation suite={() => setEtape(4)} />
            ) : (
              <Pret />
            )}
          </>
        )}
      </div>
      </Acces>
      </AccesCadre>
    </Ecran>
  )
}

/** Le lien n'existe pas (jeton faux ou coupé). */
function Introuvable() {
  const { t } = usePreferences()
  return (
    <div className="p-yi6rkz" role="alert">
      <div className="r-vide">
        <div className="r-vide-i r-rouge">
          <Icone nom="link-2-off" taille={28} />
        </div>
        <h2>{t('Invitation introuvable')}</h2>
        <p>{t('Ce lien ne correspond à aucune invitation. Vérifiez le SMS reçu, ou demandez au gérant de vous inviter à nouveau.')}</p>
      </div>
      <Link to={chemin('connexion')} className="p-rbzobc">
        {t('Aller à la connexion')}
      </Link>
    </div>
  )
}

/** Adresse sans jeton : le code de l'invitation se tape (il est écrit dans le SMS, sous le lien). */
function SansJeton({ ouvrir }: { ouvrir: (jeton: string) => void }) {
  const { t } = usePreferences()
  const [code, setCode] = useState('')
  return (
    <div className="p-yi6rkz">
      <div className="p-ug5qrn">{t('Le gérant vous invite depuis « Mon équipe » : vous recevez un SMS avec un lien. Touchez le lien, ou tapez ici le code d’invitation écrit dans le SMS.')}</div>
      <label className="p-ky12xr">
        {t('CODE D’INVITATION')}
        <input type="text" autoCapitalize="characters" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().trim())} onKeyDown={(e) => e.key === 'Enter' && code && ouvrir(code)} placeholder={t('INV-…')} className="p-afs6hh" />
      </label>
      <button type="button" className="p-ncx7qc" disabled={!code} onClick={() => ouvrir(code)}>
        {t('Ouvrir l’invitation')}
      </button>
      <Link to={chemin('connexion')} className="p-rbzobc">
        {t('J’ai déjà un code PIN : me connecter')}
      </Link>
    </div>
  )
}

const DROITS_VUS: Partial<Record<Droit, { icone: string; titre: string; texte: string }>> = {
  recevoir: { icone: 'r-colis', titre: 'Recevoir', texte: 'Code de dépôt du livreur, scan des colis, contrôle des scellés, photo du lot' },
  remettre: { icone: 'r-cle', titre: 'Remettre', texte: 'Vérifier les codes, encaisser la garde en espèces, prendre la photo de remise' },
  faire_partir: { icone: 'r-camion', titre: 'Faire partir', texte: 'Remettre au livreur les renvois, retours et transferts' },
  fermeture_jour: { icone: 'r-fermeture', titre: 'Fermeture imprévue', texte: 'Déclarer une fermeture pour aujourd’hui seulement' },
  historique: { icone: 'r-historique', titre: 'Historique', texte: 'Les opérations du relais, sans les montants des gains' },
}

function Bienvenue({ inv, suite }: { inv: InvitationVue; suite: () => void }) {
  const { t, tf, langue } = usePreferences()
  const enLigne = useEnLigne()
  const session = useSession()
  const lignes = (['recevoir', 'remettre', 'faire_partir', 'fermeture_jour', 'historique'] as Droit[]).filter((d) => inv.droits.includes(d) && DROITS_VUS[d])
  // Compte réel (hybride) : consentement explicite avant de créer l'accès.
  const [accepte, setAccepte] = useState(false)
  const [vu, setVu] = useState(false)
  return (
    <>
      <div className="p-g9jysb">
        <div className="p-svzvpz">{t('INVITATION')}</div>
        <div className="p-nu9kw5">{tf('{qui} vous invite au relais {relais} · {quartier}', { qui: inv.invitePar, relais: inv.relais, quartier: inv.quartier })}</div>
        <div className="p-g987ge">
          {tf('Bonjour {prenom}. Vous pourrez recevoir les colis des livreurs et les remettre aux clients. L’argent du relais et les réglages restent au gérant.', { prenom: inv.prenom })}{' '}
          {tf('Lien valable jusqu’à {quand}.', { quand: echeance(inv.expireLe, session.maintenant, langue) })}
        </div>
      </div>
      <div className="p-yi6rkz">
        <div className="p-unncbq">
          <h2 className="p-9j1bbu">{t('Ce que vous pourrez faire')}</h2>
        </div>
        {lignes.map((d) => {
          const x = DROITS_VUS[d]!
          return (
            <div key={d}>
              <div className="p-o24hsm">
                <div className="p-toppw8">
                  <Icone nom={x.icone} taille={20} className="p-672m16" />
                </div>
                <div className="p-rnqj8n">
                  <div className="p-ife3a2">{t(x.titre)}</div>
                  <div className="p-dfa05r">{t(x.texte)}</div>
                </div>
              </div>
              <div className="p-92xvtp" />
            </div>
          )
        })}
        <div className="p-o24hsm">
          <div className="p-yrqs2p">
            <Icone nom="r-cadenas" taille={20} className="p-2bmvtm" />
          </div>
          <div className="p-rnqj8n">
            <div className="p-ife3a2">{t('Pas d’accès à l’argent du relais')}</div>
            <div className="p-dfa05r">{t('Versements, gains, rapports, équipe et paramètres : gérant uniquement')}</div>
          </div>
        </div>
      </div>
      {!enLigne && <Note ton="ambre">{t('Hors connexion : l’invitation s’accepte avec le réseau.')}</Note>}
      {hybride && <AccesConsentement coche={accepte} changer={setAccepte} conditions="/cgu" confidentialite="/legal-doc?d=confidentialite" erreur={vu && !accepte} />}
      <button
        type="button"
        className="p-ncx7qc"
        disabled={!enLigne}
        onClick={() => {
          if (hybride && !accepte) {
            setVu(true)
            signal('erreur')
            return void setTimeout(() => document.querySelector<HTMLElement>('.acr-case input')?.focus(), 0)
          }
          suite()
        }}
      >
        {t('Accepter l’invitation')}
      </button>
    </>
  )
}

function CreerPin({ jeton, relire, retour, accepte }: { jeton: string; relire: () => void; retour: () => void; accepte: () => void }) {
  const { t, tf } = usePreferences()
  const maintenant = useMaintenant()
  const relireSession = useRelireSession()
  const [premier, setPremier] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const valider = useCallback(
    async (pin: string) => {
      if (premier === null) {
        setPremier(pin)
        setMsg(null)
        return vider()
      }
      if (pin !== premier) {
        signal('erreur')
        setPremier(null)
        vider()
        return setMsg(t('Les deux saisies ne sont pas identiques : recommencez.'))
      }
      const r = await source.acces.accepterInvitation(jeton, pin, origine(maintenant()))
      if (!r.ok) {
        signal('erreur')
        setPremier(null)
        vider()
        setMsg(
          r.raison === 'pin_trop_simple'
            ? t('PIN trop simple : évitez les suites et les chiffres répétés.')
            : r.raison === 'equipe_complete'
              ? tf('L’équipe du relais est complète ({n} employés au plus) : voyez avec le gérant.', { n: RELAIS_P.equipeMax })
              : t('Cette invitation n’est plus valable.'),
        )
        return relire()
      }
      signal('succes')
      accepte()
      relireSession()
      relire()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [premier, jeton],
  )
  const { v, ajouter, effacer, vider } = useSaisie(CONNEXION.pinLongueur, (x) => void valider(x))
  return (
    <>
      <div className="p-txto41">
        <div className="p-fdt7cn">{premier === null ? t('Créez votre code PIN') : t('Confirmez votre code PIN')}</div>
        <div className="p-ietgpj">{tf('{n} chiffres, à ne donner à personne. Il signe vos remises.', { n: CONNEXION.pinLongueur })}</div>
      </div>
      <Points n={v.length} total={CONNEXION.pinLongueur} />
      {msg && <Note ton="rouge">{msg}</Note>}
      <Pave ajouter={ajouter} effacer={effacer} saisis={v.length} />
      <button type="button" className="p-ncx7qc" disabled={v.length !== CONNEXION.pinLongueur} onClick={() => void valider(v)}>
        {premier === null ? t('Continuer') : t('Confirmer le PIN')}
      </button>
      <button type="button" className="p-rbzobc" onClick={retour}>
        {t('Retour')}
      </button>
    </>
  )
}

function Formation({ suite }: { suite: () => void }) {
  const { t, tf } = usePreferences()
  const f = useLecture(() => source.acces.formation(), [])
  if (f.erreur) return <ErreurLecture relire={f.relire} />
  if (!f.donnees) return <Chargement />
  const x = f.donnees
  const obligatoires = x.modules.filter((m) => m.obligatoire)
  const facultatifs = x.modules.filter((m) => !m.obligatoire)
  const statut = (s: string) => (s === 'termine' ? <span className="p-nax3x4">{t('Fait')}</span> : s === 'en_cours' ? <span className="p-rpzy79">{t('En cours')}</span> : <span className="p-6z26dm">{t('À faire')}</span>)
  return (
    <div className="p-yi6rkz">
      <div className="p-unncbq">
        <h2 className="p-9j1bbu">{t('Formation obligatoire')}</h2>
        <span className={x.terminee ? 'p-nax3x4' : 'p-yw05h9'}>{`${x.faits} / ${x.obligatoires}`}</span>
      </div>
      <div className="p-ug5qrn">{tf('Avant votre première remise, suivez les {n} modules (≈ {min} min au total, sur ce téléphone). Un module compte quand il est suivi jusqu’au bout, quiz compris.', { n: x.obligatoires, min: ACCES.formationMinutes })}</div>
      {[...obligatoires, ...facultatifs].map((m, i) => (
        <div key={m.id}>
          {i > 0 && <div className="p-92xvtp" />}
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-formation" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">{t(m.titre)}</div>
              <div className="p-dfa05r">{m.obligatoire ? tf('{n} min', { n: m.minutes }) : tf('{n} min · facultatif', { n: m.minutes })}</div>
            </div>
            {statut(m.statut)}
          </div>
        </div>
      ))}
      <Link to={chemin('formation')} className="p-ncx7qc">
        {x.faits > 0 && !x.terminee ? t('Reprendre la formation') : x.terminee ? t('Revoir la formation') : t('Commencer la formation')}
      </Link>
      <button type="button" className="p-rbzobc" onClick={suite}>
        {x.terminee ? t('Continuer') : t('Plus tard : aller au guichet')}
      </button>
    </div>
  )
}

function Pret() {
  const { t, tf } = usePreferences()
  const session = useSession()
  const naviguer = useNavigate()
  const f = useLecture(() => source.acces.formation(), [])
  const terminee = f.donnees?.terminee ?? session.membre?.formationOk ?? false
  return (
    <div className="p-c1r1yj">
      <div className="p-vhxw8h">
        <Icone nom="check" taille={32} trait={2.6} className="p-q7qjlz" />
      </div>
      <div className="p-fdt7cn">{t('Vous êtes prêt·e')}</div>
      <div className="p-uzhe04">
        {terminee
          ? tf('Formation terminée. Vous pouvez recevoir et remettre des colis au {relais}. Chaque opération est signée avec votre PIN.', { relais: session.relais?.nom ?? '' })
          : tf('Vous pouvez recevoir les colis au {relais}. La remise s’ouvre quand les {n} modules obligatoires sont faits. Chaque opération est signée avec votre PIN.', { relais: session.relais?.nom ?? '', n: RELAIS_P.formationModules })}
      </div>
      <button type="button" className="p-ncx7qc" onClick={() => naviguer(chemin(ACCUEIL), { replace: true })}>
        {t('Aller au guichet')}
      </button>
    </div>
  )
}

function Expiree({ inv, jeton, relire }: { inv: InvitationVue; jeton: string; relire: () => void }) {
  const { t, tf, langue } = usePreferences()
  const maintenant = useMaintenant()
  const session = useSession()
  const enLigne = useEnLigne()
  const demander = async () => {
    const r = await source.acces.redemanderInvitation(jeton, origine(maintenant()))
    signal(r.ok ? 'succes' : 'erreur')
    relire()
  }
  return (
    <div className="p-yi6rkz" role="alert">
      <div className="r-vide">
        <div className="r-vide-i r-rouge">
          <Icone nom="clock-alert" taille={28} />
        </div>
        <h2>{t('Ce lien a expiré')}</h2>
        <p>{tf('Un lien d’invitation est valable {h} h. Celui de {qui} pour le relais {relais} a expiré le {quand}.', { h: ACCES.invitationHeures, qui: inv.invitePar, relais: inv.relais, quand: echeance(inv.expireLe, session.maintenant, langue) })}</p>
      </div>
      {inv.redemandeeLe ? (
        <Note ton="vert">{tf('Demande envoyée à {qui} : vous recevrez un nouveau SMS d’invitation.', { qui: inv.invitePar })}</Note>
      ) : (
        <button type="button" className="p-ncx7qc" disabled={!enLigne} onClick={() => void demander()}>
          {t('Demander une nouvelle invitation')}
        </button>
      )}
      {!enLigne && <Note ton="ambre">{t('Hors connexion : la demande part avec le réseau.')}</Note>}
    </div>
  )
}

function DejaUtilisee() {
  const { t } = usePreferences()
  return (
    <div className="p-yi6rkz">
      <Note ton="accent">{t('Cette invitation est déjà acceptée : connectez-vous avec votre numéro et votre code PIN.')}</Note>
      <Link to={chemin('connexion')} className="p-ncx7qc">
        {t('Aller à la connexion')}
      </Link>
    </div>
  )
}
