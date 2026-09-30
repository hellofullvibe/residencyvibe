"use client";

import { useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { SearchResult } from "@/lib/types";
import CategoryBadge from "@/components/CategoryBadge";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError("");
    setSearched(true);
    try {
      const data = await api.get<SearchResult>(`/api/search?q=${encodeURIComponent(q)}`);
      setResults(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Search failed");
      setResults(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Search</h1>
      <p className="text-sm text-slate-600">Find questions and community answers.</p>

      <form onSubmit={onSearch} className="mt-6 flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search questions and comments…"
          className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-slate-500"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {searched && !loading && results && (
        <div className="mt-8 space-y-8">
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Questions ({results.questions.length})
            </h2>
            {results.questions.length === 0 ? (
              <p className="text-sm text-slate-500">No questions found.</p>
            ) : (
              <div className="space-y-3">
                {results.questions.map((q) => (
                  <div
                    key={q.id}
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <CategoryBadge category={q.category} />
                      <span className="text-xs text-slate-400">
                        {q.comment_count} comments
                      </span>
                    </div>
                    <Link
                      href={`/questions/${q.id}`}
                      className="font-medium text-slate-900 hover:text-slate-600"
                    >
                      {q.text}
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Comments ({results.comments.length})
            </h2>
            {results.comments.length === 0 ? (
              <p className="text-sm text-slate-500">No comments found.</p>
            ) : (
              <div className="space-y-3">
                {results.comments.map((c) => (
                  <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-sm leading-relaxed text-slate-700">
                      <span className="mr-1 font-medium text-slate-900">@{c.author_username}:</span>
                      {c.content}
                    </p>
                    <Link
                      href={`/questions/${c.question_id}`}
                      className="mt-2 inline-block text-xs text-slate-500 hover:text-slate-900"
                    >
                      on “{c.question_text}”
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {searched && !loading && !results && !error && (
        <p className="mt-8 text-center text-sm text-slate-500">Nothing found.</p>
      )}
    </div>
  );
}