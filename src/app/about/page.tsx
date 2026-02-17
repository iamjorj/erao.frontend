"use client";

import Link from "next/link";
import { PageLayout, EmailButton } from "@/components/shared";

const values = [
  {
    title: "Simplicity First",
    description: "We believe powerful tools don't have to be complicated. Every feature we build must make your life easier, not harder.",
  },
  {
    title: "Privacy by Design",
    description: "Your data is yours. We never store your actual data—only the queries you run. Security isn't an afterthought; it's built into everything we do.",
  },
  {
    title: "Speed Matters",
    description: "Waiting for answers slows down decisions. We're obsessed with making Erao fast—from connection to query to result.",
  },
  {
    title: "Transparency",
    description: "No hidden fees, no surprise charges, no data selling. What you see is what you get.",
  },
];

export default function AboutPage() {
  return (
    <PageLayout currentPage="about">
      {/* Hero */}
      <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-14 sm:pb-20">
        <div className="max-w-3xl">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6">
            We&apos;re making data accessible to everyone
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            Erao was born from a simple frustration: why do you need to know SQL to ask your own database a question? And why can&apos;t you just upload a spreadsheet and start asking? We&apos;re building a world where anyone—not just engineers—can get instant insights from their data.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="w-full bg-gray-50 py-14 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Our Mission</h2>
            <p className="text-lg text-gray-600">
              To eliminate the gap between asking a question and getting an answer from your data. No SQL. No waiting. No middlemen.
            </p>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <div className="max-w-3xl">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Our Story</h2>
          <div className="space-y-4 text-gray-600">
            <p>
              Every day, thousands of business decisions are delayed because someone needs to ask a developer to write a SQL query. Product managers wait for usage stats. Sales teams wait for pipeline reports. Support teams wait for customer history.
            </p>
            <p>
              We started Erao to fix this. By combining modern AI with a deep understanding of databases and file formats, we&apos;ve built a tool that lets anyone—regardless of technical background—connect a database or upload a file and have a conversation with their data.
            </p>
            <p>
              Today, teams use Erao to get instant answers to questions that used to take hours or days. And we&apos;re just getting started.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="w-full bg-gray-50 py-14 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h2 className="text-xl sm:text-2xl font-bold text-center mb-8 sm:mb-12">What We Believe</h2>
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
            {values.map((value) => (
              <div key={value.title} className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6">
                <h3 className="text-lg font-semibold mb-2">{value.title}</h3>
                <p className="text-sm text-gray-600">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-20 text-center">
        <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Get in Touch</h2>
        <p className="text-sm sm:text-base text-gray-600 mb-5 sm:mb-6">
          Questions? Feedback? We&apos;d love to hear from you.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <EmailButton variant="outline">
            Email Us
          </EmailButton>
          <Link
            href="/contact"
            className="bg-black text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Contact Page
          </Link>
        </div>
      </section>
    </PageLayout>
  );
}
