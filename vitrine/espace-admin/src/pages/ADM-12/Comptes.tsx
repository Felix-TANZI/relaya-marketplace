// ADM-P34 · Comptes multi-rôles et agents terrain (ADM-12 § 48). Structure du prototype : héros « Tournée du jour »,
// « Visites », « Rendement des agents par zone », « En attente de l'acteur », « Règles du terrain » ; fiche (?fiche=) :
// étapes Ouvrir · Publier · Être payé, ouverture du compte, pièce d'identité (en revue KYC), offres en brouillon,
// validation par l'acteur, note multi-rôle. L'agent prépare, l'acteur valide sur SON téléphone : aucun bouton ne
// valide à sa place ; l'agent ne valide jamais une pièce ; la Vérification contrôle. Agent terrain : sa tournée et ses
// zones (la source refuse une fiche hors zone).
import { useState } from 'react'
import { DecisionMotivee } from '../../composants/DecisionMotivee'
import { Link, useSearchParams } from 'react-router-dom'
import { F } from '@client/i18n/format'
import { PARAMETRES } from '../../calculs/registre'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Perimetre } from '../../composants/Perimetre'
import { Barre, Frise, Li, Note, Panel, Pill, Props, Px, St, Table, Vide, useSurtitre, type Ton } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import type { EtatFiche, FicheTerrain, TableauTerrain } from '../../donnees/domaines/gouvernance'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { useFonctions } from '../AJ-A/fonctions-page'
import { usePreferences } from '../../preferences'
import { usePeut, usePerimetre } from '../../session'
import { EtatLecture, useDate, useRaison } from './commun-s6'

const ETAT: Record<EtatFiche, [string, Ton]> = { brouillon: ['Brouillon', 'ink'], lien_envoye: ['À valider par l’acteur', 'amber'], validee: ['Validée par l’acteur', 'blue'], a_corriger: ['À corriger', 'red'], publiee: ['Publiée', 'green'] }

export default function Comptes() {
  const { t } = usePreferences()
  const surtitre = useSurtitre()
  const [params] = useSearchParams()
  const id = params.get('fiche')
  const peut = usePeut('compte.saisir')
  const l = useLecture(() => source.gouvernance.terrain(), [])
  const [saisie, setSaisie] = useState(false)
  const fiche = id ? l.donnees?.fiches.find((f) => f.id === id) : null
  const enAttente = l.donnees?.fiches.find((f) => f.etat === 'lien_envoye')
  const fiches = l.donnees?.fiches ?? []
  const aControler = fiches.find((f) => f.etat === 'validee')
  const fonctions = useFonctions([
    peut && { verbe: 'Saisir', n: null, unite: ['fiche', 'fiches'], icone: 'user-plus', onClick: () => setSaisie(true) },
    { verbe: 'Relancer', n: fiches.filter((f) => f.etat === 'lien_envoye').length, unite: ['lien sans réponse', 'liens sans réponse'], icone: 'send', route: 'comptes', params: { fiche: enAttente?.id } },
    { verbe: 'Contrôler', n: fiches.filter((f) => f.etat === 'validee').length, unite: ['fiche validée', 'fiches validées'], icone: 'clipboard-check', route: 'comptes', params: { fiche: aControler?.id } },
    { verbe: 'Corriger', n: fiches.filter((f) => f.etat === 'a_corriger').length, unite: ['fiche', 'fiches'], icone: 'pencil', route: 'comptes', params: { fiche: fiches.find((f) => f.etat === 'a_corriger')?.id }, alerte: true },
  ])
  return (
    <Ecran
      route="comptes"
      titre={fiche ? `${t(fiche.etat === 'brouillon' || fiche.etat === 'lien_envoye' ? 'Fiche préparée' : 'Fiche')} · ${fiche.nom}` : t('Comptes et agents terrain')}
      nom={fiche?.nom}
      retour={id ? chemin('comptes') : undefined}
      kicker={surtitre}
      fonctions={fiche ? undefined : fonctions}
      actions={
        id ? (
          <Link className="btn secondary" to={chemin('comptes')}>
            <Icone nom="route" taille={18} />
            <span>{t('Tournée du jour')}</span>
          </Link>
        ) : (
          <>
            {enAttente && (
              <Link className="btn secondary" to={chemin('comptes', { fiche: enAttente.id })}>
                <Icone nom="hourglass" taille={18} />
                <span>{t('Fiche en attente')}</span>
              </Link>
            )}
            {peut && (
              <button type="button" className="btn primary" onClick={() => setSaisie(true)}>
                <Icone nom="user-plus" taille={18} />
                <span>{t('Nouvelle saisie assistée')}</span>
              </button>
            )}
          </>
        )
      }
    >
      <Px>
        <Perimetre route="comptes" />
        <EtatLecture l={l} quoi="la tournée des agents">
          {(d) => (id ? fiche ? <Fiche f={fiche} /> : <Vide icone="search-x" t={t('Fiche introuvable')} s={t('Cette fiche n’existe pas ou n’est pas dans votre tournée.')} action={<Link className="btn secondary" to={chemin('comptes')}>{t('Tournée du jour')}</Link>} /> : <Tournee d={d} />)}
        </EtatLecture>
        <NouvelleFiche ouverte={saisie} fermer={() => setSaisie(false)} />
      </Px>
    </Ecran>
  )
}

function Tournee({ d }: { d: TableauTerrain }) {
  const { t, tf } = usePreferences()
  const date = useDate()
  const faites = d.visites.filter((v) => v.etat === 'faite').length
  const attente = d.fiches.filter((f) => f.etat === 'lien_envoye' || f.etat === 'a_corriger')
  return (
    <>
      <div className="hero night" style={{ marginTop: 0 }}>
        <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
          <span className="hk">{tf('Tournée du {d}', { d: date(d.visites[0]?.heure ?? 0).split(' · ')[0] })}</span>
          <Pill ton="dk" icone="route">{tf('{n} visites sur {total}', { n: faites, total: d.visites.length })}</Pill>
        </div>
        <div className="row mt12" style={{ gap: 10 }}>
          <div className="grow">
            <div className="ht" style={{ margin: 0, fontSize: 18 }}>{d.agents.map((a) => a.nom).join(' et ')}</div>
            <div className="hs" style={{ marginTop: 2 }}>{tf('Binôme d’agents terrain · {z}', { z: d.agents.map((a) => a.zones.join(', ')).join(' puis ') })}</div>
          </div>
        </div>
        <div className="mt14"><Barre pct={(100 * faites) / Math.max(1, d.visites.length)} ton="acc" /></div>
        <div className="adme-m4">
          <div className="m4"><div className="l"><Icone nom="footprints" taille={14} />{t('Visites')}</div><div className="v">{`${faites} / ${d.visites.length}`}</div><div className="s">{tf('{n} en cours', { n: d.visites.filter((v) => v.etat === 'en_cours').length })}</div></div>
          <div className="m4"><div className="l"><Icone nom="file-pen" taille={14} />{t('Fiches préparées')}</div><div className="v">{d.fiches.filter((f) => f.etat === 'brouillon' || f.etat === 'lien_envoye').length}</div></div>
          <div className="m4"><div className="l"><Icone nom="smartphone" taille={14} />{t('À valider')}</div><div className="v">{d.fiches.filter((f) => f.etat === 'lien_envoye').length}</div><div className="s">{t('par l’acteur, sur son téléphone')}</div></div>
          <div className="m4"><div className="l"><Icone nom="store" taille={14} />{t('Publiées')}</div><div className="v">{d.fiches.filter((f) => f.etat === 'publiee').length}</div></div>
        </div>
        {attente[0] && (
          <div className="adme-btns">
            <Link className="btn primary" to={chemin('comptes', { fiche: attente[0].id })}>
              <Icone nom="hourglass" taille={18} />
              <span>{t('Voir la fiche en attente')}</span>
            </Link>
          </div>
        )}
      </div>
      <div className="g g2">
        <Panel titre={t('Visites')} icone="route">
          {d.visites.map((v) => (
            <Li
              key={v.n}
              icone={v.etat === 'faite' ? 'circle-check' : v.etat === 'en_cours' ? 'map-pin' : 'circle'}
              ton={v.etat === 'faite' ? 'green' : v.etat === 'en_cours' ? 'or' : 'ink'}
              t={`${date(v.heure).split(' · ')[1]} · ${v.lieu}`}
              s={`${v.zone} · ${v.but}`}
              to={v.fiche ? chemin('comptes', { fiche: v.fiche }) : undefined}
              droite={<St t={t(v.etat === 'faite' ? 'Faite' : v.etat === 'en_cours' ? 'En cours' : 'À venir')} ton={v.etat === 'faite' ? 'green' : v.etat === 'en_cours' ? 'or' : 'ink'} />}
            />
          ))}
        </Panel>
        <Panel titre={t('Rendement des agents par zone')} icone="chart-column">
          <Table
            cle={(r) => r.zone}
            rows={d.rendement}
            cols={[
              { k: 'z', t: t('Zone'), main: true, rendu: (r) => <b className="nw">{`${r.zone} ${r.nom}`}</b> },
              { k: 'v', t: t('Visites'), cls: 'r', rendu: (r) => r.visites },
              { k: 'p', t: t('Préparées'), cls: 'r', rendu: (r) => r.preparees },
              { k: 'a', t: t('Validées'), cls: 'r', rendu: (r) => r.validees },
              { k: 'b', t: t('Publiées'), cls: 'r', rendu: (r) => (<>{r.publiees}<div className="t2">{tf('{p} % des visites', { p: Math.round((100 * r.publiees) / Math.max(1, r.visites)) })}</div></>) },
            ]}
            pied={<span>{tf('7 derniers jours · {v} visites · {b} boutiques publiées', { v: d.rendement.reduce((a, r) => a + r.visites, 0), b: d.rendement.reduce((a, r) => a + r.publiees, 0) })}</span>}
          />
        </Panel>
      </div>
      <div className="g g2">
        <Panel titre={t('En attente de l’acteur')} icone="hourglass">
          {attente.length ? attente.map((f) => <Li key={f.id} icone={f.genre === 'relais' ? 'package-check' : 'store'} ton="or" t={`${f.nom} · ${f.quartier}`} s={tf('{id} · préparée par {a} · lien envoyé {d}', { id: f.id, a: f.agent, d: f.lienEnvoyeLe ? date(f.lienEnvoyeLe) : '—' })} to={chemin('comptes', { fiche: f.id })} droite={<St t={t(ETAT[f.etat][0])} ton={ETAT[f.etat][1]} />} />) : <p className="t13 c3">{t('Aucune fiche n’attend l’acteur.')}</p>}
          {d.fiches.filter((f) => f.etat === 'validee').map((f) => <Li key={f.id} icone="badge-check" ton="blue" t={`${f.nom} · ${f.quartier}`} s={tf('{id} · validée par l’acteur, à contrôler par la Vérification', { id: f.id })} to={chemin('comptes', { fiche: f.id })} />)}
          <Li icone="users" ton="acc" t={t('Même numéro, plusieurs rôles')} s={t('Chaque rôle a son espace : scores, versements et journaux séparés')} />
        </Panel>
        <Panel titre={t('Règles du terrain')} icone="shield-check">
          <Li icone="smartphone" ton="acc" t={t('L’agent prépare, l’acteur valide')} s={t('Sur son propre téléphone ; rien n’est publié sans cette validation')} />
          <Li icone="id-card" ton="amber" t={t('Jamais de KYC validé sur le terrain')} s={t('L’agent photographie les pièces ; la revue se fait dans Revue KYC')} />
          <Li icone="ban" ton="red" t={t('Aucune promesse de volume chiffrée')} s={t('On présente le service, jamais un nombre de ventes')} />
          <Li icone="target" ton="ink" t={t('Lancement concentré')} s={t('Peu de zones, peu de boutiques : du volume réel pour chacune')} />
        </Panel>
      </div>
    </>
  )
}

function Fiche({ f }: { f: FicheTerrain }) {
  const { t, tf } = usePreferences()
  const date = useDate()
  const raison = useRaison()
  const saisir = usePeut('compte.saisir')
  const controler = usePeut('kyc.decider')
  const [ctrl, setCtrl] = useState<null | boolean>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const etape = f.etat === 'publiee' ? 2 : f.etat === 'validee' ? 1 : 0
  const geste = async (g: 'lien' | 'relance') => {
    const r = g === 'lien' ? await source.gouvernance.envoyerLien(f.id) : await source.gouvernance.relancer(f.id)
    setMsg(r.ok ? null : raison(r.raison, { etat: 'Ce geste ne correspond plus à l’état de la fiche.' }))
  }
  return (
    <div className="g g21" style={{ marginTop: 6 }}>
      <div className="adme-stack">
        <div className={etape ? 'hero acc' : 'panel'} style={{ marginTop: 0 }}>
          <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
            <span className={etape ? 'hk' : 'kick acc'}>{t(f.genre === 'relais' ? 'Ouverture d’un point relais' : 'Onboarding vendeur en trois temps')}</span>
            <St t={t(ETAT[f.etat][0])} ton={ETAT[f.etat][1]} />
          </div>
          <div className="stepper mt10" role="list">
            {['Ouvrir', 'Publier', 'Être payé'].map((s, i) => (
              <span key={s} role="listitem" className={'st' + (i < etape ? ' done' : i === etape ? ' cur' : '')}>
                <b>{i < etape ? <Icone nom="check" taille={14} /> : i + 1}</b>
                {t(s)}
              </span>
            ))}
          </div>
          <div className="t13 mt12">{t('Ouvrir : nom, numéro vérifié, quartier. Publier : pièce d’identité et numéro Mobile Money au premier produit. Être payé : documents complets avant le premier versement.')}</div>
        </div>
        <Panel titre={t('Ouverture du compte')} icone="store" droite={<St t={t(ETAT[f.etat][0])} ton={ETAT[f.etat][1]} />}>
          <Props paires={[[t(f.genre === 'relais' ? 'Relais' : 'Boutique'), f.nom], [t('Quartier'), `${f.quartier} (${f.zone})`], [t('Titulaire'), f.titulaire], [t('Numéro'), tf('{n} · vérifié par code SMS', { n: f.numeroMasque })], [t('Préparé par'), f.binome ? tf('{a}, avec {b}', { a: f.agent, b: f.binome }) : f.agent], [t('Photos du local'), tf('{n} photo(s) horodatée(s)', { n: f.photos })]]} />
        </Panel>
        <div className="g g2" style={{ marginTop: 16 }}>
          <Panel titre={t('Pièce d’identité')} icone="id-card" droite={<St t={t(f.piece === 'validee' ? 'Validée' : f.piece === 'en_revue' ? 'En revue KYC' : 'À photographier')} ton={f.piece === 'validee' ? 'green' : f.piece === 'en_revue' ? 'amber' : 'ink'} />}>
            <Link className="btn sm secondary mt10" to={chemin('kyc')}>
              <Icone nom="id-card" taille={16} />
              <span>{t('Voir dans Revue KYC')}</span>
            </Link>
          </Panel>
          <Panel titre={t('Premières offres en brouillon')} icone="package-open">
            {f.offres.length ? f.offres.map((o) => <Li key={o.titre} icone="tag" ton="ink" t={o.titre} s={tf('Prix proposé par le vendeur : {p} F', { p: F(o.prix) })} droite={<Pill ton={o.etat === 'validee' ? 'green' : o.etat === 'a_corriger' ? 'amber' : 'ink'} sm>{t(o.etat === 'validee' ? 'Validée' : o.etat === 'a_corriger' ? 'À corriger' : 'Brouillon')}</Pill>} />) : <p className="t13 c3">{t('Aucune offre : un relais ne vend pas.')}</p>}
          </Panel>
        </div>
        {!!f.autresRoles.length && (
          <Note ton="acc" icone="users">
            <b>{t('Un numéro, plusieurs rôles :')}</b> {f.autresRoles.map((x) => t(x)).join(' · ')}.
          </Note>
        )}
      </div>
      <div className="adme-stack">
        <Panel titre={t('Validation par l’acteur')} icone="smartphone" droite={f.valideeLe ? <Pill ton="green" sm icone="check">{tf('Validé {d}', { d: date(f.valideeLe) })}</Pill> : <Pill ton="amber" sm dot>{t('En attente')}</Pill>}>
          <Frise items={f.chronologie.map((c, i) => ({ t: `${date(c.le)} · ${c.t}`, st: i === f.chronologie.length - 1 && !f.valideeLe ? 'cur' : 'done' }))} />
          {saisir && f.etat === 'brouillon' && (
            <div className="adme-btns">
              <button type="button" className="btn primary" onClick={() => void geste('lien')}>
                <Icone nom="send" taille={18} />
                <span>{t('Envoyer le lien de validation')}</span>
              </button>
            </div>
          )}
          {saisir && f.etat === 'lien_envoye' && (
            <div className="adme-btns">
              <button type="button" className="btn secondary" onClick={() => void geste('relance')}>
                <Icone nom="bell-ring" taille={18} />
                <span>{f.relances ? tf('Relancer l’acteur ({n} déjà)', { n: f.relances }) : t('Relancer l’acteur')}</span>
              </button>
            </div>
          )}
          {msg && <p className="e-erreur mt10" role="alert">{msg}</p>}
        </Panel>
        <Panel titre={t('Contrôle de la Vérification')} icone="badge-check">
          {f.controle ? (
            <Note ton={f.controle.conforme ? 'green' : 'red'} icone={f.controle.conforme ? 'circle-check' : 'triangle-alert'}>
              <b>{t(f.controle.conforme ? 'Conforme' : 'À corriger')}</b> · {tf('{qui}, {d} :', { qui: f.controle.par, d: date(f.controle.le) })} « {f.controle.motif} »
            </Note>
          ) : (
            <p className="t13 c3">{t(f.etat === 'validee' || f.etat === 'publiee' ? 'Fiche validée par l’acteur : photos, titulaire et offres à contrôler.' : 'Le contrôle vient après la validation par l’acteur.')}</p>
          )}
          {controler && !f.controle && (f.etat === 'validee' || f.etat === 'publiee') && (
            <div className="adme-btns">
              <button type="button" className="btn primary" onClick={() => setCtrl(true)}>
                <Icone nom="check" taille={18} />
                <span>{t('Contrôler : conforme')}</span>
              </button>
              <button type="button" className="btn secondary" onClick={() => setCtrl(false)}>
                <Icone nom="undo-2" taille={18} />
                <span>{t('Renvoyer à l’agent')}</span>
              </button>
            </div>
          )}
        </Panel>
      </div>
      <DecisionMotivee
        ouverte={ctrl !== null}
        fermer={() => setCtrl(null)}
        titre={t(ctrl ? 'Contrôler la fiche : conforme' : 'Renvoyer la fiche à l’agent')}
        resume={t('Le contrôle porte sur les photos du local, le titulaire et les offres ; la pièce se décide dans Revue KYC.')}
        libelle={ctrl ? 'Contrôler : conforme' : 'Renvoyer à l’agent'}
        envoyer={async (m) => {
          const r = await source.gouvernance.controlerFiche(f.id, !!ctrl, m)
          return r.ok ? null : raison(r.raison, { etat: 'La fiche n’est pas encore validée par l’acteur.' })
        }}
      />
    </div>
  )
}

function NouvelleFiche({ ouverte, fermer }: { ouverte: boolean; fermer: () => void }) {
  const { t } = usePreferences()
  const raison = useRaison()
  const zones = usePerimetre()
  const choix = PARAMETRES.zonesExploitees.filter((z) => !zones || zones.includes(z.code))
  const [genre, setGenre] = useState<'boutique' | 'relais'>('boutique')
  const [nom, setNom] = useState('')
  const [zone, setZone] = useState('')
  const [quartier, setQuartier] = useState('')
  const [titulaire, setTitulaire] = useState('')
  const [numero, setNumero] = useState('')
  return (
    <DecisionMotivee
      ouverte={ouverte}
      fermer={fermer}
      motif="aucun"
      titre={t('Nouvelle saisie assistée')}
      resume={t('La fiche reste un brouillon : l’acteur la valide sur son propre téléphone, après vérification de son numéro par code SMS.')}
      libelle="Créer le brouillon"
      icone="file-pen"
      envoyer={async () => {
        const r = await source.gouvernance.nouvelleFiche({ genre, nom, zone: zone || choix[0]?.code || '', quartier, titulaire, numero })
        if (r.ok) {
          setNom('')
          setQuartier('')
          setTitulaire('')
          setNumero('')
        }
        return r.ok ? null : raison(r.raison, { incomplet: 'Nom, quartier, titulaire et numéro (9 chiffres) sont obligatoires.', hors_zone: 'Cette zone n’est pas dans votre tournée.' })
      }}
    >
      <label className="fld mt14">
        <span className="fld-t">{t('Type')}</span>
        <span className="inp">
          <select value={genre} onChange={(e) => setGenre(e.target.value as 'boutique' | 'relais')}>
            <option value="boutique">{t('Boutique (vendeur)')}</option>
            <option value="relais">{t('Point relais')}</option>
          </select>
        </span>
      </label>
      <label className="fld mt10">
        <span className="fld-t">{t('Nom')}</span>
        <span className="inp"><input value={nom} onChange={(e) => setNom(e.target.value)} /></span>
      </label>
      <div className="g g2" style={{ marginTop: 0 }}>
        <label className="fld mt10">
          <span className="fld-t">{t('Zone')}</span>
          <span className="inp">
            <select value={zone || choix[0]?.code} onChange={(e) => setZone(e.target.value)}>
              {choix.map((z) => (
                <option key={z.code} value={z.code}>{`${z.code} ${z.nom}`}</option>
              ))}
            </select>
          </span>
        </label>
        <label className="fld mt10">
          <span className="fld-t">{t('Quartier')}</span>
          <span className="inp"><input value={quartier} onChange={(e) => setQuartier(e.target.value)} /></span>
        </label>
      </div>
      <label className="fld mt10">
        <span className="fld-t">{t('Titulaire')}</span>
        <span className="inp"><input value={titulaire} onChange={(e) => setTitulaire(e.target.value)} autoComplete="off" /></span>
      </label>
      <label className="fld mt10">
        <span className="fld-t">{t('Numéro du titulaire')}</span>
        <span className="inp"><input type="tel" value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="+237 6XX XX XX XX" autoComplete="off" /></span>
      </label>
    </DecisionMotivee>
  )
}
