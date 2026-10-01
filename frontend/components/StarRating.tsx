"use client";

export function StarValue({ value, size = "sm" }: { value: number; size?: "xs" | "sm" | "md" }) {
  const cls = size === "xs" ? "text-xs" : size === "sm" ? "text-sm" : "text-base";
  return (
    <span className={`inline-flex items-center gap-1 font-medium text-slate-700 hover:text-amber-600 ${cls}`}>
      <span>{Number(value).toFixed(1)}</span>
      <span>★</span>
    </span>
  );
}

export function StarRating({
  value,
  onChange,
  readonly = false,
  size = "md",
}: {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
  size?: "sm" | "md";
}) {
  const cls = size === "sm" ? "text-sm" : "text-lg";
  return (
    <div className={`flex items-center gap-0.5 ${cls}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(n)}
          className={readonly ? "cursor-default" : "cursor-pointer hover:scale-110"}
          aria-label={`${n} star`}
        >
          <span
            className={
              value >= n - 0.25
                ? "text-amber-400"
                : value >= n - 0.75
                  ? "text-amber-300"
                  : "text-slate-300"
            }
          >
            ★
          </span>
        </button>
      ))}
    </div>
  );
}