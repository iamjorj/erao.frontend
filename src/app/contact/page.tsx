"use client";

import { useState, useEffect } from "react";
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

/* ------------------------------------------------------------------ */
/*  DATA                                                               */
/* ------------------------------------------------------------------ */

const SALES_EMAIL = "sales@erao.digital";
const SUPPORT_EMAIL = "support@erao.digital";

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

export default function ContactPage() {
  const [copied, setCopied] = useState<string | null>(null);

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

  const handleCopy = async (type: string, email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <PageLayout currentPage="contact" variant="dark">
      {/* Hero */}
      <section className="relative w-full pt-20 sm:pt-32 pb-16 sm:pb-20 overflow-hidden">
        {/* Radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-white/[0.03] rounded-full blur-[140px] pointer-events-none" />

        <motion.div
          className="relative text-center max-w-4xl mx-auto px-4 sm:px-6"
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
              <span className="absolute inline-flex h-full w-full rounded-full bg-white/30 opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white/60" />
            </span>
            <span className="text-sm text-gray-300 font-medium">Contact Us</span>
          </motion.div>

          <motion.h1
            className="font-semibold tracking-tighter text-gray-100 mb-4 text-balance"
            variants={fadeUp}
            transition={{ duration: 0.6, delay: 0.1 }}
            style={{ fontSize: "clamp(2rem, 5vw + 0.5rem, 3rem)" }}
          >
            Get in{" "}
            <span className="text-gray-100">
              Touch
            </span>
          </motion.h1>

          <motion.p
            className="text-base sm:text-lg text-gray-400 max-w-xl mx-auto leading-relaxed"
            variants={fadeUp}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Have questions about Erao? We&apos;re here to help.
          </motion.p>
        </motion.div>
      </section>

      <SectionDivider />

      {/* Contact Cards */}
      <section className="relative w-full py-16 sm:py-24">
        <motion.div
          className="relative max-w-2xl mx-auto px-4 sm:px-6 grid sm:grid-cols-2 gap-4 sm:gap-5"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={stagger}
        >
          {/* Sales */}
          <motion.button
            onClick={() => handleCopy("sales", SALES_EMAIL)}
            className="group bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 sm:p-8 hover:border-white/10 hover:bg-white/[0.04] active:scale-[0.98] transition-all duration-300 text-center cursor-pointer"
            variants={fadeUp}
            transition={{ duration: 0.5 }}
          >
            <div className="relative mx-auto mb-5 w-14 h-14">
              <div
                className={`w-14 h-14 rounded-xl flex items-center justify-center relative z-10 transition-all duration-300 ${
                  copied === "sales"
                    ? "bg-white/[0.08] border border-white/[0.12] text-white"
                    : "bg-white/[0.06] border border-white/[0.08] text-gray-400"
                }`}
              >
                {copied === "sales" ? (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
              {/* glow removed */}
            </div>

            <h3 className="text-lg font-semibold text-gray-100 mb-2 tracking-tight">Sales</h3>
            <p className="text-sm text-gray-400 mb-4">
              Interested in upgrading your plan or custom solutions?
            </p>
            <p className="text-sm font-medium text-gray-300 mb-4 font-mono">{SALES_EMAIL}</p>

            <span
              className={`inline-flex items-center gap-2 text-sm font-medium transition-colors duration-200 ${
                copied === "sales" ? "text-white" : "text-gray-500 group-hover:text-gray-300"
              }`}
            >
              {copied === "sales" ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Email Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                  </svg>
                  Click to Copy
                </>
              )}
            </span>
          </motion.button>

          {/* Support */}
          <motion.button
            onClick={() => handleCopy("support", SUPPORT_EMAIL)}
            className="group bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 sm:p-8 hover:border-white/10 hover:bg-white/[0.04] active:scale-[0.98] transition-all duration-300 text-center cursor-pointer"
            variants={fadeUp}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="relative mx-auto mb-5 w-14 h-14">
              <div
                className={`w-14 h-14 rounded-xl flex items-center justify-center relative z-10 transition-all duration-300 ${
                  copied === "support"
                    ? "bg-white/[0.08] border border-white/[0.12] text-white"
                    : "bg-white/[0.06] border border-white/[0.08] text-gray-400"
                }`}
              >
                {copied === "support" ? (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                )}
              </div>
              {/* glow removed */}
            </div>

            <h3 className="text-lg font-semibold text-gray-100 mb-2 tracking-tight">Support</h3>
            <p className="text-sm text-gray-400 mb-4">
              Need help with your account, connections, or technical issues?
            </p>
            <p className="text-sm font-medium text-gray-300 mb-4 font-mono">{SUPPORT_EMAIL}</p>

            <span
              className={`inline-flex items-center gap-2 text-sm font-medium transition-colors duration-200 ${
                copied === "support" ? "text-white" : "text-gray-500 group-hover:text-gray-300"
              }`}
            >
              {copied === "support" ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Email Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                  </svg>
                  Click to Copy
                </>
              )}
            </span>
          </motion.button>
        </motion.div>

        {/* Response Time */}
        <motion.div
          className="relative mt-14 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="inline-flex items-center gap-3 px-5 py-3 bg-white/[0.02] border border-white/[0.06] rounded-full">
            <div className="w-2 h-2 rounded-full bg-white/40 animate-pulse" />
            <p className="text-sm text-gray-500">
              We typically respond within 24 hours during business days.
            </p>
          </div>
        </motion.div>
      </section>
    </PageLayout>
  );
}
