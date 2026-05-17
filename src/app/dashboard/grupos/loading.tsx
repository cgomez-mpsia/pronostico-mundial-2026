export default function GruposLoading() {
  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="h-8 w-64 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-zinc-200 dark:border-zinc-800">
            <div className="border-b border-zinc-200 px-4 py-2.5 dark:border-zinc-800">
              <div className="h-4 w-16 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex items-center gap-2 px-4 py-2">
                  <div className="h-3.5 w-5 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                  <div className="h-3 flex-1 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                  <div className="h-3 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
