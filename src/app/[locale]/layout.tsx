export const revalidate = 60

import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { PromoBanner } from '@/components/ui/PromoBanner'
import { PopupManager } from '@/components/ui/PopupManager'
import { AnalyticsScripts } from '@/components/analytics/AnalyticsScripts'
import { AlluraVoiceWidget } from '@/components/widgets/AlluraVoiceWidget'
import type { ActivePromotion, ActivePopup } from '@/types/cms'
import { getActivePromotions, getActivePopup } from '@/lib/supabase/content'
import { getSiteSettings } from '@/lib/getSiteSettings'
import { getTrackingScripts } from '@/lib/getTrackingScripts'
import { getHeaderCta } from '@/lib/supabase/siteSettings'
import { getMenuItems } from '@/lib/supabase/menu'
import '@/styles/globals.css'

export function generateStaticParams() {
  return [{ locale: 'es' }, { locale: 'en' }]
}

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string }
}): Promise<Metadata> {
  const [settings, tracking] = await Promise.all([
    getSiteSettings(),
    getTrackingScripts(),
  ])
  const isEs = locale === 'es'
  const loc = locale as 'es' | 'en'

  const title =
    settings?.seoTitle?.[loc] ||
    (isEs
      ? 'Allura Healthcare — Turismo Médico en Medellín'
      : 'Allura Healthcare — Medical Tourism in Medellín')

  const description =
    settings?.seoDescription?.[loc] ||
    (isEs
      ? 'Allura es una marca colombiana de turismo médico en Medellín que integra tratamientos médicos, estéticos y odontológicos con la calidez y el disfrute de Colombia.'
      : 'Allura is a Colombian medical tourism brand in Medellín integrating premium dental and aesthetic treatments with the warmth of Colombia.')

  const ogImageUrl = settings?.seoImageUrl

  return {
    title,
    description,
    keywords: isEs
      ? ['turismo médico', 'Medellín', 'Colombia', 'salud', 'estética', 'odontología']
      : ['medical tourism', 'Medellín', 'Colombia', 'health', 'aesthetics', 'dentistry'],
    openGraph: {
      title,
      description,
      locale: isEs ? 'es_CO' : 'en_US',
      type: 'website',
      ...(ogImageUrl && {
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: settings?.logoAlt || 'Allura Healthcare',
          },
        ],
      }),
    },
    alternates: {
      canonical: `https://allura.co/${locale}`,
      languages: {
        'es-CO': 'https://allura.co/es',
        en: 'https://allura.co/en',
      },
    },
    ...(tracking?.googleSearchConsoleVerification && {
      verification: { google: tracking.googleSearchConsoleVerification },
    }),
  }
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  const [messages, promotions, supabasePopup, menuItems, headerCta] = await Promise.all([
    getMessages(),
    getActivePromotions(),
    getActivePopup(),
    getMenuItems(),
    getHeaderCta(),
  ])

  // Map Supabase Promotion to ActivePromotion shape for PromoBanner
  const supabasePromo = promotions[0] ?? null
  const promotion: ActivePromotion | null = supabasePromo
    ? {
        _id: supabasePromo.id,
        title: supabasePromo.title as { es: string; en: string },
        description: supabasePromo.description as { es?: string; en?: string } | undefined,
        cta: supabasePromo.ctaUrl
          ? { label: supabasePromo.ctaLabel as { es: string; en: string }, url: supabasePromo.ctaUrl }
          : undefined,
        bgColor: (supabasePromo as any).bgColor ?? 'navy',
      }
    : null

  // Map Supabase Popup to ActivePopup shape for PopupManager
  const popup: ActivePopup | null = supabasePopup
    ? {
        _id: supabasePopup.id,
        title: supabasePopup.title as { es: string; en: string },
        body: supabasePopup.body as { es: string; en: string } | undefined,
        imageUrl: supabasePopup.imageUrl,
        cta: supabasePopup.ctaUrl
          ? {
              label: supabasePopup.ctaLabel as { es: string; en: string },
              url: supabasePopup.ctaUrl,
            }
          : undefined,
        trigger: 'timed',
        delaySeconds: supabasePopup.delaySeconds,
      } as any
    : null

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <PromoBanner promotion={promotion ?? null} locale={locale} />
          <Header hasPromo={!!promotion} menuItems={menuItems} ctaConfig={headerCta} />
          <main className={promotion ? 'pt-9' : ''}>{children}</main>
          <Footer />
          <PopupManager popup={popup ?? null} locale={locale} />
        </NextIntlClientProvider>
        <AlluraVoiceWidget />
        <AnalyticsScripts />
      </body>
    </html>
  )
}
