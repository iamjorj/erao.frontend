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

const stagger = {
  visible: {
    transition: { staggerChildren: 0.1 },
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
  },
];

const dataFlowSteps = [
  {
    step: 1,
    title: "You connect a database or upload a file",
    desc: "Database credentials are encrypted with AES-256. Uploaded files are stored with encryption at rest.",
  },
  {
    step: 2,
    title: "You ask a question",
    desc: "Your natural language question is sent to our servers over an encrypted connection.",
  },
  {
    step: 3,
    title: "We generate a query",
    desc: "Our AI translates your question into a query. Only metadata about your schema is used -- never your actual data.",
  },
  {
    step: 4,
    title: "Query executes securely",
    desc: "For databases, the query runs directly via SSL/TLS. For files, the query runs against an isolated copy of your data.",
  },
  {
    step: 5,
    title: "Results displayed to you",
    desc: "The results are sent back to your browser. We do not store query results -- only the query text.",
  },
];

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
      <section className="relative w-full pt-16 sm:pt-24 pb-12 sm:pb-16 overflow-hidden">
        {/* Emerald radial glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[350px] bg-emerald-500/[0.05] rounded-full blur-[120px] pointer-events-none" />

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
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
          </motion.div>

          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.6, delay: 0.05 }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-6">
              Enterprise-Grade Security
            </span>
          </motion.div>

          <motion.h1
            className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tighter text-gray-100 mb-4"
            variants={fadeUp}
            transition={{ duration: 0.6, delay: 0.1 }}
            style={{ textWrap: "balance" }}
          >
            Security at Erao
          </motion.h1>

          <motion.p
            className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto"
            variants={fadeUp}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Your data security is our top priority. We&apos;ve built Erao from the ground up with security in mind.
          </motion.p>
        </motion.div>
      </section>

      {/* Security Features */}
      <motion.section
        className="w-full max-w-5xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        variants={stagger}
      >
        <motion.p
          className="uppercase text-sm font-medium text-emerald-400/80 tracking-wide mb-6"
          variants={fadeUp}
          transition={{ duration: 0.5 }}
        >
          Core Protections
        </motion.p>

        <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
          {securityFeatures.map((feature, i) => (
            <motion.div
              key={feature.title}
              className="group bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 sm:p-6 hover:border-white/10 hover:bg-white/[0.04] transition-all duration-300"
              variants={fadeUp}
              transition={{ duration: 0.5, delay: i * 0.08 }}
            >
              <div className="w-11 h-11 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center mb-4">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-100 mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* How Data Flows */}
      <section className="w-full border-t border-white/[0.06]">
        <motion.div
          className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={stagger}
        >
          <motion.div
            className="text-center mb-10 sm:mb-14"
            variants={fadeUp}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-5">
              Data Flow
            </span>
            <h2
              className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-100"
              style={{ textWrap: "balance" }}
            >
              How Your Data Flows
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
                <div className="w-9 h-9 bg-white/[0.06] border border-white/[0.1] text-gray-300 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-medium">
                  {item.step}
                </div>

                {/* Content */}
                <div className="pt-1">
                  <h3 className="font-semibold text-gray-200 mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Contact CTA */}
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
            Security Questions?
          </motion.h2>
          <motion.p
            className="text-gray-400 mb-8 max-w-lg mx-auto"
            variants={fadeUp}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            If you have security concerns or want to report a vulnerability, please contact our team.
          </motion.p>
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
            variants={fadeUp}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-medium bg-white text-[#09090b] hover:bg-gray-200 transition-colors duration-200"
            >
              Contact Security Team
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <Link
              href="/help"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-medium border border-white/10 text-gray-300 hover:bg-white/[0.06] hover:border-white/15 transition-all duration-200"
            >
              Visit Help Center
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </PageLayout>
  );
}
