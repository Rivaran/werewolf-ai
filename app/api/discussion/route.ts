import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const gameId = searchParams.get("gameId")
  if (!gameId) return NextResponse.json({ error: "gameId is required" }, { status: 400 })

  const { data, error } = await supabase
    .from("werewolf_discussion_messages")
    .select("*")
    .eq("game_id", gameId)
    .order("timestamp", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const messages = (data ?? []).map(row => ({
    id: row.id,
    playerNumber: row.player_number,
    characterId: row.character_id,
    message: row.message,
    day: row.day,
    timestamp: row.timestamp,
  }))

  return NextResponse.json({
    gameId,
    startedAt: data?.[0]?.started_at ?? new Date().toISOString(),
    messages,
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { gameId, playerNumber, characterId, message, day } = body
  if (!gameId || !playerNumber || !characterId || !message || day === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const { error } = await supabase.from("werewolf_discussion_messages").insert({
    id: Date.now().toString(),
    game_id: gameId,
    player_number: playerNumber,
    character_id: characterId,
    message,
    day,
    started_at: new Date().toISOString(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
