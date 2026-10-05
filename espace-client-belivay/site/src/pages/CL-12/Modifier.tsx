// Écran « Modifier ma commande » (CL-12), forme d'origine du prototype rendue réelle (DP-54) : pour une commande
// (?ref=…), trois onglets (?onglet=) :
// - annuler (par défaut) : boutique par boutique, ce que l'on récupère (écran « Annuler », mêmes montants), et les
//   autres changements possibles (lieu, faire retirer par quelqu'un, payer de l'étranger) ;
// - relais : la livraison prévue (adresse ou relais), « livrer ailleurs », les boutiques et ce qui a été payé ;
// - etranger : une commande payée ne change plus de payeur ; payée par un proche : ce qui en découle ; pour la
//   prochaine commande, les quatre étapes, la limite de la carte au regard du panier, l'envoi du panier.
// La quantité ne change pas après le paiement.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { source, type CommandeClient } from '../../donnees/source'
import { F } from '../../i18n/format'
import { dateA } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { CommandeIntrouvable } from '../CL-08/Confirmee'
import { Annuler } from './Annuler'
import { annulable, Boutique, DetailPaye, enTournee, LivraisonPrevue, Onglets, Retour } from './Commun'
import { PLAFOND_CARTE } from './Diaspora'

const ETAPES: [string, string][] = [
  ['Tu envoies ton panier à un proche', 'Avec le partage de ton téléphone : WhatsApp, SMS ou e-mail.'],
  ['Il paie par carte Visa ou Mastercard', '3-D Secure ; 2 % de frais de service, affichés avant de payer.'],
  ['Le colis vient à ton relais', 'Ton code de retrait arrive chez toi, jamais chez lui.'],
  ['Il reçoit la preuve de ton retrait', 'Par notification, sinon par e-mail.'],
]

export function Modifier() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const ref = params.get('ref') ?? 'BLV-52107'
  const onglet = params.get('onglet')
  const [c, setC] = useState<CommandeClient | null | undefined>(undefined)
  const [payePar, setPayePar] = useState<string | null>(null)
  const [panier, setPanier] = useState(0)
  useEffect(() => {
    source.commandeClient(ref).then((d) => {
      setC(d?.commande ?? null)
      const x = d?.commande.colis.find((y) => !y.annule)
      if (x) source.apercuAnnulation(ref, x.n).then((a) => setPayePar(a?.payePar ?? null))
    })
    source.panier().then((p) => setPanier(p.lignes.reduce((s, l) => s + l.prix * l.qte, 0)))
  }, [ref])
  if (c === undefined) return null
  if (!c) return <CommandeIntrouvable route="modifier" />
  const nb = c.colis.filter((x) => !x.annule).length
  const nbAnnulables = c.colis.filter((x) => annulable(c, x)).length
  const lieuLibre = (c.etat === 'preparation' || c.etat === 'paiement' || c.etat === 'retirable' || c.etat === 'comptoir') && !enTournee(c)

  if (onglet === 'etranger')
    return (
      <Ecran route="modifier" sousTitre={c.ref}>
        <Onglets c={c} actif="etranger" />
        <div className="pg">
          <h1 className="pg-t">{t('Payer de l’étranger')}</h1>
          <p className="pg-s">
            <span className="nw">{c.payeur ? tf('{ref} · {n} colis.', { ref: c.ref, n: nb }) : tf('{ref}.', { ref: c.ref })}</span>
            {t(c.payeur ? ' Quelqu’un a payé pour toi : tu retires ton colis comme d’habitude.' : ' Quelqu’un paie pour toi ? Envoie-lui ton panier, il le règle depuis l’étranger.')}
          </p>
        </div>
        {c.payeur ? (
          <>
            <div className="card or">
              <div className="row">
                <span className="ic-sq green">
                  <Icone nom="gift" taille={22} />
                </span>
                <div className="grow">
                  <div className="b8 t15">{tf('Payée par {p}, depuis l’étranger', { p: c.payeur.prenom })}</div>
                  <div className="t13 c3 mt4">{tf('Par carte {c}, le {d}. Tout est réglé.', { c: c.payeur.carte, d: dateA(c.payeur.le, langue) })}</div>
                </div>
              </div>
            </div>
            <div className="card tight">
              <div className="li">
                <span className="ic or">
                  <Icone nom="key-round" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ display: 'block' }}>
                    {t('Ton code de retrait est pour toi seule')}
                  </span>
                  <span className="ls" style={{ display: 'block' }}>
                    {tf('{p} ne le reçoit jamais.', { p: c.payeur.prenom })}
                  </span>
                </span>
              </div>
              <div className="li">
                <span className="ic ">
                  <Icone nom="bell" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ display: 'block' }}>
                    {tf('{p} est prévenu', { p: c.payeur.prenom })}
                  </span>
                  <span className="ls" style={{ display: 'block' }}>
                    {t('Du paiement, d’un incident éventuel, puis de ton retrait.')}
                  </span>
                </span>
              </div>
              <div className="li">
                <span className="ic ">
                  <Icone nom="clock" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ display: 'block' }}>
                    {t('Rien à payer au retrait')}
                  </span>
                  <span className="ls" style={{ display: 'block' }}>
                    {t('Sauf des frais de garde si tu laisses le colis plus d’un jour au relais.')}
                  </span>
                </span>
              </div>
            </div>
            <div className="card cl12-box green">
              <div className="bt">{t('Un remboursement va sur sa carte')}</div>
              <p>{t('Jamais sur ton Mobile Money.')}</p>
            </div>
            <div className="btns mt16">
              <Link to={chemin('commandes')} className="btn primary">
                <span>{t('Voir mes commandes')}</span>
              </Link>
            </div>
            <p className="cl12-fn">{c.pretLe ? tf('Retrait possible dès le {d} au {r}.', { d: dateA(c.pretLe, langue), r: t(c.lieu) }) : tf('Retrait au {r}.', { r: t(c.lieu) })}</p>
          </>
        ) : (
          <>
            <div className="card">
              <div className="row">
                <span className="ic-sq green">
                  <Icone nom="circle-check" taille={22} />
                </span>
                <div className="grow">
                  <div className="b8 t15">{t('Cette commande est déjà payée')}</div>
                  <div className="t13 c3 mt4">
                    {payePar ? (
                      <>
                        {t('Par toi, avec ')}
                        <span className="nw">{payePar}</span>
                        {tf(', le {d}.', { d: dateA(c.payeeLe, langue) })}
                      </>
                    ) : (
                      tf('Par toi, le {d}. Une commande payée ne change pas de payeur.', { d: dateA(c.payeeLe, langue) })
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="cl12-ck">{t('Pour ta prochaine commande')}</div>
              {ETAPES.map(([a, b], i) => (
                <div key={a} className="row" style={{ alignItems: 'flex-start', padding: '12px 0 0' }}>
                  <span className="cl12-num">{i + 1}</span>
                  <div className="grow">
                    <div className="b8 t14">{t(a)}</div>
                    <div className="t13 c3 mt4" style={{ lineHeight: '1.4' }}>
                      {t(b)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {panier > PLAFOND_CARTE && (
              <div className="card cl12-box amber">
                <div className="ib">
                  <Icone nom="credit-card" taille={18} />
                  <div className="grow">
                    <p>
                      {t('Ton panier fait ')}
                      <b>{F(panier)}&nbsp;F</b>
                      {tf('. Par carte, c’est {m} F au plus par paiement, frais compris : ton proche le paiera en plusieurs commandes.', { m: F(PLAFOND_CARTE) })}
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="card cl12-box green">
              <div className="bt">{t('Il sera remboursé, pas toi')}</div>
              <p>{t('Un remboursement éventuel revient sur sa carte, pas sur ton Mobile Money.')}</p>
            </div>
            <div className="btns mt16">
              <Link to={chemin('diaspora')} className="btn primary">
                <Icone nom="share" taille={18} />
                <span>{t('Envoyer mon panier à un proche')}</span>
              </Link>
            </div>
            <p className="cl12-fn">{t('Il n’a besoin ni de ton adresse ni de ton numéro.')}</p>
          </>
        )}
        <Retour c={c} />
      </Ecran>
    )

  if (onglet === 'relais')
    return (
      <Ecran route="modifier" sousTitre={c.ref}>
        <Onglets c={c} actif="lieu" />
        <div className="pg">
          <h1 className="pg-t">{t(c.mode === 'relais' ? 'Changer de relais' : 'Changer d’adresse')}</h1>
          <p className="pg-s">
            <span className="nw">{tf(c.mode === 'relais' ? '{ref} · retrait au relais.' : '{ref} · livraison à domicile.', { ref: c.ref })}</span>
            {lieuLibre
              ? t(c.colis.some((x) => x.arrive) ? ' Colis déjà arrivés : le transfert coûte 400 F par colis.' : ' Gratuit tant que le livreur n’a pas récupéré ton colis.')
              : t(' Impossible pendant la tournée ou après le retrait.')}
          </p>
        </div>
        <LivraisonPrevue nom={c.lieu} quand={c.arriveeLe ? tf('Vers le {d}', { d: dateA(c.arriveeLe, langue) }) : null}>
          <div className="btns">
            <Link to={chemin(c.mode === 'relais' ? 'changer-relais' : 'changer-adresse', { ref: c.ref })} className="btn secondary">
              <Icone nom="map-pin" taille={18} />
              <span>{t(c.mode === 'relais' ? 'Choisir un autre relais' : 'Livrer ailleurs')}</span>
            </Link>
          </div>
        </LivraisonPrevue>
        {c.colis.map((x, i) => (
          <Boutique key={x.n} x={x} i={i}>
            {i === c.colis.length - 1 && <DetailPaye c={c} />}
          </Boutique>
        ))}
        <Retour c={c} />
      </Ecran>
    )

  // Onglet « Annuler » (par défaut) : l'écran d'annulation, avec son en-tête et les autres changements.
  const ligne = (vers: string, icone: string, titre: string, sous: string, actif: boolean) => (
    <Link to={vers} className="li" aria-disabled={!actif} style={actif ? undefined : { opacity: 0.6 }}>
      <span className="ic">
        <Icone nom={icone} taille={20} />
      </span>
      <span className="grow">
        <span className="lt" style={{ display: 'block' }}>
          {t(titre)}
        </span>
        <span className="ls" style={{ display: 'block' }}>
          {sous}
        </span>
      </span>
      <span className="chev">
        <Icone nom="chevron-right" taille={18} />
      </span>
    </Link>
  )
  return (
    <Annuler
      route="modifier"
      intro={
        <div className="pg">
          <h1 className="pg-t">{t('Annuler ma commande')}</h1>
          <p className="pg-s">
            <span className="nw">{tf('{ref} · {n} boutique(s).', { ref: c.ref, n: nb })}</span>
            {t(nbAnnulables ? ' Tu peux annuler boutique par boutique — le reste de ta commande continue.' : ' Plus rien à annuler : les colis sont partis ou retirés.')}
          </p>
        </div>
      }
      suite={
        <>
          <div className="cl12-lh">{t('Autres changements')}</div>
          <div className="card tight">
            {ligne(
              chemin(c.mode === 'relais' ? 'changer-relais' : 'changer-adresse', { ref: c.ref }),
              'map-pin',
              c.mode === 'relais' ? 'Changer de relais' : 'Changer d’adresse',
              lieuLibre ? t(c.colis.some((x) => x.arrive) ? 'Transfert : 400 F par colis' : 'Gratuit tant que rien n’est collecté') : t('Impossible pendant la tournée ou après le retrait'),
              lieuLibre,
            )}
            {ligne(chemin('code-partage', { ref: c.ref }), 'user-plus', 'Faire retirer par quelqu’un', t('Il reçoit son propre code par SMS'), c.etat !== 'retiree' && c.etat !== 'annulee')}
            {ligne(chemin('modifier', { ref: c.ref, onglet: 'etranger' }), 'globe', 'Payer de l’étranger', t('Pour ta prochaine commande'), true)}
          </div>
        </>
      }
    />
  )
}
