function LoadingSkeleton({ rows = 4, cards = 4 }) {
  const cardGridClass =
    cards <= 2 ? "md:grid-cols-2" : cards === 3 ? "md:grid-cols-3" : "md:grid-cols-2 xl:grid-cols-4";

  return (
    <div className="space-y-6 animate-pulse">
      <div className={`grid gap-4 ${cardGridClass}`}>
        {Array.from({ length: cards }).map((_, index) => (
          <div
            key={`card-${index}`}
            className="h-32 rounded-[2rem] border border-white/10 bg-white/[0.04]"
          />
        ))}
      </div>
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
        <div className="h-10 w-56 rounded-2xl bg-white/10" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: rows }).map((_, index) => (
            <div key={`row-${index}`} className="h-14 rounded-2xl bg-white/[0.06]" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default LoadingSkeleton;
