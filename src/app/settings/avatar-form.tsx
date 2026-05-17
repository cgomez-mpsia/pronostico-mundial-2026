"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";

interface AvatarFormProps {
  fullName: string;
  avatarUrl?: string | null;
}

export function AvatarForm({ fullName, avatarUrl }: AvatarFormProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setError("Solo se aceptan imágenes JPG, PNG o WebP de hasta 2 MB.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Solo se aceptan imágenes JPG, PNG o WebP de hasta 2 MB.");
      return;
    }

    setError(null);
    setPreview(URL.createObjectURL(file));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("avatar", file);

    startTransition(async () => {
      setError(null);
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo guardar la foto. Intenta nuevamente.");
        return;
      }

      router.refresh();
      setPreview(null);
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-4">
      <UserAvatar
        fullName={fullName}
        avatarUrl={preview ?? avatarUrl}
        size={64}
      />
      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            Elegir foto
          </Button>
          {preview && (
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Subiendo…
                </>
              ) : (
                "Guardar foto"
              )}
            </Button>
          )}
        </div>
        <p className="text-xs text-zinc-400">JPG, PNG o WebP · Máx. 2 MB</p>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    </form>
  );
}
