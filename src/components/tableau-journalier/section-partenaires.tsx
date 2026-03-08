import { SelectPartenaires } from './select-partenaires'
import { capitaliserPrenom } from '@/lib/dates'

interface VisitePartenaire {
  id:         number
  partenaires?: string[]
  person: {
    nom:    string
    prenom: string
  }
}

interface Props {
  visites: VisitePartenaire[]
}

export function SectionPartenaires({ visites }: Props) {
  if (visites.length === 0) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        Aucune visite enregistrée pour ce jour.
      </p>
    )
  }

  return (
    <div className="rounded-md border border-violet-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-violet-50 text-xs uppercase tracking-wide text-violet-600">
          <tr>
            <th className="px-3 py-2 text-left">Nom / Prénom</th>
            <th className="px-3 py-2 text-left">Partenaires présents</th>
          </tr>
        </thead>
        <tbody>
          {visites.map((visite) => (
            <tr key={visite.id} className="border-t border-violet-100">
              <td className="px-3 py-2 font-medium text-blue-700 whitespace-nowrap">
                {visite.person.nom.toUpperCase()} {capitaliserPrenom(visite.person.prenom)}
              </td>
              <td className="px-3 py-2">
                <SelectPartenaires
                  visitId={visite.id}
                  initialPartenaires={visite.partenaires ?? []}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
