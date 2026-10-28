// Départ demandé par un livreur et absences qu'il a prévenues (DP-66, DP-67), côté entreprise : le livreur est employé
// par l'entreprise, il DEMANDE à partir (motif, texte libre) et PRÉVIENT d'une absence ; l'entreprise décide. Bloc de
// la fiche du livreur : motif, date, préavis DEPART-PREAVIS-J (registre) pendant lequel il travaille normalement (paquets
// jusqu'à la veille du dernier jour, hors service sans perte de Trust Score) ; conditions vérifiées (aucune mission en
// cours, aucun colis sous sa garde, kit constaté ; les litiges ouverts n'empêchent pas, ils suivent leur cours) ; constat
// du kit (restitué, ou incomplet avec photo, éléments manquants de KIT-VALEUR-F et retenue plafonnée, au plus tard
// DEPART-KIT-CONSTAT-H après la fin du préavis ; contestable par le livreur ; silence : « kit non contesté ») ; dernier
// versement détaillé (estimé pendant le préavis, figé à la clôture) ; clôture possible avant la fin du préavis, d'un
// commun accord, avec une confirmation qui dit les effets. Préavis échu : l'administrateur BelivaY peut clôturer à la
// place de l'entreprise. Un abandon en pleine tournée n'est pas un départ : c'est un incident. Départ clos (file
// « Départs ») : détail et « Marquer le versement Mobile Money fait » (propriétaire : SMS au livreur).
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Feuille } from '@client/composants/Feuille'
import { jouer } from '@client/composants/Sons'
import { sonner } from '../../composants/marque-sonore'
import { F } from '@client/i18n/format'
import { versAnglais } from '@client/i18n/texte'
import { PARAMETRES_FLOTTE } from '../../calculs/flotte'
import { Icone } from '../../composants/Icone'
import { Champ, Kv, Panel, Pill, Rangee, type Ton } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import type { AbsenceLivreur, ConditionDepart, DemandeDepart, MotifAbsence, MotifDepart } from '../../donnees/domaines/livreurs'
import { source } from '../../donnees/source'
import { usePreferences } from '../../preferences'
import { useHorloge, useMontantsVisibles, usePeut } from '../../session'
import { ChoixFichier, type Fichier } from '../ENT-03/ChoixFichier'
import { useDates } from '../ENT-03/outils'
import { TexteTraduisible } from '@client/traduction/Traduisible'

const P = PARAMETRES_FLOTTE
export const NOM_MOTIF: Record<MotifDepart, string> = { autre_emploi: 'Autre emploi', horaires: 'Horaires', remuneration: 'Rémunération', demenagement: 'Déménagement', sante: 'Santé', personnel: 'Raison personnelle', autre: 'Autre' }
export const NOM_MOTIF_ABSENCE: Record<MotifAbsence, string> = { maladie: 'Maladie', deuil_famille: 'Deuil ou famille', panne_moto: 'Panne de moto', demarches: 'Démarches', autre: 'Autre' }
/** Ce qui manque encore pour clôturer, en mots. */
export const NOM_MANQUE: Record<ConditionDepart, string> = { sans_mission: 'une mission est encore en cours', sans_colis: 'des colis sont encore sous sa garde', kit_constate: 'le kit n’est pas encore constaté' }

/** Montant en francs (« 12 000 F »), dans la langue choisie. */
function useFrancs() {
  const { langue } = usePreferences()
  return (n: number) => (langue === 'en' ? versAnglais(`${F(n)} F`) : `${F(n)} F`)
}

/** État d'une demande en une pastille : clôturée, préavis échu, prête à clôturer, en préavis. */
export function etatDepart(d: DemandeDepart): [string, Ton] {
  if (d.etat === 'close') return [d.closPar === 'admin' ? 'Clôturé par BelivaY' : 'Clôturé', 'ink']
  if (d.echu) return ['Préavis échu', 'red']
  return d.manquantes.length ? ['En préavis', 'amber'] : ['Prêt à clôturer', 'green']
}

/** Veille du dernier jour du préavis : dernier jour où l'on peut lui confier un paquet. */
export const veilleDernierJour = (d: DemandeDepart) => d.affectationJusqua - 1

/** Absence en cours ou à venir, en une ligne : « du 14 oct. au 15 oct. ». */
export function useJoursAbsence() {
  const { jourCivil } = useDates()
  const { tf } = usePreferences()
  return (a: AbsenceLivreur) => (a.du === a.au ? tf('le {d}', { d: jourCivil(a.du) }) : tf('du {d} au {f}', { d: jourCivil(a.du), f: jourCivil(a.au) }))
}

/** Repères d'une absence : imprévu (délai court, sans pénalité), prévenue après le début du créneau. */
export function BadgesAbsence({ a }: { a: AbsenceLivreur }) {
  const { t } = usePreferences()
  if (!a.imprevu && !a.apresDebut) return null
  return (
    <span className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
      {a.imprevu && (
        <Pill ton="amber" sm icone="zap">
          {t('Imprévu')}
        </Pill>
      )}
      {a.apresDebut && (
        <Pill ton="red" sm icone="clock-alert">
          {t('Prévenue après le début du créneau')}
        </Pill>
      )}
    </span>
  )
}

/** Bloc « Départ demandé » de la fiche du livreur (la confirmation de la clôture est la feuille FeuilleCloture). */
export function BlocDepart({ d, peut, prenom, cloturer }: { d: DemandeDepart; peut: boolean; prenom: string; cloturer: () => void }) {
  const { t, tf } = usePreferences()
  const { date, dateHeure } = useDates()
  const maintenant = useHorloge()
  const c = d.conditions
  const pret = d.manquantes.length === 0
  const [libelle, ton] = etatDepart(d)
  const jours = Math.max(0, Math.ceil((d.preavisJusqua - maintenant) / 86_400_000))
  const permise = maintenant < d.affectationJusqua
  const condition = (ok: boolean, titre: string, sous: string) => <Rangee icone={ok ? 'circle-check' : 'circle-x'} ton={ok ? 'green' : 'amber'} titre={titre} sous={sous} />
  const employeur = d.initiative === 'entreprise'
  const kitSous = d.kit.constat === 'restitue' ? t('Restitué, constaté par votre entreprise') : d.kit.constat === 'incomplet' ? t('Incomplet, constaté avec photo : retenue sur son dernier relevé') : t('Restitué ou incomplet : à constater par vous, plus bas')
  return (
    <Panel titre={employeur ? t('Fin de contrat décidée par votre entreprise') : t('Départ demandé')} icone="log-out" tonIcone={d.echu ? 'red' : 'amber'} droite={<Pill ton={ton} dot sm>{t(libelle)}</Pill>} id="depart" className="mt14">
      {employeur ? (
        d.texte && <Kv k={t('Motif écrit')} v={<TexteTraduisible texte={d.texte} />} />
      ) : (
        <>
          <Kv k={t('Motif')} v={t(NOM_MOTIF[d.motif])} />
          {d.texte && <Kv k={tf('Mots de {nom}', { nom: prenom })} v={<>« <TexteTraduisible texte={d.texte} /> »</>} />}
        </>
      )}
      <Kv k={employeur ? t('Décidée le') : t('Demandé le')} v={dateHeure(d.demandeLe)} />
      <Kv k={t('Préavis')} v={d.echu ? tf('échu le {d}', { d: dateHeure(d.preavisJusqua) }) : tf('jusqu’au {d} · encore {n} jour(s)', { d: dateHeure(d.preavisJusqua), n: jours })} />
      {permise ? (
        <Rangee icone="package-check" ton="green" titre={tf('Vous pouvez lui confier des paquets jusqu’au {d}', { d: date(veilleDernierJour(d)) })} sous={tf('Plus aucune nouvelle affectation à partir du dernier jour du préavis ({d}) ; les missions en cours se finissent normalement.', { d: date(d.affectationJusqua) })} />
      ) : (
        <Rangee icone="package-x" ton="amber" titre={t('Dernier jour du préavis atteint : plus de nouveau paquet')} sous={t('Plus aucune nouvelle affectation ; les missions en cours se finissent normalement.')} />
      )}
      {d.echu ? (
        <div className="dk-banner red mt10" role="status">
          <Icone nom="shield-alert" taille={20} />
          <div className="grow">{t('Préavis échu : l’administrateur BelivaY peut clôturer à votre place dès que les conditions sont remplies. Le livreur n’est jamais retenu.')}</div>
        </div>
      ) : (
        <p className="t12 c3 mt6 lh">{tf('Préavis de {p} jours (registre) : {nom} travaille normalement ; passer hors service ne lui coûte aucun point de Trust Score. Sans clôture de votre part à la fin du préavis, l’administrateur BelivaY clôture.', { p: P.preavisDepartJours, nom: prenom })}</p>
      )}
      <h3 className="t14 b8 mt14">{t('Conditions de la clôture')}</h3>
      {condition(c.missionsEnCours === 0, t('Aucune mission en cours'), c.missionsEnCours ? tf('{n} mission(s) en cours : il les finit pendant le préavis', { n: c.missionsEnCours }) : t('Toutes ses missions sont finies'))}
      {condition(c.colisSousGarde === 0, t('Aucun colis sous sa garde'), c.colisSousGarde ? tf('{n} colis encore sous sa garde', { n: c.colisSousGarde }) : t('Chaque colis a été remis avec sa preuve'))}
      {condition(c.kitConstate, t('Kit constaté'), kitSous)}
      <Rangee icone="scale" ton="ink" titre={tf('Litiges ouverts : {n}', { n: c.litigesOuverts })} sous={t('Ils n’empêchent pas le départ : ils suivent leur cours après.')} />
      <BlocKit d={d} peut={peut} prenom={prenom} />
      <BlocVersement d={d} prenom={prenom} />
      {peut && d.etat === 'demande' && (
        <>
          {!pret ? (
            <p className="t13 c2 mt10">{tf('Clôture impossible pour l’instant : {m}.', { m: d.manquantes.map((x) => t(NOM_MANQUE[x])).join(', ') })}</p>
          ) : (
            !d.echu && <p className="t13 c2 mt10">{employeur ? tf('Conditions remplies : la clôture avant la fin du préavis demande l’accord de {nom}.', { nom: prenom }) : tf('Conditions remplies : vous pouvez clôturer dès maintenant, avant la fin du préavis, d’un commun accord avec {nom}.', { nom: prenom })}</p>
          )}
          <div className="btns mt10">
            <button type="button" className="btn danger" disabled={!pret} onClick={cloturer}>
              <Icone nom="log-out" taille={18} />
              <span>{t('Clôturer le départ')}</span>
            </button>
            {c.missionsEnCours > 0 && (
              <Link className="btn secondary" to={chemin('missions', { livreur: d.livreur.id })}>
                <Icone nom="map" taille={18} />
                <span>{t('Voir ses missions')}</span>
              </Link>
            )}
          </div>
        </>
      )}
      <p className="t12 c3 mt10 lh">{t('Un abandon en pleine tournée n’est pas un départ : déclarez un incident. Après le départ, les preuves de ses missions restent conservées ; il demande ses données à BelivaY.')}</p>
    </Panel>
  )
}

const REFUS_KIT: Record<string, string> = {
  photo: 'Joignez une photo lisible du kit rendu.',
  manquants: 'Cochez au moins un élément manquant.',
  element: 'Un élément ne fait plus partie du kit : rechargez la page.',
  delai: 'Délai du constat passé : seul « restitué » reste possible.',
  montant: 'Le montant retenu doit être positif, sans dépasser la valeur des éléments manquants.',
  aucune_demande: 'Cette demande de départ n’est plus ouverte.',
  constat: 'Constat inconnu : choisissez « restitué » ou « incomplet ».',
  conteste: 'Le livreur a contesté la retenue : le constat est figé, BelivaY examine.',
}

/** Kit rendu : constat de l'entreprise (restitué, ou incomplet avec photo et éléments manquants), contestation du livreur. */
function BlocKit({ d, peut, prenom }: { d: DemandeDepart; peut: boolean; prenom: string }) {
  const { t, tf } = usePreferences()
  const { dateHeure, duree } = useDates()
  const francs = useFrancs()
  const maintenant = useHorloge()
  const k = d.kit
  const [mode, setMode] = useState<'restitue' | 'incomplet'>('restitue')
  const [manquants, setManquants] = useState<string[]>([])
  const [photo, setPhoto] = useState<Fichier | null>(null)
  const [moins, setMoins] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [encours, setEncours] = useState(false)
  const ouvert = d.etat === 'demande'
  const valeur = P.kit.elements.filter((e) => manquants.includes(e.libelle)).reduce((n, e) => n + e.valeur, 0)
  const montant = moins.trim() ? Number(moins) : null
  const montantOk = montant === null || (Number.isInteger(montant) && montant > 0 && montant <= valeur)
  const retenue = Math.min(montant ?? valeur, P.kit.total)
  const envoyer = async (constat: 'restitue' | 'incomplet' | null) => {
    if (encours) return
    setEncours(true)
    const r = await source.livreurs.constaterKit(d.livreur.id, constat === 'incomplet' ? { constat, manquants, montant, photo: photo?.lisible ? photo.nom : null } : { constat })
    setEncours(false)
    jouer(r.ok ? 'interrupteur' : 'erreur')
    if (!r.ok) return setErreur(t(REFUS_KIT[r.raison] ?? REFUS_KIT.aucune_demande))
    setErreur(null)
    setManquants([])
    setPhoto(null)
    setMoins('')
  }
  const reste = k.constatJusqua - maintenant
  return (
    <section className="mt14" aria-label={t('Kit rendu')}>
      <h3 className="t14 b8">{t('Kit rendu')}</h3>
      {k.constat === 'restitue' && <Rangee icone="circle-check" ton="green" titre={t('Kit restitué')} sous={k.constateLe ? tf('constaté par {p} le {d}', { p: k.constatePar ?? '—', d: dateHeure(k.constateLe) }) : undefined} />}
      {k.constat === 'incomplet' && (
        <Rangee
          icone="package-x"
          ton="amber"
          titre={tf('Kit incomplet : {m}', { m: k.manquants.join(', ') })}
          sous={`${tf('Retenue de {r} sur son dernier relevé', { r: francs(k.retenue) })} · ${t('photo jointe')}${k.constateLe ? ' · ' + tf('constaté par {p} le {d}', { p: k.constatePar ?? '—', d: dateHeure(k.constateLe) }) : ''}`}
        />
      )}
      {k.contestation && (
        <Rangee
          icone="scale"
          ton={k.contestation.decision === 'annulee' ? 'green' : 'amber'}
          titre={tf('Retenue contestée par {nom} le {d}', { nom: prenom, d: dateHeure(k.contestation.le) })}
          sous={`« ${k.contestation.motif} » · ${k.contestation.decision === null ? t('BelivaY examine ; le montant est mis de côté jusqu’à sa décision.') : k.contestation.decision === 'maintenue' ? t('BelivaY a maintenu la retenue.') : t('BelivaY a annulé la retenue : le montant lui est versé.')}`}
        />
      )}
      {k.constat === null && ouvert && (
        <>
          {!d.echu ? (
            <p className="t12 c3 mt6 lh">{tf('À constater au retour du kit, au plus tard le {d} ({h} h après la fin du préavis).', { d: dateHeure(k.constatJusqua), h: P.kitConstatH })}</p>
          ) : k.echu ? (
            <div className="dk-banner amber mt10" role="status">
              <Icone nom="hourglass" taille={20} />
              <div className="grow">{t('Délai du constat passé : le constat « incomplet » n’est plus reçu ; « restitué » reste possible. Sans constat, l’administrateur BelivaY peut clôturer « kit non contesté », sans aucune retenue.')}</div>
            </div>
          ) : (
            <div className="dk-banner amber mt10" role="status">
              <Icone nom="timer" taille={20} />
              <div className="grow">{tf('Constat du kit à faire avant le {d} · encore {r}. Passé ce délai, l’administrateur BelivaY peut clôturer « kit non contesté », sans retenue.', { d: dateHeure(k.constatJusqua), r: duree(reste) })}</div>
            </div>
          )}
        </>
      )}
      {peut && ouvert && k.constat === null && (
        <div className="mt10">
          <div className="seg" role="radiogroup" aria-label={t('Constat du kit')}>
            <button type="button" role="radio" aria-checked={mode === 'restitue'} className={mode === 'restitue' ? 'on' : ''} onClick={() => setMode('restitue')}>
              {t('Restitué')}
            </button>
            <button type="button" role="radio" aria-checked={mode === 'incomplet'} className={mode === 'incomplet' ? 'on' : ''} disabled={k.echu} onClick={() => setMode('incomplet')}>
              {t('Incomplet')}
            </button>
          </div>
          {mode === 'restitue' ? (
            <div className="btns mt10">
              <button type="button" className="btn primary" disabled={encours} onClick={() => void envoyer('restitue')}>
                <Icone nom="check" taille={18} />
                <span>{t('Constater : kit restitué')}</span>
              </button>
            </div>
          ) : (
            <form
              className="mt10"
              onSubmit={(e) => {
                e.preventDefault()
                void envoyer('incomplet')
              }}
            >
              <Champ t={tf('Éléments manquants (kit de {v})', { v: francs(P.kit.total) })} groupe>
                <div className="entA-chk" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {P.kit.elements.map((e) => (
                    <label key={e.libelle}>
                      <input type="checkbox" checked={manquants.includes(e.libelle)} onChange={(x) => setManquants((m) => (x.target.checked ? [...m, e.libelle] : m.filter((y) => y !== e.libelle)))} />
                      {`${e.libelle} · ${francs(e.valeur)}`}
                    </label>
                  ))}
                </div>
              </Champ>
              <Champ t={t('Photo du kit rendu (obligatoire)')} className="mt10">
                <ChoixFichier accepte="image/*" fichier={photo} choisir={setPhoto} libelle={t('Choisir la photo du kit')} />
              </Champ>
              <Kv k={t('Valeur des éléments manquants')} v={francs(valeur)} />
              <Champ t={t('Retenir moins (facultatif)')} className="mt6">
                <input inputMode="numeric" value={moins} placeholder={valeur ? String(valeur) : ''} onChange={(e) => setMoins(e.target.value.replace(/\D/g, ''))} aria-invalid={!montantOk} />
              </Champ>
              <p className="t13 b7 mt6">{tf('Retenue sur son dernier relevé : {r}', { r: francs(manquants.length && montantOk ? retenue : 0) })}</p>
              <p className="t12 c3 lh">{tf('Jamais plus que la valeur des éléments manquants, ni que la valeur du kit au registre ({v}) ; jamais au-delà de ce qui lui reste dû. {nom} peut la contester : BelivaY examine.', { v: francs(P.kit.total), nom: prenom })}</p>
              <div className="btns mt10">
                <button type="submit" className="btn danger" disabled={encours || !manquants.length || !photo?.lisible || !montantOk}>
                  <Icone nom="package-x" taille={18} />
                  <span>{t('Constater : kit incomplet')}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}
      {peut && ouvert && k.constat !== null && !k.contestation && (
        <div className="btns mt6">
          <button type="button" className="btn sm ghost" disabled={encours} onClick={() => void envoyer(null)}>
            <Icone nom="undo-2" taille={16} />
            <span>{t('Corriger le constat')}</span>
          </button>
        </div>
      )}
      {erreur && (
        <p className="err mt10" role="alert">
          {erreur}
        </p>
      )}
    </section>
  )
}

/** Dernier versement : estimé à ce jour pendant le préavis, figé à la clôture (montants : propriétaire et comptable). */
function BlocVersement({ d, prenom }: { d: DemandeDepart; prenom: string }) {
  const { t, tf } = usePreferences()
  const { date, dateHeure } = useDates()
  const francs = useFrancs()
  const voir = useMontantsVisibles()
  const v = d.versement
  const moins = (n: number) => `− ${francs(n)}`
  return (
    <section className="mt14" aria-label={t('Dernier versement')}>
      <h3 className="t14 b8">{d.etat === 'demande' ? t('Dernier versement (estimé à ce jour)') : t('Dernier versement')}</h3>
      <Kv k={t('Missions validées')} v={String(v.missions)} />
      {voir && v.du !== null && (
        <>
          <Kv k={t('Dû pour ces missions')} v={francs(v.du)} />
          {v.retenuLitiges > 0 && <Kv k={tf('Retenu : {n} litige(s) ouvert(s)', { n: v.litiges })} v={moins(v.retenuLitiges)} />}
          {v.retenueKit > 0 && <Kv k={t('Retenue du kit')} v={moins(v.retenueKit)} />}
          {v.kitDeCote > 0 && <Kv k={t('Mis de côté (retenue contestée)')} v={moins(v.kitDeCote)} />}
          {v.verse !== null && <Kv k={<b>{t('À verser')}</b>} v={<b>{francs(v.verse)}</b>} />}
        </>
      )}
      {voir && v.du === null && <p className="t12 c3 lh">{t('Pas de tarif par mission affiché : le versement suit votre accord avec lui, pour toutes les missions validées.')}</p>}
      {!voir && <p className="t12 c3 lh">{tf('Litiges ouverts : {n}. Montants : propriétaire et comptable.', { n: v.litiges })}</p>}
      <Kv k={t('Versement')} v={v.faitLe ? tf('fait le {d} · SMS envoyé', { d: dateHeure(v.faitLe) }) : d.versementLe ? tf('{d}, en Mobile Money', { d: date(d.versementLe) }) : t('le vendredi qui suit la clôture, en Mobile Money')} />
      <p className="t12 c3 lh">{tf('Toutes les missions validées sont versées ; seuls les montants liés à un litige ouvert sont retenus, au plus le montant contesté, et versés dès le litige réglé. {nom} reçoit un SMS à la clôture, puis quand le versement est fait.', { nom: prenom })}</p>
    </section>
  )
}

/** Confirmation de la clôture : elle dit les effets avant le geste définitif. */
export function FeuilleCloture({ d, ouverte, fermer }: { d: DemandeDepart; ouverte: boolean; fermer: () => void }) {
  const { t, tf } = usePreferences()
  const { date } = useDates()
  const maintenant = useHorloge()
  const naviguer = useNavigate()
  const [erreur, setErreur] = useState<string | null>(null)
  const [encours, setEncours] = useState(false)
  const cloturer = async () => {
    if (encours) return
    setEncours(true)
    const r = await source.livreurs.cloturerDepart(d.livreur.id)
    setEncours(false)
    if (!r.ok) {
      jouer('erreur')
      setErreur(r.raison === 'conditions' ? tf('Clôture refusée : {m}.', { m: (r.manquantes ?? d.manquantes).map((x) => t(NOM_MANQUE[x as ConditionDepart] ?? x)).join(', ') }) : t('Cette demande de départ n’est plus ouverte.'))
      return
    }
    jouer('valide')
    naviguer(chemin('flotte', { statut: 'departs', clos: d.livreur.id }), { replace: true })
  }
  return (
    <Feuille ouverte={ouverte} fermer={fermer} titre={t('Clôturer le départ')}>
      <h2 className="card-t">{tf('Clôturer le départ de {nom} ?', { nom: d.livreur.nom })}</h2>
      {maintenant < d.preavisJusqua && <p className="card-s">{tf('Le préavis court jusqu’au {d} : vous clôturez avant, d’un commun accord avec lui.', { d: date(d.preavisJusqua) })}</p>}
      <p className="card-s">{t('Ce geste est définitif. Il produit :')}</p>
      <ul className="t13 c2 lh">
        <li>{t('son dernier relevé, arrêté aujourd’hui ;')}</li>
        <li>{t('le versement de ce relevé le vendredi suivant, en Mobile Money, pour toutes les missions validées ;')}</li>
        <li>{t('un SMS au livreur avec la date de ce versement ;')}</li>
        <li>{t('la fermeture de son accès et la déliaison de son téléphone ;')}</li>
        <li>{t('une ligne au journal d’audit ;')}</li>
        <li>{t('un avis à l’administrateur BelivaY.')}</li>
      </ul>
      {erreur && (
        <p className="err mt10" role="alert">
          {erreur}
        </p>
      )}
      <div className="btns mt16">
        <button type="button" className="btn danger" disabled={encours || !!erreur} onClick={() => void cloturer()}>
          {t('Clôturer définitivement')}
        </button>
        <button type="button" className="btn ghost" onClick={fermer}>
          {t('Annuler')}
        </button>
      </div>
    </Feuille>
  )
}

/** Départ clos (file « Départs ») : clôture, kit, dernier versement ; le propriétaire marque le versement fait. */
export function DetailDepartClos({ d, relire }: { d: DemandeDepart; relire: () => void }) {
  const { t, tf } = usePreferences()
  const { date, dateHeure } = useDates()
  const maintenant = useHorloge()
  const proprio = usePeut(['proprietaire'])
  const [erreur, setErreur] = useState<string | null>(null)
  const [encours, setEncours] = useState(false)
  const prenom = d.livreur.nom
  const fait = async () => {
    if (encours) return
    setEncours(true)
    const r = await source.livreurs.versementFait(d.livreur.id)
    setEncours(false)
    sonner(r.ok ? 'versementFait' : 'erreur')
    if (!r.ok) setErreur(t(r.raison === 'deja_fait' ? 'Ce versement est déjà marqué fait.' : 'Ce départ n’est plus dans la file.'))
    relire()
  }
  return (
    <div>
      <h2 className="card-t">{tf('Départ de {nom}', { nom: d.livreur.nom })}</h2>
      <Kv k={t('Motif')} v={t(NOM_MOTIF[d.motif])} />
      {d.texte && <Kv k={t('Ses mots')} v={<>« <TexteTraduisible texte={d.texte} /> »</>} />}
      <Kv k={t('Demandé le')} v={dateHeure(d.demandeLe)} />
      <Kv k={t('Clôturé le')} v={d.closLe ? `${dateHeure(d.closLe)} · ${d.closPar === 'admin' ? t('par l’administrateur BelivaY') : t('par votre entreprise')}` : '—'} />
      {d.kitNonConteste ? (
        <Rangee icone="shield-check" ton="green" titre={t('Kit non contesté')} sous={tf('Aucun constat dans les {h} h après la fin du préavis : clôturé par BelivaY sans aucune retenue.', { h: P.kitConstatH })} />
      ) : (
        <BlocKit d={d} peut={false} prenom={prenom} />
      )}
      <BlocVersement d={d} prenom={prenom} />
      {erreur && (
        <p className="err mt10" role="alert">
          {erreur}
        </p>
      )}
      {proprio && d.versement.faitLe === null && (
        <div className="btns mt10">
          <button type="button" className="btn primary" disabled={encours} onClick={() => void fait()}>
            <Icone nom="smartphone" taille={18} />
            <span>{t('Marquer le versement Mobile Money fait')}</span>
          </button>
        </div>
      )}
      {d.versement.faitLe === null && d.versementLe !== null && d.versementLe <= maintenant && <p className="t12 b7 mt6" style={{ color: 'var(--amber)' }}>{tf('Versement attendu depuis le {d}.', { d: date(d.versementLe) })}</p>}
    </div>
  )
}

/** Absences prévenues d'un livreur (fiche) : l'entreprise les marque vues, le livreur en est prévenu. */
export function BlocAbsences({ absences, peut }: { absences: AbsenceLivreur[]; peut: boolean }) {
  const { t, tf } = usePreferences()
  const { dateHeure } = useDates()
  const jours = useJoursAbsence()
  if (!absences.length) return null
  return (
    <Panel titre={t('Absences prévenues')} icone="calendar-x" tonIcone="amber" className="mt14" a={{ t: t('Planning des livreurs'), to: chemin('planning', { j: 'semaine' }) }}>
      {absences.map((a) => (
        <Rangee
          key={a.id}
          icone="calendar-x"
          ton="amber"
          titre={`${jours(a)} · ${t(NOM_MOTIF_ABSENCE[a.motif])}`}
          sous={
            <>
              {a.texte && <span style={{ display: 'block' }}>« <TexteTraduisible texte={a.texte} /> »</span>}
              {a.vueLe ? tf('prévenue le {d} · vue le {v}', { d: dateHeure(a.prevenueLe), v: dateHeure(a.vueLe) }) : tf('prévenue le {d}', { d: dateHeure(a.prevenueLe) })}
              <BadgesAbsence a={a} />
            </>
          }
          droite={
            a.vueLe ? (
              <Pill ton="green" sm icone="check">
                {t('Vue')}
              </Pill>
            ) : peut ? (
              <button type="button" className="btn sm primary" onClick={() => void source.livreurs.absenceVue(a.id).then((r) => jouer(r.ok ? 'interrupteur' : 'erreur'))}>
                <Icone nom="check" taille={16} />
                <span>{t('Marquer comme vue')}</span>
              </button>
            ) : (
              <Pill ton="amber" sm dot>
                {t('Pas encore vue')}
              </Pill>
            )
          }
        />
      ))}
      <p className="t12 c3 mt10 lh">{tf('Une absence dure {n} jours au plus ; prévue, elle se prévient {h} h avant ; un imprévu (maladie, deuil ou famille, panne de moto) se prévient le jour même, sans pénalité avant le début de son créneau.', { n: P.absenceMaxJours, h: P.planningPrevenirH })}</p>
    </Panel>
  )
}
