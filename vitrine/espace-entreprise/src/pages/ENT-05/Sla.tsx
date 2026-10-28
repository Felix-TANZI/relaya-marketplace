// ENT-P09 — Prix et délais (SLA) : la grille d'ACHAT de Yafé (jamais la grille de vente, ENT-P09R-04), en lecture
// seule (ENT-P09R-01 : « Fixé par BelivaY », une révision se demande par message), chaque ligne avec son plafond par
// classe et son contrôle (écrêtée au plafond : DP-62, A-01 ; bloquée en attente de validation : ENT-RG-R80), sa version
// et sa date (RG-R85) ; gain sur le paquet type (RG-R84) ; délais promis, suppléments et minoration, paliers et
// plafond de valeur, versions et préavis d'une nouvelle grille (ENT-P09R-02 ; acceptation par le propriétaire,
// ENT-P03). Le répartiteur voit les délais et les paliers, sans aucun montant de grille (ENT-RG-R25).
// Enrichi (ENRICHISSEMENTS.md, P09) : simulateur « si je baisse mes retards de X » (chiffres qui défilent, M9) dans
// « Suppléments et minoration » ; alertes avant échéance réglées dans « Délais contractuels » (bornes du registre,
// enregistrées par geste() : gardées hors connexion ; journal des changements → parametres-journal, M22) ; préavis
// d'une nouvelle grille écrit dans « Versions de la grille ».
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Feuille, useFeuille } from '@client/composants/Feuille'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { NOM_PALIER } from '../../config/libelles'
import { chemin } from '../../config/pages'
import { source } from '../../donnees/source'
import type { CodeLigne, Grille, LigneGrille, Supplement } from '../../donnees/domaines/prix'
import type { PalierEntreprise } from '../../donnees/communs'
import { F } from '@client/i18n/format'
import { Banniere, type Colonne, Frise, Hint, Interdit, Li, Limite, Note, Panel, Pill, Px, St, Table, Tete, useLarge } from '../../composants/prototype'
import { usePreferences } from '../../preferences'
import { useMontantsVisibles, usePeut, useSession } from '../../session'
import { REGLES } from '../../calculs/livraison/regles-ecrans'
import { PARAMETRES } from '../../calculs/registre'
import { BandeauErreur, ChiffreAnime, Chargement, Montant, NOM_LIGNE, Retour, useDonnees, useDuree, useHeure, useJour } from './commun'
import { geste } from '../../donnees/fileHorsLigne'

const NOM_SUPPLEMENT: Record<Supplement['code'], string> = {
  client_absent: 'Client absent : nouvelle tentative',
  refus_conforme: 'Refus d’un produit conforme',
  deplacement: 'Déplacement inutile (boutique fermée, produit non conforme)',
  carton_c2: 'Carton C2',
  autre_zone: 'Relais dans une autre zone que le premier ramassage',
  minoration: 'Retard au-delà de la promesse, sans incident d’un tiers validé',
}

function FeuilleRevision({ ouverte, fermer }: { ouverte: boolean; fermer(): void }) {
  const { t, tf } = usePreferences()
  const [texte, setTexte] = useState('')
  const [etat, setEtat] = useState<{ ok: boolean; fil?: string } | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const envoyer = async () => {
    setEnvoi(true)
    const r = await source.prix.demanderRevision(texte)
    setEnvoi(false)
    setEtat(r.ok ? { ok: true, fil: r.filId } : { ok: false })
  }
  return (
    <Feuille ouverte={ouverte} fermer={fermer} titre={t('Demander une révision de la grille')}>
      <div className="grab"></div>
      <h2 className="lv-h2">{t('Demander une révision de la grille')}</h2>
      <p className="lv-s">{t('La grille ne se modifie jamais ici : votre demande part en message à l’équipe partenaires BelivaY, qui répond dans le fil « Révision de grille ». La grille en vigueur continue de s’appliquer.')}</p>
      {etat?.ok ? (
        <>
          <Retour ton="ok">{t('Demande envoyée à BelivaY.')}</Retour>
          <div className="btns">
            <Link className="btn primary" to={chemin('messages', { fil: etat.fil })}>
              <Icone nom="message-circle" taille={18} />
              {t('Voir le fil')}
            </Link>
            <button type="button" className="btn ghost" onClick={fermer}>
              {t('Fermer')}
            </button>
          </div>
        </>
      ) : (
        <>
          <label className="champ">
            <span>{t('Ligne concernée et raison')}</span>
            <textarea className="lv-ta" value={texte} onChange={(e) => (setTexte(e.target.value), setEtat(null))} placeholder={t('Exemple : la course à domicile depuis Z1 ne couvre plus le trajet aux heures de pointe.')} />
          </label>
          {etat && !etat.ok && <p className="lv-champ-err">{tf('Écrivez au moins {n} caractères pour que BelivaY comprenne la demande.', { n: PARAMETRES.saisies.revisionTexteMin })}</p>}
          <div className="btns mt14">
            <button type="button" className="btn primary" disabled={envoi} onClick={envoyer}>
              <Icone nom="send" taille={18} />
              {t('Envoyer à BelivaY')}
            </button>
            <button type="button" className="btn ghost" onClick={fermer}>
              {t('Annuler')}
            </button>
          </div>
        </>
      )}
    </Feuille>
  )
}

// Zone de chaque ligne (colonne « Zone » du prototype).
const ZONE_LIGNE: Record<CodeLigne, string> = {
  relais_1_4: 'Relais de la zone',
  relais_5_9: 'Relais de la zone',
  relais_10: 'Relais de la zone',
  relais_autre_zone: 'Autre zone',
  carton_c2: 'Toutes zones',
  domicile_zones: 'Entre Z2, Z3 et Z6',
  domicile_z1: 'Z1 Centre-ville',
  collecte: 'Relais de la zone',
  retour: 'Zone du vendeur',
  transfert_sm: 'Entre deux relais',
  transfert_l: 'Entre deux relais',
}
const ICONE_SUPP: Record<Supplement['code'], string> = { client_absent: 'user-x', refus_conforme: 'package-x', deplacement: 'store', carton_c2: 'box', autre_zone: 'map-pinned', minoration: 'trending-down' }

const Fixe = () => {
  const { t } = usePreferences()
  return (
    <Pill ton="ink" sm icone="lock">
      {t('Fixé par BelivaY')}
    </Pill>
  )
}

function EtatLigne({ c }: { c: LigneGrille['controle'] }) {
  const { t } = usePreferences()
  if (c === 'ok') return <St t={t('En vigueur')} ton="green" />
  if (c === 'ecrete') return <St t={t('Écrêtée au plafond')} ton="amber" />
  return <St t={t('En attente de validation')} ton="red" />
}

/** Grille d'achat (C.table du prototype) : prestation, classe, zone, tarif, plafond, version, état. */
function GrilleAchat({ g, nom }: { g: Grille; nom: string }) {
  const { t, tf } = usePreferences()
  const jour = useJour()
  const unite = (l: LigneGrille) => t(l.type === 'domicile' ? 'par course' : l.type === 'supplement' ? 'en plus, par colis' : 'par colis')
  const cols: Colonne<LigneGrille>[] = [
    {
      k: 'p',
      t: t('Prestation'),
      main: true,
      rendu: (l) => (
        <>
          <b>{t(NOM_LIGNE[l.code])}</b>
          <div className="t2">{l.paquetType ? t('Ligne du paquet type') : unite(l)}</div>
        </>
      ),
    },
    { k: 'c', t: t('Classe'), rendu: (l) => l.plafonds.map((p) => p.classe ?? (l.type === 'domicile' ? t('Formats S, M, L, C1') : '—')).join(', ') },
    { k: 'z', t: t('Zone'), rendu: (l) => t(ZONE_LIGNE[l.code]) },
    {
      k: 't',
      t: tf('Tarif {n}', { n: nom }),
      cls: 'r',
      rendu: (l) => (
        <b className={l.controle === 'au_dessus' ? 'cr' : undefined}>
          <Montant n={l.prix} signe={l.type === 'supplement'} />
        </b>
      ),
    },
    {
      k: 'pl',
      t: t('Plafond BelivaY'),
      cls: 'r',
      rendu: (l) => (
        <span>
          {l.plafonds.map((p, i) => (
            <span key={String(p.classe)} className={'nw' + (l.prix > p.montant ? ' ca' : '')}>
              {i > 0 && ' · '}
              {p.classe ? `${p.classe} ` : ''}
              <Montant n={p.montant} />
            </span>
          ))}
        </span>
      ),
    },
    { k: 'v', t: t('Version'), hideM: true, rendu: (l) => <span className="nw">{l.version} · {jour(l.depuis)}</span> },
    { k: 'e', t: t('État'), rendu: (l) => <EtatLigne c={l.controle} /> },
  ]
  const bloquees = g.lignes.filter((l) => l.controle === 'au_dessus').length
  return (
    <div className="entb-t">
      <Table
        cols={cols}
        rows={g.lignes}
        cle={(l) => l.code}
        ligneCls={(l) => (l.controle === 'au_dessus' ? 'bad' : l.paquetType ? 'sel' : undefined)}
        legende={t('Grille d’achat')}
        outils={
          <>
            <span className="b8 t14">{tf('Grille d’achat de {n}', { n: nom })}</span>
            <Fixe />
            <span className="sp"></span>
            <span className="lock">
              <Icone nom="file-signature" taille={15} /> {tf('Grille {v} en vigueur depuis le {d}', { v: g.version, d: jour(g.enVigueurDepuis) })}
            </span>
          </>
        }
        pied={
          <>
            <span>
              <Icone nom="info" taille={14} style={{ display: 'inline', verticalAlign: '-2px' }} />{' '}
              {bloquees
                ? t('Une ligne au-dessus du plafond est bloquée par la console jusqu’à décision écrite de BelivaY, ligne par ligne : elle ne paie aucun paquet.')
                : t('Chaque colis est payé au plus au plafond de sa classe : une ligne au-dessus est écrêtée, jamais payée plus.')}
            </span>
            <span>{t('Montants calculés par le serveur')}</span>
          </>
        }
      />
    </div>
  )
}

/** Paliers (entb-tiers du prototype) : le palier de l'entreprise surligné, plafond par colis, condition du suivant. */
function Paliers({ p }: { p: { actuel: PalierEntreprise; plafonds: { palier: PalierEntreprise; plafond: number | null; seuil: number | null }[] } }) {
  const { t, tf } = usePreferences()
  return (
    <>
      <div className="entb-tiers">
        {p.plafonds.map((x) => (
          <div key={x.palier} className={'entb-tier' + (x.palier === p.actuel ? ' on' : '')}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <Pill ton={x.palier === p.actuel ? 'acc' : x.plafond === null ? 'gold' : 'ink'} sm>
                {t(NOM_PALIER[x.palier])}
              </Pill>
              {x.palier === p.actuel && <span className="t12 b8 cacc">{t('Votre palier')}</span>}
            </div>
            <div className="v">{x.plafond === null ? t('Sans plafond') : <Montant n={x.plafond} />}</div>
            <div className="s">{x.plafond === null ? t('assurance marchandises obligatoire') : t('par colis')}{x.seuil !== null && <> · {tf('Trust Score ≥ {s} tenu', { s: x.seuil })}</>}</div>
          </div>
        ))}
      </div>
      <Hint icone="shield-check">{t('Le plafond vaut pour chaque colis, pas pour le paquet : un colis au-dessus n’est jamais proposé à votre entreprise. Il remplace toute caution.')}</Hint>
    </>
  )
}

/**
 * Simulateur (M9) : « si je baisse mes colis en retard de X par semaine », ce que la minoration ne retient plus, par
 * semaine et sur la durée du pilote. Indicatif : le versement est calculé par le serveur. X va de 0 au nombre de colis
 * qu'une semaine de tournées peut porter (objectif par tournée × tournées par jour × 7).
 */
function Simulateur({ prixColis, pct }: { prixColis: number; pct: number }) {
  const { t, tf } = usePreferences()
  const max = REGLES.objectifTournee * REGLES.tourneesJour * 7
  const [x, setX] = useState(Math.min(max, REGLES.objectifTournee))
  const perte = Math.round((prixColis * pct) / 100)
  const jours = PARAMETRES.pilote.dureeJours
  const semaine = x * perte
  const pilote = Math.round((semaine * jours) / 7)
  const regler = (v: number) => setX(Math.max(0, Math.min(max, v)))
  return (
    <div className="lv-simu" role="group" aria-labelledby="lv-simu-t">
      <div className="lv-simu-t" id="lv-simu-t">
        <Icone nom="calculator" taille={16} />
        {t('Simulateur : si je baisse mes retards')}
      </div>
      <label className="lv-simu-l" htmlFor="lv-simu-x">
        {tf('Colis en retard en moins chaque semaine : {n}', { n: x })}
      </label>
      <div className="lv-simu-c">
        <button type="button" className="btn secondary sm" aria-label={t('Un colis de moins')} disabled={x <= 0} onClick={() => regler(x - 1)}>
          <Icone nom="minus" taille={16} />
        </button>
        <input id="lv-simu-x" type="range" min={0} max={max} step={1} value={x} onChange={(e) => regler(Number(e.target.value))} />
        <button type="button" className="btn secondary sm" aria-label={t('Un colis de plus')} disabled={x >= max} onClick={() => regler(x + 1)}>
          <Icone nom="plus" taille={16} />
        </button>
      </div>
      <div className="lv-simu-r">
        <div>
          <div className="k">{t('Gardé par semaine')}</div>
          <div className="v cg">
            <ChiffreAnime n={semaine} rendu={(v) => `+${F(v)} F`} />
          </div>
        </div>
        <div>
          <div className="k">{tf('Sur le pilote ({j} jours)', { j: jours })}</div>
          <div className="v cg">
            <ChiffreAnime n={pilote} rendu={(v) => `+${F(v)} F`} />
          </div>
        </div>
      </div>
      <p className="t12 c3 mt8">{tf('Chaque colis livré en retard perd {p} % de {m}, soit {d} ; calcul indicatif sur la ligne 5 à 9 colis, le versement est calculé par le serveur.', { p: pct, m: F(prixColis) + ' F', d: F(perte) + ' F' })}</p>
    </div>
  )
}

/**
 * Alertes avant échéance (réglage de l'entreprise) : N minutes avant la fin du délai d'acceptation et du délai de
 * ramassage, l'équipe est prévenue et les comptes à rebours passent en ambre. Bornes du registre écrites sous chaque
 * champ ; enregistré par geste() (gardé hors connexion, envoyé au retour du réseau) ; journalisé avec l'auteur.
 */
function ReglageAlertes() {
  const { t, tf } = usePreferences()
  const jour = useJour()
  const h = useHeure()
  const peut = usePeut(['proprietaire', 'repartiteur'])
  const l = useDonnees(() => source.prix.alertesDelais())
  const a = l.donnees
  const [acc, setAcc] = useState('')
  const [ram, setRam] = useState('')
  const [etat, setEtat] = useState<'fait' | 'en_file' | 'bornes' | null>(null)
  const [envoi, setEnvoi] = useState(false)
  useEffect(() => {
    if (a) (setAcc(String(a.acceptationMin)), setRam(String(a.ramassageMin)))
  }, [a])
  if (!a) return <Chargement n={1} hauteur={60} />
  const nAcc = Number(acc)
  const nRam = Number(ram)
  const horsBornes = (n: number, b: { min: number; max: number }) => !Number.isInteger(n) || n < b.min || n > b.max
  const errAcc = horsBornes(nAcc, a.bornes.acceptation)
  const errRam = horsBornes(nRam, a.bornes.ramassage)
  const change = nAcc !== a.acceptationMin || nRam !== a.ramassageMin
  const enregistrer = async () => {
    if (errAcc || errRam) return setEtat('bornes')
    setEnvoi(true)
    const r = await geste('Enregistrer les alertes de délai', (s) => s.prix.reglerAlertesDelais({ acceptationMin: nAcc, ramassageMin: nRam }))
    setEnvoi(false)
    if (r.etat === 'en_file') return setEtat('en_file')
    setEtat(r.r.ok ? 'fait' : 'bornes')
    if (r.r.ok) {
      l.relire()
      window.dispatchEvent(new CustomEvent('blv:alertes-delais'))
    }
  }
  const champ = (id: string, libelle: string, v: string, set: (v: string) => void, b: { min: number; max: number }, err: boolean) => (
    <div className="lv-reg-c">
      <label htmlFor={id}>{t(libelle)}</label>
      <span className="lv-reg-i">
        <input id={id} type="number" inputMode="numeric" min={b.min} max={b.max} step={1} value={v} disabled={!peut} aria-invalid={err} onChange={(e) => (set(e.target.value), setEtat(null))} />
        <span>{t('min avant l’échéance')}</span>
      </span>
      <Limite icone="ruler" titre={tf('Entre {a} et {b} min', { a: b.min, b: b.max })} texte={t('bornes du registre : au moins le seuil rouge, au plus le délai lui-même')} atteinte={err ? t('Valeur hors des bornes : elle ne sera pas enregistrée.') : undefined} />
    </div>
  )
  return (
    <div className="lv-reg" role="group" aria-labelledby="lv-reg-t">
      <div className="lv-simu-t" id="lv-reg-t">
        <Icone nom="bell-ring" taille={16} />
        {t('Vos alertes avant échéance')}
      </div>
      <p className="t13 c3">{t('L’équipe est prévenue à ce seuil et les comptes à rebours des paquets passent en ambre. Prend effet dès l’enregistrement, y compris sur les délais en cours.')}</p>
      {champ('lv-reg-acc', 'Délai d’acceptation', acc, setAcc, a.bornes.acceptation, errAcc)}
      {champ('lv-reg-ram', 'Délai de ramassage', ram, setRam, a.bornes.ramassage, errRam)}
      {peut ? (
        <div className="btns mt10">
          <button type="button" className="btn primary sm" disabled={envoi || !change} onClick={enregistrer}>
            <Icone nom="check" taille={16} />
            {envoi ? t('Envoi…') : t('Enregistrer les alertes')}
          </button>
        </div>
      ) : (
        <Interdit roles={['proprietaire', 'repartiteur']} quoi="Régler les alertes de délai" />
      )}
      {etat === 'fait' && <Retour ton="ok">{t('Alertes enregistrées : les comptes à rebours en cours les appliquent déjà.')}</Retour>}
      {etat === 'en_file' && <Retour ton="ambre">{t('Hors connexion : le réglage est gardé sur cet appareil et sera envoyé au retour du réseau.')}</Retour>}
      {etat === 'bornes' && <Retour ton="rouge">{t('Valeur hors des bornes du registre : rien n’a été enregistré.')}</Retour>}
      <p className="t12 c3 mt8">
        {a.modifieLe && a.par ? tf('Dernière modification le {d} à {h} par {u}.', { d: jour(a.modifieLe), h: h(a.modifieLe), u: a.par }) : t('Valeurs par défaut du registre.')}{' '}
        <Link className="lv-lien" to={chemin('parametres-journal')}>{t('Journal des changements')}</Link>
      </p>
    </div>
  )
}

export default function Sla() {
  const { t, tf } = usePreferences()
  const s = useSession()
  const nom = s.entreprise?.nom ?? t('votre entreprise')
  const montants = useMontantsVisibles()
  const proprio = usePeut(['proprietaire'])
  const large = useLarge()
  const duree = useDuree()
  const jour = useJour()
  const revision = useFeuille('revision')
  const delais = useDonnees(() => source.prix.delais())
  const paliers = useDonnees(() => source.prix.paliers())
  const grille = useDonnees(() => (montants ? source.prix.grille() : Promise.resolve(null)), [montants])
  const supp = useDonnees(() => (montants ? source.prix.supplements() : Promise.resolve(null)), [montants])
  const d = delais.donnees
  const g = grille.donnees
  const erreur = delais.erreur ?? grille.erreur ?? paliers.erreur ?? supp.erreur
  const relire = () => (delais.relire(), grille.relire(), paliers.relire(), supp.relire())
  const v2 = g?.prochaine
  const prix = (c: CodeLigne) => g?.lignes.find((l) => l.code === c)?.prix
  const minoration = supp.donnees?.find((x) => x.code === 'minoration')?.pourcentage ?? null
  const acts = (
    <button type="button" className="btn secondary sm" onClick={revision.ouvrir}>
      <Icone nom="message-circle" taille={16} />
      {t('Demander une révision')}
    </button>
  )
  const mini = (k: string, v: ReactNode, sous?: ReactNode) => (
    <div className="entb-m" key={k}>
      <div className="k">{k}</div>
      <div className="v">{v}</div>
      {sous && <div className="s">{sous}</div>}
    </div>
  )
  return (
    <Ecran route="sla" actions={large ? acts : undefined}>
      <Px>
        <Tete
          route="sla"
          titre={t('Prix et délais')}
          actes={acts}
        />
        {erreur && <BandeauErreur erreur={erreur} relire={relire} derniere={delais.derniere} echecs={delais.echecs} />}
        {!d ? (
          <Chargement n={3} />
        ) : (
          <>
            {/* Héros : ce que vous gagnez sur un paquet type (RG-R84) */}
            <div className="hero night entb-hero">
              <div className="entb-hero-g">
                {montants && g ? (
                  <div>
                    <div className="hk">{t('Ce que vous gagnez sur un paquet type')}</div>
                    <div className="big">
                      {F(g.paquetType.total)}
                      <small>F</small>
                    </div>
                    <div className="hs">
                      {tf('Tournée relais de {n} colis {c}', { n: g.paquetType.colis, c: g.paquetType.classe })} :{' '}
                      {g.paquetType.lignes.map((l, i) => (
                        <b key={l.code}>
                          {i > 0 && ' + '}
                          {l.quantite} × <Montant n={l.montant} />
                        </b>
                      ))}
                      . {t('Payé si les preuves sont complètes, le vendredi qui suit la validation.')}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="hk">{t('Ce que vous promettez sur chaque paquet')}</div>
                    <div className="hs">{t('Les montants de la grille sont réservés au propriétaire et au comptable.')}</div>
                  </div>
                )}
                <div className="entb-m4">
                  {montants && g ? (
                    <>
                      {prix('relais_1_4') !== undefined && mini(t('Tournée de 4 colis'), <Montant n={4 * prix('relais_1_4')!} />, <>4 × <Montant n={prix('relais_1_4')!} /></>)}
                      {prix('relais_10') !== undefined && mini(t('Tournée de 12 colis'), <Montant n={12 * prix('relais_10')!} />, <>12 × <Montant n={prix('relais_10')!} /></>)}
                      {prix('domicile_zones') !== undefined && mini(t('Course domicile'), <Montant n={prix('domicile_zones')!} />, prix('domicile_z1') !== undefined ? <>{tf('{m} si Z1', { m: F(prix('domicile_z1')!) + ' F' })}</> : undefined)}
                      {prix('relais_5_9') !== undefined && minoration !== null && mini(tf('Colis livré après {h} h', { h: d.livraisonH }), <Montant n={Math.round((prix('relais_5_9')! * (100 - minoration)) / 100)} />, tf('au lieu de {m} (−{p} %)', { m: F(prix('relais_5_9')!) + ' F', p: minoration }))}
                    </>
                  ) : (
                    <>
                      {mini(t('Pour accepter'), duree(d.acceptationMin))}
                      {mini(t('Pour ramasser'), duree(d.ramassageMin))}
                      {mini(t('Pour livrer'), tf('< {h} h', { h: d.livraisonH }), t('de « C’est prêt » à la remise'))}
                      {mini(t('Versement'), t('Vendredi'), t('de la semaine validée'))}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Nouvelle grille annoncée (ENT-P09R-02) */}
            {v2 && !v2.acceptee && (
              <>
                <Banniere
                  ton="acc"
                  icone="megaphone"
                  className="mt16"
                  role="status"
                  bouton={
                    proprio ? (
                      <span className="entb-bbtn">
                        <Link className="btn secondary sm" to={chemin('contrat')}>
                          <Icone nom="file-signature" taille={16} />
                          {t('Lire et accepter')}
                        </Link>
                      </span>
                    ) : undefined
                  }
                >
                  <b>{tf('Nouvelle grille {v} annoncée, en vigueur le {d}.', { v: v2.version, d: jour(v2.du) })}</b>{' '}
                  {t('Elle s’applique aux paquets acceptés à partir de cette date ; un paquet accepté avant garde sa grille.')} {!proprio && t('Le propriétaire doit l’accepter dans Contrat et documents.')}
                </Banniere>
                {montants && v2.changements.length > 0 && (
                  <Panel titre={tf('Ce qui change en {v}', { v: v2.version })} icone="megaphone" droite={<Pill ton="acc" sm icone="calendar-clock">{tf('Annoncée · {j} jours', { j: REGLES.preavisGrilleJ })}</Pill>} style={{ marginTop: 16 }}>
                    {v2.changements.map((c) => (
                      <div className="entb-diff mt8" key={c.code}>
                        <div className="grow">
                          <b>{t(NOM_LIGNE[c.code])}</b>
                          {c.controle === 'au_dessus' && <div className="t13 c3 mt4">{t('Ligne au-dessus du plafond : bloquée par la console jusqu’à décision écrite de BelivaY.')}</div>}
                        </div>
                        <div className="entb-diff-v">
                          {c.avant !== null && (
                            <>
                              <span className="old">
                                <Montant n={c.avant} />
                              </span>
                              <Icone nom="arrow-right" taille={18} />
                            </>
                          )}
                          <span className="new">
                            <Montant n={c.apres} />
                          </span>
                        </div>
                      </div>
                    ))}
                    <Hint icone="history">{t('Chaque commande garde une copie figée de la ligne appliquée : une révision ne change jamais un paquet déjà accepté.')}</Hint>
                  </Panel>
                )}
              </>
            )}

            {/* Grille d'achat (lecture seule) */}
            {montants && <div style={{ marginTop: 16 }}>{g ? <GrilleAchat g={g} nom={nom} /> : <Chargement n={2} />}</div>}

            {/* Les délais appliqués à un paquet (frise) */}
            <Panel titre={t('Les délais appliqués à un paquet')} icone="calendar-clock" droite={<Pill ton="ink" sm icone="cpu">{t('Calculé par le serveur')}</Pill>} style={{ marginTop: 16 }}>
              <Frise
                items={[
                  { t: t('Publication à votre entreprise'), d: t('Zone, relais de dépôt et quartiers des boutiques ; ni nom de boutique ni client.'), st: 'done' },
                  { t: tf('Acceptation en {d} au plus', { d: duree(d.acceptationMin) }), d: tf('Fenêtre de priorité de {d} au premier rang.', { d: duree(d.prioriteMin) }), st: 'done' },
                  { t: tf('Ramassages terminés en {d} au plus', { d: duree(d.ramassageMin) }), d: t('À compter de l’acceptation, dans l’ordre imposé des arrêts ; code du vendeur et photos par colis.'), st: 'cur' },
                  { t: tf('Heure limite : moins de {h} h', { h: d.livraisonH }), d: minoration !== null ? tf('Depuis le plus ancien « C’est prêt » ; au-delà : −{p} % sur chaque colis en retard.', { p: minoration }) : t('Depuis le plus ancien « C’est prêt ».') },
                  { t: tf('Dépôt au relais {m} avant sa fermeture', { m: duree(d.depotAvantFermetureMin) }), d: t('Preuves synchronisées : prestation validée, payée le vendredi qui suit.') },
                ]}
              />
            </Panel>

            <div className="g g2">
              <div>
                <Panel titre={t('Délais contractuels (SLA)')} icone="timer" droite={<Fixe />}>
                  <Li icone="timer" ton="or" t={t('Accepter un paquet')} s={tf('{d} après sa publication', { d: duree(d.acceptationMin) })} />
                  <Li icone="crown" ton="acc" t={t('Fenêtre de priorité du premier rang')} s={tf('{d}, puis les autres entreprises de la zone le voient', { d: duree(d.prioriteMin) })} droite={<Pill ton="amber" sm>{t('Paramètre proposé')}</Pill>} />
                  <Li icone="package-check" ton="acc" t={t('Ramassage')} s={tf('au plus tard {d} après l’acceptation', { d: duree(d.ramassageMin) })} />
                  <Li icone="clock" ton="acc" t={t('Livraison')} s={tf('moins de {h} h, de « C’est prêt » à la remise au relais ou au client', { h: d.livraisonH })} />
                  <Li icone="store" ton="blue" t={t('Dépôt au relais')} s={tf('au plus tard {d} avant sa fermeture', { d: duree(d.depotAvantFermetureMin) })} />
                  <Li icone="siren" ton="ink" t={t('Décision sur un incident bloquant')} s={tf('{d} au plus', { d: duree(d.incidentMin) })} />
                  <Li icone="calendar" ton="ink" t={t('Service')} s={d.heuresService} />
                  <Li icone="route" ton="ink" t={t('Tournées relais')} s={tf('{n} par jour ; départ dès {s} colis, obligatoire au 2e créneau d’attente', { n: d.tourneesJour, s: d.seuilDepart })} />
                  <ReglageAlertes />
                </Panel>
                {montants && g && (
                  <Panel titre={t('Versions de la grille')} icone="history" style={{ marginTop: 16 }}>
                    <Frise
                      items={g.versions.map((v) => ({
                        t: <>{v.version} · {v.statut === 'en_vigueur' ? tf('en vigueur depuis le {d}', { d: jour(v.du) }) : v.statut === 'archivee' ? tf('archivée, du {d}', { d: jour(v.du) }) : tf('annoncée, en vigueur le {d}', { d: jour(v.du) })}</>,
                        d: v.changements.length ? v.changements.map((c) => `${t(NOM_LIGNE[c.code])} : ${c.avant !== null ? F(c.avant) + ' F → ' : ''}${F(c.apres)} F`).join(' · ') : v.statut === 'en_vigueur' ? t('S’applique à chaque paquet accepté depuis cette date.') : undefined,
                        st: v.statut === 'en_vigueur' ? 'cur' : v.statut === 'archivee' ? 'done' : '',
                      }))}
                    />
                    <Limite icone="calendar-clock" titre={tf('Préavis d’une nouvelle grille : {j} jours', { j: REGLES.preavisGrilleJ })} texte={t('elle ne prend effet qu’à sa date, pour les paquets acceptés ensuite')} />
                    <p className="t13 mt8">
                      <Link className="lv-lien" to={chemin('parametres-journal')}>{t('Journal des changements')}</Link>
                    </p>
                    <Hint icone="history">{tf('Une nouvelle grille est annoncée {j} jours avant et ne vaut que pour les paquets acceptés après sa date. Chaque paquet garde la ligne de grille figée à son acceptation.', { j: REGLES.preavisGrilleJ })}</Hint>
                  </Panel>
                )}
              </div>
              <div>
                {montants && supp.donnees && (
                  <Panel titre={t('Suppléments et minoration')} icone="receipt-text" droite={<Fixe />}>
                    {supp.donnees.map((x) => (
                      <Li
                        key={x.code}
                        icone={ICONE_SUPP[x.code]}
                        ton={x.code === 'minoration' ? 'red' : 'acc'}
                        t={t(NOM_SUPPLEMENT[x.code])}
                        rv={x.pourcentage !== null ? <span className="cr">{tf('−{p} %', { p: x.pourcentage })}</span> : x.base === 'course' ? <>{t('course')} + <Montant n={x.montant!} /></> : <Montant n={x.montant!} signe={x.base === 'colis'} />}
                      />
                    ))}
                    {prix('relais_5_9') !== undefined && minoration !== null && <Simulateur prixColis={prix('relais_5_9')!} pct={minoration} />}
                    <Hint icone="hand-coins">{tf('Payés à {n} par BelivaY, puis imputés à la partie responsable selon les preuves. Jamais demandés au client ni au vendeur.', { n: nom })}</Hint>
                  </Panel>
                )}
                {paliers.donnees && (
                  <Panel titre={t('Palier et plafond de valeur')} icone="shield-check" droite={<Fixe />} style={montants && supp.donnees ? { marginTop: 16 } : undefined}>
                    <Paliers p={paliers.donnees} />
                  </Panel>
                )}
              </div>
            </div>
            <Note ton="ink" icone="eye-off">
              {t('Vous voyez seulement votre grille d’achat. Les prix payés par les clients forment une autre grille, reliée par la zone. Si votre agence sert aussi de point relais, cette rémunération relève de l’accord relais distinct et se suit dans l’espace point relais.')}
            </Note>
          </>
        )}
      </Px>
      <FeuilleRevision ouverte={revision.ouverte} fermer={revision.fermer} />
    </Ecran>
  )
}
