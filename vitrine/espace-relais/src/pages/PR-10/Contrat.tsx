// Page ajoutée « Convention et annexes » (documents?doc=…, depuis Documents : même route, donc mêmes droits ; PR-CT01, PR-CT02, PR-CT03, PR-CT04 ;
// PR-CT01-R05 à R07, R19, R20, PR-CT04-R01 ; ARL-124). Le contractuel se VOIT (DP-66/67 appliquées au relais) : la
// convention signée (version, date, signataire, articles qui règlent le quotidien), l'annexe 1 (rémunération et grille
// de garde, lues dans le registre par le serveur), l'annexe 2 (interdits et charte de preuve), l'annexe 3 (fiche
// d'ouverture : places déclarées et vérifiées par emplacement, local, étapes d'activation datées, partenaire
// fondateur, grille). ?doc=convention | annexe1 | annexe2 | annexe3. Gérant seul (comme Documents).
// Toute évolution est annoncée 30 jours avant et acceptée dans l'application (PR-CT01-R20) : rien ne se modifie ici.
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { Contrat as ContratRelais, FicheRelais } from '../../donnees/domaines/relais'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { creneau, jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { Chargement, ErreurLecture, useTexteRegle } from './commun'

const DOCS = [
  ['convention', 'Convention'],
  ['annexe1', 'Annexe 1'],
  ['annexe2', 'Annexe 2'],
  ['annexe3', 'Annexe 3'],
] as const
type Doc = (typeof DOCS)[number][0]
const JOURS_LONGS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const EMPLACEMENTS: Record<string, string> = { A: 'A · étagère des petits colis', B: 'B · étagère des moyens', C: 'C · sol des encombrants', R: 'R · zone des retours' }

export function Contrat() {
  const contrat = useLecture(() => source.relais.contrat(), [])
  const relais = useLecture(() => source.relais.relais(), [])
  const [params] = useSearchParams()
  const doc = (DOCS.find(([d]) => d === params.get('doc'))?.[0] ?? 'convention') as Doc
  const { t } = usePreferences()
  const c = contrat.donnees
  const f = relais.donnees
  if (!c || !f)
    return (
      <Ecran route="documents" titre={t('Convention et annexes')} retour={chemin('documents')}>
        {contrat.erreur || relais.erreur ? <ErreurLecture relire={() => (contrat.relire(), relais.relire())} /> : <Chargement />}
      </Ecran>
    )
  return <Contenu c={c} f={f} doc={doc} />
}

function Contenu({ c, f, doc }: { c: ContratRelais; f: FicheRelais; doc: Doc }) {
  const { t, tf, langue } = usePreferences()
  const texte = useTexteRegle()
  const annexe = c.annexes.find((a) => a.id === doc)
  return (
    <Ecran route="documents" titre={t('Convention et annexes')} retour={chemin('documents')}>
      <div className="p-0hxmj8 r-pile">
        <div>
          <h1 className="p-bvhkrl">{t(doc === 'convention' ? 'Convention de partenariat' : annexe!.titre)}</h1>
          <div className="p-t2u0o2">{tf('Version {v} du {date} · acceptée le {signee} par {qui}, dans l’application.', { v: c.convention.version, date: jourLong(c.convention.du, langue), signee: jourLong(c.convention.signeeLe, langue), qui: c.convention.signataire })}</div>
        </div>
        <nav className="p10-onglets" aria-label={t('Documents de la convention')}>
          {DOCS.map(([d, nom]) => (
            <Link key={d} to={chemin('documents', { doc: d })} replace className="p10-onglet" aria-current={d === doc ? 'page' : undefined}>
              {t(nom)}
            </Link>
          ))}
        </nav>
        {doc === 'convention' &&
          c.convention.articles.map((a) => (
            <section key={a.numero} className="p-yi6rkz p10-article" aria-labelledby={'p10-art-' + a.numero}>
              <h3 id={'p10-art-' + a.numero}>{tf('Article {n} · {titre}', { n: a.numero, titre: t(a.titre) })}</h3>
              <ul className="p10-liste">
                {a.points.map((p) => (
                  <li key={p.texte}>{texte(p)}</li>
                ))}
              </ul>
            </section>
          ))}
        {(doc === 'annexe1' || doc === 'annexe2') && annexe && (
          <section className="p-yi6rkz" aria-label={t(annexe.titre)}>
            <ul className="p10-liste">
              {annexe.points.map((p) => (
                <li key={p.texte}>{texte(p)}</li>
              ))}
            </ul>
          </section>
        )}
        {doc === 'annexe3' && (
          <>
            <section className="p-yi6rkz" aria-labelledby="p10-f-places">
              <h2 className="p-9j1bbu" id="p10-f-places">
                {t('Le local et les places')}
              </h2>
              {c.fiche.emplacements.map((e) => (
                <div key={e.code} className="p-mqmvkk">
                  <span className="p-ytl255">{t(EMPLACEMENTS[e.code])}</span>
                  <span className="p-2vq92h">
                    {e.places === null ? t('hors capacité') : tf('{n} places', { n: e.places })} {e.verifie && <span className="p10-coche">{t('· vérifié')}</span>}
                  </span>
                </div>
              ))}
              <div className="p-mqmvkk">
                <span className="p-ytl255">{t('Places déclarées aujourd’hui')}</span>
                <span className="p-2vq92h">{f.capacite.placesDeclarees}</span>
              </div>
              <ul className="p10-liste">
                {c.fiche.local.abri && <li>{t('Local à l’abri de la pluie, colis hors de la vue et de la portée du public.')}</li>}
                {c.fiche.local.photos && <li>{t('Photos de la façade, du comptoir et du rangement reçues.')}</li>}
                <li>{t('Encombrants toujours acceptés : un relais ne refuse jamais un colis petit, moyen ou encombrant.')}</li>
              </ul>
            </section>
            <section className="p-yi6rkz" aria-labelledby="p10-f-horaires">
              <h2 className="p-9j1bbu" id="p10-f-horaires">
                {t('Horaires déclarés')}
              </h2>
              {f.horaires.semaine.map((p, k) => (
                <div key={k} className="p-mqmvkk">
                  <span className="p-ytl255">{t(JOURS_LONGS[k])}</span>
                  <span className="p-2vq92h">{p.ferme ? t('Fermé') : creneau([p.ouverture!, p.fermeture!], langue) + (p.pause ? ' · ' + tf('pause {h}', { h: creneau([p.pause.de, p.pause.a], langue) }) : '')}</span>
                </div>
              ))}
              <Link to={chemin('capacite')} className="p-4u28q4 p10-cible">
                {t('Demander un changement d’horaires')}
              </Link>
            </section>
            <section className="p-yi6rkz" aria-labelledby="p10-f-etapes">
              <h2 className="p-9j1bbu" id="p10-f-etapes">
                {t('Les étapes d’activation')}
              </h2>
              {c.fiche.etapes.map((e, i) => (
                <div key={e.id} className="p-mqmvkk">
                  <span className="p-ytl255">{tf('{n}. {titre}', { n: i + 1, titre: t(e.titre) })}</span>
                  <span className="p-2vq92h">{jourLong(e.le, langue)}</span>
                </div>
              ))}
              <div className="p-mqmvkk">
                <span className="p-ytl255">{t('Ouvert le')}</span>
                <span className="p-2vq92h">{jourLong(c.fiche.ouvertLe, langue)}</span>
              </div>
              <div className="p-mqmvkk">
                <span className="p-ytl255">{t('Visite et fiche remplie avec')}</span>
                <span className="p-2vq92h">{c.fiche.agent}</span>
              </div>
            </section>
            <section className="p-yi6rkz" aria-labelledby="p10-f-statut">
              <h2 className="p-9j1bbu" id="p10-f-statut">
                {t('Statut et rémunération')}
              </h2>
              {c.fiche.fondateur && (
                <div className="p-mqmvkk">
                  <span className="p-ytl255">{t('Partenaire fondateur')}</span>
                  <span className="p-2vq92h">{tf('n° {n} sur {sur}', { n: c.fiche.fondateur.numero, sur: c.fiche.fondateur.sur })}</span>
                </div>
              )}
              {c.fiche.fondateur?.exclusiviteJusquau && (
                <div className="p-mqmvkk">
                  <span className="p-ytl255">{tf('Exclusivité de {m} mètres jusqu’au', { m: c.fiche.fondateur.exclusiviteM })}</span>
                  <span className="p-2vq92h">{jourLong(c.fiche.fondateur.exclusiviteJusquau, langue)}</span>
                </div>
              )}
              <div className="p-mqmvkk">
                <span className="p-ytl255">{t('Rémunération')}</span>
                <span className="p-2vq92h">{t(c.fiche.grille === 'standard' ? 'grille standard (annexe 1)' : 'accord particulier')}</span>
              </div>
            </section>
          </>
        )}
        <div className="p-16950n">
          <Icone nom="r-document" taille={16} /> {tf('Toute évolution de la convention, de la rémunération ou de la grille vous est annoncée {j} jours avant, jamais rétroactive, et acceptée dans l’application.', { j: f.regles.grillePreavisJours })}
        </div>
      </div>
    </Ecran>
  )
}
