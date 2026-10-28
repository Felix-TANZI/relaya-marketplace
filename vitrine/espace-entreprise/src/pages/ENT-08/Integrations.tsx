// ENT-P26 · Intégrations, repris sur le prototype (route('integrations')). Fonction d'après le lancement
// (integrations_actives) : au lancement, encadré « Bientôt disponible » sans aucun chiffre fictif (ENT-P26R-01), avec
// les raccourcis vers les paquets et les missions (tout est faisable dans le portail, ENT-P26R-03), « Ce que vous
// pourrez faire » (clés révocables et limitées en débit, rappels signés, journal) et « Documentation et environnement
// de test » (preuves faites dans l'application livreur, ENT-P26R-02 ; anonymat, ENT-P26R-05). L'environnement de
// test est ouvert dès maintenant : page ajoutée integrations-cles (clé masquée, rappels, journal, débit). Fonction ouverte : état
// « aucune clé » du prototype (la création de clé attend l'API des clés, INTEGRATION.md). Propriétaire seulement.
import { Link } from 'react-router-dom'
import { Icone } from '../../composants/Icone'
import { Ecran } from '../../composants/coque'
import { Hint, Li, Note, Panel, Px, Tete, Vide, useLarge } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { Chargement, ErreurLecture } from '../ENT-07/commun'
import './ent08.css'

export default function Integrations() {
  const { t, tf } = usePreferences()
  const s = useSession()
  const large = useLarge()
  const lecture = useLecture(() => source.integrations.etat(), [])
  const e = lecture.donnees
  const nom = s.entreprise?.nom ?? t('votre entreprise')
  const acts = (
    <button type="button" className="btn secondary sm" disabled title={t('Après le lancement')}>
      <Icone nom="book-open" taille={16} />
      {t('Documentation')}
    </button>
  )
  const docs = (
    <Panel titre={t('Documentation et environnement de test')} icone="book-open">
      <Li icone="book-open" ton="acc" t={t('Documentation de l’interface de programmation')} s={t('paquets, acceptation, statuts, rappels signés, clé d’idempotence')} />
      <Li icone="flask-conical" ton="acc" t={t('Environnement de test')} s={t('ouvert : clé de test, rappels et journal des appels, sans effet sur les vrais paquets')} to={chemin('integrations-cles')} />
      <Note ton="acc" icone="camera">
        {t('Même par API, les preuves restent faites dans l’application livreur BelivaY : aucune preuve n’est acceptée d’un logiciel tiers.')}
      </Note>
      <Note ton="ink" icone="eye-off">
        {t('Aucune donnée de client au-delà de ce que voit le portail : l’anonymat s’applique de la même façon.')}
      </Note>
    </Panel>
  )
  return (
    <Ecran route="integrations" actions={large ? acts : undefined}>
      <Px>
        <Tete route="integrations" titre={t('Intégrations')} actes={acts} />
        <ErreurLecture erreur={lecture.erreur} relire={lecture.relire} />
        {!e ? (
          !lecture.erreur && <Chargement n={2} />
        ) : !e.actives ? (
          <>
            <div className="g g21">
              <div className="ec8-soon">
                <div className="ei">
                  <Icone nom="plug" taille={28} />
                </div>
                <h3>{t('Bientôt disponible')}</h3>
                <p>{t('Pour les entreprises qui ont déjà leur propre logiciel de gestion : échanger les paquets et les statuts par API. La fonction ouvrira après le lancement ; en attendant, tout se fait dans le portail.')}</p>
                <div className="btns ec-btns" style={{ maxWidth: 420, margin: '16px auto 0' }}>
                  <Link className="btn primary" to={chemin('integrations-cles')}>
                    <Icone nom="flask-conical" taille={16} />
                    {t('Ouvrir l’environnement de test')}
                  </Link>
                  <Link className="btn secondary" to={chemin('paquets')}>
                    <Icone nom="boxes" taille={16} />
                    {t('Paquets disponibles')}
                  </Link>
                  <Link className="btn secondary" to={chemin('missions')}>
                    <Icone nom="map" taille={16} />
                    {t('Missions et carte')}
                  </Link>
                </div>
              </div>
              <Panel titre={t('Ce que vous pourrez faire')} icone="plug">
                <Li icone="key-round" ton="acc" t={tf('Clés d’API propres à {n}', { n: nom })} s={tf('révocables, limitées à {d} appels par minute, rotation sans interruption', { d: e.debitParMinute })} />
                <Li icone="webhook" ton="acc" t={t('Rappels signés')} s={tf('« paquet publié », « paquet accepté », « statut » ; en échec, retentés pendant {h} heures', { h: e.reessaisH })} />
                <Li icone="scroll-text" ton="acc" t={t('Journal des appels')} s={t('chaque appel et chaque rappel, avec ses tentatives')} to={chemin('integrations-cles')} />
                <Hint icone="info">{t('Facultatif : tout ce que l’intégration permet est faisable dans le portail.')}</Hint>
              </Panel>
            </div>
            <div style={{ marginTop: 16 }}>{docs}</div>
          </>
        ) : (
          <div className="g g21">
            <div className="panel">
              <Vide icone="key-round" t={t('Aucune clé d’API')} s={t('Créez d’abord une clé de test : elle ne touche que l’environnement de test. La clé de production s’obtient ensuite, par le propriétaire.')}>
                <Link className="btn primary" to={chemin('integrations-cles')}>
                  <Icone nom="key-round" taille={16} />
                  {t('Clés, rappels et journal')}
                </Link>
              </Vide>
            </div>
            {docs}
          </div>
        )}
      </Px>
    </Ecran>
  )
}
