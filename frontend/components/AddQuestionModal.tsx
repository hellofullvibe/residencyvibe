"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Meta, Question } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import ProgramPicker from "@/components/ProgramPicker";
import type { ProgramOption } from "@/components/ProgramPicker";
import { ArrowDown01Icon, Cancel01Icon } from "hugeicons-react";

export default function AddQuestionModal({
  meta,
  onClose,
  onCreated,
  editQuestion,
  onUpdated,
}: {
  meta: Meta | null;
  onClose: () => void;
  onCreated: (q: Question) => void;
  editQuestion?: Question | null;
  onUpdated?: (q: Question) => void;
}) {
  const { user } = useAuth();

  const initial = (() => {
    if (editQuestion) {
      const positive = (editQuestion.settings || []).filter((s) => s.count > 0);
      const percentage: Record<string, string> = {};
      (editQuestion.settings || []).forEach((s) => {
        if (s.count > 0) percentage[s.setting] = String(s.count);
      });
      return {
        text: editQuestion.text,
        variants: (editQuestion.variants || []).join("\n"),
        category: editQuestion.category,
        specialty: editQuestion.specialty ?? "",
        frequency: editQuestion.frequency ?? "",
        year: editQuestion.year ? String(editQuestion.year) : String(new Date().getFullYear()),
        settingsType: (positive.length === 1 ? "direct" : "percentage") as "direct" | "percentage",
        directSetting: positive.length === 1 ? positive[0].setting : "",
        percentage,
      };
    }
    return {
      text: "",
      variants: "",
      category: meta?.categories?.[0] || "About You",
      specialty: "",
      frequency: "",
      year: String(new Date().getFullYear()),
      settingsType: "direct" as "direct" | "percentage",
      directSetting: "",
      percentage: {} as Record<string, string>,
    };
  })();

  const initialPrograms: ProgramOption[] = (() => {
    if (editQuestion) {
      const progNames =
        editQuestion.programs?.length > 0
          ? editQuestion.programs
          : editQuestion.program
            ? [editQuestion.program]
            : [];
      return progNames.map((n) => ({ name: n }));
    }
    return [];
  })();

  const [form, setForm] = useState(initial);
  const [programOptions, setProgramOptions] = useState<ProgramOption[]>(initialPrograms);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!user) {
    return (
<ModalShell
      title={editQuestion ? "Edit question" : "Add a question"}
      onClose={onClose}
    >
        <p className="text-sm text-slate-600">
          You need an account to add questions.{" "}
          <a href="/signup" className="font-medium text-slate-900 underline">
            Sign up
          </a>{" "}
          or{" "}
          <a href="/login" className="font-medium text-slate-900 underline">
            sign in
          </a>
          .
        </p>
      </ModalShell>
    );
  }

  function set<K extends keyof typeof form>(k: K, v: string | number) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const variants = form.variants
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const body: Record<string, unknown> = {
      text: form.text.trim(),
      variants,
      category: form.category,
    };
    if (form.specialty) body.specialty = form.specialty;
    body.programs = programOptions.map((p) => p.name);
    if (form.frequency) body.frequency = form.frequency;
    if (form.year) body.year = Number(form.year);
    if (form.settingsType === "direct") {
      if (form.directSetting) {
        body.settings = { type: "direct", setting: form.directSetting };
      }
    } else {
      const values: Record<string, number> = {};
      Object.entries(form.percentage).forEach(([k, v]) => {
        const n = Number(v);
        if (v.trim() && !isNaN(n) && n > 0) values[k] = n;
      });
      body.settings = { type: "percentage", values };
    }
    try {
      if (editQuestion) {
        const q = await api.put<Question>(`/api/questions/${editQuestion.id}`, body);
        onUpdated?.(q);
      } else {
        const q = await api.post<Question>("/api/questions", body);
        onCreated(q);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add question");
      setSubmitting(false);
    }
  }

  const inputCls =
    "appearance-none w-full border border-slate-100 bg-white px-4 py-4 text-sm outline-none focus:border-slate-500";

  return (
    <ModalShell title="Add a question" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4 overflow-x-auto max-h-[640px]">
        <Field label="What was the Question?" arrowIcon = {false}>
          <textarea
            required
            rows={3}
            value={form.text}
            onChange={(e) => set("text", e.target.value)}
            placeholder="Write the question here"
            className={inputCls}
          />
        </Field>
        <Field label="Question Variants (one per line)" arrowIcon = {false}>
          <textarea
            rows={3}
            value={form.variants}
            onChange={(e) => set("variants", e.target.value)}
            placeholder={"Write the variant of the question here"}
            className={inputCls}
          />
        </Field>
        <div className="grid grid-cols-1 gap-2">
          <Field label="Category">
            <select
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              className={inputCls}
            >
              {(meta?.categories || []).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Specialty">
            <select
              value={form.specialty}
              onChange={(e) => set("specialty", e.target.value)}
              className={inputCls}
            >
              <option value="">Select Specialty</option>
              {(meta?.specialties || []).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Program " arrowIcon= {false}>
            <ProgramPicker
              multi
              value={programOptions}
              onChange={(v) => setProgramOptions((v as ProgramOption[]) ?? [])}
            />
          </Field>
          <Field label="Settings" arrowIcon={false}>            
            <div className="flex w-full">
              {(["direct", "percentage"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set("settingsType", t)}
                  className={`flex-1 px-4 h-11 text-sm font-medium transition-colors duration-300 ease-in-out cursor-pointer ${
                    form.settingsType === t
                      ? "bg-blue-700/10 text-blue-700"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {t === "direct" ? "Direct" : "Percentage"}
                </button>
              ))}
            </div>
          </Field>
            {form.settingsType === "direct" ? (
              <Field label="">

              
              <select
                value={form.directSetting}
                onChange={(e) => set("directSetting", e.target.value)}
                className={inputCls}
              >
                <option value="">Select Setting</option>
                {(meta?.institutional_settings || []).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              </Field>
            ) : (
<Field label="" arrowIcon={false}>
              <div className="space-y-2 w-full p-4 font-medium">
                {(meta?.institutional_settings || []).map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <span className="flex-1 text-xs text-slate-600">{s}</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={form.percentage[s] ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          percentage: { ...f.percentage, [s]: e.target.value },
                        }))
                      }
                      placeholder="0"
                      className="w-16 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-right text-sm outline-none focus:border-blue-500"
                    />
                    <span className="text-xs text-slate-400">%</span>
                  </div>
                ))}
              </div>
              </Field>
            )
            }

          <Field label="Frequency">
            <select
              value={form.frequency}
              onChange={(e) => set("frequency", e.target.value)}
              className={inputCls}
            >
              <option value="">Select Frequency</option>
              {(meta?.frequencies || []).map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Year" arrowIcon = {false}>
            <input
              type="number"
              value={form.year}
              onChange={(e) => set("year", e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        {error && (
          <p className="mb-4 text-center bg-red-50 px-4 inline-block py-4 text-sm text-red-700">We are facing some issue loading questions.</p>
        )}

        <div className="flex gap-2 py-4">
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-700 w-full cursor-pointer sm:px-8 h-14 flex items-center justify-center font-semibold text-white hover:bg-blue-800 transition-all ease-in-out duration-300 disabled:opacity-60"
          >
            {submitting ? "Saving…" : editQuestion ? "Save changes" : "Add question"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="bg-white w-full cursor-pointer sm:px-8 h-14 flex items-center justify-center font-semibold text-blue-700 hover:bg-gray-100 transition-all ease-in-out duration-300"
          >
            Cancel
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white px-6 py-8 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="cursor-pointer h-11 w-11 flex items-center justify-center text-slate-400 transition-all ease-in-out duration-300 hover:bg-slate-100 hover:text-blue-700"
            aria-label="Close"
          >
            <Cancel01Icon size={20} strokeWidth={2} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children, arrowIcon= true }: { label: string; children: React.ReactNode, arrowIcon?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <div className="relative w-full bg-white flex items-center  border border-slate-100">
        {children}
      {arrowIcon && <ArrowDown01Icon
          size={16}
          strokeWidth={2}
          className="pointer-events-none absolute right-2 text-slate-400"
        />}
        </div>
    
    </label>
  );
}