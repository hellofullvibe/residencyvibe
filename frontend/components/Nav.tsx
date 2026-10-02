"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark02Icon, Cancel01Icon, Menu01Icon, Search01Icon } from "hugeicons-react";
import { useAuth } from "@/lib/auth";

// const links = [
//   { href: "/", label: "Home" },
//   { href: "/questions", label: "Question Bank" },
//   { href: "/find-partner", label: "Find Partner" },
//   { href: "/search", label: "Search" },
//   { href: "/saved", label: "Saved" },
// ];
const links = [
  { href: "/", label: "Home" },
  { href: "/questions", label: "Question Bank" },
  { href: "/find-partner", label: "Find Partner" },
  // { href: "/search", label: "Search" },
  // { href: "/saved", label: "Saved" },
];

const menuLinks = [
  { href: "/", label: "Home" },
  { href: "/account", label: "Profile" },
  { href: "/questions", label: "Question Bank" },
  { href: "/find-partner", label: "Find Partner" },
  { href: "/saved", label: "Saved Questions" },
];

export default function Nav() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  // Guests don't see Search or Saved.
  const visibleLinks = user
    ? links
    : links.filter((l) => l.href !== "/search" && l.href !== "/saved");
  // Guests don't see Profile or Saved in the mobile menu.
  const visibleMenuLinks = user
    ? menuLinks
    : menuLinks.filter((l) => l.href !== "/account" && l.href !== "/saved");

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  function go(href: string) {
    setMenuOpen(false);
    router.push(href);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <img
            src="/logo.png"
            alt="Residency Vibe"
            className="h-full w-14 content-cover shrink-0"
          />
          <div className="text-blue-700 font-bold gap-0 leading-none sm:flex flex-col hidden">
            <span className="opacity-50">Residency</span>
            <span>Vibe</span>
          </div>
        </Link>

        <nav className="hidden items-center text-sm sm:flex items-center justify-center h-full">
          {visibleLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center font-medium h-full justify-center border-b-2 px-4 h-full transition-all ease-in-out duration-300 ${
                pathname === l.href
                  ? "text-blue-700 border-blue-700"
                  : "text-slate-700 hover:bg-gray-50 border-transparent"
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
href="/search"
                className={`px-4 h-full border-b-2 hover:bg-gray-50 hidden sm:flex items-center justify-center
                ${pathname === "/search"
                    ? "text-blue-700 border-blue-700"
                    : "text-black hover:bg-gray-50 border-transparent"}
                `}
                aria-label="Search"
              >
                <Search01Icon size={20} strokeWidth={2} />
              </Link>

            <Link
href="/saved"
                className={`px-4 h-full border-b-2 border-blue-700 hover:bg-gray-50 hidden sm:flex items-center justify-center
                ${pathname === "/saved"
                    ? "text-blue-700 border-blue-700"
                    : "text-black hover:bg-gray-50 border-transparent"}
                `}
                aria-label="Saved"
              >
                <Bookmark02Icon size={20} strokeWidth={2} />
              </Link>

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
                className={`${menuOpen ? "text-blue-700" : "text-slate-700"}  cursor-pointer px-4 h-full hover:bg-gray-50 sm:hidden`}
                aria-label="Menu"
              >
                {menuOpen ? 
                <Cancel01Icon size={20} strokeWidth={2} />:
                <Menu01Icon size={20} strokeWidth={2} />}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="h-full flex items-center justify-center px-4 sm:px-8 text-blue-700 hover:bg-slate-50 font-semibold transition-all ease-in-out duration-300"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="h-full flex items-center justify-center px-4 sm:px-8 text-white bg-blue-700 hover:bg-blue-800 font-semibold transition-all ease-in-out duration-300"
              >
                Join Now
              </Link>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className={`${menuOpen ? "text-blue-700" : "text-slate-700"}  cursor-pointer px-4 h-full hover:bg-gray-50 sm:hidden`}
                aria-label="Menu"
              >
                {menuOpen ? 
                <Cancel01Icon size={20} strokeWidth={2} />:
                <Menu01Icon size={20} strokeWidth={2} />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="border-t border-slate-100 bg-white sm:hidden">
          <nav className="mx-auto max-w-6xl py-6 w-full">
            {user &&
            <div className="w-full px-6 mt-4">
              <Link
                href="/search"
                className="flex items-center gap-2 w-full h-14 px-6 text-sm font-medium text-slate-700 border border-slate-200 bg-gray-50"
              >
                <Search01Icon size={20} strokeWidth={2} />
                <span>Search Questions</span>
              </Link>
              </div>}
            {visibleMenuLinks.map((l) => (
              <button
                key={l.href}
                onClick={() => go(l.href)}
                className={`cursor-pointer w-full h-14 px-12 text-left border-l-4 text-sm font-medium transition-all ease-in-out duration-300 ${
                  pathname === l.href
                    ? "bg-gray-50  text-blue-700 border-blue-700"
                    : "text-slate-700 hover:bg-gray-50 border-transparent"
                }`}
              >
                {l.label}
              </button>
            ))}
            
              <div className="w-full px-6 mt-4">
              <Link
                href="https://buymeacoffee.com/residencyvibe"
                target="_blank"
                rel="noopener noreferrer"
                className="cursor-pointer flex items-center justify-center w-full h-14 text-center text-sm font-medium text-blue-700 bg-blue-700/10"
              >
                Support Us
              </Link>
              </div>
          </nav>
        </div>
      )}
    </header>
  );
}