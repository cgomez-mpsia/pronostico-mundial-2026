"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function NameForm({ currentName }: { currentName: string }) {
  const router = useRouter();
  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (name.trim() === currentName) return;
    setSaving(true);
    setSaved(false);
    setError(null);

    const res = await fetch("/api/settings/name", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: name }),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al guardar.");
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder="Tu nombre completo"
          className="max-w-xs"
          disabled={saving}
        />
        <Button
          onClick={handleSave}
          disabled={saving || name.trim() === currentName || name.trim().length < 2}
        >
          {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          {saving ? "Guardando…" : "Guardar"}
        </Button>
      </div>
      {saved && <p className="text-xs text-success">✓ Nombre actualizado</p>}
      {error && <p className="text-xs text-live">{error}</p>}
    </div>
  );
}
