import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createCookieClient } from '@/lib/supabase/client'

const SITE_ID = '00000000-0000-0000-0000-000000000001'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

/** Verifica sesion valida y devuelve el rol del usuario actual en este sitio (null si no tiene). */
async function requireOwnerOrAdmin(): Promise<{ userId: string; role: string } | null> {
  try {
    const cookieClient = createCookieClient()
    const { data: { user } } = await cookieClient.auth.getUser()
    if (!user) return null

    const service = getServiceClient()
    const { data } = await service
      .from('site_users')
      .select('role')
      .eq('site_id', SITE_ID)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!data || !['owner', 'admin'].includes(data.role)) return null
    return { userId: user.id, role: data.role }
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const caller = await requireOwnerOrAdmin()
    if (!caller) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { email, password, role } = await req.json()
    if (!email || !password) return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 })

    const supabase = getServiceClient()

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (authError) throw new Error(authError.message)

    await supabase.from('site_users').insert({
      site_id: SITE_ID,
      user_id: authData.user.id,
      role: role ?? 'editor',
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const caller = await requireOwnerOrAdmin()
    if (!caller) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { siteUserId, role } = await req.json()
    if (!siteUserId || !role) return NextResponse.json({ error: 'siteUserId y role requeridos' }, { status: 400 })
    if (!['owner', 'admin', 'editor'].includes(role)) {
      return NextResponse.json({ error: 'Rol invalido' }, { status: 400 })
    }

    const supabase = getServiceClient()

    const { data: target } = await supabase
      .from('site_users')
      .select('role')
      .eq('id', siteUserId)
      .eq('site_id', SITE_ID)
      .maybeSingle()
    if (!target) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

    if (target.role === 'owner' && role !== 'owner') {
      const { count } = await supabase
        .from('site_users')
        .select('id', { count: 'exact', head: true })
        .eq('site_id', SITE_ID)
        .eq('role', 'owner')
      if ((count ?? 0) <= 1) {
        return NextResponse.json({ error: 'Debe existir al menos un owner. Asigna otro owner antes de cambiar este rol.' }, { status: 400 })
      }
    }

    const { error } = await supabase
      .from('site_users')
      .update({ role })
      .eq('id', siteUserId)
      .eq('site_id', SITE_ID)
    if (error) throw new Error(error.message)

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const caller = await requireOwnerOrAdmin()
    if (!caller) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { siteUserId } = await req.json()
    if (!siteUserId) return NextResponse.json({ error: 'siteUserId requerido' }, { status: 400 })

    const supabase = getServiceClient()

    const { data: target } = await supabase
      .from('site_users')
      .select('role, user_id')
      .eq('id', siteUserId)
      .eq('site_id', SITE_ID)
      .maybeSingle()
    if (!target) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

    if (target.role === 'owner') {
      const { count } = await supabase
        .from('site_users')
        .select('id', { count: 'exact', head: true })
        .eq('site_id', SITE_ID)
        .eq('role', 'owner')
      if ((count ?? 0) <= 1) {
        return NextResponse.json({ error: 'No puedes eliminar al unico owner del sitio.' }, { status: 400 })
      }
    }

    const { error } = await supabase
      .from('site_users')
      .delete()
      .eq('id', siteUserId)
      .eq('site_id', SITE_ID)
    if (error) throw new Error(error.message)

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
