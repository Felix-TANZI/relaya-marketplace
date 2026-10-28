// Pièces communes des écrans « Équipe et accès » (logique-metier/ACCES-CONSOLE.md) : libellés d'équipe, de niveau et
// d'état, ligne d'un membre, accès par domaine, revue des accès (un geste par ligne), feuilles des gestes sur un compte
// (niveau, périmètre, accès temporaire, rôle additionnel, avertir, suspendre, réactiver, désactiver). Fonctions d'abord :
// un verbe et un nombre, aucune phrase d'explication, détails repliés ; la source refuse de toute façon.
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PARAMETRES } from '../../calculs/registre'
import { DecisionMotivee } from '../../composants/DecisionMotivee'
import { Icone } from '../../composants/Icone'
import { Av, Pill, type Ton } from '../../composants/prototype'
import { CODES_EQUIPES, EQUIPES, NOM_NIVEAU, RAISONS_ACCES } from '../../config/acces-console'
import { NOM_ROLE } from '../../config/libelles'
import { ROLES, type Role } from '../../donnees/communs'
import type { AccesDomaine, CodeEquipe, GenreMessage, IssueAcces, LigneRevue, Membre, Niveau, Perimetre, RaisonAcces, RevueAcces } from '../../donnees/domaines/equipe'
import type { EtatCompte } from '../../donnees/domaines/gouvernance'
import { source } from '../../donnees/source'
import { usePreferences } from '../../preferences'
import { useHorloge, useSession } from '../../session'
import './equipe.css'

export const ETAT_COMPTE: Record<EtatCompte, [string, Ton]> = { actif: ['Actif', 'green'], invitation: ['Invité', 'blue'], a_contresigner: ['À valider', 'amber'], suspendu: ['Suspendu', 'red'], ferme: ['Parti', 'ink'] }
export const ACCES_DOMAINE: Record<AccesDomaine, [string, Ton | null, string]> = { oui: ['Oui', 'green', 'check'], zone: ['Sa zone', 'blue', 'map-pin'], part: ['Une partie', 'blue', 'circle-dot'], lecture: ['Lecture', 'ink', 'eye'], aucun: ['Non', null, 'x'] }
export const TON_NIVEAU: Record<Niveau, Ton> = { agent: 'ink', senior: 'blue', responsable: 'acc' }

const fr = (f: number) => `${f.toLocaleString('fr-FR').replace(/[\s  ]/g, ' ')} F`

/** Périmètre en clair : « Z1, Z3 · litiges niveau 1 · plafond 25 000 F ». */
export function useTextePerimetre() {
  const { t, tf } = usePreferences()
  return (p: Perimetre) => {
    const x = p.zones ? [p.zones.join(', ')] : []
    if (p.niveauLitige) x.push(tf('litiges niveau {n}', { n: p.niveauLitige }))
    if (p.plafond !== null) x.push(tf('plafond {f}', { f: fr(p.plafond) }))
    return x.join(' · ') || t('Tout le périmètre')
  }
}

/** Raison de refus de la source, en mots ; le détail d'un conflit (« Finance + Médiation : … ») en plus. */
export function useRaisonAcces() {
  const { t, tf } = usePreferences()
  return (r: { raison: string; detail?: string }) => {
    if (r.raison === 'motif_court') return tf('Le motif doit compter au moins {n} caractères.', { n: PARAMETRES.console.motifMin })
    const base = t(RAISONS_ACCES[r.raison as RaisonAcces] ?? 'Le geste n’a pas pu être fait. Rien n’a été appliqué.')
    if (r.raison === 'dossiers_en_cours' && r.detail) return `${base} (${tf('{n} dossier(s)', { n: r.detail })})`
    return r.raison === 'conflit' && r.detail ? `${base} ${r.detail}` : base
  }
}

/** Issue d'un geste qui peut attendre la Direction : null (fait), ou le message du refus. */
export function useIssue() {
  const raison = useRaisonAcces()
  return (r: IssueAcces | { ok: true } | { ok: false; raison: string; detail?: string }) => (r.ok ? null : raison(r))
}

export function PastilleNiveau({ n }: { n: Niveau }) {
  const { t } = usePreferences()
  return (
    <Pill ton={TON_NIVEAU[n]} sm icone={n === 'responsable' ? 'star' : n === 'senior' ? 'chevron-up' : undefined}>
      {t(NOM_NIVEAU[n])}
    </Pill>
  )
}
export function PastilleEtat({ e }: { e: EtatCompte }) {
  const { t } = usePreferences()
  return (
    <Pill ton={ETAT_COMPTE[e][1]} sm dot>
      {t(ETAT_COMPTE[e][0])}
    </Pill>
  )
}

/** Une personne : initiales, nom, niveau, périmètre, état (une ligne, cliquable). */
export function LigneMembre({ m, droite, onClick, to }: { m: Membre; droite?: ReactNode; onClick?: () => void; to?: string }) {
  const { t } = usePreferences()
  const p = useTextePerimetre()
  const n = useHorloge()
  const temp = m.temporaires.filter((x) => x.etat === 'actif' && x.fin > n).length
  const corps = (
    <>
      <Av initiales={m.agent.initiales} ton={m.etat === 'suspendu' ? 'red' : m.etat === 'ferme' ? 'gris' : undefined} />
      <span className="eq-m-t">
        <b>{`${m.agent.prenom} ${m.agent.nom}`}</b>
        <span className="eq-m-s">{p(m.perimetre)}</span>
      </span>
      <span className="eq-m-p">
        <PastilleNiveau n={m.niveau} />
        {temp > 0 && (
          <Pill ton="amber" sm icone="clock">
            {t('Temporaire')}
          </Pill>
        )}
        {m.conflits.some((c) => !c.dossier) && (
          <Pill ton="red" sm icone="triangle-alert">
            {t('Conflit')}
          </Pill>
        )}
        {m.etat !== 'actif' && <PastilleEtat e={m.etat} />}
      </span>
      {droite}
    </>
  )
  if (to)
    return (
      <Link className="eq-m" to={to}>
        {corps}
      </Link>
    )
  return onClick ? (
    <button type="button" className="eq-m" onClick={onClick}>
      {corps}
    </button>
  ) : (
    <div className="eq-m">{corps}</div>
  )
}

/** Revue des accès d'une équipe : un geste par ligne (Confirmer ; Retirer, motivé). */
export function Revue({ r, peut }: { r: RevueAcces; peut: boolean }) {
  const { t, tf } = usePreferences()
  const issue = useIssue()
  const [retirer, setRetirer] = useState<LigneRevue | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const moi = useSession().agent?.id
  const restants = r.lignes.filter((l) => !l.decision)
  return (
    <div className="card eq-revue">
      <div className="eq-tete">
        <h3 className="card-t">
          <Icone nom={EQUIPES[r.equipe].icone} taille={18} />
          {tf('Revoir {n} accès · {e}', { n: restants.length, e: t(EQUIPES[r.equipe].nom) })}
        </h3>
        {r.enRetard && (
          <Pill ton="red" sm icone="clock">
            {t('En retard')}
          </Pill>
        )}
      </div>
      <ul className="eq-lignes">
        {r.lignes.map((l) => (
          <li key={l.id} className={l.decision ? 'faite' : ''}>
            <span className="grow">
              <b>{l.nom}</b>
              <span className="t13 c3">{l.acces}</span>
            </span>
            {l.decision ? (
              <Pill ton={l.decision === 'confirme' ? 'green' : 'red'} sm icone={l.decision === 'confirme' ? 'check' : 'x'}>
                {t(l.decision === 'confirme' ? 'Confirmé' : 'Retiré')}
              </Pill>
            ) : (
              peut &&
              l.membreId !== moi && (
                <span className="eq-2g">
                  <button
                    type="button"
                    className="btn sm secondary"
                    aria-label={tf('Confirmer : {n}, {a}', { n: l.nom, a: l.acces })}
                    onClick={async () => {
                      const x = await source.equipe.revoir(l.id, 'confirme', '')
                      setErreur(issue(x))
                    }}
                  >
                    <Icone nom="check" taille={16} />
                    <span>{t('Confirmer')}</span>
                  </button>
                  <button type="button" className="lnk" aria-label={tf('Retirer : {n}, {a}', { n: l.nom, a: l.acces })} onClick={() => setRetirer(l)}>
                    {t('Retirer')}
                  </button>
                </span>
              )
            )}
          </li>
        ))}
      </ul>
      {erreur && (
        <p className="e-erreur" role="alert">
          {erreur}
        </p>
      )}
      <DecisionMotivee
        ouverte={!!retirer}
        fermer={() => setRetirer(null)}
        titre={retirer ? tf('Retirer : {n}', { n: retirer.nom }) : ''}
        resume={retirer?.acces ?? ''}
        libelle="Retirer"
        icone="x"
        danger
        envoyer={async (m) => issue(await source.equipe.revoir(retirer!.id, 'retire', m))}
      />
    </div>
  )
}

export type GesteFeuille = 'niveau' | 'perimetre' | 'temporaire' | 'role' | 'avertir' | 'suspendre' | 'reactiver' | 'desactiver'

/** Feuilles des gestes sur un compte (motif écrit, journalisé ; quatre yeux selon la règle : la source le décide). */
export function FeuillesGestes({ m, geste, fermer, repreneurs, apres }: { m: Membre; geste: GesteFeuille | null; fermer: () => void; repreneurs: { id: string; nom: string }[]; apres?: (x: string) => void }) {
  const { t, tf } = usePreferences()
  const issue = useIssue()
  const n = useHorloge()
  const nom = `${m.agent.prenom} ${m.agent.nom}`
  const def = EQUIPES[m.equipe]
  const [niveau, setNiveau] = useState<Niveau>(m.niveau)
  const [zones, setZones] = useState<string[]>(m.perimetre.zones ?? [])
  const [litige, setLitige] = useState<1 | 2>(m.perimetre.niveauLitige ?? 1)
  const [plafond, setPlafond] = useState<string>(String(m.perimetre.plafond ?? ''))
  const [role, setRole] = useState<Role>('support')
  const [jours, setJours] = useState('3')
  const [additionnel, setAdditionnel] = useState<Role | ''>(m.roleAdditionnel ?? '')
  const [genre, setGenre] = useState<GenreMessage>('rappel')
  const [repreneur, setRepreneur] = useState(repreneurs[0]?.id ?? '')
  const fait = (r: IssueAcces | { ok: true } | { ok: false; raison: string; detail?: string }) => {
    const e = issue(r)
    if (!e && 'etat' in r && r.ok) apres?.(r.etat === 'a_contresigner' ? t('Envoyé à la Direction pour validation.') : t('Fait.'))
    return e
  }
  const plafondMax = PARAMETRES.acces.plafond.responsable
  return (
    <>
      <DecisionMotivee ouverte={geste === 'niveau'} fermer={fermer} titre={tf('Modifier le niveau de {n}', { n: nom })} resume={t(NOM_NIVEAU[m.niveau])} libelle="Enregistrer" envoyer={async (x) => fait(await source.equipe.changerNiveau(m.agent.id, niveau, x))}>
        <div className="seg mt10" role="radiogroup" aria-label={t('Niveau')}>
          {(['agent', 'senior', 'responsable'] as Niveau[]).map((x) => (
            <button key={x} type="button" role="radio" aria-checked={niveau === x} className={niveau === x ? 'on' : ''} onClick={() => setNiveau(x)}>
              {t(NOM_NIVEAU[x])}
            </button>
          ))}
        </div>
      </DecisionMotivee>
      <DecisionMotivee
        ouverte={geste === 'perimetre'}
        fermer={fermer}
        titre={tf('Changer le périmètre de {n}', { n: nom })}
        resume={t(def.nom)}
        libelle="Enregistrer"
        envoyer={async (x) => fait(await source.equipe.changerPerimetre(m.agent.id, { zones: def.zones ? zones : null, niveauLitige: def.litige ? litige : null, plafond: def.plafond && plafond ? Math.max(0, Math.round(Number(plafond.replace(/\D/g, '')))) : null }, x))}
      >
        {def.zones && (
          <fieldset className="fld fld-g mt10">
            <legend className="fld-t">{t('Zones')}</legend>
            {PARAMETRES.zonesExploitees.map((z) => (
              <label key={z.code} className="e-case">
                <input type="checkbox" checked={zones.includes(z.code)} onChange={(e) => setZones(e.target.checked ? [...zones, z.code] : zones.filter((y) => y !== z.code))} />
                <span>{`${z.code} ${z.nom}`}</span>
              </label>
            ))}
          </fieldset>
        )}
        {def.litige === 2 && (
          <div className="seg mt10" role="radiogroup" aria-label={t('Niveau de litige')}>
            {([1, 2] as const).map((x) => (
              <button key={x} type="button" role="radio" aria-checked={litige === x} className={litige === x ? 'on' : ''} onClick={() => setLitige(x)}>
                {tf('Niveau {n}', { n: x })}
              </button>
            ))}
          </div>
        )}
        {def.plafond && (
          <label className="fld mt10">
            <span className="fld-t">{tf('Plafond de montant (F, jusqu’à {max})', { max: fr(plafondMax) })}</span>
            <span className="inp">
              <input inputMode="numeric" value={plafond} onChange={(e) => setPlafond(e.target.value)} />
            </span>
          </label>
        )}
      </DecisionMotivee>
      <DecisionMotivee
        ouverte={geste === 'temporaire'}
        fermer={fermer}
        titre={tf('Donner un accès temporaire à {n}', { n: nom })}
        resume={tf('Retiré tout seul à sa fin ; au-delà de {j} jours, validé par la Direction.', { j: PARAMETRES.acces.tempQuatreYeuxJ })}
        etiquetteMotif="Motif (remplacement, congé, pic d’activité)"
        libelle="Donner l’accès"
        icone="clock"
        envoyer={async (x) => fait(await source.equipe.donnerTemporaire(m.agent.id, { role, fin: n + Math.max(0, Number(jours) || 0) * 86_400_000, motif: x }))}
      >
        <label className="fld mt10">
          <span className="fld-t">{t('Rôle')}</span>
          <span className="inp">
            <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {ROLES.filter((r) => !m.agent.roles.includes(r)).map((r) => (
                <option key={r} value={r}>
                  {t(NOM_ROLE[r])}
                </option>
              ))}
            </select>
          </span>
        </label>
        <label className="fld mt10">
          <span className="fld-t">{tf('Durée en jours (au plus {j})', { j: PARAMETRES.acces.tempMaxJ })}</span>
          <span className="inp">
            <input type="number" min={1} max={PARAMETRES.acces.tempMaxJ} value={jours} onChange={(e) => setJours(e.target.value)} />
          </span>
        </label>
      </DecisionMotivee>
      <DecisionMotivee ouverte={geste === 'role'} fermer={fermer} titre={tf('Rôle additionnel de {n}', { n: nom })} resume={m.roleAdditionnel ? t(NOM_ROLE[m.roleAdditionnel]) : t('Aucun')} libelle="Enregistrer" envoyer={async (x) => fait(await source.equipe.changerRole(m.agent.id, additionnel || null, x))}>
        <label className="fld mt10">
          <span className="fld-t">{t('Rôle additionnel')}</span>
          <span className="inp">
            <select value={additionnel} onChange={(e) => setAdditionnel(e.target.value as Role | '')}>
              <option value="">{t('Aucun')}</option>
              {ROLES.filter((r) => !def.roles[m.niveau].includes(r)).map((r) => (
                <option key={r} value={r}>
                  {t(NOM_ROLE[r])}
                </option>
              ))}
            </select>
          </span>
        </label>
      </DecisionMotivee>
      <DecisionMotivee ouverte={geste === 'avertir'} fermer={fermer} titre={tf('Avertir {n}', { n: nom })} resume={t('Accusé de lecture.')} etiquetteMotif="Message" libelle="Envoyer" icone="send" envoyer={async (x) => issue(await source.equipe.avertir({ genre: 'membre', id: m.agent.id }, genre, x))}>
        <ChoixGenre genre={genre} setGenre={setGenre} />
      </DecisionMotivee>
      <DecisionMotivee ouverte={geste === 'suspendre'} fermer={fermer} titre={tf('Suspendre {n}', { n: nom })} resume={t('Sessions fermées tout de suite ; réactivation validée par la Direction.')} libelle="Suspendre" icone="user-x" danger envoyer={async (x) => fait(await source.equipe.suspendre(m.agent.id, x))} />
      <DecisionMotivee ouverte={geste === 'reactiver'} fermer={fermer} titre={tf('Réactiver {n}', { n: nom })} resume={m.suspension ? m.suspension.motif : t('Validée par la Direction.')} libelle="Demander la réactivation" envoyer={async (x) => fait(await source.equipe.reactiver(m.agent.id, x))} />
      <DecisionMotivee
        ouverte={geste === 'desactiver'}
        fermer={fermer}
        titre={tf('Désactiver {n} (départ)', { n: nom })}
        resume={tf('Accès retirés aujourd’hui ; {d} dossier(s) en cours réattribués d’abord.', { d: m.dossiers })}
        libelle="Désactiver"
        icone="user-x"
        danger
        bloque={m.dossiers > 0 && !repreneur ? t('Aucun membre actif de l’équipe pour reprendre ses dossiers.') : null}
        envoyer={async (x) => issue(await source.equipe.desactiver(m.agent.id, x, m.dossiers > 0 ? repreneur : null))}
      >
        {m.dossiers > 0 && (
          <label className="fld mt10">
            <span className="fld-t">{t('Ses dossiers vont à')}</span>
            <span className="inp">
              <select value={repreneur} onChange={(e) => setRepreneur(e.target.value)}>
                {repreneurs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nom}
                  </option>
                ))}
              </select>
            </span>
          </label>
        )}
      </DecisionMotivee>
    </>
  )
}

export function ChoixGenre({ genre, setGenre }: { genre: GenreMessage; setGenre: (g: GenreMessage) => void }) {
  const { t } = usePreferences()
  return (
    <div className="seg mt10" role="radiogroup" aria-label={t('Genre du message')}>
      {(
        [
          ['rappel', 'Rappel'],
          ['consigne', 'Consigne'],
          ['avertissement', 'Avertissement'],
        ] as [GenreMessage, string][]
      ).map(([g, l]) => (
        <button key={g} type="button" role="radio" aria-checked={genre === g} className={genre === g ? 'on' : ''} onClick={() => setGenre(g)}>
          {t(l)}
        </button>
      ))}
    </div>
  )
}

/** Message à toute une équipe (Responsable : la sienne ; Accès et personnel, Direction : toute équipe). */
export function FeuilleAvertirEquipe({ ouverte, fermer, equipes }: { ouverte: boolean; fermer: () => void; equipes: CodeEquipe[] }) {
  const { t } = usePreferences()
  const issue = useIssue()
  const [e, setE] = useState<CodeEquipe>(equipes[0] ?? 'direction')
  const [genre, setGenre] = useState<GenreMessage>('consigne')
  return (
    <DecisionMotivee ouverte={ouverte} fermer={fermer} titre={t('Avertir une équipe')} resume={t('Accusé de lecture.')} etiquetteMotif="Message" libelle="Envoyer" icone="send" envoyer={async (x) => issue(await source.equipe.avertir({ genre: 'equipe', equipe: e }, genre, x))}>
      {equipes.length > 1 && (
        <label className="fld mt10">
          <span className="fld-t">{t('Équipe')}</span>
          <span className="inp">
            <select value={e} onChange={(x) => setE(x.target.value as CodeEquipe)}>
              {equipes.map((c) => (
                <option key={c} value={c}>
                  {t(EQUIPES[c].nom)}
                </option>
              ))}
            </select>
          </span>
        </label>
      )}
      <ChoixGenre genre={genre} setGenre={setGenre} />
    </DecisionMotivee>
  )
}

export { CODES_EQUIPES, EQUIPES, NOM_NIVEAU }
