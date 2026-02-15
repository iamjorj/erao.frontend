"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar, Footer } from "@/components/shared";
import { auth } from "@/lib/api";

function ContactSalesButton({ variant = "outline" }: { variant?: "outline" | "filled" }) {
  return (
    <Link
      href="/contact"
      className={`block w-full py-3 text-center rounded-xl text-sm font-medium transition-colors ${
        variant === "filled"
          ? "bg-black text-white hover:bg-gray-800"
          : "border border-gray-300 hover:bg-gray-50"
      }`}
    >
      Contact Sales
    </Link>
  );
}

const demoData = [
  { name: "Acme Corp", revenue: 42500 },
  { name: "TechStart Inc", revenue: 38200 },
  { name: "DataFlow Labs", revenue: 31800 },
  { name: "CloudNine", revenue: 28400 },
  { name: "Quantum", revenue: 24100 },
];

const maxRevenue = Math.max(...demoData.map(d => d.revenue));

const supportedDatabases = [
  { name: "PostgreSQL", logo: "/db-logos/postgresql.png" },
  { name: "MySQL", logo: "/db-logos/mysql.png" },
  { name: "MongoDB", logo: "/db-logos/mongodb.png" },
  { name: "SQL Server", logo: "/db-logos/sql-server.png" },
  { name: "Oracle", logo: "/db-logos/oracle.png" },
  { name: "SQLite", logo: "/db-logos/sqlite.webp" },
  { name: "MariaDB", logo: "/db-logos/mariadb.png" },
  { name: "CockroachDB", logo: "/db-logos/cockroachdb.png" },
  { name: "Redshift", logo: "/db-logos/redshift.png" },
  { name: "ClickHouse", logo: "/db-logos/clickhouse.png" },
  { name: "Firebird", logo: "/db-logos/firebird.png" },
  { name: "DuckDB", logo: "/db-logos/duckdb.png" },
  { name: "TimescaleDB", logo: "/db-logos/timescaledb.png" },
  { name: "YugabyteDB", logo: "/db-logos/yugabytedb.png" },
  { name: "Snowflake", logo: "/db-logos/snowflake.png" },
];

function DemoPreview() {
  const [activeTab, setActiveTab] = useState<"bar" | "line" | "pie" | "table">("bar");

  return (
    <div className="bg-gradient-to-b from-gray-100 to-gray-50 rounded-xl sm:rounded-2xl p-1.5 sm:p-2 md:p-3 shadow-2xl shadow-gray-200/50">
      <div className="bg-white rounded-lg sm:rounded-xl overflow-hidden border border-gray-200">
        {/* Window chrome */}
        <div className="bg-gray-50 border-b border-gray-200 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#FF5F57]" />
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#FFBD2E]" />
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#28C840]" />
          </div>
          <div className="flex items-center gap-2 ml-1">
            <span className="text-xs sm:text-sm text-gray-500">production_db</span>
          </div>
        </div>

        <div className="p-3 sm:p-5 md:p-6 space-y-4">
          {/* User message */}
          <div className="flex justify-end">
            <div className="bg-gray-900 text-white px-4 py-2.5 rounded-2xl rounded-br-md max-w-[85%] sm:max-w-md">
              <p className="text-xs sm:text-sm">Show me our top 5 customers by revenue this quarter</p>
            </div>
          </div>

          {/* AI response */}
          <div className="flex justify-start">
            <div className="w-full max-w-full sm:max-w-[90%]">
              {/* Chart type tabs */}
              <div className="flex items-center gap-1 mb-3 bg-gray-100 rounded-lg p-1 w-fit">
                {(["bar", "line", "pie", "table"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      activeTab === tab
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {tab === "bar" && (
                      <span className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        Bar
                      </span>
                    )}
                    {tab === "line" && (
                      <span className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4v16" /></svg>
                        Line
                      </span>
                    )}
                    {tab === "pie" && (
                      <span className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
                        Pie
                      </span>
                    )}
                    {tab === "table" && (
                      <span className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        Table
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Chart / Table content */}
              <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                {activeTab === "table" ? (
                  <table className="w-full text-xs sm:text-sm">
                    <thead className="bg-gray-100/80">
                      <tr>
                        <th className="text-left px-3 sm:px-4 py-2.5 text-gray-500 font-medium text-xs uppercase tracking-wider">#</th>
                        <th className="text-left px-3 sm:px-4 py-2.5 text-gray-500 font-medium text-xs uppercase tracking-wider">Customer</th>
                        <th className="text-right px-3 sm:px-4 py-2.5 text-gray-500 font-medium text-xs uppercase tracking-wider">Revenue</th>
                        <th className="text-right px-3 sm:px-4 py-2.5 text-gray-500 font-medium text-xs uppercase tracking-wider hidden sm:table-cell">Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {demoData.map((row, i) => (
                        <tr key={row.name} className="hover:bg-gray-50/50">
                          <td className="px-3 sm:px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                          <td className="px-3 sm:px-4 py-2.5 font-medium text-gray-900">{row.name}</td>
                          <td className="text-right px-3 sm:px-4 py-2.5 font-semibold text-gray-900">${row.revenue.toLocaleString()}</td>
                          <td className="text-right px-3 sm:px-4 py-2.5 text-gray-500 hidden sm:table-cell">{(row.revenue / demoData.reduce((s, d) => s + d.revenue, 0) * 100).toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : activeTab === "bar" ? (
                  <div className="p-4 sm:p-5">
                    <div className="space-y-3">
                      {demoData.map((row) => (
                        <div key={row.name} className="flex items-center gap-3">
                          <span className="text-xs sm:text-sm text-gray-600 w-20 sm:w-28 text-right truncate flex-shrink-0">{row.name}</span>
                          <div className="flex-1 h-8 sm:h-9 bg-gray-100 rounded-md overflow-hidden relative">
                            <div
                              className="h-full bg-gray-900 rounded-md transition-all duration-700"
                              style={{ width: `${(row.revenue / maxRevenue) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs sm:text-sm font-semibold text-gray-900 w-16 sm:w-20 text-right flex-shrink-0">${(row.revenue / 1000).toFixed(1)}k</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : activeTab === "line" ? (
                  <div className="p-4 sm:p-5">
                    <svg viewBox="0 0 400 180" className="w-full h-auto">
                      {/* Grid lines */}
                      {[0, 1, 2, 3, 4].map((i) => (
                        <line key={i} x1="50" y1={20 + i * 35} x2="380" y2={20 + i * 35} stroke="#f0f0f0" strokeWidth="1" />
                      ))}
                      {/* Y-axis labels */}
                      <text x="45" y="25" textAnchor="end" className="text-[10px]" fill="#9ca3af">$45k</text>
                      <text x="45" y="60" textAnchor="end" className="text-[10px]" fill="#9ca3af">$35k</text>
                      <text x="45" y="95" textAnchor="end" className="text-[10px]" fill="#9ca3af">$25k</text>
                      <text x="45" y="130" textAnchor="end" className="text-[10px]" fill="#9ca3af">$15k</text>
                      {/* Line */}
                      <polyline
                        fill="none"
                        stroke="#111"
                        strokeWidth="2.5"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        points={demoData.map((d, i) => {
                          const x = 75 + i * 75;
                          const y = 160 - ((d.revenue - 15000) / 30000) * 140;
                          return `${x},${y}`;
                        }).join(" ")}
                      />
                      {/* Dots + labels */}
                      {demoData.map((d, i) => {
                        const x = 75 + i * 75;
                        const y = 160 - ((d.revenue - 15000) / 30000) * 140;
                        return (
                          <g key={d.name}>
                            <circle cx={x} cy={y} r="4" fill="#111" />
                            <circle cx={x} cy={y} r="2" fill="white" />
                            <text x={x} y="175" textAnchor="middle" className="text-[9px]" fill="#9ca3af">{d.name.split(" ")[0]}</text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                ) : (
                  /* Pie chart */
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                    <svg viewBox="0 0 200 200" className="w-36 h-36 sm:w-44 sm:h-44 flex-shrink-0">
                      {(() => {
                        const total = demoData.reduce((s, d) => s + d.revenue, 0);
                        const colors = ["#111827", "#374151", "#6b7280", "#9ca3af", "#d1d5db"];
                        let cumAngle = 0;
                        return demoData.map((d, i) => {
                          const angle = (d.revenue / total) * 360;
                          const startAngle = cumAngle;
                          cumAngle += angle;
                          const startRad = (startAngle - 90) * Math.PI / 180;
                          const endRad = (cumAngle - 90) * Math.PI / 180;
                          const largeArc = angle > 180 ? 1 : 0;
                          const x1 = 100 + 85 * Math.cos(startRad);
                          const y1 = 100 + 85 * Math.sin(startRad);
                          const x2 = 100 + 85 * Math.cos(endRad);
                          const y2 = 100 + 85 * Math.sin(endRad);
                          return (
                            <path
                              key={d.name}
                              d={`M100,100 L${x1},${y1} A85,85 0 ${largeArc},1 ${x2},${y2} Z`}
                              fill={colors[i]}
                            />
                          );
                        });
                      })()}
                      <circle cx="100" cy="100" r="40" fill="white" />
                    </svg>
                    <div className="space-y-2">
                      {demoData.map((d, i) => {
                        const total = demoData.reduce((s, r) => s + r.revenue, 0);
                        const colors = ["bg-gray-900", "bg-gray-700", "bg-gray-500", "bg-gray-400", "bg-gray-300"];
                        return (
                          <div key={d.name} className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full ${colors[i]}`} />
                            <span className="text-xs text-gray-600">{d.name}</span>
                            <span className="text-xs font-medium text-gray-900 ml-auto">{(d.revenue / total * 100).toFixed(0)}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Row count */}
              <div className="flex items-center justify-between mt-2 px-1">
                <span className="text-[10px] sm:text-xs text-gray-400">5 rows returned in 0.12s</span>
                <span className="text-[10px] sm:text-xs text-gray-400">Q1 2026</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    if (auth.isAuthenticated()) {
      router.replace("/ai");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Navigation with dropdowns */}
      <Navbar />

      {/* Hero Section */}
      <section className="w-full max-w-5xl mx-auto px-6 pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="max-w-3xl mx-auto text-center">
          {/* Social proof badge */}
          <div className="inline-flex items-center gap-2 bg-gray-100 rounded-full px-4 py-1.5 mb-6">
            <div className="flex -space-x-2">
              <div className="w-6 h-6 rounded-full bg-gray-900 border-2 border-white" />
              <div className="w-6 h-6 rounded-full bg-gray-700 border-2 border-white" />
              <div className="w-6 h-6 rounded-full bg-gray-500 border-2 border-white" />
            </div>
            <span className="text-sm text-gray-600">Trusted by 500+ data teams</span>
          </div>

          {/* Main headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
            Ask your database anything.
            <span className="text-gray-400"> In plain English.</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-xl mx-auto">
            Connect your database and get instant answers. No SQL required.
            Just ask like you&apos;d ask a colleague.
          </p>

          {/* Primary CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/register"
              className="w-full sm:w-auto bg-black text-white px-8 py-3.5 rounded-xl text-base font-medium hover:bg-gray-800 transition-colors"
            >
              Start Free
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-8 text-xs sm:text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-black flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Free forever
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-black flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              2 min setup
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-black flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Encrypted
            </span>
          </div>
        </div>

        {/* Interactive product demo */}
        <div className="mt-12 sm:mt-16 relative">
          <DemoPreview />
        </div>
      </section>

      {/* Supported Databases */}
      <section className="w-full border-y border-gray-100 bg-gray-50/50 py-12 sm:py-14">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-center text-sm text-gray-500 mb-8">Works with 15+ databases you already use</p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-6 sm:gap-x-10 sm:gap-y-7">
            {supportedDatabases.map((db) => (
              <div key={db.name} className="flex flex-col items-center gap-2 group">
                <div className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-200">
                  <img src={db.logo} alt={db.name} className="w-full h-full object-contain" />
                </div>
                <span className="text-[10px] sm:text-xs text-gray-400 group-hover:text-gray-600 transition-colors">{db.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3 Value Props */}
      <section className="w-full max-w-5xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center md:text-left">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4 mx-auto md:mx-0">
              <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Natural Language</h3>
            <p className="text-gray-600 text-sm">
              Ask questions like &quot;What were sales last week?&quot; and get instant answers. No SQL knowledge needed.
            </p>
          </div>

          <div className="text-center md:text-left">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4 mx-auto md:mx-0">
              <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Instant Answers</h3>
            <p className="text-gray-600 text-sm">
              Get formatted tables, charts, and summaries in seconds. Stop waiting on your data team.
            </p>
          </div>

          <div className="text-center md:text-left">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4 mx-auto md:mx-0">
              <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Enterprise Security</h3>
            <p className="text-gray-600 text-sm">
              Your data never leaves your database. All credentials encrypted with AES-256. SSL/TLS connections.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="w-full bg-gray-50 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Up and running in 2 minutes</h2>
            <p className="text-gray-600">No complex setup. No learning curve.</p>
          </div>

          {/* Step 1 — Connect */}
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-14 mb-16 md:mb-20">
            <div className="w-full md:w-1/2 order-2 md:order-1">
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  <span className="text-xs text-gray-400 ml-2">Add Database</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <span className="text-xs text-gray-400 w-16 shrink-0">Type</span>
                    <div className="flex items-center gap-2">
                      <img src="/db-logos/postgresql.png" alt="" className="w-5 h-5 object-contain" />
                      <span className="text-sm font-medium">PostgreSQL</span>
                      <svg className="w-3.5 h-3.5 text-gray-400 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <span className="text-xs text-gray-400 w-16 shrink-0">Host</span>
                    <span className="text-sm text-gray-600">db.mycompany.com</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <span className="text-xs text-gray-400 w-16 shrink-0">Port</span>
                    <span className="text-sm text-gray-600">5432</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <span className="text-xs text-gray-400 w-16 shrink-0">Database</span>
                    <span className="text-sm text-gray-600">production</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1.5 text-xs text-green-600">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                      Connection verified
                    </div>
                    <div className="bg-black text-white text-xs font-medium px-4 py-2 rounded-lg">Save</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full md:w-1/2 order-1 md:order-2">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-9 h-9 bg-black text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">1</span>
                <h3 className="text-xl font-bold">Connect your database</h3>
              </div>
              <p className="text-gray-600 ml-12">
                Add your connection details — host, port, credentials. We support 15+ databases. Your credentials are encrypted with AES-256.
              </p>
            </div>
          </div>

          {/* Step 2 — Ask */}
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-14 mb-16 md:mb-20">
            <div className="w-full md:w-1/2">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-9 h-9 bg-black text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">2</span>
                <h3 className="text-xl font-bold">Ask, and get data back</h3>
              </div>
              <p className="text-gray-600 ml-12">
                Type your question in plain English. Erao handles everything behind the scenes and returns the data directly — no SQL exposed.
              </p>
            </div>
            <div className="w-full md:w-1/2">
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  <span className="text-xs text-gray-400 ml-2">Chat</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <div className="bg-gray-900 text-white text-sm px-4 py-2.5 rounded-2xl rounded-br-md max-w-[85%]">
                      Who are my top 3 customers this quarter?
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] font-bold text-gray-500">AI</span>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 rounded-2xl rounded-bl-md flex-1">
                      <p className="text-sm text-gray-700 mb-2.5">Here are your top 3 customers by revenue this quarter:</p>
                      <div className="space-y-1.5">
                        {[
                          { rank: 1, name: "Acme Corp", val: "$42.5k" },
                          { rank: 2, name: "TechStart Inc", val: "$38.2k" },
                          { rank: 3, name: "DataFlow Labs", val: "$31.8k" },
                        ].map((r) => (
                          <div key={r.rank} className="flex items-center gap-2.5 bg-white rounded-lg px-3 py-1.5 border border-gray-100">
                            <span className="text-[10px] font-bold text-gray-400 w-4">{r.rank}</span>
                            <span className="text-xs font-medium text-gray-800 flex-1">{r.name}</span>
                            <span className="text-xs font-semibold text-gray-900">{r.val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="border border-gray-100 rounded-xl p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-8 bg-gray-50 rounded-lg flex items-center px-3">
                        <span className="text-xs text-gray-400">Ask about production...</span>
                      </div>
                      <div className="w-7 h-7 bg-black rounded-lg flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14m-7-7l7 7-7 7" /></svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 — Results */}
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-14">
            <div className="w-full md:w-1/2 order-2 md:order-1">
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  <span className="text-xs text-gray-400 ml-2">Results</span>
                </div>
                <div className="flex gap-2 mb-4">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white rounded-lg text-xs font-medium">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6m6 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0h6m6 0v-3a2 2 0 00-2-2h-2a2 2 0 00-2 2v3" /></svg>
                    Chart
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 text-gray-500 rounded-lg text-xs border border-gray-200">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    Table
                  </div>
                  <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-gray-500 rounded-lg text-xs border border-gray-200">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Export
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { month: "Sep", value: 82 },
                    { month: "Oct", value: 68 },
                    { month: "Nov", value: 91 },
                    { month: "Dec", value: 75 },
                    { month: "Jan", value: 96 },
                    { month: "Feb", value: 100 },
                  ].map((d) => (
                    <div key={d.month} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-7 shrink-0">{d.month}</span>
                      <div className="flex-1 h-5 bg-gray-50 rounded-full overflow-hidden">
                        <div className="h-full bg-black rounded-full" style={{ width: `${d.value}%` }} />
                      </div>
                      <span className="text-xs font-medium text-gray-700 w-10 text-right">${(d.value * 1.2).toFixed(0)}k</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <span className="text-[10px] text-gray-400">6 rows returned in 0.08s</span>
                  <span className="text-[10px] text-green-600 font-medium flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                    +18% vs last period
                  </span>
                </div>
              </div>
            </div>
            <div className="w-full md:w-1/2 order-1 md:order-2">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-9 h-9 bg-black text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">3</span>
                <h3 className="text-xl font-bold">Visualize as beautiful charts</h3>
              </div>
              <p className="text-gray-600 ml-12">
                Switch between bar charts, line graphs, pie charts, and tables. Export to CSV, Excel, or PDF with one click.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="w-full max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, transparent pricing</h2>
          <p className="text-gray-600">Start free, upgrade when you need more.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {/* Free */}
          <div className="border border-gray-200 rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-1">Free</h3>
            <p className="text-sm text-gray-500 mb-4">For trying out Erao</p>
            <div className="mb-6">
              <span className="text-4xl font-bold">$0</span>
              <span className="text-gray-500">/month</span>
            </div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-2 text-sm">
                <svg className="w-5 h-5 text-black flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                1 database connection
              </li>
              <li className="flex items-center gap-2 text-sm">
                <svg className="w-5 h-5 text-black flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                10 queries/month
              </li>
            </ul>
            <ContactSalesButton />
          </div>

          {/* Pro */}
          <div className="border-2 border-black rounded-2xl p-6 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black text-white px-3 py-1 rounded-full text-xs font-medium">
              Most Popular
            </div>
            <h3 className="text-lg font-semibold mb-1">Pro</h3>
            <p className="text-sm text-gray-500 mb-4">For power users</p>
            <div className="mb-6">
              <span className="text-4xl font-bold">$49</span>
              <span className="text-gray-500">/month</span>
            </div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-2 text-sm">
                <svg className="w-5 h-5 text-black flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                5 database connections
              </li>
              <li className="flex items-center gap-2 text-sm">
                <svg className="w-5 h-5 text-black flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                100 queries/month
              </li>
            </ul>
            <ContactSalesButton variant="filled" />
          </div>

          {/* Enterprise */}
          <div className="border border-gray-200 rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-1">Enterprise</h3>
            <p className="text-sm text-gray-500 mb-4">For large organizations</p>
            <div className="mb-6">
              <span className="text-4xl font-bold">$299</span>
              <span className="text-gray-500">/month</span>
            </div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-2 text-sm">
                <svg className="w-5 h-5 text-black flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Unlimited connections
              </li>
              <li className="flex items-center gap-2 text-sm">
                <svg className="w-5 h-5 text-black flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Unlimited queries
              </li>
            </ul>
            <ContactSalesButton />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="w-full bg-black text-white py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Stop writing SQL. Start getting answers.
          </h2>
          <p className="text-gray-400 mb-8 text-lg">
            Join 500+ teams who save hours every week with Erao.
          </p>
          <Link
            href="/register"
            className="inline-block bg-white text-black px-8 py-3.5 rounded-xl text-base font-medium hover:bg-gray-100 transition-colors"
          >
            Start Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
