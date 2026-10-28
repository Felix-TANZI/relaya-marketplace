// Modules d'après lancement (CL-15 ; DP-54) : ce que partagent les écrans.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { COTE, planCoteRentree } from '../../donnees/cote'
import { calculer } from '../../donnees/frais'
import { F } from '../../i18n/format'
import { jourSeul } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { useCompteDiaspora, useSession } from '../../session'
import { VideProches } from '../diaspora/Commun'
import { source, type Cotisation, type DonneesFamille, type DonneesRentree, type ListeRentree, type MiseDeCote, type Troc } from '../../donnees/source'

export function useCotes(): [{ liste: MiseDeCote[]; maintenant: number } | null, () => void] {
  const [d, setD] = useState<{ liste: MiseDeCote[]; maintenant: number } | null>(null)
  const [v, setV] = useState(0)
  useEffect(() => {
    source.misesDeCote().then(setD)
  }, [v])
  return [d, () => setV((x) => x + 1)]
}
export const paye = (c: MiseDeCote) => c.versements.filter((v) => v.payeLe).reduce((n, v) => n + v.du, 0)
export const prochain = (c: MiseDeCote) => c.versements.find((v) => !v.payeLe) ?? null
// L'article mis de côté, ou la liste de rentrée entière : sa vignette et la page où le revoir.
export function VignetteCote({ c, taille = 56 }: { c: MiseDeCote; taille?: number }) {
  return c.liste ? <Icone nom="backpack" taille={Math.round(taille * 0.45)} style={{ color: 'var(--ink-3)' }} /> : <Dessin id={c.dessin} />
}
export const titreCote = (c: MiseDeCote, t: (x: string) => string, tf: (x: string, v: Record<string, string | number>) => string) => (c.liste ? tf('Liste {c} · {e}', { c: c.liste.classe, e: t(c.liste.ecole) }) : t(c.titre))
export const lienCote = (c: MiseDeCote) => (c.liste ? chemin('rentree-liste', { l: c.liste.id, ...(c.liste.exclus.length ? { exclus: c.liste.exclus.join(',') } : {}), ...(c.liste.equivalents.length ? { eq: c.liste.equivalents.join(',') } : {}) }) : chemin('fiche', { p: c.p }))

// Mettre toute la liste de rentrée de côté (RNT-08, CRS-16) : la liste compte comme un seul achat ; l'acompte
// aujourd'hui, le reste en versements dont le dernier tombe une semaine au moins avant la rentrée.
export function MettreListeDeCote({ l, exclus, eq, total, rentreeLe, maintenant }: { l: ListeRentree; exclus: string[]; eq: string[]; total: number; rentreeLe: number; maintenant: number }) {
  const { t, tf, langue } = usePreferences()
  const plans = (['2sem', 'mois'] as const).map((r) => ({ r, v: planCoteRentree(total, r, maintenant, rentreeLe) })).filter((x) => x.v)
  if (total < COTE.minimum)
    return (
      <div className="hint-l">
        <Icone nom="piggy-bank" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{tf('Mise de côté possible dès {m} F pour toute la liste.', { m: F(COTE.minimum) })}</span>
      </div>
    )
  if (!plans.length)
    return (
      <div className="hint-l">
        <Icone nom="piggy-bank" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{tf('Trop près de la rentrée du {d} pour mettre la liste de côté : elle se paie en une fois.', { d: jourSeul(rentreeLe, langue) })}</span>
      </div>
    )
  const v = plans[0].v!
  return (
    <>
      <div className="btns">
        <Link to={chemin('cote-plan', { l: l.id, rythme: plans[0].r, ...(exclus.length ? { exclus: exclus.join(',') } : {}), ...(eq.length ? { eq: eq.join(',') } : {}) })} className="btn secondary">
          <Icone nom="piggy-bank" taille={18} />
          <span>{t('Mettre toute la liste de côté')}</span>
        </Link>
      </div>
      <div className="hint-l">
        <Icone nom="calendar-clock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{tf(v.length - 1 > 1 ? 'Acompte de {a} F aujourd’hui, puis {n} versements, le dernier le {d}, avant la rentrée du {r}. Sans intérêts, sans frais.' : 'Acompte de {a} F aujourd’hui, puis {n} versement le {d}, avant la rentrée du {r}. Sans intérêts, sans frais.', { a: F(v[0].du), n: v.length - 1, d: jourSeul(v[v.length - 1].le, langue), r: jourSeul(rentreeLe, langue) })}</span>
      </div>
    </>
  )
}

export function useCotisations(): [{ liste: Cotisation[]; maintenant: number } | null, () => void] {
  const [d, setD] = useState<{ liste: Cotisation[]; maintenant: number } | null>(null)
  const [v, setV] = useState(0)
  useEffect(() => {
    source.cotisations().then(setD)
  }, [v])
  return [d, () => setV((x) => x + 1)]
}
export const reuni = (c: Cotisation) => c.participations.reduce((n, x) => n + x.montant, 0)

export function useFamille(): [DonneesFamille | null, () => void] {
  const [d, setD] = useState<DonneesFamille | null>(null)
  const [v, setV] = useState(0)
  useEffect(() => {
    source.famille().then(setD)
  }, [v])
  return [d, () => setV((x) => x + 1)]
}

export function useRentree(): [DonneesRentree | null, () => void] {
  const [d, setD] = useState<DonneesRentree | null>(null)
  const [v, setV] = useState(0)
  useEffect(() => {
    source.rentree().then(setD)
  }, [v])
  return [d, () => setV((x) => x + 1)]
}
// Le total d'une liste, recalculé depuis zéro : articles cochés, équivalents choisis, un colis par boutique.
export function calculListe(l: ListeRentree, exclus: string[], equivalents: string[]) {
  const pris = l.articles.filter((a) => !exclus.includes(a.id)).map((a) => ({ ...a, prix: (equivalents.includes(a.id) && a.equivalent ? a.equivalent.prixUnitaire : a.prixUnitaire) * a.qte }))
  const boutiques = [...new Set(pris.map((a) => a.boutique))]
  const f = calculer(
    'relais',
    boutiques.map((b) => ({ boutique: b, zone: pris.find((a) => a.boutique === b)!.zone, articles: pris.filter((a) => a.boutique === b).map((a) => ({ prix: a.prix, quantite: 1, classe: 'S' as const })) })),
  )
  return { pris, boutiques, sousTotal: f.sousTotal, livraison: f.total - f.sousTotal, total: f.total, frais: f }
}

export function useTrocs(): [{ liste: Troc[]; relais: string | null; maintenant: number } | null, () => void] {
  const [d, setD] = useState<{ liste: Troc[]; relais: string | null; maintenant: number } | null>(null)
  const [v, setV] = useState(0)
  useEffect(() => {
    source.trocs().then(setD)
  }, [v])
  return [d, () => setV((x) => x + 1)]
}
// La page de la reprise selon son état.
export const pageTroc = (t: Troc) => (t.etat === 'depot' || t.etat === 'annule' ? 'troc-depot' : t.etat === 'contre' ? 'troc-contre-offre' : t.etat === 'confirme' || t.etat === 'paye' ? 'troc-payer' : 'troc-inspection')

// État vide (pas de panier composé, ou pas encore de destinataire) : le parcours en trois étapes et la suite utile.
export function VideFamille({ panier, icone, titre }: { panier: string | null; icone: string; titre: string }) {
  const { connecte } = useSession()
  const diaspora = useCompteDiaspora()
  const suite = chemin('famille')
  const actions = !connecte
    ? [
        { vers: chemin('inscription-diaspora', { next: suite }), texte: 'S’inscrire en diaspora', icone: 'globe' },
        { vers: chemin('connexion', { next: suite }), texte: 'Se connecter', icone: 'log-in' },
      ]
    : panier
      ? [{ vers: chemin('famille-destinataire', { panier }), texte: 'Choisir qui retire', icone: 'user-round' }]
      : [{ vers: suite, texte: 'Composer le panier', icone: 'shopping-basket' }]
  return (
    <VideProches
      icone={icone}
      titre={titre}
      texte="Le panier famille nourrit tes proches au Cameroun : tu le composes, tu choisis qui le retire au relais, puis tu le paies par carte depuis l’étranger, une fois ou chaque mois."
      points={[
        ['shopping-basket', '1. Le panier : un panier prêt ou le tien, 5 kg au plus par article.'],
        ['user-round', '2. Pour qui ? La personne reçoit le code de retrait ; toi, la preuve de remise.'],
        ['credit-card', '3. Payer par carte : Visa, Mastercard, Apple Pay ou Google Pay.'],
      ]}
      actions={actions}
      liens={!connecte ? [{ vers: suite, texte: 'Voir les paniers prêts' }] : !diaspora ? [{ vers: chemin('inscription-diaspora', { next: suite }), texte: 'Je vis à l’étranger : ouvrir un compte diaspora' }] : []}
    />
  )
}
