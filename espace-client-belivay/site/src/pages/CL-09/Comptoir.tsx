// Écran « Au comptoir » (CL-09), forme d'origine du prototype rendue réelle (DP-54) : la remise des colis de la
// commande (?ref=…) : relais du jour, les 4 gestes (montrer le code, payer le montant dû, colis sortis et
// photographiés, ouvrir devant le gérant) ; « Le gérant m'a remis mes colis » enregistre le retrait (fenêtre de
// retour de 7 jours, vendeur payé ensuite) ; retrait confié (la personne nommée, notification) ; « Tout est en
// ordre » ou « Un problème » (litige constaté au comptoir) ; notes du vendeur et du gérant ; commande déjà retirée
// (fenêtre encore ouverte ou close) ; colis gardé pendant un litige (argent bloqué, pas de garde).
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { source, type CommandeClient, type Litige } from '../../donnees/source'
import { F } from '../../i18n/format'
import { jourSeul, quand } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { CommandeIntrouvable } from '../CL-08/Confirmee'
import { echeancier, fermeLe, minutesAPied, ouvertureDuJour, useRelais } from './Commun'

const FENETRE_JOURS = 7 // fenêtre de retour après le retrait

export function Comptoir() {
  const { t, tf, langue } = usePreferences()
  const session = useSession()
  const [params] = useSearchParams()
  const ref = params.get('ref') ?? 'BLV-52018'
  const [d, setD] = useState<{ commande: CommandeClient; maintenant: number } | null | undefined>(undefined)
  const [litige, setLitige] = useState<Litige | null>(null)
  const [etape, setEtape] = useState<'avant' | 'remis' | 'ok'>('avant')
  const relais = useRelais(d?.commande.lieu)
  const charger = () => source.commandeClient(ref).then(setD)
  useEffect(() => {
    charger()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref])
  useEffect(() => {
    const id = d?.commande.litige
    if (id) source.litige(id).then((x) => setLitige(x?.litige ?? null))
  }, [d?.commande.litige])
  if (d === undefined) return null
  if (!d) return <CommandeIntrouvable route="comptoir" />
  const c = d.commande
  const maintenant = d.maintenant
  const n = c.colis.filter((x) => !x.annule).length
  const gerant = relais ? t(relais.gerant) : t('le gérant')
  const du = (c.garde?.du ?? 0) + (c.comptoir?.du ?? 0)
  const valeur = c.colis.reduce((s, x) => s + (x.annule ? 0 : x.prix * x.qte), 0)
  const fermeAuj = !!relais && fermeLe(maintenant, relais.ferme)
  const ech = c.garde && relais ? echeancier(c, maintenant, relais.ferme) : null
  const seg = (
    <div className="seg cl09-seg">
      <Link to={chemin('comptoir', { ref: c.ref })} className="on">
        {t('Au comptoir')}
      </Link>
      <Link to={chemin('retour', { ref: c.ref })} className="">
        {t('Retourner un article')}
      </Link>
    </div>
  )
  const plus = (
    <details className="more">
      <summary>
        <Icone nom="info" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
        <span className="grow">{t('Ce que change « Tout est en ordre »')}</span>
        <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
      </summary>
      <div className="more-b">
        <p>{t('Ta fenêtre de retour se ferme : ces articles ne pourront plus être retournés.')}</p>
        <p>{t('Les vendeurs sont payés 3 jours après (1 jour pour un vendeur Or ou Platine).')}</p>
        <p>{t('Un vice caché reste couvert 100 jours.')}</p>
      </div>
    </details>
  )
  const etoiles = (label: string) => (
    <Link to={chemin('avis-donner', { ref: c.ref })} className="cl09-stars" aria-label={label}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i}>
          <Icone nom="star" taille={28} trait={1.6} />
        </span>
      ))}
    </Link>
  )
  const notes = (titre: string, bouton: boolean) => (
    <div className="card cl09-rate">
      <h3>{t(titre)}</h3>
      <div className="rs">{tf('Deux notes séparées : le vendeur et {g}.', { g: gerant })}</div>
      <div className="rl">
        <Icone nom="package" taille={18} />
        {t('Le vendeur')}
      </div>
      {etoiles(t('Noter le vendeur'))}
      <div className="rl">
        <span className="portrait" style={{ width: '24px', height: '24px' }}>
          <Dessin id="e652c23c7243" />
        </span>
        {gerant}
      </div>
      {etoiles(tf('Noter {g}', { g: gerant }))}
      {bouton && (
        <div className="btns">
          <Link to={chemin('avis-donner', { ref: c.ref })} className="btn primary">
            <Icone nom="star" taille={18} />
            <span>{t('Donner mes notes')}</span>
          </Link>
        </div>
      )}
      <div className="rf">{t('Le commentaire est facultatif : la note seule suffit.')}</div>
    </div>
  )
  const vendeur = (jusqua: number, depuis: number) => {
    const total = FENETRE_JOURS * 864e5
    const j = Math.min(FENETRE_JOURS, Math.max(1, Math.ceil((maintenant - depuis + 1) / 864e5)))
    return (
      <div className="card cl09-sell">
        <div className="sh">
          <Icone nom="shield" taille={20} />
          <span className="grow">
            <b className="t">{t('Le vendeur n’est pas encore payé.')}</b>
            <p>
              {t('Tu as jusqu’au ')}
              <b>{jourSeul(jusqua, langue)}</b>
              {t(' pour signaler un problème ; sans action, le paiement partira automatiquement.')}
            </p>
          </span>
        </div>
        <div className="cl09-prog" role="img" aria-label={tf('Fenêtre de retour : jour {j} sur {n}', { j, n: FENETRE_JOURS })}>
          <i style={{ width: Math.round(Math.min(1, (maintenant - depuis) / total + 1 / FENETRE_JOURS) * 100) + '%' }}></i>
        </div>
        <div className="cl09-progl">
          <span>{tf('Jour {j} sur {n}', { j, n: FENETRE_JOURS })}</span>
          <span>{jourSeul(jusqua, langue)}</span>
        </div>
      </div>
    )
  }

  // Colis gardé pendant un litige ouvert au comptoir.
  if (c.etat === 'litige')
    return (
      <Ecran route="comptoir" sousTitre={c.ref}>
        <div className="cl09">
          {seg}
          <div className="cl09-okc info">
            <Icone nom="scale" taille={36} trait={2.3} />
          </div>
          <h2 className="cl09-okt">{t(c.retireeLe ? 'Colis retiré, litige en cours' : 'Colis remis, puis gardé')}</h2>
          <div className="cl09-oks">{tf('{n} colis · {l} · {d}', { n, l: t(c.lieu), d: quand(c.arriveeLe ?? c.payeeLe, maintenant, langue) })}</div>
          <div className="card info">
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <span className="portrait" style={{ width: '48px', height: '48px' }}>
                <Dessin id={litige?.preuves.find((p) => p.dessin)?.dessin ?? 'fd9a43c6de73'} />
              </span>
              <span className="grow t14" style={{ lineHeight: '1.45' }}>
                {litige?.origine === 'comptoir' ? (
                  <>
                    <b>{t('Tu as signalé « Un problème ».')}</b>
                    {tf(' {g} a photographié le déballage et gardé le colis. Dossier {id} ouvert {d} : tu n’as rien eu à remplir.', { g: gerant, id: litige.id, d: quand(litige.ouvertLe, maintenant, langue) })}
                  </>
                ) : (
                  tf('Dossier {id} ouvert{d}. Le colis et ses preuves sont gardés.', { id: c.litige ?? '', d: litige ? ' ' + quand(litige.ouvertLe, maintenant, langue) : '' })
                )}
              </span>
            </div>
            <div className="btns">
              <Link to={chemin('litige-suivi', { id: c.litige ?? '' })} className="btn primary">
                <Icone nom="scale" taille={18} />
                <span>{t('Suivre mon litige')}</span>
              </Link>
            </div>
          </div>
          <div className="note green">
            <Icone nom="shield-check" taille={18} />
            <div>
              {t('Ton paiement reste bloqué, rien n’est versé au vendeur : ')}
              <b>{F(litige?.montant ?? c.total)}&nbsp;F</b>
              {t('. Pas de frais de garde pendant le litige.')}
            </div>
          </div>
        </div>
      </Ecran>
    )

  // « Tout est en ordre » : fenêtre de retour fermée, notes.
  if (etape === 'ok')
    return (
      <Ecran route="comptoir" sousTitre={c.ref}>
        <div className="cl09">
          {seg}
          <div className="cl09-okc">
            <Icone nom="check" taille={36} trait={2.3} />
          </div>
          <h2 className="cl09-okt">{t('Tout est en ordre')}</h2>
          <div className="cl09-oks">{tf('Merci {p} · {n} colis · {l}', { p: session.client?.prenom ?? '', n, l: t(c.lieu) })}</div>
          <div className="card green cl09-sell">
            <div className="sh">
              <Icone nom="shield-check" taille={20} />
              <span className="grow">
                <b className="t">{t('Ta fenêtre de retour est fermée.')}</b>
                <p>{t('Les vendeurs seront payés dans 3 jours au plus (1 jour pour un vendeur Or ou Platine). Un vice caché reste couvert 100 jours.')}</p>
              </span>
            </div>
          </div>
          {notes('Note ton retrait', true)}
          <div className="links">
            <Link to={chemin('commandes', { onglet: 'terminees' })}>{t('Plus tard')}</Link>
          </div>
        </div>
      </Ecran>
    )

  // Colis remis (à l'instant, ou retrait déjà enregistré avec la fenêtre de retour ouverte).
  if (etape === 'remis' || c.etat === 'retiree') {
    const ouverte = c.retourJusqua !== null && c.retourJusqua > maintenant
    if (!ouverte && etape !== 'remis')
      return (
        <Ecran route="comptoir" sousTitre={c.ref}>
          <div className="cl09">
            {seg}
            <div className="empty">
              <div className="ei">
                <Icone nom="package-check" taille={26} />
              </div>
              <h3>{t('Commande déjà retirée')}</h3>
              {c.retireeLe && <p>{tf('{n} colis · {l} · {d}', { n, l: t(c.lieu), d: quand(c.retireeLe, maintenant, langue) })}</p>}
              <div className="btns">
                <Link to={chemin('commande', { ref: c.ref })} className="btn primary">
                  <span>{t('Voir la commande')}</span>
                </Link>
              </div>
            </div>
          </div>
        </Ecran>
      )
    const instant = etape === 'remis'
    const tiers = instant && !!c.delegue
    return (
      <Ecran route="comptoir" sousTitre={c.ref}>
        <div className="cl09">
          {seg}
          <div className="cl09-okc">
            <Icone nom="check" taille={36} trait={2.3} />
          </div>
          <h2 className="cl09-okt">{t('Colis remis')}</h2>
          <div className="cl09-oks">
            {tiers && (
              <>
                {t('Retirés par ')}
                <b>{c.delegue!.prenom}</b>
                {' · '}
              </>
            )}
            {tf('{n} colis · {l} · {d}', { n, l: t(c.lieu), d: quand(c.retireeLe ?? maintenant, maintenant, langue) })}
          </div>
          {tiers && (
            <div className="note ink">
              <Icone nom="bell" taille={18} />
              <div>{tf('Notification reçue : « Colis remis · {ref} retirés par {p} au {l}. » Nom saisi par {g}.', { ref: c.ref, p: c.delegue!.prenom, l: t(c.lieu), g: gerant })}</div>
            </div>
          )}
          <div className={'card cl09-open' + (instant ? ' or' : '')}>
            <div className="oh">
              <h3>{t(tiers ? 'Quand tu as tes colis en main' : instant ? 'Ouvre tes colis maintenant' : 'Tout est-il en ordre ?')}</h3>
              {instant && !tiers && (
                <span className="portrait" style={{ width: '40px', height: '40px' }}>
                  <Dessin id="02814f9138ce" />
                </span>
              )}
            </div>
            <p>
              {tiers
                ? t('Ouvre-les et dis-nous si tout est en ordre. Tu ne connais pas cette personne ? Signale-le tout de suite.')
                : instant
                  ? tf('{g} est là pour en témoigner. Un problème constaté ici se règle dix fois plus vite.', { g: gerant })
                  : t('Confirme-le : ta fenêtre de retour se ferme et le vendeur est payé plus tôt. Sinon, signale le problème.')}
            </p>
            {c.colis
              .filter((x) => !x.annule)
              .map((x) => (
                <div key={x.n} className="row" style={{ gap: 10, marginTop: 10 }}>
                  <span className="thumb" style={{ width: 44, height: 44, borderRadius: 12 }}>
                    <Dessin id={x.dessin} />
                  </span>
                  <span className="grow t13">{t(x.produit)}</span>
                </div>
              ))}
            <div className="btns">
              <button type="button" className="btn green cl09-ok" onClick={() => setEtape('ok')}>
                <span>{t('Tout est en ordre')}</span>
              </button>
              <Link to={chemin(instant ? 'litige-comptoir' : 'litige', { ref: c.ref })} className="btn danger">
                <span>{t('Un problème')}</span>
              </Link>
            </div>
            {instant && <p className="t12 c3">{t('Un problème : le gérant prend les photos et garde le colis ; ton argent reste bloqué.')}</p>}
          </div>
          {c.retourJusqua && c.retireeLe && vendeur(c.retourJusqua, c.retireeLe)}
          {notes('Comment s’est passé ce retrait ?', false)}
          {instant && (
            <div className="hint-l">
              <Icone nom="scroll-text" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
              <span>{tf('Photo de remise prise par {g}.', { g: gerant })}</span>
            </div>
          )}
          {plus}
        </div>
      </Ecran>
    )
  }

  // Pas encore au relais ou annulée.
  if (c.etat !== 'retirable' && c.etat !== 'comptoir')
    return (
      <Ecran route="comptoir" sousTitre={c.ref}>
        <div className="cl09">
          {seg}
          <div className="empty">
            <div className="ei">
              <Icone nom={c.etat === 'annulee' ? 'circle-x' : 'truck'} taille={26} />
            </div>
            <h3>{t(c.etat === 'annulee' ? 'Commande annulée' : 'Tes colis ne sont pas encore au relais')}</h3>
            <div className="btns">
              <Link to={chemin(c.etat === 'annulee' ? 'commande' : 'suivi', { ref: c.ref })} className="btn primary">
                <span>{t(c.etat === 'annulee' ? 'Voir la commande' : 'Suivre ma commande')}</span>
              </Link>
            </div>
          </div>
        </div>
      </Ecran>
    )

  return (
    <Ecran route="comptoir" sousTitre={c.ref}>
      <div className="cl09">
        {seg}
        <div className="cl09-okc or">
          <Icone nom="package" taille={36} trait={2.3} />
        </div>
        <h2 className="cl09-okt">{tf(n > 1 ? '{n} colis t’attendent' : '{n} colis t’attend', { n })}</h2>
        <div className="cl09-oks">
          {relais
            ? (() => {
                const o = ouvertureDuJour(relais, maintenant)
                return tf('{l} · {g} · {o} · {m} min à pied', { l: t(c.lieu), g: gerant, o: tf(o.texte, o.v).toLowerCase(), m: minutesAPied(relais.km) })
              })()
            : t(c.lieu)}
        </div>
        {fermeAuj && relais && (
          <div className="note or">
            <Icone nom="clock" taille={18} />
            <div>
              {tf('Le relais est fermé aujourd’hui ({f}) : ce jour ne t’est jamais facturé. Reviens aux heures d’ouverture : {h}.', { f: t(relais.ferme), h: t(relais.horaires) })}
              {ech ? ' ' + tf('Dernier jour pour retirer : {d}.', { d: jourSeul(ech.dernier.le, langue) }) : ''}
            </div>
          </div>
        )}
        <div className="sec">
          <h2>{t('Au comptoir, en moins d’une minute')}</h2>
        </div>
        <div className="card">
          <div className="cl09-step">
            <span className="k">{'1'}</span>
            <div className="grow">
              <div className="t">{t('Montre ton code ou ton QR')}</div>
              <div className="s">
                {tf('{g} le tape ou le scanne. Il ne te demande jamais ton code secret Mobile Money.', { g: gerant })}{' '}
                {valeur >= 100000 ? t('Commande de 100 000 F ou plus : la personne qui retire montre sa pièce d’identité.') : t('Le code vaut le colis : aucune pièce d’identité.')}
              </div>
              <Link to={chemin('code', { ref: c.ref })} className="btn primary">
                <Icone nom="qr-code" taille={18} />
                <span>{t('Afficher mon code')}</span>
              </Link>
            </div>
          </div>
          <div className="cl09-step">
            <span className="k">{'2'}</span>
            <div className="grow">
              <div className="t">{du > 0 ? tf('Paie le montant dû sur ton téléphone : {m} F', { m: F(du) }) : t('Rien à payer aujourd’hui')}</div>
              <div className="s">{t('En Mobile Money. Aucune espèce au comptoir.')}</div>
              {du > 0 && (
                <Link to={chemin('comptoir-payer', { ref: c.ref })} className="btn soft sm">
                  <span>{tf('Payer {m} F', { m: F(du) })}</span>
                </Link>
              )}
            </div>
          </div>
          <div className="cl09-step">
            <span className="k">{'3'}</span>
            <div className="grow">
              <div className="t">{n === 1 ? tf('{g} sort ton colis et prend une photo', { g: gerant }) : tf('{g} sort tes {n} colis et prend une photo', { g: gerant, n })}</div>
              <div className="s">{n === 1 ? t('1 colis annoncé, 1 colis remis.') : tf('{n} colis annoncés, {n} colis remis.', { n })}</div>
            </div>
          </div>
          <div className="cl09-step">
            <span className="k">{'4'}</span>
            <div className="grow">
              <div className="t">{t('Ouvre tes colis devant le gérant')}</div>
              <div className="s">{t('Un problème constaté ici se règle dix fois plus vite.')}</div>
            </div>
          </div>
        </div>
        {du === 0 && (
          <div className="btns mt16">
            <button type="button" className="btn primary" onClick={() => source.confirmerRetrait(c.ref).then(charger).then(() => setEtape('remis'))}>
              <Icone nom="package-check" taille={18} />
              <span>{t('Le gérant m’a remis mes colis')}</span>
            </button>
          </div>
        )}
        <details className="more">
          <summary>
            <Icone nom="users" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
            <span className="grow">{t('Si quelqu’un retire pour toi')}</span>
            <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
          </summary>
          <div className="more-b">
            <p>
              {c.delegue
                ? tf('{p} a reçu son propre code par SMS. {g} saisit son nom au retrait et tu es prévenue à l’instant.', { p: c.delegue.prenom, g: gerant })
                : tf('Nomme-la depuis l’écran du code : elle reçoit son propre code par SMS. {g} saisit son nom au retrait et tu es prévenue à l’instant.', { g: gerant })}
            </p>
            <p>{t('Pour un colis de 100 000 F ou plus, nomme la personne à l’avance : elle montre sa pièce d’identité.')}</p>
            <Link to={chemin('code-partage', { ref: c.ref })} className="cl09-link mt4">
              {t(c.delegue ? 'Retrait confié' : 'Faire retirer par quelqu’un')}
              <Icone nom="chevron-right" taille={15} />
            </Link>
          </div>
        </details>
        <details className="more">
          <summary>
            <Icone nom="circle-help" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
            <span className="grow">{t('Un souci au comptoir')}</span>
            <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
          </summary>
          <div className="more-b">
            <p>
              <b>{t('Code refusé')}</b>
              {t(' : vérifie les 6 chiffres. Après 3 codes faux, le code est bloqué 24 h et tu demandes un nouveau code dans l’application.')}
            </p>
            <p>
              <b>{t('Le paiement n’arrive pas')}</b>
              {t(' : rien n’est débité tant que tu n’as pas validé ; renvoie la demande ou change de moyen depuis l’écran de paiement.')}
            </p>
            <p>
              <b>{t('Un colis manque')}</b>
              {tf(' : {n} colis sont annoncés. S’il en manque un ou s’il est abîmé, ne confirme pas le retrait : ouvre un litige au comptoir, le gérant prend les photos.', { n })}{' '}
              <Link to={chemin('litige-comptoir', { ref: c.ref })}>{t('Ouvrir un litige au comptoir')}</Link>
            </p>
            <p>
              <b>{t('Le relais est fermé ou le gérant absent')}</b>
              {t(' : écris au support, BelivaY joint le relais pour toi. Le numéro du gérant n’est jamais affiché.')}
            </p>
            <Link to={chemin('fil', { id: 'support', st: 'nouveau', sujet: 'Retrait et code', commande: c.ref })} className="cl09-link mt4">
              {t('Écrire au support')}
              <Icone nom="chevron-right" taille={15} />
            </Link>
          </div>
        </details>
      </div>
    </Ecran>
  )
}
