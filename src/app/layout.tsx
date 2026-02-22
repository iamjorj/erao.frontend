import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import GoogleOAuthWrapper from "@/components/GoogleOAuthWrapper";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Erao - Speak your language. Get your data.",
  description: "Query your databases with natural language. Connect PostgreSQL, MySQL, SQL Server, or MongoDB and start asking questions in seconds. No SQL required.",
  keywords: ["database", "AI", "natural language", "SQL", "PostgreSQL", "MySQL", "MongoDB", "data analytics", "business intelligence"],
  authors: [{ name: "Erao" }],
  creator: "Erao",
  publisher: "Erao",
  metadataBase: new URL("https://erao.digital"),
  alternates: {
    canonical: "https://erao.digital",
  },
  openGraph: {
    title: "Erao - Speak your language. Get your data.",
    description: "Query your databases with natural language. No SQL required.",
    url: "https://erao.digital",
    siteName: "Erao",
    locale: "en_US",
    type: "website",
    images: [
      { url: "/favicon.png", width: 1024, height: 1024, alt: "Erao logo" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Erao - Speak your language. Get your data.",
    description: "Query your databases with natural language. No SQL required.",
    images: ["/favicon.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon.png", type: "image/png", sizes: "1024x1024" },
      { url: "/favicon.png", type: "image/png", sizes: "192x192" },
      { url: "/favicon.png", type: "image/png", sizes: "32x32" },
    ],
    shortcut: [{ url: "/favicon.ico" }],
    apple: [
      { url: "/favicon.png", type: "image/png", sizes: "180x180" },
    ],
  },
};

// JSON-LD Structured Data for Google Sitelinks
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://erao.digital/#organization",
      name: "Erao",
      url: "https://erao.digital",
      logo: {
        "@type": "ImageObject",
        url: "https://erao.digital/favicon.png",
        width: 1024,
        height: 1024,
      },
      sameAs: [],
      contactPoint: {
        "@type": "ContactPoint",
        email: "support@erao.digital",
        contactType: "customer support",
      },
    },
    {
      "@type": "WebSite",
      "@id": "https://erao.digital/#website",
      url: "https://erao.digital",
      name: "Erao",
      description: "AI-powered database intelligence platform",
      publisher: {
        "@id": "https://erao.digital/#organization",
      },
      potentialAction: {
        "@type": "SearchAction",
        target: "https://erao.digital/ai?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://erao.digital/#software",
      name: "Erao",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.8",
        ratingCount: "500",
      },
    },
    // Sitelinks Search Box and Navigation
    {
      "@type": "ItemList",
      itemListElement: [
        {
          "@type": "SiteNavigationElement",
          position: 1,
          name: "Features",
          description: "Explore Erao features",
          url: "https://erao.digital/features",
        },
        {
          "@type": "SiteNavigationElement",
          position: 2,
          name: "Pricing",
          description: "View pricing plans",
          url: "https://erao.digital/pricing",
        },
        {
          "@type": "SiteNavigationElement",
          position: 3,
          name: "Login",
          description: "Sign in to your account",
          url: "https://erao.digital/login",
        },
        {
          "@type": "SiteNavigationElement",
          position: 4,
          name: "Register",
          description: "Create a free account",
          url: "https://erao.digital/register",
        },
        {
          "@type": "SiteNavigationElement",
          position: 5,
          name: "Help Center",
          description: "Get help and support",
          url: "https://erao.digital/help",
        },
        {
          "@type": "SiteNavigationElement",
          position: 6,
          name: "Contact",
          description: "Contact us",
          url: "https://erao.digital/contact",
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <GoogleOAuthWrapper>{children}</GoogleOAuthWrapper>
      </body>
    </html>
  );
}
