"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Conversation } from "@/lib/api";

interface CustomInstructionsChipProps {
  conversation: Conversation | null;
  onUpdateCustomInstructions: (instructions: string) => void;
}

export function CustomInstructionsChip({ conversation, onUpdateCustomInstructions }: CustomInstructionsChipProps) {
  const [open, setOpen] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [saved, setSaved] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLButtonElement>(null);

  const hasInstructions = !!(conversation?.customInstructions && conversation.customInstructions.trim());
  const isDirty = instructions !== (conversation?.customInstructions || "");

  useEffect(() => {
    setInstructions(conversation?.customInstructions || "");
    setSaved(false);
  }, [conversation?.id, conversation?.customInstructions]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node) && chipRef.current && !chipRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onClick); };
  }, [open]);

  const handleSave = useCallback(() => {
    onUpdateCustomInstructions(instructions);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [instructions, onUpdateCustomInstructions]);

  return (
    <div className="relative">
      <button
        ref={chipRef}
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 p-1.5 rounded-lg transition-all cursor-pointer ${
          open
            ? "bg-white/80 dark:bg-white/[0.06] shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.08]"
            : "hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
        }`}
        title="Custom Instructions"
      >
        <div className="relative">
          {/* Sparkle/wand icon — represents AI behavior customization */}
          <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
          </svg>
          {hasInstructions && (
            <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-violet-500 dark:bg-violet-400" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 sm:hidden" onClick={() => setOpen(false)} />
            <motion.div
              ref={popoverRef}
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ type: "spring", duration: 0.25, bounce: 0.1 }}
              className="fixed sm:absolute right-3 sm:right-0 top-14 sm:top-full sm:mt-2.5 w-[calc(100%-24px)] sm:w-[360px] bg-white dark:bg-[#131316] border border-gray-200/60 dark:border-white/[0.07] rounded-2xl shadow-2xl shadow-black/[0.08] dark:shadow-black/50 z-50 overflow-hidden"
            >
              <div className="p-5 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-500/[0.06] flex items-center justify-center">
                      <svg className="w-4 h-4 text-violet-500 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 block leading-tight">Custom Instructions</span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">Guide AI responses for this chat</span>
                    </div>
                  </div>
                  {hasInstructions && (
                    <span className="text-[10px] text-violet-600 dark:text-violet-400 font-medium bg-violet-50 dark:bg-violet-500/[0.08] px-2 py-0.5 rounded-md">Active</span>
                  )}
                </div>

                {/* Example hints — show when empty */}
                {!hasInstructions && !instructions.trim() && (
                  <div className="flex flex-wrap gap-1.5">
                    {["Always show SQL", "Explain simply", "Use metric units", "Be concise"].map((hint) => (
                      <button
                        key={hint}
                        onClick={() => {
                          setInstructions(prev => prev ? `${prev}, ${hint.toLowerCase()}` : hint);
                          setSaved(false);
                        }}
                        className="text-[10px] px-2 py-1 rounded-md bg-gray-50 dark:bg-white/[0.025] border border-gray-100 dark:border-white/[0.04] text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.04] hover:text-gray-700 dark:hover:text-gray-300 transition-colors cursor-pointer"
                      >
                        {hint}
                      </button>
                    ))}
                  </div>
                )}

                {/* Textarea */}
                <textarea
                  value={instructions}
                  onChange={(e) => {
                    if (e.target.value.length <= 2000) {
                      setInstructions(e.target.value);
                      setSaved(false);
                    }
                  }}
                  placeholder="Tell the AI how to respond..."
                  rows={4}
                  disabled={!conversation}
                  className="w-full px-3.5 py-3 text-[12px] leading-relaxed text-gray-900 dark:text-gray-100 bg-gray-50/60 dark:bg-white/[0.02] border border-gray-200/50 dark:border-white/[0.05] rounded-xl resize-none outline-none focus:border-violet-300/50 dark:focus:border-violet-500/15 focus:ring-2 focus:ring-violet-500/[0.05] dark:focus:ring-violet-500/[0.05] transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 disabled:opacity-40"
                />

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">
                    {instructions.length} / 2,000
                  </span>
                  <div className="flex items-center gap-2.5">
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
                      disabled={!conversation || !isDirty}
                      className="px-4 py-1.5 text-[11px] font-medium rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-15 disabled:cursor-not-allowed transition-colors"
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
