// Activation et partenariat (PR-03 § 4 ; gérant seul, DROITS_ROUTE). Ce que le gérant VOIT de son partenariat ; il
// ne décide rien (DP-66 appliquée au relais) : BelivaY ouvre le relais quand les 6 étapes sont validées (ACT-01).
// - Certificat « Partenaire fondateur · PR-FONDATEURS premiers relais » (ACT-02, PR03-R07) : nom, ouverture, numéro,
//   4 engagements lus au registre (exclusivité PR-EXCLU-RAYON-M · PR-EXCLU-MOIS, appliquée quand la zone ouvre un
//   second relais : ARL-21 ; zéro caution : ACT-03 ; matériel fourni ; versé le jour VD-VER-JOUR sans frais) ;
//   relais pas encore ouvert : la même carte dit combien d'étapes restent ;
// - les 6 étapes (dossier, numéro de versement vérifié, convention, visite + pratique, formation, capacité et
//   horaires) : date de validation ou ce qu'il reste à faire, l'étape restante ouvre son écran (STA-02) ;
// - la convention signée, à relire et à télécharger.
// Pas de barre du bas tant que le relais n'est pas actif (ARL-27).
// Structure du prototype (Activation) : certificat doré, carte « Les 6 étapes d'activation » (frise), carte convention.
import { Link } from 'react-router-dom'
import logo from '../../assets/logo-belivay.png'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { EtapeActivation, EtapeActivationVue } from '../../donnees/domaines/acces'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { Chargement, ErreurLecture } from './commun'
import { ACCES, RELAIS_P } from './parametres'
import { JOURS_SEMAINE } from './textes'
import './pr03.css'

/** Titre, explication et écran de chaque étape (l'étape restante l'ouvre). */
export const ETAPES: Record<EtapeActivation, { titre: string; texte: string; route: string | null; icone: string }> = {
  dossier: { titre: 'Dossier du gérant', texte: 'Pièce d’identité recto verso, selfie vidéo et photos du local', route: 'documents', icone: 'r-document' },
  numero_versement: { titre: 'Numéro de versement vérifié', texte: 'Confirmé par code SMS, reçoit les versements', route: 'documents', icone: 'r-carte-paiement' },
  convention: { titre: 'Convention signée', texte: 'Sans caution, sans dépôt, sans frais d’entrée', route: 'convention', icone: 'r-document' },
  visite: { titre: 'Visite de BelivaY', texte: 'Local, rangement et zone de remise contrôlés, séance de pratique au comptoir ({pratique} h)', route: null, icone: 'r-lieu' },
  formation: { titre: 'Formation suivie', texte: 'Les {n} modules obligatoires', route: 'formation', icone: 'r-formation' },
  capacite_horaires: { titre: 'Capacité et horaires déclarés', texte: 'Le relais passe « Ouvert » pour les clients', route: 'capacite', icone: 'r-horloge' },
}

/** Ce que dit l'état d'une étape : « Validée le 3 juin », « À faire », « En vérification »… */
export function useEtatEtape() {
  const { t, tf, langue } = usePreferences()
  return (e: EtapeActivationVue) =>
    e.etat === 'validee'
      ? e.le
        ? e.etape === 'visite'
          ? tf('Faite le {date}', { date: jourLong(e.le, langue) })
          : tf('Validée le {date}', { date: jourLong(e.le, langue) })
        : t('Validée')
      : e.etat === 'en_verification'
        ? e.etape === 'capacite_horaires'
          ? t('Déclarés : BelivaY vérifie')
          : t('En vérification')
        : e.etat === 'refusee'
          ? e.motif
            ? tf('À refaire : {motif}', { motif: e.motif })
            : t('À refaire')
          : e.progression
            ? tf('{x} modules sur {n}', { x: e.progression.faits, n: e.progression.total })
            : e.etape === 'visite'
              ? t('Prévue par BelivaY')
              : e.etape === 'capacite_horaires'
                ? t('À déclarer')
                : t('À faire')
}

export default function Activation() {
  const { t, tf, langue } = usePreferences()
  const lecture = useLecture(() => source.acces.activation(), [])
  const a = lecture.donnees
  const etatEtape = useEtatEtape()
  const actif = !a || (a.statut !== 'candidat' && a.statut !== 'en_configuration')
  const faites = a ? a.etapes.filter((e) => e.etat === 'validee').length : 0
  const v = { n: RELAIS_P.formationModules, pratique: ACCES.visitePratiqueHeures }
  return (
    <Ecran route="activation" barre={actif}>
      <div className="p-0hxmj8 r-pile pr3">
        {lecture.erreur ? (
          <ErreurLecture relire={lecture.relire} />
        ) : !a ? (
          <Chargement />
        ) : (
          <>
            <div className="p-o4e1px">
              <img src={logo} alt="BelivaY" className="p-j6jhv3" />
              <div className="p-ctvg7v">{a.fondateur ? tf('PARTENAIRE FONDATEUR · {n} PREMIERS RELAIS', { n: ACCES.fondateurs }) : actif ? t('POINT RELAIS PARTENAIRE') : tf('EN CONFIGURATION · {x} / {n}', { x: faites, n: a.etapes.length })}</div>
              <div className="p-31yzrb">{`${a.relais} · ${a.quartier}`}</div>
              <div className="p-5g7m7p">
                {a.ouvertLe
                  ? a.fondateur
                    ? tf('Point relais partenaire indépendant · ouvert le {date} · fondateur n° {numero}', { date: jourLong(a.ouvertLe, langue), numero: a.fondateur.numero })
                    : tf('Point relais partenaire indépendant · ouvert le {date}', { date: jourLong(a.ouvertLe, langue) })
                  : a.etapes.length - faites === 1
                    ? t('Encore 1 étape avant l’ouverture : BelivaY ouvre le relais quand les 6 sont validées.')
                    : tf('Encore {n} étapes avant l’ouverture : BelivaY ouvre le relais quand les 6 sont validées.', { n: a.etapes.length - faites })}
              </div>
              <div className="p-kxe5yr" />
              <div className="p-ci9b6x">
                <div className="p-r4zqjk">
                  <Icone nom="r-lieu" taille={18} className="p-672m16" />
                  <div>
                    <div className="p-cp89bh">{tf('Exclusivité {m} m', { m: ACCES.exclusiviteRayonM })}</div>
                    <div className="p-g7lwlw">{a.fondateur ? tf('jusqu’au {date}, si la zone ouvre un 2e relais', { date: jourLong(a.fondateur.exclusiviteJusqua, langue) }) : tf('pendant {mois} mois, pour les {n} premiers', { mois: ACCES.exclusiviteMois, n: ACCES.fondateurs })}</div>
                  </div>
                </div>
                <div className="p-r4zqjk">
                  <Icone nom="r-bouclier" taille={18} className="p-672m16" />
                  <div>
                    <div className="p-cp89bh">{t('Zéro caution')}</div>
                    <div className="p-g7lwlw">{t('rien à avancer')}</div>
                  </div>
                </div>
                <div className="p-r4zqjk">
                  <Icone nom="r-etiquette" taille={18} className="p-672m16" />
                  <div>
                    <div className="p-cp89bh">{t('Matériel fourni')}</div>
                    <div className="p-g7lwlw">{t('étiquettes et sacs')}</div>
                  </div>
                </div>
                <div className="p-r4zqjk">
                  <Icone nom="r-carte-paiement" taille={18} className="p-672m16" />
                  <div>
                    <div className="p-cp89bh">{tf('Payé le {jour}', { jour: t(JOURS_SEMAINE[RELAIS_P.versement.jourSemaine]) })}</div>
                    <div className="p-g7lwlw">{t('sans frais')}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-yi6rkz">
              <div className="p-unncbq">
                <h2 className="p-9j1bbu">{t('Les 6 étapes d’activation')}</h2>
                <span className={faites === a.etapes.length ? 'p-nax3x4' : 'p-yw05h9'}>{`${faites} / ${a.etapes.length}`}</span>
              </div>
              {a.etapes.map((e, i) => {
                const x = ETAPES[e.etape]
                const fait = e.etat === 'validee'
                const derniere = i === a.etapes.length - 1
                const contenu = (
                  <>
                    <div className="p-dfc4i3">{`${i + 1}. ${t(x.titre)}`}</div>
                    <div className="p-hmchcr">
                      {tf(x.texte, v)} · <b className={fait ? 'pr3-fait' : 'pr3-afaire'}>{etatEtape(e)}</b>
                    </div>
                  </>
                )
                return (
                  <div className="p-fkc6m2" key={e.etape}>
                    <div className="p-py0ju2">
                      <div className={'p-pneplq' + (fait ? '' : ' pr3-rond-afaire')}>{fait ? <Icone nom="check" taille={15} trait={2.8} className="p-gqbtfa" /> : <span className="pr3-num">{i + 1}</span>}</div>
                      {!derniere && <div className={a.etapes[i + 1].etat === 'validee' ? 'p-k92ss3' : 'p-kf3cbz'} />}
                    </div>
                    {!fait && x.route ? (
                      <Link to={chemin(x.route)} className={(derniere ? 'p-2z0wdo' : 'p-8fadah') + ' pr3-etape-lien'}>
                        {contenu}
                      </Link>
                    ) : (
                      <div className={derniere ? 'p-2z0wdo' : 'p-8fadah'}>{contenu}</div>
                    )}
                  </div>
                )
              })}
              {!actif && <div className="p-81u2s6">{t('Tant que le relais n’est pas ouvert, aucun colis ne vous est envoyé et les clients ne vous voient pas. BelivaY l’ouvre quand les 6 étapes sont validées.')}</div>}
            </div>
            <div className="p-yi6rkz">
              <Link to={chemin('convention')} className="p-o24hsm">
                <div className="p-toppw8">
                  <Icone nom="r-document" taille={20} className="p-672m16" />
                </div>
                <div className="p-rnqj8n">
                  <div className="p-ife3a2">{t('Convention de partenariat')}</div>
                  <div className="p-dfa05r">{a.convention.signeeLe ? tf('Version {v} · signée le {date}', { v: a.convention.version, date: jourLong(a.convention.signeeLe, langue) }) : tf('Version {v} · à signer', { v: a.convention.version })}</div>
                </div>
                <Icone nom="r-telecharger" taille={20} className="p-672m16" />
              </Link>
              <Link to={chemin('statut-relais')} className="p-o24hsm">
                <div className="p-toppw8">
                  <Icone nom="r-boutique" taille={20} className="p-672m16" />
                </div>
                <div className="p-rnqj8n">
                  <div className="p-ife3a2">{t('Statut du relais')}</div>
                  <div className="p-dfa05r">{t('Décisions de BelivaY, contestation, fin du partenariat')}</div>
                </div>
                <Icone nom="r-chevron-droite" taille={18} className="p-2bmvtm" />
              </Link>
            </div>
          </>
        )}
      </div>
    </Ecran>
  )
}
