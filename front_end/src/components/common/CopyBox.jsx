import { useRef, useState } from "react";
import { copyText } from "../../lib/clipboard";
import Button from "./Button";

function CopyBox({ value, label = "Link affiliate" }) {
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);

  const handleSelect = () => {
    inputRef.current?.focus();
    inputRef.current?.select();
  };

  const handleCopy = async () => {
    handleSelect();

    try {
      const success = await copyText(value);
      if (!success) {
        throw new Error("COPY_FAILED");
      }

      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{label}</p>
      <div className="mt-3 flex flex-col gap-3">
        <input
          ref={inputRef}
          type="text"
          readOnly
          value={value}
          onClick={handleSelect}
          onFocus={handleSelect}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
        />
        <div className="flex justify-end">
          <Button variant="secondary" onClick={handleCopy}>
            {copied ? "Đã sao chép" : "Sao chép link"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CopyBox;
