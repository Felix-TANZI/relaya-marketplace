// Écran « Passer commande » (CL-08, route paiement-moyen), forme d'origine du prototype rendue réelle (DP-54) :
// la feuille « Moyen de paiement » posée sur le panier (ou sur « Ta première commande », ?from=premiere). Règles BV-DEV
// v2.0 (DP-69 ; src/donnees/achat.ts) et consigne du porteur :
// 1. la livraison choisie dans le panier est reprise en résumé (« Modifier » renvoie au panier), jamais reproposée ;
// 2. à domicile (et XL) : tout se paie maintenant, en Mobile Money (R79) ; au relais, deux choix : payer maintenant,
//    ou au comptoir (R42 : la livraison d'avance, plus 900 F quand elle est offerte, le reste en Mobile Money au
//    retrait ; plafond du panier selon l'historique ; jamais d'espèces) ;
// 3. le moyen : MTN Mobile Money ou Orange Money, seul le numéro du moyen choisi est demandé ; le Wallet n'apparaît
//    que s'il est ouvert (R03) ; la carte que si son interrupteur l'est (FF-CARTE, après le lancement) ;
// 4. le récapitulatif : frais de paiement compris (R02), heure estimée (R45) ; « Payer » crée la commande.
// Les prix sont vérifiés avant (CAL-11) : une hausse, un article retiré ou pris mène à « Un prix a changé ».
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useContext, useEffect, useState, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { FeuillePosee } from '../../composants/coque'
import { useDes } from '../../composants/ecran'
import { Icone } from '../../composants/Icone'
import { Module } from '../../composants/Module'
import { Styles } from '../../composants/Styles'
import { chemin } from '../../config/pages'
import { totalMobileMoney, walletOuvert } from '../../calculs'
import { calculerAchat, NOM_FORMAT, formatColis } from '../../donnees/achat'
import { chiffres, erreurNumero, espacer, masquer, nomMoMo, operateur } from '../../donnees/numeros'
import { palier, remisePrime } from '../../donnees/prime'
import { source, type Carte, type DonneesPanier, type DonneesPrime, type MoyenCommande, type MoyenPaiement } from '../../donnees/source'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'
import { useCompteDiaspora, useSession } from '../../session'
import { Panier } from '../CL-07/Panier'
import { PremiereCommande } from '../CL-03/PremiereCommande'
import { EURO } from '../CL-12/Diaspora'
import { MentionDemo } from '../../composants/BandeauDemo'
import { useEnLigne } from '../CL-09/Commun'

const MAX_CARTE = 150000
const NOM_OP = { MTN: 'MTN Mobile Money', Orange: 'Orange Money' } as const

// L'achat : données, choix (quand payer au relais, moyen), montants et paiement. Partagé avec « Ta première
// commande » (CL-03), qui pose aussi le mode sur sa page.
export function useAchat() {
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const { interrupteurs } = useSession()
  const [d, setD] = useState<{ panier: DonneesPanier; moyens: MoyenPaiement[]; cartes: Carte[]; solde: number; prime: DonneesPrime; maintenant: number } | null>(null)
  const [mode, setMode] = useState<'relais' | 'domicile'>('relais')
  const [comptoir, setComptoir] = useState(params.get('comptoir') === '1')
  const [moyen, setMoyen] = useState<string>('autre')
  const [op, setOp] = useState<'MTN' | 'Orange'>('MTN')
  const [autre, setAutre] = useState('')
  const [devise, setDevise] = useState<'EUR' | 'USD'>('EUR')
  // Nouvelle carte (démonstration factice) : gardée en mémoire le temps de l'écran, jamais enregistrée ni envoyée.
  const [carteSaisie, setCarteSaisie] = useState({ numero: '', expire: '', code: '' })
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const enLigne = useEnLigne()
  // Revenu de « Paiement non abouti » (?cause=…) : la cause est rappelée en tête de la feuille.
  const lue = params.get('cause')
  const cause = lue === 'expire' || lue === 'solde' || lue === 'carte' ? lue : null
  useEffect(() => {
    // Les prix sont vérifiés avant de payer (CAL-11) : une hausse, un article retiré ou pris passe par l'écran
    // « Un prix a changé » ; une baisse est appliquée tout de suite.
    source.verifierPanier().then((ch) => {
      if (ch.some((c) => c.type !== 'baisse')) naviguer(chemin('prix-change'), { replace: true })
    })
    Promise.all([source.verifierPanier().then(() => source.panier()), source.moyensPaiement(), source.cartes(), source.portefeuille(), source.prime()]).then(([panier, moyens, cartes, pf, prime]) => {
      setD({ panier, moyens, cartes, solde: pf.solde, prime, maintenant: Date.now() })
      setMode(panier.mode)
      const def = moyens.find((m) => m.parDefaut) ?? moyens[0]
      if (def) (setMoyen('mm:' + def.id), setOp(def.operateur))
    })
  }, [naviguer])
  if (!d) return null
  const p = d.panier
  const achat = calculerAchat(p, mode, d.maintenant)
  const { xl, mode: m, frais: fr } = achat
  const sousTotal = p.lignes.reduce((t, l) => t + l.prix * l.qte, 0)
  const sc = achat.boutiques.map((b) => ({ boutique: b, classe: formatColis(p.lignes.filter((l) => l.boutique === b).map((l) => l.classe)) }))
  // Abonnement (Prime, Pass) : la livraison de base offerte ou réduite, selon le palier et l'usage du mois.
  const ab = d.prime.abonnement
  const brut = fr?.client ?? 0
  const remise = remisePrime(ab ? { palier: ab.palier, actif: d.prime.actif } : null, m, sousTotal, brut, d.prime.usage)
  const livraison = brut - remise
  const cpt = achat.comptoir
  const carteOuverte = !!interrupteurs['FF-CARTE']
  const walletVisible = walletOuvert() && !!interrupteurs['FF-WALLET']
  const estCarte = (x: string) => x.startsWith('carte:') || x === 'apple' || x === 'google'
  const parCarte = carteOuverte && estCarte(moyen)
  // R42 : jamais pour un paiement par carte (ni une commande de la diaspora : voir plus bas).
  const comptoirPossible = m === 'relais' && !!cpt?.propose && !parCarte
  const auComptoir = comptoir && comptoirPossible
  // R42 : avance = livraison payée (+ 900 F quand elle est offerte) ; le reste au comptoir, chacun en Mobile Money (R02).
  const avance = auComptoir && cpt ? cpt.avance - remise : sousTotal + livraison
  const auRetrait = auComptoir && cpt ? cpt.auComptoir : 0
  const aPayer = avance
  // Frais de paiement : Mobile Money ⌈base ÷ 0,98⌉ − base (R02) ; Wallet : aucun ; carte : 2 % (après le lancement).
  const frais = moyen === 'wallet' ? 0 : parCarte ? Math.ceil(aPayer * 0.02) : totalMobileMoney(aPayer) - aPayer
  const fraisRetrait = auRetrait ? totalMobileMoney(auRetrait) - auRetrait : 0
  const libelleFrais = 'Frais de paiement'
  const montant = aPayer + frais
  const carteTropHaute = parCarte && montant > MAX_CARTE
  const walletOk = walletVisible && d.solde >= aPayer // le Wallet paie sans frais
  const articles = p.lignes.reduce((n, l) => n + l.qte, 0)
  const heures = Math.max(0, ...achat.boutiques.map((b) => parseInt(p.boutiques[b]?.delai ?? '') || 0))
  const pretVers = d.maintenant + heures * 3600 * 1000
  const bloque = achat.minimum?.texte ?? (achat.refus === 'hors-gabarit' ? 'Hors gabarit : livraison sur devis.' : null)

  const mm = d.moyens.find((x) => 'mm:' + x.id === moyen)
  const carte = carteOuverte ? d.cartes.find((c) => 'carte:' + c.id === moyen) : undefined
  const nomMoyen = mm
    ? NOM_OP[mm.operateur]
    : carte
      ? `${carte.marque} •••• ${carte.derniers}`
      : moyen === 'carte:nouvelle'
        ? 'Carte bancaire'
        : moyen === 'wallet'
        ? 'Wallet BelivaY'
        : moyen === 'apple'
          ? 'Apple Pay'
          : moyen === 'google'
            ? 'Google Pay'
            : NOM_OP[op]
  const choisirMode = (x: 'relais' | 'domicile') => {
    if (x === 'relais' && xl) return
    setMode(x)
    if (x === 'domicile') setComptoir(false)
    setErreur(null)
    source.choisirModePanier(x)
  }
  const choisirMoyen = (x: string) => (setMoyen(x), setErreur(null))
  // Un opérateur : son premier numéro enregistré, sinon un numéro à saisir (le seul champ montré).
  const choisirOperateur = (o: 'MTN' | 'Orange') => {
    setOp(o)
    const n = d.moyens.find((x) => x.operateur === o)
    choisirMoyen(n ? 'mm:' + n.id : 'autre')
  }
  const choisirComptoir = (v: boolean) => {
    setComptoir(v)
    setErreur(null)
    if (v && estCarte(moyen)) choisirOperateur(op)
  }

  const payer = async () => {
    if (envoi) return
    if (bloque) return setErreur(bloque)
    if (!enLigne) return setErreur('Pas de connexion : le paiement attend le réseau. Rien n’a été demandé.')
    let type: MoyenCommande = 'mtn'
    let numero: string | null = null
    if (mm) {
      type = mm.operateur === 'MTN' ? 'mtn' : 'orange'
      numero = mm.numeroMasque
    } else if (moyen === 'autre') {
      const e = erreurNumero(autre)
      if (e) return setErreur(e)
      const o = operateur(chiffres(autre))
      if (o && o !== op) return setErreur(`Ce numéro n’est pas un numéro ${NOM_OP[op]}.`)
      type = op === 'MTN' ? 'mtn' : 'orange'
      numero = masquer(chiffres(autre))
    } else if (carte) {
      type = 'carte'
      numero = `•••• ${carte.derniers}`
    } else if (parCarte && moyen === 'carte:nouvelle') {
      const e = erreurCarte(carteSaisie)
      if (e) return setErreur(e)
      type = 'carte'
      numero = `•••• ${carteSaisie.numero.replace(/\D/g, '').slice(-4)}`
    } else if (moyen === 'wallet') {
      if (!walletOk) return setErreur('Solde insuffisant : recharge ton Wallet ou choisis un autre moyen.')
      type = 'wallet'
    } else if (parCarte && (moyen === 'apple' || moyen === 'google')) type = moyen
    if (carteTropHaute) return setErreur('150 000 F au plus par paiement par carte : choisis Mobile Money.')
    if (m === 'domicile' && !p.adresse) return setErreur('Ajoute une adresse de livraison pour être livré à domicile.')
    setEnvoi(true)
    await source.choisirModePanier(m)
    const c = await source.passerCommande({ mode: m, moyen: type, comptoir: auComptoir, numero, livraison, frais, prime: remise, avance: aPayer, auRetrait })
    if (type === 'apple' || type === 'google')
      return naviguer(chemin('xp-pay', { m: type, t: String(c.montant), back: chemin('paiement-moyen'), ok: chemin(auComptoir ? 'validee' : 'confirmee', { ref: c.ref }), ref: c.ref }))
    naviguer(c.etat === 'payee' ? chemin(auComptoir ? 'validee' : 'confirmee', { ref: c.ref }) : chemin('paiement-attente', { ref: c.ref }), { replace: true })
  }
  // f : compatibilité avec « Ta première commande » (CL-03).
  const f = { sousTotal, offert: fr?.couverture ?? 0, total: sousTotal + brut }
  return {
    d, p, sc, xl, m, f, fr, achat, ab, remise, livraison, comptoirPossible, auComptoir, aPayer, auRetrait, fraisRetrait, parCarte, carteOuverte, walletVisible, frais, libelleFrais, montant, carteTropHaute, walletOk, articles, pretVers,
    mm, carte, nomMoyen, moyen, op, autre, devise, erreur, envoi, enLigne, cause, heures, bloque, carteSaisie,
    setCarteSaisie: (v: Partial<typeof carteSaisie>) => (setCarteSaisie((x) => ({ ...x, ...v })), setErreur(null)),
    choisirMode, choisirMoyen, choisirOperateur, setComptoir: choisirComptoir, setAutre: (v: string) => (setAutre(espacer(v)), setErreur(null)), setDevise, payer,
  }
}
export type Achat = NonNullable<ReturnType<typeof useAchat>>

// Carte saisie (démonstration factice) : 16 chiffres, date MM/AA à venir, cryptogramme de 3 chiffres.
function erreurCarte(c: { numero: string; expire: string; code: string }): string | null {
  if (c.numero.replace(/\D/g, '').length !== 16) return 'Numéro de carte : 16 chiffres.'
  const m = /^(\d{2})\/(\d{2})$/.exec(c.expire.trim())
  if (!m || +m[1] < 1 || +m[1] > 12 || 2000 + +m[2] < 2026) return 'Date d’expiration : MM/AA, encore valable.'
  if (!/^\d{3}$/.test(c.code)) return 'Cryptogramme : les 3 chiffres au dos de la carte.'
  return null
}
const groupes4 = (v: string) => v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ')
const dateCarte = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 4)
  return d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d
}

type SectionPaiement = 'momo' | 'carte' | 'autres'
// Section repliable de la feuille (accordéon) : un en-tête bouton (titre, logos, résumé du choix, chevron) et un
// contenu qui s'ouvre en douceur ; une seule ouverte à la fois.
function Section(p: { id: SectionPaiement; titre: string; logos: ReactNode; resume: string | null; ouverte: boolean; basculer: () => void; children: ReactNode }) {
  const { t } = usePreferences()
  return (
    <section className={'pm-sec' + (p.ouverte ? ' on' : '')} data-section={p.id}>
      <button type="button" className="pm-sech" aria-expanded={p.ouverte} aria-controls={'pm-' + p.id} onClick={p.basculer}>
        <span className="pm-sect">
          <b>{t(p.titre)}</b>
          {p.resume && <small>{p.resume}</small>}
        </span>
        <span className="pm-logos" aria-hidden="true">
          {p.logos}
        </span>
        <span className="pm-chev">
          <Icone nom="chevron-down" taille={18} />
        </span>
      </button>
      <div className="pm-secb" id={'pm-' + p.id} role="region" aria-label={t(p.titre)} inert={!p.ouverte || undefined}>
        <div className="pm-seci">{p.children}</div>
      </div>
    </section>
  )
}

// Une ligne de choix de la feuille (cl08-row) : bouton radio, logo, titre, sous-titre.
function Rangee(p: { on: boolean; inactif?: boolean; op: ReactNode; titre: string; sous: ReactNode; choisir: () => void }) {
  const { t } = usePreferences()
  return (
    <a
      href="#"
      className={'cl08-row' + (p.on ? ' on' : '') + (p.inactif ? ' cl08-na' : '')}
      role="radio"
      aria-checked={p.on}
      aria-disabled={p.inactif || undefined}
      onClick={(e) => (e.preventDefault(), !p.inactif && p.choisir())}
    >
      <span className="rd"></span>
      {p.op}
      <span className="grow">
        <span className="rt">{t(p.titre)}</span>
        <span className="rs">{p.sous}</span>
      </span>
    </a>
  )
}

function FeuilleAchat({ a, fermer }: { a: Achat; fermer: string }) {
  const { t, tf } = usePreferences()
  const naviguer = useNavigate()
  const { d, p, m } = a
  const compte = d.moyens.find((x) => x.duCompte)?.numeroMasque
  const opAutre = operateur(chiffres(a.autre))
  const express = a.parCarte && (a.moyen === 'apple' || a.moyen === 'google')
  const momo = !!a.mm || a.moyen === 'autre'
  const tabL = useDes('tab-l')
  const fr = a.fr
  const op = (nom: string, taille = 20) => (
    <span className="cl08-op card" aria-hidden="true">
      <Icone nom={nom} taille={taille} />
    </span>
  )
  const logo = (o: 'MTN' | 'Orange') => (
    <span className={'cl08-op ' + (o === 'MTN' ? 'mtn' : 'orange')} aria-hidden="true">
      {t(o === 'MTN' ? 'MTN' : 'orange')}
    </span>
  )
  const numeros = d.moyens.filter((x) => x.operateur === a.op)
  const marque = (texte: string, cle: string) => (
    <span className={'cl08-op pm-marque ' + cle} aria-hidden="true">
      {cle === 'apple' && <Icone nom="smartphone" taille={13} />}
      {texte}
    </span>
  )
  // Section ouverte par défaut : celle du moyen déjà choisi ; un toucher l'ouvre ou la ferme (une seule à la fois).
  const sectionDuMoyen: SectionPaiement = a.auComptoir || a.moyen === 'wallet' ? 'autres' : a.parCarte ? 'carte' : 'momo'
  const [choisie, setChoisie] = useState<SectionPaiement | null | undefined>(undefined)
  const ouverte = choisie === undefined ? sectionDuMoyen : choisie
  const basculer = (x: SectionPaiement) => setChoisie(ouverte === x ? null : x)
  return (
    <>
      <div className="veil" onClick={() => naviguer(fermer)}></div>
      <div className="sheet long" role="dialog" aria-label={t('Moyen de paiement')} data-forme="large">
        <div className="grab"></div>
        <div className="cl08-shh">
          <h2>{t('Moyen de paiement')}</h2>
          <Link to={fermer} className="cl08-x" aria-label={t('Fermer')}>
            <Icone nom="x" taille={22} />
          </Link>
        </div>
        <div className="t13 c3">{t('Montant recalculé au moment de payer.')}</div>
        {a.cause && (
          <div className="note amber mt10">
            <Icone nom="circle-alert" taille={18} />
            <div>
              {t(
                a.cause === 'solde'
                  ? 'Ton dernier paiement n’a pas abouti : solde Mobile Money insuffisant. Rien n’a été débité. Choisis un autre numéro, ou recharge ton compte Mobile Money puis réessaie.'
                  : a.cause === 'carte'
                    ? 'Ta banque a refusé la carte au dernier essai. Rien n’a été débité. Tu peux payer avec MTN Mobile Money ou Orange Money.'
                    : 'Ta dernière demande a expiré sans validation. Rien n’a été débité. Garde ton téléphone près de toi : la demande se valide en 15 minutes.',
              )}
            </div>
          </div>
        )}
        {!a.enLigne && (
          <div className="note ink mt10" role="status">
            <Icone nom="wifi-off" taille={18} />
            <div>{t('Pas de connexion : le paiement attend le réseau. Rien n’a été demandé.')}</div>
          </div>
        )}

        <Bloc actif={tabL} classe="pm-choix">
        {/* La livraison choisie dans le panier, en résumé : jamais reproposée ici. */}
        <div className="cl08-kk">{t('Livraison')}</div>
        <div className="cl08-row on" data-livraison>
          {op(m === 'relais' ? 'store' : 'house')}
          <span className="grow">
            <span className="rt">{m === 'relais' ? tf('Au relais · {r}', { r: t(p.relais) }) : t('À domicile')}</span>
            <span className="rs">
              {m === 'relais' ? t(a.achat.promesse) : p.adresse ? tf('{a} · {h}', { a: t(p.adresse), h: t(a.achat.promesse) }) : t('Ajoute d’abord une adresse de livraison')}
            </span>
          </span>
          <Link to={chemin(m === 'domicile' && !p.adresse ? 'adresse' : 'panier')} className="cor b7 t13" aria-label={t('Modifier la livraison')}>
            {t(m === 'domicile' && !p.adresse ? 'Ajouter' : 'Modifier')}
          </Link>
        </div>

        {m === 'domicile' && (
          <div className="t12 c3" style={{ margin: '6px 4px 0' }}>
            {t('À domicile, tout se paie maintenant : le livreur ne touche jamais d’argent.')}
          </div>
        )}

        {/* Moyens de paiement en sections repliables (une seule ouverte) : Mobile Money ; carte et portefeuilles
            (FF-CARTE) ; autres moyens (comptoir quand il est possible, Wallet quand il est ouvert). Une option
            indisponible n'apparaît pas, une section vide non plus. */}
        <div className="cl08-kk">{t('Payer avec')}</div>
        <div className="pm-secs">
          <Section
            id="momo"
            titre="Mobile Money"
            resume={momo ? NOM_OP[a.op] : null}
            logos={<>{logo('MTN')}{logo('Orange')}</>}
            ouverte={ouverte === 'momo'}
            basculer={() => basculer('momo')}
          >
            {(['MTN', 'Orange'] as const).map((o) => (
              <Rangee key={o} on={momo && a.op === o} op={logo(o)} titre={NOM_OP[o]} sous={t(o === 'MTN' ? 'Validation sur ton téléphone, avec ton code MoMo' : 'Validation sur ton téléphone, avec ton code Orange Money')} choisir={() => a.choisirOperateur(o)} />
            ))}
            {momo && (
              <div className="cl08-sub" style={{ marginLeft: '0' }} data-numero={a.op}>
                {numeros.map((x) => (
                  <Rangee key={x.id} on={a.moyen === 'mm:' + x.id} op={logo(a.op)} titre={x.numeroMasque} sous={t(x.duCompte ? 'Ton numéro vérifié' : 'Numéro enregistré')} choisir={() => a.choisirMoyen('mm:' + x.id)} />
                ))}
                {numeros.length > 0 && a.moyen !== 'autre' ? (
                  <a href="#" className="cor b7 t13" onClick={(e) => (e.preventDefault(), a.choisirMoyen('autre'))}>
                    {tf('Utiliser un autre numéro {o}', { o: NOM_OP[a.op] })}
                  </a>
                ) : (
                  <div className="fld" style={{ marginTop: '0' }}>
                    <label htmlFor="pm-autre">{tf('Numéro {o}', { o: NOM_OP[a.op] })}</label>
                    <div className={'inp focus' + (a.erreur ? ' err' : '')}>
                      <span className="t15 b7 c3">{t('+237')}</span>
                      <input id="pm-autre" className="grow" type="tel" inputMode="tel" placeholder="6XX XX XX XX" value={a.autre} onChange={(e) => a.setAutre(e.target.value)} />
                      {opAutre && <span className="suf">{t(nomMoMo(opAutre))}</span>}
                    </div>
                    {opAutre && compte && (
                      <div className="t12 c3 mt8" style={{ lineHeight: '1.45' }}>
                        {t('La demande part sur ce numéro ; tes messages BelivaY restent sur ')}
                        <span className="cl08-tel">{compte}</span>
                        {t('.')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* Carte et portefeuilles : après le lancement (document v6), seulement si FF-CARTE est ouvert ; jamais pour
              une commande payée au comptoir (l'option n'apparaît pas). */}
          {a.carteOuverte && !a.auComptoir && (
            <Section
              id="carte"
              titre="Carte et portefeuilles"
              resume={a.parCarte ? t(a.nomMoyen) : null}
              logos={<>{marque('VISA', 'visa')}{marque('MC', 'mc')}{marque(' Pay', 'apple')}{marque('G Pay', 'google')}</>}
              ouverte={ouverte === 'carte'}
              basculer={() => basculer('carte')}
            >
              {d.cartes.map((c) => (
                <Rangee key={c.id} on={a.moyen === 'carte:' + c.id} op={marque(c.marque === 'Mastercard' ? 'MC' : 'VISA', c.marque === 'Mastercard' ? 'mc' : 'visa')} titre={`${c.marque} •••• ${c.derniers}`} sous={t('Frais de paiement compris · 3-D Secure')} choisir={() => a.choisirMoyen('carte:' + c.id)} />
              ))}
              <Rangee on={a.moyen === 'carte:nouvelle'} op={op('credit-card', 22)} titre="Nouvelle carte Visa ou Mastercard" sous={t('Numéro, date et cryptogramme')} choisir={() => a.choisirMoyen('carte:nouvelle')} />
              {a.moyen === 'carte:nouvelle' && (
                <div className="pm-carte" data-carte-saisie>
                  <div className="fld" style={{ marginTop: 0 }}>
                    <label htmlFor="pm-cn">{t('Numéro de carte')}</label>
                    <div className="inp">
                      <input id="pm-cn" inputMode="numeric" autoComplete="off" placeholder="1234 5678 9012 3456" value={a.carteSaisie.numero} onChange={(e) => a.setCarteSaisie({ numero: groupes4(e.target.value) })} />
                    </div>
                  </div>
                  <div className="pm-carte2">
                    <div className="fld" style={{ marginTop: 0 }}>
                      <label htmlFor="pm-ce">{t('Expire fin')}</label>
                      <div className="inp">
                        <input id="pm-ce" inputMode="numeric" autoComplete="off" placeholder="MM/AA" value={a.carteSaisie.expire} onChange={(e) => a.setCarteSaisie({ expire: dateCarte(e.target.value) })} />
                      </div>
                    </div>
                    <div className="fld" style={{ marginTop: 0 }}>
                      <label htmlFor="pm-cc">{t('Cryptogramme')}</label>
                      <div className="inp">
                        <input id="pm-cc" inputMode="numeric" autoComplete="off" placeholder="123" maxLength={3} value={a.carteSaisie.code} onChange={(e) => a.setCarteSaisie({ code: e.target.value.replace(/\D/g, '').slice(0, 3) })} />
                      </div>
                    </div>
                  </div>
                  <div className="t12 c3">{t('Démonstration : aucune carte n’est enregistrée ni débitée.')}</div>
                </div>
              )}
              <Rangee on={a.moyen === 'apple'} op={marque(' Pay', 'apple')} titre="Apple Pay" sous={t('Validation avec Face ID ou Touch ID')} choisir={() => a.choisirMoyen('apple')} />
              <Rangee on={a.moyen === 'google'} op={marque('G Pay', 'google')} titre="Google Pay" sous={t('Validation sur ton téléphone')} choisir={() => a.choisirMoyen('google')} />
              {(a.carte || a.moyen === 'carte:nouvelle') && (
                <div>
                  <Styles id="10d630a833" />
                  <div className="dev-seg" role="group" aria-label={t('Devise du paiement')}>
                    <span className="lb">{t('Tu paies depuis l’étranger en')}</span>
                    <span className="ch">
                      {(['EUR', 'USD'] as const).map((x) => (
                        <a key={x} href="#" className={a.devise === x ? 'on' : ''} aria-pressed={a.devise === x} onClick={(e) => (e.preventDefault(), a.setDevise(x))}>
                          <b>{x === 'EUR' ? '€' : '$'}</b>
                          {t(x === 'EUR' ? 'Euro' : 'Dollar US')}
                        </a>
                      ))}
                    </span>
                    <span className="rt">{tf('≈ {e} €', { e: (a.montant / EURO).toFixed(2).replace('.', ',') })}</span>
                  </div>
                </div>
              )}
            </Section>
          )}

          {/* Autres moyens : le comptoir quand il est possible au relais (R42), le Wallet quand il est ouvert (R03). */}
          {((a.comptoirPossible && a.achat.comptoir) || a.walletVisible) && (
            <Section
              id="autres"
              titre="Autres moyens"
              resume={a.auComptoir ? t('Payer au comptoir') : a.moyen === 'wallet' ? t('Wallet BelivaY') : null}
              logos={<>{a.comptoirPossible && op('store', 16)}{a.walletVisible && op('wallet', 16)}</>}
              ouverte={ouverte === 'autres'}
              basculer={() => basculer('autres')}
            >
              {a.comptoirPossible && a.achat.comptoir && (
                <>
                  <Rangee
                    on={a.auComptoir}
                    op={op('store')}
                    titre="Payer au comptoir"
                    sous={
                      fr && fr.couverture > 0
                        ? tf('Maintenant {l} F (livraison d’avance, déduits au comptoir), puis le reste en Mobile Money au retrait.', { l: F(a.achat.comptoir.avance) })
                        : tf('Maintenant {l} F de livraison, puis {r} F d’articles en Mobile Money au retrait.', { l: F(a.achat.comptoir.avance), r: F(a.achat.comptoir.auComptoir) })
                    }
                    choisir={() => a.setComptoir(!a.auComptoir)}
                  />
                  {a.auComptoir && (
                    <div className="t12 c3" style={{ margin: '6px 4px 0', lineHeight: 1.45 }} data-comptoir>
                      {t('Au comptoir, tu paies en Mobile Money sur ton téléphone, jamais en espèces. Ta commande est « Validée » ; ton code de retrait apparaît une fois payé. Si tu refuses le colis, la livraison payée d’avance est gardée.')}{' '}
                      {tf('L’avance part maintenant avec {o}.', { o: NOM_OP[a.op] })}
                    </div>
                  )}
                </>
              )}
              {a.walletVisible && (
                <Module ff="FF-WALLET">
                  <Rangee
                    on={a.moyen === 'wallet'}
                    inactif={!a.walletOk}
                    op={op('wallet', 19)}
                    titre="Wallet BelivaY"
                    sous={a.walletOk ? tf('Solde {s} F · sans frais', { s: F(d.solde) }) : tf('Solde {s} F : insuffisant pour ce panier', { s: F(d.solde) })}
                    choisir={() => a.choisirMoyen('wallet')}
                  />
                </Module>
              )}
            </Section>
          )}
        </div>
        </Bloc>

        <Bloc actif={tabL} classe="pm-recap">
        <div className="card cl07-rc">
          <div className="kk">{t('Récapitulatif')}</div>
          <div className="cl07-r">
            <span className="lb">{tf('Sous-total articles ({n})', { n: a.articles })}</span>
            <span className="v">{F(a.f.sousTotal)}&nbsp;F</span>
          </div>
          <div className="cl07-r">
            <span className="lb">
              {t(m === 'relais' ? 'Livraison au relais' : 'Livraison à domicile')}
              <small>{tf('{n} colis · {h}', { n: a.sc.length, h: t(a.achat.promesse) })}</small>
            </span>
            <span className="v">{a.livraison ? F(a.livraison) + ' F' : t('offerte')}</span>
          </div>
          {a.remise > 0 && (
            <div className="cl07-r">
              <span className="lb">{tf('Dont offert par {p}', { p: a.ab!.palier === 'pass' ? 'Pass 7 jours' : (palier(a.ab!.palier)?.nom ?? 'Prime') })}</span>
              <span className="v" style={{ color: 'var(--green)' }}>
                −{F(a.remise)}&nbsp;F
              </span>
            </div>
          )}
          {a.auComptoir && (
            <div className="cl07-r">
              <span className="lb">{t('Payé maintenant')}<small>{t(fr && fr.couverture > 0 ? 'livraison d’avance, déduite au comptoir' : 'la livraison')}</small></span>
              <span className="v">{F(a.aPayer)}&nbsp;F</span>
            </div>
          )}
          {a.frais > 0 && (
            <div className="cl07-r">
              <span className="lb">{t(a.libelleFrais)}</span>
              <span className="v">{F(a.frais)}&nbsp;F</span>
            </div>
          )}
          {a.auComptoir && (
            <div className="cl07-r" data-au-comptoir>
              <span className="lb">{t('Au comptoir, en Mobile Money')}<small>{tf('dont {f} F de frais de paiement', { f: F(a.fraisRetrait) })}</small></span>
              <span className="v">{F(a.auRetrait + a.fraisRetrait)}&nbsp;F</span>
            </div>
          )}
          <div className="cl07-tot">
            <span className="l">{t(a.auComptoir ? 'À payer maintenant' : 'Total à payer')}</span>
            <span className="price">
              {F(a.montant)}
              <small>{t(' F')}</small>
            </span>
          </div>
        </div>

        <details className="more">
          <summary>
            <Icone nom="receipt" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
            <span className="grow">{t('Détail des frais de livraison')}</span>
            <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
          </summary>
          <div className="more-b">
            {fr && (
              <>
                <div className="kv">
                  <span className="k">{t(m === 'relais' ? 'Livraison au relais' : fr.xl ? 'Livraison XL à domicile' : 'Livraison à domicile')}<br /><small>{a.sc.map((x, i) => tf('colis {n} : {f}', { n: i + 1, f: t(NOM_FORMAT[x.classe]) })).join(' · ')}</small></span>
                  <span className="v">{F(fr.base)}&nbsp;F</span>
                </div>
                {([['Kilomètres au-delà de 5 km', fr.km], ['Cartons', fr.sup_formats], ['Colis en plus', fr.colis_en_plus], ['Boutiques en plus', fr.boutiques]] as [string, number][]).filter(([, v]) => v > 0).map(([k, v]) => (
                  <div key={k} className="kv">
                    <span className="k">{t(k)}</span>
                    <span className="v">{F(v)}&nbsp;F</span>
                  </div>
                ))}
                {fr.couverture > 0 && (
                  <div className="kv">
                    <span className="k">{tf('Livraison offerte (articles dès {s} F)', { s: F(a.achat.offerte.seuil) })}</span>
                    <span className="v" style={{ color: 'var(--green)' }}>−{F(fr.couverture)}&nbsp;F</span>
                  </div>
                )}
              </>
            )}
            <div className="kv">
              <span className="k b8" style={{ color: 'var(--ink)' }}>{t('Livraison à payer')}</span>
              <span className="v">{a.livraison ? F(a.livraison) + ' F' : t('offerte')}</span>
            </div>
            {a.achat.offerte.manque > 0 && <p className="mt8">{tf('Encore {m} F d’articles et la livraison est offerte jusqu’à {c} F.', { m: F(a.achat.offerte.manque), c: F(a.achat.offerte.jusqua) })}</p>}
            <p className="mt8">
              {t(
                m === 'relais'
                  ? 'Chaque colis a son code et son QR, envoyés à son arrivée au relais. La garde au relais est offerte le jour de l’arrivée, puis 100 F par jour et par colis du 2e au 4e jour, 200 F le 5e, 500 F le 6e et 1 000 F le 7e ; elle se paie à part, en espèces au gérant, au retrait.'
                  : 'Le livreur t’appelle avant de passer. Tu donnes ton code de réception à la remise du colis, jamais avant.',
              )}
            </p>
          </div>
        </details>

        {(a.erreur || a.bloque) && (
          <div className="note red" role="alert">
            <Icone nom="circle-alert" taille={18} />
            <div>{t(a.erreur ?? a.bloque!)}</div>
          </div>
        )}
        <div className="btns mt16">
          {express ? (
            <button type="button" className={'xp-b wide ' + (a.moyen === 'apple' ? 'apple' : 'gpay') + (a.envoi || a.carteTropHaute || !a.enLigne ? ' off' : '')} style={{ border: 0, width: '100%' }} onClick={a.payer}>
              <span style={{ fontSize: '16px', marginRight: '6px' }}>{tf('Payer {m} F avec', { m: F(a.montant) })}</span>
              <Icone nom={a.moyen === 'apple' ? 'apple' : 'gpay-g'} taille={18} />
              <span>{t('Pay')}</span>
            </button>
          ) : (
            <button type="button" className={'btn primary' + (a.envoi || a.carteTropHaute || !a.enLigne || a.bloque ? ' off' : '')} onClick={a.payer}>
              <span>
                {a.moyen === 'wallet'
                  ? tf('Payer {m} F avec le Wallet', { m: F(a.montant) })
                  : a.carte
                    ? tf('Payer {m} F par carte', { m: F(a.montant) })
                    : tf('Payer {m} F avec {moyen}', { m: F(a.montant), moyen: t(a.nomMoyen) })}
              </span>
            </button>
          )}
        </div>
        <div className="t12 c3 center mt8">
          {momo
            ? tf('Dont {f} F de frais de paiement. Rien n’est débité avant ta validation sur le téléphone.', { f: F(a.frais) })
            : a.moyen === 'wallet'
              ? tf('Ton solde passera à {s} F. L’argent reste bloqué jusqu’à ton retrait.', { s: F(d.solde - a.montant) })
              : t('Rien n’est débité avant la confirmation de ta banque.')}
        </div>
        <MentionDemo texte="Démonstration : aucun paiement réel. N’entre pas tes vraies informations bancaires ou Mobile Money." />
        <details className="more mt12">
          <summary>
            <Icone nom="info" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
            <span className="grow">{t('Et après le paiement ?')}</span>
            <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
          </summary>
          <div className="more-b">
            {momo && (
              <p>
                <b>{t('Validation.')}</b>
                {t(' Une demande arrive sur ton téléphone : tu as 15 minutes pour la valider avec ton code secret, que BelivaY ne voit jamais.')}
              </p>
            )}
            <p>
              <b>{t('Ton argent est protégé.')}</b>
              {t(' Il reste bloqué chez BelivaY jusqu’à ton retrait, puis pendant 7 jours pour signaler un problème. Le vendeur n’est payé qu’après.')}
            </p>
            <p>
              <b>{t('Préparation.')}</b>
              {m === 'relais'
                ? tf(' {h}, au {r}. Une notification te prévient à l’arrivée ; ton code de retrait t’attend dans Mes commandes.', { h: t(a.achat.promesse), r: t(p.relais) })
                : tf(' {h}. Le livreur t’appelle avant de passer ; ton code de réception t’attend dans Mes commandes.', { h: t(a.achat.promesse) })}
            </p>
            <p>
              <b>{t('Changer d’avis.')}</b>
              {t(' Tu peux annuler une boutique depuis Mes commandes tant que le livreur n’a pas récupéré son colis.')}
            </p>
            <p>
              <b>{t('Remboursement.')}</b>
              {t(a.parCarte ? ' Un remboursement revient sur la même carte.' : a.moyen === 'wallet' ? ' Un remboursement revient sur ton Wallet BelivaY.' : ' Un remboursement revient sur le numéro Mobile Money qui a payé.')}
            </p>
          </div>
        </details>
        <div className="links" style={{ flexWrap: 'wrap' }}>
          <Link to={chemin('legal-doc', { d: 'cgv' })}>{t('Conditions de vente et de paiement')}</Link>
          <Link to={chemin('faq', { t: 'paiement' })}>{t('Questions sur le paiement')}</Link>
          <Link to={chemin('fil', { id: 'support', st: 'nouveau', sujet: 'Paiement' })}>{t('Écrire au support')}</Link>
        </div>
        </Bloc>
      </div>
    </>
  )
}

// Dès 1024 px, la feuille « large » se met en deux colonnes (§ 5.7) : les choix à gauche, le récapitulatif et
// « Payer » collants à droite. Sous ce palier, rien n'est enveloppé (flux du téléphone inchangé).
function Bloc({ actif, classe, children }: { actif: boolean; classe: string; children: ReactNode }) {
  return actif ? <div className={classe}>{children}</div> : <>{children}</>
}

export function PaiementMoyen() {
  // Compte diaspora (DP-54) : ni Mobile Money, ni comptoir, ni retrait pour lui : son paiement est « Commander
  // pour » (carte, Apple Pay, Google Pay), pour un proche relié.
  if (useCompteDiaspora()) return <Navigate to={chemin('commander-pour')} replace />
  return <PaiementMoyenClient />
}

function PaiementMoyenClient() {
  const [params] = useSearchParams()
  const premiere = params.get('from') === 'premiere'
  const a = useAchat()
  const dessus = useContext(FeuillePosee)
  const Dessous = premiere ? PremiereCommande : Panier
  // Panier vide : l'écran de dessous seul (il le dit), sans feuille.
  const feuille = a && a.p.lignes.length > 0 ? <FeuilleAchat a={a} fermer={chemin(premiere ? 'premiere-commande' : 'panier')} /> : null
  if (!a) return null
  return (
    <FeuillePosee.Provider value={{ fixes: <>{feuille}{dessus?.fixes}</>, classes: [...(feuille ? ['fixed'] : []), ...(dessus?.classes ?? [])] }}>
      <Dessous />
    </FeuillePosee.Provider>
  )
}

