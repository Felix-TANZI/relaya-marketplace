// ENT-P17 · Litiges, repris sur le prototype (route('litiges')) et selon DP-35 seule (DP-62, QUESTIONS L-01 ; domaine
// src/donnees/domaines/litiges.ts). Onglets Ouverts · En examen · Décidés (compteurs ; « Ouverts » nourrit le badge
// du menu). Ordinateur (g12) : à gauche Dossiers (cartes ec7-card, aide), Étapes du dossier (frise datée, journal),
// Ce que ce dossier change ; à droite un seul héros (compte à rebours orange, ou décision chiffrée nuit), Dossier
// (propriétés, preuves jointes d'office), puis Votre réponse, Votre réponse · envoyée + Compléter le dossier, ou
// Décision de BelivaY. Téléphone : cartes, héros, dossier, action, effets, étapes. Aucun dossier : état vide et
// « Pour gagner un litige ». Qui fait quoi (L-02) : le répartiteur prépare et joint la déclaration du livreur, le
// propriétaire envoie et fait le recours, le comptable lit ; aucun montant pour le répartiteur. Hors connexion : les
// envois attendent le réseau. Un dossier n'est jamais supprimé (conservé ENT-CONSERV-PREUVES jours).
// Enrichissements (ENRICHISSEMENTS.md P17) : recherche « / » et puces (à répondre, ouverts, clos) sur tous les dossiers
// (?q=, ?f=) ; comptes à rebours en direct (réponse, décision, recours) ; dossier en PDF ; réponse, brouillon et élément
// nouveau gardés hors connexion (file) — sauf « Accepter » (engage une retenue) et le recours (une seule fois), qui
// attendent le réseau, et l'écran le dit ; délais et plafonds écrits là où ils s'appliquent ; rôles expliqués.
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Icone } from '../../composants/Icone'
import { AucunResultat, Barre, BarrePouce, Choix, Compte, correspond, exporterPdf, Frise, Hint, Interdit, Kv, Li, Limite, Note, Panel, Pill, Plus, Props, Puces, Px, Rebours, Recherche, St, Tete, type Ton, useLarge, Vide } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import type { EtapeLitige, GenreReponse, Litige, PreuveDossier, RefusLitige } from '../../donnees/domaines/litiges'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { lireLitigesDp35, lireVersements } from '../../calculs/ent07'
import { HEURE } from '../../calculs/temps'
import { usePreferences } from '../../preferences'
import { useHorloge, useMontantsVisibles, usePeut, useRouteOuverte, useSession } from '../../session'
import { Chargement, useAnnonce, useDates, useEnLigne, useF, useOnglet } from './commun'
import { Col, ErreurPx, Gros } from './px'
import { Ecran } from '../../composants/coque'
import { geste } from '../../donnees/fileHorsLigne'
import type { LignePdf } from '../../donnees/exports'
import { TexteTraduisible } from '@client/traduction/Traduisible'

const P = lireLitigesDp35()
const V = lireVersements()
const ETAPES: EtapeLitige[] = ['ouvert', 'examen', 'decide']
const TITRE_ETAPE: Record<EtapeLitige, string> = { ouvert: 'Ouverts', examen: 'En examen', decide: 'Décidés' }
const ST_ETAPE: Record<EtapeLitige, [string, Ton]> = { ouvert: ['Ouvert', 'red'], examen: ['En examen', 'amber'], decide: ['Décidé', 'ink'] }
const OUVERT_PAR: Record<Litige['ouvertPar'], string> = { client: 'Ouvert par le client', vendeur: 'Ouvert par le vendeur', relais: 'Ouvert par le relais' }
const GENRE: Record<GenreReponse, string> = { accepter: 'Accepter', contester: 'Contester avec preuves', arrangement: 'Proposer un arrangement' }
const ICONE_PREUVE: Record<PreuveDossier['genre'], string> = { photo: 'camera', qr: 'qr-code', code: 'key-round', position: 'map-pin', appel: 'phone', incident: 'triangle-alert' }
const EN_TORT: Record<string, string> = { entreprise: 'Transporteur en tort', vendeur: 'Vendeur en tort', client: 'Demande du client rejetée', aucune: 'Aucune partie en tort' }

const recoursOuvert = (l: Litige, maintenant: number) => !!l.decision && !l.recours && maintenant < l.decision.le + P.recoursH * HEURE

// Puces : à répondre (ouvert, avant l'échéance), ouverts (pas encore définitifs : ouvert, en examen, recours possible ou
// en cours), clos (décision définitive).
const FILTRES = ['tous', 'a_repondre', 'ouverts', 'clos'] as const
type Filtre = (typeof FILTRES)[number]
const TITRE_FILTRE: Record<Filtre, string> = { tous: 'Tous', a_repondre: 'À répondre', ouverts: 'Ouverts', clos: 'Clos' }
const clos = (l: Litige, n: number) => l.etape === 'decide' && !recoursOuvert(l, n) && l.recours?.statut !== 'en_cours'
const FILTRE: Record<Filtre, (l: Litige, n: number) => boolean> = {
  tous: () => true,
  a_repondre: (l, n) => l.etape === 'ouvert' && n < l.repondreAvant,
  ouverts: (l, n) => !clos(l, n),
  clos,
}
/** Échéance qui court sur un dossier (réponse, décision, recours), pour trier par urgence. */
const echeance = (l: Litige, n: number) => (l.etape === 'ouvert' ? l.repondreAvant : l.etape === 'examen' ? l.decisionAvant : recoursOuvert(l, n) ? l.decision!.le + P.recoursH * HEURE : Infinity)

export default function Litiges() {
  const { t, tf } = usePreferences()
  const large = useLarge()
  const maintenant = useHorloge()
  const nom = useSession().entreprise?.nom ?? t('votre entreprise')
  const preparer = usePeut(['proprietaire', 'repartiteur'])
  const pdfDossier = usePdfDossier()
  const lecture = useLecture(() => source.litiges.liste(), [])
  const tous = lecture.donnees
  const [onglet, choisirOnglet] = useOnglet(ETAPES, 'ouvert')
  const [params, setParams] = useSearchParams()
  const id = params.get('id')
  const q = params.get('q') ?? ''
  const fp = params.get('f') as Filtre | null
  const filtre: Filtre = fp && FILTRES.includes(fp) ? fp : 'tous'
  // Recherche ou puce : la liste porte sur tous les dossiers, quelle que soit l'étape ; sinon, l'onglet choisi.
  const global = !!q.trim() || filtre !== 'tous'
  const regler = (f: (p: URLSearchParams) => void) => {
    const p = new URLSearchParams(window.location.search) // l’adresse du moment : les mises à jour du routeur arrivent en transition
    f(p)
    setParams(p, { replace: true })
  }
  const setQ = (v: string) => regler((p) => (v ? p.set('q', v) : p.delete('q')))
  const setFiltre = (v: Filtre) => regler((p) => (v === 'tous' ? p.delete('f') : p.set('f', v)))
  const effacer = () => regler((p) => (p.delete('q'), p.delete('f')))
  // Un lien vers un dossier ouvre son onglet.
  useEffect(() => {
    const l = tous?.find((x) => x.id === id)
    if (l && !global && l.etape !== onglet) choisirOnglet(l.etape)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tous, id])
  const liste = global
    ? (tous ?? []).filter((l) => FILTRE[filtre](l, maintenant) && correspond(q, l.id, l.commande, l.paquetId, l.missionId, l.livreur?.nom, l.motif, t(l.motif), l.description, t(l.description))).sort((x, y) => echeance(x, maintenant) - echeance(y, maintenant))
    : (tous ?? []).filter((l) => l.etape === onglet)
  const choisi = liste.find((l) => l.id === id) ?? liste[0] ?? null
  const ouvrir = (x: string | null) => regler((p) => (x ? p.set('id', x) : p.delete('id')))
  const acts = (
    <>
      {choisi && (
        <button type="button" className="btn secondary sm" onClick={() => pdfDossier(choisi)}>
          <Icone nom="file-down" taille={16} />
          <span>{t('Dossier en PDF')}</span>
        </button>
      )}
      <Link className="btn secondary sm" to={chemin('preuves')}>
        <Icone nom="camera" taille={16} />
        <span>{t('Preuves des missions')}</span>
      </Link>
    </>
  )
  const onglets = (
    <Choix
      forme="tabs"
      aria={t('Étapes des litiges')}
      actif={onglet}
      choisir={(o) =>
        regler((p) => {
          ;['id', 'q', 'f'].forEach((k) => p.delete(k))
          if (o === 'ouvert') p.delete('onglet')
          else p.set('onglet', o)
        })
      }
      items={ETAPES.map((e) => ({ id: e, t: t(TITRE_ETAPE[e]), n: tous ? tous.filter((l) => l.etape === e).length : null }))}
    />
  )
  const outils = tous && tous.length > 0 && (
    <div className="e7-outils">
      <Recherche q={q} setQ={setQ} placeholder={t('Dossier, commande, paquet, livreur…')} aria={t('Rechercher un litige')} />
      <Puces aria={t('Filtrer les litiges')} actif={filtre} choisir={setFiltre} items={FILTRES.map((x) => ({ id: x, t: TITRE_FILTRE[x], n: tous.filter((l) => FILTRE[x](l, maintenant)).length }))} />
      {global && (
        <p className="e7-portee">
          <Icone nom="layers" taille={14} />
          {t('Résultats sur tous les dossiers, toutes étapes confondues.')}
        </p>
      )}
      {global && <Compte n={liste.length} total={tous.length} />}
    </div>
  )
  const cartes = liste.map((l) => <CarteLitige key={l.id} l={l} on={choisi?.id === l.id} ouvrir={() => ouvrir(l.id)} global={global} />)
  const videOnglet = global ? (
    <AucunResultat effacer={effacer} texte={t('Aucun dossier ne correspond à la recherche ou à la puce choisie.')} />
  ) : (
    <Vide icone="scale" t={t(onglet === 'ouvert' ? 'Aucun litige ouvert' : onglet === 'examen' ? 'Aucun dossier en examen' : 'Aucune décision')} s={t('Des preuves complètes à chaque changement de main sont la meilleure défense : vérifiez les alertes de preuves.')}>
      <div className="btns ec-btns" style={{ maxWidth: 420, margin: '12px auto 0' }}>
        <Link className="btn secondary" to={chemin('preuves')}>
          <Icone nom="camera" taille={18} />
          <span>{t('Voir les preuves')}</span>
        </Link>
      </div>
    </Vide>
  )
  const detail = choisi && (
    <>
      <Heros l={choisi} />
      <Dossier l={choisi} />
      {choisi.etape === 'ouvert' && <Repondre key={choisi.id} l={choisi} nom={nom} />}
      {choisi.etape === 'examen' && <Examen key={choisi.id} l={choisi} />}
      {choisi.etape === 'decide' && <Decision key={choisi.id} l={choisi} />}
    </>
  )
  return (
    <Ecran route="litiges" actions={large ? acts : undefined}>
      <Px>
        <Tete
          route="litiges"
          titre={t('Litiges')}
          actes={acts}
        />
        <ErreurPx erreur={lecture.erreur} relire={lecture.relire} quoi="les litiges" />
        {!tous ? (
          !lecture.erreur && <Chargement />
        ) : tous.length === 0 ? (
          <>
            {onglets}
            <AucunLitige />
          </>
        ) : large ? (
          <>
            {onglets}
            <div className="g g12">
              <Col>
                <Panel titre={t('Dossiers')} icone="scale">
                  {outils}
                  {liste.length ? cartes : videOnglet}
                  <Hint icone="folder-open">{tf('Litige et dossier désignent le même objet. Un dossier n’est jamais supprimé : il reste consultable {j} jours après la décision.', { j: P.conservationJours })}</Hint>
                </Panel>
                <Etapes l={choisi} nom={nom} />
                <Effets l={choisi} nom={nom} />
              </Col>
              <Col>
                {choisi ? (
                  <div className="e7-col e7-dossier" data-dossier={choisi.id}>
                    {detail}
                  </div>
                ) : (
                  <Panel>
                    <Vide icone="list" t={t('Choisissez un dossier')} s={t('Son échéance, ses preuves et ce que vous pouvez faire s’affichent ici.')} />
                  </Panel>
                )}
              </Col>
            </div>
          </>
        ) : (
          <>
            {onglets}
            <div className="g">
              {outils}
              {liste.length ? cartes : <Panel>{videOnglet}</Panel>}
              {choisi && (
                <div className="e7-col e7-dossier" data-dossier={choisi.id}>
                  {detail}
                  <Effets l={choisi} nom={nom} />
                  <Etapes l={choisi} nom={nom} />
                </div>
              )}
            </div>
          </>
        )}
      </Px>
      {choisi && (
        <BarrePouce aria={t('Actions du dossier')}>
          {choisi.etape === 'ouvert' && preparer && (
            <a className="btn primary" href={'#reponse-' + choisi.id}>
              <Icone nom="reply" taille={18} />
              <span>{t('Répondre')}</span>
            </a>
          )}
          <button type="button" className="btn secondary" onClick={() => pdfDossier(choisi)}>
            <Icone nom="file-down" taille={18} />
            <span>{t('Dossier en PDF')}</span>
          </button>
        </BarrePouce>
      )}
    </Ecran>
  )
}

/** Le dossier en PDF (vrai PDF, texte) : propriétés, preuves, réponse, décision, journal ; montants selon le rôle. */
function usePdfDossier() {
  const { t, tf } = usePreferences()
  const d = useDates()
  const f = useF()
  const voir = useMontantsVisibles()
  const nom = useSession().entreprise?.nom ?? t('votre entreprise')
  const maintenant = useHorloge()
  return (l: Litige) => {
    const n = maintenant
    const q = (x: number) => d.quand(x, n)
    const L: LignePdf[] = [
      { texte: tf('Dossier de litige {id}', { id: l.id }), taille: 16, espace: 6 },
      { texte: `${nom} · ${t(TITRE_ETAPE[l.etape])} · ${tf('édité {q}', { q: q(n) })}`, taille: 9, espace: 10 },
      { texte: `${t('Commande')} : ${l.commande} · ${t('Paquet')} : ${l.paquetId} · ${l.missionId}` },
      { texte: `${t('Livreur')} : ${l.livreur?.nom ?? '—'}` },
      { texte: `${t('Ouvert')} : ${t(OUVERT_PAR[l.ouvertPar])} · ${q(l.ouvertLe)}` },
      { texte: `${t('Motif')} : ${t(l.motif)} — ${t(l.description)}` },
      { texte: `${t('Montant en jeu')} : ${voir && l.montantEnJeu !== null ? f(l.montantEnJeu) : t('Réservé au propriétaire et au comptable')}`, espace: 8 },
      { texte: t('Échéances'), taille: 12, espace: 4 },
      { texte: `${t('Répondre avant')} : ${q(l.repondreAvant)} · ${tf('BelivaY décide au plus tard {q}', { q: q(l.decisionAvant) })}`, espace: 8 },
      { texte: t('Preuves'), taille: 12, espace: 4 },
      ...l.preuves.map((p) => ({ texte: `• ${t(p.libelle)} — ${p.maillon} · ${t(p.par)} · ${q(p.le)}` })),
      ...(l.preuves.length ? [] : [{ texte: t('Aucune preuve jointe.') }]),
    ]
    if (l.reponse) L.push({ texte: t('Votre réponse'), taille: 12, espace: 4 }, { texte: `${t(GENRE[l.reponse.genre])} · ${t(l.reponse.par)} · ${q(l.reponse.le)}` }, { texte: t(l.reponse.texte) }, ...(l.reponse.piece ? [{ texte: `${t('Pièce jointe')} : ${t(l.reponse.piece)}` }] : []))
    l.complements.forEach((c) => L.push({ texte: `${t('Élément nouveau')} · ${t(c.par)} · ${q(c.le)} : ${c.texte}` }))
    if (l.decision) {
      const dec = l.decision
      L.push({ texte: t('Décision de BelivaY'), taille: 12, espace: 4 }, { texte: `${t(EN_TORT[dec.enTort])} · ${dec.par} · ${q(dec.le)}` }, { texte: `${t('Motif écrit')} : ${t(dec.motif)}` })
      if (dec.enTort === 'entreprise') dec.retenues.forEach((r) => L.push({ texte: `${t(r.libelle)} : ${voir && r.montant !== null ? f(-r.montant) : '—'}` }))
      L.push({ texte: `${t('Décision définitive')} : ${q(dec.definitiveLe)}` })
      if (l.recours) L.push({ texte: tf('Recours déposé {q}, examiné par {qui}', { q: q(l.recours.le), qui: l.recours.examinePar }) })
    }
    L.push({ texte: t('Journal du dossier'), taille: 12, espace: 4 }, ...[...l.journal].reverse().map((j) => ({ texte: `${q(j.le)} · ${t(j.quoi)} · ${t(j.par)}` })))
    L.push({ texte: tf('Photos en adresses signées, lecture seule ; aucun code n’est jamais affiché. Dossier conservé {j} jours.', { j: P.conservationJours }), taille: 8, espace: 8 })
    exporterPdf(`dossier-${l.id}.pdf`, L)
  }
}

/** Aucun dossier (état « aucun » du prototype). */
function AucunLitige() {
  const { t, tf } = usePreferences()
  return (
    <div className="g g21">
      <Panel>
        <Vide icone="scale" t={t('Aucun litige en cours')} s={tf('Un dossier apparaît ici dès qu’un client, un vendeur ou un gérant de relais met en cause un colis transporté par vos livreurs. Vous êtes prévenu dans le portail et par notification, avec {h} heures pour répondre.', { h: P.reponseH })}>
          <div className="btns ec-btns" style={{ maxWidth: 420, margin: '12px auto 0' }}>
            <Link className="btn secondary" to={chemin('preuves')}>
              <Icone nom="camera" taille={18} />
              <span>{t('Voir les preuves')}</span>
            </Link>
            <Link className="btn secondary" to={chemin('parametres') + '#notifications'}>
              <Icone nom="bell" taille={18} />
              <span>{t('Régler les alertes')}</span>
            </Link>
          </div>
        </Vide>
      </Panel>
      <Panel titre={t('Pour gagner un litige')} icone="shield-check">
        <Li icone="camera" ton="acc" t={t('Des preuves complètes à chaque étape')} s={t('Photos et scans à chaque changement de main : ils sont joints d’office au dossier.')} />
        <Li icone="timer" ton="or" t={tf('Une réponse dans les {h} heures', { h: P.reponseH })} s={t('Sans réponse, BelivaY arbitre sur les preuves disponibles.')} />
        <Li icone="ban" ton="red" t={t('Jamais d’arrangement en argent liquide')} s={t('Ni contact direct avec le client : tout se règle dans le dossier.')} />
      </Panel>
    </div>
  )
}

function CarteLitige({ l, on, ouvrir, global }: { l: Litige; on: boolean; ouvrir: () => void; global?: boolean }) {
  const { t } = usePreferences()
  const maintenant = useHorloge()
  const [lib, ton] = ST_ETAPE[l.etape]
  const temps =
    l.etape === 'ouvert' ? (
      <Rebours fin={l.repondreAvant} urgent={6 * HEURE} critique={HEURE} avant={t('Répondre sous') + ' '} echu={t('Échéance passée')} />
    ) : l.etape === 'examen' ? (
      <Rebours fin={l.decisionAvant} urgent={6 * HEURE} critique={HEURE} avant={t('Décision sous') + ' '} echu={t('Décision imminente')} />
    ) : recoursOuvert(l, maintenant)
          ? t('Recours possible une fois')
          : l.recours?.statut === 'en_cours'
            ? t('Recours en examen')
            : t('Décision définitive')
  return (
    <button type="button" className={'ec7-card' + (on ? ' ec7-sel' : '')} aria-pressed={on} onClick={ouvrir} data-litige={l.id}>
      <span className="row" style={{ justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
        <span className="kick">{t(l.motif)}</span>
        <St t={t(lib)} ton={ton} />
      </span>
      <span className="b8 t17 mt6 mono" style={{ display: 'block' }}>
        {l.id}
      </span>
      <span className="t13 c3 mt4" style={{ display: 'block' }}>
        {t('Commande')} <span className="mono">{l.commande}</span> · <span className="mono">{l.paquetId}</span>
      </span>
      <span className="row mt10" style={{ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <span className="t13 b7">
          {l.livreur?.nom ?? '—'}
          {global && <span className="c3"> · {t(TITRE_ETAPE[l.etape])}</span>}
        </span>
        {l.etape === 'decide' ? (
          <Pill ton="ink" sm icone="timer">
            {temps}
          </Pill>
        ) : (
          temps
        )}
      </span>
    </button>
  )
}

/** « 26:59:59 » : heures, minutes, secondes restantes (compte à rebours en direct du héros). */
const hms = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

/** Héros : compte à rebours (ouvert, en examen) ou décision (décidé). */
function Heros({ l }: { l: Litige }) {
  const { t, tf } = usePreferences()
  const d = useDates()
  const maintenant = useHorloge(1000)
  const voir = useMontantsVisibles()
  const proprio = usePeut(['proprietaire'])
  const ouverte = useRouteOuverte()
  if (l.etape === 'decide' && l.decision) {
    const dec = l.decision
    const total = dec.retenues.reduce((a, r) => a + (r.montant ?? 0), 0)
    const enTort = dec.enTort === 'entreprise'
    return (
      <div className="hero night" data-heros="decision">
        <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <span className="hk">{tf('Décision motivée · {x}', { x: t(EN_TORT[dec.enTort]) })}</span>
          <Pill ton="ink" sm icone="lock">
            {t('Fixé par BelivaY')}
          </Pill>
        </div>
        {enTort && voir ? <Gros n={total} /> : <div className="ht">{enTort ? t('Retenue décidée') : t('Aucune retenue')}</div>}
        <div className="hs">
          {enTort
            ? tf('Retenue sur le versement du vendredi qui suit la décision définitive ({q}) ; si elle le dépasse, le solde est reporté sur {n} vendredis au plus, jamais de caution.', { q: d.quand(dec.definitiveLe, maintenant), n: V.reportVendredis })
            : t('Aucune retenue ni effet sur le score pour votre entreprise.')}
        </div>
        {((enTort && ouverte('reglements')) || (proprio && recoursOuvert(l, maintenant))) && (
          <div className="btns ec-btns" style={{ marginTop: 14 }}>
            {enTort && ouverte('reglements') && (
              <Link className="btn secondary" to={chemin('reglements', { onglet: 'retenues' })}>
                <Icone nom="banknote" taille={18} />
                <span>{t('Voir la retenue')}</span>
              </Link>
            )}
            {proprio && recoursOuvert(l, maintenant) && (
              <a className="btn ghost" href={'#recours-' + l.id}>
                <Icone nom="undo-2" taille={18} />
                <span>{t('Aller au recours')}</span>
              </a>
            )}
          </div>
        )}
      </div>
    )
  }
  const ouvert = l.etape === 'ouvert'
  const fin = ouvert ? l.repondreAvant : l.decisionAvant
  const debut = ouvert ? l.ouvertLe : Math.min(l.reponse?.le ?? l.repondreAvant, l.repondreAvant)
  const reste = Math.min(1, Math.max(0, (fin - maintenant) / (fin - debut)))
  return (
    <div className="hero orange" role="timer" aria-live="off" data-heros="compte">
      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <span className="hk">{t(ouvert ? 'Temps pour répondre' : 'Décision de BelivaY attendue')}</span>
        <Pill ton="ink" sm icone="timer">
          {ouvert ? tf('Compte à rebours de {h} h', { h: P.reponseH }) : tf('Examen de {h} h au plus', { h: P.decisionH })}
        </Pill>
      </div>
      <div className="ec7-count">
        <span className="n num">{fin > maintenant ? hms(fin - maintenant) : t('Échu')}</span>
        {fin > maintenant && <span className="u">{t('restantes')}</span>}
      </div>
      <div className="hs">
        {ouvert ? (
          <>
            {t('Répondez avant')} <b>{d.quand(fin, maintenant)}</b>. {t('Sans réponse, BelivaY arbitre sur les preuves disponibles.')}
          </>
        ) : (
          <>
            {t('BelivaY décide au plus tard')} <b>{d.quand(fin, maintenant)}</b>. {t('Un élément nouveau peut encore compléter le dossier.')}
          </>
        )}
      </div>
      <div className="mt12">
        <Barre pct={reste * 100} />
      </div>
      <div className="row mt8 t12" style={{ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <span>{ouvert ? tf('Ouvert {q}', { q: d.quand(l.ouvertLe, maintenant) }) : tf('En examen depuis {q}', { q: d.quand(debut, maintenant) })}</span>
        <span>{tf('{e} écoulées sur {t}', { e: d.reste(Math.max(0, maintenant - debut)), t: d.reste(fin - debut) })}</span>
      </div>
    </div>
  )
}

/** Dossier : propriétés, preuves des autres parties et preuves du livreur jointes d'office. */
function Dossier({ l }: { l: Litige }) {
  const { t, tf } = usePreferences()
  const d = useDates()
  const f = useF()
  const maintenant = useHorloge()
  const voir = useMontantsVisibles()
  const pdfDossier = usePdfDossier()
  const [lib, ton] = ST_ETAPE[l.etape]
  const duLivreur = l.preuves.filter((p) => l.livreur && p.par === l.livreur.nom)
  const autres = l.preuves.filter((p) => !duLivreur.includes(p))
  const ligne = (p: PreuveDossier, i: number) => (
    <li key={i}>
      <span className="e7-preuve-ic">
        <Icone nom={ICONE_PREUVE[p.genre]} taille={18} />
      </span>
      <span className="grow">
        <b>{t(p.libelle)}</b>
        <small>{`${p.maillon} · ${t(p.par)} · ${d.heure(p.le)}`}</small>
      </span>
    </li>
  )
  return (
    <Panel titre={tf('Dossier {id}', { id: l.id })} icone="folder-open" droite={<St t={t(lib)} ton={ton} />}>
      <Props
        paires={[
          [t('Commande'), <span className="mono">{l.commande}</span>],
          [
            t('Paquet'),
            <>
              <Link className="cor mono" to={chemin('paquet', { id: l.paquetId })}>
                {l.paquetId}
              </Link>{' '}
              · <span className="mono">{l.missionId}</span>
            </>,
          ],
          [t('Livreur'), l.livreur ? <Link to={chemin('livreur', { id: l.livreur.id })}>{l.livreur.nom}</Link> : '—'],
          [t('Ouvert'), `${t(OUVERT_PAR[l.ouvertPar])} · ${d.quand(l.ouvertLe, maintenant)}`],
          [
            t('Motif'),
            <>
              <b>{t(l.motif)}</b> : {t(l.description)}
            </>,
          ],
          [t('Montant en jeu'), voir && l.montantEnJeu !== null ? f(l.montantEnJeu) : t('Réservé au propriétaire et au comptable')],
        ]}
      />
      <div className="g g2" style={{ marginTop: 14 }}>
        <div>
          <div className="ec7-grp">{t('Preuves des autres parties')}</div>
          {autres.length ? <ul className="e7-preuves e7-preuves-1">{autres.map(ligne)}</ul> : <div className="t13 c3 mt6">{t('Aucune pièce d’une autre partie pour l’instant.')}</div>}
        </div>
        <div>
          <div className="ec7-grp">
            {t('Preuves automatiques du livreur')}{' '}
            <Pill ton="green" sm>
              {t('jointes sans action de votre part')}
            </Pill>
          </div>
          {duLivreur.length ? <ul className="e7-preuves e7-preuves-1">{duLivreur.map(ligne)}</ul> : <div className="t13 c3 mt6">{t('Aucune preuve du livreur sur ce dossier.')}</div>}
        </div>
      </div>
      <div className="row mt8" style={{ justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <span className="t13 c3 grow">{tf('Photos en adresses signées, lecture seule ; aucun code n’est jamais affiché. Dossier conservé {j} jours.', { j: P.conservationJours })}</span>
        <span className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn ghost sm" onClick={() => pdfDossier(l)} data-pdf-dossier>
            <Icone nom="file-down" taille={16} />
            <span>{t('Dossier en PDF')}</span>
          </button>
          <Link className="btn ghost sm" to={chemin('preuves', { paquet: l.paquetId })}>
            <Icone nom="camera" taille={16} />
            <span>{t('Toute la chaîne')}</span>
          </Link>
        </span>
      </div>
    </Panel>
  )
}

function useRefus() {
  const { t, tf } = usePreferences()
  return (r: RefusLitige, genre?: GenreReponse) =>
    ({
      texte: genre === 'arrangement' ? tf('Un arrangement fait au moins {n} caractères, et jamais en espèces.', { n: P.arrangementMin }) : t('Expliquez votre contestation : ce que montrent vos preuves.'),
      delai: t('L’échéance est passée : BelivaY arbitre sur les preuves disponibles.'),
      etape: t('Ce dossier a changé d’étape : il vient d’être mis à jour.'),
      recours_utilise: t('Le recours a déjà été utilisé pour ce dossier.'),
      element: t('Ajoutez l’élément nouveau qui justifie votre demande.'),
    })[r]
}

/** Zone de texte du prototype (C.fld area). */
function Champ({ id, label, valeur, changer, aide, err, max = 1500 }: { id: string; label: ReactNode; valeur: string; changer: (v: string) => void; aide?: ReactNode; err?: boolean; max?: number }) {
  return (
    <div className="fld">
      <label htmlFor={id}>{label}</label>
      <textarea id={id} className={'inp area e7-ta' + (err ? ' err' : '')} rows={4} value={valeur} onChange={(e) => changer(e.target.value)} maxLength={max} aria-describedby={aide ? id + '-aide' : undefined} />
      {aide && (
        <div id={id + '-aide'} className={'hint' + (err ? ' err' : '')}>
          {aide}
        </div>
      )}
    </div>
  )
}

/** Votre réponse (dossier ouvert). */
function Repondre({ l, nom }: { l: Litige; nom: string }) {
  const { t, tf } = usePreferences()
  const d = useDates()
  const maintenant = useHorloge()
  const envoyer = usePeut(['proprietaire'])
  const preparer = usePeut(['proprietaire', 'repartiteur'])
  const plafond = useSession().entreprise?.plafond ?? null
  const f = useF()
  const voir = useMontantsVisibles()
  const enLigne = useEnLigne()
  const refus = useRefus()
  const { annoncer, vue } = useAnnonce()
  const b = l.brouillon
  const [genre, setGenre] = useState<GenreReponse>(b?.genre ?? 'contester')
  const [texte, setTexte] = useState(b?.texte ?? '')
  const [joindre, setJoindre] = useState(!!b?.piece)
  const [envoi, setEnvoi] = useState(false)
  const piece = joindre && l.livreur ? `Déclaration du livreur (${l.livreur.nom})` : null
  const court = genre === 'arrangement' && texte.trim().length < P.arrangementMin
  const interdit = (
    <Note ton="red" icone="ban">
      <b>{t('Interdit')}</b> : {t('contacter le client pour régler le litige hors de la plateforme ; proposer un arrangement en argent liquide.')}
    </Note>
  )
  const delai = (
    <Limite icone="timer" titre={tf('Délai de réponse : {h} h', { h: P.reponseH })} texte={<Rebours fin={l.repondreAvant} urgent={6 * HEURE} critique={HEURE} echu={t('Échéance passée')} />} atteinte={maintenant >= l.repondreAvant ? t('Échéance passée : BelivaY arbitre sur les preuves disponibles ; aucune réponse n’est plus reçue.') : undefined} />
  )
  if (!preparer)
    return (
      <Panel titre={t('Votre réponse')} icone="reply" id={'reponse-' + l.id}>
        <div className="t13 c3" style={{ margin: '-4px 0 6px' }}>
          {t('Le comptable lit les dossiers ; la réponse est préparée par le répartiteur et envoyée par le propriétaire.')}
        </div>
        {delai}
        {b && <Li icone="file-pen" ton="ink" t={tf('Réponse préparée par {par}', { par: b.par })} s={`${d.quand(b.le, maintenant)} · ${t(GENRE[b.genre])}`} />}
        <Interdit roles={['proprietaire', 'repartiteur']} quoi="Préparer ou envoyer une réponse" />
        {interdit}
      </Panel>
    )
  // « Accepter » engage une retenue sur un versement : envoyé seulement avec le réseau. Le reste (brouillon, contestation,
  // arrangement) est gardé sur l'appareil hors connexion et part au retour du réseau (refusé alors si l'échéance est passée).
  const argent = genre === 'accepter'
  const echu = maintenant >= l.repondreAvant
  const agir = async (definitif: boolean) => {
    if (definitif && argent && !enLigne) return annoncer(false, t('Accepter engage une retenue sur vos versements : cet envoi ne se garde pas hors connexion. Il part dès que le réseau revient.'))
    setEnvoi(true)
    const x = definitif
      ? await geste('Envoyer la réponse au litige', (s) => s.litiges.repondre(l.id, genre, texte, piece), l.id)
      : await geste(envoyer ? 'Enregistrer le brouillon du litige' : 'Préparer la réponse au litige', (s) => s.litiges.preparer(l.id, genre, texte, piece), l.id)
    setEnvoi(false)
    if (x.etat === 'en_file') return annoncer(true, t('Gardée sur cet appareil : elle sera envoyée au retour du réseau. Après l’échéance, elle serait refusée.'))
    const r = x.r
    if (r.ok) annoncer(true, definitif ? t('Réponse envoyée : le dossier passe en examen.') : envoyer ? t('Brouillon enregistré.') : t('Réponse préparée : le propriétaire la relit et l’envoie.'))
    else annoncer(false, refus(r.raison, genre))
  }
  const SOUS: Record<GenreReponse, string> = {
    accepter:
      voir && plafond !== null
        ? tf('La valeur nette payée au vendeur est retenue sur un prochain versement, jamais au-delà de votre plafond de {m}.', { m: f(plafond) })
        : t('BelivaY décide ensuite de la retenue, jamais au-delà du plafond de votre palier.'),
    contester: t('Les preuves automatiques du livreur sont déjà jointes ; ajoutez ce qu’elles montrent.'),
    arrangement: tf('{n} caractères au moins ; jamais d’argent liquide, jamais de contact direct avec le client.', { n: P.arrangementMin }),
  }
  return (
    <Panel titre={t('Votre réponse')} icone="reply" id={'reponse-' + l.id}>
      <div className="t13 c3" style={{ margin: '-4px 0 6px' }}>
        {tf('Le répartiteur prépare la réponse, le propriétaire l’envoie au nom de {n}. Le comptable lit le dossier sans pouvoir répondre.', { n: nom })}
      </div>
      {delai}
      {b && (
        <Note ton="acc" icone="file-pen">
          {tf('Préparée par {par} ({q}). Relisez-la, puis envoyez-la.', { par: b.par, q: d.quand(b.le, maintenant) })}
        </Note>
      )}
      <div role="radiogroup" aria-label={t('Votre réponse')}>
        {(Object.keys(GENRE) as GenreReponse[]).map((g) => (
          <button key={g} type="button" role="radio" aria-checked={genre === g} className={'radio' + (genre === g ? ' on' : '')} onClick={() => setGenre(g)}>
            <span className="rd"></span>
            <span className="grow">
              <span className="rt" style={{ display: 'block' }}>
                {t(GENRE[g])}
              </span>
              <span className="rs" style={{ display: 'block' }}>
                {SOUS[g]}
              </span>
            </span>
          </button>
        ))}
      </div>
      <Champ
        id={'rep-' + l.id}
        label={genre === 'accepter' ? t('Commentaire (facultatif)') : genre === 'arrangement' ? tf('Votre proposition ({n} caractères au moins)', { n: P.arrangementMin }) : t('Ce que montrent vos preuves')}
        valeur={texte}
        changer={setTexte}
        err={court && !!texte}
        aide={genre === 'arrangement' ? tf('{n} / {min} caractères au moins · jamais en espèces', { n: texte.trim().length, min: P.arrangementMin }) : tf('{n} caractères · visible par la médiation BelivaY', { n: texte.trim().length })}
      />
      {l.livreur && (
        <label className="e7-coche">
          <input type="checkbox" checked={joindre} onChange={(e) => setJoindre(e.target.checked)} />
          <span>{tf('Joindre la déclaration du livreur ({nom}), horodatée par BelivaY', { nom: l.livreur.nom })}</span>
        </label>
      )}
      {genre === 'arrangement' && <Limite icone="handshake" titre={tf('Arrangement : {n} caractères au moins', { n: P.arrangementMin })} texte={tf('l’autre partie répond sous {j} jours ; sans réponse, BelivaY décide', { j: P.arrangementReponseJ })} atteinte={court && texte ? tf('Encore {n} caractère(s) pour pouvoir l’envoyer.', { n: P.arrangementMin - texte.trim().length }) : undefined} />}
      {argent && <Limite icone="shield" titre={t('Plafond de la retenue')} texte={voir && plafond !== null ? tf('{m} au plus pour l’article (palier) ; livraison remboursée et trajet retour en plus', { m: f(plafond) }) : t('plafond de votre palier pour l’article ; livraison remboursée et trajet retour en plus')} />}
      <Limite icone="undo-2" titre={t('Contestation')} texte={tf('une réponse avant l’échéance, puis un recours une seule fois sous {h} h après la décision', { h: P.recoursH })} />
      {!enLigne && <p className={'e7-aide' + (argent ? ' rouge' : '')}>{argent ? t('Hors connexion : « Accepter » engage une retenue, il ne se garde pas hors connexion. Le brouillon, lui, est gardé.') : t('Hors connexion : votre réponse sera gardée sur cet appareil et envoyée au retour du réseau.')}</p>}
      <div className="btns ec-btns">
        <button type="button" className={'btn ' + (envoyer ? 'secondary' : 'primary')} disabled={envoi || echu} onClick={() => void agir(false)}>
          <Icone nom="file-pen" taille={18} />
          <span>{envoyer ? t('Enregistrer le brouillon') : t('Préparer pour le propriétaire')}</span>
        </button>
        {envoyer && (
          <button type="button" className="btn primary" disabled={envoi || echu || (argent && !enLigne)} onClick={() => void agir(true)}>
            <Icone nom="send" taille={18} />
            <span>{t('Envoyer la réponse')}</span>
          </button>
        )}
      </div>
      {!envoyer && <Interdit roles={['proprietaire']} quoi="Envoyer la réponse" />}
      {vue}
      {interdit}
    </Panel>
  )
}

/** En examen : la réponse envoyée, les preuves côte à côte, compléter le dossier. */
function Examen({ l }: { l: Litige }) {
  const { t, tf } = usePreferences()
  const d = useDates()
  const maintenant = useHorloge()
  const peut = usePeut(['proprietaire', 'repartiteur'])
  const enLigne = useEnLigne()
  const refus = useRefus()
  const { annoncer, vue } = useAnnonce()
  const [texte, setTexte] = useState('')
  const r = l.reponse
  const duLivreur = l.preuves.filter((p) => l.livreur && p.par === l.livreur.nom)
  const autre = l.preuves.filter((p) => !duLivreur.includes(p)).at(-1)
  const livreur = duLivreur.at(-1)
  return (
    <>
      <Panel titre={r ? t('Votre réponse · envoyée') : t('Votre réponse')} icone="reply">
        {r ? (
          <>
            <Li icone="send" ton="acc" t={t(GENRE[r.genre])} s={`${t(r.par)} · ${d.quand(r.le, maintenant)}${r.le <= l.repondreAvant ? ' · ' + t('dans le délai') : ''}`} droite={<St t={t('Reçue')} ton="green" />} />
            <Note ton="ink" icone="quote">
              {t(r.texte)}
              {r.piece && (
                <div className="mt6">
                  <Pill ton="ink" sm icone="paperclip">
                    {t(r.piece)}
                  </Pill>
                </div>
              )}
            </Note>
          </>
        ) : (
          <div className="t13 c3">{t('Aucune réponse avant l’échéance : BelivaY arbitre sur les preuves disponibles.')}</div>
        )}
        {l.arrangement && (
          <Hint icone="handshake">
            {l.arrangement.statut === 'attente'
              ? tf('Arrangement proposé : réponse de l’autre partie attendue avant {q} ; sans réponse, le dossier revient en examen.', { q: d.quand(l.arrangement.reponseAvant, maintenant) })
              : l.arrangement.statut === 'sans_reponse'
                ? t('Arrangement resté sans réponse : le dossier est revenu en examen.')
                : t(l.arrangement.statut === 'accepte' ? 'Arrangement accepté.' : 'Arrangement refusé : BelivaY décide.')}
          </Hint>
        )}
      </Panel>
      {autre && livreur && (
        <Panel titre={t('Preuves côte à côte')} icone="columns-2">
          <div className="g g2" style={{ marginTop: 0 }}>
            <Li icone={ICONE_PREUVE[livreur.genre]} ton="green" t={t(livreur.libelle)} s={`${d.heure(livreur.le)} · ${t(livreur.par)}`} />
            <Li icone={ICONE_PREUVE[autre.genre]} ton="amber" t={t(autre.libelle)} s={`${d.heure(autre.le)} · ${t(autre.par)}`} />
          </div>
          <Note ton="acc" icone="scale">
            {t('BelivaY voit les preuves côte à côte ; la preuve horodatée la plus proche de l’événement prévaut.')}
          </Note>
        </Panel>
      )}
      {(peut || l.complements.length > 0) && (
        <Panel titre={t('Compléter le dossier')} icone="file-plus-2">
          {l.complements.map((c, i) => (
            <Li key={i} icone="file-plus-2" ton="ink" t={t('Élément nouveau')} s={<>{`${t(c.par)} · ${d.quand(c.le, maintenant)} · `}<TexteTraduisible texte={c.texte} /></>} />
          ))}
          {peut && (
            <>
              <Limite icone="timer" titre={tf('Examen de {h} h au plus', { h: P.decisionH })} texte={<Rebours fin={l.decisionAvant} urgent={6 * HEURE} critique={HEURE} avant={t('décision sous') + ' '} echu={t('Décision imminente')} />} />
              <Champ id={'compl-' + l.id} label={t('Élément nouveau')} valeur={texte} changer={setTexte} max={1000} aide={tf('Un élément nouveau seulement ; aucune photo transmise par messagerie ni retouchée. {n} / {max} caractères.', { n: texte.length, max: 1000 })} />
              {!enLigne && <p className="e7-aide">{t('Hors connexion : l’élément sera gardé sur cet appareil et ajouté au dossier au retour du réseau.')}</p>}
              <div className="btns ec-btns">
                <button
                  type="button"
                  className="btn primary"
                  onClick={async () => {
                    const g = await geste('Compléter le dossier de litige', (s) => s.litiges.completer(l.id, texte), l.id)
                    if (g.etat === 'en_file') return (setTexte(''), annoncer(true, t('Gardé sur cet appareil : l’élément sera ajouté au dossier au retour du réseau.')))
                    const x = g.r
                    if (x.ok) (setTexte(''), annoncer(true, t('Élément ajouté au dossier.')))
                    else annoncer(false, refus(x.raison))
                  }}
                >
                  <Icone nom="send" taille={18} />
                  <span>{t('Ajouter au dossier')}</span>
                </button>
              </div>
            </>
          )}
          {vue}
        </Panel>
      )}
    </>
  )
}

/** Décision de BelivaY : motif, retenues (DED-10), effet sur le score, recours une fois. */
function Decision({ l }: { l: Litige }) {
  const { t, tf } = usePreferences()
  const d = useDates()
  const f = useF()
  const maintenant = useHorloge()
  const voir = useMontantsVisibles()
  const proprio = usePeut(['proprietaire'])
  const ouverte = useRouteOuverte()
  const enLigne = useEnLigne()
  const refus = useRefus()
  const { annoncer, vue } = useAnnonce()
  const [element, setElement] = useState('')
  const dec = l.decision!
  const finRecours = dec.le + P.recoursH * HEURE
  const ouvert = recoursOuvert(l, maintenant)
  const total = dec.retenues.reduce((a, r) => a + (r.montant ?? 0), 0)
  return (
    <Panel titre={t('Décision de BelivaY')} icone="gavel">
      <Props
        paires={[
          [t('Décidé par'), `${dec.par} · ${d.quand(dec.le, maintenant)}`],
          [t('Décision'), <b>{t(EN_TORT[dec.enTort])}</b>],
          [t('Motif écrit'), t(dec.motif)],
          [t('Effet sur le Trust Score'), dec.effetTrust ? tf('{effet}, à la décision définitive.', { effet: t(dec.effetTrust) }) : t('Aucun')],
          [t('Recours'), ouvert ? tf('une seule fois, avant {q}, avec un élément nouveau', { q: d.quand(finRecours, maintenant) }) : l.recours ? tf('déposé {q}', { q: d.quand(l.recours.le, maintenant) }) : t('plus possible : décision définitive')],
        ]}
      />
      {dec.enTort === 'entreprise' && (
        <div className="mt10">
          {dec.retenues.map((r) => (
            <Kv key={r.libelle} k={t(r.libelle)} v={voir && r.montant !== null ? f(-r.montant) : '—'} />
          ))}
          {voir && <Kv k={<b>{t('Retenue totale')}</b>} v={f(-total)} cls="cr" />}
        </div>
      )}
      {l.recours ? (
        <Note ton="acc" icone="scale">
          {tf('Recours déposé {q}, examiné par {qui} : la retenue est suspendue jusqu’à sa réponse.', { q: d.quand(l.recours.le, maintenant), qui: l.recours.examinePar })}
        </Note>
      ) : ouvert ? (
        proprio ? (
          <div id={'recours-' + l.id}>
            <Limite icone="undo-2" titre={tf('Recours : une seule fois, sous {h} h', { h: P.recoursH })} texte={<Rebours fin={finRecours} urgent={6 * HEURE} critique={HEURE} echu={t('Délai de recours passé')} />} />
            <Champ id={'recours-t-' + l.id} label={tf('Faire un recours (une fois, avant {q}) : l’élément nouveau', { q: d.quand(finRecours, maintenant) })} valeur={element} changer={setElement} max={1000} aide={t('Le recours est examiné par une autre personne que l’auteur de la décision ; la retenue attend sa réponse.')} />
            {!enLigne && <p className="e7-aide rouge">{t('Hors connexion : le recours ne se fait qu’une fois, il ne se garde pas hors connexion. Il part dès que le réseau revient.')}</p>}
          </div>
        ) : (
          <>
            <Hint icone="lock">{tf('Recours possible jusqu’au {q}, par le propriétaire.', { q: d.quand(finRecours, maintenant) })}</Hint>
            <Interdit roles={['proprietaire']} quoi="Faire un recours" />
          </>
        )
      ) : (
        <Limite icone="undo-2" titre={t('Recours')} atteinte={t('Décision définitive : le recours n’est plus possible.')} />
      )}
      {((dec.enTort === 'entreprise' && ouverte('reglements')) || (ouvert && proprio)) && (
        <div className="btns ec-btns">
          {dec.enTort === 'entreprise' && ouverte('reglements') && (
            <Link className="btn secondary" to={chemin('reglements', { onglet: 'retenues' })}>
              <Icone nom="banknote" taille={18} />
              <span>{t('Voir la retenue dans Règlements')}</span>
            </Link>
          )}
          {ouvert && proprio && (
            <button
              type="button"
              className="btn primary"
              disabled={!enLigne}
              onClick={async () => {
                const x = await source.litiges.recours(l.id, element)
                if (x.ok) annoncer(true, t('Recours déposé : la retenue est suspendue.'))
                else annoncer(false, refus(x.raison))
              }}
            >
              <Icone nom="undo-2" taille={18} />
              <span>{t('Faire un recours')}</span>
            </button>
          )}
        </div>
      )}
      {vue}
    </Panel>
  )
}

/** Étapes du dossier (frise datée) et son journal. */
function Etapes({ l, nom }: { l: Litige | null; nom: string }) {
  const { t, tf } = usePreferences()
  const d = useDates()
  const maintenant = useHorloge()
  const ouverte = useRouteOuverte()
  const q = (x: number) => d.quand(x, maintenant)
  const e = l?.etape
  const recOuvert = !!l && recoursOuvert(l, maintenant)
  const recEnCours = l?.recours?.statut === 'en_cours'
  type St = 'done' | 'cur' | ''
  const items: { t: string; d: string; st: St }[] = [
    { t: l ? t(OUVERT_PAR[l.ouvertPar]) : t('Ouverture du dossier'), d: l ? `${q(l.ouvertLe)} · ${t('preuves de la chaîne jointes d’office')}` : t('Preuves de la chaîne jointes d’office'), st: l ? 'done' : '' },
    {
      t: tf('Réponse de {n}', { n: nom }),
      d: l?.reponse ? `${q(l.reponse.le)} · ${t(GENRE[l.reponse.genre]).toLowerCase()}` : l && e === 'ouvert' ? tf('{h} h, jusqu’au {q}', { h: P.reponseH, q: q(l.repondreAvant) }) : l ? t('aucune réponse avant l’échéance') : tf('Sous {h} h : accepter, contester, proposer un arrangement', { h: P.reponseH }),
      st: !l ? '' : e === 'ouvert' ? 'cur' : 'done',
    },
    {
      t: t('Examen par BelivaY'),
      d: l?.decision ? `${q(l.decision.le)} · ${l.decision.par}` : l && e === 'examen' ? tf('décision au plus tard {q}', { q: q(l.decisionAvant) }) : tf('{h} h au plus après l’échéance', { h: P.decisionH }),
      st: e === 'decide' ? 'done' : e === 'examen' ? 'cur' : '',
    },
    { t: t('Décision motivée'), d: l?.decision ? t(EN_TORT[l.decision.enTort]) : t('une partie en tort, ou aucune ; motif écrit'), st: e === 'decide' ? 'done' : '' },
    {
      t: t('Recours une fois'),
      d: l?.recours ? tf('déposé {q}, examiné par {qui}', { q: q(l.recours.le), qui: l.recours.examinePar }) : recOuvert && l?.decision ? tf('possible jusqu’au {q} : un élément nouveau est exigé', { q: q(l.decision.le + P.recoursH * HEURE) }) : tf('sous {h} h, examiné par une autre personne', { h: P.recoursH }),
      st: recEnCours || recOuvert ? 'cur' : l?.recours ? 'done' : '',
    },
    { t: t('Décision définitive'), d: l?.decision ? `${q(l.decision.definitiveLe)} · ${t('retenue et Trust Score appliqués seulement alors')}` : t('Retenue et Trust Score appliqués seulement alors'), st: e === 'decide' && !recOuvert && !recEnCours ? 'done' : '' },
  ]
  return (
    <Panel titre={t('Étapes du dossier')} icone="list-checks">
      <Frise items={items} />
      {l && (
        <Plus libelle={t('Journal du dossier')} icone="history" plat>
          <ul className="e7-journal">
            {[...l.journal].reverse().map((j, i) => (
              <li key={i}>
                <span className="num">{q(j.le)}</span>
                <span>{`${t(j.quoi)} · ${t(j.par)}`}</span>
              </li>
            ))}
          </ul>
          {ouverte('messages') && (
            <Link className="btn ghost sm mt10" to={chemin('messages', { sheet: 'nouveau', sujet: 'litige', ref: l.id })}>
              <Icone nom="message-circle" taille={16} />
              <span>{t('Écrire au support à propos de ce dossier')}</span>
            </Link>
          )}
        </Plus>
      )}
    </Panel>
  )
}

/** Ce que ce dossier change : versement, Trust Score, plafond, responsabilité. */
function Effets({ l, nom }: { l: Litige | null; nom: string }) {
  const { t, tf } = usePreferences()
  const d = useDates()
  const f = useF()
  const maintenant = useHorloge()
  const voir = useMontantsVisibles()
  const plafond = useSession().entreprise?.plafond ?? null
  const resp = <Kv k={t('Responsabilité')} v={tf('{n}, même si le livreur quitte l’entreprise', { n: nom })} />
  const dec = l?.etape === 'decide' ? l.decision : null
  return (
    <Panel titre={t('Ce que ce dossier change')} icone="info">
      {!dec ? (
        <>
          <Kv k={t('Versement')} v={t('la mission attend la fin du litige ; rien n’est retenu tant qu’il est en cours')} />
          <Kv k={t('Trust Score')} v={t('aucun effet en cours ; un litige gagné n’a aucun effet')} />
          <Kv k={t('Décision défavorable')} v={voir && plafond !== null ? tf('retenue du net payé au vendeur, plafonnée à {m}', { m: f(plafond) }) : t('retenue du net payé au vendeur, plafonnée par votre palier')} />
          {resp}
        </>
      ) : dec.enTort === 'entreprise' ? (
        <>
          <Kv k={t('Versement')} v={tf('retenue au vendredi qui suit la décision définitive ({q})', { q: d.quand(dec.definitiveLe, maintenant) })} />
          <Kv k={t('Plafond')} v={t('il limite la valeur de l’article ; livraison remboursée et trajet retour restent dus')} />
          <Kv k={t('Trust Score')} v={t('l’événement compte à la décision définitive seulement')} />
          {resp}
        </>
      ) : (
        <>
          <Kv k={t('Versement')} v={t('aucune retenue')} />
          <Kv k={t('Trust Score')} v={t('aucun effet')} />
          {resp}
        </>
      )}
    </Panel>
  )
}
