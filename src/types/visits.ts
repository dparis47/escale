import type { Visit, Person, User, Demarches } from '@prisma/client'

export type VisiteAvecRelations = Visit & {
  person:     Pick<Person, 'id' | 'nom' | 'prenom' | 'genre' | 'estInscrit'> & {
    _count?: { visites: number }
  }
  saisiePar:  Pick<User, 'prenom' | 'nom'> | null
  modifiePar: Pick<User, 'prenom' | 'nom'> | null
  demarches:  (Demarches & {
    actionCollective?: { themeId: number; themeRef?: { nom: string } } | null
  }) | null
}
