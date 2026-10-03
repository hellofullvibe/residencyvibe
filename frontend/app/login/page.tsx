"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { track } from "@/lib/analytics";

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.post("/api/auth/login", { email, password });
      track("login");
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
Welcome back
              </h1>
      <p className="mx-auto mt-2 max-w-xl w-full text-center text-slate-600">
Sign in to your account.
            </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4 w-full max-w-md mx-auto">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@example.com"
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Password</span>
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            className={inputCls}
          />
        </label>

        {error && (
          <p className="mb-4 text-center bg-red-50 px-4 inline-block py-4 text-sm text-red-700">We are facing some issue loading questions.</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="bg-blue-700 w-full cursor-pointer sm:px-8 h-14 flex items-center justify-center font-semibold text-white hover:bg-blue-800 transition-all ease-in-out duration-300 disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Sign In"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        New here?{" "}
        <Link href="/signup" className="font-medium text-slate-900 hover:underline">
          Join Community Now
        </Link>
      </p>
    </div>
  );
}

const inputCls =
  "appearance-none w-full border border-slate-100 bg-white px-4 py-4 text-sm outline-none focus:border-slate-500";