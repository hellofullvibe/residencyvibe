"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Program } from "@/lib/types";
import { Cancel01Icon } from "hugeicons-react";

export type ProgramOption = { id?: string; name: string };

const defaultSettings = [
  "Community Based",
  "University Based",
  "Military Based",
  "Community Based University Affiliated",
  "Other",
];

export default function ProgramPicker({
  multi = false,
  value,
  onChange,
  placeholder = "Search programs…",
  settings = defaultSettings,
}: {
  multi?: boolean;
  value: ProgramOption | ProgramOption[] | null;
  onChange: (v: ProgramOption | ProgramOption[] | null) => void;
  placeholder?: string;
  settings?: string[];
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Program[]>([]);
  const [open, setOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const list: ProgramOption[] = [];
  if (multi && Array.isArray(value)) {
    list.push(...value);
  } else if (!multi && value && !Array.isArray(value)) {
    list.push(value);
  }
  const isSelected = (name: string) => list.some((x) => x.name === name);

  async function search(s: string) {
    setQuery(s);
    setOpen(true);
    if (!s.trim()) {
      setResults([]);
      return;
    }
    try {
      const data = await api.get<Program[]>(
        `/api/programs?q=${encodeURIComponent(s)}`
      );
      setResults(data);
    } catch {
      setResults([]);
    }
  }

  function toggle(p: Program) {
    if (multi) {
      const exists = list.some((x) => x.name === p.name);
      onChange(
        exists
          ? list.filter((x) => x.name !== p.name)
          : [...list, { id: p.id, name: p.name }]
      );
    } else {
      onChange({ id: p.id, name: p.name });
      setQuery(p.name);
      setOpen(false);
    }
  }

  function remove(name: string) {
    onChange(list.filter((x) => x.name !== name));
  }

  function addProgram(p: Program) {
    if (multi) {
      onChange(list.some((x) => x.name === p.name) ? list : [...list, { id: p.id, name: p.name }]);
    } else {
      onChange({ id: p.id, name: p.name });
      setQuery(p.name);
    }
    setShowAdd(false);
  }

  return (
    <div className="relative w-full">
      <input
        value={query}
        onChange={(e) => search(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="w-full border border-slate-100 px-4 h-14 text-sm outline-none focus:border-blue-700"
      />

      {open && query.trim() && (
        <ul className="absolute z-30 mt-1 max-h-60 w-full overflow-auto border border-slate-100 bg-white shadow-lg">
          {results.length === 0 ? (
            <li className="px-4 py-2 text-sm text-slate-400">No matches</li>
          ) : (
            results.map((p) => {
              const checked = isSelected(p.name);
              return (
                <li key={p.id}>
                  <label className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 cursor-pointer">
                    {multi && (
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(p)}
                        className="accent-blue-700"
                      />
                    )}
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        toggle(p);
                      }}
                      className="flex w-full flex-col text-left"
                    >
                      <span className="text-sm text-slate-800">{p.name}</span>
                      <span className="text-xs text-slate-400">
                        {p.institutional_setting}
                      </span>
                    </button>
                  </label>
                </li>
              );
            })
          )}
          <li className="border-t border-slate-100">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setOpen(false);
                setShowAdd(true);
              }}
              className="w-full px-4 py-2 text-left text-sm font-medium text-blue-700 hover:bg-blue-50"
            >
              + Can&apos;t find it? Add a program
            </button>
          </li>
        </ul>
      )}

      {list.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {list.map((s) => (
            <span
              key={s.name}
              className="flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 text-xs text-slate-700"
            >
              {s.name}
              <button
                type="button"
                onClick={() => remove(s.name)}
                className="text-slate-400 hover:text-red-600"
                aria-label={`Remove ${s.name}`}
              >
                <Cancel01Icon size={13} strokeWidth={2} />
              </button>
            </span>
          ))}
        </div>
      )}

      {showAdd && (
        <AddProgramForm settings={settings} onAdded={addProgram} />
      )}
    </div>
  );
}

export function AddProgramForm({
  settings,
  onAdded,
}: {
  settings: string[];
  onAdded: (p: Program) => void;
}) {
  const [name, setName] = useState("");
  const [setting, setSetting] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const missing = !name.trim() || !setting;

  async function submit() {
    if (missing) return;
    setSaving(true);
    setError("");
    try {
      const p = await api.post<Program>("/api/programs", {
        name: name.trim(),
        institutional_setting: setting,
      });
      onAdded(p);
      setName("");
      setSetting("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add program");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-2 bg-blue-700/5 p-4">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
        Add a program
      </span>
      <div className="mt-2 flex flex-col gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Program full name *"
          className="min-w-[200px] flex-1 border border-slate-100 bg-white px-3 py-2 text-sm outline-none focus:border-blue-700"
        />
         {!name.trim() && (
        <p className="mt-1 text-xs text-red-600">Program full name is required.</p>
      )}
        <select
          value={setting}
          onChange={(e) => setSetting(e.target.value)}
          className="border border-slate-100 bg-white px-3 py-2 text-sm outline-none focus:border-blue-700"
        >
          <option value="">Setting *</option>
          {settings.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          onClick={submit}
          disabled={saving || missing}
          className="bg-blue-700 cursor-pointer px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {saving ? "Adding…" : "Add"}
        </button>
      </div>
     
      {!setting && (
        <p className="mt-1 text-xs text-red-600">Institutional setting is required.</p>
      )}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}