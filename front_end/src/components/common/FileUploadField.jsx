function FileUploadField({ label, hint, onChange, multiple = false, accept = "image/*" }) {
  return (
    <label className="block space-y-2">
      {label ? <span className="text-sm font-medium text-slate-200">{label}</span> : null}
      <div className="rounded-[2rem] border border-dashed border-white/15 bg-white/5 p-6 text-center">
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          className="w-full text-sm text-slate-300 file:mr-4 file:rounded-xl file:border-0 file:bg-emerald-400 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-950"
          onChange={onChange}
        />
        {hint ? <p className="mt-3 text-xs text-slate-400">{hint}</p> : null}
      </div>
    </label>
  );
}

export default FileUploadField;
