// « Réception d'un lot » (PR-04 REC-01 à REC-13 ; DP-20, DP-62 ; ARL-01, ARL-11 ; PR-RC-04, PR-RC-08, PR-RC-12,
// PR-RC-16 ; v6 D15). Structure du prototype gardée : bandeau nuit bleue à trois étapes (Code, Contrôler, Valider),
// « Contrôlez chaque colis », carte « Le lot » (compteur, barre, colis à ranger), « Anomalies du lot », Retour · Valider
// le lot, puis « Lot reçu » et « Ce qui part maintenant » ; note d'anonymat (GEN-01). Contenu des règles :
// - Code : le livreur présente son QR (qui porte le code) ou dicte les 6 chiffres (DP-62) ; « Code incorrect · encore
//   n essais », au 3e faux saisie bloquée 24 h et BelivaY alerté ; « Lot déjà reçu le … à … » ; sans code : « Ne prenez
//   pas le lot », écrire au support ou demander un rappel (REC-01) ; hors connexion : lots déjà téléchargés seulement ;
// - Contrôler : scan de l'étiquette puis toucher si le scellé est intact (REC-10) ; « reçu avec réserve » (1 photo),
//   refus (2 photos, repart avec le livreur), absent, en trop (photo) ; « pas pour votre relais » (PR-RC-04) ; colis de
//   remplacement marqué (REC-13) ; emplacement proposé selon la taille (CAL-22) ; il manque n places (PR-RC-16, DP-20 :
//   la réception reste possible) ; « Valider le lot » actif seulement quand chaque colis a un résultat (REC-02) ;
// - Valider : photo du lot obligatoire (ARL-11), PIN du membre ; puis le livreur confirme sur son téléphone, après avoir
//   accepté chaque réserve ou refus (PR-RC-08) : la garde passe au relais à sa confirmation (REC-07) ; sans confirmation
//   sous PR-LOT-CONFIRM-MIN, le support est alerté ;
// - Lot reçu : heure de confirmation, clients prévenus (ARL-01 : avis puis code de chaque colis ; payable au comptoir :
//   code au paiement), stock et saturation (REC-09), colis à remettre au livreur.
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import type { ClasseColis } from '../../donnees/communs'
import type { Lot } from '../../donnees/domaines/reception'
import { geste, origine, useEnLigne } from '../../donnees/fileHorsLigne'
import { source } from '../../donnees/source'
import { useAttente, useLecture } from '../../donnees/useLecture'
import { echeance, heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useHorloge } from '../../session'
import { PaveCode } from '../../composants/comptoir/PaveCode'
import { ScanComptoir } from '../../composants/comptoir/ScanComptoir'
import { BandeauCapacite } from '../PR-05/Cas'
import { ControleContinu } from './ReceptionLot'
import './pr04.css'

type Ton = 'vert' | 'alerte' | 'ambre' | 'accent'
interface Message {
  ton: Ton
  texte: string
}
const CLASSES: Record<ClasseColis, string> = { S: 'petit', M: 'moyen', L: 'encombrant' }
type Panneau = null | 'sans_code'

export default function Reception() {
  const { t, tf, langue } = usePreferences()
  const [params, setParams] = useSearchParams()
  const naviguer = useNavigate()
  const enLigne = useEnLigne()
  const maintenant = useHorloge(5000)
  const lecture = useLecture(() => source.reception.lots(), [])
  const regles = useLecture(() => source.reception.regles(), []).donnees
  const lots = lecture.donnees

  const lotParam = params.get('lot')
  const ouvert = lots?.find((l) => l.ouvertA && !l.valideA) ?? null
  const attente = lots?.find((l) => l.valideA && !l.confirmeParLivreurA) ?? null
  const recu = lotParam ? (lots?.find((l) => l.lot === lotParam && l.confirmeParLivreurA) ?? null) : null
  const vue: 'code' | 'controle' | 'attente' | 'recu' = recu ? 'recu' : attente ? 'attente' : ouvert ? 'controle' : 'code'
  const lot = recu ?? attente ?? ouvert
  // Avec le serveur : la confirmation du livreur arrive par une relecture (son téléphone, pas cet onglet).
  useAttente(vue === 'attente', lecture.relire)

  const [message, setMessage] = useState<Message | null>(null)
  const dire = (ton: Ton, texte: string) => setMessage({ ton, texte })
  /** Accord du nombre : modèle au singulier pour 1, au pluriel sinon. */
  const tfn = (n: number, un: string, plus: string, v: Record<string, string | number> = {}) => tf(n === 1 ? un : plus, { n, ...v })

  // La confirmation du livreur arrive (temps réel) : l'écran passe à « Lot reçu ».
  const attendu = useRef<string | null>(null)
  useEffect(() => {
    if (attente) attendu.current = attente.lot
    else if (attendu.current && !lotParam) {
      const id = attendu.current
      attendu.current = null
      signal('succes')
      setParams({ lot: id }, { replace: true })
    }
  }, [attente, lotParam, setParams])

  // ── Retour de l'appareil photo commun (« reception?scan= ») : code de dépôt vérifié une fois. ──
  const traite = useRef<string>('')
  useEffect(() => {
    if (!lots || !regles) return
    const scan = params.get('scan')
    if (!scan || traite.current === scan) return
    traite.current = scan
    setParams({}, { replace: true })
    if (!ouvert && !attente) void verifierCode(scan)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, lots, regles])

  // ── Gestes ──
  const o = () => origine(maintenant)
  async function verifierCode(saisie: string) {
    const x = o()
    try {
      const { r } = await geste(enLigne, 'reception', 'code', x, (s) => s.reception.verifierCodeDepot(saisie, x), { local: true })
      if (r.ok) {
        signal('codeValide')
        dire('vert', t('Code de dépôt validé : contrôlez chaque colis.'))
      } else {
        signal('codeFaux')
        if (r.raison === 'code_faux')
          dire('alerte', enLigne ? tfn(r.essaisRestants ?? 0, 'Code incorrect · encore {n} essai', 'Code incorrect · encore {n} essais') : t('Code inconnu sur ce téléphone : réseau nécessaire pour ouvrir ce lot.'))
        else if (r.raison === 'bloque') dire('alerte', tf('Saisie bloquée jusqu’à {h} après {n} codes faux. BelivaY est alerté. Ne prenez pas le lot.', { h: heure(r.bloqueJusqua ?? maintenant, langue), n: regles?.codeEssais ?? '' }))
        else if (r.raison === 'deja_valide') dire('ambre', tf('Lot déjà reçu {quand}', { quand: r.deja ? echeance(r.deja, maintenant, langue) : '' }))
        else dire('alerte', t('Ce code n’ouvre aucun lot. Ne prenez pas le lot.'))
      }
    } catch {
      dire('alerte', t('Le code n’a pas pu être vérifié. Réessayez.'))
    }
  }
  // ── État de l'écran ──
  const [code, setCode] = useState('')
  const [panneau, setPanneau] = useState<Panneau>(null)


  if (lecture.erreur && !lots)
    return (
      <Ecran route="reception">
        <div className="r-vide" role="alert">
          <div className="r-vide-i r-rouge">
            <Icone nom="r-reseau" taille={28} />
          </div>
          <h2>{t('Les lots n’ont pas pu être chargés')}</h2>
          <p>{t('Vérifiez le réseau. Ne prenez aucun lot tant que son code de dépôt n’est pas vérifié.')}</p>
        </div>
        <button type="button" className="r-btn r-principal" onClick={lecture.relire}>
          <Icone nom="r-reseau" taille={20} />
          <span>{t('Réessayer')}</span>
        </button>
      </Ecran>
    )
  if (!lots || !regles)
    return (
      <Ecran route="reception">
        <div className="p-0hxmj8 r-pile" aria-busy="true">
          <div className="r4-chargement" role="status">
            {t('Chargement des lots du jour…')}
          </div>
        </div>
      </Ecran>
    )

  const etape = vue === 'code' ? 1 : vue === 'controle' ? 2 : 3
  const pastille = (n: number, texte: string) => (
    <div className="p-gxaql2">
      <span className={n <= etape ? 'p-l3xhlr' : 'p-lw9at8'} aria-hidden="true">
        {String(n)}
      </span>
      <span className="p-9vimvn">
        {t(texte)}
        {n === etape && <span className="r4-cache">{t(' · étape en cours')}</span>}
      </span>
    </div>
  )
  const etapes = (
    <div className="p-7yh7mn" role="list" aria-label={t('Étapes de la réception')}>
      {[
        [1, 'Code'],
        [2, 'Contrôler'],
        [3, 'Valider'],
      ].map(([n, x]) => (
        <div key={n} role="listitem" className="r4-etape">
          {pastille(n as number, x as string)}
        </div>
      ))}
    </div>
  )
  const anonymat = (
    <div className="p-gh7puf">
      <Icone nom="r-cadenas" taille={18} className="p-672m16" />
      <div>{t('Vous ne voyez jamais le vendeur ni le client : uniquement la référence BelivaY, la taille et l’emplacement.')}</div>
    </div>
  )
  const annonce = message && (
    <div className={'r4-message r-ton-' + message.ton} role={message.ton === 'alerte' ? 'alert' : 'status'}>
      <Icone nom={message.ton === 'vert' ? 'check' : 'r-alerte'} taille={18} />
      <span>{message.texte}</span>
    </div>
  )
  const bandeauLot = (l: Lot) => (
    <div className="p-g1lvka">
      <div className="p-0rhj24">
        <Icone nom="r-camion" taille={26} className="p-v08d0o" />
      </div>
      <div>
        <div className="p-6pd2ig">{t('CODE DE DÉPÔT VALIDÉ')}</div>
        <div className="p-ow9b3v">{tf('{lot} · {n} colis · {p} places', { lot: l.lot, n: l.colis, p: l.placesNecessaires })}</div>
        <div className="p-yz5dyd">
          {l.aReprendre > 0 ? tf('{entreprise} · {livreur}, livreur certifié · repart avec {n} colis', { entreprise: l.entreprise, livreur: l.livreur, n: l.aReprendre }) : tf('{entreprise} · {livreur}, livreur certifié', { entreprise: l.entreprise, livreur: l.livreur })}
        </div>
      </div>
    </div>
  )
  const manque = (l: Lot) => l.placesManquantes

  // ═══════════════════════ 1 · Code ═══════════════════════
  if (vue === 'code') {
    const bloque = lots.find((l) => l.code.bloqueJusqua)?.code.bloqueJusqua ?? null
    const aVenir = lots.filter((l) => !l.valideA)
    const rappel = async () => {
      const x = o()
      try {
        const r = await source.messages.demanderRappel(t('Livreur sans code de dépôt au comptoir'), x)
        if (r.ok) dire('vert', tf('Rappel demandé : le support vous appelle avant {h}. Gardez le livreur sur place.', { h: heure(r.rappelAvant, langue) }))
        else dire('ambre', r.raison === 'deja_demande' ? t('Un rappel est déjà demandé : le support vous appelle.') : t('Le support est fermé : écrivez-lui, il répond à l’ouverture.'))
      } catch {
        dire('alerte', t('Réseau nécessaire pour demander un rappel.'))
      }
    }
    return (
      <Ecran route="reception">
        <div className="p-0hxmj8 r-pile">
          <div className="p-pkdjgs">
            <div className="p-7w9kja">
              {etapes}
              <div className="p-g1lvka">
                <div className="p-5oo8u7 r4-cle">
                  <Icone nom="r-cle" taille={44} trait={1.6} className="p-v08d0o" />
                </div>
                <div className="p-lmo74g">
                  <h1 className="p-bbwgsw">{t('Scannez ou saisissez le code de dépôt')}</h1>
                  <div className="p-avwyd0">{tf('{n} chiffres donnés par le livreur. Pas de code, pas de lot.', { n: regles.codeLongueur })}</div>
                  {bloque && (
                    <div className="r4-bloque" role="alert">
                      {tf('Saisie bloquée jusqu’à {h} après {n} codes faux. BelivaY est alerté. Ne prenez pas le lot.', { h: heure(bloque, langue), n: regles.codeEssais })}
                    </div>
                  )}
                  <button type="button" className="p-tbdu5s r4-lien-bouton" aria-expanded={panneau === 'sans_code'} onClick={() => setPanneau(panneau === 'sans_code' ? null : 'sans_code')}>
                    {t('Le livreur n’a pas de code ?')}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <BandeauCapacite />
          {!bloque && (
            <div className="cpt-fiche">
              <ScanComptoir
                consigne={t('Visez le QR du livreur')}
                lu={(v) => void verifierCode(v)}
                libelleSaisie={t('Saisir le code de dépôt')}
                pave={<PaveCode longueur={regles.codeLongueur} valeur={code} changer={setCode} complet={(v) => void verifierCode(v).then(() => setCode(''))} libelle={tf('Code de dépôt à {n} chiffres', { n: regles.codeLongueur })} />}
              />
            </div>
          )}
          {annonce}
          {panneau === 'sans_code' && (
            <div className="r-carte r4-panneau" role="region" aria-label={t('Le livreur n’a pas de code')}>
              <div className="r4-titre-alerte">
                <Icone nom="r-alerte" taille={20} />
                <h2>{t('Ne prenez pas le lot')}</h2>
              </div>
              <p className="p-dfa05r">{t('Sans code de dépôt valide, rien n’est reçu. BelivaY vérifie la mission et donne le feu vert, ou fait repartir le livreur.')}</p>
              <button type="button" className="r-btn r-principal" onClick={() => void rappel()}>
                <Icone nom="r-cloche" taille={20} />
                <span>{t('Demander un rappel du support')}</span>
              </button>
              <Link className="r-btn r-second" to={chemin('messagerie', { sujet: 'depot-sans-code' })}>
                <Icone nom="r-document" taille={20} />
                <span>{t('Écrire au support')}</span>
              </Link>
            </div>
          )}
          {!enLigne && (
            <div className="r4-note" data-hors-ligne="">
              <Icone nom="r-reseau" taille={18} />
              <span>{t('Hors connexion : seuls les lots déjà téléchargés s’ouvrent, code vérifié sur la liste du lot. La réception part au retour du réseau.')}</span>
            </div>
          )}
          <div className="p-yi6rkz">
            <div className="p-unncbq">
              <h2 className="p-9j1bbu">{t('Lots attendus aujourd’hui')}</h2>
              {aVenir.length > 0 && <span className="p-rpzy79">{String(aVenir.length)}</span>}
            </div>
            {aVenir.length === 0 && <p className="p-dfa05r">{t('Aucun autre lot annoncé aujourd’hui. Dès qu’une entreprise de livraison choisit votre relais, le lot paraît ici avec son heure.')}</p>}
            {aVenir.map((l, k) => (
              <div key={l.lot}>
                {k > 0 && <div className="p-92xvtp" />}
                <div className="p-o24hsm">
                  <div className={manque(l) > 0 ? 'p-9exjl6' : 'p-toppw8'}>
                    <Icone nom="r-camion" taille={20} className={manque(l) > 0 ? 'p-lhsznn' : 'p-672m16'} />
                  </div>
                  <div className="p-rnqj8n">
                    <div className="p-ife3a2">{tf('{n} colis · {p} places · {quand}', { n: l.colis, p: l.placesNecessaires, quand: l.arriveeEstimee ? tf('vers {h}', { h: heure(l.arriveeEstimee, langue) }) : t('heure à venir') })}</div>
                    <div className="p-dfa05r">
                      <span className="r-ref">{l.lot}</span> · {l.entreprise} · {t(SUIVI[l.suivi])}
                    </div>
                    {manque(l) > 0 && <div className="r4-manque">{tfn(manque(l), 'Il manque {n} place : préparez les départs d’abord', 'Il manque {n} places : préparez les départs d’abord')}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {anonymat}
        </div>
      </Ecran>
    )
  }

  // ═══════════════════════ 3 bis · En attente du livreur ═══════════════════════
  if (vue === 'attente' && lot) {
    const aAccepter = lot.colisDuLot.filter((c) => c.arrivee.resultat === 'reserve' || c.arrivee.resultat === 'refus' || c.arrivee.resultat === 'en_trop')
    const ranges = lot.colisDuLot.filter((c) => c.emplacement !== null || c.etat === 'en_stock')
    return (
      <Ecran route="reception">
        <div className="p-0hxmj8 r-pile">
          <div className="p-pkdjgs">
            <div className="p-7w9kja">
              {etapes}
              {bandeauLot(lot)}
            </div>
          </div>
          <div className="p-c1r1yj" role="status" aria-live="polite">
            <div className="p-vhxw8h r4-attente">
              <Icone nom="r-horloge" taille={30} className="p-672m16" />
            </div>
            <h1 className="p-fdt7cn">{t('Le livreur confirme le lot')}</h1>
            <div className="p-uzhe04">
              {tf('Lot validé à {h}, photo du lot jointe. La garde passe à votre relais quand {livreur} confirme sur son téléphone.', { h: heure(lot.valideA!, langue), livreur: lot.livreur })}
              {aAccepter.length > 0 && ' ' + tf('Il accepte d’abord vos réserves et refus ({refs}).', { refs: aAccepter.map((c) => c.id).join(', ') })}
            </div>
            {lot.supportAlerte && (
              <div className="r4-bloque" role="alert">
                {tf('Pas de confirmation depuis {n} min : le support BelivaY est alerté. Gardez les colis à part.', { n: regles.confirmationMin })}
              </div>
            )}
          </div>
          {annonce}
          <div className="p-yi6rkz">
            <div className="p-unncbq">
              <h2 className="p-9j1bbu">{t('Rangez les colis')}</h2>
            </div>
            {ranges.map((c, k) => (
              <div key={c.id}>
                {k > 0 && <div className="p-92xvtp" />}
                <div className="p-5hwx6v r4-ligne-fixe">
                  <div className="p-cdtpeg">
                    <Icone nom="check" taille={20} trait={2.4} className="p-q7qjlz" />
                  </div>
                  <div>
                    <div className="p-hz5rr5">{c.id}</div>
                    <div className="p-t1lapd">{t(CLASSES[c.classe])}</div>
                  </div>
                  <Emplacement code={c.emplacement} />
                </div>
              </div>
            ))}
          </div>
          <Link className="r-btn r-second" to={chemin('messagerie', { sujet: lot.lot })}>
            <Icone nom="r-document" taille={20} />
            <span>{t('Écrire au support')}</span>
          </Link>
          {anonymat}
        </div>
      </Ecran>
    )
  }

  // ═══════════════════════ Lot reçu ═══════════════════════
  if (vue === 'recu' && lot) {
    const recus = lot.colisDuLot.filter((c) => c.arrivee.resultat !== 'refus' && c.arrivee.resultat !== 'absent')
    const refuses = lot.colisDuLot.filter((c) => c.arrivee.resultat === 'refus')
    const p = lot.prevenus
    const lignes = [
      p && p.avisEtCode > 0 ? tfn(p.avisEtCode, '{n} client : avis d’arrivée puis code de chaque colis, en deux messages', '{n} clients : avis d’arrivée puis code de chaque colis, en deux messages') : null,
      p && p.incomplets > 0 ? tfn(p.incomplets, '{n} client attend encore un colis : code envoyé, la garde ne commence qu’à l’arrivée du dernier', '{n} clients attendent encore un colis : code envoyé, la garde ne commence qu’à l’arrivée du dernier') : null,
      p && p.auPaiement > 0 ? tfn(p.auPaiement, '{n} commande à payer au comptoir : avis d’arrivée ; le code part au paiement Mobile Money', '{n} commandes à payer au comptoir : avis d’arrivée ; le code part au paiement Mobile Money') : null,
      p && p.groupage > 0 ? tfn(p.groupage, '{n} groupage : aucun code avant la libération du groupe', '{n} groupages : aucun code avant la libération du groupe') : null,
      p && p.nonDelivres > 0 ? tfn(p.nonDelivres, '{n} client pas encore joint : rien n’est facturé avant ; BelivaY relance par SMS', '{n} clients pas encore joints : rien n’est facturé avant ; BelivaY relance par SMS') : null,
    ].filter(Boolean)
    const occ = lot.occupation
    return (
      <Ecran route="reception">
        <div className="p-0hxmj8 r-pile">
          <div className="p-pkdjgs">
            <div className="p-7w9kja">
              {etapes}
              {bandeauLot(lot)}
            </div>
          </div>
          <div className="p-c1r1yj" role="status">
            <div className="p-vhxw8h">
              <Icone nom="check" taille={32} trait={2.6} className="p-q7qjlz" />
            </div>
            <h1 className="p-fdt7cn">{tf('Lot reçu · {n} colis', { n: recus.length })}</h1>
            <div className="p-uzhe04">{tf('Le livreur a confirmé sur son téléphone à {h}. La garde est sous votre responsabilité, horodatée.', { h: heure(lot.confirmeParLivreurA!, langue) })}</div>
          </div>
          <div className="p-yi6rkz">
            <div className="p-unncbq">
              <h2 className="p-9j1bbu">{t('Ce qui part maintenant')}</h2>
            </div>
            <div className="p-o24hsm">
              <div className="p-toppw8">
                <Icone nom="r-cloche" taille={20} className="p-672m16" />
              </div>
              <div className="p-rnqj8n">
                <div className="p-ife3a2">{t('Clients prévenus')}</div>
                <div className="p-dfa05r">{lignes.length ? lignes.join(' · ') : t('Les clients sont prévenus par BelivaY, sans code ni montant dans la notification.')}</div>
              </div>
            </div>
            <div className="p-92xvtp" />
            <Link to={chemin('stock')} className="p-o24hsm">
              <div className={occ.seuilAtteint ? 'p-9exjl6' : 'p-toppw8'}>
                <Icone nom="r-pile" taille={20} className={occ.seuilAtteint ? 'p-lhsznn' : 'p-672m16'} />
              </div>
              <div className="p-rnqj8n">
                <div className="p-ife3a2">{t('Stock mis à jour')}</div>
                <div className="p-dfa05r">
                  {tf('{n} / {total} places', { n: occ.occupees, total: occ.declarees })}
                  {occ.apresCollecte !== null && ' · ' + tf('{n} après la collecte', { n: occ.apresCollecte })}
                  {'. '}
                  {occ.seuilAtteint ? tf('Seuil de {s} % atteint : BelivaY suspend les nouveaux envois vers votre relais', { s: regles.saturationPct }) : tf('Au-dessus de {s} %, BelivaY suspend les nouveaux envois', { s: regles.saturationPct })}
                </div>
              </div>
              <Icone nom="r-chevron-droite" taille={18} className="p-2bmvtm" />
            </Link>
            {refuses.length > 0 && (
              <>
                <div className="p-92xvtp" />
                <div className="p-o24hsm">
                  <div className="p-19z9iu">
                    <Icone nom="r-fermer" taille={20} className="p-woejqv" />
                  </div>
                  <div className="p-rnqj8n">
                    <div className="p-ife3a2">{tfn(refuses.length, '{n} colis refusé', '{n} colis refusés')}</div>
                    <div className="p-dfa05r">{tf('{refs} : repartent avec le livreur, le relais n’en est pas responsable', { refs: refuses.map((c) => c.id).join(', ') })}</div>
                  </div>
                </div>
              </>
            )}
            {lot.aReprendre > 0 && (
              <>
                <div className="p-92xvtp" />
                <Link to={chemin('departs')} className="p-o24hsm">
                  <div className="p-toppw8">
                    <Icone nom="r-camion" taille={20} className="p-672m16" />
                  </div>
                  <div className="p-rnqj8n">
                    <div className="p-ife3a2">{t('Remettez au livreur')}</div>
                    <div className="p-dfa05r">{tf('{n} colis sortants avant qu’il reparte', { n: lot.aReprendre })}</div>
                  </div>
                  <Icone nom="r-chevron-droite" taille={18} className="p-2bmvtm" />
                </Link>
              </>
            )}
          </div>
          <button type="button" className="p-v96i0s r4-cible-56" onClick={() => naviguer(chemin('reception'))}>
            <Icone nom="r-qr" taille={18} className="p-7dsggt" />
            {t('Nouvelle réception')}
          </button>
          {anonymat}
        </div>
      </Ecran>
    )
  }

  // ═══════════════════════ 2 · Scanner en continu, 3 · Terminer ═══════════════════════
  const l = ouvert!
  return (
    <Ecran route="reception">
      <div className="p-0hxmj8 cpt-feuille">
        <div className="p-pkdjgs">
          <div className="p-7w9kja">
            {etapes}
            {bandeauLot(l)}
            {manque(l) > 0 && <div className="r4-manque-nuit">{tfn(manque(l), 'Il manque {n} place : préparez les départs d’abord. Vous recevez quand même le lot.', 'Il manque {n} places : préparez les départs d’abord. Vous recevez quand même le lot.')}</div>}
          </div>
        </div>
        <BandeauCapacite />
        {annonce}
        <ControleContinu
          l={l}
          regles={regles}
          enLigne={enLigne}
          maintenant={maintenant}
          relire={lecture.relire}
          valide={(lot, enFile) => {
            attendu.current = lot
            setParams({}, { replace: true })
            dire(enFile ? 'ambre' : 'vert', enFile ? t('Lot validé sur le téléphone : il part au retour du réseau, avec l’heure de la validation.') : t('Lot validé : le livreur confirme sur son téléphone.'))
          }}
        />
        {anonymat}
      </div>
    </Ecran>
  )
}

const SUIVI: Record<Lot['suivi'], string> = {
  prevu: 'prévu',
  en_route: 'livreur en route',
  en_approche: 'livreur en approche',
  arrive: 'livreur arrivé',
  depose: 'déposé',
  non_depose: 'dépôt impossible',
}

function Emplacement({ code }: { code: string | null }) {
  const { t } = usePreferences()
  return (
    <div className="p-06slq2">
      <div className="p-nyatr2">{t(code ? 'RANGER EN' : 'RANGER')}</div>
      <div className="p-a94ugb">{code ?? t('au comptoir')}</div>
    </div>
  )
}
