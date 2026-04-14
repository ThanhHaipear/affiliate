import { useState } from "react";

function FAQAccordion({ items = [] }) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const isOpen = index === openIndex;

        return (
          <div
            key={item.question}
            className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm"
          >
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? -1 : index)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <div>
                {item.group ? (
                  <p className="text-xs uppercase tracking-[0.24em] text-cyan-700">{item.group}</p>
                ) : null}
                <h3 className="mt-1 text-base font-semibold text-slate-900 sm:text-lg">{item.question}</h3>
              </div>
              <span
                className={[
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-xl text-slate-500 transition",
                  isOpen ? "bg-slate-900 text-white" : "bg-slate-50",
                ].join(" ")}
              >
                {isOpen ? "-" : "+"}
              </span>
            </button>
            {isOpen ? (
              <div className="border-t border-slate-100 px-5 py-4 text-sm leading-7 text-slate-600">
                {item.answer}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export default FAQAccordion;
