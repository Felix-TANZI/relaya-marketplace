// Suivi « vitrine » (VAGUE-AMELIORATIONS.md n° 9 ; règle : donnees/suiviVitrine.ts) : le trajet de la boutique au relais
// (ou chez le client) dessiné, le livreur posé à sa place approchée (jamais sa position exacte), qui avance avec le
// temps ; heure d'arrivée estimée, livreur affecté (prénom et initiale, entreprise, véhicule). Plan dessiné, sans
// tuiles : il s'affiche hors connexion et prend les couleurs du thème.
import { useEffect, useState } from 'react'
import { Icone } from '../../composants/Icone'
import type { CommandeClient } from '../../donnees/source'
import { surLeTrajet, vitrineDe } from '../../donnees/suiviVitrine'
import { heureSeule } from '../../i18n/dates'
import { usePreferences } from '../../preferences'

const DEP: [number, number] = [46, 132]
const CTL: [number, number] = [150, 18]
const ARR: [number, number] = [292, 70]

export function CarteVitrine({ c, maintenant }: { c: CommandeClient; maintenant: number }) {
  const { t, tf, langue } = usePreferences()
  // Le livreur avance avec le temps : la carte se redessine chaque minute (le serveur, en production, pousse l'étape).
  const [ecoule, setEcoule] = useState(0)
  useEffect(() => {
    const debut = Date.now()
    const x = window.setInterval(() => setEcoule(Date.now() - debut), 30_000)
    return () => window.clearInterval(x)
  }, [])
  const v = vitrineDe(c, maintenant + ecoule)
  const domicile = c.mode === 'domicile'
  const [lx, ly] = surLeTrajet(v.part, DEP, CTL, ARR)
  const chemin = `M${DEP[0]} ${DEP[1]} Q${CTL[0]} ${CTL[1]} ${ARR[0]} ${ARR[1]}`
  const libelle =
    v.etape === 0
      ? c.livreur
        ? tf('{n} passe chercher ton colis chez le vendeur.', { n: c.livreur.nom })
        : t('Ton colis se prépare chez le vendeur.')
      : v.etape === 1
        ? domicile
          ? tf('En route vers toi · arrivée vers {h}', { h: heureSeule(v.arrivee!, langue) })
          : tf('En route vers le relais · arrivée vers {h}', { h: heureSeule(v.arrivee!, langue) })
        : v.etape === 2
          ? t(domicile ? 'Livré chez toi.' : 'Arrivé au relais : ton code part dès que tout est là.')
          : t('Retiré.')
  return (
    <section className="c9v" data-vitrine={v.etape} aria-label={t('Suivi sur la carte')}>
      <svg className="c9v-carte" viewBox="0 0 340 160" role="img" aria-label={libelle}>
        <rect x="0" y="0" width="340" height="160" className="c9v-fond" />
        <path d="M0 40 H340 M0 100 H340 M70 0 V160 M190 0 V160 M260 0 V160" className="c9v-rues" />
        <path d="M0 150 C80 120 120 160 200 130 S300 110 340 120" className="c9v-fleuve" />
        <path d={chemin} className="c9v-reste" />
        <path d={chemin} className="c9v-fait" pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: 1 - v.part }} />
        <g className="c9v-pin dep" transform={`translate(${DEP[0]} ${DEP[1]})`}>
          <circle r="11" />
          <text y="4">B</text>
        </g>
        <g className="c9v-pin arr" transform={`translate(${ARR[0]} ${ARR[1]})`}>
          <circle r="11" />
          <text y="4">{domicile ? 'M' : 'R'}</text>
        </g>
        {(v.etape === 1 || (v.etape === 0 && c.livreur)) && (
          <g className="c9v-livreur" transform={`translate(${lx.toFixed(1)} ${ly.toFixed(1)})`} data-part={Math.round(v.part * 100)}>
            {v.etape === 1 && <circle r="18" className="halo" />}
            <circle r="12" />
            <path d="M-6 3 a3 3 0 1 0 0.1 0 M6 3 a3 3 0 1 0 0.1 0 M-6 3 L-1 -4 H4 L6 3 M-1 -4 L-3 -7" className="moto" />
          </g>
        )}
      </svg>
      <div className="c9v-l">
        <span className="c9v-direct">
          <i />
          {t('En direct')}
        </span>
        <span className="c9v-leg">
          <b>B</b> {t('vendeur')} · <b>{domicile ? 'M' : 'R'}</b> {t(domicile ? 'chez toi' : 'relais')}
        </span>
      </div>
      <div className="c9v-txt">
        <b>{libelle}</b>
        {c.livreur && (
          <span className="t13 c3">
            <Icone nom="bike" taille={15} /> {tf('{n} · {e} · {v}', { n: c.livreur.nom, e: c.livreur.entreprise, v: t(c.livreur.vehicule) })}
          </span>
        )}
        {v.etape === 1 && <span className="t12 c3">{t('Position approchée sur le trajet, jamais l’adresse exacte : le livreur et toi restez protégés.')}</span>}
      </div>
    </section>
  )
}
