// Droits d'un rôle de l'entreprise, en bref (Rôles et accès « Votre rôle », Profil) : une section repliée par défaut,
// son résumé d'une ligne toujours visible (« 8 actions possibles · 5 interdites ») ; ouverte, deux groupes « peut /
// ne peut pas », rangés par domaine (Paquets, Flotte, Argent…), une ligne courte par élément (✓ / ✕) ; la raison de
// chaque interdit est repliée à part. Présentation seule : les droits viennent de config/droits.ts (le serveur refuse
// de toute façon).
import type { ReactNode } from 'react'
import { DROITS } from '../config/droits'
import type { Role } from '../donnees/communs'
import { usePreferences } from '../preferences'
import { Icone } from './Icone'

export type EtatDroit = 'oui' | 'lecture' | 'non'
export interface LigneDroit {
  id: string
  quoi: string // ligne courte
  complet?: string // libellé complet (infobulle)
  etat: EtatDroit
  note?: string | null
  pourquoi?: string | null // raison d'un interdit
}
export interface GroupeDroit {
  id: string
  nom: string
  icone: string
  lignes: LigneDroit[]
}

/** Domaines de l'espace et libellés courts des droits (le libellé complet reste en infobulle). */
const DOMAINES: { id: string; nom: string; icone: string; droits: Record<string, string> }[] = [
  { id: 'paquets', nom: 'Paquets et missions', icone: 'package', droits: { paquets: 'Accepter et rendre les paquets', affecter: 'Affecter les livreurs', incidents: 'Décider des incidents' } },
  { id: 'flotte', nom: 'Flotte', icone: 'truck', droits: { flotte: 'Inviter, approuver un livreur', departs: 'Départs et absences', zones: 'Zones, capacité, véhicules' } },
  { id: 'emploi', nom: 'Équipe', icone: 'briefcase', droits: { emploi: 'Essai, discipline, fin de contrat', horaires: 'Horaires et zones de travail', attestation: 'Attestation de travail' } },
  { id: 'argent', nom: 'Argent', icone: 'banknote', droits: { argent: 'Voir montants et relevés', reglement: 'Changer le compte de règlement' } },
  { id: 'litiges', nom: 'Litiges', icone: 'scale', droits: { 'litige-preparer': 'Préparer une réponse', 'litige-envoyer': 'Envoyer la réponse' } },
  { id: 'entreprise', nom: 'Entreprise et accès', icone: 'shield', droits: { contrat: 'Contrat, pièces, recours', equipe: 'Inviter ou retirer un utilisateur', integrations: 'Gérer les clés d’API' } },
]

/** Libellé court d'un droit (tableau des rôles). */
export const droitCourt = (id: string) => DOMAINES.find((d) => id in d.droits)?.droits[id] ?? DROITS.find((x) => x.id === id)?.quoi ?? id

/** Droits d'un rôle, rangés par domaine. */
export function groupesDroits(role: Role): GroupeDroit[] {
  // Un droit ajouté sans domaine ici n'est pas perdu : il tombe dans « Autres », avec son libellé complet.
  const ranges = new Set(DOMAINES.flatMap((d) => Object.keys(d.droits)))
  const autres = { id: 'autres', nom: 'Autres', icone: 'circle-dot', droits: Object.fromEntries(DROITS.filter((x) => !ranges.has(x.id)).map((x) => [x.id, x.quoi])) }
  return [...DOMAINES, autres].map((d) => ({
    id: d.id,
    nom: d.nom,
    icone: d.icone,
    lignes: DROITS.filter((x) => x.id in d.droits).map((x) => {
      const ok = x.roles.includes(role)
      return { id: x.id, quoi: d.droits[x.id], complet: x.quoi, etat: ok ? ('oui' as const) : ('non' as const), pourquoi: ok ? null : x.pourquoi }
    }),
  })).filter((g) => g.lignes.length)
}

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
