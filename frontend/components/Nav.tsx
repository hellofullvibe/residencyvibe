"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

const links = [
  { href: "/", label: "Home" },
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
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <img
            src="/logo.png"
            alt="Residency Vibe"
            className="h-full w-14 content-cover"
          />
          <div className="text-blue-700 font-bold gap-0 leading-none flex flex-col">
            <span className="opacity-50">Residency</span>
            <span>Vibe</span>
          </div>
        </Link>

        <nav className="hidden items-center text-sm sm:flex items-center justify-center h-full">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center font-medium h-full justify-center border-b-2 px-4 h-full transition-all ease-in-out duration-300 ${
                pathname === l.href
                  ? "text-blue-700 border-blue-700"
                  : "text-slate-600 hover:bg-gray-50 border-transparent"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center h-full text-sm">
          {loading ? null : user ? (
            <>
              <Link
                href="/account"
                className={`hidden sm:flex items-center justify-center h-full px-8 border-b-2 font-medium ${
                  pathname === "/account"
                    ? "text-blue-700 border-blue-700"
                    : "text-black hover:bg-gray-50 border-transparent"
                }`}
              >
                @{user.username}
              </Link>

              <span className="flex items-center justify-center px-4 h-full text-black font-medium sm:hidden">
                @{user.username}
              </span>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className={`${menuOpen ? "text-blue-700" : "text-slate-700"}  px-4 h-full hover:bg-gray-50 sm:hidden`}
                aria-label="Menu"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="h-full flex items-center justify-center px-8 text-blue-700 hover:bg-slate-50 font-semibold transition-all ease-in-out duration-300"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="h-full flex items-center justify-center px-8 text-white bg-blue-700 hover:bg-blue-800 font-semibold transition-all ease-in-out duration-300"
              >
                Join Now
              </Link>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="rounded-md px-2 py-1.5 text-slate-700 hover:bg-slate-100 sm:hidden"
                aria-label="Menu"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
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