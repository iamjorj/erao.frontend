"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
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
/*  DATA                                                               */
/* ------------------------------------------------------------------ */

const plans = [
  {
    name: "Free",
    description: "For individuals getting started",
    price: 0,
    features: [
      { name: "1 database connection", included: true },
      { name: "1 file upload", included: true },
      { name: "25 queries/month", included: true },
      { name: "Basic visualizations", included: true },
      { name: "Community support", included: true },
    ],
    cta: "Get Started",
    ctaHref: "/register",
    highlighted: false,
  },
  {
    name: "Pro",
    description: "For power users and small teams",
    price: 49,
    features: [
      { name: "5 database connections", included: true },
      { name: "10 file uploads", included: true },
      { name: "150 queries/month", included: true },
      { name: "Advanced visualizations", included: true },
      { name: "Priority support", included: true },
      { name: "Export to CSV, Excel, PDF", included: true },
    ],
    cta: "Start Free Trial",
    ctaHref: "/register",
    highlighted: true,
  },
  {
    name: "Enterprise",
    description: "For large organizations",
    price: 299,
    features: [
      { name: "Unlimited connections", included: true },
      { name: "Unlimited file uploads", included: true },
      { name: "Unlimited queries", included: true },
      { name: "Custom AI models", included: true },
      { name: "Dedicated support", included: true },
      { name: "SSO & audit logs", included: true },
      { name: "On-premise deployment", included: true },
    ],
    cta: "Contact Sales",
    ctaHref: "/contact",
    highlighted: false,
  },
];

const comparisonRows = [
  { feature: "Database connections", free: "1", pro: "5", enterprise: "Unlimited" },
  { feature: "File uploads", free: "1", pro: "10", enterprise: "Unlimited" },
  { feature: "Queries per month", free: "25", pro: "150", enterprise: "Unlimited" },
  { feature: "Visualizations", free: "Basic", pro: "Advanced", enterprise: "Advanced" },
  { feature: "Export formats", free: "--", pro: "CSV, Excel, PDF", enterprise: "CSV, Excel, PDF" },
  { feature: "Support", free: "Community", pro: "Priority", enterprise: "Dedicated" },
  { feature: "SSO & audit logs", free: "--", pro: "--", enterprise: "Included" },
];

const faqs = [
  {
    question: "Can I try Erao for free?",
    answer:
      "Yes! Our Free plan lets you connect 1 database, upload files, and run 25 queries per month at no cost. No credit card required to get started.",
  },
  {
    question: "Can I delete my account?",
    answer:
      "Account deletion is available for paid plans (Pro and Enterprise). Free plan accounts cannot be deleted to prevent abuse of our free tier. Upgrade to a paid plan to gain access to account deletion.",
  },
  {
    question: "What happens when I hit my query limit?",
    answer:
      "You'll receive a notification when you're approaching your limit. You can upgrade your plan anytime to continue querying without interruption.",
  },
  {
    question: "Can I switch plans later?",
    answer:
      "Absolutely. You can upgrade or downgrade your plan at any time. When upgrading, you'll get immediate access to new features. When downgrading, the change takes effect at your next billing cycle.",
  },
  {
    question: "What databases and file types do you support?",
    answer:
      "We support 15+ databases including PostgreSQL, MySQL, MongoDB, SQL Server, Oracle, Snowflake, ClickHouse, and more. You can also upload CSV, Excel, JSON, XML, Word, and TXT files for instant analysis.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Yes. We never store your actual database data — only the queries you run. All database credentials are encrypted with AES-256, connections use SSL/TLS, and uploaded files are stored with encryption.",
  },
  {
    question: "Do you offer refunds?",
    answer:
      "Yes, we offer refunds within 7 days of purchase, provided you've used fewer than 5 queries. If you've already used 5 or more queries, refunds are not available.",
  },
];

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
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
    <PageLayout currentPage="pricing" variant="dark">
      {/* ===== HERO ===== */}
      <section className="relative z-10 w-full pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden">
        {/* Radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-blue-500/[0.06] rounded-full blur-[120px] pointer-events-none" />

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
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-sm text-gray-300 font-medium">Simple Pricing</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="font-semibold tracking-tighter leading-[1.05] mb-6 text-balance"
            style={{ fontSize: "clamp(2.25rem, 5vw + 1rem, 3.75rem)" }}
          >
            Simple, transparent
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-blue-400 bg-clip-text text-transparent">
              pricing
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-lg md:text-xl text-gray-400 mb-4 max-w-2xl mx-auto leading-relaxed text-balance"
          >
            Start free. Upgrade when you need more. No surprises.
          </motion.p>
        </motion.div>
      </section>

      {/* ===== PRICING CARDS ===== */}
      <section className="relative z-10 w-full pb-24 md:pb-32">
        <motion.div
          className="max-w-5xl mx-auto px-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={staggerSlow}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-start">
            {plans.map((plan) => (
              <motion.div
                key={plan.name}
                variants={fadeUp}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className={`relative rounded-2xl p-6 sm:p-8 transition-all duration-300 ${
                  plan.highlighted
                    ? "border border-blue-500/30 bg-white/[0.04] shadow-[0_0_60px_-15px_rgba(59,130,246,0.2)]"
                    : "border border-white/[0.06] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]"
                }`}
              >
                {/* Most Popular badge */}
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-4 py-1 rounded-full text-xs font-medium">
                    Most Popular
                  </div>
                )}

                {/* Plan name */}
                <h3 className="text-xl font-semibold text-gray-100 mb-1 tracking-tight">{plan.name}</h3>
                <p className="text-sm text-gray-500 mb-6">{plan.description}</p>

                {/* Price */}
                <div className="mb-8">
                  <span className="text-4xl font-semibold tracking-tighter text-gray-100">
                    ${plan.price}
                  </span>
                  <span className="text-gray-500 ml-1">/month</span>
                </div>

                {/* CTA Button */}
                <Link
                  href={plan.ctaHref}
                  className={`block w-full py-3 text-center rounded-full text-sm font-medium transition-all duration-300 mb-8 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b] ${
                    plan.highlighted
                      ? "bg-white text-[#09090b] hover:shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:bg-gray-100 focus-visible:ring-white/50"
                      : "border border-white/10 text-gray-300 hover:bg-white/[0.06] hover:border-white/15 focus-visible:ring-white/30"
                  }`}
                >
                  {plan.cta}
                </Link>

                {/* Features */}
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature.name} className="flex items-start gap-3 text-sm">
                      {feature.included ? (
                        <span className="text-emerald-400 flex-shrink-0 mt-0.5">
                          <CheckIcon />
                        </span>
                      ) : (
                        <span className="text-gray-600 flex-shrink-0 mt-0.5">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </span>
                      )}
                      <span className={feature.included ? "text-gray-300" : "text-gray-600"}>
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <SectionDivider variant="neutral" />

      {/* ===== FEATURE COMPARISON TABLE ===== */}
      <section className="relative z-10 w-full py-24 md:py-32">
        <motion.div
          className="max-w-5xl mx-auto px-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="text-sm font-medium text-blue-400/80 tracking-wide uppercase text-center mb-3"
          >
            Comparison
          </motion.p>
          <motion.h2
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="text-2xl sm:text-3xl font-semibold tracking-tighter text-center mb-12 text-balance"
          >
            Compare all features
          </motion.h2>

          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="overflow-x-auto -mx-4 sm:mx-0"
          >
            <div className="min-w-[540px] px-4 sm:px-0">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="text-left py-4 pr-4 text-sm font-medium text-gray-400">Feature</th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-gray-400">Free</th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-blue-400">Pro</th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-gray-400">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.feature} className="border-b border-white/[0.04]">
                      <td className="py-4 pr-4 text-sm text-gray-300">{row.feature}</td>
                      <td className="text-center py-4 px-4 text-sm text-gray-500">{row.free}</td>
                      <td className="text-center py-4 px-4 text-sm text-gray-300">{row.pro}</td>
                      <td className="text-center py-4 px-4 text-sm text-gray-500">{row.enterprise}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </motion.div>
      </section>

      <SectionDivider variant="purple" />

      {/* ===== FAQ ===== */}
      <section className="relative z-10 w-full py-24 md:py-32">
        <motion.div
          className="max-w-3xl mx-auto px-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="text-sm font-medium text-violet-400/80 tracking-wide uppercase text-center mb-3"
          >
            FAQ
          </motion.p>
          <motion.h2
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="text-2xl sm:text-3xl font-semibold tracking-tighter text-center mb-12 text-balance"
          >
            Frequently asked questions
          </motion.h2>

          <motion.div
            className="space-y-3"
            variants={staggerSlow}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
          >
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                variants={fadeUp}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden transition-colors duration-300 hover:border-white/10"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:ring-inset rounded-2xl"
                  aria-expanded={openFaq === index}
                >
                  <span className="font-medium text-sm text-gray-200">{faq.question}</span>
                  <svg
                    className={`w-5 h-5 text-gray-500 transition-transform duration-300 flex-shrink-0 ml-4 ${
                      openFaq === index ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <AnimatePresence initial={false}>
                  {openFaq === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5">
                        <p className="text-sm text-gray-400 leading-relaxed">{faq.answer}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      <SectionDivider variant="blue" />

      {/* ===== CTA ===== */}
      <section className="relative z-10 w-full py-24 md:py-32 overflow-hidden">
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-blue-500/[0.05] rounded-full blur-[120px] pointer-events-none" />

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
            Still have questions?
          </motion.h2>
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="text-gray-400 mb-10 text-lg text-balance"
          >
            Our team is here to help you find the right plan.
          </motion.p>
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/contact"
              className="w-full sm:w-auto bg-white text-[#09090b] px-8 py-3.5 rounded-full text-sm font-medium transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]"
            >
              Contact Sales
            </Link>
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-3.5 rounded-full text-sm font-medium border border-white/10 text-gray-300 hover:bg-white/[0.06] hover:border-white/15 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]"
            >
              Start Free
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </PageLayout>
  );
}
