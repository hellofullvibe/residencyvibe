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
    <div className="w-full min-h-screen">
      <div className="w-full bg-white">
          <div className="max-w-6xl mx-auto flex flex-col items-center justify-center gap-8 py-25">
          <div className="flex flex-col gap-8 items-center justify-center px-6 lg:px-0">
            <div className="flex flex-col items-center justify-center gap-2">
              <h5 className="max-w-sm text-center font-semibold text-blue-700 text-xs uppercase tracking-wide">
                Your Collection
              </h5>
              <h1 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight text-black sm:text-5xl">
                Saved questions
              </h1>
            </div>
            <p className="max-w-xl text-center text-slate-600">
              Keep your most important interview questions in one place. Save questions you want to revisit, practice, and prepare for before interview day.
            </p>
          </div>
        </div>        
      </div>

      <div className="max-w-6xl mx-auto flex flex-col items-center justify-center gap-8 w-full px-6 lg:px-0">

      {error && (
          <p className="mb-4 text-center bg-red-50 px-4 inline-block py-4 text-sm text-red-700">We are facing some issue loading questions.</p>
        )}

      {questions.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-slate-300 py-16 text-center w-full max-w-3xl">
          <p className="text-slate-600">No saved questions yet.</p>
          <Link
            href="/questions"
            className="mt-2 inline-block text-sm font-medium text-slate-900 underline"
          >
            Browse the question bank
          </Link>
        </div>
      ) : (
        <div className="mt-6 w-full max-w-3xl">
          {questions.map((q) => (
            <QuestionCard key={q.id} question={q} onToggleSave={unsave} />
          ))}
        </div>
      )}
      </div>

    </div>
  );
}