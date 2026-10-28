// Mon équipe (PR-10 Fig. 3 et 4 ; EQU-01 à EQU-07, DRO-01 à DRO-05, INV-01 à INV-07, PR-10-R03, PR-RC-09, CNX-06,
// PAR-06 ; ARL-06, ARL-123). Gérant seul (la route l'exige : config/droits.ts ; l'employé voit « Accès réservé »).
// Structure du prototype : titre et règle (PR-EQUIPE-MAX employés au plus), une carte par personne (initiales, nom,
// rôle, activité, interrupteur d'accès, droits en pastilles), « Ajouter une personne · n / max » qui déplie le
// formulaire d'invitation (?ajout=1), rappel de responsabilité, « Qui a fait quoi aujourd'hui ».
// Gestes : inviter (code SMS au téléphone PERSONNEL du gérant, puis SMS d'invitation à l'employé : PIN personnel et
// modules obligatoires avant sa première remise) ; retirer un accès (interrupteur : code SMS, retrait immédiat, sa
// session et ses appareils tombent) ; régler ses droits (recevoir, remettre, faire partir, fermeture imprévue du jour,
// historique ; jamais l'argent ni la gestion) ; réinitialiser son PIN ; appareils connectés, déconnexion à distance
// (?voir=appareils, lien des Paramètres).
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Feuille } from '@client/composants/Feuille'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { FicheRelais } from '../../donnees/domaines/relais'
import type { Droit, Membre } from '../../donnees/domaines/session'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { Annonce, Chargement, CodeSms, ErreurLecture, Interrupteur, useGesteRelais } from './commun'

/** Droits qu'un employé peut recevoir (DRO-03, ARL-06) ; l'argent et la gestion restent au gérant. */
const DROITS_EMPLOYE: Droit[] = ['recevoir', 'remettre', 'faire_partir', 'fermeture_jour', 'historique']
const NOMS_DROITS: Record<Droit, string> = {
  recevoir: 'Recevoir',
  remettre: 'Remettre',
  faire_partir: 'Faire partir',
  fermeture_jour: 'Fermeture imprévue du jour',
  historique: 'Historique',
  argent: 'Argent',
  capacite: 'Capacité',
  equipe: 'Équipe',
  parametres: 'Paramètres',
}
const AVATARS = ['p-nbswn3', 'p-laeb3x']

type Action = { type: 'ajouter'; prenom: string; nom: string; telephone: string; droits: Droit[] } | { type: 'retirer'; membre: Membre }

export default function Equipe() {
  const lecture = useLecture(() => source.relais.relais(), [])
  const historique = useLecture(() => source.historique.historique({ periode: 'aujourdhui' }), [])
  const g = useGesteRelais()
  const f = lecture.donnees
  if (!f) return <Ecran route="equipe">{lecture.erreur ? <ErreurLecture relire={lecture.relire} /> : <Chargement />}</Ecran>
  return <Contenu f={f} ops={historique.donnees?.operations ?? []} g={g} />
}

function Contenu({ f, ops, g }: { f: FicheRelais; ops: { type: string; par: { membreId: string | null }; le: number }[]; g: ReturnType<typeof useGesteRelais> }) {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const [params, setParams] = useSearchParams()
  // ?etat=open : l'état « Ajout d'un employé » du prototype.
  const ajout = params.get('ajout') === '1' || params.get('etat') === 'open'
  const voir = params.get('voir')
  const employes = f.equipe.filter((m) => m.role === 'employe')
  const complet = employes.length >= f.equipeMax
  const [action, setAction] = useState<Action | null>(null)
  const [expireA, setExpireA] = useState<number | null>(null)
  const [erreurCode, setErreurCode] = useState<string | null>(null)
  const [droitsDe, setDroitsDe] = useState<Membre | null>(null)
  const [pinDe, setPinDe] = useState<Membre | null>(null)

  useEffect(() => {
    if (!voir) return
    const id = requestAnimationFrame(() => document.getElementById('p10-' + voir)?.scrollIntoView({ block: 'start' }))
    return () => cancelAnimationFrame(id)
  }, [voir])

  const activite = (id: string) => {
    const miennes = ops.filter((o) => o.par.membreId === id)
    return {
      remises: miennes.filter((o) => o.type === 'remise').length,
      receptions: miennes.filter((o) => o.type === 'reception').length,
      constats: miennes.filter((o) => o.type === 'constat').length,
      encaissements: miennes.filter((o) => o.type === 'encaissement').length,
      derniere: miennes.reduce<number | null>((n, o) => (n === null || o.le > n ? o.le : n), null),
    }
  }
  const resume = (id: string) => {
    const a = activite(id)
    const morceaux = [a.remises && tf(a.remises > 1 ? '{n} remises' : '{n} remise', { n: a.remises }), a.receptions && tf(a.receptions > 1 ? '{n} colis reçus' : '{n} colis reçu', { n: a.receptions }), a.encaissements && tf(a.encaissements > 1 ? '{n} gardes encaissées' : '{n} garde encaissée', { n: a.encaissements }), a.constats && tf(a.constats > 1 ? '{n} constats' : '{n} constat', { n: a.constats })].filter(Boolean)
    return morceaux.length ? morceaux.join(' · ') : t('Aucune opération aujourd’hui')
  }

  // Code SMS au téléphone du gérant, puis le geste (ajouter ou retirer).
  const demanderCode = async (a: Action) => {
    setAction(a)
    setErreurCode(null)
    setExpireA(null)
    await g.faire('reglage', 'equipe', (src, o) => src.relais.demanderCodeEquipe(o), { ok: 'Code envoyé sur votre téléphone personnel.' }, (r) => setExpireA(r.expireA))
  }
  const valider = async (code: string) => {
    if (!action) return
    setErreurCode(null)
    const fait =
      action.type === 'ajouter'
        ? await g.faire('reglage', 'equipe', (src, o) => src.relais.ajouterEmploye({ prenom: action.prenom, nom: action.nom, telephone: action.telephone, droits: action.droits }, code, o), { ok: 'Invitation envoyée par SMS : elle crée son PIN puis suit sa formation.' })
        : await g.faire('reglage', action.membre.id, (src, o) => src.relais.retirerEmploye(action.membre.id, code, o), { ok: 'Accès retiré : sa session est fermée, ses appareils sont déconnectés.' })
    if (fait) {
      setAction(null)
      if (action.type === 'ajouter') setParams({}, { replace: true })
    } else setErreurCode(t('Code SMS faux ou expiré : demandez-en un nouveau.'))
  }

  return (
    <Ecran
      route="equipe"
      fixes={
        <>
          <Feuille ouverte={!!action} fermer={() => setAction(null)} titre={t('Code SMS')} classe="p10-feuille">
            <h2>{action?.type === 'retirer' ? tf('Retirer l’accès de {nom}', { nom: `${action.membre.prenom} ${action.membre.nom[0]}.` }) : t('Confirmer l’invitation')}</h2>
            <CodeSms
              expireA={expireA}
              enCours={g.enCours}
              action={t(action?.type === 'retirer' ? 'Retirer l’accès' : 'Envoyer l’invitation')}
              valider={(c) => void valider(c)}
              renvoyer={() => action && void demanderCode(action)}
              erreur={erreurCode ? <p className="p-81u2s6 p10-txt p10-annonce p10-ko" role="alert">{erreurCode}</p> : null}
            />
          </Feuille>
          {droitsDe && <FeuilleDroits membre={droitsDe} fermer={() => setDroitsDe(null)} g={g} />}
          <Feuille ouverte={!!pinDe} fermer={() => setPinDe(null)} titre={t('Réinitialiser le PIN')} classe="p10-feuille">
            <h2>{pinDe ? tf('Réinitialiser le PIN de {nom}', { nom: `${pinDe.prenom} ${pinDe.nom[0]}.` }) : ''}</h2>
            <div className="p10-col">
              <p className="p-81u2s6 p10-txt">{t('Son PIN actuel ne marche plus : elle ou il reçoit un SMS pour en créer un nouveau. Vous ne connaissez jamais son PIN.')}</p>
              <button type="button" className="p-ncx7qc" disabled={g.enCours} onClick={() => pinDe && void g.faire('reglage', pinDe.id, (src, o) => src.relais.reinitialiserPin(pinDe.id, o), { ok: 'SMS de nouveau PIN envoyé.' }).then((ok) => ok && setPinDe(null))}>
                {t('Envoyer le SMS')}
              </button>
              <button type="button" className="p-rbzobc" onClick={() => setPinDe(null)}>
                {t('Annuler')}
              </button>
            </div>
          </Feuille>
        </>
      }
    >
      <div className="p-0hxmj8 r-pile">
        <div>
          <h1 className="p-bvhkrl">{t('Mon équipe')}</h1>
          <div className="p-t2u0o2">{tf('Chaque personne a son code : on sait toujours qui a reçu et qui a remis. {n} employés au plus.', { n: f.equipeMax })}</div>
        </div>
        {f.equipe.map((m, k) => {
          const gerant = m.role === 'proprietaire'
          const moi = m.id === s.membre?.id
          const a = activite(m.id)
          const formation = f.formation[m.id] ?? []
          const faits = formation.filter((x) => x.obligatoire && x.statut === 'termine').length
          const droits = gerant ? (['recevoir', 'remettre', 'argent', 'parametres', 'equipe'] as Droit[]) : DROITS_EMPLOYE
          return (
            <section key={m.id} className="p-yi6rkz" aria-label={`${m.prenom} ${m.nom}`}>
              <div className="p-pfxfo4">
                <div className={(gerant ? 'p-443ep0' : AVATARS[k % 2]) + (m.photo ? ' p10-avatar-photo' : '')} aria-hidden="true">
                  {m.photo ? <img src={m.photo} alt="" /> : m.initiales}
                </div>
                <div className="p-lmo74g">
                  <div className="p-buxdaz">{gerant ? `${m.prenom} ${m.nom}` : `${m.prenom} ${m.nom[0]}.`}</div>
                  <div className="p-t1lapd">
                    {gerant ? t(moi ? 'Gérant · connecté' : 'Gérant') : a.remises ? tf('Employé · a remis {n} colis aujourd’hui', { n: a.remises }) : a.derniere ? tf('Employé · dernière activité à {h}', { h: heure(a.derniere, langue) }) : t('Employé · pas d’activité aujourd’hui')}
                  </div>
                  {!gerant && <div className="p-t1lapd">{faits >= f.formationModules ? tf('Formation {n}/{total} · peut remettre', { n: faits, total: f.formationModules }) : tf('Formation {n}/{total} · ne remet pas encore', { n: faits, total: f.formationModules })}</div>}
                </div>
                {gerant ? <span className="p-rpzy79">{t('Propriétaire')}</span> : <Interrupteur on label={tf('Accès de {nom}', { nom: `${m.prenom} ${m.nom[0]}.` })} changer={() => void demanderCode({ type: 'retirer', membre: m })} />}
              </div>
              <ul className="p-8dmjde" aria-label={t('Droits')}>
                {droits.map((d) => (
                  <li key={d} className={gerant || m.droits.includes(d) ? 'p-rpzy79' : 'p-6z26dm'}>
                    {gerant || m.droits.includes(d) ? t(NOMS_DROITS[d]) : tf('{d} · non', { d: t(NOMS_DROITS[d]) })}
                  </li>
                ))}
                {!gerant && (
                  <>
                    <li className="p-6z26dm">{t('Argent · réservé au gérant')}</li>
                    <li className="p-6z26dm">{t('Paramètres · réservé au gérant')}</li>
                  </>
                )}
              </ul>
              {!gerant && (
                <div className="p-lndmsc">
                  <button type="button" className="p-wn9elb p10-cible" onClick={() => setPinDe(m)}>
                    {t('Nouveau PIN')}
                  </button>
                  <button type="button" className="p-wn9elb p10-cible" onClick={() => setDroitsDe(m)}>
                    {t('Modifier ses droits')}
                  </button>
                </div>
              )}
            </section>
          )
        })}
        {!ajout && (
          <button type="button" className="p-ncx7qc" aria-disabled={complet || undefined} data-raison={complet ? tf('Équipe complète : {n} employés au plus. Retirez un accès pour inviter quelqu’un.', { n: f.equipeMax }) : undefined} onClick={() => !complet && setParams({ ajout: '1' }, { replace: true })}>
            <Icone nom="r-plus" taille={18} className="p-7dsggt" />
            {tf('Ajouter une personne · {n} / {max}', { n: employes.length, max: f.equipeMax })}
          </button>
        )}
        {ajout && !complet && <Formulaire f={f} annuler={() => setParams({}, { replace: true })} envoyer={(a) => void demanderCode(a)} enCours={g.enCours} />}
        <Annonce message={g.message} />
        <div className="p-fht1zk">
          <Icone nom="r-bouclier" taille={18} className="p-lhsznn" />
          <div>{t('Vous restez responsable du relais : les colis perdus ou mal remis par un employé comptent dans votre Trust Score. Retirez un accès dès qu’une personne part : un code SMS vous est demandé.')}</div>
        </div>
        <section className="p-yi6rkz" id="p10-appareils" aria-labelledby="p10-appareils-t">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu" id="p10-appareils-t">
              {t('Appareils connectés')}
            </h2>
          </div>
          {f.appareils.map((a) => {
            const qui = f.equipe.find((m) => m.id === a.membreId)
            return (
              <div key={a.id} className="p-o24hsm">
                <div className="p-toppw8">
                  <Icone nom="r-telephone" taille={20} className="p-672m16" />
                </div>
                <div className="p-rnqj8n">
                  <div className="p-ife3a2">{a.nom}</div>
                  <div className="p-dfa05r">{(qui ? `${qui.prenom} ${qui.nom[0]}.` : a.membre) + ' · ' + (a.ceAppareil ? t('ce téléphone') : tf('dernier accès à {h}', { h: heure(a.dernierAcces, langue) }))}</div>
                </div>
                {!a.ceAppareil && (
                  <button type="button" className="p-wn9elb p10-cible" onClick={() => void g.faire('reglage', a.id, (src, o) => src.relais.deconnecterAppareil(a.id, o), { ok: 'Appareil déconnecté : il demandera le numéro, le code SMS puis le PIN.' })}>
                    {t('Déconnecter')}
                  </button>
                )}
              </div>
            )
          })}
          <div className="p-81u2s6">{t('Un nouvel appareil demande un code SMS à sa première connexion. Déconnectez à distance un téléphone perdu ou prêté.')}</div>
        </section>
        <section className="p-yi6rkz" aria-labelledby="p10-qui">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu" id="p10-qui">
              {t('Qui a fait quoi aujourd’hui')}
            </h2>
          </div>
          {f.equipe.map((m) => (
            <div key={m.id} className="p-mqmvkk">
              <span className="p-ytl255">{m.role === 'proprietaire' ? `${m.prenom} ${m.nom}` : `${m.prenom} ${m.nom[0]}.`}</span>
              <span className="p-2vq92h">{resume(m.id)}</span>
            </div>
          ))}
          <Link to={chemin('historique')} className="p-4u28q4 p10-cible">
            {t('Voir l’historique complet')}
          </Link>
        </section>
      </div>
    </Ecran>
  )
}

/** Invitation d'un employé (Fig. 4) : nom et prénom, téléphone, droits ; puis code SMS au gérant. */
function Formulaire({ f, annuler, envoyer, enCours }: { f: FicheRelais; annuler: () => void; envoyer: (a: Action) => void; enCours: boolean }) {
  const { t, tf } = usePreferences()
  const [nom, setNom] = useState('')
  const [tel, setTel] = useState('')
  const [droits, setDroits] = useState<Droit[]>(DROITS_EMPLOYE)
  const [vu, setVu] = useState(false)
  const mots = nom.trim().split(/\s+/).filter(Boolean)
  const chiffres = tel.replace(/\D/g, '').replace(/^237/, '')
  const nomOk = mots.length >= 2
  const telOk = /^6\d{8}$/.test(chiffres)
  const droitsOk = droits.length > 0
  const basculer = (d: Droit) => setDroits((x) => (x.includes(d) ? x.filter((y) => y !== d) : [...x, d]))
  return (
    <form
      className="p-yi6rkz"
      aria-labelledby="p10-nouvelle"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        setVu(true)
        if (nomOk && telOk && droitsOk) envoyer({ type: 'ajouter', prenom: mots[0], nom: mots.slice(1).join(' '), telephone: chiffres, droits })
      }}
    >
      <div className="p-unncbq">
        <h2 className="p-9j1bbu" id="p10-nouvelle">
          {t('Nouvelle personne')}
        </h2>
      </div>
      <label className="p-ky12xr">
        {t('PRÉNOM ET NOM')}
        <input type="text" placeholder={t('Ex. Paul Essomba')} value={nom} onChange={(e) => setNom(e.target.value)} autoComplete="name" aria-invalid={vu && !nomOk} className="p-afs6hh" />
      </label>
      {vu && !nomOk && <span className="p-81u2s6 p10-ko p10-annonce" role="alert">{t('Écrivez le prénom puis le nom.')}</span>}
      <label className="p-ky12xr">
        {t('NUMÉRO DE TÉLÉPHONE')}
        <input type="tel" inputMode="tel" placeholder={t('6XX XX XX XX')} value={tel} onChange={(e) => setTel(e.target.value)} autoComplete="tel-national" aria-invalid={vu && !telOk} className="p-afs6hh" />
      </label>
      {vu && !telOk && <span className="p-81u2s6 p10-ko p10-annonce" role="alert">{t('Un numéro camerounais à 9 chiffres, commençant par 6.')}</span>}
      <div className="p-yscrc8" id="p10-peut">
        {t('CE QU’ELLE PEUT FAIRE')}
      </div>
      <div className="p-8dmjde" role="group" aria-labelledby="p10-peut">
        {DROITS_EMPLOYE.map((d) => (
          <button key={d} type="button" aria-pressed={droits.includes(d)} className={(droits.includes(d) ? 'p-rpzy79' : 'p-6z26dm') + ' p10-droit'} onClick={() => basculer(d)}>
            {(droits.includes(d) ? '✓ ' : '') + t(NOMS_DROITS[d])}
          </button>
        ))}
        <span className="p-6z26dm">{t('Argent · réservé au gérant')}</span>
        <span className="p-6z26dm">{t('Paramètres · réservé au gérant')}</span>
      </div>
      {vu && !droitsOk && <span className="p-81u2s6 p10-ko p10-annonce" role="alert">{t('Choisissez au moins un droit.')}</span>}
      <div className="p-81u2s6">{tf('Un code SMS arrive sur votre téléphone personnel pour confirmer l’ajout (de même pour retirer un accès). Elle reçoit ensuite un SMS valable {h} h pour créer son code PIN et suit les {n} modules de formation avant sa première remise.', { h: f.regles.invitationHeures, n: f.formationModules })}</div>
      <div className="p-lndmsc">
        <button type="button" className="p-rbzobc" onClick={annuler}>
          {t('Annuler')}
        </button>
        <button type="submit" className="p-ncx7qc" disabled={enCours}>
          {t('Envoyer l’invitation')}
        </button>
      </div>
    </form>
  )
}

/** Droits d'un employé : jamais l'argent ni la gestion (DRO-03) ; au moins un (sinon, retirer l'accès). */
function FeuilleDroits({ membre, fermer, g }: { membre: Membre; fermer: () => void; g: ReturnType<typeof useGesteRelais> }) {
  const { t, tf } = usePreferences()
  const [droits, setDroits] = useState<Droit[]>(membre.droits.filter((d) => DROITS_EMPLOYE.includes(d)))
  return (
    <Feuille ouverte fermer={fermer} titre={t('Modifier ses droits')} classe="p10-feuille">
      <h2>{tf('Droits de {nom}', { nom: `${membre.prenom} ${membre.nom[0]}.` })}</h2>
      <div className="p10-col">
        {DROITS_EMPLOYE.map((d) => (
          <div key={d} className="p-o24hsm">
            <div className="p-rnqj8n">
              <div className="p-ife3a2">{t(NOMS_DROITS[d])}</div>
              {d === 'fermeture_jour' && <div className="p-dfa05r">{t('Pour aujourd’hui seulement ; les fermetures programmées restent au gérant.')}</div>}
              {d === 'historique' && <div className="p-dfa05r">{t('Sans les montants de rémunération.')}</div>}
            </div>
            <Interrupteur on={droits.includes(d)} label={t(NOMS_DROITS[d])} changer={(v) => setDroits((x) => (v ? [...x, d] : x.filter((y) => y !== d)))} />
          </div>
        ))}
        <p className="p-81u2s6 p10-txt">{t('Argent, capacité, horaires, équipe, documents et paramètres restent réservés au gérant.')}</p>
        <button type="button" className="p-ncx7qc" disabled={!droits.length || g.enCours} onClick={() => void g.faire('reglage', membre.id, (src, o) => src.relais.reglerDroits(membre.id, droits, o), { ok: 'Droits enregistrés.' }).then((ok) => ok && fermer())}>
          {t('Enregistrer ses droits')}
        </button>
        <button type="button" className="p-rbzobc" onClick={fermer}>
          {t('Annuler')}
        </button>
      </div>
    </Feuille>
  )
}
