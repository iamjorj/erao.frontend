"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { api, User, auth } from "@/lib/api";
import SettingsBottomNav from "@/components/SettingsBottomNav";

const fadeUp = {
  hidden: { opacity: 0, y: 20, filter: "blur(8px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)" },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push("/login");
      return;
    }
    loadUser();
    const savedMode = localStorage.getItem("darkMode");
    if (savedMode === "true") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    }
  }, [router]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("darkMode", "true");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("darkMode", "false");
    }
  }, [darkMode]);

  const loadUser = async () => {
    try {
      const response = await api.getAccount();
      if (response.success) {
        setUser(response.data);
        setFirstName(response.data.firstName);
        setLastName(response.data.lastName);
      }
    } catch (err) {
      setError("Failed to load profile");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.updateAccount({ firstName, lastName });
      if (response.success) {
        setUser(response.data);
        setFirstName(response.data.firstName);
        setLastName(response.data.lastName);
        auth.saveUser(response.data);
        setSuccess("Profile updated successfully");
      }
    } catch (err) {
      setError("Failed to update profile");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-[#09090b] flex items-center justify-center transition-colors">
        <div className="w-5 h-5 border-2 border-gray-200 dark:border-white/10 border-t-gray-900 dark:border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const initials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
    : "";

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#09090b] transition-colors">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-[#09090b]/80 backdrop-blur-xl border-b border-gray-200/60 dark:border-white/[0.06]">
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

      {/* Content */}
      <motion.main
        initial="hidden"
        animate="visible"
        variants={stagger}
        className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10"
      >
        {/* Page Title */}
        <motion.div variants={fadeUp} transition={{ duration: 0.5 }} className="mb-8 sm:mb-10">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 dark:text-white text-balance">
            Profile
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1.5 text-sm sm:text-base">
            Manage your account settings
          </p>
        </motion.div>

        {error && (
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="mb-6 px-4 py-3 bg-red-50 dark:bg-red-500/[0.06] border border-red-200/60 dark:border-red-500/10 text-red-700 dark:text-red-300 text-sm rounded-xl"
          >
            {error}
          </motion.div>
        )}

        {success && (
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="mb-6 px-4 py-3 bg-emerald-50 dark:bg-emerald-500/[0.06] border border-emerald-200/60 dark:border-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-sm rounded-xl"
          >
            {success}
          </motion.div>
        )}

        {/* Profile Section */}
        <motion.section variants={fadeUp} transition={{ duration: 0.5 }} className="mb-8 sm:mb-10">
          <div className="bg-white dark:bg-white/[0.03] border border-gray-200/60 dark:border-white/[0.06] rounded-2xl p-5 sm:p-6 shadow-sm shadow-gray-900/[0.03] dark:shadow-none">
            <div className="flex items-center gap-4 pb-6 mb-6 border-b border-gray-100 dark:border-white/[0.04]">
              <div className="w-14 h-14 bg-gray-900 dark:bg-white/[0.08] rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm shadow-gray-900/10 dark:shadow-none">
                <span className="text-white dark:text-gray-200 text-base font-semibold tracking-tight">{initials}</span>
              </div>
              <div className="min-w-0">
                <p className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-gray-500 dark:text-gray-400 text-sm truncate">{user?.email}</p>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                    First name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full h-11 px-4 bg-gray-50/80 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-gray-400 dark:focus:border-white/20 focus-visible:ring-2 focus-visible:ring-gray-400/20 dark:focus-visible:ring-white/10 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                    Last name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full h-11 px-4 bg-gray-50/80 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-gray-400 dark:focus:border-white/20 focus-visible:ring-2 focus-visible:ring-gray-400/20 dark:focus-visible:ring-white/10 transition-all duration-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                  Email
                </label>
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="w-full h-11 px-4 bg-gray-100/80 dark:bg-white/[0.02] border border-gray-200/60 dark:border-white/[0.04] rounded-xl text-sm text-gray-400 dark:text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Email cannot be changed</p>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="h-10 px-6 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 active:scale-[0.98] disabled:opacity-50 transition-all duration-200 min-h-[44px]"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </form>
          </div>
        </motion.section>

        {/* Preferences Section */}
        <motion.section variants={fadeUp} transition={{ duration: 0.5 }} className="mb-8 sm:mb-10">
          <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white mb-4">
            Preferences
          </h2>

          <div className="bg-white dark:bg-white/[0.03] border border-gray-200/60 dark:border-white/[0.06] rounded-2xl p-5 sm:p-6 shadow-sm shadow-gray-900/[0.02] dark:shadow-none">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                  </svg>
                  <p className="text-gray-900 dark:text-white text-sm font-medium">Dark mode</p>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 ml-6">
                  Switch between light and dark theme
                </p>
              </div>
              <button
                onClick={() => setDarkMode(!darkMode)}
                aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 min-h-[44px] min-w-[44px] flex items-center ${
                  darkMode ? "bg-gray-900 dark:bg-white" : "bg-gray-200 dark:bg-white/[0.08]"
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white dark:bg-[#09090b] rounded-full shadow-sm transition-transform duration-200 ${
                    darkMode ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </motion.section>

        {/* Quick Links Section */}
        <motion.section variants={fadeUp} transition={{ duration: 0.5 }} className="mb-8 sm:mb-10">
          <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white mb-4">
            Quick links
          </h2>

          <div className="bg-white dark:bg-white/[0.03] border border-gray-200/60 dark:border-white/[0.06] rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-white/[0.04] shadow-sm shadow-gray-900/[0.02] dark:shadow-none">
            {[
              {
                label: "View usage",
                description: "Track your query consumption",
                href: "/usage",
                icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                ),
              },
              {
                label: "Manage subscription",
                description: "View plans and billing",
                href: "/subscriptions",
                icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                  </svg>
                ),
              },
            ].map((link) => (
              <button
                key={link.href}
                onClick={() => router.push(link.href)}
                className="w-full flex items-center justify-between py-4 px-5 text-left group hover:bg-gray-50/80 dark:hover:bg-white/[0.02] transition-colors duration-200 min-h-[44px]"
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors duration-200">
                    {link.icon}
                  </span>
                  <div>
                    <span className="text-gray-700 dark:text-gray-300 text-sm font-medium group-hover:text-gray-900 dark:group-hover:text-white transition-colors duration-200 block">
                      {link.label}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{link.description}</span>
                  </div>
                </div>
                <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-all duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </motion.section>

        {/* Sign Out */}
        <motion.section variants={fadeUp} transition={{ duration: 0.5 }} className="mb-8 sm:mb-10">
          <button
            onClick={async () => {
              setSigningOut(true);
              try {
                await api.logout();
              } catch {
                // Ignore logout errors
              }
              auth.clearTokens();
              router.push("/login");
            }}
            disabled={signingOut}
            className="w-full h-11 flex items-center justify-center gap-2 bg-white dark:bg-white/[0.03] border border-gray-200/60 dark:border-white/[0.06] rounded-2xl text-sm text-red-600 dark:text-red-400 font-medium hover:bg-red-50 dark:hover:bg-red-500/[0.04] hover:border-red-200/60 dark:hover:border-red-500/10 active:scale-[0.99] disabled:opacity-50 transition-all duration-200 min-h-[44px] shadow-sm shadow-gray-900/[0.02] dark:shadow-none"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            {signingOut ? "Signing out..." : "Sign out"}
          </button>
        </motion.section>

        {/* Delete Account */}
        <motion.section variants={fadeUp} transition={{ duration: 0.5 }} className="mb-8 sm:mb-10">
          <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white mb-4">
            Danger zone
          </h2>

          <div className="bg-white dark:bg-white/[0.02] border border-red-200/30 dark:border-red-500/[0.06] rounded-2xl p-5 sm:p-6 shadow-sm shadow-red-900/[0.02] dark:shadow-none">
            {user?.subscriptionTier === 0 || user?.subscriptionTier === "Starter" ? (
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1.5">Delete account</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">
                  Account deletion is only available for paid plans to prevent abuse of our free tier.
                </p>
                <button
                  onClick={() => router.push("/subscriptions")}
                  className="text-sm text-gray-900 dark:text-white font-medium underline underline-offset-2 hover:no-underline transition-colors min-h-[44px]"
                >
                  Upgrade your plan
                </button>
              </div>
            ) : (
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1.5">Delete account</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                {deleteError && (
                  <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-500/[0.06] border border-red-200/60 dark:border-red-500/10 text-red-700 dark:text-red-300 text-sm rounded-xl">
                    {deleteError}
                  </div>
                )}
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="h-10 px-5 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium rounded-xl hover:bg-red-50 dark:hover:bg-red-500/[0.06] active:scale-[0.98] transition-all duration-200 min-h-[44px]"
                  >
                    Delete my account
                  </button>
                ) : (
                  <div className="p-4 border border-red-200/60 dark:border-red-500/10 rounded-xl bg-red-50/50 dark:bg-red-500/[0.04]">
                    <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                      Are you sure? All your databases, conversations, files, and data will be permanently deleted.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={async () => {
                          setDeleting(true);
                          setDeleteError("");
                          try {
                            const response = await api.deleteAccount();
                            if (response.success) {
                              auth.clearTokens();
                              router.push("/login");
                            } else {
                              setDeleteError(response.message || "Failed to delete account");
                              setShowDeleteConfirm(false);
                            }
                          } catch {
                            setDeleteError("Failed to delete account");
                            setShowDeleteConfirm(false);
                          } finally {
                            setDeleting(false);
                          }
                        }}
                        disabled={deleting}
                        className="h-9 px-4 bg-red-600 dark:bg-red-500 text-white text-sm font-medium rounded-xl hover:bg-red-700 dark:hover:bg-red-600 active:scale-[0.98] disabled:opacity-50 transition-all duration-200 min-h-[44px]"
                      >
                        {deleting ? "Deleting..." : "Yes, delete my account"}
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="h-9 px-4 bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] text-sm text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.06] active:scale-[0.98] transition-all duration-200 min-h-[44px]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.section>

        {/* Spacer for bottom nav */}
        <div className="h-24 md:h-0" />
      </motion.main>

      <SettingsBottomNav />
    </div>
  );
}
