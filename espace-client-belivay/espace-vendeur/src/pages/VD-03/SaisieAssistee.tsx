// Saisie assistée (VD-03 ; SAI-01 à 04, VD03-R15, REFVD-R197 ; DP-56 Q-34 et Q-40) : les fiches qu'un agent BelivaY de
// la zone a saisies chez le vendeur, à valider ou modifier ; rien n'est publié sans lui. Groupes selon le résultat des
// quatre contrôles du serveur (photo, doublon, prix anormal, description copiée) : Prêts · N (validés en une fois),
// À vérifier · N (contrôle en échec d'abord, raison dans l'encadré ambre, validés un par un), Doublon · N (rattaché à
// la fiche existante) ; le nombre annoncé est celui des fiches affichées. Modifier : le prix et le stock seulement
// (BelivaY rédige la fiche) ; le contrôle du prix est refait par la source (sous la moitié ou au-delà de 3 fois la
// médiane : alerte et relecture humaine, jamais de blocage). Recherche, fiches validées et leur suite.
// Accès Préparation : réservé au propriétaire (prix, publication).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { Feuille } from '@client/composants/Feuille'
import { F } from '@client/i18n/format'
import { Ecran } from '../../composants/coque'
import { Vignette } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { Controle, FicheAgent, SaisieAssistee as Donnees } from '../../donnees/domaines/session'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useMontantsVisibles, useSession } from '../../session'
import { BoutonPlein, Chargement, Comment, ErreurLecture } from './commun'

const NOMS: Record<Controle, string> = { photo: 'Photo', doublon: 'Doublon', prix: 'Prix', description: 'Description' }
const ORDRE: Controle[] = ['photo', 'doublon', 'prix', 'description']
const echecs = (f: FicheAgent) => ORDRE.filter((c) => f.controles[c] === 'echec')
const prete = (f: FicheAgent) => !f.rattachee && echecs(f).length === 0
const aVerifier = (f: FicheAgent) => !f.rattachee && echecs(f).length > 0
const norme = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

function useMontant() {
  const { t } = usePreferences()
  return (n: number) => t(`${F(n)} F`)
}

function Raison({ f, s }: { f: FicheAgent; s: Donnees }) {
  const { t, tf } = usePreferences()
  const F_ = useMontant()
  const lignes: string[] = []
  if (f.controles.prix === 'echec' && f.mediane)
    lignes.push(
      f.prix * 100 < f.mediane * s.seuilPrix.basPourCent
        ? tf('Prix anormal : {p}, moins de la moitié du prix habituel ({m}). Vérifiez avant de valider.', { p: F_(f.prix), m: F_(f.mediane) })
        : tf('Prix anormal : {p}, plus de {x} fois le prix habituel ({m}). Vérifiez avant de valider.', { p: F_(f.prix), m: F_(f.mediane), x: s.seuilPrix.hautFois }),
    )
  if (f.controles.photo === 'echec') lignes.push(t('Photo floue ou trop sombre : demandez à l’agent de la reprendre.'))
  if (f.controles.description === 'echec') lignes.push(t('Description copiée d’un autre site : BelivaY la réécrit avant la mise en ligne.'))
  if (!lignes.length) return null
  return (
    <div className="note amber">
      <Icone nom="triangle-alert" taille={18} />
      <div>
        {lignes.map((l) => (
          <div key={l}>{l}</div>
        ))}
      </div>
    </div>
  )
}

function Carte({ f, s, valider, modifier, part }: { f: FicheAgent; s: Donnees; valider: () => void; modifier: () => void; part: boolean }) {
  const { t, tf } = usePreferences()
  const F_ = useMontant()
  const ko = echecs(f).filter((c) => c !== 'doublon' || !f.rattachee)
  const okNoms = ORDRE.filter((c) => f.controles[c] === 'ok').map((c) => t(NOMS[c]).toLowerCase())
  return (
    <div className={'card' + (part ? ' vd03-part' : '')}>
      <div className="art" style={{ marginTop: '0' }}>
        <Vignette nom={f.dessin} taille={56} />
        <div className="grow">
          <div className="an" style={{ fontSize: '15.5px' }}>
            {t(f.titre)}
          </div>
          <div className="av">{tf('{p} · stock {s} · {n} photos', { p: F_(f.prix), s: f.stock, n: f.photos })}</div>
        </div>
      </div>
      <div className="meta">
        {ko.map((c) => (
          <span key={c} className="pill amber">
            <Icone nom="triangle-alert" taille={12} />
            {t(NOMS[c])}
          </span>
        ))}
        {okNoms.length > 0 && !f.rattachee && (
          <span className="pill green">
            <Icone nom="check" taille={12} />
            {okNoms.join(', ').replace(/^./, (x) => x.toUpperCase())}
          </span>
        )}
        {f.rattachee && (
          <>
            <span className="pill green">
              <Icone nom="check" taille={12} />
              {t('Photo')}
            </span>
            <span className="pill ink">
              <Icone nom="link" taille={13} />
              {t('Rattachée à la fiche existante')}
            </span>
          </>
        )}
      </div>
      <Raison f={f} s={s} />
      <div className="btns">
        <button type="button" className="btn soft" onClick={valider}>
          <Icone nom="check" taille={18} />
          <span>{t('Valider')}</span>
        </button>
        <button type="button" style={{ height: '44px' }} className="btn secondary" onClick={modifier}>
          <Icone nom="pencil" taille={18} />
          <span>{t('Modifier')}</span>
        </button>
      </div>
    </div>
  )
}

function FeuilleModifier({ f, s, fermer }: { f: FicheAgent | null; s: Donnees; fermer: () => void }) {
  const { t, tf } = usePreferences()
  const F_ = useMontant()
  const [prix, setPrix] = useState('')
  const [stock, setStock] = useState('')
  const [pour, setPour] = useState<string | null>(null)
  const [refus, setRefus] = useState<'prix' | 'stock' | null>(null)
  if (f && pour !== f.id) {
    setPour(f.id)
    setPrix(String(f.prix))
    setStock(String(f.stock))
    setRefus(null)
  }
  const p = Number(prix.replace(/\D/g, '')) || 0
  const anormal = !!f?.mediane && (p * 100 < f.mediane * s.seuilPrix.basPourCent || p > f.mediane * s.seuilPrix.hautFois)
  const enregistrer = async () => {
    if (!f) return
    const r = await source.session.modifierFiche(f.id, { prix: p, stock: Number(stock) })
    if (!r.ok) return (jouer('erreur'), setRefus(r.raison))
    jouer('interrupteur')
    fermer()
  }
  return (
    <Feuille ouverte={!!f} fermer={fermer} titre={t('Modifier la fiche')}>
      {f && (
        <>
          <div style={{ fontWeight: '800', fontSize: '17px', margin: '2px 0 6px' }}>{t(f.titre)}</div>
          <p className="t13 c3" style={{ margin: 0 }}>
            {t('BelivaY rédige la fiche ; vous réglez votre prix et votre stock.')}
          </p>
          <div className="fld">
            <label htmlFor="sa-prix">{t('Prix de vente')}</label>
            <div className={'inp' + (refus === 'prix' ? ' err' : '')}>
              <input id="sa-prix" inputMode="numeric" value={prix ? F(p) : ''} onChange={(e) => (setPrix(e.target.value), setRefus(null))} />
              <span className="suf">{t('F')}</span>
            </div>
            {refus === 'prix' && <div className="hint err">{t('Prix trop bas pour être publié.')}</div>}
            {f.mediane && (
              <div className={'hint' + (anormal ? ' err' : '')}>
                {anormal ? tf('Prix anormal : le prix habituel est {m}. Il sera relu par BelivaY.', { m: F_(f.mediane) }) : tf('Prix habituel de la catégorie : {m}.', { m: F_(f.mediane) })}
              </div>
            )}
          </div>
          <div className="fld">
            <label htmlFor="sa-stock">{t('Stock')}</label>
            <div className={'inp' + (refus === 'stock' ? ' err' : '')}>
              <input id="sa-stock" inputMode="numeric" value={stock} onChange={(e) => (setStock(e.target.value.replace(/\D/g, '').slice(0, 4)), setRefus(null))} />
            </div>
            {refus === 'stock' && <div className="hint err">{t('Indiquez un stock entre 0 et 9 999.')}</div>}
          </div>
          <div className="mt16">
            <BoutonPlein icone="check" actif={!!prix && stock !== ''} raison={t('Indiquez le prix et le stock.')} onClick={() => void enregistrer()}>
              {t('Enregistrer')}
            </BoutonPlein>
          </div>
        </>
      )}
    </Feuille>
  )
}

export default function SaisieAssistee() {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const montants = useMontantsVisibles()
  const F_ = useMontant()
  const lecture = useLecture(() => source.session.saisieAssistee(), [s.membre?.role])
  const [q, setQ] = useState('')
  const [edite, setEdite] = useState<string | null>(null)
  const [partent, setPartent] = useState<string[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const d = lecture.donnees
  const valider = async (ids: string[]) => {
    setPartent(ids)
    await new Promise((r) => setTimeout(r, document.documentElement.dataset.mouv ? 320 : 0))
    await source.session.validerFiches(ids)
    setPartent([])
    jouer('fin')
    setMessage(ids.length > 1 ? tf('{n} produits validés.', { n: ids.length }) : t('Produit validé.'))
  }
  let corps
  if (lecture.erreur) corps = <ErreurLecture relire={lecture.relire} />
  else if (!d) corps = <Chargement />
  else if (!montants)
    corps = (
      <div className="note ink" style={{ marginTop: '18px' }}>
        <Icone nom="lock" taille={18} />
        <div>{tf('Les fiches de l’agent (prix, mise en ligne) sont réservées à {nom}, propriétaire.', { nom: s.proprietaire ? `${s.proprietaire.prenom} ${s.proprietaire.nom}` : '' })}</div>
      </div>
    )
  else {
    const visibles = d.fiches.filter((f) => !q.trim() || norme(f.titre).includes(norme(q.trim())))
    const prets = visibles.filter(prete)
    const verifier = visibles.filter(aVerifier)
    const doublons = visibles.filter((f) => f.rattachee)
    const total = d.fiches.length + d.validees.length
    corps = (
      <>
        <div className="pg">
          <h1 className="pg-t">{d.fiches.length ? tf('{n} produits saisis pour vous', { n: total }) : t('Tout est validé')}</h1>
          <p className="pg-s">{tf('Par {agent}, agent BelivaY de la zone {z}, chez vous le {j}. Rien n’est publié sans votre accord.', { agent: d.agent.prenom, z: d.agent.zone, j: jourLong(new Date(d.le + 'T12:00:00+01:00').getTime(), langue) })}</p>
        </div>
        {message && (
          <div className="note green" role="status">
            <Icone nom="circle-check" taille={18} />
            <div>{message}</div>
          </div>
        )}
        {d.fiches.length > 3 && (
          <div className="vd03-recherche">
            <Icone nom="search" taille={17} style={{ color: 'var(--ink-3)' }} />
            <input type="search" aria-label={t('Chercher une fiche')} placeholder={t('Chercher une fiche')} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        )}
        {q.trim() && !visibles.length && <p className="hint">{t('Aucune fiche ne correspond.')}</p>}
        {prets.length > 0 && (
          <>
            <div className="divider-t">{tf('Prêts · {n}', { n: prets.length })}</div>
            <div className="card" style={{ paddingTop: '12px' }}>
              <span className="pill green">
                <Icone nom="check" taille={13} />
                {t('4 contrôles sur 4 réussis')}
              </span>
              <div className="mt4">
                {prets.map((f) => (
                  <div key={f.id} className={'li' + (partent.includes(f.id) ? ' vd03-part' : '')}>
                    <Vignette nom={f.dessin} taille={44} />
                    <span className="grow">
                      <span className="lt" style={{ display: 'block' }}>
                        {t(f.titre)}
                      </span>
                      <span className="ls" style={{ display: 'block' }}>
                        {tf('{p} · stock {s}', { p: F_(f.prix), s: f.stock })}
                      </span>
                    </span>
                    <button type="button" className="ibtn" aria-label={tf('Modifier {p}', { p: t(f.titre) })} style={{ width: '44px', height: '44px', color: 'var(--ink-3)' }} onClick={() => setEdite(f.id)}>
                      <Icone nom="pencil" taille={18} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt8">
                <BoutonPlein icone="check" onClick={() => void valider(prets.map((f) => f.id))}>
                  {prets.length > 1 ? tf('Valider les {n} produits prêts', { n: prets.length }) : t('Valider le produit prêt')}
                </BoutonPlein>
              </div>
            </div>
          </>
        )}
        {verifier.length > 0 && (
          <>
            <div className="divider-t">{tf('À vérifier · {n}', { n: verifier.length })}</div>
            {verifier.map((f) => (
              <Carte key={f.id} f={f} s={d} part={partent.includes(f.id)} valider={() => void valider([f.id])} modifier={() => setEdite(f.id)} />
            ))}
          </>
        )}
        {doublons.length > 0 && (
          <>
            <div className="divider-t">{tf('Doublon · {n}', { n: doublons.length })}</div>
            {doublons.map((f) => (
              <Carte key={f.id} f={f} s={d} part={partent.includes(f.id)} valider={() => void valider([f.id])} modifier={() => setEdite(f.id)} />
            ))}
          </>
        )}
        {d.fiches.length === 0 && (
          <div className="empty" style={{ marginTop: '12px' }}>
            <div className="ei">
              <Icone nom="package" taille={26} />
            </div>
            <h3>{t('Aucune fiche à valider')}</h3>
            <p>{t('Les fiches validées sont dans Mes produits.')}</p>
          </div>
        )}
        {d.validees.length > 0 && (
          <>
            <div className="divider-t">{tf('Validés · {n}', { n: d.validees.length })}</div>
            <div className="card tight">
              {d.validees.map((v) => (
                <div key={v.id} className="li">
                  <span className={'ic ' + (v.enVerification ? 'or' : 'green')}>
                    <Icone nom={v.enVerification ? 'hourglass' : 'circle-check'} taille={20} />
                  </span>
                  <span className="grow">
                    <span className="lt" style={{ display: 'block' }}>
                      {t(v.titre)}
                    </span>
                    <span className="ls" style={{ display: 'block' }}>
                      {t(v.enVerification ? 'Relue par BelivaY sous 48 h (prix anormal)' : 'Publiée dès l’accord de vos pièces')}
                    </span>
                  </span>
                </div>
              ))}
            </div>
            <div className="mt12">
              <Link to={chemin('produits')} className="btn secondary">
                <Icone nom="package" taille={18} />
                <span>{t('Voir mes produits')}</span>
              </Link>
            </div>
          </>
        )}
        <Comment>
          <p>{t('Un agent BelivaY de votre zone photographie vos produits chez vous. Il note le prix et le stock.')}</p>
          <p>{t('Avant publication, quatre contrôles : photo, doublon, prix anormal, description copiée.')}</p>
          <p>{t('Vous validez ou modifiez chaque produit. Rien n’est publié sans vous, et les produits restent les vôtres.')}</p>
          <p>{d.prixSession !== null ? tf('Gratuit pour les {n} premières boutiques de chaque zone, puis {p} la session.', { n: d.premieresBoutiques, p: F_(d.prixSession) }) : ''}</p>
          {d.gratuite && <p>{t('Votre boutique en fait partie : cette session ne vous coûte rien.')}</p>}
        </Comment>
        <div className="vx-links">
          <Link to={chemin('offre1')}>
            <Icone nom="plus" taille={18} />
            <span className="g">{t('Ajouter un produit moi-même')}</span>
            <Icone nom="chevron-right" taille={16} />
          </Link>
          <Link to={chemin('messages')}>
            <Icone nom="message-circle" taille={18} />
            <span className="g">{t('Demander une nouvelle visite de l’agent')}</span>
            <Icone nom="chevron-right" taille={16} />
          </Link>
        </div>
        <FeuilleModifier f={d.fiches.find((f) => f.id === edite) ?? null} s={d} fermer={() => setEdite(null)} />
      </>
    )
  }
  return <Ecran route="saisie_assistee">{corps}</Ecran>
}
