// ENT-P18 · Règlements, repris sur le prototype (route('reglements') ; domaine src/donnees/domaines/reglements.ts) :
// versement automatique chaque vendredi avant midi de ce qui est validé au plus tard le jeudi 23 h 59, sans demande,
// sans frais, sans minimum, jamais anticipé ni en espèces. Blocs dans l'ordre du prototype : bandeaux (moyen en
// revue, solde reporté, versement refusé), g21 [héros nuit du vendredi (montant = prestations validées − retenues
// définitives, jamais saisi ; m4) + quatre indicateurs | Moyen de règlement + Chaque vendredi], onglets À venir ·
// Historique · Retenues (tableaux), aide. Moyen : changer = propriétaire, code SMS, versements bloqués et revue humaine
// (ENT-ARG-03). Une retenue n'existe qu'avec son dossier (ENT-P18R-04). Propriétaire et comptable (fiche de la route).
// Enrichissements (ENRICHISSEMENTS.md P18) : compte à rebours en direct vers le versement du vendredi (et la clôture du
// jeudi) ; montants masqués au toucher (préférence « solde masqué », comme le solde du client ; masqués d'office pour
// un rôle sans montants) ; filtre par période (?p=) et recherche (?q=) sur les trois onglets ; exports CSV et PDF de
// l'onglet affiché ; ce que le comptable ne peut pas faire, expliqué. Changer le moyen de règlement touche à l'argent :
// jamais gardé hors connexion.
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Feuille, useFeuille } from '@client/composants/Feuille'
import { Icone } from '../../composants/Icone'
import { AucunResultat, Banniere, BarrePouce, Choix, type Colonne, Compte, correspond, exporterCsv, exporterPdf, Exports, Frise, Hint, Interdit, Kpi, Li, Note, Panel, Pill, Puces, Px, Rebours, Recherche, St, Table, Tete, type Ton, useLarge, Vide } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import type { Prestation, RefusMoyen, Retenue, Versement } from '../../donnees/domaines/reglements'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { lireVersements } from '../../calculs/ent07'
import { usePreferences } from '../../preferences'
import { useHorloge, useMontantsVisibles, usePeut, useSession } from '../../session'
import { Chargement, useAnnonce, useDates, useEnLigne, useF, useOnglet } from './commun'
import { Col, ErreurPx, Gros, LECTURE_APRES_FIN_J, M4 } from './px'
import { Ecran } from '../../composants/coque'
import { HEURE, JOUR, jourDe } from '../../calculs/temps'

const V = lireVersements()
const ONGLETS = ['a_venir', 'historique', 'retenues'] as const
const STATUT_PRESTATION: Record<Prestation['statut'], [Ton, string]> = { validee: ['green', 'Validée'], en_revue: ['amber', 'En revue'], non_payee: ['red', 'Non payée'] }
const STATUT_RETENUE: Record<Retenue['statut'], [Ton, string]> = { en_attente: ['amber', 'Délai de recours en cours'], definitive: ['red', 'Définitive'], suspendue: ['ink', 'Suspendue par un recours'] }
const STATUT_VERSEMENT: Record<Versement['statut'], [Ton, string]> = { verse: ['green', 'Confirmé par l’opérateur'], refuse: ['red', 'Refusé par l’opérateur'], reporte: ['amber', 'Reporté'] }
const operateur = (o: 'MTN' | 'Orange') => (o === 'MTN' ? 'MTN Mobile Money' : 'Orange Money')

// Filtre par période (?p=), sur la date de la ligne (prestation, versement, décision de la retenue).
const PERIODES = ['tout', 'jour', 'semaine', 'mois'] as const
type Periode = (typeof PERIODES)[number]
const TITRE_PERIODE: Record<Periode, string> = { tout: 'Toute la période', jour: 'Aujourd’hui', semaine: '7 derniers jours', mois: 'Ce mois' }
const dansPeriode = (p: Periode, x: number, n: number) => (p === 'tout' ? true : p === 'jour' ? jourDe(x) === jourDe(n) : p === 'semaine' ? x > n - 7 * JOUR && x <= n + 7 * JOUR : jourDe(x).slice(0, 7) === jourDe(n).slice(0, 7))

/** Montants des règlements : masqués au toucher (préférence partagée « solde masqué ») ou pour un rôle sans montants. */
function useMasque() {
  const { soldeMasque, setSoldeMasque } = usePreferences()
  const f = useF()
  const voir = useMontantsVisibles()
  const masque = soldeMasque || !voir
  return { masque, voir, basculer: () => voir && setSoldeMasque(!soldeMasque), f: (n: number, signe?: boolean) => (masque ? '•••• F' : f(n, signe)) }
}

/** Bouton œil : masquer ou afficher les montants (44 px). */
function BoutonMasque({ className = 'btn ghost sm' }: { className?: string }) {
  const { t } = usePreferences()
  const { masque, voir, basculer } = useMasque()
  if (!voir) return null
  return (
    <button type="button" className={className + ' e7-oeil'} aria-pressed={masque} onClick={basculer}>
      <Icone nom={masque ? 'eye' : 'eye-off'} taille={16} />
      <span>{masque ? t('Afficher les montants') : t('Masquer les montants')}</span>
    </button>
  )
}

export default function Reglements() {
  const { t, tf } = usePreferences()
  const d = useDates()
  const { f, masque, voir, basculer } = useMasque()
  const fBrut = useF()
  const large = useLarge()
  const maintenant = useHorloge()
  const nom = useSession().entreprise?.nom ?? t('votre entreprise')
  const prochain = useLecture(() => source.reglements.prochain(), [])
  const historique = useLecture(() => source.reglements.historique(), [])
  const indic = useLecture(() => source.reglements.indicateurs(), [])
  const moyen = useLecture(() => source.reglements.moyen(), [])
  const [onglet, choisir] = useOnglet(ONGLETS, 'a_venir')
  const feuille = useFeuille('moyen')
  const proprio = usePeut(['proprietaire'])
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const pp = params.get('p') as Periode | null
  const periode: Periode = pp && PERIODES.includes(pp) ? pp : 'tout'
  const regler = (cle: string, val: string, defaut = '') => {
    const p = new URLSearchParams(window.location.search) // l’adresse du moment : les mises à jour du routeur arrivent en transition
    if (val === defaut) p.delete(cle)
    else p.set(cle, val)
    setParams(p, { replace: true })
  }
  const setQ = (x: string) => regler('q', x)
  const setPeriode = (x: Periode) => regler('p', x, 'tout')
  const effacer = () => {
    const p = new URLSearchParams(window.location.search) // l’adresse du moment : les mises à jour du routeur arrivent en transition
    p.delete('q')
    p.delete('p')
    setParams(p, { replace: true })
  }
  const v = prochain.donnees
  const m = moyen.donnees
  const h = historique.donnees
  const erreur = prochain.erreur ?? historique.erreur ?? indic.erreur ?? moyen.erreur
  const relire = () => (prochain.relire(), historique.relire(), indic.relire(), moyen.relire())
  const refuse = h?.find((x) => x.statut === 'refuse' && x === h[0])
  const enRevue = v ? v.prestations.filter((p) => p.statut === 'en_revue') : []
  const enRevueMontant = enRevue.reduce((a, p) => a + p.prixAccepte, 0)
  // Lignes de l'onglet, filtrées par période et recherche ; exportées telles qu'affichées (CSV, PDF).
  const prestations = (v?.prestations ?? []).filter((p) => dansPeriode(periode, p.jour, maintenant) && correspond(q, p.paquetId, p.missionId, p.livreur.nom, p.zone, p.genre === 'relais' ? t('Tournée relais') : t('Course domicile'), t(STATUT_PRESTATION[p.statut][1])))
  const versements = h?.filter((x) => dansPeriode(periode, x.date, maintenant) && correspond(q, x.reference, d.jourLong(x.date), t(STATUT_VERSEMENT[x.statut][1]))) ?? null
  const retenues = (v?.retenues ?? []).filter((r) => dansPeriode(periode, r.decideLe, maintenant) && correspond(q, r.litigeId, r.libelle, t(r.libelle), t(STATUT_RETENUE[r.statut][1])))
  const totalOnglet = onglet === 'a_venir' ? (v?.prestations.length ?? 0) : onglet === 'historique' ? (h?.length ?? 0) : (v?.retenues.length ?? 0)
  const nOnglet = onglet === 'a_venir' ? prestations.length : onglet === 'historique' ? (versements?.length ?? 0) : retenues.length
  const filtre = !!q.trim() || periode !== 'tout'
  const tableau = (): { nom: string; titre: string; entetes: string[]; lignes: (string | number)[][] } =>
    onglet === 'a_venir'
      ? { nom: 'prestations', titre: t('Prestations de la période'), entetes: [t('Paquet'), t('Mission'), t('Prestation'), t('Zone'), t('Livreur'), t('Date'), t('Statut'), t('Montant')], lignes: prestations.map((p) => [p.paquetId, p.missionId, t(p.genre === 'relais' ? 'Tournée relais' : 'Course domicile'), p.zone, p.livreur.nom, `${d.jour(p.jour)} ${d.heure(p.jour)}`, t(STATUT_PRESTATION[p.statut][1]), p.statut === 'validee' ? p.montant : p.prixAccepte]) }
      : onglet === 'historique'
        ? { nom: 'versements', titre: t('Versements'), entetes: [t('Vendredi'), t('Versé'), t('Statut de l’opérateur'), t('Référence')], lignes: (versements ?? []).map((x) => [d.jourLong(x.date), x.statut === 'verse' ? x.montant : 0, t(STATUT_VERSEMENT[x.statut][1]), x.reference ?? '']) }
        : { nom: 'retenues', titre: t('Retenues'), entetes: [t('Dossier'), t('Retenue'), t('Décidée'), t('Définitive'), t('Statut'), t('Montant')], lignes: retenues.map((r) => [r.litigeId, t(r.libelle), d.quand(r.decideLe, maintenant), d.quand(r.definitiveLe, maintenant), t(STATUT_RETENUE[r.statut][1]), -r.montant]) }
  const csv = () => {
    const x = tableau()
    exporterCsv(`reglements-${x.nom}-${jourDe(maintenant)}.csv`, x.entetes, x.lignes)
  }
  const pdf = () => {
    const x = tableau()
    exporterPdf(`reglements-${x.nom}-${jourDe(maintenant)}.pdf`, [
      { texte: `${t('Règlements')} · ${x.titre}`, taille: 16, espace: 6 },
      { texte: `${nom} · ${t(TITRE_PERIODE[periode])}${q ? ` · « ${q} »` : ''} · ${tf('édité {q}', { q: d.quand(maintenant, maintenant) })}`, taille: 9, espace: 10 },
      { texte: x.entetes.join(' · '), taille: 9, espace: 4 },
      ...x.lignes.map((l) => ({ texte: l.map((c) => (typeof c === 'number' ? fBrut(c) : c)).join(' · ') })),
      ...(x.lignes.length ? [] : [{ texte: t('Aucune ligne pour cette période.') }]),
      { texte: tf('Versement chaque vendredi avant {h} h, sans demande, sans frais, sans minimum. Consultables {j} jours après la fin du contrat.', { h: V.heureLimite, j: LECTURE_APRES_FIN_J }), taille: 8, espace: 10 },
    ])
  }
  const acts = (
    <>
      <BoutonMasque className="btn secondary sm" />
      <Link className="btn secondary sm" to={chemin('releves')}>
        <Icone nom="file-text" taille={16} />
        <span>{t('Relevés et factures')}</span>
      </Link>
    </>
  )
  const jourArrete = d.jourLong(v?.arrete ?? maintenant).split(' ')[0]
  const majuscule = (x: string) => x.charAt(0).toUpperCase() + x.slice(1)
  return (
    <Ecran route="reglements" actions={large ? acts : undefined}>
      <Px>
        <Tete route="reglements" titre={t('Règlements')} actes={acts} />
        <ErreurPx erreur={erreur} relire={relire} quoi="les règlements" />
        {refuse && (
          <Banniere
            ton="red"
            icone="circle-x"
            className="ec-bn"
            role="alert"
            bouton={
              proprio && !feuille.ouverte ? (
                <button type="button" className="btn primary sm" onClick={feuille.ouvrir}>
                  <Icone nom="wallet" taille={16} />
                  <span>{t('Vérifier le moyen de règlement')}</span>
                </button>
              ) : undefined
            }
          >
            <b>{t('Versement refusé par l’opérateur.')}</b> {tf('{m} le {j}, tentative {n}. Nouvelles tentatives : {e} au plus, à {h} h d’intervalle ; ensuite, les versements sont suspendus et le support vous appelle.', { m: f(refuse.montant), j: d.jourLong(refuse.date), n: refuse.tentatives, e: V.essais, h: V.intervalleH })}
          </Banniere>
        )}
        {v && v.statut === 'bloque' && m?.bloqueJusqua && (
          <Banniere ton="amber" icone="lock" className="ec-bn" role="status">
            <b>{tf('Versements bloqués {n} jours.', { n: V.blocageMoyenJours })}</b> {tf('Moyen de règlement en revue humaine par la Finance BelivaY : versements bloqués jusqu’au {q}. Le montant reste dû et part au vendredi qui suit le déblocage.', { q: d.quand(m.bloqueJusqua, maintenant) })}
          </Banniere>
        )}
        {v && v.report > 0 && (
          <Banniere
            ton="amber"
            icone="triangle-alert"
            className="ec-bn"
            role="status"
            bouton={
              onglet !== 'retenues' ? (
                <button type="button" className="btn secondary sm" onClick={() => choisir('retenues')}>
                  <Icone nom="scale" taille={16} />
                  <span>{t('Voir les retenues')}</span>
                </button>
              ) : undefined
            }
          >
            {tf('Les retenues dépassent les prestations de la semaine : {m} reportés sur les {n} vendredis suivants au plus (jusqu’au {q}), puis plan d’apurement. Aucune caution n’est demandée.', { m: f(v.report), n: V.reportVendredis, q: d.jour(v.reportJusqua!) })}
          </Banniere>
        )}
        {!v ? (
          !erreur && <Chargement />
        ) : (
          <>
            <div className="g g21">
              <Col>
                <div className="hero night" data-heros="vendredi">
                  <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <span className="hk">
                      {v.statut === 'bloque' ? tf('À verser · bloqué, {j}', { j: d.jourLong(v.limite) }) : tf('À verser le {j} · avant {h} h', { j: d.jourLong(v.limite), h: V.heureLimite })}
                    </span>
                    <Pill ton="ink" sm icone={v.statut === 'bloque' ? 'lock' : v.report > 0 ? 'scale' : 'repeat'}>
                      {v.statut === 'bloque' ? t('Revue humaine') : v.report > 0 ? t('Retenue motivée') : t('Automatique')}
                    </Pill>
                  </div>
                  {v.statut !== 'bloque' && (
                    <div className="e7-rebours-h">
                      <Rebours fin={v.limite} urgent={3 * HEURE} critique={30 * 60_000} avant={t('Versement dans') + ' '} echu={t('Versement en cours d’envoi')} />
                    </div>
                  )}
                  <button type="button" className="e7-tap" onClick={basculer} disabled={!voir} aria-label={masque ? t('Afficher les montants') : t('Masquer les montants')} aria-pressed={masque} data-montant-heros>
                    {masque ? (
                      <div className="big num">
                        ••••<small>F</small>
                      </div>
                    ) : (
                      <Gros n={v.aVerser} />
                    )}
                  </button>
                  {!voir && <Interdit roles={['proprietaire', 'comptable']} quoi="Montants des règlements" />}
                  <div className="hs">
                    {v.report > 0
                      ? tf('Prestations validées {p} − retenues {r} = solde de {s}, repris sur les prestations validées suivantes.', { p: f(v.totalValide), r: f(v.totalRetenues), s: f(v.totalValide - v.totalRetenues) })
                      : tf('Somme des prestations validées ({n}) moins les retenues motivées ({r}). Calculé par BelivaY, jamais saisi.', { n: v.prestations.filter((p) => p.statut === 'validee').length, r: f(v.totalRetenues) })}
                  </div>
                  <div className="money4">
                    {v.report > 0 ? (
                      <>
                        <M4 l={t('Prestations validées')} v={f(v.totalValide)} s={tf('clôture {q}', { q: d.quand(v.arrete, maintenant) })} />
                        <M4 l={t('Solde à reprendre')} v={f(v.report)} s={t('sur les prestations des semaines suivantes')} />
                        <M4 l={tf('Au-delà du {j}', { j: d.jour(v.reportJusqua!) })} v={t('Plan d’apurement')} s={tf('report sur {n} vendredis au plus', { n: V.reportVendredis })} />
                        <M4 l={t('Caution')} v={t('Jamais')} s={t('aucune caution demandée')} />
                      </>
                    ) : (
                      <>
                        <M4 l={t('Prévision')} v={f(v.totalValide + enRevueMontant)} s={enRevue.length ? tf('avec {n} prestation(s) en revue ({m})', { n: enRevue.length, m: f(enRevueMontant) }) : t('aucune prestation en revue')} />
                        <M4 l={t('Clôture de la période')} v={d.quand(v.arrete, maintenant)} s={<Rebours fin={v.arrete} urgent={3 * HEURE} critique={30 * 60_000} avant={t('dans') + ' '} echu={t('validé après : vendredi suivant')} />} />
                        <M4 l={t('Frais et minimum')} v={f(v.frais)} s={t('frais à la charge de BelivaY, aucun minimum')} />
                        <M4 l={t('Demande')} v={t('Aucune')} s={t('versement automatique')} />
                      </>
                    )}
                  </div>
                </div>
                {indic.donnees && (
                  <div className="g g2" style={{ marginTop: 0 }}>
                    <Kpi k={t('Gagné cette semaine')} v={f(indic.donnees.semaine)} s={t('prestations validées de la semaine')} icone="trending-up" />
                    <Kpi k={t('Gagné ce mois')} v={f(indic.donnees.mois)} s={t('depuis le 1er du mois')} icone="calendar" />
                    <Kpi k={t('Volume validé')} v={indic.donnees.volumeValide} u={t('prestations')} s={t('ce mois')} icone="boxes" />
                    <Kpi k={t('Retenues')} v={f(indic.donnees.retenuesMois)} s={t('définitives, ce mois')} icone="scale" iton={indic.donnees.retenuesMois > 0 ? 'red' : 'green'} />
                  </div>
                )}
              </Col>
              <Col>
                <Panel titre={t('Moyen de règlement')} icone="wallet">
                  {m ? (
                    <>
                      <Li
                        icone="smartphone"
                        ton={refuse ? 'red' : m.statut === 'verifie' ? 'acc' : 'amber'}
                        t={`${operateur(m.operateur)} ${m.numero}`}
                        s={
                          m.statut === 'verifie'
                            ? tf('Au nom de {n} · vérifié le {j}', { n: m.titulaire, j: m.verifieLe ? d.jourLong(m.verifieLe) : '—' })
                            : tf('Au nom de {n} · en revue jusqu’au {q}', { n: m.titulaire, q: m.bloqueJusqua ? d.quand(m.bloqueJusqua, maintenant) : '—' })
                        }
                        droite={refuse ? <St t={t('Refusé')} ton="red" /> : <St t={t(m.statut === 'verifie' ? 'Vérifié' : 'En revue')} ton={m.statut === 'verifie' ? 'green' : 'amber'} />}
                      />
                      <div className="row mt10" style={{ gap: 10, flexWrap: 'wrap' }}>
                        {proprio && (
                          <button type="button" className="btn secondary sm" disabled={m.statut === 'en_revue'} onClick={feuille.ouvrir}>
                            <Icone nom="pencil" taille={16} />
                            <span>{t('Changer')}</span>
                          </button>
                        )}
                        <span className="lock">
                          <Icone nom="lock" taille={14} />{' '}
                          {m.statut === 'en_revue' ? tf('Attendre la revue : aucun versement pendant {n} jours', { n: V.blocageMoyenJours }) : tf('Propriétaire seulement · un changement bloque les versements {n} jours', { n: V.blocageMoyenJours })}
                        </span>
                      </div>
                      {!proprio && <Interdit roles={['proprietaire']} quoi="Changer le moyen de règlement" />}
                    </>
                  ) : (
                    !moyen.erreur && <Chargement n={1} />
                  )}
                  <Note ton="ink" icone="shield-check">
                    {t('BelivaY ne vous demandera jamais votre code secret Mobile Money, ni par téléphone, ni par message.')}
                  </Note>
                </Panel>
                <Panel titre={t('Chaque vendredi')} icone="calendar-clock" a={{ t: t('Relevés'), to: chemin('releves') }}>
                  <Frise
                    items={[
                      { t: `${majuscule(jourArrete)} ${d.heure(v.arrete)}`, d: t('clôture : ce qui est validé part le lendemain'), st: 'done' },
                      { t: tf('Vendredi avant {h} h', { h: V.heureLimite }), d: t('versement automatique, sans demande, sans frais'), st: 'cur' },
                      { t: t('Vendredi'), d: t('relevé détaillé par prestation et par retenue (PDF, CSV)') },
                    ]}
                  />
                  <Hint icone="rotate-cw">{tf('Versement refusé par l’opérateur : {n} nouvelles tentatives à {h} h d’intervalle, puis suspension et appel du support.', { n: V.essais, h: V.intervalleH })}</Hint>
                </Panel>
              </Col>
            </div>
            <div style={{ marginTop: 8 }}>
              <Choix
                forme="tabs"
                aria={t('Règlements')}
                actif={onglet}
                choisir={choisir}
                items={[
                  { id: 'a_venir', t: t('À venir'), n: v.prestations.length },
                  { id: 'historique', t: t('Historique'), n: h?.length ?? null },
                  { id: 'retenues', t: t('Retenues'), n: v.retenues.length },
                ]}
              />
            </div>
            <div className="e7-outils e7-outils-l" style={{ marginTop: 14 }}>
              <Recherche q={q} setQ={setQ} placeholder={onglet === 'retenues' ? t('Dossier, retenue…') : onglet === 'historique' ? t('Référence, date…') : t('Paquet, mission, livreur, zone…')} aria={t('Rechercher dans les règlements')} />
              <Puces aria={t('Période')} actif={periode} choisir={setPeriode} items={PERIODES.map((x) => ({ id: x, t: TITRE_PERIODE[x] }))} />
              <div className="row" style={{ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <Compte n={nOnglet} total={totalOnglet} />
                {voir ? <Exports csv={csv} pdf={pdf} libelle={t('Exporter l’onglet affiché')} desactive={!nOnglet} /> : <Interdit roles={['proprietaire', 'comptable']} quoi="Exporter les montants" />}
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              {filtre && nOnglet === 0 && totalOnglet > 0 ? (
                <AucunResultat effacer={effacer} texte={t('Aucune ligne ne correspond à la période ou à la recherche choisie.')} />
              ) : (
                <>
                  {onglet === 'a_venir' && <AVenir prestations={prestations} />}
                  {onglet === 'historique' && <Historique versements={versements} premier={v.limite} />}
                  {onglet === 'retenues' && <Retenues retenues={retenues} />}
                </>
              )}
            </div>
            <Hint icone="info">{tf('Versement chaque vendredi avant {h} h de ce qui est validé au plus tard le {j} à {a} : sans demande, sans frais, sans minimum. Aucun versement anticipé, jamais d’espèces.', { h: V.heureLimite, j: jourArrete, a: d.heure(v.arrete) })}</Hint>
          </>
        )}
      </Px>
      {m && proprio && <ChangerMoyen ouverte={feuille.ouverte} fermer={feuille.fermer} />}
      {v && (
        <BarrePouce aria={t('Actions des règlements')}>
          <BoutonMasque className="btn secondary" />
          {voir && (
            <button type="button" className="btn secondary" onClick={csv} disabled={!nOnglet}>
              <Icone nom="file-spreadsheet" taille={18} />
              <span>{t('Exporter')}</span>
            </button>
          )}
        </BarrePouce>
      )}
    </Ecran>
  )
}

function AVenir({ prestations }: { prestations: Prestation[] }) {
  const { t, tf } = usePreferences()
  const d = useDates()
  const { f } = useMasque()
  const valide = prestations.filter((p) => p.statut === 'validee').reduce((a, p) => a + p.montant, 0)
  const revue = prestations.filter((p) => p.statut === 'en_revue').reduce((a, p) => a + p.prixAccepte, 0)
  const cols: Colonne<Prestation>[] = [
    {
      k: 'pq',
      t: t('Paquet'),
      main: true,
      rendu: (p) => (
        <span data-prestation={p.id}>
          <Link className="mono b8" to={chemin('paquet', { id: p.paquetId })}>
            {p.paquetId}
          </Link>
          <div className="t2 mono">{p.missionId}</div>
        </span>
      ),
    },
    {
      k: 'pr',
      t: t('Prestation'),
      rendu: (p) => (
        <>
          {`${t(p.genre === 'relais' ? 'Tournée relais' : 'Course domicile')} · ${p.zone} · ${p.classes.join(' ')}`}
          <div className="t2">{p.minoree ? t('Minorée : remise après la promesse') : `${p.livreur.nom} · ${tf('prix accepté {m}', { m: f(p.prixAccepte) })}`}</div>
        </>
      ),
    },
    { k: 'd', t: t('Date'), rendu: (p) => <span className="nw">{`${d.jour(p.jour)} · ${d.heure(p.jour)}`}</span> },
    {
      k: 'st',
      t: t('Statut'),
      rendu: (p) => (
        <div>
          <St t={t(STATUT_PRESTATION[p.statut][1])} ton={STATUT_PRESTATION[p.statut][0]} />
          {p.raison && <div className="t2">{t(p.raison)}</div>}
        </div>
      ),
    },
    { k: 'm', t: t('Montant'), cls: 'r', rendu: (p) => (p.statut === 'validee' ? <b>{f(p.montant)}</b> : <span className="c3">{p.statut === 'non_payee' ? <s>{f(p.prixAccepte)}</s> : f(p.prixAccepte)}</span>) },
  ]
  return (
    <div className="ec-tb">
      <Table
        cols={cols}
        rows={prestations}
        cle={(p) => p.id}
        legende={t('Prestations de la période')}
        ligneCls={(p) => (p.statut === 'non_payee' ? 'bad' : p.statut === 'en_revue' ? 'warn' : undefined)}
        vide={<Vide icone="package" t={t('Aucune prestation cette semaine')} s={t('Les missions validées avant la clôture du jeudi apparaissent ici.')} />}
        pied={
          <>
            <span>{tf('Validé {v} : à verser vendredi, moins les retenues', { v: f(valide) })}</span>
            <span>{tf('Prévision {m}', { m: f(valide + revue) })}</span>
          </>
        }
      />
    </div>
  )
}

/** Relevé de la semaine d'un versement (semaine ISO du vendredi, celle de son arrêté du jeudi) : « RL-2026-S41 ». */
function releveDe(t: number): string {
  const d = new Date(t + 3_600_000)
  const jour = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  const jeudi = new Date(jour + (3 - ((new Date(jour).getUTCDay() + 6) % 7)) * 86_400_000)
  const semaine = 1 + Math.floor((jeudi.getTime() - Date.UTC(jeudi.getUTCFullYear(), 0, 1)) / (7 * 86_400_000))
  return `RL-${jeudi.getUTCFullYear()}-S${semaine}`
}

function Historique({ versements, premier }: { versements: Versement[] | null; premier: number }) {
  const { t, tf } = usePreferences()
  const d = useDates()
  const { f } = useMasque()
  if (!versements) return <Chargement n={1} />
  const cols: Colonne<Versement>[] = [
    { k: 'v', t: t('Vendredi'), main: true, rendu: (x) => <b>{d.jourLong(x.date)}</b> },
    { k: 'ne', t: t('Versé'), cls: 'r', rendu: (x) => (x.statut === 'verse' ? <b>{f(x.montant)}</b> : <span className="cr b8">{f(0)}</span>) },
    {
      k: 'st',
      t: t('Statut de l’opérateur'),
      rendu: (x) => (
        <div>
          <St t={t(STATUT_VERSEMENT[x.statut][1])} ton={STATUT_VERSEMENT[x.statut][0]} />
          <div className="t2">{x.statut === 'refuse' ? tf('tentative {n} sur {e}', { n: x.tentatives, e: V.essais + 1 }) : x.reference ? <span className="mono">{x.reference}</span> : '—'}</div>
        </div>
      ),
    },
    {
      k: 'rl',
      t: t('Relevé'),
      rendu: (x) => (
        <Link className="cor b8" to={chemin('releves', { id: releveDe(x.date) })}>
          <Icone nom="file-text" taille={15} style={{ verticalAlign: '-3px' }} /> PDF · CSV
        </Link>
      ),
    },
  ]
  return (
    <div className="ec-tb">
      <Table
        cols={cols}
        rows={versements}
        cle={(x) => x.id}
        legende={t('Versements')}
        ligneCls={(x) => (x.statut === 'refuse' ? 'bad' : undefined)}
        vide={<Vide icone="calendar-check" t={t('Aucun versement pour l’instant')} s={tf('Le premier versement du pilote part {j}, avant {h} h.', { j: d.jourLong(premier), h: V.heureLimite })} />}
        pied={
          <>
            <span>{t('Une prestation en revue au jeudi soir est payée le vendredi qui suit la fin de la revue')}</span>
            <span>{tf('Consultables {j} jours après la fin du contrat', { j: LECTURE_APRES_FIN_J })}</span>
          </>
        }
      />
    </div>
  )
}

function Retenues({ retenues }: { retenues: Retenue[] }) {
  const { t, tf } = usePreferences()
  const d = useDates()
  const { f } = useMasque()
  const maintenant = useHorloge()
  const cols: Colonne<Retenue>[] = [
    {
      k: 'd',
      t: t('Dossier'),
      main: true,
      rendu: (r) => (
        <span data-retenue={r.id}>
          <Link className="cor b8 mono" to={chemin('litiges', { id: r.litigeId })}>
            {r.litigeId}
          </Link>
          <div className="t2">{t(r.libelle)}</div>
          <span className="vh">{t(STATUT_RETENUE[r.statut][1])}</span>
        </span>
      ),
    },
    { k: 'de', t: t('Décision'), rendu: (r) => <>{tf('Décidée {q}', { q: d.quand(r.decideLe, maintenant) })}<div className="t2">{tf('définitive {q}', { q: d.quand(r.definitiveLe, maintenant) })}</div></> },
    { k: 'm', t: t('Montant'), cls: 'r', rendu: (r) => <b className="cr">{f(-r.montant)}</b> },
    {
      k: 'i',
      t: t('Imputation'),
      rendu: (r) => (
        <div>
          <St t={t(STATUT_RETENUE[r.statut][1])} ton={STATUT_RETENUE[r.statut][0]} />
          <div className="t2">{r.imputee === 'ce_vendredi' ? t('imputée ce vendredi') : r.imputee === 'vendredi_suivant' ? t('imputée au vendredi suivant') : t('rien n’est retenu pendant le recours')}</div>
        </div>
      ),
    },
  ]
  return (
    <div className="ec-tb">
      <Table
        cols={cols}
        rows={retenues}
        cle={(r) => r.id}
        legende={t('Retenues')}
        ligneCls={(r) => (r.statut === 'definitive' ? 'bad' : undefined)}
        vide={<Vide icone="scale" t={t('Aucune retenue')} s={t('Une retenue n’existe qu’avec une décision motivée de litige.')} />}
        pied={
          <>
            <span>{t('Jamais une retenue sans dossier : chaque ligne ouvre sa décision motivée')}</span>
            <span>{t('Recours possible une fois, depuis le dossier')}</span>
          </>
        }
      />
    </div>
  )
}

function ChangerMoyen({ ouverte, fermer }: { ouverte: boolean; fermer: () => void }) {
  const { t, tf } = usePreferences()
  const enLigne = useEnLigne()
  const { annoncer, vue } = useAnnonce()
  const [op, setOperateur] = useState<'MTN' | 'Orange'>('MTN')
  const [numero, setNumero] = useState('')
  const [nom, setNom] = useState(false)
  const [defi, setDefi] = useState<{ defi: string; destination: string; codeDemo: string | null } | null>(null)
  const [code, setCode] = useState('')
  const [fini, setFini] = useState(false)
  const REFUS: Record<RefusMoyen, string> = {
    numero: t('Numéro camerounais à 9 chiffres attendu (+237 6…).'),
    titulaire: t('Le compte doit être au nom de l’entreprise.'),
    code: t('Code incorrect : vérifiez le SMS reçu.'),
    en_revue: t('Un changement est déjà en revue.'),
  }
  const valide = /^6\d{8}$/.test(numero.replace(/\D/g, '').replace(/^237/, ''))
  return (
    <Feuille ouverte={ouverte} fermer={fermer} titre={t('Changer le moyen de règlement')}>
      <h2 className="card-t">{t('Changer le moyen de règlement')}</h2>
      {fini ? (
        <>
          <p className="mt10">{tf('Changement enregistré. Versements bloqués {n} jours, le temps d’une revue humaine par la Finance de BelivaY.', { n: V.blocageMoyenJours })}</p>
          <button type="button" className="btn primary bloc mt16" onClick={fermer}>
            {t('Fermer')}
          </button>
        </>
      ) : (
        <>
          <div className="bandeau ambre mt10">
            <Icone nom="lock" taille={18} />
            <span className="grow">{tf('Tout changement bloque les versements {n} jours et déclenche une revue humaine.', { n: V.blocageMoyenJours })}</span>
          </div>
          <div className="seg mt10" role="radiogroup" aria-label={t('Opérateur')}>
            {(['MTN', 'Orange'] as const).map((o) => (
              <button key={o} type="button" role="radio" aria-checked={op === o} className={op === o ? 'on' : ''} onClick={() => setOperateur(o)} disabled={!!defi}>
                {o === 'MTN' ? 'MTN MoMo' : 'Orange Money'}
              </button>
            ))}
          </div>
          <label className="champ">
            <span>{t('Numéro (+237)')}</span>
            <input inputMode="tel" autoComplete="off" value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="6XX XX XX XX" disabled={!!defi} />
          </label>
          <label className="e7-coche">
            <input type="checkbox" checked={nom} onChange={(e) => setNom(e.target.checked)} disabled={!!defi} />
            <span>{t('Ce compte est au nom de l’entreprise')}</span>
          </label>
          {!defi ? (
            <button type="button" className="btn primary bloc mt16" disabled={!enLigne || !valide || !nom} onClick={async () => setDefi(await source.reglements.demanderCode())}>
              {t('Recevoir le code par SMS')}
            </button>
          ) : (
            <>
              <label className="champ">
                <span>{tf('Code reçu au {dest}', { dest: defi.destination })}</span>
                <input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} maxLength={8} />
              </label>
              {defi.codeDemo && <p className="e7-aide">{tf('Démonstration : le code est {c}.', { c: defi.codeDemo })}</p>}
              <button
                type="button"
                className="btn primary bloc mt16"
                disabled={!enLigne || !code}
                onClick={async () => {
                  const r = await source.reglements.changerMoyen({ operateur: op, numero, auNomDeLEntreprise: nom, defi: defi.defi, code })
                  if (r.ok) setFini(true)
                  else annoncer(false, REFUS[r.raison])
                }}
              >
                {t('Confirmer le changement')}
              </button>
            </>
          )}
          {!enLigne && <p className="e7-aide rouge">{t('Hors connexion : changer le moyen de règlement touche à l’argent, rien n’est gardé sur l’appareil. Reconnectez-vous pour continuer.')}</p>}
          {vue}
        </>
      )}
    </Feuille>
  )
}
