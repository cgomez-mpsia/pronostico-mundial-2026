import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="space-y-10 p-6 lg:p-8 max-w-2xl">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Foto de perfil */}
      <div className="space-y-4">
        <Skeleton className="h-4 w-24" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-8 w-28" />
        </div>
      </div>

      <hr className="border-zinc-200 dark:border-zinc-800" />

      {/* Contraseña */}
      <div className="space-y-4">
        <Skeleton className="h-4 w-24" />
        <div className="space-y-3 max-w-sm">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-36" />
        </div>
      </div>

      <hr className="border-zinc-200 dark:border-zinc-800" />

      {/* Estado de cuenta */}
      <div className="space-y-4">
        <Skeleton className="h-4 w-28" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
    </div>
  );
}
