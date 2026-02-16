"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, UsageStats, UsageLogEntry, auth, getTierName } from "@/lib/api";
import SettingsBottomNav from "@/components/SettingsBottomNav";

export default function UsagePage() {
  const router = useRouter();
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [history, setHistory] = useState<UsageLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push("/login");
      return;
    }
    loadData();
  }, [router]);

  const loadData = async () => {
    try {
      const [usageRes, historyRes] = await Promise.all([
        api.getUsage(),
        api.getUsageHistory(),
      ]);

      if (usageRes.success) {
        setUsage(usageRes.data);
      }
      if (historyRes.success) {
        setHistory(historyRes.data);
      }
    } catch (err) {
      setError("Failed to load usage data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return `Today, ${date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })}`;
    } else if (days === 1) {
      return `Yesterday, ${date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })}`;
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  };

  const formatResetDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0a0a0a] flex items-center justify-center transition-colors">
        <div className="w-5 h-5 border-2 border-gray-200 dark:border-gray-700 border-t-gray-900 dark:border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const user = auth.getUser();
  const percentUsed = usage
    ? Math.round((usage.queriesUsedThisMonth / usage.queryLimitPerMonth) * 100)
    : 0;

  // Aggregate queries by database connection
  const aggregatedUsage = history.reduce((acc, entry) => {
    const dbName = entry.databaseConnectionName || "Chat Query";
    if (!acc[dbName]) {
      acc[dbName] = {
        name: dbName,
        count: 0,
        lastActivity: entry.createdAt,
      };
    }
    acc[dbName].count += 1;
    if (new Date(entry.createdAt) > new Date(acc[dbName].lastActivity)) {
      acc[dbName].lastActivity = entry.createdAt;
    }
    return acc;
  }, {} as Record<string, { name: string; count: number; lastActivity: string }>);

  const aggregatedList = Object.values(aggregatedUsage).sort(
    (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
  );

  const queriesRemaining = (usage?.queryLimitPerMonth || 0) - (usage?.queriesUsedThisMonth || 0);
  const databasesConnected = aggregatedList.filter(item => item.name !== "Chat Query").length;

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
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">Usage</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Track your query usage this billing cycle</p>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 bg-gray-50 dark:bg-[#1a1a1a] border-l-2 border-l-red-400 dark:border-l-red-500 text-gray-600 dark:text-gray-300 text-sm rounded-r-lg">
            {error}
          </div>
        )}

        {/* Current Plan Card */}
        <section className="mb-6 sm:mb-8">
          <div className="bg-gray-50 dark:bg-[#111111] rounded-xl p-4 sm:p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {getTierName(user?.subscriptionTier)} Plan
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                  Resets {usage ? formatResetDate(usage.billingCycleEnd) : "-"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {usage?.queriesUsedThisMonth || 0}
                  <span className="text-base font-normal text-gray-400 dark:text-gray-500">
                    /{usage?.queryLimitPerMonth || 0}
                  </span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">queries used</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-gray-500 dark:text-gray-400">Usage this cycle</span>
                <span className="text-gray-700 dark:text-gray-300">{percentUsed}%</span>
              </div>
              <div className="h-1.5 bg-gray-200 dark:bg-[#1a1a1a] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    percentUsed >= 90
                      ? "bg-red-500"
                      : percentUsed >= 70
                      ? "bg-amber-500"
                      : "bg-gray-900 dark:bg-white"
                  }`}
                  style={{ width: `${Math.min(percentUsed, 100)}%` }}
                />
              </div>
            </div>

            {percentUsed >= 80 && (
              <div className="mt-3 px-3 py-2 bg-gray-50 dark:bg-[#111111] border-l-2 border-l-gray-400 dark:border-l-gray-500 rounded-r-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Running low on queries.{" "}
                  <Link href="/subscriptions" className="text-gray-900 dark:text-white font-medium hover:underline">
                    Upgrade your plan
                  </Link>
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Stats Grid */}
        <section className="mb-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-gray-50 dark:bg-[#111111] rounded-xl p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Remaining</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{queriesRemaining}</p>
            </div>
            <div className="bg-gray-50 dark:bg-[#111111] rounded-xl p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Days left</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{usage?.daysUntilReset || 0}</p>
            </div>
            <div className="bg-gray-50 dark:bg-[#111111] rounded-xl p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Databases</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{databasesConnected}</p>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-gray-100 dark:border-[#1a1a1a] mb-8" />

        {/* Activity Section */}
        <section>
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Activity this month</h2>

          {aggregatedList.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-[#141414] flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">No activity yet this month</p>
              <Link href="/ai" className="text-sm text-gray-900 dark:text-white font-medium mt-2 inline-block hover:underline">
                Start querying →
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              {aggregatedList.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between py-3 px-1"
                >
                  <div>
                    <p className="text-sm text-gray-900 dark:text-white">{item.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Last used: {formatDate(item.lastActivity)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{item.count}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {item.count === 1 ? "query" : "queries"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Spacer for bottom nav */}
        <div className="h-20" />
      </main>

      <SettingsBottomNav />
    </div>
  );
}
