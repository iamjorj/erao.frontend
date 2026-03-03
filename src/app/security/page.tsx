"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
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
/*  DATA                                                               */
/* ------------------------------------------------------------------ */

const securityFeatures = [
  {
    title: "Encrypted Credentials",
    description:
      "All database credentials are encrypted using AES-256 encryption. Uploaded files are stored with encryption at rest. Your passwords and connection strings are never stored in plain text.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    accentColor: "emerald",
  },
  {
    title: "Secure Connections",
    description:
      "All connections to your databases use SSL/TLS encryption. File uploads are transmitted over HTTPS. Data in transit is always protected.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    accentColor: "blue",
  },
  {
    title: "Minimal Data Storage",
    description:
      "We never store your actual database data -- only the queries you run. Uploaded files are stored encrypted and can be deleted at any time. Query results are never persisted.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
      </svg>
    ),
    accentColor: "violet",
  },
  {
    title: "Read-Only Queries",
    description:
      "Erao only executes read-only (SELECT) queries on your databases. File queries run against an isolated copy of your data. We never modify your original data.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    accentColor: "emerald",
  },
];

const neutralAccent = { bg: "bg-white/[0.06]", border: "border-white/[0.08]", text: "text-gray-400", glow: "" };

const dataFlowSteps = [
  {
    step: 1,
    title: "You connect a database or upload a file",
    desc: "Database credentials are encrypted with AES-256. Uploaded files are stored with encryption at rest.",
    accentColor: "emerald",
  },
  {
    step: 2,
    title: "You ask a question",
    desc: "Your natural language question is sent to our servers over an encrypted connection.",
    accentColor: "blue",
  },
  {
    step: 3,
    title: "We generate a query",
    desc: "Our AI translates your question into a query. Only metadata about your schema is used -- never your actual data.",
    accentColor: "violet",
  },
  {
    step: 4,
    title: "Query executes securely",
    desc: "For databases, the query runs directly via SSL/TLS. For files, the query runs against an isolated copy of your data.",
    accentColor: "blue",
  },
  {
    step: 5,
    title: "Results displayed to you",
    desc: "The results are sent back to your browser. We do not store query results -- only the query text.",
    accentColor: "emerald",
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

export default function SecurityPage() {
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
    <PageLayout currentPage="security" variant="dark">
      {/* Hero */}
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
            variants={fadeUp}
            transition={{ duration: 0.6 }}
          >
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-6">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/[0.06] border border-white/[0.08] rounded-2xl flex items-center justify-center relative z-10">
                <svg className="w-7 h-7 sm:w-8 sm:h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              {/* glow removed */}
            </div>
          </motion.div>

          <motion.div
            variants={fadeBlur}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="inline-flex items-center gap-2.5 rounded-full px-4 py-1.5 mb-8 border border-white/10 bg-white/[0.04] backdrop-blur-md"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-white/30 opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white/60" />
            </span>
            <span className="text-sm text-gray-300 font-medium">Enterprise-Grade Security</span>
          </motion.div>

          <motion.h1
            className="font-semibold tracking-tighter text-gray-100 mb-4 text-balance"
            variants={fadeUp}
            transition={{ duration: 0.6, delay: 0.1 }}
            style={{ fontSize: "clamp(2rem, 5vw + 0.5rem, 3rem)" }}
          >
            Security at{" "}
            <span className="text-gray-100">
              Erao
            </span>
          </motion.h1>

          <motion.p
            className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed"
            variants={fadeUp}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Your data security is our top priority. We&apos;ve built Erao from the ground up with security in mind.
          </motion.p>
        </motion.div>
      </section>

      <SectionDivider />

      {/* Security Features */}
      <motion.section
        className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-24 sm:py-32"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        variants={stagger}
      >
        <motion.p
          className="uppercase text-sm font-medium text-gray-500 tracking-wide text-center mb-3"
          variants={fadeUp}
          transition={{ duration: 0.5 }}
        >
          Core Protections
        </motion.p>
        <motion.h2
          variants={fadeUp}
          transition={{ duration: 0.6 }}
          className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tighter text-center mb-4 text-balance"
        >
          Built-in{" "}
          <span className="text-gray-100">
            security
          </span>
        </motion.h2>
        <motion.p
          variants={fadeUp}
          transition={{ duration: 0.5 }}
          className="text-gray-400 text-center mb-16 max-w-xl mx-auto text-balance leading-relaxed"
        >
          Multiple layers of protection for your data at every step.
        </motion.p>

        <motion.div
          className="grid sm:grid-cols-2 gap-4 sm:gap-5"
          variants={staggerSlow}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          {securityFeatures.map((feature) => (
              <motion.div
                key={feature.title}
                className="group bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 sm:p-7 hover:border-white/10 hover:bg-white/[0.04] transition-all duration-300"
                variants={fadeUp}
                transition={{ duration: 0.5 }}
              >
                <div className="relative mb-4">
                  <div className={`w-11 h-11 ${neutralAccent.bg} border ${neutralAccent.border} ${neutralAccent.text} rounded-xl flex items-center justify-center relative z-10`}>
                    {feature.icon}
                  </div>
                  {/* glow removed */}
                </div>
                <h3 className="text-lg font-semibold text-gray-100 mb-2 tracking-tight">{feature.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
        </motion.div>
      </motion.section>

      <SectionDivider />

      {/* How Data Flows */}
      <section className="relative w-full overflow-hidden">
        {/* Subtle glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] bg-white/[0.02] rounded-full blur-[120px] pointer-events-none" />

        <motion.div
          className="max-w-5xl mx-auto px-4 sm:px-6 py-24 sm:py-32 relative"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={stagger}
        >
          <motion.div
            className="text-center mb-14 sm:mb-16"
            variants={fadeUp}
            transition={{ duration: 0.5 }}
          >
            <p className="uppercase text-sm font-medium text-gray-500 tracking-wide mb-3">
              Data Flow
            </p>
            <h2
              className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tighter text-gray-100 text-balance"
            >
              How your data{" "}
              <span className="text-gray-100">
                flows
              </span>
            </h2>
          </motion.div>

          <div className="max-w-3xl mx-auto space-y-1">
            {dataFlowSteps.map((item, i) => (
                <motion.div
                  key={item.step}
                  className="relative flex gap-5 pb-8"
                  variants={fadeUp}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                >
                  {/* Timeline line */}
                  {i < dataFlowSteps.length - 1 && (
                    <div className="absolute left-[18px] top-10 w-px h-[calc(100%-16px)] bg-gradient-to-b from-white/10 to-transparent" />
                  )}

                  {/* Step number */}
                  <div className={`w-9 h-9 ${neutralAccent.bg} border ${neutralAccent.border} ${neutralAccent.text} rounded-full flex items-center justify-center flex-shrink-0 text-sm font-medium`}>
                    {item.step}
                  </div>

                  {/* Content */}
                  <div className="pt-1">
                    <h3 className="font-semibold text-gray-200 mb-1.5 tracking-tight">{item.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
          </div>
        </motion.div>
      </section>

      <SectionDivider />

      {/* Contact CTA */}
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
            Security Questions?
          </motion.h2>
          <motion.p
            className="text-gray-400 mb-10 max-w-lg mx-auto text-lg leading-relaxed"
            variants={fadeUp}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            If you have security concerns or want to report a vulnerability, please contact our team.
          </motion.p>
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            variants={fadeUp}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Link
              href="/contact"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-sm font-medium bg-white text-[#09090b] hover:bg-gray-100 hover:shadow-[0_0_40px_rgba(255,255,255,0.15)] active:scale-[0.98] transition-all duration-300 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]"
            >
              Contact Security Team
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <Link
              href="/help"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-sm font-medium border border-white/10 text-gray-300 hover:bg-white/[0.06] hover:border-white/15 active:scale-[0.98] transition-all duration-300 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]"
            >
              Visit Help Center
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </PageLayout>
  );
}
