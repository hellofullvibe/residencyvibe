"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Meta, Question } from "@/lib/types";
import { useAuth } from "@/lib/auth";

export default function AddQuestionModal({
  meta,
  onClose,
  onCreated,
}: {
  meta: Meta | null;
  onClose: () => void;
  onCreated: (q: Question) => void;
}) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    text: "",
    variants: "",
    category: meta?.categories?.[0] || "About You",
    specialty: "",
    program: "",
    institutional_setting: "",
    frequency: "",
    year: String(new Date().getFullYear()),
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!user) {
    return (
      <ModalShell title="Add a question" onClose={onClose}>
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
    if (form.program) body.program = form.program;
    if (form.institutional_setting) body.institutional_setting = form.institutional_setting;
    if (form.frequency) body.frequency = form.frequency;
    if (form.year) body.year = Number(form.year);
    try {
      const q = await api.post<Question>("/api/questions", body);
      onCreated(q);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add question");
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500";

  return (
    <ModalShell title="Add a question" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-3">
        <Field label="Question *">
          <textarea
            required
            rows={3}
            value={form.text}
            onChange={(e) => set("text", e.target.value)}
            placeholder="Tell me about yourself?"
            className={inputCls}
          />
        </Field>
        <Field label="Variants (one per line)">
          <textarea
            rows={3}
            value={form.variants}
            onChange={(e) => set("variants", e.target.value)}
            placeholder={"Tell me about your hometown\nTell me about your family"}
            className={inputCls}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
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
              <option value="">—</option>
              {(meta?.specialties || []).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Program">
            <input
              value={form.program}
              onChange={(e) => set("program", e.target.value)}
              placeholder="e.g. SUNY Downstate"
              className={inputCls}
            />
          </Field>
          <Field label="Institutional setting">
            <select
              value={form.institutional_setting}
              onChange={(e) => set("institutional_setting", e.target.value)}
              className={inputCls}
            >
              <option value="">—</option>
              {(meta?.institutional_settings || []).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Frequency">
            <select
              value={form.frequency}
              onChange={(e) => set("frequency", e.target.value)}
              className={inputCls}
            >
              <option value="">—</option>
              {(meta?.frequencies || []).map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Year">
            <input
              type="number"
              value={form.year}
              onChange={(e) => set("year", e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {submitting ? "Adding…" : "Add question"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
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
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}