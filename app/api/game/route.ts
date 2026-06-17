import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const STATE_FILE = path.join(process.cwd(), "..", "game-state.json")

export async function POST(req: NextRequest) {
  const body = await req.json()
  fs.writeFileSync(STATE_FILE, JSON.stringify(body, null, 2), "utf-8")
  return NextResponse.json({ ok: true })
}

export async function GET() {
  if (!fs.existsSync(STATE_FILE)) {
    return NextResponse.json({ error: "No game state" }, { status: 404 })
  }
  const data = fs.readFileSync(STATE_FILE, "utf-8")
  return NextResponse.json(JSON.parse(data))
}
