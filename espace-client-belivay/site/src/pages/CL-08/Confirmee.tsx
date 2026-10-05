// Écran « Commande confirmée » (CL-08), forme d'origine du prototype rendue réelle (DP-54) : le reçu de la
// commande payée (?ref=…) : numéro, montant débité, moyen et numéro, date, articles, livraison, remise Prime et
// frais de service ; l'argent bloqué jusqu'au retrait ; le relais (gérant, distance) ou le domicile, le délai
// avant retrait (heure où c'est prêt) et les colis ; suivre la commande ; la feuille « Partager la
// confirmation » (WhatsApp, SMS, e-mail, copier : le téléphone partage, jamais le code de retrait).
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { useDes } from '../../composants/ecran'
import { Aside, Colonne } from '../../composants/Gabarits'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { source, type CommandeClient, type CommandePassee, type Relais } from '../../donnees/source'
import { F } from '../../i18n/format'
import { dateA, dateHeure, quand } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'

export const NOMS: Record<string, string> = { mtn: 'MTN MoMo', orange: 'Orange Money', autre: 'Mobile Money', wallet: 'Portefeuille BelivaY', carte: 'Carte', apple: 'Apple Pay', google: 'Google Pay' }

export function CommandeIntrouvable({ route }: { route: string }) {
  const { t } = usePreferences()
  // Grand écran : l'en-tête de site et le pied de page restent (la page n'est pas une impasse), carte centrée.
  return (
    <Ecran route={route} enteteSite gabarit="centre">
      <div className="card">
        <div className="empty">
          <h3>{t('Commande introuvable')}</h3>
          <div className="btns">
            <Link to={chemin('commandes')} className="btn primary">
              <span>{t('Voir mes commandes')}</span>
            </Link>
          </div>
        </div>
      </div>
    </Ecran>
  )
}

// La commande passée, son suivi (heure où c'est prêt) et le relais (gérant, distance, horaires).
export function useRecu(ref: string | null) {
  const [c, setC] = useState<CommandePassee | null | undefined>(undefined)
  const [suivi, setSuivi] = useState<{ commande: CommandeClient; maintenant: number } | null>(null)
  const [relais, setRelais] = useState<Relais | null>(null)
  useEffect(() => {
    if (!ref) return setC(null)
    source.commandePassee(ref).then(setC)
    source.commandeClient(ref).then(setSuivi)
  }, [ref])
  useEffect(() => {
    if (c?.mode === 'relais') source.relaisListe().then((l) => setRelais(l.relais.find((r) => r.nom === c.lieu) ?? null))
  }, [c])
  return { c, suivi, relais }
}

export const distance = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${String(Math.round(km * 10) / 10).replace('.', ',')} km`)
// « 4 h 45 » avant que ce soit prêt.
export const delai = (ms: number) => {
  const m = Math.max(0, Math.round(ms / 60000))
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${m} min`
}

// Ligne « moyen débité » du reçu.
export function LigneMoyen({ c }: { c: CommandePassee }) {
  const { t } = usePreferences()
  const k = c.moyen === 'mtn' || c.moyen === 'orange' || c.moyen === 'autre' ? 'Numéro débité' : c.moyen === 'carte' ? 'Carte débitée' : 'Payé avec'
  return (
    <div className="cl08-ln">
      <span className="k">{t(k)}</span>
      <span className="v">
        {t(NOMS[c.moyen])}
        {c.numero && (
          <>
            {' · '}
            <span className="cl08-tel">{c.numero}</span>
          </>
        )}
      </span>
    </div>
  )
}

// Le relais (ou le domicile) où attend la commande, et quand.
export function BlocRetrait({ c, relais, quandBloc, colis, detail }: { c: CommandePassee; relais: Relais | null; quandBloc: ReactNode; colis: string; detail?: string }) {
  const { t, tf } = usePreferences()
  return (
    <div className="cl08-rel">
      <div className="cl08-rdv">
        <span className="portrait" style={{ width: '52px', height: '52px' }}>
          {c.mode === 'relais' ? <Dessin id="bc270b4894be" /> : <Icone nom="house" taille={24} />}
        </span>
        <span className="grow">
          <span className="rk">{t(c.mode === 'relais' ? 'Ton relais de retrait' : 'Livraison à domicile')}</span>
          <b>{c.mode === 'relais' ? t(relais?.gerant ?? c.lieu) : t(c.lieu)}</b>
          <span className="s">
            {c.mode === 'relais'
              ? relais && detail
                ? detail
                : relais
                  ? tf('t’attend au {l} · {d} de chez toi', { l: t(relais.nom), d: distance(relais.km) })
                  : t(c.lieu)
              : t('Le livreur t’appelle avant de passer.')}
          </span>
        </span>
      </div>
      <div className="cl08-in"></div>
      {quandBloc}
      <div className="cl08-pk">
        <Icone nom="package" taille={16} />
        <span>{colis}</span>
      </div>
    </div>
  )
}

// Où revient l'argent d'une annulation ou d'un litige (REMB-DESTINATION, DP-16, DP-17, DP-23).
export function useRemboursement(c: CommandePassee | null | undefined) {
  const { t, tf } = usePreferences()
  const { interrupteurs } = useSession()
  if (!c) return ''
  if (c.payeur) return tf('Un remboursement revient sur la carte de {p}, qui a payé.', { p: c.payeur.prenom })
  if (c.moyen === 'carte' || c.moyen === 'apple' || c.moyen === 'google') return t('Un remboursement revient sur la même carte.')
  if (interrupteurs['FF-WALLET']) return t('Un remboursement est crédité sur ton portefeuille BelivaY, retirable sans frais vers ton Mobile Money.')
  return t('Un remboursement revient sur le numéro Mobile Money qui a payé.')
}

// Liens d'aide sous le reçu : le détail, l'annulation, le support (sujet Paiement, cette commande).
export function LiensRecu({ c }: { c: CommandePassee }) {
  const { t } = usePreferences()
  return (
    <div className="links" style={{ flexWrap: 'wrap' }}>
      <Link to={chemin('commande', { ref: c.ref })}>{t('Voir le détail de la commande')}</Link>
      <Link to={chemin('annuler', { ref: c.ref })}>{t('Annuler une boutique')}</Link>
      <Link to={chemin('fil', { id: 'support', st: 'nouveau', sujet: 'Paiement', commande: c.ref })}>{t('Écrire au support')}</Link>
    </div>
  )
}

export function Confirmee() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const ref = params.get('ref')
  const { c, suivi, relais } = useRecu(ref)
  // Dès 1024 px (§ 5.7) : le reçu à gauche ; à droite (aside), le relais, l'heure où c'est prêt, les colis,
  // « Suivre ma commande » et « Partager la confirmation ».
  const tabL = useDes('tab-l')
  const [feuille, setFeuille] = useState(false)
  const [copie, setCopie] = useState(false)
  const remboursement = useRemboursement(c)
  if (c === undefined) return null
  if (!c) return <CommandeIntrouvable route="confirmee" />
  const maintenant = suivi?.maintenant ?? Date.now()
  const pret = suivi?.commande.pretLe ?? null
  const dispo = pret ? quand(pret, maintenant, langue).replace(/ (à|at) /, langue === 'en' ? ' from ' : ' dès ') : null
  const colis = c.colis > 1 ? tf('{n} colis, retirables ensemble avec un seul code', { n: c.colis }) : t('1 colis')
  const lieu = c.mode === 'relais' ? tf('à retirer au {l}', { l: t(c.lieu) }) : tf('livrés à {l}', { l: t(c.lieu) })
  const texte = tf('Commande BelivaY {ref} confirmée : {m} F payés le {d}. {n} colis, {lieu}{dispo}. L’argent reste bloqué jusqu’au retrait.', {
    ref: c.ref,
    m: F(c.montant),
    d: dateA(c.le, langue),
    n: c.colis,
    lieu,
    dispo: dispo ? ', ' + dispo : '',
  })
  const copier = async () => {
    try {
      await navigator.clipboard.writeText(texte)
      setCopie(true)
    } catch {
      setCopie(false)
    }
  }
  const quandBloc = (
    <div className="cl08-when">
      <span className="k">
        {t(c.mode === 'relais' ? 'Retrait possible dans' : 'Livraison prévue dans')}
        {dispo && <small>{dispo}</small>}
      </span>
      <span className="cl08-cd">{pret ? (pret > maintenant ? delai(pret - maintenant) : t('Prêt')) : '—'}</span>
    </div>
  )
  const feuilleRendue = feuille && (
    <>
      <div className="veil" onClick={() => setFeuille(false)}></div>
      <div className="sheet" role="dialog" aria-label={t('Partager la confirmation')}>
        <div className="grab"></div>
        <div className="cl08-shh">
          <h2>{t('Partager la confirmation')}</h2>
          <button type="button" className="cl08-x" aria-label={t('Fermer')} onClick={() => setFeuille(false)}>
            <Icone nom="x" taille={22} />
          </button>
        </div>
        <div className="cl08-share mt10">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="k">{t('Commande confirmée')}</span>
            <span className="t12 b8">{c.ref}</span>
          </div>
          <div className="a">{tf('{m} F payés', { m: F(c.montant) })}</div>
          <div className="l">
            {dateA(c.le, langue)}
            <br />
            {[tf('{n} colis', { n: c.colis }), t(c.lieu), dispo].filter(Boolean).join(' · ')}
            <br />
            {t('Argent bloqué jusqu’au retrait')}
          </div>
        </div>
        <div className="cl08-quote">{texte}</div>
        <div className="cl08-apps">
          <a href={'https://wa.me/?text=' + encodeURIComponent(texte)} target="_blank" rel="noreferrer">
            <span>
              <Icone nom="message-circle" taille={24} />
            </span>
            {t('WhatsApp')}
          </a>
          <a href={'sms:?body=' + encodeURIComponent(texte)}>
            <span>
              <Icone nom="message-square" taille={24} />
            </span>
            {t('SMS')}
          </a>
          <a href={'mailto:?subject=' + encodeURIComponent('BelivaY ' + c.ref) + '&body=' + encodeURIComponent(texte)}>
            <span>
              <Icone nom="mail" taille={24} />
            </span>
            {t('E-mail')}
          </a>
          <a href="#" onClick={(e) => (e.preventDefault(), copier())}>
            <span>
              <Icone nom={copie ? 'check' : 'copy'} taille={24} />
            </span>
            {t(copie ? 'Copié' : 'Copier')}
          </a>
        </div>
        {copie && <p className="t13 c3" style={{ textAlign: 'center' }}>{t('Texte copié : colle-le où tu veux.')}</p>}
        <div className="hint-l">
          <Icone nom="smartphone" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('C’est ton téléphone qui partage. BelivaY n’envoie rien à ta place, et jamais ton code de retrait.')}</span>
        </div>
      </div>
    </>
  )
  const retrait = <BlocRetrait c={c} relais={relais} quandBloc={quandBloc} colis={colis} />
  const actions = (
    <>
      <div className="btns mt14">
        <Link to={chemin('suivi', { ref: c.ref })} className={'btn ' + (feuille ? 'secondary' : 'primary')}>
          <span>{t('Suivre ma commande')}</span>
        </Link>
      </div>
      <div className="btns">
        <button type="button" className="btn secondary cl08-ob cl08-out" onClick={() => (setCopie(false), setFeuille(true))}>
          <Icone nom="share-2" taille={18} />
          <span>{t('Partager la confirmation')}</span>
        </button>
      </div>
    </>
  )
  return (
    <Ecran route="confirmee" fixes={feuilleRendue || undefined} gabarit="colonnes">
      <Colonne>
        <div className="card cl08-rc">
          <Link to={chemin('accueil')} className="cl08-x" aria-label={t('Fermer')}>
            <Icone nom="x" taille={22} />
          </Link>
          <div className="cl08-rh">
            <div className="cl08-sq">
              <Icone nom="check" taille={30} trait={2.6} />
            </div>
            <h1>{t('Commande confirmée')}</h1>
            <div className="s">
              {t('Commande n° ')}
              <b>{c.ref}</b>
            </div>
          </div>
          <div className="cl08-dash"></div>
          <div className="cl08-ln">
            <span className="k">{t('Montant débité')}</span>
            <span className="v">
              <span className="cl08-amt">{F(c.montant)}&nbsp;F</span>
            </span>
          </div>
          <LigneMoyen c={c} />
          {c.payeur && (
            <div className="cl08-ln">
              <span className="k">{t('Payé par')}</span>
              <span className="v">{c.payeur.prenom}</span>
            </div>
          )}
          <div className="cl08-ln">
            <span className="k">{t('Date')}</span>
            <span className="v">{dateHeure(c.le, langue)}</span>
          </div>
          {c.lignes.map((l, i) => (
            <div key={i} className="cl08-ln">
              <span className="k">
                {t(l.titre)}
                {l.qte > 1 ? ' × ' + l.qte : ''}
              </span>
              <span className="v">{F(l.prix * l.qte)}&nbsp;F</span>
            </div>
          ))}
          <div className="cl08-ln">
            <span className="k">{t(c.mode === 'relais' ? 'Livraison au relais' : 'Livraison à domicile')}</span>
            <span className="v">{c.livraison ? F(c.livraison) + ' F' : t('offerte')}</span>
          </div>
          {!!c.prime && (
            <div className="cl08-ln">
              <span className="k">{t('Remise Prime sur la livraison')}</span>
              <span className="v">−{F(c.prime)}&nbsp;F</span>
            </div>
          )}
          {c.frais > 0 && (
            <div className="cl08-ln">
              <span className="k">{t('Frais de service')}</span>
              <span className="v">{F(c.frais)}&nbsp;F</span>
            </div>
          )}
          <div className="note green">
            <Icone nom="shield-check" taille={18} />
            <div>{t('Ton argent reste bloqué jusqu’à ton retrait : le vendeur n’est payé qu’après.')}</div>
          </div>
          {!tabL && retrait}
        </div>
        {!tabL && actions}
        <p className="cl08-foot">
          {t(
            c.mode === 'relais'
              ? 'Tu recevras une notification dès que tes colis seront au relais. Ton code de retrait t’attendra dans Mes commandes.'
              : 'Tu recevras une notification dès que tes colis seront en route. Ton code de réception t’attendra dans Mes commandes.',
          )}
        </p>
        <div className="links" style={{ flexWrap: 'wrap' }}>
          {typeof Notification !== 'undefined' && Notification.permission !== 'granted' && <Link to={chemin('notifs-proposition', { ref: c.ref })}>{t('Être prévenu à l’arrivée de mes colis')}</Link>}
          <Link to={chemin('accueil')}>{t('Continuer mes achats')}</Link>
        </div>
        <div className="card cl08-help mt14">
          <div className="cl08-kl">{t('Les prochaines étapes')}</div>
          <ul className="cl08-dots">
            <li>{t('Le vendeur prépare tes colis. Chaque étape s’affiche dans Mes commandes.')}</li>
            {c.mode === 'relais' ? (
              <>
                <li>{t('À l’arrivée au relais, ton code de retrait s’affiche dans Mes commandes. Ne le donne qu’au gérant, au comptoir.')}</li>
                <li>{t('Garde gratuite le jour de l’arrivée ; ensuite, des frais de garde s’ajoutent chaque jour.')}</li>
              </>
            ) : (
              <li>{t('Le livreur t’appelle avant de passer. Donne ton code de réception à la remise du colis, jamais avant.')}</li>
            )}
            <li>{t('Après le retrait, tu as 7 jours pour signaler un problème : ton argent reste bloqué pendant ce temps.')}</li>
            <li>{t('Ta facture sera disponible dans Mes factures après le retrait.')}</li>
            <li>{remboursement}</li>
          </ul>
        </div>
        <LiensRecu c={c} />
      </Colonne>
      {tabL && (
        <Aside titre="Retrait" classe="cf-aside">
          <div className="card">{retrait}</div>
          {actions}
        </Aside>
      )}
    </Ecran>
  )
}
