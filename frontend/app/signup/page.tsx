"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { track } from "@/lib/analytics";

export default function SignupPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    username: "",
    password: "",
    confirm_password: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.post("/api/auth/signup", form);
      track("sign_up");
      await refresh();
      router.push("/questions");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full bg-white flex-col px-12 sm:px-6 py-16 min-h-screen">
<h1 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight text-black sm:text-5xl">
Join Community
              </h1>

              <p className="mx-auto mt-2 max-w-2xl w-full text-center text-slate-600">
Join the residency vibe community and improve your interview preparation.
            </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4 w-full max-w-md mx-auto">
        <Field label="Full name">
          <input
            required
            value={form.full_name}
            onChange={(e) => set("full_name", e.target.value)}
            placeholder="Jane Smith"
            className={inputCls}
          />
        </Field>
        <Field label="Email">
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="jane@example.com"
            className={inputCls}
          />
        </Field>
        <Field label="Username">
          <input
            required
            value={form.username}
            onChange={(e) => set("username", e.target.value)}
            placeholder="jsmith"
            className={inputCls}
          />
        </Field>
        <Field label="Password">
          <input
            required
            type="password"
            minLength={6}
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            placeholder="At least 6 characters"
            className={inputCls}
          />
        </Field>
        <Field label="Confirm password">
          <input
            required
            type="password"
            value={form.confirm_password}
            onChange={(e) => set("confirm_password", e.target.value)}
            placeholder="Repeat your password"
            className={inputCls}
          />
        </Field>

        {error && (
          <p className="mb-4 text-center bg-red-50 px-4 inline-block py-4 text-sm text-red-700">We are facing some issue loading questions.</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="bg-blue-700 w-full cursor-pointer sm:px-8 h-14 flex items-center justify-center font-semibold text-white hover:bg-blue-800 transition-all ease-in-out duration-300 disabled:opacity-60"
        >
          {submitting ? "Joining…" : "Join Now"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-slate-900 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

const inputCls =
  "appearance-none w-full border border-slate-100 bg-white px-4 py-4 text-sm outline-none focus:border-slate-500";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}