// Écran « SMS » (CL-10), forme d'origine du prototype rendue réelle (DP-54) : la conversation SMS de BelivaY telle
// que le téléphone l'affiche, construite à partir des commandes du compte, quand l'application est fermée :
// paiement protégé (commandes en cours), arrivée avec le code et le lien court, montant dû au comptoir, rappel de garde (montant,
// palier, date limite, renvoi), retrait (noter, signaler avant la fin du délai), annulation remboursée ; le code de
// vérification. Sans accents (SMS GSM), 160 caractères visés ; on ne peut pas y répondre. Toucher un message plus
// ancien le met en avant ; les liens du message en avant s'ouvrent (lien court, avis).
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { Fragment, useEffect, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import img_0718fddbf299_png from '../../assets/prototype/0718fddbf299.png'
import { Ecran } from '../../composants/coque'
import { useDes } from '../../composants/ecran'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { source, type CommandeClient, type NotificationClient, type Relais } from '../../donnees/source'
import { F } from '../../i18n/format'
import { dateHeure, jourSeul } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { echeancier, enCours, grosColis, jeton, RENVOI_GARDE, tarifGarde } from '../CL-09/Commun'

const sansAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/’/g, "'")

interface UnSms {
  le: number | null
  texte: string // avant le lien
  lien?: { texte: string; vers: string }
  suite?: string // après le lien
}

export function Sms() {
  const { t, tf, langue } = usePreferences()
  const session = useSession()
  const [d, setD] = useState<{ commandes: CommandeClient[]; maintenant: number } | null>(null)
  const [notifs, setNotifs] = useState<NotificationClient[]>([])
  const [relais, setRelais] = useState<Relais[]>([])
  const [sel, setSel] = useState<number | null>(null)
  const colonnes = useDes('tab-l')
  const [params] = useSearchParams()
  const ref = params.get('ref') // depuis une commande : son dernier SMS est mis en avant
  useEffect(() => {
    source.commandes().then(setD)
    source.notificationsClient().then((x) => setNotifs(x.notifications))
    source.relaisListe().then((x) => setRelais(x.relais))
  }, [])
  if (!d) return null
  const horaires = (lieu: string) => {
    const r = relais.find((x) => x.nom === lieu)
    if (!r) return ''
    return ` (${r.horaires.replace(/\s/g, '').replace('–', '-')}, ferme ${r.ferme.slice(0, 3)}.)`
  }
  const sms: UnSms[] = [{ le: null, texte: 'Ton code de verification BelivaY : 480527. Ne le donne a personne, BelivaY ne te le demandera jamais.' }]
  for (const c of d.commandes) {
    const n = c.colis.filter((x) => !x.annule).length
    const r = relais.find((x) => x.nom === c.lieu)
    // Garde annoncée à l'arrivée : gratuite le 1er jour, sauf gros colis (+ 300 F dès le 1er jour, DP-08).
    const gros = grosColis(c)
    const garde1 = gros ? `Garde ${F(tarifGarde(1, true))} F aujourd'hui (gros colis), ${F(tarifGarde(2, true))} F/jour des demain.` : `Gratuit aujourd'hui, ${F(tarifGarde(2, false))} F/jour des demain.`
    if (enCours(c) && c.etat !== 'comptoir') sms.push({ le: c.payeeLe, texte: `Paiement protege pour ${c.ref} : ton argent reste bloque jusqu'a ton retrait au ${c.lieu}. On te previent des que tes colis arrivent.` })
    if (c.etat === 'retirable' && c.code && c.arriveeLe)
      sms.push({
        le: c.arriveeLe,
        texte: `Tes ${n} colis ${c.ref} sont au ${c.lieu}${horaires(c.lieu)}. ${garde1} Code de retrait ${c.code} : `,
        lien: { texte: 'belivay.com/r/' + jeton(c.ref), vers: chemin('lien-court', { ref: c.ref }) },
      })
    if (c.etat === 'comptoir')
      sms.push({ le: c.arriveeLe ?? c.payeeLe, texte: `Ta commande ${c.ref} est au ${c.lieu}${horaires(c.lieu)}. Montant du au retrait : ${F(c.comptoir?.du ?? 0)} F en Mobile Money. ${garde1}` })
    // Rappel de garde (envoyé par SMS) : montant dû, demain, date limite, renvoi.
    const rappel = notifs.find((x) => x.sms && x.lien.includes(c.ref) && x.titre.startsWith('Rappel'))
    if (rappel && c.garde) {
      const e = echeancier(c, d.maintenant, r?.ferme ?? null)
      sms.push({ le: rappel.le, texte: `${c.ref}, ${c.lieu}. Montant du : ${F(c.garde.du)} F. ${F(c.garde.demain)} F demain. Retrait avant ${jourSeul(e.dernier.le, 'fr')} au soir, sinon renvoi au vendeur (+${F(RENVOI_GARDE)} F).` })
    }
    if (c.etat === 'retiree' && c.retireeLe && c.retourJusqua && c.retourJusqua > d.maintenant)
      sms.push({
        le: c.retireeLe + 3600e3,
        texte: `Merci ${session.client?.prenom ?? ''} ! ${c.ref} retiree au ${c.lieu}. Note le vendeur et le relais : `,
        lien: { texte: 'belivay.com/a/' + jeton(c.ref + 'a'), vers: chemin('avis-donner', { ref: c.ref }) },
        suite: `. Un probleme ? Signale-le avant le ${jourSeul(c.retourJusqua, 'fr')}.`,
      })
    if (c.etat === 'annulee' && c.annulee) sms.push({ le: c.annulee.le, texte: `${c.ref} : commande annulee, remboursement integral de ${F(c.annulee.rembourse)} F aujourd'hui.` })
  }
  sms.sort((a, b) => (a.le ?? 0) - (b.le ?? 0))
  const deLaCommande = ref ? sms.map((s, i) => (s.texte.includes(ref) ? i : -1)).filter((i) => i >= 0).pop() : undefined
  const choisi = sel ?? deLaCommande ?? sms.length - 1
  const longueur = (s: UnSms) => sansAccents(s.texte + (s.lien?.texte ?? '') + (s.suite ?? '')).length
  const corps = (s: UnSms, liens: boolean): ReactNode => (
    <>
      <span>{sansAccents(s.texte)}</span>
      {s.lien &&
        (liens ? (
          <Link to={s.lien.vers}>
            <u>{s.lien.texte}</u>
          </Link>
        ) : (
          <u>{s.lien.texte}</u>
        ))}
      {s.suite && <span>{sansAccents(s.suite)}</span>}
    </>
  )
  // Grands écrans (§ 5.9) : la conversation dans un cadre de téléphone ; à côté, ce que tu reçois et quand.
  const telephone = (
    <>
      <div className="cl10-sa">
        <div className="cl10-sa-h">
          <Link to={chemin('notifs-reglages')} className="cl10-sa-b0" aria-label={t('Revenir')}>
            <Icone nom="chevron-left" taille={22} />
          </Link>
          <span className="cl10-av">
            <img src={img_0718fddbf299_png} alt="" />
          </span>
          <div className="grow">
            <b>{t('BelivaY')}</b>
            <span>{t('SMS')}</span>
          </div>
        </div>
        <div className="cl10-sa-b">
          {sms.map((s, i) => (
            <Fragment key={i}>
              {i === choisi ? (
                <>
                  {s.le && <div className="cl10-when">{dateHeure(s.le, langue)}</div>}
                  <div className="sms cl10-bub hl">{corps(s, true)}</div>
                  <div className="cl10-when">{tf('{n} caractères', { n: longueur(s) })}</div>
                </>
              ) : (
                <a
                  href={chemin('sms')}
                  className="cl10-prev"
                  aria-label={t('Message précédent')}
                  onClick={(e) => {
                    e.preventDefault()
                    setSel(i)
                  }}
                >
                  {s.le && <div className="cl10-when">{dateHeure(s.le, langue)}</div>}
                  <div className="sms cl10-bub">{corps(s, false)}</div>
                </a>
              )}
            </Fragment>
          ))}
        </div>
        <div className="cl10-sa-f">{t('Impossible de répondre à cet expéditeur.')}</div>
      </div>
    </>
  )
  const aide = (
    <>
      <p className="t13 c3 mt12">{t('Les SMS partent seulement quand c’est vital et que l’application est fermée : 6 au plus par commande, jamais de publicité.')}</p>
      {d.commandes.some((c) => c.code && (c.etat === 'retirable' || c.etat === 'comptoir')) && (
        <div className="card tight">
          {d.commandes
            .filter((c) => c.code && (c.etat === 'retirable' || c.etat === 'comptoir'))
            .map((c) => (
              <Link key={c.ref} to={chemin('code', { ref: c.ref })} className="li">
                <span className="ic">
                  <Icone nom="message-square" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ display: 'block' }}>
                    {tf('SMS perdu ? Code de {ref}', { ref: c.ref })}
                  </span>
                  <span className="ls" style={{ display: 'block' }}>
                    {t('Affiche-le dans l’application ou fais-le renvoyer par SMS (3 fois par 24 h)')}
                  </span>
                </span>
                <span className="chev">
                  <Icone nom="chevron-right" taille={18} />
                </span>
              </Link>
            ))}
        </div>
      )}
      <div className="note red">
        <Icone nom="shield-alert" taille={18} />
        <div>
          {t('Un SMS qui te demande ton code de retrait, ton code secret Mobile Money ou de l’argent ne vient pas de BelivaY.')}{' '}
          <Link to={chemin('fil', { id: 'support', st: 'nouveau', sujet: 'Arnaque' })}>{t('Signaler un message suspect')}</Link>
        </div>
      </div>
      <div className="links">
        <Link to={chemin('notifs-reglages')}>{t('Régler mes notifications')}</Link>
      </div>
    </>
  )
  return (
    <Ecran route="sms" largeur={colonnes ? 'moyen' : undefined}>
      {colonnes ? (
        <div className="cl10-cadre">
          {telephone}
          <div className="cl10-expl">
            <h2 className="cl10-expl-t">{t('Ce que tu reçois et quand')}</h2>
            {aide}
          </div>
        </div>
      ) : (
        <>
          {telephone}
          {aide}
        </>
      )}
    </Ecran>
  )
}
