"use client";

import { useEffect } from "react";
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
/*  DATA                                                               */
/* ------------------------------------------------------------------ */

const tocItems = [
  { id: "acceptance", label: "Acceptance of Terms" },
  { id: "description", label: "Description of Service" },
  { id: "accounts", label: "User Accounts" },
  { id: "acceptable-use", label: "Acceptable Use" },
  { id: "connections", label: "Database & File Uploads" },
  { id: "payment", label: "Payment and Billing" },
  { id: "ip", label: "Intellectual Property" },
  { id: "liability", label: "Limitation of Liability" },
  { id: "termination", label: "Termination" },
  { id: "changes", label: "Changes to Terms" },
];

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */

export default function TermsPage() {
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
    <PageLayout currentPage="terms" variant="dark">
      {/* ===== HERO ===== */}
      <section className="relative z-10 w-full pt-20 pb-16 md:pt-32 md:pb-20 overflow-hidden">
        {/* Radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-white/[0.03] rounded-full blur-[140px] pointer-events-none" />

        <motion.div
          className="max-w-4xl mx-auto px-4 sm:px-6 relative"
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
            <span className="text-sm text-gray-300 font-medium">Legal</span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="font-semibold tracking-tighter leading-[1.08] mb-4 text-balance max-w-3xl"
            style={{ fontSize: "clamp(2rem, 5vw + 0.5rem, 3rem)" }}
          >
            Terms of{" "}
            <span className="text-gray-100">
              Service
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="text-sm sm:text-base text-gray-500 mb-8"
          >
            Last updated: January 28, 2025
          </motion.p>

          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="text-lg text-gray-400 leading-relaxed max-w-2xl"
          >
            Welcome to Erao. These Terms of Service govern your use of our platform and services.
            By accessing or using Erao, you agree to be bound by these terms.
          </motion.p>
        </motion.div>
      </section>

      <SectionDivider />

      {/* ===== TABLE OF CONTENTS ===== */}
      <motion.section
        className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        variants={stagger}
      >
        <motion.div
          variants={fadeUp}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6"
        >
          <p className="text-sm font-medium text-gray-400 mb-4">On this page</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {tocItems.map((item, i) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="flex items-center gap-2.5 text-sm text-gray-500 hover:text-white transition-colors duration-200 py-1.5 group"
              >
                <span className="w-5 h-5 rounded-md bg-white/[0.04] border border-white/[0.06] text-[10px] font-medium text-gray-500 group-hover:text-gray-300 group-hover:border-white/10 flex items-center justify-center transition-all duration-200">
                  {i + 1}
                </span>
                {item.label}
              </a>
            ))}
          </div>
        </motion.div>
      </motion.section>

      {/* ===== CONTENT ===== */}
      <motion.article
        className="w-full max-w-4xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        variants={staggerSlow}
      >
        <div className="space-y-8">
          {/* Section 1 */}
          <motion.section
            id="acceptance"
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="scroll-mt-24 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 sm:p-7 md:p-8 hover:border-white/[0.08] transition-colors duration-300"
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-white/[0.06] border border-white/[0.08] text-gray-400 rounded-lg flex items-center justify-center text-xs sm:text-sm font-semibold">1</span>
              <div>
                <h2 className="text-xl font-semibold text-gray-100 mb-3 tracking-tight">Acceptance of Terms</h2>
                <p className="text-gray-400 leading-relaxed">
                  By creating an account or using our Service, you acknowledge that you have read, understood,
                  and agree to be bound by these Terms. If you do not agree to these Terms, you may not access
                  or use the Service. These Terms apply to all visitors, users, and others who access the Service.
                </p>
              </div>
            </div>
          </motion.section>

          {/* Section 2 */}
          <motion.section
            id="description"
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="scroll-mt-24 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 sm:p-7 md:p-8 hover:border-white/[0.08] transition-colors duration-300"
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-white/[0.06] border border-white/[0.08] text-gray-400 rounded-lg flex items-center justify-center text-xs sm:text-sm font-semibold">2</span>
              <div>
                <h2 className="text-xl font-semibold text-gray-100 mb-3 tracking-tight">Description of Service</h2>
                <p className="text-gray-400 leading-relaxed mb-4">
                  Erao is a software-as-a-service platform that enables users to query databases and uploaded files using natural language.
                  Our Service translates your questions into queries, executes them securely against your connected database or uploaded file, and presents
                  the results in an accessible format including tables, charts, and summaries.
                </p>
                <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.06]">
                  <p className="text-sm text-gray-500">
                    The Service is provided on an &quot;as available&quot; basis. We reserve the right to modify, suspend,
                    or discontinue any aspect of the Service at any time.
                  </p>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Section 3 */}
          <motion.section
            id="accounts"
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="scroll-mt-24 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 sm:p-7 md:p-8 hover:border-white/[0.08] transition-colors duration-300"
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-white/[0.06] border border-white/[0.08] text-gray-400 rounded-lg flex items-center justify-center text-xs sm:text-sm font-semibold">3</span>
              <div>
                <h2 className="text-xl font-semibold text-gray-100 mb-3 tracking-tight">User Accounts</h2>
                <p className="text-gray-400 leading-relaxed mb-4">
                  To access certain features, you must create an account. When you create an account, you agree to:
                </p>
                <ul className="space-y-3">
                  {[
                    "Provide accurate, current, and complete information",
                    "Maintain the confidentiality of your account credentials",
                    "Accept responsibility for all activities under your account",
                    "Notify us immediately of any unauthorized access",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-400">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.section>

          {/* Section 4 */}
          <motion.section
            id="acceptable-use"
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="scroll-mt-24 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 sm:p-7 md:p-8 hover:border-white/[0.08] transition-colors duration-300"
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-white/[0.06] border border-white/[0.08] text-gray-400 rounded-lg flex items-center justify-center text-xs sm:text-sm font-semibold">4</span>
              <div>
                <h2 className="text-xl font-semibold text-gray-100 mb-3 tracking-tight">Acceptable Use</h2>
                <p className="text-gray-400 leading-relaxed mb-4">You agree not to use the Service to:</p>
                <div className="grid md:grid-cols-2 gap-3">
                  {[
                    "Violate any applicable laws or regulations",
                    "Access databases without proper authorization",
                    "Attempt to gain unauthorized access to our systems",
                    "Interfere with or disrupt the Service",
                    "Use the Service for malicious purposes",
                    "Reverse engineer or extract source code",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-2 bg-white/[0.02] rounded-lg p-3 border border-white/[0.06]">
                      <svg className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="text-sm text-gray-400">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.section>

          {/* Section 5 */}
          <motion.section
            id="connections"
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="scroll-mt-24 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 sm:p-7 md:p-8 hover:border-white/[0.08] transition-colors duration-300"
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-white/[0.06] border border-white/[0.08] text-gray-400 rounded-lg flex items-center justify-center text-xs sm:text-sm font-semibold">5</span>
              <div>
                <h2 className="text-xl font-semibold text-gray-100 mb-3 tracking-tight">Database Connections & File Uploads</h2>
                <p className="text-gray-400 leading-relaxed">
                  You are solely responsible for ensuring you have proper authorization to connect to and query
                  any databases you use with our Service. You are also responsible for ensuring you have the right
                  to upload and analyze any files through our Service. Erao is not responsible for any unauthorized access
                  to third-party databases or misuse of uploaded data. You must ensure that your use of the Service complies with any
                  applicable data protection laws and regulations.
                </p>
              </div>
            </div>
          </motion.section>

          {/* Section 6 */}
          <motion.section
            id="payment"
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="scroll-mt-24 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 sm:p-7 md:p-8 hover:border-white/[0.08] transition-colors duration-300"
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-white/[0.06] border border-white/[0.08] text-gray-400 rounded-lg flex items-center justify-center text-xs sm:text-sm font-semibold">6</span>
              <div>
                <h2 className="text-xl font-semibold text-gray-100 mb-3 tracking-tight">Payment and Billing</h2>
                <p className="text-gray-400 leading-relaxed mb-4">For paid subscription plans:</p>
                <div className="space-y-2">
                  {[
                    "Fees are billed in advance on a monthly or annual basis",
                    "All fees are non-refundable except as required by law",
                    "We may change pricing with 30 days advance notice",
                    "You are responsible for all applicable taxes",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3 text-gray-400">
                      <div className="w-1.5 h-1.5 bg-gray-500 rounded-full flex-shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.section>

          {/* Section 7 */}
          <motion.section
            id="ip"
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="scroll-mt-24 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 sm:p-7 md:p-8 hover:border-white/[0.08] transition-colors duration-300"
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-white/[0.06] border border-white/[0.08] text-gray-400 rounded-lg flex items-center justify-center text-xs sm:text-sm font-semibold">7</span>
              <div>
                <h2 className="text-xl font-semibold text-gray-100 mb-3 tracking-tight">Intellectual Property</h2>
                <p className="text-gray-400 leading-relaxed">
                  The Service and its original content, features, and functionality are owned by Erao and are
                  protected by international copyright, trademark, patent, trade secret, and other intellectual
                  property laws. You may not copy, modify, distribute, sell, or lease any part of our Service
                  without our express written permission.
                </p>
              </div>
            </div>
          </motion.section>

          {/* Section 8 */}
          <motion.section
            id="liability"
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="scroll-mt-24 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 sm:p-7 md:p-8 hover:border-white/[0.08] transition-colors duration-300"
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-white/[0.06] border border-white/[0.08] text-gray-400 rounded-lg flex items-center justify-center text-xs sm:text-sm font-semibold">8</span>
              <div>
                <h2 className="text-xl font-semibold text-gray-100 mb-3 tracking-tight">Limitation of Liability</h2>
                <p className="text-gray-400 leading-relaxed">
                  To the maximum extent permitted by applicable law, Erao shall not be liable for any indirect,
                  incidental, special, consequential, or punitive damages, including but not limited to loss of
                  profits, data, use, goodwill, or other intangible losses, resulting from your access to or
                  use of (or inability to access or use) the Service.
                </p>
              </div>
            </div>
          </motion.section>

          {/* Section 9 */}
          <motion.section
            id="termination"
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="scroll-mt-24 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 sm:p-7 md:p-8 hover:border-white/[0.08] transition-colors duration-300"
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-white/[0.06] border border-white/[0.08] text-gray-400 rounded-lg flex items-center justify-center text-xs sm:text-sm font-semibold">9</span>
              <div>
                <h2 className="text-xl font-semibold text-gray-100 mb-3 tracking-tight">Termination</h2>
                <p className="text-gray-400 leading-relaxed">
                  We may terminate or suspend your account and access to the Service immediately, without prior
                  notice or liability, for any reason, including if you breach these Terms. Upon termination,
                  your right to use the Service will cease immediately. You may terminate your account at any
                  time by contacting us or using the account deletion feature in your settings.
                </p>
              </div>
            </div>
          </motion.section>

          {/* Section 10 */}
          <motion.section
            id="changes"
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="scroll-mt-24 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 sm:p-7 md:p-8 hover:border-white/[0.08] transition-colors duration-300"
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-white/[0.06] border border-white/[0.08] text-gray-400 rounded-lg flex items-center justify-center text-xs sm:text-sm font-semibold">10</span>
              <div>
                <h2 className="text-xl font-semibold text-gray-100 mb-3 tracking-tight">Changes to Terms</h2>
                <p className="text-gray-400 leading-relaxed">
                  We reserve the right to modify or replace these Terms at any time at our sole discretion.
                  If a revision is material, we will provide at least 30 days notice prior to any new terms
                  taking effect. Your continued use of the Service after changes constitutes acceptance of the
                  new Terms.
                </p>
              </div>
            </div>
          </motion.section>
        </div>
      </motion.article>

      <SectionDivider />

      {/* Contact Section */}
      <section className="relative w-full overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-white/[0.03] rounded-full blur-[120px] pointer-events-none" />

        <motion.div
          className="max-w-3xl mx-auto px-4 sm:px-6 py-24 sm:py-32 text-center relative"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={stagger}
        >
          <motion.h2
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="text-2xl sm:text-3xl font-semibold tracking-tighter text-gray-100 mb-4 text-balance"
          >
            Questions about these Terms?
          </motion.h2>
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-gray-400 mb-10 text-lg leading-relaxed"
          >
            If you have any questions about these Terms of Service, please contact us.
          </motion.p>
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-sm font-medium bg-white text-[#09090b] hover:bg-gray-100 hover:shadow-[0_0_40px_rgba(255,255,255,0.15)] active:scale-[0.98] transition-all duration-300 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]"
            >
              Contact Us
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
