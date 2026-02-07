"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, UsageStats, UsageLogEntry, auth } from "@/lib/api";

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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black dark:border-white"></div>
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-6 py-4 relative">
          <div className="flex items-center">
            <button
              onClick={() => router.back()}
              className="absolute flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mx-auto">Usage</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Current Usage Overview */}
        <div className="mb-8">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
            Current Billing Cycle
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {user?.subscriptionTier || "Starter"} Plan
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Resets on {usage ? formatResetDate(usage.billingCycleEnd) : "-"}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {usage?.queriesUsedThisMonth || 0}
                    <span className="text-lg font-normal text-gray-500 dark:text-gray-400">
                      /{usage?.queryLimitPerMonth || 0}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">queries used</p>
                </div>
              </div>

              {/* Usage Bar */}
              <div className="mt-6">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Usage this cycle</span>
                  <span className="font-medium text-gray-900 dark:text-white">{percentUsed}%</span>
                </div>
                <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      percentUsed >= 90
                        ? "bg-red-500"
                        : percentUsed >= 70
                        ? "bg-yellow-500"
                        : "bg-gray-900 dark:bg-white"
                    }`}
                    style={{ width: `${Math.min(percentUsed, 100)}%` }}
                  />
                </div>
                {percentUsed >= 80 && (
                  <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">
                    Running low on queries. <Link href="/subscriptions" className="underline">Upgrade your plan</Link>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mb-8">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
            Statistics
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
              <p className="text-gray-500 dark:text-gray-400 text-sm">Queries Remaining</p>
              <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">
                {(usage?.queryLimitPerMonth || 0) - (usage?.queriesUsedThisMonth || 0)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
              <p className="text-gray-500 dark:text-gray-400 text-sm">Days Until Reset</p>
              <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">
                {usage?.daysUntilReset || 0}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
              <p className="text-gray-500 dark:text-gray-400 text-sm">Databases Connected</p>
              <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">
                {aggregatedList.filter(item => item.name !== "Chat Query").length}
              </p>
            </div>
          </div>
        </div>

        {/* Usage by Database */}
        <div>
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
            Activity This Month
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6">
              {aggregatedList.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p className="text-gray-500 dark:text-gray-400">No activity yet this month</p>
                  <Link href="/ai" className="text-sm text-gray-900 dark:text-white font-medium mt-2 inline-block hover:underline">
                    Start querying &rarr;
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {aggregatedList.map((item) => (
                    <div
                      key={item.name}
                      className="flex justify-between items-center py-4 first:pt-0 last:pb-0"
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                          Last used: {formatDate(item.lastActivity)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900 dark:text-white">
                          {item.count}
                        </p>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                          {item.count === 1 ? "query" : "queries"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
