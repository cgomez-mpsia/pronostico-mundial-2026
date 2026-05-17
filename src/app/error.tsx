"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-5xl font-bold tabular-nums text-zinc-200 dark:text-zinc-800">500</p>
      <h1 className="text-xl font-semibold">Algo salió mal</h1>
      <p className="text-sm text-zinc-500">Ocurrió un error inesperado. Intenta de nuevo.</p>
      <Button variant="outline" size="sm" onClick={reset}>
        Reintentar
      </Button>
    </div>
  );
}
