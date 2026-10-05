// Écran « Conditions » (CL-03), forme d'origine du prototype rendue réelle (DP-54) : nos conditions en bref, en
// langage simple ; les textes complets (pages légales, en français ou en anglais) ; la version en vigueur et celle
// acceptée par le compte. Quand une nouvelle version est publiée et pas encore acceptée, la feuille « Nos
// conditions changent » s'ouvre d'elle-même (ce qui change, dès quand) : « J'accepte et je continue »
// l'enregistre, « Plus tard » la ferme ; la carte « Version … dès le … » la rouvre. Venu de la connexion
// (?retour=…), « J'ai compris » y ramène. Le bref dit aussi la confidentialité, l'annulation et la garde chiffrée
// (DP-08), avec l'aide.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Feuille } from '../../composants/Feuille'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { NAVIGATION, chemin } from '../../config/pages'
import { source, type DonneesLegal } from '../../donnees/source'
import { dateLongue, jourSeul } from '../../i18n/dates'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'
import { GRILLE_GARDE, RENVOI_GARDE } from '../CL-09/Commun'

const BREF: [string, string][] = [
  ['shield-check', 'Ton argent reste bloqué jusqu’à ton retrait. Le vendeur est payé après.'],
  ['rotate-ccw', 'Un retour se fait avec un motif. Il est gratuit si le problème est validé.'],
  ['package', 'Au relais, le jour d’arrivée est gratuit. Ensuite, la garde se paie par jour.'],
  ['smartphone', 'On paie en Mobile Money ou par carte. Jamais en espèces.'],
  ['user-round', 'Le vendeur ne voit jamais ton nom, ton numéro ni ton adresse.'],
  ['lock', 'On garde seulement ce qu’il faut pour tes commandes. Tu peux supprimer ton compte depuis Mon compte.'],
  ['x', 'Tant que le vendeur n’a pas confirmé ta commande, tu l’annules librement.'],
]
// Icône d'un point qui change, selon son sujet.
const iconePoint = (p: string) => (/retour/i.test(p) ? 'rotate-ccw' : /confidential|notification|donnée/i.test(p) ? 'lock' : /garde|relais/i.test(p) ? 'clock' : /paie|carte|comptoir/i.test(p) ? 'wallet' : 'file-text')

export function Cgu() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const [d, setD] = useState<DonneesLegal | null>(null)
  const [fait, setFait] = useState(false)
  const [feuille, setFeuille] = useState<boolean | null>(null)
  // Venu de la connexion : « J'ai compris » y ramène (?st=inscription : la connexion du lancement).
  const retour = params.get('retour') ?? (params.get('st') === 'inscription' || params.get('lancement') === '1' ? chemin('connexion', { lancement: '1' }) : null)
  useEffect(() => {
    source.legal().then(setD)
  }, [fait])
  if (!d) return null
  // La feuille s'ouvre d'elle-même tant qu'une nouvelle version attend d'être acceptée.
  const ouverte = !!d.changement && !fait && (feuille ?? !retour)
  const accepter = async () => {
    await source.accepterConditions(d.changement!.version)
    setFait(true)
    setFeuille(false)
  }
  const nav = { ...NAVIGATION.cgu, entete: 'enfant' as const, titre: 'Conditions', margeHaute: 64, classesApp: [], styleMain: undefined, barre: false, recherche: false, bandeau: false, droite: 'panier' as const, onglet: null, retour: retour ? retour.replace(/^\//, '') : 'legal' }
  return (
    <Ecran
      route="cgu"
      navigation={nav}
      largeur="lecture"
      fixes={
        d.changement && (
          <Feuille ouverte={ouverte} fermer={() => setFeuille(false)} titre={t('Nos conditions changent')}>
            <Styles id="f16ded0d4c" />
            <div className="cl03-k or">{tf('Pages légales · version {v}', { v: d.changement.version })}</div>
            <h2 className="cl03-sheet-t mt6">{t('Nos conditions changent')}</h2>
            <p className="cl03-sheet-s">{tf('Elles s’appliquent dès le {d}. Voici ce qui change pour toi.', { d: dateLongue(d.changement.des, langue) })}</p>
            <div className="card or" style={{ marginTop: '12px', padding: '12px 14px 4px' }}>
              <div className="t14 b8">{t('Ce qui change')}</div>
              {d.changement.points.map((p) => (
                <div key={p} className="cl03-ch">
                  <Icone nom={iconePoint(p)} taille={18} />
                  <span>{t(p)}</span>
                </div>
              ))}
            </div>
            <div className="hint-l">
              <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
              <span>{t('Tes commandes déjà passées gardent les conditions du jour où tu les as passées.')}</span>
            </div>
            <div className="mt14">
              <button type="button" className="btn primary" onClick={accepter}>
                <Icone nom="check" taille={18} />
                <span>{t('J’accepte et je continue')}</span>
              </button>
            </div>
            <div className="cl03-links">
              <Link to={chemin('legal')} className="cl03-link">
                {t('Voir les pages légales')}
              </Link>
              <a href="#" className="cl03-link" onClick={(e) => (e.preventDefault(), setFeuille(false))}>
                {t('Plus tard')}
              </a>
            </div>
          </Feuille>
        )
      }
    >
      <Styles id="f16ded0d4c" />
      {fait && (
        <div className="note green mt12" role="status">
          <Icone nom="circle-check" taille={18} />
          <div>{tf('Version {v} acceptée et enregistrée avec ton compte.', { v: d.version })}</div>
        </div>
      )}
      <div className="pg">
        <div className="pg-k">{tf('Version {v} · {d}', { v: d.version, d: dateLongue(d.publiee, langue) })}</div>
        <h1 className="pg-t">{t('Nos conditions en bref')}</h1>
        <p className="pg-s">{t('Ce que tu acceptes en créant ton compte, en langage simple.')}</p>
      </div>
      <div className="card ">
        {BREF.map(([ic, x]) => (
          <div key={x} className="cl03-ch">
            <Icone nom={ic} taille={18} />
            <span>{t(x)}</span>
          </div>
        ))}
        <div className="cl03-ch">
          <Icone nom="clock" taille={18} />
          <span>
            {tf('Garde : jour d’arrivée gratuit, puis de {min} F à {max} F par jour ; après le 7e jour, le colis repart chez le vendeur (+ {r} F).', { min: F(GRILLE_GARDE[1]), max: F(GRILLE_GARDE[6]), r: F(RENVOI_GARDE) })}
          </span>
        </div>
      </div>
      <div className="hint-l">
        <Icone nom="life-buoy" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>
          {t('Un point pas clair ? ')}
          <Link to={chemin('faq', { t: 'compte' })}>{t('Questions fréquentes')}</Link>
          {t(' · ')}
          <Link to={chemin('aide')}>{t('Aide et contact')}</Link>
        </span>
      </div>
      <div className="sec">
        <h2>{t('Les textes complets')}</h2>
      </div>
      <div className="card tight">
        {d.documents.map((doc) => (
          <Link key={doc.cle} to={chemin('legal-doc', { d: doc.cle })} className="cl03-doc">
            <Icone nom={doc.icone} taille={18} />
            <span className="grow">{doc[langue].titre}</span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
        ))}
      </div>
      <div className="hint-l">
        <Icone nom="languages" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>
          {t('En français et en anglais. Chaque version est datée ; celle que tu acceptes est enregistrée avec ton compte.')}
          {d.acceptee && ' ' + tf('Tu as accepté la version {v} le {d}.', { v: d.version, d: dateLongue(d.acceptee, langue) })}
        </span>
      </div>
      {d.changement && !fait && (
        <a href="#" className="card row" style={{ marginTop: '12px', color: 'inherit' }} onClick={(e) => (e.preventDefault(), setFeuille(true))}>
          <span className="ic-sq or">
            <Icone nom="file-clock" taille={20} />
          </span>
          <span className="grow">
            <b className="t14 b8" style={{ display: 'block' }}>
              {tf('Version {v} dès le {d}', { v: d.changement.version, d: jourSeul(d.changement.des, langue) })}
            </b>
            <span className="t13 c3">{t('Voir ce qui change')}</span>
          </span>
          <Icone nom="chevron-right" taille={18} style={{ color: 'var(--ink-4)' }} />
        </a>
      )}
      {retour && (
        <div className="mt16">
          <Link to={retour} className="btn primary">
            <Icone nom="check" taille={18} />
            <span>{t('J’ai compris')}</span>
          </Link>
        </div>
      )}
    </Ecran>
  )
}
