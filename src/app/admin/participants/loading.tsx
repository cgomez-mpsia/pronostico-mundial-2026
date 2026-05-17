import { Skeleton } from "@/components/ui/skeleton";

export default function AdminParticipantsLoading() {
  return (
    <div className="space-y-8 p-8">
      <div className="space-y-1">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-4 w-40" />
      </div>
      <Skeleton className="h-48 w-full max-w-md rounded-xl" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}
