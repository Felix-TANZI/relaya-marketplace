// Écran « Commander pour un proche » (DP-54) : depuis un compte diaspora, le panier part au relais du proche relié
// (?lien=…) : le proche (prénom, quartier du relais), les articles, la livraison selon le moteur, 2 % de frais de
// carte, le total en francs et en euros ou en dollars, un mot pour lui, la carte (contrôlée) et 3-D Secure ;
// plafonds : 150 000 F par paiement, 500 000 F par mois ; carte au nom du compte (carte d'un tiers refusée).
// Contrôle de cohérence anti-fraude (COHERENCE_DIASPORA, refait par le serveur) : pays de la carte (BIN, sinon pays
// d'émission indiqué) face au pays du compte et du numéro, montant face aux habitudes, commandes rapprochées :
// accepté (3-D Secure), vérification renforcée (3-D Secure + code SMS au numéro étranger du compte), ou refusé avec
// la raison et le support. Chaque condition qui manque a son message (compte, lien, panier, plafond, carte,
// cohérence). Ensuite : le proche reçoit son
// code, le payeur suit (?suivi=ref) : payée, en préparation, au relais, retirée, preuve de retrait ; jamais le code,
// le relais précis ni l'adresse. Tout savoir : /diaspora-infos.
// DP-54, compte diaspora : « Pour qui ? » d'abord ; livraison « au relais de X » ou « chez X » (si X l'a accepté
// dans son compte ; l'adresse ne sort jamais) ; carte, Apple Pay ou Google Pay (jamais Mobile Money ni comptoir) ;
// ?demande=… : payer le panier qu'un proche a envoyé (boîte « À payer pour mes proches »), avec le choix de qui
// paie le supplément domicile quand il l'a demandé (règle donnees/echanges.ts : le diaspora paie tout par défaut).
// Écran propre au site (absent du prototype).
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { useDes } from '../../composants/ecran'
import { Aside, Colonne } from '../../composants/Gabarits'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { RENVOI_TROP_TOT, useEnvoiCode } from '../../composants/SaisieCode'
import { chemin } from '../../config/pages'
import { jetonExpress, messageCarte, tokeniser } from '../../connecteurs/paiementCarte'
import { calculer } from '../../donnees/frais'
import { supplementAuProche, totalDiaspora, type PaieFrais } from '../../donnees/echanges'
import { COHERENCE_DIASPORA, PAYS_DIASPORA, PLAFONDS_DIASPORA, controleDiaspora, nomCarte, paysDuBin, source, type CompteDiaspora, type ControleDiaspora, type DemandeProche, type DonneesPanier, type EnvoiCode, type LienFamille } from '../../donnees/source'
import { F, deviseAffichee, enDevise as versDevise } from '../../i18n/format'
import { jouer } from '../../composants/Sons'
import { Succes, VideProches, destination, quartier } from './Commun'
import { dateA } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { useMajSession, useSession } from '../../session'
import { expireValide, grouper, luhn, marque } from '../CL-13/MoyensAutres'

const MOYENS = [
  ['carte', 'Carte bancaire'],
  ['apple', 'Apple Pay'],
  ['google', 'Google Pay'],
] as const

export function CommanderPour() {
  const { t, tf, langue } = usePreferences()
  const [params, setParams] = useSearchParams()
  const majSession = useMajSession()
  const session = useSession()
  const [liens, setLiens] = useState<LienFamille[] | null>(null)
  const [tous, setTous] = useState<LienFamille[]>([])
  const [maintenant, setMaintenant] = useState(0)
  const [titulaire, setTitulaire] = useState(session.client?.nomComplet ?? '')
  const [diaspora, setDiaspora] = useState(false)
  const [compte, setCompte] = useState<CompteDiaspora | null>(null)
  const [paysDeclare, setPaysDeclare] = useState('')
  const [controle, setControle] = useState<ControleDiaspora | null>(null) // décision du contrôle de cohérence
  const [codeSms, setCodeSms] = useState('')
  const [envoiSms, setEnvoiSms] = useState<EnvoiCode | null>(null)
  const [mois, setMois] = useState(0)
  const [p, setP] = useState<DonneesPanier | null>(null)
  const [devise, setDevise] = useState<'EUR' | 'USD'>(deviseAffichee() === 'USD' ? 'USD' : 'EUR')
  const [mot, setMot] = useState('')
  const [carte, setCarte] = useState('')
  const [expire, setExpire] = useState('')
  const [cvc, setCvc] = useState('')
  const [vu, setVu] = useState(false)
  const [code, setCode] = useState<string | null>(null)
  const [fait, setFait] = useState<string | null>(null)
  const [refus, setRefus] = useState<string | null>(null)
  const envoyerSms = useEnvoiCode()
  const [demandes, setDemandes] = useState<DemandeProche[]>([])
  const [livraisonChoisie, setLivraison] = useState<'relais' | 'domicile' | null>(null)
  const [moyen, setMoyen] = useState<'carte' | 'apple' | 'google'>('carte')
  const [supplementPar, setSupplementPar] = useState<PaieFrais>('payeur')
  const tabL = useDes('tab-l')
  useEffect(() => {
    source.demandesProches().then((r) => setDemandes(r.demandes))
  }, [fait])
  useEffect(() => {
    source.liensFamille().then((d) => (setLiens(d.liens.filter((l) => l.sens === 'diaspora' && l.etat === 'actif')), setTous(d.liens.filter((l) => l.sens === 'diaspora')),  setDiaspora(!!d.compte), setCompte(d.compte), setMois(d.depensesMois), setMaintenant(d.maintenant)))
    source.panier().then(setP)
  }, [fait])
  if (!liens || !p) return null
  // Panier envoyé par le proche (?demande=…) : son lien, ses articles, la livraison qu'il a demandée.
  const dem = demandes.find((x) => x.id === params.get('demande') && x.sens === 'recue') ?? null
  const l = liens.find((x) => x.id === (dem?.lien ?? params.get('lien'))) ?? (liens.length === 1 && !dem ? liens[0] : null)
  if (!diaspora)
    return (
      <Ecran route="commander-pour">
        <VideProches
          icone="globe"
          titre="Réservé aux comptes diaspora"
          texte="Un compte ouvert depuis l’étranger commande pour un proche au Cameroun : il paie par carte, le proche retire au relais avec son code."
          points={[
            ['users', 'Tu vis au Cameroun ? Relie un proche à l’étranger dans Mes proches : il commande pour toi.'],
            ['link', 'Ou envoie-lui ton panier à payer, par un simple lien.'],
            ['shield-check', 'Son argent reste bloqué jusqu’à ton retrait au relais.'],
          ]}
          actions={[
            { vers: chemin('proches'), texte: 'Mes proches', icone: 'users' },
            { vers: chemin('diaspora'), texte: 'Faire payer par un proche', icone: 'link' },
          ]}
        />
      </Ecran>
    )
  // Suivi d'une commande envoyée : ce que voit celui qui paie (jamais le code, le relais précis ni l'adresse).
  const suivi = params.get('suivi')
  if (suivi) {
    const lien = tous.find((x) => x.commandes.some((c) => c.ref === suivi))
    const c = lien?.commandes.find((x) => x.ref === suivi)
    if (!lien || !c)
      return (
        <Ecran route="commander-pour">
          <div className="card mt12">
            <div className="empty">
              <h3>{t('Commande introuvable')}</h3>
              <p>{t('Elle n’a pas été payée depuis ce compte.')}</p>
              <div className="btns">
                <Link to={chemin('proches')} className="btn primary">
                  <span>{t('Mes proches')}</span>
                </Link>
              </div>
            </div>
          </div>
        </Ecran>
      )
    const auRelais = !!c.pretLe && c.pretLe <= maintenant
    const etapes: [string, number | null | undefined, boolean][] = [
      [tf('Payée par ta carte {c}', { c: c.carte ?? '' }), c.le, true],
      [t('Préparée par les vendeurs'), auRelais ? c.pretLe : null, auRelais],
      c.livraison === 'domicile'
        ? [tf('En livraison chez {p} · code envoyé à {p} par SMS', { p: lien.prenom }), auRelais ? c.pretLe : null, auRelais]
        : [tf('Arrivée au relais de {q} · code envoyé à {p} par SMS', { q: t(quartier(lien.relais)), p: lien.prenom }), auRelais ? c.pretLe : null, auRelais],
      [tf(c.livraison === 'domicile' ? 'Remise à {p}, avec son code' : 'Retirée par {p}', { p: lien.prenom }), c.retireLe, !!c.retireLe],
    ]
    return (
      <Ecran route="commander-pour">
        <div className="card vedette mt12 row" style={{ gap: 12 }}>
          <span className="ic-sq or" style={{ borderRadius: '50%', width: 44, height: 44, fontWeight: 800 }}>
            {lien.prenom.slice(0, 1)}
          </span>
          <span className="grow">
            <b className="t15" style={{ display: 'block' }}>
              {tf('{ref} · pour {p}', { ref: c.ref, p: lien.prenom })}
            </b>
            <span className="t12 c3">{tf('{d} · {n} article(s)', { d: destination(lien, c.livraison, t, tf), n: c.articles ?? 0 })}</span>
          </span>
        </div>
        <div className="card">
          {etapes.map(([titre, le, fait]) => (
            <div key={titre} className="row" style={{ gap: 10, padding: '6px 0', alignItems: 'flex-start' }}>
              <Icone nom={fait ? 'circle-check' : 'circle'} taille={18} style={fait ? { color: 'var(--green)', flexShrink: 0 } : { color: 'var(--ink-4)', flexShrink: 0 }} />
              <span className="grow t13">
                {titre}
                {le ? <span className="t12 c3" style={{ display: 'block' }}>{dateA(le, langue)}</span> : null}
              </span>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="kv">
            <span className="k">{t('Total payé')}</span>
            <span className="v">
              <b>{F(c.montant)} F</b>
              {c.enDevise ? ' · ' + (c.devise === 'USD' ? '$' + c.enDevise.toFixed(2) : c.enDevise.toFixed(2).replace('.', ',') + ' €') : ''}
            </span>
          </div>
          {c.moyen && c.moyen !== 'carte' ? (
            <div className="kv">
              <span className="k">{t('Payé avec')}</span>
              <span className="v">{c.moyen === 'apple' ? 'Apple Pay' : 'Google Pay'}</span>
            </div>
          ) : null}
          {c.aLaRemise ? (
            <div className="kv">
              <span className="k">{tf('Supplément domicile payé par {p} à la remise', { p: lien.prenom })}</span>
              <span className="v">{F(c.aLaRemise)} F</span>
            </div>
          ) : null}
          {c.mot ? (
            <div className="kv">
              <span className="k">{t('Ton mot')}</span>
              <span className="v">{c.mot}</span>
            </div>
          ) : null}
          {c.rembourse ? (
            <div className="kv">
              <span className="k">{t('Remboursé sur ta carte')}</span>
              <span className="v">{F(c.rembourse)} F</span>
            </div>
          ) : null}
        </div>
        {c.retireLe ? (
          <div className="note green">
            <Icone nom="badge-check" taille={18} />
            <div>{tf('Preuve de retrait : {p} a retiré la commande avec son code le {d}. Elle t’a aussi été envoyée par e-mail.', { p: lien.prenom, d: dateA(c.retireLe, langue) })}</div>
          </div>
        ) : (
          <div className="note ink">
            <Icone nom="lock" taille={18} />
            <div>{tf('Ton argent reste bloqué jusqu’au retrait par {p}. Le code de retrait va à {p} seul ; tu reçois la preuve de retrait ici et par e-mail.', { p: lien.prenom })}</div>
          </div>
        )}
        <div className="hint-l">
          <Icone nom="rotate-ccw" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{tf('{p} a 7 jours après le retrait pour signaler un problème. Un remboursement éventuel revient sur ta carte {c}.', { p: lien.prenom, c: c.carte ?? '' })}</span>
        </div>
        <div className="btns">
          {lien.etat === 'actif' && (
            <Link to={chemin('commander-pour', { lien: lien.id })} className="btn primary">
              <span>{tf('Commander encore pour {p}', { p: lien.prenom })}</span>
            </Link>
          )}
          <Link to={chemin('proches')} className="btn secondary">
            <span>{t('Mes proches')}</span>
          </Link>
        </div>
        <div className="links">
          <Link to={chemin('aide')}>{t('Un souci avec cette commande ?')}</Link>
        </div>
      </Ecran>
    )
  }
  if (fait) {
    const envoyee = tous.flatMap((x) => x.commandes).find((c) => c.ref === fait)
    return (
      <Ecran route="commander-pour">
        <div className="hero green mt12">
          <div className="hk">{t('Commande envoyée')}</div>
          <div className="cl11-ht">{tf('{ref} part vers {p}', { ref: fait, p: l?.prenom ?? '' })}</div>
          <div className="hs">
            {envoyee?.livraison === 'domicile'
              ? tf('{p} est livré chez lui et remet son code au livreur. Tu reçois la preuve de remise ; un remboursement reviendrait sur ta carte.', { p: l?.prenom ?? '' })
              : tf('{p} reçoit son code de retrait au relais de {q}. Tu reçois la preuve de retrait ; un remboursement reviendrait sur ta carte.', { p: l?.prenom ?? '', q: t(quartier(l?.relais)) })}
          </div>
        </div>
        <Succes titre={t('Paiement accepté')} texte={tf('Payé {m} F · {p} est prévenu par SMS.', { m: F(envoyee?.montant ?? 0), p: l?.prenom ?? '' })} />
        <div className="btns">
          <Link to={chemin('commander-pour', { suivi: fait })} className="btn primary">
            <span>{t('Suivre la commande')}</span>
          </Link>
        </div>
        <div className="links">
          <Link to={chemin('proches')}>{t('Mes proches')}</Link> · <Link to={chemin('espace-diaspora')}>{t('Espace diaspora')}</Link>
        </div>
      </Ecran>
    )
  }
  if (params.get('demande') && (!dem || dem.etat !== 'attente'))
    return (
      <Ecran route="commander-pour">
        <div className="card mt12">
          <div className="empty">
            <h3>{t('Ce panier n’est plus à payer')}</h3>
            <p>{t(dem?.etat === 'payee' ? 'Il est déjà payé.' : dem?.etat === 'refusee' ? 'Tu l’as refusé.' : 'Il a expiré, a été annulé par ton proche, ou n’a pas été envoyé à ce compte.')}</p>
            <div className="btns">
              <Link to={chemin('paniers-proches')} className="btn primary">
                <span>{t('À payer pour mes proches')}</span>
              </Link>
            </div>
          </div>
        </div>
      </Ecran>
    )
  if (!l)
    return (
      <Ecran route="commander-pour">
        <h1 className="pg-t mt12">{t('Pour qui ?')}</h1>
        <p className="t13 c3">{t('Choisis le proche relié qui recevra ce panier : il retire au relais qu’il a choisi, ou il est livré chez lui s’il l’a accepté.')}</p>
        <div className="card tight">
          {liens.map((x) => (
            <a key={x.id} href="#" className="li" onClick={(e) => (e.preventDefault(), setParams({ lien: x.id }))}>
              <span className="ic">
                <Icone nom="user" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ display: 'block' }}>
                  {x.prenom}
                </span>
                <span className="ls" style={{ display: 'block' }}>
                  {destination(x, 'relais', t, tf) + (x.domicile ? ' · ' + t('livraison à domicile possible') : '')}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </a>
          ))}
        </div>
        {!liens.length && (
          <>
            <div className="note amber">
              <Icone nom="triangle-alert" taille={18} />
              <div>{t(tous.some((x) => x.etat === 'invite') ? 'Ton invitation attend l’accord de ton proche : tu pourras commander dès qu’il accepte et choisit son relais.' : 'Aucun proche relié : il faut un lien famille actif, avec son accord (son code famille, ou une invitation qu’il accepte).')}</div>
            </div>
            <div className="btns">
              <Link to={chemin('proches')} className="btn primary">
                <span>{t('Relier un proche')}</span>
              </Link>
            </div>
          </>
        )}
        <div className="links">
          <Link to={chemin('diaspora-infos')}>{t('Ce qu’il faut pour commander')}</Link>
        </div>
      </Ecran>
    )
  // Les articles : le panier du compte, ou celui que le proche a envoyé. Frais : moteur de frais (relais et domicile),
  // puis la règle des échanges (totalDiaspora) : articles + livraison + 2 % de service, payés maintenant.
  const lignes = dem ? dem.lignes.map((x, i) => ({ ...x, id: dem.id + '-' + i })) : p.lignes
  const sc = [...new Set(lignes.map((x) => x.boutique))].map((b) => ({ boutique: b, zone: p.boutiques[b]?.zone ?? b, articles: lignes.filter((x) => x.boutique === b).map((x) => ({ prix: x.prix, quantite: x.qte, classe: x.classe })) }))
  const f = calculer('relais', sc)
  const fraisRelais = f.total - f.sousTotal
  const fraisDomicile = calculer('domicile', sc).total - f.sousTotal
  const livraison: 'relais' | 'domicile' = l.domicile ? (livraisonChoisie ?? (dem?.livraison === 'domicile' ? 'domicile' : 'relais')) : 'relais'
  const parProche = !!dem && dem.livraison === 'domicile' && livraison === 'domicile'
  const permis = supplementAuProche({ articles: f.sousTotal, supplement: Math.max(0, fraisDomicile - fraisRelais), demandeParProche: parProche })
  const qui: PaieFrais = permis.ok ? supplementPar : 'payeur'
  const tot = totalDiaspora({ articles: f.sousTotal, fraisRelais, fraisDomicile, livraison, supplementPar: qui })
  const frais = tot.service
  const total = tot.total
  const enDevise = versDevise(total, devise)
  const tropPaiement = total > PLAFONDS_DIASPORA.paiement
  const tropMois = mois + total > PLAFONDS_DIASPORA.mois
  const n = carte.replace(/\D/g, '')
  const portefeuille = moyen !== 'carte' // Apple Pay, Google Pay : la carte du compte, confirmée sur le téléphone
  const pret3ds = code !== null && (portefeuille || code.length >= 4) && (controle?.decision !== 'renforce' || codeSms.length === 6)
  const erreurs = {
    titulaire: nomCarte(titulaire) !== nomCarte(session.client?.nomComplet ?? '') ? 'La carte doit être à ton nom, celui du compte : la carte d’un tiers est refusée.' : null,
    carte: !marque(n) ? 'Visa ou Mastercard seulement : vérifie les premiers chiffres.' : !luhn(n) ? 'Ce numéro de carte semble mal tapé.' : null,
    expire: !expireValide(expire) ? 'Date d’expiration invalide (MM/AA).' : null,
    cvc: !/^\d{3,4}$/.test(cvc) ? 'Le code au dos de la carte : 3 chiffres.' : null,
  }
  const champ = (k: keyof typeof erreurs, label: string, input: React.ReactNode) => (
    <div className="fld">
      <label htmlFor={'cp-' + k}>{t(label)}</label>
      <div className={'inp' + (vu && erreurs[k] ? ' err' : '')}>{input}</div>
      {vu && erreurs[k] && (
        <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
          {t(erreurs[k]!)}
        </div>
      )}
    </div>
  )
  // Contrôle de cohérence, le même que celui du serveur (qui le refait au paiement).
  const paysBin = n.length >= 8 ? paysDuBin(n) : null
  const paysCarte = paysBin ?? (paysDeclare || compte?.pays || '')
  const historique = tous.flatMap((x) => x.commandes)
  const R = COHERENCE_DIASPORA
  const signal = (x: string) =>
    x === 'pays'
      ? tf('Carte émise en {c} ; ton compte et ton numéro sont en {p}.', { c: t(paysCarte), p: t(compte?.pays ?? '') })
      : x === 'montant'
        ? historique.length >= R.HABITUDE_MIN
          ? tf('Montant plus de {x} fois supérieur à la moyenne de tes dernières commandes.', { x: R.MONTANT_X })
          : tf('Premier achat élevé : plus de {m} F.', { m: F(R.PREMIER_MAX) })
        : tf('Commandes rapprochées : {n} déjà payées dans les dernières {h} heures.', { n: historique.filter((c) => c.le > maintenant - R.FENETRE_H * 3600e3).length, h: R.FENETRE_H })
  const motifRefus = (c: ControleDiaspora) =>
    c.decision !== 'refuse'
      ? ''
      : c.motif === 'cameroun'
        ? t('Carte émise au Cameroun : le compte diaspora se paie avec une carte du pays où tu vis. Au Cameroun, ouvre un compte normal et paie en Mobile Money.')
        : c.motif === 'pays'
          ? c.paysCarte === 'Autre'
            ? t('Carte émise dans un pays qui n’est pas accepté pour le compte diaspora.')
            : tf('Carte émise en {c} : ce pays n’est pas accepté pour le compte diaspora.', { c: t(c.paysCarte) })
          : c.motif === 'rapprochees'
            ? tf('Trop de commandes rapprochées : {n} ou plus en {h} heures. Réessaie plus tard.', { n: R.REFUS_RAPPROCHEES, h: R.FENETRE_H })
            : t('Plusieurs éléments inhabituels en même temps : par sécurité, ce paiement est refusé.')
  if (!lignes.length)
    return (
      <Ecran route="commander-pour">
        <div className="card mt12">
          <div className="empty">
            <div className="ei">
              <Icone nom="shopping-cart" taille={26} />
            </div>
            <h3>{tf('Remplis ton panier pour {p}', { p: l.prenom })}</h3>
            <p>{tf('Les prix et la livraison sont ceux du relais de {q}.', { q: t((l.relais ?? '').replace(/^Relais /, '')) })}</p>
            <div className="btns">
              <Link to={chemin('categories')} className="btn primary">
                <span>{t('Découvrir les produits')}</span>
              </Link>
            </div>
          </div>
        </div>
        <p className="t12 c3">{tf('Ce mois-ci, tu peux encore envoyer {m} F ({p} F au plus par paiement).', { m: F(Math.max(0, PLAFONDS_DIASPORA.mois - mois)), p: F(PLAFONDS_DIASPORA.paiement) })}</p>
      </Ecran>
    )
  // Dès 1024 px (§ 5.14) : à gauche le proche, la livraison, les articles et le mot ; à droite, dans l'aside collant,
  // le total en francs et en euros ou dollars, les frais de carte, la carte et « Payer ». Déplacés, jamais dupliqués.
  const articles = (
    <>
      {lignes.map((x) => (
        <div key={x.id} className="row" style={{ gap: 10, padding: '6px 0' }}>
          <span className="thumb" style={{ width: 40, height: 40, borderRadius: 10 }}>
            <Dessin id={x.dessin} />
          </span>
          <span className="grow t13">
            {t(x.titre)} × {x.qte}
          </span>
          <b className="t13">{F(x.prix * x.qte)} F</b>
        </div>
      ))}
    </>
  )
  const totaux = (
    <>
      <div className="kv mt8">
        <span className="k">{t(livraison === 'domicile' ? 'Livraison à domicile' : 'Livraison au relais')}</span>
        <span className="v">{tot.livraisonPayee ? F(tot.livraisonPayee) + ' F' : t('offerte')}</span>
      </div>
      {tot.aLaRemise > 0 && (
        <div className="kv">
          <span className="k">{tf('Payé par {p} à la remise', { p: l.prenom })}</span>
          <span className="v">{F(tot.aLaRemise)} F</span>
        </div>
      )}
      <div className="kv">
        <span className="k">{t('Frais de service carte (2 %)')}</span>
        <span className="v">{F(frais)} F</span>
      </div>
      <div className="kv">
        <span className="k">
          <b>{t('Total')}</b>
        </span>
        <span className="v">
          <b>{F(total)} F</b>
          {deviseAffichee() === 'XAF' ? ' · ≈ ' + enDevise : ''}
        </span>
      </div>
      <div className="seg">
        {(['EUR', 'USD'] as const).map((x) => (
          <a key={x} href="#" role="radio" aria-checked={devise === x} className={devise === x ? 'on' : ''} onClick={(e) => (e.preventDefault(), setDevise(x))}>
            {t(x === 'EUR' ? '€ Euro' : '$ Dollar US')}
          </a>
        ))}
      </div>
      <p className="t12 c3">{t(devise === 'EUR' ? '1 € = 655,957 F : parité fixe, sans frais de change chez BelivaY.' : 'Dollar US : taux du jour du prestataire, figé au moment du paiement.')}</p>
      <div className="kv">
        <span className="k">{t('Encore possible ce mois-ci')}</span>
        <span className="v">{tf('{m} F', { m: F(Math.max(0, PLAFONDS_DIASPORA.mois - mois)) })}</span>
      </div>
      <div className="links">
        {dem ? <Link to={chemin('paniers-proches', { id: dem.id })}>{t('Voir le panier envoyé')}</Link> : <Link to={chemin('panier')}>{t('Modifier le panier')}</Link>}
      </div>
    </>
  )
  const alertes = (
    <>
      {(tropPaiement || tropMois) && (
        <div className="note amber">
          <Icone nom="triangle-alert" taille={18} />
          <div>
            {tropPaiement ? tf('{m} F au plus par paiement : retire des articles du panier.', { m: F(PLAFONDS_DIASPORA.paiement) }) : tf('Plafond du mois : {m} F déjà envoyés sur {p} F.', { m: F(mois), p: F(PLAFONDS_DIASPORA.mois) })} <Link to={chemin('diaspora-infos')}>{t('Pourquoi ces plafonds ?')}</Link>
          </div>
        </div>
      )}
      {refus && (
        <div className="note red" role="alert">
          <Icone nom="circle-alert" taille={18} />
          <div>{t(refus)}</div>
        </div>
      )}
    </>
  )
  const champMot = (
    <div className="fld">
      <label htmlFor="cp-mot">{tf('Un mot pour {p} (facultatif)', { p: l.prenom })}</label>
      <div className="inp">
        <input id="cp-mot" value={mot} maxLength={80} onChange={(e) => setMot(e.target.value)} />
      </div>
    </div>
  )
  const verification = (
    <div className="card vedette">
      <h3 className="cl11-k">{t(portefeuille ? (moyen === 'apple' ? 'Apple Pay' : 'Google Pay') : '3-D Secure')}</h3>
      {portefeuille ? (
        <p className="t13 c2">{tf('Confirme le paiement de {m} sur ton téléphone (Face ID, empreinte ou code). La carte enregistrée doit être à ton nom.', { m: enDevise })}</p>
      ) : (
        <>
          <p className="t13 c2">{tf('Ta banque confirme le paiement de {m}.', { m: enDevise })}</p>
          <div className="fld">
            <label htmlFor="cp-3ds">{t('Code reçu par SMS de ta banque')}</label>
            <div className="inp">
              <input id="cp-3ds" inputMode="numeric" maxLength={6} value={code ?? ''} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
            </div>
          </div>
        </>
      )}
      {controle?.decision === 'renforce' && envoiSms && (
        <>
          <div className="note amber">
            <Icone nom="shield-alert" taille={18} />
            <div>
              <b>{t('Vérification renforcée')}</b> {t('Ce paiement sort de tes habitudes ; un second code confirme que c’est bien toi :')}
              {controle.signaux.map((x) => (
                <span key={x} style={{ display: 'block' }}>
                  · {signal(x)}
                </span>
              ))}
            </div>
          </div>
          <div className="fld">
            <label htmlFor="cp-sms">{t('Code reçu par SMS de BelivaY')}</label>
            <div className="inp">
              <input id="cp-sms" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={codeSms} onChange={(e) => setCodeSms(e.target.value.replace(/\D/g, ''))} />
            </div>
            <div className="hint">{tf('Envoyé au {n}, le numéro vérifié de ton compte.', { n: envoiSms.destination })}</div>
            {envoiSms.codeDemo && <p className="t12 c3">{t('Démonstration : le code est ') + envoiSms.codeDemo + '.'}</p>}
            <div className="links">
              <a
                href="#"
                onClick={async (e) => {
                  e.preventDefault()
                  const x = await envoyerSms('sms', () => source.envoyerCodeDiaspora('sms', compte?.numeroMasque ?? ''), { renvoi: true })
                  if (!x) return setRefus(RENVOI_TROP_TOT)
                  ;(setEnvoiSms(x), setCodeSms(''), setRefus(null))
                }}
              >
                {t('Je n’ai rien reçu : renvoyer le SMS')}
              </a>
            </div>
          </div>
        </>
      )}
      <div className="btns">
        <button
          type="button"
          className={'btn primary' + (pret3ds ? '' : ' off')}
          onClick={async () => {
            if (!pret3ds) return
            // Le numéro et le CVC partent au prestataire (tokenisation, CAP-24) ; BelivaY reçoit le jeton et le BIN
            // (contrôle de cohérence du pays de la carte).
            let jeton
            try {
              jeton = portefeuille ? await jetonExpress(moyen === 'apple' ? 'apple' : 'google') : await tokeniser({ numero: n, expire, cvc })
            } catch (e) {
              return (jouer('erreur'), setRefus(messageCarte(e)), setCode(null))
            }
            const r = await source.commanderPour(l.id, {
              carte: jeton,
              devise,
              mot,
              titulaire: portefeuille ? (session.client?.nomComplet ?? '') : titulaire,
              paysCarte: portefeuille ? (compte?.pays ?? '') : paysCarte,
              codeSms: controle?.decision === 'renforce' ? codeSms : undefined,
              livraison,
              moyen,
              demande: dem?.id,
              supplementPar: qui,
            })
            if (r.ok) (setFait(r.ref), jouer('paiement'), majSession(await source.session()))
            else if (r.raison === 'verification') (setRefus('Le code SMS de BelivaY n’est pas le bon : rien n’a été débité. Vérifie-le ou renvoie-le.'), setCodeSms(''), r.controle && setControle(r.controle))
            else if (r.raison === 'coherence') (setRefus(null), setControle(r.controle ?? null), setCode(null))
            else (jouer('erreur'), setRefus(r.raison === 'plafond' ? 'Plafond dépassé : rien n’a été débité.' : r.raison === 'vide' ? 'Ton panier est vide.' : r.raison === 'titulaire' ? 'La carte doit être à ton nom, celui du compte : rien n’a été débité.' : r.raison === 'domicile' ? 'Ton proche n’accepte plus la livraison chez lui : choisis son relais. Rien n’a été débité.' : r.raison === 'demande' ? 'Ce panier n’est plus à payer (déjà payé, annulé ou expiré) : rien n’a été débité.' : r.raison === 'garantie' ? 'Le supplément ne peut pas être laissé à ton proche pour ce panier : rien n’a été débité.' : 'Le lien avec ce proche n’est plus actif : rien n’a été débité.'), setCode(null))
          }}
        >
          <span>{t('Valider')}</span>
        </button>
      </div>
      <div className="btns">
        <button type="button" className="btn secondary" onClick={() => (setCode(null), setCodeSms(''), setRefus(null))}>
          <span>{t(portefeuille ? 'Changer de moyen de paiement' : 'Modifier la carte')}</span>
        </button>
      </div>
    </div>
  )
  const saisie = (
    <>
        <div className="seg">
          {MOYENS.map(([x, nom]) => (
            <a key={x} href="#" role="radio" aria-checked={moyen === x} className={moyen === x ? 'on' : ''} onClick={(e) => (e.preventDefault(), setMoyen(x), setControle(null))}>
              {t(nom)}
            </a>
          ))}
        </div>
        {portefeuille ? (
          <div className="card">
            <h3 className="cl11-k">{t(moyen === 'apple' ? 'Apple Pay' : 'Google Pay')}</h3>
            <p className="t13 c2">{t('La carte enregistrée dans ton téléphone, à ton nom et émise dans ton pays de résidence. Tu confirmes avec Face ID, ton empreinte ou ton code.')}</p>
            <p className="t12 c3">{t('Mobile Money et paiement au comptoir ne sont pas proposés aux comptes diaspora.')}</p>
          </div>
        ) : (
        <div className="card">
          <h3 className="cl11-k">{t('Carte bancaire à ton nom')}</h3>
          {champ('titulaire', 'Nom sur la carte', <input id="cp-titulaire" autoComplete="cc-name" value={titulaire} onChange={(e) => setTitulaire(e.target.value)} />)}
          {champ('carte', 'Numéro de carte', <input id="cp-carte" inputMode="numeric" placeholder="4242 4242 4242 4242" value={carte} onChange={(e) => (setCarte(grouper(e.target.value)), setControle(null))} />)}
          {paysBin ? (
            <div className="hint-l">
              <Icone nom="credit-card" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
              <span>{tf('Carte émise en {c}, d’après ses premiers chiffres.', { c: t(paysBin) })}</span>
            </div>
          ) : (
            n.length >= 8 && (
              <div className="fld">
                <label htmlFor="cp-pays">{t('Pays d’émission de la carte')}</label>
                <div className="inp">
                  <select id="cp-pays" value={paysCarte} onChange={(e) => (setPaysDeclare(e.target.value), setControle(null))} style={{ width: '100%', border: 0, background: 'transparent', font: 'inherit', color: 'inherit' }}>
                    {PAYS_DIASPORA.map(([x]) => (
                      <option key={x} value={x}>
                        {t(x)}
                      </option>
                    ))}
                    <option value="Cameroun">{t('Cameroun')}</option>
                    <option value="Autre">{t('Autre pays')}</option>
                  </select>
                </div>
                <div className="hint">{t('Le pays de la banque qui a émis ta carte (au dos ou dans ton appli bancaire). Il est comparé au pays de ton compte.')}</div>
              </div>
            )
          )}
          <div className="row" style={{ gap: 10 }}>
            <span className="grow">{champ('expire', 'Expiration', <input id="cp-expire" inputMode="numeric" placeholder="MM/AA" value={expire} onChange={(e) => setExpire(e.target.value.replace(/[^\d/]/g, '').replace(/^(\d{2})(\d)/, '$1/$2').slice(0, 5))} />)}</span>
            <span className="grow">{champ('cvc', 'Code (CVC)', <input id="cp-cvc" inputMode="numeric" maxLength={4} value={cvc} onChange={(e) => setCvc(e.target.value.replace(/\D/g, ''))} />)}</span>
          </div>
        </div>
        )}
        {controle?.decision === 'refuse' && (
          <div className="note red" role="alert">
            <Icone nom="shield-x" taille={18} />
            <div>
              <b>{t('Paiement refusé : rien n’a été débité.')}</b> {motifRefus(controle)}
              {controle.motif === 'signaux' && controle.signaux.map((x) => <span key={x} style={{ display: 'block' }}>· {signal(x)}</span>)}
              <span style={{ display: 'block' }}>
                {t('Une erreur ? Le support vérifie avec toi et peut débloquer le paiement.')} <Link to={chemin('aide')}>{t('Contacter le support')}</Link> · <Link to={chemin('diaspora-infos')}>{t('Pourquoi ce contrôle ?')}</Link>
              </span>
            </div>
          </div>
        )}
        <div className="btns">
          <button
            type="button"
            className={'btn primary' + (tropPaiement || tropMois ? ' off' : '')}
            onClick={async () => {
              setVu(true)
              if (tropPaiement || tropMois || (!portefeuille && Object.values(erreurs).some(Boolean)) || !compte) return
              const c = controleDiaspora({ paysCarte: portefeuille ? compte.pays : paysCarte, paysCompte: compte.pays, montant: total, historique, maintenant })
              setControle(c)
              setRefus(null)
              if (c.decision === 'refuse') return
              if (c.decision === 'renforce') {
                const x = await envoyerSms('sms', () => source.envoyerCodeDiaspora('sms', compte.numeroMasque))
                if (!x) return
                ;(setEnvoiSms(x), setCodeSms(''))
              }
              setCode('')
            }}
          >
            <Icone nom="lock" taille={18} />
            <span>{deviseAffichee() === 'XAF' ? tf('Payer {m} F · {d}', { m: F(total), d: enDevise }) : tf('Payer {m} F', { m: F(total) })}</span>
          </button>
        </div>
        <p className="t12 c3" style={{ textAlign: 'center' }}>{tf('Ton argent reste bloqué jusqu’au retrait par {p}. Paiement au comptoir non proposé.', { p: l.prenom })}</p>
        <div className="hint-l">
          <Icone nom="smartphone" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{tf('{p} reçoit son code de retrait par SMS et n’a rien à payer. Tu suis la commande sans voir son code ni son adresse.', { p: l.prenom })}</span>
        </div>
        <div className="hint-l">
          <Icone nom="rotate-ccw" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('Un remboursement revient toujours sur cette carte, jamais en espèces.')}</span>
        </div>
        <div className="hint-l">
          <Icone nom="shield-check" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('Chaque paiement est contrôlé : pays de la carte, de ton compte et de ton numéro, montant et rythme des commandes. S’il sort de tes habitudes, un code SMS est demandé en plus de 3-D Secure.')}</span>
        </div>
        <div className="links">
          <Link to={chemin('diaspora-infos')}>{t('Ce qu’il faut pour commander')}</Link>
        </div>
    </>
  )
  return (
    <Ecran route="commander-pour" gabarit="colonnes">
      <Colonne>
        <div className="card vedette mt12 row" style={{ gap: 12 }}>
          <span className="ic-sq or" style={{ borderRadius: '50%', width: 44, height: 44, fontWeight: 800 }}>
            {l.prenom.slice(0, 1)}
          </span>
          <span className="grow">
            <b className="t15" style={{ display: 'block' }}>
              {tf('Pour {p}', { p: l.prenom })}
            </b>
            <span className="t12 c3">{livraison === 'domicile' ? tf('Livré chez {p} · il remet son code, toi la preuve', { p: l.prenom }) : tf('Retrait au relais de {q} · il reçoit son code, toi la preuve', { q: t(quartier(l.relais)) })}</span>
          </span>
        </div>
        {dem && (
          <div className="note ink">
            <Icone nom="shopping-basket" taille={18} />
            <div>
              {tf('Panier envoyé par {p} le {d}.', { p: l.prenom, d: dateA(dem.creeLe, langue) })}
              {dem.mot ? ' « ' + dem.mot + ' »' : ''}
            </div>
          </div>
        )}
        {/* Où va le colis : le relais choisi par le proche, ou chez lui s'il l'a accepté (jamais l'adresse). */}
        <div className="card">
          <h3 className="cl11-k">{t('Livraison')}</h3>
          <div className="seg dia-seg">
            {(['relais', 'domicile'] as const).map((x) => (
              <a key={x} href="#" role="radio" aria-checked={livraison === x} className={(livraison === x ? 'on' : '') + (x === 'domicile' && !l.domicile ? ' off' : '')} onClick={(e) => (e.preventDefault(), l.domicile && (setLivraison(x), setControle(null)))}>
                {x === 'relais' ? tf('Au relais de {q}', { q: t(quartier(l.relais)) }) : tf('Chez {p}', { p: l.prenom })}
              </a>
            ))}
          </div>
          <p className="t12 c3">
            {!l.domicile
              ? tf('{p} n’a pas accepté la livraison chez lui : il retire au relais qu’il a choisi.', { p: l.prenom })
              : livraison === 'domicile'
                ? tf('L’adresse reste dans le compte de {p} : tu ne la vois jamais. Le livreur lui remet le colis contre son code.', { p: l.prenom })
                : tf('{p} retire au relais avec son code, aux heures d’ouverture.', { p: l.prenom })}
          </p>
          {parProche && tot.supplement > 0 && (
            <>
              <div className="seg dia-seg">
                {(['payeur', 'destinataire'] as const).map((x) => (
                  <a key={x} href="#" role="radio" aria-checked={qui === x} className={(qui === x ? 'on' : '') + (x === 'destinataire' && !permis.ok ? ' off' : '')} onClick={(e) => (e.preventDefault(), (x === 'payeur' || permis.ok) && setSupplementPar(x))}>
                    {x === 'payeur' ? t('Je paie tout') : tf('{p} paie le supplément', { p: l.prenom })}
                  </a>
                ))}
              </div>
              <p className="t12 c3">
                {qui === 'destinataire'
                  ? tf('{p} paiera {m} F à la remise (supplément domicile). S’il refuse le colis, ce montant et les frais sont retenus sur ton remboursement, jamais plus que le payé.', { p: l.prenom, m: F(tot.supplement) })
                  : permis.ok
                    ? tf('Tu paies aussi le supplément domicile ({m} F) : {p} n’a rien à payer.', { m: F(tot.supplement), p: l.prenom })
                    : tf('Supplément domicile ({m} F) payé par toi : la valeur des articles ne couvre pas la garantie pour le laisser à {p}.', { m: F(tot.supplement), p: l.prenom })}
              </p>
            </>
          )}
        </div>
        {tabL ? (
          <>
            <div className="card">{articles}</div>
            {code === null && champMot}
          </>
        ) : (
          <>
            <div className="card">
              {articles}
              {totaux}
            </div>
            {alertes}
            {code !== null ? (
              verification
            ) : (
              <>
                {champMot}
                {saisie}
              </>
            )}
          </>
        )}
      </Colonne>
      {tabL && (
        <Aside titre="Paiement">
          <div className="card">{totaux}</div>
          {alertes}
          {code !== null ? verification : saisie}
        </Aside>
      )}
    </Ecran>
  )
}
