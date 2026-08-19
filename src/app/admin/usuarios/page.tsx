import { createClient } from '@/lib/supabase/client'
import { CreateUserButton } from './CreateUserButton'

export const dynamic = 'force-dynamic'

const SITE_ID = '00000000-0000-0000-0000-000000000001'

export default async function UsuariosPage() {
  const supabase = createClient()
  const { data: siteUsers, error: siteUsersError } = await supabase
    .from('site_users')
    .select('id, role, user_id, created_at')
    .eq('site_id', SITE_ID)
    .order('created_at')

  // DIAGNOSTICO TEMPORAL - quitar despues de confirmar la causa
  console.error('[DIAG usuarios]', {
    rowCount: siteUsers?.length ?? null,
    error: siteUsersError,
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#051c33]">Usuarios</h1>
        <CreateUserButton />
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#eaeeef] text-[#051c33]">
            <tr><th className="text-left p-4">User ID</th><th className="text-left p-4">Rol</th><th className="text-left p-4">Desde</th></tr>
          </thead>
          <tbody>
            {(siteUsers ?? []).map((u: any) => (
              <tr key={u.id} className="border-t border-[#eaeeef]">
                <td className="p-4 text-[#8b9fb3] font-mono text-xs">{u.user_id}</td>
                <td className="p-4">
                  <span className={`text-xs px-2 py-1 rounded-full ${u.role === 'owner' ? 'bg-purple-100 text-purple-700' : u.role === 'admin' ? 'bg-blue-100 text-blue-700' : u.role === 'editor' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{u.role}</span>
                </td>
                <td className="p-4 text-[#8b9fb3]">{new Date(u.created_at).toLocaleDateString('es-CO')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
