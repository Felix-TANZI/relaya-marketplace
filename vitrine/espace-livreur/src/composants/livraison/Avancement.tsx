// Carte d'avancement commune aux écrans de la tournée : paquet et nature, arrêt, colis sur vous / colis du paquet,
// barre, heure limite et compte à rebours (vert ; ambre sous TOURNEE-AMBRE-MIN ; rouge sous TOURNEE-ROUGE-MIN :
// LIV-P08R-06), étapes de l'arrêt (chaque étape devient verte à sa preuve).
import type { ReactNode } from 'react'
import { Icone } from '../../composants/Icone'
import type { PaquetTournee, ReglesLivreur } from '../../donnees/domaines/tournee'
import { duree, heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'

export const NATURES: Record<PaquetTournee['nature'], string> = { relais: 'tournée relais', domicile: 'course à domicile', retour: 'course de retour' }

export function tonReste(resteMs: number, r: ReglesLivreur): 'vert' | 'ambre' | 'rouge' {
  const min = resteMs / 60000
  return min <= r.resteRougeMin ? 'rouge' : min <= r.resteAmbreMin ? 'ambre' : 'vert'
}

export function Reste({ limite, maintenant, regles }: { limite: number; maintenant: number; regles: ReglesLivreur }) {
  const { t, tf, langue } = usePreferences()
  const reste = limite - maintenant
  const ton = tonReste(reste, regles)
  return (
    <span className={'lv-reste lv-' + ton}>
      <Icone nom="timer" taille={16} />
      {reste > 0 ? tf('avant {h} · reste {d}', { h: heure(limite, langue), d: duree(reste, langue) }) : tf('heure limite {h} dépassée', { h: heure(limite, langue) })}
      {ton !== 'vert' && <span className="lv-sr">{t(ton === 'rouge' ? 'urgent' : 'bientôt')}</span>}
    </span>
  )
}

export function Avancement(p: {
  kicker: string // déjà traduit : « PQ-Z1-261013-003 · tournée relais »
  titre: string // déjà traduit : « Arrêt 2 sur 7 · ramassage »
  surVous: number
  part: number // avancement du paquet, de 0 à 1 (arrêts terminés ÷ arrêts du paquet)
  limite: number | null
  maintenant: number
  regles: ReglesLivreur
  etapes?: string[] // libellés français
  etape?: number // nombre d'étapes franchies
  enfant?: ReactNode
}) {
  const { t, tf } = usePreferences()
  const part = Math.max(0, Math.min(100, Math.round(p.part * 100)))
  return (
    <section className="l-carte lv-av">
      <div className="lv-av-haut">
        <div className="l-grow">
          <div className="l-kicker">{p.kicker}</div>
          <h2 className="lv-av-titre">{p.titre}</h2>
        </div>
        <div className="lv-av-colis" aria-label={tf('{n} colis sur vous', { n: p.surVous })}>
          <Icone nom="package" taille={18} />
          <b>{p.surVous}</b>
          <span>{t('sur vous')}</span>
        </div>
      </div>
      <div className="lv-barre" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={part} aria-label={t('Avancement du paquet')}>
        <i style={{ width: part + '%' }} />
      </div>
      {p.limite !== null && <Reste limite={p.limite} maintenant={p.maintenant} regles={p.regles} />}
      {p.etapes && (
        <ol className="lv-etapes">
          {p.etapes.map((e, i) => {
            const fait = i < (p.etape ?? 0)
            const cour = i === (p.etape ?? 0)
            return (
              <li key={e} className={fait ? 'fait' : cour ? 'cour' : ''} aria-current={cour ? 'step' : undefined}>
                <span className="lv-etape-p">{fait ? <Icone nom="check" taille={14} trait={3} /> : i + 1}</span>
                <span>{t(e)}</span>
              </li>
            )
          })}
        </ol>
      )}
      {p.enfant}
    </section>
  )
}
