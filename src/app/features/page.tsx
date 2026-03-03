"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { PageLayout } from "@/components/shared";

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
/*  NEUTRAL ACCENT (single style for all cards)                        */
/* ------------------------------------------------------------------ */

const neutralAccent = {
  bg: "bg-white/[0.06]",
  border: "border-white/[0.08]",
  text: "text-gray-400",
};

/* ------------------------------------------------------------------ */
/*  DATA                                                               */
/* ------------------------------------------------------------------ */

const features = [
  {
    title: "Natural Language Queries",
    description:
      "Ask questions in plain English. No SQL knowledge required. Our AI understands context and translates your questions into accurate queries — whether from a database or an uploaded file.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    ),
    gridClass: "md:col-span-1",
  },
  {
    title: "Instant Visualizations",
    description:
      "Get results as clean tables, bar charts, line graphs, pie charts, or summaries. AI automatically picks the best chart type. Switch between views with one click.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
    gridClass: "md:col-span-1",
  },
  {
    title: "Databases & File Uploads",
    description:
      "Connect 15+ databases including PostgreSQL, MySQL, MongoDB, Oracle, Snowflake, and more. Or upload CSV, Excel, JSON, XML, Word, and TXT files. Start querying in seconds.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
        />
      </svg>
    ),
    gridClass: "md:col-span-1",
  },
  {
    title: "Conversation History",
    description:
      "Your queries are saved in conversations. Pick up where you left off, reference previous results, or share insights with your team.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    gridClass: "md:col-span-1",
  },
  {
    title: "Export & Share",
    description:
      "Export your results to CSV, Excel, or PDF. Share insights with teammates or stakeholders easily.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
    gridClass: "md:col-span-1",
  },
  {
    title: "Enterprise Security",
    description:
      "Database credentials encrypted with AES-256. Uploaded files stored with encryption. All connections use SSL/TLS.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
        />
      </svg>
    ),
    gridClass: "md:col-span-1",
  },
];

const steps = [
  {
    num: "01",
    title: "Connect",
    desc: "Add your database connection details or upload a file (CSV, Excel, JSON, Word, and more). We support 15+ databases. Everything is encrypted.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
        />
      </svg>
    ),
  },
  {
    num: "02",
    title: "Ask",
    desc: "Type your question in plain English. Our AI understands your schema, generates the query, and returns results — no SQL exposed.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
        />
      </svg>
    ),
  },
  {
    num: "03",
    title: "Get Answers",
    desc: "See results as tables, charts, or summaries. Export to CSV, Excel, or PDF. Share insights with your team.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6"
        />
      </svg>
    ),
  },
];

const useCases = [
  {
    title: "For Product Teams",
    description:
      "Track user engagement, analyze feature adoption, and make data-driven decisions without waiting for engineering.",
    examples: ["User signups this week", "Most used features by cohort", "Churn analysis by plan"],
  },
  {
    title: "For Sales Teams",
    description:
      "Get real-time pipeline insights, track performance, and identify opportunities without complex reporting tools.",
    examples: ["Deals closed this month", "Top performing reps", "Revenue by region"],
  },
  {
    title: "For Support Teams",
    description:
      "Find customer information instantly, track ticket trends, and identify common issues to improve service.",
    examples: ["Customer's recent orders", "Open tickets by priority", "Average resolution time"],
  },
];

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

export default function FeaturesPage() {
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

  return (
    <PageLayout currentPage="features" variant="dark">
      {/* ===== HERO ===== */}
      <section className="relative z-10 w-full pt-20 pb-24 md:pt-32 md:pb-36 overflow-hidden">
        {/* Radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-white/[0.03] rounded-full blur-[140px] pointer-events-none" />

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
            className="inline-flex items-center gap-2.5 rounded-full px-4 py-1.5 mb-8 border border-white/10 bg-white/[0.04] backdrop-blur-md"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-gray-400 opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-gray-400" />
            </span>
            <span className="text-sm text-gray-400 font-medium">Platform Features</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="font-semibold tracking-tighter leading-[1.05] mb-6 text-balance"
            style={{ fontSize: "clamp(2.25rem, 5vw + 1rem, 3.75rem)" }}
          >
            Everything you need to
            <br />
            <span className="text-gray-100">
              query your data
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-lg md:text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed text-balance"
          >
            Connect a database or upload a file. Ask in plain English.
            Get instant answers with beautiful visualizations.
          </motion.p>

          {/* CTA */}
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/register"
              className="w-full sm:w-auto bg-white text-[#09090b] px-8 py-3.5 rounded-full text-sm font-medium transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:bg-gray-100 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]"
            >
              Start Free
            </Link>
            <Link
              href="/pricing"
              className="w-full sm:w-auto px-8 py-3.5 rounded-full text-sm font-medium border border-white/10 text-gray-300 hover:bg-white/[0.06] hover:border-white/15 active:scale-[0.98] transition-all duration-300 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]"
            >
              View Pricing
            </Link>
          </motion.div>
        </motion.div>
      </section>

      <SectionDivider />

      {/* ===== FEATURES GRID ===== */}
      <section className="relative z-10 w-full py-28 md:py-36">
        <motion.div
          className="max-w-5xl mx-auto px-6 relative"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          {/* Section label */}
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="text-sm font-medium text-gray-500 tracking-wide uppercase text-center mb-3"
          >
            Capabilities
          </motion.p>
          <motion.h2
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tighter text-center mb-4 text-balance text-gray-100"
          >
            Powerful features, simple experience
          </motion.h2>
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="text-gray-400 text-center mb-16 max-w-2xl mx-auto text-balance leading-relaxed"
          >
            Everything you need to turn raw data into actionable insights, without writing a single line of code.
          </motion.p>

          {/* Bento grid */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
            variants={staggerSlow}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
          >
            {features.map((feature) => (
                <motion.div
                  key={feature.title}
                  variants={fadeUp}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className={`group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04] ${feature.gridClass}`}
                >
                  <div className="mb-5">
                    <div
                      className={`w-10 h-10 rounded-xl ${neutralAccent.bg} border ${neutralAccent.border} ${neutralAccent.text} flex items-center justify-center transition-all duration-300`}
                    >
                      {feature.icon}
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-100 mb-2.5 tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
                </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      <SectionDivider />

      {/* ===== HOW IT WORKS ===== */}
      <section className="relative z-10 w-full py-28 md:py-36">
        <motion.div
          className="max-w-5xl mx-auto px-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          {/* Section label */}
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="text-sm font-medium text-gray-500 tracking-wide uppercase text-center mb-3"
          >
            How It Works
          </motion.p>
          <motion.h2
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tighter text-center mb-6 text-balance text-gray-100"
          >
            Three steps to insights
          </motion.h2>
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="text-gray-400 text-center mb-16 max-w-xl mx-auto text-balance leading-relaxed"
          >
            From raw data to answers in under two minutes. No SQL, no waiting.
          </motion.p>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-4 relative"
            variants={staggerSlow}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
          >
            {/* Connecting lines between icons (desktop only) */}
            <div className="hidden sm:block absolute top-[52px] left-[calc(16.67%+40px)] right-[calc(50%+40px)] h-px bg-gradient-to-r from-white/[0.06] to-white/[0.08]" />
            <div className="hidden sm:block absolute top-[52px] left-[calc(50%+40px)] right-[calc(16.67%+40px)] h-px bg-gradient-to-r from-white/[0.08] to-white/[0.06]" />

            {steps.map((step) => (
                <motion.div
                  key={step.num}
                  variants={fadeUp}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="group text-center relative z-10"
                >
                  {/* Step icon */}
                  <div className="relative mx-auto mb-6">
                    <div className={`w-14 h-14 rounded-2xl ${neutralAccent.bg} border ${neutralAccent.border} flex items-center justify-center mx-auto transition-all duration-300`}>
                      <span className={neutralAccent.text}>{step.icon}</span>
                    </div>
                    <span className={`absolute -top-2 -right-2 w-6 h-6 rounded-full ${neutralAccent.bg} border ${neutralAccent.border} flex items-center justify-center text-[10px] font-semibold text-gray-300`}>
                      {step.num}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-100 mb-2 tracking-tight">{step.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed max-w-xs mx-auto">{step.desc}</p>
                </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      <SectionDivider />

      {/* ===== USE CASES ===== */}
      <section className="relative z-10 w-full py-28 md:py-36">
        <motion.div
          className="max-w-5xl mx-auto px-6 relative"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          {/* Section label */}
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="text-sm font-medium text-gray-500 tracking-wide uppercase text-center mb-3"
          >
            Use Cases
          </motion.p>
          <motion.h2
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tighter text-center mb-4 text-balance text-gray-100"
          >
            Built for every team
          </motion.h2>
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="text-gray-400 text-center mb-16 max-w-2xl mx-auto text-balance leading-relaxed"
          >
            From product managers to sales reps, anyone can get insights from your data.
          </motion.p>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6"
            variants={staggerSlow}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
          >
            {useCases.map((useCase) => (
                <motion.div
                  key={useCase.title}
                  variants={fadeUp}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04]"
                >
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-white/[0.06] text-gray-400 border border-white/[0.08] mb-5">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                    {useCase.title}
                  </div>
                  <p className="text-sm text-gray-400 mb-6 leading-relaxed">{useCase.description}</p>
                  <div className="space-y-2.5">
                    {useCase.examples.map((example) => (
                      <div key={example} className="flex items-center gap-2.5 text-sm">
                        <svg className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                        <span className="text-gray-500 group-hover:text-gray-400 transition-colors duration-200">{example}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      <SectionDivider />

      {/* ===== CTA ===== */}
      <section className="relative z-10 w-full py-28 md:py-36 overflow-hidden">
        <motion.div
          className="max-w-3xl mx-auto px-6 text-center relative"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.h2
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tighter mb-4 text-balance text-gray-100"
          >
            Ready to talk to your data?
          </motion.h2>
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="text-gray-400 mb-10 text-lg text-balance leading-relaxed"
          >
            Start free and see results in under 2 minutes.
          </motion.p>
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/register"
              className="w-full sm:w-auto bg-white text-[#09090b] px-8 py-3.5 rounded-full text-sm font-medium transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:bg-gray-100 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]"
            >
              Start Free
            </Link>
            <Link
              href="/pricing"
              className="w-full sm:w-auto px-8 py-3.5 rounded-full text-sm font-medium border border-white/10 text-gray-300 hover:bg-white/[0.06] hover:border-white/15 active:scale-[0.98] transition-all duration-300 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]"
            >
              View Pricing
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </PageLayout>
  );
}
