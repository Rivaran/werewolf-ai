import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { DiscussionLog } from "@/types/discussion"

const LOGS_DIR = path.join(process.cwd(), "discussion-logs")

function ensureLogsDir() {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const gameId = searchParams.get("gameId")

  if (!gameId) {
    return NextResponse.json({ error: "gameId is required" }, { status: 400 })
  }

  ensureLogsDir()

  const logFile = path.join(LOGS_DIR, `${gameId}.json`)
  if (!fs.existsSync(logFile)) {
    const empty: DiscussionLog = {
      gameId,
      startedAt: new Date().toISOString(),
      messages: [],
    }
    return NextResponse.json(empty)
  }

  const log: DiscussionLog = JSON.parse(fs.readFileSync(logFile, "utf-8"))
  return NextResponse.json(log)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { gameId, playerNumber, characterId, message, day } = body

  if (!gameId || !playerNumber || !characterId || !message || day === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  ensureLogsDir()

  const logFile = path.join(LOGS_DIR, `${gameId}.json`)
  const log: DiscussionLog = fs.existsSync(logFile)
    ? JSON.parse(fs.readFileSync(logFile, "utf-8"))
    : { gameId, startedAt: new Date().toISOString(), messages: [] }

  log.messages.push({
    id: Date.now().toString(),
    playerNumber,
    characterId,
    message,
    day,
    timestamp: new Date().toISOString(),
  })

  fs.writeFileSync(logFile, JSON.stringify(log, null, 2), "utf-8")

  return NextResponse.json({ success: true })
}
