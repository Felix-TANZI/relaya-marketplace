// Écran « Payer au comptoir » (CL-09), forme d'origine du prototype rendue réelle (DP-54) : le montant dû au retrait
// de la commande (?ref=…) : reste d'une commande validée (articles, livraison déjà payée) et frais de garde du jour,
// le même que sur l'écran du gérant ; payé en Mobile Money sur le téléphone (numéro choisi) : demande envoyée et
// étapes, renvoyer la demande, demande expirée (rien n'est débité : réessayer ou changer de moyen), paiement
// confirmé (code débloqué) ; rien à payer ; hors ligne, la demande ne peut pas partir. Jamais d'espèces.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { nomMoMo } from '../../donnees/numeros'
import { source, type CommandeClient, type MoyenPaiement } from '../../donnees/source'
import { F } from '../../i18n/format'
import { jourSeul, quand } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { CommandeIntrouvable } from '../CL-08/Confirmee'
import { distance, echeancier, GARDE_GROS_AJOUT, grosColis, minutesAPied, ouvertureDuJour, RENVOI_GARDE, useEnLigne, useRelais } from './Commun'

const DEMANDE_MIN = 15 // une demande Mobile Money expire sans validation

export function ComptoirPayer() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const ref = params.get('ref') ?? 'BLV-51940'
  const [d, setD] = useState<{ commande: CommandeClient; maintenant: number } | null | undefined>(undefined)
  const [moyens, setMoyens] = useState<MoyenPaiement[]>([])
  const [moyen, setMoyen] = useState<string | null>(null)
  const [etape, setEtape] = useState<'choix' | 'attente' | 'paye' | 'echec'>('choix')
  const [envoi, setEnvoi] = useState(0) // heure de la demande
  const [paye, setPaye] = useState<{ m: number; le: number } | null>(null)
  const [renvoye, setRenvoye] = useState(false)
  const enLigne = useEnLigne()
  const relais = useRelais(d?.commande.lieu)
  useEffect(() => {
    source.commandeClient(ref).then(setD)
    source.moyensPaiement().then((m) => (setMoyens(m), setMoyen((m.find((x) => x.parDefaut) ?? m[0])?.id ?? null)))
  }, [ref])
  // Demande expirée : le code secret n'a pas été saisi à temps.
  useEffect(() => {
    if (etape !== 'attente') return
    const x = setTimeout(() => setEtape('echec'), Math.max(0, envoi + DEMANDE_MIN * 60e3 - Date.now()))
    return () => clearTimeout(x)
  }, [etape, envoi])
  if (d === undefined) return null
  if (!d) return <CommandeIntrouvable route="comptoir-payer" />
  const c = d.commande
  const n = c.colis.filter((x) => !x.annule).length
  const gerant = relais ? t(relais.gerant) : t('le gérant')
  const resteCommande = c.comptoir?.du ?? 0
  const garde = c.garde?.du ?? 0
  const du = resteCommande + garde
  const m = moyens.find((x) => x.id === moyen)
  const momo = m ? `${t(nomMoMo(m.operateur))} ${m.numeroMasque}` : t('Mobile Money')
  const gros = grosColis(c)
  const ech = c.garde && relais ? echeancier(c, d.maintenant, relais.ferme) : null
  const demander = () => {
    if (!m || !enLigne) return
    setEnvoi(Date.now())
    setRenvoye(false)
    setEtape('attente')
  }
  const surTelephone = (
    <div className="hint-l">
      <Icone nom="shield-check" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
      <span>{tf('Tu paies sur ton téléphone, en Mobile Money. {g} ne touche aucun argent et ne saisit aucun montant.', { g: gerant })}</span>
    </div>
  )

  if (etape === 'paye' && paye)
    return (
      <Ecran route="comptoir-payer" sousTitre={c.ref}>
        <div className="cl09">
          <div className="hero green">
            <div className="hk">{t('Paiement confirmé')}</div>
            <div className="big">
              {F(paye.m)}
              <small>{t('F')}</small>
            </div>
            <div className="hs">{tf('{p} · {q}', { p: momo, q: quand(paye.le, paye.le, langue) })}</div>
          </div>
          <div className="note green">
            <Icone nom="lock-open" taille={18} />
            <div>
              <b>{t('Ton code de retrait est débloqué : montre-le au gérant.')}</b>
              {tf(' {g} sort ton colis et prend la photo de remise.', { g: gerant })}
            </div>
          </div>
          <div className="btns">
            <Link to={chemin('code', { ref: c.ref })} className="btn primary">
              <Icone nom="qr-code" taille={18} />
              <span>{t('Afficher mon code')}</span>
            </Link>
          </div>
          <div className="links">
            <Link to={chemin('commande', { ref: c.ref })}>{t('Le paiement figure dans ta commande')}</Link>
          </div>
        </div>
      </Ecran>
    )

  if (etape === 'echec')
    return (
      <Ecran route="comptoir-payer" sousTitre={c.ref}>
        <div className="cl09">
          <div className="hero red">
            <div className="hk">{t('Paiement non abouti')}</div>
            <div className="cl09-big">{t('Aucun montant n’a été débité')}</div>
            <div className="hs">{t('La demande a expiré : le code secret n’a pas été saisi à temps.')}</div>
          </div>
          <div className="btns">
            <button type="button" className={'btn primary' + (enLigne ? '' : ' off')} onClick={demander}>
              <Icone nom="rotate-cw-sm" taille={18} />
              <span>{t('Réessayer le paiement')}</span>
            </button>
          </div>
          <div className="btns">
            <button type="button" className="btn secondary" onClick={() => setEtape('choix')}>
              <Icone nom="wallet" taille={18} />
              <span>{t('Changer de moyen de paiement')}</span>
            </button>
          </div>
          <div className="note ink">
            <Icone nom="package" taille={18} />
            <div>{t('Ton colis reste au relais. Ton code se débloque dès que le paiement passe.')}</div>
          </div>
          {surTelephone}
        </div>
      </Ecran>
    )

  if (etape === 'attente' && m)
    return (
      <Ecran route="comptoir-payer" sousTitre={c.ref}>
        <div className="cl09">
          <div className="hero night">
            <div className="row">
              <span className="ico-b">
                <Icone nom="smartphone" taille={22} />
              </span>
              <span className="hk">{t(renvoye ? 'Demande renvoyée' : 'Demande envoyée')}</span>
            </div>
            <div className="big">
              {F(du)}
              <small>{t('F')}</small>
            </div>
            <div className="hs">{tf('Valide la demande sur ton téléphone avec ton code secret {o} ({n}).', { o: t(nomMoMo(m.operateur)), n: m.numeroMasque })}</div>
          </div>
          <div className="card">
            <div className="cl09-step">
              <span className="k">{'1'}</span>
              <div className="grow">
                <div className="t">{tf('Une fenêtre {o} s’ouvre sur ton téléphone', { o: t(nomMoMo(m.operateur)) })}</div>
              </div>
            </div>
            <div className="cl09-step">
              <span className="k">{'2'}</span>
              <div className="grow">
                <div className="t">{t('Tape ton code secret')}</div>
                <div className="s">{t(m.operateur === 'MTN' ? 'Rien ne s’affiche ? Compose *126# et suis les instructions.' : 'Rien ne s’affiche ? Compose #150# et suis les instructions.')}</div>
              </div>
            </div>
            <div className="cl09-step">
              <span className="k">{'3'}</span>
              <div className="grow">
                <div className="t">{resteCommande > 0 ? t('Ton code de retrait s’affiche ici') : tf('{g} te remet tes colis', { g: gerant })}</div>
              </div>
            </div>
          </div>
          <div className="btns mt16">
            <button
              type="button"
              className="btn primary"
              onClick={() =>
                source.payerAuComptoir(c.ref).then(() => {
                  setPaye({ m: du, le: Date.now() })
                  setEtape('paye')
                })
              }
            >
              <Icone nom="circle-check" taille={18} />
              <span>{t('J’ai validé sur mon téléphone')}</span>
            </button>
          </div>
          <div className="card tight">
            <button type="button" className="li" onClick={() => (setEnvoi(Date.now()), setRenvoye(true))} style={{ width: '100%', textAlign: 'left', background: 'none', border: 0, font: 'inherit', color: 'inherit' }}>
              <span className="ic ">
                <Icone nom="refresh-cw" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ display: 'block' }}>
                  {t('Rien reçu ? Renvoyer la demande')}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </button>
            <button type="button" className="li" onClick={() => setEtape('choix')} style={{ width: '100%', textAlign: 'left', background: 'none', border: 0, font: 'inherit', color: 'inherit' }}>
              <span className="ic ">
                <Icone nom="wallet" taille={20} />
              </span>
              <span className="grow lt">{t('Changer de numéro')}</span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </button>
          </div>
          <div className="hint-l">
            <Icone nom="store" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{tf('{g} voit « en attente » sur son écran, puis « payé » dès la confirmation.', { g: gerant })}</span>
          </div>
        </div>
      </Ecran>
    )

  // Rien à payer : tout est réglé (garde gratuite aujourd'hui).
  if (!du)
    return (
      <Ecran route="comptoir-payer" sousTitre={c.ref}>
        <div className="cl09">
          <div className="hero green">
            <div className="hk">{t('Montant dû')}</div>
            <div className="big">
              {'0'}
              <small>{t('F')}</small>
            </div>
            <div className="hs">
              {c.garde
                ? tf('Rien à payer : tes {n} colis sont au relais. Gratuit aujourd’hui, {m} F dès demain.', { n, m: F(c.garde.demain) })
                : t('Rien à payer : tout est réglé. Montre ton code au gérant.')}
            </div>
          </div>
          <div className="btns">
            <Link to={chemin('code', { ref: c.ref })} className="btn primary">
              <Icone nom="qr-code" taille={18} />
              <span>{t('Afficher mon code')}</span>
            </Link>
          </div>
          {relais && (
            <div className="card tight">
              <div className="li">
                <span className="portrait" style={{ width: '40px', height: '40px' }}>
                  <Dessin id="02814f9138ce" />
                </span>
                <span className="grow">
                  <span className="lt" style={{ display: 'block' }}>
                    {tf('{l} · {g}', { l: t(c.lieu), g: t(relais.gerant) })}
                  </span>
                  <span className="ls" style={{ display: 'block' }}>
                    {(() => {
                      const o = ouvertureDuJour(relais, d.maintenant)
                      return tf(o.texte, o.v) + ' · ' + tf('{m} min à pied ({d})', { m: minutesAPied(relais.km), d: distance(relais.km) })
                    })()}
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>
      </Ecran>
    )

  return (
    <Ecran route="comptoir-payer" sousTitre={c.ref}>
      <div className="cl09">
        {!enLigne && (
          <div className="offline-banner">
            <Icone nom="wifi-off" taille={18} />
            <span>{t('Hors ligne · le paiement a besoin du réseau')}</span>
          </div>
        )}
        <div className="hero night">
          <div className="hk">{t('Montant dû')}</div>
          <div className="big">
            {F(du)}
            <small>{t('F')}</small>
          </div>
          <div className="hs">
            {resteCommande > 0
              ? tf('Le reste de ta commande validée. Même montant sur l’écran de {g}.', { g: gerant })
              : tf('Frais de garde de tes {n} colis, calculés par BelivaY. Même montant sur l’écran de {g}.', { n, g: gerant })}
          </div>
        </div>
        {enLigne && (
          <>
            <div className="card ">
              <div className="recap cl09-kv3">
                {resteCommande > 0 &&
                  c.colis
                    .filter((x) => !x.annule)
                    .map((x) => (
                      <div key={x.n} className="kv">
                        <span className="k">{t(x.produit)}</span>
                        <span className="v ">{F(x.prix * x.qte)}&nbsp;F</span>
                      </div>
                    ))}
                {c.garde && (
                  <div className="kv">
                    <span className="k">{resteCommande > 0 ? (c.garde.jour === 1 ? t('Frais de garde · arrivée aujourd’hui') : tf('Frais de garde · jour {j}', { j: c.garde.jour })) : tf('Frais de garde · {n} colis', { n })}</span>
                    <span className="v ">{garde ? F(garde) + ' F' : <span className="free">{t('gratuit')}</span>}</span>
                  </div>
                )}
                {c.garde && gros && <div className="t12 c3">{tf('Gros colis : + {m} F par jour de garde.', { m: F(GARDE_GROS_AJOUT) })}</div>}
                {!resteCommande && (
                  <div className="kv">
                    <span className="k">{t('Reste de commande')}</span>
                    <span className="v ">{'0 F'}</span>
                  </div>
                )}
              </div>
              {c.comptoir && <div className="t12 c3 mt8">{tf('Livraison déjà payée : {m} F, le {d}.', { m: F(c.comptoir.livraisonPayee), d: jourSeul(c.payeeLe, langue) })}</div>}
              {c.garde && (
                <Link to={chemin('garde', { ref: c.ref })} className="cl09-link mt4">
                  {t('Voir le détail jour par jour')}
                  <Icone nom="chevron-right" taille={15} />
                </Link>
              )}
            </div>
            <div className="sec">
              <h2>{t('Payer avec')}</h2>
            </div>
            {!moyens.length && (
              <div className="note or">
                <Icone nom="wallet" taille={18} />
                <div>
                  {t('Aucun numéro Mobile Money enregistré.')} <Link to={chemin('moyens-paiement')}>{t('Ajouter un numéro')}</Link>
                </div>
              </div>
            )}
            {moyens.map((x) => (
              <a
                key={x.id}
                href={chemin('comptoir-payer', { ref: c.ref })}
                className={'radio' + (moyen === x.id ? ' on' : '')}
                role="radio"
                aria-checked={moyen === x.id}
                onClick={(e) => {
                  e.preventDefault()
                  setMoyen(x.id)
                }}
              >
                <span className="rd"></span>
                <span className="grow">
                  <span className="rt" style={{ display: 'block' }}>
                    {t(nomMoMo(x.operateur))}
                  </span>
                  <span className="rs" style={{ display: 'block' }}>
                    {x.duCompte ? tf('{n} · numéro vérifié', { n: x.numeroMasque }) : x.numeroMasque}
                  </span>
                </span>
              </a>
            ))}
          </>
        )}
        <div className="btns mt14">
          <button type="button" className={'btn primary' + (m && enLigne ? '' : ' off') + (enLigne ? '' : ' cl09-off')} disabled={!enLigne} onClick={demander}>
            <Icone nom="smartphone" taille={18} />
            <span>{tf('Payer {m} F', { m: F(du) })}</span>
          </button>
        </div>
        {!enLigne ? (
          <>
            <div className="note red">
              <Icone nom="wifi-off" taille={18} />
              <div>{t('Sans réseau, la demande MoMo ne peut pas partir. Ton code reste lisible, mais le colis n’est remis qu’une fois le montant dû payé. Aucune espèce n’est acceptée.')}</div>
            </div>
            <div className="links">
              <a
                href={chemin('comptoir-payer', { ref: c.ref })}
                onClick={(e) => {
                  e.preventDefault()
                  window.location.reload()
                }}
              >
                {t('Réessayer')}
              </a>
              <Link to={chemin('code', { ref: c.ref })}>{t('Voir mon code')}</Link>
            </div>
          </>
        ) : (
          <>
            <div className="hint-l">
              <Icone nom={resteCommande > 0 ? 'lock-open' : 'calendar-clock'} taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
              <span>{t(resteCommande > 0 ? 'Ton code de retrait s’affiche dès que le paiement est confirmé.' : 'Le montant est celui du jour : paie au moment du retrait.')}</span>
            </div>
            {surTelephone}
            {c.delegue && (
              <div className="hint-l">
                <Icone nom="user-check" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
                <span>{tf('{p} retire pour toi : la demande de paiement arrive sur ton téléphone pendant qu’il est au comptoir.', { p: c.delegue.prenom })}</span>
              </div>
            )}
            {ech && (
              <div className="hint-l">
                <Icone nom="undo-2" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
                <span>{tf('Pas retiré avant {d} au soir ? Tes colis repartent chez le vendeur : garde et {r} F de renvoi retenus, jamais plus que ce que tu as payé.', { d: jourSeul(ech.dernier.le, langue), r: F(RENVOI_GARDE) })}</span>
              </div>
            )}
          </>
        )}
      </div>
    </Ecran>
  )
}
