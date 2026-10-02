"use client";

import { useEffect, useState, Fragment } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { Meta, Question } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import QuestionCard from "@/components/QuestionCard";
import AddQuestionModal from "@/components/AddQuestionModal";
import {
  Add01Icon,
  ArrowDown01Icon,
  Bookmark02Icon,
  Cancel01Icon,
  Chatting01Icon,
  LayoutGridIcon,
  ListViewIcon,
} from "hugeicons-react";
import CategoryBadge from "@/components/CategoryBadge";
import DonationCard from "@/components/DonationCard";

type Filters = {
  category: string;
  specialty: string;
  program: string;
  institutional_setting: string;
  frequency: string;
  min_star: string;
  min_percent: string;
  sort: string;
};

const initialFilters: Filters = {
  category: "",
  specialty: "",
  program: "",
  institutional_setting: "",
  frequency: "",
  min_star: "",
  min_percent: "",
  sort: "",
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
    api
      .get<Meta>("/api/meta")
      .then(setMeta)
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        const data = await api.get<Question[]>(
          `/api/questions?${buildQuery(filters)}`,
        );
        if (!cancelled) setQuestions(data);
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof ApiError ? err.message : "Could not load questions",
          );
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
      setQuestions((qs) =>
        qs.map((x) => (x.id === q.id ? { ...x, saved: !q.saved } : x)),
      );
    } catch {
      // ignore
    }
  }

  function setFilter<K extends keyof Filters>(k: K, v: string) {
    setFilters((f) => ({ ...f, [k]: v }));
  }

  const categories = meta?.categories || [];
  const hasActiveFilters = Object.entries(filters).some(
    ([k, v]) => v !== "" && k !== "sort",
  );

  return (
    <div className="w-full min-h-screen">
      <div className="w-full bg-white">
        <div className="max-w-6xl mx-auto flex flex-col items-center justify-center gap-8 pt-25">
          <div className="flex flex-col gap-8 items-center justify-center px-6 lg:px-0">
            <div className="flex flex-col items-center justify-center gap-2">
              <h5 className="max-w-sm text-center font-semibold text-blue-700 text-xs uppercase tracking-wide">
                Questions That Asked In Interviews
              </h5>
              <h1 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight text-black sm:text-5xl">
                Question Bank
              </h1>
            </div>
            <p className="max-w-xl text-center text-slate-600">
              Browse questions by category, search for specific questions, and
              learn from experiences shared by other applicants. Save questions
              you want to practice and build your own interview preparation
              list.
            </p>
          </div>

          <div className="w-full px-6 flex items-center justify-center lg:px-0">
            <button
              onClick={() => setShowAdd(true)}
              className="cursor-pointer bg-blue-700/10 w-full sm:w-auto sm:px-8 h-14 flex items-center justify-center font-semibold text-blue-700 hover:bg-blue-800 hover:text-white transition-all ease-in-out duration-300 gap-2"
            >
              <Add01Icon size={20} strokeWidth={2} />
              <span>Add a Question</span>
            </button>
          </div>

          <div className="flex w-sm sm:w-lg lg:w-full sm:items-center justify-start lg:justify-center overflow-x-auto scrollbar-none px-6 lg:px-0">
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
        </div>
      </div>

      {/* Category tabs */}

      {/* Toolbar */}

      <div className="w-full mx-auto max-w-6xl flex gap-4 pt-8">
        <div className="hidden lg:block max-w-xs w-full gap-4 space-y-4">
          <div className="bg-white w-full px-6 pt-4 pb-8">
            <div className="flex items-center justify-between h-11">
              <h3 className="text-base font-semibold">Filters</h3>

              {hasActiveFilters && (
                <button
                  onClick={() => setFilters({ ...initialFilters })}
                  className="bg-rose-600/5 cursor-pointer text-rose-600 px-4 h-11 text-sm hover:text-white hover:bg-rose-600 transition-all ease-in-out duration-300"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-4">
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
              {filters.institutional_setting && (
                <label className="block">
                  <span className="mb-1 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-slate-500">
                    <span>Min % of setting</span>
                    <span className="text-blue-700">
                      {filters.min_percent ? `${filters.min_percent}%` : "0%"}
                    </span>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={filters.min_percent || "0"}
                    onChange={(e) => setFilter("min_percent", e.target.value)}
                    className="w-full accent-blue-700"
                  />
                </label>
              )}
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
          </div>
          <DonationCard
          verticle={true}
            description="Residency Vibe is free for everyone. If it helped you prepare, consider a small donation to keep it running."
          />
        </div>

        <div className="flex-1 px-6 lg:px-0">
          <div className="w-full mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-2 pb-4 mb-8 sm:mb-0 border-b border-slate-100 sm:border-transparent">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setFiltersOpen((v) => !v)}
                className={`block px-4 h-11 text-sm font-medium border cursor-pointer transition-all ease-in-out duration-300 lg:hidden ${
                  filtersOpen || hasActiveFilters
                    ? "bg-blue-700 text-white border-transparent"
                    : "bg-white text-slate-700 border-slate-100"
                }`}
              >
                Filters {hasActiveFilters ? "●" : ""}
              </button>

              <div className="relative flex items-center">
                <select
                  value={filters.sort}
                  onChange={(e) => setFilter("sort", e.target.value)}
                  className="appearance-none border border-slate-100 bg-white font-medium h-11 pl-4 pr-8 text-sm text-slate-700 outline-none focus:border-slate-400 cursor-pointer"
                >
                  <option value="">Sort by</option>
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="star">Star rating</option>
                  <option value="frequency">Frequency</option>
                </select>
                <ArrowDown01Icon
                  size={16}
                  strokeWidth={2}
                  className="pointer-events-none absolute right-2 text-slate-500"
                />
              </div>
            </div>

            <div className="flex border border-slate-100 cursor-pointer">
              <button
                onClick={() => setView("grid")}
                className={`h-11 w-11 flex items-center justify-center text-sm cursor-pointer transition-all ease-in-out duration-300 ${view === "grid" ? "bg-blue-700/5 text-blue-700" : "bg-white text-slate-400"}`}
                title="Card view"
              >
                <LayoutGridIcon size={16} strokeWidth={2} />
              </button>
              <button
                onClick={() => setView("list")}
                className={`h-11 w-11 flex items-center justify-center text-sm cursor-pointer transition-all ease-in-out duration-300 ${view === "list" ? "bg-blue-700/5 text-blue-700" : "bg-white text-slate-400"}`}
                title="List view"
              >
                <ListViewIcon size={16} strokeWidth={2} />
              </button>
            </div>
          </div>

          {filtersOpen && (
            <div className="lg:hidden pb-8 border-b border-slate-100 mb-8 flex flex-col gap-4">
              <div className="flex items-center justify-between h-11">
                <h3 className="text-base font-semibold">Select Filter</h3>
                <div className="flex items-center gap-2">
                  {hasActiveFilters && (
                    <button
                      onClick={() => setFilters({ ...initialFilters })}
                      className="bg-rose-600/5 cursor-pointer text-rose-600 px-4 h-11 text-sm hover:text-white hover:bg-rose-600 transition-all ease-in-out duration-300"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    onClick={() => setFiltersOpen(false)}
                    className="bg-white border border-slate-300 h-11 w-11 flex items-center justify-center  text-slate-600 hover:bg-blue-700 hover:text-white transition-all ease-in-out duration-300"
                  >
                    <Cancel01Icon strokeWidth={2} size={20} />
                  </button>
                </div>
              </div>
              <div className="w-full flex flex-col gap-4">
                <ProgramSelect
                  label="Program"
                  value={filters.program}
                  onChange={(v) => setFilter("program", v)}
                  options={(meta?.programs || []).sort()}
                />

                <Select
                  label="Specialty"
                  value={filters.specialty}
                  onChange={(v) => setFilter("specialty", v)}
                  options={meta?.specialties || []}
                />
                <Select
                  label="Setting"
                  value={filters.institutional_setting}
                  onChange={(v) => setFilter("institutional_setting", v)}
                  options={meta?.institutional_settings || []}
                />
                {filters.institutional_setting && (
                  <label className="block">
                    <span className="mb-1 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-slate-500">
                      <span>Min % of setting</span>
                      <span className="text-blue-700">
                        {filters.min_percent ? `${filters.min_percent}%` : "0%"}
                      </span>
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={filters.min_percent || "0"}
                      onChange={(e) => setFilter("min_percent", e.target.value)}
                      className="w-full accent-blue-700"
                    />
                  </label>
                )}
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
            </div>
          )}
          

          {!user && (
             <div className="mb-6 bg-blue-50 px-4 text-center inline-block py-4 gap-1 text-sm text-slate-700">
              <Link href="/signup" className="font-semibold underline text-blue-700">
                Join now 
              </Link>
              to save questions, rate them, mark where you encountered them, and
              share answers.
            </div>
          )}

          {error && (
            <p className="mb-4 text-center bg-red-50 px-4 inline-block py-4 text-sm text-red-700">
              We are facing some issue loading questions.
            </p>
          )}
          
          
          <div className="w-full pb-8">
          {loading ? (
            <p className="py-8 text-center text-slate-700">
              Loading questions…
            </p>
          ) : questions.length === 0 ? (
            <p className="mb-4 text-center bg-slate-100 px-4 inline-block py-4 gap-1 text-sm text-slate-700">
              There are no questions matching your filters. Try adjusting the filers or <button className="font-semibold cursor-pointer underline text-blue-700" onClick={() => setShowAdd(true)}>add a question</button>
            </p>
          ) : view === "grid" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {questions.map((q, i) => (
                <Fragment key={q.id}>
                  <QuestionCard
                    question={q}
                    onToggleSave={user ? toggleSave : undefined}
                  />
                  {[2, 19, 49, 74].includes(i) && (
                    <div className="block lg:hidden sm:col-span-2">
                      <DonationCard
                        verticle={true}
                        description="Residency Vibe is free for everyone. If it helped you prepare, consider a small donation to keep it running."
                      />
                    </div>
                  )}
                </Fragment>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {questions.map((q, i) => (
                <Fragment key={q.id}>
                  <ListRow
                    q={q}
                    user={user}
                    onToggleSave={toggleSave}
                  />
                  {[2, 19, 49, 74].includes(i) && (
                    <div className="block lg:hidden py-4">
                      <DonationCard
                        verticle={true}
                        description="Residency Vibe is free for everyone. If it helped you prepare, consider a small donation to keep it running."
                      />
                    </div>
                  )}
                </Fragment>
              ))}
            </div>
          )}
          </div>
        </div>
      </div>

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

// =============================================== Additional Functions ==============================================

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
    <div className="flex items-start gap-3 px-4 py-6 bg-white">
      <Link href={`/questions/${q.id}`}   className="flex-1">
        <div className="text-xs text-slate-500 flex items-center gap-2">
          <CategoryBadge category={q.category} background={false}/>
          <span>|</span>
          <span className={`shrink-0 flex items-center gap-1 font-medium text-xs text-slate-700 hover:text-amber-600`}>
            <span>{Number(q.star).toFixed(1)}</span>
            <span>★</span>
          </span>
        </div>
        <h3 className="block leading-snug font-bold text-black">
          {q.text}
        </h3>
      </Link>
      
      

      {user && (
        <div className="flex gap-2">
          <Link
          href={`/questions/${q.id}`}
          className={`h-14 text-sm rounded-full px-4 hover:text-blue-700 flex items-center justify-center gap-1 border cursor-pointer font-medium transition-all ease-in-out duration-300 bg-white text-black border-slate-100 whitespace-nowrap`}
        >
          <Chatting01Icon size={16} strokeWidth={2} className="shrink-0" />
          {q.comment_count > 0
            ? `${q.comment_count}`
            : "0"}
        </Link>
        <button
          onClick={() => onToggleSave(q)}
          className={`h-14 w-14 text-sm rounded-full px-4 hover:text-blue-700 flex items-center justify-center gap-1 border cursor-pointer font-medium transition-all ease-in-out duration-300  ${q.saved ? "text-blue-700 border-blue-50 bg-blue-700/5" : "text-black border-slate-100 bg-white"}`}
            title={q.saved ? "Unsave" : "Save"}
        >
          <Bookmark02Icon size={16} strokeWidth={2} className="shrink-0" />
        </button>
        </div>
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
      className={`whitespace-nowrap px-4 h-14 font-medium transition-all ease-in-out duration-300 cursor-pointer border-b-2 ${
        active
          ? "text-blue-700 border-blue-700"
          : "text-slate-700 hover:bg-slate-50 border-transparent"
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
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <div className="relative w-full bg-white flex items-center">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none w-full font-medium h-11 pl-4 pr-8 text-sm text-slate-700 outline-none focus:border-slate-400 cursor-pointer"
        >
          <option value="">All</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <ArrowDown01Icon
          size={16}
          strokeWidth={2}
          className="pointer-events-none absolute right-2 text-slate-500"
        />
      </div>
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
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
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
        placeholder="Search program"
        className="w-full border border-slate-100 bg-white px-4 h-11 font-medium text-slate-700 text-sm outline-none focus:border-slate-100"
      />
      {open && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto border border-slate-100 bg-white shadow-lg">
          {filtered.length === 0 ? (
            <li className="px-4 py-2 text-sm text-slate-400">No matches</li>
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
                  className={`w-full px-4 h-11 flex items-center cursor-pointer justify-start text-left text-sm transition-all ease-in-out duration-300 hover:bg-slate-50 ${
                    o === value ? "bg-slate-50 font-medium" : ""
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
