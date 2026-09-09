import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTeamMembers, getTeamMemberBySlug } from '@/lib/supabase/team'
import type { TeamMemberDetail } from '@/types/cms'
import { TeamMemberTemplate } from '@/components/templates/TeamMemberTemplate'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params: { locale, slug },
}: {
  params: { locale: string; slug: string }
}): Promise<Metadata> {
  const member = await getTeamMemberBySlug(slug)

  if (!member) return { title: 'Not Found' }

  const loc = locale as 'es' | 'en'
  const role = member.role as { es: string; en: string }
  return {
    title: `${member.name} — ${role?.[loc] || role?.es} | Allura Healthcare`,
    description: (member.bio as { es: string; en: string })?.[loc] || (member.bio as { es: string; en: string })?.es,
  }
}

export default async function TeamMemberPage({
  params: { locale, slug },
}: {
  params: { locale: string; slug: string }
}) {
  const member = await getTeamMemberBySlug(slug)

  if (!member) notFound()

  const bioText = (member.bio as { es: string; en: string })?.[locale as 'es' | 'en'] || (member.bio as { es: string; en: string })?.es || ''

  // Map Supabase TeamMember to TeamMemberDetail shape expected by template
  const mappedMember: TeamMemberDetail = {
    _id: member.id,
    name: member.name,
    slug: { current: member.slug },
    role: member.role as { es: string; en: string },
    photo: member.photoUrl
      ? {
          asset: { _id: member.id, url: member.photoUrl },
        }
      : undefined,
    shortBio: member.bio as { es: string; en: string },
    fullBio: bioText
      ? {
          es: [{ _type: 'block', _key: 'bio-es', style: 'normal', markDefs: [], children: [{ _type: 'span', _key: 'span-es', text: (member.bio as { es: string; en: string })?.es || '', marks: [] }] }],
          en: [{ _type: 'block', _key: 'bio-en', style: 'normal', markDefs: [], children: [{ _type: 'span', _key: 'span-en', text: (member.bio as { es: string; en: string })?.en || '', marks: [] }] }],
        }
      : undefined,
  }

  return <TeamMemberTemplate member={mappedMember} locale={locale} />
}
