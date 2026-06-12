import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { fullName } = await request.json();
  const trimmed = typeof fullName === "string" ? fullName.trim() : "";

  if (!trimmed || trimmed.length < 2 || trimmed.length > 60) {
    return NextResponse.json(
      { error: "El nombre debe tener entre 2 y 60 caracteres." },
      { status: 400 }
    );
  }

  await db.update(users).set({ fullName: trimmed }).where(eq(users.id, user.id));

  return NextResponse.json({ success: true });
}
