// Mon compte avec le serveur (VITE_SOURCE=api) : ce que le kit sert pour un membre du relais, avec les pièces du kit
// « compte » partagé (site/src/compte/socle : avatar, recadrage, modale, sections repliables).
// - Photo : recadrée au cercle et allégée sur le téléphone (300 Ko au plus), POST /api/relay/me/avatar (ou retirée) ;
//   la même que l'en-tête et Mon équipe.
// - Numéro : celui du compte, masqué ; il est l'identifiant du membre (connexion par numéro, code SMS, PIN).
// - Cet appareil et mes autres appareils (sessions ouvertes) : GET /api/relay/me/profile (appareils), déconnecter un
//   autre appareil DELETE /api/relay/account/devices/{id} ; se déconnecter de ce téléphone POST /api/relay/logout.
// - Code PIN : il se change dans Paramètres (POST /api/relay/auth/pin/change).
// E-mail, lien de connexion par e-mail et compte Google ne sont pas offerts au membre d'un relais par le serveur (ils
// supposent le compte client, apps.client_accounts) : rien n'en est affiché ici (CONNECTEURS-RELAIS.md, « Reste »).
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Avatar, Ic, Modale, Note, Recadrage, Repli, useChoixImage, useTk } from '@client/compte/socle'
import { chemin } from '../../config/pages'
import { origine } from '../../donnees/fileHorsLigne'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useRelireSession, useSession } from '../../session'

export default function CompteApi() {
  const s = useSession()
  const { tk } = useTk()
  const { t, tf, langue } = usePreferences()
  const naviguer = useNavigate()
  const relireSession = useRelireSession()
  const fiche = useLecture(() => source.relais.relais(), [])
  const [ouvert, setOuvert] = useState<string | null>(null)
  const [aRogner, setARogner] = useState<HTMLImageElement | null>(null)
  const [dit, setDit] = useState<{ ton: 'ok' | 'err'; texte: string } | null>(null)
  const [occupe, setOccupe] = useState(false)
  const choix = useChoixImage((img) => setARogner(img))
  const m = s.membre
  if (!m) return null
  const appareils = (fiche.donnees?.appareils ?? []).filter((a) => a.membreId === m.id)
  const basculer = (id: string) => (o: boolean) => setOuvert(o ? id : null)

  const mettrePhoto = async (photo: string | null) => {
    setOccupe(true)
    try {
      const r = await source.relais.changerPhoto(photo, origine(Date.now()))
      setDit(
        r.ok
          ? {
              ton: 'ok',
              texte: t(photo ? 'Photo enregistrée.' : 'Photo retirée.'),
            }
          : {
              ton: 'err',
              texte: t('Cette photo n’a pas été acceptée : JPEG, PNG ou WebP, 300 Ko au plus.'),
            },
      )
      await relireSession()
    } catch {
      setDit({
        ton: 'err',
        texte: t('La photo n’a pas pu partir : vérifiez le réseau et réessayez.'),
      })
    } finally {
      setOccupe(false)
      setARogner(null)
    }
  }
  const deconnecterAppareil = async (id: string) => {
    const r = await source.relais.deconnecterAppareil(id, origine(Date.now()))
    setDit(
      r.ok
        ? {
            ton: 'ok',
            texte: t('Appareil déconnecté : il demandera le numéro, le code SMS puis le PIN.'),
          }
        : { ton: 'err', texte: t('Cet appareil n’a pas pu être déconnecté.') },
    )
    fiche.relire()
  }

  return (
    <>
      <div className="ck-card">
        <div className="ck-tete">
          <Avatar photo={m.photo} prenom={m.prenom} nom={m.nom} taille={64} label={tk('Photo de profil')} />
          <div>
            <div className="ck-nom">{[m.prenom, m.nom].filter(Boolean).join(' ')}</div>
            <div className="ck-sous">{t(m.role === 'proprietaire' ? 'Gérant' : 'Employé')}</div>
          </div>
        </div>
        <div className="ck-actions">
          <button type="button" className="ck-btn" data-ck="changer-photo" disabled={occupe} onClick={choix.galerie}>
            <Ic n="camera" s={17} />
            {tk('Changer la photo')}
          </button>
          {m.photo && (
            <button type="button" className="ck-btn sec" disabled={occupe} onClick={() => void mettrePhoto(null)}>
              {tk('Retirer la photo')}
            </button>
          )}
        </div>
        {choix.erreur && <Note ton="err">{tk(choix.erreur)}</Note>}
        {dit && <Note ton={dit.ton}>{dit.texte}</Note>}
        <Note>{tk('Votre photo se voit dans l’en-tête, le Menu et Mon équipe ; jamais des clients.')}</Note>
      </div>

      <Repli id="numero" icone="smartphone" titre={t('Numéro du compte')} sous={s.numeroMasque ?? undefined} ouvert={ouvert === 'numero'} basculer={basculer('numero')}>
        <Note>
          {t(
            'Votre numéro vous connecte au relais (code SMS sur un nouveau téléphone, puis votre PIN). Il ne se change pas ici : l’employé est réinvité par le gérant, le gérant passe par le support.',
          )}
        </Note>
        <Link to={chemin('parametres')} className="ck-btn sec">
          {t('Changer mon code PIN')}
        </Link>
      </Repli>

      <Repli
        id="appareils"
        icone="shield-check"
        titre={t('Mes appareils')}
        sous={appareils.length ? tf('{n} connecté(s)', { n: appareils.length }) : undefined}
        ouvert={ouvert === 'appareils'}
        basculer={basculer('appareils')}
      >
        {appareils.length === 0 ? (
          <Note>{t('Aucun autre appareil connecté.')}</Note>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {appareils.map((a) => (
              <li
                key={a.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  minHeight: 44,
                }}
              >
                <span>
                  <b>{a.nom}</b>
                  <span className="ck-sous" style={{ display: 'block' }}>
                    {a.ceAppareil
                      ? t('Ce téléphone')
                      : tf('Dernier accès : {jour}', {
                          jour: jourLong(a.dernierAcces, langue),
                        })}
                  </span>
                </span>
                {!a.ceAppareil && (
                  <button type="button" className="ck-btn sec" onClick={() => void deconnecterAppareil(a.id)}>
                    {t('Déconnecter')}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="ck-btn sec" onClick={() => void source.session.deconnecter().then(() => naviguer(chemin('connexion'), { replace: true }))}>
          {t('Me déconnecter de ce téléphone')}
        </button>
      </Repli>

      <Modale ouverte={!!aRogner} fermer={() => setARogner(null)} titre={tk('Recadrer')}>
        {aRogner && <Recadrage img={aRogner} forme="rond" annuler={() => setARogner(null)} utiliser={(u) => void mettrePhoto(u)} />}
      </Modale>
      {choix.entrees}
    </>
  )
}
