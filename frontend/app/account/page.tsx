"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { User } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import DonationCard from "@/components/DonationCard";
import { ArrowDown01Icon } from "hugeicons-react";

export default function AccountPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  if (loading || !user) return <p className="py-16 text-center text-slate-500">Loading…</p>;

  async function deleteAccount() {
    setDeleting(true);
    setError("");
    try {
      await api.del("/api/account");
      await logout();
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete account");
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Account</h1>

      <div className="mt-6 border border-slate-200 bg-white p-6">
        <h2 className="mb-2 font-bold leading-snug text-black flex-1">
          Profile
        </h2>
        <dl className="mt-4 space-y-3 text-sm">
          <Row label="Full name" value={user.full_name} />
          <Row label="Email" value={user.email} />
          <Row label="Username" value={`@${user.username}`} />
          <Row
            label="Member since"
            value={new Date(user.created_at).toLocaleDateString()}
          />
        </dl>
      </div>

      <ProfileForm user={user} onError={setError} />

      <div className="mt-6">
        <DonationCard
          description="ResidencyPrep is free for everyone. If it helped you prepare, consider a small donation to keep it running."
        />
      </div>
    

      <div className="mt-6">
        <button
          onClick={async () => {
            await logout();
            router.push("/");
          }}
          className="w-full bg-amber-600/10 px-4 py-3 font-semibold text-amber-600 hover:bg-amber-800/10 cursor-pointer transition-all ease-in-out duration-300"
        >
          Sign out
        </button>
      </div>

      <div className="mt-16 border border-rose-200 bg-rose-600/10 p-6 cursor-pointer transition-all ease-in-out duration-300">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-red-600">
          Danger zone
        </h2>
        <p className="mt-3 text-sm text-black">
          Deleting your account permanently removes your profile, comments, encounters, and
          saved questions. This cannot be undone.
        </p>

        {error && (
          <p className="mb-4 text-center bg-red-50 px-4 inline-block py-4 text-sm text-red-600">We are facing some issue loading questions.</p>
        )}

        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            className="mt-8 px-4 py-4 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 cursor-pointer transition-all ease-in-out duration-300"
          >
            Delete account
          </button>
        ) : (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-sm text-red-700">Are you sure?</span>
            <button
              onClick={deleteAccount}
              disabled={deleting}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              {deleting ? "Deleting…" : "Yes, delete my account"}
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}

const timezones = [
  "US/Eastern",
  "US/Central",
  "US/Mountain",
  "US/Pacific",
  "US/Alaska",
  "US/Hawaii",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "America/Toronto",
  "America/Mexico_City",
  "America/Sao_Paulo",
];

function ProfileForm({
  user,
  onError,
}: {
  user: User;
  onError: (msg: string) => void;
}) {
  const { refresh } = useAuth();
  const [form, setForm] = useState({
    gender: user.gender ?? "",
    timezone: user.timezone ?? "",
    phone: user.phone ?? "",
    specialty: user.specialty ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    setSaving(true);
    setMsg("");
    onError("");
    try {
      await api.put("/api/account/profile", {
        gender: form.gender.trim(),
        timezone: form.timezone.trim(),
        phone: form.phone.trim(),
        specialty: form.specialty.trim(),
      });
      await refresh();
      setMsg("Profile saved.");
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
"appearance-none w-full border border-slate-100 bg-white px-4 py-4 text-sm outline-none focus:border-slate-500";

  return (
    <div className="mt-6 border border-slate-200 bg-white p-6">
      <h2 className="mb-2 font-bold leading-snug text-black flex-1">
        Additional details
      </h2>
      <p className="mb-8 text-sm text-slate-600">
        Gender, timezone and phone are required to create or join Find Partner sessions.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Gender
          </span>
          <div className="relative w-full bg-white flex items-center ">

          <select
            value={form.gender}
            onChange={(e) => set("gender", e.target.value)}
            className={inputCls}
          >
            <option value="">Select Gender</option>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
            <option value="Non-binary">Other</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select>
          <ArrowDown01Icon
          size={16}
          strokeWidth={2}
          className="pointer-events-none absolute right-2 text-slate-400"
        />
          </div>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Timezone
          </span>
          <div className="relative w-full bg-white flex items-center ">
          <select
            value={form.timezone}
            onChange={(e) => set("timezone", e.target.value)}
            className={inputCls}
          >
            <option value="">Select…</option>
            {timezones.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
          <ArrowDown01Icon
          size={16}
          strokeWidth={2}
          className="pointer-events-none absolute right-2 text-slate-400"
        />
          </div>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Phone number
          </span>
          <input
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="+1 555 123 4567"
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Specialty
          </span>
          <input
            value={form.specialty}
            onChange={(e) => set("specialty", e.target.value)}
            placeholder="e.g. Internal Medicine"
            className={inputCls}
          />
        </label>
      </div>
      {msg && (
        <p className="mt-4 bg-emerald-50 px-4 text-center py-2 text-sm text-emerald-700">{msg}</p>
      )}

      <button
        onClick={save}
        disabled={saving}
        className="mt-8 bg-blue-700/10 w-full cursor-pointer sm:px-8 h-14 flex items-center justify-center font-semibold text-blue-700 hover:text-white hover:bg-blue-800 transition-all ease-in-out duration-300 disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save profile"}
      </button>
    </div>
  );
}