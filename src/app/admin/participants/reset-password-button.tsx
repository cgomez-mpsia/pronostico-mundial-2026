"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  participantId: string;
  fullName: string;
}

export function ResetPasswordButton({ participantId, fullName }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    const password = prompt(`Nueva contraseña para ${fullName} (mín. 8 caracteres):`);
    if (!password) return;
    if (password.length < 8) {
      alert("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setLoading(true);
    const res = await fetch(
      `/api/admin/participants/${participantId}/reset-password`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      }
    );
    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Error al cambiar la contraseña.");
      return;
    }

    alert(`✓ Contraseña actualizada para ${fullName}.`);
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-7 px-2 text-xs"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? "…" : "Reset pwd"}
    </Button>
  );
}
