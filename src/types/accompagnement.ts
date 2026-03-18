import type {
  Accompagnement,
  AccompagnementSortie,
  SuiviASID,
  Entretien,
  Demarches,
  ContratTravail,
  Person,
  FichePrescriptionASID,
  Cv,
} from '@prisma/client'

export type EntretienAvecSujets = Pick<Entretien, 'id' | 'date' | 'sujets' | 'notes' | 'deletedAt'>

export type ContratTravailSimple = Pick<
  ContratTravail,
  'id' | 'type' | 'dateDebut' | 'dateFin' | 'employeur' | 'ville' | 'poste'
>

export type PrescriptionSimple = Pick<FichePrescriptionASID, 'id' | 'nom'>
export type CvSimple          = Pick<Cv,                    'id' | 'nom'>

export type AccompagnementAvecRelations = Accompagnement & {
  person:    Pick<Person, 'id' | 'nom' | 'prenom' | 'genre' | 'dateNaissance' | 'adresse' | 'telephone' | 'mobile' | 'email'>
  sortie:    AccompagnementSortie | null
  demarches: Demarches | null
  entretiens: EntretienAvecSujets[]
  suiviASID: (SuiviASID & {
    prescriptions: PrescriptionSimple[]
  }) | null
  contratsTravail: ContratTravailSimple[]
}
