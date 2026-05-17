import { Skeleton } from "@/components/ui/skeleton";

function AdminCardSkeleton() {
  return (
    <div className="relative rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      {/* Menu trigger placeholder */}
      <div className="absolute right-3 top-3">
        <Skeleton className="h-7 w-7 rounded-md" />
      </div>

      {/* Hero: nombre flag | hora | flag nombre */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex items-center justify-end gap-1.5">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-6 rounded-sm" />
        </div>
        <Skeleton className="h-7 w-14" />
        <div className="flex items-center justify-start gap-1.5">
          <Skeleton className="h-4 w-6 rounded-sm" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>

      {/* Meta */}
      <div className="mt-2 flex justify-center gap-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>

      {/* Divider + result form */}
      <div className="my-3 border-t border-zinc-100 dark:border-zinc-800" />
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-14 rounded-lg" />
          <Skeleton className="h-4 w-3" />
          <Skeleton className="h-9 w-14 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-32 rounded-md" />
      </div>
    </div>
  );
}

export default function AdminFixtureLoading() {
  return (
    <div className="space-y-8 p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-8 w-32 rounded-md" />
      </div>

      {/* Stage section */}
      <div className="space-y-5">
        <Skeleton className="h-4 w-36" />

        <div className="grid gap-3 sm:grid-cols-2">
          <AdminCardSkeleton />
          <AdminCardSkeleton />
          <AdminCardSkeleton />
          <AdminCardSkeleton />
        </div>
      </div>
    </div>
  );
}
