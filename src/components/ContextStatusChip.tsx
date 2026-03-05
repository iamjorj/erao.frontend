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

  const meta = contextMetadata;
  const tokenPercent = meta
    ? Math.round((meta.estimatedInputTokens / meta.tokenBudget) * 100)
    : 0;

  // Status color — only used for progress bar fill and percentage text
  const statusColor =
    tokenPercent > 85 ? "red" : tokenPercent > 60 ? "amber" : "emerald";
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

  // Sync instructions from conversation
  useEffect(() => {
    setInstructions(conversation?.customInstructions || "");
    setSaved(false);
  }, [conversation?.id, conversation?.customInstructions]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // Close on click outside
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

  if (!meta) return null;

  const hasInstructions = !!(
    conversation?.customInstructions &&
    conversation.customInstructions.trim()
  );

  return (
    <div className="relative">
      {/* Chip — matches sibling header chips (db, file, connector) */}
      <button
        ref={chipRef}
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg border bg-gray-50/80 dark:bg-white/[0.04] hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all text-sm cursor-pointer ${
          open
            ? "border-gray-300 dark:border-white/[0.14]"
            : "border-gray-200/60 dark:border-white/[0.08]"
        }`}
      >
        {/* Context window icon — concentric arcs representing context/memory */}
        <svg className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>

        {/* Percentage */}
        <span className={`text-xs font-medium tabular-nums ${percentText}`}>
          {tokenPercent}%
        </span>

        {/* Mini progress bar (desktop only) */}
        <div className="hidden sm:block w-8 h-1.5 rounded-full overflow-hidden bg-gray-200/80 dark:bg-white/[0.08]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barFill}`}
            style={{ width: `${Math.min(tokenPercent, 100)}%` }}
          />
        </div>

        {/* Summary active indicator */}
        {meta.usingSummary && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
        )}

        {/* Custom instructions indicator (desktop) */}
        {hasInstructions && (
          <svg className="hidden sm:block w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        )}

        {/* Chevron */}
        <svg className="w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Popover */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, scale: 0.97, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4 }}
            transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white dark:bg-[#141416] border border-gray-200/80 dark:border-white/[0.08] rounded-xl shadow-lg shadow-black/[0.08] dark:shadow-black/40 z-50 overflow-hidden"
          >
            {/* Token Usage */}
            <div className="px-4 pt-4 pb-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Context Window
                </span>
                <span className={`text-xs font-semibold tabular-nums ${percentText}`}>
                  {tokenPercent}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${barFill}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(tokenPercent, 100)}%` }}
                  transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
                />
              </div>

              {/* Token counts */}
              <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">
                <span>{meta.estimatedInputTokens.toLocaleString()} used</span>
                <span>{meta.tokenBudget.toLocaleString()} budget</span>
              </div>

              {/* Messages row */}
              <div className="flex items-center justify-between pt-0.5">
                <span className="text-[11px] text-gray-500 dark:text-gray-400">Messages in context</span>
                <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 tabular-nums">
                  {meta.messagesInContext}
                  <span className="text-gray-400 dark:text-gray-500"> / {meta.totalMessages}</span>
                </span>
              </div>
            </div>

            {/* Summary status (conditional) */}
            {meta.usingSummary && (
              <div className="mx-3 mb-3 flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-amber-50/80 dark:bg-amber-500/[0.06] border border-amber-200/50 dark:border-amber-500/[0.08]">
                <div className="w-5 h-5 rounded-md bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-amber-800 dark:text-amber-300">Summary active</p>
                  <p className="text-[10px] text-amber-600/80 dark:text-amber-400/60">{meta.summarizedMessages} older messages compacted</p>
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="h-px bg-gray-100 dark:bg-white/[0.06]" />

            {/* Custom Instructions */}
            <div className="px-4 pt-3.5 pb-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Custom Instructions
                </span>
                {hasInstructions && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Active</span>
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
                className="w-full px-3 py-2.5 text-xs leading-relaxed text-gray-900 dark:text-white bg-gray-50/80 dark:bg-white/[0.03] border border-gray-200/80 dark:border-white/[0.08] rounded-lg resize-none outline-none focus:border-gray-300 dark:focus:border-white/[0.14] focus:ring-2 focus:ring-gray-900/[0.04] dark:focus:ring-white/[0.04] transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 disabled:opacity-40"
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
                    className="px-3 py-1.5 text-[11px] font-medium rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
