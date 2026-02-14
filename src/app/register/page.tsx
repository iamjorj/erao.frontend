"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { api, auth, ApiError } from "@/lib/api";
import { LogoIcon } from "@/components/shared";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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
    <div className="h-dvh bg-white text-gray-900 flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Back Button */}
      <Link
        href="/"
        className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-2 text-sm text-gray-600 hover:text-black transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </Link>

      <div className="w-full max-w-[400px] flex flex-col items-center gap-6 sm:gap-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <LogoIcon className="w-12 h-12" />
          <span className="font-bold text-2xl tracking-tight">Erao</span>
        </Link>

        {/* Form Container */}
        <div className="w-full flex flex-col gap-6">
          {/* Header - LEFT ALIGNED */}
          <div className="flex flex-col gap-1">
            <h1 className="text-base font-semibold">Create your account</h1>
            <p className="text-base text-gray-500">
              Start querying your databases in natural language
            </p>
          </div>

          {error && (
            <div className="bg-gray-50 border-l-2 border-l-red-400 text-gray-600 text-sm px-4 py-3 rounded-r-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Full Name Field */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="fullName" className="text-sm font-medium">
                Full name
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your name"
                required
                className="h-10 bg-[#f5f5f5] rounded-[10px] px-3 text-sm outline-none placeholder:text-gray-400 hover:bg-[#efefef] focus:bg-white focus:ring-1 focus:ring-black transition-colors"
              />
            </div>

            {/* Email Field */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="h-10 bg-[#f5f5f5] rounded-[10px] px-3 text-sm outline-none placeholder:text-gray-400 hover:bg-[#efefef] focus:bg-white focus:ring-1 focus:ring-black transition-colors"
              />
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                required
                className="h-10 bg-[#f5f5f5] rounded-[10px] px-3 text-sm outline-none placeholder:text-gray-400 hover:bg-[#efefef] focus:bg-white focus:ring-1 focus:ring-black transition-colors"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="h-11 bg-black text-white rounded-[10px] text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-sm text-gray-400">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Custom Google Sign Up Button */}
          <button
            type="button"
            onClick={() => googleLogin()}
            disabled={googleLoading}
            className="h-11 w-full border border-gray-300 rounded-[10px] flex items-center justify-center gap-3 text-sm font-medium hover:bg-[#f5f5f5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {googleLoading ? (
              "Creating account..."
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
          </button>

          {/* Footer - ALL BLACK TEXT */}
          <div className="flex items-center justify-center gap-1 text-base">
            <span>Already have an account?</span>
            <Link href="/login" className="font-semibold hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
