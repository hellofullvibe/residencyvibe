"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { Comment, QuestionDetail, User } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import CategoryBadge from "@/components/CategoryBadge";
import { StarRating, StarValue } from "@/components/StarRating";

export default function QuestionDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { user } = useAuth();
  const [data, setData] = useState<QuestionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await api.get<QuestionDetail>(`/api/questions/${id}`);
      setData(d);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load question");
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        const d = await api.get<QuestionDetail>(`/api/questions/${id}`);
        if (!cancelled) setData(d);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof ApiError ? err.message : "Could not load question");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    start();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function rate(star: number) {
    if (!user || !data) return;
    try {
      const res = await api.post<{ star: number; my_rating: number }>(
        `/api/questions/${id}/rate`,
        { star }
      );
      setData((d) =>
        d
          ? {
              ...d,
              question: { ...d.question, star: res.star, my_rating: res.my_rating },
            }
          : d
      );
    } catch {
      // ignore
    }
  }

  async function toggleSave() {
    if (!user || !data) return;
    try {
      if (data.question.saved) {
        await api.del(`/api/questions/${id}/save`);
        setData((d) => d && { ...d, question: { ...d.question, saved: false } });
      } else {
        await api.post(`/api/questions/${id}/save`);
        setData((d) => d && { ...d, question: { ...d.question, saved: true } });
      }
    } catch {
      // ignore
    }
  }

  if (loading) return <p className="py-16 text-center text-slate-500">Loading…</p>;
  if (error || !data)
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-slate-600">{error}</p>
        <Link href="/questions" className="mt-4 inline-block text-slate-900 underline">
          Back to questions
        </Link>
      </div>
    );

  const { question: q, comments, encounters } = data;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/questions"
        className="mb-4 inline-block text-sm text-slate-500 hover:text-slate-900"
      >
        ← Back to questions
      </Link>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-3 flex items-center justify-between gap-2">
          <CategoryBadge category={q.category} />
          <button
            onClick={toggleSave}
            className="text-sm text-slate-500 hover:text-amber-500"
          >
            {q.saved ? "★ Saved" : "☆ Save question"}
          </button>
        </div>

        <h1 className="text-2xl font-bold leading-snug text-slate-900">{q.text}</h1>

        {q.variants.length > 0 && (
          <ul className="mt-3 space-y-1 pl-5 text-slate-600">
            {q.variants.map((v, i) => (
              <li key={i} className="list-disc">
                {v}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
          {q.specialty && <span>Specialty: {q.specialty}</span>}
          {q.program && <span>Program: {q.program}</span>}
          {q.institutional_setting && <span>Setting: {q.institutional_setting}</span>}
          {q.frequency && <span>Frequency: {q.frequency}</span>}
          {q.year && <span>Year: {q.year}</span>}
          {q.encounter_count > 0 && <span>{q.encounter_count} encountered</span>}
        </div>

        {/* Rating */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
          <div>
            <div className="flex items-center gap-2">
              <StarValue value={q.star} />
              <span className="text-xs text-slate-500">
                {q.star > 0 ? "average rating" : "no ratings yet"}
              </span>
            </div>
            {user ? (
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs text-slate-500">Your rating:</span>
                <StarRating
                  value={q.my_rating ?? 0}
                  onChange={rate}
                  readonly={!user}
                  size="sm"
                />
              </div>
            ) : (
              <p className="mt-1 text-xs text-slate-500">
                <Link href="/signup" className="font-medium underline">
                  Sign in
                </Link>{" "}
                to rate this question.
              </p>
            )}
          </div>
          {q.my_encounter && q.my_encounter.encountered && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
              You encountered{q.my_encounter.program_name ? ` at ${q.my_encounter.program_name}` : ""}
            </span>
          )}
        </div>
      </div>

      {/* Recent encounters card */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Recent encounters</h2>
          {q.year && <span className="text-sm font-medium text-slate-500">Year {q.year}</span>}
        </div>
        {encounters.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            No encounters reported yet. Mark it below if you got this question.
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {encounters.map((e) => (
              <span
                key={e.program_name}
                className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
              >
                {e.program_name}
                <span className="ml-1 text-slate-400">({e.count})</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Encounter recording */}
      {user && <EncounterForm questionId={id} data={data} onUpdated={load} />}

      {/* Comments */}
      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Comments ({comments.length})
        </h2>
        {user ? (
          <CommentForm
            label="Share how you'd answer this question"
            onSubmit={async (content) => {
              await api.post(`/api/questions/${id}/comments`, { content });
              await load();
            }}
          />
        ) : (
          <p className="mb-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <Link href="/signup" className="font-medium text-slate-900 underline">
              Sign up
            </Link>{" "}
            to comment on questions.
          </p>
        )}

        <div className="mt-4 space-y-4">
          {comments.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-300 py-8 text-center text-sm text-slate-500">
              No comments yet. Be the first to share your answer approach.
            </p>
          )}
          {comments.map((c) => (
            <CommentThread key={c.id} comment={c} onReply={load} user={user} />
          ))}
        </div>
      </section>
    </div>
  );
}

function EncounterForm({
  questionId,
  data,
  onUpdated,
}: {
  questionId: string;
  data: QuestionDetail;
  onUpdated: () => Promise<void>;
}) {
  const q = data.question;
  const [encountered, setEncountered] = useState(q.my_encounter?.encountered ?? false);
  const [program, setProgram] = useState(q.my_encounter?.program_name ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api.post(`/api/questions/${questionId}/encounter`, {
        encountered,
        program_name: program,
      });
      await onUpdated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
        I encountered this question
      </span>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          onClick={() => setEncountered((v) => !v)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            encountered
              ? "bg-emerald-600 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          {encountered ? "Yes, I encountered it" : "Not encountered"}
        </button>
        <input
          value={program}
          onChange={(e) => setProgram(e.target.value)}
          placeholder="Program name (e.g. SUNY Downstate)"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500"
        />
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

function CommentThread({
  comment,
  onReply,
  user,
}: {
  comment: Comment;
  onReply: () => Promise<void>;
  user: User | null;
}) {
  const [replying, setReplying] = useState(false);
  const [content, setContent] = useState("");

  async function submitReply() {
    if (!content.trim()) return;
    await api.post(`/api/comments/${comment.id}/replies`, { content });
    setContent("");
    setReplying(false);
    await onReply();
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-900">@{comment.author_username}</span>
        <span className="text-xs text-slate-400">
          {new Date(comment.created_at).toLocaleDateString()}
        </span>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
        {comment.content}
      </p>

      {user && (
        <button
          onClick={() => setReplying((v) => !v)}
          className="mt-2 text-xs font-medium text-slate-500 hover:text-slate-900"
        >
          Reply
        </button>
      )}

      {replying && (
        <div className="mt-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            maxLength={3000}
            placeholder="Your reply…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
          <div className="mt-1 flex items-center justify-between">
            <span className="text-xs text-slate-400">{content.length}/3000</span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setReplying(false);
                  setContent("");
                }}
                className="rounded-md px-3 py-1 text-sm text-slate-500 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={submitReply}
                disabled={!content.trim()}
                className="rounded-md bg-slate-900 px-3 py-1 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
              >
                Post reply
              </button>
            </div>
          </div>
        </div>
      )}

      {comment.replies.length > 0 && (
        <div className="mt-3 space-y-3 border-l-2 border-slate-100 pl-3">
          {comment.replies.map((r) => (
            <div key={r.id}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-800">
                  @{r.author_username}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                {r.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CommentForm({
  label,
  onSubmit,
}: {
  label: string;
  onSubmit: (content: string) => Promise<void>;
}) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  async function submit() {
    if (!content.trim()) return;
    setSending(true);
    try {
      await onSubmit(content);
      setContent("");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        maxLength={3000}
        placeholder="Share how you would approach this question…"
        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
      />
      <div className="mt-1 flex items-center justify-between">
        <span className="text-xs text-slate-400">{content.length}/3000</span>
        <button
          onClick={submit}
          disabled={sending || !content.trim()}
          className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {sending ? "Posting…" : "Post comment"}
        </button>
      </div>
    </div>
  );
}