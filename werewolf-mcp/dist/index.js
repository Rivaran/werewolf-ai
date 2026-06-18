import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const APP_URL = process.env.WEREWOLF_APP_URL ?? "http://localhost:3000";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
async function loadState() {
    if (SUPABASE_URL && SUPABASE_KEY) {
        const { data } = await supabase
            .from("werewolf_game_state")
            .select("data")
            .eq("id", "current")
            .single();
        return data?.data ?? null;
    }
    // fallback: HTTP
    try {
        const res = await fetch(`${APP_URL}/api/game`);
        if (!res.ok)
            return null;
        return await res.json();
    }
    catch {
        return null;
    }
}
const server = new McpServer({
    name: "werewolf-game",
    version: "1.0.0",
});
server.tool("get_my_role", "自分の役職を確認する。ゲーム開始後、各AIプレイヤーが自分の番号を指定して役職を取得する。", { player_number: z.number().describe("プレイヤー番号（1〜5）") }, async ({ player_number }) => {
    const state = await loadState();
    if (!state)
        return { content: [{ type: "text", text: "ゲームが開始されていません。" }] };
    const player = state.players[player_number - 1];
    if (!player)
        return { content: [{ type: "text", text: `プレイヤー${player_number}は存在しません。` }] };
    const alive = state.players
        .filter((p) => p !== null && p.alive)
        .map(p => `プレイヤー${p.id}`)
        .join("、");
    const text = `あなた（プレイヤー${player_number}）の役職は「${player.role.name}」です。\n現在の生存プレイヤー: ${alive}\n${player.alive ? "あなたは生存中です。" : "あなたは死亡しています。"}`;
    return { content: [{ type: "text", text }] };
});
server.tool("get_game_state", "現在のゲーム状態を取得する。全プレイヤーの生死と現在のフェーズを確認できる。", {}, async () => {
    const state = await loadState();
    if (!state)
        return { content: [{ type: "text", text: "ゲームが開始されていません。" }] };
    const lines = [
        `フェーズ: ${state.phase}`,
        `${state.day + 1}日目`,
        "",
        "プレイヤー一覧:",
        ...state.players.map(p => p ? `  プレイヤー${p.id}: ${p.alive ? "生存" : "死亡"}` : null).filter(Boolean),
    ];
    return { content: [{ type: "text", text: lines.join("\n") }] };
});
server.tool("get_alive_players", "生存中のプレイヤー一覧を取得する。投票・襲撃先の選択に使う。", {}, async () => {
    const state = await loadState();
    if (!state)
        return { content: [{ type: "text", text: "ゲームが開始されていません。" }] };
    const alive = state.players
        .filter((p) => p !== null && p.alive)
        .map(p => `プレイヤー${p.id}`);
    return { content: [{ type: "text", text: `生存中: ${alive.join("、")}（${alive.length}人）` }] };
});
server.tool("post_discussion_message", "議論フェーズに発言を投稿する。自分のプレイヤー番号と発言内容を指定する。", {
    player_number: z.number().describe("自分のプレイヤー番号"),
    message: z.string().describe("発言内容"),
}, async ({ player_number, message }) => {
    const state = await loadState();
    if (!state)
        return { content: [{ type: "text", text: "ゲームが開始されていません。" }] };
    if (!state.gameId)
        return { content: [{ type: "text", text: "ゲームIDが見つかりません。AIモードでゲームを開始してください。" }] };
    const characterId = state.playerAssignments?.[player_number];
    if (!characterId)
        return { content: [{ type: "text", text: `プレイヤー${player_number}のキャラクター割り当てがありません。` }] };
    if (SUPABASE_URL && SUPABASE_KEY) {
        const { error } = await supabase.from("werewolf_discussion_messages").insert({
            id: Date.now().toString(),
            game_id: state.gameId,
            player_number,
            character_id: characterId,
            message,
            day: state.day,
            started_at: new Date().toISOString(),
        });
        if (error)
            return { content: [{ type: "text", text: `エラー: ${error.message}` }] };
    }
    else {
        const res = await fetch(`${APP_URL}/api/discussion`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ gameId: state.gameId, playerNumber: player_number, characterId, message, day: state.day }),
        });
        if (!res.ok)
            return { content: [{ type: "text", text: "投稿に失敗しました。" }] };
    }
    return { content: [{ type: "text", text: `投稿しました: 「${message}」` }] };
});
const transport = new StdioServerTransport();
await server.connect(transport);
