// Écran « Parrainer un proche » (CL-14), forme d'origine du prototype rendue réelle (DP-54) : le bandeau de nuit
// (la récompense ; celle qui vient d'être gagnée ; le maximum du mois atteint), ton lien à copier ou à partager
// depuis ton téléphone (WhatsApp, SMS ; BelivaY ne relance jamais tes proches), les récompenses du mois (3 au
// plus) avec leur barre, tes proches inscrits et où ils en sont, « Comment ça marche » replié. Règle : 1 mois
// d'abonnement offert par proche dont la première commande est payée puis retirée (source.prime()).
// Échanges (DP-54) : « Ton proche est-il déjà sur BelivaY ? » par son numéro : déjà inscrit, il rejoint tes proches
// (listes, cadeaux, panier envoyé) ; sinon, ton lien lui part par SMS, depuis ton téléphone.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { chemin } from '../../config/pages'
import { chiffres, espacer } from '../../donnees/numeros'
import { source } from '../../donnees/source'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { INTERRUPTEURS_DU_LANCEMENT } from '../../config/interrupteurs'
import { dateLongue } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { palier } from '../../donnees/prime'
import { Bloc, nomPalier, usePrime } from './Commun'

const MAX = 3
const MOIS = {
  fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
}

export function Parrainage() {
  const { t, tf, langue } = usePreferences()
  const [d] = usePrime()
  const [copie, setCopie] = useState(false)
  const [numero, setNumero] = useState('')
  const [trouve, setTrouve] = useState<{ ok: true; prenom: string } | { ok: false; texte: string; sms?: string } | null>(null)
  if (!d) return null
  const pr = d.parrainage
  const lien = 'https://' + pr.lien
  const texte = tf('Je fais mes achats sur BelivaY : paiement protégé, retrait au relais près de chez toi. Inscris-toi avec mon lien : {l}', { l: lien })
  const copier = () => {
    navigator.clipboard?.writeText(lien).catch(() => {})
    setCopie(true)
  }
  const partager = async () => {
    try {
      if (navigator.share) await navigator.share({ title: 'BelivaY', text: texte, url: lien })
      else copier()
    } catch {
      // Partage annulé.
    }
  }
  // Le mois en cours (heure de Yaoundé = UTC+1, sans incidence sur le jour du mois ici) : dernier jour, mois suivant.
  const m = new Date(d.maintenant)
  const finMois = Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 0, 12)
  const debutSuivant = Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 1, 12)
  const debutMois = Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), 1)
  const n = Math.min(pr.recompensesMois, MAX)
  const limite = n >= MAX
  const recente = pr.filleuls.filter((f) => f.etat === 'retiree' && f.le >= debutMois).sort((a, b) => b.le - a.le)[0]
  const ab = d.actif ? d.abonnement : null
  // Mois offerts par proche selon le palier (donnees/prime.ts : Plus et Prime 1, Prime Duo 2, Business 3).
  const parProche = ab && ab.palier !== 'pass' ? (palier(ab.palier)?.parrainage ?? 1) : 1
  const recompense = ab && ab.palier !== 'pass' ? (parProche > 1 ? tf('{n} mois de {p} offerts', { n: parProche, p: t(nomPalier(ab.palier)) }) : tf('1 mois de {p} offert', { p: t(nomPalier(ab.palier)) })) : t('1 mois d’abonnement offert')
  const prochain = ab?.prochain ? (
    <>
      <div className="hline"></div>
      <div className="hs">
        {t('Ton prochain prélèvement : ')}
        <b>{dateLongue(ab.prochain, langue)}</b>
      </div>
    </>
  ) : null
  return (
    <Ecran route="parrainage" gabarit="compte">
      <Styles id="02f3dac5cd" />
      {!INTERRUPTEURS_DU_LANCEMENT['FF-ABONNEMENT'] && (
        <div className="cl14-top">
          <span className="cl14-ff">
            <Icone nom="lock" taille={13} />
            {t('Après le lancement · interrupteur fermé')}
          </span>
          <span className="cl14-ffc">{t('FF-ABONNEMENT')}</span>
        </div>
      )}
      <Bloc classe="g5-duo">
      <Bloc classe="g5-g">
      {limite ? (
        <div className="hero night">
          <div className="hk">{tf('Parrainage · {m}', { m: MOIS[langue][m.getUTCMonth()] })}</div>
          <div className="big cl14-ht">{tf('{n} sur {m} ce mois-ci', { n, m: MAX })}</div>
          <div className="hs">{tf('C’est le maximum. Tes proches peuvent toujours s’inscrire avec ton lien ; les récompenses reprennent le {d}.', { d: dateLongue(debutSuivant, langue) })}</div>
          {prochain}
        </div>
      ) : recente ? (
        <div className="hero night">
          <div className="hk">{t('Parrainage')}</div>
          <div className="big cl14-ht">{recompense}</div>
          <div className="hs">{tf('{p} a retiré sa première commande : 1 mois gagné. Chaque mois gagné reporte ton prochain prélèvement d’un mois.', { p: recente.prenom })}</div>
          {prochain}
        </div>
      ) : (
        <div className="hero night">
          <div className="hk">{t('Parrainage')}</div>
          <div className="big cl14-ht">{recompense}</div>
          <div className="hs">
            {t('pour chaque proche dont la première commande est ')}
            <b>{t('payée et retirée')}</b>
            {tf('. {n} récompenses par mois au plus.', { n: MAX })}
          </div>
        </div>
      )}
      <div className="cl14-link">
        <Icone nom="link" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
        <span className="grow">{pr.lien}</span>
        <a href="#" className="t13 b7 cor" role="button" onClick={(e) => (e.preventDefault(), copier())}>
          {t(copie ? 'Lien copié' : 'Copier')}
        </a>
      </div>
      <div className="btns">
        <button type="button" className="btn primary" onClick={partager}>
          <Icone nom="share" taille={18} />
          <span>{t('Partager mon lien')}</span>
        </button>
      </div>
      <div className="chips">
        <a className="chip" href={'https://wa.me/?text=' + encodeURIComponent(texte)} target="_blank" rel="noreferrer">
          {t('WhatsApp')}
        </a>
        <a className="chip" href={'sms:?&body=' + encodeURIComponent(texte)}>
          {t('SMS')}
        </a>
      </div>
      <div className="hint-l">
        <Icone nom="send" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t('Le lien part de ton téléphone : WhatsApp, SMS ou autre. BelivaY ne relance jamais tes proches.')}</span>
      </div>
      <div className="fld blv-proche-num">
        <label htmlFor="pa-num">{t('Ton proche est-il déjà sur BelivaY ?')}</label>
        <div className="row" style={{ gap: 8 }}>
          <div className="inp grow">
            <b className="t15">+237</b>
            <input id="pa-num" className="grow" type="tel" inputMode="tel" placeholder="6XX XX XX XX" value={numero} onChange={(e) => (setNumero(espacer(e.target.value)), setTrouve(null))} />
          </div>
          <button
            type="button"
            className="btn secondary sm"
            style={{ width: 'auto' }}
            onClick={async () => {
              const x = await source.chercherProche(numero)
              setTrouve(x.ok ? { ok: true, prenom: x.proche.prenom } : x.raison === 'inconnu' ? { ok: false, texte: 'Pas encore sur BelivaY : envoie-lui ton lien, il est récompensé avec toi.', sms: chiffres(numero) } : { ok: false, texte: x.raison === 'moi' ? 'C’est ton propre numéro.' : 'Numéro camerounais à 9 chiffres, qui commence par 6.' })
            }}
          >
            <span>{t('Vérifier')}</span>
          </button>
        </div>
      </div>
      {trouve &&
        (trouve.ok ? (
          <div className="note ink" role="status">
            <Icone nom="user-check" taille={18} />
            <div>
              {tf('{p} est déjà sur BelivaY : pas de parrainage, mais il est maintenant dans tes proches. ', { p: trouve.prenom })}
              <Link to={chemin('listes')}>{t('Ses listes et tes cadeaux')}</Link>
            </div>
          </div>
        ) : (
          <div className="note amber" role="status">
            <Icone nom="user-plus" taille={18} />
            <div>
              {t(trouve.texte)}{' '}
              {trouve.sms && <a href={'sms:+237' + trouve.sms + '?&body=' + encodeURIComponent(texte)}>{t('Envoyer mon lien par SMS')}</a>}
            </div>
          </div>
        ))}
      </Bloc>
      <Bloc classe="g5-d" etiquette={t('Les récompenses du mois')}>
      <div className="sec">
        <h2>{t('Ce mois-ci')}</h2>
        <span className="t13 b7 c3">{tf('{n} sur {m}', { n, m: MAX })}</span>
      </div>
      <div className="bar mt4">
        <i style={{ width: Math.round((n / MAX) * 100) + '%' }}></i>
      </div>
      {!limite && (
        <div className="hint-l">
          <Icone nom="calendar" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{tf('Encore {n} récompenses possibles jusqu’au {d}.', { n: MAX - n, d: dateLongue(finMois, langue) })}</span>
        </div>
      )}
      <div className="hint-l">
        <Icone nom="gift" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>
          {t('Mois gagnés en tout')}
          {' : '}
          <b>{pr.moisGagnes}</b>
          {'. '}
          {t(d.actif ? 'Chaque mois gagné reporte ton prochain prélèvement d’un mois.' : 'Sans abonnement, tes mois gagnés t’attendent : ils s’ajoutent dès que tu en prends un.')}
        </span>
      </div>
      <div className="sec">
        <h2>{t('Mes parrainages')}</h2>
      </div>
      <div className="card ">
        {pr.filleuls.length === 0 && (
          <div className="cl14-mv">
            <div className="grow">
              <div className="s">{t('Personne ne s’est encore inscrit avec ton lien.')}</div>
            </div>
          </div>
        )}
        {[...pr.filleuls]
          .sort((a, b) => b.le - a.le)
          .map((f) => (
            <div key={f.prenom + f.le} className="cl14-mv">
              <span className="avatar" style={{ width: '40px', height: '40px', fontSize: '14px', boxShadow: 'none', margin: '0' }}>
                {f.prenom.slice(0, 1).toUpperCase()}
              </span>
              <div className="grow">
                <div className="t">{f.prenom}</div>
                <div className="s">
                  {f.etat === 'retiree'
                    ? tf('Première commande retirée le {d} · 1 mois gagné', { d: dateLongue(f.le, langue) })
                    : tf('Inscrit le {d}. Attend sa première commande payée et retirée.', { d: dateLongue(f.le, langue) })}
                </div>
              </div>
              {f.etat === 'retiree' ? (
                <span className="pill green sm">
                  <Icone nom="check" taille={13} />
                  {t('1 mois')}
                </span>
              ) : (
                <span className="pill amber sm">
                  <Icone nom="clock" taille={13} />
                  {t('En attente')}
                </span>
              )}
            </div>
          ))}
      </div>
      <details className="more">
        <summary>
          <Icone nom="info" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">{t('Comment ça marche')}</span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b">
          <ol className="cl14-ol" style={{ marginTop: '0' }}>
            {['Tu partages ton lien.', 'Ton proche s’inscrit avec ce lien.', 'Sa première commande est payée, puis retirée au relais.', 'Tu gagnes 1 mois : ton prochain prélèvement est reporté d’un mois.'].map((x, i) => (
              <li key={x}>
                <b>{i + 1}</b>
                <span>{t(x)}</span>
              </li>
            ))}
          </ol>
        </div>
      </details>
      </Bloc>
      </Bloc>
    </Ecran>
  )
}
