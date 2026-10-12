// Commande à préparer (VD-05) : reprise du prototype (balisage de route('commande') : pastilles d'état, carte clé de
// nuit — échéance, temps restant en grand, barre réelle, article, « Mettez de côté », « C'est prêt » —, « Vous gardez »,
// ramassage chez vous, « Autres actions », anonymat), branchée sur la source (commandes.detail).
// - Règles : PRE-01…06, VD05-R09, VD05-R10, DEL-01, CMD-03…06, REM-03, REFVD-R134, REFCL-R043 ; temps restant et barre
//   en heures d'ouverture de la boutique ; « Plus de temps » disparaît après une prolongation ; un seul bouton plein.
// - Accès Préparation : ni « Vous gardez », ni prix, ni moyen de paiement ; les gestes de préparation restent.
// - Ajouts : préparation article par article (quatre cases partagées avec le bon, qui a coché quoi), scan de la
//   référence de la boîte, message du client de la commande (anonyme) vers la conversation, état de toute commande
//   (prête, chez le livreur, livrée, litige, retour, annulée) avec ses suites (remise, reçu, litige, retour), « Délai
//   dépassé » et « Dépassement dans … », reprise du décompte boutique fermée, hors connexion (« C'est prêt » en file),
//   avis après un geste, minuteur qui défile comme chez le client et son de fin.
// - États du prototype : ?ref=BLV-00008 (payée), ?ref=BLV-00009 (payable au retrait), ?role=prep.
import { useState, type MouseEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { mouvementLibre } from '@client/composants/Animations'
import { F } from '@client/i18n/format'
import { Ecran } from '../../composants/coque'
import { Vignette } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import type { Commande as TCommande } from '../../donnees/domaines/commandes'
import { heuresOuvertes } from '../../donnees/domaines/preparation'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { entre, heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useDroit, useHorloge, useMontantsVisibles, useRole, useSession } from '../../session'
import { jourDe } from '../../calculs/temps'
import { Avis, Bouton, Duree, EtatLecture, HorsLigne, hhmm, jourCourtNum, jourMois, mettreEnFile, progression, quand, reprise, restantOuvert, urgence, useAvisRecu, useEnLigne, useLien } from './commun'
import { Verifications } from './Verifications'

const MOYENS: Record<TCommande['moyenPaiement'], { icone: string; texte: string }> = {
  momo: { icone: 'smartphone', texte: 'Mobile Money' },
  carte: { icone: 'credit-card', texte: 'Carte bancaire' },
  apple: { icone: 'apple', texte: 'Apple Pay' },
  google: { icone: 'gpay-g', texte: 'Google Pay' },
  wallet: { icone: 'wallet', texte: 'Portefeuille BelivaY' },
  usd: { icone: 'credit-card', texte: 'Carte en dollars' },
  eur: { icone: 'credit-card', texte: 'Carte en euros' },
  comptoir: { icone: 'store', texte: 'Au comptoir du relais' },
}

const PASTILLES: Record<TCommande['statut'], { ton: string; texte: string }> = {
  payee: { ton: 'green', texte: 'Payée' },
  payable_au_retrait: { ton: 'or', texte: 'À préparer' },
  a_preparer: { ton: 'or', texte: 'À préparer' },
  prete: { ton: 'or', texte: 'Prête' },
  chez_le_livreur: { ton: 'ink', texte: 'Chez le livreur' },
  livree: { ton: 'green', texte: 'Livrée' },
  litige_gele: { ton: 'red', texte: 'Litige — gelé' },
  retour_gele: { ton: 'red', texte: 'En retour — gelé' },
  annulee: { ton: 'ink', texte: 'Annulée' },
}

const MOTIFS: Record<NonNullable<TCommande['annulation']>['motif'], string> = {
  rupture: 'Rupture signalée : un autre vendeur reprend la commande, sinon le client est remboursé aujourd’hui.',
  client_avant_ramassage: 'Annulée par le client avant le ramassage. Le stock vous est rendu, sans effet sur votre score.',
  litige_perdu: 'Litige perdu : le client a été remboursé.',
  belivay: 'Annulée par BelivaY. Le motif vous a été envoyé par notification.',
}

/** « Aujourd'hui entre 14 h et 16 h », « Demain entre … », « mar. 22, entre … ». */
function quandRamassage(r: { debut: number; fin: number }, maintenant: number, langue: 'fr' | 'en', tf: (s: string, p: Record<string, string | number>) => string) {
  const e = entre([hhmm(r.debut), hhmm(r.fin)], langue)
  if (jourDe(r.debut) === jourDe(maintenant)) return tf('Aujourd’hui {entre}', { entre: e })
  if (jourDe(r.debut) === jourDe(maintenant + 24 * 3600 * 1000)) return tf('Demain {entre}', { entre: e })
  return tf('{jour}, {entre}', { jour: jourCourtNum(r.debut, langue), entre: e })
}

function CarteCle({ c, maintenant, enLigne, file }: { c: TCommande; maintenant: number; enLigne: boolean; file: boolean }) {
  const { t, tf, langue } = usePreferences()
  const naviguer = useNavigate()
  const lien = useLien()
  const [vert, setVert] = useState(false)
  const [garde, setGarde] = useState(file)
  const peutPreparer = useDroit('commandes.preparer') // droits de l'accès employé (src/donnees/droits.ts)
  const l = c.lignes[0]
  const reste = restantOuvert(c, maintenant)
  const u = urgence(reste, c.echeance, maintenant)
  const relance = reprise(c.calendrier, maintenant)
  const duree = Math.round(heuresOuvertes(c.debut, c.echeance!, c.calendrier) / 60000)
  const heures = `${Math.floor(duree / 60)}${duree % 60 ? ' h ' + String(duree % 60).padStart(2, '0') : ' h'}`
  const pret = async (e: MouseEvent) => {
    e.preventDefault()
    if (!enLigne) {
      mettreEnFile(c.ref)
      setGarde(true)
      jouer('interrupteur')
      return
    }
    const r = await source.preparation.cestPret(c.ref)
    if (!r.ok) return jouer('erreur')
    setVert(true)
    jouer('retrait')
    const aller = () => naviguer(lien('commande_prete', { ref: c.ref }))
    if (mouvementLibre()) setTimeout(aller, 450)
    else aller()
  }
  const aujourdhui = jourDe(c.echeance!) === jourDe(maintenant)
  return (
    <div className="hero night">
      <div className="hk">
        {aujourdhui ? t('Prête aujourd’hui avant ') : tf('Prête {jour} avant ', { jour: jourDe(c.echeance!) === jourDe(maintenant + 86400000) ? t('demain') : jourCourtNum(c.echeance!, langue) })}
        <span className="nu">{t(heure(c.echeance!, langue))}</span>
      </div>
      <div className="big" role="timer" aria-live="off">
        {u === 'depassee' ? t('Dépassé') : <Duree ms={reste} />}
        <small>{u === 'depassee' ? '' : t('restantes')}</small>
      </div>
      <div className="bar mt10">
        <i style={{ width: `${Math.round(progression(c, maintenant))}%`, ...(u !== 'normale' ? { background: 'var(--red)' } : {}) }}></i>
      </div>
      <div className="t12 mt6" style={{ color: 'rgba(255,255,255,.72)' }}>
        {tf(c.payableAuRetrait ? 'Validée à {h} · {d} ouvrées ({etat})' : 'Payée à {h} · {d} ouvrées ({etat})', {
          h: heure(c.payeeA, langue),
          d: heures,
          etat: c.debut > c.payeeA ? tf('départ à l’ouverture, {h}', { h: heure(c.debut, langue) }) : c.prolongee ? t('prolongée une fois') : t('boutique ouverte'),
        })}
      </div>
      {u === 'imminente' && (
        <div className="hs" style={{ marginTop: '10px', color: '#fff' }} role="alert">
          <b>{tf('Dépassement dans {d}.', { d: `${Math.ceil(reste / 60000)} min` })}</b>
          {t(' Finissez maintenant, ou demandez plus de temps : se taire coûte plus cher.')}
        </div>
      )}
      {relance && u !== 'depassee' && (
        <div className="t12 mt6" style={{ color: 'var(--gold-l)' }}>
          {tf('Boutique fermée : le décompte reprend {quand}.', { quand: quand(relance, maintenant, langue) })}
        </div>
      )}
      <div className="hline"></div>
      <div className="art" style={{ marginTop: '0' }}>
        <Vignette nom={l.article.dessin} taille={64} />
        <div className="grow">
          <div className="b8" style={{ fontSize: '21px', letterSpacing: '-.01em', lineHeight: '1.15' }}>
            {l.article.titre}
          </div>
          <div className="b8 mt4" style={{ fontSize: '18px', letterSpacing: '.05em', color: 'var(--gold-l)' }}>
            {t(l.article.variante).toUpperCase()}
          </div>
          <div className="t13 mt4" style={{ color: 'rgba(255,255,255,.78)' }}>
            {tf('{etat} · ×{q} · colis {c} · réf. {ref}', { etat: t(l.article.etat), q: l.quantite, c: c.colis, ref: l.reference })}
          </div>
        </div>
      </div>
      <div className="hs" style={{ marginTop: '12px' }}>
        {t('Mettez de côté : ')}
        <b>{l.aMettreDeCote.map((x) => t(x)).join(', ')}</b>
      </div>
      <div className="mt14">
        {!peutPreparer ? (
          <div className="hs" role="status" style={{ color: '#fff' }}>
            <Icone nom="lock" taille={16} style={{ verticalAlign: '-3px' }} /> {t('Réservé : votre accès ne comprend pas la préparation.')}
          </div>
        ) : garde ? (
          <div className="hs" role="status" style={{ color: '#fff' }}>
            <Icone nom="cloud-off" taille={16} style={{ verticalAlign: '-3px' }} /> {t('« C’est prêt » gardé : il part dès le retour du réseau, avec son heure.')}
          </div>
        ) : (
          <Bouton classe={'primary' + (vert ? ' vd-okb' : '')} icone="package-check" vers={lien('commande_prete', { ref: c.ref })} onClick={(e) => void pret(e)}>
            {t('C’est prêt')}
          </Bouton>
        )}
      </div>
    </div>
  )
}

/** Commande qui n'est plus à préparer : son état et sa suite (remise, reçu, litige, retour). */
function EtatSuite({ c, maintenant }: { c: TCommande; maintenant: number }) {
  const { t, tf, langue } = usePreferences()
  const lien = useLien()
  const montants = useMontantsVisibles()
  const l = c.lignes[0]
  const p = c.probleme
  const suite =
    c.statut === 'prete'
      ? { icone: 'package-check', titre: tf('Prête depuis {h}', { h: c.preteA ? quand(c.preteA, maintenant, langue) : '' }), texte: c.ramassage ? tf('Le livreur passe {quand}. Donnez-lui le code seulement après avoir vérifié sa photo.', { quand: quandRamassage(c.ramassage, maintenant, langue, tf).replace(/^./, (x) => x.toLowerCase()) }) : t('Le livreur arrive.'), bouton: { texte: 'Remettre au livreur', icone: 'qr-code', vers: lien('commande_prete', { ref: c.ref }) } }
      : c.statut === 'chez_le_livreur'
        ? { icone: 'truck', titre: tf('Remise au livreur {h}', { h: c.remiseA ? quand(c.remiseA, maintenant, langue) : '' }), texte: t('La responsabilité est transférée. La commande reste « En cours » jusqu’au retrait par le client.'), bouton: null }
        : c.statut === 'livree'
          ? { icone: 'circle-check', titre: c.retireeA ? tf('Livrée le {d}', { d: jourMois(c.retireeA, langue) }) : t('Livrée'), texte: t(c.confirmeeParLeClient ? 'Confirmée par le client.' : 'Fenêtre de retour close.'), bouton: montants ? { texte: 'Voir le reçu', icone: 'receipt', vers: lien('recu', { ref: c.ref }) } : null }
          : p?.type === 'litige'
            ? { icone: 'scale', titre: tf('Litige : « {motif} »', { motif: t(p.motif) }), texte: tf('Répondez avant {quand}. Sans réponse, la décision est prise en faveur du client.', { quand: quand(p.echeance, maintenant, langue) }), bouton: { texte: p.repondu ? 'Voir le litige' : 'Répondre au litige', icone: 'scale', vers: lien('litige', { ref: c.ref }) } }
            : p?.type === 'retour'
              ? { icone: 'undo-2', titre: tf('En retour : {motif}', { motif: t(p.motif) }), texte: tf(p.arrivee.jour < jourDe(maintenant) ? 'Arrivé {jour} {entre}. Vous avez {n} h pour l’inspecter.' : 'Arrive {jour} {entre}. Vous aurez {n} h pour l’inspecter.', { jour: jourCourtNum(p.arrivee.jour, langue), entre: entre(p.arrivee.creneau, langue), n: p.inspectionHeures }), bouton: { texte: 'Voir le retour', icone: 'undo-2', vers: lien('retours') } }
              : { icone: 'circle-x', titre: t('Annulée'), texte: t(MOTIFS[c.annulation?.motif ?? 'rupture']), bouton: null }
  return (
    <div className={'card' + (p ? '' : '')} style={p ? { border: '1.5px solid var(--red-line)' } : undefined}>
      <div className="art" style={{ marginTop: '0' }}>
        <Vignette nom={l.article.dessin} taille={56} />
        <div className="grow">
          <div className="an">{`${l.article.titre} · ${t(l.article.variante)}`}</div>
          <div className="av">{tf('{etat} · ×{q} · colis {c} · réf. {ref}', { etat: t(l.article.etat), q: l.quantite, c: c.colis, ref: l.reference })}</div>
        </div>
      </div>
      <div className="hr"></div>
      <div className="row" style={{ alignItems: 'flex-start', gap: '10px' }}>
        <Icone nom={suite.icone} taille={20} style={{ color: p ? 'var(--red)' : 'var(--or-txt)', flexShrink: '0', marginTop: '1px' }} />
        <div className="grow">
          <div className="b8 t15">{suite.titre}</div>
          <div className="t13 c3 mt4" style={{ lineHeight: '1.45' }}>
            {suite.texte}
          </div>
        </div>
      </div>
      {suite.bouton && (
        <div className="mt12">
          <Bouton classe={p && !('repondu' in p && p.repondu) && p.type === 'litige' ? 'danger' : 'secondary'} icone={suite.bouton.icone} vers={suite.bouton.vers}>
            {t(suite.bouton.texte)}
          </Bouton>
        </div>
      )}
    </div>
  )
}

function Ligne({ vers, icone, titre, sous }: { vers: string; icone: string; titre: string; sous: string }) {
  return (
    <Link to={vers} className="li">
      <span className="ic ">
        <Icone nom={icone} taille={20} />
      </span>
      <span className="grow">
        <span className="lt" style={{ display: 'block' }}>
          {titre}
        </span>
        <span className="ls" style={{ display: 'block' }}>
          {sous}
        </span>
      </span>
      <span className="chev">
        <Icone nom="chevron-right" taille={18} />
      </span>
    </Link>
  )
}

export default function Commande() {
  const { tf } = usePreferences()
  const role = useRole()
  const [params] = useSearchParams()
  const ref = params.get('ref') ?? 'BLV-00008'
  // { c } : une commande inconnue (null) se distingue d'une lecture en cours.
  const lecture = useLecture(() => source.commandes.detail(ref).then((c) => ({ c })), [ref, role])
  const titre = tf('Commande {ref}', { ref })
  const c = lecture.donnees?.c
  if (!c) return <EtatLecture route="commande" titre={titre} erreur={lecture.erreur} vide={lecture.donnees !== null} relire={lecture.relire} />
  return <Detail c={c} titre={titre} />
}

function Detail({ c, titre }: { c: TCommande; titre: string }) {
    const { t, tf, langue } = usePreferences()
    const s = useSession()
    const role = useRole()
    const montants = useMontantsVisibles()
    const maintenant = useHorloge(5000)
    const lien = useLien()
    const peutPreparer = useDroit('commandes.preparer')
    const bonLu = useLecture(() => source.preparation.bon(c.ref), [c.ref, role])
    const fils = useLecture(() => source.messages.fils(), [])
    const { enLigne, file } = useEnLigne()
    const [avis, fermerAvis] = useAvisRecu()
    const l = c.lignes[0]
    const aPreparer = c.echeance !== null
    const b = bonLu.donnees // relu après chaque coche (la source prévient les écrans)
    const fil = fils.donnees?.find((f) => f.ref === c.ref) ?? null
    const pastille = PASTILLES[c.statut]
    const moyen = MOYENS[c.moyenPaiement]
    return (
      <Ecran route="commande" titre={titre} retour={lien('commandes', aPreparer ? {} : { f: c.probleme ? 'pb' : c.statut === 'prete' || c.statut === 'chez_le_livreur' ? 'cours' : 'fin' })}>
        <div className="meta" style={{ marginTop: '14px' }}>
          <span className={'pill ' + pastille.ton}>
            {aPreparer ? <i className="d"></i> : null}
            {t(pastille.texte)}
          </span>
          {c.payableAuRetrait ? (
            <span className="pill amber">
              <Icone nom="hand-coins" taille={13} />
              {t('Payable au retrait')}
            </span>
          ) : (
            <span className="pill green">
              <Icone nom="circle-check" taille={13} />
              {t('Payée')}
            </span>
          )}
        </div>
        {!enLigne && <HorsLigne lueA={maintenant} enFile={file.length} />}
        {avis && <Avis avis={avis} fermer={fermerAvis} />}
        {aPreparer ? <CarteCle c={c} maintenant={maintenant} enLigne={enLigne} file={file.some((x) => x.ref === c.ref)} /> : <EtatSuite c={c} maintenant={maintenant} />}
        {aPreparer && b && (
          <div className="card">
            <Verifications bon={b} />
          </div>
        )}
        {montants && c.garde !== null && c.statut !== 'annulee' && (
          <div className="card">
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <div className="grow">
                <div className="t15 b8">{t(c.payableAuRetrait ? 'Vous garderez' : 'Vous gardez')}</div>
                <div className="t13 c3 mt4" style={{ lineHeight: '1.45' }}>
                  {t(c.payableAuRetrait ? 'Rien n’est encaissé : le client paie au retrait. Un refus ou un non-retrait ne vous coûte rien.' : 'Versés sans frais le vendredi qui suit la libération')}
                </div>
              </div>
              <div className="b8 nw" style={{ fontSize: '24px', letterSpacing: '-.02em', color: c.payableAuRetrait ? 'var(--amber)' : 'var(--green)' }}>
                {t(`${F(c.garde)} F`)}
              </div>
            </div>
            {c.commissionMinimale ? (
              <div className="t12 c3 mt4" style={{ lineHeight: '1.45' }} data-commission-minimale={c.commissionMinimale}>
                {tf('Commission minimale de {m} F par commande appliquée : à prix égal, une commande de plusieurs articles vous laisse plus par article.', { m: F(c.commissionMinimale) })}
              </div>
            ) : null}
            {!c.payableAuRetrait && (
              <>
                <div className="hr"></div>
                <div className="kv">
                  <span className="k">{t('Payé par le client')}</span>
                  <span className="v ">
                    <span className="vx-pay">
                      <Icone nom={moyen.icone} taille={15} />
                      {t(moyen.texte)}
                    </span>
                  </span>
                </div>
              </>
            )}
            <div className="hr"></div>
            <div>
              <div className="kv">
                <span className="k">{t('Prix de vente')}</span>
                <span className="v ">{t(`${F((l.prixUnitaire ?? 0) * l.quantite)} F`)}</span>
              </div>
            </div>
          </div>
        )}
        {c.livreur && c.ramassage && (
          <div className="card">
            <div className="kick">{t('Ramassage chez vous')}</div>
            <div className="row mt10">
              <span style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', flexShrink: '0', boxShadow: '0 0 0 2px var(--or-line)' }}>
                <Vignette nom={c.livreur.photo} taille={48} alt={c.livreur.nom} />
              </span>
              <div className="grow">
                <div className="b8 t15">{`${c.livreur.nom} · ${c.livreur.societe}`}</div>
                <div className="t13 c3 mt4">{quandRamassage(c.ramassage, maintenant, langue, tf)}</div>
              </div>
            </div>
            <div className="hr"></div>
            <div className="row" style={{ alignItems: 'flex-start', gap: '10px' }}>
              <Icone nom="package-open" taille={20} style={{ color: 'var(--or-txt)', flexShrink: '0', marginTop: '1px' }} />
              <div className="grow">
                <div className="b8 t14">{t('Vous ne faites pas le colis')}</div>
                <div className="t13 c3 mt4" style={{ lineHeight: '1.45' }}>
                  {t('Le livreur emballe et scelle devant vous.')}
                </div>
              </div>
            </div>
            <details className="more flat">
              <summary>
                <Icone nom="info" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
                <span className="grow">{t('Comment ça marche')}</span>
                <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
              </summary>
              <div className="more-b">
                <p>{t('Le livreur contrôle l’article devant vous. Il prend deux photos : l’article à découvert, puis le colis fermé et étiqueté.')}</p>
                <p>{t('Il l’emballe dans un emballage BelivaY, le scelle et pose l’étiquette.')}</p>
                <p>{tf('La classe du colis ({c}) fixe le véhicule et le tarif de livraison.', { c: c.colis })}</p>
              </div>
            </details>
          </div>
        )}
        {fil && fil.dernier && (
          <div className="card tight">
            <Link to={lien('messages', { fil: fil.id })} className="li">
              <span className="ic">
                <Icone nom="message-square-text" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ display: 'block' }}>
                  {fil.nonLus > 0 ? tf(fil.nonLus > 1 ? '{n} messages du client' : '{n} message du client', { n: fil.nonLus }) : t('Conversation avec le client')}
                </span>
                <span className="ls" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>
                  {`« ${fil.dernier.texte} »`}
                </span>
              </span>
              {fil.nonLus > 0 && <span className="pill or sm">{t('Répondre')}</span>}
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
          </div>
        )}
        <div className="sec">
          <h2>{t('Autres actions')}</h2>
        </div>
        <div className="card tight">
          {peutPreparer && aPreparer && !c.prolongee && enLigne && <Ligne vers={lien('delai', { ref: c.ref })} icone="clock" titre={t('Plus de temps')} sous={t('Une seule fois par commande')} />}
          {peutPreparer && aPreparer && enLigne && <Ligne vers={lien('rupture', { ref: c.ref })} icone="package-x" titre={t('Rupture')} sous={t('Vous n’avez plus l’article')} />}
          {aPreparer && <Ligne vers={lien('bon', { ref: c.ref })} icone="clipboard-list" titre={t('Bon de préparation')} sous={t('À imprimer ou à partager')} />}
          {montants && (c.statut === 'livree' || c.statut === 'chez_le_livreur') && <Ligne vers={lien('recu', { ref: c.ref })} icone="receipt" titre={t('Reçu vendeur')} sous={t('Prix de vente et ce que vous gardez')} />}
          <Ligne vers={lien('journal', { ref: c.ref })} icone="list" titre={t('Journal de la commande')} sous={t('Qui a fait quoi, et quand')} />
        </div>
        {!enLigne && aPreparer && <div className="hint-l"><Icone nom="wifi-off" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} /><span>{t('Rupture et plus de temps demandent le réseau : ils reviennent dès la reconnexion.')}</span></div>}
        {role === 'preparation' && s.proprietaire && (
          <div className="hint-l">
            <Icone nom="lock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{tf('Les montants et les versements sont réservés à {nom}, propriétaire.', { nom: `${s.proprietaire.prenom} ${s.proprietaire.nom}` })}</span>
          </div>
        )}
        <div className="hint-l">
          <Icone nom="shield-check" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('Vous ne voyez ni le nom, ni le numéro, ni l’adresse du client, ni son relais, ni les autres vendeurs de la commande.')}</span>
        </div>
      </Ecran>
    )
  }
