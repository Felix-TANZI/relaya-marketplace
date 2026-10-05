// Écran « Suivi de commande » (CL-09), forme d'origine du prototype rendue réelle (DP-54) : « Quand puis-je y
// aller ? » (retirable maintenant, heure prévue, en attente du dernier colis, livraison à domicile), plan indicatif
// et étape de la commande (boutique, emballé et scellé, au relais, retiré), colis par colis (boutique, état côté
// vendeur, jauge, livreur qui l'apporte), montant dû et ses paliers, les étapes datées, code de retrait, reçu,
// modifier (selon l'état), signaler un problème. Jamais la position du livreur ni son numéro.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Aside, Colonne, Gabarit } from '../../composants/Gabarits'
import { useDes } from '../../composants/ecran'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { source, type ColisCommande, type CommandeClient } from '../../donnees/source'
import { F } from '../../i18n/format'
import { dateA, heureSeule, jourSeul, quand } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { CommandeIntrouvable } from '../CL-08/Confirmee'
import { distance, echeancier, etatDe, grosColis, minutesAPied, tarifGarde, useRelais } from './Commun'

const ETAPES_COLIS = ['Préparation', 'Récupéré', 'Arrivé au relais', 'Retiré']
const ETAPES_CMD: [string, string][] = [
  ['Boutique', 'store'],
  ['Emballé, scellé', 'package'],
  ['Au relais', 'map-pin'],
  ['Retiré', 'hand'],
]

export function Suivi() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const ref = params.get('ref') ?? 'BLV-52107'
  const [d, setD] = useState<{ commande: CommandeClient; maintenant: number } | null | undefined>(undefined)
  const relais = useRelais(d?.commande.mode === 'relais' ? d.commande.lieu : null)
  const colonnes = useDes('tab-l')
  useEffect(() => {
    source.commandeClient(ref).then(setD)
  }, [ref])
  if (d === undefined) return null
  if (!d) return <CommandeIntrouvable route="suivi" />
  const c = d.commande
  const maintenant = d.maintenant
  const colis = c.colis.filter((x) => !x.annule)
  const n = colis.length
  const arrives = colis.filter((x) => x.arrive).length
  const domicile = c.mode === 'domicile'
  const retiree = c.etat === 'retiree'
  // Étape d'un colis : -1 pas encore confirmé, 0 préparation, 1 récupéré, 2 au relais, 3 retiré.
  const etapeColis = (x: ColisCommande) => (retiree ? 3 : x.arrive ? 2 : x.statut === 'recupere' ? 1 : x.statut === 'attente' ? -1 : 0)
  const etatColis = (x: ColisCommande) =>
    retiree
      ? 'Retiré'
      : x.arrive
        ? domicile
          ? 'Livré'
          : 'Arrivé au relais'
        : x.statut === 'recupere'
          ? domicile
            ? 'En route'
            : 'Récupéré par le livreur'
          : x.statut === 'pret'
            ? 'Prêt chez le vendeur'
            : x.statut === 'attente'
              ? 'Pas encore confirmée'
              : 'Préparation en cours'
  // Étape de la commande : la moins avancée de ses colis.
  const k = retiree ? 3 : c.etat === 'annulee' ? -1 : Math.max(0, Math.min(...colis.map((x) => Math.min(2, etapeColis(x)))))
  const e = etatDe(c)
  const ech = c.garde && c.garde.du > 0 ? echeancier(c, maintenant, relais?.ferme ?? null) : null
  const echTout = c.garde && (c.etat === 'retirable' || c.etat === 'comptoir') ? echeancier(c, maintenant, relais?.ferme ?? null) : null
  const gros = grosColis(c)
  const enRoute = c.etat === 'preparation' || c.etat === 'route'

  const grand = domicile
    ? enRoute
      ? c.pretLe
        ? tf('Livraison {d}', { d: quand(c.pretLe, maintenant, langue) })
        : t('Livraison en préparation')
      : e.v
        ? tf(e.texte, e.v)
        : t(e.texte)
    : c.etat === 'retirable' || c.etat === 'comptoir'
      ? t('Retirable maintenant')
      : enRoute && arrives > 0 && arrives < n
        ? t('En attente d’un colis')
        : enRoute && c.pretLe
          ? tf('Retrait possible {d}', { d: quand(c.pretLe, maintenant, langue) })
          : e.v
            ? tf(e.texte, e.v)
            : t(e.texte)
  const sous = domicile
    ? t(c.lieu)
    : c.etat === 'retirable' || c.etat === 'comptoir'
      ? relais
        ? tf('{l} · ouvert de {h}, fermé le {f} · {m} min à pied de chez toi ({d})', { l: t(c.lieu), h: t(relais.horaires), f: t(relais.ferme), m: minutesAPied(relais.km), d: distance(relais.km) })
        : t(c.lieu)
      : enRoute && arrives > 0 && arrives < n
        ? tf('Les colis arrivés t’attendent déjà au {l} : un seul code pour les {n}, dès que le dernier est là.', { l: t(c.lieu), n })
        : enRoute
          ? tf(n > 1 ? 'Quand les {n} colis seront au {l}. Un seul code pour tous.' : 'Quand ton colis sera au {l}.', { n, l: t(c.lieu) })
          : c.etat === 'retiree' && c.retireeLe
            ? tf('Retirée le {d} au {l}.', { d: dateA(c.retireeLe, langue), l: t(c.lieu) })
            : t(c.lieu)

  const barre = c.etat !== 'annulee' && (
    <div className="cl09-bar glass">
      <Link to={chemin('litige', { ref: c.ref })} className="btn secondary">
        <Icone nom="circle-alert" taille={18} />
        <span>{t('Signaler un problème')}</span>
      </Link>
    </div>
  )

  const bHero = (
    <>
      <div className="hero night">
        <div className="hk">{t(domicile ? 'Quand arrive mon colis ?' : 'Quand puis-je y aller ?')}</div>
        <div className="cl09-big">{grand}</div>
        {!domicile && enRoute && arrives > 0 && arrives < n && (
          <div className="cl09-pill-w">
            <span className="pill dk">
              <Icone nom="package-check" taille={13} />
              {tf('{a} colis sur {n} arrivés', { a: arrives, n })}
            </span>
          </div>
        )}
        <div className="hs">{sous}</div>
      </div>
    </>
  )
  const bPlan = (
    <>
      {!domicile && (
        <section className="c9-box">
          <div className="c9-map" style={{ height: '170px' }}>
            <Dessin id="2876769b5cb9" />
            <span className="zm">
              <span>
                <Icone nom="plus" taille={14} />
              </span>
              <span>
                <Icone nom="minus" taille={14} />
              </span>
            </span>
            <span className="at">{t('Plan indicatif')}</span>
          </div>
          <div className="c9-stg">
            {ETAPES_CMD.map(([x, ic], i) => (
              <div key={x} className={i < k ? 'ok' : i === k ? 'cur' : ''}>
                <span className="c">
                  <Icone nom={i < k ? 'check' : ic} taille={20} />
                </span>
                {t(x)}
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  )
  const bCode = (
    <>
      {(c.etat === 'retirable' || (c.etat === 'comptoir' && !c.comptoir?.du)) && (
        <div className="btns">
          <Link to={chemin('code', { ref: c.ref })} className="btn primary">
            <Icone nom="qr-code" taille={18} />
            <span>{t('Afficher mon code')}</span>
          </Link>
        </div>
      )}
    </>
  )
  const bPayer = (
    <>
      {c.etat === 'comptoir' && (c.comptoir?.du ?? 0) > 0 && (
        <div className="btns">
          <Link to={chemin('comptoir-payer', { ref: c.ref })} className="btn primary">
            <Icone nom="smartphone" taille={18} />
            <span>{tf('Payer au comptoir · {m} F', { m: F(c.comptoir!.du) })}</span>
          </Link>
        </div>
      )}
    </>
  )
  const bGarde = (
    <>
      {ech && c.garde && (
        <div className="note or">
          <Icone nom="clock" taille={18} />
          <div>
            <b>{tf('Montant dû : {m} F', { m: F(c.garde.du) })}</b>
            {' · ' + tf('{m} F demain', { m: F(c.garde.demain) })}
            {ech.suivant ? ' · ' + tf('{m} F de plus {d}', { m: F(ech.suivant.frais), d: jourSeul(ech.suivant.le, langue) }) : ''}
            {' · ' + tf('retrait avant {d} au soir', { d: jourSeul(ech.dernier.le, langue) })}
            {'. '}
            <Link to={chemin('garde', { ref: c.ref })}>{t('Détail de la garde')}</Link>
          </div>
        </div>
      )}
    </>
  )
  const bGardeTout = (
    <>
      {!ech && echTout && c.garde && (
        <div className="note or">
          <Icone nom="clock" taille={18} />
          <div>
            <b>{tf('Gratuit aujourd’hui, {m} F dès demain', { m: F(c.garde.demain) })}</b>
            {' · ' + tf('retrait avant {d} au soir, sinon renvoi au vendeur', { d: jourSeul(echTout.dernier.le, langue) })}
            {'. '}
            <Link to={chemin('garde', { ref: c.ref })}>{t('Détail de la garde')}</Link>
          </div>
        </div>
      )}
    </>
  )
  const bEnRoute = (
    <>
      {enRoute && !domicile && (
        <div className="note ink">
          <Icone nom="message-square" taille={18} />
          <div>
            {t('À l’arrivée du dernier colis : notification et SMS avec ton code de retrait.')}{' '}
            {gros
              ? tf('Garde : {a} F le 1er jour (gros colis), puis {m} F par jour ; après 7 jours, renvoi au vendeur.', { a: F(tarifGarde(1, true)), m: F(tarifGarde(2, true)) })
              : tf('Garde : 1er jour gratuit, puis {m} F par jour ; après 7 jours, renvoi au vendeur.', { m: F(tarifGarde(2, false)) })}
          </div>
        </div>
      )}
    </>
  )
  const bColis = (
    <>
      <div className="sec">
        <h2>{t(n > 1 ? 'Colis par colis' : 'Ton colis')}</h2>
      </div>
      {c.colis.map((x) => {
        const ke = etapeColis(x)
        return (
          <div key={x.n} className="card">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <b className="t15 b8">{tf('Colis {n}', { n: x.n })}</b>
              <span className="t12 c3 b7">{domicile ? t('Livraison à domicile') : t(x.boutique)}</span>
            </div>
            <Link to={x.p ? chemin('fiche', { p: x.p }) : chemin('commande', { ref: c.ref })} className="row mt10" style={{ color: 'inherit' }}>
              <span className="thumb" style={{ width: '44px', height: '44px', borderRadius: '12px' }}>
                <Dessin id={x.dessin} />
              </span>
              <span className="grow">
                <span className="t14 b7" style={{ display: 'block', lineHeight: '1.3' }}>
                  {t(x.produit)}
                  {x.qte > 1 ? ' × ' + x.qte : ''}
                </span>
              </span>
            </Link>
            {x.annule ? (
              <div className="row mt12" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                <b className="t15">{t('Annulé')}</b>
                <span className="t12 c3 right">{tf('{m} F remboursés le {d}', { m: F(x.annule.rembourse), d: jourSeul(x.annule.le, langue) })}</span>
              </div>
            ) : (
              <>
                <div className="row mt12" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <b className="t15">{t(etatColis(x))}</b>
                  <span className="t12 c3 right">
                    {retiree && c.retireeLe
                      ? dateA(c.retireeLe, langue)
                      : x.arrive
                        ? x.etagere
                          ? tf('{d} · étagère {e}', { d: dateA(c.arriveeLe ?? c.payeeLe, langue), e: x.etagere })
                          : dateA(c.arriveeLe ?? c.payeeLe, langue)
                        : x.statut === 'recupere'
                          ? t('emballé et scellé devant le vendeur')
                          : c.pretLe
                            ? tf(domicile ? 'prévu vers {h}' : 'prévu au relais vers {h}', { h: heureSeule(c.pretLe, langue) })
                            : ''}
                  </span>
                </div>
                <div className="gauge">
                  {ETAPES_COLIS.map((_, i) => (
                    <i key={i} className={(i <= ke ? 'on' : '') + (i === ke ? ' cur' : '')}></i>
                  ))}
                </div>
                <div className="gauge-l">
                  {ETAPES_COLIS.map((l, i) => (
                    <span key={l} className={i === ke ? 'on' : ''}>
                      {t(l)}
                    </span>
                  ))}
                </div>
                {x.statut === 'recupere' && !x.arrive && (
                  <div className="cl09-cour">
                    <span className="portrait" style={{ width: '44px', height: '44px' }}>
                      <Dessin id="90d65f6242b6" />
                    </span>
                    <span className="grow">
                      <b className="t14" style={{ display: 'block' }}>
                        {t(domicile ? 'Le livreur t’apporte ton colis' : 'Le livreur l’apporte au relais')}
                      </b>
                      {c.pretLe && <span className="t12 c3">{tf(domicile ? 'Arrivée vers {h} · il te remet le colis en main propre' : 'Arrivée vers {h}', { h: heureSeule(c.pretLe, langue) })}</span>}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        )
      })}
    </>
  )
  const bEtapes = (
    <>
      <div className="card">
        <h3 className="cl11-k">{t('Les étapes')}</h3>
        <div className="tl cl11-tl">
          {c.etapes.map((x, i) => (
            <div key={i} className={'ti ' + (x.le ? 'done' : c.etapes.findIndex((y) => !y.le) === i ? 'cur' : '')}>
              <div className="tt">{t(x.titre)}</div>
              <div className="td">{x.le ? dateA(x.le, langue) : t('à venir')}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
  const bLiens = (
    <>
      <div className="card tight">
        <Link to={chemin('commande', { ref: c.ref })} className="li">
          <span className="ic ">
            <Icone nom="scroll-text" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('Voir le reçu')}
            </span>
          </span>
          <span className="chev">
            <Icone nom="chevron-right" taille={18} />
          </span>
        </Link>
        {(c.etat === 'preparation' || c.etat === 'route' || c.etat === 'retirable') && (
          <Link to={chemin('modifier', { ref: c.ref })} className="li">
            <span className="ic ">
              <Icone nom="pencil" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t('Modifier ma commande')}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {t(domicile && c.etat === 'route' ? 'L’adresse ne change plus pendant la livraison' : c.etat === 'preparation' ? 'Annuler une boutique ou changer de relais' : 'Changer de relais')}
              </span>
            </span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
        )}
        {!domicile && (enRoute || c.etat === 'retirable' || c.etat === 'comptoir') && (
          <Link to={chemin('code-partage', { ref: c.ref })} className="li">
            <span className="ic ">
              <Icone nom="user-plus" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t(c.delegue ? 'Retrait confié' : 'Je ne pourrai pas y aller')}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {c.delegue ? tf('{p} · {n}', { p: c.delegue.prenom, n: c.delegue.numero }) : t('Fais retirer par quelqu’un : il reçoit son propre code')}
              </span>
            </span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
        )}
        <Link to={chemin('fil', { id: 'support', st: 'nouveau', commande: c.ref })} className="li">
          <span className="ic ">
            <Icone nom="headset" taille={20} />
          </span>
          <span className="grow lt">{t('Écrire au support')}</span>
          <span className="chev">
            <Icone nom="chevron-right" taille={18} />
          </span>
        </Link>
      </div>
    </>
  )
  const bNotes = (
    <>
      <div className="hint-l">
        <Icone nom="shield-check" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>
          {t(
            domicile
              ? 'Son numéro n’est jamais affiché et il n’y a pas de carte en direct : si besoin, il t’appelle par un numéro masqué.'
              : 'Le plan montre ton trajet jusqu’au relais. La position du livreur et son numéro ne sont jamais affichés : une heure estimée suffit.',
          )}
        </span>
      </div>
      <div className="hint-l">
        <Icone nom="bell" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t('Une notification arrive à chaque étape ; un SMS si l’application est fermée.')}</span>
      </div>
    </>
  )
  const bEspace = (
    <>
      {barre && <div className="cl09-sp"></div>}
    </>
  )
  return (
    <Ecran route="suivi" sousTitre={c.ref} fixes={colonnes ? null : barre} largeur={colonnes ? 'moyen' : undefined}>
      <div className="cl09">
        {colonnes ? (
          // Grands écrans (§ 5.8) : à gauche « Quand puis-je y aller ? », le plan, l'étape et les étapes datées ; à
          // droite les colis un par un, le montant dû, le code, le reçu, « Modifier » et « Signaler un problème ».
          <Gabarit forme="colonnes" classe="c9-suivi">
            <Colonne>
              {bHero}
              {bPlan}
              {bEtapes}
              {bNotes}
            </Colonne>
            <Aside titre={t('Tes colis')}>
              {bCode}
              {bPayer}
              {bGarde}
              {bGardeTout}
              {bEnRoute}
              {bColis}
              {bLiens}
              {c.etat !== 'annulee' && (
                <div className="btns">
                  <Link to={chemin('litige', { ref: c.ref })} className="btn secondary">
                    <Icone nom="circle-alert" taille={18} />
                    <span>{t('Signaler un problème')}</span>
                  </Link>
                </div>
              )}
            </Aside>
          </Gabarit>
        ) : (
          <>
            {bHero}
            {bPlan}
            {bCode}
            {bPayer}
            {bGarde}
            {bGardeTout}
            {bEnRoute}
            {bColis}
            {bEtapes}
            {bLiens}
            {bNotes}
            {bEspace}
          </>
        )}
      </div>
    </Ecran>
  )
}
