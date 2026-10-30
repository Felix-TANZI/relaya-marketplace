// Historique (PR-07 § 3, prototype « Historique ») : retrouver n'importe quelle opération du relais et ses preuves
// (HIS-01 à HIS-03, CAM-06, PR-RC-02, PR-RC-29). Recherche (commande, colis, retour, dossier, lot) sur toute la durée
// de conservation, la référence exacte d'un colis ouvrant sa fiche ; période Aujourd'hui · 7 jours · 30 jours avec ses
// 4 compteurs ; filtres par type ; frise par jour (heure, opération, détail, étiquette colorée), chaque ligne ouvre la
// fiche du colis (un lot ou une collecte se déplie) ; export CSV de la période pour le gérant. EMPLOYÉ : aucun montant
// (le serveur les met à null) et pas d'export. Preuves gardées PR-PREUVES-CONSERV-J jours, jamais modifiées.
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { F } from '@client/i18n/format'
import { HEURE, debutDuJour, jourDe } from '../../calculs/temps'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { usePeut } from '../../config/droits'
import { chemin } from '../../config/pages'
import type { FiltreHistorique, Operation, Periode } from '../../donnees/domaines/historique'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { heure, jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { Avis, Chargement, ErreurLecture, MOTIF_LIBELLE } from './commun'
import { REGLES as R } from './regles'
import './pr07.css'

const PERIODES: { id: Periode; libelle: string }[] = [
  { id: 'aujourdhui', libelle: 'Aujourd’hui' },
  { id: 'semaine', libelle: '7 jours' },
  { id: 'mois', libelle: '30 jours' },
]
const FILTRES: { id: FiltreHistorique | null; libelle: string }[] = [
  { id: null, libelle: 'Tous' },
  { id: 'reception', libelle: 'Réceptions' },
  { id: 'remise', libelle: 'Remises' },
  { id: 'sortie', libelle: 'Départs' },
  { id: 'retour', libelle: 'Retours' },
  { id: 'constat', libelle: 'Constats' },
]
const POINT: Record<string, string> = { remise: 'p-l4ui7p', encaissement: 'p-l4ui7p', reception: 'p-of11wh', sortie: 'p-ynnbhb', retour: 'p-6208vl', constat: 'p-11478p', fermeture: 'p-ynnbhb', reglage: 'p-ynnbhb' }
const ETIQUETTE: Record<string, [string, string]> = {
  remise: ['Remis', 'p-nax3x4'],
  encaissement: ['Espèces', 'p-nax3x4'],
  reception: ['Reçu', 'p-rpzy79'],
  sortie: ['Départ', 'p-6z26dm'],
  retour: ['Retour', 'p-rpzy79'],
  constat: ['Constat', 'p-h4wlx0'],
  fermeture: ['Fermeture', 'p-6z26dm'],
  reglage: ['Déplacé', 'p-6z26dm'],
}
const SORTIE: Record<string, string> = { renvoi: 'renvoi au vendeur, non retiré à temps', retour: 'retour au vendeur', transfert: 'transfert vers un autre relais', refus: 'refusé au comptoir', fermeture: 'transfert pour fermeture' }
const FERMETURE: Record<string, string> = { conge: 'Congé', maladie: 'Maladie', urgence_familiale: 'Urgence familiale', force_majeure: 'Force majeure' }

export default function Historique() {
  const { t, tf, langue } = usePreferences()
  const naviguer = useNavigate()
  const gerant = usePeut('exporterHistorique')
  const [periode, setPeriode] = useState<Periode>('semaine')
  const [type, setType] = useState<FiltreHistorique | null>(null)
  const [saisie, setSaisie] = useState('')
  const [recherche, setRecherche] = useState('')
  const [ouvert, setOuvert] = useState<string | null>(null)
  const [avis, setAvis] = useState<{ ton: 'vert' | 'rouge' | 'ambre'; texte: string } | null>(null)
  const l = useLecture(() => source.historique.historique({ periode, type: type ?? undefined, recherche }), [periode, type, recherche])
  const h = l.donnees

  const chercher = async () => {
    const q = saisie.trim()
    setRecherche(q)
    if (!q) return
    // La référence exacte d'un colis ouvre sa fiche (critère 2 de l'Historique).
    const r = await source.historique.historique({ periode, recherche: q })
    if (r.colisExact) naviguer(chemin('colis', { ref: r.colisExact }))
  }
  const exporter = async () => {
    const r = await source.historique.exporter({ periode, type: type ?? undefined, recherche })
    if (!r.ok) {
      signal('erreur')
      return setAvis({ ton: 'ambre', texte: r.raison === 'vide' ? t('Rien à exporter sur cette période.') : t('Export réservé au gérant.') })
    }
    const url = URL.createObjectURL(new Blob(['﻿' + r.contenu], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = r.nom
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    signal('succes')
    setAvis({ ton: 'vert', texte: tf('Fichier {nom} enregistré sur le téléphone.', { nom: r.nom }) })
  }

  // Frise par jour.
  const jours: [string, Operation[]][] = []
  for (const o of h?.operations ?? []) {
    const j = jourDe(o.le)
    if (jours.at(-1)?.[0] !== j) jours.push([j, []])
    jours.at(-1)![1].push(o)
  }

  const titre = (o: Operation) =>
    o.type === 'remise'
      ? tf('{c} remis', { c: o.reference })
      : o.type === 'reception'
        ? tf('Lot {lot} reçu', { lot: o.reference })
        : o.type === 'sortie'
          ? o.colis.length === 1
            ? tf('{c} parti', { c: o.colis[0] })
            : tf('{n} colis partis', { n: o.colis.length })
          : o.type === 'retour'
            ? tf('{rt} retour déposé', { rt: o.reference })
            : o.type === 'constat'
              ? tf('{c} constat envoyé', { c: o.reference })
              : o.type === 'encaissement'
                ? o.detail.especesRendues
                  ? tf('Garde du groupe {g} rendue au client', { g: o.reference })
                  : tf('Garde du groupe {g} encaissée', { g: o.reference })
                : o.type === 'fermeture'
                  ? t('Fermeture déclarée')
                  : tf('{c} déplacé', { c: o.reference })
  const detail = (o: Operation) => {
    const d = o.detail
    const x: string[] = []
    if (o.type === 'reception') {
      x.push(tf('{n} colis', { n: o.colis.length }))
      if (d.entreprise) x.push(d.entreprise)
      x.push(t('code de dépôt'), t('photo du lot'))
      if (d.reserve) x.push(t('avec réserve'))
    } else if (o.type === 'remise') {
      if (d.porteur === 'tiers') x.push(t(d.porteurNomme ? 'retiré par le porteur désigné, pièce vérifiée, nom envoyé au client' : 'retiré par le porteur désigné, pièce vérifiée'))
      if (d.controle === 'en_ordre') x.push(t('« tout est en ordre » confirmé par le client'))
      if (d.controle === 'sans_ouverture') x.push(t('remis sans ouverture, à la demande du client'))
      if (d.paiementMobileMoney) x.push(t('commande payée en Mobile Money'))
      if (o.photos) x.push(t('photo de remise'))
      if (o.gainRelais !== null) x.push(tf('{m} F pour le relais', { m: F(o.gainRelais) }))
    } else if (o.type === 'encaissement' && d.especesRendues) x.push(o.especes !== null ? tf('{m} F rendus en espèces, remise annulée', { m: F(-o.especes) }) : t('espèces rendues, remise annulée'))
    else if (o.type === 'encaissement') x.push(o.especes !== null ? tf(d.especesSignees ? '{m} F en espèces, signé du PIN à la remise' : '{m} F en espèces, journal signé', { m: F(o.especes) }) : t(d.especesSignees ? 'en espèces, signé du PIN à la remise' : 'en espèces, journal signé'))
    else if (o.type === 'sortie') {
      if (d.collecte) x.push(tf('collecte {c}', { c: d.collecte }))
      if (d.motif) x.push(t(SORTIE[d.motif] ?? d.motif))
      x.push(t('photo, confirmé par le livreur'))
    } else if (o.type === 'retour') {
      if (d.motif) x.push(d.motif)
      x.push(t('scellé posé'), tf('{n} photos', { n: o.photos }))
      if (o.emplacement) x.push(tf('rangé en {e}', { e: o.emplacement }))
      if (o.gainRelais !== null) x.push(tf('{m} F pour le relais', { m: F(o.gainRelais) }))
    } else if (o.type === 'constat') {
      if (d.motif) x.push(t(MOTIF_LIBELLE[d.motif] ?? d.motif))
      x.push(tf('{n} photos', { n: o.photos }), t('gardé sans frais'))
    } else if (o.type === 'fermeture' && d.fermeture) {
      x.push(t(FERMETURE[d.fermeture.motif] ?? d.fermeture.motif))
      const a = jourLong(debutDuJour(d.fermeture.du) + 12 * HEURE, langue)
      x.push(d.fermeture.du === d.fermeture.au ? a : tf('du {a} au {b}', { a, b: jourLong(debutDuJour(d.fermeture.au) + 12 * HEURE, langue) }))
    } else if (d.deplacement) x.push(d.deplacement)
    if (o.par.nom) x.push(tf('par {p}', { p: o.par.nom }))
    return x.join(' · ')
  }

  const ligne = (o: Operation) => {
    const [e, cl] = ETIQUETTE[o.type]
    const corps = (
      <>
        <div className="p-bxuikp">
          <div className="p-dfc4i3">{titre(o)}</div>
          <span className={o.type === 'sortie' && o.detail.motif === 'renvoi' ? 'p-ekng8o' : cl}>{t(e)}</span>
        </div>
        <div className="p-dfa05r">{detail(o)}</div>
      </>
    )
    if (o.colis.length > 1)
      return (
        <div className="p-62xtzw">
          <button type="button" className="r7-ligne-btn r7-ligne" aria-expanded={ouvert === o.id} onClick={() => setOuvert((x) => (x === o.id ? null : o.id))}>
            {corps}
          </button>
          {ouvert === o.id && (
            <div className="r7-sous">
              {o.colis.map((c) => (
                <Link key={c} to={chemin('colis', { ref: c })} className="r-ref">
                  {c}
                  <Icone nom="r-chevron-droite" taille={16} />
                </Link>
              ))}
            </div>
          )}
        </div>
      )
    if (o.type === 'constat' && o.detail.dossier)
      return (
        <Link to={chemin('dossier-litige', { id: o.detail.dossier })} className="p-62xtzw">
          {corps}
        </Link>
      )
    if (o.colis.length === 1)
      return (
        <Link to={chemin('colis', { ref: o.colis[0] })} className="p-62xtzw">
          {corps}
        </Link>
      )
    return <div className="p-62xtzw">{corps}</div>
  }

  return (
    <Ecran route="historique">
      <div className="p-0hxmj8 r-pile r7">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
            void chercher()
          }}
        >
          <label className="p-fyp9fi">
            <Icone nom="r-recherche" taille={19} className="p-672m16" />
            <input type="search" value={saisie} onChange={(e) => (setSaisie(e.target.value.toUpperCase()), !e.target.value && setRecherche(''))} enterKeyHint="search" placeholder={t('N° de commande, de colis ou de retour')} aria-label={t('N° de commande, de colis ou de retour')} className="p-zg9k0q" />
          </label>
        </form>
        {recherche ? (
          <div className="r7-entete">
            <p className="r7-note">{tf('Recherche « {q} » sur les {j} derniers jours.', { q: recherche, j: R.rechercheJ })}</p>
            <button type="button" className="r-btn r-second r7-petit" onClick={() => (setSaisie(''), setRecherche(''))}>
              {t('Effacer')}
            </button>
          </div>
        ) : (
          <div className="p-lvzt0c" role="radiogroup" aria-label={t('Période')}>
            {PERIODES.map((p) => (
              <button key={p.id} type="button" role="radio" aria-checked={periode === p.id} className={periode === p.id ? 'p-h01hlk' : 'p-bq7aiq'} onClick={() => setPeriode(p.id)}>
                {t(p.libelle)}
              </button>
            ))}
          </div>
        )}
        <div className="p-3j2860" role="status" aria-live="polite">
          {[
            [h?.compteurs.recus, 'reçus', 'p-8eqm49', 'p-wzc6ur'],
            [h?.compteurs.remis, 'remis', 'p-fhd77n', 'p-4o2c56'],
            [h?.compteurs.retours, 'retours', 'p-fhd77n', 'p-wzc6ur'],
            [h?.compteurs.constats, 'constats', 'p-fhd77n', 'p-d53iku'],
          ].map(([n, l, c1, c2]) => (
            <div className={c1 as string} key={l as string}>
              <div className={c2 as string}>{n ?? '–'}</div>
              <div className="p-own8v2">{t(l as string)}</div>
            </div>
          ))}
        </div>
        <div className="p-8dmjde" role="group" aria-label={t('Type d’opération')}>
          {FILTRES.map((f) => (
            <button key={f.libelle} type="button" aria-pressed={type === f.id} className={type === f.id ? 'p-rpzy79' : 'p-6z26dm'} onClick={() => setType(f.id)}>
              {t(f.libelle)}
            </button>
          ))}
        </div>
        {avis && <Avis ton={avis.ton}>{avis.texte}</Avis>}
        {l.erreur ? (
          <ErreurLecture relire={l.relire} />
        ) : !h ? (
          <Chargement texte={t('Lecture du journal…')} />
        ) : !jours.length ? (
          <div className="p-yi6rkz r-vide">
            <div className="r-vide-i">
              <Icone nom="r-historique" taille={28} />
            </div>
            <h2>{recherche ? t('Aucune opération pour cette référence') : t('Aucune opération sur cette période')}</h2>
            <p>{recherche ? t('Vérifiez la référence : BLV-… pour une commande ou un colis, RT-… pour un retour, CS-… ou LT-… pour un dossier.') : t('Choisissez une autre période ou un autre type.')}</p>
          </div>
        ) : (
          jours.map(([j, ops]) => (
            <div className="p-yi6rkz" key={j}>
              <div className="p-yscrc8">{jourLong(debutDuJour(j) + 12 * HEURE, langue).toUpperCase()}</div>
              {ops.map((o) => (
                <div className="p-fkc6m2" key={o.id}>
                  <div className="p-7o0fo7">{langue === 'fr' ? heure(o.le, langue).replace(/ h ?/, ':').replace(/:$/, ':00') : heure(o.le, langue)}</div>
                  <div className="p-py0ju2" aria-hidden="true">
                    <span className={POINT[o.type]} />
                    <span className="p-oxoo73" />
                  </div>
                  {ligne(o)}
                </div>
              ))}
            </div>
          ))
        )}
        {gerant ? (
          <button type="button" className="p-rbzobc" onClick={() => void exporter()}>
            <Icone nom="r-telecharger" taille={18} className="p-emic6i" />
            {recherche ? t('Exporter la recherche') : t('Exporter la période')}
          </button>
        ) : (
          <p className="r7-note">{t('Montants et export réservés au gérant.')}</p>
        )}
        <div className="p-16950n">{tf('Chaque opération garde ses preuves (heure, photo, emplacement, personne du guichet) pendant {j} jours. Vous pouvez les consulter et les exporter ; elles ne se modifient jamais.', { j: R.conservationJ })}</div>
      </div>
    </Ecran>
  )
}
