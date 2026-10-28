// Carte d'une décision à quatre yeux (ADM-01 § 12) : ce qui est demandé, par qui (agent, rôle, heure), le motif, les
// preuves, l'échéance ; le second validateur la contresigne ou la refuse avec son propre motif. Jamais le même compte
// que le premier (la carte le dit, la source le refuse), jamais un rôle non permis.
import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { F } from '@client/i18n/format'
import { PARAMETRES } from '../calculs/registre'
import { NOM_ROLE } from '../config/libelles'
import { chemin } from '../config/pages'
import type { DecisionQuatreYeux } from '../donnees/domaines/quatreyeux'
import { source } from '../donnees/source'
import { usePreferences } from '../preferences'
import { usePeut, useSession } from '../session'
import { Icone } from './Icone'
import { sonner } from './marque-sonore'
import { Note, Pill, Rebours } from './prototype'
import { Heure } from './LigneJournal'

export function CarteQuatreYeux({ d, apres }: { d: DecisionQuatreYeux; apres?: () => void }) {
  const { t, tf } = usePreferences()
  const s = useSession()
  const peut = usePeut('contresigner')
  const id = useId()
  const [motif, setMotif] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const moi = s.agent?.id === d.premier.agentId
  const permis = peut && d.rolesSecond.includes(s.role) && !moi && d.etat === 'a_contresigner'
  const RAISONS: Record<string, string> = {
    meme_compte: 'Vous avez fait la première validation : un autre compte doit contresigner.',
    role_non_permis: 'Votre rôle ne peut pas contresigner cette décision.',
    deja_traitee: 'Cette décision a déjà été traitée.',
    motif_court: 'Le motif est trop court.',
  }
  const trancher = async (oui: boolean) => {
    setEnvoi(true)
    setErreur(null)
    try {
      const r = oui ? await source.quatreyeux.contresigner(d.id, motif) : await source.quatreyeux.refuser(d.id, motif)
      sonner(r.ok ? (oui ? 'contreseing' : 'decision') : 'erreur')
      if (!r.ok) setErreur(r.raison === 'motif_court' ? tf('Le motif doit compter au moins {n} caractères.', { n: PARAMETRES.console.motifMin }) : t(RAISONS[r.raison]))
      else apres?.()
    } catch {
      setErreur(t('La décision n’a pas pu être enregistrée. Réessayez.'))
    } finally {
      setEnvoi(false)
    }
  }
  return (
    <article className="card e-qy" aria-labelledby={id + '-t'}>
      <div className="e-qy-h">
        <Pill ton="amber" icone="users" sm>
          {d.id}
        </Pill>
        {d.montant !== null && <b className="e-qy-m">{`${F(d.montant)} F`}</b>}
        <span className="grow"></span>
        {d.etat === 'a_contresigner' ? <Rebours fin={d.expireLe} echu={t('Échue : revient au premier agent')} /> : <Pill ton={d.etat === 'refusee' ? 'red' : 'green'}>{t(d.etat === 'refusee' ? 'Refusée' : 'Contresignée')}</Pill>}
      </div>
      <h3 className="card-t" id={id + '-t'}>
        {d.resume}
      </h3>
      <p className="card-s">
        {tf('Première validation : {agent} ({role})', { agent: d.premier.agent, role: t(NOM_ROLE[d.premier.role]) })} · <Heure le={d.premier.le} />
      </p>
      <p className="mt10">
        <b>{t('Motif')}</b> · {d.motif}
      </p>
      {d.preuves.length > 0 && (
        <ul className="e-preuves mt10">
          {d.preuves.map((x) => (
            <li key={x.id}>
              <Icone nom="paperclip" taille={15} />
              {x.route ? <Link to={chemin(x.route, x.params)}>{x.libelle}</Link> : <span>{x.libelle}</span>}
            </li>
          ))}
        </ul>
      )}
      {d.second && (
        <Note ton={d.etat === 'refusee' ? 'red' : 'green'} icone={d.etat === 'refusee' ? 'x' : 'check'} className="mt10">
          {tf('{agent} ({role}) : {motif}', { agent: d.second.agent, role: t(NOM_ROLE[d.second.role]), motif: d.second.motif })}
        </Note>
      )}
      {d.etat === 'a_contresigner' && moi && (
        <Note ton="amber" icone="info" className="mt10">
          {t(RAISONS.meme_compte)}
        </Note>
      )}
      {d.etat === 'a_contresigner' && !moi && !permis && (
        <Note ton="ink" icone="eye" className="mt10">
          {tf('Contresignée par : {roles}.', { roles: d.rolesSecond.map((r) => t(NOM_ROLE[r])).join(', ') })}
        </Note>
      )}
      {permis && (
        <div className="mt14">
          <label className="fld fld-l" htmlFor={id + '-m'}>
            <span className="fld-t">{t('Votre motif (journalisé)')}</span>
            <span className="inp">
              <textarea id={id + '-m'} rows={3} value={motif} onChange={(e) => setMotif(e.target.value)} />
            </span>
          </label>
          {erreur && (
            <p className="e-erreur mt10" role="alert">
              <Icone nom="triangle-alert" taille={16} />
              {erreur}
            </p>
          )}
          <div className="btns mt10">
            <button type="button" className="btn secondary" disabled={envoi} onClick={() => void trancher(false)}>
              <Icone nom="x" taille={18} />
              <span>{t('Refuser')}</span>
            </button>
            <button type="button" className="btn primary" disabled={envoi} onClick={() => void trancher(true)}>
              <Icone nom="check" taille={18} />
              <span>{t('Contresigner')}</span>
            </button>
          </div>
        </div>
      )}
    </article>
  )
}
