const palette: Record<string, string> = {
  "About You": "bg-sky-100 text-sky-800 px-4",
  "About Program": "bg-indigo-100 text-indigo-800 px-4",
  "Hobbies": "bg-pink-100 text-pink-800 px-4",
  "Situation": "bg-amber-100 text-amber-800 px-4",
  "Medical": "bg-emerald-100 text-emerald-800 px-4",
  "Social": "bg-violet-100 text-violet-800 px-4",
  "Experience": "bg-teal-100 text-teal-800 px-4",
  "Ask Them": "bg-rose-100 text-rose-800 px-4 ",
};
const backgroundPalette: Record<string, string> = {
  "About You": "text-sky-800",
  "About Program": "text-indigo-800",
  "Hobbies": "text-pink-800",
  "Situation": "text-amber-800",
  "Medical": "text-emerald-800",
  "Social": "text-violet-800",
  "Experience": "text-teal-800",
  "Ask Them": "text-rose-800",
};

export default function CategoryBadge({ category, background = true }: { category: string, background?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full h-6 text-xs font-medium ${background ? palette[category] || "bg-slate-100 text-slate-700 px-4 " : backgroundPalette[category] || "text-slate-700"}`}
    >
      {category}
    </span>
  );
}