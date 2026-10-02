import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import Nav from "@/components/Nav";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { usePathname } from "next/navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ResidencyPrep",
  description: "Residency interview question bank, shared answers and practice.",
};

const links = [
  { href: "/", label: "Home" },
  { href: "/questions", label: "Question Bank" },
  { href: "/find-partner", label: "Find Partner" },
  { href: "/search", label: "Search" },
  { href: "/saved", label: "Saved" },
];

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const visibleLinks = user
    ? links
    : links.filter((l) => l.href !== "/search" && l.href !== "/saved");

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen flex flex-col antialiased">
        <AuthProvider>
          <Nav />
          <main className="flex-1">{children}</main>
          <footer className="text-center text-sm text-slate-500 w-full max-w-6xl mx-auto px-6 py-25">
            <Link href="/" className="flex flex-col items-center gap-2 font-semibold w-full justify-center">
          <img
            src="/logo.png"
            alt="Residency Vibe"
            className="h-full w-20 content-cover shrink-0"
          />
          <div className="text-blue-700 font-bold gap-0 leading-none text-lg flex flex-col">
            <span className="opacity-50">Residency</span>
            <span>Vibe</span>
          </div>
        </Link>
            <p className="w-full max-w-xl mx-auto text-center mt-4">Residency Vibe is an interview preparation platform built for residency applicants. Practice with question bank, learn from others’ responses, save questions, and find a practice partner to prepare with confidence.</p>

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

          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}