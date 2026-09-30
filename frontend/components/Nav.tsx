"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

const links = [
  { href: "/questions", label: "Question Bank" },
  { href: "/find-partner", label: "Find Partner" },
  { href: "/search", label: "Search" },
  { href: "/saved", label: "Saved" },
];

const menuLinks = [
  { href: "/account", label: "Profile" },
  { href: "/", label: "Home" },
  { href: "/questions", label: "Question Bank" },
  { href: "/find-partner", label: "Find Partner" },
  { href: "/saved", label: "Saved" },
];

export default function Nav() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  function go(href: string) {
    setMenuOpen(false);
    router.push(href);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <Image
            src="/logo.png"
            alt="ResidencyPrep"
            width={209}
            height={101}
            className="h-8 w-auto"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-1 text-sm sm:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-md px-3 py-1.5 transition-colors ${
                pathname === l.href
                  ? "bg-slate-100 font-medium text-slate-900"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 text-sm">
          {loading ? null : user ? (
            <>
              <Link
                href="/account"
                className={`hidden rounded-md px-3 py-1.5 sm:inline-block ${
                  pathname === "/account"
                    ? "bg-slate-100 font-medium text-slate-900"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {user.username}
              </Link>
              <span className="rounded-md px-1 py-1.5 text-slate-600 sm:hidden">
                {user.username}
              </span>
              {/* Mobile menu icon after username */}
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="rounded-md px-2 py-1.5 text-slate-700 hover:bg-slate-100 sm:hidden"
                aria-label="Menu"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
              <button
                onClick={handleLogout}
                className="hidden rounded-md px-3 py-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 sm:inline-block"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-md px-3 py-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-slate-800"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && user && (
        <div className="border-t border-slate-200 bg-white sm:hidden">
          <nav className="mx-auto max-w-6xl px-4 py-2">
            {menuLinks.map((l) => (
              <button
                key={l.href}
                onClick={() => go(l.href)}
                className={`block w-full rounded-md px-3 py-2.5 text-left text-sm transition-colors ${
                  pathname === l.href
                    ? "bg-slate-100 font-medium text-slate-900"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {l.label}
              </button>
            ))}
            <button
              onClick={handleLogout}
              className="block w-full rounded-md px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              Sign out
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}