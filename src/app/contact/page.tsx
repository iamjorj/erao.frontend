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
      <div className="relative w-full max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        {/* Subtle radial glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[350px] bg-blue-500/[0.05] rounded-full blur-[120px] pointer-events-none" />

        {/* Hero */}
        <motion.div
          className="relative text-center mb-12 sm:mb-16"
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              Contact Us
            </span>
          </motion.div>

          <motion.h1
            className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tighter text-gray-100 mb-4"
            variants={fadeUp}
            transition={{ duration: 0.6, delay: 0.1 }}
            style={{ textWrap: "balance" }}
          >
            Get in Touch
          </motion.h1>

          <motion.p
            className="text-base sm:text-lg text-gray-400 max-w-xl mx-auto"
            variants={fadeUp}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Have questions about Erao? We&apos;re here to help.
          </motion.p>
        </motion.div>

        {/* Contact Cards */}
        <motion.div
          className="relative grid sm:grid-cols-2 gap-4 sm:gap-5 max-w-2xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={stagger}
        >
          {/* Sales */}
          <motion.button
            onClick={() => handleCopy("sales", SALES_EMAIL)}
            className="group bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 sm:p-8 hover:border-white/10 hover:bg-white/[0.04] transition-all duration-300 text-center cursor-pointer"
            variants={fadeUp}
            transition={{ duration: 0.5 }}
          >
            <div
              className={`w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-5 transition-all duration-300 ${
                copied === "sales"
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                  : "bg-blue-500/10 border border-blue-500/20 text-blue-400 group-hover:shadow-[0_0_30px_-8px_rgba(59,130,246,0.25)]"
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

            <h3 className="text-lg font-semibold text-gray-100 mb-2">Sales</h3>
            <p className="text-sm text-gray-400 mb-4">
              Interested in upgrading your plan or custom solutions?
            </p>
            <p className="text-sm font-medium text-gray-300 mb-4 font-mono">{SALES_EMAIL}</p>

            <span
              className={`inline-flex items-center gap-2 text-sm font-medium transition-colors duration-200 ${
                copied === "sales" ? "text-emerald-400" : "text-gray-500 group-hover:text-gray-300"
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
            className="group bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 sm:p-8 hover:border-white/10 hover:bg-white/[0.04] transition-all duration-300 text-center cursor-pointer"
            variants={fadeUp}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div
              className={`w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-5 transition-all duration-300 ${
                copied === "support"
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                  : "bg-violet-500/10 border border-violet-500/20 text-violet-400 group-hover:shadow-[0_0_30px_-8px_rgba(139,92,246,0.25)]"
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

            <h3 className="text-lg font-semibold text-gray-100 mb-2">Support</h3>
            <p className="text-sm text-gray-400 mb-4">
              Need help with your account, connections, or technical issues?
            </p>
            <p className="text-sm font-medium text-gray-300 mb-4 font-mono">{SUPPORT_EMAIL}</p>

            <span
              className={`inline-flex items-center gap-2 text-sm font-medium transition-colors duration-200 ${
                copied === "support" ? "text-emerald-400" : "text-gray-500 group-hover:text-gray-300"
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
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-sm text-gray-500">
              We typically respond within 24 hours during business days.
            </p>
          </div>
        </motion.div>
      </div>
    </PageLayout>
  );
}
