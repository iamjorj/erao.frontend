"use client";

import React, { useState } from "react";

interface MarkdownResponseProps {
  content: string;
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-gray-200/60 dark:border-white/[0.06] shadow-sm shadow-black/[0.02] dark:shadow-none">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50/80 dark:bg-white/[0.03] border-b border-gray-200/60 dark:border-white/[0.06]">
        <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">SQL</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto bg-white dark:bg-white/[0.02] text-[12px] leading-relaxed">
        <code className="text-gray-700 dark:text-gray-300 font-mono whitespace-pre">{code}</code>
      </pre>
    </div>
  );
}

export function MarkdownResponse({ content }: MarkdownResponseProps) {
  const parseContent = (text: string) => {
    // First, split content by ```text blocks
    const parts = text.split(/(```text[\s\S]*?```)/gi);
    const allElements: React.ReactNode[] = [];

    parts.forEach((part, partIdx) => {
      // Check if this is a ```text block
      const textBlockMatch = part.match(/^```text\n?([\s\S]*?)```$/i);
      if (textBlockMatch) {
        allElements.push(
          <CodeBlock key={`codeblock-${partIdx}`} code={textBlockMatch[1].trim()} />
        );
        return;
      }

      // Regular text — parse as markdown
      const elements = parseMarkdown(part, partIdx);
      allElements.push(...elements);
    });

    return allElements;
  };

  const parseMarkdown = (text: string, partIdx: number) => {
    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];
    let currentList: string[] = [];
    let listKey = 0;

    const flushList = () => {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`list-${listKey++}`} className="space-y-1.5 my-3 ml-4">
            {currentList.map((item, idx) => (
              <li key={idx} className="flex gap-2.5 text-sm">
                <span className="text-gray-400 dark:text-gray-500 mt-2 flex-shrink-0">
                  <span className="block w-1 h-1 bg-current rounded-full"></span>
                </span>
                <span className="text-gray-600 dark:text-gray-400 leading-relaxed">{renderInlineStyles(item)}</span>
              </li>
            ))}
          </ul>
        );
        currentList = [];
      }
    };

    // Render inline styles (bold, code, stats)
    const renderInlineStyles = (text: string): React.ReactNode => {
      // First handle code blocks with backticks
      const processedParts: React.ReactNode[] = [];
      const codeSplit = text.split(/(`[^`]+`)/g);

      codeSplit.forEach((segment, segIdx) => {
        if (segment.startsWith("`") && segment.endsWith("`")) {
          // Inline code
          processedParts.push(
            <code key={`code-${segIdx}`} className="px-1.5 py-0.5 bg-gray-100/80 dark:bg-white/[0.06] text-gray-800 dark:text-gray-200 rounded-md text-xs font-mono">
              {segment.slice(1, -1)}
            </code>
          );
        } else {
          // Process bold and stats
          const boldParts = segment.split(/(\*\*[^*]+\*\*)/g);
          boldParts.forEach((part, partIdx) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              const boldText = part.slice(2, -2);
              processedParts.push(
                <span key={`bold-${segIdx}-${partIdx}`} className="font-semibold text-gray-900 dark:text-white">
                  {boldText}
                </span>
              );
            } else {
              // Highlight statistics (percentages, money, specific patterns)
              const statPattern = /(\d+\.?\d*%|\$[\d,]+\.?\d*[KMB]?|\d+\.?\d*\s*(?:hours?|minutes?|days?|out of \d+|\/\d+)|\bCGPA\s*\d+\.?\d*|\d+\.?\d*\s*CGPA)/gi;
              const statParts = part.split(statPattern);

              statParts.forEach((statPart, statIdx) => {
                if (statPattern.test(statPart)) {
                  // Reset regex lastIndex
                  statPattern.lastIndex = 0;
                  processedParts.push(
                    <span key={`stat-${segIdx}-${partIdx}-${statIdx}`} className="font-semibold text-gray-900 dark:text-white">
                      {statPart}
                    </span>
                  );
                } else {
                  processedParts.push(statPart);
                }
              });
            }
          });
        }
      });

      return processedParts;
    };

    lines.forEach((line, idx) => {
      const trimmedLine = line.trim();

      if (!trimmedLine) {
        flushList();
        return;
      }

      // Bullet point
      if (trimmedLine.startsWith("- ") || trimmedLine.startsWith("• ")) {
        currentList.push(trimmedLine.slice(2));
        return;
      }

      // Numbered list
      const numberedMatch = trimmedLine.match(/^\d+\.\s+(.+)/);
      if (numberedMatch) {
        currentList.push(numberedMatch[1]);
        return;
      }

      flushList();

      // Main section header (starts and ends with **)
      if (trimmedLine.startsWith("**") && trimmedLine.endsWith("**")) {
        const headerText = trimmedLine.slice(2, -2).replace(/:$/, "");
        elements.push(
          <div key={`${partIdx}-${idx}`} className="mt-4 mb-1.5 first:mt-0">
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {headerText}
            </h3>
          </div>
        );
        return;
      }

      // Header with content (**Header:** content)
      const headerWithContent = trimmedLine.match(/^\*\*([^*]+):\*\*\s*(.*)$/);
      if (headerWithContent) {
        elements.push(
          <div key={`${partIdx}-${idx}`} className="mt-4 mb-1.5 first:mt-0">
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {headerWithContent[1]}
            </h3>
            {headerWithContent[2] && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed">
                {renderInlineStyles(headerWithContent[2])}
              </p>
            )}
          </div>
        );
        return;
      }

      // Horizontal rule
      if (trimmedLine === "---" || trimmedLine === "***") {
        elements.push(
          <div key={`${partIdx}-${idx}`} className="h-px bg-gray-200/60 dark:bg-white/[0.06] my-5"></div>
        );
        return;
      }

      // Regular paragraph
      elements.push(
        <p key={`${partIdx}-${idx}`} className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed my-1.5">
          {renderInlineStyles(trimmedLine)}
        </p>
      );
    });

    flushList();
    return elements;
  };

  return (
    <div className="space-y-0.5 text-[13px] leading-relaxed">
      {parseContent(content)}
    </div>
  );
}
