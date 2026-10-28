// Enrichissements communs de l'espace livreur (ENRICHISSEMENTS.md, partie 3) : posés une fois, repris par les écrans
// sans toucher leur structure du prototype.
// - Compteur (M9) : le chiffre défile de l'ancienne valeur à la nouvelle ; coupé en mouvement réduit et sous navigateur
//   piloté (la valeur finale s'affiche d'un coup) ;
// - Pourquoi (M14) : « Pourquoi ? » sous une limite, déplié sur place, avec la fiche de travail de l'Aide qui l'explique ;
// - Masquable (M20) : un montant caché au toucher (réglage « Masquer mes gains » des Réglages par défaut) ;
// - exporterPdf / exporterCsv (M6) : un relevé fabriqué sur le téléphone (PDF sans bibliothèque du client, CSV pour un
//   tableur), partagé ou enregistré ;
// - Rebours (M17) : le temps qui reste avant une échéance, une seconde de moins chaque seconde, ambre sous 1 h, rouge
//   sous 10 min ;
// - Recherche (M5) : champ de recherche des listes, effaçable, qui annonce le nombre de résultats.
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { mouvementLibre } from '@client/composants/Animations'
import { enregistrerFichier, partagerFichier, pdfTexte, type LignePdf } from '@client/donnees/pdf'
import { chemin } from '../config/pages'
import { usePreferences } from '../preferences'
import { Icone } from './Icone'
import './enrichis.css'

/** Nombre qui défile jusqu'à sa valeur (700 ms, sortie douce). `rendu` met en forme (« 12 500 »). */
export function Compteur({ valeur, rendu = String }: { valeur: number; rendu?: (n: number) => string }) {
  const [v, setV] = useState(() => (mouvementLibre() ? 0 : valeur))
  const depuis = useRef(v)
  useEffect(() => {
    if (!mouvementLibre() || depuis.current === valeur) {
      depuis.current = valeur
      setV(valeur)
      return
    }
    const de = depuis.current
    const debut = performance.now()
    let id = 0
    const pas = (t: number) => {
      const k = Math.min(1, (t - debut) / 700)
      const x = Math.round(de + (valeur - de) * (1 - (1 - k) ** 3))
      setV(x)
      if (k < 1) id = requestAnimationFrame(pas)
      else depuis.current = valeur
    }
    id = requestAnimationFrame(pas)
    return () => cancelAnimationFrame(id)
  }, [valeur])
  return <span className="lp-compteur">{rendu(v)}</span>
}

/** « Pourquoi ? » : l'explication d'une limite, dépliée sur place ; `fiche` : la fiche de travail (Aide, ?geste=) qui en dit plus. */
export function Pourquoi({ children, fiche, libelle = 'Pourquoi ?' }: { children: ReactNode; fiche?: string; libelle?: string }) {
  const { t } = usePreferences()
  const [ouvert, setOuvert] = useState(false)
  const id = useId()
  return (
    <div className="lp-pq">
      <button type="button" className="lp-pq-b" aria-expanded={ouvert} aria-controls={id} onClick={() => setOuvert(!ouvert)}>
        <Icone nom="circle-help" taille={17} />
        {t(libelle)}
        <Icone nom="chevron-down" taille={16} style={{ transform: ouvert ? 'rotate(180deg)' : undefined }} />
      </button>
      <div id={id} className="lp-pq-t" hidden={!ouvert}>
        {children}
        {fiche && (
          <Link className="lp-pq-l" to={chemin('aide', { geste: fiche })}>
            <Icone nom="graduation-cap" taille={16} />
            {t('La fiche qui l’explique')}
          </Link>
        )}
      </div>
    </div>
  )
}

/** Montant masqué au toucher (••••• puis le montant) ; masqué d'avance si le réglage « Masquer mes gains » est choisi. */
export function Masquable({ texte, quoi }: { texte: string; quoi: string }) {
  const { t, tf, soldeMasque } = usePreferences()
  const [vu, setVu] = useState(!soldeMasque)
  useEffect(() => setVu(!soldeMasque), [soldeMasque])
  return (
    <button type="button" className="lp-masque" aria-pressed={vu} aria-label={vu ? tf('{quoi} : {v}. Masquer', { quoi: t(quoi), v: texte }) : tf('{quoi} masqué. Afficher', { quoi: t(quoi) })} onClick={() => setVu(!vu)}>
      <span aria-hidden="true">{vu ? texte : '•••••'}</span>
      <Icone nom={vu ? 'eye-off' : 'eye'} taille={16} />
    </button>
  )
}

/** Relevé en PDF (une page A4), partagé par la feuille du téléphone ou enregistré. */
export function exporterPdf(nom: string, titre: string, lignes: LignePdf[]) {
  return partagerFichier(pdfTexte(lignes), nom, titre)
}

/** Tableau en CSV (séparateur « ; », UTF-8 avec marque d'ordre : un tableur français l'ouvre tel quel). */
export function exporterCsv(nom: string, lignes: (string | number)[][]) {
  const cellule = (c: string | number) => (/[";\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : String(c))
  const csv = '﻿' + lignes.map((l) => l.map(cellule).join(';')).join('\r\n')
  enregistrerFichier(new Blob([csv], { type: 'text/csv;charset=utf-8' }), nom)
}

/** Secondes avant une échéance, relues chaque seconde (horloge du serveur : `maintenant`). */
export function useRebours(jusqua: number | null, maintenant: () => number): number | null {
  const [s, setS] = useState(() => (jusqua === null ? null : Math.round((jusqua - maintenant()) / 1000)))
  useEffect(() => {
    if (jusqua === null) return setS(null)
    const lire = () => setS(Math.round((jusqua - maintenant()) / 1000))
    lire()
    const id = window.setInterval(lire, 1000)
    return () => window.clearInterval(id)
  }, [jusqua, maintenant])
  return s
}

const deux = (n: number) => (n < 10 ? '0' : '') + n
/** « 1:04:09 » ou « 04:09 » : le temps qui reste ; ambre sous une heure, rouge sous dix minutes. */
export function Rebours({ secondes, libelle }: { secondes: number; libelle: string }) {
  const s = Math.max(0, secondes)
  const h = Math.floor(s / 3600)
  const texte = (h ? h + ':' : '') + deux(Math.floor((s % 3600) / 60)) + ':' + deux(s % 60)
  const urgence = s === 0 ? 'fini' : s < 600 ? 'imminent' : s < 3600 ? 'proche' : 'calme'
  return (
    <span className={'lp-rebours u-' + urgence} role="timer" aria-label={libelle + ' ' + texte}>
      <Icone nom="timer" taille={15} />
      {texte}
    </span>
  )
}

/** Champ de recherche d'une liste : effaçable, annonce le nombre de résultats aux lecteurs d'écran. */
export function Recherche({ valeur, changer, libelle, resultats, id, focus }: { valeur: string; changer: (v: string) => void; libelle: string; resultats?: number; id?: string; focus?: boolean }) {
  const { t, tf } = usePreferences()
  return (
    <div className="lp-rech" role="search">
      <Icone nom="search" taille={18} />
      <input id={id} type="search" value={valeur} onChange={(e) => changer(e.target.value)} placeholder={libelle} aria-label={libelle} enterKeyHint="search" autoComplete="off" autoFocus={focus} />
      {valeur && (
        <button type="button" className="lp-rech-x" onClick={() => changer('')} aria-label={t('Effacer la recherche')}>
          <Icone nom="x" taille={18} />
        </button>
      )}
      {valeur && resultats !== undefined && (
        <span className="lp-sr" role="status">
          {resultats === 0 ? t('Aucun résultat') : resultats === 1 ? t('1 résultat') : tf('{n} résultats', { n: resultats })}
        </span>
      )}
    </div>
  )
}

/** Texte comparé sans accents ni majuscules (« Ngono » trouve « NGONO », « elec » trouve « électroménager »). */
export const plier = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
