"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, auth, SubscriptionPlan, SubscriptionResponse } from "@/lib/api";

export default function SubscriptionsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-gray-200 dark:border-gray-700 border-t-gray-900 dark:border-t-white rounded-full animate-spin" />
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

    // Handle return from Dodo Payments checkout
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
        // Redirect to Dodo Payments checkout
        window.location.href = res.data.checkoutUrl;
        return; // Don't clear upgrading state since we're redirecting
      } else {
        // Show error message from API
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
    setUpgrading(0); // 0 = Starter tier
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
      <div className="min-h-screen bg-white dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-gray-200 dark:border-gray-700 border-t-gray-900 dark:border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const isUnlimited = currentSubscription?.queriesPerMonth === -1;
  const usagePercent = currentSubscription
    ? isUnlimited ? 0 : Math.round((currentSubscription.queriesUsed / currentSubscription.queriesPerMonth) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] transition-colors">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-sm border-b border-gray-100 dark:border-[#1a1a1a]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center">
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

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Page Title */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">Subscription</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your plan and billing</p>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 px-4 py-3 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 text-sm rounded-lg">
            {success}
          </div>
        )}

        {/* Current Plan Overview */}
        {currentSubscription && (
          <section className="mb-8 sm:mb-10">
            <div className="bg-gray-50 dark:bg-[#111111] rounded-xl p-4 sm:p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {currentSubscription.tierName}
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                    Resets {formatDate(currentSubscription.billingCycleReset)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {currentSubscription.queriesUsed}
                    <span className="text-base font-normal text-gray-400 dark:text-gray-500">
                      {currentSubscription.queriesPerMonth === -1 ? " used" : `/${currentSubscription.queriesPerMonth}`}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">queries used</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-gray-500 dark:text-gray-400">Usage this cycle</span>
                  <span className="text-gray-700 dark:text-gray-300">{isUnlimited ? "Unlimited" : `${usagePercent}%`}</span>
                </div>
                <div className="h-1.5 bg-gray-200 dark:bg-[#1a1a1a] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
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
          </section>
        )}

        {/* Divider */}
        <div className="border-t border-gray-100 dark:border-[#1a1a1a] mb-8" />

        {/* Plans */}
        <section className="mb-8 sm:mb-10">
          <h2 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-4 sm:mb-6">Available plans</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <div
                key={plan.tier}
                className={`relative bg-gray-50 dark:bg-[#111111] rounded-xl p-5 transition-all ${
                  plan.isCurrent ? "ring-2 ring-gray-900 dark:ring-white" : ""
                }`}
              >
                {/* Badge */}
                {plan.isCurrent && (
                  <div className="absolute -top-2.5 left-4">
                    <span className="inline-block px-2 py-0.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0a0a0a] text-gray-600 dark:text-gray-400 text-[10px] font-medium rounded">
                      Current
                    </span>
                  </div>
                )}
                {!plan.isCurrent && plan.isPopular && (
                  <div className="absolute -top-2.5 left-4">
                    <span className="inline-block px-2 py-0.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[10px] font-medium rounded">
                      Popular
                    </span>
                  </div>
                )}

                <div className="pt-2">
                  <h3 className="text-base font-medium text-gray-900 dark:text-white">{plan.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{plan.description}</p>

                  <div className="mt-4 mb-5">
                    <span className="text-3xl font-semibold text-gray-900 dark:text-white">${plan.price}</span>
                    <span className="text-gray-500 dark:text-gray-400 text-sm">/mo</span>
                  </div>

                  {/* Action Button */}
                  {plan.isCurrent ? (
                    <button
                      disabled
                      className="w-full h-9 rounded-lg text-xs font-medium bg-gray-200 dark:bg-[#1a1a1a] text-gray-400 dark:text-gray-500 cursor-not-allowed"
                    >
                      Current plan
                    </button>
                  ) : (
                    <Link
                      href="/contact-sales"
                      className="block w-full h-9 rounded-lg text-xs font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors leading-9 text-center"
                    >
                      Contact Sales
                    </Link>
                  )}

                  {/* Features */}
                  <ul className="mt-5 space-y-2">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs">
                        <svg className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-600 dark:text-gray-400">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Plan Stats */}
                  <div className="mt-5 pt-4 border-t border-gray-200 dark:border-[#1a1a1a] space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400">Queries/mo</span>
                      <span className="text-gray-700 dark:text-gray-300">{plan.queriesPerMonth === -1 ? "Unlimited" : plan.queriesPerMonth}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400">Databases</span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {plan.databaseConnections === -1 ? "Unlimited" : plan.databaseConnections}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-gray-100 dark:border-[#1a1a1a] mb-8" />

        {/* FAQ Section */}
        <section>
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Common questions</h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Can I downgrade my plan?</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Yes, you can downgrade anytime. You may need to remove database connections if you exceed the lower plan&apos;s limit.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">When does my billing cycle reset?</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Your query count resets monthly on the date you signed up.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Do you offer refunds?</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Yes, within 7 days of purchase if you&apos;ve used fewer than 5 queries.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
