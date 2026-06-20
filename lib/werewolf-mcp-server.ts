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
  privateInfoGameIds?: Record<number, string>
  currentPlayer?: number
  aiActions?: Record<string, AiNightAction>
  participants?: Array<{
    id: number
    role: "villager" | "werewolf" | "fox"
    word: { text: string; reading?: string }
    alive: boolean
  }>
  day: number
  phase: string
}

type AiNightAction = {
  playerNumber: number
  action: "attack" | "guard" | "inspect" | "inspect_center" | "swap" | "pass"
  targetPlayer?: number
  submittedAt: string
}

const characterNames: Record<string, string> = {
  rivaran: "リバラン",
  fin: "フィン",
  gear: "ギア",
  navia: "ナビア",
  ray: "レイ",
}
const fallbackCharacterIds = ["rivaran", "fin", "gear", "navia", "ray"]

function getPlayerName(state: GameState, playerNumber: number) {
  const characterId = state.playerAssignments?.[playerNumber] ?? fallbackCharacterIds[playerNumber - 1]
  return characterNames[characterId ?? ""] ?? `プレイヤー${playerNumber}`
}

function resolvePlayerNumber(state: GameState, playerNumber?: number, characterName?: string) {
  if (playerNumber) return playerNumber
  if (!characterName) return null
  const normalized = characterName.trim().toLowerCase()
  const assignments = Object.keys(state.playerAssignments ?? {}).length > 0
    ? state.playerAssignments ?? {}
    : Object.fromEntries(fallbackCharacterIds.map((characterId, index) => [index + 1, characterId]))
  const entry = Object.entries(assignments).find(([, characterId]) =>
    characterId.toLowerCase() === normalized || characterNames[characterId]?.toLowerCase() === normalized
  )
  return entry ? Number(entry[0]) : null
}

function getMode(state: GameState) {
  return state.mode ?? "werewolf"
}

function modeLabel(mode: ReturnType<typeof getMode>) {
  if (mode === "onenight") return "一夜人狼"
  if (mode === "wordwolf") return "言葉人狼"
  return "人狼ゲーム"
}

function actionKey(state: GameState, playerNumber: number) {
  return `${getMode(state)}:${state.gameId}:${state.day}:${playerNumber}`
}

async function saveState(state: GameState) {
  const { error } = await getSupabase().from("werewolf_game_state").upsert({
    id: "current",
    data: state,
    updated_at: new Date().toISOString(),
  })
  if (error) throw new Error(error.message)
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
        player_number: z.number().int().positive().optional().describe("内部プレイヤー番号。character_name指定時は不要"),
        character_name: z.string().optional().describe("自分の名前（リバラン、フィン、ギア、ナビア、レイ）"),
      },
    },
    async ({ player_number: requestedPlayerNumber, character_name }) => {
      const state = await loadState()
      if (!state) return textResult("ゲームが開始されていません。")
      const player_number = resolvePlayerNumber(state, requestedPlayerNumber, character_name)
      if (!player_number) return textResult("自分の名前または内部プレイヤー番号を指定してください。")
      const myName = getPlayerName(state, player_number)
      const currentPrivateInfo = state.privateInfoGameIds?.[player_number] === state.gameId
        ? state.privateInfo?.[player_number]
        : null
      const mode = getMode(state)

      if (mode === "wordwolf") {
        const participant = state.participants?.find(item => item.id === player_number)
        if (!participant) return textResult(`プレイヤー${player_number}は存在しません。`)
        const reading = participant.word.reading ? `（${participant.word.reading}）` : ""
        return textResult(
          `ゲームモード: 言葉人狼\n${myName}のお題は「${participant.word.text}」${reading}です。\n` +
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
              .map(item => getPlayerName(state, item!.id)) ?? []
          : []
        const details = [
          `ゲームモード: 一夜人狼`,
          `${myName}の最初の役職は「${original.role.name}」です。`,
          original.role.id === "werewolf"
            ? (allies.length > 0 ? `人狼の仲間: ${allies.join("、")}` : "あなたは一匹狼です。")
            : null,
          currentPrivateInfo,
          state.phase === "night" && state.currentPlayer === player_number
            ? original.role.id === "seer"
              ? "あなたの手番です。submit_night_actionでinspectまたはinspect_centerを選んでください。"
              : original.role.id === "robber"
                ? "あなたの手番です。submit_night_actionでswapと交換相手を指定してください。"
                : "あなたの手番です。submit_night_actionでpassを選んでください。"
            : null,
        ].filter((line): line is string => Boolean(line))
        return textResult(details.join("\n"))
      }

      const player = state.players?.[player_number - 1]
      if (!player) return textResult(`プレイヤー${player_number}は存在しません。`)

      const alive = (state.players ?? [])
        .filter((item): item is NonNullable<Player> => item !== null && item.alive)
        .map((item) => getPlayerName(state, item.id))
        .join("、")

      return textResult(
        `${myName}の役職は「${player.role.name}」です。\n` +
          `現在の生存プレイヤー: ${alive}\n` +
          (currentPrivateInfo ? `${currentPrivateInfo}\n` : "") +
          (state.phase === "night" && state.currentPlayer === player_number
            ? player.role.id === "werewolf"
              ? "あなたの手番です。submit_night_actionでattackと襲撃先を指定してください。\n"
              : player.role.id === "knight"
                ? "あなたの手番です。submit_night_actionでguardと護衛先を指定してください。\n"
                : player.role.id === "seer"
                  ? "あなたの手番です。submit_night_actionでinspectと占い先を指定してください。\n"
                  : "あなたの手番です。submit_night_actionでpassを選んでください。\n"
            : "") +
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
        ...publicPlayers.map(player => `  ${getPlayerName(state, player.id)}: ${player.alive ? "生存" : "死亡・追放"}`),
      ]

      if (state.gameId) {
        const { data: messages } = await getSupabase()
          .from("werewolf_discussion_messages")
          .select("player_number, message, day, timestamp")
          .eq("game_id", state.gameId)
          .eq("day", state.day)
          .order("timestamp", { ascending: true })

        lines.push("", "現在の議論ログ:")
        if (!messages?.length) {
          lines.push("  まだ発言はありません。")
        } else {
          messages.forEach(message => {
            lines.push(`  ${getPlayerName(state, message.player_number)}: ${message.message}`)
          })
        }
      }
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
        .map((item) => getPlayerName(state, item.id))
      return textResult(`生存中: ${alive.join("、")}（${alive.length}人）`)
    }
  )

  server.registerTool(
    "submit_night_action",
    {
      description: "夜フェーズの行動を決定する。通常人狼の襲撃・護衛・占い、一夜人狼の占い・怪盗交換・行動なしに対応する。",
      inputSchema: {
        player_number: z.number().int().positive().optional().describe("内部プレイヤー番号。character_name指定時は不要"),
        character_name: z.string().optional().describe("自分の名前"),
        action: z.enum(["attack", "guard", "inspect", "inspect_center", "swap", "pass"]).describe(
          "attack=襲撃、guard=護衛、inspect=占い、inspect_center=中央2枚の確認、swap=怪盗交換、pass=行動なし"
        ),
        target_player: z.number().int().positive().optional().describe("対象の内部プレイヤー番号"),
        target_character_name: z.string().optional().describe("対象の名前。passとinspect_centerでは不要"),
      },
    },
    async ({ player_number: requestedPlayerNumber, character_name, action, target_player: requestedTarget, target_character_name }) => {
      const state = await loadState()
      if (!state) return textResult("ゲームが開始されていません。")
      const player_number = resolvePlayerNumber(state, requestedPlayerNumber, character_name)
      if (!player_number) return textResult("自分の名前または内部プレイヤー番号を指定してください。")
      const target_player = resolvePlayerNumber(state, requestedTarget, target_character_name) ?? undefined
      if (state.phase !== "night") return textResult("現在は夜フェーズではありません。")
      if (state.currentPlayer !== player_number) {
        return textResult(
          state.currentPlayer
            ? `現在行動するのは${getPlayerName(state, state.currentPlayer)}です。`
            : "現在の手番が不明です。"
        )
      }

      const mode = getMode(state)
      if (mode === "wordwolf") return textResult("言葉人狼には夜行動がありません。")
      const originalPlayer = mode === "onenight"
        ? state.originalPlayers?.[player_number - 1]
        : state.players?.[player_number - 1]
      if (!originalPlayer) return textResult(`プレイヤー${player_number}は存在しません。`)

      const role = originalPlayer.role.id
      const expectedActions: Record<string, AiNightAction["action"][]> = mode === "onenight"
        ? {
            werewolf: ["pass"],
            villager: ["pass"],
            seer: ["inspect", "inspect_center"],
            robber: ["swap"],
          }
        : {
            werewolf: ["attack"],
            knight: ["guard"],
            seer: ["inspect"],
            villager: ["pass"],
            madman: ["pass"],
            medium: ["pass"],
          }
      if (!expectedActions[role]?.includes(action)) {
        return textResult(`役職「${originalPlayer.role.name}」では行動「${action}」を選べません。`)
      }

      const needsTarget = ["attack", "guard", "inspect", "swap"].includes(action)
      if (needsTarget && !target_player) return textResult("対象プレイヤー番号を指定してください。")
      if (target_player === player_number) return textResult("自分自身は対象にできません。")
      const target = target_player ? state.players?.[target_player - 1] : null
      if (needsTarget && (!target || !target.alive)) return textResult("そのプレイヤーは対象にできません。")
      if (mode === "werewolf" && action === "attack" && target?.role.id === "werewolf") {
        return textResult("人狼の仲間は襲撃できません。")
      }

      let privateResult = "夜行動を受け付けました。"
      if (action === "inspect" && target) {
        privateResult = mode === "werewolf"
          ? `占い結果: ${getPlayerName(state, target_player!)}は${target.role.id === "werewolf" ? "人狼です" : "人狼ではありません"}。`
          : `占い結果: ${getPlayerName(state, target_player!)}の役職は「${state.originalPlayers?.[target_player! - 1]?.role.name}」です。`
      } else if (action === "inspect_center") {
        privateResult = `中央の2枚は「${state.centerCards?.map(card => card.name).join("」「")}」です。`
      } else if (action === "swap" && target) {
        privateResult = `${getPlayerName(state, target_player!)}と交換し、現在の役職は「${target.role.name}」です。`
      }

      const nextState: GameState = {
        ...state,
        privateInfo: { ...state.privateInfo, [player_number]: privateResult },
        privateInfoGameIds: { ...state.privateInfoGameIds, [player_number]: state.gameId ?? "" },
        aiActions: {
          ...state.aiActions,
          [actionKey(state, player_number)]: {
            playerNumber: player_number,
            action,
            targetPlayer: target_player,
            submittedAt: new Date().toISOString(),
          },
        },
      }
      await saveState(nextState)
      return textResult(privateResult)
    }
  )

  server.registerTool(
    "post_discussion_message",
    {
      description: "議論フェーズに発言を投稿する。自分のプレイヤー番号と発言内容を指定する。",
      inputSchema: {
        player_number: z.number().int().positive().optional().describe("内部プレイヤー番号。character_name指定時は不要"),
        character_name: z.string().optional().describe("自分の名前"),
        message: z.string().min(1).describe("発言内容"),
      },
    },
    async ({ player_number: requestedPlayerNumber, character_name, message }) => {
      const state = await loadState()
      if (!state) return textResult("ゲームが開始されていません。")
      const player_number = resolvePlayerNumber(state, requestedPlayerNumber, character_name)
      if (!player_number) return textResult("自分の名前または内部プレイヤー番号を指定してください。")
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
