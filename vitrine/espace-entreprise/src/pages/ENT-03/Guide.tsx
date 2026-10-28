// Guide de démarrage du prototype (entA_guide : chaîne d'activation, ENT-RG-R16, ENT-ACT-01) : même composant pour le
// tableau de bord d'un compte en configuration (ENT-P02) et l'État du compte en configuration (ENT-P27). Étapes de la
// source (faite, bloquée par une pièce rejetée, prochaine), prochaine action en héros, progression, ce que BelivaY
// fournit, ce que donne l'activation (palier et plafond lus au registre), accès internes.
import { Link } from 'react-router-dom'
import { F } from '@client/i18n/format'
import { PARAMETRES } from '../../calculs/registre'
import { Icone } from '../../composants/Icone'
import { Anneau, Etape, Kv, Note, Panel, Pill, Verrou } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import type { EtapeActivation } from '../../donnees/domaines/contrat'
import { usePreferences } from '../../preferences'
import { usePeut } from '../../session'
import { NOM_ETAPE } from './Contrat'

/** Libellé du bouton d'une étape non faite. */
const BOUTON: Record<EtapeActivation['id'], [string, string] | null> = {
  conformite: ['Lire et signer le contrat', 'file-signature'],
  zones: ['Déclarer une zone', 'map-pinned'],
  flotte: ['Ajouter un livreur', 'user-plus'],
  grille: ['Lire et signer', 'file-signature'],
  reglement: ['Compléter', 'wallet'],
  activation: null,
}

export function GuideDemarrage({ guide, titre }: { guide: EtapeActivation[]; titre?: string }) {
  const { t, tf } = usePreferences()
  const proprio = usePeut(['proprietaire'])
  const conditions = guide.filter((x) => x.id !== 'activation')
  const faites = conditions.filter((x) => x.fait).length
  const prochaine = guide.find((x) => !x.fait && x.id !== 'activation')
  const pct = Math.round((100 * faites) / Math.max(1, conditions.length))
  const plafond = PARAMETRES.paliers.plafonds.Nouveau
  return (
    <>
      <div className="g g21">
        <Panel titre={titre ?? t('Guide de démarrage')} icone="list-checks" droite={<Pill sm>{tf('{n} condition(s) remplie(s) sur {t}', { n: faites, t: conditions.length })}</Pill>}>
          <div className="entA-steps">
            {guide.map((x, i) => {
              const b = BOUTON[x.id]
              const st = x.fait ? 'done' : x.bloquant ? 'bad' : x === prochaine ? 'cur' : ''
              return (
                <Etape
                  key={x.id}
                  n={i + 1}
                  st={st}
                  titre={t(NOM_ETAPE[x.id])}
                  sous={x.bloquant ? `${t(x.detail)} — ${x.bloquant}` : t(x.detail)}
                  droite={
                    x.fait ? (
                      <Pill ton="green" dot sm>
                        {t('Fait')}
                      </Pill>
                    ) : x.id === 'activation' ? (
                      <Verrou>{t('Fixé par BelivaY')}</Verrou>
                    ) : (
                      b && (
                        <Link className={'btn sm ' + (x === prochaine ? 'primary' : 'secondary')} to={chemin(x.route, x.params)}>
                          <Icone nom={b[1]} taille={18} />
                          <span>{t(b[0])}</span>
                        </Link>
                      )
                    )
                  }
                />
              )
            })}
          </div>
        </Panel>
        <div className="col" style={{ gap: 16 }}>
          {prochaine && (
            <div className="hero orange" style={{ marginTop: 0 }}>
              <div className="hk">{t('Prochaine action')}</div>
              <div className="ht">{t(NOM_ETAPE[prochaine.id])}</div>
              <div className="hs">{t('Tant que la chaîne n’est pas complète, missions, colis, preuves, litiges, règlements et score restent vides : ce guide dit ce qui manque.')}</div>
              {BOUTON[prochaine.id] && (
                <div className="btns">
                  <Link className="btn white" to={chemin(prochaine.route, prochaine.params)}>
                    <Icone nom={BOUTON[prochaine.id]![1]} taille={18} />
                    <span>{t(BOUTON[prochaine.id]![0])}</span>
                  </Link>
                </div>
              )}
            </div>
          )}
          <div className="panel">
            <div className="row">
              <Anneau v={pct} max={100} taille={76} libelle={`${pct} %`} />
              <div className="grow">
                <div className="b8 t15">{t('Progression de l’activation')}</div>
                <div className="t13 c3 mt4 lh">{tf('Conditions remplies : {n} sur {t}. BelivaY active le compte quand toutes le sont.', { n: faites, t: conditions.length })}</div>
              </div>
            </div>
            <div className="steps">
              {guide.map((x) => (
                <i key={x.id} className={x.fait ? 'on' : x === prochaine ? 'cur' : ''}></i>
              ))}
            </div>
          </div>
          <Note ton="acc" icone="map-pinned">
            <b>{t('Déclarez une zone et rattachez un livreur pour recevoir des paquets.')}</b> {t('Aucun indicateur n’est affiché tant qu’il n’y a rien à mesurer.')}
          </Note>
          <Note ton="ink" icone="shield-check">
            {t('Aucune caution, aucun dépôt, aucun frais d’entrée : l’accès au partenariat coûte 0 F. Le plafond de valeur par colis remplace la caution.')}
          </Note>
        </div>
      </div>
      <div className="g g3">
        <Panel titre={t('Ce que BelivaY fournit')} icone="handshake">
          <Kv k={t('Compte et portail')} v={t('complets, sans frais')} />
          <Kv k={t('Emballages et étiquettes')} v={t('avancés, jamais vendus')} />
          <Kv k={t('Certification des livreurs')} v={t('dans l’application')} />
          <Kv k={t('Support et médiation')} v={t('messagerie BelivaY')} />
        </Panel>
        <Panel titre={t('À l’activation')} icone="award" droite={<Verrou>{t('Fixé par BelivaY')}</Verrou>}>
          <Kv k={t('Palier')} v={t('Nouveau')} />
          <Kv k={t('Plafond par colis')} v={plafond === null ? t('sans plafond') : `${F(plafond)} F`} />
          <Kv k={t('Paquets')} v={t('ceux de vos zones déclarées')} />
          <Kv k={t('Règlement')} v={t('chaque vendredi')} />
        </Panel>
        <Panel titre={t('Vos accès internes')} icone="users">
          <div className="t13 c2 lh">{t('Vous êtes propriétaire. Invitez d’autres personnes, chacune avec son accès nominatif : répartiteur ou comptable. L’argent et le moyen de règlement restent réservés au propriétaire.')}</div>
          {proprio && (
            <div className="btns">
              <Link className="btn secondary" to={chemin('parametres') + '#utilisateurs'}>
                <Icone nom="user-plus" taille={18} />
                <span>{t('Inviter un utilisateur')}</span>
              </Link>
            </div>
          )}
        </Panel>
      </div>
    </>
  )
}
