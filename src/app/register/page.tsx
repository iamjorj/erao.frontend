"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useGoogleLogin } from "@react-oauth/google";
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
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setError("");
      setGoogleLoading(true);
      try {
        const response = await api.googleLogin(tokenResponse.access_token);
        if (response.success && response.data) {
          auth.saveTokens(response.data.accessToken, response.data.refreshToken);
          auth.saveUser(response.data.user);
          router.push("/ai");
        }
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Google sign-up failed. Please try again.");
        }
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => setError("Google sign-up failed. Please try again."),
  });

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return "Password must be at least 8 characters";
    }
    if (!/[A-Z]/.test(pwd)) {
      return "Password must contain an uppercase letter";
    }
    if (!/[a-z]/.test(pwd)) {
      return "Password must contain a lowercase letter";
    }
    if (!/[0-9]/.test(pwd)) {
      return "Password must contain a number";
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) {
      return "Password must contain a special character";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate password strength
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    // Split full name into first and last name
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    if (!firstName) {
      setError("Please enter your name");
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.register({
        email,
        password,
        firstName,
        lastName,
      });

      if (response.success && response.data) {
        // Redirect to OTP verification page with email
        router.push(`/otp-verification?email=${encodeURIComponent(email)}&type=email-verification`);
      }
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

  return (
    <div className="h-dvh bg-[#09090b] text-gray-100 flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Subtle radial glow behind form */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[500px] bg-violet-500/[0.04] rounded-full blur-[120px] pointer-events-none" />

      {/* Back Button */}
      <Link
        href="/"
        className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors duration-200"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </Link>

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

        {/* Form Container */}
        <div className="w-full flex flex-col gap-6">
          {/* Header */}
          <motion.div
            className="flex flex-col gap-1.5"
            variants={fadeUp}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-lg font-semibold tracking-tight text-gray-100">Create your account</h1>
            <p className="text-sm text-gray-500">
              Start querying your databases in natural language
            </p>
          </motion.div>

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

          <motion.form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4"
            variants={fadeUp}
            transition={{ duration: 0.5 }}
          >
            {/* Full Name Field */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="fullName" className="text-sm font-medium text-gray-300">
                Full name
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your name"
                required
                className="h-10 bg-white/[0.04] border border-white/[0.06] rounded-xl px-3.5 text-sm text-gray-100 outline-none placeholder:text-gray-600 hover:border-white/[0.1] focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-all duration-200"
              />
            </div>

            {/* Email Field */}
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
                className="h-10 bg-white/[0.04] border border-white/[0.06] rounded-xl px-3.5 text-sm text-gray-100 outline-none placeholder:text-gray-600 hover:border-white/[0.1] focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-all duration-200"
              />
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-gray-300">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                required
                className="h-10 bg-white/[0.04] border border-white/[0.06] rounded-xl px-3.5 text-sm text-gray-100 outline-none placeholder:text-gray-600 hover:border-white/[0.1] focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-all duration-200"
              />
            </div>

            {/* Submit Button */}
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
                  Creating account...
                </span>
              ) : (
                "Create account"
              )}
            </button>
          </motion.form>

          {/* Divider */}
          <motion.div
            className="flex items-center gap-3"
            variants={fadeUp}
            transition={{ duration: 0.5 }}
          >
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-xs text-gray-600 uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </motion.div>

          {/* Google Sign Up Button */}
          <motion.button
            type="button"
            onClick={() => googleLogin()}
            disabled={googleLoading}
            className="h-11 w-full bg-white/[0.04] border border-white/[0.06] rounded-xl flex items-center justify-center gap-3 text-sm font-medium text-gray-300 hover:bg-white/[0.07] hover:border-white/[0.1] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            variants={fadeUp}
            transition={{ duration: 0.5 }}
          >
            {googleLoading ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating account...
              </span>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                Sign up with Google
              </>
            )}
          </motion.button>

          {/* Footer */}
          <motion.div
            className="flex items-center justify-center gap-1.5 text-sm"
            variants={fadeUp}
            transition={{ duration: 0.5 }}
          >
            <span className="text-gray-500">Already have an account?</span>
            <Link href="/login" className="text-gray-200 font-medium hover:text-white transition-colors duration-200">
              Sign in
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
