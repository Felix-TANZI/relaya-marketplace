// Arrivée depuis l'espace client (VD-03 ; DP-56 Q-41 V5) : « Devenir vendeur » dans l'app client ouvre ici, avec la
// même session (même domaine, même jeton ; en démonstration, le compte client gardé sur ce téléphone). Le nom de la
// boutique, la catégorie, particulier ou entreprise et le numéro déjà vérifié sont repris et verrouillés : seul le
// point de la boutique est à poser (il sert au livreur et au calcul de la livraison). « Confirmer » crée la boutique
// (étape 1 faite), propose Face ID ou l'empreinte, puis les pièces (route kyc).
// Sans demande de boutique dans le compte client : on le dit, avec les deux chemins (l'app client, ou ouvrir ici).
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { Ecran } from '../../composants/coque'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { PointBoutique } from '../../donnees/domaines/session'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { BoutonPlein, CartePoint, Chargement, ErreurLecture, Etapes, HorsLigne, useEnLigne, useZone } from './commun'

// L'espace client vit à la racine du même domaine (DP-38) : « Devenir vendeur » y est la route devenir-vendeur.
const CLIENT_DEVENIR_VENDEUR = '/devenir-vendeur'

function Verrou({ verifie }: { verifie?: boolean }) {
  const { t } = usePreferences()
  return (
    <span className="suf">
      <span className="vx-lock" style={verifie ? { color: 'var(--green)' } : undefined}>
        <Icone nom={verifie ? 'circle-check' : 'lock'} taille={13} />
        {t(verifie ? 'vérifié' : 'repris')}
      </span>
    </span>
  )
}

export default function BienvenueClient() {
  const { t, tf } = usePreferences()
  const naviguer = useNavigate()
  const s = useSession()
  const enLigne = useEnLigne()
  const lecture = useLecture(async () => ({ a: await source.session.arriveeClient(), d: await source.session.ouverture() }), [])
  const [point, setPoint] = useState<PointBoutique | null>(null)
  const [vu, setVu] = useState(false)
  const [refus, setRefus] = useState<'point' | 'hors_zone' | null>(null)
  const [enCours, setEnCours] = useState(false)
  const zone = useZone(point)
  const a = lecture.donnees?.a ?? null
  const d = lecture.donnees?.d ?? null
  const confirmer = async () => {
    setVu(true)
    if (!point || !enLigne || enCours) return jouer('erreur')
    setEnCours(true)
    const r = await source.session.confirmerArriveeClient(point)
    setEnCours(false)
    if (!r.ok) return (jouer('erreur'), setRefus(r.raison))
    naviguer(chemin('faceid', { nouveau: 1, next: chemin('kyc') }), { replace: true })
  }
  const dejaConfirmee = d?.depuisClient && a && d.ref === a.ref && d.etape !== 'ouvrir'
  return (
    <Ecran route="bienvenue_client" retour={s.connecte ? chemin('accueil') : chemin('connexion')}>
      <Etapes cur={dejaConfirmee ? 2 : 1} />
      {lecture.erreur ? (
        <ErreurLecture relire={lecture.relire} />
      ) : !lecture.donnees ? (
        <Chargement />
      ) : !a ? (
        <>
          <div className="empty" style={{ marginTop: '18px' }}>
            <div className="ei">
              <Icone nom="store" taille={26} />
            </div>
            <h3>{t('Aucune boutique demandée depuis votre compte client')}</h3>
            <p>{t('Ouvrez-la ici en deux minutes, ou depuis « Devenir vendeur » dans l’app BelivaY : rien à ressaisir.')}</p>
          </div>
          <div className="mt16">
            <Link to={chemin('ouvrir')} className="btn primary">
              <Icone nom="store" taille={18} />
              <span>{t('Ouvrir ma boutique')}</span>
            </Link>
          </div>
          <div className="mt8">
            <a href={CLIENT_DEVENIR_VENDEUR} className="btn secondary">
              <Icone nom="user" taille={18} />
              <span>{t('Ouvrir l’app client')}</span>
            </a>
          </div>
        </>
      ) : (
        <>
          <div className="vx-from">
            <Icone nom="badge-check" taille={22} />
            <span>{tf('Votre demande {ref} arrive de votre compte client BelivaY. Rien à ressaisir.', { ref: a.ref })}</span>
          </div>
          <h1 className="pg-t" style={{ marginTop: '16px' }}>
            {tf('Bienvenue, {p}', { p: a.prenom })}
          </h1>
          <p className="pg-s">{t(dejaConfirmee ? 'Votre boutique est créée : continuez avec vos pièces.' : 'Vérifiez, posez le point de votre boutique, et c’est ouvert.')}</p>
          {dejaConfirmee && (
            <Link to={chemin('kyc')} className="note or" style={{ textDecoration: 'none' }}>
              <Icone nom="id-card" taille={18} />
              <div>
                <b>{t('Reprendre : pièces et numéro de versement')}</b>
              </div>
            </Link>
          )}
          <div className="fld">
            <label>{t('Nom de la boutique')}</label>
            <div className="inp ok">
              <span className="grow">{a.boutique.nom}</span>
              <Verrou />
            </div>
            <div className="hint">{t('Jamais montré aux clients. Ils voient seulement votre palier et votre Trust Score.')}</div>
          </div>
          <div className="fld">
            <label>{t('Catégorie')}</label>
            <div className="inp ok">
              <span className="grow">{t(a.boutique.categorie)}</span>
              <Verrou />
            </div>
          </div>
          <div className="fld">
            <label>{t('Vous vendez en tant que')}</label>
            <div className="inp ok">
              <span className="grow">{t(a.boutique.statut === 'entreprise' ? 'Entreprise' : 'Particulier')}</span>
              <Verrou />
            </div>
          </div>
          <div className="fld">
            <label>{t('Votre numéro')}</label>
            <div className="inp ok">
              <span className="b8 c2 row" style={{ gap: '6px', paddingRight: '8px', borderRight: '1px solid var(--line-2)' }}>
                <Dessin id="81b1dee44510" />
                {t('+237')}
              </span>
              <span className="grow">{a.telephone}</span>
              <Verrou verifie />
            </div>
          </div>
          {!dejaConfirmee && (
            <>
              <div className="fld">
                <label>
                  {t('Le point de votre boutique ')}
                  <span className="req">{t('*')}</span>
                </label>
                <CartePoint
                  point={point}
                  zone={zone}
                  changer={(p) => (setPoint(p), setRefus(null))}
                  dessin="56ffc96b4fa9"
                  hauteur={120}
                  erreur={(vu && !point) || refus === 'point' ? 'Posez le point de votre boutique sur la carte.' : refus === 'hors_zone' ? 'Ce point est hors des zones servies par BelivaY pour l’instant : placez-le à votre boutique, à Yaoundé.' : null}
                />
                <div className="hint">{t('Le seul élément à ajouter : il sert au livreur et au calcul de la livraison.')}</div>
              </div>
              {!enLigne && <HorsLigne texte="Votre boutique se crée dès le retour du réseau." />}
              <div className="mt16">
                <BoutonPlein icone="store" actif={enLigne && !enCours} raison={t('Pas de connexion.')} onClick={() => void confirmer()}>
                  {t(enCours ? 'Ouverture…' : 'Confirmer et ouvrir mon espace')}
                </BoutonPlein>
              </div>
            </>
          )}
          <p className="scrim-note">{t('Vous ajoutez vos produits tout de suite. Ils passent en ligne quand votre pièce est vérifiée.')}</p>
          <div className="vx-links">
            <a href={CLIENT_DEVENIR_VENDEUR}>
              <Icone nom="pencil" taille={18} />
              <span className="g">{t('Corriger ces informations dans l’app client')}</span>
              <Icone nom="chevron-right" taille={16} />
            </a>
            <Link to={chemin('ouvrir')}>
              <Icone nom="store" taille={18} />
              <span className="g">{t('Ouvrir une autre boutique')}</span>
              <Icone nom="chevron-right" taille={16} />
            </Link>
          </div>
        </>
      )}
    </Ecran>
  )
}
