import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, withTimeout } from "@/lib/supabase";
import { LANCAMENTO_PADRAO } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const lancamento =
    req.nextUrl.searchParams.get("lancamento") || LANCAMENTO_PADRAO;

  const result = await withTimeout(
    supabaseAdmin.rpc("fn_dias_operacionais", { p_lancamento: lancamento }),
    10_000
  );

  const dias = (result.data as any[]) || [];

  return NextResponse.json({ dias });
}
