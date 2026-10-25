// Documents (VD-09) : repris du prototype (route('documents'), trois groupes titrés, VD09-R27), branché sur la source
// (GET /documents, VD09-R23).
// - Relevés (DOC-02, DOC-03) : le mois en cours en CSV, « En cours », à tout moment ; chaque mois clos en PDF et CSV,
//   émis le 1er du mois suivant, du plus récent au plus ancien ; même contenu dans les deux formats (par vente : prix de
//   vente et ce que vous avez gardé). Les fichiers sont VRAIS : fabriqués sur l'appareil à partir du contenu de la source ;
// - Reçus de commande sans donnée du client, vers le reçu (VD09-R22) ; historique des versements en CSV (ajout) ;
// - Factures des commissions (le seul écran où le mot apparaît, VD09-R26), émises le 1er du mois suivant, complètes dès
//   le RCCM et le NIU (DOC-01) ; abonnement et visibilité : jamais une section qui disparaît (DOC-04, plan lu dans la
//   source « plans ») ; contrat et sa grille « part que vous gardez » en PDF ; Mes données vers Sécurité (Q-23) ;
// - Hors connexion : la liste reste lisible, le téléchargement attend le réseau et le dit (VD09-R25) ;
// - Accès Préparation verrouillé (ARG-04).
import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { DemandeDocument, Documents as DonneesDocuments } from '../../donnees/domaines/argent'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { AvecDonnees, BandeauHorsLigne, CommentCaMarche, Aide, Message, dateComplete, jourMoisLong, nomMois, telecharger, useEnLigne, useMessage, versCsv, versPdf } from './commun'

const BLOC = { display: 'block' } as const
const SOUS = { marginLeft: '52px', minHeight: '52px' } as const

function useTelecharger() {
  const { t, langue } = usePreferences()
  const enLigne = useEnLigne()
  const [message, dire] = useMessage()
  const lancer = async (d: DemandeDocument, format: 'pdf' | 'csv', nom: string) => {
    if (!enLigne) {
      jouer('erreur')
      return dire(t('Hors connexion : le téléchargement attend le réseau. Rien n’est perdu.'))
    }
    const c = await source.argent.document(d)
    const tr = { t, langue }
    if (format === 'csv') telecharger(nom + '.csv', versCsv(c, tr), 'text/csv;charset=utf-8')
    else telecharger(nom + '.pdf', versPdf(c, tr), 'application/pdf')
    jouer('valide')
    dire(t('Document téléchargé'))
  }
  return { enLigne, message, lancer }
}

function Bouton({ format, libelle, onClick, enLigne }: { format: 'pdf' | 'csv'; libelle: string; onClick: () => void; enLigne: boolean }) {
  const { t } = usePreferences()
  return (
    <button type="button" className="vd9-dl" aria-label={libelle} aria-disabled={!enLigne} onClick={onClick}>
      <Icone nom="download" taille={16} />
      {t(format.toUpperCase())}
    </button>
  )
}

function Ligne({ icone, ton = '', titre, sous, droite, style }: { icone?: string; ton?: string; titre: string; sous?: ReactNode; droite?: ReactNode; style?: CSSProperties }) {
  return (
    <div className="li" style={style}>
      {icone && (
        <span className={'ic ' + ton}>
          <Icone nom={icone} taille={20} />
        </span>
      )}
      <span className="grow">
        <span className="lt" style={BLOC}>
          {titre}
        </span>
        {sous && (
          <span className="ls" style={BLOC}>
            {sous}
          </span>
        )}
      </span>
      {droite}
    </div>
  )
}

function Contenu({ d }: { d: DonneesDocuments }) {
  const { t, tf, langue } = usePreferences()
  const dl = useTelecharger()
  const plans = useLecture(() => source.plans.plans())
  const plan = plans.donnees?.find((p) => p.actuel)?.plan ?? null
  const courant = d.releves.find((r) => r.statut === 'open')
  const clos = d.releves.filter((r) => r.statut === 'issued')
  const mois = (p: string) => nomMois(p, langue, true)
  const facturesPlan = [...d.factures.abonnement, ...d.factures.visibilite]
  return (
    <>
      <BandeauHorsLigne texte="La liste reste lisible ; les téléchargements attendent le réseau." />
      <div className="divider-t" style={{ fontSize: '12px' }}>
        {t('Relevés et reçus')}
      </div>
      <div className="card tight" style={{ marginTop: '0' }}>
        {courant && (
          <Ligne
            icone="file-down"
            ton="or"
            titre={tf('Relevé de {mois}', { mois: nomMois(courant.periode, langue).toLowerCase() })}
            sous={t('En cours · par vente : prix de vente et ce que vous avez gardé')}
            droite={<Bouton format="csv" enLigne={dl.enLigne} libelle={tf('Télécharger le relevé de {mois} en CSV', { mois: mois(courant.periode) })} onClick={() => void dl.lancer({ type: 'releve', periode: courant.periode }, 'csv', `belivay-releve-${courant.periode}`)} />}
          />
        )}
        <Ligne icone="calendar-days" ton="or" titre={t('Relevés mensuels')} sous={t('Le mois complet, le 1er du mois suivant')} />
        {clos.length === 0 && courant && <Ligne style={SOUS} titre={t('Aucun mois clos pour l’instant')} sous={tf('Le premier relevé mensuel sera émis le {jour}.', { jour: jourMoisLong(nextMonth(courant.periode), langue) })} />}
        {clos.map((r) => (
          <Ligne
            key={r.periode}
            style={SOUS}
            titre={mois(r.periode)}
            sous={tf('Émis le {jour}', { jour: jourMoisLong(r.emisLe!, langue) })}
            droite={
              <span className="row" style={{ gap: '6px' }}>
                <Bouton format="pdf" enLigne={dl.enLigne} libelle={tf('Télécharger le relevé de {mois} en PDF', { mois: mois(r.periode) })} onClick={() => void dl.lancer({ type: 'releve', periode: r.periode }, 'pdf', `belivay-releve-${r.periode}`)} />
                <Bouton format="csv" enLigne={dl.enLigne} libelle={tf('Télécharger le relevé de {mois} en CSV', { mois: mois(r.periode) })} onClick={() => void dl.lancer({ type: 'releve', periode: r.periode }, 'csv', `belivay-releve-${r.periode}`)} />
              </span>
            }
          />
        ))}
        <Link to={chemin('recu', { ref: d.recus.refs[d.recus.refs.length - 1] })} className="li">
          <span className="ic or">
            <Icone nom="receipt" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={BLOC}>
              {t('Reçus de commande')}
            </span>
            <span className="ls" style={BLOC}>
              {d.recus.nombre
                ? tf(d.recus.nombre > 1 ? '{n} reçus, {premier} à {dernier} · sans donnée du client' : '{n} reçu, {premier} · sans donnée du client', { n: d.recus.nombre, premier: d.recus.refs[0], dernier: d.recus.refs[d.recus.refs.length - 1] })
                : t('Aucun reçu pour l’instant')}
            </span>
          </span>
          <span className="chev">
            <Icone nom="chevron-right" taille={18} />
          </span>
        </Link>
        <Ligne
          icone="history"
          ton="green"
          titre={t('Historique des versements')}
          sous={t('Chaque vendredi, sa référence et les commandes couvertes')}
          droite={<Bouton format="csv" enLigne={dl.enLigne} libelle={t('Télécharger l’historique des versements en CSV')} onClick={() => void dl.lancer({ type: 'versements', periode: 'tout' }, 'csv', 'belivay-versements')} />}
        />
      </div>
      <div className="divider-t" style={{ fontSize: '12px' }}>
        {t('Factures')}
      </div>
      <div className="card tight" style={{ marginTop: '0' }}>
        <Ligne icone="file-text" titre={t('Factures des commissions')} />
        {d.factures.commission.map((f) =>
          f.statut === 'issued' ? (
            <Ligne
              key={f.periode}
              style={SOUS}
              titre={mois(f.periode)}
              sous={tf('Émise le {jour}', { jour: jourMoisLong(f.emisLe!, langue) })}
              droite={<Bouton format="pdf" enLigne={dl.enLigne} libelle={tf('Télécharger la facture de {mois} en PDF', { mois: mois(f.periode) })} onClick={() => void dl.lancer({ type: 'facture', periode: f.periode }, 'pdf', `belivay-facture-${f.periode}`)} />}
            />
          ) : (
            <Ligne key={f.periode} style={SOUS} titre={mois(f.periode)} sous={tf('Disponible le {jour}', { jour: jourMoisLong(f.disponibleLe!, langue) })} />
          ),
        )}
        <Ligne
          icone="sparkles"
          titre={t('Factures d’abonnement et de visibilité')}
          sous={facturesPlan.length ? tf(facturesPlan.length > 1 ? '{n} factures' : '{n} facture', { n: facturesPlan.length }) : plan ? tf('Aucune pour l’instant : vous êtes sur {plan}. Vos paiements de plan ou de visibilité apparaîtront ici.', { plan }) : t('Aucune pour l’instant. Vos paiements de plan ou de visibilité apparaîtront ici.')}
          droite={
            !facturesPlan.length && (
              <Link to={chemin('plans_liste')} className="vd9-dl" aria-label={t('Voir les plans')}>
                <Icone nom="chevron-right" taille={18} />
              </Link>
            )
          }
        />
        {facturesPlan.map((f) => (
          <Ligne key={f.periode + f.libelle} style={SOUS} titre={t(f.libelle)} sous={tf('Émise le {jour}', { jour: jourMoisLong(f.emisLe, langue) })} />
        ))}
        <Aide>{t('Document comptable obligatoire.')}</Aide>
        <CommentCaMarche titre="Voir le détail" plat>
          <p>{t('La facture est complète dès que vous déclarez un RCCM (registre du commerce) et un NIU (numéro fiscal).')}</p>
          <p>{t('Elle porte alors : dénomination, forme, capital, siège, RCCM, NIU et TVA le cas échéant.')}</p>
          {!(d.entreprise.rccm && d.entreprise.niu) && (
            <Link to={chemin('boutique', { modif: 1, motif: 'statut' })} className="vd9-lien">
              <Icone nom="building-2" taille={16} />
              {t('Déclarer mon RCCM et mon NIU')}
            </Link>
          )}
        </CommentCaMarche>
      </div>
      <div className="divider-t" style={{ fontSize: '12px' }}>
        {t('Contrat et données')}
      </div>
      <div className="card tight" style={{ marginTop: '0' }}>
        <Ligne
          icone="signature"
          ton="green"
          titre={t('Contrat vendeur')}
          sous={tf('Signé électroniquement le {jour} · grille « part que vous gardez »', { jour: dateComplete(d.contrat.signeLe, langue) })}
          droite={<Bouton format="pdf" enLigne={dl.enLigne} libelle={t('Télécharger le contrat en PDF')} onClick={() => void dl.lancer({ type: 'contrat' }, 'pdf', 'belivay-contrat-vendeur')} />}
        />
        <Link to={chemin('securite')} className="li">
          <span className="ic ">
            <Icone nom="database" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={BLOC}>
              {t('Mes données')}
            </span>
            <span className="ls" style={BLOC}>
              {t('Consulter, corriger, exporter · loi n° 2024/017')}
            </span>
          </span>
          <span className="chev">
            <Icone nom="chevron-right" taille={18} />
          </span>
        </Link>
      </div>
      <Message texte={dl.message} />
    </>
  )
}

/** « 2026-09 » → « 2026-10-01 ». */
function nextMonth(mois: string): string {
  const [a, m] = mois.split('-').map(Number)
  return m === 12 ? `${a + 1}-01-01` : `${a}-${String(m + 1).padStart(2, '0')}-01`
}

export default function Documents() {
  const { t } = usePreferences()
  const lecture = useLecture(() => source.argent.documents())
  return (
    <AvecDonnees route="documents" lecture={lecture}>
      {(d) => (
        <Ecran route="documents">
          <div className="pg">
            <h1 className="pg-t">{t('Documents')}</h1>
          </div>
          <Contenu d={d} />
        </Ecran>
      )}
    </AvecDonnees>
  )
}
