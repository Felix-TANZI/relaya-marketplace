// Documents (PR-10 Fig. 5 ; DOC-01 à DOC-05, EXT-18, HIS-02, PR-CT01-R05 ; ARL-13, ARL-18, ARL-34, ARL-35, ARL-124).
// Gérant seul (la route l'exige : config/droits.ts). Structure du prototype : bandeau « Dossier complet » (vert) ou
// ambre (pièce à fournir, demandée, refusée, expirée ou bientôt expirée), une tuile par pièce (statut, contenu,
// action), pied de page (alerte PR-DOC-EXPIRE-J jours avant, pièces jamais montrées, preuves PR-PREUVES-CONSERV-J jours).
// Ajouts : « Convention et annexes » (convention signée, annexes 1 et 2, fiche d'ouverture : ?doc=…, Contrat.tsx), lien
// vers « Mes données » (Paramètres).
// Exécutant de terrain (DP-66/67 appliquées au relais ; ARL-124) : une pièce vérifiée se VOIT (DOC-04) ; elle se
// renvoie seulement quand BelivaY la demande, qu'elle est refusée, expirée ou expire dans PR-DOC-EXPIRE-J jours ; le NIU
// (facultatif) s'ajoute s'il existe ; le numéro de versement se change par son parcours (PR-09) ; la visite est faite
// par BelivaY. Les clients voient le prénom et l'initiale du gérant et la façade, jamais ses pièces (ARL-13, ARL-35).
import { useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Contrat } from './Contrat'
import { Feuille } from '@client/composants/Feuille'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { DocumentRelais, FicheRelais, TypeDocument } from '../../donnees/domaines/relais'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { Annonce, Chargement, ErreurLecture, useGesteRelais } from './commun'

const JOUR_MS = 24 * 3600_000
const TUILES: Record<TypeDocument, { titre: string; icone: string; vu: string }> = {
  identite: { titre: 'Pièce d’identité', icone: 'r-personne', vu: 'Jamais montrée aux clients ni aux vendeurs : vérifiée par BelivaY seulement.' },
  activite: { titre: 'Preuve d’activité', icone: 'r-boutique', vu: 'Jamais montrée aux clients ni aux vendeurs.' },
  numero_versement: { titre: 'Numéro de versement', icone: 'r-telephone', vu: 'Votre numéro n’est jamais montré : les clients appellent par un appel masqué.' },
  photos_relais: { titre: 'Photos du relais', icone: 'r-appareil-photo', vu: 'La façade est montrée aux clients pour trouver le relais ; le comptoir et le rangement restent chez BelivaY.' },
  visite: { titre: 'Visite BelivaY', icone: 'r-lieu', vu: 'Contrôle du local, des places et du rangement, avec la séance pratique au comptoir.' },
  niu: { titre: 'NIU / patente', icone: 'r-document', vu: 'Facultatif : conseillé pour vos obligations fiscales ; jamais montré.' },
}
const DETAILS: Record<TypeDocument, string> = {
  identite: 'CNI recto verso + selfie vidéo',
  activite: 'Attestation de commerce',
  numero_versement: '',
  photos_relais: 'La façade (vue par les clients), le comptoir et le rangement',
  visite: 'Contrôle sur place et séance pratique',
  niu: 'À ajouter si vous en avez un',
}

export default function Documents() {
  const [params] = useSearchParams()
  if (params.get('doc')) return <Contrat />
  return <Liste />
}

function Liste() {
  const lecture = useLecture(() => source.relais.relais(), [])
  const g = useGesteRelais()
  const f = lecture.donnees
  if (!f) return <Ecran route="documents">{lecture.erreur ? <ErreurLecture relire={lecture.relire} /> : <Chargement />}</Ecran>
  return <Contenu f={f} g={g} />
}

function Contenu({ f, g }: { f: FicheRelais; g: ReturnType<typeof useGesteRelais> }) {
  const { t, tf, langue } = usePreferences()
  const [voir, setVoir] = useState<DocumentRelais | null>(null)
  const fichier = useRef<HTMLInputElement>(null)
  const [cible, setCible] = useState<TypeDocument | null>(null)
  const alerte = f.regles.documentAlerteJours
  const bientot = (d: DocumentRelais) => d.statut === 'valide' && d.expireLe !== null && d.expireLe - g.maintenant <= alerte * JOUR_MS
  const renvoyable = (d: DocumentRelais) => d.type !== 'numero_versement' && d.type !== 'visite' && (!!d.demande || bientot(d) || ['refuse', 'expire', 'a_fournir'].includes(d.statut))
  const aFaire = f.documents.filter((d) => !d.facultatif && (d.statut !== 'valide' || d.demande || bientot(d)))
  const complet = aFaire.length === 0
  const verifieLe = f.documents.reduce<number | null>((n, d) => (d.verifieLe && (n === null || d.verifieLe > n) ? d.verifieLe : n), null)

  const statut = (d: DocumentRelais): [string, string] =>
    d.demande
      ? ['r-pill r-ton-alerte', 'Demandée']
      : d.statut === 'valide'
        ? bientot(d)
          ? ['r-pill r-ton-ambre', 'Expire bientôt']
          : ['p-nax3x4', d.type === 'photos_relais' ? 'Vérifiées' : d.type === 'visite' ? 'Validée' : 'Vérifiée']
        : d.statut === 'en_verification'
          ? ['r-pill r-ton-ambre', 'En vérification']
          : d.statut === 'refuse'
            ? ['r-pill r-ton-rouge', 'Refusée']
            : d.statut === 'expire'
              ? ['r-pill r-ton-rouge', 'Expirée']
              : d.facultatif
                ? ['p-6z26dm', 'Facultatif']
                : ['r-pill r-ton-alerte', 'À fournir']
  const detail = (d: DocumentRelais) => {
    const base = d.type === 'numero_versement' ? d.detail : d.type === 'visite' && d.verifieLe ? tf('Contrôle sur place du {date}', { date: jourLong(d.verifieLe, langue) }) : t(DETAILS[d.type])
    return d.expireLe ? tf('{detail} · expire le {date}', { detail: base, date: jourLong(d.expireLe, langue) }) : base
  }
  const envoyer = (type: TypeDocument) => {
    setCible(type)
    fichier.current?.click()
  }
  const recu = (e: React.ChangeEvent<HTMLInputElement>) => {
    const x = e.target.files?.[0]
    e.target.value = ''
    if (!x || !cible) return
    const type = cible
    void g.faire('photo', 'document-' + type, (s, o) => s.relais.envoyerDocument(type, 'doc-' + type + '-' + o.cle, o), { ok: 'Pièce envoyée : BelivaY la vérifie, réponse sous 48 h ouvrées.', file: 'Hors connexion : la pièce partira au retour du réseau.' })
  }

  return (
    <Ecran
      route="documents"
      fixes={
        <Feuille ouverte={!!voir} fermer={() => setVoir(null)} titre={voir ? t(TUILES[voir.type].titre) : ''} classe="p10-feuille">
          {voir && (
            <>
              <h2>{t(TUILES[voir.type].titre)}</h2>
              <div className="p10-col">
                <div className="p-mqmvkk">
                  <span className="p-ytl255">{t('Statut')}</span>
                  <span className="p-2vq92h">{t(statut(voir)[1])}</span>
                </div>
                <div className="p-mqmvkk">
                  <span className="p-ytl255">{t('Contenu')}</span>
                  <span className="p-2vq92h">{voir.type === 'numero_versement' ? voir.detail : t(DETAILS[voir.type])}</span>
                </div>
                {voir.verifieLe && (
                  <div className="p-mqmvkk">
                    <span className="p-ytl255">{t('Vérifiée le')}</span>
                    <span className="p-2vq92h">{jourLong(voir.verifieLe, langue)}</span>
                  </div>
                )}
                {voir.expireLe && (
                  <div className="p-mqmvkk">
                    <span className="p-ytl255">{t('Expire le')}</span>
                    <span className="p-2vq92h">{jourLong(voir.expireLe, langue)}</span>
                  </div>
                )}
                {voir.demande && (
                  <div className="p-fht1zk" role="note">
                    <Icone nom="r-alerte" taille={18} />
                    <div>
                      <b>{tf('Demandée par BelivaY le {date}', { date: jourLong(voir.demande.le, langue) })}</b> · {voir.demande.motif}
                    </div>
                  </div>
                )}
                {voir.motifRefus && (
                  <div className="p-fht1zk" role="note">
                    <Icone nom="r-alerte" taille={18} />
                    <div>{voir.motifRefus}</div>
                  </div>
                )}
                <p className="p-81u2s6 p10-txt">{t(TUILES[voir.type].vu)}</p>
                {renvoyable(voir) && (
                  <button type="button" className="p-ncx7qc" onClick={() => (envoyer(voir.type), setVoir(null))}>
                    <Icone nom="r-appareil-photo" taille={18} />
                    {t(voir.statut === 'a_fournir' ? 'Ajouter la pièce' : 'Renvoyer la pièce')}
                  </button>
                )}
                <button type="button" className="p-rbzobc" onClick={() => setVoir(null)}>
                  {t('Fermer')}
                </button>
              </div>
            </>
          )}
        </Feuille>
      }
    >
      <input ref={fichier} type="file" accept="image/*,application/pdf" capture="environment" hidden onChange={recu} />
      <div className="p-0hxmj8 r-pile">
        <div className={'p-aygyk8' + (complet ? '' : ' p10-ambre')} role="status">
          <div className="p-rou2l0">
            <Icone nom={complet ? 'r-bouclier' : 'r-alerte'} taille={24} className="p-7dsggt" />
          </div>
          <div>
            <div className="p-mhwr8x">{complet ? t('Dossier complet') : aFaire.length > 1 ? tf('{n} pièces à reprendre', { n: aFaire.length }) : t('1 pièce à reprendre')}</div>
            <div className="p-zxu25x">{complet ? (verifieLe ? tf('Vérifié le {date} · vous pouvez recevoir et être payé', { date: jourLong(verifieLe, langue) }) : t('Vous pouvez recevoir et être payé')) : t('Touchez la pièce concernée : BelivaY vous dit quoi envoyer.')}</div>
          </div>
        </div>
        <div className="p-0cipe3">
          {f.documents.map((d) => {
            const [classe, mot] = statut(d)
            const tuile = TUILES[d.type]
            const action = d.type === 'numero_versement' ? 'changer' : renvoyable(d) ? (d.statut === 'a_fournir' ? 'ajouter' : 'renvoyer') : d.type === 'visite' ? null : 'voir'
            return (
              <div key={d.type} className="p-5x70tq">
                <div className="p-yq5y59">
                  <div className={d.type === 'identite' ? 'p-0pfxfk' : 'p-liel66'}>
                    <Icone nom={tuile.icone} taille={20} className={d.type === 'identite' ? 'p-gqd75s' : 'p-672m16'} />
                  </div>
                  <span className={classe}>{t(mot)}</span>
                </div>
                <div className="p-4mbhbo">{t(tuile.titre)}</div>
                <div className="p-iiqgjs">{detail(d)}</div>
                {action === 'changer' && (
                  <Link to={chemin('changer-momo')} className="p-wn9elb p10-cible">
                    {t('Changer')}
                  </Link>
                )}
                {action === 'voir' && (
                  <button type="button" className="p-wn9elb p10-cible" onClick={() => setVoir(d)} aria-label={tf('Voir : {piece}', { piece: t(tuile.titre) })}>
                    {t('Voir')}
                  </button>
                )}
                {(action === 'renvoyer' || action === 'ajouter') && (
                  <button type="button" className="p-wn9elb p10-cible" onClick={() => setVoir(d)} aria-label={tf(action === 'ajouter' ? 'Ajouter : {piece}' : 'Renvoyer : {piece}', { piece: t(tuile.titre) })}>
                    {t(action === 'ajouter' ? 'Ajouter' : 'Renvoyer')}
                  </button>
                )}
              </div>
            )
          })}
        </div>
        <Annonce message={g.message} />
        <nav className="p-yi6rkz" aria-labelledby="p10-convention">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu" id="p10-convention">
              {t('Convention et annexes')}
            </h2>
          </div>
          {(
            [
              ['convention', 'r-document', 'Convention de partenariat', 'Signée dans l’application'],
              ['annexe1', 'r-carte-paiement', 'Annexe 1 · Rémunération et grille de garde', 'Ce que vous gagnez, ce que paie le client'],
              ['annexe2', 'r-bouclier', 'Annexe 2 · Interdits et charte de preuve', 'Ce qui n’est jamais permis'],
              ['annexe3', 'r-boutique', 'Annexe 3 · Fiche d’ouverture du relais', 'Déclarée et vérifiée à la visite'],
            ] as const
          ).map(([doc, icone, titre, sous], i) => (
            <div key={doc}>
              {i > 0 && <div className="p-92xvtp" />}
              <Link to={chemin('documents', { doc })} className="p-o24hsm">
                <div className="p-toppw8">
                  <Icone nom={icone} taille={20} className="p-672m16" />
                </div>
                <div className="p-rnqj8n">
                  <div className="p-ife3a2">{t(titre)}</div>
                  <div className="p-dfa05r">{t(sous)}</div>
                </div>
                <Icone nom="r-chevron-droite" taille={18} className="p-2bmvtm" />
              </Link>
            </div>
          ))}
        </nav>
        <div className="p-16950n">
          {tf('Une pièce qui expire vous est signalée {j} jours avant. Vos pièces ne sont jamais montrées : les clients voient seulement votre prénom, l’initiale de votre nom et la façade. Preuves gardées {p} jours.', { j: alerte, p: f.regles.preuvesJours })}{' '}
          <Link to={chemin('parametres', { sheet: 'donnees' })} className="p-4u28q4">
            {t('Demander mes données')}
          </Link>
        </div>
      </div>
    </Ecran>
  )
}
