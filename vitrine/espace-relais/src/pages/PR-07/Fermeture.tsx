// Fermeture exceptionnelle (PR-07 § 2, prototype « Fermeture », états 1 à 3 jours · moins de 24 h · plus de 3 jours).
// Prévenir BelivaY pour que les colis et les clients soient pris en charge (FER-01 à FER-07, DP-42, ARL-20).
// - Quand ? : semaine touchable (jours fermés en bleu), Du / Au, réouverture ; un employé (droit « Fermeture imprévue du
//   jour ») ne peut fermer qu'aujourd'hui ; les fermetures programmées sont au gérant (FER-07).
// - Motif : congé (PR-FER-CONGE-PREAVIS-H avant, sans justificatif), maladie, urgence familiale (justificatif sous
//   PR-FER-JUSTIF-MALADIE-H / PR-FER-JUSTIF-URGENCE-J, joignable maintenant ou plus tard), force majeure.
// - Durée : < 24 h « rouvre demain », rien ne bouge ; au-delà, le client choisit un autre relais, sinon transfert après
//   RELAIS-FERME-TRANSFERT-H ; au-delà de PR-FER-MASQUE-J jours, relais masqué ; PR-FER-APPEL-J : BelivaY appelle. La
//   conséquence affichée change avec la durée, chiffrée par le serveur (colis concernés).
// - Fermetures prévues (annuler, rouvrir maintenant, justificatif) et passées.
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Feuille } from '@client/composants/Feuille'
import { HEURE, JOUR, ajouterJours, debutDuJour, ecartJours, jourDe, jourSemaine, type Jour } from '../../calculs/temps'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { usePeut } from '../../config/droits'
import type { Photo, Resultat } from '../../donnees/communs'
import type { DureeFermeture, Fermeture as F_, MotifFermeture, TypeFermeture } from '../../donnees/domaines/fermeture'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { echeance, jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { Avis, Chargement, ErreurLecture, PrisePhoto, dateCourte, useGeste } from './commun'
import { REGLES as R } from './regles'
import './pr07.css'

const JOURS_COURTS = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.']
const MOTIFS: { id: MotifFermeture; libelle: string; icone: string }[] = [
  { id: 'conge', libelle: 'Congé', icone: 'r-calendrier' },
  { id: 'maladie', libelle: 'Maladie', icone: 'r-alerte' },
  { id: 'urgence_familiale', libelle: 'Urgence familiale', icone: 'r-personne' },
  { id: 'force_majeure', libelle: 'Force majeure', icone: 'r-alerte' },
]
const DUREES: { id: DureeFermeture; libelle: string }[] = [
  { id: 'moins_24h', libelle: '< 24 h' },
  { id: 'un_a_trois_jours', libelle: '1 à 3 jours' },
  { id: 'plus_de_trois_jours', libelle: '> 3 jours' },
]
const MOTIF_TEXTE: Record<string, string> = { conge: 'Congé', maladie: 'Maladie', urgence_familiale: 'Urgence familiale', force_majeure: 'Force majeure' }

export default function Fermeture() {
  const { t, tf, langue } = usePreferences()
  const { maintenant } = useSession()
  const gerant = usePeut('fermetureProgrammee')
  const duJour = usePeut('fermetureDuJour')
  const { faire, occupe } = useGeste()
  const auj = jourDe(maintenant)
  // Gérant : une fermeture programmée de 2 jours après le préavis du congé (comme le prototype) ; employé : aujourd'hui.
  const debut = ajouterJours(auj, Math.ceil((R.congePreavisH * HEURE) / JOUR) + 1)
  // « ?etat=d1|d9 » : états du prototype (moins de 24 h, plus de 3 jours), gardés comme liens profonds.
  const [params] = useSearchParams()
  const etat = params.get('etat')
  const [du, setDu] = useState<Jour>(gerant ? debut : auj)
  const [au, setAu] = useState<Jour>(!gerant || etat === 'd1' ? (gerant ? debut : auj) : ajouterJours(debut, etat === 'd9' ? R.masqueJ : 1))
  const [semaine, setSemaine] = useState(0)
  const [motif, setMotif] = useState<MotifFermeture>(gerant ? 'conge' : 'maladie')
  const [justif, setJustif] = useState<Photo | null>(null)
  const [camera, setCamera] = useState<string | null>(null)
  const [confirmer, setConfirmer] = useState(false)
  const [avis, setAvis] = useState<{ ton: 'vert' | 'ambre' | 'rouge'; texte: string } | null>(null)
  const type: TypeFermeture = du === auj && au === auj ? 'imprevue_jour' : 'programmee'
  const apercu = useLecture(() => source.fermeture.apercu({ type, motif, du, au }), [type, motif, du, au])
  const liste = useLecture(() => source.fermeture.fermetures(), [])
  const a = apercu.donnees
  const duree: DureeFermeture = du === au ? 'moins_24h' : ecartJours(du, au) + 1 <= R.masqueJ ? 'un_a_trois_jours' : 'plus_de_trois_jours'
  const nb = ecartJours(du, au) + 1

  useEffect(() => {
    if (!gerant) {
      setDu(auj)
      setAu(auj)
    }
  }, [gerant, auj])

  // Semaine affichée : du lundi de la semaine de « Du », décalée par les flèches.
  const lundi = ajouterJours(ajouterJours(du, -jourSemaine(du)), semaine * 7)
  const jours = Array.from({ length: 7 }, (_, k) => ajouterJours(lundi, k))
  const toucher = (j: Jour) => {
    setAvis(null)
    if (du === au && j > du) setAu(j)
    else {
      setDu(j)
      setAu(j)
      setSemaine(0)
    }
  }
  const choisirDuree = (d: DureeFermeture) => {
    setAvis(null)
    setAu(d === 'moins_24h' ? du : d === 'un_a_trois_jours' ? ajouterJours(du, Math.min(1, R.masqueJ - 1)) : ajouterJours(du, R.masqueJ))
  }
  const date = (j: Jour) => jourLong(debutDuJour(j) + 12 * HEURE, langue)

  const refusTexte: Record<string, string> = {
    droit_refuse: type === 'programmee' ? t('Les fermetures programmées sont réservées au gérant. Vous pouvez déclarer une fermeture imprévue pour aujourd’hui seulement.') : t('Demandez au gérant le droit « Fermeture imprévue du jour ».'),
    preavis_insuffisant: tf('Un congé se déclare au moins {h} h avant : choisissez une date plus tardive, ou un autre motif.', { h: R.congePreavisH }),
    motif_interdit: tf('Un congé se déclare au moins {h} h avant : pour aujourd’hui, choisissez maladie, urgence familiale ou force majeure.', { h: R.congePreavisH }),
    chevauchement: t('Une fermeture est déjà déclarée sur ces dates : annulez-la ou choisissez d’autres jours.'),
    dates_invalides: t('Choisissez des dates à partir d’aujourd’hui.'),
  }

  const declarer = async () => {
    const x = await faire('fermeture', du, (s, o) => s.fermeture.declarer({ type, motif, du, au }, o))
    setConfirmer(false)
    if (!x) return
    if (!x.r.ok) return setAvis({ ton: 'rouge', texte: refusTexte[x.r.raison] ?? t('Déclaration refusée.') })
    const id = x.r.id
    if (justif) await faire('photo', id, (s, o) => s.fermeture.joindreJustificatif(id, justif, o), { photos: 1 })
    setJustif(null)
    setAvis({
      ton: x.etat === 'en_file' ? 'ambre' : 'vert',
      texte: x.etat === 'en_file' ? t('Déclaration gardée sur le téléphone : BelivaY la reçoit au retour du réseau. Prévenez aussi le support si la coupure dure.') : x.r.rouvreLe ? tf('Fermeture déclarée. BelivaY prévient les clients et les livreurs ; réouverture {q}.', { q: echeance(x.r.rouvreLe, maintenant, langue) }) : t('Fermeture déclarée. BelivaY prévient les clients et les livreurs.'),
    })
    window.scrollTo({ top: 0 })
  }

  const prevues = liste.donnees?.filter((f) => f.statut === 'prevue' || f.statut === 'en_cours') ?? []
  const passees = liste.donnees?.filter((f) => f.statut === 'terminee') ?? []
  const justifRequis = motif === 'maladie' || motif === 'urgence_familiale'

  return (
    <Ecran route="fermeture">
      <div className="p-0hxmj8 r-pile r7">
        <div>
          <h1 className="p-bvhkrl">{t('Fermeture exceptionnelle')}</h1>
          <div className="p-t2u0o2">{t('Prévenez BelivaY : on s’occupe des colis et des clients.')}</div>
        </div>
        {avis && <Avis ton={avis.ton}>{avis.texte}</Avis>}

        <div className="p-yi6rkz">
          <div className="p-unncbq r7-entete">
            <h2 className="p-9j1bbu" id="r7-quand">{t('Quand ?')}</h2>
            {gerant && (
              <span className="r7-fleches">
                <button type="button" className="r-ibtn" aria-label={t('Semaine précédente')} disabled={lundi <= ajouterJours(auj, -jourSemaine(auj))} data-raison={t('Semaine en cours')} onClick={() => setSemaine((s) => s - 1)}>
                  <Icone nom="r-chevron-gauche" taille={20} />
                </button>
                <button type="button" className="r-ibtn" aria-label={t('Semaine suivante')} onClick={() => setSemaine((s) => s + 1)}>
                  <Icone nom="r-chevron-droite" taille={20} />
                </button>
              </span>
            )}
          </div>
          <div className="p-340snk" role="group" aria-labelledby="r7-quand">
            {jours.map((j, k) => {
              const ferme = du <= j && j <= au
              const passe = j < auj || (!gerant && j !== auj)
              return (
                <button key={j} type="button" className={(ferme ? 'p-axsmpa' : 'p-rbnapz') + (passe ? ' r7-passe' : '') + (j === auj && !ferme ? ' r7-auj' : '')} aria-pressed={ferme} aria-label={tf('{jour}{etat}', { jour: date(j), etat: ferme ? ' · ' + t('fermé') : '' })} disabled={passe} data-raison={j < auj ? t('Jour passé') : t('Réservé au gérant')} onClick={() => toucher(j)}>
                  <div className="p-tdwilg">{t(JOURS_COURTS[k])}</div>
                  <div className="p-a81pfk">{String(Number(j.slice(8)))}</div>
                </button>
              )
            })}
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">{t('Du')}</span>
            <span className="p-2vq92h">{date(du)}</span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">{t('Au')}</span>
            <span className="p-2vq92h">{a?.rouvreLe ? tf('{au} · réouverture {r}', { au: date(au), r: jourLong(a.rouvreLe, langue) }) : date(au)}</span>
          </div>
          {!gerant && <p className="r7-note">{t('Avec votre droit, vous déclarez une fermeture imprévue pour aujourd’hui seulement.')}</p>}
        </div>

        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu" id="r7-motif-f">{t('Motif')}</h2>
          </div>
          <div role="radiogroup" aria-labelledby="r7-motif-f" className="r7-panneau">
            {MOTIFS.map((m) => (
              <button key={m.id} type="button" role="radio" aria-checked={motif === m.id} className={motif === m.id ? 'p-sl6oyc' : 'p-uj7at8'} onClick={() => (setMotif(m.id), setAvis(null))}>
                <Icone nom={m.icone} taille={20} className="p-672m16" />
                <div className="p-lmo74g">
                  <div className="p-dfc4i3">{t(m.libelle)}</div>
                  <div className="p-t1lapd">
                    {m.id === 'conge'
                      ? tf('À déclarer {h} h avant · aucun justificatif', { h: R.congePreavisH })
                      : m.id === 'maladie'
                        ? tf('Le jour même · justificatif sous {h} h', { h: R.justifMaladieH })
                        : m.id === 'urgence_familiale'
                          ? tf('Le jour même · justificatif sous {j} jours', { j: R.justifUrgenceJ })
                          : t('Coupure, inondation, sinistre')}
                  </div>
                </div>
              </button>
            ))}
          </div>
          {justifRequis && (
            <>
              <button type="button" className="p-rbzobc" onClick={() => setCamera('nouveau')}>
                <Icone nom={justif ? 'check' : 'r-document'} taille={18} className="p-emic6i" />
                {justif ? t('Justificatif pris · reprendre') : t('Joindre le justificatif (photo)')}
              </button>
              <p className="r7-note">{a?.justificatifAvant ? tf('Facultatif maintenant : à joindre au plus tard {q}, depuis « Fermetures prévues ».', { q: echeance(a.justificatifAvant, maintenant, langue) }) : null}</p>
            </>
          )}
        </div>

        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu" id="r7-duree">{t('Durée')}</h2>
          </div>
          <div className="p-lvzt0c" role="radiogroup" aria-labelledby="r7-duree">
            {DUREES.map((d) => (
              <button key={d.id} type="button" role="radio" aria-checked={duree === d.id} className={duree === d.id ? 'p-h01hlk' : 'p-bq7aiq'} disabled={!gerant && d.id !== 'moins_24h'} data-raison={t('Réservé au gérant')} onClick={() => choisirDuree(d.id)}>
                {t(d.libelle)}
              </button>
            ))}
          </div>
          {apercu.erreur ? (
            <ErreurLecture relire={apercu.relire} />
          ) : !a ? (
            <Chargement />
          ) : duree === 'moins_24h' ? (
            <div className="p-7khaoo" aria-live="polite">
              <Icone nom="r-horloge" taille={18} className="p-q7qjlz" />
              <div>
                {t('Rien ne bouge : vous gardez les colis. Les clients voient « rouvre demain », les livreurs ne passent pas.')}{' '}
                {tf('{n} colis restent chez vous, sans frais pour leurs clients ce jour-là.', { n: a.colisEnStock })}
                {a.colisAttendus > 0 && <> {tf('{n} colis annoncés aujourd’hui arrivent à la réouverture.', { n: a.colisAttendus })}</>}
              </div>
            </div>
          ) : (
            <div className={duree === 'plus_de_trois_jours' ? 'p-fht1zk' : 'p-gh7puf'} aria-live="polite">
              <Icone nom={duree === 'plus_de_trois_jours' ? 'r-alerte' : 'r-camion'} taille={18} className={duree === 'plus_de_trois_jours' ? 'p-lhsznn' : 'p-672m16'} />
              <div>
                {tf('Plus aucun nouveau colis dès la veille ({veille}). Vos {n} colis : chaque client choisit gratuitement un autre relais ; sans réponse sous {h} h, son colis part au relais ouvert le plus proche avec la dernière collecte. Il reçoit la nouvelle adresse et un nouveau code ; sa garde repart au jour 1.', { veille: a.sansNouveauxColisDes ? date(a.sansNouveauxColisDes) : '—', n: a.colisEnStock, h: R.transfertH })}
                {duree === 'plus_de_trois_jours' && <> {tf('Votre relais est aussi masqué du choix des clients jusqu’à votre retour. Au-delà de {j} jours, BelivaY vous appelle pour faire le point.', { j: R.appelJ })}</>}
              </div>
            </div>
          )}
          <div className="p-81u2s6">
            {t('Les jours de fermeture ne comptent pas dans la garde du client (le renvoi recule d’autant), et le transfert ne vous coûte rien. Un employé peut déclarer une fermeture imprévue pour aujourd’hui ; les fermetures programmées restent réservées au gérant.')}{' '}
            {t('Une fermeture non déclarée, constatée par un livreur ou un client, fait baisser votre Ponctualité.')}
          </div>
        </div>

        {a?.refus && <Avis ton="rouge">{refusTexte[a.refus]}</Avis>}
        <button type="button" className="p-ncx7qc r7-action" disabled={!a || !!a.refus || occupe || !(gerant || duJour)} aria-describedby={a?.refus ? undefined : 'r7-resume'} data-raison={a?.refus ? refusTexte[a.refus] : t('Chargement')} onClick={() => setConfirmer(true)}>
          <Icone nom="r-fermeture" taille={18} className="p-7dsggt" />
          {t('Déclarer la fermeture')}
        </button>
        <p id="r7-resume" className="r7-manque">
          {du === au ? tf('{motif} · {du}', { motif: t(MOTIF_TEXTE[motif]), du: date(du) }) : tf('{motif} · {n} jours, du {du} au {au}', { motif: t(MOTIF_TEXTE[motif]), n: nb, du: date(du), au: date(au) })}
        </p>

        <ListeFermetures titre={t('Fermetures prévues')} liste={prevues} lecture={liste} vide={t('Aucune fermeture prévue.')} setAvis={setAvis} photo={(id) => setCamera(id)} />
        <ListeFermetures titre={t('Fermetures passées')} liste={passees} lecture={liste} vide={t('Aucune fermeture passée.')} setAvis={setAvis} photo={(id) => setCamera(id)} />
      </div>

      <PrisePhoto
        ouverte={camera !== null}
        fermer={() => setCamera(null)}
        consigne={t('Justificatif (certificat, attestation)')}
        prise={(ph) => {
          const id = camera
          if (id === 'nouveau') return setJustif(ph)
          if (id)
            void faire('photo', id, (s, o) => s.fermeture.joindreJustificatif(id, ph, o), { photos: 1 }).then((x) => x && setAvis(x.r.ok ? { ton: x.etat === 'en_file' ? 'ambre' : 'vert', texte: t('Justificatif joint : BelivaY le vérifie.') } : { ton: 'rouge', texte: t('Ce motif ne demande pas de justificatif.') }))
        }}
      />
      <Feuille ouverte={confirmer} fermer={() => setConfirmer(false)} titre={t('Déclarer la fermeture')}>
        <div className="r7-sheet-h">{t('Déclarer la fermeture')}</div>
        <p className="r7-texte">{du === au ? tf('{motif} · {du}', { motif: t(MOTIF_TEXTE[motif]), du: date(du) }) : tf('{motif} · {n} jours, du {du} au {au}', { motif: t(MOTIF_TEXTE[motif]), n: nb, du: date(du), au: date(au) })}</p>
        <p className="r7-note r7-mt">{duree === 'moins_24h' ? t('Les clients verront « rouvre demain ». Vous gardez les colis.') : tf('Les clients de vos {n} colis choisiront un autre relais, sinon transfert automatique.', { n: a?.colisEnStock ?? 0 })}</p>
        <button type="button" className="r-btn r-principal r7-mt" disabled={occupe} onClick={() => void declarer()}>
          <Icone nom="r-fermeture" taille={18} />
          {occupe ? t('Envoi…') : t('Confirmer la fermeture')}
        </button>
      </Feuille>
    </Ecran>
  )
}

function ListeFermetures(p: { titre: string; liste: F_[]; lecture: { erreur: Error | null; donnees: F_[] | null; relire: () => void }; vide: string; setAvis: (a: { ton: 'vert' | 'ambre' | 'rouge'; texte: string }) => void; photo: (id: string) => void }) {
  const { t, tf, langue } = usePreferences()
  const { maintenant } = useSession()
  const gerant = usePeut('fermetureProgrammee')
  const duJour = usePeut('fermetureDuJour')
  const { faire, occupe } = useGeste()
  const agir = async (f: F_, quoi: 'annuler' | 'rouvrir') => {
    const x = await faire('fermeture', f.id, (s, o): Promise<Resultat<object, string>> => (quoi === 'annuler' ? s.fermeture.annuler(f.id, o) : s.fermeture.rouvrir(f.id, o)))
    if (x) p.setAvis(x.r.ok ? { ton: x.etat === 'en_file' ? 'ambre' : 'vert', texte: quoi === 'annuler' ? t('Fermeture annulée : le relais reste ouvert ces jours-là.') : t('Relais rouvert : il reparaît ouvert aux clients.') } : { ton: 'rouge', texte: t('Action refusée : la fermeture a déjà commencé, ou votre accès ne le permet pas.') })
  }
  return (
    <div className="p-yi6rkz">
      <div className="p-unncbq">
        <h2 className="p-9j1bbu">{p.titre}</h2>
      </div>
      {p.lecture.erreur ? (
        <ErreurLecture relire={p.lecture.relire} />
      ) : !p.lecture.donnees ? (
        <Chargement />
      ) : !p.liste.length ? (
        <p className="r7-note">{p.vide}</p>
      ) : (
        p.liste.map((f) => {
          const n = ecartJours(f.du, f.au) + 1
          const avance = ecartJours(jourDe(f.declareeA), f.du)
          const manque = !!f.justificatifAvant && !f.justificatif
          const [pill, cl] =
            f.statut === 'en_cours'
              ? [t('En cours'), 'p-h4wlx0']
              : f.statut === 'prevue'
                ? [t('Prévue'), 'p-rpzy79']
                : manque
                  ? [t('Justificatif manquant'), 'p-h4wlx0']
                  : f.duree === 'moins_24h'
                    ? [t('Sans impact'), 'p-nax3x4']
                    : [tf('{n} colis transférés', { n: f.colisConcernes }), 'p-nax3x4']
          return (
            <div key={f.id} className="r7-panneau">
              <div className="p-o24hsm">
                <div className="p-tc472u">
                  <Icone nom="r-calendrier" taille={20} className="p-q7qjlz" />
                </div>
                <div className="p-rnqj8n">
                  <div className="p-ife3a2">{n === 1 ? tf('{date} · 1 jour', { date: dateCourte(debutDuJour(f.du) + 12 * HEURE, langue) }) : tf('{date} · {n} jours', { date: dateCourte(debutDuJour(f.du) + 12 * HEURE, langue), n })}</div>
                  <div className="p-dfa05r">
                    {t(MOTIF_TEXTE[f.motif])} · {f.type === 'imprevue_jour' ? t('imprévue, déclarée le jour même') : avance > 1 ? tf('déclaré {n} jours avant', { n: avance }) : avance === 1 ? t('déclaré la veille') : t('déclaré le jour même')}
                    {f.statut === 'en_cours' && f.rouvreA ? ' · ' + tf('rouvre {q}', { q: echeance(f.rouvreA, maintenant, langue) }) : ''}
                  </div>
                </div>
                <span className={cl}>{pill}</span>
              </div>
              {(f.statut === 'prevue' || f.statut === 'en_cours' || manque) && (
                <div className="r7-actions">
                  {f.statut === 'prevue' && (gerant || (f.type === 'imprevue_jour' && duJour)) && (
                    <button type="button" className="r-btn r-second" disabled={occupe} onClick={() => void agir(f, 'annuler')}>
                      <Icone nom="r-annuler" taille={18} />
                      {t('Annuler')}
                    </button>
                  )}
                  {f.statut === 'en_cours' && f.type === 'imprevue_jour' && duJour && (
                    <button type="button" className="r-btn r-second" disabled={occupe} onClick={() => void agir(f, 'rouvrir')}>
                      <Icone nom="door-open" taille={18} />
                      {t('Rouvrir maintenant')}
                    </button>
                  )}
                  {manque && (
                    <button type="button" className="r-btn r-second" onClick={() => p.photo(f.id)}>
                      <Icone nom="r-document" taille={18} />
                      {f.justificatifAvant! < maintenant ? t('Joindre le justificatif (en retard)') : tf('Justificatif avant {q}', { q: echeance(f.justificatifAvant!, maintenant, langue) })}
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
