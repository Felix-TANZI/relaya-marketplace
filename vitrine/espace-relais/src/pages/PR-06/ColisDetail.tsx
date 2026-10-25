// PR-06 · « Fiche colis » : tout savoir sur un colis précis sans rien savoir du client ni du vendeur (FIC-01) :
// emplacement, garde, parcours et actions. Structure du prototype (ColisDetail) intacte : carte nuit bleue (référence,
// taille et places, commande, emplacement, étiquettes), trois actions (Remettre, Signaler, Déplacer), frise « Parcours
// du colis », carte « Garde », encadré d'anonymat.
// Enrichi : FIC-02 (Déplacer : cases compatibles avec de la place, journalisé), FIC-03 (Remettre fermé avec son motif :
// groupage, constat, à renvoyer…), FIC-05 (frise : scellé devant le vendeur, prise en charge, réception, avis délivré,
// code à part, rappels datés), FIC-06 (gratuit jusqu'au, jours non facturés, dernier jour, renvoi le premier jour ouvert
// après le 7e : ARL-08), garde jour par jour, part du relais (propriétaire seulement, PR-RC-09), preuves photos et
// journal signé. Le relais ne voit jamais le code de retrait (PR-RC-21).
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Feuille } from '@client/composants/Feuille'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import { usePeut } from '../../config/droits'
import type { EntreeJournal } from '../../donnees/communs'
import type { Preuve } from '../../donnees/domaines/colis'
import type { EtapeParcours, FicheColis, MotifNonRemettable } from '../../donnees/domaines/stock'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { Annonce, CLASSE_MAJ, Chargement, ErreurLecture, Etiquette, Vide, apercu, dateCourte, dateHeure, francs, rangJour, useAgir, useAnnonce } from './commun'

const MOTIFS: Record<MotifNonRemettable, string> = {
  groupage: 'Colis en groupage : le client n’a pas encore de code ; il sera remis à la libération de la liste.',
  constat: 'Constat en cours : le colis attend la décision de BelivaY, sans frais.',
  a_renvoyer: 'Non retiré en 7 jours : il part au vendeur avec la prochaine collecte.',
  a_faire_partir: 'Il doit repartir (décision du constat ou refus au comptoir) : il part avec la prochaine collecte.',
  transfert: 'Le client a choisi un autre relais : le colis part avec la prochaine collecte ; son ancien code est refusé.',
  retour: 'Retour déposé : il part au vendeur avec la prochaine collecte ; il ne se remet pas.',
  incomplet: 'Commande incomplète : les colis se remettent quand toute la commande est arrivée.',
  code_bloque: 'Code bloqué après 3 codes faux : le client demande un nouveau code dans son application.',
  remis: 'Déjà remis au client.',
  parti: 'Parti du relais.',
  pas_arrive: 'Pas encore reçu au relais.',
}

const PREUVES: Record<Preuve['nature'], string> = {
  reception: 'Réception',
  reserve: 'Réserve à la réception',
  refus: 'Refus à la réception',
  lot: 'Photo du lot à la réception',
  remise: 'Remise au client',
  deballage: 'Déballage devant le client',
  constat: 'Constat',
  retour: 'Retour déposé (scellé)',
  sortie: 'Sortie remise au livreur',
}

const ACTIONS: Record<string, string> = {
  depot_livreur: 'Lot déposé par le livreur',
  lot_valide: 'Lot validé au relais',
  valider_lot: 'Lot validé au relais',
  resultat_ok: 'Contrôlé, scellé intact',
  resultat_reserve: 'Reçu avec réserve',
  resultat_refus: 'Refusé à la réception',
  retour_depose: 'Retour déposé',
  especes_encaissees: 'Garde encaissée en espèces',
  remis: 'Remis au client',
  remettre: 'Remis au client',
  un_probleme: 'Constat ouvert au comptoir',
  refus_motive: 'Refus motivé : constat',
  refus_sans_motif: 'Refus sans motif',
  deplace: 'Déplacé',
  sortie_validee: 'Sortie validée (photo, PIN)',
  depart_absent: 'Absent de la collecte',
  sortie: 'Confirmé par le livreur : parti',
  parti: 'Parti avec le livreur',
  inventaire_manquant: 'Introuvable à l’inventaire',
}

function useEtape() {
  const { t, tf, langue } = usePreferences()
  return (e: EtapeParcours): [string, string, 'fait' | 'acc' | 'rappel' | 'or'] => {
    const d = (x: number) => dateHeure(x, langue)
    switch (e.type) {
      case 'scelle':
        return [t('Contrôlé, emballé, scellé'), tf(e.encombrant ? 'par le livreur, devant le vendeur · {n} photos (carton d’origine)' : 'par le livreur, devant le vendeur · {n} photos', { n: e.photos }), 'fait']
      case 'pris_en_charge':
        return [t('Pris en charge'), [e.entreprise, t('code de remise validé')].filter(Boolean).join(' · '), 'fait']
      case 'retour_depose':
        return [t('Retour déposé au relais'), tf('{d} · {ref} · scellé et 2 photos', { d: d(e.le), ref: e.reference }), 'acc']
      case 'recu':
        return [t('Reçu au relais'), [d(e.le), t('code de dépôt'), t(e.scelle === 'intact' ? 'scellé intact' : 'reçu avec réserve'), e.emplacement ? tf('rangé en {c}', { c: e.emplacement }) : null].filter(Boolean).join(' · '), 'acc']
      case 'prevenu':
        return e.le ? [t('Client prévenu'), tf('{d} · avis d’arrivée délivré · code envoyé à part', { d: d(e.le) }), 'acc'] : [t('Client pas encore prévenu'), t('la garde ne court pas tant que l’avis n’est pas délivré'), 'rappel']
      case 'rappel':
        return [e.dernierJour ? t('Rappel du dernier jour') : t('Rappel daté'), e.du > 0 || e.duDemain > 0 ? tf('{d} · {du} dus, {demain} demain', { d: d(e.le), du: francs(e.du), demain: francs(e.duDemain) }) : tf('{d} · gratuit aujourd’hui', { d: d(e.le) }), 'rappel']
      case 'payante':
        return [t('Garde payante'), tf('depuis le {d} · {m} à régler au retrait', { d: dateCourte(e.depuis, langue), m: francs(e.du) }), 'or']
      case 'constat':
        return [t('Constat ouvert'), [d(e.le), e.reference, t('garde et renvoi suspendus')].filter(Boolean).join(' · '), 'or']
      case 'encaisse':
        return [t('Garde encaissée'), e.montant !== null ? tf('{d} · {m} en espèces, pour la commande', { d: d(e.le), m: francs(e.montant) }) : d(e.le), 'fait']
      case 'remis':
        return [t('Remis'), [d(e.le), t(e.tiers ? 'au porteur désigné, pièce vérifiée' : 'au client'), t('photo de remise')].join(' · '), 'fait']
      case 'parti':
        return [t('Parti du relais'), [d(e.le), t(e.motif === 'renvoi' ? 'renvoi au vendeur' : e.motif === 'retour' ? 'retour au vendeur' : e.motif === 'transfert' ? 'transfert' : 'départ'), t('confirmé par le livreur')].join(' · '), 'fait']
    }
  }
}
const POINT: Record<'fait' | 'acc' | 'rappel' | 'or', string> = { fait: 'p-4swkiu', acc: 'p-x8mx13', rappel: 'p-y3lvkl', or: 'p-hrs8gz' }

function Recherche() {
  const { t } = usePreferences()
  const naviguer = useNavigate()
  const [q, setQ] = useState('')
  const ouvrir = () => q.trim() && naviguer(chemin('colis', { ref: q.trim().toUpperCase() }))
  return (
    <div className="p-yi6rkz">
      <h1 className="p-9j1bbu">{t('Ouvrir la fiche d’un colis')}</h1>
      <label htmlFor="r6-ref" className="r6-label">
        {t('Référence du colis (étiquette)')}
      </label>
      <div className="r6-recherche">
        <Icone nom="search" taille={20} />
        <input id="r6-ref" className="r-ref" value={q} placeholder="BLV-00041-1" autoComplete="off" autoCapitalize="characters" enterKeyHint="go" onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ouvrir()} />
      </div>
      <button type="button" className="r-btn r-principal" onClick={ouvrir} disabled={!q.trim()}>
        <Icone nom="r-colis" taille={20} />
        <span>{t('Ouvrir la fiche')}</span>
      </button>
      <Link className="r-btn r-second" to={chemin('stock')}>
        <Icone nom="r-grille" taille={20} />
        <span>{t('Voir le stock')}</span>
      </Link>
    </div>
  )
}

function Deplacer({ f, ouverte, fermer, fait }: { f: FicheColis; ouverte: boolean; fermer: () => void; fait: (code: string, enFile: boolean) => void }) {
  const { t, tf } = usePreferences()
  const { agir, occupe } = useAgir()
  const [choix, setChoix] = useState<string | null>(null)
  const [refus, setRefus] = useState<string | null>(null)
  const premier = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (ouverte) {
      setChoix(null)
      setRefus(null)
      requestAnimationFrame(() => premier.current?.focus())
    }
  }, [ouverte])
  const ranger = async () => {
    if (!choix) return
    const r = await agir('deplacement', f.colis.id, (o, s) => s.stock.deplacer(f.colis.id, choix, o))
    if (!r) return
    if (r.r.ok) {
      signal('succes')
      fait(choix, r.etat === 'en_file')
    } else {
      signal('erreur')
      setRefus(r.r.raison === 'case_pleine' ? 'Cette case vient de se remplir : choisissez-en une autre.' : r.r.raison === 'etagere_interdite' ? 'Cette étagère ne convient pas à la taille du colis.' : 'Le colis n’est plus au relais.')
    }
  }
  return (
    <Feuille ouverte={ouverte} fermer={fermer} titre={t('Déplacer le colis')}>
      <div className="r6-feuille">
        <h2>{tf('Déplacer {ref}', { ref: f.colis.id })}</h2>
        <p>{tf('Rangé en {c}. Seules les cases compatibles avec un colis {taille}, avec assez de place, sont proposées ; le changement est inscrit au journal.', { c: f.colis.emplacement ?? '—', taille: t(CLASSE_MAJ[f.colis.classe].toLowerCase()) })}</p>
        {f.casesLibres.length ? (
          <div className="r6-choix" role="radiogroup" aria-label={t('Cases libres')}>
            {f.casesLibres.map((k, i) => (
              <button key={k.code} ref={i === 0 ? premier : undefined} type="button" role="radio" aria-checked={choix === k.code} onClick={() => setChoix(k.code)}>
                <Icone nom="r-lieu" taille={20} />
                <span className="r-ref">{k.code}</span>
                <span>{k.libres > 1 ? tf('{n} places libres', { n: k.libres }) : t('1 place libre')}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="r6-alerte">{t('Aucune case compatible n’a de place : faites partir les colis à renvoyer, ou gardez ce colis au comptoir en le signalant au gérant.')}</p>
        )}
        {refus && (
          <p className="r6-erreur" role="alert">
            {t(refus)}
          </p>
        )}
        <button type="button" className="r-btn r-principal" disabled={!choix || occupe} onClick={() => void ranger()}>
          <Icone nom="check" taille={20} />
          <span>{choix ? tf('Ranger en {c}', { c: choix }) : t('Choisissez une case')}</span>
        </button>
      </div>
    </Feuille>
  )
}

function CarteGarde({ f }: { f: FicheColis }) {
  const { t, tf, langue } = usePreferences()
  const [detail, setDetail] = useState(false)
  const c = f.colis
  const g = f.garde
  const ligne = (a: string, b: string, cls = 'p-2vq92h') => (
    <div className="p-mqmvkk" key={a + b}>
      <span className="p-ytl255">{a}</span>
      <span className={cls}>{b}</span>
    </div>
  )
  const rem = f.remuneration
  const sansGarde = (): string => {
    if (c.retour) return t('jamais facturé, hors places')
    if (c.etat === 'en_groupage') return c.groupageJusquau ? tf('sans frais jusqu’à la libération ({d})', { d: dateCourte(c.groupageJusquau, langue) }) : t('sans frais jusqu’à la libération')
    if (f.remettable.ok === false && f.remettable.motif === 'incomplet') return tf('commence à l’arrivée du dernier colis ({n} sur {total})', { n: f.groupe.auRelais.length, total: f.groupe.total })
    if (c.etat === 'attendu') return t('commence à l’arrivée')
    return t('commence quand le client a reçu l’avis d’arrivée')
  }
  return (
    <div className="p-yi6rkz" aria-labelledby="r6-garde-t">
      <div className="p-unncbq">
        <h2 className="p-9j1bbu" id="r6-garde-t">
          {t('Garde')}
        </h2>
      </div>
      {c.arrivee.le !== null && ligne(t('Arrivé le'), dateHeure(c.arrivee.le, langue))}
      {c.retour && c.journal[0] && ligne(t('Déposé le'), dateHeure(c.journal.find((j) => j.action === 'retour_depose')?.le ?? c.journal[0].le, langue))}
      {!g ? (
        ligne(t('Garde'), sansGarde())
      ) : (
        <>
          {g.gratuitJusquau && ligne(t('Gratuit jusqu’au'), tf('{d} au soir', { d: dateCourte(g.gratuitJusquau, langue) }))}
          {g.nonFactures.map((n) => ligne(t('Non facturé'), tf(n.motif === 'ferme' ? '{d} · relais fermé' : '{d} · constat en cours', { d: dateCourte(n.jour, langue) })))}
          {g.figee && c.garde?.encaissee
            ? ligne(t('Garde réglée'), tf('{m} le {d}', { m: francs(c.garde.encaissee.montant), d: dateCourte(c.garde.encaissee.le, langue) }))
            : g.suspendue
              ? ligne(t('Aujourd’hui'), t('suspendue · 0 F'))
              : c.garde?.rang
                ? ligne(tf('Aujourd’hui · {r}', { r: rangJour(c.garde.rang, tf, t) }), francs(c.garde.du))
                : null}
          {g.dernierJour && ligne(t('Dernier jour'), tf('{d} · {m}', { d: dateCourte(g.dernierJour, langue), m: francs(g.cumulDernierJour) }))}
          {ligne(t('Renvoi si non retiré'), g.renvoi ? tf('{d} · {m} retenus sur le remboursement', { d: dateCourte(g.renvoi.jour, langue), m: francs(g.renvoi.retenue) }) : t('en attente de la décision du constat'), 'p-lgzow2')}
          {ligne(t('Grille appliquée'), t('celle du jour de la commande'))}
          <button type="button" className="r6-depli" aria-expanded={detail} aria-controls="r6-jours" onClick={() => setDetail((x) => !x)}>
            <Icone nom={detail ? 'chevron-up' : 'chevron-down'} taille={18} />
            <span>{t(detail ? 'Masquer le détail jour par jour' : 'Voir la garde jour par jour')}</span>
          </button>
          {detail && (
            <div className="r6-table" id="r6-jours">
              {g.jours.map((j) => (
                <div key={j.rang} className={'r6-jour' + (j.quand === 'aujourdhui' ? ' a-aujourdhui' : '')}>
                  <b>{tf('J{n}', { n: j.rang })}</b>
                  <span>{dateCourte(j.jour, langue)}</span>
                  <span className="r6-jour-m">{tf('cumul {m}', { m: francs(j.cumul) })}</span>
                  <span className="r6-jour-s">
                    {[
                      j.statut === 'ferme' ? t('relais fermé, non facturé') : j.statut === 'suspendu' ? t('suspendu, non facturé') : j.statut === 'offert' ? t('offert au client') : tf('{m} ce jour-là', { m: francs(j.tarif) }),
                      j.partRelais !== null && j.partRelais > 0 ? tf('vous : {m}', { m: francs(j.partRelais) }) : null,
                      j.quand === 'aujourdhui' ? t('aujourd’hui') : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {rem && (
        <>
          <div className="p-92xvtp" />
          <div className="p-mqmvkk">
            <span className="p-ytl255">{t('Vous toucherez')}</span>
            <span className="p-imse89">{c.retour ? tf('{m} (comme une remise)', { m: francs(rem.remise) }) : tf('{m} + {j} / jour facturé', { m: francs(rem.remise), j: francs(rem.parJour) })}</span>
          </div>
          {!c.retour && (
            <div className="p-mqmvkk">
              <span className="p-ytl255">{t('À ce jour')}</span>
              <span className="p-2vq92h">
                {tf('{total} ({remise} {etat} + {garde} de garde{j1})', {
                  total: francs(rem.total),
                  remise: francs(rem.remise),
                  etat: t(rem.remiseComptee ? 'remise' : 'à la remise'),
                  garde: francs(rem.garde),
                  j1: rem.premierJourBelivay > 0 ? tf(', dont {m} du 1er jour payés par BelivaY', { m: francs(rem.premierJourBelivay) }) : '',
                })}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Journal({ entrees }: { entrees: EntreeJournal[] }) {
  const { t, langue } = usePreferences()
  if (!entrees.length) return null
  return (
    <div className="p-yi6rkz" aria-labelledby="r6-journal-t">
      <div className="p-unncbq">
        <h2 className="p-9j1bbu" id="r6-journal-t">
          {t('Journal signé')}
        </h2>
      </div>
      <div className="r6-journal">
        {[...entrees]
          .sort((a, b) => b.le - a.le)
          .map((e, i) => (
            <div key={i} className="r6-entree">
              <time dateTime={new Date(e.le).toISOString()}>{dateHeure(e.le, langue)}</time>
              <span>
                <b>{t(ACTIONS[e.action] ?? 'Opération')}</b>
                {e.action === 'deplace' && e.detail ? ' · ' + e.detail : ''} · {e.par.type === 'membre' ? e.par.nom : e.par.type === 'livreur' ? t('livreur') : t('BelivaY')}
                {e.signe ? ' · ' + t('signé') : ''}
              </span>
            </div>
          ))}
      </div>
    </div>
  )
}

function Preuves({ preuves }: { preuves: Preuve[] }) {
  const { t, tf, langue } = usePreferences()
  return (
    <div className="p-yi6rkz" aria-labelledby="r6-preuves-t">
      <div className="p-unncbq">
        <h2 className="p-9j1bbu" id="r6-preuves-t">
          {t('Preuves photos')}
        </h2>
      </div>
      {preuves.length ? (
        <div className="r6-preuves">
          {preuves.map((p, i) => {
            const url = apercu(p.photos[0] ?? null)
            return (
              <div key={i} className="r6-preuve">
                <span className="r6-preuve-i">{url ? <img src={url} alt={t(PREUVES[p.nature])} /> : <Icone nom="camera" taille={20} />}</span>
                <span className="r-grow">
                  <b>{t(PREUVES[p.nature])}</b>
                  <span className="p-46lk2m" style={{ display: 'block' }}>
                    {[dateHeure(p.le, langue), p.photos.length > 1 ? tf('{n} photos', { n: p.photos.length }) : t('1 photo'), p.par.type === 'membre' ? p.par.nom : t('livreur')].join(' · ')}
                  </span>
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="p-81u2s6">{t('Aucune photo pour l’instant : chaque changement de main en ajoute une (réception, remise, sortie).')}</p>
      )}
    </div>
  )
}

export default function ColisDetail() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const ref = params.get('ref')?.toUpperCase() ?? null
  // Enveloppe : null tant que la lecture n'est pas finie ; { f: null } pour un colis inconnu du relais.
  const lecture = useLecture(() => (ref ? source.stock.ficheComplete(ref) : Promise.resolve(null)).then((f) => ({ f })), [ref])
  const peutRemettre = usePeut('remettreColis')
  const peutSignaler = usePeut('ouvrirConstat')
  const peutDeplacer = usePeut('deplacerColis')
  const etape = useEtape()
  const [feuille, setFeuille] = useState(false)
  const { avis, annoncer } = useAnnonce()
  const f = lecture.donnees?.f ?? null

  const contenu = () => {
    if (!ref) return <Recherche />
    if (lecture.erreur) return <ErreurLecture erreur={lecture.erreur} relire={lecture.relire} />
    if (!lecture.donnees) return <Chargement lignes={5} titre="Chargement de la fiche…" />
    if (!f) return <FicheAbsente ref_={ref} relire={lecture.relire} />
    const c = f.colis
    const motif = f.remettable.ok ? null : f.remettable.motif
    const raisonRemettre = motif ? MOTIFS[motif] : !peutRemettre ? 'Réservé : demandez ce droit au gérant.' : null
    const raisonDeplacer = !f.casesLibres.length && !c.emplacement ? 'Le colis n’est plus sur une étagère.' : !peutDeplacer ? 'Réservé : demandez ce droit au gérant.' : !['recu', 'recu_reserve', 'en_stock', 'dernier_jour', 'a_renvoyer', 'en_constat', 'en_groupage', 'transfert_demande', 'refuse_comptoir', 'a_faire_partir', 'retour_depose'].includes(c.etat) ? 'Le colis n’est plus au relais.' : null
    const raisonSignaler = !peutSignaler ? 'Réservé : demandez ce droit au gérant.' : c.etat === 'en_constat' ? 'Un constat est déjà en cours.' : c.etat === 'remis' || c.etat === 'parti' || c.etat === 'attendu' ? 'Le colis n’est pas au relais.' : null
    return (
      <>
        <div className="p-26n637">
          <div className="p-yq5y59">
            <div>
              <div className="p-ch33fq">{t('COLIS')}</div>
              <div className="p-p11vwd r-ref">{c.retour?.reference ?? c.id}</div>
              <div className="p-yz5dyd">
                {[t(CLASSE_MAJ[c.classe]), c.places > 1 ? tf('{n} places', { n: c.places }) : t('1 place'), f.groupe.total > 1 ? tf('commande de {n} colis', { n: f.groupe.total }) : t('commande de 1 colis'), c.retour ? c.id : null].filter(Boolean).join(' · ')}
              </div>
            </div>
            <div className="p-okq0fj">
              <div className="p-60x9ee">{t('RANGÉ EN')}</div>
              <div className="p-efknlh">{c.emplacement ?? '—'}</div>
            </div>
          </div>
          <div className="p-8dmjde">
            {c.garde?.rang ? <span className="p-pbttlb">{rangJour(c.garde.rang, tf, t)}</span> : null}
            {c.garde && c.garde.du > 0 && <span className="p-pbttlb">{tf('Garde : {m} dus', { m: francs(c.garde.du) })}</span>}
            {!c.retour && c.arrivee.le !== null && <span className="p-pbttlb">{f.clientPrevenu > 1 ? tf('Client prévenu {n} fois', { n: f.clientPrevenu }) : f.clientPrevenu === 1 ? t('Client prévenu 1 fois') : t('Client pas encore prévenu')}</span>}
            {c.paiement.mode === 'au_comptoir' && c.paiement.etat !== 'confirme' && <span className="p-pbttlb">{tf('À payer au comptoir : {m} en Mobile Money', { m: francs(c.paiement.montant) })}</span>}
            {c.code.bloqueJusqua && <span className="p-pbttlb">{tf('Code bloqué jusqu’à {h}', { h: heure(c.code.bloqueJusqua, langue) })}</span>}
            {c.porteurDesigne && <span className="p-pbttlb">{tf('Porteur désigné : {nom}', { nom: c.porteurDesigne })}</span>}
            {c.fragile && <span className="p-pbttlb">{t('Fragile')}</span>}
            {f.remplacement && <span className="p-pbttlb">{t('Remplacement')}</span>}
            {f.etiquette && <Etiquette e={f.etiquette} />}
          </div>
        </div>
        <div className="p-zmtdxo r6-actions">
          {raisonRemettre ? (
            <button type="button" className="p-ylaz0b" aria-disabled="true" aria-describedby="r6-motif" onClick={() => signal('erreur')}>
              <Icone nom="r-cle" taille={21} className="p-672m16" />
              <span className="p-j35u7m">{t('Remettre')}</span>
            </button>
          ) : (
            <Link to={chemin('retrait', { ref: c.id })} className="p-ylaz0b">
              <Icone nom="r-cle" taille={21} className="p-672m16" />
              <span className="p-j35u7m">{t('Remettre')}</span>
            </Link>
          )}
          {raisonSignaler ? (
            <button type="button" className="p-ylaz0b" aria-disabled="true" title={t(raisonSignaler)} onClick={() => (signal('erreur'), annoncer({ ton: 'erreur', texte: t(raisonSignaler) }))}>
              <Icone nom="r-balance" taille={21} className="p-lhsznn" />
              <span className="p-j35u7m">{t('Signaler')}</span>
            </button>
          ) : (
            <Link to={chemin('litiges', { ref: c.id })} className="p-ylaz0b">
              <Icone nom="r-balance" taille={21} className="p-lhsznn" />
              <span className="p-j35u7m">{t('Signaler')}</span>
            </Link>
          )}
          <button type="button" className="p-ylaz0b" aria-disabled={raisonDeplacer ? 'true' : undefined} title={raisonDeplacer ? t(raisonDeplacer) : undefined} aria-haspopup="dialog" onClick={() => (raisonDeplacer ? (signal('erreur'), annoncer({ ton: 'erreur', texte: t(raisonDeplacer) })) : (signal('toucher'), setFeuille(true)))}>
            <Icone nom="r-lieu" taille={21} className="p-672m16" />
            <span className="p-j35u7m">{t('Déplacer')}</span>
          </button>
        </div>
        {raisonRemettre && (
          <p id="r6-motif" className="r6-alerte r6-info">
            <Icone nom="info" taille={18} />
            <span>{t(raisonRemettre)}</span>
          </p>
        )}
        <div className="p-yi6rkz" aria-labelledby="r6-parcours-t">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu" id="r6-parcours-t">
              {t('Parcours du colis')}
            </h2>
          </div>
          <ol className="r6-frise">
            {f.parcours.map((e, i) => {
              const [titre, sous, ton] = etape(e)
              const dernier = i === f.parcours.length - 1
              return (
                <li key={i} className="p-fkc6m2">
                  <div className="p-py0ju2" aria-hidden="true">
                    <span className={POINT[ton]} />
                    {!dernier && <span className="p-oxoo73" />}
                  </div>
                  <div className={dernier ? 'p-2z0wdo' : 'p-8fadah'}>
                    <div className="p-lt8hj6">{titre}</div>
                    <div className="p-46lk2m">{sous}</div>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
        <CarteGarde f={f} />
        <Preuves preuves={f.preuves} />
        <Journal entrees={f.journal} />
        <div className="p-gh7puf">
          <Icone nom="r-cadenas" taille={18} className="p-672m16" />
          <div>
            {t('Aucune donnée du client ni du vendeur ici : c’est voulu. Pour toute question sur ce colis, passez par la Messagerie.')}{' '}
            <Link to={chemin('messagerie', { sujet: c.id })} className="r6-lien-texte">
              {t('Écrire au support')}
            </Link>
          </div>
        </div>
      </>
    )
  }

  return (
    <Ecran
      route="colis"
      titre={ref ? tf('Colis {ref}', { ref }) : undefined}
      fixes={
        <>
          {f && (
            <Deplacer
              f={f}
              ouverte={feuille}
              fermer={() => setFeuille(false)}
              fait={(code, enFile) => {
                setFeuille(false)
                annoncer({ ton: enFile ? 'file' : 'ok', texte: enFile ? tf('Rangé en {c} sur le téléphone : envoi au retour du réseau.', { c: code }) : tf('Rangé en {c}. C’est noté au journal.', { c: code }) })
              }}
            />
          )}
          <Annonce avis={avis} />
        </>
      }
    >
      <div className="p-0hxmj8 r-pile">{contenu()}</div>
    </Ecran>
  )
}

function FicheAbsente({ ref_, relire }: { ref_: string; relire: () => void }) {
  const { t, tf } = usePreferences()
  return (
    <Vide icone="package-search" titre="Colis introuvable au relais" texte={tf('Aucun colis {ref} n’est connu de votre relais. Vérifiez l’étiquette, ou cherchez-le dans le stock.', { ref: ref_ })}>
      <div className="r6-feuille" style={{ marginTop: 16 }}>
        <Link className="r-btn r-principal" to={chemin('stock')}>
          <Icone nom="r-grille" taille={20} />
          <span>{t('Chercher dans le stock')}</span>
        </Link>
        <button type="button" className="r-btn r-second" onClick={relire}>
          <Icone nom="rotate-cw" taille={20} />
          <span>{t('Réessayer')}</span>
        </button>
      </div>
    </Vide>
  )
}
