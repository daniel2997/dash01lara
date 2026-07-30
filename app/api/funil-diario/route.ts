import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, withTimeout } from "@/lib/supabase";
import { LANCAMENTO_PADRAO } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const lancamento =
    req.nextUrl.searchParams.get("lancamento") || LANCAMENTO_PADRAO;

  const result = await withTimeout(
    supabaseAdmin.rpc("fn_funil_por_dia", { p_lancamento: lancamento } as any),
    15_000
  );

  return NextResponse.json({ dias: (result.data as any[]) || [] });
}
