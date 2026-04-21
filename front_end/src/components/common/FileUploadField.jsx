import { forwardRef } from "react";

const FileUploadField = forwardRef(function FileUploadField(
  { label, hint, onChange, multiple = false, accept = "image/*" },
  ref,
) {
  return (
    <label className="block space-y-2">
      {label ? <span className="text-sm font-semibold text-slate-800">{label}</span> : null}
      <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
        <input
          ref={ref}
          type="file"
          accept={accept}
          multiple={multiple}
          className="w-full text-sm text-slate-700 file:mr-4 file:rounded-xl file:border-0 file:bg-sky-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
          onChange={onChange}
        />
        {hint ? <p className="mt-3 text-sm leading-6 text-slate-600">{hint}</p> : null}
      </div>
    </label>
  );
});

export default FileUploadField;
