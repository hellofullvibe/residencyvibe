const palette: Record<string, string> = {
  "About You": "bg-sky-100 text-sky-800",
  "About Program": "bg-indigo-100 text-indigo-800",
  Hobbies: "bg-pink-100 text-pink-800",
  Situation: "bg-amber-100 text-amber-800",
  Medical: "bg-emerald-100 text-emerald-800",
  Social: "bg-violet-100 text-violet-800",
  Experience: "bg-teal-100 text-teal-800",
  "Ask Them": "bg-rose-100 text-rose-800",
};

export default function CategoryBadge({ category }: { category: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        palette[category] || "bg-slate-100 text-slate-700"
      }`}
    >
      {category}
    </span>
  );
}