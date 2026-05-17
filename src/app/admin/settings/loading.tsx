import { Skeleton } from "@/components/ui/skeleton";

export default function AdminSettingsLoading() {
  return (
    <div className="space-y-10 p-6 lg:p-8 max-w-2xl">
      <div className="space-y-1">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-9 w-80" />
        <Skeleton className="h-9 w-80" />
        <Skeleton className="h-9 w-32" />
      </div>
      <Skeleton className="h-px w-full" />
      <div className="space-y-4">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-9 w-80" />
        <Skeleton className="h-9 w-48" />
      </div>
    </div>
  );
}
