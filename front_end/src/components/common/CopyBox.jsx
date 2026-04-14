import { useState } from "react";
import Button from "./Button";

function CopyBox({ value, label = "Link affiliate" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
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
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm">
          <p className="break-all leading-6">{value}</p>
        </div>
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
