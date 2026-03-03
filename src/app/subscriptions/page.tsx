"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { api, auth, SubscriptionPlan, SubscriptionResponse } from "@/lib/api";
import SettingsBottomNav from "@/components/SettingsBottomNav";

const fadeUp = {
  hidden: { opacity: 0, y: 20, filter: "blur(8px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)" },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

export default function SubscriptionsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50/50 dark:bg-[#09090b] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-gray-200 dark:border-white/10 border-t-gray-900 dark:border-t-white rounded-full animate-spin" />
      </div>
    }>
      <SubscriptionsContent />
    </Suspense>
  );
}

function SubscriptionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<SubscriptionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push("/login");
      return;
    }

    const paymentStatus = searchParams.get("payment");
    if (paymentStatus === "success") {
      setSuccess("Payment successful! Your subscription will be activated shortly.");
    } else if (paymentStatus === "cancelled") {
      setError("Payment was cancelled. You can try again anytime.");
    }

    loadData();
  }, [router, searchParams]);

  const loadData = async () => {
    try {
      const [plansRes, subRes] = await Promise.all([
        api.getSubscriptionPlans(),
        api.getCurrentSubscription(),
      ]);

      if (plansRes.success) setPlans(plansRes.data);
      if (subRes.success) setCurrentSubscription(subRes.data);
    } catch (err) {
      setError("Failed to load subscription data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (tier: number) => {
    if (upgrading !== null) return;
    setUpgrading(tier);
    setError("");
    setSuccess("");

    try {
      const returnUrl = `${window.location.origin}/subscriptions?payment=success`;
      const res = await api.upgradeSubscription(tier, returnUrl);
      if (res.success && res.data.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
        return;
      } else {
        setError(res.message || "Failed to create checkout session. Please try again.");
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create checkout session. Please try again.";
      setError(errorMessage);
      console.error(err);
    } finally {
      setUpgrading(null);
    }
  };

  const handleDowngrade = async () => {
    if (upgrading !== null) return;
    setUpgrading(0);
    setError("");
    setSuccess("");

    try {
      const res = await api.downgradeSubscription();
      if (res.success) {
        setCurrentSubscription(res.data);
        setSuccess("Downgraded to free plan successfully.");
        await loadData();
      }
    } catch (err) {
      setError("Failed to downgrade subscription. Please try again.");
      console.error(err);
    } finally {
      setUpgrading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-[#09090b] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-gray-200 dark:border-white/10 border-t-gray-900 dark:border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const isUnlimited = currentSubscription?.queriesPerMonth === -1;
  const usagePercent = currentSubscription
    ? isUnlimited ? 0 : Math.round((currentSubscription.queriesUsed / currentSubscription.queriesPerMonth) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#09090b] transition-colors">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-[#09090b]/80 backdrop-blur-xl border-b border-gray-200/60 dark:border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center">
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

      <motion.main
        initial="hidden"
        animate="visible"
        variants={stagger}
        className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10"
      >
        {/* Page Title */}
        <motion.div variants={fadeUp} transition={{ duration: 0.5 }} className="mb-8 sm:mb-10">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 dark:text-white text-balance">
            Subscription
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1.5 text-sm sm:text-base">
            Manage your plan and billing
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

        {/* Current Plan Overview */}
        {currentSubscription && (
          <motion.section variants={fadeUp} transition={{ duration: 0.5 }} className="mb-8 sm:mb-10">
            <div className="bg-white dark:bg-white/[0.03] border border-gray-200/60 dark:border-white/[0.06] rounded-2xl p-5 sm:p-6 shadow-sm shadow-gray-900/[0.03] dark:shadow-none">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-gray-900 dark:text-white">
                      {currentSubscription.tierName}
                    </h2>
                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400 border border-gray-200/60 dark:border-white/[0.04]">
                      Active
                    </span>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Resets {formatDate(currentSubscription.billingCycleReset)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-semibold tracking-tighter text-gray-900 dark:text-white tabular-nums">
                    {currentSubscription.queriesUsed}
                    <span className="text-base font-normal tracking-normal text-gray-400 dark:text-gray-500">
                      {currentSubscription.queriesPerMonth === -1 ? " used" : `/${currentSubscription.queriesPerMonth}`}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">queries used</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between text-xs mb-2.5">
                  <span className="text-gray-500 dark:text-gray-400">Usage this cycle</span>
                  <span className="text-gray-700 dark:text-gray-300 font-medium">
                    {isUnlimited ? "Unlimited" : `${usagePercent}%`}
                  </span>
                </div>
                <div className="h-2.5 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${
                      usagePercent >= 90
                        ? "bg-red-500"
                        : usagePercent >= 70
                        ? "bg-amber-500"
                        : "bg-gray-900 dark:bg-white"
                    }`}
                    style={{ width: `${Math.min(usagePercent, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {/* Divider */}
        <div className="border-t border-gray-200/40 dark:border-white/[0.04] mb-8" />

        {/* Plans */}
        <motion.section variants={fadeUp} transition={{ duration: 0.5 }} className="mb-8 sm:mb-10">
          <div className="flex items-center justify-between mb-5 sm:mb-6">
            <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
              Available plans
            </h2>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {plans.length} {plans.length === 1 ? "plan" : "plans"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <div
                key={plan.tier}
                className={`relative bg-white dark:bg-white/[0.03] border rounded-2xl p-5 sm:p-6 transition-all duration-300 hover:border-gray-300 dark:hover:border-white/[0.12] ${
                  plan.isCurrent
                    ? "border-gray-900 dark:border-white/20 shadow-md shadow-gray-900/[0.06] dark:shadow-none ring-1 ring-gray-900/5 dark:ring-white/[0.08]"
                    : "border-gray-200/60 dark:border-white/[0.06] shadow-sm shadow-gray-900/[0.02] dark:shadow-none hover:shadow-md hover:shadow-gray-900/[0.04] dark:hover:shadow-none"
                }`}
              >
                {/* Badge */}
                {plan.isCurrent && (
                  <div className="absolute -top-2.5 left-4">
                    <span className="inline-block px-2.5 py-0.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[10px] font-medium rounded-full">
                      Current
                    </span>
                  </div>
                )}
                {!plan.isCurrent && plan.isPopular && (
                  <div className="absolute -top-2.5 left-4">
                    <span className="inline-block px-2.5 py-0.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[10px] font-medium rounded-full">
                      Popular
                    </span>
                  </div>
                )}

                <div className="pt-1">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">{plan.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{plan.description}</p>

                  <div className="mt-5 mb-6">
                    <span className="text-4xl font-semibold tracking-tighter text-gray-900 dark:text-white tabular-nums">${plan.price}</span>
                    <span className="text-gray-400 dark:text-gray-500 text-sm font-normal tracking-normal">/mo</span>
                  </div>

                  {/* Action Button */}
                  {plan.isCurrent ? (
                    <button
                      disabled
                      className="w-full h-10 rounded-xl text-xs font-medium bg-gray-100/80 dark:bg-white/[0.03] text-gray-400 dark:text-gray-500 border border-gray-200/40 dark:border-white/[0.04] cursor-not-allowed"
                    >
                      Current plan
                    </button>
                  ) : (
                    <Link
                      href="/contact-sales"
                      className="flex items-center justify-center w-full h-10 rounded-xl text-xs font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 active:scale-[0.98] transition-all duration-200"
                    >
                      Contact Sales
                    </Link>
                  )}

                  {/* Features */}
                  <ul className="mt-5 space-y-2.5">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs">
                        <svg className="w-3.5 h-3.5 text-gray-400 dark:text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-600 dark:text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Plan Stats */}
                  <div className="mt-5 pt-4 border-t border-gray-100 dark:border-white/[0.04] space-y-2.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400">Queries/mo</span>
                      <span className="text-gray-700 dark:text-gray-300 font-medium">
                        {plan.queriesPerMonth === -1 ? "Unlimited" : plan.queriesPerMonth}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400">Databases</span>
                      <span className="text-gray-700 dark:text-gray-300 font-medium">
                        {plan.databaseConnections === -1 ? "Unlimited" : plan.databaseConnections}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Divider */}
        <div className="border-t border-gray-200/40 dark:border-white/[0.04] mb-8" />

        {/* FAQ Section */}
        <motion.section variants={fadeUp} transition={{ duration: 0.5 }}>
          <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white mb-5">
            Common questions
          </h2>

          <div className="space-y-3">
            {[
              {
                q: "Can I downgrade my plan?",
                a: "Yes, you can downgrade anytime. You may need to remove database connections if you exceed the lower plan's limit.",
              },
              {
                q: "When does my billing cycle reset?",
                a: "Your query count resets monthly on the date you signed up.",
              },
              {
                q: "Do you offer refunds?",
                a: "Yes, within 7 days of purchase if you've used fewer than 5 queries.",
              },
            ].map((faq, idx) => (
              <div key={idx} className="bg-white dark:bg-white/[0.02] border border-gray-200/60 dark:border-white/[0.06] rounded-2xl p-4 sm:p-5 shadow-sm shadow-gray-900/[0.02] dark:shadow-none hover:border-gray-300/60 dark:hover:border-white/[0.1] transition-colors duration-200">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">{faq.q}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Spacer for bottom nav */}
        <div className="h-24 md:h-0" />
      </motion.main>

      <SettingsBottomNav />
    </div>
  );
}
