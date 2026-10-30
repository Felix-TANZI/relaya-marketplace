// Droits d'un rôle ou d'un membre, en bref (Profil « Ce que mon rôle permet », fiche « Ce que X peut faire ») : une
// section repliée par défaut, son résumé d'une ligne toujours visible (« 9 actions possibles · 2 en lecture ·
// 12 interdites ») ; ouverte, deux groupes « peut / ne peut pas », rangés par domaine (Argent, Litiges…), une ligne
// courte par élément (✓ / lecture / ✕) ; la raison de chaque interdit est repliée à part. Présentation seule : les
// droits viennent de config/droits.ts et config/acces-console.ts (la source refuse de toute façon).
import type { ReactNode } from 'react'
import { DOMAINES } from '../config/acces-console'
import { PERMISSIONS, type Permission } from '../config/droits'
import type { AccesDomaine } from '../donnees/domaines/equipe'
import { usePreferences } from '../preferences'
import { Icone } from './Icone'

export type EtatDroit = 'oui' | 'lecture' | 'non'
export interface LigneDroit {
  id: string
  quoi: string // ligne courte
  complet?: string // libellé complet (infobulle)
  etat: EtatDroit
  note?: string | null // limite (« Jusqu’à 25 000 F », « Z1, Z3 »)
  pourquoi?: string | null // raison d'un interdit
}
export interface GroupeDroit {
  id: string
  nom: string
  icone: string
  lignes: LigneDroit[]
}

const ICONE_DOMAINE: Record<string, string> = { litiges: 'scale', argent: 'banknote', identites: 'badge-check', catalogue: 'store', logistique: 'truck', terrain: 'map-pin', pilotage: 'sliders-horizontal', gouvernance: 'shield' }
const NOM_COURT: Record<string, string> = { litiges: 'Litiges', argent: 'Argent', identites: 'Vérification', catalogue: 'Catalogue', logistique: 'Logistique', terrain: 'Terrain', pilotage: 'Pilotage', gouvernance: 'Contrôle et équipe' }

/** Libellés courts des gestes (le libellé complet reste en infobulle). */
const COURT: Record<string, string> = {
  demasquer: 'Démasquer une donnée personnelle',
  'piece.consulter': 'Voir une pièce d’identité',
  contresigner: 'Contresigner à quatre yeux',
  exporter: 'Exporter une liste signée',
  'litige.decider': 'Trancher un litige',
  'remboursement.executer': 'Rembourser',
  'versement.executer': 'Verser les vendeurs',
  'kyc.decider': 'Valider une identité',
  'parametre.proposer': 'Proposer un paramètre',
  'parametre.valider': 'Valider un paramètre critique',
  'sanction.decider': 'Décider une sanction',
  'role.attribuer': 'Gérer les comptes employés',
  'compte.saisir': 'Saisir un compte sur le terrain',
  'interrupteur.basculer': 'Ouvrir ou fermer une fonction',
  'fraude.decider': 'Décider une alerte de fraude',
  'tache.lancer': 'Relancer une tâche planifiée',
  'maintenance.programmer': 'Programmer une maintenance',
  'legal.publier': 'Publier un texte légal',
  'equipe.gerer': 'Gérer son équipe',
  'acces.temporaire': 'Accès temporaire, suspension',
  'descente.planifier': 'Planifier une descente',
  'descente.faire': 'Faire une descente',
  'urgence.ouvrir': 'Ouvrir l’accès d’urgence',
}
/** Domaine d'un geste sans page propre (les autres : le domaine de leur page). */
const DOMAINE_GESTE: Record<string, string> = { demasquer: 'identites', 'piece.consulter': 'identites', exporter: 'argent', 'equipe.gerer': 'gouvernance', 'acces.temporaire': 'gouvernance', 'urgence.ouvrir': 'gouvernance', 'descente.planifier': 'terrain', 'descente.faire': 'terrain' }
const domaineDe = (id: string) => {
  const route = (PERMISSIONS as Record<string, { route?: string }>)[id]?.route
  return DOMAINE_GESTE[id] ?? DOMAINES.find((d) => route && d.routes.includes(route))?.id ?? 'gouvernance'
}
const PAGES: Record<AccesDomaine, [string, EtatDroit]> = { oui: ['Ouvrir les pages', 'oui'], zone: ['Ouvrir les pages', 'oui'], part: ['Ouvrir une partie des pages', 'oui'], lecture: ['Consulter les pages', 'lecture'], aucun: ['Ouvrir ces pages', 'non'] }

/** Groupes par domaine : l'accès aux pages du domaine, puis ses gestes. */
export function groupesDroits(domaines: { id: string; acces: AccesDomaine; note?: string | null }[], gestes: { id: string; quoi: string; ok: boolean; limite?: string | null; pourquoi?: string | null }[]): GroupeDroit[] {
  return DOMAINES.map((d) => {
    const a = domaines.find((x) => x.id === d.id)
    const [quoi, etat] = PAGES[a?.acces ?? 'aucun']
    const siens = gestes.filter((x) => domaineDe(x.id) === d.id)
    const note = a?.note ?? (a?.acces === 'zone' ? 'Sa zone' : null)
    // L'accès aux pages n'a sa ligne que s'il dit quelque chose : lecture, limite, refus, ou domaine sans geste.
    const lignes: LigneDroit[] = a?.acces === 'oui' && !note && siens.length ? [] : [{ id: 'pages-' + d.id, quoi, etat, note, complet: d.nom }]
    for (const g of siens) lignes.push({ id: g.id, quoi: COURT[g.id] ?? g.quoi, complet: g.quoi, etat: g.ok ? 'oui' : 'non', note: g.limite ?? null, pourquoi: g.ok ? null : (g.pourquoi ?? null) })
    return { id: d.id, nom: NOM_COURT[d.id] ?? d.nom, icone: ICONE_DOMAINE[d.id] ?? 'circle', lignes }
  })
}

/** Gestes d'un rôle (Profil) : PERMISSIONS, avec la raison de chaque interdit. */
export const gestesDuRole = (role: string) => (Object.entries(PERMISSIONS) as [Permission, (typeof PERMISSIONS)[Permission]][]).map(([id, g]) => ({ id, quoi: g.quoi, ok: (g.roles as string[]).includes(role), pourquoi: g.pourquoi }))

const ICONE_ETAT: Record<EtatDroit, string> = { oui: 'check', lecture: 'eye', non: 'x' }

function Colonne({ titre, ton, groupes }: { titre: string; ton: 'ok' | 'non'; groupes: GroupeDroit[] }) {
  const { t } = usePreferences()
  return (
    <section className={'drt-col ' + ton} aria-label={titre}>
      <h3 className="drt-h">
        <Icone nom={ton === 'ok' ? 'circle-check' : 'circle-x'} taille={18} />
        {titre}
      </h3>
      {groupes.length === 0 && <p className="t13 c3">{t('Aucun')}</p>}
      {groupes.map((g) => (
        <div key={g.id} className="drt-g">
          <h4>
            <Icone nom={g.icone} taille={14} />
            {t(g.nom)}
          </h4>
          <ul>
            {g.lignes.map((l) => (
              <li key={l.id} className={l.etat} title={l.complet ? t(l.complet) : undefined}>
                <span className="drt-i">
                  <Icone nom={ICONE_ETAT[l.etat]} taille={13} trait={3} />
                </span>
                <span className="grow">{t(l.quoi)}</span>
                {l.etat === 'lecture' && <span className="drt-n">{t('lecture')}</span>}
                {l.note && <span className="drt-n">{t(l.note)}</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}

/** Section repliée : résumé visible, puis « peut / ne peut pas » par domaine. */
export function DroitsReplies({ groupes, oui, non, jamais, pied, ouvert }: { groupes: GroupeDroit[]; oui: string; non: string; jamais?: string; pied?: ReactNode; ouvert?: boolean }) {
  const { t, tf } = usePreferences()
  const toutes = groupes.flatMap((g) => g.lignes)
  const n = { oui: toutes.filter((l) => l.etat === 'oui').length, lecture: toutes.filter((l) => l.etat === 'lecture').length, non: toutes.filter((l) => l.etat === 'non').length }
  const garder = (e: EtatDroit[]) => groupes.map((g) => ({ ...g, lignes: g.lignes.filter((l) => e.includes(l.etat)) })).filter((g) => g.lignes.length)
  const raisons = toutes.filter((l) => l.etat === 'non' && l.pourquoi)
  return (
    <details className="drt" open={ouvert}>
      <summary>
        <span className="drt-res">
          <span className="ok">
            <Icone nom="check" taille={14} trait={3} />
            {tf(n.oui === 1 ? '{n} action possible' : '{n} actions possibles', { n: n.oui })}
          </span>
          {n.lecture > 0 && (
            <span className="lec">
              <Icone nom="eye" taille={14} />
              {tf('{n} en lecture', { n: n.lecture })}
            </span>
          )}
          <span className="non">
            <Icone nom="x" taille={14} trait={3} />
            {tf(n.non === 1 ? '{n} interdite' : '{n} interdites', { n: n.non })}
          </span>
        </span>
        <span className="drt-voir">{t('Détail')}</span>
        <Icone nom="chevron-down" taille={18} />
      </summary>
      <div className="drt-c">
        {jamais && (
          <p className="drt-jamais">
            <Icone nom="ban" taille={16} />
            <span>
              <b>{t('Jamais')}</b> · {t(jamais)}
            </span>
          </p>
        )}
        <div className="drt-2">
          <Colonne titre={oui} ton="ok" groupes={garder(['oui', 'lecture'])} />
          <Colonne titre={non} ton="non" groupes={garder(['non'])} />
        </div>
        {raisons.length > 0 && (
          <details className="drt-pq">
            <summary>
              <Icone nom="info" taille={16} />
              {raisons.length === 1 ? t('Pourquoi cette limite ?') : tf('Pourquoi ces {n} limites ?', { n: raisons.length })}
            </summary>
            <ul>
              {raisons.map((l) => (
                <li key={l.id}>
                  <b>{t(l.quoi)}</b> — {t(l.pourquoi!)}
                </li>
              ))}
            </ul>
          </details>
        )}
        {pied}
      </div>
    </details>
  )
}
