// LIV-P05 · Disponibilité et statut. Comme dans le prototype, c'est une FEUILLE DU BAS posée sur Aujourd'hui (en-tête
// racine) : l'adresse /statut rend le corps d'Aujourd'hui et la feuille par-dessus ; la fermer ramène à Aujourd'hui.
// ?choix=<statut> : ouverte sur ce choix ; ?paquet=<id> : « Je ne peux pas faire ce paquet » (livA_cantSheet) :
// - aucun colis ramassé → « Rendre le paquet à <entreprise> » : retour à l'entreprise qui le réaffecte, prévenue tout
//   de suite, jamais un refus silencieux (LIV-04-R19, LIV-RG-R60) ;
// - colis déjà ramassés → le paquet ne se rend plus tel quel : incident « livreur et véhicule » pré-rempli, transfert
//   organisé par l'entreprise avec scan ; en cas de panne, le livreur reste en pause jusqu'au transfert (LIV-04-R20).
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Feuille } from '@client/composants/Feuille'
import { Ecran } from '../../composants/coque'
import { Btn, Hint, Note } from '../../composants/proto'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import type { Disponibilite } from '../../donnees/communs'
import type { MotifImpossible, Paquet } from '../../donnees/domaines/paquets'
import { geste, origine, useEnLigne } from '../../donnees/fileHorsLigne'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { ChoixStatut, Radio } from './ChoixStatut'
import { Chargement, ErreurLecture } from './commun'
import { CorpsAujourdhui, useFermerFeuille } from './Journee'
import './liv04.css'

export default function Statut() {
  const [params] = useSearchParams()
  const { t } = usePreferences()
  const paquetId = params.get('paquet')
  const fermer = useFermerFeuille()
  return (
    <Ecran
      route="statut"
      proto
      fixes={
        <Feuille ouverte fermer={fermer} titre={paquetId ? t('Je ne peux pas faire ce paquet') : t('Mon statut')} forme="modale">
          {paquetId ? <JeNePeuxPas id={paquetId} fermer={fermer} /> : <FeuilleStatut fermer={fermer} />}
        </Feuille>
      }
    >
      <CorpsAujourdhui />
    </Ecran>
  )
}

function FeuilleStatut({ fermer }: { fermer: () => void }) {
  const [params] = useSearchParams()
  const choix = params.get('choix') as Disponibilite | null
  const s = useSession()
  const lecture = useLecture(() => source.disponibilite.lire(), [])
  if (lecture.erreur) return <ErreurLecture relire={lecture.relire} />
  if (!lecture.donnees) return <Chargement lignes={4} />
  return <ChoixStatut key={choix ?? ''} d={lecture.donnees} initial={choix} fini={fermer} maintenantServeur={s.maintenant} />
}

const MOTIFS: { id: MotifImpossible; mot: string; detail: string }[] = [
  { id: 'panne', mot: 'Panne du véhicule', detail: 'Moto, crevaison, batterie' },
  { id: 'sante', mot: 'Santé', detail: 'Malaise, maladie' },
  { id: 'securite', mot: 'Sécurité', detail: 'Menace, lieu dangereux, accident' },
]

function JeNePeuxPas({ id, fermer }: { id: string; fermer: () => void }) {
  const lecture = useLecture(() => source.paquets.paquet(id), [id])
  const { t } = usePreferences()
  if (lecture.erreur) return <ErreurLecture relire={lecture.relire} />
  if (lecture.donnees === null)
    return (
      <>
        <h2 className="b8 t19 l4-feuille-t">{t('Je ne peux pas faire ce paquet')}</h2>
        <Note ton="ink" icone="info">
          {t('Ce paquet n’est plus à vous : rien à faire.')}
        </Note>
        <div className="btns liva-col mt14">
          <Btn kind="secondary" onClick={fermer}>
            {t('Retour à ma journée')}
          </Btn>
        </div>
      </>
    )
  if (!lecture.donnees) return <Chargement lignes={3} />
  return <Impossible p={lecture.donnees} fermer={fermer} />
}

function Impossible({ p, fermer }: { p: Paquet; fermer: () => void }) {
  const { t, tf } = usePreferences()
  const s = useSession()
  const enLigne = useEnLigne()
  const naviguer = useNavigate()
  const [motif, setMotif] = useState<MotifImpossible | null>(null)
  const [fait, setFait] = useState<'rendu' | 'en_file' | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const ramasses = p.colisRamasses
  const titre = (
    <>
      <h2 className="b8 t19 l4-feuille-t">{t('Je ne peux pas faire ce paquet')}</h2>
      <div className="t13 c3 mt4">
        <span className="no-tr">{p.id}</span> · {tf('{entreprise} est prévenue tout de suite : ce n’est jamais un refus silencieux.', { entreprise: p.entreprise })}
      </div>
    </>
  )
  if (p.etat === 'rendu' || fait)
    return (
      <>
        {titre}
        <Note ton="green" icone="circle-check" role="status">
          <b>{tf('Paquet {id} rendu à {entreprise}', { id: p.id, entreprise: p.entreprise })}</b> · {fait === 'en_file' ? t('sans réseau : votre déclaration part au retour du réseau, avec son heure.') : t('votre entreprise est prévenue et le réaffecte.')}
        </Note>
        <div className="btns liva-col mt14">
          <Btn kind="secondary" onClick={fermer}>
            {t('Retour à ma journée')}
          </Btn>
        </div>
      </>
    )
  if (!['affecte', 'modifie', 'en_cours', 'bloque'].includes(p.etat))
    return (
      <>
        {titre}
        <Note ton="ink" icone="info">
          {t('Ce paquet est terminé : rien à rendre.')}
        </Note>
      </>
    )
  const rendre = async () => {
    if (!motif) return
    const o = origine(s.maintenant)
    // Hors connexion : appliquée au téléphone et mise en file avec sa charge (heure d'origine, clé d'idempotence).
    const g = await geste(enLigne, 'paquet_rendu', p.id, o, (x) => x.paquets.impossible(p.id, motif, o), true)
    if (g.etat === 'en_file') {
      signal('toucher')
      return setFait('en_file')
    }
    const r = g.r
    if (r.ok) {
      signal('succes')
      return setFait('rendu')
    }
    signal('erreur')
    setErreur(r.raison === 'deja_ramasse' ? t('Des colis ont déjà été ramassés : déclarez un incident.') : t('Ce paquet ne peut plus être rendu.'))
  }
  const incident = async () => {
    if (!motif) return
    // Panne : le livreur reste en pause jusqu'à la fin du transfert (LIV-RG-R59).
    if (motif === 'panne') {
      const o = origine(s.maintenant)
      await geste(enLigne, 'disponibilite', 'en_pause|Panne|', o, (x) => x.disponibilite.changer('en_pause', o, { motif: 'Panne', minutes: null }))
    }
    naviguer(chemin('incident', { famille: 'livreur', type: motif, paquet: p.id }))
  }
  const libelleIncident = { panne: 'Déclarer l’incident « panne »', sante: 'Déclarer l’incident « santé »', securite: 'Déclarer l’incident « sécurité »' }
  return (
    <>
      {titre}
      <div role="radiogroup" aria-label={t('Motif')}>
        {MOTIFS.map((m) => (
          <Radio key={m.id} on={motif === m.id} onClick={() => setMotif(m.id)} t={t(m.mot)} s={t(m.detail)} />
        ))}
      </div>
      {ramasses === 0 ? (
        <>
          <Note ton="acc" icone="rotate-ccw">
            <b>{t('Aucun colis ramassé')}</b> : {tf('le paquet retourne à {entreprise}, qui le réaffecte. Le paquet n’est pas commencé.', { entreprise: p.entreprise })}
          </Note>
          <Hint icone="info">{t('Un paquet se fait en entier, ou il est rendu avant le premier ramassage : il ne se découpe jamais.')}</Hint>
        </>
      ) : (
        <Note ton="red" icone="package-check">
          <b>{ramasses === 1 ? t('1 colis est déjà sous votre garde') : tf('{n} colis sont déjà sous votre garde', { n: ramasses })}</b> : {tf('le paquet ne peut plus être rendu tel quel. Déclarez un incident ; {entreprise} organise le transfert à un autre livreur, colis par colis, avec scan.', { entreprise: p.entreprise })}
        </Note>
      )}
      {erreur && (
        <Note ton="red" icone="circle-alert" role="alert">
          {erreur}
        </Note>
      )}
      {!enLigne && ramasses === 0 && <Hint icone="wifi-off">{t('Sans réseau : le paquet est rendu sur le téléphone, la déclaration part au retour du réseau avec son heure.')}</Hint>}
      <div className="btns liva-col mt14">
        {ramasses === 0 ? (
          <Btn kind="red" icone="undo-2" cls="xl" off={!motif} onClick={() => void rendre()}>
            {tf('Rendre le paquet à {entreprise}', { entreprise: p.entreprise })}
          </Btn>
        ) : (
          <Btn kind="red" icone="triangle-alert" cls="xl" off={!motif} onClick={() => void incident()}>
            {t(libelleIncident[motif ?? 'panne'])}
          </Btn>
        )}
        <Btn kind="secondary" onClick={fermer}>
          {t('Annuler')}
        </Btn>
      </div>
    </>
  )
}
