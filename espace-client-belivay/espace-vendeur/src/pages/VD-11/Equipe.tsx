// Mon équipe (VD-11) : repris du prototype (route('equipe'), feuille equipe?add=1), branché sur la source, puis
// complété à la demande du porteur (6 oct.) : droits PAR employé. Composition VD11-R25 ; règles EQU-01 à EQU-04,
// VD11-R22 à R24, Q-17, Q-18 :
// - propriétaire + 3 accès employés au plus, sur tous les plans (VD-EQUIPE-MAX) ; limite atteinte : bouton grisé et
//   « 3 accès employés sur 3 : retirez un accès pour en ajouter un » ;
// - recruter : nom, téléphone (+237), rôle (Préparation, Gestion du stock, Service client, ou personnalisé) et ses
//   droits cochés, regroupés (src/donnees/droits.ts) ; le code SMS du propriétaire confirme ; invitation en attente
//   (7 jours) avec « Renvoyer le SMS » et « Annuler l’invitation » ;
// - chaque employé : ses droits (modifiés avec le code SMS), son journal d'actions signées, « Suspendre » (session
//   coupée tout de suite, sans code), « Réactiver » (code SMS), « Supprimer » (code SMS, session coupée, actions
//   passées signées) ;
// - les droits interdits à un employé (argent, prix, réponse aux litiges, équipe) restent visibles, verrouillés ;
// - réservé au propriétaire (un employé ne voit pas l'équipe).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { ActionMembre, MembreEquipe } from '../../donnees/domaines/equipe'
import { GROUPES_DROITS, NOM_PROFIL, PROFILS, normaliserDroits, profilDe, type Droit, type ProfilAcces } from '../../donnees/droits'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useHorloge } from '../../session'
import { BandeauHorsLigne, Bouton, CHAMP, Chargement, CodeSms, ErreurLecture, Feuille, dateCourte, useAnnonce, useFeuilleAdresse } from './communs'

const CHOIX_PROFILS: ProfilAcces[] = ['preparation', 'stock', 'service_client', 'personnalise']
const RADIO = { width: '100%', background: 'none', border: 0, textAlign: 'left', font: 'inherit', color: 'inherit', cursor: 'pointer', minHeight: '48px' } as const
const TOUTES = GROUPES_DROITS.flatMap((g) => g.droits)

/** « commande?ref=BLV-00008 » → adresse de l'écran. */
const versRoute = (r: string) => {
  const [nom, q] = r.split('?')
  return chemin(nom, Object.fromEntries(new URLSearchParams(q ?? '')))
}

/** Rôle prédéfini, puis droits à cocher, regroupés ; les droits interdits restent affichés, verrouillés, avec la règle. */
function GrilleDroits({ droits, changer }: { droits: Droit[]; changer: (d: Droit[]) => void }) {
  const { t } = usePreferences()
  const profil = profilDe(droits)
  const basculer = (d: Droit) => {
    // Décocher « voir » décoche ce qui le suppose ; cocher « préparer » coche « voir » (normaliserDroits).
    const suite = droits.includes(d) ? droits.filter((x) => x !== d && TOUTES.find((y) => y.id === x)?.suppose !== d) : [...droits, d]
    changer(normaliserDroits(suite))
  }
  return (
    <>
      <div className="fld" role="radiogroup" aria-label={t('Rôle')}>
        <label>{t('Rôle')}</label>
        {CHOIX_PROFILS.map((p) => (
          <button key={p} type="button" role="radio" aria-checked={profil === p} className={'li' + (profil === p ? ' on' : '')} onClick={() => p !== 'personnalise' && changer(normaliserDroits(PROFILS[p].droits))} style={RADIO}>
            <Icone nom={profil === p ? 'circle-check' : 'circle'} taille={20} style={{ color: profil === p ? 'var(--or-txt)' : 'var(--ink-4)', flexShrink: '0' }} />
            <span className="grow">
              <span className="t14 b7" style={{ display: 'block' }}>
                {t(NOM_PROFIL[p])}
              </span>
              <span className="t12 c3" style={{ display: 'block' }}>
                {t(p === 'personnalise' ? 'Cochez vous-même les droits ci-dessous.' : PROFILS[p].resume)}
              </span>
            </span>
          </button>
        ))}
      </div>
      <div className="kick" style={{ marginTop: '14px' }}>
        {t('Droits')}
      </div>
      {GROUPES_DROITS.map((g) => (
        <fieldset key={g.id} style={{ border: 0, padding: 0, margin: '10px 0 0', minWidth: 0 }}>
          <legend className="row b8 t14" style={{ gap: '8px', padding: 0 }}>
            <Icone nom={g.icone} taille={16} style={{ color: 'var(--or-txt)' }} />
            {t(g.titre)}
          </legend>
          {g.droits.map((d) => {
            const coche = !d.jamais && droits.includes(d.id)
            return (
              <button key={d.id} type="button" role="checkbox" aria-checked={coche} disabled={!!d.jamais} onClick={() => basculer(d.id)} className="li" style={{ ...RADIO, alignItems: 'flex-start', cursor: d.jamais ? 'default' : 'pointer' }}>
                <Icone nom={d.jamais ? 'lock' : coche ? 'square-check' : 'square'} taille={20} style={{ color: coche ? 'var(--or-txt)' : 'var(--ink-4)', flexShrink: '0', marginTop: '1px' }} />
                <span className="grow">
                  <span className="t14 b7" style={{ display: 'block', color: d.jamais ? 'var(--ink-3)' : undefined }}>
                    {t(d.libelle)}
                  </span>
                  {(d.jamais || d.aide) && (
                    <span className="t12 c3" style={{ display: 'block' }}>
                      {t(d.jamais ?? d.aide!)}
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </fieldset>
      ))}
    </>
  )
}

export default function Equipe() {
  const { t, tf, langue } = usePreferences()
  const maintenant = useHorloge()
  const lecture = useLecture(() => source.equipe.membres(), [])
  const [annonce, dire] = useAnnonce()
  const ajout = useFeuilleAdresse('add')
  const [nom, setNom] = useState('')
  const [tel, setTel] = useState('')
  const [droitsAjout, setDroitsAjout] = useState<Droit[]>(() => normaliserDroits(PROFILS.preparation.droits))
  const [erreurs, setErreurs] = useState<{ nom?: string; tel?: string; general?: string }>({})
  const [invitation, setInvitation] = useState<{ id: string; masque: string; nom: string } | null>(null)
  // Feuille d'un employé : supprimer (code), réactiver (code), droits (grille puis code), journal.
  const [action, setAction] = useState<
    | { type: 'retrait' | 'reactivation'; membre: MembreEquipe; masque: string }
    | { type: 'droits'; membre: MembreEquipe; droits: Droit[]; masque: string | null }
    | { type: 'journal'; membre: MembreEquipe; lignes: ActionMembre[] }
    | null
  >(null)
  const e = lecture.donnees

  const fermerAjout = () => {
    setInvitation(null)
    setErreurs({})
    ajout.fermer()
  }
  const inviter = async () => {
    const r = await source.equipe.inviter(nom, tel, droitsAjout)
    if (r.ok) return setInvitation({ id: r.invitation, masque: r.masque, nom: nom.trim() })
    jouer('erreur')
    if (r.raison === 'nom') setErreurs({ nom: t('Écrivez le prénom et le nom de la personne.') })
    else if (r.raison === 'telephone') setErreurs({ tel: t('Numéro camerounais à 9 chiffres, qui commence par 6.') })
    else if (r.raison === 'deja') setErreurs({ tel: t('Ce numéro a déjà un compte BelivaY') })
    else if (r.raison === 'droits') setErreurs({ general: t('Cochez au moins un droit.') })
    else setErreurs({ general: t('3 accès employés sur 3 : retirez un accès pour en ajouter un.') })
  }
  const ouvrir = async (type: 'retrait' | 'reactivation', m: MembreEquipe) => {
    const { masque } = await (type === 'retrait' ? source.equipe.demanderCodeRetrait(m.id) : source.equipe.demanderCodeMembre(m.id, 'reactivation'))
    setAction({ type, membre: m, masque })
  }
  const suspendre = async (m: MembreEquipe) => {
    const r = await source.equipe.suspendre(m.id)
    if (!r.ok) return dire(t('Cet accès est déjà suspendu.'), 'erreur')
    jouer('interrupteur')
    dire(tf('Accès de {nom} suspendu : sa session est coupée.', { nom: m.prenom }))
  }
  const journal = async (m: MembreEquipe) => setAction({ type: 'journal', membre: m, lignes: await source.equipe.journal(m.id) })

  if (!e)
    return (
      <Ecran route="equipe">
        <div className="pg">
          <h1 className="pg-t">{t('Mon équipe')}</h1>
        </div>
        {lecture.erreur ? <ErreurLecture erreur={lecture.erreur} relire={lecture.relire} /> : <Chargement />}
      </Ecran>
    )
  const plein = e.employes >= e.maxEmployes
  const premierEmploye = e.membres.find((m) => m.role === 'preparation' && m.etat === 'actif')
  const quand = (a: number) => (a > maintenant - 86400000 ? heure(a, langue) : dateCourte(a, langue))
  const nomComplet = (m: { prenom: string; nom: string }) => `${m.prenom} ${m.nom}`
  const titreFeuille = (texte: string) => <h3 style={{ margin: '0', fontSize: '19px', fontWeight: '800' }}>{texte}</h3>
  const aide = (texte: string) => (
    <p className="t13 c3" style={{ margin: '6px 0 0', lineHeight: '1.45' }}>
      {texte}
    </p>
  )
  const resume = (droits: Droit[]) =>
    GROUPES_DROITS.filter((g) => g.droits.some((d) => !d.jamais && droits.includes(d.id)))
      .map((g) => t(g.titre))
      .join(' · ')
  return (
    <Ecran
      route="equipe"
      fixes={
        <>
          {annonce}
          <Feuille ouverte={ajout.ouverte} fermer={fermerAjout} titre="Ajouter un accès">
            {titreFeuille(t('Ajouter un accès'))}
            {!invitation ? (
              <>
                {aide(t('La personne reçoit un SMS pour installer l’application et choisir son mot de passe.'))}
                {plein && (
                  <div className="hint-l" role="alert" style={{ color: 'var(--red)' }}>
                    <Icone nom="ban" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
                    <span>{tf('{n} accès employés sur {n} : retirez un accès pour en ajouter un.', { n: e.maxEmployes })}</span>
                  </div>
                )}
                <div className="fld">
                  <label htmlFor="eq-nom">{t('Prénom et nom')}</label>
                  <div className="inp" style={{ borderColor: erreurs.nom ? 'var(--red)' : undefined }}>
                    <input id="eq-nom" autoComplete="off" value={nom} onChange={(x) => (setNom(x.target.value), setErreurs({}))} placeholder={t('Ex. : Paul Ekambi')} style={CHAMP} />
                  </div>
                  {erreurs.nom && (
                    <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
                      {erreurs.nom}
                    </div>
                  )}
                </div>
                <div className="fld">
                  <label htmlFor="eq-tel">{t('Téléphone')}</label>
                  <div className="inp" style={{ borderColor: erreurs.tel ? 'var(--red)' : undefined }}>
                    <span className="b7 c3">+237</span>
                    <input id="eq-tel" inputMode="tel" autoComplete="off" value={tel} onChange={(x) => (setTel(x.target.value.replace(/[^\d\s]/g, '').slice(0, 12)), setErreurs({}))} placeholder="677 12 34 56" style={CHAMP} />
                  </div>
                  {erreurs.tel && (
                    <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
                      {erreurs.tel}
                    </div>
                  )}
                </div>
                <GrilleDroits droits={droitsAjout} changer={setDroitsAjout} />
                {erreurs.general && (
                  <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
                    {erreurs.general}
                  </div>
                )}
                <div className="mt14">
                  <Bouton icone="send" inactif={plein || !nom.trim() || tel.replace(/\D/g, '').length < 9 || droitsAjout.length === 0} onClick={() => void inviter()}>
                    {t('Envoyer l’invitation')}
                  </Bouton>
                </div>
                <p className="t12 c3 center" style={{ margin: '8px 0 0' }}>
                  {t('Pour confirmer, un code vous est envoyé par SMS au téléphone personnel du propriétaire.')}
                </p>
                <div className="mt8">
                  <Bouton classe="ghost" onClick={fermerAjout}>
                    {t('Annuler')}
                  </Bouton>
                </div>
              </>
            ) : (
              <CodeSms
                masque={invitation.masque}
                bouton="Confirmer l’ajout"
                icone="user-plus"
                renvoyer={async () => void (await source.compte.demanderCode('appareil'))}
                annuler={fermerAjout}
                valider={async (code) => {
                  const r = await source.equipe.confirmerInvitation(invitation.id, code)
                  if (!r.ok) return t(r.raison === 'code' ? 'Code incorrect, réessayez. Rien n’a été créé.' : 'Invitation expirée : recommencez.')
                  dire(tf('{nom} est ajouté(e) : un SMS l’invite à installer l’application.', { nom: invitation.nom }))
                  setNom('')
                  setTel('')
                  setDroitsAjout(normaliserDroits(PROFILS.preparation.droits))
                  fermerAjout()
                  return null
                }}
              />
            )}
          </Feuille>
          <Feuille ouverte={action?.type === 'retrait'} fermer={() => setAction(null)} titre="Supprimer un accès">
            {action?.type === 'retrait' && (
              <>
                {titreFeuille(tf('Supprimer l’accès de {nom} ?', { nom: nomComplet(action.membre) }))}
                {aide(t('La session est coupée tout de suite. Ses actions passées restent signées dans les journaux des commandes.'))}
                <CodeSms
                  masque={action.masque}
                  bouton="Supprimer l’accès"
                  icone="trash-2"
                  annuler={() => setAction(null)}
                  valider={async (code) => {
                    const r = await source.equipe.retirer(action.membre.id, code)
                    if (!r.ok) return t('Code incorrect, réessayez. Rien n’a été retiré.')
                    dire(tf('Accès de {nom} supprimé.', { nom: action.membre.prenom }))
                    setAction(null)
                    return null
                  }}
                />
              </>
            )}
          </Feuille>
          <Feuille ouverte={action?.type === 'reactivation'} fermer={() => setAction(null)} titre="Réactiver un accès">
            {action?.type === 'reactivation' && (
              <>
                {titreFeuille(tf('Réactiver l’accès de {nom} ?', { nom: nomComplet(action.membre) }))}
                {aide(t('La personne retrouve ses droits à sa prochaine connexion.'))}
                <CodeSms
                  masque={action.masque}
                  bouton="Réactiver l’accès"
                  icone="user-check"
                  annuler={() => setAction(null)}
                  valider={async (code) => {
                    const r = await source.equipe.reactiver(action.membre.id, code)
                    if (!r.ok) return t('Code incorrect, réessayez. Rien n’a changé.')
                    dire(tf('Accès de {nom} réactivé.', { nom: action.membre.prenom }))
                    setAction(null)
                    return null
                  }}
                />
              </>
            )}
          </Feuille>
          <Feuille ouverte={action?.type === 'droits'} fermer={() => setAction(null)} titre="Droits de l’employé">
            {action?.type === 'droits' && (
              <>
                {titreFeuille(tf('Droits de {nom}', { nom: nomComplet(action.membre) }))}
                {action.masque === null ? (
                  <>
                    {aide(t('Chaque écran et chaque bouton suivent ces droits : ce qui n’est pas coché est masqué ou dit « Réservé ».'))}
                    <GrilleDroits droits={action.droits} changer={(d) => setAction({ ...action, droits: d })} />
                    <div className="mt14">
                      <Bouton
                        icone="shield-check"
                        inactif={action.droits.length === 0 || action.droits.join() === normaliserDroits(action.membre.droits).join()}
                        onClick={() => void source.equipe.demanderCodeMembre(action.membre.id, 'droits').then(({ masque }) => setAction({ ...action, masque }))}
                      >
                        {t('Enregistrer les droits')}
                      </Bouton>
                    </div>
                    <div className="mt8">
                      <Bouton classe="ghost" onClick={() => setAction(null)}>
                        {t('Annuler')}
                      </Bouton>
                    </div>
                  </>
                ) : (
                  <CodeSms
                    masque={action.masque}
                    bouton="Confirmer les droits"
                    icone="shield-check"
                    annuler={() => setAction(null)}
                    valider={async (code) => {
                      const r = await source.equipe.changerDroits(action.membre.id, action.droits, code)
                      if (!r.ok) return t(r.raison === 'code' ? 'Code incorrect, réessayez. Rien n’a changé.' : 'Cochez au moins un droit.')
                      dire(tf('Droits de {nom} enregistrés : {role}.', { nom: action.membre.prenom, role: t(NOM_PROFIL[r.membre.profil ?? 'personnalise']) }))
                      setAction(null)
                      return null
                    }}
                  />
                )}
              </>
            )}
          </Feuille>
          <Feuille ouverte={action?.type === 'journal'} fermer={() => setAction(null)} titre="Journal des actions">
            {action?.type === 'journal' && (
              <>
                {titreFeuille(tf('Journal de {nom}', { nom: nomComplet(action.membre) }))}
                {aide(t('Chaque geste est signé à son nom, avec l’heure.'))}
                {action.lignes.length === 0 ? (
                  <p className="t14 c2 mt12">{t('Aucune action pour l’instant.')}</p>
                ) : (
                  <div className="mt8">
                    {action.lignes.map((l, i) => (
                      <div key={l.a + '-' + i} className="kv">
                        <span className="k">
                          {t(l.texte)}
                          {l.ref && l.route && (
                            <>
                              {' · '}
                              <Link to={versRoute(l.route)} className="cor b8">
                                {l.ref}
                              </Link>
                            </>
                          )}
                        </span>
                        <span className="v ">{quand(l.a)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt14">
                  <Bouton classe="ghost" onClick={() => setAction(null)}>
                    {t('Fermer')}
                  </Bouton>
                </div>
              </>
            )}
          </Feuille>
        </>
      }
    >
      <div className="pg">
        <h1 className="pg-t">{t('Mon équipe')}</h1>
        <p className="pg-s">{t('Un accès par personne : on sait toujours qui a fait quoi.')}</p>
      </div>
      <BandeauHorsLigne />
      {e.membres.map((m) => (
        <div key={m.id} className="card" data-membre={m.id}>
          <div className="row" style={{ gap: '12px', alignItems: 'flex-start' }}>
            <span style={{ width: '44px', height: '44px', borderRadius: '50%', background: m.role === 'proprietaire' ? 'var(--ink)' : m.etat === 'suspendu' ? 'var(--ink-4)' : 'var(--bronze)', color: 'var(--card)', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: '0' }}>{m.initiales}</span>
            <span className="grow" style={{ minWidth: 0 }}>
              <span className="row" style={{ gap: '6px', flexWrap: 'wrap' }}>
                <span className="lt">{nomComplet(m)}</span>
                <span className={'pill sm ' + (m.role === 'proprietaire' ? 'or' : 'ink')}>{t(m.role === 'proprietaire' ? 'Propriétaire' : NOM_PROFIL[m.profil ?? 'personnalise'])}</span>
                {m.etat === 'invite' && <span className="pill amber sm">{t('Invitée')}</span>}
                {m.etat === 'suspendu' && <span className="pill red sm">{t('Suspendu')}</span>}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {m.role === 'proprietaire'
                  ? t('Vous · tout, dont l’argent et les prix')
                  : m.etat === 'invite'
                    ? tf('Invitation envoyée le {d} · valable jusqu’au {j}', { d: dateCourte(m.depuis, langue), j: dateCourte(m.inviteJusqua ?? m.depuis, langue) })
                    : m.etat === 'suspendu'
                      ? tf('Suspendu le {d} · session coupée', { d: dateCourte(m.suspenduLe ?? m.depuis, langue) })
                      : m.derniereAction
                        ? tf('Dernière action : {action} à {h}', { action: t(m.derniereAction.texte), h: heure(m.derniereAction.a, langue) })
                        : tf('Depuis le {d}', { d: dateCourte(m.depuis, langue) })}
              </span>
              {m.role !== 'proprietaire' && (
                <span className="t12 c3" style={{ display: 'block', marginTop: '2px' }}>
                  {tf('Droits : {liste}', { liste: resume(m.droits) })}
                </span>
              )}
            </span>
          </div>
          {m.role !== 'proprietaire' && (
            <div className="row mt12" style={{ gap: '8px', flexWrap: 'wrap' }}>
              {m.etat === 'invite' ? (
                <>
                  <Bouton classe="secondary sm" icone="send" onClick={() => void source.equipe.renvoyerInvitation(m.id).then((r) => dire(r.ok ? tf('SMS d’invitation renvoyé à {nom}.', { nom: m.prenom }) : t('Attendez une minute avant de renvoyer le SMS.'), r.ok ? 'ok' : 'erreur'))}>
                    {t('Renvoyer le SMS')}
                  </Bouton>
                  <Bouton classe="ghost sm" icone="x" etiquette={tf('Annuler l’invitation de {nom}', { nom: nomComplet(m) })} onClick={() => void source.equipe.annulerInvitation(m.id).then((r) => r.ok && dire(tf('Invitation de {nom} annulée.', { nom: m.prenom })))}>
                    {t('Annuler l’invitation')}
                  </Bouton>
                </>
              ) : (
                <>
                  <Bouton classe="secondary sm" icone="shield-check" etiquette={tf('Droits de {nom}', { nom: nomComplet(m) })} onClick={() => setAction({ type: 'droits', membre: m, droits: normaliserDroits(m.droits), masque: null })}>
                    {t('Droits')}
                  </Bouton>
                  <Bouton classe="secondary sm" icone="history" etiquette={tf('Journal de {nom}', { nom: nomComplet(m) })} onClick={() => void journal(m)}>
                    {t('Journal')}
                  </Bouton>
                  {m.etat === 'suspendu' ? (
                    <Bouton classe="secondary sm" icone="user-check" etiquette={tf('Réactiver l’accès de {nom}', { nom: nomComplet(m) })} onClick={() => void ouvrir('reactivation', m)}>
                      {t('Réactiver')}
                    </Bouton>
                  ) : (
                    <Bouton classe="secondary sm" icone="pause" etiquette={tf('Suspendre l’accès de {nom}', { nom: nomComplet(m) })} onClick={() => void suspendre(m)}>
                      {t('Suspendre')}
                    </Bouton>
                  )}
                </>
              )}
              <Bouton classe="danger sm" icone="trash-2" etiquette={tf('Supprimer l’accès de {nom}', { nom: nomComplet(m) })} onClick={() => void ouvrir('retrait', m)}>
                {t('Supprimer')}
              </Bouton>
            </div>
          )}
        </div>
      ))}
      <div className="hint-l">
        <Icone nom="users" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{plein ? tf('{n} accès employés sur {n} : retirez un accès pour en ajouter un.', { n: e.maxEmployes }) : tf(e.employes > 1 ? '{e} accès employés sur {max} · sur tous les plans' : '{e} accès employé sur {max} · sur tous les plans', { e: e.employes, max: e.maxEmployes })}</span>
      </div>
      <div className="mt16">
        <Bouton icone="user-plus" inactif={plein} onClick={ajout.ouvrir}>
          {t('Ajouter un accès')}
        </Bouton>
      </div>
      <div className="note ink">
        <Icone nom="ban" taille={18} />
        <div>{t('Ne partagez jamais votre compte : en cas de litige, on doit savoir qui a fait quoi.')}</div>
      </div>
      <details className="more">
        <summary>
          <Icone nom="eye" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">{t('Rôles et droits')}</span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b">
          {(['preparation', 'stock', 'service_client'] as const).map((p) => (
            <p key={p}>
              <b>{t(PROFILS[p].titre)}</b>
              {' : '}
              {t(PROFILS[p].resume)}
            </p>
          ))}
          <p>
            <b>{t('Personnalisé')}</b>
            {' : '}
            {t('vous cochez vous-même chaque droit.')}
          </p>
          <div className="kick" style={{ marginTop: '10px' }}>
            {t('Jamais pour un employé')}
          </div>
          {TOUTES.filter((d) => d.jamais).map((d) => (
            <div key={d.id} className="row" style={{ gap: '10px', padding: '7px 0', alignItems: 'flex-start' }}>
              <Icone nom="x" taille={17} trait={2.6} style={{ flexShrink: '0', marginTop: '1px', color: 'var(--red)' }} />
              <span className="grow t14" style={{ color: 'var(--ink)' }}>
                {t(d.jamais!)}
              </span>
            </div>
          ))}
          <p className="t13 c2" style={{ margin: '10px 0 0' }}>
            {t('Vous, propriétaire, pouvez tout faire.')}
          </p>
          {premierEmploye && (
            <Link to={chemin('accueil', { role: premierEmploye.id })} className="row t13 b8 cor" style={{ gap: '6px', minHeight: '44px' }}>
              <Icone nom="eye" taille={16} />
              {tf('Voir l’accueil de {prenom}', { prenom: premierEmploye.prenom })}
            </Link>
          )}
        </div>
      </details>
      <details className="more">
        <summary>
          <Icone nom="shield-check" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">{t('Comment ça marche')}</span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b">
          <p>{t('Ajouter un accès, changer des droits, réactiver ou supprimer demande un code reçu par SMS au téléphone personnel du propriétaire : c’est votre second facteur.')}</p>
          <p>{t('Suspendre coupe la session tout de suite, sans code : en cas de doute, suspendez d’abord.')}</p>
          <p>{t('Chaque action est signée par son auteur et visible dans le journal de la commande.')}</p>
          <p>{t('Un employé ajoute des photos et des preuves à un litige ; la réponse (accepter, contester, arrangement) reste au propriétaire.')}</p>
        </div>
      </details>
      {e.historique.length > 0 && (
        <div className="card">
          <h3>{t('Historique de l’équipe')}</h3>
          <div className="mt6">
            {e.historique.map((h) => (
              <div key={h.a + h.membre + h.action} className="kv">
                <span className="k">
                  {tf(HISTORIQUE[h.action], { par: h.par, membre: h.membre, role: t(NOM_PROFIL[(h.detail as ProfilAcces | undefined) ?? 'preparation'] ?? 'Préparation') })}
                </span>
                <span className="v ">{quand(h.a)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Ecran>
  )
}

const HISTORIQUE = {
  ajout: '{par} a ajouté {membre} ({role})',
  retrait: '{par} a retiré {membre} : session coupée',
  droits: '{par} a changé les droits de {membre} ({role})',
  suspension: '{par} a suspendu {membre} : session coupée',
  reactivation: '{par} a réactivé {membre}',
  annulation: '{par} a annulé l’invitation de {membre}',
} as const
