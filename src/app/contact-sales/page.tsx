"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/api";

const SALES_EMAIL = "sales@erao.digital";

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
    <div className="h-dvh flex flex-col bg-white dark:bg-[#0a0a0a] transition-colors">
      {/* Header */}
      <header className="flex-shrink-0 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-sm border-b border-gray-100 dark:border-[#1a1a1a]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6">
        <div className="text-center w-full max-w-2xl">
          {/* Icon */}
          <div className="w-16 h-16 bg-gray-100 dark:bg-[#161616] rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-7 h-7 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white mb-3">
            Upgrade your plan
          </h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-10">
            To upgrade your subscription, reach out to our sales team and we&apos;ll get you set up.
          </p>

          {/* Email Card */}
          <div className="bg-gray-50 dark:bg-[#111111] rounded-xl p-6 sm:p-8 max-w-sm mx-auto mb-8">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Sales Email</p>
            <p className="text-lg font-medium text-gray-900 dark:text-white mb-5">{SALES_EMAIL}</p>
            <button
              onClick={handleCopy}
              className="w-full h-10 rounded-lg text-sm font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
            >
              {copied ? "Copied!" : "Copy Email"}
            </button>
          </div>

          {/* Extra info */}
          <p className="text-xs text-gray-400 dark:text-gray-500">
            We typically respond within 24 hours.
          </p>
        </div>
      </main>
    </div>
  );
}
