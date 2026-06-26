import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import AuthGate from "@/components/AuthGate";
import AuthHostRedirect from "@/components/AuthHostRedirect";
import { Toaster } from "@/components/ui/toast";
import { Geist, Inter, DM_Sans } from "next/font/google";
import { cn } from "@/lib/utils";
import { SITE_URL as BRAND_SITE_URL } from "@/lib/brand";

// Self-hosted via next/font — no render-blocking Google Fonts request.
const geist  = Geist({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const inter  = Inter({ subsets: ['latin'], variable: '--font-inter', weight: ['400','500','600','700'], style: ['normal','italic'], display: 'swap' });
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', weight: ['300','400','500','600','700','800'], style: ['normal','italic'], display: 'swap' });

const SITE_URL  = process.env.NEXT_PUBLIC_SITE_URL ?? BRAND_SITE_URL;
const SITE_NAME = "Resunova";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const CANONICAL_SITE_URL = SITE_URL.replace(/\/$/, "");

/** Runs before React hydrates so OAuth hash tokens survive github.io → custom domain. */
const OAUTH_HOST_REDIRECT_SCRIPT = `(function(){try{var site=${JSON.stringify(CANONICAL_SITE_URL)};var base=${JSON.stringify(BASE_PATH)};var h=location.hostname;if(h==="localhost"||h==="127.0.0.1")return;if(h.indexOf(".github.io")===-1)return;var c=new URL(site).hostname;if(h===c)return;var path=location.pathname+location.search+location.hash;if(base&&path.indexOf(base)===0)path=path.slice(base.length)||"/";var target=site+path;if(target!==location.href)location.replace(target);}catch(e){}})();`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default:  "Resunova — AI Resume Tailoring for Every Job Description",
    template: "%s · Resunova",
  },
  description:
    "Completely free AI resume tailoring for students and the job-seeking community. Paste any job description, get a match score, gap analysis, and an ATS-friendly PDF in under a minute.",
  keywords: [
    "resume builder",
    "AI resume",
    "ATS resume",
    "job application",
    "resume tailoring",
    "tailor resume to job description",
    "match score",
    "cover letter",
    "career tools",
    "job search",
  ],
  authors: [{ name: "Resunova" }],
  creator: "Resunova",
  publisher: "Resunova",
  applicationName: SITE_NAME,
  category: "Productivity",
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "Resunova — AI Resume Tailoring for Every Job Description",
    description:
      "Completely free for students and the community. Tailor your resume in 60 seconds — match score, gap analysis, and ATS-friendly PDF included.",
    locale: "en_US",
    // Static PNG in /public. The dynamic app/opengraph-image route is served as
    // application/octet-stream on a static host (GitHub Pages serves by file
    // extension), which Facebook/LinkedIn/X/iMessage reject — so no preview card.
    // A real .png is served as image/png and unfurls everywhere.
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Resunova — AI Resume Scoring & Tailoring",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Resunova — AI Resume Tailoring for Every Job Description",
    description:
      "Completely free for students and the community. Tailor your resume in 60 seconds — match score, gap analysis, and ATS-friendly PDF.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon:     [{ url: "/favicon.ico" }],
    shortcut: "/favicon.ico",
    apple:    "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  verification: {
    // Set GOOGLE_SITE_VERIFICATION env var to your Search Console token.
    // Get it at: search.google.com/search-console → Add property → HTML tag method.
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

export const viewport: Viewport = {
  themeColor: "#0969da",
  width: "device-width",
  initialScale: 1,
};

const GA_ID = "G-77DE1SKZVP";

// JSON-LD structured data — helps Google understand the product.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id":   `${SITE_URL}/#org`,
      "name":  SITE_NAME,
      "url":   SITE_URL,
      "logo":  `${SITE_URL}/favicon.ico`,
    },
    {
      "@type": "WebSite",
      "@id":   `${SITE_URL}/#website`,
      "url":   SITE_URL,
      "name":  SITE_NAME,
      "publisher": { "@id": `${SITE_URL}/#org` },
      "inLanguage": "en-US",
    },
    {
      "@type": "SoftwareApplication",
      "name": SITE_NAME,
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "url": SITE_URL,
      "description":
        "Completely free AI resume builder for students and the community — tailors your resume to any job description, scores your fit, and exports an ATS-friendly PDF.",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
      },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", geist.variable, inter.variable, dmSans.variable)}>
      <head>
        {/* Inline theme-init: read localStorage before first paint → no FOUC. Default = light. */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('rn-theme')||'light';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();` }} />
        {/* OAuth may land on *.github.io; jump to custom domain before React hydrates (keep hash tokens). */}
        <script
          dangerouslySetInnerHTML={{
            __html: OAUTH_HOST_REDIRECT_SCRIPT,
          }}
        />
        {/* GitHub Pages may serve staging over HTTP before the custom-domain TLS cert is ready. */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var c=globalThis.crypto;if(c&&!c.randomUUID){c.randomUUID=function(){return'10000000-1000-4000-8000-100000000000'.replace(/[018]/g,function(n){var r=c.getRandomValues(new Uint8Array(1))[0];return(Number(n)^r&15>>Number(n)/4).toString(16)})};}}catch(e){}})();` }} />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
        )}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `}
        </Script>
        <Script
          id="ld-json"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <AuthHostRedirect />
        <AuthGate>{children}</AuthGate>
        <Toaster />
      </body>
    </html>
  );
}
