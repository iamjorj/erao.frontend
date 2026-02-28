"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { LogoIcon } from "@/components/shared";

/* ------------------------------------------------------------------ */
/*  ANIMATION VARIANTS                                                 */
/* ------------------------------------------------------------------ */

const fadeUp = {
  hidden: { opacity: 0, y: 20, filter: "blur(8px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)" },
};

const stagger = {
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

/* ------------------------------------------------------------------ */
/*  RESET PASSWORD CONTENT                                             */
/* ------------------------------------------------------------------ */

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const otp = searchParams.get("otp") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

  useEffect(() => {
    if (!email || !otp) {
      router.push("/forgot-password");
    }
  }, [email, otp, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const response = await api.resetPassword(email, otp, password);
      if (response.success) {
        setSuccess("Password reset successfully! Redirecting to login...");
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
    } catch (err) {
      setError("Failed to reset password. The OTP may have expired.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "h-10 w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-3.5 text-sm text-gray-100 outline-none placeholder:text-gray-600 hover:border-white/[0.1] focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-all duration-200";

  return (
    <div className="h-dvh bg-[#09090b] text-gray-100 flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Subtle radial glow behind form */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[500px] bg-blue-500/[0.04] rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        className="relative w-full max-w-[400px] flex flex-col items-center gap-6 sm:gap-8"
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        {/* Logo */}
        <motion.div variants={fadeUp} transition={{ duration: 0.5 }}>
          <Link href="/" className="flex items-center gap-2.5">
            <LogoIcon className="w-10 h-10" forceDark />
            <span className="font-semibold text-xl tracking-tight text-gray-100">Erao</span>
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          className="w-full flex flex-col gap-1.5"
          variants={fadeUp}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-lg font-semibold tracking-tight text-gray-100">Reset your password</h1>
          <p className="text-sm text-gray-500">
            Enter your new password below.
          </p>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full bg-red-500/[0.08] border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl"
          >
            {error}
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full bg-emerald-500/[0.08] border border-emerald-500/20 text-emerald-400 text-sm px-4 py-3 rounded-xl"
          >
            {success}
          </motion.div>
        )}

        <motion.form
          onSubmit={handleSubmit}
          className="w-full flex flex-col gap-4"
          variants={fadeUp}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="newPassword" className="text-sm font-medium text-gray-300">
              New password
            </label>
            <input
              id="newPassword"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
              className={inputClass}
              required
              minLength={8}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-300">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className={inputClass}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !password || !confirmPassword}
            className="w-full h-11 bg-gray-100 text-gray-900 rounded-xl text-sm font-medium hover:bg-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-1"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Resetting...
              </span>
            ) : (
              "Reset password"
            )}
          </button>
        </motion.form>

        {/* Back to Login */}
        <motion.div variants={fadeUp} transition={{ duration: 0.5 }}>
          <Link
            href="/login"
            className="text-sm text-gray-400 hover:text-gray-300 transition-colors duration-200"
          >
            Back to login
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PAGE EXPORT WITH SUSPENSE                                          */
/* ------------------------------------------------------------------ */

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="h-dvh bg-[#09090b] text-gray-100 flex flex-col items-center justify-center overflow-hidden">
        <div className="w-full max-w-[400px] px-4 sm:px-6 flex flex-col items-center gap-6 sm:gap-8">
          <div className="flex items-center gap-2.5">
            <LogoIcon className="w-10 h-10" forceDark />
            <span className="font-semibold text-xl tracking-tight text-gray-100">Erao</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading...
          </div>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
