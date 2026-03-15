import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import type { Role } from '@prisma/client'
import { peutAcceder } from '@/lib/permissions'
import type { PermissionsOverrides } from '@/lib/permissions'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { FormulaireUtilisateur } from '@/components/utilisateurs/formulaire-utilisateur'
import { BoutonDesactiverUtilisateur } from '@/components/utilisateurs/bouton-desactiver-utilisateur'
import { EditeurPermissions } from '@/components/utilisateurs/editeur-permissions'

const ROLES_FR: Record<Role, string> = {
  ACCUEIL: 'Accueil',
  TRAVAILLEUR_SOCIAL: 'Travailleur social',
  DIRECTION: 'Direction',
  ADMIN: 'Administrateur',
}

export default async function UtilisateursPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!peutAcceder(session, 'utilisateurs', 'gerer')) redirect('/')

  const utilisateurs = await prisma.user.findMany({
    select: {
      id: true,
      nom: true,
      prenom: true,
      email: true,
      role: true,
      deletedAt: true,
      permissionsOverrides: true,
    },
    orderBy: [{ deletedAt: 'asc' }, { nom: 'asc' }, { prenom: 'asc' }],
  })

  const currentUserId = Number(session.user.id)
  const sessionRole = session.user.role

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Utilisateurs</h1>
          <p className="text-sm text-muted-foreground">
            {utilisateurs.filter((u) => !u.deletedAt).length} actif{utilisateurs.filter((u) => !u.deletedAt).length > 1 ? 's' : ''}
            {utilisateurs.some((u) => u.deletedAt) && (
              <> · {utilisateurs.filter((u) => u.deletedAt).length} désactivé{utilisateurs.filter((u) => u.deletedAt).length > 1 ? 's' : ''}</>
            )}
          </p>
        </div>
        <FormulaireUtilisateur mode="creation" sessionRole={sessionRole} />
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Nom</th>
              <th className="px-3 py-2 text-left">Prénom</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Rôle</th>
              <th className="px-3 py-2 text-left">Statut</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {utilisateurs.map((u) => {
              const estDesactive = !!u.deletedAt
              const estSoiMeme = u.id === currentUserId
              const estAdmin = u.role === 'ADMIN'
              return (
                <tr
                  key={u.id}
                  className={`border-t ${estDesactive ? 'bg-muted/30 text-muted-foreground' : 'hover:bg-muted/30'}`}
                >
                  <td className="px-3 py-2 font-medium">
                    {u.nom}
                    {estSoiMeme && <span className="ml-1.5 text-xs text-muted-foreground">(vous)</span>}
                  </td>
                  <td className="px-3 py-2">{u.prenom}</td>
                  <td className="px-3 py-2">{u.email}</td>
                  <td className="px-3 py-2">{ROLES_FR[u.role]}</td>
                  <td className="px-3 py-2">
                    {estDesactive
                      ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Désactivé</span>
                      : <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Actif</span>
                    }
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-0.5">
                      {!estDesactive && !estAdmin && (
                        <>
                          <FormulaireUtilisateur
                            mode="edition"
                            utilisateur={{ id: u.id, nom: u.nom, prenom: u.prenom, email: u.email, role: u.role }}
                            sessionRole={sessionRole}
                          />
                          <EditeurPermissions
                            utilisateurId={u.id}
                            utilisateurNom={`${u.prenom} ${u.nom}`}
                            role={u.role}
                            permissionsOverrides={u.permissionsOverrides as PermissionsOverrides | null}
                          />
                        </>
                      )}
                      {!estAdmin && (
                        <BoutonDesactiverUtilisateur
                          id={u.id}
                          nom={`${u.prenom} ${u.nom}`}
                          estDesactive={estDesactive}
                          estSoiMeme={estSoiMeme}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </main>
  )
}
