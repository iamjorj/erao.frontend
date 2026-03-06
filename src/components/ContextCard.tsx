"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Conversation, ContextMetadata } from "@/lib/api";

interface ContextCardProps {
  conversation: Conversation | null;
  contextMetadata: ContextMetadata | null;
}

export function ContextCard({ conversation, contextMetadata }: ContextCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const meta = contextMetadata;
  const summary = conversation?.contextSummary || meta?.contextSummary || null;
  const summarizedCount = conversation?.summarizedMessageCount || meta?.summarizedMessageCount || 0;

  const handleCopy = useCallback(() => {
    if (!summary) return;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [summary]);

  // Show nothing if no context metadata at all
  if (!meta) return null;

  const tokenPercent = Math.round((meta.estimatedInputTokens / meta.tokenBudget) * 100);
  const remaining = 100 - tokenPercent;
  const barFill =
    tokenPercent > 85
      ? "bg-red-500"
      : tokenPercent > 60
      ? "bg-amber-500"
      : "bg-emerald-500";
  const statusColor =
    tokenPercent > 85 ? "red" : tokenPercent > 60 ? "amber" : "emerald";

  // Status text for collapsed view
  const statusText = summary
    ? `${summarizedCount} message${summarizedCount !== 1 ? "s" : ""} compacted`
    : tokenPercent < 30
    ? "Context window healthy"
    : tokenPercent < 70
    ? "Context filling up"
    : "Compaction soon";

  return (
    <div className="mx-3 sm:mx-5 mt-3 mb-1">
      <div
        className={`rounded-xl border transition-all duration-200 ${
          expanded
            ? summary
              ? "border-amber-200/60 dark:border-amber-500/[0.12] bg-amber-50/30 dark:bg-amber-500/[0.02]"
              : "border-gray-200/80 dark:border-white/[0.08] bg-gray-50/40 dark:bg-white/[0.02]"
            : "border-gray-200/60 dark:border-white/[0.06] bg-gray-50/30 dark:bg-white/[0.015]"
        }`}
      >
        {/* Collapsed header */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-3.5 py-2.5 cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Icon */}
            <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${
              summary
                ? "bg-amber-100 dark:bg-amber-500/10"
                : "bg-gray-100 dark:bg-white/[0.06]"
            }`}>
              <svg
                className={`w-3.5 h-3.5 ${
                  summary
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-gray-500 dark:text-gray-400"
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>

            {/* Label + status */}
            <div className="min-w-0">
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Context
              </span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-2">
                {statusText}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Mini progress bar */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-16 h-1.5 rounded-full overflow-hidden bg-gray-200/60 dark:bg-white/[0.06]">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barFill}`}
                  style={{ width: `${Math.min(tokenPercent, 100)}%` }}
                />
              </div>
              <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 tabular-nums w-7 text-right">
                {tokenPercent}%
              </span>
            </div>

            {/* Copy button (only when summary exists) */}
            {summary && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy();
                }}
                className="p-1 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-white/[0.06] transition-colors"
                title="Copy context summary"
              >
                {copied ? (
                  <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            )}

            {/* Chevron */}
            <svg
              className={`w-3.5 h-3.5 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${
                expanded ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {/* Expanded content */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="overflow-hidden"
            >
              <div className="px-3.5 pb-3.5 space-y-3">
                {/* Token usage section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">Context window usage</span>
                    <span className={`text-[11px] font-medium tabular-nums ${
                      statusColor === "red" ? "text-red-600 dark:text-red-400" :
                      statusColor === "amber" ? "text-amber-600 dark:text-amber-400" :
                      "text-gray-600 dark:text-gray-300"
                    }`}>
                      {tokenPercent}% used
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${barFill}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(tokenPercent, 100)}%` }}
                      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">
                    <span>{meta.estimatedInputTokens.toLocaleString()} tokens used</span>
                    <span>{meta.tokenBudget.toLocaleString()} budget</span>
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex gap-3">
                  <div className="flex-1 px-3 py-2 rounded-lg bg-white/60 dark:bg-white/[0.02] border border-gray-200/40 dark:border-white/[0.04]">
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 block">Messages in context</span>
                    <span className="text-[13px] font-medium text-gray-700 dark:text-gray-300 tabular-nums">
                      {meta.messagesInContext} <span className="text-gray-400 dark:text-gray-500 font-normal">/ {meta.totalMessages}</span>
                    </span>
                  </div>
                  <div className="flex-1 px-3 py-2 rounded-lg bg-white/60 dark:bg-white/[0.02] border border-gray-200/40 dark:border-white/[0.04]">
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 block">Until compaction</span>
                    <span className={`text-[13px] font-medium tabular-nums ${
                      remaining <= 15 ? "text-red-600 dark:text-red-400" :
                      remaining <= 40 ? "text-amber-600 dark:text-amber-400" :
                      "text-gray-700 dark:text-gray-300"
                    }`}>
                      {remaining}% <span className="text-gray-400 dark:text-gray-500 font-normal">remaining</span>
                    </span>
                  </div>
                </div>

                {/* Summary section (only when compaction has happened) */}
                {summary && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <span className="text-[11px] font-medium text-amber-800 dark:text-amber-300">
                        AI Memory — {summarizedCount} message{summarizedCount !== 1 ? "s" : ""} compacted
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 italic">
                      This is what the AI remembers from earlier messages that were compacted to save space
                    </p>
                    <div className="text-xs leading-relaxed text-gray-700 dark:text-gray-300 bg-white/60 dark:bg-white/[0.02] rounded-lg px-3 py-2.5 border border-gray-200/50 dark:border-white/[0.04] whitespace-pre-wrap max-h-48 overflow-y-auto custom-scrollbar">
                      {summary}
                    </div>
                  </div>
                )}

                {/* No summary yet — explain what will happen */}
                {!summary && (
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 italic leading-relaxed">
                    When the context window fills up, older messages will be compacted into an AI-generated summary. You&apos;ll see the summary here.
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
