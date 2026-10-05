// Écran « Avis » d'un produit (CL-06), repris pour l'usage réel (DP-54) : note moyenne et répartition, acheteurs
// vérifiés seulement ; filtres (tous, avec photo, par étoiles), tri (récents, plus utiles) ; « Utile » (une
// voix, annulable), « Signaler » ; photos d'acheteurs vers la galerie ; réponse du vendeur ; donner son avis
// quand on a acheté le produit (sinon, quand on pourra) ; nombre d'avis de chaque filtre, filtre vide qu'on
// efface ; une photo d'acheteur ouvre la galerie sur elle ; poser une question au vendeur avant d'acheter.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { useDes } from '../../composants/ecran'
import { Aside, Colonne } from '../../composants/Gabarits'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { source, type AvisProduit, type Produit } from '../../donnees/source'
import { F } from '../../i18n/format'
import { jourSeul } from '../../i18n/dates'
import { usePreferences } from '../../preferences'

function Etoiles({ note }: { note: number }) {
  return (
    <span className="cl06-st" role="img" aria-label={`${String(note).replace('.', ',')} sur 5`}>
      {[1, 2, 3, 4, 5].map((e) => (
        <Icone key={e} nom="star" taille={14} style={e <= Math.round(note) ? { fill: 'var(--or-m)', color: 'var(--or-m)' } : { color: 'var(--ink-4)' }} />
      ))}
    </span>
  )
}

export function Avis() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const cle = params.get('p') ?? 'camon30'
  const [pr, setPr] = useState<Produit | null | undefined>(undefined)
  const [d, setD] = useState<{ repartition: number[]; avis: AvisProduit[] } | null>(null)
  const [filtre, setFiltre] = useState<string>(params.get('f') === 'photo' ? 'photo' : 'tous')
  const [tri, setTri] = useState<'recents' | 'utiles'>('recents')
  const [aNoter, setANoter] = useState<string | null>(null)
  // Dès 1024 px : résumé, filtres et tri dans l'aside à gauche, avis à droite (§ 5.5).
  const tabL = useDes('tab-l')
  const charger = () => source.avisProduit(cle).then(setD)
  useEffect(() => {
    source.produit(cle).then(setPr)
    charger()
    // Produit acheté et retiré, pas encore noté : on peut donner son avis (Écouteurs de BLV-51702 dans le jeu d'essai).
    source.avis('BLV-51702').then((x) => setANoter(x && cle === 'ecouteurs' ? x.commande.ref : null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle])
  if (pr === undefined || (pr && !d)) return null
  if (!pr || !d)
    return (
      <Ecran route="avis">
        <div className="card">
          <div className="empty">
            <h3>{t('Produit introuvable')}</h3>
          </div>
        </div>
      </Ecran>
    )
  const note = Number((pr.note ?? '0').replace(',', '.'))
  const garde = (k: string) => (a: AvisProduit) => k === 'tous' || (k === 'photo' ? !!a.photo : a.note === Number(k))
  const liste = d.avis
    .filter(garde(filtre))
    .sort((a, b) => (tri === 'utiles' ? b.utiles - a.utiles : b.le - a.le))
  const photos = d.avis.filter((a) => a.photo)

  const blocPhotos = photos.length > 0 && (
    <>
      <div className="cl06-sc">
        <b>{t('Photos d’acheteurs')}</b>
        <span>{tf('{n} photos', { n: photos.length })}</span>
      </div>
      <div className="cl06-phs">
        {photos.map((a) => (
          <Link key={a.id} to={chemin('galerie', { p: pr.p, a: a.id })} aria-label={t('Photo d’acheteur')}>
            <Dessin id={a.photo!} />
          </Link>
        ))}
      </div>
    </>
  )
  return (
    <Ecran route="avis" gabarit="colonnes" inverse>
      <Aside titre="Résumé des avis" classe="av-l">
        <Link to={chemin('fiche', { p: pr.p })} className="card row cl06-rc" style={{ gap: '12px' }}>
          <span className="thumb" style={{ width: '52px', height: '52px', borderRadius: '13px' }}>
            {(pr.dessins[0] || pr.images?.[0]) && <Dessin id={pr.dessins[0] ?? ''} image={pr.images?.[0]} alt={pr.titre} tailles="64px" />}
          </span>
          <div className="grow">
            <div className="t15 b8">{t(pr.titre)}</div>
            <div className="mt4">
              <span className="price">{F(pr.prix)} F</span>
            </div>
          </div>
          <Icone nom="chevron-right" taille={18} />
        </Link>
        <div className="card cl06-sum">
          <div className="cl06-sl">
            <div className="cl06-avg">{pr.note}</div>
            <div className="mt6">
              <Etoiles note={note} />
            </div>
            <div className="t12 c3 mt6">{tf('{n} avis vérifiés', { n: pr.avis })}</div>
          </div>
          <div className="grow">
            {d.repartition.map((x, i) => (
              <a key={i} href="#" className="cl06-h5" onClick={(e) => (e.preventDefault(), setFiltre(String(5 - i)))} aria-label={tf('Voir les avis {n} étoiles', { n: 5 - i })}>
                <span>{5 - i}</span>
                <i style={{ flex: 1, height: 6, borderRadius: 4, background: 'var(--line)', overflow: 'hidden', display: 'block' }}>
                  <b style={{ display: 'block', height: '100%', width: x + '%', background: 'var(--or-m)' }} />
                </i>
                <span>{x}&nbsp;%</span>
              </a>
            ))}
          </div>
        </div>
        <div className="hint-l">
          <Icone nom="shield-check" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('Acheteurs vérifiés seulement : ils ont payé et retiré le produit. Avis cumulés sur toutes ses offres.')}</span>
        </div>
        {aNoter ? (
          <div className="btns">
            <Link to={chemin('avis-donner', { ref: aNoter })} className="btn primary">
              <Icone nom="star" taille={18} />
              <span>{t('Donner mon avis')}</span>
            </Link>
          </div>
        ) : (
          <div className="hint-l">
            <Icone nom="star" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{t('Tu pourras donner ton avis après avoir retiré ce produit au relais.')}</span>
          </div>
        )}
        {!tabL && blocPhotos}
        <div className="chips cl06-fl" style={{ flexWrap: 'nowrap', overflowX: 'auto' }}>
          {[
            ['tous', 'Tous'],
            ['photo', 'Avec photo'],
            ['5', '5 ★'],
            ['4', '4 ★'],
            ['3', '3 ★'],
            ['2', '2 ★'],
            ['1', '1 ★'],
          ].map(([k, x]) => (
            <a key={k} href="#" className={'chip' + (filtre === k ? ' on' : '')} aria-pressed={filtre === k} onClick={(e) => (e.preventDefault(), setFiltre(k))}>
              {t(x)} <span className="n">{d.avis.filter(garde(k)).length}</span>
            </a>
          ))}
        </div>
        <div className="sec">
          <h2>{t(tri === 'recents' ? 'Les plus récents' : 'Les plus utiles')}</h2>
          <a href="#" className="a" onClick={(e) => (e.preventDefault(), setTri(tri === 'recents' ? 'utiles' : 'recents'))}>
            {t(tri === 'recents' ? 'Trier par utilité' : 'Trier par date')}
          </a>
        </div>
      </Aside>
      <Colonne>
        {tabL && blocPhotos}
        {!liste.length && (
          <div className="card">
            <div className="empty">
              <h3>{t(d.avis.length ? 'Aucun avis dans ce filtre.' : 'Pas encore d’avis sur ce produit')}</h3>
              <p>{t(d.avis.length ? 'Essaie un autre filtre, ou regarde tous les avis.' : 'Les premiers acheteurs donnent leur avis après le retrait. Une question ? Pose-la au vendeur.')}</p>
              {d.avis.length > 0 && (
                <div className="btns">
                  <button type="button" className="btn secondary" onClick={() => setFiltre('tous')}>
                    <span>{t('Voir tous les avis')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        {liste.map((a) => (
          <div key={a.id} className="card cl06-rv">
            <div className="row" style={{ gap: '10px', alignItems: 'flex-start' }}>
              <span className="cl06-av">
                <Icone nom="user-check" taille={16} />
              </span>
              <div className="grow">
                <div className="row" style={{ justifyContent: 'space-between', gap: '8px' }}>
                  <Etoiles note={a.note} />
                  <span className="pill green sm">{t('Acheteur vérifié')}</span>
                </div>
                <div className="cl06-rm">
                  <span>{jourSeul(a.le, langue)}</span>
                  {a.variante && (
                    <>
                      {' · '}
                      <span>{t(a.variante)}</span>
                    </>
                  )}
                </div>
                <p>{t(a.texte)}</p>
                {a.photo && (
                  <Link to={chemin('galerie', { p: pr.p, a: a.id })} className="cl06-rph" aria-label={t('Photo d’acheteur')}>
                    <Dessin id={a.photo} />
                  </Link>
                )}
                {a.reponse && (
                  <div className="note ink mt8">
                    <Icone nom="store" taille={16} />
                    <div>
                      <b>{t('Réponse du vendeur')}</b> · {t(a.reponse)}
                    </div>
                  </div>
                )}
                <div className="links" style={{ justifyContent: 'flex-start', gap: 16 }}>
                  <a href="#" aria-pressed={a.monVote} onClick={(e) => (e.preventDefault(), source.voterAvis(pr.p, a.id, 'utile').then(charger))} style={a.monVote ? { fontWeight: 800 } : undefined}>
                    <Icone nom="thumbs-up" taille={14} /> {tf('Utile ({n})', { n: a.utiles })}
                  </a>
                  {a.signale ? (
                    <span className="t12 c3">{t('Signalé : une personne vérifie.')}</span>
                  ) : (
                    <a href="#" onClick={(e) => (e.preventDefault(), source.voterAvis(pr.p, a.id, 'signaler').then(charger))}>
                      <Icone nom="flag" taille={14} /> {t('Signaler')}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        <Link to={chemin('question', { p: pr.p })} className="card row mt12" style={{ gap: '12px' }}>
          <span className="cl06-av">
            <Icone nom="messages-square" taille={16} />
          </span>
          <span className="grow">
            <b className="t14" style={{ display: 'block' }}>
              {t('Pas trouvé ta réponse ?')}
            </b>
            <span className="t13 c3">{t('Pose ta question au vendeur, sans donner ton numéro.')}</span>
          </span>
          <Icone nom="chevron-right" taille={18} />
        </Link>
      </Colonne>
    </Ecran>
  )
}
