// Écran « Réglages » (CL-13), balisage et logique du prototype du 1er octobre (route reglages), repris à la main et
// rendu logique (DP-53) :
// - langue, thème (Automatique : comme le téléphone, suivi en direct ; Clair ; Sombre) et taille du texte
//   s'appliquent tout de suite et restent sur l'appareil (en production, aussi dans le compte) ;
// - « &txt=grande|tres » : aperçu d'une taille (le choix allumé est celui de l'aperçu, Ecran l'applique) ;
// - la mesure d'audience ne s'allume qu'avec l'accord du client (éteinte par défaut), et se coupe à tout moment ;
// - devise d'affichage (DP-54) : les prix sont en francs CFA, la monnaie du paiement ; depuis l'étranger, la carte
//   paie l'équivalent en euros au taux fixe (1 € = 655,957 F), figé au paiement ; un compte diaspora (et lui
//   seul) choisit d'afficher tous les prix en F CFA, en euros ou en dollars US, le F CFA restant écrit à côté ;
// - données économes réglables ici aussi ; liens vers les autres réglages (notifications, sécurité, confidentialité) ;
//   « Rétablir l'affichage d'origine » remet thème clair, taille normale et animations ;
// - sons et vibrations des gestes (ajout au panier, paiement, notification…), activés par défaut ; « Écouter »
//   joue chaque son à tour de rôle (composants/Sons.ts).
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useState, type KeyboardEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Icone } from '../../composants/Icone'
import { APERCU, jouer } from '../../composants/Sons'
import { chemin } from '../../config/pages'
import { EURO } from '../CL-12/Diaspora'
import { ECHELLES, usePreferences } from '../../preferences'
import { source } from '../../donnees/source'
import { F, TAUX_DOLLAR_DEMO, deviseAffichee, type Devise } from '../../i18n/format'
import { useCompteDiaspora, useMajSession, useSession } from '../../session'
import { Bloc, EcranCompte } from './Larges'

const NOMS_TAILLE = ['Très petite', 'Petite', 'Normale', 'Un peu grande', 'Grande', 'Plus grande', 'Très grande', 'Maximale']

// Les segments sont des liens-boutons (balisage du prototype) : Entrée et Espace les activent aussi.
const auClavier = (e: KeyboardEvent<HTMLElement>) => {
  if (e.key !== 'Enter' && e.key !== ' ') return
  e.preventDefault()
  e.currentTarget.click()
}

function Carte(p: { icone: string; titre: string; sous: string; children: ReactNode }) {
  const { t } = usePreferences()
  return (
    <div className="card">
      <div className="row">
        <span className="ic-sq">
          <Icone nom={p.icone} taille={20} />
        </span>
        <span className="grow">
          <b className="t15 b8" style={{ display: 'block' }}>
            {t(p.titre)}
          </b>
          <span className="t13 c3">{t(p.sous)}</span>
        </span>
      </div>
      <div className="seg cl13-seg" style={{ marginTop: '10px' }}>
        {p.children}
      </div>
    </div>
  )
}

export function Reglages() {
  const { t, tf, langue, choixTheme, setTheme, mesure, setMesure, echelle, setEchelle, animationsReduites, setAnimationsReduites, donneesEconomes, setDonneesEconomes, sons, setSons, vibrations, setVibrations } = usePreferences()
  // Aperçu des sons : le dernier joué (indice dans APERCU), -1 avant le premier toucher.
  const [ecoute, setEcoute] = useState(-1)
  const diaspora = useCompteDiaspora()
  const majSession = useMajSession()
  // Un visiteur règle l'affichage ici ; les réglages de son compte (notifications, numéro, confidentialité) se
  // règlent une fois connecté : l'entrée le dit et mène à la connexion, qui ramène à la page voulue.
  const connecte = useSession().connecte
  const versCompte = (route: string) => (connecte ? chemin(route) : chemin('connexion', { next: chemin(route) }))
  const sousCompte = (texte: string) => (connecte ? t(texte) : t('Connexion demandée') + ' · ' + t(texte))
  const chevCompte = <Icone nom={connecte ? 'chevron-right' : 'lock'} taille={18} />
  const devise = deviseAffichee()
  const choisirDevise = async (d: Devise) => {
    if (d === devise) return
    const r = await source.reglerDevise(d)
    if (r.ok) (jouer('interrupteur'), majSession(await source.session()))
  }
  const [params] = useSearchParams()
  const apercu = params.get('txt')
  // Position sur la barre : l'aperçu « &txt= » d'abord, sinon la taille choisie.
  const voulu = apercu === 'grande' ? 115 : apercu === 'tres' ? 130 : echelle
  const i = Math.max(0, ECHELLES.findIndex((e) => e >= voulu))
  // Équivalent en euros d'un montant en francs CFA (parité fixe), à la française : « 15,24 € ».
  const enEuros = (f: number) => (f / EURO).toFixed(2).replace('.', ',') + '\u00A0€'
  const modifie = choixTheme !== 'light' || echelle !== 100 || animationsReduites
  const choix = (act: string, v: string, on: boolean, texte: string) => (
    <a key={v} role="button" tabIndex={0} data-act={act} data-v={v} className={on ? 'on' : ''} aria-pressed={on} onKeyDown={auClavier}>
      {t(texte)}
    </a>
  )
  return (
    <EcranCompte route="reglages" parEtat etat={apercu === 'tres' ? 'reglages?txt=tres' : 'reglages'}>
      <p className="cl13-intro">{t('Langue et thème suivent ton compte sur tous tes téléphones.')}</p>
      <Bloc classe="c13-g2">
      <Bloc classe="c13-k">
      <Carte icone="languages" titre="Langue" sous="L’application, les notifications et les SMS">
        {choix('set-lang', 'fr', langue === 'fr', 'Français')}
        {choix('set-lang', 'en', langue === 'en', 'English')}
      </Carte>
      <Carte icone="contrast" titre="Thème" sous={'Automatique : comme ton téléphone'}>
        {choix('set-theme', 'auto', choixTheme === 'auto', 'Automatique')}
        {choix('set-theme', 'light', choixTheme === 'light', 'Clair')}
        {choix('set-theme', 'dark', choixTheme === 'dark', 'Sombre')}
      </Carte>
      {/* Devise d'affichage : le franc CFA partout ; l'équivalent étranger ne sert qu'au paiement par carte. */}
      <div className="card">
        <div className="row">
          <span className="ic-sq">
            <Icone nom="banknote" taille={20} />
          </span>
          <span className="grow">
            <b className="t15 b8" style={{ display: 'block' }}>
              {t('Devise d’affichage')}
            </b>
            <span className="t13 c3">{t(diaspora ? 'Compte diaspora : tous les prix du site dans la devise de ton choix, le franc CFA écrit à côté.' : 'Tous les prix sont en francs CFA (F), la monnaie dans laquelle tu paies.')}</span>
          </span>
        </div>
        {diaspora && (
          <>
            <div className="seg cl13-seg" style={{ marginTop: '10px' }}>
              {(
                [
                  ['XAF', 'F CFA'],
                  ['EUR', 'Euro'],
                  ['USD', 'Dollar US'],
                ] as const
              ).map(([d, nom]) => (
                <a key={d} href="#" role="button" aria-pressed={devise === d} className={devise === d ? 'on' : ''} onClick={(e) => (e.preventDefault(), choisirDevise(d))}>
                  {t(nom)}
                </a>
              ))}
            </div>
            <p className="t12 c3" style={{ margin: '8px 0 0', lineHeight: 1.45 }}>
              {devise === 'USD' ? tf('Dollar US : taux du jour du prestataire, figé au moment du paiement (démonstration : 1 $ = {t} F).', { t: String(TAUX_DOLLAR_DEMO).replace('.', ',') }) : devise === 'EUR' ? t('Euro : parité fixe, 1 € = 655,957 F, sans frais de change chez BelivaY.') : t('Franc CFA : la monnaie de la commande ; ta carte paie l’équivalent en euros ou en dollars.')}{' '}
              {tf('Exemple : {m} F.', { m: F(10000) })}
            </p>
          </>
        )}
        <div style={{ marginTop: 8 }}>
          <div className="kv">
            <span className="k">{t('Prix, frais et remboursements')}</span>
            <span className="v">{diaspora && devise !== 'XAF' ? tf('{d}, F CFA à côté', { d: t(devise === 'EUR' ? 'Euro (€)' : 'Dollar US ($)') }) : t('Franc CFA (F)')}</span>
          </div>
          <div className="kv">
            <span className="k">{t('Payé depuis l’étranger, par carte')}</span>
            <span className="v">{t('1 € = 655,957 F · taux fixe')}</span>
          </div>
          <div className="kv">
            <span className="k">{t('Exemple')}</span>
            <span className="v">{tf('10 000 F ≈ {e}', { e: enEuros(10000) })}</span>
          </div>
        </div>
        <p className="t12 c3" style={{ margin: '8px 0 0', lineHeight: 1.45 }}>
          {t('Le montant en euros s’affiche au moment de payer par carte et reste figé pour cette commande. Mobile Money paie toujours en francs CFA.')}
        </p>
      </div>
      {/* Taille du texte (DP-54) : une barre qu'on fait glisser, 8 tailles de 85 à 140 %. */}
      <div className="card vedette">
        <div className="row">
          <span className="ic-sq">
            <Icone nom="a-large-small" taille={20} />
          </span>
          <span className="grow">
            <b className="t15 b8" style={{ display: 'block' }}>
              {t('Taille du texte')}
            </b>
            <span className="t13 c3">{tf('{nom} · {p} %', { nom: t(NOMS_TAILLE[i]), p: ECHELLES[i] })}</span>
          </span>
        </div>
        <div className="row" style={{ gap: 10, marginTop: 12, alignItems: 'center' }}>
          <span aria-hidden="true" style={{ fontSize: 13, fontWeight: 700 }}>
            A
          </span>
          <input
            type="range"
            className="taille-barre"
            min={0}
            max={ECHELLES.length - 1}
            step={1}
            value={i}
            aria-label={t('Taille du texte')}
            aria-valuetext={tf('{nom}, {p} %', { nom: t(NOMS_TAILLE[i]), p: ECHELLES[i] })}
            onChange={(e) => setEchelle(ECHELLES[Number(e.target.value)])}
          />
          <span aria-hidden="true" style={{ fontSize: 22, fontWeight: 700 }}>
            A
          </span>
        </div>
        <div className="taille-graduation" aria-hidden="true">
          {ECHELLES.map((e, n) => (
            <i key={e} className={n === i ? 'on' : n === 2 ? 'ref' : ''} />
          ))}
        </div>
        <p className="t13 c2" style={{ margin: '10px 0 0', lineHeight: 1.45, zoom: ECHELLES[i] / 100 }}>
          {t('Aperçu : ton colis t’attend au Relais Mvog-Ada. Montre ton code au gérant.')}
        </p>
        {ECHELLES[i] !== 100 && (
          <div className="links" style={{ justifyContent: 'flex-start' }}>
            <a href="#" onClick={(e) => (e.preventDefault(), setEchelle(100))}>
              {t('Revenir à la taille normale')}
            </a>
          </div>
        )}
      </div>
      </Bloc>
      <Bloc classe="c13-k">
      <div className="card tight">
        <div className="li">
          <span className="ic">
            <Icone nom="sparkles" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('Réduire les animations')}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {t('Moins de mouvements à l’écran ; utile si ça te fatigue ou si le téléphone est lent.')}
            </span>
          </span>
          <button type="button" className={'tg' + (animationsReduites ? ' on' : '')} role="switch" aria-checked={animationsReduites} aria-label={t('Réduire les animations')} onClick={() => setAnimationsReduites(!animationsReduites)}></button>
        </div>
      </div>
      <div className="card tight">
        <div className="li">
          <span className="ic">
            <Icone nom="bell-ring" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('Sons')}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {t('Un son court quand tu ajoutes au panier, paies, reçois une notification ou retires ton colis.')}
            </span>
          </span>
          <button type="button" className={'tg' + (sons ? ' on' : '')} role="switch" aria-checked={sons} aria-label={t('Sons')} onClick={() => setSons(!sons)}></button>
        </div>
        <div className="li">
          <span className="ic">
            <Icone nom="smartphone" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('Vibrations')}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {t('Une vibration brève avec chaque son, si ton téléphone le permet.')}
            </span>
          </span>
          <button type="button" className={'tg' + (vibrations ? ' on' : '')} role="switch" aria-checked={vibrations} aria-label={t('Vibrations')} onClick={() => setVibrations(!vibrations)}></button>
        </div>
        <button
          type="button"
          className={'li' + (sons || vibrations ? '' : ' off')}
          style={{ width: '100%', textAlign: 'left', background: 'none', border: 0, font: 'inherit', color: 'inherit' }}
          disabled={!sons && !vibrations}
          onClick={() => {
            const n = (ecoute + 1) % APERCU.length
            setEcoute(n)
            jouer(APERCU[n].son, true)
          }}
        >
          <span className="ic">
            <Icone nom="play" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('Écouter')}
            </span>
            <span className="ls" style={{ display: 'block' }} aria-live="polite">
              {!sons && !vibrations
                ? t('Active les sons ou les vibrations pour les essayer.')
                : ecoute < 0
                  ? t('Chaque toucher joue un son de l’application.')
                  : tf('{nom} · {n} sur {total}', { nom: t(APERCU[ecoute].nom), n: ecoute + 1, total: APERCU.length })}
            </span>
          </span>
        </button>
        <p className="t12 c3" style={{ margin: '4px 14px 10px', lineHeight: 1.45 }}>
          {t('Mode silencieux du téléphone : certains navigateurs jouent quand même les sons. Coupe-les ici si besoin.')}
        </p>
      </div>
      <div className="card tight">
        <div className="li">
          <span className="ic">
            <Icone nom="image-off" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('Données économes')}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {t('Les photos se chargent seulement quand tu les touches. Prix et commandes restent complets.')}
            </span>
          </span>
          <button type="button" className={'tg' + (donneesEconomes ? ' on' : '')} role="switch" aria-checked={donneesEconomes} aria-label={t('Données économes')} onClick={() => setDonneesEconomes(!donneesEconomes)}></button>
        </div>
        <Link to={chemin('reseau')} className="li">
          <span className="ic ">
            <Icone nom="wifi" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('Connexion et données')}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {t('État du réseau, hors ligne, SMS de repli')}
            </span>
          </span>
          <span className="chev">
            <Icone nom="chevron-right" taille={18} />
          </span>
        </Link>
        <div className="li" style={{ flexWrap: 'wrap' }}>
          <span className="ic">
            <Icone nom="chart-column" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('Mesure d’audience')}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {t('Seulement avec ton accord. Aucune publicité d’autres entreprises.')}
            </span>
          </span>
          <button
            type="button"
            className={'tg' + (mesure ? ' on' : '')}
            role="switch"
            aria-checked={mesure}
            aria-label={t('Mesure d’audience')}
            onClick={() => setMesure(!mesure)}
          ></button>
        </div>
      </div>
      </Bloc>
      </Bloc>
      <div className="sec">
        <h2>{t('Autres réglages')}</h2>
      </div>
      <div className="card tight">
        <Link to={versCompte('notifs-reglages')} className="li">
          <span className="ic ">
            <Icone nom="bell" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('Notifications')}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {sousCompte('Ce que tu reçois, SMS ou WhatsApp, heures calmes')}
            </span>
          </span>
          <span className="chev">
            {chevCompte}
          </span>
        </Link>
        <Link to={versCompte('securite')} className="li">
          <span className="ic ">
            <Icone nom="shield-check" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('Numéro et connexion')}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {sousCompte('Numéro vérifié, façons de te connecter, appareils')}
            </span>
          </span>
          <span className="chev">
            {chevCompte}
          </span>
        </Link>
        <Link to={versCompte('confidentialite')} className="li">
          <span className="ic ">
            <Icone nom="eye-off" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('Confidentialité et données')}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {sousCompte('Ce qui est gardé, qui voit quoi, tes accords')}
            </span>
          </span>
          <span className="chev">
            {chevCompte}
          </span>
        </Link>
      </div>
      {modifie && (
        <div className="links">
          <a
            href={chemin('reglages')}
            onClick={(e) => {
              e.preventDefault()
              setTheme('light')
              setEchelle(100)
              setAnimationsReduites(false)
            }}
          >
            {t('Rétablir l’affichage d’origine')}
          </a>
        </div>
      )}
      <p className="scrim-note">{t('BelivaY · application client · version 1.0')}</p>
    </EcranCompte>
  )
}
