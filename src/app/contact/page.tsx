"use client";

import { useState } from "react";
import { PageLayout } from "@/components/shared";

const SALES_EMAIL = "sales@erao.digital";
const SUPPORT_EMAIL = "support@erao.digital";

export default function ContactPage() {
  const [copied, setCopied] = useState<string | null>(null);

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
    <PageLayout currentPage="contact">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">Get in Touch</h1>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
            Have questions about Erao? We&apos;re here to help.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 max-w-2xl mx-auto">
          {/* Sales */}
          <button
            onClick={() => handleCopy("sales", SALES_EMAIL)}
            className="group border border-gray-200 rounded-xl sm:rounded-2xl p-5 sm:p-8 hover:border-black hover:shadow-lg transition-all text-center"
          >
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-5 transition-colors ${
              copied === "sales" ? "bg-white border border-gray-200 text-black" : "bg-gray-100 group-hover:bg-black group-hover:text-white"
            }`}>
              {copied === "sales" ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            <h3 className="text-lg font-semibold mb-2">Sales</h3>
            <p className="text-sm text-gray-600 mb-3">
              Interested in upgrading your plan or custom solutions?
            </p>
            <p className="text-sm font-medium text-gray-900 mb-3">{SALES_EMAIL}</p>
            <span className="inline-flex items-center gap-2 text-sm font-medium text-black">
              {copied === "sales" ? "Email Copied!" : "Click to Copy"}
            </span>
          </button>

          {/* Support */}
          <button
            onClick={() => handleCopy("support", SUPPORT_EMAIL)}
            className="group border border-gray-200 rounded-xl sm:rounded-2xl p-5 sm:p-8 hover:border-black hover:shadow-lg transition-all text-center"
          >
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-5 transition-colors ${
              copied === "support" ? "bg-white border border-gray-200 text-black" : "bg-gray-100 group-hover:bg-black group-hover:text-white"
            }`}>
              {copied === "support" ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </div>
            <h3 className="text-lg font-semibold mb-2">Support</h3>
            <p className="text-sm text-gray-600 mb-3">
              Need help with your account, connections, or technical issues?
            </p>
            <p className="text-sm font-medium text-gray-900 mb-3">{SUPPORT_EMAIL}</p>
            <span className="inline-flex items-center gap-2 text-sm font-medium text-black">
              {copied === "support" ? "Email Copied!" : "Click to Copy"}
            </span>
          </button>
        </div>

        {/* Response Time */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            We typically respond within 24 hours during business days.
          </p>
        </div>
      </div>
    </PageLayout>
  );
}
