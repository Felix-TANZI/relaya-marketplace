// Page ajoutée · Modèles de messages (A-30 ; ADM-CACHEE-27, ADM-CACHEE-05, DP-67) : modèles SMS, push et courriel en
// français et en anglais, versionnés (chaque publication crée une version, motif journalisé), dont les deux SMS du
// livreur parti (clôture, versement fait), la décision KYC, la suspension, le remboursement exécuté, le versement du
// vendredi, la panne et la reprise. Aperçu avec ses variables (le code reste « ●●●●●● » même dans l'aperçu) ;
// jamais de code ni de numéro dans un texte ; {code} seulement dans le modèle du code de retrait ; aucune promotion
// par SMS ; parties de SMS comptées (coût) ; envois en échec du modèle, à renvoyer depuis la Messagerie.
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Frise, Interdit, Kv, Li, Note, Panel, Pill, useSurtitre } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import type { ModeleMessage } from '../../donnees/domaines/communication'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { useFonctions } from './fonctions-page'
import { usePreferences } from '../../preferences'
import { useDroit, useRole, useRouteOuverte } from '../../session'
import { Chargement, ChampMotif, ErreurLecture, ESPACES, PillCanal, RAISONS, useDates } from '../ADM-11/commun-s5'
import { REGLES_S5, VARIABLES, contenuInterdit, partiesSms, remplir, type Variable } from '../ADM-11/regles-s5'

const EXEMPLE: Partial<Record<Variable, string>> = { ref: 'BLV-52230', relais: 'Relais Mokolo Marché', heure: '15 h 30', date: 'vendredi 16 octobre', montant: '12 500 F', boutique: 'Maman Wax Mokolo', entreprise: 'Yafé Express', motif: 'pièce validée', zone: 'Z3 Mokolo', jour: 'vendredi' }

export default function Modeles() {
  const { t, tf } = usePreferences()
  const surtitre = useSurtitre()
  const [p, setP] = useSearchParams()
  const l = useLecture(() => source.communication.modeles(), [])
  const v = l.donnees
  const m = v?.find((x) => x.id === p.get('id')) ?? v?.[0]
  const fonctions = useFonctions([
    { verbe: 'Relire', n: (v ?? []).length, unite: ['modèle', 'modèles'], icone: 'file-text', route: 'modeles' },
    { verbe: 'Suivre', n: null, unite: ['envoi', 'envois'], icone: 'send', route: 'messagerie' },
  ])
  return (
    <Ecran route="modeles" kicker={surtitre} fonctions={fonctions}>
      <ErreurLecture erreur={l.erreur} relire={l.relire} />
      {!v || !m ? (
        !l.erreur && <Chargement n={3} />
      ) : (
        <div className="s5-grille g21x">
          <div>
            <Editeur key={m.id} m={m} relire={l.relire} />
          </div>
          <Panel titre={tf('{n} modèles', { n: v.length })} icone="file-text">
            {ESPACES.map((e) => {
              const ms = v.filter((x) => x.destinataire === e.id)
              if (!ms.length) return null
              return (
                <div key={e.id}>
                  <div className="divide">{t(e.t)}</div>
                  {ms.map((x) => (
                    <Li key={x.id} icone={e.icone} ton={x.id === m.id ? 'acc' : 'ink'} t={t(x.nom)} s={`${x.id} · v${x.versions.at(-1)!.version}${x.echecs ? ' · ' + tf('{n} en échec', { n: x.echecs }) : ''}`} onClick={() => setP(new URLSearchParams({ id: x.id }), { replace: true })} aria={tf('Ouvrir le modèle {id}', { id: x.id })} droite={x.echecs ? <Pill ton="red" sm>{x.echecs}</Pill> : undefined} />
                  ))}
                </div>
              )
            })}
          </Panel>
        </div>
      )}
    </Ecran>
  )
}

function Editeur({ m, relire }: { m: ModeleMessage; relire: () => void }) {
  const { t, tf, langue } = usePreferences()
  const d = useDates()
  const role = useRole()
  const droit = useDroit('modeles')
  const ouverte = useRouteOuverte()
  const peut = droit.acces !== 'lecture' && (role === 'superviseur' || role === 'support')
  const der = m.versions.at(-1)!
  const [fr, setFr] = useState(der.fr)
  const [en, setEn] = useState(der.en)
  const [motif, setMotif] = useState('')
  const [apercu, setApercu] = useState<'fr' | 'en'>(langue === 'en' ? 'en' : 'fr')
  const [msg, setMsg] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const envois = useLecture(() => (ouverte('messagerie') ? source.communication.envois() : Promise.resolve([])), [ouverte])
  const echecs = (envois.donnees ?? []).filter((e) => e.modele === m.id && e.statut === 'echec')
  const erreurFr = contenuInterdit(fr, { codePermis: m.codePermis })
  const erreurEn = contenuInterdit(en, { codePermis: m.codePermis })
  const sms = m.canaux.includes('sms')
  const texte = apercu === 'fr' ? fr : en
  const parties = partiesSms(remplir(texte, EXEMPLE).replace('●●●●●●', '000000'))
  const change = fr.trim() !== der.fr || en.trim() !== der.en
  const publier = async () => {
    setEnvoi(true)
    setMsg(null)
    try {
      const r = await source.communication.publierModele(m.id, fr, en, motif)
      if (!r.ok) setMsg(t(RAISONS[r.raison] ?? 'Refusé.'))
      else {
        setMsg(tf('Version v{v} publiée : le service d’envoi l’utilise dès maintenant.', { v: r.version }))
        relire()
      }
    } catch {
      setMsg(t('La version n’a pas pu être publiée. Réessayez : rien n’a changé.'))
    } finally {
      setEnvoi(false)
    }
  }
  const inserer = (v: Variable, langueCible: 'fr' | 'en') => (langueCible === 'fr' ? setFr(fr + ` {${v}}`) : setEn(en + ` {${v}}`))
  return (
    <>
      <Panel titre={`${m.id} · ${t(m.nom)}`} icone="file-pen">
        <div className="row wrap" style={{ gap: 6 }}>
          {m.canaux.map((c) => (
            <PillCanal key={c} c={c} />
          ))}
          <Pill ton={m.criticite === 1 ? 'red' : m.criticite === 2 ? 'amber' : 'ink'} sm>
            {tf('Criticité {c}', { c: m.criticite })}
          </Pill>
          {m.promotion && (
            <Pill ton="or" sm icone="megaphone">
              {t('Promotion : push seulement')}
            </Pill>
          )}
          <Pill ton="ink" sm>{`v${der.version}`}</Pill>
        </div>
        <Kv k={t('Événement')} v={t(m.evenement)} />
        <Kv k={t('Destinataire')} v={t(ESPACES.find((e) => e.id === m.destinataire)!.t)} />
        <Kv k={t('Règle ou décision')} v={<span className="mono">{m.source}</span>} />
        <Kv k={t('Validité')} v={tf('{h} heures', { h: REGLES_S5.validiteH[m.criticite - 1] })} />
        {peut ? (
          <>
            <label className="s5-champ">
              <span>{t('Français')}</span>
              <textarea rows={3} value={fr} onChange={(e) => setFr(e.target.value)} aria-invalid={!!erreurFr} />
            </label>
            {erreurFr && <p className="e-erreur" role="alert"><Icone nom="triangle-alert" taille={16} />{t(RAISONS[erreurFr])}</p>}
            <label className="s5-champ">
              <span>{t('Anglais')}</span>
              <textarea rows={3} value={en} onChange={(e) => setEn(e.target.value)} aria-invalid={!!erreurEn} />
            </label>
            {erreurEn && <p className="e-erreur" role="alert"><Icone nom="triangle-alert" taille={16} />{t(RAISONS[erreurEn])}</p>}
            <div className="s5-champ">
              <span>{t('Variables (remplies par le serveur à l’envoi)')}</span>
              <div className="chips">
                {VARIABLES.filter((v) => v !== 'code' || m.codePermis).map((v) => (
                  <button key={v} type="button" className="chip" onClick={() => inserer(v, apercu)} aria-label={tf('Insérer {v} dans le texte {l}', { v: `{${v}}`, l: apercu === 'fr' ? t('français') : t('anglais') })}>
                    {`{${v}}`}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt12">
              <ChampMotif valeur={motif} changer={setMotif} libelle="Motif de la nouvelle version (journalisé)" />
            </div>
            <div className="row wrap mt12" style={{ gap: 8 }}>
              <button type="button" className="btn primary auto" disabled={envoi || !change || !!erreurFr || !!erreurEn || motif.trim().length < REGLES_S5.motifMin} title={!change ? t(RAISONS.inchange) : erreurFr || erreurEn ? t(RAISONS.contenu) : motif.trim().length < REGLES_S5.motifMin ? t(RAISONS.motif_court) : undefined} onClick={() => void publier()}>
                <Icone nom="upload" taille={18} />
                <span>{tf('Publier la version v{v}', { v: der.version + 1 })}</span>
              </button>
              <button type="button" className="btn ghost auto" disabled={!change} onClick={() => (setFr(der.fr), setEn(der.en))}>
                <Icone nom="undo-2" taille={18} />
                <span>{t('Revenir à la version publiée')}</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="t13 c2 mt12 s5-texte">{der.fr}</p>
            <p className="t13 c3 mt8 s5-texte" lang="en">{der.en}</p>
            <Interdit roles={['superviseur', 'support']} quoi="Publier un modèle" />
          </>
        )}
        {msg && (
          <Note ton="ink" icone="info" className="mt12" role="status">
            {msg}
          </Note>
        )}
      </Panel>
      <div className="g g2">
        <Panel titre={t('Aperçu avec ses variables')} icone="smartphone">
          <div className="seg mt4" role="group" aria-label={t('Langue de l’aperçu')}>
            {(['fr', 'en'] as const).map((x) => (
              <button key={x} type="button" className={apercu === x ? 'on' : ''} aria-pressed={apercu === x} onClick={() => setApercu(x)}>
                {x === 'fr' ? t('Français') : t('Anglais')}
              </button>
            ))}
          </div>
          <div className="admm-sms mt12">
            <div className="from">{`BelivaY · ${m.canaux.map((c) => c.toUpperCase()).join(' + ')}`}</div>
            {remplir(texte, EXEMPLE)}
          </div>
          {sms && <p className="t12 c3 mt8">{tf('{c} caractères · {p} partie(s) de SMS{u}', { c: parties.caracteres, p: parties.parties, u: parties.unicode ? t(' (accents hors alphabet GSM)') : '' })}</p>}
        </Panel>
        <Panel titre={t('Versions')} icone="history">
          <Frise items={[...m.versions].reverse().map((x, i) => ({ t: `v${x.version}${i === 0 ? ' · ' + t('publiée') : ''}`, d: `${d.annee(x.le)} · ${x.par} · ${x.motif}`, st: i === 0 ? 'cur' : 'done' }))} />
        </Panel>
      </div>
      <Panel titre={t('Envois en échec de ce modèle')} icone="siren" style={{ marginTop: 16 }}>
        {echecs.length ? (
          echecs.map((e) => <Li key={e.id} icone="siren" ton="red" t={`${t(e.evenement)} · ${e.objet}`} s={`${e.destinataire} · ${d.heure(e.le)} · ${e.cle}`} to={chemin('messagerie', { s: 'echec', id: e.id })} />)
        ) : (
          <p className="t13 c3">{t('Aucun envoi en échec pour ce modèle aujourd’hui.')}</p>
        )}
        {ouverte('messagerie') && (
          <Link className="btn secondary mt12" to={chemin('messagerie')}>
            <Icone nom="send" taille={18} />
            <span>{t('Journal des envois')}</span>
          </Link>
        )}
      </Panel>
    </>
  )
}
