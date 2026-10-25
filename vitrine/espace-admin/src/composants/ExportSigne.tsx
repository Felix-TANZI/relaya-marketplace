// Export CSV SIGNÉ : la liste exportée porte, en dernière ligne, son empreinte SHA-256, l'agent, le rôle et l'heure ;
// l'export est journalisé (même empreinte) : on prouve plus tard qu'un fichier n'a pas été modifié. Réservé au geste
// « exporter » ; limité au périmètre de l'agent par la source qui fournit les lignes (ADM-ROL-03).
import { NOM_ROLE } from '../config/libelles'
import { csv, empreinte, telecharger } from '../donnees/exports'
import { source } from '../donnees/source'
import { usePreferences } from '../preferences'
import { usePeut, useSession } from '../session'
import { Icone } from './Icone'

export async function csvSigne(entetes: string[], lignes: (string | number | null | undefined)[][], signataire: string): Promise<{ contenu: string; empreinte: string }> {
  const corps = csv(entetes, lignes)
  const e = await empreinte(corps)
  return { contenu: `${corps}\r\n# SHA-256 ${e} · ${signataire}`, empreinte: e }
}

export function ExportSigne({ nom, entetes, lignes, objet }: { nom: string; entetes: string[]; lignes: () => (string | number | null | undefined)[][]; objet: string }) {
  const { t } = usePreferences()
  const s = useSession()
  const peut = usePeut('exporter')
  if (!peut) return null
  const exporter = async () => {
    const qui = `${s.agent?.prenom ?? ''} ${s.agent?.nom ?? ''} · ${NOM_ROLE[s.role]} · ${new Date(s.maintenant).toISOString()}`
    const { contenu, empreinte: e } = await csvSigne(entetes, lignes(), qui)
    await source.gouvernance.ecrire({ action: 'export.csv', objet: `${objet} · ${e.slice(0, 16)}` })
    telecharger(new Blob([contenu], { type: 'text/csv;charset=utf-8' }), nom)
  }
  return (
    <button type="button" className="btn sm secondary" onClick={() => void exporter()}>
      <Icone nom="file-spreadsheet" taille={16} />
      <span>{t('Exporter (CSV signé)')}</span>
    </button>
  )
}
