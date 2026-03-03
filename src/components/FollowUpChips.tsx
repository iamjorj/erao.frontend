"use client";

interface FollowUpChipsProps {
  questions: string[];
  onSelect: (question: string) => void;
  disabled?: boolean;
}

export default function FollowUpChips({ questions, onSelect, disabled }: FollowUpChipsProps) {
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {questions.map((question, idx) => (
        <button
          key={idx}
          onClick={() => onSelect(question)}
          disabled={disabled}
          className="px-3.5 py-2 text-[13px] leading-snug rounded-xl border border-gray-200/80 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/[0.15] hover:bg-gray-50 dark:hover:bg-white/[0.06] hover:text-gray-900 dark:hover:text-gray-200 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-black/[0.03] dark:shadow-none"
        >
          {question}
        </button>
      ))}
    </div>
  );
}
