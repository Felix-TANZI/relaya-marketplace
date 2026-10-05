// Écran « Wallet BelivaY » (CL-13 ; CWL-01 à CWL-11 ; moteurs/portefeuille.py ; DP-06, DP-48), balisage du
// prototype du 1er octobre, repris à la main et rendu logique (DP-53) :
// - solde, cagnotte et historique lus dans les données ; l'œil masque aussi les montants de l'historique ;
// - « Recharger » : montant au choix (puces ou saisie libre), depuis un numéro Mobile Money vérifié ; au moins
//   WALLET-RECHARGE-MIN, jamais au-delà de WALLET-PLAFOND, sans frais ; validé sur le téléphone, puis crédité ;
// - « Retirer » : vers un numéro vérifié ; au moins WALLET-RETRAIT-MIN, au plus ce qui se retire maintenant
//   (une recharge non utilisée attend 72 h) et WALLET-RETRAIT-JOUR par jour ; frais annoncés avant de valider
//   (un retrait gratuit par mois sur l'argent rechargé, puis 1 %, 100 F au moins ; jamais sur un remboursement) ;
// - après l'opération, la note du prototype (« Wallet rechargé de … · nouveau solde … ») avec les vrais chiffres.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import img_2e1656c379fd_jpg from '../../assets/prototype/2e1656c379fd.jpg'
import { Feuille } from '../../composants/Feuille'
import { Icone } from '../../composants/Icone'
import { Montant, OeilSolde, useSoldeMasque, masquerMontants } from '../../composants/Profil'
import { Styles } from '../../composants/Styles'
import { chemin } from '../../config/pages'
import { nomMoMo } from '../../donnees/numeros'
import { source, type DonneesPortefeuille, type Mouvement, type RefusPortefeuille } from '../../donnees/source'
import { dateA, dateHeure } from '../../i18n/dates'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'
import { Bloc, EcranCompte } from './Larges'

const PUCES = [5000, 10000, 25000, 50000]
const RESULTAT = 'blv_wallet_resultat'
type Resultat = { type: 'recharge' | 'retrait'; montant: number; solde: number; frais: number; vers: string }
const lireResultat = (): Resultat | null => {
  try {
    return JSON.parse(sessionStorage.getItem(RESULTAT) || 'null') as Resultat | null
  } catch {
    return null
  }
}
const garderResultat = (r: Resultat) => {
  try {
    sessionStorage.setItem(RESULTAT, JSON.stringify(r))
  } catch {
    // Stockage refusé : la note reprend les chiffres de l'adresse.
  }
}

const ICONES: Record<Mouvement['type'], string> = {
  recharge: 'arrow-down-left',
  remboursement: 'rotate-ccw',
  paiement: 'shopping-bag',
  cagnotte: 'piggy-bank',
  retrait: 'arrow-up-right',
}

// Feuille « Recharger » ou « Retirer ».
function FeuilleOperation(p: { mode: 'recharge' | 'retrait'; d: DonneesPortefeuille; montantDepart: number; fermer: () => void; fait: (r: Resultat) => void }) {
  const { t, tf, langue } = usePreferences()
  const recharge = p.mode === 'recharge'
  const [montant, setMontant] = useState(p.montantDepart)
  const [saisie, setSaisie] = useState<string | null>(null) // montant en cours de frappe
  const parDefaut = p.d.moyens.find((m) => m.parDefaut) ?? p.d.moyens[0]
  const [moyenId, setMoyenId] = useState(parDefaut?.id ?? '')
  const [frais, setFrais] = useState(0)
  const [enCours, setEnCours] = useState(false)
  const [refus, setRefus] = useState<{ refus: RefusPortefeuille; possible: number } | null>(null)
  const r = p.d.regles

  useEffect(() => {
    if (!recharge) source.fraisRetrait(montant).then(setFrais)
  }, [recharge, montant])

  // Contrôle sur place (le serveur décide de toute façon au moment de valider).
  const local: { refus: RefusPortefeuille; possible: number } | null = recharge
    ? montant < r.rechargeMin
      ? { refus: 'minimum', possible: r.rechargeMin }
      : p.d.solde + montant > r.plafond
        ? { refus: 'plafond', possible: r.plafond - p.d.solde }
        : null
    : montant < r.retraitMin
      ? { refus: 'minimum', possible: r.retraitMin }
      : montant > p.d.solde
        ? { refus: 'solde', possible: p.d.solde }
        : montant > p.d.retirable
          ? { refus: 'attente_recharge', possible: p.d.retirable }
          : null
  const erreur = refus ?? local
  const message = (e: { refus: RefusPortefeuille; possible: number }) =>
    ({
      minimum: tf(recharge ? 'Recharge minimale : {m} F.' : 'Retrait minimal : {m} F.', { m: F(e.possible) }),
      plafond: tf('Au-delà du plafond du Wallet : tu peux encore recharger {m} F.', { m: F(e.possible) }),
      solde: tf('Ton solde est de {m} F.', { m: F(e.possible) }),
      attente_recharge:
        tf('Tu peux retirer {m} F maintenant.', { m: F(e.possible) }) +
        (p.d.disponibleLe ? ' ' + tf('Une recharge non utilisée se retire 72 h après, dès {d}.', { d: dateA(p.d.disponibleLe, langue) }) : ''),
      attente_numero: t('Ton numéro vient de changer : les retraits reprennent 48 h après le changement.'),
      plafond_jour: tf('Au plus {m} F de retrait par jour : il te reste {r} F aujourd’hui.', { m: F(r.retraitJour), r: F(e.possible) }),
    })[e.refus]

  const valider = async () => {
    if (local || enCours) return setRefus(local)
    setEnCours(true)
    // Mobile Money : la cliente valide sur son téléphone avec son code ; l'opérateur confirme ensuite (CWL-03).
    if (recharge) await new Promise((ok) => setTimeout(ok, 1200))
    const res = recharge ? await source.recharger(montant, moyenId) : await source.retirer(montant, moyenId)
    setEnCours(false)
    if (!res.ok) return setRefus({ refus: res.refus, possible: res.possible })
    const m = p.d.moyens.find((x) => x.id === moyenId)
    p.fait({ type: p.mode, montant, solde: res.solde, frais: res.frais, vers: m ? nomMoMo(m.operateur) : 'Mobile Money' })
  }
  const choisirMontant = (v: number) => (setMontant(v), setSaisie(null), setRefus(null))
  const ok = '%23wallet%3Fst%3Drecharge%26m%3D' + montant

  return (
    <Feuille ouverte fermer={p.fermer} titre={t(recharge ? 'Recharger mon Wallet' : 'Retirer vers Mobile Money')}>
      <i className="cl14-mk"></i>
      <h2 className="t19 b8" style={{ margin: '0' }}>
        {t(recharge ? 'Recharger mon Wallet' : 'Retirer vers Mobile Money')}
      </h2>
      <p className="t13 c3" style={{ margin: '4px 0 12px' }}>
        {recharge
          ? t('Depuis ton Mobile Money · sans frais')
          : tf('Disponible\u00A0: {m}\u00A0F · ', { m: F(p.d.retirable) }) + (frais ? tf('frais {f} F', { f: F(frais) }) : t('sans frais'))}
      </p>
      <div className="wl-big">
        <input
          aria-label={t('Montant')}
          inputMode="numeric"
          value={saisie ?? t(`${F(montant)}\u00A0F`)}
          onFocus={(e) => {
            setSaisie(String(montant))
            // Toucher le montant le sélectionne : ce qu'on tape le remplace.
            const champ = e.currentTarget
            requestAnimationFrame(() => champ.select())
          }}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '').slice(0, 7)
            setSaisie(v)
            setMontant(Number(v || 0))
            setRefus(null)
          }}
          onBlur={() => setSaisie(null)}
        />
      </div>
      <div className="wl-chips mt12">
        {PUCES.map((v) => (
          <a
            key={v}
            href={chemin('wallet', { st: recharge ? 'recharger' : 'retirer', m: String(v) })}
            className={montant === v ? 'on' : ''}
            onClick={(e) => (e.preventDefault(), choisirMontant(v))}
          >
            {t(F(v))}
          </a>
        ))}
      </div>
      {erreur && (
        <div className="hint" role="alert" style={{ color: 'var(--red)', textAlign: 'center' }}>
          {message(erreur)}
        </div>
      )}
      <div className="cl08-kk mt14" style={{ fontSize: '12px', fontWeight: '800', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
        {t(recharge ? 'Depuis' : 'Vers')}
      </div>
      {p.d.moyens.map((m) => (
        <a
          key={m.id}
          href={chemin('wallet', { st: recharge ? 'recharger' : 'retirer', m: String(montant) })}
          className={'radio' + (m.id === moyenId ? ' on' : '')}
          role="radio"
          aria-checked={m.id === moyenId}
          onClick={(e) => (e.preventDefault(), setMoyenId(m.id))}
        >
          <span className="rd"></span>
          <span className="grow">
            <span className="rt" style={{ display: 'block' }}>
              {t(`${nomMoMo(m.operateur)} · ${m.numeroMasque}`)}
            </span>
            <span className="rs" style={{ display: 'block' }}>
              {t(m.duCompte ? 'Ton numéro vérifié' : 'Numéro vérifié')}
            </span>
          </span>
        </a>
      ))}
      {recharge && (
        <>
          <Styles id="b472efbe3c" />
          <div className="xp-k">
            <Icone nom="zap" taille={14} />
            {t('Ou avec la carte du téléphone')}
          </div>
          <div className="xp-row">
            <Link to={`/xp-pay?m=apple&back=wallet%3Fst%3Drecharger&t=${montant}&ok=${ok}`} className="xp-b apple" aria-label="Payer avec Apple Pay">
              <Icone nom="apple" taille={20} />
              <span>{t('Pay')}</span>
            </Link>
            <Link to={`/xp-pay?m=google&back=wallet%3Fst%3Drecharger&t=${montant}&ok=${ok}`} className="xp-b gpay" aria-label="Payer avec Google Pay">
              <Icone nom="gpay-g" taille={20} />
              <span>{t('Pay')}</span>
            </Link>
          </div>
          <p className="xp-note">{t('Ta carte enregistrée dans le téléphone, validée par Face ID ou ton empreinte. Même frais que la carte (2 %).')}</p>
        </>
      )}
      <div className="btns mt16">
        <a
          href={chemin('wallet', { st: recharge ? 'recharger' : 'retirer', m: String(montant) })}
          role="button"
          className={'btn primary' + (enCours ? ' off' : '')}
          onClick={(e) => (e.preventDefault(), valider())}
        >
          <Icone nom={recharge ? 'plus' : 'arrow-up-right'} taille={18} />
          <span>
            {enCours
              ? t('Valide sur ton téléphone…')
              : t(`${recharge ? 'Recharger' : 'Retirer'} ${F(montant)} F`)}
          </span>
        </a>
      </div>
      <div className="hint-l">
        <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>
          {recharge
            ? t(`Tu valides sur ton téléphone avec ton code MoMo. Plafond du Wallet : ${F(r.plafond)} F.`)
            : t('Arrive sur ton Mobile Money en moins d’une minute.')}
        </span>
      </div>
      <div className="btns">
        <a href={chemin('wallet')} className="btn ghost" onClick={(e) => (e.preventDefault(), p.fermer())}>
          <span>{t('Fermer')}</span>
        </a>
      </div>
    </Feuille>
  )
}

export function Wallet() {
  const { t, tf, langue } = usePreferences()
  const naviguer = useNavigate()
  const masque = useSoldeMasque()
  const [params] = useSearchParams()
  const st = params.get('st')
  const m = Number(params.get('m') || 10000)
  const tout = params.get('vue') === 'historique'
  const [d, setD] = useState<DonneesPortefeuille | null>(null)
  const [version, setVersion] = useState(0)
  useEffect(() => {
    let vivant = true
    source.portefeuille().then((x) => vivant && setD(x))
    return () => {
      vivant = false
    }
  }, [version])
  useEffect(() => {
    if (tout) document.getElementById('historique')?.scrollIntoView({ block: 'start' })
  }, [tout, d])
  if (!d) return null

  const fermer = () => naviguer(chemin('wallet'), { replace: true })
  const fait = (r: Resultat) => {
    garderResultat(r)
    setVersion((v) => v + 1)
    naviguer(chemin('wallet', { st: r.type === 'recharge' ? 'recharge' : 'retire', m: String(r.montant) }), { replace: true })
  }
  // Note après l'opération : les chiffres de l'opération faite ; ouverte par son adresse, ceux de l'adresse.
  const res = lireResultat()
  const note =
    st === 'recharge' || st === 'retire'
      ? res && res.montant === m && res.type === (st === 'recharge' ? 'recharge' : 'retrait')
        ? res
        : { type: st === 'recharge' ? ('recharge' as const) : ('retrait' as const), montant: m, solde: st === 'recharge' ? d.solde + m : d.solde, frais: 0, vers: 'MTN MoMo' }
      : null
  const feuille = st === 'recharger' || st === 'retirer' ? (
    <FeuilleOperation key={st} mode={st === 'recharger' ? 'recharge' : 'retrait'} d={d} montantDepart={m} fermer={fermer} fait={fait} />
  ) : null
  // Filtre de l'historique (DP-54) : tout, l'argent reçu, l'argent sorti.
  const filtre = params.get('f') === 'entrees' || params.get('f') === 'sorties' ? params.get('f') : null
  const filtres = d.historique.filter((h) => !filtre || (filtre === 'entrees' ? h.montant > 0 : h.montant < 0))
  const historique = tout ? filtres : filtres.slice(0, 6)
  const voir = (v: string) => (masque ? masquerMontants(v) : v)
  const lienFiltre = (f: string | null) => chemin('wallet', { ...(tout ? { vue: 'historique' } : {}), ...(f ? { f } : {}) })

  return (
    <EcranCompte route="wallet" parEtat etat={st === 'recharger' || st === 'retirer' ? `wallet?st=${st}` : st === 'recharge' ? 'wallet?m=10000&st=recharge' : 'wallet'} fixes={feuille} avant={<Styles id="118b6d36f2" />}>
      <Styles id="0b0ccec1e3" />
      <Styles id="1c3d953197" />
      {note && (
        <div className="note green">
          <Icone nom="circle-check" taille={18} />
          <div>
            <b>
              {note.type === 'recharge'
                ? t(`Wallet rechargé de ${F(note.montant)} F`)
                : tf('Retrait de {m} F envoyé vers {vers}', { m: F(note.montant), vers: note.vers })}
            </b>
            {note.type === 'recharge'
              ? t(` · nouveau solde ${F(note.solde)} F`)
              : tf(' · arrive en moins d’une heure{frais} · nouveau solde {s} F', { s: F(note.solde), frais: note.frais ? tf(' · frais {f} F', { f: F(note.frais) }) : '' })}
          </div>
        </div>
      )}
      <Styles id="0b0ccec1e3" />
      <Styles id="1c3d953197" />
      <div className="ph-ban" style={{ backgroundImage: `url(${img_2e1656c379fd_jpg})` }} role="img" aria-label="Paie en un geste">
        <span className="tx">
          <b>{t('Paie en un geste')}</b>
          <span>{t('Ton Wallet BelivaY : sans frais, protégé jusqu’à ton retrait.')}</span>
        </span>
      </div>
      <Bloc classe="c13-wal">
      <Bloc classe="c13-k">
      <section className="wl-card">
        <span className="ring"></span>
        <div className="wl-h">
          <Icone nom="wallet" taille={16} />
          <span className="grow">{t('Wallet BelivaY')}</span>
          <OeilSolde />
        </div>
        <div className="wl-bal">
          <Montant solde>{t(F(d.solde))}</Montant>
          <small>{t('F')}</small>
        </div>
        <div className="wl-sub">
          <Montant>{tf('Disponible · cagnotte en attente {m}\u00A0F', { m: F(d.cagnotteEnAttente) })}</Montant>
        </div>
        <div className="wl-act">
          <Link to={chemin('wallet', { st: 'recharger' })}>
            <span className="i">
              <Icone nom="plus" taille={20} />
            </span>
            {t('Recharger')}
          </Link>
          <Link to={chemin('panier')}>
            <span className="i">
              <Icone nom="shopping-cart" taille={19} />
            </span>
            {t('Payer')}
          </Link>
          <Link to={chemin('wallet', { st: 'retirer' })}>
            <span className="i">
              <Icone nom="arrow-up-right" taille={19} />
            </span>
            {t('Retirer')}
          </Link>
          <Link to={chemin('wallet', { vue: 'historique' })}>
            <span className="i">
              <Icone nom="list" taille={19} />
            </span>
            {t('Historique')}
          </Link>
        </div>
      </section>
      {/* DP-54 : sous l'en-tête, le détail du solde : ce qui se retire maintenant, sans frais ou non, ce qui attend. */}
      <div className="dx-h">
        <b>{t('Mon solde en détail')}</b>
      </div>
      <div className="card">
        {[
          ['Retirable maintenant', d.retirable],
          ['Dont remboursements, retirés sans frais', d.rembourse],
          ...(d.solde > d.retirable ? [['Recharges en attente (72 h)', d.solde - d.retirable] as [string, number]] : []),
          ['Cagnotte en attente', d.cagnotteEnAttente],
        ].map(([k, v]) => (
          <div key={k as string} className="kv">
            <span className="k">{t(k as string)}</span>
            <span className="v">{voir(`${F(v as number)} F`)}</span>
          </div>
        ))}
        <div className="kv">
          <span className="k">{t('Retraits gratuits ce mois-ci')}</span>
          <span className="v">{tf('{n} sur {m}', { n: d.retraitsGratuits, m: d.frais.gratuitsParMois })}</span>
        </div>
        <div className="kv">
          <span className="k">{t('Retiré aujourd’hui')}</span>
          <span className="v">{voir(`${F(d.retireAujourdhui)} F`) + ' / ' + F(d.regles.retraitJour) + ' F'}</span>
        </div>
        {d.disponibleLe && d.solde > d.retirable && (
          <div className="hint-l">
            <Icone nom="clock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{tf('Le reste se retire dès {d}. Payer une commande avec, c’est possible tout de suite.', { d: dateA(d.disponibleLe, langue) })}</span>
          </div>
        )}
        {!d.moyens.length && (
          <div className="hint-l">
            <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>
              {t('Ajoute un numéro Mobile Money vérifié pour recharger et retirer.')}{' '}
              <Link to={chemin('moyens-paiement')}>{t('Mes moyens de paiement')}</Link>
            </span>
          </div>
        )}
      </div>
      <div className="dx-h">
        <b>{t('Comment ça marche')}</b>
      </div>
      <div className="card tight">
        {[
          ['zap', 'Payer en un geste', 'Choisis « Wallet BelivaY » au paiement : pas de validation sur le téléphone, aucun frais.'],
          ['shield-check', 'Toujours protégé', 'L’argent payé reste bloqué chez BelivaY jusqu’à ton retrait, comme avec MoMo.'],
          ['rotate-ccw', 'Remboursé tout de suite', 'Un remboursement validé arrive ici immédiatement ; payé par carte, il revient sur la même carte.'],
          ['piggy-bank', 'Ta cagnotte y arrive', 'Les 2 % gagnés sont versés au Wallet après chaque retrait.'],
        ].map(([icone, titre, sous]) => (
          <div key={titre} className="li">
            <span className="ic ">
              <Icone nom={icone} taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t(titre)}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {t(sous)}
              </span>
            </span>
          </div>
        ))}
      </div>
      </Bloc>
      <Bloc classe="c13-k c13-hist">
      <div className="dx-h" id="historique">
        <b>{t('Historique')}</b>
        {!tout && filtres.length > 6 && <Link to={chemin('wallet', { vue: 'historique', ...(filtre ? { f: filtre } : {}) })}>{t('Tout voir')}</Link>}
      </div>
      <div className="seg" role="group" aria-label={t('Filtrer l’historique')} style={{ marginTop: 0, marginBottom: 10 }}>
        {(
          [
            [null, 'Tout'],
            ['entrees', 'Entrées'],
            ['sorties', 'Sorties'],
          ] as [string | null, string][]
        ).map(([f, l]) => (
          <Link key={l} to={lienFiltre(f)} replace className={filtre === f ? 'on' : ''} aria-current={filtre === f ? 'true' : undefined}>
            {t(l)}
          </Link>
        ))}
      </div>
      {!historique.length && (
        <div className="card">
          <div className="empty">
            <div className="ei">
              <Icone nom="list" taille={26} />
            </div>
            <h3>{t(filtre ? 'Rien dans ce filtre' : 'Aucun mouvement pour l’instant')}</h3>
            <p>{t('Recharges, paiements, remboursements, cagnotte et retraits s’afficheront ici, avec leur date.')}</p>
          </div>
        </div>
      )}
      <div className="card tight wl-hist" hidden={!historique.length}>
        {historique.map((h) => (
          <div key={h.id} className="li">
            <span className={h.montant > 0 ? 'ic green' : 'ic'}>
              <Icone nom={ICONES[h.type]} taille={19} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t(h.libelle)}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {dateHeure(h.le, langue)}
              </span>
            </span>
            <span className={'amt ' + (h.montant > 0 ? 'in' : 'out')}>
              {(() => {
                const v = t(`${h.montant > 0 ? '+' : '−'} ${F(Math.abs(h.montant))} F`)
                return masque ? masquerMontants(v) : v
              })()}
            </span>
          </div>
        ))}
      </div>
      </Bloc>
      </Bloc>
      <details className="more">
        <summary>
          <Icone nom="lock" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">{t('Sécurité et plafonds')}</span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b">
          <p className="t13 c2" style={{ margin: '0' }}>
            {t(
              `Code Wallet à 4 chiffres pour chaque paiement au-delà de 50 000 F. Plafond du solde : ${F(d.regles.plafond)} F. Le Wallet est un moyen de paiement de BelivaY, pas un compte bancaire : il ne rapporte pas d’intérêts.`,
            )}
          </p>
        </div>
      </details>
      {/* DP-54 : les règles du portefeuille, en clair (CWL-01 à CWL-12, DP-06, DP-16). */}
      <details className="more">
        <summary>
          <Icone nom="scroll-text" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">{t('Règles : recharge, retrait, frais')}</span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b">
          <p>{tf('Recharge : {m} F au moins, sans frais, depuis un numéro Mobile Money vérifié. Le solde ne dépasse jamais {p} F.', { m: F(d.regles.rechargeMin), p: F(d.regles.plafond) })}</p>
          <p>{tf('Retrait : {m} F au moins, {j} F au plus par jour, vers un numéro vérifié ; arrive en moins d’une heure.', { m: F(d.regles.retraitMin), j: F(d.regles.retraitJour) })}</p>
          <p>
            {tf('Frais : {n} retrait gratuit par mois sur l’argent rechargé, puis {p} % ({min} F au moins). L’argent d’un remboursement se retire toujours sans frais.', {
              n: d.frais.gratuitsParMois,
              p: d.frais.pourCent,
              min: F(d.frais.minimum),
            })}
          </p>
          <p>{tf('Une recharge non utilisée se retire {h} h après ; tu peux payer une commande avec tout de suite. Après un changement de numéro, les retraits reprennent {n} h plus tard.', { h: d.frais.attenteRechargeH, n: d.frais.attenteNumeroH })}</p>
          <p>{t('Remboursements : toujours ici, dès la décision ; un paiement par carte est remboursé sur la même carte. Ton argent n’expire jamais.')}</p>
          <p>{t('Fermer ton compte : retire d’abord ton solde, il est à toi.')}</p>
        </div>
      </details>
      <div className="card tight mt12">
        <Link to={chemin('moyens-paiement')} className="li">
          <span className="ic">
            <Icone nom="smartphone" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('Mes numéros Mobile Money')}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {t(d.moyens.length ? 'Ajouter un numéro, choisir celui par défaut' : 'Ajoute un numéro vérifié')}
            </span>
          </span>
          <span className="chev">
            <Icone nom="chevron-right" taille={18} />
          </span>
        </Link>
        <Link to={chemin('fil', { id: 'support', st: 'nouveau' })} className="li">
          <span className="ic">
            <Icone nom="messages-square" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('Un mouvement que je ne reconnais pas')}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {t('Écris au support : réponse sous 2 h, de 7 h à 21 h')}
            </span>
          </span>
          <span className="chev">
            <Icone nom="chevron-right" taille={18} />
          </span>
        </Link>
      </div>
    </EcranCompte>
  )
}
