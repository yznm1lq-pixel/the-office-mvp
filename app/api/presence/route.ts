import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;

  if (!userId) return Response.json({ error: "unauthorized" }, { status: 401 });

  let body: { companyId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const companyId = body.companyId;
  if (typeof companyId !== "string" || !/^[0-9a-f-]{36}$/i.test(companyId)) {
    return Response.json({ error: "invalid_company" }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!membership) return Response.json({ error: "forbidden" }, { status: 403 });

  const { error } = await supabase.from("office_presence").upsert(
    { company_id: companyId, user_id: userId, last_seen_at: new Date().toISOString() },
    { onConflict: "company_id,user_id" },
  );

  if (error) return Response.json({ error: "presence_update_failed" }, { status: 500 });
  return Response.json({ ok: true });
}
