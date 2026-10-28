// Échanges entre clients (DP-54 ; règle commune src/donnees/echanges.ts, « BelivaY ne perd jamais ») : ce que
// partagent les listes d'envies, l'anniversaire, la cotisation et le panier envoyé à un proche.
// - QuiPaieLivraison : « Moi » ou « le destinataire » (seulement si la garantie couvre le pire cas ; sinon
//   l'explication), le montant de chacun et quand, la garantie du payeur, ce que voit le destinataire ;
// - CarteColis : un colis payé par l'un pour l'autre, vu du destinataire (accepter, refuser, ce qu'il paie au
//   retrait, retenue après l'expédition) ou du payeur (son accord, le remboursement) ;
// - EnvoiProches : envoyer une liste ou une cotisation dans l'application de ses proches BelivaY (choisis, ou
//   trouvés par leur numéro), ou montrer le QR code du lien ;
// - Remercier : le mot de merci à qui a offert.
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { PayerMomo } from '../../composants/PayerMomo'
import { chemin } from '../../config/pages'
import { destinatairePeutPayer, pireCas, refusColis, repartition, type PaieFrais } from '../../donnees/echanges'
import { chiffres, espacer } from '../../donnees/numeros'
import { source, type ColisEchange, type DonneesEchanges, type Merci, type Relais } from '../../donnees/source'
import { F } from '../../i18n/format'
import { jourSeul } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { Qr } from '../CL-09/Commun'

export function useEchanges(): [DonneesEchanges | null, () => void] {
  const [d, setD] = useState<DonneesEchanges | null>(null)
  const [v, setV] = useState(0)
  useEffect(() => {
    source.echanges().then(setD)
  }, [v])
  return [d, () => setV((x) => x + 1)]
}

// Jours de calendrier (heure de Yaoundé) jusqu'à une date (0 : aujourd'hui).
const jourDe = (ms: number) => Math.floor((ms + 3600e3) / 864e5)
export const joursAvant = (le: number, maintenant: number) => Math.max(0, jourDe(le) - jourDe(maintenant))

const radio = (on: boolean, titre: string, sous: string, agir: () => void, nom?: string) => (
  <a href="#" role="radio" aria-checked={on} aria-label={nom} className={'radio' + (on ? ' on' : '')} onClick={(e) => (e.preventDefault(), agir())}>
    <span className="rd"></span>
    <span className="grow">
      <span className="rt" style={{ display: 'block' }}>
        {titre}
      </span>
      <span className="rs" style={{ display: 'block' }}>
        {sous}
      </span>
    </span>
  </a>
)

// « Qui paie la livraison ? » : le choix (quand il est permis), les montants, la garantie, ce que voit le destinataire.
// moi : le libellé du payeur (« Moi », « Les participants ») ; prenom : le destinataire.
export function QuiPaieLivraison({ articles, frais, qui, choisir, prenom, moi, gros = false, payeurDiaspora = false }: { articles: number; frais: number; qui: PaieFrais; choisir: (q: PaieFrais) => void; prenom: string; moi?: string; gros?: boolean; payeurDiaspora?: boolean }) {
  const { t, tf } = usePreferences()
  const permis = destinatairePeutPayer({ articles, frais, gros, payeurDiaspora })
  const q: PaieFrais = permis.ok ? qui : 'payeur'
  const r = repartition({ articles, frais, qui: q })
  const nom = prenom || t('le destinataire')
  const payeur = moi ?? t('Moi')
  return (
    <div className="blv-quipaie">
      <div className="sec">
        <h2>{t('Qui paie la livraison ?')}</h2>
      </div>
      {frais <= 0 ? (
        <div className="hint-l">
          <Icone nom="gift" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{tf('Livraison offerte : {p} n’a rien à payer au retrait.', { p: nom })}</span>
        </div>
      ) : (
        <>
          {radio(q === 'payeur', tf('{m}, maintenant · {f} F', { m: payeur, f: F(frais) }), tf('Inclus dans le paiement : {p} n’a rien à payer au retrait.', { p: nom }), () => choisir('payeur'), tf('{m} paie la livraison', { m: payeur }))}
          {permis.ok ? (
            radio(q === 'destinataire', tf('{p}, au retrait · {f} F', { p: nom, f: F(frais) }), t('En Mobile Money, au comptoir du relais ou au livreur. Jamais en espèces.'), () => choisir('destinataire'), tf('{p} paie la livraison', { p: nom }))
          ) : (
            <div className="radio" aria-disabled="true" style={{ borderStyle: 'dashed', background: 'var(--sand-2)' }}>
              <span className="rd" style={{ borderColor: 'var(--sand-4)' }}></span>
              <span className="grow">
                <span className="rt c3" style={{ display: 'block' }}>
                  {tf('{p}, au retrait', { p: nom })}
                </span>
                <span className="rs" style={{ display: 'block' }}>
                  {permis.raison === 'diaspora'
                    ? tf('Depuis l’étranger, tu paies tout : {p} ne paie jamais rien.', { p: nom })
                    : tf('Pas pour ce colis : sa valeur ({a} F) ne couvre pas le pire cas ({w} F : livraison, garde et renvoi au vendeur).', { a: F(articles), w: F(pireCas(frais, gros)) })}
                </span>
              </span>
              <Icone nom="lock" taille={16} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
            </div>
          )}
        </>
      )}
      <div className="card tight">
        <div className="kv">
          <span className="k">{tf('{m}, maintenant', { m: payeur })}</span>
          <span className="v ">{F(r.payeurMaintenant)}&nbsp;F</span>
        </div>
        <div className="kv">
          <span className="k">{tf('{p}, au retrait', { p: nom })}</span>
          <span className="v ">{r.destinataireALaRemise ? F(r.destinataireALaRemise) + ' F' : t('rien')}</span>
        </div>
      </div>
      {q === 'destinataire' && (
        <div className="note ink">
          <Icone nom="shield-check" taille={18} />
          {moi ? (
            <div>
              <b>{t('La garantie des participants. ')}</b>
              {tf('Si {p} refuse le colis après son expédition ou ne vient pas le retirer, la livraison, la garde et le renvoi au vendeur (au plus {g} F) sont retenus sur le remboursement des participants, au prorata. Avant l’expédition, {p} refuse sans frais et chacun est remboursé en entier.', { p: nom, g: F(r.garantie) })}
            </div>
          ) : (
            <div>
              <b>{t('Ta garantie. ')}</b>
              {tf('Si {p} refuse le colis après son expédition ou ne vient pas le retirer, la livraison, la garde et le renvoi au vendeur (au plus {g} F) sont retenus sur le remboursement des articles. Avant l’expédition, {p} refuse sans frais et tu es remboursé en entier.', { p: nom, g: F(r.garantie) })}
            </div>
          )}
        </div>
      )}
      <div className="hint-l">
        <Icone nom="eye" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{q === 'destinataire' ? tf('{p} voit le montant à payer ({m} F) avant d’accepter le colis, et peut le refuser.', { p: nom, m: F(r.destinataireALaRemise) }) : tf('Rien à payer pour {p} : seulement son code de retrait, envoyé à l’arrivée.', { p: nom })}</span>
      </div>
    </div>
  )
}

const ORIGINE: Record<ColisEchange['origine'], string> = { liste: 'Cadeau d’une liste', cotisation: 'Cotisation', panier: 'Panier envoyé' }

// Un colis payé par l'un pour l'autre, vu de chaque côté.
export function CarteColis({ c, apres }: { c: ColisEchange; apres?: (c: ColisEchange) => void }) {
  const { t, tf, langue } = usePreferences()
  const [refuser, setRefuser] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const recu = c.sens === 'recu'
  const refus = refusColis(c)
  const repondre = async (accepte: boolean) => {
    if (envoi) return
    setEnvoi(true)
    const x = await source.repondreColis(c.id, accepte)
    setEnvoi(false)
    setRefuser(false)
    apres?.(x)
  }
  const pill =
    c.etat === 'a_accepter' ? (
      <span className="pill amber sm">{t(recu ? 'À accepter' : 'En attente de son accord')}</span>
    ) : c.etat === 'accepte' ? (
      <span className="pill green sm">{t('Accepté')}</span>
    ) : c.etat === 'refuse' ? (
      <span className="pill ink sm">{t('Refusé')}</span>
    ) : (
      <span className="pill green sm">{t('Retiré')}</span>
    )
  return (
    <div className="card blv-colis" data-colis={c.id}>
      <div className="row" style={{ gap: '12px', alignItems: 'flex-start' }}>
        <span className="thumb" style={{ width: '52px', height: '52px', borderRadius: '13px' }}>
          {c.dessin ? <Dessin id={c.dessin} /> : <Icone nom="gift" taille={22} />}
        </span>
        <div className="grow">
          <div className="t15 b8" style={{ lineHeight: '1.3' }}>
            {t(c.titre)}
          </div>
          <div className="t13 c3 mt4">{recu ? tf('{o} · de {p} · {d}', { o: t(ORIGINE[c.origine]), p: c.de, d: jourSeul(c.le, langue) }) : tf('{o} · pour {p} · {d}', { o: t(ORIGINE[c.origine]), p: c.pour, d: jourSeul(c.le, langue) })}</div>
          <div className="mt6">{pill}</div>
        </div>
      </div>
      {c.mot && <div className="t13 c2 mt8">« {c.mot} »</div>}
      <div className="kv mt8">
        <span className="k">{t('Articles, déjà payés')}</span>
        <span className="v ">{F(c.articles)}&nbsp;F</span>
      </div>
      <div className="kv">
        <span className="k">{t(recu ? 'Livraison, à payer au retrait' : 'Livraison')}</span>
        <span className="v ">{c.qui === 'destinataire' ? F(c.frais) + ' F' : recu ? t('rien, déjà payée') : tf('{m} F, payée par toi', { m: F(c.frais) })}</span>
      </div>
      <div className="kv">
        <span className="k">{t('Retrait')}</span>
        <span className="v ">{t(c.relais)}</span>
      </div>
      {recu && c.etat === 'a_accepter' && (
        <>
          <div className="note amber">
            <Icone nom="hand-coins" taille={18} />
            <div>{c.qui === 'destinataire' ? tf('{p} a payé les articles. Si tu acceptes, tu paies {m} F de livraison au retrait, en Mobile Money au comptoir ou au livreur.', { p: c.de, m: F(c.frais) }) : tf('{p} a tout payé : tu n’as rien à payer.', { p: c.de })}</div>
          </div>
          <div className="btns mt12">
            <button type="button" className={'btn primary' + (envoi ? ' off' : '')} onClick={() => repondre(true)}>
              <Icone nom="circle-check" taille={18} />
              <span>{t('Accepter le colis')}</span>
            </button>
          </div>
        </>
      )}
      {recu && (c.etat === 'a_accepter' || c.etat === 'accepte') && (
        <>
          {refuser ? (
            <div className="card flat mt8">
              <div className="t14 b8">{t('Refuser ce colis ?')}</div>
              <div className="t13 c2 mt4">{!c.expedie ? tf('Le vendeur n’a pas encore expédié : tu refuses sans frais et {p} est remboursé en entier ({m} F).', { p: c.de, m: F(refus.rembourse) }) : tf('Déjà expédié : {r} F (livraison, garde, renvoi) sont retenus et {p} récupère {m} F.', { r: F(refus.retenue), p: c.de, m: F(refus.rembourse) })}</div>
              <div className="btns mt12">
                <button type="button" className={'btn secondary' + (envoi ? ' off' : '')} onClick={() => repondre(false)}>
                  <span>{t('Oui, refuser le colis')}</span>
                </button>
              </div>
              <div className="btns">
                <button type="button" className="btn ghost" onClick={() => setRefuser(false)}>
                  <span>{t('Garder le colis')}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="links">
              <a href="#" onClick={(e) => (e.preventDefault(), setRefuser(true))}>
                {t('Refuser le colis')}
              </a>
            </div>
          )}
        </>
      )}
      {c.etat === 'accepte' && recu && c.qui === 'destinataire' && (
        <div className="hint-l">
          <Icone nom="smartphone" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{tf('Tu paieras {m} F au retrait, sur ton téléphone. Ton code arrive avec le colis.', { m: F(c.frais) })}</span>
        </div>
      )}
      {c.etat === 'refuse' && (
        <div className="hint-l">
          <Icone nom="undo-2" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{recu ? tf('Refusé. {p} récupère {m} F.', { p: c.de, m: F(c.rembourse ?? 0) }) : c.retenue ? tf('Refusé par {p} : {m} F te reviennent ; {r} F retenus (livraison, garde, renvoi).', { p: c.pour, m: F(c.rembourse ?? 0), r: F(c.retenue) }) : tf('Refusé par {p} avant l’expédition : {m} F te reviennent, sans frais.', { p: c.pour, m: F(c.rembourse ?? 0) })}</span>
        </div>
      )}
      {!recu && c.etat === 'a_accepter' && (
        <div className="hint-l">
          <Icone nom="clock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{tf('{p} voit les {m} F de livraison à payer au retrait avant d’accepter. Ta garantie couvre un refus après l’expédition.', { p: c.pour, m: F(c.frais) })}</span>
        </div>
      )}
      {!recu && (
        <div className="links">
          <Link to={chemin('commande', { ref: c.ref })}>{tf('Suivre la commande {r}', { r: c.ref })}</Link>
        </div>
      )}
    </div>
  )
}

// Envoyer une liste ou une cotisation dans l'application de ses proches BelivaY, ou montrer le QR code du lien.
export function EnvoiProches({ objet, lien, avant }: { objet: { type: 'liste' | 'cotisation'; id: string }; lien: string; avant?: () => Promise<boolean> }) {
  const { t, tf } = usePreferences()
  const [d, recharger] = useEchanges()
  const [choisis, setChoisis] = useState<string[]>([])
  const [numero, setNumero] = useState('')
  const [inconnu, setInconnu] = useState<string | null>(null)
  const [message, setMessage] = useState<{ ton: 'green' | 'amber'; texte: string } | null>(null)
  const [qr, setQr] = useState(false)
  if (!d) return null
  const recus = d.envois.filter((x) => x.objet === objet.type && x.id === objet.id).map((x) => x.proche)
  const basculer = (id: string) => setChoisis((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]))
  const chercher = async () => {
    setInconnu(null)
    const r = await source.chercherProche(numero)
    if (r.ok) {
      recharger()
      if (!recus.includes(r.proche.id)) setChoisis((c) => (c.includes(r.proche.id) ? c : [...c, r.proche.id]))
      setNumero('')
      setMessage({ ton: 'green', texte: r.proche.quartier ? tf('{p} est sur BelivaY (relais à {q}) : choisi.', { p: r.proche.prenom, q: t(r.proche.quartier) }) : tf('{p} est sur BelivaY : choisi.', { p: r.proche.prenom }) })
    } else if (r.raison === 'inconnu') setInconnu(chiffres(numero))
    else setMessage({ ton: 'amber', texte: t(r.raison === 'moi' ? 'C’est ton propre numéro.' : 'Numéro camerounais à 9 chiffres, qui commence par 6.') })
  }
  const envoyer = async () => {
    if (!choisis.length) return setMessage({ ton: 'amber', texte: t('Choisis d’abord au moins un proche.') })
    if (avant && !(await avant())) return
    const r = await source.envoyerAuxProches(objet, choisis)
    setChoisis([])
    recharger()
    setMessage({ ton: 'green', texte: tf(r.envoyes > 1 ? 'Envoyé à {n} proches : une notification dans leur application.' : 'Envoyé à {n} proche : une notification dans son application.', { n: r.envoyes }) })
  }
  return (
    <div className="cl14-grp blv-envoi">
      <div className="cl14-gl">{t('À tes proches sur BelivaY')}</div>
      {d.proches.length > 0 ? (
        <div className="chips">
          {d.proches.map((p) => {
            const deja = recus.includes(p.id)
            const on = choisis.includes(p.id)
            return (
              <a key={p.id} href="#" className={'chip' + (on || deja ? ' on' : '')} aria-pressed={on || deja} aria-disabled={deja || undefined} onClick={(e) => (e.preventDefault(), deja ? setMessage({ ton: 'green', texte: tf('{p} l’a déjà reçu.', { p: p.prenom }) }) : basculer(p.id))}>
                {deja ? <Icone nom="check" taille={14} /> : p.lie ? <Icone nom="link" taille={14} /> : <Icone nom="user" taille={14} />}
                {p.prenom}
              </a>
            )
          })}
        </div>
      ) : (
        <div className="t13 c3">{t('Aucun proche pour l’instant : ajoute-les par leur numéro.')}</div>
      )}
      <div className="fld mt8">
        <label htmlFor={'ep-num-' + objet.id}>{t('Ajouter par son numéro')}</label>
        <div className="row" style={{ gap: 8 }}>
          <div className="inp grow">
            <b className="t15">+237</b>
            <input id={'ep-num-' + objet.id} className="grow" type="tel" inputMode="tel" placeholder="6XX XX XX XX" value={numero} onChange={(e) => (setNumero(espacer(e.target.value)), setInconnu(null))} />
          </div>
          <button type="button" className="btn secondary sm" style={{ width: 'auto' }} onClick={chercher}>
            <Icone nom="search" taille={16} />
            <span>{t('Chercher')}</span>
          </button>
        </div>
        <div className="hint">{t('Seuls son prénom et le quartier de son relais te sont montrés.')}</div>
      </div>
      {inconnu && (
        <div className="note amber">
          <Icone nom="user-plus" taille={18} />
          <div>
            {t('Ce numéro n’a pas encore de compte BelivaY. ')}
            <a href={'sms:+237' + inconnu + '?&body=' + encodeURIComponent(lien)}>{t('Lui envoyer le lien par SMS')}</a>
          </div>
        </div>
      )}
      {message && (
        <div className={'note ' + message.ton} role="status">
          <Icone nom={message.ton === 'green' ? 'circle-check' : 'circle-alert'} taille={18} />
          <div>{message.texte}</div>
        </div>
      )}
      <div className="btns mt8">
        <button type="button" className={'btn soft' + (choisis.length ? '' : ' off')} onClick={envoyer}>
          <Icone nom="send" taille={18} />
          <span>{choisis.length ? tf('Envoyer dans leur application ({n})', { n: choisis.length }) : t('Envoyer dans leur application')}</span>
        </button>
      </div>
      <div className="btns">
        <button type="button" className="btn ghost" aria-expanded={qr} onClick={async () => (qr || !avant || (await avant())) && setQr(!qr)}>
          <Icone nom="qr-code" taille={18} />
          <span>{t(qr ? 'Cacher le QR code' : 'Montrer le QR code')}</span>
        </button>
      </div>
      {qr && lien && (
        <>
          <div className="qr">
            <Qr texte={lien} />
          </div>
          <div className="t12 c3 mt6" style={{ textAlign: 'center' }}>
            {t('À scanner avec l’appareil photo du téléphone : le lien s’ouvre, sans compte.')}
          </div>
        </>
      )}
    </div>
  )
}

// Le mot de merci à qui a offert (une fois par cadeau ; on peut le réécrire).
export function Remercier({ refCmd, pour, merci, apres }: { refCmd: string; pour: string; merci: Merci | undefined; apres: () => void }) {
  const { t, tf } = usePreferences()
  const [ouvert, setOuvert] = useState(false)
  const [texte, setTexte] = useState('')
  if (merci && !ouvert)
    return (
      <div className="hint-l blv-merci">
        <Icone nom="heart" taille={15} style={{ flexShrink: '0', marginTop: '1px', color: 'var(--or-txt)' }} />
        <span>
          {tf('Merci envoyé à {p} : « {m} »', { p: pour === 'tous' ? t('tous les participants') : pour, m: merci.texte })}{' '}
          <a href="#" onClick={(e) => (e.preventDefault(), setTexte(merci.texte), setOuvert(true))}>
            {t('Modifier')}
          </a>
        </span>
      </div>
    )
  if (!ouvert)
    return (
      <div className="btns mt8">
        <button type="button" className="btn soft sm" onClick={() => setOuvert(true)}>
          <Icone nom="heart" taille={16} />
          <span>{pour === 'tous' ? t('Remercier tous les participants') : tf('Remercier {p}', { p: pour })}</span>
        </button>
      </div>
    )
  const envoyer = async () => {
    if (texte.trim().length < 2) return
    await source.remercier(refCmd, texte)
    setOuvert(false)
    apres()
  }
  return (
    <div className="fld mt8">
      <label htmlFor={'merci-' + refCmd}>{pour === 'tous' ? t('Ton mot pour les participants') : tf('Ton mot pour {p}', { p: pour })}</label>
      <div className="inp">
        <input id={'merci-' + refCmd} className="grow" value={texte} maxLength={140} placeholder={t('Merci, ça me touche beaucoup !')} onChange={(e) => setTexte(e.target.value)} />
      </div>
      <div className="btns mt8">
        <button type="button" className={'btn primary sm' + (texte.trim().length < 2 ? ' off' : '')} onClick={envoyer}>
          <Icone nom="send" taille={16} />
          <span>{t('Envoyer le merci')}</span>
        </button>
      </div>
    </div>
  )
}

// Panier (CL-07) : « Pour qui ? » ; pour un proche, son relais, qui paie la livraison, puis le paiement Mobile
// Money ; la commande part au relais du proche, qui voit ce qu'il paiera avant d'accepter le colis.
export function PourQuiPanier({ articles, frais, relaisMoi }: { articles: number; frais: number; relaisMoi: string }) {
  const { t, tf } = usePreferences()
  const naviguer = useNavigate()
  const [d, recharger] = useEchanges()
  const [relais, setRelais] = useState<Relais[]>([])
  const [pour, setPour] = useState<'moi' | 'proche'>('moi')
  const [proche, setProche] = useState<string | null>(null)
  const [rel, setRel] = useState<string | null>(null)
  const [numero, setNumero] = useState('')
  const [qui, setQui] = useState<PaieFrais>('payeur')
  const [mot, setMot] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  useEffect(() => {
    source.relaisListe().then((r) => setRelais(r.relais))
  }, [])
  if (!d) return null
  const p = d.proches.find((x) => x.id === proche) ?? null
  const relaisDe = (q: string | null) => relais.find((r) => r.quartier === q && !r.plein)?.nom ?? null
  const relaisChoisi = rel ?? relaisDe(p?.quartier ?? null)
  const permis = destinatairePeutPayer({ articles, frais }).ok
  const q: PaieFrais = permis ? qui : 'payeur'
  const r = repartition({ articles, frais, qui: q })
  const choisirProche = (id: string) => (setProche(id), setRel(null), setMessage(null))
  const chercher = async () => {
    const x = await source.chercherProche(numero)
    if (x.ok) (recharger(), choisirProche(x.proche.id), setNumero(''))
    else setMessage(x.raison === 'inconnu' ? 'Ce numéro n’a pas encore de compte BelivaY : il ne peut pas encore recevoir de colis.' : x.raison === 'moi' ? 'C’est ton propre numéro.' : 'Numéro camerounais à 9 chiffres, qui commence par 6.')
  }
  const payer = async (moyen: string) => {
    if (!p || !relaisChoisi) return setMessage('Choisis d’abord le proche et son relais.')
    const x = await source.envoyerPanierA({ prenom: p.prenom, proche: p.id, relais: relaisChoisi, qui: q, moyen, mot })
    if (x.ok) naviguer(chemin('listes', { envoi: x.ref }))
    else setMessage(x.raison === 'garantie' ? 'La valeur du panier ne couvre pas la garantie : c’est toi qui paies la livraison.' : x.raison === 'relais' ? 'Ce relais ne prend plus de colis aujourd’hui : choisis-en un autre.' : 'Ton panier est vide.')
  }
  return (
    <div className="card blv-pourqui">
      <div className="cl07-lab">{t('Pour qui ?')}</div>
      <div className="seg mt8" role="radiogroup" aria-label={t('Pour qui ?')}>
        {(
          [
            ['moi', 'Pour moi'],
            ['proche', 'Pour un proche'],
          ] as const
        ).map(([k, l]) => (
          <a key={k} href="#" role="radio" aria-checked={pour === k} className={pour === k ? 'on' : ''} onClick={(e) => (e.preventDefault(), setPour(k), setMessage(null))}>
            {t(l)}
          </a>
        ))}
      </div>
      {pour === 'moi' ? (
        <div className="hint-l">
          <Icone nom="map-pin" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{tf('Tes colis arrivent à ton relais ({r}) ; tu choisis le relais ou le domicile à l’étape suivante.', { r: t(relaisMoi) })}</span>
        </div>
      ) : (
        <>
          <div className="t13 c3 mt8">{t('Tu paies le panier ; il part au relais de ton proche, qui le retire avec son propre code.')}</div>
          {d.proches.length > 0 && (
            <div className="chips mt8">
              {d.proches.map((x) => (
                <a key={x.id} href="#" role="radio" aria-checked={proche === x.id} className={'chip' + (proche === x.id ? ' on' : '')} onClick={(e) => (e.preventDefault(), choisirProche(x.id))}>
                  <Icone nom={x.lie ? 'link' : 'user'} taille={14} />
                  {x.prenom}
                </a>
              ))}
            </div>
          )}
          <div className="fld mt8">
            <label htmlFor="pq-num">{t('Un autre proche : son numéro BelivaY')}</label>
            <div className="row" style={{ gap: 8 }}>
              <div className="inp grow">
                <b className="t15">+237</b>
                <input id="pq-num" className="grow" type="tel" inputMode="tel" placeholder="6XX XX XX XX" value={numero} onChange={(e) => setNumero(espacer(e.target.value))} />
              </div>
              <button type="button" className="btn secondary sm" style={{ width: 'auto' }} onClick={chercher}>
                <span>{t('Chercher')}</span>
              </button>
            </div>
          </div>
          {p && (
            <div className="fld">
              <label htmlFor="pq-relais">{tf('Relais de {p}', { p: p.prenom })}</label>
              <div className="inp">
                <Icone nom="map-pin" taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
                <select id="pq-relais" value={relaisChoisi ?? ''} onChange={(e) => setRel(e.target.value || null)} style={{ width: '100%', border: 0, background: 'transparent', font: 'inherit', color: 'inherit' }}>
                  <option value="">{t('Choisir un relais')}</option>
                  {relais
                    .filter((x) => !x.plein)
                    .map((x) => (
                      <option key={x.nom} value={x.nom}>
                        {t(x.nom)} · {t(x.horaires)}
                      </option>
                    ))}
                </select>
              </div>
              <div className="hint">{p.quartier ? tf('Celui de son quartier ({q}) est proposé. Tu ne vois jamais son adresse.', { q: t(p.quartier) }) : t('Tu ne vois jamais son adresse.')}</div>
            </div>
          )}
          {p && (
            <>
              <QuiPaieLivraison articles={articles} frais={frais} qui={q} choisir={setQui} prenom={p.prenom} />
              <div className="fld">
                <label htmlFor="pq-mot">{tf('Un mot pour {p} (facultatif)', { p: p.prenom })}</label>
                <div className="inp">
                  <input id="pq-mot" className="grow" value={mot} maxLength={80} onChange={(e) => setMot(e.target.value)} />
                </div>
              </div>
            </>
          )}
          {message && (
            <div className="note amber" role="alert">
              <Icone nom="circle-alert" taille={18} />
              <div>{t(message)}</div>
            </div>
          )}
          {p && relaisChoisi ? (
            <PayerMomo montant={r.payeurMaintenant} texte={tf('Payer pour {p} · {m} F', { p: p.prenom, m: F(r.payeurMaintenant) })} payer={payer} />
          ) : (
            <div className="hint-l">
              <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
              <span>{t(p ? 'Choisis son relais pour continuer.' : 'Choisis le proche qui reçoit le colis.')}</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
