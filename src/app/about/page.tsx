"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { PageLayout, SUPPORT_EMAIL } from "@/components/shared";

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
/*  ACCENT COLORS                                                      */
/* ------------------------------------------------------------------ */

const neutralAccent = {
  bg: "bg-white/[0.06]",
  border: "border-white/[0.08]",
  text: "text-gray-400",
};

/* ------------------------------------------------------------------ */
/*  DATA                                                               */
/* ------------------------------------------------------------------ */

const values = [
  {
    title: "Simplicity First",
    description:
      "We believe powerful tools don't have to be complicated. Every feature we build must make your life easier, not harder.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    ),
    accentColor: "blue",
  },
  {
    title: "Privacy by Design",
    description:
      "Your data is yours. We never store your actual data — only the queries you run. Security isn't an afterthought; it's built into everything we do.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    accentColor: "emerald",
  },
  {
    title: "Speed Matters",
    description:
      "Waiting for answers slows down decisions. We're obsessed with making Erao fast — from connection to query to result.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    accentColor: "purple",
  },
  {
    title: "Transparency",
    description:
      "No hidden fees, no surprise charges, no data selling. What you see is what you get.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    accentColor: "amber",
  },
];

const stats = [
  { label: "Databases Supported", value: "15+" },
  { label: "File Formats", value: "6" },
  { label: "Data Encryption", value: "AES-256" },
  { label: "Uptime", value: "99.9%" },
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

export default function AboutPage() {
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
    <PageLayout currentPage="about" variant="dark">
      {/* ===== HERO ===== */}
      <section className="relative z-10 w-full pt-20 pb-24 md:pt-32 md:pb-36 overflow-hidden">
        {/* Radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-white/[0.03] rounded-full blur-[140px] pointer-events-none" />

        <motion.div
          className="max-w-4xl mx-auto px-6 relative"
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
              <span className="absolute inline-flex h-full w-full rounded-full bg-white/30 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white/60" />
            </span>
            <span className="text-sm text-gray-300 font-medium">About Erao</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="font-semibold tracking-tighter leading-[1.08] mb-6 text-balance max-w-3xl"
            style={{ fontSize: "clamp(2.25rem, 5vw + 1rem, 3.75rem)" }}
          >
            We&apos;re making data
            <br />
            <span className="text-gray-100">
              accessible to everyone
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-lg md:text-xl text-gray-400 max-w-2xl leading-relaxed"
          >
            Erao was born from a simple frustration: why do you need to know SQL to ask your own database a question? And why can&apos;t you just upload a spreadsheet and start asking? We&apos;re building a world where anyone — not just engineers — can get instant insights from their data.
          </motion.p>
        </motion.div>
      </section>

      <SectionDivider />

      {/* ===== STATS ===== */}
      <section className="relative z-10 w-full py-24 md:py-28">
        <motion.div
          className="max-w-5xl mx-auto px-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={staggerSlow}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                variants={fadeUp}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="group text-center rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8 hover:border-white/10 hover:bg-white/[0.04] transition-all duration-300"
              >
                <p className="text-3xl sm:text-4xl font-semibold tracking-tighter mb-2 text-gray-100">
                  {stat.value}
                </p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <SectionDivider />

      {/* ===== MISSION ===== */}
      <section className="relative z-10 w-full py-28 md:py-36 overflow-hidden">
        {/* Subtle glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-white/[0.03] rounded-full blur-[120px] pointer-events-none" />

        <motion.div
          className="max-w-3xl mx-auto px-6 text-center relative"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="text-sm font-medium text-gray-500 tracking-wide uppercase mb-3"
          >
            Our Mission
          </motion.p>
          <motion.h2
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tighter mb-6 text-balance"
          >
            Eliminate the gap between{" "}
            <span className="text-gray-100">
              question and answer
            </span>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="text-lg text-gray-400 leading-relaxed text-balance"
          >
            To eliminate the gap between asking a question and getting an answer from your data. No SQL. No waiting. No middlemen.
          </motion.p>
        </motion.div>
      </section>

      <SectionDivider />

      {/* ===== STORY ===== */}
      <section className="relative z-10 w-full py-28 md:py-36">
        <motion.div
          className="max-w-5xl mx-auto px-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <div className="max-w-3xl border-l-2 border-white/10 pl-8 sm:pl-10">
            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="text-sm font-medium text-gray-500 tracking-wide uppercase mb-3"
            >
              Our Story
            </motion.p>
            <motion.h2
              variants={fadeUp}
              transition={{ duration: 0.6 }}
              className="text-2xl sm:text-3xl font-semibold tracking-tighter mb-8 text-balance"
            >
              From frustration to{" "}
              <span className="text-gray-100">
                solution
              </span>
            </motion.h2>
            <div className="space-y-6">
              <motion.p
                variants={fadeUp}
                transition={{ duration: 0.5 }}
                className="text-gray-400 leading-relaxed"
              >
                Every day, thousands of business decisions are delayed because someone needs to ask a developer to write a SQL query. Product managers wait for usage stats. Sales teams wait for pipeline reports. Support teams wait for customer history.
              </motion.p>
              <motion.p
                variants={fadeUp}
                transition={{ duration: 0.5 }}
                className="text-gray-400 leading-relaxed"
              >
                We started Erao to fix this. By combining modern AI with a deep understanding of databases and file formats, we&apos;ve built a tool that lets anyone — regardless of technical background — connect a database or upload a file and have a conversation with their data.
              </motion.p>
              <motion.p
                variants={fadeUp}
                transition={{ duration: 0.5 }}
                className="text-gray-400 leading-relaxed"
              >
                Today, teams use Erao to get instant answers to questions that used to take hours or days. And we&apos;re just getting started.
              </motion.p>
            </div>
          </div>
        </motion.div>
      </section>

      <SectionDivider />

      {/* ===== VALUES ===== */}
      <section className="relative z-10 w-full py-28 md:py-36">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] bg-white/[0.02] rounded-full blur-[120px] pointer-events-none" />

        <motion.div
          className="max-w-5xl mx-auto px-6 relative"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="text-sm font-medium text-gray-500 tracking-wide uppercase text-center mb-3"
          >
            Our Values
          </motion.p>
          <motion.h2
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tighter text-center mb-4 text-balance"
          >
            What we{" "}
            <span className="text-gray-100">
              believe
            </span>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="text-gray-400 text-center mb-16 max-w-xl mx-auto text-balance leading-relaxed"
          >
            The principles that guide everything we build.
          </motion.p>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6"
            variants={staggerSlow}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
          >
            {values.map((value) => {
              return (
                <motion.div
                  key={value.title}
                  variants={fadeUp}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04]"
                >
                  {/* Icon */}
                  <div className="mb-5">
                    <div
                      className={`w-10 h-10 rounded-xl ${neutralAccent.bg} border ${neutralAccent.border} ${neutralAccent.text} flex items-center justify-center transition-all duration-300`}
                    >
                      {value.icon}
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-100 mb-2.5 tracking-tight">{value.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{value.description}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.div>
      </section>

      <SectionDivider />

      {/* ===== CONTACT ===== */}
      <section className="relative z-10 w-full py-28 md:py-36 overflow-hidden">
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-white/[0.03] rounded-full blur-[140px] pointer-events-none" />

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
            className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tighter mb-4 text-balance"
          >
            Get in touch
          </motion.h2>
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="text-gray-400 mb-10 text-lg text-balance leading-relaxed"
          >
            Questions? Feedback? We&apos;d love to hear from you.
          </motion.p>
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/contact"
              className="w-full sm:w-auto bg-white text-[#09090b] px-8 py-3.5 rounded-full text-sm font-medium transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:bg-gray-100 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]"
            >
              Contact Page
            </Link>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-full text-sm font-medium border border-white/10 text-gray-300 hover:bg-white/[0.06] hover:border-white/15 active:scale-[0.98] transition-all duration-300 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]"
            >
              Email Us
            </a>
          </motion.div>
        </motion.div>
      </section>
    </PageLayout>
  );
}
