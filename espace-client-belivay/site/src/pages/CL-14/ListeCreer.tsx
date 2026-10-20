// Écran « Nouvelle liste » (CL-14), forme d'origine du prototype rendue réelle (DP-54) : la feuille posée sur
// « Mes listes » : le nom (contrôlé : 3 caractères au moins, pas deux listes du même nom), l'occasion (qui propose un
// nom), quand les colis partent (au fil de l'eau : chaque cadeau son code ; groupé : tous ensemble à une date,
// obligatoire, 3 à 60 jours, sans frais de garde pendant l'attente, au relais du compte), le mode surprise ; la
// liste créée s'ouvre pour y ajouter des articles. Fermer ramène à « Mes listes ».
// « Mon anniversaire » (DP-54) : l'occasion Anniversaire propose la remise groupée au jour de l'anniversaire
// (compte à rebours vu des invités, rappel à ceux qui suivent la liste).
// Pour tout le monde (DP-54) : compte au Cameroun (nouveau ou non) ou compte diaspora (sa liste est livrée au relais
// d'un proche relié, ou à son relais quand il vient au pays) ; le lieu se règle en envoyant la liste.
// Occasions (DP-54, 5 oct.) : mariage, dot, naissance, baby shower, crémaillère, diplôme, fête ; le mariage et la dot
// nomment le couple, la baby shower et la crémaillère leurs hôtes ; le mariage ouvre une cagnotte « voyage de
// noces » (objectif libre, dès 10 000 F, participations dès 1 000 F). Les invités la reçoivent dans leurs Reçus
// (compte BelivaY) ou par le lien public, l'image de statut et le QR code.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Feuille } from '../../composants/Feuille'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { chemin } from '../../config/pages'
import { source, type OccasionListe } from '../../donnees/source'
import { usePreferences } from '../../preferences'
import { useCompteDiaspora, useSession } from '../../session'
import { useListes } from './Commun'
import { BandeauInterrupteur, CorpsListes, MaitreListes, useFavoris } from './Listes'

// Occasion → nom proposé (le nom reste libre) et sa clé.
const OCCASIONS: [string, string, OccasionListe][] = [
  ['Rentrée', 'Rentrée scolaire', 'rentree'],
  ['Mariage', 'Mariage', 'mariage'],
  ['Anniversaire', 'Mon anniversaire', 'anniversaire'],
  ['Dot', 'Dot', 'dot'],
  ['Naissance', 'Naissance', 'naissance'],
  ['Baby shower', 'Baby shower', 'baby-shower'],
  ['Crémaillère', 'Crémaillère', 'cremaillere'],
  ['Diplôme', 'Mon diplôme', 'diplome'],
  ['Fête', 'Ma fête', 'fete'],
  ['Autre', '', 'autre'],
]
// Occasions à une date : tous les cadeaux remis ensemble, le jour J.
const LE_JOUR_J = new Set(['Anniversaire', 'Mariage', 'Dot', 'Baby shower', 'Crémaillère', 'Diplôme', 'Fête'])
// Occasions à plusieurs hôtes : le couple (mariage, dot), les parents (baby shower), qui reçoit avec toi (crémaillère).
const HOTES: Record<string, [string, string]> = {
  Mariage: ['Prénom de ton fiancé ou de ta fiancée', 'Les mariés'],
  Dot: ['Prénom de ton fiancé ou de ta fiancée', 'Les mariés'],
  'Baby shower': ['Prénom de l’autre parent (facultatif)', 'Les parents'],
  Crémaillère: ['Avec qui tu reçois (facultatif)', 'Les hôtes'],
}
const CAGNOTTE_MIN = 10000
const jour = (ms: number) => new Date(ms).toISOString().slice(0, 10)

export function ListeCreer() {
  const { t, tf } = usePreferences()
  const naviguer = useNavigate()
  const [d] = useListes()
  const [favoris] = useFavoris()
  const [nom, setNom] = useState('')
  const [occasion, setOccasion] = useState<string | null>(null)
  const [mode, setMode] = useState<'fil' | 'groupe'>('fil')
  const [date, setDate] = useState('')
  const [surprise, setSurprise] = useState(false)
  const [vu, setVu] = useState(false)
  const [autre, setAutre] = useState('') // l'autre hôte : fiancé(e), autre parent…
  const [cagnotte, setCagnotte] = useState(true) // mariage : cagnotte « voyage de noces »
  const [objectif, setObjectif] = useState(300000)
  const moi = useSession().client?.prenom ?? ''
  const diaspora = useCompteDiaspora()
  if (!d) return null
  const min = jour(d.maintenant + 3 * 864e5)
  const max = jour(d.maintenant + 60 * 864e5)
  const erreurs = {
    nom: nom.trim().length < 3 ? 'Donne un nom d’au moins 3 caractères.' : d.listes.some((l) => l.nom.toLowerCase() === nom.trim().toLowerCase()) ? 'Tu as déjà une liste de ce nom.' : null,
    date: mode === 'groupe' && (!date || date < min || date > max) ? 'Choisis une date de remise entre 3 et 60 jours.' : null,
    autre: (occasion === 'Mariage' || occasion === 'Dot') && autre.trim().length < 2 ? 'Donne le prénom de ton fiancé ou de ta fiancée.' : null,
    objectif: occasion === 'Mariage' && cagnotte && objectif < CAGNOTTE_MIN ? 'Un objectif de 10 000 F au moins.' : null,
  }
  const fermer = () => naviguer(chemin('listes'), { replace: true })
  const choisirOccasion = (o: string, propose: string) => {
    setOccasion(o)
    // Un anniversaire : tous les cadeaux remis ensemble, le jour J.
    if (LE_JOUR_J.has(o)) setMode('groupe')
    // Le nom proposé ne remplace qu'un nom vide ou déjà proposé par une autre occasion.
    if (propose && (!nom.trim() || OCCASIONS.some(([, p]) => p && t(p) === nom))) setNom(t(propose))
  }
  const creer = async () => {
    setVu(true)
    if (erreurs.nom || erreurs.date || erreurs.autre || erreurs.objectif) return
    const cle = OCCASIONS.find(([o]) => o === occasion)?.[2] ?? null
    const hotes = HOTES[occasion ?? ''] && autre.trim() ? [moi, autre.trim()].filter(Boolean) : []
    const l = await source.creerListe({ nom, mode, remiseLe: mode === 'groupe' ? Date.parse(date + 'T17:00:00Z') : null, surprise, occasion: cle, hotes, cagnotte: occasion === 'Mariage' && cagnotte ? { titre: 'Voyage de noces', objectif } : null })
    naviguer(chemin('liste-envies', { id: l.id }), { replace: true })
  }
  const feuille = (
    <Feuille ouverte fermer={fermer} titre={t('Nouvelle liste')}>
      <div className="cl14-shh">
        <div className="cl14-sheet-h">{t('Nouvelle liste')}</div>
        <Link to={chemin('listes')} replace className="cl14-x" aria-label={t('Fermer')}>
          <Icone nom="x" taille={20} />
        </Link>
      </div>
      <div className="fld">
        <label htmlFor="lc-nom">{t('Nom de la liste')}</label>
        <div className={'inp ' + (vu && erreurs.nom ? 'err' : 'focus')}>
          <input id="lc-nom" className="grow" value={nom} maxLength={40} onChange={(e) => setNom(e.target.value)} placeholder={t('Mariage de Sandrine')} />
        </div>
        {vu && erreurs.nom && (
          <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
            {t(erreurs.nom)}
          </div>
        )}
      </div>
      <div className="cl14-gl mt14">{t('Occasion')}</div>
      <div className="chips">
        {OCCASIONS.map(([o, p]) => (
          <a key={o} href="#" role="radio" aria-checked={occasion === o} className={'chip' + (occasion === o ? ' on' : '')} onClick={(e) => (e.preventDefault(), choisirOccasion(o, p))}>
            {t(o)}
          </a>
        ))}
      </div>
      {occasion && HOTES[occasion] && (
        <div className="fld">
          <label htmlFor="lc-autre">{t(HOTES[occasion][0])}</label>
          <div className={'inp' + (vu && erreurs.autre ? ' err' : '')}>
            <input id="lc-autre" className="grow" value={autre} maxLength={30} onChange={(e) => setAutre(e.target.value)} />
          </div>
          <div className="hint" role={vu && erreurs.autre ? 'alert' : undefined} style={vu && erreurs.autre ? { color: 'var(--red)' } : undefined}>
            {vu && erreurs.autre ? t(erreurs.autre) : tf('{h} : {p}. Tes invités voient vos deux prénoms, jamais vos numéros ni votre adresse.', { h: t(HOTES[occasion][1]), p: [moi, autre.trim() || '…'].join(' & ') })}
          </div>
        </div>
      )}
      {occasion === 'Mariage' && (
        <div className="card flat mt14">
          <div className="row" style={{ gap: 12 }}>
            <span className="grow">
              <b className="t14" style={{ display: 'block' }}>
                {t('Cagnotte « voyage de noces »')}
              </b>
              <span className="t13 c3">{t('Tes invités participent librement, dès 1 000 F. L’argent reste bloqué chez BelivaY, puis il est versé à ton portefeuille le jour J.')}</span>
            </span>
            <button type="button" className={'tg' + (cagnotte ? ' on' : '')} role="switch" aria-checked={cagnotte} aria-label={t('Cagnotte « voyage de noces »')} onClick={() => setCagnotte(!cagnotte)}></button>
          </div>
          {cagnotte && (
            <div className="fld">
              <label htmlFor="lc-objectif">{t('Objectif de la cagnotte (F)')}</label>
              <div className={'inp' + (vu && erreurs.objectif ? ' err' : '')}>
                <input id="lc-objectif" className="grow" inputMode="numeric" value={objectif || ''} onChange={(e) => setObjectif(Number(e.target.value.replace(/\D/g, '')) || 0)} />
              </div>
              {vu && erreurs.objectif && (
                <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
                  {t(erreurs.objectif)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <div className="cl14-gl mt14">{t('Quand les colis partent')}</div>
      <div className="seg" role="radiogroup" aria-label={t('Quand les colis partent')}>
        {(
          [
            ['fil', 'Au fil de l’eau'],
            ['groupe', 'Groupé'],
          ] as const
        ).map(([k, a]) => (
          <a key={k} href="#" role="radio" aria-checked={mode === k} className={mode === k ? 'on' : ''} onClick={(e) => (e.preventDefault(), setMode(k))}>
            {t(a)}
          </a>
        ))}
      </div>
      <div className="hint-l">
        <Icone nom={mode === 'fil' ? 'package' : 'boxes'} taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t(mode === 'fil' ? 'Chaque cadeau part dès qu’il est payé, avec son propre code.' : 'Tous les cadeaux sont remis ensemble, avec un seul code.')}</span>
      </div>
      {mode === 'groupe' && (
        <>
          <div className="fld">
            <label htmlFor="lc-date">{t('Date de remise (obligatoire)')}</label>
            <div className={'inp' + (vu && erreurs.date ? ' err' : '')}>
              <Icone nom="calendar" taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
              <input id="lc-date" className="grow" type="date" min={min} max={max} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="hint" role={vu && erreurs.date ? 'alert' : undefined} style={vu && erreurs.date ? { color: 'var(--red)' } : undefined}>
              {t(vu && erreurs.date ? erreurs.date : 'Remis ce jour-là, tout offert ou non, et au plus tard 21 jours après le premier cadeau payé. Aucun frais de garde pendant l’attente.')}
            </div>
          </div>
          {occasion && LE_JOUR_J.has(occasion) && occasion !== 'Anniversaire' && (
            <div className="hint-l">
              <Icone nom="calendar" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
              <span>{t('Mets le jour de l’événement : tes invités voient le compte à rebours et les cadeaux arrivent ensemble au relais.')}</span>
            </div>
          )}
          {occasion === 'Anniversaire' && (
            <div className="hint-l">
              <Icone nom="cake" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
              <span>{t('Mets le jour de ton anniversaire : tes invités voient le compte à rebours, ceux qui suivent ta liste reçoivent un rappel avant, et tu peux rappeler toi-même ceux qui n’ont rien offert.')}</span>
            </div>
          )}
          {d.relais ? (
            <div className="lock-row" style={{ color: 'var(--green)' }}>
              <Icone nom="circle-check" taille={16} />
              {t(d.relais) + t(' : de la place pour une liste groupée')}
            </div>
          ) : (
            <div className="lock-row">
              <Icone nom="info" taille={16} />
              {t('Le relais se choisit en envoyant la liste.')}
            </div>
          )}
        </>
      )}
      <div className="card flat mt14">
        <div className="row" style={{ gap: 12 }}>
          <span className="grow">
            <b className="t14" style={{ display: 'block' }}>
              {t('Mode surprise')}
            </b>
            <span className="t13 c3">{t('Tu reçois « un colis t’attend », sans savoir quoi ni de qui.')}</span>
          </span>
          <button type="button" className={'tg' + (surprise ? ' on' : '')} role="switch" aria-checked={surprise} aria-label={t('Mode surprise')} onClick={() => setSurprise(!surprise)}></button>
        </div>
      </div>
      {diaspora ? (
        <div className="hint-l">
          <Icone nom="globe" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('Compte diaspora : tes cadeaux sont livrés au Cameroun, au relais d’un proche relié ou au tien quand tu viens au pays. Tu le choisis en envoyant la liste.')}</span>
        </div>
      ) : (
        !d.relais && (
          <div className="hint-l">
            <Icone nom="map-pin" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{t('Où vont les cadeaux : ton relais, celui d’un proche, ou chez toi. Tu le choisis en envoyant la liste.')}</span>
          </div>
        )
      )}
      <div className="hint-l">
        <Icone nom="inbox" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t('Tes invités : ceux qui ont un compte BelivaY la reçoivent dans leurs Reçus ; les autres par le lien, l’image de statut ou le QR code.')}</span>
      </div>
      <div className="btns mt16">
        <button type="button" className="btn primary" onClick={creer}>
          <span>{t('Créer la liste')}</span>
        </button>
      </div>
    </Feuille>
  )
  return (
    <Ecran route="liste-creer" gabarit="compte" fixes={feuille}>
      <Styles id="02f3dac5cd" />
      <BandeauInterrupteur />
      <MaitreListes listes={d.listes} on={null}>
        <CorpsListes listes={d.listes} favoris={favoris} />
      </MaitreListes>
    </Ecran>
  )
}
