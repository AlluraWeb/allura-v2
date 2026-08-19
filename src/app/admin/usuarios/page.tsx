import { createClient, createServiceClient } from '@/lib/supabase/client'
import { CreateUserButton } from './CreateUserButton'
import { UserRowActions } from './UserRowActions'

export const dynamic = 'force-dynamic'

const SITE_ID = '00000000-0000-0000-0000-000000000001'

export default async function UsuariosPage() {
  const supabase = createClient()
  const { data: siteUsers } = await supabase
    .from('site_users')
    .select('id, role, user_id, created_at')
    .eq('site_id', SITE_ID)
    .order('created_at')

  // auth.users (y su email) solo es legible con la service role key,
  // por eso el cruce user_id -> email se hace aparte con ese cliente.
  const serviceClient = createServiceClient()
  const { data: authUsers } = await serviceClient.auth.admin.listUsers()
  const emailByUserId = new Map(authUsers?.users.map((u) => [u.id, u.email]) ?? [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#051c33]">Usuarios</h1>
        <CreateUserButton />
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#eaeeef] text-[#051c33]">
            <tr><th className="text-left p-4">Email</th><th className="text-left p-4">Desde</th><th className="text-left p-4">Rol / Acciones</th></tr>
          </thead>
          <tbody>
            {(siteUsers ?? []).map((u: any) => (
              <tr key={u.id} className="border-t border-[#eaeeef]">
                <td className="p-4 text-[#051c33]">{emailByUserId.get(u.user_id) ?? u.user_id}</td>
                <td className="p-4 text-[#8b9fb3]">{new Date(u.created_at).toLocaleDateString('es-CO')}</td>
                <td className="p-4">
                  <UserRowActions siteUserId={u.id} role={u.role} email={emailByUserId.get(u.user_id) ?? u.user_id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
