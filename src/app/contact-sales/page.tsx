"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { auth } from "@/lib/api";

const SALES_EMAIL = "sales@erao.digital";

const fadeUp = {
  hidden: { opacity: 0, y: 20, filter: "blur(8px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)" },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

export default function ContactSalesPage() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push("/login");
    }
  }, [router]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(SALES_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="h-dvh flex flex-col bg-gray-50/50 dark:bg-[#09090b] transition-colors">
      {/* Header */}
      <header className="flex-shrink-0 bg-white/80 dark:bg-[#09090b]/80 backdrop-blur-xl border-b border-gray-200/60 dark:border-white/[0.06]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200 min-h-[44px]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        </div>
      </header>

      <motion.main
        initial="hidden"
        animate="visible"
        variants={stagger}
        className="flex-1 flex items-center justify-center px-4 sm:px-6"
      >
        <div className="text-center w-full max-w-sm">
          {/* Icon */}
          <motion.div variants={fadeUp} transition={{ duration: 0.5 }} className="mb-8">
            <div className="w-16 h-16 bg-white dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/[0.06] rounded-2xl flex items-center justify-center mx-auto shadow-sm shadow-gray-900/[0.04] dark:shadow-none">
              <svg className="w-7 h-7 text-gray-400 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} transition={{ duration: 0.5 }}>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 dark:text-white mb-3 text-balance">
              Upgrade your plan
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base max-w-[280px] sm:max-w-xs mx-auto mb-10 leading-relaxed">
              To upgrade your subscription, reach out to our sales team and we&apos;ll get you set up.
            </p>
          </motion.div>

          {/* Email Card */}
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="bg-white dark:bg-white/[0.03] border border-gray-200/60 dark:border-white/[0.06] rounded-2xl p-6 sm:p-8 mb-8 shadow-sm shadow-gray-900/[0.04] dark:shadow-none"
          >
            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em] font-medium mb-3">
              Sales Email
            </p>
            <p className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white mb-6">
              {SALES_EMAIL}
            </p>
            <button
              onClick={handleCopy}
              className="w-full h-11 rounded-xl text-sm font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 active:scale-[0.98] transition-all duration-200 min-h-[44px]"
            >
              {copied ? (
                <span className="flex items-center justify-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Copied
                </span>
              ) : "Copy Email"}
            </button>
          </motion.div>

          {/* Extra info */}
          <motion.p variants={fadeUp} transition={{ duration: 0.5 }} className="text-xs text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            We typically respond within 24 hours
          </motion.p>
        </div>
      </motion.main>
    </div>
  );
}
