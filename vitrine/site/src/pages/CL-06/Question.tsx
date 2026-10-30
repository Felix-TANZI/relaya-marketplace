// Écran « Ta question au vendeur » (CL-06), repris pour l'usage réel (DP-54) :
// - le produit vient du catalogue (?p=…, n'importe quel produit ; introuvable : on le dit), avec son vendeur
//   (palier, Trust Score), sa marque et sa distance du relais ; questions rapides du produit, sinon de son
//   univers, qui remplissent le champ ; vraie saisie ;
// - une conversation déjà ouverte avec ce vendeur sur ce produit est montrée (dernier échange) : la question
//   s'y ajoute ;
// - « Envoyer ma question » crée (ou complète) la conversation avec le vendeur dans la messagerie (filtre
//   « Vendeurs ») ; numéros, e-mails et liens sont masqués avant l'envoi, et la page le dit ;
// - « Voir la conversation » ouvre le fil ; le vendeur répond là.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { useDes } from '../../composants/ecran'
import { Aside, Colonne } from '../../composants/Gabarits'
import { Dessin } from '../../composants/Dessin'
import { useLieu } from '../../composants/PourQui'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { source, type Conversation, type Masque, type Produit } from '../../donnees/source'
import { usePreferences } from '../../preferences'

// Questions rapides : celles du produit, sinon celles de son univers.
const QUESTIONS: Record<string, string[]> = {
  camon30: ['La boîte est-elle scellée ?', 'Qu’y a-t-il dans la boîte ?', 'Que couvre la garantie ?'],
  coque30: ['Elle protège la caméra ?', 'Quelles couleurs avez-vous ?'],
  galaxya15: ['La boîte est-elle scellée ?', 'Le chargeur est-il fourni ?', 'Que couvre la garantie ?'],
  pagne: ['Il est en coton ?', 'Il déteint au lavage ?', 'Vous avez d’autres motifs ?'],
  robewax: ['Quelles tailles avez-vous ?', 'Elle taille grand ou petit ?'],
  montre: ['Elle est étanche ?', 'Le bracelet se change ?'],
  cartable: ['Il est imperméable ?', 'Quelles couleurs avez-vous ?'],
  tv43: ['Il a la TNT intégrée ?', 'Que couvre la garantie ?'],
  ventilo: ['Il fait du bruit ?', 'Il a une télécommande ?'],
}
const PAR_UNIVERS: Record<string, string[]> = {
  tel: ['La boîte est-elle scellée ?', 'Le chargeur est-il fourni ?', 'Que couvre la garantie ?'],
  elec: ['Que couvre la garantie ?', 'Il est neuf ou reconditionné ?', 'La notice est-elle en français ?'],
  femme: ['Quelles tailles avez-vous ?', 'Elle taille grand ou petit ?', 'Quelle est la matière ?'],
  homme: ['Quelles tailles avez-vous ?', 'Il taille grand ou petit ?', 'Quelle est la matière ?'],
  chauss: ['La pointure taille normalement ?', 'Quelles pointures avez-vous ?'],
  beaute: ['Quelle est la date de péremption ?', 'Le produit est-il scellé ?'],
  maison: ['Que couvre la garantie ?', 'Quelles sont les dimensions ?'],
  marche: ['Quelle est la date de péremption ?', 'Le sac est-il bien fermé ?'],
  bebe: ['À partir de quel âge ?', 'Quelle est la matière ?'],
  sport: ['Quelle taille avez-vous ?', 'Il est neuf ?'],
}
const questionsDe = (pr: Produit) => QUESTIONS[pr.p] ?? PAR_UNIVERS[pr.univers] ?? ['Il est neuf ?', 'Quand pouvez-vous l’envoyer au relais ?']

export function Question() {
  const { t, tf } = usePreferences()
  const lieuR = useLieu()
  const [params] = useSearchParams()
  const cle = params.get('p') ?? 'camon30'
  const [pr, setPr] = useState<Produit | null | undefined>(undefined)
  const [deja, setDeja] = useState<Conversation | null>(null)
  const [texte, setTexte] = useState('')
  const [vu, setVu] = useState(false)
  const [envoye, setEnvoye] = useState<{ id: string; masques: Masque[] } | null>(null)
  // Dès 1024 px : le formulaire à gauche, le produit et son vendeur dans l'aside à droite (§ 5.5).
  const tabL = useDes('tab-l')
  useEffect(() => {
    source.produit(cle).then(setPr)
    // Conversation déjà ouverte sur ce produit (la messagerie la relie à la fiche).
    source.conversations().then((x) => setDeja(x.conversations.find((c) => c.type === 'vendeur' && !!c.entete.lien?.vers.endsWith('?p=' + cle)) ?? null))
  }, [cle])
  const erreur = texte.trim().length < 5 ? 'Écris ta question (5 caractères au moins).' : null
  if (pr === undefined) return null
  if (!pr)
    return (
      <Ecran route="question">
        <div className="card">
          <div className="empty">
            <div className="ei">
              <Icone nom="search" taille={26} />
            </div>
            <h3>{t('Produit introuvable')}</h3>
            <p>{t('Il a peut-être été retiré de la vente. Cherche un produit proche.')}</p>
            <div className="btns">
              <Link to={chemin('recherche')} className="btn primary">
                <span>{t('Chercher un produit')}</span>
              </Link>
            </div>
          </div>
        </div>
      </Ecran>
    )
  const p = { titre: pr.titre, sous: pr.variante ?? pr.sousCategorie ?? pr.universTitre, dessin: pr.dessins[0] ?? '', questions: questionsDe(pr) }

  const envoyer = async () => {
    setVu(true)
    if (erreur) return
    setEnvoye(await source.poserQuestion({ cle, titre: p.titre, dessin: p.dessin }, texte.trim()))
  }
  const ajouter = (q: string) =>
    setTexte((x) => {
      const v = t(q)
      return x.trim() ? x.trim() + ' ' + v : t('Bonjour, ') + v.charAt(0).toLowerCase() + v.slice(1)
    })

  const produit = (
    <div className="card row cl06-tw" style={{ gap: '12px' }}>
      <span className="thumb" style={{ width: '52px', height: '52px', borderRadius: '13px' }}>
        <Dessin id={p.dessin} />
      </span>
      <div className="grow">
        <div className="t15 b8">{t(p.titre)}</div>
        <div className="t13 c3">
          {t(p.sous)}
          {pr.marque && ' · ' + pr.marque}
        </div>
        <div className="mt6">
          <span className={'tier ' + ({ Argent: 'argent', Bronze: 'bronze', Platine: 'platine' }[pr.vendeur.palier] ?? 'orm')}>
            <Icone nom="badge-check" taille={14} />
            {tf('Vendeur certifié {p} · Trust Score {s}', { p: t(pr.vendeur.palier), s: pr.vendeur.score })}
          </span>
        </div>
        <div className="t12 c3 mt4">{lieuR.r('{z} · à {k} km de ton relais', { z: t(pr.vendeur.zone), k: String(pr.vendeur.km).replace('.', ',') })}</div>
      </div>
    </div>
  )

  if (envoye)
    return (
      <Ecran route="question" gabarit="colonnes">
        <Colonne classe="q-l">
          <div className="pg">
            <h1 className="pg-t">{t('Question envoyée')}</h1>
            <p className="pg-s">{t('Le vendeur te répond ici. Tu reçois une notification dès sa réponse.')}</p>
          </div>
          {!tabL && produit}
          {envoye.masques.length > 0 && (
            <div className="note amber">
              <Icone nom="eye-off" taille={18} />
              <div>
                <b>{t('Coordonnées masquées automatiquement')}</b>
                {t(', pour toi comme pour le vendeur. Ici, on s’écrit sans coordonnées, et tout reste tracé.')}
              </div>
            </div>
          )}
          <div className="btns mt16">
            <Link to={chemin('fil', { id: envoye.id })} className="btn primary">
              <Icone nom="messages-square" taille={18} />
              <span>{t('Voir la conversation')}</span>
            </Link>
          </div>
          <div className="btns">
            <Link to={chemin('fiche', { p: cle })} className="btn secondary">
              <span>{t('Retour au produit')}</span>
            </Link>
          </div>
          <div className="hint-l">
            <Icone nom="inbox" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{t('Tes questions aux vendeurs sont dans Messagerie, filtre « Vendeurs ».')}</span>
          </div>
        </Colonne>
        {tabL && <Aside titre="Produit et vendeur">{produit}</Aside>}
      </Ecran>
    )

  return (
    <Ecran route="question" gabarit="colonnes">
      <Colonne classe="q-l">
        <div className="pg">
          <h1 className="pg-t">{t('Ta question au vendeur')}</h1>
          <p className="pg-s">{t('Il te répond ici, dans la messagerie BelivaY.')}</p>
        </div>
        {!tabL && produit}
        {deja && (
          <div className="note ink">
            <Icone nom="messages-square" taille={18} />
            <div>
              <b>{t('Tu as déjà écrit au vendeur de ce produit.')}</b>
              {deja.apercu && <> {t(deja.apercu)}</>} <Link to={chemin('fil', { id: deja.id })}>{t('Voir la conversation')}</Link>
              <div className="t12 c3 mt4">{t('Ta nouvelle question s’ajoute à cette conversation.')}</div>
            </div>
          </div>
        )}
        <div className="chips mt14">
          {p.questions.map((q) => (
            <a key={q} href="#" className="chip" onClick={(e) => (e.preventDefault(), ajouter(q))}>
              {t(q)}
            </a>
          ))}
        </div>
        <div className="fld">
          <label htmlFor="q-texte">{t('Ta question')}</label>
          <div className={'inp area' + (vu && erreur ? ' err' : '')}>
            <textarea id="q-texte" rows={3} maxLength={500} value={texte} placeholder={t('Écris ta question…')} onChange={(e) => setTexte(e.target.value)} />
          </div>
          <div className="hint" style={vu && erreur ? { color: 'var(--red)' } : undefined}>
            {t(vu && erreur ? erreur : `${texte.length}/500`)}
          </div>
        </div>
        <div className="card flat mt12">
          <div className="cl06-ck">
            <Icone nom="venetian-mask" taille={17} />
            <span>{t('Anonyme des deux côtés : il ne voit ni ton nom ni ton numéro.')}</span>
          </div>
          <div className="cl06-ck">
            <Icone nom="eye-off" taille={17} />
            <span>{t('Numéros, e-mails et comptes de réseaux sociaux sont masqués automatiquement.')}</span>
          </div>
          <div className="cl06-ck">
            <Icone nom="message-square-text" taille={17} />
            <span>{t('Jamais par WhatsApp : ici, tout reste écrit et tracé.')}</span>
          </div>
        </div>
        <div className="btns mt16">
          <button type="button" className="btn primary" onClick={envoyer}>
            <Icone nom="send" taille={18} />
            <span>{t('Envoyer ma question')}</span>
          </button>
        </div>
        <div className="hint-l">
          <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('Un souci avec une commande ? Utilise « Signaler un problème » dans la commande.')}</span>
        </div>
      </Colonne>
      {tabL && <Aside titre="Produit et vendeur">{produit}</Aside>}
    </Ecran>
  )
}
