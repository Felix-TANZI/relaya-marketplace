// Pagination par curseur des routes du kit (CAP-05) : `?cursor=` et `next_cursor` dans la réponse. Les écrans lisent
// la liste entière : on suit les pages jusqu'au bout (garde-fou : 50 pages).
import type { ClientApi } from '../client'

export async function toutesLesPages<T, C extends string = string>(
  api: ClientApi,
  chemin: string,
  cle: C,
): Promise<{ elements: T[]; maintenant: number; premiere: Record<string, unknown> }> {
  const elements: T[] = []
  let curseur: string | null = null
  let premiere: Record<string, unknown> | null = null
  let maintenant = Date.now()
  for (let i = 0; i < 50; i++) {
    const r: Record<string, unknown> = await api.get<Record<string, unknown>>(chemin, { query: { cursor: curseur } })
    if (!premiere) {
      premiere = r
      if (typeof r.maintenant === 'number') maintenant = r.maintenant
    }
    elements.push(...((r[cle] as T[] | undefined) ?? []))
    curseur = typeof r.next_cursor === 'string' && r.next_cursor ? r.next_cursor : null
    if (!curseur) break
  }
  return { elements, maintenant, premiere: premiere ?? {} }
}
