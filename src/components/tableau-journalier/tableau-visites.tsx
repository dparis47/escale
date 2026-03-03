import type { VisiteAvecRelations } from '@/types/visits'
import { LigneVisite } from './ligne-visite'

interface BadgesAccompagnement { fse: boolean; asid: boolean; ei: boolean }

interface Props {
  visites:           VisiteAvecRelations[]
  dateISO:           string
  badgesParPersonId: Map<number, BadgesAccompagnement>
}

export function TableauVisites({ visites, dateISO, badgesParPersonId }: Props) {
  if (visites.length === 0) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        Aucune visite enregistrée pour ce jour.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-2 py-2 text-center">Dossier</th>
            <th className="px-2 py-2 text-left">Type</th>
            <th className="px-3 py-2 text-left">Nom / Prénom</th>
            <th className="px-3 py-2 text-left">Motif(s)</th>
            <th className="px-3 py-2 text-left">Commentaire</th>
            <th className="px-3 py-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {visites.map((visite) => (
            <LigneVisite
              key={visite.id}
              visite={visite}
              dateISO={dateISO}
              badges={badgesParPersonId.get(visite.personId)}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
