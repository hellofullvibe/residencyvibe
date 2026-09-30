"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { Meta, Question } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import QuestionCard from "@/components/QuestionCard";
import AddQuestionModal from "@/components/AddQuestionModal";

type Filters = {
  category: string;
  specialty: string;
  program: string;
  institutional_setting: string;
  frequency: string;
  min_star: string;
  sort: string;
};

const initialFilters: Filters = {
  category: "",
  specialty: "",
  program: "",
  institutional_setting: "",
  frequency: "",
  min_star: "",
  sort: "newest",
};

export default function QuestionsPage() {
  const { user } = useAuth();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    api.get<Meta>("/api/meta").then(setMeta).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        const data = await api.get<Question[]>(`/api/questions?${buildQuery(filters)}`);
        if (!cancelled) setQuestions(data);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof ApiError ? err.message : "Could not load questions");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    start();
    return () => {
      cancelled = true;
    };
  }, [filters]);

  async function toggleSave(q: Question) {
    if (!user) return;
    try {
      if (q.saved) {
        await api.del(`/api/questions/${q.id}/save`);
      } else {
        await api.post(`/api/questions/${q.id}/save`);
      }
      setQuestions((qs) => qs.map((x) => (x.id === q.id ? { ...x, saved: !q.saved } : x)));
    } catch {
      // ignore
    }
  }

  function setFilter<K extends keyof Filters>(k: K, v: string) {
    setFilters((f) => ({ ...f, [k]: v }));
  }

  const categories = meta?.categories || [];
  const hasActiveFilters = Object.entries(filters).some(
    ([k, v]) => v !== "" && k !== "sort"
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Question Bank</h1>
          <p className="text-sm text-slate-600">
            {loading ? "…" : `${questions.length} question${questions.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          + Add question
        </button>
      </div>

      {/* Category tabs */}
      <div className="mb-4 flex gap-1 overflow-x-auto pb-1">
        <Tab
          active={filters.category === ""}
          onClick={() => setFilter("category", "")}
        >
          All
        </Tab>
        {categories.map((c) => (
          <Tab
            key={c}
            active={filters.category === c}
            onClick={() => setFilter("category", c)}
          >
            {c}
          </Tab>
        ))}
      </div>

      {/* Toolbar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className={`rounded-lg border px-3 py-2 text-sm font-medium ${
              filtersOpen || hasActiveFilters
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            Filters {hasActiveFilters ? "●" : ""}
          </button>
          {hasActiveFilters && (
            <button
              onClick={() => setFilters({ ...initialFilters })}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Clear
            </button>
          )}
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Sort
            <select
              value={filters.sort}
              onChange={(e) => setFilter("sort", e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm outline-none focus:border-slate-500"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="star">Star rating</option>
              <option value="frequency">Frequency</option>
            </select>
          </label>
        </div>

        <div className="flex overflow-hidden rounded-lg border border-slate-300">
          <button
            onClick={() => setView("grid")}
            className={`px-3 py-2 text-sm ${view === "grid" ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
            title="Card view"
          >
            ⊞
          </button>
          <button
            onClick={() => setView("list")}
            className={`px-3 py-2 text-sm ${view === "list" ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
            title="List view"
          >
            ≡
          </button>
        </div>
      </div>

      {/* Collapsible filter panel */}
      {filtersOpen && (
        <div className="mb-6 grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3 lg:grid-cols-4">
          <Select
            label="Specialty"
            value={filters.specialty}
            onChange={(v) => setFilter("specialty", v)}
            options={meta?.specialties || []}
          />
          <ProgramSelect
            label="Program"
            value={filters.program}
            onChange={(v) => setFilter("program", v)}
            options={(meta?.programs || []).sort()}
          />
          <Select
            label="Setting"
            value={filters.institutional_setting}
            onChange={(v) => setFilter("institutional_setting", v)}
            options={meta?.institutional_settings || []}
          />
          <Select
            label="Frequency"
            value={filters.frequency}
            onChange={(v) => setFilter("frequency", v)}
            options={meta?.frequencies || []}
          />
          <Select
            label="Min star"
            value={filters.min_star}
            onChange={(v) => setFilter("min_star", v)}
            options={["1", "2", "3", "4", "5"]}
          />
        </div>
      )}

      {!user && (
        <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          <Link href="/signup" className="font-medium underline">
            Create an account
          </Link>{" "}
          to save questions, rate them, mark where you encountered them, and share answers.
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {loading ? (
        <p className="py-10 text-center text-slate-500">Loading questions…</p>
      ) : questions.length === 0 ? (
        <p className="py-10 text-center text-slate-500">
          No questions match your filters. Try adding one!
        </p>
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {questions.map((q) => (
            <QuestionCard key={q.id} question={q} onToggleSave={user ? toggleSave : undefined} />
          ))}
        </div>
      ) : (
        <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {questions.map((q) => (
            <ListRow key={q.id} q={q} user={user} onToggleSave={toggleSave} />
          ))}
        </div>
      )}

      {showAdd && (
        <AddQuestionModal
          meta={meta}
          onClose={() => setShowAdd(false)}
          onCreated={(q) => {
            setShowAdd(false);
            setQuestions((qs) => [q, ...qs]);
          }}
        />
      )}
    </div>
  );
}

function ListRow({
  q,
  user,
  onToggleSave,
}: {
  q: Question;
  user: ReturnType<typeof useAuth>["user"];
  onToggleSave: (q: Question) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Link href={`/questions/${q.id}`} className="min-w-0 flex-1">
        <span className="block truncate font-medium text-slate-900 hover:text-slate-600">
          {q.text}
        </span>
        <span className="text-xs text-slate-500">
          {q.category} · 💬 {q.comment_count}
          {q.encounter_count > 0 && ` · ${q.encounter_count} encountered`}
        </span>
      </Link>
      <span className="shrink-0 text-sm text-amber-500">{Number(q.star).toFixed(1)} ⭐</span>
      {user && (
        <button
          onClick={() => onToggleSave(q)}
          className="shrink-0 text-sm text-slate-500 hover:text-amber-500"
        >
          {q.saved ? "★" : "☆"}
        </button>
      )}
    </div>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-slate-900 text-white"
          : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm outline-none focus:border-slate-500"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

// ProgramSelect is a type-ahead combobox for large program lists.
function ProgramSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  const [draft, setDraft] = useState(value);
  const [open, setOpen] = useState(false);
  const filtered = options
    .filter((o) => o.toLowerCase().includes(draft.toLowerCase()))
    .slice(0, 40);

  return (
    <div className="relative block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <input
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setOpen(true);
          onChange(e.target.value === "" ? "" : e.target.value);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search program…"
        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm outline-none focus:border-slate-500"
      />
      {open && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-400">No matches</li>
          ) : (
            filtered.map((o) => (
              <li key={o}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setDraft(o);
                    onChange(o);
                    setOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                    o === value ? "bg-slate-100 font-medium" : ""
                  }`}
                >
                  {o}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

function buildQuery(filters: Filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v) params.set(k, v);
  });
  return params.toString();
}