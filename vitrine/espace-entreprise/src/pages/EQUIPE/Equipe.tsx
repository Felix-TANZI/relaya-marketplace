// Équipe · registre du personnel (l'entreprise employeur de ses livreurs, DP-66, DP-67). Page secondaire « normale » :
// titre, puces de filtre avec leur nombre (En essai, Mesures, Fin de contrat, Congés, Anciens), recherche, puis le
// registre ; chaque nom ouvre l'onglet « Emploi » de sa fiche, où se prennent les décisions (sections repliables).
// Les anciens livreurs restent au registre pour leur attestation de travail. Droits : tous les rôles lisent le registre ;
// le nombre d'avertissements n'est montré qu'au propriétaire et au gérant ; l'attestation aussi au comptable.
import './equipe.css'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { AucunResultat, Choix, Pill, Recherche, Table, type Colonne } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import type { LigneEquipe } from '../../donnees/domaines/equipe'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { usePeut } from '../../session'
import { Chargement, ErreurLecture, useDates } from '../ENT-03/outils'
import { NOM_STATUT } from '../ENT-04/Flotte'
import { FixeParBelivay, useAttestation } from './Emploi'

type Filtre = 'tous' | 'essai' | 'mesures' | 'fin' | 'conges' | 'anciens'
const FILTRES: { id: Filtre; t: string; garde: (l: LigneEquipe) => boolean }[] = [
  { id: 'tous', t: 'En poste', garde: (l) => l.livreur.statut !== 'retire' },
  { id: 'essai', t: 'En essai', garde: (l) => l.livreur.statut !== 'retire' && !!l.essai },
  { id: 'mesures', t: 'Mesures', garde: (l) => l.livreur.statut !== 'retire' && (!!l.suspension || l.avertissements > 0) },
  { id: 'fin', t: 'Fin de contrat', garde: (l) => l.livreur.statut !== 'retire' && (l.finContrat !== null || l.departDemande) },
  { id: 'conges', t: 'Congés', garde: (l) => l.livreur.statut !== 'retire' && l.conges > 0 },
  { id: 'anciens', t: 'Anciens', garde: (l) => l.livreur.statut === 'retire' },
]

export default function Equipe() {
  const { t, tf } = usePreferences()
  const { date } = useDates()
  const [params, setParams] = useSearchParams()
  const decide = usePeut(['proprietaire', 'gerant'])
  const atteste = usePeut(['proprietaire', 'gerant', 'comptable'])
  const attestation = useAttestation()
  const lecture = useLecture(() => source.equipe.registre(), [])
  const filtre = (FILTRES.find((f) => f.id === params.get('f'))?.id ?? 'tous') as Filtre
  const q = params.get('q') ?? ''
  const poser = (k: string, v: string, defaut: string) => {
    const p = new URLSearchParams(params)
    if (v === defaut) p.delete(k)
    else p.set(k, v)
    setParams(p, { replace: true })
  }
  const toutes = lecture.donnees ?? []
  const garde = FILTRES.find((f) => f.id === filtre)!.garde
  const lignes = toutes.filter(garde).filter((l) => !q.trim() || l.livreur.nom.toLowerCase().includes(q.trim().toLowerCase()))
  const enPoste = toutes.filter(FILTRES[0].garde)
  const colonnes: Colonne<LigneEquipe>[] = [
    {
      k: 'nom',
      t: t('Livreur'),
      main: true,
      rendu: (l) =>
        l.livreur.statut === 'retire' ? (
          <b>{l.livreur.nom}</b>
        ) : (
          <Link to={chemin('livreur', { id: l.livreur.id, t: 'emploi' })}>
            <b>{l.livreur.nom}</b>
          </Link>
        ),
    },
    { k: 'contrat', t: t('Contrat'), rendu: (l) => `${l.contrat === 'cdd' ? t('CDD') : t('CDI')}${l.debut ? ' · ' + tf('depuis le {d}', { d: date(l.debut, true) }) : ''}` },
    {
      k: 'etat',
      t: t('Situation'),
      rendu: (l) => (
        <span className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {l.suspension ? (
            <Pill sm ton="red" dot>
              {l.suspension.par === 'belivay' ? t('Suspendu par BelivaY') : l.suspension.jusqua ? tf('Suspendu jusqu’au {d}', { d: date(l.suspension.jusqua) }) : t('Suspendu')}
            </Pill>
          ) : (
            <Pill sm ton={l.livreur.statut === 'retire' ? 'ink' : 'green'} dot>
              {t(NOM_STATUT[l.livreur.statut])}
            </Pill>
          )}
          {l.essai && (
            <Pill sm ton="amber">
              {tf('Essai jusqu’au {d}', { d: date(l.essai.jusqua) })}
            </Pill>
          )}
          {l.finContrat !== null && (
            <Pill sm ton="amber" icone="log-out">
              {tf('Préavis jusqu’au {d}', { d: date(l.finContrat) })}
            </Pill>
          )}
          {l.departDemande && (
            <Pill sm ton="amber" icone="log-out">
              {t('Départ demandé')}
            </Pill>
          )}
          {l.conges > 0 && <Pill sm>{tf('{n} congé(s)', { n: l.conges })}</Pill>}
        </span>
      ),
    },
    ...(decide ? [{ k: 'avert', t: t('Avertissements'), hideM: true, rendu: (l: LigneEquipe) => (l.avertissements ? String(l.avertissements) : '—') }] : []),
    { k: 'pieces', t: t('Dossier'), hideM: true, rendu: (l) => (l.livreur.statut === 'retire' ? '—' : l.piecesManquantes ? <Pill sm ton="amber">{tf('{n} pièce(s) à fournir', { n: l.piecesManquantes })}</Pill> : t('complet')) },
    ...(atteste
      ? [
          {
            k: 'att',
            t: t('Attestation'),
            rendu: (l: LigneEquipe) =>
              l.debut ? (
                <button type="button" className="btn sm ghost" onClick={() => void attestation.telecharger(l.livreur.id)} aria-label={tf('Attestation de travail de {nom}', { nom: l.livreur.nom })}>
                  <Icone nom="file-down" taille={16} />
                  <span>PDF</span>
                </button>
              ) : (
                '—'
              ),
          },
        ]
      : []),
  ]
  return (
    <Ecran route="equipe">
      {lecture.erreur && <ErreurLecture erreur={lecture.erreur} relire={lecture.relire} />}
      {!lecture.donnees && !lecture.erreur && <Chargement lignes={4} />}
      {lecture.donnees && (
        <>
          <p className="eq-res" aria-label={t('Résumé de l’équipe')}>
            <span>
              <b>{enPoste.length}</b> {t('en poste')}
            </span>
            <span>
              <b>{enPoste.filter((l) => l.essai).length}</b> {t('en essai')}
            </span>
            <span>
              <b>{enPoste.filter((l) => l.suspension).length}</b> {t('suspendu(s)')}
            </span>
            <span>
              <b>{enPoste.filter((l) => l.finContrat !== null || l.departDemande).length}</b> {t('en préavis')}
            </span>
          </p>
          <Choix forme="chips" aria={t('Filtrer le registre')} actif={filtre} choisir={(f) => poser('f', f, 'tous')} items={FILTRES.map((f) => ({ id: f.id, t: t(f.t), n: toutes.filter(f.garde).length }))} />
          <div className="mt10">
            <Recherche q={q} setQ={(v) => poser('q', v, '')} placeholder={t('Chercher un livreur')} aria={t('Chercher un livreur par nom')} />
          </div>
          {attestation.refus && (
            <p className="err mt8" role="alert">
              {attestation.refus}
            </p>
          )}
          <div className="mt10">
            {lignes.length === 0 ? <AucunResultat effacer={() => setParams(new URLSearchParams(), { replace: true })} texte={t('Aucun livreur dans ce filtre.')} /> : <Table legende={t('Registre du personnel')} cols={colonnes} rows={lignes} cle={(l) => l.livreur.id} />}
          </div>
          <FixeParBelivay />
        </>
      )}
    </Ecran>
  )
}
