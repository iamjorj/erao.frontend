"use client";

import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { api, ApiError } from "@/lib/api";
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

const stepTransition = {
  initial: { opacity: 0, x: 20, filter: "blur(6px)" },
  animate: { opacity: 1, x: 0, filter: "blur(0px)" },
  exit: { opacity: 0, x: -20, filter: "blur(6px)" },
};

/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */

type Step = "email" | "otp" | "reset" | "success";

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Z]/.test(pwd)) return "Password must contain an uppercase letter";
    if (!/[a-z]/.test(pwd)) return "Password must contain a lowercase letter";
    if (!/[0-9]/.test(pwd)) return "Password must contain a number";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) return "Password must contain a special character";
    return null;
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await api.forgotPassword(email);
      setStep("otp");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value[0];
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const otpCode = otp.join("");
    if (otpCode.length !== 6) {
      setError("Please enter the complete 6-digit code");
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.verifyOtp(email, otpCode);
      if (response.success) {
        setStep("reset");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Invalid or expired code. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setIsLoading(true);

    try {
      await api.resetPassword(email, otp.join(""), newPassword);
      setStep("success");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setIsLoading(true);
    try {
      await api.forgotPassword(email);
      setOtp(["", "", "", "", "", ""]);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  /* Shared input class */
  const inputClass =
    "h-10 bg-white/[0.04] border border-white/[0.06] rounded-xl px-3.5 text-sm text-gray-100 outline-none placeholder:text-gray-600 hover:border-white/[0.1] focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-all duration-200";

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

        <AnimatePresence mode="wait">
          {/* Step: Email */}
          {step === "email" && (
            <motion.div
              key="email"
              className="w-full flex flex-col gap-6"
              {...stepTransition}
              transition={{ duration: 0.4 }}
            >
              <div className="flex flex-col gap-1.5">
                <h1 className="text-lg font-semibold tracking-tight text-gray-100">Reset your password</h1>
                <p className="text-sm text-gray-500">
                  Enter your email and we&apos;ll send you a code
                </p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-red-500/[0.08] border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl"
                >
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="text-sm font-medium text-gray-300">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className={inputClass}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="h-11 bg-gray-100 text-gray-900 rounded-xl text-sm font-medium hover:bg-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-1"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    "Send reset code"
                  )}
                </button>
              </form>

              <div className="text-center">
                <Link href="/login" className="text-sm text-gray-400 hover:text-gray-300 transition-colors duration-200">
                  Back to login
                </Link>
              </div>
            </motion.div>
          )}

          {/* Step: OTP */}
          {step === "otp" && (
            <motion.div
              key="otp"
              className="w-full flex flex-col gap-6"
              {...stepTransition}
              transition={{ duration: 0.4 }}
            >
              <div className="flex flex-col gap-1.5">
                <h1 className="text-lg font-semibold tracking-tight text-gray-100">Verify your email</h1>
                <p className="text-sm text-gray-500">
                  We&apos;ve sent a 6-digit code to your email. Enter it below to reset your password.
                </p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-red-500/[0.08] border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl"
                >
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleOtpSubmit} className="flex flex-col gap-6">
                <div className="flex justify-center gap-2 sm:gap-3">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => { inputRefs.current[index] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-10 h-12 sm:w-12 sm:h-14 bg-white/[0.04] border border-white/[0.06] rounded-xl text-center text-base sm:text-lg font-semibold text-gray-100 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-all duration-200"
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="h-11 bg-gray-100 text-gray-900 rounded-xl text-sm font-medium hover:bg-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
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
              </form>

              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="text-gray-500">Didn&apos;t receive the code?</span>
                  <button
                    onClick={handleResend}
                    disabled={isLoading}
                    className="text-gray-200 font-medium hover:text-white transition-colors duration-200 disabled:opacity-50"
                  >
                    Resend
                  </button>
                </div>
                <Link href="/login" className="text-sm text-gray-400 hover:text-gray-300 transition-colors duration-200">
                  Back to login
                </Link>
              </div>
            </motion.div>
          )}

          {/* Step: Reset Password */}
          {step === "reset" && (
            <motion.div
              key="reset"
              className="w-full flex flex-col gap-6"
              {...stepTransition}
              transition={{ duration: 0.4 }}
            >
              <div className="flex flex-col gap-1.5">
                <h1 className="text-lg font-semibold tracking-tight text-gray-100">Create new password</h1>
                <p className="text-sm text-gray-500">
                  Choose a strong password for your account
                </p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-red-500/[0.08] border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl"
                >
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleResetSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="newPassword" className="text-sm font-medium text-gray-300">
                    New password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Create a password"
                    required
                    className={inputClass}
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
                    placeholder="Confirm password"
                    required
                    className={inputClass}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="h-11 bg-gray-100 text-gray-900 rounded-xl text-sm font-medium hover:bg-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-1"
                >
                  {isLoading ? (
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
              </form>
            </motion.div>
          )}

          {/* Step: Success */}
          {step === "success" && (
            <motion.div
              key="success"
              className="w-full flex flex-col items-center gap-6"
              {...stepTransition}
              transition={{ duration: 0.4 }}
            >
              <div className="w-14 h-14 bg-emerald-500/[0.1] border border-emerald-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="text-center flex flex-col gap-1.5">
                <h1 className="text-lg font-semibold tracking-tight text-gray-100">Password reset!</h1>
                <p className="text-sm text-gray-500">
                  Your password has been successfully reset.
                </p>
              </div>
              <button
                onClick={() => router.push("/login")}
                className="w-full h-11 bg-gray-100 text-gray-900 rounded-xl text-sm font-medium hover:bg-white transition-colors duration-200"
              >
                Sign in
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
