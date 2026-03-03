import type {
  Accompagnement,
  AccompagnementSortie,
  SuiviASID,
  Entretien,
  Demarches,
  ContratTravail,
  Person,
  FichePrescriptionASID,
  CvASID,
} from '@prisma/client'

export type EntretienAvecSujets = Pick<Entretien, 'id' | 'date' | 'sujets' | 'notes' | 'deletedAt'>

export type ContratTravailSimple = Pick<
  ContratTravail,
  'id' | 'type' | 'dateDebut' | 'dateFin' | 'employeur' | 'ville' | 'poste'
>

export type PrescriptionSimple = Pick<FichePrescriptionASID, 'id' | 'nom'>
export type CvSimple          = Pick<CvASID,                 'id' | 'nom'>

export type AccompagnementAvecRelations = Accompagnement & {
  person:    Pick<Person, 'id' | 'nom' | 'prenom' | 'genre' | 'dateNaissance' | 'adresse' | 'telephone' | 'mobile' | 'email'>
  referent:  { id: number; nom: string; prenom: string } | null
  sortie:    AccompagnementSortie | null
  demarches: Demarches | null
  entretiens: EntretienAvecSujets[]
  suiviASID: (SuiviASID & {
    prescriptions: PrescriptionSimple[]
    cvs:           CvSimple[]
  }) | null
  contratsTravail: ContratTravailSimple[]
}
