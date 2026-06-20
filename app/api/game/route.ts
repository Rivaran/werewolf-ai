import { NextRequest, NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  const supabase = getSupabase()
  const body = await req.json()
  const { data: current } = await supabase
    .from("werewolf_game_state")
    .select("data")
    .eq("id", "current")
    .maybeSingle()
  const previous = current?.data ?? {}
  const isNewGame = Boolean(previous.gameId && body.gameId && previous.gameId !== body.gameId)
  const merged = {
    ...body,
    aiActions: isNewGame ? body.aiActions ?? {} : body.aiActions ?? previous.aiActions ?? {},
    privateInfo: isNewGame
      ? body.privateInfo ?? {}
      : { ...(previous.privateInfo ?? {}), ...(body.privateInfo ?? {}) },
    privateInfoGameIds: isNewGame
      ? body.privateInfoGameIds ?? {}
      : { ...(previous.privateInfoGameIds ?? {}), ...(body.privateInfoGameIds ?? {}) },
  }
  const { error } = await supabase
    .from("werewolf_game_state")
    .upsert({ id: "current", data: merged, updated_at: new Date().toISOString() })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function GET() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("werewolf_game_state")
    .select("data")
    .eq("id", "current")
    .single()
  if (error || !data) return NextResponse.json({ error: "No game state" }, { status: 404 })
  return NextResponse.json(data.data)
}
