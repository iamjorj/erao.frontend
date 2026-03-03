"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { api, UsageStats, UsageLogEntry, auth, getTierName } from "@/lib/api";
import SettingsBottomNav from "@/components/SettingsBottomNav";

const fadeUp = {
  hidden: { opacity: 0, y: 20, filter: "blur(8px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)" },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

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
      <div className="min-h-screen bg-gray-50/50 dark:bg-[#09090b] flex items-center justify-center transition-colors">
        <div className="w-5 h-5 border-2 border-gray-200 dark:border-white/10 border-t-gray-900 dark:border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const user = auth.getUser();
  const percentUsed = usage
    ? Math.round((usage.queriesUsedThisMonth / usage.queryLimitPerMonth) * 100)
    : 0;

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
            Usage
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1.5 text-sm sm:text-base">
            Track your query usage this billing cycle
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

        {/* Current Plan Card */}
        <motion.section variants={fadeUp} transition={{ duration: 0.5 }} className="mb-6 sm:mb-8">
          <div className="bg-white dark:bg-white/[0.03] border border-gray-200/60 dark:border-white/[0.06] rounded-2xl p-5 sm:p-6 shadow-sm shadow-gray-900/[0.03] dark:shadow-none">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-gray-900 dark:text-white">
                    {getTierName(user?.subscriptionTier)} Plan
                  </h2>
                  <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400 border border-gray-200/60 dark:border-white/[0.04]">
                    Active
                  </span>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Resets {usage ? formatResetDate(usage.billingCycleEnd) : "-"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-semibold tracking-tighter text-gray-900 dark:text-white tabular-nums">
                  {usage?.queriesUsedThisMonth || 0}
                  <span className="text-base font-normal tracking-normal text-gray-400 dark:text-gray-500">
                    /{usage?.queryLimitPerMonth || 0}
                  </span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">queries used</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div>
              <div className="flex items-center justify-between text-xs mb-2.5">
                <span className="text-gray-500 dark:text-gray-400">Usage this cycle</span>
                <span className="text-gray-700 dark:text-gray-300 font-medium">{percentUsed}%</span>
              </div>
              <div className="h-2.5 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${
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
              <div className="mt-4 px-3.5 py-2.5 bg-amber-50 dark:bg-amber-500/[0.06] border border-amber-200/60 dark:border-amber-500/10 rounded-xl">
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Running low on queries.{" "}
                  <Link href="/subscriptions" className="font-medium underline underline-offset-2 hover:no-underline transition-colors">
                    Upgrade your plan
                  </Link>
                </p>
              </div>
            )}
          </div>
        </motion.section>

        {/* Stats Grid */}
        <motion.section variants={fadeUp} transition={{ duration: 0.5 }} className="mb-10">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Remaining", value: queriesRemaining },
              { label: "Days left", value: usage?.daysUntilReset || 0 },
              { label: "Databases", value: databasesConnected },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white dark:bg-white/[0.03] border border-gray-200/60 dark:border-white/[0.06] rounded-2xl p-4 sm:p-5 shadow-sm shadow-gray-900/[0.03] dark:shadow-none hover:border-gray-300/60 dark:hover:border-white/[0.1] transition-colors duration-200"
              >
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{stat.label}</p>
                <p className="text-3xl font-semibold tracking-tighter text-gray-900 dark:text-white tabular-nums">{stat.value}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Divider */}
        <div className="border-t border-gray-200/40 dark:border-white/[0.04] mb-8" />

        {/* Activity Section */}
        <motion.section variants={fadeUp} transition={{ duration: 0.5 }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
              Activity this month
            </h2>
            <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
              {aggregatedList.length} {aggregatedList.length === 1 ? "source" : "sources"}
            </span>
          </div>

          {aggregatedList.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/[0.06] flex items-center justify-center mx-auto mb-5 shadow-sm shadow-gray-900/[0.02] dark:shadow-none">
                <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">No activity yet this month</p>
              <Link
                href="/ai"
                className="inline-flex items-center gap-1 text-sm text-gray-900 dark:text-white font-medium hover:opacity-70 transition-opacity"
              >
                Start querying
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          ) : (
            <div className="bg-white dark:bg-white/[0.02] border border-gray-200/60 dark:border-white/[0.06] rounded-2xl overflow-hidden shadow-sm shadow-gray-900/[0.02] dark:shadow-none divide-y divide-gray-100 dark:divide-white/[0.04]">
              {aggregatedList.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between py-3.5 px-4 sm:px-5 hover:bg-gray-50/80 dark:hover:bg-white/[0.02] transition-colors duration-200"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {formatDate(item.lastActivity)}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-base font-semibold tabular-nums tracking-tight text-gray-900 dark:text-white">{item.count}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {item.count === 1 ? "query" : "queries"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.section>

        {/* Spacer for bottom nav */}
        <div className="h-24 md:h-0" />
      </motion.main>

      <SettingsBottomNav />
    </div>
  );
}
