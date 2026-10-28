// Écran « Mon abonnement » (CL-14), forme d'origine du prototype rendue réelle (DP-54), simplifiée (VAGUE n° 14 :
// palier, prix et prochain prélèvement, « Changer de palier » en grand ; « Ce mois-ci » ; liste courte ; Résilier).
// Avant : le bandeau de nuit (palier,
// prochain prélèvement, numéro, annonce 3 jours avant ; offert, Pass), tes économies avec le palier (livraisons
// offertes, cagnotte versée, cagnotte en attente commande par commande), ce mois-ci (quotas du palier, garde),
// la cagnotte, le parrainage, les conditions, changer de palier, résilier. États tirés des données : à 3 jours
// du prélèvement, la notification d'annonce et le récapitulatif du renouvellement (changer de numéro) ;
// prélèvement refusé : les 7 jours de grâce et payer maintenant ; résilié : ce qui reste jusqu'à la fin, reprendre.
// Sans abonnement : le palier Gratuit et les abonnements. Le corps (VueAbonnement) sert aussi sous la feuille de
// résiliation (AbonnementResilier).
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import img_0718fddbf299_png from '../../assets/prototype/0718fddbf299.png'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { PayerMomo } from '../../composants/PayerMomo'
import { Styles } from '../../composants/Styles'
import { INTERRUPTEURS_DU_LANCEMENT } from '../../config/interrupteurs'
import { chemin } from '../../config/pages'
import { nomMoMo } from '../../donnees/numeros'
import { GRACE, PASS, finGrace, palier } from '../../donnees/prime'
import { source, type DonneesPrime, type MoyenPaiement } from '../../donnees/source'
import { F } from '../../i18n/format'
import { jourSeul } from '../../i18n/dates'
import { usePreferences, type Langue } from '../../preferences'
import { avantages, Bloc, nomPalier, usePrime } from './Commun'

const J = 864e5

// « sam. 24 oct. », avec l'année quand elle n'est pas celle d'aujourd'hui.
export function jourDe(ms: number, maintenant: number, langue: Langue): string {
  const an = (x: number) => new Date(x + 36e5).getUTCFullYear()
  return jourSeul(ms, langue) + (an(ms) !== an(maintenant) ? ' ' + an(ms) : '')
}

// Bandeau de l'interrupteur : seulement quand FF-ABONNEMENT est réellement fermé.
export function BandeauPrime({ vue }: { vue?: string }) {
  const { t } = usePreferences()
  if (INTERRUPTEURS_DU_LANCEMENT['FF-ABONNEMENT']) return null
  return (
    <div className="cl14-top">
      <span className="cl14-ff">
        <Icone nom="lock" taille={13} />
        {t('Après le lancement · interrupteur fermé')}
      </span>
      <span className="cl14-ffc">{t('FF-ABONNEMENT')}</span>
      {vue && (
        <span className="pill ink sm">
          <Icone nom="calendar" taille={13} />
          {vue}
        </span>
      )}
    </div>
  )
}

export function MonAbonnement() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const [d, recharger] = usePrime()
  // Démonstration d'un prélèvement refusé (?st=grace, ?st=suspendu) : posé une fois, puis l'adresse redevient simple.
  const st = params.get('st')
  const scenario = st === 'grace' || st === 'suspendu' ? st : null
  const fait = useRef(false)
  useEffect(() => {
    if (!scenario || fait.current) return
    fait.current = true
    source.prime(scenario).then(() => (recharger(), naviguer(chemin('mon-abonnement'), { replace: true })))
  }, [scenario])
  if (!d || (scenario && !fait.current)) return null
  const a = d.abonnement
  // Grâce finie sans paiement : palier Gratuit ; payer reprend l'abonnement au même tarif, dès aujourd'hui.
  if (a?.echec && !d.actif) {
    const nom = t(nomPalier(a.palier))
    const p = a.palier === 'pass' ? null : palier(a.palier)
    const prix = p ? (a.formule === 'an' ? p.an : p.mois) : a.montant
    return (
      <Ecran route="mon-abonnement" gabarit="compte">
        <Styles id="02f3dac5cd" />
        <BandeauPrime />
        <div className="card">
          <div className="empty">
            <div className="ei">
              <Icone nom="circle-pause" taille={26} />
            </div>
            <h3>{tf('{p} est suspendu', { p: nom })}</h3>
            <p>{tf('Le prélèvement du {d} n’a pas abouti et les {n} jours de grâce sont passés. Tu es au palier Gratuit depuis le {f}.', { d: jourDe(a.echec.le, d.maintenant, langue), n: GRACE, f: jourDe(finGrace(a.echec.le) + J, d.maintenant, langue) })}</p>
          </div>
        </div>
        <div className="card ">
          <div className="kv">
            <span className="k">{t('Montant refusé')}</span>
            <span className="v ">{F(a.echec.montant)}&nbsp;F</span>
          </div>
          <div className="kv">
            <span className="k">{t('Sur')}</span>
            <span className="v ">{a.echec.moyen}</span>
          </div>
          <div className="kv">
            <span className="k">{t('Tentatives')}</span>
            <span className="v ">{tf('{n} refusée(s)', { n: a.echec.tentatives })}</span>
          </div>
          <div className="kv">
            <span className="k">{t('Ce que tu gardes')}</span>
            <span className="v ">{t('ton historique et ta cagnotte créditée')}</span>
          </div>
        </div>
        <div className="sec">
          <h2>{tf('Reprendre {p}', { p: nom })}</h2>
        </div>
        <p className="t13 c3">{tf(a.formule === 'an' ? 'Même tarif, {m} F par an, à partir d’aujourd’hui. Rien n’est dû pour la période suspendue.' : 'Même tarif, {m} F par mois, à partir d’aujourd’hui. Rien n’est dû pour la période suspendue.', { m: F(prix) })}</p>
        <PayerMomo
          montant={prix}
          texte={tf('Payer {m} F et reprendre {p}', { m: F(prix), p: nom })}
          payer={async (moyen) => {
            await source.payerAbonnement(moyen)
            recharger()
          }}
        />
        <div className="btns">
          <Link to={chemin('abonnements')} className="btn secondary">
            <span>{t('Voir les abonnements')}</span>
          </Link>
        </div>
      </Ecran>
    )
  }
  if (!a || !d.actif)
    return (
      <Ecran route="mon-abonnement" gabarit="compte">
        <Styles id="02f3dac5cd" />
        <BandeauPrime />
        <div className="card">
          <div className="empty">
            <div className="ei">
              <Icone nom="crown" taille={26} />
            </div>
            <h3>{t(a ? 'Ton abonnement est terminé' : 'Pas d’abonnement')}</h3>
            <p>{t('Tu es au palier Gratuit : livraison offerte dès 30 000 F en relais et 50 000 F à domicile.')}</p>
            <div className="btns">
              <Link to={chemin('abonnements')} className="btn primary">
                <span>{t('Voir les abonnements')}</span>
              </Link>
            </div>
          </div>
        </div>
      </Ecran>
    )
  return (
    <Ecran route="mon-abonnement" gabarit="compte">
      <VueAbonnement d={d} recharger={recharger} />
    </Ecran>
  )
}

// Le corps de « Mon abonnement » (abonnement actif), selon l'état réel de l'abonnement.
export function VueAbonnement({ d, recharger }: { d: DonneesPrime; recharger: () => void }) {
  const { t, tf, langue } = usePreferences()
  const [moyens, setMoyens] = useState<MoyenPaiement[]>([])
  const [envoi, setEnvoi] = useState(false)
  useEffect(() => {
    source.moyensPaiement().then(setMoyens)
  }, [])
  const a = d.abonnement!
  const [changer, setChanger] = useState(false)
  const [attenteMoyen, setAttenteMoyen] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const maintenant = d.maintenant
  const jour = (ms: number) => jourDe(ms, maintenant, langue)
  const nom = t(nomPalier(a.palier))
  const p = a.palier === 'pass' ? null : palier(a.palier)
  const attente = d.cagnotte.attente.reduce((n, x) => n + x.montant, 0)
  const resiliable = !a.resilie && !a.offertPar && a.palier !== 'pass'

  // Les liens du bas, communs à tous les états.
  const liens = (
    <div className="card tight">
      {p?.cagnotte ? (
        <Link to={chemin('cagnotte')} className="li">
          <span className="ic or">
            <Icone nom="piggy-bank" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('Ma cagnotte')}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {tf('{n} % de tes achats, crédités quand le vendeur est payé', { n: p.cagnotte * 100 })}
            </span>
          </span>
          <span className="chev">
            <Icone nom="chevron-right" taille={18} />
          </span>
        </Link>
      ) : null}
      <Link to={chemin('parrainage')} className="li">
        <span className="ic or">
          <Icone nom="user-plus" taille={20} />
        </span>
        <span className="grow">
          <span className="lt" style={{ display: 'block' }}>
            {t('Parrainer un proche')}
          </span>
          <span className="ls" style={{ display: 'block' }}>
            {tf('{n} mois offert par parrainage, 3 par mois au plus', { n: p?.parrainage ?? 1 })}
            {d.parrainage.moisGagnes > 0 && ' · ' + tf('{n} mois gagné(s)', { n: d.parrainage.moisGagnes })}
          </span>
        </span>
        <span className="chev">
          <Icone nom="chevron-right" taille={18} />
        </span>
      </Link>
      {a.prochain && !a.resilie && !a.echec && (
        <a href="#" role="button" aria-expanded={changer} className="li" onClick={(ev) => (ev.preventDefault(), setChanger(!changer))}>
          <span className="ic ">
            <Icone nom="smartphone" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('Moyen de paiement')}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {a.moyen}
            </span>
          </span>
          <span className="chev">
            <Icone nom={changer ? 'chevron-up' : 'chevron-right'} taille={18} />
          </span>
        </a>
      )}
      <Link to={chemin('legal')} className="li">
        <span className="ic ">
          <Icone nom="file-text" taille={20} />
        </span>
        <span className="grow">
          <span className="lt" style={{ display: 'block' }}>
            {t('Conditions de l’abonnement')}
          </span>
        </span>
        <span className="chev">
          <Icone nom="chevron-right" taille={18} />
        </span>
      </Link>
    </div>
  )
  // Le numéro des prochains prélèvements : un de ceux du compte (vérifiés), ou en ajouter un.
  const choixMoyen = (
    <div className="mt10">
      {moyens.map((m) => {
        const libelle = `${nomMoMo(m.operateur)} · ${m.numeroMasque}`
        const on = libelle === a.moyen
        return (
          <a
            key={m.id}
            href="#"
            role="radio"
            aria-checked={on}
            className={'radio' + (on ? ' on' : '')}
            onClick={async (ev) => {
              ev.preventDefault()
              if (on) return
              await source.changerMoyenAbonnement(libelle)
              setChanger(false)
              setMessage(tf('Les prochains prélèvements se feront sur {n}.', { n: libelle }))
              recharger()
            }}
          >
            <span className="rd"></span>
            <span className="grow">
              <span className="rt" style={{ display: 'block' }}>
                {t(nomMoMo(m.operateur))} · {m.numeroMasque}
              </span>
              <span className="rs" style={{ display: 'block' }}>
                {t(on ? 'Numéro des prélèvements' : 'Vérifié, utilisable pour l’abonnement')}
              </span>
            </span>
          </a>
        )
      })}
      <div className="btns">
        <Link to={chemin('moyens-paiement')} className="btn ghost">
          <Icone nom="plus" taille={18} />
          <span>{t('Ajouter un autre numéro')}</span>
        </Link>
      </div>
    </div>
  )
  const noteOk = (
    <div className="note green">
      <Icone nom="circle-check" taille={18} />
      <div>{message}</div>
    </div>
  )
  const resilier = (classe: string) =>
    resiliable && (
      <div className="btns mt16">
        <Link to={chemin('abonnement-resilier')} className={'btn ' + classe}>
          <span>{tf('Résilier {p}', { p: nom })}</span>
        </Link>
      </div>
    )

  // Prélèvement refusé (CAB-43, CAB-44) : 7 jours de grâce où tout reste actif ; payer sur le même numéro ou un
  // autre (qui sert ensuite aux prélèvements) ; résilier reste possible ; sans paiement, le palier Gratuit.
  if (a.echec && !a.resilie) {
    const e = a.echec
    const fin = finGrace(e.le)
    const restant = Math.max(0, Math.ceil((fin - maintenant) / J))
    const payer = async (moyen: string) => {
      if (envoi) return
      setEnvoi(true)
      const ab = await source.payerAbonnement(moyen)
      setEnvoi(false)
      setAttenteMoyen(null)
      setMessage(tf('Paiement reçu : {p} continue. Prochain prélèvement le {d}, sur {n}.', { p: nom, d: jour(ab.prochain!), n: ab.moyen }))
      recharger()
    }
    const autres = moyens.filter((m) => `${nomMoMo(m.operateur)} · ${m.numeroMasque}` !== e.moyen)
    return (
      <>
        <Styles id="02f3dac5cd" />
        <BandeauPrime />
        <div className="hero night">
          <div className="hk">{t('Mon abonnement')}</div>
          <div className="big cl14-ht">{tf('{p} · paiement en attente', { p: nom })}</div>
          <div className="hs">
            {t('Le prélèvement de ')}
            <b>{F(e.montant)}&nbsp;F</b>
            {tf(' du {d} n’a pas abouti.', { d: jour(e.le) })}
          </div>
        </div>
        <div className="note amber">
          <Icone nom="clock" taille={18} />
          <div>
            <b>{tf('{p} reste actif jusqu’au {d}.', { p: nom, d: jour(fin) })}</b>
            {tf(' Sans paiement, tu repasses au palier Gratuit le {d}, sans rien perdre.', { d: jour(fin + J) })}
          </div>
        </div>
        <div className="card ">
          <div className="kv">
            <span className="k">{t('Montant')}</span>
            <span className="v ">{F(e.montant)}&nbsp;F</span>
          </div>
          <div className="kv">
            <span className="k">{t('Prélèvement tenté le')}</span>
            <span className="v ">{jour(e.le)}</span>
          </div>
          <div className="kv">
            <span className="k">{t('Sur')}</span>
            <span className="v ">{e.moyen}</span>
          </div>
          <div className="kv">
            <span className="k">{t('Tentatives')}</span>
            <span className="v ">{tf('{n} refusée(s)', { n: e.tentatives })}</span>
          </div>
          <div className="kv">
            <span className="k">{t('Délai de grâce')}</span>
            <span className="v ">{restant > 1 ? tf('encore {n} jours', { n: restant }) : t('dernier jour')}</span>
          </div>
          <details className="more flat">
            <summary>
              <Icone nom="info" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
              <span className="grow">{t('Pourquoi un prélèvement est refusé')}</span>
              <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
            </summary>
            <div className="more-b">
              <p>{t('Le plus souvent : solde Mobile Money insuffisant ce jour-là, demande non validée sur le téléphone, ou numéro suspendu par l’opérateur. Rien n’a été débité.')}</p>
            </div>
          </details>
        </div>
        <div className="sec">
          <h2>{t('Pendant la grâce, tu gardes')}</h2>
        </div>
        <div className="card ">
          <ul className="cl14-bl" style={{ marginTop: '0' }}>
            {avantages(a.palier, tf).map((x) => (
              <li key={x}>
                <Icone nom="check" taille={16} trait={2.6} />
                <span>{x}</span>
              </li>
            ))}
          </ul>
          <p className="t13 c3 mt8">{tf('Dès le {d} sans paiement, ces avantages s’arrêtent : livraison au tarif normal, plus de cagnotte sur les nouveaux achats. Ta cagnotte créditée reste à toi.', { d: jour(fin + J) })}</p>
        </div>
        <div className="sec">
          <h2>{t('Payer maintenant')}</h2>
        </div>
        {attenteMoyen ? (
          <>
            <div className="card cl08-wait">
              <span className="cl08-spin"></span>
              <div className="grow">
                <b>{t('Valide la demande sur ton téléphone')}</b>
                <span className="s">{tf('{m} F · {o}', { m: F(e.montant), o: attenteMoyen })}</span>
              </div>
            </div>
            <div className="btns">
              <button type="button" className={'btn primary' + (envoi ? ' off' : '')} onClick={() => payer(attenteMoyen)}>
                <Icone nom="circle-check" taille={18} />
                <span>{t('J’ai validé sur mon téléphone')}</span>
              </button>
            </div>
            <div className="btns">
              <button type="button" className="btn secondary" onClick={() => setAttenteMoyen(null)}>
                <span>{t('Changer de numéro')}</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="btns">
              <button type="button" className="btn primary" onClick={() => setAttenteMoyen(e.moyen)}>
                <Icone nom="smartphone" taille={18} />
                <span>{tf('Payer {m} F maintenant', { m: F(e.montant) })}</span>
              </button>
            </div>
            {autres.map((m) => (
              <div key={m.id} className="btns">
                <button type="button" className="btn secondary" onClick={() => setAttenteMoyen(`${nomMoMo(m.operateur)} · ${m.numeroMasque}`)}>
                  <span>{tf('Payer avec {o} · {n}', { o: t(nomMoMo(m.operateur)), n: m.numeroMasque })}</span>
                </button>
              </div>
            ))}
            <div className="btns">
              <Link to={chemin('moyens-paiement')} className="btn ghost">
                <Icone nom="plus" taille={18} />
                <span>{t('Ajouter un autre numéro')}</span>
              </Link>
            </div>
          </>
        )}
        <div className="hint-l">
          <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{tf('Le numéro avec lequel tu paies sert aussi aux prochains prélèvements. La période payée part du {d} : tu ne perds aucun jour.', { d: jour(e.le) })}</span>
        </div>
        {liens}
        {resilier('secondary')}
        {resiliable && (
          <p className="t12 c3" style={{ textAlign: 'center' }}>
            {tf('Résilier maintenant : rien ne sera prélevé et {p} reste actif jusqu’au {d}.', { p: nom, d: jour(fin) })}
          </p>
        )}
      </>
    )
  }

  // Résilié : ce qui reste jusqu'à la fin de la période payée ; reprendre au même tarif.
  if (a.resilie && a.fin) {
    return (
      <>
        <Styles id="02f3dac5cd" />
        <BandeauPrime />
        <div className="hero night">
          <div className="hk">{t('Mon abonnement')}</div>
          <div className="big cl14-ht">{tf('{p} · résilié', { p: nom })}</div>
          <div className="hs">
            {tf('Aucun prélèvement. {p} reste actif jusqu’au ', { p: nom })}
            <b>{jour(a.fin)}</b>
            {t(', puis tu repasses au palier Gratuit.')}
          </div>
        </div>
        <div className="card ">
          {p && (
            <div className="kv">
              <span className="k">{tf('Relais offert dès {m} F', { m: F(p.relais.des) })}</span>
              <span className="v ">{tf('jusqu’au {d}', { d: jour(a.fin) })}</span>
            </div>
          )}
          {p && (
            <div className="kv">
              <span className="k">{t('Jours de garde gratuits en plus')}</span>
              <span className="v ">{tf('jusqu’au {d}', { d: jour(a.fin) })}</span>
            </div>
          )}
          {p?.cagnotte ? (
            <div className="kv">
              <span className="k">{t('Cagnotte en attente')}</span>
              <span className="v ">{tf('{m} F, gardés', { m: F(attente) })}</span>
            </div>
          ) : null}
          <div className="kv">
            <span className="k">{t('Prochain prélèvement')}</span>
            <span className="v ">{t('aucun')}</span>
          </div>
        </div>
        <div className="btns mt16">
          <button
            type="button"
            className={'btn primary' + (envoi ? ' off' : '')}
            onClick={async () => {
              if (envoi) return
              setEnvoi(true)
              await source.reprendreAbonnement()
              setEnvoi(false)
              recharger()
            }}
          >
            <Icone nom="rotate-ccw" taille={18} />
            <span>{tf('Reprendre {p}', { p: nom })}</span>
          </button>
        </div>
        <div className="hint-l">
          <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{tf(a.formule === 'an' ? 'Même tarif, sans nouvel essai : {m} F par an dès le {d}.' : 'Même tarif, sans nouvel essai : {m} F par mois dès le {d}.', { m: F(p ? (a.formule === 'an' ? p.an : p.mois) : a.montant), d: jour(a.fin) })}</span>
        </div>
        {liens}
      </>
    )
  }

  // À 3 jours du prélèvement : la notification d'annonce et le récapitulatif du renouvellement.
  if (a.prochain && !a.resilie && a.prochain - maintenant <= 3 * J) {
    return (
      <>
        <Styles id="02f3dac5cd" />
        <BandeauPrime vue={tf('Vue au {d}', { d: jour(maintenant) })} />
        <div className="lock mt12">
          <div className="push">
            <span className="pi">
              <img src={img_0718fddbf299_png} alt="" />
            </span>
            <div className="grow">
              <div className="row" style={{ gap: '6px' }}>
                <span className="pt">{tf('BelivaY · {p}', { p: nom })}</span>
                <span className="pw">{jour(a.prochain - 3 * J)}</span>
              </div>
              <div className="pb">{tf('{p} se renouvelle le {d} : {m} F seront prélevés sur {n}. Tu peux résilier en un tap.', { p: nom, d: jour(a.prochain), m: F(a.montant), n: a.moyen })}</div>
            </div>
          </div>
        </div>
        <div className="card vedette">
          <div className="kick">{t('Mon abonnement')}</div>
          <div className="cl14-st">{tf('{p} · actif', { p: nom })}</div>
          <div className="hr"></div>
          <div className="kv">
            <span className="k">{t('Renouvellement')}</span>
            <span className="v ">{jour(a.prochain)}</span>
          </div>
          <div className="kv">
            <span className="k">{t('Montant')}</span>
            <span className="v ">{F(a.montant)}&nbsp;F</span>
          </div>
          <div className="kv">
            <span className="k">{t('Sur')}</span>
            <span className="v ">{a.moyen}</span>
          </div>
          <div className="btns mt12">
            <button type="button" className="btn secondary" aria-expanded={changer} onClick={() => setChanger(!changer)}>
              <Icone nom="smartphone" taille={18} />
              <span>{t('Changer de numéro MoMo')}</span>
            </button>
          </div>
          {changer && choixMoyen}
        </div>
        {message && noteOk}
        {liens}
        {resilier('danger')}
      </>
    )
  }

  // Actif (VAGUE n° 14, consigne du porteur : plus simple) : la carte du haut et « Changer de palier », un seul bloc
  // « Ce mois-ci » (économies calculées sur les commandes du mois, quotas en jauges), la liste courte, « Résilier ».
  const finMois = Date.UTC(new Date(maintenant + 36e5).getUTCFullYear(), new Date(maintenant + 36e5).getUTCMonth() + 1, 1) - 36e5
  const prixPalier = p ? (a.formule === 'an' ? p.an : p.mois) : a.montant
  const g = d.gainsMois ?? null
  const jauges: { libelle: string; n: number; sur: number }[] = a.palier === 'pass'
    ? [{ libelle: t('Relais offerts'), n: d.usage.relais, sur: PASS.commandes }]
    : p
      ? [
          ...(p.relais.offerts !== null ? [{ libelle: t('Relais offerts'), n: d.usage.relais, sur: p.relais.offerts }] : []),
          ...(p.domicile.offerts ? [{ libelle: t('Domicile offert'), n: d.usage.domicile, sur: p.domicile.offerts }] : []),
          { libelle: t('Commandes du mois'), n: d.usage.total, sur: p.plafond },
        ].slice(0, 3)
      : []
  return (
    <>
      <Styles id="02f3dac5cd" />
      <BandeauPrime />
      <Bloc classe="g5-duo">
      <Bloc classe="g5-g">
      <div className="hero night ab-tete">
        <div className="hk">{t('Mon abonnement')}</div>
        <div className="big cl14-ht">{tf('{p} · actif', { p: nom })}</div>
        {!a.offertPar && a.palier !== 'pass' && (
          <div className="ab-prix">
            {F(prixPalier)}&nbsp;F <small>{t(a.formule === 'an' ? 'par an' : 'par mois')}</small>
          </div>
        )}
        {a.offertPar ? (
          <div className="hs">{tf('Offert par {p}, jusqu’au {d}. Aucun prélèvement : il s’arrête tout seul.', { p: a.offertPar, d: jour(a.fin!) })}</div>
        ) : a.palier === 'pass' ? (
          <div className="hs">{tf('Valable jusqu’au {d}. Aucun prélèvement : il s’arrête tout seul.', { d: jour(a.fin!) })}</div>
        ) : (
          <div className="hs">
            {t('Prochain prélèvement : ')}
            <b>{F(a.montant)}&nbsp;F</b>
            {t(' le ')}
            <b>{jour(a.prochain!)}</b>
            {tf(', sur {n}.', { n: a.moyen })}
          </div>
        )}
      </div>
      {/* Juste sous la carte du haut, visible sans défiler : le geste le plus en vue de la page (consigne du porteur). */}
      <Link to={chemin('abonnements')} className="btn primary ab-changer">
        <Icone nom="repeat" taille={19} />
        <span>{t('Changer de palier')}</span>
      </Link>
      {message && noteOk}
      {a.offertPar && a.messageCadeau && (
        <div className="note ink">
          <Icone nom="gift" taille={18} />
          <div>
            « {a.messageCadeau} » <b>— {a.offertPar}</b>
          </div>
        </div>
      )}
      <section className="card ab-mois" aria-labelledby="ab-mois-t">
        <div className="ab-mois-h">
          <h2 id="ab-mois-t">{t('Ce mois-ci')}</h2>
          <span className="t13 c3">{tf('jusqu’au {d}', { d: jour(finMois - J) })}</span>
        </div>
        {g && g.total > 0 ? (
          <>
            <div className="ab-eco" data-economies={g.total}>
              <b>{F(g.total)}&nbsp;F</b> {t('économisés')}
            </div>
            <div className="t13 c3">
              {[tf(g.commandes > 1 ? '{n} commandes' : '{n} commande', { n: g.commandes }), g.livraison > 0 ? tf('{m} F de livraison', { m: F(g.livraison) }) : null, g.cagnotte > 0 ? tf('{m} F de cagnotte', { m: F(g.cagnotte) }) : null].filter(Boolean).join(' · ')}
            </div>
          </>
        ) : (
          <div className="t14 c2">{tf('Pas encore de commande avec {p} ce mois-ci : ta première livraison au relais est offerte dès {m} F.', { p: nom, m: F(p?.relais.des ?? PASS.relaisDes) })}</div>
        )}
        <div className="ab-jauges">
          {jauges.map((j) => (
            <div key={j.libelle} className="ab-j" data-jauge={j.libelle}>
              <div className="ab-j-t">
                <span>{j.libelle}</span>
                <b>{tf('{n} / {q}', { n: j.n, q: j.sur })}</b>
              </div>
              <i role="progressbar" aria-label={j.libelle} aria-valuenow={j.n} aria-valuemin={0} aria-valuemax={j.sur}>
                <b style={{ width: Math.min(100, Math.round((j.n / j.sur) * 100)) + '%' }} />
              </i>
            </div>
          ))}
        </div>
      </section>
      </Bloc>
      <Bloc classe="g5-d" etiquette={t('Gérer mon abonnement')}>
      {liens}
      {changer && <div className="card ">{choixMoyen}</div>}
      {resilier('secondary ab-resilier')}
      </Bloc>
      </Bloc>
    </>
  )
}
