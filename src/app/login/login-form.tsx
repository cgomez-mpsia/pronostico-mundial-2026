"use client";

import { useFormStatus } from "react-dom";
import { loginAction } from "./actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

function FormFields({ error }: { error?: string }) {
  const { pending } = useFormStatus();

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="tu@email.com"
          disabled={pending}
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
          disabled={pending}
        />
      </div>

      {error === "invalid_credentials" && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          Email o contraseña incorrectos.
        </p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
        {pending ? "Iniciando sesión…" : "Iniciar sesión"}
      </Button>
    </>
  );
}

export function LoginForm({ error }: { error?: string }) {
  return (
    <form action={loginAction} className="space-y-4">
      <FormFields error={error} />
    </form>
  );
}
