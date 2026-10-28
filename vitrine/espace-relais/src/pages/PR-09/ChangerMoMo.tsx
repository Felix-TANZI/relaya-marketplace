// PR-09 · Changer de numéro de versement (gérant seul, MOM-01 à MOM-07, VER-02, VER-03, PR-RC-26). Structure du
// prototype gardée, ses trois états lus dans la source (jamais choisis par l'écran) :
// - saisie : numéro actuel (actif), opérateur MTN MoMo / Orange Money, nouveau numéro, préfixe vérifié pour l'opérateur
//   choisi AVANT l'envoi (CARTE-PREFIXES), « au nom du gérant », « Recevoir les deux codes » (réseau obligatoire) ;
// - code : deux codes à PR-NUM-CODE chiffres (l'un au nouveau numéro, l'autre au téléphone personnel du gérant),
//   valables PR-NUM-CODE minutes, essais comptés (sms_essais_code : la demande tombe au dernier), « Renvoyer les codes »
//   après OTP-RENVOI, « Annuler » ;
// - enregistré : jamais effectif tout de suite. Une personne de BelivaY vérifie (PR-NUM-VERIF-J jours), versements
//   suspendus, premier versement le vendredi qui suit la revue, rien n'est perdu ; SMS d'alerte « Ce n'est pas vous ? »
//   parti vers l'ancien numéro ; le gérant peut encore annuler.
// Règles et alerte de sécurité en bas : « BelivaY ne vous demande jamais votre code secret Mobile Money » (MOM-07).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import { geste, useEnLigne } from '../../donnees/fileHorsLigne'
import type { Resultat } from '../../donnees/communs'
import type { Argent } from '../../donnees/domaines/argent'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { echeance, jourCourt, jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useHorloge } from '../../session'
import { Chargement, EcranGerant, ErreurLecture, ReseauRequis, useOrigine } from './commun'
import { P09, operateurDe, prefixesEcrits } from './parametres'

type Operateur = 'MTN' | 'Orange'

export default function ChangerMoMo() {
  const lec = useLecture(() => source.argent.argent(), [])
  return <EcranGerant route="changer-momo">{lec.erreur ? <ErreurLecture relire={lec.relire} erreur={lec.erreur} /> : !lec.donnees ? <Chargement lignes={3} /> : <Contenu a={lec.donnees} />}</EcranGerant>
}

function Contenu({ a }: { a: Argent }) {
  const { t, tf, langue } = usePreferences()
  const [codeDemo, setCodeDemo] = useState<string | null>(null)
  const ch = a.changement
  return (
    <div className="p-0hxmj8 r-pile">
      <div>
        <h1 className="p-bvhkrl">{t('Changer de numéro de versement')}</h1>
        <div className="p-t2u0o2">{t('Le numéro où BelivaY verse vos gains chaque vendredi.')}</div>
      </div>
      <div className="p-yi6rkz">
        <div className="p-o24hsm">
          <div className="p-tc472u">
            <Icone nom="r-telephone" taille={20} className="p-q7qjlz" />
          </div>
          <div className="p-rnqj8n">
            <div className="p-ife3a2">{t('Numéro actuel')}</div>
            <div className="p-dfa05r">{a.numero.verifieLe ? tf('{n} · vérifié le {jour}', { n: a.numero.masque, jour: jourLong(a.numero.verifieLe, langue) }) : a.numero.masque}</div>
          </div>
          <span className="p-nax3x4">{t('Actif')}</span>
        </div>
      </div>
      {!ch ? <Saisie a={a} quandEnvoye={setCodeDemo} /> : ch.etape === 'codes_envoyes' ? <Codes a={a} codeDemo={codeDemo} /> : <Enregistre a={a} />}
      <Regles />
      <div className="p-fht1zk">
        <Icone nom="r-alerte" taille={18} className="p-lhsznn" />
        <div>{t('Réservé au gérant. BelivaY ne vous demande jamais votre code secret Mobile Money. Si vous n’avez pas demandé ce changement, touchez « Ce n’est pas vous ? » dans le SMS d’alerte ou appelez le support : le changement est annulé.')}</div>
      </div>
    </div>
  )
}

const RAISONS: Record<string, string> = {
  prefixe_inconnu: 'Ce numéro n’est ni un MTN MoMo ni un Orange Money : vérifiez ses premiers chiffres.',
  prefixe_operateur: 'Ce préfixe ne correspond pas à l’opérateur choisi.',
  meme_numero: 'C’est déjà votre numéro de versement.',
  verification_en_cours: 'Un changement est déjà en vérification.',
  code_faux: 'Un des deux codes est faux.',
  code_expire: 'Les codes ont expiré : demandez-en de nouveaux.',
  trop_essais: 'Trop d’essais : la demande est annulée. Recommencez quand vous voulez.',
  trop_tot: 'Patientez un peu avant de redemander les codes.',
  aucune_demande: 'Aucune demande en cours.',
}

function Saisie({ a, quandEnvoye }: { a: Argent; quandEnvoye: (c: string | null) => void }) {
  const { t, tf } = usePreferences()
  const en = useEnLigne()
  const o = useOrigine()
  const [op, setOp] = useState<Operateur>(a.numero.operateur)
  const [numero, setNumero] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const chiffres = numero.replace(/\D/g, '').replace(/^237(?=\d{9}$)/, '')
  const detecte = chiffres.length === 9 ? operateurDe(chiffres) : null
  const avis = chiffres.length < 9 ? null : !detecte ? RAISONS.prefixe_inconnu : detecte !== op ? RAISONS.prefixe_operateur : null
  const envoyer = async () => {
    setErreur(null)
    setEnvoi(true)
    const x = o()
    try {
      const r = await geste(en, 'reglage', 'numero-versement', x, (s) => s.argent.changerNumero(op, chiffres, x), { reseauRequis: true })
      if (r.r.ok) {
        signal('succes')
        quandEnvoye(r.r.codeDemo ?? null)
      } else {
        signal('erreur')
        setErreur(RAISONS[r.r.raison])
      }
    } catch {
      signal('erreur')
      setErreur('Il faut du réseau pour changer de numéro.')
    } finally {
      setEnvoi(false)
    }
  }
  return (
    <div className="p-yi6rkz">
      <div className="p-unncbq">
        <h2 className="p-9j1bbu">{t('Nouveau numéro')}</h2>
      </div>
      <div className="p-w2e4hy" role="group" aria-label={t('Opérateur')}>
        {(['MTN', 'Orange'] as const).map((x) => (
          <button key={x} type="button" className={op === x ? 'p-jv7fel' : 'p-8xq01w'} aria-pressed={op === x} onClick={() => setOp(x)}>
            {x === 'MTN' ? t('MTN MoMo') : t('Orange Money')}
          </button>
        ))}
      </div>
      <label className="p-ky12xr">
        {t('NUMÉRO')}
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="off"
          placeholder={t('6XX XX XX XX')}
          value={numero}
          onChange={(e) => setNumero(e.target.value.replace(/[^\d\s+]/g, '').slice(0, 16))}
          className="p-afs6hh"
          aria-invalid={!!avis}
          aria-describedby="r9-prefixes"
        />
      </label>
      <div className="p-ug5qrn" id="r9-prefixes">
        {tf('Préfixe vérifié avant l’envoi : MTN {mtn} · Orange {orange}. Il faut du réseau.', { mtn: prefixesEcrits(P09.prefixes.MTN), orange: prefixesEcrits(P09.prefixes.Orange) })}
      </div>
      {(avis || erreur) && (
        <div className="r9-erreur" role="alert">
          {t(erreur ?? avis!)}
        </div>
      )}
      <div className="p-gh7puf">
        <Icone nom="r-personne" taille={18} className="p-672m16" />
        <div>
          {t('Le numéro doit être')} <strong>{t('au nom du gérant')}</strong> {t(': BelivaY compare le nom du compte MoMo avec votre pièce d’identité.')}
        </div>
      </div>
      {!en && <ReseauRequis>{t('Hors ligne : un changement de numéro ne se fait jamais sans réseau. Revenez quand le réseau est là.')}</ReseauRequis>}
      <button type="button" className="p-ncx7qc" disabled={!en || chiffres.length !== 9 || !!avis || envoi} onClick={envoyer}>
        {t('Recevoir les deux codes')}
      </button>
    </div>
  )
}

function Codes({ a, codeDemo }: { a: Argent; codeDemo: string | null }) {
  const { t, tf, langue } = usePreferences()
  const en = useEnLigne()
  const o = useOrigine()
  const maintenant = useHorloge(1000)
  const c = a.changement!.codes!
  const [codes, setCodes] = useState<[string, string]>(['', ''])
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const n = P09.numeroCodes.chiffres
  const propre = (x: string) => x.replace(/\D/g, '').slice(0, n)
  const faire = async (f: 'valider' | 'renvoyer' | 'annuler') => {
    setErreur(null)
    setEnvoi(true)
    const x = o()
    try {
      const r = await geste(en, 'reglage', 'numero-versement', x, (s): Promise<Resultat<object, string>> => (f === 'valider' ? s.argent.confirmerNumero([codes[0], codes[1]], x) : f === 'renvoyer' ? s.argent.renvoyerCodes(x) : s.argent.annulerChangement(x)), { reseauRequis: true })
      if (r.r.ok) signal(f === 'annuler' ? 'toucher' : 'succes')
      else {
        signal('erreur')
        setErreur(r.r.raison === 'code_faux' ? tf('Un des deux codes est faux. Encore {n} essais.', { n: c.essaisRestants - 1 }) : t(RAISONS[r.r.raison]))
      }
      if (f === 'renvoyer') setCodes(['', ''])
    } catch {
      signal('erreur')
      setErreur(t('Il faut du réseau pour changer de numéro.'))
    } finally {
      setEnvoi(false)
    }
  }
  const expire = maintenant > c.expireA
  const attente = Math.max(0, Math.ceil((c.renvoiPossibleA - maintenant) / 1000))
  return (
    <div className="p-yi6rkz">
      <div className="p-unncbq">
        <h2 className="p-9j1bbu">{t('Code de vérification')}</h2>
      </div>
      <div className="p-ug5qrn">
        {tf('Deux codes à {n} chiffres sont partis par SMS : l’un au nouveau numéro', { n })} <strong>{c.versNouveau}</strong>
        {t(', l’autre à votre téléphone personnel')} <strong>{c.versPersonnel}</strong>
        {'. '}
        {expire ? t('Ils ont expiré : demandez-en de nouveaux.') : tf('Ils expirent {quand}.', { quand: echeance(c.expireA, maintenant, langue) })}
      </div>
      {codeDemo && <div className="p-81u2s6">{tf('Démonstration : les deux codes valent {c}.', { c: codeDemo })}</div>}
      <label className="p-ky12xr">
        {t('CODE REÇU AU NOUVEAU NUMÉRO')}
        <input type="text" inputMode="numeric" autoComplete="one-time-code" placeholder={'0'.repeat(n)} value={codes[0]} onChange={(e) => setCodes([propre(e.target.value), codes[1]])} className="p-9dfvp5" />
      </label>
      <label className="p-ky12xr">
        {t('CODE REÇU SUR VOTRE TÉLÉPHONE')}
        <input type="text" inputMode="numeric" autoComplete="off" placeholder={'0'.repeat(n)} value={codes[1]} onChange={(e) => setCodes([codes[0], propre(e.target.value)])} className="p-9dfvp5" />
      </label>
      {erreur && (
        <div className="r9-erreur" role="alert">
          {erreur}
        </div>
      )}
      {!en && <ReseauRequis>{t('Hors ligne : un changement de numéro ne se fait jamais sans réseau. Revenez quand le réseau est là.')}</ReseauRequis>}
      <button type="button" className="p-ncx7qc" disabled={!en || envoi || expire || codes.some((x) => x.length !== n)} onClick={() => faire('valider')}>
        {t('Valider le numéro')}
      </button>
      <button type="button" className="p-rbzobc" disabled={!en || envoi || attente > 0} onClick={() => faire('renvoyer')}>
        {attente > 0 ? tf('Renvoyer les codes dans {s} s', { s: attente }) : t('Renvoyer les codes')}
      </button>
      <button type="button" className="r9-lien-texte" disabled={!en || envoi} onClick={() => faire('annuler')}>
        {t('Annuler ce changement')}
      </button>
    </div>
  )
}

function Enregistre({ a }: { a: Argent }) {
  const { t, tf, langue } = usePreferences()
  const en = useEnLigne()
  const o = useOrigine()
  const ch = a.changement!
  const [confirmer, setConfirmer] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const annuler = async () => {
    setEnvoi(true)
    const x = o()
    try {
      await geste(en, 'reglage', 'numero-versement', x, (s) => s.argent.annulerChangement(x), { reseauRequis: true })
      signal('toucher')
    } catch {
      signal('erreur')
    } finally {
      setEnvoi(false)
    }
  }
  const prochain = a.prochain
  return (
    <div className="p-c1r1yj" role="status">
      <div className="p-vhxw8h">
        <Icone nom="check" taille={32} trait={2.6} className="p-q7qjlz" />
      </div>
      <div className="p-fdt7cn">{t('Nouveau numéro enregistré')}</div>
      <div className="p-uzhe04">
        {tf('Une personne de BelivaY le vérifie jusqu’au {jour} : vos versements sont suspendus {n} jours.', { jour: jourLong(ch.revueJusqua!, langue), n: P09.numeroVerifJours })}{' '}
        {tf('{numero} recevra', { numero: ch.nouveau.masque })} <strong>{tf('le {jour}', { jour: jourLong(ch.premierVersementLe!, langue) })}</strong>{' '}
        {prochain.etat === 'suspendu' ? tf('le versement de ce {jour} et celui de la semaine : rien n’est perdu.', { jour: jourCourt(prochain.date, langue) }) : t('ses premiers versements : rien n’est perdu.')}{' '}
        {ch.alerteEnvoyeeA && tf('Un SMS d’alerte « Ce n’est pas vous ? » est parti vers {n}.', { n: ch.alerteEnvoyeeA })}
      </div>
      <Link to={chemin('versements')} className="p-rbzobc">
        {t('Retour aux versements')}
      </Link>
      {!confirmer ? (
        <button type="button" className="r9-lien-texte" onClick={() => setConfirmer(true)} disabled={!en}>
          {t('Annuler ce changement')}
        </button>
      ) : (
        <div className="r9-confirmer">
          <div className="p-81u2s6">{tf('L’ancien numéro {n} reste actif et les versements reprennent normalement.', { n: a.numero.masque })}</div>
          <button type="button" className="p-rbzobc r9-danger" onClick={annuler} disabled={!en || envoi}>
            {t('Oui, annuler le changement')}
          </button>
          <button type="button" className="r9-lien-texte" onClick={() => setConfirmer(false)}>
            {t('Garder le nouveau numéro')}
          </button>
        </div>
      )}
      {!en && <ReseauRequis>{t('Hors ligne : un changement de numéro ne se fait jamais sans réseau. Revenez quand le réseau est là.')}</ReseauRequis>}
    </div>
  )
}

function Regles() {
  const { t, tf } = usePreferences()
  const lignes: [string, string][] = [
    ['Numéros actifs', t('un seul')],
    ['Titulaire', t('le gérant')],
    ['Codes', tf('{n} SMS, dont 1 sur votre téléphone', { n: P09.numeroCodes.nombre })],
    ['Vérification', tf('{n} jours, versements suspendus', { n: P09.numeroVerifJours })],
    ['Alerte', t('SMS à l’ancien numéro')],
    ['Réseau', t('obligatoire')],
  ]
  return (
    <div className="p-yi6rkz">
      <div className="p-unncbq">
        <h2 className="p-9j1bbu">{t('Les règles')}</h2>
      </div>
      {lignes.map(([k, v]) => (
        <div className="p-mqmvkk" key={k}>
          <span className="p-ytl255">{t(k)}</span>
          <span className="p-2vq92h">{v}</span>
        </div>
      ))}
    </div>
  )
}
