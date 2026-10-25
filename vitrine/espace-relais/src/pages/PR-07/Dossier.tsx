// Dossier d'un constat ou d'un signalement (page ajoutée à « Constats et retours », PR-07 § 1 « Dossiers » ; MSG-03,
// ARL-22, ARL-40, DP-35). Le gérant y suit les 5 étapes et l'échéance, répond à une demande de BelivaY (photo prise par
// l'application), écrit dans le fil tant qu'il est ouvert, lit la décision et, si elle le met en cause, la CONTESTE une
// fois dans le délai (gérant seulement). Fil fermé à la clôture définitive, lisible PR-PREUVES-CONSERV-J jours.
// Le relais constate, BelivaY décide : aucun bouton ne tranche, ne rembourse ni ne retient.
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Feuille } from '@client/composants/Feuille'
import { F } from '@client/i18n/format'
import { AccesReserve } from '../../composants/AccesReserve'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { usePeut, usePeutOuvrir } from '../../config/droits'
import { chemin } from '../../config/pages'
import type { Photo } from '../../donnees/communs'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { echeance, heure, jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { Avis, Chargement, ErreurLecture, MOTIF_LIBELLE, PrisePhoto, Vignette, dateCourte, useGeste } from './commun'
import { BarreEtapes, useEcheance } from './Litiges'
import { REGLES as R } from './regles'
import './pr07.css'

export default function Dossier() {
  const peut = usePeutOuvrir('dossier-litige')
  if (!peut) return <AccesReserve route="dossier-litige" />
  return <DossierOuvert />
}

function DossierOuvert() {
  const { t, tf, langue } = usePreferences()
  const { maintenant } = useSession()
  const [params] = useSearchParams()
  const id = params.get('id') ?? ''
  const l = useLecture(async () => ({ r: await source.incidents.dossier(id) }), [id])
  const peutContester = usePeut('contesterDecision')
  const texteEcheance = useEcheance()
  const { faire, occupe } = useGeste()
  const [camera, setCamera] = useState<'demande' | 'fil' | null>(null)
  const [texte, setTexte] = useState('')
  const [pieces, setPieces] = useState<Photo[]>([])
  const [contester, setContester] = useState(false)
  const [motif, setMotif] = useState('')
  const [avis, setAvis] = useState<{ ton: 'vert' | 'ambre' | 'rouge'; texte: string } | null>(null)
  const d = l.donnees?.r ?? null
  const retour = chemin('litiges', { onglet: 'dossiers' })

  const titre = d ? tf('Dossier {ref}', { ref: d.litige ?? d.id }) : t('Dossier')
  if (l.erreur)
    return (
      <Ecran route="dossier-litige" titre={titre} retour={retour}>
        <div className="p-0hxmj8 r-pile r7">
          <ErreurLecture relire={l.relire} />
        </div>
      </Ecran>
    )
  if (!d)
    return (
      <Ecran route="dossier-litige" titre={titre} retour={retour}>
        <div className="p-0hxmj8 r-pile r7">
          {!l.donnees ? (
            <Chargement />
          ) : (
            <div className="r-vide" role="alert">
              <div className="r-vide-i">
                <Icone nom="r-balance" taille={28} />
              </div>
              <h2>{t('Dossier introuvable')}</h2>
              <p>{t('Ce dossier n’existe pas ou n’est plus lisible au relais.')}</p>
              <Link className="r-btn r-second r7-mt" to={retour}>
                {t('Voir les dossiers')}
              </Link>
            </div>
          )}
        </div>
      </Ecran>
    )

  const issue = (ok: boolean, file: boolean, oui: string, non: string) => setAvis(ok ? { ton: file ? 'ambre' : 'vert', texte: file ? t('Gardé sur le téléphone : envoyé au retour du réseau.') : oui } : { ton: 'rouge', texte: non })

  const ajouterPhoto = async (ph: Photo) => {
    const x = await faire('photo', d.id, (s, o) => s.incidents.ajouterPhotos(d.id, [ph], o), { photos: 1 })
    if (x) issue(x.r.ok, x.etat === 'en_file', t('Photo ajoutée au dossier : BelivaY la voit tout de suite.'), t('Le dossier est clos : la photo n’a pas été ajoutée.'))
  }
  const envoyer = async () => {
    const x = await faire('message', d.id, (s, o) => s.incidents.ecrire(d.id, texte, pieces, o), { photos: pieces.length })
    if (!x) return
    issue(x.r.ok, x.etat === 'en_file', t('Message envoyé à BelivaY.'), t('Le fil est fermé : message non envoyé.'))
    if (x.r.ok) {
      setTexte('')
      setPieces([])
    }
  }
  const envoyerContestation = async () => {
    const x = await faire('message', d.id, (s, o) => s.incidents.contester(d.id, motif, o))
    if (!x) return
    setContester(false)
    issue(x.r.ok, x.etat === 'en_file', t('Contestation envoyée : une autre personne de BelivaY la réexamine. Rien n’est retenu pendant l’examen.'), x.r.ok ? '' : x.r.raison === 'delai_depasse' ? t('Le délai de contestation est dépassé.') : x.r.raison === 'deja_contestee' ? t('Cette décision a déjà été contestée.') : t('Contestation refusée.'))
  }

  const dec = d.decision
  const contestable = !!dec?.relaisEnCause && !dec.contestation && (dec.contestableJusqua ?? 0) > maintenant
  const ech = texteEcheance(d)
  return (
    <Ecran route="dossier-litige" titre={titre} retour={retour}>
      <div className="p-0hxmj8 r-pile r7">
        <div className="p-yi6rkz">
          <div className="p-o24hsm">
            <div className="p-9exjl6">
              <Icone nom="r-balance" taille={20} className="p-lhsznn" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">{`${d.litige ?? d.id} · ${d.colis}`}</div>
              <div className="p-dfa05r">
                {d.origine === 'client'
                  ? tf('{motif} · signalé par le client le {date}', { motif: t(MOTIF_LIBELLE[d.motif]), date: dateCourte(d.ouvertA, langue) })
                  : tf('{motif} · constat du {date} par {par}', { motif: t(MOTIF_LIBELLE[d.motif]), date: dateCourte(d.ouvertA, langue), par: d.par.nom ?? '—' })}
              </div>
            </div>
            <span className={d.etape === 'clos' ? 'p-nax3x4' : 'p-rpzy79'}>{d.etape === 'clos' ? t('Clos') : t('En cours')}</span>
          </div>
          <BarreEtapes d={d} />
          {ech && (
            <div className="p-fht1zk">
              <Icone nom="r-horloge" taille={18} className="p-lhsznn" />
              <div>{ech}</div>
            </div>
          )}
          {d.gardeSuspendue && (
            <div className="p-gh7puf">
              <Icone nom="r-bouclier" taille={18} className="p-672m16" />
              <div>{t('Le colis reste chez vous sans frais : garde et renvoi suspendus jusqu’à la décision. Ne le remettez pas.')}</div>
            </div>
          )}
          <Link className="p-rbzobc" to={chemin('colis', { ref: d.colis })}>
            <Icone nom="r-colis" taille={18} className="p-emic6i" />
            {t('Voir la fiche du colis')}
          </Link>
        </div>

        {avis && <Avis ton={avis.ton}>{avis.texte}</Avis>}

        {d.demande && (
          <div className="p-yi6rkz">
            <div className="p-yscrc8">{t('DEMANDE DE BELIVAY')}</div>
            <p className="r7-texte">{t(d.demande.texte)}</p>
            {d.demande.faiteA ? (
              <Avis ton="vert">{tf('Répondu le {date} à {h}.', { date: dateCourte(d.demande.faiteA, langue), h: heure(d.demande.faiteA, langue) })}</Avis>
            ) : d.demande.photo && !d.filFerme ? (
              <button type="button" className="p-ncx7qc r7-action" disabled={occupe} onClick={() => setCamera('demande')}>
                <Icone nom="r-appareil-photo" taille={18} className="p-7dsggt" />
                {t('Prendre la photo demandée')}
              </button>
            ) : null}
          </div>
        )}

        <div className="p-yi6rkz">
          <div className="p-yscrc8">{tf('PREUVES · {n} PHOTOS', { n: d.photos.length })}</div>
          <div className="r7-vignettes">
            {d.photos.map((p, i) => (
              <Vignette key={p + i} photo={p} legende={tf('Photo {n} du dossier', { n: i + 1 })} />
            ))}
          </div>
          {d.devantLeClient && <p className="r7-note">{t('Déballage photographié devant le client.')}</p>}
          {d.note && <p className="r7-texte">{d.note}</p>}
        </div>

        {dec && (
          <div className="p-yi6rkz">
            <div className="p-yscrc8">{tf('DÉCISION DU {date}', { date: dateCourte(dec.le, langue).toUpperCase() })}</div>
            <p className="r7-texte">{t(dec.texte)}</p>
            {dec.colis && <Avis ton="accent">{dec.colis === 'remettre' ? t('Le colis redevient remettable : il revient dans le stock.') : t('Le colis passe dans « À faire partir » : il repart avec la prochaine collecte.')}</Avis>}
            {dec.relaisEnCause && dec.retenue !== null && (
              <div className="p-mqmvkk">
                <span className="p-ytl255">{t('Retenue proposée')}</span>
                <span className="p-2vq92h">{tf('{m} F', { m: F(dec.retenue) })}</span>
              </div>
            )}
            {dec.relaisEnCause && dec.retenue !== null && <p className="r7-note">{t('Sur la valeur nette du colis, jamais plus de la moitié d’un versement, étalée si besoin (convention, article 14).')}</p>}
            {dec.contestation ? (
              <Avis ton={dec.contestation.etat === 'levee' ? 'vert' : 'ambre'}>
                {dec.contestation.etat === 'en_examen' ? tf('Contestation envoyée le {date} : en examen par une autre personne.', { date: dateCourte(dec.contestation.le, langue) }) : dec.contestation.etat === 'levee' ? t('Contestation acceptée : la retenue est levée.') : t('Contestation examinée : la décision est maintenue.')}
              </Avis>
            ) : contestable ? (
              peutContester ? (
                <>
                  <button type="button" className="r-btn r-second" onClick={() => setContester(true)}>
                    <Icone nom="gavel" taille={18} />
                    {t('Contester la décision')}
                  </button>
                  <p className="r7-note">{tf('Une seule fois, jusqu’à {q}. Une autre personne réexamine les preuves.', { q: echeance(dec.contestableJusqua!, maintenant, langue) })}</p>
                </>
              ) : (
                <p className="r7-note">{t('Seul le gérant peut contester cette décision.')}</p>
              )
            ) : dec.relaisEnCause ? (
              <p className="r7-note">{t('Le délai de contestation est dépassé.')}</p>
            ) : null}
          </div>
        )}

        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">{t('Fil du dossier')}</h2>
          </div>
          {d.fil.length === 0 && <p className="r7-note">{t('Le fil n’est plus lisible : la durée de conservation est passée.')}</p>}
          <ol className="r7-fil">
            {d.fil.map((m) => (
              <li key={m.id} className={'r7-msg r7-msg-' + m.de}>
                <div className="r7-msg-h">
                  {m.de === 'relais' ? tf('Vous ({par})', { par: m.par ?? '' }) : m.de === 'belivay' ? 'BelivaY' : t('Suivi automatique')} · {dateCourte(m.le, langue)} {heure(m.le, langue)}
                </div>
                <div>{t(m.texte)}</div>
                {m.photos.length > 0 && (
                  <div className="r7-vignettes">
                    {m.photos.map((p, i) => (
                      <Vignette key={p} photo={p} legende={tf('Photo {n} jointe', { n: i + 1 })} />
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ol>
          {d.filFerme ? (
            <p className="r7-note">{d.closA && d.filLisibleJusqua ? tf('Fil fermé le {a} à la clôture du dossier ; lisible jusqu’au {b}.', { a: jourLong(d.closA, langue), b: jourLong(d.filLisibleJusqua, langue) }) : t('Fil fermé.')}</p>
          ) : (
            <form
              className="r7-ecrire"
              onSubmit={(e) => {
                e.preventDefault()
                void envoyer()
              }}
            >
              <label className="r7-champ-l" htmlFor="r7-fil">
                {t('Écrire à BelivaY')}
              </label>
              <textarea id="r7-fil" className="r7-champ r7-zone" rows={2} maxLength={1000} value={texte} onChange={(e) => setTexte(e.target.value)} />
              {pieces.length > 0 && (
                <div className="r7-vignettes">
                  {pieces.map((p, i) => (
                    <Vignette key={p} photo={p} legende={tf('Photo {n} jointe', { n: i + 1 })} />
                  ))}
                </div>
              )}
              <div className="r7-deux">
                <button type="button" className="r-btn r-second" onClick={() => setCamera('fil')}>
                  <Icone nom="r-appareil-photo" taille={18} />
                  {t('Photo')}
                </button>
                <button type="submit" className="r-btn r-principal" disabled={occupe || (!texte.trim() && !pieces.length)} data-raison={t('Écrivez un message ou joignez une photo')}>
                  <Icone nom="r-envoyer" taille={18} />
                  {t('Envoyer')}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="p-81u2s6">{t('Vous constatez, BelivaY décide : ne promettez ni remboursement ni échange au client, et ne remettez pas un colis en constat. Les preuves ne se modifient jamais.')}</div>
      </div>

      <PrisePhoto
        ouverte={camera !== null}
        fermer={() => setCamera(null)}
        consigne={camera === 'demande' ? t(d.demande?.texte ?? '') : t('Photo pour le dossier')}
        prise={(ph) => (camera === 'demande' ? void ajouterPhoto(ph) : setPieces((l) => [...l, ph]))}
      />
      <Feuille ouverte={contester} fermer={() => setContester(false)} titre={t('Contester la décision')}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void envoyerContestation()
          }}
        >
          <div className="r7-sheet-h">{t('Contester la décision')}</div>
          <p className="r7-note">{tf('Une seule contestation par décision, sous {h} h ouvrées. Dites ce que les preuves montrent : photo de remise, scellé, heure.', { h: R.contestationH })}</p>
          <label className="r7-champ-l" htmlFor="r7-motif-c">
            {t('Pourquoi contestez-vous ?')}
          </label>
          <textarea id="r7-motif-c" className="r7-champ r7-zone" rows={4} maxLength={1000} value={motif} onChange={(e) => setMotif(e.target.value)} />
          <button type="submit" className="r-btn r-principal r7-mt" disabled={!motif.trim() || occupe} data-raison={t('Écrivez le motif')}>
            <Icone nom="r-envoyer" taille={18} />
            {t('Envoyer la contestation')}
          </button>
        </form>
      </Feuille>
    </Ecran>
  )
}
