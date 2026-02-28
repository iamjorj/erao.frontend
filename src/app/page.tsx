"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Navbar, Footer } from "@/components/shared";
import { auth } from "@/lib/api";

/* ------------------------------------------------------------------ */
/*  DATA                                                               */
/* ------------------------------------------------------------------ */

const supportedDatabases = [
  { name: "PostgreSQL", logo: "/db-logos/postgresql.png" },
  { name: "MySQL", logo: "/db-logos/mysql.png" },
  { name: "MongoDB", logo: "/db-logos/mongodb.png" },
  { name: "SQL Server", logo: "/db-logos/sql-server.png" },
  { name: "Oracle", logo: "/db-logos/oracle.png" },
  { name: "SQLite", logo: "/db-logos/sqlite.webp" },
  { name: "MariaDB", logo: "/db-logos/mariadb.png" },
  { name: "CockroachDB", logo: "/db-logos/cockroachdb.png" },
  { name: "Redshift", logo: "/db-logos/redshift.png" },
  { name: "ClickHouse", logo: "/db-logos/clickhouse.png" },
  { name: "Firebird", logo: "/db-logos/firebird.png" },
  { name: "DuckDB", logo: "/db-logos/duckdb.png" },
  { name: "TimescaleDB", logo: "/db-logos/timescaledb.png" },
  { name: "YugabyteDB", logo: "/db-logos/yugabytedb.png" },
  { name: "Snowflake", logo: "/db-logos/snowflake.png" },
];

const supportedFiles = [
  { name: "CSV", logo: "/file-logos/csv.png", scale: "" },
  { name: "Excel", logo: "/file-logos/excel.png", scale: "" },
  { name: "JSON", logo: "/file-logos/json.svg", scale: "" },
  { name: "XML", logo: "/file-logos/xml.svg", scale: "" },
  { name: "Word", logo: "/file-logos/word.svg", scale: "scale-[1.35]" },
  { name: "TXT", logo: "/file-logos/txt.png", scale: "" },
];

/* ------------------------------------------------------------------ */
/*  ANIMATION VARIANTS                                                 */
/* ------------------------------------------------------------------ */

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const fadeScale = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
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
/*  FEATURES DATA                                                      */
/* ------------------------------------------------------------------ */

const features = [
  {
    title: "Natural Language Queries",
    desc: "Ask questions in plain English. No SQL, no code. Just type what you want to know and get instant answers from your data.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    gridClass: "md:col-span-1 md:row-span-1",
    accentColor: "blue",
  },
  {
    title: "15+ Database Support",
    desc: "PostgreSQL, MySQL, MongoDB, SQL Server, Oracle, Snowflake, ClickHouse, and more. Connect any database in seconds.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
      </svg>
    ),
    gridClass: "md:col-span-1 md:row-span-1",
    accentColor: "purple",
  },
  {
    title: "File Analysis",
    desc: "Upload CSV, Excel, JSON, XML, Word, or TXT files. Erao parses and analyzes them instantly — supports files with 500M+ rows.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    gridClass: "md:col-span-1 md:row-span-1",
    accentColor: "emerald",
  },
  {
    title: "Smart Visualizations",
    desc: "AI automatically picks the best chart type. Bar, line, pie, area charts and tables — all rendered beautifully with ECharts. Export to CSV, Excel, or PDF.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    gridClass: "md:col-span-2 md:row-span-1",
    accentColor: "blue",
  },
  {
    title: "Enterprise Security",
    desc: "AES-256 encryption for all credentials. Your data never leaves your database — we only send queries, never store results.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    gridClass: "md:col-span-1 md:row-span-1",
    accentColor: "emerald",
  },
];

const accentColors: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  blue: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    text: "text-blue-400",
    glow: "group-hover:shadow-[0_0_40px_-10px_rgba(59,130,246,0.3)]",
  },
  purple: {
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    text: "text-violet-400",
    glow: "group-hover:shadow-[0_0_40px_-10px_rgba(139,92,246,0.3)]",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    text: "text-emerald-400",
    glow: "group-hover:shadow-[0_0_40px_-10px_rgba(16,185,129,0.3)]",
  },
};

/* ------------------------------------------------------------------ */
/*  STEPS DATA                                                         */
/* ------------------------------------------------------------------ */

const steps = [
  {
    num: "01",
    title: "Connect",
    desc: "Add your database credentials or upload a file. We support 15+ databases and 6 file formats. Everything is encrypted with AES-256.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
      </svg>
    ),
  },
  {
    num: "02",
    title: "Ask",
    desc: "Type your question in plain English. Erao's AI understands your schema, generates the query, and returns results — no SQL exposed.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
      </svg>
    ),
  },
  {
    num: "03",
    title: "Visualize",
    desc: "Get beautiful charts, tables, and summaries instantly. Export to CSV, Excel, or PDF. Share insights with your team.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
      </svg>
    ),
  },
];

/* ------------------------------------------------------------------ */
/*  PRICING DATA                                                       */
/* ------------------------------------------------------------------ */

const pricingPlans = [
  {
    name: "Free",
    subtitle: "For trying out Erao",
    price: "$0",
    features: [
      "1 database connection",
      "1 file upload",
      "10 queries per month",
      "Basic visualizations",
      "Community support",
    ],
    cta: "Get Started",
    ctaHref: "/register",
    highlighted: false,
  },
  {
    name: "Pro",
    subtitle: "For power users and small teams",
    price: "$49",
    features: [
      "5 database connections",
      "10 file uploads",
      "100 queries per month",
      "Advanced visualizations",
      "Priority support",
      "Export to CSV, Excel, PDF",
    ],
    cta: "Start Free Trial",
    ctaHref: "/register",
    highlighted: true,
  },
  {
    name: "Enterprise",
    subtitle: "For large organizations",
    price: "$299",
    features: [
      "Unlimited connections",
      "Unlimited file uploads",
      "Unlimited queries",
      "Custom AI models",
      "Dedicated support",
      "SSO & audit logs",
      "On-premise deployment",
    ],
    cta: "Contact Sales",
    ctaHref: "/contact",
    highlighted: false,
  },
];

/* ------------------------------------------------------------------ */
/*  MOCK CHAT UI (Product Showcase)                                    */
/* ------------------------------------------------------------------ */

function MockChatUI() {
  return (
    <div className="flex h-full w-full bg-[#09090b]">
      {/* Sidebar */}
      <div className="hidden sm:flex w-[200px] lg:w-[220px] flex-col border-r border-white/[0.06] bg-[#0c0c0e] flex-shrink-0">
        {/* Sidebar header */}
        <div className="p-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <span className="text-[10px] font-semibold text-blue-400">E</span>
            </div>
            <span className="text-xs font-medium text-gray-300">Erao AI</span>
          </div>
        </div>
        {/* Conversations */}
        <div className="flex-1 p-2 space-y-0.5 overflow-hidden">
          <div className="px-2.5 py-2 rounded-lg bg-white/[0.06] border border-white/[0.06]">
            <p className="text-[11px] text-gray-200 truncate">Revenue by region Q4</p>
            <p className="text-[9px] text-gray-500 mt-0.5">2 min ago</p>
          </div>
          <div className="px-2.5 py-2 rounded-lg hover:bg-white/[0.03] transition-colors">
            <p className="text-[11px] text-gray-400 truncate">Top customers analysis</p>
            <p className="text-[9px] text-gray-600 mt-0.5">1 hour ago</p>
          </div>
          <div className="px-2.5 py-2 rounded-lg hover:bg-white/[0.03] transition-colors">
            <p className="text-[11px] text-gray-400 truncate">Churn prediction model</p>
            <p className="text-[9px] text-gray-600 mt-0.5">Yesterday</p>
          </div>
          <div className="px-2.5 py-2 rounded-lg hover:bg-white/[0.03] transition-colors">
            <p className="text-[11px] text-gray-400 truncate">Monthly sales report</p>
            <p className="text-[9px] text-gray-600 mt-0.5">2 days ago</p>
          </div>
        </div>
        {/* Sidebar footer */}
        <div className="p-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center">
              <span className="text-[8px] font-semibold text-white">JD</span>
            </div>
            <span className="text-[10px] text-gray-400">John Doe</span>
          </div>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat header */}
        <div className="px-4 py-2.5 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-xs text-gray-300 font-medium">PostgreSQL — analytics_db</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="px-2 py-0.5 rounded text-[9px] text-gray-500 bg-white/[0.04]">Schema</div>
            <div className="px-2 py-0.5 rounded text-[9px] text-gray-500 bg-white/[0.04]">Export</div>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-hidden px-4 py-4 space-y-4">
          {/* User message */}
          <div className="flex justify-end">
            <div className="max-w-[70%] px-3 py-2 rounded-2xl rounded-br-md bg-blue-500/15 border border-blue-500/20">
              <p className="text-[11px] text-gray-200 leading-relaxed">Show me total revenue by region for Q4 2025</p>
            </div>
          </div>

          {/* AI message with chart */}
          <div className="flex gap-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <div className="max-w-[85%] space-y-2.5">
              <p className="text-[11px] text-gray-300 leading-relaxed">Here&apos;s the revenue breakdown by region for Q4 2025:</p>

              {/* Mock chart */}
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-medium text-gray-400">Revenue by Region — Q4 2025</span>
                  <span className="text-[9px] text-gray-500">Bar Chart</span>
                </div>
                {/* Bars */}
                <div className="space-y-2">
                  {[
                    { label: "North America", value: 82, amount: "$2.4M", color: "bg-blue-500" },
                    { label: "Europe", value: 65, amount: "$1.9M", color: "bg-blue-400" },
                    { label: "Asia Pacific", value: 48, amount: "$1.4M", color: "bg-violet-400" },
                    { label: "Latin America", value: 28, amount: "$820K", color: "bg-violet-500" },
                  ].map((bar) => (
                    <div key={bar.label} className="flex items-center gap-2">
                      <span className="text-[9px] text-gray-500 w-20 text-right flex-shrink-0 truncate">{bar.label}</span>
                      <div className="flex-1 h-4 bg-white/[0.04] rounded-sm overflow-hidden">
                        <div
                          className={`h-full ${bar.color} rounded-sm`}
                          style={{ width: `${bar.value}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-gray-400 w-10 flex-shrink-0">{bar.amount}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI summary */}
              <p className="text-[11px] text-gray-400 leading-relaxed">
                North America leads with <span className="text-blue-400">$2.4M</span> (37% of total). Europe follows at <span className="text-blue-400">$1.9M</span>. Total Q4 revenue: <span className="text-emerald-400">$6.52M</span> — up 12% from Q3.
              </p>
            </div>
          </div>
        </div>

        {/* Input area */}
        <div className="px-4 py-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 py-2">
            <span className="text-[11px] text-gray-500 flex-1">Ask about your data...</span>
            <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SECTION DIVIDER                                                    */
/* ------------------------------------------------------------------ */

function SectionDivider({ variant = "blue" }: { variant?: "blue" | "purple" | "neutral" }) {
  const colors = {
    blue: "from-transparent via-blue-500/20 to-transparent",
    purple: "from-transparent via-violet-500/20 to-transparent",
    neutral: "from-transparent via-white/[0.06] to-transparent",
  };
  return (
    <div className="relative z-10 w-full max-w-3xl mx-auto px-6">
      <div className={`h-px bg-gradient-to-r ${colors[variant]}`} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CHECK ICON                                                         */
/* ------------------------------------------------------------------ */

function CheckIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  MAIN PAGE                                                          */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    if (auth.isAuthenticated()) {
      router.replace("/ai");
    }
  }, [router]);

  // Force dark scrollbar on html for this page
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("landing-dark-scroll");
    html.style.background = "#09090b";
    return () => {
      html.classList.remove("landing-dark-scroll");
      html.style.background = "";
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#09090b] text-gray-100 relative landing-dark">
      {/* Grid background layer */}
      <div className="landing-grid-bg landing-grid-fade fixed inset-0 pointer-events-none z-0" />

      <Navbar variant="dark" />

      {/* ===== HERO ===== */}
      <section className="relative z-10 w-full pt-20 pb-24 md:pt-28 md:pb-32 overflow-hidden">
        {/* Hero radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-blue-500/[0.07] rounded-full blur-[120px] pointer-events-none" />

        <motion.div
          className="max-w-4xl mx-auto px-6 text-center relative"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          {/* Pill badge */}
          <motion.div
            variants={fadeBlur}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2.5 rounded-full px-4 py-1.5 mb-10 border border-white/10 bg-white/[0.04] backdrop-blur-md"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
            </span>
            <span className="text-sm text-gray-300 font-medium">AI-Powered Data Intelligence</span>
            <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="font-semibold tracking-tighter leading-[1.05] mb-8 text-balance"
            style={{ fontSize: "clamp(2.5rem, 6vw + 1rem, 4.5rem)" }}
          >
            Ask your data anything.
            <br />
            <span className="text-gradient-hero">Get instant answers.</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-lg md:text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed text-balance"
          >
            Connect any database or upload a file. Ask questions in plain English.
            No SQL required — just answers, charts, and insights in seconds.
          </motion.p>

          {/* CTA */}
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/register"
              className="group relative w-full sm:w-auto bg-white text-[#09090b] px-8 py-3.5 rounded-full text-sm font-medium transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                Start Free
                <svg className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </span>
            </Link>
            <Link
              href="/features"
              className="w-full sm:w-auto px-8 py-3.5 rounded-full text-sm font-medium border border-white/10 text-gray-300 hover:border-white/20 hover:bg-white/[0.04] hover:text-white transition-all duration-300 focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]"
            >
              See Features
            </Link>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mt-12 text-sm text-gray-500"
          >
            {["Free forever", "2 min setup", "AES-256 encrypted"].map((t) => (
              <span key={t} className="flex items-center gap-2">
                <CheckIcon className="w-3.5 h-3.5 text-emerald-500/70" />
                <span>{t}</span>
              </span>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ===== PRODUCT SHOWCASE (Browser Frame) ===== */}
      <section className="relative z-10 w-full max-w-5xl mx-auto px-6 pb-20 md:pb-24">
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.96 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          {/* Glow behind browser frame */}
          <div className="absolute -inset-4 bg-blue-500/[0.06] rounded-3xl blur-[60px] pointer-events-none" />

          <div className="relative browser-frame glow-blue">
            <div className="browser-frame-bar">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#FF5F57]/80" />
                <div className="w-3 h-3 rounded-full bg-[#FFBD2E]/80" />
                <div className="w-3 h-3 rounded-full bg-[#28C840]/80" />
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-[#0a0a0a] rounded-md px-3 py-1.5 text-xs text-gray-500 max-w-xs mx-auto text-center flex items-center justify-center gap-1.5">
                  <svg className="w-3 h-3 text-emerald-500/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  erao.digital/ai
                </div>
              </div>
              <div className="w-[52px]" />
            </div>

            {/* Chat mockup inside browser frame */}
            <div className="relative aspect-[16/9] overflow-hidden">
              {/* Real screenshot — loads if file exists */}
              <Image
                src="/screenshots/chat-demo.png"
                alt="Erao AI Chat Interface"
                fill
                className="object-cover object-top"
                priority
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              {/* Fallback: fully built mock chat UI */}
              <div className="absolute inset-0">
                <MockChatUI />
              </div>
            </div>
          </div>

          <p className="text-center text-sm text-gray-500 mt-8 max-w-lg mx-auto">
            Ask questions in natural language — get charts, tables, and insights instantly.
          </p>
        </motion.div>
      </section>

      <SectionDivider variant="neutral" />

      {/* ===== LOGO STRIP ===== */}
      <section className="relative z-10 w-full py-16 md:py-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
          className="max-w-6xl mx-auto px-6"
        >
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="text-center text-sm text-gray-500 mb-12 font-medium tracking-wide uppercase"
          >
            Works with 15+ databases and popular file formats
          </motion.p>

          {/* Database logos — two rows on mobile, one row on desktop */}
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-5 sm:gap-x-7 sm:gap-y-6"
          >
            {supportedDatabases.map((db) => (
              <div
                key={db.name}
                className="group flex flex-col items-center gap-2 cursor-default"
              >
                <div className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl bg-white/[0.05] border border-white/[0.08] p-2 opacity-70 group-hover:opacity-100 group-hover:border-white/15 group-hover:bg-white/[0.08] transition-all duration-300">
                  <img src={db.logo} alt={db.name} className="w-full h-full object-contain brightness-110" />
                </div>
                <span className="text-[10px] text-gray-500 group-hover:text-gray-300 transition-colors duration-300">{db.name}</span>
              </div>
            ))}
          </motion.div>

          {/* Divider */}
          <div className="flex items-center gap-6 my-12">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
            <span className="text-xs text-gray-500 font-medium tracking-wider uppercase">File Uploads</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
          </div>

          {/* File format logos */}
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="flex flex-wrap items-center justify-center gap-x-8 gap-y-5 sm:gap-x-12"
          >
            {supportedFiles.map((file) => (
              <div
                key={file.name}
                className="group flex flex-col items-center gap-2 cursor-default"
              >
                <div className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl bg-white/[0.05] border border-white/[0.08] p-2 opacity-70 group-hover:opacity-100 group-hover:border-white/15 group-hover:bg-white/[0.08] transition-all duration-300">
                  <img src={file.logo} alt={file.name} className={`w-full h-full object-contain brightness-110 ${file.scale}`} />
                </div>
                <span className="text-[10px] text-gray-500 group-hover:text-gray-300 transition-colors duration-300">{file.name}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      <SectionDivider variant="blue" />

      {/* ===== FEATURES BENTO GRID ===== */}
      <section className="relative z-10 w-full max-w-6xl mx-auto px-6 py-20 md:py-28">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
          className="text-center mb-14"
        >
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="text-sm font-medium text-blue-400/80 mb-4 tracking-wide uppercase"
          >
            Features
          </motion.p>
          <motion.h2
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="font-semibold tracking-tighter mb-6 text-balance leading-[1.1]"
            style={{ fontSize: "clamp(1.875rem, 4vw + 0.5rem, 3rem)" }}
          >
            Everything you need to
            <br />
            <span className="text-gradient-hero">understand your data</span>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="text-gray-400 text-lg max-w-xl mx-auto leading-relaxed"
          >
            From databases to file uploads, Erao turns raw data into actionable insights.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={staggerSlow}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {features.map((f, i) => {
            const accent = accentColors[f.accentColor];
            return (
              <motion.div
                key={f.title}
                variants={fadeScale}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className={`group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-7 md:p-8 transition-all duration-500 hover:border-white/10 hover:bg-white/[0.04] ${accent.glow} ${f.gridClass}`}
              >
                {/* Subtle gradient overlay on hover */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br from-white/[0.02] to-transparent" />

                <div className="relative">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl ${accent.bg} border ${accent.border} flex items-center justify-center ${accent.text} mb-5 transition-transform duration-300 group-hover:scale-105`}>
                    {f.icon}
                  </div>

                  <h3 className="text-lg font-semibold text-gray-100 mb-3 tracking-tight">{f.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed max-w-lg">{f.desc}</p>

                  {/* Database logos for DB card */}
                  {i === 1 && (
                    <div className="flex items-center gap-2.5 mt-5 flex-wrap">
                      {supportedDatabases.slice(0, 6).map((db) => (
                        <div key={db.name} className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center p-1 hover:bg-white/[0.08] transition-colors">
                          <img src={db.logo} alt={db.name} className="w-full h-full object-contain opacity-60 hover:opacity-100 transition-opacity" />
                        </div>
                      ))}
                      <span className="text-xs text-gray-500">+{supportedDatabases.length - 6} more</span>
                    </div>
                  )}

                  {/* File badges for File Analysis card */}
                  {i === 2 && (
                    <div className="flex items-center gap-2 mt-5 flex-wrap">
                      {supportedFiles.map((file) => (
                        <span key={file.name} className="px-2.5 py-1 text-xs text-gray-400 bg-white/[0.04] border border-white/[0.06] rounded-lg hover:bg-white/[0.08] hover:text-gray-300 transition-all">
                          {file.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Mini chart preview for Smart Visualizations card */}
                  {i === 3 && (
                    <div className="flex items-end gap-1.5 mt-5 h-12">
                      {[40, 65, 45, 80, 55, 70, 90, 60, 75, 50, 85, 68].map((h, idx) => (
                        <div
                          key={idx}
                          className="flex-1 rounded-t bg-gradient-to-t from-blue-500/30 to-blue-400/10 transition-all duration-300 group-hover:from-blue-500/50 group-hover:to-blue-400/20"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      <SectionDivider variant="purple" />

      {/* ===== HOW IT WORKS ===== */}
      <section className="relative z-10 w-full py-20 md:py-28 overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-violet-500/[0.05] rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 relative">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="text-sm font-medium text-violet-400/80 mb-4 tracking-wide uppercase"
            >
              How It Works
            </motion.p>
            <motion.h2
              variants={fadeUp}
              transition={{ duration: 0.6 }}
              className="font-semibold tracking-tighter mb-6 text-balance leading-[1.1]"
              style={{ fontSize: "clamp(1.875rem, 4vw + 0.5rem, 3rem)" }}
            >
              Up and running in
              <br />
              <span className="text-gradient-hero">under 2 minutes</span>
            </motion.h2>
            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="text-gray-400 text-lg max-w-lg mx-auto leading-relaxed"
            >
              No complex setup. No learning curve. Just connect and ask.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={staggerSlow}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 relative"
          >
            {/* Connecting line (desktop only) */}
            <div className="hidden md:block absolute top-[52px] left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] h-px">
              <div className="w-full h-full bg-gradient-to-r from-blue-500/20 via-violet-500/20 to-emerald-500/20" />
              {/* Animated dot on the line */}
              <div className="absolute top-1/2 left-0 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-400/60 animate-pulse" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-violet-400/60 animate-pulse" />
              <div className="absolute top-1/2 right-0 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400/60 animate-pulse" />
            </div>

            {steps.map((step, i) => {
              const gradients = [
                "from-blue-500 to-blue-600",
                "from-violet-500 to-violet-600",
                "from-emerald-500 to-emerald-600",
              ];
              const glowColors = [
                "shadow-blue-500/20",
                "shadow-violet-500/20",
                "shadow-emerald-500/20",
              ];
              return (
                <motion.div
                  key={step.num}
                  variants={fadeUp}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="group text-center relative"
                >
                  {/* Step number badge */}
                  <div className={`relative w-[52px] h-[52px] rounded-2xl bg-gradient-to-br ${gradients[i]} flex items-center justify-center mx-auto mb-6 shadow-lg ${glowColors[i]} transition-shadow duration-300 group-hover:shadow-xl`}>
                    <span className="text-sm font-semibold text-white">{step.num}</span>
                    {/* Ring effect */}
                    <div className={`absolute -inset-1.5 rounded-2xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                  </div>

                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-gray-400 mx-auto mb-4 group-hover:border-white/10 group-hover:text-gray-300 transition-all duration-300">
                    {step.icon}
                  </div>

                  <h3 className="text-xl font-semibold text-gray-100 mb-3 tracking-tight">{step.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed max-w-xs mx-auto">{step.desc}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      <SectionDivider variant="neutral" />

      {/* ===== PRICING ===== */}
      <section className="relative z-10 w-full py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
            className="text-center mb-14"
          >
            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="text-sm font-medium text-blue-400/80 mb-4 tracking-wide uppercase"
            >
              Pricing
            </motion.p>
            <motion.h2
              variants={fadeUp}
              transition={{ duration: 0.6 }}
              className="font-semibold tracking-tighter mb-6 text-balance leading-[1.1]"
              style={{ fontSize: "clamp(1.875rem, 4vw + 0.5rem, 3rem)" }}
            >
              Simple, transparent pricing
            </motion.h2>
            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="text-gray-400 text-lg max-w-lg mx-auto leading-relaxed"
            >
              Start free. Upgrade when you need more power.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={staggerSlow}
            className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto items-start"
          >
            {pricingPlans.map((plan) => (
              <motion.div
                key={plan.name}
                variants={fadeUp}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className={`group relative rounded-2xl p-7 transition-all duration-500 ${
                  plan.highlighted
                    ? "bg-white/[0.04] border-2 border-blue-500/30 shadow-[0_0_60px_-15px_rgba(59,130,246,0.2)] hover:shadow-[0_0_80px_-15px_rgba(59,130,246,0.3)] hover:border-blue-500/40"
                    : "bg-white/[0.02] border border-white/[0.06] hover:border-white/10 hover:bg-white/[0.04]"
                }`}
              >
                {/* Popular badge */}
                {plan.highlighted && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-medium bg-blue-500 text-white shadow-lg shadow-blue-500/30">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                      </svg>
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-100 mb-1">{plan.name}</h3>
                  <p className="text-sm text-gray-500">{plan.subtitle}</p>
                </div>

                <div className="mb-8">
                  <span className="text-4xl font-semibold tracking-tight text-gray-100">{plan.price}</span>
                  <span className="text-gray-500 text-sm ml-1">/month</span>
                </div>

                <ul className="space-y-3.5 mb-8">
                  {plan.features.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm">
                      <CheckIcon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${plan.highlighted ? "text-blue-400" : "text-gray-500"}`} />
                      <span className="text-gray-300">{item}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.ctaHref}
                  className={`block w-full py-3 text-center rounded-full text-sm font-medium transition-all duration-300 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b] ${
                    plan.highlighted
                      ? "bg-white text-[#09090b] hover:bg-gray-100 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] focus-visible:ring-white/50"
                      : "border border-white/10 text-gray-300 hover:border-white/20 hover:bg-white/[0.04] hover:text-white focus-visible:ring-white/30"
                  }`}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <SectionDivider variant="blue" />

      {/* ===== FINAL CTA ===== */}
      <section className="relative z-10 w-full py-24 md:py-32 overflow-hidden">
        {/* Multi-layered glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-blue-500/[0.06] rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[300px] h-[300px] bg-violet-500/[0.04] rounded-full blur-[80px] pointer-events-none" />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
          className="max-w-3xl mx-auto px-6 text-center relative"
        >
          <motion.h2
            variants={fadeBlur}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="font-semibold tracking-tighter mb-8 text-balance leading-[1.1]"
            style={{ fontSize: "clamp(1.875rem, 4vw + 0.5rem, 3rem)" }}
          >
            Stop struggling with data.
            <br />
            <span className="text-gradient-hero">Start getting answers.</span>
          </motion.h2>

          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="text-gray-400 mb-12 text-lg leading-relaxed max-w-lg mx-auto"
          >
            Join hundreds of teams who save hours every week with Erao.
            Start with the free plan — no credit card required.
          </motion.p>

          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/register"
              className="group relative w-full sm:w-auto bg-white text-[#09090b] px-10 py-4 rounded-full text-base font-medium transition-all duration-300 hover:shadow-[0_0_50px_rgba(255,255,255,0.15)] hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                Start Free Today
                <svg className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </span>
            </Link>
            <Link
              href="/contact"
              className="w-full sm:w-auto px-10 py-4 rounded-full text-base font-medium border border-white/10 text-gray-300 hover:border-white/20 hover:bg-white/[0.04] hover:text-white transition-all duration-300 focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]"
            >
              Talk to Sales
            </Link>
          </motion.div>

          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mt-10 text-sm text-gray-500"
          >
            {["No credit card required", "Free plan forever", "Cancel anytime"].map((t) => (
              <span key={t} className="flex items-center gap-2">
                <CheckIcon className="w-3.5 h-3.5 text-emerald-500/70" />
                <span>{t}</span>
              </span>
            ))}
          </motion.div>
        </motion.div>
      </section>

      <Footer variant="dark" />
    </div>
  );
}
