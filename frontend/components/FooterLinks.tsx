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
    <nav className="flex flex-wrap items-center justify-center gap-2 h-11 mt-4">
      {visibleLinks.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`flex items-center font-medium justify-center px-4 transition-all ease-in-out duration-300 hover:underline hover:text-blue-700`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}