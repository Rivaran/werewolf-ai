import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { error } = await supabase
    .from("werewolf_game_state")
    .upsert({ id: "current", data: body, updated_at: new Date().toISOString() })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function GET() {
  const { data, error } = await supabase
    .from("werewolf_game_state")
    .select("data")
    .eq("id", "current")
    .single()
  if (error || !data) return NextResponse.json({ error: "No game state" }, { status: 404 })
  return NextResponse.json(data.data)
}
