"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Props {
  participantId: string;
  hasPaid: boolean;
  fullName: string;
}

export function TogglePaymentButton({ participantId, hasPaid, fullName }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    const action = hasPaid ? "marcar como pendiente" : "confirmar pago";
    if (!confirm(`¿Deseas ${action} para ${fullName}?`)) return;

    setLoading(true);
    const res = await fetch(`/api/admin/participants/${participantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hasPaid: !hasPaid }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Error al actualizar.");
      return;
    }

    router.refresh();
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-7 px-2 text-xs"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? "…" : hasPaid ? "Marcar pendiente" : "Confirmar pago"}
    </Button>
  );
}
