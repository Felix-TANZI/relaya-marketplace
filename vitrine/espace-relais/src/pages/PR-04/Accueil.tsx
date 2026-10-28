// « Aujourd'hui » (PR-04 ACC-01 à ACC-07, VID-01 à VID-04, HLN-01 à HLN-06 ; PR-RC-05, PR-RC-09, PR-RC-14 à PR-RC-18 ;
// ARL-03, ARL-05, ARL-06, ARL-14, ARL-15). Structure du prototype gardée, dans ses trois situations :
// - normale (Accueil) : salutation, héros orange du prochain livreur, 4 tuiles, « À faire maintenant », carte nuit
//   « Gagné cette semaine » (gérant seul), Trust Score et avis, pied réseau ;
// - relais neuf (AccueilVide : relais sans aucune remise, démonstration ?demo=neuf) : chaque zone vide dit quoi faire ou attendre, liste
//   « Votre premier jour », cartes pointillées (pas encore de gains, Trust Score en construction) ;
// - hors connexion (HorsLigne, ?etat=hors-ligne, ou téléphone sans réseau) : bannière ambre avec la durée, ce qui marche
//   sans réseau, file des opérations en attente avec leur heure réelle, « Réessayer l'envoi », opérations expirées à
//   refaire (OFF-05), note (72 h, registre papier, ne pas désinstaller).
// Une seule lecture : source.aujourdhui.aujourdhui() (GET /relay/today) ; relue à chaque événement (temps réel). Un
// employé ne voit aucun montant (ACC-05, ARL-06) : le serveur ne les lui envoie pas (null).
import { useRelief } from '@client/vie/vie'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { F } from '@client/i18n/format'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { usePeutOuvrir } from '../../config/droits'
import { chemin } from '../../config/pages'
import { debutDuJour } from '../../calculs/temps'
import type { Aujourdhui, TacheDuJour } from '../../donnees/domaines/aujourdhui'
import type { ActionEnFile, TypeAction } from '../../donnees/domaines/horsligne'
import { envoyerLaFile, useEnLigne, useFile } from '../../donnees/fileHorsLigne'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { echeance, heure, jourCourt, jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useHorloge, useSession } from '../../session'
import { BandeauCapacite } from '../PR-05/Cas'
import './pr04.css'

const TYPES: Record<TypeAction, string> = {
  reception: 'Réception',
  validation_lot: 'Lot',
  remise: 'Remise',
  encaissement: 'Encaissement',
  controle: 'Contrôle',
  constat: 'Constat',
  retour: 'Retour',
  sortie: 'Sortie',
  deplacement: 'Déplacement',
  fermeture: 'Fermeture',
  message: 'Message',
  reglage: 'Réglage',
  photo: 'Photo',
}
const ICONES_FILE: Partial<Record<TypeAction, string>> = { reception: 'r-colis', validation_lot: 'r-colis', remise: 'check', encaissement: 'check', constat: 'r-balance', photo: 'r-appareil-photo', sortie: 'r-camion', retour: 'r-colis', message: 'r-document' }
const VERSEMENT: Record<NonNullable<Aujourdhui['semaine']>['statut'], string> = { prevu: 'versement prévu', envoye: 'versement envoyé', credite: 'versement crédité', refuse: 'versement refusé', suspendu: 'versement suspendu' }

export default function Accueil() {
  const [params] = useSearchParams()
  const enLigne = useEnLigne()
  const etat = params.get('etat')
  if (etat === 'hors-ligne' || !enLigne) return <HorsLigne />
  return <Journee />
}

// ═══════════════════════════════ Journée (normale et relais neuf) ═══════════════════════════════
function Journee() {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const maintenant = useHorloge(30_000)
  const lecture = useLecture(() => source.aujourdhui.aujourdhui(), [])
  const capacite = usePeutOuvrir('capacite')
  /** Accord du nombre : modèle au singulier pour 1, au pluriel sinon. */
  const tfn = (n: number, un: string, plus: string, v: Record<string, string | number> = {}) => tf(n === 1 ? un : plus, { n, ...v })
  const a = lecture.donnees
  // Deux blocs importants (prochain livreur, caisse du jour) : relief léger (site/src/vie) ; jamais sur une liste.
  const relief = useRelief()

  if (!a)
    return (
      <Ecran route="accueil">
        {lecture.erreur ? (
          <>
            <div className="r-vide" role="alert">
              <div className="r-vide-i r-rouge">
                <Icone nom="r-reseau" taille={28} />
              </div>
              <h2>{t('La journée n’a pas pu être chargée')}</h2>
              <p>{t('Vos colis, vos preuves et vos opérations en attente sont gardés sur le téléphone. Réessayez dans un instant.')}</p>
            </div>
            <button type="button" className="r-btn r-principal" onClick={lecture.relire}>
              <Icone nom="r-reseau" taille={20} />
              <span>{t('Réessayer')}</span>
            </button>
          </>
        ) : (
          <div className="p-0hxmj8 r-pile" aria-busy="true">
            <div className="r4-chargement" role="status">
              {t('Chargement de la journée…')}
            </div>
          </div>
        )}
      </Ecran>
    )

  const c = a.compteurs
  const premier = a.premierJour
  const neuf = !!a.premierJour
  const pl = a.prochainLot
  const minutes = pl?.arriveeEstimee != null ? Math.round((pl.arriveeEstimee - maintenant) / 60_000) : null
  const dansFenetre = !!pl && (pl.suivi === 'en_approche' || pl.suivi === 'arrive' || (minutes !== null && minutes <= a.regles.herosFenetreMin))
  const manque = pl?.placesManquantes ?? 0
  const placesTexte = pl
    ? manque > 0
      ? tfn(manque, 'Il manque {n} place : préparez les départs d’abord.', 'Il manque {n} places : préparez les départs d’abord.') + (pl.aReprendre ? ' ' + tf('Le livreur repart avec {n} colis.', { n: pl.aReprendre }) : '')
      : tf('Il faudra {p} places : vous en avez {l}.', { p: pl.placesNecessaires, l: c.placesLibres }) + (pl.aReprendre ? ' ' + tf('Le livreur repart avec {n} colis.', { n: pl.aReprendre }) : '')
    : ''
  const kicker = !pl ? '' : pl.suivi === 'non_depose' ? 'DÉPÔT IMPOSSIBLE' : !dansFenetre ? 'PROCHAINE LIVRAISON' : pl.suivi === 'arrive' ? 'LIVREUR ARRIVÉ' : pl.suivi === 'en_approche' ? 'LIVREUR EN APPROCHE' : pl.suivi === 'en_route' ? 'LIVREUR EN ROUTE' : 'LIVRAISON ANNONCÉE'
  const puce = !pl ? '' : pl.suivi === 'arrive' ? t('au comptoir') : minutes === null ? t('heure à venir') : minutes < 0 ? tf('en retard de {n} min', { n: -minutes }) : dansFenetre ? tf('dans ~{n} min', { n: minutes }) : tf('vers {h}', { h: heure(pl.arriveeEstimee!, langue) })

  const sousTitre = [jourLong(a.maintenant, langue).replace(/^\p{L}/u, (x) => x.toUpperCase()), c.prets === 1 ? t('1 colis prêt au retrait') : tf('{n} colis prêts au retrait', { n: c.prets }), !a.ouvert ? (a.rouvreLe ? tf('fermé · rouvre {quand}', { quand: echeance(a.rouvreLe, a.maintenant, langue) }) : t('fermé')) : null].filter(Boolean).join(' · ')

  return (
    <Ecran route="accueil">
      <div className="p-0hxmj8 r-pile">
        <div>
          <h1 className="p-bvhkrl">{neuf ? t('Bienvenue au relais !') : tf('Bonjour {prenom}', { prenom: s.membre?.prenom ?? '' })}</h1>
          <div className="p-t2u0o2">{neuf ? t('Voici comment se passe votre premier jour.') + ' ' + sousTitre : sousTitre}</div>
        </div>

        <BandeauCapacite />
        {/* ── À faire maintenant (ACC-03, ACC-04) ou Votre premier jour (VID-02) ── */}
        {premier ? (
          <PremierJour p={premier} gerant={s.membre?.role === 'proprietaire'} />
        ) : (
          <div className="p-yi6rkz">
            <div className="p-unncbq">
              <h2 className="p-9j1bbu">{t('À faire maintenant')}</h2>
              {a.taches.length > 0 && <span className="p-rpzy79">{String(a.taches.length)}</span>}
            </div>
            {a.taches.length === 0 ? (
              <div className="p-o24hsm">
                <div className="p-tc472u">
                  <Icone nom="check" taille={20} className="p-q7qjlz" />
                </div>
                <div className="p-rnqj8n">
                  <div className="p-ife3a2">{t('Rien d’urgent')}</div>
                  <div className="p-dfa05r">{t('Tout est à jour. Une nouvelle tâche paraît ici dès qu’elle demande un geste de votre part.')}</div>
                </div>
              </div>
            ) : (
              a.taches.map((x, k) => <LigneTache key={x.type + k} x={x} premiere={k === 0} a={a} />)
            )}
          </div>
        )}

        {/* ── Héros : le prochain livreur (ACC-02 ; PR-HEROS-FENETRE-MIN ; critère 1) ── */}
        {pl ? (
          <div className={'p-g9jysb' + (manque > 0 ? ' r4-heros-manque' : '') + relief.className} onPointerMove={relief.onPointerMove} onPointerLeave={relief.onPointerLeave} onPointerDown={relief.onPointerDown} onPointerUp={relief.onPointerUp}>
            <div className="p-wxow1i">
              <div className="p-svzvpz">{t(kicker)}</div>
              <span className="p-3298ie">{puce}</span>
            </div>
            <div className="p-7hccg6">
              <div className="p-rjzvxd">{String(pl.colis)}</div>
              <div className="p-jr92id">
                {t(dansFenetre ? 'colis à réceptionner' : 'colis annoncés')}
                <br />
                <span className="p-nfts90">{tf('{entreprise} · {livreur} · lot {lot}', { entreprise: pl.entreprise, livreur: pl.livreur, lot: pl.lot })}</span>
              </div>
            </div>
            <div className="p-anbp2l">{pl.suivi === 'non_depose' ? t('Le livreur n’a pas pu déposer : son entreprise reprogramme le dépôt. Rien à faire de votre côté.') : placesTexte}</div>
            {dansFenetre && pl.suivi !== 'non_depose' ? (
              <Link to={chemin('reception')} className="p-wpiafb r4-cible-56">
                <Icone nom="r-cle" taille={18} className="p-672m16" />
                {t('Préparer la réception')}
              </Link>
            ) : (
              <div className="p-ymdhkv">{tf('Vous êtes prévenu {n} minutes avant l’arrivée du livreur.', { n: a.regles.approcheMin })}</div>
            )}
          </div>
        ) : (
          <div className="p-g9jysb">
            <div className="p-svzvpz">{t(neuf ? 'EN ATTENTE DU PREMIER LIVREUR' : 'AUCUN LIVREUR ANNONCÉ')}</div>
            <div className="p-fdt7cn">{t(neuf ? 'Aucun colis annoncé pour l’instant' : 'Aucune livraison prévue aujourd’hui')}</div>
            <div className="p-ymdhkv">{tf('Dès qu’une entreprise de livraison choisit un lot pour votre relais, il apparaît ici avec l’heure d’arrivée. Vous recevez une notification {n} minutes avant.', { n: a.regles.approcheMin })}</div>
          </div>
        )}

        {/* ── Tuiles (ACC-01 ; critère 2 : chaque tuile ouvre la liste déjà filtrée) ; caisse du jour (gérant seul) ── */}
        <div className="p-0cipe3">
          <Tuile vers={chemin('stock')} titre="À REMETTRE" n={c.prets} ton="p-2ry3a6" texte={c.prets ? t('colis prêts au retrait') : t('aucun colis en stock')} />
          <Tuile vers={chemin('stock', { onglet: 'urgents' })} titre="DERNIER JOUR" n={c.dernierJour} ton={c.dernierJour ? 'p-lvd2aa' : 'p-2ry3a6'} texte={c.dernierJour ? (a.fermeA ? tf('à retirer avant {h}', { h: heure(a.fermeA, langue) }) : t('à retirer aujourd’hui')) : '—'} />
          <Tuile vers={chemin('departs')} titre="À FAIRE PARTIR" n={c.aFairePartir} ton={c.aFairePartir ? 'p-lca2pq' : 'p-2ry3a6'} texte={c.aFairePartir ? motifs(c.motifsAFairePartir, t) || t('renvoi, retour, transfert') : '—'} />
          <Tuile
            vers={capacite ? chemin('capacite') : chemin('stock')}
            titre="PLACES LIBRES"
            n={c.placesLibres}
            ton={c.saturation ? 'p-lvd2aa' : 'p-2ry3a6'}
            texte={c.saturation ? tf('sur {total} · {taux} % : nouveaux envois suspendus', { total: c.placesDeclarees, taux: c.tauxOccupation }) : tf('sur {total} · {taux} % occupé', { total: c.placesDeclarees, taux: c.tauxOccupation })}
          />
        </div>

        {a.caisseDuJour && !neuf && (
          <Link to={chemin('versements')} className={'p-cevv9w r4-caisse-tuile' + relief.className} onPointerMove={relief.onPointerMove} onPointerLeave={relief.onPointerLeave} onPointerDown={relief.onPointerDown} onPointerUp={relief.onPointerUp}>
            <div className="p-2knnop">
              <div className="p-yscrc8">{t('CAISSE DU JOUR')}</div>
              <div className="p-2ry3a6">
                {F(a.caisseDuJour.total)} <span className="r4-unite">F</span>
              </div>
              <div className="p-g7lwlw">
                {a.caisseDuJour.total > 0 ? tf('espèces de garde · votre part {relais} F · BelivaY {belivay} F, déduits vendredi', { relais: F(a.caisseDuJour.partRelais), belivay: F(a.caisseDuJour.partBelivay) }) : t('aucune espèce de garde encaissée aujourd’hui')}
              </div>
            </div>
          </Link>
        )}

        {/* ── Gagné cette semaine (gérant seul : ACC-05, ACC-07 ; caisse du jour : v6 D12, ARL-05) ── */}
        {a.semaine && !neuf && (
          <Link to={chemin('versements')} className="p-0ygmxn">
            <div className="p-9rmh6y">
              <div className="p-xmy0fy">{t('GAGNÉ CETTE SEMAINE')}</div>
              <Icone nom="r-chevron-droite" taille={18} className="p-v08d0o" />
            </div>
            <div className="p-f3eaa4">
              {F(a.semaine.gains)} <span className="p-trntci">{t('FCFA')}</span>
            </div>
            <div className="p-yz5dyd">
              {tf('{n} colis remis · {j} jours de garde · {etat}', { n: a.semaine.colisRemis, j: a.semaine.joursGarde, etat: t(VERSEMENT[a.semaine.statut]) })} <strong className="p-ipp0fd">{jourCourt(a.semaine.versementLe, langue)}</strong>
              {' · '}
              {tf('{montant} F à verser', { montant: F(a.semaine.versement) })}
            </div>
          </Link>
        )}
        {neuf && s.membre?.role === 'proprietaire' && (
          <Link to={chemin('versements')} className="p-t6ao9i r4-carte-lien">
            <Icone nom="r-carte-paiement" taille={26} className="p-672m16" />
            <div className="p-buxdaz">{t('Pas encore de gains')}</div>
            <div className="p-oyklrp">{tf('Vos premiers {n} F arrivent à la première remise. Versement chaque vendredi.', { n: F(a.premierJour!.premiereRemise) })}</div>
          </Link>
        )}

        {/* ── Trust Score et avis ── */}
        {a.trust.score === null ? (
          <Link to={chemin('trust')} className="p-t6ao9i r4-carte-lien">
            <Icone nom="r-bouclier" taille={26} className="p-672m16" />
            <div className="p-buxdaz">{t('Trust Score : en construction')}</div>
            <div className="p-oyklrp">{t('Vous démarrez à une note neutre ; elle se précise après vos premières opérations. Votre score n’est jamais montré aux clients.')}</div>
          </Link>
        ) : (
          <div className="p-0cipe3">
            <Link to={chemin('trust')} className="p-nznq5x">
              <svg width="46" height="46" viewBox="0 0 60 60" aria-hidden="true" className="p-bo3n4y">
                <circle cx="30" cy="30" r="25" fill="none" strokeWidth="7" className="p-tmlbwm" />
                <circle cx="30" cy="30" r="25" fill="none" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${Math.round((a.trust.score / 100) * 157)} 157`} transform="rotate(-90 30 30)" className="p-wqszl3" />
                <text x="30" y="36" textAnchor="middle" fontSize="17" fontWeight="800" fontFamily="Plus Jakarta Sans, sans-serif" className="p-6nec68">
                  {String(Math.round(a.trust.score))}
                </text>
              </svg>
              <div>
                <div className="p-cp89bh">{t('Trust Score')}</div>
                <div className="p-46lk2m">
                  {a.trust.alerte
                    ? a.trust.alerte.sens === 'montee'
                      ? tf('{p} · palier suivant à {s}', { p: t(a.trust.palier), s: a.trust.alerte.seuil })
                      : tf('{p} · seuil de {s} proche', { p: t(a.trust.palier), s: a.trust.alerte.seuil })
                    : tf('Palier {p}', { p: t(a.trust.palier) })}
                </div>
              </div>
            </Link>
            <Link to={chemin('avis')} className="p-nznq5x">
              <div className="p-141mfj">{a.avis.note === null ? '—' : a.avis.note.toLocaleString(langue === 'en' ? 'en-GB' : 'fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</div>
              <div>
                <div className="p-cp89bh">{t('Avis clients')}</div>
                <div className="p-46lk2m">{a.avis.nombre ? tf('{n} avis · {j} j', { n: a.avis.nombre, j: a.avis.jours }) : t('Pas encore d’avis')}</div>
              </div>
            </Link>
          </div>
        )}

        {/* ── Pied : réseau et opérations en attente (OFF-03 ; critère 4) ── */}
        <Link to={chemin('accueil', { etat: 'hors-ligne' })} className="p-nn3lx5 r4-pied">
          <Icone nom="r-reseau" taille={15} className="p-q7qjlz" />
          {a.enAttenteEnvoi ? (a.enAttenteEnvoi === 1 ? t('Connecté · 1 opération en attente d’envoi') : tf('Connecté · {n} opérations en attente d’envoi', { n: a.enAttenteEnvoi })) : t('Connecté · aucune opération en attente d’envoi')}
        </Link>
      </div>
    </Ecran>
  )
}

const motifs = (m: Aujourdhui['compteurs']['motifsAFairePartir'], t: (s: string) => string) =>
  [
    m.renvoi ? `${m.renvoi} ${t(m.renvoi > 1 ? 'renvois' : 'renvoi')}` : null,
    m.retour ? `${m.retour} ${t(m.retour > 1 ? 'retours' : 'retour')}` : null,
    m.transfert ? `${m.transfert} ${t(m.transfert > 1 ? 'transferts' : 'transfert')}` : null,
    m.refus ? `${m.refus} ${t(m.refus > 1 ? 'refus au comptoir' : 'refus au comptoir')}` : null,
  ]
    .filter(Boolean)
    .join(', ')

function Tuile(p: { vers: string; titre: string; n: number; ton: string; texte: string }) {
  const { t } = usePreferences()
  return (
    <Link to={p.vers} className="p-cevv9w">
      <div className="p-2knnop">
        <div className="p-yscrc8">{t(p.titre)}</div>
        <div className={p.ton}>{String(p.n)}</div>
        <div className="p-g7lwlw">{p.texte}</div>
      </div>
    </Link>
  )
}

function LigneTache({ x, premiere, a }: { x: TacheDuJour; premiere: boolean; a: Aujourdhui }) {
  const { t, tf, langue } = usePreferences()
  let vers = chemin('stock')
  let icone = 'r-colis'
  let fond = 'p-toppw8'
  let couleur = 'p-672m16'
  let titre = ''
  let texte = ''
  const ambre = () => ((fond = 'p-9exjl6'), (couleur = 'p-lhsznn'))
  const rouge = () => ((fond = 'p-19z9iu'), (couleur = 'p-woejqv'))
  switch (x.type) {
    case 'lot_a_confirmer':
      vers = chemin('reception')
      icone = 'r-horloge'
      ambre()
      titre = tf('Faire confirmer le lot {lot} au livreur', { lot: x.lot })
      texte = x.alerteSupport ? tf('Pas de confirmation depuis {n} min : le support BelivaY est alerté', { n: a.regles.lotConfirmMin }) : tf('Validé à {h} : la garde passe au relais à sa confirmation', { h: heure(x.valideA, langue) })
      break
    case 'code_bloque':
      vers = chemin('reception')
      icone = 'r-cadenas'
      rouge()
      titre = tf('Ne prendre aucun lot avant {h}', { h: heure(x.jusqua, langue) })
      texte = t('Trop de codes faux : BelivaY est alerté. Ne prenez aucun lot sans code valide.')
      break
    case 'collecte':
      vers = chemin('departs')
      icone = 'r-camion'
      titre = x.heure ? tf('Préparer la collecte de {h}', { h: heure(x.heure, langue) }) : t('Préparer la collecte')
      texte = tf('{n} colis à remettre au livreur : {motifs}', { n: x.colis, motifs: motifs(x.motifs, t) })
      break
    case 'a_faire_partir':
      vers = chemin('departs')
      icone = 'r-camion'
      titre = tf('Mettre à part {n} colis à faire partir', { n: x.colis })
      texte = t('BelivaY programme leur collecte')
      break
    case 'dernier_jour':
      vers = chemin('stock', { onglet: 'urgents' })
      icone = 'r-horloge'
      ambre()
      titre = x.colis > 1 ? tf('Préparer {n} colis au dernier jour', { n: x.colis }) : t('Préparer 1 colis au dernier jour')
      texte = x.fermeA ? tf('Clients prévenus · retrait avant {h}', { h: heure(x.fermeA, langue) }) : t('Clients prévenus · retrait aujourd’hui')
      break
    case 'constat':
      vers = chemin('dossier-litige', { id: x.id })
      icone = 'r-balance'
      titre = tf('Compléter le constat {id}', { id: x.id })
      texte = tf('{colis} · BelivaY demande une photo', { colis: x.colis })
      break
    case 'groupage':
      vers = chemin('stock', { onglet: 'groupage' })
      icone = 'r-couches'
      fond = 'p-yrqs2p'
      couleur = 'p-rd23br'
      titre = x.colis > 1 ? tf('Garder à part {n} colis en groupage', { n: x.colis }) : t('Garder à part 1 colis en groupage')
      texte = x.jusquau ? tf('Gardés sans frais · remise groupée prévue le {date}', { date: jourCourt(debutDuJour(x.jusquau), langue) }) : t('Gardés sans frais, sans code avant la libération du groupe')
      break
    case 'expirees':
      vers = chemin('accueil', { etat: 'hors-ligne' })
      icone = 'r-alerte'
      rouge()
      titre = x.n > 1 ? tf('Refaire {n} opérations expirées', { n: x.n }) : t('Refaire 1 opération expirée')
      texte = t('En attente depuis trop longtemps : elle n’est pas partie, refaites-la')
      break
    case 'non_prevenu':
      icone = 'r-cloche'
      fond = 'p-yrqs2p'
      couleur = 'p-rd23br'
      vers = chemin('stock', { onglet: 'gratuits' })
      titre = x.colis > 1 ? tf('Garder {n} colis : clients pas encore prévenus', { n: x.colis }) : t('Garder 1 colis : client pas encore prévenu')
      texte = x.relanceA ? tf('Rien n’est facturé avant l’avis ; BelivaY relance par SMS {quand}', { quand: echeance(x.relanceA, a.maintenant, langue) }) : t('Rien n’est facturé avant l’avis ; BelivaY relance par SMS')
      break
    case 'dette':
      vers = chemin('versements')
      icone = 'r-carte-paiement'
      rouge()
      titre = tf('Reverser {montant} F à BelivaY', { montant: F(x.montant) })
      texte = t('Part BelivaY des espèces de garde au-delà du plafond : par Mobile Money, avec la référence fournie')
      break
  }
  return (
    <>
      {!premiere && <div className="p-92xvtp" />}
      <Link to={vers} className="p-o24hsm">
        <div className={fond}>
          <Icone nom={icone} taille={20} className={couleur} />
        </div>
        <div className="p-rnqj8n">
          <div className="p-ife3a2">{titre}</div>
          <div className="p-dfa05r">{texte}</div>
        </div>
        <Icone nom="r-chevron-droite" taille={18} className="p-2bmvtm" />
      </Link>
    </>
  )
}

/** « Votre premier jour » (VID-02) : formation, numéro de versement, caméra, étagères, horaires. */
function PremierJour({ p, gerant }: { p: NonNullable<Aujourdhui['premierJour']>; gerant: boolean }) {
  const { t, tf } = usePreferences()
  const formationFaite = p.formation.total > 0 && p.formation.faits >= p.formation.total
  const fait = (
    <span className="p-nax3x4">{t('Fait')}</span>
  )
  const ligne = (vers: string, ok: boolean, icone: string, titre: string, texte: string) => (
    <Link to={vers} className="p-o24hsm">
      <div className={ok ? 'p-tc472u' : 'p-toppw8'}>
        <Icone nom={ok ? 'check' : icone} taille={20} className={ok ? 'p-q7qjlz' : 'p-672m16'} />
      </div>
      <div className="p-rnqj8n">
        <div className="p-ife3a2">{titre}</div>
        <div className="p-dfa05r">{texte}</div>
      </div>
      {ok ? fait : <Icone nom="r-chevron-droite" taille={18} className="p-2bmvtm" />}
    </Link>
  )
  return (
    <div className="p-yi6rkz">
      <div className="p-unncbq">
        <h2 className="p-9j1bbu">{t('Votre premier jour')}</h2>
      </div>
      {ligne(chemin('formation'), formationFaite, 'r-document', t(formationFaite ? 'Formation terminée' : 'Terminez la formation'), tf('{n} modules sur {total}', { n: p.formation.faits, total: p.formation.total }))}
      <div className="p-92xvtp" />
      {gerant
        ? ligne(chemin('versements'), p.numero.verifie, 'r-carte-paiement', t(p.numero.verifie ? 'Numéro de versement vérifié' : 'Numéro de versement à vérifier'), p.numero.masque ?? '—')
        : ligne(chemin('aide'), p.numero.verifie, 'r-carte-paiement', t(p.numero.verifie ? 'Numéro de versement vérifié' : 'Numéro de versement à vérifier'), t('Le gérant s’en occupe'))}
      <div className="p-92xvtp" />
      {ligne(chemin('camera'), false, 'r-qr', t('Préparez l’appareil photo'), t('Autorisez la caméra : elle sert au scan et aux photos de preuve'))}
      <div className="p-92xvtp" />
      {ligne(chemin('stock'), false, 'r-pile', t('Préparez vos étagères'), t('Étiquetez A, B et C comme sur le plan'))}
      <div className="p-92xvtp" />
      {ligne(chemin('capacite'), false, 'r-horloge', t('Vérifiez vos horaires'), t('Les clients choisissent votre relais selon eux'))}
    </div>
  )
}

// ═══════════════════════════════ Hors connexion (HLN-01 à HLN-06) ═══════════════════════════════
function HorsLigne() {
  const { t, tf, langue } = usePreferences()
  const enLigne = useEnLigne()
  const maintenant = useHorloge(30_000)
  const file = useFile()
  const regles = useLecture(() => source.horsligne.regles(), []).donnees
  const [annonce, setAnnonce] = useState('')
  /** Accord du nombre : modèle au singulier pour 1, au pluriel sinon. */
  const tfn = (n: number, un: string, plus: string, v: Record<string, string | number> = {}) => tf(n === 1 ? un : plus, { n, ...v })
  const [envoi, setEnvoi] = useState(false)
  const attente = file?.actions.filter((x) => x.etat === 'en_attente').sort((x, y) => y.origine.heure - x.origine.heure) ?? []
  const expirees = file?.actions.filter((x) => x.etat === 'expiree' && x.motif !== 'refaite') ?? []
  const depuis = file?.horsLigneDepuis ?? null
  const minutes = depuis !== null ? Math.max(0, Math.round((maintenant - depuis) / 60_000)) : null

  const reessayer = async () => {
    if (!enLigne) {
      signal('alerte')
      setAnnonce(t('Toujours hors connexion : l’envoi partira tout seul au retour du réseau.'))
      return
    }
    setEnvoi(true)
    try {
      const b = await envoyerLaFile()
      setAnnonce(b ? tfn(b.envoyees, '{n} opération envoyée, {r} refusée(s)', '{n} opérations envoyées, {r} refusée(s)', { r: b.refusees }) : t('Rien à envoyer : tout est déjà parti.'))
    } finally {
      setEnvoi(false)
    }
  }
  const refaite = async (x: ActionEnFile) => {
    const r = await source.horsligne.marquerRefaite(x.origine.cle)
    setAnnonce(r.ok ? t('Opération marquée refaite : elle reste au journal.') : t('Cette opération n’est plus dans la file.'))
  }
  const ligne = (x: ActionEnFile, k: number) => (
    <div key={x.origine.cle}>
      {k > 0 && <div className="p-92xvtp" />}
      <div className="p-o24hsm">
        <div className="p-yrqs2p">
          <Icone nom={ICONES_FILE[x.type] ?? 'r-document'} taille={20} className="p-rd23br" />
        </div>
        <div className="p-rnqj8n">
          <div className="p-ife3a2">{`${heure(x.origine.heure, langue)} · ${t(TYPES[x.type])} ${x.objet}`}</div>
          <div className="p-dfa05r">{x.photos ? (x.photos > 1 ? tf('{n} photos', { n: x.photos }) : t('1 photo')) : t('sans photo')}</div>
        </div>
      </div>
    </div>
  )
  const oui = <span className="p-nax3x4">{t('Oui')}</span>
  return (
    <Ecran route="accueil">
      <div className="p-0hxmj8 r-pile">
        <div className={enLigne ? 'p-03dir0 r4-connecte' : 'p-03dir0'} data-hors-ligne="" role="status">
          <Icone nom="r-reseau" taille={20} className={enLigne ? 'p-q7qjlz' : 'p-lhsznn'} />
          <div className="p-lmo74g">
            <div className="p-dfc4i3">{enLigne ? t('Connecté') : minutes !== null ? tf('Hors connexion depuis {n} min', { n: minutes }) : t('Hors connexion')}</div>
            <div className="p-mqy5dn">
              {enLigne ? (attente.length ? tfn(attente.length, '{n} opération en attente d’envoi : elle part maintenant.', '{n} opérations en attente d’envoi : elles partent maintenant.') : t('Aucune opération en attente d’envoi.')) : t('Vous pouvez continuer : tout sera envoyé au retour du réseau.')}
              {!enLigne && attente.length > 0 && ' ' + tf('Hors ligne · {n} en attente', { n: attente.length })}
            </div>
          </div>
        </div>
        <div>
          <h1 className="p-bvhkrl">{t('Ce qui marche sans réseau')}</h1>
        </div>
        <div className="p-yi6rkz">
          <div className="p-o24hsm">
            <div className="p-tc472u">
              <Icone nom="r-colis" taille={20} className="p-q7qjlz" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">{t('Recevoir un lot')}</div>
              <div className="p-dfa05r">{t('Code de dépôt vérifié si le lot était déjà téléchargé')}</div>
            </div>
            {oui}
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-tc472u">
              <Icone nom="r-cle" taille={20} className="p-q7qjlz" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">{t('Remettre un colis sans montant dû')}</div>
              <div className="p-dfa05r">
                {t('Code vérifié sur la liste chiffrée du téléphone')}
                {regles && ' · ' + tf('garde en espèces encaissée, au plus {n} remises par jour', { n: regles.remisesHorsLigneParJour })}
              </div>
            </div>
            {oui}
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-19z9iu">
              <Icone nom="r-carte-paiement" taille={20} className="p-woejqv" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">{t('Remettre avec paiement')}</div>
              <div className="p-dfa05r">{t('Le paiement MoMo exige le réseau')}</div>
            </div>
            <span className="p-ekng8o">{t('Non')}</span>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-tc472u">
              <Icone nom="r-appareil-photo" taille={20} className="p-q7qjlz" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">{t('Photos, constats, dépôts, sorties')}</div>
              <div className="p-dfa05r">{t('Enregistrés et envoyés plus tard')}</div>
            </div>
            {oui}
          </div>
          <div className="p-92xvtp" />
          <Link to={chemin('aide', { sujet: 'mode-papier' })} className="p-o24hsm">
            <div className="p-9exjl6">
              <Icone nom="r-document" taille={20} className="p-lhsznn" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">{t('Panne générale annoncée')}</div>
              <div className="p-dfa05r">{t('Par SMS ou WhatsApp de diffusion : registre papier, colis sans montant seulement')}</div>
            </div>
            <span className="p-h4wlx0">{t('Papier')}</span>
          </Link>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">{t('En attente d’envoi')}</h2>
            <span className="p-h4wlx0">{String(attente.length)}</span>
          </div>
          {attente.length === 0 ? <p className="p-dfa05r">{t('Rien en attente : chaque opération est partie au serveur.')}</p> : attente.map(ligne)}
          <button type="button" className="p-v96i0s r4-cible-56" onClick={() => void reessayer()} disabled={envoi}>
            <Icone nom="r-reseau" taille={18} className="p-7dsggt" />
            {t('Réessayer l’envoi')}
          </button>
          <div className="r4-annonce-claire" aria-live="polite">
            {annonce}
          </div>
        </div>
        {expirees.length > 0 && (
          <div className="p-yi6rkz">
            <div className="p-unncbq">
              <h2 className="p-9j1bbu">{t('Expirées : à refaire')}</h2>
              <span className="p-ekng8o">{String(expirees.length)}</span>
            </div>
            {expirees.map((x, k) => (
              <div key={x.origine.cle}>
                {k > 0 && <div className="p-92xvtp" />}
                {ligne(x, 0)}
                <button type="button" className="r-btn r-second" onClick={() => void refaite(x)}>
                  {t('Je l’ai refaite')}
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="p-gh7puf">
          <Icone nom="r-horloge" taille={18} className="p-672m16" />
          <div>
            {regles
              ? tf('Les opérations gardent l’heure où elles ont été faites, pas l’heure d’envoi. Une opération en attente depuis plus de {h} h expire : il faut la refaire (le registre papier aussi se saisit sous {p} h). Ne désinstallez pas l’application tant que des opérations sont en attente.', { h: regles.expirationH, p: regles.papierSaisieH })
              : t('Les opérations gardent l’heure où elles ont été faites, pas l’heure d’envoi.')}
          </div>
        </div>
        {enLigne && (
          <Link to={chemin('accueil')} className="r-btn r-second">
            <Icone nom="r-grille" taille={20} />
            <span>{t('Voir la journée')}</span>
          </Link>
        )}
      </div>
    </Ecran>
  )
}
