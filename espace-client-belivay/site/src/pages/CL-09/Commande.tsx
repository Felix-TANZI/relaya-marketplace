// Écran « Ma commande » (CL-09), forme d'origine du prototype rendue réelle (DP-54) : la commande (?ref=…) lue dans
// les données : en-tête (payée, validée, retirée ou annulée ; retrait prévu, arrivée, retour possible, dossier),
// état et mode ; bandeau d'action (code de retrait, montant à payer au comptoir, dossier de litige) ; suivi (plan,
// étape, relais, colis par colis) ; chronologie datée ; preuves ; point relais (changer de relais) ; litige protégé
// (signaler, dans la fenêtre de retour) ; constat au comptoir ; articles (étagère, annulés et remboursés, noter) ;
// cycle de vie du paiement ; résumé (garde, comptoir, remboursements) et facture (partager, PDF) ; livraison
// (relais, téléphone, livreur) ; modifier, annuler, changer de relais ou d'adresse, faire retirer par quelqu'un,
// frais de garde, avis ; racheter ; une question.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import img_be926f70d2b8_png from '../../assets/prototype/be926f70d2b8.png'
import { Ecran } from '../../composants/coque'
import { Aside, Colonne, Gabarit, Zone } from '../../composants/Gabarits'
import { useDes } from '../../composants/ecran'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { enregistrerFichier, partagerFichier, pdfTexte } from '../../donnees/pdf'
import { NOM_PAYE_PAR, source, type CommandeClient, type Facture, type Litige } from '../../donnees/source'
import { F } from '../../i18n/format'
import { dateA, jourSeul, quand } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { useMajSession, useSession } from '../../session'
import { CommandeIntrouvable } from '../CL-08/Confirmee'
import { distance, echeancier, grosColis, minutesAPied, nbArticles, ouvertureDuJour, tarifGarde, useRelais } from './Commun'

const FENETRE_JOURS = 7
const PAIEMENT_VENDEUR_JOURS = 3 // après la fin du délai de retour

interface Pas {
  t?: string // heure ou date
  b: string
  p?: string
  d: '' | 'cur' | 'fut' | 'red'
  ic?: string
}

export function Commande() {
  const [params] = useSearchParams()
  const ref = params.get('ref') ?? 'BLV-52018'
  const corps = useCorpsCommande(ref)
  const colonnes = useDes('tab-l')
  if (corps === undefined) return null
  if (!corps) return <CommandeIntrouvable route="commande" />
  return (
    <Ecran route="commande" sousTitre={corps.c.ref} fixes={corps.fixes} largeur={colonnes ? 'moyen' : undefined}>
      <div className="cl09">{colonnes ? <DispositionCommande m={corps.morceaux} /> : corps.morceaux.telephone}</div>
    </Ecran>
  )
}

// Grands écrans (DISPOSITION-ECRANS.md § 5.8) : en tête, pleine largeur, le titre de la commande ; au centre le suivi,
// la chronologie, Preuves, Point relais et Litige protégé côte à côte, le constat au comptoir et les articles ; dans
// l'aside collant, le bandeau d'action (code, montant à payer, dossier), le cycle de vie du paiement, le résumé et la
// facture, la livraison et « Modifier ma commande ». Aussi employé dans le détail de Mes commandes (maître-détail).
export function DispositionCommande({ m }: { m: MorceauxCommande }) {
  const { t } = usePreferences()
  return (
    <Gabarit forme="colonnes" classe="c9-cols">
      <Zone nom="haut">
        {m.entete}
        {m.message}
      </Zone>
      <Colonne>
        {m.suivi}
        {m.chronologie}
        <div className="c9-trio">
          {m.preuves}
          {m.relais}
          {m.litigeProtege}
        </div>
        {m.retirer}
        {m.constat}
        {m.articles}
      </Colonne>
      <Aside titre={t('Paiement et livraison')}>
        {m.bandeau}
        {m.cycle}
        {m.resume}
        {m.livraison}
        {m.securite}
        {m.racheter}
        {m.liens}
      </Aside>
    </Gabarit>
  )
}

export type MorceauxCommande = Record<'entete' | 'message' | 'bandeau' | 'suivi' | 'chronologie' | 'preuves' | 'relais' | 'retirer' | 'litigeProtege' | 'constat' | 'articles' | 'cycle' | 'resume' | 'livraison' | 'securite' | 'racheter' | 'liens' | 'telephone', ReactNode>

// La commande « ref » et ses blocs : « telephone » les donne dans l'ordre d'origine, les autres un à un pour les
// grands écrans. undefined : chargement ; null : introuvable.
export function useCorpsCommande(ref: string): { c: CommandeClient; morceaux: MorceauxCommande; fixes: ReactNode } | null | undefined {
  const { t, tf, langue } = usePreferences()
  const session = useSession()
  const majSession = useMajSession()
  const [d, setD] = useState<{ commande: CommandeClient; maintenant: number } | null | undefined>(undefined)
  const [facture, setFacture] = useState<Facture | null>(null)
  const [litige, setLitige] = useState<Litige | null>(null)
  const [feuille, setFeuille] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [pdfMsg, setPdfMsg] = useState<string | null>(null)
  const relais = useRelais(d?.commande.mode === 'relais' ? d.commande.lieu : null)
  useEffect(() => {
    // Maître-détail de Mes commandes : une autre commande choisie repart de zéro (facture, dossier, message).
    setFacture(null)
    setLitige(null)
    setFeuille(false)
    setMessage(null)
    source.commandeClient(ref).then(setD)
    source.factures().then((x) => setFacture(x.factures.find((f) => f.ref === ref) ?? null))
  }, [ref])
  useEffect(() => {
    const id = d?.commande.litige
    if (id) source.litige(id).then((x) => setLitige(x?.litige ?? null))
  }, [d?.commande.litige])
  if (d === undefined) return undefined
  if (!d) return null
  const c = d.commande
  const maintenant = d.maintenant
  const colis = c.colis.filter((x) => !x.annule)
  const n = colis.length
  const domicile = c.mode === 'domicile'
  const gerant = relais ? t(relais.gerant) : t('le gérant')
  const moyen = facture ? `${t(NOM_PAYE_PAR[facture.payePar.operateur])} ${facture.payePar.numero}`.trim() : t('Mobile Money')
  const numero = session.client?.numeroMasque ?? ''
  const retourOuvert = c.etat === 'retiree' && c.retourJusqua !== null && maintenant < c.retourJusqua
  const enCoursPrepa = c.etat === 'preparation' || c.etat === 'route'
  const auRelais = c.etat === 'retirable' || c.etat === 'comptoir'
  const sousTotal = c.colis.reduce((s, x) => s + x.prix * x.qte, 0)
  const rembourseColis = c.colis.reduce((s, x) => s + (x.annule?.rembourse ?? 0), 0)
  const boutiques = [...new Set(colis.map((x) => t(x.boutique)))]
  const vendeurPayeLe = c.retourJusqua ? c.retourJusqua + PAIEMENT_VENDEUR_JOURS * 864e5 : null
  const gros = grosColis(c)
  // Au relais : jusqu'à quand retirer (avant le renvoi au vendeur) ; colis de valeur : porteur nommé (CCD-09).
  const ech = auRelais && c.garde && relais ? echeancier(c, maintenant, relais.ferme) : null
  const valeur = colis.reduce((s, x) => s + x.prix * x.qte, 0)

  // En-tête.
  const statut = {
    retirable: { cl: 'g', ic: 'package-check', tx: 'Retirable' },
    comptoir: { cl: 'or', ic: 'wallet', tx: 'À payer au retrait' },
    preparation: { cl: 'a', ic: 'clock', tx: 'En préparation' },
    route: { cl: 'a', ic: 'truck', tx: 'En route' },
    paiement: { cl: 'a', ic: 'clock', tx: 'En attente de paiement' },
    litige: { cl: 'r', ic: 'scale', tx: 'En litige' },
    retiree: { cl: 'g', ic: 'package-check', tx: 'Retirée' },
    annulee: { cl: 'n', ic: 'x', tx: 'Annulée' },
  }[c.etat]
  const quandPaye =
    c.etat === 'retiree' && c.retireeLe
      ? tf('Retirée le {d}', { d: jourSeul(c.retireeLe, langue) })
      : c.etat === 'annulee' && c.annulee
        ? tf('Annulée le {d}', { d: jourSeul(c.annulee.le, langue) })
        : c.etat === 'litige' && c.retireeLe
          ? tf('Retirée le {d}', { d: jourSeul(c.retireeLe, langue) })
          : jourSeul(c.payeeLe, langue) === jourSeul(maintenant, langue)
            ? tf(c.comptoir ? 'Validée {d}' : 'Payée {d}', { d: quand(c.payeeLe, maintenant, langue) })
            : tf(c.comptoir ? 'Validée le {d}' : 'Payée le {d}', { d: jourSeul(c.payeeLe, langue) })
  const suite =
    c.etat === 'retirable'
      ? tf('Arrivés au relais le {d} · retire-les quand tu veux', { d: dateA(c.arriveeLe ?? c.payeeLe, langue) })
      : c.etat === 'comptoir'
        ? tf('Arrivée au relais {d} · ton code s’affiche après le paiement', { d: quand(c.arriveeLe ?? c.payeeLe, maintenant, langue) })
        : enCoursPrepa
          ? c.pretLe
            ? tf(domicile ? 'Livraison prévue {d}' : 'Retrait prévu {d} · un seul code pour les {n} colis', { d: quand(c.pretLe, maintenant, langue), n })
            : t('Un seul code pour tous les colis')
          : c.etat === 'litige'
            ? litige
              ? tf('Dossier {id} · le vendeur répond au plus tard le {d}', { id: litige.id, d: dateA(litige.echeance, langue) })
              : tf('Dossier {id}', { id: c.litige ?? '' })
            : c.etat === 'annulee' && c.annulee
              ? tf('{m} F remboursés sur ton {p} le jour même', { m: F(c.annulee.rembourse), p: moyen })
              : retourOuvert
                ? tf('Retour possible jusqu’au {d}', { d: jourSeul(c.retourJusqua!, langue) })
                : c.etat === 'paiement'
                  ? t('Paiement en attente de validation')
                  : t('Commande close')

  // Bandeau d'action.
  const bandeau: { b: string; s: string; vers: string; ic: string; l: string } | null =
    c.etat === 'retirable'
      ? { b: tf('Code de retrait · {n} colis', { n }), s: t('Un seul code, masqué jusqu’à ce que tu le montres'), vers: chemin('code', { ref: c.ref }), ic: 'qr-code', l: t('Mon code') }
      : c.etat === 'comptoir'
        ? (c.comptoir?.du ?? 0) > 0
          ? { b: tf('{m} F à payer au comptoir', { m: F((c.comptoir?.du ?? 0) + (c.garde?.du ?? 0)) }), s: t('Ton code se débloque dès le paiement confirmé'), vers: chemin('comptoir-payer', { ref: c.ref }), ic: 'smartphone', l: t('Payer') }
          : { b: tf('Code de retrait · {n} colis', { n }), s: t('Payé : ton code est débloqué'), vers: chemin('code', { ref: c.ref }), ic: 'qr-code', l: t('Mon code') }
        : c.etat === 'litige'
          ? {
              b: litige && litige.echeance > maintenant ? tf('Dossier {id} · réponse sous {h} h', { id: litige.id, h: Math.ceil((litige.echeance - maintenant) / 3600e3) }) : tf('Dossier {id}', { id: c.litige ?? '' }),
              s: tf('Colis gardé au relais, {m} F bloqués', { m: F(litige?.montant ?? c.total) }),
              vers: chemin('litige-suivi', { id: c.litige ?? '' }),
              ic: 'scale',
              l: t('Suivre'),
            }
          : null

  // Étape (plan) : boutique, emballé, au relais, retiré.
  const etapeColis = (x: (typeof colis)[number]) => (c.etat === 'retiree' ? 3 : x.arrive ? 2 : x.statut === 'recupere' ? 1 : 0)
  const k = c.etat === 'retiree' ? 4 : c.etat === 'litige' ? 2 : colis.length ? Math.min(...colis.map(etapeColis)) : 0
  const sousSuivi =
    c.etat === 'retiree'
      ? tf('Commande retirée au {l}', { l: t(c.lieu) })
      : c.etat === 'litige'
        ? t('Colis gardé au relais pendant le litige')
        : auRelais
          ? t('Tes colis t’attendent au relais')
          : enCoursPrepa
            ? c.pretLe
              ? tf('En préparation dans {b} boutique(s) · retrait {d}', { b: boutiques.length, d: quand(c.pretLe, maintenant, langue) })
              : tf('En préparation dans {b} boutique(s)', { b: boutiques.length })
            : t(c.lieu)

  // Chronologie datée.
  const chrono: Pas[] = []
  for (const e of c.etapes.filter((x) => x.le)) {
    const rouge = /annul|litige|Remplacement/i.test(e.titre)
    const p = /^Payée|^Validée/.test(e.titre)
      ? c.comptoir
        ? tf('{m} F en {p} · le reste se paie au retrait', { m: F(c.comptoir.livraisonPayee), p: moyen })
        : tf('{p} · ton argent est bloqué chez BelivaY', { p: moyen })
      : /Préparée/.test(e.titre)
        ? tf('Colis emballés et scellés devant {b}', { b: boutiques.join(', ') })
        : /Arrivée/.test(e.titre)
          ? [tf('{n} colis au {l}', { n, l: t(c.lieu) }), colis.some((x) => x.etagere) ? tf('étagère(s) {e}', { e: colis.map((x) => x.etagere).filter(Boolean).join(', ') }) : null, t('code envoyé par SMS')].filter(Boolean).join(' · ')
          : /^Retirée/.test(e.titre)
            ? tf('Photo de remise prise par {g}', { g: gerant })
            : rouge && c.etat === 'litige'
              ? t('Colis gardé au relais · paiement bloqué')
              : undefined
    chrono.push({ t: dateA(e.le!, langue), b: t(e.titre), p, d: rouge ? 'red' : '', ic: rouge ? 'triangle-alert' : undefined })
  }
  if (c.garde && auRelais && c.arriveeLe) {
    chrono.push({ t: jourSeul(c.arriveeLe + 864e5, langue), b: gros ? tf('Garde : {a} F le 1er jour (gros colis), puis {m} F par jour', { a: F(tarifGarde(1, true)), m: F(tarifGarde(2, true)) }) : tf('Garde : 1er jour gratuit, puis {m} F par jour', { m: F(tarifGarde(2, false)) }), d: '' })
    chrono.push({ t: t('aujourd’hui'), b: tf('Montant dû : {m} F', { m: F((c.garde?.du ?? 0) + (c.comptoir?.du ?? 0)) }), p: t('Tu le paies au retrait, sur ton téléphone'), d: 'cur' })
  }
  if (c.etat === 'retiree' && c.retourJusqua) {
    chrono.push(
      retourOuvert
        ? { t: tf('jusqu’au {d}', { d: jourSeul(c.retourJusqua, langue) }), b: t('Fenêtre de retour ouverte'), p: tf('Jour {j} sur {n} : le vendeur n’est pas encore payé', { j: Math.min(FENETRE_JOURS, Math.max(1, FENETRE_JOURS - Math.floor((c.retourJusqua - maintenant) / 864e5))), n: FENETRE_JOURS }), d: 'cur' }
        : { t: jourSeul(c.retourJusqua, langue), b: t('Fenêtre de retour close'), p: t('Aucun problème signalé'), d: '' },
    )
    if (vendeurPayeLe) chrono.push({ t: vendeurPayeLe < maintenant ? jourSeul(vendeurPayeLe, langue) : tf('après le {d}', { d: jourSeul(c.retourJusqua, langue) }), b: t('Vendeur payé'), p: tf('{n} jours après la fin du délai de retour', { n: PAIEMENT_VENDEUR_JOURS }), d: vendeurPayeLe < maintenant ? '' : 'fut' })
  }
  if (c.etat === 'annulee' && c.annulee) chrono.push({ t: jourSeul(c.annulee.le, langue), b: tf('{m} F remboursés', { m: F(c.annulee.rembourse) }), p: tf('Sur ton {p}, le jour même', { p: moyen }), d: '' })
  for (const x of c.colis.filter((y) => y.annule)) chrono.push({ t: jourSeul(x.annule!.le, langue), b: tf('Colis {n} annulé · {b}', { n: x.n, b: t(x.boutique) }), p: tf('{m} F remboursés · {r}', { m: F(x.annule!.rembourse), r: t(x.annule!.motif) }), d: 'red', ic: 'triangle-alert' })
  if (c.etat === 'litige' && litige) chrono.push({ t: dateA(litige.echeance, langue), b: t('Réponse du vendeur au plus tard'), p: t('Sans réponse, BelivaY tranche en ta faveur'), d: litige.echeance > maintenant ? 'fut' : '' })
  const aVenir = c.etapes.filter((x) => !x.le)
  aVenir.forEach((e, i) => chrono.push({ t: i === 0 && c.pretLe && enCoursPrepa ? quand(c.pretLe, maintenant, langue) : t('à venir'), b: t(e.titre), p: i === aVenir.length - 1 && auRelais ? t('Le vendeur est payé après ton retrait') : undefined, d: i === 0 && !chrono.some((x) => x.d === 'cur') ? 'cur' : 'fut' }))

  // Cycle de vie du paiement.
  const cycle: Pas[] =
    c.etat === 'annulee'
      ? [
          { b: t('Paiement confirmé'), p: jourSeul(c.payeeLe, langue), d: '' },
          { b: t('Commande annulée'), p: c.etapes.find((x) => /annul/i.test(x.titre))?.titre ? t(c.etapes.find((x) => /annul/i.test(x.titre))!.titre) : undefined, d: 'red', ic: 'lock' },
          { b: t('Remboursé'), p: tf('{m} F sur {p}', { m: F(c.annulee?.rembourse ?? c.total), p: moyen }), d: '' },
        ]
      : c.etat === 'litige'
        ? [
            { b: t('Paiement confirmé'), p: tf('{m} F', { m: F(c.total) }), d: '' },
            { b: t('Argent bloqué pendant le litige'), p: tf('{m} F · rien n’est versé', { m: F(litige?.montant ?? c.total) }), d: 'red', ic: 'lock' },
            { b: t('Décision'), p: t('Au plus tard après la réponse du vendeur'), d: 'fut' },
            { b: t('Remboursement ou paiement du vendeur'), p: t('Selon la décision'), d: 'fut' },
          ]
        : c.comptoir && c.etat !== 'retiree'
          ? [
              { b: t('Livraison payée'), p: tf('{d} · {m} F', { d: jourSeul(c.payeeLe, langue), m: F(c.comptoir.livraisonPayee) }), d: '' },
              { b: t('Montant dû au retrait'), p: c.comptoir.du ? tf('{m} F, sur ton téléphone', { m: F(c.comptoir.du) }) : t('Payé'), d: c.comptoir.du ? 'cur' : '' },
              { b: t('Code débloqué, colis remis'), d: c.comptoir.du ? 'fut' : 'cur' },
              { b: t('Vendeur payé'), p: t('Après ta confirmation ou la fin du délai de retour'), d: 'fut' },
            ]
          : c.etat === 'retiree'
            ? [
                { b: t('Paiement confirmé'), p: jourSeul(c.payeeLe, langue), d: '' },
                { b: t('Retrait au relais'), p: c.retireeLe ? dateA(c.retireeLe, langue) : undefined, d: '' },
                ...(retourOuvert ? [{ b: t('Fenêtre de retour'), p: tf('Jusqu’au {d}', { d: jourSeul(c.retourJusqua!, langue) }), d: 'cur' as const }] : []),
                { b: t('Vendeur payé'), p: t(retourOuvert ? 'Après la fenêtre, sauf problème' : 'Après la fenêtre de retour'), d: retourOuvert ? ('fut' as const) : ('' as const) },
              ]
            : [
                { b: t('Paiement confirmé'), p: tf('{d} · {m} F', { d: quand(c.payeeLe, maintenant, langue), m: F(c.total) }), d: '' },
                { b: t('Argent bloqué chez BelivaY'), p: t('Jusqu’à ton retrait'), d: 'cur' },
                { b: t(domicile ? 'Livraison' : 'Retrait au relais'), p: c.garde?.du ? tf('Avec ton code et le montant dû ({m} F)', { m: F(c.garde.du) }) : c.pretLe && enCoursPrepa ? quand(c.pretLe, maintenant, langue) : t('Avec ton code'), d: 'fut' },
                { b: t(boutiques.length > 1 ? 'Vendeurs payés' : 'Vendeur payé'), p: t('Après ta confirmation ou la fin du délai de retour'), d: 'fut' },
              ]

  const tl = (pas: Pas[]) => (
    <div className="c9-tl">
      {pas.map((x, i) => (
        <div key={i} className={x.d === 'fut' ? 'fut' : ''}>
          <span className={'d ' + x.d}>
            <Icone nom={x.ic ?? (x.d === 'cur' ? 'clock' : x.d === 'fut' ? 'circle' : 'check')} taille={13} trait={2.6} />
          </span>
          <div className="grow">
            {x.t && <span className="t">{x.t}</span>}
            <b>{x.b}</b>
            {x.p && <p>{x.p}</p>}
          </div>
        </div>
      ))}
    </div>
  )
  const boite = (ic: string, titre: string, sous: string | null, corps: ReactNode, cls = '') => (
    <section className={'c9-box' + cls}>
      <div className="bh">
        <span className="i">
          <Icone nom={ic} taille={18} />
        </span>
        <div>
          <b>{titre}</b>
          {sous && <span>{sous}</span>}
        </div>
      </div>
      {corps}
    </section>
  )
  const lien = (vers: string, ic: string, lt: string, ls?: string, rouge = false) => (
    <Link key={lt} to={vers} className="li">
      <span className={'ic ' + (rouge ? 'red' : '')}>
        <Icone nom={ic} taille={20} />
      </span>
      <span className="grow">
        <span className="lt" style={{ display: 'block', ...(rouge ? { color: 'var(--red)' } : {}) }}>
          {lt}
        </span>
        {ls && (
          <span className="ls" style={{ display: 'block' }}>
            {ls}
          </span>
        )}
      </span>
      <span className="chev">
        <Icone nom="chevron-right" taille={18} />
      </span>
    </Link>
  )

  // Facture (commande retirée) : lignes de la facture émise, sinon celles de la commande.
  const lignesFacture = facture?.lignes ?? [...colis.map((x) => ({ libelle: x.produit + (x.qte > 1 ? ' × ' + x.qte : ''), montant: x.prix * x.qte })), { libelle: domicile ? 'Livraison à domicile' : 'Livraison au relais', montant: c.livraison }]
  const totalFacture = facture?.total ?? c.total
  const pdf = () =>
    pdfTexte([
      { texte: 'BelivaY', taille: 22, gras: true },
      { texte: t('Facture · ') + c.ref, taille: 15, gras: true, espace: 10 },
      { texte: t('Émise par BelivaY · Yaoundé, Cameroun'), taille: 10 },
      ...lignesFacture.map((l, i) => ({ texte: t(l.libelle), droite: F(l.montant) + ' F', espace: i ? 0 : 18 })),
      { texte: t('Total payé'), droite: F(totalFacture) + ' F', gras: true, espace: 8 },
      { texte: t('Payé par') + ' : ' + moyen, espace: 18 },
    ])
  const nomPdf = `BelivaY-facture-${c.ref}.pdf`
  const feuilleFacture = feuille && (
    <>
      <div className="veil" onClick={() => setFeuille(false)}></div>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={t('Facture')}>
        <div className="grab"></div>
        <b className="t17 b8">{t('Facture')}</b>
        <div className="cl09-inv">
          <div className="ih">
            <img src={img_be926f70d2b8_png} alt="BelivaY" />
            <span className="right t12 c3">
              {tf('Facture {ref}', { ref: c.ref })}
              <br />
              {jourSeul(c.retireeLe ?? c.payeeLe, langue) + ' ' + new Date((c.retireeLe ?? c.payeeLe) + 3600e3).getUTCFullYear()}
            </span>
          </div>
          <div className="t12 c3 mt10">{tf('Cliente : {n} · {l}', { n: session.client?.nomComplet ?? '', l: t(c.lieu) })}</div>
          <div className="hr"></div>
          <div className="recap">
            {lignesFacture.map((l, i) => (
              <div key={i} className="kv">
                <span className="k">{t(l.libelle)}</span>
                <span className="v ">{F(l.montant) + ' F'}</span>
              </div>
            ))}
          </div>
          <div className="total">
            <span className="tl2">{t('Total payé')}</span>
            <span className="price">
              {F(totalFacture)}
              <small>{t(' F')}</small>
            </span>
          </div>
          <div className="t12 c3 mt8">{tf('{p} · émise par BelivaY', { p: moyen })}</div>
        </div>
        <div className="btns">
          <button type="button" className="btn primary" onClick={() => partagerFichier(pdf(), nomPdf, t('Facture · ') + c.ref).then((r) => r === 'enregistre' && setPdfMsg(t('PDF enregistré sur le téléphone.')))}>
            <Icone nom="share" taille={18} />
            <span>{t('Partager la facture')}</span>
          </button>
        </div>
        <div className="btns">
          <button type="button" className="btn secondary" onClick={() => (enregistrerFichier(pdf(), nomPdf), setPdfMsg(t('PDF enregistré sur le téléphone.')))}>
            <Icone nom="download" taille={18} />
            <span>{t('Enregistrer le PDF')}</span>
          </button>
        </div>
        {pdfMsg && (
          <div className="hint-l" role="status">
            <Icone nom="check" taille={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{pdfMsg}</span>
          </div>
        )}
        <div className="links">
          <Link to={chemin('factures')}>{t('Toutes mes factures')}</Link>
        </div>
      </div>
    </>
  )
  const racheter = async () => {
    const r = await source.racheter(c.ref)
    setMessage(tf('{n} article(s) remis au panier.', { n: r }))
    majSession(await source.session())
  }
  const preuve = litige?.preuves.find((p) => p.dessin)

  const bEntete = (
    <>
      <div className="c9-dh">
        <div className="k">{t('Suivi de commande')}</div>
        <h1>{tf('Commande {ref}', { ref: c.ref })}</h1>
        <p>
          <span>{quandPaye}</span>
          {' · '}
          <span>{suite}</span>
        </p>
        <div className="pls">
          <span className={'c9-st ' + statut.cl}>
            <Icone nom={statut.ic} taille={13} trait={2.4} />
            {t(statut.tx)}
          </span>
          <span className="c9-st o">
            <Icone nom={domicile ? 'house' : 'store'} taille={13} />
            {t(domicile ? 'Livraison à domicile' : 'Retrait au relais')}
          </span>
        </div>
      </div>
    </>
  )
  const bMessage = (
    <>
      {message && (
        <div className="note green" role="status">
          <Icone nom="circle-check" taille={18} />
          <div>
            {message} <Link to={chemin('panier')}>{t('Voir le panier')}</Link>
          </div>
        </div>
      )}
    </>
  )
  const bBandeau = (
    <>
      {bandeau && (
        <div className="c9-code">
          <span className="grow">
            <b>{bandeau.b}</b>
            <span>{bandeau.s}</span>
          </span>
          <Link to={bandeau.vers}>
            <Icone nom={bandeau.ic} taille={16} />
            {bandeau.l}
          </Link>
        </div>
      )}
    </>
  )
  const bSuivi = (
    <>
      {c.etat !== 'annulee' &&
        boite(
          'navigation',
          t('Suivi de commande'),
          sousSuivi,
          <>
            {!domicile && (
              <div className="c9-map" style={{ height: '170px' }}>
                <Dessin id="2876769b5cb9" />
                <span className="zm">
                  <span>
                    <Icone nom="plus" taille={14} />
                  </span>
                  <span>
                    <Icone nom="minus" taille={14} />
                  </span>
                </span>
                <span className="at">{t('Plan indicatif')}</span>
              </div>
            )}
            <div className="c9-stg">
              {(
                [
                  ['Boutique', 'store'],
                  ['Emballé, scellé', 'package'],
                  [domicile ? 'En route' : 'Au relais', domicile ? 'truck' : 'map-pin'],
                  [domicile ? 'Livré' : 'Retiré', 'hand'],
                ] as const
              ).map(([x, ic], i) => (
                <div key={x} className={i < k ? 'ok' : i === k ? 'cur' : ''}>
                  <span className="c">
                    <Icone nom={i < k ? 'check' : ic} taille={20} />
                  </span>
                  {t(x)}
                </div>
              ))}
            </div>
            <div className="c9-kv">
              <span>{t(domicile ? 'Adresse de livraison' : 'Point de retrait')}</span>
              <b>{relais ? tf('{l} · {d} de chez toi', { l: t(c.lieu), d: distance(relais.km) }) : t(c.lieu)}</b>
            </div>
            {c.etat !== 'retiree' && (
              <div className="c9-kv">
                <span>{t('Colis')}</span>
                <b>
                  <Link to={chemin('suivi', { ref: c.ref })} className="cor">
                    {t('Voir colis par colis ')}
                    <Icone nom="chevron-right" taille={14} style={{ verticalAlign: '-2px' }} />
                  </Link>
                </b>
              </div>
            )}
          </>,
        )}
    </>
  )
  const bChronologie = (
    <>
      {boite('file-clock', t('Chronologie'), t('Chaque étape est datée et gardée'), tl(chrono))}
    </>
  )
  const bPreuves = (
    <>
      <div className="c9-in g">
        <div className="k">
          <Icone nom="shield-check" taille={15} />
          {t('Preuves BelivaY')}
        </div>
        <p>{t('Emballage scellé devant le vendeur, photo de remise au comptoir et horaires de chaque étape : tout est gardé pour te protéger.')}</p>
      </div>
    </>
  )
  const bRelais = (
    <>
      {c.etat === 'annulee' ? (
        <div className="c9-in n">
          <div className="k">
            <Icone nom="info" taille={15} />
            {t('Pourquoi')}
          </div>
          <p>
            {t(c.etapes.find((x) => /annul/i.test(x.titre))?.titre ?? 'Commande annulée')}
            {'. '}
            {tf('{m} F remboursés. Une commande annulée n’a pas de facture.', { m: F(c.annulee?.rembourse ?? c.total) })}
          </p>
        </div>
      ) : (
        relais && (
          <div className="c9-in n">
            <div className="k">
              <Icone nom="map-pin" taille={15} />
              {t('Point relais')}
            </div>
            <p>
              <b>{t(c.lieu)}</b>
              {' · '}
              <span>{gerant}</span>
              {' · '}
              <span>{tf('{h}, fermé le {f}', { h: t(relais.horaires), f: t(relais.ferme) })}</span>
              {' · '}
              <span>{tf('{m} min à pied', { m: minutesAPied(relais.km) })}</span>
            </p>
            {(auRelais || enCoursPrepa) && !domicile && (
              <p>
                {(() => {
                  const o = ouvertureDuJour(relais, maintenant)
                  return tf(o.texte, o.v)
                })()}
                {ech && ' · ' + tf('Retire avant {d} au soir, sinon renvoi au vendeur', { d: jourSeul(ech.dernier.le, langue) })}
              </p>
            )}
            {(enCoursPrepa || auRelais) && (
              <Link to={chemin('changer-relais', { ref: c.ref })} className="bt s">
                <Icone nom="repeat" taille={15} />
                {t('Changer de relais')}
              </Link>
            )}
          </div>
        )
      )}
    </>
  )
  const bRetirer = (
    <>
      {(enCoursPrepa || auRelais) && !domicile && (
        <div className="c9-in n">
          <div className="k">
            <Icone nom="qr-code" taille={15} />
            {t('Pour retirer')}
          </div>
          <p>
            {c.etat === 'comptoir'
              ? tf('Paie {m} F sur ton téléphone (Mobile Money) : ton code se débloque, montre-le à {g}.', { m: F((c.comptoir?.du ?? 0) + (c.garde?.du ?? 0)), g: gerant })
              : tf('Montre ton code à 6 chiffres (ou son QR) à {g} : le code vaut le colis, pas besoin de pièce d’identité.', { g: gerant })}{' '}
            {valeur >= 100000
              ? tf('Commande de {m} F : la personne qui retire donne son nom et montre sa pièce d’identité.', { m: F(valeur) })
              : t('Quelqu’un peut retirer à ta place avec ton code.')}{' '}
            {c.garde?.du ? tf('Garde à payer au retrait : {m} F aujourd’hui.', { m: F(c.garde.du) }) : ''}
          </p>
          {auRelais && (
            <Link to={chemin('comptoir', { ref: c.ref })} className="bt s">
              <Icone nom="store" taille={15} />
              {t('Je suis au comptoir')}
            </Link>
          )}
        </div>
      )}
    </>
  )
  const bLitigeProtege = (
    <>
      {(enCoursPrepa || auRelais || retourOuvert) && (
        <div className="c9-in o">
          <div className="k">
            <Icone nom="scale" taille={15} />
            {t('Litige protégé')}
          </div>
          <p>
            {c.etat === 'comptoir'
              ? tf('Un problème ? Ouvre ton colis devant {g} avant de payer : un article abîmé ne se paie pas, BelivaY tranche.', { g: gerant })
              : retourOuvert
                ? tf('Un problème ? Ton paiement reste bloqué et BelivaY tranche. Tu as jusqu’au {d}.', { d: jourSeul(c.retourJusqua!, langue) })
                : t('Un problème ? Ton paiement reste bloqué et BelivaY tranche. Signale-le au comptoir ou ici.')}
          </p>
          <Link to={chemin('litige', { ref: c.ref })} className="bt">
            <Icone nom="circle-alert" taille={15} />
            {t('Signaler un problème')}
          </Link>
        </div>
      )}
    </>
  )
  const bConstat = (
    <>
      {c.etat === 'litige' && litige && (
        <div className="c9-box">
          <div className="split2">
            <div>
              <div className="photo">
                <Dessin id={preuve?.dessin ?? litige.dessin} />
              </div>
              {preuve && <div className="t12 c3 mt4">{t(preuve.sous)}</div>}
            </div>
            <div className="t13 c2" style={{ lineHeight: '1.45' }}>
              {tf(litige.origine === 'comptoir' ? '« Un problème » au comptoir : {p}.' : 'Ton signalement : {p}.', { p: t(litige.probleme).toLowerCase() })}
              {litige.souhait !== 'signal' && ' ' + t(litige.souhait === 'remplace' ? 'Tu souhaites être remplacée.' : 'Tu souhaites être remboursée.')}
            </div>
          </div>
        </div>
      )}
    </>
  )
  const bArticles = (
    <>
      {boite(
        'shopping-bag',
        t('Articles commandés'),
        tf('{n} colis · {a} article(s)', { n: c.colis.length, a: nbArticles(c) }),
        c.colis.map((x) => (
          <div key={x.n} className="c9-art">
            <span className="thumb" style={{ width: '56px', height: '56px', borderRadius: '12px' }}>
              <Dessin id={x.dessin} />
            </span>
            <div className="grow">
              <b>{x.p ? <Link to={chemin('fiche', { p: x.p })} style={{ color: 'inherit' }}>{t(x.produit)}</Link> : t(x.produit)}</b>
              <span>
                {tf('Colis {n}', { n: x.n })}
                {' · ' + x.qte + ' × ' + F(x.prix) + ' F'}
                {x.etagere && auRelais && ' · ' + tf('étagère {e}', { e: x.etagere })}
                {x.gros && !x.annule && ' · ' + t('gros colis')}
                {x.annule ? ' · ' + tf('annulée, {m} F remboursés', { m: F(x.annule.rembourse) }) : !x.arrive && enCoursPrepa ? ' · ' + t('pas encore arrivé') : ''}
              </span>
              {retourOuvert && x.p && (
                <Link to={chemin('avis-donner', { ref: c.ref })} className="rt">
                  <Icone nom="star" taille={15} />
                  {t('Noter cet article')}
                </Link>
              )}
            </div>
            <span className="pr">{x.annule ? <s>{F(x.prix * x.qte) + ' F'}</s> : F(x.prix * x.qte) + ' F'}</span>
          </div>
        )),
      )}
    </>
  )
  const bCycle = (
    <>
      {boite('wallet', t('Cycle de vie du paiement'), t('Où est ton argent, à chaque étape'), tl(cycle))}
    </>
  )
  const bResume = (
    <>
      {boite(
        'receipt',
        t('Résumé'),
        tf(c.comptoir ? 'Validée le {d} · {p}' : 'Payée le {d} · {p}', { d: jourSeul(c.payeeLe, langue), p: moyen }),
        <>
          {c.etat === 'annulee' ? (
            <>
              <div className="r">
                <span>{tf('Payé le {d}', { d: jourSeul(c.payeeLe, langue) })}</span>
                <span>{F(c.total) + ' F'}</span>
              </div>
              <div className="r">
                <span>{t('Remboursé')}</span>
                <span>{F(c.annulee?.rembourse ?? c.total) + ' F'}</span>
              </div>
            </>
          ) : (
            <>
              <div className="r">
                <span>{t('Sous-total articles')}</span>
                <span>{F(sousTotal) + ' F'}</span>
              </div>
              <div className="r">
                <span>{t(domicile ? 'Livraison à domicile' : 'Ramassage et remise au relais')}</span>
                <span>{c.livraison ? F(c.livraison) + ' F' : <span className="fr">{t('offert')}</span>}</span>
              </div>
              {rembourseColis > 0 && (
                <div className="r">
                  <span>{t('Remboursé (colis annulés)')}</span>
                  <span>{'− ' + F(rembourseColis) + ' F'}</span>
                </div>
              )}
              {c.garde && c.garde.du > 0 && (
                <div className="r">
                  <span>{tf('Garde (jour {j}) · à payer au retrait', { j: c.garde.jour })}</span>
                  <span>{F(c.garde.du) + ' F'}</span>
                </div>
              )}
              {c.comptoir && (
                <div className="r">
                  <span>{tf('Livraison payée le {d}', { d: jourSeul(c.payeeLe, langue) })}</span>
                  <span>{'− ' + F(c.comptoir.livraisonPayee) + ' F'}</span>
                </div>
              )}
            </>
          )}
          <div className="tt">
            <span>{t(c.comptoir && c.etat !== 'retiree' ? 'Montant dû au retrait' : c.etat === 'annulee' ? 'Solde' : 'Total payé')}</span>
            <b>{F(c.comptoir && c.etat !== 'retiree' ? c.comptoir.du : c.etat === 'annulee' ? Math.max(0, c.total - (c.annulee?.rembourse ?? 0)) : c.total) + ' F'}</b>
          </div>
          {(c.etat === 'retiree' || (c.etat === 'litige' && !!c.retireeLe)) && (
            <div className="btns mt12">
              <button type="button" className="btn secondary" onClick={() => (setPdfMsg(null), setFeuille(true))}>
                <Icone nom="file-text" taille={18} />
                <span>{t('Facture')}</span>
              </button>
            </div>
          )}
        </>,
        ' c9-sum',
      )}
    </>
  )
  const bLivraison = (
    <>
      {boite(
        'truck',
        t('Livraison'),
        null,
        <>
          <div className="c9-li">
            <Icone nom={domicile ? 'house' : 'map-pin'} taille={16} />
            <div>
              <b>{t(c.lieu)}</b>
              <span>{t(domicile ? 'Livraison à domicile, en main propre' : 'Retrait au comptoir avec ton code')}</span>
            </div>
          </div>
          <div className="c9-li">
            <Icone nom="smartphone" taille={16} />
            <div>
              <b>{t('Téléphone')}</b>
              <span>{tf('{n} · notifications et SMS', { n: numero })}</span>
            </div>
          </div>
          <div className="c9-li">
            <Icone nom="user-round" taille={16} />
            <div>
              <b>{t('Livreur')}</b>
              <span>
                {t(
                  c.etat === 'annulee'
                    ? 'Aucun · son numéro n’est jamais affiché'
                    : enCoursPrepa && !colis.every((x) => x.arrive)
                      ? 'Choisi par l’entreprise de livraison au ramassage · son numéro n’est jamais affiché'
                      : domicile
                        ? 'Colis remis en main propre · son numéro n’est jamais affiché'
                        : 'Colis déjà remis au relais · son numéro n’est jamais affiché',
                )}
              </span>
            </div>
          </div>
          {(enCoursPrepa || auRelais || c.etat === 'retiree') && (
            <div className="card tight mt8">
              {(enCoursPrepa || auRelais) && lien(chemin('modifier', { ref: c.ref }), 'pencil', t('Modifier ma commande'), t(c.etat === 'preparation' ? 'Annuler une boutique ou changer de relais' : domicile && c.etat === 'route' ? 'L’adresse ne change plus pendant la livraison' : 'Changer de relais'))}
              {c.etat === 'preparation' && domicile && lien(chemin('changer-adresse', { ref: c.ref }), 'map-pin', t('Changer d’adresse'))}
              {(auRelais || c.etat === 'preparation') &&
                lien(chemin('code-partage', { ref: c.ref }), 'user-plus', t(c.delegue ? 'Retrait confié' : 'Faire retirer par quelqu’un'), c.delegue ? tf('{p} · {n}', { p: c.delegue.prenom, n: c.delegue.numero }) : t('Il reçoit son propre code par SMS'))}
              {c.garde && auRelais && lien(chemin('garde', { ref: c.ref }), 'clock', t('Frais de garde'), c.garde.du ? tf('{m} F aujourd’hui, {n} F demain', { m: F(c.garde.du), n: F(c.garde.demain) }) : tf('Gratuite aujourd’hui · {n} F demain', { n: F(c.garde.demain) }))}
              {c.etat === 'preparation' && lien(chemin('annuler', { ref: c.ref }), 'x', t('Annuler la commande'), undefined, true)}
              {c.etat === 'retiree' && lien(chemin('avis-donner', { ref: c.ref }), 'star', t('Donner mon avis'))}
            </div>
          )}
        </>,
      )}
    </>
  )
  const bSecurite = (
    <>
      <div className="c9-sec">
        <Icone nom="shield-check" taille={20} />
        <div>
          {t('Paiement sécurisé')}
          <span>{t('Mobile Money · ton argent reste bloqué jusqu’à ton retrait')}</span>
        </div>
      </div>
    </>
  )
  const bRacheter = (
    <>
      {(c.etat === 'retiree' || c.etat === 'annulee') && (
        <div className="btns mt14">
          <button type="button" className="btn primary" onClick={racheter}>
            <Icone nom="repeat" taille={18} />
            <span>{t('Racheter')}</span>
          </button>
        </div>
      )}
    </>
  )
  const bLiens = (
    <>
      <div className="links">
        <Link to={chemin('fil', { id: 'support', st: 'nouveau', commande: c.ref })}>{t('Une question sur cette commande')}</Link>
        <Link to={chemin('rappel', { commande: c.ref })}>{t('Être rappelé')}</Link>
      </div>
    </>
  )
  return {
    c,
    fixes: feuilleFacture,
    morceaux: {
      entete: bEntete,
      message: bMessage,
      bandeau: bBandeau,
      suivi: bSuivi,
      chronologie: bChronologie,
      preuves: bPreuves,
      relais: bRelais,
      retirer: bRetirer,
      litigeProtege: bLitigeProtege,
      constat: bConstat,
      articles: bArticles,
      cycle: bCycle,
      resume: bResume,
      livraison: bLivraison,
      securite: bSecurite,
      racheter: bRacheter,
      liens: bLiens,
      telephone: (
        <>
          {bEntete}
          {bMessage}
          {bBandeau}
          {bSuivi}
          {bChronologie}
          {bPreuves}
          {bRelais}
          {bRetirer}
          {bLitigeProtege}
          {bConstat}
          {bArticles}
          {bCycle}
          {bResume}
          {bLivraison}
          {bSecurite}
          {bRacheter}
          {bLiens}
        </>
      ),
    },
  }
}
