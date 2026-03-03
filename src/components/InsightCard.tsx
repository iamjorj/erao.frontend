"use client";

interface InsightCardProps {
  insight: string;
}

export default function InsightCard({ insight }: InsightCardProps) {
  return (
    <div className="mt-3 flex items-start gap-3 rounded-xl border border-gray-200/60 dark:border-white/[0.06] bg-gray-50/80 dark:bg-white/[0.02] px-4 py-3.5 shadow-sm shadow-black/[0.02] dark:shadow-none">
      <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-md bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
        <svg
          className="w-3 h-3 text-amber-500 dark:text-amber-400"
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <path d="M8 1.5l1.85 4.95L15 8l-5.15 1.55L8 14.5l-1.85-4.95L1 8l5.15-1.55L8 1.5z" />
        </svg>
      </div>
      <p className="text-[13px] leading-relaxed text-gray-600 dark:text-gray-300">
        {insight}
      </p>
    </div>
  );
}
