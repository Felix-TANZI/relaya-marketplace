// Paramètres (PR-10 Fig. 7 ; PAR-01 à PAR-08, CNX-06, DS-08, DS-10, GEN-10, NOT-06, PR-RC-20, PR-RC-28, PR-RC-29,
// DOC-05, HIS-02, INS-07, STA-06 ; DP-13, DP-66/67 appliquées au relais ; ARL-12, ARL-26, ARL-121, ARL-126 à 128).
// Ouvert à chaque membre (« Mon compte ») ; ce qui gère le relais n'apparaît qu'au gérant (MEN-01).
// Structure du prototype : couverture et profil (badges « Relais vérifié », « Partenaire fondateur »), « Mon relais »
// (nom affiché, quartier, repère, ville, partenaire depuis ; « Modifier » = DEMANDE validée par BelivaY, PAR-03),
// « Sécurité » (PIN de remise et double vérification toujours actifs ; mon code PIN ; appareils connectés ; mon
// équipe), « Affichage et application » (thème sombre, taille du texte sur 8 crans, langue FR / EN, sons et
// vibrations, notifications, hors connexion, installer, horaires déclarés, numéro de versement, mes données, fin de la
// convention, version), « Se déconnecter ».
// Exécutant de terrain : les horaires se VOIENT ici et se DEMANDENT dans Capacité et horaires (ARL-121) ; les données
// se DEMANDENT (loi n° 2024/017) ; la fin de la convention se DEMANDE avec préavis, BelivaY la prononce (ARL-26) ; le
// numéro de versement se change par son parcours (PR-09).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ApercuSons } from '@client/composants/ApercuSons'
import { Feuille, useFeuille } from '@client/composants/Feuille'
import marque from '../../assets/marque-belivay.png'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { TailleDuTexte } from '../../composants/TailleDuTexte'
import { peutOuvrir } from '../../config/droits'
import { chemin } from '../../config/pages'
import { useCompteDemo } from '@client/compte/etat'
import { cleCompteGerant } from '../../demo/session'
import type { FicheRelais } from '../../donnees/domaines/relais'
import { enAttente, useFile } from '../../donnees/fileHorsLigne'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { creneau, heure, jourLong } from '../../i18n/temps'

const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { Annonce, Chargement, ErreurLecture, Interrupteur, useGesteRelais } from './commun'
import { FeuilleDeconnexion, useDeconnexion } from './deconnexion'
import { Avatar, FeuillePhoto } from './PhotoProfil'

const MOIS = { fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'], en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] }
const MOTIFS_FIN = ['Je ferme ou je vends mon commerce', 'Je déménage', 'Trop peu de colis', 'Je n’ai plus le temps', 'Autre raison']
const JOURS = ['Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.', 'Dim.']

export default function Parametres() {
  const lecture = useLecture(() => source.relais.relais(), [])
  const g = useGesteRelais()
  const f = lecture.donnees
  if (!f) return <Ecran route="parametres">{lecture.erreur ? <ErreurLecture relire={lecture.relire} /> : <Chargement />}</Ecran>
  return <Contenu f={f} g={g} />
}

function Contenu({ f, g }: { f: FicheRelais; g: ReturnType<typeof useGesteRelais> }) {
  const p = usePreferences()
  const { t, tf, langue } = p
  const s = useSession()
  const m = s.membre!
  const gerant = m.role === 'proprietaire'
  // Couverture du point relais, choisie par le gérant dans Mon compte (kit « compte ») : sans elle, l'en-tête du prototype.
  const couverture = useCompteDemo(cleCompteGerant()).couverture ?? null
  const voitArgent = peutOuvrir(m, 'changer-momo')
  const argent = useLecture(() => (voitArgent ? source.argent.argent() : Promise.resolve(null)), [voitArgent])
  const file = useFile()
  const attente = enAttente(file).length
  const deconnexion = useDeconnexion()
  const fFiche = useFeuille('fiche')
  const fPin = useFeuille('pin')
  const fDonnees = useFeuille('donnees')
  const fFin = useFeuille('fin')
  const fPhoto = useFeuille('photo')
  const reglages = useLecture(() => source.notifications.centre().then((c) => c.reglages), [])
  const [permis, setPermis] = useState<NotificationPermission | 'absente'>(() => (typeof Notification === 'undefined' ? 'absente' : Notification.permission))
  const employes = f.equipe.filter((x) => x.role === 'employe').length
  const autres = f.appareils.filter((a) => !a.ceAppareil).length
  const depuis = new Date(f.ouvertLe + 3600_000)
  const langueChoisie = (l: 'fr' | 'en') => {
    p.setLangue(l)
    void g.faire('reglage', 'langue', (src, o) => src.relais.reglerParametres({ langue: l }, o), { ok: 'Langue enregistrée sur votre compte.' })
  }
  const ouverts = f.horaires.semaine.filter((x) => !x.ferme)
  const resumeHoraires = ouverts.length ? `${t(JOURS[ouverts[0].jour])}–${t(JOURS[ouverts[ouverts.length - 1].jour])} · ${creneau([ouverts[0].ouverture!, ouverts[0].fermeture!], langue)}` : t('Fermé')
  // Heure du résumé du matin : réglage des notifications du membre (ARL-100, seule source), par demi-heure, de
  // PR-NTF-RESUME-H jusqu'à l'ouverture la plus tôt de la semaine.
  const r = reglages.donnees
  const heuresResume: string[] = []
  if (r) for (let mn = minutes(r.heureResumeMin); mn <= minutes(r.heureResumeMax); mn += 30) heuresResume.push(`${String(Math.floor(mn / 60)).padStart(2, '0')}:${String(mn % 60).padStart(2, '0')}`)

  return (
    <Ecran
      route="parametres"
      fixes={
        <>
          <FeuilleDeconnexion />
          {fFiche.ouverte && gerant && <FeuilleFiche f={f} fermer={fFiche.fermer} g={g} />}
          {fPin.ouverte && <FeuillePin f={f} fermer={fPin.fermer} g={g} />}
          {fPhoto.ouverte && <FeuillePhoto m={m} fermer={fPhoto.fermer} g={g} />}
          <Feuille ouverte={fDonnees.ouverte} fermer={fDonnees.fermer} titre={t('Mes données')} classe="p10-feuille">
            <h2>{t('Mes données')}</h2>
            <div className="p10-col">
              <p className="p-81u2s6 p10-txt">{t('Loi n° 2024/017 : vous pouvez consulter, faire corriger et recevoir vos données.')}</p>
              <ul className="p10-liste">
                <li>{t('Votre profil, votre relais et votre convention.')}</li>
                <li>{t('Le journal signé de vos opérations (réceptions, remises, encaissements, constats).')}</li>
                <li>{tf('Les preuves (photos, journaux, constats), gardées {j} jours.', { j: f.regles.preuvesJours })}</li>
                {gerant && <li>{t('Vos versements et relevés.')}</li>}
              </ul>
              {f.donneesDemandees ? (
                <div className="p10-demande" role="status">
                  <Icone nom="hourglass" taille={18} />
                  <div>{tf('Demande du {date} : votre export arrive dans l’application au plus tard le {pret}.', { date: jourLong(f.donneesDemandees.le, langue), pret: jourLong(f.donneesDemandees.pretLe, langue) })}</div>
                </div>
              ) : (
                <button type="button" className="p-ncx7qc" disabled={g.enCours} onClick={() => void g.faire('reglage', 'donnees', (src, o) => src.relais.demanderDonnees(o), { ok: 'Demande envoyée : vous serez prévenu quand votre export sera prêt.', file: 'Hors connexion : la demande partira au retour du réseau.' })}>
                  <Icone nom="download" taille={18} />
                  {tf('Demander mes données (sous {j} jours)', { j: f.regles.donneesDelaiJours })}
                </button>
              )}
              <p className="p-81u2s6 p10-txt">{t(gerant ? 'Une donnée fausse ? Le nom affiché et le repère se corrigent par « Modifier » ; le reste par l’Aide. Les preuves ne se modifient jamais.' : 'Une donnée fausse ? Demandez au gérant ou passez par l’Aide. Les preuves ne se modifient jamais.')}</p>
              {peutOuvrir(m, 'historique') && (
                <Link to={chemin('historique')} className="p-rbzobc">
                  {t('Exporter l’historique des opérations')}
                </Link>
              )}
              <Annonce message={g.message} />
              <button type="button" className="p-rbzobc" onClick={fDonnees.fermer}>
                {t('Fermer')}
              </button>
            </div>
          </Feuille>
          {fFin.ouverte && gerant && <FeuilleFin f={f} fermer={fFin.fermer} g={g} />}
        </>
      }
    >
      <div className="p-0hxmj8 r-pile">
        <div>
          <div className="p-gh5llv" style={couverture ? { backgroundImage: `url(${couverture})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
            <img src={marque} alt="" className="p-yavg0h" />
          </div>
          <div className="p-9kvinp">
            <button type="button" className="p10-avatar-btn" onClick={fPhoto.ouvrir} aria-label={t(m.photo ? 'Changer la photo de profil' : 'Ajouter une photo de profil')}>
              <Avatar m={m} className="p-2wt0am" />
              <span className="p10-avatar-badge" aria-hidden="true">
                <Icone nom="r-appareil-photo" taille={16} />
              </span>
            </button>
            <h1 className="p-a81pfk">{`${m.prenom} ${m.nom}`}</h1>
            <div className="p-2lwm7c">{tf('{role} · {nom}, {quartier}', { role: t(gerant ? 'Gérant' : 'Employé de comptoir'), nom: f.nom, quartier: f.quartier })}</div>
            {s.numeroMasque && (
              <div className="p-2lwm7c" aria-label={tf('Numéro du compte, masqué : {n}', { n: s.numeroMasque })}>
                {s.numeroMasque}
              </div>
            )}
            <div className="p-oqlq8x">
              {f.verifie && <span className="p-nax3x4">{t('✓ Relais vérifié')}</span>}
              {f.fondateur && <span className="p-rpzy79">{t('Partenaire fondateur')}</span>}
            </div>
          </div>
        </div>
        <section className="p-yi6rkz" aria-labelledby="p10-monrelais">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu" id="p10-monrelais">
              {t('Mon relais')}
            </h2>
          </div>
          {(
            [
              ['Nom affiché', f.nom],
              ['Quartier', `${f.quartier} · ${f.zone}`],
              ['Repère', f.repere],
              ['Ville', f.ville],
              ['Partenaire depuis', `${MOIS[langue][depuis.getUTCMonth()]} ${depuis.getUTCFullYear()}`],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="p-mqmvkk">
              <span className="p-ytl255">{t(k)}</span>
              <span className="p-2vq92h">{v}</span>
            </div>
          ))}
          {f.ficheDemandee && (
            <div className="p10-demande" role="status">
              <Icone nom="hourglass" taille={18} />
              <div>{tf('Changement demandé le {date} : « {nom} », « {repere} ». Il s’affiche aux clients après l’accord de BelivaY.', { date: jourLong(f.ficheDemandee.le, langue), nom: f.ficheDemandee.nom, repere: f.ficheDemandee.repere })}</div>
            </div>
          )}
          <Link to={chemin('zone')} className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="map-pin" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">{t('Ma zone sur la carte')}</div>
              <div className="p-dfa05r">{tf('{zone} · position, quartiers couverts et horaires', { zone: f.zone })}</div>
            </div>
            <Icone nom="r-chevron-droite" taille={18} className="p-2bmvtm" />
          </Link>
          {gerant && !f.ficheDemandee && (
            <button type="button" className="p-rbzobc" onClick={fFiche.ouvrir}>
              <Icone nom="r-reglages" taille={18} className="p-emic6i" />
              {t('Demander une modification')}
            </button>
          )}
        </section>
        <section className="p-yi6rkz" aria-labelledby="p10-securite">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu" id="p10-securite">
              {t('Sécurité')}
            </h2>
          </div>
          <Link to={chemin('mon-compte')} className="p-o24hsm" data-ck="lien-mon-compte">
            <div className="p-toppw8">
              <Icone nom="key-round" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">{t('Mon compte')}</div>
              <div className="p-dfa05r">{t('Photo, nom, numéro, e-mail, mot de passe, Google')}</div>
            </div>
            <Icone nom="r-chevron-droite" taille={18} className="p-2bmvtm" />
          </Link>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-cadenas" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">{t('Code PIN de remise')}</div>
              <div className="p-dfa05r">{t('Demandé avant chaque remise : votre nom signe la remise')}</div>
            </div>
            <Interrupteur on label={t('Code PIN de remise')} raison={t('Toujours actif : chaque remise est signée de votre PIN.')} />
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-bouclier" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">{t('Double vérification')}</div>
              <div className="p-dfa05r">{t('Code SMS sur un nouvel appareil')}</div>
            </div>
            <Interrupteur on label={t('Double vérification')} raison={t('Toujours active : un nouvel appareil demande un code SMS.')} />
          </div>
          <div className="p-92xvtp" />
          <button type="button" className="p-o24hsm p10-btn" onClick={fPin.ouvrir}>
            <div className="p-toppw8">
              <Icone nom="key-round" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">{t('Mon code PIN')}</div>
              <div className="p-dfa05r">{tf('{n} chiffres, à vous seul · le changer', { n: f.regles.pinLongueur })}</div>
            </div>
            <Icone nom="r-chevron-droite" taille={18} className="p-2bmvtm" />
          </button>
          {gerant && (
            <>
              <div className="p-92xvtp" />
              <Link to={chemin('equipe', { voir: 'appareils' })} className="p-o24hsm">
                <div className="p-toppw8">
                  <Icone nom="r-telephone" taille={20} className="p-672m16" />
                </div>
                <div className="p-rnqj8n">
                  <div className="p-ife3a2">{t('Appareils connectés')}</div>
                  <div className="p-dfa05r">{autres ? tf(autres > 1 ? 'Ce téléphone et {n} autres · déconnecter à distance' : 'Ce téléphone et {n} autre · déconnecter à distance', { n: autres }) : t('Ce téléphone seulement')}</div>
                </div>
                <Icone nom="r-chevron-droite" taille={18} className="p-2bmvtm" />
              </Link>
              <div className="p-92xvtp" />
              <Link to={chemin('equipe')} className="p-o24hsm">
                <div className="p-toppw8">
                  <Icone nom="r-personne" taille={20} className="p-672m16" />
                </div>
                <div className="p-rnqj8n">
                  <div className="p-ife3a2">{t('Mon équipe')}</div>
                  <div className="p-dfa05r">{tf(employes > 1 ? '{n} employés sur {max} au plus · ils reçoivent et remettent, sans voir l’argent' : '{n} employé sur {max} au plus · il reçoit et remet, sans voir l’argent', { n: employes, max: f.equipeMax })}</div>
                </div>
                <Icone nom="r-chevron-droite" taille={18} className="p-2bmvtm" />
              </Link>
            </>
          )}
        </section>
        <section className="p-yi6rkz" aria-labelledby="p10-affichage">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu" id="p10-affichage">
              {t('Affichage et application')}
            </h2>
          </div>
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-lune" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">{t('Thème sombre')}</div>
              <div className="p-dfa05r">{t(p.choixTheme === 'auto' ? 'Suit le réglage du téléphone, jusqu’à votre choix' : 'Pour le guichet en fin de journée')}</div>
            </div>
            <Interrupteur on={p.theme === 'dark'} label={t('Thème sombre')} changer={(v) => p.setTheme(v ? 'dark' : 'light')} />
          </div>
          <div className="p-92xvtp" />
          <TailleDuTexte apercu="Aperçu : colis BLV-00008-1, emplacement A-04, 3e jour de garde." />
          <div className="p-92xvtp" />
          <div className="p-br69f5">
            <div className="p-liel66">
              <Icone nom="r-globe" taille={20} className="p-672m16" />
            </div>
            <div className="p-ht6ym0" id="p10-langue">
              {t('Langue')}
            </div>
            <div className="p-rqrwu6" role="radiogroup" aria-labelledby="p10-langue">
              {(
                [
                  ['fr', 'FR', 'Français'],
                  ['en', 'EN', 'English'],
                ] as const
              ).map(([l, court, long]) => (
                <button key={l} type="button" role="radio" aria-checked={langue === l} aria-label={long} lang={l} className={(langue === l ? 'p-h01hlk' : 'p-p4wplf') + ' p10-cible'} onClick={() => langue !== l && langueChoisie(l)}>
                  {court}
                </button>
              ))}
            </div>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="volume-2" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">{t('Sons')}</div>
              <div className="p-dfa05r">{t('Lot annoncé, remise validée, alerte')}</div>
            </div>
            <Interrupteur on={p.sons} label={t('Sons')} changer={p.setSons} />
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="smartphone-nfc" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">{t('Vibrations')}</div>
              <div className="p-dfa05r">{t('Sentir un événement, téléphone posé sur le comptoir')}</div>
            </div>
            <Interrupteur on={p.vibrations} label={t('Vibrations')} changer={p.setVibrations} />
          </div>
          <ApercuSons />
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-cloche" taille={20} className="p-672m16" />
            </div>
            <label className="p-rnqj8n" htmlFor="p10-resume">
              <div className="p-ife3a2">{t('Résumé du matin')}</div>
              <div className="p-dfa05r">{tf('Un seul message, jamais avant {h} ; rien entre {de} et {a} sauf l’urgent', { h: heure(r?.heureResumeMin ?? '07:00', langue), de: heure(`${String(f.regles.heuresCalmes.de).padStart(2, '0')}:00`, langue), a: heure(`${String(f.regles.heuresCalmes.a).padStart(2, '0')}:00`, langue) })}</div>
            </label>
            <select id="p10-resume" className="p-afs6hh p10-select" value={r?.heureResume ?? ''} disabled={!r} onChange={(e) => void g.faire('reglage', 'resume', (src, o) => src.notifications.regler({ heureResume: e.target.value }, o), { ok: 'Heure du résumé enregistrée.' }).then(() => reglages.relire())}>
              {heuresResume.map((h) => (
                <option key={h} value={h}>
                  {heure(h, langue)}
                </option>
              ))}
            </select>
          </div>
          {permis !== 'absente' && (
            <>
              <div className="p-92xvtp" />
              <div className="p-o24hsm">
                <div className="p-toppw8">
                  <Icone nom="bell-ring" taille={20} className="p-672m16" />
                </div>
                <div className="p-rnqj8n">
                  <div className="p-ife3a2">{t('Notifications du téléphone')}</div>
                  <div className="p-dfa05r">{t(permis === 'granted' ? 'Autorisées sur ce téléphone' : permis === 'denied' ? 'Bloquées : à autoriser dans les réglages du téléphone' : 'Pas encore autorisées')}</div>
                </div>
                {permis === 'default' && (
                  <button type="button" className="p-wn9elb p10-cible" onClick={() => void Notification.requestPermission().then(setPermis)}>
                    {t('Autoriser')}
                  </button>
                )}
              </div>
            </>
          )}
          <div className="p-92xvtp" />
          <Link to={chemin('accueil', { etat: 'hors-ligne' })} className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-reseau" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">{t('Hors connexion')}</div>
              <div className="p-dfa05r">{t('Réceptions et remises envoyées au retour du réseau')}</div>
            </div>
            <span className={attente ? 'r-pill r-ton-ambre' : 'p-nax3x4'}>{attente ? tf('{n} en attente', { n: attente }) : t('Actif')}</span>
          </Link>
          <div className="p-92xvtp" />
          <Link to={chemin('installer')} className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-telecharger" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">{t('Installer l’application')}</div>
              <div className="p-dfa05r">{t('Icône sur l’écran d’accueil, marche sans réseau')}</div>
            </div>
            <Icone nom="r-chevron-droite" taille={18} className="p-2bmvtm" />
          </Link>
          {peutOuvrir(m, 'capacite') && (
            <>
              <div className="p-92xvtp" />
              <Link to={chemin('capacite') + '#horaires'} className="p-o24hsm">
                <div className="p-toppw8">
                  <Icone nom="r-horloge" taille={20} className="p-672m16" />
                </div>
                <div className="p-rnqj8n">
                  <div className="p-ife3a2">{t('Horaires déclarés')}</div>
                  <div className="p-dfa05r">{f.horaires.demandeEnCours ? t('Changement demandé, en attente de BelivaY') : tf('{resume} · demander un changement', { resume: resumeHoraires })}</div>
                </div>
                <Icone nom="r-chevron-droite" taille={18} className="p-2bmvtm" />
              </Link>
            </>
          )}
          {voitArgent && (
            <>
              <div className="p-92xvtp" />
              <Link to={chemin('changer-momo')} className="p-o24hsm">
                <div className="p-toppw8">
                  <Icone nom="r-telephone" taille={20} className="p-672m16" />
                </div>
                <div className="p-rnqj8n">
                  <div className="p-ife3a2">{t('Numéro de versement')}</div>
                  <div className="p-dfa05r">{argent.donnees ? argent.donnees.numero.masque : t('Vérifié par une personne de BelivaY')}</div>
                </div>
                <Icone nom="r-chevron-droite" taille={18} className="p-2bmvtm" />
              </Link>
            </>
          )}
          <div className="p-92xvtp" />
          <button type="button" className="p-o24hsm p10-btn" onClick={fDonnees.ouvrir}>
            <div className="p-toppw8">
              <Icone nom="r-document" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">{t('Mes données')}</div>
              <div className="p-dfa05r">{f.donneesDemandees ? tf('Export demandé, prêt au plus tard le {date}', { date: jourLong(f.donneesDemandees.pretLe, langue) }) : tf('Consulter, faire corriger, demander l’export · preuves gardées {j} jours', { j: f.regles.preuvesJours })}</div>
            </div>
            <Icone nom="r-chevron-droite" taille={18} className="p-2bmvtm" />
          </button>
          {gerant && (
            <>
              <div className="p-92xvtp" />
              <button type="button" className="p-o24hsm p10-btn" onClick={fFin.ouvrir}>
                <div className="p-toppw8">
                  <Icone nom="r-entrer" taille={20} className="p-672m16" />
                </div>
                <div className="p-rnqj8n">
                  <div className="p-ife3a2">{t('Demander la fin de la convention')}</div>
                  <div className="p-dfa05r">{f.fin ? tf('Demandée : fin prononcée par BelivaY le {date}', { date: jourLong(f.fin.effetLe, langue) }) : tf('Avec un préavis de {j} jours', { j: f.regles.finPreavisJours })}</div>
                </div>
                <Icone nom="r-chevron-droite" taille={18} className="p-2bmvtm" />
              </button>
            </>
          )}
          <div className="p-92xvtp" />
          <div className="p-mqmvkk">
            <span className="p-ytl255">{t('Version')}</span>
            <span className="p-w01nj9">{tf('Point relais {v}', { v: import.meta.env.VITE_VERSION_RELAIS ?? '' })}</span>
          </div>
        </section>
        <Annonce message={fDonnees.ouverte ? null : g.message} />
        <button type="button" className="p-ui2zy9" onClick={deconnexion.ouvrir}>
          <Icone nom="r-entrer" taille={18} className="p-woejqv" />
          {t('Se déconnecter')}
        </button>
      </div>
    </Ecran>
  )
}

/** Nom affiché et repère : DEMANDE validée par BelivaY (PAR-03 ; DP-66 appliquée au relais). */
function FeuilleFiche({ f, fermer, g }: { f: FicheRelais; fermer: () => void; g: ReturnType<typeof useGesteRelais> }) {
  const { t } = usePreferences()
  const [nom, setNom] = useState(f.nom)
  const [repere, setRepere] = useState(f.repere)
  const [motif, setMotif] = useState('')
  const pret = nom.trim() && repere.trim() && motif.trim() && (nom.trim() !== f.nom || repere.trim() !== f.repere)
  return (
    <Feuille ouverte fermer={fermer} titre={t('Demander une modification')} classe="p10-feuille">
      <h2>{t('Demander une modification')}</h2>
      <form
        className="p10-col"
        onSubmit={(e) => {
          e.preventDefault()
          if (pret) void g.faire('reglage', 'fiche', (src, o) => src.relais.demanderModificationFiche({ nom, repere, motif }, o), { ok: 'Demande envoyée : BelivaY vérifie avant de l’afficher aux clients.' }).then((ok) => ok && fermer())
        }}
      >
        <label className="p-ky12xr">
          {t('NOM AFFICHÉ')}
          <input className="p-afs6hh" value={nom} onChange={(e) => setNom(e.target.value)} maxLength={60} />
        </label>
        <label className="p-ky12xr">
          {t('REPÈRE')}
          <input className="p-afs6hh" value={repere} onChange={(e) => setRepere(e.target.value)} maxLength={120} />
        </label>
        <label className="p-ky12xr">
          {t('POURQUOI CE CHANGEMENT ?')}
          <textarea className="p-afs6hh p10-zone" value={motif} onChange={(e) => setMotif(e.target.value)} maxLength={300} />
        </label>
        <p className="p-81u2s6 p10-txt">{t('L’adresse et le quartier ne changent qu’avec une nouvelle visite : écrivez à BelivaY depuis l’Aide.')}</p>
        <Annonce message={g.message} />
        <button type="submit" className="p-ncx7qc" disabled={!pret || g.enCours}>
          {t('Envoyer la demande')}
        </button>
        <button type="button" className="p-rbzobc" onClick={fermer}>
          {t('Annuler')}
        </button>
      </form>
    </Feuille>
  )
}

/** Mon code PIN : l'actuel, puis le nouveau deux fois (PIN-LONGUEUR chiffres, ni suite ni répétition, INV-02). */
function FeuillePin({ f, fermer, g }: { f: FicheRelais; fermer: () => void; g: ReturnType<typeof useGesteRelais> }) {
  const { t, tf } = usePreferences()
  const [ancien, setAncien] = useState('')
  const [nouveau, setNouveau] = useState('')
  const [encore, setEncore] = useState('')
  const n = f.regles.pinLongueur
  const chiffres = (v: string) => v.replace(/\D/g, '').slice(0, n)
  const different = encore.length === n && encore !== nouveau
  const pret = ancien.length === n && nouveau.length === n && encore === nouveau
  return (
    <Feuille ouverte fermer={fermer} titre={t('Mon code PIN')} classe="p10-feuille">
      <h2>{t('Changer mon code PIN')}</h2>
      <form
        className="p10-col"
        onSubmit={(e) => {
          e.preventDefault()
          if (pret) void g.faire('reglage', 'pin', (src, o) => src.relais.changerPin(ancien, nouveau, o), { ok: 'Nouveau PIN enregistré : il signe vos prochains gestes.' }).then((ok) => ok && fermer())
        }}
      >
        {(
          [
            ['PIN ACTUEL', ancien, setAncien, 'current-password'],
            ['NOUVEAU PIN', nouveau, setNouveau, 'new-password'],
            ['NOUVEAU PIN, ENCORE UNE FOIS', encore, setEncore, 'new-password'],
          ] as const
        ).map(([libelle, v, poser, auto]) => (
          <label key={libelle} className="p-ky12xr">
            {t(libelle)}
            <input className="p-afs6hh p10-code" type="password" inputMode="numeric" autoComplete={auto} maxLength={n} value={v} onChange={(e) => poser(chiffres(e.target.value))} />
          </label>
        ))}
        {different && (
          <p className="p10-annonce p10-ko" role="alert">
            {t('Les deux nouveaux PIN ne sont pas les mêmes.')}
          </p>
        )}
        <p className="p-81u2s6 p10-txt">{tf('{n} chiffres, ni suite (123456) ni répétition (111111). Personne d’autre ne le connaît, pas même le gérant.', { n })}</p>
        <Annonce message={g.message} />
        <button type="submit" className="p-ncx7qc" disabled={!pret || g.enCours}>
          {t('Enregistrer mon PIN')}
        </button>
        <button type="button" className="p-rbzobc" onClick={fermer}>
          {t('Annuler')}
        </button>
      </form>
    </Feuille>
  )
}

/** Fin de la convention : DEMANDE avec motif ; préavis, derniers jours sans colis, BelivaY prononce (ARL-26, PR-RC-28). */
function FeuilleFin({ f, fermer, g }: { f: FicheRelais; fermer: () => void; g: ReturnType<typeof useGesteRelais> }) {
  const { t, tf, langue } = usePreferences()
  const [motif, setMotif] = useState<string | null>(null)
  const [texte, setTexte] = useState('')
  const r = f.regles
  const effet = g.maintenant + r.finPreavisJours * 24 * 3600_000
  const sansColis = effet - r.finSansColisJours * 24 * 3600_000
  const final = motif === 'Autre raison' ? texte.trim() : motif ? t(motif) + (texte.trim() ? ' · ' + texte.trim() : '') : ''
  return (
    <Feuille ouverte fermer={fermer} titre={t('Demander la fin de la convention')} classe="p10-feuille">
      <h2>{t('Demander la fin de la convention')}</h2>
      {f.fin ? (
        <div className="p10-col">
          <div className="p10-demande" role="status">
            <Icone nom="hourglass" taille={18} />
            <div>
              <b>{tf('Demandée le {date}', { date: jourLong(f.fin.demandeeLe, langue) })}</b> · {f.fin.motif}
            </div>
          </div>
          <ul className="p10-liste">
            <li>{tf('Plus de nouveaux colis à partir du {date} : vous ne paraissez plus au choix des clients.', { date: jourLong(f.fin.sansColisDes, langue) })}</li>
            <li>{tf('BelivaY prononce la fin le {date}, quand le stock est vide et les espèces dues réglées.', { date: jourLong(f.fin.effetLe, langue) })}</li>
            <li>{t('Dernier versement le vendredi suivant la clôture ; accès fermés, appareils déliés.')}</li>
          </ul>
          <Annonce message={g.message} />
          <button type="button" className="p-ncx7qc" disabled={g.enCours} onClick={() => void g.faire('reglage', 'fin', (src, o) => src.relais.annulerFin(o), { ok: 'Demande annulée : votre relais continue.' }).then((ok) => ok && fermer())}>
            {t('Annuler ma demande, je continue')}
          </button>
          <button type="button" className="p-rbzobc" onClick={fermer}>
            {t('Fermer')}
          </button>
        </div>
      ) : (
        <form
          className="p10-col"
          onSubmit={(e) => {
            e.preventDefault()
            if (final) void g.faire('reglage', 'fin', (src, o) => src.relais.demanderFin(final, o), { ok: 'Demande envoyée à BelivaY : un agent vous appelle.' })
          }}
        >
          <ul className="p10-liste">
            <li>{tf('Préavis de {j} jours : votre relais continue de servir pendant ce temps.', { j: r.finPreavisJours })}</li>
            <li>{tf('Les {j} derniers jours (à partir du {date}), plus de nouveaux colis ; les colis restants sont remis ou transférés.', { j: r.finSansColisJours, date: jourLong(sansColis, langue) })}</li>
            <li>{tf('BelivaY prononce la fin le {date} au plus tôt, quand le stock est vide et les espèces dues réglées ; dernier versement le vendredi suivant.', { date: jourLong(effet, langue) })}</li>
            <li>{tf('Vos preuves restent gardées {j} jours ; vous pouvez demander vos données.', { j: r.preuvesJours })}</li>
          </ul>
          <div className="p-yscrc8" id="p10-motif">
            {t('POURQUOI ?')}
          </div>
          <div className="p10-choix" role="radiogroup" aria-labelledby="p10-motif">
            {MOTIFS_FIN.map((x) => (
              <label key={x}>
                <input type="radio" name="motif-fin" checked={motif === x} onChange={() => setMotif(x)} />
                <span>{t(x)}</span>
              </label>
            ))}
          </div>
          <label className="p-ky12xr">
            {t(motif === 'Autre raison' ? 'DITES-NOUS EN QUELQUES MOTS' : 'UN MOT DE PLUS (FACULTATIF)')}
            <textarea className="p-afs6hh p10-zone" value={texte} onChange={(e) => setTexte(e.target.value)} maxLength={300} />
          </label>
          <Annonce message={g.message} />
          <button type="submit" className="p-ui2zy9" disabled={!final || g.enCours}>
            {t('Envoyer ma demande de fin')}
          </button>
          <button type="button" className="p-rbzobc" onClick={fermer}>
            {t('Annuler')}
          </button>
          <p className="p-81u2s6 p10-txt">{t('Rien ne s’arrête aujourd’hui : vous pouvez annuler tant que BelivaY n’a pas prononcé la fin.')}</p>
        </form>
      )}
    </Feuille>
  )
}
