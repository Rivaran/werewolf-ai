import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// dist/index.js -> werewolf-mcp/dist -> werewolf-mcp -> werewolf-app -> game-state.json
const STATE_FILE = path.join(__dirname, "..", "..", "game-state.json")

type Player = {
  id: number
  role: { id: string; name: string }
  alive: boolean
} | null

type GameState = {
  gameId?: string
  playerAssignments?: Record<number, string>
  players: Player[]
  day: number
  phase: string
}

function loadState(): GameState | null {
  if (!fs.existsSync(STATE_FILE)) return null
  return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"))
}

const server = new McpServer({
  name: "werewolf-game",
  version: "1.0.0",
})

server.tool(
  "get_my_role",
  "自分の役職を確認する。ゲーム開始後、各AIプレイヤーが自分の番号を指定して役職を取得する。",
  { player_number: z.number().describe("プレイヤー番号（1〜5）") },
  async ({ player_number }) => {
    const state = loadState()
    if (!state) {
      return { content: [{ type: "text", text: "ゲームが開始されていません。" }] }
    }
    const player = state.players[player_number - 1]
    if (!player) {
      return { content: [{ type: "text", text: `プレイヤー${player_number}は存在しません。` }] }
    }
    const alive = state.players
      .filter((p): p is NonNullable<Player> => p !== null && p.alive)
      .map(p => `プレイヤー${p.id}`)
      .join("、")
    const text = `あなた（プレイヤー${player_number}）の役職は「${player.role.name}」です。\n現在の生存プレイヤー: ${alive}\n${player.alive ? "あなたは生存中です。" : "あなたは死亡しています。"}`
    return { content: [{ type: "text", text }] }
  }
)

server.tool(
  "get_game_state",
  "現在のゲーム状態を取得する。全プレイヤーの生死と現在のフェーズを確認できる。",
  {},
  async () => {
    const state = loadState()
    if (!state) {
      return { content: [{ type: "text", text: "ゲームが開始されていません。" }] }
    }
    const lines = [
      `フェーズ: ${state.phase}`,
      `${state.day + 1}日目`,
      "",
      "プレイヤー一覧:",
      ...state.players.map(p =>
        p ? `  プレイヤー${p.id}: ${p.alive ? "生存" : "死亡"}` : null
      ).filter(Boolean),
    ]
    return { content: [{ type: "text", text: lines.join("\n") }] }
  }
)

server.tool(
  "get_alive_players",
  "生存中のプレイヤー一覧を取得する。投票・襲撃先の選択に使う。",
  {},
  async () => {
    const state = loadState()
    if (!state) {
      return { content: [{ type: "text", text: "ゲームが開始されていません。" }] }
    }
    const alive = state.players
      .filter((p): p is NonNullable<Player> => p !== null && p.alive)
      .map(p => `プレイヤー${p.id}`)
    return { content: [{ type: "text", text: `生存中: ${alive.join("、")}（${alive.length}人）` }] }
  }
)

server.tool(
  "post_discussion_message",
  "議論フェーズに発言を投稿する。自分のプレイヤー番号と発言内容を指定する。",
  {
    player_number: z.number().describe("自分のプレイヤー番号"),
    message: z.string().describe("発言内容"),
  },
  async ({ player_number, message }) => {
    const state = loadState()
    if (!state) {
      return { content: [{ type: "text", text: "ゲームが開始されていません。" }] }
    }
    if (!state.gameId) {
      return { content: [{ type: "text", text: "ゲームIDが見つかりません。AIモードでゲームを開始してください。" }] }
    }

    const characterId = state.playerAssignments?.[player_number]
    if (!characterId) {
      return { content: [{ type: "text", text: `プレイヤー${player_number}のキャラクター割り当てがありません。` }] }
    }

    const logsDir = path.join(__dirname, "..", "..", "discussion-logs")
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true })

    const logFile = path.join(logsDir, `${state.gameId}.json`)
    const log = fs.existsSync(logFile)
      ? JSON.parse(fs.readFileSync(logFile, "utf-8"))
      : { gameId: state.gameId, startedAt: new Date().toISOString(), messages: [] }

    log.messages.push({
      id: Date.now().toString(),
      playerNumber: player_number,
      characterId,
      message,
      day: state.day,
      timestamp: new Date().toISOString(),
    })

    fs.writeFileSync(logFile, JSON.stringify(log, null, 2), "utf-8")

    return { content: [{ type: "text", text: `投稿しました: 「${message}」` }] }
  }
)

const transport = new StdioServerTransport()
await server.connect(transport)
