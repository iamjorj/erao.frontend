"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Conversation, ContextMetadata } from "@/lib/api";

interface ContextStatusChipProps {
  contextMetadata: ContextMetadata | null;
  conversation: Conversation | null;
  onUpdateCustomInstructions: (instructions: string) => void;
}

export function ContextStatusChip({
  contextMetadata,
  conversation,
  onUpdateCustomInstructions,
}: ContextStatusChipProps) {
  const [open, setOpen] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [saved, setSaved] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLButtonElement>(null);
  const [prevConvKey, setPrevConvKey] = useState<string>("");

  // Sync instructions from props (setState during render — React-approved pattern)
  const convCI = conversation?.customInstructions || "";
  const convKey = `${conversation?.id ?? ""}::${convCI}`;
  if (prevConvKey !== convKey) {
    setPrevConvKey(convKey);
    setInstructions(convCI);
    setSaved(false);
  }

  const meta = contextMetadata;
  const tokenPercent = meta
    ? Math.round((meta.estimatedInputTokens / meta.tokenBudget) * 100)
    : null;

  const statusColor =
    tokenPercent !== null && tokenPercent > 85
      ? "red"
      : tokenPercent !== null && tokenPercent > 60
      ? "amber"
      : "emerald";
  const barFill = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
  }[statusColor];
  const percentText = {
    emerald: "text-gray-600 dark:text-gray-300",
    amber: "text-amber-600 dark:text-amber-400",
    red: "text-red-600 dark:text-red-400",
  }[statusColor];

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        chipRef.current &&
        !chipRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSave = useCallback(() => {
    onUpdateCustomInstructions(instructions);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [instructions, onUpdateCustomInstructions]);

  const hasInstructions = !!(
    conversation?.customInstructions &&
    conversation.customInstructions.trim()
  );

  const summary = conversation?.contextSummary || meta?.contextSummary || null;
  const summarizedCount = conversation?.summarizedMessageCount || meta?.summarizedMessageCount || 0;

  return (
    <div className="relative">
      {/* Chip */}
      <button
        ref={chipRef}
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all text-xs cursor-pointer ${
          open
            ? "border-gray-300 dark:border-white/[0.14] bg-gray-100 dark:bg-white/[0.06]"
            : "border-gray-200/60 dark:border-white/[0.06] hover:bg-gray-50 dark:hover:bg-white/[0.04] hover:border-gray-300 dark:hover:border-white/[0.1]"
        }`}
      >
        {/* Settings/sliders icon */}
        <svg className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
        </svg>

        {/* Token percentage (only when metadata exists) */}
        {tokenPercent !== null && (
          <>
            <span className={`font-medium tabular-nums ${percentText}`}>
              {tokenPercent}%
            </span>
            <div className="hidden sm:block w-8 h-1.5 rounded-full overflow-hidden bg-gray-200/80 dark:bg-white/[0.08]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barFill}`}
                style={{ width: `${Math.min(tokenPercent, 100)}%` }}
              />
            </div>
          </>
        )}

        {/* Indicators */}
        {hasInstructions && (
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
        )}
        {meta?.usingSummary && (
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
        )}

        <svg className={`w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Popover */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 sm:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.div
              ref={popoverRef}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
              className="fixed sm:absolute right-3 sm:right-0 top-14 sm:top-full sm:mt-2 w-[calc(100%-24px)] sm:w-80 bg-white dark:bg-[#111113] border border-gray-200/80 dark:border-white/[0.08] rounded-2xl shadow-xl shadow-black/[0.06] dark:shadow-black/40 z-50 overflow-hidden max-h-[70vh] overflow-y-auto custom-scrollbar"
            >
              {/* Context Window Section (only when metadata exists) */}
              {meta && tokenPercent !== null && (
                <>
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                        </svg>
                      </div>
                      <span className="text-[12px] font-medium text-gray-700 dark:text-gray-300">Context Window</span>
                      <span className={`ml-auto text-xs font-semibold tabular-nums ${percentText}`}>
                        {tokenPercent}%
                      </span>
                    </div>

                    <div className="w-full h-2 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${barFill}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(tokenPercent, 100)}%` }}
                        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                      />
                    </div>

                    <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">
                      <span>{meta.estimatedInputTokens.toLocaleString()} used</span>
                      <span>{meta.tokenBudget.toLocaleString()} budget</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-500 dark:text-gray-400">Messages in context</span>
                      <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 tabular-nums">
                        {meta.messagesInContext}
                        <span className="text-gray-400 dark:text-gray-500 font-normal"> / {meta.totalMessages}</span>
                      </span>
                    </div>

                    {/* Compaction info */}
                    {meta.usingSummary && (
                      <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-amber-50/60 dark:bg-amber-500/[0.04] border border-amber-200/40 dark:border-amber-500/[0.08]">
                        <svg className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        <span className="text-[11px] text-amber-700 dark:text-amber-300">
                          {meta.summarizedMessages} messages compacted
                        </span>
                      </div>
                    )}

                    {/* Summary text (when compaction has happened) */}
                    {summary && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400">AI Memory</span>
                        <div className="text-[11px] leading-relaxed text-gray-600 dark:text-gray-400 bg-gray-50/80 dark:bg-white/[0.02] rounded-lg px-3 py-2 border border-gray-200/40 dark:border-white/[0.04] whitespace-pre-wrap max-h-32 overflow-y-auto custom-scrollbar">
                          {summary}
                        </div>
                        <p className="text-[9px] text-gray-400 dark:text-gray-500 italic">
                          {summarizedCount} older message{summarizedCount !== 1 ? "s" : ""} summarized to save context space
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="h-px bg-gray-100 dark:bg-white/[0.06]" />
                </>
              )}

              {/* Custom Instructions Section */}
              <div className="p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                    </svg>
                  </div>
                  <span className="text-[12px] font-medium text-gray-700 dark:text-gray-300">Custom Instructions</span>
                  {hasInstructions && (
                    <span className="ml-auto text-[10px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded">Active</span>
                  )}
                </div>
                <textarea
                  value={instructions}
                  onChange={(e) => {
                    if (e.target.value.length <= 2000) {
                      setInstructions(e.target.value);
                      setSaved(false);
                    }
                  }}
                  placeholder="e.g. Always show SQL queries, use metric units, explain like I'm a beginner..."
                  rows={3}
                  disabled={!conversation}
                  className="w-full px-3 py-2.5 text-xs leading-relaxed text-gray-900 dark:text-white bg-gray-50/80 dark:bg-white/[0.03] border border-gray-200/60 dark:border-white/[0.06] rounded-xl resize-none outline-none focus:border-gray-300 dark:focus:border-white/[0.14] focus:ring-2 focus:ring-gray-900/[0.04] dark:focus:ring-white/[0.04] transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 disabled:opacity-40"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">
                    {instructions.length} / 2,000
                  </span>
                  <div className="flex items-center gap-2">
                    <AnimatePresence>
                      {saved && (
                        <motion.span
                          initial={{ opacity: 0, x: 4 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 4 }}
                          className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400"
                        >
                          Saved
                        </motion.span>
                      )}
                    </AnimatePresence>
                    <button
                      onClick={handleSave}
                      disabled={
                        !conversation ||
                        instructions === (conversation?.customInstructions || "")
                      }
                      className="px-3 py-1.5 text-[11px] font-medium rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
