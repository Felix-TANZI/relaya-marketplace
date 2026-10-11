// Conseils concrets pour faire monter le Trust Score (Mon palier, Mon score) : un geste par critère, tiré de ce qu'il
// y a à faire aujourd'hui (commandes à préparer, litiges, retours : domaine accueil) ; le critère qui peut rapporter le
// plus de points passe en premier (part × ce qui manque pour 100). Le serveur fait foi pour le score (Q-37) : ici,
// rien n'est calculé du score lui-même, seulement l'ordre des conseils et les points au plus que chacun peut rendre.
import { Link } from 'react-router-dom'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { Aujourdhui } from '../../donnees/domaines/accueil'
import type { CleCritere, Score } from '../../donnees/domaines/trust'
import { usePreferences } from '../../preferences'

export interface Conseil {
  critere: CleCritere
  nom: string
  icone: string
  texte: string
  valeurs?: Record<string, string | number>
  vers: string
  points: number // ce que le critère peut encore apporter (ordre des conseils seulement)
  note: number
}

export function conseils(s: Score, jour: Aujourdhui | null, max = 4): Conseil[] {
  const c = jour?.compteurs
  const liste: Conseil[] = []
  for (const k of s.criteres) {
    const points = Math.round((k.poids * (100 - k.note)) / 100)
    if (points <= 0) continue
    const base = { critere: k.cle, nom: k.nom, points, note: k.note }
    switch (k.cle) {
      case 'ponctualite':
        liste.push(c && c.preparer > 0 ? { ...base, icone: 'package-check', texte: c.preparer === 1 ? 'Préparez à l’heure la commande du jour.' : 'Préparez à l’heure les {n} commandes du jour.', valeurs: { n: c.preparer }, vers: chemin('commandes') } : { ...base, icone: 'timer', texte: 'Touchez « C’est prêt » avant l’échéance de chaque commande.', vers: chemin('commandes') })
        break
      case 'litiges':
        liste.push(c && c.litiges > 0 ? { ...base, icone: 'scale', texte: c.litiges === 1 ? 'Répondez au litige avant l’échéance, preuves à l’appui.' : 'Répondez aux {n} litiges avant l’échéance, preuves à l’appui.', valeurs: { n: c.litiges }, vers: chemin('litiges') } : { ...base, icone: 'scale', texte: 'Décrivez chaque produit tel qu’il est : un litige perdu fait baisser le score.', vers: chemin('produits') })
        break
      case 'satisfaction':
        liste.push({ ...base, icone: 'star', texte: 'Soignez l’emballage et répondez à vos avis : un avis de 4 ou 5 ★ compte comme un succès.', vers: chemin('avis') })
        break
      case 'qualite':
        liste.push(c && c.retours > 0 ? { ...base, icone: 'undo-2', texte: 'Inspectez le retour dès son arrivée : un retour non conforme mineur pèse peu.', vers: chemin('retours') } : { ...base, icone: 'camera', texte: 'Des photos réelles et une description exacte évitent les retours.', vers: chemin('produits') })
        break
      case 'documents':
        liste.push({ ...base, icone: 'id-card', texte: 'Renouvelez votre pièce d’identité : le critère Documents revient à 100.', vers: chemin('securite') })
        break
      case 'anciennete':
        // L'ancienneté vient surtout du temps : conseil gardé, mais après les autres (la moitié de ses points est le volume).
        liste.push({ ...base, points: Math.round(points / 2), icone: 'calendar-check', texte: 'Chaque commande livrée compte aussi pour l’ancienneté, jusqu’à 100 commandes.', vers: chemin('commandes') })
        break
    }
  }
  return liste.sort((a, b) => b.points - a.points).slice(0, max)
}

export function Conseils({ liste, titre, sous }: { liste: Conseil[]; titre: string; sous?: string }) {
  const { t, tf } = usePreferences()
  if (!liste.length) return null
  return (
    <div className="card">
      <h3>{titre}</h3>
      {sous && (
        <p className="t13 c3" style={{ margin: '6px 0 4px' }}>
          {sous}
        </p>
      )}
      <div className="mt4">
        {liste.map((x) => (
          <Link key={x.critere} to={x.vers} className="li">
            <span className="ic or" style={{ width: '36px', height: '36px', borderRadius: '50%' }}>
              <Icone nom={x.icone} taille={18} />
            </span>
            <span className="grow">
              <span className="t14 b7" style={{ display: 'block', lineHeight: '1.4', color: 'var(--ink)' }}>
                {x.valeurs ? tf(x.texte, x.valeurs) : t(x.texte)}
              </span>
              <span className="t12 c3" style={{ display: 'block', marginTop: '2px' }}>
                {tf('{critere} · {note} sur 100', { critere: t(x.nom), note: x.note.toFixed(1).replace('.0', '').replace('.', ',') })}
              </span>
            </span>
            <Icone nom="chevron-right" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
          </Link>
        ))}
      </div>
    </div>
  )
}
