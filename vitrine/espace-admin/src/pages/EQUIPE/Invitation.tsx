// Inviter un membre (logique-metier/ACCES-CONSOLE.md § 3, § 5) : équipe, niveau, zones si l'équipe en a, motif. Un
// Responsable d'équipe invite dans SON équipe un Agent ou un Senior ; une équipe à quatre yeux (Finance, Direction,
// Accès et personnel, Audit) attend la Direction. Le lien d'activation part ensuite (ADM-INVITATION-H).
import { useState } from 'react'
import { Feuille } from '@client/composants/Feuille'
import { PARAMETRES } from '../../calculs/registre'
import { Icone } from '../../composants/Icone'
import { Note } from '../../composants/prototype'
import { EQUIPES, NOM_NIVEAU } from '../../config/acces-console'
import type { CodeEquipe, Niveau } from '../../donnees/domaines/equipe'
import { source } from '../../donnees/source'
import { usePreferences } from '../../preferences'
import { useIssue } from './commun'

/** Inviter un membre : équipe, niveau (un Responsable : son équipe, Agent ou Senior), zones si l'équipe en a. */
export function Invitation({ ouverte, fermer, gere, responsableSeul }: { ouverte: boolean; fermer: () => void; gere: CodeEquipe[]; responsableSeul: boolean }) {
  const { t, tf } = usePreferences()
  const issue = useIssue()
  const [equipe, setEquipe] = useState<CodeEquipe>(gere[0] ?? 'service_client')
  const [niveau, setNiveau] = useState<Niveau>('agent')
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [zones, setZones] = useState<string[]>([])
  const [motif, setMotif] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const def = EQUIPES[equipe]
  const complet = !!prenom.trim() && !!nom.trim() && /^[^@\s]+@belivay\.com$/.test(email.trim()) && (!def.zones || zones.length > 0) && motif.trim().length >= PARAMETRES.console.motifMin
  const envoyer = async () => {
    const r = await source.equipe.inviter({ prenom, nom, email, equipe, niveau, zones: def.zones ? zones : null }, motif)
    const e = issue(r)
    if (e) return setErreur(e)
    setErreur(null)
    setInfo(r.ok && r.etat === 'a_contresigner' ? t('Envoyé à la Direction pour validation.') : tf('Invitation envoyée à {e}.', { e: email.trim() }))
    setPrenom('')
    setNom('')
    setEmail('')
    setZones([])
    setMotif('')
  }
  return (
    <Feuille ouverte={ouverte} fermer={fermer} titre={t('Inviter un membre')} forme="large">
      <div className="e-decision">
        <h2 className="card-t">{t('Inviter un membre')}</h2>
        {!responsableSeul && (
          <label className="fld mt14">
            <span className="fld-t">{t('Équipe')}</span>
            <span className="inp">
              <select value={equipe} onChange={(e) => setEquipe(e.target.value as CodeEquipe)}>
                {gere.map((c) => (
                  <option key={c} value={c}>
                    {t(EQUIPES[c].nom)}
                  </option>
                ))}
              </select>
            </span>
          </label>
        )}
        <div className="seg mt10" role="radiogroup" aria-label={t('Niveau')}>
          {(['agent', 'senior', 'responsable'] as Niveau[])
            .filter((x) => !responsableSeul || x !== 'responsable')
            .map((x) => (
              <button key={x} type="button" role="radio" aria-checked={niveau === x} className={niveau === x ? 'on' : ''} onClick={() => setNiveau(x)}>
                {t(NOM_NIVEAU[x])}
              </button>
            ))}
        </div>
        <div className="g g2 mt10">
          <label className="fld">
            <span className="fld-t">{t('Prénom')}</span>
            <span className="inp">
              <input value={prenom} onChange={(e) => setPrenom(e.target.value)} autoComplete="off" />
            </span>
          </label>
          <label className="fld">
            <span className="fld-t">{t('Nom')}</span>
            <span className="inp">
              <input value={nom} onChange={(e) => setNom(e.target.value)} autoComplete="off" />
            </span>
          </label>
        </div>
        <label className="fld mt10">
          <span className="fld-t">{t('E-mail professionnel')}</span>
          <span className="inp">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom@belivay.com" autoComplete="off" />
          </span>
        </label>
        {def.zones && (
          <fieldset className="fld fld-g mt10">
            <legend className="fld-t">{t('Zones')}</legend>
            {PARAMETRES.zonesExploitees.map((z) => (
              <label key={z.code} className="e-case">
                <input type="checkbox" checked={zones.includes(z.code)} onChange={(e) => setZones(e.target.checked ? [...zones, z.code] : zones.filter((x) => x !== z.code))} />
                <span>{`${z.code} ${z.nom}`}</span>
              </label>
            ))}
          </fieldset>
        )}
        <label className="fld mt10">
          <span className="fld-t">{t('Motif')}</span>
          <span className="inp">
            <input value={motif} onChange={(e) => setMotif(e.target.value)} placeholder={t('Arrivée, remplacement…')} />
          </span>
        </label>
        {def.quatreYeux && (
          <Note ton="amber" icone="users" className="mt12">
            {t('Validée par la Direction (quatre yeux).')}
          </Note>
        )}
        {erreur && (
          <p className="e-erreur mt10" role="alert">
            {erreur}
          </p>
        )}
        {info && (
          <p className="t13 mt10" role="status">
            {info}
          </p>
        )}
        <div className="btns mt16">
          <button type="button" className="btn ghost" onClick={fermer}>
            {t('Fermer')}
          </button>
          <button type="button" className="btn primary" disabled={!complet} onClick={() => void envoyer()}>
            <Icone nom="send" taille={18} />
            <span>{def.quatreYeux ? t('Envoyer pour validation') : t('Créer et inviter')}</span>
          </button>
        </div>
      </div>
    </Feuille>
  )
}

/** Inviter dans l'équipe du Responsable connecté. */
export function InvitationEquipe({ ouverte, fermer, equipe }: { ouverte: boolean; fermer: () => void; equipe: CodeEquipe }) {
  return <Invitation ouverte={ouverte} fermer={fermer} gere={[equipe]} responsableSeul />
}
