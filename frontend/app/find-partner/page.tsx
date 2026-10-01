"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { PartnerRequest } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { Add01Icon, CaduceusIcon, Calendar04Icon, Mail02Icon, Refresh01Icon, SmartPhone01Icon, Time03Icon, TimeZoneIcon } from "hugeicons-react";

export default function FindPartnerPage() {
  const { user } = useAuth();
  const [wall, setWall] = useState<PartnerRequest[]>([]);
  const [mine, setMine] = useState<PartnerRequest[]>([]);
  const [tab, setTab] = useState<"browse" | "mine">("browse");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
        const [wData, mData] = await Promise.all([
          api.get<PartnerRequest[]>("/api/partners"),
          user ? api.get<PartnerRequest[]>("/api/partners/mine") : Promise.resolve([])
        ]);
        if (!cancelled) {
          setWall(wData);
          if (user) setMine(mData);
        }
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
  }, [user]);

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

  async function unapprove(r: PartnerRequest, participantUserId: string) {
    try {
      await api.post(`/api/partners/${r.id}/unapprove`, { user_id: participantUserId });
      await loadMine();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not unapprove participant");
    }
  }

  const pendingCount = mine.reduce(
    (sum, r) => sum + (r.interests?.filter((i) => i.status === "interested").length ?? 0),
    0
  );


  async function refresh() {
    setRefreshing(true);
    setError("");
    try {
      if (user) {
        const [wData, mData] = await Promise.all([
          api.get<PartnerRequest[]>("/api/partners"),
          api.get<PartnerRequest[]>("/api/partners/mine"),
        ]);
        setWall(wData);
        setMine(mData);
      } else {
        const wData = await api.get<PartnerRequest[]>("/api/partners");
        setWall(wData);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not refresh");
    } finally {
      setRefreshing(false);
    }
  }

  const profileComplete =
    !!user?.gender && !!user?.timezone && !!user?.phone;

  return (
    <div className="w-full min-h-screen">
      <div className="w-full bg-white">
        <div className="max-w-6xl mx-auto flex flex-col items-center justify-center gap-8 pt-25">
          <div className="flex flex-col gap-8 items-center justify-center px-6 lg:px-0">
            <div className="flex flex-col items-center justify-center gap-2">
              <h5 className="max-w-sm text-center font-semibold text-blue-700 text-xs uppercase tracking-wide">
                Practice Together
              </h5>
              <h1 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight text-black sm:text-5xl">
                Find Partner
              </h1>
            </div>
            <p className="max-w-xl text-center text-slate-600">
              Connect with other residents to practice interviews, exchange feedback, and build confidence together. Find a practice partner or join a session that fits your schedule.
            </p>
          </div>
{user ? (
          <div className="w-full px-6 flex items-center justify-center lg:px-0">
            <button
              onClick={() => setShowCreate(true)}
              className="cursor-pointer bg-blue-700/10 w-full sm:w-auto sm:px-8 h-14 flex items-center justify-center font-semibold text-blue-700 hover:bg-blue-800 hover:text-white transition-all ease-in-out duration-300 gap-2"
            >
              <Add01Icon size={20} strokeWidth={2} />
              <span>Create request</span>
            </button>
          </div>):(
              <div className="mb-6 bg-blue-50 px-4 text-center inline-block py-4 gap-1 text-sm text-slate-700">
          <Link href="/signup" className="font-semibold underline text-blue-700">
            Join now
          </Link>{" "}
          to create or participate in a partner session.
        </div>
          )}

          {user && !profileComplete && (
        <div className="mb-6 bg-amber-50 px-4 text-center inline-block py-4 gap-1 text-sm text-amber-700">
  Complete your{" "}
          <Link href="/account" className="font-semibold underline text-amber-700">
            profile
          </Link>{" "}
          (gender, timezone, phone) to create or join sessions.
        </div>
      )}
      <div className="flex items-center">
        <div className="flex gap-1">
          <Tab active={tab === "browse"} onClick={() => setTab("browse")}>
            Browse sessions
          </Tab>
          {user && (
            <Tab active={tab === "mine"} onClick={() => setTab("mine")}>
              My requests ({pendingCount})
            </Tab>
          )}
        </div>
      </div>
        </div>


      </div>

    

      {/* Tabs */}
      <div className="w-full mx-auto max-w-6xl flex gap-4 pt-8 px-4 flex items-center justify-between">
        <div>
          {tab === "browse" && (
          <h3 className="font-bold leading-snug text-black flex-1" >
            Browse sessions
          </h3>)}
          {user && tab === "mine" && (
            <h3 className="font-bold leading-snug text-black flex-1">
              My requests ({pendingCount})
            </h3>
          )}
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="flex items-center gap-2 border border-slate-100 bg-gray-100 px-8 h-14 text-sm text-slate-700 hover:bg-blue-700 hover:text-white cursor-pointer disabled:opacity-60 transition-all ease-in-out duration-300"
        >
          <Refresh01Icon size={20} strokeWidth={2} className={refreshing ? "animate-spin" : ""} />
          <span>
          {refreshing ? "Refreshing" : "Refresh"}
          </span>
        </button>
      </div>

      <div className="w-full mx-auto max-w-3xl gap-4 pt-8 px-4 pb-16">
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
                onUnapprove={(uid) => unapprove(r, uid)}
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
  const contactVisible = user && (r.my_interest === "approved");

  return (
    <div className="flex justify-between flex-col border border-slate-100 bg-white px-6 py-6 transition-all ease-in-out duration-300 hover:bg-gray-100 hover:border-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-black">@{r.creator_username}</span>
          <span className="text-sm text-slate-400">•</span>
          {r.gender && <span className="text-sm text-slate-700">{r.gender}</span>}
        </div>
        <span className="text-sm text-blue-700 font-medium">
          {r.interested_count}/{r.max_participants} interested
        </span>
      </div>

      <div className="w-full mt-4 flex flex-wrap gap-2 text-xs text-slate-700 font-medium">
        <div className="flex items-center justify-center sm:justify-start gap-2 h-11 bg-gray-50 px-4 flex-1 whitespace-nowrap">
          <Calendar04Icon size={16} strokeWidth={2}/>
          <span>{r.session_date}</span>
        </div>
        <div className="flex items-center justify-center sm:justify-start gap-2 h-11 bg-gray-50 px-4 flex-1 whitespace-nowrap">
          <Time03Icon size={16} strokeWidth={2}/>
          <span>{r.session_time}</span>
        </div>
        <div className="flex items-center justify-center sm:justify-start gap-2 h-11 bg-gray-50 px-4 flex-1 whitespace-nowrap">
          <TimeZoneIcon size={16} strokeWidth={2}/>
          <span>{r.timezone}</span>
        </div>
        {r.specialty &&
        <div className="flex items-center justify-center sm:justify-start gap-2 h-11 bg-gray-50 px-4 flex-1 whitespace-nowrap">
          <CaduceusIcon size={16} strokeWidth={2}/>
          <span>{r.specialty}</span>
        </div>}
      </div>

      {r.notes && 
      <div className="w-full mt-4 inline-flex gap-2 items-start">
  <span className="text-sm text-slate-400 font-medium">Note:</span>
  <p className="text-sm text-slate-700 font-medium">{r.notes}</p>
</div>
      }

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        {r.my_interest ? (
          <span className={`h-11 text-sm rounded-full px-4  flex items-center justify-center gap-1 border cursor-pointer font-medium transition-all ease-in-out duration-300 ${r.my_interest === "approved" ? "bg-white text-blue-700 border-blue-100" : "bg-gray-50 text-slate-400 border-slate-100"}`}>
            {r.my_interest === "approved" ? "Approved" : "Interested"}
          </span>
        ) : r.is_mine ? (
          <span className="h-11 text-sm rounded-full px-4 flex items-center justify-center gap-1 border cursor-pointer font-medium transition-all ease-in-out duration-300 bg-white text-black border-slate-100">
            Your session
          </span>
        ) : canJoin ? (
          <button
            onClick={onInterested}
            className="h-11 text-sm rounded-full px-4 text-blue-700 flex items-center justify-center gap-1 border cursor-pointer font-medium transition-all ease-in-out duration-300 bg-white border-slate-100"
          >
            I&apos;m interested
          </button>
        ) : user && !profileComplete ? (
          <span className="h-11 text-sm rounded-full px-4 flex items-center justify-center gap-1 border cursor-pointer font-medium transition-all ease-in-out duration-300 bg-white text-amber-600 border-slate-100">Complete profile to join</span>
        ) : null}

      </div>
        {contactVisible && r.creator_email && (
          <div className="mt-4 flex flex-col items-center gap-8 sm:gap-4 text-sm text-slate-600 border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2 w-full">
            <span>{r.creator_name}</span>
            <span className="text-slate-400">{r.creator_email}</span>
            {r.creator_phone && <span className="text-slate-400">{r.creator_phone}</span>}
            </div>

            <div className="flex items-center justify-between gap-2 w-full">
                      {r.creator_email && (
                        <a
                          href={`mailto:${r.creator_email}?subject=${encodeURIComponent("Find Partner: mock interview session")}`}
                          className="h-11 text-sm rounded-full px-4 text-blue-700 flex items-center justify-center gap-1 border cursor-pointer font-medium transition-all ease-in-out duration-300 bg-white border-slate-100 w-full"
                        >
                          Email
                        </a>
                      )}
                      {r.creator_phone && (
                        <a
                          href={`https://wa.me/${r.creator_phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="h-11 text-sm rounded-full px-4 text-emerald-700 flex items-center justify-center gap-1 border cursor-pointer font-medium transition-all ease-in-out duration-300 bg-white border-slate-100 w-full"
                        >
                          WhatsApp
                        </a>
                      )}
                      </div>
      
          </div>
        )}
    </div>
  );
}

function MyRequestCard({
  r,
  onApprove,
  onUnapprove,
  onDelete,
}: {
  r: PartnerRequest;
  onApprove: (userId: string) => void;
  onUnapprove: (userId: string) => void;
  onDelete: () => void;
}) {
  const approvedCount = r.interests?.filter((i) => i.status === "approved").length ?? 0;
  const slotsLeft = r.max_participants - approvedCount;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">

      <div className="w-full flex items-center justify-between">
        <h4 className="text-sm text-slate-900 font-medium">Interested ({r.interested_count}/{r.max_participants})</h4>
        <button
          onClick={onDelete}
          className="h-11 text-sm px-4 text-rose-600 flex items-center justify-center gap-1 cursor-pointer font-medium transition-all ease-in-out duration-300 bg-rose-600/5"
        >
          Delete
        </button>
      </div>

        

        <div className="w-full mt-4 flex flex-wrap gap-2 text-xs text-slate-700 font-medium">
        <div className="flex items-center justify-center sm:justify-start gap-2 h-11 bg-gray-50 px-4 flex-1 whitespace-nowrap">
          <Calendar04Icon size={16} strokeWidth={2}/>
          <span>{r.session_date}</span>
        </div>
        <div className="flex items-center justify-center sm:justify-start gap-2 h-11 bg-gray-50 px-4 flex-1 whitespace-nowrap">
          <Time03Icon size={16} strokeWidth={2}/>
          <span>{r.session_time}</span>
        </div>
        <div className="flex items-center justify-center sm:justify-start gap-2 h-11 bg-gray-50 px-4 flex-1 whitespace-nowrap">
          <TimeZoneIcon size={16} strokeWidth={2}/>
          <span>{r.timezone}</span>
        </div>
        {r.specialty &&
        <div className="flex items-center justify-center sm:justify-start gap-2 h-11 bg-gray-50 px-4 flex-1 whitespace-nowrap">
          <CaduceusIcon size={16} strokeWidth={2}/>
          <span>{r.specialty}</span>
        </div>}
      </div>


      <div className="mt-8">
        <span className="text-sm font-medium tracking-wide text-slate-500">
          Participants
          {slotsLeft > 0 && <span className="ml-2 text-emerald-700">{slotsLeft} slot{slotsLeft > 1 ? "s" : ""} left</span>}
        </span>

        {!r.interests || r.interests.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400 text-center py-4 w-full bg-slate-50 px-4">No one interested yet.</p>
        ) : (
          <div className="mt-2 flex flex-col gap-2">
            {r.interests.map((i) => (
              <div
                key={i.id}
                className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-4 py-4 gap-8 lg:gap-2"
              >
                <div className="text-sm w-full">
                  <div className="flex flex-wrap items-center gap-1 w-full">
                    <span className="font-medium text-black">
                      {i.status === "approved" && i.full_name ? i.full_name : ``}
                    </span>
                    <span className="text-slate-700">@{i.username}</span>
                    {i.gender && <span className="text-slate-700">· {i.gender}</span>}
                    {i.specialty && <span className="text-slate-700">· {i.specialty}</span>}
                    {i.timezone && <span className="text-slate-700">· {i.timezone}</span>}
                  </div>
                  {i.status === "approved" && (
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-700">
                      {i.email &&
                      <div className="flex items-center justify-center sm:justify-start gap-2 h-11 bg-gray-100 px-4 flex-1 whitespace-nowrap">
                        <Mail02Icon size={16} strokeWidth={2}/>
                        <span>{i.email}</span>
                      </div>
                      }
                      {i.phone &&
                      <div className="flex items-center justify-center sm:justify-start gap-2 h-11 bg-gray-100 px-4 flex-1 whitespace-nowrap">
                        <SmartPhone01Icon size={16} strokeWidth={2}/>
                        <span>{i.phone}</span>
                      </div>}

                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-8 lg:gap-2 w-full mt-4">
                  {i.status === "approved" ? (
                    <div className="w-full flex items-center justify-between gap-4 lg:gap-2 flex-wrap w-full">

                      <div className="flex items-center justify-between gap-2 w-full lg:w-auto">
                      {i.email && (
                        <a
                          href={`mailto:${i.email}?subject=${encodeURIComponent("Find Partner: mock interview session")}`}
                          className="h-11 text-sm rounded-full px-4 text-blue-700 flex items-center justify-center gap-1 border cursor-pointer font-medium transition-all ease-in-out duration-300 bg-white border-slate-100 w-full lg:w-auto"
                        >
                          Email
                        </a>
                      )}
                      {i.phone && (
                        <a
                          href={`https://wa.me/${i.phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="h-11 text-sm rounded-full px-4 text-emerald-700 flex items-center justify-center gap-1 border cursor-pointer font-medium transition-all ease-in-out duration-300 bg-white border-slate-100 w-full lg:w-auto"
                        >
                          WhatsApp
                        </a>
                      )}
                      </div>

                      <button
                        onClick={() => onUnapprove(i.user_id)}
                        className="bg-amber-600/5 px-4 h-11 text-sm font-medium hover:bg-amber-600 text-amber-600 hover:text-white cursor-pointer disabled:cursor-not-allowed transition-all ease-in-out duration-300 w-full lg:w-auto"
                        title="Free up a slot"
                      >
                        Unapprove
                      </button>

                    </div>
                  ) : (
                    <button
                      onClick={() => onApprove(i.user_id)}
                      disabled={slotsLeft <= 0}
                      className="bg-blue-700 px-4 h-11 text-sm font-medium hover:bg-blue-800 text-white cursor-pointer disabled:cursor-not-allowed transition-all ease-in-out duration-300 disabled:opacity-40 w-full lg:w-auto"
                    >
                      {slotsLeft > 0 ? "Approve" : "No slots"}
                    </button>
                  )}
                </div>
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