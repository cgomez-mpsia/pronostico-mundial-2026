import { Skeleton } from "@/components/ui/skeleton";

export default function AdminFixtureLoading() {
  return (
    <div className="space-y-8 p-6 lg:p-8">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
