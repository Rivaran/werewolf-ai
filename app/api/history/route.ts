import { NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

export async function GET() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("werewolf_discussion_messages")
    .select("game_id, started_at")
    .order("started_at", { ascending: false })

  if (error) return NextResponse.json([], { status: 500 })

  const map = new Map<string, { gameId: string; startedAt: string; messageCount: number }>()
  for (const row of data ?? []) {
    if (!map.has(row.game_id)) {
      map.set(row.game_id, { gameId: row.game_id, startedAt: row.started_at, messageCount: 0 })
    }
    map.get(row.game_id)!.messageCount++
  }

  const entries = Array.from(map.values())
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())

  return NextResponse.json(entries)
}
