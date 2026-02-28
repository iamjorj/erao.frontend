"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { api, auth, ApiError } from "@/lib/api";
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
/*  OTP CONTENT                                                        */
/* ------------------------------------------------------------------ */

function OtpVerificationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const verificationType = searchParams.get("type") || "password-reset";

  const isEmailVerification = verificationType === "email-verification";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

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
    if (!email) {
      router.push(isEmailVerification ? "/register" : "/forgot-password");
    }
  }, [email, router, isEmailVerification]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value.slice(-1);
    }

    if (!/^\d*$/.test(value)) {
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length && i < 6; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);

    // Focus last filled input or next empty
    const lastIndex = Math.min(pastedData.length - 1, 5);
    inputRefs.current[lastIndex]?.focus();
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpValue = otp.join("");

    if (otpValue.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (isEmailVerification) {
        // Email verification flow - auto-login after verification
        const response = await api.verifyEmail({ email, otp: otpValue });
        if (response.success && response.data) {
          auth.saveTokens(response.data.accessToken, response.data.refreshToken);
          auth.saveUser(response.data.user);
          setSuccess("Email verified! Redirecting...");
          setTimeout(() => router.push("/ai"), 1000);
        } else {
          setError("Invalid or expired OTP");
        }
      } else {
        // Password reset flow
        const response = await api.verifyOtp(email, otpValue);
        if (response.success && response.data) {
          setSuccess("OTP verified! Redirecting to reset password...");
          router.push(
            `/reset-password?email=${encodeURIComponent(email)}&otp=${otpValue}`
          );
        } else {
          setError("Invalid or expired OTP");
        }
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Invalid or expired OTP");
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError("");
    setSuccess("");

    try {
      if (isEmailVerification) {
        await api.resendEmailVerification(email);
      } else {
        await api.resendOtp(email);
      }
      setSuccess("A new code has been sent to your email");
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError("Failed to resend code");
      console.error(err);
    } finally {
      setResending(false);
    }
  };

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
          className="w-full text-center flex flex-col gap-2"
          variants={fadeUp}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-lg font-semibold tracking-tight text-gray-100">Verify your email</h1>
          <p className="text-sm text-gray-500">
            {isEmailVerification
              ? "We've sent a 6-digit code to your email. Enter it below to complete your registration."
              : "We've sent a 6-digit code to your email. Enter it below to reset your password."}
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
          onSubmit={handleVerify}
          className="w-full flex flex-col gap-6"
          variants={fadeUp}
          transition={{ duration: 0.5 }}
        >
          {/* OTP Input Boxes */}
          <div className="flex justify-center gap-2 sm:gap-3">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className="w-10 h-12 sm:w-12 sm:h-14 text-center text-base sm:text-lg font-semibold bg-white/[0.04] border border-white/[0.06] rounded-xl text-gray-100 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-all duration-200"
              />
            ))}
          </div>

          {/* Verify Button */}
          <button
            type="submit"
            disabled={loading || otp.some((d) => !d)}
            className="w-full h-11 bg-gray-100 text-gray-900 text-sm font-medium rounded-xl hover:bg-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Verifying...
              </span>
            ) : (
              "Verify code"
            )}
          </button>
        </motion.form>

        {/* Resend Link */}
        <motion.div
          className="flex items-center gap-1.5 text-sm"
          variants={fadeUp}
          transition={{ duration: 0.5 }}
        >
          <span className="text-gray-500">Didn&apos;t receive the code?</span>
          <button
            onClick={handleResend}
            disabled={resending}
            className="text-gray-200 font-medium hover:text-white transition-colors duration-200 disabled:opacity-50"
          >
            {resending ? "Sending..." : "Resend"}
          </button>
        </motion.div>

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

export default function OtpVerificationPage() {
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
      <OtpVerificationContent />
    </Suspense>
  );
}
