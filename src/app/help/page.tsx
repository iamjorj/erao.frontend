"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { PageLayout, EmailButton } from "@/components/shared";

/* ------------------------------------------------------------------ */
/*  ANIMATION VARIANTS                                                 */
/* ------------------------------------------------------------------ */

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const fadeBlur = {
  hidden: { opacity: 0, filter: "blur(8px)" },
  visible: { opacity: 1, filter: "blur(0px)" },
};

const stagger = {
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

const staggerSlow = {
  visible: {
    transition: { staggerChildren: 0.15 },
  },
};

/* ------------------------------------------------------------------ */
/*  DATA                                                               */
/* ------------------------------------------------------------------ */

const categories = [
  {
    title: "Getting Started",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    accentColor: "blue",
    articles: [
      { title: "Quick Start Guide", slug: "quick-start" },
      { title: "Connecting Your First Database", slug: "connect-database" },
      { title: "Uploading Your First File", slug: "upload-file" },
      { title: "Running Your First Query", slug: "first-query" },
      { title: "Understanding Query Results", slug: "query-results" },
    ],
  },
  {
    title: "Databases & Files",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
      </svg>
    ),
    accentColor: "violet",
    articles: [
      { title: "Connecting PostgreSQL", slug: "connect-postgresql" },
      { title: "Connecting MySQL", slug: "connect-mysql" },
      { title: "Connecting MongoDB", slug: "connect-mongodb" },
      { title: "Uploading Files (CSV, Excel, JSON)", slug: "upload-file" },
      { title: "Connection Troubleshooting", slug: "connection-troubleshooting" },
    ],
  },
  {
    title: "Querying Data",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    accentColor: "blue",
    articles: [
      { title: "Writing Effective Questions", slug: "effective-questions" },
      { title: "Working with Tables", slug: "working-with-tables" },
      { title: "Creating Charts", slug: "creating-charts" },
      { title: "Exporting Results", slug: "exporting-results" },
    ],
  },
  {
    title: "Account & Billing",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    accentColor: "violet",
    articles: [
      { title: "Managing Your Account", slug: "manage-account" },
      { title: "Upgrading Your Plan", slug: "upgrade-plan" },
      { title: "Understanding Your Usage", slug: "usage" },
      { title: "Billing FAQ", slug: "billing-faq" },
    ],
  },
  {
    title: "Security",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    accentColor: "emerald",
    articles: [
      { title: "How We Protect Your Data", slug: "data-protection" },
      { title: "Encryption & Security", slug: "encryption" },
      { title: "Compliance & Certifications", slug: "compliance" },
      { title: "Security Best Practices", slug: "security-best-practices" },
    ],
  },
];

const popularArticles = [
  { title: "Quick Start Guide", category: "Getting Started", slug: "quick-start" },
  { title: "Connecting Your First Database", category: "Getting Started", slug: "connect-database" },
  { title: "Writing Effective Questions", category: "Querying Data", slug: "effective-questions" },
  { title: "How We Protect Your Data", category: "Security", slug: "data-protection" },
];

const accentMap: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  blue: { bg: "bg-white/[0.06]", border: "border-white/[0.08]", text: "text-gray-400", glow: "" },
  violet: { bg: "bg-white/[0.06]", border: "border-white/[0.08]", text: "text-gray-400", glow: "" },
  emerald: { bg: "bg-white/[0.06]", border: "border-white/[0.08]", text: "text-gray-400", glow: "" },
};

/* ------------------------------------------------------------------ */
/*  SECTION DIVIDER                                                    */
/* ------------------------------------------------------------------ */

function SectionDivider() {
  return (
    <div className="relative z-10 w-full max-w-3xl mx-auto px-6">
      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");

  // Dark scrollbar
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("landing-dark-scroll");
    html.style.background = "#09090b";
    return () => {
      html.classList.remove("landing-dark-scroll");
      html.style.background = "";
    };
  }, []);

  const q = searchQuery.toLowerCase();
  const filteredCategories = searchQuery
    ? categories
        .map((cat) => ({
          ...cat,
          articles: cat.title.toLowerCase().includes(q)
            ? cat.articles // show all articles if category name matches
            : cat.articles.filter((a) =>
                a.title.toLowerCase().includes(q) ||
                a.slug.toLowerCase().includes(q)
              ),
        }))
        .filter((cat) => cat.articles.length > 0)
    : categories;

  return (
    <PageLayout currentPage="help" variant="dark">
      {/* Hero with Search */}
      <section className="relative w-full pt-20 sm:pt-32 pb-16 sm:pb-20 overflow-hidden">
        {/* Radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-white/[0.03] rounded-full blur-[140px] pointer-events-none" />

        <motion.div
          className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.div
            variants={fadeBlur}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2.5 rounded-full px-4 py-1.5 mb-8 border border-white/10 bg-white/[0.04] backdrop-blur-md"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-white/30 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white/60" />
            </span>
            <span className="text-sm text-gray-300 font-medium">Knowledge Base</span>
          </motion.div>

          <motion.h1
            className="font-semibold tracking-tighter text-gray-100 mb-4 text-balance"
            variants={fadeUp}
            transition={{ duration: 0.6, delay: 0.1 }}
            style={{ fontSize: "clamp(2rem, 5vw + 0.5rem, 3rem)" }}
          >
            How can we help?
          </motion.h1>

          <motion.p
            className="text-base sm:text-lg text-gray-400 mb-10 sm:mb-12 max-w-xl mx-auto leading-relaxed"
            variants={fadeUp}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Search our knowledge base or browse categories below
          </motion.p>

          {/* Search */}
          <motion.div
            className="relative max-w-xl mx-auto"
            variants={fadeUp}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <input
              type="text"
              placeholder="Search for articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-5 py-4 pl-12 bg-white/[0.04] border border-white/[0.08] rounded-2xl text-base text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10 backdrop-blur-sm transition-all duration-300"
            />
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </motion.div>
        </motion.div>
      </section>

      <SectionDivider />

      {/* Popular Articles */}
      {!searchQuery && (
        <motion.section
          className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={stagger}
        >
          <motion.p
            className="uppercase text-sm font-medium text-gray-500 tracking-wide mb-6"
            variants={fadeUp}
            transition={{ duration: 0.5 }}
          >
            Popular Articles
          </motion.p>
          <div className="grid sm:grid-cols-2 gap-3">
            {popularArticles.map((article, i) => (
              <motion.div
                key={article.slug}
                variants={fadeUp}
                transition={{ duration: 0.5, delay: i * 0.08 }}
              >
                <Link
                  href={`/help/${article.slug}`}
                  className="group flex items-center justify-between p-4 sm:p-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl hover:border-white/10 hover:bg-white/[0.04] transition-all duration-300"
                >
                  <div>
                    <p className="font-medium text-sm text-gray-200 group-hover:text-white transition-colors">
                      {article.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{article.category}</p>
                  </div>
                  <svg
                    className="w-4 h-4 text-gray-600 group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0 ml-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      <SectionDivider />

      {/* Categories */}
      <motion.section
        key={searchQuery}
        className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20 pb-20 sm:pb-28"
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        <motion.p
          className="uppercase text-sm font-medium text-gray-500 tracking-wide mb-8"
          variants={fadeUp}
          transition={{ duration: 0.5 }}
        >
          {searchQuery ? "Search Results" : "Browse by Category"}
        </motion.p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredCategories.map((category, i) => {
            const accent = accentMap[category.accentColor] || accentMap.blue;
            return (
              <motion.div
                key={category.title}
                className={`group bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 sm:p-6 hover:border-white/10 hover:bg-white/[0.04] transition-all duration-300 ${accent.glow}`}
                variants={fadeUp}
                transition={{ duration: 0.4, delay: i * 0.06 }}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="relative">
                    <div className={`w-10 h-10 ${accent.bg} border ${accent.border} ${accent.text} rounded-xl flex items-center justify-center relative z-10`}>
                      {category.icon}
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-100 tracking-tight">{category.title}</h3>
                </div>
                <ul className="space-y-2.5">
                  {category.articles.map((article) => (
                    <li key={article.slug}>
                      <Link
                        href={`/help/${article.slug}`}
                        className="text-sm text-gray-400 hover:text-white transition-colors duration-200 flex items-center gap-2 group/link"
                      >
                        <svg
                          className="w-3.5 h-3.5 text-gray-600 group-hover/link:text-gray-400 transition-colors flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                        {article.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>

        {searchQuery && filteredCategories.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-500">No articles found for &quot;{searchQuery}&quot;</p>
            <button
              onClick={() => setSearchQuery("")}
              className="mt-4 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Clear search
            </button>
          </div>
        )}
      </motion.section>

      <SectionDivider />

      {/* Contact Support CTA */}
      <section className="relative w-full overflow-hidden">
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-white/[0.03] rounded-full blur-[120px] pointer-events-none" />

        <motion.div
          className="max-w-3xl mx-auto px-4 sm:px-6 py-24 sm:py-32 text-center relative"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={stagger}
        >
          <motion.h2
            className="text-2xl sm:text-3xl font-semibold tracking-tighter text-gray-100 mb-4 text-balance"
            variants={fadeUp}
            transition={{ duration: 0.5 }}
          >
            Still need help?
          </motion.h2>
          <motion.p
            className="text-gray-400 mb-10 text-lg leading-relaxed"
            variants={fadeUp}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Our support team is ready to assist you.
          </motion.p>
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-sm font-medium bg-white text-[#09090b] hover:bg-gray-100 hover:shadow-[0_0_40px_rgba(255,255,255,0.15)] active:scale-[0.98] transition-all duration-300 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]"
            >
              Contact Support
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </PageLayout>
  );
}
