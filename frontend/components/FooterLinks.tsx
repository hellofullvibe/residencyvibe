"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

const links = [
  { href: "/", label: "Home" },
  { href: "/questions", label: "Question Bank" },
  { href: "/find-partner", label: "Find Partner" },
  { href: "/search", label: "Search" },
  { href: "/saved", label: "Saved" },
];

export default function FooterLinks() {
  const { user } = useAuth();
  const pathname = usePathname();

  const visibleLinks = user
    ? links
    : links.filter((l) => l.href !== "/search" && l.href !== "/saved");

  return (
    <nav className="flex flex-wrap items-center justify-center gap-2">
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
  );
}