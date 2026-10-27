// Ma boutique (VD-11) : repris du prototype (route('boutique')), branché sur la source.
// - « Ce que voit le client » : composant fixe, alimenté seulement par le palier et le Trust Score, seule carte aux
//   couleurs fixes (fond blanc) dans les deux thèmes (VD11-R07, BOU-01) ; dernier état connu si indisponible (R08).
// - Réglages du plus utilisé au moins utilisé, chacun avec sa valeur actuelle (VD11-R12) ; état du jour (ouverte,
//   fermée jusqu'à…, en pause).
// - Vitrine INTERNE (consigne du groupe) : photo de la devanture, logo rogné, description — pour vous, l'agent de zone
//   et le livreur, jamais montrées au client (VD11-R11 : aucune vitrine publique, aucune page, aucun QR).
// - Sécurité de la boutique (demande du porteur, 6 oct.) : chaque champ dit s'il est « Modifiable » (description,
//   photos, horaires, emplacements), « Sur demande » (nom, titulaire, RCCM et NIU : demande à BelivaY avec motif,
//   pièces et code SMS, suivie en attente → acceptée / refusée avec son historique ; numéro de versement : son propre
//   parcours, deux codes et 7 jours de revue, Q-19) ou « Non modifiable » (identifiant, zone déduite du lieu
//   principal) ; la console BelivaY (administration) valide (INTERFACES.md) ; une trace part au support (VD11-R09).
// - Accès Préparation : lecture seule (Q-18), sans l'équipe.
import { useRef, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { Ecran, nomPalier } from '../../composants/coque'
import devantureDessinee from '../../assets/illustrations/devanture.svg'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { ChampBoutique, DemandeModification, Modifiable } from '../../donnees/domaines/boutique'
import { source } from '../../donnees/source'
import { FORME_NIU, FORME_RCCM } from '../../donnees/communs'
import { useLecture } from '../../donnees/useLecture'
import { heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useHorloge, useSession } from '../../session'
import { BandeauHorsLigne, Bouton, CHAMP, Chargement, CodeSms, ErreurLecture, Feuille, dateCourte, resumeHoraires, useAnnonce, useFeuilleAdresse, usePhoto, ZONE } from './communs'

const CHAMPS: { id: ChampBoutique; nom: string; pieces: string | null }[] = [
  { id: 'nom', nom: 'Le nom de la boutique', pieces: null },
  { id: 'officiel', nom: 'Les informations officielles (RCCM, NIU)', pieces: 'Extrait du registre (RCCM) et attestation d’immatriculation (NIU).' },
  { id: 'titulaire', nom: 'Le titulaire (pièce d’identité)', pieces: 'Pièce d’identité du nouveau titulaire, recto et verso.' },
  { id: 'autre', nom: 'Autre chose', pieces: null },
]
const NOM_CHAMP: Record<ChampBoutique, string> = { nom: 'Nom de la boutique', officiel: 'RCCM et NIU', titulaire: 'Titulaire', autre: 'Autre' }
const ETAT_DEMANDE: Record<DemandeModification['statut'], { texte: string; pill: string }> = {
  en_attente: { texte: 'En attente', pill: 'amber' },
  acceptee: { texte: 'Acceptée', pill: 'green' },
  refusee: { texte: 'Refusée', pill: 'red' },
  annulee: { texte: 'Annulée', pill: 'ink' },
}
const PASTILLE: Record<Modifiable, { texte: string; pill: string; icone: string }> = {
  libre: { texte: 'Modifiable', pill: 'green', icone: 'pencil' },
  sur_demande: { texte: 'Sur demande', pill: 'amber', icone: 'file-check' },
  jamais: { texte: 'Non modifiable', pill: 'ink', icone: 'lock' },
}

/** Une ligne de « Ce qui peut changer » : le champ, sa valeur, et ce qu'il en est. */
function Champ({ nom, valeur, etat, aide, action }: { nom: string; valeur: string; etat: Modifiable; aide: string; action?: ReactNode }) {
  const { t } = usePreferences()
  const p = PASTILLE[etat]
  return (
    <div className="li" data-champ={nom} style={{ alignItems: 'flex-start', minHeight: 0 }}>
      <span className="grow" style={{ minWidth: 0 }}>
        <span className="row" style={{ gap: '6px', flexWrap: 'wrap' }}>
          <span className="t13 c3">{t(nom)}</span>
          <span className={'pill sm ' + p.pill}>
            <Icone nom={p.icone} taille={12} />
            {t(p.texte)}
          </span>
        </span>
        <span className="lt" style={{ display: 'block', overflowWrap: 'anywhere' }}>
          {valeur}
        </span>
        <span className="t12 c3" style={{ display: 'block' }}>
          {t(aide)}
        </span>
      </span>
      {action}
    </div>
  )
}

function Reglage({ vers, icone, titre, valeur }: { vers: string; icone: string; titre: string; valeur: string | null }) {
  const { t } = usePreferences()
  return (
    <Link to={vers} className="li">
      <span className="ic ">
        <Icone nom={icone} taille={20} />
      </span>
      <span className="grow">
        <span className="lt" style={{ display: 'block' }}>
          {t(titre)}
        </span>
        {valeur && (
          <span className="ls" style={{ display: 'block' }}>
            {valeur}
          </span>
        )}
      </span>
      <span className="chev">
        <Icone nom="chevron-right" taille={18} />
      </span>
    </Link>
  )
}

export default function Boutique() {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const maintenant = useHorloge()
  const prep = s.membre?.role === 'preparation'
  const lecture = useLecture(() => source.boutique.boutique(), [])
  const avis = useLecture(() => source.boutique.avis(), [])
  const equipe = useLecture(() => (prep ? Promise.resolve(null) : source.equipe.membres()), [prep])
  const [annonce, dire] = useAnnonce()
  const demande = useFeuilleAdresse('modif')
  const [params] = useSearchParams()
  const demandes = useLecture(() => (prep ? Promise.resolve([] as DemandeModification[]) : source.boutique.demandes()), [prep])
  // « Déclarer mon RCCM et mon NIU » (Documents, DOC-01) ouvre la demande sur le statut : boutique?modif=1&motif=statut.
  const [champ, setChamp] = useState<ChampBoutique>(params.get('motif') === 'statut' ? 'officiel' : 'nom')
  const [valeur, setValeur] = useState('')
  const [rccm, setRccm] = useState('')
  const [niu, setNiu] = useState('')
  const [detail, setDetail] = useState('')
  const [pieces, setPieces] = useState<{ nom: string; taille: number }[]>([])
  const [masque, setMasque] = useState<string | null>(null)
  const [erreurDetail, setErreurDetail] = useState<string | null>(null)
  const fichiers = useRef<HTMLInputElement>(null)
  const def = CHAMPS.find((c) => c.id === champ)!
  const [description, setDescription] = useState<string | null>(null)
  const b = lecture.donnees
  const vitrine = async (champs: Parameters<typeof source.boutique.modifierVitrine>[0], ok: string) => {
    const r = await source.boutique.modifierVitrine(champs)
    if (r.ok) dire(t(ok))
    else dire(t('Description trop longue : 300 caractères au plus.'), 'erreur')
  }
  const logo = usePhoto({ rogner: true, utiliser: (photo) => vitrine({ logo: photo }, 'Logo enregistré.'), erreur: (e) => dire(e, 'erreur') })
  const devanture = usePhoto({ rogner: false, utiliser: (photo) => vitrine({ photo }, 'Photo de la devanture enregistrée.'), erreur: (e) => dire(e, 'erreur') })

  // Vérifie la demande ici (mêmes règles que le serveur), puis envoie le code SMS au propriétaire.
  const preparerDemande = async () => {
    if (champ === 'officiel') {
      if (!FORME_RCCM.test(rccm.trim())) return setErreurDetail(t('RCCM : forme attendue RC-YAO-2026-B-1234.'))
      if (!FORME_NIU.test(niu.trim())) return setErreurDetail(t('NIU : une lettre, 12 chiffres, une lettre (M012345678901A).'))
    } else if (champ !== 'autre' && valeur.trim().length < 3) return setErreurDetail(t('Écrivez la nouvelle valeur.'))
    if (detail.trim().length < 10) return setErreurDetail(t('Dites en une phrase ce qui doit changer (10 caractères au moins).'))
    if (def.pieces && pieces.length === 0) return setErreurDetail(t('Ajoutez au moins une pièce justificative.'))
    const { masque } = await source.boutique.demanderCodeModification()
    setMasque(masque)
  }
  const fermerDemande = () => {
    setMasque(null)
    setErreurDetail(null)
    demande.fermer()
  }
  const vider = () => (setValeur(''), setRccm(''), setNiu(''), setDetail(''), setPieces([]))

  if (!b)
    return (
      <Ecran route="boutique">
        <div className="pg">
          <h1 className="pg-t">{t('Ma boutique')}</h1>
        </div>
        {lecture.erreur ? <ErreurLecture erreur={lecture.erreur} relire={lecture.relire} /> : <Chargement />}
      </Ecran>
    )
  const a = b.apercuClient
  const ouverture = b.pause
    ? tf('En pause jusqu’au {d}', { d: dateCourte(b.pause.jusqua, langue) })
    : b.fermeeAujourdhui
      ? b.fermeeJusqua
        ? tf('Fermée jusqu’à {jour} {h}', { jour: dateCourte(b.fermeeJusqua, langue), h: heure(b.fermeeJusqua, langue) })
        : t('Fermée aujourd’hui (fermeture programmée)')
      : tf('Ouverte · {horaires}', { horaires: resumeHoraires(b.horaires, langue) })
  const desc = description ?? b.vitrine.description
  return (
    <Ecran
      route="boutique"
      fixes={
        <>
          {annonce}
          {logo.feuille}
          <Feuille ouverte={demande.ouverte && !prep} fermer={fermerDemande} titre="Demander une modification">
            <h3 style={{ margin: '0', fontSize: '19px', fontWeight: '800' }}>{t('Demander une modification')}</h3>
            {masque === null ? (
              <>
                <p className="t13 c3" style={{ margin: '6px 0 0', lineHeight: '1.45' }}>
                  {t('BelivaY examine la demande et ses pièces, puis l’accepte ou la refuse avec un motif écrit, sous 72 h ouvrées. Rien ne change avant.')}
                </p>
                <div className="fld" role="radiogroup" aria-label={t('Ce qui doit changer')}>
                  <label>{t('Ce qui doit changer')}</label>
                  {CHAMPS.map((c) => (
                    <button key={c.id} type="button" role="radio" aria-checked={champ === c.id} className={'li' + (champ === c.id ? ' on' : '')} onClick={() => (setChamp(c.id), setErreurDetail(null))} style={{ width: '100%', background: 'none', border: 0, textAlign: 'left', font: 'inherit', color: 'inherit', cursor: 'pointer', minHeight: '48px' }}>
                      <Icone nom={champ === c.id ? 'circle-check' : 'circle'} taille={20} style={{ color: champ === c.id ? 'var(--or-txt)' : 'var(--ink-4)', flexShrink: '0' }} />
                      <span className="grow t14 b7">{t(c.nom)}</span>
                    </button>
                  ))}
                </div>
                {champ === 'officiel' ? (
                  <>
                    <div className="fld">
                      <label htmlFor="modif-rccm">{t('RCCM (registre du commerce)')}</label>
                      <input id="modif-rccm" value={rccm} onChange={(e) => (setRccm(e.target.value), setErreurDetail(null))} placeholder="RC-YAO-2026-B-1234" autoCapitalize="characters" style={ZONE} />
                    </div>
                    <div className="fld">
                      <label htmlFor="modif-niu">{t('NIU (numéro fiscal)')}</label>
                      <input id="modif-niu" value={niu} onChange={(e) => (setNiu(e.target.value), setErreurDetail(null))} placeholder="M012345678901A" autoCapitalize="characters" style={ZONE} />
                    </div>
                  </>
                ) : (
                  champ !== 'autre' && (
                    <div className="fld">
                      <label htmlFor="modif-valeur">{t(champ === 'nom' ? 'Nouveau nom' : 'Nouveau titulaire (prénom et nom)')}</label>
                      <div className="inp">
                        <input id="modif-valeur" value={valeur} maxLength={60} onChange={(e) => (setValeur(e.target.value), setErreurDetail(null))} style={CHAMP} />
                      </div>
                    </div>
                  )
                )}
                <div className="fld">
                  <label htmlFor="modif-detail">{t('Motif')}</label>
                  <textarea id="modif-detail" rows={3} maxLength={400} value={detail} onChange={(e) => (setDetail(e.target.value), setErreurDetail(null))} placeholder={t('Ex. : je suis maintenant immatriculé, RCCM reçu le 15 septembre.')} style={ZONE} />
                </div>
                <div className="fld">
                  <label htmlFor="modif-pieces">{t('Pièces justificatives')}</label>
                  <div className="hint" style={{ marginTop: 0 }}>{t(def.pieces ?? 'Facultatives : une photo ou un PDF aide BelivaY à décider.')}</div>
                  <input
                    ref={fichiers}
                    id="modif-pieces"
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    onChange={(e) => {
                      const f = [...(e.target.files ?? [])].slice(0, 5).map((x) => ({ nom: x.name, taille: x.size }))
                      setPieces((p) => [...p, ...f].slice(0, 5))
                      setErreurDetail(null)
                      e.target.value = ''
                    }}
                    style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0 }}
                  />
                  <div className="row mt8" style={{ gap: '8px', flexWrap: 'wrap' }}>
                    <Bouton classe="secondary sm" icone="paperclip" onClick={() => fichiers.current?.click()}>
                      {t('Joindre une pièce')}
                    </Bouton>
                    {pieces.map((p, i) => (
                      <span key={p.nom + i} className="pill ink sm">
                        <Icone nom="file-text" taille={12} />
                        {p.nom}
                        <button type="button" aria-label={tf('Retirer {nom}', { nom: p.nom })} onClick={() => setPieces((x) => x.filter((_, k) => k !== i))} style={{ background: 'none', border: 0, color: 'inherit', cursor: 'pointer', padding: '0 0 0 4px', minHeight: '24px', minWidth: '24px' }}>
                          <Icone nom="x" taille={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                {erreurDetail && (
                  <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
                    {erreurDetail}
                  </div>
                )}
                <div className="mt14">
                  <Bouton icone="send" onClick={() => void preparerDemande()}>
                    {t('Envoyer la demande')}
                  </Bouton>
                </div>
                <p className="t12 c3 center" style={{ margin: '8px 0 0' }}>
                  {t('Un code vous est envoyé par SMS au téléphone personnel du propriétaire.')}
                </p>
                <div className="mt8">
                  <Bouton classe="ghost" onClick={fermerDemande}>
                    {t('Annuler')}
                  </Bouton>
                </div>
              </>
            ) : (
              <CodeSms
                masque={masque}
                bouton="Confirmer la demande"
                icone="send"
                annuler={fermerDemande}
                valider={async (code) => {
                  const r = await source.boutique.demanderModification({ champ, valeur, rccm, niu, motif: detail, pieces }, code)
                  if (!r.ok) {
                    if (r.raison === 'code') return t('Code incorrect, réessayez. Rien n’a été envoyé.')
                    setMasque(null)
                    setErreurDetail(t(r.raison === 'deja' ? 'Une demande sur ce champ attend déjà la réponse de BelivaY.' : 'Vérifiez la demande : un champ manque.'))
                    return null
                  }
                  jouer('message')
                  dire(t('Demande envoyée : BelivaY vous répond sous 72 h ouvrées.'))
                  vider()
                  fermerDemande()
                  return null
                }}
              />
            )}
          </Feuille>
        </>
      }
    >
      <div className="pg">
        <h1 className="pg-t">{t('Ma boutique')}</h1>
        <p className="pg-s">{t('Le nom de votre boutique reste entre vous et BelivaY.')}</p>
      </div>
      <BandeauHorsLigne />
      <div className="hero night">
        <div className="hk">{t('Ce que voit le client')}</div>
        <div className="card" style={{ marginTop: '12px', background: '#fff', color: '#141415', boxShadow: 'inset 0 0 0 1px rgba(20,20,21,.1)' }}>
          <div className="row">
            <span className={'medal ' + a.palier.toLowerCase()}>{nomPalier(a.palier, langue)[0]}</span>
            <div className="grow">
              <div className="b8 t15">{tf('Vendeur certifié {palier}', { palier: nomPalier(a.palier, langue) })}</div>
              <div className="t13" style={{ color: '#6F6358' }}>
                {tf('Trust Score {score}', { score: Math.round(a.trustScore) })}
              </div>
            </div>
            <Icone nom="badge-check" taille={22} style={{ color: '#1F7A4D' }} />
          </div>
        </div>
        <div className="hs" style={{ marginTop: '12px' }}>
          {t('Rien d’autre : ni nom, ni photo, ni adresse, ni téléphone, ni lien, ni QR de boutique.')}
        </div>
        <div className="hs">{t('Trust Score : votre note de confiance, sur 100.')}</div>
        <Link to={chemin('palier')} className="row t13 b8" style={{ gap: '6px', marginTop: '10px', color: 'var(--gold-l)', minHeight: '44px' }}>
          <Icone nom="award" taille={16} />
          <span>{t('Faire monter mon Trust Score')}</span>
          <Icone nom="chevron-right" taille={16} />
        </Link>
      </div>
      <details className="more">
        <summary>
          <Icone nom="eye-off" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">{t('Comment ça marche')}</span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b">
          <p>
            <b>{t('Le client ne voit jamais')}</b>
            {t(' le nom de la boutique, une page boutique, une photo, l’adresse, le téléphone, le WhatsApp, un lien ou un QR.')}
          </p>
          <p>
            <b>{t('Vous ne voyez jamais')}</b>
            {t(' le nom, le numéro, l’adresse ni le quartier du client, son mode de livraison, son relais, les autres vendeurs, le total payé. Seule exception : la mention « payable au retrait ».')}
          </p>
          <p>
            <b>{t('Entre vous deux')}</b>
            {t(', aucun contact direct : une messagerie rattachée à la commande, anonyme et filtrée.')}
          </p>
        </div>
      </details>
      <div className="card tight">
        <Reglage vers={chemin('horaires')} icone="clock" titre="Horaires et fermetures" valeur={ouverture} />
        <Reglage vers={chemin('avis')} icone="star" titre="Avis" valeur={avis.donnees ? (avis.donnees.nombre ? tf(avis.donnees.nombre > 1 ? '{note} · {n} avis vérifiés' : '{note} · {n} avis vérifié', { note: avis.donnees.note!.toFixed(1).replace('.', langue === 'en' ? '.' : ','), n: avis.donnees.nombre }) : t('Pas encore d’avis')) : null} />
        {!prep && (
          <Reglage
            vers={chemin('equipe')}
            icone="users"
            titre="Mon équipe"
            valeur={equipe.donnees ? tf('{p} personnes · {e} accès employé sur {max}', { p: equipe.donnees.membres.length, e: equipe.donnees.employes, max: equipe.donnees.maxEmployes }) : null}
          />
        )}
        <Reglage vers={chemin('emplacement')} icone="map-pin" titre="Emplacements" valeur={`${b.zone} · ${b.quartier} · ${t(b.point.enAttente ? 'à vérifier' : 'vérifié')}`} />
      </div>

      <div className="card">
        <h3>{t('Votre vitrine chez BelivaY')}</h3>
        <div className="hint-l" style={{ marginTop: '6px' }}>
          <Icone nom="eye-off" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('Pour vous, l’agent de zone et le livreur : jamais montrée aux clients.')}</span>
        </div>
        <div className="row mt12" style={{ gap: '12px', alignItems: 'center' }}>
          <span className="avatar" style={{ width: '56px', height: '56px', margin: 0, overflow: 'hidden', flexShrink: 0, fontSize: '18px' }}>
            {b.vitrine.logo ? <img src={b.vitrine.logo} alt={t('Logo de la boutique')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : s.membre?.initiales}
          </span>
          <div className="grow">
            <div className="b8 t14">{t('Logo')}</div>
            <div className="t12 c3">{t('Dans votre espace et sur vos bons de préparation.')}</div>
          </div>
        </div>
        {!prep && (
          <div className="row mt8" style={{ gap: '8px', flexWrap: 'wrap' }}>
            {logo.bouton(b.vitrine.logo ? 'Changer le logo' : 'Ajouter un logo', 'secondary sm', 'image-plus')}
            {b.vitrine.logo && (
              <Bouton classe="ghost sm" icone="trash-2" onClick={() => void vitrine({ logo: null }, 'Logo retiré.')}>
                {t('Retirer')}
              </Bouton>
            )}
          </div>
        )}
        <div className="b8 t14 mt14">{t('Photo de la devanture')}</div>
        <div className="t12 c3">{t('Aide le livreur et l’agent de zone à reconnaître la boutique.')}</div>
        <div className="mt8" style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', background: 'var(--sand-3)', aspectRatio: '16 / 9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {b.vitrine.photo ? (
            <img src={b.vitrine.photo} alt={t('Devanture de la boutique')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <>
              {/* Devanture dessinée (public/images/LISEZMOI.md) tant que la boutique n'a pas sa vraie photo. */}
              <img src={devantureDessinee} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.55 }} />
              <span className="t12 b8" style={{ position: 'absolute', left: '10px', bottom: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '999px', background: 'var(--card)', color: 'var(--ink-2)', boxShadow: 'var(--shadow-card)' }}>
                <Icone nom="camera" taille={14} />
                {t('Pas encore de photo')}
              </span>
            </>
          )}
        </div>
        {!prep && (
          <div className="row mt8" style={{ gap: '8px', flexWrap: 'wrap' }}>
            {devanture.bouton(b.vitrine.photo ? 'Changer la photo' : 'Prendre ou choisir une photo', 'secondary sm', 'camera')}
            {b.vitrine.photo && (
              <Bouton classe="ghost sm" icone="trash-2" onClick={() => void vitrine({ photo: null }, 'Photo retirée.')}>
                {t('Retirer')}
              </Bouton>
            )}
          </div>
        )}
        <div className="fld">
          <label htmlFor="vitrine-desc">{t('Ce que vous vendez')}</label>
          {prep ? (
            <div className="t14 c2">{b.vitrine.description || t('Pas encore de description')}</div>
          ) : (
            <>
              <textarea
                id="vitrine-desc"
                rows={3}
                maxLength={300}
                value={desc}
                onChange={(e) => setDescription(e.target.value)}
                style={ZONE}
              />
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="hint">{t('Sert à BelivaY pour la saisie assistée et les visites.')}</span>
                <span className="hint" aria-live="polite">{`${desc.length}/300`}</span>
              </div>
              {description !== null && description !== b.vitrine.description && (
                <div className="mt8">
                  <Bouton classe="secondary" icone="check" onClick={() => void vitrine({ description: desc }, 'Description enregistrée.').then(() => setDescription(null))}>
                    {t('Enregistrer la description')}
                  </Bouton>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="card tight">
        <h3 style={{ margin: '4px 0 2px' }}>{t('Sécurité de la boutique : ce qui peut changer')}</h3>
        <Champ nom="Nom de la boutique" valeur={b.nom} etat="sur_demande" aide="Demande à BelivaY, avec un motif et un code SMS." />
        <Champ nom="Titulaire" valeur={b.titulaire} etat="sur_demande" aide="Suit la pièce d’identité : vérifiée par BelivaY." />
        <Champ nom="Informations officielles" valeur={t(b.statut === 'particulier' ? 'Particulier · sans RCCM' : 'Entreprise · RCCM et NIU')} etat="sur_demande" aide="RCCM et NIU : vérifiés sur pièces par BelivaY." />
        {!prep && (
          <Champ
            nom="Numéro de versement"
            valeur={t('Mobile Money du titulaire')}
            etat="sur_demande"
            aide="Deux codes SMS, puis 7 jours de revue avant le premier versement."
            action={
              <Link to={chemin('numero_versement')} className="t13 b8 cor" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', flexShrink: 0 }}>
                {t('Changer')}
              </Link>
            }
          />
        )}
        <Champ nom="Identifiant" valeur={b.identifiant} etat="jamais" aide="Ne change jamais : il signe vos actions." />
        <Champ nom="Zone" valeur={`${b.zone} · ${b.quartier}`} etat="jamais" aide="Calculée par BelivaY à partir du lieu principal." />
        <Champ nom="Emplacements" valeur={t('Lieu principal et autres lieux')} etat={prep ? 'jamais' : 'libre'} aide="Au-delà de 200 m, l’agent de zone vérifie le nouveau point." action={<Link to={chemin('emplacement')} className="t13 b8 cor" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', flexShrink: 0 }}>{t('Ouvrir')}</Link>} />
        <Champ nom="Horaires" valeur={resumeHoraires(b.horaires, langue)} etat={prep ? 'jamais' : 'libre'} aide="Tout de suite, sans validation." action={<Link to={chemin('horaires')} className="t13 b8 cor" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', flexShrink: 0 }}>{t('Ouvrir')}</Link>} />
        <Champ nom="Description, logo et photos" valeur={t('Votre vitrine chez BelivaY')} etat={prep ? 'jamais' : 'libre'} aide="Tout de suite, sans validation (plus haut)." />
        <div style={{ paddingBottom: '6px' }}>
          <div className="hint-l">
            <Icone nom="shield-check" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{t('Un changement sensible demande un code SMS au téléphone personnel du propriétaire, jamais au numéro de versement.')}</span>
          </div>
          {!prep && (
            <div className="mt12">
              <Bouton classe="secondary" icone="pencil" onClick={demande.ouvrir}>
                {t('Demander une modification')}
              </Bouton>
            </div>
          )}
        </div>
      </div>
      {!prep && demandes.donnees && demandes.donnees.length > 0 && (
        <div className="card">
          <h3>{t('Mes demandes de modification')}</h3>
          {demandes.donnees.map((d) => (
            <details key={d.id} className="more" data-demande={d.id} open={d.statut === 'en_attente'}>
              <summary>
                <span className="grow">
                  <span className="b8 t14" style={{ display: 'block' }}>
                    {`${t(NOM_CHAMP[d.champ])} → ${d.valeur || '—'}`}
                  </span>
                  <span className="t12 c3">{tf('Envoyée le {d}', { d: dateCourte(d.creeeLe, langue) })}</span>
                </span>
                <span className={'pill sm ' + ETAT_DEMANDE[d.statut].pill}>{t(ETAT_DEMANDE[d.statut].texte)}</span>
              </summary>
              <div className="more-b">
                {d.avant && (
                  <div className="kv">
                    <span className="k">{t('Avant')}</span>
                    <span className="v ">{t(d.avant)}</span>
                  </div>
                )}
                <div className="kv">
                  <span className="k">{t('Motif')}</span>
                  <span className="v ">{d.motif}</span>
                </div>
                <div className="kv">
                  <span className="k">{t('Pièces')}</span>
                  <span className="v ">{d.pieces.length ? d.pieces.map((p) => p.nom).join(', ') : t('Aucune')}</span>
                </div>
                {d.statut === 'en_attente' && (
                  <div className="kv">
                    <span className="k">{t('Réponse avant')}</span>
                    <span className="v ">{`${dateCourte(d.reponseAvant, langue)} · ${heure(d.reponseAvant, langue)}`}</span>
                  </div>
                )}
                {d.motifRefus && <p style={{ color: 'var(--red)' }}>{d.motifRefus}</p>}
                <div className="kick" style={{ marginTop: '8px' }}>
                  {t('Historique')}
                </div>
                {d.historique.map((h, k) => (
                  <div key={k} className="kv">
                    <span className="k">{`${t(h.par === 'vous' ? 'Vous' : 'BelivaY')} · ${t(h.texte)}`}</span>
                    <span className="v ">{dateCourte(h.a, langue)}</span>
                  </div>
                ))}
                {d.statut === 'en_attente' && (
                  <div className="mt8">
                    <Bouton classe="ghost sm" icone="x" onClick={() => void source.boutique.annulerDemande(d.id).then((r) => r.ok && dire(t('Demande annulée.')))}>
                      {t('Annuler la demande')}
                    </Bouton>
                  </div>
                )}
              </div>
            </details>
          ))}
        </div>
      )}
      <p className="t12 c3" style={{ margin: '14px 4px 0' }}>{tf('Mis à jour à {h}', { h: heure(maintenant, langue) })}</p>
    </Ecran>
  )
}
