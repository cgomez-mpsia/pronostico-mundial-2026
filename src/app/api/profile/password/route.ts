import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { password } = await req.json();

  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 8 caracteres." },
      { status: 400 }
    );
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    console.error("[password] update error", { userId: user.id, error: error.message });
    return NextResponse.json(
      { error: "No se pudo actualizar la contraseña. Intenta nuevamente." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
