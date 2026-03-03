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
  { id: "information", label: "Information We Collect" },
  { id: "usage", label: "How We Use Information" },
  { id: "security", label: "Data Security" },
  { id: "sharing", label: "Data Sharing" },
  { id: "rights", label: "Your Rights" },
  { id: "retention", label: "Data Retention" },
  { id: "changes", label: "Changes to Policy" },
];

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */

export default function PrivacyPage() {
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
    <PageLayout currentPage="privacy" variant="dark">
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
            Privacy{" "}
            <span className="text-gray-100">
              Policy
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
            At Erao, we take your privacy seriously. This Privacy Policy explains how we collect, use,
            disclose, and safeguard your information when you use our service.
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
            id="information"
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="scroll-mt-24 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 sm:p-7 md:p-8 hover:border-white/[0.08] transition-colors duration-300"
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-white/[0.06] border border-white/[0.08] text-gray-400 rounded-lg flex items-center justify-center text-xs sm:text-sm font-semibold">1</span>
              <div>
                <h2 className="text-xl font-semibold text-gray-100 mb-3 tracking-tight">Information We Collect</h2>
                <p className="text-gray-400 leading-relaxed mb-4">
                  We collect information that you provide directly to us and information generated through
                  your use of our Service:
                </p>
                <div className="space-y-3">
                  {[
                    { title: "Account Information", desc: "Email address, name, and password when you create an account." },
                    { title: "Database Credentials", desc: "Connection strings and credentials encrypted using AES-256 encryption." },
                    { title: "Uploaded Files", desc: "Files you upload (CSV, Excel, JSON, XML, Word, TXT) are stored with encryption at rest. You can delete your files at any time." },
                    { title: "Query History", desc: "The questions you ask and queries we generate. We do NOT store your actual database data or query results." },
                    { title: "Usage Data", desc: "Information about how you use our service, including features used and time spent." },
                  ].map((item) => (
                    <div key={item.title} className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.06]">
                      <h4 className="font-medium text-gray-200 mb-1">{item.title}</h4>
                      <p className="text-sm text-gray-400">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.section>

          {/* Section 2 */}
          <motion.section
            id="usage"
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="scroll-mt-24 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 sm:p-7 md:p-8 hover:border-white/[0.08] transition-colors duration-300"
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-white/[0.06] border border-white/[0.08] text-gray-400 rounded-lg flex items-center justify-center text-xs sm:text-sm font-semibold">2</span>
              <div>
                <h2 className="text-xl font-semibold text-gray-100 mb-3 tracking-tight">How We Use Your Information</h2>
                <p className="text-gray-400 leading-relaxed mb-4">We use the information we collect to:</p>
                <ul className="space-y-3">
                  {[
                    "Provide, maintain, and improve our services",
                    "Process transactions and send related information",
                    "Send technical notices, updates, and support messages",
                    "Respond to your comments and questions",
                    "Analyze usage patterns to improve user experience",
                    "Detect, investigate, and prevent fraudulent or illegal activities",
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

          {/* Section 3 */}
          <motion.section
            id="security"
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="scroll-mt-24 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 sm:p-7 md:p-8 hover:border-white/[0.08] transition-colors duration-300"
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-white/[0.06] border border-white/[0.08] text-gray-400 rounded-lg flex items-center justify-center text-xs sm:text-sm font-semibold">3</span>
              <div>
                <h2 className="text-xl font-semibold text-gray-100 mb-3 tracking-tight">Data Security</h2>
                <p className="text-gray-400 leading-relaxed mb-4">
                  We implement industry-standard security measures to protect your data:
                </p>
                <div className="grid md:grid-cols-2 gap-3">
                  {[
                    { title: "AES-256 Encryption", desc: "All database credentials and uploaded files encrypted" },
                    { title: "SSL/TLS", desc: "All connections and file transfers use encryption" },
                    { title: "Minimal Data Storage", desc: "We never store database data. Uploaded files are encrypted and deletable." },
                  ].map((item) => (
                    <div key={item.title} className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.06]">
                      <h4 className="font-medium text-gray-200 mb-1">{item.title}</h4>
                      <p className="text-sm text-gray-400">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.section>

          {/* Section 4 */}
          <motion.section
            id="sharing"
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="scroll-mt-24 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 sm:p-7 md:p-8 hover:border-white/[0.08] transition-colors duration-300"
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-white/[0.06] border border-white/[0.08] text-gray-400 rounded-lg flex items-center justify-center text-xs sm:text-sm font-semibold">4</span>
              <div>
                <h2 className="text-xl font-semibold text-gray-100 mb-3 tracking-tight">Data Sharing</h2>
                <p className="text-gray-400 leading-relaxed mb-4">
                  We do not sell, trade, or otherwise transfer your personal information to third parties except:
                </p>
                <ul className="space-y-3">
                  {[
                    "Service providers who assist in operating our service (e.g., hosting, payment processing)",
                    "When required by law or to protect our rights",
                    "In connection with a business transfer (merger, acquisition)",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 bg-gray-500 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-gray-400">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.section>

          {/* Section 5 */}
          <motion.section
            id="rights"
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="scroll-mt-24 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 sm:p-7 md:p-8 hover:border-white/[0.08] transition-colors duration-300"
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-white/[0.06] border border-white/[0.08] text-gray-400 rounded-lg flex items-center justify-center text-xs sm:text-sm font-semibold">5</span>
              <div>
                <h2 className="text-xl font-semibold text-gray-100 mb-3 tracking-tight">Your Rights</h2>
                <p className="text-gray-400 leading-relaxed mb-4">You have the right to:</p>
                <div className="grid md:grid-cols-2 gap-3">
                  {[
                    "Access your personal information",
                    "Update or correct your data",
                    "Export your data in a portable format",
                    "Opt out of marketing communications",
                    "Request information about data processing",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2 bg-white/[0.02] rounded-lg p-3 border border-white/[0.06]">
                      <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-gray-400">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.section>

          {/* Section 6 */}
          <motion.section
            id="retention"
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="scroll-mt-24 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 sm:p-7 md:p-8 hover:border-white/[0.08] transition-colors duration-300"
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-white/[0.06] border border-white/[0.08] text-gray-400 rounded-lg flex items-center justify-center text-xs sm:text-sm font-semibold">6</span>
              <div>
                <h2 className="text-xl font-semibold text-gray-100 mb-3 tracking-tight">Data Retention</h2>
                <p className="text-gray-400 leading-relaxed">
                  We retain your account information as long as your account is active. Query history is
                  retained based on your plan (7 days for Free, unlimited for paid plans). Uploaded files are
                  retained until you delete them or your account is terminated. Account deletion
                  is available for paid plans (Pro and Enterprise). Free plan accounts cannot be deleted to prevent abuse.
                </p>
              </div>
            </div>
          </motion.section>

          {/* Section 7 */}
          <motion.section
            id="changes"
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="scroll-mt-24 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 sm:p-7 md:p-8 hover:border-white/[0.08] transition-colors duration-300"
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-white/[0.06] border border-white/[0.08] text-gray-400 rounded-lg flex items-center justify-center text-xs sm:text-sm font-semibold">7</span>
              <div>
                <h2 className="text-xl font-semibold text-gray-100 mb-3 tracking-tight">Changes to This Policy</h2>
                <p className="text-gray-400 leading-relaxed">
                  We may update this Privacy Policy from time to time. We will notify you of any changes by
                  posting the new policy on this page and updating the &quot;Last updated&quot; date. We encourage
                  you to review this page periodically for any changes.
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
            Questions about Privacy?
          </motion.h2>
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-gray-400 mb-10 text-lg leading-relaxed"
          >
            If you have any questions about this Privacy Policy, please contact us.
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
