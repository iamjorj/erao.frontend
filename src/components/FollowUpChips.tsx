"use client";

interface FollowUpChipsProps {
  questions: string[];
  onSelect: (question: string) => void;
  disabled?: boolean;
}

export default function FollowUpChips({ questions, onSelect, disabled }: FollowUpChipsProps) {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {questions.map((question, idx) => (
        <button
          key={idx}
          onClick={() => onSelect(question)}
          disabled={disabled}
          className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-[#333] text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-900 dark:hover:text-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {question}
        </button>
      ))}
    </div>
  );
}
