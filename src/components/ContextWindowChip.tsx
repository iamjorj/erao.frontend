"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Conversation, ContextMetadata } from "@/lib/api";

interface ContextWindowChipProps {
  contextMetadata: ContextMetadata;
  conversation: Conversation | null;
  onUpdateContextSummary?: (summary: string) => void;
}

export function ContextWindowChip({ contextMetadata, conversation, onUpdateContextSummary }: ContextWindowChipProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [saved, setSaved] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLButtonElement>(null);

  const meta = contextMetadata;
  const tokenPercent = Math.round((meta.estimatedInputTokens / meta.tokenBudget) * 100);
  const displayPercent = Math.min(tokenPercent, 100);
  const remaining = Math.max(100 - tokenPercent, 0);

  const summary = conversation?.contextSummary || meta.contextSummary || null;
  const summarizedCount = conversation?.summarizedMessageCount || meta.summarizedMessageCount || 0;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); setEditing(false); } };
    const onClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node) && chipRef.current && !chipRef.current.contains(e.target as Node)) { setOpen(false); setEditing(false); }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onClick); };
  }, [open]);

  const handleStartEdit = useCallback(() => {
    setEditValue(summary || "");
    setEditing(true);
    setSaved(false);
  }, [summary]);

  const handleSave = useCallback(() => {
    if (onUpdateContextSummary) {
      onUpdateContextSummary(editValue);
    }
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [editValue, onUpdateContextSummary]);

  return (
    <div className="relative">
      {/* Closed chip */}
      <button
        ref={chipRef}
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-2.5 pl-2.5 pr-3 py-1.5 rounded-xl transition-all cursor-pointer ${
          open
            ? "bg-white dark:bg-white/[0.08] shadow-sm ring-1 ring-black/[0.06] dark:ring-white/[0.1]"
            : "bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.06] dark:hover:bg-white/[0.07]"
        }`}
      >
        <div className="relative w-[18px] h-[18px] flex-shrink-0">
          <svg className="w-[18px] h-[18px] -rotate-90" viewBox="0 0 18 18">
            <circle cx="9" cy="9" r="7" fill="none" stroke="currentColor" strokeWidth="2"
              className="text-black/[0.07] dark:text-white/[0.07]" />
            <circle cx="9" cy="9" r="7" fill="none" strokeWidth="2" strokeLinecap="round"
              className="text-gray-800 dark:text-gray-200"
              stroke="currentColor"
              strokeDasharray={`${(displayPercent / 100) * 43.98} 43.98`}
            />
          </svg>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] tabular-nums">
          <span className="font-semibold text-gray-700 dark:text-gray-200">{displayPercent}%</span>
          <span className="text-gray-300 dark:text-gray-600">·</span>
          <span className="text-gray-400 dark:text-gray-500">{remaining}% left</span>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 sm:hidden" onClick={() => { setOpen(false); setEditing(false); }} />
            <motion.div
              ref={popoverRef}
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ type: "spring", duration: 0.25, bounce: 0.1 }}
              className="fixed sm:absolute right-3 sm:right-0 bottom-14 sm:bottom-full sm:mb-3 w-[calc(100%-24px)] sm:w-[400px] bg-white dark:bg-[#151518] border border-gray-200/70 dark:border-white/[0.08] rounded-2xl shadow-2xl shadow-black/[0.1] dark:shadow-black/60 z-50 overflow-hidden"
            >
              <div className="p-6">
                {/* Title */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">Context Window</h3>
                  <button onClick={() => { setOpen(false); setEditing(false); }} className="p-1 -mr-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors">
                    <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Large percentage */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums tracking-tight">{displayPercent}%</span>
                    <span className="text-sm text-gray-400 dark:text-gray-500">used</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gray-900 dark:bg-white"
                      initial={{ width: 0 }}
                      animate={{ width: `${displayPercent}%` }}
                      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs tabular-nums text-gray-400 dark:text-gray-500">
                    <span>{meta.estimatedInputTokens.toLocaleString()} tokens</span>
                    <span>{meta.tokenBudget.toLocaleString()} limit</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-px bg-gray-100 dark:bg-white/[0.06] rounded-xl overflow-hidden mb-6">
                  <div className="bg-white dark:bg-[#151518] px-4 py-3.5 text-center">
                    <span className="text-lg font-semibold text-gray-900 dark:text-white tabular-nums block">{meta.messagesInContext}</span>
                    <span className="text-[11px] text-gray-400 dark:text-gray-500">in context</span>
                  </div>
                  <div className="bg-white dark:bg-[#151518] px-4 py-3.5 text-center">
                    <span className="text-lg font-semibold text-gray-900 dark:text-white tabular-nums block">{meta.totalMessages}</span>
                    <span className="text-[11px] text-gray-400 dark:text-gray-500">total</span>
                  </div>
                  <div className="bg-white dark:bg-[#151518] px-4 py-3.5 text-center">
                    <span className="text-lg font-semibold text-gray-900 dark:text-white tabular-nums block">{remaining}%</span>
                    <span className="text-[11px] text-gray-400 dark:text-gray-500">remaining</span>
                  </div>
                </div>

                {/* Memory section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Memory</span>
                      {meta.usingSummary && (
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">{meta.summarizedMessages} compacted</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <AnimatePresence>
                        {saved && (
                          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[11px] text-gray-500 dark:text-gray-400">
                            Saved
                          </motion.span>
                        )}
                      </AnimatePresence>
                      {summary && !editing && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(summary);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 1500);
                          }}
                          className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        >
                          {copied ? (
                            <>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                              Copied
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" /></svg>
                              Copy
                            </>
                          )}
                        </button>
                      )}
                      {!editing ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleStartEdit(); }}
                          className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
                          Edit
                        </button>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditing(false); }}
                          className="text-[11px] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>

                  {editing ? (
                    <div className="space-y-2.5">
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        placeholder="Add context for the AI to remember across this conversation..."
                        rows={5}
                        className="w-full px-4 py-3 text-[13px] leading-relaxed text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-white/[0.025] border border-gray-200 dark:border-white/[0.06] rounded-xl resize-none outline-none focus:border-gray-300 dark:focus:border-white/[0.12] focus:ring-2 focus:ring-gray-900/[0.04] dark:focus:ring-white/[0.04] transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        autoFocus
                      />
                      <div className="flex justify-end">
                        <button
                          onClick={handleSave}
                          className="px-4 py-1.5 text-[11px] font-medium rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : summary ? (
                    <div className="text-[13px] leading-relaxed text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-white/[0.025] rounded-xl px-4 py-3.5 border border-gray-100 dark:border-white/[0.05] whitespace-pre-wrap max-h-48 overflow-y-auto custom-scrollbar">
                      {summary}
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleStartEdit(); }}
                      className="w-full text-left text-[13px] text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-white/[0.025] rounded-xl px-4 py-3.5 border border-dashed border-gray-200 dark:border-white/[0.06] hover:border-gray-300 dark:hover:border-white/[0.1] hover:text-gray-500 dark:hover:text-gray-400 transition-colors cursor-pointer"
                    >
                      Add context for the AI to remember...
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
