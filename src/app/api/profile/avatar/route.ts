import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("avatar");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No se recibió ningún archivo." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Solo se aceptan imágenes JPG, PNG o WebP de hasta 2 MB." },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Solo se aceptan imágenes JPG, PNG o WebP de hasta 2 MB." },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();
  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const path = `${user.id}/${Date.now()}.${ext}`;

  // Eliminar avatar anterior si existe
  const existing = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { avatarUrl: true },
  });

  if (existing?.avatarUrl) {
    const oldPath = existing.avatarUrl.split("/avatars/")[1];
    if (oldPath) {
      await adminClient.storage.from("avatars").remove([oldPath]);
    }
  }

  // Subir nuevo archivo
  const buffer = await file.arrayBuffer();
  const { error: uploadError } = await adminClient.storage
    .from("avatars")
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error("[avatar] upload error", { userId: user.id, error: uploadError.message });
    return NextResponse.json(
      { error: "No se pudo subir la imagen. Verifica tu conexión e intenta nuevamente." },
      { status: 500 }
    );
  }

  const { data: urlData } = adminClient.storage.from("avatars").getPublicUrl(path);
  const avatarUrl = urlData.publicUrl;

  await db.update(users).set({ avatarUrl }).where(eq(users.id, user.id));

  return NextResponse.json({ avatarUrl });
}
