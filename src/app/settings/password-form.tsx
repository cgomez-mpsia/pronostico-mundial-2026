"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo cambiar la contraseña. Intenta nuevamente.");
        return;
      }

      setSuccess(true);
      setPassword("");
      setConfirm("");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-sm">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Nueva contraseña</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          disabled={isPending}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm">Confirmar contraseña</Label>
        <Input
          id="confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          disabled={isPending}
        />
      </div>
      {error && <p className="text-sm text-live">{error}</p>}
      {success && (
        <p className="text-sm text-success">
          Contraseña actualizada exitosamente.
        </p>
      )}
      <Button type="submit" className="self-start" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="animate-spin" />
            Actualizando…
          </>
        ) : (
          "Actualizar contraseña"
        )}
      </Button>
    </form>
  );
}
