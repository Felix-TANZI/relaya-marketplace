// ADM-P13 · Catalogue : fiches maîtres et demandes de création (prototype route('catalogue') : 4 indicateurs,
// onglets Fiches maîtres · Demandes de création · Appariements IA · Taxonomie ; demande : photos, recherche faite par
// le vendeur, maîtres proches et leur score, données du maître après décision, décision ; fusion : deux fiches côte à
// côte, justification, effet ; fiche maître : attributs, avis cumulés, offres et coût total livré ; taxonomie : arbre,
// formulaire, « Même grille d'affichage partout » ; règles ADM-P13R-01 à 09).
// Le client cherche un produit, jamais un vendeur : un produit n'existe qu'une fois. L'IA propose, un humain valide ;
// une fusion garde avis, offres et historique des prix, réversible 30 jours ; la console modifie le maître, jamais le
// prix ni le stock d'une offre. Demande traitée sous VD-FICHE-DELAI (prioritaire : plus court).
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { F } from '@client/i18n/format'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { BarresH, Choix, Note, Panel, Pill, Props, Recherche, Table, correspond } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import type { Appariement, DemandeCreation, FicheMaitre } from '../../donnees/domaines/catalogue'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useHorloge, useRole } from '../../session'
import { P3, fusionEnTete, heuresOuvreesRestantes, poidsFacture } from '../ADM-06/calculs/regles'
import { Ai, Av, BandeauErreur, BandeauOk, Cases, Chargement, Chk, Controles, Item, Kick, NoteConflit, NoteLecture, Partage, Puce, Quand, Radios, Regles, Score, Tete, useErreur, useRefus } from '../ADM-06/commun'
import { DecisionMotivee } from '../../composants/DecisionMotivee'
import { useFonctionsS } from '../ADM-03/kit'

type Onglet = 'maitres' | 'demandes' | 'fusion' | 'taxo'
const DECIDENT = ['superviseur', 'verification']

export default function Catalogue() {
  const { t, tf } = usePreferences()
  const [params] = useSearchParams()
  const maintenant = useHorloge()
  const decide = DECIDENT.includes(useRole())
  const onglet = (['maitres', 'demandes', 'fusion', 'taxo'].includes(params.get('onglet') ?? '') ? params.get('onglet') : 'demandes') as Onglet
  const demandes = useLecture(() => source.catalogue.demandes(), [])
  const apps = useLecture(() => source.catalogue.appariements(), [])
  const fiches = useLecture(() => source.catalogue.fiches(), [])
  const erreur = useErreur(demandes.erreur ?? apps.erreur ?? fiches.erreur)
  const [fait, setFait] = useState<string | null>(null)
  const relire = () => (demandes.relire(), apps.relire(), fiches.relire())
  const finir = (m: string) => (setFait(m), relire())
  const dl = demandes.donnees ?? []
  const al = apps.donnees ?? []
  const fl = fiches.donnees ?? []
  const aTraiter = dl.filter((d) => d.etat === 'a_traiter').sort((a, b) => a.echeance - b.echeance)
  const proposes = al.filter((a) => a.etat === 'propose')
  const lien = (o: Onglet, p: Record<string, string> = {}) => chemin('catalogue', { onglet: o, ...p })
  const pret = !!(demandes.donnees && apps.donnees)
  const fonctions = useFonctionsS('catalogue', [
    { verbe: 'Créer', n: aTraiter.length, unite: ['fiche demandée', 'fiches demandées'], icone: 'file-plus-2', route: 'catalogue', params: { onglet: 'demandes' }, geste: true, si: decide },
    { verbe: 'Fusionner', n: proposes.length, unite: ['doublon', 'doublons'], icone: 'git-merge', route: 'catalogue', params: { onglet: 'fusion' }, geste: true, si: decide, alerte: proposes.some((a) => fusionEnTete(a.similarite)) },
    { verbe: 'Classer', n: fl.length, unite: ['fiche maître', 'fiches maîtres'], icone: 'library', route: 'catalogue', params: { onglet: 'maitres' } },
  ])
  return (
    <Ecran
      route="catalogue"
      kicker={<Quand le={maintenant} />}
      fonctions={pret ? fonctions : undefined}
      actions={
        <Link className="btn secondary" to={chemin('moderation')}>
          <Icone nom="badge-check" taille={18} />
          <span>{t('Modération des offres')}</span>
        </Link>
      }
    >
      {erreur && <BandeauErreur quoi="Le catalogue" relire={relire} />}
      {fait && <BandeauOk>{fait}</BandeauOk>}
      <Choix
        forme="tabs"
        aria={t('Catalogue')}
        className="mt16"
        actif={onglet}
        items={[
          { id: 'maitres' as const, t: t('Fiches maîtres'), icone: 'library', n: fl.length, to: lien('maitres') },
          { id: 'demandes' as const, t: t('Demandes de création'), icone: 'file-plus-2', n: aTraiter.length, to: lien('demandes') },
          { id: 'fusion' as const, t: t('Appariements IA'), icone: 'merge', n: proposes.length, to: lien('fusion') },
          { id: 'taxo' as const, t: t('Taxonomie'), icone: 'folder-tree', to: lien('taxo') },
        ]}
      />
      {!demandes.donnees && !erreur ? (
        <Chargement />
      ) : onglet === 'demandes' ? (
        <Demandes l={dl} id={params.get('id')} decide={decide} maintenant={maintenant} fini={finir} />
      ) : onglet === 'fusion' ? (
        <Appariements l={al} id={params.get('id')} decide={decide} maintenant={maintenant} fini={finir} />
      ) : onglet === 'maitres' ? (
        <Fiches l={fl} id={params.get('id')} decide={decide} fini={finir} />
      ) : (
        <Taxonomie decide={decide} fini={finir} />
      )}
      {!decide && <NoteLecture texte="Lecture seule : la Vérification et la Direction tiennent le catalogue (le Support lit, l’agent terrain propose en saisie assistée)." />}
      <Regles
        liste={[
          ['ADM-P13R-01', 'Le client cherche un produit, jamais un vendeur : un produit n’existe qu’une fois comme fiche maître.'],
          ['ADM-P13R-02', 'Le vendeur cherche avant de demander une création ; la demande garde sa recherche.'],
          ['ADM-P13R-03', tf('Demande traitée sous {h} heures ouvrées : créée, rattachée ou refusée avec motif.', { h: P3.ficheDelaiH })],
          ['ADM-P13R-04', tf('L’IA propose, un humain valide ; au-delà de {s}, la fusion passe en tête de file.', { s: String(P3.fusionTete).replace('.', ',') })],
          ['ADM-P13R-05', tf('Une fusion garde avis, offres et historique des prix ; réversible {j} jours.', { j: P3.fusionRetourJ })],
          ['ADM-P13R-06', 'La classe de colis est une donnée du maître (emballage, gabarit, plafond).'],
          ['ADM-P13R-07', 'Taxonomie sans doublon : aucune sous-catégorie homonyme d’une autre.'],
          ['ADM-P13R-08', 'Même grille d’affichage partout ; seuls filtres et sous-rayons changent.'],
          ['ADM-P13R-09', 'La console modifie le maître, jamais le prix ni le stock d’une offre.'],
        ]}
      />
    </Ecran>
  )
}

function Demandes({ l, id, decide, maintenant, fini }: { l: DemandeCreation[]; id: string | null; decide: boolean; maintenant: number; fini: (m: string) => void }) {
  const { t, tf } = usePreferences()
  const [feuille, setFeuille] = useState<'rattacher' | 'creer' | 'refuser' | null>(null)
  const ordre = [...l].sort((a, b) => Number(a.etat !== 'a_traiter') - Number(b.etat !== 'a_traiter') || a.echeance - b.echeance)
  const d = l.find((x) => x.id === id) ?? ordre[0]
  if (!d) return <p className="card-s mt16">{t('Aucune demande de création.')}</p>
  const reste = heuresOuvreesRestantes(maintenant, d.echeance)
  return (
    <Partage
      file={
        <>
          <Kick>{tf('Demandes · {n} · par échéance', { n: l.filter((x) => x.etat === 'a_traiter').length })}</Kick>
          {ordre.map((x) => (
            <Item key={x.id} to={chemin('catalogue', { onglet: 'demandes', id: x.id })} on={x.id === d.id} late={x.etat === 'a_traiter' && heuresOuvreesRestantes(maintenant, x.echeance) < 0} av={<Av icone={x.interdit ? 'ban' : 'package'} />} t={x.produit} pill={<Pill sm>{x.categorie.split(' › ')[0]}</Pill>} s={`${x.vendeur} · ${x.zone}`} x={x.interdit ? t('Produit interdit') : x.proches[0] ? tf('Maître proche à {s}', { s: x.proches[0].similarite.toFixed(2).replace('.', ',') }) : t('Aucun maître proche : création')} xTon={x.interdit ? 'red' : 'amber'} d={x.etat === 'a_traiter' ? <><Icone nom="timer" taille={13} /> <Quand le={x.echeance} /></> : t(x.etat === 'rattachee' ? 'Rattachée' : x.etat === 'creee' ? 'Fiche créée' : 'Refusée')} r={x.etat === 'a_traiter' ? tf('reste {h} h', { h: heuresOuvreesRestantes(maintenant, x.echeance) }) : null} />
          ))}
        </>
      }
      puces={ordre.map((x) => (
        <Puce key={x.id} to={chemin('catalogue', { onglet: 'demandes', id: x.id })} on={x.id === d.id}>
          {x.produit}
        </Puce>
      ))}
    >
      <Panel>
        <Tete
          av={<Av icone={d.interdit ? 'ban' : 'package'} taille={56} />}
          nom={d.produit}
          sous={tf('Demande de {vendeur} ({zone}) · offre proposée à {prix} F, stock {stock}', { vendeur: d.vendeur, zone: d.zone, prix: F(d.prix), stock: d.stock })}
          pills={
            <>
              <Pill sm dot ton={d.interdit ? 'red' : d.etat === 'a_traiter' ? 'or' : 'green'}>
                {t(d.interdit ? 'Produit interdit' : d.etat === 'a_traiter' ? 'Demande de création' : 'Traitée')}
              </Pill>
              {d.prioritaire && <Pill sm ton="acc">{t('Prioritaire')}</Pill>}
            </>
          }
          droite={
            <>
              <div className="t12 c3 b7">{tf('Échéance · {h} h ouvrées', { h: d.prioritaire ? P3.fichePrioriteH : P3.ficheDelaiH })}</div>
              <div className="b8 t15">
                <Quand le={d.echeance} />
              </div>
              {d.etat === 'a_traiter' && <div className={'t12 b7 ' + (reste < 0 ? 'cr' : 'cor')}>{reste < 0 ? tf('dépassée de {n} h', { n: -reste }) : tf('reste {n} h ouvrées', { n: reste })}</div>}
            </>
          }
        />
        <div className="row wrap mt12" style={{ gap: 8 }}>
          {d.photos.map((p) => (
            <Pill key={p} sm icone="image">
              {p}
            </Pill>
          ))}
        </div>
        {d.conflit && <NoteConflit />}
      </Panel>
      {d.interdit ? (
        <Panel titre={t('Pourquoi la demande est refusée')} icone="shield-ban" className="mt16">
          <Chk ton="ko" icone="ban">
            {d.interdit}
          </Chk>
          {d.recherches.map((r) => (
            <Chk key={r.requete} ton="info" icone="search">
              {tf('Recherche du vendeur : {q} ({r})', { q: r.requete, r: r.resultats })}
            </Chk>
          ))}
          <Chk ton="info" icone="flag">
            {t('Une demande refusée n’est pas une sanction ; une offre publiée le serait. Le signal part à la modération.')}
          </Chk>
        </Panel>
      ) : (
        <div className="s3-g2">
          <Panel titre={t('Recherche faite par le vendeur avant sa demande')} icone="search">
            {d.recherches.map((r) => (
              <div key={r.requete} className="row" style={{ gap: 10, padding: '8px 0', borderTop: '1px solid var(--line)' }}>
                <Icone nom="search" taille={15} />
                <div className="grow">
                  <b className="t13">{r.requete}</b>
                  <div className="t12 c3">{r.resultats}</div>
                </div>
                <span className="t12 c3 b7">
                  <Quand le={r.le} jour={false} />
                </span>
              </div>
            ))}
          </Panel>
          <Panel titre={t('Maîtres proches trouvés par l’IA')} icone="sparkles">
            {d.proches.map((m) => (
              <div key={m.fiche} style={{ padding: '8px 0', borderTop: '1px solid var(--line)' }}>
                <b className="t14">{m.titre}</b>
                <div className="t12 c3">
                  {m.fiche} · {m.detail}
                </div>
                <BarresH lignes={[{ l: t('Similarité'), v: m.similarite * 100, max: 100, r: m.similarite.toFixed(2).replace('.', ','), ton: m.similarite >= 0.85 ? 'green' : '' }]} />
                <div className="t12 c2">{m.justification}</div>
              </div>
            ))}
            {!d.proches.length && <p className="card-s">{t('Aucun maître proche.')}</p>}
          </Panel>
        </div>
      )}
      {!d.interdit && (
        <Panel titre={t('Données du maître après décision')} icone="library" className="mt16">
          <Props
            paires={[
              [t('Titre normalisé'), d.produit],
              [t('Catégorie unique'), d.categorie],
              [t('Poids et dimensions'), `${String(d.poids).replace('.', ',')} kg · ${d.dimensions.join(' × ')} cm`],
              [t('Poids facturé'), tf('max({p} ; volume ÷ {d}) = {f} kg', { p: String(d.poids).replace('.', ','), d: F(P3.volumeDiviseur), f: String(poidsFacture(d.poids, d.dimensions)).replace('.', ',') })],
              [t('Classe de colis'), d.classe],
            ]}
          />
          <div className="t12 c3 mt10">{t('La console modifie le maître, jamais le prix ni le stock de l’offre : l’offre est rattachée telle quelle, puis passe par la modération des prix.')}</div>
        </Panel>
      )}
      {d.etat === 'a_traiter' ? (
        <div className="panel mt16" style={{ boxShadow: 'var(--shadow-card), inset 3px 0 0 var(--or)' }}>
          {d.proches[0] && d.proches[0].similarite >= 0.85 && <Ai titre="Proposition de l’assistant" texte={tf('rattacher à « {t} » ({s}). Un maître distinct créerait un doublon pour un même produit.', { t: d.proches[0].titre, s: d.proches[0].similarite.toFixed(2).replace('.', ',') })} confiance={d.proches[0].similarite} />}
          {d.conflit ? (
            <NoteConflit />
          ) : decide ? (
            <div className="admk-dec mt14">
              {!d.interdit && d.proches.length > 0 && (
                <button type="button" className="btn primary" onClick={() => setFeuille('rattacher')}>
                  <Icone nom="git-merge" taille={18} />
                  <span>{t('Rattacher à un maître existant')}</span>
                </button>
              )}
              {!d.interdit && (
                <button type="button" className="btn secondary" onClick={() => setFeuille('creer')}>
                  <Icone nom="file-plus-2" taille={18} />
                  <span>{t('Créer une nouvelle fiche maître')}</span>
                </button>
              )}
              <button type="button" className="btn danger" onClick={() => setFeuille('refuser')}>
                <Icone nom="x" taille={18} />
                <span>{t('Refuser avec motif')}</span>
              </button>
              <span className="sp"></span>
              <span className="lock t12 c3 b7">
                <Icone nom="bell" taille={14} /> {t('Le vendeur est prévenu, son offre est rattachée')}
              </span>
            </div>
          ) : null}
        </div>
      ) : (
        d.decision && (
          <Panel titre={t('Décision')} icone="gavel" className="mt16">
            <Props paires={[[t('Décision'), d.decision.quoi], [t('Auteur'), d.decision.par], [t('Date'), <Quand key="q" le={d.decision.le} />], [t('Motif'), d.decision.motif ?? '—']]} />
          </Panel>
        )
      )}
      <FeuillesDemande key={d.id} d={d} feuille={feuille} fermer={() => setFeuille(null)} fini={fini} />
    </Partage>
  )
}

function FeuillesDemande({ d, feuille, fermer, fini }: { d: DemandeCreation; feuille: string | null; fermer: () => void; fini: (m: string) => void }) {
  const { t, tf } = usePreferences()
  const [fiche, setFiche] = useState(d.proches[0]?.fiche ?? '')
  const [opts, setOpts] = useState(['signaler', 'lien'])
  return (
    <>
      <DecisionMotivee ouverte={feuille === 'rattacher'} fermer={fermer} titre={t('Rattacher à un maître existant')} resume={t('L’offre rejoint la fiche choisie (comme variante si seule la variante diffère) ; le vendeur est prévenu.')} libelle="Rattacher" icone="git-merge" motif="facultatif" envoyer={(m) => source.catalogue.deciderDemande(d.id, { action: 'rattacher', fiche, motif: m })} apres={() => fini(tf('{p} rattachée à {f} : le vendeur est prévenu.', { p: d.produit, f: fiche }))}>
        <Radios nom="Fiche maître" valeur={fiche} choisir={setFiche} options={d.proches.map((m) => ({ v: m.fiche, t: `${m.fiche} · ${m.titre}`, s: tf('similarité {s}', { s: m.similarite.toFixed(2).replace('.', ',') }) }))} />
      </DecisionMotivee>
      <DecisionMotivee ouverte={feuille === 'creer'} fermer={fermer} titre={t('Créer une nouvelle fiche maître')} resume={t('Aucun maître existant ne décrit ce produit : une fiche est créée et l’offre s’y rattache, puis passe à la modération des prix.')} libelle="Créer la fiche" icone="file-plus-2" motif="facultatif" envoyer={(m) => source.catalogue.deciderDemande(d.id, { action: 'creer', motif: m })} apres={() => fini(t('Fiche maître créée : le vendeur est prévenu.'))} />
      <DecisionMotivee ouverte={feuille === 'refuser'} fermer={fermer} titre={t('Refuser avec motif')} resume={tf('{p} · {v}', { p: d.produit, v: d.vendeur })} libelle="Refuser la demande" icone="x" danger etiquetteMotif="Motif en clair, envoyé au vendeur" envoyer={(m) => source.catalogue.deciderDemande(d.id, { action: 'refuser', motif: m, signaler: opts.includes('signaler'), lien: opts.includes('lien') })} apres={() => fini(t('Demande refusée avec motif ; le signal part à la modération.'))}>
        <Cases legende="Options" items={[{ id: 'signaler', t: t('Signaler à la modération des offres') }, { id: 'lien', t: t('Lien vers la liste des produits interdits dans le message') }]} cochees={opts} changer={setOpts} />
      </DecisionMotivee>
    </>
  )
}

function Appariements({ l, id, decide, maintenant, fini }: { l: Appariement[]; id: string | null; decide: boolean; maintenant: number; fini: (m: string) => void }) {
  const { t, tf } = usePreferences()
  const refus = useRefus()
  const [feuille, setFeuille] = useState<'fusionner' | 'distincts' | 'separer' | 'annuler' | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const a = l.find((x) => x.id === id) ?? l[0]
  if (!a) return <p className="card-s mt16">{t('Aucun appariement proposé.')}</p>
  const side = (f: Appariement['gardee'], k: string) => (
    <Panel titre={k}>
      <div className="t12 c3 b8">{f.id}</div>
      <b className="t15">{f.titre}</b>
      <div className="t12 c3 mt4">{f.categorie}</div>
      <div className="mt12">
        <Props paires={[[t('Offres'), f.offres], [t('Avis'), f.avis], [t('Créée'), f.creee]]} />
      </div>
    </Panel>
  )
  return (
    <Partage
      file={
        <>
          <Kick>{tf('Appariements · {n} · par similarité', { n: l.length })}</Kick>
          {l.map((x) => (
            <Item key={x.id} to={chemin('catalogue', { onglet: 'fusion', id: x.id })} on={x.id === a.id} av={<Av icone="merge" />} t={x.gardee.titre} pill={<Pill sm ton={fusionEnTete(x.similarite) ? 'green' : 'acc'}>{x.similarite.toFixed(2).replace('.', ',')}</Pill>} s={`${x.gardee.id} · ${x.double.id}`} d={t(x.etat === 'propose' ? (fusionEnTete(x.similarite) ? 'En tête de file' : 'À examiner') : x.etat === 'fusionne' ? 'Fusionnées' : x.etat === 'annule' ? 'Fusion annulée' : 'Gardées distinctes')} />
          ))}
        </>
      }
      puces={l.map((x) => (
        <Puce key={x.id} to={chemin('catalogue', { onglet: 'fusion', id: x.id })} on={x.id === a.id}>
          {x.id}
        </Puce>
      ))}
    >
      <Panel>
        <div className="row wrap" style={{ gap: 12, justifyContent: 'center' }}>
          <Score v={Math.round(a.similarite * 100)} seuil={null} taille={58} />
          <div>
            <div className="b8 t15">{tf('Similarité {s}', { s: a.similarite.toFixed(2).replace('.', ',') })}</div>
            <div className="t12 c3">
              {t(fusionEnTete(a.similarite) ? 'Au-delà du seuil : fusion proposée en tête de file' : 'Sous le seuil : à examiner')} · <Quand le={a.proposeLe} />
            </div>
          </div>
        </div>
        <div className="s3-g2">
          {side(a.gardee, t('Fiche gardée'))}
          {side(a.double, t('Fiche en double'))}
        </div>
      </Panel>
      <div className="s3-g2">
        <Panel titre={t('Justification de l’appariement')} icone="sparkles">
          <Controles l={a.justification} />
        </Panel>
        <Panel titre={t('Après la fusion')} icone="git-merge">
          <Table cle={(r) => r[0]} rows={a.avant} legende={t('Après la fusion')} cols={[{ k: 'e', t: t('Élément'), main: true, rendu: (r) => <b>{r[0]}</b> }, { k: 'a', t: t('Avant'), rendu: (r) => r[1] }, { k: 'p', t: t('Après'), rendu: (r) => <b>{r[2]}</b> }]} />
          <div className="t12 c3 mt10">{tf('Réversible pendant {j} jours ; rien n’est perdu.', { j: P3.fusionRetourJ })}</div>
        </Panel>
      </div>
      <div className="panel mt16" style={{ boxShadow: 'var(--shadow-card), inset 3px 0 0 var(--or)' }}>
        <Ai titre="Proposition de l’IA" texte={tf('fusionner {b} dans {a}. L’IA ne fusionne jamais seule : vous validez.', { a: a.gardee.id, b: a.double.id })} confiance={a.similarite} />
        {err && (
          <p className="e-erreur mt10" role="alert">
            {err}
          </p>
        )}
        {decide && a.etat === 'propose' && (
          <div className="admk-dec mt14">
            {(['fusionner', 'distincts', 'separer'] as const).map((g, i) => (
              <button
                key={g}
                type="button"
                className={'btn ' + (i === 0 ? 'primary' : i === 1 ? 'secondary' : 'ghost')}
                onClick={async () => {
                  const r = await source.catalogue.deciderAppariement(a.id, g, '')
                  if (r.ok) fini(t(g === 'fusionner' ? 'Fusion validée et journalisée ; réversible pendant le délai du registre.' : g === 'distincts' ? 'Fiches gardées distinctes.' : 'Offres séparées.'))
                  else setErr(refus(r.raison))
                }}
              >
                <Icone nom={i === 0 ? 'git-merge' : i === 1 ? 'split' : 'scissors'} taille={18} />
                <span>{t(i === 0 ? 'Fusionner' : i === 1 ? 'Garder distincts' : 'Séparer')}</span>
              </button>
            ))}
            <span className="sp"></span>
            <span className="lock t12 c3 b7">
              <Icone nom="scroll-text" taille={14} /> {tf('Fusion journalisée, réversible {j} jours', { j: P3.fusionRetourJ })}
            </span>
          </div>
        )}
        {a.etat === 'fusionne' && a.reversibleJusqua && (
          <div className="admk-dec mt14">
            <Pill ton="green" sm dot>
              {t('Fusionnées')}
            </Pill>
            <span className="t12 c3">
              {t('Réversible jusqu’au')} <Quand le={a.reversibleJusqua} />
            </span>
            {decide && maintenant <= a.reversibleJusqua && (
              <button type="button" className="btn secondary" onClick={() => setFeuille('annuler')}>
                <Icone nom="undo-2" taille={18} />
                <span>{t('Annuler la fusion')}</span>
              </button>
            )}
          </div>
        )}
      </div>
      <DecisionMotivee ouverte={feuille === 'annuler'} fermer={() => setFeuille(null)} titre={t('Annuler la fusion')} resume={t('Les deux fiches redeviennent distinctes ; offres, avis et historiques reprennent leur fiche d’origine.')} libelle="Annuler la fusion" icone="undo-2" envoyer={(m) => source.catalogue.deciderAppariement(a.id, 'annuler', m)} apres={() => fini(t('Fusion annulée.'))} />
    </Partage>
  )
}

function Fiches({ l, id, decide, fini }: { l: FicheMaitre[]; id: string | null; decide: boolean; fini: (m: string) => void }) {
  const { t, tf } = usePreferences()
  const [q, setQ] = useState('')
  const [feuille, setFeuille] = useState(false)
  const [titre, setTitre] = useState('')
  const f = l.find((x) => x.id === id)
  const ETAT: Record<FicheMaitre['offres'][number]['etat'], [string, 'green' | 'ink' | 'amber' | 'red']> = { attribuee: ['Attribuée', 'green'], suivante: ['Suivante', 'ink'], moderation: ['Suspendue · modération', 'amber'], sanction: ['Dépubliée · sanction', 'red'] }
  if (!f)
    return (
      <div className="mt16">
        <Table
          cle={(x) => x.id}
          rows={l.filter((x) => correspond(q, x.titre, x.id, x.categorie))}
          legende={t('Fiches maîtres')}
          outils={<Recherche q={q} setQ={setQ} placeholder={t('Produit, identifiant, catégorie…')} aria={t('Rechercher une fiche maître')} />}
          vide={<p className="card-s" style={{ padding: 16 }}>{t('Aucune fiche ne correspond.')}</p>}
          cols={[
            { k: 't', t: t('Fiche maître'), main: true, rendu: (x) => <Link to={chemin('catalogue', { onglet: 'maitres', id: x.id })}><b>{x.titre}</b><div className="t12 c3">{x.id}</div></Link> },
            { k: 'c', t: t('Catégorie'), rendu: (x) => x.categorie },
            { k: 'k', t: t('Classe'), rendu: (x) => x.classe },
            { k: 'o', t: t('Offres'), cls: 'r', rendu: (x) => x.offres.length },
            { k: 'a', t: t('Avis'), cls: 'r', rendu: (x) => (x.note ? `${String(x.note).replace('.', ',')} ★ · ${x.nbAvis}` : '—') },
          ]}
        />
      </div>
    )
  return (
    <>
      <div className="btns mt16">
        <Link className="btn ghost sm" to={chemin('catalogue', { onglet: 'maitres' })}>
          <Icone nom="chevron-left" taille={16} />
          <span>{t('Toutes les fiches maîtres')}</span>
        </Link>
      </div>
      <Panel className="mt12">
        <div className="row wrap" style={{ gap: 18, alignItems: 'flex-start' }}>
          <Av icone="package" taille={96} />
          <div className="grow" style={{ minWidth: 220 }}>
            <div className="t12 c3 b8">
              {f.id} · {t('publiée le')} <Quand le={f.publieeLe} />
              {f.fusion && <> · {tf('{d} fusionnée, réversible jusqu’au', { d: f.fusion.de })} <Quand le={f.fusion.reversibleJusqua} /></>}
            </div>
            <h2 style={{ margin: '4px 0 0', fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-.02em' }}>{f.titre}</h2>
            <div className="row wrap mt8" style={{ gap: 6 }}>
              <Pill ton="green" sm dot>
                {t('Publiée')}
              </Pill>
              <Pill ton="acc" sm>
                {f.categorie}
              </Pill>
              <Pill sm>{tf('Classe {c} · {p} kg', { c: f.classe, p: String(f.poids).replace('.', ',') })}</Pill>
              {f.note && <Pill ton="gold" sm>{tf('{n} ★ · {a} avis cumulés', { n: String(f.note).replace('.', ','), a: f.nbAvis })}</Pill>}
            </div>
            <div className="t12 c3 mt8">{tf('{n} photo(s) réelle(s) · aucune fiche publiée sans image réelle', { n: f.photos })}</div>
          </div>
          {decide && (
            <button type="button" className="btn secondary" onClick={() => (setTitre(f.titre), setFeuille(true))}>
              <Icone nom="pencil" taille={18} />
              <span>{t('Modifier la fiche maître')}</span>
            </button>
          )}
        </div>
      </Panel>
      <div className="s3-g2">
        <Panel titre={t('Attributs de la catégorie')} icone="list">
          <Props paires={f.attributs.length ? f.attributs.map(([k, v]) => [k, v]) : [[t('Poids et classe'), `${String(f.poids).replace('.', ',')} kg · ${f.classe}`]]} />
        </Panel>
        <Panel titre={t('Avis cumulés sur le maître')} icone="star" a={{ t: t('Avis'), to: chemin('avis') }}>
          <BarresH lignes={f.repartition.map((n, i) => ({ l: tf('{n} étoile(s)', { n: 5 - i }), v: n, max: Math.max(1, f.nbAvis), r: String(n), ton: i >= 3 ? 'red' : 'acc' }))} />
          <div className="t12 c3 mt8">{t('Les avis de toutes les offres sont cumulés sur la fiche maître ; les photos réelles sont mises en avant.')}</div>
        </Panel>
      </div>
      <Panel titre={t('Offres rattachées · le vendeur attribué est calculé, jamais choisi')} icone="store" className="mt16">
        <Table
          cle={(o) => o.vendeur + o.prix}
          rows={f.offres}
          legende={t('Offres rattachées')}
          cols={[
            { k: 'v', t: t('Vendeur'), main: true, rendu: (o) => <b>{o.vendeur}</b> },
            { k: 'p', t: t('Prix'), cls: 'r', rendu: (o) => `${F(o.prix)} F` },
            { k: 's', t: t('Stock'), cls: 'r', rendu: (o) => o.stock },
            { k: 'z', t: t('Zone'), rendu: (o) => o.zone },
            { k: 't', t: t('Trust'), rendu: (o) => <Score v={o.trust} seuil={null} taille={30} /> },
            { k: 'c', t: t('Coût total livré'), cls: 'r', rendu: (o) => (o.coutLivre ? <b>{`${F(o.coutLivre)} F`}</b> : '—') },
            { k: 'e', t: t('État'), rendu: (o) => <Pill sm ton={ETAT[o.etat][1]}>{t(ETAT[o.etat][0])}</Pill> },
          ]}
        />
        <div className="t12 c3 mt10">{t('Vendeur attribué = coût total livré le plus bas, Trust Score en départage ; bascule automatique vers le suivant en cas de rupture, lenteur ou refus. Aucun nom de boutique n’est affiché sur une fiche maître.')}</div>
      </Panel>
      <DecisionMotivee ouverte={feuille} fermer={() => setFeuille(false)} titre={t('Modifier la fiche maître')} resume={t('La console modifie le maître, jamais le prix ni le stock d’une offre.')} libelle="Enregistrer" icone="pencil" envoyer={(m) => source.catalogue.modifierFiche(f.id, titre, m)} apres={() => fini(t('Fiche maître modifiée et journalisée.'))}>
        <label className="fld fld-l mt14">
          <span className="fld-t">{t('Titre normalisé')}</span>
          <span className="inp">
            <input value={titre} onChange={(e) => setTitre(e.target.value)} />
          </span>
        </label>
      </DecisionMotivee>
    </>
  )
}

function Taxonomie({ decide, fini }: { decide: boolean; fini: (m: string) => void }) {
  const { t, tf } = usePreferences()
  const lecture = useLecture(() => source.catalogue.taxonomie(), [])
  const [parent, setParent] = useState('Informatique')
  const [nom, setNom] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const l = lecture.donnees ?? []
  const creer = async () => {
    const r = await source.catalogue.creerSousCategorie(parent, nom)
    if (r.ok) {
      setErr(null)
      setNom('')
      fini(tf('Sous-catégorie « {n} » créée dans « {p} ».', { n: nom.trim(), p: parent }))
      lecture.relire()
    } else setErr(r.raison === 'doublon' ? tf('Création refusée : « {n} » existe déjà dans « {c} ». Une catégorie ne peut pas contenir une sous-catégorie homonyme d’une autre : utilisez un filtre ou un sous-rayon.', { n: nom.trim(), c: r.existe ?? '' }) : r.raison === 'vide' ? t('Donnez un nom à la sous-catégorie.') : t('Votre rôle lit cette page sans y décider.'))
  }
  return (
    <div className="s3-g2">
      <Panel titre={t('Arbre des catégories')} icone="folder-tree">
        {l.map((c) => (
          <div key={c.nom}>
            <div className="row" style={{ gap: 8, padding: '7px 0', borderTop: '1px solid var(--line)' }}>
              <Icone nom="folder" taille={16} />
              <b className="grow t13">{c.nom}</b>
              <span className="t12 c3 b7">{tf('{n} fiches', { n: c.fiches })}</span>
            </div>
            {c.sous.map((s) => (
              <div key={s.nom} className="row" style={{ gap: 8, padding: '6px 0 6px 22px', borderTop: '1px solid var(--line)' }}>
                <Icone nom="corner-down-right" taille={16} />
                <span className="grow t13 b7">{s.nom}</span>
                <span className="t12 c3 b7">{s.fiches}</span>
              </div>
            ))}
          </div>
        ))}
        <div className="t12 c3 mt10">{tf('{c} catégories · {s} sous-catégories · aucun doublon.', { c: l.length, s: l.reduce((n, c) => n + c.sous.length, 0) })}</div>
      </Panel>
      <div>
        <Panel titre={t('Nouvelle sous-catégorie')} icone="folder-plus">
          <label className="fld fld-l">
            <span className="fld-t">{t('Catégorie parente')}</span>
            <span className="inp">
              <select value={parent} onChange={(e) => setParent(e.target.value)} disabled={!decide}>
                {l.map((c) => (
                  <option key={c.nom}>{c.nom}</option>
                ))}
              </select>
            </span>
          </label>
          <label className="fld fld-l mt10">
            <span className="fld-t">{t('Nom')}</span>
            <span className="inp">
              <input value={nom} onChange={(e) => setNom(e.target.value)} disabled={!decide} aria-invalid={!!err} />
            </span>
          </label>
          {err && (
            <Note ton="red" icone="circle-x" className="mt10" role="alert">
              {err}
            </Note>
          )}
          {decide && (
            <div className="admk-dec mt12">
              <button type="button" className="btn primary" onClick={() => void creer()}>
                <Icone nom="plus" taille={18} />
                <span>{t('Créer la sous-catégorie')}</span>
              </button>
            </div>
          )}
        </Panel>
        <Panel titre={t('Même grille d’affichage partout')} icone="layout-grid" className="mt16">
          <div className="t13 c2">{t('La grille des résultats est la même dans toutes les catégories. Seuls les filtres et les sous-rayons s’adaptent au type de produit.')}</div>
          <Table cle={(s) => s.nom} rows={l.flatMap((c) => c.sous).slice(0, 6)} legende={t('Filtres propres')} cols={[{ k: 'n', t: t('Catégorie'), main: true, rendu: (s) => <b>{s.nom}</b> }, { k: 'f', t: t('Filtres propres'), rendu: (s) => s.filtres }]} />
        </Panel>
      </div>
    </div>
  )
}

