// Écran « Passer commande » (CL-08, route paiement-moyen), forme d'origine du prototype rendue réelle (DP-54) :
// la feuille « Moyen de paiement » posée sur le panier (ou sur « Ta première commande », ?from=premiere). C'est
// ici, à l'achat, que se choisissent :
// 1. la livraison : au relais (relais habituel, ou un autre) ou à domicile (adresse principale ; XL : domicile) ;
// 2. quand payer : maintenant, ou au comptoir (livraison d'avance, le reste au retrait ; plafond du palier) ;
// 3. le moyen : Wallet (si le solde suffit), MTN MoMo, Orange Money, autre numéro (opérateur reconnu), Apple /
//    Google Pay, carte enregistrée (2 % de frais affichés, 150 000 F au plus ; devise du paiement à l'étranger) ;
// 4. le récapitulatif (remise Prime comprise) ; « Payer » crée la commande : Mobile Money attend la validation sur
//    le téléphone, Apple / Google Pay passent par la feuille du téléphone, le reste est confirmé tout de suite.
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
import { calculer, classeColis, type SousCommandeFrais } from '../../donnees/frais'
import { chiffres, erreurNumero, espacer, masquer, nomMoMo, operateur } from '../../donnees/numeros'
import { palier, remisePrime } from '../../donnees/prime'
import { source, type Carte, type DonneesPanier, type DonneesPrime, type MoyenCommande, type MoyenPaiement } from '../../donnees/source'
import { F } from '../../i18n/format'
import { quand } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { useCompteDiaspora, useSession } from '../../session'
import { Panier } from '../CL-07/Panier'
import { PremiereCommande } from '../CL-03/PremiereCommande'
import { EURO } from '../CL-12/Diaspora'
import { useEnLigne } from '../CL-09/Commun'

const MAX_CARTE = 150000

// L'achat : données, choix (livraison, quand payer, moyen), montants et paiement. Partagé avec « Ta première
// commande » (CL-03), qui pose les mêmes choix.
export function useAchat() {
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const [d, setD] = useState<{ panier: DonneesPanier; moyens: MoyenPaiement[]; cartes: Carte[]; solde: number; prime: DonneesPrime; maintenant: number } | null>(null)
  const [mode, setMode] = useState<'relais' | 'domicile'>('relais')
  const [comptoir, setComptoir] = useState(params.get('comptoir') === '1')
  const [moyen, setMoyen] = useState<string>('mtn')
  const [autre, setAutre] = useState('')
  const [devise, setDevise] = useState<'EUR' | 'USD'>('EUR')
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
      const def = moyens.find((m) => m.parDefaut)
      if (def) setMoyen('mm:' + def.id)
    })
  }, [naviguer])
  if (!d) return null
  const p = d.panier
  const boutiques = [...new Set(p.lignes.map((l) => l.boutique))]
  const sc: SousCommandeFrais[] = boutiques.map((b) => ({ boutique: b, zone: p.boutiques[b]?.zone ?? 'Mvog-Ada', articles: p.lignes.filter((l) => l.boutique === b).map((l) => ({ prix: l.prix, quantite: l.qte, classe: l.classe })) }))
  const xl = sc.some((s) => ['XL', 'HG'].includes(classeColis(s)))
  const m = xl ? 'domicile' : mode
  const f = calculer(m, sc)
  // Abonnement (Prime, Pass) : la livraison de base offerte ou réduite, selon le palier et l'usage du mois.
  const ab = d.prime.abonnement
  const remise = remisePrime(ab ? { palier: ab.palier, actif: d.prime.actif } : null, m, f.sousTotal, f.total - f.sousTotal, d.prime.usage)
  const livraison = f.total - f.sousTotal - remise
  const comptoirPossible = m === 'relais' && f.sousTotal <= p.plafondComptoir
  const auComptoir = comptoir && comptoirPossible
  const aPayer = auComptoir ? livraison : f.total - remise
  const estCarte = (x: string) => x.startsWith('carte:') || x === 'apple' || x === 'google'
  const parCarte = estCarte(moyen)
  const frais = parCarte ? Math.round(aPayer * 0.02) : 0
  const montant = aPayer + frais
  const carteTropHaute = parCarte && montant > MAX_CARTE
  const walletOk = d.solde >= aPayer
  const articles = p.lignes.reduce((n, l) => n + l.qte, 0)
  // Colis prêts sous le plus long délai des boutiques.
  const heures = Math.max(0, ...boutiques.map((b) => parseInt(p.boutiques[b]?.delai ?? '') || 0))
  const pretVers = d.maintenant + heures * 3600 * 1000

  const mm = d.moyens.find((x) => 'mm:' + x.id === moyen)
  const carte = d.cartes.find((c) => 'carte:' + c.id === moyen)
  const nomMoyen = mm
    ? nomMoMo(mm.operateur)
    : carte
      ? `${carte.marque} •••• ${carte.derniers}`
      : moyen === 'wallet'
        ? 'Wallet BelivaY'
        : moyen === 'apple'
          ? 'Apple Pay'
          : moyen === 'google'
            ? 'Google Pay'
            : nomMoMo(operateur(chiffres(autre))) || 'Mobile Money'
  const choisirMode = (x: 'relais' | 'domicile') => {
    if (x === 'relais' && xl) return
    setMode(x)
    if (x === 'domicile') setComptoir(false)
    setErreur(null)
    source.choisirModePanier(x)
  }
  const choisirMoyen = (x: string) => (setMoyen(x), setErreur(null))
  // Jamais de carte pour une commande au comptoir (CPY-49, CCP-03) : le moyen revient au Mobile Money du compte.
  const choisirComptoir = (v: boolean) => {
    setComptoir(v)
    setErreur(null)
    if (v && estCarte(moyen)) {
      const def = d.moyens.find((x) => x.parDefaut) ?? d.moyens[0]
      setMoyen(def ? 'mm:' + def.id : 'autre')
    }
  }

  const payer = async () => {
    if (envoi) return
    if (!enLigne) return setErreur('Pas de connexion : le paiement attend le réseau. Rien n’a été demandé.')
    if (auComptoir && parCarte) return setErreur('Au comptoir, la livraison se paie en Mobile Money ou avec le portefeuille, jamais par carte.')
    let type: MoyenCommande = 'mtn'
    let numero: string | null = null
    if (mm) {
      type = mm.operateur === 'MTN' ? 'mtn' : 'orange'
      numero = mm.numeroMasque
    } else if (moyen === 'autre') {
      const e = erreurNumero(autre)
      if (e) return setErreur(e)
      type = 'autre'
      numero = masquer(chiffres(autre))
    } else if (carte) {
      type = 'carte'
      numero = `•••• ${carte.derniers}`
    } else if (moyen === 'wallet') {
      if (!walletOk) return setErreur('Solde insuffisant : recharge ton Wallet ou choisis un autre moyen.')
      type = 'wallet'
    } else type = moyen as MoyenCommande
    if (carteTropHaute) return setErreur('150 000 F au plus par paiement par carte : choisis Mobile Money ou le Wallet.')
    if (m === 'domicile' && !p.adresse) return setErreur('Ajoute une adresse de livraison pour être livré à domicile.')
    setEnvoi(true)
    await source.choisirModePanier(m)
    const c = await source.passerCommande({ mode: m, moyen: type, comptoir: auComptoir, numero, livraison, frais, prime: remise })
    if (type === 'apple' || type === 'google')
      return naviguer(chemin('xp-pay', { m: type, t: String(c.montant), back: chemin('paiement-moyen'), ok: chemin(auComptoir ? 'validee' : 'confirmee', { ref: c.ref }), ref: c.ref }))
    naviguer(c.etat === 'payee' ? chemin(auComptoir ? 'validee' : 'confirmee', { ref: c.ref }) : chemin('paiement-attente', { ref: c.ref }), { replace: true })
  }
  return {
    d, p, sc, xl, m, f, ab, remise, livraison, comptoirPossible, auComptoir, aPayer, parCarte, frais, montant, carteTropHaute, walletOk, articles, pretVers,
    mm, carte, nomMoyen, moyen, autre, devise, erreur, envoi, enLigne, cause, heures,
    choisirMode, choisirMoyen, setComptoir: choisirComptoir, setAutre: (v: string) => (setAutre(espacer(v)), setErreur(null)), setDevise, payer,
  }
}
export type Achat = NonNullable<ReturnType<typeof useAchat>>

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
  const { t, tf, langue } = usePreferences()
  const { interrupteurs } = useSession()
  const naviguer = useNavigate()
  const { d, p, m } = a
  const compte = d.moyens.find((x) => x.duCompte)?.numeroMasque
  const opAutre = operateur(chiffres(a.autre))
  const express = a.moyen === 'apple' || a.moyen === 'google'
  const momo = !!a.mm || a.moyen === 'autre'
  const tabL = useDes('tab-l')
  const op = (nom: string, taille = 20) => (
    <span className="cl08-op card" aria-hidden="true">
      <Icone nom={nom} taille={taille} />
    </span>
  )
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
                  ? 'Ton dernier paiement n’a pas abouti : solde Mobile Money insuffisant. Rien n’a été débité. Choisis un autre numéro, le portefeuille, ou recharge ton compte Mobile Money puis réessaie.'
                  : a.cause === 'carte'
                    ? 'Ta banque a refusé la carte au dernier essai. Rien n’a été débité. Le Mobile Money se paie sans frais de service.'
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
        <div className="cl08-kk">{t('Livraison')}</div>
        <Rangee
          on={m === 'relais'}
          inactif={a.xl}
          op={op('store')}
          titre={tf('Au relais · {r}', { r: t(p.relais) })}
          sous={t(a.xl ? 'Un colis XL ne va pas en relais : livraison à domicile obligatoire.' : 'Retrait avec ton code · garde gratuite le jour d’arrivée · offerte dès 30 000 F')}
          choisir={() => a.choisirMode('relais')}
        />
        <Rangee
          on={m === 'domicile'}
          op={op('house')}
          titre="À domicile"
          sous={p.adresse ? tf('{a} · 1 000 F par colis · offerte dès 50 000 F', { a: t(p.adresse) }) : t('Ajoute d’abord une adresse de livraison')}
          choisir={() => a.choisirMode('domicile')}
        />
        <div className="t12 c3" style={{ margin: '6px 4px 0' }}>
          {m === 'relais' ? (
            <Link to={chemin('relais-choix', { retour: 'paiement-moyen' })} className="cor b7">
              {t('Choisir un autre relais')}
            </Link>
          ) : (
            <Link to={chemin(p.adresse ? 'adresses' : 'adresse')} className="cor b7">
              {t(p.adresse ? 'Changer d’adresse' : 'Ajouter une adresse')}
            </Link>
          )}
        </div>

        <div className="cl08-kk">{t('Quand payer')}</div>
        <Rangee on={!a.auComptoir} op={op('lock')} titre="Maintenant" sous={t('Ton argent reste bloqué jusqu’au retrait : le vendeur n’est payé qu’après.')} choisir={() => a.setComptoir(false)} />
        <Rangee
          on={a.auComptoir}
          inactif={!a.comptoirPossible}
          op={op('store')}
          titre="Au retrait, au comptoir du relais"
          sous={
            m !== 'relais'
              ? t('Pas pour une livraison à domicile.')
              : !a.comptoirPossible
                ? tf('Paiement au comptoir non proposé : panier au-delà de {m} F.', { m: F(p.plafondComptoir) })
                : tf('{l} F de livraison maintenant, {r} F au retrait en Mobile Money. Jamais d’espèces.', { l: F(a.livraison), r: F(a.f.sousTotal) })
          }
          choisir={() => a.setComptoir(true)}
        />

        <Module ff="FF-WALLET">
          <div className="cl08-kk">{t('Wallet BelivaY')}</div>
          <Rangee
            on={a.moyen === 'wallet'}
            inactif={!a.walletOk}
            op={
              <span className="cl08-op" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', borderRadius: '12px', background: 'linear-gradient(135deg,#F58A3A,#EA6C1F)', color: '#fff', flexShrink: '0' }}>
                <Icone nom="wallet" taille={19} />
              </span>
            }
            titre="Wallet BelivaY"
            sous={a.walletOk ? tf('Solde {s} F · en un geste, sans frais', { s: F(d.solde) }) : tf('Solde {s} F : insuffisant pour ce panier', { s: F(d.solde) })}
            choisir={() => a.choisirMoyen('wallet')}
          />
          {!a.walletOk && (
            <div className="t12 c3" style={{ margin: '4px 4px 0' }}>
              <Link to={chemin('wallet', { st: 'recharger' })} className="cor b7">
                {t('Recharger mon Wallet')}
              </Link>
            </div>
          )}
        </Module>

        <div className="cl08-kk">{t('Mobile Money')}</div>
        {[...d.moyens]
          .sort((x, y) => Number(y.duCompte) - Number(x.duCompte))
          .map((x) => (
            <Rangee
              key={x.id}
              on={a.moyen === 'mm:' + x.id}
              op={
                <span className={'cl08-op ' + (x.operateur === 'MTN' ? 'mtn' : 'orange')} aria-hidden="true">
                  {t(x.operateur === 'MTN' ? 'MTN' : 'orange')}
                </span>
              }
              titre={nomMoMo(x.operateur)}
              sous={
                <>
                  <span className="cl08-tel">{x.numeroMasque}</span>
                  {x.duCompte && t(' · ton numéro vérifié')}
                </>
              }
              choisir={() => a.choisirMoyen('mm:' + x.id)}
            />
          ))}
        <Rangee
          on={a.moyen === 'autre'}
          op={
            <span className="cl08-op plus">
              <Icone nom="plus" taille={20} />
            </span>
          }
          titre="Autre numéro Mobile Money"
          sous={t('L’opérateur est reconnu à la saisie')}
          choisir={() => a.choisirMoyen('autre')}
        />
        {a.moyen === 'autre' && (
          <div className="cl08-sub" style={{ marginLeft: '0' }}>
            <div className="fld" style={{ marginTop: '0' }}>
              <label htmlFor="pm-autre">{t('Numéro Mobile Money')}</label>
              <div className={'inp focus' + (a.erreur ? ' err' : '')}>
                <span className="t15 b7 c3">{t('+237')}</span>
                <input id="pm-autre" className="grow" type="tel" inputMode="tel" placeholder="6XX XX XX XX" value={a.autre} onChange={(e) => a.setAutre(e.target.value)} />
                {opAutre && <span className="suf">{t(nomMoMo(opAutre))}</span>}
              </div>
            </div>
            {opAutre && (
              <div className="t12 c3 mt8" style={{ lineHeight: '1.45' }}>
                {tf('Opérateur reconnu : {o}. La demande part sur ce numéro ; tes messages BelivaY restent sur ', { o: t(nomMoMo(opAutre)) })}
                <span className="cl08-tel">{compte}</span>
                {t('.')}
              </div>
            )}
          </div>
        )}

        <Styles id="b472efbe3c" />
        <div className="cl08-kk">{t('Paiement express')}</div>
        <Rangee
          on={a.moyen === 'apple'}
          op={
            <span className="cl08-op apple">
              <Icone nom="apple" taille={15} />
              <span>{t('Pay')}</span>
            </span>
          }
          titre="Apple Pay"
          inactif={a.auComptoir}
          sous={t(a.auComptoir ? 'Pas pour une commande payée au comptoir' : 'Carte du téléphone · Face ID ou empreinte · 2 %')}
          choisir={() => a.choisirMoyen('apple')}
        />
        <Rangee
          on={a.moyen === 'google'}
          op={
            <span className="cl08-op gpay">
              <Icone nom="gpay-g" taille={15} />
              <span>{t('Pay')}</span>
            </span>
          }
          titre="Google Pay"
          inactif={a.auComptoir}
          sous={t(a.auComptoir ? 'Pas pour une commande payée au comptoir' : 'Carte du téléphone · Face ID ou empreinte · 2 %')}
          choisir={() => a.choisirMoyen('google')}
        />

        <div className="cl08-kk">{t('Carte Visa ou Mastercard')}</div>
        {d.cartes.map((c) => (
          <Rangee
            key={c.id}
            on={a.moyen === 'carte:' + c.id}
            inactif={a.auComptoir || (a.aPayer * 1.02 > MAX_CARTE && a.moyen !== 'carte:' + c.id)}
            op={
              <span className="cl08-op card">
                <Icone nom="credit-card" taille={22} />
              </span>
            }
            titre={`${c.marque} •••• ${c.derniers}`}
            sous={t(a.auComptoir ? 'Pas pour une commande payée au comptoir' : '2 % de frais de service · 3-D Secure')}
            choisir={() => a.choisirMoyen('carte:' + c.id)}
          />
        ))}
        {!d.cartes.length && (
          <Link to={chemin('moyens-paiement')} className="cl08-row">
            <span className="rd"></span>
            <span className="cl08-op card">
              <Icone nom="credit-card" taille={22} />
            </span>
            <span className="grow">
              <span className="rt">{t('Ajouter une carte Visa ou Mastercard')}</span>
              <span className="rs">{t('2 % de frais de service · 3-D Secure')}</span>
            </span>
          </Link>
        )}
        {a.aPayer * 1.02 > MAX_CARTE && (
          <div className="cl08-line" style={{ margin: '6px 4px 0' }}>
            <Icone nom="info" taille={17} />
            <span>{tf('Pas pour ce panier : {m} F au plus par paiement par carte.', { m: F(MAX_CARTE) })}</span>
          </div>
        )}
        {a.carte && (
          <>
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
                <span className="rt">{t(a.devise === 'EUR' ? '1 € = 655,957 F · taux fixe' : 'Dollar US : taux du jour, figé au paiement')}</span>
              </div>
            </div>
            <div className="cl08-sub" style={{ marginLeft: '0', marginTop: '8px' }}>
              <div className="kv">
                <span className="k">{t('Articles et livraison')}</span>
                <span className="v">{F(a.aPayer)}&nbsp;F</span>
              </div>
              <div className="kv">
                <span className="k">{t('Frais de service carte (2 %)')}</span>
                <span className="v">{F(a.frais)}&nbsp;F</span>
              </div>
              <div className="kv">
                <span className="k b8" style={{ color: 'var(--ink)' }}>
                  {t('Total débité')}
                </span>
                <span className="v t17">{F(a.montant)}&nbsp;F</span>
              </div>
              {a.devise === 'EUR' && (
                <div className="t12 c3" style={{ textAlign: 'right' }}>
                  {tf('≈ {e} € pour une carte en euros', { e: (a.montant / EURO).toFixed(2).replace('.', ',') })}
                </div>
              )}
              <div className="cl08-line ">
                <Icone nom="shield-check" taille={17} />
                <span>{t('3-D Secure : ta banque te demande de confirmer.')}</span>
              </div>
            </div>
          </>
        )}

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
              <small>{tf('{n} colis · prêts sous {h} h · {q}', { n: a.sc.length, h: Math.round((a.pretVers - d.maintenant) / 3600000), q: quand(a.pretVers, d.maintenant, langue) })}</small>
            </span>
            <span className="v">{a.livraison ? F(a.livraison) + ' F' : t('offerte')}</span>
          </div>
          {a.remise > 0 && (
            <div className="cl07-r">
              <span className="lb">{tf('Dont offert par {p}', { p: a.ab!.palier === 'pass' ? 'Pass 7 jours' : (palier(a.ab!.palier)?.nom ?? 'Prime') })}</span>
              <span className="v" style={{ color: 'var(--green)' }}>
                −{F(a.remise)}&nbsp;F
              </span>
            </div>
          )}
          {a.frais > 0 && (
            <div className="cl07-r">
              <span className="lb">{t('Frais de service carte (2 %)')}</span>
              <span className="v">{F(a.frais)}&nbsp;F</span>
            </div>
          )}
          {a.auComptoir && (
            <div className="cl07-r">
              <span className="lb">{t('Au retrait, en Mobile Money')}</span>
              <span className="v">{F(a.f.sousTotal)}&nbsp;F</span>
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
            {a.sc.map((s, i) => {
              const r = a.f.ramassages[i]
              const x = a.f.remises[i]
              return (
                <div key={s.boutique} className="kv">
                  <span className="k">
                    {tf('Colis {n}', { n: i + 1 })}
                    <br />
                    <small>
                      {tf(m === 'relais' ? 'ramassage {r} F + dépôt au relais {x} F' : 'ramassage {r} F + livraison à domicile {x} F', { r: F(r.montant), x: F(x.montant) })}
                      {r.partage && t(' · ramassage réduit : même quartier qu’un autre colis')}
                    </small>
                  </span>
                  <span className="v">{F(r.montant + x.montant)}&nbsp;F</span>
                </div>
              )
            })}
            {a.f.offert > 0 && (
              <div className="kv">
                <span className="k">{tf('Livraison offerte (articles dès {s} F)', { s: F(a.f.seuil) })}</span>
                <span className="v" style={{ color: 'var(--green)' }}>
                  −{F(a.f.offert)}&nbsp;F
                </span>
              </div>
            )}
            {a.remise > 0 && (
              <div className="kv">
                <span className="k">{tf('Offert par ton abonnement {p}', { p: a.ab!.palier === 'pass' ? 'Pass 7 jours' : (palier(a.ab!.palier)?.nom ?? 'Prime') })}</span>
                <span className="v" style={{ color: 'var(--green)' }}>
                  −{F(a.remise)}&nbsp;F
                </span>
              </div>
            )}
            <div className="kv">
              <span className="k b8" style={{ color: 'var(--ink)' }}>
                {t('Livraison à payer')}
              </span>
              <span className="v">{a.livraison ? F(a.livraison) + ' F' : t('offerte')}</span>
            </div>
            {a.f.manque > 0 && <p className="mt8">{tf('Encore {m} F d’articles et la livraison de base est offerte (dès {s} F).', { m: F(a.f.manque), s: F(a.f.seuil) })}</p>}
            <p className="mt8">
              {t(
                m === 'relais'
                  ? 'Tous tes colis se retirent ensemble avec un seul code. Garde gratuite le jour de l’arrivée, puis 100 F par jour du 2e au 4e jour, 200 F le 5e, 500 F le 6e et 1 000 F le 7e.'
                  : 'Le livreur t’appelle avant de passer. Tu donnes ton code de réception à la remise du colis, jamais avant.',
              )}
            </p>
          </div>
        </details>

        {(a.erreur || (express && a.carteTropHaute)) && (
          <div className="note red" role="alert">
            <Icone nom="circle-alert" taille={18} />
            <div>{t(a.erreur ?? '150 000 F au plus par paiement par carte : choisis Mobile Money ou le Wallet.')}</div>
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
            <button type="button" className={'btn primary' + (a.envoi || a.carteTropHaute || !a.enLigne ? ' off' : '')} onClick={a.payer}>
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
            ? t('Rien n’est débité avant ta validation sur le téléphone.')
            : a.moyen === 'wallet'
              ? tf('Ton solde passera à {s} F. L’argent reste bloqué jusqu’à ton retrait.', { s: F(d.solde - a.montant) })
              : express
                ? tf(a.moyen === 'apple' ? 'Dont {f} F de frais de service carte. Validé par Face ID, argent bloqué jusqu’au retrait.' : 'Dont {f} F de frais de service carte. Validé par ton empreinte, argent bloqué jusqu’au retrait.', { f: F(a.frais) })
                : t('Rien n’est débité avant la confirmation de ta banque.')}
        </div>
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
            {a.carte && (
              <p>
                <b>{t('Validation.')}</b>
                {t(' Ta banque te demande de confirmer (3-D Secure). Sans confirmation, rien n’est débité.')}
              </p>
            )}
            <p>
              <b>{t('Ton argent est protégé.')}</b>
              {t(' Il reste bloqué chez BelivaY jusqu’à ton retrait, puis pendant 7 jours pour signaler un problème. Le vendeur n’est payé qu’après.')}
            </p>
            <p>
              <b>{t('Préparation.')}</b>
              {m === 'relais'
                ? tf(' Tes colis sont prêts sous {h} h, au {r}. Une notification te prévient à l’arrivée ; ton code de retrait t’attend dans Mes commandes.', { h: a.heures, r: t(p.relais) })
                : tf(' Tes colis partent sous {h} h. Le livreur t’appelle avant de passer ; ton code de réception t’attend dans Mes commandes.', { h: a.heures })}
            </p>
            {a.auComptoir && (
              <p>
                <b>{t('Au comptoir.')}</b>
                {tf(' {r} F se paient au retrait, en Mobile Money sur ton téléphone. Si tu refuses le colis, la livraison payée n’est pas remboursée.', { r: F(a.f.sousTotal) })}
              </p>
            )}
            <p>
              <b>{t('Changer d’avis.')}</b>
              {t(' Tu peux annuler une boutique depuis Mes commandes tant que le livreur n’a pas récupéré son colis.')}
            </p>
            <p>
              <b>{t('Remboursement.')}</b>
              {t(
                a.parCarte
                  ? ' Un remboursement revient sur la même carte.'
                  : interrupteurs['FF-WALLET']
                    ? ' Un remboursement est crédité sur ton portefeuille BelivaY, retirable sans frais vers ton Mobile Money.'
                    : ' Un remboursement revient sur le numéro Mobile Money qui a payé.',
              )}
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

