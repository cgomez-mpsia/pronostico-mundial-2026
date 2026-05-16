"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface SuccessData {
  email: string;
  fullName: string;
  password: string;
}

export function NewParticipantForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessData | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const form = e.currentTarget;
    const fullName = (form.elements.namedItem("fullName") as HTMLInputElement).value;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    const hasPaid = (form.elements.namedItem("hasPaid") as HTMLInputElement).checked;

    const res = await fetch("/api/admin/participants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, password, hasPaid }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error desconocido.");
      return;
    }

    setSuccess({ email, fullName, password });
    form.reset();
  }

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Nuevo participante</CardTitle>
        <CardDescription>
          Crea la cuenta y comparte las credenciales con el participante.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Nombre completo</Label>
            <Input
              id="fullName"
              name="fullName"
              required
              placeholder="Carlos Pérez"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="carlos@email.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña temporal</Label>
            <Input
              id="password"
              name="password"
              type="text"
              required
              placeholder="Temp1234!"
              autoComplete="off"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="hasPaid" name="hasPaid" defaultChecked />
            <Label htmlFor="hasPaid" className="cursor-pointer">
              Pago de Bs. 500 confirmado
            </Label>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creando cuenta…" : "Crear cuenta"}
          </Button>
        </form>

        {success && (
          <Alert className="mt-4 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
            <AlertDescription className="space-y-1 text-sm">
              <p className="font-semibold text-green-800 dark:text-green-200">
                ✓ Cuenta creada para {success.fullName}
              </p>
              <p>
                <span className="font-medium">Email:</span> {success.email}
              </p>
              <p>
                <span className="font-medium">Contraseña:</span>{" "}
                <code className="rounded bg-green-100 px-1 dark:bg-green-900">
                  {success.password}
                </code>
              </p>
              <p className="text-xs text-green-700 dark:text-green-400">
                Comparte estas credenciales con el participante (ej. WhatsApp).
              </p>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
