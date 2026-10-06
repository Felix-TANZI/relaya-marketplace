// Écran « Frais de garde » (CL-10), forme d'origine du prototype rendue réelle (DP-08 ; DP-54) : la commande
// (?ref=…) au relais : jour de garde sur 7 (barre datée, jours de fermeture du relais jamais facturés), montant dû
// aujourd'hui, demain, palier suivant, date limite avant le renvoi au vendeur (+ 500 F) et ce qui serait retenu ;
// tableau jour par jour calculé (grille du client, par commande (CGA-13) : 0, 100, 100, 100, 200, 500, 1 000 F) ; « Et si je retire… » ;
// relais ; garde gelée pendant un litige ; colis renvoyés (solde remboursé) ; comment ça marche ; les rappels
// (notification, SMS) ; faire retirer par quelqu'un ; politique de garde.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Aside, Colonne, Zone } from '../../composants/Gabarits'
import { useDes } from '../../composants/ecran'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { source, type CommandeClient } from '../../donnees/source'
import { F } from '../../i18n/format'
import { dateA, jourSeul } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { CommandeIntrouvable } from '../CL-08/Confirmee'
import { echeancier, fermeLe, GARDE_GROS_AJOUT, GRILLE_GARDE, plafondGarde, RENVOI_GARDE, tarifGarde, useRelais, type JourGarde } from '../CL-09/Commun'

export function Garde() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const ref = params.get('ref') ?? 'BLV-52018'
  const [d, setD] = useState<{ commande: CommandeClient; maintenant: number } | null | undefined>(undefined)
  const [simule, setSimule] = useState<number | null>(null)
  const relais = useRelais(d?.commande.lieu)
  const colonnes = useDes('tab-l')
  useEffect(() => {
    source.commandeClient(ref).then(setD)
  }, [ref])
  if (d === undefined) return null
  if (!d) return <CommandeIntrouvable route="garde" />
  const c = d.commande
  const maintenant = d.maintenant
  const n = c.colis.filter((x) => !x.annule).length
  const ferme = relais?.ferme ?? null
  const gerant = relais ? t(relais.gerant) : t('le gérant')
  // Litige : la garde s'arrête le jour où le dossier est ouvert.
  const ouvertureLitige = c.etat === 'litige' ? (c.etapes.find((e) => /litige|Remplacement/i.test(e.titre))?.le ?? maintenant) : null
  const jourLitige = ouvertureLitige && c.arriveeLe ? Math.min(7, Math.floor((ouvertureLitige - c.arriveeLe) / 864e5) + 1) : 1
  const garde = c.garde ?? (c.etat === 'litige' && c.arriveeLe ? { du: 0, demain: 0, jour: jourLitige } : null)

  if (!garde || !c.arriveeLe)
    return (
      <Ecran route="garde" sousTitre={c.ref}>
        <div className="card">
          <div className="empty">
            <div className="ei">
              <Icone nom="clock" taille={26} />
            </div>
            <h3>{t(c.etat === 'retiree' ? 'Commande retirée : plus de garde' : 'Pas de garde en cours')}</h3>
            <p>{t('La garde commence quand tes colis arrivent au relais : le premier jour est gratuit.')}</p>
            <div className="btns">
              <Link to={chemin('commande', { ref: c.ref })} className="btn primary">
                <span>{t('Voir la commande')}</span>
              </Link>
            </div>
          </div>
        </div>
      </Ecran>
    )

  // Échéancier calculé depuis le jour de garde (le jour du litige quand il est gelé).
  const ech = echeancier({ ...c, garde }, c.etat === 'litige' ? (ouvertureLitige ?? maintenant) : maintenant, ferme)
  const jour = Math.min(7, ech.jour)
  const auj = ech.jours[jour - 1]
  const lendemain: JourGarde | undefined = ech.jours[jour]
  const renvoye = garde.jour > 7
  const litige = c.etat === 'litige'
  const premier = ech.jours[0]
  const fermeAujourdhui = !litige && fermeLe(maintenant, ferme)
  const dernierJour = !litige && !renvoye && auj.j === ech.dernier.j
  const voir = simule ?? jour

  const relaisCarte = (
    <div className="card cl10-rc">
      <div className="cl10-k">
        <Icone nom="map-pin" taille={15} />
        <span className="grow">{t('Ton relais de retrait')}</span>
      </div>
      <div className="cl10-rel">
        <span className="portrait" style={{ width: '44px', height: '44px' }}>
          <Dessin id="ea693eb4e364" />
        </span>
        <div className="grow">
          <b className="t15 b8" style={{ display: 'block' }}>
            {t(c.lieu)}
          </b>
          {relais && <span className="t13 c3">{tf('{g} · {h} · fermé le {f}', { g: gerant, h: t(relais.horaires), f: t(relais.ferme) })}</span>}
        </div>
      </div>
    </div>
  )
  const tableau = (
    <div className="card cl10-gc">
      <div className="cl10-k">
        <Icone nom="calendar" taille={15} />
        <span className="grow">{t('Jour par jour')}</span>
      </div>
      <table className="cl10-g">
        <thead>
          <tr>
            <th>{t('Jour')}</th>
            <th>{t('Frais du jour')}</th>
            <th className="r">{t('Cumul')}</th>
          </tr>
        </thead>
        <tbody>
          {ech.jours.map((x) => (
            <tr key={x.j} className={x.ferme ? 'cl10-go' : x.j < jour || renvoye ? 'cl10-gp' : x.j === jour ? 'cl10-gt' : ''}>
              <td>
                {jourSeul(x.le, langue)}
                <small>{x.j === jour && !renvoye ? tf('Jour {j} · aujourd’hui', { j: x.j }) : tf('Jour {j}', { j: x.j })}</small>
              </td>
              <td>
                {x.ferme ? (
                  <>
                    {t('Relais fermé')}
                    <small>{t('jamais facturé')}</small>
                  </>
                ) : x.frais ? (
                  '+ ' + F(x.frais) + ' F'
                ) : (
                  t('Gratuit')
                )}
              </td>
              <td className="r">{F(x.cumul) + ' F'}</td>
            </tr>
          ))}
          <tr className="cl10-ge">
            <td>
              {jourSeul(ech.renvoi, langue)}
              <small>{t('Renvoi au vendeur')}</small>
            </td>
            <td>{'+ ' + F(RENVOI_GARDE) + ' F'}</td>
            <td className="r">
              {F(ech.retenue) + ' F'}
              <small>{t('retenus')}</small>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
  const grille = (
    <div className="card">
      <h3 className="cl11-k">{t('La grille, par commande')}</h3>
      <div className="cl13-grid3">
        {GRILLE_GARDE.map((_, i) => {
          const g = tarifGarde(i + 1, ech.gros)
          return (
            <div key={i} style={i + 1 === jour ? { outline: '2px solid var(--or)', borderRadius: 10 } : undefined}>
              {tf('Jour {j}', { j: i + 1 })}
              <b style={{ display: 'block' }}>{g ? F(g) + ' F' : t('Gratuit')}</b>
            </div>
          )
        })}
      </div>
      {ech.gros && <p className="t12 c3">{tf('Ta commande contient un gros colis (carton C1 ou C2) : + {m} F chaque jour, dès le 1er jour.', { m: F(GARDE_GROS_AJOUT) })}</p>}
      <p className="t12 c3">{t('Un jour de fermeture du relais n’est jamais compté. Pendant un litige, la garde s’arrête.')}</p>
    </div>
  )

  // Colis renvoyés au vendeur : solde remboursé.
  if (renvoye)
    return (
      <Ecran route="garde" sousTitre={c.ref}>
        <div className="pg">
          <div className="pg-k">{t('Renvoyé au vendeur')}</div>
          <h1 className="pg-t">{tf(n > 1 ? 'Tes {n} colis sont repartis chez le vendeur' : 'Ton colis est reparti chez le vendeur', { n })}</h1>
          <p className="pg-s">{tf('Non retirés au {l} · renvoi du {d}', { l: t(c.lieu), d: jourSeul(ech.renvoi, langue) })}</p>
        </div>
        <div className="hero green">
          <div className="hk">{t('Solde remboursé')}</div>
          <div className="big">
            {F(Math.max(0, c.total - ech.retenue))}
            <small>{t('F')}</small>
          </div>
          <div className="hs">{tf('Sur ton Mobile Money, le {d}.', { d: jourSeul(ech.renvoi, langue) })}</div>
          <div className="hline"></div>
          <div className="cl10-hrow">
            <span>{t('Total payé')}</span>
            <b>{F(c.total) + ' F'}</b>
          </div>
          <div className="cl10-hrow">
            <span>{t('Garde retenue')}</span>
            <b>{'− ' + F(ech.jours[6].cumul) + ' F'}</b>
          </div>
          <div className="cl10-hrow">
            <span>{t('Renvoi au vendeur')}</span>
            <b>{'− ' + F(RENVOI_GARDE) + ' F'}</b>
          </div>
          <div className="cl10-cons">
            <Icone nom="info" taille={16} />
            <span>{tf('Frais retenus : {m} F. Ton code de retrait ne marche plus.', { m: F(ech.retenue) })}</span>
          </div>
        </div>
        {tableau}
        {relaisCarte}
        <div className="links cl10-lnk">
          <Link to={chemin('commande', { ref: c.ref })}>{t('Voir ma commande')}</Link>
        </div>
      </Ecran>
    )

  const rappels: { j: JourGarde; type: 'notification' | 'SMS'; vers: string }[] = []
  for (const x of ech.jours) {
    if (x.ferme || x.j === 1) continue
    if (x.j === 2) rappels.push({ j: x, type: 'notification', vers: chemin('push', { ref: c.ref }) })
    else if (x.j === 3 || x.j === 5) rappels.push({ j: x, type: 'SMS', vers: chemin('sms') })
    else if (x.j === ech.dernier.j) rappels.push({ j: x, type: 'notification', vers: chemin('push', { ref: c.ref }) })
  }
  const fermes = ech.jours.filter((x) => x.ferme)

  const bTitre = (
    <>
      <div className="pg">
        <div className="pg-k">{litige ? t('Litige en cours') : tf('Jour {j} sur 7', { j: jour })}</div>
        <h1 className="pg-t">{tf(n > 1 ? 'Tes {n} colis t’attendent' : 'Ton colis t’attend', { n })}</h1>
        <p className="pg-s">{tf('{l} · arrivés le {d}', { l: t(c.lieu), d: dateA(c.arriveeLe, langue) })}</p>
      </div>
    </>
  )
  const bHero = (
    <>
      <div className="hero cl10-hero night">
        <div className="hk">{t(litige ? 'Montant dû · compteur gelé' : fermeAujourdhui || jour === 7 ? 'Montant dû' : 'Montant dû aujourd’hui')}</div>
        <div className="big">
          {F(litige ? auj.cumul : garde.du)}
          <small>{t('F')}</small>
        </div>
        <div className="hs">
          {litige
            ? t('Un litige est ouvert. Rien ne court et tes colis restent au relais jusqu’à la décision.')
            : fermeAujourdhui
              ? t('Relais fermé aujourd’hui : ce jour ne t’est jamais facturé.')
              : dernierJour
                ? t(lendemain?.ferme ? 'Dernier jour pour retirer tes colis. Relais fermé demain.' : 'Dernier jour pour retirer tes colis.')
                : garde.du
                  ? t('À payer au retrait en Mobile Money, sur ton téléphone. Jamais en espèces.')
                  : tf('Gratuit aujourd’hui, {m} F par jour dès demain.', { m: F(garde.demain) })}
        </div>
        <div className="cl10-bar" role="img" aria-label={litige ? t('Litige en cours') : tf('Jour {j} sur 7', { j: jour })}>
          {ech.jours.map((x) => (
            <i key={x.j} className={litige && x.j > jour ? 'shut' : x.j < jour ? 'done' : x.j === jour ? 'cur' : x.ferme ? 'shut' : ''}></i>
          ))}
        </div>
        <div className="cl10-barl">
          <span>{jourSeul(premier.le, langue)}</span>
          <span>{jourSeul(ech.jours[6].le, langue)}</span>
        </div>
        {!litige && jour < 7 && (
          <>
            <div className="hline"></div>
            {lendemain && (
              <div className="cl10-hrow">
                <span>{tf('Demain · {d}', { d: jourSeul(lendemain.le, langue) })}</span>
                <b>{lendemain.ferme ? t('Relais fermé') : F(garde.demain) + ' F'}</b>
              </div>
            )}
            {ech.suivant && !dernierJour && (
              <div className="cl10-hrow">
                <span>{t('Palier suivant')}</span>
                <b>{tf('{m} F {d}', { m: F(ech.suivant.frais), d: jourSeul(ech.suivant.le, langue) })}</b>
              </div>
            )}
            <div className="cl10-hrow">
              <span>{t('Retrait avant')}</span>
              <b>{dernierJour && relais ? tf('ce soir, {h}', { h: (relais.horaires.split('–')[1] ?? '').trim() }) : tf('{d} au soir', { d: jourSeul(ech.dernier.le, langue) })}</b>
            </div>
          </>
        )}
        {!litige && (
          <div className="cl10-cons">
            <Icone nom={jour === 7 ? 'truck' : 'undo-2'} taille={16} />
            <span>
              {jour === 7
                ? tf('Demain, {d} : tes colis repartent chez le vendeur. Frais retenus : {m} F (garde {g} F + renvoi {r} F) ; le reste, {s} F, t’est remboursé.', { d: jourSeul(ech.renvoi, langue), m: F(ech.retenue), g: F(ech.jours[6].cumul), r: F(RENVOI_GARDE), s: F(Math.max(0, c.total - ech.retenue)) })
                : tf('Sinon, {d} : tes colis repartent chez le vendeur, avec {r} F de frais de renvoi. {m} F seraient retenus sur ton remboursement.', { d: jourSeul(ech.renvoi, langue), r: F(RENVOI_GARDE), m: F(ech.retenue) })}
            </span>
          </div>
        )}
      </div>
    </>
  )
  const bRelais = (
    <>
      {relaisCarte}
    </>
  )
  const bAction = (
    <>
      <div className="btns">
        {litige ? (
          <Link to={c.litige ? chemin('litige-suivi', { id: c.litige }) : chemin('litiges')} className="btn primary">
            <Icone nom="scale" taille={18} />
            <span>{t('Voir mon litige')}</span>
          </Link>
        ) : jour === 7 ? (
          <Link to={chemin('commande', { ref: c.ref })} className="btn secondary">
            <span>{t('Voir ma commande')}</span>
          </Link>
        ) : (
          <Link to={chemin('code', { ref: c.ref })} className="btn primary">
            <Icone nom="qr-code" taille={18} />
            <span>{t('Afficher mon code')}</span>
          </Link>
        )}
      </div>
    </>
  )
  const bVoir = (
    <>
      {jour < 7 && (
        <div className="links cl10-lnk">
          <Link to={chemin('commande', { ref: c.ref })}>{t('Voir ma commande')}</Link>
        </div>
      )}
    </>
  )
  const bTableau = (
    <>
      {tableau}
    </>
  )
  const bGrille = (
    <>
      {grille}
    </>
  )
  const bSimuler = (
    <>
      {!litige && (
        <div className="card">
          <h3 className="cl11-k">{t('Et si je retire…')}</h3>
          <div className="chips">
            {[jour, jour + 1, jour + 2, 7]
              .filter((x, i, a) => x <= 7 && a.indexOf(x) === i)
              .map((x) => (
                <button key={x} type="button" className={'chip' + (voir === x ? ' on' : '')} aria-pressed={voir === x} onClick={() => setSimule(x)}>
                  {x === jour ? t('Aujourd’hui') : x === jour + 1 ? t('Demain') : jourSeul(ech.jours[x - 1].le, langue)}
                </button>
              ))}
          </div>
          <p className="t14">{tf('Garde due : {m} F pour {n} colis.', { m: F(voir === jour ? garde.du : ech.jours[voir - 1].cumul), n })}</p>
        </div>
      )}
    </>
  )
  const bComment = (
    <>
      <details className="more">
        <summary>
          <Icone nom="info" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">{t('Comment ça marche')}</span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b">
          <p>
            <b>{t('Le compteur démarre')}</b>
            {tf(' quand tu as vu l’avis d’arrivée : application ouverte ou SMS reçu. Pour toi : {d}.', { d: dateA(c.arriveeLe, langue) })}
          </p>
          <p>
            <b>{t('Il s’arrête')}</b>
            {t(' dès que tu retires tes colis ; les rappels prévus sont alors annulés.')}
          </p>
          <p>
            <b>{t('Un jour où le relais est fermé')}</b>
            {t(' compte dans les 7 jours mais ne t’est jamais facturé.')}
          </p>
          <p>
            <b>{t('Jamais plus')}</b>
            {tf(' que la valeur de tes colis ; au plus {g} F de garde, {r} F avec le renvoi.', { g: F(plafondGarde(ech.gros)), r: F(plafondGarde(ech.gros) + RENVOI_GARDE) })}
          </p>
          <p>
            <b>{t('Pendant un litige')}</b>
            {t(', rien ne court et tes colis ne repartent pas.')}
          </p>
          <p>
            <b>{t('Zéro espèce')}</b>
            {tf(' : tu paies en Mobile Money au retrait, sur ton téléphone. {g} n’encaisse rien. Le même montant s’affiche ici, dans tes SMS et sur son écran.', { g: gerant })}
          </p>
          <p>
            <b>{tf(n > 1 ? 'Tes {n} colis' : 'Ton colis', { n })}</b>
            {t(n > 1 ? ' ont un seul code\u00A0: une seule garde pour tous.' : ' a son code\u00A0: une seule garde.')}
          </p>
        </div>
      </details>
    </>
  )
  const bRappels = (
    <>
      {!litige && (
        <details className="more">
          <summary>
            <Icone nom="bell" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
            <span className="grow">{t('Tes rappels')}</span>
            <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
          </summary>
          <div className="more-b">
            {rappels.map((r) => {
              const envoye = r.j.j < jour
              return (
                <Link key={r.j.j} to={r.vers} className="cl10-rl">
                  <Icone nom={envoye ? 'check' : 'clock'} taille={15} style={{ color: envoye ? 'var(--green)' : 'var(--ink-4)' }} />
                  <span className="grow">
                    <b>{jourSeul(r.j.le, langue)}</b>
                    {' · ' + t(r.type) + ' · ' + t(envoye ? 'envoyé' : 'prévu')}
                  </span>
                  <Icone nom="chevron-right" taille={16} style={{ color: 'var(--ink-4)' }} />
                </Link>
              )
            })}
            {fermes.map((x) => (
              <p key={x.j}>{tf('Aucun rappel le {d} : le relais est fermé.', { d: jourSeul(x.le, langue) })}</p>
            ))}
            <Link to={chemin('push', { ref: c.ref })} className="cl10-see">
              <Icone nom="eye" taille={15} />
              <span>{t('Voir toute la série')}</span>
            </Link>
          </div>
        </details>
      )}
    </>
  )
  const bLiens = (
    <>
      <div className="card tight">
        <Link to={chemin('code-partage', { ref: c.ref })} className="li">
          <span className="ic">
            <Icone nom="user-plus" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('Je ne peux pas passer')}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {t('Fais retirer par quelqu’un : il reçoit son propre code')}
            </span>
          </span>
          <span className="chev">
            <Icone nom="chevron-right" taille={18} />
          </span>
        </Link>
        <Link to={chemin('fil', { id: 'support', st: 'nouveau', sujet: 'Frais de garde', commande: c.ref })} className="li">
          <span className="ic">
            <Icone nom="headset" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('Une question sur ces frais')}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {t('Le support te répond 7 j/7 ; la garde ne court pas pendant un litige')}
            </span>
          </span>
          <span className="chev">
            <Icone nom="chevron-right" taille={18} />
          </span>
        </Link>
        <Link to={chemin('legal-doc', { d: 'garde' })} className="li">
          <span className="ic">
            <Icone nom="file-text" taille={20} />
          </span>
          <span className="grow lt">{t('Politique de garde au relais')}</span>
          <span className="chev">
            <Icone nom="chevron-right" taille={18} />
          </span>
        </Link>
      </div>
    </>
  )
  return (
    <Ecran route="garde" sousTitre={c.ref} gabarit={colonnes ? 'colonnes' : undefined}>
      {colonnes ? (
        // Grands écrans (§ 5.8) : à gauche la barre des 7 jours, le montant dû, demain, le palier suivant, la date
        // limite et « Et si je retire… » ; à droite le tableau jour par jour, le relais et « Faire retirer par quelqu'un ».
        <>
          <Zone nom="haut">{bTitre}</Zone>
          <Colonne>
            {bHero}
            {bAction}
            {bVoir}
            {bSimuler}
            {bGrille}
            {bComment}
            {bRappels}
          </Colonne>
          <Aside titre={t('Jour par jour')}>
            {bTableau}
            {bRelais}
            {bLiens}
          </Aside>
        </>
      ) : (
        <>
          {bTitre}
          {bHero}
          {bRelais}
          {bAction}
          {bVoir}
          {bTableau}
          {bGrille}
          {bSimuler}
          {bComment}
          {bRappels}
          {bLiens}
        </>
      )}
    </Ecran>
  )
}
