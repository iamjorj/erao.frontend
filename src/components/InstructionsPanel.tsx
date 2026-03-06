"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { User, Conversation } from "@/lib/api";

interface InstructionsPanelProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
  conversation: Conversation | null;
  onUpdateGlobalInstructions: (instructions: string) => void;
  onUpdateChatInstructions: (instructions: string) => void;
}

export function InstructionsPanel({
  open,
  onClose,
  user,
  conversation,
  onUpdateGlobalInstructions,
  onUpdateChatInstructions,
}: InstructionsPanelProps) {
  const [globalValue, setGlobalValue] = useState("");
  const [chatValue, setChatValue] = useState("");
  const [globalSaved, setGlobalSaved] = useState(false);
  const [chatSaved, setChatSaved] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const globalDirty = globalValue !== (user?.globalCustomInstructions || "");
  const chatDirty = chatValue !== (conversation?.customInstructions || "");

  // Sync values when user/conversation changes
  useEffect(() => {
    setGlobalValue(user?.globalCustomInstructions || "");
    setGlobalSaved(false);
  }, [user?.globalCustomInstructions]);

  useEffect(() => {
    setChatValue(conversation?.customInstructions || "");
    setChatSaved(false);
  }, [conversation?.id, conversation?.customInstructions]);

  // Close on escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleSaveGlobal = useCallback(() => {
    onUpdateGlobalInstructions(globalValue);
    setGlobalSaved(true);
    setTimeout(() => setGlobalSaved(false), 2000);
  }, [globalValue, onUpdateGlobalInstructions]);

  const handleSaveChat = useCallback(() => {
    onUpdateChatInstructions(chatValue);
    setChatSaved(true);
    setTimeout(() => setChatSaved(false), 2000);
  }, [chatValue, onUpdateChatInstructions]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/20 dark:bg-black/40"
            onClick={onClose}
          />

          {/* Panel — slides in from left */}
          <motion.div
            ref={panelRef}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0.05 }}
            className="fixed left-0 top-0 bottom-0 z-50 w-full sm:w-[420px] bg-white dark:bg-[#111114] border-r border-gray-200/60 dark:border-white/[0.06] shadow-2xl dark:shadow-black/50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-white/[0.05]">
              <div>
                <h2 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">
                  Custom Instructions
                </h2>
                <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-0.5">
                  Guide how the AI responds
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 -mr-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
              >
                <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {/* Global Instructions */}
              <div className="px-6 pt-6 pb-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                    </svg>
                    <span className="text-[13px] font-medium text-gray-700 dark:text-gray-300">All chats</span>
                  </div>
                  <AnimatePresence>
                    {globalSaved && (
                      <motion.span
                        initial={{ opacity: 0, x: 4 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-[11px] text-gray-500 dark:text-gray-400"
                      >
                        Saved
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                <textarea
                  value={globalValue}
                  onChange={(e) => {
                    if (e.target.value.length <= 2000) {
                      setGlobalValue(e.target.value);
                      setGlobalSaved(false);
                    }
                  }}
                  placeholder="Instructions that apply to every conversation..."
                  rows={5}
                  className="w-full px-4 py-3 text-[13px] leading-relaxed text-gray-900 dark:text-gray-100 bg-gray-50/60 dark:bg-white/[0.02] border border-gray-200/60 dark:border-white/[0.06] rounded-xl resize-none outline-none focus:border-gray-300 dark:focus:border-white/[0.1] focus:ring-2 focus:ring-gray-900/[0.03] dark:focus:ring-white/[0.03] transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
                <div className="flex items-center justify-between mt-2.5">
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 tabular-nums">
                    {globalValue.length} / 2,000
                  </span>
                  <button
                    onClick={handleSaveGlobal}
                    disabled={!globalDirty}
                    className="px-4 py-1.5 text-[11px] font-medium rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-15 disabled:cursor-not-allowed transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div className="mx-6 border-t border-gray-100 dark:border-white/[0.05]" />

              {/* Per-Chat Instructions */}
              <div className="px-6 pt-5 pb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                    </svg>
                    <span className="text-[13px] font-medium text-gray-700 dark:text-gray-300">This chat only</span>
                  </div>
                  <AnimatePresence>
                    {chatSaved && (
                      <motion.span
                        initial={{ opacity: 0, x: 4 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-[11px] text-gray-500 dark:text-gray-400"
                      >
                        Saved
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                {conversation ? (
                  <>
                    <textarea
                      value={chatValue}
                      onChange={(e) => {
                        if (e.target.value.length <= 2000) {
                          setChatValue(e.target.value);
                          setChatSaved(false);
                        }
                      }}
                      placeholder="Additional instructions for this conversation only..."
                      rows={4}
                      className="w-full px-4 py-3 text-[13px] leading-relaxed text-gray-900 dark:text-gray-100 bg-gray-50/60 dark:bg-white/[0.02] border border-gray-200/60 dark:border-white/[0.06] rounded-xl resize-none outline-none focus:border-gray-300 dark:focus:border-white/[0.1] focus:ring-2 focus:ring-gray-900/[0.03] dark:focus:ring-white/[0.03] transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    />
                    <div className="flex items-center justify-between mt-2.5">
                      <span className="text-[11px] text-gray-400 dark:text-gray-500 tabular-nums">
                        {chatValue.length} / 2,000
                      </span>
                      <button
                        onClick={handleSaveChat}
                        disabled={!chatDirty}
                        className="px-4 py-1.5 text-[11px] font-medium rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-15 disabled:cursor-not-allowed transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="px-4 py-4 text-[13px] text-gray-400 dark:text-gray-500 bg-gray-50/40 dark:bg-white/[0.015] rounded-xl border border-dashed border-gray-200/60 dark:border-white/[0.05]">
                    Select a data source to add chat-specific instructions
                  </div>
                )}
              </div>
            </div>

            {/* Footer hint */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-white/[0.05]">
              <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed">
                Global instructions are combined with chat-specific ones and sent with every message.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
