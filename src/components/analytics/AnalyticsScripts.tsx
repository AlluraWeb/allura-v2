import Script from 'next/script'
import { getTrackingScripts } from '@/lib/getTrackingScripts'

const GA_RE = /^G-[A-Z0-9]{4,12}$/
const GTM_RE = /^GTM-[A-Z0-9]{4,8}$/
const PIXEL_RE = /^\d{10,20}$/
const ADS_RE = /^AW-[0-9]{7,12}$/
const TIKTOK_RE = /^\d{15,25}$/
const HOTJAR_RE = /^\d{4,10}$/
const CLARITY_RE = /^[a-z0-9]{8,15}$/

function valid(value: string | undefined, re: RegExp): string | null {
  if (!value) return null
  return re.test(value) ? value : null
}

export async function AnalyticsScripts() {
  const tracking = await getTrackingScripts()

  // Los pixeles de tracking (Meta, Google Ads, TikTok, etc.) solo deben
  // dispararse en el dominio real de produccion. VERCEL_ENV distingue
  // "production" de "preview" (Vercel lo setea automaticamente en cada
  // deployment); en local NODE_ENV ya cubre el caso "development". Sin este
  // check, cualquier Preview Deployment (ramas de prueba) dispara los mismos
  // pixeles que produccion, contaminando el Events Manager / verificacion de
  // dominio de Meta con la URL de preview.
  const isProductionEnv =
    process.env.NODE_ENV === 'production' &&
    (process.env.VERCEL_ENV ?? 'production') === 'production'

  if (!tracking || !isProductionEnv) return null

  const gtm = valid(tracking.gtmContainerId, GTM_RE)
  const ga = valid(tracking.googleAnalyticsId, GA_RE)
  const pixel = valid(tracking.metaPixelId, PIXEL_RE)
  const ads = valid(tracking.googleAdsId, ADS_RE)
  const tiktok = valid(tracking.tiktokPixelId, TIKTOK_RE)
  const hotjar = valid(tracking.hotjarId, HOTJAR_RE)
  const clarity = valid(tracking.clarityId, CLARITY_RE)

  return (
    <>
      {/* GTM — takes precedence over GA4 direct */}
      {gtm && (
        <Script id="gtm" strategy="afterInteractive">{`
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${gtm}');
        `}</Script>
      )}

      {/* GA4 direct — only when GTM is not configured */}
      {!gtm && ga && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ga}`}
            strategy="afterInteractive"
          />
          <Script id="ga4" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${ga}');
          `}</Script>
        </>
      )}

      {/* Meta Pixel */}
      {pixel && (
        <Script id="meta-pixel" strategy="afterInteractive">{`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${pixel}');
          fbq('track', 'PageView');
        `}</Script>
      )}

      {/* Google Ads */}
      {ads && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ads}`}
            strategy="afterInteractive"
          />
          <Script id="google-ads" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${ads}');
          `}</Script>
        </>
      )}

      {/* TikTok Pixel */}
      {tiktok && (
        <Script id="tiktok-pixel" strategy="afterInteractive">{`
          !function (w, d, t) {
            w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
            ttq.load('${tiktok}');
            ttq.page();
          }(window, document, 'ttq');
        `}</Script>
      )}

      {/* Hotjar */}
      {hotjar && (
        <Script id="hotjar" strategy="lazyOnload">{`
          (function(h,o,t,j,a,r){
            h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
            h._hjSettings={hjid:${hotjar},hjsv:6};
            a=o.getElementsByTagName('head')[0];
            r=o.createElement('script');r.async=1;
            r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
            a.appendChild(r);
          })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
        `}</Script>
      )}

      {/* Microsoft Clarity */}
      {clarity && (
        <Script id="clarity" strategy="lazyOnload">{`
          (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "${clarity}");
        `}</Script>
      )}
    </>
  )
}
