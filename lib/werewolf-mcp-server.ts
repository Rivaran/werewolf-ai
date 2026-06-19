import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { getSupabase } from "@/lib/supabase"

type Player = {
  id: number
  role: { id: string; name: string }
  alive: boolean
} | null

type GameState = {
  mode?: "werewolf" | "onenight" | "wordwolf"
  gameId?: string
  playerAssignments?: Record<number, string>
  players?: Player[]
  originalPlayers?: Player[]
  centerCards?: Array<{ id: string; name: string }>
  privateInfo?: Record<number, string>
  participants?: Array<{
    id: number
    role: "villager" | "werewolf" | "fox"
    word: { text: string; reading?: string }
    alive: boolean
  }>
  day: number
  phase: string
}

function getMode(state: GameState) {
  return state.mode ?? "werewolf"
}

function modeLabel(mode: ReturnType<typeof getMode>) {
  if (mode === "onenight") return "一夜人狼"
  if (mode === "wordwolf") return "言葉人狼"
  return "人狼ゲーム"
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
      description: "現在のゲームモードで、自分だけの役職・お題・能力結果を確認する。",
      inputSchema: {
        player_number: z.number().int().positive().describe("プレイヤー番号"),
      },
    },
    async ({ player_number }) => {
      const state = await loadState()
      if (!state) return textResult("ゲームが開始されていません。")
      const mode = getMode(state)

      if (mode === "wordwolf") {
        const participant = state.participants?.find(item => item.id === player_number)
        if (!participant) return textResult(`プレイヤー${player_number}は存在しません。`)
        const reading = participant.word.reading ? `（${participant.word.reading}）` : ""
        return textResult(
          `ゲームモード: 言葉人狼\nあなた（プレイヤー${player_number}）のお題は「${participant.word.text}」${reading}です。\n` +
          "自分が多数派・少数派・キツネのどれかは公開されません。会話から推理してください。\n" +
          (participant.alive ? "あなたは生存中です。" : "あなたは追放されています。")
        )
      }

      if (mode === "onenight") {
        const original = state.originalPlayers?.[player_number - 1]
        if (!original) return textResult(`プレイヤー${player_number}は存在しません。`)

        const allies = original.role.id === "werewolf"
          ? state.originalPlayers
              ?.filter((item) => item && item.id !== player_number && item.role.id === "werewolf")
              .map(item => `プレイヤー${item!.id}`) ?? []
          : []
        const details = [
          `ゲームモード: 一夜人狼`,
          `あなた（プレイヤー${player_number}）の最初の役職は「${original.role.name}」です。`,
          original.role.id === "werewolf"
            ? (allies.length > 0 ? `人狼の仲間: ${allies.join("、")}` : "あなたは一匹狼です。")
            : null,
          state.privateInfo?.[player_number] ?? null,
        ].filter((line): line is string => Boolean(line))
        return textResult(details.join("\n"))
      }

      const player = state.players?.[player_number - 1]
      if (!player) return textResult(`プレイヤー${player_number}は存在しません。`)

      const alive = (state.players ?? [])
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
      description: "現在のゲームモード、フェーズ、全プレイヤーの生死を取得する。秘密情報は含まない。",
      inputSchema: {},
    },
    async () => {
      const state = await loadState()
      if (!state) return textResult("ゲームが開始されていません。")
      const mode = getMode(state)
      const publicPlayers = mode === "wordwolf"
        ? (state.participants ?? []).map(item => ({ id: item.id, alive: item.alive }))
        : (state.players ?? []).filter((item): item is NonNullable<Player> => item !== null)

      const lines = [
        `ゲームモード: ${modeLabel(mode)}`,
        `フェーズ: ${state.phase}`,
        mode === "onenight" ? "一夜勝負" : `${mode === "werewolf" ? state.day + 1 : state.day}日目`,
        "",
        "プレイヤー一覧:",
        ...publicPlayers.map(player => `  プレイヤー${player.id}: ${player.alive ? "生存" : "死亡・追放"}`),
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

      const candidates = getMode(state) === "wordwolf" ? state.participants ?? [] : state.players ?? []
      const alive = candidates
        .filter((item): item is NonNullable<typeof item> => item !== null && item.alive)
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
