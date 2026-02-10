"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, User, auth } from "@/lib/api";

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
      <div className="min-h-screen bg-white dark:bg-[#0a0a0a] flex items-center justify-center transition-colors">
        <div className="w-5 h-5 border-2 border-gray-200 dark:border-gray-700 border-t-gray-900 dark:border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const initials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
    : "";

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] transition-colors">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-sm border-b border-gray-100 dark:border-[#1a1a1a]">
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

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Page Title */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">Profile</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your account settings</p>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 bg-gray-50 dark:bg-[#1a1a1a] border-l-2 border-l-red-400 dark:border-l-red-500 text-gray-600 dark:text-gray-300 text-sm rounded-r-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 px-4 py-3 bg-gray-50 dark:bg-[#1a1a1a] border-l-2 border-l-gray-900 dark:border-l-white text-gray-600 dark:text-gray-300 text-sm rounded-r-lg">
            {success}
          </div>
        )}

        {/* Profile Section */}
        <section className="mb-8 sm:mb-10">
          <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="w-16 h-16 bg-gray-900 dark:bg-white rounded-full flex items-center justify-center">
              <span className="text-white dark:text-gray-900 text-lg font-medium">{initials}</span>
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">{user?.email}</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-2">
                  First name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full h-11 px-4 bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-[#262626] rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-gray-400 dark:focus:border-[#404040] transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-2">
                  Last name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full h-11 px-4 bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-[#262626] rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-gray-400 dark:focus:border-[#404040] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-2">Email</label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full h-11 px-4 bg-gray-100 dark:bg-[#0f0f0f] border border-gray-200 dark:border-[#1a1a1a] rounded-lg text-sm text-gray-400 dark:text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Email cannot be changed</p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="h-10 px-5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </form>
        </section>

        {/* Divider */}
        <div className="border-t border-gray-100 dark:border-[#1a1a1a] mb-8 sm:mb-10" />

        {/* Preferences Section */}
        <section className="mb-8 sm:mb-10">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Preferences</h2>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-gray-900 dark:text-white text-sm">Dark mode</p>
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">Switch between light and dark theme</p>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                darkMode ? "bg-gray-900 dark:bg-white" : "bg-gray-200 dark:bg-[#262626]"
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white dark:bg-[#0a0a0a] rounded-full shadow-sm transition-transform ${
                  darkMode ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-gray-100 dark:border-[#1a1a1a] mb-8 sm:mb-10" />

        {/* Quick Links Section */}
        <section>
          <h2 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-4">Quick links</h2>

          <div className="space-y-1">
            <button
              onClick={() => router.push("/usage")}
              className="w-full flex items-center justify-between py-3 px-1 text-left group"
            >
              <span className="text-gray-600 dark:text-gray-300 text-sm group-hover:text-gray-900 dark:group-hover:text-white transition-colors">View usage</span>
              <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              onClick={() => router.push("/subscriptions")}
              className="w-full flex items-center justify-between py-3 px-1 text-left group"
            >
              <span className="text-gray-600 dark:text-gray-300 text-sm group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Manage subscription</span>
              <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
