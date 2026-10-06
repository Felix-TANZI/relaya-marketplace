// Écran « Offrir un article » (CL-14), forme d'origine du prototype rendue réelle (DP-54) : la page web de celui
// qui offre (?l=code&p=produit), avec son en-tête propre (paiement protégé, langue, adresse du lien). La liste et
// à qui l'on offre, l'article (dessin, variante, disponible), le récapitulatif (article, livraison au relais, frais
// de carte 2 %, total, équivalent en euros), où il sera remis (seul ou avec les autres cadeaux, sans adresse), le
// prénom affiché au destinataire, l'e-mail pour suivre le cadeau, le moyen : Mobile Money (son numéro) ou carte
// depuis l'étranger (devise €/$, plafond, 3-D Secure, paiement express Apple Pay / Google Pay). Si le cadeau
// n'arrive pas, c'est celui qui offre qui est remboursé, jamais le destinataire. Un article offert juste avant
// (ou déjà offert) : « Cet article vient d'être offert », rien n'est débité. Prix au partage (CLE-39) : celui qui
// offre paie le prix du jour ; une baisse est annoncée, une hausse est montrée et acceptée avant de payer ; si le
// prix monte pendant le paiement, rien n'est débité et le nouveau prix est montré.
// Qui paie la livraison (DP-54 ; donnees/echanges.ts) : celui qui offre, ou le destinataire au retrait quand la
// garantie le permet ; le total suit ; la garantie et ce que voit le destinataire sont dits avant de payer. Un
// article en cotisation renvoie à la cotisation ; un article cher peut s'offrir à plusieurs.
// Depuis n'importe où (DP-54) : la devise choisie sur la page de la liste (?devise=EUR|USD) suit et ouvre la carte ;
// livraison au relais du destinataire ou chez lui quand il l'accepte (la ville seulement, jamais l'adresse) ; carte,
// Apple Pay, Google Pay : pays où vit celui qui offre et pays de la carte (BIN), plafonds et contrôle de cohérence
// du compte diaspora (PLAFONDS_DIASPORA, controleDiaspora, refaits par le serveur) : accepté, vérification renforcée
// (code envoyé à son e-mail) ou refusé sans rien débiter, avec la raison et le support.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import img_be926f70d2b8_png from '../../assets/prototype/be926f70d2b8.png'
import { Ecran } from '../../composants/coque'
import { useDes } from '../../composants/ecran'
import { Aside, Colonne, Zone } from '../../composants/Gabarits'
import { PiedWeb } from '../../composants/PiedWeb'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { RENVOI_TROP_TOT, useEnvoiCode } from '../../composants/SaisieCode'
import { Styles } from '../../composants/Styles'
import { INTERRUPTEURS_DU_LANCEMENT } from '../../config/interrupteurs'
import { NAVIGATION, chemin } from '../../config/pages'
import { jetonExpress, messageCarte, tokeniser } from '../../connecteurs/paiementCarte'
import { chiffres, erreurNumero, espacer, masquer, nomMoMo, operateur } from '../../donnees/numeros'
import { COHERENCE_DIASPORA, PAYS_DIASPORA, PLAFONDS_DIASPORA, paysDuBin, source, type CarteJeton, type ControleDiaspora, type EnvoiCode, type ListePublique, type Produit } from '../../donnees/source'
import { F, enDevise as versDevise } from '../../i18n/format'
import { jourSeul } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { PLAFOND_CARTE } from '../CL-12/Diaspora'
import { CLE_REPRISE_DIASPORA } from '../diaspora/InscriptionDiaspora'
import { expireValide, grouper, luhn, marque } from '../CL-13/MoyensAutres'
import { ecartPartage } from './Commun'
import { COTISER_DES, repartition, type PaieFrais } from '../../donnees/echanges'
import { QuiPaieLivraison } from './Echanges'

// En-tête de la page web d'une liste partagée : paiement protégé, logo, langue, adresse du lien.
function EnTeteWeb({ code }: { code: string }) {
  const { t, langue, setLangue } = usePreferences()
  return (
    <header className="hd glass cl14-web">
      <div className="hd-strip">
        <Icone nom="shield-check" taille={14} />
        <span>{t('Paiement protégé : le vendeur est payé après le retrait')}</span>
      </div>
      <div className="hd-sub">
        <img src={img_be926f70d2b8_png} alt="BelivaY" />
        <span className="hd-sp"></span>
        <button type="button" className="lang" aria-label={t('Langue')} onClick={() => setLangue(langue === 'en' ? 'fr' : 'en')}>
          {langue === 'en' ? 'EN' : 'FR'}
        </button>
      </div>
      <div className="cl14-url">
        <Icone nom="lock" taille={12} />
        {location.host + chemin('liste-publique', { l: code })}
      </div>
    </header>
  )
}

// Paiement express : le prénom et l'e-mail attendent le retour de la feuille Apple Pay / Google Pay, dans ce
// navigateur seulement (jamais dans l'adresse).
const CLE_XP = 'blv_liste_xp'
type Xp = { code: string; p: string; prenom: string; email: string; prixVu: number; qui?: PaieFrais; livraison?: 'relais' | 'domicile'; pays?: string; devise?: 'EUR' | 'USD' }
const lireXp = (): Xp | null => {
  try {
    return JSON.parse(sessionStorage.getItem(CLE_XP) ?? 'null')
  } catch {
    return null
  }
}
const ecrireXp = (v: Xp | null) => {
  try {
    if (v) sessionStorage.setItem(CLE_XP, JSON.stringify(v))
    else sessionStorage.removeItem(CLE_XP)
  } catch {
    // Stockage indisponible : le paiement express redemandera le prénom.
  }
}
// Après un cadeau payé par carte : le prénom, l'e-mail et le pays sont gardés dans ce navigateur pour proposer un
// compte diaspora (facultatif) sans tout retaper.
const garderReprise = (v: { prenom: string; email: string; pays: string }) => {
  try {
    sessionStorage.setItem(CLE_REPRISE_DIASPORA, JSON.stringify(v))
  } catch {
    // stockage indisponible
  }
}

export function ListeOffrir() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const code = params.get('l') ?? 'k7Q2mX'
  const p = params.get('p') ?? ''
  const xp = params.get('xp')
  const deviseLien = params.get('devise')
  const [l, setL] = useState<ListePublique | null | undefined>(undefined)
  const [produit, setProduit] = useState<Produit | null>(null)
  const [prenom, setPrenom] = useState('')
  const [email, setEmail] = useState('')
  const [moyen, setMoyen] = useState<'momo' | 'carte'>(deviseLien === 'EUR' || deviseLien === 'USD' ? 'carte' : 'momo')
  const [devise, setDevise] = useState<'EUR' | 'USD'>(deviseLien === 'USD' ? 'USD' : 'EUR')
  const [livraison, setLivraison] = useState<'relais' | 'domicile'>('relais')
  const [pays, setPays] = useState('') // pays où vit celui qui paie par carte
  const [paysDeclare, setPaysDeclare] = useState('') // pays de la carte, si ses premiers chiffres ne le disent pas
  const [controle, setControle] = useState<ControleDiaspora | null>(null)
  const [envoiEmail, setEnvoiEmail] = useState<EnvoiCode | null>(null)
  const envoyerEmail = useEnvoiCode()
  const [codeEmail, setCodeEmail] = useState('')
  const [xpm, setXpm] = useState<'apple' | 'google' | null>(null) // paiement express en cours de vérification
  const [numero, setNumero] = useState('')
  const [carte, setCarte] = useState('')
  const [expire, setExpire] = useState('')
  const [cvc, setCvc] = useState('')
  const [vu, setVu] = useState(false)
  const [etape, setEtape] = useState<'saisie' | 'valider'>('saisie')
  const [code3, setCode3] = useState('')
  const [refus, setRefus] = useState<string | null>(null)
  const [pris, setPris] = useState(false)
  const [accepte, setAccepte] = useState(false) // hausse depuis le partage, acceptée
  const [change, setChange] = useState<number | null>(null) // le prix a bougé pendant le paiement : le nouveau prix
  const [qui, setQui] = useState<PaieFrais>('payeur') // qui paie la livraison
  const tabL = useDes('tab-l')
  useEffect(() => {
    source.listePublique(code).then(setL)
    source.produits().then((x) => setProduit(x.find((y) => y.p === p) ?? null))
  }, [code, p])
  // Retour de la feuille de paiement express acceptée : le cadeau est enregistré, puis la confirmation.
  useEffect(() => {
    if (!xp) return
    const v = lireXp()
    ecrireXp(null)
    if (!v || v.code !== code || v.p !== p) return
    const m = xp === 'google' ? 'google' : 'apple'
    const reprendre = () => (setPrenom(v.prenom), setEmail(v.email), setMoyen('carte'), setPays(v.pays ?? ''), setLivraison(v.livraison ?? 'relais'), setQui(v.qui ?? 'payeur'), v.devise && setDevise(v.devise))
    jetonExpress(m).then((jeton) => source.offrirArticleListe(code, p, { prenom: v.prenom, email: v.email, moyen: tf('Carte · {m}', { m: m === 'google' ? 'Google Pay' : 'Apple Pay' }), prixVu: v.prixVu, qui: v.qui, livraison: v.livraison, devise: v.devise, carte: { jeton, paysCarte: v.pays ?? '', pays: v.pays ?? '' } })).then(async (r) => {
      if (r.ok) (garderReprise({ prenom: v.prenom, email: v.email, pays: v.pays ?? '' }), naviguer(chemin('liste-offert', { l: code, p, ref: r.ref, de: v.prenom }), { replace: true }))
      else if (r.raison === 'verification') (reprendre(), setXpm(m), setControle(r.controle), setEtape('valider'), setEnvoiEmail(await envoyerEmail(v.email, () => source.envoyerCodeCadeau(code, v.email))))
      else if (r.raison === 'coherence') (reprendre(), setControle(r.controle))
      else if (r.raison === 'plafond') (reprendre(), setRefus('Plafond atteint : 150 000 F par paiement par carte, et 500 000 F par mois avec la même adresse e-mail. Rien n’a été débité.'))
      else if (r.raison === 'offert') setPris(true)
      else if (r.raison === 'prix') (setPrenom(v.prenom), setEmail(v.email), setMoyen('carte'), setChange(r.prix), source.listePublique(code).then(setL))
      else if (r.raison === 'garantie') (setPrenom(v.prenom), setEmail(v.email), setQui('payeur'), setRefus('La livraison ne peut pas être laissée au destinataire pour cet article : rien n’a été débité.'))
      else setRefus('Cette liste n’est plus partagée : rien n’a été débité.')
    })
  }, [xp, code, p])
  if (l === undefined) return null
  const navigation = { ...NAVIGATION['liste-offrir'], entete: 'propre' as const }
  const avant = (
    <>
      <EnTeteWeb code={code} />
    </>
  )
  const bandeau = !INTERRUPTEURS_DU_LANCEMENT['FF-LISTE-ENVIES'] && (
    <div className="cl14-top">
      <span className="cl14-ff">
        <Icone nom="lock" taille={13} />
        {t('Après le lancement · interrupteur fermé')}
      </span>
      <span className="cl14-ffc">{t('FF-LISTE-ENVIES')}</span>
    </div>
  )
  const a = l?.articles.find((x) => x.p === p)
  if (!l || !a)
    return (
      <Ecran route="liste-offrir" navigation={navigation} avant={avant}>
        <Styles id="02f3dac5cd" />
        {bandeau}
        <div className="card mt12">
          <div className="empty">
            <h3>{t(!l ? 'Cette liste n’est plus partagée' : 'Cet article n’est plus dans la liste')}</h3>
            {l && (
              <div className="btns">
                <Link to={chemin('liste-publique', { l: code })} className="btn primary">
                  <span>{t('Choisir un autre article')}</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </Ecran>
    )
  const variante = produit?.variante ? t(produit.variante) : null

  // L'article vient d'être offert (refus au paiement) ou l'était déjà : rien n'est débité.
  if (pris || a.offert)
    return (
      <Ecran route="liste-offrir" navigation={navigation} avant={avant}>
        <Styles id="02f3dac5cd" />
        {bandeau}
        <div className="cl14-check" style={{ background: 'var(--sand-2)', color: 'var(--ink-2)' }}>
          <Icone nom="lock" taille={28} />
        </div>
        <div className="cl14-center">
          <div className="pg">
            <h1 className="pg-t">{t('Cet article vient d’être offert')}</h1>
            <p className="pg-s">{pris ? tf('Quelqu’un a payé {a} juste avant toi. Rien n’a été débité.', { a: t(a.titre) }) : tf('Quelqu’un a déjà offert {a} à {p}. Choisis un autre article de sa liste.', { a: t(a.titre), p: l.prenom })}</p>
          </div>
        </div>
        <div className="card tight">
          <div className="li">
            <span className="thumb" style={{ width: '48px', height: '48px', borderRadius: '12px' }}>
              <Dessin id={a.dessin} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t(a.titre)}
              </span>
              {variante && (
                <span className="ls" style={{ display: 'block' }}>
                  {variante}
                </span>
              )}
            </span>
          </div>
        </div>
        <div className="btns mt16">
          <Link to={chemin('liste-publique', { l: code })} className="btn primary">
            <span>{t('Voir les autres articles')}</span>
          </Link>
        </div>
      </Ecran>
    )

  // Article offert à plusieurs : on participe à sa cotisation, on ne l'offre plus seul.
  if (a.cotisation)
    return (
      <Ecran route="liste-offrir" navigation={navigation} avant={avant}>
        <Styles id="02f3dac5cd" />
        {bandeau}
        <div className="pg">
          <div className="pg-k">{tf('Liste « {n} »', { n: t(l.nom) })}</div>
          <h1 className="pg-t">{tf('Offrir à {p}', { p: l.prenom })}</h1>
        </div>
        <div className="card ">
          <div className="li">
            <span className="thumb" style={{ width: '48px', height: '48px', borderRadius: '12px' }}>
              <Dessin id={a.dessin} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t(a.titre)}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {tf('Offert à plusieurs : {r} F réunis sur {o} F', { r: F(a.cotisation.reuni), o: F(a.cotisation.objectif) })}
              </span>
            </span>
          </div>
          <div className="bar mt8">
            <i style={{ width: `${Math.min(100, Math.round((a.cotisation.reuni / a.cotisation.objectif) * 100))}%` }}></i>
          </div>
        </div>
        <div className="btns mt16">
          <Link to={chemin('cotisation-participer', deviseLien === 'EUR' || deviseLien === 'USD' ? { c: a.cotisation.code, devise: deviseLien } : { c: a.cotisation.code })} className="btn primary">
            <Icone nom="hand-coins" taille={18} />
            <span>{t('Participer à la cotisation')}</span>
          </Link>
        </div>
        <div className="btns">
          <Link to={chemin('liste-publique', { l: code })} className="btn secondary">
            <span>{t('Voir les autres articles')}</span>
          </Link>
        </div>
      </Ecran>
    )

  const n = carte.replace(/\D/g, '')
  const ecart = ecartPartage(a)
  // Livraison chez le destinataire : s'il l'accepte (liste au fil de l'eau), au prix de la livraison à domicile.
  const domicileOk = !!l.domicile && l.mode !== 'groupe'
  const chez = domicileOk && livraison === 'domicile'
  const fraisLiv = chez ? (a.livraisonDomicile ?? a.livraison) : a.livraison
  const rep = repartition({ articles: a.prix, frais: fraisLiv, qui })
  const base = rep.payeurMaintenant
  const frais = moyen === 'carte' ? Math.round(base * 0.02) : 0
  const total = base + frais
  const enDevise = '≈ ' + versDevise(total, devise)
  // Pays de la carte : ses premiers chiffres (BIN), sinon le pays d'émission que l'on indique.
  const paysBin = n.length >= 8 ? paysDuBin(n) : null
  const paysCarte = paysBin ?? paysDeclare
  const erreurs = {
    hausse: ecart > 0 && !accepte ? 'Le prix a augmenté depuis le partage : accepte le nouveau prix pour continuer.' : null,
    prenom: prenom.trim().length < 2 ? 'Indique ton prénom.' : null,
    email: !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()) ? 'Indique une adresse e-mail valide.' : null,
    numero: moyen === 'momo' ? erreurNumero(numero) : null,
    carte: moyen === 'carte' ? (total > PLAFOND_CARTE ? 'Au-delà du plafond de 150 000 F par paiement par carte.' : !marque(n) ? 'Visa ou Mastercard seulement : vérifie les premiers chiffres.' : !luhn(n) ? 'Ce numéro de carte semble mal tapé.' : null) : null,
    expire: moyen === 'carte' && !expireValide(expire) ? 'Date d’expiration invalide (MM/AA).' : null,
    cvc: moyen === 'carte' && !/^\d{3,4}$/.test(cvc) ? 'Le code au dos de la carte : 3 chiffres.' : null,
    pays: moyen === 'carte' && !pays ? 'Indique le pays où tu vis.' : null,
    paysCarte: moyen === 'carte' && n.length >= 8 && !paysCarte ? 'Indique le pays de la banque qui a émis ta carte.' : null,
  }
  const libelle = xpm ? tf('Carte · {m}', { m: xpm === 'google' ? 'Google Pay' : 'Apple Pay' }) : moyen === 'carte' ? `${marque(n)} •••• ${n.slice(-4)}` : `${nomMoMo(operateur(chiffres(numero)))} · ${masquer(chiffres(numero))}`
  const R = COHERENCE_DIASPORA
  const signal = (x: string) =>
    x === 'pays'
      ? tf('Carte émise en {c} ; tu vis en {p}.', { c: t(controle?.paysCarte ?? paysCarte), p: t(pays) })
      : x === 'montant'
        ? tf('Montant inhabituel : plus de {m} F pour un premier cadeau, ou plus de {x} fois tes cadeaux habituels.', { m: F(R.PREMIER_MAX), x: R.MONTANT_X })
        : tf('Cadeaux rapprochés : plusieurs déjà payés avec cette adresse e-mail dans les dernières {h} heures.', { h: R.FENETRE_H })
  const motifRefus = (c: ControleDiaspora) =>
    c.decision !== 'refuse'
      ? ''
      : c.motif === 'cameroun'
        ? t('Carte émise au Cameroun : depuis le Cameroun, offre en Mobile Money (MTN ou Orange), sans frais.')
        : c.motif === 'pays'
          ? c.paysCarte === 'Autre'
            ? t('Carte émise dans un pays qui n’est pas accepté pour les paiements par carte.')
            : tf('Carte émise en {c} : ce pays n’est pas accepté pour les paiements par carte.', { c: t(c.paysCarte) })
          : c.motif === 'rapprochees'
            ? tf('Trop de cadeaux payés à la suite : {n} ou plus en {h} heures avec cette adresse e-mail. Réessaie plus tard.', { n: R.REFUS_RAPPROCHEES, h: R.FENETRE_H })
            : t('Plusieurs éléments inhabituels en même temps : par sécurité, ce paiement est refusé.')
  const pret = (moyen === 'momo' || !!xpm || code3.length >= 4) && (controle?.decision !== 'renforce' || !envoiEmail || codeEmail.length === 6)
  const confirmer = async () => {
    const parCarte = moyen === 'carte' || !!xpm
    // Carte : le numéro et le CVC partent au prestataire (tokenisation, CAP-24) ; BelivaY reçoit le jeton et le BIN.
    let jeton: CarteJeton | null = null
    if (parCarte)
      try {
        jeton = xpm ? await jetonExpress(xpm) : await tokeniser({ numero: n, expire, cvc })
      } catch (e) {
        return (setRefus(messageCarte(e)), setEtape('saisie'), setXpm(null))
      }
    const r = await source.offrirArticleListe(code, p, {
      prenom: prenom.trim(),
      email: email.trim(),
      moyen: libelle,
      prixVu: a.prix,
      qui,
      livraison: chez ? 'domicile' : 'relais',
      devise: parCarte ? devise : undefined,
      carte: jeton ? { jeton, paysCarte: xpm ? pays : paysCarte, pays, codeEmail: codeEmail || undefined } : undefined,
    })
    if (r.ok) {
      if (parCarte) garderReprise({ prenom: prenom.trim(), email: email.trim(), pays })
      naviguer(chemin('liste-offert', { l: code, p, ref: r.ref, de: prenom.trim() }), { replace: true })
    } else if (r.raison === 'verification') {
      // Vérification renforcée : un code à l'e-mail de celui qui offre ; un code faux ne débite rien.
      setControle(r.controle)
      if (envoiEmail && codeEmail) (setRefus('Le code reçu par e-mail n’est pas le bon : rien n’a été débité. Vérifie-le ou renvoie-le.'), setCodeEmail(''))
      else {
        const x = await envoyerEmail(email.trim(), () => source.envoyerCodeCadeau(code, email.trim()))
        if (x) (setRefus(null), setEnvoiEmail(x))
      }
    } else if (r.raison === 'coherence') (setControle(r.controle), setEtape('saisie'), setXpm(null), setRefus(null))
    else if (r.raison === 'plafond') (setRefus('Plafond atteint : 150 000 F par paiement par carte, et 500 000 F par mois avec la même adresse e-mail. Rien n’a été débité.'), setEtape('saisie'), setXpm(null))
    else if (r.raison === 'domicile') (setLivraison('relais'), setEtape('saisie'), setRefus('La livraison à domicile n’est plus possible pour cette liste : choisis le relais. Rien n’a été débité.'))
    else if (r.raison === 'offert') setPris(true)
    else if (r.raison === 'prix') (setChange(r.prix), setAccepte(false), setEtape('saisie'), setL(await source.listePublique(code)))
    else if (r.raison === 'garantie') (setQui('payeur'), setEtape('saisie'), setRefus('La livraison ne peut pas être laissée au destinataire pour cet article : rien n’a été débité.'))
    else (setRefus('Cette liste n’est plus partagée : rien n’a été débité.'), setEtape('saisie'))
  }
  const champ = (cle: keyof typeof erreurs, label: string | null, icone: string, input: ReactNode, aide?: string) => (
    <div className="fld">
      {label && <label htmlFor={'lo-' + cle}>{label}</label>}
      <div className={'inp' + (vu && erreurs[cle] ? ' err' : '')}>
        <Icone nom={icone} taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
        {input}
      </div>
      {vu && erreurs[cle] ? (
        <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
          {t(erreurs[cle]!)}
        </div>
      ) : (
        aide && <div className="hint">{aide}</div>
      )}
    </div>
  )
  // Apple Pay / Google Pay : prénom, e-mail et pays d'abord, puis la feuille du téléphone ; au retour, la confirmation.
  const express = (m: 'apple' | 'google') => {
    setVu(true)
    if (erreurs.hausse || erreurs.prenom || erreurs.email || erreurs.pays || total > PLAFOND_CARTE) return
    ecrireXp({ code, p, prenom: prenom.trim(), email: email.trim(), prixVu: a.prix, qui, livraison: chez ? 'domicile' : 'relais', pays, devise })
    naviguer(chemin('xp-pay', { m, t: String(total), back: chemin('liste-offrir', { l: code, p }), ok: chemin('liste-offrir', { l: code, p, xp: m }) }))
  }
  const remise = chez
    ? tf('Livré chez {p}, à {v}, avec son propre code. Son adresse ne t’est jamais montrée : le livreur appelle {p}.', { p: l.prenom, v: t(l.domicile!.ville) })
    : l.relais
    ? l.mode === 'groupe' && l.remiseLe
      ? tf('Remis au relais de {p} avec ses autres cadeaux, le {d} au plus tard. Pas besoin de son adresse.', { p: l.prenom, d: jourSeul(l.remiseLe, langue) })
      : tf('Livré au relais de {p} ({q}), avec son propre code de retrait. Pas besoin de son adresse.', { p: l.prenom, q: t(l.quartier) })
    : t('Livré au relais choisi par le destinataire. Pas besoin de son adresse.')
  // Dès 1024 px, page web publique (§ 4.7, 5.12) : l'article, ce qui le concerne et la livraison à gauche (7/12) ; la
  // devise, le récapitulatif et le paiement dans l'aside collant à droite (5/12). Déplacés, jamais dupliqués.
  const recapitulatif = (
    <>
      {moyen === 'carte' && etape === 'saisie' && (
        <div>
          <Styles id="10d630a833" />
          <div className="dev-seg" role="group" aria-label={t('Devise du paiement')}>
            <span className="lb">{t('Tu paies depuis l’étranger en')}</span>
            <span className="ch">
              {(['EUR', 'USD'] as const).map((x) => (
                <a key={x} href="#" className={devise === x ? 'on' : ''} aria-pressed={devise === x} onClick={(e) => (e.preventDefault(), setDevise(x))}>
                  <b>{x === 'EUR' ? '€' : '$'}</b>
                  {t(x === 'EUR' ? 'Euro' : 'Dollar US')}
                </a>
              ))}
            </span>
            <span className="rt">{t(devise === 'EUR' ? '1 € = 655,957 F · taux fixe' : 'Taux du jour, figé au paiement')}</span>
          </div>
        </div>
      )}
      <div className="card ">
        <div className="recap">
          <div className="kv">
            <span className="k">{t(ecart ? 'Article · prix du jour' : 'Article')}</span>
            <span className="v ">{F(a.prix)}&nbsp;F</span>
          </div>
          {ecart !== 0 && a.prixPartage !== null && (
            <div className="kv">
              <span className="k">{tf('Prix au partage, le {d}', { d: jourSeul(l.partageLe, langue) })}</span>
              <span className="v ">
                <s className="was">{F(a.prixPartage)}&nbsp;F</s> {tf(ecart > 0 ? '+{m} F' : '−{m} F', { m: F(Math.abs(ecart)) })}
              </span>
            </div>
          )}
          <div className="kv">
            <span className="k">{chez ? tf('Livraison chez {p}', { p: l.prenom }) : l.relais ? tf('Livraison au relais de {q}', { q: t(l.quartier) }) : t('Livraison au relais')}</span>
            <span className="v ">{!fraisLiv ? t('offerte') : qui === 'destinataire' ? tf(chez ? '{p} la paie à la livraison' : '{p} la paie au retrait', { p: l.prenom }) : F(fraisLiv) + ' F'}</span>
          </div>
          {frais > 0 && (
            <div className="kv">
              <span className="k">{t('Frais de service carte (2 %)')}</span>
              <span className="v ">{F(frais)}&nbsp;F</span>
            </div>
          )}
          <div className="total">
            <span className="tl2">{t('Total')}</span>
            <span>
              <span className="price">
                {F(total)}
                <small> F</small>
              </span>
              {moyen === 'carte' && enDevise && (
                <>
                  {' '}
                  <span className="t13 c3 b7">{enDevise}</span>
                </>
              )}
            </span>
          </div>
        </div>
      </div>
    </>
  )
  const verification = (
    <div className="card vedette">
      {moyen === 'momo' ? (
        <div className="cl08-wait">
          <span className="cl08-spin"></span>
          <div className="grow">
            <b>{t('Valide la demande sur ton téléphone')}</b>
            <span className="s">{tf('{m} F · {o}', { m: F(total), o: libelle })}</span>
          </div>
        </div>
      ) : xpm ? (
        <div className="cl08-wait">
          <span className="grow">
            <b>{tf('{m} validé sur ton téléphone', { m: xpm === 'google' ? 'Google Pay' : 'Apple Pay' })}</b>
            <span className="s">{tf('{m} F · {o}', { m: F(total), o: libelle })}</span>
          </span>
        </div>
      ) : (
        <>
          <h3 className="cl11-k">{t('3-D Secure')}</h3>
          <div className="fld">
            <label htmlFor="lo-3ds">{t('Code reçu par SMS de ta banque')}</label>
            <div className="inp">
              <input id="lo-3ds" inputMode="numeric" maxLength={6} value={code3} onChange={(e) => setCode3(e.target.value.replace(/\D/g, ''))} />
            </div>
          </div>
        </>
      )}
      {controle?.decision === 'renforce' && envoiEmail && (
        <>
          <div className="note amber">
            <Icone nom="shield-alert" taille={18} />
            <div>
              <b>{t('Vérification renforcée')}</b> {t('Ce paiement sort de l’ordinaire ; un second code confirme que c’est bien toi :')}
              {controle.signaux.map((x) => (
                <span key={x} style={{ display: 'block' }}>
                  · {signal(x)}
                </span>
              ))}
            </div>
          </div>
          <div className="fld">
            <label htmlFor="lo-code-email">{t('Code reçu par e-mail de BelivaY')}</label>
            <div className="inp">
              <input id="lo-code-email" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={codeEmail} onChange={(e) => setCodeEmail(e.target.value.replace(/\D/g, ''))} />
            </div>
            <div className="hint">{tf('Envoyé à {e}.', { e: envoiEmail.destination })}</div>
            {envoiEmail.codeDemo && <p className="t12 c3">{t('Démonstration : le code est ') + envoiEmail.codeDemo + '.'}</p>}
            <div className="links">
              <a
                href="#"
                onClick={async (e) => {
                  e.preventDefault()
                  const x = await envoyerEmail(email.trim(), () => source.envoyerCodeCadeau(code, email.trim()), { renvoi: true })
                  if (!x) return setRefus(RENVOI_TROP_TOT)
                  ;(setEnvoiEmail(x), setCodeEmail(''), setRefus(null))
                }}
              >
                {t('Je n’ai rien reçu : renvoyer l’e-mail')}
              </a>
            </div>
          </div>
        </>
      )}
      <div className="btns">
        <button type="button" className={'btn primary' + (pret ? '' : ' off')} onClick={() => pret && confirmer()}>
          <span>{t(moyen === 'momo' ? 'J’ai validé sur mon téléphone' : 'Valider')}</span>
        </button>
      </div>
      <div className="btns">
        <button type="button" className="btn secondary" onClick={() => (setEtape('saisie'), setXpm(null), setControle(null), setEnvoiEmail(null), setCodeEmail(''), setRefus(null))}>
          <span>{t('Modifier')}</span>
        </button>
      </div>
    </div>
  )
  const choixLivraison = (
    <>
      {domicileOk && (
        <>
          <div className="sec">
            <h2>{t('Livraison')}</h2>
          </div>
          <a href="#" role="radio" aria-checked={!chez} className={'radio' + (!chez ? ' on' : '')} onClick={(e) => (e.preventDefault(), setLivraison('relais'))}>
            <span className="rd"></span>
            <span className="grow">
              <span className="rt" style={{ display: 'block' }}>
                {tf('Au relais de {p}', { p: l.prenom })}
              </span>
              <span className="rs" style={{ display: 'block' }}>
                {tf('{q} · {m} · {p} retire avec son code', { q: t(l.quartier), m: a.livraison ? F(a.livraison) + ' F' : t('offerte'), p: l.prenom })}
              </span>
            </span>
          </a>
          <a href="#" role="radio" aria-checked={chez} className={'radio' + (chez ? ' on' : '')} onClick={(e) => (e.preventDefault(), setLivraison('domicile'))}>
            <span className="rd"></span>
            <span className="grow">
              <span className="rt" style={{ display: 'block' }}>
                {tf('Chez {p}, à {v}', { p: l.prenom, v: t(l.domicile!.ville) })}
              </span>
              <span className="rs" style={{ display: 'block' }}>
                {tf('{m} F · son adresse ne t’est jamais montrée', { m: F(a.livraisonDomicile ?? a.livraison) })}
              </span>
            </span>
          </a>
        </>
      )}
      <QuiPaieLivraison articles={a.prix} frais={fraisLiv} qui={qui} choisir={setQui} prenom={l.prenom} />
      {a.prix >= COTISER_DES && (
        <div className="links">
          <a href="#" onClick={async (e) => (e.preventDefault(), await source.cotiserArticleListe(code, p).then((x) => (x.ok ? naviguer(chemin('cotisation-participer', { c: x.code })) : setRefus('Cet article ne peut plus être offert à plusieurs.'))))}>
            {t('Trop cher seul ? Cotiser à plusieurs')}
          </a>
        </div>
      )}
    </>
  )
  const paiement = (
    <>
      <div className="sec">
        <h2>{t('Toi')}</h2>
      </div>
      {champ('prenom', tf('Ton prénom ({p} le verra)', { p: l.prenom }), 'user', <input id="lo-prenom" className="grow" value={prenom} maxLength={40} autoComplete="given-name" onChange={(e) => setPrenom(e.target.value)} />)}
      {champ('email', t('Ton e-mail, pour suivre le cadeau'), 'mail', <input id="lo-email" className="grow" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />)}
      <div className="sec">
        <h2>{t('Paiement')}</h2>
      </div>
      <a href="#" role="radio" aria-checked={moyen === 'momo'} className={'radio' + (moyen === 'momo' ? ' on' : '')} onClick={(e) => (e.preventDefault(), setMoyen('momo'))}>
        <span className="rd"></span>
        <span className="grow">
          <span className="rt" style={{ display: 'block' }}>
            {t('Mobile Money · MTN ou Orange')}
          </span>
          <span className="rs" style={{ display: 'block' }}>
            {t('Au Cameroun')}
          </span>
        </span>
      </a>
      {moyen === 'momo' &&
        champ(
          'numero',
          null,
          'smartphone',
          <>
            <b className="t15">+237</b>
            <input id="lo-numero" className="grow" type="tel" inputMode="tel" aria-label={t('Ton numéro MTN ou Orange')} placeholder="6XX XX XX XX" value={numero} onChange={(e) => setNumero(espacer(e.target.value))} />
          </>,
        )}
      <a href="#" role="radio" aria-checked={moyen === 'carte'} className={'radio' + (moyen === 'carte' ? ' on' : '')} onClick={(e) => (e.preventDefault(), setMoyen('carte'))}>
        <span className="rd"></span>
        <span className="grow">
          <span className="rt" style={{ display: 'block' }}>
            {t('Carte Visa ou Mastercard')}
          </span>
          <span className="rs" style={{ display: 'block' }}>
            {t('Depuis l’étranger · 3-D Secure · 2 % de frais de service')}
          </span>
        </span>
      </a>
      {moyen === 'carte' && (
        <>
          <div className="fld">
            <label htmlFor="lo-pays">{t('Pays où tu vis')}</label>
            <div className={'inp' + (vu && erreurs.pays ? ' err' : '')}>
              <Icone nom="globe" taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
              <select id="lo-pays" value={pays} onChange={(e) => (setPays(e.target.value), setControle(null))} style={{ width: '100%', border: 0, background: 'transparent', font: 'inherit', color: 'inherit' }}>
                <option value="">{t('Choisis ton pays')}</option>
                {PAYS_DIASPORA.map(([x]) => (
                  <option key={x} value={x}>
                    {t(x)}
                  </option>
                ))}
                <option value="Cameroun">{t('Cameroun')}</option>
                <option value="Autre">{t('Autre pays')}</option>
              </select>
            </div>
            {vu && erreurs.pays ? (
              <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
                {t(erreurs.pays)}
              </div>
            ) : (
              <div className="hint">{t(pays === 'Cameroun' ? 'Au Cameroun, Mobile Money est plus simple et sans frais.' : 'Comparé au pays de ta carte : un contrôle protège ton paiement, comme pour un compte diaspora.')}</div>
            )}
          </div>
          {champ(
            'carte',
            null,
            'landmark',
            <input id="lo-carte" className="grow" inputMode="numeric" autoComplete="cc-number" aria-label={t('Numéro de carte')} placeholder="4242 4242 4242 4242" value={carte} onChange={(e) => setCarte(grouper(e.target.value))} />,
            t(devise === 'EUR' ? 'Plafond : 150 000 F par paiement. Montant en euros fixé au paiement (655,957 F pour 1 €).' : 'Plafond : 150 000 F par paiement. Montant en dollars fixé au paiement, au taux du jour.'),
          )}
          {paysBin ? (
            <div className="hint-l">
              <Icone nom="credit-card" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
              <span>{tf('Carte émise en {c}, d’après ses premiers chiffres.', { c: t(paysBin) })}</span>
            </div>
          ) : (
            n.length >= 8 && (
              <div className="fld">
                <label htmlFor="lo-pays-carte">{t('Pays d’émission de la carte')}</label>
                <div className={'inp' + (vu && erreurs.paysCarte ? ' err' : '')}>
                  <select id="lo-pays-carte" value={paysDeclare} onChange={(e) => (setPaysDeclare(e.target.value), setControle(null))} style={{ width: '100%', border: 0, background: 'transparent', font: 'inherit', color: 'inherit' }}>
                    <option value="">{t('Choisis le pays')}</option>
                    {PAYS_DIASPORA.map(([x]) => (
                      <option key={x} value={x}>
                        {t(x)}
                      </option>
                    ))}
                    <option value="Cameroun">{t('Cameroun')}</option>
                    <option value="Autre">{t('Autre pays')}</option>
                  </select>
                </div>
                <div className="hint" role={vu && erreurs.paysCarte ? 'alert' : undefined} style={vu && erreurs.paysCarte ? { color: 'var(--red)' } : undefined}>
                  {t(vu && erreurs.paysCarte ? erreurs.paysCarte : 'Le pays de la banque qui a émis ta carte (au dos ou dans ton appli bancaire).')}
                </div>
              </div>
            )
          )}
          <div className="row" style={{ gap: 10 }}>
            <span className="grow">{champ('expire', t('Expiration'), 'calendar', <input id="lo-expire" className="grow" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/AA" value={expire} onChange={(e) => setExpire(e.target.value.replace(/[^\d/]/g, '').replace(/^(\d{2})(\d)/, '$1/$2').slice(0, 5))} />)}</span>
            <span className="grow">{champ('cvc', t('Code (CVC)'), 'lock', <input id="lo-cvc" className="grow" inputMode="numeric" autoComplete="cc-csc" maxLength={4} value={cvc} onChange={(e) => setCvc(e.target.value.replace(/\D/g, ''))} />)}</span>
          </div>
          <Styles id="b472efbe3c" />
          <div className="xp-k">
            <Icone nom="zap" taille={14} />
            {t('Paiement express')}
          </div>
          <div className="xp-row">
            <a href="#" className="xp-b apple" aria-label={t('Payer avec Apple Pay')} onClick={(e) => (e.preventDefault(), express('apple'))}>
              <Icone nom="apple" taille={20} />
              <span>{t('Pay')}</span>
            </a>
            <a href="#" className="xp-b gpay" aria-label={t('Payer avec Google Pay')} onClick={(e) => (e.preventDefault(), express('google'))}>
              <Icone nom="gpay-g" taille={20} />
              <span>{t('Pay')}</span>
            </a>
          </div>
          <p className="xp-note">{t('Ta carte enregistrée dans le téléphone, validée par Face ID ou ton empreinte. Même frais que la carte (2 %).')}</p>
          <div className="hint-l">
            <Icone nom="shield-check" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{tf('Plafonds : {p} F par paiement, {m} F par mois avec la même adresse e-mail. Pas besoin de compte.', { p: F(PLAFONDS_DIASPORA.paiement), m: F(PLAFONDS_DIASPORA.mois) })}</span>
          </div>
        </>
      )}
      {controle?.decision === 'refuse' && (
        <div className="note red" role="alert">
          <Icone nom="shield-x" taille={18} />
          <div>
            <b>{t('Paiement refusé : rien n’a été débité.')}</b> {motifRefus(controle)}
            {controle.motif === 'signaux' &&
              controle.signaux.map((x) => (
                <span key={x} style={{ display: 'block' }}>
                  · {signal(x)}
                </span>
              ))}
            <span style={{ display: 'block' }}>
              {t('Une erreur ? Le support vérifie avec toi et peut débloquer le paiement.')} <Link to={chemin('aide')}>{t('Contacter le support')}</Link>
            </span>
          </div>
        </div>
      )}
      <div className="note green">
        <Icone nom="shield-check" taille={18} />
        <div>{tf('Si le cadeau n’arrive pas ou pose un problème, c’est toi qui es remboursé, sur ce moyen de paiement. Jamais {p}.', { p: l.prenom })}</div>
      </div>
      {vu && erreurs.hausse && (
        <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
          {t(erreurs.hausse)}
        </div>
      )}
      <div className="btns mt16">
        <button
          type="button"
          className="btn primary"
          onClick={() => {
            setVu(true)
            if (!Object.values(erreurs).some(Boolean)) (setRefus(null), setControle(null), setEnvoiEmail(null), setCodeEmail(''), setCode3(''), setEtape('valider'))
          }}
        >
          <Icone nom={moyen === 'carte' ? 'lock' : 'gift'} taille={18} />
          <span>{moyen === 'carte' ? tf('Payer {m} F · {d}', { m: F(total), d: versDevise(total, devise) }) : tf('Offrir · payer {m} F', { m: F(total) })}</span>
        </button>
      </div>
      <div className="hint-l">
        <Icone nom="lock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t('L’article est réservé pour toi dès que tu appuies : personne d’autre ne peut l’offrir en même temps.')}</span>
      </div>
    </>
  )
  return (
    <Ecran route="liste-offrir" navigation={navigation} avant={avant} gabarit="web">
      <Styles id="02f3dac5cd" />
      <Zone nom="haut">
        {bandeau}
        <div className="pg">
          <div className="pg-k">{tf('Liste « {n} »', { n: t(l.nom) })}</div>
          <h1 className="pg-t">{tf('Offrir à {p}', { p: l.prenom })}</h1>
        </div>
      </Zone>
      <Colonne>
        <div className="card tight">
          <div className="li">
            <span className="thumb" style={{ width: '56px', height: '56px', borderRadius: '14px' }}>
              <Dessin id={a.dessin} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t(a.titre)}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {[variante, t(produit && produit.stock <= 0 ? 'épuisé' : 'disponible')].filter(Boolean).join(' · ')}
              </span>
            </span>
          </div>
        </div>
        {refus && (
          <div className="note red">
            <Icone nom="circle-alert" taille={18} />
            <div>{t(refus)}</div>
          </div>
        )}
        {change !== null && (
          <div className="note red" role="alert">
            <Icone nom="circle-alert" taille={18} />
            <div>{tf('Le prix vient de changer pendant le paiement : {m} F aujourd’hui. Rien n’a été débité ; vérifie le nouveau total puis valide.', { m: F(change) })}</div>
          </div>
        )}
        {ecart < 0 && (
          <div className="note green">
            <Icone nom="trending-down" taille={18} />
            <div>{tf('Bonne nouvelle : {a} coûte {m} F de moins que lorsque {p} a partagé sa liste. Tu paies le prix d’aujourd’hui.', { a: t(a.titre), m: F(-ecart), p: l.prenom })}</div>
          </div>
        )}
        {ecart > 0 && (
          <div className="note amber">
            <Icone nom="trending-up" taille={18} />
            <div>
              <b>{tf('Le prix a augmenté de {m} F depuis le partage.', { m: F(ecart) })}</b>
              {tf(' {p} l’a partagé à {a} F ; il coûte {b} F aujourd’hui. Tu paies toujours le prix du jour : à toi de choisir.', { p: l.prenom, a: F(a.prixPartage ?? a.prix), b: F(a.prix) })}
              <a href="#" role="checkbox" aria-checked={accepte} className="check" style={{ color: 'inherit' }} onClick={(e) => (e.preventDefault(), setAccepte(!accepte))}>
                <span className={'cb' + (accepte ? ' on' : '')}>{accepte && <Icone nom="check" taille={14} trait={3} />}</span>
                <span className="grow">{tf('J’accepte le prix du jour : {m} F', { m: F(a.prix) })}</span>
              </a>
              {vu && erreurs.hausse && (
                <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
                  {t(erreurs.hausse)}
                </div>
              )}
            </div>
          </div>
        )}
        {!tabL && recapitulatif}
        <div className="hint-l">
          <Icone nom="boxes" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{remise}</span>
        </div>
        {!tabL ? (
          etape === 'valider' ? (
            verification
          ) : (
            <>
              {choixLivraison}
              {paiement}
            </>
          )
        ) : (
          etape !== 'valider' && choixLivraison
        )}
      </Colonne>
      {tabL && (
        <Aside titre="Paiement">
          {recapitulatif}
          {etape === 'valider' ? verification : paiement}
        </Aside>
      )}
      <Zone nom="bas">
        <PiedWeb />
      </Zone>
    </Ecran>
  )
}
