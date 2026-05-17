import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-5xl font-bold tabular-nums text-zinc-200 dark:text-zinc-800">404</p>
      <h1 className="text-xl font-semibold">Página no encontrada</h1>
      <p className="text-sm text-zinc-500">El recurso que buscas no existe o fue eliminado.</p>
      <Link
        href="/dashboard"
        className="inline-flex h-9 items-center rounded-md border border-zinc-200 px-4 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
