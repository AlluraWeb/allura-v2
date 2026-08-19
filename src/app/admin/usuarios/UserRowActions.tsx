'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

const ROLES = [
  { value: 'editor', label: 'Editor' },
  { value: 'admin', label: 'Admin' },
  { value: 'owner', label: 'Owner' },
]

export function UserRowActions({ siteUserId, role, email }: { siteUserId: string; role: string; email: string }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRoleChange(newRole: string) {
    if (newRole === role) return
    setSaving(true)
    setError(null)
    const res = await fetch('/api/admin/usuarios', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteUserId, role: newRole }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Error al cambiar rol'); setSaving(false); return }
    router.refresh()
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar el acceso de ${email}? Esta acción no se puede deshacer.`)) return
    setDeleting(true)
    setError(null)
    const res = await fetch('/api/admin/usuarios', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteUserId }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Error al eliminar usuario'); setDeleting(false); return }
    router.refresh()
    setDeleting(false)
  }

  return (
    <div className="flex items-center gap-3">
      <select
        value={role}
        onChange={e => handleRoleChange(e.target.value)}
        disabled={saving || deleting}
        className="text-xs border border-[#8b9fb3]/40 rounded-lg px-2 py-1.5 disabled:opacity-50"
      >
        {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
      </select>
      <button
        onClick={handleDelete}
        disabled={saving || deleting}
        title="Eliminar usuario"
        className="text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors"
      >
        <Trash2 size={16} />
      </button>
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  )
}
