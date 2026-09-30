"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { Question } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import QuestionCard from "@/components/QuestionCard";

export default function SavedPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (!user) return;
    let cancelled = false;
    async function start() {
      try {
        const data = await api.get<Question[]>("/api/saved");
        if (!cancelled) setQuestions(data);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof ApiError ? err.message : "Could not load saved questions");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    start();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, router]);

  async function unsave(q: Question) {
    try {
      await api.del(`/api/questions/${q.id}/save`);
      setQuestions((qs) => qs.filter((x) => x.id !== q.id));
    } catch {
      // ignore
    }
  }

  if (authLoading || (loading && user)) {
    return <p className="py-16 text-center text-slate-500">Loading…</p>;
  }
  if (!user) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Saved questions</h1>
      <p className="text-sm text-slate-600">
        Questions you&apos;ve saved to practice later.
      </p>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {questions.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-slate-300 py-16 text-center">
          <p className="text-slate-600">No saved questions yet.</p>
          <Link
            href="/questions"
            className="mt-2 inline-block text-sm font-medium text-slate-900 underline"
          >
            Browse the question bank
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {questions.map((q) => (
            <QuestionCard key={q.id} question={q} onToggleSave={unsave} />
          ))}
        </div>
      )}
    </div>
  );
}