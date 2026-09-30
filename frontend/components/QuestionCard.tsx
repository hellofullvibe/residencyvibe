"use client";

import Link from "next/link";
import type { Question } from "@/lib/types";
import CategoryBadge from "@/components/CategoryBadge";
import { StarValue } from "@/components/StarRating";

export default function QuestionCard({
  question,
  onToggleSave,
}: {
  question: Question;
  onToggleSave?: (q: Question) => void;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-2 flex items-center justify-between gap-2">
        <CategoryBadge category={question.category} />
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <StarValue value={question.star} />
          {question.frequency && (
            <span
              className={`rounded-full px-2 py-0.5 ${
                question.frequency === "Most"
                  ? "bg-red-100 text-red-700"
                  : question.frequency === "Sometimes"
                    ? "bg-orange-100 text-orange-700"
                    : "bg-slate-100 text-slate-600"
              }`}
            >
              {question.frequency}
            </span>
          )}
        </div>
      </div>

      <Link href={`/questions/${question.id}`} className="block flex-1">
        <h3 className="font-medium leading-snug text-slate-900 hover:text-slate-600">
          {question.text}
        </h3>
      </Link>

      {question.variants.length > 0 && (
        <ul className="mt-2 space-y-0.5 pl-4 text-sm text-slate-500">
          {question.variants.slice(0, 3).map((v, i) => (
            <li key={i} className="list-disc">
              {v}
            </li>
          ))}
          {question.variants.length > 3 && (
            <li className="list-none text-xs text-slate-400">
              +{question.variants.length - 3} more variant{question.variants.length - 3 > 1 ? "s" : ""}
            </li>
          )}
        </ul>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-sm text-slate-500">
        <span className="flex items-center gap-2">
          <span title="Comments">💬 {question.comment_count}</span>
          {question.encounter_count > 0 && (
            <span title="Candidates encountered this">{question.encounter_count} encountered</span>
          )}
        </span>
        {onToggleSave && (
          <button
            onClick={() => onToggleSave(question)}
            className="text-sm text-slate-500 hover:text-amber-500"
            title={question.saved ? "Unsave" : "Save"}
          >
            {question.saved ? "★ Saved" : "☆ Save"}
          </button>
        )}
      </div>
    </div>
  );
}