"use client";

interface InsightCardProps {
  insight: string;
}

export default function InsightCard({ insight }: InsightCardProps) {
  return (
    <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-gray-200 dark:border-[#2a2a2a] bg-gray-50 dark:bg-[#141414] px-3.5 py-3">
      <svg
        className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400 dark:text-gray-500"
        viewBox="0 0 16 16"
        fill="currentColor"
      >
        <path d="M8 1.5l1.85 4.95L15 8l-5.15 1.55L8 14.5l-1.85-4.95L1 8l5.15-1.55L8 1.5z" />
      </svg>
      <p className="text-[13px] leading-relaxed text-gray-600 dark:text-gray-400">
        {insight}
      </p>
    </div>
  );
}
