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

const stagger = {
  visible: {
    transition: { staggerChildren: 0.1 },
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

const accentMap: Record<string, { bg: string; border: string; text: string }> = {
  blue: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400" },
  violet: { bg: "bg-violet-500/10", border: "border-violet-500/20", text: "text-violet-400" },
  emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400" },
};

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
      <section className="relative w-full pt-16 sm:pt-24 pb-12 sm:pb-16 overflow-hidden">
        {/* Subtle radial glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-500/[0.06] rounded-full blur-[120px] pointer-events-none" />

        <motion.div
          className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-6">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
              Knowledge Base
            </span>
          </motion.div>

          <motion.h1
            className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tighter text-gray-100 mb-4"
            variants={fadeUp}
            transition={{ duration: 0.6, delay: 0.1 }}
            style={{ textWrap: "balance" }}
          >
            How can we help?
          </motion.h1>

          <motion.p
            className="text-base sm:text-lg text-gray-400 mb-8 sm:mb-10 max-w-xl mx-auto"
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
              className="w-full px-5 py-4 pl-12 bg-white/[0.04] border border-white/[0.08] rounded-xl text-base text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/20 transition-all"
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

      {/* Popular Articles */}
      {!searchQuery && (
        <motion.section
          className="w-full max-w-5xl mx-auto px-4 sm:px-6 pb-12 sm:pb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={stagger}
        >
          <motion.p
            className="uppercase text-sm font-medium text-blue-400/80 tracking-wide mb-5"
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
                  className="group flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl hover:border-white/10 hover:bg-white/[0.04] transition-all duration-300"
                >
                  <div>
                    <p className="font-medium text-sm text-gray-200 group-hover:text-white transition-colors">
                      {article.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{article.category}</p>
                  </div>
                  <svg
                    className="w-4 h-4 text-gray-600 group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all duration-200"
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

      {/* Categories */}
      <motion.section
        key={searchQuery}
        className="w-full max-w-5xl mx-auto px-4 sm:px-6 pb-20 sm:pb-28"
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        <motion.p
          className="uppercase text-sm font-medium text-blue-400/80 tracking-wide mb-6"
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
                className="group bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 sm:p-6 hover:border-white/10 hover:bg-white/[0.04] transition-all duration-300"
                variants={fadeUp}
                transition={{ duration: 0.4, delay: i * 0.06 }}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className={`w-10 h-10 ${accent.bg} border ${accent.border} ${accent.text} rounded-xl flex items-center justify-center`}>
                    {category.icon}
                  </div>
                  <h3 className="font-semibold text-gray-100">{category.title}</h3>
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
              className="mt-4 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Clear search
            </button>
          </div>
        )}
      </motion.section>

      {/* Contact Support CTA */}
      <section className="w-full border-t border-white/[0.06]">
        <motion.div
          className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={stagger}
        >
          <motion.h2
            className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-100 mb-3"
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            style={{ textWrap: "balance" }}
          >
            Still need help?
          </motion.h2>
          <motion.p
            className="text-gray-400 mb-8"
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
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-medium bg-white text-[#09090b] hover:bg-gray-200 transition-colors duration-200"
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
