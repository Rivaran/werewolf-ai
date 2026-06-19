import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { getSupabase } from "@/lib/supabase"

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

async function loadState(): Promise<GameState | null> {
  const { data, error } = await getSupabase()
    .from("werewolf_game_state")
    .select("data")
    .eq("id", "current")
    .single()

  if (error || !data) return null
  return data.data as GameState
}

function textResult(text: string) {
  return { content: [{ type: "text" as const, text }] }
}

export function createWerewolfMcpServer() {
  const server = new McpServer({ name: "werewolf-game", version: "1.0.0" })

  server.registerTool(
    "get_my_role",
    {
      description: "自分の役職を確認する。ゲーム開始後、自分のプレイヤー番号を指定する。",
      inputSchema: {
        player_number: z.number().int().positive().describe("プレイヤー番号"),
      },
    },
    async ({ player_number }) => {
      const state = await loadState()
      if (!state) return textResult("ゲームが開始されていません。")

      const player = state.players[player_number - 1]
      if (!player) return textResult(`プレイヤー${player_number}は存在しません。`)

      const alive = state.players
        .filter((item): item is NonNullable<Player> => item !== null && item.alive)
        .map((item) => `プレイヤー${item.id}`)
        .join("、")

      return textResult(
        `あなた（プレイヤー${player_number}）の役職は「${player.role.name}」です。\n` +
          `現在の生存プレイヤー: ${alive}\n` +
          (player.alive ? "あなたは生存中です。" : "あなたは死亡しています。")
      )
    }
  )

  server.registerTool(
    "get_game_state",
    {
      description: "現在のゲーム状態、フェーズ、全プレイヤーの生死を取得する。",
      inputSchema: {},
    },
    async () => {
      const state = await loadState()
      if (!state) return textResult("ゲームが開始されていません。")

      const lines = [
        `フェーズ: ${state.phase}`,
        `${state.day + 1}日目`,
        "",
        "プレイヤー一覧:",
        ...state.players
          .map((player) =>
            player ? `  プレイヤー${player.id}: ${player.alive ? "生存" : "死亡"}` : null
          )
          .filter((line): line is string => line !== null),
      ]
      return textResult(lines.join("\n"))
    }
  )

  server.registerTool(
    "get_alive_players",
    {
      description: "生存中のプレイヤー一覧を取得する。投票・襲撃先の検討に使う。",
      inputSchema: {},
    },
    async () => {
      const state = await loadState()
      if (!state) return textResult("ゲームが開始されていません。")

      const alive = state.players
        .filter((item): item is NonNullable<Player> => item !== null && item.alive)
        .map((item) => `プレイヤー${item.id}`)
      return textResult(`生存中: ${alive.join("、")}（${alive.length}人）`)
    }
  )

  server.registerTool(
    "post_discussion_message",
    {
      description: "議論フェーズに発言を投稿する。自分のプレイヤー番号と発言内容を指定する。",
      inputSchema: {
        player_number: z.number().int().positive().describe("自分のプレイヤー番号"),
        message: z.string().min(1).describe("発言内容"),
      },
    },
    async ({ player_number, message }) => {
      const state = await loadState()
      if (!state) return textResult("ゲームが開始されていません。")
      if (!state.gameId) {
        return textResult("ゲームIDが見つかりません。AIモードでゲームを開始してください。")
      }

      const characterId = state.playerAssignments?.[player_number]
      if (!characterId) {
        return textResult(`プレイヤー${player_number}のキャラクター割り当てがありません。`)
      }

      const { error } = await getSupabase().from("werewolf_discussion_messages").insert({
        id: crypto.randomUUID(),
        game_id: state.gameId,
        player_number,
        character_id: characterId,
        message,
        day: state.day,
        started_at: new Date().toISOString(),
      })

      if (error) return textResult(`投稿エラー: ${error.message}`)
      return textResult(`投稿しました: 「${message}」`)
    }
  )

  return server
}
