"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  text: string;
  label?: string;
}

export function CopyButton({ text, label = "Copiar resumen" }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
      {copied ? (
        <>
          <Check className="mr-1.5 h-3.5 w-3.5 text-success" />
          Copiado
        </>
      ) : (
        <>
          <Copy className="mr-1.5 h-3.5 w-3.5" />
          {label}
        </>
      )}
    </Button>
  );
}
