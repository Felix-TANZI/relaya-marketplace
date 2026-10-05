// Écran « Écran verrouillé » (CL-10), forme d'origine du prototype rendue réelle (DP-54) : les notifications non
// lues telles qu'elles arrivent sur l'écran verrouillé (heure et date du jour), sans code ni montant de commande ;
// deux nouvelles d'une même commande à moins de 10 minutes n'en font qu'une (« 2 mises à jour ») ; entre 21 h et
// 7 h, mode nuit : sans son, sauf alerte critique (incident, paiement) ; déverrouiller montre la dernière en
// bannière ; la série des rappels de garde de chaque commande au relais, calculée (arrivée, rappels, dernier jour,
// jour de fermeture jamais facturé, renvoi au vendeur et retenue). Toucher une notification ouvre son écran.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import img_0718fddbf299_png from '../../assets/prototype/0718fddbf299.png'
import { Ecran } from '../../composants/coque'
import { useDes } from '../../composants/ecran'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { source, type CommandeClient, type NotificationClient, type Relais } from '../../donnees/source'
import { F } from '../../i18n/format'
import { dateA, heureSeule, jourSeul } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { echeancier, RENVOI_GARDE, tarifGarde } from '../CL-09/Commun'

const GROUPE_MIN = 10 // deux nouvelles d'une même commande à moins de 10 minutes : une seule notification
const CRITIQUES = ['Incident', 'Paiement'] // seules alertes qui sonnent la nuit
// Sur l'écran verrouillé : jamais de montant ni de code (les phrases qui en portent sont retirées).
const prudent = (s: string) =>
  s
    .replace(/[^.]*\d[\d\s  ]*F\b[^.]*\.?\s*/g, '')
    .replace(/\b\d{6}\b/g, '••••••')
    .trim()
const refDe = (n: NotificationClient) => /ref=([A-Z]+-\d+)/.exec(n.lien)?.[1] ?? /(BLV-\d+)/.exec(n.titre)?.[1] ?? n.id
const yaounde = (ms: number) => new Date(ms + 3600e3)
const aHeure = (ms: number, h: number) => Math.floor((ms + 3600e3) / 864e5) * 864e5 - 3600e3 + h * 3600e3

export function Push() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const [d, setD] = useState<{ notifications: NotificationClient[]; maintenant: number } | null>(null)
  const [cs, setCs] = useState<CommandeClient[]>([])
  const [relais, setRelais] = useState<Relais[]>([])
  const [ouvert, setOuvert] = useState(false) // téléphone déverrouillé : bannière
  const colonnes = useDes('tab-l')
  useEffect(() => {
    source.notificationsClient().then(setD)
    source.commandes().then((x) => setCs(x.commandes))
    source.relaisListe().then((x) => setRelais(x.relais))
  }, [])
  const serieRef = params.get('ref')
  useEffect(() => {
    if (serieRef && cs.length) document.getElementById('serie-' + serieRef)?.scrollIntoView({ block: 'start' })
  }, [serieRef, cs.length])
  if (!d) return null
  const maintenant = d.maintenant
  const h = yaounde(maintenant).getUTCHours()
  // « Voir l'aperçu » des réglages (?st=nuit) : l'écran verrouillé tel qu'il est la nuit, à toute heure.
  const nuit = params.get('st') === 'nuit' || h >= 21 || h < 7
  // Non lues, regroupées par commande à moins de 10 minutes.
  const groupes: NotificationClient[][] = []
  for (const n of d.notifications.filter((x) => !x.lu).sort((a, b) => b.le - a.le)) {
    const g = groupes.find((x) => refDe(x[0]) === refDe(n) && Math.abs(x[x.length - 1].le - n.le) < GROUPE_MIN * 60e3)
    if (g) g.push(n)
    else groupes.push([n])
  }
  const horloge = `${String(h).padStart(2, '0')}:${String(yaounde(maintenant).getUTCMinutes()).padStart(2, '0')}`
  const jour = new Date(maintenant).toLocaleDateString(langue === 'en' ? 'en-GB' : 'fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Douala' })
  const push = (g: NotificationClient[], hl: boolean, quand?: string) => {
    const n = g[0]
    const corps = prudent(t(n.texte))
    return (
      <Link key={n.id} to={n.lien} className="cl10-pl">
        <div className={'push' + (hl ? ' hl' : '')}>
          <span className="pi">
            <img src={img_0718fddbf299_png} alt="" />
          </span>
          <div className="grow">
            <div className="cl10-pa">
              <span>{t('BelivaY')}</span>
              <span className="grow"></span>
              <span className="pw">{quand ?? heureSeule(n.le, langue)}</span>
            </div>
            <div className="pt">{prudent(t(n.titre))}</div>
            {corps && <div className="pb">{corps}</div>}
            {(g.length > 1 || (nuit && !CRITIQUES.includes(n.type))) && (
              <div className="cl10-pn">
                {g.length > 1 &&
                  g
                    .slice()
                    .reverse()
                    .map((x) => <span key={x.id}>{tf('{t} · {h}', { t: prudent(t(x.titre)).split(' · ')[0], h: heureSeule(x.le, langue) })}</span>)}
                {nuit && !CRITIQUES.includes(n.type) && (
                  <span>
                    <Icone nom="bell-off" taille={12} />
                    {t('Arrivée sans son')}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </Link>
    )
  }

  // Série des rappels de garde d'une commande au relais.
  const serie = (c: CommandeClient) => {
    const r = relais.find((x) => x.nom === c.lieu)
    const e = echeancier(c, maintenant, r?.ferme ?? null)
    const n = e.n
    const limite = jourSeul(e.dernier.le, langue)
    const renvoi = tf('sinon renvoi (+ {m} F)', { m: F(RENVOI_GARDE) })
    const pastille = (texte: string, ton = 'ink') => <span className={'pill ' + ton + ' sm'}>{t(texte)}</span>
    const mp = (titre: string, texte: string) => (
      <div className="cl10-mp">
        <span className="pi">
          <img src={img_0718fddbf299_png} alt="" />
        </span>
        <div className="grow">
          <div className="pt">{titre}</div>
          <div className="pb">{texte}</div>
        </div>
      </div>
    )
    return (
      <section key={c.ref} id={'serie-' + c.ref}>
        <div className="pg">
          <h1 className="pg-t">{tf('Tes rappels · {ref}', { ref: c.ref })}</h1>
          <p className="pg-s">{t('Chacun dit le montant dû, le prochain palier et ce qui arrive sinon.')}</p>
        </div>
        <div className="cl10-tl">
          {e.jours.map((x) => {
            const cls = x.ferme ? 'skip' : x.j < e.jour ? 'done' : x.j === e.jour ? 'now' : ''
            const lendemain = e.jours[x.j]
            if (x.ferme)
              return (
                <div key={x.j} className={'ti ' + cls}>
                  <div className="th">
                    {jourSeul(x.le, langue) + ' '}
                    {pastille('Aucun rappel')}
                  </div>
                  <div className="tsm">{t('Relais fermé : jour jamais facturé.')}</div>
                </div>
              )
            if (x.j === 1)
              return (
                <div key={x.j} className={'ti ' + cls}>
                  <div className="th">
                    {(c.arriveeLe ? dateA(c.arriveeLe, langue) : jourSeul(x.le, langue)) + ' '}
                    {pastille('Arrivée')}
                  </div>
                  {mp(
                    t('Ton code de retrait est disponible'),
                    e.gros
                      ? tf('{ref} · tes {n} colis sont au {l}. Garde : {a} F aujourd’hui (gros colis), {m} F par jour dès demain.', { ref: c.ref, n, l: t(c.lieu), a: F(tarifGarde(1, true)), m: F(tarifGarde(2, true)) })
                      : tf('{ref} · tes {n} colis sont au {l}. Gratuit aujourd’hui, {m} F par jour dès demain.', { ref: c.ref, n, l: t(c.lieu), m: F(tarifGarde(2, false)) }),
                  )}
                  <div className="tsm">{t(e.gros ? 'Jour 1 : 300 F pour un gros colis. Le code arrive aussi par SMS.' : 'Jour 1, gratuit. Le code arrive aussi par SMS.')}</div>
                </div>
              )
            if (x.j === e.jour)
              return (
                <div key={x.j} className="ti now">
                  <div className="th">
                    {tf('{d} · aujourd’hui ', { d: jourSeul(x.le, langue) })}
                    {pastille('Pas de rappel', 'or')}
                  </div>
                  <div className="tsm">{tf('Montant dû : {m} F, dans l’application et au comptoir.', { m: F(c.garde?.du ?? x.cumul) })}</div>
                </div>
              )
            if (x.j === e.dernier.j)
              return (
                <div key={x.j} className={'ti ' + cls}>
                  <div className="th">
                    {dateA(aHeure(x.le, 8), langue) + ' '}
                    {pastille('Notification')}
                  </div>
                  {mp(
                    tf('Dernier jour · {ref}', { ref: c.ref }),
                    lendemain?.ferme
                      ? tf('Montant dû : {m} F. Relais fermé demain : retire avant {h}, sinon renvoi au vendeur {d} (+ {r} F).', { m: F(x.cumul), h: r ? (r.horaires.split('–')[1] ?? '').trim() : '', d: jourSeul(e.renvoi, langue), r: F(RENVOI_GARDE) })
                      : tf('Montant dû : {m} F. Retire aujourd’hui, sinon renvoi au vendeur {d} (+ {r} F).', { m: F(x.cumul), d: jourSeul(e.renvoi, langue), r: F(RENVOI_GARDE) }),
                  )}
                  {lendemain?.ferme && <div className="tsm">{tf('Le relais est fermé le {f} : {d} est le dernier jour.', { f: t(r?.ferme ?? ''), d: jourSeul(x.le, langue) })}</div>}
                </div>
              )
            if (x.j === 2 || x.j === 3 || x.j === 5)
              return (
                <div key={x.j} className={'ti ' + cls}>
                  <div className="th">
                    {dateA(aHeure(x.le, 18), langue) + ' '}
                    {pastille(x.j === 2 ? 'Notification' : 'SMS')}
                  </div>
                  {x.j === 2 ? (
                    <a
                      href={chemin('push')}
                      className="cl10-pl"
                      onClick={(ev) => {
                        ev.preventDefault()
                        setOuvert(true)
                        window.scrollTo({ top: 0 })
                      }}
                    >
                      {mp(tf('Rappel · {ref}', { ref: c.ref }), tf('Montant dû : {m} F. {s} F demain. Retrait avant {d} au soir, {r}.', { m: F(x.cumul), s: F(lendemain?.cumul ?? x.cumul), d: limite, r: renvoi }))}
                    </a>
                  ) : (
                    <Link to={chemin('sms')} className="cl10-pl">
                      <div className="sms cl10-bub">
                        <span>{tf('{ref}, {l}. Montant du : {m} F. {s} F demain. Retrait avant {d} au soir, sinon renvoi au vendeur (+{r} F).', { ref: c.ref, l: c.lieu, m: F(x.cumul), s: F(lendemain?.cumul ?? x.cumul), d: limite, r: F(RENVOI_GARDE) })}</span>
                      </div>
                    </Link>
                  )}
                </div>
              )
            return (
              <div key={x.j} className={'ti ' + cls}>
                <div className="th">
                  {jourSeul(x.le, langue) + ' '}
                  {pastille('Aucun rappel')}
                </div>
                <div className="tsm">{tf('Montant dû ce jour-là : {m} F.', { m: F(x.cumul) })}</div>
              </div>
            )
          })}
          <div className="ti ">
            <div className="th">
              {tf('{d} · au départ du colis ', { d: jourSeul(e.renvoi, langue) })}
              {pastille('Notification')}
            </div>
            {mp(
              tf('Colis renvoyé au vendeur · {ref}', { ref: c.ref }),
              tf('Frais retenus : {m} F (garde {g} F + renvoi {r} F). Ton solde est remboursé sur ton Mobile Money.', { m: F(e.retenue), g: F(e.jours[6].cumul), r: F(RENVOI_GARDE) }),
            )}
            <div className="tsm">{t('Seulement si tes colis n’ont pas été retirés. Ton retrait annule les rappels prévus.')}</div>
          </div>
        </div>
        <div className="card tight">
          {[
            { vers: chemin(c.etat === 'comptoir' && c.comptoir?.du ? 'comptoir-payer' : 'code', { ref: c.ref }), ic: 'qr-code', lt: 'Retirer mes colis', ls: tf('{l} · {h} · avant {d} au soir', { l: t(c.lieu), h: r ? t(r.horaires) : '', d: limite }) },
            { vers: chemin('garde', { ref: c.ref }), ic: 'clock', lt: 'Détail des frais de garde', ls: tf('{m} F dus aujourd’hui', { m: F((c.garde?.du ?? 0) + (c.comptoir?.du ?? 0)) }) },
            { vers: chemin('code-partage', { ref: c.ref }), ic: 'user-plus', lt: 'Je ne peux pas passer', ls: t('Fais retirer par quelqu’un : il reçoit son propre code') },
          ].map((x) => (
            <Link key={x.lt} to={x.vers} className="li">
              <span className="ic">
                <Icone nom={x.ic} taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ display: 'block' }}>
                  {t(x.lt)}
                </span>
                <span className="ls" style={{ display: 'block' }}>
                  {x.ls}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
          ))}
        </div>
      </section>
    )
  }
  const auRelais = cs.filter((c) => c.garde && (c.etat === 'retirable' || c.etat === 'comptoir') && (!serieRef || c.ref === serieRef))
  const premier = groupes[0]

  const ouvre = ouvert && !!premier
  const telephone = ouvre ? (
    <div className={'cl10-ph' + (nuit ? ' night' : '')}>
      <div className="cl10-stack" style={{ marginTop: '0' }}>
        {premier && push(premier, true, t('maintenant'))}
      </div>
      <div className="cl10-apps">
        {Array.from({ length: 12 }, (_, i) => (
          <i key={i}></i>
        ))}
      </div>
    </div>
  ) : (
    <div className={'cl10-ph' + (nuit ? ' night' : '')}>
      <button type="button" className="lk" aria-label={t('Déverrouiller')} onClick={() => setOuvert(true)} disabled={!premier} style={{ border: 0, background: 'none', color: 'inherit' }}>
        <Icone nom="lock" taille={18} />
      </button>
      <div className="cl10-clock">{horloge}</div>
      <div className="cl10-date">{jour}</div>
      {nuit && (
        <div className="cl10-focus">
          <span>
            <Icone nom="moon" taille={14} />
            {t('Nuit · 21 h – 7 h')}
          </span>
        </div>
      )}
      <div className="cl10-stack">{groupes.slice(0, 5).map((g, i) => push(g, i === 0))}</div>
      {!groupes.length && <p className="cl10-date">{t('Aucune notification.')}</p>}
    </div>
  )
  const aide = ouvre ? (
    <>
      <div className="hint-l">
        <Icone nom="hourglass" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t('Téléphone déverrouillé : la notification arrive en bannière. Touche-la pour ouvrir l’écran qu’elle annonce.')}</span>
      </div>
      <div className="links">
        <a
          href={chemin('push')}
          onClick={(e) => {
            e.preventDefault()
            setOuvert(false)
          }}
        >
          {t('Verrouiller')}
        </a>
      </div>
    </>
  ) : (
    <>
      <div className="hint-l">
        <Icone nom="lock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t('Aucun code, aucun montant de commande sur l’écran verrouillé. Touche une notification pour ouvrir l’écran qu’elle annonce.')}</span>
      </div>
      <div className="hint-l">
        <Icone nom={groupes.some((g) => g.length > 1) ? 'layers' : 'moon'} taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{tf('Deux nouvelles d’une même commande à moins de {m} minutes : une seule notification. La nuit, sans son, sauf alerte critique.', { m: GROUPE_MIN })}</span>
      </div>
    </>
  )
  const suite = (
    <>
      {auRelais.map(serie)}
      <div className="links">
        <Link to={chemin('notifs-reglages')}>{t('Régler mes notifications')}</Link>
      </div>
    </>
  )
  return (
    <Ecran route="push" largeur={colonnes ? 'moyen' : undefined}>
      {colonnes ? (
        // Grands écrans (§ 5.9) : l'écran verrouillé dans un cadre de téléphone ; à côté, ce que tu reçois et quand.
        <div className="cl10-cadre">
          {telephone}
          <div className="cl10-expl">
            <h2 className="cl10-expl-t">{t('Ce que tu reçois et quand')}</h2>
            {aide}
            {suite}
          </div>
        </div>
      ) : (
        <>
          {telephone}
          {aide}
          {suite}
        </>
      )}
    </Ecran>
  )
}
