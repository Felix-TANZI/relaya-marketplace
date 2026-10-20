// Écran « Panier de la liste » (CL-15 ; EX-01), forme d'origine du prototype rendue réelle (DP-54) : la liste choisie
// (?l=…&exclus=…&eq=…) en un colis par boutique (vendeur, zone, délai, palier, articles, sous-total) ; le
// récapitulatif selon le moteur (ramassages, même zone −24 %, remises au relais, ce qui est offert dès 30 000 F,
// l'économie) ; toute la liste arrive ensemble (un seul message, un seul code ; les colis arrivés attendent,
// gratuitement, 21 jours au plus) ; passer commande en Mobile Money (argent bloqué jusqu'au retrait) ; pas de
// paiement au comptoir pour une liste groupée ; l'autre choix : mettre toute la liste de côté (acompte, versements
// dont le dernier tombe avant la rentrée).
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState, type CSSProperties } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Aside, Colonne } from '../../composants/Gabarits'
import { Icone } from '../../composants/Icone'
import { PayerMomo } from '../../composants/PayerMomo'
import { Styles } from '../../composants/Styles'
import { chemin } from '../../config/pages'
import { source, type DonneesPanier } from '../../donnees/source'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'
import { calculListe, MettreListeDeCote, useRentree } from './Commun'
import { EtapesRentree, FfRentree } from './Rentree'
import { VignetteRentree } from './RentreeListe'

const COULEURS = ['var(--or)', 'var(--amber)', 'var(--ink-3)', 'var(--green)']
// Le palier écrit du vendeur → la classe de son badge.
const classeTier = (p: string) => (/\bOr\b/.test(p) ? 'orm' : /Argent/.test(p) ? 'argent' : /Bronze/.test(p) ? 'bronze' : '')

export function RentreePanier() {
  const { t, tf } = usePreferences()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const [d] = useRentree()
  const [boutiques, setBoutiques] = useState<DonneesPanier['boutiques']>({})
  useEffect(() => {
    source.panier().then((p) => setBoutiques(p.boutiques))
  }, [])
  if (!d) return null
  const l = d.listes.find((x) => x.id === params.get('l'))
  if (!l)
    return (
      <Ecran route="rentree-panier">
        <Styles id="ddcb0e469a" />
        <div className="card mt12">
          <div className="empty">
            <h3>{t('Choisis d’abord une liste')}</h3>
            <div className="btns">
              <Link to={chemin('rentree')} className="btn primary">
                <span>{t('Trouver la liste de mon école')}</span>
              </Link>
            </div>
          </div>
        </div>
      </Ecran>
    )
  const exclus = params.get('exclus')?.split(',').filter(Boolean) ?? []
  const eq = params.get('eq')?.split(',').filter(Boolean) ?? []
  const c = calculListe(l, exclus, eq)
  const ecole = d.ecoles.find((x) => x.id === l.ecole)
  const zone0 = c.pris[0]?.zone
  // Ce qui est offert (dès 30 000 F) se lit ligne par ligne : ramassage, puis remise, colis après colis.
  let reste = c.frais.offert
  const lignes = c.boutiques.flatMap((b, i) => {
    const r = c.frais.ramassages.find((x) => x.boutique === b)
    const m = c.frais.remises.find((x) => x.boutique === b)
    return [
      r && { cle: 'r' + b, i, type: 'ramassage' as const, boutique: b, montant: r.montant, partage: r.partage },
      m && { cle: 'm' + b, i, type: 'remise' as const, boutique: b, montant: m.montant, partage: false },
    ].filter((x): x is NonNullable<typeof x> => !!x)
  }).map((x) => {
    const offert = Math.min(reste, x.montant)
    reste -= offert
    return { ...x, offert }
  })
  return (
    <Ecran gabarit="colonnes" route="rentree-panier">
      <Colonne>
      <Styles id="ddcb0e469a" />
      <EtapesRentree n={3} />
      <FfRentree />
      <div className="cl15-sec">
        <i>
          <Icone nom="lock" taille={14} />
        </i>
        {t('Paiement sécurisé via MoMo · Escrow BelivaY')}
      </div>
      <div className="pg">
        <h1 className="pg-t">{tf('Liste {c} · {n} articles', { c: l.classe, n: c.pris.length })}</h1>
        <p className="pg-s">{tf(c.boutiques.length > 1 ? '{e} · {b} boutiques' : '{e} · {b} boutique', { e: t(ecole?.nom ?? ''), b: c.boutiques.length })}</p>
      </div>
      <div className="card green cl15-box">
        <span className="bi">
          <Icone nom="package-check" taille={20} />
        </span>
        <div className="grow">
          <b className="bt">{t('Toute la liste arrive ensemble.')}</b>
          <p>{tf('Un seul message et un seul code quand le dernier colis est au {r}.', { r: t(d.relais ?? 'relais') })}</p>
        </div>
      </div>
      {c.boutiques.map((b, i) => {
        const a = c.pris.filter((x) => x.boutique === b)
        const meta = boutiques[b]
        const autreZone = a[0].zone !== zone0
        return (
          <section key={b} className="card cl15-sc" style={{ '--c': COULEURS[i % COULEURS.length] } as CSSProperties}>
            <div className="sh">
              {autreZone && <i className="bl"></i>}
              <div className="grow">
                <div className="nm">
                  {t(b)}
                  <Icone nom="check" taille={16} trait={2.6} />
                </div>
                <div className={'zn' + (autreZone ? ' oz' : '')}>{meta ? tf('{z} · prêt sous {d}', { z: t(a[0].zone), d: t(meta.delai) }) : t(a[0].zone)}</div>
                {meta?.palier && (
                  <div className="tr">
                    <span className={'tier ' + classeTier(meta.palier)}>
                      <Icone nom="badge-check" taille={14} />
                      {t(meta.palier)}
                    </span>
                  </div>
                )}
              </div>
              <span className="cl15-tag">{tf('Colis {n}', { n: i + 1 })}</span>
            </div>
            <div className="blk">
              <div className="cl15-strip">
                {a.slice(0, a.length > 6 ? 5 : 6).map((x) => (
                  <VignetteRentree key={x.id} a={x} />
                ))}
                {a.length > 6 && (
                  <span className="thumb" style={{ width: '44px', height: '44px', borderRadius: '11px', background: 'var(--sand-2)', color: 'var(--ink-2)', fontSize: '13px', fontWeight: '800' }}>
                    +{a.length - 5}
                  </span>
                )}
              </div>
            </div>
            <div className="blk cl15-subt">
              <span className="k">{tf(a.length > 1 ? '{n} articles' : '{n} article', { n: a.length })}</span>
              <b>{F(a.reduce((n, x) => n + x.prix, 0))}&nbsp;F</b>
            </div>
          </section>
        )
      })}
      </Colonne>
      <Aside titre="Récapitulatif">
      <div className="card cl15-sum">
        <div className="cl15-k o">{t('Récapitulatif')}</div>
        <div className="cl15-r">
          <span className="lb">{tf('Sous-total · {n} articles', { n: c.pris.length })}</span>
          <span className="v">{F(c.sousTotal)}&nbsp;F</span>
        </div>
        {lignes.map((x) => {
          const autreZone = c.pris.find((a) => a.boutique === x.boutique)!.zone !== zone0
          return (
            <div key={x.cle} className="cl15-r">
              <span className="lb">
                {x.type === 'ramassage' && autreZone && <i className="cl15-dot" style={{ '--c': COULEURS[x.i % COULEURS.length] } as CSSProperties}></i>}
                {x.type === 'ramassage' ? tf('Ramassage {b}', { b: t(x.boutique) }) : tf('Remise au relais · colis {n}', { n: x.i + 1 })}
                {x.type === 'ramassage' && x.partage && <small className="g">{t('même zone · −24 %')}</small>}
                {x.type === 'ramassage' && autreZone && <small className="a">{t('zone différente')}</small>}
              </span>
              <span className="v">
                {x.offert >= x.montant ? (
                  <>
                    <s>{F(x.montant)}&nbsp;F</s>
                    <span className="free">{t(x.type === 'ramassage' ? 'offert' : 'offerte')}</span>
                  </>
                ) : (
                  <>{F(x.montant - x.offert)}&nbsp;F</>
                )}
              </span>
            </div>
          )
        })}
        <div className="cl15-tot">
          <span className="l">{t('Total')}</span>
          <span className="rt">
            <span className="price">
              {F(c.total)}
              <small>{t(' F')}</small>
            </span>
          </span>
        </div>
        {c.frais.offert > 0 && (
          <div className="cl15-eco">
            <span>{t('Tu économises sur la livraison')}</span>
            <b>{F(c.frais.offert)}&nbsp;F</b>
          </div>
        )}
      </div>
      <div className="hint-l">
        <Icone nom="clock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t('Les colis arrivés attendent les autres au relais, gratuitement, 21 jours au plus.')}</span>
      </div>
      <PayerMomo
        montant={c.total}
        texte={tf('Passer commande · {m} F', { m: F(c.total) })}
        payer={async (moyen) => {
          const ref = await source.commanderRentree(l.id, { exclus, equivalents: eq, moyen })
          naviguer(chemin('rentree-suivi', { ref }), { replace: true })
        }}
      />
      <MettreListeDeCote l={l} exclus={exclus} eq={eq} total={c.total} rentreeLe={d.rentreeLe} maintenant={d.maintenant} />
      <div className="cl15-inf">
        <Icone nom="info" taille={17} />
        <span>{t('Paiement au comptoir non proposé pour une liste groupée : elle occupe le relais jusqu’au dernier colis.')}</span>
      </div>
      </Aside>
    </Ecran>
  )
}
