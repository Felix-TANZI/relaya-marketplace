// ADM-P37 · Contenus légaux et produits interdits (ADM-13 § 51). Structure du prototype : indicateurs, « Textes et
// versions », « Produits interdits », acceptations par acteur, « Cadre juridique », « Contrôle du vocabulaire »,
// « Politique de retour en vigueur » ; version annoncée (?texte=) : préavis, ce qui change, acceptations, versions,
// lire et comparer. Un texte modifié est annoncé ADM-PREAVIS-J jours avant son effet et accepté de nouveau à la
// connexion suivante ; le vocabulaire d'un établissement de paiement est refusé ; aucun texte sans version. Les valeurs
// (mentions, politique de retour) sont lues au registre. Gestes : Direction ; Audit en lecture.
import { useState } from 'react'
import { DecisionMotivee } from '../../composants/DecisionMotivee'
import { Link, useSearchParams } from 'react-router-dom'
import { Feuille } from '@client/composants/Feuille'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Banniere, Barre, Kpi, Kv, Li, Note, Panel, Pill, Px, Sec, St, Table, Vide, useSurtitre } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import type { TableauLegal, TexteLegal } from '../../donnees/domaines/systeme'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { useFonctions } from '../AJ-A/fonctions-page'
import { usePreferences } from '../../preferences'
import { useDroit, useHorloge } from '../../session'
import { EtatLecture, NOM_ESPACE, useDate, useRaison } from '../ADM-12/commun-s6'

const JOUR = 86_400_000
const normer = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function Legal() {
  const { t } = usePreferences()
  const surtitre = useSurtitre()
  const [params] = useSearchParams()
  const id = params.get('texte')
  const gestes = useDroit('legal').acces === 'oui'
  const l = useLecture(() => source.systeme.legal(), [])
  const [proposer, setProposer] = useState(false)
  const textes = l.donnees?.textes ?? []
  const fonctions = useFonctions([
    { verbe: 'Annoncer', n: textes.filter((x) => x.annonce).length, unite: ['nouvelle version', 'nouvelles versions'], icone: 'megaphone', route: 'legal', params: { texte: textes.find((x) => x.annonce)?.id } },
    gestes && { verbe: 'Proposer', n: null, unite: ['texte', 'textes'], icone: 'file-plus', onClick: () => setProposer(true) },
  ])
  const texte = id ? l.donnees?.textes.find((x) => x.id === id) : null
  return (
    <Ecran
      route="legal"
      titre={texte ? t(texte.titre) : undefined}
      nom={texte ? t(texte.titre) : undefined}
      retour={id ? chemin('legal') : undefined}
      kicker={surtitre}
      fonctions={id ? undefined : fonctions}
      actions={
        <>
          <Link className="btn secondary" to={chemin('support')}>
            <Icone nom="life-buoy" taille={18} />
            <span>{t('Voir le centre d’aide')}</span>
          </Link>
          {gestes && (
            <button type="button" className="btn primary" onClick={() => setProposer(true)}>
              <Icone nom="file-plus" taille={18} />
              <span>{t('Proposer une version')}</span>
            </button>
          )}
        </>
      }
    >
      <Px>
        <EtatLecture l={l} quoi="les contenus légaux">
          {(d) => (
            <>
              {id ? texte ? <Version x={texte} preavisJ={d.preavisJ} /> : <Vide icone="search-x" t={t('Texte introuvable')} action={<Link className="btn secondary" to={chemin('legal')}>{t('Tous les textes')}</Link>} /> : <Textes d={d} />}
              <Proposer d={d} ouverte={proposer} fermer={() => setProposer(false)} initial={id ?? ''} />
            </>
          )}
        </EtatLecture>
      </Px>
    </Ecran>
  )
}

function Textes({ d }: { d: TableauLegal }) {
  const { t, tf } = usePreferences()
  const date = useDate()
  const raison = useRaison()
  const gestes = useDroit('legal').acces === 'oui'
  const [ajout, setAjout] = useState<string | null>(null)
  const [produit, setProduit] = useState('')
  const annonces = d.textes.filter((x) => x.annonce)
  const actifs = d.acceptations.reduce((a, x) => a + x.actifs, 0)
  const aJour = d.acceptations.reduce((a, x) => a + x.aJour, 0)
  return (
    <>
      {annonces.map((x) => (
        <Banniere key={x.id} ton="acc" icone="megaphone" bouton={<Link className="btn sm secondary" to={chemin('legal', { texte: x.id })}>{t('Voir')}</Link>}>
          <b>{tf('Annonce envoyée : {t} v{v}.', { t: t(x.titre), v: x.annonce!.version })}</b> {tf('Effet {d}', { d: date(x.annonce!.effet) })}
        </Banniere>
      ))}
      <div className="g g4">
        <Kpi k={t('Textes en vigueur')} v={d.textes.length} s={t('tous versionnés')} icone="file-check" />
        <Kpi k={t('Acteurs actifs à jour')} v={`${Math.round((100 * aJour) / Math.max(1, actifs))} %`} s={tf('{a} sur {n}', { a: aJour, n: actifs })} icone="user-check" iton="green" />
        <Kpi k={t('Versions annoncées')} v={annonces.length} s={tf('effet {n} jours après l’annonce', { n: d.preavisJ })} icone="megaphone" iton="amber" />
        <Kpi k={t('Produits interdits')} v={d.interdits.length} u={t(' catégories')} s={tf('{n} restreintes', { n: d.interdits.filter((x) => x.restreint).length })} icone="ban" ton="night" />
      </div>
      <Sec t={t('Textes et versions')} />
      <Table
        cle={(x) => x.id}
        rows={d.textes}
        cols={[
          { k: 't', t: t('Texte'), main: true, rendu: (x) => <b>{t(x.titre)}</b> },
          { k: 'w', t: t('Accepté par'), rendu: (x) => x.destinataires.map((e) => t(NOM_ESPACE[e])).join(', ') },
          { k: 'v', t: t('Version'), rendu: (x) => `v${x.version}` },
          { k: 'd', t: t('Date d’effet'), rendu: (x) => date(x.effet).split(' · ')[0] },
          { k: 'a', t: t('Acceptations'), hideM: true, rendu: (x) => (<><Barre pct={(100 * x.acceptes) / Math.max(1, x.actifs)} ton="green" /><div className="t2">{`${x.acceptes} / ${x.actifs}`}</div></>) },
          { k: 'e', t: t('État'), rendu: (x) => (x.annonce ? <St t={tf('v{v} annoncée', { v: x.annonce.version })} ton="amber" /> : <St t={t('En vigueur')} ton="green" />) },
          { k: 'go', t: '', cls: 'r', rendu: (x) => <Link className="btn sm secondary" to={chemin('legal', { texte: x.id })} aria-label={tf('Voir : {t}', { t: t(x.titre) })}>{t('Voir')}</Link> },
        ]}
      />
      <div className="g g2">
        <Panel titre={t('Produits interdits')} icone="ban" a={{ t: t('Centre d’aide'), to: chemin('support') }}>
          {d.interdits.map((c) => (
            <Li
              key={c.categorie}
              icone={c.restreint ? 'shield-alert' : 'ban'}
              ton={c.restreint ? 'amber' : 'red'}
              t={`${t(c.categorie)}${c.restreint ? ' · ' + t('restreint') : ''}`}
              s={`${c.produits.map((p) => t(p)).join(', ')} — ${t(c.base)}`}
              droite={gestes ? <button type="button" className="btn sm ghost" style={{ minWidth: 44 }} onClick={() => setAjout(c.categorie)} aria-label={tf('Ajouter un produit à « {c} »', { c: t(c.categorie) })}><Icone nom="plus" taille={16} /></button> : undefined}
            />
          ))}
          <p className="t12 c3 mt8">{t('Produit interdit découvert après vente : dépublication, dossier, remboursement du client et veto du vendeur.')} <Link to={chemin('moderation')}>{t('Modération')}</Link></p>
        </Panel>
        <Panel titre={t('Acceptations par acteur')} icone="users">
          <Table
            cle={(x) => x.espace}
            rows={d.acceptations}
            cols={[
              { k: 'a', t: t('Acteur'), main: true, rendu: (x) => t(NOM_ESPACE[x.espace]) },
              { k: 'n', t: t('Actifs'), cls: 'r', rendu: (x) => x.actifs },
              { k: 'j', t: t('À jour'), cls: 'r', rendu: (x) => x.aJour },
              { k: 'x', t: t('Textes acceptés'), rendu: (x) => <Barre pct={(100 * x.aJour) / Math.max(1, x.actifs)} ton="green" /> },
            ]}
          />
        </Panel>
      </div>
      <div className="g g3">
        <Panel titre={t('Cadre juridique')} icone="scale">
          {d.cadre.map((c) => <Kv key={c.loi} k={t(c.loi)} v={t(c.objet)} />)}
          <p className="t12 c3 mt8">{d.mentions}</p>
        </Panel>
        <Panel titre={t('Contrôle du vocabulaire')} icone="spell-check">
          {d.vocabulaire.map((v) => <Kv key={v.interdit} k={<s>{t(v.interdit)}</s>} v={t(v.plutot)} />)}
        </Panel>
        <Panel titre={t('Politique de retour en vigueur')} icone="undo-2" a={{ t: t('Paramétrage'), to: chemin('parametrage') }}>
          {d.retour.map((r) => <Kv key={r.cle} k={t(r.cle)} v={r.valeur} />)}
        </Panel>
      </div>
      <DecisionMotivee
        ouverte={!!ajout}
        fermer={() => setAjout(null)}
        titre={ajout ? tf('Ajouter un produit à « {c} »', { c: t(ajout) }) : ''}
        resume={t('La liste est publiée au centre d’aide ; la modération s’y réfère pour refuser une offre.')}
        libelle="Ajouter"
        icone="plus"
        envoyer={async (m) => {
          const r = await source.systeme.ajouterInterdit(ajout!, produit, m)
          if (r.ok) setProduit('')
          return r.ok ? null : raison(r.raison, { vide: 'Nommez le produit.', existe: 'Ce produit est déjà dans la liste.', inconnu: 'Catégorie inconnue.' })
        }}
      >
        <label className="fld mt14">
          <span className="fld-t">{t('Produit')}</span>
          <span className="inp"><input value={produit} onChange={(e) => setProduit(e.target.value)} /></span>
        </label>
      </DecisionMotivee>
    </>
  )
}

function Version({ x, preavisJ }: { x: TexteLegal; preavisJ: number }) {
  const { t, tf } = usePreferences()
  const date = useDate()
  const n = useHorloge()
  const [lire, setLire] = useState<string | null>(null)
  const [comparer, setComparer] = useState(false)
  const a = x.annonce
  const versions = [...(a ? [{ version: a.version, effet: a.effet, resume: a.resume, contenu: a.contenu }] : []), ...x.versions]
  const lue = versions.find((v) => v.version === lire)
  return (
    <>
      {a ? (
        <div className="hero night" style={{ marginTop: 0 }}>
          <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
            <span className="hk">{t('Nouvelle version annoncée')}</span>
            <Pill ton="dk" icone="megaphone">{`v${x.version} → v${a.version}`}</Pill>
          </div>
          <div className="ht mt8">{tf('Effet {d}', { d: date(a.effet) })}</div>
          <div className="mt14"><Barre pct={Math.min(100, (100 * (n - a.annonceeLe)) / Math.max(1, a.effet - a.annonceeLe))} ton="acc" /></div>
          <div className="row mt8 t12" style={{ justifyContent: 'space-between' }}>
            <span>{tf('Annoncée {d}', { d: date(a.annonceeLe) })}</span>
            <span>{tf('{n} jours restants · préavis de {p} jours', { n: Math.max(0, Math.ceil((a.effet - n) / JOUR)), p: preavisJ })}</span>
          </div>
          <div className="adme-btns">
            <button type="button" className="btn white" onClick={() => setLire(a.version)}>
              <Icone nom="book-open" taille={18} />
              <span>{tf('Lire la v{v}', { v: a.version })}</span>
            </button>
            <button type="button" className="btn dark" onClick={() => setComparer(true)}>
              <Icone nom="git-compare" taille={18} />
              <span>{tf('Comparer v{a} et v{b}', { a: x.version, b: a.version })}</span>
            </button>
          </div>
        </div>
      ) : (
        <Note ton="green" icone="circle-check">{tf('v{v} en vigueur depuis {d} ; aucune version annoncée.', { v: x.version, d: date(x.effet) })}</Note>
      )}
      <div className="g g3">
        <Panel titre={t('Ce qui change')} icone="list">
          <p className="t14">{a ? a.resume : t('Rien d’annoncé.')}</p>
        </Panel>
        <Panel titre={a ? tf('Acceptations de la v{v}', { v: a.version }) : t('Acceptations')} icone="user-check">
          <Barre pct={(100 * (a ? a.acceptes : x.acceptes)) / Math.max(1, x.actifs)} ton="green" />
          <p className="t13 mt8">{tf('{a} sur {n} acteurs actifs ({d})', { a: a ? a.acceptes : x.acceptes, n: x.actifs, d: x.destinataires.map((e) => t(NOM_ESPACE[e])).join(', ') })}</p>
        </Panel>
        <Panel titre={t('Versions de ce texte')} icone="history">
          {versions.map((v) => <Li key={v.version} icone="file-text" ton="acc" t={`v${v.version} · ${date(v.effet).split(' · ')[0]}`} s={v.resume} onClick={() => setLire(v.version)} />)}
        </Panel>
      </div>
      <Feuille ouverte={!!lue} fermer={() => setLire(null)} titre={lue ? `${t(x.titre)} · v${lue.version}` : ''} forme="large">
        {lue && (
          <div className="e-decision">
            <h2 className="card-t">{`${t(x.titre)} · v${lue.version}`}</h2>
            <p className="card-s">{tf('Date d’effet : {d}', { d: date(lue.effet) })}</p>
            <p className="t14 mt14">{lue.contenu}</p>
          </div>
        )}
      </Feuille>
      <Feuille ouverte={comparer} fermer={() => setComparer(false)} titre={t('Comparer les versions')} forme="large">
        <div className="e-decision">
          <h2 className="card-t">{t('Comparer les versions')}</h2>
          <div className="g g2">
            {versions.slice(0, 2).reverse().map((v) => (
              <Panel key={v.version} titre={`v${v.version}`} icone="file-text">
                <p className="t14">{v.contenu}</p>
              </Panel>
            ))}
          </div>
        </div>
      </Feuille>
    </>
  )
}

function Proposer({ d, ouverte, fermer, initial }: { d: TableauLegal; ouverte: boolean; fermer: () => void; initial: string }) {
  const { t, tf } = usePreferences()
  const raison = useRaison()
  const n = useHorloge()
  const min = new Date(n + (d.preavisJ + 1) * JOUR + 3600_000).toISOString().slice(0, 10)
  const [texte, setTexte] = useState(initial)
  const [resume, setResume] = useState('')
  const [contenu, setContenu] = useState('')
  const [effet, setEffet] = useState(min)
  const mots = d.vocabulaire.filter((v) => new RegExp(`(^|[^a-z])${normer(v.interdit)}([^a-z]|$)`).test(normer(`${resume} ${contenu}`)))
  return (
    <DecisionMotivee
      ouverte={ouverte}
      fermer={fermer}
      titre={t('Proposer une version')}
      resume={tf('La version est annoncée tout de suite aux acteurs concernés ; elle s’applique {n} jours après au plus tôt et sera acceptée de nouveau à la connexion suivante.', { n: d.preavisJ })}
      libelle="Annoncer la version"
      icone="megaphone"
      avertissement={mots.length ? tf('Vocabulaire refusé : {m}.', { m: mots.map((m) => t(m.interdit)).join(', ') }) : undefined}
      envoyer={async (m) => {
        const [a, mo, j] = effet.split('-').map(Number)
        const r = await source.systeme.proposerVersion({ texte, resume, contenu, effet: Date.UTC(a, mo - 1, j) - 3600_000, motif: m })
        if (r.ok) {
          setResume('')
          setContenu('')
        }
        return r.ok ? null : r.raison === 'vocabulaire' ? tf('Vocabulaire refusé : {m}.', { m: r.detail ?? '' }) : raison(r.raison, { preavis: tf('La date d’effet doit suivre l’annonce de {n} jours au moins.', { n: d.preavisJ }), deja_annoncee: 'Une version de ce texte est déjà annoncée.', inconnu: 'Choisissez un texte.' })
      }}
    >
      <label className="fld mt14">
        <span className="fld-t">{t('Texte')}</span>
        <span className="inp">
          <select value={texte} onChange={(e) => setTexte(e.target.value)}>
            <option value="">{t('Choisir un texte')}</option>
            {d.textes.map((x) => <option key={x.id} value={x.id}>{t(x.titre)}</option>)}
          </select>
        </span>
      </label>
      <label className="fld mt10">
        <span className="fld-t">{t('Ce qui change (résumé public)')}</span>
        <span className="inp"><input value={resume} onChange={(e) => setResume(e.target.value)} /></span>
      </label>
      <label className="fld mt10">
        <span className="fld-t">{t('Texte de la version')}</span>
        <span className="inp"><textarea rows={4} value={contenu} onChange={(e) => setContenu(e.target.value)} /></span>
      </label>
      <label className="fld mt10">
        <span className="fld-t">{t('Date d’effet')}</span>
        <span className="inp"><input type="date" min={min} value={effet} onChange={(e) => setEffet(e.target.value)} /></span>
      </label>
    </DecisionMotivee>
  )
}
