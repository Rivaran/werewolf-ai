import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { DiscussionLog } from "@/types/discussion"

const LOGS_DIR = path.join(process.cwd(), "discussion-logs")

export async function GET() {
  if (!fs.existsSync(LOGS_DIR)) {
    return NextResponse.json([])
  }

  const files = fs.readdirSync(LOGS_DIR).filter(f => f.endsWith(".json"))

  const entries = files
    .map(file => {
      try {
        const log: DiscussionLog = JSON.parse(
          fs.readFileSync(path.join(LOGS_DIR, file), "utf-8")
        )
        return {
          gameId: log.gameId,
          startedAt: log.startedAt,
          messageCount: log.messages.length,
        }
      } catch {
        return null
      }
    })
    .filter((e): e is { gameId: string; startedAt: string; messageCount: number } => e !== null)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())

  return NextResponse.json(entries)
}
