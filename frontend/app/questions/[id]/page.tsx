"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { Comment, Meta, QuestionDetail, User } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import CategoryBadge from "@/components/CategoryBadge";
import ProgramPicker from "@/components/ProgramPicker";
import type { ProgramOption } from "@/components/ProgramPicker";
import AddQuestionModal from "@/components/AddQuestionModal";
import { StarRating, StarValue } from "@/components/StarRating";
import { ArrowLeft02Icon, Bookmark02Icon, Cancel01Icon, Delete02Icon, Edit01Icon, TickDouble01Icon } from "hugeicons-react";

export default function QuestionDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<QuestionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newVariant, setNewVariant] = useState("");
  const [showEdit, setShowEdit] = useState(false);
  const [meta, setMeta] = useState<Meta | null>(null);

  useEffect(() => {
    api.get<Meta>("/api/meta").then(setMeta).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    try {
      const d = await api.get<QuestionDetail>(`/api/questions/${id}`);
      setData(d);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not load question",
      );
    }
  }, [id]);

  async function addVariant() {
    if (!user || !newVariant.trim()) return;
    try {
      await api.post(`/api/questions/${id}/variants`, { text: newVariant.trim() });
      setNewVariant("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add variant");
    }
  }

  async function deleteVariant(index: number) {
    if (!user) return;
    try {
      await api.del(`/api/questions/${id}/variants/${index}`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete variant");
    }
  }

  async function confirmDelete() {
    if (!window.confirm("Delete this question? It will be hidden from everyone.")) return;
    try {
      await api.del(`/api/questions/${id}`);
      router.push("/questions");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete question");
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        const d = await api.get<QuestionDetail>(`/api/questions/${id}`);
        if (!cancelled) setData(d);
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof ApiError ? err.message : "Could not load question",
          );
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
        { star },
      );
      setData((d) =>
        d
          ? {
              ...d,
              question: {
                ...d.question,
                star: res.star,
                my_rating: res.my_rating,
              },
            }
          : d,
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
        setData(
          (d) => d && { ...d, question: { ...d.question, saved: false } },
        );
      } else {
        await api.post(`/api/questions/${id}/save`);
        setData((d) => d && { ...d, question: { ...d.question, saved: true } });
      }
    } catch {
      // ignore
    }
  }

  if (loading)
    return <p className="py-16 text-center text-slate-500">Loading…</p>;
  if (error || !data)
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-slate-600">{error}</p>
        <Link
          href="/questions"
          className="mt-4 inline-block text-slate-900 underline"
        >
          Back to questions
        </Link>
      </div>
    );

  const { question: q, comments, encounters } = data;

  return (
    <div className="mx-auto max-w-3xl py-8 ">
      <Link
        href="/questions"
        className="mb-4 px-6 lg:px-0 flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-black transition-all ease-in-out duration-300"
      >
        <ArrowLeft02Icon size={16} strokeWidth={2} />
        <span className="hover:underline">Back to Question Bank</span>
      </Link>

      <div className="sm:border sm:border-slate-100 bg-white px-6 py-8 ">
        <div className="mb-2 flex items-center  gap-2">
          <CategoryBadge category={q.category} />
          {q.frequency && (
            <span
              className={`rounded-full px-4 h-6 flex items-center justify-center text-xs lowercase font-medium bg-gray-50 text-slate-700
              `}
            >
              #{q.frequency}
            </span>
          )}
        </div>

        <h1 className="text-2xl font-bold leading-snug text-slate-900">
          {q.text}
        </h1>

        {q.variants.length > 0 && (
          <ul className="mt-3 space-y-1 pl-5 text-slate-600">
            {q.variants.map((v, i) => (
              <li key={i} className="list-disc">
                {v}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400">
          {q.specialty && <span>Specialty: {q.specialty}</span>}
          {q.settings && q.settings.some((s) => s.count > 0) && (
            <span className="text-slate-600">
              <span className="text-slate-400">Setting: </span>
              {q.settings
                .map((s) => `${s.setting} ${s.percentage.toFixed(1)}%`)
                .join(", ")}
            </span>
          )}

          {q.year && <span>Year: {q.year}</span>}
        </div>
        <div className="mt-1 flex flex-wrap gap-y-2 gap-x-4 gap-y-2 text-sm text-slate-400">
          {q.program && <span>List of Programs: {q.program}</span>}
        </div>

        <div className="w-full flex items-center justify-between gap-2 mt-4 pt-4 border-t border-slate-100">
          {user ? (
            <div
              title={"Rate the question"}
              className={`h-11 text-sm rounded-full px-4 hover:text-blue-700 flex items-center justify-center gap-1 border cursor-pointer font-medium transition-all ease-in-out duration-300 border-slate-100`}
            >
              <StarValue value={q.star} />

              <span className="text-slate-200">|</span>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-700 pl-1 w-22">
                  {q.star > 0 ? "Average Rating" : "Give Rating"}
                </span>

                <StarRating
                  value={q.my_rating ?? 0}
                  onChange={rate}
                  readonly={!user}
                  size="sm"
                />
              </div>
            </div>
          ) : (
            <div
              title={"Rate the question"}
              className={`h-11 text-sm rounded-full px-4 hover:text-blue-700 flex items-center justify-center gap-1 border cursor-pointer font-medium transition-all ease-in-out duration-300 border-slate-100`}
            >
              <p className="mt-1 text-xs text-slate-500">
                <Link href="/signup" className="font-medium underline">
                  Sign in
                </Link>{" "}
                to rate this question.
              </p>
            </div>
          )}
          <div className="flex items-center justify-end gap-2">

          {user && data.question.created_by === user.id && (
            <>
              <button
                onClick={() => setShowEdit(true)}
                title="Edit question"
                className="h-11 w-11 rounded-full border border-slate-100 bg-white flex items-center justify-center text-slate-500 hover:text-blue-700 cursor-pointer transition-all duration-300"
              >
                <Edit01Icon size={16} strokeWidth={2} />
              </button>
              <button
                onClick={confirmDelete}
                title="Delete question"
                className="h-11 w-11 rounded-full border border-slate-100 bg-white flex items-center justify-center text-slate-500 hover:text-red-600 cursor-pointer transition-all duration-300"
              >
                <Delete02Icon size={16} strokeWidth={2} />
              </button>
            </>
          )}
          <button
            onClick={toggleSave}
            title={q.saved ? "Unsave" : "Save"}
            className={`h-11 w-11 sm:w-auto text-sm rounded-full px-4 hover:text-blue-700 flex items-center justify-center gap-1 border cursor-pointer font-medium transition-all ease-in-out duration-300  ${q.saved ? "text-blue-700 border-blue-50 bg-blue-700/5" : "text-black border-slate-100 bg-white"}`}
          >
            <Bookmark02Icon size={16} strokeWidth={2} className="shrink-0" />
            <span className="hidden sm:block">
              {q.saved ? "Saved" : "Save Question"}
            </span>
          </button>
            
          </div>

          
        </div>
      </div>

      {/* {q.my_encounters && q.my_encounters.length > 0 && (
        <div className="mt-1 border border-slate-100 bg-white px-6 py-4">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            You encountered this at
          </span>
          <div className="mt-2 flex flex-wrap gap-2">
            {q.my_encounters.map((n) => (
              <span
                key={n}
                className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800"
              >
                {n}
              </span>
            ))}
          </div>
        </div>
      )} */}

      {/* Recent encounters card */}
      <div className="mt-1 border border-slate-100 bg-white px-6 py-8">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">
            Recent Encounters
          </h2>
            <span className="text-sm font-medium text-slate-500">
              Year {new Date().getFullYear()}
            </span>
        </div>
        {encounters.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            No encounters reported yet. Mark it below if you got this question.
          </p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {encounters.map((e) => (
              <span
                key={e.program_name}
                className="rounded-full bg-slate-50 px-4 h-11 flex items-center justify-center font-medium text-sm text-slate-700"
              >
                {e.program_name}
                <span className="ml-1 text-slate-400">({e.count})</span>
              </span>
            ))}
          </div>
        )}

        {user && <EncounterForm questionId={id} data={data} onUpdated={load} />}
      </div>

      {/* Variants card */}
      <div className="mt-1 border border-slate-100 bg-white px-6 py-8">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Question Variants</h2>
          <span className="text-sm font-medium text-slate-500">
            {q.variants.length} variant{q.variants.length !== 1 ? "s" : ""}
          </span>
        </div>
        {q.variants.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            No variants yet. Add one below.
          </p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {q.variants.map((v, i) => (
              <div
                key={i}
                className="rounded-full bg-slate-50 px-4 h-11 flex items-center justify-center font-medium text-sm text-slate-700 gap-2"
              >
                {v}
                {user && (
                  <button
                    onClick={() => deleteVariant(i)}
                    className="cursor-pointer text-slate-400 transition-colors hover:text-rose-600"
                    aria-label="Delete variant"
                  >
                    <Cancel01Icon size={14} strokeWidth={2} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {user ? (
          <div className="mt-4 flex gap-2">
            <input
              value={newVariant}
              onChange={(e) => setNewVariant(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addVariant()}
              placeholder="Add a variant…"
              className="h-11 flex-1 border border-slate-200  px-4 text-sm outline-none focus:border-slate-700"
            />
            <button
              onClick={addVariant}
              disabled={!newVariant.trim()}
              className="h-11 cursor-pointer bg-blue-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            <Link href="/signup" className="font-medium underline">
              Sign in
            </Link>{" "}
            to add variants.
          </p>
        )}
      </div>

      

      {/* Comments */}
      <section className="mt-4">
        <h2 className="mb-2 text-lg font-semibold text-black">
          Responses ({comments.length})
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
            <Link
              href="/signup"
              className="font-medium text-slate-900 underline"
            >
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

      {showEdit && data && (
        <AddQuestionModal
          meta={meta}
          editQuestion={data.question}
          onClose={() => setShowEdit(false)}
          onUpdated={() => {
            setShowEdit(false);
            load();
          }}
        />
      )}
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
  const [selected, setSelected] = useState<ProgramOption[]>(
    (q.my_encounters ?? []).map((n) => ({ name: n }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    try {
      await api.post(`/api/questions/${questionId}/encounter`, {
        encountered: selected.length > 0,
        program_ids: selected.filter((x) => x.id).map((x) => x.id as string),
        program_names: selected.filter((x) => !x.id).map((x) => x.name),
      });
      await onUpdated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save encounter");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
        I encountered this question at
      </span>
      <div className="relative mt-2 flex flex-col md:flex-row items-start justify-between gap-2">
        <ProgramPicker
          multi
          value={selected}
          onChange={(v) => setSelected((v as ProgramOption[]) ?? [])}
        />
        <button
          onClick={save}
          disabled={saving}
          className="w-full sm:w-auto bg-blue-700/10 cursor-pointer h-11 px-4 text-sm font-semibold text-blue-700 hover:text-white transition-all ease-in-out duration-300 hover:bg-blue-700 disabled:pointer-events-none disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
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
    <div className="border border-slate-100 bg-white px-6 py-8">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-black">
          @{comment.author_username}
        </span>
        <span className="text-xs text-slate-400">•</span>
        <span className="text-xs text-slate-400">
          {new Date(comment.created_at).toLocaleDateString()}
        </span>
      </div>
      <div className="w-full pl-4 border-l-2 border-slate-100">

      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
        {comment.content}
      </p>
      </div>

      {user && !replying && (
        <button
          onClick={() => setReplying((v) => !v)}
          className="mt-2 pl-4 underline text-sm font-semibold text-black hover:text-blue-700 cursor-pointer transition-all ease-in-out duration-300"
        >
          Write a Reply
        </button>
      )}

      {replying && (
        <div className="mt-2 pl-4 py-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            maxLength={3000}
            placeholder="Your reply…"
            className="w-full border border-slate-100 px-4 py-4 text-sm outline-none focus:border-slate-700"
          />
          <div className="mt-1 flex items-center justify-between">
        {/* <span className={`text-xs ${content.length > 2999 ? 'text-rose-600' : 'text-slate-400'}`}>{content.length > 2999 ? "Shorten your response please":content.length}</span> */}
        <div className="flex gap-2">
          <button
          onClick={submitReply}
          disabled={!content.trim()}
          className="bg-blue-700 px-4 h-11 text-sm font-semibold text-white  transition-all ease-in-out duration-300 hover:bg-blue-800 cursor-pointer  disabled:pointer-events-none disabled:opacity-50"
        >
          Reply
        </button>

              <button
                onClick={() => {
                  setReplying(false);
                  setContent("");
                }}
                className="px-4 h-11 text-sm font-semibold text-slate-700 transition-all ease-in-out duration-300 cursor-pointer  hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
      </div>

        </div>
      )}

      {comment.replies.length > 0 && (
        <div className="mt-4 space-y-4 border-l-2 border-slate-100 ml-4 pl-4">
          {comment.replies.map((r) => (
            <div key={r.id}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-800">
                  @{r.author_username}
                </span>
                <span className="text-xs text-slate-400">•</span>
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
    <div className="border border-slate-200 bg-white px-6 py-8">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500 sr-only">
        {label}
      </span>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        maxLength={3000}
        placeholder="Share how you would approach this question…"
        className="w-full border border-slate-100 px-4 py-4 text-sm outline-none focus:border-slate-700"
      />
      <div className="mt-1 flex items-center justify-between">
        <button
          onClick={submit}
          disabled={sending || !content.trim()}
          className="bg-blue-700 px-4 h-11 text-sm font-semibold text-white  transition-all ease-in-out duration-300 hover:bg-blue-800 cursor-pointer  disabled:pointer-events-none disabled:opacity-50"
        >
          {sending ? "Posting…" : "Post comment"}
        </button>
        <span className={`text-xs ${content.length > 2999 ? 'text-rose-600' : 'text-slate-400'}`}>{content.length > 2999 ? "Shorten your response please":content.length}</span>
        
      </div>
    </div>
  );
}
