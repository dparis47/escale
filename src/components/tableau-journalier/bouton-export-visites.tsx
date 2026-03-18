import type { VisiteAvecRelations } from '@/types/visits'
import { fromPrisma, themesAvecFeuilles } from '@/lib/demarches'

/** Génère un fichier XLSX côté client à partir des visites filtrées et déclenche le téléchargement. */
export async function exporterVisitesExcel(
  visites: VisiteAvecRelations[],
  nomFichier: string,
) {
  const XLSX = await import('xlsx')

  const lignes = visites.map((v) => {
    const themes = v.demarches
      ? themesAvecFeuilles(fromPrisma(v.demarches as unknown as Record<string, unknown>))
      : []

    const dateStr = v.date instanceof Date
      ? `${String(v.date.getUTCDate()).padStart(2, '0')}/${String(v.date.getUTCMonth() + 1).padStart(2, '0')}/${v.date.getUTCFullYear()}`
      : String(v.date).slice(0, 10)

    return {
      'Date':        dateStr,
      'Nom':         v.person.nom,
      'Prénom':      v.person.prenom,
      'Genre':       v.person.genre === 'HOMME' ? 'H' : 'F',
      'Orienté FT':  v.orienteParFT ? 'Oui' : '',
      'Thèmes':      themes.map((t) => t.label).join(', '),
      'Démarches':   themes.flatMap((t) => t.feuilles).join(', '),
      'Commentaire': v.commentaire ?? '',
    }
  })

  const ws = XLSX.utils.json_to_sheet(lignes)

  // Largeur des colonnes
  ws['!cols'] = [
    { wch: 12 }, // Date
    { wch: 16 }, // Nom
    { wch: 14 }, // Prénom
    { wch: 5 },  // Genre
    { wch: 10 }, // Orienté FT
    { wch: 30 }, // Thèmes
    { wch: 50 }, // Démarches
    { wch: 30 }, // Commentaire
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Visites')

  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${nomFichier}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
