import { Skeleton } from "@/components/ui/skeleton";

function CardSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
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

      {/* Meta line */}
      <div className="mt-2 flex justify-center">
        <Skeleton className="h-3 w-52" />
      </div>

      {/* Divider + inputs + botón */}
      <div className="my-3 border-t border-zinc-100 dark:border-zinc-800" />
      <div className="flex flex-col items-center gap-2.5">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-14 rounded-lg" />
          <Skeleton className="h-4 w-3" />
          <Skeleton className="h-9 w-14 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-36 rounded-md" />
      </div>
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="space-y-8 p-6 lg:p-8">
      {/* Título */}
      <div className="space-y-1">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-4 w-40" />
      </div>

      {/* Sección de etapa */}
      <div className="space-y-5">
        <Skeleton className="h-4 w-32" />

        {/* Grupo de día */}
        <div className="space-y-3">
          <Skeleton className="h-3 w-40" />
          <div className="grid gap-3 sm:grid-cols-2">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>

        {/* Segundo grupo de día */}
        <div className="space-y-3">
          <Skeleton className="h-3 w-36" />
          <div className="grid gap-3 sm:grid-cols-2">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}
