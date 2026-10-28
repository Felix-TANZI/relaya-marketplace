// Page ajoutée à ENT-P24 (Paramètres) : journal des modifications du compte (utilisateurs, point de stockage, mot de
// passe…), chaque ligne avec son auteur (ENT-P24R-03, DED-17). Ajout seul : la console de BelivaY voit le même
// journal. Liée depuis le bloc « Utilisateurs internes et rôles » (absente du prototype, d'où une page à part).
import { Ecran } from '../../composants/coque'
import { Hint, Panel, Px, Tete, Vide } from '../../composants/prototype'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useHorloge } from '../../session'
import { Chargement, ErreurLecture, useDates } from '../ENT-07/commun'
import './ent08.css'

export default function JournalParametres() {
  const { t } = usePreferences()
  const d = useDates()
  const maintenant = useHorloge()
  const reglages = useLecture(() => source.parametres.reglages(), [])
  const journal = [...(reglages.donnees?.journal ?? [])].sort((a, b) => b.le - a.le)
  return (
    <Ecran route="parametres-journal">
      <Px>
        <Tete route="parametres-journal" titre={t('Journal des modifications')} />
        <ErreurLecture erreur={reglages.erreur} relire={reglages.relire} />
        {!reglages.donnees ? (
          !reglages.erreur && <Chargement n={3} />
        ) : (
          <Panel titre={t('Journal des modifications')} icone="history" id="journal">
            {journal.length === 0 ? (
              <Vide icone="history" t={t('Aucune modification pour l’instant')} s={t('Les invitations, retraits, changements de mot de passe et du point de stockage s’inscrivent ici.')} />
            ) : (
              <div className="e8-journal">
                {journal.map((j, i) => (
                  <div key={i} className="kv">
                    <span className="k num">{d.quand(j.le, maintenant)}</span>
                    <span className="v">{`${t(j.quoi)} · ${j.par}`}</span>
                  </div>
                ))}
              </div>
            )}
            <Hint icone="shield-check">{t('Ajout seul : la console de BelivaY voit le même journal.')}</Hint>
          </Panel>
        )}
      </Px>
    </Ecran>
  )
}
