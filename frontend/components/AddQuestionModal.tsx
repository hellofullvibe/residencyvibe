"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Meta, Question } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { ArrowDown01Icon, Cancel01Icon } from "hugeicons-react";

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
          <Field label="Program" arrowIcon = {false}>
            <input
              value={form.program}
              onChange={(e) => set("program", e.target.value)}
              placeholder="Write full program name"
              className={inputCls}
            />
          </Field>
          <Field label="Institutional setting">
            <select
              value={form.institutional_setting}
              onChange={(e) => set("institutional_setting", e.target.value)}
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
            {submitting ? "Adding…" : "Add question"}
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