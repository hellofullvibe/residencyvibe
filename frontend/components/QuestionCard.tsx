"use client";

import Link from "next/link";
import type { Question } from "@/lib/types";
import CategoryBadge from "@/components/CategoryBadge";
import { StarValue } from "@/components/StarRating";
import { Bookmark02Icon, Chatting01Icon } from "hugeicons-react";

export default function QuestionCard({
  question,
  onToggleSave,
}: {
  question: Question;
  onToggleSave?: (q: Question) => void;
}) {
  const topSetting = (question.settings || []).reduce<Question["settings"][number] | undefined>(
    (best, s) => (!best || s.percentage > best.percentage ? s : best),
    undefined
  );

  return (
    <div
      className="flex justify-between flex-col border border-slate-100 bg-white px-6 py-6 transition-all ease-in-out duration-300 hover:bg-gray-100 hover:border-slate-200"
    >
      <Link
      href={`/questions/${question.id}`} className="flex-1">
      <div className="mb-2 cursor-pointer  flex items-center justify-between gap-2 border-b pb-4 border-slate-100">
        <CategoryBadge category={question.category} />
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <StarValue value={question.star} size={"xs"} />
          {question.frequency && (
            <span
              className={`rounded-full px-4 h-6 flex items-center justify-center text-xs lowercase font-medium bg-gray-50 text-slate-700
              `}
            >
              #{question.frequency}
            </span>
          )}
        </div>
      </div>

      <h3 className="font-bold leading-snug text-black flex-1">
        {question.text}
      </h3>

      {question.variants.length > 0 && (
        <ul className="mt-2 space-y-1 pl-4 text-sm text-slate-400 font-medium">
          {question.variants.slice(0, 3).map((v, i) => (
            <li key={i} className="list-disc">
              {v}
            </li>
          ))}
          {question.variants.length > 3 && (
            <li className="list-none text-sm text-slate-400 underline font-medium">
              +{question.variants.length - 3} more variant
              {question.variants.length - 3 > 1 ? "s" : ""}
            </li>
          )}
        </ul>
      )}

      {topSetting && (
        <div className="mt-3 text-xs font-medium text-slate-500">
          Setting: <span className="text-blue-700">{topSetting.percentage}% {topSetting.setting}</span>
        </div>
      )}
      </Link>

      <div className="mt-4 flex items-center justify-between pt-6 text-sm text-slate-500">
        <Link
        href={`/questions/${question.id}`}
          className={`h-11 text-sm rounded-full px-4 hover:text-blue-700 flex items-center justify-center gap-1 border cursor-pointer font-medium transition-all ease-in-out duration-300 bg-white text-black border-slate-100`}
        >
          <Chatting01Icon size={16} strokeWidth={2} className="shrink-0" />
          {question.comment_count > 0
            ? `${question.comment_count} Response`
            : "Add response"}
        </Link>

        {onToggleSave && (
          <button
            onClick={() => onToggleSave(question)}
            className={`h-11 text-sm rounded-full px-4 hover:text-blue-700 flex items-center justify-center gap-1 border cursor-pointer font-medium transition-all ease-in-out duration-300  ${question.saved ? "text-blue-700 border-blue-50 bg-blue-700/5" : "text-black border-slate-100 bg-white"}`}
            title={question.saved ? "Unsave" : "Save"}
          >
            <Bookmark02Icon size={16} strokeWidth={2} className="shrink-0" />
            {question.saved ? "Saved" : "Save"}
          </button>
        )}
      </div>
    </div>
  );
}
