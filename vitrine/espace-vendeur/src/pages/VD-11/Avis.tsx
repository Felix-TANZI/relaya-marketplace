// Avis et droit de réponse (VD-11) : repris du prototype (route('avis')), branché sur la source.
// Règles VD11-R56 à R58, AVI-01, Q-71, Q-88, REFVD-R309 :
// - seuls les clients qui ont payé et retiré notent (achat vérifié) ; carte nuit : note moyenne, étoiles, nombre
//   d'avis vérifiés, poids dans le Trust Score ; aucun avis : « Pas encore d'avis » ;
// - « Répondre en privé » seulement sur un avis de moins de 30 jours sans réponse, date limite en toutes lettres ;
//   la réponse passe par le support, sans le nom de la boutique (conversation « Support BelivaY ») ;
// - interdits : répondre publiquement, négocier un avis contre un remboursement, supprimer un avis ; un avis n'est
//   retiré que pour insulte, coordonnées ou hors sujet (Q-71) ; aucune donnée du client (anonymat).
// Ajouts : filtres par note et « sans réponse », journal de la commande, numéros et liens refusés dans la réponse.
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { Avis as UnAvis } from '../../donnees/domaines/boutique'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { OngletsAvisQuestions } from './AvisQuestions'
import { jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useHorloge, useSession } from '../../session'
import { BandeauHorsLigne, Bouton, Chargement, ErreurLecture, Feuille, ZONE, ilYa, useFeuilleAdresse } from './communs'

type Filtre = 'tous' | 'bas' | 'moyen' | 'haut' | 'sans'
const ETAPES = { prete: 'Prête', ramassage: 'Ramassage', tournee: 'Tournée' } as const

function Etoiles({ n, sombre }: { n: number; sombre?: boolean }) {
  const { tf } = usePreferences()
  const pleines = Math.round(n)
  return (
    <span role="img" aria-label={tf('{n} étoiles sur 5', { n: String(n).replace('.', ',') })}>
      <span style={{ color: 'var(--gold)', letterSpacing: '1px' }} aria-hidden="true">
        {'★'.repeat(pleines)}
      </span>
      <span style={{ color: sombre ? 'rgba(255,255,255,.25)' : 'var(--sand-4)' }} aria-hidden="true">
        {'★'.repeat(5 - pleines)}
      </span>
    </span>
  )
}

export default function Avis() {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const maintenant = useHorloge()
  const naviguer = useNavigate()
  const prep = s.membre?.role === 'preparation'
  const lecture = useLecture(() => source.boutique.avis(), [])
  const repondre = useFeuilleAdresse('repondre')
  const [cible, setCible] = useState<UnAvis | null>(null)
  const [texte, setTexte] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [filtre, setFiltre] = useState<Filtre>('tous')
  const d = lecture.donnees

  const ouvrir = (a: UnAvis) => {
    setCible(a)
    setTexte('')
    setErreur(null)
    repondre.ouvrir()
  }
  const filtreAvis = source.messages.filtrer(texte)
  const envoyer = async () => {
    if (!cible) return
    const r = await source.boutique.repondreAvis(cible.id, texte)
    if (!r.ok) {
      jouer('erreur')
      return setErreur(t(r.raison === 'trop_court' ? 'Écrivez au moins une phrase (10 caractères).' : r.raison === 'coordonnees' ? 'Pas de numéro, d’e-mail ni de lien : la réponse passe sans coordonnées.' : r.raison === 'deja_repondu' ? 'Vous avez déjà répondu à cet avis.' : 'Le délai de 30 jours est passé.'))
    }
    jouer('envoi')
    naviguer(chemin('messages', { fil: r.fil }))
  }

  if (!d)
    return (
      <Ecran route="avis">
        <div className="pg">
          <h1 className="pg-t">{t('Avis')}</h1>
        </div>
        {lecture.erreur ? <ErreurLecture erreur={lecture.erreur} relire={lecture.relire} /> : <Chargement />}
      </Ecran>
    )
  const ouvert = (a: UnAvis) => !a.reponse && maintenant <= a.limiteReponse
  const visibles = d.liste.filter((a) => (filtre === 'bas' ? a.note <= 2 : filtre === 'moyen' ? a.note === 3 : filtre === 'haut' ? a.note >= 4 : filtre === 'sans' ? ouvert(a) : true))
  const note = d.note === null ? null : langue === 'en' ? d.note.toFixed(1) : d.note.toFixed(1).replace('.', ',')
  const puce = (v: Filtre, libelle: string, n: number) => (
    <button key={v} type="button" className={'chip' + (filtre === v ? ' on' : '')} aria-pressed={filtre === v} onClick={() => setFiltre(v)}>
      {t(libelle)}
      <span className="n">{n}</span>
    </button>
  )
  return (
    <Ecran
      route="avis"
      fixes={
        <Feuille ouverte={repondre.ouverte && !!cible && !prep} fermer={repondre.fermer} titre="Répondre en privé">
          {cible && (
            <>
              <h3 style={{ margin: '0', fontSize: '19px', fontWeight: '800' }}>{t('Répondre en privé')}</h3>
              <p className="t13 c3" style={{ margin: '6px 0 0', lineHeight: '1.45' }}>
                {tf('Le support transmet votre réponse au client de {ref}, sans le nom de votre boutique. Jusqu’au {d}.', { ref: cible.ref, d: jourLong(cible.limiteReponse, langue) })}
              </p>
              {cible.commentaire && (
                <div className="t14 c2 mt8" style={{ lineHeight: '1.5', fontStyle: 'italic' }}>
                  {`« ${cible.commentaire} »`}
                </div>
              )}
              <div className="fld">
                <label htmlFor="avis-reponse">{t('Votre réponse')}</label>
                <textarea id="avis-reponse" rows={4} maxLength={500} value={texte} onChange={(e) => (setTexte(e.target.value), setErreur(null))} placeholder={t('Ex. : Merci pour votre avis. Nous protégeons mieux les boîtes depuis.')} style={{ ...ZONE, borderColor: erreur ? 'var(--red)' : undefined }} />
                {erreur ? (
                  <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
                    {erreur}
                  </div>
                ) : filtreAvis.filtre ? (
                  <div className="hint" style={{ color: 'var(--amber)' }}>
                    {t('Un numéro, un e-mail ou un lien est dans votre texte : retirez-le pour envoyer.')}
                  </div>
                ) : (
                  <div className="hint">{t('Jamais de remboursement ni de geste contre un avis.')}</div>
                )}
              </div>
              <div className="mt14">
                <Bouton icone="send" inactif={texte.trim().length < 10} onClick={() => void envoyer()}>
                  {t('Envoyer au support')}
                </Bouton>
              </div>
              <div className="mt8">
                <Bouton classe="ghost" onClick={repondre.fermer}>
                  {t('Annuler')}
                </Bouton>
              </div>
            </>
          )}
        </Feuille>
      }
    >
      <div className="pg">
        <h1 className="pg-t">{t('Avis et questions')}</h1>
      </div>
      <OngletsAvisQuestions actif="avis" />
      <BandeauHorsLigne />
      <div className="hero night">
        {note === null ? (
          <>
            <div className="b8 t17">{t('Pas encore d’avis')}</div>
            <div className="hs mt6">{t('Les clients notent après le retrait de leur commande.')}</div>
          </>
        ) : (
          <div className="row">
            <div className="big" style={{ margin: '0' }}>
              {note}
            </div>
            <div className="grow">
              <div style={{ fontSize: '20px' }}>
                <Etoiles n={d.note!} sombre />
              </div>
              <div className="t13 mt4" style={{ color: 'rgba(255,255,255,.78)' }}>
                {tf(d.nombre > 1 ? '{n} avis · achats vérifiés' : '{n} avis · achat vérifié', { n: d.nombre })}
              </div>
            </div>
          </div>
        )}
        <div className="hs mt10">{tf('Les avis comptent pour {p} % de votre Trust Score, votre note de confiance.', { p: d.poidsPourCent })}</div>
      </div>
      <details className="more">
        <summary>
          <Icone nom="star" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">{t('Comment ça marche')}</span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b">
          <p>
            <b>{t('Ce qui compte :')}</b>
            {t(' un avis 4 ou 5 ★ est un succès. Un 3 ★ ne compte ni pour ni contre. 1 ou 2 ★ est un échec léger.')}
          </p>
          <p>
            <b>{t('Votre réponse :')}</b>
            {t(' privée, transmise par le support, pendant 30 jours après l’avis.')}
          </p>
          <p>
            <b>{t('Ce qui est interdit :')}</b>
            {t(' répondre publiquement à un avis, négocier un avis contre un remboursement, supprimer un avis.')}
          </p>
          <p>{t('Un avis n’est retiré par BelivaY que s’il contient une insulte, des coordonnées, ou s’il est hors sujet.')}</p>
        </div>
      </details>
      {d.nombre > 0 && (
        <div className="chips">
          {puce('tous', 'Tous', d.liste.length)}
          {puce('haut', '4 et 5 ★', d.liste.filter((a) => a.note >= 4).length)}
          {puce('moyen', '3 ★', d.liste.filter((a) => a.note === 3).length)}
          {puce('bas', '1 et 2 ★', d.liste.filter((a) => a.note <= 2).length)}
          {!prep && puce('sans', 'À répondre', d.liste.filter(ouvert).length)}
        </div>
      )}
      {d.nombre > 0 && visibles.length === 0 && (
        <div className="card">
          <div className="t14 c2">{t('Aucun avis dans ce filtre.')}</div>
        </div>
      )}
      {visibles.map((a) => (
        <div key={a.id} className="card">
          <div className="row">
            <span className="grow">
              <Etoiles n={a.note} />
            </span>
            {a.verifie && (
              <span className="pill green sm">
                <Icone nom="badge-check" taille={13} />
                {t('Achat vérifié')}
              </span>
            )}
          </div>
          <div className="t14 c2 mt8" style={{ lineHeight: '1.5' }}>
            {a.commentaire ? `« ${a.commentaire} »` : t('Note seule, sans commentaire.')}
          </div>
          <div className="t12 c3 mt6">{`${a.ref} · ${ilYa(a.a, maintenant, langue)} · ${t('client anonyme')}`}</div>
          <details className="more flat">
            <summary>
              <Icone nom="list" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
              <span className="grow">{t('Voir le détail')}</span>
              <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
            </summary>
            <div className="more-b">
              <div className="kick" style={{ marginBottom: '4px' }}>
                {t('Le journal de la commande')}
              </div>
              {a.journal.map((j) => (
                <div key={j.etape} className="kv">
                  <span className="k">{t(ETAPES[j.etape])}</span>
                  <span className="v ">{t(j.texte)}</span>
                </div>
              ))}
              <Link to={chemin('journal', { ref: a.ref })} className="t13 b8 cor" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', minHeight: '44px' }}>
                {t('Ouvrir le journal complet')}
                <Icone nom="chevron-right" taille={16} />
              </Link>
            </div>
          </details>
          {a.reponse ? (
            <div className="hint-l" style={{ color: 'var(--green)' }}>
              <Icone nom="circle-check" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
              <span>
                {tf('Réponse privée transmise par le support le {d}.', { d: jourLong(a.reponse.a, langue) })}{' '}
                <Link to={chemin('messages', { fil: a.reponse.fil })} className="b8 cor">
                  {t('Voir la conversation')}
                </Link>
              </span>
            </div>
          ) : ouvert(a) && !prep ? (
            <>
              <div className="mt4">
                <Bouton icone="message-square" onClick={() => ouvrir(a)}>
                  {t('Répondre en privé')}
                </Bouton>
              </div>
              <div className="t12 c3 mt6 center">{tf('Via le support, sans le nom de votre boutique. Jusqu’au {d}.', { d: jourLong(a.limiteReponse, langue) })}</div>
            </>
          ) : null}
        </div>
      ))}
    </Ecran>
  )
}
