"use client";

import { useState } from "react";

export interface FaqItem {
  title: string;
  body: string;
}

export default function FaqAccordion({
  items,
  className = "",
  allowMultiple = false,
}: {
  items: FaqItem[];
  className?: string;
  allowMultiple?: boolean;
}) {
  const [open, setOpen] = useState<Set<number>>(new Set());

  function toggle(i: number) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) {
        next.delete(i);
      } else if (allowMultiple) {
        next.add(i);
      } else {
        return new Set([i]);
      }
      return next;
    });
  }

  const renderCard = (i: number) => {
    const f = items[i];
    const isOpen = open.has(i);
    return (
      <div key={f.title} className="flex flex-col bg-gray-50 ">
        <button
          onClick={() => toggle(i)}
          className={`flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-gray-100 cursor-pointer border-b ${isOpen ? "border-slate-100" : " border-transparent"}`}
          aria-expanded={isOpen}
        >
          <h3 className={`font-medium text-slate-700`}>{f.title}</h3>
          <span
            className={`shrink-0 text-2xl leading-none text-slate-600 transition-transform duration-300 ${
              isOpen ? "rotate-180" : ""
            }`}
          >
            {isOpen ? "−" : "+"}
          </span>
        </button>
        <div
          className={`grid transition-all duration-300 ease-in-out ${
            isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <p className="px-6 py-6 leading-relaxed text-slate-600">{f.body}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={className}>
      {/* Mobile: single column, normal order */}
      <div className="flex flex-col gap-2 sm:hidden">
        {items.map((_, i) => renderCard(i))}
      </div>

      {/* Desktop: two independent columns — items never switch columns */}
      <div className="hidden gap-2 sm:flex">
        <div className="flex flex-1 flex-col gap-2">
          {items.map((_, i) => (i % 2 === 0 ? renderCard(i) : null))}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          {items.map((_, i) => (i % 2 === 1 ? renderCard(i) : null))}
        </div>
      </div>
    </div>
  );
}