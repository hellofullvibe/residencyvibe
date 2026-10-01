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
    // <div className="mx-auto max-w-3xl px-4 py-8">
    <div className="w-full min-h-screen">
      <div className="w-full bg-white">
        <div className="max-w-6xl mx-auto flex flex-col items-center justify-center gap-8 pt-25">
          <div className="flex flex-col gap-8 items-center justify-center px-6 lg:px-0">
            <div className="flex flex-col items-center justify-center gap-2">
              <h5 className="max-w-sm text-center font-semibold text-blue-700 text-xs uppercase tracking-wide">
                Quick find what you need
              </h5>
              <h1 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight text-black sm:text-5xl">
                Search
              </h1>
            </div>
            <p className="max-w-xl text-center text-slate-600">
              Search residency interview questions and explore sample responses from community to help you prepare with confidence.           
            </p>
          </div>

          <form onSubmit={onSearch} className="mt-6 mb-8 flex gap-2 w-full max-w-3xl px-6 lg:px-0">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search questions and responses"
          className="flex-1 border border-slate-100 bg-white px-4 h-11 flex items-center text-sm outline-none focus:border-slate-700"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="bg-blue-700 px-4 h-11 text-sm font-semibold text-white  transition-all ease-in-out duration-300 hover:bg-blue-800 cursor-pointer  disabled:pointer-events-none disabled:opacity-50"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>
        </div>



      </div>

        <div className="max-w-6xl mx-auto flex flex-col items-center justify-center gap-8 w-full px-6 lg:px-0">


          {error && (
          <p className="mb-4 text-center bg-red-50 px-4 inline-block py-4 text-sm text-red-700">We are facing some issue loading questions.</p>
        )}

      {searched && !loading && results && (
        <div className="mt-8 space-y-8 w-full">
          <section>
            <h3 className="mb-4 font-bold leading-snug text-black flex-1">
              Questions ({results.questions.length})
            </h3>
            {results.questions.length === 0 ? (
              <p className="text-sm text-slate-400 text-center px-4 py-4 bg-gray-100 max-w-3xl mx-auto">No questions found</p>
            ) : (
              <div className="space-y-2 max-w-3xl mx-auto">
                {results.questions.map((q) => (
                  <Link
                  href={`/questions/${q.id}`}
                    key={q.id}
                    className="flex justify-between flex-col border border-slate-100 bg-white px-6 py-6 transition-all ease-in-out duration-300 hover:bg-gray-100 hover:border-slate-200"
                  >
                    <div className="mb-2 cursor-pointer flex items-center gap-2 border-b pb-4 border-slate-100">
                      <CategoryBadge category={q.category} />
                      <span className="text-xs text-slate-400">
                        {q.comment_count} response
                      </span>
                    </div>
                    <h2
                      
                      className="font-bold leading-snug text-black flex-1"
                    >
                      {q.text}
                    </h2>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="mb-4 font-bold leading-snug text-black flex-1">
              Response ({results.comments.length})
            </h3>

            {results.comments.length === 0 ? (
              <p className="text-sm text-slate-400 text-center px-4 py-4 bg-gray-100 max-w-3xl mx-auto">No response found</p>
            ) : (
              <div className="space-y-2 max-w-3xl mx-auto">
                {results.comments.map((c) => (
                  <Link 
                  href={`/questions/${c.question_id}`}
                  key={c.id} 
                  className="flex justify-between flex-col border border-slate-100 bg-white px-6 py-6 transition-all ease-in-out duration-300 hover:bg-gray-100 hover:border-slate-200"
                  >
                    <p className="text-sm leading-relaxed text-slate-700 line-clamp-2">
                      <span className="mr-1 font-medium text-black">@{c.author_username}:</span>
                      {c.content}
                    </p>
                    <div
                      className="mt-4 inline-block text-sm underline text-slate-700 hover:text-blue-700 transition-all ease-in-out duration-300"
                    >
                      on “{c.question_text}”
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {searched && !loading && !results && !error && (
        <p className="text-sm text-slate-400 text-center px-4 py-4 bg-gray-100 max-w-3xl mx-auto ">Nothing found</p>
      )}

      {!loading && !results && !error && (
        <p className="text-sm text-slate-400 text-center px-4 py-4 bg-gray-100 max-w-3xl mx-auto mt-8 w-full">Type what are you looking for and click search button</p>
      )}
        </div>

     

      

      
    </div>
  );
}