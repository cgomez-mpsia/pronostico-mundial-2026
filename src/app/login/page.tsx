import { loginAction } from "./actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface Props {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Pronóstico Mundial 2026
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Ingresa tus credenciales para continuar
          </p>
        </div>

        <form action={loginAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="tu@email.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
            />
          </div>

          {error === "invalid_credentials" && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              Email o contraseña incorrectos.
            </p>
          )}

          <Button type="submit" className="w-full">
            Iniciar sesión
          </Button>
        </form>

        <p className="text-center text-xs text-zinc-400 dark:text-zinc-600">
          No tienes cuenta? Contacta al organizador.
        </p>
      </div>
    </div>
  );
}
