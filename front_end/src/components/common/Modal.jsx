import Button from "./Button";
import { cn } from "../../lib/utils";

function Modal({
  open,
  title,
  description,
  children,
  onClose,
  footer,
  className,
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-8 backdrop-blur-sm">
      <div className={cn("w-full max-w-lg rounded-[2rem] border border-white/10 bg-slate-900 p-6", className)}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-white">{title}</h3>
            {description ? (
              <p className="mt-2 text-sm leading-7 text-slate-300">{description}</p>
            ) : null}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="mt-6">{children}</div>
        {footer ? <div className="mt-6">{footer}</div> : null}
      </div>
    </div>
  );
}

export default Modal;
