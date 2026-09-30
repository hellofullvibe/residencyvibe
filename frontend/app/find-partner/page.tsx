"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { PartnerRequest } from "@/lib/types";
import { useAuth } from "@/lib/auth";

export default function FindPartnerPage() {
  const { user } = useAuth();
  const [wall, setWall] = useState<PartnerRequest[]>([]);
  const [mine, setMine] = useState<PartnerRequest[]>([]);
  const [tab, setTab] = useState<"browse" | "mine">("browse");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const loadWall = useCallback(async () => {
    try {
      const data = await api.get<PartnerRequest[]>("/api/partners");
      setWall(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load sessions");
    }
  }, []);

  const loadMine = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.get<PartnerRequest[]>("/api/partners/mine");
      setMine(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load your sessions");
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        const data = await api.get<PartnerRequest[]>("/api/partners");
        if (!cancelled) setWall(data);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof ApiError ? err.message : "Could not load sessions");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    start();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (tab !== "mine" || !user) return;
    let cancelled = false;
    async function start() {
      try {
        const data = await api.get<PartnerRequest[]>("/api/partners/mine");
        if (!cancelled) setMine(data);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof ApiError ? err.message : "Could not load your sessions");
      }
    }
    start();
    return () => {
      cancelled = true;
    };
  }, [tab, user]);

  async function expressInterest(r: PartnerRequest) {
    if (!user) return;
    try {
      const updated = await api.post<PartnerRequest>(`/api/partners/${r.id}/interested`);
      setWall((ws) => ws.map((w) => (w.id === r.id ? updated : w)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit interest");
    }
  }

  async function approve(r: PartnerRequest, participantUserId: string) {
    try {
      await api.post(`/api/partners/${r.id}/approve`, { user_id: participantUserId });
      await loadMine();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not approve participant");
    }
  }

  async function remove(r: PartnerRequest) {
    try {
      await api.del(`/api/partners/${r.id}`);
      setMine((ms) => ms.filter((m) => m.id !== r.id));
      await loadWall();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete session");
    }
  }

  const profileComplete =
    !!user?.gender && !!user?.timezone && !!user?.phone;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Find Partner</h1>
          <p className="text-sm text-slate-600">
            Meet residents to practice interviews together.
          </p>
        </div>
        {user && (
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            + Create request
          </button>
        )}
      </div>

      {!user && (
        <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          <Link href="/signup" className="font-medium underline">
            Create an account
          </Link>{" "}
          to create or join a partner session.
        </div>
      )}

      {user && !profileComplete && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Complete your{" "}
          <Link href="/account" className="font-medium underline">
            profile
          </Link>{" "}
          (gender, timezone, phone) to create or join sessions.
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-1">
        <Tab active={tab === "browse"} onClick={() => setTab("browse")}>
          Browse sessions
        </Tab>
        {user && (
          <Tab active={tab === "mine"} onClick={() => setTab("mine")}>
            My requests
          </Tab>
        )}
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {loading ? (
        <p className="py-10 text-center text-slate-500">Loading…</p>
      ) : tab === "browse" ? (
        wall.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 py-16 text-center text-sm text-slate-500">
            No sessions yet. Be the first to create one!
          </p>
        ) : (
          <div className="space-y-4">
            {wall.map((r) => (
              <WallCard
                key={r.id}
                r={r}
                user={user}
                profileComplete={profileComplete}
                onInterested={() => expressInterest(r)}
              />
            ))}
          </div>
        )
      ) : (
        <div className="space-y-4">
          {mine.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 py-16 text-center text-sm text-slate-500">
              You haven&apos;t created any sessions yet.
            </p>
          ) : (
            mine.map((r) => (
              <MyRequestCard
                key={r.id}
                r={r}
                onApprove={(uid) => approve(r, uid)}
                onDelete={() => remove(r)}
              />
            ))
          )}
        </div>
      )}

      {showCreate && (
        <CreateModal
          user={user}
          onClose={() => setShowCreate(false)}
          onCreated={(r) => {
            setShowCreate(false);
            setWall((ws) => [r, ...ws]);
            setTab("browse");
          }}
        />
      )}
    </div>
  );
}

function WallCard({
  r,
  user,
  profileComplete,
  onInterested,
}: {
  r: PartnerRequest;
  user: ReturnType<typeof useAuth>["user"];
  profileComplete: boolean;
  onInterested: () => void;
}) {
  const canJoin = user && profileComplete && !r.is_mine && !r.my_interest;
  const contactVisible = user && (r.my_interest || r.is_mine);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900">@{r.creator_username}</span>
          {r.gender && <span className="text-sm text-slate-500">{r.gender}</span>}
        </div>
        <span className="text-sm text-slate-500">
          {r.interested_count}/{r.max_participants} interested
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
        <span>🗓 {r.session_date}</span>
        <span>🕐 {r.session_time}</span>
        <span>🌍 {r.timezone}</span>
        {r.specialty && <span>⚕ {r.specialty}</span>}
      </div>

      {r.notes && <p className="mt-2 text-sm text-slate-700">{r.notes}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        {r.my_interest ? (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
            {r.my_interest === "approved" ? "Approved" : "Interested"}
          </span>
        ) : r.is_mine ? (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            Your session
          </span>
        ) : canJoin ? (
          <button
            onClick={onInterested}
            className="rounded-lg bg-blue-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-800"
          >
            I&apos;m interested
          </button>
        ) : user && !profileComplete ? (
          <span className="text-xs text-amber-700">Complete profile to join</span>
        ) : null}

        {contactVisible && r.creator_email && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span>{r.creator_name}</span>
            <span className="text-slate-400">{r.creator_email}</span>
            {r.creator_phone && <span className="text-slate-400">{r.creator_phone}</span>}
            <a
              href={`mailto:${r.creator_email}?subject=${encodeURIComponent("Find Partner: mock interview session")}`}
              className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Email
            </a>
            {r.creator_phone && (
              <a
                href={`https://wa.me/${r.creator_phone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
              >
                WhatsApp
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MyRequestCard({
  r,
  onApprove,
  onDelete,
}: {
  r: PartnerRequest;
  onApprove: (userId: string) => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium text-slate-900">
          <span>🗓 {r.session_date}</span>
          <span>🕐 {r.session_time}</span>
          <span>🌍 {r.timezone}</span>
        </div>
        <button
          onClick={onDelete}
          className="rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50"
        >
          Delete
        </button>
      </div>

      <div className="mt-3">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Interested ({r.interested_count}/{r.max_participants})
        </span>
        {!r.interests || r.interests.length === 0 ? (
          <p className="mt-1 text-sm text-slate-500">No one interested yet.</p>
        ) : (
          <div className="mt-2 space-y-2">
            {r.interests.map((i) => (
              <div
                key={i.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2"
              >
                <div className="text-sm">
                  <span className="font-medium text-slate-900">{i.full_name}</span>{" "}
                  <span className="text-slate-500">@{i.username}</span>
                  {i.gender && <span className="ml-2 text-slate-500">{i.gender}</span>}
                  {i.timezone && <span className="ml-2 text-slate-500">{i.timezone}</span>}
                </div>
                {i.status === "approved" ? (
                  <span className="rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-medium text-emerald-800">
                    Approved
                  </span>
                ) : (
                  <button
                    onClick={() => onApprove(i.user_id)}
                    className="rounded-md bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-800"
                  >
                    Approve
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateModal({
  user,
  onClose,
  onCreated,
}: {
  user: ReturnType<typeof useAuth>["user"];
  onClose: () => void;
  onCreated: (r: PartnerRequest) => void;
}) {
  const [form, setForm] = useState({
    session_date: new Date().toISOString().slice(0, 10),
    session_time: "18:00",
    timezone: user?.timezone ?? "",
    max_participants: "2",
    notes: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const complete = !!user?.gender && !!user?.timezone && !!user?.phone;

  if (!complete) {
    return (
      <ModalShell title="Create a request" onClose={onClose}>
        <p className="text-sm text-slate-600">
          Complete your{" "}
          <Link href="/account" className="font-medium text-slate-900 underline">
            profile
          </Link>{" "}
          (gender, timezone, phone) before creating a session.
        </p>
      </ModalShell>
    );
  }

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const r = await api.post<PartnerRequest>("/api/partners", {
        session_date: form.session_date,
        session_time: form.session_time,
        timezone: form.timezone,
        max_participants: Number(form.max_participants),
        notes: form.notes.trim() || undefined,
      });
      onCreated(r);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create session");
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500";

  return (
    <ModalShell title="Create a partner request" onClose={onClose}>
      {/* Profile summary pulled from the account */}
      <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <p className="font-medium text-slate-900">{user?.full_name} (@{user?.username})</p>
        <p>{user?.gender} · {user?.timezone}</p>
        <p>{user?.email} · {user?.phone}</p>
        {user?.specialty && <p>Specialty: {user?.specialty}</p>}
      </div>

      <form onSubmit={submit} className="mt-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <input
              type="date"
              required
              value={form.session_date}
              onChange={(e) => set("session_date", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Time">
            <input
              type="time"
              required
              value={form.session_time}
              onChange={(e) => set("session_time", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Timezone">
            <input
              required
              value={form.timezone}
              onChange={(e) => set("timezone", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Number of participants">
            <select
              value={form.max_participants}
              onChange={(e) => set("max_participants", e.target.value)}
              className={inputCls}
            >
              {["2", "3", "4"].map((n) => (
                <option key={n} value={n}>
                  {n} people
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Notes (optional)">
          <textarea
            rows={3}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="e.g. Behavioral questions, 45 min session"
            className={inputCls}
          />
        </Field>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {submitting ? "Creating…" : "Submit request"}
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
      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-slate-900 text-white"
          : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
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